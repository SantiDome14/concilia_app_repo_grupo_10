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
import { createStructure } from '@/api/modules/banksAccounts';
import type { EstructuraTipo } from './types';

// ════════════════════════════════════════════════════════════════════
// CreateStructureModal — implements ops-banks-accounts Requirement 2
// (Nueva Estructura CTA). Captures Nombre + Tipo and creates a new
// Estructura via POST /banks-accounts/structures.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [];
}>();

const TIPOS: EstructuraTipo[] = [
  'Banco',
  'Banco digital',
  'ALyC',
  'Exchange',
  'Custodio',
  'PSP',
  'Proveedor',
];

const nombre = ref('');
const tipo = ref<EstructuraTipo | ''>('');
const isSubmitting = ref(false);
const errors = ref<{ nombre?: string; tipo?: string }>({});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      nombre.value = '';
      tipo.value = '';
      isSubmitting.value = false;
      errors.value = {};
    }
  },
);

const canSubmit = computed(
  () => nombre.value.trim().length > 0 && tipo.value !== '' && !isSubmitting.value,
);

function close(): void {
  if (isSubmitting.value) return;
  emit('update:open', false);
}

async function onSubmit(): Promise<void> {
  errors.value = {};
  if (nombre.value.trim().length === 0) {
    errors.value.nombre = 'Campo obligatorio';
    return;
  }
  if (tipo.value === '') {
    errors.value.tipo = 'Campo obligatorio';
    return;
  }
  isSubmitting.value = true;
  try {
    await createStructure({ name: nombre.value.trim(), tipo: tipo.value });
    toast.success('Estructura creada');
    emit('created');
    emit('update:open', false);
  } catch (e) {
    const message = e instanceof ApiError ? e.message : 'No se pudo crear la estructura';
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
        <DialogTitle>Nueva estructura</DialogTitle>
        <DialogDescription>
          Definí una institución (banco, exchange, ALyC, custodio, PSP o proveedor) donde Ardua
          mantiene cuentas.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Nombre <span class="text-danger">*</span>
          </label>
          <Input v-model="nombre" placeholder="Ej. COINAG, BIND, MACRO" data-testid="structure-nombre" />
          <span v-if="errors.nombre" class="text-xs text-danger">{{ errors.nombre }}</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Tipo <span class="text-danger">*</span>
          </label>
          <Select v-model="tipo">
            <SelectTrigger data-testid="structure-tipo">
              <SelectValue placeholder="Elegí un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="t in TIPOS" :key="t" :value="t">{{ t }}</SelectItem>
            </SelectContent>
          </Select>
          <span v-if="errors.tipo" class="text-xs text-danger">{{ errors.tipo }}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="close">Cancelar</Button>
        <Button variant="primary" :disabled="!canSubmit" @click="onSubmit">
          {{ isSubmitting ? 'Creando…' : 'Crear estructura' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
