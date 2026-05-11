# core-charts Specification

## Purpose
TBD - created by archiving change add-charts-component-suite. Update Purpose after archive.
## Requirements
### Requirement: All chart rendering MUST use `@unovis/vue` via the contracted wrapper components

The financial-core SHALL adopt `@unovis/vue` as its single charting library. Direct use of other charting libraries (`recharts`, `chart.js`, `plotly.js`, `apexcharts`, `highcharts`, `vue-chartjs`, raw `d3`, etc.) inside application code is forbidden — every chart SHALL be rendered through one of the contracted wrapper components: `<LineChart>`, `<BarChart>`, `<AreaChart>`, `<PieChart>`. The wrappers SHALL be defined in `src/components/data-display/` and SHALL re-export only the props contracted in this capability — exposing the underlying Unovis primitives directly is forbidden so apps cannot bypass the contract.

#### Scenario: A module renders a chart through the wrapper

- **GIVEN** a TRD module needs to display a quote-volume time series
- **WHEN** the module is authored
- **THEN** it imports `<LineChart>` from `@/components/data-display/LineChart.vue` and uses it with the contracted props — direct imports from `@unovis/vue` are forbidden in module code

#### Scenario: Adopting a competing chart library is forbidden

- **GIVEN** a developer adds `recharts` or `chart.js` to a module to use "a feature Unovis lacks"
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the canonical library is `@unovis/vue`; if a feature is genuinely missing, open an OpenSpec change extending this capability rather than introducing a parallel library

#### Scenario: Re-exporting Unovis primitives directly is forbidden

- **GIVEN** a developer creates `src/components/data-display/index.ts` re-exporting `VisXYContainer`, `VisLine`, etc., directly from `@unovis/vue`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the re-exports — apps consume only the four contracted wrappers; the underlying primitives are an implementation detail of the wrappers

### Requirement: Chart wrappers MUST expose the canonical props contract

Each wrapper SHALL accept the following base props: `data: T[]` (the dataset, generic over the consumer's domain type), `xAccessor: (d: T) => number | string | Date` (function reading the X dimension from each datum), `yAccessor: (d: T) => number | ((d: T) => number)[]` (function reading the Y dimension; can be an array of accessors for multi-series), `series?: { name: string; accessor: (d: T) => number }[]` (alternative explicit series declaration), `colors?: (string | TokenAlias)[]` (per-series colors as token aliases like `'success'` or `var(--chart-N)`; hardcoded hex forbidden), `height?: number | string` (default `'100%'` to fill parent), `tooltip?: boolean` (default `true`), `legend?: boolean` (default `true`). Wrapper-specific props are limited: `<PieChart>` accepts `innerRadius?` (for donut variant); `<BarChart>` accepts `orientation?: 'vertical' | 'horizontal'` (default `'vertical'`) and `mode?: 'grouped' | 'stacked'` (default `'grouped'`); other wrapper-specific props require an OpenSpec change to extend.

#### Scenario: LineChart consumes the canonical props

- **GIVEN** a consumer renders `<LineChart :data="trades" :xAccessor="t => t.date" :yAccessor="t => t.volume" :colors="['var(--chart-1)']">`
- **WHEN** the chart renders
- **THEN** it shows a line with X = trade dates, Y = volumes, in the color resolved from `--chart-1`

#### Scenario: Multi-series LineChart via series prop

- **GIVEN** a consumer needs three series and renders `<LineChart :data="d" :xAccessor="x" :series="[{ name: 'BTC', accessor: d => d.btc }, { name: 'ETH', accessor: d => d.eth }, { name: 'USDT', accessor: d => d.usdt }]">`
- **WHEN** the chart renders
- **THEN** three lines render with colors resolved from `--chart-1`, `--chart-2`, `--chart-3` respectively (in series declaration order); the legend shows the three names

#### Scenario: PieChart with innerRadius renders a donut

- **GIVEN** a consumer renders `<PieChart :data="distribution" :xAccessor="d => d.label" :yAccessor="d => d.value" :innerRadius="60">`
- **WHEN** the chart renders
- **THEN** the chart renders as a donut with inner radius 60 (px) — passing `innerRadius="0"` (or omitting) renders a full pie

#### Scenario: Wrapper-specific props beyond the contract are rejected

- **GIVEN** a developer extends `<LineChart>` to accept `:smooth="true"` (a Unovis feature) without an OpenSpec change
- **WHEN** the change is reviewed
- **THEN** the review MUST reject — extending the wrapper API requires an OpenSpec change that updates this contract; ad-hoc prop additions diverge the contract across apps

### Requirement: Chart series colors MUST resolve through `--chart-N` tokens

Series colors SHALL resolve from a tokenized palette of 8 series colors defined in `core-theming`: `--chart-1` through `--chart-8`. When the consumer passes `colors` explicitly, each entry SHALL be either a token alias (`'success' | 'warning' | 'danger' | 'info' | 'neutral'`, resolved against the `core-theming` semantic palette) or a `var(--chart-N)` reference. Hardcoded hex / rgb values in the `colors` array are forbidden. When the consumer does NOT pass `colors`, the wrapper SHALL auto-assign `--chart-N` to each series in declaration order (cycling at series 9 with a `console.warn`).

#### Scenario: Auto-assigned colors follow the chart-N order

- **GIVEN** a `<BarChart>` with three series declared and no `colors` prop
- **WHEN** the chart renders
- **THEN** the three series resolve to `var(--chart-1)`, `var(--chart-2)`, `var(--chart-3)` in declaration order

#### Scenario: Token alias in colors prop resolves correctly

- **GIVEN** a chart with `:colors="['success', 'danger']"` for two series (e.g., positive vs. negative trades)
- **WHEN** the wrapper resolves the colors
- **THEN** series 1 gets `var(--success)` and series 2 gets `var(--danger)` per the `core-theming` semantic palette

#### Scenario: Hardcoded hex in colors array is forbidden

- **GIVEN** a developer passes `:colors="['#1B1B64', '#FF5733']"` to a chart
- **WHEN** the change is reviewed
- **THEN** the review MUST reject — colors SHALL be token aliases or `var(--*)` references; raw hex breaks brand portability

#### Scenario: Cycling beyond series 8 emits a warning

- **GIVEN** a chart with 10 series and no `colors` prop
- **WHEN** the wrapper auto-assigns
- **THEN** series 1–8 use `--chart-1` through `--chart-8` in order; series 9–10 cycle back to `--chart-1` and `--chart-2` and `console.warn` logs `"Chart series count exceeds 8 — colors will repeat"`

### Requirement: Chart wrappers MUST fill their parent container by default

The wrappers SHALL default to `height: '100%'` and SHALL render at the size of their parent's bounding box. Consumers control sizing through layout (Tailwind `h-64`, `aspect-video`, `min-h-[200px]`, etc.). The wrappers SHALL NOT impose a fixed pixel size by default — fixed sizes are passed explicitly via the `height` prop only when the consumer wants to override. The wrappers SHALL re-render correctly on viewport resize without a manual call from the consumer.

#### Scenario: Chart fills a Tailwind-sized container

- **GIVEN** a `<div class="h-64 w-full">` containing a `<LineChart :data="...">`
- **WHEN** the chart renders
- **THEN** the chart renders at 256px tall (Tailwind `h-64`) and full container width; resizing the window adjusts the chart accordingly

#### Scenario: Explicit height overrides the default

- **GIVEN** a `<LineChart :data="..." :height="400">` placed inside a flex container
- **WHEN** the chart renders
- **THEN** the chart renders at exactly 400px tall, ignoring the container's height

### Requirement: Empty data MUST render `<EmptyState>` instead of an empty chart canvas

When the `data` prop is an empty array, the wrapper SHALL NOT render the chart canvas — it SHALL render the shared `<EmptyState>` component from `core-error-handling` with a default message (`"Sin datos para mostrar"`, overridable via prop). This avoids the deceptive "empty axes with no data" rendering that confuses users about whether the chart is loading vs. has no data.

#### Scenario: Empty data array shows EmptyState

- **GIVEN** a `<BarChart :data="[]" :xAccessor="..." :yAccessor="...">`
- **WHEN** the wrapper renders
- **THEN** the chart canvas does NOT render; the `<EmptyState>` renders in place with the default empty message

#### Scenario: Custom empty message is supported

- **GIVEN** a `<LineChart :data="[]" :emptyMessage="'No hay quotes en el período seleccionado'">`
- **WHEN** the wrapper renders
- **THEN** the `<EmptyState>` renders with the custom message instead of the default

#### Scenario: Loading state is the consumer's responsibility, not the wrapper's

- **GIVEN** a consumer fetching data with vue-query and the query is `isPending`
- **WHEN** the wrapper would render
- **THEN** the consumer SHALL render `<Skeleton>` while pending; the chart wrapper does NOT distinguish loading from empty — its empty state is for `data: []` AFTER fetch resolves

### Requirement: Chart wrappers MUST be accessible via SVG title and ARIA label

Each chart's underlying SVG SHALL include a `<title>` element (the value of the `title` prop, e.g., `"Quote volume by month"`) and a `<desc>` element with a one-sentence summary of what the chart depicts. The wrapper component SHALL expose `aria-label` on its root element with the same one-sentence summary so screen readers announce the chart purpose. When `title` is omitted, the wrapper SHALL warn in dev mode (`console.warn`) that accessibility metadata is missing — production builds do not emit the warning but the contract still mandates it.

#### Scenario: Title and description render in the SVG

- **GIVEN** a `<LineChart :data="..." title="Volumen mensual" description="Volumen total de quotes ejecutados por mes en el último trimestre">`
- **WHEN** the chart renders
- **THEN** the SVG includes `<title>Volumen mensual</title>` and `<desc>Volumen total ...</desc>`; the root element exposes `aria-label="Volumen total de quotes ..."`

#### Scenario: Missing title warns in dev mode

- **GIVEN** a `<BarChart :data="...">` without a `title` prop in development build
- **WHEN** the wrapper mounts
- **THEN** `console.warn` logs `"Chart missing accessible title — pass the 'title' prop to populate <title>/<desc>"`; the chart still renders but accessibility metadata is incomplete

