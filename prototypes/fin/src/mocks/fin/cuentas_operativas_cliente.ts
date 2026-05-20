// ════════════════════════════════════════════════════════════════════
// Mock catalog · cuentas_operativas_cliente
// ────────────────────────────────────────────────────────────────────
// Cuentas Operativas del Cliente per REQ-42 §6. Internal accounting
// constructions representing the balance attributed to a client under
// the Docket de Ardua Solutions Corp. The id format is
// `<docket-digits><moneda><suffix>` (e.g. `005516EURC739`).
//
// Per `align-fin-disponibilidades-to-omnibus-model`: the synthetic
// `AS00000` placeholder is removed. Under the closed conceptual model,
// movements without an external client (categorías C, D, E) have a
// formal contrapartida contable (Ingresos / Egresos / Patrimonio
// operativo / Intercompany / Puente FX) — never a synthetic cliente.
// The `Asignar Cliente` action is hidden for those categorías via
// manifest `show_when`.
// ════════════════════════════════════════════════════════════════════

import type { CuentaOperativaCliente } from '@/types/fin';

export const CUENTAS_OPERATIVAS_CLIENTE: CuentaOperativaCliente[] = [
  // ─── Cuentas Operativas de clientes externos ───────────────────────
  { id: '005516USD001', cliente_id: 'cli-acme', moneda: 'USD', estado: 'Activa', label: 'ACME · Docket 005516 · USD' },
  { id: '005516ARS001', cliente_id: 'cli-acme', moneda: 'ARS', estado: 'Activa', label: 'ACME · Docket 005516 · ARS' },
  { id: '005517USD001', cliente_id: 'cli-tecno-sa', moneda: 'USD', estado: 'Activa', label: 'Tecno SA · Docket 005517 · USD' },
  { id: '005517USDC001', cliente_id: 'cli-tecno-sa', moneda: 'USDC', estado: 'Activa', label: 'Tecno SA · Docket 005517 · USDC' },
  { id: '005518USDC001', cliente_id: 'cli-inversiones-norte', moneda: 'USDC', estado: 'Activa', label: 'Inversiones Norte · Docket 005518 · USDC' },
  { id: '005519EUR001', cliente_id: 'cli-grupo-sur', moneda: 'EUR', estado: 'Activa', label: 'Grupo Sur · Docket 005519 · EUR' },
  { id: '005520USD001', cliente_id: 'cli-capital-plus', moneda: 'USD', estado: 'Activa', label: 'Capital Plus · Docket 005520 · USD' },
  { id: '005521ARS001', cliente_id: 'cli-mendoza-trading', moneda: 'ARS', estado: 'Activa', label: 'Mendoza Trading · Docket 005521 · ARS' },
  { id: '005522USDT001', cliente_id: 'cli-patagonia-fx', moneda: 'USDT', estado: 'Activa', label: 'Patagonia FX · Docket 005522 · USDT' },
];

/** Returns the active Cuentas Operativas of a client in a given moneda. */
export function findCuentasOperativas(
  cliente_id: string,
  moneda: string,
): CuentaOperativaCliente[] {
  return CUENTAS_OPERATIVAS_CLIENTE.filter(
    (c) => c.cliente_id === cliente_id && c.moneda === moneda && c.estado === 'Activa',
  );
}
