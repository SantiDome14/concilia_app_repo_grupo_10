> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-cuentas-cvu — CVU accounts sub-tab on /clientes

## Why

The legacy `/clientes` page packages two unrelated tabular surfaces in the same view: the Clientes listing (the legajo population) and the Cuentas (CVUs) listing — virtual bank accounts issued by the sponsor banks BIND and COINAG to LEX-approved clients. The two share the page-level container but are distinct domain entities (Cliente has a CUIT, CVU has a CBU/CVU) and distinct query keys, response shapes, and filter sets. Treating them as one capability would force `lex-clientes` to grow filters and columns unrelated to its core surface.

This spec separates the Cuentas surface into its own capability while preserving the legacy URL placement (sub-tab on `/clientes` accessed via `?tab=cuentas`). It locks the column set, the filter contract (date range default 30 days, sponsor BIND/COINAG, client name debounced), the XLSX export contract (full filtered set, not just the visible page), and the role gating (export ADMIN_LEX only).

## What Changes

- Create the `lex-cuentas-cvu` capability. New spec at `openspec/specs/lex-cuentas-cvu/spec.md` (materialised via archive) with 5 requirements covering: (a) sub-tab activation via `?tab=cuentas` with no page remount on switch; (b) canonical column set with row-click summary popover (no direct navigation to `/clientes/:id` from CVU rows); (c) filters Rango de fechas (default 30 days, leftmost) + Sponsor + Cliente (debounced 300 ms); (d) Exportar XLSX over the filtered result set with a warning toast for >10k rows; (e) export gated to ADMIN_LEX per `lex-roles`.
- Define the typed surface. `src/lex/cuentas/api.ts`, `src/lex/cuentas/types.ts`, `src/lex/cuentas/CuentasTab.vue`, `src/lex/cuentas/CVUTable.vue`, `src/lex/cuentas/exportXlsx.ts`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-data-tables` — table primitive, period filter as privileged leftmost filter, page-size selector.
  - `core-forms` — Sponsor as shadcn-vue Select; Rango de fechas as the canonical date range picker.
  - `core-error-handling` — neutral fallback for unknown sponsor values; toast warnings for slow exports.
  - `core-navigation` — sub-tab breadcrumb append.
  - `lex-clientes` — host page; `lex-cuentas-cvu` is its second sub-tab.
  - `lex-cliente-detalle` — destination of the row-click summary popover's "Ver legajo" link.
  - `lex-roles` — Exportar XLSX gating.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-cuentas-cvu` (Lex sub-tab; CVU accounts listing) — 5 requirements, 15 scenarios.

### Non-capability artifacts

- `src/lex/cuentas/CuentasTab.vue` — sub-tab container.
- `src/lex/cuentas/CVUTable.vue` — table.
- `src/lex/cuentas/api.ts` — `GET /cvu` endpoint binding.
- `src/lex/cuentas/types.ts` — `CVUEntry` and params types.
- `src/lex/cuentas/exportXlsx.ts` — XLSX builder and download.
