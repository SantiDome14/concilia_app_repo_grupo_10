import type { Account, ClientId } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// ops-account-instructions — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-account-instructions` capability. The shape mirrors
// the legacy backend (`POST /account-instruction`) and intentionally
// distinguishes `Instruction` (template) from `AccountInstruction`
// (binding) per design.md Decision 1.
// ════════════════════════════════════════════════════════════════════

/** Wizard step identifier — closed enum. */
export type WizardStepId = 'account-template' | 'values' | 'rails';

/** Catalog template (subset of `Instruction` from `ops-instructions`). */
export interface InstructionTemplate {
  id: string;
  name: string;
  rail_name?: string;
  rail_id?: string;
}

/** Schema attribute belonging to a template. */
export interface TemplateAttribute {
  id?: string;
  instruction_id?: string;
  key: string;
  /** Display label override; otherwise the key is humanised at render time. */
  display?: string;
  default_value?: string;
}

/** Rail entry from `GET /rails`. */
export interface Rail {
  id: string;
  name: string;
  description?: string;
}

/** Body for `POST /account-instruction`. */
export interface AccountInstructionRequest {
  instruction_id: string;
  account_id: string;
  metadata: Record<string, string>;
  rail_ids: string[];
}

/** Validation error item from the backend `errors[]` envelope. */
export interface ValidationFieldError {
  field: string;
  message: string;
}

/**
 * Discriminated result of `createAccountInstruction`. The modal uses
 * the discriminator to decide between toast / inline-validation /
 * abort handling without inspecting `ApiError` shape directly.
 */
export type AccountInstructionResult =
  | { status: 'ok' }
  | { status: 'cvu-already-exists' }
  | { status: 'validation-error'; errors: ValidationFieldError[] }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Persisted draft shape per design.md Decision 7e. Stored in
 * `localStorage` under `ops:account-instructions:draft:<clientId>`.
 */
export interface AccountInstructionDraft {
  step: WizardStepId;
  accountId: string | null;
  templateId: string | null;
  formValues: Record<string, string>;
  railIds: string[];
}

/**
 * Form state shared across the 3 steps. The wizard composable holds
 * one of these in its `formState` ref; each step reads/writes the
 * relevant fields.
 */
export interface AccountInstructionFormState extends Record<string, unknown> {
  clientId: ClientId;
  accounts: Account[];
  selectedAccountId: string | null;
  selectedTemplateId: string | null;
  /** Hydrated lazily on entry to step 2 from `GET /instruction-attribute/instruction/:templateId`. */
  templateAttributes: TemplateAttribute[];
  /** Mirror of formValues kept for inline error rendering on step 2. */
  formValues: Record<string, string>;
  /** Per-field validation errors mapped from the backend response. */
  fieldErrors: Record<string, string>;
  selectedRailIds: string[];
}
