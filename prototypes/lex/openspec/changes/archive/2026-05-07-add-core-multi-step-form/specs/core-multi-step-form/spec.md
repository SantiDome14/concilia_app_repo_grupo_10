## ADDED Requirements

### Requirement: Multi-step forms MUST be declared via a typed step registry

A multi-step form SHALL be declared as an array of `WizardStep` entries passed to the `useWizard(steps, options)` composable. Each step entry SHALL include `id` (string, unique within the wizard), `title` (string, label shown in the progress indicator), optional `description` (string, sub-label), optional `enabledWhen(formState)` predicate (function returning boolean; default `() => true`), `component` (Vue component reference rendering the step's body), and optional `revisitable` (boolean, default `true`; when `false`, the user cannot navigate back to this step once it has been advanced past). The `validate` for each step is implicit via the step component's own `vee-validate` `<Form>` `validationSchema`. Apps SHALL NOT declare steps inline as JSX or anonymous components — the registry pattern keeps the wizard structure inspectable, testable, and persistable.

#### Scenario: Wizard receives a typed step registry

- **GIVEN** an app authoring TRD's `QuoteWizard` with steps `client` → `pair` → `amount` → `preview` → `confirm`
- **WHEN** the wizard is wired
- **THEN** the steps are declared as `const steps: WizardStep[] = [{ id: 'client', title: 'Cliente', component: ClientStep }, { id: 'pair', title: 'Par', component: PairStep }, ...]` and passed to `useWizard(steps, options)`

#### Scenario: Inline anonymous components are forbidden

- **GIVEN** a developer authors `useWizard([{ id: 's1', title: 'Step', component: () => h('div', 'inline') }, ...])`
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — every step's `component` SHALL be a top-level named Vue component imported at the top of the wizard file

#### Scenario: Step revisitable defaults to true unless explicitly disabled

- **GIVEN** a step `{ id: 'amount', title: 'Monto', component: AmountStep }` with no `revisitable` declared
- **WHEN** the wizard advances past this step and the user clicks Back
- **THEN** the wizard returns to the `amount` step with all previously-entered data preserved — `revisitable` defaulted to `true` and the back-navigation succeeded

### Requirement: Progress indicator MUST render canonical visual states for every step

The `<Wizard>` component SHALL render a progress indicator above the step body listing every visible step (steps where `enabledWhen(formState)` returned `true`). Each step in the indicator SHALL render with one of five canonical visual states: `completed` (steps the user has advanced past), `current` (the step currently active), `upcoming` (steps after current that have not been visited), `disabled` (steps whose `enabledWhen` currently returns `false` — they appear in the indicator with a muted style and are non-clickable; `error` (the step's last validation attempt failed). The indicator SHALL be semantically meaningful — apps MAY style it as numbered dots, segmented control, or breadcrumb, but the five states SHALL be visually distinguishable. Hardcoded colors are forbidden — every state resolves through `core-theming` tokens.

#### Scenario: Indicator distinguishes completed, current, and upcoming

- **GIVEN** a 5-step wizard where the user is on step 3
- **WHEN** the indicator renders
- **THEN** steps 1 and 2 render with the `completed` visual (filled with success token), step 3 renders with the `current` visual (highlighted with primary/ring token), and steps 4 and 5 render with the `upcoming` visual (muted)

#### Scenario: Disabled step appears with muted style

- **GIVEN** a 5-step wizard where step 4 declares `enabledWhen: (formState) => formState.operation === 'CCC'` and the current state has `operation: 'STANDARD'`
- **WHEN** the indicator renders
- **THEN** step 4 is hidden from the indicator (visible step list excludes it); if the rule changes to `formState.operation === 'STANDARD'` instead, step 4 appears in the indicator with the `disabled` visual until the formState makes it eligible

#### Scenario: Error state surfaces when a step's last submit failed

- **GIVEN** the user submitted step 2 and its `validationSchema` rejected the data
- **WHEN** the indicator re-renders after the failed validation
- **THEN** step 2 renders with the `error` visual (border / fill in the danger token) until the user corrects the data and re-validates successfully

### Requirement: Conditional step visibility MUST evaluate `enabledWhen` reactively

When a step declares `enabledWhen(formState)`, the wizard SHALL evaluate the predicate reactively against the accumulated form state. Visibility changes SHALL propagate immediately: if a step that was visible becomes hidden, it is removed from the indicator AND the wizard's effective step sequence; if a step that was hidden becomes visible, it is inserted at its declared position. The wizard SHALL handle the case where the **current** step becomes hidden by an upstream state change: it SHALL advance to the next visible step (or, if none remain, to the previous visible step), preserving the user's data for any step that becomes hidden.

#### Scenario: Visibility appears/disappears reactively

- **GIVEN** a TRD wizard with `client → pair → amount → ccc-leg → preview → confirm`, where `ccc-leg` declares `enabledWhen: (s) => s.operation === 'CCC'`
- **WHEN** the user is on step `pair` and changes `operation` from `STANDARD` to `CCC`
- **THEN** the indicator re-renders to include `ccc-leg` between `amount` and `preview`; the user's progression remains on `pair` (no automatic advance) and the wizard's logical sequence updated

#### Scenario: Hiding the current step advances to the next visible step

- **GIVEN** a wizard where the user is currently on step `ccc-leg` and the upstream `operation` changes from `CCC` to `STANDARD`, hiding `ccc-leg`
- **WHEN** the wizard re-evaluates visibility
- **THEN** the wizard advances the current step to `preview` (the next visible step), preserves the data captured in `ccc-leg` (in case the user re-enables CCC later), and the indicator updates to omit `ccc-leg`

#### Scenario: Hidden step's data is preserved across visibility cycles

- **GIVEN** the user filled in `ccc-leg` with data, then set `operation = 'STANDARD'` (hiding the step), then set `operation = 'CCC'` again (re-showing the step)
- **WHEN** the wizard re-shows `ccc-leg`
- **THEN** the previously-entered data appears intact in the step's fields — visibility does not destroy data

### Requirement: Per-step validation MUST gate forward navigation

The wizard's "Siguiente" / "Next" button SHALL be disabled until the current step's `<Form>` `validationSchema` reports valid. Forward navigation triggered before the step is valid SHALL run the validation, surface field-level errors below each invalid input, and remain on the current step. The submit button on the final step SHALL run the same validation and additionally invoke the `onSubmit(formState)` handler the wizard was configured with. Submitting an invalid final step SHALL surface field errors and SHALL NOT invoke `onSubmit`.

#### Scenario: Next is disabled while step is invalid

- **GIVEN** a step with two required fields, one of them empty
- **WHEN** the wizard renders
- **THEN** the Next button's `disabled` attribute is `true` and clicking it has no effect

#### Scenario: Submit on final step runs validation then onSubmit

- **GIVEN** a wizard configured with `useWizard(steps, { onSubmit: handleSubmit })` and the user is on the last step
- **WHEN** the user clicks the Submit button after filling all fields validly
- **THEN** the wizard runs the step's validation, all fields pass, and the wizard invokes `handleSubmit(formState)` with the accumulated state from every step

#### Scenario: Invalid step blocks both Next and Submit

- **GIVEN** any step where validation fails on submit
- **WHEN** the user clicks Next or Submit
- **THEN** field-level errors render below each invalid input in the danger token, the wizard remains on the current step, and `onSubmit` is NOT invoked

### Requirement: Backward navigation MUST preserve data and respect `revisitable`

The wizard SHALL expose a "Volver" / "Back" button on every step except the first. Clicking Back SHALL transition the wizard to the previous **visible** step (skipping any steps where `enabledWhen` currently returns `false`) and preserve the data of the step the user is leaving (so re-advancing forward shows the data intact). Steps declaring `revisitable: false` SHALL block the back-navigation INTO them once the wizard has advanced past — clicking Back from the step **after** them SHALL skip them and land on the closest revisitable step before. Clicking on a previously-completed step in the progress indicator SHALL navigate to it ONLY if every step between current and target is revisitable; otherwise the click is a no-op.

#### Scenario: Back returns to the previous visible step

- **GIVEN** the user is on step 3 of a 5-step wizard with all steps visible and revisitable
- **WHEN** the user clicks Back
- **THEN** the wizard transitions to step 2; the data the user entered in step 3 is preserved; the indicator updates to mark step 2 as `current`

#### Scenario: Non-revisitable step blocks back-navigation into it

- **GIVEN** a wizard with steps `s1 → s2 (revisitable=false) → s3` and the user is currently on `s3`
- **WHEN** the user clicks Back
- **THEN** the wizard skips `s2` and lands on `s1` — `s2` is treated as a one-way checkpoint

#### Scenario: Indicator click respects revisitable rules

- **GIVEN** a wizard at step `s4` with steps `s1 → s2 → s3 (revisitable=false) → s4`
- **WHEN** the user clicks `s2` in the progress indicator
- **THEN** the click is a no-op because reaching `s2` from `s4` requires crossing the non-revisitable `s3` — the indicator MAY visually mark such steps as un-clickable

### Requirement: Wizard state MUST be persisted to sessionStorage when `wizardId` is configured

When `useWizard(steps, options)` receives `options.wizardId: string`, the wizard SHALL persist its state (current step id + accumulated form data) to `sessionStorage` under the key `wizard:${wizardId}`. The persistence SHALL update on every transition (forward, backward, edit) so a page reload restores the wizard at the most recent valid state. The `Wizard.resume(wizardId)` static helper (or, equivalently, `useWizard(steps, { wizardId })` re-instantiated) SHALL restore from `sessionStorage` if a saved state exists; otherwise it starts fresh. When the user submits successfully or calls `wizard.reset()`, the saved state SHALL be cleared. When `wizardId` is omitted, no persistence happens and the wizard state lives only in memory.

#### Scenario: Persistence updates on every transition

- **GIVEN** a wizard with `wizardId: 'trd-quote-create'` and the user advances from step 2 to step 3 with valid data
- **WHEN** the transition fires
- **THEN** `sessionStorage` updates `wizard:trd-quote-create` with `{ currentStepId: 's3', formState: { ...accumulated } }`

#### Scenario: Reload at mid-wizard restores the last state

- **GIVEN** a user on step 4 of 5 with the wizard auto-persisting under `wizard:trd-quote-create`
- **WHEN** the user reloads the page and re-enters the wizard
- **THEN** the wizard restores `currentStep = 's4'` and re-hydrates the form fields with the persisted state — the user resumes exactly where they left off

#### Scenario: Successful submit clears the saved state

- **GIVEN** a wizard with persistence active and the user has just submitted successfully
- **WHEN** the wizard processes the success
- **THEN** `sessionStorage.removeItem('wizard:trd-quote-create')` runs; a subsequent re-entry to the wizard starts fresh

#### Scenario: Omitting wizardId disables persistence entirely

- **GIVEN** a wizard instantiated with `useWizard(steps)` (no `wizardId`)
- **WHEN** the user reloads the page mid-wizard
- **THEN** the wizard re-mounts at the first step with empty state — no persistence occurred and no state is restored

### Requirement: Composable `useWizard` MUST be the only consumer entry point

Apps SHALL consume the wizard contract exclusively via the `useWizard(steps, options)` composable. Direct mutation of the underlying state, hand-rolled step-tracking refs, or per-app wizard reimplementations are forbidden. The composable SHALL accept `options` for `wizardId` (persistence key, omitted = no persistence), `onSubmit(formState)` (handler invoked on successful final submit), and `initialState` (starting form data, useful for "edit existing record" flows that pre-populate). It SHALL expose reactive state (`currentStep: ComputedRef<WizardStep>`, `currentStepIndex: ComputedRef<number>`, `visibleSteps: ComputedRef<WizardStep[]>`, `formState: Ref<Record<string, unknown>>`, `isFirst`, `isLast`, `canAdvance: ComputedRef<boolean>`) plus actions (`next()`, `back()`, `goTo(stepId)`, `submit()`, `reset()`).

#### Scenario: Module consumes only the composable

- **GIVEN** a developer is wiring TRD's QuoteWizard
- **WHEN** the implementation is authored
- **THEN** it imports `useWizard` from `@/composables/useWizard` and calls `const wizard = useWizard(steps, { wizardId: 'trd-quote-create', onSubmit: handleSubmit })` — direct manipulation of `currentStepIndex` or `formState` outside the composable's actions is forbidden

#### Scenario: `goTo` enforces navigation rules

- **GIVEN** a wizard at step `s2` and the user calls `wizard.goTo('s5')` programmatically
- **WHEN** the composable evaluates the request
- **THEN** the call succeeds only if every step between `s2` and `s5` (inclusive of `s5`) is reachable per the `enabledWhen` and `revisitable` rules; otherwise it throws or returns false (deterministic, app chooses) — silent fail-on-invalid-target is forbidden

#### Scenario: Reset returns to first step and clears data

- **GIVEN** a wizard at step 4 with substantial accumulated data
- **WHEN** the consumer calls `wizard.reset()`
- **THEN** `currentStep` becomes the first step, `formState` resets to `options.initialState ?? {}`, persisted state in sessionStorage is cleared, and any error visuals on the indicator are reset
