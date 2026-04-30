import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import RecordDetailModal from './RecordDetailModal.vue';
import type { DetailField } from './RecordDetailModal.vue';

vi.mock('vue-sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

const FIELDS: DetailField[] = [
  { label: 'Sección 1', variant: 'section' },
  { label: 'ID', value: 'M-001', variant: 'mono' },
  { label: 'Estado', value: 'CONF', variant: 'badge', badge: 'success' },
  { label: 'Nota', value: 'una nota larga', span: 2 },
  { label: 'Vacío', value: null },
];

async function mountDialog(
  props: Partial<{
    open: boolean;
    title: string;
    subtitle: string;
    fields: DetailField[];
    onEdit: () => void;
  }> = {},
) {
  const wrapper = mount(RecordDetailModal, {
    props: {
      open: true,
      title: 'Detalle del movimiento',
      subtitle: 'M-001 · CBU Coinag',
      fields: FIELDS,
      ...props,
    },
    attachTo: document.body,
  });
  await nextTick();
  return wrapper;
}

describe('RecordDetailModal', () => {
  it('renders title, subtitle, and field grid when open', async () => {
    const wrapper = await mountDialog();
    expect(document.body.textContent).toContain('Detalle del movimiento');
    expect(document.body.textContent).toContain('M-001 · CBU Coinag');
    expect(document.body.textContent).toContain('Sección 1');
    wrapper.unmount();
  });

  it('renders "—" placeholder for null/empty field values', async () => {
    const wrapper = await mountDialog();
    expect(document.body.textContent).toContain('—');
    wrapper.unmount();
  });

  it('emits update:open(false) when Cerrar is clicked', async () => {
    const wrapper = await mountDialog();
    const closeBtn = document.body.querySelector(
      '[data-testid="record-detail-close"]',
    ) as HTMLButtonElement | null;
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();
    const events = wrapper.emitted('update:open');
    expect(events).toBeTruthy();
    expect(events?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('invokes onEdit prop when Editar is clicked', async () => {
    const onEdit = vi.fn();
    const wrapper = await mountDialog({ onEdit });
    const editBtn = document.body.querySelector(
      '[data-testid="record-detail-edit"]',
    ) as HTMLButtonElement | null;
    expect(editBtn).not.toBeNull();
    editBtn?.click();
    expect(onEdit).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
