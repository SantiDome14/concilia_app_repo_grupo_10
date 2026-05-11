# Design — add-date-picker-component

## Context

This design captures the rationale for the `<DatePicker>` component contract: two modes, locale-awareness, light implementation, and the addition of `daterange` as a manifest field type. The decisions below explain the trade-offs around the implementation stack and the explicit non-features.

---

## Decision 1 — Built on reka-ui Popover + date-fns, not on a heavy date library

### The question

Three obvious paths for the implementation:

1. **Heavy library (`@vuepic/vue-datepicker`, `flatpickr`, `react-day-picker`).** Battle-tested calendars, lots of features out of the box.
2. **Light library + glue (`reka-ui Popover` + `date-fns`).** Composes existing template primitives; the calendar is hand-rolled but small.
3. **Native `<input type="date">` only.** Ugly, browser-divergent, no range mode, accessible by default.

### The decision

**Path 2.** The Popover comes from `reka-ui` (already a dep), `date-fns` is already wired (per `core-forms` `<DatePicker>` reference). The calendar grid is hand-rolled (~150 LOC) with full keyboard navigation. Native `<input type="date">` remains as an accessibility fallback for keyboard users on the trigger.

### Why

- **Bundle size.** `@vuepic/vue-datepicker` adds ~80KB gzip; the hand-rolled calendar is ~5KB.
- **Token consistency.** Heavy libraries ship their own CSS. Aligning them with `core-theming` tokens means overriding their CSS extensively — error-prone and brittle on library upgrades.
- **Two modes are simple.** Single + range cover every known use case in the financial-core. We don't need the 30 features of `@vuepic/vue-datepicker`.

### Alternatives considered

- **Use what LEX already has (`@vuepic/vue-datepicker`).** Rejected. Inherits the bundle cost and the token-override problem app-wide.
- **Native only.** Rejected. No range mode; visual divergence between Chrome / Safari / Firefox is unacceptable for the design system.

### Failure modes the rule prevents

- A developer adopts a third library "for richer features" → bundle bloat + token drift. Spec rejects.

---

## Decision 2 — Default locale `es-AR`, override per-prop

### The question

Should the locale be driven by browser detection, hardcoded to one locale, or configurable per component?

### The decision

**Default `es-AR`, override via `locale` prop.** The browser's `navigator.language` is intentionally ignored.

### Why

- **The financial-core is Spanish-Argentinian first.** OPS, LEX, TRD, FIN all operate in `es-AR`. Defaulting elsewhere would force every component to override.
- **Prop override is escape valve.** A future CLP customer-facing module that targets multiple LATAM countries can pass `locale="es-MX"` (or `pt-BR` if the app expands).
- **Browser detection is unreliable for backoffice.** A user on a Spanish-language Windows install in the US would default to `es-US` (which lacks proper formatting) — bad outcome.

### Failure modes the rule prevents

- A user in a non-AR browser sees confusing date formats → eliminated by hardcoded default.

---

## Decision 3 — `@internationalized/date` (CalendarDate) vs. native Date

### The question

OPS already depends on `@internationalized/date` (transitively, via reka-ui's calendar primitive). Should the contract use `CalendarDate` (timezone-naive, ISO-calendar) as the canonical type, or stick with native `Date` (timezone-aware, error-prone)?

### The decision

**Native `Date` for the v-model output. CalendarDate may be used internally for calendar rendering but the consumer-facing contract is `Date`.**

### Why

- **Vue ecosystem is `Date`-first.** vee-validate, zod (`z.coerce.date()`), and most Pinia patterns assume `Date`. Forcing consumers to convert to/from `CalendarDate` is friction.
- **Timezone safety is the consumer's job.** The DatePicker emits a date at midnight local time; if the consumer needs UTC or a specific zone, they convert. Documenting the convention in design.md.

### Alternatives considered

- **Adopt CalendarDate as v-model.** Rejected for ecosystem friction.
- **Mode-dependent type (Date for single, CalendarDateRange for range).** Rejected as inconsistent.

### Failure modes the rule prevents

- A consumer expects timezone-correct ISO strings and gets `Date` → resolved by documentation; the convention is "DatePicker emits at midnight local time, consumer converts".

---

## Decision 4 — No time picker, no multi-month, no preset shortcuts

### The question

What features should the DatePicker support beyond single + range?

### The decision

**Single + range. No time, no multi-month, no presets ("Last 7 days", "This month").**

### Why

- **Backoffice forms rarely need time precision.** Operations are date-bound (settlement T+1, reconciliation per day). When time is needed, it's domain-specific (timestamps in a transaction list) and not part of a form input.
- **Multi-month is a power-user feature.** The financial-core forms are single-month sufficient.
- **Presets are app-specific.** "Last 7 days" makes sense for OPS reporting but maybe not for LEX onboarding date-of-birth. Apps that need presets compose them as separate dropdown buttons next to the DatePicker.

### Alternatives considered

- **Include time picker.** Rejected — every form that uses DatePicker would have to know what to do with the time portion.
- **Include presets.** Rejected — apps add them as needed via slot or composition.

### Failure modes the rule prevents

- DatePicker becoming a Swiss-army knife — eliminated by scope discipline.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-forms` | Field types, validation, `<FormControl>`, vee-validate + zod | DatePicker contract; `daterange` field type |
| `core-modals` | Modal overlay z-index conventions | DatePicker popover teleports to body with z-index ≥ 9999 — same pattern as `<Select>` |
| `core-theming` | Tokens, palette | All visual states resolve through tokens; no hardcoded colors |
| `core-actions-manifest` | Manifest engine, dialog field type registry | `daterange` enters the registry as a valid field type |

---

## Open questions

1. **Time picker.** When a use case appears (reconciliation timestamp, RFQ deadline). Will be a separate component, not an extension of DatePicker.
2. **Presets.** Will be app-side composition; possibly a `<DateRangePresets>` companion in a future change.
3. **Date math integration.** Some forms need "X days from start" auto-fill on end. Out of v1; consumers compose with `addDays` from `date-fns` themselves.
