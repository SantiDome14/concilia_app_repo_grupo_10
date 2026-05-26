# Tasks — add-inbox-assignee-filter

## 1. Spec delta

- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: *Inbox L3 filter row MUST expose an assignee filter with 'Todos' / 'Sin asignar' / per-user options*, with scenarios for default behavior, unassigned filter, per-user filter, and AND-merge with other L3 filters.

## 2. Code

- [ ] `src/pages/Inbox.vue` — declare `filterAssignee: '' | '__unassigned__' | string` (the third case = a user id). Add a new `<select>` in the L3 filter row between Concepto and Estado. Options: empty value labeled "Asignado a · Todos"; `'__unassigned__'` labeled "Sin asignar"; per-user options sourced from `MOCK_USERS` excluding system actors. Wire into `filteredSolicitudes` AND-merge.

## 3. Validation gates

- [ ] `openspec validate add-inbox-assignee-filter --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 4. Archive + commit

- [ ] `openspec archive add-inbox-assignee-filter`
- [ ] Commit: `feat(inbox): add L3 assignee filter with Todos / Sin asignar / per-user options`
