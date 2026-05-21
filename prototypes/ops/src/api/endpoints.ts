// ════════════════════════════════════════════════════════════════════
// API endpoint constants
// ────────────────────────────────────────────────────────────────────
// Centralized endpoint paths grouped by resource. Never hardcode a URL
// in a module — always reference through here. Every group has a
// matching MSW handler array under `src/mocks/handlers/`.
//
// Some paths intentionally overlap (e.g. `instructions.list` and
// `accountInstructions.templates` both hit `/instruction`; `movimientos.list`
// and `psp.movements` both hit `/movements`). The legacy backend serves
// them through a single endpoint; the MSW handlers route by domain.
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

  // ─── OPS — Operations ──────────────────────────────────────
  accountInstructions: {
    templates: '/instruction',
    templateAttributes: (id: string) => `/instruction-attribute/instruction/${id}`,
    rails: '/rails',
    create: '/account-instruction',
  },

  banksAccounts: {
    list: '/banks-accounts',
    createStructure: '/banks-accounts/structures',
    createAccount: '/banks-accounts',
    updateAccount: (id: string) => `/banks-accounts/${id}`,
    sociedades: '/banks-accounts/sociedades',
    structures: '/banks-accounts/structures',
  },

  clients: {
    list: '/clients',
    detail: (id: string) => `/clients/${id}`,
    signUp: '/sign-up',
    whitelistAccount: (id: string) => `/clients/${id}/whitelist-account`,
    validateCvu: (cvu: string) => `/coinag/account/${encodeURIComponent(cvu)}`,
    currencies: '/currencies',
    confirmationLetter: (instructionId: string) =>
      `/account-instruction/${instructionId}/confirmation-letter`,
  },

  trades: {
    quotes: '/quotes',
  },

  instructions: {
    list: '/instruction',
    detail: (id: string) => `/instruction/${id}`,
    attributes: (id: string) => `/instruction-attribute/instruction/${id}`,
    saveAttributes: '/instruction-attribute/save-all',
  },

  movimientos: {
    list: '/movements',
    detail: (id: string) => `/movements/${id}`,
    receipt: (id: string) => `/receipt/${id}`,
  },

  psp: {
    health: '/coinag/health',
    reconciliation: '/balance-reconciliation',
    movements: '/movements',
    accounts: '/accounts',
    swiftTransactionsForAccount: (accountId: string) =>
      `/accounts/${accountId}/swift-transactions`,
  },

  statements: {
    create: '/statement',
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
