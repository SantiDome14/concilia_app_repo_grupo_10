<script setup lang="ts">
import { computed, ref } from 'vue';
import { evalCapabilities, type ManifestKey, type ModuleCTA } from '@/lib/manifest';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import { useManifestModule } from '@/composables/useManifestModule';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal } from 'lucide-vue-next';

// ════════════════════════════════════════════════════════════════════
// ManifestModuleCTAs — page-header CTA list
// ────────────────────────────────────────────────────────────────────
// Per Requirement 14: filter by capabilities, cap visible at 3, the
// rest collapse into an overflow popover. Clicking opens the shared
// dialog in `cta` mode.
// ════════════════════════════════════════════════════════════════════

interface Props {
  manifestKey: ManifestKey;
  /** Cap on inline-rendered CTAs. Default 3 (per core-layout page-header). */
  maxVisible?: number;
}

const props = withDefaults(defineProps<Props>(), { maxVisible: 3 });

const registry = useManifestRegistryStore();
const auth = useAuthStore();
const mod = useManifestModule(props.manifestKey);

const role = computed(() => {
  const u = auth.user;
  return u && Array.isArray(u.capabilities) ? u.capabilities : null;
});

const allowed = computed<ModuleCTA[]>(() => {
  const m = registry.get(props.manifestKey);
  if (!m) return [];
  return (m.module_ctas ?? []).filter((c) =>
    evalCapabilities(c.capabilities, role.value),
  );
});

const inline = computed(() => allowed.value.slice(0, props.maxVisible));
const overflow = computed(() => allowed.value.slice(props.maxVisible));

const overflowOpen = ref(false);

function trigger(cta: ModuleCTA): void {
  mod.openModuleCTA(cta.id);
  overflowOpen.value = false;
}
</script>

<template>
  <div v-if="allowed.length > 0" class="flex items-center gap-2">
    <Button
      v-for="cta in inline"
      :key="cta.id"
      :variant="cta.variant ?? 'primary'"
      @click="trigger(cta)"
    >
      {{ cta.label }}
    </Button>
    <Popover v-if="overflow.length > 0" v-model:open="overflowOpen">
      <PopoverTrigger as-child>
        <Button variant="ghost" size="icon" aria-label="Más acciones">
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-56 p-1.5">
        <button
          v-for="cta in overflow"
          :key="cta.id"
          class="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-t-2 hover:bg-card hover:text-t-1"
          @click="trigger(cta)"
        >
          {{ cta.label }}
        </button>
      </PopoverContent>
    </Popover>
  </div>
</template>
