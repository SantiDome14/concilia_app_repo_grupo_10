## ADDED Requirements

### Requirement: Dashboard evolution chart placeholder MUST be filled by a canonical chart wrapper

The Dashboard's evolution chart placeholder card (contracted as optional in `core-modulo-genericos` per the archived change `2026-04-30-extend-core-modulo-genericos-dashboard-widgets`) SHALL be filled by one of the canonical chart wrappers contracted in `core-charts`: `<LineChart>`, `<BarChart>`, or `<AreaChart>`. The placeholder card SHALL NOT be filled with a hand-rolled SVG, a third-party chart library, or a static image. The card retains its other contracted constraints (no actions, no filters, no sub-tabs, no domain operations) — only the rendering primitive is now contracted.

#### Scenario: Apps fill the placeholder with a canonical wrapper

- **GIVEN** a fresh clone of the template where the Dashboard placeholder is empty
- **WHEN** the cloning app implements its evolution chart
- **THEN** the implementation uses `<LineChart>`, `<BarChart>`, or `<AreaChart>` from `core-charts`; the choice depends on the app's metric (continuous → line/area, categorical → bar)

#### Scenario: Hand-rolled SVG in the placeholder is forbidden

- **GIVEN** an app fills the placeholder with a hand-coded SVG line chart
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the canonical wrappers are the contracted rendering primitive; hand-rolled SVGs introduce visual drift across apps

#### Scenario: Placeholder constraints still apply

- **GIVEN** an app fills the placeholder with `<LineChart>` and adds a period selector inside the card
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the period selector belongs at the Dashboard's top-right per the archived requirement, not inside the chart card; the chart card itself stays free of actions, filters, or sub-tabs
