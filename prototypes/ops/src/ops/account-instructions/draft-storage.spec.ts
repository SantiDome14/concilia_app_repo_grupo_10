import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from './draft-storage';
import type { AccountInstructionDraft } from './types';

const SAMPLE_DRAFT: AccountInstructionDraft = {
  step: 'values',
  accountId: 'acc-1',
  templateId: 'tpl-7',
  formValues: { beneficiary_bank: 'BBVA', reference_code: 'REF-D42' },
  railIds: ['SWIFT', 'FEDWIRE'],
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('saveDraft + loadDraft — round trip', () => {
  it('persists and reloads a draft for a specific client', () => {
    saveDraft('client-A', SAMPLE_DRAFT);
    expect(loadDraft('client-A')).toEqual(SAMPLE_DRAFT);
  });

  it('keeps drafts isolated between clients', () => {
    saveDraft('client-A', SAMPLE_DRAFT);
    saveDraft('client-B', { ...SAMPLE_DRAFT, accountId: 'other' });
    expect(loadDraft('client-A')?.accountId).toBe('acc-1');
    expect(loadDraft('client-B')?.accountId).toBe('other');
  });
});

describe('loadDraft — defensive cases', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDraft('unknown')).toBe(null);
  });

  it('returns null when the saved record is malformed JSON', () => {
    window.localStorage.setItem('ops:account-instructions:draft:bad', '{not valid json');
    expect(loadDraft('bad')).toBe(null);
  });

  it('returns null when step is invalid', () => {
    window.localStorage.setItem(
      'ops:account-instructions:draft:bad',
      JSON.stringify({ ...SAMPLE_DRAFT, step: 'made-up-step' }),
    );
    expect(loadDraft('bad')).toBe(null);
  });

  it('returns null when railIds is not an array', () => {
    window.localStorage.setItem(
      'ops:account-instructions:draft:bad',
      JSON.stringify({ ...SAMPLE_DRAFT, railIds: 'SWIFT' }),
    );
    expect(loadDraft('bad')).toBe(null);
  });

  it('returns null when formValues is not an object', () => {
    window.localStorage.setItem(
      'ops:account-instructions:draft:bad',
      JSON.stringify({ ...SAMPLE_DRAFT, formValues: 'banana' }),
    );
    expect(loadDraft('bad')).toBe(null);
  });
});

describe('clearDraft', () => {
  it('removes the saved draft for the given client', () => {
    saveDraft('client-A', SAMPLE_DRAFT);
    clearDraft('client-A');
    expect(loadDraft('client-A')).toBe(null);
  });

  it('does not affect other clients drafts', () => {
    saveDraft('client-A', SAMPLE_DRAFT);
    saveDraft('client-B', SAMPLE_DRAFT);
    clearDraft('client-A');
    expect(loadDraft('client-A')).toBe(null);
    expect(loadDraft('client-B')).toEqual(SAMPLE_DRAFT);
  });

  it('is idempotent (clearing a non-existent draft is a no-op)', () => {
    expect(() => clearDraft('client-A')).not.toThrow();
  });
});
