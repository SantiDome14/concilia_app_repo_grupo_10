// ════════════════════════════════════════════════════════════════════
// Mock catalog · fin.estructuras_bancos
// ────────────────────────────────────────────────────────────────────
// Registry of Bancos / Estructuras (Banco / Banco digital / ALyC /
// Exchange / Custodio / PSP / Proveedor) per REQ-42 §8.1. Consumed by:
//   - The `banco` lookup field of the Crear Cuenta dialog.
//   - The Crear nuevo Banco/Estructura Secondary CTA (which appends).
//
// Per Decision 1 of `extend-fin-disponibilidades-bancos-cuentas-crud`,
// Estructuras are global — every Estructura is available to every
// Sociedad. The lookup MUST NOT be filtered by Sociedad.
// ════════════════════════════════════════════════════════════════════

import type { EstructuraBanco, EstructuraTipo } from '@/types/fin';

// Seed list aligned to the `banco` values currently present in
// `cuentas.ts` (OPS CAT) so the existing Cuenta records resolve to a
// valid Estructura on day one.
const ESTRUCTURA_TIPO_BY_NOMBRE: Record<string, EstructuraTipo> = {
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

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-');
}

export const ESTRUCTURAS_BANCOS: EstructuraBanco[] = Object.entries(
  ESTRUCTURA_TIPO_BY_NOMBRE,
).map(([nombre, tipo_estructura]) => ({
  id: `est-${slugify(nombre)}`,
  nombre,
  tipo_estructura,
}));
