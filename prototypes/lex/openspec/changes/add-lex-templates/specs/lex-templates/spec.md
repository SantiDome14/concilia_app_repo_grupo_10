## ADDED Requirements

### Requirement: Templates MUST be defined in a single typed registry

The frontend SHALL expose the eight templates from a single TypeScript module — the canonical path is `src/lex/templates/registry.ts`. The module MUST export (a) a `LexTemplateId` union literal type covering exactly the eight canonical identifiers, (b) a `LEX_TEMPLATES` object keyed by `LexTemplateId` whose values are objects of shape `{ id, label, shortLabel, origin, modality, colorToken }`, and (c) a `LEX_TEMPLATE_IDS` runtime array used for iteration. Pages and components MUST NOT inline template UUIDs, colour values, or labels.

#### Scenario: Importing a template by id returns its full record

- **GIVEN** a component imports `LEX_TEMPLATES` and reads `LEX_TEMPLATES['ardua-kyc']`
- **WHEN** the value is consumed
- **THEN** the returned object exposes `id`, `label`, `shortLabel`, `origin`, `modality`, and `colorToken` matching the row "Ardua KYC" in the Context table

#### Scenario: Inlining a template UUID in a page is forbidden

- **GIVEN** a pull request introduces a hex string identical to an entry in `LEX_TEMPLATES` inside `src/pages/Clientes.vue`
- **WHEN** the change is reviewed
- **THEN** the reviewer rejects the change and requires the lookup to go through `LEX_TEMPLATES`

#### Scenario: TypeScript narrows unknown ids out of the union

- **GIVEN** a function declares `function paint(id: LexTemplateId)`
- **WHEN** a caller invokes `paint('unknown-template')`
- **THEN** the TypeScript compiler rejects the call at build time

---

### Requirement: Template short labels MUST drive table cells and badges

When a Cliente or Alta row renders a template, the visible content SHALL be the registry's `shortLabel`, not the full label and not the UUID. The cell MUST also expose the full label as a native `title` tooltip so the abbreviation is hover-discoverable. Badge components MUST use `colorToken` from the registry — pages MUST NOT compose tailwind classes ad hoc to colour a template.

#### Scenario: Clientes table renders the short label

- **GIVEN** a row in `/clientes` whose `onboarding.template_id` is `local-kyb`
- **WHEN** the Plantilla column renders
- **THEN** the visible text is `Local KYB` and the cell `title` attribute is the full label `Local KYB`

#### Scenario: Altas table colours the badge from the registry

- **GIVEN** a row in `/altas` whose `onboarding.template_id` is `ardua-kyc-al`
- **WHEN** the Plantilla badge renders
- **THEN** the badge's background is driven by the CSS variable `--badge-template-ardua-kyc-al` rather than an inline hex value

#### Scenario: Unknown template id falls back to a neutral badge

- **GIVEN** a row whose `onboarding.template_id` is not present in `LEX_TEMPLATES`
- **WHEN** the Plantilla cell renders
- **THEN** the cell shows the literal id string and applies the neutral surface badge variant; no console error is raised but `devWarn` (per `core-error-handling`) reports the missing registry entry once per session

---

### Requirement: Template filters MUST be backed by the registry

The Plantilla filter on `/clientes` and `/altas` SHALL build its option list by iterating `LEX_TEMPLATE_IDS` in declaration order. The selected value is the `LexTemplateId` itself; when a user picks an option, the filter MUST send the value to the backend exactly as it appears on `template_id` records. Filter components MUST use the shared shadcn-vue Select per `core-forms`, never a native `<select>`.

#### Scenario: Filter dropdown lists exactly eight options

- **GIVEN** a `COMMERCIAL_LEX` user opens the Plantilla filter on `/clientes`
- **WHEN** the dropdown renders
- **THEN** it lists exactly eight options whose values are the canonical `LexTemplateId` strings and whose labels are the registry `label` field

#### Scenario: Selecting a template updates the query string

- **GIVEN** a user selects "Ardua KYB" in the Plantilla filter
- **WHEN** the selection commits
- **THEN** the URL query becomes `?template_id=ardua-kyb` and the `GET /client` request includes `template_id=ardua-kyb`

#### Scenario: Clearing the filter removes the parameter

- **GIVEN** the Plantilla filter currently equals `local-kyc`
- **WHEN** the user clicks the filter's clear affordance
- **THEN** `template_id` is removed from the URL query and from the next `GET /client` request

---

### Requirement: Cliente detalle MUST render the template inside the Onboarding section

The Detalles tab (`lex-cliente-detalle`) SHALL render the Cliente's onboarding template using the registry's full `label` (not `shortLabel`) inside the dedicated Onboarding sub-section. The template line MUST sit alongside the AIPrise identifier and a deep link out to the AIPrise dashboard, per `discoveries/lex-discovery.md` §4.7.

#### Scenario: Detalles tab shows the full template label

- **GIVEN** a Cliente whose `onboarding.template_id` is `ardua-kyc-extra`
- **WHEN** the user opens `/clientes/:id?tab=detalles`
- **THEN** the Onboarding section displays the full label `Ardua KYC v2` and the registered `colorToken` is applied to the surrounding badge

#### Scenario: Onboarding section is unaffected by an unknown template id

- **GIVEN** a Cliente whose backend payload contains an unrecognised `template_id`
- **WHEN** the Detalles tab mounts
- **THEN** the Onboarding section renders the raw id, no badge colour is applied, and the rest of the section (AIPrise id, status, link) renders normally
