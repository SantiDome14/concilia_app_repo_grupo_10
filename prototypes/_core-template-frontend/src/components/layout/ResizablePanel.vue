<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// ResizablePanel — split-pane layout with persisted dimensions
// ────────────────────────────────────────────────────────────────────
// Spec: `core-layout` (extended). Two panels separated by a draggable
// handle. Hand-rolled (vueuse-free for v1) to avoid extra deps.
// Keyboard support: arrows move the split by 5% (10% with Shift).
// ════════════════════════════════════════════════════════════════════

const props = withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical';
    /** Initial size of panel-1 as percent (0-100). */
    defaultSize?: number;
    min1?: number | string;
    min2?: number | string;
    max1?: number | string;
    max2?: number | string;
    storageKey?: string;
  }>(),
  {
    orientation: 'horizontal',
    defaultSize: 50,
    min1: '200px',
    min2: '200px',
    max1: undefined,
    max2: undefined,
    storageKey: undefined,
  },
);

function readPersisted(): number | null {
  if (!props.storageKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`resizable-panel:${props.storageKey}`);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
  } catch {
    return null;
  }
}

function writePersisted(value: number): void {
  if (!props.storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`resizable-panel:${props.storageKey}`, String(value));
  } catch {
    // ignore quota / serialization
  }
}

const sizePct = ref<number>(readPersisted() ?? props.defaultSize);

const containerRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);

function pixelsToPercent(px: number, totalPx: number): number {
  if (totalPx <= 0) return 50;
  return Math.max(0, Math.min(100, (px / totalPx) * 100));
}

function constraintToPercent(
  constraint: number | string | undefined,
  totalPx: number,
): number | null {
  if (constraint === undefined) return null;
  if (typeof constraint === 'number') return constraint;
  if (constraint.endsWith('px')) {
    return pixelsToPercent(parseFloat(constraint), totalPx);
  }
  if (constraint.endsWith('%')) return parseFloat(constraint);
  return null;
}

function clampSize(next: number, totalPx: number): number {
  const min1 = constraintToPercent(props.min1, totalPx) ?? 0;
  const min2 = constraintToPercent(props.min2, totalPx) ?? 0;
  const max1 = constraintToPercent(props.max1, totalPx) ?? 100;
  const max2 = constraintToPercent(props.max2, totalPx) ?? 100;
  const clamped = Math.max(min1, Math.min(max1, next));
  // Honor min2/max2 by inverting: panel-2 size = 100 - clamped.
  const panel2 = 100 - clamped;
  if (panel2 < min2) return 100 - min2;
  if (panel2 > max2) return 100 - max2;
  return clamped;
}

function totalPx(): number {
  if (!containerRef.value) return 0;
  return props.orientation === 'horizontal'
    ? containerRef.value.offsetWidth
    : containerRef.value.offsetHeight;
}

function onPointerDown(event: PointerEvent): void {
  event.preventDefault();
  isDragging.value = true;
  const target = event.currentTarget as HTMLElement;
  target.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  if (!isDragging.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const offset =
    props.orientation === 'horizontal' ? event.clientX - rect.left : event.clientY - rect.top;
  const total = props.orientation === 'horizontal' ? rect.width : rect.height;
  const next = clampSize(pixelsToPercent(offset, total), total);
  sizePct.value = next;
}

function onPointerUp(event: PointerEvent): void {
  if (!isDragging.value) return;
  isDragging.value = false;
  const target = event.currentTarget as HTMLElement;
  try {
    target.releasePointerCapture(event.pointerId);
  } catch {
    // ignore
  }
  writePersisted(sizePct.value);
}

function onKeydown(event: KeyboardEvent): void {
  const isHorizontal = props.orientation === 'horizontal';
  const delta = event.shiftKey ? 10 : 5;
  let next: number | null = null;
  if (isHorizontal && event.key === 'ArrowLeft') next = sizePct.value - delta;
  if (isHorizontal && event.key === 'ArrowRight') next = sizePct.value + delta;
  if (!isHorizontal && event.key === 'ArrowUp') next = sizePct.value - delta;
  if (!isHorizontal && event.key === 'ArrowDown') next = sizePct.value + delta;
  if (next === null) return;
  event.preventDefault();
  sizePct.value = clampSize(next, totalPx());
  writePersisted(sizePct.value);
}

onMounted(() => {
  // No-op — sizePct already initialized from storage or defaultSize.
});

onUnmounted(() => {
  // No-op cleanup; pointer capture is released on pointerup.
});

const containerClass = computed(() =>
  cn('flex h-full w-full', props.orientation === 'horizontal' ? 'flex-row' : 'flex-col'),
);

const panel1Style = computed(() => {
  const dim = props.orientation === 'horizontal' ? 'width' : 'height';
  return { [dim]: `${sizePct.value}%` };
});

const panel2Style = computed(() => {
  const dim = props.orientation === 'horizontal' ? 'width' : 'height';
  return { [dim]: `${100 - sizePct.value}%` };
});

const handleClass = computed(() =>
  cn(
    'shrink-0 bg-card-2 transition-colors',
    'hover:bg-info/30 focus-visible:bg-info/30 focus-visible:outline-none',
    props.orientation === 'horizontal'
      ? 'w-1 cursor-col-resize'
      : 'h-1 cursor-row-resize',
  ),
);
</script>

<template>
  <div ref="containerRef" :class="containerClass">
    <div :style="panel1Style" class="overflow-auto">
      <slot name="panel-1" />
    </div>
    <div
      role="separator"
      tabindex="0"
      :aria-orientation="props.orientation"
      :aria-valuenow="Math.round(sizePct)"
      aria-valuemin="0"
      aria-valuemax="100"
      :class="handleClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @keydown="onKeydown"
    />
    <div :style="panel2Style" class="overflow-auto">
      <slot name="panel-2" />
    </div>
  </div>
</template>
