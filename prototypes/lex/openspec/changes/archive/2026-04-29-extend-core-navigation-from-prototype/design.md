# Design — extend-core-navigation-from-prototype

## Context

This design document captures the rationale behind the three new requirements proposed for `core-navigation`: the generics block ordering, the breadcrumb sub-tab segment, and the placeholder page contract.

Each of the three answers a specific question that the survey of `prototypes/_core-template/` v1.15 against the current `core-navigation` baseline left open. The design here explains **why the answer is what it is**, what alternatives we considered, and what tradeoffs we accepted.

The reference for every decision is the prototype README at `prototypes/_core-template/README.md` and the existing baseline at `openspec/specs/core-navigation/spec.md`.

---

## Decision 1 — Generic core modules render above Domain Blocks at the same level, without a Block label

### The question

The current `core-navigation` baseline says the Sidebar order is *"Brand → Home → Blocks (with modules) → spacer → Account"*. The prototype actually renders four generic modules — Dashboard, Inbox, Alertas, Reportes — between Brand and the first Domain Block. They sit at the **same visual level** as the modules inside a Block, but they are **not wrapped in a Block** and have **no Block label header above them**. The prototype README is explicit: *"Siempre en ese orden. Generic 4 (Dashboard, Inbox, Alertas, Reportes) must be at the top, same level, and never wrapped in a `<div class="sb-section">`."*

The current single "Home" entry collapses four distinct concepts into one and contradicts the prototype.

### The decision

The Sidebar SHALL render the generic core modules — Dashboard, Inbox, Alertas, Reportes — as a flat group between Brand and the first Domain Block. The group SHALL NOT carry a Block label header (no uppercase section header above it). Each generic is a navigation entry at the same level as a module inside a Block. The order is **Brand → Generics (flat, no Block label) → Domain Blocks → spacer → Account**.

The `<Sidebar>` component MUST accept a `generics` slot or prop **separate** from `blocks`, so the rendering rule (no Block wrapper, no label header) is enforced structurally — not by convention.

Apps that do not use one of the four generics SHALL **omit** that generic rather than restructure the section. For example, an app that has no consolidated Reportes module simply does not render the Reportes entry; it does NOT replace it with a domain module or wrap the remaining three in a Block.

### Alternatives considered

- **Wrap the four generics inside a "Home" Block with a label.** Rejected. Contradicts the prototype's explicit rule. Adds visual noise (an uppercase header for what is conceptually the app's "always-there" entries). Breaks the parallel between this template and any apps already shipped against the prototype.
- **Render generics inline with the first Domain Block (no separator).** Rejected. The prototype keeps generics visually separate from domain modules — they are "always-there cross-cutting" vs "this app's domain". Merging them loses that distinction.
- **Allow each app to redeclare which four (or fewer) entries are "generic".** Rejected. The prototype README catalogs these four explicitly with a decision heuristic for each (Inbox = solicitudes with owner & lifecycle; Alertas = system-detected events; Reportes = consolidated async info; Dashboard = consolidated home). Letting apps redefine the set defeats the cross-app semantic guarantee.
- **Keep the current "Home" wording and treat the four generics as Block-level concepts.** Rejected. "Home" was a placeholder when the baseline was written. The survey now has authoritative input from the prototype.

### Why "generics" as a separate slot/prop, not a fifth Block type

A Block has a label header. A generic does not. Modeling generics as "a Block with `label: null`" forces the renderer to special-case label rendering and invites bugs (someone passes a label by accident). A separate slot/prop makes the structural rule unforgeable: the `generics` array cannot carry a Block label, by type.

### Failure modes the rule prevents

- An app wraps Dashboard / Inbox / Alertas / Reportes in a Block with header "Inicio" → spec violation.
- An app inserts a domain module into the generics group → spec violation, generics are exactly the four canonical entries.
- An app renames Inbox to "Solicitudes" → spec violation, generics carry their canonical labels.

---

## Decision 2 — Breadcrumb appends the active sub-tab as a third segment

### The question

The current `core-navigation` baseline covers two-level breadcrumbs: `{block} / {breadcrumb}`. The prototype actually renders three levels when a module has a sub-tab Segmenter (e.g. "Activos" / "Histórico" in Inbox, "Nuevas" / "Históricas" in Alertas, "Catálogo" / "Histórico" in Reportes). The README: *"Si una vista profundiza más allá del módulo (drawer, modal, sub-sección), pasarlo como segmento adicional al renderBC."*

Generics that don't belong to a Block render without the block segment, e.g. `Alertas / Nuevas`, `Reportes / Catálogo`, just `Dashboard`.

### The decision

When a route declares `meta.breadcrumb` and the active page has a selected sub-tab (a Segmenter from `core-layout`), the Topbar breadcrumb SHALL append the sub-tab as the third segment. Format:

- Domain module with sub-tab: `{block} / {module} / {sub-tab}` — e.g. `Tesorería / Movimientos / Activos`.
- Generic module with sub-tab: `{module} / {sub-tab}` (no block segment) — e.g. `Alertas / Nuevas`, `Reportes / Catálogo`.
- Generic module without sub-tab: `{module}` alone — e.g. `Dashboard`.

Drawers, modals, and sub-sections MAY append additional segments via a `useBreadcrumb()` composable that exposes `setExtraSegment(label)` and `clearExtraSegment()`. The composable owns the reactive segment state; pages that open a drawer call `setExtraSegment('Detalle R-042')` on open and `clearExtraSegment()` on close.

The active sub-tab segment MUST come from the same source of truth as the Segmenter component itself (the page's view state) — the breadcrumb does not duplicate the data, it reads it.

### Alternatives considered

- **Encode the sub-tab in `route.params` and derive the third segment from the route alone.** Rejected. Sub-tabs are view state, not URL state, in the prototype (`setAlrSubtab`, `setRepSubtab` are JS handlers, not router transitions). Forcing them into route params would require every Segmenter to push a route — a significant divergence from the prototype that adds no UX value.
- **Hardcode the sub-tab logic into each page component.** Rejected. Every page would re-implement the same `setExtraSegment` pattern, drifting in label format and reactivity behavior. The composable centralizes the contract.
- **Render the third segment only when the page passes a prop to `<Topbar>`.** Rejected. The Topbar lives in the shell; piping props from each page to the shell breaks composition. A composable inverts the dependency cleanly — the page declares the segment, the Topbar reads it.
- **Allow N-level breadcrumb (4+ segments) for deeply nested flows.** Rejected for now. The prototype caps practical depth at three (block / module / sub-tab) plus one extra-segment slot for drawers. Going deeper invites breadcrumb soup — if an app needs four+ segments, that's a sign the page should be a separate route.

### Why a composable, not a Pinia store

`useBreadcrumb()` is page-scoped reactive state with a tiny API surface (one setter, one clearer, one read-only ref). Pinia is overkill for that. The composable internally uses a module-level `ref` shared across all callers; the Topbar reads it, the page writes it. This matches the existing pattern of `useAuth`, `useCapabilities`, `useTable` from the rest of the template.

### Failure modes the rule prevents

- A page renders a Segmenter but the Topbar shows two-level breadcrumb only → spec violation.
- A drawer opens but the breadcrumb does not reflect the drawer context → spec violation if the drawer is a meaningful navigation step (vs a transient picker).
- A generic like Dashboard renders `{block} / Dashboard` with a fabricated block segment → spec violation, generics omit the block segment.

---

## Decision 3 — Routes MAY declare meta.placeholder to render the PlaceholderPage shell

### The question

The prototype documents a `.prox` "Próximamente" pattern: when an app declares a module in the Sidebar but has not yet built the L1/L2/L3 shell for it, the route renders an icon + title + sub placeholder. This serves a real product purpose: roadmap visibility for operators and stakeholders, without forcing the dev team to ship empty L1/L2/L3 shells.

The current `core-navigation` baseline says nothing about this. The current `core-layout` baseline mandates L1 + L3 for data-driven pages. Without a placeholder contract, agents have three bad options: ship an empty L1/L2/L3 shell (clutter), 404 the route (loss of roadmap signal), or invent a per-app placeholder (drift).

### The decision

A route MAY declare `meta.placeholder = true` in `router/routes.ts`. When this flag is present, the shell SHALL render a `<PlaceholderPage>` component instead of the L1/L2/L3 shell. `<PlaceholderPage>` accepts three props:

- `icon: Component` — a `lucide-vue-next` icon component,
- `title: string` — a short title (e.g. "Próximamente"),
- `sub: string` — a one-line subtitle (e.g. "Este módulo está en el roadmap del próximo trimestre.").

The Sidebar entry for a placeholder route SHALL still render and be navigable — clicking it lands on the `<PlaceholderPage>`, not on a 404 page and not on an empty L1/L2/L3 shell. This is the whole point: the entry must be visible so operators know the module is on the roadmap.

The placeholder route MAY still declare `meta.breadcrumb` and `meta.block` so the Topbar renders correctly (e.g. `Tesorería / Conciliación`). Breadcrumb is the only signal that the route is "real"; the page body is the placeholder.

`meta.placeholder` is mutually exclusive with the L1/L2/L3 shell — a placeholder page does NOT render L1, L2, or L3. When the team builds the real module, they remove the `meta.placeholder` flag (and ideally archive an OpenSpec change documenting the upgrade).

### Alternatives considered

- **Use 404 for not-yet-built modules.** Rejected. Loses the roadmap signal entirely — operators see "this doesn't exist" rather than "this is coming". Bad UX for an internal tool whose roadmap is part of stakeholder visibility.
- **Ship empty L1/L2/L3 shells with mocked data.** Rejected. Creates clutter in the codebase, sets expectations that the module works (it doesn't), and turns into a maintenance burden when the team eventually builds the real version.
- **Hide the Sidebar entry until the module is built.** Rejected. Removes the roadmap visibility that motivates this pattern in the first place. An app shipped without the entry is identical to an app with no plans for that module.
- **Make placeholder a global app-level feature flag, not per-route meta.** Rejected. Different routes are at different stages — some modules are placeholders, others are real. Per-route is the right granularity.
- **Embed the placeholder copy in the route definition itself.** Considered. Decided against: the icon, title, and sub are content, not configuration. Pages that opt into placeholder pass the props to `<PlaceholderPage>` directly, keeping route metadata minimal.

### Why a single `<PlaceholderPage>` component, not per-app variants

One component, one visual treatment, full consistency across apps. The prototype's `.prox` is exactly one shape (icon + title + sub) — there's no second variant. If a future app genuinely needs a custom placeholder (e.g. a richer "preview" page), that's a new requirement and a new component, not a fork of `<PlaceholderPage>`.

### Failure modes the rule prevents

- An app ships an empty L1/L2/L3 shell for a not-yet-built module → spec violation, the route MUST declare `meta.placeholder`.
- A 404 route is used as a placeholder → spec violation, the canonical pattern is `meta.placeholder`.
- A placeholder route hides its Sidebar entry → spec violation, the entry MUST render and be navigable.

---

## Open questions

1. **Persisting the active sub-tab across navigation.** Current decision: sub-tab is view state, not URL state, so reloading the page resets it. Some operators might want deep-linkable sub-tabs ("send me the link to Activos in Inbox"). Deferred until we have a concrete request.
2. **Multiple extra segments in `useBreadcrumb()`.** Current API is one extra segment (`setExtraSegment`). Some flows might want a stack (`pushExtraSegment` / `popExtraSegment`). Deferred until we see a real flow that needs it; the prototype's pattern is one extra at most.
3. **Placeholder page with a "request access" or "request priority" CTA.** Could be useful for stakeholder feedback ("this is the third request for the Conciliación module, please prioritize"). Deferred — the current scope is the visual placeholder shape, not stakeholder workflow.
