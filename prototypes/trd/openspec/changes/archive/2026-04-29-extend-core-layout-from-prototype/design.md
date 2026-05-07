# Design — extend-core-layout-from-prototype

## Context

This design captures the rationale behind porting four contracts from `prototypes/_core-template/` (vanilla HTML/JS, v1.15, dated 2026-04-28) into the Vue 3 + TypeScript template's `core-layout` capability. The prototype accumulated these rules over fifteen revisions while six modules were built on top of it; each rule resolves a real disagreement that surfaced during that period. Bringing them into the OpenSpec contract before any Ardua core app starts implementing features on the Vue template is the cheapest way to guarantee the same disagreements do not re-surface in a different language.

Each decision below answers a specific question that the current `core-layout` baseline leaves open. The design explains **why the answer is what it is**, what alternatives we considered, and what tradeoffs we accepted. The Vue artifact names introduced here (`<Segmenter>`, `<ViewToggle>`, `<MasterDetailLayout>`, `meta.layout`, `Main` container) are the binding tokens — the prototype's CSS class names (`.qtabs`, `.ph-actions`, `.main`) are inputs to this design, not outputs.

---

## Decision 1 — Three orthogonal scopes: Segmentación / Vista / Filtros

### The question

The existing `core-layout` baseline contracts the *physical* L1 / L2 / L3 composition (header, KPIs, section + data surface). It does not contract the *conceptual* role each level plays. Two implementers reading the current spec will both produce a header, a KPI strip, and a section header — but one will put a "Tipo" filter in L1 next to the Main CTA, the other will put the Activos / Histórico segmentador inside the L3 filter row, and a third will treat the period filter as a fourth conceptual category alongside segmentation / view / filters. All three pass the current baseline. None of the three are right.

### The decision

Pages SHALL place controls per a three-level framework where each level is an **orthogonal scope**, not a priority:

- **Segmentación** — mutually exclusive subset of the module universe (e.g. Activos vs Histórico, Nuevas vs Atendidas). Selecting a segment changes the available KPIs, columns, filters, and actions. Lives in L1.
- **Vista** — visual representation of the selected data without changing what the data is (Lista / Tarjetas / Tablero). Lives in L1.
- **Filtros** — restrict the visible records by attribute values. Multi-value, orthogonal (a record can match many filters at once). Lives in L3.

L2 KPIs are computed over the intersection of (active segment ∩ active filters). The period filter is treated as a filter with UI privileges (mandatory, single-value, default visible, pinned to the start of the filter row) — not a separate conceptual category. Anti-pattern enforcement (mixing segmentation with filters, granular filters in L1, period as a fourth category) is the responsibility of `core-error-handling` and is cross-referenced from this requirement, not duplicated here.

### Alternatives considered

- **Treat segmentation as "another filter".** Rejected. Filters are orthogonal (a record can match many simultaneously). Segments are mutually exclusive (a record is in Activos OR Histórico, never both). The semantics are different and the UI affordances must differ.
- **Treat the period filter as its own category.** Rejected. The vanilla prototype tried this in early revisions and the team reverted it: the period filter is a filter with privileges (mandatory + single-value + default-visible + pinned). Calling it a separate category invited "well, then where does X go?" debates for every other filter that also wanted privileges.
- **Allow filters anywhere in the page.** Rejected. Without a fixed home for filters, the L2 KPI strip ends up sandwiched between two control bars and the user loses the at-a-glance read.
- **Make the framework descriptive only (no SHALL/MUST).** Rejected. The whole point of contractualizing is to lock the placement so two implementers cannot disagree on it.

### Tradeoffs accepted

- The framework is opinionated. Modules whose primary control is something other than segmentation (e.g. Reportes, where the primary control is "category") have to map their concept onto one of the three scopes — sometimes awkwardly. The prototype's experience says this is acceptable: in every case where it felt awkward, the underlying issue was that the module's information architecture was unclear, and the framework forced the right conversation.
- Anti-pattern enforcement lives in `core-error-handling`, not here. That means a reader of this requirement alone does not see the prohibited shapes — they have to follow the cross-reference. We accept that split because the anti-pattern catalog spans multiple capabilities (data tables, actions menu, layout) and centralizing it in `core-error-handling` keeps the catalog discoverable.

---

## Decision 2 — `<Segmenter>` placement: header actions area, fixed slot order

### The question

The existing `core-layout` baseline says the L1 page header has an actions area aligned to the right and caps the number of CTAs at three. It does not say where the segmentador goes. The vanilla prototype answered this — segmentation lives inside `.ph-actions` on the same row as the title and Main CTA, never below the KPIs and never as a separate band. The Vue template needs the same answer in Vue terms.

### The decision

The L1 segmentador SHALL be a `<Segmenter>` Vue component placed inside the page header's actions area, on the same row as the title and the Main CTA. The slot order inside the actions area is fixed: `<Segmenter>` (left of view toggle) → `<ViewToggle>` → Main CTA (right). When the active view is `kanban`, the `<Segmenter>` SHALL be hidden by default unless the page opts in (some modules — e.g. Inbox split by Tipo — genuinely want the segmenter visible in Tablero; that opt-in is per-page, not the default). The component applies ONLY to qtabs that segment the same data model (Activos vs Histórico, Nuevas vs Atendidas). Qtabs that split a module into independent functional sections (e.g. Reportes vs Catálogo) are a different pattern that lives below the page header and is out of scope for this requirement.

### Alternatives considered

- **Place the segmentador as a separate band below L1, above L2.** Rejected. The vanilla prototype tried this in early revisions and reverted: it consumes a vertical band the page can ill afford, and it visually separates segmentation from the Main CTA — but the Main CTA is segment-scoped (creating a record while in Histórico is meaningless), so the two belong together.
- **Place the segmentador in the L3 filter row.** Rejected. Conflates segmentation with filtering — the exact anti-pattern Decision 1 prevents.
- **Always show the segmentador, including in Tablero.** Rejected as default. Tablero already organizes by state (or by axis, when multi-axis); showing a segmenter on top of that creates two competing organizational dimensions in the same view. Per-page opt-in is the right escape hatch for the modules that genuinely need both.
- **Allow more than one segmenter.** Rejected. By definition, segmentation is mutually exclusive at the page level. Two segmenters would imply two orthogonal mutually-exclusive partitions, which is filtering wearing a hat.

### Tradeoffs accepted

- The hide-in-Tablero default occasionally surprises page authors who expect the segmenter to be visible in every view. The opt-in flag is the documented release valve, and the cost of a momentary surprise is preferable to the cost of two organizational dimensions competing in Tablero.
- The "qtabs that segment the same data model" vs "qtabs that split a module into functional sections" distinction is a judgment call the page author has to make. The contract expresses this in plain language; we trust the author plus PR review to resolve borderline cases. A future change MAY formalize the second pattern as its own component (`<ModuleSections>` or similar) once enough modules need it.

---

## Decision 3 — Body-fixed scroll: Main owns the scroll, body never scrolls

### The question

The existing `core-layout` baseline says "Sidebar fixed, Topbar sticky, only Main scrolls." That is correct as a high-level statement but leaves three implementation questions open: (1) what CSS contract on the `Main` container guarantees this, (2) where do the data surfaces (tables, kanban boards) scroll, and (3) what happens when a modal or drawer opens — does the body suddenly become scrollable again?

### The decision

Scroll SHALL live inside the Main content container, never on the document body. The `Main` container declares `min-width: 0` and `overflow: hidden` (the `min-width: 0` came from a v1.9 fix in the prototype and is load-bearing — it prevents flex-children with intrinsically wide content from forcing the document body to stretch). Data surfaces scroll inside their own bounded containers: tables scroll horizontally inside their wrapper, kanban boards scroll horizontally across columns inside the board container, neither propagates to the body. Modal and drawer overlays use `position: fixed` and lock body scroll while open — they do not introduce a competing scroll container that would conflict with the Main container's scroll position.

### Alternatives considered

- **Let the document body scroll.** Rejected. Body scroll is the shape every prototype starts with by accident, and it breaks three things the template depends on: (a) the Sidebar can no longer be `position: fixed` without scroll-jank, (b) modal `position: fixed` overlays no longer reliably cover the viewport because the body's scroll position changes the visible area, (c) horizontal scroll inside a wide table accidentally scrolls the whole page. Every one of these bugs surfaced in the prototype before the body-fixed rule was adopted.
- **Let each data surface decide its own scroll behavior.** Rejected. We already do — the rule does not prescribe how a table scrolls, only that whatever scroll a surface needs lives inside that surface's bounds. Without the umbrella rule, surfaces accidentally let scroll escape into the body.
- **Keep the rule but allow exceptions per module.** Rejected. A "scroll-on-body" exception in one module breaks all four global affordances (Sidebar, Topbar, modal overlay, drawer overlay) for the duration of that module's pages. There is no exception worth the cost.

### Tradeoffs accepted

- Page authors occasionally fight the rule when they want a "naturally scrolling page". The fight is the point: if the page wants to scroll naturally, it usually means the page is doing too much, and the right fix is to split it. The few legitimate cases (very long single-column reports) work fine inside Main's overflow container.
- Modal scroll-locking while a modal is open is implemented per-modal-component, not at the shell level. A future change MAY lift the scroll-lock into a shared composable; for now, the contract requires the behavior and trusts the modal components to implement it.

---

## Decision 4 — Master-Detail as a third structural layout

### The question

The existing `core-layout` baseline contracts L1 / L2 / L3 for data-driven pages. It does not say what to do when a page does not fit that mold — specifically, when the primary interaction is "select an item from a list, edit it on the right side without leaving the page." The vanilla prototype identified this third structural pattern (Module B skeleton) and uses it for record types like Reportes/Catálogo and Configuración/Usuarios. Without contractualizing it, agents will either (a) force-fit the L1/L2/L3 mold and produce a broken UX (a list table with a separate edit modal), or (b) reinvent ad-hoc Master-Detail per module.

### The decision

Pages SHALL support Master-Detail as a third structural layout alongside Dashboard and L1/L2/L3. A Master-Detail page declares `meta.layout = 'master-detail'` and renders a `<MasterDetailLayout>` Vue component that slots two panels: a list panel on the left, a detail panel on the right. Both panels live inside the Main container. Each panel scrolls independently inside its own bounded container — the body-fixed scroll rule (Decision 3) still applies, so neither panel's scroll escapes to the document body. The pattern is used for record types whose primary interaction is "select from a list and edit the right panel inline" (canonical examples: Reportes/Catálogo, Configuración/Usuarios). It is not a replacement for L1/L2/L3 — it is an alternative chosen at page authoring time when the data model fits.

### Alternatives considered

- **Express Master-Detail as a special case of L1/L2/L3.** Rejected. The cognitive fit is wrong: L1/L2/L3 is a vertical stack of zones, Master-Detail is a horizontal split of zones. Forcing one onto the other produces awkward CSS and confuses readers of either spec.
- **Use a modal or drawer for the detail side.** Rejected for this pattern. Modals and drawers are right when the primary interaction is "act on a row from a list, then return to the list" (and `core-modals` / `core-actions-menu` already cover that). Master-Detail is right when the primary interaction is "edit many rows in sequence without leaving the list" — a modal-per-row would force a click-close-click-close rhythm that costs much more than a static right panel.
- **Allow Master-Detail without a per-page opt-in.** Rejected. Page-level layout choice belongs in route metadata, mirroring how `meta.layout = 'blank'` opts standalone routes out of the shell. Making the layout choice declarative keeps the router as the single source of truth for "what does this page look like."
- **Make `<MasterDetailLayout>` a free-form two-column grid.** Rejected. The component contracts both panels having their own scroll containers and consistent padding. A free-form grid invites two-column pages that aren't Master-Detail in spirit (e.g. a stats column next to a chart column) and dilutes the pattern.

### Tradeoffs accepted

- Adding a third structural layout enlarges the surface area of `core-layout`. We accept the cost because the alternative (pages choosing between L1/L2/L3 mis-fit and ad-hoc inventions) is worse. The contract caps the structural patterns at three (Dashboard, L1/L2/L3, Master-Detail); a fourth would require its own change proposal.
- The `<MasterDetailLayout>` component is contracted but not yet implemented in the template. This change is artifact-only — implementation will land in a subsequent change when the first Vue page that needs Master-Detail is built. The contract being in place first is the point: it locks the shape before the first implementation, so the implementation cannot disagree with the contract.

---

## Open questions

1. **Per-page opt-in syntax for showing the segmenter in Tablero.** Current decision leaves it to the page (`<Segmenter v-if="showInKanban" />` or similar). A future change MAY formalize a prop on `<Segmenter>` (e.g. `:visible-in-views="['list', 'cards', 'kanban']"`) once two or more modules need it.
2. **Width ratio of the Master-Detail panels.** Current decision is silent; the component picks a sensible default (around 1:2 list-to-detail) and pages do not override. If real modules need to override, a future change adds a `:list-width` or `:split` prop.
3. **Master-Detail with KPIs.** Some Master-Detail pages may want a thin KPI strip above the split. Not contracted in this change — if it surfaces, it's a delta on top of `<MasterDetailLayout>`, not a replacement.
