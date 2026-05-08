## ADDED Requirements

### Requirement: Theming MUST be driven by CSS custom properties in `:root`

All design tokens SHALL be defined as CSS custom properties in the `:root` selector of `src/styles/globals.css`. Hardcoding colors, font sizes, or spacing values in components is forbidden — every value MUST reference a token.

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

Success, warning, danger, and info states SHALL use dedicated tokens with both a solid and a translucent background variant. Each semantic color MUST have a paired `-bg` for translucent surfaces.

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

The core theme SHALL be dark by default, with no light-mode toggle in the initial release. All tokens SHALL be tuned for dark surfaces; light mode MAY be introduced as a capability delta in a future change proposal.

#### Scenario: First render is dark

- **GIVEN** the application bootstraps
- **WHEN** the first paint occurs
- **THEN** the dark theme tokens apply from the very first paint, without a pre-render flicker

#### Scenario: No light/dark toggle in current release

- **GIVEN** a user navigating the app
- **WHEN** the user searches for a theme-switching control
- **THEN** none is exposed — the toggle is a planned V2 capability governed by a future `core-theming` delta

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
