# Tasks — add-lex-clientes

This change creates the `lex-clientes` capability — the unified `/clientes` page with segmenter-driven status filtering. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-clientes/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-clientes` change. Validation gates and archive (sections 5–6) are mandatory in either case.

This change replaces the previous separate `lex-altas` capability (which was draft, never archived). The behaviours of `/altas` are absorbed here as Requirements gated by the `Pendientes` segment.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-clientes/spec.md` — ADDED Requirements: 8 requirements, 22 scenarios. Cover: L1 segmenter Pendientes / Activos / Inactivos, canonical column set without Estado, debounced text + immediate select filters, server-side pagination with canonical sizes, amber self-assigned highlight, row-click navigation (no sessionStorage marker), Crear Empresa modal with similarity warnings, per-row Asignar segment-aware, destructive Eliminar segment-aware, Skeleton/EmptyState/5xx retry toast, legacy /altas redirect.
- [ ] Run `openspec validate add-lex-clientes --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and API layer (aspirational)

### 2.1 Types

- [ ] `src/lex/clientes/types.ts`:
  - `Cliente` (`id`, `name`, `tax_number`, `type`, `status`, `template_id`, `dockets`, `assigned_users`, `created_at`)
  - `ClienteRow` (Cliente plus computed fields like `isSelfAssigned`)
  - `ClienteSegment` (`'pendientes' | 'activos' | 'inactivos'`)
  - `ClientesListParams` (segment + filters + page + pageSize + sort)
  - `CreateCompanyInput`, `SimilarityMatch`

### 2.2 API binding

- [ ] `src/lex/clientes/api.ts`:
  - `fetchClientes(params: ClientesListParams)` — translates `segment` to `?status=` (PENDING_REVIEW / APPROVED / DEACTIVATED), forwards remaining filters
  - `createCompany(payload)` — `POST /client { type: 'COMPANY', status: 'PENDING_REVIEW', ... }`
  - `assignUser(clientId, userId)` — `PATCH /client/:id { assigned_user_id }`
  - `deleteClient(clientId)` — `DELETE /client/:id`
  - `fetchSimilarMatches(taxNumber)` — `GET /client?tax_number_or_similar=...`

### 2.3 Segment helper

- [ ] `src/lex/clientes/segment.ts` — pure mapping `ClienteSegment ↔ Cliente['status']`; type guards.

## 3. Pages and components (aspirational)

- [ ] `src/pages/Clientes.vue` — page composition with the L1 segmenter (Pendientes / Activos / Inactivos) + Crear Empresa CTA, the sub-tab segmenter (Clientes / Cuentas), L3 filter bar, the table, pagination.
- [ ] `src/lex/clientes/ClientesTable.vue` — uses `core-data-tables` table primitive. Canonical column order without Estado; CUIT in monospace; Plantilla cell via `lex-templates`; Acciones column hidden when no per-row actions visible to current role.
- [ ] `src/lex/clientes/SelectUserPopover.vue` — assignment popover. Lists `COMMERCIAL_LEX` users from `GET /user?role=COMMERCIAL_LEX`. Optimistic update + rollback. Visible in Pendientes and Activos; hidden in Inactivos.
- [ ] `src/lex/clientes/CreateBusinessModal.vue` — vee-validate + zod schema (company_name, tax_number, activity, company_type). Debounced (300 ms) similarity check on tax_number. Submit label switches between `Crear Empresa` and `Crear de todos modos` based on warnings presence.
- [ ] Wire amber row highlight via CSS class bound to `isSelfAssigned`.
- [ ] Wire row click to navigate to `/clientes/:id` (no `sessionStorage` write — `lex-cliente-detalle` resolves back-button via segment of the originating Cliente).
- [ ] Wire Eliminar via `core-modals` destructive confirmation (visible Pendientes + Inactivos for ADMIN_LEX, hidden in Activos).
- [ ] Router: register `/altas` as a 301-style redirect to `/clientes?segment=pendientes` so legacy bookmarks survive.

## 4. Tests (aspirational)

- [ ] `src/pages/Clientes.spec.ts` — exercise every Scenario:
  - Default segment is Activos.
  - URL `?segment=pendientes` opens Pendientes.
  - Switching segment fires a new `GET /client` with the new `status`.
  - Default columns rendered in canonical order; no Estado column.
  - Acciones column hidden for VIEWER_LEX.
  - Empty docket renders em-dash with `title='Sin docket Circuit Pay'`.
  - Text filter debounced 300 ms; selects apply immediately.
  - Filter state survives Back navigation via URL params.
  - Default page size 25; persisted in localStorage; shared across segments.
  - Self-assigned row highlighted; other-assigned not.
  - Highlight follows token refresh.
  - Row click navigates without writing sessionStorage.
  - Acciones cell click does not navigate.
  - Crear Empresa CTA hidden for VIEWER_LEX, visible for COMMERCIAL_LEX/ADMIN_LEX.
  - CreateBusinessModal vee-validate blocks submit when invalid.
  - 201 closes modal, invalidates cache, surfaces toast `Empresa creada`.
  - Similarity warnings render inline; submit label flips to `Crear de todos modos`.
  - Asignar visible in Pendientes + Activos; hidden in Inactivos.
  - Asignar optimistic update + rollback toast on 500.
  - VIEWER_LEX sees Asignado as plain text.
  - Eliminar hidden in Activos.
  - Eliminar dialog body shows Cliente name + canonical pair.
  - Eliminar hidden for COMMERCIAL_LEX.
  - Skeleton + EmptyState + 5xx retry toast.
  - `/altas` redirects to `/clientes?segment=pendientes`.
- [ ] Coverage on `Clientes.vue` ≥ 85%; on `CreateBusinessModal.vue` ≥ 90%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-clientes --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-clientes` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-clientes`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-clientes/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-clientes/`.
- [ ] Final commit with conventional message: `specs: add lex-clientes — unified /clientes operative dashboard with status segmenter`.
