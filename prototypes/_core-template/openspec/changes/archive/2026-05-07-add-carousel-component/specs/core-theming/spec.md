## ADDED Requirements

### Requirement: Carousel dot indicators MUST resolve through `--brand` and `--b3` tokens

The dot indicators rendered by `<Carousel>` (the canonical multi-item slide gallery in `core-layout`) SHALL resolve their visual states through `core-theming` tokens. The active dot's background SHALL resolve to `var(--brand)` (the active app's brand color); the inactive dots' background SHALL resolve to `var(--b3)` (the third-step border / muted border token). Hover state on inactive dots MAY brighten to `var(--b4)`. Hardcoded hex / rgb values for dot states are forbidden.

#### Scenario: Active dot uses --brand and inactive uses --b3

- **GIVEN** a `<Carousel>` with three dots and the active slide is index 1
- **WHEN** the dots render
- **THEN** the dot at index 1 fills with `var(--brand)`; dots at index 0 and 2 fill with `var(--b3)`

#### Scenario: Hardcoded dot colors are rejected

- **GIVEN** a developer attempts to style the dots with hex values (e.g., `background-color: #1B1B64`)
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every dot state SHALL resolve through `--brand` / `--b3` / `--b4` tokens; raw colors break per-app brand portability

#### Scenario: Carousel inherits the app's brand automatically

- **GIVEN** the same `<Carousel>` component used in TRD (blue brand) and FIN (green brand)
- **WHEN** each app renders the carousel with no prop overrides
- **THEN** TRD's active dot is blue (resolved from TRD's `--brand`) and FIN's active dot is green (resolved from FIN's `--brand`) — with no code change in the carousel itself
