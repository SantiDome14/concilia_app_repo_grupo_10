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

### Requirement: Step-up authentication MUST elevate the session via Auth0 loginWithPopup with an explicit prompt

When an application requires elevated authentication for a sensitive operation, it SHALL trigger step-up via the `useStepUp()` composable, which internally invokes `auth0.loginWithPopup({ authorizationParams: { prompt: 'login', ...optionalAcrValues } })`. On a successful popup completion, the composable SHALL transition `isElevated` to `true`, set `elevatedUntil` to the configured TTL from now, and resolve. The popup invocation SHALL pass through the same Auth0 instance the rest of the auth layer uses — no second Auth0 client is permitted. When the host browser blocks popups by default (or when the tenant Auth0 config does not allow `loginWithPopup`), the composable SHALL fall back to `loginWithRedirect({ appState: { returnTo: currentLocation } })` so the elevation flow still completes after the redirect roundtrip.

#### Scenario: Step-up succeeds via popup and elevates the session

- **GIVEN** a user is authenticated and the browser allows popups
- **WHEN** the app calls `useStepUp().requestStepUp()`
- **THEN** the Auth0 SDK opens the login popup with `prompt: 'login'`, the user re-authenticates, the popup closes successfully, and the composable transitions `isElevated` from `false` to `true` while setting `elevatedUntil` to `now + TTL`

#### Scenario: Popup blocked by browser falls back to redirect with returnTo

- **GIVEN** the browser blocks `loginWithPopup` (popup blocker active or tenant config disallows popup mode)
- **WHEN** the composable detects the popup failure
- **THEN** it falls back to `loginWithRedirect({ appState: { returnTo: window.location.pathname + window.location.search } })`, the user re-authenticates on the Auth0-hosted page, and on return the composable sees the elevated token and transitions `isElevated` to `true` for the originally requested context

#### Scenario: Step-up reuses the existing Auth0 instance

- **GIVEN** the app already registered Auth0 at bootstrap (per `core-auth` baseline)
- **WHEN** the composable triggers step-up
- **THEN** it uses the already-registered Auth0 instance via `useAuth0()` internally — instantiating a second Auth0 client is forbidden

### Requirement: Elevated session MUST auto-expire after a configurable timeout

The elevation status SHALL have a finite lifetime. The default TTL is `300` seconds (5 minutes), configurable globally via the `VITE_STEPUP_TTL_SECONDS` environment variable, and overridable per-call via the `requestStepUp({ ttlSeconds })` option. When the timer fires, the composable SHALL transition `isElevated` to `false` and reset `elevatedUntil` to `null` automatically — no user interaction is required. Subsequent sensitive operations SHALL trigger a fresh `requestStepUp()` if they require elevation again. The TTL countdown is observable via the reactive `elevatedUntil` so apps MAY render a countdown indicator next to the elevation-gated affordance.

#### Scenario: Default TTL elapses and elevation expires

- **GIVEN** an elevated session with the default `300`-second TTL and `elevatedUntil` set to `now + 300`
- **WHEN** 300 seconds pass without any new step-up
- **THEN** the composable's internal timer fires, `isElevated` transitions from `true` to `false`, `elevatedUntil` resets to `null`, and any UI bound to those reactive refs re-renders accordingly

#### Scenario: Per-call TTL override applies to that elevation only

- **GIVEN** an app calls `useStepUp().requestStepUp({ ttlSeconds: 60 })` for a particularly sensitive flow
- **WHEN** step-up succeeds
- **THEN** `elevatedUntil` is set to `now + 60` and the elevation expires after 60 seconds — the global TTL is unaffected for subsequent step-ups

#### Scenario: Manual `clearElevation()` revokes elevation immediately

- **GIVEN** an elevated session with `elevatedUntil` 240 seconds in the future
- **WHEN** the app calls `useStepUp().clearElevation()` (canonical use: user navigates away from the elevation-gated screen, or user-initiated "lock now" affordance)
- **THEN** `isElevated` transitions to `false`, `elevatedUntil` resets to `null`, and the internal timer is cleared

### Requirement: Sensitive operations MUST run inside `withStepUp` wrapper, never with manual elevation checks

Apps SHALL gate sensitive operations through the `withStepUp(operation, options?)` helper, which (a) checks current `isElevated`; (b) if not elevated, calls `requestStepUp(options)` and awaits success; (c) executes `operation()` and returns its result; (d) propagates any error thrown by `operation()` after the elevation completed. Manual patterns that interleave check + step-up + operation in the calling code (e.g. `if (!isElevated.value) await requestStepUp(); await op()`) are forbidden because they introduce race conditions when multiple sensitive operations fire concurrently and because the wrapper centralises telemetry and error categorisation.

#### Scenario: Wrapper triggers step-up when not elevated, then runs the operation

- **GIVEN** `isElevated` is `false` and the app calls `withStepUp(() => apiClient.post('/clients/123/whitelist', payload))`
- **WHEN** the wrapper executes
- **THEN** it calls `requestStepUp()` first; on successful elevation it invokes the operation; the wrapper resolves with the operation's result

#### Scenario: Wrapper skips step-up when already elevated

- **GIVEN** `isElevated` is `true` and `elevatedUntil` is in the future
- **WHEN** the app calls `withStepUp(operation)`
- **THEN** the wrapper does NOT trigger a fresh `requestStepUp` — it invokes `operation` directly and resolves with its result

#### Scenario: Manual elevation pattern is forbidden

- **GIVEN** a developer authors `if (!isElevated.value) { await requestStepUp(); } await sensitiveOp();`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — sensitive operations SHALL go through `withStepUp(operation)` exclusively

### Requirement: Failed step-up MUST surface a typed error so apps can branch on the cause

The step-up flow can fail for four distinct reasons, each with its own UX implication. The composable SHALL reject `requestStepUp()` (and propagate through `withStepUp()`) with a typed error class so apps can branch deterministically: `StepUpCancelledError` (user closed the popup or navigated back from the redirect without completing); `StepUpBlockedError` (browser blocked the popup AND `loginWithRedirect` is also disabled or unavailable); `StepUpNetworkError` (network failure during the popup or redirect roundtrip); `StepUpRejectedError` (Auth0 returned an error, e.g., `mfa_required` not satisfied, account locked, IDP error). Generic `Error` MUST NOT be thrown — the four typed classes cover every expected failure surface.

#### Scenario: User cancels the popup, app handles `StepUpCancelledError`

- **GIVEN** the popup opens and the user closes it without completing
- **WHEN** the composable observes the cancellation
- **THEN** it rejects the promise with `new StepUpCancelledError(...)` — the calling app catches the typed error and renders a non-intrusive toast (e.g. `"Operación cancelada"`) without flagging it as a failure

#### Scenario: Popup blocked and redirect disabled, app handles `StepUpBlockedError`

- **GIVEN** the browser blocks `loginWithPopup` and the tenant Auth0 config does not allow redirect-mode either (edge case)
- **WHEN** the composable evaluates the failure
- **THEN** it rejects with `new StepUpBlockedError(...)` — the calling app shows an actionable banner instructing the user to enable popups for the domain

#### Scenario: Auth0 returns an error, app handles `StepUpRejectedError`

- **GIVEN** Auth0 rejects the popup with `error: 'mfa_required'` because the user lacks an enrolled second factor
- **WHEN** the composable observes the rejection
- **THEN** it rejects with `new StepUpRejectedError({ code: 'mfa_required', message: ... })` — the calling app surfaces a "Set up MFA" CTA pointing at the Auth0 self-service URL

#### Scenario: Generic Error is forbidden

- **GIVEN** a developer wraps the Auth0 SDK call in a `try { ... } catch (e) { throw e }` that re-throws the raw error
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every step-up failure SHALL surface as one of the four typed classes; raw `Error` is a contract violation

### Requirement: Step-up state MUST be inspectable via reactive `isElevated` and `elevatedUntil`

The `useStepUp()` composable SHALL expose at minimum `isElevated: ComputedRef<boolean>` and `elevatedUntil: Ref<Date | null>` for UI components to bind against. Components SHALL use these refs to (a) gate elevation-required affordances (disable / hide buttons while not elevated); (b) render an optional countdown indicator that updates while elevated; (c) trigger explicit re-elevation when the user clicks an elevation-gated control while expired. Apps SHALL NOT inspect or mutate the underlying timer state — `isElevated` and `elevatedUntil` are the only contracted surfaces.

#### Scenario: Component disables a button while not elevated

- **GIVEN** a Whitelist Account button bound to `:disabled="!isElevated"` from `useStepUp()`
- **WHEN** `isElevated` is `false` (initial state, after expiration, or after `clearElevation()`)
- **THEN** the button renders disabled; clicking is impossible until step-up completes successfully

#### Scenario: Countdown indicator renders while elevated

- **GIVEN** an app renders a small countdown timer next to the Whitelist Account button using `elevatedUntil` for the target time
- **WHEN** the elevation reaches its midway point (e.g. 150 seconds remain of a 300-second TTL)
- **THEN** the countdown shows `02:30` and updates every second as the user observes it; on expiry it disappears as `isElevated` flips to `false`

#### Scenario: Direct mutation of `isElevated` is forbidden

- **GIVEN** a developer attempts to set `isElevated.value = true` to "skip step-up during E2E tests"
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — `isElevated` is a `ComputedRef` derived from internal state; tests MUST mock the composable, not bypass it

