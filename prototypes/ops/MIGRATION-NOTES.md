---
status: legacy reference — NOT a contract
created_at: 2026-05-07
source_repo: /Users/yasmani/projects/core-ops-frontend
---

# OPS — Legacy frontend technical inventory

> **What this is.** A technical inventory of the legacy `core-ops-frontend` (Vue 3 + JS, partial TS in enums), captured to inform the migration of OPS into the `core-template` (Vue 3 + TS strict + Vite + OpenSpec).
>
> **What this is NOT.** Not a spec, not a contract, not authorization to write code. The hard rule in `CLAUDE.md` / `AGENTS.md` applies: **no production code without an active OpenSpec change.**
>
> **Sources of truth for product behavior** are the discoveries at the repo root (`discoveries/ops-discovery.md`). If product behavior described here conflicts with the discoveries, **the discoveries win**.

---

## 1. Stack & configuration

**Runtime / build**
- Vue 3.5.17 — Options API (pages) + Composition API (composables) — mixed
- JavaScript (90%) + TypeScript (10%, en `enums/` y `lib/utils.ts`)
- Vite 7.0.0
- Dev server: `localhost:5173`

**Scripts (`package.json`)**
- `npm run dev` / `build` / `build:prod` / `build:qa` / `preview`
- No lint script, no test script

**Environment variables**
- `VITE_API_URL` — backend OPS
- `VITE_PSP_API_URL` — backend PSP (Payment Service Provider, separado)
- `VITE_LEX_URL` — referencia cross-app a Lex (declarada, no usada)
- `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
- `VITE_ENV_NAME`
- `.env.example`, `.env.qa`, `.env.production`
- Re-exportadas vía `config.js`: `API_URL`, `PSP_API_URL`, `LEX_URL`

**Auth**
- `@auth0/auth0-vue` 2.4.0 (sin refresh-token flow)
- `cacheLocation: 'localstorage'`
- Roles en `idTokenClaims.USER_ROLES[]`: `admin-ops`, `viewer-ops`, `admin-psp`, `viewer-psp`
- Helpers en `composables/useRoles.js`: `hasRole()`, `canAccessRoute()`, `getAccessibleRoutes()`
- **Anti-pattern:** `router.setAuth0()` custom method (forbidden by template)

**Styling / UI**
- TailwindCSS 4.1.11
- Geist (sans) + Geist Mono (Google Fonts)
- `lucide-vue-next` + `oh-vue-icons` (Bootstrap Icons legacy)
- Dark scheme: bg `#0A0A0A`, fg `#FFFFFF`, cards `#1E1E1E`, borders `#292929`/`#3a3a3a`
- Reka UI (combobox, dialog, dropdown, popover, select, tabs, etc.)
- `clsx` + `tailwind-merge` para className utils

**Forms / data**
- `vee-validate` 4.15.1 (uso básico)
- `zod` declarado, uso mínimo
- `MoneyInput.vue` (custom numeric input)
- `CurrencyCombobox.vue`, `SearchableSelect.vue` (custom dropdowns reemplazando native `<select>`)

**HTTP**
- **`fetch` API** envuelta en `useApi()` composable (NO axios)
- Headers manuales por call: `Authorization: Bearer ${token}`
- Sin interceptor central
- Endpoint PSP separado vía `isPsp` boolean por request
- Sin `ApiError` tipada

**Files / export**
- No xlsx ni jszip declarados
- `Toast.vue` custom (no `vue-sonner`)

---

## 2. Folder layout (`src/`)

```
src/
├── main.js                       # entry — Auth0, icon registration, router init
├── App.vue                       # root — auth wrapper, router-view shell (81 LOC)
├── config.js                     # env var re-export
├── style.css                     # Tailwind + Geist theme
│
├── router/
│   └── index.js                  # 160 LOC — 11 routes, router.setAuth0() hack, beforeEach guard
│
├── composables/
│   ├── useApi.js                 # 89 LOC — fetch wrapper, manual headers
│   ├── useRoles.js               # 73 LOC — role extraction, ROUTE_PERMISSIONS map
│   ├── useStepUp.js              # 73 LOC — MFA via Auth0 loginWithPopup
│   └── useInstructions.js        # 165 LOC — CRUD ops, attribute management
│
├── enums/
│   ├── movement.ts               # MovementType (23 tipos: DEPOSIT, WITHDRAWAL, SWAP, etc.)
│   └── dockets.ts                # ArduaDocket (AS, HZ, CP)
│
├── lib/
│   └── utils.ts                  # cn(), getCookie(), valueUpdater<T>()
│
├── data/
│   ├── summary.json, currencies.json, activity.json   # mocks estáticos
│
├── components/
│   ├── Sidebar.vue, AppHeader.vue
│   ├── Loader.vue, Toast.vue, TableSkeleton.vue
│   ├── MoneyInput.vue, CurrencyCombobox.vue, SearchableSelect.vue
│   ├── FilterComponent.vue, FilterComponentPSP.vue
│   ├── StepUpModal.vue, SignUpUserModal.vue
│   ├── GenerateStatementModal.vue, ImportSwiftModal.vue
│   ├── SwiftDataRow.vue
│   └── ui/                       # ~70+ shadcn-vue primitives
│       ├── tabs/, form/, dialog/, alert-dialog/, card/, input/, button/, etc.
│       ├── combobox/             # reka-ui-based searchable select
│       ├── chart-bar/            # BarChart.vue (Unovis library)
│       └── calendar/, range-calendar/
│
├── views/
│   ├── Clients/
│   │   ├── ClientDetail.vue          # 585 LOC — single client, whitelisting, account expansion
│   │   └── CreateInstruction.vue     # 794 LOC — instruction CRUD modal
│   ├── Instructions/
│   │   ├── InstructionsList.vue      # 213 LOC
│   │   ├── InstructionForm.vue       # 593 LOC — edit/create con currency fields
│   │   └── InstructionDetail.vue     # 137 LOC — display-only
│   └── psp/
│       ├── PSPHome.vue                # 6,604 LOC — movements, quotes, balance reconciliation (MASIVO)
│       └── PSPAccounts.vue            # 1,798 LOC — account + SWIFT transactions
│
├── Login.vue                     # 62 LOC
├── Unauthorized.vue              # 85 LOC
├── UserDashboard.vue             # 1,097 LOC — users list, roles, search
├── UserMenu.vue                  # 846 LOC — profile, settings, role management (parcial)
├── FinancialDashboard.vue        # 6,592 LOC — main cash dashboard (MASIVO)
├── PSP.vue                       # 617 LOC — PSP layout shell (tabs, routing)
├── Exchange.vue                  # 61 LOC — propósito poco claro
│
└── assets/                       # eur_round.png, usa_round.png, usd-coin-usdc-logo.svg, swap.png
```

No Pinia / Vuex. State component-local + 4 composables.

---

## 3. Routes

| Path | Name | Component | requiresAuth | Roles |
|---|---|---|---|---|
| `/login` | Login | Login.vue | false | — |
| `/` | Dashboard | FinancialDashboard.vue | true | ADMIN_OPS, VIEWER |
| `/dashboard` | DashboardAlias | FinancialDashboard.vue | true | ADMIN_OPS, VIEWER |
| `/users` | usersDashboardAlias | UserDashboard.vue | true | ADMIN_OPS |
| `/psp` | — | PSP.vue (layout) | true | ADMIN_OPS |
| `/psp/home` | PSPHome | PSPHome.vue | true | — |
| `/psp/accounts` | PSPAccounts | PSPAccounts.vue | true | — |
| `/unauthorized` | Unauthorized | Unauthorized.vue | true | — |
| `/settings/instructions` | Instructions | InstructionsList.vue | true | ADMIN_OPS |
| `/settings/instructions/:id` | InstructionEditor | InstructionForm.vue | true | ADMIN_OPS |
| `/settings/instructions/:id/view` | InstructionDetail | InstructionDetail.vue | true | ADMIN_OPS |
| `/clients/:id` | ClientDetail | ClientDetail.vue | true | ADMIN_OPS, VIEWER |
| `/clients/:id/instructions/create` | CreateInstruction | CreateInstruction.vue | true | ADMIN_OPS |

Guard: `beforeEach` espera Auth0 vía watch sobre `auth0Instance.isLoading`; chequea `ROUTE_PERMISSIONS`; redirige unauth → `/login`.

**Code splitting:** solo `/unauthorized` con dynamic import. Resto eager-loaded.
**Anti-pattern:** `router.setAuth0()` debe reemplazarse por `createAuthGuard(auth0)` closure pattern.

---

## 4. Pages

### 4.1 `FinancialDashboard.vue` — main cash dashboard (6,592 LOC) ⚠️

Tabs: **Activity** · **Quotes**.

**Activity:** columnas Type/From/To/Currency/Amount/Status/Date/Actions. Filtros: client autocomplete · currency · movement type · date range · status. Modal CreateMovement, modal ImportSwiftModal. Skeleton loading.

**Endpoints:** `GET /accounts` (PSP), `GET /movements?...` (PSP), `GET /clients`, `GET /quotes`.

### 4.2 `PSPHome.vue` — PSP dashboard con balance reconciliation (6,604 LOC) ⚠️

- Banner rojo si balance mismatch detectado
- KPI strip
- Tabs Movements · Accounts (con expansion de instructions por cuenta)
- Whitelisting modal (validate CVU/CBU vs PSP)

**Endpoints:** `GET /coinag/account/{cvu}` (PSP), `POST /clients/{id}/whitelist-account`, `GET /accounts`, `GET /movements`, `GET /balance-reconciliation`.

**Único de OPS:** balance reconciliation, integración Coinag, CVU whitelisting, account instruction management.

### 4.3 `PSPAccounts.vue` — account & SWIFT transaction ledger (1,798 LOC)

Selector de cuenta + tabla de transacciones (SWIFT/Internal). Filtros date-range/type. SWIFT import.
**Endpoints:** `GET /accounts`, `GET /swift-transactions`, `POST /swift/import`.

### 4.4 `UserDashboard.vue` — user listing (1,097 LOC)

Email · Name · Role badge. Search debounced. Pagination.
**Endpoint:** `GET /users`.

### 4.5 `ClientDetail.vue` — single client (585 LOC)

Account cards con instructions per-account. Botón Create Instruction → `/clients/:id/instructions/create`. Whitelist modal.
**Endpoints:** `GET /clients/{id}`, `GET /currencies`, `POST /clients/{id}/whitelist-account`.

### 4.6 `InstructionsList.vue` (213 LOC)

CRUD de payment routing templates. Filtros name/currency_name. Pagination.
**Endpoint:** `GET /instruction?name=...&currency_name=...`.

### 4.7 `InstructionForm.vue` (593 LOC)

Form name/currency/description + array dinámico de attributes (key-value flexibles).
**Endpoints:** `POST /instruction`, `PUT /instruction/{id}`, `GET /instruction-attribute/instruction/{id}`, `POST /instruction-attribute/save-all`.

---

## 5. Reusable components — patterns

**Layout:** Sidebar.vue, AppHeader.vue (sticky)
**Modals:** GenerateStatementModal, ImportSwiftModal, StepUpModal (MFA), SignUpUserModal
**Selectors:** CurrencyCombobox, SearchableSelect, FilterComponent / FilterComponentPSP
**Forms:** MoneyInput, InstructionForm, CreateInstruction (wrapper modal)
**Tables:** todas manuales (no @tanstack/vue-table) — paginación reimplementada por página
**Chart:** BarChart.vue (Unovis library — no recharts)
**Shadcn-vue primitives:** ~70+ wrappers reka-ui

---

## 6. State management

No Pinia / Vuex. State local + 4 composables:

- **`useApi.js`** — `request(endpoint, options, isPsp)`; expone `{ get, post, put, patch, del }`; sin error typing; sin retry.
- **`useRoles.js`** — `ROLES`, `ROUTE_PERMISSIONS`, `getUserRoles()`, `hasRole()`, `canAccessRoute()`.
- **`useInstructions.js`** — CRUD instructions + attributes + currencies; refs `isLoading`/`error`.
- **`useStepUp.js`** — `requestStepUp()`, `withStepUp(operation)`; envuelve Auth0 `loginWithPopup()`.

---

## 7. API layer

**File:** `src/composables/useApi.js` (89 LOC).

Métodos del wrapper: `get`, `post`, `put`, `patch`, `del` (cada uno con flag `isPsp` para enrutar a PSP backend).

**Endpoints inventariados (via composables/pages):**
- `GET /instruction?name=&currency_name=`
- `GET /instruction/:id` · `POST /instruction` · `PUT /instruction/:id` · `DELETE /instruction/:id`
- `GET /instruction-attribute/instruction/:id` · `POST /instruction-attribute/save-all`
- `POST /routes` (createRouteFromTemplate)
- `POST /account-instruction`
- `GET /currencies` · `GET /instruction-attribute-value`
- `GET /accounts` · `GET /movements` · `GET /clients` · `GET /users` · `GET /quotes` · `GET /clients/:id`
- `GET /coinag/account/:cvu` (PSP) · `POST /clients/:id/whitelist-account` (PSP)
- `GET /balance-reconciliation` · `POST /swift/import` · `GET /swift-transactions`

**Error handling:** `Error` genérico; checks mixtos (`response.ok` vs JSON.error). Sin retry, sin interceptor 401, sin auto-refresh.

---

## 8. OPS domain logic (technical view)

**Movement types** (`enums/movement.ts`, 23 tipos)
- Core: `DEPOSIT`, `WITHDRAWAL`, `FEE`, `REBATE`, `TRANSFER`, `SWAP`
- Sub: `TRANSFER_IN/OUT`, `SWAP_IN/OUT`, `INT_DEPOSIT/WITHDRAWAL`, `FX_DEPOSIT/WITHDRAWAL`
- Collector: `COLLECTOR_IN`, `COLLECTOR_OUT`
- Adjust: `ADDITION`, `DEDUCTION`

**Dockets** (`enums/dockets.ts`): `AS`, `HZ`, `CP`

**Accounts:** `account_number`, `provider` (Coinag/Bank), `status`, `instructions[]`. Whitelisting flow: validate via PSP → add via OPS.

**Instructions (Payment Routes):** template `name`/`currency_name`/`description` + `attributes[]` flexibles (key-value con `index_order`).

**Balance Reconciliation:** alert con `has_mismatch`/`difference`. Solo Coinag por ahora.

**Currencies:** lista vía `GET /currencies`; `currency_id` usado en whitelist/instructions.

**Roles:** `admin-ops`, `viewer-ops`, `admin-psp`, `viewer-psp`.

**Movement statuses (inferidos):** PENDING, COMPLETED, FAILED, CANCELLED.
**Account statuses:** ACTIVE, INACTIVE, PAUSED.

---

## 9. Styles & assets

**`src/style.css`**
- `@import 'tailwindcss';`
- `@theme { --font-sans: "Geist"; --font-mono: "Geist Mono"; }`
- `html, body { background-color: #0A0A0A; }`

**Color scheme (dark)**
- bg `#0A0A0A` · fg `#FFFFFF`
- muted: `#D9D9D9`, `#999999`, `#666666`, `#595959`
- borders: `#3a3a3a`, `#292929`, `#2a2a2a`
- cards: `#1E1E1E`
- accents: red-500, blue-600, green-500, purple-500

**Logos / assets**
- `/logo.png` (referenciado, no presente en repo)
- `/icons/coinag-logo.png`
- `eur_round.png`, `usa_round.png`, `usd-coin-usdc-logo.svg`, `swap.png`

Sin scrollbar customization (a diferencia de LEX).

---

## 10. Technical debt — items the migration must NOT carry over

1. **No TypeScript (90% JS)** — solo enums + utils en TS.
2. **No Pinia / no centralized state** — replace component-local refs + 4 composables con stores Pinia (`auth`, `movement`, `instruction`, `account`).
3. **Inconsistent error handling** — `Error` genérico, sin `ApiError` tipada, sin discriminated unions por status code.
4. **Manual auth headers per call** — migrar a single axios + `setAccessTokenGetter` interceptor + 401/403 centralizado.
5. **`router.setAuth0()` custom method** — forbidden; usar `createAuthGuard(auth0)`.
6. **Page bloat extremo** — `FinancialDashboard.vue` (6,592 LOC) y `PSPHome.vue` (6,604 LOC). Decomponer en L1/L2/L3 (filter panel, KPI strip, data-table surface, modals).
7. **Pagination logic duplicada** — `limit`/`offset`/`totalCount` reimplementado por página. Usar `@tanstack/vue-query` server-side o `@tanstack/vue-table` client-side.
8. **Filter logic duplicada** — extract a composable compartido (`useTableFilters()`).
9. **Native `<select>` elements** — forbidden por `core-forms`. Auditar:
   - `FinancialDashboard.vue`: 4× `<select>` (page size, movement type, provider, rail)
   - `UserDashboard.vue`: 1×
   - `PSPAccounts.vue`: 1×
   - Reemplazar con reka-ui Combobox/Select.
10. **No tests** — cero `.spec.js` / `.test.js`. Target ≥90% en utils/composables.
11. **Hardcoded values scattered** — movement types, role strings, magic numbers (300ms debounce, page sizes 10/25/50/100). Mover a `src/constants/` tipados.
12. **No accessibility audit** — icon-only buttons sin `title`, ARIA missing, labels not associated.
13. **No code splitting** — 11 rutas eager-loaded excepto `/unauthorized`. Template usa dynamic imports por route.
14. **Mixed naming** — `currentFilters` vs `current_filter`, etc. Adoptar conv del template.
15. **Fetch API en lugar de axios** — template manda axios + interceptor. Reescribir `useApi.js` usando `@ardua/core-api-client`.
16. **Inconsistent modal state** — cada page maneja `ref(false)`. Extract a Pinia action o composable (`useDialogs()`).
17. **API response shape inconsistency** — `{ data: [...], count: N }` vs bare array. Normalizar via TypeScript types + transformers.
18. **No route meta validation** — `ROUTE_PERMISSIONS` plain object; sin type-safety. Migrar a OpenSpec route registry.
19. **Form validation framework apenas usado** — `vee-validate`+`zod` declarados pero no estructurados. Migrar a patrón template (form schemas como const).
20. **Cross-component communication via globals** — Auth0 vía `router.setAuth0()`. Usar Pinia actions.

---

## Migration design decisions (overriding the legacy structure)

_Pendiente — se completa durante la fase de OpenSpec design._
