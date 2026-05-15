# Extend core-layout with the prototype's three-level control framework

> Jira REQ: — (no ticket; template-level additive migration from `prototypes/_core-template-frontend/` v1.15)
> Module: core-template (foundation)

## Why

The current `core-layout` baseline contracts the L1 / L2 / L3 page composition, the shell render order, the Sidebar collapse, and the cap of three primary CTAs in the header. What it does NOT yet contract is the conceptual model that the vanilla HTML/JS prototype (`prototypes/_core-template-frontend/`, v1.15, dated 2026-04-28) accumulated over fifteen revisions: a three-level *control* framework — **Segmentación / Vista / Filtros** — that defines where each kind of control lives and what each one is allowed to do. The prototype also locks down two structural rules that the current Vue spec leaves implicit (body-fixed scroll inside the Main container) and one alternative page-layout pattern that does not fit the L1/L2/L3 mold (Master-Detail). Without these added contracts, two implementers reading the existing baseline can produce two different-looking modules that each technically pass `core-layout` but disagree on where filters live, where the segmentador goes, what scrolls, and how Master-Detail pages are structured. This change ports those four contracts into the Vue 3 + TypeScript template additively — nothing is removed, four requirements are added on top of the existing six.

## What Changes

- **`core-layout`** — add a new requirement `Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)` that names the three orthogonal scopes (segmentation = mutually exclusive subset of the module universe; view = visual representation that doesn't change data; filters = restrict by attribute values), specifies that L1 hosts segmentation + view toggle + Main CTA (never granular filters), L3 hosts search + granular filters, L2 KPIs are computed over (active segment + active filters), and treats the period filter as a filter with UI privileges rather than a separate conceptual category (cross-reference to `core-data-tables` for the privilege detail; anti-pattern enforcement is cross-referenced to `core-error-handling`).
- **`core-layout`** — add a new requirement `L1 segmentation MUST be expressed via a `<Segmenter>` component in the page header actions area` that contracts the Vue component slot order inside the actions area (`<Segmenter>` → `<ViewToggle>` → Main CTA), the auto-hide rule when the active view is `kanban`, and the scope rule (this segmenter applies only to qtabs that segment the same data model — qtabs that split a module into functional sections live below the page header and are out of scope for this requirement).
- **`core-layout`** — add a new requirement `Scroll MUST live inside the Main container, never on the document body` that contracts body-fixed scroll: the `Main` container declares `min-width: 0` and `overflow: hidden`, data surfaces (tables, kanban boards) scroll inside their own bounded containers, and modal/drawer overlays work without competing scroll containers (overlay is `position: fixed`, body scroll is locked while a modal is open).
- **`core-layout`** — add a new requirement `Pages MUST support Master-Detail as a third structural layout` that contracts the Master-Detail pattern alongside Dashboard and L1/L2/L3: a list panel on the left + a detail panel on the right inside the Main container, each panel scrolls independently, opted into via `meta.layout = 'master-detail'`, implemented through a `<MasterDetailLayout>` component slotted from the page.

## Capabilities

### Affected Capabilities

- `core-layout` — four new requirements added (three-level control framework, `<Segmenter>` placement, body-fixed scroll, Master-Detail layout)

### New Capabilities

None. This change extends an existing capability with rules already proven in the vanilla prototype.
