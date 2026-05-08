<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { usePreferencesStore, type Language } from '@/stores/preferences';
import AppearanceToggle from './AppearanceToggle.vue';

// ════════════════════════════════════════════════════════════════════
// <GeneralTab> — Settings · General
// ────────────────────────────────────────────────────────────────────
// First section: Preferences (language + appearance). Future sections
// (Account, Notifications, Security, Integrations) live as siblings.
// ════════════════════════════════════════════════════════════════════

const prefs = usePreferencesStore();
const { language, appearance } = storeToRefs(prefs);

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

function onLanguageChange(value: string): void {
  if (value === 'es' || value === 'en') prefs.setLanguage(value);
}
</script>

<template>
  <div class="flex flex-col gap-6" data-testid="settings-general">
    <section class="flex flex-col gap-4">
      <h3 class="text-sm font-bold tracking-tight text-t-1">Preferences</h3>

      <!-- Language -->
      <div
        class="flex items-center justify-between gap-4 rounded-md border border-b-1 bg-card-2 px-4 py-3"
        data-testid="settings-language-row"
      >
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-t-1">Idioma</span>
          <span class="text-xs text-t-3">
            Idioma de la interfaz. Toma efecto en la próxima recarga.
          </span>
        </div>
        <Select
          :model-value="language"
          @update:model-value="onLanguageChange($event as string)"
        >
          <SelectTrigger class="w-[180px]" data-testid="settings-language-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in LANGUAGES" :key="l.value" :value="l.value">
              {{ l.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Appearance -->
      <div
        class="flex items-center justify-between gap-4 rounded-md border border-b-1 bg-card-2 px-4 py-3"
        data-testid="settings-appearance-row"
      >
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-t-1">Apariencia</span>
          <span class="text-xs text-t-3">
            Tema de la aplicación. "Sistema" sigue la preferencia del navegador.
          </span>
        </div>
        <AppearanceToggle
          :model-value="appearance"
          @update:model-value="prefs.setAppearance"
        />
      </div>
    </section>
  </div>
</template>
