# Design — extend-core-theming-from-prototype

## Context

This design captures the rationale behind porting four contracts from `prototypes/_core-template/` (vanilla HTML/JS, v1.15, dated 2026-04-28) into the Vue 3 + TypeScript template's `core-theming` capability. The prototype accumulated these rules over fifteen revisions while six modules were built on top of it; each rule resolves a real divergence that surfaced during that period — scrollbar inconsistency between Main and table wrappers, ad-hoc skeleton shapes proliferating per page, the brand text drifting between Sidebar and Topbar after a clone, and stakeholders reaching for "a slightly different green" inside Badge components. Bringing these rules into the OpenSpec contract before any Ardua core app starts implementing features on the Vue template is the cheapest way to guarantee the same divergences do not re-surface in a different language.

Each decision below answers a specific question that the current `core-theming` baseline leaves open. The design explains **why the answer is what it is**, what alternatives we considered, and what tradeoffs we accepted. The Vue artifact names introduced here (`<Skeleton>`, `<Badge>`, `<SidebarBrand>`, `useBrand()`, `.scroll-subtle`, `--b3` token reuse) are the binding tokens — the prototype's CSS class names (`.sk`, `.sk-card`, `.pbadge`, `.sb-brand-name`, `.bc-dim`) are inputs to this design, not outputs.

---

## Decision 1 — Subtle scrollbars: one rule at the root, every container inherits

### The question

The existing `core-theming` baseline contracts surface, border, text, and status tokens, but says nothing about scrollbar styling. The vanilla prototype answered this with a single `::-webkit-scrollbar` rule at the root (8px width, thumb tied to `--b3`, rounded corners, plus the Firefox `scrollbar-width: thin` + `scrollbar-color` pair) so every scroll container — the Main content area, every table wrapper, the modal body, the Drawer, the Sidebar — picks up the same scrollbar without redeclaration. The Vue template needs the same answer in token-driven form.

### The decision

Every scroll container SHALL apply the canonical scrollbar styling: `::-webkit-scrollbar` width 8px, `::-webkit-scrollbar-thumb` background tied to the `--b3` border token with rounded corners (matching the surface radius vocabulary), plus `scrollbar-width: thin` + `scrollbar-color: var(--b3) transparent` for Firefox. The styling SHALL be implemented as a global `.scroll-subtle` utility class declared once in `src/styles/globals.css` (or applied via the `<body>` selector with cascading to every scroll container — Main content, table wrappers, Drawers, modal bodies, Sidebar). Per-component scrollbar overrides are forbidden — if a container scrolls, it scrolls subtly.

### Alternatives considered

- **Apply the scrollbar style per scroll container component.** Rejected. The prototype tried this in early revisions and the team reverted: every new scroll container (the Drawer added in v1.7, the modal body restyle in v1.10) required re-importing the rule, and missing it once produced a Mac-default scrollbar that was visually jarring against the dark theme. A single global rule is the cheapest way to guarantee consistency.
- **Pick a different border token (e.g. `--b2`).** Rejected. `--b3` is the "emphasized border" step in the existing four-step border ramp, and the prototype's accumulated experience shows it's the right contrast against the dark `--bg` / `--surf` / `--card` surfaces — light enough to find with the cursor, dark enough not to compete with content.
- **Hide scrollbars entirely.** Rejected. Hidden scrollbars trade discoverability for visual cleanliness; in financial tools where tables have arbitrary widths and modals can have arbitrary heights, the user must be able to see at a glance whether content scrolls.
- **Make `.scroll-subtle` an opt-in class rather than a global cascade.** Considered. The opt-in version is more explicit but invites the "I forgot to add the class" failure mode in every new container. The global cascade pays a slightly higher specificity cost but makes the rule unmissable. We accept the cascade.

### Tradeoffs accepted

- The global cascade means a third-party widget embedded inside Main inherits the scrollbar styling unless it sets its own. We accept this — every embedded widget should match the host theme anyway, and if a future widget genuinely needs a different scrollbar, that's a delta on top of this requirement.
- `.scroll-subtle` is documented as the utility name even when the rule is applied via the `<body>` cascade, so pages MAY add the class explicitly to a custom scroll container if they need to clarify the intent (e.g. an in-page panel that scrolls independently). Both styles are equivalent.

---

## Decision 2 — `<Skeleton>` variants: closed set, shared shimmer, no per-page shapes

### The question

The current `core-error-handling` capability already requires "Loading states MUST use the shared `Skeleton` component" but does not specify what shapes the component supports. The vanilla prototype answered this with five canonical helpers — `.sk-card`, `.sk-btn`, `.sk-chart`, `.sk-circle`, `.sk-row` — each backed by a single shared `@keyframes` shimmer. The Vue template's `<Skeleton>` component needs the same closed variant set so loading states stay grammatically consistent across modules and the shimmer animation does not fork into multiple keyframes.

### The decision

The shared `<Skeleton>` Vue component SHALL expose the variant prop `variant: 'card' | 'button' | 'chart' | 'circle' | 'row'`. The shimmer animation SHALL be a single shared `@keyframes` declaration referenced by the base `<Skeleton>` component — every variant uses the same animation, only the shape (dimensions, border radius, layout) differs. Per-page custom skeleton shapes are forbidden: if a page genuinely needs a new shape, it MUST be proposed as a new variant via an OpenSpec change, not added inline. The five variants map directly to the five places the template renders skeletons today: KPI / dashboard cards (`card`), CTA placeholders (`button`), chart blocks (`chart`), avatars and dots (`circle`), and table rows (`row`).

### Alternatives considered

- **Expose width / height / border-radius as free-form props.** Rejected. Free-form props are how skeleton shapes proliferate in practice — every page picks slightly different dimensions for what is conceptually the same shape, the shimmer rhythm goes off-beat across the app, and the "one shared loading grammar" promise breaks. The closed variant set forces the page author to reuse one of the five canonical shapes or open a change proposal.
- **Compose skeletons by stacking primitives (e.g. `<Skeleton>` plus `<SkeletonRow>` plus `<SkeletonCircle>`).** Considered. Composability is attractive but encourages page-level invention. A single `<Skeleton variant="row">` is a more direct fit for the prototype's existing grammar and easier to lint against.
- **Drop the shimmer animation in favor of static placeholders.** Rejected. The shimmer animation provides the "loading is happening" affordance that distinguishes a skeleton from an empty state; static placeholders read as "broken UI" instead of "loading".

### Tradeoffs accepted

- The closed set occasionally forces a page author to fall back to a `card` skeleton when the actual final shape is something more specific (e.g. a wide banner). We accept the cost — the shape mismatch lasts only as long as the loading state, and the alternative (free-form shapes) is far worse.
- Adding a sixth variant requires an OpenSpec change. That is the point: the variant set is part of the visual identity, and identity changes go through review.

---

## Decision 3 — Branding placement: three locations, one source

### The question

The vanilla prototype's branding rule is "swap three text nodes when cloning the template for a new app": the Sidebar brand name (`<span class="sb-brand-name">`), the Sidebar brand subtitle / tagline (`<span class="sb-brand-sub">`), and the Topbar dimmed prefix (`<span class="bc-dim">`) which must match the Sidebar brand name. The current Vue baseline has `core-navigation` already governing the Topbar dimmed prefix ("Topbar omits the app brand" — meaning the app brand only appears as a dimmed prefix, never as an emphasized breadcrumb segment), but it does not contract the relationship between the three placements. Without a single-source rule, a future clone will set the Sidebar brand name and forget to update the Topbar dimmed prefix, and the two will silently drift.

### The decision

The brand text SHALL be sourced from a single `useBrand()` composable (or equivalent `app.config` entry) and consumed by all three placements: (a) the `<SidebarBrand>` component's `name` slot, (b) the `<SidebarBrand>` component's `sub` slot for the tagline, and (c) the Topbar's dimmed prefix that visually echoes the Sidebar brand name. Hardcoding the brand text in any of the three placements is forbidden — every placement reads from `useBrand()`. This requirement documents the consistency rule across the three locations; the existing `core-navigation` rule that "Topbar omits the app brand" continues to govern the Topbar prefix's dimmed treatment and the absence of the brand from the breadcrumb proper.

### Alternatives considered

- **Read the brand text from `--brand-name` CSS variable.** Rejected. CSS variables are right for visual values (colors, sizes, radii); textual content belongs in JS so it can be localized, used in `<title>` tags, surfaced in toast messages, and (eventually) wired through `vue-i18n` once an app opts into multi-language. A composable is the right home.
- **Inline the brand text in each component and rely on PR review to keep them aligned.** Rejected. The whole point of the prototype's three-placement rule is that text drift is the most likely failure mode after a clone; relying on review is the same discipline the prototype already failed at twice.
- **Make the Topbar prefix optional per route.** Rejected. The dimmed prefix is the only place the brand surfaces in the Topbar — removing it on some routes would create the very "where am I in the app" confusion the prefix is meant to prevent. Cross-references to `core-navigation` keep the dimmed-prefix rule authoritative there.
- **Surface the tagline / sub via a separate composable from the brand name.** Considered. A single composable returning `{ name, sub }` is simpler and matches the prototype's intent (one swap, three placements, bundled together).

### Tradeoffs accepted

- Apps that want different brand text in the Sidebar vs the Topbar prefix (e.g. a long form name in the Sidebar and an abbreviated form in the Topbar) cannot do so by default. We accept this — the prototype's experience is that mismatched brand text reads as a bug, not a feature. If a real use case ever surfaces, a future change can extend `useBrand()` to expose `nameLong` and `nameShort` distinctly.
- The composable is contracted but not yet implemented in the template. This is artifact-only; implementation lands in the same change cycle that introduces the `<SidebarBrand>` component.

---

## Decision 4 — `<Badge>` palette: variants only, no raw colors

### The question

The vanilla prototype uses badges for status cells, KPI deltas, segmenter counts, and disabled-action explanation tags. Across those uses, the prototype settled on six semantic colors (info, success, warning, danger, neutral, brand), two tones (solid background or translucent tint), an optional colored dot for status-typed badges (matching the Select dot pattern from `core-forms`), and two sizes (`sm` 10px text for compact rows, `md` 12px text for emphasized states). The Vue baseline already has the underlying status tokens in `core-theming` but the `<Badge>` component's prop surface is not contracted. Without contracting the palette, the first stakeholder request for "a slightly different green for risk-level badges" will introduce a raw hex into a `<Badge color="...">` prop and break the entire status grammar.

### The decision

The shared `<Badge>` Vue component SHALL expose the props:

- `variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand'` — drives the color tokens (each variant maps to its semantic token plus the matching `-bg` translucent variant from `core-theming`).
- `tone: 'solid' | 'translucent'` — drives the background treatment. `solid` uses the variant's full color as the background; `translucent` uses the `-bg` token. Default `translucent` (the prototype's default for table cell badges).
- `dotColor?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand'` — optional. When set, prepends a colored dot to the badge text, matching the dot pattern used in the Select component for status-typed dropdowns. The dot color is independent of the badge variant so a `neutral` badge can carry a `success` dot.
- `size: 'sm' | 'md'` — `sm` is 10px text (default for table cell badges), `md` is 12px text (used for emphasized states such as the L1 page header status indicator).

Custom hex / rgb / arbitrary color values as `<Badge>` props are forbidden — `variant` is the only way to color a badge. Adding a seventh variant requires an OpenSpec change.

### Alternatives considered

- **Expose a free-form `color` prop accepting a CSS value.** Rejected. Free-form `color` is exactly the failure mode this requirement prevents; the moment one badge has a custom hex, the status grammar starts unraveling.
- **Drop the `tone` prop and pick translucent or solid per variant.** Rejected. The prototype uses both tones for the same variant (translucent for table cell density, solid for emphasis); collapsing the dimension would force one tone or the other. Two tones is the minimum useful surface.
- **Drop the `dotColor` prop and require status badges to use a dedicated `<StatusBadge>` component.** Considered. A dedicated component is more explicit but doubles the surface area for what is conceptually the same component with one extra optional prop. Keeping `dotColor` as an opt-in on the same component is cheaper and matches the prototype's existing pattern.
- **Allow more sizes (`xs` 8px / `lg` 14px).** Rejected. The prototype's sizing experience says two sizes is enough and a third invites mistuning. If a real use case surfaces, a future change adds a third size with deliberate intent.

### Tradeoffs accepted

- The fixed variant set means apps cannot ship a domain-specific color (e.g. a "risk" purple) without proposing a token + variant addition first. We accept this — domain colors that are not in the canonical palette dilute the cross-app status grammar that gives Ardua operators their at-a-glance read.
- The `dotColor` prop being independent of `variant` adds one cross-product (variant × dot) to the visual inventory. We accept the complexity because the prototype already uses it productively (e.g. a `neutral` badge with a `warning` dot when the badge represents a category but the underlying record is at risk).

---

## Open questions

1. **Light mode tokens for skeleton shimmer.** The current decision is dark-mode-only (per the existing `core-theming` baseline). When light mode lands as a V2 capability delta, the shimmer animation will need a paired light-mode keyframe; not contracted in this change.
2. **Reduced-motion accessibility for skeleton shimmer.** The shared `@keyframes` should respect `prefers-reduced-motion` and degrade to a static placeholder. Not explicitly required by this change but is the obvious correct implementation; a future change MAY make it explicit if any app ships without it.
3. **Badge with leading icon.** The prototype uses badges with leading icons in some places (e.g. `<Badge variant="warning"><AlertCircle /> Atención</Badge>`). The current decision exposes `dotColor` but not a generic leading-icon slot. If a real use case surfaces, a future change adds an `icon` slot to `<Badge>`.
4. **Brand assets beyond text.** This change contracts brand text only. Brand logo / favicon / OpenGraph image swaps are out of scope and likely live in a future `core-cloning-workflow` capability rather than `core-theming`.
