# Migrate FIN prototype to core-template-frontend scaffold

> Jira REQ: REQ-XX (placeholder — pending allocation)
> Module: FIN

## Why

The FIN module exists today only as a single 8.945-line monolithic HTML prototype (`prototypes/fin-old/fin-prototype.html`) plus four `.js` action manifests. That shape is exactly the problem the `core-template-frontend` scaffold solves: no framework, no type safety, no tests, no spec contracts, no manifest engine, no routing, no design-token enforcement, no CI gates. The prototype was useful as a UX exploration but is unsuitable as a base to grow the FIN application from.

This change rebases the FIN prototype on the official scaffold (`prototypes/fin/`, copied byte-for-byte from `_core-template/`) so that:

- Every FIN page complies with the 11 capability contracts (`core-layout`, `core-navigation`, `core-data-tables`, `core-actions-menu`, `core-actions-manifest`, `core-modals`, `core-theming`, `core-forms`, `core-api-layer`, `core-auth`, `core-error-handling`, `core-modulo-genericos`, `core-module-types`).
- The four legacy JS manifests (`fin.operaciones.movimientos`, `fin.cotizaciones`, `fin.tesoreria`, `fin.tesoreria.cola_asignacion`) are ported to TypeScript-strict and consumed by the typed manifest engine in `src/lib/manifest/`.
- The information architecture documented in the prototype (4 active modules + 9 "Soon" placeholders organized in 3 blocks: Back Office / Tesorería / Contabilidad) becomes routed pages with `meta.block` + `meta.breadcrumb`, rendered by the existing `Sidebar.vue` and the L1/L2/L3 page pattern.
- The FIN brand (`--brand: 142 71% 45%` per `core-theming`) re-themes the entire app via the single design-token entry point.
- The five quality gates (`lint`, `type-check`, `test:run`, `spec:check`, `build:qa`) pass green after migration, replacing the prototype's "open the file in a browser" verification model.

## What Changes

### Active modules (4)

- **Movimientos** (record `movimiento`) — L1/L2/L3 page with `list` + `kanban` views (kanban axis `fin.imput` driven by `imputacion` dimension), 9 row actions from the ported manifest. The legacy `pendientes / resueltos` segmenter is dropped — period and state are exposed as L3 filters.
- **Cotizaciones / Quotes** (record `quote`) — L1/L2/L3 page with `list` + `kanban` views (kanban axis `fin.facturaState` driven by `documentacion` dimension), 4 row actions from the ported manifest.
- **Tesorería / Disponibilidades** — L1/L2/L3 page with segmenter (`posición` / `movimientos` / `cola`) — these are distinct datasets, not status filters, so the `<Segmenter>` is preserved. 1 module CTA (`Cargar movimiento manual` from `fin.tesoreria` manifest), 1 row action on the `cola` segment (`Asignar cuenta de origen` from `fin.tesoreria.cola_asignacion`).
- **Reportes** — adapted from the generic page with FIN-specific catalog seed; the legacy `catalogo / historico` segmenter is dropped in favour of L3 filters.

### Placeholder modules (9, behind "Soon")

Compras, Cobros, Pagos, Deudas / Préstamos, Inversiones, Monedas, Plan de Cuentas, Parametrizaciones, Libro Diario — each registered as a route that renders a single shared `ModuloSoon.vue` page with an `EmptyState` ("Próximamente") so the sidebar stays navigable and the IA matches the prototype.

### Cross-cutting modules (preserve from scaffold, lightly themed)

Dashboard, Inbox, Alertas — kept as-is per `core-modulo-genericos` (apps MUST register the four cross-cutting routes); KPI seeds and demo records swapped to FIN-domain examples without changing structure.

### Removed from scaffold

- Demo manifests `framework.template.{inbox,alertas,modulo_a,reportes}.actions.ts` (manifests are kept only for FIN modules; the four cross-cutting modules — Inbox, Alertas, Reportes, Dashboard — are reframed as consumers of FIN data without their own action manifests in this app).
- Demo pages `ModuloA.vue`, `ModuloB.vue`, `ModuloC.vue` and their specs.
- Demo `Bloque 1` / `Bloque 2` sidebar groups.

### Branding

- `package.json` `name` → `core-fin`.
- `index.html` `<title>` → `FIN · Ardua — Finanzas y Contabilidad`.
- `src/styles/globals.css` `--brand` → `142 71% 45%` (FIN canonical green per `core-theming`).
- `CLAUDE.md` and `AGENTS.md` overview rewritten in lockstep (mirror rule). Branding section updated. Tech-stack and conventions sections retained byte-identical.
- `openspec/config.yaml` → `context:` first paragraph rewritten to describe `core-fin`.

## Impact

- **Affected capabilities:** none (no spec deltas — every contract already covers the patterns used). This is a pure consumer change of the existing 11 capabilities.
- **Affected code paths:** `src/manifests/`, `src/pages/`, `src/router/routes.ts`, `src/components/layout/Sidebar.vue`, `src/types/fin.ts` (new), `src/mocks/fin/`, `src/styles/globals.css`, `src/plugins/manifests.ts`, `package.json`, `index.html`, `CLAUDE.md`, `AGENTS.md`, `openspec/config.yaml`.
- **Out of scope:** real Auth0 wiring (stays on the dummy `.env.local`), backend API integration (mocks only), the 9 "Soon" modules' actual feature work.
- **Risks:** the 4 manifests carry domain-specific kanban axes (`fin.imput`, `fin.facturaState`); these must validate against the engine's typed contract — covered by `npm run spec:check` and unit tests on the resolver. The "list+kanban" duo on Operaciones/Cotizaciones requires confirming the `core-module-types` axis declaration shape is sufficient.
