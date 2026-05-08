# core-module-types Specification

## Purpose
TBD - created by archiving change add-core-module-types. Update Purpose after archive.
## Requirements
### Requirement: Module Type A — direct record management — MUST follow the L1/L2/L3 pattern over a single record set

A Module Type A page SHALL render a single record set. Its primary job is to let the user browse, filter, and act on those records directly. The page SHALL follow the L1/L2/L3 structural pattern contracted by `core-layout`: L1 hosts the title plus the actions area (which holds, in this order, an optional `<ViewToggle>` for switching between Lista / Tarjetas / Tablero, and the Main CTA at the right edge); L2 hosts the KPI strip computed over the active filters; L3 hosts the section header (title + search + granular filters) and the data surface (table, cards grid, or kanban board). The page SHALL NOT render a `<Segmenter>` for segmentation over the record set — segmentation as a concept has been removed from the template; the granular filters in L3 are the only mechanism to narrow the visible records. The page SHALL expose at most one logical data model — composing two unrelated record sets on a single Type A page is a contract violation. Each row's detail surface SHALL be either a centered modal or the side `<Drawer>` per the record type's `meta.detail` setting (governed by `core-modals`); both options remain available within Type A. The canonical demonstrative page for Type A is `src/pages/ModuloA.vue`. Cloning apps replacing the demo SHALL keep the structural shape and adapt only the domain-specific labels, columns, filters, KPIs, and actions.

#### Scenario: Page renders L1/L2/L3 over one record set

- **GIVEN** a Type A page configured with a single record set (records that share one type)
- **WHEN** the page mounts
- **THEN** L1 renders the title plus the actions area, L2 renders KPI cards computed over the visible records, L3 renders the section header (search + granular filters) and the data surface — all three regions are present in this top-down order

#### Scenario: ViewToggle in L1 switches between Lista, Tarjetas, and Tablero without changing the record set

- **GIVEN** a Type A page that exposes the three view modes
- **WHEN** the user clicks the Tarjetas option in `<ViewToggle>` (and later the Tablero option)
- **THEN** the data surface re-renders as a cards grid (and later as a kanban board) using the same filtered record set; the records themselves do not change, only their visual representation does

#### Scenario: Row click opens the detail surface declared by meta.detail

- **GIVEN** a record type whose `meta.detail` is `'drawer'`
- **WHEN** the user clicks a row in any of the three views
- **THEN** the side `<Drawer>` opens (per `core-modals`), not a centered Detail modal; record types whose `meta.detail` is unset or `'modal'` open the centered Detail modal instead

#### Scenario: Composing two unrelated record sets on one Type A page is a contract violation

- **GIVEN** a developer attempts to render two unrelated record sets (different `type`, different lifecycle) inside one Type A page by adding a second table below the first
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — Type A is one record set per page; the right pattern for two independent data models on one screen is Module Type B with each as a sub-tab

---

### Requirement: Module Type B — summary-first with record-feeding sub-tabs — MUST lead with a summary surface and expose its record-feeding data models as functional sub-tabs below the page header

A Module Type B page SHALL lead with a *summary surface* that summarizes the state, availability, or situation the module is responsible for. The page header SHALL render the title plus a Main CTA that operates on the module as a whole; the Main CTA SHALL persist on the title row regardless of which sub-tab is active. Below the page header the page SHALL render a `<Segmenter>` that exposes two or more **functional sub-tabs**, the first of which is the summary sub-tab and the rest are *record-feeding sub-tabs* — each rendering one of the data models whose values feed the summary. Sub-tabs SHALL have independent data models and independent lifecycles; they are NOT segmentation over a single record set and SHALL NOT be placed in the L1 actions area. The summary sub-tab SHALL combine KPI cards (computed across the underlying data models) with one or more non-list renderings (canonical examples: an expandable hierarchical tree, a chart with overlays, composed widget cards) — the summary surface SHALL NOT be a single L1/L2/L3 record table because its job is to summarize, not to list. Each record-feeding sub-tab is typically composed Type-A-shaped (KPIs over its records, search + filters, data surface, pagination). A sub-tab MAY expose a count chip on its `<Segmenter>` option (canonical examples: a queue length, a pending count). The canonical demonstrative page for Type B is `src/pages/ModuloB.vue`.

#### Scenario: Header carries the title and a persistent Main CTA; sub-tabs render below

- **GIVEN** a Type B page configured with one summary sub-tab and two record-feeding sub-tabs
- **WHEN** the page mounts
- **THEN** the page header renders the title plus the Main CTA on the title row, the `<Segmenter>` renders below the page header with all three sub-tabs visible in declared order, and the summary sub-tab is the default active tab

#### Scenario: Main CTA persists across sub-tab switches

- **GIVEN** the user is on a Type B page with the summary sub-tab active
- **WHEN** the user switches to a record-feeding sub-tab and then to a second record-feeding sub-tab
- **THEN** the Main CTA stays on the title row at all times, in the same position, with the same enablement — the Main CTA operates on the module as a whole, not on the active sub-tab

#### Scenario: Summary sub-tab combines KPI cards with a non-list rendering

- **GIVEN** the user is on the summary sub-tab of a Type B page
- **WHEN** the sub-tab renders
- **THEN** the surface combines a KPI strip with at least one non-list rendering (an expandable tree of related entities, a chart with thresholds, composed widget cards, or any equivalent non-tabular surface); the surface SHALL NOT be a single L1/L2/L3 record table — that pattern belongs in a record-feeding sub-tab, not in the summary sub-tab

#### Scenario: Record-feeding sub-tabs are independent data models, not segmentation

- **GIVEN** a developer attempts to wire the Type B sub-tabs as a `<Segmenter>` in the L1 actions area beside the Main CTA, treating them as segmentation over a single dataset
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — the Type B sub-tabs split independent data models with independent lifecycles; segmentation over a single record set lives in L1 per `core-layout`, not as the Type B sub-tab `<Segmenter>`

#### Scenario: Sub-tab option MAY surface a count chip when the underlying data has a meaningful count

- **GIVEN** a record-feeding sub-tab whose dataset is a queue or backlog whose length is a meaningful operational signal
- **WHEN** the page renders the `<Segmenter>` options
- **THEN** the relevant sub-tab option MAY display a count chip equal to the current length of the dataset (e.g. an 8 next to a "Cola" sub-tab when 8 items are pending); the count chip MAY be omitted when the dataset is empty or when the count is not operationally meaningful

---

### Requirement: Cloning apps MUST choose Type A or Type B per module based on whether the module's primary job is "browse records" (A) or "show state, then drill into the records that produced it" (B)

When a cloning app replaces a demonstrative module (`Modulo{A,B}.vue`) with a domain implementation, the developer SHALL choose Type A or Type B per the heuristic below, applied in this exact order, first match wins:

1. Does the user's primary task on the page consist of browsing, filtering, and acting on a single record set? → **Type A**.
2. Is the user expected to first see the state, availability, or situation summarized, and only then drill into the records that produced those values? → **Type B**.

A module SHALL NOT mix the two patterns on a single page (e.g. a Type A page with a summary banner pinned at the top is rejected — that becomes Type B). When a developer is genuinely unsure between the two patterns, the heuristic SHALL be re-applied to the *primary* user task; the presence of secondary tasks does not change the page's type. Apps that need both patterns in the same domain SHALL split the domain across two pages (one Type A, one Type B) rather than collapsing both onto a single page.

#### Scenario: A page whose primary task is "browse and act on records" lands as Type A

- **GIVEN** a domain whose primary user task is to list operations of a single type, filter by status / date / responsible, and act on each row
- **WHEN** the developer applies the heuristic
- **THEN** the module lands as Type A — `src/pages/ModuloA.vue` is replaced with the domain implementation following L1/L2/L3 over the single record set

#### Scenario: A page whose primary task is "see the state, then drill into the records" lands as Type B

- **GIVEN** a domain whose primary user task is to first see a summary of state (KPIs + a tree or chart) and then optionally drill into the underlying record sets that fed those values
- **WHEN** the developer applies the heuristic
- **THEN** the module lands as Type B — `src/pages/ModuloB.vue` is replaced with the domain implementation; the summary sub-tab presents the state, and the record-feeding sub-tabs present each underlying data model

#### Scenario: Mixing both patterns on one page is a contract violation

- **GIVEN** a developer proposes a page with an L1/L2/L3 record table AND a pinned summary banner with KPIs + tree above the table, on the same page
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — the right move is to split the domain across two pages (one Type A for the records, one Type B for the summary) or to choose one pattern based on the primary user task; collapsing both into one page violates the heuristic

