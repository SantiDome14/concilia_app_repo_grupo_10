<script setup lang="ts">
import { ref, defineComponent, h, type Component } from 'vue';
import { z } from 'zod';
import PlaygroundCard from './PlaygroundCard.vue';
import { Dropzone } from '@/components/ui/dropzone';
import { DatePicker } from '@/components/ui/date-picker';
import { MoneyInput } from '@/components/ui/money-input';
import { OtpInput } from '@/components/ui/otp-input';
import { DynamicKeyValueFields } from '@/components/ui/dynamic-fields';
import { Wizard, DynamicForm } from '@/components/forms';
import FileUploadProgress from '@/components/data-display/FileUploadProgress.vue';
import { useWizard, useDynamicForm } from '@/composables';
import type { UploadFile } from '@/types/file-upload';
import type { FieldConfig } from '@/types/dynamic-form';
import type { WizardStep } from '@/types/wizard';

// ════════════════════════════════════════════════════════════════════
// PlaygroundForms — showroom for form-related primitives
// ────────────────────────────────────────────────────────────────────
// Each section renders one component in a few representative states
// (default / configured / error / disabled). Lives at /playground/forms,
// gated in the sidebar by import.meta.env.DEV.
// ════════════════════════════════════════════════════════════════════

// ─── Dropzone state ──────────────────────────────────────────────────
const droppedSingle = ref<File | null>(null);
const droppedMulti = ref<File[]>([]);

// ─── DatePicker state ────────────────────────────────────────────────
const singleDate = ref<Date | null>(null);
const rangeDate = ref<{ start: Date; end: Date } | null>(null);
const singleDateWithMin = ref<Date | null>(null);

// ─── MoneyInput state ────────────────────────────────────────────────
const moneyArs = ref<number | null>(null);
const moneyUsd = ref<number | null>(null);
const moneyBtc = ref<number | null>(null);

// ─── OtpInput state ──────────────────────────────────────────────────
const otp4 = ref('');
const otp6 = ref('');
const otpAlphanumeric = ref('');

// ─── DynamicKeyValueFields state ─────────────────────────────────────
interface KvRow {
  key: string;
  value: string;
  index: number;
}
const kvRows = ref<KvRow[]>([
  { key: 'currency', value: 'USD', index: 0 },
  { key: 'priority', value: 'high', index: 1 },
]);

// ─── FileUploadProgress sample data (stub UploadFile records) ────────
function makeUploadFile(overrides: Partial<UploadFile>): UploadFile {
  const file = new File(['x'], overrides.filename ?? 'doc.pdf', {
    type: overrides.contentType ?? 'application/pdf',
  });
  return {
    id: `f-${Math.random().toString(36).slice(2, 8)}`,
    file,
    filename: overrides.filename ?? 'doc.pdf',
    sizeBytes: overrides.sizeBytes ?? 1_500_000,
    contentType: overrides.contentType ?? 'application/pdf',
    state: overrides.state ?? 'idle',
    bytesLoaded: overrides.bytesLoaded ?? 0,
    bytesTotal: overrides.bytesTotal ?? 1_500_000,
    percent: overrides.percent ?? 0,
    key: overrides.key ?? null,
    etag: overrides.etag ?? null,
    confirmedAt: overrides.confirmedAt ?? null,
    lastError: overrides.lastError ?? null,
    retryCount: overrides.retryCount ?? 0,
  };
}

const uploadSample = ref<UploadFile[]>([
  makeUploadFile({ filename: 'invoice-march.pdf', state: 'completed', percent: 100 }),
  makeUploadFile({
    filename: 'large-report.pdf',
    state: 'uploading',
    percent: 42,
    bytesLoaded: 630_000,
    sizeBytes: 1_500_000,
  }),
  makeUploadFile({
    filename: 'broken.pdf',
    state: 'error',
    lastError: { message: 'Excede 1 MB', name: 'ApiError' } as unknown as UploadFile['lastError'],
  } as Partial<UploadFile>),
  makeUploadFile({ filename: 'cancelled.pdf', state: 'cancelled' }),
]);

function onRetry(fileId: string): void {
  const f = uploadSample.value.find((x) => x.id === fileId);
  if (f) Object.assign(f, { state: 'completed', percent: 100 });
}
function onCancel(fileId: string): void {
  const f = uploadSample.value.find((x) => x.id === fileId);
  if (f) Object.assign(f, { state: 'cancelled' });
}

// ─── Wizard state (3 steps with conditional visibility) ──────────────
// Single demo step component — receives `label` via attrs. The Wizard
// renders each step's `component` directly without passing props, so we
// hard-bind label per step by wrapping in a tiny functional renderer.
const WizardStubStep = defineComponent({
  name: 'WizardStubStep',
  props: { label: { type: String, required: true } },
  setup: (props) => () => h('div', { class: 'text-sm text-t-2' }, props.label),
});

function stepRenderer(label: string): Component {
  // Lightweight functional component — no defineComponent boilerplate.
  return { render: () => h(WizardStubStep as Component, { label }) };
}

const wizardSteps: WizardStep<Record<string, unknown>>[] = [
  { id: 'side', title: 'Lado', component: stepRenderer('Paso 1 — elegir lado (BUY/SELL).') },
  {
    id: 'amount',
    title: 'Monto',
    description: 'Monto y moneda',
    component: stepRenderer('Paso 2 — capturar monto.'),
  },
  {
    id: 'confirm',
    title: 'Confirmar',
    component: stepRenderer('Paso 3 — confirmación final.'),
    revisitable: false,
  },
];
const wizard = useWizard(wizardSteps, { initialState: {} });

// ─── DynamicForm state ───────────────────────────────────────────────
const dynamicSchema = ref<FieldConfig[]>([
  { id: 'side', type: 'select', label: 'Lado', required: true, options: [
    { value: 'BUY', label: 'Compra' },
    { value: 'SELL', label: 'Venta' },
  ]},
  { id: 'spread', type: 'number', label: 'Spread', conditional: { field: 'side', value: 'BUY' } },
  { id: 'note', type: 'textarea', label: 'Nota', placeholder: 'Opcional…' },
]);
const dynamicForm = useDynamicForm(dynamicSchema, {
  initialState: {} as Record<string, unknown>,
  validateField: (f, v) => {
    if (f.id === 'spread' && typeof v === 'number' && v < 0) return 'Debe ser positivo';
    return true;
  },
});

const moneyRequiresZodImport = z.string().min(0); // silence unused-import lint
void moneyRequiresZodImport;
</script>

<template>
  <div class="space-y-8 px-6 py-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold text-t-1">Forms — primitives showcase</h1>
      <p class="text-sm text-t-3">
        Cada componente debajo en sus estados representativos. Vivirlo, romperlo, validar
        cross-browser y dark-mode.
      </p>
    </header>

    <!-- ─── Dropzone ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">Dropzone</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="Single file (PDF only, max 5 MB)"
          description="Form mode — emite File via update:modelValue."
        >
          <Dropzone
            v-model="droppedSingle"
            :accept="['application/pdf']"
            :max-size="5_000_000"
          />
          <div class="mt-3 text-xs text-t-3">
            Capturado: {{ droppedSingle?.name ?? '—' }}
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Multiple files (PDF + images, max 3 files)"
          description="Form mode — emite File[] via update:modelValue."
        >
          <Dropzone
            v-model="droppedMulti"
            multiple
            :accept="['application/pdf', 'image/*']"
            :max-files="3"
            :max-size="2_000_000"
          />
          <div class="mt-3 text-xs text-t-3">
            Capturados: {{ droppedMulti.length }} archivo(s)
          </div>
        </PlaygroundCard>

        <PlaygroundCard title="Disabled state">
          <Dropzone disabled />
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── FileUploadProgress ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">FileUploadProgress</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="With multiple files in mixed states"
          description="Display-only — clicks dispatch retry/cancel events."
        >
          <FileUploadProgress :files="uploadSample" @retry="onRetry" @cancel="onCancel" />
        </PlaygroundCard>

        <PlaygroundCard
          title="Empty state"
          description="Renders the EmptyState component when files: []."
        >
          <FileUploadProgress :files="[]" />
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── DatePicker ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">DatePicker</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="Single mode (default es-AR)"
          description="reka-ui CalendarRoot — tokens Tailwind, ARIA + keyboard."
        >
          <DatePicker v-model="singleDate" />
          <div class="mt-3 text-xs text-t-3">Valor: {{ singleDate?.toISOString() ?? '—' }}</div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Single mode con min (today) / max (+30 días)"
          description="Valida días fuera del rango como disabled."
        >
          <DatePicker
            v-model="singleDateWithMin"
            :min="new Date()"
            :max="new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)"
          />
        </PlaygroundCard>

        <PlaygroundCard
          title="Range mode"
          description="reka-ui RangeCalendarRoot — start/end con highlight."
        >
          <DatePicker v-model="rangeDate" mode="range" placeholder="Período…" />
          <div class="mt-3 text-xs text-t-3">
            Rango:
            {{
              rangeDate
                ? `${rangeDate.start.toISOString().slice(0, 10)} → ${rangeDate.end.toISOString().slice(0, 10)}`
                : '—'
            }}
          </div>
        </PlaygroundCard>

        <PlaygroundCard title="Disabled">
          <DatePicker :model-value="new Date()" disabled />
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── MoneyInput ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">MoneyInput</h2>
      <div class="grid gap-4 lg:grid-cols-3">
        <PlaygroundCard title="ARS (default 2 decimals, es-AR)">
          <MoneyInput v-model="moneyArs" currency="ARS" />
          <div class="mt-2 text-xs text-t-3">v-model: {{ moneyArs ?? 'null' }}</div>
        </PlaygroundCard>

        <PlaygroundCard title="USD with min/max">
          <MoneyInput
            v-model="moneyUsd"
            currency="USD"
            :min="100"
            :max="50000"
          />
          <div class="mt-2 text-xs text-t-3">v-model: {{ moneyUsd ?? 'null' }}</div>
        </PlaygroundCard>

        <PlaygroundCard title="BTC (8 decimals, allowNegative)">
          <MoneyInput
            v-model="moneyBtc"
            currency="BTC"
            :decimals="8"
            allow-negative
          />
          <div class="mt-2 text-xs text-t-3">v-model: {{ moneyBtc ?? 'null' }}</div>
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── OtpInput ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">OtpInput</h2>
      <div class="grid gap-4 lg:grid-cols-3">
        <PlaygroundCard title="4-digit numeric">
          <OtpInput v-model="otp4" :length="4" />
          <div class="mt-2 text-xs text-t-3">v-model: "{{ otp4 }}"</div>
        </PlaygroundCard>

        <PlaygroundCard title="6-digit numeric, masked">
          <OtpInput v-model="otp6" :length="6" mask />
          <div class="mt-2 text-xs text-t-3">v-model: "{{ otp6 }}"</div>
        </PlaygroundCard>

        <PlaygroundCard title="6-char alphanumeric (uppercase)">
          <OtpInput v-model="otpAlphanumeric" :length="6" mode="alphanumeric" />
          <div class="mt-2 text-xs text-t-3">v-model: "{{ otpAlphanumeric }}"</div>
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── DynamicKeyValueFields ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">DynamicKeyValueFields</h2>
      <PlaygroundCard
        title="Free key + value, with min 1 row"
        description="Add/remove rows; auto-reindex; warn duplicate keys."
      >
        <DynamicKeyValueFields
          v-model="kvRows"
          :min-rows="1"
          duplicate-key-policy="warn"
        />
        <div class="mt-3 text-xs text-t-3">
          Rows: {{ kvRows.length }} — JSON: {{ JSON.stringify(kvRows) }}
        </div>
      </PlaygroundCard>
    </section>

    <!-- ─── Wizard ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">Wizard (multi-step form)</h2>
      <PlaygroundCard
        title="3-step wizard with non-revisitable confirm"
        description="Use Next / Back to navigate. Última step bloquea back-nav."
      >
        <Wizard :wizard="wizard" />
        <div class="mt-3 text-xs text-t-3">
          Step actual: {{ wizard.currentStep.value.id }} ({{ wizard.currentStepIndex.value + 1 }}/{{ wizard.visibleSteps.value.length }})
        </div>
      </PlaygroundCard>
    </section>

    <!-- ─── DynamicForm ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">DynamicForm (runtime schema)</h2>
      <PlaygroundCard
        title="Schema con campo condicional"
        description="`spread` aparece solo cuando `side === 'BUY'`. Validador rechaza spread negativo."
      >
        <DynamicForm :form="dynamicForm" />
        <div class="mt-3 space-y-1 text-xs text-t-3">
          <div>State: {{ JSON.stringify(dynamicForm.formState.value) }}</div>
          <div>Errors: {{ JSON.stringify(dynamicForm.errors.value) }}</div>
        </div>
      </PlaygroundCard>
    </section>
  </div>
</template>
