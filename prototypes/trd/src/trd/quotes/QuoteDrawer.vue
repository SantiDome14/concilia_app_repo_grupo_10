<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { AlertCircle, Pencil, XCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Drawer, Timeline } from '@/components/drawer';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { useQuote, useQuoteActivities } from '@/composables/useQuotes';
import type { BadgeVariants } from '@/components/ui/badge';
import type { QuoteStatus } from '@/types/quote';
import type { ApiError } from '@/types/api';
import QuoteSummary from './QuoteSummary.vue';
import CancelQuoteConfirm from './CancelQuoteConfirm.vue';
import EditQuoteModal from './EditQuoteModal.vue';

// ════════════════════════════════════════════════════════════════════
// <QuoteDrawer> — workflow-typed detail surface for an OTC Quote
// ────────────────────────────────────────────────────────────────────
// Wraps the shared <Drawer> (core-modals contract). Renders:
//   - Header with id + client name as title + status pill.
//   - Body summary card (origin/destination amounts, term, FX, notes).
//   - Timeline section with the quote's activity log
//     (`GET /quotes/:id/activities`).
//
// The drawer is read-only in v1. Mutations (cancel, edit notes,
// liquidate date) land with `add-trd-quote-cancel-edit`.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  open: boolean;
  quoteId: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const id = toRef(props, 'quoteId');

const quoteQuery = useQuote(id);
const activitiesQuery = useQuoteActivities(id);

const STATUS_VARIANT: Record<QuoteStatus, BadgeVariants['variant']> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<QuoteStatus, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const statusBadge = computed(() => {
  const q = quoteQuery.data.value;
  if (!q) return undefined;
  return {
    label: STATUS_LABEL[q.status],
    variant: STATUS_VARIANT[q.status],
  };
});

const title = computed(() => {
  const q = quoteQuery.data.value;
  return q ? `${q.id} · ${q.client_name}` : 'Cargando...';
});

const subtitle = computed(() => {
  const q = quoteQuery.data.value;
  if (!q) return '';
  return `${q.operation} · ${q.origin_currency}/${q.destination_currency} · ${q.term}`;
});

const isNotFound = computed(() => {
  const err = quoteQuery.error.value as ApiError | null;
  return !!err && 'isNotFound' in err && err.isNotFound;
});

// Mutations are only valid while the quote is in PENDING or
// ACCEPTED — terminal states (COMPLETED, CANCELLED) freeze the
// record per the legacy lifecycle.
const canMutate = computed(() => {
  const status = quoteQuery.data.value?.status;
  return status === 'PENDING' || status === 'ACCEPTED';
});

const cancelOpen = ref(false);
const editOpen = ref(false);
</script>

<template>
  <Drawer
    :open="open"
    :record-id="quoteId"
    :title="title"
    :subtitle="subtitle"
    :status-badge="statusBadge"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <!-- 404 → inline empty state inside the drawer -->
    <template v-if="isNotFound">
      <div
        class="flex flex-col items-center gap-3 py-12 text-center"
        data-testid="quote-drawer-not-found"
      >
        <AlertCircle class="h-6 w-6 text-warning" />
        <div class="text-sm font-semibold text-t-2">Cotización no encontrada</div>
        <p class="text-xs text-t-4">La cotización {{ quoteId }} no existe o fue eliminada.</p>
      </div>
    </template>

    <!-- Loading -->
    <template v-else-if="quoteQuery.isLoading.value">
      <div class="space-y-3" data-testid="quote-drawer-skeleton">
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-32 w-full" />
      </div>
    </template>

    <!-- Loaded -->
    <template v-else-if="quoteQuery.data.value">
      <QuoteSummary :quote="quoteQuery.data.value" />
    </template>

    <!-- Primary actions — visible only for mutable statuses -->
    <template v-if="quoteQuery.data.value && canMutate" #primary-actions>
      <Button
        variant="secondary"
        size="sm"
        data-testid="quote-edit-trigger"
        @click="editOpen = true"
      >
        <Pencil class="mr-1.5 h-3.5 w-3.5" /> Editar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="text-danger hover:text-danger"
        data-testid="quote-cancel-trigger"
        @click="cancelOpen = true"
      >
        <XCircle class="mr-1.5 h-3.5 w-3.5" /> Cancelar cotización
      </Button>
    </template>

    <!-- Timeline slot — activity log -->
    <template v-if="quoteQuery.data.value" #timeline>
      <div class="flex flex-col gap-3">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-t-3">
          Actividad
        </h3>
        <div v-if="activitiesQuery.isLoading.value" class="space-y-2">
          <Skeleton class="h-3 w-1/2" />
          <Skeleton class="h-3 w-2/3" />
        </div>
        <div
          v-else-if="activitiesQuery.isError.value"
          class="flex items-center gap-3 rounded-md border border-danger/30 bg-danger-bg p-3"
          data-testid="quote-activities-error"
        >
          <AlertCircle class="h-4 w-4 flex-shrink-0 text-danger" />
          <div class="flex-1 text-xs text-t-2">
            No se pudo cargar la actividad.
          </div>
          <Button variant="secondary" size="sm" @click="activitiesQuery.refetch()">
            Reintentar
          </Button>
        </div>
        <Timeline
          v-else
          :events="activitiesQuery.data.value ?? []"
          data-testid="quote-timeline"
        />
      </div>
    </template>
  </Drawer>

  <CancelQuoteConfirm
    :open="cancelOpen"
    :quote="quoteQuery.data.value ?? null"
    @update:open="(v: boolean) => (cancelOpen = v)"
  />
  <EditQuoteModal
    :open="editOpen"
    :quote="quoteQuery.data.value ?? null"
    @update:open="(v: boolean) => (editOpen = v)"
  />
</template>
