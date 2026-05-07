- Jira REQ: — (no ticket; template-level conceptual cleanup)
- Module: core-template (foundation)

# Remove the "Segmentación" concept from the template

## Why

The previous baseline contracted a three-level control framework — **Segmentación / Vista / Filtros** — where every page exposing controls over a record set was expected to declare a `<Segmenter>` in L1 to split the same data model into mutually exclusive subsets (Activos vs Histórico for Inbox, Nuevas vs Histórico for Alertas, Catálogo vs Histórico for Reportes). After implementing the four cross-cutting generics and starting to clone domain modules, the team has concluded that the segmentation primitive is redundant: the work it did is already covered by the granular filters in L3 (any Activos / Histórico distinction is a state filter, any "Nuevas" filter is a state filter, and apps that need a date-based scope use a period filter — also an L3 filter with UI privileges per `core-data-tables`). Keeping `<Segmenter>` in L1 doubles the number of places where filtering happens, fragments the user's mental model ("why do I narrow records here vs. there?"), and creates a recurring naming problem (the "Histórico" tab in Reportes was misnamed; it lists ReportRun executions, not historical records).

The Reportes case also revealed that some modules really do need a tab-like control above their KPIs — but those are *functional sub-tabs* over independent data models (Reports vs ReportRuns), not segmentation over one data model. That pattern is already contracted as the **Type B Tabs** pattern by `core-module-types`. So Reportes was using the wrong primitive: it should be using Type B Tabs (below the header), not L1 Segmentation.

This change removes the segmentation primitive from the template and reframes Reportes onto the Type B Tabs pattern with a corrected naming (Catálogo / **Ejecución**, not Histórico).

## What Changes

- **`core-layout`** — REMOVE the requirement `L1 segmentation MUST be expressed via a `<Segmenter>` component in the page header actions area`. The `<Segmenter>` Vue component itself is preserved — it remains in use as the rendering primitive for **Type B Tabs** (below the header, governed by `core-module-types`) and for any future tab-like control. What this change removes is the *contract* that L1 segmentation is a thing.
- **`core-layout`** — MODIFY the requirement `Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)` → rename to `Pages MUST place controls per the two-level framework (Vista / Filtros)`; drop every mention of segmentation (the framework, scenarios, and KPI-intersection rule). L2 KPIs are now computed over (active filters), not (active segment ∩ active filters). The period filter clause stays.
- **`core-modulo-genericos`** — MODIFY the Inbox requirement: drop the "SHALL segment its content via `<Segmenter>` with two segments — Activos and Histórico" sentence and the corresponding scenario; replace with a sentence stating that Inbox SHALL NOT use a Segmenter, and that Estado filter in L3 surfaces all four states simultaneously.
- **`core-modulo-genericos`** — MODIFY the Reportes requirement: rename from `Reportes MUST split Catálogo / Histórico via segmentation; each segment has its own shape, filters, and columns` to `Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern; each tab has its own shape, filters, and columns`; replace the body and scenarios so they reference Type B Tabs (below the header) rather than L1 Segmenter, and replace every "Histórico" with "Ejecución".
- **`core-modulo-genericos`** — MODIFY the `REPORT_DEPENDENCY` requirement: replace the sentence "moves the Alerta from Nuevas to Histórico without user interaction" with a sentence that does not reference Nuevas/Histórico segments (the Alerta simply transitions to its terminal state).

## Capabilities

### Affected Capabilities

- `core-layout` — one requirement removed, one requirement modified.
- `core-modulo-genericos` — three requirements modified (Inbox, Reportes split, REPORT_DEPENDENCY auto-close).

### New Capabilities

None. This change is a contract simplification.
