> Jira REQ: — (no ticket; capability scoping for the OPS migration from `core-ops-frontend` legacy)
> Module: OPS

# Add ops-instructions — payment routing templates as a Type-A master list

## Why

The legacy `core-ops-frontend` ships **three separate routes** for what is conceptually one entity at three states of interaction:

- `/settings/instructions` — `InstructionsList.vue` (213 LOC) lists payment routing templates with filters by name + currency_name and ad-hoc pagination.
- `/settings/instructions/:id` — `InstructionForm.vue` (593 LOC) is a full-page editor with a dynamic `attributes[]` array (key-value rows with `index_order` for display order).
- `/settings/instructions/:id/view` — `InstructionDetail.vue` (137 LOC) is the read-only counterpart to the editor, mostly duplicating its layout.

Each page reimplements its own filter watchers, pagination math, save/cancel flows, and dialog-style confirmations. The list page renders a hand-rolled table with native `<select>` filters; the form/detail pages are essentially the same template diverging on a `readonly` flag. Behaviours that should be shared (skeleton state, EmptyState, server retry on 5xx) are inconsistent across the three. Per the migration paradigm, this is exactly the kind of legacy split that the `core-template` paradigm absorbs into a single `Type-A` module: master-list page, detail modal as the canonical detail surface, Create / Edit modals contracted by `core-modals`, manifest-driven actions per `core-actions-manifest`.

This change creates the `ops-instructions` capability — one capability, one page, three modal flows — and uses it as the **pilot domain change for OPS migration**. It is intentionally scoped to be small enough for an end-to-end validation of the flow `proposal → spec → implementation → archive`, while real enough to exercise multiple primitives the template just landed: `core-data-tables` for the list, `core-modals` (Create / Edit / Detail / Confirmation) for the modal stack, `core-forms` with the new `key-value-array` field type for the attributes editor, `core-api-layer` for the centralised axios client, `core-actions-menu` + `core-actions-manifest` for the per-row actions.

The legacy URLs `/settings/instructions/:id` and `/settings/instructions/:id/view` are absorbed: rows open the Detail modal in place; an "Edit" row action opens the Edit modal; the legacy paths redirect to `/instructions` and the modal opens at the targeted row.

## What Changes

- **Create the `ops-instructions` capability.** New spec at `openspec/specs/ops-instructions/spec.md` (materialised on archive) with the Requirements unified from the legacy `/settings/instructions/*` surfaces. Concretely covers:
  1. The `/instructions` page is a Type-A master list per `core-module-types` (header CTAs + filter row + paginated table).
  2. Canonical column set (`Nombre`, `Moneda`, `Descripción`, `Atributos`, `Acciones`).
  3. Filters: `name` (debounced 300 ms), `currency` (select sourced from the canonical currencies catalog), state surviving Back navigation per `core-data-tables`.
  4. Server-side pagination via `@tanstack/vue-query` with the canonical page sizes (10 / 25 / 50 / 100) and `localStorage` persistence of the user's chosen page size.
  5. Header CTA `+ Crear instrucción` opens the Create modal (vee-validate + zod). VIEWER roles see the page but the CTA is hidden.
  6. Row click opens the Detail modal (read-only); per-row Actions menu exposes `Editar` and `Eliminar` (Eliminar uses the destructive confirmation pattern from `core-modals`).
  7. Create / Edit form: `Nombre` (text, required, unique), `Moneda` (lookup against the `ops.currencies` catalog, required), `Descripción` (textarea, optional, max 280), `Atributos` (the new `key-value-array` field type — dynamic add/remove rows, reorder via drag handle, `duplicate-key-policy: 'reject'` because attribute keys must be unique within an instruction).
  8. Save flow orchestrates two API calls atomically from the client (POST /instruction → POST /instruction-attribute/save-all). On partial failure, the form surfaces a retry banner instead of silently leaving the instruction without attributes.
  9. Skeleton + EmptyState + 5xx retry toast + 403 banner — all from `core-error-handling`.
  10. Legacy URL redirects: `/settings/instructions` → `/instructions`; `/settings/instructions/:id` → `/instructions?detail=:id`; `/settings/instructions/:id/view` → `/instructions?detail=:id` (same target — view became detail-modal).

- **Define the typed surface.** Files materialised on implementation:
  - `src/pages/Instructions.vue` — page composition.
  - `src/ops/instructions/api.ts` — endpoint wrappers using the shared `apiClient`.
  - `src/ops/instructions/types.ts` — `Instruction`, `InstructionRow`, `InstructionAttribute`, `InstructionsListParams`.
  - `src/ops/instructions/InstructionsTable.vue` — table-specific composition (columns, row click handler).
  - `src/ops/instructions/CreateInstructionModal.vue` — Create modal using `<DynamicForm>` or hand-rolled with `<ManifestField>` for attributes, vee-validate + zod schema.
  - `src/ops/instructions/EditInstructionModal.vue` — Edit variant; reuses the field set with pre-population.
  - `src/ops/instructions/InstructionDetailModal.vue` — read-only Detail modal.
  - `src/ops/instructions/manifest.ts` — `ops.instructions` manifest declaration (per `core-actions-manifest`) with `Editar`, `Eliminar` actions.

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — page header with title + Crear CTA per the L1 pattern.
  - `core-module-types` — Type-A composition (master list with KPI strip optional in v2).
  - `core-data-tables` — table primitive, debounced filters, server-side pagination, ellipsis pages, "no Acciones when empty" rule.
  - `core-modals` — Create / Edit / Detail / Confirmation flows.
  - `core-actions-menu` — per-row actions column with stop-propagation; row click opens Detail only outside the Acciones cell.
  - `core-actions-manifest` — manifest-driven `Editar` / `Eliminar` actions; capability gating per role.
  - `core-forms` — `text` / `lookup` / `textarea` / `key-value-array` field types; vee-validate + zod; required asterisks.
  - `core-api-layer` — shared axios + `ApiError`. Legacy custom-fetch + manual headers pattern is forbidden.
  - `core-error-handling` — Skeleton, EmptyState, alert banner for 5xx persistence retry, toast for transient failures.
  - `core-navigation` — `/settings/instructions/*` redirects.
  - **`ops-roles` (companion change, future)** — `OPS_ADMIN` for full CRUD, `OPS_VIEWER` for read-only. For now, role gating is declared inline in the manifest; when `ops-roles` lands, this capability references it.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `ops-instructions` (OPS page; payment routing templates) — 8 requirements, ~22 scenarios.

### Non-capability artifacts

- `src/pages/Instructions.vue` — page entry registered in the router under `/instructions` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Instrucciones'`, `meta.block = 'Configuración'`.
- `src/ops/instructions/{api.ts,types.ts,InstructionsTable.vue,CreateInstructionModal.vue,EditInstructionModal.vue,InstructionDetailModal.vue,manifest.ts}` — typed surface.
- Sidebar entry under a new `Configuración` block (alongside future entries when more `/settings/*` modules migrate).

### Removed from scope

- The legacy split into three routes (`InstructionsList.vue`, `InstructionForm.vue`, `InstructionDetail.vue`) is removed. Their behaviours unify under `ops-instructions` as Requirements gated by the active modal (Create vs Edit vs Detail). The legacy URLs become redirects per §10 of the requirements.
- KPI strip on the Instructions page is **out of scope for v1** — the master list does not yet need a KPI summary. If later useful (e.g. "% of instructions with > 5 attributes"), a follow-up change adds the L2 KPI strip per `core-module-types` Type-A.
- Bulk actions (multi-select rows, bulk delete) are **out of scope for v1**. The `core-data-tables` capability does not yet contract a bulk-action bar pattern (it's listed as deferred in the template's roadmap). When that lands, this capability extends with bulk Eliminar.
- The legacy `/clients/:id/instructions/create` route (a different surface that creates an instruction in the context of a specific client) is NOT migrated here — it's part of `ops-clients`, a separate change. This change owns the standalone CRUD only.
