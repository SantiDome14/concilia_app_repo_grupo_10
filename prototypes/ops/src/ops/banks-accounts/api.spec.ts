import { describe, it, expect } from 'vitest';
import { schemas } from './api';

describe('ops-banks-accounts — zod schemas', () => {
  describe('bankAccountRecord', () => {
    const valid = {
      id: 'acc-1',
      sociedad: 'Circuit Pay SA',
      estructura: 'COINAG',
      estructuraTipo: 'PSP',
      tipoCuenta: 'CVU',
      moneda: 'ARS',
      nro: '10.045',
      cuentaPadreLabel: null,
      padreCuentaId: null,
      status: 'Activa',
    };

    it('accepts a fully-formed record', () => {
      expect(() => schemas.bankAccountRecord.parse(valid)).not.toThrow();
    });

    it('rejects an unknown moneda value', () => {
      expect(() => schemas.bankAccountRecord.parse({ ...valid, moneda: 'EUR' })).toThrow();
    });

    it('rejects an unknown tipoCuenta value', () => {
      expect(() => schemas.bankAccountRecord.parse({ ...valid, tipoCuenta: 'Wallet' })).toThrow();
    });

    it('rejects an unknown estructuraTipo value', () => {
      expect(() => schemas.bankAccountRecord.parse({ ...valid, estructuraTipo: 'Bitcoin' })).toThrow();
    });

    it('accepts a record with optional padreCuentaId set', () => {
      const withParent = { ...valid, padreCuentaId: 'parent-1' };
      expect(() => schemas.bankAccountRecord.parse(withParent)).not.toThrow();
    });
  });

  describe('createAccountPayload', () => {
    const valid = {
      sociedadId: 'soc-1',
      estructuraId: 'est-1',
      tipoCuenta: 'Cuenta Corriente',
      moneda: 'USD',
      nro: '356744',
    };

    it('accepts a minimal payload (no padre)', () => {
      expect(() => schemas.createAccountPayload.parse(valid)).not.toThrow();
    });

    it('accepts a payload with explicit null padre', () => {
      expect(() =>
        schemas.createAccountPayload.parse({ ...valid, padreCuentaId: null }),
      ).not.toThrow();
    });

    it('rejects empty nro', () => {
      expect(() => schemas.createAccountPayload.parse({ ...valid, nro: '' })).toThrow();
    });
  });

  describe('createStructurePayload', () => {
    it('accepts a valid payload', () => {
      expect(() =>
        schemas.createStructurePayload.parse({ name: 'COINAG', tipo: 'PSP' }),
      ).not.toThrow();
    });

    it('rejects empty name', () => {
      expect(() =>
        schemas.createStructurePayload.parse({ name: '', tipo: 'PSP' }),
      ).toThrow();
    });

    it('rejects unknown tipo', () => {
      expect(() =>
        schemas.createStructurePayload.parse({ name: 'X', tipo: 'Wallet' }),
      ).toThrow();
    });
  });

  describe('updateAccountPayload', () => {
    const valid = {
      tipoCuenta: 'CVU',
      moneda: 'ARS',
      nro: '10.046',
      status: 'Activa',
    };

    it('accepts a minimal payload (no padre)', () => {
      expect(() => schemas.updateAccountPayload.parse(valid)).not.toThrow();
    });

    it('accepts a payload with explicit null padre', () => {
      expect(() =>
        schemas.updateAccountPayload.parse({ ...valid, padreCuentaId: null }),
      ).not.toThrow();
    });

    it('accepts a payload with a parent id set', () => {
      expect(() =>
        schemas.updateAccountPayload.parse({ ...valid, padreCuentaId: 'parent-1' }),
      ).not.toThrow();
    });

    it('rejects empty nro', () => {
      expect(() => schemas.updateAccountPayload.parse({ ...valid, nro: '' })).toThrow();
    });

    it('rejects unknown moneda', () => {
      expect(() => schemas.updateAccountPayload.parse({ ...valid, moneda: 'EUR' })).toThrow();
    });

    it('rejects unknown status', () => {
      expect(() => schemas.updateAccountPayload.parse({ ...valid, status: 'Eliminada' })).toThrow();
    });
  });
});
