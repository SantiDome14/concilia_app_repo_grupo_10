# Design — add-core-actions-manifest

## Context

Across every Ardua core app, the contextual operations a user performs on a record (process, confirm, generate, conciliate, intercompany, anular, exportar) follow the same five-step pattern: (1) decide which actions exist for this record, (2) decide which of them are enabled and why, (3) open a dialog to collect any required inputs, (4) write the inputs back to the record + recompute derived state + emit an audit entry, (5) re-render the surface that hosts the action (table, kanban, dashboard).

The prototype under `prototypes/_core-template/manifests/` and the FIN acid-test `prototypes/fin/manifests/fin.operaciones.movimientos.actions.js` already implement this declaratively. A single JSON-strict manifest per `app.module[.recordType]` declares actions, predicates (8 forms), capabilities, dialogs (7 field types), `on_confirm` (update/set/recompute/audit/toast), kanban-axis composite assembly, batch-promotion CTAs, and module-level CTAs. One engine evaluates them all. One modal renders all four modes. One audit log records every confirm.

The reverse-engineered runtime contract is in `/tmp/survey-manifests-engine.md` (sections A–K) and is exhaustive: 13 public engine functions, 8 predicate forms, 7 field types, 6 dimensions, 4 audit shapes, 16 ambiguities. This design document is the bridge from that prototype to the Vue 3 + TS-strict implementation. Where the prototype is loose, we tighten. Where the prototype is broken (`required_role_all_of`, ignored `audit:false`, silent missing-record drops), we fix. Where the prototype is undocumented (`set_fields`), we ratify.

The new capability `core-actions-manifest` complements — does not replace — `core-actions-menu`. The existing UI capability governs how the per-row menu *looks*. The new engine capability governs how the menu's content is *declared, evaluated, and applied*. Both must coexist for the contract to be complete.

This design captures the non-obvious decisions and their tradeoffs.

---

## Decision 1 — Strict-JSON manifest contract; single registry keyed by `app.module[.recordType]`

### The question

Could we let manifests carry expressions, comments, computed fields, or imported helpers — i.e. allow each module to ship its own DSL within JS?

### The decision

No. Every manifest is a strict-JSON object. The literal between `=` and `;` (in the prototype's `.js` files) MUST be parseable by `JSON.parse` after trimming. In the Vue port, manifests are TS objects typed by `Manifest` and registered into a single `Map<string, Manifest>` keyed by `"<app>.<module>"` or `"<app>.<module>.<recordType>"`. The Pinia store `useManifestRegistryStore()` owns the Map; `useManifest(key)` reads from it.

### Rationale

- **Static analysis.** Strict JSON is round-trippable, diff-able, and serializable to a backend if we ever need server-side rendering of menus. Allowing expressions kills all three.
- **AI-agent authoring.** Backend-first developers (and AI coding assistants) author manifests as data, not code. JSON is what they emit cleanly.
- **Validation.** `validateManifest()` can run a deterministic schema check at registration; expressions would force a sandboxed eval.
- **Last-writer-wins per key.** No merge semantics, no inheritance — one key, one manifest. If two scripts register the same key, the later one wins. Validator emits `devWarn` on collision in dev mode.

### Tradeoff accepted

Modules cannot share predicate fragments via a JS import. If two manifests need the same `show_when`, each duplicates it. Acceptable: predicates are short, and the duplication keeps the registry inspectable.

---

## Decision 2 — TS-strict types for every manifest construct

### The question

Should manifests be typed `as const` from a literal, or constrained by a `Manifest` interface, or validated only at runtime?

### The decision

All three. The `Manifest`, `Action`, `Dialog`, `Predicate`, `Capabilities`, `OnConfirm`, `KanbanAxis`, `Batch`, `ModuleCTA`, and `ResolvedAction` types live in `src/types/manifest.ts`. The Pinia store accepts `Manifest` only. `validateManifest()` runs a runtime check at registration in dev mode (warn-only) and throws in strict mode (used by the test suite). Authors get compile-time errors in TS files and runtime warnings when manifests come from JSON loaded at boot.

### Rationale

Compile-time enforcement catches 80% of authoring mistakes; runtime validation catches the remaining JSON-loaded-at-boot scenarios. Strict mode in tests guarantees CI fails fast on invalid manifests.

### Tradeoff accepted

Two type definitions exist (TS interface + JSON schema). They must stay in sync; the validator includes a JSON-strict serializability check (Decision 18) that fails if the runtime shape diverges from the JSON-parseable shape.

---

## Decision 3 — Predicate evaluator: 8 forms, multi-key AND-merge, null is true, unknown keys → devWarn (resolves K.1)

### The question

The prototype evaluator silently AND-merges multiple keys on the same predicate object (lines 2981–2993 of the prototype). The `_schema.md` doc implies one operator per object. Which is canonical?

### The decision

**Multi-key AND-merge is canonical.** A predicate object with `{record_type_in: [...], field_is_null: "X"}` evaluates as `record_type_in(...) AND field_is_null(...)`. This is observable in code and useful in practice (it expresses common conjunctions without nesting an `all`).

The 8 forms supported (the canonical alphabet):

```ts
type Predicate =
  | { record_type_in: string[] }
  | { record_type_not_in: string[] }
  | { field_is_null: string }
  | { field_is_not_null: string }
  | { field_equals: { field: string; value: unknown } }
  | { field_in: { field: string; values: unknown[] } }
  | { all: Predicate[] }
  | { any: Predicate[] }
  // Multi-key combinations of the above are AND-merged.
```

Resolution rules:

- `evalPredicate(null | undefined, _) → true` (an absent predicate is "always true").
- `evalPredicate(Array, record)` is treated as implicit AND (`arr.every(p => evalPredicate(p, record))`).
- Multiple keys on the **same** object are AND-composed.
- Unknown keys (anything not in the 8-form alphabet) emit `devWarn('PREDICATES', 'unknown predicate key: ' + k)` and are treated as `true` (do-not-block) so the menu remains usable. Strict mode in tests THROWS.

### Tradeoff accepted

Authors who expect "one operator per object" will be surprised when multi-key works. We document this explicitly in the spec and in `validateManifest()` warnings. Net win: the conjunction shorthand is too useful to remove.

---

## Decision 4 — Capabilities: `required_role_any_of` is canonical; `required_role_all_of` is REMOVED (resolves K.2)

### The question

The prototype declares `required_role_all_of: string[]` but evaluates it as `arr.every(r => r === userRole)`. Since `userRole` is a single string, the only way the check passes is if every element of the list equals the same string — i.e. the list contains exactly one value the user has. This is broken-by-design for multi-role checks.

### The decision

`required_role_all_of` is REMOVED from the schema. The canonical operator is `required_role_any_of: string[]`. Evaluation: `userRole IN list`. If the field is omitted, capabilities pass.

### Rationale

`auth.role` is a single string in the current `core-auth` contract. A future change MAY redesign `useAuth()` to expose `roles: string[]` (multi-role users); at that point a separate OpenSpec change introduces `required_roles_all_of` as a real all-of operator and updates `evalCapabilities()`. Until then, removing the broken operator is cleaner than carrying it.

### Tradeoff accepted

If any prototype manifest used `required_role_all_of` the migration adapter must rewrite it to `required_role_any_of` (manual review). The FIN acid-test does not use `required_role_all_of` — only `required_role_any_of` — so this is a no-op for the immediate migration.

---

## Decision 5 — Action resolution order: show_when → prerequisites → enable_when → capabilities; first failure wins

### The question

In what order do the four gates (visibility, prerequisites, enable_when, capabilities) evaluate? Do they short-circuit?

### The decision

Sequential, with first failure winning the disabled-state metadata. The full algorithm in `resolveActions(record, manifestKey)`:

```ts
for each action in manifest.actions:
  // 1. Visibility
  if (action.show_when && !evalPredicate(action.show_when, record)) {
    skip;  // dropped from menu entirely (visible:false)
    continue;
  }

  let resolved: ResolvedAction = { action, visible: true, enabled: true,
                                    disabled_reason: null, disabled_tag: null,
                                    blocking_prereq: null };

  // 2. Prerequisites (in declaration order; first failure wins)
  for each pr in (action.prerequisites ?? []) {
    const v = resolveField(record, pr.field);
    const ok = (pr.value == null) ? (v != null) : (v === pr.value);
    if (!ok) {
      resolved.enabled = false;
      resolved.disabled_reason = pr.message;
      resolved.disabled_tag = action.disable_tag ?? "Prerequisito";
      resolved.blocking_prereq = pr;
      break;
    }
  }

  // 3. enable_when (only if still enabled)
  if (resolved.enabled && action.enable_when && !evalPredicate(action.enable_when, record)) {
    resolved.enabled = false;
    resolved.disabled_reason = action.disable_reason ?? "Acción no disponible para este registro";
    resolved.disabled_tag = action.disable_tag ?? "Estado";
  }

  // 4. Capabilities (only if still enabled)
  if (resolved.enabled && !evalCapabilities(action.capabilities)) {
    resolved.enabled = false;
    resolved.disabled_reason = "Tu rol actual no permite esta acción";
    resolved.disabled_tag = "Permiso";  // overrides any action.disable_tag
  }

  emit resolved;
```

`ResolvedAction` shape:

```ts
interface ResolvedAction {
  action: Action;
  visible: boolean;
  enabled: boolean;
  disabled_reason: string | null;
  disabled_tag: string | null;
  blocking_prereq: Prerequisite | null;
}
```

### Rationale

Order matters because the *reason* a user sees should be the most actionable one. "Asigná Estructura primero" (a prerequisite) is more actionable than "Acción no disponible para este registro" (a state check). Capabilities go last and override any `disable_tag` because a permission failure is non-recoverable from the user's seat — the chip MUST say "Permiso".

### Tradeoff accepted

`enable_when` cannot trigger before a prerequisite even if it would produce a better message. Authors who want a state-check message before a prereq message should encode the state-check as a prerequisite with the desired message.

---

## Decision 6 — Single shared `<ManifestDialog>` instance with mode discriminator

### The question

Should each manifest mode (single action, kanban composite, batch, module CTA) render a different Vue component, or one shared component with a `mode` prop?

### The decision

One component: `<ManifestDialog>` with `mode: "single" | "composite" | "batch" | "cta"`. Identical to the prototype's single `#ov-mf` overlay reused across all four flows. The mode discriminates:

- Footer label — `"Confirmar"` (default), `"Aplicar"` (composite), `"<actionLabel> a {N} registros"` (batch — `{N}` substituted), or the CTA's `confirm_label`.
- Body composition — single renders one group; composite renders one group per applicable action; batch renders one group with a record-count summary; cta renders the CTA's dialog with no record reference.
- Confirm dispatcher — `applyAction` / `applyComposite` / `applyAction(isBatch=true)` / `applyCTA`.

State lives in `useManifestDialog()` — a Pinia store (or a single composable owning a `ref<DialogState | null>`). Open functions: `openDialog(actionId, recordRef)`, `openComposite(manifestKey, recordRef, axisId)`, `openBatch(actionId, manifestKey, recordRefs[])`, `openModuleCTA(ctaId)`.

### Rationale

The prototype proves that one DOM modal is enough; multiplying components multiplies divergence risk. The four modes share 80% of the rendering pipeline (header, body, footer, ESC-to-close, required-field validation, lookup-portal cleanup). Discriminating on a `mode` prop keeps that shared pipeline in one place.

### Tradeoff accepted

`<ManifestDialog>` is the largest component in the system. We mitigate by extracting `<ManifestField>` (per-field renderer), `useManifestDialog()` (state machine), and `applyAction()` / `applyComposite()` / `applyCTA()` (confirm dispatchers) into separate units. The component itself stays thin.

---

## Decision 7 — `set_fields` is ratified into the schema; `'$now'` magic preserved; composite mode applies `set_fields` (resolves K.5 and K.9)

### The question

The prototype's FIN manifest uses `on_confirm.set_fields: { "fin.intercompany": true, "fin.intercompany_at": "$now" }` heavily. Neither `_schema.md` nor `_schema.json` document it. The composite-mode applier (`MFapplyComposite`) silently drops it. Should we ratify or remove?

### The decision

**Ratify.** `set_fields: Record<string, unknown>` is a first-class part of `OnConfirm`. Values are written verbatim to the record via `setField()` (dot-path supported). The magic string `"$now"` is replaced by `Date.now()` at write time. Every other value is literal.

**Composite mode applies `set_fields` per enabled action**, fixing the prototype omission (K.9). Order: for each enabled action in declaration order — `update_fields`, then `set_fields`. ONE recompute at the end.

### Rationale

`set_fields` expresses "side-effect derived state" (timestamps, intercompany flags, CONC markers) that does not come from the form. Forcing authors to encode these as form fields with `default` values pollutes the dialog. The use case is legitimate; ratifying is cheaper than removing.

### Tradeoff accepted

Authors gain a second write path. Validation now includes "at least one of `update_fields` or `set_fields` MUST be declared if `recompute` or `audit` is set" — otherwise the action is a no-op confirm. We catch the no-op case at validation time.

---

## Decision 8 — `recompute` is an extensible registry; v1 ships only `imputacion` (resolves K.6)

### The question

The prototype hard-codes `if (recompute.includes('imputacion')) MFrecomputeRecord(...)`. Other dimensions (e.g. `conciliacion`) might want their own derived-state recomputes. How should the engine grow?

### The decision

Recompute tokens resolve through a registry: `Map<string, RecomputeFn>`. v1 registers exactly one entry: `imputacion → computeImputation(record, manifestKey)`. The registry is exposed via `registerRecompute(token, fn)` for module-specific extensions, but the contract is: **adding a new token requires a new OpenSpec change**, because each token defines a piece of derived-state semantics that affects kanban columns and audit logs.

`computeImputation()` walks `required_by_type[t] || required_by_type['*'] || required_imputations`, counts non-empty values (`v != null && v !== '' && v !== false`), and returns the matching state from `kanban_axes[dim=imputacion].states[]`:

- `states[0]` (`pendiente`) — 0 filled, OR `required` is empty (no requirements ⇒ skip-to-imputado short-circuits to `states[2]`).
- `states[1]` (`en_proceso`) — partial.
- `states[2]` (`imputado`) — all filled.

Result is written to `record[axis_id]` (where `axis_id` matches the kanban-axis declaration, e.g. `imputacion`, `fin.imput`).

### Rationale

Hard-coding works for v1 (the only existing recompute is imputation). Going registry-shaped costs nothing now and lets us add `conciliacion` (or `cierre`, `governance`) in a future capability extension without re-touching `applyAction()` / `applyComposite()` / `applyCTA()`.

### Tradeoff accepted

Authors who write `recompute: ["conciliacion"]` today get a `devWarn` ("unknown recompute token; v1 supports only imputacion") and the recompute is skipped. The action confirm still succeeds. Strict mode throws.

---

## Decision 9 — `audit: false` actually suppresses the audit emit (resolves K.7)

### The question

The prototype always emits an audit entry, ignoring `audit: false`. Is the docs intent or the runtime intent canonical?

### The decision

**Docs intent is canonical.** `on_confirm.audit: boolean` (default `true`). When `false`, no `useAuditLog().append(...)` call is made. Every other apply path (write fields, set fields, recompute, toast, after-mutation) still runs.

### Rationale

There are legitimate read-mostly actions (e.g. "Open detail in new tab" wrapped as a CTA, "Export current row" as a side-effecting button) where logging every click pollutes the audit. The flag exists for a reason.

### Tradeoff accepted

Test coverage MUST include both `audit: true` (default) and `audit: false` paths. The validator does NOT warn on `audit: false` — it's a legitimate choice, not an error.

---

## Decision 10 — Kanban composite dialog dedups field IDs ON RENDER (resolves K.8)

### The question

The prototype dedups field values in `MFseedCompositeValues` (first-wins on `f.id`) but renders all fields including duplicates from later actions. Two actions declaring `field.id = "cliente_id"` will render two `<input>`s in the DOM, both bound to `formValues.cliente_id`. The result is two visible fields whose values stay in sync (because they share the formValues key) but look like two separate prompts.

### The decision

Dedup on render too. The composite dialog walks all enabled actions in declaration order; for each action it walks `dialog.fields[]`; each field is rendered only if its `id` has not yet been rendered by an earlier action's group. Action labels are still shown as group headings — so the user sees: "Action A — field A1, field A2; Action B — field B1 (only; field A2 was already shown above)".

### Rationale

The shared-formValues semantic is correct (one storage per id). Showing the same input twice is a bug, not a feature.

### Tradeoff accepted

If an author *wanted* the same field to appear in two places (visual reinforcement), they cannot. We accept this — the use case is not real.

---

## Decision 11 — Lookup with null filter renders empty-state, not unfiltered list (resolves K.4)

### The question

The prototype's `MFresolveCatalogFilter` returns the catalog unfiltered when `from_record` resolves to null. This means a "Cuenta" lookup whose filter depends on "Sociedad" — when Sociedad is null — shows ALL accounts across all sociedades. The user is then offered a choice that may be invalid downstream.

### The decision

When the resolved filter value is `null | undefined | ""`, the lookup dropdown renders an empty state with a hint message: `"Asigná {filter.label || filter.field} primero"`. No catalog entries are shown. The dropdown's search input is disabled. Closing the dropdown reverts to the previous lookup state.

### Rationale

In the kanban-composite mode, `MFreevalCompositePrereqs` makes the user fill the antecedent first (the dependent action stays disabled). In single-action mode, the prerequisite check makes the action itself disabled if the antecedent is null. The unfiltered-list path only appears in edge cases (manually opening a dialog with a partially-filled form). The empty-state is the safest default.

### Tradeoff accepted

Authors can override per-field via `catalog_filter.empty_state_message` if the default Spanish hint doesn't fit. Otherwise the default is good enough.

---

## Decision 12 — Batch silent record-drop becomes `devWarn`; no records found is a hard `toast.error` (resolves K.12)

### The question

The prototype's `MFapplyAction(d, isBatch=true)` does `d.batchRecords.map(MFresolveRecord).filter(Boolean)` — silently dropping unresolvable refs. The user sees "N registros actualizados" where N may be smaller than the selected count, with no warning.

### The decision

Two-tier handling:

- **Some refs unresolvable.** `devWarn('MANIFEST', 'batch dropped {dropCount} unresolvable record refs of {totalCount}')`. The mutation proceeds for the resolved subset. The toast says `"<N> de <M> registros actualizados"` (N of M).
- **All refs unresolvable.** Hard `toast.error('No se encontró ningún registro para procesar')`. The dialog closes. No mutation, no audit.

### Rationale

Silent drops are debugging hell. Hard error on zero is a UX win — users should know nothing happened. The "N of M" toast tells the user about the partial success without spamming an error.

### Tradeoff accepted

Tests MUST cover both paths (partial drop + full drop). The audit entry shape includes `record_ids[]` of the actual mutated records (not the requested ones).

---

## Decision 13 — Validation runs at registration in dev; strict mode in tests THROWS instead of warns

### The question

Should `validateManifest` warn-only (prototype behaviour) or throw on violation?

### The decision

**Both, switched by mode.** In dev (`import.meta.env.DEV`), violations emit `devWarn('MANIFEST', '"' + key + '" · ' + msg)`. In production, validation is no-op (the dev warns are not user-visible). In tests, a strict mode flag (`ManifestRegistry.strict = true`, set by `tests/setup.ts`) makes violations THROW. CI fails immediately on invalid manifests.

### Rationale

Throw-in-prod = users see broken UIs because of a malformed manifest the dev didn't catch. Warn-in-dev = devs see the issue but the menu still works. Throw-in-tests = CI catches the issue before deploy. This is the same pattern Vue uses for prop validation.

### Tradeoff accepted

Two code paths in `validateManifest()`. Mitigated by a single helper `report(severity, key, msg)` that switches on mode.

---

## Decision 14 — Audit log: 4 entry shapes, shared `useAuditLog()` composable

### The question

The prototype has 4 distinct audit entry shapes (single, batch, composite, cta). Should they merge into one shape with discriminator fields, or stay as 4 separate types?

### The decision

One discriminated union with an explicit `kind: "single" | "batch" | "composite" | "cta"` field. Common fields: `timestamp`, `action_id`, `user_id`, `manifest_key`, `changes`. Variant fields:

```ts
type AuditEntry =
  | { kind: "single"; record_id: string; ... }
  | { kind: "batch"; record_ids: string[]; ... }
  | { kind: "composite"; record_id: string; child_action_ids: string[]; axis_id: string; ... }
  | { kind: "cta"; record_id: string | null; created_record_type: string | null; ... };
```

Append-only via `useAuditLog().append(entry)`. The composable wraps a Pinia store that, in tests, persists to an in-memory array (the equivalent of the prototype's `window.MF_AUDIT_LOG`). In production, the store batches entries and POSTs to a backend audit endpoint (per `core-api-layer`); failures fall back to in-memory and surface a `toast.error("Audit log offline")`.

### Rationale

A discriminated union gets us TS-strict narrowing in consumers ("if entry.kind === 'batch', entry.record_ids is string[]"). Backend persistence is opt-in — tests don't pay the network cost.

### Tradeoff accepted

Backend persistence is a separate change (`core-audit-log`, future) that wires the swap. For v1 of `core-actions-manifest`, in-memory persistence is enough to satisfy the spec.

---

## Decision 15 — `creates_record_type` without registered factory is a HARD error (resolves K.3 prototype behaviour)

### The question

When a CTA declares `creates_record_type: "X"` and no factory is registered (`registerCreator(manifestKey, fn)`), the prototype `console.warn`s and silently emits an audit entry with no record. Should we keep that or harden?

### The decision

**Hard error.** When the apply path reaches a CTA with `creates_record_type` and no creator function is registered for `manifestKey`, the engine throws (`throw new ManifestError("no creator registered for ...")`) which is caught by the `<ManifestDialog>` confirm handler and surfaces as `toast.error('No se puede crear el registro: factory no registrada')`. The dialog stays open. No audit entry. No mutation.

### Rationale

CTAs that create records are the primary entry into the data layer. A silent no-op confuses both the user (they think it worked) and the dev (they get no signal). Hard error makes the failure mode loud and the fix obvious.

### Tradeoff accepted

The factory registration must happen before the CTA's manifest is rendered. The recommended pattern is to register factories in the module's setup hook (`src/modules/<module>/setup.ts`), which runs before the route mounts the page. We document this in the spec.

---

## Decision 16 — Reverse-drag rule: terminal states aren't draggable; `mode: 'modal'` transitions reopen the same composite (resolves K.10)

### The question

The schema doc says reverse-drag from `imputado → en_proceso → pendiente` is "blocked". The code prevents drag-from-imputado entirely (terminal cards aren't draggable). But `en_proceso → pendiente` is `mode: 'modal'` (allowed) — and dropping a partial card onto `pendiente` reopens the composite. Which is canonical?

### The decision

**Both. Each clarifies the other.** Terminal-state cards (e.g. `imputado` for the imputacion axis, `IMP` for FIN's `fin.imput`) MUST set `terminal: true` on the kanban-axis state declaration; cards in such states are NOT draggable. Non-terminal reverse transitions (`en_proceso → pendiente`) are allowed in `mode: "modal"` and reopen the same composite dialog so the user can edit previously-assigned values. The card lands in whichever column the *recomputed* state matches, not the drop target.

### Rationale

The terminal-state lock prevents accidental "undo a posted record". The modal-on-reverse pattern preserves user intent (drag back means "let me change my mind") without creating a bypass for the lock. The composite dedup ensures editing existing values is intuitive.

### Tradeoff accepted

Authors must explicitly mark terminal states. The validator catches missing `terminal` flags on kanban-axis states only if the axis declares `drop_target_state` and that state is missing the `terminal: true` flag — otherwise it's silently allowed.

---

## Decision 17 — Items NOT in the manifest: explicit exclusion list

### The question

What about row operations that are NOT manifest-driven? "Ver detalle", free-form Edit, view toggles, filters, search, pagination — should they live in the manifest too?

### The decision

**No.** The exclusion list (encoded as a Requirement in the spec) is:

- **Ver detalle / Open record** — handled by the row-click handler (per `core-actions-menu` and `core-modals`). Always present, always enabled. Does not change record state, does not need an audit.
- **Free-form Edit** — when a record opens in a Detail modal, the "Editar" button transitions to Edit mode (per `core-modals`). The Edit modal's submit is governed by `core-forms`, not by the manifest.
- **Filters / search / pagination** — `core-data-tables` concerns. The manifest's predicate language is for action gating, not for table filtering.
- **Sub-tabs / view toggles (Lista / Kanban / Calendario / Pizarra)** — `core-layout` and `core-data-tables` concerns. The manifest declares which kanban axes exist; it does not declare the toggle UI.
- **Bulk-action bar** (above tables, when rows are selected) — explicitly NOT covered by this capability. The batch-promotion CTA (`promote_to_main_cta`) sits in the page-header actions slot, not in a per-row selection bar. A future capability MAY introduce a selection-bar pattern; until then, batch is header-only.

### Rationale

The manifest engine is for *contextual record operations*. Anything that is not a record operation (search, view toggles, free-form edit) belongs to the capability that owns the surface, not to the manifest.

### Tradeoff accepted

Authors who want to declare "Open detail" in the manifest cannot. The spec will say so explicitly. The cost is a one-line clarification in onboarding docs; the win is a smaller, sharper engine surface.

---

## Tradeoffs

### Flexibility vs governance

The strict-JSON contract limits expressiveness. An author who wants a computed predicate (`field_equals_constant_minus_one_day`) cannot write it. They must either (a) precompute the value into the record, (b) accept a workaround using existing predicates, or (c) propose a new predicate form via OpenSpec change. We accept this. Manifest changes are reviewed; code changes are not.

### Runtime cost vs declarative gain

Resolving every action against every record on every render *can* be slow if the manifest has 50 actions and the table has 1000 rows. We mitigate by: (a) `resolveActions(record, manifestKey)` is memoized via Vue's `computed()` per row (since action sets rarely change after registration), (b) the predicate evaluator short-circuits aggressively, (c) the Pinia registry caches manifest lookups by key. Benchmark target: 1000 rows × 9 actions resolves in <50ms on a mid-tier laptop. If real-world usage breaks the budget, we add a windowed renderer.

### Backwards compatibility with prototype manifests

A migration adapter (`src/adapters/legacyManifestAdapter.ts`, optional) reads `window.ACTION_MANIFEST` if present, normalizes each entry (strips `required_role_all_of`, treats unknown predicate keys as ignored), and registers them in the new Pinia registry. This is a one-shot migration tool, not a long-term API. We document the expected manifest format and recommend authors port their manifests to TS files in the new repo. The adapter exists so the migration can be incremental.

### One large component vs many small ones

`<ManifestDialog>` does a lot. We resist the temptation to split it into 4 components per mode because the modes share too much. We do split out `<ManifestField>` (per-field), `<ManifestModuleCTAs>` (header CTAs slot), `<ManifestBatchCTA>` (header batch slot), and the `useManifestDialog()` state composable. The component itself stays under 300 lines.

---

## Open questions (deferred)

These four ambiguities from the engine survey are flagged for follow-up changes:

- **K.13 — Duplicate action ids across manifests.** The validator should flag duplicates registry-wide, not just intra-manifest. Adds complexity (the validator must run on every register/unregister). Deferred.
- **K.14 — Icon resolution.** The prototype uses a single hardcoded checkmark. Real implementation needs a Lucide map keyed by `action.icon`. Wired in `<ManifestField>` / menu rendering by `core-actions-menu` follow-up.
- **K.15 — Re-validation after dialog confirm.** Once required fields pass at confirm time, the engine doesn't re-run `enable_when` / `prerequisites` against the projected record. In practice the form is closed too fast to drift, but a strict implementation should re-check. Deferred.
- **K.16 — `record_ref` type.** The prototype string-templates record refs into onclick attributes. Vue uses event listeners — refs can be `string | number | { id: string | number }`. The TS types model this; the validator does not (yet) check `record_ref` shape.

---

## Summary of resolved ambiguities

| K# | Question | Resolution |
|---|---|---|
| K.1 | Predicate multi-key semantics | AND-merge ratified (Decision 3) |
| K.2 | `required_role_all_of` broken | Operator REMOVED (Decision 4) |
| K.3 | Capabilities short-circuit | `any_of` is canonical; `all_of` removed (Decision 4) |
| K.4 | Lookup null-filter | Empty state, not unfiltered list (Decision 11) |
| K.5 | `set_fields` undocumented | Ratified (Decision 7) |
| K.6 | `recompute` only handles imputacion | Extensible registry; v1 = imputacion only (Decision 8) |
| K.7 | `audit: false` ignored | Honored (Decision 9) |
| K.8 | Composite duplicate fields | Dedup on render (Decision 10) |
| K.9 | Composite drops `set_fields` | Apply per enabled action (Decision 7) |
| K.10 | Reverse-drag rule | Terminal not draggable; non-terminal `mode:'modal'` reopens composite (Decision 16) |
| K.11 | Homogeneity-check tokens | 2 canonical (`all_records_pass_show_when`, `all_records_have_field_null:<dot-path>`); unknown → devWarn (spec Requirement) |
| K.12 | Batch silent record drop | devWarn on partial; hard `toast.error` on zero (Decision 12) |
| K.13 | Duplicate action ids | DEFERRED |
| K.14 | Icon resolution | DEFERRED |
| K.15 | Re-validation post-confirm | DEFERRED |
| K.16 | `record_ref` type | Partially: TS types accept `string | number`; validator deferred |

12 of 16 resolved in-spec. 4 deferred to follow-up changes.
