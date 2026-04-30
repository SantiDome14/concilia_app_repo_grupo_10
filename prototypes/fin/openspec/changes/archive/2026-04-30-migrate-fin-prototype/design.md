# Design — Migrate FIN prototype to core-template-frontend scaffold

## Framing

> The prototype's value is the IA, the action set per module, the kanban shape, the dialog copy, and the FIN-specific record fields. Its **shape** (single 8.945-line HTML/JS file) is the problem we are deliberately discarding. The new repo IS the scaling solution; this migration expresses the same structure / components / functionalities through Vue 3 + TS strict + Vite + reka-ui + manifest engine — not byte-for-byte HTML/CSS port.

## Scope decisions (locked at proposal review)

1. **OpenSpec workflow** — formal change with branch `temp-open-spec/migrate-fin-prototype`. PR title mirrors `proposal.md` H1.
2. **Jira REQ** — placeholder `REQ-XX`; user will update on ticket creation.
3. **Soon modules** — registered as real routes pointing to a shared `ModuloSoon.vue` (option a). Sidebar shows them with the `Soon` ribbon from the prototype.
4. **Mock data** — extracted from the prototype HTML (option a). Provides a richer demo experience and a realistic fixture set for tests.
5. **Cross-cutting modules** — kept structurally as-is, content adapted to FIN minimally.

## Information architecture mapping

| Prototype (`fin-old/fin-prototype.html`) | Migration target | Block | Status |
|---|---|---|---|
| `page-dashboard` | `pages/Dashboard.vue` (existing) | top-level | Active |
| `page-inbox` | `pages/Inbox.vue` (existing) | top-level | Active |
| `page-alertas` | `pages/Alertas.vue` (existing) | top-level | Active |
| `page-reportes` | `pages/Reportes.vue` (existing) | top-level | Active |
| `page-movimientos` | `pages/Movimientos.vue` (new) | Back Office | Active |
| `page-quotes` | `pages/Cotizaciones.vue` (new) | Back Office | Active |
| `page-compras` | `pages/ModuloSoon.vue` | Back Office | Soon |
| `page-tesoreria` | `pages/Tesoreria.vue` (new) | Tesorería | Active |
| `page-cobros` | `pages/ModuloSoon.vue` | Tesorería | Soon |
| `page-pagos` | `pages/ModuloSoon.vue` | Tesorería | Soon |
| `page-deudas-prestamos` | `pages/ModuloSoon.vue` | Tesorería | Soon |
| `page-inversiones` | `pages/ModuloSoon.vue` | Tesorería | Soon |
| `page-monedas` | `pages/ModuloSoon.vue` | Tesorería | Soon |
| `page-plan-cuentas` | `pages/ModuloSoon.vue` | Contabilidad | Soon |
| `page-asientos` (Parametrizaciones) | `pages/ModuloSoon.vue` | Contabilidad | Soon |
| `page-libro-diario` | `pages/ModuloSoon.vue` | Contabilidad | Soon |

`page-asientos`'s prototype label is `Parametrizaciones` (not `Asientos`); we preserve the prototype label in `meta.breadcrumb` and use the kebab-case route path.

## Manifest port (JS → TS strict)

Source: `prototypes/fin-old/manifests/*.js` (loose objects assigned to `window.ACTION_MANIFEST`).
Target: `prototypes/fin/src/manifests/*.ts` (typed exports of `Manifest` from `@/types/manifest`).

| Source `.js` | Target `.ts` | Scope | Records | Notes |
|---|---|---|---|---|
| `fin.operaciones.movimientos.actions.js` (351 lines) | `fin.movimientos.actions.ts` | record | `movimiento` | 9 actions; kanban axis `fin.imput` (col_field `imputacion`); largest port. Re-keyed to `fin.movimientos` (2-segment) since the FIN module is renamed Operaciones → Movimientos. Action ids prefixed `fin.movimientos.*`. |
| `fin.cotizaciones.actions.js` (158 lines) | `fin.cotizaciones.actions.ts` | record | `quote` | 4 actions; kanban axis `fin.facturaState` (col_field `documentacion`) |
| `fin.tesoreria.actions.js` (84 lines) | `fin.tesoreria.actions.ts` | module | (none) | 1 module CTA `Cargar movimiento manual` |
| `fin.tesoreria.cola_asignacion.actions.js` (61 lines) | `fin.tesoreria.cola_asignacion.actions.ts` | record | `retiro_cola` | 1 action `Asignar cuenta de origen` |

Translation rules:
- `window.ACTION_MANIFEST["..."]` → `export const FIN_<UPPERCASE>_MANIFEST_KEY = '...' as const` + `export const FIN_<UPPERCASE>_MANIFEST: Manifest = { ... }`.
- Numeric/boolean literals stay as-is. Field type unions (`select` / `lookup` / `text` / `textarea` / `number` / `date`) come from `@/types/manifest`.
- Catalog references (`framework.sociedades`, `ops.catalogo_cuentas`) become string literals consumed by the lookup-resolver — actual catalog mock data lives in `src/mocks/fin/catalogs/`.
- `capabilities.required_role_any_of` arrays preserved verbatim.
- Predicates (`enable_when`, `show_when`) translated to the engine's predicate AST shape.

Registration: `src/plugins/manifests.ts` imports the four manifests and registers them via the existing registry plugin. The four `framework.template.*.actions.ts` files are deleted; the registry entries for them are removed.

## Domain types (`src/types/fin.ts`)

```typescript
export type ImputacionState =
  | 'PENDING' | 'STRUCTURE_OK' | 'BANK_OK' | 'COUNTERPARTY_OK' | 'IMPUTED';

export type FacturaState =
  | 'DRAFT' | 'PENDING_DOC' | 'INVOICED' | 'NOT_INVOICEABLE' | 'VOIDED';

export type MovimientoTipo =
  | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'TAX' | 'REBATE'
  | 'ADDITION' | 'TRANSFER_OUT' | 'TRANSFER_IN';

export type Moneda = 'ARS' | 'USD' | 'USDT' | 'USDC';

export type Movimiento = { /* fields documented in fin.operaciones.movimientos.actions.ts */ };
export type Quote = { /* fields documented in fin.cotizaciones.actions.ts */ };
export type RetiroCola = { /* fields documented in fin.tesoreria.cola_asignacion.actions.ts */ };
export type CargaManualSolicitud = { /* fields from fin.tesoreria CTA dialog */ };
export type Sociedad = { id: string; nombre: string; cuit: string };
export type CuentaBancaria = { id: string; sociedad_id: string; banco: string; numero: string; moneda: Moneda };
```

(Final shapes derived from the manifest dialog field sets and the prototype's seed data — see `tasks.md` step 4.)

## "Soon" page

```vue
<!-- pages/ModuloSoon.vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router';
import EmptyState from '@/components/feedback/EmptyState.vue';
const route = useRoute();
</script>
<template>
  <PageHeader :title="route.meta.breadcrumb as string" />
  <EmptyState
    icon="rocket"
    title="Próximamente"
    :description="`El módulo ${route.meta.breadcrumb} estará disponible en una próxima entrega.`" />
</template>
```

Single component reused by the 9 placeholder routes — no per-module file proliferation.

## Brand & theme

- `--brand: 142 71% 45%` per `core-theming` FIN canonical entry.
- `--brand-bg` is computed from `--brand` via the existing `hsl(var(--brand) / 0.08)` token mapping; no manual change needed.
- The `<sb-logo>` letter changes from `F` (already F in prototype) — confirmed.
- Module-specific source badges (`src-FIN: #86EFAC`, etc.) defined in the prototype are NOT migrated — they belong to a future Inbox cross-app feature; out of scope.

## Status segmenters dropped — period filter substitutes

The legacy FIN HTML prototype baked status into L1 sub-tabs (`pendientes / resueltos` on Movimientos, `nuevas / historico` on Alertas, `catalogo / historico` on Reportes). Per user direction these are NOT ported as `<Segmenter>` controls in `core-fin`. The substitutes:

- **Período** filter — single L3 dropdown (last 7d / this month / custom range) governs the time window in every active page.
- **Estado** filter — when status filtering is needed (e.g. on Movimientos), it lives as a regular L3 filter dropdown alongside Período, not as a top-of-page tab.
- **Tesorería** is the exception: its `posición / movimientos / cola` segmenter represents three different DATASETS (not three status windows), so the `<Segmenter>` is preserved.

## Out of scope (deliberately deferred)

- Real auth wiring (stays on dummy Auth0 placeholders).
- Real HTTP endpoints (mocks only).
- The 9 "Soon" modules' page-level functionality.
- The Drawer's full audit-log + comments wiring beyond what the scaffold already provides.
- Inter-app `src-XX` badges in Inbox.
- Plan de Cuentas, Asientos, Libro Diario UX (deferred to dedicated changes per module).

## Risks

- **Manifest engine surface area.** The manifest TypeScript types may be stricter than the JS prototype's loose objects allowed (e.g., `lookup` field with `catalog_filter.from_form`). Mitigated by `npm run spec:check` and an early task that ports `fin.tesoreria.actions.ts` first — the smallest manifest — to surface schema gaps before attacking the 351-line one.
- **Kanban axes.** `core-module-types` declares the `views` declaration but the kanban engine's axis registry shape may need extension. Mitigated by reviewing `src/lib/kanban/` (if present) or `core-module-types` spec early; if a delta is required, this proposal will be amended.
- **List + kanban view toggle.** Both Operaciones and Cotizaciones declare `views: ['list', 'kanban']`. The `<ViewToggle>` must render both. The contract requires "Tablero is state-driven (N columns = N declared module states)" — verifying the kanban axis state machine declarations align.
- **Mock data extraction effort.** The prototype's seed data is embedded in the HTML's `<script>`; pulling it out is mechanical but tedious. Capped: a representative sample (≥5 records per record type, covering all kanban states) is sufficient.
