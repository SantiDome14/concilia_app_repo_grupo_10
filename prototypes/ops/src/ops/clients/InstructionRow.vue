<script setup lang="ts">
import { ref } from 'vue';
import { Copy, FileText, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getConfirmationLetter } from './api';
import type { AccountInstruction } from './types';

// ════════════════════════════════════════════════════════════════════
// InstructionRow — implements Requirement 7 (Copy + Letter actions)
// and Requirement 9 (single-rail vs multi-rail letter handling).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  instruction: AccountInstruction;
}>();

const isLoadingLetter = ref(false);
const railPickerOpen = ref(false);

function copyToClipboard(): void {
  const lines = [`INSTRUCTION: ${props.instruction.instruction_name}`];
  lines.push('-------------------');
  for (const field of props.instruction.fields) {
    if (field.value) lines.push(`${field.display}: ${field.value}`);
  }
  void navigator.clipboard
    .writeText(lines.join('\n'))
    .then(() => toast.success('Copied!'))
    .catch(() => toast.error('No se pudo copiar al portapapeles'));
}

async function fetchLetter(rail: string): Promise<void> {
  if (isLoadingLetter.value) return;
  isLoadingLetter.value = true;
  railPickerOpen.value = false;
  try {
    const result = await getConfirmationLetter(props.instruction.id, rail);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    } else {
      toast.error('Failed to generate confirmation letter');
    }
  } finally {
    isLoadingLetter.value = false;
  }
}

function onLetterClick(): void {
  const rails = props.instruction.rails;
  if (!rails || rails.length === 0) return;
  if (rails.length === 1) {
    void fetchLetter(rails[0]!);
  } else {
    railPickerOpen.value = !railPickerOpen.value;
  }
}
</script>

<template>
  <div class="px-4 py-3.5">
    <div class="flex items-start justify-between gap-3 mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <span class="block h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
        <p class="truncate text-sm font-medium text-t-1">
          {{ props.instruction.instruction_name }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          class="h-7 px-2.5 text-xs"
          :data-testid="`instruction-copy-${props.instruction.id}`"
          @click.stop="copyToClipboard"
        >
          <Copy class="h-3 w-3" />
          Copy
        </Button>
        <template v-if="props.instruction.rails && props.instruction.rails.length > 0">
          <Popover
            v-if="props.instruction.rails.length > 1"
            v-model:open="railPickerOpen"
          >
            <PopoverTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="h-7 px-2.5 text-xs"
                :disabled="isLoadingLetter"
                :data-testid="`instruction-letter-${props.instruction.id}`"
                @click.stop="onLetterClick"
              >
                <Loader2 v-if="isLoadingLetter" class="h-3 w-3 animate-spin" />
                <FileText v-else class="h-3 w-3" />
                Letter
              </Button>
            </PopoverTrigger>
            <PopoverContent class="w-40 p-1" align="end">
              <button
                v-for="rail in props.instruction.rails"
                :key="rail"
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-t-2 transition-colors hover:bg-card hover:text-t-1"
                :data-testid="`instruction-rail-${props.instruction.id}-${rail}`"
                @click="fetchLetter(rail)"
              >
                {{ rail }}
              </button>
            </PopoverContent>
          </Popover>
          <Button
            v-else
            variant="ghost"
            size="sm"
            class="h-7 px-2.5 text-xs"
            :disabled="isLoadingLetter"
            :data-testid="`instruction-letter-${props.instruction.id}`"
            @click.stop="onLetterClick"
          >
            <Loader2 v-if="isLoadingLetter" class="h-3 w-3 animate-spin" />
            <FileText v-else class="h-3 w-3" />
            Letter
          </Button>
        </template>
      </div>
    </div>

    <!-- Fields -->
    <div
      v-if="props.instruction.fields.length > 0"
      class="overflow-hidden rounded-lg border border-b-1 bg-card-2"
    >
      <div
        v-for="field in props.instruction.fields"
        :key="field.key"
        class="flex items-baseline gap-3 border-b border-b-1 px-3 py-2 last:border-0"
      >
        <span class="w-28 shrink-0 text-xs text-t-4">{{ field.display }}</span>
        <span class="select-all break-all font-mono text-xs text-t-2">
          {{ field.value || '—' }}
        </span>
      </div>
    </div>
    <div
      v-else
      class="rounded-lg border border-b-1 bg-card-2 px-3 py-2.5 text-center text-xs italic text-t-4"
    >
      Sin atributos configurados
    </div>
  </div>
</template>
