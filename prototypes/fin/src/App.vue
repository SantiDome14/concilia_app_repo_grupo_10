<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';
import AppShell from '@/components/layout/AppShell.vue';
import ManifestDialog from '@/components/manifest/ManifestDialog.vue';
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
  <!-- Single shared dialog instance per Requirement 9 (core-actions-manifest). -->
  <ManifestDialog />
  <Toaster position="bottom-right" theme="dark" :duration="4500" rich-colors />
</template>
