// Exhaustive coverage of the categoría derivation. One assertion per tipo
// of the closed matriz. If a new tipo is added to `MovimientoTipo` without
// a matching branch in `categoriaOf`, both the compiler (exhaustive switch)
// and this test (missing case) flag the gap.

import { describe, expect, it } from 'vitest';

import type { MovimientoCategoria, MovimientoTipo } from '@/types/fin';

import {
  categoriaHasLadoCliente,
  categoriaIsFinImputable,
  categoriaOf,
} from './categoria';

const MATRIZ: Array<[MovimientoTipo, MovimientoCategoria]> = [
  // A — Con cliente + físico
  ['DEPOSIT', 'A'],
  ['WITHDRAWAL', 'A'],
  // B — Con cliente, sin físico
  ['FEE', 'B'],
  ['REBATE', 'B'],
  ['SWAP_OUT', 'B'],
  ['SWAP_IN', 'B'],
  ['AJUSTE_CREDITO', 'B'],
  ['AJUSTE_DEBITO', 'B'],
  // C — Sin cliente + físico (interno)
  ['COMISION_BANCARIA', 'C'],
  ['INTERES_BANCARIO', 'C'],
  ['PAGO_PROVEEDOR', 'C'],
  ['PAGO_SALARIOS', 'C'],
  ['MOV_ENTRE_CUENTAS_PROPIAS', 'C'],
  ['APORTE_CAPITAL', 'C'],
  // D — Sin cliente + físico (cross-sociedad)
  ['PRESTAMO_INTERCOMPANY', 'D'],
  ['SWEEPING_CROSS_SOCIEDAD', 'D'],
  // E — Sin cliente, sin físico
  ['SPREAD', 'E'],
  ['AJUSTE_MANUAL', 'E'],
];

describe('categoriaOf', () => {
  it.each(MATRIZ)('maps %s to categoría %s', (tipo, expected) => {
    expect(categoriaOf(tipo)).toBe(expected);
  });

  it('covers every tipo of the closed matriz exactly once', () => {
    const seen = new Set(MATRIZ.map(([tipo]) => tipo));
    expect(seen.size).toBe(MATRIZ.length);
    // The MovimientoTipo union has 18 values after the omnibus alignment
    // removed the simulator-only pending tipos (SOLICITUD_RETIRO_PENDING,
    // DEPOSITO_PENDIENTE, ASIGNACION_PENDIENTE).
    expect(MATRIZ.length).toBe(18);
  });
});

describe('categoriaHasLadoCliente', () => {
  it('returns true for A, B (cliente applies)', () => {
    expect(categoriaHasLadoCliente('A')).toBe(true);
    expect(categoriaHasLadoCliente('B')).toBe(true);
  });

  it('returns false for C, D, E (no lado cliente)', () => {
    expect(categoriaHasLadoCliente('C')).toBe(false);
    expect(categoriaHasLadoCliente('D')).toBe(false);
    expect(categoriaHasLadoCliente('E')).toBe(false);
  });
});

describe('categoriaIsFinImputable', () => {
  it('returns true for C, D, E (FIN imputa)', () => {
    expect(categoriaIsFinImputable('C')).toBe(true);
    expect(categoriaIsFinImputable('D')).toBe(true);
    expect(categoriaIsFinImputable('E')).toBe(true);
  });

  it('returns false for A, B (OPS imputa o cliente identifica)', () => {
    expect(categoriaIsFinImputable('A')).toBe(false);
    expect(categoriaIsFinImputable('B')).toBe(false);
  });
});
