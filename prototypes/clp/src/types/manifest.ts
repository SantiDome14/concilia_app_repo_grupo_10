// ════════════════════════════════════════════════════════════════════
// Manifest types — the contract for the actions-manifest engine
// ────────────────────────────────────────────────────────────────────
// Pure types; no runtime side effects. Consumed by the framework-
// agnostic engine in `src/lib/manifest/` and by Vue layers above.
//
// Authoring conventions:
//   - Manifests MUST be JSON-strict serializable (round-trip lossless).
//     No functions, no Symbols, no Date instances, no Map/Set, no
//     undefined values. Use null for empty.
//   - The 8 predicate forms below are the canonical alphabet. Multi-key
//     predicate objects are AND-merged at evaluation time (Decision 3).
//   - `required_role_all_of` is REMOVED from the schema (Decision 4).
//     The validator surfaces it as an error.
// ════════════════════════════════════════════════════════════════════

/** Canonical 6 dimensions. Adding one requires a new OpenSpec change. */
export type Dimension =
  | 'imputacion'
  | 'registro_contable'
  | 'conciliacion'
  | 'governance'
  | 'documentacion'
  | 'cierre';

/** Open string union — extensible registry; v1 ships only "imputacion". */
export type RecomputeToken = string;

/**
 * Manifest registry key. Two-segment for module-scope manifests
 * (`${app}.${module}`) or three-segment for record-scope
 * (`${app}.${module}.${recordType}`).
 *
 * Plain `string` rather than a brand: branding interferes with literal
 * key lookups in tests and forces consumers to cast at every call site.
 */
export type ManifestKey = string;

// ────────────────────────────────────────────────────────────────────
// Predicates — the 8-form alphabet
// ────────────────────────────────────────────────────────────────────

export type PredicateRecordTypeIn = { record_type_in: string[] };
export type PredicateRecordTypeNotIn = { record_type_not_in: string[] };
export type PredicateFieldIsNull = { field_is_null: string };
export type PredicateFieldIsNotNull = { field_is_not_null: string };
export type PredicateFieldEquals = {
  field_equals: { field: string; value: unknown };
};
export type PredicateFieldIn = {
  field_in: { field: string; values: unknown[] };
};
export type PredicateAll = { all: Predicate[] };
export type PredicateAny = { any: Predicate[] };

/**
 * A predicate object. Multi-key combinations of the 8 forms are
 * AND-merged at evaluation time. Authors MAY combine forms on a
 * single object (e.g. `{ record_type_in: [...], field_is_null: "x" }`).
 */
export type Predicate =
  | PredicateRecordTypeIn
  | PredicateRecordTypeNotIn
  | PredicateFieldIsNull
  | PredicateFieldIsNotNull
  | PredicateFieldEquals
  | PredicateFieldIn
  | PredicateAll
  | PredicateAny
  | (Partial<PredicateRecordTypeIn> &
      Partial<PredicateRecordTypeNotIn> &
      Partial<PredicateFieldIsNull> &
      Partial<PredicateFieldIsNotNull> &
      Partial<PredicateFieldEquals> &
      Partial<PredicateFieldIn> &
      Partial<PredicateAll> &
      Partial<PredicateAny>);

// ────────────────────────────────────────────────────────────────────
// Prerequisites & capabilities
// ────────────────────────────────────────────────────────────────────

export type Prerequisite = {
  field: string;
  value?: unknown;
  message: string;
};

/**
 * Capability gate. Only `required_role_any_of` is supported.
 * `required_role_all_of` is REMOVED — the validator rejects it.
 */
export type Capabilities = {
  required_role_any_of?: string[];
};

// ────────────────────────────────────────────────────────────────────
// on_confirm
// ────────────────────────────────────────────────────────────────────

export type OnConfirm = {
  update_fields?: string[];
  set_fields?: Record<string, unknown>;
  recompute?: RecomputeToken[];
  audit?: boolean;
  toast?: string;
};

// ────────────────────────────────────────────────────────────────────
// Dialog fields
// ────────────────────────────────────────────────────────────────────

export type DialogFieldType =
  | 'lookup'
  | 'text'
  | 'textarea'
  | 'select'
  | 'date'
  | 'number'
  | 'boolean';

/** Filter spec resolved at dropdown-open time for `lookup` fields. */
export type CatalogFilter =
  | { field: string; from_record: string }
  | { field: string; from_form: string }
  | { field: string; value: unknown };

export type SelectOption = {
  value: string;
  label: string;
  dotColor?: string;
};

type DialogFieldBase = {
  id: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  default?: unknown;
  prerequisites?: Prerequisite[];
};

export type DialogFieldLookup = DialogFieldBase & {
  type: 'lookup';
  catalog: string;
  catalog_filter?: CatalogFilter;
};

export type DialogFieldText = DialogFieldBase & {
  type: 'text';
};

export type DialogFieldTextarea = DialogFieldBase & {
  type: 'textarea';
  max_length?: number;
};

export type DialogFieldSelect = DialogFieldBase & {
  type: 'select';
  options: SelectOption[];
};

export type DialogFieldDate = DialogFieldBase & {
  type: 'date';
};

export type DialogFieldNumber = DialogFieldBase & {
  type: 'number';
  min?: number;
  max?: number;
};

export type DialogFieldBoolean = DialogFieldBase & {
  type: 'boolean';
};

export type DialogField =
  | DialogFieldLookup
  | DialogFieldText
  | DialogFieldTextarea
  | DialogFieldSelect
  | DialogFieldDate
  | DialogFieldNumber
  | DialogFieldBoolean;

export type DialogInfoBanner = {
  text: string;
  variant?: 'info' | 'warning';
};

export type Dialog = {
  title: string;
  description?: string;
  /**
   * Optional informational banner rendered between the dialog header
   * and the form fields. Two variants — `info` (default, blue) and
   * `warning` (amber). Both `text` and any title/description support
   * `{record.field}` interpolation in `single`/`composite` modes.
   */
  info_banner?: DialogInfoBanner;
  fields: DialogField[];
  confirm_label?: string;
  cancel_label?: string;
};

// ────────────────────────────────────────────────────────────────────
// Batch promotion
// ────────────────────────────────────────────────────────────────────

export type Batch = {
  batchable?: boolean;
  homogeneity_check?: string[];
  min_records?: number;
  max_records?: number;
  promote_to_main_cta?: boolean;
  main_cta_label_template?: string;
};

// ────────────────────────────────────────────────────────────────────
// Action & ModuleCTA
// ────────────────────────────────────────────────────────────────────

export type Action = {
  id: string;
  dimension: Dimension;
  label: string;
  description?: string;
  icon?: string;
  danger?: boolean;
  target_field?: string | null;
  show_when?: Predicate;
  enable_when?: Predicate;
  disable_reason?: string;
  disable_tag?: string;
  prerequisites?: Prerequisite[];
  capabilities?: Capabilities;
  dialog?: Dialog;
  on_confirm?: OnConfirm;
  batch?: Batch;
};

export type ModuleCTA = {
  id: string;
  label: string;
  is_module_cta: true;
  dimension?: Dimension;
  description?: string;
  icon?: string;
  creates_record_type?: string;
  capabilities?: Capabilities;
  dialog?: Dialog;
  on_confirm?: OnConfirm;
};

// ────────────────────────────────────────────────────────────────────
// Kanban axes
// ────────────────────────────────────────────────────────────────────

export type KanbanState = {
  id: string;
  label: string;
  column_label?: string;
  order: number;
  terminal?: boolean;
};

export type KanbanAxis = {
  axis_id: string;
  dimension: Dimension;
  drop_target_state?: string;
  states?: string[];
};

// ────────────────────────────────────────────────────────────────────
// Manifest
// ────────────────────────────────────────────────────────────────────

export type Manifest = {
  app: string;
  module: string;
  record_type?: string | null;
  scope?: 'record' | 'module';
  schema_version?: string;
  required_imputations?: string[];
  required_by_type?: Record<string, string[]>;
  kanban_axes?: KanbanAxis[];
  actions?: Action[];
  module_ctas?: ModuleCTA[];
};

// ────────────────────────────────────────────────────────────────────
// Resolution result
// ────────────────────────────────────────────────────────────────────

export type ResolvedAction = {
  action: Action;
  visible: boolean;
  enabled: boolean;
  reason: string | null;
  tag: string | null;
  blocking_prereq: Prerequisite | null;
};

// ────────────────────────────────────────────────────────────────────
// Audit entries
// ────────────────────────────────────────────────────────────────────

export type AuditEntryBase = {
  timestamp: number;
  user_id: string;
  action_id: string;
  changes: Record<string, unknown>;
};

export type AuditEntrySingle = AuditEntryBase & {
  kind: 'single';
  record_id: string;
};

export type AuditEntryBatch = AuditEntryBase & {
  kind: 'batch';
  record_ids: string[];
};

export type AuditEntryComposite = AuditEntryBase & {
  kind: 'composite';
  record_id: string;
  child_action_ids: string[];
  axis_id: string;
};

export type AuditEntryCTA = AuditEntryBase & {
  kind: 'cta';
  record_id?: string;
  created_record_type?: string | null;
  is_module_cta: true;
};

export type AuditEntry =
  | AuditEntrySingle
  | AuditEntryBatch
  | AuditEntryComposite
  | AuditEntryCTA;

// ────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────

/**
 * Branded error class for hard manifest-engine failures
 * (missing creator, strict-mode validation failures, etc.).
 */
export class ManifestError extends Error {
  readonly isManifestError = true;

  constructor(message: string) {
    super(message);
    this.name = 'ManifestError';
  }
}
