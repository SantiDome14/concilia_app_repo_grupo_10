---
name: ardua-add-block
description: Add a new Block (Bloque) to the Sidebar of an Ardua core frontend. A Block is a visual group of Modules in the Sidebar (e.g. "Operaciones", "Configuración", "Administración"). Use when the user wants to introduce a new group / category / section of modules that does not fit any existing Block (e.g. "agregá un bloque nuevo llamado Administración", "creá un grupo para los módulos de configuración", "add a new section to the sidebar", "new block in the sidebar"). Blocks are defined in `src/components/layout/Sidebar.vue` and referenced by `meta.block` in routes.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Add a new navigation Block to the Sidebar. A Block is a visual header + grouping label above a list of Module links in the Sidebar. Blocks organize Modules by functional area (e.g. "Operaciones", "Trading", "Configuración").

This skill only touches the Sidebar component — it does NOT add modules. Modules are added separately via `ardua-add-module`, which then references the Block by label in the route's `meta.block` field.

# When to trigger this skill

Use this skill when the user expresses any of the following intents:

- "Agregá un bloque nuevo" / "Creá un bloque llamado X"
- "Necesito un nuevo grupo / categoría / sección en el sidebar"
- "Add a new block" / "Create a new sidebar section"
- Another skill (`ardua-add-module`) invokes this one because the target Block does not exist

Do NOT use this skill for:

- Renaming an existing Block (just edit `Sidebar.vue` directly; no need for a skill)
- Reordering modules within a Block (edit the `items` array in place)
- Hiding a Block behind a feature flag (that is a separate future concern)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the relevant capability spec:
   ```bash
   openspec show core-navigation
   ```
3. Inspect the current Sidebar state to know existing Blocks:
   - Read `src/components/layout/Sidebar.vue`
   - Locate the `blocks: NavBlock[]` array
   - Note the existing labels and their order

# Steps

## Step 1 — Gather context via AskUserQuestion

Ask the user:

1. **Block label** (human-readable, typically capitalized first letter). Examples: `"Operaciones"`, `"Trading"`, `"Administración"`, `"Configuración"`. Spanish, concise, uppercase first letter.
2. **Position** in the Sidebar. Options:
   - At the top (first Block)
   - After an existing Block (specify which one)
   - At the bottom (last Block)
3. **Initial modules** to include (optional). Options:
   - None — Block is created empty; modules will be added later.
   - A list of existing Modules to move into this Block (each specified by its current label).
   - A new Module to create immediately — in that case, chain to `ardua-add-module` after this skill completes.

## Step 2 — Validate the inputs

- Block label must not collide with an existing Block label (case-insensitive match). If it does, STOP and suggest a different label.
- Block label should follow the convention: Spanish, uppercase first letter, 2-4 words max.
- If the user requests moving existing Modules, verify each one exists in another Block currently. If not, flag the discrepancy.

## Step 3 — Edit `src/components/layout/Sidebar.vue`

Locate the `blocks: NavBlock[]` array inside `<script setup lang="ts">`. Current shape:

```ts
const blocks: NavBlock[] = [
  {
    label: 'Bloque 1',
    items: [
      { to: ROUTE_PATHS.MODULO_A, name: ROUTE_NAMES.MODULO_A, label: 'Módulo A', icon: List },
    ],
  },
  {
    label: 'Bloque 2',
    items: [
      { to: ROUTE_PATHS.MODULO_B, name: ROUTE_NAMES.MODULO_B, label: 'Módulo B', icon: LayoutGrid },
      { to: ROUTE_PATHS.MODULO_C, name: ROUTE_NAMES.MODULO_C, label: 'Módulo C', icon: Database },
    ],
  },
];
```

Insert a new Block object at the position requested by the user. Templates:

### Empty Block (most common)

```ts
{
  label: 'Operaciones',
  items: [],
},
```

### Block with pre-existing modules moved in

If the user specified moving `Módulo B` from `Bloque 2` to the new Block, REMOVE it from `Bloque 2` and ADD it to the new Block:

```ts
{
  label: 'Operaciones',
  items: [
    { to: ROUTE_PATHS.MODULO_B, name: ROUTE_NAMES.MODULO_B, label: 'Módulo B', icon: LayoutGrid },
  ],
},
```

Also update the route's `meta.block` in `src/router/routes.ts` to match the new Block label — otherwise the breadcrumb will still show the old Block.

## Step 4 — If modules were moved, update `src/router/routes.ts`

For every Module moved from an old Block to the new one, update the route record's `meta.block`:

```ts
{
  path: ROUTE_PATHS.MODULO_B,
  name: ROUTE_NAMES.MODULO_B,
  component: () => import('@/pages/ModuloB.vue'),
  meta: {
    requiresAuth: true,
    layout: 'shell',
    breadcrumb: 'Módulo B',
    block: 'Operaciones',    // ← updated from 'Bloque 2'
  },
},
```

The `meta.block` is what the Topbar breadcrumb shows as the parent section (e.g. `"Operaciones / Módulo B"`).

## Step 5 — Run quality gates

```bash
npm run spec:check     # must pass
npm run type-check     # must pass
npm run lint           # must pass
npm run test:run       # must pass
```

If `type-check` fails, likely the `NavBlock` type is violated — `items` must be `NavItem[]` (an array, never omit even if empty).

## Step 6 — Hand off to the user

Do NOT commit. Report:

- Summary: "Block `{Label}` added to Sidebar, positioned {at-top | after-X | at-bottom}. {N} module(s) moved into it."
- Files touched: `src/components/layout/Sidebar.vue` (+ optionally `src/router/routes.ts` if modules were moved)
- Quality gates results (all ✓)
- If this skill was invoked from `ardua-add-module`: signal completion and continue with that skill.
- Otherwise: suggest the user continue with `ardua-add-module` to populate the new Block.

# Files you'll touch

| File | Change |
|---|---|
| `src/components/layout/Sidebar.vue` | Insert new Block into `blocks` array |
| `src/router/routes.ts` | (Only if modules were moved) Update `meta.block` on affected routes |

# Compliance checklist

- [ ] Block label is Spanish, uppercase first letter, 2-4 words
- [ ] Block label does not collide with an existing Block
- [ ] Block is inserted at the exact position the user requested
- [ ] If modules were moved, their route's `meta.block` was updated to match
- [ ] `items: NavBlock['items']` array is present (possibly empty `[]`, never omitted)
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — the common companion skill; usually invoked right after this one to add a Module into the new Block
