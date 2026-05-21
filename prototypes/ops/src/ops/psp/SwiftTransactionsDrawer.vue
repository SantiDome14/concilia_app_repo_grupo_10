<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { X, Copy } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { listSwiftTransactionsForAccount } from '@/api/modules/psp';
import { getSponsorLabel } from './sponsor-catalog';
import type { PspAccount } from './types';

// ════════════════════════════════════════════════════════════════════
// SwiftTransactionsDrawer — implements part of Requirement 6.
// Right-side drawer for an Account drill-down (account header + SWIFT
// transactions). NOT using the workflow-record `<Drawer>` because the
// PSP account isn't a workflow record (no status lifecycle); the
// canonical `<Sheet>` from `core-modals` is the better fit.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  account: PspAccount | null;
}>();

const open = defineModel<boolean>('open', { required: true });

const accountId = computed(() => props.account?.id ?? null);

const transactionsQuery = useQuery({
  queryKey: computed(() => ['ops', 'psp', 'swift', accountId.value] as const),
  queryFn: () => listSwiftTransactionsForAccount(accountId.value!),
  enabled: computed(() => Boolean(open.value && accountId.value)),
});

const transactions = computed(() => transactionsQuery.data.value?.data ?? []);

function close(): void {
  open.value = false;
}

function copyToClipboard(value: string | undefined): void {
  if (!value) return;
  void navigator.clipboard
    .writeText(value)
    .then(() => toast.success('Copiado al portapapeles'))
    .catch(() => toast.error('No se pudo copiar'));
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
</script>

<template>
  <Sheet :open="open" @update:open="(v: boolean) => (open = v)">
    <SheetContent
      side="right"
      class="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      data-testid="swift-drawer"
    >
      <!-- Header -->
      <SheetHeader class="flex flex-row items-start justify-between gap-3 border-b border-b-2 px-5 py-4">
        <div v-if="props.account" class="min-w-0 flex-1">
          <SheetTitle class="text-base font-bold text-t-1">
            {{ props.account.account_number }}
          </SheetTitle>
          <SheetDescription class="mt-1 flex flex-wrap items-center gap-2 text-xs text-t-4">
            <Badge variant="info">{{ props.account.currency || '—' }}</Badge>
            <span>·</span>
            <span class="font-mono text-t-2">${{ formatAmount(props.account.balance) }}</span>
            <span>·</span>
            <span>{{ getSponsorLabel(props.account.sponsor) }}</span>
            <span v-if="props.account.alias">·</span>
            <span v-if="props.account.alias" class="font-mono text-t-3">{{ props.account.alias }}</span>
          </SheetDescription>
        </div>
        <Button variant="ghost" size="sm" data-testid="swift-drawer-close" @click="close">
          <X class="h-4 w-4" />
        </Button>
      </SheetHeader>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto px-5 py-4">
        <!-- CVU / alias quick-copy section -->
        <div
          v-if="props.account?.cvu"
          class="mb-4 flex items-center justify-between rounded-lg border border-b-1 bg-card-2 px-3 py-2 text-xs"
          data-testid="swift-drawer-cvu"
        >
          <div>
            <div class="text-t-4">CVU</div>
            <div class="font-mono text-t-1">{{ props.account.cvu }}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            :aria-label="'Copiar CVU'"
            @click="copyToClipboard(props.account?.cvu)"
          >
            <Copy class="h-3.5 w-3.5" />
          </Button>
        </div>

        <!-- Heading -->
        <h3 class="mb-3 text-sm font-semibold text-t-1">SWIFT transactions</h3>

        <!-- Loading -->
        <div v-if="transactionsQuery.isPending.value" class="space-y-2" data-testid="swift-drawer-loading">
          <Skeleton v-for="i in 4" :key="i" class="h-12 w-full" />
        </div>

        <!-- Error -->
        <div
          v-else-if="transactionsQuery.isError.value"
          class="rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger"
          data-testid="swift-drawer-error"
        >
          <p class="mb-2 font-semibold">No se pudieron cargar las transacciones SWIFT</p>
          <Button variant="ghost" size="sm" @click="() => void transactionsQuery.refetch()">
            Reintentar
          </Button>
        </div>

        <!-- Empty -->
        <EmptyState
          v-else-if="transactions.length === 0"
          title="Sin transacciones"
          description="Esta cuenta no registra transacciones SWIFT recientes"
        />

        <!-- Table -->
        <div v-else class="overflow-hidden rounded-lg border border-b-1 bg-card">
          <table class="w-full text-xs">
            <thead class="border-b border-b-1 text-[10px] font-bold uppercase tracking-wider text-t-4">
              <tr>
                <th class="px-3 py-2 text-left">Fecha</th>
                <th class="px-3 py-2 text-left">Tipo</th>
                <th class="px-3 py-2 text-right">Monto</th>
                <th class="px-3 py-2 text-left">Contraparte</th>
                <th class="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-b-1">
              <tr
                v-for="tx in transactions"
                :key="tx.id"
                :data-testid="`swift-tx-${tx.id}`"
              >
                <td class="whitespace-nowrap px-3 py-2 font-mono text-t-3">{{ tx.date }}</td>
                <td class="px-3 py-2">
                  <Badge variant="info">{{ tx.message_type || '—' }}</Badge>
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-right font-mono text-t-1">
                  {{ tx.currency }} ${{ formatAmount(tx.amount) }}
                </td>
                <td class="max-w-[160px] truncate px-3 py-2 text-t-2" :title="tx.counterparty ?? ''">
                  {{ tx.counterparty || '—' }}
                </td>
                <td class="px-3 py-2 text-t-2">{{ tx.status || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
