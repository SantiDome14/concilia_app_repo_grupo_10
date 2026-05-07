# core-modals Specification

## Purpose

Define the modal surface patterns used across every Ardua core module. Modals are the canonical surface for create, detail, edit, and confirm operations. Consistency in overlay, structure, dismissal, and button placement ensures users recognize the interaction intent immediately.
## Requirements
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

### Requirement: Closure modal MUST capture justification before committing a state-machine modal transition

When a kanban transition declared in `core-data-tables` carries `mode: 'modal'`, the drag SHALL NOT mutate state directly. It SHALL open a `<ClosureModal>` Vue component that captures (a) a structured justification comment in a required `<textarea>` field, (b) any optional structured fields the transition declares (e.g., reason code dropdown, attachments) using the same dialog-field shape as the action manifest, and (c) `Confirm` (primary variant) and `Cancelar` (ghost variant) footer buttons. The state change SHALL commit only on Confirm; Cancel SHALL return the dragged card to its origin column with no mutation. Both terminal states in modules with binary outcomes (e.g., Alertas `resolved` and Alertas `dismissed`, Inbox `*→completed`) MUST use this modal — there is no "skip justification" path for terminals.

#### Scenario: Modal-mode drag opens the ClosureModal with a required justification textarea

- **GIVEN** a kanban transition is declared with `mode: 'modal'` from origin column `in_progress` to terminal column `completed`
- **WHEN** the user drags a card from `in_progress` and drops it on `completed`
- **THEN** the state mutation is deferred and `<ClosureModal>` mounts with a required `<textarea>` for the justification comment plus any structured fields declared on the transition

#### Scenario: Confirm commits the state change and persists the justification

- **GIVEN** a `<ClosureModal>` is open after a `mode: 'modal'` drag and the user has filled the required justification textarea
- **WHEN** the user clicks the `Confirm` primary button
- **THEN** the state change commits to the data source, the justification and any structured fields are persisted to the audit log alongside the transition, the card lands in the target column, and the modal closes

#### Scenario: Cancel returns the card to its origin column with no mutation

- **GIVEN** a `<ClosureModal>` is open after a `mode: 'modal'` drag
- **WHEN** the user clicks the `Cancelar` ghost button (or presses ESC)
- **THEN** the card returns to its origin column, no state change is committed, no audit entry is written, and the modal closes

#### Scenario: Both Alertas terminal transitions require the closure modal

- **GIVEN** an Alertas module declares two terminal states `resolved` and `dismissed`, each with a `mode: 'modal'` transition from active states
- **WHEN** a user drags a card to either terminal column
- **THEN** `<ClosureModal>` opens for both terminals with the required justification textarea — neither terminal SHALL allow a free `mode: 'free'` transition

### Requirement: Workflow-typed records MUST open a Drawer side panel as the canonical detail surface

Record types whose detail view is a workflow rather than a static read-only display SHALL declare `meta.detail = 'drawer'`. For those record types, the row click SHALL open a `<Drawer>` Vue component that slides in from the right edge of the viewport at full viewport height, instead of opening the Detail modal contracted in the baseline. The `<Drawer>` MUST host the following regions in this order: (1) **header** with record id, title, status badge, and close `✕` button; (2) **primary-actions** rendered inline at the top of the drawer body, immediately below the header — these are the same actions that the row actions menu exposes (resolved from the same actions source); (3) **summary information** organized into one or more named semantic sections (canonical labels: `INFORMACIÓN`, `CONTEXTO`, `DETALLES`, `ASIGNACIÓN` — apps MAY add their own section labels); (4) **Timeline** section listing chronological events with timestamps; (5) **Comments** thread with threaded replies and a comment composer at the bottom. The footer is OPTIONAL and is reserved for legacy or non-workflow secondary actions only — workflow records SHALL NOT place their primary actions in the footer. Record types without `meta.detail = 'drawer'` SHALL keep using the Detail modal — the Drawer is opt-in per record type.

#### Scenario: Row click on a record with meta.detail = 'drawer' opens the Drawer

- **GIVEN** a record type declares `meta.detail = 'drawer'` (canonical examples: Solicitudes in Inbox, Alertas)
- **WHEN** the user clicks any row of that record type in the table
- **THEN** the `<Drawer>` component slides in from the right edge of the viewport at full viewport height and the Detail modal does NOT open

#### Scenario: Drawer renders header, primary-actions, summary information, Timeline, and Comments regions

- **GIVEN** a `<Drawer>` is open for a Solicitud (or any workflow-typed record)
- **WHEN** the drawer renders
- **THEN** the regions render in this top-down order: header (record id + title + status badge + close `✕`), primary-actions row (the record's available actions rendered inline as buttons), one or more summary-information sections each labeled with a semantic header (e.g. `INFORMACIÓN`, `CONTEXTO`, `DETALLES`, `ASIGNACIÓN`), a Timeline region with chronological timestamped events, and a Comments thread with threaded replies and a composer

#### Scenario: Record types without meta.detail = 'drawer' keep using the Detail modal

- **GIVEN** a record type does NOT declare `meta.detail = 'drawer'` (e.g., a static catalogue record)
- **WHEN** the user clicks a row of that record type
- **THEN** the existing Detail modal opens per the baseline contract and the `<Drawer>` does NOT mount

#### Scenario: Drawer primary-actions resolve from the same source as the row actions menu

- **GIVEN** a `<Drawer>` is open for a record whose row actions menu exposes actions A, B, and C
- **WHEN** the drawer's primary-actions region renders
- **THEN** the region exposes the same actions A, B, and C resolved from the identical actions source — divergence between the two surfaces is forbidden, AND these actions render inline at the top of the drawer body, NOT in the footer

#### Scenario: Comment composer is the bottom-most interactive element of the drawer body, not a footer row

- **GIVEN** a `<Drawer>` is open for a workflow-typed record with the Comments thread populated and a footer slot left empty
- **WHEN** the user reads the drawer top-down
- **THEN** after the Timeline and the Comments thread, the comment composer (textarea + "Comentar" button) is the last interactive element inside the body — there is NO additional row of primary action buttons in the footer; primary CTAs were already presented at the top of the body via the primary-actions region

#### Scenario: Footer is reserved for legacy or non-workflow secondary actions only

- **GIVEN** a workflow-typed record's Drawer is open
- **WHEN** the page authors decide where to place the record's primary actions
- **THEN** the actions MUST go into the primary-actions region at the top of the body; placing them inside the footer slot is a contract violation, AND the footer slot remains available exclusively for legacy or non-workflow secondary affordances (e.g. a "Cerrar drawer" link, a non-action informational summary)

### Requirement: Modals MUST support a local info-notice bar distinct from the global alert banner

Every modal SHALL support an optional info-notice slot/region rendered between the modal header and the body's primary content. The notice SHALL be implemented as a `<ModalInfo>` Vue component with two variants: `info` (default, blue tint) and `warning` (amber tint). The notice is local to the modal instance — it appears when the modal opens and disappears when the modal closes. This notice is distinct from the persistent app-level alert banner contracted in `core-error-handling`: the alert banner is global, persists across routes, and uses four variants (`info`, `warning`, `danger`, `success`), whereas the modal info-notice is single-modal-scope and supports only `info` and `warning`. Use of the global alert banner inside a modal body is forbidden; use of `<ModalInfo>` outside a modal is forbidden.

#### Scenario: ModalInfo renders between header and body with the info variant by default

- **GIVEN** a modal author adds `<ModalInfo>` to a Create modal with copy `"Esta operación no es reversible."`
- **WHEN** the modal mounts
- **THEN** a one-line notice renders between the header and the body content using the `info` (blue tint) variant

#### Scenario: ModalInfo supports a warning variant for advisory context

- **GIVEN** a modal author adds `<ModalInfo variant="warning">` to a modal with copy `"Los cambios afectan a registros relacionados."`
- **WHEN** the modal mounts
- **THEN** the notice renders with the `warning` (amber tint) variant

#### Scenario: ModalInfo disappears when the modal closes

- **GIVEN** a modal with a `<ModalInfo>` is open
- **WHEN** the user closes the modal (ESC, backdrop click, Cancel, or successful confirm)
- **THEN** the modal unmounts and the `<ModalInfo>` is unmounted with it — the notice does NOT persist to the next modal opening or to the page-level surface

#### Scenario: The persistent alert banner is forbidden inside a modal body

- **GIVEN** a developer attempts to render the persistent alert banner from `core-error-handling` inside a modal body
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — modal-local notices use `<ModalInfo>` exclusively; the persistent alert banner is reserved for app-level system messages between Topbar and Main

### Requirement: Multi-axis kanban activation MUST open the KanbanAxisDialog on first session use

When a module exposes more than one kanban axis (per the multi-axis requirement in `core-data-tables`), the first kanban activation per session SHALL open a `<KanbanAxisDialog>` Vue component. The dialog SHALL list each declared axis as a selectable card, where each card shows the axis label, a one-line description, and a `read-only` chip when the axis is declared `readOnly: true`. Confirm SHALL persist the chosen axis to `sessionStorage` (key scoped per module) and render the kanban with that axis. Subsequent kanban activations within the same session SHALL render the persisted axis directly without re-opening the dialog. The dialog SHALL be re-openable via a `Cambiar eje` button rendered in the kanban board header — clicking it re-opens `<KanbanAxisDialog>` with the current axis pre-selected.

#### Scenario: First kanban activation per session opens the axis dialog

- **GIVEN** a module declares two or more axes via `MOD_AXES` (e.g., `imputacion` and `registro_contable`) and no axis is yet persisted in `sessionStorage` for that module
- **WHEN** the user activates the kanban view for the first time in that session
- **THEN** `<KanbanAxisDialog>` opens with one selectable card per declared axis, each showing the axis label, description, and the `read-only` chip when applicable

#### Scenario: Confirm persists the choice and renders the kanban with the chosen axis

- **GIVEN** a `<KanbanAxisDialog>` is open and the user selects the `imputacion` axis card
- **WHEN** the user clicks `Confirmar`
- **THEN** `imputacion` is persisted to `sessionStorage` for the module, the dialog closes, and the kanban renders columns derived from the `imputacion` axis state machine

#### Scenario: Subsequent activations skip the dialog within the same session

- **GIVEN** a user previously selected the `imputacion` axis in this session and the choice is persisted in `sessionStorage`
- **WHEN** the user navigates away and returns to the kanban view in the same session
- **THEN** the kanban renders directly with the `imputacion` axis and `<KanbanAxisDialog>` does NOT open

#### Scenario: Cambiar eje button re-opens the dialog with the current axis pre-selected

- **GIVEN** a kanban view is rendering with the `imputacion` axis and a `Cambiar eje` button is visible in the kanban board header
- **WHEN** the user clicks `Cambiar eje`
- **THEN** `<KanbanAxisDialog>` re-opens with the `imputacion` card pre-selected, allowing the user to switch to a different declared axis

### Requirement: Portal-style overlays MUST register with the useGlobalPortals aggregator for outside-click dismissal

Every portal-style overlay rendered by the template (Action menus, filter dropdowns, form Selects, custom Selects, kanban drag-card preview, and any future portal-style overlay) SHALL register itself with a single global aggregator. The Vue equivalent is a `useGlobalPortals()` composable backed by a Pinia `usePortalsStore`. The composable SHALL expose `register(close: () => void): id`, `unregister(id: number): void`, and `closeAll(): void`. Portals MUST register their `close` callback on mount and de-register on unmount. ONE document-level outside-click handler (mounted in `App.vue`) SHALL invoke `closeAll()`. Direct `document.addEventListener('click', ...)` handlers per portal are forbidden — every new portal-style overlay MUST be added to the aggregator at registration time.

#### Scenario: Portals register with useGlobalPortals on mount and de-register on unmount

- **GIVEN** a new portal-style overlay component (e.g., a custom Select dropdown) is being authored
- **WHEN** the component mounts and later unmounts
- **THEN** the component MUST call `useGlobalPortals().register(closeFn)` on mount, store the returned id, and call `useGlobalPortals().unregister(id)` on unmount

#### Scenario: A document-level outside-click closes every registered portal

- **GIVEN** an Action menu, a filter dropdown, and a form Select are simultaneously open and all three are registered with `useGlobalPortals()`
- **WHEN** the user clicks anywhere on the document outside any of the three open portals
- **THEN** the single document-level click handler in `App.vue` invokes `closeAll()` and every registered portal's `close` callback fires, closing all three in one pass

#### Scenario: Direct document.addEventListener handlers per portal are forbidden

- **GIVEN** a developer attempts to add a `document.addEventListener('click', closePortal)` inside a new portal-style overlay
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — outside-click dismissal is owned exclusively by the aggregator; per-portal document listeners are a spec violation

#### Scenario: A portal that fails to de-register on unmount is a contract violation

- **GIVEN** a portal-style overlay registers a `close` callback on mount but does not call `unregister` on unmount
- **WHEN** the component is unmounted and a subsequent outside-click fires `closeAll()`
- **THEN** the dangling callback risks invoking on a destroyed component — this constitutes a contract violation; every registered portal MUST de-register on unmount

