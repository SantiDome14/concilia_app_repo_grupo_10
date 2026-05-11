## ADDED Requirements

### Requirement: DynamicForm component MUST consume `useDynamicForm` and render fields per the runtime schema

The `<DynamicForm>` component is the canonical primitive for rendering forms whose schema is determined at runtime. It SHALL accept `schema: FieldConfig[]`, `v-model="formState"`, and optional `validateOnSubmit?: boolean` (default `true`). The component SHALL internally use `useDynamicForm(schema, options)` to resolve fields, derive zod schemas, and run validation. Each rendered field SHALL be wrapped in `<FormControl>` so vee-validate scope and blur / submit timing matches every other field in `core-forms`. When the schema is empty or invalid, the component SHALL render `<EmptyState>` instead of a partial / broken form.

#### Scenario: DynamicForm renders fields from the runtime schema

- **GIVEN** a TRD module fetches an alert template's `params: FieldConfig[]` from the backend and renders `<DynamicForm :schema="params" v-model="alertFormState">`
- **WHEN** the component renders
- **THEN** each `FieldConfig` resolves to its rendering component via the type registry; each field is wrapped in `<FormControl>`; the `formState` initializes from each field's `defaults` (or the type's default empty value)

#### Scenario: Empty or invalid schema renders EmptyState

- **GIVEN** a `<DynamicForm :schema="[]">` or a `<DynamicForm :schema="malformed">` (where `malformed` fails Zod validation)
- **WHEN** the component renders
- **THEN** the form does NOT render; `<EmptyState>` renders with the canonical message; submission is unavailable

#### Scenario: DynamicForm composes with the same field types as build-time manifests

- **GIVEN** a runtime schema includes `{ id: 'amount', type: 'money', meta: { currency: 'USD' } }`
- **WHEN** `<DynamicForm>` resolves and renders the field
- **THEN** the field renders as `<MoneyInput currency="USD">`; the zod schema is derived from the same logic the build-time manifest uses for `money` fields; vee-validate scope matches
