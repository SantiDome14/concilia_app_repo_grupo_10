import { createPinia } from 'pinia';
import type { App } from 'vue';

export function setupPinia(app: App): void {
  const pinia = createPinia();
  app.use(pinia);
}
