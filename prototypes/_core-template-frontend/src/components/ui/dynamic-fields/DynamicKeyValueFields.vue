<script setup lang="ts">
import { computed } from 'vue';
import { Plus, Trash2, GripVertical } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SelectOption } from '@/types/manifest';

// ════════════════════════════════════════════════════════════════════
// DynamicKeyValueFields — variable list of key-value rows
// ────────────────────────────────────────────────────────────────────
// Spec: `core-forms` (extended). Add/remove rows; emits canonical
// `Array<{ key, value, index }>`. Reorder via vueuse is deferred to
// implementation polish — v1 uses up/down buttons (keyboard-friendly).
// ════════════════════════════════════════════════════════════════════

interface Row {
  key: string;
  value: string;
  index: number;
}

const props = withDefaults(
  defineProps<{
    modelValue?: Row[];
    keyType?: 'text' | 'select';
    keyOptions?: SelectOption[];
    minRows?: number;
    maxRows?: number;
    duplicateKeyPolicy?: 'warn' | 'reject' | 'allow';
    disabled?: boolean;
  }>(),
  {
    modelValue: () => [],
    keyType: 'text',
    keyOptions: () => [],
    minRows: 0,
    maxRows: undefined,
    duplicateKeyPolicy: 'warn',
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: Row[]];
}>();

const rows = computed(() => props.modelValue);

const duplicateKeys = computed<Set<string>>(() => {
  if (props.duplicateKeyPolicy === 'allow') return new Set();
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const r of rows.value) {
    if (!r.key) continue;
    if (seen.has(r.key)) dups.add(r.key);
    else seen.add(r.key);
  }
  return dups;
});

function reindex(arr: Row[]): Row[] {
  return arr.map((r, i) => ({ ...r, index: i }));
}

function emitRows(arr: Row[]): void {
  emit('update:modelValue', reindex(arr));
}

function addRow(): void {
  if (props.maxRows !== undefined && rows.value.length >= props.maxRows) return;
  emitRows([...rows.value, { key: '', value: '', index: rows.value.length }]);
}

function removeRow(idx: number): void {
  if (rows.value.length <= props.minRows) return;
  const next = rows.value.filter((_, i) => i !== idx);
  emitRows(next);
}

function moveRow(idx: number, delta: number): void {
  const target = idx + delta;
  if (target < 0 || target >= rows.value.length) return;
  const arr = [...rows.value];
  const tmp = arr[idx]!;
  arr[idx] = arr[target]!;
  arr[target] = tmp;
  emitRows(arr);
}

function setKey(idx: number, value: string): void {
  const arr = [...rows.value];
  if (!arr[idx]) return;
  arr[idx] = { ...arr[idx], key: value };
  emitRows(arr);
}

function setValue(idx: number, value: string): void {
  const arr = [...rows.value];
  if (!arr[idx]) return;
  arr[idx] = { ...arr[idx], value };
  emitRows(arr);
}

const removeDisabled = computed(() => props.disabled || rows.value.length <= props.minRows);
const addDisabled = computed(
  () => props.disabled || (props.maxRows !== undefined && rows.value.length >= props.maxRows),
);
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(row, idx) in rows"
      :key="idx"
      class="flex items-center gap-2"
    >
      <button
        type="button"
        :disabled="props.disabled"
        :aria-label="`Mover fila ${idx + 1}`"
        class="flex h-9 w-6 items-center justify-center text-t-4 hover:text-t-2 disabled:opacity-50"
        @click="moveRow(idx, -1)"
      >
        <GripVertical class="h-4 w-4" />
      </button>

      <Select
        v-if="props.keyType === 'select'"
        :model-value="row.key"
        :disabled="props.disabled"
        @update:model-value="(v: unknown) => setKey(idx, v == null ? '' : String(v))"
      >
        <SelectTrigger class="flex-1">
          <SelectValue placeholder="Clave…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="opt in props.keyOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-else
        :value="row.key"
        placeholder="Clave"
        :disabled="props.disabled"
        :class="duplicateKeys.has(row.key) ? 'border-warning' : ''"
        class="flex-1"
        @input="(e: Event) => setKey(idx, (e.target as HTMLInputElement).value)"
      />

      <Input
        :value="row.value"
        placeholder="Valor"
        :disabled="props.disabled"
        class="flex-1"
        @input="(e: Event) => setValue(idx, (e.target as HTMLInputElement).value)"
      />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        :disabled="removeDisabled"
        :aria-label="`Eliminar fila ${idx + 1}`"
        @click="removeRow(idx)"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>

    <Button
      type="button"
      variant="ghost"
      size="sm"
      :disabled="addDisabled"
      class="gap-1"
      @click="addRow"
    >
      <Plus class="h-4 w-4" />
      Agregar fila
    </Button>
  </div>
</template>
