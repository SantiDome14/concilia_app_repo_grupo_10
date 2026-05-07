> Jira REQ: — (no Jira ticket; template-level capability extension derived from `prototypes/_core-template/` v1.15)
> Module: core-template (foundation)

# Extend core-modals with closure modal, drawer, info bar, axis dialog, and global portal aggregator

## Why

The current `core-modals` baseline contractualizes the four canonical modal flows that every Ardua core app needs from day one — Create, Detail, Edit, and Confirmation. That coverage is correct as a starting point, but it leaves five modal-surface patterns that the v1.15 reference prototype (`prototypes/_core-template/`) treats as first-class and that every Ardua core module will need the moment it starts wiring real lifecycle, multi-axis kanban, or persistent-message overlays:

1. **Closure / justification modal for state-machine transitions.** When a kanban transition is declared `mode: 'modal'` (the canonical case for Inbox `*→completed` and for Alertas terminals `resolved` and `dismissed`), the drag SHALL NOT mutate state directly. It SHALL open a closure modal that captures a structured justification comment plus any structured fields the transition declares, and the state change SHALL only commit on confirm. Without this contract, agents will either skip justification (an audit gap) or invent ad-hoc per-module dialogs (visual drift).
2. **Drawer with timeline as the canonical detail surface for record types whose detail is a workflow.** Solicitudes (Inbox) and Alertas have detail views that are not static read-only displays — they are timelines with comments and pending actions. The Detail modal pattern from the baseline does not fit. The prototype solves this with a slide-in side panel (`<Drawer>`). Without this contract, agents will overload the Detail modal with timeline content (bad fit) or invent a per-module drawer (drift).
3. **Modal info-notice bar.** Every modal SHALL be able to surface a one-line contextual notice between header and body (e.g. "Esta operación no es reversible.", "Los cambios afectan a registros relacionados."). This is distinct from the page-level alert banner already specified in `core-error-handling`: alert banners are global and persist across routes; the modal info-notice is local to a single modal instance and disappears when the modal closes. Without this contract, agents will misuse the global banner for in-modal context (wrong surface) or stuff the notice into the modal body where it competes with form fields.
4. **Multi-axis kanban dialog.** The companion `core-data-tables` change (`extend-core-data-tables-from-prototype`) introduces multi-axis kanban via `MOD_AXES`. The first-time activation of a multi-axis Tablero SHALL open a dedicated dialog that lets the user pick the axis. The choice persists in session storage and is re-openable via a "Cambiar eje" button in the kanban board header. Without this contract, agents will hardcode an axis or guess (wrong UX), or build inconsistent picker UIs per module.
5. **`closeAllPortals()` aggregator.** The prototype concentrates outside-click dismissal of every portal-style overlay (Action menus, filter dropdowns, form Selects, custom Selects, kanban drag-card preview) into a single function. Each portal registers and de-registers itself; one document-level click handler invokes the aggregator. Without this contract, every new portal-style overlay risks introducing its own document-level click listener — which leaks listeners, fights other portals over event ordering, and breaks the "outside click closes everything" invariant users have come to expect.

Closing these five gaps in the same change keeps the modal/overlay contract internally consistent: every overlay surface in the template now has a contracted behavior, a contracted dismissal pathway, and a contracted relationship to neighboring capabilities (state machine, multi-axis kanban, alert banners).

## What Changes

- **`core-modals`** — add five new requirements covering: (a) the closure / justification modal triggered by kanban transitions declared `mode: 'modal'`; (b) the `<Drawer>` side panel as the canonical detail surface for record types declaring `meta.detail = 'drawer'`; (c) the modal info-notice bar slot; (d) the `<KanbanAxisDialog>` for multi-axis Tablero activation; (e) the `useGlobalPortals()` aggregator (Vue equivalent of `closeAllPortals()`).
- **No changes** to other capabilities. `core-data-tables` declares the state-machine `mode: 'modal'` transitions and the `MOD_AXES` shape (separate change). `core-error-handling` already owns the global persistent alert banner. The five additions to `core-modals` complete the modal/overlay surface inventory by composing with — not duplicating — those neighbors.

## Capabilities

### Affected Capabilities

- `core-modals` — five new requirements added (closure modal, drawer, info-notice bar, axis dialog, portals aggregator)

### New Capabilities

None. This change extends an existing Tier 1 capability.

### Cross-capability dependencies

- Depends on `core-data-tables` (`extend-core-data-tables-from-prototype`) for the kanban transition declarations (`mode: 'modal'`) and the `MOD_AXES` shape that the closure modal and axis dialog react to.
- Composes with `core-error-handling` (alert banner contract) — this change explicitly distinguishes the modal info-notice (local) from the persistent alert banner (global).
- Composes with `core-actions-menu`, `core-data-tables`, and `core-forms` for portal registration in the aggregator.

## Notes

- All Vue artifact names are TypeScript / `<script setup>` PascalCase: `<ClosureModal>`, `<Drawer>`, `<ModalInfo>`, `<KanbanAxisDialog>`. The portals composable is `useGlobalPortals()` and is backed by a Pinia store.
- The drawer activation is opt-in per record type via a route-level `meta.detail = 'drawer'` declaration. Record types without that meta keep using the existing Detail modal contract — the change is purely additive.
- The `useGlobalPortals()` aggregator is a contract about WHERE portal dismissal lives, not an implementation detail. Components MUST register at mount and de-register at unmount; direct `document.addEventListener('click', ...)` handlers per portal are forbidden.
