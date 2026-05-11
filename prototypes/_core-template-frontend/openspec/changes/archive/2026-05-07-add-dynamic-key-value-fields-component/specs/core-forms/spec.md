## ADDED Requirements

### Requirement: DynamicKeyValueFields component MUST manage a reorderable list of key-value rows with per-row validation

The `<DynamicKeyValueFields>` component SHALL be the single canonical primitive for capturing a variable-length list of key-value pairs. It SHALL render rows vertically; each row SHALL contain (in order, left-to-right): a drag handle, an input for `key`, an input for `value`, and a remove button. Below the last row, an "Agregar fila" button SHALL append a new empty row. The component SHALL accept props `minRows: number` (default `0`), `maxRows?: number` (no cap by default), `keyType: 'text' | 'select'` (default `'text'`), `keyOptions?: Option[]` (when `keyType === 'select'`), `valueType: ManifestFieldType` (default `'text'`, accepts any other manifest field type for value rendering), and `duplicateKeyPolicy: 'warn' | 'reject' | 'allow'` (default `'warn'`). The `v-model` SHALL emit `Array<{ key: string; value: unknown; index: number }>` where `index` is the visual order (reassigned consistently after every reorder). Reorder SHALL be implemented via `vueuse/useDraggable` (no external drag-drop library beyond vueuse). Per-row validation SHALL run via vee-validate with a nested scope per row. Hardcoded colors / paddings are forbidden — every visual resolves through `core-theming`.

#### Scenario: Add row appends an empty row at the end

- **GIVEN** a `<DynamicKeyValueFields v-model="attributes">` with two rows already populated
- **WHEN** the user clicks the "Agregar fila" button
- **THEN** a third empty row appends below; `attributes.value` becomes `[...existing, { key: '', value: '', index: 2 }]`; focus moves automatically to the new row's `key` input

#### Scenario: Remove row deletes and reindexes remaining rows

- **GIVEN** a list with 4 rows at indices 0, 1, 2, 3 and the user clicks remove on the row at index 1
- **WHEN** the component processes the removal
- **THEN** the row is removed from the array; the remaining rows reindex to 0, 1, 2 (preserving order); the `v-model` emits the updated array

#### Scenario: Drag reorder reassigns indices

- **GIVEN** a list with 3 rows where the user drags row 2 above row 0
- **WHEN** the drop event fires
- **THEN** the array reorders accordingly; `index` is reassigned `0, 1, 2` to the new positions; the `v-model` emits the updated array

#### Scenario: Duplicate key with `warn` policy shows a warning chip

- **GIVEN** a list configured with `:duplicateKeyPolicy="'warn'"` and the user enters the same `key` value in two rows
- **WHEN** the component evaluates the keys
- **THEN** the duplicate rows render a warning chip next to the duplicate `key` inputs (not an error — submission is allowed); the form remains submittable

#### Scenario: Duplicate key with `reject` policy blocks submission

- **GIVEN** a list configured with `:duplicateKeyPolicy="'reject'"` and the user enters duplicate keys
- **WHEN** vee-validate runs
- **THEN** the validation reports an error on the duplicate rows; the form's submit button is disabled until the duplicates are resolved

#### Scenario: minRows enforces lower bound

- **GIVEN** a list configured with `:minRows="2"` and the user attempts to remove the second row when only two rows exist
- **WHEN** the component processes the removal
- **THEN** the removal is blocked; the remove button on those rows is `disabled` while the count equals `minRows`

#### Scenario: Custom valueType renders alternative field

- **GIVEN** a list configured with `:valueType="'money'"` and `currency: 'ARS'`
- **WHEN** the component renders rows
- **THEN** each row's `value` slot renders `<MoneyInput currency="ARS">` instead of a plain text input; the `v-model` value for that row's `value` is a number per `core-forms` MoneyInput contract

### Requirement: Manifest dialog `key-value-array` field type MUST render as DynamicKeyValueFields with the declared key/value schemas

The action manifest engine SHALL accept `'key-value-array'` as a valid field type. A field declared `{ type: 'key-value-array', label, keyType?, keyOptions?, valueType?, minRows?, maxRows?, duplicateKeyPolicy?, ... }` SHALL render as `<DynamicKeyValueFields>` with the declared props wired through. The zod schema for `key-value-array` SHALL be `z.array(z.object({ key: <inferred from keyType>, value: <inferred from valueType>, index: z.number().int().nonnegative() }))` with `.min(minRows)` and `.max(maxRows)` when declared. The manifest validator SHALL reject any `key-value-array` declaration where `keyType === 'select'` is missing `keyOptions`.

#### Scenario: `key-value-array` field renders with the declared schemas

- **GIVEN** a manifest field `{ type: 'key-value-array', label: 'Atributos', keyType: 'text', valueType: 'text', minRows: 1, maxRows: 10 }`
- **WHEN** the dialog renders the field
- **THEN** the field is `<DynamicKeyValueFields :keyType="'text'" :valueType="'text'" :minRows="1" :maxRows="10">`, the zod schema enforces `1 ≤ rows ≤ 10`, both `key` and `value` are `z.string().min(1)` per row

#### Scenario: `keyType: 'select'` without keyOptions is rejected

- **GIVEN** a manifest field `{ type: 'key-value-array', label: 'Atributos', keyType: 'select' }` (missing `keyOptions`)
- **WHEN** the manifest validator runs (dev mode)
- **THEN** the validator rejects the manifest with a clear message — `keyOptions` is required when `keyType === 'select'`
