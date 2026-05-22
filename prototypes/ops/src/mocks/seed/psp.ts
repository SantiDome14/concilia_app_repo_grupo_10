// ════════════════════════════════════════════════════════════════════
// MSW seed — PSP (Coinag / BIND / Banco de Comercio)
// ────────────────────────────────────────────────────────────────────
// Custodia Block · PSP is the sponsor-driven sub-account ledger: a
// Partner (Coinag / BIND / Banco de Comercio) provides a "CBU Padre"
// account that nests one CVU child per OPS client. The seed covers:
//
//   - `accountsSeed`        — CVU sub-accounts owned by clients
//   - `mismatchesSeed`      — reconciliation deltas per sponsor
//   - `sponsorBalancesSeed` — what each partner reports as balance
//   - Coinag health status (returned by the handler at request time)
//   - SWIFT transactions per account (drill-down drawer)
//
// Data shaped from the OPS-QA `/psp/accounts` and `/psp/home` screens
// captured 2026-05; client + tax_number pairs reused where they appear
// in `clientsSeed` so cross-page navigation lines up.
// ════════════════════════════════════════════════════════════════════

import type {
  PspAccount,
  ReconciliationMismatch,
  SponsorBalance,
  SwiftTransaction,
} from '@/ops/psp/types';

// ─── CBU-padre + CVU-hijos (Posición + Cuentas tabs) ───────────────
// `parent_cbu_id = null` → CBU-padre; otherwise CVU-hijo. Account
// numbers under each CBU share a structural prefix (e.g. 00028839...
// vs 00003894...) — that's how the operator distinguishes CBUs in the
// QA instance. CBU balances are redundant in the seed (the page sums
// the CVU children); we leave them at '0' so a mismatch never lies.

const CBU_COINAG_1 = 'psp-cbu-coinag-1';
const CBU_COINAG_2 = 'psp-cbu-coinag-2';
const CBU_BIND_1 = 'psp-cbu-bind-1';
const CBU_BANCO_DE_COMERCIO_1 = 'psp-cbu-bdc-1';

const initialAccounts: PspAccount[] = [
  // CBU-padre records — one per master CBU. COINAG has two distinct
  // CBUs (prefixes 0002883900... and 0000389400... in the QA data).
  {
    id: CBU_COINAG_1,
    account_number: '00028839000000000CBU1',
    currency: 'ARS',
    balance: '0',
    owner: null,
    status: 'ACTIVE',
    sponsor: 'COINAG',
    parent_cbu_id: null,
  },
  {
    id: CBU_COINAG_2,
    account_number: '00003894000000000CBU2',
    currency: 'ARS',
    balance: '0',
    owner: null,
    status: 'ACTIVE',
    sponsor: 'COINAG',
    parent_cbu_id: null,
  },
  {
    id: CBU_BIND_1,
    account_number: '00007000000000000CBU1',
    currency: 'ARS',
    balance: '0',
    owner: null,
    status: 'ACTIVE',
    sponsor: 'BIND',
    parent_cbu_id: null,
  },
  {
    id: CBU_BANCO_DE_COMERCIO_1,
    account_number: '00007500000000000CBU1',
    currency: 'ARS',
    balance: '0',
    owner: null,
    status: 'ACTIVE',
    sponsor: 'BANCO_DE_COMERCIO',
    parent_cbu_id: null,
  },
  // CVU-hijos (Cuentas tab + drives CBU rollup in Posición).
  {
    id: 'psp-acc-001',
    account_number: '0002883900000000001454',
    currency: 'ARS',
    balance: '3753423.07',
    owner: 'Ignacio Ramos',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001454',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-002',
    account_number: '0000389400000000000116',
    currency: 'ARS',
    balance: '1679405.00',
    owner: 'Grupo Negrete y Gil',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0000389400000000000116',
    parent_cbu_id: CBU_COINAG_2,
  },
  {
    id: 'psp-acc-003',
    account_number: '0002883900000000001164',
    currency: 'ARS',
    balance: '899718.00',
    owner: 'Santiago Montero',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001164',
    alias: 'monti123',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-004',
    account_number: '0002883900000000001430',
    currency: 'ARS',
    balance: '899000.00',
    owner: 'Santiago Montero',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001430',
    alias: 'valentinvila',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-005',
    account_number: '0002883900000000001157',
    currency: 'ARS',
    balance: '800000.00',
    owner: 'Santiago Montero',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001157',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-006',
    account_number: '0000389400000000000079',
    currency: 'ARS',
    balance: '476420.00',
    owner: 'Ing. Hilda Carbajal',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0000389400000000000079',
    parent_cbu_id: CBU_COINAG_2,
  },
  {
    id: 'psp-acc-007',
    account_number: '0000389400000000000093',
    currency: 'ARS',
    balance: '30619.61',
    owner: 'Martha Ofelia Perea Prado',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0000389400000000000093',
    parent_cbu_id: CBU_COINAG_2,
  },
  {
    id: 'psp-acc-008',
    account_number: '0002883900000000001119',
    currency: 'ARS',
    balance: '20000.00',
    owner: 'Abril Baca Nájera',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001119',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-009',
    account_number: '0002883900000000001416',
    currency: 'ARS',
    balance: '8512.00',
    owner: 'Manuel Gonzalez Lamensa',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0002883900000000001416',
    parent_cbu_id: CBU_COINAG_1,
  },
  {
    id: 'psp-acc-010',
    account_number: '0000389400000000000741',
    currency: 'ARS',
    balance: '8086.00',
    owner: 'Haz Pagos S.A.',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0000389400000000000741',
    parent_cbu_id: CBU_COINAG_2,
  },
  {
    id: 'psp-acc-011',
    account_number: '0000389400000000000307',
    currency: 'ARS',
    balance: '2000.00',
    owner: 'Benito Federico Madrid Carranza',
    status: 'ACTIVE',
    sponsor: 'COINAG',
    cvu: '0000389400000000000307',
    parent_cbu_id: CBU_COINAG_2,
  },
  // BIND — sponsor structurally listed; lighter coverage than COINAG.
  {
    id: 'psp-acc-012',
    account_number: '0000700000000000001234',
    currency: 'ARS',
    balance: '125000.00',
    owner: 'Santiago Montero',
    status: 'ACTIVE',
    sponsor: 'BIND',
    cvu: '0000700000000000001234',
    parent_cbu_id: CBU_BIND_1,
  },
  {
    id: 'psp-acc-013',
    account_number: '0000700000000000005678',
    currency: 'ARS',
    balance: '45000.00',
    owner: 'Manuel Gonzalez Lamensa',
    status: 'ACTIVE',
    sponsor: 'BIND',
    cvu: '0000700000000000005678',
    parent_cbu_id: CBU_BIND_1,
  },
  // Banco de Comercio — single test record.
  {
    id: 'psp-acc-014',
    account_number: '0000750000000000000099',
    currency: 'ARS',
    balance: '100000.00',
    owner: 'Camila Nicole Cattaneo',
    status: 'ACTIVE',
    sponsor: 'BANCO_DE_COMERCIO',
    cvu: '0000750000000000000099',
    alias: 'cami-comercio',
    parent_cbu_id: CBU_BANCO_DE_COMERCIO_1,
  },
];

// ─── Reconciliation snapshot ────────────────────────────────────────
// Coinag shows a surplus (api > db) per the QA screenshot. BIND + BdC
// stay reconciled in this seed so the per-sponsor health chip can show
// the "OK" state for those structural sponsors.

const initialMismatches: ReconciliationMismatch[] = [
  {
    sponsor: 'COINAG',
    db_balance: '8578642.00',
    api_balance: '9860530.00',
    difference: '1281888.00',
    checked_at: '2026-05-21T10:00:00Z',
  },
];

// ─── Sponsor balances ───────────────────────────────────────────────
// What each Partner reports as the live balance of its CBU Padre.

const initialSponsorBalances: SponsorBalance[] = [
  {
    sponsor: 'COINAG',
    balance: '9860530.00',
    checked_at: '2026-05-21T10:00:00Z',
    currency: 'ARS',
  },
  {
    sponsor: 'BIND',
    balance: '170000.00',
    checked_at: '2026-05-21T10:00:00Z',
    currency: 'ARS',
  },
  {
    sponsor: 'BANCO_DE_COMERCIO',
    balance: '100000.00',
    checked_at: '2026-05-21T10:00:00Z',
    currency: 'ARS',
  },
];

// ─── SWIFT transactions per account (drill-down drawer) ─────────────
// Only a couple of accounts have SWIFT history; the rest return empty.
// Keyed by `accountId` for O(1) lookup in the handler.

const initialSwiftByAccount: Record<string, SwiftTransaction[]> = {
  'psp-acc-001': [
    {
      id: 'swift-001',
      date: '2026-05-10',
      message_type: 'MT103',
      amount: '50000.00',
      currency: 'USD',
      counterparty: 'Acme Trading LLC',
      status: 'COMPLETED',
    },
    {
      id: 'swift-002',
      date: '2026-04-22',
      message_type: 'MT103',
      amount: '25000.00',
      currency: 'USD',
      counterparty: 'Acme Trading LLC',
      status: 'COMPLETED',
    },
  ],
  'psp-acc-003': [
    {
      id: 'swift-003',
      date: '2026-05-05',
      message_type: 'MT202',
      amount: '12000.00',
      currency: 'USD',
      counterparty: 'Convera Bank',
      status: 'PENDING',
    },
  ],
};

export const accountsSeed: PspAccount[] = initialAccounts.map((a) => ({ ...a }));
export const mismatchesSeed: ReconciliationMismatch[] = initialMismatches.map((m) => ({
  ...m,
}));
export const sponsorBalancesSeed: SponsorBalance[] = initialSponsorBalances.map((b) => ({
  ...b,
}));
export const swiftByAccountSeed: Record<string, SwiftTransaction[]> = JSON.parse(
  JSON.stringify(initialSwiftByAccount),
);

export function resetPspSeed(): void {
  accountsSeed.length = 0;
  accountsSeed.push(...initialAccounts.map((a) => ({ ...a })));
  mismatchesSeed.length = 0;
  mismatchesSeed.push(...initialMismatches.map((m) => ({ ...m })));
  sponsorBalancesSeed.length = 0;
  sponsorBalancesSeed.push(...initialSponsorBalances.map((b) => ({ ...b })));
  for (const k of Object.keys(swiftByAccountSeed)) delete swiftByAccountSeed[k];
  Object.assign(swiftByAccountSeed, JSON.parse(JSON.stringify(initialSwiftByAccount)));
}
