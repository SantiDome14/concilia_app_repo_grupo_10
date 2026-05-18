# Design — add-fin-disponibilidades

## Context

REQ-50 ("FIN — Tesorería — Disponibilidades") is the first operative feature of the Tesorería block in FIN. It replaces the legacy Excel treasury workflow with a Vue 3 + manifest-engine implementation governed by `core-actions-manifest`, `core-module-types` (Type B sub-tabs), `core-data-tables`, `core-modals`, and the new `core-layout` Requirements from `align-fin-prototype-to-playbook`.

Three external dependencies frame this change:

- **REQ-42** (status SENT TO DEV) — provides the canonical model for Bancos/Cuentas catalogue + bidirectional imputation (Lado Ardua + Lado Cliente, Cuentas Operativas del Cliente, sociedades del grupo, transaction operational states). Disponibilidades consumes that model. Differences vs OPS.Movimientos: OPS imputes **vostro** movements (origin: clients); Disponibilidades.Movimientos imputes **nostro** and **manual non-operational** movements. Both surfaces are lenses on the same ledger.
- **REQ-68** (manifest engine) — already realised in this repo as `core-actions-manifest`. The contextual Main CTAs, per-row actions, and dialog rendering all flow through it. No additions to the engine are needed.
- **REQ-69** (vistas Lista / Tarjetas / Tablero + ejes) — already realised in this repo as `core-module-types` + `<ViewToggle>` + `<KanbanBoard>`. Disponibilidades.Movimientos declares 3 views + 6 axes; the engine handles the rest.

The current fin scaffold reflects a **pre-REQ-50** model (audit summary from `align-fin-prototype-to-playbook`):

- `Tesoreria.vue` page with sub-tabs `Posición / Movimientos / Cola de asignación`.
- A `Movimientos.vue` top-level page in the Back Office block.
- `fin.movimientos.actions.ts` manifest with 10 actions (imputation + conciliation + intercompany + V2 placeholder).
- `fin.tesoreria.cola_asignacion.actions.ts` for the Cola sub-module.

REQ-50 supersedes that model. The user has answered four scoping questions explicitly:

1. The top-level Movimientos page disappears (REQ-50 §1 places Movimientos as a sub-tab; §A.2 declares the ledger as a shared record between apps with FIN as a lens).
2. The conciliación and intercompany actions of the current `fin.movimientos.actions.ts` are dropped (out of REQ-50's scope; future REQs may bring them back as separate manifests).
3. The Bancos/Cuentas catalogue is consumed in FIN through an independent manifest `fin.bancos_cuentas.actions.ts`, NOT shared with a future `ops.bancos_cuentas.actions.ts`. No vendoring; the duplication is acknowledged technical debt to revisit when a shared package exists.
4. `Tesoreria.vue` is renamed to `Disponibilidades.vue`. Tesorería is the **block** of the Sidebar; Disponibilidades is the **page**. Keeping the old filename grows debt as the block adds siblings (Cobros, Pagos, Caja Chica, Inversiones, Monedas).

This change starts AFTER `align-fin-prototype-to-playbook` merges (the prerequisite). All 5 quality gates pass on the prototype today; this change must keep them green.

## Goals / Non-Goals

**Goals:**

- Implement REQ-50 v1 end-to-end: Type B page with 3 sub-tabs (Posición / Bancos-Cuentas / Movimientos), contextual Main CTAs, drill-down from Posición to Movimientos, full Movimientos sub-tab with 3 views + 6 axes + 6 actions per REQ-50 §5.7, supervised manual load flow.
- Promote the Disponibilidades contract to `openspec/specs/fin-disponibilidades/spec.md` so the implementation is testable against ~34 Requirements that mirror REQ-50's acceptance criteria 1:1.
- Eliminate the pre-REQ-50 surface area: top-level Movimientos page, Cola sub-tab, dropped manifest actions.
- Declare the 8 fine-grained capabilities and seed them in dev.
- Keep the 5 quality gates green and `openspec validate --all --strict` green.

**Non-Goals:**

- Backend wiring. Mocks are used; the real `core-tes-backend` integration happens in a downstream change.
- Inbox-based supervision. v1 implements local supervision on the movement record. REQ-71 / `extend-fin-disponibilidades-inbox-supervision` is the follow-up.
- Conciliación contable automática or asientos contables generation. Both depend on FIN.Contabilidad and the plan de cuentas, neither of which exists yet.
- Sharing the Bancos/Cuentas manifest / dialog with OPS. Per user decision 3, both apps will ship their own manifests until a future cross-app refactor proves duplication is the wrong call.
- Adding Caja Chica, Inversiones, Monedas, Plan de Cuentas, etc. They stay as `<ModuloSoon>` placeholders.
- Promoting REQ-50's "Main CTA contextual" or "Registros compartidos entre apps" patterns to the cross-prototype `MIGRATION-PLAYBOOK.md`. They are documented as Decisions in this change (per REQ-50 §A.1, §A.2); promotion to the playbook is a follow-up `update-migration-playbook-with-fin-disponibilidades-decisions` (not nominated here).

## Decisions

### Decision 1 — Type B sub-tabs with contextual Main CTAs (REQ-50 §A.1 divergence from framework)

**Question:** the financial-core framework (`framework/financial-core-modules.md` §5.2) establishes that the Main CTA of the page header is persistent over the module as a whole. REQ-50 places Disponibilidades as Type B with three sub-tabs over heterogeneous datasets (Posición tree / Bancos-Cuentas table / Movimientos ledger). Should the Main CTA be:

- (a) persistent ("Cargar movimiento manual" always visible)
- (b) a split button that switches behaviour per sub-tab
- (c) contextual per active sub-tab (REQ-50 §A.1)

**Decision:** (c) contextual per active sub-tab.

| Sub-tab active | Main CTA | Capability |
| --- | --- | --- |
| Posición | "Cargar movimiento manual" | `cargar_directo` OR `cargar_con_supervision` |
| Bancos / Cuentas | "Crear nueva Cuenta" | `bancos_cuentas.crear` |
| Movimientos | "Cargar movimiento manual" | Same as Posición |

The CTA is rendered via `<ManifestModuleCTAs>` with `module_ctas[]` declared on each sub-tab's manifest using `show_when` against the active sub-tab. The manifest engine handles the rest.

**Why:**

- The three sub-tabs are datasets with different creation semantics. A user looking at Bancos/Cuentas cannot meaningfully create a movement; a user looking at Posición does not create a cuenta. A persistent CTA forces context-mismatch UX and a split button shifts the cognitive load to the operator.
- The framework's persistent-CTA rule was scoped for Type A modules with a single dataset. Type B with heterogeneous sub-datasets is a different shape and warrants its own rule.

**Alternatives considered:**

- (a) Persistent "Cargar movimiento manual" — rejected. Creating a movement from Bancos/Cuentas is incoherent.
- (b) Split-button with sub-tab-aware dropdown — rejected. Worse UX than dedicated contextual CTAs; operator must learn the split-button convention.

**Failure modes the rule prevents:**

- Operator clicks "Cargar movimiento manual" while on Bancos/Cuentas, expecting it to mean something local to the catalogue, and gets a generic movement dialog out of context.
- "Crear nueva Cuenta" hidden behind a kebab menu when it should be the obvious primary action on the catalogue view.

**Promotion to framework:** REQ-50 §A.1 nominates this as a framework evolution to register: a Type B MAY have contextual Main CTAs when sub-tabs are heterogeneous datasets with distinct primary actions. Not promoted in this change (out of scope); flagged as follow-up `update-financial-core-modules-framework-main-cta-contextual` to be raised against the framework repo when scoped.

### Decision 2 — Registros compartidos entre apps (REQ-50 §A.2): same ledger, different lenses, independent manifests in v1

**Question:** REQ-42 declares `Movimiento` as the canonical record consumed by both OPS and FIN. OPS.Movimientos imputes vostro movements (client-originated); Disponibilidades.Movimientos imputes nostro + manual non-operational movements. The Bancos/Cuentas catalogue lives in OPS (REQ-42 §8) and is consumed with a FIN-specific lens. How does FIN consume these shared records?

**Decision:**

- (a) **Manifests are independent per app.** `fin.bancos_cuentas.actions.ts` and `ops.bancos_cuentas.actions.ts` are separate files with separate manifest keys. `fin.disponibilidades.movimientos.actions.ts` is separate from any current/future OPS movements manifest.
- (b) **Mocks are duplicated per app** for now. fin's `src/mocks/fin/bancos_cuentas.ts` is a separate mock from OPS's (when it exists).
- (c) **The shared model is documented**, not enforced. The `Movimiento` type in `src/types/fin.ts` mirrors the contract defined in REQ-42; the manifest engine's predicate evaluation operates on the same field names.
- (d) **No vendor package today.** Sharing the Bancos/Cuentas dialog, manifest, or component across `prototypes/fin/` and `prototypes/ops/` would require a cross-prototype package not in the current architecture. Out of scope.

**Why:**

- Per user decision 3 (Fase 2 dialog), the user explicitly chose independent manifests over a shared abstraction. Building a shared package speculatively before the second consumer (OPS Bancos/Cuentas migration) is scoped would be sub-optimal abstraction.
- The duplication risk (drift between fin and ops manifests) is acceptable today because OPS is the source of truth for the catalogue's CRUD; FIN's manifest only adds the "Configurar cuenta contable" lens.

**Alternatives considered:**

- Cross-prototype shared package (`@ardua/manifests`) consumed by both fin and ops — rejected for v1. Premature abstraction; user explicitly chose against it.
- Vendor OPS manifest into fin via a script — rejected. Maintenance pain; the manifests would drift the moment one side updates.
- Define `Movimiento` and `BancoCuenta` types in a shared `@ardua/types` package — rejected for v1. Same premature-abstraction reason. The types live as canonical replicas in each prototype's `src/types/`.

**Failure modes the rule prevents:**

- Fin's manifest auto-rotting when OPS canonically changes a predicate or field name. Each app owns its own contract; cross-app drift is caught at QA when the operator notices a behaviour mismatch.
- Forcing a v1 architectural decision (shared package layout, CI orchestration, versioning) before a second concrete consumer demands it.

**Trade-off:** the moment FIN and OPS both ship Bancos/Cuentas CRUD with substantially shared dialog behaviour, a refactor to share the manifest will be the right call. Until then, duplication is the lower-risk path.

**Promotion to framework:** REQ-50 §A.2 nominates this as a framework evolution. In a backoffice it is normal for a record to be surfaced across multiple apps with distinct lenses (filters, columns, actions). Documented for the framework follow-up.

### Decision 3 — Eliminate the top-level Movimientos module of FIN

**Question:** the current fin scaffold ships `src/pages/Movimientos.vue` as a Back Office top-level module with its own route and manifest (10 actions). REQ-50 places Movimientos as a sub-tab of Disponibilidades. Should both surfaces coexist?

**Decision:** delete the top-level Movimientos surface in FIN. The Movimientos sub-tab inside Disponibilidades is the only place where the ledger lens lives in FIN.

Concretely:
- Delete `src/pages/Movimientos.vue` + `Movimientos.spec.ts`.
- Delete `src/manifests/fin.movimientos.actions.ts` (the 4 in-scope actions migrate into `fin.disponibilidades.movimientos.actions.ts`; the 6 out-of-scope actions are dropped per Decision 4).
- Remove `ROUTE_PATHS.MOVIMIENTOS`, `ROUTE_NAMES.MOVIMIENTOS`, the route definition in `src/router/routes.ts`, and the Sidebar entry in `src/components/layout/Sidebar.vue`.
- Remove the manifest registration in `src/plugins/manifests.ts`.

**Why:**

- Per user decision 1 (Fase 2 dialog), the user was unambiguous: "Movimientos desaparece, no debería estar".
- REQ-50 §A.2 and REQ-42 establish a single shared `Movimiento` ledger; OPS owns the vostro lens and FIN owns the nostro + non-operational lens inside Disponibilidades. Two FIN surfaces on the same ledger would either (a) duplicate behaviour with subtly different rules, breeding drift, or (b) reduce to a redirect — pointless.
- The audit confirmed `pages/Movimientos.vue` is ~32.53 KB of code that becomes redundant once the sub-tab is implemented inside Disponibilidades. Deleting it removes a maintenance vector.

**Alternatives considered:**

- Keep top-level Movimientos as a "global ledger" view orthogonal to Disponibilidades — rejected by user. Rationale: in FIN, the ledger is meaningful only in the context of Disponibilidades's lens (Posición + Bancos/Cuentas surround it).
- Make the top-level Movimientos a redirect to `/disponibilidades?tab=movimientos` — rejected. Redirects without a behaviour change are anti-patterns; cleaner to delete the surface.

**Failure modes the rule prevents:**

- Two FIN surfaces showing slightly different filtered ledgers because their predicates drifted.
- Operator clicks Movimientos in the sidebar and lands in a context where Posición and Bancos/Cuentas are not adjacent — making drill-down from Posición to Movimientos awkward to discover.

### Decision 4 — Drop the conciliación + intercompany + V2-disabled actions of the legacy fin.movimientos manifest

**Question:** the current `fin.movimientos.actions.ts` declares 10 actions:

1. Asignar Banco y Cuenta (imputación) — **in REQ-50 §5.7**.
2. *(missing in legacy)* Asignar Cliente — **in REQ-50 §5.7**.
3. Asignar Cliente (imputación) — **in REQ-50 §5.7**.
4. Asignar Proveedor — **NOT in REQ-50** (FEE flow).
5. Asignar Partner — **NOT in REQ-50** (REBATE flow).
6. Asignar Banco / Exchange — **NOT in REQ-50** (TAX flow).
7. Imputar a Cuenta Contable (V2-disabled) — **NOT in REQ-50** (deferred to FIN.Contabilidad).
8. Marcar como Intercompany — **NOT in REQ-50**.
9. Marcar con Diferencias — **NOT in REQ-50** (conciliación).
10. Marcar Conciliado — **NOT in REQ-50** (conciliación).

Which actions migrate into the new `fin.disponibilidades.movimientos.actions.ts`?

**Decision:** only the REQ-50 §5.7 actions migrate. Concretely:

- **Asignar Banco y Cuenta** (with predicate `lado_ardua_asignado === false AND (movimiento es nostro OR manual no operativo)`).
- **Editar Banco y Cuenta** (with predicate `lado_ardua_asignado === true AND idem`).
- **Asignar Cliente** (with predicate `lado_cliente_asignado === false AND idem`).
- **Editar Cliente** (with predicate `lado_cliente_asignado === true AND idem`).
- **Confirmar carga manual** (with predicate `requires_supervision === true AND supervised_by === null AND created_by !== current_user`).
- **Rechazar carga manual** (idem condition; closure modal with justification ≥ 10 chars).

Actions 4–10 of the legacy manifest are **deleted** in this change. No follow-up is named here because their re-introduction belongs to separate Jira REQs (FEE flow, TAX flow, REBATE flow, FIN.Contabilidad asientos, conciliación).

**Why:**

- Per user decision 2 (Fase 2 dialog): "Desaparecen, todo debe adaptarse a lo definido actualmente en el REQ-50". Unambiguous.
- The dropped actions belong to flows that are explicitly out of REQ-50's scope (REQ-50 §"Fuera de alcance"). Carrying them forward without a REQ to back them creates orphaned UI.
- Conciliación (actions 9, 10) is explicitly excluded in REQ-50 §"Fuera de alcance" — it stays in OPS (operative) and depends on FIN.Contabilidad (contable). Two surfaces of FIN doing conciliación on the same ledger would re-introduce the very confusion REQ-50 is trying to resolve.

**Alternatives considered:**

- Migrate all 10 actions and hide the 6 dropped ones behind a feature flag — rejected. Feature flags for dropped behaviour are technical debt; if the feature is dropped, it is removed.
- Migrate the 6 dropped actions into a separate "advanced" manifest activated by a role — rejected. Out of REQ-50 scope; would require a Decision N referring to a non-existent REQ.

**Failure modes the rule prevents:**

- Operator sees actions in the kebab menu that have no documented purpose; raises support tickets; team loses time triaging.
- Predicates drift from the REQ-50 spec because the additional actions had different shape.

### Decision 5 — `Tesoreria.vue` → `Disponibilidades.vue` (rename, not in-place edit)

**Question:** the current page `Tesoreria.vue` already renders an `<h1>` reading "Disponibilidades" and the route's `meta.breadcrumb` is "Disponibilidades". Should the file name follow, or stay for backwards-compat?

**Decision:** rename file → `Disponibilidades.vue` + tests → `Disponibilidades.spec.ts` + path constant → `ROUTE_PATHS.DISPONIBILIDADES` + name → `ROUTE_NAMES.DISPONIBILIDADES` + route URL `/tesoreria` → `/disponibilidades`. Update all imports, Sidebar entry, tests.

**Why:**

- Per user decision 4 (Fase 2 dialog): "Tesorería" is the Sidebar **block** containing Disponibilidades, Cobros, Pagos, Deudas/Préstamos, Inversiones, Monedas. "Disponibilidades" is the page. Conflating the two in `Tesoreria.vue` is debt that grows as the block adds siblings.
- The current file name is misleading: every other page in fin reads as its module noun (`Dashboard.vue`, `Inbox.vue`, `Cotizaciones.vue`, `Reportes.vue`). `Tesoreria.vue` is the only block-named page.
- Renaming is cheap today (1 page + 1 test + 1 route + 1 constant + 1 sidebar entry). It grows expensive once siblings ship.

**Alternatives considered:**

- Keep `Tesoreria.vue` and add `Cobros.vue`, `Pagos.vue` as sibling files in the same block — rejected. Operator clicking Sidebar → "Tesorería" → "Disponibilidades" expects URL `/disponibilidades`, not `/tesoreria`.
- Rename without changing the URL (keep `/tesoreria`) — rejected. URL still misleading; deep links would point at the wrong noun.
- Add a redirect from `/tesoreria` to `/disponibilidades` for backwards-compat — rejected for v1 because no production users have bookmarks; this is still a prototype.

**Failure modes the rule prevents:**

- File-vs-block naming confusion compounding as the block adds 5 more pages.
- Deep links and breadcrumbs reading "Disponibilidades" but routing to `/tesoreria`.

### Decision 6 — Supervision local on the movement record (forward-compatible with Inbox per REQ-71)

**Question:** REQ-50 §6 requires manual loads to support supervisor confirmation (creator ≠ supervisor). REQ-71 (Inbox infrastructure) is the canonical home for human-intervention tasks but is **not** a dependency of REQ-50 (per REQ-50 §6.7). Where does the supervision state live?

**Decision:** locally on the `Movimiento` record. Three new fields:

| Field | Default | Set when |
| --- | --- | --- |
| `requires_supervision` | `true` if creator has `cargar_con_supervision`; `false` if `cargar_directo` | At creation |
| `supervised_by` | `null` | On "Confirmar carga manual" |
| `supervised_at` | `null` | On "Confirmar carga manual" |

Plus `estado_de_supervision` enum: `'no_aplica' | 'pendiente_de_supervision' | 'confirmado' | 'rechazado'`.

The supervision actions live in `fin.disponibilidades.movimientos.actions.ts` with predicates per REQ-50 §5.7.

Balance impact rule: a movement impacts Posición saldos if and only if `requires_supervision === false OR supervised_at !== null` (REQ-50 §6.2).

**Forward-compatibility with REQ-71:** when Inbox lands for FIN, the supervision mechanism MAY migrate to a Solicitud of type `CARGA_MANUAL_PENDIENTE_SUPERVISION` that lands in the supervisor's Inbox. The shape on the `Movimiento` record stays valid; the Solicitud is an additional view layer. This migration is a separate REQ.

**Why:**

- Per REQ-50 §6.7, the local model is explicitly forward-compatible. Implementing supervision via Inbox first would couple Disponibilidades v1 to REQ-71's roadmap timeline — unacceptable given REQ-50's priority.
- Local supervision flags are simpler to test, simpler to mock, simpler to audit. The balance-impact rule is a pure predicate.
- The Solicitud-in-Inbox model is heavier (workflow chrome, comments, timeline, audit log). Premature for v1.

**Alternatives considered:**

- Implement via Inbox now — rejected per REQ-50 §6.7.
- Implement via a parallel `solicitudes/` table maintained by FIN — rejected. Duplicates REQ-71's surface area without its benefits.

**Failure modes the rule prevents:**

- Disponibilidades v1 blocked by REQ-71's implementation timeline.
- Coupling that makes the migration to Inbox harder when REQ-71 lands.

## Refinements from MIGRATION-PLAYBOOK canon

REQ-50 v1 picks 3 refinements from the playbook (refinement letters per `MIGRATION-PLAYBOOK.md` "Quality-of-life refinements canon"):

| # | Refinement | Where in Disponibilidades |
| --- | --- | --- |
| B | localStorage persistence | Last-active sub-tab (Posición / Bancos-Cuentas / Movimientos), last-active Kanban axis on Movimientos, last-applied filter set per sub-tab. |
| E | URL sync of state + deep-links | Active sub-tab, Kanban axis, filter values, `cuenta_id` from drill-down — all reflected in `route.query`. Bookmarks share specific views; back-button restores. |
| G | Inline field-level validation mapping | Carga manual dialog: backend `errors[]` map to inline messages on the corresponding form inputs (NOT a toast list). |

Refinements explicitly **out** of scope for v1:

- A (smart single-X default) — no place in this surface where exactly-one-of-N selection happens.
- C (pre-submit preview card) — the carga manual dialog has enough fields that a separate preview pane would clutter v1.
- D (cancel during submit) — backend latency is mocked; revisit when the real `core-tes-backend` is wired.
- F (re-open success toast) — no opened tab to re-open in this flow.
- H (stackable alert area) — no multi-sponsor reconciliation banner needed (FIN does not yet reconcile against per-sponsor extracts).

## Risks / Trade-offs

- **[Risk]** Renaming `Tesoreria.vue` → `Disponibilidades.vue` breaks any feature flag, env config, or external link that referenced the path. **Mitigation:** the audit confirmed no env config or external doc references the path. The change is self-contained.
- **[Risk]** Dropping the conciliación + intercompany + V2-disabled actions of `fin.movimientos.actions.ts` removes UI that some legacy operator may have learned. **Mitigation:** the prototype has no production users; the dropped actions are dropped per user decision 2 and REQ-50's explicit OUT scope.
- **[Risk]** Duplicating the Bancos/Cuentas manifest between fin and ops (when OPS eventually ships its version) creates drift. **Mitigation:** Decision 2 documents this trade-off; the drift becomes visible in code review when the second consumer ships.
- **[Risk]** Local supervision (Decision 6) does not propagate to a supervisor's Inbox. The supervisor must remember to check Disponibilidades. **Mitigation:** Inbox-based supervision is the named follow-up `extend-fin-disponibilidades-inbox-supervision`. v1 documents this expectation.
- **[Risk]** Type-checking the 5 new fields on `Movimiento` may surface places that destructure the type without the new fields. **Mitigation:** `vue-tsc --build` strict mode will fail on each violation; fix as caught.
- **[Risk]** Mocks for `bancos_cuentas` + `movimientos` + `disponibilidades` get large and may overlap with OPS mocks. **Mitigation:** they are mocks; the goal is enough variety to demonstrate behaviour, not full coverage. Real data comes from `core-tes-backend`.

## Migration Plan

1. **Pre-flight:** confirm `align-fin-prototype-to-playbook` is committed and merged. Run `npm run spec:check` to confirm fin has 14 specs passing.
2. **Types first:** extend `Movimiento` and add new types (`CuentaBanco`, `Sociedad`, `PosicionNode`, etc.). Type-check failure shows the call sites that need updating.
3. **Mocks:** create `bancos_cuentas.ts`, create `movimientos.ts`, update `disponibilidades.ts`. Delete `retiros_cola.ts`.
4. **Capabilities:** add the 8 new strings to the dev seed in `plugins/auth0.ts`. Update `useCapabilities` if needed (likely not — the wildcard `'*'` already covers dev).
5. **Manifests:** rename `fin.tesoreria` → `fin.disponibilidades`; create `fin.disponibilidades.bancos_cuentas`; create `fin.disponibilidades.movimientos`; delete `fin.tesoreria.cola_asignacion`; delete `fin.movimientos`. Update `plugins/manifests.ts`.
6. **Routes / sidebar:** rename TESORERIA → DISPONIBILIDADES (path + name), delete MOVIMIENTOS (path + name + route + sidebar entry).
7. **Page rename:** `Tesoreria.vue` → `Disponibilidades.vue`, same for spec. `Movimientos.vue` + spec deleted.
8. **Page rewrite:** reorder sub-tabs (Posición / Bancos-Cuentas / Movimientos, default Posición), implement contextual Main CTAs, KPIs L2 per sub-tab, drill-down Posición→Movimientos with `cuenta_id`.
9. **Specs:** add `fin-disponibilidades/spec.md` with ~34 Requirements.
10. **Tests:** rewrite the Disponibilidades.spec.ts coverage for the 3 sub-tabs, contextual CTAs, drill-down, supervision flow.
11. **Refinements B/E/G:** localStorage persistence, URL sync, inline backend errors in carga manual.
12. **Gates:** lint / type-check / test:run / spec:check (15 items now) / build:qa.
13. **Hand off** to the user for commit.

**Rollback:** revert the commits. The new capability gets dropped from `openspec/specs/`; the legacy `Tesoreria.vue` + `Movimientos.vue` come back; the legacy mocks come back. Reversible.

## Open Questions

These default if no reviewer override:

- **Q1**: should `Posición` be navigable via direct URL `/disponibilidades?tab=posicion` or just `/disponibilidades` (Posición default at root)? Defaulting to **both**: `/disponibilidades` resolves to the same view as `?tab=posicion`. Bookmarkable both ways; canonical URL is the parameter-less one.
- **Q2**: the dialog of "Configurar cuenta contable" — REQ-50 §4.5 says "campo libre o selector de categorías predefinidas — a refinar con Belén Gallo". Defaulting to **campo libre** (text input with hint "Etiqueta o metadata contable"). The selector variant comes when Belén defines the categories.
- **Q3**: the Cuenta de Cliente de Ardua (REQ-50 §5.7 "imputación del Lado Cliente para nostros y no operativos") — `AS00000` is the example. Defaulting to a hardcoded `AS00000` mock client in `bancos_cuentas.ts` until the Clientes catalogue contractualises it.
- **Q4**: drag-drop on the Kanban axis "Estado de supervisión" — dropping into `confirmado` or `rechazado` triggers the corresponding action (`Confirmar carga manual` or `Rechazar carga manual`). The Closure modal handles the `rechazado` case (justification ≥ 10 chars). Confirmar is a 1-click action with toast confirmation. OK?
- **Q5**: the supervision predicate `created_by !== current_user` — REQ-50 §5.7 mandates creator ≠ supervisor. In dev mode with the wildcard `'*'` capability, a single user can both create and supervise. Defaulting to: predicate is **always evaluated** (not bypassed by `'*'`). Dev fixtures will include 2 mock users so the supervisor flow is testable.
