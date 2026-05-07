## MODIFIED Requirements

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

## ADDED Requirements

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
