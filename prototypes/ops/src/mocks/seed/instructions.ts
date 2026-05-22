// ════════════════════════════════════════════════════════════════════
// MSW seed — instructions + account-instructions (shared backend)
// ────────────────────────────────────────────────────────────────────
// The legacy backend serves the SAME `/instruction` and
// `/instruction-attribute/instruction/:id` endpoints to both the
// `ops-instructions` capability (template editor in /settings) and
// `ops-account-instructions` (bind-template-to-account wizard). To
// avoid the two MSW handlers diverging this file is the single source
// of truth for templates + attributes. Each attribute carries the union
// of the fields the two consumers need (`value`, `display`,
// `default_value`, `index_order`) so neither client has to normalise.
//
// Source: OPS-QA instance (2026-05) — schema and example values
// captured from the in-app screenshots; placeholder copy where the
// instance contained client data.
// ════════════════════════════════════════════════════════════════════

import type { Instruction, InstructionAttribute } from '@/ops/instructions/types';
import type { Rail } from '@/ops/account-instructions/types';

/**
 * Union shape stored in the seed. Handlers project to the consumer's
 * expected type (Instruction vs InstructionTemplate; InstructionAttribute
 * vs TemplateAttribute) — the extra fields are simply ignored.
 */
export interface SeedAttribute {
  id: string;
  instruction_id: string;
  key: string;
  /** Human label rendered by the account-instructions wizard. */
  display: string;
  /** Default value used when binding (supports `{docket}` / `{name}` /
   *  `{tax_number}` literals — substitution happens client-side). */
  default_value: string;
  /** Value stored in the instructions-editor row (free text). */
  value: string;
  index_order: number;
}

const now = '2026-05-01T12:00:00Z';

const initialInstructions: Instruction[] = [
  {
    id: 'tpl-adcap-cuotaparte',
    name: 'ADCAP CUOTAPARTE',
    provider: 'ADCAP',
    currency_id: 'cur-cuo',
    description: 'Suscripción a cuotapartes ADCAP (fund_id por sociedad).',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 3,
  },
  {
    id: 'tpl-bind-pesos',
    name: 'BIND PESOS',
    provider: 'BIND',
    currency_id: 'cur-ars',
    description: 'Transferencia CVU BIND ARS para clientes con onboarding completo.',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 5,
  },
  {
    id: 'tpl-coinag-pesos',
    name: 'COINAG PESOS',
    provider: 'Coinag',
    currency_id: 'cur-ars',
    description: 'Transferencia CBU/CVU Coinag ARS (CBU padre por sponsor).',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 5,
  },
  {
    id: 'tpl-banco-de-comercio-pesos',
    name: 'BANCO DE COMERCIO PESOS',
    provider: 'BANCO DE COMERCIO',
    currency_id: 'cur-ars',
    description: 'Transferencia CBU/CVU Banco de Comercio ARS.',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 5,
  },
  {
    id: 'tpl-lead-bank-usd',
    name: 'LEAD BANK USD',
    provider: 'LEAD BANK',
    currency_id: 'cur-usd',
    description: 'SWIFT/Fedwire saliente Lead Bank USD (ABA + account number).',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 5,
  },
  {
    id: 'tpl-convera-usdc',
    name: 'CONVERA USDC',
    provider: 'CONVERA',
    currency_id: 'cur-usdc',
    description: 'Liquidación Convera USDC contra cuentas espejo de clientes.',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 4,
  },
  {
    id: 'tpl-bridge-usdc',
    name: 'BRIDGE USDC',
    provider: 'BRIDGE',
    currency_id: 'cur-usdc',
    description: 'On-chain payout Bridge USDC (wallet + network).',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 3,
  },
  {
    id: 'tpl-circle-usdc',
    name: 'CIRCLE USDC',
    provider: 'CIRCLE',
    currency_id: 'cur-usdc',
    description: 'Mint/redeem Circle USDC — onboarding en curso, todavía sin pasar QA.',
    status: 'DRAFT',
    created_at: now,
    updated_at: now,
    attributes_count: 3,
  },
  {
    id: 'tpl-bitgo-btc',
    name: 'BITGO BTC',
    provider: 'BITGO',
    currency_id: 'cur-btc',
    description: 'Custodia BitGo BTC — archivado tras la migración a la cold-wallet propia.',
    status: 'INACTIVE',
    created_at: now,
    updated_at: now,
    attributes_count: 3,
  },
];

const initialAttributes: SeedAttribute[] = [
  // ADCAP CUOTAPARTE
  {
    id: 'attr-adcap-01',
    instruction_id: 'tpl-adcap-cuotaparte',
    key: 'fund_id',
    display: 'Fondo',
    default_value: 'AS-MM-{docket}',
    value: 'AS-MM-{docket}',
    index_order: 0,
  },
  {
    id: 'attr-adcap-02',
    instruction_id: 'tpl-adcap-cuotaparte',
    key: 'tax_id',
    display: 'CUIT/CUIL',
    default_value: '{tax_number}',
    value: '{tax_number}',
    index_order: 1,
  },
  {
    id: 'attr-adcap-03',
    instruction_id: 'tpl-adcap-cuotaparte',
    key: 'beneficiario',
    display: 'Beneficiario',
    default_value: '{name}',
    value: '{name}',
    index_order: 2,
  },

  // BIND PESOS
  {
    id: 'attr-bind-01',
    instruction_id: 'tpl-bind-pesos',
    key: 'account_type',
    display: 'Cuenta',
    default_value: 'CVU',
    value: 'CVU',
    index_order: 0,
  },
  {
    id: 'attr-bind-02',
    instruction_id: 'tpl-bind-pesos',
    key: 'bank',
    display: 'Banco',
    default_value: 'BIND',
    value: 'BIND',
    index_order: 1,
  },
  {
    id: 'attr-bind-03',
    instruction_id: 'tpl-bind-pesos',
    key: 'account_number',
    display: 'CBU/CVU',
    default_value: '',
    value: '',
    index_order: 2,
  },
  {
    id: 'attr-bind-04',
    instruction_id: 'tpl-bind-pesos',
    key: 'label',
    display: 'Alias',
    default_value: 'arduasolutions.{docket}.ars',
    value: 'arduasolutions.{docket}.ars',
    index_order: 3,
  },
  {
    id: 'attr-bind-05',
    instruction_id: 'tpl-bind-pesos',
    key: 'tax_id',
    display: 'CUIT/CUIL',
    default_value: '{tax_number}',
    value: '{tax_number}',
    index_order: 4,
  },

  // COINAG PESOS (matches the on-screen detail view)
  {
    id: 'attr-coinag-01',
    instruction_id: 'tpl-coinag-pesos',
    key: 'account_type',
    display: 'Cuenta',
    default_value: 'Normal',
    value: 'Normal',
    index_order: 0,
  },
  {
    id: 'attr-coinag-02',
    instruction_id: 'tpl-coinag-pesos',
    key: 'bank',
    display: 'Banco',
    default_value: 'coinag banco',
    value: 'coinag banco',
    index_order: 1,
  },
  {
    id: 'attr-coinag-03',
    instruction_id: 'tpl-coinag-pesos',
    key: 'account_number',
    display: 'CBU/CVU',
    default_value: '',
    value: '',
    index_order: 2,
  },
  {
    id: 'attr-coinag-04',
    instruction_id: 'tpl-coinag-pesos',
    key: 'label',
    display: 'Alias',
    default_value: '',
    value: '',
    index_order: 3,
  },
  {
    id: 'attr-coinag-05',
    instruction_id: 'tpl-coinag-pesos',
    key: 'tax_id',
    display: 'CUIT/CUIL',
    default_value: '{tax_number}',
    value: '{tax_number}',
    index_order: 4,
  },

  // BANCO DE COMERCIO PESOS
  {
    id: 'attr-bdc-01',
    instruction_id: 'tpl-banco-de-comercio-pesos',
    key: 'account_type',
    display: 'Cuenta',
    default_value: 'CBU',
    value: 'CBU',
    index_order: 0,
  },
  {
    id: 'attr-bdc-02',
    instruction_id: 'tpl-banco-de-comercio-pesos',
    key: 'bank',
    display: 'Banco',
    default_value: 'Banco de Comercio',
    value: 'Banco de Comercio',
    index_order: 1,
  },
  {
    id: 'attr-bdc-03',
    instruction_id: 'tpl-banco-de-comercio-pesos',
    key: 'account_number',
    display: 'CBU',
    default_value: '',
    value: '',
    index_order: 2,
  },
  {
    id: 'attr-bdc-04',
    instruction_id: 'tpl-banco-de-comercio-pesos',
    key: 'label',
    display: 'Alias',
    default_value: 'arduasolutions.{docket}.ars',
    value: 'arduasolutions.{docket}.ars',
    index_order: 3,
  },
  {
    id: 'attr-bdc-05',
    instruction_id: 'tpl-banco-de-comercio-pesos',
    key: 'tax_id',
    display: 'CUIT/CUIL',
    default_value: '{tax_number}',
    value: '{tax_number}',
    index_order: 4,
  },

  // LEAD BANK USD
  {
    id: 'attr-lead-01',
    instruction_id: 'tpl-lead-bank-usd',
    key: 'bank',
    display: 'Banco',
    default_value: 'Lead Bank',
    value: 'Lead Bank',
    index_order: 0,
  },
  {
    id: 'attr-lead-02',
    instruction_id: 'tpl-lead-bank-usd',
    key: 'aba',
    display: 'ABA',
    default_value: '101019644',
    value: '101019644',
    index_order: 1,
  },
  {
    id: 'attr-lead-03',
    instruction_id: 'tpl-lead-bank-usd',
    key: 'account_number',
    display: 'Account Number',
    default_value: '',
    value: '',
    index_order: 2,
  },
  {
    id: 'attr-lead-04',
    instruction_id: 'tpl-lead-bank-usd',
    key: 'account_holder',
    display: 'Account Holder',
    default_value: '{name}',
    value: '{name}',
    index_order: 3,
  },
  {
    id: 'attr-lead-05',
    instruction_id: 'tpl-lead-bank-usd',
    key: 'reference',
    display: 'Reference',
    default_value: '{docket}',
    value: '{docket}',
    index_order: 4,
  },

  // CONVERA USDC
  {
    id: 'attr-convera-01',
    instruction_id: 'tpl-convera-usdc',
    key: 'account_holder',
    display: 'Account Holder',
    default_value: 'Convera Trust Account',
    value: 'Convera Trust Account',
    index_order: 0,
  },
  {
    id: 'attr-convera-02',
    instruction_id: 'tpl-convera-usdc',
    key: 'account_number',
    display: 'Account Number',
    default_value: '',
    value: '',
    index_order: 1,
  },
  {
    id: 'attr-convera-03',
    instruction_id: 'tpl-convera-usdc',
    key: 'swift_bic',
    display: 'SWIFT/BIC',
    default_value: 'CONVUS33',
    value: 'CONVUS33',
    index_order: 2,
  },
  {
    id: 'attr-convera-04',
    instruction_id: 'tpl-convera-usdc',
    key: 'reference',
    display: 'Reference',
    default_value: '{docket}-{name}',
    value: '{docket}-{name}',
    index_order: 3,
  },

  // BRIDGE USDC
  {
    id: 'attr-bridge-01',
    instruction_id: 'tpl-bridge-usdc',
    key: 'network',
    display: 'Network',
    default_value: 'POLYGON',
    value: 'POLYGON',
    index_order: 0,
  },
  {
    id: 'attr-bridge-02',
    instruction_id: 'tpl-bridge-usdc',
    key: 'wallet_address',
    display: 'Wallet Address',
    default_value: '',
    value: '',
    index_order: 1,
  },
  {
    id: 'attr-bridge-03',
    instruction_id: 'tpl-bridge-usdc',
    key: 'reference',
    display: 'Reference',
    default_value: '{docket}',
    value: '{docket}',
    index_order: 2,
  },

  // CIRCLE USDC (DRAFT — onboarding)
  {
    id: 'attr-circle-01',
    instruction_id: 'tpl-circle-usdc',
    key: 'network',
    display: 'Network',
    default_value: 'ETH',
    value: 'ETH',
    index_order: 0,
  },
  {
    id: 'attr-circle-02',
    instruction_id: 'tpl-circle-usdc',
    key: 'wallet_address',
    display: 'Wallet Address',
    default_value: '',
    value: '',
    index_order: 1,
  },
  {
    id: 'attr-circle-03',
    instruction_id: 'tpl-circle-usdc',
    key: 'reference',
    display: 'Reference',
    default_value: '{docket}',
    value: '{docket}',
    index_order: 2,
  },

  // BITGO BTC (INACTIVE — legacy custody)
  {
    id: 'attr-bitgo-01',
    instruction_id: 'tpl-bitgo-btc',
    key: 'network',
    display: 'Network',
    default_value: 'BTC',
    value: 'BTC',
    index_order: 0,
  },
  {
    id: 'attr-bitgo-02',
    instruction_id: 'tpl-bitgo-btc',
    key: 'wallet_address',
    display: 'Wallet Address',
    default_value: '',
    value: '',
    index_order: 1,
  },
  {
    id: 'attr-bitgo-03',
    instruction_id: 'tpl-bitgo-btc',
    key: 'reference',
    display: 'Reference',
    default_value: '{docket}',
    value: '{docket}',
    index_order: 2,
  },
];

// ─── Rails catalog ──────────────────────────────────────────────────
// Mirrors the wizard Step 3 list. Order matches the on-screen
// payment-rail order so the dropdown stays predictable.

const initialRails: Rail[] = [
  { id: 'rail-wire', name: 'WIRE' },
  { id: 'rail-vcurrency-usdt', name: 'VCURRENCY USDT' },
  { id: 'rail-vcurrency-usdc', name: 'VCURRENCY USDC' },
  { id: 'rail-vcurrency', name: 'VCURRENCY' },
  { id: 'rail-swift', name: 'SWIFT' },
  { id: 'rail-spei', name: 'SPEI' },
  { id: 'rail-spe', name: 'SPE' },
  { id: 'rail-sepa', name: 'SEPA' },
  { id: 'rail-pix', name: 'PIX' },
  { id: 'rail-internal', name: 'INTERNAL' },
  { id: 'rail-fx', name: 'FX' },
  { id: 'rail-fedwire', name: 'FEDWIRE' },
  { id: 'rail-faster-payments', name: 'Faster Payments' },
  { id: 'rail-ardua', name: 'ARDUA' },
  { id: 'rail-ach', name: 'ACH' },
];

export const instructionsSeed: Instruction[] = initialInstructions.map((i) => ({ ...i }));
export const attributesSeed: SeedAttribute[] = initialAttributes.map((a) => ({ ...a }));
export const railsSeed: Rail[] = initialRails.map((r) => ({ ...r }));

export function resetInstructionsSeed(): void {
  instructionsSeed.length = 0;
  instructionsSeed.push(...initialInstructions.map((i) => ({ ...i })));
  attributesSeed.length = 0;
  attributesSeed.push(...initialAttributes.map((a) => ({ ...a })));
  railsSeed.length = 0;
  railsSeed.push(...initialRails.map((r) => ({ ...r })));
}

// ─── Helpers consumed by handlers ───────────────────────────────────

export function attributesForInstruction(instructionId: string): SeedAttribute[] {
  return attributesSeed
    .filter((a) => a.instruction_id === instructionId)
    .sort((a, b) => a.index_order - b.index_order);
}

/** Project the seed attribute to the `InstructionAttribute` shape used
 *  by the instructions editor. */
export function toInstructionAttribute(a: SeedAttribute): InstructionAttribute {
  return {
    id: a.id,
    instruction_id: a.instruction_id,
    key: a.key,
    value: a.value,
    index_order: a.index_order,
  };
}
