# core-template-frontend — Project Memory

> This file is automatically read by Claude Code (and equivalent by other AI coding assistants) on every session of this project. It is the **single source of truth** for how to work in this codebase.
>
> **Mirror rule:** any change to this file MUST be mirrored in `AGENTS.md` in the same commit. See [Multi-Agent Rules Sync](#multi-agent-rules-sync) below.

---

## Project Overview

`core-fin` is Ardua's Finance & Accounting frontend — the operational app for Finanzas y Contabilidad, derived from `core-template-frontend` and bound by every capability in `openspec/specs/`. It replaces the legacy `prototypes/fin-old/fin-prototype.html` monolith with a Vue 3 + TypeScript + Vite + manifest-engine implementation.

Scope (active modules, declared in this baseline migration):

- **Operaciones / Movimientos** — back-office life cycle of every `movimiento` (deposits, withdrawals, fees, taxes, rebates, transfers); 9 governance + imputation actions.
- **Cotizaciones** — outgoing quotes' invoicing workflow; 4 actions and a kanban over `documentacion` state.
- **Tesorería / Disponibilidades** — cash position, treasury movements, and the assignment queue for unassigned withdrawals.
- **Reportes**, **Inbox**, **Alertas**, **Dashboard** — the four cross-cutting standard modules from `core-modulo-genericos`, FIN-themed.

Placeholder modules registered behind a `Próximamente` stub: Compras, Cobros, Pagos, Deudas / Préstamos, Inversiones, Monedas (Tesorería); Plan de Cuentas, Parametrizaciones, Libro Diario (Contabilidad).

This app does NOT ship its own contracts — it is a **consumer** of the 13 capabilities defined in `openspec/specs/`. Any UI or behavior change MUST satisfy those contracts; non-trivial changes flow through the OpenSpec workflow described below.

## Branding

- **Project name:** `core-fin` (all lowercase, kebab-case).
- **Parent organization:** Ardua Solutions.
- **Module prefix:** FIN (uppercase in enums, headers, and visual brand references; lowercase as the identifier).
- **Brand color:** `--brand: 142 71% 45%` (FIN canonical green per `core-theming`).
- **Sibling apps:** `core-app` (CLP), `core-lex`, `core-ops`, `core-trd`, `core-com`. Naming convention: `core-<module>`.
- In documentation and code, **always write module names in lowercase** (`ops`, `lex`, `trd`, `clp`, `fin`, `com`). Uppercase is only used in enums and in brand references (e.g. the L1 page header may display the module name in uppercase as a style choice, but the identifier is lowercase).
- **Exception:** capitalize only at the beginning of a sentence when grammatically required.

## Tech Stack

| Layer | Choice | Version policy |
|---|---|---|
| Framework | Vue 3.5 + `<script setup>` | Pinned major |
| Language | TypeScript 5.7 strict | Pinned minor |
| Build | Vite 7 (modes: `local`, `qa`, `production`) | Pinned major |
| Routing | Vue Router 4 | Pinned major |
| State | Pinia 3 | Pinned major |
| Server data | `@tanstack/vue-query` 5 | Pinned major |
| Table engine | `@tanstack/vue-table` 8 | Pinned major |
| Styles | Tailwind 4 + shadcn-vue (reka-ui) | Pinned major |
| Icons | `lucide-vue-next` | Pinned major |
| Forms | `vee-validate` 4 + `zod` 3 | Pinned major |
| HTTP | `axios` 1 | Pinned major |
| Auth | `@auth0/auth0-vue` 2 | Pinned major |
| Feedback | `vue-sonner` (toasts) | Pinned major |
| Dates | `date-fns` 4 | Pinned major |
| Utilities | `@vueuse/core`, `clsx`, `tailwind-merge`, `class-variance-authority` | Pinned major |
| Testing | Vitest 3 + `@vue/test-utils` | Pinned major |
| Lint | ESLint 9 flat + Prettier 3 | Pinned major |
| Governance | OpenSpec (`@fission-ai/openspec`) | Pinned minor |
| Opt-in | `vue-i18n`, `launchdarkly-vue-client-sdk` | Via `optionalDependencies` and `VITE_FEATURE_*` flags |

**Node runtime:** 20.19.0+ (pinned via `.nvmrc`, enforced in `package.json` engines).

**Do not add new dependencies without an OpenSpec change proposal.** Library choices are part of the contract. If a dependency is genuinely needed, propose the change first, get it reviewed, then add it.

## Architecture

- **Single-page application** served by Vite. No SSR, no SSG.
- **Composition API only.** Options API is forbidden in new code.
- **`<script setup>` for every component.** No `defineComponent` wrappers.
- **Design tokens drive every visual value.** Zero hardcoded hex/rgb/px values outside `src/styles/globals.css`.
- **Single brand variable per app.** Changing `--brand` in `globals.css` re-themes the entire application.
- **Module structure follows Bloque → Módulo.** The Sidebar groups Módulos under Bloques. Every module route MUST declare `meta.block` and `meta.breadcrumb`.
- **Pages follow the L1/L2/L3 pattern** from `core-layout` (page header, KPI cards, section + data surface). L2 is optional, L1 and L3 are required.
- **Three-level control framework.** L1 hosts segmentation (sub-tabs via `<Segmenter>`) + view toggle + Main CTA. L3 hosts search + granular filters. L2 KPIs are computed over the active segment + active filters. Period is a filter with UI privileges, not a separate conceptual category.
- **Module views.** Each module declares the views it supports via `views: ('list' | 'cards' | 'kanban')[]`. `<ViewToggle>` renders only declared views; the toggle is hidden when only one view is declared. Tablero is state-driven (N columns = N declared module states); declaring `'kanban'` without a state machine is rejected at dev-time and removed from the toggle.
- **Tables:** `useTable` for client-side data, `@tanstack/vue-query` for server-side. Hand-rolled pagination is forbidden.
- **Per-row actions:** shared `ActionsMenu.vue` portal component. Inline `<td>` dropdowns are forbidden.
- **Actions are declared via the manifest engine** (`core-actions-manifest`). Hand-coded action arrays in pages are forbidden. Manifests are JSON-strict objects keyed by `app.module[.recordType]`. Pure-logic engine (types, predicate evaluator, capabilities, resolver, validator, imputation): `src/lib/manifest/`. Vue UI layer (deferred): `src/components/manifest/`.
- **Modals:** three canonical types (Create, Detail, Edit) plus the destructive Confirmation dialog. Detail transitions to Edit via the `Editar` button.
- **Drawer (side panel)** is the canonical detail surface for record types whose lifecycle is workflow-driven (Solicitudes, Alertas). Pages opt in via `meta.detail = 'drawer'`. The Drawer hosts id+title+status header, Timeline, Comments, footer actions.
- **Route guards:** closure-based (`createAuthGuard(auth0)`). The legacy `router.setAuth0()` hack is forbidden.
- **API layer:** a single shared axios instance. Token injection via `setAccessTokenGetter`. Errors normalized into `ApiError` with status helpers.
- **Feedback:** `vue-sonner` toasts for ephemeral feedback; alert banners for persistent system-level messages; `EmptyState` and `Skeleton` components for empty and loading states.

For the full structural contract, see `openspec/specs/core-layout/spec.md`, `openspec/specs/core-navigation/spec.md`, and the other capability specs under `openspec/specs/`.

## Current & Future Core Apps

### Current (legacy, pending migration)

| App | Module prefix | Stack today | Migration status |
|---|---|---|---|
| `core-app` | CLP | Vue + JS, no TS | Not started |
| `core-lex` | LEX | Vue + JS, no TS | Not started |
| `core-ops` | OPS | Vue + JS, no TS | Not started |
| `core-trd` | TRD | React + TS (strict off) | Not started (React → Vue) |

### Planned / proposed

- `core-fin` (FIN) — Finance & accounting operations
- `core-com` (COM) — Commercial operations

Each migration is its own OpenSpec change with a dedicated Jira REQ ticket.

## Documentation Hierarchy

This repository operates on **three coordinated layers** for AI agents and developers. Each layer has a distinct role — none replaces the others.

### Layer 1 — Contracts (enforceable)

**Where:** `openspec/specs/<capability>/spec.md`
**Format:** `### Requirement:` with SHALL/MUST + `#### Scenario:` in Gherkin GIVEN/WHEN/THEN
**Enforcement:** `openspec validate --all --strict` in CI; a broken contract breaks the build.

These are the **formal contracts** every app derived from this template MUST satisfy. There are 10 baseline capabilities (6 Tier 1, 4 Tier 2 seed), plus the new `core-actions-manifest` (Tier 1) currently in active migration via change `add-core-actions-manifest`. To browse them:

```bash
openspec list
openspec show core-layout
```

### Layer 2 — Project Memory (this file)

**Where:** `CLAUDE.md` and `AGENTS.md` at the repo root; `openspec/config.yaml` → `context:`
**Consumed by:** Claude Code auto-loads `CLAUDE.md`; Cursor/Codex/others read `AGENTS.md`; the OpenSpec CLI injects `config.yaml` → `context:` into agent instructions at runtime.
**Scope:** conventions, stack choices, architecture principles, workflow, communication style. The "how we build" layer.

Not validated by CI — but read by every AI agent on every session.

### Layer 3 — Ardua-specific Skills (agent playbooks)

**Where:** `.claude/skills/ardua-*/SKILL.md` (mirrored to `.cursor/skills/ardua-*/SKILL.md`)
**Format:** YAML frontmatter + step-by-step Markdown
**Consumed by:** Claude Code/Cursor auto-discover skills by matching the `description` field against the user's request.

These are **executable playbooks**. When a user says *"add a new module to core-fin"*, the agent invokes `ardua-add-module` automatically. When the user says *"add a confirmation dialog"*, the agent invokes `ardua-add-confirm-dialog`.

Each skill: (1) reads the relevant capability specs to understand the contract, (2) walks a deterministic sequence of steps, (3) runs `npm run spec:check` as the compliance gate before finishing.

See `.claude/skills/` for the full list. Skills that do not start with `openspec-` are Ardua-specific (project-provided). Skills that do start with `openspec-` are generated by `openspec init` and MUST NOT be edited.

## OpenSpec Workflow

Every meaningful change in this repository flows through OpenSpec. The four commands:

| Slash command | What it does |
|---|---|
| `/opsx:propose <change-slug>` | Scaffolds `openspec/changes/<change-slug>/` with `proposal.md`, `design.md`, `tasks.md`, and a `specs/` folder for deltas. The agent fills the artifacts with you. |
| `/opsx:apply <change-slug>` | Walks the `tasks.md` checklist, implementing each task and marking progress. |
| `/opsx:archive <change-slug>` | Applies the spec deltas (in order `RENAMED → REMOVED → MODIFIED → ADDED`) into `openspec/specs/`, then moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<change-slug>/`. |
| `/opsx:explore <topic>` | Thinking-partner mode — no code is written, only analysis and proposals. |

### When a change starts

1. Create a working branch: `temp-open-spec/<change-slug>` (following tradingsuit convention).
2. Run `/opsx:propose <change-slug>` from Claude Code.
3. Fill the four artifacts with the agent's help. **Do not skip `design.md`** for non-trivial changes — it is where tradeoffs are captured.
4. Every `proposal.md` starts with a Jira REQ frontmatter:
   ```markdown
   > Jira REQ: [REQ-XX](https://arduasolutions.atlassian.net/browse/REQ-XX)
   > Module: CLP    # or OPS / TRD / FIN / LEX / COM / core-template
   ```
5. The `proposal.md` H1 is the canonical source for the PR title.

### When the change is implemented

1. Run `/opsx:apply <change-slug>`. The agent walks the checklist.
2. Every task is individually verifiable. No task completes without a clear observable outcome.
3. When implementation reveals a design issue, **pause and update the artifacts** before continuing. Do not silently diverge from the proposal.

### When the change is complete

1. Every quality gate passes (`npm run lint && npm run type-check && npm run test:run && npm run spec:check && npm run build:qa`).
2. PR is opened with the `proposal.md` H1 as its title.
3. After merge, run `/opsx:archive <change-slug>` to apply deltas and move to archive.

## Code Conventions

### TypeScript

- **Strict mode is non-negotiable.** `any` is forbidden. Use `unknown` at type-erased boundaries (e.g. parsing JSON from the network), then narrow with zod or type guards.
- **Prefer `type` over `interface`** for data shapes; use `interface` only when extension by downstream code is the explicit intent.
- **No non-null assertions (`!`) in application code.** Use explicit guards or `throw` with a clear error message.
- **Exported types live in `src/types/`.** Page-local types stay in the same file as the component.
- **Enums:** prefer union literal types (`type Status = 'ACTIVE' | 'PENDING' | 'INACTIVE'`) over `enum`. Union literals erase at build time and stringly compare; `enum` generates runtime code.
- **Path alias `@/*` → `./src/*`.** Relative imports across feature boundaries are discouraged. Cross-feature imports use the alias.

### Vue

- **`<script setup>` only.** No `defineComponent`, no Options API in new components.
- **Use the Composition API composables** provided by the template: `useAuth`, `useCapabilities`, `useTable`, plus `useQuery` and `useMutation` from `@tanstack/vue-query`.
- **Component files use PascalCase** (`MyComponent.vue`). Page files use PascalCase as well (`ModuloA.vue`, not `modulo-a.vue`).
- **Props:** use `defineProps<T>()` with TS interface. Do not use the runtime object form.
- **Emits:** use `defineEmits<T>()` with TS interface.
- **Slots:** use `defineSlots<T>()` when the slot has typed props.
- **No `<style scoped>` with hardcoded values.** Prefer Tailwind utility classes. When a style is truly component-local and Tailwind can't express it, use a CSS variable that is defined in `globals.css`.

### Naming

- **Components:** PascalCase (`Sidebar.vue`, `ActionsMenu.vue`, `ModuloA.vue`).
- **Composables:** camelCase, prefix `use` (`useTable.ts`, `useAuth.ts`).
- **Stores (Pinia):** camelCase, suffix `Store` in the symbol (`useAuthStore`), file name matches the symbol (`auth.ts` or `authStore.ts`).
- **Types and interfaces:** PascalCase (`ApiError`, `ExampleRecord`, `RecordStatus`).
- **Enums / union literals:** SCREAMING_SNAKE for the members when they represent domain constants (`'ACTIVE' | 'PENDING'`). Title Case when they represent UI labels.
- **Functions and methods:** camelCase, verb-first (`formatCurrency`, `fetchRecords`, `nextSequentialId`).
- **CSS variables:** kebab-case (`--brand`, `--card-2`, `--b1`).
- **Tailwind utility classes:** follow Tailwind's own conventions; do not invent custom class names that look like Tailwind.

### Language

- **All code, comments, identifiers, commit messages, tests, and technical documentation MUST be in English.**
- **User-facing strings in pages MAY be in Spanish** (these apps are internal tools used by Spanish-speaking Ardua staff). When `vue-i18n` is enabled for an app, Spanish is the default locale.
- **No mixed-language identifiers.** `useRegistros` is forbidden; use `useRecords`. Domain-specific Spanish terms that have no good English equivalent (e.g. `referenciador`, `agrupador` in CLP) are acceptable for domain types, but document why in a nearby comment.

### Comments

- **Prefer self-documenting code over comments.** If you need a comment to explain *what* the code does, rename the function or extract a smaller function with a descriptive name.
- **Comments are for *why*, not *what*.** Explain business rules, non-obvious constraints, references to tickets, and tradeoffs.
- **File-level banner comments are encouraged** for utilities, composables, and modules that are not self-evidently scoped (the existing `src/composables/useTable.ts` uses this pattern).

### Error Handling

- **Every HTTP error MUST be an `ApiError`** instance from `src/types/api.ts`. The client's response interceptor normalizes all non-2xx responses.
- **Consumers branch on status helpers,** not raw codes: `error.isUnauthorized`, `error.isForbidden`, `error.isNotFound`, `error.isServerError`.
- **401 is handled globally** — the app logs the user out and redirects to `/login`. Components do not handle 401 locally.
- **403 surfaces a toast** ("Operación no permitida"). Components do not handle 403 locally.
- **5xx and network errors** surface a toast with a `Reintentar` action that re-invokes the failed operation.
- **Form validation errors** render directly below the input in the danger color token (see `core-forms` capability).
- **Unhandled component errors** are caught by the global Vue `app.config.errorHandler` and surfaced as a generic error toast without crashing the shell.

### Testing

- **Vitest + `@vue/test-utils`.** JSDOM environment. `tests/setup.ts` calls `enableAutoUnmount`.
- **Unit tests live next to the code** (`.spec.ts` alongside the source file). E.g. `src/lib/format.ts` + `src/lib/format.spec.ts`.
- **Coverage is not yet gated** in CI (deferred until the first full migration). Aim for ≥90% on utilities and composables.
- **No skipped tests.** `it.skip` and `describe.skip` are forbidden in committed code. If a test cannot run, fix it or delete it.
- **No phantom asserts.** Every test MUST assert something meaningful.
- **Components test behavior, not implementation.** Mount the component, interact, assert observable output.

## Styling Conventions

- **Design tokens only.** Colors, spacing, typography come from CSS custom properties in `src/styles/globals.css` via Tailwind's `@theme` mapping.
- **No hex/rgb/px literals in components.** If a value is needed that is not in the token set, add the token first, then use it.
- **Brand:** a single `--brand` + `--brand-bg` variable re-themes the app. Module-specific brand colors follow the canonical palette (see `core-theming` spec):
  - `OPS` → red `0 84% 60%`
  - `TRD` → blue `217 91% 60%`
  - `FIN` → green `142 71% 45%`
  - `CLP` → purple `258 90% 74%`
  - `COM` → amber `38 92% 50%`
  - `LEX` → teal `172 66% 50%`
- **Surface hierarchy:** `--bg` (outermost) → `--surf` (sidebar/topbar) → `--card-2` (cards) → `--card` (nested cards).
- **Text ramp:** `--t1` (primary) → `--t4` (muted).
- **Typography:** DM Sans loaded from Google Fonts. Weights: 400, 500, 600, 700, 800. Custom weights forbidden.
- **Dark theme only** in the initial release. Light mode is a planned V2 change.

## Component Conventions

- **`src/components/layout/`** — `AppShell`, `Sidebar`, `Topbar`. Structural components only.
- **`src/components/ui/`** — Primitives (`Button`, `Input`, `Badge`). Each primitive uses `cva` for variants.
- **`src/components/feedback/`** — `EmptyState`, `Skeleton`, `ActionsMenu`. Cross-cutting feedback components.
- **`src/pages/`** — Route-level page components. Every page follows L1/L2/L3.
- **`src/composables/`** — Pure composition logic. No Vue component rendering.
- **`src/plugins/`** — Setup functions for platform plugins (Pinia, Query, Auth0, LaunchDarkly).
- **`src/lib/manifest/`** — Pure-logic actions-manifest engine (no Vue, no DOM). Public API in `src/lib/manifest/index.ts`.
- **`src/components/manifest/`** (deferred) — `<ManifestDialog>`, `<ManifestField>`, `<ManifestModuleCTAs>`, `<ManifestBatchCTA>`. Wire the engine to the UI.
- **Never inline a dropdown menu in a `<td>` cell.** Use the shared `ActionsMenu.vue` portal.
- **Never render more than 3 CTAs in a page header** (per `core-layout`). More actions belong in the row actions menu or in a future bulk-action bar.

## Data Layer Conventions

### Server-side data

- Use `@tanstack/vue-query`'s `useQuery` and `useMutation`.
- Query keys are arrays starting with the resource name: `['records', { page, search, filters }]`.
- Retry policy is pinned in `src/plugins/query.ts`: no retry on 401/403/404; one retry on transient 5xx and network errors.
- `@tanstack/vue-query` feeds `@tanstack/vue-table` when the table is paginated server-side.

### Client-side data (small, already-in-memory lists)

- Use `useTable<T>({ data, searchFields, pageSize })` from `src/composables/useTable.ts`.
- Do not hand-roll pagination inside a page component. This is explicitly forbidden by `core-data-tables`.

### App-level state

- Pinia. One store per domain (auth, user preferences, feature flags).
- Stores use the setup-style: `defineStore('auth', () => { ... })`.
- No reactive global singletons outside Pinia.

## Forms

- `vee-validate` + `zod`. Hand-rolled validation in `ref`s is forbidden.
- Every form composes a `z.object({...})` schema referenced by `useForm`.
- Field validation runs on blur; full-form validation runs on submit.
- Labels use the canonical uppercase-letter-spaced token (`text-[10px] font-bold uppercase tracking-wider text-t-3`).
- Required fields render a trailing `*`.
- The submit button is disabled while the form is invalid or a submit is in flight.
- Field errors render directly below the input in `text-danger`.
- **Native `<select>` is forbidden in forms and modals.** Use the shadcn-vue `<Select>` component (or an equivalent portal-based custom Select). Native selects ignore the design tokens and break visual consistency.
- **Dependent dropdowns reset their child on parent change.** When a Select depends on another field, the parent change clears the child's value and re-fetches/re-derives the child's options.

## Routing & Auth

- Routes are defined in `src/router/routes.ts` with `meta.block`, `meta.breadcrumb`, `meta.requiresAuth`, and optional `meta.capabilities`.
- Guards are built via closure factories (`createAuthGuard(auth0)`, `createCapabilitiesGuard(auth0)`) and wired in `src/router/index.ts`.
- `useAuth()` is the single entry point for auth state in components. Calling `useAuth0()` directly is forbidden outside `useAuth` itself.
- `useCapabilities()` is the single entry point for permission checks.

## Multi-Agent Rules Sync

- `CLAUDE.md` and `AGENTS.md` are both source-of-truth agent instruction files for Claude Code, Codex, Cursor, and any other AI coding assistant.
- **Both files MUST stay byte-identical.** Any rule change in one file MUST be applied to the other in the same commit.
- This rule is enforced today by reviewer discipline. A future change will add a pre-commit hook that diffs the two files.
- If you notice the two files drift in a PR you are reviewing, reject the PR and ask for them to be synchronized.

## Git & Commit Policy

- **Only the user performs `git commit`, `git push`, and PR creation.** AI agents MUST NOT run these commands unless the user explicitly requests the exact action at that exact moment.
- **Default agent behavior** is to stop at "ready-to-commit state" and hand over. The agent shows a summary of what changed and lets the user decide.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat:` new feature or capability
  - `fix:` bug fix
  - `chore:` tooling, infrastructure, documentation
  - `refactor:` code restructuring without behavior change
  - `test:` test additions or improvements
  - `docs:` documentation-only change
  - `specs:` OpenSpec spec additions or modifications (e.g. `specs: add confirm dialog requirement to core-modals`)
- **PR titles mirror the `proposal.md` H1** for OpenSpec changes.
- **Branch names:**
  - Feature work: `feat/<short-slug>` or `<REQ-XX>/<short-slug>`
  - OpenSpec drafting: `temp-open-spec/<change-slug>` — deleted locally after archive
- **Never force-push to `main` or `develop`.**

## Development Workflow

1. **Understand the requirement.** Read the Jira REQ if there is one. Read the relevant capability specs.
2. **Propose an OpenSpec change.** Run `/opsx:propose <change-slug>` for non-trivial work; for trivial fixes (typos, one-line bug fixes) a direct commit is acceptable.
3. **Design before code.** Fill `design.md` with the approach, alternatives considered, and tradeoffs accepted.
4. **Write tests first when possible.** TDD is preferred but not mandatory. For UI components, at minimum write the page-level happy-path test.
5. **Implement task by task.** Run `/opsx:apply <change-slug>` and let the agent walk the checklist.
6. **Run the quality gates after every task** (`npm run lint && npm run type-check && npm run test:run && npm run spec:check`).
7. **Build once at the end** (`npm run build:qa`) to catch any type or import error the unit tests miss.
8. **Hand off to the user for commit.**

## Quality Gates

Every change MUST pass all five gates before being considered ready for commit:

```bash
npm run lint          # ESLint with autofix — must exit 0
npm run type-check    # vue-tsc --build — must exit 0
npm run test:run      # Vitest — must exit 0
npm run spec:check    # openspec validate --all --strict — must exit 0
npm run build:qa      # Vite build in QA mode — must exit 0
```

CI enforces these on every push and pull request. A failure in any gate blocks the merge.

## Communication Style

When working with the user in Claude Code or any other AI assistant:

- **Be concise and precise.** Over-explanation wastes the user's time.
- **Surface tradeoffs and alternatives when they matter.** The user values honest disagreement over complacent agreement.
- **Ask clarifying questions when a requirement is genuinely ambiguous.** Do not proceed on a guess.
- **Point out potential issues early** — broken contracts, missing auth, accessibility regressions, security concerns.
- **Prefer correctness over speed.** A broken PR that merges fast is worse than a slower one that merges clean.
- **Do exactly what the user asks for** and clearly flag anything you propose beyond the ask. Don't add "helpful" changes silently.
- **Language of interaction:** the user works primarily in Spanish. Respond in Spanish unless the user starts a message in English. Code, comments, and commit messages remain English regardless.

## Important Notes

- **This is a financial platform.** Security and correctness are critical. Never log tokens. Never bypass auth for "testing". Never commit secrets.
- **Never trust client data without validation.** Every API response goes through zod or equivalent before hitting a store or page.
- **Accessibility is a first-class requirement.** Every interactive element must be keyboard-reachable. Every icon-only button needs a `title` attribute. Every form field needs a labeled `<label>`.
- **Performance budget.** The QA bundle should stay under 400 KB gzipped total. Anything above requires an OpenSpec change justifying the addition.
- **No deprecated code.** If code is deprecated, it is removed. No `@deprecated` comments that linger for months.

## Deprecated Policy

- No deprecated code is permitted in `main` or `develop`.
- When a feature is removed, remove every reference to it in the same PR.
- Dead code (unused imports, unreachable branches, commented-out blocks) is caught by ESLint and MUST be deleted, not suppressed.
