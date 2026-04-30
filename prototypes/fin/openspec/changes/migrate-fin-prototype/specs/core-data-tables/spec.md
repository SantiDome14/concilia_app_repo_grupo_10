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
