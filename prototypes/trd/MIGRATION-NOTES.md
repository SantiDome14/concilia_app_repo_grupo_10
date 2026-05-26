---
status: legacy reference — NOT a contract
created_at: 2026-05-07
updated_at: 2026-05-26 (cleanup of template residuals applied)
source_repo: /Users/yasmani/projects/core-trd-frontend
source_stack: React 18 + TypeScript (target stack: Vue 3 + TypeScript)
discovery_sources_of_truth:
  - discoveries/trd-discovery.md
  - discoveries/trd-proveedores-de-liquidez-discovery.md
  - discoveries/prime-desk-rfq-gateway-discovery.md
---

# TRD — Legacy frontend technical inventory & migration scoping

> **What this is.** Two things in one document:
>
> 1. **A technical inventory** of the legacy `core-trd-frontend` (React 18 + TS + Radix UI + React Hook Form), captured to inform the migration of TRD into the `core-template`-derived shape (Vue 3 + TS + Vite + OpenSpec).
> 2. **A migration scoping plan** that translates the inventory and the discoveries into a proposed decomposition of OpenSpec capabilities, identifies open-set abstractions, and flags architectural decisions that MUST be resolved before each `add-trd-*` change is written.
>
> **What this is NOT.** Not a spec, not a contract, not authorization to write code. The hard rule in `CLAUDE.md` / `AGENTS.md` applies: **no production code without an active OpenSpec change.**
>
> **Sources of truth for product behavior:** the discoveries listed in the frontmatter. If they conflict with this inventory, the discoveries win — the legacy describes the **current** TRD, the discoveries describe the **target** TRD, and the target is what we migrate towards.

---

## ⚡ Read before scoping any TRD migration change

Before writing the proposal for any `add-trd-*` or `migrate-trd-*` change:

1. **Read the relevant discovery first.** The legacy is input, the discovery is the destination. For Proveedores → `trd-proveedores-de-liquidez-discovery.md`. For RFQ Gateway → `prime-desk-rfq-gateway-discovery.md`. For application-wide context → `trd-discovery.md`.
2. **Read the [Migration Playbook](../_core-template-frontend/MIGRATION-PLAYBOOK.md)** — the cross-prototype patterns (Type-A unification, Módulo B shape, read-only-first policy, open-set abstractions, drawer vs modal vs page, cross-capability composition, discriminated result types, pure helpers, capability gating, modal width override) validated end-to-end by the OPS migration.
3. **Reference the closest [archived OPS change](../ops/openspec/changes/archive/)** as the worked example. Each `design.md` has `Decision N — ...` blocks with `Why · Alternatives considered · Failure modes the rule prevents · Trade-off` — the pattern your TRD change should follow.
4. **Apply the [Per-capability pre-flight checklist](#16-per-capability-pre-flight-scoping)** in section 16 of this document.

OPS migrated **6 capabilities** with **249 tests** and **64 % LOC reduction** versus the legacy. The playbook is what made that possible. Apply it.

> **Pre-migration cleanup (already applied):** the TRD prototype has already been cleaned up per Pattern 12 — the template-only example modules (`Módulo A/B/C`) and the component playground are removed. The sidebar `blocks` array starts empty; populate it as each `add-trd-<module>` change adds its sidebar entry.

### TRD-specific consideration: React → Vue rewrite

TRD's legacy stack (React 18 + Radix UI + React Hook Form) is a stricter rewrite than OPS (which migrated Vue 2/3 JS → Vue 3 TS). Some patterns from the playbook need explicit React-to-Vue translation:

- **Radix UI → reka-ui (shadcn-vue)** — the primitive families overlap (Dialog, Sheet, Popover, Select). `core-modals` already maps Radix patterns to reka-ui in the template.
- **React Hook Form → vee-validate + zod** — the `core-forms` capability contracts the canonical Vue shape; the legacy form schemas need a one-time translation.
- **React Query → @tanstack/vue-query** — the API is near-identical (`useQuery`, `useMutation`, `useQueryClient`); shape stays the same.
- **TanStack Table (React) → useTable / vue-query** — `core-data-tables` covers the patterns; legacy `@tanstack/react-table` consumers translate to either flavour.

These are **mechanical translations**, not architectural decisions. The playbook's architectural patterns (Type-A unification, Módulo B shape, read-only-first policy) apply unchanged.

### TRD-specific consideration: target ≠ legacy

The target TRD per the discoveries has surfaces the legacy does NOT have:

- **Home / Exposición Agregada** — central screen of the target app per `trd-discovery.md` §6. The legacy `/dashboard` is a placeholder with hardcoded KPIs; the target Home is the live Exposición view derived from all operational blocks.
- **RFQ Gateway nativo (REQ-9)** — Lotes de Liquidez (GPS/PPS) + Clientes/BPS/Grupos. **Not in the legacy.** REQ-9 is Ready for Dev; the React legacy never built it.
- **Centro de Notificaciones (REQ-33)** — sidebar section "Sistema" with notifications page. **Not in the legacy.** REQ-33 is In Review with a v1 HTML prototype.

This means the migration is NOT 1:1. Some capabilities translate the legacy as-is; others **build new functionality from the discoveries** while reusing the legacy's domain model where it overlaps. The capability decomposition in §13 makes this explicit.

| Quick analogue map (when starting an `add-trd-<x>`)                              | Look at OPS change                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Master + detail of a domain entity (RFQs, Liquidity Providers, etc.)             | `add-ops-clients` (Type-A master + Type-B detail)                           |
| Multi-step creation wizard                                                       | `add-ops-account-instructions` (3-step wizard + draft persistence)          |
| Modal-only feature on top of an existing page                                    | `add-ops-statements` (modal + 5 QoL refinements)                            |
| Heavy module with 3+ sub-views (Type-A with tabs)                                | `add-ops-psp` (Módulo B shape + open-set catalog)                           |
| Heavy 2-tab dashboard (read-only first)                                          | `add-ops-financial-dashboard`                                               |
| Real-time / streaming surface (RFQ inbound feed)                                 | `core-websocket-client` capability + the patterns from OPS where applicable |

---

## 1. Stack & configuration

**Runtime / build**

- React 18.3.1 — functional components, hooks
- TypeScript 5.5.3 (strict)
- Vite 7.2.7 + `@vitejs/plugin-react-swc`
- Dev server: `localhost:5173`
- **Package name in `package.json`:** `"vite_react_shadcn_ts"` (template-derived, never renamed)

**Scripts (`package.json`)**

- `npm run dev` / `build` / `build:qa` / `build:prod` / `preview`
- `npm run lint` (ESLint 9.9.0 + react-hooks + react-refresh)
- `npm run deploy` (Vite build + static export via Serverless Framework)
- **No test runner configured** (zero Vitest/Jest/RTL)

**Environment variables**

- `VITE_API_BASE_URL` — main backend (quotes, clients, limits, balances, attachments, liquidity)
- `VITE_TRADING_API_BASE_URL` — separate backend for alerts and bots (Lambda/AWS)
- `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
- `VITE_WS_URL` — declared, not used (`useWebSocket.ts` is a stub)
- `.env.example`, `.env.qa`, `.env.production`

**Auth**

- `@auth0/auth0-react` 2.4.0 + Auth0Provider; `cacheLocation: 'localstorage'`
- Token strategy: `getAccessTokenSilently()` with manual headers per call; additional cache in `js-cookie`
- Roles (Auth0 scopes / metadata): `admin-trd`, `viewer-trd`, `ops-trd`, `quote-creator-trd` (per `constants/roles.ts` — note: lowercase-hyphenated, the inventory previously said uppercase)
- Custom `AuthContext.tsx` wraps Auth0 and exposes `getAccessToken()`, `logout()`, `isAuthenticated`, `user`

**Styling / UI**

- TailwindCSS 3.4.11 (HSL tokens in CSS vars) — **legacy is on Tailwind 3; target Vue template is on Tailwind 4**
- Montserrat (Google Fonts)
- `lucide-react` 0.462.0
- Radix UI primitives (~22 packages — see `package.json` for the full list)
- `next-themes` 0.3.0 (dark mode, class-based)
- 51 shadcn-ui wrapper components in `src/components/ui/`

**Forms / data**

- `react-hook-form` 7.53.0 + `@hookform/resolvers` 3.9.0
- `zod` 3.23.8
- `date-fns` 3.6.0
- `recharts` 2.12.7 (charting)

**HTTP**

- `fetch` API directly (no axios)
- Manual headers per call: `Authorization: Bearer ${token}`
- No global interceptor
- **Two backends** distinct (`VITE_API_BASE_URL` vs `VITE_TRADING_API_BASE_URL`)

**UI interactions**

- `sonner` 1.5.0 (toast)
- `vaul` 0.9.3 (drawer — bottom sheet style)
- `input-otp` 1.2.4
- `react-resizable-panels` 2.1.3
- `embla-carousel-react` 8.3.0
- `cmdk` 1.0.0 (command palette primitive — not visibly used in pages)
- `react-day-picker` 9.14.0 (DateRangePicker)

**Deploy**

- Serverless Framework 4.18.2 + `serverless-s3-sync` + `serverless-cloudfront-invalidate`
- Static export to S3 + CloudFront

---

## 2. Folder layout (`src/`)

> **Updated 2026-05-26** to reflect the actual legacy layout. Sub-components missing from the previous inventory are marked `(*)`.

```
src/
├── main.tsx                         # entry — React DOM render
├── App.tsx                          # root — Auth0Provider, QueryClientProvider, BrowserRouter
├── App.css
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
│   ├── botsApi.ts                   # Bots API (minimal)
│   ├── utils.ts                     # cn(), orderCurrencyPair(), formatters
│   └── auth.ts
│
├── hooks/
│   ├── useApi.ts                    # apiRequest() + .get/.post/.put/.delete
│   ├── useClientsFromQuotes.ts      # parallel client loading + cache
│   ├── useSidebar.ts                # sidebar open/close
│   ├── useWebSocket.ts              # STUB — VITE_WS_URL declared but no streaming surface
│   ├── use-mobile.tsx               # responsive breakpoint
│   └── use-toast.ts                 # Sonner adapter
│
├── types/
│   ├── quote.ts                     # Quote, QuoteStatus, Client, CurrencyInfo, CurrencyPair, Operation, TabType
│   ├── liquidity.ts                 # LiquidityOperation, LiquidityProvider, LiquiditySummary, LiquidityFilters
│   └── alert.ts                     # Alert, AlertConfig, AlertsResponse
│
├── components/
│   ├── Layout/
│   │   ├── MainLayout.tsx           # Sidebar + outlet
│   │   ├── Header.tsx               # (*) top bar
│   │   ├── Sidebar.tsx              # sidebar implementation (NOT the 761-LOC ui/sidebar.tsx)
│   │   └── SidebarTooltip.tsx       # (*) collapsed-sidebar tooltip
│   │
│   ├── App/
│   │   ├── AppHeader.tsx            # (*) app-level header inside MainLayout
│   │   ├── AppTabs.tsx              # (*) top tabs (Quotes Activos / Historial)
│   │   └── useClients.ts            # hook to load clients
│   │
│   ├── QuoteForm.tsx                # 3,048 LOC — quote creation, CCC, fx rates ⚠️
│   ├── QuoteForm/                   # decomposition partial — sub-components imported by QuoteForm.tsx
│   │   ├── ClientSelector.tsx       # 266 LOC
│   │   ├── CurrencyPairSelector.tsx
│   │   ├── AmountFieldWithCurrency.tsx
│   │   ├── AmountInput.tsx          # (*)
│   │   ├── CurrencyAmountField.tsx  # (*)
│   │   ├── CurrencySelector.tsx     # (*)
│   │   ├── ClientLimitsDisplay.tsx  # (*) — renders client limits next to the form
│   │   ├── QuoteFormFields.tsx
│   │   ├── QuotePreview.tsx
│   │   └── CCCDialog.tsx            # 416 LOC — Crypto-to-Crypto-to-Crypto
│   │
│   ├── QuoteDetails/
│   │   ├── QuoteDetailsDialog.tsx        # 368 LOC — tabs Details/Activity/Attachments
│   │   ├── QuoteBasicInfo.tsx            # (*)
│   │   ├── QuoteStatusBadge.tsx          # (*)
│   │   ├── QuoteFormFields.tsx           # (*) — separate from QuoteForm/QuoteFormFields
│   │   ├── QuoteActivitiesSection.tsx    # 268 LOC — timeline
│   │   ├── AttachmentsSection.tsx        # (*) — list + actions
│   │   ├── AttachmentItem.tsx            # (*) — row component
│   │   ├── useAttachments.ts             # (*) — hook for upload/edit/delete
│   │   ├── useQuoteActivities.ts         # (*) — hook for activities
│   │   └── CCCQuoteDetailsDialog.tsx     # 571 LOC
│   │
│   ├── HistoryQuotes/
│   │   ├── HistoryQuotes.tsx             # 480 LOC — main quotes list orchestrator
│   │   ├── HistoryFilters.tsx            # 389 LOC
│   │   ├── HistoryRow.tsx                # 355 LOC
│   │   ├── HistoryTable.tsx              # (*) — table wrapper
│   │   ├── HistoryEmptyState.tsx         # (*)
│   │   ├── ClientFilterCombo.tsx         # (*) — client filter combobox
│   │   ├── DateRangePicker.tsx           # (*) — based on react-day-picker
│   │   ├── QuotesCsvSheet.tsx            # (*) ⭐ — CSV export sheet (vaul-based)
│   │   └── useHistoryQuotes.ts           # (*) — hook
│   │
│   ├── QuotesList.tsx                    # (*) — "Quotes Activos" component (sibling of HistoryQuotes)
│   ├── QuotesList/
│   │   ├── QuotesTable.tsx               # (*) — active-quotes table
│   │   ├── QuoteRow.tsx                  # (*) — 265 LOC (previously catalogued under HistoryQuotes/)
│   │   ├── QuoteActions.tsx              # (*) — row actions component
│   │   ├── StatusFilters.tsx             # (*) — status filter chips
│   │   ├── EmptyState.tsx                # (*)
│   │   ├── useQuoteActions.ts            # (*) — hook for row actions
│   │   └── useQuotesFiltering.ts         # (*) — hook for status / sort / search / dateFilter
│   │
│   ├── TodayQuotes/TodayQuotes.tsx       # 630 LOC — uses <QuotesList> internally
│   │
│   ├── Liquidity/
│   │   ├── Liquidity.tsx                 # (*) — orchestrator per discovery
│   │   ├── LiquidityCards.tsx            # (*) — summary cards (Card 1 + Card 2)
│   │   ├── LiquidityFilters.tsx          # (*) — filter bar
│   │   ├── LiquidityTable.tsx            # 270 LOC
│   │   ├── LiquidityForm.tsx             # 482 LOC
│   │   ├── LiquidityDetailModal.tsx      # (*) — detail + activity log
│   │   ├── LiquidityBadges.tsx           # (*) — Status / OperationType / Term badges
│   │   ├── LiquidityCsvSheet.tsx         # (*) ⭐ — CSV export sheet
│   │   └── useLiquidity.ts               # (*) — orchestrating hook
│   │
│   ├── LiquidityRequests/                # ⚠️ EMPTY — declared cascarón, can be deleted
│   │
│   ├── Alerts/
│   │   ├── AlertsTable.tsx
│   │   ├── AlertRow.tsx                  # (*)
│   │   └── NewAlertDialog.tsx            # 304 LOC
│   │
│   ├── Operations/Operations.tsx         # 383 LOC — single-file module
│   ├── Clients/Clients.tsx               # 427 LOC — single-file module
│   │
│   ├── bots/                             # Bots, BotsTable, StrategiesTable, BotDialog, useBots
│   ├── ProtectedRoute.tsx
│   ├── AuthButton.tsx
│   ├── ThemeToggle.tsx
│   └── ui/                               # 51 shadcn wrappers (Radix-based)
│       ├── card, button, input, select, dialog, etc.
│       ├── sidebar.tsx                   # 761 LOC ⚠️ — generic shadcn sidebar primitive
│       └── chart.tsx                     # 363 LOC (Recharts wrapper)
│
├── pages/
│   ├── Quotes.tsx                        # 20 LOC — delegates to HistoryQuotes
│   ├── Dashboard.tsx                     # 73 LOC — KPI cards (mock data) — placeholder per trd-discovery §4.2
│   ├── Clients.tsx                       # 12 LOC
│   ├── Alerts.tsx                        # 162 LOC
│   ├── Bots.tsx, Providers.tsx           # 12 / 11 LOC (placeholders)
│   ├── Callback.tsx                      # 67 LOC — Auth0 callback
│   ├── Index.tsx                         # 48 LOC — legacy landing
│   └── NotFound.tsx                      # 27 LOC
│
└── constants/
    ├── roles.ts                          # USER_ROLES — admin-trd / viewer-trd / ops-trd / quote-creator-trd
    └── liquidity.ts                      # liquidity status / term enums
```

**Items NOT in the legacy that the target TRD requires:**

- **Home with Exposición Agregada** (per `trd-discovery.md` §6). Today `Dashboard.tsx` is a 73-LOC stub.
- **RFQ Gateway** — Lotes de Liquidez (GPS/PPS), Clientes/BPS/Grupos. REQ-9 is Ready for Dev; the React legacy never built it.
- **Centro de Notificaciones (REQ-33)** — sidebar section "Sistema" + dedicated page. v1 HTML prototype exists; no React implementation.

State: React Query (server state) + React Context (client state). No Redux/Zustand. `useLiquidity` notably uses `useState + fetch` directly **without** React Query — an inconsistency caught in the Proveedores discovery.

---

## 3. Routes

| Path         | Component           | requiresAuth | Notes                                              |
| ------------ | ------------------- | ------------ | -------------------------------------------------- |
| `/callback`  | Callback.tsx        | false        | Auth0 callback handler                             |
| `/`          | MainLayout (outlet) | true         | Wrapper with sidebar                               |
| `` (index)   | Quotes.tsx          | true         | Default → HistoryQuotes                            |
| `/dashboard` | Dashboard.tsx       | true         | KPIs (mock data) — Home candidate per discovery    |
| `/clients`   | Clients.tsx         | true         |                                                    |
| `/alerts`    | Alerts.tsx          | true         |                                                    |
| `/bots`      | Bots.tsx            | true         |                                                    |
| `/providers` | Providers.tsx       | true         | Renders `<Liquidity />` per Proveedores discovery  |
| `*`          | NotFound.tsx        | false        | 404                                                |

Guard: `ProtectedRoute` wraps routes inside MainLayout; checks `isAuthenticated`. **No `router.setAuth0()`** (advantage over LEX/OPS).

**Routes NOT in the legacy that the target adds (per discoveries):**

- `/` (root) likely repurposed to **Home / Exposición** (Dashboard candidate).
- `/rfq` (or similar) — RFQ Gateway / Lotes de Liquidez. REQ-9 surface.
- `/sistema/notificaciones` — Centro de Notificaciones. REQ-33 surface.

---

## 4. Pages

### 4.1 `Quotes.tsx` (20 LOC) → `HistoryQuotes` (480 LOC)

Default route. Wrapper that loads clients via ClientsContext and renders HistoryQuotes.

**HistoryQuotes:** the orchestrator that renders BOTH the "Historial" tab (its own table via `HistoryTable.tsx`) AND the "Quotes Activos" tab (via `TodayQuotes` → `<QuotesList>`).

**Two views, same dataset:**

- `HistoryQuotes/` — historical view with date range filters, client search, status filters, paginated table.
- `QuotesList/` (rendered by `TodayQuotes`) — active-quotes view with status chip filters, in-row actions, CCC merging logic.

`QuotesList.tsx` is NOT a separate system; it's the active-quotes presentation that `TodayQuotes` mounts inside the tab structure. The legacy has implicit deduplication: both views fetch from the same `GET /quotes` endpoint with different filters, then `QuotesList.tsx` does client-side CCC grouping (merges CCC legs into a single row).

**HistoryFilters (389 LOC):** date range, client name search, client docket, quote status (PENDING/ACCEPTED/COMPLETED/CANCELLED), page size.

**HistoryRow (355 LOC):** client name, dockets, amounts (origin/dest), currency, exchange rate, term, status, actions (view details, cancel, edit notes).

**Endpoints:**

- `GET /quotes` (filtered)
- `GET /quote/{id}`, `/quote/{id}/activities`, `/quote/{id}/attachments`
- `PATCH /quote/{id}` (notes, liquidate_date, status)

**Special features:**

- **FX rate lookup:** `GET /fx-rate?pair_id=...` → MarketPricesResponse (per-provider bid/ask + errors)
- **CCC (Crypto-to-Crypto-to-Crypto):** CCCDialog (416 LOC) creates 3-leg quote with middle currency. `QuotesList` merges CCC legs into a single row via `metadata.ccc_group_id`.
- **Duplicate detection:** quotesApi throws `DUPLICATE_ERROR` on 409
- **Client limits:** `GET /client/{id}/limits` → ClientLimitsDisplay
- **Client balances:** `GET /client/{id}/balances` (per-currency)
- **CSV export:** `QuotesCsvSheet.tsx` (vaul-based bottom sheet) — ⭐ not previously documented

### 4.2 `Dashboard.tsx` (73 LOC) — placeholder / future Home

Static cards: Quotes Today (12), Total History (1234), Active Clients (45), Total Volume ($2.5M). No real queries.

**Target per `trd-discovery.md` §6:** This page is the natural Home for the migrated TRD, hosting one or more Exposición cards calculated in real time from Quotes + Proveedores + Bots. The legacy Dashboard is a stub for that future surface.

### 4.3 `Alerts.tsx` (162 LOC) — alerts management

Loads alerts (`GET /alerts`) → AlertsTable. Create via NewAlertDialog (304 LOC, `POST /alerts`). Toggle active via `PUT /alerts/{alert_id}`.

**Alert fields:** id, name, alert_id, active, cost_price, limit_price, side (Buy/Sell), volume.
**AlertConfig:** template with dynamic field generation (FieldConfig: type, label, placeholder, required, options).

**Backend:** `VITE_TRADING_API_BASE_URL` (separate from main).

**NOT to be confused with REQ-33 Centro de Notificaciones.** REQ-33 is a different concept: a notifications surface for RFQ Gateway system alerts (lot funding, provider availability, etc.). The legacy `/alerts` is price-trigger alerts for trading; REQ-33 is system / operational alerts. These are two different capabilities in the target.

### 4.4 `Clients.tsx` (12 + 427 LOC)

Columns: Client ID, name, docket Ardua, status, active flag.

### 4.5 `Bots.tsx` (12 LOC) — automated trading strategies

BotsTable, StrategiesTable, BotDialog, useBots hook. Functional (per `trd-discovery.md` §5.3).

### 4.6 `Providers.tsx` (11 LOC) — renders `<Liquidity />`

The "Providers" route is the Proveedores de Liquidez surface. **It is NOT a placeholder** — it is the production module per `trd-proveedores-de-liquidez-discovery.md`. The 11-LOC count reflects that the page is a thin wrapper; the implementation lives in `components/Liquidity/`.

The `LiquidityRequests/` directory at the same level is empty — a leftover scaffold that can be deleted.

---

## 5. Reusable components — patterns

**Layout:** MainLayout (sidebar + outlet); `Layout/Sidebar.tsx` (app-specific); `ui/sidebar.tsx` (761 LOC — generic shadcn primitive, NOT the app sidebar).

**Forms (decomposed):**

- QuoteForm (3,048 LOC ⚠️) — quote creation with dynamic FX, CCC, BUY/SELL, T0-T2 terms, deduct limits flag. Sub-components in `QuoteForm/`.
- LiquidityForm (482 LOC) — create liquidity ops with bidirectional amount calculation, dynamic currency pairs, business-day settlement-date calc.
- NewAlertDialog (304 LOC) — alert with FieldConfig dynamic generation.

**Modals:**

- QuoteDetailsDialog (368 LOC) — tabs Details/Activity/Attachments
- CCCQuoteDetailsDialog (571 LOC)
- CCCDialog (416 LOC) — 3-leg crypto creation
- LiquidityDetailModal — Proveedores detail + activity log

**Tables:** HistoryQuotes (480 LOC), QuotesList table, AlertsTable, LiquidityTable (270 LOC), BotsTable, StrategiesTable.

**Selectors:** ClientSelector (266 LOC), CurrencyPairSelector, CurrencySelector.

**Activity:** QuoteActivitiesSection (268 LOC) — quote activity log. Liquidity ops have their own activity log endpoint.

**Attachments:** AttachmentsSection + AttachmentItem + `useAttachments` hook — upload (presigned URLs), edit, delete.

**CSV export ⭐:** `QuotesCsvSheet.tsx` + `LiquidityCsvSheet.tsx` — vaul-based bottom sheets that let the operator pick columns and download. Not previously documented in this file; flagged as candidate QoL refinement to preserve in migration.

**Radix primitives used:** Accordion, AlertDialog, AspectRatio, Avatar, Checkbox, Collapsible, ContextMenu, Dialog, DropdownMenu, HoverCard, Label, Menubar, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Slot, Switch, Tabs, Toast, Toggle, ToggleGroup, Tooltip. Plus Chart (Recharts), Sidebar (custom 761 LOC), Carousel (Embla), Drawer (vaul).

---

## 6. State management

**React Context:**

- `AuthContext` — isAuthenticated, user, getAccessToken(), logout()
- `ClientsContext` — clients[] + isLoadingClients
- `CurrenciesContext` — currency info, pairs

**React Query (TanStack 5.56.2):** QueryClient in App.tsx. **Inconsistent adoption** — Quotes / Alerts use it; `useLiquidity` does NOT (uses `useState + fetch` per the Proveedores discovery).

**Custom hooks:** useApi, useClientsFromQuotes, useSidebar, useWebSocket (stub), use-mobile, use-toast, useBots, useLiquidity, useHistoryQuotes, useQuotesFiltering, useQuoteActions, useAttachments, useQuoteActivities.

No Redux / Zustand / Pinia analog.

---

## 7. API layer

### `quotesApi.ts` (~555 LOC)

| Function                                    | Endpoint                                       |
| ------------------------------------------- | ---------------------------------------------- |
| `createQuote(data, token)`                  | `POST /quote` (409 → throw `DUPLICATE_ERROR`)  |
| `createCCCQuote(data, token)`               | `POST /create-ccc`                             |
| `cancelQuote(id, token)`                    | `PATCH /quote/{id}` `{ status: 'CANCELLED' }`  |
| `getQuotes(token, filters?)`                | `GET /quotes?...`                              |
| `getCCCQuotes(quoteId, token, cccGroupId?)` | `GET /quotes?ccc=...`                          |
| `updateQuote(id, data, token)`              | `PATCH /quote/{id}`                            |
| `getClients(token, filters?)`               | `GET /clients?...`                             |
| `getClientLimits(clientId, token)`          | `GET /client/{id}/limits`                      |
| `getClientBalances(clientId, token)`        | `GET /client/{id}/balances`                    |
| `uploadAttachment(quoteId, data, token)`    | `POST /quote/{id}/attachment` (presigned URLs) |
| `getAttachments(quoteId, token)`            | `GET /quote/{id}/attachments`                  |
| `editAttachment(...)`                       | `PATCH /quote/{id}/attachment/{attachmentId}`  |
| `deleteAttachment(...)`                     | `DELETE /quote/{id}/attachment/{attachmentId}` |
| `getQuoteActivities(quoteId, token)`        | `GET /quote/{id}/activities`                   |
| `getFXRate(pairId, token)`                  | `GET /fx-rate?pair_id=...`                     |
| `getOperationFlows(token)`                  | `GET /operation-flows`                         |

### `liquidityApi.ts` (~183 LOC)

| Function                              | Endpoint                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| `getOperations(token, filters)`       | `GET /liquidity-operations?...`                                    |
| `createOperation(token, payload)`     | `POST /liquidity-operations` (409 → DUPLICATE_ERROR)               |
| `confirmOperation(token, id)`         | `PATCH /liquidity-operations/{id}/status` `{ status: 'RECEIVED' }` |
| `cancelOperation(token, id)`          | `PATCH .../status` `{ status: 'CANCELLED' }`                       |
| `changeStatus(token, id, status)`     | `PATCH .../status`                                                 |
| `updateOperation(token, id, payload)` | `PATCH /liquidity-operations/{id}`                                 |
| `getActivities(token, id)`            | `GET /liquidity-operations/{id}/activities`                        |
| `getProviders(token)`                 | `GET /providers`                                                   |

**Quirk:** some responses come wrapped `{ body: JSON.stringify(...) }` — the frontend parses `json.body`. Heritage of the Serverless architecture per the Proveedores discovery.

### `botsApi.ts` — minimal structure.

**Error handling:** generic Error + `DUPLICATE_ERROR` constant on 409. No typed ApiError. No 401/403/5xx interceptor. Token passed by parameter to each call.

### Proposed mapping to template `src/api/modules/` (MSW shape)

| Legacy file              | Proposed Vue module             | Notes                                                                                    |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `quotesApi.ts` (Quotes)  | `src/api/modules/quotes.ts`     | createQuote, getQuotes, updateQuote, cancelQuote, getFXRate                              |
| `quotesApi.ts` (CCC)     | `src/api/modules/ccc-quotes.ts` | createCCCQuote, getCCCQuotes — separate module to isolate CCC complexity                 |
| `quotesApi.ts` (Clients) | `src/api/modules/clients.ts`    | getClients, getClientLimits, getClientBalances                                           |
| `quotesApi.ts` (Attach)  | `src/api/modules/attachments.ts`| upload/edit/delete/list — feature module for `add-trd-quote-attachments`                 |
| `quotesApi.ts` (misc)    | `src/api/modules/operation-flows.ts` | getOperationFlows — small, may live in `quotes.ts` if T0/T+1/T+2 hardcoded out      |
| `liquidityApi.ts`        | `src/api/modules/liquidity.ts`  | All liquidity operations + providers + activities                                        |
| `botsApi.ts`             | `src/api/modules/bots.ts`       | When `add-trd-bots` is scoped (deferred)                                                 |
| (REQ-9 new endpoints)    | `src/api/modules/rfq-lotes.ts`  | TBD — RFQ Gateway endpoints not yet in legacy                                            |
| (REQ-9 new endpoints)    | `src/api/modules/bps.ts`        | TBD — BPS / exposure config                                                              |
| (REQ-33 new endpoints)   | `src/api/modules/notifications.ts` | TBD — Centro de Notificaciones backend (REQ-33 has no backend yet)                   |

---

## 8. TRD domain logic (technical view)

TRD = Trading Desk (RFQ / Liquidity / Automated Trading / RFQ Gateway / Exposición / Notifications).

### 8.1 Entities present in the legacy

- **Quote (OTC):** id, client_id, operation (BUY/SELL), origin_currency, origin_amount, destination_currency, destination_amount, exchange_rate, term (T0-T2), client_account, status, isSpecial, metadata.ccc, metadata.ccc_group_id, liquidate_date, notes, attachments[], activities[].
- **Client:** id, name, ardua_docket, circuit_docket, is_active. Relations: Quotes, Limits, Balances.
- **Currency:** KnownCurrencyCode (ARS, USD, EUR, USDC, USDT, BTC + custom), KnownCurrencyType (FIAT, CRYPTO, FUND), id, code, name, symbol, decimals, is_active.
- **CurrencyPair:** id, base_currency_code, quote_currency_code. FX rates via MarketPricesResponse (per-provider bid/ask + errors).
- **LiquidityOperation:** id, provider_id, provider_name, pair_id, operation_date, settlement_date, origin_amount, destination_amount, term, ardua_company, notes. Status: PENDING/RECEIVED. **No CANCELLED** per the discovery — v1 is registry-only.
- **LiquidityProvider:** id, name. Implies pricing feeds, settlement agreements, risk limits.
- **LiquiditySummary:** total_operations, total_usd, usd_bought, usd_sold, pending_count, received_count. **Future:** total_ars, ars_bought, ars_sold (REQ-35).
- **Alert (price-trigger):** id, name, alert_id, active, cost_price, limit_price, side (Buy/Sell), volume. Templates with FieldConfig dynamic generation.
- **Bot:** automated trading strategy. AWS ECS Task ARN per the trd discovery §5.3.

### 8.2 Entities introduced by the discoveries (NOT in the legacy yet)

- **Lote de Liquidez (REQ-9, REQ-30):** GPS (ARDUA provider, fixed price) vs PPS (BINANCE/BITSO/BYMA, external feed). Lifecycle: `SUSPENDED → (FUNDS_IN) → ACTIVE ↔ SUSPENDED → CLOSED`. Snapshot: `available + reserved + executed = fondeo_total`. Waterfall: GPS first, PPS covers remainder.
- **Movimiento de Lote:** FUNDS_IN, FUNDS_OUT, FUNDS_RESERVE (lifecycle RESERVED → EXECUTED).
- **Pre-Quote (RFQ API):** analytical data, not operational. Becomes a Quote on acceptance (`CREATE_QUOTE`).
- **BPS por cliente / grupo:** precedence CLIENT > GROUP > UNDEFINED. `max_open_exposure` (configured) vs `current_open_exposure` (real-time from TRD).
- **Notification (REQ-33):** sidebar-section "Sistema" item. Fields: tipo (4: fondeo insuficiente / provider no disponible / alta utilización / alta tasa de rechazo), recurso (lotId · lotName), CTA primario (navega al recurso), accion (Marcar como resuelta / Resolver todas).

### 8.3 Workflows

- **Quote (OTC):** PENDING → ACCEPTED → PAID → COMPLETED · CANCELLED (per `trd-discovery.md` §5.1, NOT the previous inventory which omitted PAID).
- **CCC Quote:** legs follow the same lifecycle; grouped by `metadata.ccc_group_id`.
- **LiquidityOp:** PENDING → RECEIVED.
- **Lote RFQ (target):** SUSPENDED → (FUNDS_IN) → ACTIVE ↔ SUSPENDED → CLOSED.
- **FUNDS_RESERVE (target):** RESERVED → EXECUTED.
- **Pre-Quote (target):** pre-quote → accepted → CREATE_QUOTE → FUNDS_RESERVE.

### 8.4 Roles

- **TRD legacy:** admin-trd, viewer-trd, ops-trd, quote-creator-trd.
- **TRD target (RFQ):** MESA_TRADER, MESA_SUPERVISOR — per `prime-desk-rfq-gateway-discovery.md` §8 with explicit permission matrix.
- **Cross-cutting:** the target may need to consolidate these into a single role set or layer them. Architectural decision — see §15.

### 8.5 Key constraints

- **Client limits per entity/currency** — server-enforced on quote creation.
- **Client balances per currency** — display only.
- **FX rate per provider** — multiple providers per pair, error per provider possible.
- **Operation flow codes** (T0/T+1/T+2) — currently hardcoded constants in the legacy.
- **Deduct limits flag** — affects whether a quote consumes client limit.
- **BPS rule (target):** applied per price_line, not over total (per RFQ discovery).
- **FUNDS_OUT threshold (target):** MESA_TRADER allowed under threshold; over threshold requires MESA_SUPERVISOR.

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
**Logos:** in `public/` (not inspected in detail)

**Migration concern:** Legacy is Tailwind 3 (HSL CSS vars + `tailwind.config.ts`). Target template is Tailwind 4 (`@theme` mapping + `globals.css`). Color tokens need explicit re-derivation; the brand for TRD is `217 91% 60%` (blue) per the template's CLAUDE.md.

---

## 10. Technical debt — items the migration must NOT carry over

### Structural (React → Vue, mandatory port)

1. **Hooks vs. Composables** — useAuth, useApi, useClientsFromQuotes, useSidebar, use-mobile, use-toast → Vue composables.
2. **React Context vs. Pinia stores** — AuthContext, ClientsContext, CurrenciesContext → Pinia (auth, clients, currencies).
3. **react-hook-form vs. vee-validate + zod** — major refactor (QuoteForm 3,048 LOC).
4. **Radix UI vs. reka-ui** — 51 shadcn-ui components to audit and port (not 1:1).
5. **react-router vs. vue-router** — `createAuthGuard(auth0)` closure pattern.
6. **react-query vs. @tanstack/vue-query** — near-identical pattern, distinct hook API.
7. **fetch + manual headers vs. axios + interceptor** — single API client in `src/lib/api/`.
8. **No typed ApiError** — everything throws generic Error. Migrate to typed `ApiError`.
9. **Tailwind 3 → Tailwind 4** — config migration + token re-derivation per `core-theming` spec.

### Repo-specific

10. **No tests** — zero coverage. Target ≥90% on utils (quotesApi, liquidityApi), composables.
11. **No code splitting** — all pages eager-loaded. Template uses dynamic imports.
12. **Page bloat extreme** — QuoteForm (3,048 LOC), HistoryQuotes (480) + HistoryFilters (389), CCCQuoteDetailsDialog (571), TodayQuotes (630), sidebar.tsx (761), chart.tsx (363). Decompose into L1/L2/L3.
13. **Mixed error handling** — some checks `response.ok`, others `response.data.status_code >= 400`. Standardize.
14. **Manual token refreshing** — `getAccessTokenSilently()` per component. Verify refresh flow in migration.
15. **No accessibility audit** — icon buttons without titles, dropdowns without labels, status indicators by color only (BUY=green, SELL=red).
16. **Hardcoded values** — page sizes (10/25/50/100), FX rate timeout, debounce delays, role strings, term codes (T0/T+1/T+2). Move to `src/constants/` AND to open-set catalogs where appropriate (see §14).
17. **Inconsistent naming** — `QuoteForm.tsx` vs `quote-form/`, `/quotes` vs `/quote`, etc.
18. **API versioning / endpoint split** — two backends (`VITE_API_BASE_URL` vs `VITE_TRADING_API_BASE_URL`). No version pinning. **Architectural decision — see §15.**
19. **No schema validation at API boundary** — responses parsed as `any`. Add Zod schemas to API module responses.
20. **QuoteForm massive (3,048 LOC)** — decompose into QuoteFormBase / CurrencyConverter / CCCQuoteBuilder / AttachmentUploader.
21. **No environment abstraction** — `import.meta.env.VITE_*` scattered. Wrap in `src/config/`.
22. **Mixed React Query adoption** — Quotes/Alerts use it; Liquidity uses bare `useState + fetch`. Standardize on `@tanstack/vue-query` for ALL server state in the target.
23. **`useWebSocket.ts` is a stub** — `VITE_WS_URL` is declared but unused. The target needs to decide whether to wire the `core-websocket-client` capability (RFQ inbound feed, live FX rates).
24. **Empty `LiquidityRequests/` directory** — can be deleted on migration; flagged in the discovery as "cascarón nunca construido".

---

## 11. React → Vue translation table

| React (legacy)              | Vue 3 (target)                                   | Notes                                     |
| --------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `react-hook-form`           | `vee-validate` 4 + `zod` 3                       | QuoteForm is the big refactor             |
| `@radix-ui/*` (51 wrappers) | `reka-ui` (shadcn-vue)                           | Not 1:1; audit primitives                 |
| `react-router-dom`          | `vue-router` 4                                   | `createAuthGuard(auth0)`, dynamic imports |
| `@tanstack/react-query`     | `@tanstack/vue-query` 5                          | Similar pattern, distinct API             |
| `useAuth0()`                | `Auth0Provider` + `createAuthGuard(auth0)`       | NO custom `router.setAuth0()`             |
| `useContext(AuthContext)`   | Pinia `useAuthStore()`                           | Migrate 3 contexts → 3 stores             |
| `useState()`                | `ref()` / `reactive()`                           |                                           |
| Custom hooks                | Composables                                      | Same function-based pattern               |
| `fetch` + manual headers    | `axios` + `setAccessTokenGetter()` interceptor   | All via `src/api/`                        |
| `next-themes`               | Template theme provider                          | Verify in CLAUDE.md                       |
| `sonner`                    | `vue-sonner`                                     | Similar API                               |
| `lucide-react`              | `lucide-vue-next`                                | Same icons, distinct import               |
| `date-fns`                  | `date-fns`                                       | No changes                                |
| `recharts`                  | Template's `data-display/` charts                | Or swap to `chart.js`/`plotly.js`         |
| `react-day-picker`          | Template's calendar primitive                    | Verify equivalent in `core-forms`         |
| `vaul` (bottom sheet)       | `core-modals` `<Sheet>` (reka-ui)                | Translate sheet UX to right-side Sheet    |
| `zod`                       | `zod` 3                                          | No changes                                |
| `clsx`+`tailwind-merge`     | same + `cn()`                                    | Portable as-is                            |
| `js-cookie`                 | same or `pinia-plugin-persistedstate`            | Pinia persistence is cleaner for auth     |
| JSX nested                  | `<template>` + `<script setup>`                  | SFCs `.vue`                               |
| Props + callbacks           | Props + emits                                    |                                           |
| `QueryClientProvider`       | Template's Vue Query provider                    |                                           |
| `BrowserRouter` + `Routes`  | `createRouter()`                                 |                                           |

---

## 12. Migration design decisions log

_Populated as each `add-trd-*` change's `design.md` lands a `Decision N` block. Mirror the most relevant decisions here for cross-capability visibility._

| # | Date | Decision | Capability | Why | Trade-off |
|---|------|----------|------------|-----|-----------|
| _(empty — first entries land with the first migration change)_ | | | | | |

---

# Migration scoping — NEW SECTIONS

> The sections below are the **scoping plan** that translates the inventory and the discoveries into concrete OpenSpec changes. They are the highest-leverage output of this document. Reference them when scoping any `add-trd-*` change.

---

## 13. Proposed capability decomposition

Each row maps to one OpenSpec change. Priority drives sequencing; v1 scope is intentionally tight (read-only-first per Playbook Pattern 3); follow-ups are named explicitly and become their own OpenSpec changes when scoped.

| # | Capability                          | Shape                              | v1 scope                                                            | Deferred to follow-up                                                            | OPS analogue                  | Reads from discovery        | Priority |
| - | ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------- | --------------------------- | -------- |
| 1 | `add-trd-clients`                   | Type-A master + Type-B detail      | List, search, detail with limits + balances + active flag           | Edit client, deactivate, invite to portal                                        | `add-ops-clients`             | trd-discovery §4            | 1        |
| 2 | `add-trd-quotes`                    | Type-A list + drawer + tabs        | List (Historial + Activos tabs) + filters + detail drawer + CSV export | All mutations (create, cancel, edit-notes); CCC creation; attachments         | `add-ops-financial-dashboard` | trd-discovery §5.1          | 2        |
| 3 | `add-trd-quote-create`              | Modal-only + multi-step wizard     | Single-leg quote creation, FX rate live, client limits display, BUY/SELL toggle | CCC creation (separate), attachments (separate), templates                | `add-ops-account-instructions` | trd-discovery §5.1          | 3        |
| 4 | `add-trd-quote-ccc`                 | Modal-only feature                 | 3-leg CCC quote creation, middle currency selection                | —                                                                                | (no analogue)                 | trd-discovery §5.1          | 4        |
| 5 | `add-trd-quote-attachments`         | Drawer-tab extension               | Upload (presigned URLs), list, edit, delete on quote detail drawer | Bulk download, virus scan, expiry policy                                          | (no analogue)                 | trd-discovery §5.1          | 5        |
| 6 | `add-trd-quote-cancel-edit`         | Modal action on detail drawer      | Cancel quote, edit notes / liquidate_date                          | Bulk cancel, history of edits                                                    | `add-ops-statements`          | trd-discovery §5.1          | 6        |
| 7 | `add-trd-proveedores`               | Type-A list + KPI cards + drawer + create modal | List + 2-card summary (server-side) + filters (Proveedor/Estado/Plazo/Período) + detail drawer + create new operation + ARS contravalor cards (REQ-35) | Edit operation, cancel, CSV import, multi-pair card support               | `add-ops-statements`          | trd-proveedores-de-liquidez | 7        |
| 8 | `add-trd-alertas`                   | Type-A list + drawer               | List price-trigger alerts + create via dynamic FieldConfig + toggle active | Bots integration                                                            | (no analogue, drawer pattern from `inbox`) | trd-discovery §5            | 8        |
| 9 | `add-trd-bots`                      | Placeholder (`soon: true`)         | Empty / soon page                                                  | Full bots module                                                                 | placeholder                   | trd-discovery §5.3          | 9        |
| 10 | `add-trd-rfq-lotes`                | Type-A + Módulo B shape            | Lotes list (GPS / PPS) + waterfall view + FUNDS_IN / FUNDS_OUT (with threshold) + suspend / activate + Crear / Cerrar lote | Pre-quote analytics dashboard                                                | `add-ops-psp`                 | prime-desk-rfq-gateway       | 10       |
| 11 | `add-trd-rfq-clientes-bps`         | Type-A + Type-B detail             | Clientes BPS + Grupos + BPS per price_line + max_open_exposure + current_open_exposure live | CSV export of BPS configuration                                              | `add-ops-clients`             | prime-desk-rfq-gateway       | 11       |
| 12 | `add-trd-notificaciones`           | Type-A list page                   | Centro de Notificaciones: tabs by source module (RFQ Gateway active; Quotes, Clientes "Pronto"), tarjetas with CTA + Marcar resuelta + Resolver todas | New tab integrations (Quotes, Clientes) per new alert types                  | (no analogue — closest is generic Alertas) | prime-desk-rfq-gateway §9   | 12       |
| 13 | `add-trd-home-exposicion`          | Type-A dashboard with KPI cards    | Exposición cards (calculated from Quotes + Proveedores + Bots), real-time + breakdown by currency | Per-platform breakdown, drill-down                                            | (no analogue)                 | trd-discovery §3, §6        | 13       |

**Priority notes:**

- **Priorities 1–8** translate existing legacy capabilities (the React app today). They are the "migration" proper.
- **Priorities 9–13** are NEW capabilities per the discoveries — they do NOT exist in the legacy. They depend on backend work (REQ-9, REQ-30, REQ-31, REQ-33) being delivered.
- **Priority 13 (Home Exposición)** depends on Priorities 2, 7, 9 being live so the data sources exist. It's the natural last v1 capability.
- **`add-trd-quote-create` (3)** depends on `add-trd-quotes` (2) having the surface to land into; ditto `quote-ccc`, `quote-attachments`, `quote-cancel-edit`. These are read-only-first deferrals per Pattern 3.

**Naming convention:** all capability slugs use kebab-case prefixed with `add-trd-`. Sub-capabilities of the same module use the dotted suffix pattern (`add-trd-quote-create`, `add-trd-quote-ccc`).

**Capability NOT translated:** the legacy `Operations/Operations.tsx` (383 LOC). Per the discoveries, the Mesa does not do operations between platforms (that's OPS's scope). The legacy module appears orphan; **decision: do not migrate, do not include in capability set**. Confirm with Facundo Vasques before deleting.

---

## 14. Open-set catalogs

Per Playbook Pattern 4 — every open-set vocabulary lives in a single config file from day one, never as hardcoded branches.

| Catalog                       | Legacy state                                  | Proposed target                                            | Where it lives                                       |
| ----------------------------- | --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| **Currencies**                | 6 hardcoded codes + custom (ARS, USD, EUR, USDC, USDT, BTC) | Catalog in `src/trd/quotes/currencies-catalog.ts`. Each entry: code, name, symbol, type (FIAT/CRYPTO/FUND), decimals, is_active. | `src/trd/quotes/currencies-catalog.ts`               |
| **Currency types**            | 3 hardcoded (FIAT, CRYPTO, FUND)              | Union literal type — small + closed by design              | `src/trd/quotes/currency-types.ts`                   |
| **Operation terms**           | 3 hardcoded (T0, T+1, T+2)                    | Catalog with business-day calc function per term            | `src/trd/quotes/term-catalog.ts`                     |
| **Quote statuses**            | 5 hardcoded (PENDING/ACCEPTED/PAID/COMPLETED/CANCELLED) | Union literal — closed set, but with `status-machine.ts` for transitions | `src/trd/quotes/status-machine.ts`            |
| **Liquidity statuses**        | 2 hardcoded (PENDING/RECEIVED)                | Union literal — closed                                      | `src/trd/proveedores/status-machine.ts`              |
| **Liquidity providers**       | API-sourced + 24h localStorage cache          | Stay API-sourced (per Proveedores discovery §5)             | `src/api/modules/liquidity.ts` + `useProviders` composable |
| **Empresas Ardua**            | 4 hardcoded constants (Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL) | **Open-set catalog from day one** per Pattern 4 — even though small, it can change with structural changes to the group. | `src/trd/proveedores/empresas-catalog.ts`            |
| **TRD roles (legacy)**        | 4 hardcoded (admin-trd, viewer-trd, ops-trd, quote-creator-trd) | Use template's `useCapabilities` pattern. Capabilities (not roles) are checked. | Template `useCapabilities` + `trd-capabilities.ts`   |
| **RFQ roles (target)**        | NOT in legacy. 2 introduced: MESA_TRADER, MESA_SUPERVISOR | Same pattern as TRD roles — capabilities, not role strings | Template `useCapabilities`                           |
| **GPS providers** (target)    | NOT in legacy. 1 hardcoded: ARDUA              | Catalog from day one — could expand if Ardua adds GPS variants | `src/trd/rfq/gps-providers-catalog.ts`              |
| **PPS providers** (target)    | NOT in legacy. 3 mentioned: BINANCE, BITSO, BYMA | Catalog from day one — Pattern 4 critical here              | `src/trd/rfq/pps-providers-catalog.ts`              |
| **Alert types (REQ-33)**      | NOT in legacy. 4 hardcoded: fondeo insuficiente / provider no disponible / alta utilización / alta tasa de rechazo | Catalog with display + severity + CTA template | `src/trd/notificaciones/alert-types-catalog.ts`     |
| **Notification source modules (REQ-33)** | NOT in legacy. 3 declared: RFQ Gateway (active), Quotes (pronto), Clientes (pronto) | Open-set catalog with `active: boolean` flag | `src/trd/notificaciones/source-modules-catalog.ts`  |

**Pattern 4 critical examples:** the PPS providers catalog will absolutely grow (more exchanges added). The empresas catalog could change (corporate restructure). The alert types catalog will grow as new modules connect to Notificaciones. **All of these MUST be open-set from day one.**

---

## 15. Open architectural decisions

These decisions MUST be resolved before the first `add-trd-*` change that touches them. Each decision should be reflected in the `design.md` of the affected change with a `Decision N — ...` block.

### Decision A — Two backends or one?

**Question:** The legacy splits Alerts + Bots into `VITE_TRADING_API_BASE_URL` (separate Lambda backend) vs everything else in `VITE_API_BASE_URL`. Do we maintain the split in the target, unify via gateway, or fold into a single client?

**Affected changes:** `add-trd-alertas`, `add-trd-bots`, `add-trd-rfq-lotes` (TBD if RFQ Gateway uses third backend).

**Options:**

- **Maintain split** — two axios instances, two `setAccessTokenGetter` calls, two `ApiError` types if errors diverge. Honest with the current reality.
- **Unify via gateway** — backend work, out of scope for frontend migration. Track as a separate Tecnología REQ.
- **Single client, multiple base URLs** — one axios instance with per-module base-URL config. Frontend-only, minimal cost.

**Recommendation (to validate with Facundo + Santiago Ahmed):** Single client with per-module base-URL config. Document the split as known debt; recommend Tecnología consolidate at the API layer in a separate initiative.

### Decision B — WebSocket: wire or defer?

**Question:** `VITE_WS_URL` is declared but unused. The target has multiple use cases for real-time data (Home Exposición, RFQ inbound feed, live FX rates). Do we wire `core-websocket-client` in v1 or defer?

**Affected changes:** `add-trd-home-exposicion` (priority 13), `add-trd-rfq-lotes` (priority 10).

**Recommendation:** Defer WebSocket wiring until `add-trd-rfq-lotes` lands. Home Exposición v1 can use `vue-query` polling (5-10s refetchInterval) — acceptable for a desk-internal app, simpler frontend story. Re-evaluate when RFQ goes live.

### Decision C — Admin BFF for TRD ↔ APE auth?

**Question:** Per `prime-desk-rfq-gateway-discovery.md` §2, there's a pending Admin BFF decision — REQ propio or fold into REQ-30. This is a backend-architecture decision but affects the frontend integration pattern.

**Affected changes:** `add-trd-rfq-lotes`, `add-trd-rfq-clientes-bps`.

**Recommendation:** This decision is HoP's per the discovery's §11. Resolve before scoping `add-trd-rfq-lotes`.

### Decision D — Centro de Notificaciones backend?

**Question:** REQ-33 has a v1 HTML prototype but **no backend exists**. Notifications are derived from RFQ Gateway state (lot funding, provider availability, rejection rate, utilization). Frontend can't migrate this until the backend contract exists.

**Affected changes:** `add-trd-notificaciones`.

**Recommendation:** Block `add-trd-notificaciones` until backend REQ is created (probably as part of REQ-30 or REQ-33 enrichment).

### Decision E — Tailwind 3 to Tailwind 4 token migration

**Question:** The legacy uses Tailwind 3 with HSL CSS vars + `tailwind.config.ts`. The target template uses Tailwind 4 with `@theme` mapping in `globals.css`. Direct port is not trivial.

**Affected changes:** all migrations consume `core-theming`.

**Recommendation:** First `add-trd-*` change (likely `add-trd-clients`) lands the TRD brand color in `src/styles/globals.css` (`--brand: 217 91% 60%` per CLAUDE.md). Subsequent changes inherit. No bulk token migration needed — the template's `core-theming` is the canonical surface.

### Decision F — Two Quote views in one tab structure: unify or keep split?

**Question:** Legacy has `HistoryQuotes` (historical, paginated) and `TodayQuotes` → `QuotesList` (active, status-filtered, CCC-grouped). They share data source but render distinct UX. In the target, do we keep two tabs or unify?

**Affected changes:** `add-trd-quotes`.

**Recommendation:** Keep two tabs per Pattern 1 (Type-A unification). The two views are conceptually different (chronological browse vs daily operational view); merging them loses signal. The target page is a Type-A with two tabs — one route `/quotes`, tabs `Activos` / `Historial`, URL-synced via `?tab=activos` or `?tab=historial` per Pattern E (URL sync) from the Playbook.

### Decision G — `Operations.tsx` — delete or migrate?

**Question:** Legacy has a 383-LOC `Operations.tsx` page. The TRD discovery (§2) explicitly states: "La Mesa no mueve fondos entre plataformas — ejecuta intercambios dentro de cada plataforma. Los movimientos entre cuentas son responsabilidad de OPS."

**Affected changes:** none (capability NOT in proposed decomposition §13).

**Recommendation:** Delete on migration. Confirm with Facundo Vasques first that no operational dependency exists. Document the deletion in the proposal that addresses the surrounding migration.

### Decision H — Quote lifecycle: PAID step

**Question:** The previous inventory said the Quote lifecycle was `PENDING → ACCEPTED → COMPLETED → CANCELLED`. The TRD discovery (§5.1) says it's `PENDING → ACCEPTED → PAID → COMPLETED → CANCELLED`. Which is correct?

**Affected changes:** `add-trd-quotes`, `add-trd-quote-cancel-edit`.

**Recommendation:** Read the legacy `quote.ts` types + `quotesApi.ts` PATCH transitions to confirm. Discovery is authoritative if there's conflict, but verify in case the legacy never implemented PAID.

---

## 16. Per-capability pre-flight scoping

Before opening `/opsx:propose add-trd-<capability>`, the PM (or AI agent doing scoping) MUST work through this checklist. Place the answers in the `proposal.md`'s context section or in the change's `design.md`.

### Pre-flight checklist

- [ ] **Discovery read.** Which discovery(ies) does this capability touch? Re-read them. Note any conflict with this inventory; **discovery wins**.
- [ ] **OPS analogue identified.** Which archived `add-ops-*` change is the closest worked example? Link to its `design.md`.
- [ ] **Canonical shape.** Type-A master / Type-B detail / Type-A with sub-module tabs (Módulo B) / Modal-only feature / Placeholder. Justify briefly.
- [ ] **Route surface.** Page · Modal · Drawer · combination. Refer to Pattern 5 from the Playbook.
- [ ] **v1 scope (read-only-first).** What goes in v1? Read-only first — what does the operator see, search, filter, drill into? Mutations are deferred unless trivial.
- [ ] **Deferred (named follow-ups).** Each deferred feature has a name like `extend-trd-<capability>-<feature>` (Pattern 3 OUT-of-scope discipline).
- [ ] **Cross-capability composition.** Does this change need a component from another capability? Identify (Pattern 6 — import, don't duplicate).
- [ ] **Open-set catalogs.** Does this capability introduce any of the catalogs in §14? Confirm they live in their proposed file from day one (Pattern 4).
- [ ] **Open architectural decisions touched.** Cross-reference §15 — does this capability touch Decision A, B, C, D, E, F, G, H? Resolve or document deferral in the `design.md` with a `Decision N` block.
- [ ] **3–5 QoL refinements.** Pick from the Playbook canon (Smart single-X default · localStorage persistence · Pre-submit preview card · Cancel during submit · URL sync · Re-open success toast · Inline field-level validation · Stackable alert area). Justify each in the change's `design.md`.
- [ ] **Test coverage target.** ≥90% on pure helpers and API modules. Component tests cover happy path + each discriminated error.
- [ ] **5 quality gates.** Confirm `npm run lint && type-check && test:run && spec:check && build:qa` all pass before opening PR.

### Pre-flight references

- Migration Playbook (the source of truth for patterns): `../_core-template-frontend/MIGRATION-PLAYBOOK.md`
- CLAUDE.md / AGENTS.md (project memory): `./CLAUDE.md` + `./AGENTS.md`
- OpenSpec specs: `./openspec/specs/`
- Archived OPS changes: `../ops/openspec/changes/archive/`
- This document (inventory + scoping): `./MIGRATION-NOTES.md`

---

## 17. Migration design decisions (overriding the legacy structure)

_Populated during OpenSpec design phase of each capability. Section 12 logs Decision N blocks per change; this section captures cross-capability decisions that affect the migration as a whole._

| # | Decision | Affects | Source |
|---|----------|---------|--------|
| _(populated as cross-capability decisions surface)_ | | | |

---

## Appendix — How this document is maintained

- **Inventory sections (1–11) update** when the legacy repo changes (`/Users/yasmani/projects/core-trd-frontend`). The `updated_at` frontmatter date reflects the last sync.
- **Scoping sections (13–17) update** as discoveries evolve and as `add-trd-*` changes archive. Each archived change should update §12 (decisions log) and §17 (cross-capability decisions) if applicable.
- **Sections 14 and 15 are NOT contracts** — they're scoping proposals. The contract is the spec of each archived capability.
- The document is read-only during a `add-trd-*` change's implementation. Updates happen between changes or in dedicated `chore(trd-notes): ...` commits.
