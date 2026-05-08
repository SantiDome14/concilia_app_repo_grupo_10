## ADDED Requirements

### Requirement: The Instructions page MUST be a Type-A master list registered at `/instructions`

The page SHALL be implemented at `src/pages/Instructions.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Instrucciones'`, and `meta.block = 'Configuración'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + primary CTA), filter row, paginated table, footer with pagination ellipsis. The legacy paths `/settings/instructions`, `/settings/instructions/:id`, and `/settings/instructions/:id/view` SHALL redirect: the bare path lands on `/instructions`; the `:id` paths land on `/instructions?detail=:id` so the Detail modal opens at the targeted row.

#### Scenario: Authenticated navigation to `/instructions` renders the Type-A page shell

- **GIVEN** an authenticated OPS user
- **WHEN** the user navigates to `/instructions`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main), the page header shows the title `Instrucciones` and the primary CTA `+ Crear instrucción`, and the filter row + paginated table render below

#### Scenario: Legacy URL redirects to the unified page with the detail modal pre-opened

- **GIVEN** an authenticated user navigates to the legacy path `/settings/instructions/abc-123/view`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/instructions?detail=abc-123` with the Instructions list rendered and the Detail modal mounted on top, showing the instruction with id `abc-123`

#### Scenario: Sidebar surfaces the page under the `Configuración` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Configuración` block whose first entry is `Instrucciones` linking to `/instructions`; entries for additional `Configuración` modules MAY appear when their respective capabilities land

### Requirement: The list MUST expose the canonical column set and surface row click as the Detail modal trigger

The table SHALL render the columns in this order: `Nombre`, `Moneda`, `Descripción`, `Atributos` (count), `Acciones`. `Atributos` renders as a numeric chip showing the attribute count. Clicking anywhere outside the `Acciones` cell of a row SHALL open the Detail modal for that instruction. The `Acciones` cell uses the standard portal-mounted Actions menu from `core-actions-menu`; clicks inside it SHALL stop propagation so the row click never fires when the menu is being used.

#### Scenario: Row click opens the Detail modal

- **GIVEN** the table renders 5 instructions
- **WHEN** the user clicks anywhere on a row outside the Acciones cell
- **THEN** the Detail modal mounts with the targeted instruction's data; the URL gains `?detail=<id>` query so deep-links work

#### Scenario: Click inside the Acciones cell does NOT open the Detail modal

- **GIVEN** the same table
- **WHEN** the user clicks the three-dots Acciones trigger on a row
- **THEN** the per-row actions popover opens, the Detail modal does NOT, and no URL change occurs

#### Scenario: Atributos column renders the attribute count as a numeric chip

- **GIVEN** an instruction with 4 declared attributes
- **WHEN** its row renders
- **THEN** the `Atributos` cell shows a small chip with the number `4`; instructions with 0 attributes render the chip as `0` (not empty) for visual consistency

### Requirement: Filters MUST be debounced for text and immediate for select, with state surviving Back navigation

The filter row SHALL include `Nombre` (text input, 300 ms debounce, applied to the `name` query parameter), `Moneda` (select sourced from the canonical `ops.currencies` catalog, applied immediately to `currency_id`), and a `Limpiar filtros` ghost button when at least one filter is active. The active filter state SHALL be reflected in the URL query so back-button navigation restores the filter set without a page reload. Per `core-data-tables`, the table's filter state (current page, page size, search, filters) is preserved across navigation away and back.

#### Scenario: Typing in `Nombre` debounces the query by 300 ms

- **GIVEN** an empty `Nombre` filter
- **WHEN** the user types `transfer` quickly
- **THEN** the API call fires once 300 ms after the last keystroke with `?name=transfer`; intermediate keystrokes do NOT trigger requests

#### Scenario: Selecting a currency applies the filter immediately

- **GIVEN** an empty `Moneda` filter
- **WHEN** the user picks `USD` from the select
- **THEN** the API call fires immediately with `?currency_id=<USD>` and the table re-renders with the filtered results

#### Scenario: Back navigation restores the filters

- **GIVEN** the user has set `?name=transfer&currency_id=USD&page=2`, opens an instruction's Detail modal, then navigates Back
- **WHEN** the user lands back on `/instructions`
- **THEN** the URL still contains `?name=transfer&currency_id=USD&page=2`, the inputs reflect those values, and the table shows the filtered page

### Requirement: The Header CTA `+ Crear instrucción` MUST open a Create modal gated by role

The page header CTA `+ Crear instrucción` SHALL be visible only to users whose roles include `OPS_ADMIN` (or any role with the `instructions:create` capability declared in `ops-roles` once it lands). For viewer-only roles the CTA is hidden — not disabled — to keep the page chrome clean. Clicking the CTA opens the Create modal with the contracted form; submitting saves the instruction plus its attributes atomically (see Requirement 6).

#### Scenario: ADMIN role sees the Crear CTA

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the page renders
- **THEN** the page header shows the `+ Crear instrucción` button; clicking it opens the Create modal

#### Scenario: VIEWER role does NOT see the Crear CTA

- **GIVEN** an authenticated user whose roles include `OPS_VIEWER` only
- **WHEN** the page renders
- **THEN** the page header renders the title `Instrucciones` and no Crear CTA; the table is read-only

#### Scenario: Per-row actions are gated identically

- **GIVEN** the table renders for an `OPS_VIEWER`
- **WHEN** the user opens a row's Acciones menu
- **THEN** the menu is empty (or hidden) — `Editar` and `Eliminar` only appear for users with the corresponding capabilities

### Requirement: The Create / Edit form MUST capture name, currency, description, and a dynamic attributes array

The form fields SHALL be: `Nombre` (text, required, unique within the OPS scope, max 60 chars), `Moneda` (lookup against the `ops.currencies` catalog, required), `Descripción` (textarea, optional, max 280 chars), `Atributos` (the new `key-value-array` field type from `core-forms`). Attribute rows SHALL declare `key_type = 'text'`, `value_type = 'text'` for v1, with `min_rows = 0` and `duplicate_key_policy = 'reject'` because the attribute key must be unique within an instruction. The form SHALL be validated through vee-validate + zod and SHALL surface field-level errors below each input per `core-forms`.

#### Scenario: Submit blocked while required fields are empty

- **GIVEN** a freshly opened Create modal
- **WHEN** the user clicks `Guardar` without filling `Nombre` or `Moneda`
- **THEN** the form does NOT submit; the missing fields show the canonical error message below the input; the submit button shows the disabled state

#### Scenario: Duplicate attribute keys are rejected synchronously

- **GIVEN** the user adds two attribute rows with `key = 'tax_id'`
- **WHEN** the user clicks `Guardar`
- **THEN** the duplicate row is flagged with the danger token; the form does NOT submit; an inline error reads `Las claves de atributo deben ser únicas`

#### Scenario: Edit modal pre-populates from the existing instruction + attributes

- **GIVEN** an existing instruction with `Nombre = "USD wire transfer"`, `Moneda = USD`, three attributes
- **WHEN** the user opens its Edit modal
- **THEN** the form fields render with those values pre-filled and the three attribute rows expanded; modifying any field marks the form `dirty` and enables `Guardar`

### Requirement: Save flow MUST orchestrate the two API calls atomically with a retry banner on partial failure

The legacy backend exposes `POST /instruction` (creates the instruction record) and `POST /instruction-attribute/save-all` (saves the attribute array as a separate batch). The client SHALL orchestrate both: phase A creates the instruction; on success, phase B saves the attributes for the new id. If phase A fails, the form surfaces an inline error on the field driving the failure (or a generic error toast for 5xx) and the user retries; if phase B fails after phase A succeeded, the modal SHALL stay open with a persistent banner reading `Instrucción creada pero los atributos no se pudieron guardar — reintentar` and a `Reintentar` button that re-issues phase B alone (the instruction id is preserved in component state). When phase B succeeds, the modal closes and the table refreshes via `@tanstack/vue-query` invalidation.

#### Scenario: Both phases succeed

- **GIVEN** a valid Create form submitted by `OPS_ADMIN`
- **WHEN** phase A returns 201 and phase B returns 200
- **THEN** the modal closes, a success toast `Instrucción creada` fires, the table refreshes, and the URL drops the `?detail=` query

#### Scenario: Phase A fails with a 422

- **GIVEN** the user submits a Create form with `Nombre` that already exists in the OPS scope
- **WHEN** phase A returns 422 with `{ field: 'name', message: 'Ya existe una instrucción con ese nombre' }`
- **THEN** the modal stays open; the `Nombre` field shows the inline error from the response; phase B is NOT issued

#### Scenario: Phase B fails after phase A succeeded — partial-failure banner

- **GIVEN** phase A returned 201 (instruction created with id `abc-123`) and phase B returns 5xx
- **WHEN** the orchestrator processes the failure
- **THEN** the modal stays open; an alert banner reads `Instrucción creada pero los atributos no se pudieron guardar — reintentar`; clicking `Reintentar` re-issues only phase B with the captured `abc-123`; once phase B returns 200, the modal closes and the table refreshes

### Requirement: The Detail modal MUST be the canonical read-only surface; the legacy `/view` route is absorbed

The Detail modal SHALL render the four fields read-only (`Nombre`, `Moneda`, `Descripción`, `Atributos` listed as a key-value table) plus metadata if present (created_at, updated_at, created_by). The footer SHALL include `Cerrar` (ghost) and `Editar` (primary) buttons; the latter is gated by the same role rules as the per-row Edit action. Opening the modal SHALL set `?detail=<id>` on the URL; closing it SHALL drop that query. Reloading the page with `?detail=<id>` SHALL re-open the Detail modal at that instruction.

#### Scenario: Detail modal renders the read-only field set

- **GIVEN** the user clicks a row to open the Detail modal
- **WHEN** the modal mounts
- **THEN** the four contracted fields render in read-only form (no inputs, no buttons inside the body); the footer shows `Cerrar` + `Editar`

#### Scenario: Detail-only deep link survives reload

- **GIVEN** the user opens the Detail modal for `abc-123` and reloads the page
- **WHEN** the page hydrates
- **THEN** the list renders, then the Detail modal opens automatically over the list with the data for `abc-123`; closing it returns the URL to `/instructions` with the same filter state

#### Scenario: Editar button transitions Detail → Edit

- **GIVEN** the Detail modal is open for `abc-123` and the user has `OPS_ADMIN`
- **WHEN** the user clicks `Editar` in the footer
- **THEN** the Detail modal closes and the Edit modal opens for `abc-123` with the pre-populated form per Requirement 5; the URL updates to `/instructions?edit=abc-123`

### Requirement: Eliminar action MUST use the destructive confirmation dialog and emit cache-invalidating refresh on success

The per-row `Eliminar` action SHALL trigger the destructive confirmation dialog from `core-modals` (narrow width, danger-accent, verb-specific label `Eliminar`, backdrop click does NOT dismiss, ESC closes as cancel-equivalent). The confirmation body SHALL read `Eliminar la instrucción "<name>" de la moneda <currency>?` with the instruction's name and currency interpolated. On confirm, `DELETE /instruction/<id>` is issued; on success the row is optimistically removed AND the `@tanstack/vue-query` cache is invalidated to re-fetch the page; on failure the row is restored AND a danger toast surfaces the error message.

#### Scenario: Confirm deletes the instruction and refreshes the list

- **GIVEN** an instruction `abc-123` named "USD wire transfer" with currency `USD`, and the user has `OPS_ADMIN`
- **WHEN** the user opens its Acciones menu, clicks `Eliminar`, and confirms in the destructive dialog
- **THEN** the row disappears optimistically; `DELETE /instruction/abc-123` returns 204; the cache invalidates and the list re-renders with the next page item shifted up; a success toast reads `Instrucción eliminada`

#### Scenario: Cancel keeps the row intact

- **GIVEN** the same flow, but the user clicks `Cancelar` (or presses ESC) in the confirmation dialog
- **WHEN** the dialog closes
- **THEN** no API call is issued; the row remains; no toast fires

#### Scenario: Backend rejects the deletion (e.g., row in use elsewhere)

- **GIVEN** the user confirms the deletion and `DELETE /instruction/abc-123` returns 409 with `{ message: 'En uso por 3 cuentas — desasocia primero' }`
- **WHEN** the orchestrator processes the failure
- **THEN** the optimistically-removed row is restored to its position; a danger toast reads the backend's message; the cache is NOT invalidated

### Requirement: Loading, empty, and error surfaces MUST follow the canonical `core-error-handling` patterns

The page SHALL render the shared `<Skeleton>` placeholder while the initial query is `isPending`. When the query resolves with `data: []` and no filters are active, the page SHALL render the shared `<EmptyState>` with the title `No hay instrucciones cargadas` and the description `Hacé click en "Crear instrucción" para empezar`. When `data: []` resolves WITH filters active, the EmptyState SHALL read `Sin resultados para los filtros aplicados` with a `Limpiar filtros` button as the action. Transient 5xx errors during a refetch SHALL surface the canonical retry toast (3 retries before giving up); 401 surfaces the auth banner per `core-auth`; 403 surfaces a persistent alert banner reading `No tenés permisos para gestionar instrucciones`.

#### Scenario: Initial loading shows the Skeleton

- **GIVEN** the user navigates to `/instructions` for the first time
- **WHEN** the query is `isPending`
- **THEN** the page renders the AppShell with the page header and a `<Skeleton>` placeholder in the table region; the filter row remains visible (controls disabled until the data lands)

#### Scenario: EmptyState differs by filter state

- **GIVEN** the API returns `data: []`
- **WHEN** there are no active filters
- **THEN** the EmptyState reads `No hay instrucciones cargadas` with the description encouraging the user to create one
- **WHEN** there are active filters
- **THEN** the EmptyState reads `Sin resultados para los filtros aplicados` with the `Limpiar filtros` action button

#### Scenario: 5xx during refetch surfaces the retry toast (no full-page error)

- **GIVEN** the table is showing a populated page and a debounced filter triggers a refetch
- **WHEN** the API returns 503
- **THEN** the previous data stays visible; a danger toast surfaces with the canonical message; up to 3 silent retries are attempted; on persistent failure the toast becomes a persistent banner asking the user to refresh
