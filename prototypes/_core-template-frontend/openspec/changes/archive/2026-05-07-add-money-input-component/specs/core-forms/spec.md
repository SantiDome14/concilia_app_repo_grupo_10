## ADDED Requirements

### Requirement: MoneyInput component MUST format value live with locale-aware separators and emit raw numeric value

The `<MoneyInput>` component SHALL be the single canonical monetary input primitive in the financial-core. It SHALL accept props `currency: string` (ISO code, e.g., `'ARS'`, `'USD'`, `'BTC'`), `decimals: number` (default `2` for fiat; SHALL be set to `8` for crypto), `locale: string` (default `'es-AR'`), `allowNegative: boolean` (default `false`), `min?: number`, `max?: number`. It SHALL format the displayed value live as the user types: thousand separators and decimal separator follow `locale` conventions (for `es-AR`: `1.234.567,89`); the currency symbol is rendered as a prefix or suffix according to the locale (in `es-AR`, ARS prefixes as `$` and USD prefixes as `US$`). The component's `v-model` SHALL emit the **raw numeric value** as a JavaScript `number` — never the formatted string. The component SHALL integrate with vee-validate via `<FormControl>`, validate via the schema declared at the consuming form, and expose `inputmode="decimal"` plus an `aria-describedby` linking to the format hint when present. Hardcoded colors, paddings, and fonts are forbidden — every visual resolves through `core-theming`.

#### Scenario: Live formatting in es-AR shows thousand and decimal separators correctly

- **GIVEN** a `<MoneyInput currency="ARS" :locale="'es-AR'">` and the user types `1234567.89`
- **WHEN** the input renders the formatted value
- **THEN** the visible text is `$ 1.234.567,89` (peso symbol prefix, dot as thousand separator, comma as decimal separator); the `v-model` value is the number `1234567.89`

#### Scenario: Live formatting in en-US uses comma and period

- **GIVEN** a `<MoneyInput currency="USD" :locale="'en-US'">` and the user types `1234567.89`
- **WHEN** the input renders
- **THEN** the visible text is `US$ 1,234,567.89`; the `v-model` value is the number `1234567.89`

#### Scenario: Crypto decimals default to 8

- **GIVEN** a `<MoneyInput currency="BTC" :decimals="8">` and the user types `0.12345678`
- **WHEN** the input renders
- **THEN** the visible text shows `0,12345678` (in `es-AR`); the `v-model` is `0.12345678`; entering a 9th decimal digit truncates to 8

#### Scenario: allowNegative=false rejects minus sign

- **GIVEN** a `<MoneyInput currency="ARS">` (default `allowNegative: false`) and the user types `-100`
- **WHEN** the input processes the input
- **THEN** the minus sign is stripped; the displayed value is `$ 100,00`; the `v-model` is the number `100`

#### Scenario: allowNegative=true preserves the sign

- **GIVEN** a `<MoneyInput currency="ARS" :allowNegative="true">` (used for an adjustment field) and the user types `-100.50`
- **WHEN** the input processes the input
- **THEN** the displayed value is `$ -100,50` (or with the negative sign per locale convention); the `v-model` is the number `-100.5`

#### Scenario: v-model emits a number, never a formatted string

- **GIVEN** a `<MoneyInput currency="ARS" v-model="amount">` and any user input
- **WHEN** `amount.value` is read
- **THEN** the value is a JavaScript `number` (e.g., `1234567.89`); reading a string `'1.234.567,89'` from `amount.value` is a contract violation — the formatting is a display concern, the binding is numeric

### Requirement: Manifest dialog `money` field type MUST render as MoneyInput with currency-aware decimals

The action manifest engine SHALL accept `'money'` as a valid field type. A field declared `{ type: 'money', currency: 'ARS', decimals?: 2, min?: 0, max?: 1000000, allowNegative?: false, ... }` SHALL render as `<MoneyInput>` with the declared currency / decimals / allowNegative / min / max wired through props. The zod schema for `money` SHALL be `z.coerce.number()` with `.refine()` for sign (positive when `allowNegative: false`), `.min(min)` and `.max(max)` when declared. The manifest validator SHALL reject any `money` field declaration missing the `currency` property — currency is mandatory because rendering and validation cannot be deterministic without it.

#### Scenario: `money` field renders with the declared currency and limits

- **GIVEN** a manifest field `{ type: 'money', currency: 'USD', label: 'Monto a transferir', min: 1, max: 50000 }`
- **WHEN** the dialog renders the field
- **THEN** the field is `<MoneyInput currency="USD" :min="1" :max="50000">` (with the dialog's locale defaulting to `es-AR` for the form's host app), the zod schema is `z.coerce.number().min(1).max(50000)`, and submitting a value outside the range produces a validation error

#### Scenario: `money` declaration without currency is rejected by the validator

- **GIVEN** a manifest field `{ type: 'money', label: 'Monto', min: 0 }` (no `currency`)
- **WHEN** the manifest validator runs (dev mode)
- **THEN** the validator rejects the manifest with a clear message naming the field and the missing `currency` property; the dialog refuses to render that field
