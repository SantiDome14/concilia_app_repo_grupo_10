- Jira REQ: — (UX polish closing visibility gaps surfaced after `align-genericos-with-product-spec-and-add-inbox-manual-cta` landed; no product-side change)
- Module: core-template (foundation)

# Polish Inbox views: kind badge + filter, triggered-actions panel, header CTA ordering, kanban label copy

## Why

After the main-CTA change landed, a hands-on review of the running Inbox surfaced four visibility gaps that the spec implies but the implementation did not cover:

1. **`kind` discriminator is invisible.** The canonical spec calls for the Solicitud/Tarea kind to surface as a badge in the Drawer ("El `kind` deriva del `InboxTypeConfig` y se muestra como badge en el Drawer") and for the L3 filter row to expose a kind filter ("Los filtros de la vista permiten ver Solicitudes / Tareas / Todas"). Today no view (list, cards, kanban, drawer) renders a kind badge and the L3 filter row has only Tipo / Estado. The single mock Tarea (`SOL-004`) is in `completed` state so the kind axis is not exercised at all unless the user opens the state filter.
2. **`triggered_actions[]` panel is invisible.** The companion change persists `triggered_actions[]` on new Solicitudes (Decision 9 — V1 mock executor) but never renders them. The spec body for the Drawer enumerates "Triggered actions: panel con `status` y `result_ref` de cada acción del manifest disparada por `triggers_on_create[]`" — the panel never made it into the Drawer template.
3. **Header CTA ordering convention drift.** The L1-header convention agreed for the financial-core template is: `<ViewToggle>` sits at the right edge (the rightmost element of the header), and the Main CTA (when present) sits **before** the `<ViewToggle>` (to its left). This keeps the view-mode control anchored to the same screen edge across every module so the user can build muscle memory, while the primary CTA reads as the action-of-the-page right next to it. The Inbox's `<InboxCreateCTA>` already follows this order (CTA, then ViewToggle). `ModuloA.vue` — the seed reference page — has drifted: it currently renders `<ViewToggle>` first, then the `Crear Registro` `<Button>`. The fix is to swap the two so the seed reference matches the agreed convention; other pages (Alertas / Reportes) already have only one of the two and need no change.
4. **Kanban single-axis label uses gerundio ("Organizando por: Estado").** The shared `<KanbanBoard>` fallback text reads "Organizando por: {axis.label}". Hands-on review pinned the wording as participio: "Organizado por: {axis.label}". The change is one word in the shared component; every consumer (Inbox, Alertas, ModuloA, future apps) picks it up uniformly.

The first two are spec-implementation gaps that need ADDED Requirements with Scenarios so PR review catches re-introductions. The last two are UX adjustments aligning with existing precedent (no new contract needed beyond the commit-level fix).

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **ADDED Requirement: Inbox views MUST surface the `kind` discriminator as a badge and the L3 filter row MUST expose a kind filter.** Badge appears in list / cards / kanban / drawer with two values (`Solicitud` / `Tarea`); the L3 filter row carries a "Tipo de registro" (or equivalent) filter exposing the canonical three options (Solicitudes / Tareas / Todas) regardless of how many entries of each kind exist in the dataset.
- **ADDED Requirement: Drawer MUST render a `triggered_actions` panel when the Solicitud carries one or more entries.** The panel lists each entry's `action_ref`, `status` (`pending` / `ok` / `error`), and optional `result_ref` / `error_message`. The panel is hidden when `triggered_actions[]` is undefined or empty.

### Code

- **ModuloA header CTA ordering** — swap the order in `ModuloA.vue` so the L1 header reads `[Plus button] [ViewToggle]` left-to-right. The Inbox is already correct (CTA before ViewToggle); no change there.
- **Kanban label copy** — `<KanbanBoard>` single-axis fallback text "Organizando por:" → "Organizado por:" (participio). Cross-cuts Inbox / Alertas / ModuloA / any future consumer.
- **Kind badge components and views** — render a `<Badge>` variant per kind in:
  - List row (new column "Kind", before "Tipo")
  - Card header (next to the state badge)
  - Kanban card (small inline badge before the title)
  - Drawer header (status-badge area carries kind alongside state)
- **L3 kind filter** — add a third `<select>` to the section header: "Kind · Todos / Solicitudes / Tareas". Filter wires into `filteredSolicitudes` alongside the existing Tipo and Estado filters.
- **More tarea mocks** — add three Tarea entries in active states (`pendiente`, `en_proceso`) so the kind axis is exercised by the default view without changing the state filter.
- **Example `triggers_on_create[]` declaration** — declare one trigger on the `aprobacion_pago` `InboxTypeConfig` so manually creating an `aprobacion_pago` via the CTA produces a non-empty `triggered_actions[]` for the user to see in the Drawer.
- **Pre-populate `triggered_actions[]` on one existing mock** — so the panel is visible immediately on first load without forcing the user to go through the create flow.
- **`<TriggeredActionsPanel>`** — new small component under `src/components/inbox/` rendering the `triggered_actions[]` list with kind-of-status badge and (when present) `result_ref` / `error_message` lines. Mounted inside the Drawer body slot, between Information and Timeline.

### Tests

- Add behavioral tests for `<TriggeredActionsPanel>` (renders / hidden / status-badge mapping) and update `InboxCreateDialog.spec.ts` if the new mock trigger affects existing assertions.
- Update `Inbox.spec.ts` (if affected) to keep mock fixtures matching the enlarged dataset. No new tests on the L3 filter row in this round (the existing pattern is verbatim — same `<select>` + `filteredSolicitudes` plumbing).

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — two ADDED Requirements (kind badge + filter; triggered_actions panel). No existing Requirement modified or removed; the existing Requirement on the Solicitud shape and on the Drawer's content (Timeline / Comments / primary-actions) is unchanged.

### New Capabilities

None. This change extends an existing capability.
