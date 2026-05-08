# Design — add-ops-psp

## Context

This is the fifth OPS migration change and the most architecturally ambitious
so far: it lands the **Módulo B shape** (Type-A with sub-module tabs) for the
first time in OPS, and introduces the **Banco Sponsor abstraction** that the
remaining PSP / dashboard migrations build on.

The legacy is a 2-route shell with shared data + a hand-rolled tab indicator.
The migration collapses both routes into one capability with 3 tabs and lets
the `core-module-types` Type-A composition own the sub-module pattern. The
Banco Sponsor catalog is open-set from day one because the roadmap (BIND +
Banco de Comercio) is concrete enough to design for.

V1 is intentionally read-only at the data-mutation level: every CTA that
creates / edits / imports is deferred to a follow-up. The modal that's
already shared with `ops-clients` (Whitelist) is the only mutation surface in
v1 — and even that is REUSED, not recreated.

---

## Decision 1 — One capability `ops-psp`, NOT split into `ops-psp-home` + `ops-psp-accounts`

### The question

The legacy ships PSP across two routes (`/psp/home` and `/psp/accounts`). The
prior plan (`MIGRATION-NOTES.md` first draft of PSP-1) split the migration
into two changes mirroring the legacy. Should we keep the split?

### The decision

**One capability `ops-psp`.** Both legacy routes collapse into a single
`/psp` page with three internal tabs.

### Why

- **The legacy split was a side-effect, not a UX choice.** The legacy didn't have a sub-module-tabs primitive — it used router-view children as a workaround. The new template HAS the primitive (Módulo B shape per `core-module-types`); using it removes the artificial route boundary.
- **Shared data fetching is half the work.** `pspInfo`, `coinagHealth`, `balanceReconciliation` are loaded once in the legacy `PSP.vue` shell and consumed by both child routes. Splitting into two capabilities would force a coordination contract about who loads these and how the caches sync. One capability owns them once.
- **The unification precedent is `ops-instructions`** (3 legacy routes → 1 page with modals). Same reasoning applied recursively.
- **Per `MIGRATION-NOTES.md` Decision PSP-1** (refined after this design's review). The unification is now the canonical plan.

### Alternatives considered

- **Split into `ops-psp-home` + `ops-psp-accounts`.** Rejected for the reasons above; would require artificial coordination on shared data + duplicate the layout shell.
- **Three capabilities, one per tab (`ops-psp-disponibilidad`, `ops-psp-movimientos`, `ops-psp-cuentas`).** Considered. Rejected — the tabs are sub-modules of the same page, not independent surfaces; spec hygiene is better with one capability owning the page.

### Failure modes the rule prevents

- A developer adds another tab via a new capability that registers `/psp/foo` → spec rejects; new tabs ADD a Requirement to `ops-psp`, not register a new route.

---

## Decision 2 — `Banco Sponsor` abstraction is open-set from day one

### The question

Today OPS is integrated with **only Coinag**. BIND + Banco de Comercio are on
the roadmap. Should the spec (and code) hardcode `'COINAG'` as the sole
sponsor (fastest), or contract the abstraction for an open set?

### The decision

**Open-set from day one.** The spec NEVER hardcodes `'COINAG'`. The code
sources the catalog from `src/ops/psp/sponsor-catalog.ts` (config-driven) so
adding BIND or Banco de Comercio later is a single-file change.

### Why

- **Per `MIGRATION-NOTES.md` Decision PSP-1.** The directive predates this design.
- **Hardcoding is a tax we pay forever.** Every reference to `'COINAG'` in the codebase becomes a refactor when BIND lands. The cost of doing it right now is one more file (`sponsor-catalog.ts`) — measured in tens of LOC, not hundreds.
- **The reconciliation banner is per-sponsor anyway.** Even with one sponsor today, the banner area is stackable; making the data flow always loop over `sponsors[]` simplifies the future addition.

### Implications

- **Disponibilidad tab** renders one card per sponsor in `sponsorCatalog.active[]`. Today: 1 card. After BIND: 2 cards. Layout uses `grid-cols-1 md:grid-cols-3` (room for up to 3 visible above the fold).
- **Movimientos sponsor filter cards** render the same loop with movement counts per sponsor.
- **The reconciliation banner** stacks alerts (one per sponsor with mismatch).
- **Sponsor codes** are uppercase strings (`'COINAG'`, `'BIND'`, `'BANCO_DE_COMERCIO'`) — the legacy uses `'COINAG'` with the same casing on `account_instructions.operations_provider_name`.

### Trade-off

The catalog is config-driven (file-level), not backend-driven, in v1. If
product later wants to onboard sponsors at runtime without a deploy, the
catalog moves to a backend resource (`GET /sponsors`). For v1, the deploy
cost is low enough that file-level is fine.

### Alternatives considered

- **Hardcode `'COINAG'` in v1 + refactor when BIND lands.** Rejected for the reasons above.
- **Backend-driven catalog from day one (`GET /sponsors`).** Considered. Rejected for v1 — adds a network round-trip on every page load for a list that's currently 1 entry; over-engineering. When the third sponsor lands, the migration to backend-driven becomes worthwhile; flagged as Open question 1.

### Failure modes the rule prevents

- A developer hardcodes `if (sponsor === 'COINAG')` anywhere outside `sponsor-catalog.ts` → spec rejects; the catalog is the single source of truth.
- The reconciliation banner only handles one sponsor → forfeits the stackable design. Spec mandates the banner accept an array always.

---

## Decision 3 — V1 is read-only at the data-mutation level

### The question

The legacy ships several mutation flows: Create Movement (regular + internal + collector + adjustment), Create Coinag Account (3-step CVU generation), Edit Label, SWIFT XML import. Should v1 migrate all of them?

### The decision

**No.** V1 migrates only the **read-side** + the **Whitelist flow that's
already in `ops-clients`**. Every other mutation is a follow-up.

### Why

- **The read-side is the architecture-defining work.** The 3-tab shape, the Banco Sponsor abstraction, the reconciliation banner, the drawer drill-down — these set the canonical pattern for the rest of OPS. Getting them right is more valuable than 1:1-migrating every modal.
- **The mutation flows are independent and large.** Create Movement alone has ~3 sub-types each with ~50 LOC of branching logic. SWIFT XML import has a frontend XML parser (~200 LOC). Create Coinag Account is a 3-step wizard. Each deserves its own design phase.
- **The legacy flows can keep working in parallel** for a transition window — operators who need to create movements use the legacy until the follow-up lands.
- **Whitelist already exists** in `ops-clients` as `<WhitelistAccountModal>`. Reusing it (same component, same backend call) is composition, not migration. Decision 5 captures that.

### Trade-off

For some weeks (until follow-ups land) the new `/psp` surface is read-only.
Operators who need to create movements / generate CVUs use the **legacy URL**
to access those modals (we keep the legacy app alive in parallel during the
migration anyway). When each follow-up lands, the corresponding CTA enables
in the new surface.

### Alternatives considered

- **Migrate everything in one change.** Rejected — too large to review; estimated >2,000 LOC of new code.
- **Migrate Create Movement only (the most-used mutation).** Considered. Rejected — Create Movement is itself a 4-sub-type modal that warrants its own design phase. Splitting it from the rest is the right call but it lives outside this spec.

### Failure modes the rule prevents

- A developer ships a `Crear movimiento` button in v1 that opens a stub modal → spec rejects; the CTA either fully works or doesn't ship.
- A developer copy-pastes `<WhitelistAccountModal>` into `ops-psp` → spec rejects; reuse is mandated.

---

## Decision 4 — Cuentas drill-down via Drawer (canonical), NOT modal or sub-route

### The question

When the operator clicks an account in the Cuentas tab, the legacy navigates
to `/psp/accounts/:id` (a separate route, but actually it's a sub-modal in
`PSPAccounts.vue` — the URL doesn't change). The drill-down shows the
account's SWIFT transactions plus the Coinag info. Three options:

- **(A)** Sub-route `/psp/cuentas/:id`.
- **(B)** Centred modal.
- **(C)** Drawer per `core-modals` Drawer pattern.

### The decision

**Option C.** Drawer.

### Why

- **The drill-down IS a record-detail surface.** Per `core-modulo-genericos` Inbox profile B, drawers are canonical for record-detail (Inbox messages, Alertas profile B). The Cuentas drill-down fits that pattern: read-mostly view of a single record's history.
- **The drawer keeps the page context.** The operator sees the accounts list on the left while inspecting one account on the right; navigation between accounts is one click instead of full-route round trips.
- **SWIFT transactions are heavy data** (long table) but bounded width (a drawer's right-side panel handles that better than a centred modal).
- **No URL change is OK** for a drill-down (matches the legacy semantic). If product later wants shareable drill-down links, a `?account=:id` query param can be added without changing the drawer pattern.

### Alternatives considered

- **Option A (sub-route).** Rejected — the operator loses the accounts list context.
- **Option B (modal).** Rejected — modals are for centred dialogs (forms / confirmations); read-mostly tables fit drawers better.

### Failure modes the rule prevents

- A developer registers `/psp/cuentas/:id` as a route → spec rejects; canonical is the drawer.

---

## Decision 5 — Habilitar cuenta CTA REUSES `<WhitelistAccountModal>` from `ops-clients`

### The question

The legacy has a Whitelist flow inside `PSPHome.vue` (and another inside
`ClientDetail.vue` — the one we already migrated as `<WhitelistAccountModal>`
in `ops-clients`). Should the new `ops-psp`:

- **(A)** Migrate its own copy of the Whitelist modal (legacy parity).
- **(B)** Reuse `<WhitelistAccountModal>` from `ops-clients`.

### The decision

**Option B.** Direct reuse — same component, same import path.

### Why

- **The component is identical in behaviour** — 2-step state machine (validate-then-confirm), same `validateCvu` PSP call, same `whitelistAccount` POST. The legacy ships them as separate code only because the legacy didn't share components across routes.
- **Cache invalidation is the only coupling point.** When the modal succeeds, it invalidates `['ops', 'clients', clientId]` (per `ops-clients` Requirement 8). For `ops-psp` it ALSO needs to invalidate `['ops', 'psp', 'accounts', ...]` so the new account renders in the Cuentas table. The component takes a callback prop or emits a `created` event the parent uses to invalidate.
- **No spec modification on `ops-clients`.** The reuse is composition-only; `ops-clients` Requirement 8 keeps its current contract; `ops-psp` Requirement 7 contracts the reuse.

### Implementation note

`<WhitelistAccountModal>` currently does the cache invalidation internally
(`queryClient.invalidateQueries({ queryKey: ['ops', 'clients', clientId] })`).
For `ops-psp` reuse:
- The modal emits a `created` event when the call succeeds.
- The page wires the event to invalidate its OWN queries (`['ops', 'psp', 'accounts']`).
- The `ops-clients` invalidation also fires from within the modal — but that's a no-op when no `ops-clients` page is mounted, so no harm.

This is a **non-breaking component-API extension** (added emit), not a
Requirement modification on `ops-clients`.

### Failure modes the rule prevents

- A developer copy-pastes `<WhitelistAccountModal>` into `src/ops/psp/` → spec rejects.
- A developer modifies `<WhitelistAccountModal>` in a way that breaks the `ops-clients` contract → tests on `ops-clients` catch it.

---

## Decision 6 — Reconciliation banner area is a STACKABLE alert area, not a single banner slot

### The question

The legacy reconciliation banner shows one Coinag mismatch as a fixed-position
top banner. With BIND + Banco de Comercio coming, what shape should the new
banner take?

### The decision

**Stackable alert area.** The slot accepts an array of alerts, one per
sponsor with mismatch. Today: 0 or 1 banners. Future: 0–N banners.

### Why

- **Per `MIGRATION-NOTES.md` Decision PSP-1.** Documented constraint.
- **Going from 1 to 2 sponsors is the riskiest moment for the banner shape.** If we ship a single-banner slot, the second sponsor's mismatch would visually collide. Stackable handles N from day one with no special case.
- **`core-error-handling` already contracts the alert banner shape** (variants info / warning / danger / success; dismissible). We use the canonical component with a stack wrapper.

### UX contract

- The wrapper renders `<AlertBanner>` for each entry in `mismatches[]`.
- Each banner SHALL be dismissible to a small pill (Decision 7c). The pill displays the count of currently-dismissed banners; clicking it expands them back. Pill state is per-session (sessionStorage).
- The expansion ordering is sponsor-name alphabetical; severity (deficit > surplus) is encoded in the variant (`danger` for deficit, `warning` for surplus).

### Failure modes the rule prevents

- A developer wires a single-banner slot → forfeits the multi-sponsor design. Spec mandates the array.

---

## Decision 7 — Quality-of-life refinements over the legacy

### The question

Same lens as prior changes: refinements that don't justify their own follow-up
but are cheap during the migration.

### The decision

**Land 5 refinements in v1.**

| # | Refinement | Frontend cost | Operator value |
|---|---|---|---|
| 7a | **Sponsor cards click-to-filter (cross-tab)**: clicking a sponsor card on Disponibilidad pre-applies the sponsor filter on Movimientos and Cuentas if the operator switches tab; clicking a sponsor card on Movimientos toggles the filter | 1 ref + URL sync | Reduce friction of "I want to see only Coinag activity" — one click instead of a 3-step filter |
| 7b | **URL sync of active tab + filters**: `?tab=...&sponsor=...&search=...` reflected in URL so back-button restores; bookmarks share specific views | 1 watcher | Compatible with browser navigation; deep-linkable views |
| 7c | **Reconciliation banner dismissible to pill**: a small `Reconciliación: 1 sponsor con mismatch` pill replaces the full banner area when the operator dismisses; clicking the pill expands back | ~30 LOC + sessionStorage | Operator who's already aware of the mismatch isn't repeatedly invaded |
| 7d | **Auto-refresh of Disponibilidad** every 60 s via `refetchInterval` in vue-query (matches the legacy Coinag health polling cadence) | 1 prop on the query | Saldos current without manual reload |
| 7e | **localStorage of last-active tab** per operator: opening `/psp` from the sidebar restores the previously-active tab if no `?tab=` query param is set | 1 ref + watcher | Operator who lives on Movimientos doesn't have to switch tab on every visit |

### Why these five

Same as prior changes: pure-frontend, low coupling, operator-asked. Refinements
explicitly OUT for v1 (deferred):

- Sponsor cards reorder by activity / by mismatch severity (presentation is sponsor-alphabetical for predictability).
- Banner expansion-on-new-mismatch (re-expanding the pill back into a banner when a NEW mismatch arrives — would require diff tracking; cut for v1).
- Toast-on-balance-change (notify when a sponsor's balance changed since last view) — overkill for v1.
- Per-sponsor health indicator in the page header (today only Coinag; once multiple sponsors land, expand the indicator).

### Failure modes the rule prevents

Each refinement is contracted as a Scenario in its host Requirement, never as
a hidden implementation detail.

---

## Decision 8 — Coinag health polling stays at 60 s; visible header indicator

### The question

The legacy polls `/coinag/health` every 60 s and shows a small status pill
in the page header. Should we keep the 60 s cadence and the indicator?

### The decision

**Yes.** Same cadence, same visual semantic.

### Why

- **60 s is operator-tuned.** Sub-minute polling is overkill (Coinag rarely goes down in seconds); >60 s loses actionable signal (an outage is detected too late).
- **The indicator is small and informative.** Operators rely on it to know whether they can trust new Coinag CVU creates / balance reads.
- **`refetchInterval` on `useQuery` is one prop.** No extra plumbing.

### Trade-off

Once BIND + Banco de Comercio land, the indicator becomes per-sponsor
(stackable like the banner). For v1 with one sponsor, one indicator is fine.

### Failure modes the rule prevents

- A developer disables the polling to "save bandwidth" → operator misses a Coinag outage. Spec mandates the 60 s cadence (override is a deliberate config change).

---

## Cross-capability composition

| Capability | What it owns | What `ops-psp` owns |
|---|---|---|
| `core-layout` | AppShell, page header | Page header with title + Coinag health indicator |
| `core-module-types` | Type-A / Type-B / Type-C definitions | Type-A composition with sub-module tabs (Módulo B shape) |
| `core-data-tables` | Table primitive, debounced filters, server-side pagination | Movements + Accounts column sets, filter wiring |
| `core-modals` | Drawer + Centred modal patterns | Drawer for Cuentas drill-down (record-detail surface) |
| `core-forms` | Field types, vee-validate | Filter row inputs |
| `core-api-layer` | `apiClient` axios + `ApiError` | Endpoint wrappers (PSP backend) |
| `core-error-handling` | Skeleton, EmptyState, alert banners, toasts | Reconciliation stackable banner area; surface rendering |
| **`ops-clients`** | `<WhitelistAccountModal>` | Reuse for the Habilitar cuenta CTA on Cuentas tab |
| `core-navigation` | Route registration | Route + sidebar entry under `Operaciones` block + legacy redirects (`/psp/home`, `/psp/accounts`) |

---

## Open questions

1. **Backend-driven sponsor catalog.** Today the catalog is config-driven (file). When does it move to a backend endpoint (`GET /sponsors`)? Likely when sponsor #3 lands or when product wants runtime onboarding without deploys. Tracked as a future extension.
2. **Per-sponsor Coinag health-style polling.** Once BIND + Banco de Comercio land, each sponsor needs its own health endpoint. The shape of the multi-indicator UI (stacked? consolidated?) is a follow-up design.
3. **Movement details modal sharing.** The legacy modal opens on row click in Movimientos and is the same one used by `ops-financial-dashboard`. The shared modal lands when the dashboard is migrated; until then, row clicks on Movimientos are a NO-OP in v1 (operators inspect movements via the legacy URL OR wait for the follow-up). The page renders rows with `cursor-default` to avoid suggesting clickability.
4. **CSV export.** Cut for v1 to keep scope bounded; the operator uses the legacy URL for export until `extend-ops-psp-csv-export`.
5. **SWIFT XML import flow** (`ImportSwiftModal`). Lands as `extend-ops-psp-swift-import` reusing `core-file-upload` for the dropzone. The XML parser logic moves to a pure helper.
6. **Per-sponsor reconciliation cadence.** Today's `/balance-reconciliation` returns a global snapshot that includes every sponsor. If reconciliation goes per-sponsor (a separate endpoint per sponsor) the spec extends with a Modified Requirement; for v1, single endpoint with stackable rendering is the contract.
