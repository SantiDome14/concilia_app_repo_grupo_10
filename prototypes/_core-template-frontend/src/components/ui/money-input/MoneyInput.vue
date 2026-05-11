<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Input } from '@/components/ui/input';

// ════════════════════════════════════════════════════════════════════
// MoneyInput — currency-aware numeric input
// ────────────────────────────────────────────────────────────────────
// Spec: `core-forms` (extended). Live formatting on display; emits
// raw `number` via v-model (NEVER a formatted string).
// ════════════════════════════════════════════════════════════════════

const props = withDefaults(
  defineProps<{
    modelValue?: number | null;
    /** ISO currency code (ARS, USD, BTC, ...). Required. */
    currency: string;
    /** Decimal places (default 2 for fiat; pass 8 for crypto). */
    decimals?: number;
    /** Locale for formatting (default es-AR). */
    locale?: string;
    /** Allow negative values. */
    allowNegative?: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    decimals: 2,
    locale: 'es-AR',
    allowNegative: false,
    min: undefined,
    max: undefined,
    placeholder: '',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
}>();

function formatNumber(n: number): string {
  const formatter = new Intl.NumberFormat(props.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: props.decimals,
  });
  return formatter.format(n);
}

function getSymbol(): string {
  try {
    const formatter = new Intl.NumberFormat(props.locale, {
      style: 'currency',
      currency: props.currency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const parts = formatter.formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? props.currency;
  } catch {
    return props.currency;
  }
}

const symbol = computed(() => getSymbol());

const display = ref<string>(
  props.modelValue !== null && props.modelValue !== undefined
    ? formatNumber(props.modelValue)
    : '',
);

watch(
  () => props.modelValue,
  (next) => {
    if (next === null || next === undefined) {
      if (display.value !== '') display.value = '';
      return;
    }
    const formatted = formatNumber(next);
    if (display.value !== formatted) display.value = formatted;
  },
);

function parseInput(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw.replace(/[^\d.,\-]/g, '');
  if (!props.allowNegative) cleaned = cleaned.replace(/-/g, '');
  // Locale-aware: comma is decimal in es-AR; in en-US it's the thousand separator.
  if (props.locale.startsWith('es')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  // Truncate to declared decimals.
  const factor = Math.pow(10, props.decimals);
  return Math.round(n * factor) / factor;
}

function clamp(n: number | null): number | null {
  if (n === null) return null;
  if (props.min !== undefined && n < props.min) return props.min;
  if (props.max !== undefined && n > props.max) return props.max;
  return n;
}

function onInput(raw: string): void {
  display.value = raw;
  const parsed = parseInput(raw);
  emit('update:modelValue', parsed);
}

function onBlur(): void {
  const parsed = clamp(parseInput(display.value));
  if (parsed === null) {
    display.value = '';
    emit('update:modelValue', null);
    return;
  }
  display.value = formatNumber(parsed);
  emit('update:modelValue', parsed);
}
</script>

<template>
  <div class="relative">
    <span
      class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-t-3"
    >
      {{ symbol }}
    </span>
    <Input
      :model-value="display"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      type="text"
      inputmode="decimal"
      class="pl-10"
      @input="(e: Event) => onInput((e.target as HTMLInputElement).value)"
      @blur="onBlur"
    />
  </div>
</template>
