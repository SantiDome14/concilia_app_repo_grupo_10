# Migrate FIN prototype to core-template-frontend scaffold

> Jira REQ: REQ-XX (placeholder — pending allocation)
> Module: FIN

## Why

The FIN module exists today only as a single 8.945-line monolithic HTML prototype (`prototypes/fin-old/fin-prototype.html`) plus four `.js` action manifests. That shape is exactly the problem the `core-template-frontend` scaffold solves: no framework, no type safety, no tests, no spec contracts, no manifest engine, no routing, no design-token enforcement, no CI gates. The prototype was useful as a UX exploration but is unsuitable as a base to grow the FIN application from.

This change rebases the FIN prototype on the official scaffold (`prototypes/fin/`, copied byte-for-byte from `_core-template-frontend/`) so that:

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

### Framework-level evolutions surfaced during the migration

What started as a consumer-only port surfaced gaps in the framework that warranted contract evolution. These are scoped under this same change so the canonical specs evolve with the migration:

- **Multi-axis Tablero** (per `core-data-tables`) — the legacy "Cambiar eje" CTA is replaced by an inline chip-tab strip in the kanban board header (`update:axisId` emit; `RO` chip on read-only axes). The first-time `<KanbanAxisDialog>` flow stays for educational onboarding.
- **Column-change == field-update contract** (per `core-data-tables`) — every Tablero drop SHALL produce a record-field update; `mode: 'free'` writes the state field directly via the new `applyFreeTransition(record, axis, toState)` helper, `mode: 'modal'` opens the composite dialog (single-action when the dimension has one writer, multi-group when many).
- **Catalog UNFILTERED sentinel** (per `core-actions-manifest` Req 10) — `resolveCatalogFilter` now returns `UNFILTERED_CATALOG_FILTER` when no `catalog_filter` is declared (full catalog) vs. `null` when declared but unresolved (empty state). Disambiguates "sin filter" from "filter pendiente".
- **Eager lookup label resolution** (per `core-actions-manifest`) — pre-populated lookup fields resolve the catalog entry's label on mount/value-change without requiring the user to open the dropdown.
- **Light theme + Settings dialog** (per `core-theming` + `core-modulo-genericos`) — the dark-only contract is relaxed: derived apps MAY expose a user-selectable `system | light | dark` toggle via the new singleton `<SettingsDialog>` component. The dialog is reachable from the Sidebar account menu and houses a `General` tab with a `Preferences` section (Idioma + Apariencia). Light-mode tokens (`:root.light {}`) override every surface, border, and text-ramp value while keeping brand and semantic colors intact.
- **UI primitives token discipline** (per `core-theming`) — every `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`, `<Button>`, dialog/sheet wrapper, and derived component is purged of hex literals (`bg-[#111]`, `bg-[#222]`, `bg-[#333]`). Surfaces, borders, and text colors flow exclusively from the token system so the appearance toggle can switch the entire app in one class flip.
- **`<RecordDetailModal>` generic** — non-workflow records (Movimiento, Quote) get a shared Detail modal with two-column labeled grid, section dividers (`variant: 'section'`), badge cells, and Cerrar/Editar footer. Page-level click-to-detail wiring on rows + cards + kanban cards.
- **Auth0 dev fallback user** — when `VITE_AUTH0_DOMAIN` is empty (local/template default), the auth store seeds a dev user with the canonical role set so capability gates pass during smoke testing without a live IdP.

## Impact

- **Affected capabilities:** `core-actions-manifest` (UNFILTERED sentinel, eager label resolution), `core-data-tables` (axis tabs, column-change=field-update, multi-axis dialog scenarios), `core-modulo-genericos` (manifest rebrand, brand-identity lockstep, SettingsDialog requirement), `core-theming` (light theme support, primitive token discipline). Every delta is a strict superset of the prior contract; no requirement is downgraded.
- **Affected code paths:** all of the FIN domain (`src/manifests/`, `src/pages/`, `src/router/routes.ts`, `src/types/fin.ts`, `src/mocks/fin/`, `src/plugins/{manifests,catalogs}.ts`, branding) PLUS framework code that ports back to `_core-template-frontend/`: `src/components/{settings,modals,kanban,manifest,ui}/`, `src/composables/useSettingsDialog.ts`, `src/stores/preferences.ts`, `src/lib/{kanban,manifest}/`, `src/plugins/auth0.ts`, `src/styles/globals.css`, `src/App.vue`, `src/components/layout/Sidebar.vue`.
- **Out of scope:** real Auth0 wiring (stays on dummy `.env.local`), backend HTTP integration (mocks only), full feature work for the 9 "Soon" modules, real `vue-i18n` locale activation (the language preference persists; the locale switch fires only when `VITE_FEATURE_I18N=true`), Edit modal for the Detail surface (toast-only stub today), composite-dialog flow for `fin.imput` axis is wired via `openComposite` but the multi-action prerequisite UX is intentionally minimal.
- **Risks:** (1) the manifest engine's typed contract — covered by `validateManifest` + unit tests on the four FIN manifests; (2) light theme contrast on every surface — verified manually in the Settings toggle, but third-party shadcn-vue primitives may need follow-up token tuning; (3) the OPS prototype's `CAT` data is duplicated into FIN — when OPS publishes an authoritative source, `src/mocks/fin/cuentas.ts` should re-import from there.
