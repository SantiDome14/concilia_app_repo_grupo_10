import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AccountInstructionPreviewCard from './AccountInstructionPreviewCard.vue';
import type { Account } from '@/ops/clients/types';
import type {
  AccountInstructionFormState,
  InstructionTemplate,
  Rail,
  TemplateAttribute,
} from './types';

const ACCOUNT: Account = {
  id: 'acc-1',
  account_number: 'acc-001',
  balance: '12.500,00',
  currency: { id: 'usd', name: 'USD' },
  instructions: [],
};
const TEMPLATE: InstructionTemplate = {
  id: 't-swift',
  name: 'SWIFT - BBVA',
  rail_name: 'SWIFT',
};
const ATTRS: TemplateAttribute[] = [
  { key: 'beneficiary_bank', default_value: 'BBVA' },
  { key: 'reference_code', default_value: 'REF-' },
];
const RAILS: Rail[] = [
  { id: 'r1', name: 'SWIFT' },
  { id: 'r2', name: 'FEDWIRE' },
  { id: 'r3', name: 'ACH' },
];

function makeState(
  overrides: Partial<AccountInstructionFormState> = {},
): AccountInstructionFormState {
  return {
    clientId: 'c-1',
    accounts: [ACCOUNT],
    selectedAccountId: 'acc-1',
    selectedTemplateId: 't-swift',
    templateAttributes: ATTRS,
    formValues: { beneficiary_bank: 'BBVA', reference_code: 'REF-D42ACME' },
    fieldErrors: {},
    selectedRailIds: ['r1', 'r2'],
    ...overrides,
  };
}

describe('AccountInstructionPreviewCard', () => {
  it('renders the canonical heading + 3 sections when all selections are present', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState(),
        template: TEMPLATE,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    const text = w.text();
    expect(text).toContain('Resumen');
    expect(text).toContain('USD');
    expect(text).toContain('acc-001');
    expect(text).toContain('SWIFT - BBVA');
    expect(text).toContain('SWIFT, FEDWIRE');
  });

  it('does NOT render when selectedRailIds is empty', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState({ selectedRailIds: [] }),
        template: TEMPLATE,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    expect(w.find('[data-testid="account-instruction-preview-card"]').exists()).toBe(false);
  });

  it('does NOT render when account is unselectable', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState({ selectedAccountId: null }),
        template: TEMPLATE,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    expect(w.find('[data-testid="account-instruction-preview-card"]').exists()).toBe(false);
  });

  it('does NOT render when template prop is null', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState(),
        template: null,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    expect(w.find('[data-testid="account-instruction-preview-card"]').exists()).toBe(false);
  });

  it('exposes a collapsible <details> for the values block', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState(),
        template: TEMPLATE,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    const details = w.find('[data-testid="account-instruction-preview-values"]');
    expect(details.exists()).toBe(true);
    expect(details.text()).toContain('Valores (2)');
    expect(details.text()).toContain('Beneficiary Bank');
    expect(details.text()).toContain('REF-D42ACME');
  });

  it('falls back to em-dash for empty values in the table', () => {
    const w = mount(AccountInstructionPreviewCard, {
      props: {
        formState: makeState({ formValues: { beneficiary_bank: 'BBVA' } }),
        template: TEMPLATE,
        attributes: ATTRS,
        rails: RAILS,
      },
    });
    expect(w.text()).toContain('—');
  });
});
