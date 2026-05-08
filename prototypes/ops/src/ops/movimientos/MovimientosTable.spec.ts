import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovimientosTable from './MovimientosTable.vue';
import type { Movement } from './types';

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'm-1',
    date: '2026-05-08',
    type: 'DEPOSIT',
    status: 'COMPLETED',
    amount: '1500.00',
    currency: 'USD',
    origin: 'Acme Corp',
    destination: 'Coinag CVU',
    sponsor: 'COINAG',
    client: 'Acme',
    counterparty: 'BBVA',
    ...overrides,
  };
}

describe('MovimientosTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(MovimientosTable, {
      props: { rows: [], isLoading: true, hasActiveFilters: false },
    });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters', () => {
    const w = mount(MovimientosTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: false },
    });
    expect(w.text()).toContain('Sin movimientos');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear button', async () => {
    const w = mount(MovimientosTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: true },
    });
    expect(w.text()).toContain('Sin resultados');
    const btn = w.find('button');
    expect(btn.text()).toContain('Limpiar filtros');
    await btn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical 9-column header set', () => {
    const w = mount(MovimientosTable, {
      props: { rows: [makeMovement()], isLoading: false, hasActiveFilters: false },
    });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Fecha',
      'Tipo',
      'Origen',
      'Destino',
      'Moneda',
      'Monto',
      'Estado',
      'Sponsor',
      'Cliente',
    ]);
  });

  it('renders sponsor label via getSponsorLabel', () => {
    const w = mount(MovimientosTable, {
      props: { rows: [makeMovement()], isLoading: false, hasActiveFilters: false },
    });
    expect(w.text()).toContain('COINAG');
  });

  it('renders status badge with semantic variant', () => {
    const wPending = mount(MovimientosTable, {
      props: { rows: [makeMovement({ status: 'PENDING' })], isLoading: false, hasActiveFilters: false },
    });
    expect(wPending.html()).toContain('text-warning');

    const wDanger = mount(MovimientosTable, {
      props: { rows: [makeMovement({ status: 'FAILED' })], isLoading: false, hasActiveFilters: false },
    });
    expect(wDanger.html()).toContain('text-danger');
  });

  it('emits row-click with the movement when a row is clicked', async () => {
    const movement = makeMovement();
    const w = mount(MovimientosTable, {
      props: { rows: [movement], isLoading: false, hasActiveFilters: false },
    });
    await w.find(`[data-testid="movement-row-${movement.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([movement]);
  });

  it('renders em-dash for missing optional fields', () => {
    const w = mount(MovimientosTable, {
      props: {
        rows: [makeMovement({ origin: null, destination: null, client: null })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    const dashes = (w.text().match(/—/g) ?? []).length;
    expect(dashes).toBeGreaterThanOrEqual(3);
  });

  it('formats amount with thousand separators + 2 decimals', () => {
    const w = mount(MovimientosTable, {
      props: {
        rows: [makeMovement({ amount: '1234567.5' })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(w.text()).toContain('$1,234,567.50');
  });
});
