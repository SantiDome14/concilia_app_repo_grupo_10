// ════════════════════════════════════════════════════════════════════
// ops-instructions — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-instructions` capability. The shape mirrors the
// legacy backend (`POST /instruction` + `POST /instruction-attribute/
// save-all`); the form layer flattens the two entities into a single
// `InstructionFormData` and the api layer orchestrates the two-phase
// save per `proposal.md` Decision 3.
// ════════════════════════════════════════════════════════════════════

export type InstructionId = string;

/** Lifecycle states — `DRAFT` work in progress (no `account_instruction` may pick it),
 * `ACTIVE` published template, `INACTIVE` archived but kept for historic letters. */
export type InstructionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

/** Single attribute row attached to an instruction. */
export interface InstructionAttribute {
  id?: string; // present on existing rows; absent when newly added in form
  instruction_id?: InstructionId;
  key: string;
  value: string;
  index_order: number;
}

/** Instruction record (without attributes). */
export interface Instruction {
  id: InstructionId;
  name: string;
  /** Provider tag (free-form: bank, exchange, custodio, ...). */
  provider: string | null;
  currency_id: string;
  description: string | null;
  /** Lifecycle state — `DRAFT` work in progress, `ACTIVE` selectable by Account Instructions, `INACTIVE` archived. */
  status: InstructionStatus;
  created_at: string; // ISO 8601
  updated_at: string;
  /** Pre-computed by the backend to avoid an extra fetch on the list. */
  attributes_count: number;
}

/** Instruction record with its attributes hydrated. */
export interface InstructionWithAttributes extends Instruction {
  attributes: InstructionAttribute[];
}

/** Query params accepted by `GET /instruction`. */
export interface InstructionsListParams {
  name?: string;
  currency_id?: string;
  page: number;
  pageSize: number;
}

/** Form-layer shape — fed by the `ops.instructions` manifest engine
 * (`instructions.crear` CTA + `instructions.editar` action). */
export interface InstructionFormData {
  name: string;
  provider: string;
  currency_id: string;
  description: string;
  status: InstructionStatus;
  /** Attributes use the canonical `key-value-array` shape from `core-forms`. */
  attributes: Array<{ key: string; value: string; index: number }>;
}

/** Result of the two-phase save orchestrator. Surfaces partial failure to the modal. */
export type SaveResult =
  | { status: 'ok'; instruction: InstructionWithAttributes }
  | {
      status: 'phase-a-failed';
      error: { message: string; field?: keyof InstructionFormData };
    }
  | {
      /** Phase A succeeded; phase B failed. The instruction id is captured so
       * the retry banner can re-issue phase B alone. */
      status: 'phase-b-failed';
      instructionId: InstructionId;
      error: { message: string };
    };
