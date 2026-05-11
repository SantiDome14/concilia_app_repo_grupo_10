## REMOVED Requirements

### Requirement: Reportes MUST split Catálogo / Histórico via segmentation; each segment has its own shape, filters, and columns

**Reason:** Reportes was the only generic that genuinely needed a tab-like control over its surface, but the previous implementation (L1 `<Segmenter>` over one record set) was the wrong primitive — Catálogo (Report templates) and Histórico (ReportRun executions) are independent data models with independent lifecycles, not a segmentation of one model. The "Histórico" label was also misnamed; it lists executions, not historical records. Replaced by the new `Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern` requirement added by this change.

**Migration:** The `<Segmenter>` is moved from the L1 actions area to below the page header (Type B Tabs placement governed by `core-module-types`). The "Histórico" label is renamed to "Ejecución" everywhere it appeared (page tabs, KPI strip headers, internal segment values, data-testids). Per-tab columns, filters, and actions are unchanged from the prior segmentation implementation.

## MODIFIED Requirements

### Requirement: Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`

The Inbox module SHALL manage entities named `Solicitud` in TypeScript code; this identifier is mandatory across every core app and MUST NOT be aliased to "Item", "Ticket", or any other generic noun in the type system. The `Solicitud` interface SHALL be exported from `src/types/genericos.ts` with required fields `id: string`, `type: string`, `source_app: string`, `source_module: string`, `owner: string | null`, `sla_hours: number | null`, `state: SolicitudState`, `timeline: TimelineEvent[]`, `comments: Comment[]`, and optional `closure_comment?: string`. The Inbox page SHALL NOT render a `<Segmenter>` for record-set segmentation; users narrow the visible Solicitudes via the Estado filter in L3, which exposes all four states (`pendiente`, `en_proceso`, `completed`, `rejected`) simultaneously. The detail surface for a Solicitud SHALL be the side `<Drawer>` (the route or component MUST set `meta.detail = 'drawer'` per `core-modals`); a centered modal is forbidden as the Solicitud detail surface.

#### Scenario: Solicitud is imported from the canonical types file

- **GIVEN** an app's Inbox page or extension types
- **WHEN** the file imports the Solicitud shape
- **THEN** the import statement reads `import type { Solicitud } from '@/types/genericos';` — re-defining `interface Solicitud { ... }` in app code is forbidden; the validator (or PR review) catches the violation

#### Scenario: Inbox does NOT render a Segmenter; the Estado filter surfaces all four states

- **GIVEN** the Inbox page renders
- **WHEN** the L1 page header mounts
- **THEN** there is NO `<Segmenter>` in the actions area; the L3 Estado filter exposes all four states (`pendiente`, `en_proceso`, `completed`, `rejected`) as available options simultaneously, and the default view shows every Solicitud regardless of state

#### Scenario: Detail surface is the side Drawer

- **GIVEN** a row in the Inbox table
- **WHEN** the user clicks the row
- **THEN** the side `<Drawer>` opens (NOT a centered modal); the route or component meta declares `detail: 'drawer'` so router guards / breadcrumbs / focus management treat it as the drawer surface per `core-modals`

#### Scenario: App-specific Solicitud extends the base shape

- **GIVEN** an app declares `interface OpsWithdrawalRequest extends Solicitud { client: string; amount: number; }`
- **WHEN** the app's Inbox renders an OpsWithdrawalRequest row
- **THEN** the base fields (`id`, `type`, `source_app`, `owner`, `sla_hours`, `state`, `timeline`, `comments`) are read by the generic Inbox engine; the domain-specific fields (`client`, `amount`) are read by the app's render functions; redefining base fields with incompatible types is rejected at TS compile time

---

### Requirement: Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`

When a `Report` declares a `dependencies[]` list and the user attempts to generate the report (clicks "Generar"), the engine SHALL evaluate each dependency. If any dependency entry has `completed: false`, the Generar action MUST be BLOCKED and the engine MUST emit a `REPORT_DEPENDENCY` event of normative shape `{ report_id: string; blocking_app: string; blocking_module: string; blocking_state: string; sla_days_before?: number; emitted_at: number }` to the destination app indicated by `blocking_app`. The destination app's Alertas module MUST consume incoming `REPORT_DEPENDENCY` events and create an `Alerta` entry with `type: 'report_dependency'` and `profile: 'A'`. When the source app marks the dependency `completed: true`, the consuming Alerta SHALL auto-close — the engine sets `state: 'resolved'`, `closure_comment: 'auto-closed by source-app completion'`, and appends `TimelineEvent { kind: 'auto_closed', at: <ts> }` without user interaction; the resulting record reflects its terminal state in the Estado filter without any segmentation transition.

#### Scenario: Generar is blocked when a dependency is unfulfilled

- **GIVEN** a `Report` whose `dependencies` list includes `{ blocking_app: 'OPS', blocking_module: 'movements', blocking_state: 'reconciled', completed: false }`
- **WHEN** the user clicks "Generar"
- **THEN** the action is blocked with a per-row toast that names the blocking app + module + state; the engine emits a `REPORT_DEPENDENCY` event addressed to OPS

#### Scenario: Destination Alerta is created with profile A

- **GIVEN** the OPS app subscribes to `REPORT_DEPENDENCY` events
- **WHEN** an event arrives with `report_id: 'rpt-monthly-tax'`, `blocking_app: 'OPS'`, `blocking_module: 'movements'`, `blocking_state: 'reconciled'`
- **THEN** the OPS Alertas module creates an `Alerta` with `type: 'report_dependency'`, `profile: 'A'`, payload describing the blocking report; the Alerta surfaces in the OPS Alertas list

#### Scenario: Source-side completion auto-closes the destination Alerta

- **GIVEN** an OPS Alerta with `type: 'report_dependency'` was raised because reconciliation was incomplete
- **WHEN** the OPS operator marks the source movement `reconciled: true` and the source app re-emits the dependency check
- **THEN** the engine sets the OPS Alerta `state: 'resolved'`, `closure_comment: 'auto-closed by source-app completion'`, and appends `TimelineEvent { kind: 'auto_closed', at: <ts> }`; the user does not interact with the auto-close

## ADDED Requirements

### Requirement: Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern; each tab has its own shape, filters, and columns

The Reportes module SHALL split its surface into two functional sub-tabs — **Catálogo** and **Ejecución** — implemented via the Type B Tabs pattern contracted by `core-module-types`: a `<Segmenter>` placed below the page header (NOT in the L1 actions area), exposing the two tabs over independent data models. Catálogo SHALL list `Report` entries (templates / definitions); Ejecución SHALL list `ReportRun` entries (generated runs). The `Report` interface SHALL be exported from `src/types/genericos.ts` with required `id: string`, `category: string`, `name: string`, `description: string`, and optional `periodicity?`, `format?`, `params?`, `dependencies?`, `cron_enabled?`, `cron_active?`, `locked?`, `locked_reason?`. The `ReportRun` interface SHALL declare required `id: string`, `report_id: string`, `requested_at: number`, `status: 'ok' | 'error' | 'pending'`, `params: string`, `trigger: { type: 'cron' } | { type: 'manual'; user_id: string } | { type: 'system' }`, and optional `completed_at?`, `output_url?`, `error_message?`. The two tabs MUST NOT share columns, filters, or actions — Catálogo's columns and filters are template-oriented (Categoría, Periodicidad, Formato), Ejecución's columns and filters are run-oriented (Trigger, Estado, Período).

#### Scenario: Reportes tabs are exactly Catálogo and Ejecución in that order, rendered below the header

- **GIVEN** the Reportes page renders
- **WHEN** the page mounts
- **THEN** the Tabs `<Segmenter>` renders below the page header (NOT in the L1 actions area), with options `[{ value: 'catalogo', label: 'Catálogo' }, { value: 'ejecucion', label: 'Ejecución' }]` in that order; default tab is `catalogo`; the legacy "Histórico" wording does not appear anywhere on the page

#### Scenario: Catálogo lists Report templates

- **GIVEN** the user is on the Catálogo tab with `CATALOG: Report[]` declared in app data
- **WHEN** the body renders
- **THEN** each row maps to a `Report` entry; the columns surface `name`, `description`, `category`, `periodicity`, `format`, `dependencies` (visual indicator); the actions per row include "Generar", "Editar metadata", "Configurar CRON" (subject to `REPORTS_CONFIG` flags)

#### Scenario: Ejecución lists ReportRun entries

- **GIVEN** the user switches to the Ejecución tab with `RUNS: ReportRun[]` declared in app data
- **WHEN** the table renders
- **THEN** each row maps to a `ReportRun`; columns surface `report_id` (resolved to the template name), `requested_at`, `completed_at`, `status`, `trigger` (CRON / Manual / Sistema), `params`; actions include "Descargar" (when `output_url` present) and "Reintentar" (when `status === 'error'`)

#### Scenario: Filters are not shared across tabs

- **GIVEN** the Catálogo filter `Periodicidad = 'Mensual'` is active
- **WHEN** the user switches to Ejecución
- **THEN** the filter does NOT carry over; the Ejecución tab renders its own filter set (Trigger / Estado / Período); switching back to Catálogo restores the original filter state
