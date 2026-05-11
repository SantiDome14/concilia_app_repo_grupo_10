<script setup lang="ts">
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <RecordDetailModal> — generic Detail surface for FIN modules
// ────────────────────────────────────────────────────────────────────
// Implements the `core-modals` Detail pattern: medium width
// (`max-w-lg`), two-column grid of labeled cells (long fields MAY
// span both columns), `Cerrar` / `Editar` footer. Modules feed it a
// flat list of `DetailField` objects describing each cell. The Edit
// transition is delegated via the `onEdit` prop (page-supplied) so
// the modal stays domain-agnostic.
//
// For workflow-typed records (`meta.detail = 'drawer'`), use the
// `<Drawer>` component instead — this modal is for the baseline
// non-workflow records.
// ════════════════════════════════════════════════════════════════════

export type DetailFieldVariant = 'text' | 'mono' | 'badge' | 'section';

export interface DetailField {
  label: string;
  value?: string | number | null | undefined;
  /**
   * Display variant:
   *   - `text` (default) — plain text in `--t-1`
   *   - `mono` — monospaced (ids, amounts)
   *   - `badge` — status pill (set `badge` for the variant)
   *   - `section` — brand-colored uppercase sub-heading; `value` is
   *     ignored. Always spans 2 columns and acts as a group divider
   *     (matches the legacy prototype's "Datos OPS · origen" /
   *     "Gestión FIN" dividers).
   */
  variant?: DetailFieldVariant;
  /** Optional badge variant when `variant === 'badge'`. */
  badge?: BadgeVariants['variant'];
  /** Cells default to span 1 column; pass 2 to span both. */
  span?: 1 | 2;
}

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  /** Optional: invoked when the user clicks "Editar". */
  onEdit?: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

function close(): void {
  emit('update:open', false);
}

function onOpenChange(value: boolean): void {
  if (!value) close();
}

function handleEdit(): void {
  if (props.onEdit) {
    close();
    props.onEdit();
    return;
  }
  toast.info('Edit modal pending — wire onEdit on the page');
}

function renderValue(field: DetailField): string {
  const v = field.value;
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="max-w-lg" data-testid="record-detail-modal">
      <DialogHeader>
        <DialogTitle>{{ props.title }}</DialogTitle>
        <DialogDescription :class="props.subtitle ? '' : 'sr-only'">
          {{ props.subtitle ?? '' }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-2 gap-x-4 gap-y-3 py-2">
        <template v-for="(field, idx) in props.fields" :key="`${field.label}-${idx}`">
          <div
            v-if="field.variant === 'section'"
            class="col-span-2 mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-brand"
          >
            {{ field.label }}
          </div>
          <div
            v-else
            :class="cn('flex flex-col gap-1', field.span === 2 && 'col-span-2')"
          >
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              {{ field.label }}
            </span>
            <Badge
              v-if="field.variant === 'badge'"
              :variant="field.badge ?? 'neutral'"
              class="self-start"
            >
              {{ renderValue(field) }}
            </Badge>
            <span
              v-else
              :class="
                cn(
                  'text-sm text-t-1',
                  field.variant === 'mono' && 'font-mono',
                  field.value == null || field.value === '' ? 'text-t-4' : '',
                )
              "
            >
              {{ renderValue(field) }}
            </span>
          </div>
        </template>
      </div>

      <DialogFooter>
        <Button variant="ghost" data-testid="record-detail-close" @click="close">
          Cerrar
        </Button>
        <Button
          variant="primary"
          data-testid="record-detail-edit"
          @click="handleEdit"
        >
          Editar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
