## ADDED Requirements

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

Record types whose detail view is a workflow rather than a static read-only display SHALL declare `meta.detail = 'drawer'`. For those record types, the row click SHALL open a `<Drawer>` Vue component that slides in from the right edge of the viewport at full viewport height, instead of opening the Detail modal contracted in the baseline. The `<Drawer>` MUST host four regions in this order: (1) header with record id, title, status badge, and close `✕` button; (2) Timeline section listing chronological events with timestamps; (3) Comments thread with threaded replies and a comment composer; (4) footer with the record's available actions (resolved from the same actions source as the row's actions menu). Record types without `meta.detail = 'drawer'` SHALL keep using the Detail modal — the Drawer is opt-in per record type.

#### Scenario: Row click on a record with meta.detail = 'drawer' opens the Drawer

- **GIVEN** a record type declares `meta.detail = 'drawer'` (canonical examples: Solicitudes in Inbox, Alertas)
- **WHEN** the user clicks any row of that record type in the table
- **THEN** the `<Drawer>` component slides in from the right edge of the viewport at full viewport height and the Detail modal does NOT open

#### Scenario: Drawer renders header, Timeline, Comments, and footer regions

- **GIVEN** a `<Drawer>` is open for a Solicitud
- **WHEN** the drawer renders
- **THEN** it exposes a header (record id + title + status badge + close `✕`), a Timeline region with chronological timestamped events, a Comments thread with threaded replies and a composer, and a footer with the record's available actions

#### Scenario: Record types without meta.detail = 'drawer' keep using the Detail modal

- **GIVEN** a record type does NOT declare `meta.detail = 'drawer'` (e.g., a static catalogue record)
- **WHEN** the user clicks a row of that record type
- **THEN** the existing Detail modal opens per the baseline contract and the `<Drawer>` does NOT mount

#### Scenario: Drawer footer actions resolve from the same source as the row actions menu

- **GIVEN** a `<Drawer>` is open for a record whose row actions menu exposes actions A, B, and C
- **WHEN** the drawer footer renders
- **THEN** the footer exposes the same actions A, B, and C resolved from the identical actions source — divergence between the two surfaces is forbidden

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
