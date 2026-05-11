---
name: ardua-add-row-actions
description: Add a per-row actions menu to a table in an Ardua core frontend using the shared `ActionsMenu.vue` portal component. Use when the user wants to add contextual actions on each row of a table (e.g. "agregá acciones por fila a la tabla de Facturas", "necesito botones de procesar/confirmar/anular en cada fila", "row-level actions menu", "cada registro debería tener acciones como editar, eliminar, exportar"). Enforces the `core-actions-menu` contract: portal-based menu with smart flip, 2-rule enablement (user capabilities + record characteristics), disabled-with-tooltip pattern, tag annotations (Permiso / Estado / Categoría / V2), and no inline `<td>` dropdowns.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Add per-row contextual actions to a data table. Uses the shared `ActionsMenu.vue` portal component (already in the scaffold at `src/components/feedback/ActionsMenu.vue`) — never inline dropdowns, never custom implementations per module.

The core concept is **2-rule enablement**: whether an action is enabled on a given row depends on BOTH (1) the user's capabilities and (2) the record's intrinsic characteristics. Disabled actions are kept visible in the menu with an explanatory tooltip and a tag, so users understand WHY they can't take an action — not merely that they can't.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá acciones por fila" / "Quiero un menu de acciones en cada registro"
- "Necesito que cada fila tenga un botón de [X / Y / Z]"
- "Add row-level actions" / "Per-row actions menu"
- "Cada registro debería poder procesarse / confirmarse / anularse desde la tabla"

Do NOT use this skill for:

- Header-level module CTAs (use `ardua-configure-header-ctas`)
- Destructive confirmation dialogs (use `ardua-add-confirm-dialog` — can be chained after this one for specific actions)
- Bulk-action bars that operate on selected rows (deferred future capability — not yet specified)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability specs:
   ```bash
   openspec show core-actions-menu
   openspec show core-data-tables
   ```
3. Read the reference implementation of the actions menu in `src/pages/ModuloA.vue` (lines around the `<ActionsMenu>` block). It shows the exact structure, state management, and enablement logic.
4. Read the portal component itself: `src/components/feedback/ActionsMenu.vue`. Understand that it's a single-instance portal that re-anchors to whichever row's trigger button is active.

# Steps

## Step 1 — Gather the action specification

Ask the user via AskUserQuestion:

1. **Target page file** (e.g. `src/pages/Facturas.vue`)
2. **Record type** being acted upon (e.g. `Factura`, `Order`)
3. **Action list** — for each action, collect:
   - **Key** (camelCase, e.g. `process`, `confirm`, `generate`, `cancel`, `void`)
   - **Label** (Spanish, verb-first, e.g. "Procesar", "Confirmar", "Generar comprobante", "Anular")
   - **Enablement rule**. Choose one of the following categories:
     - `capability` — depends on the user's role (returns tag `"Permiso"`)
     - `status` — depends on the record's status (returns tag `"Estado"`)
     - `category` — depends on a record field like category or type (returns tag `"Categoría"`)
     - `v2` — planned for a future version, always disabled (returns tag `"V2"`)
     - `always` — always enabled (no tag, no tooltip)
   - **Rule expression** — for `capability`: the capability string; for `status`: the status values that allow it; for `category`: the category values that allow it
   - **Reason string** (Spanish, for the tooltip when disabled). E.g. `"Solo disponible para registros PENDING"`, `"Tu rol actual no permite aprobar facturas"`, `"Funcionalidad planificada para la próxima versión"`

4. **Action ordering and grouping**. The pattern in ModuloA groups actions into 2-3 visual sections separated by dividers (e.g. main actions → secondary actions → destructive actions). Ask the user which actions go in which group.
5. **Destructive actions** — if any action is destructive (delete, cancel, void, anular), flag it for `ardua-add-confirm-dialog` to wire up later. Do NOT fire destructive actions directly from this menu — always through a confirmation dialog.

## Step 2 — Validate the spec

Stop and report if any of these is violated:

- At least one action is defined (a table without actions does not need this skill)
- Every action has a non-empty key, label, and enablement rule
- Action keys are unique within the page
- Spanish labels are verb-first and not excessively long (max ~25 chars including spaces)
- If any action has no visual tag when disabled (category `always` — which is a contradiction), flag it

## Step 3 — Edit the target page file

Several edits in the same file. Use str_replace for each.

### 3a. Add imports

```ts
import { MoreVertical } from 'lucide-vue-next';
import ActionsMenu from '@/components/feedback/ActionsMenu.vue';
import { toast } from 'vue-sonner';
```

If the page already imports some of these (common case when this skill follows `ardua-add-module`), do not duplicate — extend the existing import lines.

### 3b. Add state for the actions menu

In `<script setup>`, after the table state setup:

```ts
// ─── Actions menu ───────────────────────────────────────────────────
// 2-rule enablement per core-actions-menu spec:
//   1. User capabilities (use useCapabilities() in real apps)
//   2. Record intrinsic characteristics
const openActionsFor = ref<string | null>(null);
const actionTriggers = ref<Record<string, HTMLElement | null>>({});

function toggleActions(id: string): void {
  openActionsFor.value = openActionsFor.value === id ? null : id;
}

function setActionTrigger(id: string, el: Element | null): void {
  actionTriggers.value[id] = el as HTMLElement | null;
}

const activeAnchor = computed<HTMLElement | null>(() =>
  openActionsFor.value ? (actionTriggers.value[openActionsFor.value] ?? null) : null,
);

const activeRecord = computed<{RecordType} | null>(() =>
  openActionsFor.value ? (paged.value.find((r) => r.id === openActionsFor.value) ?? null) : null,
);
```

Replace `{RecordType}` with the actual record type (e.g. `Factura`, `ExampleRecord`). If the table does not use `useTable` (e.g. uses `useQuery` directly), replace `paged.value` with the appropriate reactive data source.

### 3c. Add the action evaluation function

Generate this function from the action list gathered in Step 1. It is the heart of the 2-rule enablement:

```ts
interface ActionEvaluation {
  enabled: boolean;
  reason?: string;
  tag?: 'Permiso' | 'Estado' | 'Categoría' | 'V2';
}

function evaluateAction(action: string, record: {RecordType}): ActionEvaluation {
  switch (action) {
    case 'process':
      return record.status === 'PENDING'
        ? { enabled: true }
        : { enabled: false, reason: 'Solo disponible para registros PENDING', tag: 'Estado' };
    case 'confirm':
      return record.status !== 'INACTIVE'
        ? { enabled: true }
        : { enabled: false, reason: 'Un registro INACTIVE no puede confirmarse', tag: 'Estado' };
    case 'assign':
      return { enabled: false, reason: 'Tu rol actual no permite asignar responsables', tag: 'Permiso' };
    case 'cancel':
      return { enabled: false, reason: 'Funcionalidad planificada para la próxima versión', tag: 'V2' };
    // ... generate one case per action from the user's spec
    default:
      return { enabled: false };
  }
}
```

### 3d. Add the action performer

```ts
const ACTION_LABELS: Record<string, string> = {
  process: 'Registro procesado',
  confirm: 'Registro confirmado',
  // ... one entry per action with the success-toast title
};

function performAction(action: string, record: {RecordType}): void {
  openActionsFor.value = null;
  // For destructive actions, do NOT call this directly from the menu.
  // The confirmation dialog wired by ardua-add-confirm-dialog calls this
  // AFTER the user confirms.
  toast.success(ACTION_LABELS[action] ?? action, { description: `${record.id} — ${record.name}` });
  // TODO: invoke the real backend call via ardua-add-api-endpoint
}
```

### 3e. Add the trigger button in the `<td>` of the Actions column

Inside the table, in the row template, add a new `<td>` at the end (or replace the existing one if this skill is re-configuring):

```vue
<td class="px-3.5 py-2.5 text-center" @click.stop>
  <button
    :ref="(el) => setActionTrigger(record.id, el as Element | null)"
    type="button"
    :class="
      cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-transparent text-t-4 transition-colors hover:border-b-2 hover:bg-card hover:text-t-2',
        openActionsFor === record.id && 'border-b-2 bg-card text-t-2',
      )
    "
    title="Acciones"
    @click="toggleActions(record.id)"
  >
    <MoreVertical class="h-3.5 w-3.5" />
  </button>
</td>
```

Also update the `<thead>` to include the Acciones column:

```vue
<th class="w-10 px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
```

The `@click.stop` on the `<td>` is critical — it prevents the click from bubbling to the row handler (which opens the Detail modal).

### 3f. Add the ActionsMenu component at the end of the template

After the table block, add:

```vue
<!-- Actions menu — portal with smart flip -->
<ActionsMenu
  :open="!!openActionsFor"
  :anchor="activeAnchor"
  @close="openActionsFor = null"
>
  <template v-if="activeRecord">
    <div class="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">
      Acciones del registro
    </div>
    <!-- Group 1: main actions -->
    <template v-for="action in ['process', 'confirm']" :key="action">
      <button
        type="button"
        :class="
          cn(
            'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
            evaluateAction(action, activeRecord).enabled
              ? 'text-t-2 hover:bg-white/[0.06] hover:text-t-1'
              : 'cursor-not-allowed text-t-4',
          )
        "
        :title="evaluateAction(action, activeRecord).reason"
        :disabled="!evaluateAction(action, activeRecord).enabled"
        @click="performAction(action, activeRecord)"
      >
        <span>{{ labelFor(action) }}</span>
        <span
          v-if="evaluateAction(action, activeRecord).tag"
          class="rounded bg-white/[0.05] px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-t-4"
        >
          {{ evaluateAction(action, activeRecord).tag }}
        </span>
      </button>
    </template>
    <!-- Optional separator, then Group 2: secondary actions -->
    <div class="my-1 h-px bg-b-1" />
    <!-- ... repeat for other groups -->
    <!-- Optional separator, then Group 3: destructive action -->
    <div class="my-1 h-px bg-b-1" />
    <button type="button" class="... text-danger ..." @click="openConfirmDialog('cancel', activeRecord)">
      Anular registro
    </button>
  </template>
</ActionsMenu>
```

Where `labelFor(action)` resolves the Spanish label (e.g. `process` → `"Procesar"`). Define it inline or as a local const map.

Replace the action keys in the `v-for` templates with the actual actions the user specified, grouped per Step 1.4.

## Step 4 — If any action is destructive, flag for follow-up

Do NOT wire destructive actions directly in this skill. Instead:

- Replace the `@click="performAction('cancel', activeRecord)"` with `@click="openConfirmDialog('cancel', activeRecord)"`
- Scaffold a stub: `function openConfirmDialog(action: string, record: {RecordType}): void { /* TODO: wire via ardua-add-confirm-dialog skill */ }`
- Report to user at the end: "Action `{cancel}` is destructive — chain `ardua-add-confirm-dialog` to finish wiring."

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If `type-check` fails:
- Common: `activeRecord` type doesn't match the actual record shape. Ensure `{RecordType}` placeholder was replaced everywhere.
- Common: `openActionsFor` used `number` instead of `string`. Ensure the record ID type matches.

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "Row actions menu configured on `{page}`. {N} actions registered: {list}. {M} destructive action(s) flagged for `ardua-add-confirm-dialog` follow-up."
- Files touched: the single page file
- Quality gates results (all ✓)
- Follow-up: any destructive actions pending confirm-dialog wiring

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` | Add ActionsMenu state, `evaluateAction` / `performAction` functions, trigger button in `<td>`, `<ActionsMenu>` at bottom of template, icon imports |

This skill does NOT touch `ActionsMenu.vue` itself (shared portal component — treat as fixed API).

# Compliance checklist

- [ ] Uses the shared `ActionsMenu.vue` portal (no inline `<td>` dropdowns — forbidden by core-actions-menu)
- [ ] Trigger button is inside `<td>` with `@click.stop` to prevent row-click bubbling
- [ ] Every action has an `evaluateAction` case covering BOTH rules (capabilities + characteristics)
- [ ] Disabled actions stay visible in the menu with tooltip (`title` attribute) and visual tag
- [ ] Disabled action tags use one of: `Permiso`, `Estado`, `Categoría`, `V2` (no custom tags)
- [ ] Destructive actions are NOT fired directly — they open a confirm dialog
- [ ] Action labels are Spanish, verb-first
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — typically the caller; this skill runs after the module and table exist
- `ardua-add-confirm-dialog` — chain AFTER this skill for every destructive action identified
- `ardua-add-api-endpoint` — chain to replace the `TODO: invoke the real backend call` in `performAction`
- `ardua-build-filterable-list` — often used in the same page alongside this skill
