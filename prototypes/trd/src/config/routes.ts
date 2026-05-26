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
  // Mesa de Dinero
  QUOTES: '/quotes',
  PROVEEDORES: '/proveedores',
  // Catálogos
  CLIENTS: '/clients',
  CLIENT_DETAIL: '/clients/:id',
  INSIGHTS: '/insights',
  NOT_FOUND: '/:pathMatch(.*)*',
} as const;

export const ROUTE_NAMES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  INBOX: 'inbox',
  ALERTAS: 'alertas',
  REPORTES: 'reportes',
  QUOTES: 'quotes',
  PROVEEDORES: 'proveedores',
  CLIENTS: 'clients',
  CLIENT_DETAIL: 'client-detail',
  INSIGHTS: 'insights',
  NOT_FOUND: 'not-found',
} as const;

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
