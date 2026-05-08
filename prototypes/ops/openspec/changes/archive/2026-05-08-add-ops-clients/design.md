# Design — add-ops-clients

## Context

This design captures the rationale behind the **Type-A master + Type-B detail composition** for
the OPS clients dominio, and the trade-offs of the two nested modals (SignUp + Whitelist). The
capability is the **second OPS migration change** after `ops-instructions` and the first one to
exercise both module types in the same change. It also lands the canonical PSP-aware whitelisting
flow (a 2-step modal that talks to two backends — OPS + PSP — sequentially).

The legacy is misnamed: `UserDashboard.vue` registered at `/users` is in fact the clients master,
and `SignUpUserModal.vue` does NOT create a system user but invites an existing client to onboard
the portal. The migration unwinds the misnomer (page becomes `Clients.vue` at `/clients`; the
modal becomes `SignUpUserModal.vue` under `src/ops/clients/` to avoid colliding with any future
generic-user flow).

---

## Decision 1 — Master + Detail as separate pages, not master + Detail modal

### The question

`ops-instructions` chose "one page + Detail modal" because the detail surface for an instruction
is small enough (4 fields + an attributes list). For clients the detail is heavier:

- Client info card (name, tax, docket, email, active flag).
- Accounts section: N accounts, each expandable to show its instructions with Copy + Letter actions.
- Recent movements table.
- Two CTAs (Whitelist + Create Instruction) anchored to the accounts section.

Should the detail be a modal (consistent with `ops-instructions`) or a full route?

### The decision

**Full route at `/clients/:id`.** Type-B detail page, NOT a modal.

### Why

- **Density.** The detail has ~5 sections; cramming them into a centred modal forces a horizontal scroll or unreadable density. The modal canon (`core-modals`) caps width at ~720 px for centred dialogs.
- **The legacy already uses a route.** `/clients/:id` is the existing canonical URL — no need to break it.
- **Direct linking from other surfaces.** When `ops-financial-dashboard` migrates later, its movements table will link to `/clients/:id` from the `From`/`To` columns. A modal-only detail would force the dashboard to navigate to `/clients?detail=:id`, which is awkwarder.
- **`core-module-types` Type-B explicitly contracts this shape** (header + dense sections + sticky CTAs).

### Alternatives considered

- **Detail modal (Type-A only).** Rejected for density reasons. The modal would need scroll-within-scroll to fit accounts + movements.
- **Hybrid: master list with a "quick view" Drawer + the full route as the canonical detail.** Considered. Rejected for v1 — the drawer would duplicate every section in compressed form, doubling maintenance. If later a quick-glance drawer is wanted (e.g. for triage in batch operations), it lands as an extension on top of the page.

### Failure modes the rule prevents

- A developer ports `ClientDetail.vue` into a `<Dialog>` to keep "consistency" with `ops-instructions` → modal cuts off the Accounts section. Spec rejects.
- A developer registers `/clients?detail=:id` as the canonical detail URL → spec rejects; the canonical detail is the route, not the query param.

---

## Decision 2 — `Estado Portal` derived by a single deterministic helper

### The question

The legacy `getDisplayType(type)` returns `Cuenta Validada` / `Pendiente de Validación` /
`Cuenta no Creada` based on `metadata.status` (which can be `ACTIVE`, `PENDING`, or empty). The
colour is decided by `getClientStatusColor(type)`, a separate switch. Two helpers, two switch
statements, divergent surfaces — the master list shows the chip, but if the detail page also
needs to show the status it would re-roll the logic.

### The decision

**Single typed helper `derivePortalStatus(client)` in `src/ops/clients/portal-status.ts`** that
returns `{ label: string; tone: 'success' | 'warning' | 'danger'; key: PortalStatus }` so every
surface (table cell, detail page header, future filters, future CSV export) uses the same source
of truth.

### Why

- **Type-safety on the discriminated union.** `PortalStatus = 'active' | 'pending' | 'not-created'` — the helper enforces the closed enum at compile time.
- **Testable in isolation.** Pure function over `Client`; no Vue, no axios. Vitest covers all transitions.
- **Single visual contract.** Tone maps to the canonical semantic colours from `core-theming` (`success` / `warning` / `danger`). If the design system updates the palette, no surface change is needed.
- **Future filter support is trivial.** When a "filter by Estado Portal" filter ships later, the helper's enum becomes the dropdown's options.

### Alternatives considered

- **Inline switch in the column renderer.** Rejected — duplicates everywhere.
- **Computed in the Pinia store.** Rejected — there is no Pinia store for clients in v1 (vue-query owns the cache); putting it in a store creates a fictional dependency.
- **Use a generic `<StatusBadge>` component with `tone` + `label`.** That component does land — `derivePortalStatus()` returns the props for it. They compose; this decision is about the helper, not the component.

### Failure modes the rule prevents

- A developer adds a fourth status (e.g. `BLOCKED`) and updates the table but forgets the detail page → the helper centralises so adding a new status changes one file.
- A developer hardcodes `'success'` in the table and `'green'` in the detail → spec mandates the tone come from the helper.

---

## Decision 3 — Whitelist as a 2-step modal (validate → confirm), not two modals

### The question

The whitelist flow needs:

1. The user enters a CVU/CBU.
2. The frontend validates against PSP (`GET /coinag/account/:cvu`).
3. If validation succeeds, the user picks a currency and reviews the holder data.
4. The user confirms; the frontend calls `POST /clients/:id/whitelist-account` (PSP).

This could be:

- **(A)** Two separate modals chained (validate modal → confirm modal).
- **(B)** One modal that internally advances between two views.
- **(C)** A single-view modal that shows everything at once and validates inline.

### The decision

**Option B.** One `<Dialog>` with an internal `step: 'input' | 'review'` state machine.

### Why

- **One mount, one open/close lifecycle.** Simpler to reason about than chained `v-model:open` flags. Tests don't have to coordinate two modal openings.
- **Validation is the gating step.** The user MUST validate the CVU before currency choice + confirm — the 2-view shape enforces that order without disabling fields awkwardly in a single view.
- **The PSP latency is variable.** Validation can take 1-3 s. A 2-step flow has a clear loading state during validation; a single-view flow turns into "everything disabled while validating", which feels broken.

### Alternatives considered

- **Option A (two modals chained).** Rejected — twice the mount overhead and double the test surface.
- **Option C (single-view).** Rejected for the latency reason. Also: holders/CUIT are returned by PSP and have to render somewhere — without a step transition, the modal shape changes mid-flight.
- **Inline (no modal, dropdown panel anchored to the CTA).** Rejected — the holder data is too dense for a dropdown.

### Failure modes the rule prevents

- A developer skips the validation step and POSTs directly → backend rejects with `exist_internal_route` or `already_whitelisted`. Spec mandates validate-first.
- A developer mounts both modals at once → spec rejects; one modal, two internal views.

---

## Decision 4 — SignUp gated by step-up MFA via `core-auth`

### The question

The legacy `SignUpUserModal.vue` does NOT step-up — it just POSTs `/sign-up` with a bearer token.
The new template ships `core-auth` with `useStepUp()` for sensitive operations
(`loginWithPopup({ acr_values: 'high' })`). Should sending a portal-onboarding email require
step-up?

### The decision

**Yes — wrap the submit in `useStepUp().withStepUp()`** before the `POST /sign-up`.

### Why

- **It IS the canonical sensitive action.** Granting portal access to a client means an outsider gets credentials to view balances and movements. This is the textbook use case for step-up.
- **`core-auth` was just shipped specifically for this kind of action.** Using anything else would mean the template's own MFA case is "skipped".
- **No backend change needed.** The Auth0 step-up returns a fresh token with elevated `acr` in the same flow; the existing `POST /sign-up` doesn't need to know.
- **The legacy missed it.** This is the canonical place to fix that gap during migration.

### Alternatives considered

- **Skip step-up to "match the legacy".** Rejected — the legacy is wrong here, and migration is the moment to land the right pattern.
- **Step-up inside the modal's openHook (gate even opening).** Considered. Rejected because the user should see the form first and pick a client before being asked to MFA — gating only the submit is the right balance.

### Failure modes the rule prevents

- A developer copies the legacy modal verbatim → portal users created without MFA. Spec rejects.
- A developer adds step-up at the page level (gates `/clients` itself) → forfeits the per-action grain. Spec mandates per-action gating.

---

## Decision 5 — `Instruction` (template) and `AccountInstruction` (binding) are different entities

### The question

The legacy uses both terms. `Instruction` lives in `ops-instructions` (already migrated) — a
**template** declaring `name`, `currency_id`, `description`, `attributes[]`. `AccountInstruction`
lives nested under `Account` — a **binding** of a template to an account with `rails[]` and
optional override values. The legacy code mixes the two: the wizard at
`/clients/:id/instructions/create` calls `POST /account-instruction` but is named "Create
Instruction"; the detail page renders `account.instructions[]` which are technically
`AccountInstruction[]`.

### The decision

**Separate the entities in the type system.** `Instruction` (from `ops-instructions/types.ts`)
and `AccountInstruction` (new in `ops-clients/types.ts`) are distinct types with no overlapping
fields beyond `id`.

### Why

- **They serve different purposes.** Templates are catalog; bindings are operational data per client+account.
- **They have different endpoints.** `Instruction` uses `/instruction*`; `AccountInstruction` uses `/account-instruction*`.
- **They have different lifecycles.** Templates outlive bindings; deleting a template should not delete its bindings (or might cascade — TBD with backend).
- **Clear naming prevents the wizard from being conflated with the global Create Instruction modal.** The wizard creates a binding; the global modal creates a template. They are NOT the same flow.

### Trade-off

This means the future `extend-ops-instructions-create-from-client` follow-up will likely create a
NEW capability `ops-account-instructions` rather than extending `ops-instructions`. That decision
is deferred to that change's design.

### Alternatives considered

- **Merge into a single `Instruction` type with optional `account_id` + `rails[]`.** Rejected — pollutes the template type with binding-only fields.
- **Rename `AccountInstruction` to `InstructionBinding` for clarity.** Considered. Rejected because the legacy + backend already use `account_instruction`; gratuitous renaming creates friction at the API boundary.

### Failure modes the rule prevents

- A developer reuses `ops-instructions/types.ts::Instruction` for the detail page's account.instructions[] → template fields leak into binding rendering, type errors at runtime. Spec mandates the separate type.
- A developer wires the wizard at `/clients/:id/instructions/create` to call `POST /instruction` (the template endpoint) → wrong entity. Spec mandates the wizard be deferred and that AccountInstructions use their own endpoints.

---

## Decision 6 — Recent Movements section is read-only in v1

### The question

The legacy `ClientDetail.vue` renders a recent movements table; clicking a row opens a Movement
Details modal that is the same modal used by the `FinancialDashboard.vue` Activity tab. That
modal belongs to `ops-financial-dashboard` (which is not yet migrated and is one of the heaviest
remaining migrations at ~6.6k LOC).

Should this change:

- **(A)** Migrate the Movement Details modal as part of `ops-clients` so the link works.
- **(B)** Defer the modal to `ops-financial-dashboard` and ship the recent movements table as read-only in v1 (no row click).

### The decision

**Option B.** Read-only table in v1.

### Why

- **The modal is canonically owned by `ops-financial-dashboard`.** Moving it here would create a duplicate when that capability lands later.
- **The recent movements table is a small read-only surface in the detail.** Operators usually open the dashboard for movement workflows; the table here is a glance, not the primary surface.
- **Bounded scope.** `ops-clients` already covers 2 pages + 2 modals + 4 sections. Adding the movement modal grows the change beyond what's prudent for the second migration.

### Trade-off

For ~weeks until `ops-financial-dashboard` lands, an operator who clicks a movement row in the
client detail won't get a popup. To compensate, in v1 the rows render with `cursor-default` (not
`cursor-pointer`) so there's no affordance suggesting clickability. The label of the section
(`Recent Movements`) is non-interactive copy.

### Alternatives considered

- **Migrate the Movement Details modal here, deduplicate later when `ops-financial-dashboard` lands.** Considered. Rejected — the modal logic is non-trivial (~250 LOC + step-up for sensitive operations) and would have to be moved+rewritten when the dashboard migration scopes its movements module. Doing it twice is worse than waiting.
- **Drop the recent movements section from the detail entirely until the dashboard migrates.** Considered. Rejected because operators rely on it for at-a-glance triage of clients with anomalous activity.

### Failure modes the rule prevents

- A developer wires up a Movement Details modal here → duplicates work later, spec rejects.
- A developer makes the rows look clickable but no-op them → confusing UX. Spec mandates `cursor-default` + no hover effect on the rows in v1.

---

## Decision 7 — `Create Instruction` CTA is hidden in v1, not disabled

### The question

The legacy detail page has a `Create Instruction` button that navigates to the wizard at
`/clients/:id/instructions/create`. Per Decision 5 the wizard is out of scope. What does the new
detail show in its place?

### The decision

**Hide the button entirely in v1.** No tooltip, no disabled state, no placeholder copy.

### Why

- **A disabled button with a tooltip "coming soon" is noise.** The user can do nothing about it; advertising the gap doesn't help.
- **The `Whitelistar Cuenta` CTA still ships and remains the primary affordance** for adding capacity to a client. Until the wizard lands, that's the sole CTA in the section, which is fine.
- **When the follow-up lands, the button materialises in one place.** The follow-up's spec adds an `ADDED Requirement` for the CTA + the wizard surface; no spec churn here.

### Alternatives considered

- **Show the button disabled with a tooltip "Próximamente".** Rejected for the noise reason.
- **Replace with a link to the legacy URL.** Rejected — the legacy URL won't work after migration; redirects route to the new app and the wizard isn't there yet.

### Failure modes the rule prevents

- A developer copies the legacy button into the new code → broken navigation when clicked. Spec mandates omission until the follow-up.

---

## Cross-capability composition

| Capability | What it owns | What `ops-clients` owns |
|---|---|---|
| `core-layout` | AppShell, page header, L1/L2/L3 layout | Page header with title + Alta CTA on master; client info card on detail |
| `core-module-types` | Type-A / Type-B / Type-C definitions | Type-A composition (master) + Type-B composition (detail) |
| `core-data-tables` | Table primitive, debounced filters, server-side pagination | Column set, filter wiring, autocomplete combobox for client search |
| `core-modals` | Create / Edit / Detail / Confirmation flows | SignUp + Whitelist as centred modals (Whitelist with internal step machine) |
| `core-actions-menu` | Per-row Actions popover with stop-propagation | The Letter rail picker popover on each instruction row in the detail |
| `core-forms` | Field types (`text`, `select`, `combobox`), vee-validate + zod | Field declarations + schemas for Whitelist (CVU + currency) and the SignUp client picker |
| `core-api-layer` | `apiClient` axios + `ApiError` | Endpoint wrappers for both OPS + PSP backends + retry behavior |
| `core-auth` | `useStepUp()`, `useAuth()` | Step-up gating on the SignUp submit |
| `core-error-handling` | Skeleton, EmptyState, alert banners, toasts | Surface rendering for the page's loading / empty / error states |
| `core-navigation` | Route registration | Routes (`/clients`, `/clients/:id`) + sidebar entry under `Operaciones` block + legacy `/users` redirect |

---

## Open questions

1. **`ops-roles` consolidation.** Inline role gating in v1 (`OPS_ADMIN` on Whitelist + SignUp). When `ops-roles` lands, the inline arrays are replaced with capability strings (`clients:whitelist`, `clients:invite`).
2. **`extend-ops-instructions-create-from-client`** (or `add-ops-account-instructions`). The wizard at `/clients/:id/instructions/create` lands as a follow-up; whether it extends `ops-instructions` or creates a new `ops-account-instructions` capability is decided in that change's design phase. Open (Decision 5).
3. **`ops-statements`** — the `Generar Statement` modal in the legacy master header. Standalone change later; the button is omitted in v1.
4. **`ops-financial-dashboard` movement modal** — once that capability lands, this one extends with a `MODIFIED Requirement` opening the modal on row click in the recent movements section (Decision 6).
5. **Audit log surfacing for `Whitelistar Cuenta`** — when a manager wants to know "who whitelisted this account and when", the row's audit trail is needed. Currently the legacy doesn't surface this; we'd add it as a follow-up using the canonical `<Drawer>` from `core-modals` (same pattern used by `core-modulo-genericos` Inbox profile B).
