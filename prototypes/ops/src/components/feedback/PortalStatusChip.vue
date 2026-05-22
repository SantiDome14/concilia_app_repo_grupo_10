<script setup lang="ts">
import { computed } from 'vue';
import type { PortalStatusFlat } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// PortalStatusChip — semaphore-style chip for the Clientes table.
// ────────────────────────────────────────────────────────────────────
// Renders a small badge with a colored dot + label per portal lifecycle:
//   - ACTIVE      → 🟢 green dot · "Activo"
//   - PENDING     → 🟡 amber dot · "Pendiente"
//   - NOT_CREATED → ⚪ gray  dot · "No creado"
// Tokens come from `core-theming` (success / warning / muted t-4) so the
// chip re-themes with the app brand.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  status?: PortalStatusFlat;
}>();

type Spec = {
  label: string;
  dotClass: string;
};

const SPECS: Record<PortalStatusFlat, Spec> = {
  ACTIVE: { label: 'Activo', dotClass: 'bg-success' },
  PENDING: { label: 'Pendiente', dotClass: 'bg-warning' },
  NOT_CREATED: { label: 'No creado', dotClass: 'bg-t-4' },
};

const spec = computed<Spec>(() => SPECS[props.status ?? 'NOT_CREATED']);
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border border-b-1 bg-card-2 px-2 py-0.5 text-[11px] font-medium text-t-2"
    :data-portal-status="props.status ?? 'NOT_CREATED'"
  >
    <span
      class="h-1.5 w-1.5 shrink-0 rounded-full"
      :class="spec.dotClass"
      aria-hidden="true"
    />
    {{ spec.label }}
  </span>
</template>
