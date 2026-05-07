# core-api-layer Specification

## Purpose

Define the HTTP client baseline for every Ardua core frontend — how requests are issued, how auth tokens are attached, how errors are normalized into a single `ApiError` type, and how retry policy behaves. This is a **seed** capability: each app extends it with its own endpoint modules. The baseline contract is enforced by the template.
## Requirements
### Requirement: All HTTP calls MUST go through the shared axios instance

The application SHALL expose a single axios instance (`apiClient`) configured with the base URL, timeout, and shared interceptors. Direct use of `fetch()` or ad-hoc axios instances inside modules is forbidden.

#### Scenario: Module call uses the shared client

- **GIVEN** a domain module needs to issue an HTTP call
- **WHEN** the module is authored
- **THEN** it imports `apiClient` from `@/api/client` and uses it for every request

#### Scenario: Module uses endpoint constants

- **GIVEN** a domain module needs to reference a URL path
- **WHEN** the module is authored
- **THEN** the path is sourced from `@/api/endpoints` — hardcoded URL strings are forbidden

### Requirement: API client MUST inject the Auth0 token via an injector function

The client SHALL expose a `setAccessTokenGetter(getter)` function. The Auth0 plugin SHALL wire this injector at bootstrap so the request interceptor can attach the bearer token to every outgoing request without the client depending on Vue or Auth0 directly.

#### Scenario: Request interceptor attaches the token

- **GIVEN** a token getter is registered and Auth0 has issued a token
- **WHEN** a request is issued through `apiClient`
- **THEN** the interceptor awaits the registered token getter and sets `Authorization: Bearer {token}` on the outgoing request

#### Scenario: Client works without Auth0 configured

- **GIVEN** Auth0 is not configured (local dev, template first run)
- **WHEN** a request is issued through `apiClient`
- **THEN** the token getter returns `undefined` and the request proceeds without an `Authorization` header

### Requirement: Errors MUST be normalized into ApiError with status helpers

Every non-2xx response SHALL be transformed into a single `ApiError` class instance with `status`, `code`, `message`, optional `details`, and convenience getters (`isUnauthorized`, `isForbidden`, `isNotFound`, `isServerError`).

#### Scenario: Server error becomes ApiError

- **GIVEN** the server returns a 4xx or 5xx response
- **WHEN** the response interceptor processes the response
- **THEN** it throws an `ApiError` constructed from the response payload

#### Scenario: Network error becomes ApiError

- **GIVEN** the request fails before the server responds (DNS, offline, timeout)
- **WHEN** the response interceptor processes the error
- **THEN** it throws an `ApiError` with `status: 0` and `code: 'NETWORK'`

#### Scenario: Consumers use status helpers, not raw codes

- **GIVEN** a consumer catches an `ApiError`
- **WHEN** the consumer branches on the error type
- **THEN** it uses `error.isUnauthorized`, `error.isForbidden`, `error.isNotFound`, or `error.isServerError` rather than comparing `error.status` directly

### Requirement: Retry policy MUST skip auth and not-found errors

The `@tanstack/vue-query` retry policy SHALL never retry `401`, `403`, or `404` responses. Transient 5xx errors and network failures MAY be retried up to the configured limit (default 1).

#### Scenario: 401 is never retried

- **GIVEN** a query receives a 401 response
- **WHEN** the retry policy evaluates
- **THEN** no retry is attempted — the error surfaces immediately for the auth layer to handle

#### Scenario: 500 is retried once

- **GIVEN** a query receives a 500 response and the default retry count is 1
- **WHEN** the retry policy evaluates
- **THEN** the query is retried exactly once before the error surfaces

### Requirement: Endpoints MUST be organized by resource

Endpoint paths SHALL be grouped by resource inside `@/api/endpoints.ts`, with each group exposing all operations (list, detail, create, update, delete) as either string constants or path-builder functions.

#### Scenario: Endpoint group matches a resource

- **GIVEN** a new resource is being added to the API layer
- **WHEN** the developer adds it to `endpoints.ts`
- **THEN** it gets its own key in the `ENDPOINTS` object with at least `list`, `detail(id)`, `create`, `update(id)`, and `delete(id)` entries as applicable

### Requirement: Endpoint groups that serve file uploads MUST register the canonical triad in `ENDPOINTS`

When a resource group in `@/api/endpoints.ts` exposes file-upload behavior, it SHALL include the canonical triad (a) `presignedUrls` for phase 1 (request presigned URLs); (b) `confirm` for phase 3 (persist file metadata); and, when the resource is a batch-import target, (c) `createJob` and `jobStatus(id)` for phase 4 (poll the asynchronous server-side job). The triad uses the same naming across every resource so the `useFileUpload` composable can be wired uniformly. Resource-specific paths are allowed (e.g., `/document?action=request-presigned-urls` for LEX, `/quote/${quoteId}/attachment` for TRD) but the registry **keys** are fixed.

#### Scenario: A new file-upload resource registers the triad

- **GIVEN** a new resource `documents` is being added to `ENDPOINTS` and supports file uploads
- **WHEN** the developer defines the group
- **THEN** the group includes at minimum `presignedUrls` and `confirm` keys; without both, the resource MUST NOT be wired through `useFileUpload`

#### Scenario: A batch-import resource registers the job pair

- **GIVEN** a new resource `swiftImport` accepts a SWIFT file and creates an asynchronous parsing job
- **WHEN** the developer defines the group
- **THEN** the group includes `createJob` and `jobStatus(id)` in addition to `presignedUrls` and `confirm` — the four entries together describe the full batch-import lifecycle

#### Scenario: Hardcoded upload paths inside modules are forbidden

- **GIVEN** a developer wires `useFileUpload({ presignEndpoint: '/document?action=request-presigned-urls' })` with a hardcoded string instead of `ENDPOINTS.documents.presignedUrls`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every URL path SHALL be sourced from the `ENDPOINTS` registry, file-upload paths included

