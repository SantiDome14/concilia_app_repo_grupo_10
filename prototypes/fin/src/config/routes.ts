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
  VENTAS: '/ventas',
  COMPRAS: '/compras',
  // ─── Tesorería ───────────────────────────────────────────────────
  DISPONIBILIDADES: '/disponibilidades',
  COBROS: '/cobros',
  PAGOS: '/pagos',
  DEUDAS_PRESTAMOS: '/deudas-prestamos',
  INVERSIONES: '/inversiones',
  TIPO_CAMBIO: '/tipo-cambio',
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
  VENTAS: 'ventas',
  COMPRAS: 'compras',
  DISPONIBILIDADES: 'disponibilidades',
  COBROS: 'cobros',
  PAGOS: 'pagos',
  DEUDAS_PRESTAMOS: 'deudas-prestamos',
  INVERSIONES: 'inversiones',
  TIPO_CAMBIO: 'tipo-cambio',
  PLAN_CUENTAS: 'plan-cuentas',
  PARAMETRIZACIONES: 'parametrizaciones',
  LIBRO_DIARIO: 'libro-diario',
  NOT_FOUND: 'not-found',
} as const;

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
