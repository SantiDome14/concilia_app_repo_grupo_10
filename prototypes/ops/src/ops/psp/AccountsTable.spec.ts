import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AccountsTable from './AccountsTable.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import {
  OPS_PSP_CUENTAS_MANIFEST,
  OPS_PSP_CUENTAS_MANIFEST_KEY,
} from '@/manifests/ops.psp.cuentas.actions';
import type { PspAccount } from './types';

beforeEach(() => {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(
    OPS_PSP_CUENTAS_MANIFEST_KEY,
    OPS_PSP_CUENTAS_MANIFEST,
  );
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['OPS_ADMIN'],
  });
});

function makeAccount(overrides: Partial<PspAccount> = {}): PspAccount {
  return {
    id: 'a-1',
    account_number: '00701234567',
    currency: 'ARS',
    balance: '12500.00',
    owner: 'ACME',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    parent_cbu_id: 'psp-cbu-coinag-1',
    ...overrides,
  };
}

function mountTable(props: {
  rows: PspAccount[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  parentLookup?: Record<string, string>;
}) {
  return mount(AccountsTable, {
    props: {
      rows: props.rows,
      isLoading: props.isLoading,
      hasActiveFilters: props.hasActiveFilters,
      parentLookup: props.parentLookup ?? { 'psp-cbu-coinag-1': 'CBU-COINAG-1' },
      manifestKey: OPS_PSP_CUENTAS_MANIFEST_KEY,
    },
  });
}

describe('AccountsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mountTable({ rows: [], isLoading: true, hasActiveFilters: false });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters', () => {
    const w = mountTable({ rows: [], isLoading: false, hasActiveFilters: false });
    expect(w.text()).toContain('Sin cuentas');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear button', async () => {
    const w = mountTable({ rows: [], isLoading: false, hasActiveFilters: true });
    expect(w.text()).toContain('Sin resultados');
    const btn = w.find('button');
    expect(btn.text()).toContain('Limpiar filtros');
    await btn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical 8-column header set (incl. Parent + Acciones)', () => {
    const w = mountTable({
      rows: [makeAccount()],
      isLoading: false,
      hasActiveFilters: false,
    });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Cuenta',
      'Parent',
      'Partner',
      'Currency',
      'Balance',
      'Cliente',
      'Estado',
      'Acciones',
    ]);
  });

  it('renders the parent CBU number from the lookup', () => {
    const w = mountTable({
      rows: [makeAccount({ parent_cbu_id: 'psp-cbu-coinag-1' })],
      isLoading: false,
      hasActiveFilters: false,
      parentLookup: { 'psp-cbu-coinag-1': '00028839CBU1' },
    });
    expect(w.text()).toContain('00028839CBU1');
  });

  it('renders the sponsor label via getSponsorLabel', () => {
    const w = mountTable({
      rows: [makeAccount({ sponsor: 'COINAG' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(w.text()).toContain('COINAG');
  });

  it('renders status badge with semantic variant', () => {
    const wActive = mountTable({
      rows: [makeAccount({ status: 'ACTIVE' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(wActive.html()).toContain('text-success');

    const wPaused = mountTable({
      rows: [makeAccount({ status: 'PAUSED' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(wPaused.html()).toContain('text-warning');
  });

  it('emits row-click with the account when a row is clicked', async () => {
    const account = makeAccount();
    const w = mountTable({ rows: [account], isLoading: false, hasActiveFilters: false });
    await w.find(`[data-testid="account-row-${account.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([account]);
  });

  it('formats the balance with thousand separators + 2 decimals', () => {
    const w = mountTable({
      rows: [makeAccount({ balance: '1234567.5' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(w.text()).toContain('$1,234,567.50');
  });

  it('renders one manifest-driven Acciones trigger per row', () => {
    const w = mountTable({
      rows: [makeAccount(), makeAccount({ id: 'a-2' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    const triggers = w.findAll('[data-testid="manifest-actions-trigger"]');
    expect(triggers.length).toBe(2);
  });
});
