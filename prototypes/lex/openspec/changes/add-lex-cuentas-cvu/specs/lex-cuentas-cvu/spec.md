## ADDED Requirements

### Requirement: Cuentas tab MUST be reached via the ?tab=cuentas query parameter

The `/clientes` page SHALL expose a sub-tab segmenter with two values, `clientes` (default) and `cuentas`. The active sub-tab SHALL be persisted in the URL via `?tab=` so a deep link or page reload restores the previous selection. Switching sub-tabs SHALL NOT trigger a page-level remount; only the affected sub-tree re-renders. The Sidebar's Clientes entry MUST keep an active class regardless of which sub-tab is selected, per `core-navigation` Requirement "Topbar breadcrumb MUST append the active sub-tab as a third segment".

#### Scenario: Direct link to ?tab=cuentas opens the CVU tab

- **GIVEN** a user pastes `/clientes?tab=cuentas` into the address bar and is authenticated
- **WHEN** the page mounts
- **THEN** the Cuentas tab is the active sub-tab and the Clientes table is not rendered

#### Scenario: Sub-tab switch updates the URL without remount

- **GIVEN** the user is on `/clientes?tab=clientes` with cached data
- **WHEN** the user clicks the Cuentas sub-tab
- **THEN** the URL becomes `/clientes?tab=cuentas`, the Clientes `useQuery` cache is preserved, and the Cuentas `useQuery` fires its first request

#### Scenario: Breadcrumb reflects the active sub-tab

- **GIVEN** the user is on `/clientes?tab=cuentas`
- **WHEN** the Topbar breadcrumb renders
- **THEN** the breadcrumb's third segment is `Cuentas`

---

### Requirement: CVU table MUST render the canonical column set

The Cuentas table SHALL render the following columns in this left-to-right order: Fecha de creación, Sponsor, Cliente (nombre), CUIT, Account address (CBU/CVU), Estado. Per `core-data-tables` the Fecha column SHALL render via the project's `date-fns` formatter using `dd/MM/yyyy HH:mm`. Sponsor SHALL be rendered as a Badge with the registry value coloured per the Sponsor token (`--badge-sponsor-bind`, `--badge-sponsor-coinag`). The Cliente column MUST NOT click through to `/clientes/:id` directly from this tab — instead the row click opens a side popover summarising the client and offering an explicit "Ver legajo" CTA, to keep the CVU listing context-stable.

#### Scenario: Default rendering with both sponsors

- **GIVEN** a response containing CVUs from both BIND and COINAG
- **WHEN** the Cuentas tab renders
- **THEN** rows show the Sponsor badge with the registered colour token and the Account address column displays the raw CBU/CVU string in monospace

#### Scenario: Row click opens the summary popover

- **GIVEN** a user clicks a CVU row whose Cliente is `Acme Corp`
- **WHEN** the popover opens
- **THEN** the popover header shows `Acme Corp`, the body shows CUIT and dockets, and the footer exposes a "Ver legajo" link to `/clientes/:id`

#### Scenario: Sponsor badge falls back to neutral on unknown values

- **GIVEN** a CVU whose `sponsor` value is not in `{'BIND','COINAG'}`
- **WHEN** the cell renders
- **THEN** the badge uses the neutral surface variant and the literal sponsor string is shown

---

### Requirement: Cuentas filters MUST cover date range, sponsor, and client name

The L3 filter bar SHALL include exactly these inputs: Rango de fechas (a single picker writing `from` and `to` query params), Sponsor (Select with `BIND` / `COINAG`), and Cliente (text input, debounced 300 ms). The date range MUST default to the last 30 days. Per `core-forms` Requirement "Forms and modals MUST use a custom Select component, never native `<select>`", the Sponsor input MUST use the shadcn-vue Select; per `core-data-tables` Requirement "Period filter MUST be a privileged single-value filter pinned at the start of the L3 filter row", Rango de fechas SHALL be the leftmost filter.

#### Scenario: Default date range is the last 30 days

- **GIVEN** a user opens `/clientes?tab=cuentas` without explicit `from` / `to`
- **WHEN** the page mounts
- **THEN** the Rango de fechas picker shows today and today minus 30 days; `GET /cvu?from=...&to=...` includes that range

#### Scenario: Sponsor filter applies immediately

- **GIVEN** Rango de fechas is fixed and the table is loaded
- **WHEN** the user picks `COINAG` in the Sponsor Select
- **THEN** a single `GET /cvu?sponsor=COINAG&from=...&to=...` request fires within the same tick

#### Scenario: Cliente input is debounced

- **GIVEN** a user types `Acme` into the Cliente input character by character
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /cvu?client_name=Acme&...` request is fired

---

### Requirement: Cuentas tab MUST expose an Exportar XLSX CTA

A header CTA labelled `Exportar XLSX` SHALL sit at the right edge of the Cuentas L3 row (left of the page-size selector). When clicked, the page SHALL build an XLSX file from the **currently filtered result set** (not just the visible page) and trigger a browser download. The export SHALL use `xlsx` 0.18.5 in synchronous mode on the main thread; rows over 10,000 SHALL surface a confirmation toast warning the user that the export may take several seconds. The exported sheet SHALL contain exactly the columns rendered in the table, in the same order, plus a hidden internal `cvu_id` column for traceability. Filename SHALL be `lex-cuentas-${from}_${to}.xlsx` using the `dd-MM-yyyy` date format.

#### Scenario: Default filtered export

- **GIVEN** the user has applied `sponsor=BIND` and `from=2026-04-01&to=2026-04-30` and the result set contains 240 rows
- **WHEN** the user clicks `Exportar XLSX`
- **THEN** a file `lex-cuentas-01-04-2026_30-04-2026.xlsx` is downloaded with 240 data rows plus a header row plus the hidden `cvu_id` column

#### Scenario: Large export surfaces a warning toast

- **GIVEN** the filtered result set contains 12,000 rows
- **WHEN** the user clicks `Exportar XLSX`
- **THEN** a toast appears with title `Exportación en curso` and description `Procesando 12.000 filas. La página puede quedar trabada unos segundos.` and the export proceeds after the toast renders

#### Scenario: Export is disabled while a fetch is in flight

- **GIVEN** the table is loading the next page after a filter change
- **WHEN** the user attempts to click `Exportar XLSX`
- **THEN** the button is disabled with `title="Esperá a que termine la carga"` and no XLSX is generated

---

### Requirement: Cuentas tab MUST inherit the role gating from lex-roles

Visibility of the Cuentas tab SHALL follow the role matrix in `lex-roles`. `VIEWER_LEX` and `COMMERCIAL_LEX` MAY view the tab; only `ADMIN_LEX` MAY trigger the XLSX export. Server-side filtering of which CVUs each role sees (per `assigned_users` and `visible_clients`) is the backend's responsibility — this requirement governs only the visibility of the Exportar CTA.

#### Scenario: Exportar CTA is hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user is on `/clientes?tab=cuentas`
- **WHEN** the L3 row renders
- **THEN** the `Exportar XLSX` button is not rendered

#### Scenario: Exportar CTA is hidden for COMMERCIAL_LEX

- **GIVEN** a user with roles exactly `['COMMERCIAL_LEX']` is on `/clientes?tab=cuentas`
- **WHEN** the L3 row renders
- **THEN** the `Exportar XLSX` button is not rendered

#### Scenario: ADMIN_LEX sees the Exportar CTA

- **GIVEN** an ADMIN_LEX user is on `/clientes?tab=cuentas`
- **WHEN** the L3 row renders
- **THEN** the `Exportar XLSX` button is rendered and enabled when the table is loaded
