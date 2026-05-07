# Design — add-resizable-panel-component

## Context

This design captures the rationale for the `<ResizablePanel>` component contract: split-pane layout, persistence, keyboard accessibility, and the bounded set of features that keeps the component focused.

---

## Decision 1 — vueuse/useDraggable, no third-party DnD library

### The question

`react-resizable-panels` (used by TRD legacy) has Vue ports of varying maturity. Should the template adopt one?

### The decision

**Hand-rolled with `vueuse/useDraggable`.** ~80 LOC of glue code; full control of styling and behavior.

### Why

- **Bundle.** vueuse is already a dep; `useDraggable` is < 1 KB. A library adds 10+ KB.
- **API stability.** External libraries get version-bumped with breaking changes. Hand-rolled stays stable.
- **Token consistency.** External libraries ship CSS that fights `core-theming`. Hand-rolled uses tokens directly.

### Failure modes the rule prevents

- A library upgrade breaks the resize behavior in production → eliminated; the implementation is in-house.

---

## Decision 2 — Persistence via localStorage with `storageKey`

### The question

Where does the resized split persist? `sessionStorage`, `localStorage`, or in-memory only?

### The decision

**`localStorage`, opt-in via `storageKey` prop.** Without `storageKey`, the layout is in-memory only.

### Why localStorage

A user's preferred split (e.g., "I always want the LEX detail to be 40% of the screen") is durable preference, not session state. localStorage matches durable.

### Why opt-in

Some uses don't want persistence (modal dialogs that are short-lived). Default is "no persistence" so the component is safe to use anywhere; opt-in adds the persistence concern explicitly.

### Why not sessionStorage

A user who closes the tab and re-opens expects their preferred layout. sessionStorage discards.

### Failure modes the rule prevents

- A modal-hosted ResizablePanel persisting forever → eliminated; persistence is opt-in via storageKey.

---

## Decision 3 — Keyboard support is mandatory (5%/10% increments)

### The question

Should keyboard support be optional or mandatory?

### The decision

**Mandatory.** Focused handle responds to arrow keys; `Shift+arrow` doubles the increment.

### Why mandatory

- **Accessibility floor.** Drag-only widgets exclude users with motor impairments. Keyboard is the floor.
- **Power users.** Some users prefer keyboard for precision (e.g., setting an exact 50/50 split takes one keystroke).

### Why 5% / 10%

- **5% per press.** Granular enough to land on common ratios (40/60, 35/65) without too many presses.
- **10% with Shift.** Coarse for fast positioning ("move it most of the way").
- **Not pixel-precise.** Pixel-perfect splits are not a real use case for this component; percentages are sufficient.

### Failure modes the rule prevents

- A user with motor impairments cannot resize → eliminated by keyboard support.

---

## Decision 4 — Out of scope: 3+ panels, collapse-to-zero, runtime orientation swap, momentum

### Why each is out

- **3+ panels.** Real use case is rare; nested ResizablePanels cover the case adequately. If a real demand appears, abre como `add-multi-pane-layout`.
- **Collapse-to-zero.** A panel collapsed completely is rarely useful; usually replaced by a hide/show toggle that's a different UX. Out of v1.
- **Runtime orientation swap.** Setting `orientation` reactively means tearing down and rebuilding the layout. Complex contract for an edge case. Out of v1.
- **Momentum drag.** Drag releases on mouse-up; adding inertia adds physics-y feel that doesn't match backoffice UX.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-layout` (host) | App shell (Sidebar + Topbar + Main), L1/L2/L3 page composition | ResizablePanel primitive that lives INSIDE Main; does NOT replace the shell |
| `core-theming` | Tokens, palette, focus ring | Drag handle visual states resolve through tokens |
| `core-modals` | Modal flows including Drawer | A ResizablePanel can live inside a Drawer (e.g., TRD quote detail with split timeline + attachments) |

---

## Open questions

1. **3+ panel layouts.** Nested ResizablePanels work but can become unwieldy. If TRD or another app demands a flat 3-panel split, abre como `add-multi-pane-layout` with a different component.
2. **Collapsible panels.** A panel that toggles to 0% via a button. Adjacent to but different from drag-to-resize. If demand appears, extend with `:collapsible` prop.
3. **Drag indicator on hover.** Some apps want a tooltip on the handle showing "Drag to resize". Out of v1; if appears, add `:hint="..."` prop.
4. **Cross-component resize coordination.** When two ResizablePanels in different parts of the page want to share their split (e.g., master-detail view). Out of v1; consumer composes via stores if needed.
