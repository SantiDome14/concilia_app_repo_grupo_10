# core-actions-manifest Specification

## Purpose
TBD - created by archiving change add-core-actions-manifest. Update Purpose after archive.
## Requirements
### Requirement: Manifest registry MUST be a single keyed map with last-writer-wins semantics

The manifest registry SHALL be implemented as a Pinia store `useManifestRegistryStore()` that owns a `Map<ManifestKey, Manifest>` where `ManifestKey` is the template-literal type `${app}.${module}` for module-scope manifests or `${app}.${module}.${recordType}` for record-scope manifests. Registration SHALL be last-writer-wins per key — when the same key is registered twice, the later registration replaces the earlier one and the dev-mode validator MUST emit `devWarn('MANIFEST', 'duplicate registration: ' + key)`. The store SHALL expose `register(key, manifest)`, `unregister(key)`, `get(key)`, and `list()` methods. The `register()` method MUST invoke `validateManifest(manifest, key)` synchronously before storing.

#### Scenario: Manifest is registered under the canonical key

- **GIVEN** a manifest authored as `{ app: "fin", module: "operaciones", record_type: "movimiento", ... }`
- **WHEN** the module setup calls `useManifestRegistryStore().register("fin.operaciones.movimiento", manifest)`
- **THEN** `useManifest("fin.operaciones.movimiento")` returns the manifest object and `useManifestRegistryStore().list()` includes the key

#### Scenario: Module-scope manifest uses two-segment key

- **GIVEN** a module-scope manifest with `record_type: null` and `scope: "module"`
- **WHEN** the module registers it
- **THEN** the registry key MUST be `"${app}.${module}"` (two segments), and `useManifest("framework.template")` returns the manifest

#### Scenario: Last-writer-wins on duplicate key

- **GIVEN** key `"fin.operaciones.movimiento"` is already registered with manifest A
- **WHEN** the same key is registered again with manifest B
- **THEN** `useManifest("fin.operaciones.movimiento")` returns manifest B AND a `devWarn('MANIFEST', 'duplicate registration: fin.operaciones.movimiento')` was emitted in dev mode

#### Scenario: Validation runs synchronously on registration

- **GIVEN** a malformed manifest (missing `app`)
- **WHEN** `register()` is called with `MANIFEST_DEV_MODE` true
- **THEN** `validateManifest()` runs synchronously and emits a warn; the manifest is still stored (warn-only in dev) AND in strict mode (used by tests) the call THROWS instead

---

### Requirement: Manifest top-level shape MUST conform to the canonical TS interface

Every manifest object SHALL conform to the `Manifest` interface declared in `src/types/manifest.ts`. Required fields: `app: string` and `module: string`. Optional fields: `record_type: string | null`, `scope: "record" | "module"` (defaults to `"record"` when `record_type` is set, `"module"` when null), `schema_version: string` (defaults to `"1.0"`), `required_imputations: string[]`, `required_by_type: Record<string, string[]>` (record_type → required_fields[], with `'*'` allowed as a wildcard key), `kanban_axes: KanbanAxis[]`, `actions: Action[]`, `module_ctas: ModuleCTA[]`. The `Manifest` type SHALL be JSON-strict-serializable (Decision 18 / Requirement 18 below).

#### Scenario: Required fields are enforced at validation

- **GIVEN** a manifest object missing `module`
- **WHEN** `validateManifest()` runs in dev mode
- **THEN** a warn `[MANIFEST] "<key>" · top-level field "module" is required` is emitted; in strict mode the call throws

#### Scenario: Default scope is derived from record_type presence

- **GIVEN** a manifest with `record_type: "movimiento"` and no `scope` declared
- **WHEN** the engine resolves the manifest
- **THEN** the effective scope MUST be `"record"`

#### Scenario: required_by_type wildcard fallback

- **GIVEN** `required_by_type: { "DEP": ["sociedad_id", "cliente_id"], "*": ["sociedad_id"] }` and a record whose type is `"OTH"` (not in the map)
- **WHEN** the engine resolves required fields for `record_type: "OTH"`
- **THEN** it MUST fall back to the `'*'` wildcard list (`["sociedad_id"]`); if neither the type nor `'*'` is set, it falls back to top-level `required_imputations`

#### Scenario: kanban_axes is optional and absent by default

- **GIVEN** a manifest with no `kanban_axes` declared
- **WHEN** a kanban view tries to resolve axes for it
- **THEN** the resolver returns an empty array and no error is raised; the kanban view renders an empty state

---

### Requirement: Action object MUST conform to the canonical TS interface

Every entry in `manifest.actions[]` SHALL conform to the `Action` interface. Required fields: `id: string` (convention `[app].[module].[type].[dim].[verb_subject]`), `dimension: Dimension`, `label: string`. Optional fields: `description`, `icon`, `danger: boolean`, `target_field: string | null`, `show_when: Predicate`, `enable_when: Predicate`, `disable_reason: string`, `disable_tag: string`, `prerequisites: Prerequisite[]`, `capabilities: Capabilities`, `dialog: Dialog`, `on_confirm: OnConfirm`, `batch: Batch`. `validateManifest()` MUST reject an action that is missing any of the three required fields.

#### Scenario: Action with all required fields validates

- **GIVEN** an action `{ id: "fin.op.mov.imp.assign_cliente", dimension: "imputacion", label: "Asignar Cliente" }`
- **WHEN** the manifest is registered in dev mode
- **THEN** no warn is emitted for this action

#### Scenario: Action missing dimension is rejected

- **GIVEN** an action with `id` and `label` but no `dimension`
- **WHEN** `validateManifest()` runs
- **THEN** `[MANIFEST] "<key>" · actions[<i>] missing required field "dimension"` is emitted as warn (dev) or thrown (strict)

#### Scenario: danger flag is preserved through resolution

- **GIVEN** an action with `danger: true`
- **WHEN** `resolveActions(record, manifestKey)` produces the `ResolvedAction`
- **THEN** the `action.danger` field is unchanged on the resolved entry; the `<ActionsMenu>` consumer renders it with the danger color treatment per `core-actions-menu`

---

### Requirement: Dimension enum MUST be exactly six canonical values

The `Dimension` type SHALL be the union `"imputacion" | "registro_contable" | "conciliacion" | "governance" | "documentacion" | "cierre"`. `validateManifest()` MUST reject any action or kanban-axis whose `dimension` field is outside this set. Adding a new dimension SHALL require a new OpenSpec change.

#### Scenario: All six canonical dimensions validate

- **GIVEN** a manifest with one action per dimension (six actions)
- **WHEN** `validateManifest()` runs
- **THEN** no dimension-related warn is emitted for any of the six actions

#### Scenario: Unknown dimension is rejected

- **GIVEN** an action with `dimension: "fiscalizacion"` (not in the canonical six)
- **WHEN** `validateManifest()` runs
- **THEN** `[MANIFEST] "<key>" · actions[<i>] dimension "fiscalizacion" is not one of the canonical six` is emitted; in strict mode the call throws

---

### Requirement: Predicate evaluator MUST implement the 8-form alphabet with multi-key AND-merge

The predicate evaluator `evalPredicate(p, record)` SHALL recognize exactly eight predicate forms: `record_type_in`, `record_type_not_in`, `field_is_null`, `field_is_not_null`, `field_equals: { field, value }`, `field_in: { field, values }`, `all: Predicate[]`, `any: Predicate[]`. When a predicate object carries multiple keys from the alphabet, the evaluator MUST AND-merge them. When `p` is `null` or `undefined`, the result MUST be `true`. When `p` is an array, the evaluator MUST treat it as implicit AND. Unknown keys (anything outside the alphabet) MUST emit `devWarn('PREDICATES', 'unknown predicate key: ' + key)` and resolve to `true` in dev/prod; in strict mode (tests) the evaluator MUST throw. Field paths MUST be resolved via the `resolveField()` dot-path helper.

#### Scenario: All eight forms evaluate correctly

- **GIVEN** a record `{ _record_type: "DEP", sociedad_id: "S-1", cliente_id: null }`
- **WHEN** `evalPredicate({ record_type_in: ["DEP","RET"] }, record)` runs
- **THEN** the result is `true`; AND `evalPredicate({ field_is_null: "cliente_id" }, record)` returns `true`; AND `evalPredicate({ field_equals: { field: "sociedad_id", value: "S-1" } }, record)` returns `true`

#### Scenario: Multi-key predicate is AND-merged

- **GIVEN** a record `{ _record_type: "DEP", cliente_id: null }`
- **WHEN** `evalPredicate({ record_type_in: ["DEP"], field_is_null: "cliente_id" }, record)` runs
- **THEN** the result is `true` (both keys satisfied); changing either key to a failing value flips the result to `false`

#### Scenario: Null and array predicates short-circuit

- **GIVEN** any record `r`
- **WHEN** `evalPredicate(null, r)` runs
- **THEN** the result is `true`; AND `evalPredicate([{ field_is_null: "x" }, { field_is_null: "y" }], { x: null, y: null })` returns `true` (array → implicit AND)

#### Scenario: Unknown key emits devWarn and resolves to true

- **GIVEN** a predicate `{ record_type_in: ["DEP"], not_a_real_key: "X" }`
- **WHEN** `evalPredicate()` runs in dev mode
- **THEN** `devWarn('PREDICATES', 'unknown predicate key: not_a_real_key')` is emitted; the evaluator ignores the unknown key and returns the AND of the remaining valid keys; in strict mode the evaluator throws `ManifestError`

---

### Requirement: Capabilities check MUST use `required_role_any_of` only; `required_role_all_of` MUST be rejected

The `Capabilities` interface SHALL declare exactly one operator: `required_role_any_of?: string[]`. The evaluator `evalCapabilities(caps)` SHALL read the current user's role via `useAuth().role`; when `caps` is `undefined` or `null`, the result MUST be `true`; when `required_role_any_of` is present, the result MUST be `caps.required_role_any_of.includes(useAuth().role)`. The legacy operator `required_role_all_of` SHALL be REMOVED from the schema; `validateManifest()` MUST reject any action whose `capabilities` object contains the key `required_role_all_of` with a clear migration message.

#### Scenario: Role-in-list passes

- **GIVEN** `useAuth().role === "ADMIN_FIN"` and an action with `capabilities: { required_role_any_of: ["OPS_OFFICER", "ADMIN_FIN"] }`
- **WHEN** `evalCapabilities(action.capabilities)` runs
- **THEN** the result is `true`

#### Scenario: Role-not-in-list fails

- **GIVEN** `useAuth().role === "VIEWER"` and an action with `capabilities: { required_role_any_of: ["ADMIN_FIN"] }`
- **WHEN** `evalCapabilities(action.capabilities)` runs
- **THEN** the result is `false`; the resolved action surfaces with `disabled_tag: "Permiso"` and `disabled_reason: "Tu rol actual no permite esta acción"`

#### Scenario: Capabilities omitted means allow

- **GIVEN** an action with no `capabilities` field
- **WHEN** `evalCapabilities(undefined)` runs
- **THEN** the result is `true`

#### Scenario: required_role_all_of is rejected at validation

- **GIVEN** an action with `capabilities: { required_role_all_of: ["A","B"] }`
- **WHEN** `validateManifest()` runs
- **THEN** a warn `[MANIFEST] "<key>" · actions[<i>].capabilities.required_role_all_of is REMOVED — use required_role_any_of` is emitted (dev) or thrown (strict); the engine treats the action as having no capabilities (allow) so the menu remains usable, but tests fail until the manifest is corrected

---

### Requirement: Action resolution MUST follow the four-gate sequential order with first-failure-wins metadata

The function `resolveActions(record, manifestKey)` SHALL produce a `ResolvedAction[]` by evaluating each `manifest.actions[i]` through four gates in this exact order: (1) `show_when` — if false, the action is dropped (not visible); (2) prerequisites — iterate `prerequisites[]` in declaration order, first failure wins; (3) `enable_when` — only checked if still enabled; (4) `capabilities` — only checked if still enabled. The first failing gate determines `disabled_reason` and `disabled_tag`. The capability-failure tag MUST be `"Permiso"` and MUST override any `action.disable_tag` declared on the action. The `ResolvedAction` shape SHALL be `{ action, visible, enabled, disabled_reason, disabled_tag, blocking_prereq }`.

#### Scenario: show_when false drops the action from the menu

- **GIVEN** an action with `show_when: { record_type_in: ["DEP"] }` and a record with `_record_type: "RET"`
- **WHEN** `resolveActions(record, manifestKey)` runs
- **THEN** the action is NOT included in the returned array (visible:false → filtered out)

#### Scenario: First prerequisite failure produces the visible reason

- **GIVEN** an action with `prerequisites: [{ field: "sociedad_id", message: "Asigná Estructura primero" }, { field: "cuenta_id", message: "Asigná Cuenta primero" }]` and a record with `sociedad_id: null, cuenta_id: null`
- **WHEN** `resolveActions(record, manifestKey)` runs
- **THEN** the resolved action has `enabled: false`, `disabled_reason: "Asigná Estructura primero"`, `disabled_tag: "Prerequisito"` (or the action's declared `disable_tag`), `blocking_prereq` references the first prerequisite

#### Scenario: enable_when failure follows action.disable_tag

- **GIVEN** prerequisites pass; `enable_when` is `{ field_is_null: "cliente_id" }`; record has `cliente_id: "C-9"`; action declares `disable_tag: "Estado"` and `disable_reason: "Cliente ya asignado"`
- **WHEN** `resolveActions(record, manifestKey)` runs
- **THEN** the resolved action has `enabled: false`, `disabled_reason: "Cliente ya asignado"`, `disabled_tag: "Estado"`, `blocking_prereq: null`

#### Scenario: Capability failure overrides declared disable_tag

- **GIVEN** an action whose prerequisites and `enable_when` pass, declared `disable_tag: "Estado"`, but the user's role does not match `required_role_any_of`
- **WHEN** `resolveActions(record, manifestKey)` runs
- **THEN** the resolved action has `enabled: false`, `disabled_reason: "Tu rol actual no permite esta acción"`, `disabled_tag: "Permiso"` (overriding the declared "Estado")

---

### Requirement: Default disable_tag values MUST follow the canonical taxonomy

When an action does not declare a custom `disable_tag`, the engine SHALL apply the following defaults: prerequisite blocking → `"Prerequisito"`; `enable_when` failure → `"Estado"`; capability failure → `"Permiso"` (always, even if `disable_tag` is declared); a manifest-declared deferred action (encoded as `enable_when: { field_equals: { field: "_never", value: true } }` plus `disable_tag: "V2"`) → `"V2"`. These four canonical tags MUST match the taxonomy specified by `core-actions-menu` so the visual contract stays consistent.

#### Scenario: Prerequisito tag is the default for prerequisite failures

- **GIVEN** an action with `prerequisites: [{ field: "sociedad_id", message: "..." }]` and no `disable_tag` declared; record has `sociedad_id: null`
- **WHEN** `resolveActions()` runs
- **THEN** the resolved action's `disabled_tag === "Prerequisito"`

#### Scenario: V2 tag flags deferred actions

- **GIVEN** an action with `enable_when: { field_equals: { field: "_never", value: true } }` and `disable_tag: "V2"` and `disable_reason: "Disponible en V2"`
- **WHEN** `resolveActions()` runs against any record
- **THEN** the action resolves with `enabled: false`, `disabled_tag: "V2"`, `disabled_reason: "Disponible en V2"` — this is the canonical pattern for "declared but not yet released" actions

#### Scenario: Permiso tag overrides custom disable_tag on capability failure

- **GIVEN** an action declares `disable_tag: "Estado"`; capabilities fail
- **WHEN** `resolveActions()` runs
- **THEN** `disabled_tag === "Permiso"` (the declared "Estado" is overridden)

---

### Requirement: A single shared `<ManifestDialog>` component MUST handle all four modes

The application SHALL mount exactly one `<ManifestDialog>` component instance per app (typically in `App.vue`) and re-use it across all four manifest modes: `single | composite | batch | cta`. State SHALL be owned by `useManifestDialog()`. The component SHALL render: a header with title + subtitle; a body with one or more field groups; a footer with Cancel + Confirm buttons. Default footer labels: `"Cancelar"` (left, ghost) and `"Confirmar"` (right, primary or danger if `action.danger === true`). Mode overrides: composite → confirm label is `"Aplicar"`; batch → confirm label is `action.batch.main_cta_label_template` with `{N}` substituted by the batch record count, or `"<actionLabel> a {N} registros"` if no template is declared; cta → confirm label is `cta.dialog.confirm_label || "Confirmar"`. Required-field validation MUST run on confirm — when any enabled field group has a `required: true` field with `null | ""` value, the engine MUST emit `toast.error("Falta completar campo obligatorio")` and abort the confirm without mutating, auditing, or closing the dialog.

#### Scenario: Single instance is reused across modes

- **GIVEN** the app has mounted exactly one `<ManifestDialog>` in `App.vue`
- **WHEN** the user opens a single-action dialog, then closes it, then triggers a kanban-composite drag
- **THEN** both flows reuse the SAME component instance (verified by Vue devtools showing one ManifestDialog node) — multi-instance is forbidden

#### Scenario: Footer labels switch by mode

- **GIVEN** the dialog opens in `mode: "composite"`
- **WHEN** the footer renders
- **THEN** the right button reads `"Aplicar"` (NOT `"Confirmar"`); when re-opened in `mode: "batch"` with `main_cta_label_template: "Imputar Cliente a {N} movimientos"` and 5 batch records, the right button reads `"Imputar Cliente a 5 movimientos"`

#### Scenario: Required-field validation aborts with toast

- **GIVEN** a single-action dialog with a required field whose form value is `""`
- **WHEN** the user clicks Confirm
- **THEN** `toast.error("Falta completar campo obligatorio")` fires; no mutation runs; no audit entry is appended; the dialog stays open

#### Scenario: Danger-flagged action uses danger Confirm variant

- **GIVEN** an action with `danger: true` opens in single mode
- **WHEN** the dialog mounts
- **THEN** the right button uses the danger variant per `core-modals` confirmation-dialog contract; the dialog also enforces no-backdrop-dismissal per that contract

---

### Requirement: Lookup field with `catalog_filter` MUST render an empty-state when the filter resolves to null

When a `Dialog` declares a `lookup` field with `catalog_filter`, the dropdown SHALL resolve the filter via `resolveCatalogFilter(field, dialogState)` from one of three sources: `from_record: "<dot-path>"` (reads `resolveField(record, path)`), `from_form: "<fieldId>"` (reads `formValues[fieldId]`), or `value: <literal>`. When the resolved filter value is `null | undefined | ""`, the dropdown MUST render an empty state with a hint message (default `"Asigná {field.label || field.id} primero"`, override via `catalog_filter.empty_state_message`) and MUST NOT show any catalog entries. The dropdown's search input MUST be disabled in this state. When the filter resolves to a non-empty value, the dropdown SHALL filter `resolveCatalog(field.catalog, filterValue)` and render the matching entries.

#### Scenario: Null filter renders empty state, not unfiltered list

- **GIVEN** a dialog with field `cuenta_id` of type `lookup`, `catalog: "fin.cuentas"`, `catalog_filter: { field: "sociedad_id", from_record: "sociedad_id" }` and a record where `sociedad_id` is `null`
- **WHEN** the user opens the lookup dropdown
- **THEN** the dropdown renders an empty state `"Asigná Sociedad primero"` (or the field-specific override); NO catalog entries are listed; the search input is disabled

#### Scenario: Filter is re-resolved on every open

- **GIVEN** the lookup is opened, closed, the form value of the antecedent changes from null → `"S-1"`, and the lookup is re-opened
- **WHEN** the dropdown re-mounts
- **THEN** `resolveCatalogFilter()` runs again; the dropdown now lists the catalog entries filtered by `sociedad_id === "S-1"`

#### Scenario: from_form source reads live form values

- **GIVEN** a composite dialog with two lookups: `sociedad_id` (independent) and `cuenta_id` (with `catalog_filter: { field: "sociedad_id", from_form: "sociedad_id" }`)
- **WHEN** the user picks a value in `sociedad_id` and then opens `cuenta_id`
- **THEN** the `cuenta_id` dropdown filters by the freshly-selected `sociedad_id` form value

---

### Requirement: on_confirm MUST execute update_fields, set_fields, recompute, audit, toast in canonical order

The `on_confirm` block SHALL declare any subset of: `update_fields: string[]` (dot-paths to write from `formValues`), `set_fields: Record<string, unknown>` (literal writes; the magic string `"$now"` MUST be replaced by `Date.now()` at write time), `recompute: string[]` (tokens resolved through the recompute registry; v1 supports only `"imputacion"`, unknown tokens emit `devWarn` and are skipped), `audit: boolean` (default `true`; when `false` no audit entry is appended), `toast: string` (toast title; subtitle is generated per mode). The execution order on confirm MUST be: validate required fields → write `update_fields` (only declared fields persist; non-declared form values are discarded) → write `set_fields` → run recompute → emit audit (if `audit !== false`) → fire toast → run `afterMutation` hook → close dialog. The toast subtitle SHALL be: single → `"<record.id> — <record.nombre || record.label || ''>"`; batch → `"<N> registros actualizados"` (or `"<N> de <M>"` on partial success per Decision 12); composite → `"<record.id> → <stateLabel>"`; cta with `creates_record_type` → the new record's id.

#### Scenario: update_fields writes only declared fields

- **GIVEN** an action with `dialog.fields: [{id: "cliente_id"}, {id: "imputation_note"}]` and `on_confirm.update_fields: ["cliente_id"]`; user fills both fields
- **WHEN** the confirm runs
- **THEN** the record's `cliente_id` is updated from `formValues.cliente_id`; `imputation_note` is DISCARDED (not declared in `update_fields`)

#### Scenario: $now magic substitutes Date.now() at write time

- **GIVEN** `on_confirm.set_fields: { "fin.intercompany": true, "fin.intercompany_at": "$now" }`
- **WHEN** the confirm runs at time T
- **THEN** `record.fin.intercompany === true` AND `record.fin.intercompany_at === T` (a numeric timestamp), not the string `"$now"`

#### Scenario: audit:false suppresses the audit emit

- **GIVEN** an action with `on_confirm.audit: false`
- **WHEN** the confirm runs and succeeds
- **THEN** all other steps execute (write fields, recompute, toast) but `useAuditLog().append()` is NOT called for this confirm; the audit log length is unchanged

#### Scenario: Unknown recompute token emits devWarn

- **GIVEN** `on_confirm.recompute: ["imputacion", "conciliacion"]`; only `imputacion` is registered
- **WHEN** the confirm runs in dev mode
- **THEN** `imputacion` runs successfully; `conciliacion` is skipped; `devWarn('MANIFEST', 'unknown recompute token: conciliacion')` is emitted; in strict mode the apply path throws

---

### Requirement: Kanban-axis composite dialog MUST collect all dimension-matching actions, dedup fields on render, and run ONE recompute + ONE audit at the end

When a kanban-axis drag-drop transition is configured `mode: "modal"` (per the kanban-axis declaration), the engine SHALL invoke `useManifestDialog().openComposite(manifestKey, recordRef, axisId)` which: (1) looks up `manifest.kanban_axes.find(x => x.axis_id === axisId)`; (2) runs `resolveActions(record, manifestKey)` and filters by `dimension === axis.dimension`; (3) renders one field group per applicable action (groups for disabled actions are visible but their fields render disabled, so prerequisites are visible to the user); (4) seeds `formValues` by walking each action's fields in declaration order, deduplicated by `field.id` (first-action wins on the value layer); (5) renders fields deduplicated by `field.id` ON RENDER (not just the value layer) — when the same `field.id` appears in multiple actions, only the FIRST occurrence is rendered; (6) re-evaluates prerequisites on every field change against a projected record (`{...record, ...formValues}`) and re-renders if any action's `enabled` flag flips; (7) on confirm, applies each enabled action's `update_fields` AND `set_fields` in order; (8) runs ONE recompute at the end; (9) emits ONE audit entry with `kind: "composite"`, `axis_id`, `child_action_ids: [string]` listing every applied action; (10) the card lands in whichever kanban column matches the recomputed state, NOT the drop target. Cards in axis terminal states (per `KanbanState.terminal === true` or matching `axis.drop_target_state`) MUST NOT be draggable.

#### Scenario: Composite collects all dimension-matching actions

- **GIVEN** a manifest with 5 actions (3 `dimension: "imputacion"`, 2 `dimension: "registro_contable"`) and a kanban axis `{ axis_id: "imputacion", dimension: "imputacion" }`
- **WHEN** the user drags a card across the imputacion axis triggering `openComposite(..., "imputacion")`
- **THEN** the composite dialog renders 3 groups (one per imputacion action); the registro_contable actions are NOT included

#### Scenario: Field IDs are deduped on render

- **GIVEN** two enabled actions in the composite each declare `dialog.fields: [{ id: "comprobante_concepto", ... }]`
- **WHEN** the composite renders
- **THEN** exactly ONE `<input>` for `comprobante_concepto` is rendered in the DOM (the first action's group owns it); the second action's group is rendered without that field; both actions still bind to `formValues.comprobante_concepto`

#### Scenario: ONE recompute + ONE audit on confirm

- **GIVEN** a composite with 3 enabled actions, each declaring `update_fields` and `recompute: ["imputacion"]`
- **WHEN** the user confirms
- **THEN** `update_fields` (and `set_fields`) of each action run in order; `computeImputation()` runs EXACTLY ONCE at the end (not three times); `useAuditLog().append()` is called EXACTLY ONCE with `{ kind: "composite", axis_id: "imputacion", child_action_ids: [a1, a2, a3], ... }`

#### Scenario: Terminal-state cards are not draggable

- **GIVEN** a kanban axis with `states: ["pendiente", "en_proceso", "imputado"]` where `imputado` has `terminal: true` (or matches `drop_target_state`)
- **WHEN** the kanban renders
- **THEN** cards in the `imputado` column have `draggable="false"` and a faded handle; native drag events do NOT fire on them; `_onKanbanDragStart` early-aborts if invoked

---

### Requirement: Batch promotion MUST render a header CTA when a manifest-declared action passes homogeneity, bounds, and capability checks

When a manifest declares an action with `batch: { batchable: true, promote_to_main_cta: true, ... }`, the engine SHALL render `<ManifestBatchCTA>` in the page-header actions slot, and SHALL surface the dynamic CTA only when ALL of the following are true: (a) `filtered.length` is in `[batch.min_records ?? 2, batch.max_records ?? 999999]`; (b) every record in `filtered` passes `evalPredicate(action.show_when, r)` (and `evalPredicate(action.enable_when, r)` if declared); (c) every entry in `batch.homogeneity_check` evaluates true. The canonical homogeneity-check tokens are `"all_records_pass_show_when"` (no-op, already covered) and `"all_records_have_field_null:<dot-path>"` (every record's value at the dot-path MUST be `== null`). Unknown tokens MUST emit `devWarn('MANIFEST', 'unknown homogeneity_check token: ' + token)` and be treated as `false` (the CTA is not promoted). Capability check (`evalCapabilities(action.capabilities)`) is applied once for the user. When multiple actions are batch-promotable and homogeneous, only the FIRST in declaration order is rendered (multi-batch dropdown is a future enhancement). The CTA label MUST be `action.batch.main_cta_label_template.replace("{N}", filtered.length)` or default `"<action.label> a <N> registros"`.

#### Scenario: CTA appears only when bounds AND homogeneity AND capabilities pass

- **GIVEN** an action with `batch: { batchable: true, promote_to_main_cta: true, min_records: 2, max_records: 100, homogeneity_check: ["all_records_have_field_null:cliente_id"], main_cta_label_template: "Imputar Cliente a {N} movimientos" }` and a filtered list of 5 records, each with `cliente_id: null`, and the user's role is in `capabilities.required_role_any_of`
- **WHEN** the page-header renders `<ManifestBatchCTA>`
- **THEN** a button is rendered with label `"Imputar Cliente a 5 movimientos"`; clicking opens `<ManifestDialog>` in `mode: "batch"` with the 5 records seeded

#### Scenario: Bounds violation hides the CTA

- **GIVEN** the same action and a filtered list of 1 record (below `min_records: 2`)
- **WHEN** `<ManifestBatchCTA>` renders
- **THEN** no button is rendered (the slot is empty); no devWarn is emitted (bounds violations are silent)

#### Scenario: Unknown homogeneity token emits devWarn and hides the CTA

- **GIVEN** `homogeneity_check: ["all_records_have_invented_token"]`
- **WHEN** `<ManifestBatchCTA>` renders in dev mode
- **THEN** `devWarn('MANIFEST', 'unknown homogeneity_check token: all_records_have_invented_token')` is emitted; the CTA is NOT rendered (the unknown token is treated as `false`); strict mode throws

#### Scenario: Batch confirm partial-success uses N-of-M toast

- **GIVEN** the user clicks the batch CTA with 5 selected records, but at confirm time 1 record is unresolvable via `resolveRecord()`
- **WHEN** the apply path runs
- **THEN** `devWarn('MANIFEST', 'batch dropped 1 unresolvable record refs of 5')` is emitted; the mutation runs for 4 records; `toast.success` fires with subtitle `"4 de 5 registros actualizados"`; the audit entry's `record_ids` array contains exactly the 4 mutated record ids; if all 5 had been unresolvable, `toast.error("No se encontró ningún registro para procesar")` would fire instead and no mutation/audit would run

---

### Requirement: Module CTAs MUST render in the page-header actions slot, NEVER in the per-row menu

Manifests SHALL declare module-level CTAs in `manifest.module_ctas: ModuleCTA[]`. The `<ManifestModuleCTAs>` component renders these in the page-header actions slot (per the `core-layout` page-header contract — capped at 3 primary CTAs; additional CTAs collapse to overflow). Module CTAs MUST NEVER appear in the per-row `⋯` menu (`core-actions-menu`'s scope is per-row only). The same engine handles capabilities + dialog as for regular actions: `evalCapabilities()` filters which CTAs render; clicking opens `<ManifestDialog>` in `mode: "cta"`. When the CTA declares `creates_record_type: string`, the apply path MUST look up a registered creator via `getCreator(manifestKey)` and call `creator(cta, formValues)` — when no creator is registered, the engine MUST throw `ManifestError("no creator registered for " + manifestKey)` which surfaces as `toast.error("No se puede crear el registro: factory no registrada")` and keeps the dialog open. The audit entry shape MUST be `{ kind: "cta", record_id: <new id or null>, created_record_type: string | null, is_module_cta: true, ... }`.

#### Scenario: CTAs render in header, not in row menu

- **GIVEN** a manifest with `module_ctas: [{ id: "...", label: "Crear Registro", ... }]` and a row in the table
- **WHEN** the page renders
- **THEN** "Crear Registro" appears as a button in the page-header actions slot; the per-row `⋯` menu does NOT include "Crear Registro" as an item

#### Scenario: Capabilities filter the CTA list

- **GIVEN** two CTAs: `Crear` (caps: `["ADMIN"]`) and `Exportar` (no caps); user role is `OPS_OFFICER`
- **WHEN** `<ManifestModuleCTAs>` renders
- **THEN** only `Exportar` is rendered; `Crear` is omitted (not just disabled)

#### Scenario: creates_record_type without registered creator throws and toasts

- **GIVEN** a CTA with `creates_record_type: "movimiento_manual"`; no creator registered for the manifest key
- **WHEN** the user fills the dialog and clicks Confirm
- **THEN** the apply path throws `ManifestError`; `toast.error("No se puede crear el registro: factory no registrada")` fires; the dialog stays open; no audit entry; no record created

#### Scenario: Successful CTA emits cta-kind audit entry

- **GIVEN** a CTA with `creates_record_type: "movimiento_manual"`; creator registered; user fills + confirms
- **WHEN** the apply path runs
- **THEN** the creator returns `{ id: "M-9001", ... }`; `useAuditLog().append({ kind: "cta", action_id: cta.id, record_id: "M-9001", created_record_type: "movimiento_manual", is_module_cta: true, ... })` is called once

---

### Requirement: validateManifest MUST run at registration in dev/strict, warn-only in dev, throw in strict

The function `validateManifest(manifest, key)` SHALL be invoked synchronously by `useManifestRegistryStore().register()`. In dev mode (`import.meta.env.DEV`), violations MUST emit `devWarn('MANIFEST', '"' + key + '" · ' + msg)` and the manifest is still stored (warn-only). In production, validation is no-op for performance. In strict mode (`ManifestRegistry.strict = true`, set by `tests/setup.ts`), violations MUST THROW `ManifestError`. The validator MUST check at minimum: top-level `app` and `module` are non-empty strings; each action's `id`, `label`, `dimension` are present; `dimension` is one of the canonical six; each `dialog.fields[j]`'s `id`, `label`, `type` are present; `type` is one of the seven canonical (`lookup, text, textarea, select, date, number, boolean`); when `type === "lookup"`, `catalog` is present; when `type === "select"`, `options` is a non-empty array; `capabilities.required_role_all_of` is rejected with the migration message; each `module_ctas[i]`'s `id` and `label` are present; the manifest is JSON-strict-serializable (Requirement 18). The validator MUST NOT throw in dev — only warn — to preserve UX during development.

#### Scenario: Invalid manifest in dev mode warns but stores

- **GIVEN** a manifest with an action missing `id`
- **WHEN** `register()` is called in dev mode
- **THEN** `[MANIFEST] "<key>" · actions[<i>] missing required field "id"` is emitted via `devWarn`; the manifest IS stored; subsequent `useManifest(key)` returns it

#### Scenario: Same invalid manifest in strict mode throws

- **GIVEN** the same manifest as above; `ManifestRegistry.strict = true`
- **WHEN** `register()` is called
- **THEN** `register()` throws `ManifestError("[MANIFEST] '<key>' · actions[<i>] missing required field 'id'")`; the manifest is NOT stored

#### Scenario: Lookup field without catalog is flagged

- **GIVEN** a dialog field `{ id: "x", label: "X", type: "lookup" }` (no `catalog`)
- **WHEN** `validateManifest()` runs
- **THEN** `[MANIFEST] "<key>" · actions[<i>].dialog.fields[<j>] type "lookup" requires a "catalog" field` is reported

#### Scenario: Select field without options is flagged

- **GIVEN** a dialog field of type `select` with no `options[]` (or empty array)
- **WHEN** `validateManifest()` runs
- **THEN** `[MANIFEST] "<key>" · actions[<i>].dialog.fields[<j>] type "select" requires a non-empty options[] array` is reported

---

### Requirement: Audit log MUST emit one of four discriminated entry shapes via `useAuditLog().append()`

Every successful confirm (when `on_confirm.audit !== false`) SHALL append exactly one entry to `useAuditLog()`. The entry SHALL match the discriminated `AuditEntry` union: `{ kind: "single", action_id, manifest_key, record_id, user_id, timestamp, changes }` for single-action confirms; `{ kind: "batch", action_id, manifest_key, record_ids: string[], user_id, timestamp, changes }` for batch-promotion confirms; `{ kind: "composite", action_id: "composite:<axis_id>", child_action_ids: string[], axis_id, manifest_key, record_id, user_id, timestamp, changes }` for kanban-axis composites; `{ kind: "cta", action_id, manifest_key, record_id: string | null, created_record_type: string | null, is_module_cta: true, user_id, timestamp, changes }` for module CTAs. The `useAuditLog()` composable wraps a Pinia store; v1 persists in-memory (the equivalent of the prototype's `window.MF_AUDIT_LOG`); a future change MAY swap the store to flush to a backend POST endpoint per `core-api-layer`.

#### Scenario: Single-action confirm appends a single-kind entry

- **GIVEN** a successful single-action confirm; user `{ id: "U-1", role: "ADMIN" }`; record `{ id: "R-9" }`; action `id: "fin.op.mov.imp.assign_cliente"`
- **WHEN** the apply path completes
- **THEN** `useAuditLog().log` contains exactly one new entry with `{ kind: "single", action_id: "fin.op.mov.imp.assign_cliente", manifest_key: "fin.operaciones.movimiento", record_id: "R-9", user_id: "U-1", timestamp: <number>, changes: { cliente_id: "C-1", ... } }`

#### Scenario: Batch confirm appends a single batch-kind entry covering all records

- **GIVEN** a batch confirm of 4 records
- **WHEN** the apply path completes
- **THEN** ONE entry with `kind: "batch"` and `record_ids: ["R-1", "R-2", "R-3", "R-4"]` is appended (NOT four separate single entries)

#### Scenario: Composite confirm uses synthetic action_id

- **GIVEN** a kanban-axis composite confirm of 3 enabled actions on the `imputacion` axis
- **WHEN** the apply path completes
- **THEN** ONE entry with `kind: "composite"`, `action_id: "composite:imputacion"`, `child_action_ids: [<a1>, <a2>, <a3>]`, `axis_id: "imputacion"` is appended

#### Scenario: audit:false produces no entry

- **GIVEN** an action with `on_confirm.audit: false`; the confirm completes successfully
- **WHEN** the apply path runs
- **THEN** `useAuditLog().log.length` is unchanged (no entry appended)

---

### Requirement: Items NOT in the manifest MUST follow the explicit exclusion list

The manifest engine SHALL govern only contextual record-level operations (per-row menu items, kanban-axis composite transitions, batch CTAs, module CTAs). The following MUST NOT be declared in any manifest (they are owned by other capabilities): "Ver detalle" / "Open record" (governed by `core-actions-menu` row-click + `core-modals` Detail modal), free-form Edit (governed by `core-modals` Edit modal + `core-forms`), filters / search / pagination (governed by `core-data-tables`), sub-tabs / view toggles such as Lista / Kanban / Calendario / Pizarra (governed by `core-layout` and `core-data-tables`), bulk-action selection bars above tables (NOT covered — batch in this capability is page-header only via `promote_to_main_cta`). `validateManifest()` SHALL warn if an action's `id` matches the patterns `*.ver_detalle`, `*.open_record`, `*.edit_freeform` (a heuristic; the exclusion is normative regardless of action id).

#### Scenario: Ver detalle is not declared as a manifest action

- **GIVEN** a developer is authoring a manifest and considers adding `{ id: "fin.op.mov.gov.ver_detalle", ... }`
- **WHEN** the spec review happens
- **THEN** the action is REJECTED — "Ver detalle" is the row-click handler, not a manifest action; it lives in the page template per `core-actions-menu`

#### Scenario: Filters and search do not flow through manifest predicates

- **GIVEN** the table has a search box and a status filter
- **WHEN** the user types or selects
- **THEN** the table state updates via `core-data-tables`'s `useTable()` composable; the manifest's predicates are NOT involved (predicates gate ACTION availability, not record VISIBILITY)

#### Scenario: Bulk-action bar above tables is out of scope

- **GIVEN** a future requirement for "select multiple rows + bulk action bar above the table"
- **WHEN** the design phase begins
- **THEN** the team MUST open a separate OpenSpec change (e.g. `add-core-bulk-actions`); the existing manifest engine's `batch.promote_to_main_cta` continues to live in the page-header slot only

---

### Requirement: Manifest objects MUST be JSON-strict serializable (round-trip lossless)

Every `Manifest` object SHALL pass the round-trip equality check `deepEqual(m, JSON.parse(JSON.stringify(m)))`. This implies: no functions, no `undefined` values (use `null` instead), no class instances, no `Symbol` keys, no circular references, no `Date` objects (use ISO strings or numeric timestamps). `validateManifest()` MUST include this round-trip check as its final step. The check guarantees that manifests can be (a) serialized to logs, (b) shipped to a backend if needed, (c) compared by structural equality, and (d) authored as JSON files (in addition to TS files).

#### Scenario: Round-trip serialization preserves the manifest

- **GIVEN** any valid manifest `m`
- **WHEN** `validateManifest()` runs the final round-trip check
- **THEN** `JSON.parse(JSON.stringify(m))` deep-equals `m`; the check passes silently

#### Scenario: Function value in manifest is rejected

- **GIVEN** a manifest where some field is mistakenly assigned a function (e.g. `on_confirm: { custom_handler: () => {...} }`)
- **WHEN** `validateManifest()` runs
- **THEN** the round-trip check fails; `[MANIFEST] "<key>" · manifest is not JSON-strict serializable (function value at on_confirm.custom_handler)` is reported as warn (dev) or thrown (strict)

#### Scenario: undefined values are flagged; null is the canonical empty

- **GIVEN** a manifest with `record_type: undefined`
- **WHEN** `validateManifest()` runs
- **THEN** the round-trip check normalizes `undefined` away (since `JSON.stringify` drops undefined keys); the validator MUST detect the divergence and report `[MANIFEST] "<key>" · undefined value at record_type — use null instead`; the author rewrites it as `record_type: null`

#### Scenario: Date instances are rejected; numeric timestamps are accepted

- **GIVEN** a manifest with a Date instance somewhere in `set_fields`
- **WHEN** `validateManifest()` runs
- **THEN** the round-trip detects the Date-to-string mutation and reports the divergence; the canonical replacement is the magic string `"$now"` (substituted at apply time per Requirement 11) or a numeric timestamp literal

### Requirement: Manifest engine MUST support runtime field schemas via the `useDynamicForm` composable

The manifest engine's type registry (the `Map<ManifestFieldType, Component>` resolved by `core-actions-manifest` at module setup) SHALL be a single source consumed by both build-time manifests AND runtime schemas. Runtime consumers reach the registry exclusively via the `useDynamicForm(schema, options)` composable defined in `core-dynamic-forms`. The engine SHALL NOT expose a separate runtime-only registry — there is one registry, populated by app bootstrap, used in both modes. When `useDynamicForm` resolves a field type, it MUST consult the same registry that build-time manifest validation consults.

#### Scenario: Build-time manifests and runtime schemas share the same type registry

- **GIVEN** an app registers a custom type `account-tag` with `useManifestTypeRegistry().register('account-tag', AccountTagInput)` at bootstrap
- **WHEN** a build-time manifest field with `type: 'account-tag'` AND a runtime `FieldConfig` with `type: 'account-tag'` are processed
- **THEN** both resolve to the same `AccountTagInput` component — there is no mode-specific lookup; one registry serves both

#### Scenario: Adding a parallel runtime-only registry is forbidden

- **GIVEN** a developer attempts to instantiate a `runtimeRegistry` separate from the build-time registry
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the engine has exactly one registry; runtime forms consume it via `useDynamicForm`, build-time manifests consume it via the manifest validator

