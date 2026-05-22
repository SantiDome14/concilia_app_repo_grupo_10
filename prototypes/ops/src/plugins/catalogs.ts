// ════════════════════════════════════════════════════════════════════
// catalogs plugin — lookup-field data sources for the manifest engine
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` after Pinia + Query are installed. Every `lookup`
// dialog field in an OPS manifest references a catalog id (e.g.
// `framework.sociedades`, `ops.estructuras_bancos`); without these
// registrations the dropdowns resolve to `[]` and the operator can't
// fill the form.
//
// Resolvers read from the live vue-query cache (`queryClient.
// getQueryData`) so newly-created Estructuras / Sociedades show up
// in the next dropdown open without a refetch.
// ════════════════════════════════════════════════════════════════════

import { registerCatalog } from '@/lib/manifest/catalog';
import { queryClient } from '@/plugins/query';
import { fetchSociedades, fetchEstructuras } from '@/api/modules/banksAccounts';
import type { Estructura, Sociedad } from '@/ops/banks-accounts/types';

const SOCIEDADES_KEY = ['ops', 'banks-accounts', 'sociedades'] as const;
const ESTRUCTURAS_KEY = ['ops', 'banks-accounts', 'estructuras'] as const;

export function setupCatalogs(): void {
  // framework.sociedades — every Sociedad active or not, used by the
  // Crear Cuenta dialog. Lazy: the first dropdown open triggers a
  // fetch; subsequent opens reuse the cached list.
  registerCatalog('framework.sociedades', () => {
    const cached = queryClient.getQueryData<Sociedad[]>(SOCIEDADES_KEY);
    if (!cached) {
      void queryClient.ensureQueryData({
        queryKey: SOCIEDADES_KEY,
        queryFn: fetchSociedades,
      });
      return [];
    }
    return cached
      .filter((s) => s.status === 'Activa')
      .map((s) => ({ value: s.id, label: s.name }));
  });

  // ops.estructuras_bancos — global registry of Bancos / Exchanges /
  // ALyCs / Custodios / PSPs. The Crear Cuenta dialog's `banco`
  // lookup reflects newly-added Estructuras created via the Crear
  // Estructura CTA after `useQueryClient().invalidateQueries(...)`.
  registerCatalog('ops.estructuras_bancos', () => {
    const cached = queryClient.getQueryData<Estructura[]>(ESTRUCTURAS_KEY);
    if (!cached) {
      void queryClient.ensureQueryData({
        queryKey: ESTRUCTURAS_KEY,
        queryFn: fetchEstructuras,
      });
      return [];
    }
    return cached
      .filter((e) => e.status === 'Activa')
      .map((e) => ({ value: e.id, label: `${e.name} · ${e.tipo}` }));
  });
}

/** Query keys re-exported so pages keep cache-write parity. */
export const CATALOG_QUERY_KEYS = {
  sociedades: SOCIEDADES_KEY,
  estructuras: ESTRUCTURAS_KEY,
} as const;
