import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Route definitions — core-fin
// ────────────────────────────────────────────────────────────────────
// Convention:
//   - One page component per route, lazy-loaded for code-splitting
//   - `meta.requiresAuth` controls auth guard behavior
//   - `meta.capabilities` (optional) enforces RBAC — handled by guards.ts
//   - `meta.breadcrumb` controls the label shown in the topbar
//   - `meta.block` is the parent section shown before the module label
//     in the breadcrumb (e.g. "Back Office / Operaciones"). Omit only
//     for top-level cross-cutting routes.
//   - `meta.detail` (per `core-modals`) declares the canonical detail
//     surface — `'drawer'` for workflow-typed records (Solicitudes,
//     Alertas profile B), unset for centered modals.
//   - `meta.soon = true` marks placeholder modules rendered by
//     `ModuloSoon.vue` until their feature work lands.
//
// The four cross-cutting standard routes (Dashboard, Inbox, Alertas,
// Reportes) MUST stay registered per `core-modulo-genericos`.
// ════════════════════════════════════════════════════════════════════

export const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.LOGIN,
    name: ROUTE_NAMES.LOGIN,
    component: () => import('@/pages/Login.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
  // ─── Cross-cutting standard modules (generics) ─────────────────────
  {
    path: ROUTE_PATHS.DASHBOARD,
    name: ROUTE_NAMES.DASHBOARD,
    component: () => import('@/pages/Dashboard.vue'),
    meta: { requiresAuth: true, layout: 'shell', breadcrumb: 'Dashboard' },
  },
  {
    path: ROUTE_PATHS.INBOX,
    name: ROUTE_NAMES.INBOX,
    component: () => import('@/pages/Inbox.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Inbox',
      detail: 'drawer',
    },
  },
  {
    path: ROUTE_PATHS.ALERTAS,
    name: ROUTE_NAMES.ALERTAS,
    component: () => import('@/pages/Alertas.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Alertas',
      detail: 'drawer',
    },
  },
  {
    path: ROUTE_PATHS.REPORTES,
    name: ROUTE_NAMES.REPORTES,
    component: () => import('@/pages/Reportes.vue'),
    meta: { requiresAuth: true, layout: 'shell', breadcrumb: 'Reportes' },
  },
  // ─── Back Office ───────────────────────────────────────────────────
  {
    path: ROUTE_PATHS.MOVIMIENTOS,
    name: ROUTE_NAMES.MOVIMIENTOS,
    component: () => import('@/pages/Movimientos.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Movimientos',
      block: 'Back Office',
    },
  },
  {
    path: ROUTE_PATHS.COTIZACIONES,
    name: ROUTE_NAMES.COTIZACIONES,
    component: () => import('@/pages/Cotizaciones.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Cotizaciones',
      block: 'Back Office',
    },
  },
  {
    path: ROUTE_PATHS.COMPRAS,
    name: ROUTE_NAMES.COMPRAS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Compras',
      block: 'Back Office',
      soon: true,
    },
  },
  // ─── Tesorería ─────────────────────────────────────────────────────
  {
    path: ROUTE_PATHS.TESORERIA,
    name: ROUTE_NAMES.TESORERIA,
    component: () => import('@/pages/Tesoreria.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Disponibilidades',
      block: 'Tesorería',
    },
  },
  {
    path: ROUTE_PATHS.COBROS,
    name: ROUTE_NAMES.COBROS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Cobros',
      block: 'Tesorería',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.PAGOS,
    name: ROUTE_NAMES.PAGOS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Pagos',
      block: 'Tesorería',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.DEUDAS_PRESTAMOS,
    name: ROUTE_NAMES.DEUDAS_PRESTAMOS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Deudas / Préstamos',
      block: 'Tesorería',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.INVERSIONES,
    name: ROUTE_NAMES.INVERSIONES,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Inversiones',
      block: 'Tesorería',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.MONEDAS,
    name: ROUTE_NAMES.MONEDAS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Monedas',
      block: 'Tesorería',
      soon: true,
    },
  },
  // ─── Contabilidad ──────────────────────────────────────────────────
  {
    path: ROUTE_PATHS.PLAN_CUENTAS,
    name: ROUTE_NAMES.PLAN_CUENTAS,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Plan de Cuentas',
      block: 'Contabilidad',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.PARAMETRIZACIONES,
    name: ROUTE_NAMES.PARAMETRIZACIONES,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Parametrizaciones',
      block: 'Contabilidad',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.LIBRO_DIARIO,
    name: ROUTE_NAMES.LIBRO_DIARIO,
    component: () => import('@/pages/ModuloSoon.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Libro Diario',
      block: 'Contabilidad',
      soon: true,
    },
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/pages/NotFound.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
];
