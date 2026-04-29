# core-template-frontend — Session Context

> Last updated: 2026-04-22
> Scope: Transversal frontend infrastructure — NOT a functional module
> Related repo: `/Users/yasmani/Projects/core-template-frontend/`

---

## Why this context file exists (and why it is not under OPS)

This discovery started as a side thread of "cambios que se vienen para OPS" but quickly diverged into an **independent, transversal piece of work**: defining the official Ardua frontend template that every core app (core-ops, core-app, core-lex, core-trd, core-fin, core-com) will be built on or migrated to.

The deliverable is NOT a module-specific artifact — it is the **shared foundation** for all modules. Therefore this context file lives at the discovery root (not under `ops-`), following the precedent of `observabilidad-session-context.md` which is also a transversal concern.

The original OPS work that motivated the session (whatever specific change was planned) is still pending and should be picked up in a dedicated OPS session — see the "Parking" section at the end.

---

## Purpose of the template

`core-template-frontend` is Ardua's official frontend template. It serves four purposes:

1. **GitHub template repository** — clonable via "Use this template" for every new core app.
2. **Base commit** for migrating the four existing Ardua core frontends (`core-app`, `core-lex`, `core-ops`, `core-trd`) from divergent stacks (3 Vue + 1 React, no TS in 3, no linter in 3, no tests) to a single deterministic architecture.
3. **Scaffold for backend-first developers** — pre-wired architecture + OpenSpec + project-specific Claude Code skills let backend developers implement frontend features without deep frontend expertise.
4. **Governance layer** — OpenSpec specs are the contract that locks the visual and interaction patterns of the Ardua core across every app.

---

## Architecture — three coordinated layers

The template operates on three distinct documentation/execution layers for AI agents and developers:

### Layer 1 — Contracts (enforceable)

**Where:** `openspec/specs/core-*/spec.md`
**Format:** `### Requirement:` with SHALL/MUST + `#### Scenario:` in Gherkin GIVEN/WHEN/THEN
**Enforcement:** `openspec validate --all --strict` in CI; a broken contract breaks the build.

### Layer 2 — Project Memory (agent-auto-loaded)

**Where:** `CLAUDE.md` + `AGENTS.md` (byte-identical mirrors) at repo root + `openspec/config.yaml → context:`
**Consumed by:** Claude Code auto-loads `CLAUDE.md`; Codex/Cursor read `AGENTS.md`; OpenSpec CLI injects `config.yaml → context:` at runtime.
**Scope:** conventions, stack rules, architecture principles, workflow, git policy, communication style.

### Layer 3 — Skills (executable playbooks)

**Where:** `.claude/skills/ardua-*/SKILL.md` + `.cursor/skills/ardua-*/SKILL.md` (byte-identical mirrors)
**Format:** YAML frontmatter (`name` + `description`) + deterministic Markdown steps
**Consumed by:** auto-discovered by description matching against user requests.

---

## Current state (consolidated)

### OpenSpec baseline

- **Framework:** `@fission-ai/openspec` v1.3.1 (official CLI, initialized via `openspec init` selecting Claude Code + Cursor)
- **10 capabilities:** 6 Tier 1 (enforceable from day 1) + 4 Tier 2 (seed contracts, per-app extensions expected)
  - Tier 1: core-layout, core-navigation, core-data-tables, core-actions-menu, core-modals, core-theming
  - Tier 2 seed: core-forms, core-api-layer, core-auth, core-error-handling
- **23 requirements** total with SHALL/MUST, validated strict
- **129 Gherkin scenarios** total
- **2 changes archived:**
  - `2026-04-22-scaffold-core-template-frontend` — retroactive archive of the initial scaffold with all 10 capability deltas
  - `2026-04-22-strengthen-core-ui-patterns` — closed 3 gaps: header CTAs max 3 (core-layout), destructive confirmation dialog pattern (core-modals), persistent alert banners (core-error-handling)

### Tech stack (pinned in package.json, enforced via OpenSpec change proposals for modifications)

- Vue 3.5 + TypeScript strict + Vite 7
- Vue Router 4 + Pinia 3 + @tanstack/vue-query 5 + @tanstack/vue-table 8
- Tailwind 4 + shadcn-vue (reka-ui) + lucide-vue-next + vue-sonner
- vee-validate 4 + zod 3 for forms
- Axios 1 with @auth0/auth0-vue 2
- Testing: Vitest 3 + @vue/test-utils
- Lint: ESLint 9 flat + Prettier 3
- Node runtime: 20.19.0+ (pinned via `.nvmrc`, required by OpenSpec CLI)
- Opt-in via `optionalDependencies`: vue-i18n, launchdarkly-vue-client-sdk

### 10 Ardua-specific skills (3,129 lines of deterministic playbooks)

Each skill: YAML frontmatter for auto-discovery + deterministic steps with real code snippets copied from the scaffold reference + compliance checklist citing scenarios of the specs it enforces.

| Skill | Instantiates contract | Lines |
|---|---|---|
| `ardua-add-module` | core-layout L1/L2/L3 + core-navigation | 252 |
| `ardua-add-block` | core-navigation | 173 |
| `ardua-configure-header-ctas` | core-layout (header CTAs max 3) | 249 |
| `ardua-add-row-actions` | core-actions-menu (2-rule enablement + portal) | 313 |
| `ardua-build-filterable-list` | core-data-tables (useTable / vue-query) | 396 |
| `ardua-build-form` | core-forms (vee-validate + zod) | 382 |
| `ardua-compose-kpi-dashboard` | core-layout L2 + core-theming | 244 |
| `ardua-add-confirm-dialog` | core-modals (destructive pattern, new) | 321 |
| `ardua-add-alert-banner` | core-error-handling (persistent banner, new) | 395 |
| `ardua-add-api-endpoint` | core-api-layer (axios + ApiError + vue-query) | 404 |

Skills under `openspec-*` (propose, apply, archive, explore) are generated by `openspec init` and MUST NOT be edited.

### CI / quality gates

`.github/workflows/ci.yml` runs on every push and PR, with two parallel jobs:

- **verify** — `npm run lint && npm run type-check && npm run test:run && npm run build:qa`
- **openspec** — installs `@fission-ai/openspec` globally and runs `openspec validate --all --strict`

Additional `package.json` scripts: `spec:check`, `spec:list`, `spec:status`.

### Bundle size baseline

~195 kB gzipped total for QA build, 2115 modules transformed in ~1.3s. Vue core 64 kB gzip, query + auth as separate chunks, per-page chunks under 12 kB gzip each.

---

## Key design decisions made this session

1. **OpenSpec was adopted as the governance layer.** Initial attempt was manual structure; when the official `@fission-ai/openspec` package was discovered, all manual work was migrated to the official Gherkin GIVEN/WHEN/THEN format. Validator: `openspec validate --strict` passes 10/10.

2. **3-layer architecture over flat docs.** Inspired by the reference implementation pattern observed in `tradingsuit` (which uses `CLAUDE.md` + `AGENTS.md` at root as agent-consumable memory alongside OpenSpec). Layers do not duplicate — each has a distinct role.

3. **Ardua-specific skills live in the same directory as openspec-* skills**, namespaced by `ardua-*` prefix. Discovered automatically by Claude Code/Cursor via description matching. No manual invocation needed.

4. **`useTable<T>` generic has no `Record<string, unknown>` constraint.** Removed after discovering it forces every domain type (`Factura`, `ExampleRecord`, etc.) to add an artificial index signature. Aligned with `@tanstack/vue-query` conventions.

5. **Destructive actions have their own contract separate from Create/Edit modals.** The `core-modals` requirement added in `strengthen-core-ui-patterns` enforces: narrow width, danger-accent, verb-specific label (no generic "OK"), **backdrop click does NOT dismiss** (forces explicit choice), ESC closes as cancel-equivalent, success/error toast for outcome.

6. **Persistent state messages use alert banners, not toasts.** Banners are app-level state, render between Topbar and Main, stack vertically, dismissible by default (session-scoped), non-dismissible only when the condition is system-imposed and user cannot resolve. Toasts remain for ephemeral single-operation feedback.

7. **CLAUDE.md and AGENTS.md are byte-identical mirrors with an explicit sync rule.** Any change in one must be mirrored in the other in the same commit. Future pre-commit hook will automate the check.

8. **`.claude/skills/ardua-*` and `.cursor/skills/ardua-*` are byte-identical mirrors** maintained via `cp -p` shell command (documented). Avoided Claude's write tool for the mirror after a drift incident where `<name>` → `<n>` on re-reads.

9. **Logo/branding visually identifies core template.** Used "A" mark in the Sidebar brand area with Ardua typography placeholder — each app overrides per its module.

---

## Gaps and pending work

### Deferred to future OpenSpec changes (not blocking)

- **Bulk-action bar pattern** — when rows are selected in a table, a contextual action bar appears above the table. Not yet specified. Mentioned as out-of-scope in several skills.
- **Inline editable table cells** — power-user pattern, not standardized. Out of scope for `ardua-build-form` skill.
- **Multi-step wizards** — `ardua-build-form` covers single-step only.
- **Chart / visualization components** — no standard chart primitives contracted yet. Full-page dashboards with charts are out of scope for `ardua-compose-kpi-dashboard`.
- **Light mode** — dark theme only in V1. Light mode is a planned V2 OpenSpec change.
- **`init:app` CLI** — script to personalize the template when cloned (brand, name, Jira REQ links). Nice-to-have.
- **Custom OpenSpec schema fork** — `openspec schema fork spec-driven ardua-workflow` to add Ardua-specific rules (ex: mandatory Jira REQ frontmatter). Defer until we have 3+ real changes to see what friction appears.
- **Pre-commit hook for CLAUDE.md ↔ AGENTS.md diff** — enforce sync rule automatically. Currently relies on reviewer discipline.

### Template personalization pending on first real use

- GitHub repository not yet created — work is local-only at `/Users/yasmani/Projects/core-template-frontend/`
- `git init` not yet run — the repo has no version control history yet
- "Template repository" setting not yet enabled in GitHub
- Branch protection rules not yet configured
- End-to-end skill auto-discovery has not been tested yet in a fresh Claude Code session

### Migrations pending (each is its own OpenSpec change)

- `core-app` (CLP) — Vue + JS → Vue 3 + TS template
- `core-lex` (LEX) — Vue + JS → Vue 3 + TS template
- `core-ops` (OPS) — Vue + JS → Vue 3 + TS template
- `core-trd` (TRD) — React + TS → Vue 3 + TS template (largest migration, React → Vue)

### New apps to scaffold from the template (when needed)

- `core-fin` (FIN) — Finance & accounting operations
- `core-com` (COM) — Commercial operations

---

## References and key file locations

### Local repo (not yet on GitHub)

```
/Users/yasmani/Projects/core-template-frontend/
├── CLAUDE.md                              ← project memory (auto-loaded)
├── AGENTS.md                              ← byte-identical mirror for Codex/Cursor
├── README.md                              ← onboarding narrative
├── openspec/
│   ├── config.yaml                        ← context + rules (points to CLAUDE.md)
│   ├── specs/core-*/spec.md               ← 10 capability contracts
│   └── changes/archive/                   ← 2 changes archived
├── .claude/skills/                        ← 4 openspec-* + 10 ardua-*
├── .cursor/skills/                        ← same 14 skills, byte-identical mirror
├── .github/workflows/ci.yml               ← 5 gates + openspec validate
└── src/                                   ← Vue 3 + TS + Vite scaffold
```

### Canonical references used during the session

- Reference implementation of patterns: `tradingsuit` repo (Ardua sibling) — provided the CLAUDE.md + AGENTS.md + Multi-Agent Rules Sync pattern
- Reference page for L1/L2/L3: `src/pages/ModuloA.vue` — full client-side table with filters, actions menu, 3 modal types
- Reference composable pattern: `src/composables/useTable.ts`
- Reference shared portal component: `src/components/feedback/ActionsMenu.vue`
- OpenSpec official docs: https://openspec.dev and https://github.com/Fission-AI/OpenSpec

---

## Parking — threads to pick up in other sessions

### OPS original work (not this context file)

The session was originally motivated by "cambios que se vienen para OPS" but diverged entirely into this transversal template work. Whatever specific OPS change was planned (new product flow, module refactor, Jira REQ tied to OPS) is still pending. Next step: dedicated OPS session, read `discovery/ops-session-context.md`, define the concrete change, and proceed via `/opsx:propose` on whatever repo is in scope (likely the current legacy `core-ops` until its migration, then the migrated one).

### Template-related follow-ups (continue in this context)

- Git init + first commit when ready
- Create GitHub repo in Ardua org, mark as Template repository
- Optionally test end-to-end skill auto-discovery in a fresh Claude Code session with a realistic prompt ("agregá un módulo de Facturas con tabla, filtros, KPIs, acciones por fila y botón de crear en el header")
- First real OpenSpec change on the template that exercises the skills layer end-to-end (e.g. bulk-action bar, light mode, i18n enablement)
- First migration: pick which of the 4 legacy apps is the lowest-risk starting point

### Lessons learned to apply in other sessions

- **Tooling discovery matters.** Spent turns building OpenSpec structure manually before discovering `@fission-ai/openspec` exists. For any infrastructure/governance work: web-search for "official" tooling FIRST before hand-rolling.
- **Placeholder choice affects reliability.** Short angle-bracket tokens like `<n>` or `<name>` can be transformed by Markdown/HTML-aware tools. Use multi-char kebab-case placeholders like `<change-slug>` or curly-brace style `{RecordType}`.
- **Byte-identical file mirroring via `cp -p` beats tool-based copy** when drift matters. Discovered by debugging a CLAUDE.md ↔ AGENTS.md drift on the first attempt.
- **3 layers > 1 layer for agent governance.** Specs alone are not enough; project memory + skills fill the gap between formal contracts and the actual code production workflow.
