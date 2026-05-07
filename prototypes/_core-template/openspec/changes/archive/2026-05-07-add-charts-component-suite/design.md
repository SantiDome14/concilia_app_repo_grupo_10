# Design — add-charts-component-suite

## Context

This design captures the rationale behind opening `core-charts` as a new capability and locking `@unovis/vue` as the canonical charting library for the financial-core. The design choices below explain why Unovis specifically, why the wrapper layer is mandatory, and what is deliberately out of scope.

---

## Decision 1 — `@unovis/vue` as the canonical charting library, no alternatives

### The question

Charting libraries for Vue / web in 2026:

- **Unovis (`@unovis/vue`).** F5-maintained, Vue + React ports, MIT-licensed, ~30KB, declarative.
- **Chart.js (`vue-chartjs`).** Mature, ~100KB, canvas-based.
- **Recharts.** React-only port (no Vue official port); composable, ~70KB.
- **Plotly.js.** Heavyweight (~500KB+), scientific charts.
- **ApexCharts.** Vue port available, ~100KB+.
- **Highcharts.** Commercial license; not viable.
- **D3 directly.** Maximum power, maximum complexity.

### The decision

**Unovis (`@unovis/vue`).** Locked as the only library; alternatives forbidden.

### Why Unovis

- **Vue port is first-class.** Unovis ships Vue and React ports as parallel artifacts; the Vue port is not an afterthought.
- **Bundle size.** ~30KB gzip; the smallest after raw d3.
- **Token integration.** Unovis primitives accept CSS variable references for color — aligns directly with `core-theming`. No CSS overrides needed.
- **Already adopted in OPS.** OPS has `BarChart.vue` built on Unovis. Reusing the choice avoids adding a competing dep.
- **Declarative composition.** Maps to Vue's component model cleanly; no imperative `chart.update()` patterns.
- **License.** MIT — commercial-use safe.

### Why not the alternatives

- **Chart.js / `vue-chartjs`.** Canvas-based; harder to override colors from CSS; verbose imperative API.
- **Recharts.** No official Vue port; would require port-by-hand or adopting a community fork.
- **Plotly.** Bundle is too large for the use cases the financial-core needs (KPIs, time series, simple distributions).
- **ApexCharts.** Bundle is large; opinionated styling that fights `core-theming`.
- **D3 directly.** Too low-level for app developers; the abstraction Unovis provides is exactly what the template should standardise on.

### Why lock the choice

If apps could "pick the right library for the use case", every migration would import a different library. Same problem the spec set out to solve.

### Failure modes the rule prevents

- A developer adds `chart.js` because "Unovis lacks feature X" → spec rejects; if the feature is real, open an OpenSpec change extending `core-charts` instead of forking the library choice.

---

## Decision 2 — Wrapper components are mandatory; raw Unovis primitives are forbidden in app code

### The question

Should apps be allowed to use Unovis primitives directly (`VisXYContainer`, `VisLine`, `VisAxis`, etc.) when the wrapper doesn't cover their use case?

### The decision

**No.** Apps consume only the four wrappers. If a wrapper doesn't cover a need, the path is to extend the wrapper via an OpenSpec change — not to drop down to Unovis primitives.

### Why

- **Stable API across migrations.** Wrappers expose ~10 props. Unovis primitives expose hundreds. Locking to wrappers means apps have a tiny, stable, learnable surface — not a sprawling library to master.
- **Token enforcement.** Wrappers can refuse hardcoded hex colors at the API boundary. Primitives accept anything.
- **Consistency across apps.** Tooltips, legends, axes — wrappers render them the same way in every app. Direct primitive usage means each app can drift.

### Alternatives considered

- **Wrappers for common cases, primitives for edge cases.** Rejected. The "edge case" exception always grows; the wrapper layer becomes inconsistent.
- **No wrappers — apps use primitives directly with style guides.** Rejected. Style guides have lower compliance than typed wrappers.

### Failure modes the rule prevents

- App A uses `VisLine` directly with a hardcoded hex color → drift. Spec rejects: wrappers are the only entry point.
- App B styles tooltips differently from App C → drift. Wrappers ship one tooltip implementation.

---

## Decision 3 — Empty data renders `<EmptyState>`, not an empty canvas

### The question

When `data: []` is passed, three behaviours are possible:

1. Render the chart with empty axes (just the frame, no data points).
2. Render nothing (empty `<div>`).
3. Render the shared `<EmptyState>` component.

### The decision

**Option 3.** When `data: []`, the wrapper renders `<EmptyState>` from `core-error-handling`.

### Why

- **Empty-axes rendering is deceptive.** A user sees axes and assumes data is loading or thinks something failed silently.
- **Empty `<div>` is confusing.** Loses the visual cue of "this is where the chart should be".
- **`<EmptyState>` is the canonical no-data surface.** It's already used by tables, lists, drawers. Charts aligning with it is consistency.

### Why loading is the consumer's responsibility

The wrapper distinguishes "no data" from "data not yet fetched" — loading is the consumer's job (use `<Skeleton>` while pending). The wrapper sees only the post-fetch state.

### Failure modes the rule prevents

- A user sees an empty chart and doesn't know if it's loading, broken, or genuinely empty → eliminated by `<EmptyState>` for empty + `<Skeleton>` for loading.

---

## Decision 4 — Chart-N tokens (8 colors), shared across the app

### The question

How many series colors should the palette expose, and where do they live?

### The decision

**8 chart-N tokens** in `:root` of `globals.css`. Apps may override per-brand. Wrappers cycle past 8 with a `console.warn`.

### Why 8

- **Practical maximum.** A chart with > 8 series is hard to read regardless of color choice. The cap is a UX hint as much as a technical limit.
- **Distinguishable.** Designing 8 distinct hues is achievable; designing 16 always-distinguishable hues is not (some pairs blend in colorblind contexts).
- **Aligns with Tailwind's chart palette.** Tailwind themes typically expose 5–10 chart slots; 8 is comfortable middle.

### Why theming-layer (not chart-layer)

Chart colors are a **brand concern**. TRD's blue brand wants chart-1 to be blue-aligned; FIN's green brand wants chart-1 to be green-aligned. Owning the tokens in `core-theming` means each app gets its palette by overriding the same tokens it overrides for `--brand`, instead of hand-editing chart wrappers.

### Failure modes the rule prevents

- A chart in OPS uses TRD-blue series colors because the developer hardcoded them → eliminated; tokens propagate per app.

---

## Decision 5 — No streaming input from `core-websocket-client`

### The question

When `core-websocket-client` ships, charts could in principle subscribe to a topic and update live (a real-time price chart). Should the wrapper contract include a streaming integration?

### The decision

**No, not in v1.** The wrapper accepts `data: T[]`. Streaming charts are achieved by the consumer subscribing to a WS topic, accumulating data into a Pinia store or a reactive ref, and passing the ref to the wrapper. The wrapper re-renders reactively.

### Why

- **Decoupling.** Charts shouldn't know about transport. Consumers compose.
- **Simplicity.** Streaming as a first-class wrapper feature would require buffering policy, downsampling, retention windows — complex contracts.
- **Pinia is the right place.** Pinia stores already manage the "growing dataset" pattern; adding it to chart wrappers duplicates.

### Failure modes the rule prevents

- A chart wrapper that owns its own buffer + streaming policy → sprawling contract. Eliminated by the consumer-side composition.

---

## Decision 6 — Out of scope: donut as separate component, mixed charts, annotations, zoom/pan, PNG export

### Why each is out

- **Donut.** Already covered by `<PieChart :innerRadius="N">`. Separate `<DonutChart>` would duplicate.
- **Mixed (bar + line).** Real use case but rare in backoffice. If TRD or FIN demand, abre como capability extension with a `<MixedChart>` wrapper.
- **Annotations (reference lines, banded regions).** Useful for some analytics views; out of v1 because the data shapes vary per use case.
- **Zoom / pan.** Backoffice charts are read-only summaries; not exploratory data tools.
- **PNG export.** Apps can wrap the SVG and serialise themselves if they need export — typically rare.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-theming` | Tokens, palette, brand vars | `--chart-1` to `--chart-8` series tokens |
| `core-modulo-genericos` | Dashboard composition rules, evolution chart placeholder slot | Mandate that the placeholder is filled by a canonical wrapper |
| `core-error-handling` | Toasts, banners, EmptyState, Skeleton | Empty data in charts renders `<EmptyState>`; loading is `<Skeleton>` (consumer-side) |
| `core-data-tables` | Table primitives, pagination, filtering | A common pattern is "chart on top, table below" — the spec does NOT contract the layout pairing; design recommendation only |

---

## Open questions

1. **Real-time streaming integration.** When `core-websocket-client` ships and TRD wants a live BTC/USD chart, what's the canonical wiring? Documented as consumer-side composition for v1; if the pattern repeats across apps, may be promoted to a contract.
2. **Mixed charts.** When TRD or FIN demand bar + line overlapped (e.g., volume bars + price line). Abre como `add-mixed-chart-component`.
3. **Donut variant API.** `:innerRadius` is one prop today. If apps need fine control (start angle, color order, label placement), extend through an OpenSpec change.
4. **Chart preset library.** A future capability could ship "common chart configurations" (e.g., "stacked area for cash flow", "bar with reference line for limits") as ready-to-use composites. Out of v1.
5. **Theming dark vs. light mode.** The current template is dark-mode-only. When light mode arrives, the chart-N tokens are inherited automatically — no chart-level change needed.
