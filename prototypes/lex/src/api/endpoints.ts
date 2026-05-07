// ════════════════════════════════════════════════════════════════════
// API endpoint constants
// ────────────────────────────────────────────────────────────────────
// Centralized endpoint paths grouped by resource. Never hardcode a URL
// in a module — always reference through here.
// ════════════════════════════════════════════════════════════════════

export const ENDPOINTS = {
  example: {
    list: '/examples',
    detail: (id: string) => `/examples/${id}`,
    create: '/examples',
    update: (id: string) => `/examples/${id}`,
    delete: (id: string) => `/examples/${id}`,
  },
  // Add more resources here: auth, users, ...
} as const;
