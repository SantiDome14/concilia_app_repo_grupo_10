<script setup lang="ts">
import { ref } from 'vue';
import { Plus, Trash2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import CreatePriceAlertModal from '@/trd/price-alerts/CreatePriceAlertModal.vue';
import DeletePriceAlertConfirm from '@/trd/price-alerts/DeletePriceAlertConfirm.vue';
import {
  usePriceAlertsList,
  useUpdatePriceAlert,
} from '@/composables/usePriceAlerts';
import type { PriceAlert } from '@/types/priceAlert';

// ════════════════════════════════════════════════════════════════════
// Insights — Alertas de precio tab
// ────────────────────────────────────────────────────────────────────
// First tab of the Insights surface. CRUD over price-trigger rules
// (vee-validate + zod create modal; optimistic toggle; destructive
// confirmation for delete). The implementation lives here so the
// outer <Insights.vue> page stays a thin tabs orchestrator.
//
// Surfaces are intentionally minimal — this is a niche configuration
// tool, not a heavy operational module. The list IS the surface (no
// detail page, no drawer, no filters).
// ════════════════════════════════════════════════════════════════════

const query = usePriceAlertsList();
const updateMutation = useUpdatePriceAlert();

const createOpen = ref(false);
const deleteTarget = ref<PriceAlert | null>(null);
const deleteOpen = ref(false);

function openCreate(): void {
  createOpen.value = true;
}

function openDelete(alert: PriceAlert): void {
  deleteTarget.value = alert;
  deleteOpen.value = true;
}

async function toggleActive(alert: PriceAlert): Promise<void> {
  try {
    await updateMutation.mutateAsync({
      id: alert.id,
      patch: { active: !alert.active },
    });
    toast.success(
      alert.active ? 'Alerta pausada' : 'Alerta activada',
    );
  } catch (err) {
    toast.error('No se pudo actualizar la alerta');
    console.error('[insights/price-alerts] toggle error', err);
  }
}

function formatNumber(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 4,
  }).format(num);
}
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="insights-price-alerts-tab">
    <!-- Tab toolbar -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h2 class="text-base font-bold text-t-1">Alertas de precio</h2>
        <p class="text-xs text-t-4">
          Reglas que disparan cuando un activo cruza un umbral.
        </p>
      </div>
      <Button variant="primary" data-testid="pa-create-trigger" @click="openCreate">
        <Plus class="mr-1.5 h-4 w-4" />
        Nueva alerta
      </Button>
    </div>

    <!-- Skeleton -->
    <div
      v-if="query.isLoading.value"
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="price-alerts-skeleton"
    >
      <div class="border-b border-b-2 px-[18px] py-2.5">
        <Skeleton class="h-3 w-32" />
      </div>
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 border-b border-b-1 px-[18px] py-3 last:border-b-0">
        <Skeleton class="h-3 w-1/3" />
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-1/6" />
        <Skeleton class="h-3 w-1/6" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="(query.data.value ?? []).length === 0"
      title="No hay alertas configuradas"
      description="Creá la primera regla para empezar a monitorear precios."
      data-testid="price-alerts-empty"
    />

    <!-- Table -->
    <div
      v-else
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="price-alerts-table"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Nombre</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Lado</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Precio ref.</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Umbral</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Volumen</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="alert in query.data.value ?? []"
            :key="alert.id"
            class="border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            :data-testid="`row-${alert.id}`"
            :class="!alert.active && 'opacity-60'"
          >
            <td class="px-[18px] py-2.5 text-[13px] font-semibold text-t-2">{{ alert.name }}</td>
            <td class="px-3.5 py-2.5">
              <span
                :class="alert.side === 'BUY' ? 'text-success' : 'text-danger'"
                class="text-[11px] font-bold"
              >
                {{ alert.side }}
              </span>
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatNumber(alert.cost_price) }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatNumber(alert.limit_price) }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-xs text-t-3">
              {{ formatNumber(alert.volume) }}
            </td>
            <td class="px-3.5 py-2.5">
              <Badge :variant="alert.active ? 'success' : 'neutral'">
                {{ alert.active ? 'Activa' : 'Pausada' }}
              </Badge>
            </td>
            <td class="px-3.5 py-2.5">
              <div class="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  :data-testid="`row-${alert.id}-toggle`"
                  @click="toggleActive(alert)"
                >
                  {{ alert.active ? 'Pausar' : 'Activar' }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-danger hover:text-danger"
                  :data-testid="`row-${alert.id}-delete`"
                  title="Eliminar alerta"
                  @click="openDelete(alert)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <CreatePriceAlertModal
      :open="createOpen"
      @update:open="(v: boolean) => (createOpen = v)"
    />
    <DeletePriceAlertConfirm
      :open="deleteOpen"
      :alert="deleteTarget"
      @update:open="(v: boolean) => (deleteOpen = v)"
    />
  </div>
</template>
