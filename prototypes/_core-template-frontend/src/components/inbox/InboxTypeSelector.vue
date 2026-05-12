<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import type { InboxTypeConfig } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// InboxTypeSelector — step 1 of the InboxCreateDialog wizard
// ────────────────────────────────────────────────────────────────────
// Lists creable types filtered by `creable_manualmente: true` AND the
// current user's capabilities (filtering done upstream by the parent
// via `listCreableTypes(user.capabilities)`). Each entry surfaces:
//   - kind badge ("Solicitud" / "Tarea")
//   - label of the type
//   - target_app (informational)
// Click selects the type — the parent advances the wizard.
// ════════════════════════════════════════════════════════════════════

interface Props {
  /** Pre-filtered creable types (caller applies registry + capability filters). */
  types: InboxTypeConfig[];
}

defineProps<Props>();
const emit = defineEmits<{ select: [type: InboxTypeConfig] }>();

function kindLabel(kind: InboxTypeConfig['kind']): string {
  return kind === 'solicitud' ? 'Solicitud' : 'Tarea';
}

function kindVariant(kind: InboxTypeConfig['kind']): 'info' | 'neutral' {
  return kind === 'solicitud' ? 'info' : 'neutral';
}
</script>

<template>
  <div class="flex flex-col gap-2" data-testid="inbox-types-list">
    <p class="text-xs text-t-3">
      Seleccioná el tipo de registro a crear.
    </p>
    <ul class="flex flex-col gap-2" role="list">
      <li v-for="t in types" :key="t.type">
        <button
          type="button"
          class="flex w-full items-start gap-3 rounded-md border border-b-2 bg-card p-3 text-left transition-colors hover:bg-card-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          :data-testid="`inbox-type-${t.type}`"
          @click="emit('select', t)"
        >
          <Badge :variant="kindVariant(t.kind)">{{ kindLabel(t.kind) }}</Badge>
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[13px] font-semibold text-t-1">{{ t.label }}</span>
            <span class="text-[11px] text-t-4">
              {{ t.target_app }}<template v-if="t.target_role"> · {{ t.target_role }}</template>
            </span>
          </div>
        </button>
      </li>
    </ul>
  </div>
</template>
