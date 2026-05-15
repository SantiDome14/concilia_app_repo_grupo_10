<script setup lang="ts">
import { computed, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useCapabilities } from '@/composables/useCapabilities';
import {
  hasAnyCreableType,
  listCreableTypes,
} from '@/config/inbox-types';
import InboxCreateDialog from './InboxCreateDialog.vue';
import type { Solicitud } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// InboxCreateCTA — main CTA "Crear Solicitud / Tarea"
// ────────────────────────────────────────────────────────────────────
// Contracted in `core-modulo-genericos` Requirement: Inbox MUST expose
// a main CTA filtered by `InboxTypeConfig.creable_manualmente: true`
// AND `manual_creation_capability`.
//
//   - Hidden when no type declares `creable_manualmente: true`.
//   - Disabled with tooltip when the user has no matching capability
//     for ANY creable type (consistent with the universal-`⋯`-menu
//     pattern of `core-actions-menu`).
//   - Label is kind-derived:
//       only solicitud → "Crear Solicitud"
//       only tarea     → "Crear Tarea"
//       mixed kinds    → "Crear"
//   - Click opens `<InboxCreateDialog>` (2-step wizard).
//   - Emits `created` with the new Solicitud<TPayload> for the parent
//     to persist.
// ════════════════════════════════════════════════════════════════════

const emit = defineEmits<{ created: [solicitud: Solicitud] }>();

const caps = useCapabilities();

const open = ref(false);

const creableTypes = computed(() => listCreableTypes(caps.all.value));
const registryHasCreable = computed(() => hasAnyCreableType());

// Visibility / enable
const visible = computed(() => registryHasCreable.value);
const enabled = computed(() => creableTypes.value.length > 0);

const label = computed(() => {
  const types = new Set(creableTypes.value.map((t) => t.type));
  if (types.size === 1) {
    return types.has('tarea') ? 'Crear Tarea' : 'Crear Solicitud';
  }
  return 'Crear';
});

const tooltip = computed(() =>
  enabled.value ? undefined : 'Sin permiso para crear',
);

function handleClick(): void {
  if (!enabled.value) return;
  open.value = true;
}

function onCreated(s: Solicitud): void {
  emit('created', s);
}
</script>

<template>
  <template v-if="visible">
    <Button
      variant="primary"
      size="md"
      :disabled="!enabled"
      :title="tooltip"
      data-testid="inbox-create-cta"
      @click="handleClick"
    >
      <Plus class="mr-1.5 h-4 w-4" />
      {{ label }}
    </Button>
    <InboxCreateDialog
      v-model:open="open"
      :types="creableTypes"
      @created="onCreated"
    />
  </template>
</template>
