// ════════════════════════════════════════════════════════════════════
// manifests plugin — registers every action manifest core-fin consumes
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` AFTER Pinia is installed (the registry store
// depends on Pinia). Calls into the registry once at boot; pages then
// look up via `useManifestRegistryStore().get(key)` or
// `useManifestModule(key)`.
//
// Per REQ-50 (`add-fin-disponibilidades`):
//   - The legacy `fin.tesoreria`, `fin.tesoreria.cola_asignacion`, and
//     `fin.movimientos` (top-level) manifests are removed.
//   - Three new Disponibilidades manifests register: the module-scope
//     CTA (`fin.disponibilidades`), the Bancos / Cuentas record manifest
//     (`fin.disponibilidades.bancos_cuentas`), and the Movimientos record
//     manifest (`fin.disponibilidades.movimientos`).
//   - Cotizaciones remains as a top-level Back Office manifest.
//   - The three cross-cutting manifests (Inbox / Alertas / Reportes)
//     cover the generics.
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
  FIN_COTIZACIONES_MANIFEST,
  FIN_COTIZACIONES_MANIFEST_KEY,
} from '@/manifests/fin.cotizaciones.actions';
import {
  FIN_DISPONIBILIDADES_MANIFEST,
  FIN_DISPONIBILIDADES_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.actions';
import {
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.bancos_cuentas.actions';
import {
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.movimientos.actions';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';

export function setupManifests(): void {
  const registry = useManifestRegistryStore();
  // Cross-cutting (core-modulo-genericos)
  registry.register(INBOX_MANIFEST_KEY, INBOX_MANIFEST);
  registry.register(ALERTAS_MANIFEST_KEY, ALERTAS_MANIFEST);
  registry.register(REPORTES_MANIFEST_KEY, REPORTES_MANIFEST);
  // Back Office
  registry.register(FIN_COTIZACIONES_MANIFEST_KEY, FIN_COTIZACIONES_MANIFEST);
  // Tesorería · Disponibilidades (REQ-50)
  registry.register(FIN_DISPONIBILIDADES_MANIFEST_KEY, FIN_DISPONIBILIDADES_MANIFEST);
  registry.register(
    FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
    FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
  );
  registry.register(
    FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
    FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
  );
}
