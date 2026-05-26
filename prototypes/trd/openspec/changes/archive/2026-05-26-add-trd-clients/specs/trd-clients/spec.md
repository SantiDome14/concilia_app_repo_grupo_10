## ADDED Requirements

### Requirement: The Clientes page MUST be a Type-A master list registered at `/clients`

The page SHALL be implemented at `src/pages/Clients.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Clientes'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title `Clientes`, no CTA in v1), L3 single search input, paginated table, footer with page-size selector and ellipsis pagination. The detail surface for an individual client SHALL be a separate Type-B page (see the detail Requirement below) — modals MUST NOT be used.

#### Scenario: Authenticated navigation to `/clients` renders the Type-A shell

- **GIVEN** an authenticated TRD user
- **WHEN** the user navigates to `/clients`
- **THEN** the page renders inside the AppShell (Sidebar + Topbar + Main), the L1 header shows the title `Clientes`, the L3 search input is visible below, and the table renders with the canonical columns

#### Scenario: Sidebar surfaces Clientes under the Catálogos block

- **GIVEN** the TRD sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block whose first entry is `Clientes` linking to `/clients`; the entry shows the active style when the route name is `clients` (the master). The detail route (`client-detail`) does NOT light up the sidebar entry; this mirrors the OPS Catálogos convention and is acceptable for v1 — a future `extend-core-navigation-nested-active` change MAY broaden the active match to cover nested detail routes across all apps.

#### Scenario: Route is auth-gated

- **GIVEN** an unauthenticated user
- **WHEN** the user attempts to visit `/clients` directly
- **THEN** the auth guard redirects to `/login`; after successful login the user lands on `/clients`

---

### Requirement: The list MUST expose `Nombre`, `Legajo Ardua`, and `Estado` columns; row click navigates to detail

The table SHALL render the columns in this order: `Nombre`, `Legajo Ardua`, `Estado`. `Nombre` is left-aligned, `Legajo Ardua` left-aligned with a monospaced font, `Estado` renders as a tone-coloured badge — `success` tone label `Activo` when `is_active === true`, `neutral` tone label `Inactivo` when `is_active === false`. Clicking anywhere on a row SHALL navigate to `/clients/:id`. The master list MUST NOT expose a per-row actions popover in v1 — the only row affordance is the navigation. Empty cells SHALL render as `—` (em-dash), not as empty space.

#### Scenario: Row click navigates to the detail page

- **GIVEN** the Clientes list is rendered with at least one row
- **WHEN** the user clicks any cell in a row representing client `abc-123`
- **THEN** the router pushes `/clients/abc-123` and the detail page mounts

#### Scenario: Estado badge tones reflect is_active

- **GIVEN** two rows where one client is active and the other is inactive
- **WHEN** the list is rendered
- **THEN** the active row's `Estado` cell shows a `success`-tone badge labelled `Activo` and the inactive row's `Estado` cell shows a `neutral`-tone badge labelled `Inactivo`

#### Scenario: Missing values render as em-dash

- **GIVEN** a client whose `ardua_docket` is `null` in the API response
- **WHEN** the row is rendered
- **THEN** the `Legajo Ardua` cell shows `—` and does NOT crash the row render

---

### Requirement: A single search input MUST filter the list by `name` OR `ardua_docket` via a server-side `?q=` query

The L3 surface SHALL render exactly one search input with the placeholder `Buscar por nombre o legajo...`. The input SHALL debounce 300 ms on keystroke and, on commit, issue `GET /clients?q=<term>&page=<n>&pageSize=<m>`. The backend (real or MSW) SHALL match `q` against `name` (case-insensitive substring) OR `ardua_docket` (case-insensitive substring) and return the union, deduplicated by `id`. When `q` is empty the query MUST omit the parameter entirely (not send `?q=`). The legacy pattern of two parallel queries with client-side deduplication is forbidden.

#### Scenario: Typing in the search input debounces before firing the request

- **GIVEN** the Clientes list is loaded and the search input is empty
- **WHEN** the user types `acme` in 200 ms
- **THEN** no `GET /clients` request fires until 300 ms after the last keystroke; then exactly one request is fired with `?q=acme&page=1&pageSize=<current>`

#### Scenario: Search matches both name and ardua_docket

- **GIVEN** the seed contains a client `ACME S.A.` with `ardua_docket = 21548` and a client `Tequila Co.` with `ardua_docket = 11243-ACME-INVOICE`
- **WHEN** the user searches `acme`
- **THEN** the response contains both clients exactly once (deduplicated)

#### Scenario: Clearing the search restores the full paginated list

- **GIVEN** an active search `?q=acme` returning 2 results
- **WHEN** the user clears the input
- **THEN** the request fires without `q` and the full first page reappears

---

### Requirement: List filters, page, and page-size MUST be URL-synced and survive back-navigation

The page SHALL reflect three pieces of state in the URL query string: `q`, `page`, `pageSize`. Any state change SHALL replace the URL via `router.replace` (not `push`) so the browser back/forward stack does not balloon. The page MUST initialize its state from the URL on first mount. When the user navigates to `/clients/:id` and clicks the browser back button, the master list SHALL re-mount with the exact same `q`, `page`, and `pageSize` it had when the user left.

#### Scenario: URL reflects active filters

- **GIVEN** the user has searched `acme`, is on page 2, with page-size 25
- **WHEN** the URL is inspected
- **THEN** it reads `/clients?q=acme&page=2&pageSize=25`

#### Scenario: Direct navigation to a URL with filters renders the filtered list

- **GIVEN** the user pastes `/clients?q=acme&page=2&pageSize=25` into the address bar
- **WHEN** the page mounts
- **THEN** the search input shows `acme`, the table is on page 2, the page-size selector shows `25`, and the API request fires with those params

#### Scenario: Back-navigation from detail restores list state

- **GIVEN** the user is on `/clients?q=acme&page=2` and clicks a row
- **WHEN** the user arrives on the detail page and presses the browser Back button
- **THEN** the master list re-mounts at `/clients?q=acme&page=2` with the same filters and scroll position

---

### Requirement: The page-size selector MUST offer `10 · 25 · 50 · 100` and persist the choice in `localStorage`

The footer SHALL render a page-size selector with exactly four options — `10`, `25`, `50`, `100`. The default on first session SHALL be `25`. The selected value MUST persist in `localStorage` via a new composable `usePersistedPageSize(key, default)` created by this change under `src/composables/usePersistedPageSize.ts`, keyed by `trd.clients.pageSize`. The page-size choice MUST also be reflected in the URL (`?pageSize=`) so URL sharing carries the intent; on conflict between URL and `localStorage`, the URL wins.

#### Scenario: Page-size persists across reloads

- **GIVEN** the user changes the page-size from `25` to `50`
- **WHEN** the user reloads the page (without query params for pageSize)
- **THEN** the page-size selector shows `50` and the table renders 50 rows

#### Scenario: URL pageSize overrides localStorage on cold load

- **GIVEN** the user has `localStorage.trd.clients.pageSize = '50'` and visits `/clients?pageSize=10`
- **WHEN** the page mounts
- **THEN** the page-size selector shows `10`, the table renders 10 rows, and `localStorage` is updated to `10`

---

### Requirement: The detail page MUST be a Type-B page registered at `/clients/:id` with three read-only sections

The page SHALL be implemented at `src/pages/ClientDetail.vue` and registered with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Cliente'`, `meta.block = 'Catálogos'`. The composition SHALL follow the Type-B pattern from `core-module-types`: L1 header (back-affordance, title = client `name`, status pill `Activo`/`Inactivo`), then three stacked sections in this order — `Información`, `Límites`, `Balances`. Every section is read-only in v1; no buttons MUST mutate state.

#### Scenario: Direct navigation to a valid client id renders all three sections

- **GIVEN** the seed contains client `abc-123` with name `ACME S.A.`, active, with at least one limit and one balance
- **WHEN** the user navigates to `/clients/abc-123`
- **THEN** the page renders with the L1 header showing `ACME S.A.` and an `Activo` pill, and the three sections `Información`, `Límites`, `Balances` are visible in order

#### Scenario: Direct navigation to an unknown client id shows an EmptyState, not a crash

- **GIVEN** no client with id `does-not-exist` is in the seed
- **WHEN** the user navigates to `/clients/does-not-exist`
- **THEN** the page renders an `EmptyState` with the message `Cliente no encontrado` and a button labelled `Volver a Clientes` that pushes `/clients`

#### Scenario: Back-navigation returns to the master list

- **GIVEN** the user is on `/clients/abc-123`
- **WHEN** the user clicks the back-affordance in the L1 header
- **THEN** the router pushes `/clients` (preserving any prior `q` / `page` / `pageSize` state via the back-state pattern from Requirement above)

---

### Requirement: The `Información` section MUST render `id`, `name`, `ardua_docket`, `circuit_docket`, and `is_active`

The section SHALL render a card with a 2-column layout (label-left, value-right). Fields SHALL be displayed in this order: `ID`, `Nombre`, `Legajo Ardua`, `Legajo Circuit`, `Estado`. Values that are `null` or empty MUST render as `—`. `Estado` SHALL re-render the same `Activo` / `Inactivo` badge used in the list.

#### Scenario: Information card renders all five fields with labels

- **GIVEN** the user is on `/clients/abc-123` for a fully-populated client
- **WHEN** the `Información` section renders
- **THEN** five labelled rows are visible — `ID`, `Nombre`, `Legajo Ardua`, `Legajo Circuit`, `Estado` — with the values right-aligned, and `Estado` shows the same badge component used in the list

#### Scenario: Null fields render as em-dash

- **GIVEN** client `abc-123` has `circuit_docket = null`
- **WHEN** the section renders
- **THEN** the `Legajo Circuit` row's value is `—`

---

### Requirement: The `Límites` section MUST render per-entity / per-currency limits from `GET /clients/:id/limits`

The section SHALL fetch `GET /clients/:id/limits` via `useClientLimits(id)` and render the result as a table with columns `Entidad · Moneda · Límite · Disponible · Usado`. When the response is an empty array the section MUST render an `EmptyState` with the message `Sin límites configurados`. When the request fails with a 5xx error the section MUST render an inline retry banner with a `Reintentar` button that re-invokes the query; the rest of the page (Información, Balances) MUST continue to render.

#### Scenario: Limits table renders the rows from the API

- **GIVEN** client `abc-123` has 3 limits in the seed (2 currencies, 2 entities)
- **WHEN** the detail page mounts
- **THEN** the `Límites` table renders 3 rows with the canonical columns and the totals are right-aligned

#### Scenario: Empty limits surface as EmptyState

- **GIVEN** client `abc-123` has no limits in the seed
- **WHEN** the detail page mounts
- **THEN** the section shows an `EmptyState` with the message `Sin límites configurados` and no table is rendered

#### Scenario: Limits 5xx error renders inline retry without breaking the rest of the page

- **GIVEN** the MSW handler is configured to return 500 for `/clients/abc-123/limits`
- **WHEN** the detail page mounts
- **THEN** the `Límites` section shows an inline error banner with a `Reintentar` button; the `Información` and `Balances` sections render normally

---

### Requirement: The `Balances` section MUST render per-currency balances from `GET /clients/:id/balances`

The section SHALL fetch `GET /clients/:id/balances` via `useClientBalances(id)` and render the result as a table with columns `Moneda · Balance · Última actualización`. The `Última actualización` value SHALL be formatted via the project's `formatDateTime` helper (UTC display, locale-aware). When the response is empty the section MUST render an `EmptyState` with the message `Sin balances disponibles`. 5xx error handling mirrors the `Límites` section (inline retry banner).

#### Scenario: Balances table renders rows from the API

- **GIVEN** client `abc-123` has 4 currency balances in the seed
- **WHEN** the detail page mounts
- **THEN** the `Balances` table renders 4 rows with the canonical columns and the `Balance` column is right-aligned

#### Scenario: Empty balances surface as EmptyState

- **GIVEN** client `abc-123` has no balances in the seed
- **WHEN** the detail page mounts
- **THEN** the section shows an `EmptyState` with the message `Sin balances disponibles`

---

### Requirement: The API module MUST live at `src/api/modules/clients.ts` and own four endpoints

The module SHALL expose four typed functions consumed by the page components and the composables:

- `listClients(filters: { q?: string; page: number; pageSize: number }): Promise<PaginatedResponse<Client>>` — calls `GET /clients`.
- `getClient(id: string): Promise<Client>` — calls `GET /clients/:id`.
- `getClientLimits(id: string): Promise<ClientLimit[]>` — calls `GET /clients/:id/limits`.
- `getClientBalances(id: string): Promise<ClientBalance[]>` — calls `GET /clients/:id/balances`.

All paths SHALL be declared in `src/api/endpoints.ts` under `ENDPOINTS.clients.{list, detail, limits, balances}` — paths MUST NOT be hardcoded elsewhere. Non-2xx responses surface as `ApiError` instances via the existing axios response interceptor (`src/api/client.ts`); consumers branch on `err.isNotFound` / `err.isServerError` per `core-api-layer`.

#### Scenario: listClients sends q, page, and pageSize as query parameters

- **GIVEN** a caller invokes `listClients({ q: 'acme', page: 2, pageSize: 25 })`
- **WHEN** the request is dispatched
- **THEN** the URL is `GET /clients?q=acme&page=2&pageSize=25`

#### Scenario: getClient throws ApiError on 404

- **GIVEN** the backend returns a 404 response for `GET /clients/does-not-exist`
- **WHEN** `getClient('does-not-exist')` is invoked
- **THEN** the function throws `ApiError` with `isNotFound === true` and the page renders the `Cliente no encontrado` empty-state

---

### Requirement: The MSW seed MUST ship at least 30 fixtures covering active/inactive, with limits and balances

`src/mocks/seed/clients.ts` SHALL export a mutable `clientsSeed: Client[]` array of at least 30 entries, of which at least 5 are `is_active = false`. Each fixture MUST have a stable `id`, a `name`, an `ardua_docket`, and optionally a `circuit_docket`. The seed MUST also export `clientLimitsSeed` (limits keyed by client id) and `clientBalancesSeed` (balances keyed by client id) such that at least 20 clients have non-empty limits, at least 20 clients have non-empty balances, and at least 5 clients have neither (so the EmptyState surface is exercised). A `resetClientsSeed()` helper MUST be exported and called from `src/mocks/seed/index.ts`.

#### Scenario: Seed exports 30+ clients with the required mix

- **GIVEN** `import { clientsSeed } from '@/mocks/seed/clients'`
- **WHEN** the array is inspected
- **THEN** `clientsSeed.length >= 30` and `clientsSeed.filter((c) => c.is_active === false).length >= 5`

---

### Requirement: The MSW handler MUST implement `?q=` OR semantics, pagination, and 5xx fault injection on a debug flag

`src/mocks/handlers/clients.ts` SHALL handle four routes via `apiPath(ENDPOINTS.clients.*)`:

- `GET /clients` — applies `q` server-side as case-insensitive substring match across `name` OR `ardua_docket`; paginates by `page` and `pageSize`; returns the canonical `PaginatedResponse<Client>` envelope `{ data: Client[], pagination: { page, pageSize, total, totalPages } }`.
- `GET /clients/:id` — looks up the seed; 404 if not found.
- `GET /clients/:id/limits` — returns the limits keyed by client id; empty array if none.
- `GET /clients/:id/balances` — returns the balances keyed by client id; empty array if none.

The handler MUST honour the cross-app `MSW_FAULT_INJECT` debug flag — when set to `clients:limits-5xx` the limits handler returns 500 for `?fault=on`, used by component tests to exercise the retry banner.

#### Scenario: Handler q-filter matches name and docket

- **GIVEN** the seed contains a client with `name = 'ACME S.A.'` and another with `ardua_docket = '11243-ACME-INVOICE'`
- **WHEN** a request `GET /clients?q=acme` arrives
- **THEN** the response `items` array contains both clients exactly once, sorted by `name`

#### Scenario: Handler 404 on unknown id

- **GIVEN** no client with id `does-not-exist` is in the seed
- **WHEN** a request `GET /clients/does-not-exist` arrives
- **THEN** the response is `404` with body `{ error: 'CLIENT_NOT_FOUND' }`

---

### Requirement: Loading and empty surfaces MUST use the canonical `<Skeleton>` and `<EmptyState>` components

While `listClients` is loading the table area SHALL render a `<Skeleton>` matching the shape of the data table (header + 5 row placeholders). While `getClient` is loading the detail page SHALL render a `<Skeleton>` matching the L1 header + three section cards. When the list is loaded but empty (no clients matched `q`) the table area SHALL render `<EmptyState>` with the message `No se encontraron clientes` and a contextual hint depending on whether `q` is active. Both `Skeleton` and `EmptyState` come from `src/components/feedback/`.

#### Scenario: Empty search renders EmptyState with hint

- **GIVEN** the user searches `qzx` and the response items array is empty
- **WHEN** the table area renders
- **THEN** the `EmptyState` shows the message `No se encontraron clientes` and the hint `Probá ajustar la búsqueda.`

#### Scenario: First load shows Skeleton

- **GIVEN** the user navigates to `/clients` for the first time
- **WHEN** the `listClients` query is in flight
- **THEN** the table area renders the `<Skeleton>` shape (header + 5 row placeholders) — NOT a blank screen — until the response resolves

---

### Requirement: Coverage of `src/api/modules/clients.ts` and the page components MUST be ≥ 90 %

Unit tests SHALL cover every function in `src/api/modules/clients.ts` along the happy path plus at least one error path each (404 / 5xx / parse). The page-level component test for `Clients.vue` SHALL cover: initial render, search-and-debounce, URL sync, row click navigation, empty state. The page-level component test for `ClientDetail.vue` SHALL cover: initial render of all three sections, 404 EmptyState, Límites 5xx inline retry. Coverage of these three artefacts (the api module + the two pages) SHALL be ≥ 90 % line coverage by `vitest --coverage`.

#### Scenario: Coverage report meets the threshold

- **GIVEN** the test suite has run with `--coverage`
- **WHEN** the report is generated
- **THEN** lines covered for `src/api/modules/clients.ts`, `src/pages/Clients.vue`, and `src/pages/ClientDetail.vue` are each ≥ 90 %
