// ════════════════════════════════════════════════════════════════════
// MSW seed — banks-accounts (ops-banks-accounts capability)
// ────────────────────────────────────────────────────────────────────
// OPS Bancos / Cuentas is a brand-new module that shares its catalog
// universe with the FIN Disponibilidades sub-tab. The reference data
// here is adapted from `prototypes/fin/src/mocks/fin/{sociedades,
// estructuras_bancos, cuentas}.ts`, restricted to the OPS `moneda`
// enum (`ARS | USD | USDC | USDT | BTC`) and reshaped to the OPS
// `Sociedad / Estructura / BankAccountRecord` types — sociedad and
// estructura are surfaced as display strings (not refs) per
// `ops-banks-accounts/types.ts`.
//
// Currencies outside the OPS enum (EUR on Astra · Bind, CAD on ASC ·
// BMO) are dropped on import; if/when OPS broadens its enum they can
// be re-added by re-running this seed against the FIN catalog.
// ════════════════════════════════════════════════════════════════════

import type {
  BankAccountRecord,
  Estructura,
  EstructuraTipo,
  Sociedad,
} from '@/ops/banks-accounts/types';

// ─── Sociedades (Ardua group entities) ──────────────────────────────

const initialSociedades: Sociedad[] = [
  { id: 'soc-cp', name: 'Circuit Pay SA', status: 'Activa' },
  { id: 'soc-hp', name: 'Haz Pagos SA', status: 'Activa' },
  { id: 'soc-asc', name: 'Ardua Solutions Corp', status: 'Activa' },
  { id: 'soc-av', name: 'Astra Ventures', status: 'Activa' },
];

// ─── Estructuras (banks / exchanges / custodios / etc.) ─────────────
// Keyed by display name so the cuentas seed can resolve tipo without
// duplicating the mapping. Tipos pulled from FIN's
// `estructuras_bancos.ts` mapping (REQ-42 §8.1).

const ESTRUCTURA_TIPO: Record<string, EstructuraTipo> = {
  ADCAP: 'ALyC',
  ALLARIA: 'ALyC',
  BINANCE: 'Exchange',
  BIND: 'Banco',
  BITGO: 'Custodio',
  BITSO: 'Exchange',
  BRIDGE: 'Proveedor',
  BRUBANK: 'Banco digital',
  'BULL MARKET': 'ALyC',
  CENTAURUS: 'ALyC',
  COHEN: 'ALyC',
  COINAG: 'Banco',
  COINBASE: 'Exchange',
  COMERCIO: 'Banco',
  'CONO SUR': 'ALyC',
  CUCCHIARA: 'ALyC',
  'FV BANK': 'Banco',
  INVIU: 'ALyC',
  IVSA: 'ALyC',
  KRAKEN: 'Exchange',
  LYNX: 'ALyC',
  PERC: 'ALyC',
  STRATO: 'ALyC',
  MACRO: 'Banco',
  REBA: 'Banco digital',
  CONVERA: 'Proveedor',
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}

const initialEstructuras: Estructura[] = Object.entries(ESTRUCTURA_TIPO).map(
  ([name, tipo]) => ({
    id: `est-${slugify(name)}`,
    name,
    tipo,
    status: 'Activa' as const,
  }),
);

// ─── Cuentas — derived from FIN's OPS_CAT + STUB_EXTENSIONS ─────────

type Moneda = BankAccountRecord['moneda'];
type TipoCuenta = BankAccountRecord['tipoCuenta'];

interface RawRow {
  sociedadName: string;
  estructura: string;
  rows: string[];
}

const RAW_ROWS: RawRow[] = [
  // Circuit Pay SA
  { sociedadName: 'Circuit Pay SA', estructura: 'ADCAP', rows: ['ARS · Cta 216216', 'USD cable · Cta 216216', 'USD · Cta 250761'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'ALLARIA', rows: ['ARS · Cta 303682'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BINANCE', rows: ['ARS', 'USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BIND', rows: ['ARS · Cta 3990180/1', 'USD · Cta 3990180/2', 'ARS · Cta 3990180/3'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BITGO', rows: ['ARS', 'USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BITSO', rows: ['ARS', 'USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BRIDGE', rows: ['USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BRUBANK', rows: ['ARS · Cta 2504665352001', 'USD · Cta 2604665352002'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'BULL MARKET', rows: ['ARS · Cta 901731', 'USD · Cta 901731'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'CENTAURUS', rows: ['ARS · Cta 11385', 'USD MEP · Cta 11385', 'USD cable · Cta 11385'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'COHEN', rows: ['ARS · Cta 106656', 'USD cable · Cta 106656'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'COINAG', rows: ['ARS · Cta 10.045', 'ARS · Cta 10.046', 'USD · Cta 10.047', 'USD · Cta 10.048'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'COINBASE', rows: ['ARS', 'USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'COMERCIO', rows: ['ARS · Cta 356754', 'USD · Cta 356754'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'CONO SUR', rows: ['ARS · Cta 5911', 'USD cable · Cta 5911'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'CUCCHIARA', rows: ['ARS · Cta 3400', 'USD · Cta 3925'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'FV BANK', rows: ['USD · Cta 780001002640'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'INVIU', rows: ['ARS · Cta 229468', 'USD cable · Cta 871'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'IVSA', rows: ['ARS · Cta 5708', 'USD cable · Cta 5708', 'USD MEP · Cta 5708'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'KRAKEN', rows: ['USD'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'LYNX', rows: ['ARS · Cta 2829', 'USD · Cta 2829'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'PERC', rows: ['USD', 'ARS'] },
  { sociedadName: 'Circuit Pay SA', estructura: 'STRATO', rows: ['USD · Cta 6.052'] },
  // Haz Pagos SA
  { sociedadName: 'Haz Pagos SA', estructura: 'ADCAP', rows: ['ARS · Cta 250788', 'USD bvi · Cta 250788', 'ARS · Cta 217487', 'USD cable · Cta 217487', 'USD MEP · Cta 217487'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'BIND', rows: ['ARS · Cta 4403443/1', 'ARS · Cta 4403443/2', 'ARS · Cta 4403443/3', 'ARS · Cta 4403443/4'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'BRUBANK', rows: ['ARS · Cta 2504679505001'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'BULL MARKET', rows: ['ARS', 'USD cable'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'CENTAURUS', rows: ['ARS · Cta 11332', 'USD cable · Cta 11332', 'USD CV7M · Cta 11332', 'USD MEP · Cta 11332'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'COINAG', rows: ['ARS · Cta 10.049'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'COMERCIO', rows: ['ARS · Cta 356744', 'ARS · Cta 356744'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'MACRO', rows: ['ARS', 'USD'] },
  { sociedadName: 'Haz Pagos SA', estructura: 'REBA', rows: ['ARS · Cta 1607687/1'] },
  // Ardua Solutions Corp (stub — OPS catalog marks "(sin cuentas aún)")
  { sociedadName: 'Ardua Solutions Corp', estructura: 'BRIDGE', rows: ['USD · Cta BR-7733'] },
  { sociedadName: 'Ardua Solutions Corp', estructura: 'CONVERA', rows: ['USD · Cta CV-1188'] },
  // Astra Ventures
  { sociedadName: 'Astra Ventures', estructura: 'BITGO', rows: ['USDC'] },
];

function detectMoneda(raw: string): Moneda | null {
  const head = raw.split('·')[0]?.trim() ?? raw.trim();
  if (head.startsWith('USD')) return 'USD';
  if (head === 'USDC') return 'USDC';
  if (head === 'USDT') return 'USDT';
  if (head === 'BTC') return 'BTC';
  if (head === 'ARS') return 'ARS';
  // EUR / CAD / unsupported codes — drop from the OPS catalog.
  return null;
}

function detectTipoCuenta(estructura: string, numero: string): TipoCuenta {
  const tipo = ESTRUCTURA_TIPO[estructura];
  if (tipo === 'Exchange') return 'Exchange Account';
  if (tipo === 'Custodio') return 'Wallet Pool';
  if (tipo === 'ALyC') return 'Comitente';
  // Banco / Banco digital / PSP / Proveedor → CVU when the number looks
  // like a long digit string (legacy CBU/CVU shape); else Cuenta Corriente.
  if (numero.length >= 18 && /^\d+$/.test(numero)) return 'CVU';
  return 'Cuenta Corriente';
}

function extractNumero(raw: string): string {
  const parts = raw.split('·').map((s) => s.trim());
  // `parts[1]` keeps the "Cta XXX" prefix on accounts whose source uses
  // it; bare-currency rows (e.g. "ARS", "USD") fall back to a dash so
  // the table cell stays visually consistent with the QA instance.
  if (parts[1]) return parts[1].replace(/^Cta\s+/, '');
  return '—';
}

function buildCuentas(rows: RawRow[]): BankAccountRecord[] {
  const out: BankAccountRecord[] = [];
  let estructuraIdx = 0;
  for (const row of rows) {
    estructuraIdx++;
    const sociedadName = row.sociedadName;
    row.rows.forEach((raw, idx) => {
      const moneda = detectMoneda(raw);
      if (moneda === null) return; // skip currencies outside OPS enum
      const numero = extractNumero(raw);
      const tipoCuenta = detectTipoCuenta(row.estructura, numero);
      const estructuraTipo = ESTRUCTURA_TIPO[row.estructura] ?? 'Banco';
      // First account of every estructura is Inactiva so the table has
      // visible coverage of both states out of the box.
      const status: BankAccountRecord['status'] =
        estructuraIdx === 1 && idx === 0 ? 'Inactiva' : 'Activa';
      out.push({
        id: `cu-${slugify(sociedadName)}-${slugify(row.estructura)}-${idx + 1}`,
        sociedad: sociedadName,
        estructura: row.estructura,
        estructuraTipo,
        tipoCuenta,
        moneda,
        nro: numero,
        cuentaPadreLabel: null,
        padreCuentaId: null,
        status,
      });
    });
  }
  return out;
}

const initialCuentas: BankAccountRecord[] = buildCuentas(RAW_ROWS);

export const sociedadesSeed: Sociedad[] = initialSociedades.map((s) => ({ ...s }));
export const estructurasSeed: Estructura[] = initialEstructuras.map((e) => ({ ...e }));
export const banksAccountsSeed: BankAccountRecord[] = initialCuentas.map((c) => ({ ...c }));

export function resetBanksAccountsSeed(): void {
  sociedadesSeed.length = 0;
  sociedadesSeed.push(...initialSociedades.map((s) => ({ ...s })));
  estructurasSeed.length = 0;
  estructurasSeed.push(...initialEstructuras.map((e) => ({ ...e })));
  banksAccountsSeed.length = 0;
  banksAccountsSeed.push(...initialCuentas.map((c) => ({ ...c })));
}
