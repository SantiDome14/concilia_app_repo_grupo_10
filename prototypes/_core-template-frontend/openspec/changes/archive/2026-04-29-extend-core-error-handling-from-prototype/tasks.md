# Tasks — extend-core-error-handling-from-prototype

This change is artifact-only at the contract level. No application code is modified by this change itself. Implementation of the three new contracts (anti-pattern register surfaces, `devWarn()` helper module, default-blocked-transition runtime + telemetry) will land in subsequent OpenSpec changes when individual apps begin migrating onto the Vue template and when the state-machine subsystem (`extend-core-data-tables-from-prototype`) is implemented.

## 1. Spec deltas

- [ ] `specs/core-error-handling/spec.md` — ADDED Requirement: `Capability MUST formally register and surface seven prohibited anti-patterns`, ≥2 scenarios
- [ ] `specs/core-error-handling/spec.md` — ADDED Requirement: `Dev-mode validation warnings MUST go through the unified devWarn helper`, ≥2 scenarios
- [ ] `specs/core-error-handling/spec.md` — ADDED Requirement: `Undeclared kanban transitions MUST be blocked with toast, card-return, and telemetry`, ≥2 scenarios

## 2. Validation gates

- [ ] Run `openspec validate extend-core-error-handling-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the three deltas are applied
- [ ] Confirm `openspec/specs/core-error-handling/spec.md` will grow from 9 requirements to 12 once the change is archived (toasts shared instance, toasts title+description, EmptyState, Skeleton, 401, 403, network/5xx, errorHandler, alert banners → + anti-pattern register, + devWarn, + default-blocked transitions)
- [ ] Confirm cross-references in the new requirements (anti-patterns 1–3 → `core-layout`; anti-pattern 4 + 7 → `core-actions-menu`; anti-patterns 5–6 + default-blocked → `core-data-tables`; `mode: 'modal'` escape → `core-modals`) point to existing or in-flight capabilities and do not introduce dangling links
- [ ] Confirm the seven `devWarn` categories (`MANIFEST`, `VIEWS`, `KANBAN`, `STATES`, `PREDICATES`, `BREADCRUMB`, `THEME`) match the categories named in the corresponding sibling changes (`extend-core-actions-menu-from-prototype`, `extend-core-data-tables-from-prototype`, `extend-core-navigation-from-prototype`, etc.)

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-error-handling-from-prototype`
- [ ] Confirm the CLI applies the three deltas into the baseline (`openspec/specs/core-error-handling/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-error-handling-from-prototype/`
- [ ] Final commit with conventional message: `feat(specs): extend core-error-handling with anti-pattern register and dev-mode warnings`
