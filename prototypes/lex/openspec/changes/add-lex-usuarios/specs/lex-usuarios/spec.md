## ADDED Requirements

### Requirement: Usuarios table MUST render the canonical column set

The Usuarios table SHALL render columns: Email, Nombre, Rol. Per `core-data-tables` Requirement "Every record-list table MUST render a leftmost monospaced ID column that is never user-hidden", the leftmost Email column SHALL render in monospace because it functions as the user identifier. The Rol column SHALL render via a Badge whose colour is driven by a registry in `src/lex/users/roleBadge.ts`. The page MUST NOT expose any per-row Acciones column in v1, per `core-data-tables` Requirement "Tables MUST render an Acciones column at the rightmost position when per-row actions exist and MUST omit it entirely otherwise".

#### Scenario: Default rendering

- **GIVEN** a user navigates to `/usuarios`
- **WHEN** the table renders
- **THEN** the columns appear in order Email, Nombre, Rol; Email is in monospace; no Acciones column exists

#### Scenario: Role badge colour mapping

- **GIVEN** rows with roles `COMMERCIAL_LEX`, `COMPLIANCE` (in `assigned_users` style), and an unknown role string
- **WHEN** the cells render
- **THEN** `COMMERCIAL_LEX` uses the blue badge token, `COMPLIANCE` uses the purple badge token, the unknown value uses the neutral badge variant

#### Scenario: Empty state copy

- **GIVEN** the response is an empty array
- **WHEN** the table renders
- **THEN** `EmptyState` is shown with title `Sin usuarios` and description `No hay usuarios con los filtros aplicados`

---

### Requirement: Name search MUST be debounced 300 ms before fetching

The L3 filter bar SHALL include a Nombre text input. Typing SHALL be debounced 300 ms before pushing into the `useQuery` key `['lex','users',{ page, pageSize, name, role }]`. A second filter Rol SHALL be a Select with the values `VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX` and applies immediately. Both filters SHALL be persisted in the URL via query parameters so a deep link reproduces the same view.

#### Scenario: Name input is debounced

- **GIVEN** a user types `Maria` in the Nombre filter character by character
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /user?name=Maria` request fires

#### Scenario: Role filter applies immediately

- **GIVEN** the Nombre filter is empty and the table is loaded
- **WHEN** the user picks `ADMIN_LEX` in the Rol Select
- **THEN** the `GET /user?role=ADMIN_LEX` request fires within the same tick

#### Scenario: Filters reflected in URL

- **GIVEN** the user has applied `name=Maria` and `role=ADMIN_LEX`
- **WHEN** the user copies the URL and pastes it into a new tab
- **THEN** the new page mounts with the same filters pre-applied

---

### Requirement: Pagination MUST translate between the frontend 0-index and the backend 1-index

`@tanstack/vue-query` and the page-size selector use 0-indexed pages internally. The `GET /user` endpoint expects 1-indexed pages. The Lex API client SHALL translate by adding `+1` to the outbound page parameter and SHALL translate `sort` field names to uppercase (e.g. `name` → `NAME`). The translation MUST live in the dedicated endpoints file (`src/lex/users/api.ts`) and MUST NOT leak into the page component. Page sizes SHALL be `10 / 25 / 50 / 100` defaulting to `25`, persisted in `localStorage` under `lex.usuarios.pageSize`.

#### Scenario: Frontend page 0 fetches backend page 1

- **GIVEN** the table is on its first page
- **WHEN** the request is fired
- **THEN** the request URL contains `?page=1` (not `?page=0`)

#### Scenario: Frontend page 2 fetches backend page 3

- **GIVEN** the user navigates to the third page (frontend index 2)
- **WHEN** the request is fired
- **THEN** the request URL contains `?page=3`

#### Scenario: Sort field is uppercased

- **GIVEN** the table is sorted by `name` ascending
- **WHEN** the request is fired
- **THEN** the request URL contains `?sort=NAME&order=ASC`

---

### Requirement: Role labels MUST go through formatRole()

A pure `formatRole(role: string): string` helper SHALL live in `src/lex/users/format.ts` and SHALL convert the canonical identifiers to human-friendly labels: `ADMIN_LEX → "Admin Lex"`, `COMMERCIAL_LEX → "Comercial Lex"`, `VIEWER_LEX → "Viewer Lex"`, `COMPLIANCE → "Compliance"`. Unknown roles SHALL pass through verbatim, except that any leading dashes/underscores SHALL be replaced with spaces and the result SHALL be Title Case. The Rol column cell SHALL call `formatRole()` exactly once per render; pages MUST NOT inline string transformations.

#### Scenario: Canonical roles produce the canonical labels

- **GIVEN** rows with roles `ADMIN_LEX`, `COMMERCIAL_LEX`, `VIEWER_LEX`, `COMPLIANCE`
- **WHEN** the Rol cells render
- **THEN** the visible labels are `Admin Lex`, `Comercial Lex`, `Viewer Lex`, `Compliance` respectively

#### Scenario: Unknown role passes through Title Case

- **GIVEN** a row whose role is `LEGACY_AUDITOR`
- **WHEN** the cell renders
- **THEN** the visible label is `Legacy Auditor`

#### Scenario: Inline string transformations are rejected at review

- **GIVEN** a pull request adds `{{ user.role.replaceAll('_', ' ') }}` inside a template
- **WHEN** the change is reviewed
- **THEN** the reviewer rejects the change and requires the cell to call `formatRole()`

---

### Requirement: Usuarios page MUST be visible to every authenticated Lex role

The Usuarios page SHALL be visible to all three Lex roles (`VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`) per the `lex-roles` matrix. The page does not expose mutating actions in v1, so role gating is purely read-vs-no-access. Server-side filtering of which users each role can see is the backend's responsibility; this requirement only confirms that the page itself is reachable for all three roles.

#### Scenario: VIEWER_LEX reaches the page

- **GIVEN** a user with roles exactly `['VIEWER_LEX']` opens `/usuarios`
- **WHEN** the page mounts
- **THEN** the page renders normally; no "Acceso restringido" placeholder is shown

#### Scenario: COMMERCIAL_LEX reaches the page

- **GIVEN** a user with roles exactly `['COMMERCIAL_LEX']` opens `/usuarios`
- **WHEN** the page mounts
- **THEN** the page renders normally

#### Scenario: ADMIN_LEX reaches the page

- **GIVEN** a user with roles exactly `['ADMIN_LEX']` opens `/usuarios`
- **WHEN** the page mounts
- **THEN** the page renders normally
