import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════
// Typed, validated environment variables
// ────────────────────────────────────────────────────────────────────
// Use `env.VAR_NAME` everywhere instead of `import.meta.env.VITE_X`.
// Validation runs at module load — if a required var is missing or
// malformed, the app fails fast with a readable error at startup.
//
// Auth0 vars are optional: when empty, Auth0 plugin becomes a no-op
// and the app runs without authentication (useful for local dev and
// for the template's first run after cloning).
// ════════════════════════════════════════════════════════════════════

const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1).default('Ardua — Template'),
  VITE_APP_ENV: z.enum(['local', 'qa', 'production']).default('local'),

  VITE_API_BASE_URL: z.string().url().default('http://localhost:3000/api'),
  VITE_API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  /**
   * Toggles MSW (Mock Service Worker) — when `true`, the worker intercepts
   * every HTTP call leaving the app and responds with handlers defined in
   * `src/mocks/handlers/`. When `false`, no worker is registered and every
   * request flies to `VITE_API_BASE_URL`.
   *
   * Schema default is `'false'` (defensive: builds without an explicit
   * value go to the real backend). FIN ships `.env.local` with the flag
   * set to `'true'` so a freshly-cloned repo runs end-to-end without
   * any backend.
   */
  VITE_USE_MOCKS: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),

  VITE_AUTH0_DOMAIN: z.string().optional().default(''),
  VITE_AUTH0_CLIENT_ID: z.string().optional().default(''),
  VITE_AUTH0_AUDIENCE: z.string().optional().default(''),

  VITE_LAUNCHDARKLY_CLIENT_SIDE_ID: z.string().optional().default(''),

  VITE_FEATURE_I18N: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  VITE_FEATURE_LAUNCHDARKLY: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
});

type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[env] Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = parseEnv();

// Narrowed helpers for common checks
export const isProd = env.VITE_APP_ENV === 'production';
export const isQA = env.VITE_APP_ENV === 'qa';
export const isLocal = env.VITE_APP_ENV === 'local';
