## ADDED Requirements

### Requirement: Forms MUST use vee-validate + zod for validation

Form state and validation SHALL be managed by `vee-validate` with `zod` schemas. Hand-rolled validation logic inside components is forbidden.

#### Scenario: Form composes a zod schema

- **GIVEN** a form is being authored
- **WHEN** the developer defines validation rules
- **THEN** the rules are expressed as a `z.object({...})` schema referenced by the `useForm` composable

#### Scenario: Validation runs on blur and on submit

- **GIVEN** a form with fields and a submit button
- **WHEN** the user interacts with a field or submits the form
- **THEN** field validation runs on blur and full-form validation runs on submit

### Requirement: Form labels MUST use the uppercase label token

Every field label SHALL use the standard uppercase, bold, letter-spaced label token defined by the design system. Mixed-case or bolded inline labels are forbidden.

#### Scenario: Label applies canonical token

- **GIVEN** a form field with a label
- **WHEN** the field renders
- **THEN** the label applies `text-[10px] font-bold uppercase tracking-wider text-t-3` and sits on the line above the input with a consistent small margin

### Requirement: Required fields MUST be marked with a trailing asterisk

Fields whose zod schema makes them required SHALL render a trailing `*` after the label text. Optional fields SHALL NOT render the asterisk.

#### Scenario: Required field is marked

- **GIVEN** a zod schema marks a field as required (non-optional, non-nullable)
- **WHEN** the field's label renders
- **THEN** the label shows a trailing `*`

### Requirement: Submit buttons MUST be disabled while the form is invalid or submitting

The primary submit button SHALL be disabled while the form is invalid, while a submit is in flight, or while a dependent async operation is pending.

#### Scenario: Invalid form disables submit

- **GIVEN** a form with at least one validation error
- **WHEN** the submit button renders
- **THEN** its `disabled` attribute is `true`

#### Scenario: In-flight submit disables the form

- **GIVEN** a form where the submit handler is awaiting a network response
- **WHEN** the submit button renders
- **THEN** the submit button is disabled and its label MAY be swapped for a loading indicator

### Requirement: Form field errors MUST render directly below the input

When a field has a validation error, the error message SHALL render directly below the input in the danger token color. Error text SHALL be concise and actionable.

#### Scenario: Error message surfaces below the field

- **GIVEN** a field fails validation
- **WHEN** the field renders
- **THEN** a small-sized error message appears below the input with `text-danger`

#### Scenario: Error clears on successful revalidation

- **GIVEN** a field previously showing an error
- **WHEN** the user corrects the value and it passes validation
- **THEN** the error message is removed
