// ════════════════════════════════════════════════════════════════════
// manifests plugin — registers the four standard module manifests
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` AFTER Pinia is installed (the registry store
// depends on Pinia). Calls into the registry once at boot; pages then
// look up via `useManifestRegistryStore().get(key)` or
// `useManifestModule(key)`.
// ════════════════════════════════════════════════════════════════════

import {
  INBOX_MANIFEST,
  INBOX_MANIFEST_KEY,
} from '@/manifests/framework.template.inbox.actions';
import {
  ALERTAS_MANIFEST,
  ALERTAS_MANIFEST_KEY,
} from '@/manifests/framework.template.alertas.actions';
import {
  REPORTES_MANIFEST,
  REPORTES_MANIFEST_KEY,
} from '@/manifests/framework.template.reportes.actions';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';

// TRD domain manifests register here as each `add-trd-*` OpenSpec
// change archives. The `framework.template.modulo_a` manifest remains
// in `src/manifests/` as the canonical fixture used by the engine's
// unit tests (`validateManifest.spec.ts`), but it is NOT registered at
// boot — no domain page consumes it.
export function setupManifests(): void {
  const registry = useManifestRegistryStore();
  registry.register(INBOX_MANIFEST_KEY, INBOX_MANIFEST);
  registry.register(ALERTAS_MANIFEST_KEY, ALERTAS_MANIFEST);
  registry.register(REPORTES_MANIFEST_KEY, REPORTES_MANIFEST);
}
