# core-forms Specification

## Purpose

Define the baseline form contract for every Ardua core frontend — validation engine, submit semantics, field composition, and error surfacing. This is a **seed** capability: each app extends it with its own domain-specific field patterns. The baseline is enforced by the template; the extensions live in per-app deltas.
## Requirements
### Requirement: Forms MUST use vee-validate + zod for validation

Form state and validation SHALL be managed by `vee-validate` with `zod` schemas. Hand-rolled validation logic inside components is forbidden.

#### Scenario: Form composes a zod schema

- **GIVEN** a form is being authored
- **WHEN** the developer defines validation rules
- **THEN** the rules are expressed as a `z.object({...})` schema referenced by the `useForm` composable

#### Scenario: Validation runs on blur and on submit

- **GIVEN** a form with fields and a submit button
- **WHEN** the user interacts with a field or submits the form
- **THEN** field validation runs on blur and full-form validation runs on submit

### Requirement: Form labels MUST use the uppercase label token

Every field label SHALL use the standard uppercase, bold, letter-spaced label token defined by the design system. Mixed-case or bolded inline labels are forbidden.

#### Scenario: Label applies canonical token

- **GIVEN** a form field with a label
- **WHEN** the field renders
- **THEN** the label applies `text-[10px] font-bold uppercase tracking-wider text-t-3` and sits on the line above the input with a consistent small margin

### Requirement: Required fields MUST be marked with a trailing asterisk

Fields whose zod schema makes them required SHALL render a trailing `*` after the label text. Optional fields SHALL NOT render the asterisk.

#### Scenario: Required field is marked

- **GIVEN** a zod schema marks a field as required (non-optional, non-nullable)
- **WHEN** the field's label renders
- **THEN** the label shows a trailing `*`

### Requirement: Submit buttons MUST be disabled while the form is invalid or submitting

The primary submit button SHALL be disabled while the form is invalid, while a submit is in flight, or while a dependent async operation is pending.

#### Scenario: Invalid form disables submit

- **GIVEN** a form with at least one validation error
- **WHEN** the submit button renders
- **THEN** its `disabled` attribute is `true`

#### Scenario: In-flight submit disables the form

- **GIVEN** a form where the submit handler is awaiting a network response
- **WHEN** the submit button renders
- **THEN** the submit button is disabled and its label MAY be swapped for a loading indicator

### Requirement: Form field errors MUST render directly below the input

When a field has a validation error, the error message SHALL render directly below the input in the danger token color. Error text SHALL be concise and actionable.

#### Scenario: Error message surfaces below the field

- **GIVEN** a field fails validation
- **WHEN** the field renders
- **THEN** a small-sized error message appears below the input with `text-danger`

#### Scenario: Error clears on successful revalidation

- **GIVEN** a field previously showing an error
- **WHEN** the user corrects the value and it passes validation
- **THEN** the error message is removed

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

The action manifest engine (governed by `core-actions-menu`) renders dialog fields by `type`. The supported types and their Vue/TS mappings SHALL be exactly: `lookup` → `<Select searchable>` resolving its options via `resolveCatalog(catalog)`; `text` → `<Input type="text">` honoring optional `maxLength`; `textarea` → `<Textarea>` honoring optional `maxLength`; `select` → `<Select>` populated from the manifest's static `options[]`; `date` → `<DatePicker>` (built on `date-fns`) honoring optional `min` / `max`; `number` → `<Input type="number">` honoring optional `min` / `max`; `boolean` → `<Checkbox>`; `file` → `<Dropzone>` (single-file mode, equivalent to `<Dropzone :multiple="false" :maxFiles="1">`) honoring optional `accept` (MIME list) and `maxSize` (bytes); `multifile` → `<Dropzone multiple>` honoring optional `accept`, `maxSize`, and `maxFiles`. Each field SHALL be wrapped in `<FormControl>` so blur / submit validation runs through vee-validate. The schema for each field SHALL be derived from the manifest using zod tokens: `z.string()` (with `.min(1)` for required, `.max(maxLength)` when declared) for `lookup` / `text` / `textarea`; `z.enum([...options[].value])` for `select`; `z.coerce.date()` with `.min()`/`.max()` refinements for `date`; `z.coerce.number()` with `.min()`/`.max()` for `number`; `z.boolean()` for `boolean`; `z.instanceof(File)` (with `.refine()` for `accept` / `maxSize` when declared, plus `.optional()` when not required) for `file`; `z.array(z.instanceof(File))` (with `.min(1)` when required, `.max(maxFiles)` when declared, plus per-file `.refine()` for `accept` / `maxSize`) for `multifile`. The manifest validator SHALL reject any `field.type` not in this whitelist of nine values. `<Switch>` is NOT a manifest dialog field type — `boolean` is rendered as `<Checkbox>` only.

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

#### Scenario: `file` field renders as a single-file Dropzone

- **GIVEN** a manifest field `{ type: 'file', label: 'Comprobante', accept: ['application/pdf', 'image/png'], maxSize: 5_000_000, required: true }`
- **WHEN** the dialog renders the field
- **THEN** the field is a `<Dropzone>` with `multiple={false}` and `maxFiles={1}`, the zod schema is `z.instanceof(File).refine(...)` enforcing the MIME list and the size cap, and a missing file produces a validation error rendered below the input in `text-danger`

#### Scenario: `multifile` field renders as a multi-file Dropzone honoring maxFiles

- **GIVEN** a manifest field `{ type: 'multifile', label: 'Adjuntos', accept: ['application/pdf'], maxSize: 10_000_000, maxFiles: 5 }`
- **WHEN** the dialog renders the field
- **THEN** the field is a `<Dropzone multiple>` with the declared limits, the zod schema is `z.array(z.instanceof(File)).max(5)` plus per-element refinements for MIME and size, and dropping a 6th file is rejected with a chip-level message before phase 1 of the upload runs

#### Scenario: Manifest validator rejects unknown field types

- **GIVEN** a manifest declares a field with `type: 'rich-text'`
- **WHEN** the manifest validator runs (dev mode)
- **THEN** the validator rejects the manifest with a clear message naming the offending type and listing the nine accepted values, and the dialog refuses to render that field

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

### Requirement: Dropzone component MUST consume useFileUpload and expose drag-drop affordances with client-side validation

The `<Dropzone>` component SHALL be the single canonical drop-zone primitive in the financial-core for `file` and `multifile` field types. It SHALL accept the same options surface as the `useFileUpload()` composable defined by `core-file-upload` (`presignEndpoint`, `confirmEndpoint`, optional `jobsEndpoint`, `mode`, `concurrency`, `accept`, `maxSize`, `maxFiles`, `multiple`) and SHALL invoke `useFileUpload(options).start(rawFiles)` when files are dropped onto the area or selected via the click-to-pick fallback. The component SHALL render five canonical visual states: `idle` (default border, dashed), `hover` (cursor over area, border highlights with `--ring`), `dragging` (file being dragged over area, fill highlights with subtle bg-2 tint), `rejected` (drag carrying a file that fails the `accept` filter, border + icon turn `--danger`), `disabled` (interaction blocked, opacity reduced). The component SHALL run client-side validation BEFORE invoking `start()`: any file failing `accept` / `maxSize` / `maxFiles` SHALL be rejected with a chip-level error rendered below the drop zone, and SHALL NOT consume a presigned URL. The component SHALL be accessible: it SHALL expose `role="button"` with `tabindex="0"`, an `aria-label` describing the drop intent (default `"Arrastrá archivos aquí o hacé click para seleccionar"`, overridable via prop), and SHALL open the native file picker on Enter or Space when focused. Hardcoded colors are forbidden — every visual state uses design tokens from `core-theming`.

#### Scenario: Drop on the zone triggers the upload composable's start action

- **GIVEN** a `<Dropzone :options="useFileUploadOptions">` mounted in a Create modal
- **WHEN** the user drags two files into the drop area and releases
- **THEN** the component calls `useFileUpload(useFileUploadOptions).start([file1, file2])`, the upload composable transitions both files through the `requesting → uploading` lifecycle, and the drop area returns to `idle`

#### Scenario: Click on the zone opens the native file picker

- **GIVEN** a `<Dropzone>` rendered with `accept=['image/*']`
- **WHEN** the user clicks anywhere inside the drop area (or focuses it and presses Enter or Space)
- **THEN** the native `<input type="file" accept="image/*">` is invoked, the user selects files, and on close the component calls `useFileUpload(options).start(selectedFiles)` exactly as the drag-drop path

#### Scenario: Files failing client-side validation never reach the upload composable

- **GIVEN** a `<Dropzone :accept="['application/pdf']" :maxSize="2_000_000">` and a user drops a 5 MB JPEG
- **WHEN** the component evaluates the drop
- **THEN** the file is rejected with a chip-level error below the drop zone (e.g. `Tipo no permitido` or `Excede 2 MB`), `useFileUpload().start()` is NOT called for that file, and no presigned URL is consumed

#### Scenario: Dragging a rejected file shows the rejected visual state

- **GIVEN** a `<Dropzone :accept="['application/pdf']">` and a user drags a `.docx` over the drop area
- **WHEN** the dragenter event fires and the dragged file's MIME does not match `accept`
- **THEN** the drop zone transitions to the `rejected` visual state (border and icon in `--danger`); on dragleave or drop the state returns to `idle`

#### Scenario: Dropzone is keyboard-accessible

- **GIVEN** a `<Dropzone>` rendered with the default ARIA configuration
- **WHEN** the user reaches the drop zone via Tab navigation and presses Space
- **THEN** the native file picker opens; on focus the drop zone shows a visible focus ring resolved from the `--ring` token

#### Scenario: Hardcoded colors in the Dropzone are a contract violation

- **GIVEN** a developer styles the `dragging` state with a hex value (e.g. `background-color: #f0f9ff`)
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every visual state SHALL resolve through `core-theming` tokens (`--bg-2`, `--border`, `--ring`, `--danger`, `--t-3`, etc.); raw color values are forbidden

### Requirement: FileUploadProgress component MUST render the per-file state machine of the upload composable

The `<FileUploadProgress>` component SHALL be a display-only primitive that renders a list of files driven by `useFileUpload(options).files`. For each file it SHALL show: the filename (truncated with ellipsis when overflowing), the formatted size (e.g. `2.5 MB`), the progress bar (rendered ONLY while the file's state is `uploading` or `requesting` — hidden in other states), a state badge resolved from the canonical state machine (`idle`, `requesting`, `uploading`, `completed`, `error`, `cancelled`), and the action buttons appropriate for the state (Retry on `error`, Cancel on `requesting | uploading`, no buttons on `completed | cancelled`). When `files.length === 0` the component SHALL render the shared `<EmptyState>` with a canonical empty message (default `"Aún no hay archivos en cola"`, overridable via prop). The component SHALL expose a slot `#actions="{ file }"` for app-specific row-level actions (e.g. rename inline, change file type) and a slot `#preview="{ file }"` for app-specific previews (thumbnail, icon). The component SHALL NOT mutate the upload state directly — every action button calls into the composable's actions (`retry(fileId)`, `cancel(fileId)`); buttons are pure dispatchers. Layout SHALL be a vertical list with each row using the design tokens from `core-theming` (no hardcoded spacing, no hardcoded colors).

#### Scenario: Progress bar appears only while files are uploading

- **GIVEN** a `<FileUploadProgress :files="useFileUpload().files">` with two files: f1 in `uploading` at 60% and f2 in `completed`
- **WHEN** the component renders
- **THEN** f1's row shows the progress bar at 60% with the `uploading` badge; f2's row shows no progress bar, only the `completed` badge

#### Scenario: Retry button appears on error and dispatches the composable's retry action

- **GIVEN** a file f3 in `error` state with `lastError.code = 'NETWORK'`
- **WHEN** the user clicks the Retry button on f3's row
- **THEN** the component calls `useFileUpload(options).retry(f3.id)` — it does NOT mutate `f3.state` directly; the composable owns the state transition

#### Scenario: Cancel button appears while uploading and dispatches the composable's cancel action

- **GIVEN** a file f4 in `uploading` at 30%
- **WHEN** the user clicks the Cancel button on f4's row
- **THEN** the component calls `useFileUpload(options).cancel(f4.id)`; once the composable transitions f4 to `cancelled` the row updates to remove the progress bar and Cancel button

#### Scenario: Empty state renders when files list is empty

- **GIVEN** a `<FileUploadProgress :files="[]">`
- **WHEN** the component renders
- **THEN** the shared `<EmptyState>` is rendered with the canonical empty message; no list rows are rendered

#### Scenario: App-specific preview slot extends the row without breaking the contract

- **GIVEN** a `<FileUploadProgress>` that an app uses with a `<template #preview="{ file }">` rendering an image thumbnail for image files
- **WHEN** the component renders an image file
- **THEN** the slot content sits in the row's preview region; the rest of the row (filename, size, progress bar, badge, action buttons) renders unchanged

