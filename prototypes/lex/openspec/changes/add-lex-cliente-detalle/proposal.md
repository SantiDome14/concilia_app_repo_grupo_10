> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-cliente-detalle — /clientes/:id tabbed legajo view

## Why

The legacy `client-details.vue` (~267 LOC) is the navigation hub of the Lex legajo: it consolidates Identidad / Dockets / Onboarding / Relaciones into one Detalles tab and routes the user to Actividad, Documentos, and Límites in three sibling tabs. The page mixes concerns: tab state lives in component state but is pushed to `?tab=` ad-hoc, the back-button does its own `sessionStorage` lookup with a hardcoded fallback to distinguish if the user came from `/altas` or `/clientes`, role gating for Actividad and Documentos is implemented twice (once for the tab body, once for the request firing), and the breadcrumb wiring leaks into `onBeforeUnmount` cleanup that future refactors keep forgetting.

The new spec separates the page-level shell from the tab contents. Detalles content is governed here (Identidad / Dockets / Onboarding / Relaciones / similarity warnings); Actividad, Documentos, Límites are owned by sibling capabilities. The page itself locks: the four-tab inventory with conditional Límites visibility (only when `circuit_docket` or `haz_docket` exists), `?tab=` persistence with replace-not-push history, role gating for Actividad and Documentos as placeholder-with-no-fetch (per `lex-roles`), back navigation derived from the loaded Cliente's `status` (no `sessionStorage` marker — the legacy two-page split is unified per `lex-clientes` Decision 1), breadcrumb integration via `useBreadcrumb()`, and a clean 404 path.

## What Changes

- Create the `lex-cliente-detalle` capability. New spec at `openspec/specs/lex-cliente-detalle/spec.md` (materialised via archive) with 7 requirements covering: (a) four-tab segmenter with conditional Límites visibility + deep-link fallback when dockets missing; (b) `?tab=` persistence with replace history, default `detalles`, unknown values fall back; (c) Actividad / Documentos role gating per `lex-roles` — placeholder with no fetch fired; (d) back-button always returns to `/clientes?segment=<X>` derived from the loaded Cliente's `status` — no `sessionStorage` marker is read or written; (e) breadcrumb wiring via `useBreadcrumb()` with cleanup on unmount; (f) 404 surface via `EmptyState` with no auto-redirect; (g) Detalles tab section ordering Identidad → Dockets → Onboarding → Relaciones → Advertencias de similitud (only on `PENDING_REVIEW`).
- Define the typed surface. `src/pages/ClienteDetalle.vue`, `src/lex/cliente-detalle/Detalles.vue`, `src/lex/cliente-detalle/api.ts` (`GET /client/:id`), `src/lex/cliente-detalle/types.ts` (`ClienteDetail`, `ActiveTab`).
- Integrate with sibling capabilities — referenced, not edited:
  - `core-layout` — sub-tab segmenter primitive.
  - `core-navigation` — Topbar breadcrumb derivation.
  - `core-modals` — Detail/Edit modal contracts (used inside Detalles for relationship edits).
  - `core-error-handling` — `EmptyState` for 404, `Skeleton` for loading.
  - `lex-roles` — placeholder behaviour for restricted tabs.
  - `lex-templates` — Onboarding section template label.
  - `lex-relaciones` — relationship pickers inside the Detalles tab.
  - `lex-documentos` — Documentos tab body.
  - `lex-limites` — Límites tab body.
  - `lex-clientes` — source page for row-click navigation; the legacy `lex-altas` capability is unified into `lex-clientes` per its Decision 1, so a single origin page exists.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-cliente-detalle` (Lex page; `/clientes/:id` shell) — 7 requirements, 20 scenarios.

### Non-capability artifacts

- `src/pages/ClienteDetalle.vue` — page shell.
- `src/lex/cliente-detalle/Detalles.vue` — Detalles tab content.
- `src/lex/cliente-detalle/api.ts` — `GET /client/:id`.
- `src/lex/cliente-detalle/types.ts` — `ClienteDetail`, `ActiveTab` union.
