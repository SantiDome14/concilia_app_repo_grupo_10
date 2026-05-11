## ADDED Requirements

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
