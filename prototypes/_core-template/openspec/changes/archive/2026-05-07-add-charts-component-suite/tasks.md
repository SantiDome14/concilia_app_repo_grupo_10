# Tasks — add-charts-component-suite

This change is a **contract-only** addition of the new `core-charts` capability plus deltas to `core-theming` (chart-N tokens) and `core-modulo-genericos` (Dashboard chart placeholder filled by canonical wrappers). No application code is implemented in this change. The actual `<LineChart>`, `<BarChart>`, `<AreaChart>`, `<PieChart>` wrappers and the Unovis integration will be implemented in a subsequent OpenSpec change when the first chart consumer (likely FIN Dashboard or TRD volume metrics) begins migration.

## 1. Spec deltas

- [ ] `specs/core-charts/spec.md` — NEW capability with 6 requirements:
  - [ ] `All chart rendering MUST use @unovis/vue via the contracted wrapper components` (≥3 scenarios)
  - [ ] `Chart wrappers MUST expose the canonical props contract` (≥4 scenarios)
  - [ ] `Chart series colors MUST resolve through --chart-N tokens` (≥4 scenarios)
  - [ ] `Chart wrappers MUST fill their parent container by default` (≥2 scenarios)
  - [ ] `Empty data MUST render <EmptyState> instead of an empty chart canvas` (≥3 scenarios)
  - [ ] `Chart wrappers MUST be accessible via SVG title and ARIA label` (≥2 scenarios)
- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `Chart series colors MUST be tokenized via --chart-N custom properties` (≥3 scenarios)
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `Dashboard evolution chart placeholder MUST be filled by a canonical chart wrapper` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-charts-component-suite --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the archived `2026-04-30-extend-core-modulo-genericos-dashboard-widgets` change as the prior art for the placeholder
- [ ] Verify `design.md` records the rationale for choosing Unovis over recharts / chart.js / plotly / d3
- [ ] Verify `design.md` documents the boundary between this capability (rendering primitives) and consuming modules (data fetching, business logic on the data shown)
- [ ] Verify `design.md` documents the explicit non-features (no donut as separate component, no mixed charts, no annotations, no zoom/pan, no PNG export, no real-time streaming inputs from `core-websocket-client`)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-charts-component-suite`
- [ ] Confirm the CLI applies the new capability (`openspec/specs/core-charts/spec.md`), the modified `core-theming`, and the modified `core-modulo-genericos`, then moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-charts-component-suite/`
- [ ] Final commit with conventional message: `specs: add core-charts capability with Unovis-backed wrappers and chart-N tokens`
