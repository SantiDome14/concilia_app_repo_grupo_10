# Design — add-ops-statements

## Context

This is the third OPS migration change, the first to land a feature that lives
**only as a modal** (no new pages). It validates the modal-only paradigm for
features whose flow is short enough to not warrant their own surface, and where
the operator's context is the page they were already on (master list of
clients, or a single client's detail).

The legacy modal duplicates client search and account hydration that
`ops-clients` already owns. The migration's primary job is to **delete the
duplication** while preserving the operator's UX (autocomplete on client,
accordion-by-currency on accounts, quick-filter chips on dates).

---

## Decision 1 — Two trigger surfaces (master list + detail header), with detail pre-populating the client

### The question

The legacy ships the trigger only on the master list (`UserDashboard.vue`
header). When the operator is already in `/clients/:id`, they have to navigate
back, click `Generar Statement`, then re-search the same client they had open.
This is friction the migration can fix.

Should the new modal be reachable from:

- **(A)** Only the master list header (legacy parity).
- **(B)** Both the master list header AND the detail page header.
- **(C)** Both, with the detail page entry pre-populating the client (skipping step 1 of the flow).

### The decision

**Option C.** Two trigger surfaces; the detail page entry skips step 1.

### Why

- **The cost of adding a CTA to the detail page is one button.** The benefit is a non-trivial UX win when an operator is generating a statement for the client they were just inspecting (a common case — "I just looked at this client's accounts, now I want their statement").
- **The pre-population is one prop on the modal.** `<GenerateStatementModal :preselected-client="client" />` — when truthy, the modal mounts at step 2 and renders the client as a read-only chip with a "Cambiar" link that returns to step 1.
- **No spec modification on `ops-clients`.** The detail page already exposes a header CTA slot (the Whitelist CTA lives there in `ops-clients` Requirement 8). Adding a second CTA is a composition change in the page template, not a Requirement modification.

### Alternatives considered

- **Option A (master only).** Rejected — preserves legacy friction for no gain.
- **Option B (both, no pre-population).** Rejected — having the detail entry but forcing the operator to re-search the client they're already viewing is worse than not having the entry at all.
- **A third entry on the per-row Actions menu of the master list table.** Considered. Rejected for v1 because the master list does NOT have a per-row Actions menu (per `ops-clients` Requirement 2: "the master list SHALL NOT expose a per-row Actions popover in v1"). When/if that capability extends to add row actions, the spec for `ops-statements` extends with a `MODIFIED Requirement` adding the row-action entry.

### Failure modes the rule prevents

- A developer wires the detail page CTA but forgets pre-population → operator re-searches needlessly. Spec mandates pre-population on the detail entry.
- A developer adds a third entry without spec coverage → spec rejects.

---

## Decision 2 — Modal-only, NOT a page

### The question

Some statement-generation features in other backoffice apps ship as their own
page (`/statements/new`) so the URL is shareable and the form survives reloads.
Should `ops-statements` ship as a page or a modal?

### The decision

**Modal.** One centred Dialog with internal step state; no route registered.

### Why

- **The flow is short** (3 selections + click) and rarely benefits from a deep-linkable URL. The operator does not bookmark "the form for statement generation"; they bookmark the client whose statement they want.
- **The result IS the artifact.** The `POST /statement` returns a URL to a generated PDF; the URL is what gets shared, not the form state. Reload-survival is therefore unnecessary.
- **The legacy ships it as a modal** and the operator workflow is well-understood. Spec parity here is correct — there is no UX reason to deviate.
- **`core-module-types` does not contract a Type-X for "single-form modal"**; the closest pattern is the canonical centred dialog from `core-modals`. Using that pattern keeps consistency with `SignUpUserModal` from `ops-clients`.

### Alternatives considered

- **Full route at `/statements/new`.** Rejected for the URL-shareability reason — the artifact is the URL, not the form state.
- **Drawer panel from the right.** Rejected. Drawers are canonical for record-detail surfaces (Inbox, Alertas profile B per `core-modulo-genericos`); a creation/export form is not a drawer.
- **Wizard with step routes (`/statements/new?step=2`).** Rejected — three steps in a 30-second flow is too short to justify URL navigation.

### Failure modes the rule prevents

- A developer opens a route and registers it → forfeits the modal canon. Spec mandates modal.

---

## Decision 3 — NO step-up MFA on submit

### The question

`ops-clients` Requirement 4 wraps `POST /sign-up` in `useStepUp().withStepUp(...)`
because creating a portal user is a sensitive operation. Should the same
treatment apply to `POST /statement`?

### The decision

**No step-up.** Submit is a regular `apiClient.post` call.

### Why

- **Statements are read-only exports of data the operator already has access to.** They view balances and movements in the detail page without MFA; gating the export of the same data with MFA is friction without a security gain.
- **The risk class is different from SignUp.** SignUp creates credentials for a third party (the client) — a wrong click grants outsider access. Statement generation creates a PDF of data the operator already trusted with read access; a wrong click generates a PDF the operator throws away.
- **The legacy did NOT step-up here either.** This is one of the few legacy decisions the migration preserves intentionally — the legacy was right by accident on this one (in contrast to SignUp where the legacy was wrong and we corrected it).

### Trade-off

If product later identifies a sensitive subset of statements (e.g. "tax
compliance statements for an external regulator") that warrants MFA, this
spec extends with a `MODIFIED Requirement` adding step-up on a typed
discriminator (e.g. `payload.classification === 'regulatory'`). For v1 there
is no such discriminator, so no step-up.

### Alternatives considered

- **Add step-up to match SignUp for consistency.** Rejected — consistency is not a goal in itself; matching the risk class is. SignUp creates credentials, statement creates a PDF; different operations should have different gating.
- **Add step-up only when the date range exceeds N months.** Considered. Rejected as premature — there is no business signal that long ranges are riskier; this would be cargo-culting MFA.

### Failure modes the rule prevents

- A developer wraps the submit "for consistency" with SignUp → forfeits the MFA-grain analysis the design captures. Spec mandates no step-up unless a future discriminator triggers it.

---

## Decision 4 — Reuse `<ClientFilters>` from `ops-clients`, do NOT roll a new client picker

### The question

The legacy modal rolls its own client search (debounced input + dropdown +
custom `fetchClients` calls). The new template ships `<ClientFilters>` in
`ops-clients` that does the same thing with debounced lookup + popover
suggestions + selection chip. Should the modal reuse it or roll its own (since
the modal context is "picker", not "filter")?

### The decision

**Reuse `<ClientFilters>`** with a `mode='picker'` prop OR by passing a custom
`onSelect` handler that emits the chosen client to the modal instead of
applying it as a filter.

### Why

- **The autocomplete UX is identical** — debounced lookup on the same `/clients?name=` endpoint, popover with suggestions, em-dash placeholders. Re-implementing it = duplication.
- **The component is already tested** by `ops-clients`'s test suite; changes there propagate to both surfaces.
- **The visual contract is the same** — operators benefit from seeing the same input shape across surfaces.

The current `<ClientFilters>` component is wired specifically to URL-driven
filter state (it emits `update:modelValue` for the page to apply as a query
param). To reuse for picker mode, the implementation introduces a `mode` prop
or a `picker` slot that overrides the on-select behaviour. The change to
`<ClientFilters>` is **non-spec-modifying** (it's a component-API extension,
not a Requirement change on `ops-clients`).

### Alternatives considered

- **Roll a separate `<StatementClientPicker>` from scratch.** Rejected — duplicates ~80 LOC of search + popover + chip rendering for cosmetic reasons.
- **Lift `<ClientFilters>` into a shared `core-clients-picker` capability.** Considered. Rejected because there is no current third consumer; promoting prematurely creates a fictional capability boundary. If a third consumer appears (e.g. a "transfer to client" modal in `ops-financial-dashboard`), the lift becomes justified at that point.

### Failure modes the rule prevents

- A developer copy-pastes `<ClientFilters>` into the statements module and customises it → drifts from the canonical input. Spec mandates reuse.
- A developer modifies `<ClientFilters>` to break URL-filter mode → both surfaces break. The component change must add a `mode` prop with explicit dispatch, never a behaviour swap.

---

## Decision 5 — `quick-filters.ts` is a pure helper, not a method on the modal

### The question

The legacy modal has the 8 quick-filter definitions inline plus an
`applyQuickFilter()` method that switches on `filter.type` vs `filter.days`.
The conversion logic (`Date` math for "Este mes", "Mes anterior", etc.) lives
inside the Vue component.

Should the new modal inline the same logic, or extract it?

### The decision

**Extract to `src/ops/statements/quick-filters.ts`** as a pure function
`resolveQuickFilter(filter, now)` that returns `{ from: Date; to: Date }`.

### Why

- **Pure function is testable in isolation.** Unit tests cover the 8 filter cases + edge dates (Feb 29, Dec 31 → "Mes anterior" → Nov 30) without mounting Vue.
- **Reuse from a future bulk surface.** If `extend-ops-statements-bulk` later lands, the bulk page calls the same helper.
- **The Vue component stays presentational.** No domain logic in the template.

### Alternatives considered

- **Inline the switch in the modal.** Rejected for the testability reason — the date math has off-by-one risk on month boundaries that's easy to break in a Vue refactor.
- **Use a third-party date helper (date-fns) directly in the template.** date-fns IS used by the implementation (we already depend on it for the `<DatePicker>`); the helper wraps date-fns in domain semantics, not bypasses it.

### Failure modes the rule prevents

- A developer fixes a date bug in the modal but the bulk page (when added later) still has the bug. The helper centralises the math.
- A developer changes the calendar but forgets to update the chips. Tests on `quick-filters.ts` are independent and would not catch that — but tests on the modal that call the helper + assert the calendar reflects the resolved range would. The helper is the foundation; modal tests still verify integration.

---

## Decision 6 — Single-account-per-statement preserved

### The question

The legacy modal enforces exactly-one-account per statement (the account picker
is single-select). Backend `POST /statement` accepts only a single `account_id`.

Could the new modal allow multi-account selection (one statement covering
multiple accounts of the same client, possibly multi-currency)?

### The decision

**No — single-account preserved.** The picker stays single-select, the payload
stays single `account_id`.

### Why

- **The backend doesn't accept multi-account.** Spec parity with the API contract.
- **The legacy doesn't surface a need.** Operators who want statements for multiple accounts of the same client run the flow once per account; it's slightly tedious but not blocking.
- **Multi-account on the same PDF raises layout questions** (one-per-page? consolidated? per-currency totals?) that are product decisions, not migration decisions. The migration does NOT make product decisions.

### Trade-off

If product later wants multi-account statements, a `MODIFIED Requirement` on
this capability changes the picker to multi-select AND coordinates with the
backend to accept `account_ids[]`. Both halves change in lockstep.

### Alternatives considered

- **Allow multi-select with a frontend loop (one POST per account).** Rejected — N PDFs in N tabs is a worse UX than the operator running the flow N times deliberately. Also opens N tabs at once which most browsers block.
- **Allow multi-select; submit one at a time with a progress indicator.** Considered. Rejected for v1 — adds modal state-machine complexity for a use case product hasn't validated.

### Failure modes the rule prevents

- A developer makes the picker multi-select "since accordion supports it" → backend rejects, operator confused. Spec mandates single-select.

---

---

## Decision 7 — Quality-of-life refinements over the legacy modal (NOT 1:1 migration)

### The question

Migrations have two failure modes: (1) over-engineering by re-imagining every
feature, and (2) under-engineering by porting the legacy verbatim and missing
the moment to fix obvious gaps. The legacy `Generar Statement` modal has small
UX papercuts that don't justify their own follow-up changes but are cheap to
fix during the migration:

- Single-account clients still see the accordion (one click of friction per generation).
- The date range resets every time, even when the operator generates 5 statements in a row with the same range.
- The user doesn't see a confirmation summary before the generation starts (which can take seconds and produces a costly PDF).
- A hung POST has no cancel affordance — the operator stares at the spinner.
- If the operator's pop-up blocker eats the new tab, the URL is lost.

Should we migrate verbatim and ship follow-ups for each, or land the
refinements in v1?

### The decision

**Land 5 refinements in v1.** Each is pure-frontend, low-cost (≤ 30 LOC each),
and turns the modal from "form that fires-and-forgets" into a tool operators
choose to use repeatedly.

| # | Refinement | Frontend cost | Operator value |
|---|---|---|---|
| 7a | **Smart single-account default**: client with exactly 1 account auto-selects it; flow advances to step 3 | 1 condition + 1 effect | -1 click on the most common case (single-account clients) |
| 7b | **localStorage range persistence**: the last-chosen range (or the active quick-filter chip) is saved per operator and pre-populated on the next opening; the user can override at any time | 1 ref + 1 watcher | Generating 5 statements in a row no longer requires re-picking the range each time |
| 7c | **Pre-submit preview card**: when the user reaches the all-three-selections state, a summary card appears above the submit button with `Cliente · Cuenta · Rango`; this is NOT a separate step, it's an in-place confirmation that reads "you're about to generate X" | 1 component + 1 conditional render | Operator sees what's about to happen; reduces "wrong client / wrong account" mistakes that produce wasted PDFs |
| 7d | **Cancel during submit**: while the POST is in flight, the `Generar` button transforms into a `Cancelar` button bound to `AbortController.abort()`; on cancel, the modal stays open with selections preserved | 1 ref + 1 effect + 1 state branch | Operator regains agency when the backend hangs (no more browser-tab-close to escape) |
| 7e | **Re-open success toast**: the success toast keeps a `Volver a abrir` link for 10 s after the new tab opens; clicking it calls `window.open(url, '_blank')` again with the cached URL | ~10 LOC + 10 s timer | Accidentally-closed tabs can be re-opened without re-generation |

### Why these five (and not more)

The 5 refinements share three properties:

1. **Pure-frontend.** No backend coordination needed — the migration scope stays bounded.
2. **Low coupling.** Each can be added or removed independently; one's failure does not break the others.
3. **Operator-asked.** When migrating from a tool the team uses daily, "I wish I could cancel" / "I wish it remembered the range" / "I wish I could re-open" are real, low-effort wins.

Refinements explicitly OUT for v1 (deferred):

- **Recently-generated panel** (in-modal mini history of the current session). Standalone follow-up because it's a new section, not a flow refinement.
- **Format selector** (PDF / CSV / Excel). Needs backend.
- **Email-to-client button**. Needs backend + verified email + audit semantics.
- **Statement variants** (full / summary / movements-only). Needs backend.
- **Range-too-long warning UI**. Backend hasn't declared a hard limit; warning without a real threshold is noise.
- **Dry-run preview** (count of movements + total amount before generating). Needs backend `/statement/preview`.
- **Keyboard shortcut Cmd+G to open the modal**. Nice-to-have; goes to the global shortcut registry follow-up when that lands.

### Failure modes the rule prevents

- A developer ports the legacy verbatim "to scope-control" → ships a worse-than-necessary tool. Spec mandates the 5 refinements.
- A developer interprets "we can sophisticate" as carte blanche to add 15 features → blows scope. Spec lists exactly 5; anything else is a follow-up.
- A developer skips the spec for refinements as "implementation details" → no test coverage of the smart-default / persistence / cancel logic. Spec contracts each refinement as a Scenario in Requirement 3 (smart default), Requirement 4 (persistence), Requirement 5 (cancel + re-open toast), or Requirement 8 (preview card).

---

## Cross-capability composition

| Capability | What it owns | What `ops-statements` owns |
|---|---|---|
| `core-layout` | AppShell, page header, L1 / L2 / L3 layout | Two header CTAs (one on master, one on detail) |
| `core-modals` | Centred modal pattern, focus trap, keyboard escape | The modal mount + the internal step state machine |
| `core-forms` | Field types incl. `<DatePicker mode="range">`, vee-validate | Date picker integration (no separate form schema needed — the modal uses local refs since the flow is 3 steps + submit, not a long form) |
| `core-api-layer` | `apiClient` + `ApiError` | `POST /statement` wrapper + `StatementResult` discriminated shape |
| `core-error-handling` | Skeleton, toast, EmptyState | Surface rendering for the modal's loading / error states |
| **`ops-clients`** | `<ClientFilters>` autocomplete; client + accounts hydration | Reuse of the autocomplete in picker mode + the accounts-by-currency render shape |

---

## Open questions

1. **`<ClientFilters>` mode prop API.** The component currently emits filter-applied semantics. Adding picker mode is straightforward but the API shape (a `mode` prop vs. exposing a `picker` slot vs. a separate `<ClientPicker>` thin wrapper) is decided in the implementation phase. The spec contracts the behaviour ("autocomplete that emits a single picked client"), not the API surface.
2. **Statement history surface.** Out of scope for v1. When product wants it, the follow-up `extend-ops-statements-history` adds a `<RecentStatements>` section to the detail page (per Decision 1 — same surface, new section).
3. **Audit trail for generated statements.** Currently the legacy does NOT surface "who generated this statement and when". Backend likely has the audit row. When a manager wants to know, the follow-up adds a Drawer-based audit view (canonical pattern from `core-modulo-genericos` Inbox profile B).
4. **Backend transactional + caching.** The backend SHOULD return a stable URL when the same `(client_id, account_id, date_from, date_to)` is requested twice (idempotent caching) so accidentally-clicking-twice doesn't generate two PDFs. Out of scope for the frontend; flagged for backend coordination.
