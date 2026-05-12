# core-modulo-genericos Specification

## Purpose
TBD - created by archiving change add-core-modulo-genericos. Update Purpose after archive.
## Requirements
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

### Requirement: Inbox MUST declare a state machine with terminal-state ClosureModal

Every app's Inbox SHALL declare two constants per the `core-data-tables` state-machine contract: `INBOX_STATES` (the ordered list of states with `column_label`, `order`, `terminal` flags) and `INBOX_TRANSITIONS` (the from/to/mode declarations). The default vocabulary MUST be `'pendiente' | 'en_proceso' | 'completed' | 'rejected'`; apps MAY override labels via `InboxTypeConfig.state_labels` but MUST NOT change the mechanism (always four states, terminals immutable). Transitions to terminal states MUST declare `mode: 'modal'` and MUST open the shared `<ClosureModal>` from `core-modals`. The `<ClosureModal>` confirmation MUST require a `closeActions` choice drawn from `InboxTypeConfig[type].closeActions[]` of the Solicitud's type; when the matching type declares `closeActions[].requires_comment` (default `true`) the closure comment SHALL be required with a minimum of 10 characters. The closure SHALL persist `state`, `closure_action`, `closure_comment` (when provided), `closed_by`, `closed_at`, and a `TimelineEvent { kind: 'closed', at, by, payload: { action, comment } }` on the Solicitud.

#### Scenario: Default state vocabulary is the canonical four

- **GIVEN** an app's Inbox without overrides
- **WHEN** the page imports the defaults
- **THEN** `INBOX_STATES` includes `'pendiente'`, `'en_proceso'`, `'completed'`, `'rejected'` (in that order); both terminals are marked `terminal: true`

#### Scenario: Terminal transition opens ClosureModal with closeActions of the matching type

- **GIVEN** a Solicitud of `type: 'aprobacion_pago'` whose `InboxTypeConfig.closeActions[]` is `[{ id: 'approved', label: 'Aprobado', terminal_state: 'completed' }, { id: 'rejected', label: 'Rechazado', terminal_state: 'rejected' }]`
- **WHEN** the user drags the Kanban card from In Progress to Done
- **THEN** the `<ClosureModal>` opens, lists only those two close actions; on confirm, `closure_action: 'approved'`, `state: 'completed'`, `closure_comment` (when provided), `closed_by: <user_id>`, `closed_at: <ts>`, and the Timeline event are persisted

#### Scenario: state_labels override visual labels but not mechanics

- **GIVEN** an app's `InboxTypeConfig` declares `state_labels: { en_proceso: 'En curso' }` for a Tarea type
- **WHEN** the Tarea renders in the Tablero column "In Progress"
- **THEN** the column header shows "En curso"; the underlying engine still treats the state as `en_proceso` (transitions, terminal checks, audit refer to the canonical state value)

#### Scenario: Terminal states are immutable

- **GIVEN** a Solicitud in `state: 'completed'`
- **WHEN** the user attempts to transition it back to `en_proceso`
- **THEN** the engine REJECTS the transition; a Solicitud closed to a terminal state is not reopenable in V1

---

### Requirement: Alertas terminal states (`resolved` and `dismissed`) MUST require a justification via the ClosureModal

For every `ALERT_TYPE` whose `category` is `workflow`, transitions to terminal states `'resolved'` and `'dismissed'` MUST declare `mode: 'modal'` per the `core-data-tables` state-machine contract and MUST open the shared `<ClosureModal>` from `core-modals`. The justification SHALL be entered as a non-empty string of at least 10 characters and is persisted on the alert's `closure_comment` field. The `<ClosureModal>` MUST surface the justification field as required (label + asterisk + character-count helper). On confirm, a `TimelineEvent { kind: 'closed', at: <ts>, payload: { state: 'resolved' | 'dismissed', comment: '...' } }` MUST be appended. `triage` types MAY skip the justification when `ALERTS_CONFIG.requireClosureComment` is `false` for that type; `metric` and `cross_app_panel` rarely transition through the user UI (auto-close or dashboard read-only) and the justification rule is effectively `workflow`-mandatory.

#### Scenario: workflow `* → resolved` opens the ClosureModal with a required justification

- **GIVEN** a `workflow` `Alerta` in state `'in_progress'` and the user clicks "Resolver"
- **WHEN** the action fires
- **THEN** the shared `<ClosureModal>` opens with required justification (asterisk + 10-char minimum helper); the Confirm button is disabled until the textarea reaches ≥10 characters

#### Scenario: workflow `* → dismissed` opens the same ClosureModal

- **GIVEN** a `workflow` `Alerta` and the user clicks "Descartar"
- **WHEN** the action fires
- **THEN** the same `<ClosureModal>` opens; the user MUST enter a justification ≥10 chars before Confirm is enabled

#### Scenario: triage type with `requireClosureComment: false` skips the modal

- **GIVEN** an `ALERT_TYPE` with `category: 'triage'` and `ALERTS_CONFIG.requireClosureComment` set to `false` for this type
- **WHEN** the user clicks "Marcar como atendida"
- **THEN** the alert closes without opening the `<ClosureModal>`; a confirmation toast is shown; `closure_comment` is not set; a minimal `TimelineEvent { kind: 'closed', at: <ts> }` is appended

---

### Requirement: Dashboard MUST be a card-grid consolidated home; NO L1/L2/L3, NO domain operations

The Dashboard page (`src/pages/Dashboard.vue`) SHALL use a responsive card-grid layout (a CSS-grid or flex auto-fit composition with cards as the primary element); it MUST NOT use the L1/L2/L3 page-header / KPI-strip / section-table pattern declared by `core-layout`. The Dashboard MUST aggregate: KPIs from active domain modules (each KPI clickable, navigating to the relevant module); counters for the three list-shaped generics (Inbox unread Solicitudes count, Alertas critical-count, Reportes pending-runs / unfulfilled-dependencies count); and ONE OR MORE consolidated activity surfaces — either a single "Actividad reciente" timeline crossing modules, OR per-module activity widgets (canonical examples: an "Alertas activas" widget surfacing the most recent active alerts; a "Próximos vencimientos" widget surfacing reportes about to emit), OR a combination of both. The Dashboard MUST NOT carry domain-specific actions, filters, sub-tabs, or batch CTAs — those belong in the domain modules. Dashboard cards MUST be clickable and navigate to the relevant module on click.

#### Scenario: Dashboard does not use the L1/L2/L3 pattern

- **GIVEN** the user navigates to `/dashboard`
- **WHEN** the page renders
- **THEN** there is NO L1 page header (no title + actions row), NO L2 KPI strip (the KPIs are part of the card grid, not a separate strip), NO L3 section + table — the page is exclusively a responsive card grid

#### Scenario: Dashboard surfaces counters for the three list-shaped generics

- **GIVEN** the app has 7 unread Solicitudes, 3 critical Alertas, and 2 unfulfilled report dependencies
- **WHEN** the Dashboard renders
- **THEN** the card grid includes (at minimum) a card showing "Inbox · 7 Solicitudes activas", a card showing "Alertas · 3 críticas", a card showing "Reportes · 2 pendientes"; each card is clickable

#### Scenario: Dashboard surfaces per-module activity widgets

- **GIVEN** an app whose Dashboard composes the consolidated home from per-module activity widgets instead of a single "Actividad reciente" timeline
- **WHEN** the Dashboard renders
- **THEN** the card grid includes (a) an "Alertas activas" widget rendering the most recent active alerts (state in `new` or `in_review`) with a "Ver todas" link to `/alertas`, AND (b) a "Próximos vencimientos" widget rendering the next reportes ordered by `next` ascending with a "Ver catálogo" link to `/reportes`; each list row is clickable and navigates to the relevant module

#### Scenario: Clicking a Dashboard card navigates to the relevant module

- **GIVEN** the user is on `/dashboard`
- **WHEN** the user clicks the "Inbox · 7 Solicitudes activas" card
- **THEN** the router navigates to `/inbox`; the Inbox lands on the Activos segment by default

#### Scenario: Filters or sub-tabs on Dashboard are a contract violation

- **GIVEN** an app adds a filter dropdown or a `<Segmenter>` to the Dashboard page
- **WHEN** PR review checks the page against this contract
- **THEN** the change is REJECTED — Dashboard MUST be read-only orientation; filters and sub-tabs belong in domain modules

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

The TypeScript types `Solicitud<TPayload>`, `SolicitudState`, `InboxKind`, `TimelineEvent`, `Comment`, `Alerta`, `AlertCategory`, `Report`, `ReportRun`, `ReportDependency`, `ReportDependencySnapshot`, `ReportPermissions`, `ConsumerAppRef`, `InboxTypeConfig`, `RecurringInboxItemDefinition`, `CloseAction`, `TriggerSpec`, `ActionSpec`, `TriggeredAction` SHALL be exported from `src/types/genericos.ts` and SHALL be the single source of truth for the four generic modules' data shapes. App-specific extensions SHALL extend the base types via TypeScript interface extension (`type WithdrawalSolicitud = Solicitud<{ amount: number; ... }>`) or via generic narrowing. Apps SHALL NOT redefine the base interfaces in app code; doing so is a contract violation enforced at PR review (and optionally via a custom ESLint rule `no-redefine-genericos`). When apps need an additional base field that is universal across the core, the change MUST land in `src/types/genericos.ts` via a follow-up OpenSpec change that amends `core-modulo-genericos`.

#### Scenario: Base types are imported from the canonical file

- **GIVEN** any module file that needs the base shape
- **WHEN** the file imports the type
- **THEN** the import statement reads `import type { Solicitud, Alerta, Report, ReportRun, InboxTypeConfig } from '@/types/genericos';`; redefining the interface in app code is rejected

#### Scenario: App-specific Solicitud pins the payload generic

- **GIVEN** an app declares `type WithdrawalSolicitud = Solicitud<{ client: string; amount: number; reference: string; }>`
- **WHEN** TypeScript compiles
- **THEN** the extended type has the base required fields (`id`, `type`, `kind`, `source_app`, `target_app`, `owner`, `state`, `payload`, `timeline`, `comments`, …) PLUS the typed payload narrowing; the generic Inbox engine consumes the base fields without knowing about the payload narrowing

#### Scenario: Redefining the base interface in app code is rejected

- **GIVEN** an app introduces `interface Solicitud { id: string; titulo: string; }` (re-declaration with different fields) inside `src/modules/<app>/types.ts`
- **WHEN** PR review (or the optional ESLint rule `no-redefine-genericos`) runs
- **THEN** the change is REJECTED — the base interface MUST live in `src/types/genericos.ts` only

---

### Requirement: Dashboard MAY surface a period selector and an app-specific evolution chart placeholder; both are non-interactive with the underlying records

The Dashboard MAY render an optional period selector (canonical labels: "Últimos 7 días" / "Últimos 30 días" / "Últimos 90 días") pinned to the top-right of the page area, on the same row as the page title, scoped to the time-based KPI values it renders. The period selector SHALL NOT re-segment any list, SHALL NOT act as a `<Segmenter>`, and SHALL NOT be promoted to L1 of any other page — its scope is the Dashboard surface only and its effect is recomputing the KPI numerators. The Dashboard MAY also render an optional evolution chart placeholder card that the cloning app fills in with its app-specific metric (canonical placement: a 2/3-width card in a row paired with a 1/3-width activity widget such as "Alertas activas"). The placeholder card SHALL NOT carry actions, filters, or domain operations — its only role is to be a labeled empty surface that the app's chart implementation fills.

#### Scenario: Period selector is pinned to the top-right of the Dashboard

- **GIVEN** an app's Dashboard renders the period selector
- **WHEN** the page header area lays out
- **THEN** the period selector appears on the same horizontal row as the page title at the top-right of the page area; it is NOT a `<Segmenter>` and it is NOT placed inline with the activity widgets below

#### Scenario: Changing the period recomputes KPIs without re-segmenting any list

- **GIVEN** the Dashboard renders with the period set to "Últimos 30 días"
- **WHEN** the user changes the period to "Últimos 7 días"
- **THEN** the KPI values that depend on time (e.g. counters of activity within the period) are recomputed against the new range; the activity widgets ("Alertas activas", "Próximos vencimientos") may re-render their lists if they depend on the period; NO list elsewhere in the app is segmented or re-segmented as a result

#### Scenario: Evolution chart placeholder ships empty in the template; cloning apps fill it

- **GIVEN** a fresh clone of `core-template-frontend` with the Dashboard rendering its evolution chart placeholder card
- **WHEN** the user views `/dashboard`
- **THEN** the placeholder card renders with a labeled header (e.g. "Evolución (placeholder)") and a dashed-border empty region indicating where the cloning app should insert its app-specific chart; the card carries NO actions, filters, or domain operations

### Requirement: Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern; each tab has its own shape, filters, and columns

The Reportes module SHALL split its surface into two functional sub-tabs — **Catálogo** and **Ejecución** — implemented via the Type B Tabs pattern contracted by `core-module-types`: a `<Segmenter>` placed below the page header (NOT in the L1 actions area), exposing the two tabs over independent data models. Catálogo SHALL list `Report` entries (templates / definitions); Ejecución SHALL list `ReportRun` entries (generated runs).

The `Report` interface SHALL be exported from `src/types/genericos.ts` with required `id: string`, `category: ReportCategoryKey`, `name: string`, `description?: string`, `permissions: ReportPermissions` (mandatory; 4 independent levels — `view`, `execute`, `edit`, `delete`), `consumer_apps: ConsumerAppRef[]` (mandatory; empty array means headless — generated but not exposed in UI), `allows_auto_generation: boolean` (mandatory; drives the bifurcation in the próximo-emisión / dependency-incomplete events). Optional fields include `periodicity?`, `format?`, `params?`, `dependencies?: ReportDependency[]` (each entry MAY carry `recurring_definition_id?: string` to bind against a recurring Inbox series), `cron_enabled?`, `cron_active?`, `locked?`, `locked_reason?`. The `ReportRun` interface SHALL declare required `id: string`, `report_id: string`, `requested_at: number`, `status: 'requested' | 'running' | 'completed' | 'failed'`, `params: string`, `trigger: { type: 'cron' } | { type: 'manual'; user_id: string } | { type: 'system' }`, and optional `completed_at?`, `output_url?`, `error_message?`, `dependencies_unmet?: ReportDependencySnapshot[]` (populated when an auto-gen run completed with incomplete dependencies per `allows_auto_generation: true`).

The two tabs MUST NOT share columns, filters, or actions. Row visibility in Catálogo MUST filter by `permissions.view` intersected with the current user's capabilities; rows the user lacks `view` on are invisible. Row visibility in Ejecución MUST filter by the parent report's `permissions.view`.

#### Scenario: Reportes tabs are exactly Catálogo and Ejecución in that order, rendered below the header

- **GIVEN** the Reportes page renders
- **WHEN** the page mounts
- **THEN** the Tabs `<Segmenter>` renders below the page header, with options `[{ value: 'catalogo', label: 'Catálogo' }, { value: 'ejecucion', label: 'Ejecución' }]` in that order; default tab is `catalogo`

#### Scenario: Catálogo filters rows by permissions.view

- **GIVEN** the user has capabilities `['VIEW_REPORTS_OPERATIONAL']` and the catalog contains two reports: report A with `permissions.view: ['VIEW_REPORTS_OPERATIONAL']` and report B with `permissions.view: ['VIEW_REPORTS_REGULATORY']`
- **WHEN** the Catálogo tab renders
- **THEN** only report A is listed; report B is invisible (not just disabled — the user does not see it at all)

#### Scenario: consumer_apps[] empty means headless

- **GIVEN** a Report with `consumer_apps: []`
- **WHEN** any app's Reportes page renders its Catálogo
- **THEN** the report does NOT appear in any app's catalog; it remains executable via the headless endpoint (Tecnología-side cron / external integration)

#### Scenario: allows_auto_generation: false bifurcates próximo-emisión to an Inbox Tarea

- **GIVEN** a Report with `allows_auto_generation: false`, `next_emission_date` within `alert_anticipation_days`
- **WHEN** the scheduler emits the próximo-emisión event
- **THEN** the destination is the Inbox of the consumer (Tarea `reporte_proximo_emision_manual`), NOT an Alerta; the human ejecutor is the workflow owner

#### Scenario: allows_auto_generation: true generates with dependencies_unmet snapshot

- **GIVEN** a Report with `allows_auto_generation: true` and one dependency `completed: false` at the time of the scheduled run
- **WHEN** the scheduler invokes generation
- **THEN** the report is generated against the data available; a `ReportRun` is persisted with `dependencies_unmet: [{ ...snapshot of pending deps ... }]`; an Alerta `reporte_dependencias_incompletas` is emitted to the consumer; a Tarea `report_dependency_block` is emitted to the `blocking_app` Inbox

---

### Requirement: Dashboard evolution chart placeholder MUST be filled by a canonical chart wrapper

The Dashboard's evolution chart placeholder card (contracted as optional in `core-modulo-genericos` per the archived change `2026-04-30-extend-core-modulo-genericos-dashboard-widgets`) SHALL be filled by one of the canonical chart wrappers contracted in `core-charts`: `<LineChart>`, `<BarChart>`, or `<AreaChart>`. The placeholder card SHALL NOT be filled with a hand-rolled SVG, a third-party chart library, or a static image. The card retains its other contracted constraints (no actions, no filters, no sub-tabs, no domain operations) — only the rendering primitive is now contracted.

#### Scenario: Apps fill the placeholder with a canonical wrapper

- **GIVEN** a fresh clone of the template where the Dashboard placeholder is empty
- **WHEN** the cloning app implements its evolution chart
- **THEN** the implementation uses `<LineChart>`, `<BarChart>`, or `<AreaChart>` from `core-charts`; the choice depends on the app's metric (continuous → line/area, categorical → bar)

#### Scenario: Hand-rolled SVG in the placeholder is forbidden

- **GIVEN** an app fills the placeholder with a hand-coded SVG line chart
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the canonical wrappers are the contracted rendering primitive; hand-rolled SVGs introduce visual drift across apps

#### Scenario: Placeholder constraints still apply

- **GIVEN** an app fills the placeholder with `<LineChart>` and adds a period selector inside the card
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the period selector belongs at the Dashboard's top-right per the archived requirement, not inside the chart card; the chart card itself stays free of actions, filters, or sub-tabs

### Requirement: External CTAs MUST invoke a capability of the target app, not a specific execution route ("Wizard of Oz" principle)

A CTA in one app of the financial-core (CLP, Pago Directo, RFQ Gateway, FIN, OPS, …) that needs work done by another app SHALL invoke a **capability** declared by the destination app (e.g. `ejecutar_retiro` of OPS, `validar_kyc` of LEX, `liquidar_operacion` of TRD) and SHALL NOT couple to a specific execution path. The capability — implemented inside the destination app — SHALL decide at runtime, based on its own configuration (which MAY vary by amount, client, hour, operation type, or any other parameter the destination app owns), whether to satisfy the invocation by:

- **(a) Direct integration** — the destination app processes the request immediately and returns the result. No Solicitud is created in the Centro de Solicitudes; the CTA receives a synchronous outcome.
- **(b) Creating a Solicitud/Tarea in the Centro** — the destination app persists the work as a Solicitud/Tarea in its Inbox and returns a handle. The CTA subscribes to the eventual state of that Solicitud and surfaces "en proceso" → "completado" / "rechazado" to the user when the human operator closes it.

The decision between (a) and (b) is **implementation-level** and is the destination app's concern only. The calling CTA SHALL render the same UI for the user regardless of which path is taken — the only difference visible to the user is whether the outcome is immediate (a) or eventual (b). Switching from (b) to (a) — automating a previously-human capability — MUST NOT require any change to the calling CTA's code. This habilita the "Wizard of Oz arquitectónico" pattern: a product can launch with 100 % human execution in the Centro on day one and automate progressively by changing the destination app's internal configuration only.

The CTA SHALL NOT contain logic that explicitly creates a Solicitud in the Centro on behalf of the destination app. CTAs that need to model "submit to Centro" semantics (e.g. an internal Inbox-create form on the same module) are a different pattern — that pattern is the **manual creation flow** scoped to the destination app's own Inbox, not the cross-app CTA pattern this Requirement governs.

#### Scenario: Capability resolves via direct integration

- **GIVEN** an OPS capability `ejecutar_retiro` whose configuration routes retiros under USD 10 000 through a direct integration with the PSP
- **WHEN** a CLP user clicks "Retirar" with amount USD 5 000 and the CTA invokes `ejecutar_retiro`
- **THEN** the destination app processes the retiro inline (no Solicitud is persisted in the OPS Inbox), the CTA receives the success outcome synchronously, and the CLP user sees "completado" without any intermediate state

#### Scenario: Capability resolves by creating a Solicitud in the Centro

- **GIVEN** the same OPS capability `ejecutar_retiro` whose configuration routes retiros over USD 10 000 to the Centro for human review
- **WHEN** a CLP user clicks "Retirar" with amount USD 50 000 and the CTA invokes `ejecutar_retiro`
- **THEN** the destination app persists a Solicitud of type `retiro_aprobacion` in the OPS Inbox with `state: 'pendiente'`, returns a handle to the CLP CTA, the CLP user sees "en proceso" while the Solicitud is open, and the user transitions to "completado" or "rechazado" when an OPS operator closes the Solicitud via the `<ClosureModal>`

#### Scenario: Switching paths is invisible to the calling CTA

- **GIVEN** the same CTA code on CLP invoking `ejecutar_retiro`
- **WHEN** the OPS team changes the runtime configuration of `ejecutar_retiro` to lift the threshold from USD 10 000 to USD 100 000 (so retiros previously routed to the Centro now resolve via direct integration)
- **THEN** the CLP CTA continues to work unchanged; no PR, no redeploy, no test against the CLP repo is required; the change is purely on the OPS side

#### Scenario: A CTA hard-wired to "create Solicitud" is a contract violation

- **GIVEN** a CLP developer proposes a "Retirar" CTA whose `on_click` calls the OPS Inbox endpoint directly with a hand-built Solicitud payload, bypassing the `ejecutar_retiro` capability
- **WHEN** PR review checks the implementation against this Requirement
- **THEN** the change is REJECTED — the CTA MUST invoke the capability, not the persistence endpoint; the capability owns the (a) / (b) decision

---

### Requirement: Centro de Solicitudes scope is exclusive to human-intervention work; pure programmatic jobs live outside

The Inbox / Centro de Solicitudes SHALL house only Solicitudes/Tareas that require **human intervention from the backoffice**. Pure programmatic jobs — synchronization of records, audit sweeps, data normalization, depuración / cleanup, cron-driven internal maintenance, scheduler infrastructure of Reportes — MUST NOT be modeled as Solicitudes or Tareas. They live in code as **Task Definitions of Tecnología**, scheduler infrastructure, or equivalent technical primitives. Their state, retries, lag, and failures are observability concerns, not Centro concerns.

A programmatic job MAY declare an **opt-in fallback to the Centro**. When the fallback is enabled and the job fails (or hits an unrecoverable state that requires human follow-up), the system SHALL invoke the Centro endpoint with `source_app: 'system'` and create a Solicitud/Tarea for human escalation. The Solicitud carries enough context (job identifier, run id, failure reason, payload snapshot) for an operator to act. Without the fallback, the same failure routes to Observabilidad alerts only and the Centro is not touched.

The Solicitud canonical model SHALL NOT grow an `execution: manual | programmatic` discriminator. Pure programmatic jobs live outside the Centro entirely, so the discriminator would be meaningless. Every Solicitud / Tarea in the Centro is implicitly "manual / requires-human-action" — the `kind: 'solicitud' | 'tarea'` discriminator that already exists captures the semantic / presentational difference (a third-party-requested unit vs a self-issued unit), not the mode of execution.

#### Scenario: Programmatic job completes without touching the Centro

- **GIVEN** a daily cron job `sync_psp_movements` that pulls movements from a PSP and persists them in the OPS movements table, with no fallback declared
- **WHEN** the job runs successfully on a given day
- **THEN** no Solicitud is created in the OPS Inbox; the OPS operator does not see any entry for the run; the job's state is tracked only in the Tecnología scheduler logs

#### Scenario: Programmatic job with opt-in fallback escalates failure to the Centro

- **GIVEN** the same job `sync_psp_movements` but configured with `fallback_to_centro: { enabled: true, target_role: 'OPS_OFFICER', type: 'sync_failure_escalation' }`
- **WHEN** the job fails on a given day with an unrecoverable error
- **THEN** the system invokes the Centro endpoint with `source_app: 'system'`, `target_app: 'OPS'`, `type: 'sync_failure_escalation'`, payload including the run id and the error message, creating a Solicitud (or Tarea, per the type's `kind`) in `state: 'pendiente'` for an OPS operator to follow up

#### Scenario: A "data sync job tracking view" in the Inbox is a contract violation

- **GIVEN** a developer proposes adding to the Inbox a list of in-flight cron job runs ("sync running", "sync paused", "sync errored at step 3"), framed as Tareas
- **WHEN** PR review checks the proposal against this Requirement
- **THEN** the change is REJECTED — cron job state is observability data and belongs in monitoring (Grafana / equivalent), not in the human-work Centro; an opt-in fallback that creates a Solicitud on failure is the only sanctioned interaction between programmatic jobs and the Centro

#### Scenario: An `execution: 'programmatic'` field on Solicitud is a contract violation

- **GIVEN** a developer proposes adding `execution: 'manual' | 'programmatic'` to the `Solicitud` type to distinguish endpoints invoked by humans from endpoints invoked by schedulers
- **WHEN** PR review checks the proposal against this Requirement
- **THEN** the change is REJECTED — pure programmatic jobs do not appear in the Centro at all, so the discriminator is meaningless inside the model; the `kind: 'solicitud' | 'tarea'` discriminator already in place captures the only relevant axis (third-party-requested vs self-issued); the 2026-05-12 product session explicitly decided against this addition

### Requirement: Inbox MUST expose a typed registry `InboxTypeConfig` declaring `creable_manualmente`, `manual_creation_capability`, `payload_schema`, `closeActions[]`, `triggers_on_create[]`, `available_actions[]`, `push_notification?`, `auto_archive?`

Every app's Inbox SHALL declare a typed registry `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` in `src/config/inbox-types.ts` (or in an app-specific equivalent that the Inbox page imports). The registry is keyed by `concept` (the business classifier — `Solicitud.concept`). Each registry entry SHALL declare:

- `concept: string` — the canonical business classifier identifier matching `Solicitud.concept` of records of this kind.
- `type: InboxType` — `'solicitud'` or `'tarea'`; mandatory; drives label/badge and closeActions vocabulary.
- `label: string` — human-readable label of the concept.
- `target_app: string` — the app that owns Solicitudes/Tareas of this concept.
- `target_role?: string` — capability for routing notifications.
- `payload_schema: DynamicFormSchema` — the schema that `<DynamicPayloadForm>` consumes to render the create form; consumed by the template's existing `useDynamicForm` composable.
- `sla_hours?: number` — default SLA window for new records of this concept.
- `creable_manualmente?: boolean` — default `false`; when `true`, the concept is creatable from the Inbox main CTA.
- `manual_creation_capability?: string` — capability required for manual creation from the Inbox CTA; SHALL be honored even when `creable_manualmente: true` is set.
- `closeActions: CloseAction[]` — at least one entry; each `{ id, label, terminal_state, requires_comment? }`. The `<ClosureModal>` lists these as the close-action choices.
- `triggers_on_create?: TriggerSpec[]` — manifest-engine actions to invoke automatically on creation, each with `action_id` + optional `payload_mapping`.
- `available_actions?: ActionSpec[]` — CTAs that appear in the `<Drawer>` of records of this concept, with `enable_when` predicate.
- `push_notification?` — declares optional canales `browser` / `email` / `slack` (each opt-in per concept; in-app badge is always-on, not declared per concept).
- `auto_archive?` — declarative auto-close rule: `{ condition_ref: string; closure_action: string }`. The engine evaluates `condition_ref` over time and auto-closes the record with `closure_action` when the condition becomes true; `closed_by: 'system'`.
- `state_labels?: Partial<Record<SolicitudState, string>>` — visual override of state labels; never changes the mechanism.

The registry SHALL be immutable at runtime (`Readonly<...>`). The Inbox page SHALL import the registry and use it to: (a) resolve close-action vocabularies for the `<ClosureModal>`; (b) gate the main CTA (see next Requirement); (c) render labels and badges. Apps SHALL NOT mutate the registry at runtime; new concepts are added via a fresh declaration + PR.

#### Scenario: A concept is creable_manualmente AND the user has the capability

- **GIVEN** an `InboxTypeConfig` entry for `'aprobacion_pago'` with `creable_manualmente: true` and `manual_creation_capability: 'INBOX_CREATE'`, and a user with `capabilities: ['INBOX_CREATE']`
- **WHEN** the Inbox page renders
- **THEN** the concept is included in the result of `listCreableTypes(user.capabilities)`; the main CTA surfaces this concept in the type-selector wizard

#### Scenario: A concept is creable_manualmente but the user lacks the capability

- **GIVEN** the same concept, but a user with `capabilities: []`
- **WHEN** `listCreableTypes(user.capabilities)` is called
- **THEN** the concept is NOT included in the result; the main CTA does not list it in the type selector

#### Scenario: A concept is NOT creable_manualmente

- **GIVEN** an `InboxTypeConfig` entry with `creable_manualmente: false` (or omitted; default is `false`)
- **WHEN** `listCreableTypes(...)` is called
- **THEN** the concept is NEVER in the result regardless of the user's capabilities; the concept can still arrive via API ingestion or recurring series, just not from the manual CTA

#### Scenario: auto_archive closes the record on condition evaluation

- **GIVEN** an `InboxTypeConfig` for `report_dependency_block` with `auto_archive: { condition_ref: 'reportDeps.completed === true', closure_action: 'dependency_resolved' }`
- **WHEN** the engine evaluates the condition at a later time and it returns true
- **THEN** the Tarea transitions to `state: 'completed'`, `closure_action: 'dependency_resolved'`, `closed_by: 'system'`, `closed_at: <ts>`; a `TimelineEvent { kind: 'closed', by: 'system' }` is appended

### Requirement: Solicitud `assignee` is distinct from `owner`; both are independently mutable in non-terminal states

The `Solicitud` model SHALL maintain two independent fields:

- `owner: string | null` — the user actively working the record now. Auto-assigned on transition to `state: 'en_proceso'` (the "Tomar" action of the manifest); cleared on "Liberar"; null in `state: 'pendiente'`.
- `assignee?: string | null` — the user the record is directed to. Settable at create time via the manual CTA; mutable in any non-terminal state via the "Asignar / Reasignar / Liberar" CTA in the `<Drawer>`; independent of `owner`.

A change to `assignee` SHALL NOT affect `owner` and vice versa. Each change SHALL emit its own `TimelineEvent` — `{ kind: 'assigned', payload: { previous, new } }` for assignee changes, `{ kind: 'taken' | 'released' }` for owner changes. Any user with capability to manage the Inbox of the `target_app` MAY change `assignee` regardless of who currently owns the record.

#### Scenario: Tomar assigns owner without affecting assignee

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: null` in state `pendiente`
- **WHEN** the user `'u-3'` clicks "Tomar"
- **THEN** `owner: 'u-3'`, `state: 'en_proceso'`, `assignee` remains `'u-2'`; the Timeline records a `kind: 'taken'` event by `'u-3'`

#### Scenario: Reasignar updates assignee without affecting owner

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: 'u-3'` in state `en_proceso`
- **WHEN** any user with manage capability changes `assignee` to `'u-4'`
- **THEN** `assignee: 'u-4'`, `owner` remains `'u-3'`; the Timeline records a `kind: 'assigned'` event with `payload: { previous: 'u-2', new: 'u-4' }`

#### Scenario: Liberar nullifies owner without affecting assignee

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: 'u-3'`
- **WHEN** `'u-3'` clicks "Liberar"
- **THEN** `owner: null`, `state: 'pendiente'`, `assignee` remains `'u-2'`; Timeline records `kind: 'released'`

---

### Requirement: Inbox SHALL support recurring series via `RecurringInboxItemDefinition`; each instance is independent

The Inbox SHALL accept a typed declaration of recurring series via `RecurringInboxItemDefinition` exported from `src/types/genericos.ts`. A series declares: `id`, `type` (must reference an existing `InboxTypeConfig`), `label`, `target_app`, `target_role?`, `default_assignee?`, `payload_template`, `cadence: { periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'custom', cron_expr?, next_creation_date, sla_hours?, due_offset_hours? }`, `series_state: 'active' | 'paused' | 'archived'`, `created_at`, `updated_at`. The series scheduler (Tecnología-side, out of scope for the template) walks active series and creates **independent** Solicitud/Tarea instances per the cadence; each instance carries `recurring_definition_id: <series.id>`. Instances have independent lifecycle — the instance of day X that doesn't close on time does not block the instance of day X+1; they coexist in the Inbox until each closes. Series `paused` halts generation without removing existing instances; `archived` terminates the series; modifying cadence or payload template on an active series requires a fresh REQ in V1 (UI-managed series modification is V2).

#### Scenario: Two consecutive instances of a daily series coexist

- **GIVEN** a series `daily_reconciliation` (`series_state: 'active'`) creates instance A on Monday and instance B on Tuesday; instance A is still in `pendiente` when Tuesday's scheduler runs
- **WHEN** the Tuesday scheduler creates instance B
- **THEN** both instances coexist in the Inbox; instance A's open state does NOT block creation of instance B; each has its own `recurring_definition_id` pointing to the series

#### Scenario: Pausing the series stops generation

- **GIVEN** the same series transitions to `series_state: 'paused'` after Tuesday's instance
- **WHEN** Wednesday's scheduler runs
- **THEN** no new instance is created for Wednesday; existing instances (A and B) remain open and editable

#### Scenario: REPORT_DEPENDENCY binds to a recurring series via recurring_definition_id

- **GIVEN** a Report whose `dependencies[]` includes `{ blocking_app: 'OPS', blocking_module: 'inbox', blocking_type: 'daily_reconciliation', recurring_definition_id: 'series-daily-recon' }`
- **WHEN** the next instance of `series-daily-recon` transitions to `state: 'completed'`
- **THEN** the engine evaluates `auto_archive` of the corresponding `report_dependency_block` Tarea; the Tarea auto-closes per its declared `closure_action`

---

### Requirement: Reportes MUST declare `ReportPermissions` (4 independent levels: `view` / `execute` / `edit` / `delete`) with secure defaults; `consumer_apps[]` MUST be declared (empty = headless)

Every `Report` SHALL declare a mandatory `permissions: ReportPermissions` field with four independent capability lists: `view` (filters the catalog and the runs list), `execute` (manual generation + scheduling), `edit` (modification of definition, CRON, dependencies, consumer apps), `delete` (archival / lifecycle close). Capabilities are referenced by ID and resolve against the same capability provider that the manifest engine uses (single source of truth). When `permissions` is not declared explicitly, the default SHALL be: only the creator of the REQ that introduced the Report plus the `manage_reports` capability owner (typically `ADMIN_GROUP`) hold all four levels — the report is invisible to every other user. This is the secure default and prevents accidental exposure of sensitive reports (P&L, cross-entity aggregates, etc.).

Every `Report` SHALL also declare `consumer_apps: ConsumerAppRef[]` — an empty array indicates a **headless** report (generated by Tecnología-side cron / integration, not exposed in any app's UI). Non-empty `consumer_apps[]` causes the report to render in each declared app's catalog, subject to `permissions.view`. `consumer_apps` and `permissions` are **orthogonal dimensions**: `consumer_apps` defines where the report appears; `permissions` defines which users see it within those apps.

#### Scenario: Default permissions render only for the creator + ADMIN_GROUP

- **GIVEN** a Report declared without explicit `permissions`
- **WHEN** any user other than the creator or `ADMIN_GROUP` browses the catalog
- **THEN** the report is NOT in the catalog; the user does not see it

#### Scenario: Explicit permissions filter the catalog by view

- **GIVEN** a Report with `permissions.view: ['VIEW_REPORTS_OPERATIONAL']` and a user with capabilities `['VIEW_REPORTS_OPERATIONAL']`
- **WHEN** the catalog renders for this user
- **THEN** the report appears; "Generar" is enabled only when `permissions.execute` intersects the user's capabilities

#### Scenario: consumer_apps[] empty is headless

- **GIVEN** a Report with `consumer_apps: []`
- **WHEN** any app's Reportes page renders its catalog
- **THEN** the report is NOT listed in any app's UI; it remains executable via the headless endpoint with `trigger: { type: 'system' }`

---

### Requirement: Reportes MUST bifurcate by `allows_auto_generation` for próximo-emisión and incomplete-dependency events

Every Report SHALL declare a mandatory `allows_auto_generation: boolean` field. The scheduler and the generation engine SHALL bifurcate their event emissions based on this flag:

- **Próximo a emitir (within `alert_anticipation_days` of `next_emission_date`):**
  - `allows_auto_generation: true` → emit Alerta `reporte_proximo_emision_auto` to the consumer apps.
  - `allows_auto_generation: false` → emit **Tarea** `reporte_proximo_emision_manual` to the Inbox of the consumer app (the human ejecutor must generate the report manually; this is a workflow item, not an announcement).

- **Generation attempted with `dependencies[].completed: false`:**
  - `allows_auto_generation: true` → **generate anyway** with the data available; persist the `ReportRun` with `dependencies_unmet: [...snapshot...]`; emit Alerta `reporte_dependencias_incompletas` to consumer apps **AND** Tarea `report_dependency_block` to the `blocking_app` Inbox.
  - `allows_auto_generation: false` → DO NOT generate; emit Tarea `report_dependency_block` to the `blocking_app` Inbox (the next scheduler tick re-evaluates).

Manual generation (`/Generar` clicked) follows the dependency-block rule regardless of `allows_auto_generation` — the rationale is that the user explicitly requested generation; the engine SHOULD signal the block (Tarea to `blocking_app`, blocked toast on the report row) and not produce a half-generated artifact.

#### Scenario: Próximo-emisión with allows_auto_generation: true emits Alerta

- **GIVEN** a Report with `allows_auto_generation: true`, `next_emission_date` 3 days out, `alert_anticipation_days: 5`
- **WHEN** the scheduler evaluates
- **THEN** an Alerta `reporte_proximo_emision_auto` is emitted to the consumer apps; no Inbox Tarea is created

#### Scenario: Próximo-emisión with allows_auto_generation: false emits Tarea

- **GIVEN** the same Report but with `allows_auto_generation: false`
- **WHEN** the scheduler evaluates
- **THEN** a Tarea `reporte_proximo_emision_manual` is emitted to the Inbox of the consumer app (whoever owns the manual generation); no Alerta is emitted on the próximo-emisión path

#### Scenario: Auto-gen with incomplete dependencies generates with snapshot

- **GIVEN** a Report with `allows_auto_generation: true` and one dependency `completed: false`
- **WHEN** the scheduler invokes generation
- **THEN** generation produces a `ReportRun` with `status: 'completed'`, `dependencies_unmet: [{ ...snapshot... }]`; Alerta `reporte_dependencias_incompletas` is emitted to consumers; Tarea `report_dependency_block` is emitted to the `blocking_app` Inbox

#### Scenario: Manual Generar with incomplete dependencies is blocked

- **GIVEN** a Report (regardless of `allows_auto_generation`) with one dependency `completed: false`, and the user clicks "Generar"
- **WHEN** the engine evaluates dependencies
- **THEN** generation is BLOCKED; a toast names the blocking app + module + type; a Tarea `report_dependency_block` is emitted to the `blocking_app` Inbox; no `ReportRun` is persisted

### Requirement: Drawer MUST render a `triggered_actions` panel when the Solicitud carries one or more entries

When the Drawer opens for a Solicitud whose `triggered_actions[]` is non-empty, the Drawer body SHALL render a labeled section (`"Acciones disparadas"` — or equivalent) listing every entry. Each row SHALL surface:

- The `action_ref` of the trigger (mono-font / kbd-style rendering to communicate it is an action identifier, not free text).
- A `<Badge>` rendering the entry's `status`, mapped:
  - `pending` → variant `warning`
  - `ok` → variant `success`
  - `error` → variant `danger`
- The `result_ref` (when present) rendered next to / under the badge.
- The `error_message` (when present, and `status === 'error'`) rendered as a small caption row below the action_ref.

The panel SHALL be hidden entirely when `triggered_actions` is `undefined` or an empty array — no "no triggers yet" placeholder is rendered (the Drawer's other sections — Información, Timeline, Comments — already convey the absence by their presence). The panel placement SHALL be inside the Drawer body slot between the Información section and the Timeline section.

#### Scenario: Panel renders one row per triggered_actions entry

- **GIVEN** a Solicitud with `triggered_actions: [{ action_ref: 'demo.x', status: 'ok', result_ref: 'FACT-001', at: 0 }, { action_ref: 'demo.y', status: 'pending', at: 1 }]`
- **WHEN** the user opens the Drawer on this Solicitud
- **THEN** the body shows the labeled panel with two rows: the first for `demo.x` with a `success` badge ("ok") and `FACT-001` shown; the second for `demo.y` with a `warning` badge ("pending")

#### Scenario: Error entries surface the error_message caption

- **GIVEN** a Solicitud with `triggered_actions: [{ action_ref: 'demo.z', status: 'error', error_message: 'Service unavailable', at: 0 }]`
- **WHEN** the Drawer renders the panel
- **THEN** the row shows `demo.z` with a `danger` badge ("error") AND a caption row below the action_ref showing `"Service unavailable"`

#### Scenario: Empty triggered_actions hides the panel entirely

- **GIVEN** a Solicitud with `triggered_actions` undefined or `[]`
- **WHEN** the Drawer renders
- **THEN** no "Acciones disparadas" section is rendered; the Drawer body shows only Información (the page-provided default slot content) + Timeline + Comments

#### Scenario: Hiding the panel when entries are populated is a contract violation

- **GIVEN** a PR proposes hiding the panel even when entries are non-empty (e.g. behind a collapsed toggle by default)
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED — when entries are populated, the panel MUST render eagerly so the user sees the trigger status without extra clicks

### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>

The Inbox module SHALL manage entities named `Solicitud` in TypeScript code; the canonical identifier is the **generic** `Solicitud<TPayload = unknown>` exported from `src/types/genericos.ts` and SHALL NOT be aliased to "Item", "Ticket", or any other generic noun. The interface SHALL declare required fields `id: string`, `concept: string`, `type: InboxType`, `source_app: string`, `source_module: string`, `target_app: string`, `owner: string | null`, `state: SolicitudState`, `payload: TPayload`, `timeline: TimelineEvent[]`, `comments: Comment[]`, `created_at: string`, `updated_at: string`; and optional fields `target_role?: string`, `assignee?: string | null`, `severity?: Severity`, `sla_hours?: number | null`, `due_at?: number`, `recurring_definition_id?: string`, `triggered_actions?: TriggeredAction[]`, `closure_action?: string`, `closure_comment?: string`, `closed_by?: string`, `closed_at?: number`. The `type: InboxType` field (canonical values `'solicitud' | 'tarea'`) is the **discriminator** between Solicitudes (third-party-requested) and Tareas (self-issued); both share the same engine, lifecycle, and `<ClosureModal>` mechanics. The `concept: string` field (e.g. `'aprobacion_pago'`, `'revision_legajo'`) is the **business classifier** — what this Solicitud is about — and matches the key of an entry in `INBOX_TYPES_REGISTRY`. The Inbox page SHALL NOT render a `<Segmenter>` for record-set segmentation; users narrow the visible records via the L3 filter row (Concepto / Estado / Tipo / Mías). The detail surface for any Solicitud/Tarea SHALL be the side `<Drawer>` (`meta.detail = 'drawer'`); a centered modal is forbidden.

#### Scenario: Solicitud<TPayload> is imported from the canonical types file

- **GIVEN** an app's Inbox page or extension types
- **WHEN** the file imports the canonical shape
- **THEN** the import statement reads `import type { Solicitud } from '@/types/genericos';`; apps that need typed payload pin it via `type KycSolicitud = Solicitud<KycPayload>`; redefining the base generic in app code is forbidden

#### Scenario: type is the discriminator between Solicitud and Tarea

- **GIVEN** two records of the same engine
- **WHEN** one is created from a CLP CTA targeting OPS (`type: 'solicitud'`) and the other from a recurring series internal to OPS (`type: 'tarea'`)
- **THEN** both share `state`, `timeline`, `comments`, `closeActions[]` mechanics; the only differences are the label/badge in the UI and the vocabulary of the closeActions

#### Scenario: assignee is distinct from owner

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: null` in state `pendiente`
- **WHEN** an operator clicks "Tomar"
- **THEN** the engine sets `owner: <current_user_id>` and transitions state to `en_proceso`; the `assignee` field is unchanged; the Timeline records both events separately (one `kind: 'taken'` and zero `kind: 'assigned'` for this transition)

#### Scenario: App-specific Solicitud pins the payload type

- **GIVEN** an app declares `type WithdrawalSolicitud = Solicitud<{ client: string; amount: number; currency: string; }>`
- **WHEN** the app reads `s.payload.amount`
- **THEN** the field is typed as `number`; TypeScript narrows correctly without `as` casts; the base fields (`id`, `concept`, `type`, `target_app`, `state`, etc.) remain required

#### Scenario: Removing type or concept is a contract violation

- **GIVEN** an app introduces `interface Solicitud { ... }` without a `type` field or without a `concept` field
- **WHEN** PR review checks the change
- **THEN** the change is REJECTED — `type` is the canonical discriminator (`'solicitud' | 'tarea'`) and `concept` is the business classifier; the UI MUST render the correct badge per `type` and the engine MUST resolve `InboxTypeConfig` via `concept`

---

### Requirement: Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics

The Alertas module SHALL house system-detected events that require human attention. Every `ALERT_TYPE` declared in an app's config MUST carry a `category: AlertCategory` discriminator (canonical values: `'triage' | 'workflow' | 'metric' | 'cross_app_panel'`) that activates exactly one canonical UI pattern per type:

- **`triage` (formerly profile A)** — Active triage list. Inbox-style list without owner / SLA. New alerts surface; users mark resolved or dismissed.
- **`workflow` (formerly profile B)** — Master-detail with sub-categorization. Drawer with Timeline + Comments. Terminal-state `<ClosureModal>` with justification.
- **`metric` (formerly profile C)** — Time-series with charts. Chart-first surface; alerts are derived from a metric crossing a threshold; resolution is automatic when the metric returns inside the threshold.
- **`cross_app_panel` (formerly profile D)** — Cross-app KPI dashboard. Consolidated KPIs with cross-app filters; not an actionable list. Lives prioritarily as `<CrossAppPanelCard>` of the Dashboard, not as a row in the Alertas list.

The `Alerta` interface SHALL be exported from `src/types/genericos.ts` with the discriminator `category: AlertCategory`. Apps SHALL activate exactly one category per `ALERT_TYPE` — mixing categories within a single ALERT_TYPE is forbidden. The Alertas page SHALL read each row's `category` and render the corresponding UI pattern. The previous `AlertProfile` type name and `Alerta.profile` field name SHALL NOT appear in code; PR review rejects any reintroduction.

#### Scenario: workflow category renders the workflow surface

- **GIVEN** an `ALERT_TYPE` declared with `category: 'workflow'` and an `Alerta` row of that type
- **WHEN** the user clicks the row
- **THEN** the side `<Drawer>` opens with Timeline + Comments; the Tablero (Kanban) view is available; terminal-state transitions (`* → resolved`, `* → dismissed`) MUST go through the `<ClosureModal>` with justification ≥10 chars

#### Scenario: triage category renders the simple triage list

- **GIVEN** an `ALERT_TYPE` declared with `category: 'triage'`
- **WHEN** the user opens the corresponding Alerta
- **THEN** the row resolves with a single click (no Drawer, no Timeline by default); the resolution action surfaces a confirmation toast per `core-error-handling`

#### Scenario: metric category renders a chart-first surface

- **GIVEN** an `ALERT_TYPE` declared with `category: 'metric'` (e.g. saldo anomaly)
- **WHEN** the user navigates to the Alertas section filtered to that type
- **THEN** the page renders a chart of the underlying metric with thresholds overlaid; the alert list appears as a compact secondary panel; resolution is automatic when the metric returns inside the threshold

#### Scenario: cross_app_panel category renders as a Dashboard card by default

- **GIVEN** an `ALERT_TYPE` declared with `category: 'cross_app_panel'` (e.g. daily limit utilization across CLP / OPS / FIN)
- **WHEN** the destination app's Dashboard renders
- **THEN** the alert is surfaced as a `<CrossAppPanelCard>` card; it MUST NOT appear in the Alertas triage list (the triage list filters out `cross_app_panel` types)

#### Scenario: Mixing categories within a single ALERT_TYPE is forbidden

- **GIVEN** an `ALERT_TYPE` declares `category: ['triage', 'workflow']` (an array, attempting to mix)
- **WHEN** the app config validates
- **THEN** the validation FAILS with an error indicating that exactly one category MUST be activated per ALERT_TYPE

---

### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea report_dependency_block with declarative auto_archive

When a `Report` declares a `dependencies[]` list and the user attempts to generate the report (clicks "Generar"), the engine SHALL evaluate each dependency. If any dependency entry has `completed: false`, the Generar action MUST be BLOCKED and the engine MUST emit a `REPORT_DEPENDENCY` event addressed to the **Inbox** of the destination app indicated by `blocking_app`. The destination app's Inbox MUST consume incoming `REPORT_DEPENDENCY` events and create a **Tarea** (`kind: 'tarea'`) with `type: 'report_dependency_block'`, payload including `report_id`, `report_name`, `blocking_module`, `blocking_type`, `recurring_definition_id?` (when the dependency binds to a recurring series of the Inbox per `RecurringInboxItemDefinition`), `description`, `due_at`. The Tarea type MUST declare `auto_archive` whose `condition_ref` evaluates `dependencies[].completed: true` for the specific dependency. When the dependency resolves (either a human closes the relevant Solicitud/Tarea or a recurring series completes its bounded instance), the engine SHALL auto-close the Tarea — `state: 'completed'`, `closure_action: 'dependency_resolved'`, `closed_by: 'system'`, `closed_at: <ts>`, and a `TimelineEvent { kind: 'closed', at: <ts>, by: 'system' }`. The previous routing of `REPORT_DEPENDENCY` events as Alertas with `profile: 'A'` SHALL NOT appear in the codebase; PR review rejects any reintroduction.

#### Scenario: Generar is blocked when a dependency is unfulfilled

- **GIVEN** a `Report` whose `dependencies` includes `{ blocking_app: 'OPS', blocking_module: 'movements', blocking_type: 'daily_reconciliation', completed: false }`
- **WHEN** the user clicks "Generar"
- **THEN** the action is blocked with a per-row toast that names the blocking app + module + type; the engine emits a `REPORT_DEPENDENCY` event addressed to the OPS Inbox

#### Scenario: Destination Inbox creates a Tarea of type `report_dependency_block`

- **GIVEN** the OPS app subscribes to `REPORT_DEPENDENCY` events
- **WHEN** an event arrives with `report_id: 'rpt-monthly-tax'`, `blocking_app: 'OPS'`, `blocking_module: 'movements'`, `blocking_type: 'daily_reconciliation'`, `recurring_definition_id?: 'series-daily-recon'`
- **THEN** the OPS Inbox creates a Tarea (`kind: 'tarea'`) of `type: 'report_dependency_block'`, `state: 'pendiente'`, payload describing the blocking report; the Tarea is routed by `target_role` of the `InboxTypeConfig` for `report_dependency_block`

#### Scenario: Dependency resolution auto-archives the Tarea

- **GIVEN** an OPS Tarea of type `report_dependency_block` raised because reconciliation was incomplete
- **WHEN** the OPS operator closes the related `daily_reconciliation` Tarea (or a recurring series instance completes successfully)
- **THEN** the engine evaluates the `auto_archive.condition_ref`, sets the `report_dependency_block` Tarea's `state: 'completed'`, `closure_action: 'dependency_resolved'`, `closed_by: 'system'`, `closed_at: <ts>`; the user does not interact with the auto-close

#### Scenario: Routing REPORT_DEPENDENCY to Alertas is a contract violation

- **GIVEN** a developer proposes routing `REPORT_DEPENDENCY` events to the destination app's Alertas instead of the Inbox
- **WHEN** PR review checks the proposal against this Requirement
- **THEN** the change is REJECTED — the 2026-05-11 product decision routes the event to the Inbox as a Tarea; the Alertas route is removed

---

### Requirement: Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by InboxTypeConfig.creable_manualmente: true and manual_creation_capability; the label is derived from type of the available configs

The Inbox page SHALL render a main CTA in the L1 header (alongside the `<ViewToggle>`) that lets the operator manually create a Solicitud or Tarea of a type declared `creable_manualmente: true` in `INBOX_TYPES_REGISTRY`, gated by the current user's `manual_creation_capability` per type. The CTA SHALL behave as follows:

- **Visibility.** When no entry in `INBOX_TYPES_REGISTRY` declares `creable_manualmente: true`, the CTA SHALL NOT render. When at least one type declares it but the current user has no `manual_creation_capability` of any such type, the CTA SHALL render **disabled** with a tooltip ("Sin permiso para crear") — consistent with the universal-`⋯`-menu pattern of `core-actions-menu` (the CTA never disappears arbitrarily when the registry has creable types; the disabled state communicates lack of capability).
- **Label.** Derived from the available types (those that pass both filters):
  - Only `kind: 'solicitud'` types available → label "Crear Solicitud".
  - Only `kind: 'tarea'` types available → label "Crear Tarea".
  - Both kinds available → label "Crear" (generic).
- **Click → wizard.** Clicking opens a 2-step `<InboxCreateDialog>`. Step 1: `<InboxTypeSelector>` lists the filtered types with kind-badge. Step 2: `<DynamicPayloadForm>` renders the payload form from the selected type's `payload_schema` plus common metadata (assignee picker, optional `sla_hours` / `due_at` when the type declares them).
- **Submit.** Builds a `Solicitud<TPayload>` with `state: 'pendiente'`, `source_app: <current_app>`, `source_module: 'inbox'`, `target_app: <inbox_target>`, `kind`, `payload`, optional `assignee`, optional `due_at`, optional `sla_hours`. Persists. Triggers `triggers_on_create[]` per the type config. Disparates notifications per `push_notification` (in-app always; opt-in canales as declared). Emits an `AuditEntryCTA` with `is_module_cta: true`, `created_record_type: <type>`, `kind: 'cta'`.

The CTA is NOT a row action and is NOT declared in `Manifest.module_ctas[]` — it lives outside the manifest engine because the type-selector wizard requires multi-step state that the single-dialog manifest CTA does not model. The shared audit trail (`useAuditLog()`) is the bridge that keeps the new CTA observable on the same surface as manifest-emitted entries.

#### Scenario: CTA hides when no type is creable_manualmente

- **GIVEN** an `INBOX_TYPES_REGISTRY` where every entry has `creable_manualmente: false` (or omits it)
- **WHEN** the Inbox page renders
- **THEN** the main CTA is NOT in the DOM

#### Scenario: CTA renders disabled when the user lacks any matching capability

- **GIVEN** a registry with at least one creable type whose `manual_creation_capability` is `'INBOX_CREATE'`, and the current user has no `INBOX_CREATE` capability
- **WHEN** the Inbox page renders
- **THEN** the CTA renders in a disabled state with tooltip "Sin permiso para crear"; clicking is a no-op

#### Scenario: Label is kind-derived

- **GIVEN** two creable types both with `kind: 'solicitud'`
- **WHEN** the CTA renders
- **THEN** its label is "Crear Solicitud"
- **AND GIVEN** the registry adds a third creable type with `kind: 'tarea'`
- **WHEN** the CTA re-renders
- **THEN** its label is "Crear" (mixed kinds)

#### Scenario: Submit creates a Solicitud and emits AuditEntryCTA

- **GIVEN** the wizard is on step 2 with a valid form for type `aprobacion_pago` (`kind: 'solicitud'`); user clicks Submit
- **WHEN** the submit handler runs
- **THEN** a new Solicitud lands in `solicitudes.value` with `state: 'pendiente'`, populated `payload`, `kind: 'solicitud'`, `target_app` per the registry entry, `source_module: 'inbox'`, `assignee` if the user picked one; AND `useAuditLog().append(...)` is called once with `{ kind: 'cta', is_module_cta: true, created_record_type: 'aprobacion_pago', record_id: <new id>, manifest_key: INBOX_MANIFEST_KEY, ... }`; AND a success toast renders ("Solicitud creada"); AND the wizard closes.

#### Scenario: triggers_on_create fires for the new record

- **GIVEN** a type with `triggers_on_create: [{ action_id: 'fin.crear_factura_borrador', payload_mapping: { ... } }]`
- **WHEN** a Solicitud of that type is created via the CTA
- **THEN** the engine records each declared trigger as `triggered_actions[]` entries on the new Solicitud with `status: 'pending'`; a `TimelineEvent { kind: 'action_invoked', label: 'Trigger: fin.crear_factura_borrador' }` is appended (V1 — the actual action invocation through the manifest engine is V2-scoped per Design Decision 9 of this change)

---

### Requirement: Inbox views MUST surface the type discriminator as a badge and the L3 filter row MUST expose a type filter

The Inbox page SHALL render the `kind` (`'solicitud' | 'tarea'`) discriminator of every visible record as a `<Badge>` per the canonical `Solicitud` / `Tarea` labels in **all four** surfaces: list rows, card headers, kanban cards, and the Drawer header area. The L3 filter row SHALL also expose a **kind filter** (separate from the Tipo and Estado filters; native `<select>` is permitted at the L3 row per the existing Inbox convention; `<Segmenter>` is forbidden because the Inbox spec disallows record-set segmentation). The kind filter SHALL expose three options regardless of how many entries of each kind exist in the dataset: `"Todos"`, `"Solicitudes"`, `"Tareas"`. When the filter is `"Todos"` (or unset) the view SHALL render records of both kinds; when set to a specific kind, the view SHALL hide records of the other kind. The kind filter is independent of and AND-merges with the Tipo and Estado filters.

#### Scenario: Kind badge appears in every view

- **GIVEN** a Solicitud with `kind: 'solicitud'` and a Tarea with `kind: 'tarea'` both present in the dataset
- **WHEN** the Inbox page renders
- **THEN** the row of the Solicitud surfaces a `<Badge>` labeled `"Solicitud"` (and the row of the Tarea a `<Badge>` labeled `"Tarea"`) in the list view, the cards view, the kanban view, and on the header of the Drawer when opened — four surfaces total

#### Scenario: Kind filter narrows the visible dataset to one kind

- **GIVEN** the L3 filter row with `Kind = "Tareas"` selected
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only records with `kind: 'tarea'` are rendered in the active view; the L2 KPI counters recompute over the narrowed set

#### Scenario: Kind filter "Todos" renders both kinds simultaneously

- **GIVEN** the L3 filter row with `Kind = "Todos"`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** both Solicitudes and Tareas render together; each row carries its own kind badge so the user can disambiguate at a glance

#### Scenario: Kind filter coexists with the Tipo and Estado filters

- **GIVEN** the L3 filter row with `Kind = "Solicitudes"`, `Tipo = "aprobacion_pago"`, `Estado = "pendiente"`
- **WHEN** `filteredSolicitudes` recomputes
- **THEN** only records with `kind: 'solicitud' AND type === 'aprobacion_pago' AND state === 'pendiente'` are rendered; all three filters AND-merge

#### Scenario: Hiding the kind badge from any of the four surfaces is a contract violation

- **GIVEN** a PR proposes removing the kind badge from the list view (or any of the other three surfaces)
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED — the kind discriminator MUST be visible on all four surfaces simultaneously

---

