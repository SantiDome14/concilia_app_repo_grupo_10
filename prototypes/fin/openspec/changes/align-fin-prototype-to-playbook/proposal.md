> Jira REQ: [REQ-50](https://arduasolutions.atlassian.net/browse/REQ-50) (prerequisite-blocker; REQ-50 implementation is `add-fin-disponibilidades`)
> Module: FIN
> Scope: cross-prototype — `prototypes/_core-template-frontend/` + `prototypes/fin/`

# Align fin prototype to playbook (Patterns #13, #16)

## Why

`prototypes/fin/` was scaffolded before the OPS migration canonicalised MIGRATION-PLAYBOOK Patterns #13 (sidebar z-index ladder) and #16 (`<RouterView>` keyed by `route.name`). Two operator-reported bugs documented in the playbook are reproducible in the current fin scaffold:

- **Pattern #13 unmet** — `src/components/layout/Sidebar.vue:154` uses `z-50` (and the collapse toggle on `:164` uses `z-[51]`), so with a `<Dialog>` or `<Sheet>` overlay open (z-[500]) the sidebar sits BELOW the overlay and navigation is silently consumed. Operator-reported as "no puedo navegar" on OPS 2026-05-08.
- **Pattern #16 unmet** — `src/App.vue:20` renders `<RouterView />` plain. Without a keyed `<component :is="Component" :key="String(route.name ?? route.path)" />` wrapper, route changes do not force a clean remount: teleported portals, pending async fetches and HMR-stale instances visually persist over the new route. Operator-reported as "el main sigue mostrando X" on OPS 2026-05-08.

Adjacent governance drift:

- `prototypes/fin/MIGRATION-NOTES.md` does not exist. The playbook explicitly nominates the per-prototype legacy inventory as required.
- `prototypes/fin/CLAUDE.md` + `AGENTS.md` declare a 3-layer Documentation Hierarchy (Contracts / Project Memory / Skills). The template's canonical hierarchy is **4 layers** with `MIGRATION-PLAYBOOK.md` as Layer 3 (Skills become Layer 4). Fin's drift hides the playbook's existence from agents that load `CLAUDE.md` on session start.

This change is the prerequisite-blocker for REQ-50 (`add-fin-disponibilidades`). Applying REQ-50 on a prototype with these two unfixed patterns reproduces the documented bugs.

## What Changes

This proposal touches **two prototypes** by deliberate scope decision (see `design.md` Decision 1):

### `prototypes/_core-template-frontend/`

- Promote Pattern #13 to a contract Requirement on `core-navigation` (sidebar z-index ladder above modal overlay).
- Promote Pattern #16 to a contract Requirement on `core-layout` (`<RouterView>` keyed by `route.name`).

### `prototypes/fin/`

- Replicate both new Requirements into `openspec/specs/core-navigation/spec.md` and `openspec/specs/core-layout/spec.md` (manual replica from template canon — see Decision 3).
- Fix `src/components/layout/Sidebar.vue`: `z-50` → `z-[600]`, `z-[51]` → `z-[601]`.
- Fix `src/App.vue`: wrap `<RouterView>` slot in a keyed `<component>`; add `useRoute()` import.
- Create `prototypes/fin/MIGRATION-NOTES.md` following the `prototypes/ops/MIGRATION-NOTES.md` pattern (legacy inventory of `prototypes/fin-old/fin-prototype.html`, decisions from the archived `migrate-fin-prototype` change, current deltas).
- Sync `CLAUDE.md` + `AGENTS.md` Documentation Hierarchy section to 4 layers (Contracts / Project Memory / Migration Playbook / Skills). Keep both files byte-identical.

### Explicitly out of scope

- Replicating these spec requirements into `prototypes/ops/`, `prototypes/lex/`, `prototypes/trd/`, `prototypes/clp/`. Each is its own change on its own REQ track (`align-ops-prototype-to-playbook`, etc.) — not nominated here.
- Promoting playbook Patterns #14, #17, #18, #19 to spec. They stay in `MIGRATION-PLAYBOOK.md` (see Decision 4).
- Adding `src/components/inbox/` to fin. The audit confirmed fin's Inbox uses generic components adequately; documented in MIGRATION-NOTES.md.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `core-navigation`: add **Requirement: Sidebar z-index ladder above modal overlay** with scenarios for modal-open navigation, overlay-blocked body, and account-menu-below-modal trade-off.
- `core-layout`: add **Requirement: RouterView keyed by route name** with scenarios for module-to-module navigation (forces remount), within-module query-only changes (no remount), and HMR-stale instances (forces remount on route name change).

## Impact

- **Code (fin):** `src/components/layout/Sidebar.vue` (z-index classes, 2 lines), `src/App.vue` (RouterView slot pattern, ~5 lines).
- **Docs (fin):** new `MIGRATION-NOTES.md` (~200 lines), updated `CLAUDE.md` + `AGENTS.md` Documentation Hierarchy section (~30 lines, byte-identical sync).
- **Specs (template + fin):** ~80 lines of new Requirement + scenarios per capability, replicated.
- **Tests (fin):** existing 328 tests pass today; the RouterView keying may need stubs in tests that mock `route.name`. Verified during apply.
- **Validation gates:** 5 gates in fin (lint, type-check, test:run, spec:check, build:qa) + `openspec validate --all --strict` in template.
- **Risk:** very low. The two code fixes are well-canonised in OPS where they are deployed and stable. No public API changes, no migration of data or routes.

## Baseline evidence

Audit run 2026-05-18 against the current `main` of `prototypes/fin/`:

- Structural compliance ✓ (folder layout matches template).
- Stack compliance ✓ (Vue 3.5 / TS strict / Vite 7 / OpenSpec CLI present, `.nvmrc` v20.19.0).
- OpenSpec governance ✓ (13 capabilities specs, 16 archived changes including `migrate-fin-prototype`).
- 5 quality gates all green on `main`:
  - `npm run type-check` ✓
  - `npm run lint` ✓
  - `npm run test:run` ✓ (41 files / 328 tests)
  - `npm run spec:check` ✓ (13/13 validate strict)
  - `npm run build:qa` ✓
- Patterns audited: #12 ✓, #13 ❌, #16 ❌, #19 ✓; `CLAUDE.md`/`AGENTS.md` byte-identical ✓; `MIGRATION-NOTES.md` missing ❌.

## Follow-up changes (not nominated here)

Listed for visibility; raised against their own REQs when those prototypes' migrations come up:

- `align-ops-prototype-to-playbook` — replicate spec requirements into `prototypes/ops/openspec/specs/`.
- `align-lex-prototype-to-playbook` — same, when LEX migration is scoped.
- `align-trd-prototype-to-playbook` — same, when TRD migration is scoped.
- `align-clp-prototype-to-playbook` — same, when CLP migration is scoped.
