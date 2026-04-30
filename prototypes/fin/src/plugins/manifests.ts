// ════════════════════════════════════════════════════════════════════
// manifests plugin — registers every action manifest core-fin consumes
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` AFTER Pinia is installed (the registry store
// depends on Pinia). Calls into the registry once at boot; pages then
// look up via `useManifestRegistryStore().get(key)` or
// `useManifestModule(key)`.
//
// Three cross-cutting manifests (Inbox / Alertas / Reportes) cover the
// generics; four FIN-domain manifests (Movimientos / Cotizaciones /
// Tesorería / Tesorería · Cola de Asignación) cover the active modules.
// Per `core-modulo-genericos`, no `framework.template.*` registration
// is permitted past the migration baseline.
// ════════════════════════════════════════════════════════════════════

import {
  INBOX_MANIFEST,
  INBOX_MANIFEST_KEY,
} from '@/manifests/fin.inbox.actions';
import {
  ALERTAS_MANIFEST,
  ALERTAS_MANIFEST_KEY,
} from '@/manifests/fin.alertas.actions';
import {
  REPORTES_MANIFEST,
  REPORTES_MANIFEST_KEY,
} from '@/manifests/fin.reportes.actions';
import {
  FIN_MOVIMIENTOS_MANIFEST,
  FIN_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.movimientos.actions';
import {
  FIN_COTIZACIONES_MANIFEST,
  FIN_COTIZACIONES_MANIFEST_KEY,
} from '@/manifests/fin.cotizaciones.actions';
import {
  FIN_TESORERIA_MANIFEST,
  FIN_TESORERIA_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.actions';
import {
  FIN_TESORERIA_COLA_ASIGNACION_MANIFEST,
  FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.cola_asignacion.actions';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';

export function setupManifests(): void {
  const registry = useManifestRegistryStore();
  registry.register(INBOX_MANIFEST_KEY, INBOX_MANIFEST);
  registry.register(ALERTAS_MANIFEST_KEY, ALERTAS_MANIFEST);
  registry.register(REPORTES_MANIFEST_KEY, REPORTES_MANIFEST);
  registry.register(FIN_MOVIMIENTOS_MANIFEST_KEY, FIN_MOVIMIENTOS_MANIFEST);
  registry.register(FIN_COTIZACIONES_MANIFEST_KEY, FIN_COTIZACIONES_MANIFEST);
  registry.register(FIN_TESORERIA_MANIFEST_KEY, FIN_TESORERIA_MANIFEST);
  registry.register(
    FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY,
    FIN_TESORERIA_COLA_ASIGNACION_MANIFEST,
  );
}
