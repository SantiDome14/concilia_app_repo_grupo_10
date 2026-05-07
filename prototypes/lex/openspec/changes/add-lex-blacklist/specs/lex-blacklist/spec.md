## ADDED Requirements

### Requirement: Blacklist MUST be a top-level Sidebar entry at /blacklist

The Sidebar SHALL render a top-level entry labelled `Blacklist` reachable at `/blacklist`. Per `core-navigation` the entry MUST declare `meta.block`, `meta.breadcrumb`, and `meta.requiresAuth=true`. The legacy URL `/usuarios/blacklist` SHALL be registered in the router as a redirect to `/blacklist` so existing bookmarks keep working. The Sidebar entry MUST sit alongside Clientes, Altas, and Usuarios — not nested inside Usuarios.

#### Scenario: Sidebar exposes the entry

- **GIVEN** any authenticated user opens any Lex route
- **WHEN** the Sidebar renders
- **THEN** a top-level entry labelled `Blacklist` is visible and routes to `/blacklist`

#### Scenario: Legacy URL redirects

- **GIVEN** a user opens `/usuarios/blacklist`
- **WHEN** the router resolves
- **THEN** the URL is replaced with `/blacklist` and the Blacklist page renders

#### Scenario: Breadcrumb reads "Blacklist"

- **GIVEN** the user is on `/blacklist`
- **WHEN** the Topbar breadcrumb renders
- **THEN** the breadcrumb's terminal segment is `Blacklist`

---

### Requirement: Blacklist table MUST render the canonical column set

The Blacklist table SHALL render the columns: CUIT, Motivo, Fecha de carga, Cargado por, Acciones. CUIT SHALL render in monospace per `core-data-tables` Requirement "Every record-list table MUST render a leftmost monospaced ID column that is never user-hidden". The table MUST use `@tanstack/vue-query` for server-side pagination at the canonical page sizes `10 / 25 / 50 / 100`, defaulting to `25`. The L3 filter bar SHALL include exactly two inputs: CUIT (text, debounced 300 ms) and Rango de fechas (single picker writing `from` / `to` to the URL).

#### Scenario: Default rendering

- **GIVEN** an ADMIN_LEX user navigates to `/blacklist` with seeded data
- **WHEN** the page mounts
- **THEN** the columns appear in order CUIT, Motivo, Fecha de carga, Cargado por, Acciones, with CUIT in monospace

#### Scenario: CUIT filter is debounced

- **GIVEN** the user types `2012345` in the CUIT filter
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /blacklist?tax_number=2012345` request fires

#### Scenario: Empty state copy

- **GIVEN** the response is an empty array
- **WHEN** the table renders
- **THEN** `EmptyState` is shown with title `Sin entradas` and description `No hay CUITs en la blacklist con los filtros aplicados`

---

### Requirement: Adding a CUIT MUST validate format and immutability post-create

The `Agregar CUIT` CTA in the L1 page header SHALL open a Create modal collecting `tax_number` (CUIT, exactly 11 numeric digits) and `motivo` (text, max 500 characters). Validation SHALL be enforced via vee-validate + zod per `core-forms`. On submit the page SHALL call `POST /blacklist`. After creation, the CUIT SHALL NOT be editable — only `motivo` is editable in subsequent flows. The `Agregar CUIT` CTA MUST be hidden for `VIEWER_LEX` users per `lex-roles`.

#### Scenario: Invalid CUIT blocks submission

- **GIVEN** the modal is open with `tax_number='2012345'` (7 digits)
- **WHEN** the user attempts to submit
- **THEN** the submit button stays disabled, an inline error reads `CUIT debe tener 11 dígitos`, and no `POST /blacklist` request is fired

#### Scenario: Duplicate CUIT is rejected by the backend

- **GIVEN** the CUIT `20123456789` already exists in the blacklist
- **WHEN** the user submits the form
- **THEN** the backend returns 409, the modal stays open, and a toast surfaces with title `CUIT duplicado` and description `Ese CUIT ya está en la blacklist`

#### Scenario: Edit modal cannot mutate the CUIT field

- **GIVEN** an existing entry with `tax_number='20123456789'` is opened in the Edit modal
- **WHEN** the modal renders
- **THEN** the CUIT field is read-only (disabled with the legacy value visible) and only the Motivo input is editable

---

### Requirement: Bulk import MUST accept CSV/XLSX, validate per row, and report results

The L1 page header SHALL expose an `Importar masivo` CTA that opens the `BulkBlacklistModal`. The modal SHALL accept a single CSV or XLSX file via drag-and-drop or file picker. The file SHALL be parsed in the browser and previewed before submission, marking each row as `aceptable` (valid CUIT + motivo) or `rechazado` (with the reason). Submission SHALL call `POST /blacklist/bulk` with the accepted entries. The response SHALL include counts of `created`, `skipped` (duplicates), and `errors`; the modal SHALL render those counts and surface a toast `Importación completada`. The CTA MUST be hidden for `VIEWER_LEX` and `COMMERCIAL_LEX` users per `lex-roles`.

#### Scenario: Valid CSV preview surfaces accepted and rejected rows

- **GIVEN** a CSV with three rows: two valid, one with a 9-digit CUIT
- **WHEN** the file is dropped into the modal
- **THEN** the preview lists 2 rows under `Aceptables` and 1 row under `Rechazados` with the inline reason `CUIT debe tener 11 dígitos`

#### Scenario: Submission only sends accepted rows

- **GIVEN** the preview shows 2 acceptable + 1 rejected row
- **WHEN** the user clicks `Importar`
- **THEN** the request body of `POST /blacklist/bulk` contains exactly 2 entries; the rejected row is not sent

#### Scenario: Duplicate handling on bulk

- **GIVEN** the backend returns `{ created: 1, skipped: 1, errors: [] }`
- **WHEN** the response surfaces
- **THEN** the modal shows `1 creado · 1 omitido (duplicado)` and the success toast reads `Importación completada`

#### Scenario: Bulk import surfaces row-level errors after submit

- **GIVEN** the backend returns `{ created: 1, skipped: 0, errors: [{ row: 2, message: 'CUIT invalido' }] }`
- **WHEN** the response surfaces
- **THEN** the modal shows the per-row error list with the offending row indices and a re-try is offered for the failed rows only

---

### Requirement: Deleting a CUIT MUST go through the destructive confirmation pattern

The Acciones menu per row SHALL expose `Eliminar`. Triggering it SHALL open a destructive confirmation dialog per `core-modals` Requirement "Confirmation dialogs MUST follow the destructive action pattern" with the danger-accent header, the legacy CUIT shown in the body, the verb-specific action label `Eliminar`, ghost `Cancelar` on the left, danger-variant `Eliminar` on the right. Confirmation SHALL fire `DELETE /blacklist/:id`. Success SHALL invalidate `['lex','blacklist']` and surface toast `CUIT eliminado de la blacklist`. The Eliminar action MUST be hidden for `VIEWER_LEX` and `COMMERCIAL_LEX` per `lex-roles`.

#### Scenario: Confirmation dialog shows the CUIT being deleted

- **GIVEN** an ADMIN_LEX user clicks `Eliminar` on the entry whose CUIT is `20123456789`
- **WHEN** the dialog opens
- **THEN** the dialog body contains the literal string `20123456789` and the action label is `Eliminar`

#### Scenario: Confirmed deletion succeeds

- **GIVEN** the dialog is open and the user clicks `Eliminar`
- **WHEN** `DELETE /blacklist/:id` returns 204
- **THEN** the dialog closes, the row disappears, the `['lex','blacklist']` query refetches, and a toast `CUIT eliminado de la blacklist` is shown

#### Scenario: Eliminar hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user opens the row Acciones menu
- **WHEN** the menu renders
- **THEN** the `Eliminar` item is not present
