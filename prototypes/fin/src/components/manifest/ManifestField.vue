<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  resolveCatalog,
  resolveCatalogFilter,
  type CatalogEntry,
  type DialogField,
} from '@/lib/manifest';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

const selectedLookupLabel = computed(() => {
  if (!isLookup.value) return '';
  const v = props.modelValue;
  if (typeof v !== 'string' || v === '') return '';
  const hit = lookupEntries.value.find((e) => e.value === v);
  return hit?.label ?? v;
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
    <Input
      v-else-if="props.field.type === 'date'"
      :id="inputId"
      v-model="textValue"
      :placeholder="props.field.placeholder ?? ''"
      :disabled="props.disabled"
      type="date"
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
          class="w-full justify-between"
        >
          <span :class="selectedLookupLabel ? 'text-t-1' : 'text-t-4'">
            {{ selectedLookupLabel || (props.field.placeholder ?? 'Seleccionar…') }}
          </span>
          <ChevronDown class="h-4 w-4 opacity-50" />
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
