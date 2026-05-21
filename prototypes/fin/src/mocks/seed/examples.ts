// ════════════════════════════════════════════════════════════════════
// MSW seed data — in-memory mutable store
// ────────────────────────────────────────────────────────────────────
// Handlers under `./handlers/` import these arrays and mutate them in
// place (push on create, splice on delete, assign on update) so the UI
// observes CRUD round-trips end-to-end with no backend.
//
// Lifetime: the seed lives for the lifetime of the worker, which means
// a full page refresh resets everything back to `initialExamples`. This
// is intentional — prototypes value reproducibility over persistence.
//
// Derived apps replace / extend this file with their own seeds (one per
// domain or split into sub-files; the handler is the only consumer).
// ════════════════════════════════════════════════════════════════════

import type { ExampleRecord } from '@/types/models';

const initialExamples: ExampleRecord[] = [
  {
    id: 'ex_001',
    date: '2026-05-02',
    name: 'Onboarding KYC — Acme S.A.',
    category: 'Tipo 1',
    value: 1_250_000,
    status: 'ACTIVE',
  },
  {
    id: 'ex_002',
    date: '2026-05-04',
    name: 'Renovación de mandato — Globex Ltda.',
    category: 'Tipo 2',
    value: 480_500,
    status: 'PENDING',
  },
  {
    id: 'ex_003',
    date: '2026-05-07',
    name: 'Conciliación bancaria abril',
    category: 'Tipo 1',
    value: 92_300,
    status: 'ACTIVE',
  },
  {
    id: 'ex_004',
    date: '2026-05-09',
    name: 'Alta de proveedor — Initech',
    category: 'Tipo 3',
    value: 18_750,
    status: 'INACTIVE',
  },
  {
    id: 'ex_005',
    date: '2026-05-11',
    name: 'Devolución FX USD/CLP — Stark Industries',
    category: 'Tipo 2',
    value: 3_400_000,
    status: 'PENDING',
  },
  {
    id: 'ex_006',
    date: '2026-05-14',
    name: 'Pago directo nómina mayo',
    category: 'Tipo 1',
    value: 5_780_120,
    status: 'ACTIVE',
  },
  {
    id: 'ex_007',
    date: '2026-05-16',
    name: 'Auditoría operatoria — Wayne Enterprises',
    category: 'Tipo 3',
    value: 250_000,
    status: 'INACTIVE',
  },
];

// Mutated in-place by handlers. Exported as `let` so `resetSeed()` can
// reassign it; consumers MUST read it as `examplesSeed` (not destructure).
export let examplesSeed: ExampleRecord[] = [...initialExamples];

/**
 * Restore the seed to its initial state. Intended for test setups and
 * for a future "Reset mocks" dev affordance — handlers themselves never
 * call this.
 */
export function resetSeed(): void {
  examplesSeed = [...initialExamples];
}
