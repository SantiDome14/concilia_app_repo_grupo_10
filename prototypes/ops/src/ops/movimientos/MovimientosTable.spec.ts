import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import MovimientosTable from './MovimientosTable.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import {
  OPS_MOVIMIENTOS_MANIFEST,
  OPS_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/ops.movimientos.actions';
import type { Movement } from './types';

beforeEach(() => {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(
    OPS_MOVIMIENTOS_MANIFEST_KEY,
    OPS_MOVIMIENTOS_MANIFEST,
  );
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['OPS_ADMIN'],
  });
});

function makeMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 'm-1',
    date: '2026-05-08',
    type: 'DEPOSIT',
    status: 'COMPLETED',
    amount: '1500.00',
    currency: 'USD',
    rail: 'SWIFT',
    origin: 'Acme Corp',
    destination: 'Coinag CVU',
    sponsor: 'COINAG',
    client: 'Acme',
    counterparty: 'BBVA',
    ...overrides,
  };
}

function mountTable(props: {
  rows: Movement[];
  isLoading: boolean;
  hasActiveFilters: boolean;
}) {
  return mount(MovimientosTable, {
    props: { ...props, manifestKey: OPS_MOVIMIENTOS_MANIFEST_KEY },
  });
}

describe('MovimientosTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mountTable({ rows: [], isLoading: true, hasActiveFilters: false });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters', () => {
    const w = mountTable({ rows: [], isLoading: false, hasActiveFilters: false });
    expect(w.text()).toContain('Sin movimientos');
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

  it('renders the canonical 9-column header set', () => {
    const w = mountTable({ rows: [makeMovement()], isLoading: false, hasActiveFilters: false });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'ID',
      'Fecha',
      'Cliente',
      'Rail',
      'Tipo',
      'Monto',
      'Estado',
      'Banco / Cuenta',
      'Acciones',
    ]);
  });

  it('renders the rail token in the Rail column', () => {
    const w = mountTable({ rows: [makeMovement()], isLoading: false, hasActiveFilters: false });
    expect(w.text()).toContain('SWIFT');
  });

  it('renders status badge with semantic variant', () => {
    const wPending = mountTable({
      rows: [makeMovement({ status: 'PENDING' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(wPending.html()).toContain('text-warning');

    const wDanger = mountTable({
      rows: [makeMovement({ status: 'FAILED' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(wDanger.html()).toContain('text-danger');
  });

  it('emits row-click with the movement when a row is clicked', async () => {
    const movement = makeMovement();
    const w = mountTable({ rows: [movement], isLoading: false, hasActiveFilters: false });
    await w.find(`[data-testid="movement-row-${movement.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([movement]);
  });

  it('renders "Sin asignar" badge when both origin and destination are null', () => {
    const w = mountTable({
      rows: [makeMovement({ origin: null, destination: null })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(w.text()).toContain('Sin asignar');
  });

  it('renders em-dash when client is null', () => {
    const w = mountTable({
      rows: [makeMovement({ client: null })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(w.text()).toContain('—');
  });

  it('formats amount with thousand separators + 2 decimals + currency', () => {
    const w = mountTable({
      rows: [makeMovement({ amount: '1234567.5' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    expect(w.text()).toContain('1,234,567.50 USD');
  });

  it('renders one manifest-driven Acciones menu trigger per row', () => {
    const w = mountTable({
      rows: [makeMovement(), makeMovement({ id: 'm-2' })],
      isLoading: false,
      hasActiveFilters: false,
    });
    const triggers = w.findAll('[data-testid="manifest-actions-trigger"]');
    expect(triggers.length).toBe(2);
  });
});
