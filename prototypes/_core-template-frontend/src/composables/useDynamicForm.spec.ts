import { describe, it, expect, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { useDynamicForm } from './useDynamicForm';
import { _clearFieldTypeRegistry } from '@/lib/manifest/field-type-registry';
import { _rebootstrapFieldTypes } from '@/lib/manifest/field-type-bootstrap';
import type { FieldConfig } from '@/types/dynamic-form';

interface AlertState extends Record<string, unknown> {
  side?: 'BUY' | 'SELL' | string;
  spread?: number | null;
  notes?: string;
}

beforeEach(() => {
  _clearFieldTypeRegistry();
  _rebootstrapFieldTypes();
});

describe('useDynamicForm — schema validation', () => {
  it('rejects an unknown field type and surfaces schemaError', () => {
    const schema: FieldConfig[] = [
      { id: 'foo', type: 'rich-text', label: 'Foo' },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.isReady.value).toBe(false);
    expect(form.schemaError.value).toContain("Unknown field type 'rich-text'");
  });

  it("rejects a 'select' field without options", () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'select', label: 'Lado', required: true },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.isReady.value).toBe(false);
    expect(form.schemaError.value).toContain('missing required');
  });

  it('rejects duplicate field ids', () => {
    const schema: FieldConfig[] = [
      { id: 'a', type: 'text', label: 'A' },
      { id: 'a', type: 'text', label: 'A again' },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.isReady.value).toBe(false);
    expect(form.schemaError.value).toContain('Duplicate');
  });

  it("rejects a 'conditional' that references an unknown field id", () => {
    const schema: FieldConfig[] = [
      {
        id: 'spread',
        type: 'number',
        label: 'Spread',
        conditional: { field: 'nonexistent', value: 'BUY' },
      },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.isReady.value).toBe(false);
    expect(form.schemaError.value).toContain("unknown conditional.field 'nonexistent'");
  });

  it('parses a valid schema and exposes the typed field list', () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'select', label: 'Lado', options: [
        { value: 'BUY', label: 'Buy' }, { value: 'SELL', label: 'Sell' },
      ] },
      { id: 'spread', type: 'number', label: 'Spread' },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.isReady.value).toBe(true);
    expect(form.fields.value.map((f) => f.id)).toEqual(['side', 'spread']);
    expect(form.schemaError.value).toBeNull();
  });
});

describe('useDynamicForm — defaults & state', () => {
  it('initializes formState from per-field defaults', () => {
    const schema: FieldConfig[] = [
      { id: 'flag', type: 'boolean', label: 'Flag' },
      { id: 'side', type: 'select', label: 'Lado', defaults: 'BUY', options: [
        { value: 'BUY', label: 'Buy' }, { value: 'SELL', label: 'Sell' },
      ] },
      { id: 'spread', type: 'number', label: 'Spread' },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.formState.value.flag).toBe(false); // boolean default
    expect(form.formState.value.side).toBe('BUY'); // declared default
    expect(form.formState.value.spread).toBeNull(); // number default
  });

  it('preserves initialState values that match field ids', () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado' },
    ];
    const form = useDynamicForm<AlertState>(schema, {
      initialState: { side: 'BUY' } as AlertState,
    });
    expect(form.formState.value.side).toBe('BUY');
  });

  it('reset() returns formState to the initial defaults', async () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado', defaults: 'SELL' },
    ];
    const form = useDynamicForm<AlertState>(schema);
    form.formState.value.side = 'BUY';
    expect(form.formState.value.side).toBe('BUY');
    form.reset();
    expect(form.formState.value.side).toBe('SELL');
  });
});

describe('useDynamicForm — conditional visibility', () => {
  it("hides a conditional field when the predicate doesn't match", () => {
    const schema: FieldConfig[] = [
      {
        id: 'side',
        type: 'select',
        label: 'Lado',
        defaults: 'SELL',
        options: [{ value: 'BUY', label: 'B' }, { value: 'SELL', label: 'S' }],
      },
      {
        id: 'spread',
        type: 'number',
        label: 'Spread',
        conditional: { field: 'side', value: 'BUY' },
      },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.fields.value.map((f) => f.id)).toEqual(['side']);
    expect(form.allFields.value.map((f) => f.id)).toEqual(['side', 'spread']);
  });

  it('shows the conditional field reactively when the value changes', async () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado', defaults: 'SELL' },
      {
        id: 'spread',
        type: 'number',
        label: 'Spread',
        conditional: { field: 'side', value: 'BUY' },
      },
    ];
    const form = useDynamicForm<AlertState>(schema);
    expect(form.fields.value.find((f) => f.id === 'spread')).toBeUndefined();
    form.formState.value.side = 'BUY';
    await nextTick();
    expect(form.fields.value.find((f) => f.id === 'spread')).toBeDefined();
  });
});

describe('useDynamicForm — validation & submit', () => {
  it('validate() flags missing required fields with a default message', async () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado', required: true },
    ];
    const form = useDynamicForm<AlertState>(schema);
    const ok = await form.validate();
    expect(ok).toBe(false);
    expect(form.errors.value.side).toContain('obligatorio');
  });

  it('validate() runs the per-field validator and clears errors on success', async () => {
    const schema: FieldConfig[] = [
      { id: 'spread', type: 'number', label: 'Spread' },
    ];
    const form = useDynamicForm<AlertState>(schema, {
      validateField: (field, value) => {
        if (field.id === 'spread' && (value === null || (value as number) < 0)) {
          return 'Debe ser positivo';
        }
        return true;
      },
    });
    let ok = await form.validate();
    expect(ok).toBe(false);
    expect(form.errors.value.spread).toBe('Debe ser positivo');

    form.formState.value.spread = 100;
    ok = await form.validate();
    expect(ok).toBe(true);
    expect(form.errors.value.spread).toBeUndefined();
  });

  it('submit() runs onSubmit with the sanitized state (hidden fields excluded)', async () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado', defaults: 'SELL' },
      {
        id: 'spread',
        type: 'number',
        label: 'Spread',
        conditional: { field: 'side', value: 'BUY' },
      },
    ];
    const captured: AlertState[] = [];
    const form = useDynamicForm<AlertState>(schema, {
      onSubmit: (state) => {
        captured.push(state);
      },
    });
    form.formState.value.spread = 999; // hidden — should NOT reach onSubmit
    const ok = await form.submit();
    expect(ok).toBe(true);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual({ side: 'SELL' });
    expect(captured[0]).not.toHaveProperty('spread');
  });

  it('submit() short-circuits when validation fails', async () => {
    const schema: FieldConfig[] = [
      { id: 'side', type: 'text', label: 'Lado', required: true },
    ];
    let invoked = 0;
    const form = useDynamicForm<AlertState>(schema, {
      onSubmit: () => {
        invoked += 1;
      },
    });
    const ok = await form.submit();
    expect(ok).toBe(false);
    expect(invoked).toBe(0);
  });
});

describe('useDynamicForm — schema refresh', () => {
  it('re-validates and rebuilds defaults when the schema Ref changes', async () => {
    const schemaRef = ref<FieldConfig[]>([
      { id: 'a', type: 'text', label: 'A' },
    ]);
    const form = useDynamicForm(schemaRef);
    expect(form.fields.value.map((f) => f.id)).toEqual(['a']);

    schemaRef.value = [
      { id: 'b', type: 'number', label: 'B' },
      { id: 'c', type: 'boolean', label: 'C' },
    ];
    await nextTick();
    expect(form.fields.value.map((f) => f.id)).toEqual(['b', 'c']);
    expect(form.formState.value.b).toBeNull();
    expect(form.formState.value.c).toBe(false);
  });
});
