# Extend core-navigation with generics block, sub-tab breadcrumb, and placeholder pages

> Jira REQ: — (no Jira ticket; this is a template-level gap closure driven by the survey of `prototypes/_core-template/` v1.15 against the current `core-navigation` baseline)
> Module: core-template (foundation)

## Why

The vanilla HTML/JS prototype at `prototypes/_core-template/` (v1.15, dated 2026-04-28) is the reference for every Ardua core app today. Its README is explicit and prescriptive about three navigation patterns that the current `core-navigation` baseline in this template either under-specifies or omits entirely. Migrating apps to this Vue+TS template before contractualizing those patterns would force every migration to invent its own shape — defeating the consistency goal that motivated the template in the first place.

The three gaps that surfaced during the survey:

1. **Generic core modules block ordering is not specified.** The current spec says the Sidebar order is "Brand → Home → Blocks → spacer → Account". The prototype actually renders **four cross-cutting modules** (Dashboard, Inbox, Alertas, Reportes) at the top of the navigation, between Brand and the first domain Block, **at the same level as a Block but without a Block label header**. The prototype README is explicit: *"Generic 4 must be at the top, same level, and never wrapped in a `<div class="sb-section">`."* The current spec collapses this into a single "Home" entry, which is wrong: an app like core-clp has Dashboard + Inbox + Alertas + Reportes at the top, not just Home. Without a contract, agents will either nest the four into a Block (visually wrong) or restructure the section per app (loss of consistency).

2. **Breadcrumb sub-tab segment is missing.** The prototype renders breadcrumbs as `[block] / module / [sub-tab]` — the active Segmenter (e.g. "Activos" / "Histórico" / "Nuevas") is appended as a third segment. Drawers, modals, and sub-sections also pass extra segments. The current spec only covers `{block} / {breadcrumb}` (two levels). Without the third-segment contract, agents will either omit the sub-tab from the breadcrumb (loss of context) or hardcode it per page (drift across modules).

3. **Placeholder pattern for not-yet-designed modules is absent.** The prototype documents a `.prox` "Próximamente" pattern: when an app declares a module in the Sidebar but has not yet built the L1/L2/L3 shell for it, the route renders an icon + title + sub placeholder. This is **important for roadmap visibility** — operators see what is coming without the dev team needing to ship empty L1/L2/L3 shells. The current spec is silent here; without it, agents will either ship empty shells (clutter), 404 (loss of roadmap signal), or invent ad-hoc per-app placeholders.

Closing these three gaps in the same change keeps the effort focused on a single capability (`core-navigation`) and lets reviewers evaluate them as one coherent improvement to the navigation contract.

## What Changes

- **`core-navigation`** — add a new requirement `Sidebar MUST render generic core modules above Domain Blocks without a Block label` that specifies: the four canonical generics (Dashboard, Inbox, Alertas, Reportes), their position (between Brand and the first Domain Block), the rule that they MUST NOT be wrapped in a Block group header, and the per-app omission rule (apps that don't use one of the generics SHALL omit it rather than restructure the section). The `<Sidebar>` component MUST accept a `generics` slot/prop separate from `blocks`.
- **`core-navigation`** — add a new requirement `Topbar breadcrumb MUST append the active sub-tab as a third segment` that specifies: the `[block] / module / [sub-tab]` format, the rule that generics not belonging to a Block render without the block segment, and the `useBreadcrumb()` composable's `setExtraSegment(label)` API for drawers / modals / sub-sections to append additional segments.
- **`core-navigation`** — add a new requirement `Routes MAY declare meta.placeholder to render the PlaceholderPage shell` that specifies: the `meta.placeholder = true` route declaration, the `<PlaceholderPage>` component (icon + title + sub), the rule that the Sidebar entry SHALL still render and be navigable, and the rule that clicking a placeholder route SHALL land on the `<PlaceholderPage>` instead of 404 or an empty L1/L2/L3 shell.

## Capabilities

### Affected Capabilities

- `core-navigation` — three new requirements added (generics block ordering, breadcrumb sub-tab segment, placeholder page contract)

### New Capabilities

None. This change strengthens the existing `core-navigation` capability rather than introducing new ones.

### Non-capability artifacts

None. This change is artifact-only at the contract level — the Vue components (`<Sidebar>` updates, `<PlaceholderPage>`, `useBreadcrumb()`) are implemented in subsequent changes when individual apps begin migration.

## Notes

- The "app brand is NEVER a breadcrumb segment" rule is already covered by the existing `Topbar MUST render a breadcrumb derived from route meta` requirement — not restated here to avoid duplication.
- The `nav(mod)` generic router from the prototype is the conceptual ancestor of Vue Router's `<router-link>` and `route.name` matching; the active-state highlight is already covered by the existing `Navigation items MUST provide label, icon, and active state` requirement.
- After this change is archived, `core-navigation` carries 9 requirements (the current 6 plus 3 new).
