# Tasks — fix-concept-uppercase-assignee-column-and-sla-mocks

## 1. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement (the concept chip Requirement): UPPERCASE instead of Title Case. Title renamed too.
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: list / cards / kanban MUST display assignee in the primary "responsable" cell; Drawer keeps both Owner and Asignado a.

## 2. Code

- [ ] `src/pages/Inbox.vue` — rewrite `humanizeConcept` to output UPPERCASE.
- [ ] `src/pages/Inbox.vue` — add `solicitudAssigneeName(s): findUser(s.assignee)?.name ?? ''`.
- [ ] `src/pages/Inbox.vue` — list column header "Responsable" → "Asignado a"; cell reads assignee.
- [ ] `src/pages/Inbox.vue` — cards body "Owner" label → "Asignado a"; reads assignee. Kanban footer reads assignee with "Sin asignar" fallback.
- [ ] `src/pages/Inbox.vue` — Drawer info grid: add new "Asignado a" card (4 cards become 5 with Kind, Concepto, Tipo info, Owner, Asignado a, SLA, Origen, etc.) — wait, simpler: ADD an "Asignado a" card alongside the existing "Owner" card; both render.

## 3. Mocks

- [ ] `src/mocks/genericos/inbox.ts` — update `created_at` of active records so several SLAs render as in-SLA (success chip):
    - SOL-001 (sla 24h, pendiente) → recent created_at (within 24h of "now")
    - SOL-003 (sla 8h, pendiente) → recent created_at
    - SOL-006 (sla 48h, pendiente) → recent created_at
    - TAR-007 (sla 48h, pendiente) → recent created_at
    - TAR-009 (sla 24h, pendiente) → leave older OR update to exercise vencida case
  Keep at least one record with an expired SLA so the danger chip is also visible.

## 4. Validation gates

- [ ] `openspec validate fix-concept-uppercase-assignee-column-and-sla-mocks --strict` exits 0
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 5. Archive + commit

- [ ] `openspec archive fix-concept-uppercase-assignee-column-and-sla-mocks`
- [ ] Commit: `fix(inbox): concept chip in UPPERCASE, align "Asignado a" column with assignee filter, refresh mock SLAs`
