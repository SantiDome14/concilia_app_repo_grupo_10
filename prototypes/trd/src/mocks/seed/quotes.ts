// ════════════════════════════════════════════════════════════════════
// MSW seed — TRD / Quotes
// ────────────────────────────────────────────────────────────────────
// 40 OTC quotes covering the four legacy statuses (PENDING / ACCEPTED /
// COMPLETED / CANCELLED), BUY and SELL, all three terms (T0 / T+1 /
// T+2), and the seeded client roster (cl_001 … cl_032). Two quotes
// share a `ccc_group_id` so the master list's CCC-aware rendering
// (deferred to `add-trd-quote-ccc`) has data to consume when that
// capability lands; v1 ignores the field beyond rendering.
//
// Activities are keyed by quote id; not every quote has activities
// (cancelled / pending early-stage quotes may have an empty timeline).
// ════════════════════════════════════════════════════════════════════

import type { Quote, QuoteActivity, QuoteAttachment } from '@/types/quote';

const initialQuotes: Quote[] = [
  // ─── Activos (Pending) ─────────────────────────────────────────────
  { id: 'q_001', client_id: 'cl_001', client_name: 'ACME S.A.',                ardua_docket: '21548', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '12500000',   destination_currency: 'USD',  destination_amount: '12500',     exchange_rate: '1000',     term: 'T0',  status: 'PENDING',   created_at: '2026-05-26T09:15:00Z', liquidate_date: '2026-05-26T18:00:00Z', notes: 'Operación urgente — confirmar antes del cierre', ccc_group_id: null },
  { id: 'q_002', client_id: 'cl_002', client_name: 'Banco del Sur',            ardua_docket: '20193', operation: 'SELL', origin_currency: 'USDC', origin_amount: '85000',      destination_currency: 'ARS',  destination_amount: '83300000',  exchange_rate: '980',      term: 'T+1', status: 'PENDING',   created_at: '2026-05-26T10:30:00Z', liquidate_date: '2026-05-27T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_003', client_id: 'cl_005', client_name: 'Crypto Pampa',             ardua_docket: '23890', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '3500000',    destination_currency: 'USDT', destination_amount: '3450',      exchange_rate: '1014.49', term: 'T0',  status: 'PENDING',   created_at: '2026-05-26T11:00:00Z', liquidate_date: '2026-05-26T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_004', client_id: 'cl_015', client_name: 'Industrias Mendocinas',    ardua_docket: '25789', operation: 'SELL', origin_currency: 'USD',  origin_amount: '45000',      destination_currency: 'ARS',  destination_amount: '44550000',  exchange_rate: '990',      term: 'T+2', status: 'PENDING',   created_at: '2026-05-26T12:45:00Z', liquidate_date: '2026-05-28T18:00:00Z', notes: 'Cliente requiere confirmación por mail antes de ejecutar', ccc_group_id: null },
  { id: 'q_005', client_id: 'cl_026', client_name: 'Seguros Atlántida',        ardua_docket: '27654', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '8200000',    destination_currency: 'USDC', destination_amount: '8200',      exchange_rate: '1000',     term: 'T+1', status: 'PENDING',   created_at: '2026-05-25T16:00:00Z', liquidate_date: '2026-05-26T18:00:00Z', notes: null, ccc_group_id: null },

  // ─── Activos (Accepted) ────────────────────────────────────────────
  { id: 'q_006', client_id: 'cl_001', client_name: 'ACME S.A.',                ardua_docket: '21548', operation: 'BUY',  origin_currency: 'USD',  origin_amount: '20000',      destination_currency: 'USDT', destination_amount: '20020',     exchange_rate: '0.999',    term: 'T0',  status: 'ACCEPTED',  created_at: '2026-05-25T14:20:00Z', liquidate_date: '2026-05-25T18:00:00Z', notes: null, ccc_group_id: 'ccc_grp_001' },
  { id: 'q_007', client_id: 'cl_001', client_name: 'ACME S.A.',                ardua_docket: '21548', operation: 'SELL', origin_currency: 'USDT', origin_amount: '20020',      destination_currency: 'ARS',  destination_amount: '19619600',  exchange_rate: '980',      term: 'T0',  status: 'ACCEPTED',  created_at: '2026-05-25T14:20:00Z', liquidate_date: '2026-05-25T18:00:00Z', notes: 'CCC leg 2/2', ccc_group_id: 'ccc_grp_001' },
  { id: 'q_008', client_id: 'cl_010', client_name: 'Frigorífico Litoral',      ardua_docket: '24905', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '15000000',   destination_currency: 'USD',  destination_amount: '15000',     exchange_rate: '1000',     term: 'T+1', status: 'ACCEPTED',  created_at: '2026-05-25T15:45:00Z', liquidate_date: '2026-05-26T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_009', client_id: 'cl_017', client_name: 'Laboratorios Aconcagua',   ardua_docket: '26101', operation: 'SELL', origin_currency: 'USD',  origin_amount: '12000',      destination_currency: 'ARS',  destination_amount: '11880000',  exchange_rate: '990',      term: 'T+2', status: 'ACCEPTED',  created_at: '2026-05-25T17:00:00Z', liquidate_date: '2026-05-27T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_010', client_id: 'cl_023', client_name: 'Productores Vitivinícolas', ardua_docket: '27108', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '28000000',   destination_currency: 'USDC', destination_amount: '28000',     exchange_rate: '1000',     term: 'T0',  status: 'ACCEPTED',  created_at: '2026-05-26T08:30:00Z', liquidate_date: '2026-05-26T18:00:00Z', notes: null, ccc_group_id: null },

  // ─── Historial (Completed) ─────────────────────────────────────────
  { id: 'q_011', client_id: 'cl_002', client_name: 'Banco del Sur',            ardua_docket: '20193', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '55000000',   destination_currency: 'USD',  destination_amount: '55000',     exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-05-20T10:00:00Z', liquidate_date: '2026-05-20T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_012', client_id: 'cl_003', client_name: 'Bolsa Patagónica',         ardua_docket: '22841', operation: 'SELL', origin_currency: 'USDT', origin_amount: '120000',     destination_currency: 'ARS',  destination_amount: '117600000', exchange_rate: '980',      term: 'T+1', status: 'COMPLETED', created_at: '2026-05-19T11:30:00Z', liquidate_date: '2026-05-20T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_013', client_id: 'cl_006', client_name: 'Desarrolladora Andina',    ardua_docket: '24007', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '6500000',    destination_currency: 'USD',  destination_amount: '6500',      exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-05-18T14:15:00Z', liquidate_date: '2026-05-18T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_014', client_id: 'cl_009', client_name: 'Federación Vinícola',      ardua_docket: '24612', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '14000000',   destination_currency: 'USDC', destination_amount: '14000',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-05-15T09:00:00Z', liquidate_date: '2026-05-16T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_015', client_id: 'cl_012', client_name: 'Grupo Inversor Norte',     ardua_docket: '25278', operation: 'SELL', origin_currency: 'USD',  origin_amount: '125000',     destination_currency: 'ARS',  destination_amount: '123750000', exchange_rate: '990',      term: 'T+2', status: 'COMPLETED', created_at: '2026-05-14T11:00:00Z', liquidate_date: '2026-05-16T18:00:00Z', notes: 'Liquidación parcial', ccc_group_id: null },
  { id: 'q_016', client_id: 'cl_013', client_name: 'Hospital Privado Quilmes', ardua_docket: '25440', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '12000000',   destination_currency: 'USD',  destination_amount: '12000',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-05-12T16:45:00Z', liquidate_date: '2026-05-13T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_017', client_id: 'cl_018', client_name: 'Logística Pampa Húmeda',   ardua_docket: '26278', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '22000000',   destination_currency: 'USDC', destination_amount: '22000',     exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-05-10T10:30:00Z', liquidate_date: '2026-05-10T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_018', client_id: 'cl_020', client_name: 'Mercado Pyme',             ardua_docket: '26607', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '4500000',    destination_currency: 'USD',  destination_amount: '4500',      exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-05-08T15:00:00Z', liquidate_date: '2026-05-08T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_019', client_id: 'cl_021', client_name: 'Nautilus Logistics',       ardua_docket: '26801', operation: 'SELL', origin_currency: 'USDT', origin_amount: '36000',      destination_currency: 'ARS',  destination_amount: '35280000',  exchange_rate: '980',      term: 'T+1', status: 'COMPLETED', created_at: '2026-05-07T12:30:00Z', liquidate_date: '2026-05-08T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_020', client_id: 'cl_024', client_name: 'Química del Sur',          ardua_docket: '27302', operation: 'SELL', origin_currency: 'USD',  origin_amount: '72000',      destination_currency: 'ARS',  destination_amount: '71280000',  exchange_rate: '990',      term: 'T+2', status: 'COMPLETED', created_at: '2026-05-05T09:45:00Z', liquidate_date: '2026-05-07T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_021', client_id: 'cl_026', client_name: 'Seguros Atlántida',        ardua_docket: '27654', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '65000000',   destination_currency: 'USDC', destination_amount: '65000',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-05-04T13:00:00Z', liquidate_date: '2026-05-05T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_022', client_id: 'cl_027', client_name: 'Tecnológica Patagonia',    ardua_docket: '27890', operation: 'SELL', origin_currency: 'USD',  origin_amount: '120000',     destination_currency: 'ARS',  destination_amount: '118800000', exchange_rate: '990',      term: 'T+1', status: 'COMPLETED', created_at: '2026-05-02T11:00:00Z', liquidate_date: '2026-05-03T18:00:00Z', notes: 'Cliente nuevo — verificado', ccc_group_id: null },
  { id: 'q_023', client_id: 'cl_030', client_name: 'Unión Cerealera',          ardua_docket: '28201', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '36000000',   destination_currency: 'USD',  destination_amount: '36000',     exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-04-29T14:30:00Z', liquidate_date: '2026-04-29T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_024', client_id: 'cl_031', client_name: 'Viñedos del Plata',        ardua_docket: '28412', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '60000000',   destination_currency: 'USDC', destination_amount: '60000',     exchange_rate: '1000',     term: 'T+2', status: 'COMPLETED', created_at: '2026-04-25T10:00:00Z', liquidate_date: '2026-04-28T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_025', client_id: 'cl_001', client_name: 'ACME S.A.',                ardua_docket: '21548', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '32500000',   destination_currency: 'USD',  destination_amount: '32500',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-04-20T09:30:00Z', liquidate_date: '2026-04-21T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_026', client_id: 'cl_002', client_name: 'Banco del Sur',            ardua_docket: '20193', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '180000000',  destination_currency: 'USD',  destination_amount: '180000',    exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-04-15T14:00:00Z', liquidate_date: '2026-04-16T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_027', client_id: 'cl_005', client_name: 'Crypto Pampa',             ardua_docket: '23890', operation: 'SELL', origin_currency: 'USDT', origin_amount: '40000',      destination_currency: 'USDC', destination_amount: '39960',     exchange_rate: '0.999',    term: 'T0',  status: 'COMPLETED', created_at: '2026-04-10T15:20:00Z', liquidate_date: '2026-04-10T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_028', client_id: 'cl_015', client_name: 'Industrias Mendocinas',    ardua_docket: '25789', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '70000000',   destination_currency: 'USD',  destination_amount: '70000',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-04-05T11:45:00Z', liquidate_date: '2026-04-06T18:00:00Z', notes: null, ccc_group_id: null },

  // ─── Historial (Cancelled) ─────────────────────────────────────────
  { id: 'q_029', client_id: 'cl_010', client_name: 'Frigorífico Litoral',      ardua_docket: '24905', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '5000000',    destination_currency: 'USD',  destination_amount: '5000',      exchange_rate: '1000',     term: 'T0',  status: 'CANCELLED', created_at: '2026-05-22T13:00:00Z', liquidate_date: null,                  notes: 'Cliente canceló por cambio de plan', ccc_group_id: null },
  { id: 'q_030', client_id: 'cl_017', client_name: 'Laboratorios Aconcagua',   ardua_docket: '26101', operation: 'SELL', origin_currency: 'USD',  origin_amount: '8000',       destination_currency: 'ARS',  destination_amount: '7920000',   exchange_rate: '990',      term: 'T+1', status: 'CANCELLED', created_at: '2026-05-21T10:15:00Z', liquidate_date: null,                  notes: 'Duplicado de q_009', ccc_group_id: null },
  { id: 'q_031', client_id: 'cl_028', client_name: 'Tequila Co.',              ardua_docket: '11243-ACME-INVOICE', operation: 'BUY', origin_currency: 'USD', origin_amount: '8000', destination_currency: 'ARS', destination_amount: '7920000', exchange_rate: '990', term: 'T+1', status: 'CANCELLED', created_at: '2026-05-18T12:00:00Z', liquidate_date: null, notes: null, ccc_group_id: null },
  { id: 'q_032', client_id: 'cl_004', client_name: 'Cooperativa La Esperanza', ardua_docket: '23105', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '2000000',    destination_currency: 'USD',  destination_amount: '2000',      exchange_rate: '1000',     term: 'T+2', status: 'CANCELLED', created_at: '2026-05-10T16:30:00Z', liquidate_date: null,                  notes: 'Sin fondos confirmados al momento del cierre', ccc_group_id: null },

  // ─── Más completados (relleno para pagination) ────────────────────
  { id: 'q_033', client_id: 'cl_007', client_name: 'Editorial Río de la Plata', ardua_docket: '24213', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '4800000',    destination_currency: 'USD',  destination_amount: '4800',      exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-04-03T09:00:00Z', liquidate_date: '2026-04-03T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_034', client_id: 'cl_011', client_name: 'Galería Centro',           ardua_docket: '25112', operation: 'SELL', origin_currency: 'USD',  origin_amount: '3500',       destination_currency: 'ARS',  destination_amount: '3465000',   exchange_rate: '990',      term: 'T+1', status: 'COMPLETED', created_at: '2026-03-28T14:00:00Z', liquidate_date: '2026-03-29T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_035', client_id: 'cl_016', client_name: 'Jugos del Valle',          ardua_docket: '25932', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '6800000',    destination_currency: 'USDC', destination_amount: '6800',      exchange_rate: '1000',     term: 'T0',  status: 'COMPLETED', created_at: '2026-03-25T11:30:00Z', liquidate_date: '2026-03-25T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_036', client_id: 'cl_022', client_name: 'Oficinas Centro',          ardua_docket: '26945', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '3200000',    destination_currency: 'USD',  destination_amount: '3200',      exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-03-22T15:45:00Z', liquidate_date: '2026-03-23T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_037', client_id: 'cl_029', client_name: 'Textiles Ribera',          ardua_docket: '28045', operation: 'SELL', origin_currency: 'USDT', origin_amount: '15000',      destination_currency: 'ARS',  destination_amount: '14700000',  exchange_rate: '980',      term: 'T0',  status: 'COMPLETED', created_at: '2026-03-18T10:00:00Z', liquidate_date: '2026-03-18T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_038', client_id: 'cl_032', client_name: 'Zinc & Hierro SRL',        ardua_docket: '28599', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '11500000',   destination_currency: 'USD',  destination_amount: '11500',     exchange_rate: '1000',     term: 'T+2', status: 'COMPLETED', created_at: '2026-03-15T13:20:00Z', liquidate_date: '2026-03-17T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_039', client_id: 'cl_001', client_name: 'ACME S.A.',                ardua_docket: '21548', operation: 'BUY',  origin_currency: 'ARS',  origin_amount: '85000000',   destination_currency: 'USD',  destination_amount: '85000',     exchange_rate: '1000',     term: 'T+1', status: 'COMPLETED', created_at: '2026-03-10T09:30:00Z', liquidate_date: '2026-03-11T18:00:00Z', notes: null, ccc_group_id: null },
  { id: 'q_040', client_id: 'cl_026', client_name: 'Seguros Atlántida',        ardua_docket: '27654', operation: 'SELL', origin_currency: 'USD',  origin_amount: '60000',      destination_currency: 'ARS',  destination_amount: '59400000',  exchange_rate: '990',      term: 'T0',  status: 'COMPLETED', created_at: '2026-03-05T14:00:00Z', liquidate_date: '2026-03-05T18:00:00Z', notes: null, ccc_group_id: null },
];

// Activities per quote — keyed by quote id. Active quotes have richer
// timelines; cancelled ones get a cancellation reason event; completed
// ones get the full lifecycle (pending → accepted → completed).
const initialActivities: Record<string, QuoteActivity[]> = {
  q_001: [
    { id: 'qa_001_01', at: '2026-05-26T09:15:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING' },
  ],
  q_002: [
    { id: 'qa_002_01', at: '2026-05-26T10:30:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING' },
    { id: 'qa_002_02', at: '2026-05-26T10:35:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'field_update', label: 'Tipo de cambio ajustado a 980' },
  ],
  q_006: [
    { id: 'qa_006_01', at: '2026-05-25T14:20:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING (leg 1/2 de CCC)' },
    { id: 'qa_006_02', at: '2026-05-25T14:45:00Z', actor_id: 'u_maria', actor_name: 'María López', kind: 'state_change', label: 'Cotización aceptada' },
  ],
  q_007: [
    { id: 'qa_007_01', at: '2026-05-25T14:20:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING (leg 2/2 de CCC)' },
    { id: 'qa_007_02', at: '2026-05-25T14:45:00Z', actor_id: 'u_maria', actor_name: 'María López', kind: 'state_change', label: 'Cotización aceptada' },
  ],
  q_011: [
    { id: 'qa_011_01', at: '2026-05-20T10:00:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING' },
    { id: 'qa_011_02', at: '2026-05-20T10:15:00Z', actor_id: 'u_maria', actor_name: 'María López', kind: 'state_change', label: 'Cotización aceptada' },
    { id: 'qa_011_03', at: '2026-05-20T17:50:00Z', actor_id: 'u_maria', actor_name: 'María López', kind: 'state_change', label: 'Cotización completada' },
  ],
  q_029: [
    { id: 'qa_029_01', at: '2026-05-22T13:00:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización creada en estado PENDING' },
    { id: 'qa_029_02', at: '2026-05-22T13:30:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'state_change', label: 'Cotización cancelada por el cliente' },
    { id: 'qa_029_03', at: '2026-05-22T13:31:00Z', actor_id: 'u_juan',  actor_name: 'Juan Pérez',  kind: 'comment_added', label: 'Nota: cancelación solicitada vía mail' },
  ],
};

// Pre-populated attachments — three quotes ship with an attachment so
// the drawer surface has something to render on first inspection.
const initialAttachments: Record<string, QuoteAttachment[]> = {
  q_011: [
    {
      id: 'qatt_011_01',
      filename: 'contrato-banco-del-sur.pdf',
      size: 184_320,
      mime: 'application/pdf',
      comment: 'Contrato marco firmado por ambas partes',
      uploaded_at: '2026-05-20T10:30:00Z',
      uploaded_by: 'María López',
    },
  ],
  q_022: [
    {
      id: 'qatt_022_01',
      filename: 'kyc-tecnologica-patagonia.pdf',
      size: 92_416,
      mime: 'application/pdf',
      comment: null,
      uploaded_at: '2026-05-02T11:30:00Z',
      uploaded_by: 'Juan Pérez',
    },
    {
      id: 'qatt_022_02',
      filename: 'confirmacion-wire.png',
      size: 48_233,
      mime: 'image/png',
      comment: 'Screenshot del wire de confirmación',
      uploaded_at: '2026-05-03T09:15:00Z',
      uploaded_by: 'Juan Pérez',
    },
  ],
  q_006: [
    {
      id: 'qatt_006_01',
      filename: 'leg-1-de-ccc.pdf',
      size: 71_904,
      mime: 'application/pdf',
      comment: 'Documento de la primera pata del CCC',
      uploaded_at: '2026-05-25T14:50:00Z',
      uploaded_by: 'María López',
    },
  ],
};

export let quotesSeed: Quote[] = structuredClone(initialQuotes);
export let quoteActivitiesSeed: Record<string, QuoteActivity[]> =
  structuredClone(initialActivities);
export let quoteAttachmentsSeed: Record<string, QuoteAttachment[]> =
  structuredClone(initialAttachments);

let quoteIdCounter = initialQuotes.length;
let attachmentIdCounter = 9000;
export function nextAttachmentId(): string {
  attachmentIdCounter += 1;
  return `qatt_gen_${attachmentIdCounter}`;
}

/** Generate a stable, monotonically-incrementing quote id (q_041, q_042, …). */
export function nextQuoteId(): string {
  quoteIdCounter += 1;
  return `q_${String(quoteIdCounter).padStart(3, '0')}`;
}

export function resetQuotesSeed(): void {
  quotesSeed = structuredClone(initialQuotes);
  quoteActivitiesSeed = structuredClone(initialActivities);
  quoteAttachmentsSeed = structuredClone(initialAttachments);
  quoteIdCounter = initialQuotes.length;
  attachmentIdCounter = 9000;
}
