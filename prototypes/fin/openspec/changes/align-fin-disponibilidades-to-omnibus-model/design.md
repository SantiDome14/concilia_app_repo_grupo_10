# Design — align-fin-disponibilidades-to-omnibus-model

## Context

The Disponibilidades capability was specced and built when the conceptual model of the module was still open. The discovery sessions closed on 2026-05-20 with a substantially different model, captured in `features/fin/fin-tesoreria-disponibilidades.md` (the feature file in the parent framework repo). This change brings the prototype to parity with that feature.

The current state of the prototype materialises the **previous** mental model:

- KPIs in USD-equivalent with a Propio / Cliente split (`POSICION_KPIS.posicionConsolidada`, `.totalPropio`, `.totalCliente`).
- Each `CuentaPos` carries `saldo_propio` + `saldo_cliente` as if those quantities had an authoritative per-cuenta meaning.
- `MovimientoTipo` covers the 12 OPS-vostro flow types only. Manifest predicates discriminate by `origen` (`OPS` / `TRD` / `Manual`).
- `Movimiento` has no `asiento_id`, no `evento_id`. The model is "one record, one row, one cuenta affected".

The closed model is different on every axis:

- **Omnibus accounting.** Internally, "the customer's balance lives in account X" is **false**. The customer balance is a liability on the ledger; the physical funds live in pool accounts inside the sociedad, allocated discretionarily by Operaciones. The question "whose money is in this account?" is malformed and must not be answerable by the UI.
- **Ecuación maestra.** The system's invariant is `Σ Bancos = Σ Obligaciones + Σ Pendientes + Σ Capacidad Operativa`, valid per moneda, per sociedad and consolidated.
- **Society-scoped double entry.** Each asiento contable belongs to exactly one sociedad. Events affecting two sociedades (Préstamo intercompany, Sweeping cross-sociedad) generate two mirrored asientos, one per sociedad's book.
- **Tipos matrix as closed contract.** 21 rows. Any event that does not fit a row indicates a missing tipo, not a manifest gap.
- **Categoría as the primary dimension.** Two ortogonal axes (presencia de cliente × presencia de flujo físico) yield 6 categorías (A-F) that govern campos de carga, predicados de acciones y valores del estado de imputación. `origen` becomes a back-reference.

The prototype has no real backend consumers and no shipped features in production. This is the right moment to realign.

## Goals / Non-Goals

**Goals:**

- Bring `MovimientoTipo`, the 4 Posición KPIs, the manifest predicates, the carga manual dialog, and the spec `### Requirement:` set into parity with the feature.
- Introduce the asiento/evento model required for cross-sociedad event modelling (Préstamo intercompany + Sweeping).
- Make the 6-category dimension (A-F) a first-class lens of the UI (new kanban axis, new manifest predicate base).
- Keep the supervision flow (creator ≠ supervisor, pendiente_de_supervisión excludes from saldo) untouched — it already satisfies the feature.
- Keep the drill-down Posición → Movimientos (cuenta_id pre-filter) untouched — it already satisfies the feature.

**Non-Goals:**

- Building the Motor Contable formal (plan de cuentas individual, generación automática de asientos formales). V1 modela a nivel grupo contable.
- Persistencia real más allá del Pinia store en memoria que ya existe.
- Edición o eliminación de movimientos. Inmutabilidad es Requirement; las correcciones son via Ajuste de Crédito / Débito / Manual.
- Subtipos del Patrimonio operativo (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados). V1 es una sola cuenta técnica.
- Conversiones cross-moneda, catálogo de monedas/tasas, vista de Exposición / Vencimientos. V1 cada KPI/saldo en su moneda nativa.
- Conciliación automática contra extracto bancario / API on-chain / exchange. Off-V1.
- Integración del módulo Inbox. V1 supervisa localmente.

## Decisions

### Decision 1 — `MovimientoCategoria` is a **derived** value, not stored on the record

**Question:** the 6 categorías (A-F) govern manifest predicates and surface as a kanban axis. The categoría is a function of three signals on the record: `tipo`, presencia de cliente (`fin.cliente_id !== null`), presencia de flujo físico (depends on tipo). Should we (a) store `categoria` as an explicit field on `Movimiento`, or (b) derive it on the fly via a pure helper `categoriaOf(movimiento)`?

**Decision:** (b) — pure derivation. Single source of truth is `tipo` + the feature's matriz.

**Why:**

- The matriz is the contract. The categoría is fully determined by it; storing it duplicates state and introduces drift risk (a tipo change without a matching categoría change is a silent bug).
- The derivation is deterministic and cheap. Memoising is trivial if a perf issue ever surfaces.
- The kanban renderer projects records through `categoriaOf(m)` exactly the same way today's renderer projects `_imp_ardua`, `_imp_cliente`, `_sociedad` (already a derived-axis pattern in the page).
- The manifest engine's predicate evaluator already supports computed field paths via the projection layer. The page can expose `_categoria` as a projected field on the `MovimientoProjected` shape (same pattern as `_imp_ardua`).

**Alternatives considered:**

- (a) stored field — rejected. Duplication. Possible drift if the matriz is updated without a mock-data migration.
- (c) categoría as a runtime augmentation in the manifest engine — rejected. Would require touching the engine core just for FIN's needs; the projection pattern at the page layer is already the canonical extension point.

**Failure modes the rule prevents:**

- A new tipo added to the matriz with the wrong stored categoría — silent classification bug. Derivation makes the matriz the only place to update.

### Decision 2 — Cross-sociedad events generate **two mirrored asientos**, linked by `evento_id`

**Question:** the feature says Préstamo intercompany and Sweeping cross-sociedad each generate two asientos espejo (one per sociedad's book). Modelling options: (a) **one Movimiento with two `sociedad_id` fields** (`sociedad_origen_id` + `sociedad_destino_id`); (b) **two Movimientos linked by a shared `evento_id`**, each carrying its own `sociedad_id` and its own asiento; (c) **one Movimiento with a nested `asientos: Asiento[]` array** holding both halves.

**Decision:** (b) — two Movimiento records, distinct `id`, distinct `asiento_id`, shared `evento_id` and shared `tipo`.

**Why:**

- The feature is explicit: "se generan dos asientos formalmente independientes — uno en el libro de cada sociedad — relacionados únicamente por la referencia al mismo evento operativo". The model must reflect formal independence.
- The Movimientos sub-tab is a flat ledger view (per the spec). Each row = one asiento. Filtering by sociedad must show only that sociedad's asiento, not the other half — single-record models break that filter.
- The Posición sub-tab aggregates saldos by Sociedad → Cuenta. With two-record modelling each sociedad's saldo updates from its own row. Single-record modelling would force every aggregator to know about cross-sociedad bifurcation — a leak.
- The manifest engine and `useTable` work record-by-record. Two records fit naturally; one-with-array breaks the row mental model.
- `evento_id` makes the pair queryable: "show me both halves of M-2026-99001" via `WHERE evento_id = X`. The page can render a small "Evento" badge that opens a side-by-side detail when needed (out of scope for this change but unblocked).

**Alternatives considered:**

- (a) one record + two sociedad fields — rejected. Breaks per-sociedad aggregation and per-sociedad filters; the row counts in the kanban / list become misleading.
- (c) nested asientos array — rejected. Per-record assumption broken; useTable / kanban don't have a notion of half-rows.

**Failure modes the rule prevents:**

- Per-sociedad saldos that count cross-sociedad events twice (once per "side" of the single record) or zero times.
- Drill-down from Posición.Cuenta of Sociedad A showing the Sociedad B half of a Préstamo intercompany.
- Kanban "Sociedad" axis with a phantom "BOTH" column or an ad-hoc tie-breaker.

**Carga manual dialog implication:** the `PRESTAMO_INTERCOMPANY` and `SWEEPING_CROSS_SOCIEDAD` CTAs expose a single dialog with both Sociedad fields (`sociedad_origen_id`, `sociedad_destino_id`). On confirm, the engine creates two records — one for each sociedad — sharing the same `evento_id`. The supervision flag, if any, applies to **both** asientos atomically: rejecting one rejects the pair.

### Decision 3 — Legacy types (`COLLECTOR_IN/OUT`, `ADDITION`, `TAX`) are **removed**, not aliased

**Question:** the current `MovimientoTipo` has 12 values. The feature's matriz has 21. Some legacy values map cleanly (`DEPOSIT` and `WITHDRAWAL` survive verbatim, `FEE` and `REBATE` survive verbatim, `SWAP_IN/OUT` survive verbatim, `TRANSFER_IN/OUT` survives verbatim as variant of Mov entre cuentas propias). Others don't: `COLLECTOR_IN/OUT`, `ADDITION`, `TAX`. Options: (a) keep them as aliases for backward compat, (b) remove them and rewrite the mocks. The prototype has no real backend; the mocks are the only consumers.

**Decision:** (b) — remove. Rewrite the mocks to the matriz vocabulary.

**Why:**

- The prototype is a vehicle for validating the closed model. Aliases would carry the previous mental model forward and pollute every consumer that touches the type.
- The mocks are not customer data; rewriting them is cheap. Tests touch the type discriminator in a handful of asserts.
- Aliases create a silent N-way taxonomy problem: ¿`COLLECTOR_IN` is a `DEPOSIT` or a `DEPOSITO_PENDIENTE`? The feature is explicit that the matriz is the closed contract; an alias forks the contract.
- The feature's tipo names are Spanish and SCREAMING_SNAKE (e.g., `COMISION_BANCARIA`). The legacy tipos are English (`FEE`, `TAX`). Keeping English where the feature has Spanish and vice versa would be cognitively inconsistent. Decision: keep tipo names exactly as the feature writes them (Spanish, ascii-folded, screaming snake). `FEE` becomes `FEE` (matches the feature). `TAX` is replaced by the more specific tipo applicable in each case (`COMISION_BANCARIA` if banking, `PAGO_PROVEEDOR` with categoría "impuestos" if afip-style — see mapping table).

**Mapping table (legacy → matriz):**

| Legacy | Replacement(s) | Notes |
|---|---|---|
| `COLLECTOR_IN` | `DEPOSITO_PENDIENTE` or `DEPOSIT` | If the depósito arrives without identifying client → `DEPOSITO_PENDIENTE`. If identified → `DEPOSIT`. |
| `COLLECTOR_OUT` | `WITHDRAWAL` | The collector_out flow is the retiro vostro — same as `WITHDRAWAL`. |
| `WITHDRAWAL` | `WITHDRAWAL` | Survives verbatim. The feature uses "Retiro" in the matriz prose, but the tipo identifier stays English for consistency with the rest of the OPS-native vostro flow (DEPOSIT, FEE, REBATE, SWAP_*, SPREAD). User-facing labels in dialogs and badges may localize to "Retiro". |
| `DEPOSIT` | `DEPOSIT` | Survives verbatim — but the feature uses "Depósito" in the matriz. We keep ASCII screaming snake throughout; `DEPOSIT` is acceptable. |
| `TRANSFER_IN` / `TRANSFER_OUT` | `MOV_ENTRE_CUENTAS_PROPIAS` | Single tipo; the +/- side is implied by the asiento's Db/Cr split. |
| `ADDITION` | `AJUSTE_CREDITO` / `AJUSTE_DEBITO` / `AJUSTE_MANUAL` / `APORTE_CAPITAL` | The legacy `ADDITION` was an over-general "ajuste interno"; the feature splits this into 4 distinct tipos with different contrapartes contables. The mocks are rewritten record-by-record to the correct replacement. |
| `TAX` | `PAGO_PROVEEDOR` (provider = AFIP/treasury) or `AJUSTE_MANUAL` | The feature does not have a TAX tipo as a first-class category — taxes are paid as `PAGO_PROVEEDOR` with the appropriate provider. |

**Naming convention adopted:**

- Tipos that survive verbatim from the legacy set: `DEPOSIT`, `WITHDRAWAL`, `FEE`, `REBATE`, `SWAP_IN`, `SWAP_OUT`, `SPREAD`.
- No legacy tipo is renamed. Renaming `WITHDRAWAL` to `RETIRO` was considered (the feature's prose uses "Retiro") and rejected — the user explicitly chose to keep `WITHDRAWAL`. The English identifier is stable; user-facing labels can localize independently.
- New tipos in SCREAMING_SNAKE Spanish: `SOLICITUD_RETIRO_PENDING`, `DEPOSITO_PENDIENTE`, `ASIGNACION_PENDIENTE`, `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `MOV_ENTRE_CUENTAS_PROPIAS`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `APORTE_CAPITAL`, `AJUSTE_MANUAL`.

The convention is: **stable English tipos for the OPS-native vostro flow that already had English names** (DEPOSIT, WITHDRAWAL, FEE, REBATE, SWAP_*, SPREAD), **Spanish for the new FIN-managed tipos that did not exist before**. This minimises diff churn on existing OPS-side code that consumes the OPS-native tipos.

**Alternatives considered:**

- (a) keep aliases → rejected for the reasons above.
- (c) full ASCII English translation of every Spanish tipo (`BANK_FEE`, `INTERCOMPANY_LOAN`, etc.) → rejected. The feature is the source of truth; renaming "for English consistency" is invented work that diverges from the canon document the team aligned on.

### Decision 4 — Per-moneda KPI rendering: **multi-row** inside a single card, no collapsibles

**Question:** the 4 KPIs (Bancos / Obligaciones / Pendientes / Capacidad Operativa) are per moneda — the group holds funds in ARS, USD, EUR, USDC, USDT, CAD at minimum. Each KPI has up to 6 values. Three options: (a) one card per KPI × moneda (24 cards) — explodes the strip; (b) one card per KPI, multi-row body with one row per moneda (4 cards, 4-6 rows each); (c) one card per KPI with a collapsible body that expands on hover/click.

**Decision:** (b) — 4 cards, multi-row body, every moneda visible by default.

**Why:**

- The feature requires the operator to see the ecuación maestra at a glance. Collapsing it hides the invariant.
- 4 KPI cards is well within the `core-layout` cap on KPI strip (5 max). Each card can host 4-6 rows comfortably.
- Per-moneda is the natural granularity of the ecuación maestra. The user is expected to read row-wise: ARS → Bancos / Obligaciones / Pendientes / Capacidad Operativa.
- A simple text layout suffices — no chart primitives needed.

**Card layout per KPI:**

```
┌────────────────────────────────┐
│ BANCOS                         │  (KPI label, uppercase, t-4)
├────────────────────────────────┤
│ ARS    1.117.230.500           │  (moneda + monto formateado)
│ USD       11.450.000           │
│ EUR        1.820.000           │
│ USDC       1.580.000           │
│ USDT       1.780.000           │
│ CAD        1.200.000           │
└────────────────────────────────┘
```

**Alternatives considered:**

- (a) 24 cards — rejected. Explodes the strip; breaks `core-layout` cap; loses the KPI-as-grouping affordance.
- (c) collapsible — rejected. Hides the ecuación maestra; adds interaction cost; no reason to collapse the canonical invariant of the module.

### Decision 5 — `evento_id` is page-level, `asiento_id` is record-level

**Question:** with Decision 2 fixed (2 records for cross-sociedad), where do the new fields live? Options: (a) both on `Movimiento`; (b) `asiento_id` on `Movimiento`, `evento_id` on a sidecar `Evento` table; (c) `evento_id` on `Movimiento`, asiento as a derived value.

**Decision:** (a) — both fields directly on `Movimiento`. No sidecar. Asiento is treated as a string id only in V1 (no `Asiento` interface; the conceptual asiento entity is the implicit Db/Cr pair captured in the matriz row).

**Why:**

- The feature is explicit that V1 modelos asientos a nivel grupo contable (no plan de cuentas formal). The asiento ID is a stable label for "this Db/Cr pair" — no metadata to attach beyond what the Movimiento already carries.
- A sidecar `Evento` table would require a join in every aggregator. V1 just queries by `evento_id` field.
- `asiento_id` is what supports inmutabilidad ("you can't edit asiento X, only register a compensating asiento Y").
- When the Motor Contable lands in V2, we add the `Asiento` interface formally; the field on Movimiento stays.

**Alternatives considered:**

- (b) sidecar Evento — rejected. Over-engineering for V1.
- (c) asiento derived — rejected. The asiento is a real persisted thing; deriving it would force a hash-of-content scheme that's worse than just generating a sequential id.

## Risks / Trade-offs

### [Risk] Mock rewrite breaks unit tests not directly related to Disponibilidades

**Mitigation:** scope the type rename to FIN-Disponibilidades only. Cotizaciones, Alertas, Inbox, Reportes have their own type spaces and don't consume `MovimientoTipo`. The OPS-prototype consumes the legacy types but lives in a separate prototype directory (`prototypes/ops`) — out of scope here, will be aligned in a follow-up change.

### [Risk] Catalog dropdowns in the Cargar movimiento manual dialog reference tipos that don't exist after the rename

**Mitigation:** the dialog's `tipo` select options are declared in the manifest. The change rewrites the manifest's `options[]` to the new vocabulary in lockstep with the type rename. The catalog resolver (`plugins/catalogs.ts`) is unaffected — no catalog references a tipo string.

### [Risk] The 6-category derivation drifts from the matriz over time

**Mitigation:** `categoriaOf(tipo)` is a pure function with exhaustive switch over the closed `MovimientoTipo` union. TypeScript's strict exhaustiveness checking (`never` discriminator on the default branch) catches missing tipos at compile time. Unit-tested in `src/lib/movimientos/categoria.spec.ts` (new file).

### [Risk] Two-record modelling for cross-sociedad confuses operators ("why is the Préstamo intercompany showing up twice in the global ledger?")

**Mitigation:** add an explicit Requirement that the ledger list MUST show an "Evento" column with the shared `evento_id` rendered as a chip. Hovering/clicking the chip opens a side-by-side detail of both halves. (Side-by-side detail is in scope for this change at the read-only level — the dialog is reused from the existing Detail modal.)

### [Trade-off] Per-moneda KPI cards add vertical real estate

**Accepted:** the strip is a known feature surface; operators expect KPIs at the top. The 4 cards with 4-6 rows is taller than the current 5 cards × 1 row, but the strip is still under 200px and stays within the L2 contract.

### [Trade-off] Patrimonio operativo as a single aggregated technical account loses fidelity

**Accepted:** V1 explicitly defers the formal patrimonial split (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados) to V2 with the Motor Contable. The single aggregated cuenta is sufficient to balance the ecuación maestra in V1, and any aportes / retiros propios are recorded with the right tipo (`APORTE_CAPITAL`) so the historical record can be re-bucketed later.

## Open Questions

- ~~**`WITHDRAWAL` → `RETIRO` rename**~~: **Resolved 2026-05-20.** Keep `WITHDRAWAL` verbatim — the user explicitly chose to preserve the existing identifier. The feature's prose uses "Retiro" but the tipo string stays English, in line with the rest of the OPS-native vostro flow (DEPOSIT, FEE, REBATE, SWAP_*, SPREAD). User-facing labels in dialogs and badges may localize independently.
- **`AS00000` synthetic client placeholder**: still used for nostros + manuales no operativos (per the existing manifest). The feature says "para tipos sin cliente, la contrapartida es una cuenta contable formal (Ingresos, Egresos, Patrimonio operativo, Intercompany, Puente FX), no un cliente sintético". The `AS00000` placeholder is an implementation device of the imputación menu; the matriz says it should not exist. Decision: **deprecate `AS00000` in this change** for tipos in categoría C/D/E. The `Asignar Cliente` action is hidden via `show_when` for those categorías. The action survives only for categoría A/B/F.
- **Migration strategy for movimientos already loaded with legacy tipos**: not applicable in the prototype (no real persistence). For the real backend, the consumer team produces a migration script — out of scope here.

## Migration Plan

This change is prototype-only. There is no production data or rollback concern.

Local development:

1. Apply tasks in order via `/opsx:apply align-fin-disponibilidades-to-omnibus-model`.
2. Each task is individually verifiable (file changed + assertion in the relevant test or via `openspec validate`).
3. After tasks finish, run the 5 quality gates (`npm run lint && type-check && test:run && spec:check && build:qa`).
4. Hand off to the user for commit + PR.
