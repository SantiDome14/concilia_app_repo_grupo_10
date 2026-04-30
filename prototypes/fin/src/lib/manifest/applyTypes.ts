// ════════════════════════════════════════════════════════════════════
// Apply-path dependency contract
// ────────────────────────────────────────────────────────────────────
// All three apply paths (single/batch, composite, cta) accept the same
// `ApplyDeps` object so the framework-agnostic engine can stay pure
// while the Vue composable owns the wiring.
// ════════════════════════════════════════════════════════════════════

import type { AuditEntry, Manifest, RecomputeToken } from '@/types/manifest';

export type RecomputeLookup = (
  token: RecomputeToken,
) => ((record: Record<string, unknown>, manifest: Manifest) => string) | undefined;

export type ApplyToast = {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

export type ApplyDeps = {
  auditAppend: (entry: AuditEntry) => void;
  toast: ApplyToast;
  afterMutation: () => void;
  recompute: RecomputeLookup;
  devWarn: (channel: string, message: string) => void;
};
