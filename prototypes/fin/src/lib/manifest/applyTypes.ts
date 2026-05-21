// ════════════════════════════════════════════════════════════════════
// Apply-path dependency contract
// ────────────────────────────────────────────────────────────────────
// All three apply paths (single/batch, composite, cta) accept the same
// `ApplyDeps` object so the framework-agnostic engine can stay pure
// while the Vue composable owns the wiring.
//
// The engine is PURE: it never mutates the records passed in. Each
// computed change is dispatched via `deps.dispatch.{update,create}`,
// which the page implements with a vue-query `useMutation` call. The
// dispatcher is responsible for optimistic-update + rollback + refetch.
// ════════════════════════════════════════════════════════════════════

import type { AuditEntry, Manifest, RecomputeToken } from '@/types/manifest';

export type RecomputeLookup = (
  token: RecomputeToken,
) => ((record: Record<string, unknown>, manifest: Manifest) => string) | undefined;

export type ApplyToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

export type MutationDispatch = {
  /** Apply a patch to an existing record by id. The dispatcher is
   *  responsible for optimistic-update + rollback + refetch. */
  update: (recordId: string, patch: Record<string, unknown>) => void;
  /** Persist a newly-created record (from a module CTA). */
  create: (record: Record<string, unknown>) => void;
};

export type ApplyDeps = {
  auditAppend: (entry: AuditEntry) => void;
  toast: ApplyToast;
  dispatch: MutationDispatch;
  recompute: RecomputeLookup;
  devWarn: (channel: string, message: string) => void;
};
