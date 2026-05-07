## ADDED Requirements

### Requirement: Each relationship picker MUST follow a shared component contract

The five pickers SHALL extend a single base composable `useRelationshipPicker<T>()` and a shared shadcn-vue popover surface. The base SHALL accept `{ kind, parentClientId, onAttach, onCancel }` and SHALL render: (a) a debounced search input over Cliente name and CUIT, (b) a virtualised list of candidates, (c) a "Crear nuevo" CTA that opens the matching Create modal (when the relationship kind allows creating its target), (d) per-type metadata fields rendered after a candidate is picked. Each picker SHALL be a thin wrapper specialising the base — pages MUST NOT replicate the search-debounce-popover pattern outside the base.

#### Scenario: Search input is debounced 300 ms

- **GIVEN** a user opens `SelectBeneficiary` and types `Acme` character by character
- **WHEN** 300 ms elapse without further input
- **THEN** exactly one `GET /client?type=PARTICULAR&search=Acme` request fires; intermediate keystrokes do not produce requests

#### Scenario: Crear nuevo CTA is hidden for kinds that cannot create targets

- **GIVEN** the user opens `SelectMergeClient` (the merge target must already exist)
- **WHEN** the popover renders
- **THEN** the `Crear nuevo` CTA is not rendered

#### Scenario: Cancel closes without mutation

- **GIVEN** a user has a candidate selected but has not confirmed
- **WHEN** the user clicks Cancelar
- **THEN** the popover closes, no mutation request fires, and the Detalles tab data is unchanged

---

### Requirement: SelectBeneficiary MUST capture ownership_percent and beneficiary_due_date

When the parent Cliente is a `COMPANY`, the Detalles tab SHALL render `SelectBeneficiary`. After picking a `PARTICULAR` candidate, the picker SHALL render two required metadata fields: `ownership_percent` (number, 0 < value ≤ 100, two decimals) and `beneficiary_due_date` (date, must be in the future). On confirm, the picker SHALL call `POST /client/:companyId/relationships` with `{ kind: 'BENEFICIARY', to_client_id, ownership_percent, beneficiary_due_date }`. Per `core-forms` Requirement "Forms MUST use vee-validate + zod for validation", the metadata fields SHALL be validated with a zod schema before submit.

#### Scenario: Picker is unavailable for non-COMPANY parents

- **GIVEN** the parent Cliente is a `PARTICULAR`
- **WHEN** the Relaciones section renders
- **THEN** the `SelectBeneficiary` trigger is not rendered (the kind is restricted to COMPANY parents)

#### Scenario: ownership_percent is bounded

- **GIVEN** the user has picked a candidate and types `120` in the ownership_percent field
- **WHEN** the user attempts to submit
- **THEN** the submit button is disabled and an inline error reads `El porcentaje debe estar entre 0 y 100`

#### Scenario: Successful attach refetches the Detalles tab

- **GIVEN** the form is valid with `ownership_percent=25.5` and `beneficiary_due_date=2027-06-30`
- **WHEN** the user submits and the backend returns 201
- **THEN** the popover closes, the `['lex','client',companyId]` query refetches, and a toast `Beneficiario agregado` is shown

---

### Requirement: SelectBeneficiary MUST surface similarity warnings before creating a new beneficiary

When the user picks `Crear nuevo` inside `SelectBeneficiary`, the create form SHALL fire a debounced `GET /client?tax_number_or_similar=...` and render any returned `similarity_warnings[]` inline beneath the `tax_number` input. Each warning SHALL show the matching Cliente's name, dockets, similarity score, and a CTA `Reemplazar por este cliente`. Choosing `Reemplazar por este cliente` SHALL skip creation and instead call `POST /client/:companyId/relationships` with `{ kind: 'BENEFICIARY', to_client_id }` referencing the existing Cliente. This implements the merge-on-create pattern documented in `discoveries/lex-discovery.md` §3.5.

#### Scenario: Similarity warning offers replacement

- **GIVEN** the user enters a CUIT that matches an existing PARTICULAR at similarity 0.92
- **WHEN** 300 ms elapse without further input
- **THEN** an inline warning shows the existing Cliente with similarity score `0.92` and a CTA `Reemplazar por este cliente`

#### Scenario: Replacement skips creation

- **GIVEN** the warning offers `Reemplazar por este cliente` for Cliente `c-99`
- **WHEN** the user clicks the CTA
- **THEN** no `POST /client` is fired; instead `POST /client/:companyId/relationships` is fired with `to_client_id='c-99'`

#### Scenario: Cleared CUIT clears the warnings

- **GIVEN** the warning block is showing two matches
- **WHEN** the user clears the CUIT field
- **THEN** the warning block disappears and the CTA reverts to `Crear beneficiario`

---

### Requirement: SelectCoOwner MUST be limited to PARTICULAR ↔ PARTICULAR pairs

`SelectCoOwner` SHALL be available only when the parent Cliente is `PARTICULAR`. The candidate list SHALL be filtered to `type=PARTICULAR` and SHALL exclude the parent Cliente from the results. On confirm, the picker SHALL call `POST /client/:particularId/relationships` with `{ kind: 'CO_OWNER', to_client_id }` (no metadata required in v1). The same target Cliente SHALL not be added twice; the picker MUST disable existing co-owners in the candidate list with the tooltip `Ya es cotitular`.

#### Scenario: Picker is unavailable for COMPANY parents

- **GIVEN** the parent Cliente is a `COMPANY`
- **WHEN** the Relaciones section renders
- **THEN** the `SelectCoOwner` trigger is not rendered

#### Scenario: Existing co-owner is disabled in the list

- **GIVEN** the parent Cliente already has co-owner `c-77` and the user searches for `c-77`
- **WHEN** the candidate row renders
- **THEN** the row is disabled with the native tooltip `Ya es cotitular` and clicking it does not select the candidate

#### Scenario: Self-attachment is blocked

- **GIVEN** the parent Cliente id is `c-1` and the user types the parent's own CUIT
- **WHEN** the candidate list renders
- **THEN** the parent Cliente is filtered out of the results and not selectable

---

### Requirement: SelectGrouper MUST be limited to GROUPER → DIRECT pairs

`SelectGrouper` SHALL be available on Cliente records whose `client_types[]` contains `DIRECT`. The candidate list SHALL be filtered to Cliente records whose `client_types[]` contains `GROUPER`. On confirm, the picker SHALL call `POST /client/:directId/relationships` with `{ kind: 'GROUPER', to_client_id }`. Each `DIRECT` Cliente MAY have at most one `GROUPER`; if one already exists, the picker SHALL render a confirmation step explaining the existing relationship will be replaced.

#### Scenario: Picker hides for GROUPER-only Clientes

- **GIVEN** a Cliente whose `client_types[]` is `['GROUPER']`
- **WHEN** the Relaciones section renders
- **THEN** the `SelectGrouper` trigger is not rendered

#### Scenario: Replacing the existing grouper requires explicit confirmation

- **GIVEN** the parent Cliente already has a GROUPER `c-50` and the user picks a different GROUPER `c-60`
- **WHEN** the user attempts to confirm
- **THEN** a destructive confirmation dialog opens stating the existing relationship will be replaced; only after confirm does `POST /client/:directId/relationships` fire

#### Scenario: Successful attach refreshes the Relaciones section

- **GIVEN** the parent Cliente has no current grouper
- **WHEN** the user picks `c-50` and confirms
- **THEN** the `['lex','client',directId]` query refetches and the Relaciones section now lists `c-50` as the agrupador

---

### Requirement: SelectMergeClient MUST consolidate two Cliente records via POST /client/:id/merge

`SelectMergeClient` SHALL be exposed only to `ADMIN_LEX` users per `lex-roles` and only on the source Cliente that will be discarded (the page is opened on the duplicate). The picker SHALL search every Cliente type and SHALL exclude the source from results. On confirm, a destructive confirmation dialog SHALL surface listing every relationship and document that will move from the source to the target, then SHALL fire `POST /client/:sourceId/merge { target_client_id }`. On 200 the user SHALL be redirected to `/clientes/:targetId?tab=detalles` and a persistent alert banner SHALL note that the consolidation is irreversible.

#### Scenario: SelectMergeClient is hidden for non-ADMIN_LEX

- **GIVEN** a `COMMERCIAL_LEX` user opens the Relaciones section of any Cliente
- **WHEN** the section renders
- **THEN** the `SelectMergeClient` trigger is not rendered

#### Scenario: Confirmation lists what will move

- **GIVEN** the source has 3 documents and 2 relationships
- **WHEN** the destructive confirmation dialog opens
- **THEN** the body lists `3 documentos` and `2 relaciones` that will migrate to the target

#### Scenario: Successful merge redirects to the target

- **GIVEN** the user confirms the merge from source `c-1` into target `c-99`
- **WHEN** the API returns 200
- **THEN** the URL becomes `/clientes/c-99?tab=detalles`, an alert banner reads `Cliente fusionado · acción no reversible`, and the source Cliente is no longer reachable

---

### Requirement: Removing a relationship MUST go through the destructive confirmation pattern

The Relaciones section SHALL render each existing relationship as a card with a Quitar action. Triggering Quitar SHALL open a destructive confirmation dialog per `core-modals` Requirement "Confirmation dialogs MUST follow the destructive action pattern" — danger-accent header, target Cliente name in the body, verb-specific action `Quitar`, ghost `Cancelar` on the left, danger-variant `Quitar` on the right. Confirmation SHALL fire `DELETE /client/:parentId/relationships/:relationshipId` and refetch the Cliente. Quitar MUST be hidden for `VIEWER_LEX` users per `lex-roles`.

#### Scenario: Confirmation shows the relationship target

- **GIVEN** a beneficiary card whose target Cliente name is `Juan Perez`
- **WHEN** the user clicks Quitar
- **THEN** the dialog body contains `Juan Perez` and the action label is `Quitar`

#### Scenario: Confirmed removal succeeds

- **GIVEN** the dialog is open and the user clicks Quitar
- **WHEN** `DELETE /client/:parentId/relationships/:relationshipId` returns 204
- **THEN** the dialog closes, the relationship card disappears, the parent Cliente query refetches, and a toast `Relación eliminada` is shown

#### Scenario: Quitar is hidden for VIEWER_LEX

- **GIVEN** a VIEWER_LEX user opens the Relaciones section
- **WHEN** each relationship card renders
- **THEN** none of them expose the `Quitar` affordance
