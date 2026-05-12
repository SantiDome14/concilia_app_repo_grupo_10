- Jira REQ: — (closes the two out-of-scope items flagged in `rename-kind-to-type-and-type-to-concept`)
- Module: core-template (foundation)

# Finish the naming alignment: rename `Alerta.type` → `Alerta.concept` and `ActionConfig.kind` → `ActionConfig.placement`

## Why

The parent rename change (`rename-kind-to-type-and-type-to-concept` archived earlier today) flagged two out-of-scope items: the `Alerta.type` field still used `type` for the business classifier (whereas Solicitud now uses `concept`), and the briefing-tech doc's prose still referenced `ActionConfig.kind` for the row-vs-module-cta locator. Leaving them creates two pieces of drift that defeat the consistency win of the parent rename:

- Today: `Solicitud.concept = 'aprobacion_pago'` vs `Alerta.type = 'saldo_anomaly'`. The same conceptual axis ("business classifier of a record") is called two different names. Future contributors will hit the same confusion the parent rename was meant to close.
- Today: `ActionConfig` is shown in the briefing doc with `kind: 'row_action' | 'module_cta'` — using the word `kind` for "where the action renders". The parent rename used `type` for the Solicitud discriminator; using `kind` for ActionConfig locator creates a third meaning of the word in our domain (ActionConfig.kind = placement; Solicitud old kind = type discriminator; AuditEntry.kind = audit shape discriminator; TimelineEvent.kind = event-kind discriminator). Two of these can be removed by renaming.

`Alerta.concept` brings Alerta in line with Solicitud — both have `concept: string` for the business classifier. `ActionConfig.placement` reads as the clearer English equivalent of "dónde se renderiza" (the briefing's own comment) and avoids the awkward clash with the sibling `action_type` field (which already exists as the semantic discriminator `'record_mutation' | 'function_invocation'`). Renaming to `placement` instead of `type` is the cleaner solution for that locator.

## What Changes

### Spec deltas

- **`core-modulo-genericos`** — MODIFIED Requirement: *Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics*. Body rewritten so the canonical Alerta listing references `concept: string` instead of `type: string`; the discriminator `category: AlertCategory` is unchanged.

### Types

- `src/types/genericos.ts` — rename `Alerta.type: string` → `Alerta.concept: string`. Update `isAlerta` type guard. The `category: AlertCategory` discriminator is unchanged.

### Page + mocks + tests

- `src/pages/Alertas.vue` — rename all `a.type` / `drawerAlerta.type` reads → `a.concept` / `drawerAlerta.concept`; rename filter ref `filterType` → `filterConcept`; rename table column header "Tipo" → "Concepto"; rename Drawer info card "Tipo" → "Concepto"; rename `ACTIVE_TYPES` → `ACTIVE_CONCEPTS`.
- `src/mocks/genericos/alertas.ts` — rename every `type: 'saldo_anomaly' | 'login_failure' | 'cron_failed' | 'capacity_warning'` → `concept: '…'`. Values identical.
- `src/pages/Alertas.spec.ts` — any references to `a.type` / mock `type:` → `a.concept` / `concept:`. Values identical.

### Product source-of-truth (separate commit on the same branch)

- `/Users/yasmani/atlas-ai-product-management-framework/features/common/centro-de-alertas.md` — rename `Alerta.type` field references → `concept`; update prose, TS interface listings, scenarios. The `Alerta.category` discriminator (`triage | workflow | metric | cross_app_panel`) is unchanged.

### Briefing-tech rename (ActionConfig.kind → placement)

- `/Users/yasmani/atlas-ai-product-management-framework/discoveries/core-modulos-transversales-briefing-tech.md` — the few ActionConfig prose / table references that use `kind: 'row_action' | 'module_cta'` → `placement: 'row_action' | 'module_cta'`. The briefing doesn't ship a real code surface for ActionConfig (it's a future design discussion); this is doc-only.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 1 MODIFIED Requirement (Alertas canonical shape body). Bodies and Scenarios refreshed for `Alerta.concept`. Capability count unchanged (22 → 22).

### New Capabilities

None.
