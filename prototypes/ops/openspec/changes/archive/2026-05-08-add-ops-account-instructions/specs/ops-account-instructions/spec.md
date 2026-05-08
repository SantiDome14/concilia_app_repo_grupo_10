## ADDED Requirements

### Requirement: The Create Account Instruction wizard MUST be reachable from the `/clients/:id` detail page header with the client pre-populated

The CTA `Crear instrucción de cuenta` SHALL appear in the page header of `/clients/:id` (alongside the existing `Habilitar cuenta` and `Generar Statement` CTAs). Clicking the CTA opens the `<CreateAccountInstructionModal>` Dialog with the URL-bound client pre-populated for the entire flow (the operator never selects a client — the client is fixed by the URL context). The legacy URL `/clients/:id/instructions/create` SHALL redirect to `/clients/:id?createInstruction=1`. The detail page reads the `createInstruction` query param on mount; when set to `1`, the modal auto-opens. Closing the modal (submit, cancel, or backdrop click) SHALL strip the query param via `router.replace` so the URL goes back to bare `/clients/:id`.

#### Scenario: Detail page CTA opens the modal with the URL-bound client

- **GIVEN** an authenticated `OPS_ADMIN` user is on `/clients/abc-123` with the client `ACME` loaded
- **WHEN** the user clicks the header CTA `Crear instrucción de cuenta`
- **THEN** the modal mounts at step 1, the client `ACME` is the contextual client throughout the flow (no client picker is ever shown), and the URL gains `?createInstruction=1`

#### Scenario: Legacy URL absorbs into the new modal surface

- **GIVEN** an authenticated user navigates to the legacy path `/clients/abc-123/instructions/create`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/clients/abc-123?createInstruction=1` with the detail page rendered and the modal mounted on top, opened at step 1

#### Scenario: Closing the modal strips the query param

- **GIVEN** the modal is open with `?createInstruction=1` in the URL
- **WHEN** the user clicks `Cancelar` (or presses Escape)
- **THEN** the modal closes, the URL becomes bare `/clients/abc-123` (no `createInstruction` param), and the next navigation back to `/clients/abc-123` does NOT auto-open the modal

### Requirement: The wizard MUST guide the user through 3 steps inside one Dialog using the `core-multi-step-form` Wizard primitive

The modal SHALL render the canonical `<Wizard>` from `core-multi-step-form` with three `<WizardStep>` children: step 1 (`Cuenta y Template`), step 2 (`Datos`), step 3 (`Rails`). The active step indicator + completed-checkmark chrome comes from the primitive (no hand-rolled chrome). Step gating SHALL prevent advancing until the current step's selections are valid: step 1 requires both an account AND a template selected; step 2 requires every `templateAttribute` to have a non-empty value; step 3 requires at least one rail selected. The submit button on the final step is `Crear`; the back button on every step except the first is `Atrás`. The modal width SHALL be `sm:max-w-4xl` (~960 px) per design.md Decision 4.

#### Scenario: Step indicator renders the three contracted steps

- **GIVEN** the modal mounts
- **WHEN** the page renders
- **THEN** the step indicator shows three steps in order: `1. Cuenta y Template`, `2. Datos`, `3. Rails`; step 1 has the active style, the others have the pending style

#### Scenario: Step gating prevents advancing past step 1 without both selections

- **GIVEN** the modal at step 1 with an account selected but no template selected
- **WHEN** the user inspects the `Continuar` button
- **THEN** the button is disabled; the user MUST also select a template before it enables

#### Scenario: Step 2's submit-equivalent stays disabled while any required field is empty

- **GIVEN** the modal at step 2 with the template hydrated and 5 attribute fields, 4 filled and 1 empty
- **WHEN** the user inspects the `Continuar` button
- **THEN** the button is disabled; an inline hint `Complete: <field-name>` appears in the footer; once the empty field gets a non-empty value, the button enables

### Requirement: The Account selector MUST exclude ARS-currency accounts and offer a smart single-account default

The account selector at step 1 SHALL list the client's accounts EXCEPT those with `currency.code === 'ARS'` or `currency.name === 'ARS'` (case-insensitive); account_instructions are for foreign-currency wires only per the legacy semantic. Each rendered account shows `currency · account_number · balance`. Per Decision 7a, when the filtered list contains exactly ONE account, that account SHALL be auto-selected on step 1 mount; the operator can override by clicking `Cambiar` on the selected-account chip.

#### Scenario: ARS accounts are filtered out of the selector

- **GIVEN** a client with 4 accounts: 2 ARS, 1 USD, 1 USDT
- **WHEN** the modal opens at step 1
- **THEN** the account selector renders only USD + USDT (2 options); the 2 ARS accounts are NOT shown

#### Scenario: Single non-ARS account auto-selects on mount (Decision 7a)

- **GIVEN** a client with 3 accounts: 2 ARS + 1 USD (the only non-ARS)
- **WHEN** the modal opens at step 1
- **THEN** the USD account is auto-selected and rendered as a chip with a `Cambiar` link; the operator can immediately move to template selection

#### Scenario: Empty filtered list shows an empty state and disables advancement

- **GIVEN** a client with 2 accounts both ARS
- **WHEN** the modal opens at step 1
- **THEN** the account selector renders an `EmptyState` titled `Sin cuentas elegibles` with description `Este cliente no tiene cuentas en moneda extranjera`; step 1 cannot be completed; the modal still allows backward navigation (close)

### Requirement: The Template selector MUST be searchable by name and rail with 300 ms debounce

The template selector at step 1 SHALL list templates from `GET /instruction` (cached via vue-query, shared with `ops-instructions` if that page is also mounted). A search input above the list filters by substring match on `template.name` OR `template.rail_name` / `template.rail_id` (case-insensitive). The filter is debounced 300 ms — keystrokes that arrive within the debounce window do NOT trigger re-renders of the filtered list. Each rendered template shows `name · rail_name`.

#### Scenario: Search filters by template name substring

- **GIVEN** the template selector with 8 templates loaded
- **WHEN** the user types `swift` into the search
- **THEN** after 300 ms the list re-filters to show only templates whose name or rail contains `swift` (case-insensitive)

#### Scenario: Search filters by rail name as well as template name

- **GIVEN** a template named `Wire Latam` whose `rail_name = 'FEDWIRE'`
- **WHEN** the user types `fedwire` into the search
- **THEN** the `Wire Latam` template appears in the filtered list (matched via rail, not name)

#### Scenario: Empty search returns the full list

- **GIVEN** the template selector with a previous search applied
- **WHEN** the user clears the search input
- **THEN** after 300 ms the list re-renders showing all loaded templates in the original order

### Requirement: The Field Values step MUST hydrate the template's attribute schema, prepopulate client variables, and apply the SWIFT-rail reference rule

When the operator advances to step 2, the wizard SHALL fetch `GET /instruction-attribute/instruction/:templateId` to source the `templateAttributes[]`. Each attribute renders as a labelled input (text by default; `<Select>` when the attribute key is `currency` or `bank_country`). On hydration, the wizard prepopulates each attribute's value from `attribute.default_value`, applying two transformations via the pure helpers from `src/ops/account-instructions/interpolation.ts`:

1. `interpolateClientVariables` — replaces `{docket}`, `{name}`, and `{tax_number}` substrings with the client's corresponding fields. If a placeholder is missing in the client (e.g. client has no `docket`), the placeholder is replaced with an empty string (NOT left literal).
2. `applySwiftReferenceRule` — when the template's rail name (uppercased) matches one of `['SWIFT', 'ACH', 'FEDWIRE', 'SEPA', 'ACH & FEDWIRE']`, the attribute whose `key` substring-matches `'reference'` (case-insensitive, first match wins) gets its value replaced with `${interpolated_default}${client.docket}${client.name}`.

#### Scenario: Variables in the default_value get interpolated from the client on hydration

- **GIVEN** a client with `docket = 'D42'` and `name = 'ACME'`, and a template attribute with `default_value = 'For account {docket} of {name}'`
- **WHEN** the wizard advances to step 2
- **THEN** the attribute's input is pre-filled with `For account D42 of ACME`; the operator can edit it freely

#### Scenario: Missing client variable becomes empty string, not literal placeholder

- **GIVEN** a client with `docket = null` and a template attribute with `default_value = 'Code-{docket}'`
- **WHEN** the wizard advances to step 2
- **THEN** the attribute's input is pre-filled with `Code-` (the placeholder is removed); the input is NOT left as `Code-{docket}`

#### Scenario: SWIFT rail rule rewrites the reference field

- **GIVEN** a SWIFT-rail template with attributes `[{key: 'beneficiary_bank', default_value: 'BBVA'}, {key: 'reference_code', default_value: 'REF-'}]` and a client with `docket = 'D42'` and `name = 'ACME'`
- **WHEN** the wizard advances to step 2
- **THEN** the `reference_code` input is pre-filled with `REF-D42ACME` (the rule concatenated `${default}${docket}${name}`); the `beneficiary_bank` input is pre-filled with `BBVA` unchanged (no reference logic applies)

### Requirement: The Field Values step MUST render a live letter preview side-by-side with the inputs

Step 2 renders a 2-column layout (collapses to vertical stack below `lg` breakpoint per Decision 4): left column is the inputs grid; right column is `<LetterPreview>` rendering an A4-aspect mock of the confirmation letter the operator will later download from the detail page (Letter action, `ops-clients` Requirement 9). The preview reads `client + template + values + selectedAccount` from props and re-renders on every keystroke. The preview SHALL be presentational only (no fetches, no side effects, no toggles).

#### Scenario: Preview renders the canonical letter copy

- **GIVEN** the modal at step 2 with client `ACME` (docket `D42`), template `SWIFT - BBVA`, and an account `acc-001 USD`
- **WHEN** the page renders
- **THEN** the preview right column shows the letter mock with `Dear ACME,`, `Client number: D42`, `For SWIFT transfers please use the following information:`, and a list of the template's attribute key/value pairs

#### Scenario: Preview updates live as the operator edits an input

- **GIVEN** the preview shows `Beneficiary Bank: BBVA` for the corresponding attribute
- **WHEN** the operator changes that attribute's input to `BBVA Argentina`
- **THEN** the preview re-renders showing `Beneficiary Bank: BBVA Argentina`; no fetch fires; the change is local-only until step 2 is advanced

#### Scenario: Preview falls back to em-dash for empty fields

- **GIVEN** the preview at step 2 with one attribute `correspondent_bank` left empty
- **WHEN** the page renders
- **THEN** the preview shows `Correspondent Bank: —` for the empty attribute; advancing past step 2 is still blocked by the validation hint

### Requirement: The Rails step MUST allow multi-select from the canonical rails catalog with at least one selection required to enable submit

Step 3 SHALL render the rails catalog (sourced from `GET /rails`, cached via vue-query) as a multi-select grid. Each rail tile SHALL be clickable to toggle its selection state; selected rails MUST receive a brand-coloured border + check icon. The submit button (`Crear`) on step 3 SHALL be enabled only when `selectedRailIds.length >= 1`.

#### Scenario: Multi-select toggles individual rails on click

- **GIVEN** step 3 with 4 rails rendered (SWIFT, ACH, FEDWIRE, SEPA), none selected
- **WHEN** the user clicks SWIFT, then FEDWIRE, then clicks SWIFT again
- **THEN** the selection ends as `[FEDWIRE]` only — SWIFT was toggled off by the second click; the submit button is enabled (1 selection > 0)

#### Scenario: No rails selected disables the submit button

- **GIVEN** step 3 mounted with no rails selected
- **WHEN** the page renders
- **THEN** the submit button `Crear` is disabled; an inline hint `Seleccioná al menos un rail` appears in the footer

#### Scenario: 5xx on rails fetch shows a retry banner without blocking the wizard from going back

- **GIVEN** step 3 mounts and `GET /rails` fails with 503
- **WHEN** the page renders
- **THEN** the rails area shows an alert banner `No se pudieron cargar los rails` with a `Reintentar` button; the back button (returning to step 2) remains functional

### Requirement: Submit MUST POST `/account-instruction` with the canonical payload, support cancel via `AbortController`, map field-level validation errors inline, and invalidate the client cache

Clicking `Crear` on step 3 SHALL call `apiClient.post('/account-instruction', payload, { signal })` where `payload = { instruction_id, account_id, metadata, rail_ids }` and `metadata` is the `formValues` object from step 2. The signal comes from an `AbortController` instantiated at click time. On 200/201 success, the modal closes, a success toast `Instrucción de cuenta creada` appears, the localStorage draft is cleared, and the `['ops', 'clients', clientId]` query is invalidated so the new binding renders in the detail page accounts section. On 409 with body `{ error: 'cvu_already_exists' }`, a destructive toast `CVU ya existe` appears and the modal stays open with selections preserved. On any response with body `{ error: 'validation_error', errors: [{field, message}] }` (per Decision 7b), the modal navigates back to step 2 and renders each error message inline below its corresponding `<Input>` (matched by `attribute.key === error.field`); the toast surfaces the count `<n> campo/s con errores de validación`. On any other 4xx/5xx, a destructive toast surfaces the backend message (or `Error al crear la instrucción de cuenta` as fallback). Per Decision 7d, while the request is in flight the `Crear` button transforms into `Cancelar` bound to `controller.abort()`; clicking it aborts the request, the modal stays open, selections preserved, button reverts to `Crear`, and an inline notice `Creación cancelada` appears for ~3 s.

#### Scenario: Successful creation closes the modal, clears the draft, and invalidates the client cache

- **GIVEN** the modal at step 3 with all selections set
- **WHEN** the user clicks `Crear` and the API returns 201
- **THEN** the modal closes, the success toast `Instrucción de cuenta creada` appears, the `localStorage` key `ops:account-instructions:draft:<clientId>` is removed, and the `vue-query` cache for `['ops', 'clients', <clientId>]` is invalidated so the detail page re-fetches and shows the new binding inside the matching account card

#### Scenario: 409 with `cvu_already_exists` surfaces a localised toast and keeps the modal open

- **GIVEN** the modal at step 3
- **WHEN** the user clicks `Crear` and the API returns `409 { error: 'cvu_already_exists' }`
- **THEN** a destructive toast `CVU ya existe — el CVU ingresado ya está registrado en el sistema` appears, the modal stays open at step 3 with selections preserved, the localStorage draft is NOT cleared, and the submit button re-enables for retry after the operator edits

#### Scenario: validation_error maps backend errors to inline messages on step 2 (Decision 7b)

- **GIVEN** the modal at step 3 with `metadata = { beneficiary_bank: 'BBVA', reference_code: '' }`
- **WHEN** the user clicks `Crear` and the API returns `{ error: 'validation_error', errors: [{ field: 'reference_code', message: 'Reference is required' }, { field: 'iban', message: 'Invalid IBAN format' }] }`
- **THEN** the wizard navigates back to step 2; the input for `reference_code` shows the inline message `Reference is required` in `text-danger` below it; the input for `iban` shows `Invalid IBAN format`; a toast `2 campos con errores de validación` appears; the submit button on step 2 (`Continuar`) is enabled when the operator addresses ALL flagged fields

#### Scenario: Cancel during submit aborts the request and preserves selections (Decision 7d)

- **GIVEN** the modal at step 3 with all selections set, and the user clicked `Crear`
- **WHEN** the request is in flight and the user clicks the `Cancelar` button (which replaced the `Crear` button)
- **THEN** `AbortController.abort()` fires on the request signal, no toast appears, the modal stays open with selections preserved, the button returns to `Crear` re-enabled, and a non-destructive notice `Creación cancelada` appears below the button for ~3 s

### Requirement: The wizard MUST persist its draft to `localStorage` per client and restore it on next opening

On every step transition AND on every keystroke (debounced 500 ms), the wizard SHALL persist its current state to `localStorage` under the key `ops:account-instructions:draft:<clientId>`. The persisted shape contains `{ step, accountId, templateId, formValues, railIds }`. When the modal opens for the same client and a draft exists, the wizard SHALL restore at the saved step with the saved selections + form values; it does NOT prompt the operator (silent restore). On successful submit (Requirement 8), the draft is cleared. On modal cancel (close without submit), the draft is RETAINED — closing the modal is not a deliberate "discard"; the operator may re-open later and continue.

#### Scenario: Mid-flow keystrokes persist within 500 ms

- **GIVEN** the modal at step 2 of a fresh wizard with no prior draft
- **WHEN** the operator types `BBVA Argentina` into the `beneficiary_bank` input and stops typing
- **THEN** within 500 ms after the last keystroke, `localStorage.getItem('ops:account-instructions:draft:abc-123')` returns a JSON record with `step: 2`, `formValues.beneficiary_bank === 'BBVA Argentina'`, plus the previously-selected accountId and templateId

#### Scenario: Re-opening the modal for the same client restores the draft silently

- **GIVEN** a saved draft for `abc-123` with `step: 3, accountId: 'acc-1', templateId: 'tpl-7', formValues: {...}, railIds: ['SWIFT', 'FEDWIRE']`
- **WHEN** the operator opens the modal for `abc-123` (via the CTA or the `?createInstruction=1` query param)
- **THEN** the modal mounts at step 3 with the same selections rendered; no "Restaurar borrador" prompt is shown — the restore is silent; the operator can immediately submit OR backtrack to edit

#### Scenario: Successful submit clears the draft

- **GIVEN** a draft for `abc-123` exists and the operator submits successfully
- **WHEN** the API returns 201 and the modal closes
- **THEN** `localStorage.getItem('ops:account-instructions:draft:abc-123')` returns `null`; the next opening of the modal for the same client starts fresh

### Requirement: Loading, validation, and error surfaces MUST follow the canonical `core-error-handling` patterns

The wizard SHALL render: a `Skeleton` for the templates list while the initial fetch is in flight; an `EmptyState` titled `Sin cuentas elegibles` for clients with no non-ARS accounts (per Requirement 3); a `Skeleton` for the rails grid while `GET /rails` is in flight; an alert banner for 5xx during template-attribute hydration with a `Reintentar` button; a destructive toast for any 5xx during submit (per Requirement 8). All transient errors SHALL surface via toast at the bottom-right per `core-error-handling`.

#### Scenario: Initial mount shows skeletons in the relevant slots

- **GIVEN** a fresh modal mount, accounts hydrated from the detail page cache, but templates fetch in flight
- **WHEN** the page renders
- **THEN** the account selector is interactive; the template selector renders a Skeleton list; the operator can pick an account but the `Continuar` button stays disabled until the template loads + is selected

#### Scenario: 5xx during template-attribute hydration surfaces a retry banner

- **GIVEN** the operator advanced to step 2 and `GET /instruction-attribute/instruction/:templateId` returned 503
- **WHEN** the page renders
- **THEN** step 2's body shows an alert banner `No se pudo cargar el esquema del template` with a `Reintentar` button; the inputs area is NOT mounted (since there's no schema); the back button returns to step 1 to pick a different template

#### Scenario: Network failure mid-submit surfaces a generic toast

- **GIVEN** the modal at step 3 mid-submit
- **WHEN** the network drops and `apiClient.post` rejects with a non-`ApiError`
- **THEN** the toast shows `Error al crear la instrucción de cuenta`, the modal stays open with all selections preserved, the submit button re-enables, and the localStorage draft is NOT cleared

### Requirement: The `Crear instrucción de cuenta` CTA MUST be visible only to users with `clients:create-account-instruction` capability or `OPS_ADMIN` role

The CTA in `/clients/:id` page header SHALL be rendered only when `useCapabilities().can('clients:create-account-instruction') || useCapabilities().can('OPS_ADMIN')`. Hidden — not disabled — for users without the capability. Per Decision 7a's failure mode, the CTA is also hidden when the client has zero non-ARS accounts (no point opening the wizard for a client without eligible accounts). The capability is declared inline in v1; once `ops-roles` lands, it is replaced with the canonical capability string.

#### Scenario: ADMIN role with eligible accounts sees the CTA

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`, navigating to `/clients/abc-123` where the client has 1 USD account
- **WHEN** the page renders
- **THEN** the page header shows the `Crear instrucción de cuenta` CTA (alongside any other CTAs)

#### Scenario: VIEWER role does NOT see the CTA

- **GIVEN** an authenticated user whose roles include `OPS_VIEWER` only
- **WHEN** the page renders
- **THEN** the page header does NOT render the `Crear instrucción de cuenta` CTA; no `disabled` button is shown

#### Scenario: ADMIN with no eligible accounts does NOT see the CTA

- **GIVEN** an `OPS_ADMIN` user navigating to a client that has only ARS accounts
- **WHEN** the page renders
- **THEN** the CTA is hidden (the wizard would have nothing actionable on step 1); the operator's only affordances on the section are the existing Whitelistar Cuenta CTA + the read-only accounts list

### Requirement: The modal MUST render a pre-submit preview card consolidating account + template + values + rails before enabling `Crear`

When the operator reaches step 3 with at least one rail selected, a preview card SHALL render between the rails grid and the action buttons (per Decision 7c). The card consolidates the about-to-be-fired binding in human-readable form, with this exact structure:

- A heading `Resumen` in the canonical small-caps style.
- One section per concept: `Cuenta: <currency> · <account_number>`; `Template: <template.name> · <rail_name>`; `Valores`: a table with one row per attribute showing `<key>: <value>`; `Rails: <selected_rails.join(', ')>`.
- A subtle border + background consistent with `core-theming`.

The card is informational only — no inputs inside it. Editing any selection above the card causes it to re-render with the new values. The `Crear` button below the card SHALL enable iff all step gates have been passed (rails ≥ 1, fields all non-empty).

#### Scenario: Preview card renders only when at least one rail is picked

- **GIVEN** the modal at step 3 with the rails grid rendered but no rail selected
- **WHEN** the page renders
- **THEN** the preview card is NOT rendered; the `Crear` button is disabled

#### Scenario: Preview card consolidates the four selections in canonical format

- **GIVEN** the operator has picked account `acc-001 USD`, template `SWIFT - BBVA`, values `{beneficiary_bank: 'BBVA', reference_code: 'REF-D42ACME'}`, and rails `['SWIFT', 'FEDWIRE']`
- **WHEN** the preview card renders
- **THEN** the card shows the heading `RESUMEN`, sections `Cuenta: USD · acc-001`, `Template: SWIFT - BBVA · SWIFT`, a values table with two rows, and `Rails: SWIFT, FEDWIRE`; the `Crear` button below it is enabled

#### Scenario: Editing a value in step 2 re-renders the preview card on step 3

- **GIVEN** the preview card showing `Reference Code: REF-D42ACME`
- **WHEN** the operator clicks `Atrás` (returns to step 2), edits the `reference_code` input to `REF-NEW`, and clicks `Continuar` to return to step 3
- **THEN** the preview card re-renders with `Reference Code: REF-NEW`; the other rows stay the same; the `Crear` button stays enabled
