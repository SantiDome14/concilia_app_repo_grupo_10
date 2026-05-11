---
name: ardua-build-form
description: Build a form in an Ardua core frontend using `vee-validate` + `zod`, the canonical label style (`text-[10px] font-bold uppercase tracking-wider text-t-3`), required-field asterisks, submit-button disabled-while-invalid behavior, and inline field-level error rendering in `text-danger`. Use when the user wants to create or modify a form (e.g. "armá un formulario para crear un proveedor", "necesito una pantalla de alta de facturas con validación", "build a form with validation for X", "agregá un formulario a este módulo"). Enforces the `core-forms` contract: no hand-rolled validation in refs, zod schemas are mandatory, blur-level field validation + submit-level full validation.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Build a form that satisfies the `core-forms` contract — every form in an Ardua core app must use the same stack (`vee-validate` + `zod`), the same label style, the same error rendering, and the same submit-button behavior. This skill produces a form component or form section that is contract-compliant from the first line of code.

The form can live in three surfaces:

1. Inside a Create / Edit modal on a table module (pattern in `ModuloA.vue`)
2. As the entire L3 surface of a page (form-only module, e.g. settings, configuration)
3. As a step in a multi-step wizard (advanced — this skill covers single-step forms; multi-step is a future extension)

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Armá / construí un formulario de X"
- "Necesito una pantalla de alta / edición de Y"
- "Build a form for X" / "Form with validation for Y"
- "Agregá un form para {create / update} Z"
- `ardua-add-module` or `ardua-configure-header-ctas` chains here for a form-based "Crear" action

Do NOT use this skill for:

- Inline edits in a table cell (editable tables are a separate future pattern)
- Settings toggles in a preferences pane (single boolean switches don't need a form framework)
- Multi-step wizards (out of scope for this skill — build one step at a time and compose)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability spec:
   ```bash
   openspec show core-forms
   ```
3. Read the Create and Edit modal structures in `src/pages/ModuloA.vue` — the label/input/error patterns are illustrated there (without vee-validate; this skill upgrades them to the proper stack).
4. Confirm `vee-validate` and `zod` are in `package.json` (they are in the scaffold).

# Steps

## Step 1 — Gather the form specification

Ask the user via AskUserQuestion:

1. **Target** — where does the form live?
   - Inside an existing page as a modal (`src/pages/{Module}.vue` → inside a `<div v-if="createOpen">` or similar)
   - As the entire L3 surface of a page (`src/pages/{Module}.vue` replacing the table area)
   - As a standalone form component (`src/components/forms/{FormName}.vue` — reusable)
2. **Form name** (e.g. `CreateFactura`, `EditFactura`, `ProveedorForm`)
3. **Submit action** (e.g. `submitCreate`, `saveEdit`) and what it does semantically
4. **Fields** — for each field, collect:
   - **Name** (camelCase, matches the domain object shape)
   - **Label** (Spanish, title case for the UI label, e.g. `"Nombre del proveedor"`)
   - **Type**: `text` | `number` | `email` | `date` | `select` | `textarea` | `checkbox` | `radio`
   - **Required** (boolean)
   - **Validation rules** — min length, max length, pattern, enum values, numeric range, custom regex
   - **Placeholder** (Spanish, descriptive)
   - **Help text** (optional, renders below the field in `text-t-4`)
   - **Initial value** (for edit forms — provided from the record being edited)
5. **Layout** — single column (default) or two-column grid (for shorter fields like dates / enums)
6. **Extra state** — does the submit operation need a loading state? (Usually yes — shows a spinner in the button and disables inputs.)

## Step 2 — Validate the spec

Stop and report if:

- No field is marked `required` (unusual — confirm the user actually wants a purely optional form)
- A field is `number` but has no range validation (will accept absurd values; flag and suggest min/max)
- A field is `email` but the spec says only "match regex". Use zod's `.email()` instead of custom regex.
- A field is `select` but no enum values are provided. Flag.
- Labels include technical terms the user will not understand. E.g. `"Email del usuario"` → good; `"User.email"` → bad.

## Step 3 — Create / edit the form file

### 3a. Imports

```ts
import { ref } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
```

### 3b. Define the zod schema

Build the schema from the field spec. Example:

```ts
const schema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'Máximo 120 caracteres'),
  category: z.enum(['Tipo 1', 'Tipo 2', 'Tipo 3'], {
    required_error: 'Seleccioná una categoría',
  }),
  value: z
    .number({ invalid_type_error: 'El valor debe ser un número' })
    .nonnegative('El valor no puede ser negativo'),
  status: z.enum(['ACTIVE', 'PENDING', 'INACTIVE']).default('PENDING'),
});

type FormValues = z.infer<typeof schema>;
```

Validation messages MUST be Spanish and explain what is wrong, not just what's missing. Prefer `"El nombre es obligatorio"` over `"Required"`.

### 3c. Setup `useForm`

```ts
const { handleSubmit, errors, defineField, resetForm, isSubmitting, meta } = useForm<FormValues>({
  validationSchema: toTypedSchema(schema),
  initialValues: {
    name: '',
    category: 'Tipo 1',
    value: 0,
    status: 'PENDING',
  },
});
```

For an edit form, pass the record's values as `initialValues`.

### 3d. Bind fields

Each field uses `defineField` to get a reactive ref and a props object:

```ts
const [name, nameAttrs] = defineField('name');
const [category, categoryAttrs] = defineField('category');
const [value, valueAttrs] = defineField('value');
const [status, statusAttrs] = defineField('status');
```

### 3e. Submit handler

```ts
const onSubmit = handleSubmit(async (values) => {
  try {
    // TODO: replace with the real API call via ardua-add-api-endpoint
    // e.g. await createFactura(values);
    await Promise.resolve();
    toast.success('Registro creado', { description: values.name });
    resetForm();
    // close modal or navigate if applicable
  } catch (error) {
    // ApiError is handled globally; but if this operation needs special handling, do it here
    throw error;
  }
});
```

### 3f. Template — form structure

The structure follows the canonical pattern. For a single-column layout:

```vue
<form class="space-y-3" @submit.prevent="onSubmit">
  <!-- Field: Name (required) -->
  <div>
    <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
      Nombre *
    </label>
    <Input
      v-model="name"
      v-bind="nameAttrs"
      placeholder="Nombre del registro"
    />
    <p v-if="errors.name" class="mt-1 text-[11px] text-danger">
      {{ errors.name }}
    </p>
  </div>

  <!-- Field: Category (required) -->
  <div>
    <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
      Categoría *
    </label>
    <select
      v-model="category"
      v-bind="categoryAttrs"
      class="w-full rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 outline-none"
    >
      <option value="Tipo 1">Tipo 1</option>
      <option value="Tipo 2">Tipo 2</option>
      <option value="Tipo 3">Tipo 3</option>
    </select>
    <p v-if="errors.category" class="mt-1 text-[11px] text-danger">
      {{ errors.category }}
    </p>
  </div>

  <!-- Field: Value -->
  <div>
    <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
      Valor
    </label>
    <Input
      v-model.number="value"
      v-bind="valueAttrs"
      type="number"
      placeholder="0.00"
    />
    <p v-if="errors.value" class="mt-1 text-[11px] text-danger">
      {{ errors.value }}
    </p>
  </div>

  <!-- Footer -->
  <div class="flex items-center justify-end gap-2 border-t border-b-1 pt-4">
    <Button variant="ghost" type="button" @click="resetForm">Cancelar</Button>
    <Button
      variant="primary"
      type="submit"
      :disabled="!meta.valid || isSubmitting"
    >
      {{ isSubmitting ? 'Guardando...' : 'Guardar' }}
    </Button>
  </div>
</form>
```

### 3g. Canonical field patterns

Reusable templates per field type. Use these verbatim when applicable:

**Text / email:**
```vue
<Input v-model="fieldName" v-bind="fieldAttrs" type="text" placeholder="..." />
```

**Number:**
```vue
<Input v-model.number="fieldName" v-bind="fieldAttrs" type="number" placeholder="0" />
```

**Textarea:**
```vue
<textarea
  v-model="fieldName"
  v-bind="fieldAttrs"
  rows="4"
  class="w-full rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 outline-none resize-y"
  placeholder="..."
/>
```

**Select (enum):**
```vue
<select
  v-model="fieldName"
  v-bind="fieldAttrs"
  class="w-full rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 outline-none"
>
  <option v-for="opt in OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
</select>
```

**Date:**
```vue
<Input v-model="fieldName" v-bind="fieldAttrs" type="date" />
```

**Checkbox:**
```vue
<label class="flex items-center gap-2">
  <input
    v-model="fieldName"
    v-bind="fieldAttrs"
    type="checkbox"
    class="h-4 w-4 rounded border-b-2 bg-card text-brand outline-none"
  />
  <span class="text-sm text-t-2">{{ label }}</span>
</label>
```

### 3h. Two-column layout variant

For forms with 6+ fields, a two-column grid reduces vertical scrolling:

```vue
<form class="grid grid-cols-2 gap-3" @submit.prevent="onSubmit">
  <div>
    <!-- Field 1 -->
  </div>
  <div>
    <!-- Field 2 -->
  </div>
  <!-- Full-width field: span both columns -->
  <div class="col-span-2">
    <!-- Textarea, notes, etc. -->
  </div>
  <!-- Footer also spans both -->
  <div class="col-span-2 flex items-center justify-end gap-2 border-t border-b-1 pt-4">
    <!-- Cancelar + Guardar -->
  </div>
</form>
```

## Step 4 — Wire the submit to the real API

By default, the skill stubs the submit with `await Promise.resolve()`. If an API endpoint exists, wire it:

```ts
import { createFactura } from '@/api/modules/facturas';

const onSubmit = handleSubmit(async (values) => {
  try {
    const created = await createFactura(values);
    toast.success('Factura creada', { description: `${created.id} — ${created.number}` });
    resetForm();
    // close modal / emit event / navigate
  } catch {
    // ApiError handled globally — the interceptor shows the toast
    // Form stays open with user's input preserved
  }
});
```

If the endpoint does not exist yet, leave the `TODO` comment and flag the follow-up: chain `ardua-add-api-endpoint` after this skill.

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Most common: the zod schema's inferred type doesn't match the `initialValues`. Ensure every field in the schema has a matching key in `initialValues`.
- `defineField` not typed correctly: make sure `useForm<FormValues>` has the generic.

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "Form `{FormName}` built on `{file}` with {N} fields. Validation via zod. Submit wired to {stub | real endpoint}."
- Files touched: the single page or form file
- Quality gates results (all ✓)
- Follow-ups: any `TODO: wire real API call` markers pending `ardua-add-api-endpoint`

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` (if modal/inline) OR `src/components/forms/{FormName}.vue` (if standalone) | Add zod schema, `useForm` setup, field bindings, template with label + input + error rendering per the canonical pattern |

This skill does NOT touch shared `Button` / `Input` primitives or any API client.

# Compliance checklist

- [ ] Uses `vee-validate` + `zod` (hand-rolled validation in `ref`s is forbidden by core-forms)
- [ ] zod schema defines every field with domain-correct types
- [ ] Validation messages are Spanish and explain what is wrong
- [ ] Every label uses `text-[10px] font-bold uppercase tracking-wider text-t-3`
- [ ] Required fields render a trailing `*` in the label
- [ ] Every field's errors render in `text-danger` immediately below the input
- [ ] Submit button is `disabled` when `!meta.valid || isSubmitting`
- [ ] Submit button shows a loading label ("Guardando...", "Creando...") while `isSubmitting`
- [ ] No hardcoded hex colors in the form
- [ ] Field validation runs on blur (vee-validate default); full validation on submit
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — the common caller for a "form as L3 surface" module
- `ardua-configure-header-ctas` — chains here when the "Nuevo X" CTA opens a Create modal with this form
- `ardua-add-api-endpoint` — chain AFTER this skill to wire the submit to a real backend call
- `ardua-add-confirm-dialog` — chain if the form's submit is a destructive action (rare — most forms are Create/Edit)
