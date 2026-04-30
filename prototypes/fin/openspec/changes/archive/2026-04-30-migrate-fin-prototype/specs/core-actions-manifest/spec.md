## MODIFIED Requirements

### Requirement: Lookup field with `catalog_filter` MUST render an empty-state when the filter resolves to null

When a `Dialog` declares a `lookup` field, the dropdown SHALL resolve the filter via `resolveCatalogFilter(field, dialogState)`. The resolution returns one of three outcomes:

1. **No `catalog_filter` declared on the field** — `resolveCatalogFilter` SHALL return the sentinel `UNFILTERED_CATALOG_FILTER` (exported from `@/lib/manifest`). The dropdown SHALL forward this sentinel to `resolveCatalog(catalog, UNFILTERED_CATALOG_FILTER)`, which invokes the registered resolver with NO filter argument and returns the full catalog. The search input remains enabled and the empty-state hint is NOT rendered.

2. **`catalog_filter` declared, antecedent value missing** (`null | undefined | ""`) — `resolveCatalogFilter` SHALL return `null`. The dropdown MUST render an empty state with a hint message (default `"Asigná {field.label || field.id} primero"`, override via `catalog_filter.empty_state_message`) and MUST NOT show any catalog entries. The dropdown's search input MUST be disabled in this state.

3. **`catalog_filter` declared, antecedent resolved to a non-empty value** — `resolveCatalogFilter` SHALL return the resolved filter value (one of `from_record: "<dot-path>"` reads `resolveField(record, path)`, `from_form: "<fieldId>"` reads `formValues[fieldId]`, or `value: <literal>`). The dropdown SHALL filter `resolveCatalog(field.catalog, filterValue)` and render the matching entries.

The sentinel is distinct from `null` so the engine can disambiguate "no filter declared" (full catalog) from "filter declared but unresolved" (empty state) — collapsing both to `null` is forbidden.

#### Scenario: Field without catalog_filter returns the full catalog

- **GIVEN** a dialog with field `sociedad_id` of type `lookup`, `catalog: "framework.sociedades"`, no `catalog_filter` declared
- **WHEN** the user opens the dropdown
- **THEN** `resolveCatalogFilter` returns `UNFILTERED_CATALOG_FILTER` AND `resolveCatalog` invokes the registered resolver with no filter argument AND every catalog entry the resolver returns is listed AND the search input is enabled

#### Scenario: Null filter renders empty state, not unfiltered list

- **GIVEN** a dialog with field `cuenta_id` of type `lookup`, `catalog: "ops.catalogo_cuentas"`, `catalog_filter: { field: "sociedad_id", from_record: "fin.sociedad_id" }` and a record where `fin.sociedad_id` is `null`
- **WHEN** the user opens the lookup dropdown
- **THEN** the dropdown renders an empty state `"Asigná Sociedad primero"` (or the field-specific override); NO catalog entries are listed; the search input is disabled

#### Scenario: Filter is re-resolved on every open

- **GIVEN** the lookup is opened, closed, the form value of the antecedent changes from null → `"cp"`, and the lookup is re-opened
- **WHEN** the dropdown re-mounts
- **THEN** `resolveCatalogFilter()` runs again; the dropdown now lists the catalog entries filtered by `sociedad_id === "cp"`

#### Scenario: from_form source reads live form values

- **GIVEN** a composite dialog with two lookups: `fin.sociedad_id` (no filter — sentinel) and `_estructura` (with `catalog_filter: { field: "sociedad_id", from_form: "fin.sociedad_id" }`)
- **WHEN** the user picks a value in `fin.sociedad_id` and then opens `_estructura`
- **THEN** the `_estructura` dropdown filters by the freshly-selected `fin.sociedad_id` form value

## ADDED Requirements

### Requirement: Lookup fields MUST eagerly resolve the label of a pre-populated value

When a `lookup` field is rendered with a non-empty `modelValue` (the record arrives with the field already populated, e.g. a disabled action group on an already-imputed `movimiento`), the field SHALL display the catalog-resolved **label** for that value, not the raw id. The resolution SHALL run on mount and re-run whenever `modelValue` changes — without requiring the user to open the dropdown.

The implementation MUST: (1) call `resolveCatalog(field.catalog, UNFILTERED_CATALOG_FILTER)` once per unique value (cached after the first resolution); (2) iterate the returned entries and pick the one whose `value` equals the field's current `modelValue`; (3) display that entry's `label`. When the catalog cannot resolve the value (resolver missing, value not in catalog, async resolver hasn't returned yet), the field MAY temporarily fall back to the raw id; once the catalog resolves, the display MUST update.

#### Scenario: Pre-populated lookup renders the resolved label, not the raw id

- **GIVEN** a composite dialog where the action `Asignar Banco y Cuenta` is disabled (the record already has `fin.cuenta_id`) and its fields render with the record's existing values (`fin.sociedad_id = "cp"`, `fin.cuenta_id = "cu-cp-allaria-1"`)
- **WHEN** the dialog mounts
- **THEN** the Sociedad lookup trigger displays `"Circuit Pay SA"` (not `"cp"`) AND the Cuenta lookup trigger displays `"ALLARIA · ARS · Cta 303682"` (not `"cu-cp-allaria-1"`)

#### Scenario: modelValue change triggers re-resolution

- **GIVEN** a lookup field bound to `formValues['fin.cuenta_id']` whose value changes from `"cu-cp-allaria-1"` to `"cu-cp-coinag-1"` mid-dialog
- **WHEN** the new value lands
- **THEN** the field re-resolves the label from the catalog AND the trigger displays the new entry's label without further user interaction
