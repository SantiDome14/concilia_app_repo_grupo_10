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
    portal_status: 'ACTIVE',
    has_coinag_instruction: false,
    ...overrides,
  };
}

// `<ManifestActionsMenu>` needs Pinia + the manifest registry to mount;
// the table's role under test is column layout / row-click bubbling so
// stub the menu out.
const STUBS = { ManifestActionsMenu: true } as const;

describe('ClientsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [],
        isLoading: true,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.findAll('tbody tr').length).toBe(5);
  });

  it('renders the canonical empty state when no filters are active', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.text()).toContain('No hay clientes');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state with clear button when filters are active', async () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [],
        isLoading: false,
        hasActiveFilters: true,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.text()).toContain('Sin resultados para los filtros aplicados');
    const clearBtn = w.find('button');
    expect(clearBtn.text()).toContain('Limpiar filtros');
    await clearBtn.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical 7-column header set in the contracted order', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient()],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Legajo',
      'Nombre',
      'CUIT/CUIL',
      'Email',
      'Portal',
      'Estado',
      'Acciones',
    ]);
  });

  it('renders the row with active badge + portal chip in canonical order', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient()],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    const row = w.find('tbody tr');
    expect(row.text()).toContain('A1');
    expect(row.text()).toContain('ACME');
    expect(row.text()).toContain('20-12345678-9');
    expect(row.text()).toContain('ops@acme.com');
    expect(row.text()).toContain('Activo');
    expect(row.find('[data-portal-status="ACTIVE"]').exists()).toBe(true);
  });

  it('shows em-dash placeholders when optional fields are missing', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ tax_number: null, email: null, name: null, docket: null })],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    const row = w.find('tbody tr');
    const dashes = row.text().match(/—/g);
    expect(dashes && dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('emits row-click with the client when the row is clicked', async () => {
    const c = makeClient();
    const w = mount(ClientsTable, {
      props: {
        rows: [c],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    await w.find(`[data-testid="client-row-${c.id}"]`).trigger('click');
    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([c]);
  });

  it('renders the No creado chip for clients without portal status', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ portal_status: 'NOT_CREATED', metadata: null })],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.text()).toContain('No creado');
    expect(w.find('[data-portal-status="NOT_CREATED"]').exists()).toBe(true);
  });

  it('renders the Pendiente chip for PENDING clients', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ portal_status: 'PENDING' })],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.text()).toContain('Pendiente');
    expect(w.find('[data-portal-status="PENDING"]').exists()).toBe(true);
  });

  it('shows Inactivo badge when is_active is false', () => {
    const w = mount(ClientsTable, {
      props: {
        rows: [makeClient({ is_active: false })],
        isLoading: false,
        hasActiveFilters: false,
        manifestKey: 'ops.clients',
      },
      global: { stubs: STUBS },
    });
    expect(w.find('tbody tr').text()).toContain('Inactivo');
  });
});
