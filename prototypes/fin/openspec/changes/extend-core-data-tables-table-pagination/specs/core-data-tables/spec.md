## MODIFIED Requirements

### Requirement: Tables MUST support client-side pagination with ellipsis navigation through the shared `<TablePagination>` component

Tables SHALL paginate using a page-size selector and a page number list with ellipsis truncation for large datasets. The footer SHALL render through the shared `<TablePagination>` component (`@/components/data-display/TablePagination`), which exposes: `Page X of Y · N resultado(s)` info text, a page-size selector (`Show:`), the numbered button list with `…` overflow, and `‹` / `›` arrow buttons.

Page state SHALL be sourced from `useTable<T>()` (per the "Tables MUST use the `useTable` composable for client-side data" Requirement) and bound to the component via `v-model:page` / `v-model:page-size`. The component is controlled — it holds NO internal state of its own; it reflects the props it receives and emits updates via `update:page` and `update:page-size`.

Inline pagination markup (custom footer in the page template) or hand-rolled state refs (`page`, `pageSize`, `totalPages`, `goPage(delta)`, `pagedRecords`, etc.) in page components are forbidden — even when the visual output looks similar to the canon. `<TablePagination>` is the single canonical surface; the next agent reading the spec MUST find no ambiguity about which pagination implementation to ship.

#### Scenario: Pagination info is always present

- **GIVEN** a table rendered with any amount of data
- **WHEN** the footer renders through `<TablePagination>`
- **THEN** it shows `"Page {N} of {T} · {total} resultado(s)"` (singular/plural agreement on `resultado`)

#### Scenario: Ellipsis appears for large page counts

- **GIVEN** a dataset with `totalPages > 7`
- **WHEN** `<TablePagination>` renders the navigation
- **THEN** the page list shows: first page, optional `…` ellipsis, surrounding pages (current ± 1), optional `…` ellipsis, last page

#### Scenario: Small page counts render every page

- **GIVEN** a dataset with `totalPages <= 7`
- **WHEN** `<TablePagination>` renders the navigation
- **THEN** every page from 1 to `totalPages` is rendered as a numbered button with no `…` ellipsis

#### Scenario: Changing page size emits resetting to page 1

- **GIVEN** a table currently on a page greater than 1
- **WHEN** the user changes the value in the page-size selector inside `<TablePagination>`
- **THEN** the component emits `update:page-size` with the new value AND emits `update:page` with `1`
- **AND** the parent invokes `useTable.setPage(1)` and `useTable.setPageSize(newValue)` accordingly

#### Scenario: Current page is highlighted

- **GIVEN** the table is on page 3 of 5
- **WHEN** `<TablePagination>` renders
- **THEN** the button for page 3 has the `bg-info-bg text-info` highlight (active state) while the other buttons render with the neutral state

#### Scenario: First / last navigation is disabled at edges

- **GIVEN** the table is on page 1
- **WHEN** `<TablePagination>` renders
- **THEN** the `‹` button is `disabled` and renders with the disabled-state opacity
- **AND** when the table is on the last page, the `›` button is `disabled` analogously

#### Scenario: Hand-rolled pagination state in page components is rejected

- **GIVEN** a page composes its own `pageX`, `pageSize`, `totalPages`, `goPage(delta)` refs / computeds and renders custom pagination buttons inline in the page template instead of mounting `<TablePagination>`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the only spec-compliant client-side pagination surface is the pair `useTable<T>()` (state) + `<TablePagination>` (UI)

#### Scenario: Custom footer markup in page template is rejected

- **GIVEN** a page imports `useTable<T>` correctly but renders its own `<div class="pagination-footer">...</div>` block (Prev / Next buttons only, or numbered buttons inlined) instead of mounting `<TablePagination>`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — even with correct state, the visual surface MUST be `<TablePagination>` so future visual changes propagate uniformly
