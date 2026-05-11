> Jira REQ: — (template-level capability creation; the parent migration epic owns the Jira link)
> Module: core-template (foundation, NEW capability)

# Add core-actions-manifest — declarative actions engine for record-level operations

## Why

Today every Ardua core module that exposes per-row operations (process, confirm, generate, assign, conciliar, intercompany, anular, exportar) re-implements the same five problems by hand:

1. **Which actions appear on which row** — currently a hand-coded `v-if` per page, gated by a hand-rolled `useCapabilities()` call plus an ad-hoc `record.estado === 'PEND'` check. Two pages in the same app will diverge in their predicate semantics within a sprint.
2. **Why an action is disabled** — the `core-actions-menu` capability already specifies the *visual* contract for disabled items (Permiso / Estado / V2 tags + tooltip), but the *evaluation* of those rules is not contractualized anywhere. Each page invents its own resolver.
3. **What dialog opens when the action fires** — every module hand-builds the same modal pattern (record summary + 1-3 fields + Cancelar / Confirmar). Field types, default labels, required-field validation, and dependent-lookup filtering are re-implemented per page.
4. **What happens after confirm** — `update_fields`, derived-state recompute (kanban-axis status), audit log emit, and post-mutation re-render are wired imperatively in each page's submit handler. Drift is inevitable.
5. **The kanban-axis composite dialog and the batch-promotion CTA** — two genuinely complex flows that the prototype solves declaratively (one composite per axis transition, one batch CTA per filtered list) and that no existing capability covers at all. Without a contract, every app reinvents both.

The prototype under `prototypes/_core-template-frontend/manifests/` and `prototypes/fin/manifests/` already demonstrates a working declarative engine that solves all five problems end-to-end. It defines: a strict-JSON manifest schema; an 8-form predicate evaluator; a capabilities check; a sequential resolver that produces a `ResolvedAction { visible, enabled, reason, tag, blocking_prereq }`; one shared modal in the DOM reused by single / composite / batch / cta modes; an `on_confirm` executor with `update_fields`, `set_fields`, extensible `recompute`, `audit`, and toast; a kanban-axis composite that collects all dimension-matching actions, dedups fields, and runs ONE recompute and ONE audit at the end; a batch-promotion CTA that pre-validates homogeneity across N records; and module-level CTAs in the page-header actions slot. The runtime contract is exhaustively documented in `prototypes/_core-template-frontend/manifests/_schema.md`, `prototypes/_core-template-frontend/manifests/_schema.json`, the canonical example `ejemplo.modulo-a.actions.js`, the FIN acid-test `fin.operaciones.movimientos.actions.js` (9 actions, 1 kanban axis, batch, capabilities, `set_fields` with `$now`), and the engine-level reverse-engineering survey at `/tmp/survey-manifests-engine.md` (A–K runtime spec, 13 public functions, 16 ambiguities).

The existing `core-actions-menu` capability is a UI-only contract: it governs how the per-row `⋯` menu *looks* and *behaves visually* (portal teleport, smart positioning, scroll/resize/outside-click dismissal, the two-rule enablement pattern, the Permiso / Estado / V2 tag taxonomy, the native-tooltip reason). It does NOT specify how actions are declared, evaluated, dialog'd, or persisted. The new `core-actions-manifest` capability is the *engine* that drives those menus (and kanban transitions, batch CTAs, module CTAs) from a single declarative source. **`core-actions-manifest` complements `core-actions-menu` — it does not replace it.** The menu component remains the rendering surface; the manifest is the data feed.

Without this capability, FIN, CLP, COM, OPS, TRD, and LEX will each re-implement the same engine — six times, each diverging in subtle ways, each impossible to audit centrally. With it, every action across every module becomes a JSON-strict declaration that flows through one resolver, one renderer, one applier, and one audit log.

## What Changes

- **Create the `core-actions-manifest` capability.** New spec at `openspec/specs/core-actions-manifest/spec.md`. 18 requirements covering: registry contract, manifest top-level shape, action object shape, six canonical dimensions, predicate evaluator, capabilities check, action resolution, default disable tags, ManifestDialog component, lookup with catalog filter, on_confirm semantics, kanban-axis composite dialog, batch promotion, module CTAs, manifest validation, audit log shape, items NOT in the manifest (explicit exclusion list), and JSON-strict serializability.
- **Define the TS-strict surface.** All public artifacts named in the spec: `ManifestRegistry`, `Manifest`, `Action`, `Dialog`, `Predicate`, `Capabilities`, `OnConfirm`, `KanbanAxis`, `Batch`, `ModuleCTA`, `ResolvedAction`, `validateManifest()`, `evalPredicate()`, `evalCapabilities()`, `resolveActions()`, `useManifest()`, `useManifestModule()`, `useManifestDialog()`, `useAuditLog()`, `<ManifestDialog>`, `<ManifestField>`, `<ManifestModuleCTAs>`, `<ManifestBatchCTA>`, plus the `dotPath` helpers `resolveField()` / `setField()` and the recompute registry entry `computeImputation()`.
- **Resolve 12 of 16 prototype ambiguities** (K.1–K.12 from the engine survey) inside the new spec. K.13–K.16 are flagged in `design.md` for follow-up changes.
- **Integration with sibling capabilities — read-only references** (no edits to existing specs in this change):
  - `core-actions-menu` — the manifest engine's `resolveActions()` produces the `ResolvedAction[]` consumed by the existing portal menu component. The two-rule enablement pattern in `core-actions-menu` is now *implemented* by `evalCapabilities()` + `evalPredicate()` rather than re-implemented per page.
  - `core-data-tables` — the `<ActionsCell>` slot of every table calls `resolveActions(record, manifestKey)` to produce the menu items. The kanban view subscribes to `kanban_axes[]` to wire drag-drop transitions to `MFopenComposite()`.
  - `core-modals` — the shared `<ManifestDialog>` component composes from the existing `<Modal>` primitive and respects the destructive-action contract for actions flagged `danger: true`. The single-modal-instance rule (one `<ManifestDialog>` per app, mode-switched) is the manifest-engine equivalent of the prototype's single `#ov-mf` modal.
  - `core-forms` — `<ManifestField>` reuses the `core-forms` field primitives (Input, Textarea, Select, DatePicker, Checkbox, Lookup) plus `vee-validate` + `zod`. Required-field validation surfaces a toast as specified in this capability; per-field inline errors follow the existing `core-forms` contract.
  - `core-auth` — `evalCapabilities()` reads from `useAuth().role` (the canonical entry point per `core-auth`). The prototype's `window.CURRENT_USER` is replaced by the Pinia auth store; the spec encodes this explicitly.
  - `core-error-handling` — toast emission on confirm, on missing-required-field, and on missing-batch-records uses `vue-sonner` per the existing toast contract. Audit-log entries are NOT toasts — they are persistent-log entries handled by `useAuditLog()`.
- **Implementation tasks are aspirational.** This change creates the *contract*. Implementation may be done within this same change or split into a follow-up change — `tasks.md` makes the optionality explicit. The spec is the deliverable; the code is the consequence.

## Capabilities

### Affected Capabilities

None modified by this change. `core-actions-menu`, `core-data-tables`, `core-modals`, `core-forms`, `core-auth`, and `core-error-handling` are *referenced* in the new spec but their existing requirements are not edited.

### New Capabilities

- `core-actions-manifest` — the declarative actions engine. 18 requirements; ≥2 scenarios each.

### Non-capability artifacts

- TypeScript types under `src/types/manifest.ts` (named in spec).
- Pinia store at `src/stores/manifest.ts` (the `ManifestRegistry`).
- Composables at `src/composables/useManifest.ts`, `src/composables/useManifestModule.ts`, `src/composables/useManifestDialog.ts`, `src/composables/useAuditLog.ts`.
- Vue components at `src/components/manifest/ManifestDialog.vue`, `src/components/manifest/ManifestField.vue`, `src/components/manifest/ManifestModuleCTAs.vue`, `src/components/manifest/ManifestBatchCTA.vue`.

These are implementation locations referenced by the spec; the spec itself remains the source of truth.

## Notes

- The migration adapter for legacy prototype manifests (a thin shim that loads `window.ACTION_MANIFEST` JSON and registers each entry in the Pinia registry) is documented as a tradeoff in `design.md` and listed as an optional task.
- `set_fields` (used heavily by FIN but undocumented in `_schema.md` / `_schema.json`) is ratified into the schema by this change — see `design.md` Decision 7.
- `required_role_all_of` is REMOVED from the schema (the prototype implementation is broken for single-string roles) — see `design.md` Decision 4.
- The `recompute` operator becomes an extensible registry; v1 ships only `imputacion` — adding `conciliacion` or any future token requires a new OpenSpec change. See `design.md` Decision 8.
