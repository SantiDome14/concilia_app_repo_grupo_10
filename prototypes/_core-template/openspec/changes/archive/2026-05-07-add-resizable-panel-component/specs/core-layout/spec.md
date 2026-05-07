## ADDED Requirements

### Requirement: ResizablePanel component MUST provide horizontal and vertical split-pane layouts with persisted dimensions

The `<ResizablePanel>` component SHALL be the single canonical split-pane primitive in the financial-core. It SHALL accept props `orientation: 'horizontal' | 'vertical'` (default `'horizontal'`; `horizontal` splits left/right with a vertical splitter, `vertical` splits top/bottom with a horizontal splitter), `defaultSize: number` (initial size of panel-1 as a percentage 0–100; default `50`), `min1?: number | string` and `min2?: number | string` (minimum sizes per panel; numbers are percentages, strings ending in `'px'` are pixels — default `'200px'`), `max1?: number | string` and `max2?: number | string` (maximum sizes per panel; same encoding as min — no default cap), `storageKey?: string` (when set, the current size is persisted to `localStorage` under `resizable-panel:{storageKey}` and restored on mount). The component SHALL render two slots `<template #panel-1>` and `<template #panel-2>` separated by a draggable handle. The handle SHALL be implemented via `vueuse/useDraggable` (no external drag library beyond vueuse). The handle SHALL render a visible affordance (4px-wide bar with hover and focus states resolved through `core-theming` tokens). Keyboard support SHALL be mandatory: when the handle is focused, `←/→` (horizontal orientation) or `↑/↓` (vertical orientation) move the split by 5% per press, with `Shift` held increasing to 10%. Hardcoded colors / paddings are forbidden — every visual resolves through `core-theming`. Nesting `<ResizablePanel>` inside another `<ResizablePanel>`'s slot SHALL be permitted; persisting nested layouts requires distinct `storageKey` per instance.

#### Scenario: Horizontal split renders two panels side by side

- **GIVEN** a `<ResizablePanel orientation="horizontal" :defaultSize="40">` with two named slots
- **WHEN** the component renders
- **THEN** panel-1 occupies 40% of the container width on the left, panel-2 occupies 60% on the right, and a vertical drag handle separates them; the container takes the full height of its parent

#### Scenario: Vertical split renders two panels stacked

- **GIVEN** a `<ResizablePanel orientation="vertical" :defaultSize="60">`
- **WHEN** the component renders
- **THEN** panel-1 occupies 60% of the container height on top, panel-2 occupies 40% below, and a horizontal drag handle separates them

#### Scenario: Drag resizes panels respecting min and max constraints

- **GIVEN** a `<ResizablePanel :min1="'200px'" :max1="'600px'" :defaultSize="50">` and the user drags the handle to make panel-1 larger
- **WHEN** the drag would push panel-1 beyond 600px
- **THEN** the drag clamps at 600px; releasing the mouse with the cursor further right does not exceed the max; min applies symmetrically when shrinking

#### Scenario: Persisted dimensions restore on remount

- **GIVEN** a `<ResizablePanel :storageKey="'lex-clientes-detail'">` where the user resized to 35/65 and the component unmounts
- **WHEN** the component remounts (page reload, navigation back)
- **THEN** the panel sizes restore to 35/65 from `localStorage:resizable-panel:lex-clientes-detail` — the user's preferred layout persists across sessions

#### Scenario: Keyboard moves the split when handle is focused

- **GIVEN** a horizontal `<ResizablePanel>` and the user has tabbed to the drag handle (focus visible via the `--ring` token)
- **WHEN** the user presses `→` (right arrow)
- **THEN** the split moves 5% rightward; pressing `Shift+→` moves 10%; pressing `←` moves leftward; the changes respect min/max constraints; the focused state remains visible

#### Scenario: Hardcoded colors in handle styling are forbidden

- **GIVEN** a developer styles the handle hover state with a hex value (e.g., `background-color: #3b82f6`)
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the handle's idle / hover / focus states SHALL resolve through `core-theming` tokens (`--b3` for idle, `--brand` or `--ring` for hover/focus); raw color values are forbidden

#### Scenario: Nested ResizablePanels with distinct storageKeys persist independently

- **GIVEN** a `<ResizablePanel :storageKey="'outer'">` whose `panel-1` contains another `<ResizablePanel :storageKey="'inner-left'">`
- **WHEN** both layouts are resized and the page reloads
- **THEN** each instance restores from its own storage key; `outer` and `inner-left` do not collide
