# Design — extend-core-data-tables-from-prototype

## Context

This is the largest capability extension in the v1.15 prototype migration. The current `core-data-tables` baseline establishes the **single-view list** as the canonical surface: bordered, paginated, searchable, filterable, with a row-click detail and an empty state. Eight requirements, every one of them load-bearing.

What the baseline leaves out — and what `prototypes/_core-template/` v1.15 has been operating with for over a year of internal use — is the **adaptive layer** that turns that list into a module surface that responds to data shape: alternative views (`Tarjetas`, `Tablero`), state-driven kanban, multi-axis state machines, severity rendering, ID-as-first-column, period-as-privileged-filter, and pagination that is owned at the module level rather than at the view level.

This document captures the conceptual model behind the ten new requirements, the alternatives we considered, and the tradeoffs we accepted. It is intentionally substantial because the kanban / multi-axis layer is the most complex pattern in the template and the part most likely to be reinvented incorrectly by an unguided agent.

---

## The conceptual model — views are visual representations, not data scopes

The single most important idea in this change is that **`Lista`, `Tarjetas`, and `Tablero` are not three different datasets. They are three visual representations of the same dataset.**

Concretely:

- The same filter state, the same search input, the same pagination limit, the same period filter, and the same query key drive all three views.
- Switching from Lista to Tarjetas does not reset page 1, does not re-fetch, does not invalidate the cache, does not flush the search input, and does not change the count of "{N} resultados".
- The toggle is a pure render-side concern: it picks which component renders the rows the data layer already produced.

This is why view declaration lives on the module config (`views: ('list' | 'cards' | 'kanban')[]`) and why pagination is shared (requirement #10). The wrong mental model — "Tarjetas is its own page with its own state" — is what we explicitly forbid. Two consequences:

1. The shared `renderCard(record, mode)` function in requirement #3 is the contract that makes Tarjetas and Tablero render the same record the same way. The `mode` argument (`'cards' | 'kanban'`) lets the function decide whether to show, say, the timestamp in the footer (Tarjetas) or omit it for density (Tablero) — but the title, badges, severity, and ID render the same.
2. The `useViewMode()` composable returned active view is reactive but the underlying query state is not view-scoped. The `<ViewToggle>` writes to `useViewMode()`, which writes to session storage, and that's it.

---

## Decision 1 — Period filter is a filter with privileges, not a separate concept

### The question

The README's anti-pattern list calls out "do not treat period as a separate conceptual category" — but it ALSO lists four privileges that period exclusively has. So is period a filter or not?

### The decision

Period **is** a filter. It lives in the L3 filter row, it produces filter chips, it can be cleared and re-set like any other filter. What separates it from generic filters is a set of UI privileges:

- **Mandatory.** Period never has a "Todos" option. The filter always has a value.
- **Explicit default.** Each module declares its default (e.g. "Q4 2025", "últimos 30 días", "octubre 2025"). The default is visible at first render.
- **Single-value.** Period is a radio, never a checkbox set. Multi-period queries are a separate feature deferred to V2.
- **Drives KPI aggregation.** When the L2 KPI strip aggregates over time (most modules), the period selected here is the aggregation window. The KPI cards re-compute when period changes, in addition to the table re-querying.

The fourth privilege is the one that justifies all the others. If period also drives KPI aggregation, then a generic "Todos" would mean "aggregate over all of history", which is meaningless for most modules and dangerous for some (a 5-year aggregation hides the trend). Forcing a default keeps the L2 strip honest.

### Implementation shape

Two acceptable shapes:

- **Page-local prop:** `defineProps<{ period: PeriodValue }>()` plus a child `<PeriodFilter>` that emits `update:period`. Suitable for simple modules.
- **Pinia store slice:** `usePeriodStore('mod-X')` exposing `period` ref + `setPeriod(v)` mutation. Suitable when multiple components in the module (KPI cards, table, kanban) all read period.

Both shapes drive the same query key (`['records', { period, page, pageSize, search, ...filters }]`) and the same KPI aggregation key. `setPeriod(v)` updates both atomically.

### Alternatives considered

- **Period as its own L2 toolbar above the KPIs.** Rejected. Putting period above the KPIs makes it look like KPIs are scoped by period and the table is not — which is wrong (both are scoped by period).
- **Period in L1 alongside segmentation.** Rejected. L1 is for module-level identity (title, segmentation, view toggle, main CTA), not for query filters. Period is a query filter.
- **Period as a free filter chip.** Rejected. Without the privileges, every module would add a "Todos" option and aggregate over forever-history.

---

## Decision 2 — Module view declaration is declarative, not derived

### The question

How does the framework know whether a module supports `Lista` only, `Lista + Tarjetas`, or all three? Two options: (a) the module declares it, (b) the framework derives it (e.g. "if state machine is declared, kanban is available").

### The decision

The module declares it. `views: ('list' | 'cards' | 'kanban')[]` on the module config. The `<ViewToggle>` renders only the declared views.

Why declare and not derive? Because some modules **could** support kanban (they have a state machine declared for some other reason — server-side filtering, audit trail, label coloring) but **shouldn't** (the user wouldn't think of the records as moving across columns). Declaration is intent-driven, derivation is shape-driven, and intent is what we want to lock.

The framework's responsibility is:

- If `views` is omitted, default to `['list']`.
- If `views` includes `'kanban'` but no state machine is declared, log a console warning and omit `'kanban'` from the toggle (defensive runtime behavior, covered also in `core-error-handling`).
- If `views.length === 1`, hide the `<ViewToggle>` entirely (one view doesn't need a toggle).
- Persist the active view in session storage keyed by module, so navigation back returns to the user's choice.

### Why session storage and not local storage

Session storage scopes to the browser tab. The user's view preference is a tab-level concern, not a device-level concern. Two tabs of the same app can show different views of the same module without bleeding state.

---

## Decision 3 — Tarjetas (Cards) shape: three mandatory zones, shared with Kanban

### The question

What are the rules of a card? Without rules, every module designs its own card and visual coherence dies.

### The decision

Three mandatory zones per `<CardItem>`:

- **Header** — record ID, title, status badges. The leftmost element is always the ID (so the user's eye anchors the same way as in the Lista view).
- **Body** — key-value summary of 2-4 fields the module decides matter.
- **Footer** — timestamp on the left, per-row ⋯ actions menu on the right.

The grid is `auto-fill, minmax(290px, 1fr)` so cards reflow naturally. Page size matches Lista's selected limit; switching to Tarjetas does not reset to page 1.

The `renderCard(record, mode)` function returns the card content used both by Tarjetas (`mode: 'cards'`) and by Kanban (`mode: 'kanban'`). The `mode` argument lets the function decide:

- In Tarjetas: full footer (timestamp + actions menu).
- In Kanban: condensed footer (actions menu only; timestamp folded into a tooltip on the card body for density).

Without this shared function, Tarjetas and Kanban would diverge over time as different developers touched each. With it, the contract makes divergence a deliberate act (you'd have to add a third `mode`).

### Why 290px minimum

Empirically, the smallest card that holds an ID, a 30-character title, two badges, and four body fields without truncation is ~270px. We added 20px of margin so cards don't feel cramped. Smaller cards lose the body summary; larger cards waste viewport on dense modules. 290px is the sweet spot from the prototype's 14 months of use.

---

## Decision 4 — Tablero (Kanban) is state-driven — N columns, not three

### The question

How many columns does the kanban have? The naive answer (and the one most kanban implementations bake in) is three: `Pending / In Progress / Done`. The right answer is: **as many as the module's state machine declares.**

### The decision

The Kanban view renders **one column per declared state**. The state declarations live on the module config:

```ts
type StateDeclaration = {
  id: string                  // e.g. 'pending', 'in_progress', 'completed', 'rejected'
  label: string               // human label inside the kanban card's badge
  column_label: string        // human label at the top of the column (may differ from label)
  order: number               // left-to-right ordering of columns
  terminal: boolean           // whether this state is an end of the lifecycle
}
```

Plus declarative transitions:

```ts
type Transition = {
  from: string
  to: string
  mode: 'free' | 'modal' | 'blocked'
  sideEffect?: string  // name of a function in module's sideEffects map
}
```

And a transitions-map that defaults to "blocked": any drag from `from` to `to` not declared as `'free'` or `'modal'` is rejected with a `toast.error`. Declared `'modal'` transitions open a domain-specific modal (closure / justification / composite manifest dialog) before the state actually changes — the drop visually snaps back until the modal confirms.

`terminal: true` states are implicitly blocked as both origin and destination, **unless** a transition explicitly declares `mode: 'modal'`. This is the rule that makes "no Re-imputar v1" expressible: `imputado` is terminal, no transition out of it is declared, so the cards are not draggable.

### Why N columns, not three

Three is wrong in 80% of real modules:

- An Inbox solicitud has four states: `pending → in_progress → completed → rejected`. With three columns, where does `rejected` go? Folded into Done? That hides reality.
- A Conciliacion has five states (`open / in_review / matched / partially_matched / closed`). Trying to fit five into three either drops information or invents a meta-column ("Other").
- An Alerta has six states by its alert type. Some alerts have three; some have six. Hardcoding three forces every alert type to use the same shape.

The right model is to let the module declare its lifecycle and render that. The framework does not invent columns.

### Why transitions are declarative

Three reasons:

1. **Default-blocked is a safety property.** If a transition is not declared, it cannot happen. Adding a new transition is an explicit act in the manifest, which means it is reviewable and testable.
2. **Side effects are named functions, not inline lambdas.** `sideEffect: 'computeImputation'` references a function registered in the module's `sideEffects` map. This makes side effects auditable and unit-testable.
3. **Modal transitions are a first-class shape.** The transition declares the modal intent up front (justify closure, fill required fields, open composite dialog); the framework wires the drag-and-drop interception. The module does not write drag handlers.

---

## Decision 5 — Multi-axis Kanban — when one state machine is not enough

### The question

Some records carry **more than one orthogonal lifecycle**. The canonical example is an Inbox solicitud that has both:

- A workflow axis: `pending → in_progress → completed → rejected`
- An imputation axis: `pendiente → en_proceso → imputado` (independent of the workflow)

A single record is at the same time at, say, `in_progress` on the workflow axis and `pendiente` on the imputation axis. Which axis does the kanban render?

### The decision

The user picks. On first activation per session, a `<KanbanAxisDialog>` opens listing the available axes (with description and a `read-only` chip when applicable). The user's choice persists in session storage; the board header shows the active axis label and a `Cambiar eje` button that re-opens the dialog.

Module config:

```ts
type KanbanAxis = {
  label: string
  description?: string
  stateField: string             // dot-path supported: 'state' or 'fin.imput'
  states: StateDeclaration[]
  transitions: Transition[]
  sideEffects?: Record<string, SideEffectFn>
  readOnly?: boolean             // if true, columns render but drag is blocked
}

type ModuleConfig = {
  axes?: Record<string, KanbanAxis>
  defaultAxis?: string
  // ... other fields
}
```

The framework's responsibility:

- Auto-promote single-machine modules to a single `'default'` axis (backwards compatibility — modules that declare `states + transitions` directly, without `axes`, are wrapped into an axis named `'default'` and the dialog is skipped).
- Resolve `stateField` via a `_resolveField(record, path)` helper that walks the dot path. `'state'` resolves to `record.state`; `'fin.imput'` resolves to `record.fin?.imput`. The setter (`_setField(record, path, value)`) walks the same path.
- Forbid two axes with the same `stateField` — covered as an anti-pattern in `core-error-handling`, restated here as a precondition. Two axes with the same field are the same machine in disguise; the right shape is one axis.
- Render `readOnly: true` axes with their columns visible but block any drop attempt with `toast.info('Eje en sólo lectura')`.

### Why a dialog and not a switcher in the header

The dialog is the right shape on first activation because the user needs to read the description of each axis before choosing. A header switcher is fine for changing later (and that's what `Cambiar eje` provides), but the first-time choice deserves a moment of focused attention — especially when one axis is `read-only` (which the dialog can explain) and one isn't.

### Why session storage scoped per module

Two reasons:

- A user who organizes the Inbox by workflow on one tab and by imputacion on another should not have those choices fight each other. Session-scoped state respects the tab.
- The choice is module-specific. Switching to a different module and back should keep the previously chosen axis. That's what the per-module key gives.

---

## Decision 6 — Severity differentiation — glanceable before the badge

### The question

When a record carries a severity signal (`critical / high / medium / low`), how does the user perceive it before reading any text?

### The decision

A 3px colored left border on the card / kanban-card, plus an inset box-shadow on the first cell of the table row. Class names match the severity value: `severity-critical`, `severity-high`, `severity-medium`, `severity-low`. Colors come from the existing `core-theming` semantic palette:

- `critical` → `--danger` (red)
- `high` → `--warning` (amber)
- `medium` → `--info` (blue)
- `low` → `--t4` (muted neutral)

Default sort orders `critical → high → medium → low`, with recency (`updatedAt` or `createdAt`) as the tiebreaker at equal severity.

### Why border / shadow and not just the badge color

Glanceability. The user's eye finds a colored 3px stripe at the edge of a card before it reads the badge inside the card. In a dashboard with 30 cards, you should be able to count the criticals in 2 seconds without reading a single word. The badge is for confirming the severity once you've focused on a specific record.

The badge next to the title also colors per severity (consistent with the same palette) — so a user who looks at the badge instead of the border still sees the right signal. The border / shadow is the **glanceable** layer; the badge is the **confirmable** layer.

### Why a 3px border and not 4px or 6px

3px is the smallest stripe that registers as deliberate signal at typical viewport zoom. 4-6px starts to feel like a structural element (the border becomes part of the card frame, not a signal); 1-2px disappears against the card border. 3px is the threshold from a year of prototype iterations.

---

## Decision 7 — Visible ID column — leftmost, monospaced, never hidden

### The question

Should the record ID be a column? Several modern table libraries hide the ID in favor of a "name" column on the assumption that the ID is internal plumbing. We disagree.

### The decision

The record ID is **always** the leftmost column. It uses monospaced typography (so `R-007` and `R-128` are the same width and read as identifiers, not text). The header is `ID` in the canonical uppercase letter-spaced token (per `core-forms` and the existing data-tables typography requirement). The user cannot hide this column.

### Why mandatory

In every Ardua core app, users routinely:

- Share record IDs with other users in chat / email ("revisa R-042").
- Reference IDs in support tickets and legal documents.
- Use IDs as primary keys in cross-app coordination (REPORT_DEPENDENCY, manifest-driven actions).

Hiding the ID forces the user to open the detail just to copy it. That's the wrong UX for a list designed to scan.

### Why monospaced

Monospaced ensures `R-007` and `R-128` align column-wise. Variable-width ID columns destroy the visual rhythm of the list, especially when the list is long.

### Why prefixes

The canonical default is `R-NNN` (`R` for "Record"). But apps SHOULD use a domain-specific prefix when one is meaningful:

- `MOV-NNN` for movements (movimientos contables).
- `Q-NNN` for queries (consultas de cliente).
- `SOL-NNN` for solicitudes (Inbox items).

The framework provides `nextSequentialId(prefix)` as a utility; modules pick the prefix at registration time. The prefix is a contract: `MOV-NNN` is always a movement, never a question.

### Why the ID is not user-hideable (when other columns might be)

A future "Configurar columnas" feature will let users hide secondary columns. The ID is exempt. Hiding the ID would let a user produce a list that cannot be referenced — a list of nameless rows. We make that impossible at the contract level.

---

## Decision 8 — Required Acciones column — present when actions exist, absent when they don't

### The question

Every existing data-tables module renders an Acciones column at the rightmost position, centered, ~40px fixed-width. Should that column always be there?

### The decision

The Acciones column is **mandatory whenever per-row actions exist** for the module (per `core-actions-menu`). When no per-row actions exist for a record type, the column SHALL be **omitted entirely** — no empty column, no placeholder dash.

The styling (centered, ~40px, ⋯ trigger from `core-actions-menu`) is already covered in the existing `Table headers MUST follow uppercase, letter-spaced typography` requirement. This new requirement enforces **presence**, not styling.

### Why omit instead of render-empty

An empty column wastes 40px of horizontal real estate and tells the user "actions exist but I have none for you" — which is the wrong signal. The right signal is "this module has no per-row actions, so there is no column to look at". Omission is the contract that makes that signal explicit.

### Edge case — actions exist but are all disabled

If actions exist but every action is currently disabled for a record (capabilities + state both block them all), the ⋯ trigger still renders. The dropdown opens with all items disabled, and each item shows its dtag + tooltip per `core-actions-menu`. The column is not omitted in this case — the actions exist, they just aren't applicable to this row right now.

---

## Decision 9 — Imputación derived badge — opt-in, computed by the manifest engine

### The question

Some modules want to show a third badge alongside state and severity: an `imputacion` badge that derives from "has the user filled the required fields the manifest asks for?". Where does this live?

### The decision

The computation lives in `core-actions-manifest` (a sibling capability extension covered in a different change). This requirement says: **tables that opt in render the badge using the canonical `<Badge>` component with the canonical color mapping.**

Mapping:

- `pendiente` → `warning` (amber) — required imputations not yet filled.
- `en_proceso` → `info` (blue) — some imputations filled, others outstanding.
- `imputado` → `success` (green) — all required imputations filled.

Cross-reference to requirement #4: cards in the terminal `imputado` state are not draggable on the imputacion axis. This is the "no Re-imputar v1" rule — once imputado, the record exits the kanban's drag surface for that axis. (It can still be dragged on a different axis if the module is multi-axis.)

### Why opt-in

Most modules don't need this. Forcing every module to render an imputacion badge would clutter the table for use cases that have no imputation flow. The opt-in shape (a flag on the module config that wires the badge) keeps the contract honest.

---

## Decision 10 — Pagination shared across views — module-level, not view-level

### The question

When a user changes the page-size limit in Lista to "50 per page" and then switches to Tarjetas, what page size should Tarjetas use?

### The decision

The same. Page size is a **module-level** concern, not a view-level concern. Switching from Lista to Tarjetas does not reset to page 1 and does not change the page size. The page size selected in any view applies to all views of the module.

The pagination footer renders only in Lista (the page-list with ellipsis from the existing requirement). In Tarjetas and Tablero:

- The page-list footer is replaced by a `Cargar más` button that loads the next page worth of records (concatenating into the current page).
- Modules MAY opt in to infinite scroll instead of `Cargar más` (a flag on the module config); the contract is that the page-size still bounds each fetch.

Server-side queries reuse the same query key (`['records', { page, pageSize, ...filters }]`) across views. The cache is shared. Switching views never re-fetches if the query key is identical.

### Why "Cargar más" instead of a page-list in Tarjetas / Tablero

Page-lists are designed for scanning a list with a known cardinality ("page 7 of 12"). Cards and Kanban are designed for scrolling: the user is exploring, not navigating to a specific page. `Cargar más` is the right shape for that exploration.

### Why module-level state and not page-level

Two reasons:

1. The user's intent ("show me more per page") is about the data they want to see, not about the visual representation. View switching shouldn't lose that intent.
2. Resetting to page 1 on view switch causes data to "jump" — if the user was on page 3 of Lista, then switched to Tarjetas, they should see the same records, just rendered differently. Resetting to page 1 violates the conceptual model from the start of this document.

---

## Composition with existing requirements

The eight existing `core-data-tables` requirements remain unchanged. The new requirements compose on top as follows:

| Existing requirement | How it interacts with new requirements |
|---|---|
| Tables MUST render inside a bordered, rounded surface | Lista renders inside this surface. Tarjetas / Tablero use their own grids (`<CardsGrid>`, `<KanbanBoard>`) — not bordered surfaces, but they share the parent module's L3 surface. |
| Table headers MUST follow uppercase, letter-spaced typography | Applies to Lista. ID column header uses the same token. Tarjetas / Tablero have no headers (they use card titles and column labels respectively). |
| Table rows MUST open a detail view on click | Applies to Lista. Cards open detail on card click (excluding the actions menu). Kanban cards open detail on card click (excluding the drag handle and actions menu). |
| Section header MUST expose search, filters, and result count | The L3 section header is the same across views. The view toggle lives in L1 (per `core-layout`), not in the section header. |
| Filter triggers MUST use the dropdown pattern | Period filter uses the same dropdown pattern with the four privileges. |
| Tables MUST support client-side pagination with ellipsis navigation | Lista uses this. Cards / Kanban replace the page-list with `Cargar más`. The page-size selector still appears in Lista's footer and drives all three views. |
| Empty states MUST be explicit | Each view has its own empty state: Lista renders the colspan row; Cards renders an `<EmptyState>` block in the grid; Kanban renders an empty column placeholder per state with a "Sin registros" muted line. |
| Tables MUST use the `useTable` composable for client-side data | Applies. The composable (or the `vue-query` server-side equivalent) drives all three views. The query key is module-level and shared across views (per requirement #10). |

---

## Anti-patterns explicitly forbidden

This change makes the following shapes explicit anti-patterns. Each is mentioned in scenarios in the spec delta:

- Declaring `views: ['kanban']` without a state machine — framework warns and omits the view.
- Declaring two axes with the same `stateField` — framework rejects at registration time.
- Hardcoding three columns in the kanban — N columns, declared by the state machine, period.
- Resetting page 1 when switching views — explicitly forbidden by requirement #10.
- Rendering an empty Acciones column — explicitly forbidden by requirement #8.
- Hiding the ID column via a column-config UI — explicitly forbidden by requirement #7.
- Putting period at the L2 level (above the KPI strip) — explicitly forbidden by requirement #1.
- Using a generic "Are you sure?" / "OK" pattern for kanban modal transitions — covered by `core-modals` confirmation dialog rules; restated here as a transition-mode contract.

---

## Risk and rollout

This change is **artifact-only at the contract level**. No application code is modified by this change itself. Real implementation of the new patterns will happen in subsequent OpenSpec changes when individual apps begin migration:

- `core-template`'s reference module will get a Tarjetas + Tablero implementation as a `feat:` change after this spec is archived.
- Each app migration (`core-ops`, `core-trd`, `core-app`, `core-lex`, future `core-fin`, `core-com`) will include its own kanban / multi-axis implementation drawn against this spec.

The rollout risk is the size of this change (10 new requirements, ~30 new scenarios). We mitigated it by:

- Keeping every requirement self-contained (each can be implemented and validated independently).
- Cross-referencing instead of duplicating (severity colors come from `core-theming`; modal contract comes from `core-modals`; manifest engine comes from `core-actions-manifest`).
- Composing on top of the existing baseline rather than rewriting it.

---

## Open questions deferred

The following are intentionally **not** specified in this change and will be addressed in follow-up changes:

- **Bulk actions.** Selecting multiple rows and applying an action to all is mentioned in `core-actions-manifest` (batch action shape) but the table-level interaction (checkbox column, "Select all" header, bulk-action bar above the table) is not defined here. Deferred.
- **Virtualization.** Kanban with 5 columns and 200 cards per column is the right place for row virtualization. Not in scope yet.
- **Light mode.** All severity colors will need a light-mode counterpart when the light-mode change lands. Deferred to V2 per `core-theming`.
- **Keyboard navigation in Kanban.** Drag-and-drop is currently mouse-only in the prototype. A11y of the kanban (keyboard-driven move, arrow keys between columns) is its own change. Deferred.
- **Tablero on touch devices.** HTML5 drag-and-drop on touch is unreliable; a touch-specific drop pattern (long-press to pick, tap target column to drop) is its own change. Deferred.
