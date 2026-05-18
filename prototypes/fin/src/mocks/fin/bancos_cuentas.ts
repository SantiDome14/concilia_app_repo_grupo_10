// ════════════════════════════════════════════════════════════════════
// Mock catalog · fin.bancos_cuentas
// ────────────────────────────────────────────────────────────────────
// FIN-lens view of the REQ-42 §8.1 Bancos/Cuentas catalogue. Reuses
// `CUENTAS` (canonical id mapping inherited from `cuentas.ts`) and
// extends each entry with the columns the FIN sub-tab cares about:
//   - `tipo_estructura` (REQ-42 §8.1)
//   - `tipo_cuenta` (REQ-42 §8.1)
//   - `estado` (Activa / Inactiva)
//   - `cuenta_contable` — `null` means "Sin configurar"
//
// Per Decision 2 of `add-fin-disponibilidades` design.md, this mock is
// independent from any future `ops.bancos_cuentas.ts`. No vendoring.
// ════════════════════════════════════════════════════════════════════

import { CUENTAS } from './cuentas';
import type {
  CuentaBanco,
  CuentaEstado,
  CuentaTipo,
  EstructuraTipo,
} from '@/types/fin';

// Per-bank classification → tipo_estructura mapping.
const ESTRUCTURA_TIPO_BY_BANCO: Record<string, EstructuraTipo> = {
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
  BMO: 'Banco',
};

function deriveTipoEstructura(banco: string): EstructuraTipo {
  return ESTRUCTURA_TIPO_BY_BANCO[banco] ?? 'Banco';
}

function deriveTipoCuenta(numero: string, banco: string): CuentaTipo {
  const tipoEst = deriveTipoEstructura(banco);
  if (tipoEst === 'Exchange') return 'Exchange Account';
  if (tipoEst === 'Custodio') return 'Wallet Pool';
  if (tipoEst === 'ALyC') return 'Comitente';
  if (numero.startsWith('CBU') || numero.length >= 22) return 'CBU';
  return 'Cuenta Corriente';
}

// Mix of Activa / Inactiva to test the "Inactiva excluidas de Posición"
// rule of REQ-50 §3.3. The first cuenta of each banco is Inactiva for
// test variety; the rest are Activa.
function deriveEstado(idx: number): CuentaEstado {
  return idx === 0 ? 'Inactiva' : 'Activa';
}

// Mix of configured / null cuenta_contable to test the "Sin configurar"
// badge and the Configuración contable filter. Pattern: every 3rd
// account gets configured metadata; the rest are null.
function deriveCuentaContable(idx: number, label: string): string | null {
  return idx % 3 === 0
    ? `Contable · ${label.split('·')[0]?.trim() ?? label}`
    : null;
}

// Build the FIN catalogue from the canonical CUENTAS list.
export const CATALOGO_CUENTAS: CuentaBanco[] = CUENTAS.map((c, idx) => ({
  ...c,
  tipo_estructura: deriveTipoEstructura(c.banco),
  tipo_cuenta: deriveTipoCuenta(c.numero, c.banco),
  estado: deriveEstado(idx),
  cuenta_contable: deriveCuentaContable(idx, c.label),
}));

/** Active accounts only — used by Posición and by lookups. */
export const CATALOGO_CUENTAS_ACTIVAS: CuentaBanco[] =
  CATALOGO_CUENTAS.filter((c) => c.estado === 'Activa');

// ────────────────────────────────────────────────────────────────────
// KPIs (Bancos / Cuentas sub-tab L2)
// ────────────────────────────────────────────────────────────────────

export interface BancosCuentasKpis {
  estructurasTotales: number;
  cuentasActivas: number;
  cuentasConfiguradas: number;
  cuentasSinConfigurar: number;
}

export const BANCOS_CUENTAS_KPIS: BancosCuentasKpis = {
  estructurasTotales: new Set(CATALOGO_CUENTAS.map((c) => c.banco)).size,
  cuentasActivas: CATALOGO_CUENTAS_ACTIVAS.length,
  cuentasConfiguradas: CATALOGO_CUENTAS.filter(
    (c) => c.cuenta_contable !== null,
  ).length,
  cuentasSinConfigurar: CATALOGO_CUENTAS.filter(
    (c) => c.cuenta_contable === null,
  ).length,
};
