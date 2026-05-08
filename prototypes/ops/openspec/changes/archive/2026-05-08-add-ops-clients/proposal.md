> Jira REQ: — (no ticket; second OPS migration change after `add-ops-instructions`)
> Module: OPS

# Add ops-clients — clients master + detail with whitelisting and portal signup

## Why

The legacy `core-ops-frontend` ships the clients dominio across **two pages plus three nested
flows**, all glued together by hand-rolled fetches and per-component pagination math:

- `/users` — `UserDashboard.vue` (1,097 LOC). Despite the name, the page lists **clients** (`GET /clients`), filtered by `name` and `docket`, with columns CUIT/CUIL · Nombre · Email · Activo · Estado Portal. Two header CTAs: `Generar Statement` and `Alta de Clientes en APP`. Row click navigates to `/clients/:id`.
- `/clients/:id` — `ClientDetail.vue` (585 LOC). Renders the client info card, an expandable accounts section (each account showing its `account_instructions` with Copy + Letter actions), and a recent movements table. Two CTAs at the accounts section: `Whitelistar Cuenta` (only when at least one Coinag instruction exists) and `Create Instruction` (navigates to a separate wizard at `/clients/:id/instructions/create`).
- `SignUpUserModal.vue` (404 LOC). Modal nested in `/users` that lets the operator pick a client, then `POST /sign-up` to send a portal-onboarding email — creates the portal user for an existing client.
- Whitelisting modal (inline within `ClientDetail.vue`, ~100 LOC). Two-step flow: validate a CVU/CBU against PSP (`GET /coinag/account/:cvu`), then confirm with a currency to call `POST /clients/:id/whitelist-account`.
- `/clients/:id/instructions/create` — `CreateInstruction.vue` (794 LOC). A 4-step wizard (account → template → field values → rails) that creates an `account_instruction` (NOT an `instruction` template — they are different entities; see Decision 5). **Out of scope for this change** (deferred to a follow-up extension on `ops-instructions`).

The legacy split is held together by mixed `fetch` + `useAuth0` patterns, ad-hoc pagination math
(`page`/`limit`/`total`), local component state for every modal, and a misleading route name
(`/users` for a clients page). Per the migration paradigm, this is a Type-A master + Type-B detail
with two nested modals — the canonical shape contracted by `core-module-types`.

This change creates the `ops-clients` capability — one capability, one master page, one detail page,
and two nested modals — and is the **second OPS migration change** after the
`ops-instructions` pilot. The intent is to validate the **Type-A + Type-B composition** in OPS
(the pilot validated Type-A only) and to land the canonical PSP-aware whitelisting flow for the
first time on the new template.

The legacy `/users` URL is absorbed: it redirects to `/clients`. The legacy `/clients/:id` URL
keeps working — the new detail page lives at the same path. The wizard at
`/clients/:id/instructions/create` is **NOT** migrated here; it lands as a follow-up
`extend-ops-instructions-create-from-client` (see §Removed from scope and design Decision 5).

## What Changes

- **Create the `ops-clients` capability.** New spec at `openspec/specs/ops-clients/spec.md`
  (materialised on archive) with the Requirements unified from the legacy
  `UserDashboard.vue` + `ClientDetail.vue` + `SignUpUserModal.vue` + the inline whitelisting
  modal. Concretely covers:

  1. The `/clients` page is a Type-A master list per `core-module-types` (header CTAs + filter row + paginated table).
  2. Canonical column set (`CUIT/CUIL`, `Nombre`, `Email`, `Activo`, `Estado Portal`).
  3. Filters: `Nombre o legajo` (text + autocomplete combobox sourced from `/clients`, debounced 300 ms), state surviving Back navigation per `core-data-tables`.
  4. Server-side pagination via `@tanstack/vue-query` with the canonical page sizes (10 / 25 / 50 / 100) and `localStorage` persistence of the user's chosen page size.
  5. Header CTA `Alta de Cliente en APP` opens a SignUp modal gated by step-up authentication (`core-auth`). The CTA is hidden for VIEWER roles.
  6. Row click navigates to `/clients/:id` (the detail page); no Detail modal — the detail surface is dense enough to warrant a full page.
  7. The `/clients/:id` page is a Type-B detail surface composed of a client info card (header), an accounts section (one card per account, expandable to show its `account_instructions`), and a recent movements table (read-only, no row click in v1).
  8. Each account exposes `Copy` (clipboard) and `Letter` (confirmation letter download via `/account-instruction/:id/confirmation-letter?rail=...`) actions on each of its instructions. The Letter action handles both single-rail (direct fetch) and multi-rail (popover picker) cases.
  9. A `Whitelistar Cuenta` CTA opens a 2-step inline modal: validate CVU/CBU against PSP, then confirm with a currency. The CTA is gated by the presence of at least one Coinag instruction on the client (otherwise hidden).
  10. Skeleton + EmptyState + 5xx retry toast + 403 banner — all from `core-error-handling`.
  11. Legacy URL redirects: `/users` → `/clients`. The path `/clients/:id` keeps the same shape on the new template.

- **Define the typed surface.** Files materialised on implementation:
  - `src/pages/Clients.vue` — master page.
  - `src/pages/ClientDetail.vue` — detail page.
  - `src/ops/clients/api.ts` — endpoint wrappers using the shared `apiClient`.
  - `src/ops/clients/types.ts` — `Client`, `ClientWithAccounts`, `Account`, `AccountInstruction`, `Movement`, `WhitelistRequest`, `ClientsListParams`, `PortalStatus`.
  - `src/ops/clients/ClientsTable.vue` — table-specific composition (columns, row click handler).
  - `src/ops/clients/ClientFilters.vue` — filter row (combobox autocomplete + clear button).
  - `src/ops/clients/SignUpUserModal.vue` — Alta de Cliente en APP, gated by step-up.
  - `src/ops/clients/WhitelistAccountModal.vue` — 2-step inline whitelist (validate + confirm).
  - `src/ops/clients/AccountCard.vue` — single account card with expandable instructions.
  - `src/ops/clients/InstructionRow.vue` — single instruction row inside the AccountCard with Copy + Letter actions.
  - `src/ops/clients/RecentMovementsTable.vue` — read-only movements section in the detail.
  - `src/ops/clients/portal-status.ts` — pure helper that derives `Estado Portal` from `metadata.status` + `is_active` (testable in isolation).

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — page header with title + CTAs per the L1 pattern; client info card per the L2 pattern.
  - `core-module-types` — Type-A composition (master list) + Type-B composition (detail page with sections).
  - `core-data-tables` — table primitive, debounced filters, server-side pagination.
  - `core-modals` — SignUp + Whitelist as centred modals (Whitelist is two-step but stays in one modal mounted, advancing internally).
  - `core-actions-menu` — N/A on the master list (row click is the only row affordance) but used for the per-instruction Acciones popover on the detail.
  - `core-forms` — `text` (for CVU input), `select` (for currency in Whitelist), vee-validate + zod schemas.
  - `core-api-layer` — shared axios + `ApiError`. Replaces the legacy hand-rolled fetch + manual headers pattern.
  - `core-auth` — `useStepUp()` composable for the `Alta de Cliente en APP` flow (the legacy version did NOT step-up; the migration adds it because creating a portal user is the canonical sensitive action).
  - `core-error-handling` — Skeleton, EmptyState, alert banner for 5xx persistence retry, toast for transient failures.
  - `core-navigation` — `/users` → `/clients` redirect.
  - **`ops-roles` (companion change, future)** — `OPS_ADMIN` for whitelist + signup, `OPS_VIEWER` for read-only. For now, role gating is declared inline; when `ops-roles` lands, this capability references it.

## Capabilities

### Affected Capabilities

None modified by this change. The future follow-up `extend-ops-instructions-create-from-client`
will modify `ops-instructions` to add a `MODIFIED Requirement` for the in-context create flow,
but that is a separate change.

### New Capabilities

- `ops-clients` (OPS pages; clients master + detail) — 11 requirements, ~33 scenarios.

### Non-capability artifacts

- `src/pages/Clients.vue` — master page entry registered at `/clients` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Clientes'`, `meta.block = 'Operaciones'`.
- `src/pages/ClientDetail.vue` — detail page entry registered at `/clients/:id` with the same shell + a dynamic breadcrumb resolver (`Clientes / <client.name>`).
- `src/ops/clients/{api.ts,types.ts,ClientsTable.vue,ClientFilters.vue,SignUpUserModal.vue,WhitelistAccountModal.vue,AccountCard.vue,InstructionRow.vue,RecentMovementsTable.vue,portal-status.ts}` — typed surface.
- Sidebar entry under a new `Operaciones` block (this is the first OPS-domain block; `ops-instructions` lives under `Configuración`, this lives under `Operaciones`). Future OPS modules (`ops-financial-dashboard`, `ops-psp-home`) will join this block.

### Removed from scope

- The wizard at `/clients/:id/instructions/create` (`CreateInstruction.vue`, 794 LOC) is **NOT migrated** here. It binds an `instruction` template to an account, picking rails — a distinct entity (`account_instruction`) from the templates owned by `ops-instructions`. It deserves its own change because it spans 4 wizard steps + rail picking + a separate POST endpoint. Lands later as `extend-ops-instructions-create-from-client` which will extend `ops-instructions` (or, more likely, create an `ops-account-instructions` capability — to be decided in that change's design phase). For now, the `Create Instruction` button on the detail page is **hidden** in v1; users who need it use the legacy URL until the follow-up lands.
- The `Generar Statement` modal in the legacy master page header is **out of scope**. It generates a statement PDF for the entire client base — a reporting feature that belongs to a separate `ops-statements` capability. The button is omitted in v1.
- The Movement details modal that opens when clicking a row in the recent movements table is **out of scope** — that modal belongs to `ops-financial-dashboard` (the `/dashboard` Activity tab uses the same modal and owns it). In v1 of `ops-clients`, the recent movements table is **read-only** (no row click); when `ops-financial-dashboard` lands, this capability can extend with a row-click that opens the shared modal.
- KPI strip on the master list is **out of scope for v1** (no canonical KPIs identified yet — the legacy doesn't surface any). If later useful (e.g. "% of clients without portal user"), a follow-up adds it per `core-module-types` Type-A.
- Bulk actions are **out of scope for v1** (`core-data-tables` does not yet contract a bulk-action bar pattern).
- Edit / Delete client actions are **NOT in legacy** and are not added here. The capability is read-only at the master + detail levels except for the two nested modals (signup + whitelist).
