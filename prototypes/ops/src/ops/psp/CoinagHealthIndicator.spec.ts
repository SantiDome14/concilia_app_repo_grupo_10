import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoinagHealthIndicator from './CoinagHealthIndicator.vue';
import type { CoinagHealth } from './types';

function makeHealth(overrides: Partial<CoinagHealth> = {}): CoinagHealth {
  return {
    status: 'healthy',
    message: null,
    checked_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('CoinagHealthIndicator', () => {
  it('renders the healthy variant with the canonical label', () => {
    const w = mount(CoinagHealthIndicator, { props: { health: makeHealth() } });
    expect(w.text()).toContain('Coinag operativo');
    expect(w.html()).toContain('bg-success');
  });

  it('renders the degraded variant', () => {
    const w = mount(CoinagHealthIndicator, {
      props: { health: makeHealth({ status: 'degraded' }) },
    });
    expect(w.text()).toContain('Coinag degradado');
    expect(w.html()).toContain('bg-warning');
  });

  it('renders the down variant', () => {
    const w = mount(CoinagHealthIndicator, {
      props: { health: makeHealth({ status: 'down' }) },
    });
    expect(w.text()).toContain('Coinag caído');
    expect(w.html()).toContain('bg-danger');
  });

  it('falls back to down when no health snapshot is available', () => {
    const w = mount(CoinagHealthIndicator, { props: { health: null } });
    expect(w.text()).toContain('Coinag caído');
  });

  it('shows the (stale) label when isStale is true', () => {
    const w = mount(CoinagHealthIndicator, {
      props: { health: makeHealth(), isStale: true },
    });
    expect(w.text()).toContain('(stale)');
  });

  it('exposes the message in the tooltip when present', () => {
    const w = mount(CoinagHealthIndicator, {
      props: {
        health: makeHealth({ status: 'degraded', message: 'High latency on /movements' }),
      },
    });
    const indicator = w.find('[data-testid="coinag-health-indicator"]');
    expect(indicator.attributes('title')).toContain('High latency on /movements');
  });
});
