# core-actions-menu Specification

## Purpose

Define the per-row actions menu pattern used by every Ardua core table. The actions menu is the single place where record-level operations are exposed (process, confirm, generate, assign, cancel, etc.). Consistency in positioning, enablement, and feedback is mandatory because this component is the primary operational interface in the core.

## Requirements

### Requirement: Actions menu MUST render via a portal component

The actions menu SHALL be rendered through the shared `ActionsMenu.vue` component, which uses `<Teleport to="body">` and `position: fixed` to escape parent containers with `overflow: hidden`. Inline dropdowns placed inside a table cell are forbidden.

#### Scenario: Menu escapes the table's overflow

- **GIVEN** a table wrapper with `overflow: hidden`
- **WHEN** the user opens the actions menu on any row
- **THEN** the menu is teleported to `document.body` and renders with `position: fixed`, ignoring the overflow of the table wrapper

#### Scenario: Menu always shows all actions regardless of the row's position

- **GIVEN** a table with many rows where the last visible row is near the viewport bottom
- **WHEN** the user opens the actions menu on that last row
- **THEN** every action item remains fully visible — the menu is never truncated by the table boundary or the viewport

### Requirement: Actions menu MUST compute smart vertical positioning

The menu SHALL compute its position dynamically based on the trigger's bounding rect and the viewport. Default opens downward; if the available space below is insufficient, the menu SHALL flip upward.

#### Scenario: Menu opens downward when space below is sufficient

- **GIVEN** the trigger has at least (menu height + offset + 8px) of space below it
- **WHEN** the user opens the menu
- **THEN** the menu renders directly below the trigger with a small offset

#### Scenario: Menu flips upward when space below is insufficient

- **GIVEN** the space below the trigger is less than the menu height but the space above is sufficient
- **WHEN** the user opens the menu
- **THEN** the menu renders directly above the trigger

#### Scenario: Menu clamps to viewport when neither side has comfortable space

- **GIVEN** neither the space above nor below can fully accommodate the menu
- **WHEN** the user opens the menu
- **THEN** the menu picks the side with more space and clamps its position with an 8px margin from the viewport edge

#### Scenario: Menu flips horizontally when it would overflow the right edge

- **GIVEN** the menu's computed left position plus its width would exceed the viewport width minus 8px
- **WHEN** the menu renders
- **THEN** it re-anchors to the right edge of the trigger rather than the left

### Requirement: Actions menu MUST close on scroll, resize, outside click, and ESC

The menu SHALL respond to all standard dismissal triggers. Scroll on any ancestor, window resize, click outside the menu and trigger, and the ESC key SHALL all close the menu.

#### Scenario: Scrolling closes the menu

- **GIVEN** the menu is open
- **WHEN** any scroll event fires outside the menu itself
- **THEN** the menu emits `close` and unmounts

#### Scenario: Resize recomputes position

- **GIVEN** the menu is open
- **WHEN** the viewport is resized
- **THEN** the menu's position is recomputed against the new viewport dimensions

#### Scenario: Clicking outside closes the menu

- **GIVEN** the menu is open
- **WHEN** the user clicks anywhere outside the menu and outside its trigger
- **THEN** the menu emits `close` and unmounts

#### Scenario: Pressing ESC closes the menu

- **GIVEN** the menu is open
- **WHEN** the user presses the `Escape` key
- **THEN** the menu emits `close` and unmounts

### Requirement: Action enablement MUST follow the two-rule pattern

Every action item SHALL be evaluated against two independent rules: (1) user capabilities, and (2) record intrinsic characteristics. An action is enabled only when BOTH rules pass. When either rule fails, the item MUST render in a disabled state with a tag and a tooltip reason.

#### Scenario: Capability check drives the Permiso tag

- **GIVEN** the user's role does not include the required capability for an action
- **WHEN** the menu renders that action
- **THEN** the item renders disabled with the `Permiso` tag and a tooltip explaining the role requirement

#### Scenario: Record state check drives the Estado / Categoría / Tipo tag

- **GIVEN** the record's intrinsic state (status, category, type) does not satisfy the action's precondition
- **WHEN** the menu renders that action
- **THEN** the item renders disabled with the relevant `Estado` / `Categoría` / `Tipo` tag and a tooltip explaining the constraint

#### Scenario: Both rules pass

- **GIVEN** the user has the required capability AND the record satisfies the action's precondition
- **WHEN** the menu renders that action
- **THEN** the item renders enabled with no tag, and the hover and focus states are interactive

#### Scenario: Planned but not yet released

- **GIVEN** an action is declared in the spec but not yet implemented for the current release
- **WHEN** the menu renders that action
- **THEN** the item renders disabled with the `V2` tag and a tooltip stating the planned availability

### Requirement: Disabled items MUST expose their reason via native tooltip

Disabled action items SHALL expose their enablement reason through the native `title` HTML attribute so that the user can understand WHY an action is unavailable without additional UI clutter.

#### Scenario: Hover reveals the reason

- **GIVEN** a disabled action item with a tooltip reason
- **WHEN** the user hovers over the item
- **THEN** the browser renders the `title` attribute as a native tooltip containing the enablement reason

#### Scenario: Reason is concise and actionable

- **GIVEN** an action is being marked as disabled
- **WHEN** the developer sets the `title` attribute
- **THEN** the reason MUST be a single sentence that either explains the constraint (`Solo disponible para registros PENDING`) or the missing permission (`Tu rol actual no permite asignar responsables`)

### Requirement: Actions menu MUST expose a header and logical separators

The menu SHALL render an uppercase label header at the top (e.g. `Acciones del registro`) and use horizontal separators to group actions into semantic clusters: state-changing actions, generation/assignment actions, and destructive actions.

#### Scenario: Header clarifies the menu's scope

- **GIVEN** the menu opens for a record
- **WHEN** the menu content renders
- **THEN** the first child is an uppercase label that describes the scope of the actions (e.g. `Acciones del registro`)

#### Scenario: Destructive actions are visually separated

- **GIVEN** the menu contains a destructive action (delete, cancel, void)
- **WHEN** the menu renders
- **THEN** the destructive action is placed after a separator and uses the danger text color

### Requirement: Actions column in tables MUST NOT propagate row clicks

The actions column `<td>` and its inner menu SHALL stop click propagation so that opening the menu or clicking a menu item never triggers the row-click handler (detail modal or navigation).

#### Scenario: Clicking the actions button does not open the detail

- **GIVEN** a table row with an actions cell and a row-click handler
- **WHEN** the user clicks the actions trigger or any item in the menu
- **THEN** the row-click handler (detail modal) is NOT triggered

### Requirement: Actions menu MUST use anchor refs, not position hard-coding

The component SHALL accept a single `anchor: HTMLElement | null` prop. Pages SHALL pass a template ref to the trigger button so the menu can compute its position from the trigger's bounding rect.

#### Scenario: Single menu instance is re-anchored per open row

- **GIVEN** a page renders a table with N rows
- **WHEN** the page template is composed
- **THEN** the page renders a SINGLE `<ActionsMenu>` instance and passes the anchor of the currently open row — N separate menu instances are forbidden

#### Scenario: Trigger refs are collected per row

- **GIVEN** the page renders each row in the table
- **WHEN** the row template renders the trigger button
- **THEN** the page assigns a ref to the trigger button via `:ref="(el) => setActionTrigger(record.id, el)"` so the active anchor can be resolved on open
