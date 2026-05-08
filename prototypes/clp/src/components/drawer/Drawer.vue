<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <Drawer> — workflow-typed record detail surface
// ────────────────────────────────────────────────────────────────────
// Right-side slide-in panel that hosts the detail view for record
// types whose lifecycle is workflow-driven (Solicitudes in Inbox,
// Alertas profile B). Contracted in `core-modals` (Requirement:
// Workflow-typed records MUST open a Drawer side panel).
//
// Layout — vertical flex with sticky header/footer:
//   ┌──────────────────────────────────────┐
//   │ Header (sticky):                     │
//   │   [id-chip] [title]   [status] [✕]   │
//   │   [subtitle]                         │
//   ├──────────────────────────────────────┤
//   │ Body (scroll-y):                     │
//   │   <slot name="primary-actions" />    │
//   │   <slot />          ← summary fields │
//   │   <slot name="timeline" />           │
//   │   <slot name="comments" />           │
//   ├──────────────────────────────────────┤
//   │ Footer (sticky): optional secondary  │
//   └──────────────────────────────────────┘
//
// The `primary-actions` slot renders INSIDE the scrollable body, right
// after the header — matching the prototype where the main CTA cluster
// (Atender / Asignarme / etc.) lives at the top of the surface, not at
// the bottom. The footer slot remains for secondary/legacy actions but
// is not used by the canonical Inbox/Alertas pages.
//
// Width: full on mobile, 520px (sm) / 640px (lg) on wider viewports.
// ════════════════════════════════════════════════════════════════════

interface StatusBadge {
  label: string;
  variant?: BadgeVariants['variant'];
}

interface Props {
  open: boolean;
  recordId: string;
  title: string;
  subtitle?: string;
  statusBadge?: StatusBadge;
  /** Optional override for the sheet content classes. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  class: '',
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
});

function close(): void {
  emit('update:open', false);
}
</script>

<template>
  <Sheet :open="isOpen" @update:open="(v) => emit('update:open', v)">
    <SheetContent
      side="right"
      :class="
        cn(
          // Override the sheet primitive's default 75% width with the
          // drawer's responsive cap, and switch to flex column with no
          // padding so we own the header/body/footer regions ourselves.
          'flex w-full flex-col gap-0 p-0 sm:max-w-[520px] lg:max-w-[640px]',
          props.class,
        )
      "
    >
      <!-- Header (sticky) -->
      <SheetHeader
        class="sticky top-0 z-10 flex-row items-start gap-3 border-b border-b-2 bg-card px-6 py-4"
        data-testid="drawer-header"
      >
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center rounded bg-card-2 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-t-3"
              data-testid="drawer-id-chip"
            >
              {{ props.recordId }}
            </span>
            <SheetTitle class="truncate">{{ props.title }}</SheetTitle>
            <Badge
              v-if="props.statusBadge"
              :variant="props.statusBadge.variant"
              class="ml-auto"
              data-testid="drawer-status-badge"
            >
              {{ props.statusBadge.label }}
            </Badge>
          </div>
          <SheetDescription
            :class="cn(props.subtitle ? 'truncate' : 'sr-only')"
          >
            {{ props.subtitle || `Detalle de ${props.recordId}` }}
          </SheetDescription>
        </div>
        <button
          type="button"
          class="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-t-3 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand"
          aria-label="Cerrar"
          data-testid="drawer-close"
          @click="close"
        >
          <X class="h-4 w-4" />
        </button>
      </SheetHeader>

      <!-- Body (scrolls) -->
      <div
        class="flex-1 overflow-y-auto px-6 py-5"
        data-testid="drawer-body"
      >
        <div class="flex flex-col gap-6">
          <section
            v-if="$slots['primary-actions']"
            class="flex flex-wrap items-center gap-2"
            data-testid="drawer-body-primary-actions"
          >
            <slot name="primary-actions" />
          </section>
          <section v-if="$slots.default" data-testid="drawer-body-default">
            <slot />
          </section>
          <section v-if="$slots.timeline" data-testid="drawer-body-timeline">
            <slot name="timeline" />
          </section>
          <section v-if="$slots.comments" data-testid="drawer-body-comments">
            <slot name="comments" />
          </section>
        </div>
      </div>

      <!-- Footer (sticky) -->
      <SheetFooter
        v-if="$slots.footer"
        class="sticky bottom-0 z-10 border-t border-b-2 bg-card px-6 py-4"
        data-testid="drawer-footer"
      >
        <slot name="footer" />
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
