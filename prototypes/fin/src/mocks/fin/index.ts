// ════════════════════════════════════════════════════════════════════
// FIN mocks barrel
// ────────────────────────────────────────────────────────────────────
// Single import surface for FIN-domain seed data. Pages import the
// specific datasets they consume. The legacy Tesorería display dataset
// (`POS_TREE`, `TES_MOVS`, `COLA`) is exported alongside the canonical
// manifest-record datasets (`MOVIMIENTOS`, `QUOTES`, `RETIROS_COLA`)
// and the lookup catalogs (`SOCIEDADES`, `CUENTAS`).
// ════════════════════════════════════════════════════════════════════

export * from './disponibilidades';
export * from './movimientos';
export * from './quotes';
export * from './retiros_cola';
export * from './sociedades';
export * from './cuentas';
