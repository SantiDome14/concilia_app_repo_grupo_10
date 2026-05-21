<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  resolveCatalog,
  resolveCatalogFilter,
  UNFILTERED_CATALOG_FILTER,
  type CatalogEntry,
  type DialogField,
} from '@/lib/manifest';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dropzone } from '@/components/ui/dropzone';
import { DatePicker } from '@/components/ui/date-picker';
import { MoneyInput } from '@/components/ui/money-input';
import { OtpInput } from '@/components/ui/otp-input';
import { DynamicKeyValueFields } from '@/components/ui/dynamic-fields';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// ManifestField — renders one of the seven canonical field types
// ────────────────────────────────────────────────────────────────────
// Spec coverage:
//   - Required asterisk on label (Requirement core-forms).
//   - Errors below the input in danger color.
//   - Native <select> is forbidden — uses shadcn Select.
//   - Lookup with null filter renders empty-state, not unfiltered list.
// ════════════════════════════════════════════════════════════════════

interface Props {
  field: DialogField;
  modelValue: unknown;
  disabled?: boolean;
  error?: string | null;
  /** Live record (for `from_record` filter resolution). */
  record?: Record<string, unknown>;
  /** Live formValues (for `from_form` filter resolution). */
  formValues: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: null,
  record: undefined,
});

const emit = defineEmits<{ 'update:modelValue': [value: unknown] }>();

const inputId = computed(() => `mf-field-${props.field.id}`);

// ── number-field handling: clamp + toast on blur ─────────────────────

function onNumberInput(raw: string): void {
  if (raw === '') {
    emit('update:modelValue', null);
    return;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    emit('update:modelValue', raw);
    return;
  }
  emit('update:modelValue', n);
}

function onNumberBlur(): void {
  if (props.field.type !== 'number') return;
  const v = props.modelValue;
  if (typeof v !== 'number' || !Number.isFinite(v)) return;
  const min = props.field.min;
  const max = props.field.max;
  let clamped = v;
  if (typeof min === 'number' && v < min) clamped = min;
  if (typeof max === 'number' && v > max) clamped = max;
  if (clamped !== v) {
    toast.error(`Valor fuera de rango (${min ?? '−∞'}–${max ?? '∞'})`);
    emit('update:modelValue', clamped);
  }
}

// ── lookup-field state ───────────────────────────────────────────────

const lookupOpen = ref(false);
const lookupEntries = ref<CatalogEntry[]>([]);
const lookupLoading = ref(false);
const lookupFilterValue = ref<unknown>(null);

const isLookup = computed(() => props.field.type === 'lookup');

const lookupEmptyHint = computed(() => {
  if (!isLookup.value) return '';
  const f = props.field;
  const cf = f.type === 'lookup' ? f.catalog_filter : undefined;
  const fieldLabel = f.label || f.id;
  // Heuristic: if the antecedent is named, use it; else use the field's
  // own label.
  const ant =
    cf && 'field' in cf && typeof (cf as { field?: unknown }).field === 'string'
      ? (cf as { field: string }).field
      : fieldLabel;
  return `Asigná ${ant} primero`;
});

async function reloadLookup(): Promise<void> {
  if (props.field.type !== 'lookup') return;
  const f = props.field;
  lookupFilterValue.value = resolveCatalogFilter(f, {
    record: props.record,
    formValues: props.formValues,
  });
  // `null` means a catalog_filter is declared but the antecedent value
  // is missing → render the empty state with hint. The unfiltered
  // sentinel is forwarded to resolveCatalog which fetches the full
  // catalog from the resolver.
  if (lookupFilterValue.value === null) {
    lookupEntries.value = [];
    return;
  }
  lookupLoading.value = true;
  try {
    const out = await Promise.resolve(resolveCatalog(f.catalog, lookupFilterValue.value));
    lookupEntries.value = Array.isArray(out) ? out : [];
  } finally {
    lookupLoading.value = false;
  }
}

watch(lookupOpen, (open) => {
  if (open) reloadLookup();
});

// Eager label resolution: when a lookup field arrives pre-populated
// (record already has the value, e.g. a disabled "Asignar Banco y
// Cuenta" group on a movimiento that's already imputed), the dropdown
// hasn't loaded any entries yet, so `lookupEntries` is empty and the
// trigger button would fall back to displaying the raw id ('cp',
// 'cu-cp-allaria-1'). We resolve the label once on mount and on every
// modelValue change so the trigger renders the friendly label even
// without user interaction. Call site uses the unfiltered catalog so
// the resolver returns the full list and we pick the matching entry.
const resolvedLabelByValue = ref<Record<string, string>>({});

async function resolveLabelForValue(value: unknown): Promise<void> {
  if (props.field.type !== 'lookup') return;
  if (typeof value !== 'string' || value === '') return;
  if (value in resolvedLabelByValue.value) return;
  const f = props.field;
  const out = await Promise.resolve(
    resolveCatalog(f.catalog, UNFILTERED_CATALOG_FILTER),
  );
  if (!Array.isArray(out)) return;
  const next: Record<string, string> = { ...resolvedLabelByValue.value };
  for (const entry of out) next[entry.value] = entry.label;
  resolvedLabelByValue.value = next;
}

watch(
  () => props.modelValue,
  (v) => {
    void resolveLabelForValue(v);
  },
  { immediate: true },
);

const selectedLookupLabel = computed(() => {
  if (!isLookup.value) return '';
  const v = props.modelValue;
  if (typeof v !== 'string' || v === '') return '';
  // Priority: dropdown-loaded entry → eagerly-resolved cache → raw id.
  const hit = lookupEntries.value.find((e) => e.value === v);
  if (hit) return hit.label;
  return resolvedLabelByValue.value[v] ?? v;
});

function pickLookup(entry: CatalogEntry): void {
  emit('update:modelValue', entry.value);
  lookupOpen.value = false;
}

// ── select string coercion ───────────────────────────────────────────

const selectStringValue = computed({
  get: () =>
    typeof props.modelValue === 'string' ? props.modelValue : '',
  set: (v: string) => emit('update:modelValue', v),
});

// ── checkbox boolean coercion ────────────────────────────────────────

const checkboxValue = computed<boolean | 'indeterminate'>({
  get: () => (props.modelValue === true ? true : false),
  set: (v) => emit('update:modelValue', v === true),
});

// ── string-typed inputs (text/textarea/date) ─────────────────────────

const textValue = computed({
  get: () =>
    props.modelValue === null || props.modelValue === undefined
      ? ''
      : String(props.modelValue),
  set: (v: string) => emit('update:modelValue', v === '' ? null : v),
});

const numberValue = computed(() =>
  typeof props.modelValue === 'number' ? String(props.modelValue) : '',
);

// ── file / multifile coercion ────────────────────────────────────────

const fileValue = computed<File | null>({
  get: () => (props.modelValue instanceof File ? props.modelValue : null),
  set: (v) => emit('update:modelValue', v),
});

const multifileValue = computed<File[]>({
  get: () =>
    Array.isArray(props.modelValue) && props.modelValue.every((f) => f instanceof File)
      ? (props.modelValue as File[])
      : [],
  set: (v) => emit('update:modelValue', v),
});

function onDropzoneUpdate(value: File | File[] | null): void {
  emit('update:modelValue', value);
}

// ── date / daterange coercion ────────────────────────────────────────

const dateValue = computed<Date | null>(() => {
  const v = props.modelValue;
  if (v instanceof Date) return v;
  if (typeof v === 'string' && v) {
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
});

const dateRangeValue = computed<{ start: Date; end: Date } | null>(() => {
  const v = props.modelValue;
  if (v && typeof v === 'object' && 'start' in v && 'end' in v) {
    return v as { start: Date; end: Date };
  }
  return null;
});

function onDateUpdate(value: unknown): void {
  emit('update:modelValue', value);
}

function parseDateAttr(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// ── money / otp / key-value-array coercion ───────────────────────────

const moneyValue = computed<number | null>(() =>
  typeof props.modelValue === 'number' ? props.modelValue : null,
);

const otpValue = computed<string>(() =>
  typeof props.modelValue === 'string' ? props.modelValue : '',
);

interface KvRow {
  key: string;
  value: string;
  index: number;
}

const kvValue = computed<KvRow[]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as KvRow[]) : [],
);

function onSimpleUpdate(value: unknown): void {
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="space-y-1.5">
    <Label
      :for="inputId"
      :class="cn('text-[10px] font-bold uppercase tracking-wider text-t-3', props.field.required ? 'after:content-[\'*\'] after:ml-0.5 after:text-danger' : '')"
    >
      {{ props.field.label }}
    </Label>

    <!-- text -->
    <Input
      v-if="props.field.type === 'text'"
      :id="inputId"
      v-model="textValue"
      :placeholder="props.field.placeholder ?? ''"
      :disabled="props.disabled"
      type="text"
    />

    <!-- textarea -->
    <Textarea
      v-else-if="props.field.type === 'textarea'"
      :id="inputId"
      v-model="textValue"
      :placeholder="props.field.placeholder ?? ''"
      :disabled="props.disabled"
      :maxlength="props.field.max_length"
    />

    <!-- number -->
    <Input
      v-else-if="props.field.type === 'number'"
      :id="inputId"
      :value="numberValue"
      :placeholder="props.field.placeholder ?? ''"
      :disabled="props.disabled"
      type="number"
      :min="props.field.min"
      :max="props.field.max"
      @input="(e: Event) => onNumberInput((e.target as HTMLInputElement).value)"
      @blur="onNumberBlur"
    />

    <!-- date -->
    <DatePicker
      v-else-if="props.field.type === 'date'"
      :model-value="dateValue"
      mode="single"
      :placeholder="props.field.placeholder ?? 'Seleccionar fecha…'"
      :disabled="props.disabled"
      @update:model-value="onDateUpdate"
    />

    <!-- daterange -->
    <DatePicker
      v-else-if="props.field.type === 'daterange'"
      :model-value="dateRangeValue"
      mode="range"
      :placeholder="props.field.placeholder ?? 'Seleccionar período…'"
      :min="parseDateAttr(props.field.min)"
      :max="parseDateAttr(props.field.max)"
      :disabled="props.disabled"
      @update:model-value="onDateUpdate"
    />

    <!-- boolean -->
    <div
      v-else-if="props.field.type === 'boolean'"
      class="flex items-center gap-2"
    >
      <Checkbox
        :id="inputId"
        v-model="checkboxValue"
        :disabled="props.disabled"
      />
      <Label v-if="props.field.placeholder" :for="inputId" class="text-sm text-t-2">
        {{ props.field.placeholder }}
      </Label>
    </div>

    <!-- select -->
    <Select
      v-else-if="props.field.type === 'select'"
      v-model="selectStringValue"
      :disabled="props.disabled"
    >
      <SelectTrigger :id="inputId" class="w-full">
        <SelectValue :placeholder="props.field.placeholder ?? 'Seleccionar…'" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="opt in props.field.options"
          :key="opt.value"
          :value="opt.value"
        >
          <span class="flex items-center gap-2">
            <span
              v-if="opt.dotColor"
              class="h-2 w-2 shrink-0 rounded-full"
              :style="{ backgroundColor: opt.dotColor }"
            />
            {{ opt.label }}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>

    <!-- money -->
    <MoneyInput
      v-else-if="props.field.type === 'money'"
      :model-value="moneyValue"
      :currency="props.field.currency"
      :decimals="props.field.decimals"
      :allow-negative="props.field.allow_negative"
      :min="props.field.min"
      :max="props.field.max"
      :placeholder="props.field.placeholder ?? ''"
      :disabled="props.disabled"
      @update:model-value="onSimpleUpdate"
    />

    <!-- otp -->
    <OtpInput
      v-else-if="props.field.type === 'otp'"
      :model-value="otpValue"
      :length="props.field.length"
      :mode="props.field.mode"
      :mask="props.field.mask"
      :disabled="props.disabled"
      @update:model-value="onSimpleUpdate"
    />

    <!-- key-value-array -->
    <DynamicKeyValueFields
      v-else-if="props.field.type === 'key-value-array'"
      :model-value="kvValue"
      :key-type="props.field.key_type"
      :key-options="props.field.key_options"
      :min-rows="props.field.min_rows"
      :max-rows="props.field.max_rows"
      :duplicate-key-policy="props.field.duplicate_key_policy"
      :disabled="props.disabled"
      @update:model-value="onSimpleUpdate"
    />

    <!-- file (single) -->
    <Dropzone
      v-else-if="props.field.type === 'file'"
      :model-value="fileValue"
      :multiple="false"
      :max-files="1"
      :accept="props.field.accept"
      :max-size="props.field.max_size"
      :disabled="props.disabled"
      :aria-label="props.field.placeholder ?? 'Arrastrá un archivo aquí o hacé click para seleccionar'"
      @update:model-value="onDropzoneUpdate"
    />

    <!-- multifile -->
    <Dropzone
      v-else-if="props.field.type === 'multifile'"
      :model-value="multifileValue"
      multiple
      :accept="props.field.accept"
      :max-size="props.field.max_size"
      :max-files="props.field.max_files"
      :disabled="props.disabled"
      :aria-label="props.field.placeholder ?? 'Arrastrá archivos aquí o hacé click para seleccionar'"
      @update:model-value="onDropzoneUpdate"
    />

    <!-- lookup -->
    <Popover
      v-else-if="props.field.type === 'lookup'"
      v-model:open="lookupOpen"
    >
      <PopoverTrigger as-child>
        <Button
          :id="inputId"
          type="button"
          variant="secondary"
          :disabled="props.disabled"
          class="w-full min-w-0 justify-between"
        >
          <span
            :class="cn('min-w-0 flex-1 truncate text-left', selectedLookupLabel ? 'text-t-1' : 'text-t-4')"
          >
            {{ selectedLookupLabel || (props.field.placeholder ?? 'Seleccionar…') }}
          </span>
          <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-[--reka-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Buscar…"
            :disabled="lookupFilterValue === null"
          />
          <CommandList>
            <CommandEmpty v-if="lookupFilterValue === null">
              {{ lookupEmptyHint }}
            </CommandEmpty>
            <CommandEmpty v-else-if="lookupEntries.length === 0">
              Sin resultados
            </CommandEmpty>
            <CommandItem
              v-for="entry in lookupEntries"
              :key="entry.value"
              :value="entry.value"
              @select="pickLookup(entry)"
            >
              <Check
                :class="cn(
                  'mr-2 h-4 w-4',
                  props.modelValue === entry.value ? 'opacity-100' : 'opacity-0',
                )"
              />
              {{ entry.label }}
            </CommandItem>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

    <p v-if="props.field.hint" class="text-xs text-t-4">{{ props.field.hint }}</p>
    <p v-if="props.error" class="text-xs text-danger">{{ props.error }}</p>
  </div>
</template>
