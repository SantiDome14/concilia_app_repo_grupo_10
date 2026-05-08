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
  // ─── Domain modules (template examples) ────────────────────────────
  {
    path: ROUTE_PATHS.MODULO_A,
    name: ROUTE_NAMES.MODULO_A,
    component: () => import('@/pages/ModuloA.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Módulo A',
      block: 'Bloque 1',
    },
  },
  {
    path: ROUTE_PATHS.MODULO_B,
    name: ROUTE_NAMES.MODULO_B,
    component: () => import('@/pages/ModuloB.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Módulo B',
      block: 'Bloque 2',
    },
  },
  {
    path: ROUTE_PATHS.MODULO_C,
    name: ROUTE_NAMES.MODULO_C,
    component: () => import('@/pages/ModuloC.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Módulo C',
      block: 'Bloque 2',
    },
  },
  // ─── OPS domain modules ────────────────────────────────────────────
  {
    path: ROUTE_PATHS.INSTRUCTIONS,
    name: ROUTE_NAMES.INSTRUCTIONS,
    component: () => import('@/pages/Instructions.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Instrucciones',
      block: 'Configuración',
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
      block: 'Operaciones',
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
      block: 'Operaciones',
    },
  },
  // Legacy /users path absorbed into /clients per ops-clients Requirement 11.
  {
    path: '/users',
    redirect: (to) => ({ path: ROUTE_PATHS.CLIENTS, query: to.query }),
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
  // ─── Component playground (dev mode only — kept registered always
  //     so the route works even when Sidebar visibility is gated; the
  //     entry in the sidebar checks `import.meta.env.DEV`). ─────────
  {
    path: ROUTE_PATHS.PLAYGROUND_FORMS,
    name: ROUTE_NAMES.PLAYGROUND_FORMS,
    component: () => import('@/pages/playground/PlaygroundForms.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Forms',
      block: 'Componentes',
    },
  },
  {
    path: ROUTE_PATHS.PLAYGROUND_CHARTS,
    name: ROUTE_NAMES.PLAYGROUND_CHARTS,
    component: () => import('@/pages/playground/PlaygroundCharts.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Charts',
      block: 'Componentes',
    },
  },
  {
    path: ROUTE_PATHS.PLAYGROUND_LAYOUT,
    name: ROUTE_NAMES.PLAYGROUND_LAYOUT,
    component: () => import('@/pages/playground/PlaygroundLayoutDemos.vue'),
    meta: {
      requiresAuth: true,
      layout: 'shell',
      breadcrumb: 'Layout',
      block: 'Componentes',
    },
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: () => import('@/pages/NotFound.vue'),
    meta: { requiresAuth: false, layout: 'blank' },
  },
];
