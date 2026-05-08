# Design — add-core-auth-step-up

## Context

This design captures the rationale behind extending `core-auth` with five requirements that cover MFA / step-up authentication. The capability formalises a pattern the OPS legacy implements locally as `useStepUp.js` and that any other app of the financial-core (TRD when settling large operations, LEX when changing client status, FIN when adjusting balances) will need the moment it ships its first elevation-required action.

The design choices below explain what step-up looks like at the contract level, why the contract is shaped the way it is, and where it deliberately stops short of contracting UI — leaving that to the apps.

---

## Decision 1 — Popup-first with redirect fallback (not redirect-only)

### The question

Auth0's two flows for re-prompting authentication are `loginWithPopup` and `loginWithRedirect`. Each has trade-offs:

- **Popup.** Flow stays in the same page (no re-render of the entire app). User context is preserved. Faster.
- **Redirect.** Reliable on every browser. Doesn't fight popup blockers. Requires the app to handle the redirect roundtrip and restore context via `appState.returnTo`.

### The decision

**Popup-first; redirect as automatic fallback.** The composable tries `loginWithPopup` and only falls back to `loginWithRedirect({ appState: { returnTo: currentLocation } })` when the popup fails (blocked by the browser or disabled by tenant config). The fallback is opaque to the app — `requestStepUp()` resolves successfully in both paths.

### Alternatives considered

- **Redirect-only.** Rejected. The roundtrip is jarring for short-elevation flows (whitelist a single CVU = 30 seconds of work, why redirect away?). Popup keeps the user in context.
- **Popup-only.** Rejected. Popup blockers exist; some Auth0 tenant configs disable popup mode entirely; not having a fallback would brick the elevation flow on those environments.
- **Let the app pick the strategy per-call.** Considered. Rejected because step-up is a security surface — picking the wrong strategy by accident weakens it. The composable picks; the app benefits.

### Failure modes the rule prevents

- A developer hardcodes `loginWithRedirect` for "reliability" → bad UX for short flows. Spec mandates popup-first.
- A developer hardcodes `loginWithPopup` and the user's browser blocks popups → step-up is unreachable. Spec mandates fallback.

---

## Decision 2 — TTL of 5 minutes, configurable, no continuous elevation

### The question

How long does an elevated session last? Two extremes:

- **Very short (e.g., 30 seconds).** Maximum security; user has to re-authenticate constantly. UX hostile for any flow that takes longer than a single click (e.g., reviewing a balance reconciliation report before approving).
- **Until the session ends or the tab closes.** Maximum convenience; security risk is high — user steps away from desk, anyone walking by has elevated access.

### The decision

**Default 5 minutes (300 seconds), configurable via `VITE_STEPUP_TTL_SECONDS` and per-call option.**

The 5-minute window is the typical industry default for step-up flows — long enough to complete a non-trivial sequence of sensitive operations (review payload + adjust + confirm + monitor result) without re-prompting; short enough that an unattended desk does not stay armed for hours.

Per-call override exists for two patterns: (a) a particularly sensitive operation that wants a tighter window (e.g., 60 seconds for a critical balance override), or (b) a less sensitive operation that wants a longer window (e.g., 15 minutes for a compliance reviewer working through a queue of clients).

### Alternatives considered

- **No TTL — elevation lasts until session ends.** Rejected. Security regression.
- **Tab-bound elevation (cleared on tab close).** Considered. Rejected because some users keep tabs open for hours; doesn't bound the window.
- **Activity-based elevation (resets TTL on every user action).** Considered. Rejected for v1 because it complicates the model — a typing user keeps elevation alive even on irrelevant pages. If a future use case justifies it, it's an additive feature behind a flag.

### Failure modes the rule prevents

- A developer disables the TTL "for tests" and ships it to prod → security regression. Spec mandates the timer is present and tied to `elevatedUntil`.
- A developer hardcodes a 30-minute TTL — too long for high-risk surfaces. Spec mandates the default is 5 minutes; longer values only for explicit per-call opt-in with documented justification.

---

## Decision 3 — `withStepUp(operation)` wrapper as the only contracted call site

### The question

How does an app gate a sensitive operation? Three patterns are possible:

1. **Manual check + step-up + execute.** `if (!isElevated) await requestStepUp(); await op();`
2. **Wrapper helper.** `await withStepUp(() => op());`
3. **Decorator on the action.** `@withStepUp\nasync whitelistAccount() {...}` (TS decorator)

### The decision

**Wrapper helper is the only contracted pattern. Manual checks are forbidden. Decorators are not contracted (Vue ecosystem doesn't standardise them; TS decorator stage is moving).**

### Why the manual pattern is forbidden

```ts
// FORBIDDEN
if (!isElevated.value) await requestStepUp();
await sensitiveOp();
```

This pattern has three subtle bugs:

1. **Race between check and op.** If `elevatedUntil` expires between the check and the op, the op fires unelevated.
2. **Lost cancellation.** If `requestStepUp()` rejects (user cancels), the developer must remember to NOT execute the op. Easy to forget when the cancel branch is buried in error handling.
3. **No telemetry centralisation.** If three different actions use this pattern, telemetry for "how often does step-up happen, how often is it cancelled" must be wired in three places.

The wrapper concentrates all three concerns:

```ts
await withStepUp(() => sensitiveOp());
// - Re-checks isElevated immediately before invoking op.
// - If requestStepUp rejects, op never fires.
// - Single instrumentation point for telemetry.
```

### Alternatives considered

- **Allow both patterns.** Rejected. Two patterns means two error surfaces; the wrapper subsumes the manual pattern in every case the manual pattern is correct, and rules out the cases where the manual pattern is buggy.
- **TS decorator.** Considered. Rejected for v1 because Vue's options API and Composition API don't have a canonical decorator pattern, and the TC39 decorator proposal has had multiple stages. Revisit if Vue ecosystem standardises.

### Failure modes the rule prevents

- The three subtle bugs from "Why the manual pattern is forbidden" — eliminated by mandating the wrapper.

---

## Decision 4 — Four typed error classes, not generic Error

### The question

Step-up can fail four ways. Should the composable throw a generic `Error` and let the app inspect a `code` field, or use four distinct error classes?

### The decision

**Four typed classes:** `StepUpCancelledError`, `StepUpBlockedError`, `StepUpNetworkError`, `StepUpRejectedError`.

### Why typed classes over a single class with a `code` field

- **Type narrowing in TS.** `try { ... } catch (e) { if (e instanceof StepUpCancelledError) ... }` gives the consumer compile-time type narrowing of any extra fields the class carries (`StepUpRejectedError` has `auth0Code: string`; the others do not).
- **Documentation by class name.** A reader of `try { await withStepUp(op); } catch (e) { if (e instanceof StepUpCancelledError) showCancelToast(); }` immediately knows what's being handled — no need to look up "what does code 'CANCELLED' mean?".
- **Graceful refactoring.** Adding a fifth failure mode is a new class; the existing four don't change their shape. With a single class + code field, adding a code can break consumers that switch on a closed enum.

### Why not throw the raw Auth0 error directly

The Auth0 SDK throws errors with provider-specific shapes (`{ error: 'access_denied', error_description: '...' }`). Leaking that contract means the app couples to Auth0 internals — when the SDK changes its error shape (and it has, between major versions), every consumer breaks. The typed wrappers translate Auth0 specifics into Ardua-specific cases once.

### Failure modes the rule prevents

- A developer catches `Error` generically and renders `error.message` to the user — error message contains Auth0 internal jargon ("Cross-origin opener policy"). Spec rejects: typed classes carry a `userMessage` getter (separate from `message`) for safe display.
- A developer adds a fifth case ("MFA enrolled but second factor unreachable") by extending the existing class with a new code → consumers that switch on the enum break silently. Spec mandates each case is its own class — adding a new class is additive and doesn't invalidate existing handlers.

---

## Decision 5 — Reactive `isElevated` and `elevatedUntil`, not callbacks

### The question

How do consumers observe elevation state? Three patterns:

1. **Reactive refs (Vue idiomatic).** Components bind to `isElevated` and `elevatedUntil`; reactivity does the rest.
2. **Callbacks / events.** `useStepUp({ onElevate: () => {}, onExpire: () => {} })`.
3. **Pinia store with mutations.** Centralised store with watchers.

### The decision

**Reactive refs.** The composable returns `isElevated: ComputedRef<boolean>` and `elevatedUntil: Ref<Date | null>`. Consumers `watch()` them or bind directly in templates.

### Why reactive refs

- Vue idiomatic — components, computeds, watchers all consume refs natively.
- Composable scope is correct — refs are local per `useStepUp()` call but the underlying state is shared (singleton). No context plumbing needed.
- Tests can mock the composable to return controlled refs.

### Why not callbacks

Callbacks force imperative wiring at every consumer. A countdown indicator would need to subscribe to `onElevate`, set its own timer, subscribe to `onExpire`. With refs, the same indicator binds to `elevatedUntil` and re-renders automatically.

### Why not Pinia

Pinia is for app-wide cross-component state. Step-up state IS app-wide, but the composable interface already makes that transparent — every `useStepUp()` call shares the same internal singleton. Wrapping in a Pinia store adds a layer without value.

### Failure modes the rule prevents

- A developer mutates `isElevated.value = true` to "skip step-up in tests" → spec rejects: `isElevated` is a ComputedRef. Tests mock the composable.
- A developer subscribes to `auth0.idTokenClaims` to derive elevation themselves → spec rejects: the elevation state is a contract owned by `useStepUp`, not by app-side derivations.

---

## Cross-capability composition

| Neighbor | What it owns | What this change owns |
|---|---|---|
| `core-auth` (host) | Auth0 plugin registration, route guards, capability-checking, token caching | Step-up trigger, TTL, wrapper, typed errors, reactive state |
| `core-api-layer` | `apiClient`, `setAccessTokenGetter`, `ApiError`, retry policy | Token-level elevation (the same Auth0 SDK that feeds the api client also emits the elevated token) |
| `core-error-handling` | Toasts, banners, `EmptyState`, `Skeleton`, alert variants | Typed step-up errors are surfaced via toasts / banners by the app — the spec does not contract a specific surface |
| `core-modals` | Modal flows (Create, Detail, Edit, Confirmation, Drawer, ClosureModal, ModalInfo, KanbanAxisDialog) | Apps MAY render an explanatory `<StepUpModal>` before invoking `withStepUp()` — opt-in, not contracted here |

The clearest boundary in this change: **core-auth owns the elevation contract; UI surfaces decide how the elevation is visualized.** Apps render the optional explanatory modal, the disabled buttons, the countdown timers — the spec contracts the underlying state, not the visual.

---

## Open questions

1. **Step-up via passkeys / WebAuthn.** Auth0 is rolling out passkey support as a second factor. The current contract (`loginWithPopup` with `prompt: 'login'`) works transparently — Auth0 picks the user's enrolled factor. If passkeys become the default and require a different SDK call, the composable absorbs the change without spec impact.
2. **Cross-tab elevation sync.** If a user has two tabs of the same app and elevates in tab A, should tab B see `isElevated = true`? Out of scope for v1. Defer until a real use case appears (e.g., OPS officer working in two tabs simultaneously). When opened, the answer will live in the composable's internal state mechanism (broadcast channel or storage event), not in the spec contract.
3. **Elevation revocation on logout.** Logout clears the Auth0 session entirely; the composable's `clearElevation()` is implicit because the underlying token is gone. Documented for clarity — no separate spec requirement needed.
4. **Telemetry hooks.** The wrapper is a natural site for emitting `step-up.requested`, `step-up.completed`, `step-up.cancelled` events. Out of v1 — apps can wrap or `watch()` themselves. If telemetry becomes a first-class concern in the template, a follow-up change adds typed events.
5. **Step-up requirement declaration on routes.** Could `meta.requiresElevation = true` on a route auto-trigger step-up on navigation? Considered. Rejected for v1 because elevation usually wraps a specific action, not the entire page (a page may have read affordances that don't require elevation alongside write affordances that do). If a use case proves the per-route gating is useful, it's additive — no spec break.
