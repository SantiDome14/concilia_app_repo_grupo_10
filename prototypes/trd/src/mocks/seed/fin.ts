// ════════════════════════════════════════════════════════════════════
// MSW seed — FIN Tesorería / Disponibilidades
// ────────────────────────────────────────────────────────────────────
// Mirrors the legacy fin-prototype.html constants:
//   posicionTree    — Posición jerárquica por sociedad
//   movimientos     — Ledger movements
//   cola            — Retiros pendientes de asignación
// Two derived catalogs (sociedades + monedas) and two KPI aggregates
// (posicion + movimientos) are exposed by helper getters that the
// handlers call to keep response shape stable across mutations.
// ════════════════════════════════════════════════════════════════════

import type {
  Moneda,
  MovimientoLedger,
  RetiroEnCola,
  SociedadPos,
} from '@/types/fin';
import type {
  CatalogEntry,
  MovimientosKpis,
  PosicionKpis,
} from '@/api/modules/fin';

// ────────────────────────────────────────────────────────────────────
// Sociedades + cuentas (Posición)
// ────────────────────────────────────────────────────────────────────

const initialPosTree: SociedadPos[] = [
  {
    id: 'hp',
    name: 'Haz Pagos',
    sub: 'PSP · Argentina · ARS',
    open: true,
    totals: [{ lbl: 'ARS', val: '1.017.930.500' }],
    cuentas: [
      { icon: 'bank', name: 'CBU Coinag',       det: '2850590940093...', saldo: '845.230.500', dr: '12.4B', cr: '11.5B', neta: '845.230.500', moneda: 'ARS' },
      { icon: 'bank', name: 'CVU Cliente Pool', det: 'Pool de CVUs',     saldo: '142.500.000', dr: '8.2B',  cr: '8.0B',  neta: '142.500.000', moneda: 'ARS' },
      { icon: 'bank', name: 'Cuenta Brubank',   det: 'cuenta x4521',     saldo: '8.200.000',   dr: '42M',   cr: '34M',   neta: '8.200.000',   moneda: 'ARS' },
      { icon: 'bank', name: 'Cuenta Galicia',   det: 'cuenta x7733',     saldo: '22.000.000',  dr: '58M',   cr: '36M',   neta: '22.000.000',  moneda: 'ARS' },
    ],
  },
  {
    id: 'cp',
    name: 'Circuit Pay',
    sub: 'PSAV · Argentina · USDC/USDT',
    open: false,
    totals: [
      { lbl: 'USDC', val: '3.200.000' },
      { lbl: 'USDT', val: '1.780.000' },
    ],
    cuentas: [
      { icon: 'wallet', name: 'Pool BitGo USDC', det: 'wallet 0xABC...', saldo: '3.200.000', dr: '18.4M', cr: '15.2M', neta: '3.200.000', moneda: 'USDC' },
      { icon: 'wallet', name: 'Pool BitGo USDT', det: 'wallet 0xDEF...', saldo: '1.500.000', dr: '9.1M',  cr: '7.6M',  neta: '1.500.000', moneda: 'USDT' },
      { icon: 'wallet', name: 'Pool Bitso USDT', det: 'wallet 0x789...', saldo: '280.000',   dr: '1.4M',  cr: '1.1M',  neta: '280.000',   moneda: 'USDT' },
    ],
  },
  {
    id: 'asc',
    name: 'Ardua Solutions Corp',
    sub: 'MSB · Canadá · USD/CAD/USDC',
    open: false,
    totals: [
      { lbl: 'USD', val: '11.450.000' },
      { lbl: 'CAD', val: '1.200.000' },
      { lbl: 'USDC', val: '1.000.000' },
    ],
    cuentas: [
      { icon: 'bank',   name: 'Bridge USD',           det: 'cuenta xx-9821', saldo: '8.450.000', dr: '42.1M', cr: '33.6M', neta: '8.450.000', moneda: 'USD' },
      { icon: 'bank',   name: 'Convera USD',          det: 'cuenta xx-3344', saldo: '3.000.000', dr: '9.4M',  cr: '6.4M',  neta: '3.000.000', moneda: 'USD' },
      { icon: 'bank',   name: 'BMO CAD',              det: 'account xx-1122',saldo: '1.200.000', dr: '2.8M',  cr: '1.6M',  neta: '1.200.000', moneda: 'CAD' },
      { icon: 'wallet', name: 'Coinbase USDC',        det: 'wallet 0xCBA...',saldo: '980.000',   dr: '4.2M',  cr: '3.2M',  neta: '980.000',   moneda: 'USDC' },
      { icon: 'wallet', name: 'Cuenta Operativa USDC',det: 'wallet 0xOPS...',saldo: '20.000',    dr: '80K',   cr: '60K',   neta: '20.000',    moneda: 'USDC' },
    ],
  },
  {
    id: 'astra',
    name: 'Astra Ventures',
    sub: 'VASP · Polonia · EUR/USDC',
    open: false,
    totals: [
      { lbl: 'EUR', val: '1.820.000' },
      { lbl: 'USDC', val: '580.000' },
    ],
    cuentas: [
      { icon: 'bank',   name: 'Bind EUR',                 det: 'cuenta xx-5566', saldo: '1.820.000', dr: '4.2M', cr: '2.4M', neta: '1.820.000', moneda: 'EUR' },
      { icon: 'wallet', name: 'Pool BitGo USDC (Astra)',  det: 'wallet 0xAST...',saldo: '580.000',   dr: '2.1M', cr: '1.5M', neta: '580.000',   moneda: 'USDC' },
    ],
  },
];

// ────────────────────────────────────────────────────────────────────
// Ledger movements (Tab "Movimientos")
// ────────────────────────────────────────────────────────────────────

const initialMovs: MovimientoLedger[] = [
  { id: 'TM-58420', fecha: '2026-04-24 18:42', tipo: 'COLLECTOR_IN',  cuenta: 'CBU Coinag',       monto: '+ 18.500.000', moneda: 'ARS',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58419', fecha: '2026-04-24 17:55', tipo: 'WITHDRAWAL',    cuenta: 'Pool BitGo USDC',  monto: '- 250.000',    moneda: 'USDC', origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58418', fecha: '2026-04-24 16:30', tipo: 'DEPOSIT',       cuenta: 'Bridge USD',       monto: '+ 180.000',    moneda: 'USD',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58417', fecha: '2026-04-24 14:20', tipo: 'WITHDRAWAL',    cuenta: 'Pool BitGo USDT',  monto: '- 95.000',     moneda: 'USDT', origen: 'OPS',   estado: 'COLA' },
  { id: 'TM-58416', fecha: '2026-04-24 13:08', tipo: 'ADDITION',      cuenta: 'Bridge USD',       monto: '+ 25.000',     moneda: 'USD',  origen: 'MAN',   estado: 'PEND' },
  { id: 'TM-58415', fecha: '2026-04-24 11:45', tipo: 'SWAP_OUT',      cuenta: 'Pool BitGo USDT',  monto: '- 420.000',    moneda: 'USDT', origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58414', fecha: '2026-04-24 11:45', tipo: 'SWAP_IN',       cuenta: 'Pool BitGo USDC',  monto: '+ 419.580',    moneda: 'USDC', origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58413', fecha: '2026-04-24 10:12', tipo: 'FEE',           cuenta: 'CBU Coinag',       monto: '- 12.500',     moneda: 'ARS',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58412', fecha: '2026-04-24 09:30', tipo: 'TRANSFER_IN',   cuenta: 'Convera USD',      monto: '+ 250.000',    moneda: 'USD',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58411', fecha: '2026-04-24 09:30', tipo: 'TRANSFER_OUT',  cuenta: 'Bridge USD',       monto: '- 250.000',    moneda: 'USD',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58410', fecha: '2026-04-23 19:08', tipo: 'COLLECTOR_OUT', cuenta: 'CBU Coinag',       monto: '- 9.200.000',  moneda: 'ARS',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58409', fecha: '2026-04-23 17:22', tipo: 'FEE',           cuenta: 'CBU Coinag',       monto: '- 450.000',    moneda: 'ARS',  origen: 'MANOK', estado: 'CONF' },
  { id: 'TM-58408', fecha: '2026-04-23 15:40', tipo: 'DEPOSIT',       cuenta: 'Bind EUR',         monto: '+ 95.000',     moneda: 'EUR',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58407', fecha: '2026-04-23 12:18', tipo: 'TAX',           cuenta: 'CVU Cliente Pool', monto: '- 145.000',    moneda: 'ARS',  origen: 'OPS',   estado: 'CONF' },
  { id: 'TM-58406', fecha: '2026-04-23 11:00', tipo: 'WITHDRAWAL',    cuenta: 'Cuenta Brubank',   monto: '- 4.200.000',  moneda: 'ARS',  origen: 'OPS',   estado: 'CONF' },
];

// ────────────────────────────────────────────────────────────────────
// Cola de Asignación (Tab "Cola de Asignación")
// ────────────────────────────────────────────────────────────────────

const initialCola: RetiroEnCola[] = [
  { id: 'M-2026-12815', fecha: '2026-04-24 14:20', cliente: 'Inversiones Norte',    monto: '95.000',  moneda: 'USDT', tiempo: '4 hs 22 min', cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12818', fecha: '2026-04-24 16:05', cliente: 'Capital Plus',         monto: '180.000', moneda: 'USDC', tiempo: '2 hs 37 min', cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12820', fecha: '2026-04-24 17:12', cliente: 'ACME Corp',            monto: '42.000',  moneda: 'USD',  tiempo: '1 hs 30 min', cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12822', fecha: '2026-04-24 17:48', cliente: 'Tecno SA',             monto: '120.000', moneda: 'USDC', tiempo: '54 min',      cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12823', fecha: '2026-04-24 18:01', cliente: 'Mendoza Trading',      monto: '68.000',  moneda: 'USDT', tiempo: '41 min',      cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12824', fecha: '2026-04-24 18:08', cliente: 'Patagonia FX',         monto: '25.000',  moneda: 'USD',  tiempo: '34 min',      cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12825', fecha: '2026-04-24 18:18', cliente: 'Andes Capital',        monto: '310.000', moneda: 'USDC', tiempo: '24 min',      cuenta_id: null, asignacion_note: null },
  { id: 'M-2026-12826', fecha: '2026-04-24 18:32', cliente: 'Costa Atlántica SRL',  monto: '52.000',  moneda: 'USDT', tiempo: '10 min',      cuenta_id: null, asignacion_note: null },
];

// ────────────────────────────────────────────────────────────────────
// Mutable seeds + derived helpers
// ────────────────────────────────────────────────────────────────────

export let posicionTreeSeed: SociedadPos[] = initialPosTree.map((s) => ({
  ...s,
  cuentas: s.cuentas.map((c) => ({ ...c })),
  totals: s.totals.map((t) => ({ ...t })),
}));
export let movimientosSeed: MovimientoLedger[] = initialMovs.map((m) => ({ ...m }));
export let colaSeed: RetiroEnCola[] = initialCola.map((c) => ({ ...c }));

export function resetFinSeed(): void {
  posicionTreeSeed = initialPosTree.map((s) => ({
    ...s,
    cuentas: s.cuentas.map((c) => ({ ...c })),
    totals: s.totals.map((t) => ({ ...t })),
  }));
  movimientosSeed = initialMovs.map((m) => ({ ...m }));
  colaSeed = initialCola.map((c) => ({ ...c }));
}

/** Derived from the current `posicionTreeSeed`. */
export function getSociedadesCatalog(): CatalogEntry[] {
  return posicionTreeSeed.map((s) => ({ value: s.id, label: s.name }));
}

/** Derived from the current `posicionTreeSeed`. */
export function getMonedasCatalog(): Moneda[] {
  return Array.from(
    new Set(posicionTreeSeed.flatMap((s) => s.cuentas.map((c) => c.moneda))),
  ).sort();
}

/** Static aggregates plus tree-derived counts. */
export function getPosicionKpisSnapshot(): PosicionKpis {
  return {
    posicionConsolidada: 'USD 28.4M',
    liquidezDisponible: 'USD 24.1M',
    comprometido: 'USD 4.3M',
    cuentasActivas: posicionTreeSeed.reduce((acc, s) => acc + s.cuentas.length, 0),
    sociedadesActivas: posicionTreeSeed.length,
  };
}

export function getMovimientosKpisSnapshot(): MovimientosKpis {
  return {
    movimientosHoy: 124,
    volumenIngresado: 'USD 1.2M',
    volumenEgresado: 'USD 980K',
    enCola: colaSeed.length,
  };
}
