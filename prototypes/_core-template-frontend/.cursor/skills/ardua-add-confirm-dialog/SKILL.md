---
name: ardua-add-confirm-dialog
description: Add a confirmation dialog for destructive actions (delete, cancel, void, anular, dar de baja) on an Ardua core frontend, enforcing the destructive-action pattern from `core-modals`. Use when the user wants a confirm-before-execute prompt on a destructive operation (e.g. "agregá una confirmación antes de eliminar registros", "dialog de confirmación para anular la orden", "add confirm before delete", "pedir confirmación antes de cancelar la factura", "necesito que pida confirmación antes de dar de baja"). Enforces narrow width, danger-accented header, verb-specific action label (never generic "OK" or "Sí"), ghost Cancelar on the left, danger-variant Confirm on the right, disabled backdrop-click dismissal, ESC as Cancel-equivalent, and success/error toast feedback after the action resolves.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Wire a destructive-action confirmation dialog that complies strictly with the `core-modals` requirement "Confirmation dialogs MUST follow the destructive action pattern". This requirement was added by the `strengthen-core-ui-patterns` change and is non-negotiable: every destructive action in every Ardua core app goes through this pattern. No exceptions.

The dialog enforces an explicit choice from the user (Cancelar or the verb-specific action) to prevent accidental data loss or irreversible operations. Its defining constraints versus regular modals: narrow width, danger-accented header, no backdrop dismissal, mandatory verb-specific label.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá / necesito una confirmación antes de {eliminar / anular / dar de baja / cancelar / borrar}"
- "Confirm dialog para {verb} en el módulo de X"
- "Add a confirm before delete / void / cancel"
- `ardua-add-row-actions` chained here because a row action is destructive
- `ardua-configure-header-ctas` chained here because a module-level CTA triggers a destructive operation (e.g. "Cerrar período", "Anular todo")

Do NOT use this skill for:

- Non-destructive confirmations like "¿Querés descartar los cambios del formulario?" — those are just Edit-modal close handlers, not destructive actions
- "¿Estás seguro?" prompts that carry no real destructive consequence — skip the dialog entirely
- Success announcements — use toasts (not dialogs)
- Multi-step flows with branching — out of scope

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability spec and focus on the destructive-action requirement:
   ```bash
   openspec show core-modals
   ```
   Read all 8 scenarios of `### Requirement: Confirmation dialogs MUST follow the destructive action pattern`.
3. Read the reference Create / Detail / Edit modal structures in `src/pages/ModuloA.vue` to understand the non-destructive modal structure — the confirm dialog will be similar but with the destructive overrides.

# Steps

## Step 1 — Gather the dialog specification

Ask the user via AskUserQuestion:

1. **Target page file** where the dialog will be mounted (e.g. `src/pages/Facturas.vue`). A page typically hosts at most 1-3 confirm dialogs (one per destructive action offered).
2. **Action verb** (Spanish, specific, e.g. `"Eliminar"`, `"Anular"`, `"Dar de baja"`, `"Cancelar orden"`, `"Revertir pago"`, `"Cerrar período"`). This is the label of the right button AND the title of the dialog.
3. **What will happen** (Spanish, concrete sentence with the record ID, describing the exact outcome). Examples:
   - `"Esta operación eliminará el registro {id} y no puede deshacerse."`
   - `"La factura {id} quedará anulada. Su numerador se mantiene reservado y no se puede reutilizar."`
   - `"Al cerrar el período, no se podrán registrar nuevas operaciones con fecha anterior."`
4. **Can it be undone?** (boolean — usually false for destructive actions, but some can be soft-deleted/recovered. Explicitly state in the description when it can't be undone, for clarity).
5. **Operation** — the function that runs when the user confirms. Options:
   - Reference to an existing function (`deleteFactura`, `voidOrder`)
   - A TODO stub to wire later (chain `ardua-add-api-endpoint`)
6. **Success toast title** (Spanish verb in past participle, e.g. `"Registro eliminado"`, `"Factura anulada"`, `"Orden cancelada"`). The description is auto-generated as `"{id} — {name}"`.
7. **Failure handling** — default is: keep the dialog open, show an error toast, user can retry or cancel. Confirm this is acceptable.

## Step 2 — Validate against the contract

Stop and report if any of these violates the contract:

### Rule 1 — Verb-specific label, never generic

If the proposed right button label is generic (`"OK"`, `"Sí"`, `"Confirmar"`, `"Aceptar"`, `"Continuar"`) → STOP. Explain:

> The `core-modals` contract requires the confirm button to use the specific verb of the destructive action (e.g. "Eliminar", "Anular", "Dar de baja"). Generic labels like "OK" or "Confirmar" are forbidden because they do not communicate consequence.

Ask for a concrete verb.

### Rule 2 — Description describes the concrete outcome, not generic

If the description is a generic `"¿Estás seguro?"` → STOP. Explain:

> The dialog body MUST state exactly what will happen, including the affected record identifier and whether it can be undone. Example: "Esta operación eliminará el registro R-042 y no puede deshacerse." Generic "Are you sure?" prompts are forbidden.

Ask for a concrete description with the affected record.

### Rule 3 — Operation must be actually destructive

If the "destructive" operation does not meaningfully destroy, anul, void, or irreversibly change data (e.g. "Guardar cambios" is not destructive — it's a regular Edit operation), STOP and ask to reclassify. Non-destructive operations do NOT use the confirm dialog pattern — they go through the regular Create/Edit modal or inline.

## Step 3 — Edit the target page file

### 3a. Imports

```ts
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { AlertTriangle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
```

Extend existing imports; do not duplicate.

### 3b. State refs — one per destructive action

Use a naming convention: `confirm{Verb}Open` + `confirm{Verb}Record` + `confirm{Verb}Loading`.

```ts
// ─── Confirm dialog: Anular ────────────────────────────────────────
const confirmAnularOpen = ref(false);
const confirmAnularRecord = ref<Factura | null>(null);
const confirmAnularLoading = ref(false);
```

If multiple destructive actions exist, repeat the block per action with distinct names.

### 3c. Open / close handlers

```ts
function openConfirmAnular(record: Factura): void {
  confirmAnularRecord.value = record;
  confirmAnularOpen.value = true;
}

function closeConfirmAnular(): void {
  // Do NOT close while the action is in flight — the button itself is disabled
  if (confirmAnularLoading.value) return;
  confirmAnularOpen.value = false;
  confirmAnularRecord.value = null;
}
```

### 3d. Confirm handler (the actual destructive work)

```ts
async function submitAnular(): Promise<void> {
  if (!confirmAnularRecord.value) return;
  const record = confirmAnularRecord.value;

  confirmAnularLoading.value = true;
  try {
    // TODO: replace with real API call via ardua-add-api-endpoint
    // await voidFactura(record.id);
    await Promise.resolve();

    toast.success('Factura anulada', { description: `${record.id} — ${record.name}` });
    confirmAnularOpen.value = false;
    confirmAnularRecord.value = null;
    // Optional: refresh the list / invalidate the query
  } catch (err) {
    // Dialog STAYS OPEN on failure so user can retry or cancel
    const message = err instanceof Error ? err.message : 'No se pudo anular la factura';
    toast.error('Error al anular', { description: message });
    // Do NOT close the dialog; do NOT clear the record ref
  } finally {
    confirmAnularLoading.value = false;
  }
}
```

### 3e. Template — the confirm dialog

Insert at the bottom of the `<template>` (alongside other modals, not nested inside the table):

```vue
<!-- Confirm dialog: Anular -->
<div
  v-if="confirmAnularOpen"
  class="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
  @keydown.esc="closeConfirmAnular"
>
  <!--
    CRITICAL: no @click.self on the overlay — backdrop click must NOT dismiss.
    This overrides the dismissal behavior of regular Create/Detail/Edit modals.
    Per core-modals: destructive actions require an explicit choice.
  -->
  <div
    class="w-full max-w-sm rounded-2xl border border-danger/40 bg-[#1A1A1A] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
    @click.stop
  >
    <!-- Danger-accented header -->
    <div class="flex items-start gap-3 p-5 pb-3">
      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-danger-bg">
        <AlertTriangle class="h-4.5 w-4.5 text-danger" />
      </div>
      <div>
        <div class="text-base font-bold text-danger">Anular factura</div>
      </div>
    </div>

    <!-- Concrete description -->
    <div class="px-5 pb-5 text-[13px] leading-relaxed text-t-2">
      <template v-if="confirmAnularRecord">
        La factura <span class="font-mono text-t-1">{{ confirmAnularRecord.id }}</span>
        quedará anulada. Su numerador se mantiene reservado y no se puede reutilizar.
        <br />
        <span class="mt-2 block font-semibold text-t-3">Esta operación no se puede deshacer.</span>
      </template>
    </div>

    <!-- Footer: ghost Cancelar (left) + danger {Verbo} (right) -->
    <div class="flex items-center justify-end gap-2 border-t border-b-1 p-4 px-5">
      <Button
        variant="ghost"
        type="button"
        :disabled="confirmAnularLoading"
        @click="closeConfirmAnular"
      >
        Cancelar
      </Button>
      <Button
        variant="danger"
        type="button"
        :disabled="confirmAnularLoading"
        @click="submitAnular"
      >
        {{ confirmAnularLoading ? 'Anulando...' : 'Anular factura' }}
      </Button>
    </div>
  </div>
</div>
```

Replace `Factura` with the actual record type. Adjust the title, icon, and description for the specific destructive action.

### 3f. Button variant

The `danger` variant on `<Button>` is expected to exist per `core-theming`. If it does not exist in the current `src/components/ui/button/` implementation, flag it as a follow-up and use a fallback:

```vue
<Button
  class="bg-danger text-white hover:bg-danger/90"
  type="button"
  ...
>
```

But the preferred solution is to add `danger` to the button's `cva` variants — that's a separate small fix that can be surfaced to the user.

## Step 4 — Wire the trigger

The dialog is only useful if something opens it. Wire the trigger in the corresponding caller:

### 4a. From a row-level action (most common)

In the `ActionsMenu` template of the page (created by `ardua-add-row-actions`), replace the placeholder `openConfirmDialog('cancel', record)` with the specific handler:

```vue
<button
  type="button"
  class="... text-danger ..."
  @click="openConfirmAnular(activeRecord)"
>
  Anular factura
</button>
```

Also remove the `openConfirmDialog` stub if it was a placeholder.

### 4b. From a header CTA

In the page header (`ardua-configure-header-ctas`), wire the CTA handler directly:

```vue
<Button variant="ghost" size="md" @click="openConfirmClose">
  Cerrar período
</Button>
```

```ts
function openConfirmClose(): void {
  confirmCloseOpen.value = true;   // no per-record context — module-level action
}
```

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Missing record type on `confirm{Verb}Record` ref. Ensure the generic `ref<T | null>(null)` is provided.
- `Button` doesn't have `variant="danger"`. Either add it to the button component's variants or use the `class` fallback shown in Step 3f.

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "Confirm dialog for `{Verb}` wired on `{page}`. Triggered from: {row-action | header-CTA | other}. Mandatory checklist items from core-modals: all satisfied."
- Files touched: the single page file (+ potentially `src/components/ui/button/` if `danger` variant was added)
- Quality gates results (all ✓)
- Follow-up: replace the stub `await Promise.resolve()` with the real destructive API call — chain `ardua-add-api-endpoint`

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` | Add state refs, open/close/submit handlers, confirm dialog template; wire trigger from caller (row action or CTA) |
| `src/components/ui/button/` | (If `danger` variant missing) Extend the `cva` variants to include `danger` with `bg-danger text-white hover:bg-danger/90` |

# Compliance checklist (vs. `core-modals` destructive-action requirement)

- [ ] Dialog width is narrow: `max-w-sm` (~24rem)
- [ ] Header uses danger-accented styling (icon + danger text color)
- [ ] Title is the specific verb, not generic (`"Eliminar factura"`, not `"Confirmar"`)
- [ ] Description describes the concrete outcome, including the affected record ID
- [ ] Description explicitly states whether the action can be undone (when it cannot)
- [ ] Footer has ghost `Cancelar` on the LEFT
- [ ] Footer has `danger`-variant button with the verb-specific label on the RIGHT (never `"OK"`, `"Sí"`, `"Confirmar"` alone)
- [ ] Backdrop click does NOT dismiss — the outer `<div>` has NO `@click.self` handler that closes
- [ ] ESC key closes the dialog (= Cancelar behavior, no action executed, no toast)
- [ ] On success: dialog closes + `toast.success` with verb-specific title + `{id} — {name}` description
- [ ] On failure: dialog stays OPEN + `toast.error` with reason + confirm button returns to enabled for retry
- [ ] Loading state: confirm button shows `"{Verbo}ando..."` (e.g. `"Anulando..."`) and is disabled during in-flight operation
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-row-actions` — typical caller: a destructive row action needs this dialog to be safe
- `ardua-configure-header-ctas` — alternative caller: a destructive header CTA needs this dialog
- `ardua-add-api-endpoint` — chain AFTER this skill to replace the `TODO` stub with the real destructive API call
