- Jira REQ: — (naming refactor; will propagate to the product source-of-truth in `features/common/` in the same branch)
- Module: core-template (foundation)

# Rename `Solicitud.kind` → `type` and `Solicitud.type` → `concept` (plus the matching manifest-engine predicate / shape renames)

## Why

The current naming reads backwards under review: `kind` ("Solicitud" / "Tarea") is the **primary** discriminator between the two record categories of the Inbox, while `type` ("aprobacion_pago", "revision_legajo", …) is the **business classifier** — but the names suggest the opposite priority. Across UI strings, spec bodies, and code reviews the inversion creates friction every time someone says "qué tipo es" and has to disambiguate which level they mean. The polish-review hands-on session surfaced it explicitly: the names confuse, the rename is cheap right now (before any downstream app — CLP / FIN / LEX / OPS / TRD — has built on top of the model).

The rename closes the ergonomics gap with a two-step swap on the model side:

- `Solicitud.kind: 'solicitud' | 'tarea'` → `Solicitud.type: 'solicitud' | 'tarea'`
- `Solicitud.type: string` (e.g. `'aprobacion_pago'`) → `Solicitud.concept: string`

And the matching renames on the manifest engine (the predicates and CTA / Manifest shapes that reference the business classifier through their `record_type_*` / `creates_record_type` / `Manifest.record_type` names):

- Predicate `record_type_in` / `record_type_not_in` → `record_concept_in` / `record_concept_not_in`. The engine reads `record.concept` directly (the legacy FIN-prototype fallbacks `record._record_type` / `record.tipo` are removed — those fields are not part of the canonical model).
- ModuleCTA `creates_record_type?: string` → `creates_record_concept?: string`.
- Manifest `record_type?: string | null` → `record_concept?: string | null`.

Values do not change. The string literals `'solicitud'`, `'tarea'`, `'aprobacion_pago'`, `'revision_legajo'`, etc. are identical before and after. The registry keys (`INBOX_TYPES_REGISTRY.aprobacion_pago`) are identical. Mock data values are identical. Only the **names of the fields** that hold these values change.

The audit-entry `AuditEntryCTA.created_record_type?: string | null` stays as-is in this round — that field is a historical record of "the record-type that was created" written to audit logs; renaming it would break audit-log consumers and is a separable concern. The CTA's *declaration* field (`creates_record_concept`) renames; the *audit* field stays `created_record_type` and points to the new `concept` value (the type renames in the data model but the audit entry's column name is a different identifier).

Similarly, `TimelineEvent.kind` (`'state_change' | 'taken' | 'closed' | …`) and `AuditEntry.kind` (`'single' | 'batch' | 'composite' | 'cta'`) are **NOT** renamed. They are separate discriminators on separate types; renaming all uses of the word "kind" in the codebase would expand the scope without payoff. The rename is scoped strictly to the Solicitud / Tarea / InboxTypeConfig / manifest-engine business-classifier surface.

The product source-of-truth (`features/common/centro-de-solicitudes.md`, `centro-de-reporteria.md`, and the discovery doc) is updated in a separate commit on the same branch so the spec and template stay aligned.

## What Changes

### Spec deltas

- **`core-modulo-genericos`** — MODIFIED Requirements (every Requirement whose body references the `Solicitud.kind` or `Solicitud.type` field name; titles that mention the field as a word get RENAMED too). Specifically:
  - MODIFIED: *Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>* — body rewritten to use `type` instead of `kind` and `concept` instead of `type`.
  - MODIFIED: *Inbox MUST declare a state machine with terminal-state ClosureModal* — `INBOX_TYPES[type].closeActions` reference becomes `INBOX_TYPES[concept].closeActions`.
  - MODIFIED: *Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea report_dependency_block with declarative auto_archive* — Scenarios rewritten (the `kind: 'tarea'` reference becomes `type: 'tarea'`).
  - MODIFIED: *Inbox MUST expose a typed registry InboxTypeConfig declaring creable_manualmente, manual_creation_capability, payload_schema, closeActions, triggers_on_create, available_actions, push_notification?, auto_archive?* — body + scenarios rewritten.
  - MODIFIED: *Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by InboxTypeConfig.creable_manualmente: true and manual_creation_capability; the label is derived from kind of the available types* — RENAMED title (`kind` → `type` in title) AND body rewritten.
  - MODIFIED: *Solicitud assignee is distinct from owner; both are independently mutable in non-terminal states* — Scenarios use `type: 'taken'` (Timeline event kind UNCHANGED — it stays `kind: 'taken'`).
  - MODIFIED: *Inbox views MUST surface the kind discriminator as a badge and the L3 filter row MUST expose a kind filter* — RENAMED title (`kind` → `type`) AND body rewritten.
  - RENAMED Requirement (title-only): *Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by InboxTypeConfig.creable_manualmente: true and manual_creation_capability; the label is derived from kind of the available types* → *... the label is derived from type of the available types*.
  - RENAMED Requirement (title-only): *Inbox views MUST surface the kind discriminator as a badge and the L3 filter row MUST expose a kind filter* → *Inbox views MUST surface the type discriminator as a badge and the L3 filter row MUST expose a type filter*.
- **`core-actions-manifest`** — MODIFIED Requirements wherever the predicate / Manifest / CTA shape mentions `record_type_in` / `record_type_not_in` / `creates_record_type` / `record_type`:
  - MODIFIED: *Manifest top-level shape MUST conform to the canonical TS interface* — body rewritten (`record_type` → `record_concept`).
  - MODIFIED: *Predicate evaluator MUST implement the 8-form alphabet with multi-key AND-merge* — body + scenarios rewritten (`record_type_in` → `record_concept_in`).
  - MODIFIED: *Module CTAs MUST render in the page-header actions slot, NEVER in the per-row menu* — body + scenarios rewritten (`creates_record_type` → `creates_record_concept`).
  - MODIFIED: *validateManifest MUST run at registration in dev/strict, warn-only in dev, throw in strict* — body rewritten (mentions of the predicates updated).

### Types

- `src/types/genericos.ts` — rename `InboxKind` → `InboxType`; rename fields on `Solicitud<TPayload>` (`kind` → `type`, `type` → `concept`) and on `InboxTypeConfig` (`kind` → `type`, `type` → `concept`); update the `isSolicitud` type guard.
- `src/types/manifest.ts` — rename `PredicateRecordTypeIn` / `PredicateRecordTypeNotIn` → `PredicateRecordConceptIn` / `PredicateRecordConceptNotIn` (the field-shape types); rename the Predicate union members `record_type_in` / `record_type_not_in` → `record_concept_in` / `record_concept_not_in`; rename `Manifest.record_type` → `Manifest.record_concept`; rename `ModuleCTA.creates_record_type` → `ModuleCTA.creates_record_concept`.

### Engine

- `src/lib/manifest/evalPredicate.ts` — `KNOWN_KEYS` updated; the `record_type_in` / `record_type_not_in` cases renamed to `record_concept_in` / `record_concept_not_in`; the helper `readRecordType` renamed to `readRecordConcept` and reads `record.concept` directly (no `_record_type` / `tipo` fallbacks — those were FIN-prototype legacy).
- `src/lib/manifest/applyCTA.ts` — `cta.creates_record_type` → `cta.creates_record_concept`; the AuditEntryCTA's `created_record_type` field STAYS (audit log historical column name).
- `src/lib/manifest/validateManifest.ts` — predicate name references updated.

### Registry + manifests + page + mocks

- `src/config/inbox-types.ts` — `InboxTypeConfig` entries use `type` (instead of `kind`) and `concept` (instead of `type`).
- `src/manifests/framework.template.inbox.actions.ts` — predicates renamed to `record_concept_in: [...]`.
- `src/mocks/genericos/inbox.ts` — every Solicitud's `kind: …` becomes `type: …`; every `type: …` (business classifier) becomes `concept: …`. Values identical.
- `src/pages/Inbox.vue` — display helpers renamed (`kindLabel` / `kindVariant` → `typeLabel` / `typeVariant`); filter ref `filterKind` → `filterType`; column header "Kind" → "Type"; filter label "Kind · Todos / Solicitudes / Tareas" → "Type · Todos / Solicitudes / Tareas"; Drawer Información card "Kind" → "Type". The state-filter `filterType` is kept (state filter stays as `filterState` — different field).
- `src/components/inbox/*` — `<InboxTypeSelector>`, `<InboxCreateDialog>`, `<InboxCreateCTA>` updated for the renamed fields.

### Tests

- Every spec asserting `kind:` / `type:` (in mocks or assertions) updated to the new field names. Values unchanged.

### Product source-of-truth (separate commit on the same branch)

- `/Users/yasmani/atlas-ai-product-management-framework/features/common/centro-de-solicitudes.md` — interface listing, scenarios, prose
- `/Users/yasmani/atlas-ai-product-management-framework/features/common/centro-de-reporteria.md` — REPORT_DEPENDENCY scenarios that reference `kind: 'tarea'`
- `/Users/yasmani/atlas-ai-product-management-framework/discoveries/core-modulos-transversales-briefing-tech.md` — `kind` references in the briefing

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — MODIFIED Requirements (≈7 affected) + RENAMED Requirements (2 titles). Bodies + scenarios rewritten for the field renames. Capability count unchanged (22 → 22).
- `core-actions-manifest` — MODIFIED Requirements (≈4 affected). Bodies + scenarios rewritten. Capability count unchanged.

### New Capabilities

None.
