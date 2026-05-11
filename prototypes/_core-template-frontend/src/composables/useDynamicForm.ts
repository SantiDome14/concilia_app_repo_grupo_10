import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { ZodError } from 'zod';
import {
  dynamicFormSchema,
  type FieldConfig,
} from '@/types/dynamic-form';
import {
  hasFieldType,
  listRegisteredTypes,
} from '@/lib/manifest/field-type-registry';
// Side-effect import — ensures the 9 canonical types are registered
// before any consumer validates a schema.
import '@/lib/manifest/field-type-bootstrap';

// ════════════════════════════════════════════════════════════════════
// useDynamicForm — runtime-schema-driven form composable
// ────────────────────────────────────────────────────────────────────
// Implements the contract from `core-dynamic-forms`. Each call:
//   1. validates the schema with Zod;
//   2. checks every `type` is registered + every `conditional.field`
//      points to a real field id;
//   3. builds reactive `formState` from per-field defaults;
//   4. exposes per-field `errors` and a `submit()` action.
// ════════════════════════════════════════════════════════════════════

export interface UseDynamicFormOptions<TState extends Record<string, unknown>> {
  initialState?: TState;
  /** Per-field validator (returns true on pass, string error on fail). */
  validateField?: (
    field: FieldConfig,
    value: unknown,
    state: TState,
  ) => boolean | string | Promise<boolean | string>;
  /** Invoked by `submit()` after every field validates. */
  onSubmit?: (state: TState) => void | Promise<void>;
  /** Called once when the schema fails Zod validation. */
  onSchemaError?: (error: Error) => void;
}

export interface UseDynamicFormApi<TState extends Record<string, unknown>> {
  /** True only when the schema parsed cleanly AND every type/conditional ref is valid. */
  isReady: ComputedRef<boolean>;
  /** When `isReady` is false, this carries the diagnostic message. */
  schemaError: Ref<string | null>;
  /** Validated, ready-to-render fields (post-conditional-visibility). */
  fields: ComputedRef<FieldConfig[]>;
  /** All declared fields, regardless of conditional visibility. */
  allFields: ComputedRef<FieldConfig[]>;
  formState: Ref<TState>;
  errors: Ref<Record<string, string>>;
  isSubmitting: Ref<boolean>;
  /** Update a single field's value (consumed by <DynamicForm>). */
  setFieldValue(id: string, value: unknown): void;
  validate(): Promise<boolean>;
  submit(): Promise<boolean>;
  reset(): void;
}

function defaultValueForType(type: string, declared?: unknown): unknown {
  if (declared !== undefined) return declared;
  switch (type) {
    case 'boolean':
      return false;
    case 'multifile':
    case 'key-value-array':
      return [];
    case 'number':
    case 'money':
      return null;
    default:
      return null;
  }
}

export function useDynamicForm<TState extends Record<string, unknown>>(
  schemaInput: Ref<FieldConfig[]> | FieldConfig[],
  options: UseDynamicFormOptions<TState> = {},
): UseDynamicFormApi<TState> {
  const schemaRef: Ref<FieldConfig[]> =
    Array.isArray(schemaInput) ? ref(schemaInput) : schemaInput;

  const validatedFields = ref<FieldConfig[]>([]) as Ref<FieldConfig[]>;
  const schemaError = ref<string | null>(null);
  const formState = ref({ ...(options.initialState ?? ({} as TState)) }) as Ref<TState>;
  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);

  function validateSchemaShape(input: FieldConfig[]): {
    ok: true;
    fields: FieldConfig[];
  } | { ok: false; error: string } {
    let parsed: FieldConfig[];
    try {
      parsed = dynamicFormSchema.parse(input);
    } catch (e) {
      if (e instanceof ZodError) {
        return { ok: false, error: `Schema invalid: ${e.issues.map((i) => i.message).join('; ')}` };
      }
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    // Every type must be registered.
    for (const f of parsed) {
      if (!hasFieldType(f.type)) {
        return {
          ok: false,
          error: `Unknown field type '${f.type}' on field '${f.id}'. Registered types: ${listRegisteredTypes().join(', ')}`,
        };
      }
      if (f.type === 'select' && (!f.options || f.options.length === 0)) {
        return {
          ok: false,
          error: `Field '${f.id}' (type 'select') is missing required 'options'`,
        };
      }
    }
    // Every conditional.field must reference a real field id.
    const ids = new Set(parsed.map((f) => f.id));
    for (const f of parsed) {
      if (f.conditional && !ids.has(f.conditional.field)) {
        return {
          ok: false,
          error: `Field '${f.id}' references unknown conditional.field '${f.conditional.field}'`,
        };
      }
    }
    // Duplicate ids are an error.
    if (ids.size !== parsed.length) {
      return { ok: false, error: 'Duplicate field ids in schema' };
    }
    return { ok: true, fields: parsed };
  }

  function applySchema(input: FieldConfig[]): void {
    const result = validateSchemaShape(input);
    if (!result.ok) {
      validatedFields.value = [];
      schemaError.value = result.error;
      if (options.onSchemaError) options.onSchemaError(new Error(result.error));
      return;
    }
    validatedFields.value = result.fields;
    schemaError.value = null;
    // Initialize formState from defaults when keys are missing.
    const next = { ...formState.value } as Record<string, unknown>;
    for (const f of result.fields) {
      if (!(f.id in next)) {
        next[f.id] = defaultValueForType(f.type, f.defaults);
      }
    }
    formState.value = next as TState;
  }

  applySchema(schemaRef.value);
  watch(schemaRef, (next) => applySchema(next), { deep: false });

  const allFields = computed<FieldConfig[]>(() => validatedFields.value);

  const fields = computed<FieldConfig[]>(() =>
    validatedFields.value.filter((f) => {
      if (!f.conditional) return true;
      return formState.value[f.conditional.field] === f.conditional.value;
    }),
  );

  /** Strip hidden-field values from a snapshot before submitting / surfacing. */
  function sanitizedFormState(): TState {
    const visibleIds = new Set(fields.value.map((f) => f.id));
    const next = {} as Record<string, unknown>;
    for (const id of visibleIds) {
      next[id] = formState.value[id];
    }
    return next as TState;
  }

  async function validate(): Promise<boolean> {
    const next: Record<string, string> = {};
    let ok = true;
    for (const f of fields.value) {
      // Required check first.
      if (f.required) {
        const v = formState.value[f.id];
        const isEmpty =
          v === null ||
          v === undefined ||
          (typeof v === 'string' && v.trim() === '') ||
          (Array.isArray(v) && v.length === 0);
        if (isEmpty) {
          next[f.id] = `${f.label} es obligatorio`;
          ok = false;
          continue;
        }
      }
      if (options.validateField) {
        const result = await Promise.resolve(
          options.validateField(f, formState.value[f.id], formState.value),
        );
        if (result === true) continue;
        next[f.id] = typeof result === 'string' ? result : `${f.label} es inválido`;
        ok = false;
      }
    }
    errors.value = next;
    return ok;
  }

  async function submit(): Promise<boolean> {
    const ok = await validate();
    if (!ok) return false;
    if (!options.onSubmit) return true;
    isSubmitting.value = true;
    try {
      await options.onSubmit(sanitizedFormState());
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.value = { ...errors.value, __submit__: message };
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  function reset(): void {
    formState.value = { ...(options.initialState ?? ({} as TState)) } as TState;
    errors.value = {};
    applySchema(schemaRef.value);
  }

  function setFieldValue(id: string, value: unknown): void {
    formState.value = { ...formState.value, [id]: value } as TState;
  }

  return {
    isReady: computed(() => schemaError.value === null && validatedFields.value.length > 0),
    schemaError,
    fields,
    allFields,
    formState,
    errors,
    isSubmitting,
    setFieldValue,
    validate,
    submit,
    reset,
  };
}
