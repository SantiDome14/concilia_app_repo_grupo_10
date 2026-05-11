# Scaffold core-template-frontend

> Foundational change. No Jira REQ (predates the OpenSpec + Miles workflow).
> Module: core-template (foundation — not an app-level module).

## Why

The four Ardua core frontends (`core-app`, `core-lex`, `core-ops`, `core-trd`) currently share almost no architecture. A diagnostic before this change confirmed:

- **Framework mismatch:** 3 Vue apps + 1 React app (`core-trd`).
- **TypeScript adoption inconsistent:** only `core-trd` uses TS, and with strict rules disabled. The other three repos are JavaScript.
- **Folder conventions differ per repo:** `pages/` vs `views/`, `composables/` vs `hooks/`, ad-hoc folders like `enums/`, `api/`, `contexts/`, `locals/` (typo), `data/`.
- **Dependency hygiene:** `core-lex` depends on `lucide-react` inside a Vue project. `core-ops` imports 12 icons individually in `main.js`.
- **Auth0 hack:** `core-app` and `core-lex` use a custom `router.setAuth0(auth0)` pattern to pass the Auth0 instance to the router.
- **Package metadata stale:** two repos share the same package name (`gringotts-frontend`), one never renamed from its starter (`vite_react_shadcn_ts`), all pinned to `v0.0.0`.
- **Aspirational docs:** every `CLAUDE.md` references conventions and paths that don't exist in the actual repo (e.g. `../../core-agents/conventions.md` is a dead link).
- **No tests, no linter, no formatter, no pre-commit hooks** in any of the four repos (except ESLint in `core-trd`).

This foundational divergence makes it effectively impossible to:

1. Hire a developer who can work across two or more of the core apps without context switching cost.
2. Reuse UI patterns (sidebar, table, actions menu, modals) — each repo has reinvented them.
3. Leverage Claude Code + Cursor consistently — the agents need the same conventions in every repo.
4. Migrate `core-trd` off React without a known target architecture.

The `core-template-frontend` repository is the foundation that consolidates this architecture: a single Vue 3 + TypeScript + Vite template, governed by OpenSpec, that serves as:

- A **GitHub template repository** for every new core app (clonable via "Use this template").
- The **base commit** for the migration of the four existing frontends.
- A **scaffold for backend-first developers** so they can implement frontend features via Claude Code + OpenSpec without needing deep frontend expertise.
- A **governance layer** for the visual design and interaction patterns of the Ardua core.

## What Changes

- Scaffold a Vue 3.5 + TypeScript strict + Vite 7 project with pinned dependencies: Vue Router 4, Pinia, `@tanstack/vue-query`, `@tanstack/vue-table`, Tailwind 4, shadcn-vue (reka-ui), `lucide-vue-next`, `vue-sonner`, `vee-validate`, `zod`, Axios, `@auth0/auth0-vue`, `@vueuse/core`, `date-fns`, `clsx`, `tailwind-merge`.
- Register `vue-i18n` and `launchdarkly-vue-client-sdk` as **opt-in** via `optionalDependencies` and dynamic imports gated by `VITE_FEATURE_I18N` / `VITE_FEATURE_LAUNCHDARKLY`.
- Configure ESLint 9 flat config, Prettier, Vitest + `@vue/test-utils`, Husky + lint-staged pre-commit, and a GitHub Actions CI workflow (lint → typecheck → test → build:qa).
- Define a design-token system in `src/styles/globals.css` using Tailwind 4 `@theme {}` mapping CSS custom properties to utility classes. Dark theme default. A single `--brand` variable re-themes the whole application.
- Implement the app shell: `AppShell` wrapper, collapsible `Sidebar` (200px ↔ 60px with body-class contract), `Topbar` with route-meta-driven breadcrumb.
- Implement `ActionsMenu` as a portal component with smart vertical flip, dismissal-on-scroll/resize/outside-click/ESC, and viewport-clamped positioning.
- Implement the reference `ModuloA` page with the full L1/L2/L3 pattern (KPIs, filters portal, pagination with ellipsis, actions menu with two-rule enablement, Create/Detail/Edit modals).
- Implement skeleton pages for `Dashboard`, `ModuloB`, `ModuloC` that mirror the canonical list pattern.
- Wire the API client with the `setAccessTokenGetter` injection pattern, normalized `ApiError` class, and smart retry policy (no retry on 401/403/404).
- Wire the router with closure-based guards (`createAuthGuard`, `createCapabilitiesGuard`) — explicitly replacing the `router.setAuth0()` anti-pattern used in `core-app` / `core-lex`.
- Add the composables `useAuth` (stub when Auth0 is not registered), `useCapabilities`, `useTable`.
- Bootstrap the OpenSpec baseline with 6 Tier-1 capabilities and 4 Tier-2 seed capabilities — governed by this archived change.
- Install the official `@fission-ai/openspec` CLI (Node 20.19+) and initialize it for Claude Code + Cursor — the CLI generates `.claude/skills/openspec-*`, `.claude/commands/opsx/*`, `.cursor/skills/openspec-*`, and `.cursor/commands/opsx/*`, plus `openspec/config.yaml`.

## Capabilities

### New Capabilities

**Tier 1 — Full contracts (enforceable from day 1):**
- `core-layout` — app shell composition and L1/L2/L3 page pattern
- `core-navigation` — sidebar structure, topbar breadcrumb, account menu
- `core-data-tables` — table pattern, filters, pagination, row click
- `core-actions-menu` — per-row portal menu with two-rule enablement
- `core-modals` — Create / Detail / Edit / Confirm patterns
- `core-theming` — design tokens, brand variable, module palette

**Tier 2 — Seed contracts (baseline, each app extends):**
- `core-forms` — vee-validate + zod baseline
- `core-api-layer` — axios + token injector + ApiError
- `core-auth` — Auth0 + closure guards + useAuth / useCapabilities
- `core-error-handling` — toasts + empty / loading states + global error boundary

### Affected Capabilities

None. This is the foundational change — nothing pre-existed to affect.

## Notes

- This change is archived **retroactively**. The code was written before OpenSpec was adopted in the repository, so the full flow (`/opsx:propose → /opsx:apply → /opsx:archive`) was not followed. Treat this change as the canonical example for future changes that **will** follow the full flow.
- The pre-existing legacy repos (`core-app`, `core-lex`, `core-ops`, `core-trd`) are not modified by this change. Their migration will be a sequence of separate OpenSpec changes, one per app, each referencing a dedicated Jira REQ.
