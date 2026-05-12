<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import InboxTypeSelector from './InboxTypeSelector.vue';
import DynamicPayloadForm from './DynamicPayloadForm.vue';
import { useAuditLog } from '@/composables/useAuditLog';
import { CURRENT_USER, MOCK_USERS } from '@/mocks/genericos/users';
import type {
  InboxTypeConfig,
  Solicitud,
  TriggeredAction,
  TimelineEvent,
} from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// InboxCreateDialog — 2-step wizard for the main CTA
// ────────────────────────────────────────────────────────────────────
// Step 1: <InboxTypeSelector> lists the filtered creable types.
// Step 2: <DynamicPayloadForm> renders the payload form from the
//         selected type's `payload_schema`, plus common metadata
//         (assignee picker, optional SLA / due_at overrides).
// Submit: builds a Solicitud<TPayload> in `state: 'pendiente'`, emits
//         it for the parent to persist, registers `triggered_actions[]`
//         per `triggers_on_create[]` (mocked in this round — full
//         manifest-engine integration is V2-scoped per Decision 9 of
//         the OpenSpec change), and appends an `AuditEntryCTA` via
//         `useAuditLog()`.
// ════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  /** Pre-filtered creable types. Caller applies the capability filter. */
  types: InboxTypeConfig[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  created: [solicitud: Solicitud];
}>();

const audit = useAuditLog();

// ── Step state ───────────────────────────────────────────────────────
type Step = 'pick-type' | 'fill-payload';
const step = ref<Step>('pick-type');
const selectedType = ref<InboxTypeConfig | null>(null);
const payload = ref<Record<string, unknown>>({});
const payloadValid = ref<boolean>(false);
const assignee = ref<string | null>(null);
const slaHoursOverride = ref<number | null>(null);

watch(
  () => props.open,
  (next) => {
    if (next) {
      // Reset the wizard on every open.
      step.value = 'pick-type';
      selectedType.value = null;
      payload.value = {};
      payloadValid.value = false;
      assignee.value = null;
      slaHoursOverride.value = null;
    }
  },
);

function close(): void {
  emit('update:open', false);
}

function pickType(t: InboxTypeConfig): void {
  selectedType.value = t;
  // Pre-fill payload defaults declared on the schema (FieldConfig.defaults).
  const init: Record<string, unknown> = {};
  for (const f of t.payload_schema) {
    if (f.defaults !== undefined) init[f.id] = f.defaults;
  }
  payload.value = init;
  payloadValid.value = false;
  step.value = 'fill-payload';
}

function back(): void {
  step.value = 'pick-type';
}

const NEXT_ID = ref(7); // mock sequential id; first id after the 6 mocks
function nextSequentialId(): string {
  const id = `SOL-${String(NEXT_ID.value).padStart(3, '0')}`;
  NEXT_ID.value += 1;
  return id;
}

const dialogTitle = computed(() => {
  if (step.value === 'pick-type') return 'Crear';
  return selectedType.value ? `Crear ${selectedType.value.label}` : 'Crear';
});

const dialogDescription = computed(() => {
  if (step.value === 'pick-type') return 'Elegí el tipo de registro.';
  return selectedType.value
    ? `Tipo: ${selectedType.value.label}`
    : undefined;
});

const canSubmit = computed(() => {
  return step.value === 'fill-payload' && selectedType.value !== null && payloadValid.value;
});

const submitting = ref(false);

function submit(): void {
  if (!canSubmit.value || !selectedType.value) return;
  submitting.value = true;
  try {
    const t = selectedType.value;
    const now = new Date().toISOString();
    const id = nextSequentialId();
    const triggered: TriggeredAction[] | undefined = t.triggers_on_create?.map(
      (trig) => ({
        action_ref: trig.action_id,
        status: 'pending',
        at: Date.now(),
      }),
    );
    const timeline: TimelineEvent[] = [
      {
        id: `evt-${id}-1`,
        at: now,
        actor_id: CURRENT_USER.id,
        actor_name: CURRENT_USER.name,
        kind: 'system',
        label: `${t.kind === 'tarea' ? 'Tarea' : 'Solicitud'} creada manualmente desde el Inbox`,
      },
    ];
    // Mocked trigger execution: per Decision 9, the engine doesn't
    // actually invoke the manifest engine here; we just record that the
    // triggers were declared. A follow-up change wires this fully.
    for (const trig of t.triggers_on_create ?? []) {
      timeline.push({
        id: `evt-${id}-trig-${trig.action_id}`,
        at: now,
        actor_id: 'system',
        actor_name: 'Sistema',
        kind: 'action_invoked',
        label: `Trigger: ${trig.action_id}`,
      });
    }

    const newSolicitud: Solicitud = {
      id,
      type: t.type,
      kind: t.kind,
      source_app: t.target_app, // creating from within the target app's own Inbox
      source_module: 'inbox',
      target_app: t.target_app,
      target_role: t.target_role,
      owner: null,
      assignee: assignee.value,
      sla_hours: slaHoursOverride.value ?? t.sla_hours ?? null,
      state: 'pendiente',
      payload: { ...payload.value },
      created_at: now,
      updated_at: now,
      timeline,
      comments: [],
      triggered_actions: triggered,
    };

    audit.append({
      kind: 'cta',
      action_id: 'inbox.crear_manual',
      record_id: newSolicitud.id,
      created_record_type: newSolicitud.type,
      is_module_cta: true,
      user_id: CURRENT_USER.id,
      timestamp: Date.now(),
      changes: { ...(newSolicitud.payload as Record<string, unknown>) },
    });

    toast.success(t.kind === 'tarea' ? 'Tarea creada' : 'Solicitud creada', {
      description: `${newSolicitud.id} — ${t.label}`,
    });

    emit('created', newSolicitud);
    close();
  } finally {
    submitting.value = false;
  }
}

const openModel = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
});
</script>

<template>
  <Dialog v-model:open="openModel">
    <DialogContent class="max-w-lg" data-testid="inbox-create-dialog">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
        <DialogDescription v-if="dialogDescription">
          {{ dialogDescription }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <!-- Step 1: type selector -->
        <InboxTypeSelector
          v-if="step === 'pick-type'"
          :types="types"
          @select="pickType"
        />

        <!-- Step 2: payload form + common metadata -->
        <template v-else-if="step === 'fill-payload' && selectedType">
          <DynamicPayloadForm
            v-model="payload"
            :schema="selectedType.payload_schema"
            @validity="(v) => (payloadValid = v)"
          />

          <div class="flex flex-col gap-2 border-t border-b-2 pt-3">
            <p class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Metadata
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-1.5">
                <Label
                  for="inbox-create-assignee"
                  class="text-[10px] font-bold uppercase tracking-wider text-t-3"
                >
                  Asignar a
                </Label>
                <Select
                  v-model="assignee"
                  data-testid="inbox-create-assignee"
                >
                  <SelectTrigger id="inbox-create-assignee">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="u in MOCK_USERS"
                      :key="u.id"
                      :value="u.id"
                    >
                      {{ u.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex flex-col gap-1.5">
                <Label
                  for="inbox-create-sla"
                  class="text-[10px] font-bold uppercase tracking-wider text-t-3"
                >
                  SLA (horas)
                </Label>
                <Input
                  id="inbox-create-sla"
                  type="number"
                  :model-value="slaHoursOverride ?? ''"
                  :placeholder="String(selectedType.sla_hours ?? '—')"
                  @update:model-value="(v: string | number) => (slaHoursOverride = v === '' ? null : Number(v))"
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">Cancelar</Button>
        <Button
          v-if="step === 'fill-payload'"
          variant="ghost"
          data-testid="inbox-create-back"
          @click="back"
        >
          Volver
        </Button>
        <Button
          v-if="step === 'fill-payload'"
          variant="primary"
          :disabled="!canSubmit || submitting"
          data-testid="inbox-create-submit"
          @click="submit"
        >
          Crear
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
