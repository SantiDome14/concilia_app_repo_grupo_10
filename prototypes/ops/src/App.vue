<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
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

// Force a clean unmount/remount of the routed component on every
// route-NAME change. Without this key, Vue Router reuses the same
// <component> instance when transitioning between routes and any
// stale teleport / portal / pending watcher in the outgoing page can
// "leak" and visually persist over the new page (most visible after
// navigating away from a modal-heavy page like Instrucciones). Keying
// on `route.name` (NOT `route.fullPath`) avoids unnecessary remounts
// when only the query string changes within the same page, which is
// the canonical pattern (filters / pagination / tabs all live in
// `route.query`).
const route = useRoute();
</script>

<template>
  <AppShell>
    <RouterView v-slot="{ Component }">
      <component :is="Component" :key="String(route.name ?? route.path)" />
    </RouterView>
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
