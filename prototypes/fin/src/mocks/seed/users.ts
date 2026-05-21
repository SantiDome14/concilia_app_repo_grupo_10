// ════════════════════════════════════════════════════════════════════
// MSW seed — users
// ────────────────────────────────────────────────────────────────────
// Identity directory consumed by `GET /users` and `GET /users/me`.
// The first entry is treated as "the current user" by the /me handler;
// derived apps replace this when wiring real auth.
// ════════════════════════════════════════════════════════════════════

import type { UserProfile } from '@/types/models';

const initial: UserProfile[] = [
  { id: 'u-1', name: 'Yasmani Rodríguez', initials: 'YR', role: 'admin' },
  { id: 'u-2', name: 'María González', initials: 'MG', role: 'analyst' },
  { id: 'u-3', name: 'Juan Pérez', initials: 'JP', role: 'reviewer' },
  { id: 'u-4', name: 'Sistema', initials: 'SY', role: 'system' },
  { id: 'u-5', name: 'Lucía Fernández', initials: 'LF', role: 'analyst' },
];

export let usersSeed: UserProfile[] = [...initial];

export function resetUsersSeed(): void {
  usersSeed = [...initial];
}
