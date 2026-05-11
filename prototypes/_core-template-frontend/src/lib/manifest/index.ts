// ════════════════════════════════════════════════════════════════════
// Manifest engine core — public API
// ────────────────────────────────────────────────────────────────────
// Framework-agnostic, side-effect-free building blocks consumed by the
// Vue/Pinia layers. The Vue layer (ManifestRegistry store, useManifest
// composable, <ManifestDialog>) wraps these.
// ════════════════════════════════════════════════════════════════════

export { resolveField, setField } from './dotPath';
export { evalPredicate } from './evalPredicate';
export { evalCapabilities } from './evalCapabilities';
export { resolveActions } from './resolveActions';
export {
  validateManifest,
  type ValidateMode,
  type ValidateOptions,
  type ValidateResult,
} from './validateManifest';
export { computeImputation } from './computeImputation';
export {
  registerRecompute,
  runRecompute,
  getRegisteredTokens,
  type RecomputeFn,
} from './recompute';
export {
  registerCatalog,
  unregisterCatalog,
  getCatalog,
  listCatalogs,
  resolveCatalog,
  resolveCatalogFilter,
  UNFILTERED_CATALOG_FILTER,
  type CatalogEntry,
  type CatalogResolver,
} from './catalog';
export {
  applyAction,
  type ApplyActionInput,
  type ApplyActionResult,
} from './applyAction';
export {
  applyComposite,
  type ApplyCompositeInput,
  type ApplyCompositeResult,
} from './applyComposite';
export {
  applyCTA,
  type ApplyCTAInput,
  type ApplyCTAResult,
  type CTACreatorFn,
} from './applyCTA';
export type {
  ApplyDeps,
  ApplyToast,
  RecomputeLookup,
} from './applyTypes';

export type {
  Action,
  AuditEntry,
  AuditEntryBase,
  AuditEntryBatch,
  AuditEntryComposite,
  AuditEntryCTA,
  AuditEntrySingle,
  Batch,
  Capabilities,
  CatalogFilter,
  Dialog,
  DialogField,
  DialogFieldBoolean,
  DialogFieldDate,
  DialogFieldLookup,
  DialogFieldNumber,
  DialogFieldSelect,
  DialogFieldText,
  DialogFieldTextarea,
  DialogFieldType,
  Dimension,
  KanbanAxis,
  KanbanState,
  Manifest,
  ManifestKey,
  ModuleCTA,
  OnConfirm,
  Predicate,
  Prerequisite,
  RecomputeToken,
  ResolvedAction,
  SelectOption,
} from '@/types/manifest';

export { ManifestError } from '@/types/manifest';

export {
  registerFieldType,
  resolveFieldType,
  hasFieldType,
  listRegisteredTypes,
} from './field-type-registry';
