import { computed, type ComputedRef } from 'vue';
import type { Manifest, ManifestKey } from '@/types/manifest';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';

// ════════════════════════════════════════════════════════════════════
// useManifest — typed lookup against the registry
// ────────────────────────────────────────────────────────────────────
// Returns a ComputedRef so consumers stay reactive when the registry
// later replaces a manifest under the same key (last-writer-wins).
// ════════════════════════════════════════════════════════════════════

export function useManifest(key: ManifestKey): ComputedRef<Manifest | undefined> {
  const store = useManifestRegistryStore();
  return computed(() => store.get(key));
}
