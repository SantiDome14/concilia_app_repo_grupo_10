# Tasks — finish-rename-alerta-concept-and-actionconfig-placement

## 1. Types

- [ ] `src/types/genericos.ts` — rename `Alerta.type: string` → `Alerta.concept: string`. Update `isAlerta` type guard.

## 2. Page + mocks + tests

- [ ] `src/pages/Alertas.vue` — `a.type` / `drawerAlerta.type` reads → `a.concept` / `drawerAlerta.concept`; `filterType` ref → `filterConcept`; `ACTIVE_TYPES` → `ACTIVE_CONCEPTS`; column header "Tipo" → "Concepto"; filter label "Tipo · Todos" → "Concepto · Todos"; Drawer card "Tipo" → "Concepto".
- [ ] `src/mocks/genericos/alertas.ts` — replace every `type:` (for the four canonical values) → `concept:`.
- [ ] `src/pages/Alertas.spec.ts` — fix any assertions that read `a.type` or include `type:` in mock fixtures.

## 3. Spec delta

- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement: *Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics*. Body updated to reference `concept: string` in the canonical Alerta listing.

## 4. Product source-of-truth (separate commit on the same branch)

- [ ] `features/common/centro-de-alertas.md` — rename `Alerta.type` → `Alerta.concept` in TS listings, scenarios, and prose. `Alerta.category` is unchanged.
- [ ] `discoveries/core-modulos-transversales-briefing-tech.md` — ActionConfig prose: rename `kind: 'row_action' | 'module_cta'` (the locator) → `placement: 'row_action' | 'module_cta'`. Update related comments (e.g. "kind como locator" → "placement como locator").

## 5. Validation gates

- [ ] `openspec validate finish-rename-alerta-concept-and-actionconfig-placement --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 6. Archive + commits

- [ ] `openspec archive finish-rename-alerta-concept-and-actionconfig-placement`
- [ ] Template commit: `refactor(alertas): rename Alerta.type→concept, aligning with Solicitud.concept naming`
- [ ] Product commit (same branch): `docs(features): propagate Alerta.type→concept and ActionConfig.kind→placement rename to centro-de-alertas + briefing-tech`
