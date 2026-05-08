<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Search, Check, Edit2 } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { Account } from '@/ops/clients/types';
import type { AccountInstructionFormState, InstructionTemplate } from './types';

// ════════════════════════════════════════════════════════════════════
// AccountTemplateStep — implements Requirements 3 + 4.
//
// Two side-by-side selectors:
//   - Account: list of non-ARS accounts; smart single-account default
//     (Decision 7a) auto-selects when the filtered list has exactly 1.
//   - Template: searchable list filtered by `name | rail_name | rail_id`,
//     debounced 300 ms.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  formState: AccountInstructionFormState;
  templates: InstructionTemplate[];
  isLoadingTemplates: boolean;
}>();

const emit = defineEmits<{
  'update:account-id': [value: string | null];
  'update:template-id': [value: string | null];
}>();

// ─── Account selector (Requirement 3) ───────────────────────────────
const eligibleAccounts = computed<Account[]>(() =>
  props.formState.accounts.filter((a) => {
    const code = (a.currency?.name ?? '').toUpperCase();
    return code !== 'ARS';
  }),
);

// 7a — auto-select when there's exactly one eligible account.
watch(
  eligibleAccounts,
  (next) => {
    if (next.length === 1 && !props.formState.selectedAccountId) {
      emit('update:account-id', next[0]!.id);
    }
  },
  { immediate: true },
);

const selectedAccount = computed<Account | null>(
  () =>
    eligibleAccounts.value.find((a) => a.id === props.formState.selectedAccountId) ?? null,
);

function pickAccount(id: string): void {
  emit('update:account-id', id);
  // Picking a new account drops the template choice (legacy semantic);
  // the parent applies both mutations atomically.
  emit('update:template-id', null);
}

function changeAccount(): void {
  emit('update:account-id', null);
  emit('update:template-id', null);
}

function currencyLabel(account: Account): string {
  return account.currency?.name?.toUpperCase() ?? '???';
}

// ─── Template selector (Requirement 4) ──────────────────────────────
const templateSearch = ref('');
const debouncedSearch = ref('');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(templateSearch, (v) => {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = v.trim().toLowerCase();
  }, 300);
});

const filteredTemplates = computed<InstructionTemplate[]>(() => {
  const q = debouncedSearch.value;
  if (!q) return props.templates;
  return props.templates.filter((t) => {
    const haystack = `${t.name ?? ''} ${t.rail_name ?? ''} ${t.rail_id ?? ''}`.toLowerCase();
    return haystack.includes(q);
  });
});

function pickTemplate(id: string): void {
  emit('update:template-id', id);
}
</script>

<template>
  <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
    <!-- Account selector ─────────────────────────────────────────── -->
    <section class="flex flex-col gap-2" data-testid="account-template-step-account">
      <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
        Cuenta
      </label>
      <div
        v-if="selectedAccount"
        class="flex items-center justify-between rounded-lg border border-b-2 bg-card p-3"
        data-testid="account-chip"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-bg"
          >
            <span class="text-xs font-bold text-info">
              {{ currencyLabel(selectedAccount) }}
            </span>
          </div>
          <div class="text-sm">
            <div class="font-mono font-semibold text-t-1">
              {{ selectedAccount.account_number }}
            </div>
            <div class="text-xs text-t-4">
              Balance
              <span class="font-mono text-t-2">{{ selectedAccount.balance || '0' }}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" data-testid="account-change" @click="changeAccount">
          <Edit2 class="h-3.5 w-3.5" />
          Cambiar
        </Button>
      </div>
      <div
        v-else-if="eligibleAccounts.length === 0"
        class="rounded-lg border border-b-1 bg-card p-4"
        data-testid="account-empty"
      >
        <EmptyState
          title="Sin cuentas elegibles"
          description="Este cliente no tiene cuentas en moneda extranjera"
        />
      </div>
      <div
        v-else
        class="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-b-1 bg-card p-2"
        data-testid="account-list"
      >
        <button
          v-for="account in eligibleAccounts"
          :key="account.id"
          type="button"
          class="flex items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-card-2"
          :data-testid="`account-option-${account.id}`"
          @click="pickAccount(account.id)"
        >
          <div class="flex items-center gap-2.5">
            <Badge variant="info">{{ currencyLabel(account) }}</Badge>
            <div class="text-sm">
              <div class="font-mono text-t-1">{{ account.account_number }}</div>
              <div class="text-xs text-t-4">
                Balance
                <span class="font-mono text-t-2">{{ account.balance || '0' }}</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </section>

    <!-- Template selector ─────────────────────────────────────────── -->
    <section class="flex flex-col gap-2" data-testid="account-template-step-template">
      <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
        Template
      </label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
        />
        <Input
          v-model="templateSearch"
          placeholder="Buscar por nombre o rail…"
          class="pl-8"
          :disabled="!selectedAccount"
          data-testid="template-search"
        />
      </div>
      <div
        v-if="props.isLoadingTemplates"
        class="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-b-1 bg-card p-2"
        data-testid="template-loading"
      >
        <Skeleton v-for="i in 4" :key="i" class="h-8 w-full" />
      </div>
      <div
        v-else-if="filteredTemplates.length === 0"
        class="rounded-lg border border-b-1 bg-card p-4 text-center text-xs text-t-4"
      >
        Sin resultados
      </div>
      <div
        v-else
        class="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-b-1 bg-card p-2"
        data-testid="template-list"
      >
        <button
          v-for="template in filteredTemplates"
          :key="template.id"
          type="button"
          class="flex items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-card-2"
          :class="props.formState.selectedTemplateId === template.id ? 'bg-brand-bg' : ''"
          :disabled="!selectedAccount"
          :data-testid="`template-option-${template.id}`"
          @click="pickTemplate(template.id)"
        >
          <div class="min-w-0">
            <div class="truncate text-sm text-t-1">{{ template.name }}</div>
            <div class="truncate text-xs text-t-4">
              {{ template.rail_name ?? template.rail_id ?? '—' }}
            </div>
          </div>
          <Check
            v-if="props.formState.selectedTemplateId === template.id"
            class="h-4 w-4 shrink-0 text-brand"
          />
        </button>
      </div>
    </section>
  </div>
</template>
