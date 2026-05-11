import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

// ════════════════════════════════════════════════════════════════════
// Preferences store — language + appearance
// ────────────────────────────────────────────────────────────────────
// Two user-level preferences for the first cut of Settings:
//   - language    — 'es' | 'en' (mirrors the available i18n locales)
//   - appearance  — 'system' | 'light' | 'dark'
//                   'system' follows `prefers-color-scheme`. The
//                   resolved value is applied as a class on <html>.
//
// Persistence: localStorage under a single namespaced key. The store
// hydrates from storage on creation and writes-through on every set.
// ════════════════════════════════════════════════════════════════════

export type Language = 'es' | 'en';
export type Appearance = 'system' | 'light' | 'dark';

export interface PreferencesShape {
  language: Language;
  appearance: Appearance;
}

const STORAGE_KEY = 'core-fin.preferences';
const DEFAULTS: PreferencesShape = { language: 'es', appearance: 'dark' };

function readStorage(): PreferencesShape {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PreferencesShape>;
    return {
      language: parsed.language === 'en' ? 'en' : 'es',
      appearance:
        parsed.appearance === 'light' || parsed.appearance === 'system'
          ? parsed.appearance
          : 'dark',
    };
  } catch {
    return DEFAULTS;
  }
}

function writeStorage(value: PreferencesShape): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private mode failures
  }
}

/** Resolves the appearance preference to the actual theme class name. */
export function resolveAppearance(value: Appearance): 'light' | 'dark' {
  if (value === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return value;
}

export const usePreferencesStore = defineStore('preferences', () => {
  const initial = readStorage();
  const language = ref<Language>(initial.language);
  const appearance = ref<Appearance>(initial.appearance);

  /** Actual applied theme — `'light'` or `'dark'`, derived from
   *  appearance + the OS preference when `appearance === 'system'`. */
  const resolvedAppearance = computed(() => resolveAppearance(appearance.value));

  function setLanguage(value: Language): void {
    language.value = value;
  }

  function setAppearance(value: Appearance): void {
    appearance.value = value;
  }

  // Persist + apply <html> class on every change.
  watch(
    [language, appearance],
    () => {
      writeStorage({ language: language.value, appearance: appearance.value });
      applyHtmlClass(resolvedAppearance.value);
    },
    { immediate: true },
  );

  // Watch the OS scheme so `appearance === 'system'` tracks live.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener?.('change', () => {
      if (appearance.value === 'system') {
        applyHtmlClass(resolvedAppearance.value);
      }
    });
  }

  return {
    language,
    appearance,
    resolvedAppearance,
    setLanguage,
    setAppearance,
  };
});

function applyHtmlClass(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}
