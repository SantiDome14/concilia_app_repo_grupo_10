<script setup lang="ts">
import { computed, toRef } from 'vue';
import { AlertCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Drawer, Timeline } from '@/components/drawer';
import Skeleton from '@/components/feedback/Skeleton.vue';
import {
  useLiquidityActivities,
  useLiquidityOperation,
} from '@/composables/useLiquidity';
import type { BadgeVariants } from '@/components/ui/badge';
import type { LiquidityStatus } from '@/types/liquidity';
import type { ApiError } from '@/types/api';
import LiquiditySummaryCard from './LiquiditySummaryCard.vue';

const props = defineProps<{
  open: boolean;
  operationId: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const id = toRef(props, 'operationId');

const opQuery = useLiquidityOperation(id);
const activitiesQuery = useLiquidityActivities(id);

const STATUS_VARIANT: Record<LiquidityStatus, BadgeVariants['variant']> = {
  PENDING: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<LiquidityStatus, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

const statusBadge = computed(() => {
  const op = opQuery.data.value;
  if (!op) return undefined;
  return {
    label: STATUS_LABEL[op.status],
    variant: STATUS_VARIANT[op.status],
  };
});

const title = computed(() => {
  const op = opQuery.data.value;
  return op ? `${op.id} · ${op.provider_name}` : 'Cargando...';
});

const subtitle = computed(() => {
  const op = opQuery.data.value;
  if (!op) return '';
  return `${op.operation_type} · ${op.base_currency_code}/${op.quote_currency_code} · ${op.term}`;
});

const isNotFound = computed(() => {
  const err = opQuery.error.value as ApiError | null;
  return !!err && 'isNotFound' in err && err.isNotFound;
});
</script>

<template>
  <Drawer
    :open="open"
    :record-id="operationId"
    :title="title"
    :subtitle="subtitle"
    :status-badge="statusBadge"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <template v-if="isNotFound">
      <div
        class="flex flex-col items-center gap-3 py-12 text-center"
        data-testid="liquidity-drawer-not-found"
      >
        <AlertCircle class="h-6 w-6 text-warning" />
        <div class="text-sm font-semibold text-t-2">Operación no encontrada</div>
        <p class="text-xs text-t-4">La operación {{ operationId }} no existe.</p>
      </div>
    </template>

    <template v-else-if="opQuery.isLoading.value">
      <div class="space-y-3" data-testid="liquidity-drawer-skeleton">
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-32 w-full" />
      </div>
    </template>

    <template v-else-if="opQuery.data.value">
      <LiquiditySummaryCard :operation="opQuery.data.value" />
    </template>

    <template v-if="opQuery.data.value" #timeline>
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
          data-testid="liquidity-activities-error"
        >
          <AlertCircle class="h-4 w-4 flex-shrink-0 text-danger" />
          <div class="flex-1 text-xs text-t-2">No se pudo cargar la actividad.</div>
          <Button variant="secondary" size="sm" @click="activitiesQuery.refetch()">
            Reintentar
          </Button>
        </div>
        <Timeline
          v-else
          :events="activitiesQuery.data.value ?? []"
          data-testid="liquidity-timeline"
        />
      </div>
    </template>
  </Drawer>
</template>
