- Jira REQ: — (closes the `available_actions[]` gap flagged out-of-scope in `align-genericos-with-product-spec-and-add-inbox-manual-cta` + two small display polish items)
- Module: core-template (foundation)

# Surface concept-filtered actions in the Inbox Drawer, capitalize "Origen", and render "—" for unassigned

## Why

Three corrections after the previous polish landed:

1. **Inbox doesn't surface the "invoke other functionality" capability** flagged from the very first hands-on review (parent change's Decision 9 + the polish review noted it). The model and the manifest engine already support type-specific actions on the Drawer (`InboxTypeConfig.available_actions[]` + `show_when` predicate filtering by `record_concept_in`); what's missing is example action declarations in the inbox manifest so the user can see the pattern working. Without examples, the user reads the model but sees no behavior in the running app — exactly the gap reported: *"no veo la posibilidad de que las Inbox invoquen funcionalidades"*. This change closes it by adding two example actions to `INBOX_MANIFEST` filtered by concept (e.g. `aprobacion_pago`): "Ver cliente" (function_invocation simulating navigation) and "Generar factura" (function_invocation simulating opening a pre-filled form). Both surface in the Drawer alongside the existing state actions (Tomar / Cerrar / Rechazar) and demonstrate the concept ↔ action wiring.

2. **The "Asignado a" column shows "Sin asignar" as text when assignee is null** — the user prefers an em-dash placeholder ("—") consistent with how the SLA column renders its null state. The list, cards, and kanban surfaces all swap "Sin asignar" → "—". The Drawer keeps the explicit "Sin asignar" wording (the Drawer is detail-context and an explicit label reads better there than a placeholder).

3. **The "Origen" column shows the raw lowercase `source_module` value** (`'inbox'`), inconsistent with the title-cased / chip-style rendering of every other classifier column. Capitalize the first letter — `'inbox'` → `'Inbox'` — via a tiny helper. Same fix applies in the Drawer Information grid ("Origen" cell).

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **ADDED Requirement: Inbox manifest MUST surface `InboxTypeConfig.available_actions[]` style actions as Drawer / row CTAs, filtered to the matching concept via `record_concept_in`.** The manifest declares actions for `function_invocation`-style flows (navigation, pre-filled form open, external system call) alongside the generic state actions (Tomar / Cerrar / Rechazar). The `show_when: { record_concept_in: [...] }` predicate filters each action to the concept(s) it's relevant for. Example actions in this round: "Ver cliente" + "Generar factura" on the `aprobacion_pago` concept. Real apps extend the manifest with their own concept-filtered actions.

### Code

- `src/manifests/framework.template.inbox.actions.ts` — two new actions registered with `show_when: { record_concept_in: ['aprobacion_pago'] }` (and a third on `revision_legajo` for variety):
  - `inbox.ver_cliente` (dimension `governance`, icon `external-link`) — dialog with info banner ("Esto abriría /clientes/<id>"), `on_confirm.toast` ("Navegación a cliente …").
  - `inbox.generar_factura` (dimension `governance`, icon `file-plus`) — dialog with info banner ("Esto abriría el formulario de factura pre-rellenado con monto, moneda y proveedor"), `on_confirm.toast` ("Factura borrador creada (simulación)").
  - `inbox.escalar_compliance` (dimension `governance`, icon `arrow-up-right`, on `revision_legajo`) — dialog with info banner ("Esto crearía una Solicitud al área de compliance"), `on_confirm.toast` ("Escalado a compliance (simulación)").
- `src/pages/Inbox.vue`:
  - New helper `titleCase(s)` that returns `s` with the first letter uppercased (e.g. `'inbox'` → `'Inbox'`); used for the Origen column / Drawer cell.
  - List column "Origen" cell wraps `s.source_module` in `titleCase(...)`.
  - List column "Asignado a" cell renders `'—'` when `solicitudAssigneeName(s)` is empty (replacing the previous "Sin asignar").
  - Cards body "Asignado a" row uses the same `'—'` fallback.
  - Kanban footer assignee span uses the same `'—'` fallback (replacing "Sin asignar").
  - Drawer "Origen" info card renders `titleCase(source_app) · titleCase(source_module)` — `source_app` is a code (e.g. `'CORE'`) but the helper is idempotent on already-uppercase inputs so it stays `'CORE'`.

### Tests

- No new tests in this round; the actions surface through the existing `<ManifestActionsMenu>` pattern which is already tested. A follow-up can add behavioral tests for the concept-filtered actions if desired.

### Product source-of-truth

- No update — these are template-level details that build on the canonical InboxTypeConfig + manifest engine already specified.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 1 ADDED Requirement (concept-filtered actions on the manifest, surfaced as Drawer/row CTAs). Capability count: 25 → 26.

### New Capabilities

None.
