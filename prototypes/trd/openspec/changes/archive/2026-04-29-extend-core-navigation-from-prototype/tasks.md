# Tasks — extend-core-navigation-from-prototype

This change has a single workstream: three new requirements added to the `core-navigation` capability spec. Real implementation of the patterns (the `<Sidebar>` `generics` slot, the `useBreadcrumb()` composable, and the `<PlaceholderPage>` component) will happen in subsequent OpenSpec changes when individual apps begin migration from the prototype.

## 1. Spec deltas

- [ ] `specs/core-navigation/spec.md` — ADDED Requirement: `Sidebar MUST render generic core modules above Domain Blocks without a Block label`, ≥3 scenarios
- [ ] `specs/core-navigation/spec.md` — ADDED Requirement: `Topbar breadcrumb MUST append the active sub-tab as a third segment`, ≥4 scenarios
- [ ] `specs/core-navigation/spec.md` — ADDED Requirement: `Routes MAY declare meta.placeholder to render the PlaceholderPage shell`, ≥4 scenarios

## 2. Validation gates

- [ ] Run `openspec validate extend-core-navigation-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the baseline specs still validate alongside the deltas
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes
- [ ] `npm run spec:check` passes (10 baseline specs + 3 new requirements on `core-navigation`)
- [ ] `npm run build:qa` passes
- [ ] Manual verification: read the merged `specs/core-navigation/spec.md` and confirm the three new requirements sit alongside the existing six without contradiction (the existing "Sidebar MUST follow the fixed section ordering" still applies; this change refines the meaning of "Home" into the four generics)

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-navigation-from-prototype`
- [ ] Confirm the CLI applies the 3 deltas into the baseline `openspec/specs/core-navigation/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-navigation-from-prototype/`
- [ ] Final commit with conventional message: `specs: extend core-navigation with generics block, sub-tab breadcrumb, and placeholder pages`
