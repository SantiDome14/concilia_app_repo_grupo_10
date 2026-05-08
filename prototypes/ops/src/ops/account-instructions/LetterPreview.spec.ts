import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LetterPreview from './LetterPreview.vue';
import type { Account } from '@/ops/clients/types';
import type { InstructionTemplate, TemplateAttribute } from './types';

const CLIENT = { name: 'ACME', docket: 'D42' };
const TEMPLATE: InstructionTemplate = {
  id: 't-swift',
  name: 'SWIFT - BBVA',
  rail_name: 'SWIFT',
};
const ATTRS: TemplateAttribute[] = [
  { key: 'beneficiary_bank', default_value: 'BBVA' },
  { key: 'reference_code', default_value: 'REF-' },
];
const ACCOUNT: Account = {
  id: 'acc-1',
  account_number: 'acc-001',
  balance: '12.500,00',
  currency: { id: 'usd', name: 'USD' },
  instructions: [],
};

describe('LetterPreview', () => {
  it('renders DRAFT badge + canonical heading', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: { beneficiary_bank: 'BBVA', reference_code: 'REF-D42ACME' },
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('DRAFT');
    expect(w.text()).toContain('Account Confirmation Letter');
  });

  it('renders the client name in the salutation', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: {},
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('Dear ACME,');
  });

  it('renders the docket as the unique client number', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: {},
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('Client number:');
    expect(w.text()).toContain('D42');
  });

  it('renders the rail name in the transfer instructions', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: {},
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('For SWIFT transfers');
  });

  it('renders one row per attribute with its current value', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: { beneficiary_bank: 'BBVA', reference_code: 'REF-D42ACME' },
        selectedAccount: ACCOUNT,
      },
    });
    const rows = w.findAll('[data-testid="letter-preview-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain('BBVA');
    expect(rows[1]!.text()).toContain('REF-D42ACME');
  });

  it('falls back to em-dash for empty values', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS,
        values: { beneficiary_bank: 'BBVA' }, // reference_code missing
        selectedAccount: ACCOUNT,
      },
    });
    const text = w.text();
    expect(text).toContain('Reference Code:');
    expect(text).toContain('—');
  });

  it('renders Account Number when no template attribute already covers it', () => {
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: ATTRS, // no `account_number` key
        values: {},
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('Account Number:');
    expect(w.text()).toContain('acc-001');
  });

  it('does NOT duplicate the Account Number when the template includes one', () => {
    const attrs: TemplateAttribute[] = [
      { key: 'account_number', default_value: '999' },
    ];
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: attrs,
        values: { account_number: '999' },
        selectedAccount: ACCOUNT,
      },
    });
    // Only one occurrence of "Account Number" in the body.
    const occurrences = (w.text().match(/Account Number/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('uses the attribute display label when provided', () => {
    const attrs: TemplateAttribute[] = [
      { key: 'iban', display: 'IBAN europeo', default_value: '' },
    ];
    const w = mount(LetterPreview, {
      props: {
        client: CLIENT,
        template: TEMPLATE,
        attributes: attrs,
        values: { iban: 'AR007' },
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('IBAN europeo:');
  });

  it('falls back gracefully when client.name is null', () => {
    const w = mount(LetterPreview, {
      props: {
        client: { name: null, docket: null },
        template: TEMPLATE,
        attributes: ATTRS,
        values: {},
        selectedAccount: ACCOUNT,
      },
    });
    expect(w.text()).toContain('Dear Cliente sin nombre,');
    expect(w.text()).toContain('Client number:');
    expect(w.text()).toContain('—');
  });
});
