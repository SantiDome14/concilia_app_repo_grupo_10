## MODIFIED Requirements

### Requirement: Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics

The Alertas module SHALL house system-detected events that require human attention. Every `ALERT_TYPE` declared in an app's config MUST carry a `category: AlertCategory` discriminator (canonical values: `'triage' | 'workflow' | 'metric' | 'cross_app_panel'`) that activates exactly one canonical UI pattern per type:

- **`triage` (formerly profile A)** — Active triage list. Inbox-style list without owner / SLA. New alerts surface; users mark resolved or dismissed.
- **`workflow` (formerly profile B)** — Master-detail with sub-categorization. Drawer with Timeline + Comments. Terminal-state `<ClosureModal>` with justification.
- **`metric` (formerly profile C)** — Time-series with charts. Chart-first surface; alerts are derived from a metric crossing a threshold; resolution is automatic when the metric returns inside the threshold.
- **`cross_app_panel` (formerly profile D)** — Cross-app KPI dashboard. Consolidated KPIs with cross-app filters; not an actionable list. Lives prioritarily as `<CrossAppPanelCard>` of the Dashboard, not as a row in the Alertas list.

The `Alerta` interface SHALL be exported from `src/types/genericos.ts` with two top-level classifying fields: a mandatory `category: AlertCategory` (the UI-pattern discriminator above) AND a mandatory `concept: string` (the business classifier — e.g. `'saldo_anomaly'`, `'login_failure'`, `'cron_failed'`, `'capacity_warning'`). The `concept` field is the parallel of `Solicitud.concept` per `core-modulo-genericos` — both records use the same name for the same axis. Apps SHALL activate exactly one category per `ALERT_TYPE` — mixing categories within a single ALERT_TYPE is forbidden. The Alertas page SHALL read each row's `category` and render the corresponding UI pattern; the L3 filter row SHALL expose a "Concepto" filter (mirroring the Inbox `concept` filter). The previous `AlertProfile` type name and `Alerta.profile` field name SHALL NOT appear in code; the previous `Alerta.type` field name (renamed to `Alerta.concept` on 2026-05-12) SHALL NOT appear either; PR review rejects any reintroduction of those old names.

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
- **WHEN** the user navigates to the Alertas section filtered to that concept
- **THEN** the page renders a chart of the underlying metric with thresholds overlaid; the alert list appears as a compact secondary panel; resolution is automatic when the metric returns inside the threshold

#### Scenario: cross_app_panel category renders as a Dashboard card by default

- **GIVEN** an `ALERT_TYPE` declared with `category: 'cross_app_panel'` (e.g. daily limit utilization across CLP / OPS / FIN)
- **WHEN** the destination app's Dashboard renders
- **THEN** the alert is surfaced as a `<CrossAppPanelCard>` card; it MUST NOT appear in the Alertas triage list (the triage list filters out `cross_app_panel` concepts)

#### Scenario: Mixing categories within a single ALERT_TYPE is forbidden

- **GIVEN** an `ALERT_TYPE` declares `category: ['triage', 'workflow']` (an array, attempting to mix)
- **WHEN** the app config validates
- **THEN** the validation FAILS with an error indicating that exactly one category MUST be activated per ALERT_TYPE

#### Scenario: Reading Alerta.type from code is a contract violation

- **GIVEN** a PR proposes reading `a.type` from an Alerta record
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED — the business classifier field on Alerta is `concept`, not `type` (the 2026-05-12 rename moved it to align with `Solicitud.concept`); reintroducing `Alerta.type` creates the cross-record naming drift the rename was meant to close
