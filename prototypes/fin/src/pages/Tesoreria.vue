<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, ChevronDown, Wallet } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Segmenter } from '@/components/views';
import type { SegmentOption } from '@/components/views/Segmenter.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu, ManifestModuleCTAs } from '@/components/manifest';
import { useManifestModule } from '@/composables/useManifestModule';
import {
  FIN_TESORERIA_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.actions';
import {
  FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.cola_asignacion.actions';
import { POS_TREE, TES_MOVS, COLA } from '@/mocks/fin/disponibilidades';
import { RETIROS_COLA } from '@/mocks/fin/retiros_cola';

// ════════════════════════════════════════════════════════════════════
// Tesorería · Disponibilidades — three-dataset surface (L1/L2/L3)
// ────────────────────────────────────────────────────────────────────
//   L1 — title + Module CTA (Cargar movimiento manual) + Segmenter
//        (Posición / Movimientos / Cola de Asignación). The Segmenter
//        is preserved here because the three segments are conceptually
//        different DATASETS (a posición tree, a ledger table, and an
//        assignment queue), not three status windows over the same
//        dataset.
//   L2 — KPI cards (Posición consolidada / movimientos del día /
//        retiros en cola).
//   L3 — body switches per active segment.
//
// Manifest engine: module-scope CTA from `fin.tesoreria` (Cargar
// movimiento manual) is rendered via <ManifestModuleCTAs> in the
// header. The cola segment uses <ManifestActionsMenu> bound to
// `fin.tesoreria.cola_asignacion` for the per-row "Asignar Cuenta de
// Origen" action.
// ════════════════════════════════════════════════════════════════════

useManifestModule(FIN_TESORERIA_MANIFEST_KEY);
useManifestModule(FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY);

type Segment = 'posicion' | 'movimientos' | 'cola';

const segment = ref<Segment>('posicion');

// ─── KPI counters ────────────────────────────────────────────────────
const kpis = computed(() => ({
  sociedades: POS_TREE.length,
  cuentas: POS_TREE.reduce((acc, s) => acc + s.cuentas.length, 0),
  movimientosLedger: TES_MOVS.length,
  retirosCola: RETIROS_COLA.filter((r) => r.cuenta_id === null).length,
}));

const segmentOptions = computed<SegmentOption<Segment>[]>(() => [
  { value: 'posicion', label: 'Posición', count: kpis.value.cuentas },
  { value: 'movimientos', label: 'Movimientos', count: kpis.value.movimientosLedger },
  { value: 'cola', label: 'Cola de asignación', count: kpis.value.retirosCola },
]);

// ─── Posición tree state (collapsible per sociedad) ─────────────────
const expandedSociedades = ref<Record<string, boolean>>(
  Object.fromEntries(POS_TREE.map((s) => [s.id, s.open])),
);

function toggleSociedad(id: string): void {
  expandedSociedades.value[id] = !expandedSociedades.value[id];
}

// ─── Cola: keep only rows still pending an account ──────────────────
const colaActiva = computed(() => RETIROS_COLA.filter((r) => r.cuenta_id === null));

// ─── Helpers ─────────────────────────────────────────────────────────
function fmtMontoCola(monto: number, moneda: string): string {
  return `${moneda} ${monto.toLocaleString('es-AR')}`;
}

function tiempoEnCola(enqueuedAt: string): string {
  const enq = new Date(enqueuedAt).getTime();
  const ref = new Date('2026-04-24T18:00:00Z').getTime();
  const diffH = Math.max(0, Math.floor((ref - enq) / (1000 * 60 * 60)));
  if (diffH < 24) return `${diffH} hs`;
  const days = Math.floor(diffH / 24);
  return `${days} d`;
}
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="tesoreria-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Disponibilidades</h1>
        <p class="mt-1 text-xs text-t-3">
          Posición consolidada, ledger de movimientos y cola de asignación.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <ManifestModuleCTAs :manifest-key="FIN_TESORERIA_MANIFEST_KEY" />
      </div>
    </header>

    <!-- L1 · Segmenter (datasets) -->
    <Segmenter
      v-model="segment"
      :options="segmentOptions"
      aria-label="Seleccionar dataset"
      data-testid="tesoreria-segmenter"
    />

    <!-- L2 · KPI cards -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="tesoreria-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Sociedades
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.sociedades }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">en el grupo</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Cuentas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.cuentas }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">bancos + wallets</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Movimientos
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.movimientosLedger }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">ledger del período</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Retiros en cola
        </div>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight"
          :class="kpis.retirosCola > 0 ? 'text-warning' : 'text-t-1'"
        >
          {{ kpis.retirosCola }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">pendientes de asignación</div>
      </div>
    </section>

    <!-- L3 · Segment-specific body -->
    <section data-testid="tesoreria-body">
      <!-- POSICIÓN — tree by sociedad -->
      <div
        v-if="segment === 'posicion'"
        class="space-y-2"
        data-testid="tesoreria-posicion"
      >
        <div
          v-for="soc in POS_TREE"
          :key="soc.id"
          class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-[18px] py-3 text-left"
            @click="toggleSociedad(soc.id)"
          >
            <component
              :is="expandedSociedades[soc.id] ? ChevronDown : ChevronRight"
              class="h-4 w-4 text-t-3"
            />
            <div class="flex-1">
              <div class="text-sm font-bold text-t-1">{{ soc.name }}</div>
              <div class="text-[11px] text-t-4">{{ soc.sub }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Badge
                v-for="t in soc.totals"
                :key="t.lbl"
                variant="neutral"
                class="font-mono"
              >
                {{ t.lbl }} {{ t.val }}
              </Badge>
            </div>
          </button>
          <div v-if="expandedSociedades[soc.id]" class="border-t border-b-1">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-b-1">
                  <th class="px-[18px] py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                    Cuenta
                  </th>
                  <th class="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                    Detalle
                  </th>
                  <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">
                    Saldo
                  </th>
                  <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">
                    DR
                  </th>
                  <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">
                    CR
                  </th>
                  <th class="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                    Moneda
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cu in soc.cuentas" :key="`${soc.id}-${cu.name}`" class="border-b border-b-1 last:border-b-0">
                  <td class="px-[18px] py-2 text-xs text-t-2">
                    <div class="flex items-center gap-2">
                      <Wallet class="h-3.5 w-3.5 text-t-4" />
                      <span class="font-semibold">{{ cu.name }}</span>
                    </div>
                  </td>
                  <td class="px-3.5 py-2 text-xs text-t-4">{{ cu.det }}</td>
                  <td class="px-3.5 py-2 text-right text-xs font-mono text-t-2">{{ cu.saldo }}</td>
                  <td class="px-3.5 py-2 text-right text-xs font-mono text-t-3">{{ cu.dr }}</td>
                  <td class="px-3.5 py-2 text-right text-xs font-mono text-t-3">{{ cu.cr }}</td>
                  <td class="px-3.5 py-2 text-xs text-t-3">{{ cu.moneda }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MOVIMIENTOS — read-only ledger -->
      <div
        v-else-if="segment === 'movimientos'"
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="tesoreria-movimientos"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cuenta</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Origen</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in TES_MOVS"
              :key="m.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ m.id }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.fecha }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-2">{{ m.tipo }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.cuenta }}</td>
              <td class="px-3.5 py-2.5 text-right text-xs font-mono text-t-2">{{ m.monto }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.origen }}</td>
              <td class="px-3.5 py-2.5">
                <Badge
                  :variant="m.estado === 'CONF' ? 'success' : m.estado === 'COLA' ? 'warning' : 'neutral'"
                >
                  {{ m.estado }}
                </Badge>
              </td>
            </tr>
            <tr v-if="TES_MOVS.length === 0">
              <td colspan="7" class="px-[18px] py-6 text-center text-xs text-t-4">
                No hay movimientos en el período.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- COLA DE ASIGNACIÓN -->
      <div
        v-else
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="tesoreria-cola"
      >
        <EmptyState
          v-if="colaActiva.length === 0"
          title="Sin retiros en cola"
          description="No hay retiros pendientes de asignación de cuenta."
        />
        <table v-else class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tiempo</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in colaActiva"
              :key="r.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`row-${r.id}`"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ r.id }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ r.fecha }}</td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ r.cliente }}</td>
              <td class="px-3.5 py-2.5 text-right text-xs font-mono text-t-2">
                {{ fmtMontoCola(r.monto, r.moneda) }}
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ r.moneda }}</td>
              <td class="px-3.5 py-2.5 text-xs text-warning">{{ tiempoEnCola(r.enqueued_at) }}</td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY"
                    :record="r as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`row-${r.id}-actions`"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- COLA legacy seed kept available for diagnostics/comparison -->
      <div v-if="false" data-testid="legacy-cola-debug">{{ COLA.length }}</div>
    </section>
  </div>
</template>
