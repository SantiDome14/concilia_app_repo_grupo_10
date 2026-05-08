<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarPrev,
  CalendarNext,
  CalendarGrid,
  CalendarGridHead,
  CalendarHeadCell,
  CalendarGridBody,
  CalendarGridRow,
  CalendarCell,
  CalendarCellTrigger,
  RangeCalendarRoot,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarPrev,
  RangeCalendarNext,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarHeadCell,
  RangeCalendarGridBody,
  RangeCalendarGridRow,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  type DateRange,
  type DateValue,
} from 'reka-ui';
import { format, isValid, type Locale } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toDateValue, fromDateValue } from '@/lib/date-conversion';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// DatePicker — single + range modes (reka-ui Calendar / RangeCalendar)
// ────────────────────────────────────────────────────────────────────
// Spec: `core-forms` (extended). External API is native `Date` so
// consumers don't deal with @internationalized/date. Internal
// conversion is centralised in `@/lib/date-conversion`.
// ════════════════════════════════════════════════════════════════════

type DateRangeNative = { start: Date; end: Date };

const props = withDefaults(
  defineProps<{
    modelValue?: Date | DateRangeNative | null;
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
  'update:modelValue': [value: Date | DateRangeNative | null];
}>();

const open = ref(false);

// ── Display formatting (date-fns, already in deps) ───────────────────

function formatDisplay(d: Date | null | undefined): string {
  if (!d || !isValid(d)) return '';
  const localeMap: Record<string, Locale | undefined> = { 'es-AR': es };
  const opts = localeMap[props.locale] ? { locale: localeMap[props.locale] } : undefined;
  return format(d, 'dd MMM yyyy', opts);
}

const singleNative = computed<Date | null>(() =>
  props.modelValue instanceof Date ? props.modelValue : null,
);

const rangeNative = computed<DateRangeNative | null>(() => {
  const v = props.modelValue;
  if (v && typeof v === 'object' && !(v instanceof Date) && 'start' in v && 'end' in v) {
    return v;
  }
  return null;
});

const displayValue = computed(() => {
  if (props.mode === 'single') return formatDisplay(singleNative.value);
  const r = rangeNative.value;
  if (!r) return '';
  return `${formatDisplay(r.start)} – ${formatDisplay(r.end)}`;
});

// ── Bridge between native Date model and reka-ui DateValue model ─────

const singleDateValue = computed<DateValue | undefined>(() =>
  toDateValue(singleNative.value),
);

const rangeDateValue = computed<DateRange>(() => {
  const r = rangeNative.value;
  return {
    start: r ? toDateValue(r.start) : undefined,
    end: r ? toDateValue(r.end) : undefined,
  };
});

const minDateValue = computed<DateValue | undefined>(() => toDateValue(props.min ?? null));
const maxDateValue = computed<DateValue | undefined>(() => toDateValue(props.max ?? null));

function onSingleUpdate(value: DateValue | undefined): void {
  const date = fromDateValue(value);
  emit('update:modelValue', date);
  if (date) open.value = false;
}

function onRangeUpdate(value: DateRange): void {
  const start = fromDateValue(value.start);
  const end = fromDateValue(value.end);
  if (start && end) {
    emit('update:modelValue', { start, end });
    open.value = false;
  } else if (!start && !end) {
    emit('update:modelValue', null);
  }
  // Partial range (start picked, end pending) — don't emit yet,
  // wait for the user to complete the second click.
}
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

    <PopoverContent class="w-auto p-3">
      <!-- single mode -->
      <CalendarRoot
        v-if="props.mode === 'single'"
        :model-value="singleDateValue"
        :min-value="minDateValue"
        :max-value="maxDateValue"
        :locale="props.locale"
        :disabled="props.disabled"
        class="space-y-3"
        @update:model-value="onSingleUpdate"
      >
        <template #default="{ weekDays, grid }">
          <CalendarHeader class="flex items-center justify-between">
            <CalendarPrev as-child>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                aria-label="Mes anterior"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
            </CalendarPrev>
            <CalendarHeading class="text-sm font-semibold capitalize text-t-1" />
            <CalendarNext as-child>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                aria-label="Mes siguiente"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </CalendarNext>
          </CalendarHeader>

          <CalendarGrid v-for="month in grid" :key="month.value.toString()">
            <CalendarGridHead>
              <CalendarGridRow class="flex">
                <CalendarHeadCell
                  v-for="day in weekDays"
                  :key="day"
                  class="w-9 text-center text-[10px] font-bold uppercase tracking-wider text-t-4"
                >
                  {{ day }}
                </CalendarHeadCell>
              </CalendarGridRow>
            </CalendarGridHead>
            <CalendarGridBody>
              <CalendarGridRow
                v-for="(weekDates, idx) in month.rows"
                :key="idx"
                class="flex"
              >
                <CalendarCell
                  v-for="weekDate in weekDates"
                  :key="weekDate.toString()"
                  :date="weekDate"
                  class="text-center"
                >
                  <CalendarCellTrigger
                    :day="weekDate"
                    :month="month.value"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-t-1 transition-colors hover:bg-card-2 focus-visible:bg-card-2 focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[outside-view]:text-t-4 data-[disabled]:opacity-40 data-[selected]:bg-brand data-[selected]:text-white data-[unavailable]:line-through"
                  />
                </CalendarCell>
              </CalendarGridRow>
            </CalendarGridBody>
          </CalendarGrid>
        </template>
      </CalendarRoot>

      <!-- range mode -->
      <RangeCalendarRoot
        v-else
        :model-value="rangeDateValue"
        :min-value="minDateValue"
        :max-value="maxDateValue"
        :locale="props.locale"
        :disabled="props.disabled"
        class="space-y-3"
        @update:model-value="onRangeUpdate"
      >
        <template #default="{ weekDays, grid }">
          <RangeCalendarHeader class="flex items-center justify-between">
            <RangeCalendarPrev as-child>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                aria-label="Mes anterior"
              >
                <ChevronLeft class="h-4 w-4" />
              </Button>
            </RangeCalendarPrev>
            <RangeCalendarHeading class="text-sm font-semibold capitalize text-t-1" />
            <RangeCalendarNext as-child>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-7 w-7 p-0"
                aria-label="Mes siguiente"
              >
                <ChevronRight class="h-4 w-4" />
              </Button>
            </RangeCalendarNext>
          </RangeCalendarHeader>

          <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()">
            <RangeCalendarGridHead>
              <RangeCalendarGridRow class="flex">
                <RangeCalendarHeadCell
                  v-for="day in weekDays"
                  :key="day"
                  class="w-9 text-center text-[10px] font-bold uppercase tracking-wider text-t-4"
                >
                  {{ day }}
                </RangeCalendarHeadCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridHead>
            <RangeCalendarGridBody>
              <RangeCalendarGridRow
                v-for="(weekDates, idx) in month.rows"
                :key="idx"
                class="flex"
              >
                <RangeCalendarCell
                  v-for="weekDate in weekDates"
                  :key="weekDate.toString()"
                  :date="weekDate"
                  class="text-center"
                >
                  <RangeCalendarCellTrigger
                    :day="weekDate"
                    :month="month.value"
                    class="inline-flex h-9 w-9 items-center justify-center text-sm text-t-1 transition-colors hover:bg-card-2 focus-visible:bg-card-2 focus-visible:outline-none data-[disabled]:cursor-not-allowed data-[outside-view]:text-t-4 data-[disabled]:opacity-40 data-[highlighted]:bg-brand/20 data-[selected]:bg-brand data-[selected]:text-white data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md data-[unavailable]:line-through"
                  />
                </RangeCalendarCell>
              </RangeCalendarGridRow>
            </RangeCalendarGridBody>
          </RangeCalendarGrid>
        </template>
      </RangeCalendarRoot>
    </PopoverContent>
  </Popover>
</template>
