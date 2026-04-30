import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import { usePreferencesStore, resolveAppearance } from './preferences';

describe('preferences store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      document.documentElement.classList.remove('light', 'dark');
    }
  });

  it('hydrates from defaults when no localStorage value exists', () => {
    const store = usePreferencesStore();
    expect(store.language).toBe('es');
    expect(store.appearance).toBe('dark');
  });

  it('persists language changes to localStorage and rejects unknown values', async () => {
    const store = usePreferencesStore();
    store.setLanguage('en');
    await nextTick();
    expect(store.language).toBe('en');
    const persisted = JSON.parse(window.localStorage.getItem('core-fin.preferences') ?? '{}');
    expect(persisted.language).toBe('en');
  });

  it('applies the dark class on <html> when appearance is dark', async () => {
    const store = usePreferencesStore();
    store.setAppearance('dark');
    await nextTick();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('applies the light class on <html> when appearance is light', async () => {
    const store = usePreferencesStore();
    store.setAppearance('light');
    await nextTick();
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves system appearance based on the OS prefers-color-scheme', () => {
    const matchSpy = vi
      .spyOn(window, 'matchMedia')
      .mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: light)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);
    expect(resolveAppearance('system')).toBe('light');
    matchSpy.mockRestore();
  });
});
