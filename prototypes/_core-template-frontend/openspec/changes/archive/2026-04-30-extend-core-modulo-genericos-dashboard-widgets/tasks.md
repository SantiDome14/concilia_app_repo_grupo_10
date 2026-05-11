# Tasks — extend-core-modulo-genericos-dashboard-widgets

The Vue implementation already lands the new Dashboard surface (`src/pages/Dashboard.vue` rewrite: 4 KPI counter cards, "Alertas activas" widget, "Próximos vencimientos" widget, period selector, evolution chart placeholder). This change is the contract catch-up.

## 1. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement: `Dashboard MUST be a card-grid consolidated home; NO L1/L2/L3, NO domain operations` — activity-surface clause loosened to permit per-module widgets as an alternative to or alongside a single "Actividad reciente" timeline
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Scenario under the modified requirement: `Dashboard surfaces per-module activity widgets (Alertas activas + Próximos vencimientos)`
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `Dashboard MAY surface a period selector and an app-specific evolution chart placeholder; both are non-interactive with the underlying records`, with 3 scenarios

## 2. Validation gates

- [ ] Run `openspec validate extend-core-modulo-genericos-dashboard-widgets --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the deltas are applied
- [ ] Confirm `openspec/specs/core-modulo-genericos/spec.md` requirement count grows by 1 (the modification preserves the existing entry; the new period-selector requirement is the only addition)
- [ ] Confirm the Vue implementation under `src/pages/Dashboard.vue` matches the new spec — `npm run type-check` and `npm run test:run` still pass

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-modulo-genericos-dashboard-widgets`
- [ ] Confirm the CLI applies the deltas into the baseline (`openspec/specs/core-modulo-genericos/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-modulo-genericos-dashboard-widgets/`
- [ ] Final commit with conventional message: `feat(specs): enrich core-modulo-genericos Dashboard with per-module widgets, period selector, and evolution chart placeholder`
