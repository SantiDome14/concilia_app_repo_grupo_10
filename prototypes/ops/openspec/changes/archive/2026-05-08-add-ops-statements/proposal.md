> Jira REQ: — (no ticket; third OPS migration change after `add-ops-instructions` + `add-ops-clients`)
> Module: OPS

# Add ops-statements — on-demand statement PDF generation per client + account

## Why

The legacy `core-ops-frontend` exposes the `Generar Statement` flow via a single
~940 LOC modal (`src/components/GenerateStatementModal.vue`) wired into the
header of `UserDashboard.vue` (now `Clients.vue` post-`add-ops-clients`). The
flow is small but cohesive enough to warrant its own capability:

- Search a client (autocomplete on `/clients?name=` + `/clients?docket=`).
- Load the client's accounts (`/clients/:id`) and pick exactly one — accounts grouped by currency in an accordion.
- Pick a date range using a `<RangeCalendar>` plus 8 quick-filter chips ("Últimos 7 días", "Últimos 15 días", "Últimos 30 días", "Este mes", "Mes anterior", "Últimos 3 meses", "Últimos 6 meses", "Este año").
- Submit `POST /statement` with `{ client_id, account_id, date_from, date_to }` (ISO 8601 Z); on `{ success: true, url }` open the URL in a new tab.

The legacy ships this entirely inside one big modal that mixes its own client
search, accordion logic, calendar, and POST orchestration. Per the migration
paradigm, the search + account hydration are already owned by `ops-clients`
(its master list and detail page); this change re-uses them rather than
re-implementing client search yet again. The capability lands as a small,
focused modal-only feature with one entry surface (the master list header) and
one ergonomic shortcut (the detail page header pre-populates the client) so the
operator gets a one-click flow when they already opened a client.

This change is intentionally small (~6-7 requirements, ~18-20 scenarios) — it
is the third OPS migration change and the first one that does NOT land a new
page. It validates the **modal-as-only-surface** paradigm for OPS migrations
where the legacy feature was a single modal on top of an existing page.

The legacy modal is **NOT migrated 1:1**: the new modal reuses the
`<ClientFilters>` autocomplete component from `ops-clients`, the canonical
`<DatePicker mode="range">` from the template (which already wraps reka-ui
`RangeCalendar` with locale + accessibility), and the contracted toast/error
surfaces from `core-error-handling`. Total expected new code: ~250 LOC vs the
940 LOC legacy.

The migration also takes advantage of the rebuild to land **5 quality-of-life
sophistications** the legacy did NOT ship (per design.md Decision 7): smart
single-account default, localStorage persistence of the last-chosen range,
pre-submit preview card, cancel-during-submit via `AbortController`, and a
re-open button in the success toast. All five are pure-frontend, low-cost, and
turn the modal from a "form that fires-and-forgets" into a feedback-rich tool
operators actually want to use multiple times in a row.

## What Changes

- **Create the `ops-statements` capability.** New spec at `openspec/specs/ops-statements/spec.md` (materialised on archive) with the Requirements unifying the legacy `Generar Statement` modal. Concretely covers:

  1. The Generate Statement modal SHALL be reachable from the header of `/clients` (master list, no client pre-populated) AND from the header of `/clients/:id` (detail page, with the current client pre-populated and step 1 of the flow skipped).
  2. The flow SHALL guide the user through three logical steps inside one Dialog: client selection → account selection → date range. Steps 1+2 collapse into the next when their respective selection is made; the user can backtrack by clicking the previous step's selected chip.
  3. The Account selector SHALL group the client's accounts by currency in an accordion, with each currency group showing its account count and each account showing `account_number` + `balance`.
  4. The Date Range picker SHALL offer the 8 canonical quick-filter chips (Últimos 7/15/30 días, Este mes, Mes anterior, Últimos 3/6 meses, Este año) above the `<DatePicker mode="range">` calendar; clicking a chip applies the range and visually highlights the active chip; manually editing the calendar deselects the chip.
  5. Submit SHALL call `POST /statement` with `{ client_id, account_id, date_from, date_to }` where dates are ISO 8601 with UTC (`T00:00:00Z` for `date_from`, `T23:59:59Z` for `date_to`); on `{ success: true, url }` the modal opens `url` in a new tab via `window.open(url, '_blank')` AND closes; on `{ success: false }` or HTTP error a toast surfaces the message and the modal stays open for retry.
  6. The Header CTA `Generar Statement` SHALL be visible only to users with `clients:statement` capability (or `OPS_ADMIN` until `ops-roles` lands). For viewer-only roles the CTA is hidden — not disabled.
  7. Skeleton + EmptyState + 5xx retry toast — all from `core-error-handling`.
  8. Five **quality-of-life refinements over the legacy modal** ship in v1: (a) smart single-account default — when the client has exactly one account, it's auto-selected and the flow skips step 2 to step 3; (b) localStorage persistence of the last-chosen range per operator — the next opening pre-populates the date picker and the corresponding quick-filter chip if the saved range matches one; (c) pre-submit preview card consolidating client + account + range before the Generar button enables; (d) cancel-during-submit — while the POST is in flight the Generar button transforms into a Cancelar button that calls `AbortController.abort()`; (e) success toast with a `Volver a abrir` button that re-opens the URL for 10 s after generation (so accidentally-closed tabs can be recovered without re-generating).

- **Define the typed surface.** Files materialised on implementation:
  - `src/ops/statements/api.ts` — `requestStatement(payload)` wrapper using the shared `apiClient`. Returns a discriminated `StatementResult` so the modal can render `success.url`, `failed.message`, etc. without inspecting `ApiError` shape directly.
  - `src/ops/statements/types.ts` — `StatementRequest`, `StatementResponse`, `StatementResult`, `StatementQuickFilter`.
  - `src/ops/statements/quick-filters.ts` — pure helper that converts a `StatementQuickFilter` to a concrete `{ from: Date; to: Date }` range based on a reference date (default `new Date()`). Testable in isolation; the modal calls it on chip-click.
  - `src/ops/statements/GenerateStatementModal.vue` — the modal itself, ~250 LOC, composed of three sections gated by the current step.
  - `src/ops/statements/StatementClientStep.vue` — wraps `<ClientFilters>` from `ops-clients` so the modal does not duplicate the autocomplete UX.
  - `src/ops/statements/StatementAccountStep.vue` — accordion-by-currency selector, reusing `<AccountCard>`-style affordance trimmed to selection mode (not expansion of instructions).
  - `src/ops/statements/StatementDateStep.vue` — quick-filter chips + `<DatePicker mode="range">`.

- **Wire the trigger.** The header of `src/pages/Clients.vue` gains a second CTA `Generar Statement` (alongside the existing `Alta de Cliente en APP`). The header of `src/pages/ClientDetail.vue` gains the same CTA — when clicked from the detail page, it opens the modal pre-populated with the current client (step 1 skipped). Both CTAs respect role gating (Requirement 6).

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — CTAs in the L1 page header.
  - `core-modals` — Centred modal pattern; one `<Dialog>` mount.
  - `core-forms` — `<DatePicker>` from `core-forms` (already extended with the date-range mode) for the calendar.
  - `core-api-layer` — shared axios + `ApiError` for the `POST /statement`.
  - `core-error-handling` — Skeleton, toast for transient failures.
  - **`ops-clients`** — `<ClientFilters>` autocomplete reused. The detail page integration adds the second CTA but does NOT modify any `ops-clients` Requirement; the change is composition-only, no spec modification.
  - **`ops-roles` (companion change, future)** — `clients:statement` capability gating; for now declared inline as `OPS_ADMIN` || `clients:statement`.

## Capabilities

### Affected Capabilities

None modified by this change. The integration points (`<ClientFilters>` in
`ops-clients`; the master + detail page headers) compose existing
Requirements; they do NOT add or modify Requirements on those capabilities.

### New Capabilities

- `ops-statements` (OPS modal feature; on-demand statement PDF generation) — 7 requirements, ~20 scenarios.

### Non-capability artifacts

- `src/ops/statements/{api.ts,types.ts,quick-filters.ts,GenerateStatementModal.vue,StatementClientStep.vue,StatementAccountStep.vue,StatementDateStep.vue}` — typed surface.
- The two CTAs in `src/pages/Clients.vue` + `src/pages/ClientDetail.vue` are non-spec edits (they are composition glue; the spec contracts the modal behaviour, not the exact button placement chrome).

### Removed from scope

- **Statement history listing** is **NOT migrated** here — the legacy does not surface generated statements; once generated, the URL is opened in a new tab and not persisted on the frontend. If product later wants a history (audit + re-download), it lands as a separate `extend-ops-statements-history` change adding a `<RecentStatements>` section to the detail page.
- **Scheduled / cron statement generation** is **NOT migrated** — does not exist in the legacy.
- **Bulk multi-client statement generation** is **NOT migrated** — does not exist in the legacy. If product later wants it, lands via `extend-ops-statements-bulk`.
- **Multi-account per statement** is **NOT migrated** — the legacy enforces exactly-one-account per statement; the spec keeps that constraint. Multi-account would need a backend change first (currently `POST /statement` accepts a single `account_id`).
- **Step-up MFA gating** — the legacy did NOT step-up. Decision documented in design.md Decision 3: statements are read-only export of data the operator already has access to via the detail page; adding MFA is friction without a security gain. (Contrast with `SignUp` from `ops-clients` which DID add MFA because creating portal credentials is a different risk class.)
- **Modal as full route** — the legacy ships the flow as a modal; v1 keeps it that way. The flow is short (3 steps, ~30 s end-to-end) and the operator's context is the master/detail page they were already on.
