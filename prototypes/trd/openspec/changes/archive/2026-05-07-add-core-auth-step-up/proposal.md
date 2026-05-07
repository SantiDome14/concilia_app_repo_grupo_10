- Jira REQ: —
- Module: core-template (foundation)
- Tier: 1 — bloquea OPS (operaciones sensibles tipo whitelist de cuenta y balance edit)

# Extend `core-auth` with MFA / step-up authentication

## Why

OPS dispara MFA antes de operaciones sensibles (whitelist de cuenta, balance edit, override de límites). El legacy implementa eso en `useStepUp.js` como composable local, que envuelve `auth0.loginWithPopup({ prompt: 'login' })` para forzar un re-challenge y elevar el token. El template canónico hoy NO contractualiza step-up — solo el flow base de Auth0 + capabilities. Cualquier app del financial-core que requiera elevación va a inventar la suya — anti-patrón directo del paradigma del template.

Esta change incorpora step-up como extensión natural de `core-auth`. La forma del contrato:

- **`useStepUp()` composable** — accionable desde cualquier componente o action de Pinia que necesite elevation antes de la operación crítica.
- **Wrapper `withStepUp(operation)`** — patrón de uso típico para que la app no deba intercalar verificación + popup + ejecución manualmente. Ejemplo: `await withStepUp(() => apiClient.post('/clients/:id/whitelist', payload))`.
- **Auto-expiración** — la elevación caduca después de un timeout configurable (default 5 minutos) para que un OPS officer que se levanta del escritorio no deje su sesión "elevada" disponible.
- **Errores tipados** — el step-up puede fallar por popup bloqueado, popup cerrado por el usuario, error de red o rechazo de Auth0; el composable surfaces cada caso con `StepUpCancelledError`, `StepUpBlockedError`, `StepUpNetworkError`, `StepUpRejectedError`. La app decide el UX (toast, modal, banner inline).
- **Estado reactivo** — `isElevated`, `elevatedUntil` para que la UI condicione affordances ("Whitelist account" deshabilitado mientras `!isElevated`, countdown opcional al lado del botón).

La capability **NO contractualiza** un componente UI específico (modal, banner). El componente `StepUpModal` que existe en OPS legacy es opcional — la spec lo deja como patrón derivado a libre criterio del app. Lo que SÍ contracta es la forma del composable, el lifecycle de la elevación, y el manejo de errores.

## What Changes

- **`core-auth`** — cinco requirements añadidos:
  - **ADDED** "Step-up authentication MUST elevate the session via Auth0 loginWithPopup with an explicit prompt" — define el contrato del trigger: `auth0.loginWithPopup({ authorizationParams: { prompt: 'login' } })` (con opciones opcionales para `acr_values` cuando el tenant lo requiera). En éxito, el token se considera elevado; el composable expone `isElevated = true`.
  - **ADDED** "Elevated session MUST auto-expire after a configurable timeout" — la elevación tiene una vida finita; default 5 minutos, configurable vía `VITE_STEPUP_TTL_SECONDS` o per-call option. Al expirar, `isElevated → false` automáticamente y `elevatedUntil → null`.
  - **ADDED** "Sensitive operations MUST run inside withStepUp wrapper, never with manual elevation checks" — la app SHALL usar `withStepUp(operation)` y NO escribir manualmente `if (!isElevated) await requestStepUp(); operation()` — el wrapper concentra el flow y evita raça conditions.
  - **ADDED** "Failed step-up MUST surface a typed error so apps can branch on the cause" — el composable rejects con `StepUpCancelledError | StepUpBlockedError | StepUpNetworkError | StepUpRejectedError` cubriendo los cuatro modos de falla esperables.
  - **ADDED** "Step-up state MUST be inspectable via reactive `isElevated` and `elevatedUntil`" — los apps consumen el estado para condicionar UI (deshabilitar botones, mostrar countdown, prompt explícito antes de la acción).

## Capabilities

### Affected Capabilities

- `core-auth` — cinco requirements añadidos cubriendo trigger, expiración, wrapper, errores tipados, estado reactivo.

### New Capabilities

None. Esta change extiende `core-auth`.

### Cross-capability dependencies

- Compone con `core-api-layer` — el token elevado lo emite el mismo Auth0 SDK que `setAccessTokenGetter` ya usa; no hace falta un getter aparte. Cuando una request va al backend con el token elevado, el backend valida `acr` o un claim equivalente y autoriza.
- Compone con `core-error-handling` — los errores tipados se materializan en toast / banner / modal según la decisión del app; la spec NO lo contracta (libre criterio).
- Compone con `core-modals` — un app PUEDE renderizar un `<StepUpModal>` propio antes de invocar `withStepUp()` para explicar al usuario por qué se le pide el segundo factor; la spec NO lo exige.

## Notes

- El acr_values específico (`urn:mace:incommon:iap:silver`, `mfa`, etc.) es decisión del tenant Auth0 de Ardua, no del template. La opción se pasa por config, no se hardcodea.
- La capability NO trata **biometric step-up** (WebAuthn / passkeys). Si en el futuro Auth0 expone passkeys como segundo factor, el contrato actual sigue válido — `loginWithPopup` con el `prompt` apropiado dispara el flow correcto y la app no necesita saber el detalle.
- La capability NO trata **continuous elevation** (mantener la sesión elevada indefinidamente mientras la app esté activa). El TTL fijo evita ese antipatrón intencionalmente.
- Si el tenant Auth0 no soporta `loginWithPopup` (configuración restrictiva, browsers que bloquean popups por defecto), el composable cae en `loginWithRedirect` con `returnTo` apuntando a la página actual. Ese fallback se documenta en design.md.
