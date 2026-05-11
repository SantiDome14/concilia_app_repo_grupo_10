# core-dynamic-forms Specification

## Purpose
TBD - created by archiving change add-core-dynamic-forms. Update Purpose after archive.
## Requirements
### Requirement: Runtime FieldConfig schema MUST conform to the canonical Zod-validated shape

The runtime form schema SHALL be an array of `FieldConfig` objects that conform to a canonical shape validated by Zod. Each `FieldConfig` SHALL include: `id: string` (unique within the schema, used as the form state key), `type: ManifestFieldType` (one of the field types accepted by the manifest engine: `text | textarea | select | date | daterange | number | money | boolean | file | multifile | otp | key-value-array | lookup`), `label: string`, optional `placeholder: string`, optional `required: boolean` (default `false`), optional `options: Option[]` (required when `type === 'select'` or `keyType === 'select'` for `key-value-array`), optional `conditional: { field: string; value: unknown }` (the FieldConfig is shown only when the referenced field has the declared value), optional `defaults: unknown` (initial value), and optional `meta: Record<string, unknown>` (type-specific extras like `currency`, `decimals`, `accept`, `maxSize`, `min`, `max`, `length`). The composable SHALL validate every received schema before consuming it; malformed schemas SHALL be rejected.

#### Scenario: Backend returns a valid schema and the composable consumes it

- **GIVEN** the backend returns `[{ id: 'cost_price', type: 'money', label: 'Precio de costo', meta: { currency: 'USD' }, required: true }, { id: 'volume', type: 'number', label: 'Volumen', meta: { min: 0 }, required: true }]`
- **WHEN** the composable's validator runs against the canonical Zod shape
- **THEN** the schema parses successfully and the composable exposes the typed array via `fields`

#### Scenario: Malformed FieldConfig is rejected

- **GIVEN** the backend returns `[{ id: 'foo', type: 'unknown-type', label: 'Foo' }]`
- **WHEN** the composable's validator runs
- **THEN** the schema is rejected, the composable transitions to an `error` state, and `<DynamicForm>` consumes that state to render `<EmptyState>` with a canonical message

#### Scenario: select without options is rejected

- **GIVEN** the backend returns `[{ id: 'side', type: 'select', label: 'Lado', required: true }]` (missing `options`)
- **WHEN** the composable's validator runs
- **THEN** the schema is rejected; the message names the offending field id and the missing `options` property

### Requirement: DynamicForm component MUST render fields by resolving the manifest type registry at runtime

The `<DynamicForm>` component SHALL be the single canonical primitive for rendering forms whose schema is determined at runtime. It SHALL accept props `schema: FieldConfig[]` (the runtime schema, ideally already validated), `v-model="formState"` (the reactive form state, keyed by `FieldConfig.id`), and optional `validateOnSubmit?: boolean` (default `true`). For each `FieldConfig` it SHALL resolve the rendering component by looking up the `type` in the same type registry that `core-actions-manifest` uses for build-time manifests — there is no parallel registry for runtime forms. The component SHALL wrap each field in `<FormControl>` (consuming vee-validate scope) and SHALL derive the per-field zod schema from the `FieldConfig` (e.g., `type: 'money'` with `meta.currency` produces `z.coerce.number()` with the same refinements as the build-time `money` field type). When the schema is empty (`schema: []`) or invalid, the component SHALL render `<EmptyState>` with the canonical message instead of a partial form.

#### Scenario: DynamicForm renders fields by consulting the registry

- **GIVEN** a `<DynamicForm :schema="alertConfigFields" v-model="alertFormState">` and `alertConfigFields` is a valid runtime schema with `text`, `select`, and `number` fields
- **WHEN** the component renders
- **THEN** each field resolves to its registered component (`<Input>`, `<Select>`, `<Input type="number">`); each field is wrapped in `<FormControl>`; `formState` is initialized from each field's `defaults` (or `null` when unset)

#### Scenario: DynamicForm uses the same registry as build-time manifests

- **GIVEN** an app extends the manifest type registry with a custom domain type `account-tag`
- **WHEN** a runtime schema includes `{ id: 'tag', type: 'account-tag' }`
- **THEN** the `<DynamicForm>` resolves `account-tag` to the same component that build-time manifests use — there is no parallel registry; one registry serves both

#### Scenario: Empty schema renders EmptyState

- **GIVEN** a `<DynamicForm :schema="[]">`
- **WHEN** the component renders
- **THEN** the form is NOT rendered; `<EmptyState>` renders with the canonical message (default `"No hay campos para mostrar"`); submission is unavailable

#### Scenario: Invalid schema (validation failed) renders EmptyState with error message

- **GIVEN** a `<DynamicForm :schema="malformedSchema">` where the schema fails Zod validation
- **WHEN** the component renders
- **THEN** the form is NOT rendered; `<EmptyState>` renders with a message indicating the schema was rejected (`"Los campos del formulario no pudieron interpretarse"`); the validation error is logged via `console.warn` for diagnostics

### Requirement: Runtime field schemas MUST share the type registry with build-time manifests

The manifest engine's type registry (`Map<ManifestFieldType, Component>`) SHALL be a single source for both build-time manifests (declared in TS) and runtime schemas (received from the backend). The registry SHALL be exposed via `useManifestTypeRegistry()` (a composable that returns the read-only Map plus a `register(type, component)` method for apps that need to add custom domain types). When an app extends the registry with a custom type, that type SHALL be valid for both build-time manifests AND runtime schemas — there is no mode-specific registration. Apps SHALL register custom types at app bootstrap (in `main.ts`) so the registry is fully populated before any form attempts to resolve a type.

#### Scenario: Custom domain type registered at bootstrap is valid in both modes

- **GIVEN** an app calls `useManifestTypeRegistry().register('account-tag', AccountTagInput)` in `main.ts`
- **WHEN** a build-time manifest declares a field `{ type: 'account-tag', ... }` AND a runtime schema declares `{ id: 'tag', type: 'account-tag' }`
- **THEN** both resolve to `AccountTagInput`; there is no mode-specific behavior

#### Scenario: Type-not-in-registry is rejected uniformly

- **GIVEN** a build-time manifest OR a runtime schema declares `{ type: 'rich-text' }` and `rich-text` is not registered
- **WHEN** the engine attempts to resolve
- **THEN** the resolution fails identically — for build-time, the manifest validator rejects; for runtime, the `useDynamicForm` validator rejects with the same error code; no parallel rendering paths exist

### Requirement: Runtime FieldConfig MUST support reactive conditional visibility

A `FieldConfig` MAY declare `conditional: { field: string; value: unknown }`. When declared, the field SHALL be visible ONLY when the form state's value at the referenced `field` matches the declared `value` (strict equality). The `<DynamicForm>` SHALL evaluate the predicate reactively — as the user changes the form state, conditional fields appear or disappear immediately. When a conditional field becomes hidden, its value SHALL be removed from the submitted form state (so the backend receives only the visible fields).

#### Scenario: Conditional field appears reactively

- **GIVEN** a runtime schema with `[{ id: 'side', type: 'select', label: 'Lado', options: [{value: 'BUY'}, {value: 'SELL'}] }, { id: 'spread', type: 'money', label: 'Spread', meta: { currency: 'USD' }, conditional: { field: 'side', value: 'BUY' } }]`
- **WHEN** the user selects `BUY` for `side`
- **THEN** the `spread` field appears immediately in the form

#### Scenario: Conditional field disappears and its value is excluded from submit

- **GIVEN** a form where the user has set `side = 'BUY'` and entered `spread = 100`, then changes `side = 'SELL'`
- **WHEN** the conditional rule re-evaluates and `spread` becomes hidden
- **THEN** the `spread` field disappears from the rendered form AND its value is removed from `formState`; submitting the form sends only `{ side: 'SELL' }` to the backend (no stale `spread`)

#### Scenario: Conditional referencing an unknown field is a contract violation

- **GIVEN** a runtime schema where a `FieldConfig` declares `conditional: { field: 'nonexistent', value: 'X' }`
- **WHEN** the schema validator runs
- **THEN** the schema is rejected — `conditional.field` SHALL reference an `id` of another `FieldConfig` in the same schema; dangling references are forbidden

### Requirement: Composable `useDynamicForm` MUST be the only consumer entry point for runtime schemas

Apps SHALL consume the runtime form contract exclusively via the `useDynamicForm(schema, options)` composable. Direct manipulation of internal state, hand-rolled type-resolution switches, or per-app dynamic-form reimplementations are forbidden. The composable SHALL accept `schema: FieldConfig[]` (the runtime schema), and `options` for `validateOnSubmit?: boolean` (default `true`), `initialState?: Record<string, unknown>` (override defaults), and `onSubmit(formState)` (handler invoked on successful submit). It SHALL expose `fields: Ref<FieldConfig[]>` (the validated, type-checked, ready-for-render list), `formState: Ref<Record<string, unknown>>`, `isValid: ComputedRef<boolean>`, `errors: Ref<Record<string, string>>`, plus actions `validate(): boolean`, `submit(): Promise<void>`, `reset(): void`. The composable SHALL re-validate the schema if the `schema` prop changes (e.g., the backend response refreshes).

#### Scenario: Module consumes the composable

- **GIVEN** a TRD module that fetches alert config from the backend
- **WHEN** the implementation is authored
- **THEN** it imports `useDynamicForm` and the `<DynamicForm>` component, and wires them as `const { formState, submit, isValid } = useDynamicForm(alertSchema.value, { onSubmit: handleAlert })` — direct consumption of the underlying type registry or per-app rendering switches is forbidden

#### Scenario: Schema refresh re-validates and re-renders

- **GIVEN** a `useDynamicForm(schema)` where `schema` is a Ref that updates when the backend returns a new alert template
- **WHEN** the schema Ref changes
- **THEN** the composable re-runs the Zod validator on the new schema, exposes the new `fields`, and the `<DynamicForm>` re-renders with the new structure; the previous `formState` is reset to the new schema's defaults

#### Scenario: submit invokes onSubmit with the validated form state

- **GIVEN** a `useDynamicForm(schema, { onSubmit: handleAlert })` and the user has filled all required fields
- **WHEN** the consumer calls `submit()`
- **THEN** the composable runs `validate()` (which checks every field against its derived zod schema); if valid, it invokes `onSubmit(formState)` with the type-coerced state; if invalid, `errors` populates and `onSubmit` is NOT invoked

