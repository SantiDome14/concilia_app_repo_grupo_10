## ADDED Requirements

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
