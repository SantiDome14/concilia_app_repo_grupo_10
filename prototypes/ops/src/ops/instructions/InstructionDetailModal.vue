<script setup lang="ts">
import { computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { InstructionStatus, InstructionWithAttributes } from './types';

// ════════════════════════════════════════════════════════════════════
// InstructionDetailModal — read-only surface (Requirement 7)
// ────────────────────────────────────────────────────────────────────
// Absorbs the legacy `/settings/instructions/:id/view` route.
// Footer exposes `Cerrar` + `Editar` (the latter gated by canEdit).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  open: boolean;
  instruction: InstructionWithAttributes | null;
  /** When false, the Editar button is hidden (per ops-instructions Requirement 4). */
  canEdit?: boolean;
  /** Resolved currency labels (id → ISO/display). */
  currencyLabels?: Record<string, string>;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  edit: [];
}>();

const STATUS_LABELS: Record<InstructionStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

function statusVariant(
  status: InstructionStatus,
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'INACTIVE':
      return 'neutral';
  }
}

const sortedAttributes = computed(() => {
  if (!props.instruction) return [];
  return [...props.instruction.attributes].sort((a, b) => a.index_order - b.index_order);
});

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

function close(): void {
  emit('update:open', false);
}

function onEdit(): void {
  emit('edit');
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => (v ? null : close())">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span>{{ props.instruction?.name ?? 'Instrucción' }}</span>
          <Badge
            v-if="props.instruction"
            :variant="statusVariant(props.instruction.status)"
          >
            {{ STATUS_LABELS[props.instruction.status] }}
          </Badge>
        </DialogTitle>
        <DialogDescription v-if="props.instruction">
          {{ props.currencyLabels?.[props.instruction.currency_id] ?? props.instruction.currency_id }}
          · {{ props.instruction.attributes.length }} atributo(s)
        </DialogDescription>
      </DialogHeader>

      <div v-if="props.instruction" class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">Proveedor</div>
            <div class="mt-1 text-t-1">
              {{ props.instruction.provider || '—' }}
            </div>
          </div>
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</div>
            <div class="mt-1 text-t-1">
              {{ props.currencyLabels?.[props.instruction.currency_id] ?? props.instruction.currency_id }}
            </div>
          </div>
        </div>

        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">Descripción</div>
          <div class="mt-1 text-t-1">
            {{ props.instruction.description || '—' }}
          </div>
        </div>

        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-t-3">Atributos</div>
          <ul v-if="sortedAttributes.length > 0" class="mt-2 space-y-1.5">
            <li
              v-for="attr in sortedAttributes"
              :key="`${attr.key}-${attr.index_order}`"
              class="flex items-center gap-3 rounded-md border border-b-1 bg-card-2 px-3 py-2"
            >
              <Badge variant="neutral" class="font-mono">{{ attr.key }}</Badge>
              <span class="flex-1 truncate text-t-1">{{ attr.value }}</span>
            </li>
          </ul>
          <div v-else class="mt-1 text-t-4">Sin atributos</div>
        </div>

        <div class="flex gap-6 border-t border-b-1 pt-3 text-xs text-t-4">
          <div>
            <div class="font-semibold text-t-3">Creada</div>
            <div>{{ formatDate(props.instruction.created_at) }}</div>
          </div>
          <div>
            <div class="font-semibold text-t-3">Actualizada</div>
            <div>{{ formatDate(props.instruction.updated_at) }}</div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">Cerrar</Button>
        <Button v-if="props.canEdit" variant="primary" @click="onEdit">
          Editar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
