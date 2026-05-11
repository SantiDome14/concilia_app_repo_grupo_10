import { afterEach } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';

// ════════════════════════════════════════════════════════════════════
// Vitest setup
// ────────────────────────────────────────────────────────────────────
// Auto-unmounts Vue Test Utils wrappers after each test.
// Extend here with global mocks, polyfills, or custom matchers.
// ════════════════════════════════════════════════════════════════════

enableAutoUnmount(afterEach);
