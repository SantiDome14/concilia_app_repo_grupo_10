# Design — extend-fin-disponibilidades-bancos-cuentas-crud

## Context

Three concrete operator-facing gaps remain in REQ-50 v1 after the previous commits:

1. **The Cargar movimiento manual dialog's selects are empty** (screenshot 2026-05-18). The manifest declares `catalog: 'fin.bancos_cuentas'` on the `cuenta_id` field, but `plugins/catalogs.ts` only registers `framework.sociedades`, `fin.estructuras`, `ops.catalogo_cuentas`, `clp.clientes`, `fin.proveedores`, `fin.partners`, `framework.bancos_exchanges`. The mismatch silently returns `[]` (per the catalog resolver contract — see `lib/manifest/catalog.ts`).

2. **The Main CTA "Crear nueva Cuenta" dialog fields are misshapen.** `banco` is `type: 'text'` (free-form) instead of a lookup against an Estructuras catalogue. And the `useManifestModule.registerCreator` factory is not bound on the page, so on confirm the engine throws `ManifestError "no creator registered"`.

3. **There is no Estructuras CRUD.** A new Cuenta requires an existing Estructura (Banco / Exchange / etc.). The current mock derives Estructuras from `CUENTAS` (OPS catalogue) — there is no way for an operator to register `BBVA` or `Lemon Cash` as a new Estructura before adding a Cuenta to it.

This change is the polish layer on top of REQ-50 v1: the contracts are right, the engine is right, and the operator flow needs the catalogue registrations and reactive persistence to actually work.

The change also promotes the `ModuleCTA.variant` field (`'primary' | 'secondary'`) to the `core-actions-manifest` contract — small, motivated by the user feedback "agregá un Secondary CTA". This gives the manifest engine a vocabulary for visual hierarchy among module-level CTAs.

## Goals / Non-Goals

**Goals:**

- Make the Cargar movimiento manual dialog work end-to-end (Sociedad → Cuenta → Cliente → Cuenta Operativa all resolve to non-empty dropdowns).
- Make Crear nueva Cuenta work end-to-end (Estructura lookup populates, on confirm the cuenta appears in the table on the next render).
- Introduce a Secondary CTA "Crear nuevo Banco/Estructura" on Bancos / Cuentas with its own dialog + creator + visible-on-next-render persistence.
- Promote `ModuleCTA.variant` to a contractualised field of `core-actions-manifest` (primary by default, secondary opt-in).
- Keep `<TablePagination>` and `useTable<T>` integrations of the previous change untouched.

**Non-Goals:**

- Edit / delete CRUD for Cuentas or Estructuras (this change adds Create only).
- Persisting new records beyond the in-memory Pinia store. The store layer is the abstraction; switching to a real backend is a future REQ.
- Touching the manifest engine's pure-logic core (resolvers, predicate evaluator, validator). Only the catalog plugin + the dialog UI layer evolve.
- Wiring the Cargar movimiento manual's `on_confirm` to a movements store. The dialog fix here only resolves the cascade dropdowns; the new-movement persistence is a named follow-up.

## Decisions

### Decision 1 — `ModuleCTA.variant: 'primary' | 'secondary'` is a first-class field of the manifest contract

**Question:** the user asked for a "Secondary CTA". Three implementation options:
(a) just declare two `module_ctas[]` and render them both as `variant="primary"` (visual indistinguishable);
(b) hardcode "first CTA is primary, rest are secondary" in `<ManifestModuleCTAs>`;
(c) add `variant?: 'primary' | 'secondary'` to the `ModuleCTA` type, let the manifest author declare it explicitly.

**Decision:** (c) — explicit `variant` field, default `'primary'`.

**Why:**

- The visual hierarchy of multiple CTAs is intentional, not positional. A page may want two primaries (when both creation flows are equally relevant) or only one secondary (when one is clearly subordinate).
- The manifest engine already authoritatively models "what the page does"; the variant is a natural extension.
- The cap-of-3 rule (`maxVisible`) still applies independently — variant doesn't change ordering, only styling.

**Alternatives considered:**

- (a) rejected — visual indistinction makes operator hierarchy unclear.
- (b) rejected — implicit positional rules are surprising; the manifest author can't override.

**Failure modes the rule prevents:**

- Two equally-loud CTAs competing for the operator's attention when one is meant to be a fallback.
- Hidden positional convention that breaks when manifests are reordered alphabetically.

### Decision 2 — Pinia store for catalogue reactivity (not direct array mutation)

**Question:** the Bancos / Cuentas table currently reads from the exported `CATALOGO_CUENTAS` const. When a creator adds a new cuenta, options are: (a) mutate the exported array in place (Vue's reactivity won't track it because the array isn't a reactive ref); (b) wrap the array in a Pinia store with reactive refs; (c) wrap with `reactive()` at the page level.

**Decision:** (b) — a thin Pinia store `disponibilidadesCatalog` that owns `cuentas: Ref<CuentaBanco[]>` and `estructuras: Ref<EstructuraBanco[]>`.

**Why:**

- Pinia is the canonical state-owner per `CLAUDE.md` ("Pinia. One store per domain"). The catalogue is a domain.
- The store is reused by the catalog resolvers in `plugins/catalogs.ts` (read) AND by the page (read for the table). Single source of truth.
- Page-level `reactive()` would force the catalog plugin to import a page-local ref — awkward and breaks the boundary.
- Direct mutation of the exported array breaks Vue reactivity outside of the page that owns the mutation.

**Alternatives considered:**

- Event bus → rejected. Pinia is already the canon.
- Mutate `CATALOGO_CUENTAS` directly (it's a `let`/`const` array — mutation works but Vue can't track) → rejected.

**Failure modes the rule prevents:**

- Stale table after creating a new record (reactivity break).
- Inconsistent state between the catalog dropdown (reads from store) and the table (reads from somewhere else).

### Decision 3 — Catalog filter `from_form: 'sociedad_id'` for the Crear nueva Cuenta dialog

**Question:** the dialog fields are `sociedad_id` (lookup against `framework.sociedades`), `banco` (currently text — change to lookup), `tipo_cuenta`, `moneda`, etc. Should the `banco` lookup be filtered by Sociedad (only show Estructuras that already have at least one Cuenta in that Sociedad), or unfiltered (show every registered Estructura)?

**Decision:** **unfiltered**. The Estructuras catalogue is a global registry; a Cuenta can be opened in any Sociedad / Estructura combination.

**Why:**

- The whole point of the Secondary CTA "Crear nuevo Banco/Estructura" is to register Estructuras independently of Cuentas. Filtering Estructuras by existing Cuentas would create a chicken-and-egg problem (you can't create the first Cuenta in a brand-new Estructura).
- The operator typically picks the Sociedad first based on legal entity, then the Banco based on banking relationship. Both are independent registries.

**Alternatives considered:**

- Filtered by Sociedad → rejected (chicken-and-egg).
- Compound `sociedad_id:tipo_estructura` filter → over-engineered for v1.

### Decision 4 — Creator branches by `cta.id` inside a single registered factory

**Question:** the Bancos / Cuentas manifest has two `module_ctas[]`. Should the page register two separate creators (one per CTA), or a single creator that branches?

**Decision:** **a single registered factory** that switches on `cta.id`. The manifest engine's `_registerCreator(manifestKey, fn)` API accepts ONE factory per manifest key.

**Why:**

- Per the manifest engine API (`useManifestModule(key).registerCreator(fn)`), the registration is per-manifest, not per-CTA.
- The factory receives the `cta` object as input, so it can dispatch on `cta.id` cheaply.

**Alternatives considered:**

- Change the engine API to per-CTA → out of scope, would touch the core.

**Failure modes the rule prevents:**

- Inconsistent factories drifting on shared assumptions (e.g. id sequence generators).

## Risks / Trade-offs

- **[Risk]** The Pinia store seeds from the mock at init. If two tabs of the app load the page simultaneously, each has its own in-memory store — newly-created records don't sync. **Mitigation:** acceptable in dev; the real backend replaces the seed.
- **[Risk]** `ManifestModuleCTAs` rendering both primary and secondary CTAs may produce a wide header on narrow viewports. **Mitigation:** the existing cap-of-3 + overflow popover handles this; secondary CTAs still get the overflow treatment if needed.
- **[Risk]** Auto-generated ids (`cu-${sociedad}-${banco}-${seq}`) could collide if the operator types an existing combination. **Mitigation:** the sequence number ensures uniqueness; collisions on `id` are caught by the store's `addCuenta` (toast on conflict). For v1 the seed mock doesn't include the format, so collisions are unlikely.
- **[Risk]** `variant: 'secondary'` is a contractual extension; existing manifests in OPS / LEX / TRD / CLP that copy the type won't break (the field is optional), but the spec replication into other prototypes is a follow-up. **Mitigation:** named follow-up `align-ops-actions-manifest-variant`.

## Migration Plan

1. **Pre-flight:** confirm the previous Fase A commits are in the working tree (or merged). 5 fin gates + template spec:check green.
2. **Template canon:**
   - Update `types/manifest.ts` with `variant?` field.
   - Update `ManifestModuleCTAs.vue` to consume `variant`.
   - Update `core-actions-manifest/spec.md` (MODIFIED Requirement + Scenarios).
   - Update CLAUDE.md + AGENTS.md (byte-identical).
   - Run `openspec validate --all --strict` in template.
3. **Fin replica:**
   - Replicate the 4 template changes byte-identical.
   - Run `openspec validate --all --strict` in fin.
4. **Fin domain:**
   - Create `EstructuraBanco` type + `estructuras_bancos.ts` mock + `disponibilidadesCatalog` Pinia store.
   - Update `plugins/catalogs.ts` to register `fin.bancos_cuentas`, `fin.estructuras_bancos`, `fin.cuentas_operativas_cliente` — all reading from the store / mock.
   - Update `fin.disponibilidades.bancos_cuentas.actions.ts`: `banco` field → lookup, `variant: 'primary'` on Crear Cuenta CTA, new `Crear nuevo Banco/Estructura` CTA with `variant: 'secondary'`.
   - Update `Disponibilidades.vue`: swap `CATALOGO_CUENTAS` import for store ref; register creator that dispatches by `cta.id`.
5. **Spec deltas (fin):**
   - Apply the `fin-disponibilidades` MODIFIED + ADDED Requirements into `prototypes/fin/openspec/specs/fin-disponibilidades/spec.md`.
6. **Gates:** 5 in fin + spec:check in template.

**Rollback:** revert the commit. The Pinia store, the EstructuraBanco type, the new mock, the catalog registrations, the new CTA and the spec deltas all disappear cleanly. The variant field is optional → existing manifests in OPS etc. that don't yet declare it continue to default to `'primary'`.

## Open Questions

These default if no reviewer override:

- **Q1**: should `<Button variant="secondary">` use the existing shadcn `secondary` variant tokens or get a new "secondary CTA" appearance? Defaulting to **the existing `secondary` variant** — keeps the design system simple.
- **Q2**: should the auto-generated cuenta ids include the Estructura id or the human banco name? Defaulting to **`cu-${sociedad}-${slugify(banco)}-${seq}`** for consistency with the existing mock pattern (`cu-cp-bind-1`, etc.).
- **Q3**: should the Crear Estructura dialog allow optional `sociedades_habilitadas: string[]` (which sociedades can open cuentas in this estructura)? Defaulting to **no** for v1 — every Estructura is available to every Sociedad. Future REQ can refine.
- **Q4**: should the new records persist to localStorage so a page refresh keeps them? Defaulting to **no** — Pinia in memory is enough for v1 dev iteration.
