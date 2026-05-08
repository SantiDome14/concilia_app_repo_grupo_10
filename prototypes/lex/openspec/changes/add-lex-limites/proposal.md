> Jira REQ: REQ-44 + REQ-45 (in flight per `discoveries/lex-limites-discovery.md` §5)
> Module: LEX

# Add lex-limites — Cliente per-entity operating limit assignment

## Why

The Límites tab on `/clientes/:id` is the surface where Legal & Compliance assigns each Cliente a **per-entity operating limit** anchored to documentary evidence of the funds origin. The legacy `ClientTabs/Limits.vue` lists per-entity cards with consumption progress, supports creating limits via a modal, and exposes a delete action. Two REQs in flight (per `discoveries/lex-limites-discovery.md` §5) extend the surface: **REQ-44** adds an `Otros` clarification field that becomes required when "Otros" is selected in the origin multi-select, and **REQ-45** adds an Editar action limited to `monto` + `fecha de fin` for limits that are not yet expired.

The new spec consolidates the existing v1 behaviour with the two REQs into a single contract: entity segmentation gated by docket presence (Haz Pagos / Circuit Pay sections appear only when the corresponding docket exists on the Cliente), the limit attributes and the 15-option origin catalog, the Otros clarification flow with conditional surface and pill-tooltip rendering, the Edit flow for non-expired limits, the derived state machine (Pendiente / Activo / Expirado computed purely from `start_date`, `end_date`, `consumed`), and the destructive delete with explicit "consumption history is dropped" warning in the body.

## What Changes

- Create the `lex-limites` capability. New spec at `openspec/specs/lex-limites/spec.md` (materialised via archive) with 6 requirements covering: (a) entity segmentation gated by docket presence with section ordering Activo first, then by `end_date` desc; (b) limit card rendering of state badge, date range, amount, consumption progress, available/overage flag, and origin pills (with Otros tooltip); (c) Crear Límite modal with multi-select over the 15-option catalog, amount with thousand separators, end_date validation; (d) REQ-44 conditional Aclaración field (required when Otros, hidden+cleared when deselected, surfaced as native `title` tooltip on the card pill); (e) REQ-45 Editar action exposed only for non-Expirado limits, restricted to `amount` + `end_date`, role-gated to ADMIN_LEX; (f) Eliminar destructive confirmation including the consumption-history warning in the body.
- Define the typed surface. `src/lex/limites/types.ts` (`Limit`, `LimitState`, `LimitOrigin`), `src/lex/limites/api.ts` (`POST /limit`, `PATCH /limit/:id`, `DELETE /limit/:id`), `src/lex/limites/derive.ts` (state derivation pure function), `src/lex/limites/CreateLimitModal.vue`, `src/lex/limites/EditLimitModal.vue`, `src/lex/limites/LimitCard.vue`, the tab itself at `src/lex/limites/LimitesTab.vue`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-modals` — Create modal pair, Edit modal transition, destructive confirmation for delete.
  - `core-forms` — vee-validate + zod for amount, end_date, multi-select origins, conditional Aclaración.
  - `core-data-tables` — limit card severity colours via `--severity-*`.
  - `core-error-handling` — error toast on failed mutations.
  - `core-theming` — `--badge-pendiente`, `--badge-activo`, `--badge-expirado` semantic tokens.
  - `lex-cliente-detalle` — owns the tab shell; conditional visibility based on docket presence is locked there.
  - `lex-roles` — Crear, Editar, Eliminar gating per the matrix.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-limites` (Lex tab; per-entity operating limits) — 6 requirements, 19 scenarios.

### Non-capability artifacts

- `src/lex/limites/types.ts`, `src/lex/limites/derive.ts`, `src/lex/limites/api.ts`.
- `src/lex/limites/LimitesTab.vue`, `src/lex/limites/LimitCard.vue`.
- `src/lex/limites/CreateLimitModal.vue`, `src/lex/limites/EditLimitModal.vue`.
