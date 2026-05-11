## ADDED Requirements

### Requirement: OtpInput component MUST render N independent slots with autofocus advance and paste support

The `<OtpInput>` component SHALL be the single canonical multi-digit code primitive in the financial-core. It SHALL accept props `length: number` (default `6`), `mode: 'numeric' | 'alphanumeric'` (default `'numeric'`), `mask: boolean` (default `false`, when `true` displays each entered digit as a dot for shoulder-surfing protection), and SHALL render `length` independent input slots arranged horizontally. Typing a character into a slot SHALL advance focus to the next slot automatically; pressing Backspace on an empty slot SHALL retreat focus to the previous slot; pasting a string SHALL distribute its characters across slots starting at the currently-focused slot (truncated to `length`, characters not matching the mode silently dropped). The component SHALL emit the assembled value via `v-model` as a single string of length equal to `length` (or shorter when partial). It SHALL integrate with vee-validate via `<FormControl>` so blur and submit validation timing matches `<Input>`. Each slot SHALL declare `inputmode="numeric"` for numeric mode (or `"text"` with `autocapitalize="characters"` for alphanumeric), and SHALL expose `aria-label` referencing its position (e.g., `"Dígito 3 de 6"`). Hardcoded colors / paddings / fonts are forbidden — every visual resolves through `core-theming` tokens.

#### Scenario: Typing advances focus across slots

- **GIVEN** a `<OtpInput :length="6">` with all slots empty and focus on slot 1
- **WHEN** the user types `1`, `2`, `3`
- **THEN** slot 1 contains `1`, slot 2 contains `2`, slot 3 contains `3`; focus advances after each keystroke; the `v-model` binding is `"123"`

#### Scenario: Backspace on empty slot retreats focus

- **GIVEN** the user has filled slots 1 through 5 and focus is on slot 5 with character `5`
- **WHEN** the user presses Backspace twice
- **THEN** the first Backspace clears slot 5 (focus stays on slot 5); the second Backspace retreats focus to slot 4 and clears its character; the `v-model` binding is `"123"`

#### Scenario: Paste distributes characters across slots

- **GIVEN** an empty `<OtpInput :length="6">` with focus on slot 1
- **WHEN** the user pastes `123456`
- **THEN** the six slots fill sequentially with `1, 2, 3, 4, 5, 6`; the `v-model` binding is `"123456"`; focus lands on slot 6 (or stays at the end)

#### Scenario: Numeric mode rejects non-digit input

- **GIVEN** a `<OtpInput :mode="'numeric'">` with slot 1 focused
- **WHEN** the user types `a` or pastes `12a45`
- **THEN** non-digit characters are dropped silently; pasting `12a45` results in slots filled with `1, 2, 4, 5` — the `a` is skipped without error

#### Scenario: Mask hides entered characters as dots

- **GIVEN** a `<OtpInput :length="6" :mask="true">` and the user types `123456`
- **WHEN** the input renders
- **THEN** each slot shows a single dot (●) instead of the digit; the `v-model` binding is still `"123456"`; the underlying value is preserved for submit but visually obscured

#### Scenario: Alphanumeric mode normalizes to uppercase

- **GIVEN** a `<OtpInput :mode="'alphanumeric'">` and the user types `aB3`
- **WHEN** the input processes the input
- **THEN** the slots fill with `A, B, 3` (lowercase normalized to uppercase); the `v-model` binding is `"AB3"`

### Requirement: Manifest dialog `otp` field type MUST render as OtpInput with the declared length

The action manifest engine SHALL accept `'otp'` as a valid field type. A field declared `{ type: 'otp', length: number, mode?: 'numeric' | 'alphanumeric', label, ... }` SHALL render as `<OtpInput :length="length" :mode="mode">`. The zod schema for `otp` SHALL be `z.string().length(length).regex(/^\d+$/)` for numeric mode, and `z.string().length(length).regex(/^[A-Z0-9]+$/)` for alphanumeric mode. The manifest validator SHALL reject any `otp` field declaration without `length` or with `length < 1` or `length > 16` — outside this range OTP codes are not the right field type.

#### Scenario: `otp` field renders with the declared length

- **GIVEN** a manifest field `{ type: 'otp', length: 6, label: 'Código de verificación', required: true }`
- **WHEN** the dialog renders the field
- **THEN** the field is `<OtpInput :length="6">`, the zod schema is `z.string().length(6).regex(/^\d+$/)`, and submitting fewer than 6 digits produces a validation error

#### Scenario: Manifest validator rejects out-of-range length

- **GIVEN** a manifest field `{ type: 'otp', length: 32 }` (or `length: 0`)
- **WHEN** the manifest validator runs (dev mode)
- **THEN** the validator rejects the manifest with a clear message — `length` SHALL be between 1 and 16 inclusive
