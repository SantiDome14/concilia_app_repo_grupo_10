---
status: legacy reference — NOT a contract
created_at: 2026-05-06
source_repo: C:\Users\Yasmani\atlas-ai-product-management-framework\core-lex-frontend-main\core-lex-frontend-main
---

# Lex — Legacy frontend technical inventory

> **What this is.** A technical inventory of the legacy `core-lex-frontend` (Vue 3 + JS, no TS), captured to inform the migration of Lex into this project (`core-template`-derived, Vue 3 + TS + Vite + OpenSpec).
>
> **What this is NOT.** It is not a spec, not a contract, not authorization to write code. The hard rule in `CLAUDE.md` / `AGENTS.md` applies: **no production code without an active OpenSpec change.** This file is *input* to that work, not a substitute.
>
> **Sources of truth for product behavior** are the discoveries at the repo root:
> - [discoveries/lex-discovery.md](../../discoveries/lex-discovery.md) — application-level index
> - [discoveries/lex-alertas-discovery.md](../../discoveries/lex-alertas-discovery.md) — Alertas module
> - [discoveries/lex-limites-discovery.md](../../discoveries/lex-limites-discovery.md) — Límites module
>
> If product behavior described here conflicts with the discoveries, **the discoveries win**.

---

## ⚡ Read before scoping any LEX migration change

Before writing the proposal for any `add-lex-*` or `migrate-lex-*` change:

1. **Read the [Migration Playbook](../_core-template/MIGRATION-PLAYBOOK.md)** — the cross-prototype patterns (Type-A unification, Módulo B shape, read-only-first policy, open-set abstractions, drawer vs modal vs page, cross-capability composition, discriminated result types, pure helpers, capability gating, modal width override) validated end-to-end by the OPS migration.
2. **Reference the closest [archived OPS change](../ops/openspec/changes/archive/)** as the worked example. Each `design.md` has `Decision N — ...` blocks with `Why · Alternatives considered · Failure modes the rule prevents · Trade-off` — the pattern your LEX change should follow.
3. **Look at the [OPS lessons learned](../ops/MIGRATION-NOTES.md#migration-completed--lessons-learned-2026-05-08)** — the antipatterns caught during OPS (component duplication, hardcoded sponsor codes, mutating props, throwing for domain errors, etc.) are the same ones to avoid in LEX.

OPS migrated **6 capabilities** with **249 tests** and **64 % LOC reduction**
versus the legacy. The playbook is what made that possible. Apply it.

> **Pre-migration cleanup (already applied):** the LEX prototype has
> already been cleaned up per Pattern 12 — the template-only example
> modules (`Módulo A/B/C`) and the component playground are removed.
> The sidebar `blocks` array starts empty; populate it as each
> `add-lex-<module>` change adds its sidebar entry.

| Quick analogue map (when starting an `add-lex-<x>`) | Look at OPS change |
|---|---|
| Master + detail of a domain entity (Clientes, Operaciones, etc.) | `add-ops-clients` (Type-A master + Type-B detail) |
| 3-route legacy unification | `add-ops-instructions` (3 routes → 1 page + 3 modals) |
| Multi-step creation wizard | `add-ops-account-instructions` (3-step wizard + draft persistence) |
| Modal-only feature on top of an existing page | `add-ops-statements` (modal + 5 QoL refinements) |
| Heavy module with 3+ sub-views (Type-A with tabs) | `add-ops-psp` (Módulo B shape + open-set catalog) |
| Heavy 2-tab dashboard (read-only first) | `add-ops-financial-dashboard` |

---

## 1. Stack & configuration

**Runtime / build**
- Vue 3.5.17 — Options API, plain JavaScript (not TS)
- Vite 7.0.4
- Dev server: `localhost:5173`

**Scripts (`package.json`)**
- `npm run dev`
- `npm run build` / `build:qa` / `build:prod`
- `npm run preview`

**Environment variables**
- `VITE_API_URL` — backend endpoint
- `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
- `VITE_ENV_NAME`
- `.env.example`, `.env.qa`, `.env.production`
- `config.js` re-exports `API_URL` from `import.meta.env.VITE_API_URL`

**Auth**
- `@auth0/auth0-vue` 2.4.0 with refresh-token flow (`useRefreshTokens`, `useRefreshTokensFallback`)
- `cacheLocation: 'localstorage'`
- `Authorization: Bearer <token>`
- Roles on `user.USER_ROLES[]`: `VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`
- Helpers in `src/lib/utils.js`: `hasRole`, `hasCommercialLexRole`, `hasAdminLexRole`

**Styling / UI**
- TailwindCSS 4.1.11 (oklch tokens)
- Montserrat (Google Fonts)
- Bootstrap Icons (`bi-*`) + Lucide Vue Next
- Primary brand: `#1B1B64` (deep navy)
- Shadcn-vue 0.9.5 + Reka UI 2.8.0

**Forms / data**
- `vee-validate` 4.15.1 + `zod`
- `@formkit/auto-animate`
- `@vuepic/vue-datepicker` 12.1.0
- `@tanstack/vue-table` 8.21.3

**HTTP**
- `axios` 1.15.0 — factory `createApi(baseURL, headers)` in `src/api/api.js`
- No interceptors; auth header is constructed manually per call

**Files / export**
- `xlsx` 0.18.5 — Excel export
- `jszip` 3.10.1 — ZIP for bulk export
- `vue-sonner` 2.0.2 — toasts

---

## 2. Folder layout (`src/`)

```
src/
├── main.js                       # entry — Auth0 setup, router init
├── App.vue                       # root — auth state, layout shell
├── Login.vue                     # Auth0 login page (referenced by /login route)
│
├── api/
│   ├── api.js                    # createApi factory
│   └── services/
│       └── clientService.js      # client/user/document API functions
│
├── router/
│   └── index.js                  # 7 routes + auth guard (custom router.setAuth0 hack)
│
├── pages/
│   ├── clientes.vue              # 1,419 LOC — Clientes + CVUs tabs
│   ├── client-details.vue        # 267 LOC — single client tabbed view
│   ├── altas.vue                 # 1,036 LOC — pending-review queue
│   ├── usuarios.vue              # 363 LOC — users list
│   └── blacklist.vue             # 531 LOC — CUIT blacklist
│
├── components/
│   ├── AppSidebar.vue            # collapsible nav (3 items + logout)
│   ├── AppHeader.vue             # tabs / breadcrumbs / bell / avatar
│   ├── NotificationBell.vue
│   ├── UserAvatar.vue
│   ├── CreateBusinessModal.vue
│   ├── BulkBlacklistModal.vue
│   ├── MultiFileUploadModal.vue
│   ├── SelectUserPopover.vue
│   ├── SelectBeneficiary.vue
│   ├── SelectBusiness.vue
│   ├── SelectCoOwner.vue
│   ├── SelectGrouper.vue
│   ├── SelectMergeClient.vue
│   ├── FormClientUpdate.vue
│   ├── FormDocument.vue
│   ├── EditDocumentForm.vue
│   ├── PartnerSelect.vue          # Ardua / Circuit / Haz selector
│   ├── FilterButton.vue
│   ├── Dropzone.vue
│   ├── ClientTabs/
│   │   ├── Details.vue
│   │   ├── CaseActivity.vue
│   │   ├── Documents.vue
│   │   └── Limits.vue
│   └── ui/                        # ~50 shadcn-ui primitives + AutoForm system
│
├── composables/
│   ├── useBreadcrumb.js          # ref clientName + setters
│   └── useNotifications.js       # 158 LOC — fetch, mark-read, 30s cache, token refresh
│
├── lib/
│   └── utils.js                  # cn, hasRole, hasCommercialLexRole, hasAdminLexRole, isValidEmail
│
├── constants/
│   ├── clientTypes.js            # CLIENT_TYPES, RELATIONSHIP_TYPES, label helpers
│   ├── companyTypes.js
│   ├── logTypes.js
│   └── providerTemplates.js      # template UUIDs, color & label maps
│
└── assets/
    └── style.css                 # fonts, CSS vars, keyframes, scrollbar
```

No Pinia / Vuex. State is component-local + two composables.

---

## 3. Routes

| Path | Name | Component | requiresAuth |
|---|---|---|---|
| `/login` | — | `Login.vue` | false |
| `/` | — | redirect → `/clientes` | true |
| `/clientes` | `Clientes` | `clientes.vue` | true |
| `/altas` | `Altas` | `altas.vue` | true |
| `/usuarios` | `Usuarios` | `usuarios.vue` | true |
| `/usuarios/blacklist` | `Blacklist` | `blacklist.vue` | true |
| `/clientes/:id` | `ClientDetail` | `client-details.vue` | true |

Guard: `beforeEach` waits for Auth0 to load (custom `waitForAuth0ToLoad()`); redirects `/login → /clientes` if authed, `→ /login` if not.

**Quirk:** `router.setAuth0()` is a custom method bolted onto the router instance — not standard. The new template forbids this (`createAuthGuard(auth0)` closure-based pattern is the rule).

---

## 4. Pages

### 4.1 `clientes.vue` — main dashboard (1,419 LOC)

Two tabs: **Clientes** and **Cuentas (CVUs)**.

**Clientes table**
- Columns: Ardua docket · Circuit docket · Haz docket · Nombre · CUIT · Estado · Template · Tipo · Asignado · fechas
- Filters: name (debounced 300 ms) · tax number · docket · partner (Ardua/Circuit/Haz) · template UUID · client type (GROUPER/DIRECT, COMPANY/PARTICULAR) · status (ACTIVE/DEACTIVATED) · custom type
- Page sizes: 10 / 25 / 50 / 100
- Rows assigned to current user are highlighted amber
- Loading: skeleton

**CVUs table**
- Columns: created · sponsor (BIND/COINAG) · client name · CVU details
- Filters: date range · sponsor · client name
- Excel export (XLSX)

**Endpoints:** `GET /client`, `GET /cvu`

Role-based: `visible_statuses` and `assigned_users` are filtered server-side per role.

### 4.2 `client-details.vue` — single client (267 LOC)

Sub-tabs: **Detalles · Actividad · Documentos · Límites** (Límites only when `circuit_docket` or `haz_docket` exists).

- Active tab persisted via `?tab=` query param
- `COMMERCIAL_LEX` users see "Acceso restringido" on Actividad and Documentos
- Smart back nav: returns to `/altas` if origin was altas (`sessionStorage.clientDetailSource`), else `/clientes`
- Breadcrumb via `useBreadcrumb()` (sets `clientName`)

**Endpoint:** `GET /client/:id`

### 4.3 `altas.vue` — pending-review queue (1,036 LOC)

Lists clients with `status=PENDING_REVIEW`. Same filter / pagination patterns as Clientes.

- Per-row action: assign user (`SelectUserPopover`), three-dot menu (delete + others)
- Modal: `CreateBusinessModal` for new company registration
- Confirm dialog before delete; toast on success / error

**Endpoints:** `GET /client?status=PENDING_REVIEW`, `DELETE /client/:id`

### 4.4 `usuarios.vue` — user listing

Columns: Email · Nombre · Role.

- Search by name (300 ms debounce)
- Role badge colors: COMMERCIAL → blue, COMPLIANCE → purple, default gray
- `formatRole()`: `ADMIN_LEX → "Admin Lex"`
- Backend uses 1-indexed pages and uppercase sort fields → page transformer in `getUsers()`

**Endpoint:** `GET /user`

### 4.5 `blacklist.vue` — CUIT blacklist

- Search by CUIT
- Modal: `BulkBlacklistModal` for CSV/XLSX bulk import
- Single-add and delete with confirmation

**Endpoints:** `GET /blacklist`, `POST /blacklist`, `DELETE /blacklist/:id`, `POST /blacklist/bulk`

---

## 5. Reusable components — patterns

**Layout**
- `AppSidebar.vue` — collapsible, Bootstrap Icons, Auth0 logout, sub-route highlighting via `sessionStorage.clientDetailSource`
- `AppHeader.vue` — sticky, tab buttons for `/clientes` and `/usuarios`, page title for others, bell + avatar on the right

**Modals**
- `CreateBusinessModal.vue` — dialog with company_name / tax_number / activity / company_type, max-width 900 px, backdrop blur
- `BulkBlacklistModal.vue` — file upload with progress, validation
- `MultiFileUploadModal.vue` — drag & drop, per-file progress bars, S3 presigned-URL flow, cancel/retry

**Selection popovers / dialogs**
- `SelectUserPopover` — inline assignment of commercial users to clients
- `SelectBeneficiary`, `SelectCoOwner`, `SelectGrouper`, `SelectMergeClient`, `SelectBusiness` — relationship pickers
- `PartnerSelect` — Ardua / Circuit / Haz dropdown, used in filters

**Forms**
- `FormClientUpdate.vue` — fields branch on COMPANY vs PARTICULAR, Vee-Validate
- `FormDocument.vue` / `EditDocumentForm.vue` — document metadata
- `Dropzone.vue` — drag-and-drop with progress, S3 integration

**Client tabs (`components/ClientTabs/`)**
- `Details.vue` — info + relationships, similarity warnings, "Confirmar Legajo", "Agregar Relación", "Desactivar"
- `CaseActivity.vue` — timeline of actions/comments (locked for COMMERCIAL_LEX)
- `Documents.vue` — document list, upload, edit metadata, download (locked for COMMERCIAL_LEX)
- `Limits.vue` — circuit/haz limits, history, edit if ADMIN_LEX

**Shadcn-vue primitives** (~30+) plus an **AutoForm** system that generates fields from Zod schemas (Array, Boolean, Date, Enum, File, Input, Number, Object). TODO comment in `auto-form/utils.js` flags missing recursive ZodEffects support.

---

## 6. State management

No Pinia, no Vuex. Two composables only:

- **`useBreadcrumb.js`** — exposes `clientName: Ref<string>` plus `setClientName()`, `clearClientName()`
- **`useNotifications.js`** — `notifications[]`, `loading`, `lastFetch`; 30 s cache; `fetchNotifications(force)`, `markAsRead(ids)`, `getAssignedClientIds()`, `getDueDateClientIds()`, `clearCache()`. Token-error handling: on `consent_required` / `login_required` from `getAccessTokenSilently`, redirects to `loginWithRedirect` with consent prompt.

**Notification types:** `CLIENT_ASSIGNMENT`, `DUE_DATE`. Statuses: `DELIVERED`, `READ`. `unreadCount` is computed deduped by `client_id + type`.

---

## 7. API layer

Single file: `src/api/services/clientService.js` (~1,000 LOC, 41 exported functions).

**Clients**
- `getClients(params, headers)` — `GET /client`
- `getClientById(id, headers)` — `GET /client/:id`
- `updateClient(id, data, headers)` — `PUT /client/:id`
- `deactivateClient(id, headers)` — `PATCH /client/:id/deactivate`
- `deleteClient(id, headers)` — `DELETE /client/:id`
- `mergeClients(clientId, mergeWithId, headers)` — `PUT /merge-clients/:clientId/:mergeWithId`
- `mergeBeneficiary(params, headers)` — `PUT /merge-beneficiary` (query params)
- `updateAIPriseStatus(id, data, headers)` — `POST /client/:id/aiprise-status`
- `getClientTotalizer(taxId, headers)` — `GET /totalizer/:taxId`

**Users**
- `getUsers(params, headers)` — `GET /user` (transforms `id→ids`, `page+1`, sort uppercase)

**Documents**
- `getDocumentsByClientId(clientId, headers)` — `GET` documents by client
- `downloadDocument(documentId, headers)` — download a single document
- `deleteDocument(documentId, headers)` — `DELETE` document(s)
- `updateDocument(documentId, metadata, headers)` — `PUT` document metadata
- `updateDocuments(...)` — alias wrapper for `updateDocument`
- `requestPresignedURLs(clientId, files, headers)` — `POST /document?action=request-presigned-urls`
- `uploadFileToS3(file, presignedData, onProgress)` — `PUT presignedData.upload_url` (XHR for progress)
- `confirmUploads(clientId, uploads, headers)` — `POST /document?action=confirm-uploads`
- `uploadDocumentsWithPresignedURLs(...)` — orchestrator: request → parallel S3 PUT → confirm
- `uploadFolder(clientId, payload, headers)` — `POST /upload-folder/:clientId` (bulk folder)
- `uploadToS3(...)` — **@deprecated** legacy artifact, kept for back-compat; replaced by `uploadDocumentsWithPresignedURLs`

**Comments / Logs**
- `createComment(clientId, body, headers)` — create activity comment on a client
- `getCommentsByClientId(clientId, headers)` — fetch comments
- `getLogsByClientId(clientId, headers)` — `GET /logs/:clientId` (audit trail)

**Relationships (BENEFICIARY / CO_OWNER / GROUPER)**
- `createRelationship(payload, headers)` — create relationship
- `deleteRelationship(id, headers)` — delete relationship
- `createBusinessManual(payload, headers)` — `POST /business-manual` (manual company registration)
- `createBeneficiaryManual(clientId, payload, headers)` — `POST /create-beneficiary-manual/:clientId`
- `createCoOwnerManual(clientId, payload, headers)` — `POST /create-co-owner-manual/:clientId`

**Limits**
- `getLimits(params, headers)` — `GET /limit`
- `createLimit(payload, headers)` — `POST /limit`
- `deleteLimit(limitId, headers)` — `DELETE /limit/:limitId`

**Inferred from page usage (not directly inspected)**
- `getCVUs`, `getNotifications`, `markNotificationsAsRead`, `getBlacklist`, `addToBlacklist`, `deleteFromBlacklist`, `uploadBlacklistBulk`

**Error handling**
- Mixed: some endpoints check `response.status` (401, 500), others check `response.data.status_code >= 400` or `response.data.success === false`
- All consumers throw `new Error(message)` — no typed `ApiError`
- No central interceptor; headers built manually per call:
  ```js
  const token = await getAccessTokenSilently()
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  ```

The new template's `core-api-client` capability mandates a single axios instance with `setAccessTokenGetter`, an interceptor that normalises errors to `ApiError`, global 401 handling that logs out and redirects, 403 toast, 5xx + network retry-toast. **The legacy code violates this contract on every call** — every page rebuilds headers, every error is a generic `Error`. Migration must rewire everything through `src/lib/api/`.

---

## 8. Lex domain logic (technical view)

Cross-reference with `discoveries/lex-discovery.md` for the canonical product description.

- **Client types** — `PARTICULAR`, `COMPANY`, `BENEFICIARY` (mutually exclusive)
- **Relationships** — `BENEFICIARY` (corp owner), `CO_OWNER` (particular co-owner), `GROUPER`
- **Statuses** — `APPROVED`, `PENDING_REVIEW`, `DEACTIVATED`
- **Group entities (dockets)** — `ardua_docket`, `circuit_docket`, `haz_docket`
- **Templates (KYC/KYB)** — 8 hardcoded UUIDs in `src/constants/providerTemplates.js`:
  Ardua KYC · Ardua KYC (Analista Legales) · Ardua KYB · Local KYC · Local KYC (AL) · Local KYB · plus 2 more variants. Each has its own colour and short-name mapping.
- **Roles** — `VIEWER_LEX` (read-all) · `COMMERCIAL_LEX` (assign clients, no Actividad/Documentos) · `ADMIN_LEX` (full)
- **Assignment** — commercial users assignable per client; assigned clients highlighted amber on Clientes table
- **Similarity warnings** — on `PENDING_REVIEW` clients, surfaces possible duplicates as clickable amber alert
- **Documents** — S3 via presigned URLs; `parent_id` for folder hierarchy; metadata: `name`, `type`, `description`, upload date, uploader
- **CVUs** — separate entity, sponsor BIND/COINAG, lives on the second tab of Clientes
- **Blacklist** — CUIT-level blocking; bulk import via CSV/XLSX
- **Audit** — Actividad tab (timeline + comments), locked for COMMERCIAL_LEX

### Constants helpers (not just data tables)

Each `src/constants/*.js` file ships **labels + helper functions**, not bare arrays:

- `clientTypes.js` — `CLIENT_TYPES`, `RELATIONSHIP_TYPES` arrays + `getClientTypeLabel(value)`, `getRelationshipTypeLabel(value)`
- `companyTypes.js` — `COMPANY_TYPES` array + `getCompanyTypeLabel(value)`
- `providerTemplates.js` — `TEMPLATES` (8 UUIDs) + `getTemplateName(value)`, `getTemplateShortName(value)`, `getTemplateOptions()` (returns `[{label:'Todos', value:''}, ...TEMPLATES]`), `getTemplateColor(value)` returning `{bg, text, icon}` mapped per UUID
- `logTypes.js` — `LOG_TYPES`, `ActivityType`, `SYSTEM_LABEL`, `LOG_MESSAGES`, `LOG_TYPE_LABELS` + `getLogMessage()`, `getLogTypeLabel()` helpers

These helpers are consumed throughout pages and components for label rendering, dropdown options and colour mapping. Migration target: type each constant module in TS (`as const satisfies`), keep helpers (or replace with computed `Record<>` lookups) and centralise in `src/constants/`.

---

## 9. Styles & assets

**`src/assets/style.css` (~288 LOC)**
- `@import "tailwindcss"`
- `@theme` mapping CSS vars → Tailwind tokens
- `@keyframes slideInRight`, accordion-down/up
- `main::-webkit-scrollbar` 8 px, `#cbd5e1` → `#94a3b8`

**Color tokens (oklch)**
- `--primary: oklch(0.205 0 0)` (≈ navy `#1B1B64`)
- `--background: oklch(1 0 0)` (white)
- `--destructive: oklch(0.577 0.245 27.325)`
- chart colours × 5
- sidebar vars (width 250 px, accent / border)

**Logos** — `public/LogoArduaN.png` (neutral) / `public/LogoArduaP.png` (primary). Used in the sidebar header.

---

## 10. Technical debt — items that the migration must NOT carry over

These are "do not port as-is" flags. None of them imply implementation choice; they imply that direct-copying the legacy code is wrong.

1. **No TypeScript** — the entire codebase is JS. Migration is type-from-zero.
2. **No Pinia / no centralised state** — replace prop-drilling and ad-hoc composables with `auth`, `userPreferences`, `featureFlags` stores per the template's data layer rules.
3. **Inconsistent error handling** — 401/500 thrown as generic `Error`; no `ApiError`; no interceptor.
4. **Manual auth headers per call** — must move to a single axios instance with `setAccessTokenGetter`.
5. **Custom `router.setAuth0()` method** — explicitly forbidden by the template (`createAuthGuard` is the canonical pattern).
6. **Page bloat** — `clientes.vue` 1,419 LOC and `altas.vue` 1,036 LOC. Both must be decomposed (filter panel, KPI strip, data-table surface, pagination, modals) into the template's L1/L2/L3 page pattern.
7. **Pagination logic duplicated** — `visiblePages` / `totalPages` / `hasNext` reimplemented in three pages. Must use `useTable` (client-side) or `@tanstack/vue-query` (server-side).
8. **Filter logic duplicated** — debounced filter watchers reimplemented per page. Extract.
9. **Native HTML `<select>` exists in several places** — forbidden by `core-forms` capability. Confirmed in `pages/clientes.vue`, `pages/altas.vue`, `components/FilterButton.vue`. Replace with reka-ui `<Select>` / `<Combobox>` during migration.
10. **No tests** — zero `*.spec.js` / `*.test.js`. Coverage target ≥ 90 % on utilities/composables in the new project.
11. **Hardcoded values scattered** — template UUIDs, role strings, magic numbers (30 s, 300 ms, page sizes). Move to typed constants.
12. **No accessibility audit** — icon-only buttons without `title`, missing ARIA, inconsistent label associations.
13. **No code splitting** — all pages eager-loaded. Template uses dynamic imports per route.
14. **Mixed naming** — `currentFilters` vs `current_filter`, `Clientes` vs `clientes` for route names. Adopt template conventions: PascalCase components, camelCase composables, kebab-case CSS vars.

---

## Migration design decisions (overriding the legacy structure)

This section records decisions taken during the OpenSpec design phase that **deliberately diverge** from the legacy structure. They are captured in detail inside the `design.md` of the corresponding change; this list is a quick index for future readers wondering *"why does the new project differ from this inventory?"*.

### Decision: `/altas` and `/clientes` are unified into a single `/clientes` page with a status `<Segmenter>`

**Where it lives:** [`openspec/changes/add-lex-clientes/design.md`](openspec/changes/add-lex-clientes/design.md) Decision 1.

**Summary:** the legacy ships `/altas` (status `PENDING_REVIEW`) and `/clientes` (status `APPROVED|DEACTIVATED`) as two pages. The new project recognises that `Cliente` is one entity with a status lifecycle and unifies both surfaces into a single `/clientes` with an L1 `<Segmenter>` Pendientes / Activos / Inactivos. Every behaviour described in §4.3 (`altas.vue`) of this inventory — Crear Empresa modal, similarity warnings, per-row Asignar, destructive Eliminar — moves to `lex-clientes` as Requirements gated by the active segment. The legacy URL `/altas` becomes a redirect to `/clientes?segment=pendientes`.

**Implication for this inventory:** when reading §4.3 above, treat it as historical context for what the new `Pendientes` segment must support. There is no `lex-altas` capability in the new project.

**Knock-on effect:** the smart back-button on `/clientes/:id` (originally driven by `sessionStorage.lex.clientDetailSource` to distinguish `/altas` vs `/clientes`) is simplified to derive its target from the loaded Cliente's `status`. The `sessionStorage` marker pattern is removed entirely.

---

## What this file is NOT (repeated, on purpose)

This is a **map of the legacy app**. It is not a contract. It does not specify how the migrated Lex SHALL behave — that is the job of OpenSpec specs under `openspec/specs/lex-*`. The template's hard rule applies: every concrete behaviour ported from this map enters the new project through an OpenSpec change. When the migration design **deliberately diverges** from the legacy (see "Migration design decisions" above), the divergence is captured in the corresponding `design.md` and indexed at the top of that section.
