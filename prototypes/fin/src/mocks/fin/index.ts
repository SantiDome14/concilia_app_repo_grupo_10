// ════════════════════════════════════════════════════════════════════
// FIN mocks barrel
// ────────────────────────────────────────────────────────────────────
// Single import surface for FIN-domain seed data. Pages import the
// specific datasets they consume. Per REQ-50 (`add-fin-disponibilidades`):
//   - `retiros_cola` is removed; the queue surface is reabsorbed into
//     the Disponibilidades.Movimientos sub-tab via predicate filtering.
//   - `bancos_cuentas` is added; FIN-lens view of the REQ-42 catalogue.
//   - `cuentas_operativas_cliente` is added (Cuentas Operativas del
//     Cliente per REQ-42 §6, including the synthetic `AS00000` Cuenta
//     de Cliente de Ardua per REQ-50 §5.7).
// ════════════════════════════════════════════════════════════════════

export * from './disponibilidades';
export * from './movimientos';
export * from './quotes';
export * from './sociedades';
export * from './cuentas';
export * from './bancos_cuentas';
export * from './cuentas_operativas_cliente';
