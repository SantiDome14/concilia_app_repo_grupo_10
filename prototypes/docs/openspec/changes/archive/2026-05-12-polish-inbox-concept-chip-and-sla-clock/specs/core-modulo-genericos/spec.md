## ADDED Requirements

### Requirement: Inbox display layer MUST render `Solicitud.concept` as a title-cased Badge chip and SLA as a Badge chip with a clock icon

The Inbox page SHALL render the `Solicitud.concept` (business classifier) field in a `<Badge>` chip with title-cased text across all four view surfaces (list row, card body, kanban card body when applicable, Drawer info grid). The chip MUST NOT show the raw snake_case value: it SHALL apply a `humanizeConcept` transformation that replaces underscores with spaces and capitalizes the first letter of each word (e.g. `'aprobacion_pago'` → `'Aprobacion Pago'`, `'revision_legajo'` → `'Revision Legajo'`). The chip variant SHALL be `neutral` (concept is a classifier, not a status — it doesn't carry semantic color).

The Inbox page SHALL also render the SLA value in a `<Badge>` chip with a `<Clock>` icon (from `lucide-vue-next`) across the list row, card footer, kanban card footer, and Drawer info grid. The chip variant SHALL be:

- `success` when the Solicitud is **in SLA** (the SLA window has not yet elapsed) — text reads `<n>h` (e.g. `"24h"`).
- `danger` when the Solicitud is **out of SLA** (deadline passed) — text reads `"Vencida"`.
- `neutral` when `sla_hours === null` / `undefined` — text reads `"—"` and the clock icon MAY be hidden.

The text content of both chips is identical to the previous bare-text rendering — this is a pure visual polish (chip wrapper + icon + title-case transformation); the underlying data and filter logic remain unchanged.

#### Scenario: concept renders as a title-cased chip

- **GIVEN** a Solicitud with `concept: 'aprobacion_pago'`
- **WHEN** the list view renders the row
- **THEN** the concept cell contains a `<Badge variant="neutral">` whose text is `"Aprobacion Pago"`; the raw snake_case `"aprobacion_pago"` SHALL NOT appear

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
- **THEN** the concept renders as a `<Badge variant="neutral">` with `humanizeConcept(s.concept)` in all four surfaces; the SLA renders as a `<Badge>` with a `<Clock>` icon and the matching variant in all four surfaces (where applicable per the existing surface layouts); no surface displays raw snake_case concept or unwrapped SLA text
