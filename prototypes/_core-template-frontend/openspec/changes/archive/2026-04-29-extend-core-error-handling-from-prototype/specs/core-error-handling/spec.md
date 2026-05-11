## ADDED Requirements

### Requirement: Capability MUST formally register and surface seven prohibited anti-patterns

The capability SHALL maintain a normative anti-pattern register of seven named shapes that are formally prohibited across the template. Each anti-pattern SHALL be named with a stable kebab-case identifier, rationalized in one sentence, and tagged with at least one surface from the closed set `{ PR-review, dev-mode-warn, runtime-error }` indicating where the defect is detected. PR reviewers SHALL reject changes that introduce any of these shapes; where a `dev-mode-warn` tag is declared, the runtime SHALL emit a `devWarn(...)` call (per the unified `devWarn` requirement) when the shape is detected at module registration or at first render.

The seven anti-patterns are:

1. `segmentation-in-filter-dropdown` — putting Activos / Histórico (or any segmentation axis) in a granular filter dropdown instead of in the L1 Segmenter sub-tabs. **Surface:** `PR-review`. **Rationale:** segmentation is a mutually exclusive subset of the module universe with its own KPI denominator; a filter is a within-segment narrowing — they live on different axes (owned by `core-layout`).
2. `granular-filter-in-l1` — placing any granular filter trigger inside the page-header actions area. **Surface:** `PR-review`. **Rationale:** only `<Segmenter>`, `<ViewToggle>` and the Main CTA belong in the L1 actions area; granular filters live in the L3 section header (owned by `core-layout`).
3. `period-as-third-axis` — treating period as a third conceptual category alongside Segmentación and Vista. **Surface:** `PR-review`. **Rationale:** period is a filter with four UI privileges (mandatory, explicit default, single-value, KPI-window-defining) — not a separate axis (owned by `core-data-tables`).
4. `row-click-duplicated-in-actions-menu` — exposing "Ver detalle" (or any item that reproduces the row-click behavior) inside the per-row `<ActionsMenu>`. **Surface:** `PR-review`. **Rationale:** row click already opens detail; the Acciones menu is for record-level operations, not navigation (owned by `core-actions-menu`).
5. `kanban-without-states` — declaring `'kanban'` inside a module's `views` array without a corresponding `states` (or `axes`) declaration. **Surface:** `dev-mode-warn` plus `PR-review`. **Rationale:** a kanban without a state machine has no columns and is a UX placeholder, not a view; the runtime SHALL emit `devWarn('VIEWS', 'module "<MOD>": kanban without states — view omitted', { module })` and SHALL omit `'kanban'` from the rendered `<ViewToggle>` (owned by `core-data-tables`).
6. `duplicate-state-field-axes` — declaring two `axes` whose `stateField` resolves to the same path (including dot-paths). **Surface:** `dev-mode-warn` plus test-rejected. **Rationale:** two axes over the same field are the same machine in disguise; the user-facing axis picker would be a coin flip; the runtime SHALL emit `devWarn('KANBAN', 'module "<MOD>": axes "<a>" and "<b>" share stateField "<f>"', { module, axes, stateField })` and the manifest validator SHALL reject the registration in tests (owned by `core-data-tables`).
7. `row-click-while-actions-menu-open` — the per-row Acciones cell omits `stopPropagation`, allowing a click inside the menu to also fire the row-click handler. **Surface:** `dev-mode-warn` plus `runtime-error` (test). **Rationale:** the structural rule (`stopPropagation` on the actions `<td>`) is owned by `core-actions-menu`; this register adds the dev-mode warning that fires when the runtime detects a row-click event arriving while an `<ActionsMenu>` is mounted for the same row — `devWarn('VIEWS', 'row click fired while ActionsMenu is open — missing stopPropagation', { module, recordId })`.

Adding an eighth anti-pattern, removing one, or changing a stable identifier SHALL require an OpenSpec change.

#### Scenario: Anti-pattern register exists with seven named entries

- **GIVEN** a developer or reviewer consults the capability spec
- **WHEN** they read the anti-pattern register
- **THEN** they find exactly seven named entries with stable kebab-case identifiers (`segmentation-in-filter-dropdown`, `granular-filter-in-l1`, `period-as-third-axis`, `row-click-duplicated-in-actions-menu`, `kanban-without-states`, `duplicate-state-field-axes`, `row-click-while-actions-menu-open`), each with a one-sentence rationale and at least one surface tag drawn from `{ PR-review, dev-mode-warn, runtime-error }`

#### Scenario: PR introducing a granular filter in L1 is rejected at review

- **GIVEN** a pull request adds a `<FilterDropdown>` to the `.ph-actions` (page-header actions) slot of a module
- **WHEN** the reviewer evaluates the change
- **THEN** the review SHALL be rejected with a citation of `granular-filter-in-l1`, and the reviewer SHALL request the developer move the filter to the L3 section header per `core-layout`

#### Scenario: Module declares `'kanban'` view without a state machine

- **GIVEN** a module registration declares `views: ['list', 'kanban']` and does not declare `states` (or `axes`)
- **WHEN** the runtime processes the registration in development
- **THEN** the runtime SHALL emit `devWarn('VIEWS', 'module "<MOD>": kanban without states — view omitted', { module: '<MOD>' })` and SHALL render the `<ViewToggle>` with only the `'list'` option

#### Scenario: Two axes share the same `stateField`

- **GIVEN** a module declares `axes: { axisA: { stateField: 'fin.imput', ... }, axisB: { stateField: 'fin.imput', ... } }`
- **WHEN** the runtime processes the multi-axis registration in development
- **THEN** the runtime SHALL emit `devWarn('KANBAN', 'module "<MOD>": axes "axisA" and "axisB" share stateField "fin.imput"', { module: '<MOD>', axes: ['axisA','axisB'], stateField: 'fin.imput' })` and the manifest validator test SHALL fail the registration

#### Scenario: Row click fires while an ActionsMenu is open for the same row

- **GIVEN** a per-row `<ActionsMenu>` is mounted for record `R-042` and the user clicks an action item
- **WHEN** the runtime detects that the row-click handler also fires for `R-042` in the same task
- **THEN** the runtime SHALL emit `devWarn('VIEWS', 'row click fired while ActionsMenu is open — missing stopPropagation', { module: '<MOD>', recordId: 'R-042' })` so the developer can add the missing `stopPropagation` per `core-actions-menu`

### Requirement: Dev-mode validation warnings MUST go through the unified devWarn helper

The capability SHALL define and export a single helper `devWarn(category, message, context?)` from `src/lib/devWarn.ts`. Every dev-time validation warning emitted by the template (manifest validator, view-toggle validator, axis validator, predicate evaluator on unknown keys, breadcrumb resolver on missing block, theme token resolver on missing variable) SHALL go through this helper. Direct calls to `console.warn` from template code are forbidden once this requirement is archived, with the sole exception of the `devWarn` helper's own internal call.

The helper SHALL satisfy the following contract:

- **Signature**: `(category: DevWarnCategory, message: string, context?: Record<string, unknown>) => void`.
- **Categories**: `DevWarnCategory` is a TypeScript union of seven literal strings — `'MANIFEST' | 'VIEWS' | 'KANBAN' | 'STATES' | 'PREDICATES' | 'BREADCRUMB' | 'THEME'`. TypeScript SHALL reject any other category at compile time.
- **Format**: when `context` is present, `console.warn('[<CATEGORY>] <message>', context)`; otherwise `console.warn('[<CATEGORY>] <message>')`.
- **Gate**: the first line of the helper SHALL be `if (!import.meta.env.DEV) return;` so production builds get a silent no-op and the helper body is dead-code-eliminated by Vite.

Adding a new category (e.g., `AUTH`, `FORMS`, `API`) SHALL require an OpenSpec change that updates this requirement, the `DevWarnCategory` union type, and the consuming validator.

#### Scenario: Helper exists with the seven canonical categories

- **GIVEN** the template exports `devWarn` from `src/lib/devWarn.ts`
- **WHEN** TypeScript type-checks a call site
- **THEN** the `category` argument SHALL be assignable from exactly the seven literal strings `'MANIFEST'`, `'VIEWS'`, `'KANBAN'`, `'STATES'`, `'PREDICATES'`, `'BREADCRUMB'`, `'THEME'` and nothing else

#### Scenario: Warning is emitted in development with prefix and context

- **GIVEN** the build is running in development (`import.meta.env.DEV === true`)
- **WHEN** a validator calls `devWarn('MANIFEST', 'action "approve" missing dimension', { actionId: 'approve' })`
- **THEN** `console.warn` SHALL be invoked exactly once with the first argument equal to `'[MANIFEST] action "approve" missing dimension'` and the second argument equal to `{ actionId: 'approve' }`

#### Scenario: Helper is a silent no-op in production

- **GIVEN** the build is running in production (`import.meta.env.DEV === false`)
- **WHEN** any validator calls `devWarn(...)` with any arguments
- **THEN** `console.warn` SHALL NOT be invoked, and the body of `devWarn` SHALL be dead-code-eliminated by Vite at build time

#### Scenario: Direct `console.warn` calls are forbidden in template code

- **GIVEN** a developer or AI agent introduces a direct `console.warn(...)` call inside `src/` (excluding `src/lib/devWarn.ts` itself)
- **WHEN** the change is reviewed
- **THEN** the review SHALL be rejected and the developer SHALL be instructed to route the warning through `devWarn(category, message, context?)` with the appropriate canonical category

#### Scenario: Adding a new category requires an OpenSpec change

- **GIVEN** a developer wants to introduce a new validator subsystem (e.g., `AUTH`)
- **WHEN** they need to emit warnings under a new category
- **THEN** they SHALL submit an OpenSpec change that updates this requirement, adds the new literal to the `DevWarnCategory` union type in `src/lib/devWarn.ts`, and references the consuming validator — they SHALL NOT add the literal directly without the spec change

### Requirement: Undeclared kanban transitions MUST be blocked with toast, card-return, and telemetry

When a kanban drop targets a state transition that is not declared in the module's `transitions` map (or that originates from / lands in a terminal state without a `mode: 'modal'` declaration), the runtime SHALL block the transition by default. Block behavior SHALL be:

1. **Reject the drop** — no state mutation, no `on_confirm` execution, no side effects fired.
2. **Return the card to its origin column** on the next tick, with no animation glitch.
3. **Emit `toast.error('Transición no permitida')`** via the shared `vue-sonner` `toast` API. The toast description SHALL identify the origin and target state names (e.g., `'De PENDING a CLOSED'`).
4. **Emit a `kanban.transition.blocked` telemetry event** via `useTelemetry().track('kanban.transition.blocked', payload)` with payload shape `{ module: string, axis: string, recordId: string, fromState: string, toState: string, reason: 'undeclared' | 'terminal-origin' | 'terminal-destination' }`.

Terminal states SHALL be implicitly blocked as both origin (cards in terminal columns are not draggable — the drag handler is not bound) and destination (drops onto terminal columns are rejected with `reason: 'terminal-destination'`), unless the relevant transition declares `mode: 'modal'`. When `mode: 'modal'` is declared, the closure modal owned by `core-modals` SHALL open instead, and the state change SHALL commit only on confirm.

#### Scenario: Drop on undeclared transition shows toast and returns card

- **GIVEN** a module declares `transitions: { PENDING: { IN_PROGRESS: { mode: 'free' } } }` and a card in `PENDING` state is dragged to the `CLOSED` column
- **WHEN** the user releases the drop
- **THEN** the runtime SHALL NOT mutate the record's state; the card SHALL return to the `PENDING` column on the next tick; `toast.error('Transición no permitida')` SHALL fire with description `'De PENDING a CLOSED'`; and `useTelemetry().track('kanban.transition.blocked', { module: '<MOD>', axis: '<AXIS>', recordId: '<ID>', fromState: 'PENDING', toState: 'CLOSED', reason: 'undeclared' })` SHALL be invoked exactly once

#### Scenario: Card in terminal state cannot be dragged

- **GIVEN** a module declares `states: { CLOSED: { terminal: true, ... } }` without a `CLOSED → *` transition declaring `mode: 'modal'`
- **WHEN** the user attempts to drag a card from the `CLOSED` column
- **THEN** the drag handler SHALL NOT be bound; the card SHALL NOT move; no `kanban.transition.blocked` event SHALL be emitted (the block is preventive, not reactive)

#### Scenario: Drop on terminal destination is rejected with terminal-destination reason

- **GIVEN** a module declares `states: { CLOSED: { terminal: true, ... } }` without a `* → CLOSED` transition declaring `mode: 'modal'`
- **WHEN** the user drops a card onto the `CLOSED` column
- **THEN** the runtime SHALL reject the drop, return the card to its origin column, fire `toast.error('Transición no permitida')`, and emit `useTelemetry().track('kanban.transition.blocked', { ..., reason: 'terminal-destination' })`

#### Scenario: `mode: 'modal'` transition opens closure modal instead of blocking

- **GIVEN** a module declares `transitions: { IN_PROGRESS: { CLOSED: { mode: 'modal' } } }`
- **WHEN** the user drops a card from `IN_PROGRESS` onto the `CLOSED` terminal column
- **THEN** the runtime SHALL NOT block the transition; the closure modal owned by `core-modals` SHALL open; the state change SHALL commit only on confirm; and no `kanban.transition.blocked` event SHALL be emitted

#### Scenario: Toast follows the title + description contract

- **GIVEN** a blocked transition fires its toast
- **WHEN** the toast renders
- **THEN** it SHALL use the shared `vue-sonner` `toast.error` surface (per the existing toast requirements in this capability) with title `'Transición no permitida'` and description identifying the origin and target state names — it SHALL NOT introduce a new toast surface or bypass the shared `<Toaster>` instance
