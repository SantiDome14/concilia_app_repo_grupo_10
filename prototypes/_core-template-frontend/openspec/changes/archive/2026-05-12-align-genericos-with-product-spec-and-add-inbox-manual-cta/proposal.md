- Jira REQ: — (template-level alignment with product source-of-truth; references `features/common/centro-de-solicitudes.md`, `features/common/centro-de-alertas.md`, `features/common/centro-de-reporteria.md`, and the 2026-05-10 / 2026-05-11 / 2026-05-12 sessions captured in `discoveries/core-modulos-transversales-discovery.md`)
- Module: core-template (foundation)

# Align the generic-modules contract with the product source-of-truth and ship the Inbox manual-creation CTA

## Why

The template's canonical types (`src/types/genericos.ts`) and the `core-modulo-genericos` spec lag the product source-of-truth across three sessions that landed after the template was last touched on 2026-05-08:

- **2026-05-10 enrichment.** Profiles A/B/C/D renamed to categories `triage / workflow / metric / cross_app_panel` for Alertas. `Solicitud` evolved into the canonical `Solicitud<TPayload>` generic with `kind`, `assignee` distinct from `owner`, `target_app`, `target_role`, `recurring_definition_id`, `triggered_actions`. `InboxTypeConfig` registry introduced (`creable_manualmente`, `manual_creation_capability`, `payload_schema`, `closeActions[]`, `triggers_on_create[]`, `available_actions[]`, `push_notification`, `auto_archive`). `RecurringInboxItemDefinition` introduced. `ReportPermissions` (4 levels: `view / execute / edit / delete`), `consumer_apps[]`, `allows_auto_generation`, `ReportRun.dependencies_unmet[]` introduced.
- **2026-05-11 decisions.** `REPORT_DEPENDENCY` modeled as a **Tarea** in the Inbox of the `blocking_app` with declarative `auto_archive`, NOT as an Alerta — this contradicts the current template spec which routes it as an Alerta with `profile: 'A'`. Bifurcation by `allows_auto_generation` for "report próximo a emitir" (true → Alerta; false → Tarea `reporte_proximo_emision_manual`). `ReportDependency.recurring_definition_id?` to link reportes against recurring Inbox series.
- **2026-05-12 paradigm formalization.** "Wizard of Oz" principle and Centro scope exclusivity — handled by the companion change `formalize-paradigm-principles-2026-05-12` (docs-only) which this change depends on landing first.

This change closes all the model-level gaps in a single coordinated update and ships the **main CTA "Crear Solicitud / Tarea"** in the Inbox module (camino de creación (b) from `centro-de-solicitudes.md` § Caminos de creación). The CTA is the user-visible payoff: an operator on the Inbox of a target app can manually create a Solicitud or Tarea of any type declared `creable_manualmente: true` in the `InboxTypeConfig` registry, gated by `manual_creation_capability`, with a payload form rendered dynamically from the type's `payload_schema`.

The work is intentionally scoped as a single change because the new CTA depends on the new model: it filters by `InboxTypeConfig.creable_manualmente`, gates by `InboxTypeConfig.manual_creation_capability`, renders the form from `InboxTypeConfig.payload_schema`, derives its label from `InboxTypeConfig.kind` (`solicitud` / `tarea`), and constructs a `Solicitud<TPayload>` for the submit path. Landing the type changes and the CTA together is the only way to ship the CTA with the contract-aligned shape.

## What Changes

### 1. Canonical types refactor (`src/types/genericos.ts`)

- **`Solicitud` → `Solicitud<TPayload = unknown>`** — promote to a generic with mandatory `payload: TPayload`. Add fields: `kind: InboxKind`, `assignee?: string | null` (distinct from `owner`), `target_app: string`, `target_role?: string`, `recurring_definition_id?: string`, `triggered_actions?: TriggeredAction[]`, `closure_action?: string`, `closed_by?: string`, `closed_at?: number`, `due_at?: number`. Rename `owner_id` → `owner: string | null` (per product spec). Remove `owner_name` (resolved at display time via user-lookup composable, not persisted on the model).
- **`InboxKind`** — add `type InboxKind = 'solicitud' | 'tarea'`.
- **`SolicitudState`** — keep open union, default vocabulary unchanged (`'pendiente' | 'en_proceso' | 'completed' | 'rejected'`).
- **`TimelineEvent.kind`** — extend with `'assigned' | 'taken' | 'released' | 'action_invoked'` (per product spec).
- **`InboxTypeConfig`** — add: `type`, `kind`, `label`, `target_app`, `target_role?`, `payload_schema` (JSON Schema), `sla_hours?`, `creable_manualmente?` (default `false`), `manual_creation_capability?`, `closeActions: CloseAction[]`, `triggers_on_create?: TriggerSpec[]`, `available_actions?: ActionSpec[]`, `push_notification?`, `auto_archive?`, `state_labels?` (visual override map, mechanism invariant).
- **`CloseAction`** — `{ id, label, terminal_state: 'completed' | 'rejected', requires_comment?: boolean }`.
- **`RecurringInboxItemDefinition`** — full shape per spec: `id, type, label, target_app, target_role?, default_assignee?, payload_template, cadence: { periodicity, cron_expr?, next_creation_date, sla_hours?, due_offset_hours? }, series_state: 'active' | 'paused' | 'archived', created_at, updated_at`.
- **`TriggeredAction`** — `{ action_ref, status: 'pending' | 'ok' | 'error', result_ref?, error_message?, at }`.
- **`TriggerSpec`, `ActionSpec`** — opaque references to the manifest engine (`action_id` + `payload_mapping`).
- **`AlertProfile` → `AlertCategory`** — rename to `'triage' | 'workflow' | 'metric' | 'cross_app_panel'`. Rename `Alerta.profile` → `Alerta.category`. Update `isAlerta` type guard.
- **`Report`** — add `permissions: ReportPermissions` (mandatory), `consumer_apps: ConsumerAppRef[]`, `allows_auto_generation: boolean`, `dependencies?[].recurring_definition_id?`, `locked?`, `locked_reason?`. Extend `ReportDependency` with `recurring_definition_id?` per product spec.
- **`ReportPermissions`** — 4 independent levels: `view: string[]`, `execute: string[]`, `edit: string[]`, `delete: string[]`.
- **`ReportDependencySnapshot`** — new type for `ReportRun.dependencies_unmet[]`.
- **`ReportRun`** — add `dependencies_unmet?: ReportDependencySnapshot[]`.

### 2. Inbox types registry (`src/config/inbox-types.ts`, NEW)

- Exports `INBOX_TYPES_REGISTRY: Readonly<Record<string, InboxTypeConfig>>` with the four example types currently seeded in the mocks (`aprobacion_pago`, `revision_legajo`, `baja_usuario`, `cambio_limite`). Each entry declares `kind`, `payload_schema`, `creable_manualmente`, `manual_creation_capability`, `closeActions[]`, and (optionally) `push_notification` and `auto_archive`. Two of the four mark `creable_manualmente: true` to exercise the filtering path; the other two mark `false` to exercise the gate.
- Re-exports a typed lookup helper `getInboxTypeConfig(type: string): InboxTypeConfig | undefined`.

### 3. REPORT_DEPENDENCY routing change

- Existing Requirement *"Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`"* is **replaced** with: *"Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea `report_dependency_block` with declarative `auto_archive`"*. The `ReportDependencyEvent` payload aligns with the new shape per `centro-de-reporteria.md` decision 8 (2026-05-11). The destination is the Inbox of the `blocking_app`, not its Alertas. `auto_archive.condition_ref` evaluates `dependencies[].completed: true` for the specific dependency; the Inbox engine closes the Tarea automatically with `closed_by: 'system'` + `closure_action: 'dependency_resolved'` when the condition becomes true. The Alertas-side `profile: 'A'` consumption is removed.

### 4. Alertas profile → category migration

- `AlertProfile: 'A' | 'B' | 'C' | 'D'` → `AlertCategory: 'triage' | 'workflow' | 'metric' | 'cross_app_panel'`. Field `Alerta.profile` → `Alerta.category`. Spec Requirements and Scenarios updated. Mocks (`src/mocks/genericos/alertas.ts`) re-keyed.

### 5. Main CTA "Crear Solicitud / Tarea" (Inbox)

- New components under `src/components/inbox/`:
  - **`<InboxCreateCTA>`** — page-header button. Reads `INBOX_TYPES_REGISTRY` plus the current user's capabilities; renders disabled with tooltip when no type is creable for the user, hidden when no type declares `creable_manualmente: true`. Label is derived: only `solicitud` → "Crear Solicitud"; only `tarea` → "Crear Tarea"; both kinds available → "Crear".
  - **`<InboxCreateDialog>`** — 2-step wizard. Step 1: `<InboxTypeSelector>` lists creable types (filtered by `creable_manualmente` AND user capabilities). Step 2: `<DynamicPayloadForm>` renders the payload form from the selected type's `payload_schema` plus the common metadata (assignee picker, sla_hours / due_at if the type allows).
  - **`<InboxTypeSelector>`** — list/grid of available types with kind badge.
  - **`<DynamicPayloadForm>`** — wraps the existing `useDynamicForm` composable to render a vee-validate + zod form derived from `payload_schema` (JSON Schema). No new dependency.
- Wired into `src/pages/Inbox.vue` via `<InboxCreateCTA>` in the L1 header, alongside the existing `<ViewToggle>`.
- Submit path: constructs a `Solicitud<TPayload>` with `state: 'pendiente'`, `source_app: <current app>`, `source_module: 'inbox'`, `target_app: <inbox target>`, `kind`, `payload`, optional `assignee`, optional `due_at`/`sla_hours`. Persists to the (mock-backed) dataset via the same in-place mutation pattern the existing CTAs use. Emits an `AuditEntryCTA` with `kind: 'cta'`, `is_module_cta: true`, `created_record_type: <type>`. Triggers `triggers_on_create[]` (mock placeholder in this round; full triggers integration with the manifest engine is V2-scoped per the feature spec).

### 6. Spec updates (`core-modulo-genericos`)

- **MODIFIED** Requirement *"Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`"* — promote to `Solicitud<TPayload>` generic with the new field set.
- **MODIFIED** Requirement *"Inbox MUST declare a state machine with terminal-state ClosureModal"* — close action choices drawn from `InboxTypeConfig.closeActions[]` of the matching type (formalize the registry reference).
- **MODIFIED** Requirement *"Alertas houses system-detected events with profile A/B/C/D semantics"* — replace `profile` axis with `category`; same four canonical values, new names + Scenarios.
- **MODIFIED** Requirement *"Alertas terminal states MUST require a justification via the ClosureModal"* — replace "profile B" with "category workflow"; otherwise identical.
- **MODIFIED** Requirement *"Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as profile A"* — replaced with the Inbox-Tarea routing.
- **MODIFIED** Requirement *"Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern"* — extend with `permissions`, `consumer_apps[]`, `allows_auto_generation` constraints.
- **MODIFIED** Requirement *"Shared TS types MUST live in `src/types/genericos.ts`"* — extend with the new types (`InboxTypeConfig`, `RecurringInboxItemDefinition`, `AlertCategory`, `ReportPermissions`, `ReportDependencySnapshot`).
- **ADDED** Requirement *"Inbox MUST expose a typed registry `InboxTypeConfig` with `creable_manualmente`, `manual_creation_capability`, `payload_schema`, `closeActions[]`, `triggers_on_create[]`, `available_actions[]`, `push_notification?`, `auto_archive?`"*.
- **ADDED** Requirement *"Inbox MUST expose a main CTA 'Crear Solicitud / Tarea' filtered by `InboxTypeConfig.creable_manualmente: true` and `manual_creation_capability`; label is kind-derived"*.
- **ADDED** Requirement *"Solicitud `assignee` is distinct from `owner`; both are independently mutable"*.
- **ADDED** Requirement *"Inbox SHALL support recurring series via `RecurringInboxItemDefinition`"*.
- **ADDED** Requirement *"Reportes MUST declare `ReportPermissions` (4 levels: view/execute/edit/delete) with secure defaults and `consumer_apps[]`"*.
- **ADDED** Requirement *"Reportes MUST bifurcate by `allows_auto_generation` for próximo-emisión and incomplete-dependency events"*.

### 7. Mock data alignment

- `src/mocks/genericos/inbox.ts` — re-shape Solicitudes with the new fields (`kind`, `payload`, `target_app`, `assignee`).
- `src/mocks/genericos/alertas.ts` — re-key `profile` → `category`.
- `src/mocks/genericos/reportes.ts` — add `permissions`, `consumer_apps[]`, `allows_auto_generation` to mock reports.

### 8. Tests — existing updated AND new behavioral tests added

- Existing tests (`Inbox.spec.ts`, `Alertas.spec.ts`, `Reportes.spec.ts`, drawer specs) are updated to compile and pass against the new types and mock shapes.
- New behavioral test files are added for the CTA + registry pieces this change ships: `InboxCreateCTA.spec.ts`, `InboxCreateDialog.spec.ts`, `InboxTypeSelector.spec.ts`, `DynamicPayloadForm.spec.ts`, `inbox-types.spec.ts`, plus additional `Inbox.spec.ts` cases for end-to-end CTA submission (new Solicitud shape, audit emit, success toast, triggered_actions[]). See `design.md` § "Tests scope" for the full enumeration.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 7 existing Requirements modified, 6 new Requirements added. The capability count grows from 9 to 15.

### New Capabilities

None. This change extends an existing capability.

## Dependencies

- **Depends on** `formalize-paradigm-principles-2026-05-12` archived first. That change adds the two paradigm Requirements (Wizard of Oz + Centro scope exclusivity) that the new model honors by construction. Landing the model refactor on top of an already-formalized paradigm baseline is the cleaner sequence.
