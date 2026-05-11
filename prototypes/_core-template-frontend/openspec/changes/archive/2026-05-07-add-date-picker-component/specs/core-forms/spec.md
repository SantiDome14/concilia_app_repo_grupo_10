## ADDED Requirements

### Requirement: DatePicker component MUST support single and range modes with locale-aware rendering

The `<DatePicker>` component SHALL be the single canonical date input primitive in the financial-core. It SHALL accept a `mode` prop (`'single' | 'range'`, default `'single'`) — `single` returns a `Date` (or `null`) via `v-model`, `range` returns `{ start: Date, end: Date } | null`. It SHALL accept a `locale` prop (default `'es-AR'`) that drives weekday names, month names, and the locale-specific date format used in the trigger button. It SHALL honor optional `min` and `max` Date props that disable selecting dates outside the range. The component's calendar popover SHALL teleport to `document.body` with `position: fixed` and z-index ≥ 9999 so it sits above modals and drawers (same pattern `<Select>` enforces). The component SHALL integrate with vee-validate via `<FormControl>` so blur and submit validation timing matches `<Input>` and `<Select>`. Hardcoded colors, paddings, and font sizes are forbidden — every visual resolves through `core-theming` tokens. The implementation SHALL be built on reka-ui `Popover` plus a native `<input type="date">` keyboard fallback for accessibility — heavy external date libraries (e.g., `@vuepic/vue-datepicker`, `react-day-picker`) are forbidden.

#### Scenario: Single mode v-models a Date

- **GIVEN** a `<DatePicker v-model="birthdate">` mounted in a Create modal
- **WHEN** the user opens the calendar and selects March 15, 2026
- **THEN** `birthdate.value` becomes a `Date` instance representing 2026-03-15; the trigger button shows the locale-formatted date (e.g., `"15 mar 2026"` for `es-AR`)

#### Scenario: Range mode v-models start and end

- **GIVEN** a `<DatePicker mode="range" v-model="dateRange">` for a transaction date filter
- **WHEN** the user picks March 1, 2026 as start and March 31, 2026 as end
- **THEN** `dateRange.value` becomes `{ start: Date(2026-03-01), end: Date(2026-03-31) }`; the trigger button shows both dates separated by an en-dash

#### Scenario: Calendar popover teleports above the modal overlay

- **GIVEN** a `<DatePicker>` rendered inside a Create modal whose overlay has z-index ≥ 500
- **WHEN** the user clicks the trigger to open the calendar
- **THEN** the popover is teleported to `document.body` with `position: fixed` and z-index ≥ 9999, sitting visually above the modal overlay; it is not clipped by the modal's `overflow: hidden`

#### Scenario: min and max disable out-of-range dates

- **GIVEN** a `<DatePicker :min="today" :max="addDays(today, 30)">` (a 30-day forward window)
- **WHEN** the user opens the calendar
- **THEN** dates before today and dates after today+30 render as disabled (muted text, non-clickable); selecting them is impossible

#### Scenario: Heavy external date libraries are forbidden

- **GIVEN** a developer reaches for `@vuepic/vue-datepicker` or `react-day-picker` to implement the DatePicker
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the contracted stack is `reka-ui Popover` + `date-fns` + native `<input type="date">` accessibility fallback only; heavy date libraries inflate the bundle and diverge from the `core-theming` token system

### Requirement: Manifest dialog `daterange` field type MUST render as DatePicker in range mode

In addition to the manifest field type mappings declared in `core-forms` baseline, the action manifest engine SHALL accept `'daterange'` as a valid field type. A field declared `{ type: 'daterange', ... }` SHALL render as `<DatePicker mode="range">`. The zod schema for `daterange` SHALL be `z.object({ start: z.coerce.date(), end: z.coerce.date() }).refine(({ start, end }) => start <= end, { message: 'La fecha de inicio debe ser anterior o igual a la de fin' })`. The field SHALL honor optional `min` and `max` from the manifest declaration, applied to both endpoints.

#### Scenario: `daterange` field renders as DatePicker in range mode

- **GIVEN** a manifest field `{ type: 'daterange', label: 'Período', required: true }`
- **WHEN** the dialog renders the field
- **THEN** the field is `<DatePicker mode="range">`, the zod schema enforces `start <= end`, and a missing range produces a validation error rendered below the input in `text-danger`

#### Scenario: `daterange` honors min and max from the manifest

- **GIVEN** a manifest field `{ type: 'daterange', label: 'Período', min: '2026-01-01', max: '2026-12-31' }`
- **WHEN** the dialog renders the field
- **THEN** dates outside `[2026-01-01, 2026-12-31]` are disabled in the calendar; submitting a range whose endpoint falls outside the bounds produces a validation error
