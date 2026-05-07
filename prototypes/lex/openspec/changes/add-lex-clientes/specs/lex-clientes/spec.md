## ADDED Requirements

### Requirement: /clientes MUST expose a primary L1 Segmenter Pendientes / Activos / Inactivos that drives the server-side status filter

The `/clientes` page SHALL render a primary `<Segmenter>` (per `core-layout`) at the L1 page header with exactly three segments in this order: `Pendientes`, `Activos`, `Inactivos`. The active segment SHALL be persisted in the URL via `?segment=pendientes|activos|inactivos`. A page load without an explicit segment parameter SHALL default to `Activos`. Switching segment SHALL update the URL and trigger a new `GET /client` request whose `status` query parameter is derived from the segment: `Pendientes → status=PENDING_REVIEW`, `Activos → status=APPROVED`, `Inactivos → status=DEACTIVATED`. The legacy URL `/altas` SHALL be registered as a redirect to `/clientes?segment=pendientes` so existing bookmarks keep working.

#### Scenario: Default segment is Activos

- **GIVEN** a user opens `/clientes` without a `?segment=` query parameter
- **WHEN** the page mounts
- **THEN** the URL is rewritten to `/clientes?segment=activos`, the `Activos` segment is active, and the request fired contains `?status=APPROVED`

#### Scenario: Direct link to ?segment=pendientes opens the Pendientes segment

- **GIVEN** the user navigates to `/clientes?segment=pendientes`
- **WHEN** the page mounts
- **THEN** the `Pendientes` segment is active and the request fired contains `?status=PENDING_REVIEW`

#### Scenario: Switching segment fires a new request

- **GIVEN** the user is on `?segment=activos` with cached data
- **WHEN** the user clicks `Pendientes` in the segmenter
- **THEN** the URL becomes `?segment=pendientes`, exactly one new `GET /client?status=PENDING_REVIEW` request fires, and the table replaces its rows on response

#### Scenario: Legacy /altas redirects to /clientes?segment=pendientes

- **GIVEN** a user opens `/altas` (legacy bookmark)
- **WHEN** the router resolves
- **THEN** the URL is rewritten in place to `/clientes?segment=pendientes` and the `Pendientes` segment is active

---

### Requirement: Clientes table MUST render the canonical column set without an Estado column

The Clientes table SHALL render exactly the following columns in this left-to-right order: Ardua docket, Circuit docket, Haz docket, Nombre, CUIT, Plantilla, Tipo, Asignado, Fecha de creación, Acciones. The Estado column SHALL NOT be rendered — the active segment in the L1 already disambiguates the status. Per `core-data-tables` (`prototypes/lex/openspec/specs/core-data-tables/spec.md`) the rightmost Acciones column SHALL be omitted entirely when no per-row actions are visible to the current role. Plantilla cells SHALL render via the registry defined in `lex-templates`. CUIT SHALL render in monospace per `core-data-tables` Requirement "Every record-list table MUST render a leftmost monospaced ID column that is never user-hidden".

#### Scenario: Default column rendering for ADMIN_LEX

- **GIVEN** an ADMIN_LEX user is on `/clientes?segment=activos`
- **WHEN** the table mounts with the first page of data
- **THEN** the visible columns are, in order, Ardua docket, Circuit docket, Haz docket, Nombre, CUIT, Plantilla, Tipo, Asignado, Fecha de creación, Acciones; no Estado column is present

#### Scenario: Acciones column is hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user opens `/clientes`
- **WHEN** the table mounts
- **THEN** the Acciones column is not rendered (no empty `<th>`, no placeholder), per `lex-roles` Requirement "VIEWER_LEX MUST be denied all mutating actions"

#### Scenario: Empty docket renders the em-dash placeholder

- **GIVEN** a row whose `circuit_docket` is `null`
- **WHEN** the cell renders
- **THEN** the visible content is `—` (em-dash) and the cell `title` attribute is "Sin docket Circuit Pay"

---

### Requirement: Clientes filters MUST be debounced 300 ms before triggering a fetch

The L3 filter bar SHALL include the following inputs (the segment-driven Estado filter is removed because the L1 segmenter replaces it): Nombre (text), CUIT (text), Docket (text), Partner (Select with values `ardua` / `circuit` / `haz`), Plantilla (Select per `lex-templates`), Tipo cliente (Select with values `GROUPER` / `DIRECT`), Tipo (Select with values `COMPANY` / `PARTICULAR`). Text inputs SHALL be debounced 300 ms before pushing into the `useQuery` key; Select inputs SHALL apply immediately. The `useQuery` key MUST be `['lex', 'clients', { segment, page, pageSize, filters }]` so cache hits stay deterministic per-segment.

#### Scenario: Search input is debounced

- **GIVEN** a user types `Acme` into the Nombre filter character by character
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /client?status=...&name=Acme` request is fired; intermediate keystrokes do not produce requests

#### Scenario: Select filters apply immediately

- **GIVEN** the Tipo filter is currently `COMPANY`
- **WHEN** the user picks `PARTICULAR`
- **THEN** the new `GET /client?status=...&type=PARTICULAR` request fires within the same tick (no 300 ms debounce)

#### Scenario: Filter state survives a page navigation and back

- **GIVEN** a user has applied `template_id=ardua-kyb` and `type=COMPANY` and clicks a row
- **WHEN** the user clicks the browser Back button from `/clientes/:id`
- **THEN** the L3 filter bar is restored to `template_id=ardua-kyb` + `type=COMPANY` and the URL contains both query parameters

---

### Requirement: Pagination MUST use server-side @tanstack/vue-query with the canonical page sizes shared across segments

Per `core-data-tables` the page MUST use `@tanstack/vue-query` for server-side pagination. The Clientes tab SHALL expose page sizes `10`, `25`, `50`, `100` and default to `25`. The page-size selector SHALL persist its value in `localStorage` under the key `lex.clientes.pageSize`, **shared across all segments** so that a user's preferred density is consistent. Hand-rolled `visiblePages` / `totalPages` arithmetic from the legacy code is forbidden; the pagination control is provided by `core-data-tables` Requirement "Tables MUST support client-side pagination with ellipsis navigation" extended for server-side use.

#### Scenario: Default page size is 25 across segments

- **GIVEN** a user opens `/clientes` for the first time on this device
- **WHEN** the table loads
- **THEN** the URL contains `?pageSize=25` and the page-size selector reads `25`; switching segment preserves the size

#### Scenario: Page size selection persists across sessions

- **GIVEN** a user changes the page size to `100`
- **WHEN** the user reloads the browser the next day
- **THEN** the table loads with `pageSize=100` taken from `localStorage`

#### Scenario: Page navigation preserves filters and segment

- **GIVEN** the table shows page 1 of `?segment=pendientes&partner=ardua`
- **WHEN** the user clicks the page-2 control
- **THEN** the `GET /client?status=PENDING_REVIEW&partner=ardua&page=2` request fires and the filter input retains the value `ardua`

---

### Requirement: Rows assigned to the current user MUST be highlighted amber

When a row's `assigned_users` array contains the current user's id, the row SHALL render with the `--row-assigned-bg` CSS variable applied to the row background and the `--row-assigned-border` token applied as a 2 px left accent border. The legacy frontend computes assignment from `assigned_users[].user_id`; the new spec mirrors that semantics. The highlight MUST work for both `ADMIN_LEX` and `COMMERCIAL_LEX` and MUST NOT depend on whether the user is `assigned_by_compliance` vs `assigned_by_commercial`. The highlight rule applies in every segment where assignment is meaningful (`Pendientes` and `Activos`); in `Inactivos` the highlight MAY render but assignment is read-only.

#### Scenario: Self-assigned row is highlighted in Activos

- **GIVEN** the current user id is `u-42` and a row's `assigned_users` is `[{ user_id: 'u-42', role: 'COMMERCIAL' }]` and the segment is Activos
- **WHEN** the row renders
- **THEN** the row's background uses `--row-assigned-bg` and a 2 px left border uses `--row-assigned-border`

#### Scenario: Other-user-assigned row is not highlighted

- **GIVEN** a row's `assigned_users` is `[{ user_id: 'u-99', role: 'COMPLIANCE' }]` and the current user id is `u-42`
- **WHEN** the row renders
- **THEN** no amber background or accent border is applied

#### Scenario: Highlight follows token refresh

- **GIVEN** the current user is reassigned to a row by another user during the session
- **WHEN** `@tanstack/vue-query` invalidates and refetches the page
- **THEN** the previously plain row re-renders with the amber highlight without a manual page reload

---

### Requirement: Clicking a row MUST navigate to /clientes/:id without writing a session marker

Per `core-data-tables` Requirement "Table rows MUST open a detail view on click", clicking anywhere outside the Acciones column SHALL navigate to `/clientes/:id`. The page MUST NOT write any `sessionStorage` origin key — the back-button on the detail page resolves the return target by reading the originating Cliente's status (per `lex-cliente-detalle` Requirement "Back navigation MUST resolve to /clientes with the segment matching the Cliente status"). The Acciones column SHALL stop click propagation per `core-actions-menu` Requirement "Actions column in tables MUST NOT propagate row clicks".

#### Scenario: Row click navigates without writing sessionStorage

- **GIVEN** a user clicks the Nombre cell of a row whose id is `c-101`
- **WHEN** the navigation commits
- **THEN** the URL becomes `/clientes/c-101` and `sessionStorage.lex.clientDetailSource` is NOT written (the legacy origin marker is no longer used)

#### Scenario: Click on Acciones cell does not navigate

- **GIVEN** a user clicks the three-dot trigger inside the Acciones column
- **WHEN** the menu opens
- **THEN** the URL does not change

---

### Requirement: Crear Empresa CTA MUST open the CreateBusinessModal with similarity warnings inline

The L1 page header SHALL render exactly one CTA labelled `Crear Empresa` per `core-layout` Requirement "Page header actions MUST be limited to a maximum of three primary CTAs". The CTA SHALL be visible to users whose roles include `COMMERCIAL_LEX` or `ADMIN_LEX` and SHALL be hidden for `VIEWER_LEX` per `lex-roles`. The CTA is visible across all three segments (creation is always permitted). Clicking the CTA SHALL open the `CreateBusinessModal`, a Create-type modal per `core-modals` Requirement "Create modals MUST use the 'Cancelar / Crear ...' button pair", collecting `company_name`, `tax_number`, `activity`, and `company_type` (Select with values `LLC`, `CORPORATION`, `COOPERATIVE`, `PARTNERSHIP`, `SOLE_PROP`, `TRUST`, `OTHER`). When the user enters a valid `tax_number`, the modal SHALL fire a debounced (300 ms) `GET /client?tax_number_or_similar=...` and render any returned `similarity_warnings[]` inline beneath the field; warnings SHALL NOT block submission, but the submit button label SHALL change from `Crear Empresa` to `Crear de todos modos` while warnings are present. Per `core-forms` the modal validates with vee-validate + zod. Submit SHALL call `POST /client` with `type=COMPANY` and `status=PENDING_REVIEW`. On 201 the modal closes, the `['lex', 'clients']` query is invalidated, and a toast `Empresa creada` is surfaced; the new Cliente lives in the `Pendientes` segment regardless of which segment was active at creation time.

#### Scenario: CTA is hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user is on `/clientes`
- **WHEN** the L1 header renders
- **THEN** the `Crear Empresa` CTA is not rendered

#### Scenario: Modal validates with vee-validate + zod

- **GIVEN** the modal is open and `tax_number` is empty
- **WHEN** the user clicks `Crear Empresa` inside the modal
- **THEN** the submit button is disabled and a field-level error renders below the input per `core-forms` Requirement "Form field errors MUST render directly below the input"

#### Scenario: Similarity warnings render inline and switch the submit label

- **GIVEN** the user types a `tax_number` that matches an existing client at similarity 0.92
- **WHEN** 300 ms elapse without further input
- **THEN** a warning block appears with the matched client's name, dockets, similarity score `0.92`, and a `Ver legajo existente` link in a new tab; the primary CTA reads `Crear de todos modos`; clearing the `tax_number` clears the warnings and reverts the CTA to `Crear Empresa`

#### Scenario: Successful creation closes the modal and surfaces a toast

- **GIVEN** all required fields are filled with valid values and no similarity warnings are active
- **WHEN** the user submits
- **THEN** `POST /client` is called with `type=COMPANY` and `status=PENDING_REVIEW`, the modal closes on 201, the `['lex', 'clients']` query is invalidated, and a toast `Empresa creada` is surfaced per `core-modals` Requirement "Modals MUST emit toast feedback on successful operations"

---

### Requirement: Per-row Asignar popover MUST be visible in Pendientes and Activos with optimistic update; Eliminar MUST be visible in Pendientes and Inactivos for ADMIN_LEX only

Each row in the `Pendientes` and `Activos` segments SHALL expose an inline trigger labelled `Asignar` (or the assigned user's name when assigned) that opens a `SelectUserPopover`. In the `Inactivos` segment the assignment field SHALL render as plain text (no popover trigger) — Inactivos are not actively reassigned. The popover SHALL list users with role `COMMERCIAL_LEX` returned by `GET /user?role=COMMERCIAL_LEX`. Selecting a user SHALL call `PATCH /client/:id { assigned_user_id }` and optimistically update the row; failure SHALL roll back and surface a toast `No se pudo asignar` with a `Reintentar` action. The Asignar trigger MUST be hidden for `VIEWER_LEX` per `lex-roles`. The Acciones column SHALL expose `Eliminar` only in the `Pendientes` and `Inactivos` segments and only for `ADMIN_LEX` users; in `Activos` the action is not rendered (active Clientes are deactivated, not deleted). `Eliminar` SHALL open a destructive confirmation per `core-modals` Requirement "Confirmation dialogs MUST follow the destructive action pattern" with the Cliente name in the body, verb-specific label `Eliminar`, ghost `Cancelar` left, danger-variant `Eliminar` right; on confirm `DELETE /client/:id` fires, the cache invalidates, and a toast `Cliente eliminado` is surfaced.

#### Scenario: Asignar succeeds with optimistic update in Activos

- **GIVEN** an ADMIN_LEX user is on `?segment=activos` and clicks Asignar on a row
- **WHEN** the user picks `María Silvestre` in the popover
- **THEN** the cell text changes to `María Silvestre` immediately, `PATCH /client/:id` is in flight, and on 200 the cell stays updated and the popover closes

#### Scenario: Asignar rolls back on failure

- **GIVEN** the same starting point and the network returns 500
- **WHEN** the request fails
- **THEN** the cell text reverts to the previous value, a toast `No se pudo asignar` is shown with a `Reintentar` action, and the popover stays open

#### Scenario: VIEWER_LEX sees the assigned user as plain text in any segment

- **GIVEN** a VIEWER_LEX user views a row whose `assigned_user_id` is `u-42`
- **WHEN** the Asignado cell renders
- **THEN** the user's name is shown as static text without the popover trigger or hover affordance, regardless of segment

#### Scenario: Eliminar is not rendered in Activos

- **GIVEN** an ADMIN_LEX user is on `?segment=activos` and opens a row Acciones menu
- **WHEN** the menu renders
- **THEN** `Eliminar` is not present (active Clientes are deactivated rather than deleted)

#### Scenario: Eliminar in Pendientes opens destructive confirmation

- **GIVEN** an ADMIN_LEX user is on `?segment=pendientes` and clicks `Eliminar` on a row whose Nombre is `Acme Corp`
- **WHEN** the dialog opens
- **THEN** the header reads `Eliminar cliente` with the danger accent, the body mentions `Acme Corp`, the left button is `Cancelar` (ghost), the right button is `Eliminar` (danger), ESC dismisses as Cancelar; on confirm `DELETE /client/:id` fires, the cache invalidates, and a toast `Cliente eliminado` is shown

#### Scenario: Eliminar is hidden for COMMERCIAL_LEX

- **GIVEN** a `COMMERCIAL_LEX` user opens a row Acciones menu in any segment
- **WHEN** the menu renders
- **THEN** `Eliminar` is not present

---

### Requirement: Loading and empty states MUST use the shared feedback components

Per `core-error-handling` Requirements "Empty states MUST use the shared `EmptyState` component" and "Loading states MUST use the shared `Skeleton` component", the Clientes tab SHALL render `<Skeleton>` rows during the initial fetch and `<EmptyState>` when the response is an empty page. The empty-state copy SHALL adapt to the active segment: `Pendientes` → `Sin clientes pendientes de revisión`, `Activos` → `Sin clientes activos para los filtros aplicados`, `Inactivos` → `Sin clientes inactivos`. A network or 5xx error SHALL surface a toast with a "Reintentar" action per `core-error-handling` Requirement "Network and 5xx errors MUST offer retry affordance".

#### Scenario: Skeleton rows render during the first fetch

- **GIVEN** the user lands on `/clientes` with no cached data
- **WHEN** the request is in flight
- **THEN** the table body renders 10 skeleton rows in the canonical row height; the column headers and the L1 segmenter remain visible

#### Scenario: Empty state copy adapts to segment

- **GIVEN** the user is on `?segment=pendientes` and the response for the active filters is an empty array
- **WHEN** the table renders
- **THEN** the `<EmptyState>` component is shown with description `Sin clientes pendientes de revisión`

#### Scenario: 5xx surfaces a retry toast

- **GIVEN** `GET /client` returns 503
- **WHEN** the toast surfaces
- **THEN** the toast description includes the localized "Reintentar" action and clicking it re-invokes the failed query
