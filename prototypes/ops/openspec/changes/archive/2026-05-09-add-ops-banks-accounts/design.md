## Context

Ardua's funds are spread across a tree of three nested concepts:

```
Sociedad (legal entity)         e.g. Circuit Pay SA
  └── Estructura (institution)  e.g. COINAG, BIND, MACRO, BITGO
        └── Cuenta (per-currency holding)  e.g. ARS · Cta 10.045
```

Today this tree is implicit: PSP only knows COINAG, the rest of the data lives in `prototypes/old/ops-old/ops-acciones-prototype.html` (the reference prototype attached to this change) and in `CUENTAS_ESTRUCTURAS.xlsx`. Operators retype free-text in Movimientos and the picker drifts (same account written 4 different ways across rows). FIN is also blocked from drafting the operational plan-of-accounts because there is no canonical list of cuentas to map to a `cod` / `nombre`.

This change introduces `ops-banks-accounts` as the master catalog. It owns the data, the Create flows, the accounting-configuration flow, and the read API that downstream features (Movimientos picker, PSP cuentas tab, FIN Motor Contable validation) will consume.

The page itself is a Type-A surface per `core-module-types`: page header (title + 2 CTAs) + L2 KPI grid (4 cards) + filter row + table. No tabs, no kanban, no detail subpage in v1 — the only nested surface is the Edit modal for accounting configuration.

The reference prototype contains a flat seed dataset of ~30 estructuras across 4 sociedades, with ~50–80 cuentas total. Catalog data is small enough to fetch in one request and filter client-side via `useTable`.

## Goals / Non-Goals

**Goals:**

- Provide the canonical OPS surface to view, create, and accounting-configure every Sociedad / Estructura / Cuenta in Ardua.
- Capture the accounting code mapping **preparatorily** so FIN's Motor Contable can validate against a populated set when it lands.
- Expose a clean read API (`GET /api/banks-accounts`) that downstream pickers (Movimientos, PSP) will consume in follow-up changes.
- Make the page reachable in one click from the OPS sidebar under `Catálogos`.
- Deliver an OPS-first contract that is generalisable: when the catalog moves to FIN ownership later, the spec already covers the accounting concerns.

**Non-Goals:**

- Wiring Movimientos or PSP to consume this catalog as their dropdown source — that is a downstream change (`integrate-movimientos-with-banks-accounts`, etc.).
- Validating accounting codes against FIN's plan-of-accounts. The plan-of-accounts does not exist yet; today's column is preparatory free-text.
- A nested detail subpage (Type-B) per cuenta. v1 stays Type-A. If per-cuenta history (movement timeline, audit trail) is needed later, that is a separate change.
- Per-cuenta `Editar datos` flow. The prototype shows it disabled with a `V2` tag. We honour that — accounting config is the only post-creation edit operators routinely need.
- Bulk import from `CUENTAS_ESTRUCTURAS.xlsx`. Initial seeding ships as a one-shot backend migration; CSV/XLSX upload is V2.
- A "Crear Sociedad" CTA at the page level. The four sociedades (`Circuit Pay SA`, `Haz Pagos SA`, `Ardua Solutions Corp`, `Astra Ventures`) are seed data; new sociedades are rare and an OPS-admin chore, not an operator flow. v1 surfaces the catalog but no Sociedad CRUD UI.
- A "Posición" / "Saldo" column. This module is the **catalog**, not the live balance view. Balances live in PSP / Movimientos / future Tesorería surfaces.

## Decisions

### Decision 1: Three-level data model (Sociedad → Estructura → Cuenta)

**Choice:** model the catalog as three normalised entities with FK relations.

```
Sociedad { id, name, status, ... }
Estructura { id, name, tipo: EstructuraTipo, ... }
Cuenta { id, sociedadId, estructuraId, monedaId, tipoCuenta, nro, padreCuentaId?, status, contable? }
```

`Cuenta` is the leaf; the page renders one row per Cuenta. The table denormalises Sociedad and Estructura inline (badge + label) so operators see all three levels in a single row.

**Why:** the prototype's flat list (`{soc, banco, cta, ...}`) is fine for v1 rendering but a flat schema would make it impossible to:

- Reuse the same Estructura under multiple Sociedades (e.g., `COINAG` under both Circuit Pay SA and Haz Pagos SA — already in the prototype).
- Add per-Estructura settings later (API integration, health endpoint, contact info) without duplicating per Cuenta.
- Power the Movimientos / PSP picker, which is a 3-step cascading dropdown (`Sociedad → Estructura → Cuenta`).

**Alternatives considered:**

- *Single flat `Cuenta` with denormalised `sociedadName` + `estructuraName` strings.* Rejected — locks us into prototype-shaped data and breaks the cascading picker.
- *Two-level (Estructura → Cuenta), Sociedad as a tag on Cuenta.* Rejected — Sociedad is a legal entity with its own attributes (CUIT, country, accounting-firm, audit data) that will grow over time. Modelling it as a top-level entity matches the real domain.

### Decision 2: `Tipo de cuenta` is operator-picked, with a sensible default derived from the structure

**Choice:** the `Cuenta` form (Nueva Cuenta) renders a `<Select>` for `Tipo de cuenta` with options `Cuenta Corriente | CVU | Wallet Pool | Custodia | Exchange Account | Comitente`. The default is derived from the chosen Estructura's `tipo` (e.g., picking a `Banco` defaults to `Cuenta Corriente`; picking an `Exchange` defaults to `Exchange Account`). Operator can override.

**Why:** the prototype encodes the derivation as a hard rule (`getTipoCuenta(banco, mon)`), but in practice the same Estructura can host multiple cuenta types in real Ardua data (Coinag has both CVU and Wallet Pool depending on the currency). Hard-coding the rule on the backend makes the catalog rigid; surfacing the default in the form keeps the ergonomic 90 % default while allowing the 10 % exception.

**Alternatives considered:**

- *Backend-derived only, no operator override.* Rejected — same Estructura can host different cuenta types. Forcing a single derivation either lies about the data or rejects valid combinations.
- *Free text.* Rejected — operators would re-introduce the same drift the catalog is meant to eliminate.

### Decision 3: Cuenta padre is a nullable self-FK on `Cuenta`

**Choice:** `Cuenta.padreCuentaId?: string` — a nullable foreign key that points at another Cuenta. The table renders the parent's `nro` as a single-line label (`CBU Haz Pagos · Coinag`) when set, else a dim em-dash.

**Why:** the prototype already needs this for the PSP scheme (ARS CVUs nest under the institution's master CBU). Modelling it as a generic self-FK on Cuenta — instead of a special-case PSP rule — keeps the data model open for future structures (e.g., custodios with sub-wallets per fund) without a schema migration.

**Alternatives considered:**

- *Hard-coded `BC_PADRE` lookup map.* Rejected — special-cases PSP, won't generalise.
- *Two distinct entity types (`MasterCuenta` and `SubCuenta`).* Rejected — over-modelled. A nullable parent is enough.

### Decision 4: Accounting configuration is captured but flagged "preparatory"

**Choice:** the `Cuenta.contable` field is a structured object `{ cod: string; nombre: string; tipo: AccountingType; obs?: string }`. It is **not** validated against a plan-of-accounts in v1. The page shows a persistent blue notice banner above the table:

> "La configuración contable de este módulo es **preparatoria**. Cuando FIN defina el plan de cuentas operativo del grupo, cada cuenta aquí configurada se validará y vinculará al asiento tipo correspondiente del Motor Contable."

When FIN's Motor Contable lands as its own change, a follow-up will turn the free-text `cod` into a strict reference to the FIN plan and the validation flips on.

**Why:** OPS is blocked today by the absence of FIN's plan-of-accounts. Waiting for FIN means Bancos / Cuentas can't ship. Capturing the data preparatorily lets operators get started, and the explicit notice prevents downstream surprises ("why is the accounting code free text?"). The notice is the contract that this is intentional, not an oversight.

**Alternatives considered:**

- *Block accounting config until FIN's plan lands.* Rejected — kills 80 % of the value of shipping the catalog now.
- *Accept the data silently with no preparatory notice.* Rejected — leaves operators thinking the codes are validated when they aren't, leading to silent miswiring later.

### Decision 5: Two page-header CTAs (`Nueva Estructura` + `Nueva Cuenta`), both Create modals

**Choice:** the page header exposes two `<Button>` CTAs side by side. `Nueva Estructura` opens a Create-Structure modal; `Nueva Cuenta` (primary) opens a Create-Account modal whose `Estructura` field is a `<Select>` populated from the existing structures.

**Why:** Estructura and Cuenta are different shapes (Estructura has `tipo`, contact info, integration metadata; Cuenta has `monedaId`, `nro`, `tipoCuenta`, `padreCuentaId`). A single combined modal would balloon to ~12 fields with conditional display logic — far worse UX than two focused dialogs. The page header has 2 of the 3 allowed CTAs per `core-layout`, leaving room for a future third (likely `Importar desde CSV` in V2).

**Alternatives considered:**

- *Single combined modal with a "tipo de creación" toggle.* Rejected — UX clutter, conditional fields, harder to validate.
- *Estructura created inline from the Cuenta form ("+ Nueva estructura" inline button).* Rejected for v1 — the inline-create UX is non-trivial (modal-on-modal) and the Estructura form has its own validation surface that doesn't fit cleanly inline. Reasonable for a future V2 enhancement.

### Decision 6: Per-row Actions menu has `Configurar cuenta contable` (active) + `Editar datos` (V2 disabled)

**Choice:** every row's Actions menu (shared `ActionsMenu.vue` portal per `core-actions-menu`) renders two items in this order: `Configurar cuenta contable` (active) and `Editar datos` (disabled with a `V2` tag on the right side, per the prototype).

**Why:** in operator workflow, the field that needs frequent post-creation edits is the accounting code (FIN delivers updates incrementally). Other Cuenta fields (number, currency, parent, structure) are set at creation and rarely change — when they do, the safer flow is "deactivate + recreate" rather than in-place edit (audit trail). Honouring the prototype's `V2` tag tells operators the missing capability is acknowledged and on the roadmap, without leaving an active button that throws.

**Alternatives considered:**

- *Hide `Editar datos` entirely until V2.* Rejected — operators will look for it; the tag-disabled affordance signals it exists conceptually.
- *Ship `Editar datos` in v1.* Rejected — scope creep, the v1 ships catalog + accounting; data edit can wait.

### Decision 7: Catalog data is small — fetch all at once, filter client-side via `useTable`

**Choice:** `GET /api/banks-accounts` returns the full catalog (no server-side pagination). The page mounts one query, then `useTable<BankAccountRecord>({ data, searchFields: ['banco', 'sociedad', 'nro'], pageSize: 25 })` handles pagination, search, and filter state in memory.

**Why:** real Ardua catalog has ~80 cuentas today and is unlikely to exceed a few hundred. Client-side filtering keeps the page snappy (no debounce, no loading flicker on filter change), keeps the KPI counters trivially derivable from the full dataset, and keeps `core-data-tables` compliance straightforward (`useTable` is the canonical surface for client-side data).

**Alternatives considered:**

- *Server-side pagination via `@tanstack/vue-query`.* Rejected — over-engineered for ~100 rows. Adds API round-trips, complicates KPI math (have to re-query for each filter change to get the full count). If the catalog ever grows past 1000 rows, this is a non-breaking refactor (swap `useTable` for the query-table pattern).

### Decision 8: KPIs always reflect the full dataset, not the filtered view

**Choice:** the 4 KPI cards (`Estructuras`, `Cuentas totales`, `Config. contable`, `Sin configurar`) compute their values from the entire response, **not** from the rows visible after the filter is applied.

**Why:** the KPIs answer "what is the state of the catalog?" — a question the operator asks regardless of how they have currently narrowed the view. If the KPIs followed the filter, applying `Sociedad: Circuit Pay SA` would show 0 `Sin configurar` if Circuit Pay was tidy, hiding the fact that 14 cuentas across other sociedades still need attention. KPIs as catalog-state indicators are more useful than KPIs as filtered-view indicators.

**Alternatives considered:**

- *KPIs follow the filter.* Rejected — see above.
- *Two parallel KPI strips ("catalog state" + "filtered state").* Rejected — visual noise for marginal gain.

### Decision 9: Currency is a domain enum (`Moneda`) with a fixed v1 set

**Choice:** `Moneda` is a union literal type with the values `'ARS' | 'USD' | 'USDC' | 'USDT' | 'BTC'` (the five currencies present in the prototype dataset). The catalog rejects any other value at the API boundary.

**Why:** new currencies are rare events that warrant a deliberate code change (chart colour, breadcrumb, KPI rounding rules, conversion rates downstream). A free-text currency field would let operators introduce typos (`USD$`, `usdt`, `usdc`) and pollute the picker. The fixed set is the simpler, safer default.

**Alternatives considered:**

- *Free-text `moneda`.* Rejected — invites drift.
- *FK to a `Moneda` table with operator-managed CRUD.* Rejected for v1 — over-engineered. Future change can promote it if needed.

## Risks / Trade-offs

- **Accounting codes captured here may be invalid against FIN's plan-of-accounts** → the preparatory notice + the future Motor Contable change accept this. Operators who want to wait can leave the column blank; the `Sin configurar` KPI surfaces backlog.
- **Dual ownership of structure metadata** → `EstructuraTipo` overlaps with PSP's notion of "partner" (COINAG, BIND, etc.). Mitigation: `ops-psp` already uses `Sponsor` / `BancoSponsor` internally; once Movimientos and PSP migrate to consume `ops-banks-accounts`, those parallel ontologies collapse into one. v1 ships them in parallel — a follow-up change consolidates.
- **Cuenta padre constraints are not enforced in v1** → operators could in theory point a parent at a child of a different Sociedad. Mitigation: the form filters parent options to the same Sociedad. Backend should also enforce at API level — captured as a task.
- **No bulk import** → seeding requires a one-shot backend migration script per environment. Mitigation: the migration script lives in the backend repo, not in scope for this change. CSV upload is a V2 follow-up.
- **No view-toggle** → page is list-only. Operators familiar with kanban / cards in other modules may expect them here. Mitigation: catalog data is fundamentally tabular; if a card view is requested later, `core-module-types` allows declaring `views: ['list', 'cards']` and the toggle re-appears.

## Open Questions

- **Sociedad CRUD in v1?** Default is no — sociedades are seed data. Confirm before implementation.
- **`AccountingType` enum values for the modal `tipo` field?** The prototype seeds `'act-disp'` (activo disponible). Confirm the full set with FIN before exposing as a `<Select>`. If not yet known, ship as free-text in v1 with a note in the modal.
- **API ownership** — is this catalog owned by the OPS backend or by a future shared `core-data` service? For v1 we assume OPS backend; cross-app consumption (Movimientos, PSP) is a `core-data` concern resolved in follow-up changes.
- **Soft-delete vs status field?** Currently we propose a `status: 'Activa' | 'Inactiva'` field on Cuenta. Should the same field exist on Estructura and Sociedad? Default: yes, same field on all three for consistency. Confirm before implementation.
