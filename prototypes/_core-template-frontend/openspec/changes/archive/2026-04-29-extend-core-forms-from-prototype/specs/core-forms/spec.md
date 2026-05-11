# core-forms Specification — Delta

This delta extends the `core-forms` baseline with five new requirements derived from the `_core-template-frontend` v1.15 prototype survey. None of the existing five baseline requirements are modified or removed.

## ADDED Requirements

### Requirement: Forms and modals MUST use a custom Select component, never native `<select>`

Every Select element rendered inside a form or a modal SHALL use the shadcn-vue `<Select>` component (or an equivalent custom portal-based Select built on `reka-ui`). Native `<select>` is forbidden inside forms and modals because it ignores design tokens (dark mode, DM Sans, paddings, hover states, brand focus rings) and breaks visual consistency. The custom `<Select>` component SHALL render its dropdown via `<Teleport to="body">` with `position: fixed` and z-index ≥ 9999 so it always sits above modal overlays (z-index ≥ 500), drawers, and the page content. The component SHALL support keyboard navigation: Up/Down move the highlighted item, Enter selects it, and Esc closes the dropdown. The component SHALL integrate with vee-validate via the shadcn-vue `<FormControl>` wrapper so blur and submit validation timing matches `<Input>` and `<Textarea>`.

#### Scenario: Native `<select>` is forbidden inside forms and modals

- **GIVEN** a developer is implementing a Select field inside a Create modal
- **WHEN** the developer reaches for an HTML `<select>` element
- **THEN** the spec REJECTS the implementation and the developer MUST use the shadcn-vue `<Select>` component (or an equivalent custom portal-based Select)

#### Scenario: Custom Select renders its dropdown above the modal overlay

- **GIVEN** a `<Select>` mounted inside a modal whose overlay has z-index ≥ 500
- **WHEN** the user opens the Select dropdown
- **THEN** the dropdown is teleported to `document.body` with `position: fixed` and z-index ≥ 9999, so it visually sits above the modal overlay and is not clipped by the modal's overflow

#### Scenario: Custom Select supports keyboard navigation and integrates with vee-validate

- **GIVEN** a `<Select>` wrapped in a `<FormControl>` inside a vee-validate `<Form>`
- **WHEN** the user opens the dropdown and presses Up/Down to move the highlight, Enter to select, then Tab away
- **THEN** keyboard navigation moves the highlighted item, Enter commits the selection, the value is written to the form via vee-validate, and field validation runs on blur in the same way `<Input>` validates

### Requirement: Dependent Select fields MUST reset their value and re-derive options when the parent changes

When a `<Select>` declares a `dependsOn` prop of shape `{ field: string, fetchOptions: (parentValue) => Option[] | Promise<Option[]> }`, the component SHALL subscribe to the parent field's value via vee-validate's `useFieldValue(field)` and react to every change. On each parent change, the component SHALL (a) call `setFieldValue(<this-field-name>, null)` so the form's `dirty`, `touched`, and `errors` state stays consistent, and (b) invoke `fetchOptions(parentValue)` to derive the new option list. The reset SHALL run unconditionally — the child's prior selection cannot be assumed valid for a new parent — even when the new option list happens to contain the prior value.

#### Scenario: Changing the parent resets the child to null

- **GIVEN** a Sociedad `<Select>` and a Cuenta `<Select>` whose `dependsOn.field` is `"sociedad"`
- **WHEN** the user changes the Sociedad selection from `S1` to `S2`
- **THEN** the Cuenta value is reset to `null` via vee-validate's `setFieldValue('cuenta', null)` and the Cuenta dropdown shows the option list returned by `fetchOptions('S2')`

#### Scenario: Reset happens even when the new option list contains the prior value

- **GIVEN** a child `<Select>` whose prior value is `C1` and whose new parent yields an option list that still includes `C1`
- **WHEN** the parent's value changes
- **THEN** the child is still reset to `null` because a parent change implies the child's prior selection cannot be assumed semantically valid

#### Scenario: Form state stays consistent through the reset

- **GIVEN** a vee-validate form tracking `dirty`, `touched`, and `errors` for a dependent Cuenta field
- **WHEN** the parent Sociedad changes and the Cuenta field is reset via `setFieldValue('cuenta', null)`
- **THEN** the form state for Cuenta updates through vee-validate (no direct DOM mutation, no `update:modelValue` bypass) so `dirty` / `touched` / `errors` remain coherent and the submit button's disabled state reflects the new validity

### Requirement: Dynamic Select options MUST be populated before the field first renders

When a `<Select>`'s options come from a runtime dataset (an API-fetched category list, a user-scoped catalog, or any other source that is not statically declared at component author time), the form SHALL guarantee that the option list is available BEFORE the field is shown to the user with interactive affordances. Two patterns are accepted: (a) page-level pre-fetch via `@tanstack/vue-query`'s `useQuery` resolved before the modal opens, or (b) modal-scoped `useQuery({ enabled: () => isOpen.value })` that renders a `<Skeleton>` placeholder while `isPending` is true. The Select SHALL NOT render an empty option list followed by a flicker to a populated list, and SHALL NOT render a stale option list from a prior fetch on first paint.

#### Scenario: Modal-scoped query renders a Skeleton while options load

- **GIVEN** an Editar Reporte modal whose `categoria` `<Select>` depends on a runtime `CATEGORIES` query
- **WHEN** the modal opens and the query is `isPending`
- **THEN** the `<Select>` slot renders the shared `<Skeleton>` component instead of an empty Select; the Skeleton is replaced by the populated `<Select>` only when the query resolves

#### Scenario: Page-level pre-fetch resolves before the modal opens

- **GIVEN** a page that pre-fetches the option list via `useQuery(['categories'])` and passes the resolved list to the modal as a prop
- **WHEN** the user clicks the Main CTA to open the modal
- **THEN** the modal mounts with the option list already in memory and the `<Select>` first paint shows the populated list, with no Skeleton flash

#### Scenario: Empty-options-on-first-render is forbidden

- **GIVEN** a modal containing a runtime-loaded `<Select>`
- **WHEN** the modal first paints
- **THEN** the Select MUST NOT render an empty options list (no `<Skeleton>`, no pre-fetch) — such an implementation is rejected as a spec violation because it produces a flicker when the options arrive

### Requirement: Select items MAY expose a state-color dot via the `dotColor` token

The `<Select>` component's option type SHALL extend `{ value, label }` with an optional `dotColor: string`. When `dotColor` is declared, the option item SHALL render a leading 8px circle (`w-2 h-2 rounded-full inline-block` with the resolved background color) immediately before the label. When `dotColor` is undeclared, the dot SHALL NOT render and the label aligns flush left. The accepted `dotColor` values are: a token alias (`'success' | 'warning' | 'danger' | 'info' | 'neutral'`) resolved against the `core-theming` semantic palette (`success → var(--success)`, `warning → var(--warning)`, `danger → var(--danger)`, `info → var(--info)`, `neutral → var(--t-3)`), or a raw `var(--*)` reference for forward-compatibility with custom tokens. Hardcoded hex/rgb values are forbidden.

#### Scenario: Item with `dotColor` renders a leading colored circle

- **GIVEN** a `<Select>` rendering an option `{ value: 'ACTIVE', label: 'Activo', dotColor: 'success' }`
- **WHEN** the dropdown opens
- **THEN** the option item shows an 8px circle with `background-color: var(--success)` immediately before the label `Activo`

#### Scenario: Item without `dotColor` hides the dot slot

- **GIVEN** a `<Select>` rendering an option `{ value: 'S1', label: 'Sociedad 1' }` (no `dotColor`)
- **WHEN** the dropdown opens
- **THEN** no circle is rendered for that item and the label aligns flush left, identical to a non-state-typed Select

### Requirement: Manifest dialog fields MUST map each declared type to its Vue equivalent and integrate with vee-validate

The action manifest engine (governed by `core-actions-menu`) renders dialog fields by `type`. The supported types and their Vue/TS mappings SHALL be exactly: `lookup` → `<Select searchable>` resolving its options via `resolveCatalog(catalog)`; `text` → `<Input type="text">` honoring optional `maxLength`; `textarea` → `<Textarea>` honoring optional `maxLength`; `select` → `<Select>` populated from the manifest's static `options[]`; `date` → `<DatePicker>` (built on `date-fns`) honoring optional `min` / `max`; `number` → `<Input type="number">` honoring optional `min` / `max`; `boolean` → `<Checkbox>`. Each field SHALL be wrapped in `<FormControl>` so blur / submit validation runs through vee-validate. The schema for each field SHALL be derived from the manifest using zod tokens: `z.string()` (with `.min(1)` for required, `.max(maxLength)` when declared) for `lookup` / `text` / `textarea`; `z.enum([...options[].value])` for `select`; `z.coerce.date()` with `.min()`/`.max()` refinements for `date`; `z.coerce.number()` with `.min()`/`.max()` for `number`; `z.boolean()` for `boolean`. The manifest validator SHALL reject any `field.type` not in this whitelist of seven values. `<Switch>` is NOT a manifest dialog field type — `boolean` is rendered as `<Checkbox>` only.

#### Scenario: `lookup` field renders a searchable Select with catalog-resolved options

- **GIVEN** a manifest field `{ type: 'lookup', catalog: 'clp.clientes', label: 'Cliente', required: true }`
- **WHEN** the dialog renders the field
- **THEN** the field is a `<Select>` with the search input enabled, its options come from `resolveCatalog('clp.clientes')`, and its zod schema is `z.string().min(1)` so the submit button stays disabled while the field is empty

#### Scenario: `number` field honors min and max from the manifest

- **GIVEN** a manifest field `{ type: 'number', label: 'Monto', min: 0, max: 1000000 }`
- **WHEN** the dialog renders the field and the user enters a value
- **THEN** the field is `<Input type="number">` and the zod schema applies `.min(0)` and `.max(1000000)` so values outside the range produce a validation error rendered below the input in `text-danger`

#### Scenario: `boolean` field renders as a Checkbox, never a Switch

- **GIVEN** a manifest field `{ type: 'boolean', label: 'Notificar al responsable' }`
- **WHEN** the dialog renders the field
- **THEN** the field is rendered as `<Checkbox>` (default unchecked → `false` per `z.boolean()`); rendering it as `<Switch>` is rejected as a spec violation

#### Scenario: Manifest validator rejects unknown field types

- **GIVEN** a manifest declares a field with `type: 'rich-text'`
- **WHEN** the manifest validator runs (dev mode)
- **THEN** the validator rejects the manifest with a clear message naming the offending type and listing the seven accepted values, and the dialog refuses to render that field

### Requirement: Manifest dialog fields MUST disable themselves reactively when their declared prerequisites are unmet

When a manifest dialog field declares `prerequisites: [{ field: string, message: string }, ...]` (the prototype's array form), the Vue field component SHALL subscribe to each prereq's value via vee-validate's `useFieldValue(prereqField)` and re-evaluate on every change. The field SHALL render as `disabled` while ANY declared prereq value is empty (`null`, `undefined`, or empty string). While disabled, the field SHALL render a small grey hint chip next to the label containing the `message` of the first unmet prerequisite (deterministic order = manifest declaration order). The moment all prereqs have non-empty values, the field SHALL become enabled and the chip SHALL be removed. The field SHALL re-disable and re-show the chip if the user later clears any prereq.

#### Scenario: Field is disabled and shows the hint chip while prereq is empty

- **GIVEN** a `Cuenta destino` field whose `prerequisites` declare `[{ field: 'cuenta_origen', message: 'Selecciona primero la cuenta origen' }]`
- **WHEN** the dialog opens and `cuenta_origen` is empty
- **THEN** the `Cuenta destino` field renders as `disabled` and a small grey hint chip next to its label reads `Selecciona primero la cuenta origen`

#### Scenario: Field becomes enabled reactively when the prereq is filled

- **GIVEN** the same `Cuenta destino` field, currently disabled because `cuenta_origen` is empty
- **WHEN** the user selects a value for `cuenta_origen`
- **THEN** the `Cuenta destino` field becomes enabled immediately (no submit, no blur required) and the hint chip is removed

#### Scenario: Field re-disables when the prereq is cleared

- **GIVEN** the same `Cuenta destino` field, currently enabled because `cuenta_origen` has a value
- **WHEN** the user clears `cuenta_origen` back to empty
- **THEN** the `Cuenta destino` field becomes `disabled` again and the hint chip with `Selecciona primero la cuenta origen` reappears
