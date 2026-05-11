> Jira REQ: — (pending; template-level capability extension driven by `_core-template-frontend` v1.15 prototype survey)
> Module: core-template (foundation)

# Extend core-data-tables with views, kanban, multi-axis state machines, severity, and ID column

## Why

The current `core-data-tables` capability defines an excellent baseline for the **single-view list** use case: a bordered surface, uppercase headers, row-click detail, search + filter triggers, ellipsis pagination, an empty state, and the `useTable` / `vue-query` composable split. Eight requirements, every one of them load-bearing.

What it does NOT yet contractualize — and what `prototypes/_core-template-frontend/` v1.15 has been operating with for over a year of internal use — is everything that turns that list into a **module surface that adapts to the data**:

1. The fact that a table is one of three coordinated **views** of the same dataset (`Lista` / `Tarjetas` / `Tablero`), declared per module, with a shared pagination footprint.
2. The fact that `Tablero` is **state-driven**: the kanban does not invent columns; it renders one column per state declared in the module's state machine, with declarative transitions and side effects.
3. The fact that some modules carry **more than one orthogonal state machine** (e.g. an Inbox solicitud has both a workflow axis `pending → in_progress → completed` and an imputation axis `pendiente → en_proceso → imputado`) — and the user picks which axis the board is organized by.
4. The fact that **severity** (`critical / high / medium / low`) is glanceable before any badge is read, via a colored left border on cards / inset shadow on rows, plus a sort that orders by severity then recency.
5. The fact that the **record ID** is a first-class column (monospaced, leftmost, never user-hideable), and that the canonical shape is `<PREFIX>-<NNN>` (`R-042`, `MOV-128`, `Q-007`).
6. The fact that the **period filter** is a regular filter with four UI privileges (mandatory, default per module, single-value, drives KPI aggregation when applicable) — not a separate conceptual category, but not a generic filter either.
7. The fact that **pagination is shared across views** (the limit selected in Lista applies to Tarjetas, switching views never resets to page 1, and Cards / Kanban replace the page-list footer with a `Cargar más` affordance).
8. The fact that the **Acciones column is mandatory** at the rightmost position whenever per-row actions exist — and MUST be omitted entirely when they don't (no empty column).
9. The fact that an **`imputacion` derived badge** can be rendered from the manifest engine (computed, not stored), with a canonical color mapping and an interaction rule (cards in terminal `imputado` are not draggable on the imputacion axis).

Each gap, on its own, is the kind of thing a junior developer (or an AI agent without explicit guidance) will reinvent from scratch. Together, they are the reason the prototype feels like one product across six future apps. Without contractualizing them now — before the first migration begins — every app will reinvent its own kanban, its own severity treatment, its own card layout, and the visual coherence the template was built to enforce will erode at the first migration.

This change closes those nine gaps as **ten new requirements** added to `core-data-tables`. Two of the gaps merge into a single requirement (period filter privilege is one; the `Acciones` column rule is one). The new state-machine concept is large enough that we considered breaking it out into a `core-state-machine` capability of its own, but rejected that split: the state machine has no surface outside data tables (it powers the kanban view), and the `Tablero` view is what the user perceives. Keeping the contract inside `core-data-tables` keeps the agents' decision tree shorter ("how do tables behave?" → one spec).

## What Changes

Ten new requirements added to `core-data-tables`:

1. **Period filter privilege** — period as a filter with mandatory / default / single-value / KPI-aggregation privileges, pinned at the start of the L3 filter row, exposed as a typed `period: PeriodValue` prop or a Pinia store slice with `setPeriod(v)`.
2. **Module view declaration** — each module declares `views: ('list' | 'cards' | 'kanban')[]`; `<ViewToggle>` renders only the declared views; default is `['list']`; choice persists in session storage per module.
3. **Tarjetas (Cards) view** — `<CardsGrid>` (`auto-fill, minmax(290px, 1fr)`) + `<CardItem>` (header / body / footer); shared `renderCard(record, mode)` enforces visual consistency between Cards and Kanban; pagination shared with Lista.
4. **Tablero (Kanban) view, state-driven** — N columns, one per declared state; states have `id` / `label` / `column_label` / `order` / `terminal: boolean`; terminal states implicitly block as origin and destination unless transitions opt in via `mode: 'modal'`; cards in terminal states are not draggable.
5. **Multi-axis Kanban** — `axes: Record<axisKey, KanbanAxis>` per module; first activation per session opens `<KanbanAxisDialog>`; choice persists; header shows active axis label and "Cambiar eje"; `readOnly: true` axes block drag with `toast.info('Eje en sólo lectura')`; two axes with the same `stateField` are forbidden.
6. **Severity differentiation** — `severity: 'critical' | 'high' | 'medium' | 'low'` renders a 3px colored left border on cards (`severity-critical` / `severity-high` / `severity-medium` / `severity-low`) and an inset box-shadow on the first cell of table rows; default sort `critical → high → medium → low → recency`.
7. **Visible ID column** — leftmost, monospaced, never user-hidden; canonical shape `<PREFIX>-<NNN>` (`R-NNN` default; `MOV-NNN`, `Q-NNN`, etc. allowed); header text `ID` in the standard uppercase letter-spaced token.
8. **Required Acciones column at end** — rightmost column hosting the per-row ⋯ trigger (per `core-actions-menu`); centered + ~40px fixed-width (already covered in styling); MUST be omitted entirely when no per-row actions exist (do not render an empty column).
9. **Imputación calculated state badge** — opt-in `imputacion` derived badge (`pendiente` / `en_proceso` / `imputado`); rendered via the canonical `<Badge>` with the canonical color mapping (warning / info / success); computation owned by `core-actions-manifest`; cards in the terminal `imputado` state are not draggable on the imputacion axis.
10. **Pagination shared across views** — the page-size selected in any view applies to all views of the same module; switching views does not reset to page 1; Cards / Kanban replace the page-list footer with a `Cargar más` button (or infinite scroll if the module opts in); server-side queries reuse the same query key.

## Capabilities

### Affected Capabilities

- `core-data-tables` — ten new requirements added (this is the largest capability extension in the v1.15 migration).

### New Capabilities

None. The state machine subsystem that powers Tablero is captured **inside** `core-data-tables` rather than spun out, because it has no surface outside the kanban view and the `Tablero` view is what users perceive as the product feature.

### Cross-references

- `core-actions-menu` — the per-row Acciones column hosts the menu defined there; this change enforces the column's presence/absence rule, not its styling.
- `core-actions-manifest` — owns the manifest engine that computes the `imputacion` badge and orchestrates composite-action dialogs on multi-axis Kanban drops; this change references that ownership without redefining it.
- `core-error-handling` — the anti-pattern register that forbids two axes with the same `stateField` lives there; restated here as a precondition.
- `core-theming` — `severity-*` classes consume the `--danger` / `--warning` / `--info` / `--t4` tokens defined there; no new color is invented in this change.
- `core-modals` — `<KanbanAxisDialog>` follows the generic modal contract (overlay, header / body / footer, ESC + backdrop dismissal).

## Notes

- The existing eight requirements in `core-data-tables` remain unchanged. This is purely additive (`## ADDED Requirements`).
- The existing `Tables MUST use the useTable composable for client-side data` requirement is **extended in spirit** by requirement #10 (pagination shared across views): the same composable / query key now also drives Cards and Kanban for the same module. No delta to that requirement is needed — the new requirement says how the existing composable is reused, not how it changes.
- After this change is archived, `core-data-tables` will carry 18 requirements (8 baseline + 10 new) — making it the densest spec in the template, which matches its role as the dominant UI surface in every Ardua core app.
- The actions-manifest engine itself (the JSON declarative actions system that powers composite kanban drops, dynamic main CTAs, batch actions, and the `imputacion` computation) is the subject of a sibling change (`extend-core-actions-menu-from-prototype` / a future `core-actions-manifest` capability), not this one.
