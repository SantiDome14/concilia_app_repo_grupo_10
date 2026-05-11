---
name: ardua-configure-header-ctas
description: Configure the call-to-action buttons (CTAs) in the L1 page header of an Ardua module page. Use when the user asks to set up, add, change, or reorder the action buttons at the top of a module (e.g. "agregá un botón de exportar al header", "configurá las acciones del módulo", "cambiá los CTAs del header de Facturas", "add a primary action to the module header", "set up header buttons"). Enforces the `core-layout` contract: maximum 3 CTAs, rightmost MUST be primary variant, others ghost, no row-level actions in the header, collapse to overflow menu on narrow viewports.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Wire the 1-3 top-level CTAs that appear in the L1 page header of a Module. This skill enforces the contract introduced by the `strengthen-core-ui-patterns` change: CTAs are capped at 3, the rightmost MUST be primary, semantically they map to module-level actions only, and they never duplicate a row-level action.

This is typically invoked by `ardua-add-module` during Step 7 of that flow, but can also be called directly when modifying the CTAs of an existing module.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá un CTA al header de {Modulo}" / "Cambiá los botones del header"
- "Configurá las acciones principales de {Modulo}"
- "Add a primary action to {Module}" / "Set up header buttons"
- `ardua-add-module` invokes this one to wire the initial CTAs

Do NOT use this skill for:

- Adding row-level actions (use `ardua-add-row-actions`)
- Adding a confirm dialog that fires from a CTA (use `ardua-add-confirm-dialog` — can be chained after this one)
- Adding bulk-action buttons that appear only when rows are selected (not yet specified — deferred future capability)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the `core-layout` capability spec, specifically the requirement added by the `strengthen-core-ui-patterns` change:
   ```bash
   openspec show core-layout
   ```
   Focus on the requirement: **"Page header actions MUST be limited to a maximum of three primary CTAs"** — read all 5 scenarios.
3. Identify the target page file (e.g. `src/pages/Facturas.vue`). If the user did not specify, ask via AskUserQuestion.

# Steps

## Step 1 — Gather the CTA specification

Ask the user via AskUserQuestion, one at a time:

1. **Target page file** (if not already known from the caller skill)
2. **Number of CTAs** (1, 2, or 3)
3. For **each CTA**, in order from lowest importance to highest:
   - **Label** (Spanish verb + noun, e.g. "Nuevo Registro", "Exportar", "Configurar columnas")
   - **Icon name** from `lucide-vue-next` (e.g. `Plus`, `Download`, `Settings`, `Upload`)
   - **Handler name** (camelCase, verb-first, e.g. `openCreate`, `exportToExcel`, `openColumnSettings`)
   - **Handler is already implemented?** (yes / no / partial)
   - **Action nature** (informational note, not a spec field): create | export | import | configure | refresh | other

The primary (rightmost) CTA is typically the "create / new" action. If the user names a different rightmost CTA, that's fine — user intent wins. But flag unusual combinations (e.g. "Exportar" on the right with "Nuevo Registro" on the left is uncommon) and ask to confirm.

## Step 2 — Validate the contract

Enforce these rules BEFORE any edit. Stop and report if violated:

### Rule 1 — Max 3 CTAs

If the user specified more than 3 CTAs, STOP. Explain:
> The `core-layout` contract caps module-level CTAs at 3 (one primary + up to two ghost). Having more hurts scannability and visual hierarchy. Recommended alternatives for the extras:
> - Move to the per-row actions menu (`ardua-add-row-actions`) if the action is row-level
> - Move into a secondary settings area inside the page
> - Collapse multiple into a single "Configurar" button that opens a settings modal

Do NOT proceed until the user trims the list to ≤ 3.

### Rule 2 — No row-level actions

For each proposed CTA, check if it is semantically row-level. Red flags:
- Label includes "seleccionado(s)", "actual", "del registro", or a record ID
- Handler name implies "per-row" (e.g. `approveSelected`, `deleteCurrent`)
- Action only makes sense when a specific record is targeted

If any CTA is row-level, STOP. Explain:
> This CTA is a row-level action, not a module-level action. The `core-layout` contract requires the header to contain only top-level module actions. Redirect it to the per-row actions menu via `ardua-add-row-actions`.

### Rule 3 — Verb-first, noun-second labels

Labels should start with a verb: `"Nuevo registro"`, `"Exportar datos"`, `"Configurar columnas"`. Noun-first labels like `"Registro nuevo"` or single-word generic labels like `"Acción"` are weaker. Suggest improvements if noticed, but do not block — user intent wins if they explicitly want a different phrasing.

## Step 3 — Derive variants by position

Based on the CTA count, assign variants (read-only — this is determined by the contract, not by the user):

| Count | Order (left → right) | Variants |
|---|---|---|
| 1 | Primary | `primary` |
| 2 | Secondary, Primary | `ghost`, `primary` |
| 3 | Secondary, Secondary, Primary | `ghost`, `ghost`, `primary` |

The rightmost CTA is always `primary` — the single most important action. All others are `ghost`.

## Step 4 — Edit the target page file

Open the target page file (e.g. `src/pages/Facturas.vue`).

### 4a. Add imports

Ensure the needed icons are imported from `lucide-vue-next`:

```ts
import { Plus, Download, Settings } from 'lucide-vue-next';
```

Ensure the `Button` component is imported:

```ts
import { Button } from '@/components/ui/button';
```

### 4b. Replace the L1 page header's actions area

Locate the `<!-- L1 · Page header -->` section. The structure is:

```vue
<!-- L1 · Page header -->
<div class="mb-5 flex items-start justify-between">
  <div>
    <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">{Module Name}</h1>
    <p class="mt-1 text-xs text-t-3">{Module subtitle}</p>
  </div>
  <div class="flex items-center gap-2">
    <!-- CTAs go here — replace this block -->
  </div>
</div>
```

Replace the `<!-- CTAs go here -->` block with the generated content:

**1 CTA:**
```vue
<div class="flex items-center gap-2">
  <Button variant="primary" size="md" @click="openCreate">
    <Plus class="h-3.5 w-3.5" />
    Nuevo registro
  </Button>
</div>
```

**2 CTAs:**
```vue
<div class="flex items-center gap-2">
  <Button variant="ghost" size="md" @click="exportToExcel">
    <Download class="h-3.5 w-3.5" />
    Exportar
  </Button>
  <Button variant="primary" size="md" @click="openCreate">
    <Plus class="h-3.5 w-3.5" />
    Nuevo registro
  </Button>
</div>
```

**3 CTAs:**
```vue
<div class="flex items-center gap-2">
  <Button variant="ghost" size="md" @click="openColumnSettings">
    <Settings class="h-3.5 w-3.5" />
    Configurar columnas
  </Button>
  <Button variant="ghost" size="md" @click="exportToExcel">
    <Download class="h-3.5 w-3.5" />
    Exportar
  </Button>
  <Button variant="primary" size="md" @click="openCreate">
    <Plus class="h-3.5 w-3.5" />
    Nuevo registro
  </Button>
</div>
```

### 4c. Scaffold handlers that don't yet exist

For each CTA handler the user marked as "not yet implemented", scaffold a stub in `<script setup>` before the `</script>` closing tag:

```ts
function openCreate(): void {
  // TODO: wire up the create flow (modal + form) — see ardua-build-form skill
  createOpen.value = true;   // if a ref already exists
}

function exportToExcel(): void {
  // TODO: implement Excel export using the current table state
  toast.info('Exportando datos…');
}

function openColumnSettings(): void {
  // TODO: wire up the column configuration modal
  columnSettingsOpen.value = true;   // if a ref already exists
}
```

Keep the TODO comment — it signals the user that wiring is incomplete. Do NOT silently implement ambiguous handlers.

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If `type-check` fails, likely a missing icon import or handler not yet defined. Read the error, fix, re-run.

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "{N} CTA(s) configured in the header of `src/pages/{File}.vue`: {labels, left-to-right, with variants}."
- Files touched: the single page file
- Handler stubs created (if any)
- TODOs that need follow-up (listed explicitly with file:line if possible)
- Quality gates results (all ✓)
- Suggestion to user: "Start `npm run dev` and navigate to {path} to verify the header renders correctly."

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` | Update L1 header actions area with 1-3 `<Button>` elements; add icon imports; scaffold stub handlers where needed |

This skill does NOT touch router, Sidebar, config, types, or any other file.

# Compliance checklist

- [ ] CTA count ≤ 3
- [ ] Rightmost CTA is `variant="primary"`
- [ ] All non-rightmost CTAs are `variant="ghost"`
- [ ] No CTA is a row-level action
- [ ] Labels are verb-first and Spanish
- [ ] Every CTA has a leading icon from `lucide-vue-next`
- [ ] Every CTA has a wired `@click` handler (implemented or stubbed with TODO)
- [ ] Icons are imported from `lucide-vue-next` (no inline SVG)
- [ ] `Button` component is imported from `@/components/ui/button`
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — typically invokes this skill during module creation
- `ardua-add-confirm-dialog` — chain AFTER this skill if a CTA triggers a destructive action (e.g. "Cerrar período", "Anular todo") that requires a confirmation dialog
- `ardua-build-form` — chain AFTER this skill to build the form that an "Create" / "Edit" CTA opens
- `ardua-add-api-endpoint` — chain if a CTA (e.g. "Exportar") needs a new backend endpoint
