# core-data-tables Specification

## Purpose

Define the canonical data-table pattern used across every Ardua core module. Tables are the single most common UI surface in the core, so consistency in layout, filtering, pagination, and interaction is mandatory.
## Requirements
### Requirement: Tables MUST render inside a bordered, rounded surface

Every data table SHALL be wrapped in a container with the standard card background, border tokens, and rounded corners. The `<table>` element SHALL use `border-collapse` and fill 100% of the container width.

#### Scenario: Table surface uses standard tokens

- **GIVEN** a page declares a data table in its L3 section
- **WHEN** the table is rendered
- **THEN** the wrapper applies `bg-card-2`, `border border-b-2`, and a rounded-corner token; the table itself fills the container width

### Requirement: Table headers MUST follow uppercase, letter-spaced typography

Column headers SHALL use the uppercase, bold, letter-spaced token style defined by the design system. Left alignment is the default; the actions column SHALL be centered and width-constrained.

#### Scenario: Header cells use the canonical typography

- **GIVEN** a table header row is defined
- **WHEN** a `<th>` cell is rendered
- **THEN** it applies the `text-[10px] font-bold uppercase tracking-wider text-t-3` token combination

#### Scenario: Actions header is centered and fixed-width

- **GIVEN** a table exposes an actions column
- **WHEN** the header row is rendered
- **THEN** the actions `<th>` is centered and constrained to a narrow fixed width (approximately 40px)

### Requirement: Table rows MUST open a detail view on click

Clicking anywhere on a row SHALL open the detail modal (or navigate to a detail route) for that record. The actions cell SHALL stop propagation so that its interactions do not trigger the row click.

#### Scenario: Clicking a row opens the detail

- **GIVEN** a data table with at least one record
- **WHEN** the user clicks a row outside the actions cell
- **THEN** the record's detail surface opens

#### Scenario: Clicking inside the actions cell does NOT open the detail

- **GIVEN** a row with an open or closed actions menu
- **WHEN** the user clicks the actions button or any item inside the actions menu
- **THEN** the row-level click handler is NOT triggered

#### Scenario: Rows provide a visible hover state

- **GIVEN** a data table with data rows
- **WHEN** the user hovers a row
- **THEN** the row background shifts to the hover token to signal interactivity

### Requirement: Section header MUST expose search, filters, and result count

Above every table, a section header SHALL render: a section title, a search input (with prefix icon), a flexible spacer, one or more filter triggers, and a result-count indicator. The header SHALL wrap on narrow viewports.

#### Scenario: Search narrows the visible rows as the user types

- **GIVEN** a table configured with `searchFields`
- **WHEN** the user types into the search input
- **THEN** the table filters rows against the configured search fields without requiring a submit action

#### Scenario: Active filters display a result count

- **GIVEN** at least one filter or search term is active and produces a result set different from the full dataset
- **WHEN** the section header renders
- **THEN** the header displays `"{N} resultado(s)"` next to the filter controls

#### Scenario: Clearing all filters hides the result count

- **GIVEN** previously active filters
- **WHEN** all filters and the search input are empty
- **THEN** the result-count indicator is hidden

### Requirement: Filter triggers MUST use the dropdown pattern

Each filter SHALL be triggered by a button with a label, a chevron affordance, and a selected-state visual treatment. The dropdown SHALL render immediately below the trigger with a standard menu layout: an uppercase label, a "Todos" clear option (when applicable), and the filter options.

#### Scenario: Filter trigger reflects selection state

- **GIVEN** a filter has a selected value
- **WHEN** the trigger is rendered
- **THEN** the trigger applies the `border-info` and info-text tokens to signal the active filter

#### Scenario: "Todos" clears the selection

- **GIVEN** a filter with a current non-empty selection
- **WHEN** the user selects "Todos" from the filter dropdown
- **THEN** the filter's value is cleared and the table recomputes the visible rows

### Requirement: Tables MUST support client-side pagination with ellipsis navigation

Tables SHALL paginate using a page-size selector and a page number list with ellipsis truncation for large datasets. The footer SHALL render: the current page info, a page-size select, and the page navigation control.

#### Scenario: Pagination info is always present

- **GIVEN** a table rendered with any amount of data
- **WHEN** the footer renders
- **THEN** it shows `"Page {N} of {T} · {total} resultado(s)"`

#### Scenario: Ellipsis appears for large page counts

- **GIVEN** a dataset with a total page count greater than 7
- **WHEN** the page navigation renders
- **THEN** the page list shows: first page, optional ellipsis, surrounding pages (current ± 1), optional ellipsis, last page

#### Scenario: Changing page size resets to page 1

- **GIVEN** a table currently on a page greater than 1
- **WHEN** the user changes the page-size selector
- **THEN** the current page is reset to 1 and the table renders with the new page size

### Requirement: Empty states MUST be explicit

When a table has no rows — either because the dataset is empty or because filters produced no matches — the table SHALL render an explicit empty-state row with a neutral message.

#### Scenario: No results message fills the table

- **GIVEN** the current page has zero visible rows
- **WHEN** the table body renders
- **THEN** a single row with `colspan` covering all columns renders a centered "Sin resultados" message

### Requirement: Tables MUST use the `useTable` composable for client-side data

Client-side tables (data already in memory, non-paginated API) SHALL use the `useTable` composable for search, filters, and pagination. Server-side tables SHALL use `@tanstack/vue-query` with server-side params. Hand-rolled pagination logic inside page components is forbidden.

#### Scenario: Client-side table uses useTable

- **GIVEN** a table operates on in-memory data (small reference lists, settings screens)
- **WHEN** the page composes the table state
- **THEN** it uses `useTable<T>({ data, searchFields, pageSize })` instead of hand-rolled pagination

#### Scenario: Server-side table uses vue-query

- **GIVEN** a table fetches paginated data from an API
- **WHEN** the page composes the query
- **THEN** it uses `useQuery` with `params` that include `page`, `pageSize`, `search`, and filter values — pagination state is owned by the query key

### Requirement: Period filter MUST be a privileged single-value filter pinned at the start of the L3 filter row

When a module's L3 filter row exposes a temporal scope, the period filter SHALL be the leftmost (pinned) filter trigger and SHALL carry four UI privileges that distinguish it from generic filters: it is mandatory (no `Todos` option), it has an explicit per-module default visible at first render, it is single-value (radio semantics; never multi-select), and — when the module's L2 KPI cards aggregate over time — it MUST drive the same aggregation window as the table query.

The period value MUST be exposed either as a typed prop `period: PeriodValue` on the page component or as a Pinia store slice (e.g. `usePeriodStore('mod-X')`) that exposes `period` and a `setPeriod(v: PeriodValue): void` mutation. Calling `setPeriod(v)` MUST update both the table's query key and the L2 KPI aggregation key atomically.

#### Scenario: Period filter is pinned and mandatory

- **GIVEN** a module declares a period filter
- **WHEN** the L3 filter row renders
- **THEN** the period trigger is the leftmost trigger in the row, the dropdown contains no `Todos` option, and the trigger label always shows the currently selected period (never an empty placeholder)

#### Scenario: setPeriod updates table and KPI keys atomically

- **GIVEN** a module whose L2 KPI cards aggregate over the period
- **WHEN** the user selects a new period value and `setPeriod(v)` is invoked
- **THEN** the table query key and the KPI aggregation key both incorporate the new period in the same Vue tick — the table re-queries and the KPI cards re-compute against the same window

#### Scenario: Period default is explicit per module

- **GIVEN** a module that has not yet been visited in the current session
- **WHEN** the page mounts
- **THEN** the period filter renders with the module-declared default value (e.g. `Q4 2025`, `últimos 30 días`) and no period value is ever `undefined` or `null`

---

### Requirement: Modules MUST declare their supported views via a typed views array

Every module SHALL declare its supported views via a typed field `views: ('list' | 'cards' | 'kanban')[]` on its module config (e.g. `meta.module.views` on the route, or the equivalent module registration record). The `<ViewToggle>` component SHALL render only the declared views — no toggle button MUST appear for an undeclared view. When `views.length === 1`, the `<ViewToggle>` MUST be hidden entirely. The default value when `views` is omitted MUST be `['list']`. The currently active view MUST persist per-module in session storage so navigating away and back returns the user to the previously active view.

When `views` includes `'kanban'` but the module declares no state machine (no `states` and no `axes`), the framework MUST log a console warning and MUST omit `'kanban'` from the rendered toggle.

#### Scenario: ViewToggle renders only declared views

- **GIVEN** a module declares `views: ['list', 'cards']`
- **WHEN** `<ViewToggle>` renders
- **THEN** exactly two buttons render (`Lista` and `Tarjetas`) and no `Tablero` button renders

#### Scenario: Single-view modules hide the toggle

- **GIVEN** a module declares `views: ['list']` (or omits `views` entirely)
- **WHEN** the page renders the L1 actions area
- **THEN** the `<ViewToggle>` is not rendered at all — there is no degenerate one-button toggle

#### Scenario: Active view persists per module in session storage

- **GIVEN** the user is on `module-A` and has switched to the `cards` view
- **WHEN** the user navigates to `module-B` and then back to `module-A`
- **THEN** `useViewMode('module-A')` returns `'cards'` and the page renders Tarjetas without flashing Lista first

#### Scenario: Kanban without state machine is omitted with a warning

- **GIVEN** a module declares `views: ['list', 'kanban']` but declares no `states` and no `axes`
- **WHEN** the framework registers the module
- **THEN** a console warning is emitted naming the module, and the rendered `<ViewToggle>` shows only `Lista` (the `Tablero` button is omitted)

---

### Requirement: Tarjetas view MUST render via CardsGrid + CardItem with three mandatory zones

The Tarjetas view SHALL render via a `<CardsGrid>` component using a CSS grid with `auto-fill, minmax(290px, 1fr)` so cards reflow responsively. Each `<CardItem>` MUST contain three mandatory zones in this order:

- **Header** — record ID (leftmost), title, status badges (state, severity, optional `imputacion`).
- **Body** — a key-value summary of 2–4 module-chosen fields.
- **Footer** — timestamp on the left, per-row ⋯ actions menu trigger on the right.

The card content MUST be produced by a shared `renderCard(record, mode: 'cards' | 'kanban')` function so that Tarjetas and Tablero render the same record identically. The `mode` argument MAY be used to compress the footer in `'kanban'` mode (e.g. fold the timestamp into a tooltip), but the header and body MUST be unchanged across modes.

The Tarjetas view MUST page with the same page-size limit selected for Lista; switching from Lista to Tarjetas MUST NOT reset the active page or change the page size (see also: `Pagination state MUST be shared across all views of the same module`).

#### Scenario: Cards grid uses the responsive auto-fill layout

- **GIVEN** the Tarjetas view is active for a module with N records on the current page
- **WHEN** `<CardsGrid>` mounts
- **THEN** the grid applies `grid-template-columns: repeat(auto-fill, minmax(290px, 1fr))` and the N cards reflow to fill the available width

#### Scenario: Card has the three mandatory zones in the canonical order

- **GIVEN** a `<CardItem>` rendering record `R-042`
- **WHEN** the card paints
- **THEN** the header zone shows `R-042` as the leftmost element followed by the title and the status badges; the body zone shows 2–4 key-value pairs; the footer zone shows a timestamp on the left and the actions menu trigger on the right

#### Scenario: Tarjetas and Tablero share the renderCard function

- **GIVEN** a module that declares both `views: ['cards', 'kanban']` and a shared `renderCard(record, mode)` function
- **WHEN** the same record is rendered first in Tarjetas (`mode: 'cards'`) and then in Tablero (`mode: 'kanban'`)
- **THEN** the header and body zones are identical between the two renders — only the footer MAY differ to accommodate kanban density

---

### Requirement: Tablero view MUST be state-driven with one column per declared state

The Tablero (Kanban) view SHALL render exactly one column per state declared in the module's state machine — the column count is N, never a hardcoded 3. Each state declaration MUST include `id: string`, `label: string`, `column_label: string`, `order: number`, and `terminal: boolean`. Columns MUST appear left-to-right in ascending `order`.

Transitions between states SHALL be declared per `(from, to)` pair with `mode: 'free' | 'modal' | 'blocked'` and an optional `sideEffect: string` referencing a named function in the module's `sideEffects` map. Any drop whose `(from, to)` is not declared MUST default to `mode: 'blocked'` and surface an error toast. Drops with `mode: 'modal'` MUST snap the card back to its origin column and open the module-defined modal (closure / justification / composite manifest dialog); the state change MUST persist only on modal confirmation.

States with `terminal: true` MUST be implicitly blocked as both origin and destination, **unless** a transition declares `mode: 'modal'`. Cards rendered inside a `terminal: true` column MUST NOT be draggable. The `<KanbanBoard>` component SHALL consume the module's state machine and transitions to render columns and bind native HTML5 drag-and-drop handlers.

#### Scenario: Kanban renders N columns from the state machine

- **GIVEN** a module declares 4 states (`pending`, `in_progress`, `completed`, `rejected`) with orders 1, 2, 3, 4
- **WHEN** `<KanbanBoard>` mounts
- **THEN** exactly 4 columns render in left-to-right order matching the declared `order`, with each column header showing its `column_label`

#### Scenario: Undeclared transition is blocked with an error toast

- **GIVEN** a module declares no transition from `rejected` to `in_progress`
- **WHEN** the user drags a card from the `rejected` column and drops it on the `in_progress` column
- **THEN** the card snaps back to the `rejected` column, no state mutation occurs, and a `toast.error` is emitted explaining the transition is not allowed

#### Scenario: Modal transition opens the module modal before the state changes

- **GIVEN** a transition `(in_progress → completed)` declared with `mode: 'modal'`
- **WHEN** the user drops a card on the `completed` column
- **THEN** the card snaps back to `in_progress`, the module-defined closure modal opens, and the state is updated to `completed` only when the user confirms inside the modal

#### Scenario: Cards in terminal states are not draggable

- **GIVEN** a state declared as `terminal: true` (e.g. `imputado`, `archivado`)
- **WHEN** a card sits in that state's column
- **THEN** the card has no drag handle / `draggable` attribute, and the user cannot drag it to any other column unless a transition is explicitly declared with `mode: 'modal'`

---

### Requirement: Modules with multiple orthogonal state machines MUST declare axes and resolve via KanbanAxisDialog

When a module exposes more than one orthogonal state machine over the same record (e.g. an Inbox solicitud with both a workflow axis and an imputacion axis), the module SHALL declare `axes: Record<string, KanbanAxis>` on its config, where each axis carries `label: string`, `description?: string`, `stateField: string` (dot-path supported, e.g. `'state'` or `'fin.imput'`), `states: StateDeclaration[]`, `transitions: Transition[]`, optional `sideEffects?: Record<string, SideEffectFn>`, and optional `readOnly?: boolean`.

On the first activation of the Tablero view per session for a multi-axis module, a `<KanbanAxisDialog>` MUST open listing the available axes (with description and a `read-only` chip when `readOnly: true`). The user's choice MUST persist in session storage scoped per module. The board header SHALL render an inline **axis tab strip** (one chip-tab per declared axis, prefixed by an `EJES` micro-label) for fast switching, with the active axis tab highlighted using the brand token (`bg-brand-bg / text-brand`) and read-only axes annotated with a small `RO` suffix chip. Clicking a non-active tab SHALL emit `update:axisId` from `<KanbanBoard>` carrying the new axis id; the page SHALL bind the emit to its persistence helper and switch immediately without re-opening the descriptive dialog. The legacy single-button "Cambiar eje" CTA is REMOVED — pages MAY still listen for the `change-axis` event if they want a custom path to re-open the descriptive dialog, but the inline tabs are the primary affordance.

For single-axis modules (`Object.keys(axes).length === 1`) the tab strip MUST NOT render — the page falls back to the textual `Organizando por: <label>` line, since there is nothing to switch between.

The board MUST resolve and mutate the state via `_resolveField(record, stateField)` and `_setField(record, stateField, value)` so that dot-paths work (`'fin.imput'` reads/writes `record.fin.imput`).

Two axes declared with the same `stateField` MUST be rejected by the framework at registration time with a developer-facing error — a precondition restated from `core-error-handling`'s anti-pattern register. Axes with `readOnly: true` SHALL render their columns and cards but MUST block any drop attempt and emit `toast.info('Eje en sólo lectura')` instead of mutating the record.

A module that declares only `states + transitions` (no `axes`) MUST be auto-promoted to a single `'default'` axis with the same fields and the dialog MUST be skipped — single-machine modules behave as before.

#### Scenario: First Tablero activation opens the axis dialog

- **GIVEN** a module declares `axes: { workflow: {...}, imputacion: {...} }` and the user has not yet chosen an axis in this session
- **WHEN** the user switches to the Tablero view for the first time in this session
- **THEN** `<KanbanAxisDialog>` opens listing both axes with their `label` and `description`, and the kanban does not render columns until the user confirms a choice

#### Scenario: Multi-axis board renders inline tab strip in header

- **GIVEN** a module declares `axes: { 'fin.imput': {...}, 'fin.conc': {...}, 'ops.status': { read_only: true, ... } }` and the user has chosen the `fin.imput` axis
- **WHEN** the kanban renders
- **THEN** the board header shows an `EJES` micro-label followed by three chip-tabs (Imputación contable / Conciliación bancaria / Estado operativo); the `fin.imput` tab is highlighted as active; the `ops.status` tab carries an inline `RO` suffix chip; NO `Cambiar eje` button is rendered

#### Scenario: Clicking a non-active tab switches axes via update:axisId

- **GIVEN** the board renders with `fin.imput` active and the `fin.conc` tab visible
- **WHEN** the user clicks the `fin.conc` tab
- **THEN** `<KanbanBoard>` emits `update:axisId` with `"fin.conc"`, the page persists the new choice, the columns re-render against the conciliación states, and the `fin.conc` tab takes the active styling

#### Scenario: Clicking the active tab is a no-op

- **GIVEN** the board renders with `fin.imput` active and the user clicks the `fin.imput` tab
- **WHEN** the click is processed
- **THEN** `<KanbanBoard>` does NOT emit `update:axisId` AND the dialog does NOT re-open

#### Scenario: Single-axis board hides the tab strip

- **GIVEN** a module declares exactly one axis on its kanban
- **WHEN** the board renders
- **THEN** no tab strip is rendered AND the board header shows `Organizando por: <axis.label>` as the only header content

#### Scenario: Axis choice persists per module across the session

- **GIVEN** the user has chosen the `imputacion` axis for module `inbox`
- **WHEN** the user navigates to a different module and then back to `inbox` and re-activates Tablero
- **THEN** the kanban renders with the `imputacion` axis active without re-opening the dialog AND the inline tab strip shows `imputacion` as active

#### Scenario: Read-only axis blocks drops with an info toast

- **GIVEN** an axis declared with `readOnly: true`
- **WHEN** the user drags any card from one column and drops it in another
- **THEN** the card snaps back to its origin column, no state mutation occurs, and a `toast.info('Eje en sólo lectura')` is emitted

#### Scenario: Two axes with the same stateField are rejected at registration

- **GIVEN** a module declares two axes both pointing to `stateField: 'state'`
- **WHEN** the module's config is registered
- **THEN** the framework throws a developer-facing error and the kanban does not mount

### Requirement: Severity MUST be glanceable via colored left border on cards and inset shadow on rows

When a record carries a `severity` field with one of the values `'critical' | 'high' | 'medium' | 'low'`, the rendered surface SHALL apply a glanceable severity treatment in addition to any badge:

- In Tarjetas and Tablero, the `<CardItem>` / kanban-card SHALL apply a 3px colored **left border** via a class matching the severity value (`severity-critical`, `severity-high`, `severity-medium`, `severity-low`).
- In Lista, the table row SHALL apply an **inset box-shadow** on the first cell (the ID cell) using the same severity class on the `<tr>` (e.g. `tr.severity-critical > td:first-child`).

Color mapping (consumed from `core-theming` semantic tokens, no new colors invented):

- `critical` → `--danger`
- `high` → `--warning`
- `medium` → `--info`
- `low` → `--t4`

The default sort for any list / grid / kanban-column rendering severity-bearing records MUST order by severity (`critical → high → medium → low`) and break ties by recency (`updatedAt` descending, falling back to `createdAt`). A `<Badge>` next to the title MAY also color per severity, but the border / shadow is the glanceable layer and MUST NOT be omitted in favor of the badge alone.

#### Scenario: Critical severity renders a red left border on cards

- **GIVEN** a record with `severity: 'critical'`
- **WHEN** it is rendered as a `<CardItem>`
- **THEN** the card has a 3px left border in the `--danger` color via the `severity-critical` class, regardless of whether a severity badge is also present

#### Scenario: Severity treatment applies to table rows via inset shadow on the first cell

- **GIVEN** a record with `severity: 'high'` rendered in Lista
- **WHEN** the row paints
- **THEN** the `<tr>` carries the `severity-high` class and the first cell (`td:first-child`, the ID cell) shows an inset box-shadow in the `--warning` color

#### Scenario: Default sort orders by severity then recency

- **GIVEN** a list of records `[A: low, oldest], [B: high, newest], [C: critical, middle], [D: critical, oldest], [E: medium, newest]`
- **WHEN** the default sort is applied
- **THEN** the order is `[C, D, B, E, A]` — critical records first (with C before D because C is more recent), then high, then medium, then low

---

### Requirement: Every record-list table MUST render a leftmost monospaced ID column that is never user-hidden

Every record-list table SHALL render the record ID as the leftmost column. The header SHALL use the canonical uppercase letter-spaced typography token (`text-[10px] font-bold uppercase tracking-wider text-t-3`) with the literal text `ID`. The cell content SHALL use a monospaced font family (e.g. via the `font-mono` Tailwind utility or the `--font-mono` CSS variable) so that `R-007` and `R-128` align column-wise.

IDs SHALL follow the canonical shape `<PREFIX>-<NNN>` (zero-padded sequential when generated). The default prefix when no module-specific prefix is declared is `R` (`R-NNN`). Modules MAY declare a domain-specific prefix at registration time (e.g. `MOV-NNN` for movements, `Q-NNN` for queries, `SOL-NNN` for solicitudes). The framework SHALL provide a `nextSequentialId(prefix: string)` utility for ID generation.

The ID column MUST NOT be user-hideable — even when a future "Configurar columnas" feature lands, the ID column SHALL be exempt from user hiding so that lists always have a referenceable identifier.

#### Scenario: ID column is leftmost and uses monospaced typography

- **GIVEN** any record-list table
- **WHEN** the table renders
- **THEN** the leftmost `<th>` shows the literal text `ID` in the canonical uppercase token, and every `<td>` in that column uses a monospaced font so IDs align column-wise

#### Scenario: Module with a domain-specific prefix uses that prefix

- **GIVEN** a `movements` module that declares ID prefix `MOV` and creates a new record
- **WHEN** the new record is persisted
- **THEN** its ID is `MOV-{N}` where `{N}` is the next sequential number for that prefix (zero-padded to at least 3 digits, e.g. `MOV-007`, `MOV-128`)

#### Scenario: User cannot hide the ID column

- **GIVEN** a future column-config UI exposes a "hide column" affordance
- **WHEN** the user attempts to hide the ID column
- **THEN** the affordance is disabled (or absent) for the ID column with a tooltip explaining `La columna ID no se puede ocultar`, and the column remains visible

---

### Requirement: Tables MUST render an Acciones column at the rightmost position when per-row actions exist and MUST omit it entirely otherwise

Every record-list table SHALL terminate with an Acciones column at the rightmost position whenever the module declares one or more per-row actions (per `core-actions-menu`). The Acciones column hosts the per-row ⋯ trigger that opens the `ActionsMenu.vue` portal. The header SHALL be centered and the column SHALL be width-constrained to approximately 40px (already covered by the existing `Table headers MUST follow uppercase, letter-spaced typography` requirement; this requirement enforces presence/absence, not styling).

When a module declares no per-row actions for the rendered record type, the Acciones column SHALL be **omitted entirely** — the table MUST NOT render an empty column, a placeholder dash, or a disabled trigger. The omission is the contract that signals "this list has no per-row actions".

If actions exist but are all currently disabled for a specific record (capabilities + state both block them), the ⋯ trigger MUST still render — the column is not omitted in this case. The dropdown opens with all items disabled and each item shows its dtag + tooltip per `core-actions-menu`.

#### Scenario: Module with per-row actions renders the Acciones column

- **GIVEN** a module declares one or more per-row actions for a record type
- **WHEN** the table renders
- **THEN** the rightmost column is the Acciones column with a centered `Acciones` header and a ⋯ trigger in every data row

#### Scenario: Module without per-row actions omits the column entirely

- **GIVEN** a module declares zero per-row actions for a record type (e.g. a read-only catalog list)
- **WHEN** the table renders
- **THEN** there is no rightmost Acciones column — the last `<th>` is the last domain column, no ⋯ triggers exist, and the table consumes no horizontal space for an empty actions column

#### Scenario: Actions exist but all are disabled for a row — column still renders

- **GIVEN** a module declares per-row actions but for a specific record every action is disabled (capabilities + record state both block them all)
- **WHEN** the user clicks the ⋯ trigger for that row
- **THEN** the dropdown opens with every item rendered in the disabled state with its dtag + native `title` tooltip per `core-actions-menu`, and the column itself remains present for that row and every other row

---

### Requirement: Tables MAY expose a derived imputacion badge that uses the canonical Badge color mapping

A module MAY opt in to rendering a derived `imputacion` badge alongside the state badge. When the module opts in, the badge SHALL be rendered via the canonical `<Badge>` component (per `core-theming` and `core-actions-menu`) using the canonical state-color mapping:

- `pendiente` → `warning` variant
- `en_proceso` → `info` variant
- `imputado` → `success` variant

The computation of the imputacion value (which compares the manifest engine's `required_imputations[]` against the record's filled fields) is owned by `core-actions-manifest` and is NOT redefined here. This requirement governs only the rendering contract: when a module opts in, the value MUST be computed by the manifest engine and the badge MUST use the canonical mapping above — modules MUST NOT define their own colors for these three values.

When a module renders an imputacion-axis kanban (per the multi-axis requirement), cards in the terminal `imputado` state MUST NOT be draggable on that axis (cross-reference to `Tablero view MUST be state-driven with one column per declared state` — `terminal: true` cards are not draggable).

#### Scenario: Imputacion badge uses the canonical color mapping

- **GIVEN** a module opts in to the imputacion badge and the manifest engine computes `en_proceso` for a record
- **WHEN** the badge renders next to the title
- **THEN** the `<Badge>` uses the `info` variant (blue) and the visible text is `En proceso`

#### Scenario: Module cannot override the canonical imputacion colors

- **GIVEN** a module that opts in to the imputacion badge
- **WHEN** the developer attempts to override the variant for `pendiente` (e.g. to `danger` instead of `warning`)
- **THEN** the framework either rejects the override at registration time or the override is documented as a violation of this requirement and flagged in code review — the canonical mapping is not negotiable per module

#### Scenario: Imputado cards are not draggable on the imputacion-axis kanban

- **GIVEN** a multi-axis module with the `imputacion` axis active and a record currently in the terminal `imputado` state
- **WHEN** the kanban renders and the user attempts to drag the card
- **THEN** the card has no `draggable` attribute, the user cannot pick it up, and the column header for `imputado` shows the same render as for any terminal column

---

### Requirement: Pagination state MUST be shared across all views of the same module

The page-size limit selected in any view of a module SHALL apply to all views of the same module. Switching from Lista to Tarjetas to Tablero (or any combination) MUST NOT reset the active page to 1 and MUST NOT change the page-size limit. Server-side queries MUST reuse the same query key across views (e.g. `['records', { module, period, page, pageSize, search, ...filters }]`) so the cache is shared and switching views never re-fetches when the key is unchanged.

The pagination footer with the page-list + ellipsis (per the existing `Tables MUST support client-side pagination with ellipsis navigation` requirement) SHALL render only in Lista. In Tarjetas and Tablero the page-list footer MUST be replaced by a `Cargar más` button that, when clicked, fetches the next page worth of records and concatenates them into the current view. Modules MAY opt in to infinite scroll instead of `Cargar más` via a flag on the module config; the contract that the page-size still bounds each fetch SHALL hold.

The page-size selector itself SHALL render in the L3 footer in Lista. When the user is in Tarjetas or Tablero and changes the page-size by switching to Lista briefly and returning, the new page-size MUST persist for the original view without re-fetching all data.

#### Scenario: Switching views preserves page and page size

- **GIVEN** the user is on Lista, page 3, page-size 50
- **WHEN** the user switches to Tarjetas
- **THEN** Tarjetas renders the same 50 records that Lista was rendering on page 3 (no re-fetch, no reset to page 1, no change to page-size)

#### Scenario: Cards and Kanban replace page-list footer with Cargar más

- **GIVEN** the user is in Tarjetas with more pages available
- **WHEN** the L3 footer renders
- **THEN** there is no page-list with ellipsis and no `Page N of T` indicator — instead a `Cargar más` button is present, and clicking it fetches the next page worth of records and appends them to the visible cards

#### Scenario: Server-side query key is identical across views

- **GIVEN** a module backed by `vue-query` with key `['records', { module: 'inbox', period: 'q4-2025', page: 1, pageSize: 25 }]`
- **WHEN** the user switches between Lista, Tarjetas, and Tablero without changing any filter
- **THEN** the query key remains identical and `vue-query` does not issue a new fetch — all three views consume the same cached result

#### Scenario: Page-size change in Lista propagates to Tarjetas and Tablero

- **GIVEN** the user is in Lista with page-size 25 and switches to page-size 50
- **WHEN** the user later switches to Tarjetas (or Tablero)
- **THEN** Tarjetas (or Tablero) renders 50 records per page (or per `Cargar más` chunk) without re-fetching and without resetting the active page

### Requirement: A column change in the Tablero MUST always represent a record field update

Every successful drop in the Tablero (Kanban) view SHALL result in exactly one mutation observable on the dropped record: the value of the axis's `state_field` becomes the destination column's `state.id`. This is the canonical "column change == field update" contract. No drop SHALL leave the record visually moved without the corresponding field write, and conversely no card SHALL render in a column that doesn't match its current `state_field` value.

The mutation MUST be applied via one of two paths, selected by the declared transition's `mode`:

- **`mode: 'free'`** — the framework SHALL apply the mutation directly with no further user input. The canonical helper is `applyFreeTransition(record, axis, toState)` exported from `src/lib/kanban/transitions.ts`, which writes `record[axis.state_field] = toState` (with dot-path support so `'fin.imput'` writes `record.fin.imput`), then runs the optional named `side_effect` referenced by the transition. Pages SHOULD call this helper from their `transition` handler instead of hand-rolling the field write so that audit-log emission and side-effect dispatch stay consistent.

- **`mode: 'modal'`** — the card SHALL snap back to its origin column and the framework SHALL open a dialog that collects every field needed to satisfy the destination state. When the destination's dimension has more than one writer action declared in the `core-actions-manifest`, the dialog MUST be a composite (per `core-actions-manifest` Requirement 16) bundling the field groups of every applicable action. When the dimension has exactly one writer action and that action declares a non-empty `dialog.fields`, the dialog SHOULD render that single action's fields without a group wrapper. The state change MUST persist only on modal confirmation; cancel snaps back without mutation.

The `mode: 'free'` path is appropriate when the destination state can be reached without any user-supplied input (a pure state toggle, a boolean flag like `billed`, `sent`, `archived`, `published`). The `mode: 'modal'` path is appropriate when one or more writer actions on the dimension declare `dialog.fields` (a justification, a counterparty id, a date, a note). Choosing between the two is a manifest-authoring decision per transition; the framework MUST honor whichever is declared.

#### Scenario: A free-mode drop writes the state_field directly

- **GIVEN** an axis with declared transition `{ from: 'PEND', to: 'OK', mode: 'free' }` over `state_field: 'state'`
- **AND** a record with `record.state === 'PEND'`
- **WHEN** the user drops the card on the `OK` column
- **THEN** `record.state === 'OK'` after the drop AND no dialog opens AND the card moves to the `OK` column without a snap-back

#### Scenario: A free-mode drop honors dot-path state_fields

- **GIVEN** an axis with `state_field: 'fin.imput'` and a transition `{ from: 'PEND', to: 'IMP', mode: 'free' }`
- **AND** a record with `record.fin.imput === 'PEND'`
- **WHEN** `applyFreeTransition(record, axis, 'IMP')` is invoked
- **THEN** `record.fin.imput === 'IMP'` and any nested intermediate object is preserved

#### Scenario: A modal-mode drop opens a dialog and snaps back until confirmed

- **GIVEN** an axis with declared transition `{ from: 'PEND', to: 'CONC', mode: 'modal' }` and a writer action that declares a textarea field `note`
- **WHEN** the user drops the card on the `CONC` column
- **THEN** the card snaps back to `PEND` AND a dialog opens with the `note` field
- **WHEN** the user fills the field and confirms
- **THEN** the dialog closes, `record[axis.state_field] === 'CONC'`, and the card lands in the `CONC` column

#### Scenario: A modal-mode drop with a multi-action dimension opens the composite dialog

- **GIVEN** an axis whose dimension has 3 writer actions, each declaring its own `dialog.fields`
- **WHEN** the user drops a card whose state matches a transition `{ from: 'PEND', to: 'IMP', mode: 'modal' }`
- **THEN** the dialog opens in composite mode (per `core-actions-manifest` Requirement 16) showing one field group per applicable action, with disabled groups visible but non-interactive

#### Scenario: A read-only axis blocks every drop with no field write

- **GIVEN** an axis declared with `read_only: true`
- **WHEN** the user attempts any drop on that axis
- **THEN** no `state_field` mutation occurs AND `applyFreeTransition` returns `false` AND the framework MAY surface a `toast.info` indicating the axis is read-only

