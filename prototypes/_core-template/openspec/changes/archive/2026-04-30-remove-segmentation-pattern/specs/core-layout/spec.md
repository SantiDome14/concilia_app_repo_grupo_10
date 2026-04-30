## REMOVED Requirements

### Requirement: L1 segmentation MUST be expressed via a `<Segmenter>` component in the page header actions area

**Reason:** The "L1 segmentation" concept is removed from the template. The work that L1 Segmenter used to do — narrowing a record set into mutually exclusive subsets — is now expressed entirely through the granular filters in L3 (e.g. the Estado filter for state-based subsets). The `<Segmenter>` Vue component itself is preserved as the rendering primitive for the **Type B Tabs** pattern (below the page header, governed by `core-module-types`); it is no longer used in L1.

**Migration:** Pages that rendered `<Segmenter>` in the L1 actions area SHALL remove it. State-based subsets that the Segmenter used to surface (Activos / Histórico, Nuevas / Histórico) SHALL be expressed via the Estado filter in L3 listing all states simultaneously. Date-based subsets SHALL be expressed via the period filter in L3 (governed by `core-data-tables`). Modules that genuinely needed a tab-like control over independent data models (canonical example: Reportes' Catálogo vs Ejecución) SHALL adopt the Type B Tabs pattern (governed by `core-module-types`) — `<Segmenter>` placed below the page header, NOT in the L1 actions area.

### Requirement: Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)

**Reason:** The three-level framework was anchored on Segmentación as a first-class concept. With Segmentación removed from the template, the framework collapses to two levels. Replaced by the new `Pages MUST place controls per the two-level framework (Vista / Filtros)` requirement added by this change.

**Migration:** Pages that previously declared a `<Segmenter>` in L1 SHALL drop it. L2 KPIs that were computed over (active segment ∩ active filters) SHALL be recomputed over (active filters) only. The "switching segments changes available KPIs / columns / filters / actions" scenario no longer applies — switching states via the Estado filter never changes the page's column set or action set.

## ADDED Requirements

### Requirement: Pages MUST place controls per the two-level framework (Vista / Filtros)

Every page that exposes controls over a record set SHALL distinguish two orthogonal scopes — **Vista** and **Filtros** — and place each one at its contracted level. Vista defines the visual representation of the selected data without changing what the data is (Lista / Tarjetas / Tablero). Filtros restrict the visible records by attribute values, are multi-value, and are orthogonal (a record can match many filters at once). L1 SHALL host the view toggle and the Main CTA — never granular filters. L3 SHALL host search and granular filters. L2 KPIs SHALL be computed over the active filters. The period filter is treated as a filter with UI privileges (mandatory, single-value, default-visible, pinned to the start of the filter row) and is governed by `core-data-tables`, not as a separate conceptual category. Anti-pattern enforcement (placing granular filters in L1, treating the period filter as a separate category) is governed by `core-error-handling` and is cross-referenced from this requirement.

#### Scenario: View toggle lives in L1, granular filters live in L3

- **GIVEN** a page that supports multiple views (Lista / Tarjetas / Tablero) and granular filters (e.g. Tipo, Origen, Estado)
- **WHEN** the page is rendered
- **THEN** the `<ViewToggle>` is placed in L1 inside the page header actions area, and the granular filters are placed in L3 inside the section header above the data surface

#### Scenario: L2 KPIs are computed over the active filters

- **GIVEN** a page where the user has applied filters Tipo = "Pago" and Responsable = "alice"
- **WHEN** L2 renders its KPIs
- **THEN** each KPI value is computed over the records that match Tipo = "Pago" AND Responsable = "alice"

#### Scenario: The period filter is a filter with privileges, not a separate category

- **GIVEN** a page whose filter row includes a period filter
- **WHEN** the page renders L3
- **THEN** the period filter is placed inside the L3 filter row pinned to the start, follows the period-filter privileges contracted in `core-data-tables` (mandatory, single-value, default-visible), and is not promoted to L1 nor placed in a band of its own

#### Scenario: Granular filters in L1 are a contract violation

- **GIVEN** a developer attempts to place a granular filter dropdown (e.g. Tipo, Origen, Severidad) inside the L1 page header actions area
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — granular filters belong in L3 above the data surface; L1 is reserved for the view toggle and the Main CTA
