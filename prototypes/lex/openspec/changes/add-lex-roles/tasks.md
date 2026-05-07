# Tasks — add-lex-roles

This change creates the `lex-roles` capability — the Lex-specific RBAC contract on top of `core-auth`. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-roles/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-roles` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-roles/spec.md` — ADDED Requirements: 6 requirements, 13 scenarios. Cover: Auth0 `USER_ROLES` as sole source, three-role identifier set (`VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`), single-composable consumption, `VIEWER_LEX` denied all mutations, `COMMERCIAL_LEX` denied Actividad and Documentos tabs, reactive flags surviving silent refresh and clearing on logout.
- [ ] Run `openspec validate add-lex-roles --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types (aspirational — may follow in a separate change)

### 2.1 Role union and runtime constants

- [ ] `src/types/lexRoles.ts` — exports the canonical surface:
  - `LexRole` TS union (`'VIEWER_LEX' | 'COMMERCIAL_LEX' | 'ADMIN_LEX'`)
  - `LEX_ROLES` runtime constant array (`as const satisfies readonly LexRole[]`)
  - Type guard `isLexRole(x): x is LexRole` for narrowing arbitrary strings from the token

- [ ] Document in a one-line file banner that this file is the only place where the role identifier strings appear in source; everything else MUST import from here.

### 2.2 Composable

- [ ] `src/composables/useLexRole.ts` — exports `useLexRole()` returning:
  - `roles: ComputedRef<readonly LexRole[]>` — the deduplicated, validated effective role set
  - `isViewer: ComputedRef<boolean>`, `isCommercial: ComputedRef<boolean>`, `isAdmin: ComputedRef<boolean>`
  - `hasRole(role: LexRole): boolean` — predicate
  - `requiresAdmin(): void` — throws if not admin (used in router guards or imperative actions)
- [ ] Internally subscribe to `useAuth()` from `core-auth`; never read `useAuth0()` directly.
- [ ] Computeds run in the order: read `user.value?.USER_ROLES`, narrow each entry via `isLexRole()`, dedupe, derive flags. Lowercase or unknown identifiers are dropped.

### 2.3 Test fixtures

- [ ] `src/composables/useLexRole.spec.ts` — unit tests exercising every Scenario in the spec:
  - Roles `["COMMERCIAL_LEX"]` → returns exactly that
  - No `USER_ROLES` claim → returns `[]`
  - `?role=ADMIN_LEX` query param → ignored
  - `["LEGACY_ADMIN", "VIEWER_LEX"]` → only `VIEWER_LEX` retained
  - `["commercial_lex"]` lowercase → not matched
  - Token refresh updates flags reactively
  - Logout clears flags before navigation
- [ ] Coverage on `useLexRole.ts` ≥ 95% (per the project's `≥90% on utilities/composables` target — composables get the higher bar).

## 3. ESLint enforcement (aspirational)

- [ ] Add a custom ESLint rule (or a `no-restricted-imports` / `no-restricted-properties` config) that bans:
  - Reading `USER_ROLES` from any file other than `src/composables/useLexRole.ts` or `src/types/lexRoles.ts`
  - Importing `useAuth0` directly from `@auth0/auth0-vue` outside `core-auth` and `useLexRole.ts`
- [ ] Add the rule to `eslint.config.js` and run `npm run lint -- --max-warnings 0` in CI.

## 4. Documentation surface (aspirational)

- [ ] Append a "Roles in Lex" section to `prototypes/lex/CLAUDE.md` and `prototypes/lex/AGENTS.md` (mirror in same commit) pointing at `useLexRole()` as the canonical entry point and citing the matrix in `lex-roles/spec.md` as the source of truth.
- [ ] If a Storybook is added later: a "Role Gating" stories group demonstrating each role's view of `/clientes`, `/altas`, and the four `/clientes/:id` tabs.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-roles --strict` passes.
- [ ] `openspec validate --all --strict` passes (existing core baseline + 12 sibling Lex specs + the new `lex-roles` baseline = 26 capabilities total once all 13 Lex changes archive).
- [ ] If implementation tasks (2–3) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-roles` is opened with sections 2–3 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-roles`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-roles/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-roles/`.
- [ ] Final commit (when implementation is included or after the follow-up implementation merges) with conventional message: `specs: add lex-roles — Lex-specific RBAC contract on top of core-auth`.
