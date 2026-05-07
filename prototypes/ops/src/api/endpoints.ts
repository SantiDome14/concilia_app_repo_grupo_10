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

  // Add more resources here: auth, users, ...
} as const;
