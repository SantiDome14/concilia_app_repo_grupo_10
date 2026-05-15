# core-template-frontend

> Ardua's official frontend template — Vue 3 + TypeScript strict + Vite 7, governed by OpenSpec.

This is the foundation every new Ardua core app is built on, and the target architecture that `core-app`, `core-lex`, `core-ops`, and `core-trd` will migrate to.

---

## Why this template exists

The four legacy Ardua core frontends share almost no architecture: 3 Vue apps + 1 React app, inconsistent TypeScript adoption, divergent folder conventions, no tests, no linter in 3 of 4 repos, and an `AGENTS.md` / `CLAUDE.md` pair in each repo that references paths that don't exist. This template consolidates those four apps into a single deterministic scaffold so that:

- A developer hired into one Ardua core app can work on any other without context switching cost.
- UI patterns (sidebar, table, actions menu, modals) are built once and reused everywhere.
- Backend-first developers can implement frontend features via **Claude Code + OpenSpec** — the agent reads `openspec/specs/` as a contract, proposes a change, and implements it.

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

The app runs with dummy Auth0 configuration by default (`.env.local` has placeholders). Real Auth0 wiring happens per-app during migration.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Vue 3.5 + `<script setup>` |
| Language | TypeScript strict (`vue-tsc --build`) |
| Build | Vite 7 (modes: `local`, `qa`, `production`) |
| Routing | Vue Router 4 |
| State | Pinia |
| Data | `@tanstack/vue-query` + `@tanstack/vue-table` |
| Styles | Tailwind 4 + shadcn-vue (reka-ui) |
| Icons | lucide-vue-next |
| Forms | vee-validate + zod |
| HTTP | Axios with `setAccessTokenGetter` injector |
| Auth | `@auth0/auth0-vue` (closure-based guards) |
| Feedback | vue-sonner (toasts) |
| Testing | Vitest + `@vue/test-utils` |
| Lint | ESLint 9 flat + Prettier |
| Governance | OpenSpec (`@fission-ai/openspec`) |
| Opt-in | vue-i18n, launchdarkly-vue-client-sdk |

---

## Repository layout

```
core-template-frontend/
├── CLAUDE.md             Project memory for Claude Code (auto-loaded)
├── AGENTS.md             Mirror of CLAUDE.md for Codex / Cursor / others
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
│   ├── config/           env (zod-validated), routes
│   ├── lib/              Pure-TS engine code (manifest/, kanban/, drawer/, reportes/)
│   ├── manifests/        Action manifests per module (see below)
│   ├── mocks/            Seed data (genericos/, fin/)
│   ├── pages/            Login, Dashboard, Inbox, Alertas, Reportes, Modulo{A,B,C}, NotFound
│   ├── plugins/          pinia, query, auth0, launchdarkly, manifests
│   ├── router/           routes, closure-based guards
│   ├── stores/           Pinia stores (auth, manifestRegistry, auditLog)
│   ├── styles/globals.css  Design tokens (:root + @theme)
│   └── types/            Shared types (api, models, manifest, drawer, kanban, genericos, fin)
├── openspec/
│   ├── config.yaml       Project context + artifact rules
│   ├── specs/            Canonical requirement contracts (10 capabilities)
│   └── changes/          Active + archived change proposals
├── .claude/              OpenSpec Skills + OPSX commands + ardua-* skills
├── .cursor/              OpenSpec Skills + OPSX commands + ardua-* skills
├── .github/workflows/    CI (lint + type-check + test + build + spec:check)
└── tests/                Vitest setup
```

---

## Project conventions

The authoritative source of truth for how to work in this codebase is [`CLAUDE.md`](./CLAUDE.md) at the repo root (mirrored byte-identically in [`AGENTS.md`](./AGENTS.md) for Codex / Cursor / other AI tools).

**`CLAUDE.md` / `AGENTS.md` cover:**

- Stack choices and version policy (Vue 3.5, TS strict, Vite 7, Pinia, vue-query, Tailwind 4 + shadcn-vue, vee-validate + zod, Auth0, vue-sonner)
- Architecture principles (Composition API only, `<script setup>`, design tokens only, L1/L2/L3 pages, closure-based guards)
- Code conventions (TypeScript, Vue, naming, comments, language, error handling, testing)
- Component conventions (where to put pages / layout / ui / feedback)
- Styling conventions (token-only, module palette, surface hierarchy, text ramp)
- Data layer (`useTable` vs `vue-query`, Pinia stores)
- Forms (`vee-validate` + `zod`, no hand-rolled validation)
- Routing & Auth (`useAuth` / `useCapabilities` entry points)
- OpenSpec workflow (how `/opsx:propose`, `/opsx:apply`, `/opsx:archive` are used)
- Git & commit policy (only the user commits; Conventional Commits; branch naming)
- Quality gates (the 5 gates every change MUST pass)
- Multi-Agent Rules Sync rule (`CLAUDE.md` and `AGENTS.md` are byte-identical)
- Communication style for the agent

A complementary concise version lives inside [`openspec/config.yaml`](openspec/config.yaml) → `context:`, which the OpenSpec CLI injects into agent instructions at runtime. If the two ever drift, `CLAUDE.md` wins.

**Ardua-specific task playbooks** ("add a new module", "add a confirm dialog", "build a filterable list", etc.) live as Skills in `.claude/skills/ardua-*/SKILL.md` (mirrored in `.cursor/skills/`). Agents auto-discover these by matching the `description` field of each skill against your request — you do not need to reference them manually.

---

## Action manifests

The per-row actions you see in every module's table (the "⋮" menu) and most module-level CTAs are NOT hardcoded in the page. They come from a declarative configuration called an **action manifest** — one file per module under `src/manifests/`.

> **Why "manifest"?** Following the industry convention for declarative configurations that are *registered* at boot (PWA manifest, Cargo/npm manifest, Kubernetes manifests, etc.). In this codebase a manifest is just **the configuration of actions, dialogs, kanban axes, and predicates for one module** — nothing magical, just a typed JSON-strict object.

A manifest typically declares:

- **`actions[]`** — row-level actions with `enable_when` / `show_when` predicates, `capabilities` (role-based gating), `dialog` definitions (fields, info banners, confirm/cancel labels), and `on_confirm` (set_fields, recompute, audit, toast).
- **`module_ctas[]`** — page-header CTAs that operate on the module as a whole.
- **`kanban_axes[]`** — when the module exposes a Tablero view, the axes that drive its columns and transitions.

The engine that consumes these (`src/lib/manifest/`) handles predicate evaluation, capability checks, dialog rendering, in-place mutations, and audit logging. The page only needs to register a record resolver via `useManifestModule(MANIFEST_KEY)` and mount `<ManifestActionsMenu :manifest-key="…" :record="row" />`.

**Where to look:**

- Manifest files: `src/manifests/framework.template.{inbox,alertas,reportes,modulo_a}.actions.ts`
- Type definitions: `src/types/manifest.ts`
- Engine: `src/lib/manifest/` (pure TS, no Vue dependencies — testable in isolation)
- Composable: `src/composables/useManifestModule.ts`
- Components: `src/components/manifest/*.vue` (`<ManifestActionsMenu>`, `<ManifestDialog>`, `<ManifestField>`, `<ManifestModuleCTAs>`, `<ManifestBatchCTA>`)
- Registration on boot: `src/plugins/manifests.ts`
- Capability contract: `openspec/specs/core-actions-manifest/spec.md`

To add a new module's actions: create `src/manifests/<app>.<module>.actions.ts` exporting a `Manifest` constant + a `MANIFEST_KEY` string, register it in `src/plugins/manifests.ts`, and use `<ManifestActionsMenu>` in the page. No edits to the engine.

---

## The OpenSpec workflow

The `openspec/specs/` folder is the **contract** — 10 capabilities with ~62 requirements and ~109 Gherkin scenarios that every app derived from this template must respect.

### Reading the contract

```bash
npm run spec:list              # list all capabilities
openspec show core-actions-menu  # see a single capability
npm run spec:check             # validate all specs --strict
```

### Proposing a change

From Claude Code:

```
/opsx:propose add-bulk-edit
```

This scaffolds `openspec/changes/add-bulk-edit/` with `proposal.md`, `design.md`, `tasks.md`, and a `specs/` folder for deltas. The agent asks for context, fills in the four artifacts, and prompts you to review.

### Implementing

```
/opsx:apply add-bulk-edit
```

The agent walks the `tasks.md` checklist one item at a time, marking tasks complete as it goes. It pauses on blockers.

### Archiving

```
/opsx:archive add-bulk-edit
```

On archive, the CLI applies the delta specs in order `RENAMED → REMOVED → MODIFIED → ADDED` into the canonical `openspec/specs/<capability>/spec.md`, then moves the change folder to `openspec/changes/archive/YYYY-MM-DD-add-bulk-edit/`.

Every PR is expected to correspond to exactly one OpenSpec change. Reviewers verify that the spec deltas match the implementation.

### The 10 capabilities

| Tier | Capability | Purpose |
|---|---|---|
| 1 | `core-layout` | App shell + L1/L2/L3 page pattern |
| 1 | `core-navigation` | Sidebar + Topbar breadcrumb + Account menu |
| 1 | `core-data-tables` | Table surface, filters, pagination |
| 1 | `core-actions-menu` | Per-row portal menu with 2-rule enablement |
| 1 | `core-modals` | Create / Detail / Edit / Confirm |
| 1 | `core-theming` | Design tokens + brand palette |
| 2 | `core-forms` | vee-validate + zod baseline |
| 2 | `core-api-layer` | axios + token injector + ApiError |
| 2 | `core-auth` | Auth0 + closure guards + useAuth |
| 2 | `core-error-handling` | toasts + empty / loading / global boundary |

**Tier 1** contracts are enforceable from day 1 of every app. **Tier 2** contracts are seeds — each app extends them with domain-specific deltas.

See [`openspec/specs/README.md`](openspec/specs/README.md) for the full capability map, and [`openspec/config.yaml`](openspec/config.yaml) for project context, conventions, and per-artifact rules.

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

## Using as a GitHub template

Click **"Use this template" → "Create a new repository"** on GitHub. After cloning:

1. Rename the project: `package.json` → `name`, `index.html` → `title`, `openspec/config.yaml` → `context` first paragraph.
2. Pick the brand color: `src/styles/globals.css` → `--brand` (canonical module palette is documented in `core-theming` spec).
3. Add your domain routes in `src/router/routes.ts` with `meta.block` and `meta.breadcrumb`.
4. Open an OpenSpec change proposing the first feature — the agent will do most of the scaffolding.

---

## Migrating an existing Ardua core app

Each legacy frontend (`core-app`, `core-lex`, `core-ops`, `core-trd`) migrates as its own OpenSpec change, referencing a Jira REQ. The migration sequence:

1. Start from a fresh clone of this template.
2. Move routes and pages one at a time. Each page follows the L1/L2/L3 pattern.
3. Replace per-row dropdown menus with the `ActionsMenu` portal component.
4. Replace ad-hoc `router.setAuth0()` wiring with the closure-based guards.
5. Run `npm run spec:check` — migrated code must satisfy every Tier 1 capability.

`core-trd` is a special case: it migrates React → Vue. That's a larger change and should be proposed as its own multi-PR OpenSpec change.

---

## License

Internal Ardua repository — not for public distribution.
