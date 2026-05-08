import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovimientosKpis from './MovimientosKpis.vue';
import type { PspMovement } from './types';

function mov(overrides: Partial<PspMovement>): PspMovement {
  return {
    id: `m-${Math.random()}`,
    date: new Date().toISOString(),
    type: 'DEPOSIT',
    status: 'COMPLETED',
    amount: '100',
    partner: null,
    client: null,
    counterparty: null,
    sponsor: 'COINAG',
    ...overrides,
  };
}

describe('MovimientosKpis', () => {
  it('renders 4 cards with the canonical labels', () => {
    const w = mount(MovimientosKpis, { props: { movements: [] } });
    const labels = w.findAll('[data-testid="movimientos-kpis"] > div').map((d) =>
      d.text(),
    );
    expect(labels.length).toBe(4);
    expect(labels[0]).toContain('Movimientos hoy');
    expect(labels[1]).toContain('Volumen neto hoy');
    expect(labels[2]).toContain('Pendientes');
    expect(labels[3]).toContain('COMPLETED esta semana');
  });

  it('counts only movements created today for "Movimientos hoy"', () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const w = mount(MovimientosKpis, {
      props: {
        movements: [mov({ date: today }), mov({ date: today }), mov({ date: yesterday })],
      },
    });
    const card = w.findAll('[data-testid="movimientos-kpis"] > div').at(0);
    // 2 today + 1 yesterday = 2 in "Movimientos hoy"
    expect(card?.text()).toMatch(/(?<![0-9])2(?![0-9])/);
  });

  it('sums signed amounts of today for "Volumen neto hoy"', () => {
    const today = new Date().toISOString();
    const w = mount(MovimientosKpis, {
      props: {
        movements: [mov({ date: today, amount: '500' }), mov({ date: today, amount: '-200' })],
      },
    });
    expect(w.text()).toContain('+$300.00');
  });

  it('renders the Volumen neto with negative sign and danger tone when negative', () => {
    const today = new Date().toISOString();
    const w = mount(MovimientosKpis, {
      props: {
        movements: [mov({ date: today, amount: '-500' })],
      },
    });
    expect(w.text()).toContain('−$500.00');
    expect(w.html()).toContain('text-danger');
  });

  it('counts only PENDING movements for "Pendientes"', () => {
    const w = mount(MovimientosKpis, {
      props: {
        movements: [
          mov({ status: 'PENDING' }),
          mov({ status: 'PENDING' }),
          mov({ status: 'COMPLETED' }),
        ],
      },
    });
    const card = w.findAll('[data-testid="movimientos-kpis"] > div').at(2);
    expect(card?.text()).toMatch(/(?<![0-9])2(?![0-9])/);
  });

  it('counts COMPLETED in last 7 days for "COMPLETED esta semana"', () => {
    const now = Date.now();
    const today = new Date(now).toISOString();
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const w = mount(MovimientosKpis, {
      props: {
        movements: [
          mov({ status: 'COMPLETED', date: today }),
          mov({ status: 'COMPLETED', date: tenDaysAgo }), // out of 7-day window
          mov({ status: 'PENDING', date: today }), // wrong status
        ],
      },
    });
    const card = w.findAll('[data-testid="movimientos-kpis"] > div').at(3);
    expect(card?.text()).toMatch(/(?<![0-9])1(?![0-9])/);
  });
});
