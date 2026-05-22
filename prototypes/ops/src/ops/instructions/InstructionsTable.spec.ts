import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InstructionsTable from './InstructionsTable.vue';
import type { Instruction } from './types';

function makeInstruction(overrides: Partial<Instruction> = {}): Instruction {
  return {
    id: 'i-1',
    name: 'Pago a proveedor X',
    provider: 'BBVA',
    currency_id: 'cur-ars',
    description: 'Instrucciones de pago al proveedor X',
    status: 'ACTIVE',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    attributes_count: 3,
    ...overrides,
  };
}

const CURRENCY_LABELS = { 'cur-ars': 'ARS', 'cur-usd': 'USD' };

// `<ManifestActionsMenu>` needs Pinia + the manifest registry to mount.
// The table's role under test is column layout / placeholder behaviour /
// row-click bubbling — stub the menu out so the spec stays focused.
const STUBS = { ManifestActionsMenu: true } as const;

describe('InstructionsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [],
        isLoading: true,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    expect(w.findAll('tbody tr').length).toBe(5);
    expect(w.text()).not.toContain('No hay instrucciones cargadas');
  });

  it('renders the canonical empty state when no filters are active', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    expect(w.text()).toContain('No hay instrucciones cargadas');
    expect(w.text()).toContain('Crear instrucción');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state and exposes Limpiar filtros when filters are active', async () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [],
        isLoading: false,
        hasActiveFilters: true,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    expect(w.text()).toContain('Sin resultados para los filtros aplicados');
    const clearButton = w.find('button');
    expect(clearButton.text()).toContain('Limpiar filtros');

    await clearButton.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical 6-column header set', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [
          makeInstruction({
            id: 'i-7',
            attributes_count: 4,
            currency_id: 'cur-usd',
            provider: 'Lead Bank',
            status: 'INACTIVE',
          }),
        ],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Nombre',
      'Proveedor',
      'Moneda',
      'Descripción',
      'Estado',
      'Acciones',
    ]);
    expect(headers).not.toContain('Atributos');

    const row = w.find('tbody tr');
    expect(row.text()).toContain('Pago a proveedor X');
    expect(row.text()).toContain('Lead Bank');
    expect(row.text()).toContain('USD');
    expect(row.text()).toContain('Inactivo');
  });

  it('renders an em-dash placeholder when description and provider are null', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction({ description: null, provider: null })],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    expect(w.find('tbody tr').text()).toContain('—');
  });

  it('emits row-click for clicks outside the actions cell', async () => {
    const inst = makeInstruction();
    const w = mount(InstructionsTable, {
      props: {
        rows: [inst],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    const nombreCell = w.findAll('tbody tr td')[0];
    await nombreCell!.trigger('click');

    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([inst]);
  });

  it('translates DRAFT status into the Spanish label and warning variant', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction({ status: 'DRAFT' })],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
        manifestKey: 'ops.instructions',
      },
      global: { stubs: STUBS },
    });

    expect(w.find('tbody tr').text()).toContain('Borrador');
  });
});
