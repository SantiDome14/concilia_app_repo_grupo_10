> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-relaciones — Cliente relationship pickers

## Why

The legacy `core-lex-frontend` ships five relationship-picker components (`SelectBeneficiary`, `SelectCoOwner`, `SelectGrouper`, `SelectMergeClient`, `SelectBusiness`) used inside the Detalles tab of `/clientes/:id` to attach Beneficiarios, Cotitulares, Agrupadores, and to merge duplicate Clientes. Each picker reimplements the same primitive: search a Cliente, pick one, attach with metadata. The result is five places where the search-debounce pattern can drift, where the candidate-list filtering rules diverge, and where the metadata validation can be inconsistent — beneficiary `ownership_percent` validation in one component, beneficiary `due_date` in another.

The new spec consolidates the five into a single shared composable (`useRelationshipPicker<T>()`) that every picker extends. It also formalises the merge-on-create pattern (similarity warning offers `Reemplazar por este cliente`), the destructive confirm for replacing a single-instance `GROUPER`, the canonical merge flow that consolidates two records, and the role gating (merge is `ADMIN_LEX` only).

## What Changes

- Create the `lex-relaciones` capability. New spec at `openspec/specs/lex-relaciones/spec.md` (materialised via archive) with 7 requirements covering: (a) shared base composable + popover surface for all pickers; (b) `SelectBeneficiary` with `ownership_percent` + `beneficiary_due_date` metadata; (c) `SelectBeneficiary` similarity warnings with `Reemplazar por este cliente` (merge-on-create); (d) `SelectCoOwner` PARTICULAR↔PARTICULAR with self-attachment block + duplicate guard; (e) `SelectGrouper` GROUPER→DIRECT with destructive replace dialog; (f) `SelectMergeClient` ADMIN_LEX only with `POST /client/:id/merge`; (g) Quitar destructive confirmation per `core-modals`.
- Define the typed surface. `src/lex/relaciones/useRelationshipPicker.ts`, the five picker components, `src/lex/relaciones/api.ts` (`POST /client/:parentId/relationships`, `DELETE /client/:parentId/relationships/:id`, `POST /client/:id/merge`), `src/lex/relaciones/types.ts`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-modals` — destructive confirmation pattern for Quitar, replace-grouper, and merge.
  - `core-forms` — vee-validate + zod for ownership_percent (0 < x ≤ 100, two decimals) and beneficiary_due_date (future).
  - `core-data-tables` — virtualised candidate list inside the popover.
  - `core-error-handling` — error toasts on failed mutations.
  - `lex-cliente-detalle` — the page that hosts the Relaciones section; this capability is consumed there.
  - `lex-clientes` — `Crear nuevo` flow inside `SelectBeneficiary` reuses the create-Cliente path.
  - `lex-roles` — Merge is ADMIN_LEX only; Quitar is hidden for VIEWER_LEX.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-relaciones` (Lex transversal; relationship pickers + merge) — 7 requirements, 21 scenarios.

### Non-capability artifacts

- `src/lex/relaciones/useRelationshipPicker.ts` — base composable.
- `src/lex/relaciones/SelectBeneficiary.vue`, `SelectCoOwner.vue`, `SelectGrouper.vue`, `SelectMergeClient.vue`, `SelectBusiness.vue`.
- `src/lex/relaciones/api.ts` — relationship endpoints + merge endpoint.
- `src/lex/relaciones/types.ts` — `Relationship`, `RelationshipKind`, `MergePayload`.
