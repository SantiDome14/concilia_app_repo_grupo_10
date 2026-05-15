---
name: ardua-add-module
description: Add a new module page to an Ardua core frontend, following the L1/L2/L3 page pattern and registering it in the router, route constants, and Sidebar. Use when the user wants to create a new top-level section / module / page with its own Sidebar entry (e.g. "agregá un módulo de Facturas", "necesito crear el módulo de Órdenes", "add a new section for invoices", "crear la pantalla de referenciadores"). Enforces core-layout, core-navigation, and (when applicable) core-data-tables and core-actions-menu contracts.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Scaffold a new Module page in the application, wire it into routing and navigation, and leave it at a production-quality starting point that passes every quality gate. This skill is the single entry point for adding any new top-level section that shows up in the Sidebar.

A Module in Ardua terminology is a route-level page grouped under a Block (Bloque) in the Sidebar. Every Module MUST follow the L1/L2/L3 page pattern defined in `core-layout`.

# When to trigger this skill

Use this skill whenever the user expresses any of the following intents (in Spanish or English):

- "Agregá un módulo de X" / "Necesito crear un módulo para X"
- "Crear la pantalla de X" / "Nueva sección de X"
- "Add a module" / "Create a new page for X" / "Add a section"
- A requirement from Jira (REQ-XX) that introduces a new top-level functional area
- A spec delta in an OpenSpec change that references a new page that does not exist yet

Do NOT use this skill for:

- Adding a new tab inside an existing module (that is not a new Module, handle inline)
- Adding a new row-level action (use `ardua-add-row-actions` instead)
- Adding a new KPI card to an existing dashboard (use `ardua-compose-kpi-dashboard` instead)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root (automatically loaded as project memory).
2. Read the canonical capability specs that govern this skill:
   ```bash
   openspec show core-layout
   openspec show core-navigation
   ```
3. If the Module will include a data table, also read:
   ```bash
   openspec show core-data-tables
   openspec show core-actions-menu
   ```
4. Read the reference implementation to pattern-match the L1/L2/L3 structure:
   ```
   src/pages/ModuloA.vue   → full L1/L2/L3 reference (client-side data)
   src/pages/ModuloB.vue   → L1/L2 only (no table)
   src/pages/ModuloC.vue   → alternative layout pattern
   ```

# Steps

## Step 1 — Gather context via AskUserQuestion

Ask the user for the following, one at a time, using the AskUserQuestion tool. Do NOT proceed without all answers.

1. **Module display name** (human-readable, e.g. "Facturas", "Órdenes de pago", "Referenciadores")
2. **Module slug** (kebab-case, e.g. `facturas`, `ordenes-de-pago`, `referenciadores`). This becomes the URL path and the route name.
3. **Parent Block**. Show the user the current blocks (read `src/components/layout/Sidebar.vue` → `blocks` array, list their labels). Options:
   - Pick an existing Block.
   - Create a new Block → in that case, invoke `ardua-add-block` FIRST, wait for it to complete, then continue here.
4. **Sidebar icon** from `lucide-vue-next`. Suggest 3-5 icons that semantically fit the module (e.g. for Facturas: `FileText`, `Receipt`, `DollarSign`).
5. **Required capabilities** (optional). If the Module should be RBAC-gated, ask for the capability strings (e.g. `['invoices:read']`).
6. **L3 surface type**. Options:
   - `table` — client-side data via `useTable` (pattern of ModuloA)
   - `table-server` — server-side via `@tanstack/vue-query` paginated endpoint
   - `cards` — grid of cards (no table)
   - `form` — single form page (e.g. settings, configuration)
   - `detail` — read-mostly detail view
7. **Primary actions for the L1 header** (1-3 CTAs). Ask for: label, verb, purpose. Explain the contract: max 3 CTAs, rightmost primary, others ghost. If user requests > 3, redirect extras to the row-level actions menu (core-actions-menu).

## Step 2 — Validate the contract before editing

Confirm the following constraints based on user answers. If any is violated, STOP and explain:

- Module slug is kebab-case (lowercase, hyphens only)
- CTAs count ≤ 3 (per `core-layout` requirement)
- No row-level action in the CTA list ("aprobar seleccionados", "eliminar registro actual" are row-level; they MUST NOT be in the header)
- Parent Block exists OR `ardua-add-block` was invoked first

## Step 3 — Update `src/config/routes.ts`

Add the route path and name constants. The file uses a strict convention: `ROUTE_PATHS.MODULE_UPPER_SNAKE` and `ROUTE_NAMES.MODULE_UPPER_SNAKE`.

Derive constant key from slug:
- slug `facturas` → key `FACTURAS`
- slug `ordenes-de-pago` → key `ORDENES_DE_PAGO`
- slug `referenciadores` → key `REFERENCIADORES`

Edit this file, adding two entries to the existing objects:

```ts
export const ROUTE_PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/',
  MODULO_A: '/modulo-a',
  MODULO_B: '/modulo-b',
  MODULO_C: '/modulo-c',
  FACTURAS: '/facturas',           // ← added
  NOT_FOUND: '/:pathMatch(.*)*',
} as const;

export const ROUTE_NAMES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  MODULO_A: 'modulo-a',
  MODULO_B: 'modulo-b',
  MODULO_C: 'modulo-c',
  FACTURAS: 'facturas',            // ← added
  NOT_FOUND: 'not-found',
} as const;
```

Keep `NOT_FOUND` always last. Insert the new entry alphabetically among the module entries, or logically grouped.

## Step 4 — Update `src/router/routes.ts`

Add a new route record to the exported `routes` array. Template:

```ts
{
  path: ROUTE_PATHS.FACTURAS,
  name: ROUTE_NAMES.FACTURAS,
  component: () => import('@/pages/Facturas.vue'),
  meta: {
    requiresAuth: true,
    layout: 'shell',
    breadcrumb: 'Facturas',
    block: 'Operaciones',           // ← matches the Sidebar block label
    // capabilities: ['invoices:read'],   // ← only if RBAC needed
  },
},
```

Insert before the `NOT_FOUND` route. Always keep `NOT_FOUND` last — it is the catch-all.

## Step 5 — Update `src/components/layout/Sidebar.vue`

Two edits inside `<script setup lang="ts">`:

### 5a. Import the icon

Locate the existing `lucide-vue-next` import and add the new icon. Keep them alphabetically sorted within the import:

```ts
import { Home, List, LayoutGrid, Database, FileText, ChevronLeft, ChevronDown, Settings, HelpCircle, LogOut } from 'lucide-vue-next';
```

### 5b. Register the Module item in the correct Block

Locate the `blocks: NavBlock[]` declaration and add an entry to the chosen Block's `items` array:

```ts
{
  label: 'Operaciones',
  items: [
    { to: ROUTE_PATHS.FACTURAS, name: ROUTE_NAMES.FACTURAS, label: 'Facturas', icon: FileText },
  ],
},
```

Order items within a block by frequency of use (most frequent first) unless the user specified otherwise.

## Step 6 — Create `src/pages/{PascalCase}.vue`

Derive the PascalCase component filename from the slug:
- slug `facturas` → `Facturas.vue`
- slug `ordenes-de-pago` → `OrdenesDePago.vue`
- slug `referenciadores` → `Referenciadores.vue`

Use one of the following reference pages based on the L3 surface type chosen:

- `table` client-side → copy the full structure of `src/pages/ModuloA.vue`. Replace the seed data, KPI labels, filters, columns, and actions with the domain-specific content. Keep the L1/L2/L3 structure intact.
- `table-server` → copy `ModuloA.vue` structure but replace `useTable` with `useQuery` from `@tanstack/vue-query`. Query key uses the module name: `['facturas', { page, search, filters }]`.
- `cards` → copy `ModuloC.vue` (or use `ModuloB.vue` as a simpler starting point). Replace the card grid content.
- `form` → use a dedicated single-form structure based on `vee-validate` + `zod`. Invoke `ardua-build-form` skill after this one.
- `detail` → a read-only page with structured field groups (see the Detail modal structure in `ModuloA.vue` for field grouping patterns).

Replace all user-facing strings with the module-specific copy. Replace all English UI copy where appropriate with Spanish (this is an Ardua internal tool — Spanish is the UI language).

Do NOT duplicate the `ExampleRecord` type. Either:
- Add a new domain type in `src/types/models.ts` (e.g. `Factura`)
- Or define a page-local type inside the `.vue` file if it's scoped to this module only

## Step 7 — Configure header CTAs

Invoke the `ardua-configure-header-ctas` skill, passing the module page file path and the CTAs the user specified in Step 1.6. Do NOT write the CTA wiring inline — defer to that skill to enforce the CTAs-max-3 contract.

## Step 8 — Run quality gates

Run every gate. Do not continue if any fails:

```bash
npm run spec:check     # must pass — openspec validate --all --strict
npm run type-check     # must pass — vue-tsc --build
npm run lint           # must pass — eslint with autofix
npm run test:run       # must pass — vitest
```

If `type-check` fails, read the error, fix the typing issue, re-run. Common causes:
- Missing import
- Typo in ROUTE_NAMES or ROUTE_PATHS
- Type mismatch on the record shape
- `useTable<T>` generic not provided

## Step 9 — Hand off to the user

Do NOT commit. Do NOT push. Report:

- Summary: "Module `{Name}` added with route `{path}`, Sidebar entry under Block `{Block}`, and page scaffold at `src/pages/{PascalCase}.vue`."
- Files touched (explicit list)
- Quality gates results (all ✓)
- Suggest to user: "You can start the dev server with `npm run dev` and navigate to `http://localhost:5173{path}` to see the new module. When you're ready, commit with a message like: `feat({slug}): add new module`."

# Files you'll touch

| File | Change |
|---|---|
| `src/config/routes.ts` | Add `ROUTE_PATHS.{KEY}` and `ROUTE_NAMES.{KEY}` |
| `src/router/routes.ts` | Add route record with meta.block + meta.breadcrumb + meta.requiresAuth |
| `src/components/layout/Sidebar.vue` | Import icon + register item in a Block |
| `src/pages/{PascalCase}.vue` | Create new page with L1/L2/L3 scaffold |
| `src/types/models.ts` | (Optional) Add domain type if exported from multiple places |

# Compliance checklist

Before calling the skill complete, verify every item:

- [ ] Route path is kebab-case (e.g. `/facturas`, not `/Facturas`)
- [ ] Route declares `meta.requiresAuth`, `meta.breadcrumb`, and `meta.block`
- [ ] The Block label in `meta.block` matches exactly a Block label in `Sidebar.vue`
- [ ] Sidebar imports the icon from `lucide-vue-next` (no custom SVG)
- [ ] Page follows the L1/L2/L3 pattern from `core-layout`
- [ ] L1 header has ≤ 3 CTAs (per `core-layout` requirement)
- [ ] If L3 has a table: uses `useTable` or `@tanstack/vue-query` (hand-rolled pagination is forbidden)
- [ ] If L3 table has per-row actions: uses the shared `ActionsMenu` portal, not inline `<td>` dropdowns
- [ ] Identifiers are English (composable names, types, variables, function names)
- [ ] User-facing copy is Spanish (internal tool convention)
- [ ] No hardcoded design values (hex colors, px spacing) — design tokens only
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-block` — invoke BEFORE this skill if the parent Block does not yet exist
- `ardua-configure-header-ctas` — invoke in Step 7 to wire up the L1 CTAs
- `ardua-add-row-actions` — invoke AFTER this skill if the L3 is a table with per-row actions
- `ardua-build-filterable-list` — invoke AFTER this skill to configure filters + search on a table module
- `ardua-compose-kpi-dashboard` — invoke AFTER this skill to add L2 KPI cards
- `ardua-build-form` — invoke AFTER this skill if the L3 surface is a form
- `ardua-add-api-endpoint` — invoke BEFORE this skill if the server-side endpoint does not yet exist
