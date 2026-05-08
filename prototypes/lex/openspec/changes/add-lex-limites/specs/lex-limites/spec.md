## ADDED Requirements

### Requirement: Tab MUST segment limits by entity, gated by docket presence

The Límites tab body SHALL render up to two sections in this order: `Haz Pagos` (visible only when the Cliente's `haz_docket` is non-null) and `Circuit Pay` (visible only when `circuit_docket` is non-null). Each section SHALL contain a header showing the consumption total, available amount, plus a list of limit cards in the order: Activo first, then by `end_date` descending. When neither docket is present the tab itself SHALL NOT be reachable (per `lex-cliente-detalle` Requirement "Page MUST expose four sub-tabs with conditional Límites visibility").

#### Scenario: Cliente with both dockets renders both sections

- **GIVEN** a Cliente with `haz_docket='HAZ-100'` and `circuit_docket='CIR-200'`
- **WHEN** the tab renders
- **THEN** both `Haz Pagos` and `Circuit Pay` sections are visible

#### Scenario: Cliente with only haz_docket hides Circuit Pay

- **GIVEN** a Cliente with `haz_docket='HAZ-100'` and `circuit_docket=null`
- **WHEN** the tab renders
- **THEN** only the `Haz Pagos` section is visible

#### Scenario: Activo limit is rendered first

- **GIVEN** a section with one Activo limit (`end_date=2026-12-31`) and two Expirado limits (`end_date=2025-06-30` and `end_date=2024-12-31`)
- **WHEN** the section renders
- **THEN** the visual order is Activo, then `2025-06-30`, then `2024-12-31`

---

### Requirement: Limit card MUST surface state, consumption, origins, and date range

Each limit card SHALL render: a state badge (Pendiente / Activo / Expirado) using semantic CSS variables (`--badge-pendiente`, `--badge-activo`, `--badge-expirado`), the date range formatted `dd/MM/yyyy → dd/MM/yyyy`, the limit amount in the entity currency, a consumption progress bar with the percentage label, the available amount or overage flag if `consumed > amount`, and pills listing each selected origin from the 15-option catalog. When the `Otros` origin is among the pills, the pill SHALL expose a native `title` tooltip containing the clarification text (per REQ-44, see Requirement "Otros clarification MUST be required and visible on the card").

#### Scenario: Activo card with consumption

- **GIVEN** a limit with `amount=1000000`, `consumed=350000`, `start_date=2026-04-01`, `end_date=2026-12-31`
- **WHEN** today is `2026-05-06` and the card renders
- **THEN** the badge reads `Activo`, the progress bar fills at 35%, the available amount reads `$ 650.000`, and the date range reads `01/04/2026 → 31/12/2026`

#### Scenario: Overage flag

- **GIVEN** a limit with `amount=1000000` and `consumed=1100000`
- **WHEN** the card renders
- **THEN** the progress bar reads 110% in the danger colour and a tag `Sobregiro $ 100.000` is shown

#### Scenario: Origins render as pills

- **GIVEN** a limit with `origins=['Recibo de Sueldo','DDJJ Ganancias']`
- **WHEN** the card renders
- **THEN** two pills appear with the literal labels `Recibo de Sueldo` and `DDJJ Ganancias`

---

### Requirement: Crear Límite modal MUST validate the 15-option origin catalog and amount

The `Crear Límite` CTA SHALL open a Create modal collecting: `origin` (multi-select over the 15-option catalog defined in `discoveries/lex-limites-discovery.md` §3.3, at least one option required), `amount` (positive number, formatted with thousand separators and two decimals), `start_date`, `end_date` (must be after `start_date`). On submit it SHALL call `POST /limit { client_id, entity, ...rest }` where `entity` is `HAZ_PAGOS` or `CIRCUIT_PAY` depending on which section opened the modal. Per `core-forms` the multi-select SHALL use the shadcn-vue Select with multi-mode, never a native `<select>`. The CTA SHALL be hidden for `VIEWER_LEX` users per `lex-roles`.

#### Scenario: Multi-select requires at least one origin

- **GIVEN** the modal is open with no origins selected
- **WHEN** the user attempts to submit
- **THEN** the submit button is disabled and an inline error reads `Seleccioná al menos un origen`

#### Scenario: end_date must be after start_date

- **GIVEN** `start_date=2026-06-01` and the user picks `end_date=2026-05-15`
- **WHEN** the form validates on blur
- **THEN** an inline error reads `La fecha de fin debe ser posterior a la fecha de inicio`

#### Scenario: Amount input formats thousands and decimals

- **GIVEN** the user types `1000000` in the amount field
- **WHEN** the field loses focus
- **THEN** the visible text becomes `1.000.000,00` and the underlying form value is the numeric `1000000`

---

### Requirement: Otros clarification MUST be required and visible on the card

When the user selects the `Otros` option in the origin multi-select of the Crear Límite modal, the form SHALL surface a conditional `Aclaración` field (textarea, max 500 characters) directly beneath the multi-select. The field SHALL be required only when `Otros` is selected; deselecting `Otros` SHALL hide and clear the field. On the limit card, the `Otros` pill SHALL expose the clarification as a native `title` tooltip per REQ-44 D-03 in `discoveries/lex-limites-discovery.md` §6. This requirement applies to limits created after the v1 of REQ-44; pre-existing limits without clarification render without a tooltip.

#### Scenario: Aclaración field appears when Otros is selected

- **GIVEN** the modal is open and the user toggles `Otros` in the origin multi-select
- **WHEN** the toggle commits
- **THEN** an `Aclaración` textarea appears below the multi-select with placeholder `Indicar el origen específico` and a character counter `0 / 500`

#### Scenario: Aclaración is required when Otros is selected

- **GIVEN** `Otros` is selected and `Aclaración` is empty
- **WHEN** the user attempts to submit
- **THEN** the submit button is disabled and an inline error reads `La aclaración es obligatoria cuando seleccionás Otros`

#### Scenario: Aclaración disappears when Otros is deselected

- **GIVEN** the user has selected `Otros` and entered text in `Aclaración`
- **WHEN** the user deselects `Otros`
- **THEN** the `Aclaración` field hides and its value is cleared from the form state

#### Scenario: Limit card surfaces the clarification on hover

- **GIVEN** a limit whose origins include `Otros` with clarification `Honorarios profesionales 2026`
- **WHEN** the user hovers the `Otros` pill
- **THEN** the native tooltip displays `Honorarios profesionales 2026`

---

### Requirement: Editar action MUST be exposed for non-Expirado limits and limited to monto + fecha de fin

The limit card SHALL expose an `Editar` action only for limits whose derived state is `Activo` or `Pendiente`. Triggering the action SHALL open the Edit modal pre-filled with `amount` and `end_date`. All other fields (origins, `Otros` clarification, `start_date`) SHALL be read-only per REQ-45 §5.2. On submit the page SHALL call `PATCH /limit/:id { amount, end_date }` and refetch the tab. Successful edit SHALL surface a toast `Límite actualizado`. The Editar action MUST be hidden for `VIEWER_LEX` and `COMMERCIAL_LEX` users per `lex-roles`.

#### Scenario: Editar is hidden on Expirado limits

- **GIVEN** a limit whose derived state is `Expirado`
- **WHEN** the card renders
- **THEN** the Editar action is not rendered

#### Scenario: Edit modal pre-fills amount and end_date only

- **GIVEN** an `Activo` limit with `amount=500000`, `start_date=2026-04-01`, `end_date=2026-12-31`, `origins=['Recibo de Sueldo']`
- **WHEN** the user opens the Edit modal
- **THEN** the `amount` and `end_date` inputs are editable and pre-filled; `start_date`, `origins`, and `Aclaración` (when applicable) are read-only

#### Scenario: end_date must remain after start_date

- **GIVEN** the limit's `start_date=2026-04-01` and the user changes `end_date` to `2026-03-15`
- **WHEN** the form validates on blur
- **THEN** the inline error reads `La fecha de fin debe ser posterior a la fecha de inicio` and submit is disabled

---

### Requirement: Eliminar action MUST go through the destructive confirmation pattern

The card Acciones menu SHALL expose `Eliminar`. Triggering it SHALL open a destructive confirmation dialog per `core-modals` Requirement "Confirmation dialogs MUST follow the destructive action pattern" — danger-accent header, the limit's date range and amount in the body, verb-specific action label `Eliminar`, ghost `Cancelar` on the left, danger-variant `Eliminar` on the right. Confirmation SHALL fire `DELETE /limit/:id` and refetch the tab. Eliminating a limit removes its consumption history; the body MUST warn the user explicitly. The Eliminar action MUST be hidden for `VIEWER_LEX` and `COMMERCIAL_LEX` users per `lex-roles`.

#### Scenario: Confirmation surfaces date range and warning

- **GIVEN** a limit with `start_date=2026-04-01`, `end_date=2026-12-31`, `amount=500000`
- **WHEN** the user clicks `Eliminar`
- **THEN** the dialog body contains `01/04/2026 → 31/12/2026 · $ 500.000` and the warning `Se elimina junto con el historial de consumo`

#### Scenario: Confirmed deletion succeeds

- **GIVEN** the user clicks `Eliminar` in the dialog
- **WHEN** `DELETE /limit/:id` returns 204
- **THEN** the dialog closes, the card disappears, the tab refetches, and a toast `Límite eliminado` is shown

#### Scenario: Eliminar is hidden for COMMERCIAL_LEX

- **GIVEN** a `COMMERCIAL_LEX` user views a limit card
- **WHEN** the Acciones menu renders
- **THEN** the `Eliminar` action is not present
