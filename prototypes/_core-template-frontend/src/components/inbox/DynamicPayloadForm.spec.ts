import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DynamicPayloadForm from './DynamicPayloadForm.vue';
import type { FieldConfig } from '@/types/dynamic-form';

// Native <select> is forbidden in the template (`core-forms`). The
// shadcn-vue Select uses reka-ui Popover under the hood; stub the
// popover layer so JSDOM renders the items inline for assertions.
const POPOVER_STUBS = {
  Popover: { template: '<div><slot /></div>' },
  PopoverTrigger: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
  PopoverContent: {
    template: '<div v-bind="$attrs"><slot /></div>',
    inheritAttrs: false,
  },
};

const SCHEMA: FieldConfig[] = [
  {
    id: 'title',
    type: 'text',
    label: 'Título',
    required: true,
  },
  {
    id: 'description',
    type: 'textarea',
    label: 'Descripción',
  },
  {
    id: 'amount',
    type: 'number',
    label: 'Monto',
    required: true,
  },
];

describe('DynamicPayloadForm', () => {
  it('renders one input per field with the correct label', () => {
    const wrapper = mount(DynamicPayloadForm, {
      props: { schema: SCHEMA, modelValue: {} },
      global: { stubs: POPOVER_STUBS },
    });
    expect(wrapper.text()).toContain('Título');
    expect(wrapper.text()).toContain('Descripción');
    expect(wrapper.text()).toContain('Monto');
    // Required-field asterisk on `title` and `amount`, not on `description`.
    const labels = wrapper.findAll('label');
    expect(labels.length).toBeGreaterThanOrEqual(3);
  });

  it('emits `validity: false` while a required field is empty and `true` once filled', async () => {
    const wrapper = mount(DynamicPayloadForm, {
      props: { schema: SCHEMA, modelValue: {} },
      global: { stubs: POPOVER_STUBS },
    });
    await flushPromises();
    const validityEvents = wrapper.emitted('validity') as
      | Array<[boolean]>
      | undefined;
    expect(validityEvents).toBeTruthy();
    const last = validityEvents!.at(-1)![0];
    expect(last).toBe(false);

    // Fill the required fields via emitted update events on the inputs.
    const inputs = wrapper.findAll('input');
    // text input
    await inputs[0]!.setValue('Hello');
    // number input
    await inputs[1]!.setValue('100');
    await flushPromises();
    const last2 = (wrapper.emitted('validity') as Array<[boolean]>).at(-1)![0];
    expect(last2).toBe(true);
  });

  it('surfaces schemaError when the schema is invalid', () => {
    const badSchema = [
      { id: '', type: 'text', label: 'Bad' },
    ] as unknown as FieldConfig[];
    const wrapper = mount(DynamicPayloadForm, {
      props: { schema: badSchema, modelValue: {} },
      global: { stubs: POPOVER_STUBS },
    });
    expect(wrapper.text()).toContain('Schema invalid');
  });
});
