# Design — add-money-input-component

## Context

This design covers the `<MoneyInput>` component contract: live locale-aware formatting on display, raw numeric `v-model`, currency-aware decimals, and the `money` manifest field type. The decisions explain the trade-offs that keep the component focused while still flexible enough to absorb every monetary input across the financial-core.

---

## Decision 1 — `v-model` emits `number`, never a formatted string

### The question

Two patterns are common for currency inputs:

1. **Display string + raw number value.** The user sees `$ 1.234,56`; the binding is `1234.56`.
2. **Single string binding.** The user sees and the binding is `"1.234,56"` (the form parses on submit).

### The decision

**Numeric `v-model`.** The displayed string is for display only; the binding is always a JavaScript `number`.

### Why

- **Consumer code is typed.** A binding typed as `number` lets vee-validate + zod treat the value with `z.coerce.number().min(...).max(...)` directly. A string binding forces every consumer to parse / handle locale conversion.
- **Avoid string-vs-number bugs.** A subtle class of bugs comes from forms that submit `'1.234,56'` to backends that expect `1234.56`. A numeric binding eliminates the issue at the contract level.
- **Locale-portable.** The same numeric value displays as `$ 1.234,56` (es-AR), `US$ 1,234.56` (en-US), `1.234,56 €` (de-DE) — only the display layer changes; the consumer code stays put.

### Failure modes the rule prevents

- A consumer submits a formatted string to the backend → wrong amount stored. Spec rejects: numeric binding only.

---

## Decision 2 — Decimals are currency-aware (default 2 fiat, 8 crypto)

### The question

Each currency has a different precision: ARS / USD / EUR use 2 decimals; BTC uses 8; ETH uses 18. How does the component know?

### The decision

**Decimals are a prop, defaulting to 2.** Apps SHALL set `:decimals="8"` for crypto explicitly. The spec does NOT auto-derive decimals from the currency code — that would require shipping a currency table, which is data, not contract.

### Why no built-in currency table

- **Currency tables go stale.** New crypto tokens appear weekly; new fiat regimes (denominations) periodically. Shipping a table in the template means recurring upkeep.
- **Backend already knows the precision.** Apps that fetch currencies (`GET /currencies`) get a `decimals` field per currency from the backend. Wiring that to the prop is a one-liner: `:decimals="currency.decimals"`.

### Alternatives considered

- **Built-in currency table.** Rejected for the upkeep reason.
- **Hardcoded 2 decimals always.** Rejected — useless for crypto.

### Failure modes the rule prevents

- Currency table goes stale → eliminated by not having one.
- Apps forget to set decimals for crypto → input truncates to 2 decimals; bug visible immediately at first crypto entry; not a silent corruption.

---

## Decision 3 — Currency symbol is visual; the binding is numeric

### The question

Should the component own the currency symbol, or should the consumer wrap the input?

### The decision

**Component owns the symbol display.** The consumer passes `currency` and the component renders the symbol per locale (prefix or suffix according to the convention).

### Why

Visual consistency across the app — every monetary input shows the symbol the same way. If consumers wrap the input themselves, eight modules render eight slightly-different symbol placements.

### Why the symbol is visual only (not part of the value)

The binding is numeric (Decision 1). The symbol is a display artifact — it does not appear in the value submitted to the backend.

### Alternatives considered

- **Consumer-wrapped inputs.** Rejected for visual drift.
- **Hide the symbol entirely.** Rejected — users editing amounts in a multi-currency context need the symbol for cognitive grounding.

---

## Decision 4 — No embedded currency selector

### The question

When a form has both an amount and a currency selection (e.g., TRD QuoteForm: pick BTC/USD pair, then enter amount), should `<MoneyInput>` include the currency selector internally?

### The decision

**No.** `<MoneyInput>` displays the currency symbol but does not let the user change it. The currency selector is a sibling `<Select>` (or `<CurrencyCombobox>`) that the form composes alongside.

### Why

- **Separation of concerns.** Picking the currency is a different decision from entering the amount. Coupling them locks the UX into a specific layout (symbol + amount in one box).
- **Different validation rules.** The currency comes from a backend-fetched list (validated against an enum); the amount is a number with min/max. Combining them mixes validation surfaces.
- **Currency may be derived, not chosen.** In some flows (e.g., a customer's account in a fixed currency) the user doesn't pick the currency — it comes from context. Forcing a coupled selector would clutter those forms.

### Alternatives considered

- **Embed the selector with a slot.** Rejected — slot composition is more brittle than sibling composition; consumer code is harder to read.

### Failure modes the rule prevents

- A form that wants to derive the currency without showing a selector — eliminated by having the selector be optional and external.

---

## Decision 5 — No FX conversion, no percent input, no sci notation

### The question

Adjacent monetary patterns that could plausibly fit inside `<MoneyInput>`:

- **FX conversion** (enter amount in USD, see equivalent in ARS).
- **Percent input** (enter `5` for 5%).
- **Scientific notation** (enter `1e6` for one million).

### The decision

**Out of scope. None of the three are part of `<MoneyInput>`.**

### Why FX is out

FX conversion involves fetching rates from the backend, choosing a provider (TRD has multi-provider quotes), and rendering both sides — that's a composite UI, not a single input. Apps that need it compose `<MoneyInput>` + a separate `<FXRateDisplay>` component.

### Why percent is out

Percent input has different semantics (scaling, validation against [0, 100] or [0, 1] depending on convention). Different field type entirely. If the demand appears, it's a separate `<PercentInput>` component.

### Why sci notation is out

Sci notation is a power-user shorthand. Backoffice operators don't type `1e6` for a million; they type `1.000.000` and rely on the formatter. Spec keeps the input grounded in human-readable decimal.

### Failure modes the rule prevents

- `<MoneyInput>` becoming a Swiss-army knife — eliminated.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-forms` | Field types, validation, `<FormControl>`, vee-validate + zod | MoneyInput contract; `money` field type |
| `core-theming` | Tokens, palette, monospace font option | Visual states resolve through tokens; `font-mono` is opt-in for tabular alignment |
| `core-actions-manifest` | Manifest engine, dialog field type registry | `money` enters the registry as a valid field type |
| `core-api-layer` | API endpoints, ApiError | `<MoneyInput>` is unaware of API; consumers fetch currencies via `core-api-layer` and wire `:currency` and `:decimals` props |

---

## Open questions

1. **Tick-size validation.** Some currency pairs have a minimum tick (e.g., ARS-USD only quotable in `0.01` increments). The component does NOT enforce tick size; the consuming form's zod schema can add `.refine()`. If tick size becomes pervasive, it can be promoted to a `tickSize` prop later.
2. **Currency-specific symbols.** Some currencies don't have a single canonical symbol (e.g., GBP can be £ or GBP; CHF is usually CHF, not Sw.Fr.). The component delegates to `Intl.NumberFormat` for the rendering, which uses ISO conventions. If apps need overrides, they can pass a `symbol` prop in a future change.
3. **Right-to-left (RTL) layouts.** The financial-core is LTR-only today. If a future expansion targets RTL languages, the component's prefix/suffix logic flips automatically via `Intl.NumberFormat` and CSS `dir` — no code change needed, just verification.
