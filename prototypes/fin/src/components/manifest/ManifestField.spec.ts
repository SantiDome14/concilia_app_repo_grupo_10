import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ManifestField from './ManifestField.vue';
import {
  registerCatalog,
  _clearCatalogRegistry,
} from '@/lib/manifest/catalog';
import type { DialogField } from '@/lib/manifest';

beforeEach(() => {
  _clearCatalogRegistry();
});

function mountField(field: DialogField, modelValue: unknown = null, error: string | null = null) {
  return mount(ManifestField, {
    props: {
      field,
      modelValue,
      formValues: {},
      record: undefined,
      error,
    },
    global: {
      stubs: {
        // Stub primitives that depend on portal/popover internals so the
        // assertion focuses on type dispatch + label/error rendering.
        Select: { template: '<div class="stub-select"><slot /></div>' },
        SelectTrigger: { template: '<div><slot /></div>' },
        SelectContent: { template: '<div><slot /></div>' },
        SelectItem: { template: '<div class="stub-select-item"><slot /></div>' },
        SelectValue: { template: '<div />' },
        Popover: { template: '<div class="stub-popover"><slot /></div>' },
        PopoverTrigger: { template: '<div><slot /></div>' },
        PopoverContent: { template: '<div><slot /></div>' },
        Command: { template: '<div><slot /></div>' },
        CommandInput: { template: '<input class="stub-command-input" />' },
        CommandList: { template: '<div><slot /></div>' },
        CommandEmpty: { template: '<div class="stub-command-empty"><slot /></div>' },
        CommandItem: { template: '<div><slot /></div>' },
        Checkbox: { template: '<input type="checkbox" class="stub-checkbox" />' },
      },
    },
  });
}

describe('ManifestField', () => {
  it('renders a text input for type:"text"', () => {
    const w = mountField({ id: 'name', label: 'Nombre', type: 'text' });
    expect(w.find('input[type="text"]').exists()).toBe(true);
  });

  it('renders a textarea for type:"textarea" with maxlength', () => {
    const w = mountField({
      id: 'note',
      label: 'Nota',
      type: 'textarea',
      max_length: 250,
    });
    const ta = w.find('textarea');
    expect(ta.exists()).toBe(true);
    expect(ta.attributes('maxlength')).toBe('250');
  });

  it('renders a number input for type:"number"', () => {
    const w = mountField({ id: 'qty', label: 'Cantidad', type: 'number', min: 0, max: 10 });
    const inp = w.find('input[type="number"]');
    expect(inp.exists()).toBe(true);
    expect(inp.attributes('min')).toBe('0');
    expect(inp.attributes('max')).toBe('10');
  });

  it('renders a date input for type:"date"', () => {
    const w = mountField({ id: 'when', label: 'Fecha', type: 'date' });
    expect(w.find('input[type="date"]').exists()).toBe(true);
  });

  it('renders a checkbox for type:"boolean"', () => {
    const w = mountField({ id: 'flag', label: 'Marcar', type: 'boolean' });
    expect(w.find('.stub-checkbox').exists()).toBe(true);
  });

  it('renders a select primitive for type:"select"', () => {
    const w = mountField({
      id: 'cat',
      label: 'Categoría',
      type: 'select',
      options: [
        { value: 'A', label: 'Tipo A' },
        { value: 'B', label: 'Tipo B' },
      ],
    });
    expect(w.find('.stub-select').exists()).toBe(true);
    // No native <select> may appear (per core-forms).
    expect(w.find('select').exists()).toBe(false);
  });

  it('renders a popover-driven lookup for type:"lookup"', () => {
    const w = mountField({
      id: 'cliente_id',
      label: 'Cliente',
      type: 'lookup',
      catalog: 'fin.clientes',
    });
    expect(w.find('.stub-popover').exists()).toBe(true);
  });

  it('renders the required asterisk on the label', () => {
    const w = mountField({ id: 'name', label: 'Nombre', type: 'text', required: true });
    const label = w.find('label');
    // The asterisk is added via Tailwind `after:content-['*']`; we assert
    // the class is present rather than the rendered glyph.
    expect(label.classes().some((c) => c.includes("after:content-['*']"))).toBe(true);
  });

  it('renders error text below in danger color', () => {
    const w = mountField(
      { id: 'name', label: 'Nombre', type: 'text', required: true },
      '',
      'Falta el nombre',
    );
    const err = w.find('.text-danger');
    expect(err.exists()).toBe(true);
    expect(err.text()).toBe('Falta el nombre');
  });

  it('lookup with null filter renders the empty-state hint', async () => {
    registerCatalog('fin.cuentas', () => [{ value: 'C-1', label: 'Caja' }]);
    const w = mount(ManifestField, {
      props: {
        field: {
          id: 'cuenta_id',
          label: 'Cuenta',
          type: 'lookup',
          catalog: 'fin.cuentas',
          catalog_filter: { field: 'sociedad_id', from_record: 'sociedad_id' },
        },
        modelValue: null,
        record: { sociedad_id: null },
        formValues: {},
      },
      global: {
        stubs: {
          Popover: { template: '<div><slot /></div>' },
          PopoverTrigger: { template: '<div><slot /></div>' },
          PopoverContent: { template: '<div><slot /></div>' },
          Command: { template: '<div><slot /></div>' },
          CommandInput: { template: '<input :disabled="$attrs.disabled" class="ci" />' },
          CommandList: { template: '<div><slot /></div>' },
          CommandEmpty: { template: '<div class="empty"><slot /></div>' },
          CommandItem: { template: '<div><slot /></div>' },
        },
      },
    });
    // The empty-state slot is bound to `lookupFilterValue === null` which
    // is true on first render (since the watch on lookupOpen hasn't run).
    // We force a render after open=true triggers the reload:
    await w.setData({});
    expect(w.find('.empty').exists()).toBe(true);
  });
});
