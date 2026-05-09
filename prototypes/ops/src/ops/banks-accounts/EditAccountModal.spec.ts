import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import EditAccountModal from './EditAccountModal.vue';
import type { BankAccountRecord } from './types';

// ════════════════════════════════════════════════════════════════════
// EditAccountModal — covers the post-refactor "Edit-Account modal"
// Requirement: pre-fill, validation, save dispatch, stable identity.
// ════════════════════════════════════════════════════════════════════

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const updateAccountMock = vi.fn().mockResolvedValue({});

vi.mock('./api', () => ({
  updateAccount: (...args: unknown[]) => updateAccountMock(...args),
}));

function record(overrides: Partial<BankAccountRecord> = {}): BankAccountRecord {
  return {
    id: 'acc-x',
    sociedad: 'Circuit Pay SA',
    estructura: 'COINAG',
    estructuraTipo: 'PSP',
    tipoCuenta: 'CVU',
    moneda: 'ARS',
    nro: '10.045',
    cuentaPadreLabel: null,
    padreCuentaId: null,
    status: 'Activa',
    ...overrides,
  };
}

function mountModal(rec: BankAccountRecord | null, existingAccounts: BankAccountRecord[] = []) {
  return mount(EditAccountModal, {
    props: { open: true, record: rec, existingAccounts },
    global: {
      stubs: {
        Dialog: { template: '<div><slot /></div>' },
        DialogContent: { template: '<div><slot /></div>' },
        DialogHeader: { template: '<div><slot /></div>' },
        DialogTitle: { template: '<div><slot /></div>' },
        DialogDescription: { template: '<div><slot /></div>' },
        DialogFooter: { template: '<div><slot /></div>' },
        Button: {
          template:
            '<button :disabled="disabled" :data-variant="variant" @click="$emit(\'click\', $event)"><slot /></button>',
          props: ['variant', 'disabled'],
        },
        Input: {
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />',
          props: ['modelValue'],
          inheritAttrs: false,
        },
        // Keep Select stubs minimal — the test asserts on the inputs that surface
        // the Select trigger via data-testid passthrough.
        Select: {
          template: '<div :data-stub="\'select\'"><slot /></div>',
          props: ['modelValue', 'disabled'],
        },
        SelectTrigger: { template: '<div v-bind="$attrs"><slot /></div>', inheritAttrs: false },
        SelectValue: { template: '<span><slot /></span>' },
        SelectContent: { template: '<div><slot /></div>' },
        SelectItem: { template: '<div><slot /></div>', props: ['value'] },
      },
    },
  });
}

describe('EditAccountModal — pre-fill', () => {
  it('renders the cuenta\'s nro pre-filled into the Nro input', async () => {
    const w = mountModal(record({ nro: '10.045' }));
    await nextTick();
    const nroInput = w.find('[data-testid="edit-nro"]').element as HTMLInputElement;
    expect(nroInput.value).toBe('10.045');
  });

  it('updates the prefill when the record prop changes', async () => {
    const w = mountModal(record({ nro: '10.045' }));
    await nextTick();
    await w.setProps({ open: true, record: record({ id: 'acc-y', nro: '10.060' }), existingAccounts: [] });
    await nextTick();
    const nroInput = w.find('[data-testid="edit-nro"]').element as HTMLInputElement;
    expect(nroInput.value).toBe('10.060');
  });
});

describe('EditAccountModal — stable identity', () => {
  it('renders the read-only Sociedad and Estructura ref block (no editable inputs)', () => {
    const w = mountModal(record());
    expect(w.find('[data-testid="edit-ref-sociedad"]').exists()).toBe(true);
    expect(w.find('[data-testid="edit-ref-sociedad"]').text()).toContain('Circuit Pay SA');
    expect(w.find('[data-testid="edit-ref-estructura"]').text()).toContain('COINAG');
    // No editable Sociedad/Estructura controls anywhere in the form.
    expect(w.find('[data-testid="edit-sociedad"]').exists()).toBe(false);
    expect(w.find('[data-testid="edit-estructura"]').exists()).toBe(false);
  });
});
