import { describe, it, expect } from 'vitest';
import { defaultCuentaTipoFor, type EstructuraTipo } from './types';

describe('defaultCuentaTipoFor', () => {
  const cases: Array<{ tipo: EstructuraTipo; expected: string }> = [
    { tipo: 'Banco', expected: 'Cuenta Corriente' },
    { tipo: 'Banco digital', expected: 'Cuenta Corriente' },
    { tipo: 'ALyC', expected: 'Comitente' },
    { tipo: 'Exchange', expected: 'Exchange Account' },
    { tipo: 'Custodio', expected: 'Custodia' },
    { tipo: 'PSP', expected: 'CVU' },
    { tipo: 'Proveedor', expected: 'Wallet Pool' },
  ];

  for (const c of cases) {
    it(`maps ${c.tipo} → ${c.expected}`, () => {
      expect(defaultCuentaTipoFor(c.tipo)).toBe(c.expected);
    });
  }
});
