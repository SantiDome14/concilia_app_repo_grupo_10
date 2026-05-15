<script setup lang="ts">
import { computed } from 'vue';
import {
  evalCapabilities,
  evalPredicate,
  resolveField,
  type Action,
  type ManifestKey,
} from '@/lib/manifest';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import { useManifestModule } from '@/composables/useManifestModule';
import { Button } from '@/components/ui/button';

// ════════════════════════════════════════════════════════════════════
// ManifestBatchCTA — page-header batch CTA
// ────────────────────────────────────────────────────────────────────
// Per Requirement 13:
//   - Pick the first action with `batch.batchable && promote_to_main_cta`.
//   - Hide unless bounds + homogeneity + capabilities all pass.
//   - Label substitutes `{N}` from the filtered count.
//   - Clicking opens the shared dialog in `batch` mode.
// ════════════════════════════════════════════════════════════════════

interface Props {
  manifestKey: ManifestKey;
  filteredRecords: Record<string, unknown>[];
}

const props = defineProps<Props>();

const registry = useManifestRegistryStore();
const auth = useAuthStore();
const mod = useManifestModule(props.manifestKey);

const role = computed(() => {
  const u = auth.user;
  return u && Array.isArray(u.capabilities) ? u.capabilities : null;
});

function devWarn(channel: string, message: string): void {

  console.warn(`[${channel}] ${message}`);
}

function checkHomogeneity(action: Action, records: Record<string, unknown>[]): boolean {
  const tokens = action.batch?.homogeneity_check ?? [];
  for (const tk of tokens) {
    if (tk === 'all_records_pass_show_when') {
      if (action.show_when) {
        for (const r of records) {
          if (!evalPredicate(action.show_when, r)) return false;
        }
      }
      continue;
    }
    if (tk.startsWith('all_records_have_field_null:')) {
      const path = tk.slice('all_records_have_field_null:'.length);
      for (const r of records) {
        const v = resolveField(r, path);
        if (v !== null && v !== undefined) return false;
      }
      continue;
    }
    devWarn('MANIFEST', `unknown homogeneity_check token: ${tk}`);
    return false;
  }
  return true;
}

const candidate = computed<Action | null>(() => {
  const m = registry.get(props.manifestKey);
  if (!m) return null;
  const records = props.filteredRecords;
  const first = (m.actions ?? []).find(
    (a) => a.batch?.batchable === true && a.batch?.promote_to_main_cta === true,
  );
  if (!first) return null;

  // Bounds check (silent on violation).
  const min = first.batch?.min_records ?? 2;
  const max = first.batch?.max_records ?? 999_999;
  if (records.length < min || records.length > max) return null;

  // show_when on every record (per default homogeneity).
  if (first.show_when) {
    for (const r of records) {
      if (!evalPredicate(first.show_when, r)) return null;
    }
  }
  if (first.enable_when) {
    for (const r of records) {
      if (!evalPredicate(first.enable_when, r)) return null;
    }
  }

  // Homogeneity tokens.
  if (!checkHomogeneity(first, records)) return null;

  // Capabilities (single check for the user).
  if (!evalCapabilities(first.capabilities, role.value)) return null;

  return first;
});

const ctaLabel = computed(() => {
  const a = candidate.value;
  if (!a) return '';
  const n = props.filteredRecords.length;
  const tpl = a.batch?.main_cta_label_template;
  if (typeof tpl === 'string') return tpl.replace(/\{N\}/g, String(n));
  return `${a.label} a ${n} registros`;
});

function onClick(): void {
  if (!candidate.value) return;
  mod.openBatch(candidate.value.id, props.filteredRecords);
}
</script>

<template>
  <Button
    v-if="candidate"
    variant="primary"
    class="bg-success hover:bg-success/90"
    @click="onClick"
  >
    {{ ctaLabel }}
  </Button>
</template>
