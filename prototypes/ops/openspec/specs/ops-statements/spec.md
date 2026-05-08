# ops-statements Specification

## Purpose
TBD - created by archiving change add-ops-statements. Update Purpose after archive.
## Requirements
### Requirement: The Generate Statement modal MUST be reachable from the master list header AND from the detail page header, with the detail entry pre-populating the client

The CTA `Generar Statement` SHALL appear in the page header of `/clients` (alongside `Alta de Cliente en APP`) AND in the page header of `/clients/:id` (alongside `Habilitar cuenta`). Both CTAs open the same `<GenerateStatementModal>` Dialog. The modal opened from the master list mounts at step 1 (client selection) with no client pre-populated. The modal opened from the detail page mounts at step 2 (account selection) with the current client pre-populated and shown as a read-only chip with a `Cambiar` link that returns to step 1. The modal Dialog SHALL have exactly one mount; the modal mode is centred and its width matches the canon for multi-step modals (`sm:max-w-2xl`).

#### Scenario: Master list CTA opens the modal at step 1 with no client pre-populated

- **GIVEN** an authenticated `OPS_ADMIN` user is on `/clients`
- **WHEN** the user clicks the header CTA `Generar Statement`
- **THEN** the modal mounts with step 1 active (the client autocomplete input visible), no client chip shown, the account selector and date picker NOT mounted yet

#### Scenario: Detail page CTA opens the modal at step 2 with the client pre-populated

- **GIVEN** an authenticated user is on `/clients/abc-123` with the client `ACME Foods` loaded
- **WHEN** the user clicks the header CTA `Generar Statement`
- **THEN** the modal mounts with step 2 active, a read-only chip showing `ACME Foods` with a `Cambiar` link, the accounts of ACME Foods rendered as the accordion-by-currency selector, and the date picker visible below

#### Scenario: Cambiar link in the pre-populated chip returns to step 1

- **GIVEN** the modal opened from the detail page is at step 2 with a pre-populated client
- **WHEN** the user clicks the `Cambiar` link on the client chip
- **THEN** the modal transitions to step 1 — the client chip is removed, the autocomplete input becomes editable and pre-filled with the previous client name, the account selector unmounts, the date picker stays at its current state (the date range chosen does NOT reset on backtrack)

### Requirement: The flow MUST guide the user through three logical steps inside one Dialog: client selection → account selection → date range

The modal SHALL display all three steps stacked vertically inside one Dialog so the operator sees the full flow at all times. Steps are gated by their previous step's selection: step 2 (Cuenta) is mounted only when a client is selected; step 3 (Fechas) is mounted only when an account is selected. Each completed step renders a chip + a `Cambiar` link to backtrack. The submit button (`Generar`) SHALL be enabled only when client + account + date_from + date_to are all set; otherwise disabled with the same chrome.

#### Scenario: Steps mount progressively as selections are made

- **GIVEN** the modal at step 1 with no selections
- **WHEN** the user picks a client from the autocomplete
- **THEN** step 2 mounts (account selector renders); the date picker is NOT mounted; the submit button is disabled

#### Scenario: All three selections enable submit

- **GIVEN** the modal with a client picked and an account picked
- **WHEN** the user picks a date range using a quick-filter chip OR the calendar
- **THEN** the date picker reflects the chosen range, the submit button becomes enabled, and clicking submit fires the POST (per Requirement 5)

#### Scenario: Backtracking does NOT clear deeper-step selections except their dependencies

- **GIVEN** the modal at step 3 with client `A`, account `acc-1`, and a date range chosen
- **WHEN** the user clicks `Cambiar` on the account chip (NOT on the client chip)
- **THEN** the account selector returns to its picker state, the date range remains intact (because dates do not depend on the account), and the modal is back at step 2 with the client chip still pre-populated

#### Scenario: Closing the modal without submit discards all selections

- **GIVEN** the modal mid-flow with client + account + dates selected
- **WHEN** the user clicks `Cancelar` or presses Escape
- **THEN** the modal closes, the next opening from the same surface starts fresh (no persistence of the previous selections)

### Requirement: The Account selector MUST group the client's accounts by currency in an accordion, with smart single-account default

When step 2 mounts, `GET /clients/:id` SHALL be called (or the cached payload reused if `<ClientDetail>` recently fetched it) to source `accounts[]`. If the client has **exactly one account** (across any currency), that account SHALL be auto-selected without rendering the accordion (per Decision 7a — smart default); the modal advances directly to step 3 with the selected-account chip already shown. Otherwise, the accounts SHALL be grouped by `currency.name` (uppercased to 3 chars) into an accordion where each currency group is collapsible. Each group's header shows the currency code, count of accounts, and a chevron icon. Each account shows its `account_number`, current `balance`, and a single-select radio-style affordance. Picking an account collapses to a chip; clicking `Cambiar` on the chip reopens the accordion at the chosen account's group.

#### Scenario: Accounts of multiple currencies render in distinct accordion groups

- **GIVEN** a client with 4 accounts (2 ARS, 1 USD, 1 USDT)
- **WHEN** step 2 mounts
- **THEN** three accordion groups render with headers `ARS · 2 cuentas`, `USD · 1 cuenta`, `USDT · 1 cuenta`; the first group is expanded by default, the others collapsed

#### Scenario: Selecting an account collapses the accordion and renders a chip

- **GIVEN** the accordion expanded on the ARS group with 2 accounts
- **WHEN** the user clicks `acc-001 · Balance 12.500,00`
- **THEN** the accordion collapses to a chip showing `ARS · acc-001 · Balance 12.500,00` plus a `Cambiar` link, and step 3 (date picker) mounts below

#### Scenario: Empty accounts surface the canonical empty state

- **GIVEN** a client with `accounts = []`
- **WHEN** step 2 mounts
- **THEN** the accordion area renders a centred `EmptyState` titled `Este cliente no tiene cuentas` with description `No es posible generar statements para clientes sin cuentas activas`; the date picker step does NOT mount; the submit button stays disabled

#### Scenario: Single-account client auto-selects without showing the accordion (Decision 7a)

- **GIVEN** a client with exactly 1 account `acc-001 · ARS · Balance 12.500,00`
- **WHEN** step 2 mounts after the client is picked (master entry) OR right away (detail entry pre-population)
- **THEN** the accordion is NOT rendered; the chip `ARS · acc-001 · Balance 12.500,00 · Cambiar` is shown directly; step 3 (date picker) mounts immediately below; the operator's flow advances by one click

#### Scenario: `Cambiar` on the auto-selected chip surfaces the (single-row) accordion for explicit confirmation

- **GIVEN** the auto-selected chip from a single-account client
- **WHEN** the user clicks `Cambiar`
- **THEN** the accordion renders with a single ARS group expanded showing the one account; selecting it again collapses back to the chip; this affordance prevents the operator from being trapped in the auto-default if they want to triple-check

### Requirement: The Date Range picker MUST offer the 8 canonical quick-filter chips, with localStorage persistence of the last-chosen range

A row of 8 chips SHALL render above the calendar, in this exact order: `Últimos 7 días`, `Últimos 15 días`, `Últimos 30 días`, `Este mes`, `Mes anterior`, `Últimos 3 meses`, `Últimos 6 meses`, `Este año`. Clicking a chip applies its resolved range to the calendar (computed by the pure helper `resolveQuickFilter`); only one chip can be active at a time. Manually editing the calendar (clicking a date that is not exactly the start/end of any chip's range) deselects the active chip. The calendar SHALL be a `<DatePicker mode="range">` from `core-forms` with locale `es` and 2 visible months. Per Decision 7b, the modal SHALL persist the last-chosen range (and the active chip key, if any) in `localStorage` under the key `ops:statements:lastRange` per operator; on the next opening the saved range pre-populates the calendar (and the chip if it still resolves to the same range relative to today).

#### Scenario: Clicking `Últimos 7 días` applies the canonical range

- **GIVEN** today is 2026-05-08
- **WHEN** the user clicks `Últimos 7 días`
- **THEN** the calendar reflects the range `2026-05-02` → `2026-05-08`, the chip `Últimos 7 días` shows the active style, and the other chips show the inactive style

#### Scenario: Clicking `Mes anterior` resolves correctly across month boundaries

- **GIVEN** today is 2026-05-08
- **WHEN** the user clicks `Mes anterior`
- **THEN** the calendar reflects the range `2026-04-01` → `2026-04-30`; the chip `Mes anterior` is active; the helper does NOT off-by-one (April has 30 days, not 31)

#### Scenario: Manual calendar edit deselects the active chip

- **GIVEN** the chip `Últimos 7 días` is active with range `2026-05-02` → `2026-05-08`
- **WHEN** the user clicks `2026-05-04` on the calendar to start a new range, then `2026-05-08` to end it
- **THEN** the calendar reflects `2026-05-04` → `2026-05-08`, NO chip is active (all chips render in the inactive style), and the submit button stays enabled

#### Scenario: Last-chosen quick filter pre-populates the date picker on the next opening (Decision 7b)

- **GIVEN** the operator generated a statement on Monday with the chip `Últimos 30 días` active, and `localStorage` recorded `{ chipKey: 'last-30-days' }` under `ops:statements:lastRange`
- **WHEN** the operator opens the modal again on Tuesday
- **THEN** the chip `Últimos 30 días` re-renders as active and the calendar reflects the freshly-resolved range relative to Tuesday's `today` (i.e. NOT the literal Monday range — the chip's semantic is preserved, the dates re-resolve)

#### Scenario: Last-chosen custom range pre-populates as a literal range (no chip active)

- **GIVEN** the operator manually picked `2026-04-01 → 2026-04-30` last time, and `localStorage` recorded `{ from: '2026-04-01', to: '2026-04-30' }` (no chipKey)
- **WHEN** the operator opens the modal again
- **THEN** the calendar reflects the literal range `2026-04-01 → 2026-04-30`; no chip is active; if today's `Mes anterior` chip happens to resolve to the same range, the spec does NOT auto-activate it (literal ranges stay literal)

### Requirement: Submit MUST POST `/statement` with the canonical ISO 8601 UTC payload, support cancel-during-flight, and surface a re-openable success toast

Clicking the submit button SHALL call `apiClient.post('/statement', payload, { signal })` where `payload = { client_id, account_id, date_from, date_to }` and `signal` comes from an `AbortController` instantiated when the click fires. `date_from` and `date_to` SHALL be ISO 8601 strings with UTC suffix: `date_from` ends with `T00:00:00Z` and `date_to` ends with `T23:59:59Z` (so the range is inclusive of the chosen end day). On a response of `{ success: true, status_code: 201, url: <string> }` the modal SHALL `window.open(url, '_blank')` AND close the modal AND emit a success toast `Statement generado exitosamente para <client.name>` whose body includes a `Volver a abrir` button bound to `window.open(url, '_blank')` with the cached URL; the toast persists for at least 10 s (per Decision 7e). On any other response (`success: false`, missing `url`, HTTP 4xx/5xx) the modal SHALL stay open with the same selections preserved and surface a destructive toast with the backend message (or `Error al generar el statement` as fallback). While the request is in flight, the `Generar` button SHALL transform into a `Cancelar` button bound to `controller.abort()` (per Decision 7d); clicking it aborts the in-flight request, the modal stays open with selections preserved, and a non-destructive notice `Generación cancelada` appears below the button.

#### Scenario: Successful generation opens the URL in a new tab and closes the modal

- **GIVEN** the modal at step 3 with client `ACME`, account `acc-1`, range `2026-05-01` → `2026-05-08`
- **WHEN** the user clicks `Generar` and the API returns `{ success: true, status_code: 201, url: 'https://files/statement.pdf' }`
- **THEN** `window.open` is called with `('https://files/statement.pdf', '_blank')`, the modal closes, and a success toast `Statement generado exitosamente para ACME` appears bottom-right

#### Scenario: Backend `success: false` keeps the modal open and surfaces the error message

- **GIVEN** the modal at step 3 with all selections set
- **WHEN** the user clicks `Generar` and the API returns `{ success: false, error: 'Sin movimientos en el rango seleccionado' }`
- **THEN** the modal stays open with the selections preserved, a destructive toast `Sin movimientos en el rango seleccionado` appears bottom-right, and the submit button re-enables for retry

#### Scenario: HTTP 5xx falls through to the canonical fallback message

- **GIVEN** the modal at step 3 with all selections set
- **WHEN** the user clicks `Generar` and the API returns HTTP 503
- **THEN** the modal stays open, a destructive toast `Error al generar el statement` appears, and the submit button re-enables for retry

#### Scenario: Date payload uses ISO 8601 UTC with the inclusive end-day suffix

- **GIVEN** the user selected the range `2026-05-01` → `2026-05-08`
- **WHEN** the submit fires
- **THEN** the request body has `date_from = '2026-05-01T00:00:00Z'` AND `date_to = '2026-05-08T23:59:59Z'` (NOT `T00:00:00Z` for the end — the end day is inclusive)

#### Scenario: Cancel during submit aborts the request and preserves selections (Decision 7d)

- **GIVEN** the modal at step 3 with all selections set, and the user clicked `Generar`
- **WHEN** the request is in flight and the user clicks the `Cancelar` button (which replaced the `Generar` button)
- **THEN** `AbortController.abort()` fires on the request signal, the API call rejects with an abort signal, no toast appears, the modal stays open with the same selections preserved, the button returns to `Generar` (re-enabled), and a non-destructive notice `Generación cancelada` appears below the button for ~3 s

#### Scenario: Success toast surfaces a `Volver a abrir` button for accidentally-closed tabs (Decision 7e)

- **GIVEN** a successful generation that opened `https://files/statement.pdf` in a new tab and closed the modal
- **WHEN** the user accidentally closes the new tab within 10 s of the generation
- **THEN** the bottom-right toast (still visible during its 10 s persistence window) renders a `Volver a abrir` button; clicking it calls `window.open('https://files/statement.pdf', '_blank')` again with the same cached URL — no re-generation, no second `POST /statement` is fired

### Requirement: The Generate Statement CTA MUST be visible only to users with `clients:statement` capability or `OPS_ADMIN` role

Both CTAs (master list header + detail page header) SHALL be rendered only when `useCapabilities().can('clients:statement') || useCapabilities().can('OPS_ADMIN')` returns true. Hidden — not disabled — for users without the capability. The capability is declared inline in v1; once `ops-roles` lands, it is replaced with the canonical capability string everywhere this gate is evaluated.

#### Scenario: ADMIN role sees the CTA on both surfaces

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the user navigates to `/clients` and then to `/clients/:id`
- **THEN** both pages render the `Generar Statement` CTA in the header

#### Scenario: VIEWER role does NOT see the CTA on either surface

- **GIVEN** an authenticated user whose roles include `OPS_VIEWER` only
- **WHEN** the user navigates to `/clients` and then to `/clients/:id`
- **THEN** neither page renders the `Generar Statement` CTA; no `disabled` button is shown

#### Scenario: Capability is checked again on detail load (not just on master)

- **GIVEN** an authenticated VIEWER navigates directly to `/clients/abc-123`
- **WHEN** the detail page renders
- **THEN** the `Generar Statement` CTA is NOT rendered; the page chrome shows the back-link, info card, accounts section without the CTA

### Requirement: Loading, validation, and error surfaces MUST follow the canonical `core-error-handling` patterns

The modal SHALL render: a `Skeleton` placeholder for the accounts area while `GET /clients/:id` is in flight (when step 2 mounts); inline validation messages for the autocomplete (e.g. "Sin resultados") with the same shape as `<ClientFilters>`; a destructive toast for any 5xx during submit; a non-destructive notice inside the modal when `accounts = []` (the canonical EmptyState per Requirement 3). All transient errors SHALL surface via toast at the bottom-right per `core-error-handling`.

#### Scenario: Skeleton renders during accounts hydration

- **GIVEN** the modal advances to step 2 with a freshly-picked client
- **WHEN** `GET /clients/:id` is in flight
- **THEN** the accounts area renders 2 skeleton accordion groups; once the response arrives, the skeleton replaces with the real accordion (or the EmptyState if accounts is empty per Requirement 3)

#### Scenario: 5xx during submit surfaces a destructive toast and keeps the modal open

- **GIVEN** the modal at step 3 with all selections set
- **WHEN** the user clicks `Generar` and the API throws `ApiError(503, 'Service Unavailable')`
- **THEN** a destructive toast appears bottom-right with the message, the modal stays open, the submit button re-enables, and all three selections (client + account + date range) are preserved

#### Scenario: Network failure mid-flight surfaces a generic message

- **GIVEN** the modal at step 3 mid-submit
- **WHEN** the network drops and `apiClient.post` rejects with a non-`ApiError`
- **THEN** the toast shows `Error al generar el statement`, the modal stays open, all selections preserved, the submit button re-enables

### Requirement: The modal MUST render a pre-submit preview card consolidating client + account + range before enabling Generar

When all three selections (client + account + date range) are set, a preview card SHALL render between step 3's date picker and the action buttons (per Decision 7c). The card consolidates the about-to-be-fired request in human-readable form, with this exact structure:

- A heading `Resumen` in the canonical small-caps style (`text-[10px] font-bold uppercase tracking-wider text-t-3`).
- One line per selection: `Cliente: <client.name>` · `Cuenta: <account.account_number> · <currency>` · `Período: <date_from formatted as DD/MM/YYYY> – <date_to formatted as DD/MM/YYYY>`.
- A subtle border + background (`bg-card-2 border-b-1`).

The card is informational only — no inputs inside it. Editing any selection above the card causes it to re-render with the new values. The preview card SHALL NOT count as a fourth step (no chip, no `Cambiar` link); it's an in-place confirmation. The `Generar` button below the card SHALL be enabled if and only if all three selections are set; the card's presence does NOT change the enablement logic.

#### Scenario: Preview card renders only when all three selections are present

- **GIVEN** the modal at step 3 with client + account picked but no date range yet
- **WHEN** the page renders
- **THEN** the date picker is visible, the preview card is NOT rendered, the `Generar` button is disabled

#### Scenario: Preview card consolidates the three selections in canonical format

- **GIVEN** the operator has picked client `ACME Foods`, account `acc-001 · ARS · 12.500,00`, and range `2026-05-01 → 2026-05-08`
- **WHEN** the preview card renders
- **THEN** the card shows the heading `RESUMEN`, three lines `Cliente: ACME Foods`, `Cuenta: acc-001 · ARS`, `Período: 01/05/2026 – 08/05/2026`, and the `Generar` button below it is enabled

#### Scenario: Editing a selection re-renders the preview card with updated values

- **GIVEN** the preview card showing client `ACME Foods` + account `acc-001` + range `01/05/2026 – 08/05/2026`
- **WHEN** the user clicks `Cambiar` on the account chip and picks `acc-002 · USD · 5.000,00`
- **THEN** the preview card re-renders with `Cuenta: acc-002 · USD`; the other two lines stay the same; the `Generar` button stays enabled (because all three selections are still set after the change)

