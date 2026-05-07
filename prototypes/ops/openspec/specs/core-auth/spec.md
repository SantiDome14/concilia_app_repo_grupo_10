# core-auth Specification

## Purpose

Define the authentication baseline for every Ardua core frontend — Auth0 integration contract, route guard behavior, and the capability-checking API. This is a **seed** capability: each app defines its own set of capability strings (`CAN_READ_OPS`, `CAN_APPROVE_TRD`, etc.). The baseline contract is enforced by the template.

## Requirements

### Requirement: Authentication MUST use Auth0 via `@auth0/auth0-vue`

The application SHALL integrate with Auth0 through the official `@auth0/auth0-vue` plugin. Custom JWT handling, cookie-based sessions, or rolling an in-app auth flow are forbidden.

#### Scenario: Auth0 plugin registers at bootstrap

- **GIVEN** valid `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE` environment variables
- **WHEN** the application bootstraps
- **THEN** the Auth0 plugin registers with the supplied `domain`, `clientId`, and `audience`

#### Scenario: Missing Auth0 config degrades gracefully

- **GIVEN** `VITE_AUTH0_DOMAIN` or `VITE_AUTH0_CLIENT_ID` is empty
- **WHEN** the application bootstraps
- **THEN** the Auth0 plugin is skipped with a console warning, and the app continues to run in unauthenticated mode (template first run, local dev)

### Requirement: Route guards MUST use the closure pattern, not a setter hack

Navigation guards SHALL receive the Auth0 instance via a closure at router setup time. The anti-pattern of `router.setAuth0(auth0)` used in legacy Ardua repos (core-app, core-lex) is forbidden in the template and in every app derived from it.

#### Scenario: Guard closes over the auth0 instance

- **GIVEN** the router is being set up in `main.ts`
- **WHEN** `setupRouter(app)` runs
- **THEN** guards are built via `createAuthGuard(auth0)` and `createCapabilitiesGuard(auth0)` factory functions that return bound guard functions

#### Scenario: Guard no-ops when auth0 is not registered

- **GIVEN** the Auth0 plugin is not registered on the current app instance
- **WHEN** the router navigates
- **THEN** both guards allow navigation to proceed without restriction (template first run mode)

### Requirement: Protected routes MUST declare `meta.requiresAuth = true`

Routes that require authentication SHALL declare `meta.requiresAuth = true`. Routes that explicitly allow unauthenticated access (Login, NotFound) MAY declare `meta.requiresAuth = false` or omit the meta entirely.

#### Scenario: Unauthenticated user is redirected to Login

- **GIVEN** an unauthenticated user
- **WHEN** the user navigates to a route with `meta.requiresAuth = true`
- **THEN** the guard redirects to the Login route and preserves the original target in the `redirect` query parameter

#### Scenario: Authenticated user visiting Login is redirected to Dashboard

- **GIVEN** an authenticated user
- **WHEN** the user navigates to the Login route
- **THEN** the guard redirects them to the Dashboard route

### Requirement: Capability checks MUST be exposed via the `useCapabilities` composable

The application SHALL expose a `useCapabilities()` composable that returns `can(capability)`, `canAny(capabilities[])`, `canAll(capabilities[])`, and the full capability list. Every capability check in the UI SHALL go through this composable.

#### Scenario: Component checks a single capability

- **GIVEN** a component needs to conditionally render based on a permission
- **WHEN** the component is authored
- **THEN** it calls `const { can } = useCapabilities()` and uses `can('CAN_APPROVE_REQ')`

#### Scenario: Route-level capability guard

- **GIVEN** a route declares `meta.capabilities = ['CAN_VIEW_TRD']`
- **WHEN** an authenticated user navigates to that route
- **THEN** the capabilities guard allows navigation only if the user has at least one of the listed capabilities

### Requirement: Unified auth API MUST be exposed via the `useAuth` composable

Pages and components SHALL consume auth state through the `useAuth()` composable rather than calling `useAuth0()` directly. The composable SHALL expose `isAuthenticated`, `isLoading`, `user`, `login()`, `logout()`, and `getAccessToken()`.

#### Scenario: Component reads the user via useAuth

- **GIVEN** a component needs the current user
- **WHEN** the component is authored
- **THEN** it calls `const { user } = useAuth()` — calling `useAuth0()` directly is forbidden except inside `useAuth` itself

#### Scenario: useAuth returns stubs when Auth0 is not registered

- **GIVEN** Auth0 is not registered on the current app instance
- **WHEN** a component calls `useAuth()`
- **THEN** the composable returns a no-op stub (`isAuthenticated: false`, `user: null`, etc.) so components render without crashing

### Requirement: Tokens MUST be cached using Auth0 refresh tokens and localStorage

The Auth0 configuration SHALL use `cacheLocation: 'localstorage'` and `useRefreshTokens: true` so that tokens survive page reloads and refresh silently without forcing the user to re-login frequently.

#### Scenario: Token survives page reload

- **GIVEN** an authenticated user with a valid Auth0 session
- **WHEN** the user reloads the page
- **THEN** the user remains authenticated and their token is refreshed silently if needed
