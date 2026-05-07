## ADDED Requirements

### Requirement: Lex roles MUST be sourced exclusively from the Auth0 `USER_ROLES` claim

The frontend SHALL read the role identifiers from the `USER_ROLES` array on the decoded Auth0 user object. The frontend MUST NOT derive, infer, or override roles from any other source — query parameters, local storage, feature flags, or hardcoded overrides are forbidden.

#### Scenario: Roles are read from the authenticated user

- **GIVEN** a user is authenticated via Auth0 and the token includes `USER_ROLES: ["COMMERCIAL_LEX"]`
- **WHEN** any page or component asks for the current Lex roles
- **THEN** the returned value is exactly `["COMMERCIAL_LEX"]`

#### Scenario: Missing claim resolves to no Lex roles

- **GIVEN** a user is authenticated but the token does not contain a `USER_ROLES` array
- **WHEN** any page or component asks for the current Lex roles
- **THEN** the returned value is `[]` and the user is treated as having no Lex permissions

#### Scenario: Role overrides via query parameter are ignored

- **GIVEN** a user navigates to `/clientes?role=ADMIN_LEX`
- **WHEN** any page or component asks for the current Lex roles
- **THEN** the query parameter is ignored and the result is computed strictly from `USER_ROLES`

---

### Requirement: Lex MUST recognise exactly three role identifiers

The set of valid Lex role identifiers SHALL be `VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`. Identifiers outside this set SHALL be ignored when computing capabilities. The identifiers MUST be exported from a single TypeScript union (`type LexRole = 'VIEWER_LEX' | 'COMMERCIAL_LEX' | 'ADMIN_LEX'`) and a runtime constant array.

#### Scenario: Unknown role identifiers are ignored

- **GIVEN** the `USER_ROLES` array contains `["COMMERCIAL_LEX", "LEGACY_ADMIN", "VIEWER_LEX"]`
- **WHEN** the runtime computes the user's effective Lex roles
- **THEN** only `COMMERCIAL_LEX` and `VIEWER_LEX` are retained; `LEGACY_ADMIN` is dropped

#### Scenario: Role identifiers are case-sensitive

- **GIVEN** the `USER_ROLES` array contains `["commercial_lex"]`
- **WHEN** the runtime computes the user's effective Lex roles
- **THEN** the lowercase value is not matched and the user is treated as having no Lex roles

---

### Requirement: Role checks MUST go through a single composable

All client-side role-gating decisions SHALL be performed by calling `useLexRole()` (or the equivalent composable defined alongside this spec). Components MUST NOT inspect `auth.user.USER_ROLES` directly, MUST NOT reimplement role-comparison helpers, and MUST NOT compose ad-hoc booleans like `user.value?.USER_ROLES?.includes('ADMIN_LEX')` outside the composable.

#### Scenario: Components consume role state via the composable

- **GIVEN** a component needs to gate a button on `ADMIN_LEX`
- **WHEN** the component is authored
- **THEN** the gating predicate is read from the composable (e.g. `const { isAdmin } = useLexRole()`) rather than reading `USER_ROLES` directly

#### Scenario: Direct Auth0 inspection in components is rejected at review

- **GIVEN** a pull request adds a component that imports `useAuth0()` and inspects `user.USER_ROLES`
- **WHEN** the change is reviewed
- **THEN** the reviewer rejects the change and requires the inspection to be moved into `useLexRole()` or a dedicated capability composable

---

### Requirement: VIEWER_LEX MUST be denied all mutating actions

A user whose only Lex role is `VIEWER_LEX` SHALL be unable to trigger any action that creates, edits, deletes, assigns, or otherwise mutates Lex domain data. The corresponding affordances (buttons, menu items, drag-handles, form submit controls) SHALL either be hidden or rendered in a disabled state with an accessible explanation.

#### Scenario: Mutating affordances are hidden for VIEWER_LEX

- **GIVEN** the current user has roles `["VIEWER_LEX"]` and is on `/clientes`
- **WHEN** the page renders
- **THEN** the row actions menu shows no destructive options, the assign-user popover trigger is absent, and the page-header "Crear" button (if any) is not rendered

#### Scenario: Direct API mutation is still rejected by the backend

- **GIVEN** a `VIEWER_LEX` user crafts a manual `DELETE /client/:id` request
- **WHEN** the request reaches the backend
- **THEN** the backend rejects it with 403 and the frontend's global 403 handler surfaces a generic "Operación no permitida" toast

---

### Requirement: COMMERCIAL_LEX MUST be denied access to the Actividad and Documentos tabs

On the `/clientes/:id` detail page, a user whose effective set of Lex roles is exactly `{COMMERCIAL_LEX}` (without `ADMIN_LEX`) SHALL NOT be able to view the Actividad or Documentos tabs. The tabs SHALL render an "Acceso restringido" placeholder, and direct navigation via the `?tab=` query parameter SHALL also be blocked.

#### Scenario: Restricted tabs render the access placeholder

- **GIVEN** the user has roles `["COMMERCIAL_LEX"]` and lands on `/clientes/abc?tab=documentos`
- **WHEN** the page mounts
- **THEN** the Documentos tab content is replaced by the "Acceso restringido" placeholder; no `GET /document` request is fired for that client

#### Scenario: Holding both COMMERCIAL_LEX and ADMIN_LEX grants access

- **GIVEN** the user has roles `["COMMERCIAL_LEX", "ADMIN_LEX"]` and navigates to `/clientes/abc?tab=actividad`
- **WHEN** the page mounts
- **THEN** the Actividad tab loads its data normally and the placeholder is not shown

---

### Requirement: Role state MUST be reactive and survive token refresh

The composable returned by this capability SHALL expose role flags as Vue reactive references. When Auth0 refreshes the access token (silent refresh, login event), the composable SHALL re-derive the role flags so that components consuming them update without a manual page reload.

#### Scenario: Role flag updates after silent token refresh

- **GIVEN** a `VIEWER_LEX` user keeps the app open and the backend grants the user `ADMIN_LEX` between token refreshes
- **WHEN** Auth0 refreshes the token silently and the new claims include `USER_ROLES: ["ADMIN_LEX"]`
- **THEN** components reading `isAdmin` from `useLexRole()` re-render and previously hidden affordances become visible without a full page reload

#### Scenario: Logout clears all role flags

- **GIVEN** a user with `ADMIN_LEX` is on any Lex page
- **WHEN** the user signs out via the avatar menu
- **THEN** every role flag returned by the composable resolves to `false` before the redirect to `/login` occurs
