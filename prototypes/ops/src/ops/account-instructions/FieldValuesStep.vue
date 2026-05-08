<script setup lang="ts">
import { computed } from 'vue';
import { AlertCircle } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { Button } from '@/components/ui/button';
import LetterPreview from './LetterPreview.vue';
import type { Account, Client } from '@/ops/clients/types';
import type {
  AccountInstructionFormState,
  InstructionTemplate,
  TemplateAttribute,
} from './types';

// ════════════════════════════════════════════════════════════════════
// FieldValuesStep — implements Requirements 5 + 6.
//
// Two-column layout: inputs grid (left) + LetterPreview (right).
// Below `lg` breakpoint the columns stack vertically (preview goes
// below the inputs) per Decision 4.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  formState: AccountInstructionFormState;
  client: Client;
  template: InstructionTemplate | null;
  attributes: TemplateAttribute[];
  isLoading: boolean;
  /** True when /instruction-attribute returned 5xx; the parent owns the retry. */
  hasFetchError: boolean;
}>();

const emit = defineEmits<{
  retry: [];
  'update:value': [key: string, value: string];
}>();

const selectedAccount = computed<Account | null>(() => {
  return (
    props.formState.accounts.find((a) => a.id === props.formState.selectedAccountId) ?? null
  );
});

function formatLabel(attr: TemplateAttribute): string {
  return attr.display ?? attr.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSelectField(attr: TemplateAttribute): boolean {
  return attr.key === 'currency' || attr.key === 'bank_country';
}

function isEmpty(attr: TemplateAttribute): boolean {
  const v = props.formState.formValues[attr.key];
  return !v || !String(v).trim();
}

function setValue(attr: TemplateAttribute, value: string): void {
  // Per the canonical pattern (vue/no-mutating-props), the parent
  // applies the mutation. The handler also clears the field error.
  emit('update:value', attr.key, value);
}

const SELECT_OPTIONS: Record<string, string[]> = {
  currency: ['USD', 'EUR'],
  bank_country: ['US', 'AR', 'BR', 'UY', 'ES'],
};
</script>

<template>
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <!-- Left: inputs ──────────────────────────────────────────────── -->
    <section class="flex flex-col gap-3" data-testid="field-values-inputs">
      <div v-if="props.isLoading" class="space-y-3" data-testid="field-values-loading">
        <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
      </div>
      <div
        v-else-if="props.hasFetchError"
        class="rounded-lg border border-danger/30 bg-danger-bg p-4"
        data-testid="field-values-error"
      >
        <div class="mb-2 flex items-center gap-2">
          <AlertCircle class="h-4 w-4 text-danger" />
          <p class="text-sm font-semibold text-danger">
            No se pudo cargar el esquema del template
          </p>
        </div>
        <Button variant="ghost" size="sm" @click="emit('retry')">Reintentar</Button>
      </div>
      <template v-else>
        <div v-for="attr in props.attributes" :key="attr.key" class="flex flex-col gap-1.5">
          <Label :for="`field-${attr.key}`">
            {{ formatLabel(attr) }}
            <span aria-hidden="true" class="text-danger">*</span>
          </Label>
          <Select
            v-if="isSelectField(attr)"
            :model-value="props.formState.formValues[attr.key] ?? ''"
            :data-testid="`field-${attr.key}`"
            @update:model-value="(v: unknown) => setValue(attr, String(v ?? ''))"
          >
            <SelectTrigger
              :id="`field-${attr.key}`"
              :class="
                props.formState.fieldErrors[attr.key] ? 'border-danger' : ''
              "
            >
              <SelectValue :placeholder="`Seleccionar ${formatLabel(attr).toLowerCase()}…`" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in SELECT_OPTIONS[attr.key]"
                :key="opt"
                :value="opt"
              >
                {{ opt }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input
            v-else
            :id="`field-${attr.key}`"
            :model-value="props.formState.formValues[attr.key] ?? ''"
            :placeholder="'Ingresar valor…'"
            :class="
              props.formState.fieldErrors[attr.key]
                ? 'border-danger'
                : isEmpty(attr)
                ? 'border-warning/40'
                : ''
            "
            :data-testid="`field-${attr.key}`"
            @update:model-value="(v: string | number) => setValue(attr, String(v ?? ''))"
          />
          <p
            v-if="props.formState.fieldErrors[attr.key]"
            class="text-xs text-danger"
            :data-testid="`field-${attr.key}-error`"
          >
            {{ props.formState.fieldErrors[attr.key] }}
          </p>
        </div>
      </template>
    </section>

    <!-- Right: LetterPreview ──────────────────────────────────────── -->
    <LetterPreview
      :client="props.client"
      :template="props.template"
      :attributes="props.attributes"
      :values="props.formState.formValues"
      :selected-account="selectedAccount"
    />
  </div>
</template>
