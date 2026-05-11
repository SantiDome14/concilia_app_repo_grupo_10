import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  applyAction,
  applyComposite,
  applyCTA,
  evalCapabilities,
  evalPredicate,
  resolveActions,
  runRecompute,
  type Action,
  type ApplyDeps,
  type CTACreatorFn,
  type DialogField,
  type Manifest,
  type ManifestKey,
  type ModuleCTA,
  type Prerequisite,
  type ResolvedAction,
} from '@/lib/manifest';
import { resolveField } from '@/lib/manifest';
import { ManifestError, type DialogInfoBanner } from '@/types/manifest';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuditLogStore } from '@/stores/auditLog';
import { useAuthStore } from '@/stores/auth';

// ════════════════════════════════════════════════════════════════════
// useManifestDialog — single global dialog state (singleton composable)
// ────────────────────────────────────────────────────────────────────
// Owns the four-mode discriminator (single | composite | batch | cta),
// the formValues map, the per-action enabled flags (composite mode),
// and the apply orchestration that wires the pure engine to Pinia +
// vue-sonner.
//
// A single shared `<ManifestDialog>` instance subscribes to this state
// (per Requirement 9). Module-scoped consumers call the helpers via
// `useManifestModule(manifestKey)`.
// ════════════════════════════════════════════════════════════════════

export type DialogMode = 'single' | 'composite' | 'batch' | 'cta';

export interface DialogStateBase {
  mode: DialogMode;
  manifestKey: ManifestKey;
  formValues: Record<string, unknown>;
  errors: Record<string, string>;
  busy: boolean;
}

export interface DialogStateSingle extends DialogStateBase {
  mode: 'single';
  action: Action;
  recordRef: Record<string, unknown>;
}

export interface DialogStateBatch extends DialogStateBase {
  mode: 'batch';
  action: Action;
  recordRefs: Record<string, unknown>[];
}

export interface DialogStateComposite extends DialogStateBase {
  mode: 'composite';
  axisId: string;
  recordRef: Record<string, unknown>;
  /** All dimension-matching actions, in declaration order. */
  groups: ResolvedAction[];
  /** Live enabled-flag overrides re-evaluated on field change. */
  enabledOverrides: Record<string, boolean>;
}

export interface DialogStateCTA extends DialogStateBase {
  mode: 'cta';
  cta: ModuleCTA;
}

export type DialogState =
  | DialogStateSingle
  | DialogStateBatch
  | DialogStateComposite
  | DialogStateCTA;

// ────────────────────────────────────────────────────────────────────
// Module-scoped factory registries (creator + afterMutation +
// recordResolver). Keyed by manifestKey so multiple modules coexist.
// ────────────────────────────────────────────────────────────────────

const CREATORS: Map<ManifestKey, CTACreatorFn> = new Map();
const AFTER_MUTATION: Map<ManifestKey, () => void> = new Map();
const RECORD_RESOLVERS: Map<
  ManifestKey,
  (ref: string | Record<string, unknown>) => Record<string, unknown> | undefined
> = new Map();

export function _registerCreator(key: ManifestKey, fn: CTACreatorFn): void {
  CREATORS.set(key, fn);
}
export function _registerAfterMutation(key: ManifestKey, fn: () => void): void {
  AFTER_MUTATION.set(key, fn);
}
export function _registerRecordResolver(
  key: ManifestKey,
  fn: (ref: string | Record<string, unknown>) => Record<string, unknown> | undefined,
): void {
  RECORD_RESOLVERS.set(key, fn);
}
export function _clearModuleRegistries(): void {
  CREATORS.clear();
  AFTER_MUTATION.clear();
  RECORD_RESOLVERS.clear();
}
/** Test helper — resets the singleton state between cases. */
export function _resetManifestDialogState(): void {
  state.value = null;
}

// ────────────────────────────────────────────────────────────────────
// Singleton state — one source of truth shared by every consumer.
// ────────────────────────────────────────────────────────────────────

const state: Ref<DialogState | null> = ref(null);

// ────────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────────

function devWarn(channel: string, message: string): void {

  console.warn(`[${channel}] ${message}`);
}

function readManifest(key: ManifestKey): Manifest | undefined {
  return useManifestRegistryStore().get(key);
}

function readUserId(): string {
  const u = useAuthStore().user;
  return typeof u?.id === 'string' ? u.id : 'unknown';
}

function readRoleList(): string[] | null {
  const u = useAuthStore().user;
  if (!u) return null;
  return Array.isArray(u.capabilities) ? u.capabilities : null;
}

function buildDeps(manifestKey: ManifestKey): ApplyDeps {
  const audit = useAuditLogStore();
  return {
    auditAppend: (entry) => audit.append(entry),
    toast: {
      success: (title, description) => toast.success(title, { description }),
      error: (title, description) => toast.error(title, { description }),
    },
    afterMutation: () => {
      const fn = AFTER_MUTATION.get(manifestKey);
      if (fn) fn();
    },
    recompute: (token) => (record, manifest) => {
      const out = runRecompute(token, record, manifest);
      return out ?? '';
    },
    devWarn,
  };
}

/**
 * Seeds formValues for a single action: for each field, take from the
 * record (per `update_fields` paths) when present, else `field.default`,
 * else null.
 */
function seedSingle(action: Action, record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of action.dialog?.fields ?? []) {
    const v = resolveField(record, f.id);
    if (v !== undefined) {
      out[f.id] = v;
    } else if (f.default !== undefined) {
      out[f.id] = f.default;
    } else {
      out[f.id] = null;
    }
  }
  return out;
}

/**
 * Seeds formValues for the composite mode. First-action-wins on the
 * value layer (Requirement 12).
 */
function seedComposite(
  groups: ResolvedAction[],
  record: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const g of groups) {
    for (const f of g.action.dialog?.fields ?? []) {
      if (Object.prototype.hasOwnProperty.call(out, f.id)) continue;
      const v = resolveField(record, f.id);
      if (v !== undefined) {
        out[f.id] = v;
      } else if (f.default !== undefined) {
        out[f.id] = f.default;
      } else {
        out[f.id] = null;
      }
    }
  }
  return out;
}

/**
 * Visible (deduped) field list across composite groups — first-occurrence
 * wins on the render layer.
 */
export function dedupCompositeFields(groups: ResolvedAction[]): {
  ownerActionId: string;
  field: DialogField;
}[] {
  const seen = new Set<string>();
  const out: { ownerActionId: string; field: DialogField }[] = [];
  for (const g of groups) {
    for (const f of g.action.dialog?.fields ?? []) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      out.push({ ownerActionId: g.action.id, field: f });
    }
  }
  return out;
}

function projectRecord(
  record: Record<string, unknown>,
  formValues: Record<string, unknown>,
): Record<string, unknown> {
  return { ...record, ...formValues };
}

function checkPrereq(
  pr: Prerequisite,
  record: Record<string, unknown>,
): boolean {
  const v = resolveField(record, pr.field);
  if (pr.value === undefined) return v !== null && v !== undefined;
  return v === pr.value;
}

/**
 * Re-evaluates each composite group's enabled flag against
 * `{...record, ...formValues}` (Requirement 12, step 6).
 */
function recomputeCompositeEnabled(
  groups: ResolvedAction[],
  record: Record<string, unknown>,
  formValues: Record<string, unknown>,
  role: string | string[] | null,
): Record<string, boolean> {
  const projected = projectRecord(record, formValues);
  const out: Record<string, boolean> = {};
  for (const g of groups) {
    const a = g.action;
    if (a.show_when && !evalPredicate(a.show_when, projected)) {
      out[a.id] = false;
      continue;
    }
    let ok = true;
    for (const pr of a.prerequisites ?? []) {
      if (!checkPrereq(pr, projected)) {
        ok = false;
        break;
      }
    }
    if (ok && a.enable_when && !evalPredicate(a.enable_when, projected)) ok = false;
    if (ok && !evalCapabilities(a.capabilities, role)) ok = false;
    out[a.id] = ok;
  }
  return out;
}

/** Substitutes `{N}` in a label template. */
function substituteN(template: string, n: number): string {
  return template.replace(/\{N\}/g, String(n));
}

function isFieldEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Required-field validation. Returns true when every required field on
 * the *enabled* groups has a non-empty value.
 */
function validateRequired(
  fields: { ownerActionId: string; field: DialogField }[],
  formValues: Record<string, unknown>,
  enabledByAction: Record<string, boolean>,
): { ok: boolean; firstMissing: DialogField | null } {
  for (const { ownerActionId, field } of fields) {
    if (enabledByAction[ownerActionId] === false) continue;
    if (field.required === true && isFieldEmpty(formValues[field.id])) {
      return { ok: false, firstMissing: field };
    }
  }
  return { ok: true, firstMissing: null };
}

// ────────────────────────────────────────────────────────────────────
// Public composable API
// ────────────────────────────────────────────────────────────────────

export interface UseManifestDialogApi {
  state: ComputedRef<DialogState | null>;
  /** Single-action open. */
  openSingle: (
    actionId: string,
    manifestKey: ManifestKey,
    recordRef: Record<string, unknown>,
  ) => void;
  /** Kanban-axis composite open. */
  openComposite: (
    manifestKey: ManifestKey,
    recordRef: Record<string, unknown>,
    axisId: string,
  ) => void;
  /** Batch-promotion open. */
  openBatch: (
    actionId: string,
    manifestKey: ManifestKey,
    recordRefs: Record<string, unknown>[],
  ) => void;
  /** Module-CTA open. */
  openModuleCTA: (ctaId: string, manifestKey: ManifestKey) => void;
  /** Field-value setter; re-evaluates composite prereqs on change. */
  setFieldValue: (fieldId: string, value: unknown) => void;
  /** Run apply path; close on success. */
  confirm: () => Promise<void>;
  /** Close without persisting. */
  cancel: () => void;
  /** Render-deduped composite fields (helper for the dialog). */
  visibleCompositeFields: ComputedRef<
    { ownerActionId: string; field: DialogField }[]
  >;
}

export function useManifestDialog(): UseManifestDialogApi {
  // ── openers ───────────────────────────────────────────────────────
  function openSingle(
    actionId: string,
    manifestKey: ManifestKey,
    recordRef: Record<string, unknown>,
  ): void {
    const m = readManifest(manifestKey);
    if (!m) {
      devWarn('MANIFEST', `openSingle: manifest "${manifestKey}" not registered`);
      return;
    }
    const action = (m.actions ?? []).find((a) => a.id === actionId);
    if (!action) {
      devWarn('MANIFEST', `openSingle: action "${actionId}" not found in ${manifestKey}`);
      return;
    }
    state.value = {
      mode: 'single',
      manifestKey,
      action,
      recordRef,
      formValues: seedSingle(action, recordRef),
      errors: {},
      busy: false,
    };
  }

  function openBatch(
    actionId: string,
    manifestKey: ManifestKey,
    recordRefs: Record<string, unknown>[],
  ): void {
    const m = readManifest(manifestKey);
    if (!m) {
      devWarn('MANIFEST', `openBatch: manifest "${manifestKey}" not registered`);
      return;
    }
    const action = (m.actions ?? []).find((a) => a.id === actionId);
    if (!action) {
      devWarn('MANIFEST', `openBatch: action "${actionId}" not found`);
      return;
    }
    // Seed defaults from action fields only (no record to read from in batch).
    const formValues: Record<string, unknown> = {};
    for (const f of action.dialog?.fields ?? []) {
      formValues[f.id] = f.default ?? null;
    }
    state.value = {
      mode: 'batch',
      manifestKey,
      action,
      recordRefs,
      formValues,
      errors: {},
      busy: false,
    };
  }

  function openComposite(
    manifestKey: ManifestKey,
    recordRef: Record<string, unknown>,
    axisId: string,
  ): void {
    const m = readManifest(manifestKey);
    if (!m) {
      devWarn('MANIFEST', `openComposite: manifest "${manifestKey}" not registered`);
      return;
    }
    const axis = (m.kanban_axes ?? []).find((x) => x.axis_id === axisId);
    if (!axis) {
      devWarn('MANIFEST', `openComposite: axis "${axisId}" not declared`);
      return;
    }
    const role = readRoleList();
    const all = resolveActions(recordRef, m, role);
    const groups = all.filter((g) => g.action.dimension === axis.dimension);
    const formValues = seedComposite(groups, recordRef);
    const enabledOverrides: Record<string, boolean> = {};
    for (const g of groups) enabledOverrides[g.action.id] = g.enabled;
    state.value = {
      mode: 'composite',
      manifestKey,
      axisId,
      recordRef,
      groups,
      enabledOverrides,
      formValues,
      errors: {},
      busy: false,
    };
  }

  function openModuleCTA(ctaId: string, manifestKey: ManifestKey): void {
    const m = readManifest(manifestKey);
    if (!m) {
      devWarn('MANIFEST', `openModuleCTA: manifest "${manifestKey}" not registered`);
      return;
    }
    const cta = (m.module_ctas ?? []).find((c) => c.id === ctaId);
    if (!cta) {
      devWarn('MANIFEST', `openModuleCTA: cta "${ctaId}" not found`);
      return;
    }
    const formValues: Record<string, unknown> = {};
    for (const f of cta.dialog?.fields ?? []) {
      formValues[f.id] = f.default ?? null;
    }
    state.value = {
      mode: 'cta',
      manifestKey,
      cta,
      formValues,
      errors: {},
      busy: false,
    };
  }

  // ── field-value setter ────────────────────────────────────────────
  function setFieldValue(fieldId: string, value: unknown): void {
    const s = state.value;
    if (!s) return;
    s.formValues[fieldId] = value;
    if (s.mode === 'composite') {
      const role = readRoleList();
      s.enabledOverrides = recomputeCompositeEnabled(
        s.groups,
        s.recordRef,
        s.formValues,
        role,
      );
    }
  }

  // ── confirm ───────────────────────────────────────────────────────
  async function confirm(): Promise<void> {
    const s = state.value;
    if (!s || s.busy) return;
    s.busy = true;
    try {
      const m = readManifest(s.manifestKey);
      if (!m) {
        toast.error('Manifest no registrado');
        return;
      }
      const userId = readUserId();
      const deps = buildDeps(s.manifestKey);

      if (s.mode === 'single') {
        const fields = (s.action.dialog?.fields ?? []).map((f) => ({
          ownerActionId: s.action.id,
          field: f,
        }));
        const v = validateRequired(fields, s.formValues, { [s.action.id]: true });
        if (!v.ok) {
          toast.error('Falta completar campo obligatorio');
          return;
        }
        applyAction(
          {
            action: s.action,
            manifestKey: s.manifestKey,
            manifest: m,
            records: [s.recordRef],
            formValues: s.formValues,
            isBatch: false,
            userId,
          },
          deps,
        );
        state.value = null;
        return;
      }

      if (s.mode === 'batch') {
        const fields = (s.action.dialog?.fields ?? []).map((f) => ({
          ownerActionId: s.action.id,
          field: f,
        }));
        const v = validateRequired(fields, s.formValues, { [s.action.id]: true });
        if (!v.ok) {
          toast.error('Falta completar campo obligatorio');
          return;
        }
        applyAction(
          {
            action: s.action,
            manifestKey: s.manifestKey,
            manifest: m,
            records: s.recordRefs,
            formValues: s.formValues,
            isBatch: true,
            userId,
          },
          deps,
        );
        state.value = null;
        return;
      }

      if (s.mode === 'composite') {
        const visible = dedupCompositeFields(s.groups);
        const v = validateRequired(visible, s.formValues, s.enabledOverrides);
        if (!v.ok) {
          toast.error('Falta completar campo obligatorio');
          return;
        }
        const enabled = s.groups
          .filter((g) => s.enabledOverrides[g.action.id] === true)
          .map((g) => g.action);
        applyComposite(
          {
            manifestKey: s.manifestKey,
            manifest: m,
            axisId: s.axisId,
            record: s.recordRef,
            enabledActions: enabled,
            formValues: s.formValues,
            userId,
          },
          deps,
        );
        state.value = null;
        return;
      }

      if (s.mode === 'cta') {
        const fields = (s.cta.dialog?.fields ?? []).map((f) => ({
          ownerActionId: s.cta.id,
          field: f,
        }));
        const v = validateRequired(fields, s.formValues, { [s.cta.id]: true });
        if (!v.ok) {
          toast.error('Falta completar campo obligatorio');
          return;
        }
        const creator = CREATORS.get(s.manifestKey) ?? null;
        try {
          applyCTA(
            {
              cta: s.cta,
              manifestKey: s.manifestKey,
              formValues: s.formValues,
              creator,
              userId,
            },
            deps,
          );
          state.value = null;
        } catch (err) {
          if (err instanceof ManifestError) {
            toast.error('No se puede crear el registro: factory no registrada');
            // Keep the dialog open per Requirement 14.
            return;
          }
          throw err;
        }
        return;
      }
    } finally {
      const cur = state.value;
      if (cur) cur.busy = false;
    }
  }

  function cancel(): void {
    state.value = null;
  }

  const visibleCompositeFields = computed(() => {
    const s = state.value;
    if (!s || s.mode !== 'composite') return [];
    return dedupCompositeFields(s.groups);
  });

  return {
    state: computed(() => state.value),
    openSingle,
    openComposite,
    openBatch,
    openModuleCTA,
    setFieldValue,
    confirm,
    cancel,
    visibleCompositeFields,
  };
}

// ────────────────────────────────────────────────────────────────────
// Helpers consumed by `<ManifestDialog>` for footer-label resolution.
// ────────────────────────────────────────────────────────────────────

export function resolveConfirmLabel(s: DialogState): string {
  if (s.mode === 'single') return s.action.dialog?.confirm_label ?? 'Confirmar';
  if (s.mode === 'composite') return 'Aplicar';
  if (s.mode === 'batch') {
    const tpl = s.action.batch?.main_cta_label_template;
    if (typeof tpl === 'string') return substituteN(tpl, s.recordRefs.length);
    return `${s.action.label} a ${s.recordRefs.length} registros`;
  }
  return s.cta.dialog?.confirm_label ?? 'Confirmar';
}

export function resolveCancelLabel(s: DialogState): string {
  if (s.mode === 'single') return s.action.dialog?.cancel_label ?? 'Cancelar';
  if (s.mode === 'cta') return s.cta.dialog?.cancel_label ?? 'Cancelar';
  return 'Cancelar';
}

/**
 * Replaces `{record.<dot.path>}` placeholders in a template string using
 * the live record. Unmatched placeholders (record absent or path
 * missing/null) are left as-is so authoring mistakes are visible at
 * runtime.
 */
function interpolate(
  template: string,
  record: Record<string, unknown> | undefined,
): string {
  if (!record) return template;
  return template.replace(/\{record\.([\w.]+)\}/g, (match, path: string) => {
    const v = resolveField(record, path);
    if (v === undefined || v === null || v === '') return match;
    return String(v);
  });
}

function activeRecord(s: DialogState): Record<string, unknown> | undefined {
  if (s.mode === 'single' || s.mode === 'composite') return s.recordRef;
  return undefined;
}

export function resolveDialogTitle(s: DialogState): string {
  let raw: string;
  if (s.mode === 'single') raw = s.action.dialog?.title ?? s.action.label;
  else if (s.mode === 'batch') raw = s.action.dialog?.title ?? s.action.label;
  else if (s.mode === 'cta') raw = s.cta.dialog?.title ?? s.cta.label;
  else raw = 'Aplicar acciones';
  return interpolate(raw, activeRecord(s));
}

export function resolveDialogDescription(s: DialogState): string | undefined {
  let raw: string | undefined;
  if (s.mode === 'single') raw = s.action.dialog?.description;
  else if (s.mode === 'batch') raw = s.action.dialog?.description;
  else if (s.mode === 'cta') raw = s.cta.dialog?.description;
  if (!raw) return undefined;
  return interpolate(raw, activeRecord(s));
}

export function resolveDialogInfoBanner(s: DialogState): DialogInfoBanner | undefined {
  let raw: DialogInfoBanner | undefined;
  if (s.mode === 'single') raw = s.action.dialog?.info_banner;
  else if (s.mode === 'batch') raw = s.action.dialog?.info_banner;
  else if (s.mode === 'cta') raw = s.cta.dialog?.info_banner;
  if (!raw) return undefined;
  return {
    text: interpolate(raw.text, activeRecord(s)),
    variant: raw.variant ?? 'info',
  };
}
