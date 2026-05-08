import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AccountsTable from './AccountsTable.vue';
import type { PspAccount } from './types';

function makeAccount(overrides: Partial<PspAccount> = {}): PspAccount {
  return {
    id: 'a-1',
    account_number: '00701234567',
    currency: 'ARS',
    balance: '12500.00',
    owner: 'ACME',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    ...overrides,
  };
}

describe('AccountsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(AccountsTable, {
      props: { rows: [], isLoading: true, hasActiveFilters: false },
    });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters', () => {
    const w = mount(AccountsTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: false },
    });
    expect(w.text()).toContain('Sin cuentas');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear button', async () => {
    const w = mount(AccountsTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: true },
    });
    expect(w.text()).toContain('Sin resultados');
    const btn = w.find('button');
    expect(btn.text()).toContain('Limpiar filtros');
    await btn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical column set', () => {
    const w = mount(AccountsTable, {
      props: { rows: [makeAccount()], isLoading: false, hasActiveFilters: false },
    });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual(['Cuenta', 'Sponsor', 'Currency', 'Balance', 'Owner', 'Estado']);
  });

  it('renders the sponsor label via getSponsorLabel', () => {
    const w = mount(AccountsTable, {
      props: {
        rows: [makeAccount({ sponsor: 'COINAG' })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(w.text()).toContain('COINAG');
  });

  it('renders em-dash for missing sponsor', () => {
    const w = mount(AccountsTable, {
      props: {
        rows: [makeAccount({ sponsor: null })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    const row = w.find('tbody tr');
    expect(row.text()).toContain('—');
  });

  it('renders status badge with semantic variant', () => {
    const wActive = mount(AccountsTable, {
      props: {
        rows: [makeAccount({ status: 'ACTIVE' })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(wActive.html()).toContain('text-success');

    const wPaused = mount(AccountsTable, {
      props: {
        rows: [makeAccount({ status: 'PAUSED' })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(wPaused.html()).toContain('text-warning');
  });

  it('emits row-click with the account when a row is clicked', async () => {
    const account = makeAccount();
    const w = mount(AccountsTable, {
      props: { rows: [account], isLoading: false, hasActiveFilters: false },
    });
    await w.find(`[data-testid="account-row-${account.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([account]);
  });

  it('formats the balance with thousand separators + 2 decimals', () => {
    const w = mount(AccountsTable, {
      props: {
        rows: [makeAccount({ balance: '1234567.5' })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(w.text()).toContain('$1,234,567.50');
  });
});
