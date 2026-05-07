## ADDED Requirements

### Requirement: Page MUST expose four sub-tabs with conditional Límites visibility

The page SHALL render four sub-tabs in this order: `detalles` (default), `actividad`, `documentos`, `limites`. The `limites` tab SHALL be visible only when the Cliente record has a non-null `circuit_docket` OR `haz_docket` (per `discoveries/lex-discovery.md` §4.7). When the Cliente has neither docket, the `limites` tab SHALL NOT render and any `?tab=limites` deep link SHALL silently fall back to `?tab=detalles`. The sub-tab segmenter MUST use the same shadcn-vue Segmenter component used elsewhere in the app per `core-layout`.

#### Scenario: Cliente with circuit_docket exposes the Límites tab

- **GIVEN** a Cliente whose `circuit_docket` is `CIR-1234` and `haz_docket` is `null`
- **WHEN** the page mounts
- **THEN** the segmenter renders four tabs and `Límites` is reachable

#### Scenario: Cliente without dockets hides the Límites tab

- **GIVEN** a Cliente whose `circuit_docket` and `haz_docket` are both `null`
- **WHEN** the page mounts
- **THEN** the segmenter renders three tabs (`Detalles`, `Actividad`, `Documentos`) and `Límites` is not present

#### Scenario: Deep link to ?tab=limites on a Cliente without dockets falls back

- **GIVEN** the Cliente has no Circuit or Haz docket
- **WHEN** the user opens `/clientes/c-1?tab=limites`
- **THEN** the URL is rewritten in place to `/clientes/c-1?tab=detalles` and the Detalles tab is active

---

### Requirement: Active tab MUST be persisted via the ?tab= query parameter

The active sub-tab SHALL be serialized to the URL query parameter `?tab=` using the canonical lowercase identifiers `detalles`, `actividad`, `documentos`, `limites`. Switching tabs SHALL `replace` the history entry (not `push`) so the browser Back button returns to the previous page rather than the previous tab. Reloads SHALL restore the same tab. Unknown values for `?tab=` SHALL fall back to `detalles` without surfacing an error.

#### Scenario: Reload restores the active tab

- **GIVEN** the user is on `/clientes/c-1?tab=documentos`
- **WHEN** the user hard-reloads the page
- **THEN** the Documentos tab is the active sub-tab after the page hydrates

#### Scenario: Tab switch uses replace, not push

- **GIVEN** the user navigates `/clientes` → `/clientes/c-1?tab=detalles` → switches to `actividad`
- **WHEN** the user clicks the browser Back button
- **THEN** the URL becomes `/clientes`, not `/clientes/c-1?tab=detalles`

#### Scenario: Unknown ?tab= value falls back to detalles

- **GIVEN** the user opens `/clientes/c-1?tab=foo`
- **WHEN** the page mounts
- **THEN** the URL is rewritten to `/clientes/c-1?tab=detalles` and no toast or alert is shown

---

### Requirement: Actividad and Documentos tabs MUST enforce the lex-roles gating

Per `lex-roles` Requirement "COMMERCIAL_LEX MUST be denied access to the Actividad and Documentos tabs", users whose effective role set is exactly `{COMMERCIAL_LEX}` (without `ADMIN_LEX`) SHALL see an "Acceso restringido" placeholder for those tabs. The placeholder SHALL replace the tab body content and the page MUST NOT fire any data fetch for the restricted tab (`GET /document` and `GET /activity` are not requested). The tab triggers themselves SHALL remain visible so the user knows the tabs exist and that access is restricted, not missing.

#### Scenario: COMMERCIAL_LEX sees the placeholder on Actividad

- **GIVEN** a user with roles `['COMMERCIAL_LEX']` opens `/clientes/c-1?tab=actividad`
- **WHEN** the page mounts
- **THEN** the Actividad tab body shows the "Acceso restringido" placeholder; no `GET /activity` request is fired

#### Scenario: ADMIN_LEX has full access regardless of COMMERCIAL_LEX

- **GIVEN** a user with roles `['COMMERCIAL_LEX', 'ADMIN_LEX']` opens `/clientes/c-1?tab=documentos`
- **WHEN** the page mounts
- **THEN** the Documentos tab loads its data normally and the placeholder is not shown

#### Scenario: Tab triggers stay visible for restricted users

- **GIVEN** a COMMERCIAL_LEX user is on `/clientes/c-1?tab=detalles`
- **WHEN** the segmenter renders
- **THEN** all four tab triggers are visible (Detalles, Actividad, Documentos, plus Límites if applicable); restriction is enforced on body, not on triggers

---

### Requirement: Back navigation MUST resolve to /clientes with the segment matching the Cliente status

The L1 page header SHALL render a back button. The button target SHALL always be `/clientes` with a `?segment=` parameter derived from the loaded Cliente's `status`: `PENDING_REVIEW → segment=pendientes`, `APPROVED → segment=activos`, `DEACTIVATED → segment=inactivos`. While the Cliente record is still loading, the back button SHALL fall back to `/clientes` with no segment (which itself defaults to `Activos` per `lex-clientes`). No `sessionStorage` key is read or written — the legacy `lex.clientDetailSource` marker pattern is removed because `/altas` and `/clientes` are now a single page differentiated by segment.

#### Scenario: Cliente in PENDING_REVIEW resolves back to Pendientes

- **GIVEN** the loaded Cliente has `status='PENDING_REVIEW'`
- **WHEN** the user clicks the back button on `/clientes/c-1`
- **THEN** the navigation target is `/clientes?segment=pendientes`

#### Scenario: Cliente in APPROVED resolves back to Activos

- **GIVEN** the loaded Cliente has `status='APPROVED'`
- **WHEN** the user clicks the back button
- **THEN** the navigation target is `/clientes?segment=activos`

#### Scenario: Back button before Cliente loads falls back to default

- **GIVEN** the user pasted `/clientes/c-1` directly and the `GET /client/:id` request is still in flight
- **WHEN** the user clicks the back button
- **THEN** the navigation target is `/clientes` (no segment parameter; `lex-clientes` defaults to `Activos`)

---

### Requirement: Breadcrumb MUST integrate with useBreadcrumb() and show the client name

The page SHALL call `useBreadcrumb()` on mount with `setClientName(client.name)` once the Cliente record is loaded, so the Topbar breadcrumb (per `core-navigation` Requirement "Topbar MUST render a breadcrumb derived from route meta") renders `Clientes › <client.name>`. The breadcrumb SHALL clear via `clearClientName()` on `onBeforeUnmount` so other pages do not inherit a stale Cliente name. Until the Cliente record loads, the breadcrumb SHALL render `Clientes › Cargando…`.

#### Scenario: Breadcrumb fills with the loaded client name

- **GIVEN** the page mounts for client `c-1` whose name is `Acme Corp`
- **WHEN** the `GET /client/c-1` response arrives
- **THEN** the Topbar breadcrumb renders `Clientes › Acme Corp`

#### Scenario: Breadcrumb shows loading copy before the response

- **GIVEN** the page is mounting and `GET /client/c-1` is still in flight
- **WHEN** the Topbar breadcrumb renders during the wait
- **THEN** the breadcrumb shows `Clientes › Cargando…`

#### Scenario: Breadcrumb clears on unmount

- **GIVEN** the breadcrumb shows `Clientes › Acme Corp`
- **WHEN** the user navigates back to `/clientes`
- **THEN** the breadcrumb on the next page renders without `Acme Corp` (the composable cleared on unmount)

---

### Requirement: Page MUST surface 404 cleanly when the Cliente does not exist

When `GET /client/:id` returns 404, the page SHALL render the shared `EmptyState` component (per `core-error-handling`) with title `Cliente no encontrado` and a CTA `Volver a Clientes` that navigates to `/clientes`. No tab content SHALL render. The breadcrumb SHALL remain at `Clientes › Cargando…` until the user navigates away.

#### Scenario: Unknown id renders the EmptyState

- **GIVEN** the user opens `/clientes/c-does-not-exist`
- **WHEN** the API responds 404
- **THEN** the page body shows `EmptyState` with title `Cliente no encontrado` and the CTA button `Volver a Clientes`

#### Scenario: 404 does not auto-redirect

- **GIVEN** the page shows the `Cliente no encontrado` empty state
- **WHEN** 5 seconds elapse without user action
- **THEN** the URL stays at `/clientes/c-does-not-exist` and no automatic redirect fires

---

### Requirement: Detalles tab MUST consolidate identity, dockets, onboarding, relaciones, and similarity warnings

The Detalles tab body SHALL be composed of clearly labelled sub-sections in this top-to-bottom order: (1) Identidad — name, CUIT, type (PARTICULAR / COMPANY / BENEFICIARY), status badge; (2) Dockets — Ardua, Circuit, Haz with empty placeholders for missing values; (3) Onboarding — template (per `lex-templates` Requirement "Cliente detalle MUST render the template inside the Onboarding section"), AIPrise identifier, link to AIPrise dashboard; (4) Relaciones — beneficiarios, cotitulares, agrupadores, sociedades, with the relationship pickers governed by `lex-relaciones`; (5) Advertencias de similitud — only when status is `PENDING_REVIEW` AND `metadata.similarity_warnings[]` is non-empty.

#### Scenario: Sections render in canonical order

- **GIVEN** an ADMIN_LEX user opens `/clientes/c-1?tab=detalles` for an APPROVED COMPANY with three dockets and a single beneficiary
- **WHEN** the tab renders
- **THEN** the section order is Identidad → Dockets → Onboarding → Relaciones; Advertencias de similitud is not rendered (status is APPROVED)

#### Scenario: Similarity warnings render only for PENDING_REVIEW

- **GIVEN** a Cliente with `status='PENDING_REVIEW'` and two entries in `metadata.similarity_warnings`
- **WHEN** the Detalles tab renders
- **THEN** the Advertencias de similitud section appears at the bottom listing the two warnings, each with name, similarity score, and a "Ver legajo existente" link

#### Scenario: Similarity warnings hidden for APPROVED clients

- **GIVEN** a Cliente with `status='APPROVED'` whose backend payload still contains `metadata.similarity_warnings`
- **WHEN** the Detalles tab renders
- **THEN** the Advertencias de similitud section is not rendered
