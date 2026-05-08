<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Search, Check, Mail, Loader2 } from 'lucide-vue-next';
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
import Skeleton from '@/components/feedback/Skeleton.vue';
import { useStepUp } from '@/composables/useStepUp';
import { StepUpCancelledError } from '@/types/auth-step-up';
import { listClients, signUpClient } from './api';
import type { Client } from './types';

// ════════════════════════════════════════════════════════════════════
// SignUpUserModal — implements Requirements 4 + 11 (toast on success).
//
// Flow:
//   1. User opens the modal (only ADMIN sees the trigger CTA).
//   2. The modal lists eligible clients (active + email + portal NOT
//      yet ACTIVE) — searchable.
//   3. User picks exactly one.
//   4. Submit calls `useStepUp().withStepUp(...)` BEFORE the
//      `POST /sign-up`. On step-up cancel, the modal stays open with
//      a non-destructive notice.
//   5. On 200 OK, a success toast appears with the invited email.
// ════════════════════════════════════════════════════════════════════

const open = defineModel<boolean>('open', { required: true });

const { withStepUp } = useStepUp();

const searchQuery = ref('');
const debouncedQuery = ref('');
const suggestions = ref<Client[]>([]);
const isLoadingSuggestions = ref(false);
const selected = ref<Client | null>(null);
const isSubmitting = ref(false);
const stepUpNotice = ref<string | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Reset state on each open ───────────────────────────────────────
watch(open, (isOpen) => {
  if (!isOpen) return;
  searchQuery.value = '';
  debouncedQuery.value = '';
  selected.value = null;
  stepUpNotice.value = null;
  void runSearch('');
});

// ─── Debounced search ───────────────────────────────────────────────
watch(searchQuery, (v) => {
  if (searchTimer !== null) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedQuery.value = v.trim();
    void runSearch(debouncedQuery.value);
  }, 300);
});

async function runSearch(query: string): Promise<void> {
  isLoadingSuggestions.value = true;
  try {
    const params: Parameters<typeof listClients>[0] = { page: 1, pageSize: 50 };
    if (query) params.name = query;
    const res = await listClients(params);
    // Filter to clients eligible for portal invitation (active + has email + not yet ACTIVE).
    suggestions.value = res.clients.filter(
      (c) => c.is_active && c.email && c.metadata?.status !== 'ACTIVE',
    );
  } catch (e) {
    suggestions.value = [];
    toast.error(e instanceof Error ? e.message : 'No se pudo cargar la lista');
  } finally {
    isLoadingSuggestions.value = false;
  }
}

function pickClient(c: Client): void {
  selected.value = c;
  stepUpNotice.value = null;
}

const canSubmit = computed(
  () => Boolean(selected.value && selected.value.email && !isSubmitting.value),
);

async function submit(): Promise<void> {
  if (!canSubmit.value || !selected.value) return;
  const externalId = selected.value.external_client_id ?? selected.value.id;
  const email = selected.value.email!;
  isSubmitting.value = true;
  stepUpNotice.value = null;
  try {
    await withStepUp(() => signUpClient({ external_client_id: externalId }));
    toast.success(`Mail enviado correctamente a ${email}`);
    open.value = false;
  } catch (e) {
    if (e instanceof StepUpCancelledError) {
      stepUpNotice.value = 'Verificación cancelada';
    } else {
      const message = e instanceof Error ? e.message : 'Error al enviar la invitación';
      toast.error(message);
    }
  } finally {
    isSubmitting.value = false;
  }
}

function close(): void {
  if (isSubmitting.value) return;
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="sm:max-w-lg"
      data-testid="signup-modal"
      @open-auto-focus="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Alta de Cliente en APP</DialogTitle>
        <DialogDescription>
          Seleccioná un cliente activo con email registrado para enviarle la invitación al portal.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3">
        <!-- Search -->
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
          />
          <Input
            v-model="searchQuery"
            placeholder="Buscar por nombre…"
            class="pl-8"
            data-testid="signup-search"
          />
        </div>

        <!-- Suggestions -->
        <div class="max-h-72 overflow-y-auto rounded-lg border border-b-1 bg-card-2">
          <div v-if="isLoadingSuggestions" class="space-y-1.5 p-2.5">
            <Skeleton class="h-5 w-full" />
            <Skeleton class="h-5 w-2/3" />
            <Skeleton class="h-5 w-3/4" />
          </div>
          <div
            v-else-if="suggestions.length === 0"
            class="px-3 py-6 text-center text-xs text-t-4"
          >
            No se encontraron clientes elegibles para invitar.
          </div>
          <ul v-else class="py-1">
            <li
              v-for="c in suggestions"
              :key="c.id"
              :data-testid="`signup-option-${c.id}`"
              class="flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-card"
              :class="selected?.id === c.id && 'bg-brand-bg'"
              @click="pickClient(c)"
            >
              <Check
                class="h-3.5 w-3.5 shrink-0"
                :class="selected?.id === c.id ? 'text-brand' : 'text-transparent'"
              />
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-t-1">
                  {{ c.name || 'Sin nombre' }}
                </div>
                <div class="truncate text-xs text-t-4">{{ c.email }}</div>
              </div>
              <span class="font-mono text-[11px] text-t-4">{{ c.tax_number || '' }}</span>
            </li>
          </ul>
        </div>

        <!-- Step-up cancellation notice -->
        <p
          v-if="stepUpNotice"
          class="text-xs text-warning"
          data-testid="signup-stepup-notice"
        >
          {{ stepUpNotice }}. Volvé a hacer click en Enviar invitación para reintentar la verificación.
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="close">Cancelar</Button>
        <Button
          variant="primary"
          :disabled="!canSubmit"
          data-testid="signup-submit"
          @click="submit"
        >
          <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
          <Mail v-else class="h-3.5 w-3.5" />
          Enviar invitación
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
