# Tasks — Migrate FIN prototype to core-template-frontend scaffold

## 1. Branding & theme

- [ ] `package.json` `name` → `core-fin`
- [ ] `index.html` `<title>` → `FIN · Ardua — Finanzas y Contabilidad`; update `<meta name="description">` accordingly
- [ ] `src/styles/globals.css` `--brand` → `142 71% 45%`
- [ ] `CLAUDE.md` Project Overview + Branding rewritten for `core-fin` (mirror to `AGENTS.md` byte-identically)
- [ ] `openspec/config.yaml` → `context:` first paragraph rewritten for `core-fin`
- [ ] Run `npm run lint && npm run type-check && npm run spec:check` → green

## 2. Routes & sidebar IA

- [ ] `src/config/routes.ts` — add `MOVIMIENTOS`, `COTIZACIONES`, `TESORERIA` paths/names; add 9 `SOON_*` paths/names; remove `MODULO_A/B/C`
- [ ] `src/router/routes.ts` — register 4 active + 9 soon routes with `meta.block` (`Back Office` / `Tesorería` / `Contabilidad`) and `meta.breadcrumb`
- [ ] `src/components/layout/Sidebar.vue` — replace `Bloque 1` / `Bloque 2` with `Back Office` / `Tesorería` / `Contabilidad`; render `Soon` pill on placeholder entries
- [ ] Delete `src/pages/ModuloA.vue`, `ModuloB.vue`, `ModuloC.vue` and their `.spec.ts` siblings
- [ ] Run `npm run lint && npm run type-check` → green

## 3. Domain types

- [ ] `src/types/fin.ts` — `Movimiento`, `Quote`, `RetiroCola`, `CargaManualSolicitud`, `Sociedad`, `CuentaBancaria`, `ImputacionState`, `FacturaState`, `MovimientoTipo`, `Moneda` (shapes derived from manifest dialogs + prototype seed)
- [ ] Re-export from `src/types/index.ts` if a barrel exists
- [ ] Run `npm run type-check` → green

## 4. Manifest port (JS → TS strict)

- [ ] `src/manifests/fin.tesoreria.actions.ts` — port from `prototypes/fin-old/manifests/fin.tesoreria.actions.js` (smallest first, surfaces schema gaps)
- [ ] `src/manifests/fin.tesoreria.cola_asignacion.actions.ts` — port the 1-action record manifest
- [ ] `src/manifests/fin.cotizaciones.actions.ts` — port 4 actions + kanban axis `fin.facturaState`
- [ ] `src/manifests/fin.movimientos.actions.ts` — port 9 actions + kanban axis `fin.imput` (key `fin.movimientos`, action ids prefixed `fin.movimientos.*`)
- [ ] Re-key cross-cutting demo manifests `framework.template.{inbox,alertas,reportes}` → `fin.{inbox,alertas,reportes}` (rename files + key strings + identifiers + page imports). Delete `framework.template.modulo_a.actions.ts`.
- [ ] `src/plugins/manifests.ts` — register all 7 manifests (3 cross-cutting + 4 FIN-domain)
- [ ] `src/lib/manifest/validateManifest.spec.ts` — replace `MODULO_A_MANIFEST` test cases with cases covering the 4 FIN-domain manifests
- [ ] Run `npm run lint && npm run type-check && npm run test:run && npm run spec:check` → green

## 5. Mock data extraction

- [ ] `src/mocks/fin/movimientos.ts` — ≥10 records covering all `imputacion` states + `pendientes` / `resueltos` segmenter
- [ ] `src/mocks/fin/quotes.ts` — ≥6 records covering all `documentacion` states
- [ ] `src/mocks/fin/retiros_cola.ts` — ≥4 records
- [ ] `src/mocks/fin/sociedades.ts` — catalog
- [ ] `src/mocks/fin/cuentas_bancarias.ts` — catalog filtered by `sociedad_id`
- [ ] `src/mocks/fin/index.ts` — barrel
- [ ] Remove leftover `framework.template` mock seeds that no page consumes

## 6. Active page — Movimientos

- [ ] `src/pages/Movimientos.vue` — L1 header (title + Main CTA per manifest) + L2 KPI grid + L3 (search + filters incl. Período + Estado dropdowns + ViewToggle list/kanban)
- [ ] No status segmenter — Período + Estado are regular L3 filter dropdowns (status segmenters from the legacy HTML prototype are dropped — see `feedback_fin-segments-deprecated`)
- [ ] List view: `useTable` with FIN movimientos mock; `<ManifestActionsMenu manifest-key="fin.movimientos" :record="row" />`
- [ ] Kanban view: kanban axis `fin.imput`, columns from `imputacion` state machine, drag transitions wired
- [ ] `Movimientos.spec.ts` — happy-path: renders, view toggle switches, Período filter narrows results, action menu opens for a row

## 7. Active page — Cotizaciones

- [ ] `src/pages/Cotizaciones.vue` — L1/L2/L3 + ViewToggle (list/kanban via axis `fin.facturaState`)
- [ ] `<ManifestActionsMenu manifest-key="fin.cotizaciones" :record="row" />` on the list view
- [ ] `Cotizaciones.spec.ts` — happy-path

## 8. Active page — Tesorería / Disponibilidades

- [ ] `src/pages/Tesoreria.vue` — L1/L2/L3 with `<ManifestModuleCTAs manifest-key="fin.tesoreria" />` (renders `Cargar movimiento manual`); Segmenter (`posición` / `movimientos` / `cola`)
- [ ] `posición` segment: balances per (sociedad, cuenta, moneda) — derived view over movimientos mock
- [ ] `movimientos` segment: full movimientos table (read-only here; actions live in Operaciones)
- [ ] `cola` segment: list of `retiro_cola` records with `<ManifestActionsMenu manifest-key="fin.tesoreria.cola_asignacion" :record="row" />`
- [ ] `Tesoreria.spec.ts` — happy-path

## 9. Soon stub

- [ ] `src/pages/ModuloSoon.vue` — single page reused by 9 routes
- [ ] Visual: `EmptyState` with title `Próximamente` + description from `route.meta.breadcrumb`
- [ ] `ModuloSoon.spec.ts` — renders the breadcrumb in the title and body

## 10. Adapt cross-cutting modules

- [ ] `Reportes.vue` — swap demo report catalog for ≥4 FIN-specific reports (e.g., Movimientos por sociedad, Posición consolidada, Quotes facturadas, Retiros pendientes); drop the `catalogo / historico` segmenter and use a state filter in L3 instead.
- [ ] `Dashboard.vue` — swap demo KPIs for FIN KPIs (Movimientos pendientes, Quotes a facturar, Retiros en cola, Posición total USD)
- [ ] `Inbox.vue` — keep generic `solicitud` shape; seed with FIN-source examples (a few `carga_manual_solicitud` items)
- [ ] `Alertas.vue` — keep generic; seed with ≥3 FIN-source alert examples; drop the `nuevas / historico` segmenter, replaced by a state filter in L3.
- [ ] Update existing `*.spec.ts` to reflect FIN-themed seed without weakening assertions

## 11. Quality gates

- [ ] `npm run lint` → exit 0
- [ ] `npm run type-check` → exit 0
- [ ] `npm run test:run` → exit 0
- [ ] `npm run spec:check` → exit 0
- [ ] `npm run build:qa` → exit 0
- [ ] `npm run dev` smoke check — sidebar shows 3 blocks + 4 cross-cutting routes; each active page loads without console errors; each Soon route renders the placeholder
