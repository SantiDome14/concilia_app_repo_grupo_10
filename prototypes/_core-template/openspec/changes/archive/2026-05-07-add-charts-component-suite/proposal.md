- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — habilita TRD, OPS, FIN Dashboard evolution chart placeholder

# Add charts component suite (Unovis) — Line / Bar / Area / Pie wrappers

## Why

Tres frentes del financial-core ya ejercen charting con tres librerías distintas: TRD (`recharts` 2.12.7), OPS (`@unovis/vue` con un único `BarChart.vue`), FIN (placeholder de evolution chart en su Dashboard). El template HOY no especifica librería ni provee primitivos canónicos. Sin esta change cualquier migración va a heredar la decisión local — TRD trae `recharts` (que NO tiene puerto Vue oficial maduro y obligaría a port a Vue), OPS escala su Unovis local, FIN improvisa.

El paradigma del template exige una sola identidad visual. Esta change adopta **Unovis** como librería oficial de charting del financial-core (ya elegida en OPS, soporta Vue nativamente con `@unovis/vue`, MIT-licensed, integra cleanly con Tailwind tokens) y entrega un set de wrappers tipados (`LineChart`, `BarChart`, `AreaChart`, `PieChart`) con la API del template. Adicionalmente cierra contractualmente el "chart placeholder" del Dashboard que el change archivado `2026-04-30-extend-core-modulo-genericos-dashboard-widgets` dejó como slot abierto.

## What Changes

- **`core-theming`** — un requirement añadido:
  - **ADDED** "Chart series colors MUST be tokenized via `--chart-N` custom properties" — formaliza el esquema `--chart-1` a `--chart-8` (ya parcialmente presente en el theme actual) como tokens canónicos de series; los wrappers consumen esos tokens automáticamente para cada serie según su orden; hardcoded hex per-series está prohibido.
- **`core-modulo-genericos`** — un requirement añadido:
  - **ADDED** "Dashboard evolution chart placeholder MUST render via the canonical `<LineChart>` / `<BarChart>` / `<AreaChart>` wrappers" — cierra el slot que `add-core-modulo-genericos-dashboard-widgets` dejó abierto: el placeholder ahora SHALL be filled by one of the chart wrappers, no por una implementación custom.
- **New capability `core-charts`** con requirements para:
  - **Library lock** — `@unovis/vue` es la librería oficial; otras librerías de charting (recharts, chart.js, plotly, d3 directo, ApexCharts, Highcharts) están prohibidas en código de aplicación.
  - **Wrapper components** — `<LineChart>`, `<BarChart>`, `<AreaChart>`, `<PieChart>` con props canónicos (`data`, `series`, `xAccessor`, `yAccessor`, `colors?`, `height?`, `tooltip?`, `legend?`).
  - **Color resolution** — los colores de series resolutan a `--chart-N` según el orden de la serie; consumer-provided `colors` arrays SHALL be token aliases o `var(--*)` references, hardcoded hex prohibido.
  - **Responsive scaling** — los wrappers SHALL llenar el contenedor padre por default; el consumidor controla el tamaño con CSS layout.
  - **Empty state** — cuando `data: []` el chart SHALL render `<EmptyState>` (de `core-error-handling`) en vez de un canvas vacío engañoso.
  - **Accessibility** — los charts SHALL exponer `<title>`/`<desc>` SVG y un `aria-label` describiendo el chart en una oración.

## Capabilities

### Affected Capabilities

- `core-theming` — un requirement añadido (chart-N tokens).
- `core-modulo-genericos` — un requirement añadido (Dashboard chart placeholder).

### New Capabilities

- `core-charts` — net-new. 6 requirements iniciales cubriendo library lock, wrappers, color tokenization, responsive scaling, empty state, accessibility.

### Cross-capability dependencies

- Compone con `core-error-handling` — los empty states del chart usan `<EmptyState>`; los errores de fetch que alimentan el chart usan toasts / banners según el caso.
- Compone con `core-data-tables` — un patrón típico es un chart arriba y la tabla con los datos crudos abajo; la spec NO contracta el patrón, lo recomienda en design.md.

## Notes

- La spec NO contracta **donut variant** de pie chart como un componente separado — `<PieChart :innerRadius="N">` cubre ambos casos.
- La spec NO contracta **mixed charts** (barras + línea overlapped). Si aparece la demanda, se contracta como `<MixedChart>` separado.
- La spec NO contracta **annotations** (líneas de referencia, áreas marcadas, etiquetas custom). Out of v1; las apps componen con primitives de Unovis si lo necesitan.
- La spec NO contracta **zoom / pan** interactivo. Backoffice charts son típicamente read-only.
- La spec NO contracta **export PNG / SVG** del chart desde la UI. Si una app necesita exportar, lo hace via canvas/svg manipulation fuera del componente.
