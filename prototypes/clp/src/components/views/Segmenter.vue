<script
  setup
  lang="ts"
  generic="Segments extends string"
>
import { ref } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <Segmenter> — L1 segmentation pills
// ────────────────────────────────────────────────────────────────────
// Renders a horizontal pill row for module segmentation
// (e.g. Activos / Histórico, Nuevas / Atendidas). Lives inside the
// L1 page-header actions area; the page is responsible for placement.
//
// Accessibility:
//   - container: role="tablist"
//   - pill: role="tab" + aria-selected
//   - keyboard: ArrowLeft/Right cycle, Home/End jump, Enter/Space activate
// ════════════════════════════════════════════════════════════════════

export interface SegmentOption<Value extends string = string> {
  value: Value;
  label: string;
  count?: number;
}

export interface SegmenterProps<Value extends string = string> {
  modelValue: Value;
  options: SegmentOption<Value>[];
  ariaLabel?: string;
  class?: string;
}

const props = withDefaults(defineProps<SegmenterProps<Segments>>(), {
  ariaLabel: 'Segmentación',
  class: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: Segments];
}>();

const tabRefs = ref<HTMLButtonElement[]>([]);

function selectIndex(index: number): void {
  const option = props.options[index];
  if (!option) return;
  emit('update:modelValue', option.value);
}

function focusIndex(index: number): void {
  const button = tabRefs.value[index];
  if (button) button.focus();
}

function handleKeydown(event: KeyboardEvent, currentIndex: number): void {
  const total = props.options.length;
  if (total === 0) return;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown': {
      event.preventDefault();
      const next = (currentIndex + 1) % total;
      focusIndex(next);
      selectIndex(next);
      break;
    }
    case 'ArrowLeft':
    case 'ArrowUp': {
      event.preventDefault();
      const prev = (currentIndex - 1 + total) % total;
      focusIndex(prev);
      selectIndex(prev);
      break;
    }
    case 'Home': {
      event.preventDefault();
      focusIndex(0);
      selectIndex(0);
      break;
    }
    case 'End': {
      event.preventDefault();
      focusIndex(total - 1);
      selectIndex(total - 1);
      break;
    }
    case 'Enter':
    case ' ': {
      event.preventDefault();
      selectIndex(currentIndex);
      break;
    }
    default:
      break;
  }
}

function setTabRef(el: Element | null, index: number): void {
  if (el instanceof HTMLButtonElement) {
    tabRefs.value[index] = el;
  }
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="props.ariaLabel"
    :class="cn('inline-flex items-center gap-1', props.class)"
  >
    <button
      v-for="(option, index) in props.options"
      :key="option.value"
      :ref="(el) => setTabRef(el as Element | null, index)"
      type="button"
      role="tab"
      :aria-selected="option.value === props.modelValue"
      :tabindex="option.value === props.modelValue ? 0 : -1"
      :class="
        cn(
          'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          option.value === props.modelValue
            ? 'bg-brand-bg text-brand'
            : 'text-t-3 hover:text-t-2',
        )
      "
      @click="selectIndex(index)"
      @keydown="handleKeydown($event, index)"
    >
      <span>{{ option.label }}</span>
      <span
        v-if="typeof option.count === 'number'"
        :class="
          cn(
            'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
            option.value === props.modelValue
              ? 'bg-brand text-white'
              : 'bg-card text-t-3',
          )
        "
      >
        {{ option.count }}
      </span>
    </button>
    <slot name="trailing" />
  </div>
</template>
