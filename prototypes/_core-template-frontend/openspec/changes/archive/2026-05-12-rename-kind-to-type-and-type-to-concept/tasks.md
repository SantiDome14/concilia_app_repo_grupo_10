# Tasks — rename-kind-to-type-and-type-to-concept

Mechanical naming refactor. Values do not change. Iterate via `npm run type-check` failures.

## 1. Types (single source of truth)

- [ ] `src/types/genericos.ts` — rename `InboxKind` → `InboxType`. On `Solicitud<TPayload>`: rename `kind: InboxKind` → `type: InboxType`; rename existing `type: string` → `concept: string`. On `InboxTypeConfig`: rename `kind: InboxKind` → `type: InboxType`; rename `type: string` → `concept: string`. Update `isSolicitud` type guard. (Also: `RecurringInboxItemDefinition.type` → `.concept` if it follows the same convention.)
- [ ] `src/types/manifest.ts` — rename `PredicateRecordTypeIn` / `PredicateRecordTypeNotIn` types → `PredicateRecordConceptIn` / `PredicateRecordConceptNotIn`. Rename their fields `record_type_in` / `record_type_not_in` → `record_concept_in` / `record_concept_not_in`. Rename `Manifest.record_type` → `Manifest.record_concept`. Rename `ModuleCTA.creates_record_type` → `ModuleCTA.creates_record_concept`. (`AuditEntryCTA.created_record_type` stays — audit log historical column name.)

## 2. Engine

- [ ] `src/lib/manifest/evalPredicate.ts` — `KNOWN_KEYS` updated (`record_type_in` / `_not_in` → `record_concept_in` / `_not_in`). The `evalKey` switch cases renamed. Helper `readRecordType` → `readRecordConcept`, reads `record.concept` directly. The legacy `_record_type` / `tipo` fallbacks are removed (FIN-prototype era, no longer relevant).
- [ ] `src/lib/manifest/applyCTA.ts` — `cta.creates_record_type` → `cta.creates_record_concept`. `AuditEntryCTA.created_record_type` STAYS (audit historical).
- [ ] `src/lib/manifest/validateManifest.ts` — any references to old predicate names updated.

## 3. Registry + manifests

- [ ] `src/config/inbox-types.ts` — every `InboxTypeConfig` literal uses `type:` instead of `kind:`, `concept:` instead of `type:`. Registry keys (`aprobacion_pago`, `revision_legajo`, `baja_usuario`, `cambio_limite`) unchanged.
- [ ] `src/manifests/framework.template.inbox.actions.ts` — predicates: `record_type_in: [...]` → `record_concept_in: [...]`. Values identical.

## 4. Mocks

- [ ] `src/mocks/genericos/inbox.ts` — every Solicitud literal: `kind: 'solicitud'|'tarea'` → `type: 'solicitud'|'tarea'`; `type: 'aprobacion_pago'|...` → `concept: 'aprobacion_pago'|...`. Values identical.

## 5. Pages

- [ ] `src/pages/Inbox.vue` — display helpers: `kindLabel(kind: InboxKind)` → `typeLabel(type: InboxType)`; `kindVariant(kind: InboxKind)` → `typeVariant(type: InboxType)`. Filter ref `filterKind` → `filterType`. List column header "Kind" → "Type". L3 filter label "Kind · Todos / Solicitudes / Tareas" → "Type · …". Drawer Información card "Kind" → "Type". (The existing `filterType` ref for the business-classifier filter is renamed to `filterConcept`; the dropdown label "Tipo · Todos / aprobacion_pago / …" becomes "Concept · Todos / aprobacion_pago / …" — visible-to-user wording.)
- [ ] `src/components/inbox/InboxCreateCTA.vue` — `t.kind` reads → `t.type` reads. Label-derivation logic untouched (the value space `'solicitud'|'tarea'` is identical).
- [ ] `src/components/inbox/InboxCreateDialog.vue` — `t.kind` / `t.payload_schema` reads → `t.type` / `t.payload_schema` reads. The `newSolicitud` literal uses `type: t.type` (the discriminator) and `concept: t.type` (NO — wait, that's wrong; let me re-think). After rename the InboxTypeConfig has `.type: 'solicitud'|'tarea'` and `.concept: 'aprobacion_pago'|...`. The new Solicitud literal is `{ type: t.type, concept: t.concept, ... }`.
- [ ] `src/components/inbox/InboxTypeSelector.vue` — `kindLabel(t.kind)` → `typeLabel(t.type)`; `kindVariant(t.kind)` → `typeVariant(t.type)`.

## 6. Tests

- [ ] `src/components/inbox/InboxCreateCTA.spec.ts` — mock object literals `{ type: 't1', kind: 'solicitud' }` → `{ concept: 't1', type: 'solicitud' }`. Mocked helper signatures: `mockListCreable` returns `Array<{ concept: string; type: 'solicitud' | 'tarea' }>` (was `{ type, kind }`).
- [ ] `src/components/inbox/InboxCreateDialog.spec.ts` — sample type configs use `type: 'solicitud' | 'tarea'` and `concept: 'aprobacion_pago' | …`. Audit-emit assertion: `created_record_type` STAYS (audit history); `created_record_concept` not introduced.
- [ ] `src/components/inbox/InboxTypeSelector.spec.ts` — sample configs renamed.
- [ ] `src/config/inbox-types.spec.ts` — registry helper tests use the new field names in their assertions / fixtures.
- [ ] `src/lib/manifest/evalPredicate.spec.ts` — test records using `_record_type: 'DEP'` → `concept: 'DEP'`. Predicate fixtures using `record_type_in` → `record_concept_in`.
- [ ] `src/lib/manifest/computeImputation.spec.ts` — same change (`_record_type` → `concept`) in mock records that exercise computeImputation.
- [ ] `src/lib/manifest/validateManifest.spec.ts` — references to `record_type: undefined` (the manifest field) → `record_concept: undefined`.
- [ ] `src/lib/manifest/applyCTA.spec.ts` — `creates_record_type` in fixtures → `creates_record_concept`. (`created_record_type` in audit assertions STAYS — historical column.)
- [ ] `src/pages/Inbox.spec.ts` — mock Solicitud shape uses `type` / `concept`.

## 7. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirements (per proposal); 2 RENAMED title updates.
- [ ] `specs/core-actions-manifest/spec.md` — MODIFIED Requirements (per proposal).

## 8. Product source-of-truth (separate commit on the same branch)

- [ ] `/Users/yasmani/atlas-ai-product-management-framework/features/common/centro-de-solicitudes.md` — interface TS listing, scenarios, prose. Replace `kind: InboxKind` → `type: InboxType`; replace existing `type: string` → `concept: string`. Replace all `record_type_in` / `creates_record_type` / `Manifest.record_type` if mentioned.
- [ ] `/Users/yasmani/atlas-ai-product-management-framework/features/common/centro-de-reporteria.md` — REPORT_DEPENDENCY scenarios that mention `kind: 'tarea'` → `type: 'tarea'`.
- [ ] `/Users/yasmani/atlas-ai-product-management-framework/discoveries/core-modulos-transversales-briefing-tech.md` — `kind` references in the briefing.

## 9. Validation gates

- [ ] `openspec validate rename-kind-to-type-and-type-to-concept --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 10. Archive + commits

- [ ] `openspec archive rename-kind-to-type-and-type-to-concept`
- [ ] Template commit: `refactor(model+engine): rename Solicitud.kind→type, Solicitud.type→concept, and matching manifest-engine predicate / shape renames`
- [ ] Product source-of-truth commit (separate, same branch): `docs(features): propagate kind→type and type→concept rename to centro-de-solicitudes + centro-de-reporteria + briefing-tech`
