<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronDown, Check, Edit2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { Account } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// StatementAccountStep — implements Requirement 3.
//
// Two presentational states:
//   - Picker — accordion-by-currency
//   - Selected — single chip with `Cambiar` link
//
// Smart single-account default (Decision 7a) is implemented OUTSIDE
// this component, in the modal's effect that auto-emits `pick` when
// `accounts.length === 1`. That keeps this component a pure presenter
// and makes the auto-default behaviour testable without mounting Vue.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Hydrated accounts of the picked client. `null` while in flight. */
  accounts: Account[] | null;
  /** Whether the parent's GET /clients/:id is in flight. */
  isLoading: boolean;
  /** Currently picked account (parent owns the state). */
  selected: Account | null;
}>();

const emit = defineEmits<{
  pick: [account: Account];
  /** Operator clicked Cambiar — return to picker view. */
  reset: [];
}>();

const expandedCurrencies = ref<Set<string>>(new Set());

// Group accounts by currency name (uppercased to 3 chars).
const accountsByCurrency = computed<Record<string, Account[]>>(() => {
  const groups: Record<string, Account[]> = {};
  for (const account of props.accounts ?? []) {
    const code = (account.currency?.name ?? '???').slice(0, 3).toUpperCase();
    (groups[code] ??= []).push(account);
  }
  return groups;
});

// Auto-expand the first currency group when the picker mounts.
watch(
  () => props.accounts,
  (next) => {
    if (!next || next.length === 0) return;
    const first = Object.keys(accountsByCurrency.value)[0];
    if (first) expandedCurrencies.value.add(first);
  },
  { immediate: true },
);

function toggleGroup(code: string): void {
  if (expandedCurrencies.value.has(code)) {
    expandedCurrencies.value.delete(code);
  } else {
    expandedCurrencies.value.add(code);
  }
}

function pick(account: Account): void {
  emit('pick', account);
}

function currencyLabel(account: Account): string {
  return account.currency?.name?.toUpperCase() ?? '???';
}
</script>

<template>
  <!-- Selected → chip with Cambiar -->
  <div
    v-if="props.selected"
    class="flex items-center justify-between rounded-lg border border-b-2 bg-card p-3"
    data-testid="statement-account-chip"
  >
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-bg">
        <span class="text-xs font-bold text-info">
          {{ currencyLabel(props.selected) }}
        </span>
      </div>
      <div class="text-sm">
        <div class="font-mono font-semibold text-t-1">
          {{ props.selected.account_number }}
        </div>
        <div class="text-xs text-t-4">
          Balance
          <span class="font-mono text-t-2">{{ props.selected.balance || '0' }}</span>
        </div>
      </div>
    </div>
    <Button
      variant="ghost"
      size="sm"
      data-testid="statement-account-change"
      @click="emit('reset')"
    >
      <Edit2 class="h-3.5 w-3.5" />
      Cambiar
    </Button>
  </div>

  <!-- Loading -->
  <div v-else-if="props.isLoading" class="space-y-2" data-testid="statement-account-loading">
    <Skeleton class="h-12 w-full" />
    <Skeleton class="h-12 w-full" />
  </div>

  <!-- Empty -->
  <div
    v-else-if="props.accounts && props.accounts.length === 0"
    class="rounded-lg border border-b-1 bg-card p-6"
    data-testid="statement-account-empty"
  >
    <EmptyState
      title="Este cliente no tiene cuentas"
      description="No es posible generar statements para clientes sin cuentas activas"
    />
  </div>

  <!-- Picker (accordion-by-currency) -->
  <div v-else class="flex flex-col gap-2" data-testid="statement-account-picker">
    <div
      v-for="(group, currency) in accountsByCurrency"
      :key="currency"
      class="overflow-hidden rounded-lg border border-b-2 bg-card"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-card-2"
        :data-testid="`statement-account-group-${currency}`"
        :aria-expanded="expandedCurrencies.has(currency)"
        @click="toggleGroup(currency)"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-sm font-semibold text-t-1">{{ currency }}</span>
          <Badge variant="neutral">
            {{ group.length }} {{ group.length === 1 ? 'cuenta' : 'cuentas' }}
          </Badge>
        </div>
        <ChevronDown
          class="h-4 w-4 shrink-0 text-t-4 transition-transform"
          :class="expandedCurrencies.has(currency) ? 'rotate-180' : ''"
        />
      </button>
      <div v-if="expandedCurrencies.has(currency)" class="border-t border-b-1 p-2">
        <button
          v-for="account in group"
          :key="account.id"
          type="button"
          class="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-card-2"
          :data-testid="`statement-account-option-${account.id}`"
          @click="pick(account)"
        >
          <div>
            <div class="font-mono text-sm font-semibold text-t-1">
              {{ account.account_number }}
            </div>
            <div class="text-xs text-t-4">
              Balance
              <span class="font-mono text-t-2">{{ account.balance || '0' }}</span>
            </div>
          </div>
          <Check
            v-if="props.selected && (props.selected as Account).id === account.id"
            class="h-4 w-4 text-success"
          />
        </button>
      </div>
    </div>
  </div>
</template>
