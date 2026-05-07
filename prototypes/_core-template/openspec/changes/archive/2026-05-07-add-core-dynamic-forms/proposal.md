- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — habilita TRD (alert configs runtime), OPS (instruction attributes flexibles cuando vienen del backend)

# Add `core-dynamic-forms` capability — runtime field generation from backend schemas

## Why

`core-actions-manifest` y `core-forms` resuelven UI declarativa **build-time**: el desarrollador escribe el manifest del módulo en TS, el motor renderiza el form. Pero hay casos donde el schema del form no se conoce al momento de compilar — viene del backend en runtime:

1. **TRD — Alert configs.** Cada `alert_id` declara su propio array `params: FieldConfig[]` con `{ type, label, placeholder, required, options }`. El cliente debe materializar el form sin saber de antemano qué campos vienen ni cuántos. Hoy `Alerts.tsx` (legacy React) hace switch local `type → component`.
2. **OPS — Instruction attributes desde catálogo.** Cuando los attributes flexibles de `InstructionForm` se cataloguen del lado del backend (caso futuro: el backend define qué attributes son válidos para un currency dado), el form deberá renderizar dinámicamente.
3. **Cualquier app que adopte server-side form definitions.** Patrón común en plataformas multi-tenant: cada tenant tiene su set de campos custom; el form se materializa runtime.

`core-actions-manifest` no cubre esto porque su contrato asume que el manifest es código TS que vive en el repo del app. Esta change extiende el motor para aceptar schemas runtime con el mismo contrato declarativo: el field type registry es el mismo, los componentes mapeados son los mismos, la validación zod se infiere automáticamente desde el schema runtime. Sin esta change cada app va a reinventar su switch `type → component` localmente.

## What Changes

- **`core-actions-manifest`** — un requirement añadido:
  - **ADDED** "Manifest engine MUST support runtime field schemas via the `useDynamicForm` composable" — define cómo el motor acepta un array de `FieldConfig` runtime (schema validado vía Zod al ingreso) y renderiza el form usando el mismo type registry que ya consumen los manifests build-time. La diferencia es que en build-time el manifest viene de un import; en runtime viene de una API response (o un Pinia store).
- **`core-forms`** — un requirement añadido:
  - **ADDED** "DynamicForm component MUST consume `useDynamicForm` and render fields per the runtime FieldConfig schema" — define el componente `<DynamicForm :schema="..." v-model="formData">` que materializa el form: per `FieldConfig` resuelve el componente del type registry, deriva el zod schema, wrappea con `<FormControl>`, y emite `formData` reactive.
- **New capability `core-dynamic-forms`** con requirements para:
  - **FieldConfig schema canónico** — Zod schema describiendo la shape: `{ id, type, label, placeholder?, required?, options?, conditional?, defaults? }`.
  - **Validación runtime del schema** — al recibir el schema del backend se valida; malformed schemas se rechazan con `<EmptyState>` en vez de renderizar parcial.
  - **Type registry exposed at runtime** — el motor del manifest expone el `Map<type, component>` para que los apps registren tipos custom de dominio cuando lo necesiten (extensión del registry build-time).
  - **Conditional fields runtime** — `conditional: { field, value }` declarativo; field oculto / mostrado reactivamente según el valor de otro campo.
  - **Composable `useDynamicForm(schema, options)`** que devuelve `{ formState, isValid, validate, reset, fields }` para consumers que necesiten control imperativo.

## Capabilities

### Affected Capabilities

- `core-actions-manifest` — un requirement añadido (runtime field schemas via composable).
- `core-forms` — un requirement añadido (DynamicForm component).

### New Capabilities

- `core-dynamic-forms` — net-new. 5 requirements iniciales cubriendo FieldConfig schema, validación runtime, type registry runtime, conditional fields, composable.

### Cross-capability dependencies

- Compone con `core-forms` — los field types del schema runtime son los mismos del manifest engine; cualquier extensión de `core-forms` (Dropzone, DatePicker, MoneyInput, OtpInput, DynamicKeyValueFields) automáticamente está disponible para forms dinámicos.
- Compone con `core-error-handling` — schemas malformed rinden `<EmptyState>` con mensaje canónico en vez de form roto.
- Compone con `core-api-layer` — el schema típicamente viene de un endpoint API (TRD `GET /alerts/{id}/config`); el contract NO modifica nada de `core-api-layer`.

## Notes

- El spec NO contracta **server-side form submission** distinto del estándar. El form generado dinámicamente submitea a un endpoint del backend igual que cualquier otro form — el `onSubmit` es del consumer.
- El spec NO contracta **ad-hoc validation rules** runtime (validar un campo contra una regex que viene del backend). Eso aumenta el surface; out of v1. La validación runtime hoy se limita a: type-correct + required + min/max si declarados estructuralmente.
- El spec NO contracta **field groups / sections** runtime (agrupar fields en secciones colapsables). Si el backend dicta agrupación, los apps componen `<DynamicForm>` instances en cada sección manualmente.
- El spec NO contracta **localization runtime** (traducir labels al idioma del usuario en runtime). Los labels vienen del backend ya localizados — backend decide.
