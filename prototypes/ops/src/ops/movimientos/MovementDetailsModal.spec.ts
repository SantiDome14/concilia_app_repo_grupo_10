import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '@/api/client';
import MovementDetailsModal from './MovementDetailsModal.vue';
import type { MovementDetails } from './types';

const get = apiClient.get as Mock;

function makeMovement(overrides: Partial<MovementDetails> = {}): MovementDetails {
  return {
    id: 'm-1',
    date: '2026-05-08T12:00:00Z',
    type: 'DEPOSIT',
    status: 'COMPLETED',
    amount: '1500.00',
    currency: 'USD',
    origin: 'Acme Corp',
    destination: 'Coinag CVU',
    sponsor: 'COINAG',
    client: 'Acme',
    counterparty: 'BBVA',
    created_at: '2026-05-08T12:00:00Z',
    updated_at: '2026-05-08T13:00:00Z',
    metadata: { swift_ref: 'ABC123' },
    ...overrides,
  };
}

// Stub the Dialog primitives so the body renders inline (jsdom doesn't
// project Teleport content; the canonical Dialog uses Teleport via
// reka-ui under the hood). Each stub renders a wrapper div with the
// default slot inline.
const STUBS = {
  Dialog: {
    props: ['open'],
    setup(_p: unknown, { slots }: { slots: { default?: () => unknown } }) {
      return () => h('div', { 'data-stub': 'dialog' }, slots.default?.());
    },
  },
  DialogContent: {
    inheritAttrs: false,
    setup(_p: unknown, { slots, attrs }: { slots: { default?: () => unknown }; attrs: Record<string, unknown> }) {
      return () =>
        h('div', { 'data-stub': 'dialog-content', ...attrs }, slots.default?.());
    },
  },
  DialogHeader: {
    setup(_p: unknown, { slots }: { slots: { default?: () => unknown } }) {
      return () => h('div', { 'data-stub': 'dialog-header' }, slots.default?.());
    },
  },
  DialogTitle: {
    setup(_p: unknown, { slots }: { slots: { default?: () => unknown } }) {
      return () => h('div', { 'data-stub': 'dialog-title' }, slots.default?.());
    },
  },
  DialogDescription: {
    setup(_p: unknown, { slots }: { slots: { default?: () => unknown } }) {
      return () => h('div', { 'data-stub': 'dialog-description' }, slots.default?.());
    },
  },
  DialogFooter: {
    setup(_p: unknown, { slots }: { slots: { default?: () => unknown } }) {
      return () => h('div', { 'data-stub': 'dialog-footer' }, slots.default?.());
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MovementDetailsModal', () => {
  it('renders nothing when movement is null', () => {
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: null },
      global: { stubs: STUBS },
    });
    expect(w.find('[data-testid="movement-details-modal"]').exists()).toBe(false);
  });

  it('renders the canonical fields when movement is provided', () => {
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: makeMovement() },
      global: { stubs: STUBS },
    });
    const text = w.text();
    expect(text).toContain('Movimiento');
    expect(text).toContain('m-1');
    expect(text).toContain('USD');
    expect(text).toContain('1,500.00');
    expect(text).toContain('Acme Corp');
    expect(text).toContain('Coinag CVU');
    expect(text).toContain('COINAG');
  });

  it('shows the metadata details collapsible', () => {
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: makeMovement() },
      global: { stubs: STUBS },
    });
    expect(w.text()).toContain('Metadata (1)');
    expect(w.text()).toContain('swift_ref');
    expect(w.text()).toContain('ABC123');
  });

  it('omits the metadata block when there are no metadata entries', () => {
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: makeMovement({ metadata: {} }) },
      global: { stubs: STUBS },
    });
    expect(w.text()).not.toContain('Metadata (');
  });

  it('opens the receipt URL on Descargar comprobante click', async () => {
    get.mockResolvedValueOnce({
      data: { success: true, url: 'https://files/r.pdf' },
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: makeMovement() },
      global: { stubs: STUBS },
    });
    await w.find('[data-testid="movement-receipt-download"]').trigger('click');
    // Wait for the async receipt download to resolve.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(get).toHaveBeenCalledWith('/receipt/m-1');
    expect(openSpy).toHaveBeenCalledWith('https://files/r.pdf', '_blank');
    openSpy.mockRestore();
  });

  it('renders status badge with semantic variant for PENDING', () => {
    const w = mount(MovementDetailsModal, {
      props: { open: true, movement: makeMovement({ status: 'PENDING' }) },
      global: { stubs: STUBS },
    });
    expect(w.html()).toContain('text-warning');
  });

  it('falls back to em-dashes when optional fields are null', () => {
    const w = mount(MovementDetailsModal, {
      props: {
        open: true,
        movement: makeMovement({
          origin: null,
          destination: null,
          client: null,
          counterparty: null,
        }),
      },
      global: { stubs: STUBS },
    });
    const dashes = (w.text().match(/—/g) ?? []).length;
    expect(dashes).toBeGreaterThanOrEqual(4);
  });
});
