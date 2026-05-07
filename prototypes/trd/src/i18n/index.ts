import type { App } from 'vue';
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';

// ════════════════════════════════════════════════════════════════════
// i18n (opt-in)
// ────────────────────────────────────────────────────────────────────
// Activated by VITE_FEATURE_I18N=true. Dynamic-imported from main.ts
// to keep the bundle clean when disabled.
// ════════════════════════════════════════════════════════════════════

export function setupI18n(app: App): void {
  const i18n = createI18n({
    legacy: false,
    locale: 'es',
    fallbackLocale: 'en',
    messages: { en, es },
  });
  app.use(i18n);
}
