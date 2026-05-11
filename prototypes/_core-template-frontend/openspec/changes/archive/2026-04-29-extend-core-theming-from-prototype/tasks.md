# Tasks — extend-core-theming-from-prototype

This change is artifact-only at the contract level — four new requirements added to `core-theming`. No application code is modified by this change itself. Real implementation of the four contracts (the global `.scroll-subtle` utility, the closed `<Skeleton>` variant set, the `useBrand()` composable + `<SidebarBrand>`, the `<Badge>` palette) will happen in subsequent OpenSpec changes when individual apps wire the components and tokens.

## 1. Spec deltas

- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `Scroll containers MUST use the subtle scrollbar utility globally`, with at least 2 scenarios (canonical 8px / `--b3` styling applied via `.scroll-subtle` or `<body>` cascade; per-component overrides forbidden)
- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `<Skeleton> component MUST expose the canonical variant set`, with at least 2 scenarios (the five variants `card | button | chart | circle | row`; shared `@keyframes` shimmer; per-page custom shapes forbidden)
- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `Brand text MUST be sourced from a single useBrand() composable across the three placements`, with at least 2 scenarios (Sidebar name, Sidebar sub, Topbar dimmed prefix all read from `useBrand()`; cross-reference to `core-navigation` Topbar-omits-brand rule)
- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `<Badge> component MUST follow the variant-driven palette contract`, with at least 2 scenarios (props `variant` / `tone` / `dotColor` / `size` with fixed value sets; custom hex/rgb forbidden)
- [ ] Run `openspec validate extend-core-theming-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate

## 2. Implementation (deferred — captured for downstream changes)

- [ ] (deferred) Declare `.scroll-subtle` utility (or equivalent `<body>` cascade) in `src/styles/globals.css`, tied to `--b3`
- [ ] (deferred) Implement `<Skeleton>` Vue component in `src/components/feedback/Skeleton.vue` with the `variant` prop and the shared `@keyframes` shimmer
- [ ] (deferred) Implement `useBrand()` composable in `src/composables/useBrand.ts` and `<SidebarBrand>` component slot consuming it
- [ ] (deferred) Wire the Topbar dimmed prefix to read from `useBrand()` (without violating the existing `core-navigation` "Topbar omits the app brand" rule — the dimmed prefix is the visual echo, not a duplication)
- [ ] (deferred) Implement `<Badge>` Vue component in `src/components/ui/Badge.vue` with `variant`, `tone`, `dotColor`, and `size` props using `cva` for variant resolution

These implementation tasks are listed for traceability but are NOT executed by this change — they belong to follow-up changes that wire the components and tokens.

## 3. Validation gates

- [ ] `openspec validate extend-core-theming-from-prototype --strict` passes
- [ ] `openspec validate --all --strict` passes (no regressions on existing specs)
- [ ] Manual review: confirm each new requirement uses SHALL/MUST and exposes ≥ 2 GIVEN/WHEN/THEN scenarios
- [ ] Manual review: confirm Vue/TS artifacts (`<Skeleton>`, `<Badge>`, `<SidebarBrand>`, `useBrand()`, `--b3` token, `.scroll-subtle` utility) are named consistently across `proposal.md`, `design.md`, `tasks.md`, and `specs/core-theming/spec.md`

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-theming-from-prototype`
- [ ] Confirm the CLI applies the four ADDED requirements into `openspec/specs/core-theming/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-theming-from-prototype/`
- [ ] Final commit with conventional message: `specs: extend core-theming with subtle scrollbars, skeleton variants, branding placement, and badge palette`
