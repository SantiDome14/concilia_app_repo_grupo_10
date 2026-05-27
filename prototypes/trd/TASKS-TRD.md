---
title: TRD prototype — migration tasks board
status: active
created_at: 2026-05-26
updated_at: 2026-05-26
owner: Yasmani Rodríguez (PM)
scope: bring `prototypes/trd/` to feature parity with the productive `core-trd-frontend` (React 18 + TS). The product/design refinement layer follows AFTER parity is reached.
companion_docs:
  - ./MIGRATION-NOTES.md  # technical inventory + capability decomposition + open decisions
  - ../_core-template-frontend/MIGRATION-PLAYBOOK.md  # cross-prototype patterns
  - ../../discoveries/trd-discovery.md
  - ../../discoveries/trd-proveedores-de-liquidez-discovery.md
---

# TRD prototype — migration tasks board

> **What this is.** The persistent state register for the TRD migration across sessions. Read this first when resuming work. Update it as soon as a capability changes status — do not batch updates.
>
> **What this is NOT.** A spec, a contract, or a substitute for OpenSpec. The contracts live in `openspec/specs/`. The artifacts of in-flight changes live in `openspec/changes/`. This file just tracks state and decisions across sessions.

---

## Scope (locked for v1 parity)

- **Migrate only what exists in the productive `core-trd-frontend`** — priorities 1–8 of `MIGRATION-NOTES.md` §13.
- **Bots** stays as `soon: true` placeholder per §13 priority 9.
- **OUT of scope for v1 parity** (deferred to a separate post-parity initiative):
  - `add-trd-rfq-lotes` (REQ-9, target only — no React legacy)
  - `add-trd-rfq-clientes-bps` (REQ-9, target only)
  - `add-trd-notificaciones` (REQ-33, target only — no backend yet)
  - `add-trd-home-exposicion` (depends on the three above)
  - Product/design refinement layer (after parity is achieved)
- **`Operations.tsx` (legacy)** — explicit non-goal per Decision G (§15). Not migrated.

## Workflow during the migration (OpenSpec paused as of 2026-05-26)

**Decision (Yasmani, session 5):** Stage 0 and Stage 1 row #1 (`add-trd-clients`) shipped via full OpenSpec workflow — proposal + design + tasks + spec + archive. After applying `add-trd-clients`, the time-cost of the ceremony (~40–45 min per capability of pure writing, plus mid-flight spec drift fixes) was deemed too high relative to the migration's velocity goal. **For the rest of Stage 1 (capabilities #2–#8), OpenSpec is skipped.** The `CLAUDE.md` "hard rule" is the framework owner's own rule and is paused unilaterally for this migration phase.

What this means in practice:

- **No `openspec/changes/<slug>/`** created for `add-trd-quotes`, `add-trd-quote-create`, `add-trd-quote-ccc`, `add-trd-quote-attachments`, `add-trd-quote-cancel-edit`, `add-trd-proveedores`, `add-trd-alertas`, `add-trd-bots-placeholder`.
- **No `openspec/specs/<capability>/`** created at archive time.
- **`MIGRATION-NOTES.md` remains the primary scoping reference** (§13 capability decomposition, §14 catalogs, §15 open decisions, §16 pre-flight checklist).
- **Key architectural decisions land as comments inline** (file-level banner in the page / api module / composable that owns the decision), NOT in a design.md. The reader of the code in 6 months learns the why from the code itself.
- **Commits use the same Conventional Commits style** (`feat(trd/<module>): ...`).
- **Quality gates still mandatory** (lint · type-check · test:run · spec:check · build:qa). `spec:check` still validates the existing `trd-clients` capability and the cross-cutting `core-*` capabilities — they remain authoritative for everything that already shipped.

Re-evaluation cadence: at the end of Stage 1, decide whether to (a) resume OpenSpec for Stage 2+ stages, (b) backfill specs for capabilities #2–#8 in a single retroactive change, or (c) keep skipping. Decision criteria: did the migration close meaningfully faster? did we lose any architectural clarity worth re-introducing?

## Workflow per capability (post-OpenSpec-pause)

1. **Pre-flight** — read the relevant discovery + MIGRATION-NOTES §13 row + §16 checklist. Ask 1–3 alignment questions if the row leaves real ambiguity; otherwise default to the §13 v1 scope.
2. **Implement** — bottom-up: types → endpoints → API module → MSW seed + handler → composables → page(s) → routing + sidebar → tests.
3. **Quality gates** — all 5 must pass.
4. **Commit** — feat(trd/<module>): ... with a body summarizing what landed and any architectural call made.
5. **Update this board** — flip status to `Shipped`, add a session log entry.

## Status legend (post-OpenSpec-pause)

- `Not started` — no implementation work begun.
- `In progress` — code is landing.
- `Quality gates` — implementation complete; gates running or being fixed.
- `Shipped` — committed + pushed; all 5 quality gates green.
- `Archived` (legacy, Stage 0 + capability #1 only) — `/opsx:archive` ran, change folder moved under `openspec/changes/archive/<date>-<slug>/`.

---

## Board

### Stage 0 — Pre-migration cleanup

| # | Slug | Status | Notes |
|---|------|--------|-------|
| 0.1 | `cleanup-trd-template-residuals` (chore commit) | **Applied** | Removed `ModuloA/B/C`, playground, demo blocks from sidebar/router. Unregistered the `framework.template.modulo_a` manifest from `plugins/manifests.ts` (kept the file as the canonical fixture of `validateManifest.spec.ts`, mirroring OPS). Set `--brand: 217 91% 60%` (TRD blue) in `src/styles/globals.css`. **Lesson learned:** structural cleanups with no spec-deltas do NOT pass `openspec validate --strict` (which requires at least one delta) → they ship as `chore(trd): ...` commits per CLAUDE.md's "trivial fixes" allowance, not as OpenSpec changes. Quality gates green (lint · type-check · test:run 458/458 · spec:check 18/18 · build:qa). |

### Stage 1 — Legacy capability parity (priorities 1–8 from §13)

| # | Slug | Shape | OPS analogue | Discovery | Status | Notes |
|---|------|-------|--------------|-----------|--------|-------|
| 1 | `add-trd-clients` | Type-A + Type-B detail | `add-ops-clients` | trd-discovery §4 | **Archived** | First capability shipped. v1 = list + search + detail with limits + balances + active flag. 6 architectural decisions (T1–T6). MSW seed (32 clients) + handler + new `usePersistedPageSize` composable + Catálogos sidebar block. Archive: `openspec/changes/archive/2026-05-26-add-trd-clients/`. Active spec: `openspec/specs/trd-clients/`. 5 quality gates green (492/492 tests, 19/19 specs). |
| 2 | `add-trd-quotes` | Type-A + tabs Activos/Historial + drawer | `add-ops-financial-dashboard` | trd-discovery §5.1 | **Shipped** | v1 read-only: list + tabs Activos/Historial URL-synced + filters (search OR-q, status, date range) + drawer with QuoteSummary + Timeline (activity log). 40-quote seed covering all statuses + activities seed. New sidebar block `Mesa de Dinero`. Shipped without OpenSpec (workflow paused per session 5 decision). Decision H resolved: PENDING/ACCEPTED/COMPLETED/CANCELLED (legacy parity, no PAID). CSV export deferred to `extend-trd-quotes-csv`. |
| 3 | `add-trd-quote-create` | Modal (single-step v1) | `add-ops-account-instructions` | trd-discovery §5.1 | **Shipped** | v1 lean: single-step modal con vee-validate+zod. Cliente (select de activos), operation BUY/SELL, par de monedas (CURRENCIES_CATALOG open-set §14), monto origen + tipo de cambio, contravalor live-calculated, term T0/T+1/T+2, notes y liquidate_date opcionales. POST /quotes con auto-generación de activity event PENDING. CTA "Nueva cotización" en L1 header. **Diferidos**: `extend-trd-quote-create-fx-live` (endpoint /fx-rate multi-provider), `extend-trd-quote-create-limits` (display de límites cliente), `extend-trd-quote-create-multi-step` (wizard 3-step), `extend-trd-quote-create-bidirectional` (calc bidireccional), DUPLICATE_ERROR handling. |
| 4 | `add-trd-quote-ccc` | Modal | — | trd-discovery §5.1 | Not started | 3-leg Crypto-to-Crypto-to-Crypto quote. Middle currency selection. |
| 5 | `add-trd-quote-attachments` | Drawer section (metadata-only) | — | trd-discovery §5.1 | **Shipped** | v1 metadata-only: section debajo del summary del QuoteDrawer con list + add + edit (solo comment) + delete (destructive). MSW handlers full CRUD + auto-activity events (Adjunto agregado/eliminado). Add/edit/delete CTAs ocultos cuando status es terminal (canMutate). **Diferido**: `extend-trd-quote-attachments-upload` (flow presigned URLs vía useFileUpload), `extend-trd-quote-attachments-rename` (filename), `extend-trd-quote-attachments-bulk-download`. |
| 6 | `add-trd-quote-cancel-edit` | Modal action on detail drawer | `add-ops-statements` | trd-discovery §5.1 | **Shipped** | Cancel (destructive confirmation, danger-styled) + Edit notes/liquidate_date (vee-validate+zod modal). Primary-actions slot del QuoteDrawer surfacea ambos cuando status ∈ {PENDING, ACCEPTED}; oculto en estados terminales. Optimistic updates patchea tanto el cache de detail como las listas paginadas. Handler MSW agrega activity events automáticos al timeline en cada PATCH. |
| 7 | `add-trd-proveedores` | Type-A list + KPI cards + drawer | `add-ops-statements` | trd-proveedores-de-liquidez | **Shipped** | Read-only v1: 2 KPI cards (Operaciones + Volumen USD with REQ-35 ARS contravalor when filter narrows to single non-USD-quote pair), filters (Período/Proveedor/Estado/Plazo), table, drawer with summary + Timeline. Server-side summary computation in MSW handler (excludes CANCELLED from USD totals). 28 ops seed + 4 providers across 3 currency pairs. Sidebar entry under Mesa de Dinero (Yasmani session 6 confirmed). Create / mutations deferred to `add-trd-proveedores-create`. |
| 8 | `add-trd-insights` (originally `add-trd-alertas`) | Type-A list + tabs (extensible) | (no analogue) | trd-discovery §5 | **Shipped** | Reframed from "Alertas" to **Insights** (Yasmani session 7) — broader awareness surface for the trader. v1 = first tab "Alertas de precio" with full CRUD (create modal with vee-validate+zod, optimistic toggle, destructive confirmation for delete). Tabs `Eventos de mercado` and `Noticias` ship as `<SoonTab>` placeholders. URL-synced (`?tab=alertas-precio\|eventos\|noticias`). Route `/insights` under Catálogos block. Decision A (multi-backend) documented as deuda — implementation uses single apiClient + MSW. |

### Stage 2 — Placeholder

| # | Slug | Status | Notes |
|---|------|--------|-------|
| 2.1 | `add-trd-bots-placeholder` | **Shipped** | Sidebar entry under Catálogos (`Bots`, icon Bot, soon: true), route `/bots` → `<ModuloSoon>`. No backend wiring. |
| 2.2 | `add-trd-lots-placeholder` | **Shipped** | Sidebar entry under Catálogos (`Lotes`, icon Package, soon: true), route `/lots` → `<ModuloSoon>`. Placeholder para futuro prototipado de Lotes del RFQ Gateway (REQ-9). Naming: ruta en inglés (`/lots`), label user-facing en español (`Lotes`) per CLAUDE.md. |

### Stage 3 — Product/design refinement layer (out of scope for parity)

Begins ONLY once Stages 0–2 are archived. Will be scoped as a separate batch of OpenSpec changes (`refine-trd-*`). Items will include: drill-down surfaces (drawer vs modal vs page audit), QoL refinements per the Playbook canon, accessibility audit, brand polish, etc.

### Stage 4 — Discoveries-driven new capabilities (out of scope for parity, blocked)

Capability priorities 9–13 from §13. Each is blocked on a specific gate documented in `MIGRATION-NOTES.md §15`:

- `add-trd-rfq-lotes` — Decision C (Admin BFF) + REQ-9 backend.
- `add-trd-rfq-clientes-bps` — same as above.
- `add-trd-notificaciones` — Decision D (no backend yet).
- `add-trd-home-exposicion` — depends on the three above + Decision B (WebSocket: wire or defer).

---

## Open architectural decisions (from MIGRATION-NOTES §15)

Decisions that MUST be resolved before the first change that touches them:

| ID | Touches first | Status | Resolution notes |
|----|---------------|--------|-------------------|
| A — Two backends or one? | `add-trd-alertas` (priority 8 in this plan) | **Pending** | Recommendation: single client, per-module base-URL. Validate with Facundo + Santiago Ahmed. |
| B — WebSocket: wire or defer? | (only Stage 4) | **Deferred** | Not blocking Stages 0–2. |
| C — Admin BFF for TRD ↔ APE auth? | (only Stage 4) | **Deferred** | HoP decision per discovery §11. |
| D — Centro de Notificaciones backend? | (only Stage 4) | **Blocked** | No backend exists. |
| E — Tailwind 3 → 4 token migration | `cleanup-trd-template-residuals` (`--brand` token) | **Pending** | Set `--brand: 217 91% 60%` (TRD blue) in cleanup. No bulk token migration. |
| F — Two Quote views: unify or keep split? | `add-trd-quotes` | **Pending** | Recommendation: keep two tabs with URL sync (`?tab=activos\|historial`). Decide in design.md. |
| G — `Operations.tsx`: delete or migrate? | (none — capability NOT in plan) | **Resolved (deferred deletion)** | Do not migrate. Confirm with Facundo Vasques before deletion in legacy repo. |
| H — Quote lifecycle: PAID step? | `add-trd-quotes`, `add-trd-quote-cancel-edit` | **Pending** | Verify against legacy `quote.ts` + PATCH transitions. Discovery says `PENDING → ACCEPTED → PAID → COMPLETED → CANCELLED`. |

---

## Session log

> Append a short entry after each session. Keep it factual: what status flipped, which decisions resolved, which capability is next.

- **2026-05-26 — session 1:** Created this board. Confirmed scope (priorities 1–8 + Bots placeholder). Next: propose `cleanup-trd-template-residuals` (artifacts staged, awaiting `/opsx:apply` and Yasmani's review).
- **2026-05-26 — session 2:** Applied the cleanup. Deleted `pages/ModuloA/B/C.vue` + `pages/playground/`, cleaned `router/routes.ts`, `config/routes.ts`, `components/layout/Sidebar.vue` (blocks = [], no devBlocks, trimmed icon imports), unregistered `framework.template.modulo_a` from `plugins/manifests.ts`, and switched `--brand` from OPS red to TRD blue. The intended OpenSpec wrapper (`cleanup-trd-template-residuals`) was discarded because `openspec validate --strict` requires at least one spec delta and this work touched none — reframed as a chore commit per CLAUDE.md. **Working tree is at "ready-to-commit" state**; nothing committed yet (per the Git Policy: only Yasmani commits). All 5 quality gates green. Next: review the diff + `chore(trd): remove template residuals and align brand to TRD blue` + start pre-flight (§16) for `add-trd-clients`.
- **2026-05-26 — session 3:** Committed and pushed Stage 0 (commit `f66f2d8`). Drafted the four OpenSpec artifacts of `add-trd-clients` under `openspec/changes/add-trd-clients/`: `proposal.md` (105 LOC), `design.md` (6 decisions T1–T6, master+detail pages, single-query OR search, `/clients/:id` endpoint, sidebar block `Catálogos`, no manifest in v1, page-size 10/25/50/100), `tasks.md` (14 sections, bottom-up implementation walk), `specs/trd-clients/spec.md` (13 Requirements with Gherkin scenarios). `npx openspec validate --all --strict` → 19/19 passed including `change/add-trd-clients`. Stage 1 row #1 flipped to `Proposed`. Next: review the artifacts; on approval `/opsx:apply add-trd-clients` to start implementation.
- **2026-05-27 — session 11:** Shipped `add-trd-quote-attachments` (priority 5) — metadata-only flow. QuoteAttachment type, 4 CRUD endpoints, MSW handlers con auto-activity events ("Adjunto agregado/eliminado"). Composable `useQuoteAttachments` con optimistic patterns. UI: `QuoteAttachmentsSection.vue` (list + add CTA + per-item edit/delete), `AddAttachmentDialog.vue` (file picker + comment, NO upload de bytes), `EditAttachmentDialog.vue` (solo comment), `DeleteAttachmentConfirm.vue` (destructive). Wire en QuoteDrawer entre summary y timeline. CTAs ocultos en estados terminales. Pragmatic call: skippeé la flow canónica de presigned URLs via `useFileUpload` (3-phase) — diferido a `extend-trd-quote-attachments-upload`. 8 tests nuevos (7 api + 1 page); 566/566 total. **Solo queda quote-ccc (priority 4)** para cerrar Stage 1.

- **2026-05-26 — session 10:** Shipped `add-trd-quote-create` (priority 3) — la capacidad más pesada que quedaba de Stage 1. Lean v1 single-step modal en lugar del legacy 3-step wizard 3,048 LOC. Open-set catalog `CURRENCIES_CATALOG` creado per §14 (6 currencies, type FIAT/CRYPTO/FUND). Contravalor live-calculated `origin × rate`. CTA "Nueva cotización" en L1 header. Defer documentados: FX live, client limits display, multi-step, bidirectional calc, DUPLICATE_ERROR. POST handler MSW genera id sequential + activity PENDING. Composable `useCreateQuote` invalida lista al settle. 6 nuevos tests (3 api + 3 page); 558/558 total. Stage 1 row 3 → Shipped. Sólo queda quote-ccc (priority 4) y quote-attachments (priority 5).

- **2026-05-26 — session 9:** Shipped `add-trd-quote-cancel-edit` (priority 6) — primer subset de mutaciones de Quotes. PATCH /quotes/:id en MSW handler con auto-generación de activity events al timeline en cada cambio. Composable `useUpdateQuote` + `useCancelQuote` con optimistic update propagado a TODOS los caches paginados de la lista (no solo al detail) — patrón nuevo introducido. `CancelQuoteConfirm.vue` (destructive) y `EditQuoteModal.vue` (vee-validate + zod, notes + liquidate_date). Slot `primary-actions` del QuoteDrawer surface las acciones solo cuando status ∈ {PENDING, ACCEPTED}. 7 tests nuevos (5 api + 2 page); 553/553 total. Stage 1 row 6 → Shipped.

- **2026-05-26 — session 8:** Shipped two Stage 2 placeholders: `Bots` (anticipa el módulo de bots automatizados existente en legacy pero deferido) y `Lotes` (anticipa el prototipado de lotes del RFQ Gateway, REQ-9). Ambos bajo Catálogos con `soon: true`. `ModuloSoon.vue` reusable, copia del patrón FIN. Naming convention reforzada: ruta en inglés (`/lots`), label en español (`Lotes`). También cambio cosmético: icono de Proveedores de `Building2` → `ArrowDownUp` (entrada/salida — fiel a la transacción, no a la entidad-broker). 546/546 tests, 5 gates green. Stage 1 cerrado salvo las mutaciones de Quotes (priorities 3-6 quedan pendientes).

- **2026-05-26 — session 7:** Reframe + ship: legacy `/alerts` migra como **Insights** (no como "Alertas") tras conversación con Yasmani — el price-trigger CRUD es una pieza de un surface más amplio (Insights = lo que la Mesa necesita saber del mercado: alertas configuradas, eventos macro, noticias). Página `Insights.vue` con tabs URL-synced (`alertas-precio` activo, `eventos` + `noticias` como `<SoonTab>` placeholders). Primer módulo con mutaciones (create + toggle + delete) — establece el patrón optimistic-update + rollback + invalidate del CLAUDE.md, plus create modal con vee-validate+zod (primer form del prototipo TRD). 15 new tests (7 api + 8 page); 546/546 total. Quality gates all green. Decision A documentada como deuda en `MIGRATION-NOTES.md` next pass. Pivote intra-sesión: empecé como `add-trd-price-alerts`, terminé como `add-trd-insights` por conversación con Yasmani — costo bajo (~30 min de refactor) por timing temprano. Stage 1 row 8 → Shipped. Next: Stage 2 placeholder (Bots en Catálogos), o priorities 3-6 (mutaciones de quotes).

- **2026-05-26 — session 6:** Sidebar reorganization decision (Yasmani): Proveedores → Mesa de Dinero (transactions, not maestros); Bots → Catálogos. Shipped `add-trd-proveedores` end-to-end: 2 KPI cards (Operaciones / Volumen USD + REQ-35 ARS contravalor), filters Período/Proveedor/Estado/Plazo, table, LiquidityDrawer with Summary + Timeline. Server-side summary computation in MSW handler — REQ-1 §3 honored (cards + table recompute together). REQ-35 surfaces only when the filter resolves to a single non-USD-quote pair (verified in `kpi-secondary-badge` test). Standardized on vue-query (legacy `useLiquidity` did NOT use it — gap closed). 19 new tests (12 api + 7 page); 531/531 total. All 5 quality gates green in single pass. Next: `add-trd-alertas` (priority 8).

- **2026-05-26 — session 5:** OpenSpec workflow paused for the rest of Stage 1. Decision recorded in the "Workflow during the migration" section above. Then shipped `add-trd-quotes` end-to-end without OpenSpec artifacts: `src/types/quote.ts` (legacy lifecycle resolved Decision H — no PAID), `src/api/modules/quotes.ts` + endpoints, MSW seed (40 quotes covering all statuses + activities) + handler (tab/status/clientId/dateRange/q filters), `useQuotes.ts` composables (`useQuotesList`, `useQuote`, `useQuoteActivities`), `Quotes.vue` master page (tabs Activos/Historial URL-synced, L3 filters, table, drawer-trigger row click), `QuoteDrawer.vue` + `QuoteSummary.vue` (Drawer + Timeline integration), new `Mesa de Dinero` sidebar block. 20 new tests (13 api + 7 page); 512/512 total. All 5 quality gates green in single pass. **Time vs `add-trd-clients`**: noticeably faster (~50% less wall-clock) — mostly amortization of MSW/vue-query/test patterns. The OpenSpec ceremony skip contributed but isn't the dominant gain. Next: `add-trd-proveedores` (priority 7) — Liquidity operations module.

- **2026-05-26 — session 4:** Applied `add-trd-clients` end-to-end. Created `src/types/client.ts`, `src/api/modules/clients.ts` + endpoints, MSW seed (32 fixtures, 5 inactive, mix of with/without limits/balances) + handler (q OR-filter, `?fault=on` for 5xx injection), 4 composables (`useClientsList`, `useClient`, `useClientLimits`, `useClientBalances`, `usePersistedPageSize`), `Clients.vue` master page (L1+L3, search debounced 300ms, URL-synced, TablePagination, EmptyState, Skeleton), `ClientDetail.vue` detail page + 3 sub-cards under `src/trd/clients/` (Info, Limits, Balances — each error- and empty-state in isolation), routing + sidebar Catálogos block. 33 new tests (14 api + 7 Clients + 6 ClientDetail + 7 usePersistedPageSize) covering happy paths + 404 + 5xx retry. Spec edited mid-flight to match the template's `PaginatedResponse` envelope shape and the new-not-existing composable note (workflow: pause + update artifacts on design drift). Pre-existing flakiness in `Inbox`/`Alertas` tests surfaces under load (the new tests use `vi.waitFor` instead of fixed `flushPromises` counts; future cleanup change should apply the same pattern there). All 5 quality gates green (492/492 tests, 19/19 specs). Archived as `openspec/changes/archive/2026-05-26-add-trd-clients/`; active spec at `openspec/specs/trd-clients/`. Stage 1 row #1 → Archived. Next: review the diff + commit + start pre-flight for `add-trd-quotes` (priority 2).
