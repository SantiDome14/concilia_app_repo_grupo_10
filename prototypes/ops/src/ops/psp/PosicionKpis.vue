<script setup lang="ts">
import { computed } from 'vue';
import type { PspAccount, PspMovement, SponsorBalance } from './types';

// ════════════════════════════════════════════════════════════════════
// PosicionKpis — implements Requirement 4 (modified) of ops-psp.
// 4-card KPI grid for the Posición tab, computed from the source data
// (sponsor balances + movements + accounts) per design.md "frontend
// computes the KPIs from the existing fetched data" decision.
//
// Columns:
//   1. Posición consolidada — sum of sponsor balances (neutral)
//   2. Liquidez disponible — consolidated minus committed (success)
//   3. Comprometido — sum of pending movements DR + held quotes (warning)
//   4. Cuentas activas — count of accounts with status === 'ACTIVE'
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  balances: SponsorBalance[];
  /** Movements list filtered to "current" (today) — used for committed metric. */
  movements: PspMovement[];
  accounts: PspAccount[];
}>();

function parseAmount(value: string): number {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const consolidated = computed(() =>
  props.balances.reduce((acc, b) => acc + parseAmount(b.balance), 0),
);

// "Comprometido" — sum of pending movements (legacy semantic: DR holds money).
const committed = computed(() =>
  props.movements
    .filter((m) => m.status?.toUpperCase() === 'PENDING')
    .reduce((acc, m) => acc + parseAmount(m.amount), 0),
);

const liquidity = computed(() => Math.max(consolidated.value - committed.value, 0));

const activeAccountsCount = computed(
  () => props.accounts.filter((a) => a.status?.toUpperCase() === 'ACTIVE').length,
);

const sponsorsActive = computed(() => {
  const set = new Set<string>();
  for (const b of props.balances) set.add(b.sponsor);
  return set.size;
});
</script>

<template>
  <section
    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    data-testid="posicion-kpis"
  >
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Posición consolidada
      </div>
      <div
        class="font-mono text-2xl font-extrabold leading-none tracking-tight tabular-nums text-t-1"
      >
        ${{ formatAmount(consolidated) }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">equivalente · todas las monedas</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Liquidez disponible
      </div>
      <div
        class="font-mono text-2xl font-extrabold leading-none tracking-tight tabular-nums text-success"
      >
        ${{ formatAmount(liquidity.valueOf()) }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">no comprometida</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Comprometido
      </div>
      <div
        class="font-mono text-2xl font-extrabold leading-none tracking-tight tabular-nums text-warning"
      >
        ${{ formatAmount(committed.valueOf()) }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">en quotes activos / retiros</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Cuentas activas
      </div>
      <div
        class="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-t-1"
      >
        {{ activeAccountsCount }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">
        en {{ sponsorsActive }} {{ sponsorsActive === 1 ? 'sponsor' : 'sponsors' }}
      </div>
    </div>
  </section>
</template>
