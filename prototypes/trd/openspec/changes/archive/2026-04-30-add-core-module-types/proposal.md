- Jira REQ: — (no ticket; template-level standardization of the two canonical module patterns demonstrated by `src/pages/ModuloA.vue` and `src/pages/ModuloB.vue`)
- Module: core-template (foundation)

# Standardize the two canonical module-composition patterns the template ships demos for

## Why

The Vue template ships three demonstrative domain modules at clone-time — `Módulo A`, `Módulo B`, `Módulo C` — under `src/pages/Modulo{A,B,C}.vue`. These are not arbitrary placeholders: A and B were each built to demonstrate a different *composition* pattern that any concrete cloning app is expected to reuse, and C remains a generic skeleton. Until now the distinction between A and B has been implicit in the demo code and in the prototype HTML the demos were lifted from. Without an explicit contract, two implementers reading the same demo can disagree on what each demo is supposed to teach: is `Módulo A` "the L1/L2/L3 demo" or "the table-with-detail-modal demo"? Is `Módulo B` "the Tesorería demo" or "the multi-tab demo"? The answer the team has already converged on — and that this change codifies — is:

- **Module Type A — direct record management.** The page renders a single record set; users browse, filter, and act on those records directly. L1/L2/L3 is the structural pattern. The detail surface is a modal or a Drawer per the record type's `meta.detail`. Examples in real apps: any screen whose primary job is "list the records, let the user filter and edit them."
- **Module Type B — summary-first with record-feeding sub-tabs.** The page leads with a summary surface (KPIs + a non-list rendering: a tree, a chart, composed widgets) that summarizes the *state*, *availability*, or *situation* the module is responsible for. Subsequent sub-tabs expose the record sets that feed the summary's values — each sub-tab is an independent data model with its own lifecycle, and each sub-tab is typically composed Type-A-shaped on its own. The Main CTA persists across sub-tab switches because it operates on the module as a whole, not on the active sub-tab. Examples in real apps: any module whose primary job is "show the state first, then let the user drill into the records that produced it."

`src/pages/ModuloA.vue` is the canonical Type-A demo. `src/pages/ModuloB.vue` is the canonical Type-B demo. Locking both patterns into a normative contract is the prerequisite for cloning apps to know which pattern to start from when they replace the demos with their own domain.

## What Changes

- **NEW capability `core-module-types`** — adds a normative spec that contracts the two template-level module-composition patterns: Module Type A (direct record management) and Module Type B (summary-first with record-feeding sub-tabs). The spec names `src/pages/ModuloA.vue` and `src/pages/ModuloB.vue` as the canonical demos and clarifies that `Módulo C` is a generic skeleton outside the scope of this contract until a third pattern emerges. The spec defines what each pattern MUST contain, what each pattern MUST NOT do (e.g. Type B sub-tabs SHALL NOT be implemented as L1 `<Segmenter>` segmentation, Type A SHALL NOT collapse multiple data models into one page), and how cloning apps choose between them.
- **No code changes.** The Vue implementations of `ModuloA.vue` and `ModuloB.vue` already match the contract this change introduces — this proposal is the contract catch-up so future clones inherit a written rule rather than reverse-engineering the demos.

## Capabilities

### Affected Capabilities

None. The two patterns reuse already-contracted layout primitives (`core-layout` for L1/L2/L3, `core-data-tables` for tables, `core-modals` for modals and drawers, `core-actions-menu` for per-row actions). Those existing capabilities stay unchanged.

### New Capabilities

- `core-module-types` — the two canonical module-composition patterns the template ships demos for: Module Type A (direct record management, demo at `src/pages/ModuloA.vue`) and Module Type B (summary-first with record-feeding sub-tabs, demo at `src/pages/ModuloB.vue`).
