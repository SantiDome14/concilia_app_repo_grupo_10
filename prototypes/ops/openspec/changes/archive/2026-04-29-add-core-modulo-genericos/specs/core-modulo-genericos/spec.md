## ADDED Requirements

### Requirement: Every core app MUST ship the four standard modules

Every Ardua core app cloned from `core-template-frontend` SHALL ship the four cross-cutting standard modules — Dashboard, Inbox, Alertas, and Reportes — with their canonical routes (`/dashboard`, `/inbox`, `/alertas`, `/reportes`), pages (`src/pages/Dashboard.vue`, `src/pages/Inbox.vue`, `src/pages/Alertas.vue`, `src/pages/Reportes.vue`), and sidebar entries. The four sidebar entries MUST appear at the top of the sidebar's generics block, NOT inside any domain `<SidebarBlock>`, in the order: Dashboard, Inbox, Alertas, Reportes. Apps SHALL NOT remove any of the four routes or pages. When an app has no Solicitudes, no Alertas, or no Reportes today, the corresponding page MUST still render and surface an `<EmptyState>` with the canonical empty message; capability-gating an entire route via `meta.capabilities` is permitted but the route declaration itself MUST remain.

#### Scenario: All four routes are registered in the seed router

- **GIVEN** a fresh clone of `core-template-frontend`
- **WHEN** the app boots
- **THEN** `router.getRoutes()` includes routes named `'dashboard'`, `'inbox'`, `'alertas'`, `'reportes'` AND each route resolves to its canonical page component (`Dashboard.vue`, `Inbox.vue`, `Alertas.vue`, `Reportes.vue`)

#### Scenario: Sidebar generics block renders the four entries above any domain block

- **GIVEN** an app with one or more domain `<SidebarBlock>` groups declared
- **WHEN** the `<Sidebar>` renders
- **THEN** the first four entries (in DOM order) are Dashboard, Inbox, Alertas, Reportes (no `<SidebarBlock>` wrapper around them); the domain `<SidebarBlock>` groups appear AFTER the four generics

#### Scenario: An app without Solicitudes still ships the Inbox page

- **GIVEN** an app whose `INBOX_CONFIG` declares no Solicitud types and whose dataset is empty
- **WHEN** the user navigates to `/inbox`
- **THEN** the page renders an `<EmptyState>` with a canonical empty message (e.g. "No hay Solicitudes en este momento") AND the route + sidebar entry remain present

#### Scenario: Removing a generic page is a contract violation

- **GIVEN** an app deletes `src/pages/Reportes.vue` or removes the `/reportes` route
- **WHEN** `openspec validate --all --strict` runs (or PR review checks the page list)
- **THEN** the change is REJECTED — the four generic modules are mandatory; capability-gating via `meta.capabilities` is the only sanctioned way to disable a route, and the route declaration MUST remain

---

### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`

The Inbox module SHALL manage entities named `Solicitud` in TypeScript code; this identifier is mandatory across every core app and MUST NOT be aliased to "Item", "Ticket", or any other generic noun in the type system. The `Solicitud` interface SHALL be exported from `src/types/genericos.ts` with required fields `id: string`, `type: string`, `source_app: string`, `source_module: string`, `owner: string | null`, `sla_hours: number | null`, `state: SolicitudState`, `timeline: TimelineEvent[]`, `comments: Comment[]`, and optional `closure_comment?: string`. The Inbox page SHALL segment its content via `<Segmenter>` with two segments — Activos and Histórico — declared in this exact order. The detail surface for a Solicitud SHALL be the side `<Drawer>` (the route or component MUST set `meta.detail = 'drawer'` per `core-modals`); a centered modal is forbidden as the Solicitud detail surface.

#### Scenario: Solicitud is imported from the canonical types file

- **GIVEN** an app's Inbox page or extension types
- **WHEN** the file imports the Solicitud shape
- **THEN** the import statement reads `import type { Solicitud } from '@/types/genericos';` — re-defining `interface Solicitud { ... }` in app code is forbidden; the validator (or PR review) catches the violation

#### Scenario: Inbox segments are exactly Activos and Histórico in that order

- **GIVEN** the Inbox page renders
- **WHEN** the L1 `<Segmenter>` mounts
- **THEN** the segments are `[{ key: 'activos', label: 'Activos' }, { key: 'historico', label: 'Histórico' }]` in that order; default segment is `activos`

#### Scenario: Detail surface is the side Drawer

- **GIVEN** a row in the Inbox Activos table
- **WHEN** the user clicks the row
- **THEN** the side `<Drawer>` opens (NOT a centered modal); the route or component meta declares `detail: 'drawer'` so router guards / breadcrumbs / focus management treat it as the drawer surface per `core-modals`

#### Scenario: App-specific Solicitud extends the base shape

- **GIVEN** an app declares `interface OpsWithdrawalRequest extends Solicitud { client: string; amount: number; }`
- **WHEN** the app's Inbox renders an OpsWithdrawalRequest row
- **THEN** the base fields (`id`, `type`, `source_app`, `owner`, `sla_hours`, `state`, `timeline`, `comments`) are read by the generic Inbox engine; the domain-specific fields (`client`, `amount`) are read by the app's render functions; redefining base fields with incompatible types is rejected at TS compile time

---

### Requirement: Inbox MUST declare a state machine with terminal-state ClosureModal

Every app's Inbox SHALL declare two constants per the `core-data-tables` state-machine contract: `INBOX_STATES` (the ordered list of states with `column_label`, `order`, `terminal` flags) and `INBOX_TRANSITIONS` (the from/to/mode declarations). The default vocabulary MUST be `'pendiente' | 'en_proceso' | 'completed' | 'rejected'`; apps MAY override the vocabulary as long as at least one state is marked `terminal: true`. Transitions to terminal states MUST declare `mode: 'modal'` and MUST open the shared `<ClosureModal>` from `core-modals`. The `ClosureModal` confirmation MUST require a closure action choice (drawn from `INBOX_TYPES[type].closeActions`) when the Solicitud type declares them. The closure SHALL persist `state`, `closure_comment` (when provided), and a `kind: 'closed'` `TimelineEvent` on the Solicitud.

#### Scenario: Default state vocabulary is the canonical four

- **GIVEN** an app's Inbox without overrides
- **WHEN** the page imports the defaults
- **THEN** `INBOX_STATES` includes `'pendiente'`, `'en_proceso'`, `'completed'`, `'rejected'` (in that order) AND both `'completed'` and `'rejected'` are marked `terminal: true`

#### Scenario: Terminal transition opens ClosureModal

- **GIVEN** a Solicitud in `'en_proceso'` and a transition `{ from: 'en_proceso', to: 'completed', mode: 'modal' }`
- **WHEN** the user drags the Kanban card from In Progress to Done (or fires the equivalent action)
- **THEN** the `<ClosureModal>` opens; the user MUST select a `closeActions` value (e.g. `'approved'`, `'rejected'`, `'forwarded'`) AND MAY enter a `closure_comment`; on confirm the Solicitud's `state` becomes `'completed'`, `closure_comment` is persisted, and a `TimelineEvent { kind: 'closed', at: <ts>, payload: { action: 'approved', comment: '...' } }` is appended

#### Scenario: Non-terminal transition is free (no modal)

- **GIVEN** a transition `{ from: 'pendiente', to: 'en_proceso', mode: 'free' }`
- **WHEN** the user drags the card from To Do to In Progress
- **THEN** the state changes immediately with NO modal; a `TimelineEvent { kind: 'state_change', at: <ts> }` is appended

#### Scenario: App overrides the state vocabulary

- **GIVEN** an app declares `INBOX_STATES = ['received', 'reviewing', 'approved', 'denied']` with `'approved'` and `'denied'` marked `terminal: true`
- **WHEN** the page imports the override
- **THEN** the Tablero renders four columns matching the override AND transitions to `'approved'` / `'denied'` MUST still use `mode: 'modal'` (the terminal-state ClosureModal rule is independent of the vocabulary)

---

### Requirement: Alertas houses system-detected events with profile A/B/C/D semantics

The Alertas module SHALL house system-detected events that require human attention. Every `ALERT_TYPE` declared in an app's config MUST carry a `profile: 'A' | 'B' | 'C' | 'D'` discriminator that activates exactly one canonical UI pattern per type:

- **Profile A — Active triage list (default).** Inbox-style list without owner / SLA. New alerts surface; users mark resolved or dismissed.
- **Profile B — Workflow.** Master-detail with sub-categorization. Drawer with Timeline + Comments. Terminal-state ClosureModal with justification.
- **Profile C — Time-series with charts.** Chart-first surface; alerts are derived from a metric crossing a threshold; resolution is auto when the metric returns.
- **Profile D — Cross-app KPI dashboard.** Consolidated KPIs with cross-app filters; not an actionable list.

The `Alerta` interface SHALL be exported from `src/types/genericos.ts` with the discriminator `profile: AlertProfile`. Apps SHALL activate exactly one profile per `ALERT_TYPE` — mixing profiles within a single ALERT_TYPE is forbidden. The Alertas page SHALL read each row's `profile` and render the corresponding UI pattern.

#### Scenario: Profile B types render the workflow surface

- **GIVEN** an `ALERT_TYPE` declared with `profile: 'B'` and an `Alerta` row of that type
- **WHEN** the user clicks the row
- **THEN** the side `<Drawer>` opens with Timeline + Comments; the Tablero (Kanban) view is available; terminal-state transitions (`* → resolved`, `* → dismissed`) MUST go through the `<ClosureModal>`

#### Scenario: Profile A types render the simple triage list

- **GIVEN** an `ALERT_TYPE` declared with `profile: 'A'`
- **WHEN** the user opens the corresponding Alerta
- **THEN** the row resolves with a single click (no Drawer, no Timeline by default); the resolution action surfaces a confirmation toast per `core-error-handling`; the `<Drawer>` and Tablero capabilities are NOT rendered for this type

#### Scenario: Profile C types render a chart-first surface

- **GIVEN** an `ALERT_TYPE` declared with `profile: 'C'` (e.g. saldo anomaly)
- **WHEN** the user navigates to the Alertas section filtered to that type
- **THEN** the page renders a chart of the underlying metric with thresholds overlaid; the alert list appears as a compact secondary panel; resolution is automatic when the metric returns inside the threshold

#### Scenario: Profile D renders a cross-app KPI dashboard

- **GIVEN** an `ALERT_TYPE` declared with `profile: 'D'` (e.g. daily limit utilization across CLP / OPS / FIN)
- **WHEN** the user opens the dashboard
- **THEN** the page renders KPI cards per source app with cross-app filters; there is no per-row triage UI — the surface is read-only orientation

#### Scenario: Mixing profiles within a single ALERT_TYPE is forbidden

- **GIVEN** an `ALERT_TYPE` declares `profile: ['A', 'B']` (an array, attempting to mix)
- **WHEN** the app config validates
- **THEN** the validation FAILS with an error indicating that exactly one profile MUST be activated per ALERT_TYPE

---

### Requirement: Alertas terminal states (`resolved` and `dismissed`) MUST require a justification via the ClosureModal

For every `ALERT_TYPE` whose effective profile is B (workflow), transitions to terminal states `'resolved'` and `'dismissed'` MUST declare `mode: 'modal'` per the `core-data-tables` state-machine contract and MUST open the shared `<ClosureModal>` from `core-modals`. The justification SHALL be entered as a non-empty string of at least 10 characters and is persisted on the alert's `closure_comment` field. The `<ClosureModal>` MUST surface the justification field as required (label + asterisk + character-count helper). On confirm, a `TimelineEvent { kind: 'closed', at: <ts>, payload: { state: 'resolved' | 'dismissed', comment: '...' } }` MUST be appended to the alert's `timeline[]`. Profile-A types MAY skip justification when `ALERTS_CONFIG.requireClosureComment` is set to `false` for that type; profiles C and D rarely transition through the user UI (they auto-close or are dashboards), so the justification rule is effectively profile-B-mandatory.

#### Scenario: `* → resolved` opens the ClosureModal with a required justification

- **GIVEN** a profile-B `Alerta` in state `'in_progress'` and the user clicks "Resolver"
- **WHEN** the action fires
- **THEN** the shared `<ClosureModal>` opens; the justification textarea is marked required (asterisk + 10-char minimum helper text); the Confirm button is disabled until the textarea reaches ≥10 characters

#### Scenario: `* → dismissed` opens the same ClosureModal

- **GIVEN** a profile-B `Alerta` and the user clicks "Descartar"
- **WHEN** the action fires
- **THEN** the same `<ClosureModal>` opens (single shared instance per `core-modals`); the user MUST enter a justification ≥10 chars before Confirm is enabled

#### Scenario: Confirmed closure persists comment + timeline event

- **GIVEN** the user enters `"Falsa alarma — saldo regularizó al cierre"` (51 chars) and clicks Confirm
- **WHEN** the apply path completes
- **THEN** `alerta.state === 'dismissed'` (or `'resolved'` per the action) AND `alerta.closure_comment === "Falsa alarma — saldo regularizó al cierre"` AND `alerta.timeline` ends with `{ kind: 'closed', at: <ts>, payload: { state: 'dismissed', comment: 'Falsa alarma — saldo regularizó al cierre' } }`

#### Scenario: Profile-A type with `requireClosureComment: false` skips the modal

- **GIVEN** an `ALERT_TYPE` with `profile: 'A'` and `ALERTS_CONFIG.requireClosureComment` set to `false` for this type
- **WHEN** the user clicks "Marcar como atendida"
- **THEN** the alert closes without opening the `<ClosureModal>`; a confirmation toast is shown per `core-error-handling`; `closure_comment` is not set; a minimal `TimelineEvent { kind: 'closed', at: <ts> }` is appended

---

### Requirement: Reportes MUST split Catálogo / Histórico via segmentation; each segment has its own shape, filters, and columns

The Reportes module SHALL use `<Segmenter>` to split L1 content into two segments — Catálogo and Histórico — declared in this exact order. Catálogo SHALL list `Report` entries (templates / definitions); Histórico SHALL list `ReportRun` entries (generated runs). The `Report` interface SHALL be exported from `src/types/genericos.ts` with required `id: string`, `category: string`, `name: string`, `description: string`, and optional `periodicity?`, `format?`, `params?`, `dependencies?`, `cron_enabled?`, `cron_active?`, `locked?`, `locked_reason?`. The `ReportRun` interface SHALL declare required `id: string`, `report_id: string`, `requested_at: number`, `status: 'ok' | 'error' | 'pending'`, `params: string`, `trigger: { type: 'cron' } | { type: 'manual'; user_id: string } | { type: 'system' }`, and optional `completed_at?`, `output_url?`, `error_message?`. The two segments MUST NOT share columns, filters, or actions — Catálogo's columns and filters are template-oriented (Categoría, Periodicidad, Formato), Histórico's columns and filters are run-oriented (Trigger, Estado, Período).

#### Scenario: Reportes segments are exactly Catálogo and Histórico in that order

- **GIVEN** the Reportes page renders
- **WHEN** the L1 `<Segmenter>` mounts
- **THEN** the segments are `[{ key: 'catalogo', label: 'Catálogo' }, { key: 'historico', label: 'Histórico' }]` in that order; default segment is `catalogo`

#### Scenario: Catálogo lists Report templates

- **GIVEN** the user is on the Catálogo segment with `CATALOG: Report[]` declared in app data
- **WHEN** the table renders
- **THEN** each row maps to a `Report` entry; the columns surface `name`, `description`, `category`, `periodicity`, `format`, `dependencies` (visual indicator); the actions per row include "Generar", "Editar metadata", "Configurar CRON" (subject to `REPORTS_CONFIG` flags)

#### Scenario: Histórico lists ReportRun entries

- **GIVEN** the user switches to the Histórico segment with `HISTORY: ReportRun[]` declared in app data
- **WHEN** the table renders
- **THEN** each row maps to a `ReportRun`; columns surface `report_id` (resolved to the template name), `requested_at`, `completed_at`, `status`, `trigger` (CRON / Manual / Sistema), `params`; actions include "Descargar" (when `output_url` present) and "Reintentar" (when `status === 'error'`)

#### Scenario: Filters are not shared across segments

- **GIVEN** the Catálogo filter `Periodicidad = 'Mensual'` is active
- **WHEN** the user switches to Histórico
- **THEN** the filter does NOT carry over; the Histórico segment renders its own filter set (Trigger / Estado / Período); switching back to Catálogo restores the original filter state

---

### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`

When a `Report` declares a `dependencies[]` list and the user attempts to generate the report (clicks "Generar"), the engine SHALL evaluate each dependency. If any dependency entry has `completed: false`, the Generar action MUST be BLOCKED and the engine MUST emit a `REPORT_DEPENDENCY` event of normative shape `{ report_id: string; blocking_app: string; blocking_module: string; blocking_state: string; sla_days_before?: number; emitted_at: number }` to the destination app indicated by `blocking_app`. The destination app's Alertas module MUST consume incoming `REPORT_DEPENDENCY` events and create an `Alerta` entry with `type: 'report_dependency'` and `profile: 'A'`. When the source app marks the dependency `completed: true`, the consuming Alerta SHALL auto-close — the engine sets `state: 'resolved'`, `closure_comment: 'auto-closed by source-app completion'`, appends `TimelineEvent { kind: 'auto_closed', at: <ts> }`, and moves the Alerta from Nuevas to Histórico without user interaction.

#### Scenario: Generar is blocked when a dependency is unfulfilled

- **GIVEN** a `Report` with `dependencies: [{ app: 'OPS', module: 'Movimientos', task: 'Conciliación cerrada', completed: false }, { app: 'LEX', module: 'Alertas', task: 'Cierre del período', completed: true }]`
- **WHEN** the user clicks "Generar" on the Catálogo card
- **THEN** the action is BLOCKED; a prerequisite reason surfaces in the action menu (e.g. "Falta cierre en OPS · Movimientos · Conciliación cerrada"); a `REPORT_DEPENDENCY` event is emitted with `blocking_app: 'OPS'`, `blocking_module: 'Movimientos'`, `blocking_state: 'Conciliación cerrada'`, `report_id: <id>`, `emitted_at: <ts>`

#### Scenario: Destination Alertas consumes the event as profile-A

- **GIVEN** the destination app `OPS` subscribes to incoming `REPORT_DEPENDENCY` events
- **WHEN** an event arrives with `blocking_app: 'OPS'`
- **THEN** OPS Alertas creates an `Alerta` entry with `type: 'report_dependency'`, `profile: 'A'`, severity defaulting to `'medium'` (configurable per `ALERTS_CONFIG`), `state: 'new'`; the Alerta surfaces in the Nuevas segment

#### Scenario: Source-app completion auto-closes the consuming Alerta

- **GIVEN** OPS holds an active `Alerta` of `type: 'report_dependency'` for a given `report_id` AND OPS Movimientos marks the underlying task `completed: true`
- **WHEN** the source-app completion event propagates
- **THEN** the OPS Alerta auto-closes — `state` becomes `'resolved'`, `closure_comment: 'auto-closed by source-app completion'` is set, a `TimelineEvent { kind: 'auto_closed', at: <ts> }` is appended, and the Alerta is moved from Nuevas to Histórico without user input

#### Scenario: Report without dependencies generates without emitting

- **GIVEN** a `Report` with no `dependencies` field (or an empty array)
- **WHEN** the user clicks "Generar"
- **THEN** the action proceeds normally; no `REPORT_DEPENDENCY` event is emitted; a new `ReportRun` is created and appears in Histórico with `status: 'pending'`

---

### Requirement: Dashboard MUST be a card-grid consolidated home; NO L1/L2/L3, NO domain operations

The Dashboard page (`src/pages/Dashboard.vue`) SHALL use a responsive card-grid layout (a CSS-grid or flex auto-fit composition with cards as the primary element); it MUST NOT use the L1/L2/L3 page-header / KPI-strip / section-table pattern declared by `core-layout`. The Dashboard MUST aggregate: KPIs from active domain modules (each KPI clickable, navigating to the relevant module); counters for the three list-shaped generics (Inbox unread Solicitudes count, Alertas critical-count, Reportes pending-runs / unfulfilled-dependencies count); a consolidated "Actividad reciente" timeline crossing modules. The Dashboard MUST NOT carry domain-specific actions, filters, sub-tabs, or batch CTAs — those belong in the domain modules. Dashboard cards MUST be clickable and navigate to the relevant module on click.

#### Scenario: Dashboard does not use the L1/L2/L3 pattern

- **GIVEN** the user navigates to `/dashboard`
- **WHEN** the page renders
- **THEN** there is NO L1 page header (no title + actions row), NO L2 KPI strip (the KPIs are part of the card grid, not a separate strip), NO L3 section + table — the page is exclusively a responsive card grid

#### Scenario: Dashboard surfaces counters for the three list-shaped generics

- **GIVEN** the app has 7 unread Solicitudes, 3 critical Alertas, and 2 unfulfilled report dependencies
- **WHEN** the Dashboard renders
- **THEN** the card grid includes (at minimum) a card showing "Inbox · 7 Solicitudes activas", a card showing "Alertas · 3 críticas", a card showing "Reportes · 2 pendientes"; each card is clickable

#### Scenario: Clicking a Dashboard card navigates to the relevant module

- **GIVEN** the user is on `/dashboard`
- **WHEN** the user clicks the "Inbox · 7 Solicitudes activas" card
- **THEN** the router navigates to `/inbox`; the Inbox lands on the Activos segment by default

#### Scenario: Filters or sub-tabs on Dashboard are a contract violation

- **GIVEN** an app adds a filter dropdown or a `<Segmenter>` to the Dashboard page
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — Dashboard MUST be read-only orientation; filters and sub-tabs belong in domain modules

---

### Requirement: Decision heuristic for new content placement; "What NOT to put here" rules are normative

When introducing a new pattern, contributors MUST apply this placement heuristic in this exact order, first match wins:

1. Is it a request with an owner and a lifecycle (To Do → In Progress → Done) requiring a human decision? → **Inbox**.
2. Is it a system-detected event needing human attention or system auto-resolution? → **Alertas**.
3. Is it consolidated information with async processing or inter-area coordination? → **Reportes**.
4. None of the above? → it's domain-specific; goes in a domain module.

Each generic module SHALL also enforce a normative "What NOT to put here" list:

- **Inbox is NOT for** system-detected events (those are Alertas), simple per-module exports (those live in the domain module), or merely-informational notifications (those are toasts per `core-error-handling`).
- **Alertas is NOT for** human-originated Solicitudes (those are Inbox), planned tasks (those are domain modules or Inbox), or static catalog browsing (that's Reportes Catálogo or a domain module).
- **Reportes is NOT for** actionable items requiring user decisions (those are Inbox), simple CSV exports of a domain table (those are domain-module actions), or live dashboards (that's Dashboard or a domain module).
- **Dashboard is NOT for** domain operations (those go in domain modules), filterable lists (those are domain or list-shaped generics), or sub-tabs / multi-segment navigation (that's a domain module).

PR reviewers SHALL reject changes that violate either the heuristic or the prohibitions.

#### Scenario: A request with owner + lifecycle goes to Inbox

- **GIVEN** a new feature requires the user to receive cross-app withdrawal requests, assign owners, transition states, and persist a justification on close
- **WHEN** the developer applies the heuristic
- **THEN** the feature lands in Inbox (heuristic step 1 — request with owner + lifecycle); placing it in Alertas is REJECTED in PR review

#### Scenario: A system-detected anomaly goes to Alertas

- **GIVEN** a new feature requires the system to detect a balance anomaly and surface it for human triage
- **WHEN** the developer applies the heuristic
- **THEN** the feature lands in Alertas (heuristic step 2 — system-detected event); placing it in Inbox or in a domain module is REJECTED in PR review

#### Scenario: Inbox is NOT for static notifications

- **GIVEN** a developer proposes adding a "system maintenance window" informational notification list to Inbox
- **WHEN** PR review checks against the prohibitions
- **THEN** the change is REJECTED — Inbox is NOT for merely-informational notifications; the right surface is a toast or banner per `core-error-handling`

#### Scenario: Dashboard is NOT for filterable lists

- **GIVEN** a developer proposes adding a filterable transaction list to the Dashboard
- **WHEN** PR review checks against the Dashboard prohibitions
- **THEN** the change is REJECTED — Dashboard is NOT for filterable lists; the surface belongs in the domain module that owns the data

---

### Requirement: Shared TS types MUST live in `src/types/genericos.ts`; app-specific extensions extend the base types

The TypeScript types `Solicitud`, `SolicitudState`, `TimelineEvent`, `Comment`, `Alerta`, `AlertProfile`, `Report`, `ReportRun`, `ReportDependency` SHALL be exported from `src/types/genericos.ts` and SHALL be the single source of truth for the four generic modules' data shapes. App-specific extensions SHALL extend the base types via TypeScript interface extension (`interface OpsX extends Solicitud { ... }`) or via generics (`Solicitud<T>` with a `payload: T` field). Apps SHALL NOT redefine the base interfaces (`interface Solicitud { ... }` declared inside an app's module folder is forbidden); doing so is a contract violation enforced at PR review (and optionally via a custom ESLint rule `no-redefine-genericos`). When apps need an additional base field that is universal across the core, the change MUST land in `src/types/genericos.ts` via a follow-up OpenSpec change that amends `core-modulo-genericos`.

#### Scenario: Base types are imported from the canonical file

- **GIVEN** any module file that needs the base shape
- **WHEN** the file imports the type
- **THEN** the import statement reads `import type { Solicitud, Alerta, Report, ReportRun } from '@/types/genericos';` — relative paths into `genericos.ts` are also acceptable; redefining the interface in app code is rejected

#### Scenario: App-specific extension via interface extension

- **GIVEN** an app declares `interface OpsImputationRequest extends Solicitud { client: string; amount: number; reference: string; }`
- **WHEN** TypeScript compiles
- **THEN** the extended interface has the base required fields (`id`, `type`, `source_app`, `source_module`, `owner`, `sla_hours`, `state`, `timeline`, `comments`) PLUS the app-specific fields; the generic Inbox engine consumes the base fields without knowing about the extension

#### Scenario: Generic-payload extension when the shape varies by type

- **GIVEN** an app uses `Solicitud<T>` with a `payload: T` field (the generic variant) and declares `type WithdrawalSolicitud = Solicitud<{ client: string; amount: number; }>`
- **WHEN** the type is consumed
- **THEN** `payload.client` and `payload.amount` are typed; the base `Solicitud` fields are still required

#### Scenario: Redefining the base interface in app code is rejected

- **GIVEN** an app introduces `interface Solicitud { id: string; titulo: string; }` (re-declaration with different fields) inside `src/modules/<app>/types.ts`
- **WHEN** PR review (or the optional ESLint rule `no-redefine-genericos`) runs
- **THEN** the change is REJECTED — the base interface MUST live in `src/types/genericos.ts` only; the violation is fixed by deleting the app-local declaration and importing the canonical type instead
