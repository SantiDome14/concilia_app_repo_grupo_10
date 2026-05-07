# core-layout Specification

## Purpose

Define the application shell and page-level structural patterns that every authenticated view of an Ardua core frontend MUST follow. The goal is visual and interaction consistency across all apps derived from this template (core-app, core-lex, core-ops, core-trd, and future core apps).
## Requirements
### Requirement: App shell MUST wrap authenticated routes with Sidebar + Topbar + Main

The application shell SHALL be composed of three regions: a fixed-left Sidebar, a sticky Topbar inside the main column, and a scrollable Main area that renders the active route. Unauthenticated or standalone routes (Login, NotFound) SHALL render without the shell via `meta.layout = 'blank'`.

#### Scenario: Authenticated route is wrapped by the shell

- **GIVEN** a route declares `meta.layout = 'shell'` (or omits `meta.layout`) and the user is authenticated
- **WHEN** the router navigates to that route
- **THEN** the view is rendered inside the Sidebar + Topbar + Main composition

#### Scenario: Standalone route skips the shell

- **GIVEN** a route declares `meta.layout = 'blank'`
- **WHEN** the router navigates to that route
- **THEN** the view is rendered as a full-viewport page with no sidebar and no topbar

#### Scenario: Sidebar remains fixed and Main remains scrollable

- **GIVEN** an authenticated page with content that exceeds the viewport height
- **WHEN** the user scrolls the page
- **THEN** the Sidebar remains fixed, the Topbar remains sticky at the top of the main column, and only the Main region scrolls

### Requirement: Pages MUST follow the L1/L2/L3 composition pattern

Every authenticated page SHALL be composed using the three-level pattern: L1 page header, L2 KPI / summary cards, and L3 section + data surface. Pages MAY omit L2 when no summary metrics are meaningful, but L1 and L3 are required for every data-driven view.

#### Scenario: Page header renders title, subtitle, and primary actions

- **GIVEN** a page composes the L1 layer
- **WHEN** the page is rendered
- **THEN** it exposes a title, an optional subtitle, and an actions area aligned to the right

#### Scenario: KPI cards use a consistent grid

- **GIVEN** a page composes the L2 layer
- **WHEN** the page is rendered
- **THEN** cards are rendered in a responsive grid of 3 to 5 items with aligned typography, label tokens, and card padding

#### Scenario: Section surfaces reserve the section header slot

- **GIVEN** a page composes the L3 layer
- **WHEN** the page is rendered
- **THEN** a section header exposes a section title, search input, filter controls, and a result-count indicator; the data surface (table, list, grid) sits below the section header

### Requirement: Page container padding and spacing MUST be consistent

The Main container SHALL apply consistent horizontal and vertical padding across every page. Deviations from the standard spacing tokens are forbidden unless explicitly specified in a downstream capability.

#### Scenario: Page content respects standard padding

- **GIVEN** any authenticated page rendered inside the shell
- **WHEN** the page mounts
- **THEN** the Main container applies the standard horizontal padding and top/bottom padding defined by the layout tokens

#### Scenario: Pages MUST NOT introduce their own outer padding

- **GIVEN** a page component is being authored
- **WHEN** the developer composes the page template
- **THEN** the page SHALL NOT wrap its content in an additional padding container that duplicates the Main container's spacing

### Requirement: Sidebar MUST be collapsible with a body class contract

The Sidebar SHALL support a collapsed state at 60px width and an expanded state at 200px. Collapse state SHALL be reflected on `document.body` via a CSS class so that portal elements (account menus, tooltips) can reposition correctly.

#### Scenario: Collapsing narrows the Sidebar and shifts Main

- **GIVEN** the Sidebar is in its expanded state at 200px
- **WHEN** the user toggles the collapse button
- **THEN** the Sidebar transitions to 60px and the Main content margin adjusts accordingly

#### Scenario: Collapse state is mirrored on `document.body`

- **GIVEN** the Sidebar supports the collapse toggle
- **WHEN** the user collapses the Sidebar
- **THEN** the class `sb-collapsed` is present on `document.body`; when expanded, the class is absent

### Requirement: Shell MUST support a defined render order at bootstrap

The shell SHALL render after the plugin wiring sequence (Pinia → Router → Auth0 → Query) has completed, so that composables consumed by the Sidebar and Topbar (auth user, route metadata) have valid values on first paint.

#### Scenario: Shell waits for plugin wiring before first paint

- **GIVEN** the application bootstraps in `main.ts`
- **WHEN** the shell mounts
- **THEN** the shell is mounted only after Pinia, Router, and (when configured) Auth0 have been registered on the app instance

#### Scenario: Shell degrades gracefully when Auth0 is not configured

- **GIVEN** Auth0 environment variables are empty (local dev, template first run)
- **WHEN** the shell renders
- **THEN** the shell renders with stub user data and navigation continues to function without authentication

### Requirement: Page header actions MUST be limited to a maximum of three primary CTAs

The L1 page header SHALL expose at most three call-to-action buttons in the actions area. The rightmost CTA MUST use the `primary` button variant; any additional CTAs MUST use the `ghost` variant. Each CTA MUST represent a top-level action on the module as a whole (e.g. "Nuevo registro", "Exportar", "Configurar columnas"). Row-level or bulk-selection actions MUST NOT be placed in the page header — those belong in the per-row actions menu (`core-actions-menu`) or in a future bulk-action bar pattern.

#### Scenario: Single primary CTA is the canonical case

- **GIVEN** a module with one top-level action (e.g. "Nuevo registro")
- **WHEN** the L1 page header renders
- **THEN** exactly one `primary` button is shown in the actions area with a leading icon and a verb-first label

#### Scenario: Two or three CTAs use one primary plus ghost variants

- **GIVEN** a module with two or three top-level actions (e.g. "Nuevo", "Importar", "Exportar")
- **WHEN** the L1 page header renders
- **THEN** the rightmost CTA uses the `primary` variant and the others use the `ghost` variant, ordered from lower importance on the left to the primary action on the right

#### Scenario: A fourth CTA is rejected during review

- **GIVEN** a developer proposes adding a fourth CTA to a page header
- **WHEN** the PR is opened
- **THEN** the PR MUST be rejected during review — the capability is non-compliant; secondary CTAs MUST be relocated into a menu, into the row-level actions menu, or into a separate section of the page

#### Scenario: Row-level action is rejected in the header

- **GIVEN** a developer places a row-level action (e.g. "Aprobar seleccionados", "Eliminar registro actual") in the page header
- **WHEN** the PR is opened
- **THEN** the PR MUST be rejected during review — row-level actions belong in the per-row actions menu, not the page header

#### Scenario: Narrow viewport collapses secondary CTAs into an overflow menu

- **GIVEN** a page header with 2 or 3 CTAs rendered on a narrow viewport where all CTAs do not fit inline
- **WHEN** the header computes its layout
- **THEN** the `primary` CTA remains inline and the `ghost` CTAs collapse into an overflow menu triggered by a `⋯` button on the header's right edge

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

### Requirement: ResizablePanel component MUST provide horizontal and vertical split-pane layouts with persisted dimensions

The `<ResizablePanel>` component SHALL be the single canonical split-pane primitive in the financial-core. It SHALL accept props `orientation: 'horizontal' | 'vertical'` (default `'horizontal'`; `horizontal` splits left/right with a vertical splitter, `vertical` splits top/bottom with a horizontal splitter), `defaultSize: number` (initial size of panel-1 as a percentage 0–100; default `50`), `min1?: number | string` and `min2?: number | string` (minimum sizes per panel; numbers are percentages, strings ending in `'px'` are pixels — default `'200px'`), `max1?: number | string` and `max2?: number | string` (maximum sizes per panel; same encoding as min — no default cap), `storageKey?: string` (when set, the current size is persisted to `localStorage` under `resizable-panel:{storageKey}` and restored on mount). The component SHALL render two slots `<template #panel-1>` and `<template #panel-2>` separated by a draggable handle. The handle SHALL be implemented via `vueuse/useDraggable` (no external drag library beyond vueuse). The handle SHALL render a visible affordance (4px-wide bar with hover and focus states resolved through `core-theming` tokens). Keyboard support SHALL be mandatory: when the handle is focused, `←/→` (horizontal orientation) or `↑/↓` (vertical orientation) move the split by 5% per press, with `Shift` held increasing to 10%. Hardcoded colors / paddings are forbidden — every visual resolves through `core-theming`. Nesting `<ResizablePanel>` inside another `<ResizablePanel>`'s slot SHALL be permitted; persisting nested layouts requires distinct `storageKey` per instance.

#### Scenario: Horizontal split renders two panels side by side

- **GIVEN** a `<ResizablePanel orientation="horizontal" :defaultSize="40">` with two named slots
- **WHEN** the component renders
- **THEN** panel-1 occupies 40% of the container width on the left, panel-2 occupies 60% on the right, and a vertical drag handle separates them; the container takes the full height of its parent

#### Scenario: Vertical split renders two panels stacked

- **GIVEN** a `<ResizablePanel orientation="vertical" :defaultSize="60">`
- **WHEN** the component renders
- **THEN** panel-1 occupies 60% of the container height on top, panel-2 occupies 40% below, and a horizontal drag handle separates them

#### Scenario: Drag resizes panels respecting min and max constraints

- **GIVEN** a `<ResizablePanel :min1="'200px'" :max1="'600px'" :defaultSize="50">` and the user drags the handle to make panel-1 larger
- **WHEN** the drag would push panel-1 beyond 600px
- **THEN** the drag clamps at 600px; releasing the mouse with the cursor further right does not exceed the max; min applies symmetrically when shrinking

#### Scenario: Persisted dimensions restore on remount

- **GIVEN** a `<ResizablePanel :storageKey="'lex-clientes-detail'">` where the user resized to 35/65 and the component unmounts
- **WHEN** the component remounts (page reload, navigation back)
- **THEN** the panel sizes restore to 35/65 from `localStorage:resizable-panel:lex-clientes-detail` — the user's preferred layout persists across sessions

#### Scenario: Keyboard moves the split when handle is focused

- **GIVEN** a horizontal `<ResizablePanel>` and the user has tabbed to the drag handle (focus visible via the `--ring` token)
- **WHEN** the user presses `→` (right arrow)
- **THEN** the split moves 5% rightward; pressing `Shift+→` moves 10%; pressing `←` moves leftward; the changes respect min/max constraints; the focused state remains visible

#### Scenario: Hardcoded colors in handle styling are forbidden

- **GIVEN** a developer styles the handle hover state with a hex value (e.g., `background-color: #3b82f6`)
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the handle's idle / hover / focus states SHALL resolve through `core-theming` tokens (`--b3` for idle, `--brand` or `--ring` for hover/focus); raw color values are forbidden

#### Scenario: Nested ResizablePanels with distinct storageKeys persist independently

- **GIVEN** a `<ResizablePanel :storageKey="'outer'">` whose `panel-1` contains another `<ResizablePanel :storageKey="'inner-left'">`
- **WHEN** both layouts are resized and the page reloads
- **THEN** each instance restores from its own storage key; `outer` and `inner-left` do not collide

### Requirement: Carousel component MUST provide multi-item slide navigation with dots, arrows, and keyboard support

The `<Carousel>` component SHALL be the single canonical multi-item slide-gallery primitive in the financial-core. It SHALL accept props `itemsPerView: number` (default `1`; the number of slides visible simultaneously in the viewport), `showDots: boolean` (default `true`), `showArrows: boolean` (default `true`), `loop: boolean` (default `false`; when `true`, advancing past the last slide returns to the first), `autoplay: boolean` (default `false`), `autoplayInterval?: number` (default `5000`ms; ignored when `autoplay: false`). The component SHALL render slides via a repeatable slot `<template #slide="{ slide, index }">` driven by a `slides: T[]` prop. The implementation SHALL be built on `embla-carousel-vue` (the official Vue port of Embla); no other carousel library is permitted. The component SHALL render dot indicators below the slides (when `showDots: true`) and arrow navigation buttons on the left and right edges (when `showArrows: true`); both are toggleable independently. When the carousel area is focused, `←` and `→` SHALL navigate to the previous and next slide respectively. When `autoplay: true`, hovering the carousel SHALL pause the autoplay timer; mouse-leave resumes it. The component SHALL expose ARIA semantics: root with `role="region"`, the slide list with `role="tablist"`, each slide with `role="tab"`, and the active slide with `aria-current="true"`. Hardcoded colors are forbidden — dot indicator colors resolve through `core-theming` tokens.

#### Scenario: Carousel renders slides via the repeatable slot

- **GIVEN** a `<Carousel :slides="kpis" :itemsPerView="3">` with a `<template #slide="{ slide }">` rendering each KPI as a card
- **WHEN** the component renders
- **THEN** the first three slides are visible in the viewport; the slot template is invoked once per slide; the rest of the slides are off-viewport and accessible via navigation

#### Scenario: Dots and arrows are independently toggleable

- **GIVEN** a `<Carousel :showDots="true" :showArrows="false">`
- **WHEN** the component renders
- **THEN** the dot indicators render below the slides; the arrow buttons do NOT render — keyboard and dot-click are the only navigation paths

#### Scenario: Loop returns to the first slide after the last

- **GIVEN** a `<Carousel :loop="true" :slides="[s1, s2, s3]">` and the user is on `s3`
- **WHEN** the user clicks the next arrow (or presses `→`)
- **THEN** the carousel advances to `s1`; without `loop: true`, the next arrow would be disabled at `s3`

#### Scenario: Autoplay pauses on hover, resumes on mouse-leave

- **GIVEN** a `<Carousel :autoplay="true" :autoplayInterval="5000">` and the user hovers over the carousel area
- **WHEN** the hover begins
- **THEN** the autoplay timer pauses; on mouse-leave the timer resumes from where it paused (not from zero)

#### Scenario: Keyboard navigation when carousel is focused

- **GIVEN** the user has tabbed to the carousel and the focus ring is visible (resolved via `--ring` token)
- **WHEN** the user presses `→`
- **THEN** the carousel advances to the next slide; pressing `←` returns to the previous slide; the focus stays on the carousel root

#### Scenario: ARIA semantics expose the carousel structure

- **GIVEN** a `<Carousel>` rendered with three slides, currently displaying slide 2
- **WHEN** the DOM is inspected
- **THEN** the root has `role="region"`, the slide container has `role="tablist"`, each slide has `role="tab"`, and slide 2's element has `aria-current="true"` while slides 1 and 3 do not

#### Scenario: Adopting a competing carousel library is forbidden

- **GIVEN** a developer attempts to use `vue-slick-carousel`, `swiper-vue`, or a hand-rolled carousel
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the canonical library is `embla-carousel-vue`; the wrapper is the `<Carousel>` contracted here

