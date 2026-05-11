# Tasks — add-core-module-types

The Vue implementation already lands both demos (`src/pages/ModuloA.vue` for Type A, `src/pages/ModuloB.vue` for Type B). This change is a contract addition so the patterns become normative for every cloning app.

## 1. Spec deltas

- [ ] `specs/core-module-types/spec.md` — ADDED Requirement: `Module Type A — direct record management — MUST follow the L1/L2/L3 pattern over a single record set`, with 4 scenarios
- [ ] `specs/core-module-types/spec.md` — ADDED Requirement: `Module Type B — summary-first with record-feeding sub-tabs — MUST lead with a summary surface and expose its record-feeding data models as functional sub-tabs below the page header`, with 5 scenarios
- [ ] `specs/core-module-types/spec.md` — ADDED Requirement: `Cloning apps MUST choose Type A or Type B per module based on whether the module's primary job is "browse records" (A) or "show state, then drill into the records that produced it" (B)`, with 3 scenarios

## 2. Validation gates

- [ ] Run `openspec validate add-core-module-types --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the new capability is applied
- [ ] Confirm the implementations under `src/pages/ModuloA.vue` and `src/pages/ModuloB.vue` match the new spec — `npm run type-check` and `npm run test:run` still pass

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive add-core-module-types`
- [ ] Confirm the CLI creates `openspec/specs/core-module-types/spec.md` from the change deltas and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-module-types/`
- [ ] Final commit with conventional message: `feat(specs): add core-module-types capability — Module Type A (direct record management) and Module Type B (summary-first with record-feeding sub-tabs)`
