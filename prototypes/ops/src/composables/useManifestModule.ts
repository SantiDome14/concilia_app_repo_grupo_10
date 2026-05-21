import { computed, type ComputedRef } from 'vue';
import type {
  CTACreatorFn,
  Manifest,
  ManifestKey,
  ResolvedAction,
} from '@/lib/manifest';
import { resolveActions } from '@/lib/manifest';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import {
  useManifestDialog,
  _registerCreator,
  _registerDispatcher,
  _registerRecordResolver,
  type MutationDispatcher,
} from './useManifestDialog';

// ════════════════════════════════════════════════════════════════════
// useManifestModule — module-scoped helpers bound to a manifestKey
// ────────────────────────────────────────────────────────────────────
// Wraps the global dialog composable + the action resolver so a
// per-module page can consume "manifest stuff" with one import.
// ════════════════════════════════════════════════════════════════════

export interface UseManifestModuleApi {
  manifest: ComputedRef<Manifest | undefined>;
  resolveActionsFor: (record: Record<string, unknown>) => ResolvedAction[];
  openDialog: (actionId: string, recordRef: Record<string, unknown>) => void;
  openComposite: (recordRef: Record<string, unknown>, axisId: string) => void;
  openBatch: (
    actionId: string,
    recordRefs: Record<string, unknown>[],
  ) => void;
  openModuleCTA: (ctaId: string) => void;
  registerCreator: (fn: CTACreatorFn) => void;
  /**
   * Wires the page's vue-query mutations into the manifest engine. The
   * engine never mutates records — it dispatches computed patches here
   * and the page's `useMutation` implementation owns optimistic update,
   * rollback, refetch.
   */
  registerDispatcher: (dispatcher: MutationDispatcher) => void;
  registerRecordResolver: (
    fn: (
      ref: string | Record<string, unknown>,
    ) => Record<string, unknown> | undefined,
  ) => void;
}

export function useManifestModule(manifestKey: ManifestKey): UseManifestModuleApi {
  const registry = useManifestRegistryStore();
  const auth = useAuthStore();
  const dialog = useManifestDialog();

  const manifest = computed(() => registry.get(manifestKey));

  function readRoleList(): string[] | null {
    const u = auth.user;
    if (!u) return null;
    return Array.isArray(u.capabilities) ? u.capabilities : null;
  }

  function resolveActionsFor(record: Record<string, unknown>): ResolvedAction[] {
    const m = manifest.value;
    if (!m) return [];
    return resolveActions(record, m, readRoleList());
  }

  return {
    manifest,
    resolveActionsFor,
    openDialog: (actionId, recordRef) =>
      dialog.openSingle(actionId, manifestKey, recordRef),
    openComposite: (recordRef, axisId) =>
      dialog.openComposite(manifestKey, recordRef, axisId),
    openBatch: (actionId, recordRefs) =>
      dialog.openBatch(actionId, manifestKey, recordRefs),
    openModuleCTA: (ctaId) => dialog.openModuleCTA(ctaId, manifestKey),
    registerCreator: (fn) => _registerCreator(manifestKey, fn),
    registerDispatcher: (dispatcher) =>
      _registerDispatcher(manifestKey, dispatcher),
    registerRecordResolver: (fn) => _registerRecordResolver(manifestKey, fn),
  };
}
