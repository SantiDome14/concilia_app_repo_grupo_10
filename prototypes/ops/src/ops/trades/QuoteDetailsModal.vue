<script setup lang="ts">
import { computed } from 'vue';
import { Check, X } from 'lucide-vue-next';
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
import type { QuoteDetails } from './types';

// ════════════════════════════════════════════════════════════════════
// QuoteDetailsModal — read-only hydrated view of a single Quote.
// ────────────────────────────────────────────────────────────────────
// Surfaces every operationally relevant property of a quote, plus the
// two settlement-leg confirmation flags (lado-origen / lado-destino).
// The flags are NOT shown in the table row (operator review 2026-05-22)
// — this is the canonical surface where the operator inspects them.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  quote: QuoteDetails | null;
}>();

const open = defineModel<boolean>('open', { required: true });

function close(): void {
  open.value = false;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'ACCEPTED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'REJECTED' || s === 'EXPIRED' || s === 'CANCELLED') return 'danger';
  return 'neutral';
}

function operationVariant(operation: string): 'success' | 'danger' | 'neutral' {
  const o = operation.toUpperCase();
  if (o === 'BUY') return 'success';
  if (o === 'SELL') return 'danger';
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

function formatDate(value: string | undefined | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

const metadataEntries = computed(() => {
  if (!props.quote?.metadata) return [];
  return Object.entries(props.quote.metadata)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: k, value: String(v) }));
});
</script>

<template>
  <Dialog :open="open" @update:open="open = $event">
    <DialogContent v-if="props.quote" class="max-w-2xl" data-testid="quote-details-modal">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <DialogTitle class="text-lg font-bold text-t-1">
            Cotización {{ props.quote.id }}
          </DialogTitle>
          <Badge :variant="statusVariant(props.quote.status)" class="text-[10px]">
            {{ props.quote.status }}
          </Badge>
        </div>
        <DialogDescription class="text-xs text-t-3">
          {{ props.quote.client_name || '—' }} · {{ formatDate(props.quote.created_at) }}
        </DialogDescription>
      </DialogHeader>

      <!-- Trade summary -->
      <section class="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-b-1 pt-4 text-xs">
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">Operación</div>
          <Badge :variant="operationVariant(props.quote.operation)" class="text-[10px]">
            {{ props.quote.operation || '—' }}
          </Badge>
        </div>
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">Par</div>
          <div class="font-mono text-sm text-t-2">
            {{ props.quote.origin_currency }}/{{ props.quote.destination_currency }}
          </div>
        </div>
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">Término</div>
          <div class="text-sm text-t-2">{{ props.quote.term || '—' }}</div>
        </div>
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">TC</div>
          <div class="font-mono text-sm text-t-2">{{ formatAmount(props.quote.exchange_rate) }}</div>
        </div>
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">Monto origen</div>
          <div class="font-mono text-sm text-t-1">
            {{ formatAmount(props.quote.origin_amount) }} {{ props.quote.origin_currency }}
          </div>
        </div>
        <div>
          <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-4">Calculated destino</div>
          <div class="font-mono text-sm text-t-1">
            {{ formatAmount(props.quote.destination_amount) }} {{ props.quote.destination_currency }}
          </div>
        </div>
      </section>

      <!-- Settlement legs — boolean confirmations recorded by OPS -->
      <section class="space-y-2 border-t border-b-1 pt-4" data-testid="quote-details-legs">
        <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">
          Confirmación de fondos
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div
            class="flex items-center justify-between rounded-md border border-b-2 bg-card-2 px-3 py-2.5"
            :class="props.quote.leg_origen_confirmed ? 'border-success/30' : ''"
            data-testid="quote-leg-origen"
          >
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Lado origen</div>
              <div class="mt-0.5 text-[11px] text-t-3">
                {{ props.quote.leg_origen_confirmed ? 'Confirmado' : 'Sin confirmar' }}
              </div>
            </div>
            <span
              v-if="props.quote.leg_origen_confirmed"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-success-bg text-success"
            >
              <Check class="h-3.5 w-3.5" />
            </span>
            <span
              v-else
              class="flex h-7 w-7 items-center justify-center rounded-full bg-card text-t-4"
            >
              <X class="h-3.5 w-3.5" />
            </span>
          </div>
          <div
            class="flex items-center justify-between rounded-md border border-b-2 bg-card-2 px-3 py-2.5"
            :class="props.quote.leg_destino_confirmed ? 'border-success/30' : ''"
            data-testid="quote-leg-destino"
          >
            <div>
              <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Lado destino</div>
              <div class="mt-0.5 text-[11px] text-t-3">
                {{ props.quote.leg_destino_confirmed ? 'Confirmado' : 'Sin confirmar' }}
              </div>
            </div>
            <span
              v-if="props.quote.leg_destino_confirmed"
              class="flex h-7 w-7 items-center justify-center rounded-full bg-success-bg text-success"
            >
              <Check class="h-3.5 w-3.5" />
            </span>
            <span
              v-else
              class="flex h-7 w-7 items-center justify-center rounded-full bg-card text-t-4"
            >
              <X class="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
        <div v-if="props.quote.origen_note" class="rounded-md bg-card px-3 py-2 text-[11px] text-t-3">
          <span class="font-bold text-t-2">Lado origen · nota:</span> {{ props.quote.origen_note }}
        </div>
        <div v-if="props.quote.destino_note" class="rounded-md bg-card px-3 py-2 text-[11px] text-t-3">
          <span class="font-bold text-t-2">Lado destino · nota:</span> {{ props.quote.destino_note }}
        </div>
      </section>

      <!-- Free-form metadata bag -->
      <section v-if="metadataEntries.length > 0" class="space-y-2 border-t border-b-1 pt-4">
        <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">Metadata</div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          <template v-for="entry in metadataEntries" :key="entry.key">
            <dt class="font-mono text-t-4">{{ entry.key }}</dt>
            <dd class="text-t-2">{{ entry.value }}</dd>
          </template>
        </dl>
      </section>

      <DialogFooter>
        <Button variant="ghost" @click="close">Cerrar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
