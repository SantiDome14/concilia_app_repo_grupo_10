import { ref, watch, type Ref } from 'vue';

// ════════════════════════════════════════════════════════════════════
// usePersistedPageSize — page-size selection persisted to localStorage
// ────────────────────────────────────────────────────────────────────
// Returns a ref the page-size selector binds to. Reads the initial
// value from `localStorage[key]` on first call; persists every change.
//
// Invalid stored values (non-integer, ≤ 0) fall back to the default.
// In environments without `localStorage` (SSR, tests with stripped
// globals) the composable becomes an in-memory ref — no crashes.
//
// Used by Clientes / future TRD lists. Keyed per-module so different
// surfaces remember their own preference.
// ════════════════════════════════════════════════════════════════════

const ALLOWED_PAGE_SIZES = [10, 25, 50, 100] as const;
type AllowedPageSize = (typeof ALLOWED_PAGE_SIZES)[number];

function isAllowedPageSize(value: number): value is AllowedPageSize {
  return (ALLOWED_PAGE_SIZES as readonly number[]).includes(value);
}

function readStored(key: string, fallback: AllowedPageSize): AllowedPageSize {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && isAllowedPageSize(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Quota exceeded / private mode — silently ignore. Page-size
    // persistence is a nice-to-have, not a correctness requirement.
  }
}

export function usePersistedPageSize(
  key: string,
  defaultPageSize: AllowedPageSize = 25,
): Ref<AllowedPageSize> {
  const pageSize = ref<AllowedPageSize>(readStored(key, defaultPageSize));

  watch(pageSize, (value) => {
    writeStored(key, value);
  });

  return pageSize;
}

export { ALLOWED_PAGE_SIZES, isAllowedPageSize, type AllowedPageSize };
