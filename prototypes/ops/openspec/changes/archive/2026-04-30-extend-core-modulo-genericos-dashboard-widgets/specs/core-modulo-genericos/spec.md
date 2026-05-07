## MODIFIED Requirements

### Requirement: Dashboard MUST be a card-grid consolidated home; NO L1/L2/L3, NO domain operations

The Dashboard page (`src/pages/Dashboard.vue`) SHALL use a responsive card-grid layout (a CSS-grid or flex auto-fit composition with cards as the primary element); it MUST NOT use the L1/L2/L3 page-header / KPI-strip / section-table pattern declared by `core-layout`. The Dashboard MUST aggregate: KPIs from active domain modules (each KPI clickable, navigating to the relevant module); counters for the three list-shaped generics (Inbox unread Solicitudes count, Alertas critical-count, Reportes pending-runs / unfulfilled-dependencies count); and ONE OR MORE consolidated activity surfaces — either a single "Actividad reciente" timeline crossing modules, OR per-module activity widgets (canonical examples: an "Alertas activas" widget surfacing the most recent active alerts; a "Próximos vencimientos" widget surfacing reportes about to emit), OR a combination of both. The Dashboard MUST NOT carry domain-specific actions, filters, sub-tabs, or batch CTAs — those belong in the domain modules. Dashboard cards MUST be clickable and navigate to the relevant module on click.

#### Scenario: Dashboard does not use the L1/L2/L3 pattern

- **GIVEN** the user navigates to `/dashboard`
- **WHEN** the page renders
- **THEN** there is NO L1 page header (no title + actions row), NO L2 KPI strip (the KPIs are part of the card grid, not a separate strip), NO L3 section + table — the page is exclusively a responsive card grid

#### Scenario: Dashboard surfaces counters for the three list-shaped generics

- **GIVEN** the app has 7 unread Solicitudes, 3 critical Alertas, and 2 unfulfilled report dependencies
- **WHEN** the Dashboard renders
- **THEN** the card grid includes (at minimum) a card showing "Inbox · 7 Solicitudes activas", a card showing "Alertas · 3 críticas", a card showing "Reportes · 2 pendientes"; each card is clickable

#### Scenario: Dashboard surfaces per-module activity widgets

- **GIVEN** an app whose Dashboard composes the consolidated home from per-module activity widgets instead of a single "Actividad reciente" timeline
- **WHEN** the Dashboard renders
- **THEN** the card grid includes (a) an "Alertas activas" widget rendering the most recent active alerts (state in `new` or `in_review`) with a "Ver todas" link to `/alertas`, AND (b) a "Próximos vencimientos" widget rendering the next reportes ordered by `next` ascending with a "Ver catálogo" link to `/reportes`; each list row is clickable and navigates to the relevant module

#### Scenario: Clicking a Dashboard card navigates to the relevant module

- **GIVEN** the user is on `/dashboard`
- **WHEN** the user clicks the "Inbox · 7 Solicitudes activas" card
- **THEN** the router navigates to `/inbox`; the Inbox lands on the Activos segment by default

#### Scenario: Filters or sub-tabs on Dashboard are a contract violation

- **GIVEN** an app adds a filter dropdown or a `<Segmenter>` to the Dashboard page
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — Dashboard MUST be read-only orientation; filters and sub-tabs belong in domain modules

## ADDED Requirements

### Requirement: Dashboard MAY surface a period selector and an app-specific evolution chart placeholder; both are non-interactive with the underlying records

The Dashboard MAY render an optional period selector (canonical labels: "Últimos 7 días" / "Últimos 30 días" / "Últimos 90 días") pinned to the top-right of the page area, on the same row as the page title, scoped to the time-based KPI values it renders. The period selector SHALL NOT re-segment any list, SHALL NOT act as a `<Segmenter>`, and SHALL NOT be promoted to L1 of any other page — its scope is the Dashboard surface only and its effect is recomputing the KPI numerators. The Dashboard MAY also render an optional evolution chart placeholder card that the cloning app fills in with its app-specific metric (canonical placement: a 2/3-width card in a row paired with a 1/3-width activity widget such as "Alertas activas"). The placeholder card SHALL NOT carry actions, filters, or domain operations — its only role is to be a labeled empty surface that the app's chart implementation fills.

#### Scenario: Period selector is pinned to the top-right of the Dashboard

- **GIVEN** an app's Dashboard renders the period selector
- **WHEN** the page header area lays out
- **THEN** the period selector appears on the same horizontal row as the page title at the top-right of the page area; it is NOT a `<Segmenter>` and it is NOT placed inline with the activity widgets below

#### Scenario: Changing the period recomputes KPIs without re-segmenting any list

- **GIVEN** the Dashboard renders with the period set to "Últimos 30 días"
- **WHEN** the user changes the period to "Últimos 7 días"
- **THEN** the KPI values that depend on time (e.g. counters of activity within the period) are recomputed against the new range; the activity widgets ("Alertas activas", "Próximos vencimientos") may re-render their lists if they depend on the period; NO list elsewhere in the app is segmented or re-segmented as a result

#### Scenario: Evolution chart placeholder ships empty in the template; cloning apps fill it

- **GIVEN** a fresh clone of `core-template-frontend` with the Dashboard rendering its evolution chart placeholder card
- **WHEN** the user views `/dashboard`
- **THEN** the placeholder card renders with a labeled header (e.g. "Evolución (placeholder)") and a dashed-border empty region indicating where the cloning app should insert its app-specific chart; the card carries NO actions, filters, or domain operations
