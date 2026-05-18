# Tasks — extend-fin-disponibilidades-bancos-cuentas-crud

> Implementation checklist. Apply in order — template canon first, then fin replica, then domain code, then page wiring. Validation gates close every section.
>
> **Pre-flight:** the Fase A commits (sidebar adjustments + TablePagination refactor + propuesta openspec) MUST be committed before this change starts. 5 fin gates green + template spec:check green.

## 1. Template canon — `ModuleCTA.variant` field

- [ ] 1.1 Edit `prototypes/_core-template-frontend/src/types/manifest.ts`: add optional `variant?: 'primary' | 'secondary'` to the `ModuleCTA` type.
- [ ] 1.2 Edit `prototypes/_core-template-frontend/src/components/manifest/ManifestModuleCTAs.vue`: forward `cta.variant ?? 'primary'` to the `<Button :variant="..." />` mount.
- [ ] 1.3 Edit `prototypes/_core-template-frontend/openspec/specs/core-actions-manifest/spec.md`: apply the ADDED Requirement from this change's `specs/core-actions-manifest/spec.md` (4 scenarios).
- [ ] 1.4 Edit `prototypes/_core-template-frontend/CLAUDE.md` + `AGENTS.md` (byte-identical): in the manifest section, add a one-line bullet mentioning `ModuleCTA.variant?: 'primary' | 'secondary'`.
- [ ] 1.5 Run `cd prototypes/_core-template-frontend && npx openspec validate --all --strict` — expect 18/18 pass.

## 2. Fin replica — byte-identical

- [ ] 2.1 Replicate the `ModuleCTA.variant` field into `prototypes/fin/src/types/manifest.ts`.
- [ ] 2.2 Replicate the `ManifestModuleCTAs.vue` change into `prototypes/fin/src/components/manifest/ManifestModuleCTAs.vue`.
- [ ] 2.3 Replicate the `core-actions-manifest` ADDED Requirement into `prototypes/fin/openspec/specs/core-actions-manifest/spec.md`.
- [ ] 2.4 Replicate the CLAUDE.md + AGENTS.md doc bullet into `prototypes/fin/CLAUDE.md` + `prototypes/fin/AGENTS.md` (byte-identical with each other; the fin docs are not byte-identical with the template's, only CLAUDE.md ↔ AGENTS.md within fin).
- [ ] 2.5 `diff` the 4 touched files between template and fin for the touched sections — expect zero deltas for the new content.

## 3. Fin domain — Estructura mock + EstructuraBanco type

- [ ] 3.1 Add the `EstructuraBanco` type to `prototypes/fin/src/types/fin.ts`:
  ```ts
  export interface EstructuraBanco {
    id: string;
    nombre: string;
    tipo_estructura: EstructuraTipo;
  }
  ```
- [ ] 3.2 Create `prototypes/fin/src/mocks/fin/estructuras_bancos.ts` exporting `ESTRUCTURAS_BANCOS: EstructuraBanco[]` derived from the unique `banco` values currently in `CUENTAS` (ADCAP, ALLARIA, BINANCE, BIND, BITGO, BITSO, BRIDGE, BRUBANK, BULL MARKET, CENTAURUS, COHEN, COINAG, COINBASE, COMERCIO, CONO SUR, CUCCHIARA, FV BANK, INVIU, IVSA, KRAKEN, LYNX, PERC, STRATO, MACRO, REBA, CONVERA, BMO). Each entry: `{ id: slugify(nombre), nombre, tipo_estructura: <derived per ESTRUCTURA_TIPO_BY_BANCO map> }`.
- [ ] 3.3 Add the `estructuras_bancos` export to the barrel `prototypes/fin/src/mocks/fin/index.ts`.

## 4. Fin domain — Pinia store `disponibilidadesCatalog`

- [ ] 4.1 Create `prototypes/fin/src/stores/disponibilidadesCatalog.ts` (Pinia setup store) with:
  - `cuentas: Ref<CuentaBanco[]>` — initialized from a copy of `CATALOGO_CUENTAS`.
  - `estructuras: Ref<EstructuraBanco[]>` — initialized from `ESTRUCTURAS_BANCOS`.
  - `addCuenta(c: CuentaBanco): void` — appends if `id` not already present; logs a warn on collision.
  - `addEstructura(e: EstructuraBanco): void` — same shape, on `id`.
  - `kpis: ComputedRef<BancosCuentasKpis>` — derived from `cuentas` reactively (so the L2 KPI cards update on new records).
- [ ] 4.2 Verify the store integrates with the existing `manifestRegistry` and `auth` stores without conflict.

## 5. Fin catalogs registration

- [ ] 5.1 Edit `prototypes/fin/src/plugins/catalogs.ts`:
  - Register `fin.bancos_cuentas` resolver reading from the Pinia store. Filter logic: when `filter` is a string equal to a sociedad id, return cuentas matching `sociedad_id === filter`; else return the full catalogue.
  - Register `fin.estructuras_bancos` resolver reading from the Pinia store. No filter applied — full catalogue.
  - Register `fin.cuentas_operativas_cliente` resolver reading from `CUENTAS_OPERATIVAS_CLIENTE`. Filter by `cliente_id === filter`.
- [ ] 5.2 Verify the new catalogs are wired in `main.ts` (`setupCatalogs()` is already called).

## 6. Fin manifests — bancos_cuentas CTAs

- [ ] 6.1 Edit `prototypes/fin/src/manifests/fin.disponibilidades.bancos_cuentas.actions.ts`:
  - Update existing `module_cta` "Crear nueva Cuenta":
    - Add `variant: 'primary'`.
    - Change `banco` field from `{ type: 'text', ... }` to `{ type: 'lookup', catalog: 'fin.estructuras_bancos', ... }`.
  - Add NEW `module_cta` "Crear nuevo Banco/Estructura":
    - `id: 'fin.disponibilidades.bancos_cuentas.crear_estructura'`.
    - `variant: 'secondary'`.
    - `capabilities: { required_role_any_of: ['fin.disponibilidades.bancos_cuentas.crear'] }`.
    - `creates_record_type: 'estructura_banco'`.
    - `dialog`: fields `nombre` (text, required), `tipo_estructura` (select with REQ-42 §8.1 values, required).
    - `on_confirm`: `{ update_fields: ['nombre', 'tipo_estructura'], audit: true, toast: 'Banco / Estructura creado' }`.

## 7. Fin page wiring — register creators on Disponibilidades.vue

- [ ] 7.1 Edit `prototypes/fin/src/pages/Disponibilidades.vue`:
  - Replace `import { CATALOGO_CUENTAS } from '@/mocks/fin/bancos_cuentas';` with `const catalogStore = useDisponibilidadesCatalogStore(); const CATALOGO_CUENTAS = computed(() => catalogStore.cuentas);` (or use `storeToRefs`).
  - Update `filteredCuentas` and `BANCOS_CUENTAS_KPIS` to reference the store ref (re-derive KPIs reactively).
  - Register a single creator on the `bancos_cuentas` manifest module: dispatches by `cta.id` to either `addCuenta` or `addEstructura`. The creator generates an auto-id and assembles the record from `formValues`.
- [ ] 7.2 Use `storeToRefs` for the cuentas / estructuras refs so the template re-renders on mutation.
- [ ] 7.3 Verify the existing `<TablePagination>` + `useTable<CuentaBanco>` integration continues to work with the reactive source.

## 8. Fin spec deltas

- [ ] 8.1 Apply the MODIFIED Requirement "Bancos / Cuentas MUST expose Crear nueva Cuenta as the Main CTA" from this change's `specs/fin-disponibilidades/spec.md` into `prototypes/fin/openspec/specs/fin-disponibilidades/spec.md`. Replace the existing Requirement with the new tightened version.
- [ ] 8.2 Apply the two ADDED Requirements ("Bancos / Cuentas MUST expose a Secondary CTA" + "Cargar movimiento manual dialog MUST resolve every cascading lookup") into the same spec file.

## 9. Validation gates — template

- [ ] 9.1 `cd prototypes/_core-template-frontend && npm run type-check` exit 0.
- [ ] 9.2 `npm run lint` exit 0.
- [ ] 9.3 `npm run test:run` exit 0 (54 files / 458 tests; any tests that snapshot `<ManifestModuleCTAs>` may need updating for the new `variant` prop).
- [ ] 9.4 `npx openspec validate --all --strict` 18/18 pass.
- [ ] 9.5 `npm run build:qa` exit 0.

## 10. Validation gates — fin

- [ ] 10.1 `cd prototypes/fin && npm run type-check` exit 0.
- [ ] 10.2 `npm run lint` exit 0.
- [ ] 10.3 `npm run test:run` exit 0 (39 files / 327 tests baseline; Disponibilidades.spec.ts continues to pass).
- [ ] 10.4 `npx openspec validate --all --strict` — 17/17 pass (13 specs + 4 active changes: align-fin-prototype-to-playbook, add-fin-disponibilidades, extend-core-data-tables-table-pagination, extend-fin-disponibilidades-bancos-cuentas-crud).
- [ ] 10.5 `npm run build:qa` exit 0.

## 11. Manual smoke test

- [ ] 11.1 Open `http://localhost:5173/disponibilidades?tab=bancos_cuentas`.
- [ ] 11.2 Click "Crear nuevo Banco/Estructura" (secondary button). Fill `nombre: 'Smoke Bank'`, `tipo_estructura: 'Banco'`. Confirm. Toast: "Banco / Estructura creado".
- [ ] 11.3 Click "Crear nueva Cuenta" (primary button). Verify `banco` lookup includes "Smoke Bank". Fill remaining fields. Confirm. Toast: "Cuenta creada en el catálogo". New row appears in the Bancos / Cuentas table.
- [ ] 11.4 Switch to Movimientos sub-tab. Click "Cargar movimiento manual". Verify Sociedad → Cuenta cascade resolves (the new cuenta is selectable when its sociedad is picked).

## 12. Handover

- [ ] 12.1 Working tree status confirmed.
- [ ] 12.2 Suggested commit message printed for the user.
- [ ] 12.3 Hand off — DO NOT run `git commit` or `git push`.
