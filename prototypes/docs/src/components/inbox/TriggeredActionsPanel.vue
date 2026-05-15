<script setup lang="ts">
import { computed } from 'vue';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import type { TriggeredAction } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// TriggeredActionsPanel — renders the Solicitud's `triggered_actions[]`
// ────────────────────────────────────────────────────────────────────
// Contract: `core-modulo-genericos` Requirement: Drawer MUST render a
// triggered_actions panel when the Solicitud carries one or more
// entries. Hidden entirely when entries is undefined or empty.
// Status badge mapping:
//   pending → warning ; ok → success ; error → danger
// ════════════════════════════════════════════════════════════════════

interface Props {
  entries: TriggeredAction[] | undefined;
}

const props = defineProps<Props>();

const visible = computed(() => Array.isArray(props.entries) && props.entries.length > 0);

const STATUS_VARIANT: Record<TriggeredAction['status'], BadgeVariants['variant']> = {
  pending: 'warning',
  ok: 'success',
  error: 'danger',
};

const STATUS_LABEL: Record<TriggeredAction['status'], string> = {
  pending: 'Pendiente',
  ok: 'OK',
  error: 'Error',
};
</script>

<template>
  <section
    v-if="visible"
    class="flex flex-col gap-2.5"
    data-testid="triggered-actions-panel"
  >
    <h3 class="text-[11px] font-semibold uppercase tracking-wider text-t-3">
      Acciones disparadas
    </h3>
    <ul class="flex flex-col gap-2" role="list">
      <li
        v-for="(entry, idx) in entries"
        :key="`${entry.action_ref}-${idx}`"
        class="rounded-md border border-b-2 bg-surf p-3"
        :data-testid="`triggered-action-${idx}`"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-[12px] text-t-2">{{ entry.action_ref }}</span>
          <Badge :variant="STATUS_VARIANT[entry.status]">
            {{ STATUS_LABEL[entry.status] }}
          </Badge>
        </div>
        <div
          v-if="entry.result_ref"
          class="mt-1.5 text-[11px] text-t-3"
        >
          <span class="text-t-4">Resultado:</span>
          <span class="ml-1.5 font-mono text-t-2">{{ entry.result_ref }}</span>
        </div>
        <div
          v-if="entry.status === 'error' && entry.error_message"
          class="mt-1.5 text-[11px] text-danger"
        >
          {{ entry.error_message }}
        </div>
      </li>
    </ul>
  </section>
</template>
