> Jira REQ: [REQ-50](https://arduasolutions.atlassian.net/browse/REQ-50) (REQ-50 v1 polish: catalogue CRUD + dialog fixes)
> Module: FIN + core-actions-manifest
> Scope: cross-prototype — `prototypes/_core-template-frontend/` + `prototypes/fin/` (core-actions-manifest spec touched in both)

# Extend fin-disponibilidades — Bancos/Cuentas CRUD + carga manual dialog fix

## Why

REQ-50 v1 shipped the Disponibilidades shell and the contractual Requirements, but three concrete operator-facing gaps remain:

1. **The Cargar movimiento manual dialog is broken.** The Sociedad and Cuenta selects render empty because the manifest declares `catalog: 'fin.bancos_cuentas'` but no resolver is registered for that id in `plugins/catalogs.ts`. The operator sees a dialog with empty dropdowns — the flow is unusable.

2. **The Main CTA "Crear nueva Cuenta" has no working form.** The dialog declares fields but: (a) the `banco` field is `type: 'text'` instead of a lookup against an Estructuras catalogue, and (b) no `creator` is registered on the manifest, so confirming the dialog throws `"no creator registered"`. The catalogue doesn't grow.

3. **No way to add the Estructura first.** A new Cuenta belongs to a Banco/Estructura (ADCAP, BIND, BITGO, etc.). Today these are baked into `bancos_cuentas.ts` derived from the OPS-side mock — there is no Secondary CTA to register a new Estructura before adding a Cuenta to it.

This change closes all three gaps and reinforces the contract so the manifest engine's CTA variant (primary vs secondary visual prominence) is part of the canon.

## What Changes

### `prototypes/_core-template-frontend/` (canon)

- **Extend `core-actions-manifest` spec** to declare `ModuleCTA.variant?: 'primary' | 'secondary'` (default `'primary'`). Add 2 Scenarios that mandate the `<Button variant>` mapping and the cap-of-3-still-applies rule.
- **Update `src/types/manifest.ts`**: add optional `variant` field to `ModuleCTA`.
- **Update `src/components/manifest/ManifestModuleCTAs.vue`**: respect `cta.variant` when rendering the `<Button>`.
- **Update `CLAUDE.md` + `AGENTS.md`** (byte-identical): mention the new `variant` field of `ModuleCTA` under the manifest section.

### `prototypes/fin/` (consumer + replica)

- **Replicate the `core-actions-manifest` spec change** in `prototypes/fin/openspec/specs/core-actions-manifest/spec.md`.
- **Replicate the `types/manifest.ts` change** byte-identical.
- **Replicate the `ManifestModuleCTAs.vue` change** byte-identical.
- **Replicate the CLAUDE.md + AGENTS.md** doc bullets byte-identical.

#### Domain mocks + store

- **Create `src/mocks/fin/estructuras_bancos.ts`**: `ESTRUCTURAS_BANCOS: EstructuraBanco[]` with the canonical entries (ADCAP, BIND, BITGO, BINANCE, BRIDGE, BRUBANK, BULL MARKET, CENTAURUS, COHEN, COINAG, COINBASE, COMERCIO, CONO SUR, CUCCHIARA, FV BANK, INVIU, IVSA, KRAKEN, LYNX, PERC, STRATO, MACRO, REBA, CONVERA, BMO, ALLARIA, BITSO) — each with `id`, `nombre`, `tipo_estructura`.
- **Create `src/types/fin.ts` type `EstructuraBanco`** (`id`, `nombre`, `tipo_estructura`).
- **Create `src/stores/disponibilidadesCatalog.ts`** (Pinia setup store): wraps `ESTRUCTURAS_BANCOS` and `CATALOGO_CUENTAS` as reactive `ref` arrays. Exposes `estructuras`, `cuentas`, `addEstructura(e)`, `addCuenta(c)`. Initialization copies the mock seeds at boot.

#### Catalogue registrations

- **Update `src/plugins/catalogs.ts`**:
  - Register `fin.estructuras_bancos` (lists every active Estructura from the store).
  - Register `fin.bancos_cuentas` (filters by `sociedad_id` when `from_form: 'sociedad_id'` is passed; also accepts compound `sociedad_id:moneda` if needed).
  - Register `fin.cuentas_operativas_cliente` (filters by `cliente_id` when passed).
  - Catalog resolvers read from the Pinia store so newly-created records appear in the dropdowns immediately.

#### Manifests

- **Update `src/manifests/fin.disponibilidades.actions.ts`**: the existing module CTA "Cargar movimiento manual" already uses `catalog: 'fin.bancos_cuentas'` — once the catalogue is registered (above), the dialog populates. No code change needed on this manifest beyond verifying the field shapes.
- **Update `src/manifests/fin.disponibilidades.bancos_cuentas.actions.ts`**:
  - Existing CTA "Crear nueva Cuenta" → set `variant: 'primary'` explicitly. Change `banco` field from `type: 'text'` to `type: 'lookup'` with `catalog: 'fin.estructuras_bancos'`. Add a creator binding (registered in the page).
  - NEW CTA "Crear nuevo Banco/Estructura" → `variant: 'secondary'`, dialog with `nombre` (text, required) + `tipo_estructura` (select with REQ-42 §8.1 values). `creates_record_type: 'estructura_banco'`.

#### Page wiring

- **Update `src/pages/Disponibilidades.vue`**:
  - Replace `import { CATALOGO_CUENTAS } from '@/mocks/fin/bancos_cuentas'` with the Pinia store ref so the table reactively reflects new cuentas.
  - Register two creators on the `bancos_cuentas` manifest module: one that branches by `cta.id` and dispatches to `addCuenta` or `addEstructura`. Each new record gets an auto-generated id (`cu-${sociedad}-${banco}-${seq}` / `est-${slugify(nombre)}-${seq}`).

#### Spec deltas (fin-disponibilidades)

- **Modify the existing fin-disponibilidades Requirements**:
  - "Bancos / Cuentas MUST expose Crear nueva Cuenta as the Main CTA" → tighten: dialog uses `<TablePagination>` semantics (no, that's a different cap), corrigo: `banco` field is a lookup against `fin.estructuras_bancos`; on confirm, the cuenta is appended to the reactive catalogue and visible in the table on the next render. `variant` is `primary`.
  - NEW Requirement: "Bancos / Cuentas MUST expose a Secondary CTA 'Crear nuevo Banco/Estructura'" — with 3 Scenarios (capability gate, dialog fields, persistence + visible in subsequent Crear nueva Cuenta dialog).
  - NEW Requirement: "Cargar movimiento manual dialog MUST resolve every cascading lookup against a registered catalogue" — with Scenarios that mandate `fin.bancos_cuentas` returns the cuentas of the chosen sociedad.

### Out of scope

- **Persistence beyond the in-memory Pinia store.** When a real backend lands, the creators will dispatch a `POST` and refresh the store from the response. Out of scope here.
- **Editing or deleting Estructuras / Cuentas.** Only creation in this change.
- **Cliente CRUD.** Clients are consumed (read-only) from `clp.clientes`.
- **OPS replica.** The same component changes (variant prop) will land in OPS via `align-ops-actions-manifest-variant` (named follow-up).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `core-actions-manifest`: ADDED Requirement for `ModuleCTA.variant: 'primary' | 'secondary'` + visual mapping to `<Button variant>` rendering.
- `fin-disponibilidades`: MODIFIED Requirement on "Crear nueva Cuenta" (Estructura lookup + persistence + variant) + ADDED Requirements for "Crear nuevo Banco/Estructura" Secondary CTA + the carga manual dialog cascade Requirement.

## Impact

- **Code (template):** ~5 lines added to `types/manifest.ts`, ~5 lines to `ManifestModuleCTAs.vue`, ~6 lines to CLAUDE/AGENTS docs.
- **Code (fin):** ~80 lines mock (estructuras) + ~50 lines store + ~50 lines catalog plugin updates + ~40 lines manifest updates (lookup + new CTA) + ~30 lines page wiring + ~6 lines doc replica.
- **Specs (template + fin):** ~30 lines new in core-actions-manifest, ~50 lines new in fin-disponibilidades (MODIFIED + ADDED).
- **Validation gates:** 5 gates in fin + `openspec validate` in template.
- **Risk:** Low. The Pinia store is a thin reactive wrapper; the manifest engine already handles the creator flow (used by existing manifests).

## Baseline evidence

Pre-Fase-A commits (TablePagination refactor + sidebar adjustments) are committed and green. This change extends from that baseline.

## Follow-up changes (not nominated here)

- `align-ops-actions-manifest-variant` — replicate the `ModuleCTA.variant` field into OPS prototype.
- `extend-fin-disponibilidades-edit-delete` — round out the Bancos/Cuentas CRUD with edit and lógica delete.
- `extend-fin-disponibilidades-carga-manual-persistence` — wire the carga manual dialog's `on_confirm` to a movements store so new manuals appear in the ledger.
