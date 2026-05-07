## ADDED Requirements

### Requirement: Sidebar MUST render generic core modules above Domain Blocks without a Block label

The `<Sidebar>` component SHALL render the four canonical generic core modules — Dashboard, Inbox, Alertas, Reportes — as a flat group between Brand and the first Domain Block. The group MUST NOT be wrapped in a Block container and MUST NOT carry a Block label header. The vertical order of the Sidebar SHALL be: Brand → Generics (flat, no Block label) → Domain Blocks (each with its own label header) → spacer → Account. The `<Sidebar>` component MUST accept a `generics` slot or prop separate from the `blocks` slot or prop, so the rendering rule (no Block wrapper, no label header) is enforced structurally. Apps that do not use one of the four generics SHALL omit that entry rather than restructure the section.

#### Scenario: Sidebar renders the four canonical generics between Brand and the first Block

- **GIVEN** an app declares all four generics (Dashboard, Inbox, Alertas, Reportes) and one or more Domain Blocks
- **WHEN** the `<Sidebar>` mounts
- **THEN** the visible top-to-bottom order is Brand → Dashboard → Inbox → Alertas → Reportes → first Domain Block (with its label header) → subsequent Domain Blocks → spacer → Account

#### Scenario: Generics group MUST NOT render a Block label header

- **GIVEN** the `<Sidebar>` is rendering the generics group
- **WHEN** the generics group renders
- **THEN** there MUST NOT be an uppercase Block label header above the four generics, and the four entries MUST sit at the same visual level as a module entry inside a Block

#### Scenario: An app that omits a generic does not restructure the section

- **GIVEN** an app declares only Dashboard, Inbox, and Reportes (it has no Alertas module yet)
- **WHEN** the `<Sidebar>` mounts
- **THEN** the generics group renders Dashboard → Inbox → Reportes in that order, with no Alertas entry, and the missing generic MUST NOT be replaced by a domain module or wrapped in a Block to compensate

#### Scenario: Generics slot is structurally separate from blocks slot

- **GIVEN** a developer is composing the `<Sidebar>` with `<Sidebar :generics="generics" :blocks="blocks" />`
- **WHEN** the developer attempts to pass a Block label inside the `generics` array
- **THEN** the `generics` prop type MUST NOT accept a label field — the type system rejects the attempt at compile time

### Requirement: Topbar breadcrumb MUST append the active sub-tab as a third segment

When a route declares `meta.breadcrumb` and the active page has a selected sub-tab (a Segmenter from `core-layout`), the Topbar breadcrumb SHALL append the sub-tab label as a third segment. Domain modules render `{block} / {module} / {sub-tab}`; generic modules (Dashboard, Inbox, Alertas, Reportes) render `{module} / {sub-tab}` without a block segment because they do not belong to a Block. Drawers, modals, and sub-sections MAY append additional segments via a `useBreadcrumb()` composable that exposes `setExtraSegment(label)` and `clearExtraSegment()`. The composable MUST own the reactive segment state and MUST be the only path by which non-route segments reach the Topbar.

#### Scenario: Domain module with sub-tab renders three-segment breadcrumb

- **GIVEN** a route in a Domain Block declares `meta.block = 'Tesorería'` and `meta.breadcrumb = 'Movimientos'`, and the page's Segmenter has 'Activos' selected
- **WHEN** the user views the Topbar
- **THEN** the breadcrumb renders `Tesorería / Movimientos / Activos` with the block dimmed, the module emphasized, and the sub-tab emphasized as the trailing segment

#### Scenario: Generic module with sub-tab renders two-segment breadcrumb without block

- **GIVEN** the user is on the Alertas generic with the Segmenter set to 'Nuevas'
- **WHEN** the user views the Topbar
- **THEN** the breadcrumb renders `Alertas / Nuevas` — the block segment MUST be omitted because Alertas does not belong to a Domain Block

#### Scenario: Generic module without sub-tab renders single segment

- **GIVEN** the user is on the Dashboard generic, which has no Segmenter
- **WHEN** the user views the Topbar
- **THEN** the breadcrumb renders `Dashboard` as a standalone emphasized label with no leading block segment and no trailing sub-tab segment

#### Scenario: Drawer appends an extra segment via useBreadcrumb

- **GIVEN** the user is on `Inbox / Activos` and opens the detail drawer for solicitud R-042
- **WHEN** the page's `onMounted`-equivalent calls `useBreadcrumb().setExtraSegment('Detalle R-042')`
- **THEN** the Topbar breadcrumb renders `Inbox / Activos / Detalle R-042`, and when the drawer closes the page calls `clearExtraSegment()` and the breadcrumb returns to `Inbox / Activos`

### Requirement: Routes MAY declare meta.placeholder to render the PlaceholderPage shell

A route MAY declare `meta.placeholder = true` in `router/routes.ts`. When this flag is present, the app shell SHALL render the `<PlaceholderPage>` component instead of the L1/L2/L3 page shell from `core-layout`. `<PlaceholderPage>` MUST accept three props: `icon` (a `lucide-vue-next` icon component), `title` (a short string, e.g. `"Próximamente"`), and `sub` (a one-line subtitle string). The Sidebar entry for a placeholder route SHALL still render and be navigable — clicking it lands on `<PlaceholderPage>`, NOT on a 404 page and NOT on an empty L1/L2/L3 shell. A placeholder route MAY still declare `meta.breadcrumb` and `meta.block` so the Topbar renders the correct breadcrumb. `meta.placeholder` is mutually exclusive with the L1/L2/L3 shell — when the team builds the real module they MUST remove the `meta.placeholder` flag.

#### Scenario: Placeholder route renders the PlaceholderPage component

- **GIVEN** a route declares `meta.placeholder = true`, `meta.breadcrumb = 'Conciliación'`, and `meta.block = 'Tesorería'`, with `icon`, `title`, and `sub` props passed to `<PlaceholderPage>`
- **WHEN** the user navigates to that route
- **THEN** the shell renders `<PlaceholderPage>` with the supplied icon + title + sub instead of an L1/L2/L3 page shell, and the Topbar breadcrumb renders `Tesorería / Conciliación`

#### Scenario: Sidebar entry for a placeholder route is navigable

- **GIVEN** an app declares a Sidebar module entry that points to a placeholder route
- **WHEN** the `<Sidebar>` renders
- **THEN** the entry MUST be visible and navigable — clicking it routes to the placeholder, and the entry MUST NOT be hidden, dimmed-as-disabled, or filtered out of the Sidebar

#### Scenario: Placeholder route MUST NOT 404

- **GIVEN** a route declares `meta.placeholder = true`
- **WHEN** the user navigates to that route
- **THEN** the router MUST resolve to `<PlaceholderPage>` rather than the NotFound route — placeholder is a first-class shell, not an error fallback

#### Scenario: Removing meta.placeholder restores the L1/L2/L3 shell

- **GIVEN** a route previously declared `meta.placeholder = true` and the team has now built the real L1/L2/L3 module
- **WHEN** the developer removes `meta.placeholder` from the route definition and points the route at the real page component
- **THEN** the shell renders the L1/L2/L3 page shell from `core-layout`, the Sidebar entry continues to render unchanged, and the breadcrumb continues to render from `meta.breadcrumb` and `meta.block`
