## MODIFIED Requirements

### Requirement: Inbox display layer MUST render `Solicitud.concept` as a title-cased Badge chip and SLA as a Badge chip with a clock icon

The Inbox page SHALL render the `Solicitud.concept` (business classifier) field in a `<Badge>` chip with text **in UPPERCASE** across all four view surfaces (list row, card body, kanban card body when applicable, Drawer info grid). The chip MUST NOT show the raw snake_case value: it SHALL apply a `humanizeConcept` transformation that replaces underscores with spaces and uppercases the entire string (e.g. `'aprobacion_pago'` → `'APROBACION PAGO'`, `'revision_legajo'` → `'REVISION LEGAJO'`). The chip variant SHALL be `neutral` (concept is a classifier, not a status — it doesn't carry semantic color).

The Inbox page SHALL also render the SLA value in a `<Badge>` chip with a `<Clock>` icon (from `lucide-vue-next`) across the list row, card footer, kanban card footer, and Drawer info grid. The chip variant SHALL be:

- `success` when the Solicitud is **in SLA** (the SLA window has not yet elapsed) — text reads `<n>h` (e.g. `"24h"`).
- `danger` when the Solicitud is **out of SLA** (deadline passed) — text reads `"Vencida"`.
- `neutral` when `sla_hours === null` / `undefined` — text reads `"—"` and the clock icon MAY be hidden.

The text content of both chips is identical to the previous bare-text rendering — this is a pure visual polish (chip wrapper + icon + UPPERCASE transformation); the underlying data and filter logic remain unchanged.

#### Scenario: concept renders as an UPPERCASE chip

- **GIVEN** a Solicitud with `concept: 'aprobacion_pago'`
- **WHEN** the list view renders the row
- **THEN** the concept cell contains a `<Badge variant="neutral">` whose text is `"APROBACION PAGO"`; the raw snake_case `"aprobacion_pago"` SHALL NOT appear; the title-cased form `"Aprobacion Pago"` SHALL NOT appear either

#### Scenario: SLA in-window renders a success chip with clock icon

- **GIVEN** a Solicitud with `sla_hours: 24` whose creation timestamp puts it within the window
- **WHEN** the list view renders the SLA cell
- **THEN** the cell contains a `<Badge variant="success">` with a `<Clock>` icon and the text `"24h"`

#### Scenario: SLA out-of-window renders a danger chip with clock icon and "Vencida" text

- **GIVEN** a Solicitud with `sla_hours: 8` whose creation timestamp puts it past the window
- **WHEN** the list view renders the SLA cell
- **THEN** the cell contains a `<Badge variant="danger">` with a `<Clock>` icon and the text `"Vencida"`

#### Scenario: No SLA tracking renders a neutral placeholder

- **GIVEN** a Solicitud with `sla_hours: null`
- **WHEN** the list view renders the SLA cell
- **THEN** the cell text reads `"—"` in neutral styling; the chip pattern + icon MAY be omitted in this case (the placeholder is the canonical "no SLA tracking" signal)

#### Scenario: Chip pattern is consistent across list, cards, kanban footer, drawer

- **GIVEN** the same Solicitud rendered in the list view, then the cards view, then the kanban card footer, then opened in the Drawer
- **WHEN** the user navigates between surfaces
- **THEN** the concept renders as a `<Badge variant="neutral">` with UPPERCASE text in all four surfaces; the SLA renders as a `<Badge>` with a `<Clock>` icon and the matching variant in all four surfaces (where applicable per the existing surface layouts); no surface displays raw snake_case concept, title-cased concept, or unwrapped SLA text

## ADDED Requirements

### Requirement: Inbox list, cards, and kanban views MUST display the assignee in the primary responsable cell, paired with the L3 assignee filter; the Drawer keeps both Owner and Asignado a as separate cards

The Inbox page's list / cards / kanban views SHALL display the **assignee** (the directed-to user — `Solicitud.assignee`) in the primary "responsable" cell, NOT the owner (`Solicitud.owner`, the transient currently-working user). The cell label SHALL be "Asignado a" (in Spanish) to align with the L3 filter label that operates on the same field. The Drawer info grid SHALL render TWO separate cards: **Asignado a** (reading `findUser(s.assignee)?.name`) AND **Owner** (reading `findUser(s.owner)?.name`) — preserving the audit-style distinction between "who this is directed to" and "who is actively working it now" for the detail surface only.

#### Scenario: List column header is "Asignado a"; cell shows the assignee name

- **GIVEN** a Solicitud with `assignee: 'u-1'`, `owner: null`
- **WHEN** the list view renders the row
- **THEN** the column header reads "Asignado a" (not "Responsable"); the cell shows the resolved name of `'u-1'` (e.g. `"Yasmani Rodríguez"`), NOT `"—"`

#### Scenario: List view filtering by assignee surfaces records whose Asignado a cell matches

- **GIVEN** a user picks `"Yasmani Rodríguez"` in the L3 assignee filter
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** every visible row's "Asignado a" cell reads `"Yasmani Rodríguez"` — the filter and the column show the same field; no row appears whose visible cell is empty or shows a different user

#### Scenario: Cards body shows "Asignado a" with the assignee name

- **GIVEN** the cards view rendering a Solicitud with `assignee: 'u-2'`, `owner: null`
- **WHEN** the card body renders
- **THEN** the body grid shows a row labeled "Asignado a" with the resolved name of `'u-2'`

#### Scenario: Kanban card footer shows the assignee with "Sin asignar" fallback

- **GIVEN** a kanban card whose Solicitud has `assignee: null`
- **WHEN** the card footer renders
- **THEN** the footer shows the text `"Sin asignar"` (not `"Sin owner"`)

#### Scenario: Drawer renders both Asignado a and Owner cards

- **GIVEN** a Solicitud with `assignee: 'u-1'`, `owner: null`
- **WHEN** the user opens the Drawer for the Solicitud
- **THEN** the info grid renders two distinct cards: an "Asignado a" card with `"Yasmani Rodríguez"` AND an "Owner" card with `"Sin asignar"` (since owner is null). The Drawer is the only surface where both fields render side-by-side; the list / cards / kanban views show only assignee.
