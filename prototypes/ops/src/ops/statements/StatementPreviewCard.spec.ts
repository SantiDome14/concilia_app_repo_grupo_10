import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatementPreviewCard from './StatementPreviewCard.vue';
import type { Account, Client } from '@/ops/clients/types';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c-1',
    name: 'ACME Foods',
    email: 'ops@acme.com',
    tax_number: '20-12345678-9',
    docket: 'A1',
    is_active: true,
    metadata: { status: 'ACTIVE' },
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-001',
    account_number: 'acc-001',
    balance: '12.500,00',
    currency: { id: 'ars-id', name: 'ARS' },
    instructions: [],
    ...overrides,
  };
}

const RANGE = { from: new Date(2026, 4, 1), to: new Date(2026, 4, 8) };

describe('StatementPreviewCard', () => {
  it('renders the canonical heading and three lines', () => {
    const w = mount(StatementPreviewCard, {
      props: {
        client: makeClient(),
        account: makeAccount(),
        range: RANGE,
      },
    });
    const text = w.text();
    expect(text).toContain('Resumen');
    expect(text).toContain('ACME Foods');
    expect(text).toContain('acc-001');
    expect(text).toContain('ARS');
    expect(text).toContain('01/05/2026');
    expect(text).toContain('08/05/2026');
  });

  it('falls back to "Cliente sin nombre" when client.name is null', () => {
    const w = mount(StatementPreviewCard, {
      props: {
        client: makeClient({ name: null }),
        account: makeAccount(),
        range: RANGE,
      },
    });
    expect(w.text()).toContain('Cliente sin nombre');
  });

  it('uppercases the currency label', () => {
    const w = mount(StatementPreviewCard, {
      props: {
        client: makeClient(),
        account: makeAccount({ currency: { id: 'usd-id', name: 'usd' } }),
        range: RANGE,
      },
    });
    expect(w.text()).toContain('acc-001 · USD');
  });

  it('handles missing currency by rendering ???', () => {
    const w = mount(StatementPreviewCard, {
      props: {
        client: makeClient(),
        account: makeAccount({ currency: null }),
        range: RANGE,
      },
    });
    expect(w.text()).toContain('???');
  });

  it('formats single-digit days with leading zeros', () => {
    const w = mount(StatementPreviewCard, {
      props: {
        client: makeClient(),
        account: makeAccount(),
        range: { from: new Date(2026, 0, 3), to: new Date(2026, 0, 9) },
      },
    });
    expect(w.text()).toContain('03/01/2026');
    expect(w.text()).toContain('09/01/2026');
  });
});
