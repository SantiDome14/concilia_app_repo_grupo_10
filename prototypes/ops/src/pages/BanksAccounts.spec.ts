import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import type { BankAccountRecord } from '@/ops/banks-accounts/types';

// ════════════════════════════════════════════════════════════════════
// BanksAccounts page — component tests covering ops-banks-accounts
// (post-refactor): page shell, 2 KPIs from full dataset, 8 columns,
// empty-state branch, no accounting surfaces.
// ════════════════════════════════════════════════════════════════════

const mockQueryData = ref<BankAccountRecord[]>([]);
const mockIsPending = ref(false);
const mockIsError = ref(false);

vi.mock('@tanstack/vue-query', () => ({
  useQuery: () => ({
    data: mockQueryData,
    isPending: mockIsPending,
    isError: mockIsError,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/composables/useCapabilities', () => ({
  useCapabilities: () => ({
    all: computed(() => ['*']),
    can: () => true,
    canAny: () => true,
    canAll: () => true,
  }),
}));

vi.mock('@/ops/banks-accounts/CreateStructureModal.vue', async () => {
  const { defineComponent: dc } = await import('vue');
  return { default: dc({ name: 'CreateStructureStub', props: { open: Boolean }, setup: () => () => null }) };
});
vi.mock('@/ops/banks-accounts/CreateAccountModal.vue', async () => {
  const { defineComponent: dc } = await import('vue');
  return { default: dc({ name: 'CreateAccountStub', props: { open: Boolean }, setup: () => () => null }) };
});
vi.mock('@/ops/banks-accounts/EditAccountModal.vue', async () => {
  const { defineComponent: dc } = await import('vue');
  return { default: dc({ name: 'EditAccountStub', props: { open: Boolean }, setup: () => () => null }) };
});

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
  row({ id: 'a', sociedad: 'Circuit Pay SA', estructura: 'COINAG', moneda: 'ARS', nro: '10.045' }),
  row({ id: 'b', sociedad: 'Circuit Pay SA', estructura: 'COINAG', moneda: 'USD', nro: '10.047' }),
  row({ id: 'c', sociedad: 'Haz Pagos SA', estructura: 'BIND', estructuraTipo: 'Banco', tipoCuenta: 'Cuenta Corriente', moneda: 'ARS', nro: '356744' }),
  row({ id: 'd', sociedad: 'Haz Pagos SA', estructura: 'MACRO', estructuraTipo: 'Banco', tipoCuenta: 'Cuenta Corriente', moneda: 'USD', nro: '821111' }),
  row({ id: 'e', sociedad: 'Astra Ventures', estructura: 'BITGO', estructuraTipo: 'Custodio', tipoCuenta: 'Custodia', moneda: 'BTC', nro: '0xabc123' }),
];

import BanksAccounts from './BanksAccounts.vue';

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
      },
    },
  });
}

describe('BanksAccounts page — happy path (OPS-only shape)', () => {
  it('renders the title, both CTAs, and exactly 2 KPI cards (no accounting concerns)', () => {
    mockQueryData.value = sample;
    mockIsPending.value = false;
    mockIsError.value = false;

    const w = mountPage();
    const text = w.text();

    expect(text).toContain('Bancos / Cuentas');
    expect(w.find('[data-testid="banks-accounts-create-structure-cta"]').exists()).toBe(true);
    expect(w.find('[data-testid="banks-accounts-create-account-cta"]').exists()).toBe(true);

    // Only 2 KPIs render (Estructuras, Cuentas totales). The accounting KPIs are gone.
    expect(w.find('[data-testid="kpi-estructuras"]').text()).toBe('4');
    expect(w.find('[data-testid="kpi-total"]').text()).toBe('5');
    expect(w.find('[data-testid="kpi-configuradas"]').exists()).toBe(false);
    expect(w.find('[data-testid="kpi-sin-configurar"]').exists()).toBe(false);

    // No preparatory accounting notice anywhere on the page.
    expect(w.find('[data-testid="banks-accounts-prep-notice"]').exists()).toBe(false);
    expect(text).not.toContain('preparatoria');
    expect(text).not.toContain('Motor Contable');

    // Table renders 9 headers (8 data columns + Acciones). The Cuenta contable column is gone.
    const headers = w.findAll('thead th').map((th) => th.text());
    expect(headers).toEqual([
      'Sociedad',
      'Banco / Estructura',
      'Tipo',
      'Tipo de cuenta',
      'Moneda',
      'Nro. / Address',
      'Cuenta padre',
      'Estado',
      'Acciones',
    ]);

    // Empty-state surface is NOT in the DOM when data is present.
    expect(w.find('[data-testid="banks-accounts-empty-state"]').exists()).toBe(false);
  });

  it('renders one Editar datos action per row when the operator has edit-account capability', () => {
    mockQueryData.value = sample;
    const w = mountPage();
    // Per-row Actions trigger button is visible (canEditAccount is true via the mock).
    expect(w.find('[data-testid="row-actions-a"]').exists()).toBe(true);
  });
});

describe('BanksAccounts page — empty state', () => {
  it('renders EmptyState with both KPIs at 0 when the catalog returns 0 rows', () => {
    mockQueryData.value = [];
    mockIsPending.value = false;
    mockIsError.value = false;

    const w = mountPage();
    const empty = w.find('[data-testid="banks-accounts-empty-state"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('Sin cuentas en el catálogo');
    expect(empty.text()).toContain('Comenzá agregando una estructura y luego sus cuentas');
    // No inline CTA inside the empty state — operators use the page-header CTA.
    expect(w.find('[data-testid="banks-accounts-empty-cta"]').exists()).toBe(false);

    // Only 2 KPI cards render with zeros.
    expect(w.find('[data-testid="kpi-estructuras"]').text()).toBe('0');
    expect(w.find('[data-testid="kpi-total"]').text()).toBe('0');
    expect(w.find('[data-testid="kpi-configuradas"]').exists()).toBe(false);
    expect(w.find('[data-testid="kpi-sin-configurar"]').exists()).toBe(false);

    // Table is NOT rendered.
    expect(w.find('[data-testid="banks-accounts-table"]').exists()).toBe(false);
  });
});
