## ADDED Requirements

### Requirement: Derived apps MUST replace template demo manifests with domain manifests

A core app derived from `core-template-frontend` SHALL NOT keep the four template demo action manifests (`framework.template.inbox.actions.ts`, `framework.template.alertas.actions.ts`, `framework.template.modulo_a.actions.ts`, `framework.template.reportes.actions.ts`) past its migration baseline. The derived app MUST either delete them outright or replace them with domain-specific manifests keyed by `<app>.<module>[.<record_type>]` (e.g. `fin.operaciones.movimientos`, `lex.contratos`). The manifest registry plugin (`src/plugins/manifests.ts`) MUST register only manifests that the app actually consumes; orphan registrations are forbidden.

#### Scenario: A migrated app has zero `framework.template.*` manifests

- **GIVEN** a derived app whose migration is declared complete
- **WHEN** `src/manifests/` is listed and `src/plugins/manifests.ts` is read
- **THEN** there are no files matching `framework.template.*.actions.*` AND there are no `framework.template.*` keys registered

#### Scenario: Each registered manifest is consumed by at least one page

- **GIVEN** a manifest is registered in `src/plugins/manifests.ts`
- **WHEN** a `git grep` is run for the manifest key string
- **THEN** at least one `<ManifestActionsMenu>` or `<ManifestModuleCTAs>` component or `useManifestModule()` call references that key

### Requirement: Derived apps MUST set the brand identity in lockstep across the three rebrand surfaces

When a derived app is created from the template, the rebrand SHALL touch three surfaces in the same commit: (a) `package.json` `name` SHALL match the canonical `core-<module>` slug, (b) `index.html` `<title>` SHALL identify the app and its parent organization (e.g. `FIN · Ardua — Finanzas y Contabilidad`), (c) `src/styles/globals.css` `--brand` SHALL be set to the module's canonical HSL value from the `core-theming` palette. Drifting any of the three from the canonical values SHALL be rejected as a brand-consistency violation.

#### Scenario: A FIN-derived app declares its identity consistently

- **GIVEN** the FIN app derived from the template
- **WHEN** `package.json` `name` is `core-fin`, `index.html` `<title>` is `FIN · Ardua — Finanzas y Contabilidad`, and `src/styles/globals.css` `--brand` is `142 71% 45%`
- **THEN** the rebrand surfaces are aligned and the contract is satisfied

#### Scenario: Mismatched brand surfaces are rejected at review

- **GIVEN** a derived app whose `package.json` is `core-fin` but whose `--brand` is still the template default `0 84% 60%`
- **WHEN** the migration PR is reviewed
- **THEN** the change MUST be rejected — the brand surfaces SHALL be updated together
