// ════════════════════════════════════════════════════════════════════
// Mock dataset · `movimiento` records (FIN.Disponibilidades.Movimientos)
// ────────────────────────────────────────────────────────────────────
// Per `align-fin-disponibilidades-to-omnibus-model`, the ledger covers
// every tipo of the 18-row matriz with at least one representative
// record. Multi-record events:
//
//   - `PRESTAMO_INTERCOMPANY` and `SWEEPING_CROSS_SOCIEDAD` are TWO
//     distinct records per event sharing `evento_id`, each with its own
//     `asiento_id` and `fin.sociedad_id`.
//   - `SWAP_OUT` + `SWAP_IN` + `SPREAD` form a TRIPLE from a single
//     ejecución, sharing `evento_id`.
//
// AS00000 cleanup: every record in categoría C / D / E carries
// `cliente_id: null` (no synthetic placeholder).
//
// Supervision removed in V1 — el área valida los flujos primero y la
// supervisión podrá reintroducirse via capabilities en un cambio futuro.
//
// Pending types removed — los simuladores SOLICITUD_RETIRO_PENDING /
// DEPOSITO_PENDIENTE / ASIGNACION_PENDIENTE no son tipos del modelo
// real. Un depósito sin cliente identificado es un `DEPOSIT` con
// `fin.cliente_id == null` (alimenta la KPI Pendientes); la asignación
// posterior se hace vía la acción `Asignar Cliente`.
//
// `origen` enumeration: `'OPS'` (vostros + ajustes registrados en OPS)
// vs `'FIN'` (nostros, no-operativos, intercompany, ajustes manuales).
// ════════════════════════════════════════════════════════════════════

import type { Movimiento, PerMoneda } from '@/types/fin';

const SYSTEM_OPS = 'system-ops';
const USER_1 = 'dev-yasmani';
const USER_2 = 'dev-yasmani-2';

export const MOVIMIENTOS: Movimiento[] = [
  // ════════════════════════════════════════════════════════════════
  // Categoría A — Con cliente + físico (DEPOSIT / WITHDRAWAL)
  // ════════════════════════════════════════════════════════════════

  // ─── A · DEPOSIT — OPS, cliente imputado ────────────────────────
  {
    id: 'M-2026-12840',
    tipo: 'DEPOSIT',
    fecha: '2026-04-24',
    monto: '+ USD 180.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12840-ASC',
    evento_id: null,
    ops: {
      rail: 'WIRE',
      account: 'BR-7733',
      client: 'Tecno SA',
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: 'cli-tecno-sa',
      cuenta_operativa_cliente_id: '005517USD001',
    },
  },

  // ─── A · WITHDRAWAL — OPS, cliente imputado ─────────────────────
  {
    id: 'M-2026-12841',
    tipo: 'WITHDRAWAL',
    fecha: '2026-04-24',
    monto: '- USDC 250.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12841-CP',
    evento_id: null,
    ops: {
      rail: 'VCURRENCY USDC',
      account: '0xBG...A8C2',
      client: 'Inversiones Norte',
      counterparty: 'Cliente externo',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-2',
      cliente_id: 'cli-inversiones-norte',
      cuenta_operativa_cliente_id: '005518USDC001',
    },
  },

  // ════════════════════════════════════════════════════════════════
  // Categoría B — Con cliente, sin físico
  // (FEE / REBATE / SWAP_OUT / SWAP_IN / AJUSTE_CREDITO / AJUSTE_DEBITO)
  // ════════════════════════════════════════════════════════════════

  // ─── B · FEE — OPS, cliente imputado ────────────────────────────
  {
    id: 'M-2026-12839',
    tipo: 'FEE',
    fecha: '2026-04-24',
    monto: '- ARS 12.500',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12839-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '0170-4521',
      client: 'ACME Corp',
      counterparty: null,
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-coinag-1',
      cliente_id: 'cli-acme',
      cuenta_operativa_cliente_id: '005516ARS001',
    },
  },

  // ─── B · REBATE — FIN, confirmado (cliente externo) ──────────
  {
    id: 'M-2026-12831',
    tipo: 'REBATE',
    fecha: '2026-04-22',
    monto: '+ USDC 1.200',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12831-CP',
    evento_id: null,
    ops: {
      rail: 'VCURRENCY USDC',
      account: '0xBG...A8C2',
      client: null,
      counterparty: 'BitGo',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-2',
      cliente_id: 'cli-inversiones-norte',
      cuenta_operativa_cliente_id: '005518USDC001',
    },
  },

  // ─── B · SWAP_OUT — part of the SWAP triple (evento EV-99021) ───
  {
    id: 'M-2026-12838',
    tipo: 'SWAP_OUT',
    fecha: '2026-04-23',
    monto: '- USDT 420.000',
    moneda: 'USDT',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12838-CP',
    evento_id: 'EV-99021',
    ops: {
      rail: 'VCURRENCY USDT',
      account: '0xBG...USDT',
      client: 'Inversiones Norte',
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-1',
      cliente_id: 'cli-inversiones-norte',
    },
  },

  // ─── B · SWAP_IN — same triple ──────────────────────────────────
  {
    id: 'M-2026-12837',
    tipo: 'SWAP_IN',
    fecha: '2026-04-23',
    monto: '+ USDC 419.580',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12837-CP',
    evento_id: 'EV-99021',
    ops: {
      rail: 'VCURRENCY USDC',
      account: '0xBG...A8C2',
      client: 'Inversiones Norte',
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-2',
      cliente_id: 'cli-inversiones-norte',
    },
  },

  // ─── B · AJUSTE_CREDITO — FIN, pendiente_de_supervision ──────
  {
    id: 'M-2026-12831A',
    tipo: 'AJUSTE_CREDITO',
    fecha: '2026-04-22',
    monto: '+ ARS 8.500',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_2,
    asiento_id: 'AS-12831A-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '4403443/1',
      client: 'ACME Corp',
      counterparty: 'BIND',
      partner: 'BIND',
      provider: 'BIND',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-bind-1',
      cliente_id: 'cli-acme',
      cuenta_operativa_cliente_id: '005516ARS001',
      cliente_imputation_note: 'Devolución de fee cobrado de más en M-2026-12100',
    },
  },

  // ─── B · AJUSTE_DEBITO — FIN, confirmado ─────────────────────
  {
    id: 'M-2026-12830',
    tipo: 'AJUSTE_DEBITO',
    fecha: '2026-04-22',
    monto: '- USD 50.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12830-ASC',
    evento_id: null,
    ops: {
      rail: 'WIRE',
      account: 'BR-7733',
      client: 'Tecno SA',
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: 'cli-tecno-sa',
      cuenta_operativa_cliente_id: '005517USD001',
    },
  },

  // ─── A · DEPOSIT — sin cliente identificado (alimenta Pendientes KPI) ─
  // Un depósito ingresa físicamente pero el cliente aún no fue
  // identificado. La cuenta contable destino transitoria es "Pendientes
  // de asignación"; una vez que el cliente se imputa via `Asignar
  // Cliente`, el saldo se mueve a Obligaciones con clientes.
  {
    id: 'M-2026-12842',
    tipo: 'DEPOSIT',
    fecha: '2026-04-24',
    monto: '+ ARS 8.500.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12842-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '0170-4521',
      client: null,
      counterparty: null,
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-coinag-1',
      cliente_id: null,
    },
  },

  // ─── A · DEPOSIT — otra contribución a Pendientes (USDC) ──────────
  {
    id: 'M-2026-12829',
    tipo: 'DEPOSIT',
    fecha: '2026-04-21',
    monto: '+ USDC 130.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-12829-AV',
    evento_id: null,
    ops: {
      rail: 'VCURRENCY USDC',
      account: '0xBG...AS',
      client: null,
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: 'av',
      cuenta_id: 'cu-av-bitgo-1',
      cliente_id: null,
    },
  },

  // ════════════════════════════════════════════════════════════════
  // Categoría C — Sin cliente + físico (interno, single sociedad)
  // ════════════════════════════════════════════════════════════════

  // ─── C · MOV_ENTRE_CUENTAS_PROPIAS (misma sociedad) ─────────────
  {
    id: 'M-2026-12836',
    tipo: 'MOV_ENTRE_CUENTAS_PROPIAS',
    fecha: '2026-04-23',
    monto: '- USD 250.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12836-ASC',
    evento_id: 'EV-99012',
    ops: {
      rail: 'INTERNAL',
      account: 'BR-7733',
      client: null,
      counterparty: 'Convera',
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cuenta_destino_id: 'cu-asc-convera-1',
      cliente_id: null,
    },
  },

  // ─── C · COMISION_BANCARIA — FIN, pendiente_de_supervision ───
  {
    id: 'M-2026-12824',
    tipo: 'COMISION_BANCARIA',
    fecha: '2026-04-20',
    monto: '- ARS 8.500',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_2,
    asiento_id: 'AS-12824-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '4403443/1',
      client: null,
      counterparty: 'BIND',
      partner: 'BIND',
      provider: 'BIND',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-bind-1',
      cliente_id: null,
    },
  },

  // ─── C · INTERES_BANCARIO — FIN, confirmado ──────────────────
  {
    id: 'M-2026-12820',
    tipo: 'INTERES_BANCARIO',
    fecha: '2026-04-18',
    monto: '+ USD 1.250',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12820-ASC',
    evento_id: null,
    ops: {
      rail: 'WIRE',
      account: 'BR-7733',
      client: null,
      counterparty: 'Bridge',
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: null,
    },
  },

  // ─── C · PAGO_PROVEEDOR — FIN, pendiente_de_supervision ──────
  {
    id: 'M-2026-12822',
    tipo: 'PAGO_PROVEEDOR',
    fecha: '2026-04-19',
    monto: '- ARS 3.200.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12822-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '4403443/1',
      client: null,
      counterparty: 'AFIP',
      partner: 'BIND',
      provider: 'AFIP',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-bind-1',
      cliente_id: null,
    },
  },

  // ─── C · PAGO_SALARIOS — FIN, pendiente_de_supervision ───────
  {
    id: 'M-2026-12819',
    tipo: 'PAGO_SALARIOS',
    fecha: '2026-04-17',
    monto: '- ARS 18.000.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_2,
    asiento_id: 'AS-12819-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: '4403443/1',
      client: null,
      counterparty: 'Nómina interna',
      partner: 'BIND',
      provider: 'BIND',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-bind-1',
      cliente_id: null,
    },
  },

  // ─── C · APORTE_CAPITAL — FIN, confirmado ────────────────────
  {
    id: 'M-2026-12818',
    tipo: 'APORTE_CAPITAL',
    fecha: '2026-04-15',
    monto: '+ USD 500.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12818-ASC',
    evento_id: null,
    ops: {
      rail: 'WIRE',
      account: 'BR-7733',
      client: null,
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: null,
    },
  },

  // ════════════════════════════════════════════════════════════════
  // Categoría D — Sin cliente + físico (cross-sociedad)
  // PRESTAMO_INTERCOMPANY + SWEEPING_CROSS_SOCIEDAD: 2 records each
  // ════════════════════════════════════════════════════════════════

  // ─── D · PRESTAMO_INTERCOMPANY — HP origen (EV-99001) ───────────
  {
    id: 'M-2026-99001-HP',
    tipo: 'PRESTAMO_INTERCOMPANY',
    fecha: '2026-04-14',
    monto: '- USD 300.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-99001-HP',
    evento_id: 'EV-99001',
    ops: {
      rail: 'ARDUA',
      account: '0170-4521',
      client: null,
      counterparty: 'ASC',
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-coinag-1',
      cliente_id: null,
      intercompany: true,
      intercompany_counterparty_sociedad_id: 'asc',
      intercompany_note: 'Préstamo intercompany para cubrir disponibilidad operativa en ASC',
    },
  },

  // ─── D · PRESTAMO_INTERCOMPANY — ASC destino (EV-99001) ─────────
  {
    id: 'M-2026-99001-ASC',
    tipo: 'PRESTAMO_INTERCOMPANY',
    fecha: '2026-04-14',
    monto: '+ USD 300.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-99001-ASC',
    evento_id: 'EV-99001',
    ops: {
      rail: 'ARDUA',
      account: 'BR-7733',
      client: null,
      counterparty: 'HP',
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: null,
      intercompany: true,
      intercompany_counterparty_sociedad_id: 'hp',
      intercompany_note: 'Préstamo intercompany recibido de HP',
    },
  },

  // ─── D · SWEEPING_CROSS_SOCIEDAD — HP origen (EV-99002) ─────────
  {
    id: 'M-2026-99002-HP',
    tipo: 'SWEEPING_CROSS_SOCIEDAD',
    fecha: '2026-04-13',
    monto: '- USDC 100.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_2,
    asiento_id: 'AS-99002-HP',
    evento_id: 'EV-99002',
    ops: {
      rail: 'ARDUA',
      account: '0xBG...HP',
      client: null,
      counterparty: 'CP',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-bind-1',
      cliente_id: null,
      intercompany: true,
      intercompany_counterparty_sociedad_id: 'cp',
      intercompany_note: 'Sweeping: consolidar USDC pool en CP',
    },
  },

  // ─── D · SWEEPING_CROSS_SOCIEDAD — CP destino (EV-99002) ────────
  {
    id: 'M-2026-99002-CP',
    tipo: 'SWEEPING_CROSS_SOCIEDAD',
    fecha: '2026-04-13',
    monto: '+ USDC 100.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_2,
    asiento_id: 'AS-99002-CP',
    evento_id: 'EV-99002',
    ops: {
      rail: 'ARDUA',
      account: '0xBG...A8C2',
      client: null,
      counterparty: 'HP',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-2',
      cliente_id: null,
      intercompany: true,
      intercompany_counterparty_sociedad_id: 'hp',
      intercompany_note: 'Sweeping recibido de HP',
    },
  },

  // ════════════════════════════════════════════════════════════════
  // Categoría E — Sin cliente, sin físico (SPREAD / AJUSTE_MANUAL)
  // ════════════════════════════════════════════════════════════════

  // ─── E · SPREAD — part of the SWAP triple (EV-99021) ────────────
  {
    id: 'M-2026-99021-SPR',
    tipo: 'SPREAD',
    fecha: '2026-04-23',
    monto: '+ USD 420',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'OPS',
    created_by: SYSTEM_OPS,
    asiento_id: 'AS-99021-CP',
    evento_id: 'EV-99021',
    ops: {
      rail: 'INTERNAL',
      account: '0xBG...A8C2',
      client: null,
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-2',
      cliente_id: null,
    },
  },

  // ─── E · AJUSTE_MANUAL — FIN, rechazado (válvula de escape) ──
  {
    id: 'M-2026-12823',
    tipo: 'AJUSTE_MANUAL',
    fecha: '2026-04-19',
    monto: '+ USD 12.000',
    moneda: 'USD',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: USER_1,
    asiento_id: 'AS-12823-ASC',
    evento_id: null,
    ops: {
      rail: 'WIRE',
      account: 'BR-7733',
      client: null,
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge-1',
      cliente_id: null,
    },
  },

  // ─── FIN · PAGO_PROVEEDOR a AFIP (impuesto recurrente) ──────────
  {
    id: 'M-2026-12832',
    tipo: 'PAGO_PROVEEDOR',
    fecha: '2026-04-22',
    monto: '- ARS 145.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    origen: 'FIN',
    created_by: 'system-fin',
    asiento_id: 'AS-12832-HP',
    evento_id: null,
    ops: {
      rail: 'SPE',
      account: 'CV-9999',
      client: null,
      counterparty: 'AFIP',
      partner: 'AFIP',
      provider: 'AFIP',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-coinag-cvu',
      cliente_id: null,
    },
  },
];

// ────────────────────────────────────────────────────────────────────
// KPIs (Movimientos sub-tab L2)
// ────────────────────────────────────────────────────────────────────

export interface MovimientosKpis {
  movimientosDelDia: number;
  /** Per-moneda incoming volume (no USD-equivalent in V1). */
  volumenIngresado: PerMoneda;
  /** Per-moneda outgoing volume (no USD-equivalent in V1). */
  volumenEgresado: PerMoneda;
  /** Movements without a `fin.cuenta_id` (Lado Ardua pending). */
  pendientesDeImputacion: number;
  /** Income movements without a `fin.cliente_id` (Lado Cliente pending — feed the Pendientes KPI). */
  pendientesDeAsignacion: number;
}

export const MOVIMIENTOS_KPIS: MovimientosKpis = {
  movimientosDelDia: MOVIMIENTOS.filter((m) => m.fecha === '2026-04-24').length,
  volumenIngresado: {
    ARS: '8.500.000',
    USD: '500.420',
    USDC: '550.780',
  },
  volumenEgresado: {
    ARS: '21.353.500',
    USD: '550.000',
    USDC: '350.000',
    USDT: '420.000',
  },
  pendientesDeImputacion: MOVIMIENTOS.filter(
    (m) => m.fin.cuenta_id == null,
  ).length,
  pendientesDeAsignacion: MOVIMIENTOS.filter(
    (m) =>
      (m.tipo === 'DEPOSIT' || m.tipo === 'WITHDRAWAL') &&
      m.fin.cliente_id == null,
  ).length,
};
