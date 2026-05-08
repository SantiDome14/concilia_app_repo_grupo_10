> Jira REQ: — (no ticket; fourth OPS migration change after `add-ops-instructions`, `add-ops-clients`, `add-ops-statements`)
> Module: OPS

# Add ops-account-instructions — bind an Instruction template to a client's Account via 3-step wizard

## Why

The legacy `core-ops-frontend` ships the "create account instruction" flow as a
~800 LOC dedicated route at `/clients/:id/instructions/create`
(`src/views/Clients/CreateInstruction.vue`). The flow binds an `Instruction`
template (catalog, owned by `ops-instructions`) to a specific `Account` of a
client (catalog, owned by `ops-clients`), with rails attached. The result is a
new `account_instruction` row that the detail page renders inside its
expanded account cards (already migrated in `ops-clients`).

The legacy version ships:

- A 3-step wizard: pick account + template → fill values → pick rails.
- ARS-currency accounts excluded from the picker (account instructions are for foreign-currency wires).
- Variable interpolation in template defaults (`{docket}`, `{name}`, `{tax_number}` filled with the client's data on hydration).
- A SWIFT/ACH/FEDWIRE/SEPA-rail-specific rule: when a template's rail matches that set, the field whose key contains "reference" gets `<default><docket><client.name>` concatenated automatically.
- A live letter preview side-by-side with the inputs on step 2 — an A4-aspect mock of the confirmation letter the operator will later download from the detail page (Letter action, owned by `ops-clients` Requirement 9).
- Field-level validation errors from the backend rendered inline (`{errors: [{field, message}]}`).

The legacy also has problems the migration fixes:

- The wizard lives at its own route, disconnected from the detail page — context loss when the operator backs out (the detail page reload re-fetches everything).
- No draft persistence: a refresh mid-flow loses every selection and every typed value.
- No cancel-during-submit: a hung POST blocks the operator with no escape.
- No pre-submit confirmation: the operator clicks Crear and the binding is created without a final consolidated review.
- `useApi.js` does the fetches (no `apiClient` from `core-api-layer`, no `ApiError`, no centralised 401 handling).

This change creates the `ops-account-instructions` capability — a distinct
capability from `ops-instructions` (per `ops-clients` design.md Decision 5,
which pre-announced this split). The wizard ships as a **modal** mounted from
the detail page header, sharing the operator's context with the page. The
implementation reuses primitives from sibling capabilities (`<DatePicker>` is
NOT used here, but `<ClientFilters>` is N/A — the client is fixed by the URL
context; the `core-multi-step-form` Wizard primitive IS used because the legacy
already has 3 logical steps and shipping that on the canonical primitive means
the steps' progressive validation comes for free).

The migration also lands **5 quality-of-life sophistications** the legacy did
NOT ship (per design.md Decision 7), following the precedent of
`add-ops-statements`: smart single-account default, inline field-level
validation mapping, pre-submit preview card, cancel-during-submit via
`AbortController`, and localStorage draft persistence per client (so a refresh
mid-flow recovers the wizard at the same step with the same values).

The legacy URL `/clients/:id/instructions/create` is **absorbed** — it
redirects to `/clients/:id?createInstruction=1` which auto-opens the modal
mounted on the detail page. Bookmarked legacy links keep working.

## What Changes

- **Create the `ops-account-instructions` capability.** New spec at `openspec/specs/ops-account-instructions/spec.md` (materialised on archive) with the Requirements unifying the legacy `CreateInstruction.vue` flow. Concretely covers:

  1. The wizard SHALL be reachable from the detail page header CTA `Crear instrucción de cuenta`, opening with the URL-bound `clientId` pre-populated.
  2. The wizard SHALL guide the user through 3 logical steps inside one `<Dialog>`: step 1 (account + template), step 2 (field values + live letter preview), step 3 (rails).
  3. The Account selector SHALL exclude ARS-currency accounts and offer the smart single-account default (Decision 7a — when the client has exactly one non-ARS account, it auto-selects).
  4. The Template selector SHALL be searchable by `name` and `rail_name`/`rail_id` substring; the search input is debounced 300 ms.
  5. The Field Values step SHALL hydrate `templateOptions` from `GET /instruction-attribute/instruction/:templateId`, prepopulate string values via the canonical interpolation helper (`{docket}` / `{name}` / `{tax_number}` from the client), and apply the SWIFT-rail reference-field rule (concatenate `<default><docket><client.name>` when the rail is in `['SWIFT', 'ACH', 'FEDWIRE', 'SEPA', 'ACH & FEDWIRE']`).
  6. The Field Values step SHALL render a live letter preview side-by-side with the inputs, updating on every keystroke; the preview reads from the same `formValues` ref so it stays in sync.
  7. The Rails step SHALL render the rails catalog (`GET /rails`) as a multi-select grid; at least one rail must be selected to enable the submit button.
  8. Submit SHALL POST `/account-instruction` with `{ instruction_id, account_id, metadata, rail_ids }`, support cancel during flight via `AbortController` (Decision 7d), map field-level validation errors from `errors[]` to inline messages on the corresponding Field Values inputs (Decision 7b), and invalidate the `['ops', 'clients', clientId]` query so the new account_instruction renders in the detail page accounts section on the next render cycle.
  9. The wizard SHALL persist its draft to `localStorage` keyed by `clientId` (Decision 7e), restoring the active step + selections + form values on next opening for the same client; on successful submit the draft is cleared.
  10. Skeleton + EmptyState + 5xx retry toast — all from `core-error-handling`.
  11. The CTA `Crear instrucción de cuenta` SHALL be visible only to users with `clients:create-account-instruction` capability (or `OPS_ADMIN` until `ops-roles` lands). Hidden for viewer-only roles.
  12. A pre-submit preview card SHALL render at step 3 below the rails grid consolidating account + template + values + rails before enabling the `Crear` button.

- **Define the typed surface.** Files materialised on implementation:
  - `src/ops/account-instructions/types.ts` — `AccountInstructionDraft`, `AccountInstructionRequest`, `TemplateAttribute`, `Rail`, `AccountInstructionResult`, `ValidationFieldError`, `WizardStep`.
  - `src/ops/account-instructions/api.ts` — endpoint wrappers using the shared `apiClient` (`listInstructionTemplates`, `getTemplateAttributes`, `listRails`, `listClientAccounts`, `createAccountInstruction`).
  - `src/ops/account-instructions/interpolation.ts` — pure helpers `interpolateClientVariables(value, client)` + `applySwiftReferenceRule(values, attributes, template, client)`.
  - `src/ops/account-instructions/draft-storage.ts` — pure helpers `saveDraft(clientId, draft)` / `loadDraft(clientId)` / `clearDraft(clientId)`.
  - `src/ops/account-instructions/AccountTemplateStep.vue` — step 1 (account selector + template selector).
  - `src/ops/account-instructions/FieldValuesStep.vue` — step 2 (inputs + live letter preview).
  - `src/ops/account-instructions/RailsStep.vue` — step 3 (multi-select grid).
  - `src/ops/account-instructions/LetterPreview.vue` — A4-aspect live preview component, reads `client + template + values + selectedAccount` from props.
  - `src/ops/account-instructions/AccountInstructionPreviewCard.vue` — consolidated summary for Decision 7c.
  - `src/ops/account-instructions/CreateAccountInstructionModal.vue` — the modal raíz, composes the steps via the `core-multi-step-form` Wizard primitive.

- **Wire the trigger.** The `src/pages/ClientDetail.vue` header gains a CTA `Crear instrucción de cuenta` placed next to the existing `Whitelistar Cuenta` and `Generar Statement` CTAs. The CTA gates on capability + the existence of at least one non-ARS account on the client (no point opening the wizard for a client without eligible accounts). The legacy URL `/clients/:id/instructions/create` SHALL redirect to `/clients/:id?createInstruction=1` and the page auto-opens the modal on mount when the query param is set.

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — third CTA in the L1 page header of the detail page.
  - `core-modals` — centred modal (or `xl` width — the live preview is wider than the canonical centred dialog; see design.md Decision 4).
  - `core-multi-step-form` — Wizard primitive for the 3-step state machine.
  - `core-forms` — `<Input>`, `<Select>` for field values + template search.
  - `core-api-layer` — shared axios + `ApiError` (replaces the legacy `useApi.js` pattern).
  - `core-error-handling` — Skeleton, EmptyState, alert banner for 5xx, toast for transients.
  - **`ops-clients`** — re-uses the client detail data (`GET /clients/:id` returns the accounts; the wizard does NOT call a separate `/clients/:id/accounts` because the page already has them) and invalidates the same query key on success. Composition-only — NO Requirement modification on `ops-clients`.
  - **`ops-instructions`** — re-uses the templates list (`GET /instruction`) the catalog page also uses; vue-query cache shares across surfaces. Composition-only — NO Requirement modification on `ops-instructions`.
  - **`ops-roles` (companion change, future)** — `clients:create-account-instruction` capability gating; for now declared inline.

## Capabilities

### Affected Capabilities

None modified by this change. The composition with `ops-clients` and
`ops-instructions` reuses existing Requirements (data fetching + cache
invalidation) without adding or modifying Requirements on those capabilities.

### New Capabilities

- `ops-account-instructions` (OPS modal feature; create the binding between an Instruction template and a client's Account) — 12 requirements, ~36 scenarios.

### Non-capability artifacts

- `src/ops/account-instructions/{api.ts,types.ts,interpolation.ts,draft-storage.ts,*.vue}` — typed surface.
- The CTA addition in `src/pages/ClientDetail.vue` is non-spec edit (composition glue; the spec contracts modal behaviour, not exact button placement chrome).
- The legacy URL redirect in `src/router/routes.ts` is non-spec edit (same shape as `ops-instructions` legacy redirects in `add-ops-instructions`).

### Removed from scope

- **Editing an existing account_instruction** is **NOT migrated** — the legacy does not support it (the only mutations on an account_instruction are create + delete via the parent client's `instructions` array). If product wants edit later, lands as `extend-ops-account-instructions-edit` with its own design (the field schema is template-driven; editing the metadata of a binding is non-trivial when the template's attributes have changed).
- **Deleting an account_instruction inline from the wizard** is **NOT migrated** — the wizard is creation-only. The detail page already exposes Letter / Copy on each existing binding (per `ops-clients` Requirement 7); a Delete row action is a separate follow-up on `ops-clients`.
- **Bulk creation** (one wizard run that produces multiple bindings) is **NOT migrated** — does not exist in the legacy.
- **Step-up MFA** — the legacy does NOT step-up. Decision documented in design.md Decision 8: account_instructions are operational data the operator already has authority to create (compare with SignUp which IS gated because credentials cross trust boundaries).
- **Auto-select smart single-template default** — even when only one template would be valid for the chosen account+rail, the operator must pick it explicitly. Templates are too many and the wrong one is too easy a mistake.
- **Live letter preview as a downloadable PDF** — the preview is presentational only. The operator downloads the real letter from the detail page's Letter action (per `ops-clients` Requirement 9) AFTER the binding is created.
