<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/types/api';
import { updateAccount } from '@/api/modules/banksAccounts';
import type {
  BankAccountRecord,
  CuentaTipo,
  EstadoCatalogo,
  Moneda,
} from './types';

// ════════════════════════════════════════════════════════════════════
// EditAccountModal — implements ops-banks-accounts "Edit-Account modal"
// Requirement. Edits 5 fields (tipoCuenta, moneda, nro, padreCuentaId,
// status). Sociedad and Estructura are read-only — changing those is
// semantically a different cuenta and must be done via deactivate +
// create-new (per design Decision 2).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  open: boolean;
  /** The cuenta being edited. Null → modal hidden. */
  record: BankAccountRecord | null;
  /**
   * Full catalog from the page query, used to populate the Cuenta padre
   * dropdown filtered to the same Sociedad as the record.
   */
  existingAccounts: BankAccountRecord[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  saved: [];
}>();

const NONE = '__none__';
const CUENTA_TIPOS: CuentaTipo[] = [
  'Cuenta Corriente',
  'CVU',
  'Wallet Pool',
  'Custodia',
  'Exchange Account',
  'Comitente',
];
const MONEDAS: Moneda[] = ['ARS', 'USD', 'USDC', 'USDT', 'BTC'];
const ESTADOS: EstadoCatalogo[] = ['Activa', 'Inactiva'];

const tipoCuenta = ref<CuentaTipo | ''>('');
const moneda = ref<Moneda | ''>('');
const nro = ref('');
const padreCuentaId = ref<string>('');
const status = ref<EstadoCatalogo | ''>('');

const isSubmitting = ref(false);
const errors = ref<{
  tipoCuenta?: string;
  moneda?: string;
  nro?: string;
  status?: string;
}>({});

// Pre-fill on every (open, record) change. Uses immediate:true so the
// modal mounted with open=true and a record already set still prefills
// (lesson learned from the previous accounting modal).
watch(
  () => [props.open, props.record] as const,
  ([isOpen, rec]) => {
    if (isOpen && rec) {
      tipoCuenta.value = rec.tipoCuenta;
      moneda.value = rec.moneda;
      nro.value = rec.nro;
      padreCuentaId.value = rec.padreCuentaId ?? '';
      status.value = rec.status;
      errors.value = {};
      isSubmitting.value = false;
    }
  },
  { immediate: true },
);

const padreOptions = computed<BankAccountRecord[]>(() => {
  if (!props.record) return [];
  // Same-Sociedad filter (per design Decision 6 of refactor change). Exclude
  // the cuenta being edited from its own parent options.
  return props.existingAccounts.filter(
    (a) => a.sociedad === props.record!.sociedad && a.id !== props.record!.id,
  );
});

const canSubmit = computed(
  () =>
    tipoCuenta.value !== '' &&
    moneda.value !== '' &&
    nro.value.trim().length > 0 &&
    status.value !== '' &&
    !isSubmitting.value,
);

const padreModel = computed<string>({
  get: () => padreCuentaId.value || NONE,
  set: (v) => (padreCuentaId.value = v === NONE ? '' : v),
});

function close(): void {
  if (isSubmitting.value) return;
  emit('update:open', false);
}

async function onSubmit(): Promise<void> {
  if (!props.record) return;
  errors.value = {};
  if (tipoCuenta.value === '') errors.value.tipoCuenta = 'Campo obligatorio';
  if (moneda.value === '') errors.value.moneda = 'Campo obligatorio';
  if (nro.value.trim().length === 0) errors.value.nro = 'Campo obligatorio';
  if (status.value === '') errors.value.status = 'Campo obligatorio';
  if (Object.keys(errors.value).length > 0) return;

  isSubmitting.value = true;
  try {
    await updateAccount(props.record.id, {
      tipoCuenta: tipoCuenta.value as CuentaTipo,
      moneda: moneda.value as Moneda,
      nro: nro.value.trim(),
      padreCuentaId: padreCuentaId.value || null,
      status: status.value as EstadoCatalogo,
    });
    toast.success('Cuenta actualizada');
    emit('saved');
    emit('update:open', false);
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'No se pudo actualizar la cuenta';
    toast.error(message, {
      action: {
        label: 'Reintentar',
        onClick: () => void onSubmit(),
      },
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="props.open && record !== null" @update:open="(v) => (v ? null : close())">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Editar cuenta</DialogTitle>
        <DialogDescription>
          La sociedad y la estructura no se editan desde acá: cambiarlas implica una cuenta nueva.
          Para retirar una cuenta del uso operativo, cambiá su estado a <strong>Inactiva</strong>.
        </DialogDescription>
      </DialogHeader>

      <!-- Read-only ref block: Sociedad + Estructura are stable identity. -->
      <div v-if="record" class="rounded-md border border-b-2 bg-card p-3 text-sm">
        <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Cuenta</div>
        <div class="mt-1 text-t-1" data-testid="edit-ref-sociedad">{{ record.sociedad }}</div>
        <div class="mt-0.5 text-[11px] text-t-4" data-testid="edit-ref-estructura">
          {{ record.estructura }} · {{ record.estructuraTipo }}
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Tipo de cuenta <span class="text-danger">*</span>
          </label>
          <Select v-model="tipoCuenta">
            <SelectTrigger data-testid="edit-tipo-cuenta">
              <SelectValue placeholder="Elegí un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in CUENTA_TIPOS" :key="t" :value="t">{{ t }}</SelectItem>
            </SelectContent>
          </Select>
          <span v-if="errors.tipoCuenta" class="text-xs text-danger">{{ errors.tipoCuenta }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Moneda <span class="text-danger">*</span>
            </label>
            <Select v-model="moneda">
              <SelectTrigger data-testid="edit-moneda">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in MONEDAS" :key="m" :value="m">{{ m }}</SelectItem>
              </SelectContent>
            </Select>
            <span v-if="errors.moneda" class="text-xs text-danger">{{ errors.moneda }}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Nro. / Address <span class="text-danger">*</span>
            </label>
            <Input v-model="nro" placeholder="10.045 / 0x..." data-testid="edit-nro" />
            <span v-if="errors.nro" class="text-xs text-danger">{{ errors.nro }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Cuenta padre
          </label>
          <Select v-model="padreModel" :disabled="padreOptions.length === 0">
            <SelectTrigger data-testid="edit-padre">
              <SelectValue
                :placeholder="
                  padreOptions.length === 0
                    ? 'No hay cuentas padre disponibles'
                    : 'Sin cuenta padre'
                "
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE">Sin cuenta padre</SelectItem>
              <SelectItem v-for="p in padreOptions" :key="p.id" :value="p.id">
                {{ p.estructura }} · {{ p.moneda }} · {{ p.nro }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Estado <span class="text-danger">*</span>
          </label>
          <Select v-model="status">
            <SelectTrigger data-testid="edit-status">
              <SelectValue placeholder="Elegí un estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in ESTADOS" :key="s" :value="s">{{ s }}</SelectItem>
            </SelectContent>
          </Select>
          <span v-if="errors.status" class="text-xs text-danger">{{ errors.status }}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="close">Cancelar</Button>
        <Button variant="primary" :disabled="!canSubmit" @click="onSubmit">
          {{ isSubmitting ? 'Guardando…' : 'Guardar cambios' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
