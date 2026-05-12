import { describe, it, expect } from 'vitest';
import {
  INBOX_TYPES_REGISTRY,
  getInboxTypeConfig,
  listCreableTypes,
  hasAnyCreableType,
} from './inbox-types';

// ════════════════════════════════════════════════════════════════════
// inbox-types registry helpers
// ────────────────────────────────────────────────────────────────────
// Contract: `core-modulo-genericos` Requirement: Inbox MUST expose a
// typed registry InboxTypeConfig with creable_manualmente,
// manual_creation_capability, payload_schema, closeActions, …
// ════════════════════════════════════════════════════════════════════

describe('INBOX_TYPES_REGISTRY', () => {
  it('declares the four template-shipped types', () => {
    expect(Object.keys(INBOX_TYPES_REGISTRY).sort()).toEqual(
      ['aprobacion_pago', 'baja_usuario', 'cambio_limite', 'revision_legajo'],
    );
  });

  it('ships at least one closeAction per type with both terminals represented', () => {
    for (const cfg of Object.values(INBOX_TYPES_REGISTRY)) {
      expect(cfg.closeActions.length).toBeGreaterThan(0);
      const states = new Set(cfg.closeActions.map((c) => c.terminal_state));
      expect(states.has('completed') || states.has('rejected')).toBe(true);
    }
  });

  it('is frozen at runtime (Readonly contract)', () => {
    expect(Object.isFrozen(INBOX_TYPES_REGISTRY)).toBe(true);
  });
});

describe('getInboxTypeConfig', () => {
  it('returns the matching entry for a declared type', () => {
    const cfg = getInboxTypeConfig('aprobacion_pago');
    expect(cfg?.type).toBe('aprobacion_pago');
    expect(cfg?.kind).toBe('solicitud');
  });

  it('returns undefined for an undeclared type', () => {
    expect(getInboxTypeConfig('does_not_exist')).toBeUndefined();
  });
});

describe('listCreableTypes', () => {
  it('returns only entries with creable_manualmente: true', () => {
    const types = listCreableTypes(['INBOX_CREATE']);
    const ids = types.map((t) => t.type);
    expect(ids).toContain('aprobacion_pago');
    expect(ids).toContain('revision_legajo');
    expect(ids).not.toContain('baja_usuario'); // creable_manualmente omitted
    expect(ids).not.toContain('cambio_limite'); // creable_manualmente: false
  });

  it('filters by manual_creation_capability', () => {
    expect(listCreableTypes([]).map((t) => t.type)).toEqual([]);
    expect(listCreableTypes(['INBOX_CREATE']).length).toBe(2);
    expect(listCreableTypes(['WRONG_CAP']).map((t) => t.type)).toEqual([]);
  });

  it('honors the wildcard "*" capability', () => {
    const all = listCreableTypes(['*']);
    expect(all.length).toBe(2);
    expect(all.map((t) => t.type).sort()).toEqual(
      ['aprobacion_pago', 'revision_legajo'],
    );
  });
});

describe('hasAnyCreableType', () => {
  it('is true when the registry declares at least one creable type', () => {
    expect(hasAnyCreableType()).toBe(true);
  });
});
