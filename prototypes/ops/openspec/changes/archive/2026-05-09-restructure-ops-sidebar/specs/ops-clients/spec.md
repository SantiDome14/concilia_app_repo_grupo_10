## MODIFIED Requirements

### Requirement: The Clients page MUST be a Type-A master list registered at `/clients`

The page SHALL be implemented at `src/pages/Clients.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Clientes'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + primary CTA `Alta de Cliente en APP`), filter row, paginated table, footer with pagination ellipsis. The legacy path `/users` SHALL redirect to `/clients`. The detail surface for an individual client SHALL NOT be a modal; per `core-module-types`, dense detail surfaces (info card + accounts + movements) belong on a Type-B page (see Requirement 6).

#### Scenario: Authenticated navigation to `/clients` renders the Type-A page shell

- **GIVEN** an authenticated OPS user with role `OPS_ADMIN`
- **WHEN** the user navigates to `/clients`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main), the page header shows the title `Clientes` and the primary CTA `Alta de Cliente en APP`, and the filter row + paginated table render below

#### Scenario: Legacy /users URL redirects to /clients preserving filter query params

- **GIVEN** an authenticated user navigates to the legacy path `/users?name=acme&page=2`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/clients?name=acme&page=2` with the master list rendered and filters applied; no intermediate redirect screen is shown

#### Scenario: Sidebar surfaces the page under the `Catálogos` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block whose first entry is `Clientes` linking to `/clients`; the entry receives the active style when the route matches `/clients` or `/clients/:id`
