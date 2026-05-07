<script setup lang="ts">
import { computed, ref } from 'vue';
import { format, parse, isValid, isAfter, isBefore, type Locale } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-vue-next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// DatePicker — canonical date input (single + range modes)
// ────────────────────────────────────────────────────────────────────
// Spec: `core-forms` (extended). Built on reka-ui Popover + native
// <input type="date"> as the keyboard-accessible fallback. No heavy
// external date library — just date-fns for parse/format.
// ════════════════════════════════════════════════════════════════════

type DateRange = { start: Date; end: Date };

const props = withDefaults(
  defineProps<{
    modelValue?: Date | DateRange | null;
    mode?: 'single' | 'range';
    locale?: string;
    min?: Date;
    max?: Date;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    mode: 'single',
    locale: 'es-AR',
    min: undefined,
    max: undefined,
    placeholder: 'Seleccionar fecha…',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: Date | DateRange | null];
}>();

const open = ref(false);

function toIsoDate(d: Date | null | undefined): string {
  if (!d || !isValid(d)) return '';
  return format(d, 'yyyy-MM-dd');
}

function fromIsoDate(s: string): Date | null {
  if (!s) return null;
  const parsed = parse(s, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

function formatDisplay(d: Date | null | undefined): string {
  if (!d || !isValid(d)) return '';
  const localeMap: Record<string, Locale | undefined> = { 'es-AR': es };
  const opts = localeMap[props.locale] ? { locale: localeMap[props.locale] } : undefined;
  return format(d, 'dd MMM yyyy', opts);
}

function clampDate(d: Date | null): Date | null {
  if (!d) return null;
  if (props.min && isBefore(d, props.min)) return null;
  if (props.max && isAfter(d, props.max)) return null;
  return d;
}

const singleValue = computed<Date | null>(() => {
  if (props.mode !== 'single') return null;
  return props.modelValue instanceof Date ? props.modelValue : null;
});

const rangeValue = computed<DateRange | null>(() => {
  if (props.mode !== 'range') return null;
  if (
    props.modelValue &&
    typeof props.modelValue === 'object' &&
    'start' in props.modelValue &&
    'end' in props.modelValue
  ) {
    return props.modelValue;
  }
  return null;
});

const displaySingle = computed(() => formatDisplay(singleValue.value));
const displayRange = computed(() => {
  const r = rangeValue.value;
  if (!r) return '';
  return `${formatDisplay(r.start)} – ${formatDisplay(r.end)}`;
});

const displayValue = computed(() =>
  props.mode === 'single' ? displaySingle.value : displayRange.value,
);

// Range mode local state (committed on confirm)
const draftStart = ref<string>(rangeValue.value ? toIsoDate(rangeValue.value.start) : '');
const draftEnd = ref<string>(rangeValue.value ? toIsoDate(rangeValue.value.end) : '');

function onSingleSelect(iso: string): void {
  const next = clampDate(fromIsoDate(iso));
  emit('update:modelValue', next);
  open.value = false;
}

function onRangeConfirm(): void {
  const start = clampDate(fromIsoDate(draftStart.value));
  const end = clampDate(fromIsoDate(draftEnd.value));
  if (!start || !end) return;
  if (isAfter(start, end)) return;
  emit('update:modelValue', { start, end });
  open.value = false;
}

function onClear(): void {
  draftStart.value = '';
  draftEnd.value = '';
  emit('update:modelValue', null);
  open.value = false;
}

const minIso = computed(() => toIsoDate(props.min ?? null));
const maxIso = computed(() => toIsoDate(props.max ?? null));
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="secondary"
        :disabled="props.disabled"
        :class="cn('w-full justify-start gap-2 font-normal', !displayValue && 'text-t-4')"
      >
        <Calendar class="h-4 w-4" />
        {{ displayValue || props.placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto min-w-[280px] space-y-3 p-3">
      <template v-if="props.mode === 'single'">
        <Input
          type="date"
          :value="toIsoDate(singleValue)"
          :min="minIso || undefined"
          :max="maxIso || undefined"
          :disabled="props.disabled"
          @input="(e: Event) => onSingleSelect((e.target as HTMLInputElement).value)"
        />
      </template>
      <template v-else>
        <div class="space-y-2">
          <div>
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Desde</div>
            <Input
              v-model="draftStart"
              type="date"
              :min="minIso || undefined"
              :max="maxIso || undefined"
            />
          </div>
          <div>
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Hasta</div>
            <Input
              v-model="draftEnd"
              type="date"
              :min="minIso || undefined"
              :max="maxIso || undefined"
            />
          </div>
          <div class="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" @click="onClear">Limpiar</Button>
            <Button type="button" variant="primary" size="sm" @click="onRangeConfirm">
              Aplicar
            </Button>
          </div>
        </div>
      </template>
    </PopoverContent>
  </Popover>
</template>
