# Tasks — add-lex-cuentas-cvu

This change creates the `lex-cuentas-cvu` capability — the Cuentas sub-tab on `/clientes` listing CVU accounts. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-cuentas-cvu/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-cuentas-cvu` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-cuentas-cvu/spec.md` — ADDED Requirements: 5 requirements, 15 scenarios. Cover: `?tab=cuentas` activation without remount, canonical column set with summary popover, default 30-day date range with leftmost positioning, XLSX export over filtered set with warning toast, role gating per `lex-roles`.
- [ ] Run `openspec validate add-lex-cuentas-cvu --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/cuentas/types.ts` — `CVUEntry` (`id`, `created_at`, `sponsor`, `client_id`, `client_name`, `tax_number`, `cbu`, `status`), `CVUListParams`.

### 2.2 API binding

- [ ] `src/lex/cuentas/api.ts` — `fetchCVUs(params)` calling `GET /cvu` with `from`, `to`, `sponsor`, `client_name`, `page`, `page_size`. Routes through the shared axios instance.

### 2.3 Export builder

- [ ] `src/lex/cuentas/exportXlsx.ts` — `buildAndDownloadXlsx(rows: CVUEntry[], range: { from, to })`. Uses `xlsx` 0.18.5 in synchronous mode; produces filename `lex-cuentas-${from}_${to}.xlsx` with `dd-MM-yyyy`. Includes hidden `cvu_id` column.

## 3. Pages and components (aspirational)

- [ ] `src/lex/cuentas/CuentasTab.vue` — sub-tab container, mounted alongside the Clientes tab inside the `/clientes` page; visible only when `?tab=cuentas`.
- [ ] `src/lex/cuentas/CVUTable.vue` — table per `core-data-tables`. Columns: Fecha de creación, Sponsor (Badge), Cliente, CUIT, Account address (monospace), Estado.
- [ ] `src/lex/cuentas/CVUSummaryPopover.vue` — opened on row click; header (Cliente name), body (CUIT + dockets), footer "Ver legajo" link to `/clientes/:id`.
- [ ] L3 filter row: `Rango de fechas` (leftmost, default 30 days), `Sponsor` Select (BIND/COINAG), `Cliente` text (debounced 300 ms).
- [ ] L1 page header: `Exportar XLSX` CTA gated to ADMIN_LEX.

## 4. Tests (aspirational)

- [ ] `src/lex/cuentas/CuentasTab.spec.ts` — exercise every Scenario.
- [ ] `src/lex/cuentas/exportXlsx.spec.ts` — verifies filename pattern, column order, hidden `cvu_id`, large-export toast trigger threshold.
- [ ] Coverage on `exportXlsx.ts` ≥ 95%; on `api.ts` ≥ 90%; on the tab + popover ≥ 80%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-cuentas-cvu --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-cuentas-cvu` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-cuentas-cvu`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-cuentas-cvu/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-cuentas-cvu/`.
- [ ] Final commit with conventional message: `specs: add lex-cuentas-cvu — CVU accounts sub-tab on /clientes`.
