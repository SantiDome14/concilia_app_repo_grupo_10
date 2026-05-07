<script setup lang="ts">
import { ref } from 'vue';
import { User, Bell, Shield, Plug, SlidersHorizontal } from 'lucide-vue-next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import GeneralTab from './GeneralTab.vue';

// ════════════════════════════════════════════════════════════════════
// <SettingsDialog> — wide modal with vertical side tabs
// ────────────────────────────────────────────────────────────────────
// First cut: only the General tab is implemented. The remaining tabs
// are scaffolded as disabled placeholders so the side rail is wired
// for future work (Account, Notifications, Security, Integrations).
// ════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

type TabId = 'general' | 'account' | 'notifications' | 'security' | 'integrations';

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof User;
  enabled: boolean;
}

const TABS: TabDef[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal, enabled: true },
  { id: 'account', label: 'Account', icon: User, enabled: false },
  { id: 'notifications', label: 'Notifications', icon: Bell, enabled: false },
  { id: 'security', label: 'Security', icon: Shield, enabled: false },
  { id: 'integrations', label: 'Integrations', icon: Plug, enabled: false },
];

const activeTab = ref<TabId>('general');

function selectTab(tab: TabDef): void {
  if (!tab.enabled) return;
  activeTab.value = tab.id;
}

function onOpenChange(value: boolean): void {
  emit('update:open', value);
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent
      class="flex max-w-3xl gap-0 overflow-hidden p-0 sm:max-h-[640px]"
      data-testid="settings-dialog"
    >
      <DialogTitle class="sr-only">Settings</DialogTitle>
      <DialogDescription class="sr-only">
        Ajustes de la cuenta y preferencias de la aplicación.
      </DialogDescription>

      <!-- Side rail -->
      <nav
        role="tablist"
        aria-label="Settings sections"
        class="flex w-[200px] flex-col gap-0.5 border-r border-b-1 bg-surf p-3"
      >
        <h2 class="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-t-3">
          Settings
        </h2>
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-disabled="!tab.enabled"
          :data-testid="`settings-tab-${tab.id}`"
          :class="
            cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-brand-bg font-semibold text-brand'
                : 'text-t-3 hover:bg-card hover:text-t-2',
              !tab.enabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
            )
          "
          @click="selectTab(tab)"
        >
          <component :is="tab.icon" class="h-4 w-4 flex-shrink-0" />
          <span class="flex-1">{{ tab.label }}</span>
          <span
            v-if="!tab.enabled"
            class="rounded border border-b-1 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-t-4"
          >
            Soon
          </span>
        </button>
      </nav>

      <!-- Tab content -->
      <section class="flex-1 overflow-y-auto p-6">
        <GeneralTab v-if="activeTab === 'general'" />
      </section>
    </DialogContent>
  </Dialog>
</template>
