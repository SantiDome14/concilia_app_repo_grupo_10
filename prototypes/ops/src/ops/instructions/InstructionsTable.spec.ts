import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InstructionsTable from './InstructionsTable.vue';
import type { Instruction } from './types';

function makeInstruction(overrides: Partial<Instruction> = {}): Instruction {
  return {
    id: 'i-1',
    name: 'Pago a proveedor X',
    currency_id: 'ARS',
    description: 'Instrucciones de pago al proveedor X',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    attributes_count: 3,
    ...overrides,
  };
}

const CURRENCY_LABELS = { ARS: 'ARS', USD: 'USD' };

describe('InstructionsTable', () => {
  it('renders skeleton rows while loading', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [],
        isLoading: true,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    // 5 skeleton rows declared in the loading template.
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
      },
    });

    expect(w.text()).toContain('No hay instrucciones cargadas');
    expect(w.text()).toContain('+ Crear instrucción');
    expect(w.text()).not.toContain('Limpiar filtros');
  });

  it('renders the filtered empty state and exposes Limpiar filtros when filters are active', async () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [],
        isLoading: false,
        hasActiveFilters: true,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    expect(w.text()).toContain('Sin resultados para los filtros aplicados');
    const clearButton = w.find('button');
    expect(clearButton.text()).toContain('Limpiar filtros');

    await clearButton.trigger('click');
    expect(w.emitted('clear-filters')).toBeTruthy();
  });

  it('renders the canonical column set with currency label and attribute badge', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction({ id: 'i-7', attributes_count: 4, currency_id: 'USD' })],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual(['Nombre', 'Moneda', 'Descripción', 'Atributos']);

    const row = w.find('tbody tr');
    expect(row.text()).toContain('Pago a proveedor X');
    expect(row.text()).toContain('USD');
    expect(row.text()).toContain('4');
  });

  it('renders an em-dash placeholder when description is null', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction({ description: null })],
        isLoading: false,
        hasActiveFilters: false,
        currencyLabels: CURRENCY_LABELS,
      },
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
        canEdit: true,
        canDelete: true,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    // Click a non-actions cell (the Nombre cell).
    const nombreCell = w.findAll('tbody tr td')[0];
    await nombreCell.trigger('click');

    expect(w.emitted('row-click')).toBeTruthy();
    expect(w.emitted('row-click')?.[0]).toEqual([inst]);
  });

  it('does not emit row-click when the click target is inside [data-actions-cell]', async () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction()],
        isLoading: false,
        hasActiveFilters: false,
        canEdit: true,
        canDelete: true,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    const actionsCell = w.find('[data-actions-cell]');
    expect(actionsCell.exists()).toBe(true);
    await actionsCell.trigger('click');

    expect(w.emitted('row-click')).toBeFalsy();
  });

  it('hides the Acciones column entirely when neither canEdit nor canDelete is true', () => {
    const w = mount(InstructionsTable, {
      props: {
        rows: [makeInstruction()],
        isLoading: false,
        hasActiveFilters: false,
        canEdit: false,
        canDelete: false,
        currencyLabels: CURRENCY_LABELS,
      },
    });

    expect(w.find('[data-actions-cell]').exists()).toBe(false);
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).not.toContain('Acciones');
  });
});
