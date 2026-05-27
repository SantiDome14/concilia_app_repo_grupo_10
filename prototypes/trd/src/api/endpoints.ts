// ════════════════════════════════════════════════════════════════════
// API endpoint constants
// ────────────────────────────────────────────────────────────────────
// Centralized endpoint paths grouped by resource. Never hardcode a URL
// in a module — always reference through here. Every group has a
// matching MSW handler array under `src/mocks/handlers/`.
// ════════════════════════════════════════════════════════════════════

export const ENDPOINTS = {
  example: {
    list: '/examples',
    detail: (id: string) => `/examples/${id}`,
    create: '/examples',
    update: (id: string) => `/examples/${id}`,
    delete: (id: string) => `/examples/${id}`,
  },

  // ─── Identity ───────────────────────────────────────────────
  users: {
    list: '/users',
    me: '/users/me',
  },

  // ─── Cross-cutting standard modules (core-modulo-genericos) ─
  dashboardKpis: {
    list: '/dashboard-kpis',
  },

  solicitudes: {
    list: '/solicitudes',
    detail: (id: string) => `/solicitudes/${id}`,
    create: '/solicitudes',
    update: (id: string) => `/solicitudes/${id}`,
  },

  alertas: {
    list: '/alertas',
    detail: (id: string) => `/alertas/${id}`,
    update: (id: string) => `/alertas/${id}`,
  },

  reports: {
    list: '/reports',
    detail: (id: string) => `/reports/${id}`,
    update: (id: string) => `/reports/${id}`,
    // Distinct top-level path so the `/reports/:id` handler doesn't
    // catch /reports/categories as `id='categories'`.
    categories: '/report-categories',
    runs: {
      list: '/report-runs',
      detail: (id: string) => `/report-runs/${id}`,
      create: '/report-runs',
    },
  },

  // ─── TRD — Catálogos / Clientes ────────────────────────────
  clients: {
    list: '/clients',
    detail: (id: string) => `/clients/${id}`,
    limits: (id: string) => `/clients/${id}/limits`,
    balances: (id: string) => `/clients/${id}/balances`,
  },

  // ─── TRD — Mesa de Dinero / Quotes ─────────────────────────
  quotes: {
    list: '/quotes',
    detail: (id: string) => `/quotes/${id}`,
    create: '/quotes',
    update: (id: string) => `/quotes/${id}`,
    activities: (id: string) => `/quotes/${id}/activities`,
    attachments: {
      list: (quoteId: string) => `/quotes/${quoteId}/attachments`,
      create: (quoteId: string) => `/quotes/${quoteId}/attachments`,
      update: (quoteId: string, attachmentId: string) =>
        `/quotes/${quoteId}/attachments/${attachmentId}`,
      delete: (quoteId: string, attachmentId: string) =>
        `/quotes/${quoteId}/attachments/${attachmentId}`,
    },
  },

  // ─── TRD — Mesa de Dinero / Proveedores de Liquidez ────────
  liquidity: {
    list: '/liquidity-operations',
    detail: (id: string) => `/liquidity-operations/${id}`,
    activities: (id: string) => `/liquidity-operations/${id}/activities`,
    providers: '/providers',
  },

  // ─── TRD — Catálogos / Alertas de precio (price-trigger rules) ─
  // NOTE: legacy backend is `VITE_TRADING_API_BASE_URL` (separate
  // Lambda). For the prototype the single apiClient intercepts via
  // MSW; promotion to real backend uses single-client + per-module
  // base-URL config per MIGRATION-NOTES §15 Decision A.
  priceAlerts: {
    list: '/alerts',
    detail: (id: string) => `/alerts/${id}`,
    create: '/alerts',
    update: (id: string) => `/alerts/${id}`,
    delete: (id: string) => `/alerts/${id}`,
  },

  // ─── FIN — Tesorería / Disponibilidades ────────────────────
  fin: {
    posicion: {
      tree: '/fin/posicion',
      kpis: '/fin/posicion/kpis',
    },
    movimientos: {
      list: '/fin/movimientos',
      kpis: '/fin/movimientos/kpis',
    },
    cola: {
      list: '/fin/cola',
      update: (id: string) => `/fin/cola/${id}`,
    },
    sociedades: '/fin/sociedades',
    monedas: '/fin/monedas',
  },

  // ─── File-upload examples ───────────────────────────────────
  // Canonical shape for any resource that accepts uploads:
  //   - `presignedUrls`: phase 1 (request)
  //   - `confirm`:        phase 3 (persist metadata)
  // Batch-import resources additionally expose:
  //   - `createJob`:      phase 3 (kick off async parsing)
  //   - `jobStatus(id)`:  phase 4 (poll until terminal)
  // The keys are fixed; the path strings are app-specific.

  documents: {
    presignedUrls: '/documents/presigned-urls',
    confirm: '/documents/confirm',
  },

  swiftImport: {
    presignedUrls: '/swift/presigned-urls',
    confirm: '/swift/confirm',
    createJob: '/swift/jobs',
    jobStatus: (id: string) => `/swift/jobs/${id}`,
  },
} as const;
