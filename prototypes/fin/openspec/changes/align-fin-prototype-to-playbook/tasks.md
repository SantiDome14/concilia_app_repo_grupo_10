# Tasks — align-fin-prototype-to-playbook

> Implementation checklist. Each task is independently verifiable. Apply in numbered order; sections 1–2 modify the template, section 3 onward modifies fin. Validation gates close every section.

## 1. Spec promotion — template (canon)

- [x] 1.1 Add new Requirement "Sidebar MUST stack above the Dialog/Sheet overlay so navigation is reachable while a modal is open" to `prototypes/_core-template-frontend/openspec/specs/core-navigation/spec.md`. Use the exact Requirement body + 4 scenarios authored under `specs/core-navigation/spec.md` in this change folder. Insert after the last existing Requirement in `core-navigation/spec.md` (preserve existing Requirements unchanged).
- [x] 1.2 Add new Requirement "Top-level RouterView MUST remount its slot when the route name changes" to `prototypes/_core-template-frontend/openspec/specs/core-layout/spec.md`. Use the exact Requirement body + 4 scenarios authored under `specs/core-layout/spec.md` in this change folder. Insert after the last existing Requirement in `core-layout/spec.md`.
- [x] 1.3 Run `cd prototypes/_core-template-frontend && npm run spec:check` and confirm 18/18 pass strict. ✓

## 2. Spec promotion — fin (replica from template canon)

- [x] 2.1 Apply the same Requirement + 4 scenarios from step 1.1 into `prototypes/fin/openspec/specs/core-navigation/spec.md`. Insertion position matches 1.1.
- [x] 2.2 Apply the same Requirement + 4 scenarios from step 1.2 into `prototypes/fin/openspec/specs/core-layout/spec.md`. Insertion position matches 1.2.
- [x] 2.3 Diff-check no drift on the new Requirements between template and fin: `diff -u <(tail -47 ...)` returned BYTE_IDENTICAL_TAIL for core-navigation and core-layout. (Pre-existing drift on core-layout body — 92 lines absent in fin replica — documented as out-of-scope follow-up in MIGRATION-NOTES.md §4.)
- [x] 2.4 Run `cd prototypes/fin && npm run spec:check` and confirm 14/14 pass strict (13 specs + 1 change). ✓

## 3. Code fix — Sidebar z-index (Pattern #13)

- [x] 3.1 Edit `prototypes/fin/src/components/layout/Sidebar.vue:154`: change `z-50` to `z-[600]` in the Sidebar `<nav>` class binding.
- [x] 3.2 Edit `prototypes/fin/src/components/layout/Sidebar.vue:164`: change `z-[51]` to `z-[601]` in the collapse-toggle button class binding.
- [x] 3.3 Confirm the account-menu `<div>` inside the same file remains at `z-[200]` (no change). Confirmed in code — line 284 still uses `z-[200]`.

## 4. Code fix — App.vue RouterView keyed (Pattern #16)

- [x] 4.1 Edit `prototypes/fin/src/App.vue`: add `useRoute` import from `vue-router`. Add `const route = useRoute();` to `<script setup>`. Replace `<RouterView />` with `<RouterView v-slot="{ Component }"><component :is="Component" :key="String(route.name ?? route.path)" /></RouterView>`.
- [x] 4.2 `cmp template/src/App.vue fin/src/App.vue` returns BYTE_IDENTICAL — fin's App.vue is now structurally identical to the template canon.

## 5. MIGRATION-NOTES.md

- [x] 5.1 Created `prototypes/fin/MIGRATION-NOTES.md` with frontmatter (status / created_at / source / applies_to).
- [x] 5.2 §1 Legacy inventory — concise pointer to `prototypes/fin/openspec/changes/archive/2026-04-30-migrate-fin-prototype/` for the full legacy inventory.
- [x] 5.3 §2 Decisions accumulated — 8 canonical FIN decisions listed (brand, modules, placeholders, generics, manifest registrations, no own `components/inbox/`).
- [x] 5.4 §3 Deltas vs template — the two Pattern fixes applied by this change (#13 Sidebar z-index, #16 RouterView keyed) + creation of MIGRATION-NOTES + Documentation Hierarchy 4-layer sync.
- [x] 5.5 §4 Pre-existing drift (core-layout spec 210 lines vs template 302) documented as out-of-scope follow-up. §5 Open follow-ups: `add-fin-disponibilidades` (next) and the placeholder modules' future REQs.

## 6. CLAUDE.md + AGENTS.md sync — 4-layer Documentation Hierarchy

- [x] 6.1 Edited `prototypes/fin/CLAUDE.md` "Documentation Hierarchy" section to declare 4 layers (Contracts / Project Memory / Migration Playbook / Skills), mirroring the template canon and pointing at the FIN-specific `MIGRATION-NOTES.md`.
- [x] 6.2 Replicated the same edit byte-for-byte in `prototypes/fin/AGENTS.md`.
- [x] 6.3 `cmp CLAUDE.md AGENTS.md` returns BYTE_IDENTICAL. ✓

## 7. Tests

- [x] 7.1 `npm run test:run` in fin: 41 files / 328 tests pass. No test required updates — `Sidebar.vue` tests do not snapshot class strings; `App.vue` is not directly mounted by any test (router-driven mounts use `RouterLinkStub`/test routes).

## 8. Validation gates — fin

- [x] 8.1 `npm run type-check` — exit 0. ✓
- [x] 8.2 `npm run lint` — exit 0. ✓
- [x] 8.3 `npm run test:run` — exit 0 (328/328). ✓
- [x] 8.4 `npx openspec validate --all --strict` — 14/14 pass (13 specs + 1 change). ✓
- [x] 8.5 `npm run build:qa` — exit 0 (built in 2.22s). ✓

## 9. Validation gates — template

- [x] 9.1 `cd prototypes/_core-template-frontend && npx openspec validate --all --strict` — 18/18 pass. ✓

## 10. Handover

- [x] 10.1 Working tree status confirmed: 8 modified files (2 template, 6 fin) + 2 untracked (MIGRATION-NOTES.md + the change folder).
- [x] 10.2 Suggested commit message printed for the user.
- [x] 10.3 Hand off to the user — DO NOT run `git commit` or `git push`. ✓
