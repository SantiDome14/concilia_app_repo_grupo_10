## ADDED Requirements

### Requirement: Sidebar entry MUST be top-level with a deduped active-count badge

The Sidebar SHALL render a top-level entry labelled `Alertas` reachable at `/alertas`, alongside Clientes, Altas, Blacklist, Usuarios. The entry SHALL display a numeric badge equal to the count of alerts whose `status` is `new` or `in_review` and whose visibility for the current user is allowed by the role matrix. The badge SHALL hide when the count is zero. The count SHALL come from `GET /alert?status=new,in_review&count_only=true` and SHALL refresh on every Topbar mount and after every alert mutation triggered by this user.

#### Scenario: Sidebar shows the badge for active alerts

- **GIVEN** the backend returns `count=12` for the current user's active alerts
- **WHEN** the Sidebar renders
- **THEN** the `Alertas` entry shows a badge with the literal text `12`

#### Scenario: Badge hides at zero

- **GIVEN** the backend returns `count=0`
- **WHEN** the Sidebar renders
- **THEN** the `Alertas` entry shows no numeric badge

#### Scenario: Badge updates after the user closes an alert

- **GIVEN** the badge shows `12` and the user marks one alert as `resolved`
- **WHEN** the mutation succeeds
- **THEN** the badge decrements to `11` without a manual page reload

---

### Requirement: Alertas page MUST expose two tabs (Nuevas / Histórico) gated by status

The page SHALL render a segmenter with two tabs: `Nuevas` (default) showing alerts with `status='new'`, and `Histórico` showing alerts with `status in {'in_review','resolved','dismissed'}`. The active tab SHALL be persisted via `?tab=nuevas|historico`. The Nuevas tab SHALL render alerts as a card-list (the visual format inherited from the REQ-33 prototype, per `discoveries/lex-alertas-discovery.md` §10.3) with one card per alert summarising fecha, type, cliente, contraparte, monto, sponsor, plus the CTAs `Asignarme` and `Ver detalle`. The Histórico tab SHALL render a table with the column order: `Fecha`, `Tipo`, `Cliente`, columns specific to the type (for screening: `Contraparte` + `Movimiento`), `Estado`, `Responsable`.

#### Scenario: Default tab is Nuevas

- **GIVEN** a user opens `/alertas` without a `?tab=` query parameter
- **WHEN** the page mounts
- **THEN** the URL is rewritten to `?tab=nuevas` and the Nuevas card-list is visible

#### Scenario: Histórico table column order

- **GIVEN** the user opens `?tab=historico`
- **WHEN** the table renders
- **THEN** the visible columns appear in this order: Fecha, Tipo, Cliente, Contraparte, Movimiento, Estado, Responsable

#### Scenario: Nuevas card shows the canonical CTAs

- **GIVEN** a screening alert in `status='new'`
- **WHEN** the card renders
- **THEN** the card body shows fecha, tipo, cliente name, contraparte CUIT, monto, sponsor; the footer shows the two CTAs `Asignarme` and `Ver detalle`

---

### Requirement: Alert state transitions MUST follow the canonical state machine

The state machine SHALL enforce exactly these transitions: `new → in_review` (on assignment), `in_review → new` (on de-assignment), `in_review → resolved` (on `Marcar como revisada` with mandatory comment), `in_review → dismissed` (on `Descartar` with mandatory comment). Direct transitions `new → resolved` and `new → dismissed` SHALL NOT be exposed by the UI. Closed states (`resolved`, `dismissed`) SHALL be terminal — the UI MUST NOT expose any affordance to reopen them. Each transition SHALL be persisted in the alert's `state_transitions[]` array with timestamp and actor.

#### Scenario: Marcar como revisada is hidden on a new alert

- **GIVEN** an alert in `status='new'` open in the detail view
- **WHEN** the actions section renders
- **THEN** `Asignarme` is shown but `Marcar como revisada` and `Descartar` are not rendered

#### Scenario: Marcar como revisada requires a comment

- **GIVEN** an alert in `status='in_review'` and the user clicks `Marcar como revisada`
- **WHEN** the closing modal opens
- **THEN** a textarea labelled `Comentario de cierre *` is present, and the modal's `Confirmar` button stays disabled until the textarea has at least one non-whitespace character

#### Scenario: Closed alerts cannot be reopened

- **GIVEN** an alert in `status='resolved'` open in the detail view
- **WHEN** the actions section renders
- **THEN** no action button (Asignarme, Marcar como revisada, Descartar, Reabrir) is rendered; the actions section displays only the read-only `Cerrada por <usuario> el <fecha>` line

---

### Requirement: Closing transitions MUST capture a mandatory comment in one atomic step

`Marcar como revisada` and `Descartar` SHALL each open a closure modal per `core-modals` Requirement "Closure modal MUST capture justification before committing a state-machine modal transition". The modal SHALL collect a single `comment` textarea (max 2000 characters per `discoveries/lex-alertas-discovery.md` §7.2). Submitting SHALL call `PATCH /alert/:id` with `{ status: 'resolved'|'dismissed', closing_comment: '...' }` in one request — the closing comment MUST NOT be a separate `POST /alert/:id/comment` call. The new comment SHALL be appended to the alert's timeline with the type `closing_comment` and visually distinguished. Per `lex-roles`, only users with `ADMIN_LEX` (or the alert's assignee with role `COMPLIANCE`) MAY perform the closure; `COMMERCIAL_LEX` MUST NOT see the closure CTAs.

#### Scenario: Closure modal blocks empty submission

- **GIVEN** the user clicks `Descartar` on an `in_review` alert
- **WHEN** the modal opens with the textarea empty
- **THEN** the `Descartar` confirm button is disabled

#### Scenario: Closure submits status + comment in one request

- **GIVEN** the user types `Falso positivo · CUIT corregido` and confirms
- **WHEN** the request fires
- **THEN** exactly one `PATCH /alert/:id` request is sent with `{ status: 'dismissed', closing_comment: 'Falso positivo · CUIT corregido' }`; no separate `/comment` request is fired

#### Scenario: COMMERCIAL_LEX cannot see closure CTAs

- **GIVEN** a `COMMERCIAL_LEX` user opens an alert detail view in `status='in_review'`
- **WHEN** the actions section renders
- **THEN** neither `Marcar como revisada` nor `Descartar` is rendered; the user can only add comments

---

### Requirement: Assignment MUST update status atomically and surface in the timeline

The detail view SHALL expose `Asignarme`, `Asignar a...` (dropdown of eligible users), and `Desasignar`. `Asignarme` SHALL fire `PATCH /alert/:id { assignee_id: self }`. `Asignar a...` SHALL fire `PATCH /alert/:id { assignee_id: <selected> }`. `Desasignar` SHALL fire `PATCH /alert/:id { assignee_id: null }`. Successful assignment from `new` SHALL move the alert to `in_review` (and the alert SHALL migrate from the Nuevas tab to the Histórico tab in the same render cycle); successful de-assignment from `in_review` SHALL revert the alert to `new`. Each assignment event SHALL append a `state_transition` entry to the alert's timeline.

#### Scenario: Asignarme transitions new to in_review

- **GIVEN** an alert in `status='new'` open in the detail view
- **WHEN** the user clicks `Asignarme`
- **THEN** `PATCH /alert/:id` fires with `{ assignee_id: <self> }`, the alert's `status` becomes `in_review` on the response, and the timeline now contains an `assigned` entry referencing the current user

#### Scenario: Migration between tabs follows status

- **GIVEN** the user is on `?tab=nuevas` and clicks `Asignarme` on a card
- **WHEN** the `PATCH /alert/:id` response arrives with `status='in_review'`
- **THEN** the card disappears from Nuevas, and switching to `?tab=historico` shows the same alert as a row with the user's name in the Responsable column

#### Scenario: Desasignar reverts in_review to new

- **GIVEN** the user opens an alert assigned to themselves and clicks `Desasignar`
- **WHEN** `PATCH /alert/:id { assignee_id: null }` returns 200
- **THEN** the alert's `status` becomes `new`, the alert reappears in the Nuevas tab, and the timeline contains an `unassigned` entry

---

### Requirement: Detail view MUST surface match payload, assignment section, and combined timeline

The detail view SHALL be reachable at `/alertas/:id` and SHALL contain four sections in this order: (1) Header with the status badge, the alert title, and the available actions per the state machine; (2) `Información del match` showing client (with `Ver legajo` link to `/clientes/:client_id`), contraparte (name + CUIT), motivo blacklist (frozen at match time), movement details (type, monto, currency, timestamp), sponsor, plus a `Ver movimiento en OPS` link; (3) `Asignación` with the responsible user and the action affordances; (4) `Timeline` with comments, state transitions, and assignment events interleaved in descending chronological order, plus a textarea to add a new comment.

#### Scenario: Header shows the status badge with the canonical colour

- **GIVEN** an alert in `status='in_review'`
- **WHEN** the detail view renders
- **THEN** the header shows a badge with the literal text `EN REVISIÓN` using the `--badge-alerta-in-review` token

#### Scenario: Información del match links out to client and movement

- **GIVEN** an alert with `client_id='c-1'` and `movement_id='m-99'`
- **WHEN** the section renders
- **THEN** the `Ver legajo` link points to `/clientes/c-1` and the `Ver movimiento en OPS` link points to the OPS frontend with `movement_id=m-99`

#### Scenario: Timeline orders events most-recent-first

- **GIVEN** an alert with the events: created at `T0`, assigned at `T0+1h`, comment at `T0+2h`, comment at `T0+3h`
- **WHEN** the timeline renders
- **THEN** the visual order from top is: comment at `T0+3h`, comment at `T0+2h`, assigned at `T0+1h`, created at `T0`

---

### Requirement: Histórico filters MUST cover tipo, estado, responsable, cliente, fechas, CUIT contraparte

The Histórico tab L3 filter bar SHALL include: `Tipo de alerta` (Select multi, in v1 only `SCREENING_BLACKLIST_MATCH`), `Estado` (Select multi, options `in_review` / `resolved` / `dismissed`, default `in_review`; `new` SHALL NOT be an option here because those alerts live in the Nuevas tab), `Responsable` (Select with options `Todos` / `Yo` / `Sin asignar` / [user list]), `Cliente` (autocomplete), `Rango de fechas` (single picker writing `from` / `to`), `Buscar por CUIT de contraparte` (text, debounced 300 ms). Filters SHALL be combinable; the active set SHALL be reflected in the URL via query params for deep linking.

#### Scenario: Default Estado filter is in_review only

- **GIVEN** the user opens `/alertas?tab=historico` without an explicit `estado` param
- **WHEN** the page mounts
- **THEN** the Estado filter is pre-set to `in_review` and the URL contains `?tab=historico&estado=in_review`

#### Scenario: Estado filter does not expose new

- **GIVEN** the user opens the Estado dropdown
- **WHEN** the options render
- **THEN** the available options are exactly `in_review`, `resolved`, `dismissed`; `new` is not present

#### Scenario: CUIT contraparte input is debounced

- **GIVEN** the user types `2012345` into the CUIT contraparte input
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /alert?counterparty_tax_number=2012345&...` request fires

---

### Requirement: Permissions MUST follow the role matrix from lex-alertas-discovery §5.5

Per `lex-roles` and `discoveries/lex-alertas-discovery.md` §5.5, the UI SHALL apply the following permission matrix. `ADMIN_LEX` users MUST be able to view all alerts, assign / be assigned, comment, and close. `COMMERCIAL_LEX` users MUST be limited to alerts for clients they are assigned to; they MAY comment but MUST NOT see assignment or closure affordances. `VIEWER_LEX` users MUST be limited to alerts of their own assignations and MUST NOT see comment, assignment, or closure affordances. Server-side filtering of which alerts each role sees is the backend's responsibility; this requirement governs only client-side gating of CTAs, comment input visibility, and assignment affordances.

#### Scenario: COMMERCIAL_LEX sees comment input but no assignment affordances

- **GIVEN** a `COMMERCIAL_LEX` user opens an alert detail view for one of their assigned clients
- **WHEN** the page renders
- **THEN** the timeline comment textarea is rendered and submittable; the Asignación section shows the responsable as static text (no `Asignarme` / `Asignar a...` / `Desasignar` buttons)

#### Scenario: VIEWER_LEX sees a read-only detail view

- **GIVEN** a `VIEWER_LEX` user opens an alert detail view for one of their own assignations
- **WHEN** the page renders
- **THEN** no comment textarea, no assignment affordances, no closure CTAs are rendered; the timeline is visible in read-only mode

#### Scenario: Server filtering hides alerts of other clients from COMMERCIAL_LEX

- **GIVEN** a `COMMERCIAL_LEX` user opens `/alertas`
- **WHEN** the table loads
- **THEN** the response includes only alerts whose `client_id` is in the user's `assigned_clients` set; the frontend does not need to filter further

---

### Requirement: Comments MUST be immutable, max 2000 characters, and timeline-tracked

Comments added through the detail view's textarea SHALL be persisted via `POST /alert/:id/comment { body }`. The body SHALL be capped at 2000 characters with a visible counter. Once persisted, comments MUST NOT be edited or deleted by any client-side affordance — to correct an error the user must add a new comment per `discoveries/lex-alertas-discovery.md` §7.1. New comments SHALL appear at the top of the timeline immediately on optimistic confirmation; failure SHALL revert and surface a toast `No se pudo agregar el comentario`.

#### Scenario: Comment counter caps at 2000

- **GIVEN** the textarea contains 1995 characters and the user types a 6-character word
- **WHEN** the keystrokes are handled
- **THEN** the textarea visually caps at 2000 characters and the counter reads `2000 / 2000`

#### Scenario: Comment is optimistically prepended to the timeline

- **GIVEN** the user types a comment and clicks `Comentar`
- **WHEN** the request is in flight
- **THEN** a new entry appears at the top of the timeline with the literal text and the user's name; on 200 it stays, on failure it is removed and a toast `No se pudo agregar el comentario` is shown

#### Scenario: No edit affordance on existing comments

- **GIVEN** any comment in the timeline
- **WHEN** the user hovers or right-clicks the comment
- **THEN** no edit, delete, or modify affordance is rendered

---

### Requirement: Alert architecture MUST allow new types without restructuring

The frontend type system SHALL define `AlertType` as a union literal (`'SCREENING_BLACKLIST_MATCH' | ...`) and a per-type registry mapping `type → { label, icon, summaryRenderer, detailRenderer, columnExtras }`. Adding a new type (e.g. `DOCUMENT_DUE_DATE`, `LIMIT_OVERAGE`) SHALL be a matter of adding a new entry to the registry plus a new renderer component — the page-level layout (two tabs, state machine, assignment section, timeline, role gating) MUST not require modification. The Tipo de alerta filter on Histórico SHALL list every entry in the registry.

#### Scenario: New type adds a card renderer without page changes

- **GIVEN** a new alert type `DOCUMENT_DUE_DATE` is registered with its renderers
- **WHEN** an alert of that type lands in the Nuevas tab
- **THEN** the card renders via the new type's renderer; the surrounding card-list layout, the `Asignarme` CTA, and the badge in the Sidebar all behave identically to the screening alert without code changes

#### Scenario: Tipo filter lists every registered type

- **GIVEN** the registry contains `SCREENING_BLACKLIST_MATCH` and `DOCUMENT_DUE_DATE`
- **WHEN** the user opens the Histórico Tipo filter
- **THEN** both options are listed with their registered labels

#### Scenario: Unregistered type falls back to a generic renderer

- **GIVEN** the backend returns an alert with an unknown `type` value
- **WHEN** the card or row renders
- **THEN** a generic fallback renderer is used (label = the raw type string, icon = neutral) and `devWarn` (per `core-error-handling`) reports the missing registry entry once per session
