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

## Hard rule

Every capability lands as its own OpenSpec change: `proposal.md` + `design.md` + `tasks.md` + `specs/` deltas under `openspec/changes/<slug>/`, then archived under `openspec/changes/archive/YYYY-MM-DD-<slug>/`. **No production code without an active OpenSpec change** (`CLAUDE.md`, hard rule). Read the relevant discovery + OPS analogue + §16 pre-flight before opening any `/opsx:propose`.

## Workflow per capability

1. **Pre-flight** (MIGRATION-NOTES §16 checklist) → answers live in the change's `proposal.md` context section or `design.md`.
2. **`/opsx:propose <slug>`** → scaffold proposal/design/tasks/specs deltas.
3. **`/opsx:apply <slug>`** → walk the tasks checklist.
4. **Quality gates** (lint · type-check · test:run · spec:check · build:qa).
5. **PR** → reviewed → merged.
6. **`/opsx:archive <slug>`** → apply deltas + move to archive.
7. **Update this board** → flip status to `Archived`, link to archive folder, summarize what landed.

## Status legend

- `Not started` — no `openspec/changes/<slug>/` exists yet.
- `Pre-flight` — §16 checklist is being filled; no `/opsx:propose` yet.
- `Proposed` — `openspec/changes/<slug>/` exists with proposal/design/tasks/deltas; `/opsx:apply` not started.
- `Applying` — `/opsx:apply` in progress; tasks.md has partial checks.
- `Quality gates` — implementation complete; lint/type-check/test/spec/build running or fixing.
- `In review` — PR opened, awaiting review.
- `Archived` — `/opsx:archive` ran, change folder moved under `openspec/changes/archive/<date>-<slug>/`.

---

## Board

### Stage 0 — Pre-migration cleanup

| # | Slug | Status | Notes |
|---|------|--------|-------|
| 0.1 | `cleanup-trd-template-residuals` (chore commit) | **Applied** | Removed `ModuloA/B/C`, playground, demo blocks from sidebar/router. Unregistered the `framework.template.modulo_a` manifest from `plugins/manifests.ts` (kept the file as the canonical fixture of `validateManifest.spec.ts`, mirroring OPS). Set `--brand: 217 91% 60%` (TRD blue) in `src/styles/globals.css`. **Lesson learned:** structural cleanups with no spec-deltas do NOT pass `openspec validate --strict` (which requires at least one delta) → they ship as `chore(trd): ...` commits per CLAUDE.md's "trivial fixes" allowance, not as OpenSpec changes. Quality gates green (lint · type-check · test:run 458/458 · spec:check 18/18 · build:qa). |

### Stage 1 — Legacy capability parity (priorities 1–8 from §13)

| # | Slug | Shape | OPS analogue | Discovery | Status | Notes |
|---|------|-------|--------------|-----------|--------|-------|
| 1 | `add-trd-clients` | Type-A + Type-B detail | `add-ops-clients` | trd-discovery §4 | **Not started** | First capability. Sets the patterns (api modules, manifest engine usage, MSW seeds, drawer/detail) that the rest reuse. v1: list + search + detail with limits + balances + active flag. Deferred: edit/deactivate. |
| 2 | `add-trd-quotes` | Type-A + tabs Activos/Historial + drawer + CSV | `add-ops-financial-dashboard` | trd-discovery §5.1 | Not started | Read-only first per Pattern 3. v1: list + filters + detail drawer + CSV export. Two tabs URL-synced (`?tab=activos\|historial`). Deferred: every mutation (split into 3, 5, 6). |
| 3 | `add-trd-quote-create` | Modal multi-step wizard | `add-ops-account-instructions` | trd-discovery §5.1 | Not started | Single-leg OTC quote creation. FX rate live, client limits display, BUY/SELL toggle. Deferred: CCC, attachments, templates. |
| 4 | `add-trd-quote-ccc` | Modal | — | trd-discovery §5.1 | Not started | 3-leg Crypto-to-Crypto-to-Crypto quote. Middle currency selection. |
| 5 | `add-trd-quote-attachments` | Drawer-tab extension | — | trd-discovery §5.1 | Not started | Upload (presigned URLs) + list + edit + delete on the quote drawer. Deferred: bulk download, virus scan. |
| 6 | `add-trd-quote-cancel-edit` | Modal action on detail drawer | `add-ops-statements` | trd-discovery §5.1 | Not started | Cancel + edit notes / liquidate_date. Confirmation dialog (`ardua-add-confirm-dialog` skill). |
| 7 | `add-trd-proveedores` | Type-A list + KPI cards + drawer + create modal | `add-ops-statements` | trd-proveedores-de-liquidez | Not started | Liquidity ops: list + 2-card summary + filters + drawer + create new operation + ARS contravalor cards (REQ-35). Standardize on `vue-query` (legacy `useLiquidity` does NOT use it). |
| 8 | `add-trd-alertas` | Type-A list + drawer | (drawer pattern from Inbox) | trd-discovery §5 | Not started | Price-trigger alerts (NOT REQ-33 notificaciones). List + create via dynamic FieldConfig + toggle active. Uses the cross-cutting `/alertas` route per `core-modulo-genericos` (decide in pre-flight whether to specialize content or add a TRD-specific page). |

### Stage 2 — Placeholder

| # | Slug | Status | Notes |
|---|------|--------|-------|
| 2.1 | `add-trd-bots-placeholder` | Not started | Sidebar entry with `soon: true` + page that renders `<ModuloSoon>`. No backend wiring. |

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
- **2026-05-26 — session 2:** Applied the cleanup. Deleted `pages/ModuloA/B/C.vue` + `pages/playground/`, cleaned `router/routes.ts`, `config/routes.ts`, `components/layout/Sidebar.vue` (blocks = [], no devBlocks, trimmed icon imports), unregistered `framework.template.modulo_a` from `plugins/manifests.ts`, and switched `--brand` from OPS red to TRD blue. The intended OpenSpec wrapper (`cleanup-trd-template-residuals`) was discarded because `openspec validate --strict` requires at least one spec delta and this work touched none — reframed as a chore commit per CLAUDE.md. **Working tree is at "ready-to-commit" state**; nothing committed yet (per the Git Policy: only Yasmani commits). All 5 quality gates green. Next: review the diff + `chore(trd): remove template residuals and align brand to TRD blue` + start pre-flight (§16) for `add-trd-clients`. |
