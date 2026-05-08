# Design — add-ops-financial-dashboard

## Context

This is the sixth and final OPS migration change, closing the OPS migration
backlog. The legacy file is the largest in the project (6,592 LOC); the
migration takes the same approach as `ops-psp` — read-only at the data-mutation
level in v1, every modal-driven creation flow deferred to follow-ups.

The Movement Details modal is the cross-capability artefact this change
delivers: it lives here as the canonical home, and `ops-psp`'s deferred row-
click integration will import it from here when that follow-up lands.

---

## Decision 1 — V1 is read-only at the data-mutation level (consistent with `ops-psp`)

### The question

The legacy ships 5+ creation/mutation modals: `CreateMovement` (~3,000 LOC,
4 sub-types), `PayQuote`, `DirectSwap`, `UnsupportedQuote`, `ImportSwift`.
Each is non-trivial; `CreateMovement` alone is half the page's LOC. Should
v1 migrate any of them?

### The decision

**No.** V1 migrates the read-side + the Movement Details modal + the Receipt
download action. Every other modal is a follow-up.

### Why

- **Consistent with `ops-psp` Decision 3.** The two heaviest OPS pages share
  the same migration philosophy: get the architectural shape right first,
  defer per-modal flows to focused follow-ups.
- **`CreateMovement` is the riskiest modal.** 4 sub-types each with branching
  currency selectors, account pickers, rate/fee fields, FX-specific logic.
  Migrating it 1:1 would force re-implementing 3,000 LOC of branching state
  machine; doing it well means a fresh design pass that fits the new
  primitives (probably `core-multi-step-form` Wizard for one branch + 3
  parallel sub-flows).
- **Quote actions are 3 separate modals selected by quote shape.** Each is a
  lightweight wizard but each needs its own design pass — the current legacy
  pattern of "click status → modal" works but doesn't generalise; we'd want
  to think about whether the action lives on the row or a side drawer.
- **`ImportSwift` is already deferred** in `ops-psp` (`extend-ops-psp-swift-
  import`). The follow-up there will declare the modal in a shared location
  that both capabilities import.

### Trade-off

For some weeks operators who need to create movements / pay quotes use the
legacy URL until each follow-up lands. The new `/financial-dashboard` is
read-mostly during the transition.

### Failure modes the rule prevents

- A developer ships a `Crear movimiento` button that opens a stub modal →
  spec rejects.
- A developer copy-pastes the legacy `CreateMovement` ~3,000 LOC into
  `src/ops/financial-dashboard/` → spec rejects; the migration of that modal
  is a separate change.

---

## Decision 2 — `MovementDetailsModal` lives HERE, NOT in a shared `src/ops/movements/` capability

### The question

Both `ops-financial-dashboard` (Activity tab row click) and `ops-psp`
(Movimientos tab row click — DEFERRED to its own follow-up) need the Movement
Details modal. Three options:

- **(A)** Live in this capability (`src/ops/financial-dashboard/MovementDetailsModal.vue`); other capabilities import it.
- **(B)** Create a separate `ops-movements` capability that owns the modal.
- **(C)** Duplicate the modal across capabilities.

### The decision

**Option A.** The modal lives here; `ops-psp` follow-up imports it.

### Why

- **`ops-financial-dashboard` is the canonical movements surface.** Activity
  IS movements. The modal's behaviour is tied to the Movement entity, which
  is the central concept of this capability.
- **`ops-psp` is a derivative consumer.** PSP shows movements filtered to PSP
  sponsors but does not own the entity.
- **Splitting into `ops-movements` would be over-decomposition.** A capability
  should be a unit of independent evolution; a one-modal capability is too
  small.
- **Same precedent as `<WhitelistAccountModal>`** living in `ops-clients` and
  reused by `ops-psp` (per `add-ops-psp` Decision 5).

### Failure modes the rule prevents

- A developer copy-pastes the modal into `src/ops/psp/MovementDetailsModal.vue`
  in the future PSP follow-up → spec violation; the import path is fixed.

---

## Decision 3 — The dashboard is registered at `/financial-dashboard`, NOT `/`

### The question

The legacy registers `FinancialDashboard.vue` at both `/` and `/dashboard`,
making it the operator's home. The new template ships `Dashboard.vue` (from
`core-modulo-genericos`) at `/`. Should we:

- **(A)** Migrate `FinancialDashboard` to `/` (override the generic dashboard).
- **(B)** Migrate `FinancialDashboard` to a new path `/financial-dashboard` (or `/operations`) and keep the generic `/` Dashboard.

### The decision

**Option B.** New path `/financial-dashboard`. The generic Dashboard at `/`
stays; the legacy `/dashboard` URL redirects to `/financial-dashboard?tab=
activity`.

### Why

- **The generic Dashboard is contracted by `core-modulo-genericos`** as the
  canonical home (KPI widgets, cross-cutting summaries, alerts). Overriding
  it for one domain (OPS) breaks the canon: every app would justify its own
  `/` override and the abstraction collapses.
- **`/financial-dashboard` is a self-describing path.** The operator who
  bookmarks this knows what they bookmarked.
- **The legacy `/dashboard` redirect preserves bookmarks**; operators who land
  on the OPS app's old root land on the new path.

### What about the legacy `/` (root)?

The legacy `/` is owned by the generic Dashboard now. If product later wants
the financial dashboard back at `/`, it lands as a per-app
`<DashboardWidgets>` override on the canonical Dashboard surface — the
financial dashboard's KPIs become widgets on the generic Dashboard, while
the full activity ledger stays at `/financial-dashboard`. Out of scope for
this change.

### Failure modes the rule prevents

- A developer registers the dashboard at `/` to "preserve legacy parity" →
  shadows the generic Dashboard. Spec rejects.

---

## Decision 4 — Quotes sub-toggle (Active / Historic) is a `view` URL param, NOT a tab

### The question

The Quotes tab has an internal toggle: `Active Quotes` (default) /
`Historic Quotes`. Should we:

- **(A)** Promote it to a third top-level tab (3 tabs: Activity, Quotes
  Active, Quotes Historic).
- **(B)** Keep it as a sub-toggle inside the Quotes tab (legacy parity), with
  `?view=active|historic` URL param.

### The decision

**Option B.** Sub-toggle, `?view=active|historic` URL param, default `active`.

### Why

- **Three top-level tabs would suggest equal cognitive weight** between
  Activity and the two quote views, which is wrong: Active and Historic are
  the same data shape with different time filters. They belong together.
- **The sub-toggle stays compact.** A pair of pill buttons next to the
  filters is enough; promoting them to tabs adds chrome.
- **URL param keeps deep-links shareable.** Bookmarking a "I'm currently on
  historic quotes" view works the same as bookmarking the active filters.

### Failure modes the rule prevents

- A developer adds the historic view as a full-route `/financial-dashboard/
  quotes/historic` → spec rejects; same surface, different param.

---

## Decision 5 — Activity tab reuses `ops-psp`'s sponsor filter cards, but does NOT cross-tab the sponsor filter into PSP

### The question

`ops-psp` has per-sponsor filter cards on its Movimientos tab + cross-tab
sponsor persistence (clicking a sponsor on Disponibilidad pre-applies the
filter when switching to Movimientos or Cuentas). Should the financial
dashboard's Activity tab share that cross-tab persistence with `ops-psp`?

### The decision

**Reuse the sponsor cards visual + filter behaviour, but DON'T cross-tab
sync between dashboards and PSP.** The two dashboards are independent
surfaces; persisting the sponsor filter across them would feel surprising
("I filtered Coinag here, why is it filtered there?").

### Why

- **They serve different purposes.** Financial dashboard is the operations
  home; PSP is the integration partner detail. Operators may filter to
  Coinag for reconciliation work in PSP, but want all sponsors visible in
  Activity for a global view.
- **Within each dashboard, cross-tab persistence stays.** Activity → Quotes
  preserves the sponsor filter. Disponibilidad → Movimientos → Cuentas in
  PSP preserves it.

### Implementation

The component `<SponsorFilterCards>` from `ops-psp` is candidate for
extraction to a shared `src/ops/psp/SponsorFilterCards.vue` (or
`src/components/operations/SponsorFilterCards.vue` if multiple OPS modules
end up using it). For v1 this change imports the component from
`src/ops/psp/MovementsFilters.vue`'s sponsor-cards row — but extracting it
into a thin sub-component is cheap and the right pattern. Out of scope for
this change's spec; the implementation chooses.

### Failure modes the rule prevents

- A developer wires shared sponsor-filter persistence across dashboards →
  surprises operators. Spec mandates per-dashboard persistence only.

---

## Decision 6 — Quality-of-life refinements over the legacy

### The question

Same lens as prior changes.

### The decision

**Land 4 refinements in v1** (one fewer than the average — the dashboard's
read-only scope leaves less surface for refinements).

| # | Refinement | Frontend cost | Operator value |
|---|---|---|---|
| 6a | **URL sync of active tab + sub-toggle + filters**: bookmarks share specific views | 1 watcher | Compatible with browser navigation; deep-linkable |
| 6b | **localStorage of last-active tab + last sub-toggle**: opening `/financial-dashboard` from the sidebar restores the previously-active tab + sub-toggle | 1 ref + watcher | Operator who lives on Quotes Active doesn't have to switch on every visit |
| 6c | **Movement Details modal: deep-link via `?movement=:id`**: opening the URL with the param auto-mounts the modal on top of the Activity tab; closing strips the param | ~10 LOC | Shareable links to a specific movement |
| 6d | **Quote tooltip on Status badge**: hover the read-only status badge in v1 surfaces a tooltip explaining why the action button is hidden ("Acciones de quote disponibles próximamente") | ~5 LOC | Operator transitioning from legacy gets visible context for the missing action buttons |

### Why these four

Same as prior changes: pure-frontend, low coupling, operator-asked.

Refinements explicitly OUT for v1 (deferred):

- Receipt PDF preview inline (vs new tab) — needs `<embed>` or PDF.js;
  out of scope.
- Auto-refresh of the movements ledger every N seconds — opinionated; some
  operators prefer manual refresh, some don't. If product wants it later,
  ship as a per-operator preference (`localStorage:ops:dashboard:autoRefresh`).
- "Watch this movement" / star → workflow concern that doesn't have a clear
  use case yet.
- KPI strip — does not exist in legacy; cut.

### Failure modes the rule prevents

Same as prior changes: each refinement is contracted as a Scenario in its
host Requirement, never a non-spec implementation detail.

---

## Cross-capability composition

| Capability | What it owns | What `ops-financial-dashboard` owns |
|---|---|---|
| `core-layout` | AppShell, page header | Page header with title |
| `core-module-types` | Type-A / sub-module tabs | Type-A composition (Activity + Quotes) |
| `core-data-tables` | Table primitive, debounced filters, server-side pagination | Movements + Quotes column sets, filter wiring |
| `core-modals` | Centred modal pattern | Movement Details modal |
| `core-forms` | Field types, vee-validate | Filter row inputs |
| `core-api-layer` | `apiClient` axios + `ApiError` | Endpoint wrappers |
| `core-error-handling` | Skeleton, EmptyState, alert banners, toasts | Surface rendering |
| `core-navigation` | Route registration | Route + sidebar entry under `Operaciones` block + legacy redirect |
| `core-modulo-genericos` | Generic Dashboard at `/` | The financial dashboard registers at `/financial-dashboard`, NOT `/`; the generic stays |
| **`ops-psp`** | Sponsor filter cards visual | Reuse for Activity tab; per-dashboard cross-tab sponsor sync only |

---

## Open questions

1. **Component extraction of `<SponsorFilterCards>`.** Currently inline in
   `ops-psp`'s `<MovementsFilters>`. Worth extracting as a shared component
   when multiple consumers exist (this change makes it 2). Out of scope for
   this spec; the implementation decides.
2. **Receipt download endpoint shape.** Today `GET /receipt/:id` returns
   `{ url }` (similar to confirmation letters). When the backend introduces
   alternative formats (CSV / direct PDF inline) the spec extends.
3. **Quote actions follow-up scope.** `extend-ops-financial-dashboard-quote-
   actions` will need to migrate 3 modals (Pay / DirectSwap / Unsupported)
   + one alert dialog (Confirmation) + one info modal (WarningResult). The
   right decomposition is open: one capability or three? Decided in that
   change's design.
4. **Create Movement follow-up scope.** Likely the largest single follow-up
   in OPS by LOC. The right decomposition is open: one giant change with
   the 4 sub-types in one wizard, or 4 changes (one per sub-type)? Decided
   in that change's design.
5. **Kanban-flavoured movements view.** Some operations teams prefer a
   kanban over a table for in-flight movements (PENDING / VALIDATING /
   COMPLETED columns). `core-modulo-genericos` Inbox profile A contracts a
   kanban primitive; if product validates the view, lands as `extend-ops-
   financial-dashboard-kanban-view`.
