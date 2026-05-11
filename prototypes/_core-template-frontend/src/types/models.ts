// ════════════════════════════════════════════════════════════════════
// Domain models
// ────────────────────────────────────────────────────────────────────
// Each app replaces/extends these with its own domain entities.
// Kept minimal as a reference shape.
// ════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  capabilities: string[];
}

/** Common status enum used across domain entities — apps extend as needed. */
export type RecordStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';

/** Reference shape for the Example page's records. */
export interface ExampleRecord {
  id: string;
  date: string;
  name: string;
  category: 'Tipo 1' | 'Tipo 2' | 'Tipo 3';
  value: number;
  status: RecordStatus;
}
