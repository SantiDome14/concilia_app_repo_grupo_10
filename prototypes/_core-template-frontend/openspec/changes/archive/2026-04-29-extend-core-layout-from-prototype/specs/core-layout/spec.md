## ADDED Requirements

### Requirement: Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)

Every page that exposes controls over a record set SHALL distinguish three orthogonal scopes — **Segmentación**, **Vista**, and **Filtros** — and place each one at its contracted level. Segmentation defines a mutually exclusive subset of the module universe (selecting a segment changes the available KPIs, columns, filters, and actions). Vista defines the visual representation of the selected data without changing what the data is (Lista / Tarjetas / Tablero). Filtros restrict the visible records by attribute values, are multi-value, and are orthogonal (a record can match many filters at once). L1 SHALL host segmentation, the view toggle, and the Main CTA — never granular filters. L3 SHALL host search and granular filters. L2 KPIs SHALL be computed over the intersection of (active segment ∩ active filters). The period filter is treated as a filter with UI privileges (mandatory, single-value, default-visible, pinned to the start of the filter row) and is governed by `core-data-tables`, not as a fourth conceptual category. Anti-pattern enforcement (mixing segmentation with filters, placing granular filters in L1, treating the period filter as a separate category) is governed by `core-error-handling` and is cross-referenced from this requirement.

#### Scenario: Segmentation lives in L1, never alongside granular filters

- **GIVEN** a page that supports segmentation (e.g. Activos vs Histórico) and granular filters (e.g. Tipo, Origen, Responsable)
- **WHEN** the page is rendered
- **THEN** the segmentation control is placed in L1 inside the page header actions area, and the granular filters are placed in L3 inside the section header above the data surface

#### Scenario: Switching the active segment changes the available KPIs, columns, filters, and actions

- **GIVEN** a page rendered with the segment "Activos" active
- **WHEN** the user switches the active segment to "Histórico"
- **THEN** L2 re-renders the KPIs computed over the new segment, the data surface columns adapt to the new segment, the granular filters in L3 are recomputed (some filters that applied only in Activos are dropped, and Histórico-specific filters appear), and the available row actions adjust accordingly

#### Scenario: L2 KPIs are computed over (active segment ∩ active filters)

- **GIVEN** a page where the user has selected segment "Activos" and applied filters Tipo = "Pago" and Responsable = "alice"
- **WHEN** L2 renders its KPIs
- **THEN** each KPI value is computed over the records that belong to the "Activos" segment AND match Tipo = "Pago" AND match Responsable = "alice"

#### Scenario: The period filter is a filter with privileges, not a separate category

- **GIVEN** a page whose filter row includes a period filter
- **WHEN** the page renders L3
- **THEN** the period filter is placed inside the L3 filter row pinned to the start, follows the period-filter privileges contracted in `core-data-tables` (mandatory, single-value, default-visible), and is not promoted to L1 nor placed in a band of its own

### Requirement: L1 segmentation MUST be expressed via a `<Segmenter>` component in the page header actions area

The Vue equivalent of the prototype's L1 segmentador SHALL be a `<Segmenter>` component placed inside the page header's actions area, on the same row as the title and the Main CTA. The slot order inside the actions area SHALL be: `<Segmenter>` (leftmost of the controls), `<ViewToggle>` (middle), Main CTA (rightmost). When the active view is `kanban`, the `<Segmenter>` SHALL be hidden by default; pages that genuinely need both segmentation and Tablero in the same view MAY opt in via a per-page flag. The `<Segmenter>` component applies ONLY to segmentation of the same data model (Activos vs Histórico, Nuevas vs Atendidas, Catálogo vs Histórico). Qtabs that split a module into independent functional sections (different data models, different lifecycles) live below the page header and are governed by a separate pattern outside the scope of this requirement.

#### Scenario: Segmenter sits in the page header actions area on the same row as the title

- **GIVEN** a page that declares both a title and a `<Segmenter>` with two segments
- **WHEN** the L1 page header renders
- **THEN** the `<Segmenter>` is rendered inside the actions area on the same horizontal row as the title, and is not rendered as a separate band below the title

#### Scenario: Slot order inside the actions area is Segmenter then ViewToggle then Main CTA

- **GIVEN** a page that exposes a `<Segmenter>`, a `<ViewToggle>`, and a primary Main CTA
- **WHEN** the L1 page header renders
- **THEN** the controls appear left-to-right in the actions area in the order `<Segmenter>` → `<ViewToggle>` → Main CTA, with the Main CTA flush to the right edge

#### Scenario: Segmenter is hidden by default when the active view is kanban

- **GIVEN** a page with a `<Segmenter>` and a `<ViewToggle>` whose active value is `kanban`
- **WHEN** the page renders
- **THEN** the `<Segmenter>` is not visible in the actions area unless the page has explicitly opted in to showing the segmenter in Tablero

#### Scenario: Functional-section qtabs are out of scope for the Segmenter

- **GIVEN** a module that splits its surface into two independent functional sections with different data models (e.g. Reportes and Catálogo)
- **WHEN** the page is composed
- **THEN** the split between functional sections SHALL NOT be implemented as a `<Segmenter>` in the page header — it is a different pattern that lives below the page header and is governed by a separate contract

### Requirement: Scroll MUST live inside the Main container, never on the document body

Scroll SHALL be contained inside the Main content container; the document body SHALL NOT scroll. The `Main` container SHALL declare `min-width: 0` and `overflow: hidden` so that intrinsically wide flex children (tables, kanban boards) cannot force the document body to stretch. Data surfaces SHALL scroll inside their own bounded containers: tables scroll horizontally inside their wrapper, kanban boards scroll horizontally across columns inside the board container, and neither propagates scroll to the document body. Modal and drawer overlays SHALL use `position: fixed` and SHALL lock body scroll while the overlay is open, so the overlay never competes with a body-level scroll container.

#### Scenario: A wide table scrolls inside its wrapper, not the document body

- **GIVEN** a page whose data surface is a table wider than the Main container's available width
- **WHEN** the user scrolls the table horizontally
- **THEN** the scroll happens inside the table's wrapper element and the document body's scroll position does not change

#### Scenario: The Main container's min-width and overflow rules prevent body scroll

- **GIVEN** the Main container is rendered with intrinsically wide children
- **WHEN** the layout computes
- **THEN** the Main container has `min-width: 0` and `overflow: hidden` applied via the layout tokens, and the document body's scroll height does not exceed the viewport height

#### Scenario: Opening a modal locks body scroll without introducing a competing scroll container

- **GIVEN** a page rendered inside the Main container and a modal that opens via the `<Teleport to="body">` portal
- **WHEN** the modal opens
- **THEN** the modal overlay is `position: fixed` covering the viewport, body scroll is locked while the modal is open, and the modal content scrolls inside the modal body — not via a re-enabled document body scroll

### Requirement: Pages MUST support Master-Detail as a third structural layout

The template SHALL support Master-Detail as a third structural layout alongside Dashboard and L1/L2/L3. A Master-Detail page declares `meta.layout = 'master-detail'` in its route definition and renders a `<MasterDetailLayout>` Vue component that exposes two slots: a list panel on the left and a detail panel on the right. Both panels SHALL live inside the Main container, and each panel SHALL scroll independently inside its own bounded container — the body-fixed scroll rule still applies, so neither panel's scroll escapes to the document body. Master-Detail is the right pattern for record types whose primary interaction is "select an item from a list and edit the right panel inline" (canonical examples: Reportes/Catálogo, Configuración/Usuarios). It is an alternative to L1/L2/L3, chosen at page authoring time when the data model fits — not a replacement.

#### Scenario: Page declares meta.layout = 'master-detail' and renders MasterDetailLayout

- **GIVEN** a route whose page is implemented as a Master-Detail flow (e.g. Configuración/Usuarios)
- **WHEN** the route is defined
- **THEN** the route declares `meta.layout = 'master-detail'` and the page component renders `<MasterDetailLayout>` with the list and detail slots filled

#### Scenario: List panel and detail panel scroll independently

- **GIVEN** a Master-Detail page where the list contains more rows than fit in the viewport and the detail panel contains a long form
- **WHEN** the user scrolls the list panel and then scrolls the detail panel
- **THEN** each panel scrolls inside its own bounded container, the other panel's scroll position is unchanged, and the document body does not scroll

#### Scenario: Selecting a list item updates the detail panel without leaving the page

- **GIVEN** a Master-Detail page rendered with a list of records on the left and an empty detail panel on the right
- **WHEN** the user clicks a record in the list
- **THEN** the selected record is highlighted in the list panel and the detail panel renders the editable detail of that record without a route change and without opening a modal

#### Scenario: Master-Detail does not replace L1/L2/L3 for record types that fit the listing pattern

- **GIVEN** a module whose primary interaction is browsing a filterable list with KPIs (e.g. Inbox)
- **WHEN** the page is composed
- **THEN** the page SHALL use L1/L2/L3 — not Master-Detail — and the choice between layouts is made per page based on which interaction model fits the data
