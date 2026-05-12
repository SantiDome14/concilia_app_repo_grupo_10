# Tasks — add-inbox-concept-actions-and-polish-display-fallbacks

## 1. Spec delta

- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: Inbox manifest surfaces concept-filtered actions on Drawer / row CTAs via `show_when: { record_concept_in: [...] }`; example actions in template manifest demonstrate the pattern.

## 2. Manifest

- [ ] `src/manifests/framework.template.inbox.actions.ts` — add three new actions:
    - `inbox.ver_cliente` on `aprobacion_pago` (icon `external-link`).
    - `inbox.generar_factura` on `aprobacion_pago` (icon `file-plus`).
    - `inbox.escalar_compliance` on `revision_legajo` (icon `arrow-up-right`).
  Each declares `show_when: { record_concept_in: [...] }`, a dialog with info banner explaining the simulated effect, and `on_confirm.toast` describing the side-effect.

## 3. Page

- [ ] `src/pages/Inbox.vue` — helper `titleCase(s)`; apply to Origen column + Drawer Origen cell.
- [ ] `src/pages/Inbox.vue` — list / cards / kanban "Asignado a" fallback: replace "Sin asignar" → "—". Drawer keeps the explicit "Sin asignar".

## 4. Validation gates

- [ ] `openspec validate add-inbox-concept-actions-and-polish-display-fallbacks --strict` exits 0
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 5. Archive + commit

- [ ] `openspec archive add-inbox-concept-actions-and-polish-display-fallbacks`
- [ ] Commit: `feat(inbox): surface concept-filtered actions in the Drawer + polish Origen casing + Asignado a "—" fallback`
