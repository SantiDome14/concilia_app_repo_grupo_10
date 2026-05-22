<script setup lang="ts">
import { computed, ref } from 'vue';
import { MoreVertical, Check } from 'lucide-vue-next';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useManifestModule } from '@/composables/useManifestModule';
import type { Dimension, ResolvedAction } from '@/types/manifest';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// ManifestActionsMenu — per-row 3-dot menu wired to the manifest engine
// ────────────────────────────────────────────────────────────────────
// Mirrors the prototype's `MFmenu(...)` portal popover (lines 3095-3155
// of `_core-template-frontend.html`):
//   - tiny header "ACCIONES DEL REGISTRO"
//   - sections grouped by `action.dimension` (canonical order)
//   - items with check-icon + label
//   - disabled items: greyed + chip + native title tooltip
//   - danger items: red label
//
// `variant`:
//   - `table` → 28×28 .abtn-style trigger
//   - `card`  → 24×24 .kc-menu-btn-style trigger
// ════════════════════════════════════════════════════════════════════

interface Props {
  manifestKey: string;
  record: Record<string, unknown>;
  variant?: 'table' | 'card';
}

const props = withDefaults(defineProps<Props>(), { variant: 'table' });

const open = ref(false);
const mod = useManifestModule(props.manifestKey);

const DIM_ORDER: Dimension[] = [
  'imputacion',
  'registro_contable',
  'conciliacion',
  'governance',
  'documentacion',
  'cierre',
];

const MF_DIM_HEADERS: Record<Dimension, string> = {
  imputacion: 'Imputación',
  registro_contable: 'Registro Contable',
  // OPS surfaces compensating-entry actions (Crear Ajuste DB/CR) under
  // the `conciliacion` dimension; operator review 2026-05-22 settled on
  // the friendlier label "Ajustes" since the operator perceives them as
  // balance corrections (the immutability mechanic is implementation
  // detail). OPS is the only consumer of `conciliacion` today; FIN /
  // template keep the canonical label until they introduce their own
  // conciliation actions.
  conciliacion: 'Ajustes',
  governance: 'Governance',
  documentacion: 'Documentación',
  cierre: 'Cierre',
};

interface Group {
  dim: Dimension;
  label: string;
  items: ResolvedAction[];
}

const grouped = computed<Group[]>(() => {
  const items = mod.resolveActionsFor(props.record).filter((it) => it.visible);
  return DIM_ORDER.map((dim) => ({
    dim,
    label: MF_DIM_HEADERS[dim],
    items: items.filter((it) => it.action.dimension === dim),
  })).filter((g) => g.items.length > 0);
});

const hasItems = computed(() => grouped.value.length > 0);

function onItemClick(item: ResolvedAction): void {
  if (!item.enabled) return;
  open.value = false;
  mod.openDialog(item.action.id, props.record);
}

const triggerClass = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-md border border-transparent bg-transparent text-t-4 transition-colors hover:bg-card hover:text-t-2',
    props.variant === 'table' ? 'h-7 w-7' : 'h-6 w-6',
    open.value && 'border-b-2 bg-card text-t-2',
  ),
);
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        :class="triggerClass"
        title="Acciones"
        data-testid="manifest-actions-trigger"
        @click.stop
      >
        <MoreVertical :class="props.variant === 'table' ? 'h-3.5 w-3.5' : 'h-3 w-3'" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" :side-offset="4" class="w-[260px] p-1.5">
      <!-- data-testid + click-stop live on this inner div: PopoverContent
           wraps a teleport-rooted PopoverPortal whose attrs can't be
           auto-inherited (Vue warns), so we ground them on a real DOM
           node here. -->
      <div data-testid="manifest-actions-menu" @click.stop>
        <div class="text-t-4 px-3 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.06em]">
          Acciones del registro
        </div>
        <div
          v-if="!hasItems"
          class="text-t-3 px-3 py-2 text-sm"
          data-testid="manifest-actions-empty"
        >
          Sin acciones disponibles
        </div>
        <template v-for="g in grouped" :key="g.dim">
          <div
            class="text-t-4 px-3 pb-1 pt-1.5 text-[9px] font-bold uppercase tracking-[0.06em]"
            :data-testid="`manifest-actions-section-${g.dim}`"
          >
            {{ g.label }}
          </div>
          <button
            v-for="it in g.items"
            :key="it.action.id"
            type="button"
            :title="it.reason ?? undefined"
            :disabled="!it.enabled"
            :data-testid="`manifest-actions-item-${it.action.id}`"
            :class="
              cn(
                'flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-[13px] transition-colors',
                it.enabled
                  ? it.action.danger
                    ? 'text-danger hover:bg-card'
                    : 'text-t-2 hover:bg-card hover:text-t-1'
                  : 'text-t-4 cursor-not-allowed',
              )
            "
            @click="onItemClick(it)"
          >
            <Check class="h-3 w-3 shrink-0" :class="it.enabled ? '' : 'opacity-50'" />
            <span class="flex-1 truncate">{{ it.action.label }}</span>
            <span
              v-if="!it.enabled && it.tag"
              :class="
                cn(
                  'shrink-0 rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider',
                  it.tag === 'V2' ? 'bg-danger/10 text-danger' : 'text-t-4 bg-white/[0.05]',
                )
              "
            >
              {{ it.tag }}
            </span>
          </button>
        </template>
      </div>
    </PopoverContent>
  </Popover>
</template>
