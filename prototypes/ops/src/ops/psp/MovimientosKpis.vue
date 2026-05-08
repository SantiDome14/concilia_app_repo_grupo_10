<script setup lang="ts">
import { computed } from 'vue';
import type { PspMovement } from './types';

// ════════════════════════════════════════════════════════════════════
// MovimientosKpis — implements Requirement 5 (modified) of ops-psp.
// 4-card KPI grid for the Movimientos tab. Reads from the FILTERED
// movements list (so the cards reflect the current view, not the
// global state — per Requirement 5 scenario 2).
//
// Cards:
//   1. Movimientos hoy — count of movements created today
//   2. Volumen neto hoy — sum of signed amounts today (mono with sign)
//   3. Pendientes — count with status === 'PENDING' (warning)
//   4. COMPLETED esta semana — count COMPLETED in last 7 days (success)
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  movements: PspMovement[];
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

function isToday(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isWithinDays(iso: string, days: number): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return d.getTime() >= cutoff;
}

const movsToday = computed(() => props.movements.filter((m) => isToday(m.date)));
const movsHoyCount = computed(() => movsToday.value.length);
const volumenNetoHoy = computed(() =>
  movsToday.value.reduce((acc, m) => acc + parseAmount(m.amount), 0),
);
const pendientes = computed(
  () => props.movements.filter((m) => m.status?.toUpperCase() === 'PENDING').length,
);
const completedSemana = computed(
  () =>
    props.movements.filter(
      (m) => m.status?.toUpperCase() === 'COMPLETED' && isWithinDays(m.date, 7),
    ).length,
);

const volumenSign = computed(() =>
  volumenNetoHoy.value >= 0 ? '+' : '−',
);
const volumenTone = computed(() =>
  volumenNetoHoy.value >= 0 ? 'text-success' : 'text-danger',
);
</script>

<template>
  <section
    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    data-testid="movimientos-kpis"
  >
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Movimientos hoy
      </div>
      <div
        class="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-t-1"
      >
        {{ movsHoyCount }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">ingresados al ledger</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Volumen neto hoy
      </div>
      <div
        :class="[
          'font-mono text-2xl font-extrabold leading-none tracking-tight tabular-nums',
          volumenTone,
        ]"
      >
        {{ volumenSign }}${{ formatAmount(Math.abs(volumenNetoHoy)) }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">net flow del día</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        Pendientes
      </div>
      <div
        class="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-warning"
      >
        {{ pendientes }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">esperando confirmación</div>
    </div>
    <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
      <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
        COMPLETED esta semana
      </div>
      <div
        class="text-2xl font-extrabold leading-none tracking-tight tabular-nums text-success"
      >
        {{ completedSemana }}
      </div>
      <div class="mt-1.5 text-[11px] text-t-4">últimos 7 días</div>
    </div>
  </section>
</template>
