## MODIFIED Requirements

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

## ADDED Requirements

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
