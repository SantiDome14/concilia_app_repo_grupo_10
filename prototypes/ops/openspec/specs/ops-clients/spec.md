# ops-clients Specification

## Purpose
TBD - created by archiving change add-ops-clients. Update Purpose after archive.
## Requirements
### Requirement: The Clients page MUST be a Type-A master list registered at `/clients`

The page SHALL be implemented at `src/pages/Clients.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Clientes'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + primary CTA `Alta de Cliente en APP`), filter row, paginated table, footer with pagination ellipsis. The legacy path `/users` SHALL redirect to `/clients`. The detail surface for an individual client SHALL NOT be a modal; per `core-module-types`, dense detail surfaces (info card + accounts + movements) belong on a Type-B page (see Requirement 6).

#### Scenario: Authenticated navigation to `/clients` renders the Type-A page shell

- **GIVEN** an authenticated OPS user with role `OPS_ADMIN`
- **WHEN** the user navigates to `/clients`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main), the page header shows the title `Clientes` and the primary CTA `Alta de Cliente en APP`, and the filter row + paginated table render below

#### Scenario: Legacy /users URL redirects to /clients preserving filter query params

- **GIVEN** an authenticated user navigates to the legacy path `/users?name=acme&page=2`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/clients?name=acme&page=2` with the master list rendered and filters applied; no intermediate redirect screen is shown

#### Scenario: Sidebar surfaces the page under the `Catálogos` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block whose first entry is `Clientes` linking to `/clients`; the entry receives the active style when the route matches `/clients` or `/clients/:id`

### Requirement: The list MUST expose `CUIT/CUIL`, `Nombre`, `Email`, `Activo` and `Estado Portal` columns and surface row click as detail navigation

The table SHALL render the columns in this order: `CUIT/CUIL`, `Nombre`, `Email`, `Activo`, `Estado Portal`. `Activo` renders as a binary check/cross icon with semantic colour (`success` for active, `danger` for inactive). `Estado Portal` renders as a tone-coloured badge whose label and tone come from the helper defined in Requirement 5. Clicking anywhere on a row SHALL navigate to `/clients/:id`. The master list SHALL NOT expose a per-row Actions popover in v1 — the only row affordance is the navigation.

#### Scenario: Row click navigates to the detail page

- **GIVEN** the table renders 10 clients
- **WHEN** the user clicks anywhere on a row
- **THEN** the router navigates to `/clients/:id` where `:id` is the clicked client's `id`; the master list state (filters, page) is preserved when the user navigates Back

#### Scenario: The columns render in the contracted order with semantic colour for Activo

- **GIVEN** a client with `tax_number = '20-12345678-9'`, `name = 'ACME'`, `email = 'ops@acme.com'`, `is_active = true`, and portal status `ACTIVE`
- **WHEN** its row renders
- **THEN** the row shows the columns in order: `20-12345678-9` · `ACME` · `ops@acme.com` · success-toned check icon · success-toned `Cuenta Validada` badge

#### Scenario: Missing optional fields render as em-dash placeholders

- **GIVEN** a client with `tax_number = null` and `email = null`
- **WHEN** its row renders
- **THEN** the `CUIT/CUIL` and `Email` cells show `—` (em-dash); the row remains clickable to navigate to its detail

### Requirement: Filters MUST be debounced for text and immediate for select, with state surviving Back navigation

The filter row SHALL include a single `Nombre o legajo` combobox autocomplete (text + dropdown listing matching clients fetched from `/clients?name=...&limit=50`, debounced 300 ms; selecting a result applies the filter immediately by setting `?name=<value>` in the URL). A `Limpiar filtros` ghost button SHALL appear when at least one filter is active. The active filter state SHALL be reflected in the URL query so back-button navigation restores the filter set without a page reload. Per `core-data-tables`, the table's filter state (current page, page size, search, filters) is preserved across navigation away and back.

#### Scenario: Typing in the autocomplete debounces the lookup query by 300 ms

- **GIVEN** an empty filter row
- **WHEN** the user types `acme` quickly into the autocomplete input
- **THEN** the lookup API call fires once 300 ms after the last keystroke with `?name=acme&limit=50`; intermediate keystrokes do NOT trigger requests

#### Scenario: Selecting a client from the autocomplete applies the filter immediately

- **GIVEN** the autocomplete dropdown shows `ACME · 20-12345678-9` and 4 other matches
- **WHEN** the user clicks `ACME · 20-12345678-9`
- **THEN** the URL gains `?name=ACME` (or the canonical client name string), the autocomplete shows the selected chip, and the table reloads with the filtered results

#### Scenario: Back navigation restores the filters

- **GIVEN** the user has set `?name=ACME&page=2`, navigates to `/clients/<some-id>`, then navigates Back
- **WHEN** the user lands back on `/clients`
- **THEN** the URL still contains `?name=ACME&page=2`, the autocomplete reflects the selection, and the table shows the filtered page

### Requirement: The Header CTA `Alta de Cliente en APP` MUST open a SignUp modal gated by step-up authentication

The page header CTA `Alta de Cliente en APP` SHALL be visible only to users whose roles include `OPS_ADMIN` (or any role with the `clients:invite` capability declared in `ops-roles` once it lands). Clicking the CTA opens a centred modal that lets the operator pick exactly one client from a searchable list (filtered to clients whose `is_active = true` AND who do NOT yet have a portal user). The submit button SHALL invoke `useStepUp().withStepUp()` from `core-auth` BEFORE the `POST /sign-up` call; the request body is `{ external_client_id: <selected.external_client_id> }`. On success, a toast shows `Mail enviado correctamente a <email>`; on step-up rejection (user cancels MFA), the modal stays open and a non-destructive notice appears.

#### Scenario: ADMIN role sees the CTA and opens the SignUp modal

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the page renders and the user clicks `Alta de Cliente en APP`
- **THEN** the modal opens with a search input, an empty selected-client chip area, and a disabled `Enviar invitación` submit button until exactly one client is selected

#### Scenario: VIEWER role does NOT see the CTA

- **GIVEN** an authenticated user whose roles include `OPS_VIEWER` only
- **WHEN** the page renders
- **THEN** the page header renders the title `Clientes` and no CTA; the master list is read-only

#### Scenario: Submit triggers step-up MFA before POST /sign-up

- **GIVEN** the modal is open with one client selected (email `ops@acme.com`)
- **WHEN** the user clicks `Enviar invitación`
- **THEN** the frontend calls `useStepUp().withStepUp(() => apiClient.post('/sign-up', { external_client_id }))` — the Auth0 popup appears, the user completes MFA, the POST succeeds with the elevated token, and the toast shows `Mail enviado correctamente a ops@acme.com`

#### Scenario: Step-up cancellation keeps the modal open without sending the email

- **GIVEN** the modal is open with one client selected
- **WHEN** the user clicks `Enviar invitación` and cancels the Auth0 MFA popup
- **THEN** no `/sign-up` call is made, the modal stays open, the selected-client chip is preserved, and a non-destructive notice `Verificación cancelada` appears under the submit button

### Requirement: The `Estado Portal` column MUST derive its value from a single deterministic helper

A pure function `derivePortalStatus(client)` in `src/ops/clients/portal-status.ts` SHALL be the single source of truth for the column's label and tone. The function SHALL accept a `Client` and return `{ key: PortalStatus; label: string; tone: 'success' | 'warning' | 'danger' }` where `PortalStatus = 'active' | 'pending' | 'not-created'`. The mapping SHALL be: `metadata.status === 'ACTIVE'` → `{ key: 'active', label: 'Cuenta Validada', tone: 'success' }`; `metadata.status === 'PENDING'` → `{ key: 'pending', label: 'Pendiente de Validación', tone: 'warning' }`; otherwise → `{ key: 'not-created', label: 'Cuenta no Creada', tone: 'danger' }`. Every surface that needs the status (the master list cell, the detail page header subtitle, future filters, future CSV export) SHALL call this helper rather than duplicate the switch.

#### Scenario: ACTIVE status maps to success tone

- **GIVEN** a client with `metadata.status = 'ACTIVE'`
- **WHEN** `derivePortalStatus(client)` is called
- **THEN** it returns `{ key: 'active', label: 'Cuenta Validada', tone: 'success' }`

#### Scenario: PENDING status maps to warning tone

- **GIVEN** a client with `metadata.status = 'PENDING'`
- **WHEN** `derivePortalStatus(client)` is called
- **THEN** it returns `{ key: 'pending', label: 'Pendiente de Validación', tone: 'warning' }`

#### Scenario: Missing status maps to not-created with danger tone

- **GIVEN** a client with `metadata = null` OR `metadata.status` undefined OR `metadata.status = ''`
- **WHEN** `derivePortalStatus(client)` is called
- **THEN** it returns `{ key: 'not-created', label: 'Cuenta no Creada', tone: 'danger' }` for all three inputs

### Requirement: The `/clients/:id` detail page MUST be a Type-B surface composed of info card + accounts list + recent movements

The detail page SHALL be implemented at `src/pages/ClientDetail.vue` and registered at `/clients/:id` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, and a dynamic breadcrumb `Clientes / <client.name>`. Composition: a sticky `Volver a Clientes` back-link at the top, a client info card (header showing name, tax_number, docket, email, Activo badge, and the `Estado Portal` badge from the helper of Requirement 5), an `Accounts & Instructions` section (list of `<AccountCard>` per Requirement 7) with a section-level CTA `Whitelistar Cuenta` (per Requirement 8), and a `Recent Movements` section that renders a read-only table (no row click in v1; rows render with `cursor-default` and no hover effect) when `client.movements` is non-empty, otherwise the section is omitted.

#### Scenario: Successful load renders all sections

- **GIVEN** an authenticated user navigates to `/clients/abc-123`
- **WHEN** `GET /clients/abc-123` returns a client with 2 accounts and 5 recent movements
- **THEN** the page renders the back-link, the info card with the name + badges, an Accounts section with 2 `<AccountCard>` instances, and a Recent Movements section with the 5 rows; while the request is in flight a Skeleton placeholder for each section is shown

#### Scenario: Client with no movements omits the Recent Movements section

- **GIVEN** `GET /clients/abc-123` returns a client with `movements = []`
- **WHEN** the page renders
- **THEN** the Recent Movements section is NOT mounted; the layout collapses to info card + accounts only

#### Scenario: 404 from the API surfaces an error state with a back-link

- **GIVEN** an authenticated user navigates to `/clients/does-not-exist`
- **WHEN** `GET /clients/does-not-exist` returns 404
- **THEN** the page renders the back-link plus a centred `EmptyState` with title `Cliente no encontrado` and description `El cliente solicitado no existe o fue eliminado`; no other sections render

### Requirement: Each account MUST be expandable to show its instructions with `Copy` and `Letter` actions

The `<AccountCard>` SHALL render the account currency badge, the account number, the balance, and the count of bound `account_instructions[]`. Clicking the card header toggles its expanded state. When expanded, each `account_instruction` renders as an `<InstructionRow>` showing the `instruction_name`, the list of `fields[]` (each with `display` label and `value`), and two action buttons: `Copy` (writes to `navigator.clipboard` a multi-line summary; on success a `Copied!` toast appears) and `Letter` (opens the confirmation letter for that instruction per Requirement 9). The `Letter` button SHALL be hidden when the instruction has no `rails[]`.

#### Scenario: Card header click toggles expansion

- **GIVEN** an account card in collapsed state
- **WHEN** the user clicks the card header
- **THEN** the card expands showing its instructions; clicking the header again collapses it; the chevron icon rotates 180° on each toggle

#### Scenario: Copy writes the canonical summary to the clipboard

- **GIVEN** an expanded instruction with `instruction_name = 'BBVA Wire'` and fields `[{display: 'Account', value: '1234'}, {display: 'CBU', value: '00701234'}]`
- **WHEN** the user clicks the `Copy` action
- **THEN** `navigator.clipboard.writeText` receives the multi-line string `INSTRUCTION: BBVA Wire\n-------------------\nAccount: 1234\nCBU: 00701234`, and a `Copied!` toast appears

#### Scenario: Letter button is hidden when no rails are configured

- **GIVEN** an instruction with `rails = []`
- **WHEN** its row renders
- **THEN** only the `Copy` action is rendered; no `Letter` button is shown

### Requirement: The `Whitelistar Cuenta` CTA MUST open a 2-step inline modal (validate-then-confirm) gated by the presence of a Coinag instruction

The detail page's accounts section SHALL render a `Whitelistar Cuenta` CTA only when `client.accounts[].some(a => a.instructions[].some(i => i.operations_provider_name?.toUpperCase() === 'COINAG'))`. Clicking the CTA opens a single `<Dialog>` whose body advances internally between two steps: `'input'` (CVU/CBU text input + currency select prefilled to ARS + a `Validar` button) and `'review'` (the validated holder data — `account_type`, `account`, `alias`, `cuit`, `holder`, `holders[]` — plus a `Confirmar` button and a `Volver` link). The `Validar` button calls `GET /coinag/account/:cvu` (PSP backend); on success the modal advances to `'review'`. The `Confirmar` button calls `POST /clients/:id/whitelist-account` (PSP) with `{ name, tax_number, account_number, currency_id }`. On success the modal closes and a success toast appears; on `already_whitelisted` or `exist_internal_route` errors a localised message renders inline. The cache for `GET /clients/:id` is invalidated on success so the new account appears.

#### Scenario: CTA hidden when client has no Coinag instruction

- **GIVEN** a client whose accounts have only non-Coinag instructions
- **WHEN** the detail page renders
- **THEN** the `Whitelistar Cuenta` CTA is NOT rendered; only the `Create Instruction` placeholder slot exists (and per Decision 7 in v1 even that is hidden — the section ships only the back-link + sub-heading)

#### Scenario: 2-step flow validates then confirms

- **GIVEN** the modal is open at step `'input'` with an empty CVU
- **WHEN** the user types a 22-digit CVU and clicks `Validar`
- **THEN** the frontend calls `GET /coinag/account/<cvu>` on the PSP backend; on 200 OK the modal advances to step `'review'` showing the holder data; on 4xx/5xx the inline message `No se puede habilitar una cuenta interna o inexistente` appears and the modal stays at `'input'`

#### Scenario: Confirm submits to OPS, invalidates cache, and shows success toast

- **GIVEN** the modal at step `'review'` with valid data and `currency_id = 'ARS'`
- **WHEN** the user clicks `Confirmar`
- **THEN** the frontend calls `POST /clients/:id/whitelist-account` with the validated body, the modal closes on 200 OK, a success toast `Cuenta habilitada correctamente` appears, and the `vue-query` cache for `['clients', id]` is invalidated so the new account renders in the accounts list within the next render cycle

#### Scenario: already_whitelisted error surfaces a localised inline message

- **GIVEN** the modal at step `'review'`
- **WHEN** the user clicks `Confirmar` and the API returns `{ message: 'already_whitelisted' }`
- **THEN** the modal stays open, an inline error `Esta cuenta ya se encuentra habilitada para este cliente` renders below the action buttons, and the `Confirmar` button re-enables for retry; no toast appears

### Requirement: The Confirmation Letter generator MUST handle single-rail (direct) and multi-rail (picker) cases and open the result in a new tab

The `<InstructionRow>` `Letter` action SHALL inspect `instruction.rails[]` and behave as follows. If exactly one rail exists, the button calls `GET /account-instruction/:id/confirmation-letter?rail=<rail>` directly and on `{ success: true, url }` opens `url` in a new tab via `window.open(url, '_blank')`. If multiple rails exist, clicking the button opens an inline popover (anchored to the button) listing the rails; clicking a rail issues the same GET with `rail=<chosen>`. While the request is in flight the button enters a loading state and is disabled. On `{ success: false }` or HTTP error a `Failed to generate letter` toast appears.

#### Scenario: Single-rail instruction opens the letter directly

- **GIVEN** an instruction with `rails = ['SWIFT']`
- **WHEN** the user clicks `Letter`
- **THEN** the frontend calls `GET /account-instruction/<id>/confirmation-letter?rail=SWIFT`; on `{ success: true, url: 'https://example/letter.pdf' }` `window.open('https://example/letter.pdf', '_blank')` is invoked; the button never opens a popover

#### Scenario: Multi-rail instruction opens a rail-picker popover

- **GIVEN** an instruction with `rails = ['SWIFT', 'WIRE', 'ACH']`
- **WHEN** the user clicks `Letter`
- **THEN** an inline popover appears anchored to the button with three items `SWIFT` / `WIRE` / `ACH`; clicking `WIRE` issues `GET /account-instruction/<id>/confirmation-letter?rail=WIRE` and on success opens the URL in a new tab

#### Scenario: API failure shows a non-destructive toast

- **GIVEN** an instruction with `rails = ['SWIFT']`
- **WHEN** the user clicks `Letter` and the GET returns `{ success: false, error: 'rate_limited' }` OR HTTP 500
- **THEN** the button exits its loading state, no new tab opens, and a `Failed to generate confirmation letter` toast appears

### Requirement: Loading, empty, and error surfaces MUST follow the canonical `core-error-handling` patterns

The master list SHALL render: a Skeleton placeholder for the table while the initial query is in flight; an `EmptyState` titled `No hay clientes` with description `Probá ajustar los filtros` when the query succeeds with `data.clients = []`; an alert banner for 5xx failures with a `Reintentar` button that re-issues the query. The detail page SHALL render: a Skeleton for each section while `GET /clients/:id` is in flight; an `EmptyState` titled `Cliente no encontrado` for 404; an alert banner for 5xx with `Reintentar`. All transient errors (e.g. network drop, PSP timeout, copy-to-clipboard failure) SHALL surface via toast, NOT modals; the toast position is bottom-right per `core-error-handling`.

#### Scenario: Master list shows Skeleton then EmptyState then table

- **GIVEN** a fresh navigation to `/clients`
- **WHEN** the query is in flight
- **THEN** the table area renders 5 skeleton rows; on `data.clients = []` it switches to the `EmptyState`; on `data.clients.length > 0` it renders the rows

#### Scenario: Detail page renders 404 EmptyState for missing client

- **GIVEN** an authenticated user navigates to `/clients/does-not-exist`
- **WHEN** the GET returns 404
- **THEN** the page renders the `Volver a Clientes` back-link plus an `EmptyState` titled `Cliente no encontrado`; the accounts and movements sections are NOT mounted

#### Scenario: 5xx during whitelist confirmation surfaces a toast and keeps the modal open

- **GIVEN** the Whitelist modal at step `'review'`
- **WHEN** the user clicks `Confirmar` and the POST returns 500
- **THEN** a destructive toast `Error al habilitar la cuenta` appears bottom-right, the modal stays open at step `'review'` with the data preserved, and the `Confirmar` button re-enables for retry

### Requirement: The legacy `/users` path SHALL redirect to `/clients`

The router SHALL register a redirect from `/users` to `/clients`, preserving the query string. Bookmarked legacy URLs SHALL land on the new master without a flash of the redirect screen. The redirect SHALL NOT depend on auth state (the destination handles auth via its own `meta.requiresAuth = true` flag).

#### Scenario: Bare /users redirects to /clients

- **GIVEN** an authenticated user navigates to `/users`
- **WHEN** the router processes the navigation
- **THEN** the user lands on `/clients` with the master list rendered; the URL bar shows `/clients`, not `/users`

#### Scenario: /users with query params preserves them on redirect

- **GIVEN** an authenticated user navigates to `/users?name=acme&page=3`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/clients?name=acme&page=3`; the master list applies the filters and the page

#### Scenario: Unauthenticated visit to /users still redirects then triggers auth

- **GIVEN** an unauthenticated user visits `/users`
- **WHEN** the router processes the navigation
- **THEN** the redirect to `/clients` runs first, then the `requiresAuth` guard on `/clients` kicks in and sends the user to `/login` with the `redirect` query set to `/clients` (NOT to `/users`); after login they land on `/clients`

