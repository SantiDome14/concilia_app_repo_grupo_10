import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import Drawer from './Drawer.vue';

// The <Sheet> primitive renders into a portal; in jsdom we can still
// query the document body for the rendered content.
function bodyHtml(): string {
  return document.body.innerHTML;
}

function findIn(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
}

describe('Drawer', () => {
  it('does not render content when open is false', () => {
    mount(Drawer, {
      props: {
        open: false,
        recordId: 'R-001',
        title: 'Solicitud test',
      },
    });
    expect(findIn('drawer-body')).toBeNull();
  });

  it('renders header with id chip, title, status badge, and close button when open', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-042',
        title: 'Solicitud de retiro',
        subtitle: 'Cliente Acme',
        statusBadge: { label: 'En proceso', variant: 'info' },
      },
    });

    // Sheet portals into body — wait a tick for the DialogContent.
    await new Promise((r) => setTimeout(r, 0));

    expect(findIn('drawer-header')).not.toBeNull();
    expect(findIn('drawer-id-chip')?.textContent).toContain('R-042');
    expect(bodyHtml()).toContain('Solicitud de retiro');
    expect(bodyHtml()).toContain('Cliente Acme');
    expect(findIn('drawer-status-badge')?.textContent).toContain('En proceso');
    expect(findIn('drawer-close')).not.toBeNull();
  });

  it('renders default, timeline, and comments slots into the body', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-007',
        title: 'Detalle',
      },
      slots: {
        default: '<div data-testid="slot-default">summary</div>',
        timeline: '<div data-testid="slot-timeline">timeline-block</div>',
        comments: '<div data-testid="slot-comments">comments-block</div>',
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(findIn('slot-default')).not.toBeNull();
    expect(findIn('slot-timeline')).not.toBeNull();
    expect(findIn('slot-comments')).not.toBeNull();
  });

  it('renders the footer slot when provided', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-007',
        title: 'Detalle',
      },
      slots: {
        footer: '<button data-testid="slot-footer-action">Acción</button>',
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(findIn('drawer-footer')).not.toBeNull();
    expect(findIn('slot-footer-action')).not.toBeNull();
  });

  it('omits the footer region when no footer slot is supplied', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-007',
        title: 'Detalle',
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(findIn('drawer-footer')).toBeNull();
  });

  it('applies sticky positioning to header (and footer when present)', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-007',
        title: 'Detalle',
      },
      slots: {
        footer: '<button>Acción</button>',
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const header = findIn('drawer-header');
    const footer = findIn('drawer-footer');

    expect(header?.className).toContain('sticky');
    expect(header?.className).toContain('top-0');
    expect(footer?.className).toContain('sticky');
    expect(footer?.className).toContain('bottom-0');
  });

  it('marks the body as the only scroll surface', async () => {
    mount(Drawer, {
      props: {
        open: true,
        recordId: 'R-007',
        title: 'Detalle',
      },
      slots: {
        default: '<div>content</div>',
      },
    });

    await new Promise((r) => setTimeout(r, 0));

    const body = findIn('drawer-body');
    expect(body?.className).toContain('overflow-y-auto');
    expect(body?.className).toContain('flex-1');
  });

  it('emits update:open(false) when the close button is clicked (v-model close)', async () => {
    // Wrapper component that proxies open via a ref so we can observe the
    // resulting state after the v-model writes back.
    const Host = defineComponent({
      setup() {
        const open = ref(true);
        return () =>
          h(Drawer, {
            open: open.value,
            'onUpdate:open': (v: boolean) => {
              open.value = v;
            },
            recordId: 'R-007',
            title: 'Detalle',
          });
      },
    });

    const wrapper = mount(Host);
    await new Promise((r) => setTimeout(r, 0));

    const closeBtn = findIn('drawer-close');
    expect(closeBtn).not.toBeNull();
    closeBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await wrapper.vm.$nextTick();
    await new Promise((r) => setTimeout(r, 0));

    // After close, the portal content is unmounted by reka-ui.
    expect(findIn('drawer-body')).toBeNull();
  });
});
