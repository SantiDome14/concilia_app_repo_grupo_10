// ════════════════════════════════════════════════════════════════════
// ops-clients — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-clients` capability. The shape mirrors the legacy
// backend (`GET /clients`, `GET /clients/:id`, `POST /sign-up`,
// `POST /clients/:id/whitelist-account`) and intentionally separates
// `Instruction` (template, owned by `ops-instructions`) from
// `AccountInstruction` (binding, owned here) per design.md Decision 5.
// ════════════════════════════════════════════════════════════════════

export type ClientId = string;

/** Discriminated union for the portal status — see `portal-status.ts`. */
export type PortalStatus = 'active' | 'pending' | 'not-created';

/** Tone returned by the portal-status helper, mapped to `core-theming` semantics. */
export type PortalStatusTone = 'success' | 'warning' | 'danger';

/** Master-list row shape (slim — no accounts/movements). */
export interface Client {
  id: ClientId;
  name: string | null;
  email: string | null;
  tax_number: string | null;
  docket: string | null;
  is_active: boolean;
  /** Optional opaque external id used by `POST /sign-up`. */
  external_client_id?: string;
  /** Backend-issued portal status. The helper normalises empty/missing → `not-created`. */
  metadata?: { status?: 'ACTIVE' | 'PENDING' | '' | null } | null;
}

/** Single attribute (key+value) attached to an `AccountInstruction`. */
export interface AccountInstructionField {
  key: string;
  display: string;
  value: string;
}

/** Binding of an `Instruction` template to an `Account`. Distinct from `Instruction`. */
export interface AccountInstruction {
  id: string;
  instruction_name: string;
  /** Provider name (e.g. `COINAG`); the case is normalised by the consumer. */
  operations_provider_name?: string | null;
  fields: AccountInstructionField[];
  rails: string[];
}

/** Account associated with a client (currency + balance + bound instructions). */
export interface Account {
  id: string;
  account_number: string;
  balance: string;
  currency: { id: string; name: string } | null;
  instructions: AccountInstruction[];
}

/** A single recent movement on the client. Read-only in v1 (Decision 6). */
export interface ClientMovement {
  id: string;
  date: string; // ISO 8601 or backend display string
  counterparty_name: string | null;
  type: string;
  amount: string;
  currency_id?: string | null;
}

/** Full detail payload returned by `GET /clients/:id`. */
export interface ClientWithAccounts extends Client {
  accounts: Account[];
  movements: ClientMovement[];
}

/** Currency catalog entry (sourced from `GET /currencies`). */
export interface CurrencyEntry {
  id: string;
  code: string;
  name: string;
}

/** Query params accepted by `GET /clients`. */
export interface ClientsListParams {
  name?: string;
  docket?: string;
  page: number;
  pageSize: number;
}

/** Backend envelope for `GET /clients` (legacy uses `clients` not `data`). */
export interface ClientsListResponse {
  clients: Client[];
  total: number;
}

/** Body for `POST /clients/:id/whitelist-account` (PSP backend). */
export interface WhitelistRequest {
  name: string;
  tax_number: string;
  account_number: string;
  currency_id: string;
}

/** Body for `POST /sign-up` (gated by step-up MFA per Requirement 4). */
export interface SignUpRequest {
  external_client_id: string;
}

/** Validated CVU/CBU response from `GET /coinag/account/:cvu`. */
export interface ValidatedCvuAccount {
  account_type: string;
  account: string;
  alias: string;
  cuit: string;
  holder: string;
  holders: string[];
  bank_id: string;
  active: boolean;
}

/** Confirmation-letter response shape from `/account-instruction/:id/confirmation-letter`. */
export type ConfirmationLetterResponse =
  | { success: true; url: string }
  | { success: false; error?: string };

/**
 * Whitelist modal internal state machine (Decision 3 — single dialog,
 * two views). The transition is `'input' → 'review'` after a successful
 * `validateCvu` call; on `Confirmar` failure with `already_whitelisted`
 * or `exist_internal_route` the modal stays at `'review'` showing an
 * inline error.
 */
export type WhitelistModalStep = 'input' | 'review';
