---
name: ardua-compose-kpi-dashboard
description: Compose the L2 KPI cards grid on an Ardua module page — a row of 3-5 cards showing key metrics derived from the module's data, each with label + value + optional subtitle + semantic color variant. Use when the user wants to add the top-metrics strip to a module (e.g. "agregá cards de KPIs en el header de Facturas", "mostrar totales en la parte superior", "add KPI cards", "dashboard de métricas de arriba", "necesito un resumen con tarjetas arriba de la tabla"). Enforces the `core-layout` L2 pattern and `core-theming` semantic colors (success / warning / danger / info / neutral).
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Add the L2 tier of the L1/L2/L3 page pattern — a horizontal row of 3-5 KPI cards that give an at-a-glance summary of the module's state. Each card has a label (uppercase, small) + a bold numeric value + an optional subtitle, and uses a semantic color for the value (success / warning / danger / info / neutral).

The grid is responsive via Tailwind's `grid-cols-N` utilities. The cards use design tokens (`--card-2`, `--b-2`, `--t-4`, `--t-1`) — no hardcoded colors.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá KPIs / métricas / tarjetas arriba de la tabla"
- "Mostrar totales en el header del módulo" / "Dashboard strip"
- "Add KPI cards" / "Top metrics" / "Summary cards at the top"
- `ardua-add-module` invokes this to populate the L2 of a module that needs KPIs

Do NOT use this skill for:

- Full-page dashboards with charts (out of scope — chart components are not yet standardized)
- Comparison widgets or trend arrows (not yet contracted)
- Single-value hero metrics (use an inline `<div>` — a full 4-card grid would be excessive for one value)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability specs:
   ```bash
   openspec show core-layout
   openspec show core-theming
   ```
3. Read the reference implementation: `src/pages/ModuloA.vue`, the `<!-- L2 · KPI cards -->` section.
4. Know the design tokens available (from `src/styles/globals.css`): `--t-1`, `--t-4`, `--card-2`, `--success`, `--warning`, `--danger`, `--info`.

# Steps

## Step 1 — Gather the KPI specification

Ask the user via AskUserQuestion:

1. **Target page file** (e.g. `src/pages/Facturas.vue`)
2. **Data source** — where the numbers come from:
   - A reactive ref already in the page (`rawData`, the in-memory list)
   - A computed derived from that ref
   - A separate `useQuery` call for aggregate metrics (server-side)
3. **Number of cards** — 3, 4, or 5 (maps to `grid-cols-3 | grid-cols-4 | grid-cols-5`)
4. For **each card**, collect:
   - **Label** (Spanish, UPPERCASE via CSS, 1-3 words, e.g. `"Total registros"`, `"Pendientes"`, `"En proceso"`, `"Vencidos"`)
   - **Value expression** (how to compute it from the data source, e.g. `data.length`, `data.filter(d => d.status === 'PENDING').length`)
   - **Value color variant** — one of:
     - `neutral` → default text color (`text-t-1`)
     - `success` → green (`text-success`)
     - `warning` → amber (`text-warning`)
     - `danger` → red (`text-danger`)
     - `info` → blue (`text-info`)
   - **Subtitle** (optional, small helper text below the value, e.g. `"en el período"`, `"requieren acción"`, `"fuera de operación"`)
   - **Value format** — plain number, currency (`formatCurrency`), percent, or custom

5. **Refresh behavior**. Usually tied to the same data source as the table — when the table's data changes, KPIs recompute automatically (via Vue reactivity). If KPIs are server-fetched independently, clarify the refetch strategy.

## Step 2 — Validate the spec

Stop and report if:

- `number of cards` is not in {3, 4, 5}. Enforce. If user wants 2 or 6+, suggest restructuring the information.
- Any label is longer than ~3 words (compressed uppercase space in a small card). Suggest shorter.
- Multiple cards share the same color variant without reason (e.g. all 4 cards are `neutral` — user is missing an opportunity to use color semantically). Suggest mapping to status colors when applicable.
- A value expression references a field that does not exist on the record type. Flag as likely typo.

## Step 3 — Edit the target page file

### 3a. Imports

If using `formatCurrency` or similar formatting helpers:

```ts
import { formatCurrency } from '@/lib/format';
```

### 3b. Computed KPIs

Add a single `computed` that returns an object with one property per KPI. Place it near the top of `<script setup>`, after the data source is defined:

```ts
// ─── KPIs (over full dataset, not filtered) ─────────────────────────
const kpis = computed(() => ({
  total: rawData.value.length,
  active: rawData.value.filter((r) => r.status === 'ACTIVE').length,
  pending: rawData.value.filter((r) => r.status === 'PENDING').length,
  inactive: rawData.value.filter((r) => r.status === 'INACTIVE').length,
}));
```

Naming: one key per card, lowercase, descriptive. The consumer template then does `kpis.total`, `kpis.active`, etc.

Important: KPIs compute over the **full dataset**, not the filtered dataset. Users should see the module-wide totals, not the count of what's currently filtered. If the user explicitly wants "filtered count" semantics, acknowledge and change.

### 3c. Template — L2 grid

Insert (or replace) the `<!-- L2 · KPI cards -->` section between the L1 header and the L3 section header:

```vue
<!-- L2 · KPI cards -->
<div class="mb-[22px] grid grid-cols-4 gap-3">
  <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
    <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
      Total registros
    </div>
    <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
      {{ kpis.total }}
    </div>
    <div class="mt-1.5 text-[11px] text-t-4">en el período</div>
  </div>
  <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
    <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
      Activos
    </div>
    <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
      {{ kpis.active }}
    </div>
    <div class="mt-1.5 text-[11px] text-t-4">en operación</div>
  </div>
  <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
    <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
      Pendientes
    </div>
    <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">
      {{ kpis.pending }}
    </div>
    <div class="mt-1.5 text-[11px] text-t-4">requieren acción</div>
  </div>
  <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
    <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
      Inactivos
    </div>
    <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
      {{ kpis.inactive }}
    </div>
    <div class="mt-1.5 text-[11px] text-t-4">fuera de operación</div>
  </div>
</div>
```

Adjust based on user's spec:

- **Number of cards:** change `grid-cols-4` to `grid-cols-3` or `grid-cols-5`. Duplicate or remove card `<div>`s.
- **Color variant:** change the value div's class:
  - `text-t-1` → neutral (default)
  - `text-success` → green
  - `text-warning` → amber
  - `text-danger` → red
  - `text-info` → blue
- **Subtitle:** omit the third `<div>` if the user specified no subtitle for that card.
- **Formatted value:** wrap in `formatCurrency({{ kpis.totalAmount }})` or similar if needed.

### 3d. If data is server-side

If KPIs are fetched independently from a server endpoint:

```ts
const { data: kpiData, isLoading: kpisLoading } = useQuery({
  queryKey: ['facturas', 'kpis'],
  queryFn: () => getFacturaKpis(),
  staleTime: 30_000,   // refetch at most every 30s
});

const kpis = computed(() => kpiData.value ?? { total: 0, active: 0, pending: 0, inactive: 0 });
```

Render a skeleton placeholder while loading:

```vue
<Skeleton v-if="kpisLoading" class="h-24" />
<div v-else class="text-2xl font-extrabold ...">{{ kpis.total }}</div>
```

## Step 4 — Visual semantic guidance

Help the user (internally) pick good color assignments:

- **Totals / counts** → `neutral` (no color judgment)
- **Active / healthy counts** → `success`
- **Waiting / attention-needed** → `warning`
- **Failed / overdue / critical** → `danger`
- **Informational / metadata** → `info`
- **Money amounts** (positive balance, revenue) → typically `success` when good, `neutral` when just a total, `danger` when negative or overdue

If the user overrides these suggestions, honor their choice. But flag unusual mappings (e.g. a count of failed records in `success` green is probably an error — ask to confirm).

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Usually: a field in a filter expression doesn't exist on the record type. E.g. `r.state` when the field is `r.status`.
- Usually: the domain type changed and the KPI `computed` wasn't updated.

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "L2 KPI dashboard composed on `{page}` with {N} cards: {label list with color variants}."
- Files touched: the single page file
- Quality gates results (all ✓)

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` | Add `kpis` computed (or server query), render L2 grid of cards with tokens + semantic colors |

This skill does NOT touch theming tokens, shared components, or any API client.

# Compliance checklist

- [ ] Card count is 3, 4, or 5 — maps to `grid-cols-3 | grid-cols-4 | grid-cols-5`
- [ ] Every card uses the `rounded-xl border border-b-2 bg-card-2 px-[18px] py-4` pattern
- [ ] Label div uses `text-[9px] font-extrabold uppercase tracking-wider text-t-4`
- [ ] Value div uses `text-2xl font-extrabold leading-none tracking-tight text-{variant}`
- [ ] Optional subtitle uses `text-[11px] text-t-4`
- [ ] Color variant is one of: `text-t-1` (neutral), `text-success`, `text-warning`, `text-danger`, `text-info`
- [ ] No hardcoded hex colors, no custom `--css-var` outside the token set
- [ ] Labels are Spanish
- [ ] KPIs compute over the full dataset by default (not the filtered set) — unless user explicitly requested otherwise
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — the common caller; this skill runs during module creation to populate L2
- `ardua-build-filterable-list` — commonly composed in the same page (L3 below L2)
- `ardua-add-api-endpoint` — prerequisite if KPIs are server-fetched independently
