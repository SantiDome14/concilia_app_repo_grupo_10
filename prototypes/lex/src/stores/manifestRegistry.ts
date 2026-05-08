import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Manifest, ManifestKey } from '@/types/manifest';
import {
  validateManifest,
  type ValidateMode,
  type ValidateResult,
} from '@/lib/manifest';

// ════════════════════════════════════════════════════════════════════
// useManifestRegistryStore — single keyed map, last-writer-wins
// ────────────────────────────────────────────────────────────────────
// Per Requirement 1: registers under ${app}.${module}[.${recordType}].
// Validation runs synchronously; in dev mode, warnings are surfaced
// but the manifest is still stored. Toggle `strict` from tests to
// bubble validation errors as throws.
// ════════════════════════════════════════════════════════════════════

const DEV_MODE = (() => {
  try {
    if (typeof import.meta !== 'undefined') {
      const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
      if (env && typeof env.DEV === 'boolean') return env.DEV;
    }
  } catch {
    // ignore — fall through
  }
  return true;
})();

export const useManifestRegistryStore = defineStore('manifestRegistry', () => {
  const registry = ref<Map<ManifestKey, Manifest>>(new Map());
  const strict = ref(false);

  function register(key: ManifestKey, manifest: Manifest): ValidateResult {
    if (registry.value.has(key) && DEV_MODE) {
      // Last-writer-wins; surface duplicate registrations in dev.

      console.warn(`[MANIFEST] duplicate registration: ${key}`);
    }
    const mode: ValidateMode = strict.value ? 'strict' : 'dev';
    const result = validateManifest(manifest, key, mode);
    registry.value.set(key, manifest);
    return result;
  }

  function unregister(key: ManifestKey): boolean {
    return registry.value.delete(key);
  }

  function get(key: ManifestKey): Manifest | undefined {
    return registry.value.get(key);
  }

  function list(): ManifestKey[] {
    return Array.from(registry.value.keys());
  }

  function clear(): void {
    registry.value.clear();
  }

  function setStrict(next: boolean): void {
    strict.value = next;
  }

  return { registry, strict, register, unregister, get, list, clear, setStrict };
});
