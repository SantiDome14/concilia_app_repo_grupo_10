## ADDED Requirements

### Requirement: Chart series colors MUST be tokenized via `--chart-N` custom properties

The theming layer SHALL expose 8 chart series tokens (`--chart-1` through `--chart-8`) in `:root` of `src/styles/globals.css`. The tokens SHALL be designed as a sequence of perceptually distinct hues that work together when displayed in adjacent series. Each app inheriting the template MAY override these tokens for its brand alignment but the contract holds: 8 distinct, perceptually distinguishable, all defined as CSS variables. Hardcoded chart series colors in component code (raw hex / rgb) are forbidden — every chart series resolves through `--chart-N` or through token aliases of the semantic palette (`success`, `warning`, `danger`, `info`, `neutral`).

#### Scenario: Theme defines 8 chart series tokens

- **GIVEN** the `globals.css` of an app derived from the template
- **WHEN** the file is inspected
- **THEN** `:root` includes definitions for `--chart-1` through `--chart-8`, each as an HSL or oklch value (NOT hex / rgb), with `chart-1` typically aligned to the app's `--brand` and the rest perceptually distinct

#### Scenario: Hardcoded hex in chart series code is rejected

- **GIVEN** a chart wrapper internal implementation hardcoding `colors: ['#1f77b4', '#ff7f0e']` (matplotlib classic palette)
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — series colors SHALL resolve through `--chart-N` tokens; raw hex breaks brand portability

#### Scenario: App overrides chart palette to match brand

- **GIVEN** TRD overrides its `--chart-1` to align with the TRD blue brand
- **WHEN** any chart in TRD renders without explicit `colors` prop
- **THEN** the first series renders in the TRD-blue tone — the rest of the apps (OPS red, FIN green, LEX teal) keep their own palette
