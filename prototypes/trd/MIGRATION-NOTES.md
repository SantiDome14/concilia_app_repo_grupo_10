---
status: legacy reference — NOT a contract
created_at: 2026-05-07
source_repo: /Users/yasmani/projects/core-trd-frontend
source_stack: React + TypeScript (target stack: Vue 3 + TypeScript)
---

# TRD — Legacy frontend technical inventory

> **What this is.** A technical inventory of the legacy `core-trd-frontend` (React 18 + TS + Radix UI + React Hook Form), captured to inform the migration of TRD into the `core-template` (Vue 3 + TS + Vite + OpenSpec).
>
> **What this is NOT.** Not a spec, not a contract, not authorization to write code. The hard rule in `CLAUDE.md` / `AGENTS.md` applies: **no production code without an active OpenSpec change.**
>
> **Sources of truth for product behavior:** `discoveries/trd-discovery.md` y discoveries específicos (`trd-proveedores-de-liquidez-discovery.md`, `prime-desk-rfq-gateway-discovery.md`). Si conflictúan con este inventario, ganan los discoveries.

---

## 1. Stack & configuration

**Runtime / build**
- React 18.3.1 — functional components, hooks
- TypeScript 5.5.3 (strict)
- Vite 7.2.7 + `@vitejs/plugin-react-swc`
- Dev server: `localhost:5173`

**Scripts (`package.json`)**
- `npm run dev` / `build` / `build:qa` / `build:prod` / `preview`
- `npm run lint` (ESLint 9.9.0 + react-hooks + react-refresh)
- **Sin test runner configurado** (cero Vitest/Jest/RTL)

**Environment variables**
- `VITE_API_BASE_URL` — backend principal (quotes, clients, limits, balances, attachments)
- `VITE_TRADING_API_BASE_URL` — backend separado para alerts y bots (Lambda/AWS)
- `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
- `VITE_WS_URL` — declarada, no usada
- `.env.example`, `.env.qa`, `.env.production`

**Auth**
- `@auth0/auth0-react` 2.4.0 + Auth0Provider; `cacheLocation: 'localstorage'`
- Token strategy: `getAccessTokenSilently()` con headers manuales por call; cache adicional en `js-cookie`
- Roles (Auth0 scopes / metadata): `ADMIN_TRD`, `VIEWER_TRD`, `OPS_TRD`, `QUOTE_CREATOR_TRD`
- Custom `AuthContext.tsx` envolviendo Auth0 expone `getAccessToken()`, `logout()`, `isAuthenticated`, `user`

**Styling / UI**
- TailwindCSS 3.4.11 (HSL tokens en CSS vars)
- Montserrat (Google Fonts)
- `lucide-react` 0.462.0
- Radix UI primitives (~22 packages)
- `next-themes` 0.3.0 (dark mode class-based)
- 51 shadcn-ui wrapper components en `src/components/ui/`

**Forms / data**
- `react-hook-form` 7.53.0 + `@hookform/resolvers` 3.9.0
- `zod` 3.23.8
- `date-fns` 3.6.0
- `recharts` 2.12.7 (charting)

**HTTP**
- `fetch` API directa (no axios)
- Headers manuales por call: `Authorization: Bearer ${token}`
- Sin global interceptor
- **Dos backends** distintos (`VITE_API_BASE_URL` vs `VITE_TRADING_API_BASE_URL`)

**UI interactions**
- `sonner` 1.5.0 (toast)
- `vaul` 0.9.3 (drawer)
- `input-otp` 1.2.4
- `react-resizable-panels` 2.1.3
- `embla-carousel-react` 8.3.0

---

## 2. Folder layout (`src/`)

```
src/
├── main.tsx                         # entry — React DOM render
├── App.tsx                          # root — Auth0Provider, QueryClientProvider, BrowserRouter
├── index.css                        # Tailwind + CSS vars + fonts
│
├── config/auth0.ts                  # auth0Config (domain, clientId, audience, scope)
│
├── contexts/
│   ├── AuthContext.tsx              # Auth0 wrapper, getAccessToken, logout, token cookie
│   ├── ClientsContext.tsx           # clients[] + isLoadingClients
│   └── CurrenciesContext.tsx        # currency pairs + currency info
│
├── lib/
│   ├── quotesApi.ts                 # ~555 LOC — RFQ API (createQuote, getQuotes, FX rates, attachments, etc.)
│   ├── liquidityApi.ts              # ~183 LOC — Liquidity ops API
│   ├── botsApi.ts                   # Bots API (mínimo)
│   ├── utils.ts                     # cn(), orderCurrencyPair(), formatters
│   └── auth.ts
│
├── hooks/
│   ├── useApi.ts                    # apiRequest() + .get/.post/.put/.delete
│   ├── useClientsFromQuotes.ts      # parallel client loading + cache
│   ├── useSidebar.ts                # sidebar open/close
│   ├── useWebSocket.ts              # (estructura desconocida)
│   ├── use-mobile.tsx               # responsive breakpoint
│   └── use-toast.ts                 # Sonner adapter
│
├── types/
│   ├── quote.ts                     # Quote, QuoteStatus, Client, CurrencyInfo, CurrencyPair, Operation, TabType
│   ├── liquidity.ts                 # LiquidityOperation, LiquidityProvider, LiquiditySummary
│   └── alert.ts                     # Alert, AlertConfig, AlertsResponse
│
├── components/
│   ├── Layout/MainLayout.tsx                   # Sidebar + outlet
│   ├── QuoteForm.tsx                           # 3,048 LOC — quote creation, CCC, fx rates ⚠️
│   ├── QuoteForm/                              # decomposition partial
│   │   ├── ClientSelector.tsx, CurrencyPairSelector.tsx
│   │   ├── AmountFieldWithCurrency.tsx, QuoteFormFields.tsx
│   │   ├── QuotePreview.tsx
│   │   └── CCCDialog.tsx                       # 416 LOC — Crypto-to-Crypto-to-Crypto
│   ├── QuoteDetails/
│   │   ├── QuoteDetailsDialog.tsx              # 368 LOC — tabs Details/Activity/Attachments
│   │   ├── QuoteActivitiesSection.tsx          # 268 LOC — timeline
│   │   ├── CCCQuoteDetailsDialog.tsx           # 571 LOC
│   │   └── [sub-components]
│   ├── HistoryQuotes/
│   │   ├── HistoryQuotes.tsx                   # 480 LOC — main quotes list
│   │   ├── HistoryFilters.tsx                  # 389 LOC
│   │   ├── HistoryRow.tsx                      # 355 LOC
│   │   └── QuoteRow.tsx                        # 265 LOC
│   ├── TodayQuotes/TodayQuotes.tsx             # 630 LOC
│   ├── Liquidity/
│   │   ├── LiquidityForm.tsx                   # 482 LOC
│   │   └── LiquidityTable.tsx                  # 270 LOC
│   ├── Alerts/
│   │   ├── AlertsTable.tsx
│   │   └── NewAlertDialog.tsx                  # 304 LOC
│   ├── Operations/Operations.tsx                # 383 LOC
│   ├── Clients/Clients.tsx                      # 427 LOC
│   ├── bots/                                   # Bots, BotsTable, StrategiesTable, BotDialog, useBots
│   ├── App/useClients.ts
│   ├── ProtectedRoute.tsx
│   ├── AuthButton.tsx
│   ├── ThemeToggle.tsx
│   └── ui/                                     # 51 shadcn wrappers (Radix-based)
│       ├── card, button, input, select, dialog, etc.
│       ├── sidebar.tsx                         # 761 LOC ⚠️
│       └── chart.tsx                           # 363 LOC (Recharts wrapper)
│
├── pages/
│   ├── Quotes.tsx                              # 20 LOC — delegates to HistoryQuotes
│   ├── Dashboard.tsx                           # 73 LOC — KPI cards (mock data)
│   ├── Clients.tsx                             # 12 LOC
│   ├── Alerts.tsx                              # 162 LOC
│   ├── Bots.tsx, Providers.tsx                 # 12 / 11 LOC (placeholders)
│   ├── Callback.tsx                            # 67 LOC — Auth0 callback
│   ├── Index.tsx                               # 48 LOC — legacy landing
│   └── NotFound.tsx                            # 27 LOC
│
└── constants/
    ├── roles.ts                                # USER_ROLES (ADMIN_TRD, VIEWER_TRD, OPS_TRD, QUOTE_CREATOR_TRD)
    └── liquidity.ts                            # liquidity status/term enums
```

State: React Query (server state) + React Context (client state). Sin Redux/Zustand.

---

## 3. Routes

| Path | Component | requiresAuth | Notes |
|---|---|---|---|
| `/callback` | Callback.tsx | false | Auth0 callback handler |
| `/` | MainLayout (outlet) | true | Wrapper con sidebar |
| `` (index) | Quotes.tsx | true | Default → HistoryQuotes |
| `/dashboard` | Dashboard.tsx | true | KPIs (mock data) |
| `/clients` | Clients.tsx | true | |
| `/alerts` | Alerts.tsx | true | |
| `/bots` | Bots.tsx | true | |
| `/providers` | Providers.tsx | true | placeholder |
| `*` | NotFound.tsx | false | 404 |

Guard: `ProtectedRoute` envuelve rutas dentro de MainLayout; chequea `isAuthenticated`. **No tiene `router.setAuth0()`** (ventaja sobre LEX/OPS).

---

## 4. Pages

### 4.1 `Quotes.tsx` (20 LOC) → `HistoryQuotes` (480 LOC)

Default route. Wrapper que carga clients vía ClientsContext y renderiza HistoryQuotes.

**HistoryQuotes:** tabs History · (Today via TodayQuotes 630 LOC) · (Create via QuoteForm 3,048 LOC).

**HistoryFilters (389 LOC):** date range, client name search, client docket, quote status (PENDING/ACCEPTED/COMPLETED/CANCELLED), page size.

**HistoryRow (355 LOC):** client name, dockets, amounts (origin/dest), currency, exchange rate, term, status, actions (view details, cancel, edit notes).

**Endpoints:**
- `GET /quotes` (filtered)
- `GET /quote/{id}`, `/quote/{id}/activities`, `/quote/{id}/attachments`
- `PATCH /quote/{id}` (notes, liquidate_date, status)

**Features especiales:**
- **FX rate lookup:** `GET /fx-rate?pair_id=...` → MarketPricesResponse (per-provider bid/ask + errors)
- **CCC (Crypto-to-Crypto-to-Crypto):** CCCDialog (416 LOC) crea quote 3-leg con middle currency
- **Duplicate detection:** quotesApi tira `DUPLICATE_ERROR` en 409
- **Client limits:** `GET /client/{id}/limits` → ClientLimitsDisplay
- **Client balances:** `GET /client/{id}/balances` (per-currency)

### 4.2 `Dashboard.tsx` (73 LOC) — KPIs (mock data)

Cards estáticos: Quotes Today (12), Total History (1234), Active Clients (45), Total Volume ($2.5M). Sin queries reales.

### 4.3 `Alerts.tsx` (162 LOC) — alerts management

Loads alerts (`GET /alerts`) → AlertsTable. Create via NewAlertDialog (304 LOC, `POST /alerts`). Toggle active vía `PUT /alerts/{alert_id}`.

**Alert fields:** id, name, alert_id, active, cost_price, limit_price, side (Buy/Sell), volume.
**AlertConfig:** plantilla con dynamic field generation (FieldConfig: type, label, placeholder, required, options).

**Backend:** `VITE_TRADING_API_BASE_URL` (separado).

### 4.4 `Clients.tsx` (12 + 427 LOC)

Columns: Client ID, name, docket Ardua, status, active flag.

### 4.5 `Bots.tsx` (12 LOC) — automated trading strategies

BotsTable, StrategiesTable, BotDialog, useBots hook. Stub.

### 4.6 `Providers.tsx` (11 LOC) — placeholder

---

## 5. Reusable components — patterns

**Layout:** MainLayout (sidebar + outlet); sidebar.tsx (761 LOC, complex collapsible nav).

**Forms (decomposed):**
- QuoteForm (3,048 LOC ⚠️) — quote creation con dynamic FX, CCC, BUY/SELL, T0-T2 terms, deduct limits flag
- LiquidityForm (482 LOC) — create/edit liquidity ops
- NewAlertDialog (304 LOC) — alert con FieldConfig dynamic generation

**Modals:**
- QuoteDetailsDialog (368 LOC) — tabs Details/Activity/Attachments
- CCCQuoteDetailsDialog (571 LOC)
- CCCDialog (416 LOC) — 3-leg crypto

**Tables:** HistoryQuotes (480 LOC), AlertsTable, LiquidityTable (270 LOC), BotsTable, StrategiesTable.

**Selectors:** ClientSelector (266 LOC), CurrencyPairSelector.

**Activity:** QuoteActivitiesSection (268 LOC) — quote activity log.

**Radix primitives usados:** Alert Dialog, Accordion, Checkbox, Dialog, Dropdown Menu, Hover Card, Label, Menu Bar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Switch, Tabs, Toggle, Toggle Group, Tooltip. Plus Chart (Recharts), Sidebar (custom 761 LOC), Carousel (Embla).

---

## 6. State management

**React Context:**
- `AuthContext` — isAuthenticated, user, getAccessToken(), logout()
- `ClientsContext` — clients[] + isLoadingClients
- `CurrenciesContext` — currency info, pairs

**React Query (TanStack 5.56.2):** QueryClient en App.tsx. Uso parcial — algunos componentes usan useQuery, otros llaman fetch directo.

**Custom hooks:** useApi, useClientsFromQuotes, useSidebar, useWebSocket, use-mobile, use-toast, useBots.

Sin Redux / Zustand / Pinia analog.

---

## 7. API layer

### `quotesApi.ts` (~555 LOC)

| Función | Endpoint |
|---|---|
| `createQuote(data, token)` | `POST /quote` (409 → throw `DUPLICATE_ERROR`) |
| `createCCCQuote(data, token)` | `POST /create-ccc` |
| `cancelQuote(id, token)` | `PATCH /quote/{id}` `{ status: 'CANCELLED' }` |
| `getQuotes(token, filters?)` | `GET /quotes?...` |
| `getCCCQuotes(quoteId, token, cccGroupId?)` | `GET /quotes?ccc=...` |
| `updateQuote(id, data, token)` | `PATCH /quote/{id}` |
| `getClients(token, filters?)` | `GET /clients?...` |
| `getClientLimits(clientId, token)` | `GET /client/{id}/limits` |
| `getClientBalances(clientId, token)` | `GET /client/{id}/balances` |
| `uploadAttachment(quoteId, data, token)` | `POST /quote/{id}/attachment` (presigned URLs) |
| `getAttachments(quoteId, token)` | `GET /quote/{id}/attachments` |
| `editAttachment(...)` | `PATCH /quote/{id}/attachment/{attachmentId}` |
| `deleteAttachment(...)` | `DELETE /quote/{id}/attachment/{attachmentId}` |
| `getQuoteActivities(quoteId, token)` | `GET /quote/{id}/activities` |
| `getFXRate(pairId, token)` | `GET /fx-rate?pair_id=...` |
| `getOperationFlows(token)` | `GET /operation-flows` |

### `liquidityApi.ts` (~183 LOC)

| Función | Endpoint |
|---|---|
| `getOperations(token, filters)` | `GET /liquidity-operations?...` |
| `createOperation(token, payload)` | `POST /liquidity-operations` (409 → DUPLICATE_ERROR) |
| `confirmOperation(token, id)` | `PATCH /liquidity-operations/{id}/status` `{ status: 'RECEIVED' }` |
| `cancelOperation(token, id)` | `PATCH .../status` `{ status: 'CANCELLED' }` |
| `changeStatus(token, id, status)` | `PATCH .../status` |
| `updateOperation(token, id, payload)` | `PATCH /liquidity-operations/{id}` |
| `getActivities(token, id)` | `GET /liquidity-operations/{id}/activities` |
| `getProviders(token)` | `GET /providers` |

**Quirk:** algunas responses vienen wrapped `{ body: JSON.stringify(...) }` — código parsea `json.body`.

### `botsApi.ts` — estructura mínima.

**Error handling:** generic Error + `DUPLICATE_ERROR` constante en 409. Sin ApiError tipada. Sin interceptor 401/403/5xx. Token pasado por parámetro a cada call.

---

## 8. TRD domain logic (technical view)

TRD = Trading Desk (RFQ / Liquidity / Automated Trading).

**Entidades:**

- **Quote (RFQ):** id, client_id, operation (BUY/SELL), origin_currency, origin_amount, destination_currency, destination_amount, exchange_rate, term (T0-T2), client_account, status, isSpecial, metadata.ccc, liquidate_date, notes, attachments[], activities[].
- **Client:** id, name, ardua_docket, circuit_docket, is_active. Relaciones: Quotes, Limits, Balances.
- **Currency:** KnownCurrencyCode (ARS, USD, EUR, USDC, USDT, BTC + custom), KnownCurrencyType (FIAT, CRYPTO, FUND), id, code, name, symbol, decimals, is_active.
- **CurrencyPair:** id, base_currency_code, quote_currency_code. FX rates via MarketPricesResponse (per-provider bid/ask + errors).
- **LiquidityOperation:** id, provider_id, provider_name, pair_id, operation_date, settlement_date, origin_amount, destination_amount, term, ardua_company, notes. Status: PENDING/RECEIVED/CANCELLED.
- **LiquidityProvider:** id, name. Implies pricing feeds, settlement agreements, risk limits.
- **Alert:** id, name, alert_id, active, cost_price, limit_price, side (Buy/Sell), volume. Templates con FieldConfig dynamic generation.
- **Bot:** automated trading strategy (estructura desconocida).

**Workflows:**
- Quote: PENDING → ACCEPTED → COMPLETED · CANCELLED
- LiquidityOp: PENDING → RECEIVED · CANCELLED

**Roles:** ADMIN_TRD, VIEWER_TRD, OPS_TRD, QUOTE_CREATOR_TRD.

**Constraints clave:** client limits per entity/currency (server-enforced en quote creation); client balances per currency (display); FX rate per provider; operation flow codes (T0/T+1/T+2); deduct limits flag.

---

## 9. Styles & assets

**`src/index.css`**
- `@import "tailwindcss"`
- CSS vars HSL: `--primary`, `--background`, `--foreground`, `--destructive`, `--muted`, `--accent`, `--card`, `--sidebar-*`, `--status-*`, `--trading-*`
- Keyframes: accordion-down/up, pulse-overdue
- Montserrat (Google Fonts)

**Tailwind config (`tailwind.config.ts`)**
- Dark mode class-based
- Tokens: trading-buy / trading-sell / trading-neutral · status-pending/ready/completed/overdue
- Border radius lg/md/sm, container padding, screen sizes

**Icons:** Lucide React (TrendingUp, Plus, Minus, Copy, ArrowRight, etc.)
**Logos:** en `public/` (no inspeccionado en detalle)

---

## 10. Technical debt — items the migration must NOT carry over

### Estructural (React → Vue, port obligatorio)

1. **Hooks vs. Composables** — useAuth, useApi, useClientsFromQuotes, useSidebar, use-mobile, use-toast → composables Vue.
2. **React Context vs. Pinia stores** — AuthContext, ClientsContext, CurrenciesContext → Pinia (auth, clients, currencies).
3. **react-hook-form vs. vee-validate + zod** — refactor mayor (QuoteForm 3,048 LOC).
4. **Radix UI vs. reka-ui** — 51 shadcn-ui components a auditar y portar (no es 1:1).
5. **react-router vs. vue-router** — `createAuthGuard(auth0)` closure pattern.
6. **react-query vs. @tanstack/vue-query** — patrón similar, hook API distinta.
7. **fetch + headers manuales vs. axios + interceptor** — single API client en `src/lib/api/`.
8. **No typed ApiError** — todo tira generic Error. Migrar a `ApiError` tipada.

### Específico del repo

9. **Sin tests** — cero coverage. Target ≥90% en utils (quotesApi, liquidityApi), composables.
10. **Sin code splitting** — todas las pages eager-loaded. Template usa dynamic imports.
11. **Page bloat extremo** — QuoteForm (3,048 LOC), HistoryQuotes (480) + HistoryFilters (389), CCCQuoteDetailsDialog (571), TodayQuotes (630), sidebar.tsx (761), chart.tsx (363). Decomponer en L1/L2/L3.
12. **Mixed error handling** — algunos checks `response.ok`, otros `response.data.status_code >= 400`. Estandarizar.
13. **Manual token refreshing** — `getAccessTokenSilently()` por componente. Verificar refresh flow en migración.
14. **No accessibility audit** — icon buttons sin titles, dropdowns sin labels, status indicators solo por color (BUY=green, SELL=red).
15. **Hardcoded values** — page sizes (10/25/50/100), FX rate timeout, debounce delays, role strings, term codes (T0/T+1/T+2). Mover a `src/constants/`.
16. **Inconsistent naming** — QuoteForm.tsx vs quote-form/, /quotes vs /quote, etc.
17. **API versioning / endpoint split** — dos backends (`VITE_API_BASE_URL` vs `VITE_TRADING_API_BASE_URL`). Sin version pinning. Considerar unificar o version explícita.
18. **No schema validation at API boundary** — responses parseadas como `any`. Agregar Zod schemas a quotesApi/liquidityApi responses.
19. **QuoteForm masivo (3,048 LOC)** — descomponer en QuoteFormBase / CurrencyConverter / CCCQuoteBuilder / AttachmentUploader.
20. **No environment abstraction** — `import.meta.env.VITE_*` scattered. Wrap en `src/config/`.

---

## 11. React → Vue translation table

| React (legacy) | Vue 3 (target) | Notas |
|---|---|---|
| `react-hook-form` | `vee-validate` 4 + `zod` 3 | QuoteForm es el gran refactor |
| `@radix-ui/*` (51 wrappers) | `reka-ui` (shadcn-vue) | No 1:1; auditar primitivos |
| `react-router-dom` | `vue-router` 4 | `createAuthGuard(auth0)`, dynamic imports |
| `@tanstack/react-query` | `@tanstack/vue-query` 5 | Patrón similar, API distinta |
| `useAuth0()` | `Auth0Provider` + `createAuthGuard(auth0)` | NO custom `router.setAuth0()` |
| `useContext(AuthContext)` | Pinia `useAuthStore()` | Migrar 3 contexts → 3 stores |
| `useState()` | `ref()` / `reactive()` | |
| Custom hooks | Composables | Mismo patrón function-based |
| `fetch` + manual headers | `axios` + `setAccessTokenGetter()` interceptor | Todo via `src/lib/api/` |
| `next-themes` | Template theme provider | Verificar en CLAUDE.md |
| `sonner` | `vue-sonner` | API parecida |
| `lucide-react` | `lucide-vue-next` | Mismos íconos, import distinto |
| `date-fns` | `date-fns` | sin cambios |
| `recharts` | `recharts` (Vue) o swap a `chart.js`/`plotly.js` | Verificar Vue support |
| `zod` | `zod` 3 | sin cambios |
| `clsx`+`tailwind-merge` | mismo + `cn()` | Portable as-is |
| `js-cookie` | mismo o `pinia-plugin-persistedstate` | Mejor Pinia persistence para auth |
| JSX nested | `<template>` + `<script setup>` | SFCs `.vue` |
| Props + callbacks | Props + emits | |
| `QueryClientProvider` | Vue Query provider del template | |
| `BrowserRouter` + `Routes` | `createRouter()` | |

**Checklist de migración:**
- [ ] Replace react-hook-form forms con vee-validate + Zod
- [ ] Auditar 51 shadcn-ui components → reka-ui equivalents
- [ ] Migrar routing (router instance, auth guard, dynamic imports, catch-all)
- [ ] Crear Pinia stores (auth, clients, currencies)
- [ ] Port custom hooks → composables
- [ ] Refactor API layer (single axios, ApiError, interceptors)
- [ ] Decomponer QuoteForm (3,048 LOC) en sub-componentes
- [ ] Setup Vitest + tests para quotesApi, liquidityApi, composables (≥90%)
- [ ] Code splitting (dynamic route imports)
- [ ] Accessibility audit (axe + manual)
- [ ] Verificar FX rate / CCC logic translated correctly (lógica compleja)
- [ ] Test auth flow (login, callback, refresh, logout)

---

## Migration design decisions (overriding the legacy structure)

_Pendiente — se completa durante la fase de OpenSpec design._
