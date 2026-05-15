# Tasks — add-core-actions-manifest

This change creates the `core-actions-manifest` capability — the declarative actions engine. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/core-actions-manifest/spec.md`. Implementation tasks (sections 2–6) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-core-actions-manifest` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 7–8) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/core-actions-manifest/spec.md` — ADDED Requirements: 18 requirements, ≥2 scenarios each (51 scenarios total). Cover: registry contract, manifest top-level shape, action shape, six dimensions, predicate evaluator, capabilities, action resolution, default disable_tag, ManifestDialog, lookup with catalog_filter, on_confirm, kanban-axis composite, batch promotion, module CTAs, validateManifest, audit log shape, items NOT in manifest, JSON-strict serializability.
- [ ] Run `openspec validate add-core-actions-manifest --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validates.

## 2. TypeScript implementation (aspirational — may follow in a separate change)

### 2.1 Types

- [ ] `src/types/manifest.ts` — `Manifest`, `Action`, `Dialog`, `DialogField` (discriminated union over the 7 field types), `Predicate` (the 8 forms), `Capabilities`, `OnConfirm`, `KanbanAxis`, `KanbanState`, `Batch`, `ModuleCTA`, `Prerequisite`, `ResolvedAction`, `Dimension` (the 6-element union), `RecomputeToken`, `AuditEntry` (discriminated union: single / batch / composite / cta), `ManifestKey` (template literal type `${app}.${module}` | `${app}.${module}.${recordType}`).
- [ ] `src/types/manifest.ts` — `ManifestError extends Error` for hard-error paths (missing creator, invalid recompute token in strict, etc.).

### 2.2 Registry & validation

- [ ] `src/stores/manifest.ts` — Pinia store `useManifestRegistryStore()`. Owns `Map<string, Manifest>`. Methods: `register(key, manifest)`, `unregister(key)`, `get(key)`, `list()`. `register()` calls `validateManifest()` in dev / strict modes.
- [ ] `src/lib/manifest/validateManifest.ts` — runtime validator. Checks: top-level required fields, action shape, dialog field shape (per-type required attrs), capabilities shape (rejects `required_role_all_of` if present — REMOVED operator), predicate-key alphabet, JSON-strict serializability via `JSON.parse(JSON.stringify(m))` round-trip equality. Modes: dev (warn), prod (no-op), strict (throw).

### 2.3 Predicate & capabilities evaluators

- [ ] `src/lib/manifest/evalPredicate.ts` — implements the 8-form alphabet + multi-key AND-merge. Unknown keys emit `devWarn('PREDICATES', ...)` and resolve to `true`.
- [ ] `src/lib/manifest/evalCapabilities.ts` — reads `useAuth().role`, evaluates `required_role_any_of`. Returns `true` when `capabilities` is omitted.

### 2.4 Action resolver

- [ ] `src/lib/manifest/resolveActions.ts` — implements the 4-gate sequential evaluator (show_when → prerequisites → enable_when → capabilities). Returns `ResolvedAction[]`. Memoized per `(record, manifestKey)` tuple via Vue `computed()` at the call site.

### 2.5 Dialog state composable

- [ ] `src/composables/useManifestDialog.ts` — owns `ref<DialogState | null>`. Exposes `openDialog(actionId, recordRef)`, `openComposite(manifestKey, recordRef, axisId)`, `openBatch(actionId, manifestKey, recordRefs[])`, `openModuleCTA(ctaId)`, `closeDialog()`, `confirmDialog()`, `setFieldValue(id, value)`. Internal: `seedSingleValues()`, `seedCompositeValues()` (dedup by field.id, first wins), `seedCTAValues()`, `reevalCompositePrereqs()` (re-projects record + reruns resolveActions).

### 2.6 Recompute registry

- [ ] `src/lib/manifest/recompute.ts` — `Map<string, RecomputeFn>`. v1 entry: `imputacion → computeImputation`. Function `registerRecompute(token, fn)` exposes the registry; default registration of `imputacion` happens in plugin setup.
- [ ] `src/lib/manifest/computeImputation.ts` — implements the imputacion-state computation per Decision 8.

### 2.7 Apply path

- [ ] `src/lib/manifest/applyAction.ts` — single + batch confirm dispatcher. Resolves records, walks `update_fields` then `set_fields` (with `$now` substitution), runs recompute, emits audit, fires toast, calls `afterMutation` hook.
- [ ] `src/lib/manifest/applyComposite.ts` — composite confirm. Iterates enabled actions; per action: writes `update_fields`, then `set_fields`. ONE recompute at end. ONE audit entry with `kind: "composite"` and `child_action_ids[]`.
- [ ] `src/lib/manifest/applyCTA.ts` — CTA confirm. If `creates_record_type` set, looks up creator; HARD ERROR if missing (Decision 15).

### 2.8 Audit log

- [ ] `src/composables/useAuditLog.ts` — wraps Pinia store `useAuditLogStore()`. `append(entry: AuditEntry)`. v1 persists in-memory; backend POST is a follow-up.
- [ ] `src/stores/auditLog.ts` — Pinia store. Append-only array; flush hook for backend integration.

### 2.9 Helpers

- [ ] `src/lib/manifest/dotPath.ts` — `resolveField(obj, path)` and `setField(obj, path, value)`. Supports nested paths (`fin.cuenta_id` → `obj.fin.cuenta_id`, creating intermediates).
- [ ] `src/lib/manifest/catalog.ts` — `resolveCatalog(catalogId, filter)`. `resolveCatalogFilter(field, dialog)` — resolves `from_record | from_form | value` with the empty-state behaviour from Decision 11.

### 2.10 Record / creator / mutation registries

- [ ] `src/lib/manifest/recordResolvers.ts` — `registerRecordResolver(key, fn)` + `resolveRecord(ref)` walks all resolvers until one returns truthy.
- [ ] `src/lib/manifest/creators.ts` — `registerCreator(manifestKey, fn)` + `getCreator(manifestKey)`.
- [ ] `src/lib/manifest/afterMutation.ts` — `registerAfterMutation(manifestKey, fn)` + `runAfterMutation(manifestKey)`.

## 3. Vue components (aspirational)

- [ ] `src/components/manifest/ManifestDialog.vue` — single shared instance per app. Mode discriminator (`single | composite | batch | cta`). Uses `<Modal>` primitive from `core-modals`. Footer button labels per Decision 6. Required-field validation with toast.
- [ ] `src/components/manifest/ManifestField.vue` — per-field renderer. Props: `field: DialogField`, `value: unknown`, `disabled: boolean`. Switch on `field.type`: text → `<Input>`, textarea → `<Textarea>`, number → numeric input with min/max enforcement, date → `<DatePicker>`, select → `<Select>` reading `f.options[]`, lookup → `<Lookup>` with `catalog_filter` resolution, boolean → `<Checkbox>`.
- [ ] `src/components/manifest/ManifestModuleCTAs.vue` — header-slot component. Props: `manifestKey: string`. Reads `manifest.module_ctas`, filters by capabilities, renders one button per CTA. Capped at 3 CTAs per `core-layout` page-header rule (any beyond 3 collapse into overflow menu).
- [ ] `src/components/manifest/ManifestBatchCTA.vue` — header-slot component. Props: `manifestKey: string`, `filteredRecords: Record[]`. Reads first batchable+promoted action; checks `[min, max]` bounds + `homogeneity_check` tokens; renders the dynamic `{N}`-substituted button when all checks pass. Single-CTA only (first match wins; multi-batch dropdown is a future enhancement).

## 4. Composables

- [ ] `src/composables/useManifest.ts` — typed wrapper around `useManifestRegistryStore().get(key)`. Returns the manifest or null.
- [ ] `src/composables/useManifestModule.ts` — module-scoped helpers. Given a `manifestKey`, returns `{ resolveActions, openDialog, openComposite, openBatch, openModuleCTA, registerCreator, registerAfterMutation, registerRecordResolver }` bound to that key.
- [ ] `src/composables/useManifestDialog.ts` — see 2.5.
- [ ] `src/composables/useAuditLog.ts` — see 2.8.

## 5. Tests

### 5.1 Unit

- [ ] `src/lib/manifest/evalPredicate.spec.ts` — every form ×2 cases (true/false). Multi-key AND. `null|undefined` → true. Array → AND. Unknown key → devWarn + true (and throw under strict).
- [ ] `src/lib/manifest/evalCapabilities.spec.ts` — null/missing capabilities → true. `required_role_any_of` matches/no-match. `required_role_all_of` rejected by validator.
- [ ] `src/lib/manifest/resolveActions.spec.ts` — gate ordering: show_when fail → not visible. prereq fail → disabled+Prerequisito. enable_when fail → disabled+Estado (or custom disable_tag). caps fail → disabled+Permiso (overrides custom disable_tag). All-pass → enabled.
- [ ] `src/lib/manifest/validateManifest.spec.ts` — accepts canonical example + FIN acid-test. Rejects: missing app/module, invalid dimension, lookup without catalog, select without options, presence of `required_role_all_of`, non-JSON-serializable values.
- [ ] `src/lib/manifest/computeImputation.spec.ts` — 0 filled → states[0]; partial → states[1]; all → states[2]; empty required → states[2]; record_type lookup falls back to `*` then to top-level `required_imputations`.
- [ ] `src/lib/manifest/applyAction.spec.ts` — single: writes update_fields, applies set_fields with `$now`, recomputes imputacion, emits single audit, fires toast. `audit:false` suppresses audit. Batch: partial drops emit devWarn; zero records → toast.error + abort.
- [ ] `src/lib/manifest/applyComposite.spec.ts` — multi-action composite applies each enabled action's update_fields + set_fields, runs ONE recompute at end, emits ONE audit with composite kind + child_action_ids.
- [ ] `src/lib/manifest/applyCTA.spec.ts` — `creates_record_type` without registered creator → throws ManifestError → toast.error → dialog stays open. With creator → creates record + audit.
- [ ] `src/lib/manifest/dotPath.spec.ts` — `resolveField`/`setField` with 1-level, 2-level, missing paths, intermediates auto-created.

### 5.2 Integration

- [ ] `tests/integration/manifest-prototype-parity.spec.ts` — load the canonical example manifest (`prototypes/_core-template-frontend/manifests/ejemplo.modulo-a.actions.js`) and the FIN acid-test (`prototypes/fin/manifests/fin.operaciones.movimientos.actions.js`); register them in the new Pinia store; for a sample record set, verify `resolveActions()` produces the same enable/visible/reason/tag tuple as the prototype HTML engine. This test guards parity during migration.
- [ ] `tests/integration/manifest-dialog.spec.ts` — mount `<ManifestDialog>`, drive each mode through open → fill → confirm; assert audit log entries, formValues writes, recompute outcomes.

## 6. Documentation

- [ ] `src/components/manifest/README.md` — short README pointing to the spec and the canonical example. Implementation deviations (if any) MUST be reflected back in the spec via a follow-up change.
- [ ] Update `CLAUDE.md` and `AGENTS.md` (in the same commit) to add the manifest engine rules to the architecture section: "Per-row actions are declared via `core-actions-manifest`; hand-coded action lists are forbidden once the engine ships." Both files MUST stay byte-identical (existing mirror rule).
- [ ] Add an Ardua skill `.claude/skills/ardua-add-manifest-action/SKILL.md` (mirrored to `.cursor/skills/`) describing the deterministic steps to add a new action to an existing manifest.

## 7. Validation gates (mandatory)

- [ ] `openspec validate add-core-actions-manifest --strict` passes.
- [ ] `openspec validate --all --strict` passes (existing 10 capabilities + new core-actions-manifest = 11).
- [ ] If implementation tasks (2–6) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-core-actions-manifest` is opened with sections 2–6 as its scope.

## 8. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-core-actions-manifest`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/core-actions-manifest/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-actions-manifest/`.
- [ ] Final commit (when implementation is included or after the follow-up implementation merges) with conventional message: `specs: add core-actions-manifest — declarative actions engine for record-level operations`.
