import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useManifestDialog,
  _clearModuleRegistries,
  _resetManifestDialogState,
  dedupCompositeFields,
  resolveConfirmLabel,
} from './useManifestDialog';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuditLogStore } from '@/stores/auditLog';
import { useAuthStore } from '@/stores/auth';
import type { Manifest } from '@/types/manifest';

const toastSpies = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('vue-sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSpies.success(...args),
    error: (...args: unknown[]) => toastSpies.error(...args),
  },
}));

const manifest: Manifest = {
  app: 'demo',
  module: 'test',
  required_imputations: ['cliente_id'],
  kanban_axes: [
    {
      axis_id: 'imputacion',
      dimension: 'imputacion',
      states: ['pendiente', 'en_proceso', 'imputado'],
    },
  ],
  actions: [
    {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Asignar Cliente',
      dialog: {
        title: 'Asignar Cliente',
        fields: [
          { id: 'cliente_id', label: 'Cliente', type: 'text', required: true },
          { id: 'note', label: 'Nota', type: 'textarea' },
        ],
      },
      on_confirm: { update_fields: ['cliente_id'] },
    },
    {
      id: 'demo.test.imp.dup_field',
      dimension: 'imputacion',
      label: 'Set Note',
      dialog: {
        title: 'Set Note',
        fields: [
          // Same id as above — should dedup on render.
          { id: 'note', label: 'Nota', type: 'textarea' },
          { id: 'extra', label: 'Extra', type: 'text' },
        ],
      },
      on_confirm: { update_fields: ['note', 'extra'] },
    },
  ],
  module_ctas: [
    {
      id: 'demo.test.crear',
      label: 'Crear',
      is_module_cta: true,
      creates_record_type: 'movimiento_manual',
      dialog: {
        title: 'Crear',
        fields: [{ id: 'name', label: 'Nombre', type: 'text', required: true }],
      },
    },
  ],
};

beforeEach(() => {
  setActivePinia(createPinia());
  _clearModuleRegistries();
  _resetManifestDialogState();
  toastSpies.success.mockReset();
  toastSpies.error.mockReset();
  useManifestRegistryStore().register('demo.test', manifest);
  // Seed an authenticated user with a permissive capability list.
  useAuthStore().setUser({
    id: 'U-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['ADMIN'],
  });
});

describe('useManifestDialog', () => {
  it('openSingle seeds formValues from record + defaults', () => {
    const d = useManifestDialog();
    d.openSingle('demo.test.imp.assign', 'demo.test', {
      id: 'R-1',
      cliente_id: 'C-EXIST',
    });
    const s = d.state.value!;
    expect(s.mode).toBe('single');
    expect(s.formValues.cliente_id).toBe('C-EXIST');
    expect(s.formValues.note).toBeNull();
  });

  it('openSingle on a missing manifest is a no-op', () => {
    const d = useManifestDialog();
    d.openSingle('nope', 'does.not.exist', { id: 'X' });
    expect(d.state.value).toBeNull();
  });

  it('confirm with missing required field toasts and keeps dialog open', async () => {
    const d = useManifestDialog();
    d.openSingle('demo.test.imp.assign', 'demo.test', { id: 'R-1' });
    d.setFieldValue('cliente_id', '');
    await d.confirm();
    expect(toastSpies.error).toHaveBeenCalledWith('Falta completar campo obligatorio');
    expect(d.state.value).not.toBeNull();
    expect(useAuditLogStore().entries.length).toBe(0);
  });

  it('confirm applies and closes; appends one audit entry', async () => {
    const d = useManifestDialog();
    const record: Record<string, unknown> = { id: 'R-1' };
    d.openSingle('demo.test.imp.assign', 'demo.test', record);
    d.setFieldValue('cliente_id', 'C-9');
    await d.confirm();
    expect(d.state.value).toBeNull();
    expect(record.cliente_id).toBe('C-9');
    expect(useAuditLogStore().entries).toHaveLength(1);
    expect(useAuditLogStore().entries[0]).toMatchObject({
      kind: 'single',
      record_id: 'R-1',
    });
  });

  it('cancel closes without persisting', () => {
    const d = useManifestDialog();
    const record: Record<string, unknown> = { id: 'R-1' };
    d.openSingle('demo.test.imp.assign', 'demo.test', record);
    d.setFieldValue('cliente_id', 'C-9');
    d.cancel();
    expect(d.state.value).toBeNull();
    expect(record.cliente_id).toBeUndefined();
    expect(useAuditLogStore().entries).toHaveLength(0);
  });

  it('openComposite collects dimension-matching actions and dedups field ids', () => {
    const d = useManifestDialog();
    d.openComposite('demo.test', { id: 'R-1' }, 'imputacion');
    const s = d.state.value!;
    expect(s.mode).toBe('composite');
    if (s.mode !== 'composite') throw new Error('mode');
    expect(s.groups.map((g) => g.action.id)).toEqual([
      'demo.test.imp.assign',
      'demo.test.imp.dup_field',
    ]);
    const visible = dedupCompositeFields(s.groups).map((v) => v.field.id);
    // 'note' appears once (first action wins).
    expect(visible).toEqual(['cliente_id', 'note', 'extra']);
  });

  it('openBatch substitutes {N} via resolveConfirmLabel', () => {
    // Add a batch-y action variant.
    useManifestRegistryStore().register('demo.test.batch', {
      ...manifest,
      actions: [
        {
          id: 'demo.test.imp.batch_assign',
          dimension: 'imputacion',
          label: 'Imputar',
          batch: {
            batchable: true,
            promote_to_main_cta: true,
            main_cta_label_template: 'Imputar a {N} registros',
          },
          dialog: {
            title: 'Imputar',
            fields: [{ id: 'cliente_id', label: 'Cliente', type: 'text', required: true }],
          },
          on_confirm: { update_fields: ['cliente_id'] },
        },
      ],
    });
    const d = useManifestDialog();
    d.openBatch('demo.test.imp.batch_assign', 'demo.test.batch', [
      { id: 'R-1' },
      { id: 'R-2' },
      { id: 'R-3' },
    ]);
    const s = d.state.value!;
    expect(s.mode).toBe('batch');
    expect(resolveConfirmLabel(s)).toBe('Imputar a 3 registros');
  });

  it('openModuleCTA without registered creator surfaces toast.error and keeps dialog open', async () => {
    const d = useManifestDialog();
    d.openModuleCTA('demo.test.crear', 'demo.test');
    d.setFieldValue('name', 'Nuevo');
    await d.confirm();
    expect(toastSpies.error).toHaveBeenCalledWith(
      'No se puede crear el registro: factory no registrada',
    );
    expect(d.state.value).not.toBeNull();
    expect(useAuditLogStore().entries).toHaveLength(0);
  });

  it('setFieldValue on composite re-evaluates enabledOverrides', () => {
    // Add a composite action with an enable_when that flips on form values.
    useManifestRegistryStore().register('demo.test.comp', {
      ...manifest,
      actions: [
        {
          id: 'demo.test.imp.first',
          dimension: 'imputacion',
          label: 'First',
          dialog: { title: 'F', fields: [{ id: 'cliente_id', label: 'C', type: 'text' }] },
        },
        {
          id: 'demo.test.imp.gated',
          dimension: 'imputacion',
          label: 'Gated',
          enable_when: { field_is_not_null: 'cliente_id' },
          dialog: { title: 'G', fields: [{ id: 'note', label: 'N', type: 'text' }] },
        },
      ],
    });
    const d = useManifestDialog();
    d.openComposite('demo.test.comp', { id: 'R-1' }, 'imputacion');
    let s = d.state.value!;
    if (s.mode !== 'composite') throw new Error('mode');
    expect(s.enabledOverrides['demo.test.imp.gated']).toBe(false);
    d.setFieldValue('cliente_id', 'C-1');
    s = d.state.value!;
    if (s.mode !== 'composite') throw new Error('mode');
    expect(s.enabledOverrides['demo.test.imp.gated']).toBe(true);
  });
});
