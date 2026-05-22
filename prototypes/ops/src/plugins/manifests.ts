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
import {
  OPS_MOVIMIENTOS_MANIFEST,
  OPS_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/ops.movimientos.actions';
import {
  OPS_BANKS_ACCOUNTS_MANIFEST,
  OPS_BANKS_ACCOUNTS_MANIFEST_KEY,
} from '@/manifests/ops.banks_accounts.actions';
import {
  OPS_TRADES_MANIFEST,
  OPS_TRADES_MANIFEST_KEY,
} from '@/manifests/ops.trades.actions';
import {
  OPS_PSP_CUENTAS_MANIFEST,
  OPS_PSP_CUENTAS_MANIFEST_KEY,
} from '@/manifests/ops.psp.cuentas.actions';
import {
  OPS_PSP_MOVIMIENTOS_MANIFEST,
  OPS_PSP_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/ops.psp.movimientos.actions';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';

export function setupManifests(): void {
  const registry = useManifestRegistryStore();
  registry.register(INBOX_MANIFEST_KEY, INBOX_MANIFEST);
  registry.register(ALERTAS_MANIFEST_KEY, ALERTAS_MANIFEST);
  registry.register(REPORTES_MANIFEST_KEY, REPORTES_MANIFEST);
  registry.register(OPS_MOVIMIENTOS_MANIFEST_KEY, OPS_MOVIMIENTOS_MANIFEST);
  registry.register(OPS_BANKS_ACCOUNTS_MANIFEST_KEY, OPS_BANKS_ACCOUNTS_MANIFEST);
  registry.register(OPS_TRADES_MANIFEST_KEY, OPS_TRADES_MANIFEST);
  registry.register(OPS_PSP_CUENTAS_MANIFEST_KEY, OPS_PSP_CUENTAS_MANIFEST);
  registry.register(
    OPS_PSP_MOVIMIENTOS_MANIFEST_KEY,
    OPS_PSP_MOVIMIENTOS_MANIFEST,
  );
}
