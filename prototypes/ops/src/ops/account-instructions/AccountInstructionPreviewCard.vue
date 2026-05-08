<script setup lang="ts">
import { computed } from 'vue';
import type { Account } from '@/ops/clients/types';
import type {
  AccountInstructionFormState,
  InstructionTemplate,
  Rail,
  TemplateAttribute,
} from './types';

// ════════════════════════════════════════════════════════════════════
// AccountInstructionPreviewCard — implements Requirement 12
// (Decision 7c). In-place confirmation card showing the about-to-be-
// fired binding. Renders only when all selections are present.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  formState: AccountInstructionFormState;
  template: InstructionTemplate | null;
  attributes: TemplateAttribute[];
  rails: Rail[];
}>();

const account = computed<Account | null>(
  () =>
    props.formState.accounts.find((a) => a.id === props.formState.selectedAccountId) ?? null,
);

const selectedRails = computed<Rail[]>(() =>
  props.rails.filter((r) => props.formState.selectedRailIds.includes(r.id)),
);

function currencyLabel(): string {
  return account.value?.currency?.name?.toUpperCase() ?? '???';
}

function railLabel(): string {
  return props.template?.rail_name ?? props.template?.rail_id ?? '—';
}

function formatLabel(attr: TemplateAttribute): string {
  return attr.display ?? attr.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <div
    v-if="account && props.template && selectedRails.length > 0"
    class="rounded-lg border border-b-1 bg-card-2 px-4 py-3"
    data-testid="account-instruction-preview-card"
  >
    <div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-3">
      Resumen
    </div>
    <dl class="grid grid-cols-[80px_1fr] gap-y-1.5 text-xs">
      <dt class="text-t-4">Cuenta</dt>
      <dd class="font-mono text-t-1">
        {{ currencyLabel() }} · {{ account.account_number }}
      </dd>
      <dt class="text-t-4">Template</dt>
      <dd class="text-t-1">
        {{ props.template.name }} <span class="text-t-4">·</span>
        <span class="text-t-3">{{ railLabel() }}</span>
      </dd>
      <dt class="text-t-4">Rails</dt>
      <dd class="text-t-1">
        {{ selectedRails.map((r) => r.name).join(', ') }}
      </dd>
    </dl>

    <details
      v-if="props.attributes.length > 0"
      class="mt-2 border-t border-b-1 pt-2 text-xs"
      data-testid="account-instruction-preview-values"
    >
      <summary class="cursor-pointer text-t-4 hover:text-t-2">
        Valores ({{ props.attributes.length }})
      </summary>
      <dl class="mt-2 grid grid-cols-[140px_1fr] gap-y-1">
        <template v-for="attr in props.attributes" :key="attr.key">
          <dt class="text-t-4">{{ formatLabel(attr) }}</dt>
          <dd class="break-all font-mono text-t-2">
            {{ props.formState.formValues[attr.key] || '—' }}
          </dd>
        </template>
      </dl>
    </details>
  </div>
</template>
