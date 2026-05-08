<script setup lang="ts">
import { ref } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import InstructionRow from './InstructionRow.vue';
import type { Account } from './types';

// ════════════════════════════════════════════════════════════════════
// AccountCard — implements Requirement 7. One card per Account, with
// a clickable header that toggles its expanded state. When expanded,
// each `account_instruction` renders as an <InstructionRow>.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  account: Account;
  /** Initial expansion state (default: collapsed). */
  defaultOpen?: boolean;
}>();

const isOpen = ref<boolean>(Boolean(props.defaultOpen));

function toggle(): void {
  isOpen.value = !isOpen.value;
}

function currencyShortLabel(name: string | undefined | null): string {
  return (name ?? '?').slice(0, 3).toUpperCase();
}
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-b-2 bg-card transition-all"
    :data-testid="`account-card-${props.account.id}`"
  >
    <!-- Header -->
    <button
      type="button"
      class="flex w-full items-center gap-4 px-4 py-3 transition-colors hover:bg-card-2"
      :aria-expanded="isOpen"
      :aria-controls="`account-${props.account.id}-content`"
      @click="toggle"
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-bg"
      >
        <span class="text-xs font-bold text-info">
          {{ currencyShortLabel(props.account.currency?.name) }}
        </span>
      </div>
      <div class="min-w-0 flex-1 text-left">
        <div class="mb-0.5 flex items-center gap-2">
          <span class="text-sm font-semibold text-t-1">
            {{ props.account.currency?.name || 'Sin moneda' }}
          </span>
          <Badge
            v-if="props.account.instructions.length > 0"
            variant="info"
            class="font-mono"
          >
            {{ props.account.instructions.length }}
            {{ props.account.instructions.length === 1 ? 'instruction' : 'instructions' }}
          </Badge>
          <Badge v-else variant="neutral">no instructions</Badge>
        </div>
        <div class="flex items-center gap-3 text-xs text-t-4">
          <span class="font-mono">{{ props.account.account_number }}</span>
          <span aria-hidden="true">·</span>
          <span>
            Balance
            <span class="font-mono text-t-2">{{ props.account.balance || '0' }}</span>
          </span>
        </div>
      </div>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-t-4 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </button>

    <!-- Body -->
    <div
      v-if="isOpen"
      :id="`account-${props.account.id}-content`"
      class="border-t border-b-1"
    >
      <div
        v-if="props.account.instructions.length === 0"
        class="px-4 py-6 text-center text-xs italic text-t-4"
      >
        No instructions configured for this account.
      </div>
      <div v-else class="divide-y divide-b-1">
        <InstructionRow
          v-for="instruction in props.account.instructions"
          :key="instruction.id"
          :instruction="instruction"
        />
      </div>
    </div>
  </div>
</template>
