# Design — Scaffold core-template-frontend

## Context

This design document captures the rationale behind the technical choices made in the foundational scaffold. It is retroactive: the code exists, and this document explains *why* the code is shaped the way it is, so that future contributors and the migration of the legacy repos can follow the same reasoning.

## Framework choice: Vue 3 + TypeScript strict + Vite

**Alternatives considered:**
- **React + TypeScript + Vite.** Rejected. Three of the four legacy repos are already Vue. Aligning on React would force three rewrites and one rename. Aligning on Vue forces one rewrite (`core-trd`).
- **Svelte + SvelteKit.** Rejected. Zero adoption across Ardua, no ecosystem match for the rest of the stack (no Auth0 Svelte plugin with the maturity of `@auth0/auth0-vue`), team has no Svelte experience.
- **Nuxt.** Rejected. These are internal tools behind Auth0 — SEO and SSR are not goals. Nuxt's opinions (auto-imports, file-based routing conventions) would create accidental complexity for developers who don't need them.

**Why Vue 3 + TS + Vite won:**

1. **Three of four repos are already Vue** — lowest migration cost.
2. **Composition API forces order.** Unlike React hooks, which can be called from anywhere, Vue's `<script setup>` creates a single clearly-bounded scope that is easier for backend-first developers to read.
3. **Single-file components** force co-location of template, script, and style, which reduces the mental overhead of jumping between files for every component change.
4. **Mature tooling.** `vue-tsc` gives strict-mode TypeScript on templates, `@tanstack/vue-query` has parity with the React version, `vee-validate` + `zod` integration is canonical.
5. **`core-trd` migration (React → Vue) is a one-time cost** that is more than paid back by unifying the other three apps under a single architecture forever.

## OpenSpec governance layer

**Why OpenSpec:**

OpenSpec (the official framework by Fission-AI, distributed as `@fission-ai/openspec` on npm) gives us a markdown-based spec-driven development layer that works out-of-the-box with Claude Code and Cursor through auto-generated Skills and slash commands (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`). It solves two problems at once:

1. It gives **backend-first developers + Claude Code + Cursor** a deterministic contract to read before implementing a feature. The agents consume `openspec/specs/<capability>/spec.md` as the canonical source of truth and propose deltas in `openspec/changes/<change-name>/specs/<capability>/spec.md` with the `## ADDED / MODIFIED / REMOVED / RENAMED Requirements` headers that the archive command parses semantically.
2. It gives **the Head of Product (Yasmani) and reviewers** a stable surface for governance. Every change is a markdown PR diff, not a guessing game. The "Why / What Changes / Capabilities" structure in every `proposal.md` matches how REQ-* tickets flow from Jira through Miles into implementation.

**Why not a custom spec system:**

We considered rolling a custom `specs/` folder with our own format. Rejected because:
- OpenSpec already ships the full flow (validator, archive, semantic delta merge, state machine) as a validated product with 25+ AI tools supported. Inventing our own would force us to re-learn the same lessons.
- OpenSpec is editor-agnostic and model-agnostic — the Skills and Commands are generated per tool from a single source. A custom format would tie us to one assistant.

## OpenSpec CLI adoption

The CLI (`@fission-ai/openspec`, version 1.3.1 at the time of scaffold) is installed globally and drives the `/opsx:*` workflow:

- `openspec init` scaffolds `openspec/config.yaml` + `.claude/` + `.cursor/` Skills and Commands.
- `openspec list`, `openspec show`, `openspec status` are the inspection surface.
- `openspec validate --all --strict` runs the Zod + custom-rule validator over every spec and change.
- `openspec archive <change>` applies deltas in order `RENAMED → REMOVED → MODIFIED → ADDED` and moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<n>/`.

The CLI requires **Node 20.19.0+**, which is already our baseline (`.nvmrc` pins the current LTS).

**Deferred:** user-editable schemas (`openspec schema fork spec-driven <name>`) are available but we stay on the built-in `spec-driven` schema until we have three or four real changes under our belt and can see which parts of the default flow are most error-prone.

## Opt-in plugins: i18n and LaunchDarkly

`vue-i18n` and `launchdarkly-vue-client-sdk` are declared as `optionalDependencies` in `package.json` and wired via dynamic imports in `main.ts`. They activate only when the corresponding `VITE_FEATURE_*` environment variable is set to `true`.

**Rationale:**
- Not every app needs i18n. `core-ops` is internal and Spanish-only. `core-lex` may need English for compliance exports. Forcing i18n on every app inflates the bundle and the mental load for no benefit.
- LaunchDarkly is expensive per seat. Only production-grade apps will enable it. Apps in early development should not pay the cognitive tax of having feature flags everywhere.
- Dynamic imports mean the plugin code is not bundled when disabled — the bundle is clean.

## Closure-based route guards (replacing `router.setAuth0`)

The legacy repos (`core-app`, `core-lex`) use a pattern where the router exposes a `setAuth0(auth0)` method that is called from `main.js` to inject the Auth0 instance into the guards. This is an anti-pattern because:

- The router module has a mutable external dependency that is not declared in its imports.
- The guards cannot be unit-tested without the full bootstrap sequence.
- The pattern is non-obvious to any developer reading the router in isolation.

**The template replaces it with a closure-based factory:**

```ts
// router/guards.ts
export function createAuthGuard(auth0: Auth0VueClient | null): NavigationGuardWithThis<undefined> {
  return async (to) => { /* ... uses auth0 via closure ... */ };
}
```

```ts
// router/index.ts
export function setupRouter(app: App): void {
  const auth0 = app.config.globalProperties.$auth0 as Auth0VueClient | undefined;
  router.beforeEach(createAuthGuard(auth0 ?? null));
}
```

The guards now close over the Auth0 instance at setup time, which is testable (pass a mock), readable (the dependency is explicit), and degrades gracefully (when `auth0` is `null`, the guard no-ops — enabling template first run without Auth0).

## ActionsMenu as a portal component

The legacy repos render per-row action menus inside the `<td>` cell. Because the table wrapper has `overflow: hidden` (required for the rounded-corner aesthetic), menus on the last rows get clipped.

**The template solves this with a portal:**

- `ActionsMenu.vue` uses `<Teleport to="body">` and `position: fixed`, escaping any ancestor's `overflow: hidden`.
- Positioning is computed from the trigger's `getBoundingClientRect()` plus the viewport dimensions, with smart flip (down → up) and horizontal re-anchoring when overflow would occur.
- The component accepts a single `anchor: HTMLElement | null` prop, so pages render **one** menu instance and re-anchor it as the user opens different rows. Rendering N menu instances would be wasteful and error-prone.

This pattern is captured in the `core-actions-menu` capability spec and enforced for every table in the core.

## Open Questions

1. **Schema customization.** Do we eventually fork the built-in `spec-driven` schema into an Ardua-specific variant (e.g. with a mandatory Jira REQ field, mandatory viability filter)? **Proposed:** defer until we have at least three real changes and see which parts of the default flow create friction.
2. **i18n default enabled for `core-lex`.** `core-lex` will likely need English for compliance exports from day 1 of its migration. **Proposed:** decide at migration-PRD time; the feature flag makes it trivial to flip.
3. **LaunchDarkly vs. self-hosted flags.** Self-hosted would save on per-seat cost but requires running a flag service. **Proposed:** defer until we have concrete flag use cases and a cost comparison.
