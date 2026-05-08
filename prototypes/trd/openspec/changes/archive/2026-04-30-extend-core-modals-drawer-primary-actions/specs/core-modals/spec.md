## MODIFIED Requirements

### Requirement: Workflow-typed records MUST open a Drawer side panel as the canonical detail surface

Record types whose detail view is a workflow rather than a static read-only display SHALL declare `meta.detail = 'drawer'`. For those record types, the row click SHALL open a `<Drawer>` Vue component that slides in from the right edge of the viewport at full viewport height, instead of opening the Detail modal contracted in the baseline. The `<Drawer>` MUST host the following regions in this order: (1) **header** with record id, title, status badge, and close `✕` button; (2) **primary-actions** rendered inline at the top of the drawer body, immediately below the header — these are the same actions that the row actions menu exposes (resolved from the same actions source); (3) **summary information** organized into one or more named semantic sections (canonical labels: `INFORMACIÓN`, `CONTEXTO`, `DETALLES`, `ASIGNACIÓN` — apps MAY add their own section labels); (4) **Timeline** section listing chronological events with timestamps; (5) **Comments** thread with threaded replies and a comment composer at the bottom. The footer is OPTIONAL and is reserved for legacy or non-workflow secondary actions only — workflow records SHALL NOT place their primary actions in the footer. Record types without `meta.detail = 'drawer'` SHALL keep using the Detail modal — the Drawer is opt-in per record type.

#### Scenario: Row click on a record with meta.detail = 'drawer' opens the Drawer

- **GIVEN** a record type declares `meta.detail = 'drawer'` (canonical examples: Solicitudes in Inbox, Alertas)
- **WHEN** the user clicks any row of that record type in the table
- **THEN** the `<Drawer>` component slides in from the right edge of the viewport at full viewport height and the Detail modal does NOT open

#### Scenario: Drawer renders header, primary-actions, summary information, Timeline, and Comments regions

- **GIVEN** a `<Drawer>` is open for a Solicitud (or any workflow-typed record)
- **WHEN** the drawer renders
- **THEN** the regions render in this top-down order: header (record id + title + status badge + close `✕`), primary-actions row (the record's available actions rendered inline as buttons), one or more summary-information sections each labeled with a semantic header (e.g. `INFORMACIÓN`, `CONTEXTO`, `DETALLES`, `ASIGNACIÓN`), a Timeline region with chronological timestamped events, and a Comments thread with threaded replies and a composer

#### Scenario: Record types without meta.detail = 'drawer' keep using the Detail modal

- **GIVEN** a record type does NOT declare `meta.detail = 'drawer'` (e.g., a static catalogue record)
- **WHEN** the user clicks a row of that record type
- **THEN** the existing Detail modal opens per the baseline contract and the `<Drawer>` does NOT mount

#### Scenario: Drawer primary-actions resolve from the same source as the row actions menu

- **GIVEN** a `<Drawer>` is open for a record whose row actions menu exposes actions A, B, and C
- **WHEN** the drawer's primary-actions region renders
- **THEN** the region exposes the same actions A, B, and C resolved from the identical actions source — divergence between the two surfaces is forbidden, AND these actions render inline at the top of the drawer body, NOT in the footer

#### Scenario: Comment composer is the bottom-most interactive element of the drawer body, not a footer row

- **GIVEN** a `<Drawer>` is open for a workflow-typed record with the Comments thread populated and a footer slot left empty
- **WHEN** the user reads the drawer top-down
- **THEN** after the Timeline and the Comments thread, the comment composer (textarea + "Comentar" button) is the last interactive element inside the body — there is NO additional row of primary action buttons in the footer; primary CTAs were already presented at the top of the body via the primary-actions region

#### Scenario: Footer is reserved for legacy or non-workflow secondary actions only

- **GIVEN** a workflow-typed record's Drawer is open
- **WHEN** the page authors decide where to place the record's primary actions
- **THEN** the actions MUST go into the primary-actions region at the top of the body; placing them inside the footer slot is a contract violation, AND the footer slot remains available exclusively for legacy or non-workflow secondary affordances (e.g. a "Cerrar drawer" link, a non-action informational summary)
