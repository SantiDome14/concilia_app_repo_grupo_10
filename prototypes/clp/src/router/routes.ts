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
  // NOTE: Template-only example modules (Módulo A/B/C) are NOT registered
  // in derived apps — they live in _core-template-frontend only as reference for
  // AI agents and developers. See _core-template-frontend/MIGRATION-PLAYBOOK.md
  // "App derivation cleanup". Domain modules for this app land here as
  // their migrations are scoped.
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/pages/NotFound.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
];
