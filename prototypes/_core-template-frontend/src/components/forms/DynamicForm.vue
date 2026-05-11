<script setup lang="ts" generic="TState extends Record<string, unknown>">
import { computed } from 'vue';
import ManifestField from '@/components/manifest/ManifestField.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { DialogField } from '@/lib/manifest';
import type { FieldConfig } from '@/types/dynamic-form';
import type { UseDynamicFormApi } from '@/composables/useDynamicForm';

// ════════════════════════════════════════════════════════════════════
// DynamicForm — runtime-schema-driven form renderer
// ────────────────────────────────────────────────────────────────────
// Delegates each field to <ManifestField> so the rendering logic for
// every type lives in ONE place (single source of truth between
// build-time manifests and runtime forms).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** The composable api returned by `useDynamicForm(schema, options)`. */
  form: UseDynamicFormApi<TState>;
  /** Override the EmptyState message when the schema is empty/invalid. */
  emptyMessage?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [state: TState];
}>();

const isEmpty = computed(
  () => !props.form.isReady.value || props.form.fields.value.length === 0,
);

function adapt(field: FieldConfig): DialogField {
  // Translate the runtime-shape FieldConfig into the build-time DialogField
  // discriminated union that ManifestField consumes. The shapes overlap
  // for the canonical types; for `select` we mirror options.
  const base = {
    id: field.id,
    label: field.label,
    placeholder: field.placeholder,
    required: field.required,
  } as Record<string, unknown>;

  switch (field.type) {
    case 'select':
      return { ...base, type: 'select', options: field.options ?? [] } as unknown as DialogField;
    case 'number': {
      const meta = (field.meta ?? {}) as { min?: number; max?: number };
      return { ...base, type: 'number', min: meta.min, max: meta.max } as unknown as DialogField;
    }
    case 'textarea': {
      const meta = (field.meta ?? {}) as { max_length?: number };
      return { ...base, type: 'textarea', max_length: meta.max_length } as unknown as DialogField;
    }
    case 'lookup': {
      const meta = (field.meta ?? {}) as { catalog?: string };
      return { ...base, type: 'lookup', catalog: meta.catalog ?? field.id } as unknown as DialogField;
    }
    case 'file': {
      const meta = (field.meta ?? {}) as { accept?: string[]; max_size?: number };
      return { ...base, type: 'file', accept: meta.accept, max_size: meta.max_size } as unknown as DialogField;
    }
    case 'multifile': {
      const meta = (field.meta ?? {}) as {
        accept?: string[];
        max_size?: number;
        max_files?: number;
      };
      return {
        ...base,
        type: 'multifile',
        accept: meta.accept,
        max_size: meta.max_size,
        max_files: meta.max_files,
      } as unknown as DialogField;
    }
    case 'text':
    case 'date':
    case 'boolean':
      return { ...base, type: field.type } as unknown as DialogField;
    default:
      // Unknown registered types fall through as 'text' for safety; the
      // schema validator should have rejected unregistered types upstream.
      return { ...base, type: 'text' } as unknown as DialogField;
  }
}

function onFieldUpdate(id: string, value: unknown): void {
  props.form.setFieldValue(id, value);
  emit('update:modelValue', props.form.formState.value);
}
</script>

<template>
  <EmptyState
    v-if="isEmpty"
    :title="props.emptyMessage ?? (props.form.schemaError.value ?? 'No hay campos para mostrar')"
  />

  <div v-else class="space-y-4">
    <ManifestField
      v-for="field in props.form.fields.value"
      :key="field.id"
      :field="adapt(field)"
      :model-value="props.form.formState.value[field.id]"
      :form-values="props.form.formState.value"
      :error="props.form.errors.value[field.id] ?? null"
      @update:model-value="(v: unknown) => onFieldUpdate(field.id, v)"
    />
  </div>
</template>
