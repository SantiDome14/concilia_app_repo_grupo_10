# Tasks — add-lex-relaciones

This change creates the `lex-relaciones` capability — the relationship pickers used inside the Detalles tab of `/clientes/:id`. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-relaciones/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-relaciones` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-relaciones/spec.md` — ADDED Requirements: 7 requirements, 21 scenarios. Cover: shared composable + popover, `SelectBeneficiary` metadata, similarity warnings + replace-on-create, `SelectCoOwner` PARTICULAR-PARTICULAR rules, `SelectGrouper` 1:1 + replace confirm, `SelectMergeClient` ADMIN-only + irreversible, Quitar destructive confirmation.
- [ ] Run `openspec validate add-lex-relaciones --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/relaciones/types.ts` — `RelationshipKind` (`'BENEFICIARY' | 'CO_OWNER' | 'GROUPER'`), `Relationship`, `BeneficiaryMetadata` (`ownership_percent`, `beneficiary_due_date`), `MergePayload`.

### 2.2 API binding

- [ ] `src/lex/relaciones/api.ts` — `attachRelationship(parentId, payload)`, `removeRelationship(parentId, relationshipId)`, `mergeClients(sourceId, targetId)`, `searchCandidates(query, kindFilter)`.

## 3. Composable + components (aspirational)

### 3.1 Base composable

- [ ] `src/lex/relaciones/useRelationshipPicker.ts` — `useRelationshipPicker<T>({ kind, parentClientId, onAttach, onCancel })`. Internally: debounced search (300 ms), virtualised candidate list, optional `Crear nuevo` CTA when kind allows.

### 3.2 Picker components

- [ ] `src/lex/relaciones/SelectBeneficiary.vue` — wraps the base; renders `ownership_percent` + `beneficiary_due_date` after a candidate is picked; surfaces similarity warnings with `Reemplazar por este cliente`.
- [ ] `src/lex/relaciones/SelectCoOwner.vue` — wraps the base; filters candidates to PARTICULAR; excludes parent and existing co-owners.
- [ ] `src/lex/relaciones/SelectGrouper.vue` — wraps the base; filters to GROUPER; renders the destructive replace-confirm if a grouper already exists.
- [ ] `src/lex/relaciones/SelectMergeClient.vue` — wraps the base; ADMIN_LEX gated; opens the destructive merge confirm with relationship/document counts; calls `POST /client/:id/merge` and redirects to target.
- [ ] `src/lex/relaciones/SelectBusiness.vue` — wraps the base for legacy business relationship pattern (kept thin).

### 3.3 Quitar flow

- [ ] Wire each Relationship card with a Quitar action via `core-modals` destructive confirmation.

## 4. Tests (aspirational)

- [ ] `src/lex/relaciones/useRelationshipPicker.spec.ts` — debounce, virtualised list, Crear nuevo CTA visibility per kind, Cancelar.
- [ ] `src/lex/relaciones/SelectBeneficiary.spec.ts` — ownership_percent bounds, due_date future, similarity warnings, replace-on-create.
- [ ] `src/lex/relaciones/SelectCoOwner.spec.ts` — type filter, self-block, dup guard.
- [ ] `src/lex/relaciones/SelectGrouper.spec.ts` — GROUPER-only filter, replace confirm.
- [ ] `src/lex/relaciones/SelectMergeClient.spec.ts` — role gating, count enumeration in confirm, redirect on 200.
- [ ] Coverage on the base composable ≥ 95%; on the wrappers ≥ 85%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-relaciones --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-relaciones` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-relaciones`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-relaciones/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-relaciones/`.
- [ ] Final commit with conventional message: `specs: add lex-relaciones — Cliente relationship pickers`.
