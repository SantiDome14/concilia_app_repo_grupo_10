// ════════════════════════════════════════════════════════════════════
// Route path constants
// ────────────────────────────────────────────────────────────────────
// Single source of truth for route paths. Use these in:
//   - router/routes.ts (route definitions)
//   - <RouterLink :to="ROUTE_PATHS.DASHBOARD">
//   - programmatic navigation: router.push(ROUTE_PATHS.LOGIN)
// Never hardcode a path string outside this file.
// ════════════════════════════════════════════════════════════════════

export const ROUTE_PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/',
  // Cross-cutting standard modules (per `core-modulo-genericos`).
  INBOX: '/inbox',
  ALERTAS: '/alertas',
  REPORTES: '/reportes',
  // Domain modules (template examples).
  MODULO_A: '/modulo-a',
  MODULO_B: '/modulo-b',
  MODULO_C: '/modulo-c',
  // OPS domain modules (per `ops-instructions` capability + future siblings).
  INSTRUCTIONS: '/instructions',
  // Component playground (dev mode only — gated in Sidebar by import.meta.env.DEV).
  PLAYGROUND_FORMS: '/playground/forms',
  PLAYGROUND_CHARTS: '/playground/charts',
  PLAYGROUND_LAYOUT: '/playground/layout',
  NOT_FOUND: '/:pathMatch(.*)*',
} as const;

export const ROUTE_NAMES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  INBOX: 'inbox',
  ALERTAS: 'alertas',
  REPORTES: 'reportes',
  MODULO_A: 'modulo-a',
  MODULO_B: 'modulo-b',
  MODULO_C: 'modulo-c',
  INSTRUCTIONS: 'instructions',
  PLAYGROUND_FORMS: 'playground-forms',
  PLAYGROUND_CHARTS: 'playground-charts',
  PLAYGROUND_LAYOUT: 'playground-layout',
  NOT_FOUND: 'not-found',
} as const;

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
