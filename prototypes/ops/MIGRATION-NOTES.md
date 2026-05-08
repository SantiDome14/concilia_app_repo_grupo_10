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

### Decision PSP-1 — `ops-psp` is ONE capability with the Módulo B shape (3 tabs: Disponibilidad / Movimientos / Cuentas)

**Decided:** 2026-05-08 (pre-shipping note). **Refined:** 2026-05-08 (after
reviewing the legacy two-route split in detail).

The legacy ships PSP across **two separate routes**:

- `PSPHome.vue` (6,604 LOC) — internally has its own Movements/Accounts tabs + a balance reconciliation banner.
- `PSPAccounts.vue` (1,798 LOC) — selector + SWIFT transactions table (what would be a drill-down inside the new Cuentas tab).

In the new template paradigm both routes collapse into **one capability
`ops-psp`** registered at `/psp`, with three tabs (NOT segmentation — these are
sub-modules within PSP), per the Módulo B shape:

- **Disponibilidad** — saldos disponibles agrupados por banco sponsor (consolidated balances per integration partner: Coinag today; BIND + Banco de Comercio in the roadmap). Includes the legacy reconciliation banner stacked above the section when at least one sponsor reports a mismatch.
- **Movimientos** — ledger paginado con filtros (search + tipo + origen + estado) + cards/contadores por sponsor que actúan también como filtro de un solo click ("ver solo movimientos de Coinag").
- **Cuentas** — lista de cuentas operativas; click en una cuenta abre un drill-down (drawer o sub-vista) con sus SWIFT transactions (lo que hoy es el legacy `PSPAccounts.vue`). Whitelist account modal sigue accesible desde aquí.

This is the same unification principle used by `ops-instructions` (3 legacy
routes → 1 page). The legacy two-route split was not a UX choice — it was a
side-effect of the legacy not having a sub-module-tabs primitive.

#### Naming substitution vs. the template

The template's Módulo B uses **Sociedad** as the top-level aggregation dimension
(treasury intra-group). For OPS PSP the equivalent dimension is **Banco Sponsor**
— the bank the company holds the operational account at. The vocabulary swap is:

| Template (Módulo B) | OPS PSP                  |
|---------------------|--------------------------|
| Sociedad            | Banco Sponsor            |
| Moneda              | Moneda (sin cambio)      |
| Cuenta              | Cuenta (sin cambio)      |
| Posición por sociedad | Posición por banco sponsor |

#### Banco Sponsor catalog (current + roadmap)

OPS is currently integrated with **only one** banco sponsor:

- **Coinag** (active) — `operations_provider_name = 'COINAG'` on `account_instructions`. Whitelisting flow (already shipped in `ops-clients`) uses `GET /coinag/account/:cvu` to validate against this provider.

Roadmap (NOT integrated yet — drives the spec to keep the catalog open-set):

- **BIND** (planned).
- **Banco de Comercio** (planned).

Implication for the PSP migration spec: the `Banco Sponsor` filter MUST NOT
hardcode `'COINAG'` as the only option. The catalog SHOULD source from a
backend endpoint (or a typed enum that callers can extend), so adding BIND or
Banco de Comercio later is a config change, not a code change in every page.
The `account_instruction.operations_provider_name` field on each row is the
canonical link between an account and its banco sponsor.

#### Header CTA + reconciliation banner

Header CTA principal queda visible siempre, anclado al título. CTAs candidatos
(a confirmar en el design del change): `Habilitar cuenta` (cuando la tab activa
es Cuentas), `Importar SWIFT` (cuando la tab activa es Cuentas o Movimientos),
`Reconciliación` (siempre — ejecuta el chequeo manual). El primer CTA del
header debe ser el principal del módulo (no per-tab); CTAs específicos de cada
tab pueden vivir en el header de la sección, no en el L1.

The legacy Coinag balance reconciliation banner SHALL render above the tabs as
a persistent alert from `core-error-handling`. Once BIND and Banco de Comercio
land, the reconciliation banner becomes per-banco-sponsor (an array of alerts,
not a single one), so the spec MUST contract a stackable alert area, not a
single-alert slot.

#### Rationale

The Módulo B paradigm is built specifically for treasury-style modules where
one page has multiple cohesive sub-views over the same domain data. PSP fits
perfectly: disponibilidad multi-banco, ledger de movements multi-sponsor,
cuentas con drill-down de SWIFT — that's the canonical decomposition.
Adopting the shape now (rather than reinventing the legacy two-route split)
keeps PSP visually + behaviourally consistent with the future
`ops-financial-dashboard` (which is Activity + Quotes — a sibling Type-A with
its own tab decomposition).

**Out of scope for this note:** the exact Requirement set lands when the
`add-ops-psp` change is written (single capability, not split). This note
captures the architectural constraint so the design phase doesn't drift into
a different shape and so the Banco Sponsor abstraction is open-set from day
one.

### Decision OPS-CLIENTS-1 — Type-A master + Type-B detail (NOT Módulo B)

The `ops-clients` capability does NOT use the Módulo B shape because the
domain shape is master-list-then-individual-detail (a client at a time), not
treasury-style consolidation across sociedades. See
`changes/add-ops-clients/design.md` Decision 1 for the full rationale.

---

## Migration completed — lessons learned (2026-05-08)

The OPS migration backlog closed with **6 capabilities shipped**, **249 new
tests**, and **~19 000 legacy LOC** replaced by **~6 800 new LOC** (64 %
reduction). The reduction is achieved by deferring every creation/mutation
modal in heavy modules to focused follow-up changes per the
**read-only-first migration policy** (validated as Pattern 3 in the
playbook).

The patterns captured here are the input that produced the canonical
**`prototypes/_core-template/MIGRATION-PLAYBOOK.md`** — the reference for
LEX, TRD, CLP, and future migrations. **Read the playbook before starting
any new prototype migration.**

### Index of archived changes

Located at `openspec/changes/archive/`:

| # | Change | Capability | Tests | Net LOC |
|---|---|---|---|---|
| 1 | `2026-05-08-add-ops-instructions` | `ops-instructions` | 22 | -806 + 600 |
| 2 | `2026-05-08-add-ops-clients` | `ops-clients` | 31 | -2 086 + 1 500 |
| 3 | `2026-05-08-add-ops-statements` | `ops-statements` | 39 | -940 + 700 |
| 4 | `2026-05-08-add-ops-account-instructions` | `ops-account-instructions` | 67 | -794 + 1 200 |
| 5 | `2026-05-08-add-ops-psp` | `ops-psp` | 53 | -9 019 + 1 400 |
| 6 | `2026-05-08-add-ops-financial-dashboard` | `ops-financial-dashboard` | 37 | -6 592 + 1 400 |

Each archive folder contains `proposal.md`, `design.md`, `tasks.md`, and
the frozen `specs/<capability>/spec.md`. **When migrating LEX or TRD and
in doubt, read the archived `design.md` of the closest analogue** — every
non-obvious decision has a `Decision N — ...` block with `Why · Alternatives
considered · Failure modes the rule prevents · Trade-off`.

### Patterns canonised in the playbook

The OPS migration validated 12 patterns now codified in
`MIGRATION-PLAYBOOK.md`. Briefly:

1. **Type-A unification** — collapse legacy multi-route splits (3-route
   `ops-instructions` → 1 page; 2-route `ops-psp` → 1 page with 3 tabs).
2. **Módulo B shape** for treasury-style modules — sub-module tabs
   (`Disponibilidad / Movimientos / Cuentas` over Banco Sponsor).
3. **Read-only first** policy for ≥ 3 000 LOC pages — defer creation
   modals to focused follow-ups (Create Movement, SWIFT Import, Pay Quote,
   etc.).
4. **Open-set abstractions from day one** — `Banco Sponsor` catalog
   accepts BIND + Banco de Comercio without code change.
5. **Drawer for read-only drill-downs** — SWIFT transactions per
   account; NOT modal (too narrow), NOT sub-route (loses context).
6. **Cross-capability composition** — `<WhitelistAccountModal>` from
   `ops-clients` reused by `ops-psp`; `<MovementDetailsModal>` from
   `ops-financial-dashboard` will be reused by future PSP follow-up.
7. **Discriminated result types** — `WhitelistResult`,
   `AccountInstructionResult`, `StatementResult`, `SaveResult`.
8. **Pure helpers extracted** — `portal-status.ts`,
   `interpolation.ts`, `quick-filters.ts`, `sponsor-catalog.ts`,
   `range-storage.ts`, `draft-storage.ts`.
9. **Capability gating inline** with `OPS_ADMIN` fallback until
   `add-ops-roles` lands.
10. **Component emits + parent mutates** — to satisfy
    `vue/no-mutating-props` while sharing reactive state.
11. **`core-multi-step-form` Wizard primitive** — used in
    `ops-account-instructions`; hand-rolled override only when
    cancel-during-submit is needed.
12. **Modal width override justified** — `xl` for side-by-side preview
    (account-instructions wizard); default stays `lg`.

### Quality-of-life refinements landed

Across the 6 changes, the following refinements were land-and-tested
(the playbook keeps the canonical list):

- **Smart single-X default** (account, currency, template) — `ops-clients`,
  `ops-account-instructions`.
- **Pre-submit preview card** — `ops-statements`, `ops-account-instructions`.
- **Cancel during submit (`AbortController`)** — `ops-statements`,
  `ops-account-instructions`.
- **localStorage persistence** — `ops-statements` (range), `ops-psp`
  (last tab), `ops-account-instructions` (per-client draft),
  `ops-financial-dashboard` (last tab + sub-toggle).
- **URL sync of state + deep-links** — every change since `ops-clients`.
- **Re-open success toast** — `ops-statements`.
- **Inline field-level validation mapping** — `ops-account-instructions`.
- **Stackable + dismissible alert area** — `ops-psp` reconciliation banner.
- **Auto-refresh 60 s** — `ops-psp` Disponibilidad balances + Coinag
  health indicator.

### Antipatterns caught and avoided

The early phases of the OPS migration almost made these mistakes;
they're now in the playbook's antipattern list:

1. Re-implementing `core-data-tables` / `core-modals` instead of using the
   primitive (caught in `ops-instructions` review).
2. Copying `<WhitelistAccountModal>` into `ops-psp` (caught when
   `add-ops-psp` design.md was reviewed; resolved with the picker-prefix
   extension).
3. Hardcoding `'COINAG'` as the only sponsor (caught in `add-ops-psp`
   design phase; resolved with the `sponsor-catalog.ts` open-set file).
4. Mutating props in step components (`vue/no-mutating-props` lint
   surfaced it; resolved with emit + parent-mutates pattern).
5. Throwing `ApiError` for domain-specific 409s (caught while wiring
   `<WhitelistAccountModal>` confirmation; resolved with `WhitelistResult`
   discriminated union).
6. Promoting the Quotes sub-toggle to a third top-level tab (caught in
   `add-ops-financial-dashboard` design phase; resolved with `?view=` URL
   param).
7. Step-up MFA on every mutation (caught when `ops-statements` was
   scoped; resolved with the trust-boundary criterion — only `SignUp`
   gets step-up because it creates portal credentials).
8. jsdom Teleport rendering issue in modal tests (caught in
   `MovementDetailsModal.spec.ts`; resolved with the inline-stub pattern
   documented in the playbook).

### Follow-ups nominated (NOT yet migrated)

The 6 changes nominated **26 follow-ups** in their `tasks.md`. These are
explicit deferrals, not "TBD"s; each has a name and a scope statement:

- **Per-modal mutation flows** — `extend-ops-psp-create-movement`,
  `extend-ops-financial-dashboard-create-movement` (likely coordinated),
  `extend-ops-psp-create-coinag-account`, `extend-ops-psp-edit-label`,
  `extend-ops-psp-swift-import`, `extend-ops-psp-csv-export`,
  `extend-ops-psp-movement-details-modal`,
  `extend-ops-financial-dashboard-quote-actions`,
  `extend-ops-financial-dashboard-csv-export`.
- **Per-feature extensions** — `extend-ops-statements-history`,
  `extend-ops-statements-bulk`, `extend-ops-statements-audit-drawer`,
  `extend-ops-account-instructions-edit`,
  `extend-ops-account-instructions-letter-template-binding`,
  `extend-ops-account-instructions-audit-drawer`,
  `extend-ops-clients-movement-modal-integration`,
  `extend-ops-clients-bulk-delete`,
  `extend-ops-financial-dashboard-kanban-view`,
  `extend-ops-instructions-create-from-client`.
- **Cross-cutting** — `add-ops-roles` (consolidates capability strings
  app-wide; replaces every `OPS_ADMIN` fallback).

These follow-ups can land in any order; their dependencies are documented
in each change's `tasks.md`.

### Drift from playbook patterns (deliberate)

For audit purposes, the following deviations from the playbook patterns
are documented in their respective `design.md` blocks:

- **`ops-account-instructions`** — hand-rolled wizard footer instead of
  `<Wizard>` component (per Decision 3) because cancel-during-submit
  swap isn't supported by the primitive's footer. The `useWizard`-style
  step gating logic IS reused; only the chrome is hand-rolled.
- **`ops-clients`** — Type-A master + Type-B detail (NOT modal detail)
  per Decision 1 of `add-ops-clients` because the detail surface is
  dense (info card + accounts + movements). Contrasts with
  `ops-instructions` which uses Detail modal.
- **`ops-financial-dashboard`** — modal width stays `lg` (no preview
  side-by-side); contrasts with `ops-account-instructions` which
  override to `xl` (per Decision 4 of that change).

These deviations are NOT antipatterns — they're justified by the surface's
specific shape. The playbook documents the criterion for choosing.
