import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TradesTable from './TradesTable.vue';
import type { Quote } from './types';

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: 'q-1',
    client_id: 'c-1',
    client_name: 'Acme',
    origin_currency: 'USD',
    destination_currency: 'ARS',
    operation: 'BUY',
    term: 'T+1',
    origin_amount: '1000.00',
    destination_amount: '500000.00',
    exchange_rate: '500.00',
    status: 'ACCEPTED',
    created_at: '2026-05-08T12:00:00Z',
    ...overrides,
  };
}

describe('TradesTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(TradesTable, { props: { rows: [], isLoading: true } });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the empty state when there are no quotes', () => {
    const w = mount(TradesTable, { props: { rows: [], isLoading: false } });
    expect(w.text()).toContain('Sin quotes');
  });

  it('renders the canonical 9-column header set', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote()], isLoading: false } });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Cliente',
      'Par',
      'Operación',
      'Term',
      'Monto',
      'Rate',
      'Calculado',
      'Estado',
      'Fecha',
    ]);
  });

  it('renders BUY operations in success tone, SELL in danger', () => {
    const wBuy = mount(TradesTable, { props: { rows: [makeQuote({ operation: 'BUY' })], isLoading: false } });
    expect(wBuy.html()).toContain('text-success');

    const wSell = mount(TradesTable, { props: { rows: [makeQuote({ operation: 'SELL' })], isLoading: false } });
    expect(wSell.html()).toContain('text-danger');
  });

  it('renders the currency pair USD/ARS', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote()], isLoading: false } });
    expect(w.text()).toContain('USD/ARS');
  });

  it('renders amounts with currency prefix and 2 decimals', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote()], isLoading: false } });
    expect(w.text()).toContain('USD $1,000.00');
    expect(w.text()).toContain('ARS $500,000.00');
  });

  it('rows are NOT clickable (cursor-default per v1 read-only scope)', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote()], isLoading: false } });
    const row = w.find('tbody tr');
    expect(row.classes()).toContain('cursor-default');
    expect(row.classes()).not.toContain('cursor-pointer');
  });

  it('Status badge surfaces the deferral tooltip on hover (Decision 6d)', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote()], isLoading: false } });
    const badgeContainer = w.find('tbody tr td:nth-child(8) span');
    expect(badgeContainer.attributes('title')).toBe('Acciones de quote disponibles próximamente');
  });

  it('renders the read-only status as a Badge (no clickable button)', () => {
    const w = mount(TradesTable, { props: { rows: [makeQuote({ status: 'ACCEPTED' })], isLoading: false } });
    const buttons = w.findAll('tbody button');
    expect(buttons).toHaveLength(0);
  });

  it('renders different status badges with the correct semantic tone', () => {
    const wAccepted = mount(TradesTable, { props: { rows: [makeQuote({ status: 'ACCEPTED' })], isLoading: false } });
    expect(wAccepted.html()).toContain('text-success');

    const wExpired = mount(TradesTable, { props: { rows: [makeQuote({ status: 'EXPIRED' })], isLoading: false } });
    expect(wExpired.html()).toContain('text-danger');

    const wPending = mount(TradesTable, { props: { rows: [makeQuote({ status: 'PENDING' })], isLoading: false } });
    expect(wPending.html()).toContain('text-warning');
  });
});
