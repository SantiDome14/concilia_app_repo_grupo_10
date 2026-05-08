<script setup lang="ts">
import { computed } from 'vue';
import { Check, AlertCircle } from 'lucide-vue-next';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { AccountInstructionFormState, Rail } from './types';

// ════════════════════════════════════════════════════════════════════
// RailsStep — implements Requirement 7. Multi-select grid; at least
// one rail is required to enable the modal's submit button (the
// modal owns the submit gating).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  formState: AccountInstructionFormState;
  rails: Rail[];
  isLoading: boolean;
  hasFetchError: boolean;
}>();

const emit = defineEmits<{
  retry: [];
  'toggle-rail': [railId: string];
}>();

const selectedSet = computed(() => new Set(props.formState.selectedRailIds));

function toggleRail(railId: string): void {
  emit('toggle-rail', railId);
}
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="rails-step">
    <div>
      <h3 class="text-sm font-semibold text-t-1">Rails de pago</h3>
      <p class="text-xs text-t-4">
        Asociá uno o más rails con esta instrucción.
      </p>
    </div>

    <div v-if="props.isLoading" class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <Skeleton v-for="i in 6" :key="i" class="h-16 w-full" />
    </div>

    <div
      v-else-if="props.hasFetchError"
      class="rounded-lg border border-danger/30 bg-danger-bg p-4"
      data-testid="rails-error"
    >
      <div class="mb-2 flex items-center gap-2">
        <AlertCircle class="h-4 w-4 text-danger" />
        <p class="text-sm font-semibold text-danger">No se pudieron cargar los rails</p>
      </div>
      <Button variant="ghost" size="sm" @click="emit('retry')">Reintentar</Button>
    </div>

    <div
      v-else-if="props.rails.length === 0"
      class="rounded-lg border border-b-1 bg-card p-6 text-center text-xs text-t-4"
    >
      No hay rails configurados.
    </div>

    <div
      v-else
      class="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
      data-testid="rails-grid"
    >
      <button
        v-for="rail in props.rails"
        :key="rail.id"
        type="button"
        :class="
          cn(
            'flex flex-col items-start gap-1.5 rounded-lg border-2 p-3 text-left transition-all',
            selectedSet.has(rail.id)
              ? 'border-brand bg-brand-bg'
              : 'border-b-1 bg-card hover:bg-card-2',
          )
        "
        :data-testid="`rail-option-${rail.id}`"
        :aria-pressed="selectedSet.has(rail.id)"
        @click="toggleRail(rail.id)"
      >
        <div class="flex w-full items-center justify-between">
          <span class="text-sm font-semibold text-t-1">{{ rail.name }}</span>
          <Check
            v-if="selectedSet.has(rail.id)"
            class="h-4 w-4 shrink-0 text-brand"
          />
        </div>
        <span v-if="rail.description" class="text-xs text-t-4">{{ rail.description }}</span>
      </button>
    </div>

    <p
      v-if="props.formState.selectedRailIds.length === 0"
      class="text-xs text-warning"
      data-testid="rails-hint"
    >
      Seleccioná al menos un rail
    </p>
  </div>
</template>
