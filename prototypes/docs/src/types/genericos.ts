// ════════════════════════════════════════════════════════════════════
// Generic-module shared types — Solicitud, Alerta, Report, ReportRun
// ────────────────────────────────────────────────────────────────────
// Single source of truth for the four cross-cutting standard modules
// (Dashboard, Inbox, Alertas, Reportes) per the `core-modulo-genericos`
// capability spec. Apps SHALL extend these types via interface extension
// or generics; redefining the base interfaces in app code is a contract
// violation (see Requirement: shared TS types).
//
// Reused primitives (`TimelineEvent`, `Comment`) are re-exported from
// `@/types/drawer` so a single import surface satisfies both the Drawer
// component layer and the canonical module-data layer.
//
// ── Architectural principles formalized 2026-05-12 ──────────────────
//
// Two paradigm principles govern how these types are consumed by apps;
// they live as Requirements in the canonical spec
// (`openspec/specs/core-modulo-genericos/spec.md`) and any deviation is
// rejected at PR review:
//
//   1. "Wizard of Oz" — External CTAs MUST invoke a capability of the
//      target app, not a specific execution route. The capability decides
//      at runtime whether the invocation is satisfied by direct
//      integration (no Solicitud in the Centro) or by creating a
//      Solicitud/Tarea (Centro entry). Switching paths MUST NOT require
//      a change to the calling CTA.
//
//   2. Centro scope exclusivity — The Inbox/Centro de Solicitudes hosts
//      ONLY Solicitudes/Tareas requiring human intervention from the
//      backoffice. Pure programmatic jobs (sync, audit, normalization,
//      cron) live in code as Task Definitions, not as records of these
//      types. A job MAY declare opt-in fallback to the Centro for human
//      escalation on failure; without the fallback, failures route to
//      Observability alerts only. The Solicitud model MUST NOT grow an
//      `execution: manual | programmatic` discriminator — every record
//      here is implicitly human-action work.
//
// Naming convention (2026-05-12 rename):
//   - `type: InboxType` is the Solicitud-vs-Tarea discriminator.
//   - `concept: string` is the business classifier (e.g. 'aprobacion_pago').
//   `InboxKind` was the previous name for `InboxType`; the old `type`
//   field carried the business classifier and now lives as `concept`.
// ════════════════════════════════════════════════════════════════════

import type { TimelineEvent, Comment } from './drawer';
import type { FieldConfig } from './dynamic-form';

// Re-export Drawer primitives so consumers only need a single import.
export type { TimelineEvent, Comment } from './drawer';

// ────────────────────────────────────────────────────────────────────
// Solicitud (Inbox)
// ────────────────────────────────────────────────────────────────────

/** Discriminator between Solicitud (third-party-requested) and Tarea (self-issued). */
export type InboxType = 'solicitud' | 'tarea';

/** Open string union — defaults are the canonical four; apps MAY override. */
export type SolicitudState =
  | 'pendiente'
  | 'en_proceso'
  | 'completed'
  | 'rejected'
  | string;

/** Glanceable severity axis used by CardItem / kanban / list rows. */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Recorded on the Solicitud when `InboxTypeConfig.triggers_on_create[]` fires
 * an action of the manifest engine. The engine populates this array as it
 * resolves each trigger; the Drawer's "Triggered actions" panel renders it.
 */
export type TriggeredAction = {
  action_ref: string;
  status: 'pending' | 'ok' | 'error';
  result_ref?: string;
  error_message?: string;
  at: number;
};

/**
 * Canonical Solicitud / Tarea shape. Apps that need a typed payload pin it
 * via `type WithdrawalSolicitud = Solicitud<{ amount: number; ... }>`. The
 * default `TPayload = unknown` forces consumers that read payload fields
 * to narrow explicitly.
 */
export type Solicitud<TPayload = unknown> = {
  id: string;
  /** Business classifier — e.g. 'aprobacion_pago', 'revision_legajo'. */
  concept: string;
  /** Mandatory discriminator; UI renders the matching badge per type. */
  type: InboxType;
  source_app: string;
  source_module: string;
  /** App that owns and processes records of this type. */
  target_app: string;
  /** Capability for routing notifications. */
  target_role?: string;
  /** User actively working the record now — auto-assigned on transition to en_proceso. */
  owner: string | null;
  /** User the record is directed to — independent of owner. */
  assignee?: string | null;
  /** SLA window in hours — null when SLA tracking is disabled. */
  sla_hours?: number | null;
  /** Absolute deadline (epoch ms). Independent of sla_hours. */
  due_at?: number;
  state: SolicitudState;
  severity?: Severity;
  /** Concept-specific structured payload; rendered per the concept's payload_schema. */
  payload: TPayload;
  /** Set on terminal transition; references InboxTypeConfig.closeActions[].id. */
  closure_action?: string;
  /** Required ≥10 chars when InboxTypeConfig.closeActions[].requires_comment !== false. */
  closure_comment?: string;
  /** user_id or 'system' (auto-archive path). */
  closed_by?: string;
  closed_at?: number;
  /** When this instance was generated by a RecurringInboxItemDefinition. */
  recurring_definition_id?: string;
  triggered_actions?: TriggeredAction[];
  /** ISO-8601 timestamp. */
  created_at: string;
  /** ISO-8601 timestamp. */
  updated_at: string;
  timeline: TimelineEvent[];
  comments: Comment[];
};

// ────────────────────────────────────────────────────────────────────
// InboxTypeConfig + recurring series
// ────────────────────────────────────────────────────────────────────

export type CloseAction = {
  id: string;
  label: string;
  terminal_state: 'completed' | 'rejected';
  /** Default true; when true the comment is required and must be ≥10 chars. */
  requires_comment?: boolean;
};

/** Manifest-engine action invoked automatically on Solicitud creation. */
export type TriggerSpec = {
  action_id: string;
  payload_mapping?: Record<string, string>;
};

/** Manifest-engine action exposed as a CTA inside the Solicitud's Drawer. */
export type ActionSpec = {
  action_id: string;
  enable_when?: unknown;
};

export type PushNotificationConfig = {
  browser?: { enabled: boolean };
  email?: { enabled: boolean; recipients?: string[] };
  slack?: { enabled: boolean; channel: string; mention?: string };
};

export type AutoArchiveConfig = {
  condition_ref: string;
  closure_action: string;
};

/**
 * Concept-level configuration of a Solicitud / Tarea. Apps declare a registry
 * keyed by `concept` (typically in `src/config/inbox-types.ts`). The Inbox
 * engine reads this registry to: (a) render close-action choices in the
 * `<ClosureModal>`; (b) gate the main "Crear Solicitud / Tarea" CTA;
 * (c) drive notifications and triggers on creation; (d) auto-archive
 * records when the declared condition becomes true.
 */
export type InboxTypeConfig = {
  /** Business classifier — matches `Solicitud.concept`. */
  concept: string;
  /** Discriminator — 'solicitud' or 'tarea'. */
  type: InboxType;
  label: string;
  target_app: string;
  target_role?: string;
  /**
   * Schema consumed by `<DynamicPayloadForm>`. Uses the template's
   * existing `FieldConfig[]` flavor (see `@/types/dynamic-form`), not raw
   * JSON Schema. The product spec refers to "JSON Schema" generically;
   * the template pins this flavor as the contract (Decision 11 of
   * align-genericos-with-product-spec-and-add-inbox-manual-cta).
   */
  payload_schema: FieldConfig[];
  sla_hours?: number;
  /** Default false. When true, the type is creatable from the Inbox main CTA. */
  creable_manualmente?: boolean;
  /** Capability required for manual creation; honored even when creable_manualmente is true. */
  manual_creation_capability?: string;
  closeActions: CloseAction[];
  triggers_on_create?: TriggerSpec[];
  available_actions?: ActionSpec[];
  push_notification?: PushNotificationConfig;
  auto_archive?: AutoArchiveConfig;
  /** Visual override of state labels; never changes the mechanism. */
  state_labels?: Partial<Record<SolicitudState, string>>;
};

/**
 * Declaration of a recurring series. The Tecnología-side scheduler walks
 * active series and creates independent Solicitud/Tarea instances per the
 * cadence. The scheduler implementation is out of scope of the frontend
 * template; the type lives here so `ReportDependency.recurring_definition_id`
 * can compile and the Drawer can render instance↔series linkage.
 */
export type RecurringInboxItemDefinition = {
  id: string;
  /** Concept of the Solicitud/Tarea this series creates — references InboxTypeConfig.concept. */
  concept: string;
  label: string;
  target_app: string;
  target_role?: string;
  default_assignee?: string | null;
  payload_template: Record<string, unknown>;
  cadence: {
    periodicity:
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'quarterly'
      | 'semestral'
      | 'annual'
      | 'custom';
    cron_expr?: string;
    next_creation_date: number;
    sla_hours?: number;
    due_offset_hours?: number;
  };
  series_state: 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
};

// ────────────────────────────────────────────────────────────────────
// Alerta (Alertas)
// ────────────────────────────────────────────────────────────────────

/**
 * Canonical four categories — formerly profiles A/B/C/D (renamed in the
 * 2026-05-10 product enrichment). Each ALERT_TYPE activates exactly one.
 */
export type AlertCategory = 'triage' | 'workflow' | 'metric' | 'cross_app_panel';

export type AlertaState = 'new' | 'in_review' | 'resolved' | 'dismissed' | string;

export type Alerta = {
  id: string;
  /** Business classifier — e.g. 'saldo_anomaly', 'login_failure'. */
  concept: string;
  category: AlertCategory;
  source_app: string;
  source_module: string;
  state: AlertaState;
  severity?: Severity;
  /** ISO-8601 timestamp. */
  detected_at: string;
  title: string;
  summary?: string;
  details?: Record<string, unknown>;
  /** Required justification for terminal-state closes (category 'workflow'). */
  closure_comment?: string;
  timeline: TimelineEvent[];
  comments: Comment[];
};

// ────────────────────────────────────────────────────────────────────
// Reportes — templates (Catálogo) and runs (Ejecución)
// ────────────────────────────────────────────────────────────────────

/**
 * Open string union — apps register their own keys via the
 * REPORT_CATEGORIES config. Baseline keys live in
 * `src/mocks/genericos/reportes.ts`.
 */
export type ReportCategoryKey = string;

export type Periodicity =
  | 'Semanal'
  | 'Mensual'
  | 'Trimestral'
  | 'Semestral'
  | 'Anual'
  | 'Ad-hoc'
  | 'On-demand';

export type ReportFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON';

/**
 * Four independent capability lists. Default secure — if a Report is
 * declared without explicit permissions, only the creator + ADMIN_GROUP
 * see it (the registry / data-layer enforces this at the source).
 */
export type ReportPermissions = {
  view: string[];
  execute: string[];
  edit: string[];
  delete: string[];
};

/** Where a Report appears in the UI. Empty consumer_apps[] = headless. */
export type ConsumerAppRef = {
  app: string;
  module?: string;
};

export type ReportDependency = {
  app: string;
  module: string;
  task: string;
  owner_role: string;
  /** Days before `next` at which the dependency must be completed. */
  sla_days_before: number;
  completed: boolean;
  /**
   * When the dependency binds to a specific recurring Inbox series, this
   * is the series id (matches `RecurringInboxItemDefinition.id`). The
   * engine watches that series and auto-resolves the dependency when an
   * instance closes successfully.
   */
  recurring_definition_id?: string;
};

/**
 * Snapshot of a dependency that was still pending at the time of an
 * auto-generated ReportRun. Populated on `ReportRun.dependencies_unmet[]`
 * when `Report.allows_auto_generation: true` and the run executed despite
 * incomplete deps.
 */
export type ReportDependencySnapshot = {
  app: string;
  module: string;
  task: string;
  owner_role: string;
  sla_days_before: number;
  recurring_definition_id?: string;
  state_at_run: 'pending' | 'completed';
};

export type Report = {
  id: string;
  name: string;
  description?: string;
  category: ReportCategoryKey;
  periodicity: Periodicity;
  format: ReportFormat;
  /** Free-form retention label (e.g. "5 años"). */
  retention?: string;
  /** ISO date string or null for on-demand reports. */
  next?: string | null;
  cron_enabled: boolean;
  cron_active?: boolean;
  /** Anticipation in days for the próxima emisión chip / event. */
  antic?: number;
  /** Labels of expected params. */
  params?: string[];
  dependencies?: ReportDependency[];
  /** Four independent capability lists. Mandatory. */
  permissions: ReportPermissions;
  /** Apps that list this report in their catalog. Empty = headless. */
  consumer_apps: ConsumerAppRef[];
  /**
   * Drives the bifurcation in próximo-emisión / dependency-incomplete
   * events:
   *  - true  → próximo-emisión emits Alerta `reporte_proximo_emision_auto`;
   *            generation with incomplete deps still produces a ReportRun
   *            with `dependencies_unmet[]` snapshot.
   *  - false → próximo-emisión emits Tarea `reporte_proximo_emision_manual`
   *            to the consumer Inbox; generation with incomplete deps
   *            does not run at all (waits for resolution).
   */
  allows_auto_generation: boolean;
  locked?: boolean;
  locked_reason?: string;
};

export type ReportRunStatus = 'requested' | 'running' | 'completed' | 'failed';

export type ReportRunTrigger =
  | { type: 'cron' }
  | { type: 'manual'; user_id: string; user_name?: string }
  | { type: 'system' };

export type ReportRun = {
  id: string;
  report_id: string;
  /** ISO-8601 timestamp. */
  requested_at: string;
  /** ISO-8601 timestamp; undefined while pending. */
  completed_at?: string;
  status: ReportRunStatus;
  output_url?: string;
  error_message?: string;
  trigger: ReportRunTrigger;
  /** Resolved display name of the requester (cached on the run). */
  requested_by_name: string;
  /** Snapshot of the report parameters at request time. */
  params?: string;
  /** Snapshot of dependencies pending when the auto-gen run completed. */
  dependencies_unmet?: ReportDependencySnapshot[];
};

// ────────────────────────────────────────────────────────────────────
// REPORT_DEPENDENCY cross-app event payload
// ────────────────────────────────────────────────────────────────────

/**
 * Payload of the REPORT_DEPENDENCY event emitted to the Inbox of the
 * blocking_app when a Report generation finds an unfulfilled dependency.
 * The destination Inbox consumes this event and creates a Tarea of type
 * `report_dependency_block` with declarative `auto_archive` (per Decision
 * 6 of align-genericos-with-product-spec-and-add-inbox-manual-cta and
 * decision 8 of `features/common/centro-de-reporteria.md` 2026-05-11).
 *
 * The previous routing of this event to the destination app's Alertas as
 * `profile: 'A'` is removed; PR review rejects any reintroduction.
 */
export type ReportDependencyEvent = {
  report_id: string;
  report_name?: string;
  /** App receiving the Tarea (formerly `blocking_app`). */
  app: string;
  /** Module within the app (formerly `blocking_module`). */
  module: string;
  /** Type of the blocking instance (formerly `blocking_state`). */
  task: string;
  /** When the dependency binds to a recurring Inbox series. */
  recurring_definition_id?: string;
  description?: string;
  due_at?: number;
  sla_days_before: number;
  emitted_at: number;
};

// ────────────────────────────────────────────────────────────────────
// Type guards (used by validators + tests)
// ────────────────────────────────────────────────────────────────────

export function isSolicitud(value: unknown): value is Solicitud {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.concept === 'string' &&
    typeof v.type === 'string' &&
    (v.type === 'solicitud' || v.type === 'tarea') &&
    typeof v.source_app === 'string' &&
    typeof v.target_app === 'string' &&
    typeof v.state === 'string' &&
    'payload' in v &&
    Array.isArray(v.timeline) &&
    Array.isArray(v.comments)
  );
}

export function isAlerta(value: unknown): value is Alerta {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.concept === 'string' &&
    typeof v.category === 'string' &&
    ['triage', 'workflow', 'metric', 'cross_app_panel'].includes(v.category as string) &&
    typeof v.source_app === 'string'
  );
}

export function isReport(value: unknown): value is Report {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.category === 'string' &&
    typeof v.name === 'string' &&
    typeof v.periodicity === 'string' &&
    typeof v.format === 'string' &&
    typeof v.cron_enabled === 'boolean' &&
    typeof v.allows_auto_generation === 'boolean' &&
    v.permissions !== null &&
    typeof v.permissions === 'object' &&
    Array.isArray(v.consumer_apps)
  );
}

export function isReportRun(value: unknown): value is ReportRun {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.report_id === 'string' &&
    typeof v.requested_at === 'string' &&
    typeof v.status === 'string'
  );
}
