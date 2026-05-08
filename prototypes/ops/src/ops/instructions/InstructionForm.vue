<script setup lang="ts">
import { computed, watch } from 'vue';
import { useForm } from 'vee-validate';
import { z } from 'zod';
import { toTypedSchema } from '@vee-validate/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DynamicKeyValueFields } from '@/components/ui/dynamic-fields';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { InstructionFormData } from './types';

// ════════════════════════════════════════════════════════════════════
// InstructionForm — shared form fields for Create + Edit
// ────────────────────────────────────────────────────────────────────
// Implements `ops-instructions` Requirement 5 (form fields). The
// parent (CreateInstructionModal / EditInstructionModal) owns the
// modal chrome and the submit orchestration; this component owns the
// vee-validate + zod form state and renders the four fields per the
// canonical `core-forms` patterns.
// ════════════════════════════════════════════════════════════════════

interface CurrencyOption {
  value: string;
  label: string;
}

const props = defineProps<{
  initialValues?: Partial<InstructionFormData>;
  currencies: CurrencyOption[];
  /** External error from phase A (e.g. duplicate name 422). */
  externalErrors?: Partial<Record<keyof InstructionFormData, string>>;
}>();

const emit = defineEmits<{
  /** Fired on every formState change. Modal can decide submit-button-disabled state. */
  'update:formState': [{ values: InstructionFormData; isValid: boolean }];
}>();

// ─── Zod schema ──────────────────────────────────────────────────────

const attributeRowSchema = z.object({
  key: z.string().min(1, 'La clave es obligatoria').max(60),
  value: z.string().min(1, 'El valor es obligatorio').max(200),
  index: z.number().int().nonnegative(),
});

const formSchema = z
  .object({
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(60, 'Máximo 60 caracteres'),
    currency_id: z.string().min(1, 'Seleccioná una moneda'),
    description: z.string().max(280, 'Máximo 280 caracteres'),
    attributes: z.array(attributeRowSchema),
  })
  .refine(
    (data) => {
      const keys = data.attributes.map((a) => a.key);
      return new Set(keys).size === keys.length;
    },
    { message: 'Las claves de atributo deben ser únicas', path: ['attributes'] },
  );

type FormShape = z.infer<typeof formSchema>;

const defaults: FormShape = {
  name: props.initialValues?.name ?? '',
  currency_id: props.initialValues?.currency_id ?? '',
  description: props.initialValues?.description ?? '',
  attributes: props.initialValues?.attributes ?? [],
};

const { values, errors, setFieldValue, meta, setErrors } = useForm<FormShape>({
  validationSchema: toTypedSchema(formSchema),
  initialValues: defaults,
});

watch(
  values,
  (next) => emit('update:formState', { values: next as InstructionFormData, isValid: meta.value.valid }),
  { deep: true, immediate: true },
);

// Surface externalErrors (e.g. phase-A 422 with field hint) into vee-validate.
watch(
  () => props.externalErrors,
  (next) => {
    if (!next) return;
    const errMap: Record<string, string | undefined> = {};
    if (next.name) errMap.name = next.name;
    if (next.currency_id) errMap.currency_id = next.currency_id;
    if (next.description) errMap.description = next.description;
    setErrors(errMap);
  },
);

// Local computed for the dynamic-fields v-model — vee-validate's setFieldValue
// is the canonical mutation path for nested arrays.
const attributesValue = computed({
  get: () => values.attributes ?? [],
  set: (v) => setFieldValue('attributes', v),
});

const nameValue = computed({
  get: () => values.name ?? '',
  set: (v) => setFieldValue('name', v),
});

const currencyValue = computed({
  get: () => values.currency_id ?? '',
  set: (v) => setFieldValue('currency_id', v),
});

const descriptionValue = computed({
  get: () => values.description ?? '',
  set: (v) => setFieldValue('description', v),
});

defineExpose({
  values,
  isValid: computed(() => meta.value.valid),
});
</script>

<template>
  <div class="space-y-4">
    <!-- Nombre -->
    <div class="space-y-1.5">
      <Label
        for="instruction-name"
        class="text-[10px] font-bold uppercase tracking-wider text-t-3 after:ml-0.5 after:text-danger after:content-['*']"
      >
        Nombre
      </Label>
      <Input
        id="instruction-name"
        v-model="nameValue"
        placeholder="Ej. USD wire transfer"
        maxlength="60"
      />
      <p v-if="errors.name" class="text-xs text-danger">{{ errors.name }}</p>
    </div>

    <!-- Moneda -->
    <div class="space-y-1.5">
      <Label
        for="instruction-currency"
        class="text-[10px] font-bold uppercase tracking-wider text-t-3 after:ml-0.5 after:text-danger after:content-['*']"
      >
        Moneda
      </Label>
      <Select v-model="currencyValue">
        <SelectTrigger id="instruction-currency" class="w-full">
          <SelectValue placeholder="Seleccioná una moneda" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="c in props.currencies" :key="c.value" :value="c.value">
            {{ c.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="errors.currency_id" class="text-xs text-danger">{{ errors.currency_id }}</p>
    </div>

    <!-- Descripción -->
    <div class="space-y-1.5">
      <Label
        for="instruction-description"
        class="text-[10px] font-bold uppercase tracking-wider text-t-3"
      >
        Descripción
      </Label>
      <Textarea
        id="instruction-description"
        v-model="descriptionValue"
        placeholder="Opcional · máximo 280 caracteres"
        :maxlength="280"
      />
      <p v-if="errors.description" class="text-xs text-danger">{{ errors.description }}</p>
    </div>

    <!-- Atributos -->
    <div class="space-y-1.5">
      <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
        Atributos
      </Label>
      <DynamicKeyValueFields
        v-model="attributesValue"
        key-type="text"
        duplicate-key-policy="reject"
      />
      <p v-if="errors.attributes" class="text-xs text-danger">{{ errors.attributes }}</p>
    </div>
  </div>
</template>
