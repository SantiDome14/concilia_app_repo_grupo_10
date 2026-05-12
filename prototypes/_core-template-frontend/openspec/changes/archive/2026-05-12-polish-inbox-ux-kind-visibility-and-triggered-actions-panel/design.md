# Design — polish-inbox-ux-kind-visibility-and-triggered-actions-panel

## Context

Four observations from a hands-on review of the Inbox after
`align-genericos-with-product-spec-and-add-inbox-manual-cta` landed:

1. `kind` is a canonical discriminator in the model but invisible in every view.
2. `triggered_actions[]` is persisted on new Solicitudes but never rendered.
3. The header-CTA ordering convention is "Main CTA before `<ViewToggle>`; `<ViewToggle>` rightmost". `ModuloA.vue` — the seed reference page — has drifted to the opposite order and needs alignment.
4. The shared kanban single-axis label reads "Organizando por:" — review pinned the participio "Organizado por:" as the wanted wording.

Items 1 and 2 are spec-implementation gaps (the canonical types and data are right; the UI is incomplete). They warrant new ADDED Requirements so PR review catches re-introductions. Items 3 and 4 are convention / copy alignments — they ride along as code edits referenced in the commit but do not need new Requirements (the rightmost-primary rule is already in `core-layout`; the label copy is shared in one component).

## Decisions

### Decision 1 — Kind badge rendered in all four surfaces (list, cards, kanban, drawer) via the shared `<Badge>` primitive

The kind discriminator is two-valued (`solicitud` / `tarea`) — a `<Badge>` per row is the right surface. Variants:

- `solicitud` → `info` (blue) — the third-party-requested unit; gets the more "external" tone
- `tarea` → `neutral` (grey) — the self-issued unit; quieter visual

The badge sits BEFORE the state badge so the kind reads first (the kind is type-level metadata; state is per-instance).

Alternative considered: surface kind only in the Drawer (per the spec body wording: "se muestra como badge en el Drawer"). Rejected — the list/cards/kanban views are where users scan to identify what's a Solicitud vs what's a Tarea before clicking. Hiding the discriminator outside the Drawer defeats the value of having it. The spec body is non-exhaustive — having it in the Drawer is the minimum, not the maximum.

### Decision 2 — L3 filter row gets a "Kind" filter as a separate `<select>` (not a `<Segmenter>`)

The Inbox's existing convention (per the parent change) is that the Inbox renders no `<Segmenter>` — filtering by lifecycle / kind / type lives in the L3 filter row. The kind filter follows the same pattern as the existing Tipo and Estado `<select>`s: three options ("Todos" / "Solicitudes" / "Tareas"), wires into `filteredSolicitudes` alongside the existing filters, persists in component state.

### Decision 3 — `<TriggeredActionsPanel>` is a new presentational component under `src/components/inbox/`

The panel is small and read-only; it has no side effects. Putting it under `src/components/inbox/` matches the directory of the other Inbox-specific components shipped by the previous change. The panel is rendered as part of the Drawer body slot (not as a new slot on `<Drawer>` itself), so the Drawer component stays unchanged.

The panel renders one row per `TriggeredAction` entry: action_ref (mono font), status badge (mapped: `pending` → warning, `ok` → success, `error` → danger), optional `result_ref` / `error_message`. When `triggered_actions` is undefined or empty the whole panel is omitted (no empty-state placeholder; the Drawer just doesn't show the panel).

Alternative considered: add a `triggered-actions` slot to `<Drawer>`. Rejected — the Drawer is shared with Alertas (REQ-73) where the trigger concept doesn't apply. Putting the slot in the shared component would force every consumer to know about Inbox-specific concepts. The body-slot inline pattern keeps the coupling Inbox-local.

### Decision 4 — Example trigger declared on `aprobacion_pago`; one mock pre-populated for immediate visibility

To exercise the panel without forcing the user through the create flow on first load, one of the existing six mocks (the active `aprobacion_pago` SOL-001) gets a pre-populated `triggered_actions[]` with a `status: 'ok'` entry referencing a placeholder `action_ref`. The new entry in `aprobacion_pago.triggers_on_create[]` makes the subsequent newly-created `aprobacion_pago` Solicitudes also populate `triggered_actions[]` automatically (the mock executor in `<InboxCreateDialog>` already wires the path; the change is data only).

### Decision 5 — Items 3 (CTA order) and 4 (kanban copy) ride along as code edits without spec changes

The header-CTA-order convention is documented in the proposal and applied to the seed reference page (`ModuloA.vue`); future modules will see Inbox as one reference and ModuloA as the other, both consistent. We do NOT add a new Requirement on the order — the convention is naturally enforced by the visible precedent on every page and reviewers will catch drift. (The existing `core-layout` "rightmost MUST be primary" rule applies to CTA-among-CTAs ordering; `<ViewToggle>` is not a CTA, so the rule and the new convention coexist.)

The kanban label copy is shared in `<KanbanBoard>`'s single-axis fallback block — changing the one word ("Organizando" → "Organizado") propagates to every consumer uniformly with no Requirement-level change.

Both fixes are mentioned in the commit and the proposal but do not get their own Requirement blocks.

## Out of scope

- Kind filter surface as a `<Segmenter>` instead of a `<select>` (the Inbox-no-Segmenter Requirement is binding).
- Type-specific `available_actions[]` in the Drawer — that's the other end of the manifest-engine integration (Decision 9 of the parent change), still V2-scoped.
- Full triggers_on_create execution via the manifest engine (still V2-scoped).
- Translating the panel to Alertas — Alertas doesn't carry `triggered_actions[]` (different model).

## Validation

- `openspec validate polish-inbox-ux-kind-visibility-and-triggered-actions-panel --strict` passes.
- `npm run type-check && npm run lint && npm run test:run && npm run spec:check && npm run build:qa` all exit 0.
- Manual smoke:
  - Default view shows mix of Solicitud + Tarea badges (the new mocks are exercised without changing filters).
  - L3 "Kind" filter narrows the dataset; switching values updates the L2 counters and the body.
  - Click any Solicitud with `triggered_actions[]` populated → Drawer opens → "Acciones disparadas" panel renders with status-coded rows.
  - Inbox.vue header: ViewToggle on the left, primary "Crear" button at the right (rightmost-primary rule).
  - Kanban view: subheader reads "Organizado por: Estado" (participio).
