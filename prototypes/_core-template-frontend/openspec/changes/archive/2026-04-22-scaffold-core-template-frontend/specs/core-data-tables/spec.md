## ADDED Requirements

### Requirement: Tables MUST render inside a bordered, rounded surface

Every data table SHALL be wrapped in a container with the standard card background, border tokens, and rounded corners. The `<table>` element SHALL use `border-collapse` and fill 100% of the container width.

#### Scenario: Table surface uses standard tokens

- **GIVEN** a page declares a data table in its L3 section
- **WHEN** the table is rendered
- **THEN** the wrapper applies `bg-card-2`, `border border-b-2`, and a rounded-corner token; the table itself fills the container width

### Requirement: Table headers MUST follow uppercase, letter-spaced typography

Column headers SHALL use the uppercase, bold, letter-spaced token style defined by the design system. Left alignment is the default; the actions column SHALL be centered and width-constrained.

#### Scenario: Header cells use the canonical typography

- **GIVEN** a table header row is defined
- **WHEN** a `<th>` cell is rendered
- **THEN** it applies the `text-[10px] font-bold uppercase tracking-wider text-t-3` token combination

#### Scenario: Actions header is centered and fixed-width

- **GIVEN** a table exposes an actions column
- **WHEN** the header row is rendered
- **THEN** the actions `<th>` is centered and constrained to a narrow fixed width (approximately 40px)

### Requirement: Table rows MUST open a detail view on click

Clicking anywhere on a row SHALL open the detail modal (or navigate to a detail route) for that record. The actions cell SHALL stop propagation so that its interactions do not trigger the row click.

#### Scenario: Clicking a row opens the detail

- **GIVEN** a data table with at least one record
- **WHEN** the user clicks a row outside the actions cell
- **THEN** the record's detail surface opens

#### Scenario: Clicking inside the actions cell does NOT open the detail

- **GIVEN** a row with an open or closed actions menu
- **WHEN** the user clicks the actions button or any item inside the actions menu
- **THEN** the row-level click handler is NOT triggered

#### Scenario: Rows provide a visible hover state

- **GIVEN** a data table with data rows
- **WHEN** the user hovers a row
- **THEN** the row background shifts to the hover token to signal interactivity

### Requirement: Section header MUST expose search, filters, and result count

Above every table, a section header SHALL render: a section title, a search input (with prefix icon), a flexible spacer, one or more filter triggers, and a result-count indicator. The header SHALL wrap on narrow viewports.

#### Scenario: Search narrows the visible rows as the user types

- **GIVEN** a table configured with `searchFields`
- **WHEN** the user types into the search input
- **THEN** the table filters rows against the configured search fields without requiring a submit action

#### Scenario: Active filters display a result count

- **GIVEN** at least one filter or search term is active and produces a result set different from the full dataset
- **WHEN** the section header renders
- **THEN** the header displays `"{N} resultado(s)"` next to the filter controls

#### Scenario: Clearing all filters hides the result count

- **GIVEN** previously active filters
- **WHEN** all filters and the search input are empty
- **THEN** the result-count indicator is hidden

### Requirement: Filter triggers MUST use the dropdown pattern

Each filter SHALL be triggered by a button with a label, a chevron affordance, and a selected-state visual treatment. The dropdown SHALL render immediately below the trigger with a standard menu layout: an uppercase label, a "Todos" clear option (when applicable), and the filter options.

#### Scenario: Filter trigger reflects selection state

- **GIVEN** a filter has a selected value
- **WHEN** the trigger is rendered
- **THEN** the trigger applies the `border-info` and info-text tokens to signal the active filter

#### Scenario: "Todos" clears the selection

- **GIVEN** a filter with a current non-empty selection
- **WHEN** the user selects "Todos" from the filter dropdown
- **THEN** the filter's value is cleared and the table recomputes the visible rows

### Requirement: Tables MUST support client-side pagination with ellipsis navigation

Tables SHALL paginate using a page-size selector and a page number list with ellipsis truncation for large datasets. The footer SHALL render: the current page info, a page-size select, and the page navigation control.

#### Scenario: Pagination info is always present

- **GIVEN** a table rendered with any amount of data
- **WHEN** the footer renders
- **THEN** it shows `"Page {N} of {T} · {total} resultado(s)"`

#### Scenario: Ellipsis appears for large page counts

- **GIVEN** a dataset with a total page count greater than 7
- **WHEN** the page navigation renders
- **THEN** the page list shows: first page, optional ellipsis, surrounding pages (current ± 1), optional ellipsis, last page

#### Scenario: Changing page size resets to page 1

- **GIVEN** a table currently on a page greater than 1
- **WHEN** the user changes the page-size selector
- **THEN** the current page is reset to 1 and the table renders with the new page size

### Requirement: Empty states MUST be explicit

When a table has no rows — either because the dataset is empty or because filters produced no matches — the table SHALL render an explicit empty-state row with a neutral message.

#### Scenario: No results message fills the table

- **GIVEN** the current page has zero visible rows
- **WHEN** the table body renders
- **THEN** a single row with `colspan` covering all columns renders a centered "Sin resultados" message

### Requirement: Tables MUST use the `useTable` composable for client-side data

Client-side tables (data already in memory, non-paginated API) SHALL use the `useTable` composable for search, filters, and pagination. Server-side tables SHALL use `@tanstack/vue-query` with server-side params. Hand-rolled pagination logic inside page components is forbidden.

#### Scenario: Client-side table uses useTable

- **GIVEN** a table operates on in-memory data (small reference lists, settings screens)
- **WHEN** the page composes the table state
- **THEN** it uses `useTable<T>({ data, searchFields, pageSize })` instead of hand-rolled pagination

#### Scenario: Server-side table uses vue-query

- **GIVEN** a table fetches paginated data from an API
- **WHEN** the page composes the query
- **THEN** it uses `useQuery` with `params` that include `page`, `pageSize`, `search`, and filter values — pagination state is owned by the query key
