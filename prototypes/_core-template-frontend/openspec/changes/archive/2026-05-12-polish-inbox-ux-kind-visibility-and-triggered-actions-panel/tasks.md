# Tasks — polish-inbox-ux-kind-visibility-and-triggered-actions-panel

Small follow-up to `align-genericos-with-product-spec-and-add-inbox-manual-cta` closing four hands-on-review gaps. Spec deltas land in `core-modulo-genericos`; code edits cross Inbox + KanbanBoard + ModuloA.

## 1. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `Inbox views MUST surface the kind discriminator as a badge and the L3 filter row MUST expose a kind filter` with scenarios covering badge in list / cards / kanban / drawer + the L3 filter with three options (Solicitudes / Tareas / Todas)
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `Drawer MUST render a triggered_actions panel when the Solicitud carries one or more entries` with scenarios covering the rendered shape per status + the panel-hidden case

## 2. Header CTA ordering (collateral)

- [ ] `src/pages/ModuloA.vue` — swap the order so the L1 header reads `[Plus button] [ViewToggle]` left-to-right (Main CTA before ViewToggle; ViewToggle rightmost)
- [ ] No Inbox change (already correct)

## 3. Kanban single-axis label copy

- [ ] `src/components/kanban/KanbanBoard.vue` — line ~254: "Organizando por:" → "Organizado por:" (participio). Cross-cuts Inbox / Alertas / ModuloA.

## 4. Kind discriminator visibility

- [ ] `src/pages/Inbox.vue` — render a `<Badge>` per row in the list view (new column "Kind" before "Tipo") with values "Solicitud" / "Tarea"
- [ ] `src/pages/Inbox.vue` — render the kind `<Badge>` in the card-header layout (before the status badge)
- [ ] `src/pages/Inbox.vue` — render the kind `<Badge>` in the kanban-card header (small inline)
- [ ] `src/pages/Inbox.vue` — render the kind in the Drawer (status-badge area: kind alongside state)
- [ ] `src/pages/Inbox.vue` — add a third `<select>` in the L3 filter row labeled "Kind", options "Todos" / "Solicitudes" / "Tareas"; wire into `filteredSolicitudes` alongside Tipo and Estado
- [ ] Add a small helper `kindLabel(kind: InboxKind): string` and `kindVariant(kind: InboxKind): BadgeVariants['variant']` near the existing display helpers in Inbox.vue

## 5. Tarea mocks in active states

- [ ] `src/mocks/genericos/inbox.ts` — add at least three Tarea entries spanning `pendiente` / `en_proceso` (not all in terminal states) so the kind axis is exercised by the default view
- [ ] Optionally pre-populate `triggered_actions[]` on one of the new mocks so the panel is visible immediately

## 6. Example `triggers_on_create[]`

- [ ] `src/config/inbox-types.ts` — add one `triggers_on_create: [{ action_id: 'demo.example.crear_factura_borrador', payload_mapping?: { ... } }]` to `aprobacion_pago` so newly-created Solicitudes of that type acquire a `triggered_actions[]` row via the mock executor in `<InboxCreateDialog>`

## 7. `<TriggeredActionsPanel>` component

- [ ] `src/components/inbox/TriggeredActionsPanel.vue` (NEW) — props `{ entries: TriggeredAction[] }`. Renders nothing when entries is empty. Renders a labeled section "Acciones disparadas" with one row per entry showing `action_ref` (mono), status badge (mapped `pending` → warning, `ok` → success, `error` → danger), and optional `result_ref` / `error_message` lines.
- [ ] `src/components/inbox/index.ts` — barrel export the new component
- [ ] `src/pages/Inbox.vue` — import `<TriggeredActionsPanel>` and mount it in the Drawer body slot, between Información and Timeline; pass `entries: drawerSolicitud.triggered_actions ?? []`

## 8. Tests

- [ ] `src/components/inbox/TriggeredActionsPanel.spec.ts` (NEW) — covers: hidden-when-empty / one-row-per-entry / status-badge-mapping / optional `result_ref` and `error_message` lines
- [ ] No changes to existing Inbox specs unless the new mock dataset breaks an existing assertion (rerun and adjust if needed)

## 9. Validation gates

- [ ] `openspec validate polish-inbox-ux-kind-visibility-and-triggered-actions-panel --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` exits 0
- [ ] `npm run type-check` exits 0
- [ ] `npm run test:run` exits 0 (existing tests + new TriggeredActionsPanel tests pass)
- [ ] `npm run build:qa` exits 0
- [ ] Manual smoke recorded in `design.md` § Validation

## 10. Archive + commit

- [ ] `openspec archive polish-inbox-ux-kind-visibility-and-triggered-actions-panel`
- [ ] Final commit: `feat(inbox): surface kind badge + filter, add triggered-actions panel, align header CTA order, polish kanban axis label`
