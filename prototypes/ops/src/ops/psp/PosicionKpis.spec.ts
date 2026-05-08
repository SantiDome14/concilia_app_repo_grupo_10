import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PosicionKpis from './PosicionKpis.vue';
import type { PspAccount, PspMovement, SponsorBalance } from './types';

function bal(sponsor: string, balance: string): SponsorBalance {
  return { sponsor, balance, checked_at: new Date().toISOString(), currency: 'ARS' };
}

function acc(id: string, status: string): PspAccount {
  return {
    id,
    account_number: `acc-${id}`,
    currency: 'ARS',
    balance: '100',
    owner: null,
    status,
    sponsor: 'COINAG',
  };
}

function mov(amount: string, status: string): PspMovement {
  return {
    id: `m-${Math.random()}`,
    date: new Date().toISOString(),
    type: 'DEPOSIT',
    status,
    amount,
    partner: null,
    client: null,
    counterparty: null,
    sponsor: 'COINAG',
  };
}

describe('PosicionKpis', () => {
  it('renders 4 cards in the canonical order', () => {
    const w = mount(PosicionKpis, {
      props: { balances: [], movements: [], accounts: [] },
    });
    const labels = w.findAll('[data-testid="posicion-kpis"] > div').map((d) =>
      d.text(),
    );
    expect(labels.length).toBe(4);
    expect(labels[0]).toContain('Posición consolidada');
    expect(labels[1]).toContain('Liquidez disponible');
    expect(labels[2]).toContain('Comprometido');
    expect(labels[3]).toContain('Cuentas activas');
  });

  it('sums sponsor balances for Posición consolidada', () => {
    const w = mount(PosicionKpis, {
      props: {
        balances: [bal('COINAG', '1000'), bal('BIND', '500')],
        movements: [],
        accounts: [],
      },
    });
    expect(w.text()).toContain('$1,500.00');
  });

  it('subtracts pending movements (committed) from liquidity', () => {
    const w = mount(PosicionKpis, {
      props: {
        balances: [bal('COINAG', '1000')],
        movements: [mov('200', 'PENDING')],
        accounts: [],
      },
    });
    // Consolidada $1,000 · Comprometido $200 · Liquidez $800.
    expect(w.text()).toContain('$1,000.00');
    expect(w.text()).toContain('$200.00');
    expect(w.text()).toContain('$800.00');
  });

  it('clamps liquidity at 0 when committed exceeds consolidated', () => {
    const w = mount(PosicionKpis, {
      props: {
        balances: [bal('COINAG', '100')],
        movements: [mov('500', 'PENDING')],
        accounts: [],
      },
    });
    // Liquidez = max(100 - 500, 0) = 0
    expect(w.text()).toContain('$0.00');
  });

  it('counts only ACTIVE accounts', () => {
    const w = mount(PosicionKpis, {
      props: {
        balances: [],
        movements: [],
        accounts: [acc('1', 'ACTIVE'), acc('2', 'PAUSED'), acc('3', 'ACTIVE')],
      },
    });
    const text = w.text();
    expect(text).toContain('Cuentas activas');
    // Find the "Cuentas activas" card and check its value is "2".
    const card = w.findAll('[data-testid="posicion-kpis"] > div').at(3);
    expect(card?.text()).toContain('2');
  });

  it('renders 0 across the board when source data is empty', () => {
    const w = mount(PosicionKpis, {
      props: { balances: [], movements: [], accounts: [] },
    });
    const text = w.text();
    // 3 zero-money cards + 1 zero-count card.
    expect((text.match(/\$0\.00/g) ?? []).length).toBe(3);
    expect(text).toContain('Cuentas activas');
  });
});
