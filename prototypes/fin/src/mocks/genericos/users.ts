// ════════════════════════════════════════════════════════════════════
// Mock users — owner_name resolution + current user
// ────────────────────────────────────────────────────────────────────
// Seed data for the empty new app. Real apps replace these by reading
// from their auth provider + user directory.
// ════════════════════════════════════════════════════════════════════

export interface MockUser {
  id: string;
  name: string;
  initials: string;
  role: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: 'u-1', name: 'Yasmani Rodríguez', initials: 'YR', role: 'admin' },
  { id: 'u-2', name: 'María González', initials: 'MG', role: 'analyst' },
  { id: 'u-3', name: 'Juan Pérez', initials: 'JP', role: 'reviewer' },
  { id: 'u-4', name: 'Sistema', initials: 'SY', role: 'system' },
  { id: 'u-5', name: 'Lucía Fernández', initials: 'LF', role: 'analyst' },
];

export const CURRENT_USER: MockUser = MOCK_USERS[0]!;

export function findUser(id: string | null | undefined): MockUser | undefined {
  if (!id) return undefined;
  return MOCK_USERS.find((u) => u.id === id);
}
