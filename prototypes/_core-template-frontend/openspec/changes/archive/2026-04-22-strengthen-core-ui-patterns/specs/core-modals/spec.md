## ADDED Requirements

### Requirement: Confirmation dialogs MUST follow the destructive action pattern

Confirmation dialogs triggered by destructive actions (delete, cancel, void, anular, dar de baja) SHALL follow a stricter pattern than Create / Detail / Edit modals. The dialog MUST use a narrow width (`max-w-sm`, ~24rem), a danger-accented header, a description that states exactly what will happen and whether it can be undone, a verb-specific action label on the right button (never generic "OK", "Sí", or "Confirmar"), a ghost-variant `Cancelar` button on the left, and MUST NOT dismiss on backdrop click. ESC SHALL still close the dialog (equivalent to clicking Cancelar).

#### Scenario: Dialog uses narrow width and danger-accented header

- **GIVEN** a destructive action is triggered
- **WHEN** the confirmation dialog mounts
- **THEN** the dialog container is capped at `max-w-sm` and the header renders a danger-tone icon plus a title in the `--danger` text color

#### Scenario: Description states the exact outcome

- **GIVEN** a confirmation dialog is being authored for a specific destructive action
- **WHEN** the developer writes the body copy
- **THEN** the copy MUST describe the concrete outcome, including the affected record identifier and whether the action can be undone (e.g. `"Esta operación eliminará el registro R-042 y no puede deshacerse"`) — generic copy such as `"¿Estás seguro?"` is forbidden

#### Scenario: Confirm button uses a verb-specific label

- **GIVEN** a confirmation dialog for a destructive action
- **WHEN** the footer renders the primary-action button
- **THEN** its label MUST be the specific verb of the action (`Eliminar`, `Cancelar orden`, `Anular`, `Dar de baja`) and its variant MUST be `danger` — generic labels `OK`, `Sí`, `Confirmar` are forbidden

#### Scenario: Cancelar is the ghost-variant left button

- **GIVEN** a confirmation dialog
- **WHEN** the footer renders
- **THEN** the left button is labeled `Cancelar`, uses the `ghost` variant, and invoking it closes the dialog without executing the destructive action

#### Scenario: Backdrop click does NOT dismiss the dialog

- **GIVEN** a confirmation dialog is open
- **WHEN** the user clicks on the overlay area outside the dialog content
- **THEN** the dialog remains open — this overrides the backdrop-dismissal behavior defined for other modal types; destructive actions MUST require an explicit Cancelar or Confirm choice

#### Scenario: ESC closes the dialog as a Cancelar-equivalent

- **GIVEN** a confirmation dialog is open
- **WHEN** the user presses `Escape`
- **THEN** the dialog closes, the destructive action is NOT executed, and no toast is emitted

#### Scenario: Successful resolution emits a success toast

- **GIVEN** the user confirms the destructive action and the operation succeeds
- **WHEN** the operation resolves
- **THEN** the dialog closes and a `toast.success(...)` is emitted with a verb-specific title (e.g. `Registro eliminado`) and a description identifying the affected record (`{id} — {name}`)

#### Scenario: Failed resolution keeps the dialog open

- **GIVEN** the user confirms the destructive action and the operation fails
- **WHEN** the error surfaces
- **THEN** the dialog remains open, a `toast.error(...)` is emitted with the failure reason, and the Confirm button returns to its enabled state so the user can retry or cancel
