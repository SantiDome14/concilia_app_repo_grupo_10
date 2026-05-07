# Tasks — Scaffold core-template-frontend

> Archived. All tasks are `[x]` — the code was written during the sessions that produced this scaffold. This file is the retroactive record of what was built.

## 1. Project foundation

- [x] Initialize `package.json` with pinned dependencies (Vue 3.5, TS, Vite 7, all listed in the proposal)
- [x] Add `optionalDependencies` for `vue-i18n` and `launchdarkly-vue-client-sdk`
- [x] Configure `tsconfig.json`, `tsconfig.app.json` (strict mode full), `tsconfig.node.json` (inline `compilerOptions`, no `@tsconfig/node22` dependency)
- [x] Configure `vite.config.ts` with alias `@/*` → `./src/*`, chunk splitting, env modes `local` / `qa` / `production`
- [x] Configure ESLint 9 flat config (`eslint.config.js`) with Vue + TS + Prettier
- [x] Configure Prettier (`prettier.config.js`)
- [x] Configure Vitest (`vitest.config.ts`) with `jsdom` environment and coverage
- [x] Add `.nvmrc`, `.gitignore`, `.editorconfig`, `.prettierignore`
- [x] Add `.env.example`, `.env.qa`, `.env.production`, `.env.local` (dummy values for local dev)
- [x] Add `.vscode/settings.json` and `.vscode/extensions.json`
- [x] Add `public/` directory for static assets

## 2. Design tokens and global styles

- [x] Write `src/styles/globals.css` with Tailwind 4 directives and `@theme {}` mapping CSS vars to utilities
- [x] Define surface hierarchy (`--bg`, `--surf`, `--card`, `--card-2`)
- [x] Define border hierarchy (`--b1`–`--b4`)
- [x] Define text ramp (`--t1`–`--t4`)
- [x] Define brand (`--brand`, `--brand-bg`) with documented HSL triples for OPS / TRD / FIN / CLP / COM / LEX
- [x] Define semantic palette (`--success`, `--warning`, `--danger`, `--info`, each with matching `-bg`)
- [x] Load DM Sans from Google Fonts in `index.html`

## 3. Core utilities

- [x] `src/config/env.ts` — zod-validated env with defaults for template first run
- [x] `src/config/routes.ts` — `ROUTE_PATHS` and `ROUTE_NAMES` as single source of truth
- [x] `src/types/api.ts` — `ApiResponse`, `PaginatedResponse`, `ApiError` class with status helpers
- [x] `src/types/models.ts` — baseline domain shapes
- [x] `src/lib/cn.ts` — `clsx` + `tailwind-merge` helper
- [x] `src/lib/format.ts` — currency, date, `nextSequentialId`, `truncate`
- [x] `src/constants/index.ts` — `DEFAULT_PAGE_SIZE`, `PAGE_SIZE_OPTIONS`, `TOAST_DURATION`, `QUERY_DEFAULTS`

## 4. API layer

- [x] `src/api/client.ts` — axios instance with `setAccessTokenGetter` injector and error normalizer
- [x] `src/api/endpoints.ts` — grouped by resource
- [x] `src/api/modules/example.ts` — reference CRUD module
- [x] `src/api/index.ts` — barrel exports

## 5. Platform plugins

- [x] `src/plugins/pinia.ts`
- [x] `src/plugins/query.ts` — vue-query with smart retry (no retry on 401/403/404)
- [x] `src/plugins/auth0.ts` — clean Auth0 setup, wires `setAccessTokenGetter`, no-op when not configured
- [x] `src/plugins/launchdarkly.ts` — opt-in, dynamic import

## 6. Router and auth

- [x] `src/router/routes.ts` — route definitions with `meta.breadcrumb`, `meta.block`, `meta.requiresAuth`, `meta.capabilities`
- [x] `src/router/guards.ts` — `createAuthGuard` and `createCapabilitiesGuard` closure factories
- [x] `src/router/index.ts` — `setupRouter(app)` wires guards via closure over `$auth0`
- [x] `src/stores/auth.ts` — Pinia auth store
- [x] `src/stores/index.ts` — barrel

## 7. Composables

- [x] `src/composables/useAuth.ts` — unified auth API, stub when Auth0 not registered
- [x] `src/composables/useCapabilities.ts` — `can`, `canAny`, `canAll`
- [x] `src/composables/useTable.ts` — client-side search + filters + pagination

## 8. UI primitives

- [x] `src/components/ui/button/` — cva with 5 variants × 4 sizes
- [x] `src/components/ui/input/` — styled input with v-model support
- [x] `src/components/ui/badge/` — cva with 6 variants (success / warning / info / danger / neutral / brand)
- [x] `src/components/ui/README.md` — shadcn-vue CLI usage, primitive recommendations per feature type

## 9. Layout

- [x] `src/components/layout/AppShell.vue` — wraps authenticated routes
- [x] `src/components/layout/Sidebar.vue` — Brand / Home / Blocks / Modules / spacer / Account, collapsible, body class contract
- [x] `src/components/layout/Topbar.vue` — route-meta-driven breadcrumb (Bloque / Módulo or standalone Home)
- [x] Account menu exposes Settings, Get Help, Logout with icons and danger styling for Logout

## 10. Feedback components

- [x] `src/components/feedback/EmptyState.vue`
- [x] `src/components/feedback/Skeleton.vue`
- [x] `src/components/feedback/ActionsMenu.vue` — portal with smart flip, dismissal handlers, anchor-ref-driven positioning

## 11. Pages

- [x] `src/pages/Login.vue`
- [x] `src/pages/Dashboard.vue` — skeleton dashboard pattern
- [x] `src/pages/ModuloA.vue` — reference L1/L2/L3 implementation with full interactivity
- [x] `src/pages/ModuloB.vue` — skeleton of the standard list pattern
- [x] `src/pages/ModuloC.vue` — skeleton of the standard list pattern
- [x] `src/pages/NotFound.vue`

## 12. Opt-in i18n

- [x] `src/i18n/index.ts` — `setupI18n(app)`
- [x] `src/i18n/locales/en.json`
- [x] `src/i18n/locales/es.json`

## 13. Tests and CI

- [x] `tests/setup.ts` — Vitest setup with `enableAutoUnmount`
- [x] `src/lib/format.spec.ts` — 9 tests covering `formatCurrency`, `formatDate`, `nextSequentialId`, `truncate`
- [x] `.github/workflows/ci.yml` — lint + typecheck + test + build:qa
- [x] `.husky/pre-commit` — lint-staged

## 14. OpenSpec CLI bootstrap

- [x] Install `@fission-ai/openspec` globally (Node 20.19+)
- [x] Run `openspec init` with Claude Code + Cursor integration
- [x] Generated `.claude/skills/openspec-{propose,apply,archive,explore}/SKILL.md`
- [x] Generated `.claude/commands/opsx/{propose,apply,archive,explore}.md`
- [x] Generated `.cursor/skills/openspec-*` and `.cursor/commands/opsx/*`
- [x] Generated `openspec/config.yaml` (`schema: spec-driven`)
- [x] Populate `context:` field in `config.yaml` with Ardua project description, stack, conventions, Jira integration, and quality gates
- [x] Populate `rules:` field in `config.yaml` with artifact-specific conventions (proposal, tasks, spec)

## 15. OpenSpec capability baseline

- [x] 6 Tier-1 capability specs migrated to `openspec/specs/<capability>/spec.md` with Gherkin GIVEN/WHEN/THEN scenarios:
  - `core-layout` (5 req · 11 scenarios)
  - `core-navigation` (5 req · 10 scenarios)
  - `core-data-tables` (7 req · 13 scenarios)
  - `core-actions-menu` (7 req · 15 scenarios)
  - `core-modals` (7 req · 13 scenarios)
  - `core-theming` (7 req · 10 scenarios)
- [x] 4 Tier-2 seed capability specs migrated:
  - `core-forms` (5 req · 7 scenarios)
  - `core-api-layer` (5 req · 8 scenarios)
  - `core-auth` (6 req · 9 scenarios)
  - `core-error-handling` (8 req · 13 scenarios)
- [x] Validate with `openspec validate --strict` (piloted on `core-layout`, all specs follow same pattern)
- [x] This archived change (`2026-04-22-scaffold-core-template-frontend/`) with `proposal.md`, `design.md`, `tasks.md`, and 10 `specs/<capability>/spec.md` deltas in the `## ADDED Requirements` format
