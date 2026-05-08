<script setup lang="ts">
import { computed, ref } from 'vue';
import { ChevronRight, Wallet, Building2 } from 'lucide-vue-next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn } from '@/lib/cn';
import CoinagHealthIndicator from './CoinagHealthIndicator.vue';
import { activeSponsors, getSponsorByCode } from './sponsor-catalog';
import type {
  CoinagHealth,
  PspAccount,
  PspMovement,
  SponsorBalance,
  SponsorCode,
} from './types';

const props = defineProps<{
  balances: SponsorBalance[];
  accounts: PspAccount[];
  /** Used to compute DR / CR cumulatives per account. */
  movements: PspMovement[];
  /**
   * Coinag health snapshot. Per
   * `refine-ops-psp-tab-aware-header-and-multi-sponsor` the health
   * chip lives inside the COINAG sponsor row's collapsible header
   * (NOT in the page header — that slot is reserved for ViewToggle
   * + main CTA per active tab). For sponsors without a health
   * endpoint (BIND / Banco de Comercio in v1), the slot renders a
   * neutral `Sin integración` placeholder.
   */
  health?: CoinagHealth | null;
  /** True when the Coinag health query is in error state. */
  isHealthStale?: boolean;
}>();

// ════════════════════════════════════════════════════════════════════
// PosicionTree — implements Requirement 4 (modified) of ops-psp.
// Strict Módulo B "Posición por sociedad" tree shape, adapted to the
// PSP Banco Sponsor abstraction.
//
// Top-level rows = sponsors (chevron-toggled). Each expansion shows
// an inner header (`Cuenta · Saldo · DR acum · CR acum · Posición neta`)
// followed by one row per account belonging to that sponsor.
//
// DR / CR cumulatives are derived from the movements list filtered to
// the account; "Posición neta" = balance + CR_acum - DR_acum (the
// signed result of pending obligations).
// ════════════════════════════════════════════════════════════════════

const ALL = '__all__';

const filterSponsor = ref<string>('');
const filterMoneda = ref<string>('');

const filterSponsorModel = computed<string>({
  get: () => filterSponsor.value || ALL,
  set: (v) => {
    filterSponsor.value = v === ALL ? '' : v;
  },
});

const filterMonedaModel = computed<string>({
  get: () => filterMoneda.value || ALL,
  set: (v) => {
    filterMoneda.value = v === ALL ? '' : v;
  },
});

const monedasCatalog = computed<string[]>(() => {
  const set = new Set<string>();
  for (const a of props.accounts) {
    if (a.currency) set.add(a.currency.toUpperCase());
  }
  return Array.from(set).sort();
});

interface SponsorRow {
  code: SponsorCode;
  label: string;
  /** Last-checked-at (for sub-label). */
  checkedAt: string | null;
  /** Total balance across the sponsor's accounts (sum). */
  totalSaldo: number;
  /** Cuentas count for this sponsor (filtered by moneda if set). */
  cuentasCount: number;
  cuentas: AccountRow[];
}

interface AccountRow {
  account: PspAccount;
  saldo: number;
  drAcum: number;
  crAcum: number;
  posicionNeta: number;
}

function parseAmount(value: string | undefined): number {
  if (!value) return 0;
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const filteredSponsors = computed<SponsorRow[]>(() => {
  return activeSponsors()
    .filter((sp) => !filterSponsor.value || sp.code === filterSponsor.value)
    .map((sp) => {
      const balance = props.balances.find((b) => b.sponsor === sp.code) ?? null;
      const sponsorAccounts = props.accounts
        .filter((a) => a.sponsor === sp.code)
        .filter(
          (a) => !filterMoneda.value || a.currency.toUpperCase() === filterMoneda.value,
        )
        .map<AccountRow>((account) => {
          const accountMovements = props.movements.filter(
            (m) =>
              (m.partner === account.account_number ||
                m.client === account.account_number) &&
              m.status?.toUpperCase() === 'PENDING',
          );
          const drAcum = accountMovements.reduce(
            (acc, m) => acc + Math.max(parseAmount(m.amount), 0),
            0,
          );
          const crAcum = accountMovements.reduce(
            (acc, m) => acc + Math.max(-parseAmount(m.amount), 0),
            0,
          );
          const saldo = parseAmount(account.balance);
          return {
            account,
            saldo,
            drAcum,
            crAcum,
            posicionNeta: saldo + crAcum - drAcum,
          };
        });
      return {
        code: sp.code,
        label: sp.label,
        checkedAt: balance?.checked_at ?? null,
        totalSaldo: parseAmount(balance?.balance),
        cuentasCount: sponsorAccounts.length,
        cuentas: sponsorAccounts,
      };
    });
});

// Expansion state — Set of sponsor codes that are currently expanded.
const expanded = ref<Set<SponsorCode>>(new Set());

function toggle(code: SponsorCode): void {
  if (expanded.value.has(code)) {
    expanded.value.delete(code);
  } else {
    expanded.value.add(code);
  }
  // Re-trigger reactivity on Set mutation.
  expanded.value = new Set(expanded.value);
}

function formatCheckedAt(iso: string | null): string {
  if (!iso) return 'Sin chequeos';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin chequeos';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  return `Hace ${Math.floor(diffH / 24)}d`;
}

function iconFor(account: PspAccount): typeof Wallet | typeof Building2 {
  // Wallet for ARS (CVU-style) accounts; Building2 for foreign currencies.
  return account.currency.toUpperCase() === 'ARS' ? Wallet : Building2;
}

const sponsorOptions = computed(() => {
  return activeSponsors().map((sp) => {
    const entry = getSponsorByCode(sp.code);
    return { value: sp.code, label: entry?.label ?? sp.code };
  });
});
</script>

<template>
  <div class="flex flex-col gap-2.5" data-testid="posicion-tree-wrapper">
    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-2" data-testid="posicion-section-header">
      <span class="text-sm font-bold text-t-2">Posición por banco sponsor</span>
      <div class="flex-1" />
      <Select v-model="filterSponsorModel">
        <SelectTrigger
          class="h-9 w-[180px] text-xs"
          aria-label="Filtrar por banco sponsor"
          data-testid="filter-sponsor"
        >
          <SelectValue placeholder="Banco Sponsor · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Banco Sponsor · Todos</SelectItem>
          <SelectItem
            v-for="opt in sponsorOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="filterMonedaModel">
        <SelectTrigger
          class="h-9 w-[150px] text-xs"
          aria-label="Filtrar por moneda"
          data-testid="filter-moneda"
        >
          <SelectValue placeholder="Moneda · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Moneda · Todas</SelectItem>
          <SelectItem v-for="m in monedasCatalog" :key="m" :value="m">{{ m }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Tree -->
    <section class="flex flex-col gap-2.5" data-testid="posicion-tree">
      <EmptyState
        v-if="filteredSponsors.length === 0"
        title="Sin resultados"
        description="Probá ajustar los filtros aplicados"
      />
      <div
        v-for="row in filteredSponsors"
        :key="row.code"
        :data-testid="`tree-sponsor-${row.code}`"
        :class="
          cn(
            'overflow-hidden rounded-[11px] border border-b-2 bg-card-2 transition-colors',
            expanded.has(row.code) && 'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]',
          )
        "
      >
        <button
          type="button"
          class="flex w-full items-center gap-3 px-[18px] py-3.5 text-left transition-colors hover:bg-white/[0.03]"
          :aria-expanded="expanded.has(row.code)"
          @click="toggle(row.code)"
        >
          <ChevronRight
            :class="
              cn(
                'h-3.5 w-3.5 shrink-0 text-t-3 transition-transform',
                expanded.has(row.code) && 'rotate-90',
              )
            "
          />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="text-sm font-bold text-t-1">{{ row.label }}</div>
            <div class="text-[11px] text-t-4">{{ formatCheckedAt(row.checkedAt) }}</div>
          </div>
          <div class="flex flex-wrap items-center gap-3.5">
            <!-- Per-sponsor status chip (relocated from the page header
                 per `refine-ops-psp-tab-aware-header-and-multi-sponsor`). -->
            <CoinagHealthIndicator
              v-if="row.code === 'COINAG'"
              :health="props.health ?? null"
              :is-stale="props.isHealthStale"
              @click.stop
            />
            <span
              v-else
              class="inline-flex items-center gap-1.5 rounded-full border border-b-1 bg-card px-2.5 py-1 text-[11px] font-medium text-t-4"
              :data-testid="`sponsor-status-${row.code}`"
              @click.stop
            >
              <span class="h-1.5 w-1.5 rounded-full bg-t-4" aria-hidden="true" />
              <span>Sin integración</span>
            </span>
            <div class="flex flex-col items-end gap-0.5">
              <span
                class="text-[9px] font-extrabold uppercase tracking-wider text-t-4"
              >
                Saldo
              </span>
              <span
                class="font-mono text-[13px] font-bold tabular-nums text-t-1"
              >
                ${{ formatAmount(row.totalSaldo) }}
              </span>
            </div>
            <div class="flex flex-col items-end gap-0.5">
              <span
                class="text-[9px] font-extrabold uppercase tracking-wider text-t-4"
              >
                Cuentas
              </span>
              <span class="text-[13px] font-bold tabular-nums text-t-1">
                {{ row.cuentasCount }}
              </span>
            </div>
          </div>
        </button>

        <div v-if="expanded.has(row.code)" class="border-t border-b-1 bg-[#181818]">
          <div
            class="grid items-center gap-3.5 border-b border-b-2 bg-[#161616] px-[18px] py-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4"
            style="grid-template-columns: 32px 2fr 1fr 1fr 1fr 1fr"
          >
            <div></div>
            <div>Cuenta</div>
            <div class="text-right">Saldo</div>
            <div class="text-right">DR acum</div>
            <div class="text-right">CR acum</div>
            <div class="text-right">Posición neta</div>
          </div>

          <div
            v-if="row.cuentas.length === 0"
            class="px-[18px] py-6 text-center text-[12px] text-t-4"
          >
            Sin cuentas para los filtros aplicados
          </div>

          <div
            v-for="entry in row.cuentas"
            :key="entry.account.id"
            class="grid items-center gap-3.5 border-b border-b-1 px-[18px] py-2.5 text-xs last:border-b-0"
            style="grid-template-columns: 32px 2fr 1fr 1fr 1fr 1fr"
            :data-testid="`tree-account-${entry.account.id}`"
          >
            <div
              class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-t-3"
            >
              <component :is="iconFor(entry.account)" class="h-3.5 w-3.5" />
            </div>
            <div class="flex min-w-0 flex-col gap-0.5">
              <span class="text-[13px] font-semibold text-t-1">
                {{ entry.account.account_number }}
              </span>
              <span class="font-mono text-[10px] text-t-4">
                {{ entry.account.alias || entry.account.cvu || entry.account.currency }}
              </span>
            </div>
            <div class="text-right font-mono font-bold tabular-nums text-t-1">
              ${{ formatAmount(entry.saldo) }}
              <span class="text-[10px] font-normal text-t-4">{{ entry.account.currency }}</span>
            </div>
            <div class="text-right font-mono tabular-nums text-t-4">
              ${{ formatAmount(entry.drAcum) }}
            </div>
            <div class="text-right font-mono tabular-nums text-t-4">
              ${{ formatAmount(entry.crAcum) }}
            </div>
            <div class="text-right font-mono font-bold tabular-nums text-t-1">
              ${{ formatAmount(entry.posicionNeta) }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
