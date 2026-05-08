# Design — add-ops-account-instructions

## Context

This is the fourth OPS migration change and the first to migrate a multi-step
wizard. The legacy is a dedicated route — `/clients/:id/instructions/create` —
that creates a binding between an `Instruction` template (catalog, owned by
`ops-instructions`) and a client's Account. The migration paradigm collapses
that route into a modal mounted from the detail page header, reuses the
canonical Wizard primitive (`core-multi-step-form`), and lands draft persistence
+ live letter preview as the marquee sophistications over the legacy.

The capability is intentionally distinct from `ops-instructions` — the entities
are different (template vs. binding, see `ops-clients` design.md Decision 5
which pre-announced this split). Conflating them in one capability would
overload the spec; keeping them split lets each evolve independently (e.g., a
future `ops-instructions` adds template versioning without touching the
binding logic here).

---

## Decision 1 — `ops-account-instructions` is a NEW capability, NOT an extension of `ops-instructions`

### The question

`ops-clients` design.md Decision 5 left the question open: when the wizard
migrates, should it extend `ops-instructions` with `MODIFIED Requirement`
entries, or create its own capability `ops-account-instructions`? The two
options are NOT cosmetic — they have different blast radii on later changes.

### The decision

**Create a NEW capability `ops-account-instructions`.**

### Why

- **Distinct entities.** `Instruction` is a catalog template — name, currency, attributes schema, optional default values. `AccountInstruction` is an instance of that template, bound to a specific account, with concrete field values + rails. They share a name root for historical reasons, not because they're the same domain.
- **Distinct endpoints.** `Instruction` lives under `/instruction*` (CRUD). `AccountInstruction` lives under `/account-instruction*` (create + read; no update in legacy). A capability that owned both would have two unrelated endpoint trees.
- **Distinct lifecycles.** A template can outlive every binding made from it (delete a binding → the template stays). Conversely, a template's update may NOT cascade to existing bindings (legacy backend does NOT mass-update). The capabilities should be independently evolvable.
- **Cleaner spec hygiene.** `ops-instructions` currently has 9 requirements + 27 scenarios about template CRUD. Tacking on 12 more requirements about wizards + live previews would balloon the spec to ~21 requirements covering two distinct surfaces, making it hard to reason about either.

### Trade-off

The capability boundary creates a coordination point: the wizard reads the
templates list owned by `ops-instructions`, and writes data the detail page
(owned by `ops-clients`) renders. Both reads + writes are composition-only —
no Requirement modification on the sibling capabilities. The trade is
explicit in the proposal's "Integrate with sibling capabilities" section.

### Alternatives considered

- **Extend `ops-instructions` with the wizard.** Rejected for the entity-distinction reason. Also: would force the implementation to put `CreateAccountInstructionModal.vue` under `src/ops/instructions/`, mixing template-CRUD code with binding-creation code in the same folder.
- **Extend `ops-clients` with the wizard.** Considered. Rejected because the wizard's logic (template hydration, attribute schema, rails picker) has nothing to do with clients except the client_id parameter; loading the full machinery into `ops-clients` would dilute that capability.
- **Create both `ops-instructions-wizard` (this) AND `ops-account-instructions-binding-management` (for future edit/delete).** Considered. Rejected as premature splitting. If edit/delete come later, this capability extends with `ADDED Requirements`; no need to atomise further upfront.

### Failure modes the rule prevents

- A developer extends `ops-instructions` with a Requirement about wizard steps → spec rejects (no MODIFIED Requirements declared).
- A developer adds an `ops-instructions/specs/CreateInstructionWizard.vue` import in this change → component lives in the wrong capability folder; review rejects.

---

## Decision 2 — Wizard as a modal mounted from the detail page, NOT a route

### The question

The legacy route is `/clients/:id/instructions/create`. Three options:

- **(A)** Migrate as a route (legacy parity).
- **(B)** Migrate as a modal mounted from the detail page header.
- **(C)** Migrate as a route but inside an iframe / drawer overlay on the detail page.

### The decision

**Option B.** Modal with internal Wizard state machine. Legacy URL absorbed via redirect → `/clients/:id?createInstruction=1`.

### Why

- **The wizard's parent is the detail page.** Every selection in the wizard makes sense in the context of the client whose detail is open. A separate route forces the operator to back-navigate twice (Crear → wizard → back → re-load detail).
- **Cache reuse.** The detail page's `GET /clients/:id` already returns the accounts. The wizard reads them from the same vue-query cache. A separate route would need its own fetch.
- **Detail page is the success destination.** When the wizard submits, the operator sees the new binding in the detail page accounts section. No navigation needed beyond closing the modal.
- **`core-modals` contracts the centred Dialog**. The Wizard primitive (`core-multi-step-form`) has no opinion on its container, so we put it inside a Dialog.

### URL absorption (legacy parity for bookmarks)

The legacy URL `/clients/:id/instructions/create` SHALL redirect to
`/clients/:id?createInstruction=1`. The detail page reads the query param on
mount and auto-opens the modal. Once the modal closes (whether by submit,
cancel, or backdrop click), the page strips the query param via
`router.replace` so the URL goes back to bare `/clients/:id`.

### Alternatives considered

- **Option A (route).** Rejected for the parent-context reason.
- **Option C (drawer overlay).** Rejected. Drawers are canonical for record-detail surfaces (Inbox profile B, Alertas profile B) — the wizard creates a NEW record, not detail. Overloading the drawer paradigm here would muddle the canon.
- **Modal with the live preview as a separate sheet that opens on click.** Considered. Rejected — the preview is real-time-updating-with-keystrokes; making the operator open a separate sheet to see it defeats the purpose.

### Failure modes the rule prevents

- A developer registers a route at `/clients/:id/account-instructions/new` → spec rejects; the canonical surface is the modal.
- A developer omits the legacy URL redirect → bookmarked legacy links break. Spec mandates the redirect.

---

## Decision 3 — Use the `core-multi-step-form` Wizard primitive, NOT a hand-rolled step machine

### The question

The wizard has 3 steps with progressive validation (step 2's field set depends
on step 1's template choice; step 3 unlocks only when step 2 is fully filled).
Should the implementation roll its own step state, or use the canonical
`core-multi-step-form` Wizard primitive?

### The decision

**Use `core-multi-step-form`.** The primitive ships `<Wizard>`, `<WizardStep>`,
and a composable for step gating + persistence-friendly state.

### Why

- **The primitive ships in the template baseline.** Re-rolling a step machine here re-rolls something the template just contracted; it would be the second consumer (after the playground) — exactly the consumer the primitive expects.
- **Step gating comes free.** The Wizard composable handles "next step is enabled when current step is valid" without us re-implementing it.
- **Tested.** The primitive has its own Vitest suite; we get coverage on the step transitions for free.

### Trade-offs

The primitive is opinionated on header chrome (it ships a step indicator at
the top). The legacy has its own step indicator with a gradient progress bar.
We adopt the primitive's chrome — visual consistency with the rest of the
template wins over visual parity with the legacy. The legacy operator's
muscle memory is not a regression: the new chrome is functionally identical
(numbered steps + active highlight + completed checkmark).

### Alternatives considered

- **Hand-rolled `step: 1 | 2 | 3` ref + transitions.** Rejected. Re-rolls primitive logic; the only argument for it is "preserve legacy chrome", which is not a goal.
- **`core-dynamic-forms` (the runtime schema engine).** Considered. Rejected because the wizard's STEP STRUCTURE is build-time (3 steps known in advance); only the field schema of step 2 is runtime. Runtime schema lives inside step 2's body via the template attributes; the wizard structure stays build-time.

### Failure modes the rule prevents

- A developer rolls a separate step indicator + state machine → forfeits the primitive's tested step transitions; spec rejects (rolls primitive duplication).

---

## Decision 4 — Modal width is `xl` (~960 px), NOT the canonical centred `lg` (~720 px)

### The question

`core-modals` contracts the centred Dialog at `sm:max-w-lg` (~720 px) for
single-form modals. The wizard step 2 has a side-by-side inputs + live letter
preview that needs more horizontal space; the inputs alone fit in `lg`, but
the letter preview is ~A4-aspect and needs ~400 px next to a 400 px input
column.

### The decision

**Use `sm:max-w-4xl` (~960 px) for this wizard.** Non-canonical width, but
explicitly justified by the side-by-side preview that's central to step 2's
UX.

### Why

- **The preview IS the differentiator.** It's the marquee sophistication over the legacy. Cramping it (or hiding it on narrower viewports) defeats the purpose.
- **`core-modals` contracts widths as guidance, not hard ceiling.** The capability allows wider modals when the use case justifies it. The justification here is documented in this design.
- **The wider width is contained to step 2.** Steps 1 and 3 don't NEED `xl` width — they'd fit in `lg`. But the modal's width is set on mount and doesn't shrink/expand per step (transition jank is worse than wasted whitespace on simpler steps).

### Trade-offs

On narrower screens (< 1024 px) the modal hits the viewport width and the
preview wraps below the inputs. The wizard MUST handle this gracefully via
responsive classes (`lg:grid-cols-2` → falls back to `grid-cols-1` below
`lg`). Below `lg`, the preview renders BELOW the inputs in vertical flow.

### Alternatives considered

- **`sm:max-w-2xl` + scroll.** Rejected — the preview at A4 aspect needs ~400 px width; below that it becomes unreadable.
- **Toggle to hide the preview.** Rejected for v1 (the operator who hides it loses the differentiator; we'd need to also persist that toggle and gate the spec behaviour on it). If user research later shows operators prefer no preview, we add the toggle then.

### Failure modes the rule prevents

- A developer doesn't add the responsive grid → narrow viewports get a clipped preview. Spec mandates the responsive fallback.
- A developer reduces width to "match other modals" → forfeits the preview's value. Spec mandates `xl` with the rationale captured here.

---

## Decision 5 — Variable interpolation + SWIFT-rule are PURE HELPERS, not inline logic

### The question

The legacy has two pieces of logic baked into the wizard's `handleNextStep`:

1. **Interpolation.** Each template attribute's `default_value` may contain
   `{docket}`, `{name}`, `{tax_number}` placeholders. On step transition the
   wizard replaces them with the client's data.
2. **SWIFT rule.** When the template's rail is in
   `['SWIFT', 'ACH', 'FEDWIRE', 'SEPA', 'ACH & FEDWIRE']`, the field whose
   `key` includes "reference" gets `<default><docket><client.name>`
   concatenated (overwriting the interpolated default).

Both are domain logic that's easy to break in a Vue refactor (the legacy's
implementation is a `forEach` + a `find` + a string concat).

### The decision

**Extract to `src/ops/account-instructions/interpolation.ts` as pure
functions:**

- `interpolateClientVariables(value: string, client: Client): string`
- `applySwiftReferenceRule(values: Record<string, string>, attributes: TemplateAttribute[], template: Instruction, client: Client): Record<string, string>`

Both pure, both Vitest-tested in isolation.

### Why

- **The SWIFT rule has 5 rail strings AND a substring check on attribute keys** (`includes('reference')`). The match logic is deceptively easy to break.
- **The interpolation pattern is reusable** — a hypothetical future feature (e.g., interpolate into a confirmation email body) can reuse the helper.
- **Testability** — the legacy has zero tests for either; the migration adds them.

### Failure modes the rule prevents

- A developer changes `selectedTemplate.value.rail_name` to `selectedTemplate.value.rail.name` → the SWIFT rule silently stops triggering. Pure helper + unit tests catch the regression.
- A developer adds a new rail to the trigger set without updating tests → tests pass, real flow breaks; spec mandates the test set covers each rail.

---

## Decision 6 — Live letter preview is a DEDICATED COMPONENT, side-by-side with inputs

### The question

The legacy embeds the letter preview HTML directly in the wizard's step 2
template (~50 LOC of nested divs with hardcoded copy: "Welcome to Ardua
Solutions Corp", "Your Unique Client Number", etc.). On every keystroke the
preview re-renders because it reads from the same `formValues` reactive
object.

Should the migration:

- **(A)** Keep the preview inline in the step 2 template (legacy parity).
- **(B)** Extract to a dedicated `<LetterPreview>` component fed by props.
- **(C)** Drop the preview (over-engineering).

### The decision

**Option B.** Extract to `<LetterPreview>` taking `client + template + values
+ selectedAccount` as props.

### Why

- **Inline in the template is unmaintainable.** The legacy's 50 LOC of preview HTML is a chore to scan; extracting clarifies that the preview is a presentational concern, not part of the wizard's flow logic.
- **Reusability.** A hypothetical future `<RecentLettersPanel>` (out-of-scope follow-up) can reuse `<LetterPreview>` to render historical letters from the same shape.
- **Testability.** Mounting `<LetterPreview>` in isolation with mocked props verifies it renders the interpolated `client.docket` and the `formValues` correctly without driving the entire wizard.
- **The preview MUST be presentational only** — no fetches, no side effects. Extracting enforces that contract by props-only API.

### Trade-offs

The preview's copy ("Welcome to Ardua Solutions Corp" + the support email +
the address block) is hardcoded in v1. If marketing later wants to A/B test
the letter copy, the component takes a `letterTemplate?: LetterTemplate`
prop and reads from there. That's a future extension; v1 hardcodes for
simplicity.

### Alternatives considered

- **Option A (inline).** Rejected for the maintainability reason.
- **Option C (drop).** Rejected — the preview is the marquee sophistication of the legacy that justifies the migration's "more sophisticated, not 1:1" philosophy.
- **Render the preview using the actual backend `/account-instruction/:id/confirmation-letter` endpoint as an iframe.** Considered. Rejected because the binding doesn't exist yet at preview time — there's no `:id` to call. The preview must be reproduced from the same data the backend would use.

### Failure modes the rule prevents

- A developer keeps the preview inline → the step 2 template balloons + becomes hard to test. Spec mandates extraction.
- A developer adds a fetch inside `<LetterPreview>` → forfeits the props-only contract. Spec mandates presentational-only.

---

## Decision 7 — Quality-of-life refinements over the legacy wizard (NOT 1:1 migration)

### The question

Same lens as `add-ops-statements` Decision 7: refinements that don't justify
their own follow-up changes but are cheap during the migration.

### The decision

**Land 5 refinements in v1.** Each is pure-frontend, low-cost, and turns the
wizard from "form that fires-and-forgets" into a tool that handles operator
mistakes gracefully.

| # | Refinement | Frontend cost | Operator value |
|---|---|---|---|
| 7a | **Smart single-account default**: client with exactly one non-ARS account auto-selects it; flow advances UI to template selection within step 1 | 1 watcher | -1 click on the common case (single-foreign-account clients) |
| 7b | **Inline field-level validation**: backend `errors[]` (`{field, message}`) maps to inline error messages on the corresponding Field Values inputs (vs. legacy that surfaces them in a toast list) | 1 ref + per-field render | Operator sees exactly which field failed and why; doesn't have to scan a toast list |
| 7c | **Pre-submit preview card**: at step 3 below the rails grid, a summary card consolidates `Cuenta · Template · Valores · Rails` before the `Crear` button enables | 1 component + 1 conditional render | Final visual confirmation before the binding is created (a binding's metadata is templated and easy to mis-type) |
| 7d | **Cancel during submit**: `Crear` button transforms into `Cancelar` while the POST is in flight; bound to `AbortController.abort()` | 1 ref + 1 effect + 1 state branch | Operator regains agency on hangs (no more browser-tab-close to escape) |
| 7e | **localStorage draft persistence per client**: every selection + form value is persisted under `ops:account-instructions:draft:<clientId>` on every step transition + every keystroke (debounced 500 ms); on next opening for the same client, the wizard restores at the saved step with all values pre-filled; on successful submit the draft is cleared | ~30 LOC (helper + watcher) | A page refresh mid-flow doesn't lose 5 minutes of work |

### Why these five (and not more)

Same as `add-ops-statements`: pure-frontend, low coupling, operator-asked.

The wizard is heavier than the statement modal (more steps, more field types,
heavier hydration), so refinement 7e (draft persistence) is more valuable
here than in statements (where a refresh loses ~3 selections; here it loses
~10 inputs).

Refinements explicitly OUT for v1 (deferred):

- **Smart single-template default**: when only one template would make sense for the chosen account+rail, don't auto-pick — the wrong template is too easy a mistake.
- **Field validation BEFORE submit** (frontend zod schema beyond required-non-empty). Backend declares the field schema; replicating + maintaining a zod mirror per template would drift. Backend validation on submit is the source of truth.
- **Multi-binding creation** (one wizard run that creates N bindings).
- **Step navigation via the indicator chips at the top** (clicking step 2 chip from step 3 to backtrack). The Wizard primitive supports it — turning it on is a 1-prop change. Cut for v1 because the back button at the bottom is sufficient and step navigation introduces "are we sure" prompts when going back from step 3 (which would lose the rails selection).

### Failure modes the rule prevents

Same as `add-ops-statements` Decision 7 — each refinement is contracted as a
Scenario in its host Requirement, never as a non-spec implementation detail.

---

## Decision 8 — NO step-up MFA on submit

### The question

`ops-clients` Requirement 4 wraps `POST /sign-up` in step-up MFA because
creating a portal user is a sensitive operation. `ops-account-instructions`
creates an operational binding — should it step-up?

### The decision

**No step-up.** Submit is a regular `apiClient.post` (with `AbortSignal`).

### Why

- **The risk class is the same as statements** — operational data the operator already has authority over via the detail page's other CTAs (Whitelist, Letter, Copy). Adding MFA here for one of those operations and not the others would be inconsistent.
- **The legacy did NOT step-up.** Same lens as statements: legacy is correct here on this specific operation.
- **`SignUp` and `Whitelist` are the only OPS sensitive operations** (cross-trust-boundary or money-movement-affecting). `AccountInstruction` creation defines a routing rule; it doesn't move money or grant access.

### Failure modes the rule prevents

- A developer wraps the submit in `withStepUp` "for consistency" → forfeits the risk-class analysis. Spec mandates no step-up.

---

## Cross-capability composition

| Capability | What it owns | What `ops-account-instructions` owns |
|---|---|---|
| `core-layout` | AppShell, page header | Third CTA in the detail page header |
| `core-modals` | Centred modal pattern, focus trap, escape semantics | Modal mount + width override (`sm:max-w-4xl` per Decision 4) |
| `core-multi-step-form` | `<Wizard>` primitive + step state composable | The 3-step composition + per-step gating logic |
| `core-forms` | `<Input>`, `<Select>`, `<Label>` | Field declarations + per-field error rendering |
| `core-api-layer` | `apiClient` axios + `ApiError` | Endpoint wrappers (`listInstructionTemplates`, `getTemplateAttributes`, `listRails`, `createAccountInstruction`) |
| `core-error-handling` | Skeleton, EmptyState, alert banners, toasts | Surface rendering for the wizard's loading / empty / error states |
| **`ops-clients`** | Client detail data (accounts) | Reuse via vue-query cache; cache invalidation on success |
| **`ops-instructions`** | Templates catalog | Reuse via vue-query cache for the templates list |
| `core-navigation` | Route registration | Legacy URL redirect `/clients/:id/instructions/create` → `/clients/:id?createInstruction=1` |

---

## Open questions

1. **Backend cascade on template update.** When a template's attributes schema changes after a binding has been created, what happens to the binding's metadata? Out of scope for this change; flagged for backend coordination. The frontend assumes bindings are independent snapshots once created.
2. **Letter preview copy ownership.** The letter copy ("Welcome to Ardua Solutions Corp", support email, etc.) is hardcoded in `<LetterPreview>` for v1. If marketing later wants to manage this copy, lands as `extend-ops-account-instructions-letter-template-binding` reading the copy from a backend resource.
3. **Rails catalog sourcing.** Rails come from `GET /rails`. Currently no caching strategy declared — vue-query defaults apply. If rails are immutable (probably yes), a longer `staleTime` should be set to avoid re-fetching per wizard mount; flagged for follow-up tuning.
4. **Edit existing account_instruction.** Out of scope; lands as `extend-ops-account-instructions-edit` once product validates the use case (the template's attribute schema may have changed since binding creation, complicating "edit" semantics).
5. **Audit drawer.** Same pattern as the deferred audit drawer in `ops-statements` — when product wants "who created this binding and when" surfaced in the UI, lands as a follow-up.
6. **`useDynamicForm` integration for runtime field schemas.** Considered briefly: the template attributes ARE a runtime schema. But the schema is fetched once per template (from `GET /instruction-attribute/instruction/:templateId`) and used inside the Wizard's step 2; using `core-dynamic-forms` would force the wizard to coordinate with the dynamic-form composable. Cut for v1; if step 2's logic grows (e.g., per-field cross-validation rules from the schema), revisit.
