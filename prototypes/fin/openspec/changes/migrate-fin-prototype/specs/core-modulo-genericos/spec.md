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

### Requirement: Every core app MUST mount a singleton SettingsDialog reachable from the Sidebar account menu

Every Ardua core app SHALL mount the shared `<SettingsDialog>` component once at the App root and expose it via the Sidebar account menu's `Settings` entry. The dialog SHALL host vertical side tabs scaffolded for `General`, `Account`, `Notifications`, `Security`, `Integrations`. The `General` tab is the only tab REQUIRED in the baseline; the rest MAY render as `Soon` placeholders.

The `General` tab SHALL host a `Preferences` section with at minimum two entries:

- **Idioma / Language** — a `<Select>` listing the available locales (`es`, `en` in v1). Persisted to the `preferences` Pinia store under `language`. When `vue-i18n` is enabled (via `VITE_FEATURE_I18N=true`), the locale switch takes effect on next render; otherwise the value is persisted but remains pending.
- **Apariencia / Appearance** — a 3-button segmented control with the three canonical options `System` / `Light` / `Dark`. Persisted to `preferences.appearance`. Selection writes the corresponding class (`light` or `dark` resolved from `system`) onto `<html>` per the `core-theming` MODIFIED requirement above.

Opening the dialog MUST be done via `useSettingsDialog().open()` — a module-singleton composable so opening from multiple sites doesn't double-mount the overlay. The dialog itself MUST live exactly once in the app tree (mounted in `src/App.vue`).

#### Scenario: Sidebar account menu surfaces the Settings entry

- **GIVEN** the Sidebar's account menu is rendered
- **WHEN** the user clicks the `Settings` button
- **THEN** `useSettingsDialog().open()` is invoked AND the singleton dialog opens to the `General` tab AND the account menu closes

#### Scenario: General tab persists the appearance choice

- **GIVEN** the dialog is open on the `General` tab
- **WHEN** the user clicks the Light button on the Appearance toggle
- **THEN** `preferences.appearance` becomes `'light'` AND the value is written to `localStorage` AND `<html>` swaps `dark` for `light` AND the toggle highlights the Light option

#### Scenario: General tab persists the language choice

- **GIVEN** the dialog is open and the user picks `English` in the Idioma select
- **WHEN** the change is committed
- **THEN** `preferences.language` becomes `'en'` AND the value is persisted; if `VITE_FEATURE_I18N` is enabled, the i18n locale also flips

#### Scenario: Future tabs render as Soon placeholders

- **GIVEN** an app that has not yet implemented the `Account` / `Notifications` / `Security` / `Integrations` tabs
- **WHEN** the user opens Settings
- **THEN** those tabs render in the side rail with a `Soon` chip and are not selectable
