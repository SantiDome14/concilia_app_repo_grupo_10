import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES, ROUTE_PATHS } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Route definitions — core-trd
// ────────────────────────────────────────────────────────────────────
// Convention:
//   - One page component per route, lazy-loaded for code-splitting
//   - `meta.requiresAuth` controls auth guard behavior
//   - `meta.capabilities` (optional) enforces RBAC — handled by guards.ts
//   - `meta.breadcrumb` controls the label shown in the topbar
//   - `meta.block` is the parent section shown before the module label
//     in the breadcrumb. Omit for top-level cross-cutting routes.
//   - `meta.detail` (per `core-modals`) declares the canonical detail
//     surface — `'drawer'` for workflow-typed records (Solicitudes,
//     Alertas profile B), unset for centered modals.
//   - `meta.soon = true` marks placeholder modules rendered by
//     `ModuloSoon.vue` until their feature work lands.
//
// The four cross-cutting standard routes (Dashboard, Inbox, Alertas,
// Reportes) MUST stay registered per `core-modulo-genericos`. Apps MAY
// gate them via `meta.capabilities` but MUST NOT delete them.
//
// Domain modules land here as each `add-trd-*` change archives.
// Until then the only routes are the four generics + auth shell.
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
  // ─── Domain modules — Mesa de Dinero ───────────────────────────────
  {
    path: ROUTE_PATHS.QUOTES,
    name: ROUTE_NAMES.QUOTES,
    component: () => import('@/pages/Quotes.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Quotes',
      block: 'Mesa de Dinero',
    },
  },
  {
    path: ROUTE_PATHS.PROVEEDORES,
    name: ROUTE_NAMES.PROVEEDORES,
    component: () => import('@/pages/Proveedores.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Proveedores',
      block: 'Mesa de Dinero',
    },
  },
  // ─── Domain modules — Catálogos ────────────────────────────────────
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
      breadcrumb: 'Cliente',
      block: 'Catálogos',
    },
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/pages/NotFound.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
];
