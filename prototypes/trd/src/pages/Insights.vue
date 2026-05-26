<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Calendar, Newspaper } from 'lucide-vue-next';
import PriceAlertsTab from '@/trd/insights/PriceAlertsTab.vue';
import SoonTab from '@/trd/insights/SoonTab.vue';

// ════════════════════════════════════════════════════════════════════
// TRD — Insights (Catálogos)
// ────────────────────────────────────────────────────────────────────
// Cross-tab surface that aggregates everything the trader needs to
// stay aware of:
//   - Alertas de precio (v1, shipped): price-trigger rules.
//   - Eventos de mercado (soon): macro calendar, regulatory dates.
//   - Noticias (soon): sector news feed.
//
// Architectural call: the module is reframed from a narrow
// "price-trigger CRUD" into a broader awareness surface (Yasmani
// session 7). The tabs structure makes future feed integrations
// land as new tabs, not new sidebar entries.
//
// Active tab is URL-synced via `?tab=alertas-precio|eventos|noticias`;
// default is `alertas-precio` (the only tab with content in v1).
// ════════════════════════════════════════════════════════════════════

type InsightsTab = 'alertas-precio' | 'eventos' | 'noticias';

const TABS: { value: InsightsTab; label: string }[] = [
  { value: 'alertas-precio', label: 'Alertas de precio' },
  { value: 'eventos',        label: 'Eventos de mercado' },
  { value: 'noticias',       label: 'Noticias' },
];

const router = useRouter();
const route = useRoute();

function readTab(value: unknown): InsightsTab {
  const v = String(value ?? '');
  if (v === 'eventos' || v === 'noticias') return v;
  return 'alertas-precio';
}

const activeTab = ref<InsightsTab>(readTab(route.query.tab));

watch(activeTab, (next) => {
  router.replace({
    query: next === 'alertas-precio' ? {} : { tab: next },
  });
});
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="insights-page">
    <!-- L1 -->
    <header class="flex flex-col gap-1">
      <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Insights</h1>
      <p class="text-[13px] text-t-4">
        Lo que la Mesa necesita saber del mercado — alertas configuradas,
        eventos relevantes, novedades del sector.
      </p>
    </header>

    <!-- Tabs -->
    <div class="flex items-center gap-1 border-b border-b-2" data-testid="insights-tabs">
      <button
        v-for="t in TABS"
        :key="t.value"
        type="button"
        :class="[
          'px-3 py-2 text-[13px] font-semibold transition-colors',
          activeTab === t.value
            ? 'border-b-2 border-brand text-brand'
            : 'border-b-2 border-transparent text-t-3 hover:text-t-1',
        ]"
        :data-testid="`tab-${t.value}`"
        @click="activeTab = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Tab content -->
    <PriceAlertsTab v-if="activeTab === 'alertas-precio'" />
    <SoonTab
      v-else-if="activeTab === 'eventos'"
      title="Eventos de mercado"
      description="Calendario macroeconómico, anuncios regulatorios y fechas clave que afectan a la Mesa."
      :icon="Calendar"
    />
    <SoonTab
      v-else-if="activeTab === 'noticias'"
      title="Noticias del sector"
      description="Feed curado de noticias y publicaciones relevantes para el trading desk."
      :icon="Newspaper"
    />
  </div>
</template>
