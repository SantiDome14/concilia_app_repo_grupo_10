import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ClientsTable from './ClientsTable.vue';
import type { Client } from './types';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c-1',
    name: 'ACME',
    email: 'ops@acme.com',
    tax_number: '20-12345678-9',
    docket: 'A1',
    is_active: true,
    metadata: { status: 'ACTIVE' },
    ...overrides,
  };
}

describe('ClientsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(ClientsTable, {
      props: { rows: [], isLoading: true, hasActiveFilters: false },
    });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters are active', () => {
    const w = mount(ClientsTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: false },
    });
    expect(w.text()).toContain('No hay clientes');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear button when filters are active', async () => {
    const w = mount(ClientsTable, {
      props: { rows: [], isLoading: false, hasActiveFilters: true },
    });
    expect(w.text()).toContain('Sin resultados para los filtros aplicados');
    const clearBtn = w.find('button');
    expect(clearBtn.text()).toContain('Limpiar filtros');
    await clearBtn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical column set in the contracted order', () => {
    const w = mount(ClientsTable, {
      props: { rows: [makeClient()], isLoading: false, hasActiveFilters: false },
    });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual(['CUIT/CUIL', 'Nombre', 'Email', 'Activo', 'Estado Portal']);
  });

  it('renders cells with semantic colour for Activo and the portal-status badge', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ is_active: true, metadata: { status: 'ACTIVE' } })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    const row = w.find('tbody tr');
    expect(row.text()).toContain('20-12345678-9');
    expect(row.text()).toContain('ACME');
    expect(row.text()).toContain('ops@acme.com');
    expect(row.text()).toContain('Cuenta Validada');
    // Active icon present (lucide-vue-next renders inline svg with text-success class).
    expect(row.html()).toContain('text-success');
  });

  it('shows em-dash placeholders when optional fields are missing', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ tax_number: null, email: null, name: null })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    const row = w.find('tbody tr');
    // Three em-dashes: tax, name, email.
    const dashes = row.text().match(/—/g);
    expect(dashes && dashes.length).toBeGreaterThanOrEqual(3);
  });

  it('emits row-click with the client when the row is clicked', async () => {
    const c = makeClient();
    const w = mount(ClientsTable, {
      props: { rows: [c], isLoading: false, hasActiveFilters: false },
    });
    await w.find(`[data-testid="client-row-${c.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([c]);
  });

  it('renders the danger-toned portal badge for clients without portal', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ metadata: null })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(w.text()).toContain('Cuenta no Creada');
  });

  it('renders the warning-toned portal badge for PENDING clients', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ metadata: { status: 'PENDING' } })],
        isLoading: false,
        hasActiveFilters: false,
      },
    });
    expect(w.text()).toContain('Pendiente de Validación');
  });
});
