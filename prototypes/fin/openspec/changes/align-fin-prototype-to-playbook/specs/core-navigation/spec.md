## ADDED Requirements

### Requirement: Sidebar MUST stack above the Dialog/Sheet overlay so navigation is reachable while a modal is open

The Sidebar `<nav>` element SHALL render at `z-[600]` and its collapse-toggle button SHALL render at `z-[601]`, both ABOVE the canonical `<DialogOverlay>` / `<SheetOverlay>` stacking level (`z-[500]`). The operator MUST be able to click any Sidebar entry to navigate to a different module while a centred Dialog or right-side Sheet is open, with the side effect that the modal's parent component unmounts cleanly on route change.

The Sidebar account-menu dropdown SHALL render at `z-[200]` — BELOW the modal overlay — so a Dialog opened on top of an expanded account menu correctly shadows the menu rather than the reverse.

The canonical z-index ladder for navigation and overlay surfaces is normative:

| Element | Class | Layer |
| --- | --- | --- |
| Topbar / Sidebar `<nav>` | `z-[600]` | Navigation (always wins) |
| Sidebar collapse toggle | `z-[601]` | Navigation toggle on top of its own bg |
| `<DialogContent>` / `<SheetContent>` | `z-[501]` | Modal content above overlay, below navigation |
| `<DialogOverlay>` / `<SheetOverlay>` | `z-[500]` | Body-blocking overlay |
| Sidebar account menu | `z-[200]` | Below modal overlay |

#### Scenario: Navigation while a Dialog is open

- **GIVEN** the operator opens a Dialog from any page action
- **AND** the Dialog mounts its `<DialogOverlay>` (at `z-[500]`) and `<DialogContent>` (at `z-[501]`)
- **WHEN** the operator clicks a Sidebar module entry
- **THEN** the click reaches the Sidebar entry (Sidebar `<nav>` is at `z-[600]`)
- **AND** the router navigates to the new module
- **AND** the Dialog unmounts as part of the outgoing page's teardown

#### Scenario: Navigation while a right-side Sheet drill-down is open

- **GIVEN** the operator opens a right-side `<Sheet>` (drawer) for a record drill-down
- **AND** the Sheet mounts its `<SheetOverlay>` at `z-[500]`
- **WHEN** the operator clicks the collapse-toggle button of the Sidebar
- **THEN** the toggle responds (Sidebar toggle is at `z-[601]`)
- **AND** the Sidebar transitions between collapsed and expanded states without the Sheet blocking the click

#### Scenario: Account menu correctly shadowed by a modal

- **GIVEN** the operator has the Sidebar account menu expanded (account menu at `z-[200]`)
- **WHEN** a Dialog opens (overlay at `z-[500]`)
- **THEN** the Dialog overlay sits ABOVE the account menu visually
- **AND** clicking the Dialog's content interacts with the Dialog, not with the menu underneath

#### Scenario: Overlay still blocks body interaction

- **GIVEN** a Dialog is open
- **WHEN** the operator clicks anywhere on the page body that is NOT the Sidebar nor the Dialog content
- **THEN** the click is intercepted by the `<DialogOverlay>` at `z-[500]`
- **AND** the body click does not reach the underlying page content
