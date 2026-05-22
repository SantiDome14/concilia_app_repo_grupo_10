import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type * as VueQueryModule from '@tanstack/vue-query';
import type { BankAccountRecord } from '@/ops/banks-accounts/types';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import {
  OPS_BANKS_ACCOUNTS_MANIFEST,
  OPS_BANKS_ACCOUNTS_MANIFEST_KEY,
} from '@/manifests/ops.banks_accounts.actions';

// ════════════════════════════════════════════════════════════════════
// BanksAccounts page — post-manifest-rewrite tests covering the shell,
// 4 KPIs, header CTAs surfaced by <ManifestModuleCTAs>, table columns
// (no Cuenta contable), and per-row <ManifestActionsMenu> trigger.
// vue-query is fully mocked to keep the spec deterministic and avoid
// HTTP traffic; the manifest engine is wired through a real
// PiniaRegistry instance.
// ════════════════════════════════════════════════════════════════════

const mockAccountsData = ref<BankAccountRecord[]>([]);
const mockIsPending = ref(false);
const mockIsError = ref(false);

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = await importOriginal<typeof VueQueryModule>();
  return {
    ...actual,
    useQuery: () => ({
      data: mockAccountsData,
      isPending: mockIsPending,
      isError: mockIsError,
    }),
    useMutation: () => ({ mutate: vi.fn() }),
    useQueryClient: () => ({
      cancelQueries: vi.fn(),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('@/composables/useCapabilities', () => ({
  useCapabilities: () => ({
    all: computed(() => ['*']),
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

function row(overrides: Partial<BankAccountRecord> = {}): BankAccountRecord {
  return {
    id: 'acc-1',
    sociedad: 'Circuit Pay SA',
    estructura: 'COINAG',
    estructuraTipo: 'PSP',
    tipoCuenta: 'CVU',
    moneda: 'ARS',
    nro: '10.045',
    cuentaPadreLabel: null,
    padreCuentaId: null,
    status: 'Activa',
    ...overrides,
  };
}

const sample: BankAccountRecord[] = [
  row({ id: 'a', moneda: 'ARS', nro: '10.045', status: 'Activa' }),
  row({ id: 'b', moneda: 'USD', nro: '10.047', status: 'Activa' }),
  row({ id: 'c', sociedad: 'Haz Pagos SA', estructura: 'BIND', estructuraTipo: 'Banco', tipoCuenta: 'Cuenta Corriente', moneda: 'ARS', nro: '356744', status: 'Activa' }),
  row({ id: 'd', sociedad: 'Haz Pagos SA', estructura: 'MACRO', estructuraTipo: 'Banco', tipoCuenta: 'Cuenta Corriente', moneda: 'USD', nro: '821111', status: 'Inactiva' }),
  row({ id: 'e', sociedad: 'Astra Ventures', estructura: 'BITGO', estructuraTipo: 'Custodio', tipoCuenta: 'Custodia', moneda: 'BTC', nro: '0xabc123', status: 'Activa' }),
];

import BanksAccounts from './BanksAccounts.vue';

beforeEach(() => {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(
    OPS_BANKS_ACCOUNTS_MANIFEST_KEY,
    OPS_BANKS_ACCOUNTS_MANIFEST,
  );
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['OPS_ADMIN'],
  });
});

function mountPage() {
  return mount(BanksAccounts, {
    global: {
      stubs: {
        Select: { template: '<div data-stub="select"><slot /></div>' },
        SelectTrigger: { template: '<div data-stub="select-trigger"><slot /></div>' },
        SelectValue: { template: '<span data-stub="select-value"><slot /></span>' },
        SelectContent: { template: '<div data-stub="select-content"><slot /></div>' },
        SelectItem: { template: '<div data-stub="select-item"><slot /></div>' },
        Input: { template: '<input />' },
        TablePagination: { template: '<div data-stub="pagination" />' },
      },
    },
  });
}

describe('BanksAccounts page — happy path (OPS shape, no contable)', () => {
  it('renders the title and the 4 KPI tiles (no contable concerns)', () => {
    mockAccountsData.value = sample;
    mockIsPending.value = false;
    mockIsError.value = false;

    const w = mountPage();
    const text = w.text();

    expect(text).toContain('Bancos / Cuentas');

    // 4 KPIs render and no accounting tile exists.
    const kpiSection = w.find('[data-testid="banks-accounts-kpis"]');
    expect(kpiSection.exists()).toBe(true);
    expect(kpiSection.text()).toContain('Estructuras totales');
    expect(kpiSection.text()).toContain('Cuentas totales');
    expect(kpiSection.text()).toContain('Cuentas activas');
    expect(kpiSection.text()).toContain('Cuentas inactivas');
    expect(kpiSection.text()).not.toContain('configuración contable');
    expect(kpiSection.text()).not.toContain('Sin configurar');
  });

  it('renders the manifest-driven Module CTAs in the page header', () => {
    mockAccountsData.value = sample;
    const w = mountPage();
    const header = w.find('[data-testid="banks-accounts-main-cta"]');
    expect(header.exists()).toBe(true);
    // Both CTA labels surface through <ManifestModuleCTAs>
    expect(header.text()).toContain('Crear nueva Cuenta');
    expect(header.text()).toContain('Crear nuevo Banco/Estructura');
  });

  it('renders 8 table headers without a Cuenta contable column', () => {
    mockAccountsData.value = sample;
    const w = mountPage();
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Sociedad',
      'Banco / Estructura',
      'Tipo estructura',
      'Tipo cuenta',
      'Moneda',
      'Nro. / Address',
      'Estado',
      'Acciones',
    ]);
    expect(headers).not.toContain('Cuenta contable');
  });

  it('renders one manifest-driven Acciones trigger per row', () => {
    mockAccountsData.value = sample;
    const w = mountPage();
    const triggers = w.findAll('[data-testid="manifest-actions-trigger"]');
    // Pagination defaults to 10 rows; sample has 5 → 5 triggers.
    expect(triggers.length).toBe(sample.length);
  });
});

describe('BanksAccounts page — empty state', () => {
  it('renders EmptyState when the catalog returns 0 rows', () => {
    mockAccountsData.value = [];
    mockIsPending.value = false;
    mockIsError.value = false;

    const w = mountPage();
    const empty = w.find('[data-testid="banks-accounts-empty-state"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('Sin cuentas en el catálogo');
    expect(w.find('[data-testid="banks-accounts-table"]').exists()).toBe(false);
  });
});
