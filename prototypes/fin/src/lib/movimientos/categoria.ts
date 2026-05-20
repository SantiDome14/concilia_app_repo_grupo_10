// ════════════════════════════════════════════════════════════════════
// Movimiento categoría — derivation from tipo (single source of truth)
// ────────────────────────────────────────────────────────────────────
// Per Decision 1 of `align-fin-disponibilidades-to-omnibus-model`:
// `MovimientoCategoria` is a DERIVED value, never stored on the record.
// The matriz of the feature is the single source of truth; storing the
// categoría would duplicate state and introduce drift risk.
//
// The TypeScript compiler enforces exhaustiveness: adding a new tipo to
// the `MovimientoTipo` union without a matching branch here produces a
// `Type 'never' is not assignable to type 'MovimientoCategoria'` error
// at compile time.
// ════════════════════════════════════════════════════════════════════

import type { MovimientoCategoria, MovimientoTipo } from '@/types/fin';

/**
 * Derive the categoría of a movimiento from its tipo. Pure function — same
 * input always returns the same output. Safe to call in template
 * expressions; memoise only if a hot path proves it necessary.
 */
export function categoriaOf(tipo: MovimientoTipo): MovimientoCategoria {
  switch (tipo) {
    // A — Con cliente + físico
    case 'DEPOSIT':
    case 'WITHDRAWAL':
      return 'A';

    // B — Con cliente, sin físico
    case 'FEE':
    case 'REBATE':
    case 'SWAP_OUT':
    case 'SWAP_IN':
    case 'AJUSTE_CREDITO':
    case 'AJUSTE_DEBITO':
    case 'ASIGNACION_PENDIENTE':
    case 'SOLICITUD_RETIRO_PENDING':
      return 'B';

    // C — Sin cliente + físico (interno)
    case 'COMISION_BANCARIA':
    case 'INTERES_BANCARIO':
    case 'PAGO_PROVEEDOR':
    case 'PAGO_SALARIOS':
    case 'MOV_ENTRE_CUENTAS_PROPIAS':
    case 'APORTE_CAPITAL':
      return 'C';

    // D — Sin cliente + físico (cross-sociedad)
    case 'PRESTAMO_INTERCOMPANY':
    case 'SWEEPING_CROSS_SOCIEDAD':
      return 'D';

    // E — Sin cliente, sin físico
    case 'SPREAD':
    case 'AJUSTE_MANUAL':
      return 'E';

    // F — Cliente NO IDENTIFICADO
    case 'DEPOSITO_PENDIENTE':
      return 'F';

    default: {
      // Exhaustiveness check — if a new tipo is added to the union without
      // a matching branch above, the compiler will report:
      //   "Type 'MovimientoTipo' is not assignable to type 'never'."
      const _exhaustive: never = tipo;
      return _exhaustive;
    }
  }
}

/**
 * Convenience predicate — true iff the categoría implies the movimiento
 * carries (or expects) a Lado Cliente. Used by manifest `show_when`
 * predicates and by the page-level dialog field gating.
 *
 * Categorías A, B, F have a Lado Cliente (real, derivable, or pending).
 * Categorías C, D, E do NOT — the contrapartida es una cuenta contable
 * formal (Ingresos / Egresos / Patrimonio operativo / Intercompany /
 * Puente FX), no un cliente sintético.
 */
export function categoriaHasLadoCliente(categoria: MovimientoCategoria): boolean {
  return categoria === 'A' || categoria === 'B' || categoria === 'F';
}

/**
 * Convenience predicate — true iff FIN imputa el Lado Ardua del movimiento
 * (categorías C, D, E). Para A y B, OPS ya lo imputa; la acción "Asignar
 * Banco y Cuenta" del manifest queda visible pero deshabilitada con tag
 * "Solo OPS".
 */
export function categoriaIsFinImputable(categoria: MovimientoCategoria): boolean {
  return categoria === 'C' || categoria === 'D' || categoria === 'E';
}
