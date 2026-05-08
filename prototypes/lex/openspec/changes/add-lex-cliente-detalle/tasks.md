# Tasks — add-lex-cliente-detalle

This change creates the `lex-cliente-detalle` capability — the `/clientes/:id` tabbed legajo view. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-cliente-detalle/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-cliente-detalle` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-cliente-detalle/spec.md` — ADDED Requirements: 7 requirements, 20 scenarios. Cover: four-tab segmenter with conditional Límites, `?tab=` persistence with replace, COMMERCIAL_LEX gating placeholder + no-fetch, smart back-button via sessionStorage, breadcrumb via `useBreadcrumb()`, 404 EmptyState no-auto-redirect, Detalles section canonical order with PENDING_REVIEW similarity warnings.
- [ ] Run `openspec validate add-lex-cliente-detalle --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/cliente-detalle/types.ts` — `ClienteDetail` (extends Cliente with `relationships`, `documents_summary`, `limits_summary`, `activity_summary`, `metadata.similarity_warnings[]`), `ActiveTab` (`'detalles' | 'actividad' | 'documentos' | 'limites'`).

### 2.2 API binding

- [ ] `src/lex/cliente-detalle/api.ts` — `fetchClienteById(id)` calling `GET /client/:id` with the consolidated payload.

## 3. Pages and components (aspirational)

- [ ] `src/pages/ClienteDetalle.vue` — page shell:
  - L1 PageHeader with back-button whose target is `/clientes?segment=<X>` derived from the loaded Cliente's `status` (`PENDING_REVIEW → pendientes`, `APPROVED → activos`, `DEACTIVATED → inactivos`); fallback to `/clientes` while the Cliente is still loading. No `sessionStorage` is read or written.
  - Sub-tab segmenter with four entries; Límites conditional on `client.circuit_docket || client.haz_docket`.
  - `?tab=` persistence via `router.replace`; default `detalles`; unknown values fall back.
  - `useBreadcrumb()` integration: `setClientName(client.name)` after fetch resolves; `clearClientName()` on unmount.
  - 404 path: `EmptyState` with `Volver a Clientes` CTA.
- [ ] `src/lex/cliente-detalle/Detalles.vue` — section orchestrator: Identidad → Dockets → Onboarding → Relaciones → (Advertencias de similitud only when PENDING_REVIEW + non-empty `similarity_warnings`).
- [ ] Wire `lex-templates` for the Onboarding section template label.
- [ ] Wire `lex-relaciones` for the Relaciones section pickers and removal flows.
- [ ] Wire `lex-documentos` for the Documentos tab body (mounted only when ADMIN_LEX or no COMMERCIAL_LEX-only restriction applies).
- [ ] Wire `lex-limites` for the Límites tab body when applicable.
- [ ] "Acceso restringido" placeholder component reusable across Actividad and Documentos.

## 4. Tests (aspirational)

- [ ] `src/pages/ClienteDetalle.spec.ts` — exercise every Scenario:
  - Cliente with `circuit_docket` exposes Límites tab.
  - Cliente without dockets hides Límites tab.
  - Deep link `?tab=limites` falls back when dockets missing.
  - Reload restores active tab.
  - Tab switch uses `replace` not `push`.
  - Unknown `?tab=` falls back to `detalles`.
  - COMMERCIAL_LEX placeholder + no-fetch on Actividad/Documentos.
  - ADMIN_LEX bypasses placeholder.
  - Tab triggers stay visible for restricted users.
  - PENDING_REVIEW Cliente → back to `/clientes?segment=pendientes`; APPROVED → `/clientes?segment=activos`; DEACTIVATED → `/clientes?segment=inactivos`; back-button before fetch resolves → fallback `/clientes`. No `sessionStorage` reads or writes.
  - Breadcrumb fills with name; loading copy before response; clears on unmount.
  - 404 renders EmptyState; no auto-redirect after 5 s.
  - Detalles section order canonical for APPROVED COMPANY.
  - Similarity warnings render only for PENDING_REVIEW.
- [ ] Coverage on `ClienteDetalle.vue` ≥ 90%; on `Detalles.vue` ≥ 85%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-cliente-detalle --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-cliente-detalle` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-cliente-detalle`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-cliente-detalle/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-cliente-detalle/`.
- [ ] Final commit with conventional message: `specs: add lex-cliente-detalle — /clientes/:id tabbed legajo view`.
