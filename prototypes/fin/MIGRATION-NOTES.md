---
status: active reference — read alongside MIGRATION-PLAYBOOK.md
created_at: 2026-05-18
source: fin scaffold from `migrate-fin-prototype` (archived 2026-04-30) + alignment via `align-fin-prototype-to-playbook` (2026-05-18)
applies_to: prototypes/fin/
---

# FIN — Per-prototype migration inventory

> **What this is.** The per-prototype legacy inventory + decisions for `prototypes/fin/`. The cross-prototype patterns live in `prototypes/_core-template-frontend/MIGRATION-PLAYBOOK.md`; this file is the FIN-specific layer.
>
> **What this is NOT.** A spec. Contracts live in `openspec/specs/`. A substitute for the playbook — when a pattern in this file conflicts with the playbook, the playbook wins. Authorization to write code without an OpenSpec change — the hard rule in `CLAUDE.md` / `AGENTS.md` applies.
>
> **Sources of truth for product behavior** are the Jira REQs that scope each module (e.g. `REQ-50` for Disponibilidades) and the discoveries at `discovery/fin-discovery.md` if present.

---

## 1. Legacy inventory

The legacy `prototypes/fin-old/fin-prototype.html` was a single-HTML monolith (~17 kLOC of inline HTML + JS + Tailwind utility soup) that prototyped the FIN dashboards before product structure was scoped. Its full inventory lives in the archived `migrate-fin-prototype` change.

**See:** `prototypes/fin/openspec/changes/archive/2026-04-30-migrate-fin-prototype/` for:

- `proposal.md` — full migration scope.
- `design.md` — decisions made when porting the monolith into the template-shaped scaffold.
- `tasks.md` — what was implemented.
- `specs/<capability>/spec.md` — the frozen Requirements added or modified by the migration.

This MIGRATION-NOTES does NOT re-export that inventory. It captures the deltas that have accumulated **since** that archive.

## 2. Decisions accumulated (canonical FIN choices)

These are the decisions that frame the current state of `prototypes/fin/` regardless of any single change:

| # | Decision | Locked by |
| --- | --- | --- |
| 1 | FIN brand color: `--brand: 142 71% 45%` (canonical FIN green) | `core-theming/spec.md` + `src/styles/globals.css` |
| 2 | Active modules in Back Office bloque: **Movimientos** + **Cotizaciones** + placeholder Compras | `src/router/routes.ts` + Sidebar.vue |
| 3 | Active module in Tesorería bloque: **Disponibilidades** (the page, NOT "Tesorería") + placeholders Cobros / Pagos / Deudas / Préstamos / Inversiones / Monedas | Same |
| 4 | Active module in Contabilidad bloque: placeholders Plan de Cuentas / Parametrizaciones / Libro Diario (no active modules yet) | Same |
| 5 | Placeholder modules render `<ModuloSoon>` (in `src/pages/ModuloSoon.vue`) with `meta.soon = true` in their route | `src/router/routes.ts` |
| 6 | FIN does NOT ship `src/components/inbox/` — the Inbox page reuses generic components from the template adequately | Audited 2026-05-18; documented here |
| 7 | The four cross-cutting standard modules (Dashboard / Inbox / Alertas / Reportes) live at the top of the Sidebar, ungrouped, in this exact order | `core-modulo-genericos/spec.md` + Sidebar.vue |
| 8 | Manifest engine registers seven manifests at boot: 3 cross-cutting (Inbox / Alertas / Reportes) + 4 FIN-domain (Movimientos / Cotizaciones / Tesorería / Tesorería · Cola de Asignación) | `src/plugins/manifests.ts` — pending re-scope in `add-fin-disponibilidades` |

## 3. Deltas vs template (post-scaffold, this change `align-fin-prototype-to-playbook`)

Two playbook patterns canonised on 2026-05-08 (after `migrate-fin-prototype` archived) became deltas to apply on fin:

### 3.1 Pattern #13 — Sidebar z-index ladder above modal overlay

`src/components/layout/Sidebar.vue`:

- `<nav>` element: `z-50` → `z-[600]`.
- Collapse-toggle button: `z-[51]` → `z-[601]`.
- Account-menu `<div>`: unchanged at `z-[200]`.

**Why:** the operator MUST be able to click any Sidebar entry to navigate to a different module while a centred Dialog or right-side Sheet is open. Reported as a real bug on OPS 2026-05-08 ("no puedo navegar"); the fix was canonised in the playbook and now exists as Requirement in `core-navigation/spec.md`.

### 3.2 Pattern #16 — Top-level RouterView keyed by `route.name`

`src/App.vue`:

- Add `useRoute` to the vue-router import.
- Add `const route = useRoute();` inside `<script setup>` with a comment explaining the rationale.
- Replace `<RouterView />` with `<RouterView v-slot="{ Component }"><component :is="Component" :key="String(route.name ?? route.path)" /></RouterView>`.

**Why:** without the keyed wrapper, route changes do not force a clean unmount-then-mount cycle. Teleported portals, pending async fetches, HMR-stale instances and `watch`-driven `router.replace` calls can leak past the navigation and visually persist over the new route. Reported as a real bug on OPS 2026-05-08 ("el main sigue mostrando X"); the fix was canonised in the playbook and now exists as Requirement in `core-layout/spec.md`.

### 3.3 MIGRATION-NOTES.md creation

This file. Authored as part of `align-fin-prototype-to-playbook`.

### 3.4 Documentation Hierarchy in CLAUDE.md + AGENTS.md

The template canonical hierarchy is **four layers** (Contracts / Project Memory / Migration Playbook / Skills). Prior to this change fin declared three layers (omitting the Migration Playbook layer). Updated in this change to match the template canon, keeping `CLAUDE.md` and `AGENTS.md` byte-identical.

## 4. Pre-existing drift (NOT addressed by this change, follow-up needed)

The audit on 2026-05-18 surfaced one pre-existing drift not in scope here:

- `prototypes/fin/openspec/specs/core-layout/spec.md` has 210 lines vs the template canon's 302 lines. The template added Requirements after `migrate-fin-prototype` archived (notably around carousels and additional structural patterns) that have not been replicated in fin. **Out of scope for this change** because the absent Requirements are about features fin does not yet implement; replicating them as "ADDED Requirements in the spec without supporting code" would create gates that fail validation against a real app.

**Follow-up:** when fin needs the absent features (Carousel, etc.) or when a future cross-prototype sync change runs, that drift gets closed.

## 5. Open follow-ups

These are the next moves for fin's evolution. Each is its own OpenSpec change against its own Jira REQ when scoped:

| Follow-up | Trigger |
| --- | --- |
| `add-fin-disponibilidades` | REQ-50 (this change is the prerequisite) — implement Disponibilidades the way REQ-50 describes (3 sub-tabs Posición / Bancos-Cuentas / Movimientos, drill-down, supervisión local, etc.). |
| `add-fin-cobros` | When the Cobros module is scoped (currently a `<ModuloSoon>` placeholder). |
| `add-fin-pagos` | Same — Pagos placeholder. |
| `add-fin-deudas-prestamos` | Same — Deudas/Préstamos placeholder. |
| `add-fin-inversiones` | Same — Inversiones placeholder. |
| `add-fin-monedas` | Same — Monedas placeholder. |
| `add-fin-plan-cuentas` | When FIN.Contabilidad is scoped. |
| `add-fin-parametrizaciones` | Same. |
| `add-fin-libro-diario` | Same. |
| `extend-fin-disponibilidades-asientos-contables` | When the Motor Contable is built and `fin.disponibilidades.bancos_cuentas.configurar_contable` can validate against a real plan de cuentas. |
| `sync-core-layout-spec-replica` (or part of a cross-prototype sync) | To close the pre-existing drift documented in §4. |

## 6. Reference: archived FIN changes

Located at `prototypes/fin/openspec/changes/archive/`:

| Date | Change | Notes |
| --- | --- | --- |
| 2026-04-22 | `scaffold-core-template-frontend` | Initial template scaffold. |
| 2026-04-22 | `strengthen-core-ui-patterns` | Core UI patterns sharpened pre-derivation. |
| 2026-04-29 | `add-core-actions-manifest` | Manifest engine for declarative actions / module CTAs. |
| 2026-04-29 | `add-core-modulo-genericos` | The four cross-cutting modules (Dashboard / Inbox / Alertas / Reportes) contractualized. |
| 2026-04-29 | `extend-core-{data-tables,error-handling,forms,layout,modals,navigation,theming}-from-prototype` | Capability extensions from prototype experimentation. |
| 2026-04-30 | `add-core-module-types` | Type A / Type B / sub-module-tabs primitives. |
| 2026-04-30 | `extend-core-modals-drawer-primary-actions` | Drawer primary actions canonised. |
| 2026-04-30 | `extend-core-modulo-genericos-dashboard-widgets` | Dashboard widget primitives. |
| 2026-04-30 | `migrate-fin-prototype` | **The migration of `fin-old/fin-prototype.html` into the template-shaped scaffold.** |
| 2026-04-30 | `remove-segmentation-pattern` | Removed an earlier segmentation primitive in favour of `<Segmenter>`. |

The archive is the canonical record of what was decided when. **Read the relevant `design.md` when in doubt about a past decision.**

---

## Document maintenance

This file is updated:

- When `align-fin-prototype-to-playbook` and similar prototype-alignment changes archive their deltas into fin.
- When a follow-up from §5 archives and adds new fin-canonical decisions.
- When a pre-existing drift documented in §4 is closed.

It is NOT updated for one-off tactical decisions; those live in the per-change `design.md`.
