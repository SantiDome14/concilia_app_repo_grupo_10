# Tasks — add-resizable-panel-component

This change is a **contract-only** extension of `core-layout`: one ADDED requirement covering the `<ResizablePanel>` component contract.

## 1. Spec deltas

- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `ResizablePanel component MUST provide horizontal and vertical split-pane layouts with persisted dimensions` (≥7 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-resizable-panel-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for vueuse/useDraggable vs. `react-resizable-panels` Vue port
- [ ] Verify `design.md` documents the relationship between ResizablePanel and the AppShell (it lives inside Main; it does NOT replace the shell)
- [ ] Verify `design.md` documents the explicit non-features (no 3+ panel split, no collapse-to-zero, no runtime orientation swap, no momentum drag)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-resizable-panel-component`
- [ ] Final commit: `specs: add ResizablePanel component to core-layout with horizontal and vertical split modes`
