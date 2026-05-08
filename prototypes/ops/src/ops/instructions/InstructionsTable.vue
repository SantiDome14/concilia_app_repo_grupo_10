<script setup lang="ts">
import { Pencil, Trash2, MoreHorizontal } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { Instruction } from './types';

// ════════════════════════════════════════════════════════════════════
// InstructionsTable — implements Requirements 2 (column set + row click)
// and 3 (filter state). The page owns the data fetch + filter state and
// passes the rows here. The table emits `row-click` (outside Acciones)
// and `action` events; the page wires those to the modals.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Instruction[];
  isLoading: boolean;
  /** True when at least one filter is active — drives the EmptyState copy. */
  hasActiveFilters: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Map of currency_id → label for column display. */
  currencyLabels: Record<string, string>;
}>();

const emit = defineEmits<{
  'row-click': [instruction: Instruction];
  'edit': [instruction: Instruction];
  'delete': [instruction: Instruction];
  'clear-filters': [];
}>();

function onRowClick(instruction: Instruction, event: MouseEvent): void {
  // Stop-propagation pattern: clicks inside the Acciones cell already
  // stopped propagation, so this only fires for clicks elsewhere.
  if ((event.target as HTMLElement | null)?.closest('[data-actions-cell]')) return;
  emit('row-click', instruction);
}

function onEdit(instruction: Instruction, event: MouseEvent): void {
  event.stopPropagation();
  emit('edit', instruction);
}

function onDelete(instruction: Instruction, event: MouseEvent): void {
  event.stopPropagation();
  emit('delete', instruction);
}

const showActions = (): boolean => Boolean(props.canEdit || props.canDelete);
</script>

<template>
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Nombre</th>
          <th class="px-4 py-3 text-left">Moneda</th>
          <th class="px-4 py-3 text-left">Descripción</th>
          <th class="px-4 py-3 text-left">Atributos</th>
          <th v-if="showActions()" class="w-12 px-4 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading -->
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-48" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-8" /></td>
            <td v-if="showActions()" class="px-4 py-3" />
          </tr>
        </template>

        <!-- Empty -->
        <tr v-else-if="props.rows.length === 0">
          <td :colspan="showActions() ? 5 : 4" class="px-4 py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="No hay instrucciones cargadas"
              description="Hacé click en + Crear instrucción para empezar"
            />
            <EmptyState
              v-else
              title="Sin resultados para los filtros aplicados"
              description="Probá ajustar los filtros o limpialos para ver todas las instrucciones."
            />
            <div v-if="props.hasActiveFilters" class="mt-3 flex justify-center">
              <Button variant="ghost" @click="emit('clear-filters')">
                Limpiar filtros
              </Button>
            </div>
          </td>
        </tr>

        <!-- Rows -->
        <tr
          v-for="row in props.rows"
          v-else
          :key="row.id"
          class="cursor-pointer border-t border-b-1 transition-colors hover:bg-card-2"
          @click="(e) => onRowClick(row, e)"
        >
          <td class="px-4 py-3 text-t-1">{{ row.name }}</td>
          <td class="px-4 py-3 text-t-2">
            {{ props.currencyLabels[row.currency_id] ?? row.currency_id }}
          </td>
          <td class="max-w-md truncate px-4 py-3 text-t-3" :title="row.description ?? ''">
            {{ row.description || '—' }}
          </td>
          <td class="px-4 py-3">
            <Badge variant="neutral" class="font-mono">{{ row.attributes_count }}</Badge>
          </td>
          <td v-if="showActions()" data-actions-cell class="px-4 py-3 text-right">
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="ghost"
                  size="sm"
                  :aria-label="`Acciones de ${row.name}`"
                  class="h-7 w-7 p-0"
                  @click.stop
                >
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" class="w-40 p-1">
                <button
                  v-if="props.canEdit"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-t-2 transition-colors hover:bg-card hover:text-t-1"
                  @click="(e) => onEdit(row, e)"
                >
                  <Pencil class="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  v-if="props.canDelete"
                  type="button"
                  class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-bg"
                  @click="(e) => onDelete(row, e)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </PopoverContent>
            </Popover>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
