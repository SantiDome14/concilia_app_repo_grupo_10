- Jira REQ: — (no ticket; template-level enrichment driven by the prototype's richer Dashboard surface)
- Module: core-template (foundation)

# Enrich the Dashboard contract to match the prototype's widget composition

## Why

The current `core-modulo-genericos` baseline contracts the Dashboard as a card-grid consolidated home that MUST aggregate (a) KPIs from active modules, (b) counters for the three list-shaped generics (Inbox, Alertas, Reportes), and (c) a single "Actividad reciente" timeline crossing modules. The prototype the design system was lifted from (`prototypes/_core-template-frontend/_core-template-frontend.html` v1.15) takes a more flexible shape: instead of a single cross-module "Actividad reciente" timeline, it composes the consolidated home from a 4-card KPI row (Alertas activas / Inbox · pendientes / Reportes próx. vencer / app-specific KPI placeholder), an evolution chart placeholder for the cloning app to fill in, and two per-module activity widgets ("Alertas activas" listing the most recent active alerts; "Próximos vencimientos" listing reportes about to emit). It also exposes a period selector pinned to the top-right of the page header — a control that filters the time-based KPIs without violating the "no L1/L2/L3 / no domain operations / no sub-tabs" rules of the existing baseline. The current contract leaves all of these patterns implicit or off-spec; the cloning app developer is forced to either drop everything but the three counters (matching the spec) or implement the prototype shape (drifting from the spec). This change ports the prototype's richer composition into the baseline as additional permitted shapes, while keeping every existing prohibition (no L1/L2/L3, no filters, no sub-tabs, no domain operations) intact.

## What Changes

- **`core-modulo-genericos`** — modify the existing requirement `Dashboard MUST be a card-grid consolidated home; NO L1/L2/L3, NO domain operations` so that the activity-surface clause now reads: the Dashboard MUST aggregate ONE OR MORE consolidated activity surfaces — either a single "Actividad reciente" timeline crossing modules, OR per-module activity widgets (canonical examples: an "Alertas activas" widget surfacing the most recent active alerts, and a "Próximos vencimientos" widget surfacing the reportes about to emit), OR a combination of both. All other clauses (no L1/L2/L3, no filters, no sub-tabs, no domain operations, cards clickable, no batch CTAs) remain unchanged.
- **`core-modulo-genericos`** — add a new requirement `Dashboard MAY surface a period selector and an app-specific evolution chart placeholder; both are non-interactive with the underlying records` that contracts (1) an optional period selector pinned to the top-right of the Dashboard's page area, scoped to the time-based KPI values it renders (not a record filter that re-segments any list), and (2) an optional evolution-chart placeholder card that the cloning app fills in with its app-specific metric.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — one existing requirement modified (Dashboard activity-surface clause loosened to allow per-module widgets), one new requirement added (period selector + evolution chart placeholder, both optional, both non-interactive with records).

### New Capabilities

None. This change extends an existing capability.
