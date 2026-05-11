## ADDED Requirements

### Requirement: Page header actions MUST be limited to a maximum of three primary CTAs

The L1 page header SHALL expose at most three call-to-action buttons in the actions area. The rightmost CTA MUST use the `primary` button variant; any additional CTAs MUST use the `ghost` variant. Each CTA MUST represent a top-level action on the module as a whole (e.g. "Nuevo registro", "Exportar", "Configurar columnas"). Row-level or bulk-selection actions MUST NOT be placed in the page header — those belong in the per-row actions menu (`core-actions-menu`) or in a future bulk-action bar pattern.

#### Scenario: Single primary CTA is the canonical case

- **GIVEN** a module with one top-level action (e.g. "Nuevo registro")
- **WHEN** the L1 page header renders
- **THEN** exactly one `primary` button is shown in the actions area with a leading icon and a verb-first label

#### Scenario: Two or three CTAs use one primary plus ghost variants

- **GIVEN** a module with two or three top-level actions (e.g. "Nuevo", "Importar", "Exportar")
- **WHEN** the L1 page header renders
- **THEN** the rightmost CTA uses the `primary` variant and the others use the `ghost` variant, ordered from lower importance on the left to the primary action on the right

#### Scenario: A fourth CTA is rejected during review

- **GIVEN** a developer proposes adding a fourth CTA to a page header
- **WHEN** the PR is opened
- **THEN** the PR MUST be rejected during review — the capability is non-compliant; secondary CTAs MUST be relocated into a menu, into the row-level actions menu, or into a separate section of the page

#### Scenario: Row-level action is rejected in the header

- **GIVEN** a developer places a row-level action (e.g. "Aprobar seleccionados", "Eliminar registro actual") in the page header
- **WHEN** the PR is opened
- **THEN** the PR MUST be rejected during review — row-level actions belong in the per-row actions menu, not the page header

#### Scenario: Narrow viewport collapses secondary CTAs into an overflow menu

- **GIVEN** a page header with 2 or 3 CTAs rendered on a narrow viewport where all CTAs do not fit inline
- **WHEN** the header computes its layout
- **THEN** the `primary` CTA remains inline and the `ghost` CTAs collapse into an overflow menu triggered by a `⋯` button on the header's right edge
