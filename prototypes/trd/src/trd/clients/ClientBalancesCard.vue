<script setup lang="ts">
import { AlertCircle, Wallet } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { useClientBalances } from '@/composables/useClient';
import { toRef } from 'vue';

const props = defineProps<{ id: string }>();
const idRef = toRef(props, 'id');

const query = useClientBalances(idRef);

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<template>
  <section
    class="rounded-[10px] border border-b-2 bg-card-2 p-5"
    data-testid="client-balances-card"
  >
    <header class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-bold uppercase tracking-wider text-t-3">Balances</h2>
    </header>

    <!-- Loading -->
    <div v-if="query.isLoading.value" class="space-y-3" data-testid="client-balances-skeleton">
      <Skeleton v-for="i in 3" :key="i" class="h-9 w-full" />
    </div>

    <!-- 5xx error → inline retry banner -->
    <div
      v-else-if="query.isError.value"
      class="flex items-center gap-3 rounded-md border border-danger/30 bg-danger-bg p-3"
      data-testid="client-balances-error"
    >
      <AlertCircle class="h-4 w-4 flex-shrink-0 text-danger" />
      <div class="flex-1 text-xs text-t-2">
        No se pudieron cargar los balances del cliente.
      </div>
      <Button variant="secondary" size="sm" @click="query.refetch()">Reintentar</Button>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="(query.data.value ?? []).length === 0"
      :icon="Wallet"
      title="Sin balances disponibles"
      description="Este cliente aún no tiene balances en ninguna moneda."
      data-testid="client-balances-empty"
    />

    <!-- Table -->
    <div v-else class="overflow-hidden rounded-md border border-b-2" data-testid="client-balances-table">
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2 bg-card">
            <th class="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
            <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Balance</th>
            <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Última actualización</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bal in query.data.value ?? []"
            :key="bal.moneda"
            class="border-b border-b-1 last:border-b-0"
          >
            <td class="px-3.5 py-2.5 text-[13px] font-medium text-t-2">{{ bal.moneda }}</td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">{{ bal.balance }}</td>
            <td class="px-3.5 py-2.5 text-right text-xs text-t-3">{{ formatTimestamp(bal.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
