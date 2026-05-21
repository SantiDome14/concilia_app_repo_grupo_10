<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
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
import {
  createAccount,
  fetchEstructuras,
  fetchSociedades,
} from '@/api/modules/banksAccounts';
import {
  defaultCuentaTipoFor,
  type BankAccountRecord,
  type CuentaTipo,
  type Estructura,
  type EstructuraTipo,
  type Moneda,
  type Sociedad,
} from './types';

// ════════════════════════════════════════════════════════════════════
// CreateAccountModal — implements ops-banks-accounts Requirement 2
// (Nueva Cuenta CTA). Cascading dropdowns: Sociedad → Estructura →
// Cuenta padre options. Tipo de cuenta defaults from the chosen
// Estructura's tipo (per design Decision 2) but is operator-overridable.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  open: boolean;
  /** Used to populate the Cuenta padre dropdown. */
  existingAccounts: BankAccountRecord[];
}>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [];
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

// ─── Cascading dropdown state ────────────────────────────────────────
const sociedadId = ref('');
const estructuraId = ref('');
const tipoCuenta = ref<CuentaTipo | ''>('');
const moneda = ref<Moneda | ''>('');
const nro = ref('');
const padreCuentaId = ref<string>('');

const isSubmitting = ref(false);
const errors = ref<{
  sociedadId?: string;
  estructuraId?: string;
  tipoCuenta?: string;
  moneda?: string;
  nro?: string;
}>({});

// ─── Catalog queries (mounted only when modal opens) ─────────────────
const enabled = computed(() => props.open);

const { data: sociedades } = useQuery<Sociedad[]>({
  queryKey: ['ops', 'banks-accounts', 'sociedades'],
  queryFn: fetchSociedades,
  enabled,
});
const { data: estructuras } = useQuery<Estructura[]>({
  queryKey: ['ops', 'banks-accounts', 'estructuras'],
  queryFn: fetchEstructuras,
  enabled,
});

const sociedadOptions = computed<Sociedad[]>(() =>
  (sociedades.value ?? []).filter((s) => s.status === 'Activa'),
);
const estructuraOptions = computed<Estructura[]>(() =>
  (estructuras.value ?? []).filter((e) => e.status === 'Activa'),
);
const padreOptions = computed<BankAccountRecord[]>(() => {
  if (!sociedadId.value) return [];
  const sociedadName = sociedadOptions.value.find((s) => s.id === sociedadId.value)?.name;
  if (!sociedadName) return [];
  return props.existingAccounts.filter((a) => a.sociedad === sociedadName);
});

// Reset child fields when parent changes (per core-forms cascade rule).
watch(sociedadId, () => {
  estructuraId.value = '';
  padreCuentaId.value = '';
});
watch(estructuraId, (id) => {
  const e = estructuraOptions.value.find((x) => x.id === id);
  if (e && tipoCuenta.value === '') {
    tipoCuenta.value = defaultCuentaTipoFor(e.tipo as EstructuraTipo);
  }
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      sociedadId.value = '';
      estructuraId.value = '';
      tipoCuenta.value = '';
      moneda.value = '';
      nro.value = '';
      padreCuentaId.value = '';
      isSubmitting.value = false;
      errors.value = {};
    }
  },
);

const canSubmit = computed(
  () =>
    sociedadId.value !== '' &&
    estructuraId.value !== '' &&
    tipoCuenta.value !== '' &&
    moneda.value !== '' &&
    nro.value.trim().length > 0 &&
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
  errors.value = {};
  if (!sociedadId.value) errors.value.sociedadId = 'Campo obligatorio';
  if (!estructuraId.value) errors.value.estructuraId = 'Campo obligatorio';
  if (tipoCuenta.value === '') errors.value.tipoCuenta = 'Campo obligatorio';
  if (moneda.value === '') errors.value.moneda = 'Campo obligatorio';
  if (nro.value.trim().length === 0) errors.value.nro = 'Campo obligatorio';
  if (Object.keys(errors.value).length > 0) return;

  isSubmitting.value = true;
  try {
    await createAccount({
      sociedadId: sociedadId.value,
      estructuraId: estructuraId.value,
      tipoCuenta: tipoCuenta.value as CuentaTipo,
      moneda: moneda.value as Moneda,
      nro: nro.value.trim(),
      padreCuentaId: padreCuentaId.value || null,
    });
    toast.success('Cuenta creada');
    emit('created');
    emit('update:open', false);
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'No se pudo crear la cuenta';
    toast.error(message);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => (v ? null : close())">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Nueva cuenta</DialogTitle>
        <DialogDescription>
          Registrá una cuenta nueva bajo una sociedad y estructura existentes. La configuración
          contable se agrega después desde la fila de la cuenta.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Sociedad <span class="text-danger">*</span>
          </label>
          <Select v-model="sociedadId">
            <SelectTrigger data-testid="account-sociedad">
              <SelectValue placeholder="Elegí una sociedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in sociedadOptions" :key="s.id" :value="s.id">
                {{ s.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <span v-if="errors.sociedadId" class="text-xs text-danger">{{ errors.sociedadId }}</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Estructura <span class="text-danger">*</span>
          </label>
          <Select v-model="estructuraId" :disabled="!sociedadId">
            <SelectTrigger data-testid="account-estructura">
              <SelectValue
                :placeholder="sociedadId ? 'Elegí una estructura' : 'Elegí una sociedad primero'"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="e in estructuraOptions" :key="e.id" :value="e.id">
                {{ e.name }} · {{ e.tipo }}
              </SelectItem>
            </SelectContent>
          </Select>
          <span v-if="errors.estructuraId" class="text-xs text-danger">{{ errors.estructuraId }}</span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Tipo de cuenta <span class="text-danger">*</span>
          </label>
          <Select v-model="tipoCuenta">
            <SelectTrigger data-testid="account-tipo-cuenta">
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
              <SelectTrigger data-testid="account-moneda">
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
            <Input v-model="nro" placeholder="10.045 / 0x..." data-testid="account-nro" />
            <span v-if="errors.nro" class="text-xs text-danger">{{ errors.nro }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Cuenta padre
          </label>
          <Select v-model="padreModel" :disabled="!sociedadId || padreOptions.length === 0">
            <SelectTrigger data-testid="account-padre">
              <SelectValue
                :placeholder="
                  sociedadId
                    ? padreOptions.length === 0
                      ? 'No hay cuentas padre disponibles'
                      : 'Sin cuenta padre'
                    : 'Elegí una sociedad primero'
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
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="close">Cancelar</Button>
        <Button variant="primary" :disabled="!canSubmit" @click="onSubmit">
          {{ isSubmitting ? 'Creando…' : 'Crear cuenta' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
