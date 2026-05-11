# Design — extend-core-modals-from-prototype

## Context

This design captures the rationale behind the five new requirements added to `core-modals` in this change. Each requirement closes a gap that became visible when comparing the v1.15 reference prototype (`prototypes/_core-template-frontend/`) against the current `core-modals` baseline. The baseline contracts the four canonical modal flows (Create, Detail, Edit, Confirmation); the prototype additionally relies on five surfaces that this change contractualizes:

1. Closure / justification modal (state-machine `mode: 'modal'`).
2. Drawer side panel as the canonical detail surface for workflow-typed records.
3. Modal info-notice bar (one-line contextual notice inside a modal body).
4. Multi-axis kanban dialog (axis picker for multi-axis Tablero).
5. Global portal aggregator (`useGlobalPortals()` / `closeAllPortals()`).

The design here explains the **why** behind each decision, the alternatives considered, the cross-capability boundaries, and the failure modes each rule prevents.

---

## Decision 1 — Closure / justification modal as the contracted surface for `mode: 'modal'` transitions

### The question

In the prototype, kanban transitions are declared per origin→target with one of three modes: `free` (drag commits the state change), `blocked` (drag is rejected with an explanation), `modal` (drag opens a justification dialog and commits only on confirm). The companion `core-data-tables` change introduces this contract. What `core-modals` needs to answer is: **what surface does `mode: 'modal'` open, and what is on it?**

### The decision

When a kanban transition declares `mode: 'modal'`, the drag SHALL open a `<ClosureModal>` component with:

- A required textarea for a structured justification comment (the "why" of the state change).
- Optional structured fields the transition declares (e.g., a reason code dropdown, attachments) — driven by the same dialog-fields shape used in the action manifest.
- A `Confirm` primary button and a `Cancelar` ghost button.
- Cancel returns the card to its origin column with no state mutation; Confirm commits the state change AND persists the justification to the audit log.

Both terminal states in modules with binary outcomes (Alertas `resolved` and Alertas `dismissed`, Inbox `*→completed`) MUST use this modal — there is no "skip justification" path for terminals.

### Alternatives considered

- **Inline confirmation in the column header.** Rejected. Justification text is wider than a kanban column header, and a textarea inside a column produces awkward focus management.
- **Reuse the generic Confirmation dialog from the baseline.** Rejected. The Confirmation dialog is for destructive actions with a yes/no choice — it does not capture structured input. Closure transitions are not destructive in the same sense; they are state changes that require a written rationale for audit.
- **A drawer that hosts both detail and closure form.** Considered. Rejected because closure is a focused, single-purpose interaction — a modal is the right surface for "stop and justify before this commits".

### Why this is in `core-modals` (not `core-data-tables`)

The transition declaration (which transitions are modal, which side effects fire) is a state-machine concern owned by `core-data-tables` via the multi-axis kanban requirement. The surface that opens (`<ClosureModal>`) is a modal contract — it lives in `core-modals`. The two compose: `core-data-tables` says "this transition opens a modal"; `core-modals` says "what the modal looks like and how it behaves".

### Failure modes the rule prevents

- A developer omits justification on a terminal transition → spec violation; both Alertas terminals require the modal.
- A developer wires an inline column-level confirmation instead of opening `<ClosureModal>` → spec violation.
- Cancel commits the state change → spec violation; state mutation MUST happen only on confirm.

---

## Decision 2 — `<Drawer>` as the canonical detail surface for workflow-typed records

### The question

The current `core-modals` Detail-modal contract (two-column grid of read-only cells, footer with `Cerrar` and `Editar`) fits records whose detail is a static snapshot — fine for catalogues and simple records. It does not fit records whose detail is a **workflow**: a Solicitud in Inbox or an Alerta lives through a chronological lifecycle of events, comments, and pending actions. Forcing those into the Detail modal grid produces either a cramped grid or a tall scrolling modal — both bad fits.

### The decision

For record types whose detail view is a workflow rather than a static read-only display, the row click SHALL open a `<Drawer>` (slide-in from the right edge, full viewport height) instead of a Detail modal. The Drawer is the canonical detail surface for those record types.

The activation contract is opt-in via a `meta.detail = 'drawer'` declaration on the record-type metadata (route-level meta, declared in the same place as `meta.breadcrumb` and `meta.block`). Record types without that meta keep using the existing Detail modal — this change is additive, not a replacement.

The `<Drawer>` SHALL host four regions:

- **Header:** record id + title + status badge + close `✕` button.
- **Timeline:** chronological events with timestamps (creation, state changes, attached files, comments).
- **Comments thread:** threaded replies plus a comment composer at the bottom.
- **Footer:** the available actions for the record (driven by the same actions-resolution as the row's actions menu).

### Alternatives considered

- **Inline-expand the row.** Rejected. Loses the visible context of the rest of the table and the timeline does not fit in a row.
- **Detail modal with an embedded timeline.** Considered. Rejected because the modal width caps (`max-w-md` / `max-w-lg`) compress the timeline; widening the modal contradicts the contract from `core-modals` baseline.
- **Full-page detail route (`/inbox/:id`).** Considered. Rejected because the user loses the context of the list/board they were navigating. Drawer keeps the list visible underneath.
- **Drawer for ALL detail views.** Rejected. Static read-only records (catalogues) work better in the centered Detail modal — drawer is more visually heavy.

### Why this is in `core-modals` (not `core-layout` or `core-navigation`)

The drawer is an overlay surface: it dims the background, traps focus, and dismisses on ESC and outside-click — same family as modals. Conceptually it is a "side modal". Putting it in `core-modals` keeps the overlay-surface inventory unified.

### Failure modes the rule prevents

- A developer puts a workflow-typed detail (Solicitud, Alerta) in the Detail modal → spec violation; `meta.detail = 'drawer'` is the contracted path.
- A developer invents a per-module drawer with a different structure (no timeline, no comments) → spec violation; the four regions are required.
- The Drawer's actions footer drifts from the row's actions menu → spec violation; both MUST resolve from the same actions source.

---

## Decision 3 — Modal info-notice bar as a local, single-modal-scope notice

### The question

There are two surfaces that look superficially similar: the persistent **alert banner** (already specified in `core-error-handling`, rendered between Topbar and Main, full-width, dismissible, persists across routes) and a **modal info-notice** (one-line contextual note inside a single modal). Without an explicit contract, agents will use the wrong surface — either misusing the global banner for in-modal notes (wrong scope) or stuffing the note into the modal body next to form fields (visually competes with the form).

### The decision

Every modal SHALL support an optional info-notice slot/region (`<ModalInfo>`) that renders a one-line contextual notice between the modal header and the body's primary content. Variants: `info` (default, blue tint) and `warning` (amber tint). Use cases include "Esta operación no es reversible.", "Los cambios afectan a registros relacionados.", "Solo el último responsable puede editar este campo.". The notice is local to the modal instance — it appears when the modal opens and disappears when the modal closes; there is no persistence across modal close/reopen.

### Distinction from `core-error-handling` alert banner

| Dimension | Modal info-notice (`<ModalInfo>`) | Alert banner (core-error-handling) |
|---|---|---|
| Scope | Single modal instance | App-level, persistent across routes |
| Position | Inside modal, between header and body | Between Topbar and Main, full-width |
| Dismissibility | Closes with the modal | Dismissible by user OR persistent until system state changes |
| Variants | `info`, `warning` (2 variants) | `info`, `warning`, `danger`, `success` (4 variants) |
| Purpose | Contextual hint about THIS form/operation | System-level state ("read-only mode", "connection lost") |

### Alternatives considered

- **Use the alert banner inside the modal.** Rejected. The alert banner is a global app-level surface — repositioning it inside a modal breaks both contracts.
- **Free-form `<p>` paragraph at the top of the modal body.** Rejected. Without a contracted variant + icon + spacing, every modal styles its hint differently.
- **Make the notice clickable / actionable.** Considered. Rejected for v1: in-modal notices are read-only context. If an action is needed, it belongs in the modal footer next to the primary CTA.

### Failure modes the rule prevents

- A developer uses the global alert banner for a single-modal context → spec violation; the modal-local `<ModalInfo>` is the contracted surface.
- A developer styles a free-form `<p>` notice inline in the modal body → spec violation; `<ModalInfo>` is the only contracted notice surface inside a modal.
- A developer uses `danger` or `success` variants for the modal info-notice → spec violation; only `info` and `warning` are valid.

---

## Decision 4 — `<KanbanAxisDialog>` for multi-axis Tablero activation

### The question

The companion `core-data-tables` change introduces multi-axis kanban via `MOD_AXES`. When a module declares more than one axis (e.g., FIN with axes `imputacion`, `registro_contable`, `conciliacion`), the kanban view needs an answer to: which axis are we organizing by right now? Hardcoding the default axis is wrong (every user may prefer a different one). Letting the user implicitly figure it out is wrong (most users will not realize multiple axes exist).

### The decision

When a module exposes more than one kanban axis, the **first kanban activation per session** SHALL open a `<KanbanAxisDialog>`. The dialog lists each axis as a selectable card with:

- The axis label.
- A short description (one line).
- A `read-only` chip when the axis is declared `readOnly: true` (drag is blocked but columns are visible — useful for derived axes).

Confirm persists the choice in `sessionStorage` (key scoped per module). Subsequent kanban activations in the same session render the chosen axis directly, skipping the dialog. The dialog is re-openable via a "Cambiar eje" button in the kanban board header — clicking it re-opens `<KanbanAxisDialog>` with the current axis pre-selected.

### Alternatives considered

- **Inline tabs at the top of the kanban board (one tab per axis).** Considered. Rejected because the prototype's modules can have 4+ axes and tabs eat horizontal space that the columns need. The dialog hands the choice off, then the board uses the full width.
- **Persist the choice to localStorage (across sessions).** Considered. Rejected for v1: a user's preferred axis can change with their workflow stage (early morning = `imputacion`, end of day = `cierre`). Session-scoped storage is the right cadence — long-term persistence can be a follow-up enhancement.
- **Skip the dialog and default to the first axis.** Rejected. The first declaration order is an authoring artifact — it should not implicitly become a UX default.

### Why this is in `core-modals` (not `core-data-tables`)

The dialog is a modal — it dims the background, traps focus, has standard modal dismissal. Its **trigger** (multi-axis declaration) lives in `core-data-tables`; its **surface** (modal with selectable cards) lives in `core-modals`. Same composition pattern as the closure modal in Decision 1.

### Failure modes the rule prevents

- A developer renders a multi-axis kanban without ever opening the picker → spec violation; first activation per session SHALL open the dialog.
- A developer hides the "Cambiar eje" button → spec violation; the choice MUST be revisable.
- A developer treats `readOnly` axes as if they were free-drag → spec violation; the chip is mandatory and the drag is blocked.

---

## Decision 5 — `useGlobalPortals()` aggregator (Vue equivalent of `closeAllPortals()`)

### The question

Every portal-style overlay in the prototype (Action menus, filter dropdowns, form Selects, custom Selects, kanban drag-card preview) needs to dismiss on outside-click. The naive implementation — every portal attaches its own `document.addEventListener('click', ...)` — leaks listeners (when the portal unmounts mid-drag, when the portal is opened twice, etc.), fights other portals over event ordering, and breaks the "outside click closes everything" invariant.

The prototype solves this with `closeAllPortals()`: one document-level click handler invokes a single function that closes every registered open portal. v1.12 extended it to include `closeFormDD()`. New portal-style overlays must register with the aggregator at registration time.

### The decision

Every portal-style overlay (Action menus, filter dropdowns, form Selects, custom Selects, kanban drag-card preview, future portals) SHALL register itself with a single global aggregator. The Vue equivalent is a `useGlobalPortals()` composable backed by a Pinia store (`usePortalsStore`):

- The composable returns `{ register(close: () => void): id`, `unregister(id)`, `closeAll() }`.
- Each portal registers its `close` callback on mount; de-registers on unmount.
- ONE outside-click handler at the document level (mounted in `App.vue`) invokes `closeAll()`.
- New portal-style overlays MUST be added to this aggregator at registration time. **Direct `document.addEventListener('click', ...)` handlers per portal are forbidden.**

### Alternatives considered

- **Per-portal outside-click handlers (status quo without aggregation).** Rejected. Listener leaks, race conditions, hard to reason about.
- **A single Pinia action `closeAllPortals()` that imports every portal type and dismisses each.** Rejected. Coupling: the store has to know every portal that exists. The registration-based aggregator is the inversion of control we want — portals push themselves in.
- **Use `@vueuse/core` `onClickOutside` per portal.** Considered. `onClickOutside` solves the listener leak per portal but does NOT solve the "close all when a different portal opens" problem (e.g., opening the actions menu should close any open filter dropdown). The aggregator solves both with one document-level handler.

### Why this is in `core-modals` (not a new capability)

Portal-style overlays are part of the same overlay-surface family as modals. They share dismissal semantics (outside-click, ESC), z-index conventions, and focus-trap considerations. Treating them as a single contract under `core-modals` keeps the overlay inventory in one place. If the aggregator grows to cover non-overlay concerns (toast queueing, route-change cleanup), we can extract a dedicated capability — but for now this is the right home.

### Failure modes the rule prevents

- A developer adds a new portal with its own `document.addEventListener` → spec violation; registration with the aggregator is mandatory.
- A portal forgets to de-register on unmount → memory leak; the contract requires de-registration on unmount.
- Two open portals fight over event ordering (clicking the actions menu while a filter is open) → eliminated; the aggregator closes everything on outside-click in one pass.

---

## Cross-capability composition

This change touches `core-modals` only, but it composes deliberately with three neighbors:

| Neighbor | What it owns | What this change owns |
|---|---|---|
| `core-data-tables` | `mode: 'modal'` transition declarations; `MOD_AXES` shape; `meta.detail` value | The modal/drawer surfaces those declarations open |
| `core-error-handling` | Persistent app-level alert banner | Modal-local info-notice (explicitly distinguished) |
| `core-actions-menu` / `core-forms` | Action menus, form Selects, custom Selects | Registration of those portals with `useGlobalPortals()` |

This composition is intentional: the modal-surface inventory should not duplicate state-machine concerns or banner concerns; it should provide the surfaces those concerns activate.

---

## Open questions

1. **Drawer width on narrow viewports.** Current decision: full-height, fixed width on desktop (~480px). On mobile/narrow viewports, the drawer SHOULD expand to ~90% viewport width. Exact breakpoint deferred until first migration provides real data.
2. **Closure-modal field-type validation.** The closure modal accepts the same dialog-field shape as the action manifest (`text`, `textarea`, `select`, `date`, `number`, `boolean`, `lookup`). Whether `lookup` is allowed in a closure-modal context (which would require resolving a catalog) is deferred — current decision is yes, with the same `resolveCatalog` mechanism.
3. **Axis-dialog persistence cadence.** Session storage chosen. If user feedback shows users want their axis preference to survive page reloads but not full sessions, we revisit. Reload-survival is `localStorage`-scoped per module.
4. **`useGlobalPortals` and modal stacking.** Currently, opening a modal does NOT call `closeAll()` — modals and portals are different stacking contexts. If a user opens a portal (e.g., a form Select inside a Create modal) and then clicks the modal backdrop, only the portal closes (via aggregator); the modal closes via its own backdrop handler. We document this explicitly to avoid confusion.
