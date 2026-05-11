// ════════════════════════════════════════════════════════════════════
// Manifest validator — schema check at registration
// ────────────────────────────────────────────────────────────────────
// Dev mode: accumulates warnings via console.warn, returns ok+list.
// Strict mode: throws ManifestError on the first violation.
// ════════════════════════════════════════════════════════════════════

import {
  ManifestError,
  type Dimension,
  type DialogFieldType,
  type Manifest,
} from '@/types/manifest';

const CANONICAL_DIMENSIONS: readonly Dimension[] = [
  'imputacion',
  'registro_contable',
  'conciliacion',
  'governance',
  'documentacion',
  'cierre',
];

const CANONICAL_FIELD_TYPES: readonly DialogFieldType[] = [
  'lookup',
  'text',
  'textarea',
  'select',
  'date',
  'daterange',
  'number',
  'money',
  'boolean',
  'file',
  'multifile',
  'otp',
  'key-value-array',
];

const HEURISTIC_BANNED_ID_SUFFIXES = [
  '.ver_detalle',
  '.open_record',
  '.edit_freeform',
];

export type ValidateMode = 'dev' | 'strict';

export type ValidateOptions = {
  mode?: ValidateMode;
  /** Tokens registered in the recompute registry. Defaults to ['imputacion']. */
  knownRecomputeTokens?: string[];
};

export type ValidateResult = {
  ok: boolean;
  warnings: string[];
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/**
 * Detects undefined values and other non-JSON-serializable shapes by
 * walking the object. Returns the path of the first offending node, or
 * null when the structure is JSON-strict-clean.
 *
 * NOTE: JSON.stringify silently drops undefined and function values, so
 * round-tripping does NOT catch them on its own. We must walk first.
 */
function findNonJsonValue(
  value: unknown,
  path: string,
  seen: WeakSet<object>,
): { path: string; reason: string } | null {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'undefined') {
    return { path, reason: 'undefined value' };
  }
  if (t === 'function') {
    return { path, reason: 'function value' };
  }
  if (t === 'symbol') {
    return { path, reason: 'symbol value' };
  }
  if (t === 'bigint') {
    return { path, reason: 'bigint value' };
  }
  if (t !== 'object') return null;

  const obj = value as object;
  if (seen.has(obj)) {
    return { path, reason: 'circular reference' };
  }
  seen.add(obj);

  if (obj instanceof Date) {
    return { path, reason: 'Date instance' };
  }
  if (obj instanceof Map || obj instanceof Set) {
    return { path, reason: `${obj.constructor.name} instance` };
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i += 1) {
      const found = findNonJsonValue(obj[i], `${path}[${i}]`, seen);
      if (found) return found;
    }
    return null;
  }

  // Class instances (non-plain objects) are flagged.
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) {
    return { path, reason: `class instance (${obj.constructor?.name ?? '?'})` };
  }

  for (const key of Object.keys(obj)) {
    const child = (obj as Record<string, unknown>)[key];
    const childPath = path === '' ? key : `${path}.${key}`;
    const found = findNonJsonValue(child, childPath, seen);
    if (found) return found;
  }
  return null;
}

class Reporter {
  readonly warnings: string[] = [];
  ok = true;

  constructor(
    readonly key: string,
    readonly mode: ValidateMode,
  ) {}

  report(message: string): void {
    this.ok = false;
    const formatted = `[MANIFEST] "${this.key}": ${message}`;
    this.warnings.push(formatted);
    if (this.mode === 'strict') {
      throw new ManifestError(formatted);
    }
     
    console.warn(formatted);
  }
}

/**
 * Validates a manifest object.
 *
 * - `dev` mode: returns `{ ok, warnings }`; emits console.warn per issue.
 * - `strict` mode: throws ManifestError on the first issue (used in tests).
 */
export function validateManifest(
  manifest: unknown,
  key: string,
  modeOrOptions: ValidateMode | ValidateOptions = 'dev',
): ValidateResult {
  const options: ValidateOptions =
    typeof modeOrOptions === 'string'
      ? { mode: modeOrOptions }
      : modeOrOptions;
  const mode: ValidateMode = options.mode ?? 'dev';
  const knownTokens = new Set(
    options.knownRecomputeTokens ?? ['imputacion'],
  );

  const reporter = new Reporter(key, mode);

  if (!isPlainObject(manifest)) {
    reporter.report('manifest must be a non-null object');
    return { ok: reporter.ok, warnings: reporter.warnings };
  }

  // ── Top-level required fields ──────────────────────────────────
  if (!isNonEmptyString(manifest.app)) {
    reporter.report('top-level field "app" is required');
  }
  if (!isNonEmptyString(manifest.module)) {
    reporter.report('top-level field "module" is required');
  }

  // ── JSON-strict serializability ────────────────────────────────
  const violation = findNonJsonValue(manifest, '', new WeakSet());
  if (violation) {
    reporter.report(
      `manifest is not JSON-strict serializable (${violation.reason} at ${violation.path || '<root>'})`,
    );
  } else {
    // Final round-trip equality check.
    try {
      const round = JSON.parse(JSON.stringify(manifest));
      if (!deepEqual(manifest, round)) {
        reporter.report(
          'manifest fails JSON round-trip equality (structural divergence)',
        );
      }
    } catch (err) {
      reporter.report(
        `manifest cannot be JSON.stringify'd: ${(err as Error).message}`,
      );
    }
  }

  // ── Actions ────────────────────────────────────────────────────
  const actions = (manifest as Manifest).actions;
  if (actions !== undefined) {
    if (!Array.isArray(actions)) {
      reporter.report('"actions" must be an array when present');
    } else {
      actions.forEach((action, i) => validateAction(action, i, reporter, knownTokens));
    }
  }

  // ── Module CTAs ────────────────────────────────────────────────
  const ctas = (manifest as Manifest).module_ctas;
  if (ctas !== undefined) {
    if (!Array.isArray(ctas)) {
      reporter.report('"module_ctas" must be an array when present');
    } else {
      ctas.forEach((cta, i) => validateModuleCTA(cta, i, reporter));
    }
  }

  // ── Kanban axes ────────────────────────────────────────────────
  const axes = (manifest as Manifest).kanban_axes;
  if (axes !== undefined) {
    if (!Array.isArray(axes)) {
      reporter.report('"kanban_axes" must be an array when present');
    } else {
      axes.forEach((axis, i) => validateKanbanAxis(axis, i, reporter));
    }
  }

  return { ok: reporter.ok, warnings: reporter.warnings };
}

function validateAction(
  raw: unknown,
  i: number,
  reporter: Reporter,
  knownTokens: Set<string>,
): void {
  const prefix = `actions[${i}]`;
  if (!isPlainObject(raw)) {
    reporter.report(`${prefix} must be an object`);
    return;
  }
  if (!isNonEmptyString(raw.id)) {
    reporter.report(`${prefix} missing required field "id"`);
  }
  if (!isNonEmptyString(raw.label)) {
    reporter.report(`${prefix} missing required field "label"`);
  }
  if (!isNonEmptyString(raw.dimension)) {
    reporter.report(`${prefix} missing required field "dimension"`);
  } else if (!CANONICAL_DIMENSIONS.includes(raw.dimension as Dimension)) {
    reporter.report(
      `${prefix} dimension "${raw.dimension}" is not one of the canonical six`,
    );
  }

  // Heuristic exclusion-list check on action ids.
  if (typeof raw.id === 'string') {
    for (const banned of HEURISTIC_BANNED_ID_SUFFIXES) {
      if (raw.id.endsWith(banned)) {
        reporter.report(
          `${prefix} id "${raw.id}" matches excluded pattern "*${banned}" — not a manifest action (see core-actions-menu / core-modals)`,
        );
        break;
      }
    }
  }

  // Capabilities — reject required_role_all_of explicitly.
  const caps = raw.capabilities;
  if (caps !== undefined) {
    if (!isPlainObject(caps)) {
      reporter.report(`${prefix}.capabilities must be an object`);
    } else if ('required_role_all_of' in caps) {
      reporter.report(
        `${prefix}.capabilities.required_role_all_of is REMOVED — use required_role_any_of`,
      );
    }
  }

  // Dialog fields.
  const dialog = raw.dialog;
  if (dialog !== undefined) {
    if (!isPlainObject(dialog)) {
      reporter.report(`${prefix}.dialog must be an object`);
    } else {
      const fields = dialog.fields;
      if (fields !== undefined) {
        if (!Array.isArray(fields)) {
          reporter.report(`${prefix}.dialog.fields must be an array`);
        } else {
          fields.forEach((field, j) =>
            validateDialogField(field, prefix, j, reporter),
          );
        }
      }
    }
  }

  // on_confirm.recompute tokens.
  const onConfirm = raw.on_confirm;
  if (onConfirm !== undefined) {
    if (!isPlainObject(onConfirm)) {
      reporter.report(`${prefix}.on_confirm must be an object`);
    } else {
      const recompute = onConfirm.recompute;
      if (recompute !== undefined) {
        if (!Array.isArray(recompute)) {
          reporter.report(`${prefix}.on_confirm.recompute must be an array`);
        } else {
          recompute.forEach((token, k) => {
            if (typeof token !== 'string') {
              reporter.report(
                `${prefix}.on_confirm.recompute[${k}] must be a string`,
              );
              return;
            }
            if (!knownTokens.has(token)) {
              reporter.report(
                `${prefix}.on_confirm.recompute[${k}] unknown token "${token}"`,
              );
            }
          });
        }
      }
    }
  }

  // Batch homogeneity_check tokens.
  const batch = raw.batch;
  if (batch !== undefined) {
    if (!isPlainObject(batch)) {
      reporter.report(`${prefix}.batch must be an object`);
    } else {
      const checks = batch.homogeneity_check;
      if (checks !== undefined) {
        if (!Array.isArray(checks)) {
          reporter.report(
            `${prefix}.batch.homogeneity_check must be an array`,
          );
        } else {
          checks.forEach((token, k) => {
            if (typeof token !== 'string') {
              reporter.report(
                `${prefix}.batch.homogeneity_check[${k}] must be a string`,
              );
              return;
            }
            const valid =
              token === 'all_records_pass_show_when' ||
              token.startsWith('all_records_have_field_null:');
            if (!valid) {
              reporter.report(
                `${prefix}.batch.homogeneity_check[${k}] unknown token "${token}"`,
              );
            }
          });
        }
      }
    }
  }
}

function validateDialogField(
  raw: unknown,
  parentPrefix: string,
  j: number,
  reporter: Reporter,
): void {
  const prefix = `${parentPrefix}.dialog.fields[${j}]`;
  if (!isPlainObject(raw)) {
    reporter.report(`${prefix} must be an object`);
    return;
  }
  if (!isNonEmptyString(raw.id)) {
    reporter.report(`${prefix} missing required field "id"`);
  }
  if (!isNonEmptyString(raw.label)) {
    reporter.report(`${prefix} missing required field "label"`);
  }
  if (!isNonEmptyString(raw.type)) {
    reporter.report(`${prefix} missing required field "type"`);
    return;
  }
  if (!CANONICAL_FIELD_TYPES.includes(raw.type as DialogFieldType)) {
    reporter.report(
      `${prefix} type "${raw.type}" is not one of the seven canonical field types`,
    );
    return;
  }
  if (raw.type === 'lookup' && !isNonEmptyString(raw.catalog)) {
    reporter.report(
      `${prefix} type "lookup" requires a non-empty "catalog" field`,
    );
  }
  if (raw.type === 'select') {
    if (!Array.isArray(raw.options) || raw.options.length === 0) {
      reporter.report(
        `${prefix} type "select" requires a non-empty "options" array`,
      );
    } else {
      raw.options.forEach((opt, k) => {
        if (!isPlainObject(opt)) {
          reporter.report(`${prefix}.options[${k}] must be an object`);
          return;
        }
        if (!isNonEmptyString(opt.value)) {
          reporter.report(`${prefix}.options[${k}] missing "value"`);
        }
        if (!isNonEmptyString(opt.label)) {
          reporter.report(`${prefix}.options[${k}] missing "label"`);
        }
      });
    }
  }
}

function validateModuleCTA(raw: unknown, i: number, reporter: Reporter): void {
  const prefix = `module_ctas[${i}]`;
  if (!isPlainObject(raw)) {
    reporter.report(`${prefix} must be an object`);
    return;
  }
  if (!isNonEmptyString(raw.id)) {
    reporter.report(`${prefix} missing required field "id"`);
  }
  if (!isNonEmptyString(raw.label)) {
    reporter.report(`${prefix} missing required field "label"`);
  }
  const caps = raw.capabilities;
  if (caps !== undefined) {
    if (isPlainObject(caps) && 'required_role_all_of' in caps) {
      reporter.report(
        `${prefix}.capabilities.required_role_all_of is REMOVED — use required_role_any_of`,
      );
    }
  }
}

function validateKanbanAxis(raw: unknown, i: number, reporter: Reporter): void {
  const prefix = `kanban_axes[${i}]`;
  if (!isPlainObject(raw)) {
    reporter.report(`${prefix} must be an object`);
    return;
  }
  if (!isNonEmptyString(raw.axis_id)) {
    reporter.report(`${prefix} missing required field "axis_id"`);
  }
  if (!isNonEmptyString(raw.dimension)) {
    reporter.report(`${prefix} missing required field "dimension"`);
  } else if (!CANONICAL_DIMENSIONS.includes(raw.dimension as Dimension)) {
    reporter.report(
      `${prefix} dimension "${raw.dimension}" is not one of the canonical six`,
    );
  }
}

// Minimal structural deep-equal (sufficient for round-trip JSON checks).
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    ) {
      return false;
    }
  }
  return true;
}
