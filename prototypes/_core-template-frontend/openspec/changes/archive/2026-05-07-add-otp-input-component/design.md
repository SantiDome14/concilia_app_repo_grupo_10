# Design — add-otp-input-component

## Context

This design covers the `<OtpInput>` component contract and the `otp` manifest field type. The decisions are intentionally minimal — OTP input is a small, well-understood UI pattern; the spec just nails down its shape so every consumer of the financial-core uses the same primitive instead of reaching for an external library or hand-rolling.

---

## Decision 1 — Hand-rolled, not `input-otp` library

### The question

`input-otp` is a popular React library with a Vue port available. Should the template adopt it or hand-roll the component?

### The decision

**Hand-rolled.** ~150 LOC of focus management + paste handling on top of N native `<input>` slots.

### Why

- **Bundle.** `input-otp` adds ~12 KB gzip; the hand-rolled version is < 3 KB.
- **Token consistency.** The library ships its own minimal CSS; aligning with `core-theming` requires overrides. Hand-roll uses the template's `<Input>` slot styles directly.
- **Testing surface.** Hand-rolled means tests live in the template repo, no external dep to mock.
- **Scope is bounded.** N inputs + paste + autofocus advance + masked display. Whole thing is well-understood; reinventing is not adventurous.

### Alternatives considered

- **Adopt `input-otp` (Vue port).** Rejected for the reasons above.
- **Single `<input>` + visual styling that looks like N slots.** Considered. Rejected because the visual cue of N distinct slots is the UX point — collapsing to one input loses the affordance.

---

## Decision 2 — Numeric default, alphanumeric opt-in

### The question

Should the component default to numeric or to alphanumeric?

### The decision

**Numeric default.** The vast majority of OTP use cases are 6-digit numeric (Auth0 SMS / authenticator app). Apps that need alphanumeric (some token-based flows) opt in via `mode="alphanumeric"`.

### Why

- **Mobile keyboard.** Numeric mode triggers `inputmode="numeric"` which surfaces the numeric keypad. Alphanumeric defaults to text keyboard, which is the wrong default for the common case.
- **Auth0's default OTP flow is numeric.** Aligning the default with the most common use case is the right call.

### Failure modes the rule prevents

- A consumer forgets to set `mode` and the user gets the wrong keyboard on mobile → eliminated by the numeric default.

---

## Decision 3 — Mask is opt-in, not default

### The question

Should the OTP digits be visible by default or masked (shown as dots)?

### The decision

**Visible by default; mask is opt-in via `mask="true"`.**

### Why

- **OTP codes are short-lived.** A 30-second TOTP doesn't need the same visual protection as a password. Showing the digits helps the user verify they typed correctly.
- **Some flows want masking.** When the OTP is a transaction PIN that's persistent (vs. a one-time short-lived code), masking is appropriate. Apps choose.

### Failure modes the rule prevents

- A user on a public terminal wants to mask the OTP they're typing → spec allows via prop.
- A user typing a TOTP wants to verify visually → spec defaults to visible.

---

## Decision 4 — Length range 1–16, validator rejects out-of-range

### The question

What's a sensible range for `length`?

### The decision

**1 to 16 inclusive.** Manifest declarations outside the range are rejected.

### Why

- **Common range.** Typical OTPs: 4 (debit card PIN), 6 (TOTP / SMS), 8 (some banking).
- **Beyond 16 is not OTP.** A 32-character "code" is closer to a password / token; the field type for that is `text`.
- **Below 1 is meaningless.**

The cap prevents misuse (someone declaring a 32-character "OTP" that's really a token). 16 is generous for any realistic use case.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-forms` | Field types, validation, `<FormControl>` | OtpInput contract; `otp` field type |
| `core-auth-step-up` | MFA elevation lifecycle | When MFA uses OTP code entry, the `<OtpInput>` is the canonical input — but the spec does NOT couple them; OTP entry can also serve non-auth flows (transaction PIN, email verification code) |
| `core-theming` | Tokens, palette | Slots resolve through tokens; no hardcoded colors |
| `core-actions-manifest` | Manifest engine, dialog field type registry | `otp` enters the registry |

---

## Open questions

1. **Resend button placement.** Apps often pair `<OtpInput>` with a "Reenviar código" button. Out of v1 — it's a sibling button the consumer composes. If a common pattern emerges, a `<OtpInputWithResend>` companion can be added later.
2. **Countdown timer.** When the OTP expires in 02:30, apps may want a countdown next to the input. Out of v1 — sibling component.
3. **Auto-submit on completion.** Some flows submit the form automatically when the user types the last digit. The spec does NOT contract this — apps watch the `v-model` and submit when length reaches `length`. If a common pattern emerges, an `autoSubmit` prop can be added.
4. **WebOTP API.** Browsers offer a `WebOTP` API to auto-fill SMS codes. Out of v1 — adopting it requires backend cooperation (origin-bound SMS) and the API is not universally supported. If demand appears, prop `enableWebOTP` toggles it.
