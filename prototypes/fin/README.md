# core-fin

> Ardua's Finance & Accounting frontend — Vue 3 + TypeScript strict + Vite 7, governed by OpenSpec.

`core-fin` is the operational app for Finanzas y Contabilidad at Ardua Solutions. It is derived from [`_core-template-frontend`](../_core-template-frontend/) and is bound by every capability declared in `openspec/specs/`.

---

## Scope

This app replaces the legacy `prototypes/fin-old/fin-prototype.html` monolith with a Vue 3 + TypeScript + Vite + manifest-engine implementation.

**Active modules (in this baseline):**

| Bloque | Módulo | Estado |
|---|---|---|
| Generics | Dashboard / Inbox / Alertas / Reportes | Active (FIN-themed) |
| Back Office | Ventas / Compras | Placeholder (`<ModuloSoon>`) |
| Tesorería | **Disponibilidades** | Active (REQ-50) |
| Tesorería | Cobros / Pagos / Deudas-Préstamos / Inversiones / Tipo de Cambio | Placeholder (`<ModuloSoon>`) |
| Contabilidad | Libro Diario / Plan de Cuentas / Parametrizaciones | Placeholder (`<ModuloSoon>`) |

**Disponibilidades** is the first FIN module landed end-to-end and is the reference implementation for any future FIN module:

- Type B page with three sub-tabs (`Posición / Bancos-Cuentas / Movimientos`) via `<Segmenter>`.
- Contextual Main CTA per sub-tab (declared via `module_ctas[]` in the manifests, gated by `show_when` against the active sub-tab).
- Secondary CTA support (`variant: 'secondary'`) used on `Bancos-Cuentas` for *Crear nuevo Banco/Estructura*.
- Three views (`Lista / Tarjetas / Tablero`) on the Movimientos sub-tab, with the Tablero state-driven by 6 selectable axes.
- URL sync of sub-tab, axis, and drill-down filter.
- Drill-down from Posición.Cuenta → Movimientos with `cuenta_id` pre-filtered via `route.query`.
- All row actions and module CTAs declared via the manifest engine — zero hand-coded action arrays in pages.

---

## Quick start

```bash
# Prerequisites: Node 20.19.0+ (pinned via .nvmrc)
nvm use

# Install dependencies
npm install

# Install the OpenSpec CLI globally (one time)
npm install -g @fission-ai/openspec

# Run locally
npm run dev      # http://localhost:5173

# Verify everything
npm run lint
npm run type-check
npm run test:run
npm run spec:check    # openspec validate --all --strict
npm run build:qa
```

---

## Stack

Inherits the canonical Ardua frontend stack from the template. The full list is in [`CLAUDE.md`](./CLAUDE.md) → *Tech Stack*. Highlights:

| Layer | Choice |
|---|---|
| Framework | Vue 3.5 + `<script setup>` |
| Language | TypeScript strict (`vue-tsc --build`) |
| Build | Vite 7 (modes: `local`, `qa`, `production`) |
| State | Pinia |
| Server data | `@tanstack/vue-query` + `@tanstack/vue-table` |
| Styles | Tailwind 4 + shadcn-vue (reka-ui) |
| Forms | `vee-validate` + `zod` |
| Auth | `@auth0/auth0-vue` (closure-based guards) |
| Testing | Vitest + `@vue/test-utils` |
| Governance | OpenSpec (`@fission-ai/openspec`) |

**Brand:** `--brand: 142 71% 45%` (FIN canonical green per `core-theming`).

---

## Repository layout

```
core-fin/
├── CLAUDE.md             Project memory for Claude Code (auto-loaded)
├── AGENTS.md             Mirror of CLAUDE.md for Codex / Cursor / others
├── MIGRATION-NOTES.md    Per-prototype legacy inventory + FIN-specific deltas
├── src/
│   ├── api/              HTTP client, endpoints, modules
│   ├── components/
│   │   ├── layout/       AppShell, Sidebar, Topbar
│   │   ├── ui/           Primitives (Button, Input, Badge, Select, …)
│   │   ├── feedback/     EmptyState, Skeleton, ActionsMenu
│   │   ├── views/        ViewToggle, CardsGrid, CardItem, Segmenter
│   │   ├── kanban/       KanbanBoard, KanbanColumn, KanbanCard
│   │   ├── drawer/       Drawer, Timeline, CommentsThread
│   │   ├── manifest/     ManifestActionsMenu, ManifestDialog, ManifestField
│   │   └── reportes/     ReporteCard, ReporteDetailModal
│   ├── composables/      useAuth, useCapabilities, useTable, useManifestModule
│   ├── lib/
│   │   ├── manifest/     Pure-TS manifest engine (mirrored from template)
│   │   ├── kanban/       Kanban resolver (mirrored from template)
│   │   ├── drawer/       Drawer state machine (mirrored from template)
│   │   ├── reportes/     Reportes engine (mirrored from template)
│   │   └── movimientos/  FIN-specific helpers for movements
│   ├── manifests/        Action manifests per module (FIN-namespaced)
│   ├── mocks/            Seed data (genericos/ + fin/)
│   ├── pages/            Login, Dashboard, Inbox, Alertas, Reportes,
│   │                     Disponibilidades, ModuloSoon, NotFound
│   ├── plugins/          pinia, query, auth0, manifests, catalogs
│   ├── stores/           Pinia stores (auth, manifestRegistry, auditLog,
│   │                     disponibilidadesCatalog)
│   └── types/            Shared types (api, models, manifest, fin, …)
├── openspec/
│   ├── config.yaml       Project context + artifact rules
│   ├── specs/            Canonical contracts (core-* + fin-disponibilidades)
│   └── changes/          Active + archived change proposals
└── tests/                Vitest setup
```

---

## Project conventions

The authoritative source of truth for how to work in this codebase is [`CLAUDE.md`](./CLAUDE.md) at the repo root (mirrored byte-identically in [`AGENTS.md`](./AGENTS.md) for Codex / Cursor / other AI tools).

`CLAUDE.md` / `AGENTS.md` cover stack choices, architecture principles, code & component conventions, styling rules, data-layer conventions, forms, routing & auth, OpenSpec workflow, commit policy, and quality gates.

A complementary concise version lives inside [`openspec/config.yaml`](openspec/config.yaml) → `context:`, which the OpenSpec CLI injects into agent instructions at runtime. If the two ever drift, `CLAUDE.md` wins.

**Ardua-specific task playbooks** ("add a new module", "add a confirm dialog", etc.) live as Skills in `.claude/skills/ardua-*/SKILL.md` (mirrored in `.cursor/skills/`). Agents auto-discover them by matching the `description` field against your request — no manual reference needed.

For per-prototype migration inventory + FIN-specific deltas vs. the template, see [`MIGRATION-NOTES.md`](./MIGRATION-NOTES.md). For cross-prototype patterns validated across migrations, see [`_core-template-frontend/MIGRATION-PLAYBOOK.md`](../_core-template-frontend/MIGRATION-PLAYBOOK.md).

---

## OpenSpec workflow

`core-fin` consumes the canonical capabilities defined in `openspec/specs/core-*/` plus FIN-specific extensions. The four OpenSpec commands:

| Slash command | What it does |
|---|---|
| `/opsx:propose <change-slug>` | Scaffolds `openspec/changes/<change-slug>/` with `proposal.md`, `design.md`, `tasks.md`, and a `specs/` folder for deltas. |
| `/opsx:apply <change-slug>` | Walks the `tasks.md` checklist. |
| `/opsx:archive <change-slug>` | Applies deltas in order `RENAMED → REMOVED → MODIFIED → ADDED` into the canonical `openspec/specs/<capability>/spec.md`, then moves the change folder to archive. |
| `/opsx:explore <topic>` | Thinking-partner mode — no code, only analysis. |

Every meaningful change in this codebase flows through OpenSpec — including module additions, capability extensions, and refactors. See `CLAUDE.md` → *OpenSpec Workflow* for the hard rule and the four-artifact contract.

---

## Scripts

```bash
npm run dev            # Vite dev server
npm run build          # Vite build (production)
npm run build:qa       # Vite build (QA mode)
npm run preview        # Preview the production build

npm run lint           # ESLint with autofix
npm run format         # Prettier over src/
npm run type-check     # vue-tsc --build
npm run test           # Vitest watch
npm run test:run       # Vitest single run
npm run test:ui        # Vitest UI
npm run test:coverage  # Coverage report

npm run spec:check     # openspec validate --all --strict
npm run spec:list      # openspec list
npm run spec:status    # openspec status
```

---

## License

Internal Ardua repository — not for public distribution.
