## MODIFIED Requirements

### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`

The Inbox module SHALL manage entities named `Solicitud` in TypeScript code; the canonical identifier is the **generic** `Solicitud<TPayload = unknown>` exported from `src/types/genericos.ts` and SHALL NOT be aliased to "Item", "Ticket", or any other generic noun. The interface SHALL declare required fields `id: string`, `type: string`, `kind: InboxKind`, `source_app: string`, `source_module: string`, `target_app: string`, `owner: string | null`, `state: SolicitudState`, `payload: TPayload`, `timeline: TimelineEvent[]`, `comments: Comment[]`, `created_at: string`, `updated_at: string`; and optional fields `target_role?: string`, `assignee?: string | null`, `severity?: Severity`, `sla_hours?: number | null`, `due_at?: number`, `recurring_definition_id?: string`, `triggered_actions?: TriggeredAction[]`, `closure_action?: string`, `closure_comment?: string`, `closed_by?: string`, `closed_at?: number`. The `kind` field is the canonical discriminator between Solicitudes (third-party-requested) and Tareas (self-issued); both share the same engine, lifecycle, and `<ClosureModal>` mechanics. The Inbox page SHALL NOT render a `<Segmenter>` for record-set segmentation; users narrow the visible records via the L3 filter row (Tipo / Estado / `kind` / Mías). The detail surface for any Solicitud/Tarea SHALL be the side `<Drawer>` (`meta.detail = 'drawer'`); a centered modal is forbidden.

#### Scenario: Solicitud<TPayload> is imported from the canonical types file

- **GIVEN** an app's Inbox page or extension types
- **WHEN** the file imports the canonical shape
- **THEN** the import statement reads `import type { Solicitud } from '@/types/genericos';`; apps that need typed payload pin it via `type KycSolicitud = Solicitud<KycPayload>`; redefining the base generic in app code is forbidden

#### Scenario: kind is the discriminator between Solicitud and Tarea

- **GIVEN** two records of the same engine
- **WHEN** one is created from a CLP CTA targeting OPS (`kind: 'solicitud'`) and the other from a recurring series internal to OPS (`kind: 'tarea'`)
- **THEN** both share `state`, `timeline`, `comments`, `closeActions[]` mechanics; the only differences are the label/badge in the UI and the vocabulary of the closeActions

#### Scenario: assignee is distinct from owner

- **GIVEN** a Solicitud with `assignee: 'u-2'` and `owner: null` in state `pendiente`
- **WHEN** an operator clicks "Tomar"
- **THEN** the engine sets `owner: <current_user_id>` and transitions state to `en_proceso`; the `assignee` field is unchanged; the Timeline records both events separately (one `kind: 'taken'` and zero `kind: 'assigned'` for this transition)

#### Scenario: App-specific Solicitud pins the payload type

- **GIVEN** an app declares `type WithdrawalSolicitud = Solicitud<{ client: string; amount: number; currency: string; }>`
- **WHEN** the app reads `s.payload.amount`
- **THEN** the field is typed as `number`; TypeScript narrows correctly without `as` casts; the base fields (`id`, `type`, `kind`, `target_app`, `state`, etc.) remain required

#### Scenario: Removing kind is a contract violation

- **GIVEN** an app introduces `interface Solicitud { ... }` without a `kind` field, or reads existing Solicitudes ignoring `kind`
- **WHEN** PR review checks the change
- **THEN** the change is REJECTED — `kind` is the canonical discriminator and the UI MUST render the correct badge per `kind`

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

### Requirement: Alertas houses system-detected events with profile A/B/C/D semantics

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

### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`

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

## ADDED Requirements

### Requirement: Inbox MUST expose a typed registry `InboxTypeConfig` declaring `creable_manualmente`, `manual_creation_capability`, `payload_schema`, `closeActions[]`, `triggers_on_create[]`, `available_actions[]`, `push_notification?`, `auto_archive?`

Every app's Inbox SHALL declare a typed registry `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` in `src/config/inbox-types.ts` (or in an app-specific equivalent that the Inbox page imports). Each registry entry SHALL declare:

- `type: string` — the canonical type identifier matching `Solicitud.type` / `Alerta.type` of records of this type.
- `kind: InboxKind` — `'solicitud'` or `'tarea'`; mandatory; drives label/badge and closeActions vocabulary.
- `label: string` — human-readable label of the type.
- `target_app: string` — the app that owns Solicitudes/Tareas of this type.
- `target_role?: string` — capability for routing notifications.
- `payload_schema: DynamicFormSchema` — the schema that `<DynamicPayloadForm>` consumes to render the create form; consumed by the template's existing `useDynamicForm` composable.
- `sla_hours?: number` — default SLA window for new records of this type.
- `creable_manualmente?: boolean` — default `false`; when `true`, the type is creatable from the Inbox main CTA.
- `manual_creation_capability?: string` — capability required for manual creation from the Inbox CTA; SHALL be honored even when `creable_manualmente: true` is set.
- `closeActions: CloseAction[]` — at least one entry; each `{ id, label, terminal_state, requires_comment? }`. The `<ClosureModal>` lists these as the close-action choices.
- `triggers_on_create?: TriggerSpec[]` — manifest-engine actions to invoke automatically on creation, each with `action_id` + optional `payload_mapping`.
- `available_actions?: ActionSpec[]` — CTAs that appear in the `<Drawer>` of records of this type, with `enable_when` predicate.
- `push_notification?` — declares optional canales `browser` / `email` / `slack` (each opt-in per type; in-app badge is always-on, not declared per type).
- `auto_archive?` — declarative auto-close rule: `{ condition_ref: string; closure_action: string }`. The engine evaluates `condition_ref` over time and auto-closes the record with `closure_action` when the condition becomes true; `closed_by: 'system'`.
- `state_labels?: Partial<Record<SolicitudState, string>>` — visual override of state labels; never changes the mechanism.

The registry SHALL be immutable at runtime (`Readonly<...>`). The Inbox page SHALL import the registry and use it to: (a) resolve close-action vocabularies for the `<ClosureModal>`; (b) gate the main CTA (see next Requirement); (c) render labels and badges. Apps SHALL NOT mutate the registry at runtime; new types are added via a fresh declaration + PR.

#### Scenario: A type is creable_manualmente AND the user has the capability

- **GIVEN** an `InboxTypeConfig` entry for `'aprobacion_pago'` with `creable_manualmente: true` and `manual_creation_capability: 'INBOX_CREATE'`, and a user with `capabilities: ['INBOX_CREATE']`
- **WHEN** the Inbox page renders
- **THEN** the type is included in the result of `listCreableTypes(user.capabilities)`; the main CTA surfaces this type in the type-selector wizard

#### Scenario: A type is creable_manualmente but the user lacks the capability

- **GIVEN** the same type, but a user with `capabilities: []`
- **WHEN** `listCreableTypes(user.capabilities)` is called
- **THEN** the type is NOT included in the result; the main CTA does not list it in the type selector

#### Scenario: A type is NOT creable_manualmente

- **GIVEN** an `InboxTypeConfig` entry with `creable_manualmente: false` (or omitted; default is `false`)
- **WHEN** `listCreableTypes(...)` is called
- **THEN** the type is NEVER in the result regardless of the user's capabilities; the type can still arrive via API ingestion or recurring series, just not from the manual CTA

#### Scenario: auto_archive closes the record on condition evaluation

- **GIVEN** an `InboxTypeConfig` for `report_dependency_block` with `auto_archive: { condition_ref: 'reportDeps.completed === true', closure_action: 'dependency_resolved' }`
- **WHEN** the engine evaluates the condition at a later time and it returns true
- **THEN** the Tarea transitions to `state: 'completed'`, `closure_action: 'dependency_resolved'`, `closed_by: 'system'`, `closed_at: <ts>`; a `TimelineEvent { kind: 'closed', by: 'system' }` is appended

---

### Requirement: Inbox MUST expose a main CTA "Crear Solicitud / Tarea" filtered by `InboxTypeConfig.creable_manualmente: true` and `manual_creation_capability`; the label is derived from `kind` of the available types

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
