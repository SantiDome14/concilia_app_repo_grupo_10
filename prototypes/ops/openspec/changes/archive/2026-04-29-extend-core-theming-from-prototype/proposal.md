# Extend core-theming with subtle scrollbars, skeleton variants, branding placement, and badge palette

> Jira REQ: — (no ticket; template-level additive migration from `prototypes/_core-template/` v1.15)
> Module: core-template (foundation)

## Why

The current `core-theming` baseline contracts the token-driven approach: CSS custom properties in `:root`, the single `--brand` swap, the four-step surface / border / text ramps, the semantic status palette, dark mode default, and DM Sans typography. What it does NOT yet contract is four small but high-leverage rules that the vanilla HTML/JS prototype (`prototypes/_core-template/`, v1.15, dated 2026-04-28) accumulated over fifteen revisions and that every one of the six modules built on top of the prototype now relies on:

1. **Subtle scrollbars are global, not per-component.** The prototype declares `::-webkit-scrollbar` once at the root and every scroll container (Main, table wrappers, Drawers, modal bodies, Sidebar) inherits the same canonical 8px-wide thumb tied to the `--b3` border token. Without contractualizing this, two implementers will produce two visually different scrollbars (browser default in some places, custom in others), and a third will redefine the scrollbar locally in a single component breaking the visual rhythm.
2. **`<Skeleton>` variants are a closed set, not a free-form shape.** The prototype exposes `.sk-card`, `.sk-btn`, `.sk-chart`, `.sk-circle`, `.sk-row` as the five canonical loading shapes — every loading state in every module reuses one of those five. Without contractualizing the variant set, agents will invent ad-hoc skeleton shapes per page, the shimmer animation will fork into multiple keyframes, and the loading-state grammar will diverge across modules.
3. **Brand text lives in three places but has one source.** The prototype's branding rule is "swap three text nodes": Sidebar brand name, Sidebar brand subtitle/tagline, and the Topbar dimmed prefix that matches the Sidebar brand name. The dimmed Topbar prefix is already governed by `core-navigation` ("Topbar omits the app brand"). What is missing is the rule that all three SHALL pull from a single source — a `useBrand()` composable / `app.config` — so cloning the template for a new app is one edit, not three drift-prone edits.
4. **`<Badge>` palette is variant-driven, never raw color.** The prototype's badges use a small set of semantic colors (success / warning / danger / info / neutral / brand) with two tones (solid / translucent), an optional dot for status-typed cells (matching the Select dot pattern from `core-forms`), and two sizes (`sm` / `md`). Without contractualizing the palette, agents will reach for raw hex/rgb in the Badge component the first time a stakeholder asks for "a slightly different green", and the four-step status grammar from `core-theming` will be undermined at the first divergence.

Closing these four gaps in one change keeps the effort focused on the visual identity layer, lets reviewers evaluate them as one coherent strengthening of `core-theming`, and locks down the visual contract before any Ardua core app starts implementing features on the Vue template.

## What Changes

- **`core-theming`** — add a new requirement `Scroll containers MUST use the subtle scrollbar utility globally` that contracts the canonical scrollbar styling (`::-webkit-scrollbar` width 8px, thumb tied to `--b3` with rounded corners, `scrollbar-width: thin` + `scrollbar-color: var(--b3) transparent` for Firefox), implemented as a global `.scroll-subtle` utility class (or applied via the `<body>` selector and inherited by every scroll container — Main, table wrappers, Drawers, modal bodies, Sidebar). Per-component overrides are forbidden.
- **`core-theming`** — add a new requirement `<Skeleton> component MUST expose the canonical variant set` that fixes the variants to `card | button | chart | circle | row`, contracts the shared `@keyframes` shimmer animation referenced by the base component, and forbids per-page custom skeleton shapes (a new shape requires a new variant introduced via an OpenSpec change).
- **`core-theming`** — add a new requirement `Brand text MUST be sourced from a single useBrand() composable across the three placements` that contracts the three placements (Sidebar `<SidebarBrand>` name slot, Sidebar `<SidebarBrand>` sub slot, Topbar dimmed prefix) and the single source (`useBrand()` composable / `app.config`) so cloning the template is one edit. The Topbar dimmed prefix consistency rule cross-references the existing `core-navigation` requirement that omits the app brand from the Topbar — the Topbar prefix is the dimmed visual echo of the Sidebar brand name, not a duplication.
- **`core-theming`** — add a new requirement `<Badge> component MUST follow the variant-driven palette contract` that fixes the props to a semantic `variant` (`info | success | warning | danger | neutral | brand`), a `tone` (`solid | translucent`), an optional `dotColor` for status-typed badges (matching the Select dot pattern), and two sizes (`sm` 10px text / `md` 12px text). Custom hex/rgb colors as `<Badge>` props are forbidden — variants only.

## Capabilities

### Affected Capabilities

- `core-theming` — four new requirements added (subtle scrollbars utility, Skeleton variant set, branding single source, Badge palette contract)

### New Capabilities

None. This change extends an existing capability with rules already proven in the vanilla prototype.
