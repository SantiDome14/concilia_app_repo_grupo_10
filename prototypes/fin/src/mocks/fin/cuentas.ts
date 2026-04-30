// ════════════════════════════════════════════════════════════════════
// Mock catalog · ops.catalogo_cuentas
// ────────────────────────────────────────────────────────────────────
// Bank and wallet accounts of every Sociedad in the group. Powers the
// `Asignar Banco y Cuenta` action's lookup, which filters by
// `sociedad_id` (catalog_filter `from_record: 'fin.sociedad_id'`), and
// the `Asignar Cuenta de Origen` action on the cola, which filters by
// `moneda` (catalog_filter `from_record: 'moneda'`).
//
// Source of truth: `prototypes/ops/ops-acciones-prototype.html` `CAT`
// constant (the OPS module owns the Sociedad → Estructura → Cuenta
// hierarchy). The OPS catalog covers Circuit Pay SA + Haz Pagos SA
// in full; Ardua Solutions Corp + Astra Ventures get a short stub so
// the existing FIN seed data (movimientos referencing Bridge/Convera/
// BMO/Bind/BitGo accounts) keeps resolving to a valid catalog entry.
// ════════════════════════════════════════════════════════════════════

import type { CuentaBancaria, Moneda } from '@/types/fin';

interface OpsCatRow {
  sociedad_id: string;
  estructura: string;
  rows: string[];
}

// ─── Source: OPS CAT (verbatim from ops-acciones-prototype.html line 743) ──
const OPS_CAT: OpsCatRow[] = [
  // Circuit Pay SA
  { sociedad_id: 'cp', estructura: 'ADCAP', rows: ['ARS · Cta 216216', 'USD cable · Cta 216216', 'USD · Cta 250761'] },
  { sociedad_id: 'cp', estructura: 'ALLARIA', rows: ['ARS · Cta 303682'] },
  { sociedad_id: 'cp', estructura: 'BINANCE', rows: ['ARS', 'USD'] },
  { sociedad_id: 'cp', estructura: 'BIND', rows: ['ARS · Cta 3990180/1', 'USD · Cta 3990180/2', 'ARS · Cta 3990180/3'] },
  { sociedad_id: 'cp', estructura: 'BITGO', rows: ['ARS', 'USD'] },
  { sociedad_id: 'cp', estructura: 'BITSO', rows: ['ARS', 'USD'] },
  { sociedad_id: 'cp', estructura: 'BRIDGE', rows: ['USD'] },
  { sociedad_id: 'cp', estructura: 'BRUBANK', rows: ['ARS · Cta 2504665352001', 'USD · Cta 2604665352002'] },
  { sociedad_id: 'cp', estructura: 'BULL MARKET', rows: ['ARS · Cta 901731', 'USD · Cta 901731'] },
  { sociedad_id: 'cp', estructura: 'CENTAURUS', rows: ['ARS · Cta 11385', 'USD MEP · Cta 11385', 'USD cable · Cta 11385'] },
  { sociedad_id: 'cp', estructura: 'COHEN', rows: ['ARS · Cta 106656', 'USD cable · Cta 106656'] },
  { sociedad_id: 'cp', estructura: 'COINAG', rows: ['ARS · Cta 10.045', 'ARS · Cta 10.046', 'USD · Cta 10.047', 'USD · Cta 10.048'] },
  { sociedad_id: 'cp', estructura: 'COINBASE', rows: ['ARS', 'USD'] },
  { sociedad_id: 'cp', estructura: 'COMERCIO', rows: ['ARS · Cta 356754', 'USD · Cta 356754'] },
  { sociedad_id: 'cp', estructura: 'CONO SUR', rows: ['ARS · Cta 5911', 'USD cable · Cta 5911'] },
  { sociedad_id: 'cp', estructura: 'CUCCHIARA', rows: ['ARS · Cta 3400', 'USD · Cta 3925'] },
  { sociedad_id: 'cp', estructura: 'FV BANK', rows: ['USD · Cta 780001002640'] },
  { sociedad_id: 'cp', estructura: 'INVIU', rows: ['ARS · Cta 229468', 'USD cable · Cta 871'] },
  { sociedad_id: 'cp', estructura: 'IVSA', rows: ['ARS · Cta 5708', 'USD cable · Cta 5708', 'USD MEP · Cta 5708'] },
  { sociedad_id: 'cp', estructura: 'KRAKEN', rows: ['USD'] },
  { sociedad_id: 'cp', estructura: 'LYNX', rows: ['ARS · Cta 2829', 'USD · Cta 2829'] },
  { sociedad_id: 'cp', estructura: 'PERC', rows: ['USD', 'ARS'] },
  { sociedad_id: 'cp', estructura: 'STRATO', rows: ['USD · Cta 6.052'] },
  // Haz Pagos SA
  { sociedad_id: 'hp', estructura: 'ADCAP', rows: ['ARS · Cta 250788', 'USD bvi · Cta 250788', 'ARS · Cta 217487', 'USD cable · Cta 217487', 'USD MEP · Cta 217487'] },
  { sociedad_id: 'hp', estructura: 'BIND', rows: ['ARS · Cta 4403443/1', 'ARS · Cta 4403443/2', 'ARS · Cta 4403443/3', 'ARS · Cta 4403443/4'] },
  { sociedad_id: 'hp', estructura: 'BRUBANK', rows: ['ARS · Cta 2504679505001'] },
  { sociedad_id: 'hp', estructura: 'BULL MARKET', rows: ['ARS', 'USD cable'] },
  { sociedad_id: 'hp', estructura: 'CENTAURUS', rows: ['ARS · Cta 11332', 'USD cable · Cta 11332', 'USD CV7M · Cta 11332', 'USD MEP · Cta 11332'] },
  { sociedad_id: 'hp', estructura: 'COINAG', rows: ['ARS · Cta 10.049'] },
  { sociedad_id: 'hp', estructura: 'COMERCIO', rows: ['ARS · Cta 356744', 'ARS · Cta 356744'] },
  { sociedad_id: 'hp', estructura: 'MACRO', rows: ['ARS', 'USD'] },
  { sociedad_id: 'hp', estructura: 'REBA', rows: ['ARS · Cta 1607687/1'] },
];

// ─── Stub extensions for Ardua + Astra (the FIN seed references these
// accounts but the OPS CAT marks both sociedades as "(sin cuentas aún)").
// Kept short on purpose; expand when OPS publishes the official entries.
const STUB_EXTENSIONS: OpsCatRow[] = [
  { sociedad_id: 'asc', estructura: 'BRIDGE', rows: ['USD · Cta BR-7733'] },
  { sociedad_id: 'asc', estructura: 'CONVERA', rows: ['USD · Cta CV-1188'] },
  { sociedad_id: 'asc', estructura: 'BMO', rows: ['CAD · Cta BM-2200'] },
  { sociedad_id: 'av', estructura: 'BIND', rows: ['EUR · Cta BD-5566'] },
  { sociedad_id: 'av', estructura: 'BITGO', rows: ['USDC'] },
];

function slugify(estructura: string): string {
  return estructura.toLowerCase().replace(/\s+/g, '-');
}

function detectMoneda(raw: string): Moneda {
  const head = raw.split('·')[0]?.trim() ?? raw.trim();
  // OPS uses the same code with optional rail suffix (`USD cable`,
  // `USD MEP`, `USD bvi`, `USD CV7M`); collapse them to the base code.
  if (head.startsWith('USD')) return 'USD';
  if (head === 'USDC') return 'USDC';
  if (head === 'USDT') return 'USDT';
  if (head === 'EUR') return 'EUR';
  if (head === 'CAD') return 'CAD';
  if (head === 'ARS') return 'ARS';
  return head as Moneda;
}

function extractNumero(raw: string): string {
  const parts = raw.split('·').map((s) => s.trim());
  return parts[1] ?? '—';
}

function buildCuentas(rows: OpsCatRow[]): CuentaBancaria[] {
  const out: CuentaBancaria[] = [];
  for (const row of rows) {
    row.rows.forEach((raw, idx) => {
      const estSlug = slugify(row.estructura);
      out.push({
        id: `cu-${row.sociedad_id}-${estSlug}-${idx + 1}`,
        sociedad_id: row.sociedad_id,
        banco: row.estructura,
        numero: extractNumero(raw),
        moneda: detectMoneda(raw),
        label: `${row.estructura} · ${raw}`,
        label_short: raw,
      });
    });
  }
  return out;
}

export const CUENTAS: CuentaBancaria[] = [
  ...buildCuentas(OPS_CAT),
  ...buildCuentas(STUB_EXTENSIONS),
];

// ─── Convenience aliases used by the existing movimientos seeds. The
// seed predates the OPS CAT alignment; mapping the legacy short ids
// to canonical OPS-derived ids keeps the seeds working without a
// rewrite. New seeds SHOULD reference the full canonical id directly.
const ALIAS: Record<string, string> = {
  'cu-cp-bitgo-usdc': 'cu-cp-bitgo-2', // BITGO · USD (closest OPS match for USDC ledger)
  'cu-cp-bitgo-usdt': 'cu-cp-bitgo-1', // BITGO · ARS (placeholder — USDT not listed in OPS CAT)
  'cu-cp-bitso-usdt': 'cu-cp-bitso-1', // BITSO · ARS (placeholder)
  'cu-asc-bridge': 'cu-asc-bridge-1',
  'cu-asc-convera': 'cu-asc-convera-1',
  'cu-asc-bmo': 'cu-asc-bmo-1',
  'cu-hp-coinag-cbu': 'cu-hp-coinag-1', // first COINAG cuenta of Haz Pagos
  'cu-hp-cvu-pool': 'cu-hp-coinag-1', // Pool de CVUs lives off the same Coinag account in OPS CAT
  'cu-hp-brubank': 'cu-hp-brubank-1',
  'cu-hp-galicia': 'cu-hp-coinag-1', // OPS CAT lists no Galicia entry for Haz Pagos; remap to Coinag
  'cu-av-bind': 'cu-av-bind-1',
  'cu-av-bitgo-usdc': 'cu-av-bitgo-1',
};

/** Resolves a legacy or canonical cuenta id to a CuentaBancaria. */
export function resolveCuenta(id: string | null | undefined): CuentaBancaria | null {
  if (!id) return null;
  const canonical = ALIAS[id] ?? id;
  return CUENTAS.find((c) => c.id === canonical) ?? null;
}
