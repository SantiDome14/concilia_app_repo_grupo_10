# core-theming Specification

## Purpose

Define the design token system, brand theming mechanism, and color palette rules for every Ardua core frontend. The theming layer is the single file (`src/styles/globals.css`) that governs the entire visual identity — changing one variable (`--brand`) must re-theme the whole application.
## Requirements
### Requirement: Theming MUST be driven by CSS custom properties in `:root`

All design tokens SHALL be defined as CSS custom properties in the `:root` selector of `src/styles/globals.css`. Hardcoding colors, font sizes, or spacing values in components is forbidden — every value must reference a token.

#### Scenario: Components consume tokens, not literal values

- **GIVEN** a component is being authored
- **WHEN** the developer applies a color, border, or spacing style
- **THEN** the style references a CSS variable (via Tailwind's `@theme` mapping) — never a raw hex, rgb, or px value outside the token set

#### Scenario: Adding a new value requires adding a token first

- **GIVEN** a designer or developer needs a visual value not covered by existing tokens
- **WHEN** the value is introduced into the codebase
- **THEN** the value MUST be added as a CSS custom property in `globals.css` before being used in any component

### Requirement: Brand color MUST be a single variable per app

Each app SHALL define its brand identity by setting the `--brand` and `--brand-bg` custom properties in `:root`. Changing these two values SHALL re-theme the entire application — sidebar active state, primary buttons, focus rings, badges, and any surface that uses the brand tone.

#### Scenario: Changing --brand propagates everywhere

- **GIVEN** an app with its current brand HSL value
- **WHEN** the `--brand` variable is changed to a new HSL value
- **THEN** every UI element that references `bg-brand`, `text-brand`, or `border-brand` renders with the new color without further changes

#### Scenario: --brand-bg is the translucent variant

- **GIVEN** a surface needs a subtle brand tint (active sidebar entry, brand-filled badge)
- **WHEN** the component picks its background token
- **THEN** it uses `--brand-bg`, which is the same hue as `--brand` at low alpha

### Requirement: Module-specific brand colors MUST follow the canonical palette

Each Ardua core module SHALL use the pre-defined brand color in its app. These mappings are fixed to preserve instant visual recognition across modules.

#### Scenario: Module palette mapping

- **GIVEN** a new Ardua core app is being scaffolded from the template
- **WHEN** the `--brand` variable is set in `globals.css`
- **THEN** its value follows the canonical palette:
  - `OPS` → red `0 84% 60%`
  - `TRD` → blue `217 91% 60%`
  - `FIN` → green `142 71% 45%`
  - `CLP` → purple `258 90% 74%`
  - `COM` → amber `38 92% 50%`
  - `LEX` → teal `172 66% 50%`

### Requirement: Surface and border tokens MUST define a four-step hierarchy

The neutral palette SHALL expose a four-step surface hierarchy (`--bg` → `--surf` → `--card` → `--card-2`) and a four-step border hierarchy (`--b1` → `--b4`). Components SHALL select the appropriate step based on their nesting depth.

#### Scenario: Surface hierarchy mirrors depth

- **GIVEN** components at different nesting depths
- **WHEN** each component picks its background token
- **THEN** outermost backgrounds use `--bg`, sidebar/topbar use `--surf`, cards use `--card-2`, and nested cards use `--card`

#### Scenario: Border hierarchy mirrors emphasis

- **GIVEN** a component needs a border treatment
- **WHEN** the component picks its border token
- **THEN** subtle borders use `--b1`, standard borders use `--b2`, emphasized borders use `--b3`, and high-emphasis borders use `--b4`

### Requirement: Text colors MUST use the four-step contrast ramp

Text colors SHALL be drawn exclusively from the four-step contrast ramp: `--t1` (primary), `--t2` (secondary), `--t3` (tertiary), `--t4` (muted). Raw greyscale hex values in components are forbidden.

#### Scenario: Primary text uses --t1

- **GIVEN** a component renders its main label, heading, or value
- **WHEN** the component applies its text color
- **THEN** it uses `text-t-1`

#### Scenario: Muted / decorative text uses --t4

- **GIVEN** a component renders a hint, placeholder, or metadata label
- **WHEN** the component applies its text color
- **THEN** it uses `text-t-4`

### Requirement: Status colors MUST be drawn from the semantic palette

Success, warning, danger, and info states SHALL use dedicated tokens with both a solid and a translucent background variant. Each semantic color has a paired `-bg` for translucent surfaces.

#### Scenario: Success badge uses success tokens

- **GIVEN** a badge, icon, or surface signals a successful state
- **WHEN** the component picks its color tokens
- **THEN** it uses `--success` for text / border and `--success-bg` for the translucent surface

#### Scenario: Danger surfaces use danger tokens

- **GIVEN** a destructive action or error surface is being rendered
- **WHEN** the component picks its color tokens
- **THEN** it uses `--danger` and `--danger-bg`

#### Scenario: Status mapping is consistent

- **GIVEN** a domain status value needs to be mapped to a visual token
- **WHEN** the mapping is authored
- **THEN** it follows: `ACTIVE → success`, `PENDING → warning`, `INACTIVE → neutral`, `ERROR → danger`, `INFO → info`

### Requirement: Theme MUST default to dark mode

The core theme SHALL default to dark mode on first paint. Apps MAY ALSO offer a user-selectable theme toggle exposing the three canonical choices `system | light | dark` (per the new Settings · Appearance preference defined in `core-modulo-genericos`). When the user picks `system`, the resolved theme follows the OS-level `prefers-color-scheme` media query and re-resolves whenever the OS preference changes mid-session. The selected appearance MUST persist across page reloads (canonical store: `localStorage` under a single namespaced key wired by the `usePreferencesStore` Pinia store).

The theme is applied as a class on `<html>`: `dark` when the resolved theme is dark, `light` when light. The two classes MUST be mutually exclusive and the engine MUST toggle them in lockstep so a stale class never lingers.

For light mode, every token defined under the dark `:root {}` block MUST have a counterpart override under `:root.light {}`. Surfaces invert (`--bg`, `--surf`, `--card`, `--card-2`); the text ramp swaps polarity (`--t-1` darkest, `--t-4` lightest); border ladder remains progressive but in the opposite direction. Brand and semantic status colors (`--success`, `--warning`, `--danger`, `--info`) keep their HSL — they read correctly on both backgrounds.

#### Scenario: First render is dark by default

- **GIVEN** an app bootstraps for the first time on a fresh browser (no prior preference)
- **WHEN** the first paint occurs
- **THEN** the dark theme tokens apply from the very first paint, `<html>` carries the `dark` class, and there is no pre-render flicker

#### Scenario: User picks Light from the Settings dialog

- **GIVEN** a user opens Settings · General · Appearance and clicks the Light option
- **WHEN** the selection is committed
- **THEN** `<html>` immediately swaps the `dark` class for `light`, the light-mode token block applies, the choice is persisted to `localStorage`, and a subsequent page reload renders in light without further interaction

#### Scenario: System mode follows the OS preference live

- **GIVEN** a user has selected `system` and the OS-level `prefers-color-scheme` is currently `dark`
- **WHEN** the OS preference flips to `light` mid-session (e.g. the user toggles macOS Appearance)
- **THEN** the app's resolved theme flips to `light` automatically AND the corresponding token block applies AND the persisted preference still records `system` (not `light`)

#### Scenario: Light theme overrides every surface and text token

- **GIVEN** the `light` class is on `<html>`
- **WHEN** any component reads `bg-card-2`, `text-t-1`, `text-t-3`, `border-b-1`, etc.
- **THEN** the values come from the `:root.light {}` block and the surface/text relationships preserve readable contrast (no token resolves to `var(--bg)` of the dark block)

### Requirement: Typography MUST use DM Sans as the primary font family

The application SHALL use DM Sans as its primary typeface, loaded from Google Fonts with the opsz axis. Fallback chain SHALL be `system-ui, sans-serif`. Font sizes and weights SHALL come exclusively from the token system.

#### Scenario: DM Sans loads on bootstrap

- **GIVEN** the application bootstraps
- **WHEN** the first paint occurs
- **THEN** DM Sans is preloaded from Google Fonts and applied globally via `html, body` styles

#### Scenario: Font weight stops are canonical

- **GIVEN** a component needs a heavier or lighter weight
- **WHEN** the developer picks the weight class
- **THEN** it picks from the canonical stops (400 regular, 500 medium, 600 semibold, 700 bold, 800 extrabold) — custom weights are forbidden

### Requirement: Scroll containers MUST use the subtle scrollbar utility globally

Every scroll container in the application — including the Main content area, every table wrapper, the Drawer, the modal body, and the Sidebar — SHALL apply the canonical subtle scrollbar styling: `::-webkit-scrollbar` width 8px, `::-webkit-scrollbar-thumb` background tied to the `--b3` border token with rounded corners, plus `scrollbar-width: thin` and `scrollbar-color: var(--b3) transparent` for Firefox. The styling SHALL be implemented as a global `.scroll-subtle` utility class declared once in `src/styles/globals.css` (or equivalently applied via the `<body>` selector with cascading inheritance to every scroll container). Per-component scrollbar overrides are forbidden — if a container scrolls, it scrolls subtly using the canonical styling.

#### Scenario: Every scroll container inherits the canonical scrollbar styling

- **GIVEN** the Main content area, a table wrapper, a Drawer, a modal body, or the Sidebar renders with content that overflows
- **WHEN** the container's scrollbar paints
- **THEN** the scrollbar SHALL be 8px wide with a thumb that uses `var(--b3)` and rounded corners on WebKit browsers, and SHALL use `scrollbar-width: thin` plus `scrollbar-color: var(--b3) transparent` on Firefox — without any local rule needing to be re-declared in the container's component

#### Scenario: Per-component scrollbar overrides are rejected

- **GIVEN** a developer attempts to declare a custom `::-webkit-scrollbar` rule (or sets a different `scrollbar-color` / `scrollbar-width`) inside a single component's styles
- **WHEN** the change is reviewed
- **THEN** the override MUST be rejected — every scroll surface MUST use the global `.scroll-subtle` utility (or the `<body>` cascade), and any genuinely new scrollbar treatment MUST be proposed as an OpenSpec change to this requirement

#### Scenario: The scrollbar uses a design token, never a raw color

- **GIVEN** the canonical scrollbar styling is being authored or audited
- **WHEN** the thumb color is selected
- **THEN** the value SHALL reference the `--b3` token from the four-step border ramp — raw hex, rgb, or color-literal values are forbidden, in keeping with the token-driven theming rule already established in this capability

### Requirement: `<Skeleton>` component MUST expose the canonical variant set

The shared `<Skeleton>` Vue component SHALL expose a closed variant set: `variant: 'card' | 'button' | 'chart' | 'circle' | 'row'`. The shimmer animation SHALL be a single shared `@keyframes` declaration referenced by the base `<Skeleton>` component — every variant SHALL reuse the same animation, only differing in shape (dimensions, border radius, internal layout). Per-page custom skeleton shapes are forbidden: if a new shape is genuinely needed, it MUST be proposed as a new variant via an OpenSpec change to this requirement, never inlined per page.

#### Scenario: Loading states pick from the canonical variant set

- **GIVEN** a page renders a loading state for a KPI card, a CTA placeholder, a chart block, an avatar / dot, or a table row
- **WHEN** the developer authors the skeleton
- **THEN** the developer SHALL render `<Skeleton variant="card" />`, `<Skeleton variant="button" />`, `<Skeleton variant="chart" />`, `<Skeleton variant="circle" />`, or `<Skeleton variant="row" />` — picking from the closed set of five variants

#### Scenario: All variants share the same shimmer keyframes

- **GIVEN** any two `<Skeleton>` instances render on the page with different variants
- **WHEN** their shimmer animations play
- **THEN** both instances SHALL reference the same `@keyframes` declaration — the loading rhythm is uniform across the page and across modules, with no forked or per-variant animation timings

#### Scenario: A new shape requires an OpenSpec change

- **GIVEN** a developer needs a skeleton shape not covered by `card | button | chart | circle | row`
- **WHEN** the developer considers adding a custom skeleton block inline
- **THEN** the inline shape MUST be rejected and a new `variant` value MUST be proposed via an OpenSpec change that updates this requirement and the `<Skeleton>` component implementation

### Requirement: Brand text MUST be sourced from a single `useBrand()` composable across the three placements

The application brand text SHALL be sourced from a single `useBrand()` composable (or an equivalent `app.config` entry) and consumed by all three branding placements: (a) the `<SidebarBrand>` component's `name` slot rendering the brand name, (b) the `<SidebarBrand>` component's `sub` slot rendering the brand subtitle / tagline, and (c) the Topbar's dimmed prefix that visually echoes the Sidebar brand name. Hardcoding the brand text in any of the three placements is forbidden — every placement SHALL read from `useBrand()`. This requirement documents the consistency rule across the three locations; the existing `core-navigation` requirement that the Topbar omits the app brand from the emphasized breadcrumb continues to govern the Topbar dimmed prefix's visual treatment.

#### Scenario: A brand swap is one edit, not three

- **GIVEN** an app is being cloned from the template for a new module and the brand text needs to change
- **WHEN** the developer updates the brand
- **THEN** the change SHALL be a single edit to `useBrand()` (or the `app.config` entry it reads), and all three placements — `<SidebarBrand>` name slot, `<SidebarBrand>` sub slot, Topbar dimmed prefix — SHALL render the new text without any further code change

#### Scenario: Hardcoded brand text in any placement is rejected

- **GIVEN** a developer hardcodes the brand text directly inside `<SidebarBrand>`, the Topbar, or any other component instead of calling `useBrand()`
- **WHEN** the change is reviewed
- **THEN** the hardcoded text MUST be rejected — every placement consuming the brand text MUST read from `useBrand()`

#### Scenario: Topbar dimmed prefix matches the Sidebar brand name

- **GIVEN** the application shell renders both the Sidebar and the Topbar
- **WHEN** the Topbar's dimmed brand prefix paints
- **THEN** its text SHALL match the `name` value returned by `useBrand()` exactly — and the existing `core-navigation` rule that the emphasized breadcrumb omits the app brand continues to apply (the dimmed prefix is the visual echo of the Sidebar brand, not a duplicated breadcrumb segment)

### Requirement: `<Badge>` component MUST follow the variant-driven palette contract

The shared `<Badge>` Vue component SHALL expose a strictly typed prop surface: `variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand'`, `tone: 'solid' | 'translucent'` (default `translucent`), `dotColor?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'brand'` (optional, prepends a colored dot to the badge text matching the Select dot pattern), and `size: 'sm' | 'md'` (where `sm` is 10px text for table cell density and `md` is 12px text for emphasized states). Each `variant` value SHALL map to its corresponding semantic token from `core-theming` (`--info` / `--success` / `--warning` / `--danger` / a neutral token from the surface ramp / `--brand`) plus the matching `-bg` translucent variant. Custom hex, rgb, or arbitrary color literal props are forbidden — `variant` is the only way to color a badge.

#### Scenario: Badges color through the variant prop, never through raw colors

- **GIVEN** a developer renders a badge in a table cell, KPI delta, segmenter count, or disabled-action explanation tag
- **WHEN** the developer authors the component instance
- **THEN** the badge SHALL be `<Badge variant="success" />` (or one of the six allowed variants) — passing a raw hex, rgb, or color literal as a prop MUST be rejected

#### Scenario: Tone and size are picked from the closed value set

- **GIVEN** a badge needs a translucent background for a dense table row, or a solid background for an emphasized header state
- **WHEN** the developer authors the component instance
- **THEN** the badge SHALL set `tone="translucent"` (default) or `tone="solid"`, and SHALL set `size="sm"` (10px text for table cells) or `size="md"` (12px text for emphasized states) — no other tone or size values are permitted

#### Scenario: Optional dotColor prepends a status dot independent of the variant

- **GIVEN** a status-typed badge needs to surface a state cue with a colored dot (matching the Select dot pattern from `core-forms`)
- **WHEN** the developer renders `<Badge variant="neutral" :dotColor="'success'" />` or any other variant + dotColor combination
- **THEN** the badge SHALL render a colored dot in front of the text using the `dotColor` value's semantic token, independent of the `variant` value — so a `neutral` badge MAY carry a `success` dot, a `brand` badge MAY carry a `warning` dot, and so on

#### Scenario: A new variant requires an OpenSpec change

- **GIVEN** a stakeholder requests a domain-specific color (e.g. "a risk-level purple") that is not in `info | success | warning | danger | neutral | brand`
- **WHEN** the developer considers adding the color directly inside `<Badge>` props
- **THEN** the inline color MUST be rejected and a new `variant` value MUST be proposed via an OpenSpec change that adds the matching semantic token to `core-theming` and the variant value to this requirement

### Requirement: UI primitives MUST source surface and border colors from tokens, never from hex literals

Every UI primitive (`<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`, `<Button>`, dialog/sheet wrappers) MUST source its background, border, and text colors from the design-token system (`bg-card`, `bg-card-2`, `bg-surf`, `text-t-{1..4}`, `border-b-{1..4}`, `text-brand`, `text-info`, etc.). Hex literals such as `bg-[#111]`, `bg-[#222]`, hover variants like `hover:bg-[#333]`, and inline `style="background:#..."` are FORBIDDEN in framework primitives — they bypass the token system and stop responding to the appearance toggle.

The same applies to derived components (`<ManifestField>`, `<ManifestActionsMenu>`, `<KanbanCard>`, `<KanbanColumn>`, `<CommentsThread>`, etc.) — any color expressed as a literal MUST be promoted to a token first.

#### Scenario: Input renders with theme-token surfaces in both modes

- **GIVEN** a `<Input>` rendered with no extra classes
- **WHEN** the user toggles between Dark and Light via Settings
- **THEN** the input's background follows `--card-2` (dark in dark mode, near-white in light mode) AND the border follows `--b-2` AND the placeholder follows `--t-4`

#### Scenario: Hex-literal background in a primitive is rejected

- **GIVEN** a developer adds `bg-[#1a1a1a]` to a UI primitive's class string
- **WHEN** the change is reviewed
- **THEN** the change MUST be rejected and the hex literal replaced by the matching token (or a new token added to `globals.css` if none fits)

