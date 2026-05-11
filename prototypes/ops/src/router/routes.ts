import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Route definitions
// ────────────────────────────────────────────────────────────────────
// Convention:
//   - One page component per route, lazy-loaded for code-splitting
//   - `meta.requiresAuth` controls auth guard behavior
//   - `meta.capabilities` (optional) enforces RBAC — handled by guards.ts
//   - `meta.breadcrumb` controls the label shown in the topbar
//   - `meta.block` (optional) is the parent section shown before the
//     module label in the breadcrumb (e.g. "Bloque 1 / Módulo A").
//     Omit for top-level pages like Home.
//   - `meta.detail` (per `core-modals`) declares the canonical detail
//     surface — `'drawer'` for workflow-typed records (Solicitudes,
//     Alertas profile B), unset for centered modals.
//
// The four cross-cutting standard routes (Dashboard, Inbox, Alertas,
// Reportes) MUST stay registered per `core-modulo-genericos`. Apps MAY
// gate them via `meta.capabilities` but MUST NOT delete them.
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
  // NOTE: Template-only example modules (Módulo A/B/C) and the component
  // playground are NOT registered in derived apps — they live in
  // _core-template-frontend only as reference for AI agents and developers. See
  // _core-template-frontend/MIGRATION-PLAYBOOK.md "App derivation cleanup".
  // ─── OPS domain modules ────────────────────────────────────────────
  {
    path: ROUTE_PATHS.INSTRUCTIONS,
    name: ROUTE_NAMES.INSTRUCTIONS,
    component: () => import('@/pages/Instructions.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Instrucciones',
      block: 'Catálogos',
    },
  },
  // Legacy URL absorbed into the new /instructions surface.
  // Per ops-instructions Requirement 1.
  {
    path: '/settings/instructions',
    redirect: ROUTE_PATHS.INSTRUCTIONS,
  },
  {
    path: '/settings/instructions/:id',
    redirect: (to) => ({
      path: ROUTE_PATHS.INSTRUCTIONS,
      query: { edit: String(to.params.id) },
    }),
  },
  {
    path: '/settings/instructions/:id/view',
    redirect: (to) => ({
      path: ROUTE_PATHS.INSTRUCTIONS,
      query: { detail: String(to.params.id) },
    }),
  },
  // ops-clients: master list + detail page.
  {
    path: ROUTE_PATHS.CLIENTS,
    name: ROUTE_NAMES.CLIENTS,
    component: () => import('@/pages/Clients.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Clientes',
      block: 'Catálogos',
    },
  },
  {
    path: ROUTE_PATHS.CLIENT_DETAIL,
    name: ROUTE_NAMES.CLIENT_DETAIL,
    component: () => import('@/pages/ClientDetail.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Detalle del cliente',
      block: 'Catálogos',
    },
  },
  // Legacy /users path absorbed into /clients per ops-clients Requirement 11.
  {
    path: '/users',
    redirect: (to) => ({ path: ROUTE_PATHS.CLIENTS, query: to.query }),
  },
  // ops-psp: PSP module with 3 internal tabs (Disponibilidad / Movimientos / Cuentas).
  {
    path: ROUTE_PATHS.PSP,
    name: ROUTE_NAMES.PSP,
    component: () => import('@/pages/Psp.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'PSP',
      block: 'Custodia',
    },
  },
  // Legacy PSP routes absorbed per ops-psp Requirement 2.
  {
    path: '/psp/home',
    redirect: (to) => ({
      path: ROUTE_PATHS.PSP,
      query: { ...to.query, tab: 'movimientos' },
    }),
  },
  {
    path: '/psp/accounts',
    redirect: (to) => ({
      path: ROUTE_PATHS.PSP,
      query: { ...to.query, tab: 'cuentas' },
    }),
  },
  // ops-movimientos: top-level page (split from former ops-financial-dashboard).
  {
    path: ROUTE_PATHS.MOVIMIENTOS,
    name: ROUTE_NAMES.MOVIMIENTOS,
    component: () => import('@/pages/Movimientos.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Movimientos',
      block: 'Operaciones',
    },
  },
  // ops-cotizaciones: top-level page (split from former ops-financial-dashboard).
  {
    path: ROUTE_PATHS.COTIZACIONES,
    name: ROUTE_NAMES.COTIZACIONES,
    component: () => import('@/pages/Cotizaciones.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Cotizaciones',
      block: 'Operaciones',
    },
  },
  // ops-banks-accounts: master catalog of Sociedad → Estructura → Cuenta.
  {
    path: ROUTE_PATHS.BANKS_ACCOUNTS,
    name: ROUTE_NAMES.BANKS_ACCOUNTS,
    component: () => import('@/pages/BanksAccounts.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Bancos / Cuentas',
      block: 'Catálogos',
    },
  },
  // Legacy /dashboard + /financial-dashboard redirect to the split surfaces
  // per `refactor-ops-dashboard-into-movimientos-cotizaciones`. The bare `/`
  // stays owned by the generic Dashboard from `core-modulo-genericos`.
  {
    path: '/dashboard',
    redirect: (to) => ({ path: ROUTE_PATHS.MOVIMIENTOS, query: to.query }),
  },
  {
    path: '/financial-dashboard',
    redirect: (to) => {
      // Drop the obsolete `?tab=activity|quotes`; map quotes → /cotizaciones,
      // anything else → /movimientos.
      const tab = typeof to.query.tab === 'string' ? to.query.tab : '';
      const next = { ...to.query };
      delete next.tab;
      return tab === 'quotes'
        ? { path: ROUTE_PATHS.COTIZACIONES, query: next }
        : { path: ROUTE_PATHS.MOVIMIENTOS, query: next };
    },
  },
  // Legacy account-instruction wizard URL absorbed into the detail modal
  // per ops-account-instructions Requirement 1.
  {
    path: '/clients/:id/instructions/create',
    redirect: (to) => ({
      path: `/clients/${String(to.params.id)}`,
      query: { ...to.query, createInstruction: '1' },
    }),
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/pages/NotFound.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
];
