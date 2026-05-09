## MODIFIED Requirements

### Requirement: The Instructions page MUST be a Type-A master list registered at `/instructions`

The page SHALL be implemented at `src/pages/Instructions.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Instrucciones'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + primary CTA), filter row, paginated table, footer with pagination ellipsis. The legacy paths `/settings/instructions`, `/settings/instructions/:id`, and `/settings/instructions/:id/view` SHALL redirect: the bare path lands on `/instructions`; the `:id` paths land on `/instructions?detail=:id` so the Detail modal opens at the targeted row.

#### Scenario: Authenticated navigation to `/instructions` renders the Type-A page shell

- **GIVEN** an authenticated OPS user
- **WHEN** the user navigates to `/instructions`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main), the page header shows the title `Instrucciones` and the primary CTA `+ Crear instrucción`, and the filter row + paginated table render below

#### Scenario: Legacy URL redirects to the unified page with the detail modal pre-opened

- **GIVEN** an authenticated user navigates to the legacy path `/settings/instructions/abc-123/view`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/instructions?detail=abc-123` with the Instructions list rendered and the Detail modal mounted on top, showing the instruction with id `abc-123`

#### Scenario: Sidebar surfaces the page under the `Catálogos` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block whose entry `Instrucciones` links to `/instructions`; entries for additional `Catálogos` modules MAY appear when their respective capabilities land
