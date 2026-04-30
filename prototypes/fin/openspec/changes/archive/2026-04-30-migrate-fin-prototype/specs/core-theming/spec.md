## MODIFIED Requirements

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

## ADDED Requirements

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
