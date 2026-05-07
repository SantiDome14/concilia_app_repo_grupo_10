## ADDED Requirements

### Requirement: Sidebar MUST follow the fixed section ordering

The Sidebar SHALL be rendered in a fixed vertical order: Brand, Home link, one or more Blocks (each with its own Modules), a spacer, and the Account section at the bottom. This ordering is non-negotiable across apps.

#### Scenario: Sections render in the canonical order

- **GIVEN** any Ardua core app is rendered
- **WHEN** the Sidebar mounts
- **THEN** the visible top-to-bottom order is: Brand → Home → Blocks (with modules) → spacer → Account

#### Scenario: An app with no Blocks still renders Home and Account

- **GIVEN** an app declares zero Blocks (edge case during early scaffolding)
- **WHEN** the Sidebar renders
- **THEN** the Sidebar still renders Brand, Home, a spacer, and Account

### Requirement: Modules MUST be grouped under Blocks with labeled headers

Every Module entry SHALL belong to exactly one Block. Blocks SHALL render a label header above their module list. Ungrouped module entries are forbidden.

#### Scenario: Block label renders above its module list

- **GIVEN** a Block contains one or more Modules
- **WHEN** the Sidebar renders that Block
- **THEN** the Block label is rendered as an uppercase section header immediately above its module entries

#### Scenario: Collapsed sidebar hides Block labels

- **GIVEN** the Sidebar is in the collapsed state
- **WHEN** the Sidebar renders
- **THEN** Block labels are hidden but module icons remain visible and navigable

### Requirement: Navigation items MUST provide label, icon, and active state

Each navigation entry (Home, Module) SHALL expose a label, an icon from the `lucide-vue-next` set, and a visually distinct active state when the current route matches the entry's route name.

#### Scenario: Active route highlights its navigation entry

- **GIVEN** the user is on a specific route
- **WHEN** the Sidebar renders
- **THEN** the entry whose `name` matches the current route renders with the active-state brand background and the brand text color

#### Scenario: Collapsed sidebar preserves icons and tooltips

- **GIVEN** the Sidebar is collapsed
- **WHEN** the Sidebar renders
- **THEN** each entry still renders its icon and a `title` attribute that shows the label on hover

### Requirement: Topbar MUST render a breadcrumb derived from route meta

The Topbar SHALL render a breadcrumb derived from `route.meta.block` and `route.meta.breadcrumb`. The app brand (e.g. "APP · Ardua") SHALL NOT appear in the Topbar — the Sidebar is the sole location of the brand.

#### Scenario: Route with block metadata renders two-level breadcrumb

- **GIVEN** a route declares both `meta.block` and `meta.breadcrumb`
- **WHEN** the user navigates to that route
- **THEN** the Topbar renders `{block} / {breadcrumb}` with the block dimmed and the breadcrumb emphasized

#### Scenario: Top-level route renders single-label breadcrumb

- **GIVEN** a route declares only `meta.breadcrumb` without `meta.block` (e.g. Home / Dashboard)
- **WHEN** the user navigates to that route
- **THEN** the Topbar renders the breadcrumb as a standalone emphasized label

#### Scenario: Topbar omits the app brand

- **GIVEN** any authenticated page
- **WHEN** the Topbar renders
- **THEN** the Topbar MUST NOT render the app name — the brand lives exclusively in the Sidebar

### Requirement: Account section MUST expose Settings, Get Help, and Logout

The Account section at the bottom of the Sidebar SHALL open a menu that contains, in order: Settings, Get Help, a visual separator, and Logout. Logout SHALL use the danger color token.

#### Scenario: Account menu renders the canonical item list

- **GIVEN** the user clicks the Account trigger
- **WHEN** the menu opens
- **THEN** the menu renders Settings, Get Help, a separator, and Logout in that order

#### Scenario: Logout is visually distinct

- **GIVEN** the account menu is open
- **WHEN** the user scans the menu items
- **THEN** the Logout entry uses the danger text color and a danger-tinted hover background

#### Scenario: Placeholder handlers log without breaking

- **GIVEN** an app has not yet wired Settings or Get Help to real destinations
- **WHEN** the user clicks Settings or Get Help
- **THEN** the menu items remain clickable with no-op handlers (template default) until the app wires its real destinations

### Requirement: Every core module route MUST declare navigation metadata

Every module route SHALL declare `meta.breadcrumb` (label) and `meta.block` (parent section) in its `router/routes.ts` definition, so that Topbar and Sidebar can render the correct labels without hard-coded strings elsewhere.

#### Scenario: Route lacks metadata

- **GIVEN** a module route is being added to `router/routes.ts`
- **WHEN** the route omits `meta.breadcrumb` or `meta.block`
- **THEN** the PR MUST be rejected during review — the capability is non-compliant
