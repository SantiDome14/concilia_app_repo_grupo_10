## ADDED Requirements

### Requirement: Modals MUST use a fixed overlay with blur and high z-index

Every modal SHALL render inside a fixed-position overlay that covers the full viewport, applies a darkened backdrop with blur, and uses a z-index high enough to sit above every other UI layer (tables, sidebar, topbar, toasts).

#### Scenario: Overlay covers the full viewport

- **GIVEN** any modal is being opened
- **WHEN** the modal mounts
- **THEN** a `position: fixed inset-0` overlay renders with a `bg-black/75 backdrop-blur-sm` treatment

#### Scenario: Modal sits above all other UI

- **GIVEN** a modal is open simultaneously with toasts or dropdown menus
- **WHEN** the stacking context is computed
- **THEN** the modal's z-index is 500 or higher, placing it above every other surface

### Requirement: Modals MUST support ESC and backdrop click dismissal

Every modal SHALL close when the user presses the ESC key OR clicks on the backdrop (overlay area outside the modal content). Clicking inside the modal content SHALL NOT dismiss it.

#### Scenario: ESC closes the modal

- **GIVEN** a modal is open
- **WHEN** the user presses `Escape`
- **THEN** the modal calls its close handler

#### Scenario: Backdrop click closes the modal

- **GIVEN** a modal is open
- **WHEN** the user clicks directly on the overlay area outside the modal content
- **THEN** the modal calls its close handler

#### Scenario: Clicking inside the modal does NOT close it

- **GIVEN** a modal is open
- **WHEN** the user clicks anywhere inside the modal content region
- **THEN** the modal remains open

### Requirement: Modals MUST follow the canonical structure — header, body, footer

Every modal SHALL be composed of three regions: a header (title, subtitle, close button), a body (form, detail grid, or confirmation copy), and a footer (action buttons aligned to the right with a top border separator).

#### Scenario: Header exposes title, subtitle, and close

- **GIVEN** any modal is being rendered
- **WHEN** the header region renders
- **THEN** the header exposes a bold title, an optional subtitle in the secondary text color, and a close button with an `✕` icon on the right

#### Scenario: Footer aligns buttons to the right with a separator

- **GIVEN** any modal is being rendered
- **WHEN** the footer region renders
- **THEN** the footer is separated from the body by a top border and aligns action buttons to the right with a consistent gap

### Requirement: Create modals MUST use the "Cancelar / Crear ..." button pair

Create modals SHALL expose two footer buttons: a ghost-style `Cancelar` button on the left, and a primary-style `Crear {Entity}` button on the right (icon + label).

#### Scenario: Cancelar uses the ghost variant

- **GIVEN** a Create modal is being rendered
- **WHEN** the footer renders
- **THEN** the left button uses the `ghost` variant of the shared `Button` component

#### Scenario: Primary CTA uses icon + label

- **GIVEN** a Create modal is being rendered
- **WHEN** the footer renders
- **THEN** the right button uses the `primary` variant and shows an icon (typically `Plus`) followed by the label `Crear {Entity}`

### Requirement: Detail modals MUST present data in a labeled grid

Detail (read-only) modals SHALL present record data in a two-column grid of labeled cells. Long fields (e.g. Name, Description, Value) MAY span both columns. Each cell SHALL expose an uppercase label token above the value.

#### Scenario: Grid uses two-column layout

- **GIVEN** a Detail modal is being rendered
- **WHEN** the body region renders
- **THEN** the body uses a two-column grid with cells that have their own bordered background

#### Scenario: Full-width cells for long fields

- **GIVEN** a field's content is expected to be long (Name, Description, Value)
- **WHEN** the detail grid renders that field
- **THEN** the cell spans both columns via `col-span-2`

#### Scenario: Detail modal footer exposes Cerrar and Editar

- **GIVEN** a Detail modal is being rendered
- **WHEN** the footer renders
- **THEN** the footer has a `Cerrar` ghost button on the left and an `Editar` primary button on the right that transitions into the Edit modal

### Requirement: Edit modals MUST transition from the Detail modal

Edit modals SHALL only be reachable by transitioning from the Detail modal. The canonical flow MUST be: open Detail modal from a row click, then click the `Editar` button to transition into the Edit modal. Direct Edit entry points (other than the table actions menu) are forbidden.

#### Scenario: Editar transitions cleanly

- **GIVEN** a Detail modal is open for a record
- **WHEN** the user clicks `Editar`
- **THEN** the Detail modal closes and the Edit modal opens immediately with a cloned copy of the record's data

#### Scenario: Save persists and closes

- **GIVEN** an Edit modal is open with valid form state
- **WHEN** the user submits the form
- **THEN** the change is persisted to the data source, the modal closes, and a success toast is emitted

#### Scenario: Cancel discards and closes

- **GIVEN** an Edit modal is open
- **WHEN** the user clicks Cancel
- **THEN** no changes are persisted and the modal closes

### Requirement: Modals MUST emit toast feedback on successful operations

Every Create, Edit, and destructive action triggered from a modal SHALL emit a success toast with a clear title and a description that identifies the affected record.

#### Scenario: Create emits a success toast

- **GIVEN** a Create modal with valid form state
- **WHEN** the record is successfully created
- **THEN** a success toast is emitted with title `Registro creado` and description `{id} — {name}` (adapted per domain)

#### Scenario: Edit emits a success toast

- **GIVEN** an Edit modal with valid form state
- **WHEN** the record is successfully edited
- **THEN** a success toast is emitted with title `Cambios guardados` and description `{id} — {name}` (adapted per domain)

### Requirement: Modal width MUST match the content density

Create and Edit modals SHALL use a narrow width (`max-w-md`, ~28rem). Detail modals SHALL use a medium width (`max-w-lg`, ~32rem). Confirmation modals (destructive) MAY use an even narrower width (`max-w-sm`, ~24rem).

#### Scenario: Create and Edit are narrow

- **GIVEN** a Create or Edit modal is being rendered
- **WHEN** the modal container applies its width class
- **THEN** the container width is capped at `max-w-md`

#### Scenario: Detail is medium

- **GIVEN** a Detail modal is being rendered
- **WHEN** the modal container applies its width class
- **THEN** the container width is capped at `max-w-lg`
