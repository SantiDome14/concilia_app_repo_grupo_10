# Tasks — add-lex-usuarios

This change creates the `lex-usuarios` capability — the Lex operators listing page. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-usuarios/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-usuarios` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-usuarios/spec.md` — ADDED Requirements: 5 requirements, 15 scenarios. Cover: canonical column set, debounced name + immediate role filter, pagination 0↔1 translation in API layer, `formatRole()` as single label transformer, page reachable for all three Lex roles.
- [ ] Run `openspec validate add-lex-usuarios --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/users/types.ts` — `LexUser` interface (`id`, `email`, `name`, `role: string`), `UsersListParams`, `UsersListResponse`.

### 2.2 API binding

- [ ] `src/lex/users/api.ts` — `fetchUsers(params: UsersListParams)` doing `+1` page translation and uppercase sort/order. Uses the shared axios instance from `core-api-layer`.
- [ ] Unit tests asserting the outbound URL params: `page=0` → `?page=1`, `sort: { field: 'name', order: 'asc' }` → `?sort=NAME&order=ASC`.

### 2.3 Format helpers

- [ ] `src/lex/users/format.ts` — `formatRole(role: string): string` with the explicit map for known roles and Title Case fallback.
- [ ] `src/lex/users/roleBadge.ts` — `roleBadgeToken(role: string): string` returning the CSS variable token, with neutral fallback.

## 3. Page implementation (aspirational)

- [ ] `src/pages/Usuarios.vue` — L1 page header with title `Usuarios` and no CTAs; no L2 (no KPIs in v1); L3 with the FilterBar (Nombre debounced, Rol Select) and the table.
- [ ] `src/lex/users/UsuariosTable.vue` — uses `core-data-tables` table primitive. Email column in monospace, no Acciones column, page-size selector with `10 / 25 / 50 / 100` defaulting to `25`, `localStorage` key `lex.usuarios.pageSize`.
- [ ] EmptyState wiring: `Sin usuarios` / `No hay usuarios con los filtros aplicados`.

## 4. Tests (aspirational)

- [ ] `src/pages/Usuarios.spec.ts` — exercise every Scenario:
  - Default render shows Email, Nombre, Rol; Email in monospace; no Acciones column.
  - Role badge colours map correctly; unknown role uses neutral.
  - EmptyState surfaces when response is empty.
  - Name input debounced 300 ms, single request fired.
  - Role filter applies immediately.
  - Filters reflected in the URL; deep-link reproduces state.
  - `?page=0` → backend `?page=1`; `?page=2` → backend `?page=3`.
  - Sort `name asc` → backend `NAME ASC`.
  - `formatRole()` produces the canonical labels and Title Case for unknowns.
  - Page reachable for `VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`.
- [ ] Coverage on `format.ts`, `roleBadge.ts`, `api.ts` ≥ 95% (utilities). Coverage on `Usuarios.vue` ≥ 80%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-usuarios --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-usuarios` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-usuarios`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-usuarios/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-usuarios/`.
- [ ] Final commit with conventional message: `specs: add lex-usuarios — Lex operators listing page`.
