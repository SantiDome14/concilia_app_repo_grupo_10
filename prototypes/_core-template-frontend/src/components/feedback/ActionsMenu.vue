<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// ActionsMenu
// ────────────────────────────────────────────────────────────────────
// Portal-style dropdown anchored to a trigger element.
//
// Why a portal:
//   Rendering inside a <td> with overflow:hidden (the parent table
//   wrapper) would clip the menu. By teleporting to <body> and using
//   fixed positioning, the menu escapes any ancestor overflow.
//
// Smart positioning:
//   - Default: open downward, left-aligned with the trigger.
//   - If there's not enough space below → open upward.
//   - If it would overflow the right edge → align to the right.
//   - Recalculates on scroll/resize of ancestors via a single listener.
//
// Usage:
//   <ActionsMenu :open="isOpen" :anchor="triggerRef" @close="isOpen = false">
//     <slot items />
//   </ActionsMenu>
// ════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  anchor: HTMLElement | null;
  /** Min width of the menu in px. Default 220. */
  minWidth?: number;
  /** Gap between the trigger and the menu. Default 4. */
  offset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  minWidth: 220,
  offset: 4,
});

const emit = defineEmits<{ close: [] }>();

const position = ref({ top: 0, left: 0, width: props.minWidth });

function recalc(): void {
  if (!props.anchor) return;
  const rect = props.anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.max(rect.width, props.minWidth);

  // Horizontal: prefer left-aligned with trigger; flip to right-aligned
  // if the menu would overflow the viewport on the right.
  let left = rect.left;
  if (left + width > vw - 8) {
    left = Math.max(8, rect.right - width);
  }

  // Vertical: measure menu height after render (fallback to estimated 280px
  // before first render). Flip to above if not enough space below.
  const menuEl = menuRef.value;
  const estimatedHeight = menuEl?.offsetHeight ?? 280;
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;

  let top: number;
  if (spaceBelow >= estimatedHeight + props.offset + 8) {
    top = rect.bottom + props.offset;
  } else if (spaceAbove >= estimatedHeight + props.offset + 8) {
    top = rect.top - estimatedHeight - props.offset;
  } else {
    // Neither side fits comfortably — pick the one with more space and clamp.
    if (spaceBelow >= spaceAbove) {
      top = Math.max(8, vh - estimatedHeight - 8);
    } else {
      top = Math.max(8, rect.top - estimatedHeight - props.offset);
    }
  }

  position.value = { top, left, width };
}

const menuRef = ref<HTMLElement | null>(null);

// Recalc when opening, when anchor changes, and on scroll/resize.
watch(
  () => [props.open, props.anchor],
  async ([open]) => {
    if (open) {
      // First paint with estimated size, then refine after the menu mounts
      recalc();
      await Promise.resolve();
      recalc();
    }
  },
  { immediate: true },
);

function onScroll(e: Event): void {
  if (!props.open) return;
  // Close on scroll from outside the menu itself
  const menuEl = menuRef.value;
  if (menuEl && e.target instanceof Node && menuEl.contains(e.target)) return;
  emit('close');
}

function onResize(): void {
  if (!props.open) return;
  recalc();
}

function onDocumentClick(e: MouseEvent): void {
  if (!props.open) return;
  const menuEl = menuRef.value;
  const anchorEl = props.anchor;
  const target = e.target as Node;
  if (menuEl?.contains(target)) return;
  if (anchorEl?.contains(target)) return;
  emit('close');
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.open) emit('close');
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
  document.addEventListener('mousedown', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('mousedown', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
});

const style = computed(() => ({
  position: 'fixed' as const,
  top: `${position.value.top}px`,
  left: `${position.value.left}px`,
  minWidth: `${position.value.width}px`,
  zIndex: 9999,
}));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="menuRef"
      :style="style"
      :class="
        cn(
          'rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]',
        )
      "
      role="menu"
      @click.stop
    >
      <slot />
    </div>
  </Teleport>
</template>
