// ════════════════════════════════════════════════════════════════════
// MSW seed — clients (ops-clients capability)
// ────────────────────────────────────────────────────────────────────
// Source data anonymised from the OPS-QA instance (2026-05). The seed
// holds the full `ClientWithAccounts` shape; the LIST handler projects
// it down to the slim `Client` row shape consumed by the master grid.
//
// Coverage:
//   - portal status: ACTIVE / PENDING / not-created (empty)
//   - tax_number: Argentine CUIT (11-digit), legacy alphanumeric ids,
//     missing (older legacy records)
//   - accounts: multi-currency with bound instructions; single-currency;
//     newly opened (zero balance, no instructions)
//   - movements: rich (10+), modest, empty
// ════════════════════════════════════════════════════════════════════

import type {
  AccountInstruction,
  ClientWithAccounts,
  CurrencyEntry,
} from '@/ops/clients/types';

// ─── Currency catalog ───────────────────────────────────────────────
// `code` is the 3-letter compact code rendered in the badge; `name`
// is the full label used in dropdowns and account-row text.

const initialCurrencies: CurrencyEntry[] = [
  { id: 'cur-ars', code: 'ARS', name: 'ARS' },
  { id: 'cur-usd', code: 'USD', name: 'USD' },
  { id: 'cur-usdt', code: 'USD', name: 'USDT' },
  { id: 'cur-usdc', code: 'USD', name: 'USDC' },
  { id: 'cur-eurc', code: 'EUR', name: 'EURC' },
  { id: 'cur-btc', code: 'BTC', name: 'BTC' },
  { id: 'cur-cuo', code: 'CUO', name: 'CUOTAPARTE' },
];

export const currenciesSeed: CurrencyEntry[] = [...initialCurrencies];

// ─── Account-number factory ─────────────────────────────────────────
// Mirrors the legacy convention `{docketNumeric}{currencyName}{3digits}`,
// e.g. docket AS010007 + ARS + suffix 328 → `010007ARS328`.

function accountNumber(docket: string, currencyName: string, suffix: string): string {
  const numeric = docket.replace(/^AS/, '');
  return `${numeric}${currencyName}${suffix}`;
}

// Helper to find a currency by 3-letter compact code or name.
function currency(name: string) {
  const found = initialCurrencies.find(
    (c) => c.name === name || c.code === name,
  );
  if (!found) throw new Error(`[clients seed] unknown currency: ${name}`);
  return { id: found.id, name: found.name };
}

// ─── Instruction factories ──────────────────────────────────────────

function cvuInstruction(
  id: string,
  holder: string,
  taxNumber: string,
  cvuCode: string,
  aliasSuffix: string,
): AccountInstruction {
  return {
    id,
    instruction_name: 'CVU Cuenta Vista',
    operations_provider_name: 'COINAG',
    fields: [
      { key: 'cvu', display: 'CVU', value: cvuCode },
      { key: 'alias', display: 'Alias', value: `arduasolutions.${aliasSuffix}.ars` },
      { key: 'titular', display: 'Titular', value: holder },
      { key: 'cuit', display: 'CUIT', value: taxNumber },
    ],
    rails: ['CVU', 'BIND'],
  };
}

function cuotaparteInstruction(
  id: string,
  fundCode: string,
  taxNumber: string,
): AccountInstruction {
  return {
    id,
    instruction_name: 'Cuotaparte Money Market',
    operations_provider_name: null,
    fields: [
      { key: 'fund_id', display: 'Fondo', value: fundCode },
      { key: 'cuit', display: 'CUIT', value: taxNumber },
    ],
    rails: ['ALYC'],
  };
}

// ─── Seed data ──────────────────────────────────────────────────────
// Four records anonymised from the QA instance plus four representative
// list-only variations (Cuenta Pendiente, Cuenta Validada, missing-CUIT,
// company name).

const initial: ClientWithAccounts[] = [
  // 1. Multi-currency individual with rich movement history.
  {
    id: '08107ec1-dc98-4b18-90f9-81e05e9fe415',
    name: 'Manuel Gonzalez Lamensa',
    email: 'manulamensa@gmail.com',
    tax_number: '20416466506',
    docket: 'AS010007',
    is_active: true,
    external_client_id: '010007',
    metadata: { status: '' },
    accounts: [
      {
        id: 'acc-010007-ars',
        account_number: accountNumber('AS010007', 'ARS', '328'),
        balance: '8512',
        currency: currency('ARS'),
        instructions: [
          cvuInstruction(
            'ai-010007-ars-01',
            'Manuel Gonzalez Lamensa',
            '20416466506',
            '0000003100007ARS3289',
            'AS010007',
          ),
        ],
      },
      {
        id: 'acc-010007-usdt',
        account_number: accountNumber('AS010007', 'USDT', '690'),
        balance: '0',
        currency: currency('USDT'),
        instructions: [],
      },
      {
        id: 'acc-010007-eurc',
        account_number: accountNumber('AS010007', 'EURC', '406'),
        balance: '0',
        currency: currency('EURC'),
        instructions: [],
      },
      {
        id: 'acc-010007-cpt',
        account_number: accountNumber('AS010007', 'CPT', '151'),
        balance: '0',
        currency: currency('CUOTAPARTE'),
        instructions: [
          cuotaparteInstruction('ai-010007-cpt-01', 'AS-MM-007', '20416466506'),
        ],
      },
      {
        id: 'acc-010007-btc',
        account_number: accountNumber('AS010007', 'BTC', '320'),
        balance: '0',
        currency: currency('BTC'),
        instructions: [],
      },
      {
        id: 'acc-010007-usdc',
        account_number: accountNumber('AS010007', 'USDC', '176'),
        balance: '0',
        currency: currency('USDC'),
        instructions: [],
      },
    ],
    movements: [
      {
        id: 'mov-010007-01',
        date: '2026-05-12',
        counterparty_name: 'SANTIAGO MONTERO',
        type: 'TRANSFER_IN',
        amount: '12',
        currency_id: 'cur-ars',
      },
      { id: 'mov-010007-02', date: '2026-04-17', counterparty_name: null, type: 'FEE', amount: '7.97', currency_id: 'cur-ars' },
      {
        id: 'mov-010007-03',
        date: '2026-04-17',
        counterparty_name: 'MANUEL GONZALEZ LAMENSA',
        type: 'WITHDRAWAL',
        amount: '22.03',
        currency_id: 'cur-ars',
      },
      { id: 'mov-010007-04', date: '2026-04-17', counterparty_name: null, type: 'TRANSFER_IN', amount: '50', currency_id: 'cur-ars' },
      { id: 'mov-010007-05', date: '2026-04-10', counterparty_name: 'CIRCUIT PAY SA', type: 'DEPOSIT', amount: '1000', currency_id: 'cur-ars' },
      { id: 'mov-010007-06', date: '2026-04-08', counterparty_name: null, type: 'FEE', amount: '3.5', currency_id: 'cur-ars' },
      { id: 'mov-010007-07', date: '2026-04-05', counterparty_name: 'HAZ PAGOS SA', type: 'TRANSFER_OUT', amount: '500', currency_id: 'cur-ars' },
      { id: 'mov-010007-08', date: '2026-04-01', counterparty_name: 'PABLO NICOLAS PIERONI', type: 'TRANSFER_IN', amount: '2500', currency_id: 'cur-ars' },
      { id: 'mov-010007-09', date: '2026-03-28', counterparty_name: null, type: 'INT_DEPOSIT', amount: '4.12', currency_id: 'cur-ars' },
      { id: 'mov-010007-10', date: '2026-03-25', counterparty_name: 'BRIDGE PAGOS', type: 'DEPOSIT', amount: '5000', currency_id: 'cur-ars' },
    ],
  },

  // 2. Legacy alphanumeric tax (foreign-style id), single ARS account.
  {
    id: '086c0e25-20b4-42be-a88c-c23c708ef49f',
    name: 'Magdalena Ivonne Domínguez Esquibel',
    email: 'nicolaspieroni@yahoo.com.ar',
    tax_number: 'BP9023RJRAFG',
    docket: 'AS005461',
    is_active: true,
    external_client_id: '005461',
    metadata: { status: '' },
    accounts: [
      {
        id: 'acc-005461-ars',
        account_number: accountNumber('AS005461', 'ARS', '479'),
        balance: '78',
        currency: currency('ARS'),
        instructions: [
          cvuInstruction(
            'ai-005461-ars-01',
            'Magdalena Ivonne Domínguez Esquibel',
            'BP9023RJRAFG',
            '0000003100005ARS4799',
            'AS005461',
          ),
        ],
      },
    ],
    movements: [
      { id: 'mov-005461-01', date: '2026-03-19', counterparty_name: 'SANTIAGO MONTERO', type: 'INT_DEPOSIT', amount: '68', currency_id: 'cur-ars' },
      { id: 'mov-005461-02', date: '2026-03-06', counterparty_name: 'CIRCUIT PAY SA', type: 'TRANSFER_OUT', amount: '7500000', currency_id: 'cur-ars' },
      { id: 'mov-005461-03', date: '2026-03-06', counterparty_name: 'PABLO NICOLAS PIERONI', type: 'DEPOSIT', amount: '3500000', currency_id: 'cur-ars' },
      { id: 'mov-005461-04', date: '2026-03-06', counterparty_name: 'PABLO NICOLAS PIERONI', type: 'DEPOSIT', amount: '4000000', currency_id: 'cur-ars' },
    ],
  },

  // 3. Newly opened, no movements yet, no whitelist binding.
  {
    id: '394f5a34-cd4a-4069-9550-11e10e0eb730',
    name: 'EZEQUIEL FELZENSZTEIN',
    email: null,
    tax_number: '8765432',
    docket: 'AS010015',
    is_active: true,
    external_client_id: '010015',
    metadata: { status: '' },
    accounts: [
      {
        id: 'acc-010015-usdt',
        account_number: accountNumber('AS010015', 'USDT', '222'),
        balance: '0',
        currency: currency('USDT'),
        instructions: [],
      },
      {
        id: 'acc-010015-btc',
        account_number: accountNumber('AS010015', 'BTC', '366'),
        balance: '0',
        currency: currency('BTC'),
        instructions: [],
      },
      {
        id: 'acc-010015-eurc',
        account_number: accountNumber('AS010015', 'EURC', '640'),
        balance: '0',
        currency: currency('EURC'),
        instructions: [],
      },
      {
        id: 'acc-010015-usdc',
        account_number: accountNumber('AS010015', 'USDC', '981'),
        balance: '0',
        currency: currency('USDC'),
        instructions: [],
      },
    ],
    movements: [],
  },

  // 4. Company entity, mixed currencies + cuotaparte binding.
  {
    id: 'add90acc-e694-4e05-a360-ca87a953f360',
    name: 'RANDOM WORLD S. A.',
    email: null,
    tax_number: '30710969619',
    docket: 'AS010003',
    is_active: true,
    external_client_id: '010003',
    metadata: { status: '' },
    accounts: [
      {
        id: 'acc-010003-btc',
        account_number: accountNumber('AS010003', 'BTC', '253'),
        balance: '0',
        currency: currency('BTC'),
        instructions: [],
      },
      {
        id: 'acc-010003-usdt',
        account_number: accountNumber('AS010003', 'USDT', '455'),
        balance: '0',
        currency: currency('USDT'),
        instructions: [],
      },
      {
        id: 'acc-010003-ars',
        account_number: accountNumber('AS010003', 'ARS', '714'),
        balance: '500',
        currency: currency('ARS'),
        instructions: [
          cvuInstruction(
            'ai-010003-ars-01',
            'RANDOM WORLD S. A.',
            '30710969619',
            '0000003100003ARS7144',
            'AS010003',
          ),
        ],
      },
      {
        id: 'acc-010003-usdc',
        account_number: accountNumber('AS010003', 'USDC', '685'),
        balance: '0',
        currency: currency('USDC'),
        instructions: [],
      },
      {
        id: 'acc-010003-cpt',
        account_number: accountNumber('AS010003', 'CPT', '194'),
        balance: '0',
        currency: currency('CUOTAPARTE'),
        instructions: [
          cuotaparteInstruction('ai-010003-cpt-01', 'AS-MM-003', '30710969619'),
        ],
      },
      {
        id: 'acc-010003-eurc',
        account_number: accountNumber('AS010003', 'EURC', '565'),
        balance: '0',
        currency: currency('EURC'),
        instructions: [],
      },
    ],
    movements: [
      { id: 'mov-010003-01', date: '2026-04-01', counterparty_name: 'HAZ PAGOS SA', type: 'DEPOSIT', amount: '13.4114', currency_id: 'cur-ars' },
    ],
  },

  // 5. PENDING portal validation, individual.
  {
    id: 'b1f5a72c-3a8b-4d61-9c0e-2a4bcdef0011',
    name: 'Santiago Montero',
    email: 'monterosantiago2001@gmail.com',
    tax_number: '20434043531',
    docket: 'AS012010',
    is_active: true,
    external_client_id: '012010',
    metadata: { status: 'PENDING' },
    accounts: [
      {
        id: 'acc-012010-ars',
        account_number: accountNumber('AS012010', 'ARS', '742'),
        balance: '2400',
        currency: currency('ARS'),
        instructions: [],
      },
    ],
    movements: [
      { id: 'mov-012010-01', date: '2026-05-10', counterparty_name: 'BRIDGE PAGOS', type: 'DEPOSIT', amount: '2400', currency_id: 'cur-ars' },
    ],
  },

  // 6. PENDING portal validation, company.
  {
    id: 'c4928f1d-7b2c-4e08-8d5a-9f3045678022',
    name: 'Club Corrales-Ortiz',
    email: 'nicogutik@gmail.com',
    tax_number: 'U1GH6LSN670C',
    docket: 'AS018221',
    is_active: true,
    external_client_id: '018221',
    metadata: { status: 'PENDING' },
    accounts: [
      {
        id: 'acc-018221-ars',
        account_number: accountNumber('AS018221', 'ARS', '503'),
        balance: '125000',
        currency: currency('ARS'),
        instructions: [],
      },
      {
        id: 'acc-018221-usdt',
        account_number: accountNumber('AS018221', 'USDT', '108'),
        balance: '0',
        currency: currency('USDT'),
        instructions: [],
      },
    ],
    movements: [
      { id: 'mov-018221-01', date: '2026-05-08', counterparty_name: 'PABLO NICOLAS PIERONI', type: 'TRANSFER_IN', amount: '125000', currency_id: 'cur-ars' },
    ],
  },

  // 7. ACTIVE portal — fully onboarded individual.
  {
    id: 'd7cfb930-2e1f-46a9-b0a3-5e87ab234033',
    name: 'Camila Nicole Cattaneo',
    email: 'cattaneocamila@gmail.com',
    tax_number: '27419154704',
    docket: 'AS009842',
    is_active: true,
    external_client_id: '009842',
    metadata: { status: 'ACTIVE' },
    accounts: [
      {
        id: 'acc-009842-ars',
        account_number: accountNumber('AS009842', 'ARS', '611'),
        balance: '450000',
        currency: currency('ARS'),
        instructions: [
          cvuInstruction(
            'ai-009842-ars-01',
            'Camila Nicole Cattaneo',
            '27419154704',
            '0000003100009ARS6112',
            'AS009842',
          ),
        ],
      },
      {
        id: 'acc-009842-usdt',
        account_number: accountNumber('AS009842', 'USDT', '274'),
        balance: '1240',
        currency: currency('USDT'),
        instructions: [],
      },
    ],
    movements: [
      { id: 'mov-009842-01', date: '2026-05-15', counterparty_name: 'CIRCUIT PAY SA', type: 'DEPOSIT', amount: '450000', currency_id: 'cur-ars' },
      { id: 'mov-009842-02', date: '2026-05-02', counterparty_name: 'HAZ PAGOS SA', type: 'TRANSFER_IN', amount: '1240', currency_id: 'cur-usdt' },
    ],
  },

  // 8. Legacy record without CUIT or email — represents the historical
  // imports the operator team still needs to surface.
  {
    id: 'e0a14b25-5f8a-4d3b-9e4c-6a89cdef1044',
    name: 'Eduardo Contreras Villalpando',
    email: null,
    tax_number: null,
    docket: 'AS003120',
    is_active: true,
    external_client_id: '003120',
    metadata: null,
    accounts: [],
    movements: [],
  },
];

export const clientsSeed: ClientWithAccounts[] = initial.map(cloneClient);

export function resetClientsSeed(): void {
  clientsSeed.length = 0;
  clientsSeed.push(...initial.map(cloneClient));
  currenciesSeed.length = 0;
  currenciesSeed.push(...initialCurrencies);
}

// Defensive deep clone so mutations from one test don't bleed into the
// next. The shape is JSON-safe, so structuredClone (when available) or
// a JSON round-trip both work.
function cloneClient(c: ClientWithAccounts): ClientWithAccounts {
  if (typeof structuredClone === 'function') return structuredClone(c);
  return JSON.parse(JSON.stringify(c)) as ClientWithAccounts;
}
