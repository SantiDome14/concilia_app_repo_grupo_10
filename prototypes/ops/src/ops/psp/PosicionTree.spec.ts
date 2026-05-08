import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PosicionTree from './PosicionTree.vue';
import type {
  CoinagHealth,
  PspAccount,
  PspMovement,
  SponsorBalance,
} from './types';

// ════════════════════════════════════════════════════════════════════
// PosicionTree — verifies the contract from
// `refine-ops-psp-tab-aware-header-and-multi-sponsor`:
// (1) one collapsible per active sponsor (COINAG + BIND + BANCO_DE_COMERCIO),
// (2) per-sponsor status chip slot (CoinagHealthIndicator only inside the
//     COINAG row; neutral `Sin integración` chip in BIND / Banco de Comercio).
// ════════════════════════════════════════════════════════════════════

const balances: SponsorBalance[] = [
  {
    sponsor: 'COINAG',
    balance: '1500.00',
    checked_at: new Date('2026-05-08T12:00:00Z').toISOString(),
    currency: 'ARS',
  },
];

const accounts: PspAccount[] = [
  {
    id: 'acc-1',
    account_number: 'CVU-COINAG-1',
    currency: 'ARS',
    balance: '1500.00',
    owner: null,
    status: 'ACTIVE',
    sponsor: 'COINAG',
  },
];

const movements: PspMovement[] = [];

const health: CoinagHealth = {
  status: 'healthy',
  message: null,
  checked_at: new Date('2026-05-08T12:00:00Z').toISOString(),
};

describe('PosicionTree — multi-sponsor', () => {
  it('renders one collapsible row per active sponsor (COINAG + BIND + Banco de Comercio)', () => {
    const wrapper = mount(PosicionTree, {
      props: { balances, accounts, movements, health },
    });

    expect(wrapper.find('[data-testid="tree-sponsor-COINAG"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tree-sponsor-BIND"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tree-sponsor-BANCO_DE_COMERCIO"]').exists()).toBe(true);
  });

  it('mounts <CoinagHealthIndicator> only inside the COINAG row', () => {
    const wrapper = mount(PosicionTree, {
      props: { balances, accounts, movements, health },
    });

    const coinagRow = wrapper.find('[data-testid="tree-sponsor-COINAG"]');
    const bindRow = wrapper.find('[data-testid="tree-sponsor-BIND"]');
    const bdcRow = wrapper.find('[data-testid="tree-sponsor-BANCO_DE_COMERCIO"]');

    // COINAG row contains the health indicator.
    expect(coinagRow.find('[data-testid="coinag-health-indicator"]').exists()).toBe(true);
    // BIND + Banco de Comercio show the neutral "Sin integración" placeholder, NOT the indicator.
    expect(bindRow.find('[data-testid="coinag-health-indicator"]').exists()).toBe(false);
    expect(bdcRow.find('[data-testid="coinag-health-indicator"]').exists()).toBe(false);
    expect(bindRow.find('[data-testid="sponsor-status-BIND"]').text()).toContain(
      'Sin integración',
    );
    expect(bdcRow.find('[data-testid="sponsor-status-BANCO_DE_COMERCIO"]').text()).toContain(
      'Sin integración',
    );
  });

  it('renders zero saldo + zero cuentas for non-integrated sponsors', () => {
    const wrapper = mount(PosicionTree, {
      props: { balances, accounts, movements, health },
    });

    const bindRow = wrapper.find('[data-testid="tree-sponsor-BIND"]');
    expect(bindRow.text()).toContain('$0.00');
    // The "Cuentas" total reads 0.
    expect(bindRow.text()).toMatch(/Cuentas[^0-9]*0/);
  });
});
