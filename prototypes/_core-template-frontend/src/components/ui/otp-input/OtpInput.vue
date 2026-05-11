<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// OtpInput — multi-digit code field
// ────────────────────────────────────────────────────────────────────
// Spec: `core-forms` (extended). N independent slots, autofocus
// advance, paste distribution, optional masked display.
// ════════════════════════════════════════════════════════════════════

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    length?: number;
    mode?: 'numeric' | 'alphanumeric';
    mask?: boolean;
    disabled?: boolean;
  }>(),
  {
    modelValue: '',
    length: 6,
    mode: 'numeric',
    mask: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputRefs = ref<HTMLInputElement[]>([]);

const slots = computed<string[]>(() => {
  const out: string[] = [];
  for (let i = 0; i < props.length; i += 1) {
    out.push(props.modelValue[i] ?? '');
  }
  return out;
});

function sanitize(raw: string): string {
  if (props.mode === 'numeric') return raw.replace(/[^\d]/g, '');
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function emitFromArray(arr: string[]): void {
  emit('update:modelValue', arr.join(''));
}

function setSlot(index: number, value: string): void {
  const sanitized = sanitize(value);
  const arr = [...slots.value];
  arr[index] = sanitized.charAt(0) ?? '';
  emitFromArray(arr);
}

async function focusSlot(index: number): Promise<void> {
  await nextTick();
  const ref = inputRefs.value[index];
  if (ref) ref.focus();
}

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement;
  const raw = target.value;
  setSlot(index, raw);
  if (sanitize(raw).length > 0 && index < props.length - 1) {
    void focusSlot(index + 1);
  }
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace' && slots.value[index] === '' && index > 0) {
    event.preventDefault();
    void focusSlot(index - 1);
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault();
  const data = event.clipboardData?.getData('text') ?? '';
  const sanitized = sanitize(data).slice(0, props.length);
  if (!sanitized) return;
  const arr: string[] = [];
  for (let i = 0; i < props.length; i += 1) {
    arr.push(sanitized[i] ?? '');
  }
  emitFromArray(arr);
  void focusSlot(Math.min(sanitized.length, props.length - 1));
}

function setRef(index: number, el: Element | null | unknown): void {
  if (el && el instanceof HTMLInputElement) {
    inputRefs.value[index] = el;
  }
}
</script>

<template>
  <div class="flex items-center gap-2" @paste="onPaste">
    <input
      v-for="(slot, idx) in slots"
      :key="idx"
      :ref="(el) => setRef(idx, el)"
      :value="props.mask && slot ? '●' : slot"
      :inputmode="props.mode === 'numeric' ? 'numeric' : 'text'"
      :autocapitalize="props.mode === 'alphanumeric' ? 'characters' : 'off'"
      :aria-label="`Dígito ${idx + 1} de ${props.length}`"
      :disabled="props.disabled"
      maxlength="1"
      :class="
        cn(
          'h-12 w-10 rounded-md border border-b-2 bg-card-2 text-center text-lg text-t-1',
          'focus-visible:border-info focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )
      "
      @input="(e) => onInput(idx, e)"
      @keydown="(e) => onKeydown(idx, e)"
    />
  </div>
</template>
