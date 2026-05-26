<script setup lang="ts">
import { computed, watch } from 'vue';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDynamicForm } from '@/composables/useDynamicForm';
import type { FieldConfig } from '@/types/dynamic-form';

// ════════════════════════════════════════════════════════════════════
// DynamicPayloadForm — renders the payload form of an InboxTypeConfig
// ────────────────────────────────────────────────────────────────────
// Consumes the `payload_schema: FieldConfig[]` of the picked type (per
// `core-modulo-genericos` Requirement: Inbox MUST expose a main CTA…).
// Renders each field as the matching shadcn-vue primitive (Input,
// Textarea, Select, number-Input) — no native <select>. Validation +
// state managed by `useDynamicForm` (per `core-dynamic-forms`).
//
// v1 supported field types: text, textarea, select, number, boolean.
// Anything else is rejected by `useDynamicForm.schemaError`.
// ════════════════════════════════════════════════════════════════════

interface Props {
  schema: FieldConfig[];
  modelValue: Record<string, unknown>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>];
  validity: [isValid: boolean];
}>();

const form = useDynamicForm<Record<string, unknown>>(props.schema, {
  initialState: props.modelValue,
});

// Sync inner state up. Watch shallow on identity changes from form.formState.
watch(
  () => form.formState.value,
  (next) => {
    emit('update:modelValue', { ...next });
    // Field-level required validation runs on submit; expose a coarse
    // validity by checking all required fields have a non-empty value.
    const missing = form.allFields.value.some(
      (f) => f.required && isEmpty(next[f.id]),
    );
    emit('validity', !missing && form.schemaError.value === null);
  },
  { deep: true, immediate: true },
);

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

function setField(id: string, value: unknown): void {
  form.setFieldValue(id, value);
}

const fields = computed(() => form.allFields.value);
const schemaError = computed(() => form.schemaError.value);
</script>

<template>
  <div class="flex flex-col gap-4" data-testid="dynamic-payload-form">
    <div
      v-if="schemaError"
      class="rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-danger"
      role="alert"
    >
      {{ schemaError }}
    </div>

    <div
      v-for="f in fields"
      :key="f.id"
      class="flex flex-col gap-1.5"
    >
      <Label
        :for="`payload-field-${f.id}`"
        class="text-[10px] font-bold uppercase tracking-wider text-t-3"
      >
        {{ f.label }}
        <span v-if="f.required" class="text-danger" aria-hidden="true">*</span>
      </Label>

      <!-- text -->
      <Input
        v-if="f.type === 'text'"
        :id="`payload-field-${f.id}`"
        :model-value="(form.formState.value[f.id] as string | number | null | undefined) ?? ''"
        :placeholder="f.placeholder"
        @update:model-value="(v: string | number) => setField(f.id, String(v))"
      />

      <!-- textarea -->
      <Textarea
        v-else-if="f.type === 'textarea'"
        :id="`payload-field-${f.id}`"
        :model-value="(form.formState.value[f.id] as string | undefined) ?? ''"
        :placeholder="f.placeholder"
        @update:model-value="(v: string | number) => setField(f.id, String(v))"
      />

      <!-- select -->
      <Select
        v-else-if="f.type === 'select'"
        :model-value="(form.formState.value[f.id] as string | undefined) ?? undefined"
        @update:model-value="(v) => setField(f.id, v)"
      >
        <SelectTrigger :id="`payload-field-${f.id}`">
          <SelectValue :placeholder="f.placeholder ?? 'Seleccionar…'" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in f.options ?? []"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- number -->
      <Input
        v-else-if="f.type === 'number'"
        :id="`payload-field-${f.id}`"
        type="number"
        :model-value="(form.formState.value[f.id] as number | string | null | undefined) ?? ''"
        :placeholder="f.placeholder"
        @update:model-value="(v: string | number) => setField(f.id, v === '' ? null : Number(v))"
      />

      <!-- fallback for unsupported types in this round -->
      <div
        v-else
        class="rounded-md border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning"
      >
        Field type "{{ f.type }}" not yet rendered by &lt;DynamicPayloadForm&gt;.
      </div>
    </div>
  </div>
</template>
