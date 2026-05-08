import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ReconciliationBanner from './ReconciliationBanner.vue';
import type { ReconciliationMismatch } from './types';

function makeMismatch(overrides: Partial<ReconciliationMismatch> = {}): ReconciliationMismatch {
  return {
    sponsor: 'COINAG',
    db_balance: '100.00',
    api_balance: '95.00',
    difference: '-5.00',
    checked_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('ReconciliationBanner', () => {
  it('renders nothing when there are no mismatches', () => {
    const w = mount(ReconciliationBanner, { props: { mismatches: [] } });
    expect(w.find('[data-testid="reconciliation-banner-area"]').exists()).toBe(false);
  });

  it('renders one danger banner for a deficit (negative difference)', () => {
    const w = mount(ReconciliationBanner, {
      props: { mismatches: [makeMismatch({ difference: '-5.00' })] },
    });
    const banner = w.find('[data-testid="reconciliation-banner-COINAG"]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('Deficit');
  });

  it('renders one warning banner for a surplus (positive difference)', () => {
    const w = mount(ReconciliationBanner, {
      props: { mismatches: [makeMismatch({ difference: '5.00' })] },
    });
    const banner = w.find('[data-testid="reconciliation-banner-COINAG"]');
    expect(banner.text()).toContain('Surplus');
  });

  it('stacks multiple mismatches alphabetically by sponsor', () => {
    const w = mount(ReconciliationBanner, {
      props: {
        mismatches: [
          makeMismatch({ sponsor: 'COINAG' }),
          makeMismatch({ sponsor: 'BIND' }),
        ],
      },
    });
    // Filter out the wrapper (`reconciliation-banner-area`) — only banners
    // with role="alert" are real per-sponsor banners.
    const banners = w.findAll('[role="alert"]');
    expect(banners).toHaveLength(2);
    // BIND first (alphabetical), then COINAG.
    expect(banners[0]!.attributes('data-testid')).toBe('reconciliation-banner-BIND');
    expect(banners[1]!.attributes('data-testid')).toBe('reconciliation-banner-COINAG');
  });

  it('dismisses to a pill on click and persists dismissal in sessionStorage', async () => {
    const w = mount(ReconciliationBanner, {
      props: { mismatches: [makeMismatch()] },
    });
    expect(w.find('[data-testid="reconciliation-pill"]').exists()).toBe(false);

    await w.find('[data-testid="reconciliation-dismiss"]').trigger('click');

    expect(w.find('[data-testid="reconciliation-pill"]').exists()).toBe(true);
    expect(window.sessionStorage.getItem('ops:psp:reconciliationDismissed')).toBe('1');
  });

  it('expands back from the pill on click', async () => {
    window.sessionStorage.setItem('ops:psp:reconciliationDismissed', '1');
    const w = mount(ReconciliationBanner, {
      props: { mismatches: [makeMismatch()] },
    });
    expect(w.find('[data-testid="reconciliation-pill"]').exists()).toBe(true);

    await w.find('[data-testid="reconciliation-pill"]').trigger('click');

    expect(w.find('[data-testid="reconciliation-pill"]').exists()).toBe(false);
    expect(window.sessionStorage.getItem('ops:psp:reconciliationDismissed')).toBe(null);
  });

  it('starts collapsed when sessionStorage already has dismiss state', () => {
    window.sessionStorage.setItem('ops:psp:reconciliationDismissed', '1');
    const w = mount(ReconciliationBanner, {
      props: { mismatches: [makeMismatch(), makeMismatch({ sponsor: 'BIND' })] },
    });
    const pill = w.find('[data-testid="reconciliation-pill"]');
    expect(pill.exists()).toBe(true);
    expect(pill.text()).toContain('2 sponsor con mismatch');
  });
});
