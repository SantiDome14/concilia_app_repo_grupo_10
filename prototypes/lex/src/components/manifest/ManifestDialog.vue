<script setup lang="ts">
import { computed } from 'vue';
import { Info, AlertTriangle } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useManifestDialog,
  resolveCancelLabel,
  resolveConfirmLabel,
  resolveDialogDescription,
  resolveDialogInfoBanner,
  resolveDialogTitle,
  dedupCompositeFields,
} from '@/composables/useManifestDialog';
import ManifestField from './ManifestField.vue';
import type { Action, DialogField } from '@/lib/manifest';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// ManifestDialog — single shared instance for all four modes
// ────────────────────────────────────────────────────────────────────
// Mount exactly ONE of these in App.vue (Requirement 9). Subscribes
// to `useManifestDialog().state` and renders accordingly.
// ════════════════════════════════════════════════════════════════════

const dialog = useManifestDialog();

const open = computed({
  get: () => dialog.state.value !== null,
  set: (next: boolean) => {
    if (!next) dialog.cancel();
  },
});

const widthClass = computed(() => {
  const s = dialog.state.value;
  if (!s) return 'max-w-md';
  if (s.mode === 'composite') return 'max-w-lg';
  return 'max-w-md';
});

const title = computed(() => {
  const s = dialog.state.value;
  return s ? resolveDialogTitle(s) : '';
});

const description = computed(() => {
  const s = dialog.state.value;
  return s ? resolveDialogDescription(s) : undefined;
});

const infoBanner = computed(() => {
  const s = dialog.state.value;
  return s ? resolveDialogInfoBanner(s) : undefined;
});

const confirmLabel = computed(() => {
  const s = dialog.state.value;
  return s ? resolveConfirmLabel(s) : 'Confirmar';
});

const cancelLabel = computed(() => {
  const s = dialog.state.value;
  return s ? resolveCancelLabel(s) : 'Cancelar';
});

const isDanger = computed(() => {
  const s = dialog.state.value;
  if (!s) return false;
  if (s.mode === 'single' || s.mode === 'batch') {
    return s.action.danger === true;
  }
  return false;
});

interface FieldRow {
  field: DialogField;
  ownerActionId: string;
  ownerAction?: Action;
  disabled: boolean;
}

const rows = computed<FieldRow[]>(() => {
  const s = dialog.state.value;
  if (!s) return [];
  if (s.mode === 'single') {
    return (s.action.dialog?.fields ?? []).map((f) => ({
      field: f,
      ownerActionId: s.action.id,
      disabled: false,
    }));
  }
  if (s.mode === 'batch') {
    return (s.action.dialog?.fields ?? []).map((f) => ({
      field: f,
      ownerActionId: s.action.id,
      disabled: false,
    }));
  }
  if (s.mode === 'cta') {
    return (s.cta.dialog?.fields ?? []).map((f) => ({
      field: f,
      ownerActionId: s.cta.id,
      disabled: false,
    }));
  }
  // composite — rows are deduped, but we keep the owning action so
  // disabled groups render with disabled inputs.
  const visible = dedupCompositeFields(s.groups);
  return visible.map(({ ownerActionId, field }) => {
    const owner = s.groups.find((g) => g.action.id === ownerActionId)?.action;
    const enabled = s.enabledOverrides[ownerActionId] !== false;
    return {
      field,
      ownerActionId,
      ownerAction: owner,
      disabled: !enabled,
    };
  });
});

const recordRef = computed(() => {
  const s = dialog.state.value;
  if (!s) return undefined;
  if (s.mode === 'single' || s.mode === 'composite') return s.recordRef;
  return undefined;
});

function setField(fieldId: string, value: unknown): void {
  dialog.setFieldValue(fieldId, value);
}

async function onConfirm(): Promise<void> {
  await dialog.confirm();
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent :class="cn(widthClass)">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <!-- DialogDescription is rendered unconditionally (sr-only when
             empty) because reka-ui's accessibility guard logs a warning
             whenever DialogContent has neither a Description nor an
             explicit `aria-describedby`. -->
        <DialogDescription :class="description ? '' : 'sr-only'">
          {{ description ?? '' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Optional info banner — between header and form fields -->
      <div
        v-if="infoBanner"
        :class="
          cn(
            'flex items-start gap-2 rounded-md border px-3 py-2 text-[13px]',
            infoBanner.variant === 'warning'
              ? 'border-warning/40 bg-warning/[0.05] text-t-2'
              : 'border-info/40 bg-info/[0.05] text-t-2',
          )
        "
        data-testid="manifest-dialog-info-banner"
      >
        <component
          :is="infoBanner.variant === 'warning' ? AlertTriangle : Info"
          :class="
            cn(
              'mt-0.5 h-4 w-4 shrink-0',
              infoBanner.variant === 'warning' ? 'text-warning' : 'text-info',
            )
          "
        />
        <p class="leading-snug">{{ infoBanner.text }}</p>
      </div>

      <div v-if="dialog.state.value" class="space-y-4 py-2">
        <template v-if="dialog.state.value.mode === 'composite'">
          <div
            v-for="g in dialog.state.value.groups"
            :key="g.action.id"
            class="space-y-3 rounded-md border border-b-2 bg-card p-3"
            :class="{ 'opacity-60': dialog.state.value.enabledOverrides[g.action.id] === false }"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-t-1">{{ g.action.label }}</p>
              <span
                v-if="dialog.state.value.enabledOverrides[g.action.id] === false && g.reason"
                class="text-xs text-t-4"
              >{{ g.reason }}</span>
            </div>
            <template
              v-for="row in rows.filter((r) => r.ownerActionId === g.action.id)"
              :key="row.field.id"
            >
              <ManifestField
                :field="row.field"
                :model-value="dialog.state.value.formValues[row.field.id]"
                :disabled="row.disabled"
                :error="dialog.state.value.errors[row.field.id] ?? null"
                :record="recordRef"
                :form-values="dialog.state.value.formValues"
                @update:model-value="(v: unknown) => setField(row.field.id, v)"
              />
            </template>
          </div>
        </template>
        <template v-else>
          <ManifestField
            v-for="row in rows"
            :key="row.field.id"
            :field="row.field"
            :model-value="dialog.state.value.formValues[row.field.id]"
            :disabled="row.disabled"
            :error="dialog.state.value.errors[row.field.id] ?? null"
            :record="recordRef"
            :form-values="dialog.state.value.formValues"
            @update:model-value="(v: unknown) => setField(row.field.id, v)"
          />
        </template>
      </div>
      <DialogFooter>
        <Button variant="ghost" :disabled="dialog.state.value?.busy" @click="dialog.cancel">
          {{ cancelLabel }}
        </Button>
        <Button
          :variant="isDanger ? 'danger' : 'primary'"
          :disabled="dialog.state.value?.busy"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
