import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import TradesTable from './TradesTable.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import {
  OPS_TRADES_MANIFEST,
  OPS_TRADES_MANIFEST_KEY,
} from '@/manifests/ops.trades.actions';
import type { Quote } from './types';

beforeEach(() => {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(OPS_TRADES_MANIFEST_KEY, OPS_TRADES_MANIFEST);
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['OPS_ADMIN'],
  });
});

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    client_id: 'c-1',
    client_name: 'Acme',
    origin_currency: 'USD',
    destination_currency: 'ARS',
    operation: 'BUY',
    term: 'T1',
    origin_amount: '1000.00',
    destination_amount: '500000.00',
    exchange_rate: '500.00',
    status: 'ACCEPTED',
    created_at: '2026-05-08T12:00:00Z',
    ...overrides,
  };
}

function mountTable(props: {
  rows: Quote[];
  isLoading: boolean;
  hasActiveFilters?: boolean;
}) {
  return mount(TradesTable, {
    props: {
      rows: props.rows,
      isLoading: props.isLoading,
      hasActiveFilters: props.hasActiveFilters ?? false,
      manifestKey: OPS_TRADES_MANIFEST_KEY,
    },
  });
}

describe('TradesTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mountTable({ rows: [], isLoading: true });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the empty state when there are no quotes and no filters', () => {
    const w = mountTable({ rows: [], isLoading: false });
    expect(w.text()).toContain('Sin cotizaciones');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear-filters button', async () => {
    const w = mountTable({ rows: [], isLoading: false, hasActiveFilters: true });
    expect(w.text()).toContain('Sin resultados');
    const btn = w.find('button');
    expect(btn.text()).toContain('Limpiar filtros');
    await btn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical 11-column header set in the operator-approved order', () => {
    const w = mountTable({ rows: [makeQuote()], isLoading: false });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'ID',
      'Fecha',
      'Cliente',
      'Operación',
      'Par',
      'Término',
      'Monto',
      'TC',
      'Calculated',
      'Status',
      'Acciones',
    ]);
  });

  it('renders BUY operations in success tone, SELL in danger', () => {
    const wBuy = mountTable({ rows: [makeQuote({ operation: 'BUY' })], isLoading: false });
    expect(wBuy.html()).toContain('text-success');

    const wSell = mountTable({ rows: [makeQuote({ operation: 'SELL' })], isLoading: false });
    expect(wSell.html()).toContain('text-danger');
  });

  it('renders the currency pair USD/ARS', () => {
    const w = mountTable({ rows: [makeQuote()], isLoading: false });
    expect(w.text()).toContain('USD/ARS');
  });

  it('renders the row ID in monospaced text', () => {
    const w = mountTable({ rows: [makeQuote({ id: 'q-abc' })], isLoading: false });
    expect(w.text()).toContain('q-abc');
  });

  it('renders amounts with thousand separators + currency suffix', () => {
    const w = mountTable({ rows: [makeQuote()], isLoading: false });
    expect(w.text()).toContain('1,000.00 USD');
    expect(w.text()).toContain('500,000.00 ARS');
  });

  it('renders different status badges with the correct semantic tone', () => {
    const wAccepted = mountTable({ rows: [makeQuote({ status: 'ACCEPTED' })], isLoading: false });
    expect(wAccepted.html()).toContain('text-success');

    const wExpired = mountTable({ rows: [makeQuote({ status: 'EXPIRED' })], isLoading: false });
    expect(wExpired.html()).toContain('text-danger');

    const wPending = mountTable({ rows: [makeQuote({ status: 'PENDING' })], isLoading: false });
    expect(wPending.html()).toContain('text-warning');
  });

  it('renders the manifest-driven Acciones trigger per row', () => {
    const w = mountTable({
      rows: [makeQuote(), makeQuote({ id: 'q-2' })],
      isLoading: false,
    });
    const triggers = w.findAll('[data-testid="manifest-actions-trigger"]');
    expect(triggers.length).toBe(2);
  });

  it('emits row-click with the quote when a row is clicked', async () => {
    const quote = makeQuote();
    const w = mountTable({ rows: [quote], isLoading: false });
    await w.find(`[data-testid="quote-row-${quote.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([quote]);
  });
});
