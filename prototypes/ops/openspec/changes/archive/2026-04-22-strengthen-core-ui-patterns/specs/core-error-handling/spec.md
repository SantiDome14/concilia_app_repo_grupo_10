## ADDED Requirements

### Requirement: Alert banners MUST surface persistent system-level messages

Alert banners SHALL be the canonical surface for persistent, in-page messages that convey system-level state (connection degraded, read-only mode, scheduled maintenance, unsaved changes, expiring auth token). Banners SHALL render below the Topbar and above the Main content, full-width. Banners SHALL NOT be used for single-operation feedback — that is the role of toasts, per the toast requirements in this capability. Banners are app-level state and persist across route navigations within the same session.

#### Scenario: Banner renders between Topbar and Main content

- **GIVEN** an alert banner is activated
- **WHEN** the shell renders
- **THEN** the banner renders immediately below the Topbar and above the Main content, full-width edge-to-edge

#### Scenario: Banner uses one of four semantic variants

- **GIVEN** an alert banner is being authored
- **WHEN** the developer selects its variant
- **THEN** the variant MUST be one of `info`, `warning`, `danger`, or `success`, each applying the matching semantic color tokens from `core-theming` (`--info` / `--warning` / `--danger` / `--success` plus their `-bg` translucent variants)

#### Scenario: Banner structure includes icon, title, description, optional action, and dismiss

- **GIVEN** a banner is being rendered
- **WHEN** its content layout resolves
- **THEN** the banner renders: a leading variant-specific icon, a bold short title, an optional one-line description, an optional action button on the right (primary variant colored by banner variant), and a dismiss `×` button on the far right when the banner is dismissible

#### Scenario: Dismissible banners can be closed by the user

- **GIVEN** a dismissible banner (default) is open
- **WHEN** the user clicks the dismiss `×` button
- **THEN** the banner unmounts and its dismissal is recorded by banner ID for the rest of the session — the same banner does not re-appear after subsequent route changes within the session

#### Scenario: Non-dismissible banners omit the dismiss control

- **GIVEN** a banner represents an ongoing system state the user cannot resolve (e.g. `"Modo solo lectura hasta las 22:00"`)
- **WHEN** the banner renders
- **THEN** the dismiss `×` button is NOT rendered and the banner persists until the underlying condition is resolved

#### Scenario: Multiple active banners stack vertically

- **GIVEN** two banners are active simultaneously
- **WHEN** the shell renders
- **THEN** the banners stack vertically between the Topbar and the Main content, most recently activated banner on top

#### Scenario: Banners are forbidden for single-operation feedback

- **GIVEN** a developer considers using a banner to confirm a record create / edit / delete result
- **WHEN** the developer reviews the capability contract
- **THEN** the banner pattern MUST NOT be used for that case — single-operation feedback belongs in a toast (per the toast requirements); banners are reserved for persistent system-level states
