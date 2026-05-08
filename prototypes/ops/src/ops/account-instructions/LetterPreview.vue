<script setup lang="ts">
import type { Account, Client } from '@/ops/clients/types';
import type { InstructionTemplate, TemplateAttribute } from './types';

// ════════════════════════════════════════════════════════════════════
// LetterPreview — implements Requirement 6 (Decision 6).
//
// A4-aspect mock of the confirmation letter the operator will later
// download from the detail page (Letter action, ops-clients
// Requirement 9). Presentational only — no fetches, no side effects.
// Reads everything from props; re-renders on every keystroke because
// the parent passes a reactive `values` object.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  client: Pick<Client, 'name' | 'docket'>;
  template: InstructionTemplate | null;
  attributes: TemplateAttribute[];
  values: Record<string, string>;
  selectedAccount: Account | null;
}>();

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function railLabel(): string {
  return props.template?.rail_name ?? props.template?.rail_id ?? '—';
}

function clientName(): string {
  return props.client.name ?? 'Cliente sin nombre';
}

function clientDocket(): string {
  return props.client.docket ?? '—';
}

function hasAccountField(): boolean {
  return props.attributes.some((a) => a.key === 'account_number');
}
</script>

<template>
  <aside
    class="flex h-full flex-col items-center justify-start overflow-hidden rounded-lg border border-b-2 bg-card-2 p-3"
    data-testid="letter-preview"
  >
    <div class="mb-2 flex w-full items-center justify-between">
      <h4 class="text-[10px] font-bold uppercase tracking-wider text-t-3">
        Vista previa
      </h4>
      <span
        class="rounded-full border border-warning/30 bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning"
      >
        DRAFT
      </span>
    </div>
    <!-- A4 aspect (1 : √2) — bg white because the letter is meant to render on paper. -->
    <div
      class="aspect-[210/297] w-full overflow-hidden rounded-sm bg-white text-black shadow-lg"
      data-testid="letter-preview-page"
    >
      <div class="flex h-full flex-col">
        <!-- Header band -->
        <div class="h-2 w-full bg-[#0F172A]" aria-hidden="true" />
        <div class="flex-1 overflow-hidden px-6 py-4 text-[7px] leading-relaxed">
          <h1 class="mb-3 text-center text-[8px] font-bold tracking-wide">
            Account Confirmation Letter
          </h1>
          <p class="mb-2">Dear {{ clientName() }},</p>
          <p class="mb-3 leading-relaxed">
            Welcome to Ardua Solutions Corp! We are delighted to have you as a
            valued customer and appreciate the trust you have placed in us for
            your financial needs.
          </p>
          <div class="mb-3">
            <p class="font-bold">Your Unique Client Number:</p>
            <p>
              Client number:
              <span class="font-semibold">{{ clientDocket() }}</span>
            </p>
          </div>
          <div class="mb-3">
            <p class="font-bold">Incoming Transfers:</p>
            <p class="leading-relaxed">
              For {{ railLabel() }} transfers please use the following information:
            </p>
            <div class="mt-1 space-y-0.5">
              <p
                v-for="attr in props.attributes"
                :key="attr.key"
                data-testid="letter-preview-row"
              >
                <span class="font-semibold">{{ attr.display ?? formatLabel(attr.key) }}:</span>
                {{ props.values[attr.key] || '—' }}
              </p>
              <p v-if="props.selectedAccount && !hasAccountField()">
                <span class="font-semibold">Account Number:</span>
                {{ props.selectedAccount.account_number }}
              </p>
            </div>
          </div>
          <div class="mb-3">
            <p class="font-bold">Customer Support:</p>
            <p class="leading-relaxed">
              If you have any questions or need assistance, our dedicated
              customer support team is available to help you. You can reach us
              at info@arduasolutions.com.
            </p>
          </div>
          <div class="mt-auto pt-2">
            <p class="font-semibold">Client Support Team</p>
            <p>Ardua Solutions Corp.</p>
          </div>
        </div>
        <!-- Footer band -->
        <div class="h-2 w-full bg-[#0F172A]" aria-hidden="true" />
      </div>
    </div>
  </aside>
</template>
