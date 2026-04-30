// ════════════════════════════════════════════════════════════════════
// Mock catalogs · fin.proveedores, fin.partners, framework.bancos_exchanges
// ────────────────────────────────────────────────────────────────────
// Lookup sources for the Asignar Proveedor (FEE), Asignar Partner
// (REBATE), and Asignar Banco / Exchange (TAX) actions. Synthesized
// from the partners + providers referenced in the movimientos seed.
// ════════════════════════════════════════════════════════════════════

export interface Proveedor {
  id: string;
  nombre: string;
}

export interface Partner {
  id: string;
  nombre: string;
}

export interface BancoExchange {
  id: string;
  nombre: string;
}

export const PROVEEDORES: Proveedor[] = [
  { id: 'prov-coinag', nombre: 'Coinag' },
  { id: 'prov-brubank', nombre: 'Brubank' },
  { id: 'prov-galicia', nombre: 'Banco Galicia' },
  { id: 'prov-bind', nombre: 'Banco Bind' },
  { id: 'prov-bridge', nombre: 'Bridge' },
  { id: 'prov-convera', nombre: 'Convera' },
  { id: 'prov-bmo', nombre: 'BMO' },
  { id: 'prov-bitso', nombre: 'Bitso' },
];

export const PARTNERS: Partner[] = [
  { id: 'partner-bitgo', nombre: 'BitGo' },
  { id: 'partner-bitso', nombre: 'Bitso' },
  { id: 'partner-coinag', nombre: 'Coinag' },
];

export const BANCOS_EXCHANGES: BancoExchange[] = [
  { id: 'bex-coinag', nombre: 'Coinag' },
  { id: 'bex-brubank', nombre: 'Brubank' },
  { id: 'bex-galicia', nombre: 'Banco Galicia' },
  { id: 'bex-bridge', nombre: 'Bridge' },
  { id: 'bex-convera', nombre: 'Convera' },
  { id: 'bex-bmo', nombre: 'BMO' },
  { id: 'bex-bitgo', nombre: 'BitGo' },
  { id: 'bex-bitso', nombre: 'Bitso' },
  { id: 'bex-afip', nombre: 'AFIP' },
];
