import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InboxCreateDialog from './InboxCreateDialog.vue';
import { useAuditLog } from '@/composables/useAuditLog';
import type { InboxTypeConfig } from '@/types/genericos';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const STUBS = {
  // shadcn-vue Dialog uses Teleport under the hood; JSDOM does not
  // mount it inline. Stub the layer so the wizard content renders
  // synchronously within the wrapper.
  Dialog: { template: '<div><slot /></div>' },
  DialogContent: { template: '<div><slot /></div>' },
  DialogHeader: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<div><slot /></div>' },
  DialogDescription: { template: '<div><slot /></div>' },
  DialogFooter: { template: '<div><slot /></div>' },
  // Same teleport caveat for shadcn-vue Select (reka-ui Popover).
  Popover: { template: '<div><slot /></div>' },
  PopoverTrigger: {
    template: '<button v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
  PopoverContent: {
    template: '<div v-bind="$attrs"><slot /></div>',
    inheritAttrs: false,
  },
};

const SAMPLE_TYPE: InboxTypeConfig = {
  type: 'aprobacion_pago',
  kind: 'solicitud',
  label: 'Aprobación de pago',
  target_app: 'CORE',
  target_role: 'FIN_OFFICER',
  sla_hours: 24,
  payload_schema: [
    { id: 'title', type: 'text', label: 'Título', required: true },
  ],
  closeActions: [
    { id: 'approved', label: 'Aprobada', terminal_state: 'completed' },
  ],
  creable_manualmente: true,
  manual_creation_capability: 'INBOX_CREATE',
};

const TAREA_TYPE: InboxTypeConfig = {
  type: 'baja_usuario',
  kind: 'tarea',
  label: 'Baja de usuario',
  target_app: 'CORE',
  payload_schema: [
    { id: 'title', type: 'text', label: 'Título', required: true },
  ],
  closeActions: [
    { id: 'done', label: 'Hecha', terminal_state: 'completed' },
  ],
  creable_manualmente: true,
  manual_creation_capability: 'INBOX_CREATE',
  triggers_on_create: [{ action_id: 'demo.trigger.x' }],
};

function mountDialog(types: InboxTypeConfig[] = [SAMPLE_TYPE]) {
  setActivePinia(createPinia());
  return mount(InboxCreateDialog, {
    props: { open: true, types },
    global: { stubs: STUBS },
  });
}

describe('InboxCreateDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('lists the available types in step 1 and advances to step 2 on selection', async () => {
    const wrapper = mountDialog([SAMPLE_TYPE, TAREA_TYPE]);
    expect(wrapper.text()).toContain('Elegí el tipo de registro');
    expect(wrapper.findAll('[data-testid^="inbox-type-"]').length).toBe(2);
    await wrapper.find('[data-testid="inbox-type-aprobacion_pago"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Crear Aprobación de pago');
    expect(wrapper.find('[data-testid="inbox-create-submit"]').exists()).toBe(true);
  });

  it('disables the submit button until the required payload field is filled', async () => {
    const wrapper = mountDialog([SAMPLE_TYPE]);
    await wrapper.find('[data-testid="inbox-type-aprobacion_pago"]').trigger('click');
    await flushPromises();
    const submit = wrapper.find('[data-testid="inbox-create-submit"]');
    expect(submit.attributes('disabled')).toBeDefined();

    const titleInput = wrapper.find('input#payload-field-title');
    await titleInput.setValue('Aprobar pago');
    await flushPromises();
    expect(wrapper.find('[data-testid="inbox-create-submit"]').attributes('disabled')).toBeUndefined();
  });

  it('on submit emits `created` with a Solicitud<TPayload> in pendiente + appends one AuditEntryCTA', async () => {
    const wrapper = mountDialog([SAMPLE_TYPE]);
    const auditBefore = useAuditLog().entries.value.length;
    await wrapper.find('[data-testid="inbox-type-aprobacion_pago"]').trigger('click');
    await flushPromises();
    await wrapper.find('input#payload-field-title').setValue('Aprobar pago');
    await flushPromises();
    await wrapper.find('[data-testid="inbox-create-submit"]').trigger('click');
    await flushPromises();

    const createdEvents = wrapper.emitted('created') as
      | Array<[unknown]>
      | undefined;
    expect(createdEvents).toBeTruthy();
    const s = createdEvents![0]![0] as {
      state: string;
      kind: string;
      type: string;
      target_app: string;
      source_module: string;
      payload: { title?: string };
    };
    expect(s.state).toBe('pendiente');
    expect(s.kind).toBe('solicitud');
    expect(s.type).toBe('aprobacion_pago');
    expect(s.target_app).toBe('CORE');
    expect(s.source_module).toBe('inbox');
    expect(s.payload.title).toBe('Aprobar pago');

    const entries = useAuditLog().entries.value;
    expect(entries.length).toBe(auditBefore + 1);
    const last = entries.at(-1)! as {
      kind: string;
      is_module_cta?: boolean;
      created_record_type?: string;
    };
    expect(last.kind).toBe('cta');
    expect(last.is_module_cta).toBe(true);
    expect(last.created_record_type).toBe('aprobacion_pago');
  });

  it('records `triggered_actions[]` and a `kind: action_invoked` timeline event when the type declares triggers_on_create', async () => {
    const wrapper = mountDialog([TAREA_TYPE]);
    await wrapper.find('[data-testid="inbox-type-baja_usuario"]').trigger('click');
    await flushPromises();
    await wrapper.find('input#payload-field-title').setValue('Baja consultor');
    await flushPromises();
    await wrapper.find('[data-testid="inbox-create-submit"]').trigger('click');
    await flushPromises();

    const created = (wrapper.emitted('created') as Array<[unknown]>)[0]![0] as {
      triggered_actions?: Array<{ action_ref: string; status: string }>;
      timeline: Array<{ kind: string }>;
    };
    expect(created.triggered_actions?.length).toBe(1);
    expect(created.triggered_actions?.[0]!.action_ref).toBe('demo.trigger.x');
    expect(created.triggered_actions?.[0]!.status).toBe('pending');
    const hasActionInvoked = created.timeline.some(
      (e) => e.kind === 'action_invoked',
    );
    expect(hasActionInvoked).toBe(true);
  });

  it('back-navigates from step 2 to step 1', async () => {
    const wrapper = mountDialog([SAMPLE_TYPE]);
    await wrapper.find('[data-testid="inbox-type-aprobacion_pago"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Crear Aprobación de pago');
    await wrapper.find('[data-testid="inbox-create-back"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Elegí el tipo de registro');
  });
});
