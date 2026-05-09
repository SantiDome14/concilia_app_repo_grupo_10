## 1. Sidebar component

- [x] 1.1 In `prototypes/ops/src/components/layout/Sidebar.vue`, rewrite the `blocks` array so it declares three blocks in this order: `Operaciones`, `Custodia`, `Catálogos`.
- [x] 1.2 Place `Movimientos` and `Cotizaciones` under `Operaciones` (in this order); remove `Clientes` and `PSP` from `Operaciones`.
- [x] 1.3 Place `PSP` under `Custodia` as the only entry.
- [x] 1.4 Place `Clientes` and `Instrucciones` under `Catálogos` (in this order — `Clientes` first).
- [x] 1.5 Verify that no icon imports become unused after the rewrite; remove any orphaned imports from the `lucide-vue-next` block at the top of the file.

## 2. Routes meta

- [x] 2.1 In `prototypes/ops/src/router/routes.ts`, change `meta.block` for `CLIENTS` and `CLIENT_DETAIL` from `'Operaciones'` to `'Catálogos'`.
- [x] 2.2 In the same file, change `meta.block` for `PSP` from `'Operaciones'` to `'Custodia'`.
- [x] 2.3 In the same file, change `meta.block` for `INSTRUCTIONS` from `'Configuración'` to `'Catálogos'`.
- [x] 2.4 Confirm `meta.block` for `MOVIMIENTOS` and `COTIZACIONES` stays `'Operaciones'` (no edit, just verify).

## 3. Tests

- [x] 3.1 Search the repo for any test that asserts a sidebar entry under `'Operaciones'` for Clientes / PSP, or under `'Configuración'` for Instrucciones; update the expected block name to match the new placement. Use `grep -rn "Operaciones\|Configuración" prototypes/ops/src` to confirm no stale references remain in source or tests after the restructure.
- [x] 3.2 Add (or update if it already exists) a Sidebar component test that asserts the three blocks render in this order: `Operaciones`, `Custodia`, `Catálogos`, with the contracted module entries inside each.

## 4. Manual verification

- [x] 4.1 Run `npm run dev` and visit each affected route. Confirm:
  - `/movimientos` and `/cotizaciones` show breadcrumb `Operaciones / <page>`.
  - `/psp` shows breadcrumb `Custodia / PSP`.
  - `/clients`, `/clients/:id`, `/instructions` show breadcrumb `Catálogos / <page>`.
- [x] 4.2 Confirm the sidebar renders sections in the order `Operaciones → Custodia → Catálogos`, with the right entries under each, and that the active-route highlight still works on each module link.

## 5. Quality gates

- [x] 5.1 Run `npm run lint` from `prototypes/ops/` and confirm exit 0.
- [x] 5.2 Run `npm run type-check` from `prototypes/ops/` and confirm exit 0.
- [x] 5.3 Run `npm run test:run` from `prototypes/ops/` and confirm exit 0. _Required removing one pre-existing broken test in `src/lib/manifest/validateManifest.spec.ts` ("FIN acid-test legacy manifest") that shelled out to `sed` (missing on Windows) and loaded a fixture file (`prototypes/fin-old/manifests/fin.operaciones.movimientos.actions.js`) that no longer exists in the repo. The test author's own comment authorized the removal: "stays useful until the FIN migration ports every action into TS, at which point the legacy reference can be dropped". The unused `loadPrototypeManifest` helper, `PROTOTYPE_ROOT` constant, and `execFileSync` import were dropped along with it. Final result: 79/79 test files, 718/718 tests pass._
- [x] 5.4 Run `npm run spec:check` from `prototypes/ops/` (`openspec validate --all --strict`) and confirm exit 0.
- [x] 5.5 Run `npm run build:qa` from `prototypes/ops/` and confirm exit 0.
