<script setup lang="ts">
import { computed, ref } from 'vue';
import { Download, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSponsorLabel } from '@/ops/psp/sponsor-catalog';
import { getReceipt } from '@/api/modules/movimientos';
import type { MovementDetails } from './types';

// ════════════════════════════════════════════════════════════════════
// MovementDetailsModal — implements Requirement 4 + Decision 2
// (canonical home; ops-psp follow-up imports from here).
//
// Presentational only — the parent hydrates the `movement` prop. The
// only side effect is the Receipt download action.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  movement: MovementDetails | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const isDownloading = ref(false);

function close(): void {
  open.value = false;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'FAILED' || s === 'CANCELLED') return 'danger';
  return 'neutral';
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const metadataEntries = computed(() => {
  if (!props.movement?.metadata) return [];
  return Object.entries(props.movement.metadata)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: k, value: String(v) }));
});

async function downloadReceipt(): Promise<void> {
  if (!props.movement || isDownloading.value) return;
  isDownloading.value = true;
  try {
    const result = await getReceipt(props.movement.id);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
      return;
    }
    toast.error('No se pudo descargar el comprobante');
  } finally {
    isDownloading.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      v-if="props.movement"
      class="sm:max-w-2xl"
      data-testid="movement-details-modal"
      @open-auto-focus="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <span>Movimiento</span>
          <Badge :variant="statusVariant(props.movement.status)">
            {{ props.movement.status || '—' }}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          <span class="font-mono text-xs text-t-3">{{ props.movement.id }}</span>
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3">
        <!-- Headline amount -->
        <div class="rounded-lg border border-b-1 bg-card-2 px-4 py-3">
          <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Monto</div>
          <div class="font-mono text-2xl font-bold text-t-1">
            {{ props.movement.currency || '—' }} ${{ formatAmount(props.movement.amount) }}
          </div>
        </div>

        <!-- Canonical fields -->
        <dl
          class="grid grid-cols-[120px_1fr] gap-y-2 rounded-lg border border-b-1 bg-card px-4 py-3 text-sm"
          data-testid="movement-details-fields"
        >
          <dt class="text-t-4">Tipo</dt>
          <dd class="text-t-1">{{ props.movement.type || '—' }}</dd>
          <dt class="text-t-4">Fecha</dt>
          <dd class="font-mono text-t-2">{{ formatDate(props.movement.date) }}</dd>
          <dt class="text-t-4">Origen</dt>
          <dd class="text-t-2">{{ props.movement.origin || '—' }}</dd>
          <dt class="text-t-4">Destino</dt>
          <dd class="text-t-2">{{ props.movement.destination || '—' }}</dd>
          <dt class="text-t-4">Sponsor</dt>
          <dd class="text-t-2">{{ getSponsorLabel(props.movement.sponsor) }}</dd>
          <dt class="text-t-4">Cliente</dt>
          <dd class="text-t-2">{{ props.movement.client || '—' }}</dd>
          <dt class="text-t-4">Contraparte</dt>
          <dd class="text-t-2">{{ props.movement.counterparty || '—' }}</dd>
          <template v-if="props.movement.created_at">
            <dt class="text-t-4">Creado</dt>
            <dd class="font-mono text-t-3">{{ formatDate(props.movement.created_at) }}</dd>
          </template>
          <template v-if="props.movement.updated_at">
            <dt class="text-t-4">Actualizado</dt>
            <dd class="font-mono text-t-3">{{ formatDate(props.movement.updated_at) }}</dd>
          </template>
        </dl>

        <!-- Metadata bag (collapsible) -->
        <details
          v-if="metadataEntries.length > 0"
          class="rounded-lg border border-b-1 bg-card-2 px-3 py-2 text-xs"
          data-testid="movement-details-metadata"
        >
          <summary class="cursor-pointer font-semibold text-t-3 hover:text-t-1">
            Metadata ({{ metadataEntries.length }})
          </summary>
          <dl class="mt-2 grid grid-cols-[140px_1fr] gap-y-1">
            <template v-for="entry in metadataEntries" :key="entry.key">
              <dt class="text-t-4">{{ entry.key }}</dt>
              <dd class="break-all font-mono text-t-2">{{ entry.value }}</dd>
            </template>
          </dl>
        </details>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">Cerrar</Button>
        <Button
          variant="primary"
          :disabled="isDownloading"
          data-testid="movement-receipt-download"
          @click="downloadReceipt"
        >
          <Loader2 v-if="isDownloading" class="h-3.5 w-3.5 animate-spin" />
          <Download v-else class="h-3.5 w-3.5" />
          Descargar comprobante
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
