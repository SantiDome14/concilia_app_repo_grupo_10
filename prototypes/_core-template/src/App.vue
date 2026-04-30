<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import AppShell from '@/components/layout/AppShell.vue';
import ManifestDialog from '@/components/manifest/ManifestDialog.vue';
import { SettingsDialog } from '@/components/settings';
import { useSettingsDialog } from '@/composables/useSettingsDialog';
import { usePreferencesStore } from '@/stores/preferences';

// Mount the preferences store eagerly so the appearance class lands on
// <html> on first render (the watch inside the store applies it).
const prefs = usePreferencesStore();
const { resolvedAppearance } = storeToRefs(prefs);

const settings = useSettingsDialog();
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <!-- Single shared dialog instance per Requirement 9 (core-actions-manifest). -->
  <ManifestDialog />
  <!-- Singleton Settings dialog — opened from Sidebar account menu. -->
  <SettingsDialog :open="settings.isOpen.value" @update:open="settings.set" />
  <Toaster
    position="bottom-right"
    :theme="resolvedAppearance"
    :duration="4500"
    rich-colors
  />
</template>
