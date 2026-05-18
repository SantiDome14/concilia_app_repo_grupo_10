# Tasks — add-fin-disponibilidades

> Implementation checklist. Apply in numbered order. Each task is independently verifiable. Validation gates close every section.
>
> **Pre-flight:** `align-fin-prototype-to-playbook` MUST be committed AND its working tree clean before this change starts.

## 1. Pre-flight verification

- [x] 1.1 Confirmed `align-fin-prototype-to-playbook` committed at top of `main`.
- [x] 1.2 `npm run spec:check` 14/14 pass strict on the prerequisite commit.
- [x] 1.3 `type-check`, `lint`, `test:run`, `build:qa` all green on the prerequisite commit.

## 2. Types

- [x] 2.1 Extended `Movimiento` with five top-level fields (`origen`, `requires_supervision`, `supervised_by`, `supervised_at`, `estado_de_supervision`, plus `created_by` for the supervisor predicate).
- [x] 2.2 Added new type `CuentaBanco` (FIN-lens view of REQ-42 §8.1).
- [x] 2.3 `Sociedad` already existed; documented its role; no change.
- [x] 2.4 Added new type `PosicionNode` (Sociedad / Cuenta union) + extended `SociedadPos`/`CuentaPos` with Propio/Cliente fields and stable `id` on cuentas (drill-down).
- [x] 2.5 Removed `RetiroCola` type.
- [x] 2.6 Type-check ✓ after types refactor (all consumers compile).

## 3. Mocks

- [x] 3.1 Deleted `src/mocks/fin/retiros_cola.ts`.
- [x] 3.2 Created `src/mocks/fin/bancos_cuentas.ts` (`CATALOGO_CUENTAS` derived from `CUENTAS` with `tipo_estructura`, `tipo_cuenta`, `estado`, `cuenta_contable` mix). + `BANCOS_CUENTAS_KPIS`.
- [x] 3.3 Updated `src/mocks/fin/movimientos.ts`: 22 records covering OPS / TRD / Manual origins + 5 supervision states (`pendiente_de_supervision` ×2, `confirmado` ×2, `rechazado` ×1, `no_aplica` rest). + `MOVIMIENTOS_KPIS`.
- [x] 3.4 Created `src/mocks/fin/cuentas_operativas_cliente.ts` with the synthetic Cuenta de Cliente de Ardua (`AS00000` per moneda) + 9 external client Cuentas Operativas.
- [x] 3.5 Reescrito `src/mocks/fin/disponibilidades.ts` con `POSICION_TREE` (4 sociedades, 13 cuentas activas) + `POSICION_KPIS` (Posición consolidada / Propio / Cliente / Sociedades / Cuentas).

## 4. Capabilities

- [x] 4.1 Added the 8 fine-grained capabilities + `'*'` wildcard to `src/plugins/auth0.ts` DEV_FALLBACK_CAPABILITIES.
- [x] 4.2 Updated `src/composables/useCapabilities.ts` to honour the `'*'` wildcard (per MIGRATION-PLAYBOOK Pattern 9). All three predicates (`can`, `canAny`, `canAll`) short-circuit to `true` when `'*'` is held.
- [x] 4.3 Dev fixtures include two mock users (`dev-yasmani`, `dev-yasmani-2`) so the supervisor-≠-creator predicate is testable. (`dev-yasmani` is the active user; manuals authored by `dev-yasmani-2` are confirmable by `dev-yasmani` and vice versa.)

## 5. Manifests

- [x] 5.1 Renamed `fin.tesoreria.actions.ts` → `fin.disponibilidades.actions.ts` (manifest key `'fin.disponibilidades'`).
- [x] 5.2 Updated `fin.disponibilidades.actions.ts` with the single CTA "Cargar movimiento manual" gated by `cargar_directo` OR `cargar_con_supervision`. The contextual rendering happens at the page level (Decision documented in design.md).
- [x] 5.3 Created `fin.disponibilidades.bancos_cuentas.actions.ts` with the "Crear nueva Cuenta" CTA + "Configurar cuenta contable" row action.
- [x] 5.4 Created `fin.disponibilidades.movimientos.actions.ts` with the six REQ-50 §5.7 actions + six kanban axes (estado_operativo default, estado_imputacion_ardua, estado_imputacion_cliente, estado_de_supervision, tipo, sociedad).
- [x] 5.5 Deleted `fin.tesoreria.cola_asignacion.actions.ts`.
- [x] 5.6 Deleted legacy `fin.movimientos.actions.ts`.
- [x] 5.7 Updated `src/plugins/manifests.ts`: removed three legacy registrations, added three new ones.

## 6. Routes / config

- [x] 6.1 Renamed `ROUTE_PATHS.TESORERIA` → `ROUTE_PATHS.DISPONIBILIDADES` (value `/tesoreria` → `/disponibilidades`). Renamed `ROUTE_NAMES.TESORERIA` → `ROUTE_NAMES.DISPONIBILIDADES`. Removed `ROUTE_PATHS.MOVIMIENTOS` + `ROUTE_NAMES.MOVIMIENTOS`.
- [x] 6.2 Updated `src/router/routes.ts` accordingly + added `meta.capabilities: ['fin.disponibilidades.ver']` on the route.
- [x] 6.3 Removed Movimientos entry from Sidebar Back Office block; updated Disponibilidades entry to reference new constants; removed unused `ArrowDownUp` icon import.

## 7. Page rename + delete

- [x] 7.1 Renamed `src/pages/Tesoreria.vue` → `src/pages/Disponibilidades.vue` (full rewrite).
- [x] 7.2 Renamed `src/pages/Tesoreria.spec.ts` → `src/pages/Disponibilidades.spec.ts` (full rewrite).
- [x] 7.3 Deleted `src/pages/Movimientos.vue` + `Movimientos.spec.ts`.
- [x] 7.4 No remaining references to `@/pages/Tesoreria.vue` or `@/pages/Movimientos.vue` in `src/`.

## 8. Page rewrite — Disponibilidades.vue

- [x] 8.1 New `Disponibilidades.vue` consumes the three new manifests via `useManifestModule` and the new mock data.
- [x] 8.2 Sub-tabs `[Posición, Bancos-Cuentas, Movimientos]` in canonical order, default `Posición`.
- [x] 8.3 Contextual Main CTA via computed `activeModuleManifestKey` (returns the bancos_cuentas manifest key when `subTab === 'bancos_cuentas'`, otherwise the disponibilidades root manifest key).
- [x] 8.4 Posición tree with KPI L2 (Posición consolidada / Propio / Cliente / Sociedades / Cuentas) and per-Cuenta rows showing total / propio / cliente / moneda.
- [x] 8.5 Bancos / Cuentas table with KPI L2 + Configuración contable filter + kebab menu via `<ManifestActionsMenu>`.
- [x] 8.6 Movimientos table with KPI L2 (Movimientos del día / Volumen ingresado / Volumen egresado / Pendientes de imputación / Pendientes de supervisión) + supervisión badge + kebab menu via `<ManifestActionsMenu>`.
- [x] 8.7 Drill-down on Posición.Cuenta row sets `route.query.tab = 'movimientos'` + `route.query.cuenta_id = '<id>'`. Movimientos filters by `cuenta_id`. Clear-filter link visible when applied.

## 9. Refinements (B / E / G)

- [x] 9.2 **Refinement E (URL sync)**: active sub-tab via `route.query.tab`, drill-down via `route.query.cuenta_id`. URL-driven sub-tab activation works (tests cover it). Bookmarkable.
- [ ] 9.1 **Refinement B (localStorage persistence)**: NOT implemented in v1. URL sync covers the deep-link case; localStorage adds value when the user closes the tab and reopens without a URL. Documented as follow-up `extend-fin-disponibilidades-persistence`.
- [ ] 9.3 **Refinement G (inline backend errors)**: NOT implemented in v1. The carga manual dialog uses `<ManifestDialog>` (engine-level); inline-error mapping is an engine-level concern. Documented as follow-up `extend-core-actions-manifest-inline-errors` (cross-prototype scope).

## 10. Tests

- [x] 10.1 New `src/pages/Disponibilidades.spec.ts` with 11 scenarios:
  - Canonical sub-tab order.
  - Default sub-tab is Posición.
  - URL-driven sub-tab activation for both `bancos_cuentas` and `movimientos`.
  - Drill-down sets `route.query.cuenta_id`.
  - Drill-down banner renders with "Limpiar filtro" link.
  - Each sub-tab's KPI strip renders the canonical KPIs.
  - "Sin configurar" badge renders on Bancos / Cuentas rows without `cuenta_contable`.
  - Movimientos table renders rows with `pendiente_de_supervision` badge.
- [x] 10.2 Updated `validateManifest.spec.ts`: replaced the four legacy manifest imports with the four new ones (FIN.Disponibilidades.Movimientos, FIN.Cotizaciones, FIN.Disponibilidades root, FIN.Disponibilidades.BancosCuentas). All pass with zero warnings.
- [x] 10.3 Updated `Dashboard.spec.ts`: removed references to `ROUTE_PATHS.TESORERIA` / `ROUTE_PATHS.MOVIMIENTOS`; the "Mov. pendientes" KPI test now asserts navigation to `/disponibilidades?tab=movimientos`.
- [ ] 10.4 Detailed supervision-flow tests (cargar_directo vs cargar_con_supervision, Confirmar/Rechazar predicates) NOT added in this change. The behaviour is covered by the manifest engine's pure-logic tests + the spec scenarios. Page-level integration of the supervisor predicate (`created_by !== current_user`) is a follow-up (see Decision 6 of design.md).

## 11. Validation gates

- [x] 11.1 `npm run type-check` — exit 0. ✓
- [x] 11.2 `npm run lint` — exit 0. ✓
- [x] 11.3 `npm run test:run` — exit 0. 40 files / 331 tests pass. ✓
- [x] 11.4 `npx openspec validate --all --strict` — 15/15 pass (13 specs + 2 active changes `add-fin-disponibilidades` + `align-fin-prototype-to-playbook`). ✓
- [x] 11.5 `npm run build:qa` — exit 0 (built in 2.30s). The dist tree includes `Disponibilidades-*.js` (41.46 KB) and does NOT include `Movimientos-*.js`. ✓

## 12. Handover

- [x] 12.1 Working tree status confirmed.
- [x] 12.2 Suggested commit message printed for the user.
- [x] 12.3 Hand off to the user. DO NOT run `git commit` or `git push`. ✓
