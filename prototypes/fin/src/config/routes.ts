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
  // ─── Back Office ─────────────────────────────────────────────────
  MOVIMIENTOS: '/movimientos',
  COTIZACIONES: '/cotizaciones',
  COMPRAS: '/compras',
  // ─── Tesorería ───────────────────────────────────────────────────
  TESORERIA: '/tesoreria',
  COBROS: '/cobros',
  PAGOS: '/pagos',
  DEUDAS_PRESTAMOS: '/deudas-prestamos',
  INVERSIONES: '/inversiones',
  MONEDAS: '/monedas',
  // ─── Contabilidad ────────────────────────────────────────────────
  PLAN_CUENTAS: '/plan-cuentas',
  PARAMETRIZACIONES: '/parametrizaciones',
  LIBRO_DIARIO: '/libro-diario',
  NOT_FOUND: '/:pathMatch(.*)*',
} as const;

export const ROUTE_NAMES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  INBOX: 'inbox',
  ALERTAS: 'alertas',
  REPORTES: 'reportes',
  MOVIMIENTOS: 'movimientos',
  COTIZACIONES: 'cotizaciones',
  COMPRAS: 'compras',
  TESORERIA: 'tesoreria',
  COBROS: 'cobros',
  PAGOS: 'pagos',
  DEUDAS_PRESTAMOS: 'deudas-prestamos',
  INVERSIONES: 'inversiones',
  MONEDAS: 'monedas',
  PLAN_CUENTAS: 'plan-cuentas',
  PARAMETRIZACIONES: 'parametrizaciones',
  LIBRO_DIARIO: 'libro-diario',
  NOT_FOUND: 'not-found',
} as const;

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
