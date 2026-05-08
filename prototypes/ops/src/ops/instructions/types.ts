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
  currency_id: string;
  description: string | null;
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

/** Form-layer shape (what `<CreateInstructionModal>` and `<EditInstructionModal>` v-model). */
export interface InstructionFormData {
  name: string;
  currency_id: string;
  description: string;
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
