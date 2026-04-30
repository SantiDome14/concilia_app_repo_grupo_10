// ════════════════════════════════════════════════════════════════════
// catalogs plugin — registers lookup-field data sources
// ────────────────────────────────────────────────────────────────────
// Wired in `main.ts` AFTER Pinia. Every `lookup` dialog field in a
// FIN manifest references a catalog id (e.g. `framework.sociedades`,
// `ops.catalogo_cuentas`); without these registrations the dropdowns
// resolve to `[]` and the user can't fill imputation forms.
//
// Resolvers receive whatever `catalog_filter` resolves to from the
// dialog state. When the filter is null/undefined/'', the engine
// returns `[]` BEFORE invoking the resolver (per Requirement 10), so
// resolvers MAY assume a non-empty filter when called.
// ════════════════════════════════════════════════════════════════════

import { registerCatalog } from '@/lib/manifest/catalog';
import { SOCIEDADES } from '@/mocks/fin/sociedades';
import { CUENTAS } from '@/mocks/fin/cuentas';
import { CLIENTES } from '@/mocks/fin/clientes';
import {
  PROVEEDORES,
  PARTNERS,
  BANCOS_EXCHANGES,
} from '@/mocks/fin/contrapartes';

export function setupCatalogs(): void {
  // framework.sociedades — no filter; lists every group entity.
  registerCatalog('framework.sociedades', () =>
    SOCIEDADES.map((s) => ({ value: s.id, label: s.nombre })),
  );

  // fin.estructuras — list of distinct (sociedad, estructura) pairs
  // for the chosen sociedad. Returns `value: 'sociedad_id:ESTRUCTURA'`
  // (compound key) so the downstream cuenta lookup can decode both
  // halves from a single `from_form` reference.
  registerCatalog('fin.estructuras', (filter) => {
    if (typeof filter !== 'string') return [];
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    for (const c of CUENTAS) {
      if (c.sociedad_id !== filter) continue;
      if (seen.has(c.banco)) continue;
      seen.add(c.banco);
      out.push({ value: `${filter}:${c.banco}`, label: c.banco });
    }
    return out;
  });

  // ops.catalogo_cuentas — filter shapes:
  //   - 'sociedad_id:ESTRUCTURA' (compound)  → fin.movimientos cascade
  //   - 'sociedad_id'                        → legacy unfiltered cascade
  //   - 'ARS' / 'USD' / etc.                 → fin.tesoreria.cola_asignacion
  registerCatalog('ops.catalogo_cuentas', (filter) => {
    if (typeof filter !== 'string') return [];
    if (filter.includes(':')) {
      const [sociedadId, estructura] = filter.split(':');
      const filtered = CUENTAS.filter(
        (c) => c.sociedad_id === sociedadId && c.banco === estructura,
      );
      return filtered.map((c) => ({ value: c.id, label: c.label_short }));
    }
    const isMoneda = /^[A-Z]{3,4}$/.test(filter);
    const filtered = isMoneda
      ? CUENTAS.filter((c) => c.moneda === filter)
      : CUENTAS.filter((c) => c.sociedad_id === filter);
    return filtered.map((c) => ({ value: c.id, label: c.label }));
  });

  // clp.clientes — full client list. `_filter` is a free-text search
  // string passed by the dropdown when the user types; when empty the
  // engine never invokes us (per Requirement 10), so we surface the
  // full catalog as a starting list.
  registerCatalog('clp.clientes', () =>
    CLIENTES.map((c) => ({
      value: c.id,
      label: c.cuit ? `${c.nombre} · ${c.cuit}` : c.nombre,
    })),
  );

  registerCatalog('fin.proveedores', () =>
    PROVEEDORES.map((p) => ({ value: p.id, label: p.nombre })),
  );

  registerCatalog('fin.partners', () =>
    PARTNERS.map((p) => ({ value: p.id, label: p.nombre })),
  );

  registerCatalog('framework.bancos_exchanges', () =>
    BANCOS_EXCHANGES.map((b) => ({ value: b.id, label: b.nombre })),
  );
}
