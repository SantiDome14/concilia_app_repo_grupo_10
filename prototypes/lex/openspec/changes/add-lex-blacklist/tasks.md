# Tasks — add-lex-blacklist

This change creates the `lex-blacklist` capability — the CUIT blacklist registry page. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-blacklist/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-blacklist` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-blacklist/spec.md` — ADDED Requirements: 5 requirements, 16 scenarios. Cover: top-level Sidebar entry + legacy redirect, canonical column set + filters, Add-CUIT validation + post-create immutability, bulk import preview + per-row validation, destructive delete with `core-modals`.
- [ ] Run `openspec validate add-lex-blacklist --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/blacklist/types.ts` — `BlacklistEntry` (`id`, `tax_number`, `motivo`, `created_at`, `created_by`), `BlacklistListParams`, `BulkImportRow`, `BulkImportResponse` (`{ created, skipped, errors }`).

### 2.2 API binding

- [ ] `src/lex/blacklist/api.ts` — `fetchBlacklist(params)`, `addToBlacklist(payload)`, `editMotivo(id, motivo)`, `deleteFromBlacklist(id)`, `bulkImport(entries)`. All routed through the shared axios instance from `core-api-layer`.

### 2.3 File parser

- [ ] `src/lex/blacklist/parse.ts` — `parseBlacklistFile(file: File): Promise<{ ok: BulkImportRow[]; errors: { row: number; reason: string }[] }>`. Detects MIME (CSV vs XLSX), uses `papaparse` for CSV and `xlsx` 0.18.5 for XLSX, validates each row against the zod schema (`tax_number`: 11 digits; `motivo`: ≤ 500 chars).

## 3. Pages and components (aspirational)

- [ ] `src/pages/Blacklist.vue` — L1 page header with `Agregar CUIT` and `Importar masivo` CTAs (gated by role); L3 filter bar with CUIT (debounced 300 ms) and Rango de fechas; the table.
- [ ] `src/lex/blacklist/BlacklistTable.vue` — uses `core-data-tables`. Columns: CUIT (monospace), Motivo, Fecha de carga, Cargado por, Acciones.
- [ ] `src/lex/blacklist/AddCuitModal.vue` — Create modal with vee-validate + zod, server 409 duplicate handling.
- [ ] `src/lex/blacklist/EditMotivoModal.vue` — Edit modal with read-only CUIT field.
- [ ] `src/lex/blacklist/BulkBlacklistModal.vue` — file dropzone + preview (Aceptables vs Rechazados) + submit + post-response counts.
- [ ] Router: register `/blacklist` route + redirect from `/usuarios/blacklist`.
- [ ] Sidebar: add the top-level entry (under the appropriate `meta.block`).

## 4. Tests (aspirational)

- [ ] `src/pages/Blacklist.spec.ts` — exercise every Scenario from the spec.
- [ ] `src/lex/blacklist/parse.spec.ts` — CSV with valid + invalid rows, XLSX equivalent, header row handling, empty file.
- [ ] `src/lex/blacklist/api.spec.ts` — outbound URL params and error normalisation.
- [ ] Coverage on `parse.ts` ≥ 95%; on `api.ts` ≥ 90%; on the page + modals ≥ 80%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-blacklist --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-blacklist` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-blacklist`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-blacklist/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-blacklist/`.
- [ ] Final commit with conventional message: `specs: add lex-blacklist — Lex CUIT blacklist registry page`.
