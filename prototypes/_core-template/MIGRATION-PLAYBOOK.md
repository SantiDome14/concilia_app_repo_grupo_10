---
status: active reference — read before starting any prototype migration
created_at: 2026-05-08
source: lessons learned from the OPS migration (6 capabilities, 249 tests, ~19k legacy LOC → ~6.8k new LOC)
applies_to: prototypes/lex, prototypes/trd, prototypes/clp, future Ardua core apps
---

# Migration Playbook

> **Read me first** when migrating an Ardua core app from a legacy frontend
> into the `_core-template`-derived shape. This is the playbook of patterns
> validated end-to-end by the OPS migration; applying it on LEX, TRD, CLP,
> and future apps avoids re-discovering the same lessons.
>
> **What this is.** A pattern library + a PR review checklist. Read it as
> you scope a change; revisit it when you're tempted to deviate.
>
> **What this is NOT.** A spec — capabilities live in
> `openspec/specs/`. A substitute for the per-prototype `MIGRATION-NOTES.md`
> — those are the legacy inventory for the specific app being migrated.

---

## Table of contents

1. [When to apply this playbook](#when-to-apply-this-playbook)
2. [The decision framework](#the-decision-framework)
3. [Architectural patterns (validated by OPS)](#architectural-patterns-validated-by-ops)
4. [Quality-of-life refinements canon](#quality-of-life-refinements-canon)
5. [Antipatterns to avoid](#antipatterns-to-avoid)
6. [PR review checklist](#pr-review-checklist)
7. [Reference: OPS archived changes](#reference-ops-archived-changes)

---

## When to apply this playbook

**Always**, at the start of:

- A new `add-<app>-<module>` change scoping a domain capability.
- A new `extend-<app>-<module>-<feature>` follow-up.
- A `migrate-<legacy-page>` change that ports a legacy view.

The playbook is the **first read** before writing the proposal. The
proposal's `Why` section refers back to specific patterns here when their
choice is non-obvious.

---

## The decision framework

Every migration change makes the same five decisions, in this order:

1. **What's the canonical shape?** (Type-A master list · Type-B detail · Type-A with sub-module tabs / Módulo B · Modal-only feature)
2. **What's the route surface?** (Page · Modal · Drawer · combination)
3. **What's IN scope for v1?** (Read-only first; mutations to follow-ups)
4. **Which capabilities does it compose?** (`core-*` primitives + sibling `<app>-*` capabilities)
5. **Which 5 (or fewer) quality-of-life refinements does v1 land?**

If any decision drifts from a documented pattern, the `design.md` MUST
explain why with a `Failure modes the rule prevents` paragraph. **Drift
without justification is rejected at PR review.**

---

## Architectural patterns (validated by OPS)

### Pattern 1 — Type-A unification (collapse legacy multi-route splits)

**The smell:** legacy ships 2–4 routes for what is conceptually one page (master list + detail-as-route + edit-as-route, or shell + child routes for tabs).

**The rule:** unify into a single Type-A page per `core-module-types`. Sub-views become tabs (when they have parallel data shapes), modals (when they're flash-creation flows), or drawers (for record drill-downs). The legacy URLs SHALL redirect to the unified shape; bookmarks must keep working.

**Examples:**
- `ops-instructions` collapsed `/settings/instructions/*` (3 routes → 1 page + 3 modals).
- `ops-psp` collapsed `/psp/home + /psp/accounts` (2 routes → 1 page + 3 tabs).
- `ops-clients` collapsed `/users + /clients/:id` (path renamed, master + detail kept as separate routes because the detail is dense Type-B).

**Failure mode the rule prevents:** porting the legacy multi-route split 1:1, perpetuating the artificial boundary the legacy didn't have a primitive to remove.

### Pattern 2 — Módulo B shape (treasury-style modules)

**When to apply:** the page covers a domain with multiple cohesive sub-views over the same operational data (balances + ledger + accounts; positions + flows + queue). Examples: PSP integration partners, treasury dashboards, financial dashboards.

**The shape:** Type-A page with **3 internal sub-module tabs** (NOT segmentation — these are sub-modules within ONE page). The reference implementation is `_core-template/src/pages/ModuloB.vue`. Adopt the same chrome (tab indicator above the body; per-tab data fetched lazily; URL-reflected active tab).

**Examples:**
- `ops-psp` → tabs `Disponibilidad / Movimientos / Cuentas` over the **Banco Sponsor** abstraction.
- `ops-financial-dashboard` → 2-tab variant `Activity / Quotes` (no third tab needed, but same Type-A-with-tabs shape).

**Open-set vocabulary:** when the legacy hardcodes a single integration partner (`COINAG`), Pattern 4 mandates the catalog be open-set from day one.

### Pattern 3 — Read-only first migration policy

**When to apply:** a legacy page or module > ~3 000 LOC where the bulk of the LOC is creation/mutation modals (Create Movement, multi-step wizards, file imports).

**The rule:** v1 of the capability migrates **only the read side + Whitelist-style integrations already shipped in sibling capabilities**. Every other modal (Create Movement, Pay Quote, Import SWIFT, Edit Label, CSV Export, etc.) defers to a focused `extend-<capability>-<feature>` change.

**Why it works:**
- The architectural shape lands first (tabs, filters, table column sets, drill-down drawer, capability gating). The shape is what the rest of the migration depends on; getting it right is more valuable than 1:1-migrating every modal.
- Each deferred modal gets its own design pass that fits the new primitives (probably `core-multi-step-form`, `core-file-upload`, etc.) instead of being a 1:1 port of legacy branching code.
- LOC reduction averages **60–70 %** in v1 (legacy → new). The deferred modals add LOC back over time but with proper structure.

**Examples:** `ops-psp` (9k legacy LOC → 1.4k new); `ops-financial-dashboard` (6.6k → 1.4k).

**OUT-of-scope discipline:** every deferred mutation MUST be enumerated in the proposal's `### Removed from scope` list with a **named follow-up change** (`extend-ops-psp-create-movement`, etc.). No "TBD"; no "we'll see"; the deferral is a commitment.

### Pattern 4 — Open-set abstractions from day one

**The smell:** the legacy hardcodes a single instance of what is conceptually an open set (`'COINAG'`, `'BBVA'`, `'es-AR'`, the only currently-active sponsor, the only locale, etc.).

**The rule:** the spec NEVER hardcodes the single instance. The code sources the catalog from a single config file (e.g. `src/ops/psp/sponsor-catalog.ts`) so adding a new entry later is a **one-file change** — the rest of the codebase loops over `activeEntries()`.

**Concrete shape:**
```ts
// src/ops/psp/sponsor-catalog.ts
export const SPONSOR_CATALOG: ReadonlyArray<BancoSponsor> = [
  { code: 'COINAG', label: 'COINAG', active: true,  ... },
  { code: 'BIND',   label: 'BIND',   active: false, ... }, // roadmap
  ...
];
export function activeSponsors(): BancoSponsor[] { ... }
export function getSponsorByCode(code: string): BancoSponsor | null { ... }
```

**Failure modes the rule prevents:**
- Hardcoded `if (sponsor === 'COINAG')` scattered across the codebase. When the second integration partner lands, every reference becomes a refactor.
- Single-banner alert slot that doesn't accept an array. When two sponsors report a mismatch simultaneously, the second banner overwrites the first.

**Examples:** PSP-1 `Banco Sponsor` catalog (Coinag + BIND + Banco de Comercio).

### Pattern 5 — Drawer vs Modal vs Page (drill-down decision)

| Need | Surface | Rationale |
|---|---|---|
| Read-mostly detail of a single record (long table + metadata) | **Drawer (right-side `<Sheet>`)** | Keeps the parent list mounted; navigation between records is one click |
| Centred form / confirmation / single-record creation | **Modal (`<Dialog>`)** | Focus-trap; forms are usually short |
| Workflow-typed record (Inbox message, Alerta workflow) | **Canonical `<Drawer>` from `core-modulo-genericos`** | Has the workflow chrome (status badge, primary-actions slot, timeline, comments) |
| Bookmarkable / cross-tab / back-nav target | **Full route** | URLs are the share unit |
| Side-by-side preview + form | **Modal with `xl`/`2xl` width** | Justified width override; documented in design.md |

**Examples:**
- `ops-psp` Cuentas drill-down → SWIFT transactions in **right-side `<Sheet>`** (NOT modal — the SWIFT table is wide).
- `ops-account-instructions` wizard → modal with `xl` width to fit the live letter preview side-by-side (Decision 4).
- `ops-clients` detail → full route `/clients/:id` (NOT modal — the page is dense Type-B with multiple sections).

**Failure mode the rule prevents:** defaulting everything to modals because they're "easier" — drill-downs in a centred 720 px modal force horizontal scroll on dense data.

### Pattern 6 — Cross-capability composition (NOT duplication)

**The smell:** two capabilities need the same modal/component (e.g. `<WhitelistAccountModal>` from `ops-clients` is also needed by `ops-psp`'s Habilitar cuenta CTA).

**The rule:** the component lives in **ONE canonical home** (the capability that owns its primary use case); other capabilities **import from that path**. NO copy-paste.

When the consumer needs additional behaviour (e.g. `ops-psp` needs the modal to also work without a pre-bound `clientId`), extend the component's API (added prop, added emit, optional step prefix). The extension is **non-breaking** for the existing consumer; the spec contract on the original capability is **NOT modified** — only the component's API surface grows.

**Examples:**
- `<WhitelistAccountModal>` lives in `ops-clients`; `ops-psp` imports it and added a `'pick-client'` step prefix when `clientId === null` (Decision 5 of `add-ops-psp`).
- `<MovementDetailsModal>` lives in `ops-financial-dashboard`; the future `extend-ops-psp-movement-details-modal` imports it (Decision 2 of `add-ops-financial-dashboard`).

**Failure modes the rule prevents:**
- Two implementations drift over time; bug fixed in one, not the other.
- Test coverage doubles; two tests assert the same behaviour.

### Pattern 7 — Discriminated result types (vs throwing)

**The smell:** API wrappers throw `ApiError`; the calling component does `try / catch` + `if (e instanceof ApiError && e.status === 409 && ...)` chains.

**The rule:** API wrappers that have multiple error categories return a **discriminated union**. The component pattern-matches on `result.status` instead of inspecting `ApiError`.

**Concrete shape:**
```ts
export type WhitelistResult =
  | { status: 'ok' }
  | { status: 'already_whitelisted' }
  | { status: 'exist_internal_route' }
  | { status: 'failed'; message: string };

const result = await whitelistAccount(clientId, body);
switch (result.status) {
  case 'ok': /* close modal + invalidate cache */ break;
  case 'already_whitelisted': /* inline error */ break;
  case 'exist_internal_route': /* inline error */ break;
  case 'failed': /* generic toast */ break;
}
```

**Categories that should always be discriminators:**
- `'aborted'` — `AbortController` cancellation (vs error).
- `'cvu_already_exists'` / `'validation_error'` / domain-specific 409s.
- `'business-error'` — backend `success: false` with message (legacy envelope).

**Examples:** `WhitelistResult`, `AccountInstructionResult`, `StatementResult`, `SaveResult` (instructions two-phase save).

**Failure mode the rule prevents:** throwing inside the component's `try`, then forgetting one error case + the user sees a stale "loading" state forever.

### Pattern 8 — Pure helpers extracted to standalone files

**The smell:** date math, string interpolation, classification logic baked into a `.vue` component method.

**The rule:** extract to `src/<app>/<module>/<helper-name>.ts`. Pure functions, no Vue imports, no side effects. Vitest covers the helper in isolation.

**Common helper categories:**
- **Date math** — `quick-filters.ts` (8 chips → `{from, to}` ranges) for `ops-statements`.
- **Variable interpolation** — `interpolation.ts` (`{docket}` / `{name}` / `{tax_number}` substitution + SWIFT-rule overlay) for `ops-account-instructions`.
- **Classification** — `portal-status.ts` (`metadata.status` → tone + label) for `ops-clients`.
- **Open-set catalogs** — `sponsor-catalog.ts` for `ops-psp`.
- **Persistence** — `range-storage.ts` (statements) / `draft-storage.ts` (account-instructions) — localStorage round-trip with defensive parsing.

**Test convention:** the helper has its own `<helper>.spec.ts` with ≥6 tests covering: happy path · edge dates · null inputs · malformed inputs · round-trip.

**Failure mode the rule prevents:** off-by-one in date math (e.g. "Mes anterior" on March 1 returning Feb 30) silently breaks because no test catches it.

### Pattern 9 — Capability gating inline with `OPS_ADMIN` fallback

**Until `add-<app>-roles` lands**, every capability gate uses the canonical shape:

```ts
const canDoX = computed(() => can('app:domain:action') || can('OPS_ADMIN'));
```

The `OPS_ADMIN` fallback (or `LEX_ADMIN` / `TRD_ADMIN` per app) makes the inline gate work in "first-run" mode where the role matrix isn't consolidated yet. When `<app>-roles` consolidates, a follow-up change replaces every fallback with the canonical capability string.

**Examples:** `clients:invite || OPS_ADMIN`, `psp:read || OPS_ADMIN`, etc.

**Failure mode the rule prevents:** shipping a capability that's `disabled` for everyone because the canonical capability string isn't declared yet.

### Pattern 10 — Component emits, parent mutates (vue/no-mutating-props)

**The smell:** child component mutates `props.formState.foo = bar` and the linter rejects with `vue/no-mutating-props`.

**The rule:** child emits `update:<key>` events; parent (the page or modal) holds a reactive `formState` and applies the mutation. The shared state is owned by ONE component.

**Concrete shape:**
```vue
<!-- Step component -->
<script setup>
const emit = defineEmits<{ 'update:account-id': [value: string | null] }>();
function pick(id) { emit('update:account-id', id); }
</script>

<!-- Modal (parent) -->
<AccountStep :form-state="formState" @update:account-id="(v) => formState.selectedAccountId = v" />
```

**Failure mode the rule prevents:** lint failures + state drift when the same prop is mutated from multiple step components without coordination.

### Pattern 11 — Wizard primitive vs hand-rolled state machine

**Use `core-multi-step-form`'s `useWizard()` + `<Wizard>`** when:
- The flow has 3+ steps with progressive validation.
- The state machine is otherwise straightforward (back button + next button + submit).

**Use a hand-rolled state machine** when you need:
- A **cancel-during-submit** swap on the submit button (the canonical Wizard footer doesn't support it).
- **Per-client localStorage draft persistence** (the canonical Wizard's `sessionStorage` persistence is keyed by `wizardId`, not per-record).

**Example of hand-rolled override:** `ops-account-instructions::CreateAccountInstructionModal.vue` uses `useWizard`-style step gating but hand-rolls the footer + persistence (per Decision 3 of `add-ops-account-instructions`). The deviation is documented; the Wizard primitive is reused for everything else.

### Pattern 12 — Modal width override is justified, not casual

**Default:** `sm:max-w-lg` (~720 px) per `core-modals` for centred dialogs.

**Override allowed when:**
- The modal hosts a side-by-side preview (form + live preview) — use `xl` (~960 px) or `2xl`.
- The modal is a wizard with multiple panes that don't fit `lg`.

**Override NOT allowed for:**
- Aesthetic preference ("looks better wider").
- 1:1 legacy parity ("the legacy was wider").

**The override SHALL be documented in `design.md`** with a `Decision N — Modal width is X, NOT the canonical lg` block stating why.

**Example:** `ops-account-instructions` Decision 4 — `xl` width because the live letter preview is A4-aspect and needs ~400 px next to a 400 px input column.

---

## Quality-of-life refinements canon

Migrations are not 1:1 ports. Each change SHOULD land **3–5 quality-of-life
refinements** that the legacy didn't have. These are pure-frontend, low-cost,
operator-asked. Decision 7 (or whichever number it ends up) of design.md
documents them as a table with frontend cost + operator value.

The **canonical refinements** validated across OPS (cherry-pick what fits
the surface):

| # | Refinement | Where it shines |
|---|---|---|
| **A** | **Smart single-X default** — when the choosable list has exactly one item, auto-select it; flow advances by one step | Account selector with one non-ARS account; Template selector when only one matches the rail |
| **B** | **localStorage persistence** — last-chosen tab / last-chosen range / draft of the wizard / selected period | Statements modal range; Account-instructions wizard draft; PSP last-active tab; Financial-dashboard last sub-toggle |
| **C** | **Pre-submit preview card** — a `Resumen` card consolidates all selections before the primary CTA enables | Statements; Account-instructions wizard; PSP whitelist confirm |
| **D** | **Cancel during submit (`AbortController`)** — the primary CTA transforms into `Cancelar` while the request is in flight; aborts the request and preserves selections | Statements; Account-instructions; PSP whitelist; any submit with backend > 1s |
| **E** | **URL sync of state + deep-links** — every meaningful UI selection (active tab, sub-toggle, filters, drilled-down record id) is reflected in the URL; bookmarks share specific views; back-button navigation restores | Every change since `ops-clients` |
| **F** | **Re-open success toast** — the success toast keeps a `Volver a abrir` button for 10 s after a tab opens; recovers from accidentally-closed tabs | Statements (download URL); receipts |
| **G** | **Inline field-level validation mapping** — backend `errors[]` maps to inline messages on the corresponding form inputs (NOT a toast list) | Account-instructions; any wizard with backend validation |
| **H** | **Stackable + dismissible alert area** — multi-instance alerts (one per sponsor with mismatch) collapse to a per-session pill | PSP reconciliation banner |

**Don't ship 8 refinements at once.** Pick the 3–5 highest-leverage for the
surface; defer the rest. Refinements explicitly OUT of scope SHALL be listed
in `design.md`'s OUT block, NOT in code with a `// TODO`.

---

## Antipatterns to avoid

These are the mistakes that were caught (or almost made) during OPS. If a
review surfaces one of these, send the change back.

1. **❌ Forfeiting primitives** — re-implementing `core-data-tables`, `core-modals`, `core-multi-step-form` instead of using them. **✅** Always reach for the primitive first; deviations need a `Decision N` block.

2. **❌ Component duplication cross-capability** — copying `<WhitelistAccountModal>` into `ops-psp` because "we need a slightly different version". **✅** Extend the component's API (added prop / emit / optional step), document the extension in the consuming capability's design.md.

3. **❌ Hardcoded single-instance catalog** (`if (sponsor === 'COINAG')`). **✅** Open-set catalog from day one (Pattern 4).

4. **❌ Mutating props from child components** (`vue/no-mutating-props`). **✅** Emit + parent mutates (Pattern 10).

5. **❌ Throwing `ApiError` for domain-specific errors** (forces `try/catch + instanceof + status check` everywhere). **✅** Discriminated result type (Pattern 7).

6. **❌ Inline domain logic in `.vue` templates** (date math, interpolation, classification). **✅** Pure helper file + Vitest coverage (Pattern 8).

7. **❌ "Big bang" full migration with every modal** for 6k+ LOC pages. **✅** Read-only first; defer modals with named follow-ups (Pattern 3).

8. **❌ Promote a sub-toggle to a top-level tab** when the data shape is identical. **✅** URL param + canonical sub-toggle (Decision 4 of `add-ops-financial-dashboard`).

9. **❌ Drawer for creation flows / Modal for record drill-down** — pattern mismatch. **✅** Drawer for read-mostly drill-down; Modal for centred forms / confirmations (Pattern 5).

10. **❌ Step-up MFA "for consistency"** — applying MFA to every mutation. **✅** Step-up only when the operation crosses a trust boundary (e.g. SignUp creates portal credentials). Statement generation, instruction creation, movement details — NO step-up (operational data the operator already has authority over).

11. **❌ Test stubs that ignore Teleport** — `<Dialog>` content is teleported by reka-ui; jsdom doesn't project the portal. **✅** Stub `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` with inline-rendering setup objects in the test (see `MovementDetailsModal.spec.ts` for the canonical stub shape).

12. **❌ Lint rule traps** — `import()` type annotations break `@typescript-eslint/consistent-type-imports`; `import type * as foo from '@/lib/foo'` is the workaround. Generic `<script setup generic>` rejecting named `interface Props` — inline the type in `defineProps<{...}>()`. These traps are documented in CLAUDE.md / AGENTS.md "Code Conventions".

13. **❌ `package.json` resolution from worktree path** — when the bash shell `cwd` is the worktree path (`prototypes/.claude/worktrees/.../`), `npm` doesn't find `package.json`. **✅** Run `npm` from `prototypes/<app>/` explicitly with `cd` or `npm --prefix=...`.

14. **❌ Pre-existing failing test ignored silently** — `validateManifest.spec.ts` failed since `01cd08c` (fin-old removed); easy to ignore as "not mine". **✅** Ignore is fine but flag it explicitly in commit message + as a follow-up (`chore: remove fin-old manifest acid-test` or similar).

---

## PR review checklist

Use this when reviewing or self-reviewing a migration change.

### Spec hygiene

- [ ] Capability declares `## ADDED Requirements` (NOT `## Requirements`) — required for new capabilities inside changes.
- [ ] Each Requirement has at least 3 `#### Scenario:` blocks (≥3 for behavioural Requirements; 2 for purely structural ones).
- [ ] Each Requirement contains `MUST` or `SHALL` (lowercase variants are rejected by `openspec validate --strict`).
- [ ] Requirements are numbered logically (read top-to-bottom = read the user flow).
- [ ] No requirement says "should consider" / "may eventually" — be concrete or defer to a follow-up.

### Design.md hygiene

- [ ] Every non-obvious decision has a `Decision N` block with: question · decision · why · alternatives considered · failure modes the rule prevents · trade-off (optional).
- [ ] The OUT-of-scope list is concrete: every deferred feature has a **named follow-up change** (`extend-<capability>-<feature>`).
- [ ] Cross-capability composition table lists every sibling capability the change touches, with what each owns.
- [ ] Open questions section is non-empty (no migration is pristine; document the deferred decisions).

### Proposal.md hygiene

- [ ] `### Affected Capabilities` is empty when the change does NOT modify sibling specs (composition is NOT modification).
- [ ] `### New Capabilities` declares the spec stats: `N requirements, ~M scenarios`.
- [ ] `### Removed from scope` is concrete with named follow-ups (matches design.md OUT).

### Implementation hygiene

- [ ] Pure helpers extracted to `<module>/<helper>.ts` with Vitest coverage.
- [ ] API wrappers return discriminated result types (NOT throw) for domain-specific error categories.
- [ ] Component emits + parent mutates pattern (no `vue/no-mutating-props` violations).
- [ ] Cross-capability components are imported (NOT copied) from their canonical home.
- [ ] Open-set catalogs (sponsor / locale / currency / etc.) live in a single `<catalog>.ts` file; no hardcoded single-instance branches.
- [ ] Modal width override (anything beyond `sm:max-w-lg`) is documented in design.md.
- [ ] Step-up MFA gating ONLY on operations that cross a trust boundary.

### Tests hygiene

- [ ] Pure helpers: ≥6 tests covering happy path · edge cases · null inputs · malformed inputs · round-trip.
- [ ] API wrappers: tests for happy path · each discriminated error · transport failure · `AbortController` (when applicable).
- [ ] Component tests stub Dialog/Sheet primitives that use Teleport (jsdom doesn't project portals).
- [ ] `localStorage` / `sessionStorage` tests `beforeEach(() => storage.clear())`.

### Validation gates

Before commit, run:

```bash
cd prototypes/<app>/
npm run type-check     # vue-tsc --build
npm run lint           # eslint . --fix
npm run test:run       # vitest run
npx openspec validate <change-id> --strict
npx openspec validate --all --strict
npm run build:qa
```

All must pass. Pre-existing failures (e.g. `validateManifest.spec.ts`) are
documented in the commit message but do NOT block the commit if unrelated.

### Commit message hygiene

- [ ] Conventional shape: `feat(<app>): implement <capability> capability (N tests + Y refinements)`.
- [ ] Body lists the 3–5 quality-of-life refinements with letter codes (7a/7b/7c/7d/7e or A/B/C/...).
- [ ] OUT-of-scope features named explicitly with their follow-up change names.
- [ ] Validation gates summary line: `type-check + lint + test:run (X/Y new + A/B overall) + spec:check (N/M) + build:qa`.

---

## Reference: OPS archived changes

The OPS migration is the canonical worked example. Each archive folder is a
complete worked-out instance of the patterns above. **When in doubt, read
the archived `design.md` of the closest analogue.**

Located at `prototypes/ops/openspec/changes/archive/`:

| Date | Change | Key patterns instantiated | Tests added |
|---|---|---|---|
| 2026-05-08 | `add-ops-instructions` | Type-A unification (3 routes → 1 page + 3 modals); two-phase save with retry banner; key-value-array primitive | 22 |
| 2026-05-08 | `add-ops-clients` | Type-A master + Type-B detail (NOT modal); single helper `derivePortalStatus`; one-Dialog-2-step-state-machine; cross-capability `<WhitelistAccountModal>` reuse | 31 |
| 2026-05-08 | `add-ops-statements` | Modal-only feature; pre-submit preview card; cancel during submit; localStorage persistence; reuse `<ClientFilters mode="picker">` | 39 |
| 2026-05-08 | `add-ops-account-instructions` | Wizard with `<Wizard>` primitive override; pure interpolation helpers; live A4 preview side-by-side; localStorage draft persistence per client; inline field-level validation | 67 |
| 2026-05-08 | `add-ops-psp` | Módulo B shape; Banco Sponsor open-set abstraction; stackable reconciliation banner; sponsor cards click-to-filter cross-tab; auto-refresh 60 s; Drawer drill-down for accounts | 53 |
| 2026-05-08 | `add-ops-financial-dashboard` | Type-A with 2 tabs; sub-toggle as URL param (NOT third tab); `MovementDetailsModal` as canonical home for cross-capability reuse; legacy `/dashboard` redirect (NOT `/`) | 37 |

**Total OPS migration:** 6 capabilities · 249 tests · ~19 000 legacy LOC → ~6 800 new LOC (64 % reduction) · 26 follow-up changes nominated.

Each archive contains:
- `proposal.md` — Why + What Changes + Capabilities + Removed from scope.
- `design.md` — Architectural decisions + cross-capability composition + open questions.
- `tasks.md` — Spec deltas + validation gates + follow-up changes.
- `specs/<capability>/spec.md` — The frozen ADDED Requirements with scenarios.

---

## Document maintenance

This file is updated when a migration completes and surfaces a **new** pattern
worth canonising (or when an antipattern recurs across changes). When you
update it:

- Add the pattern with a worked example (legacy smell → rule → example).
- Mention which migration's archived `design.md` is the reference.
- Update the "validated by" header at the top.

The file is **not** updated for one-off tactical decisions; those live in
the per-change `design.md`.
