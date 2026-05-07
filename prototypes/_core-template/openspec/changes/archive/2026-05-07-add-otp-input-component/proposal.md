- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — usado por TRD (MFA OTP), companion natural de `add-core-auth-step-up`

# Add OtpInput component (multi-digit code field)

## Why

TRD legacy usa `input-otp` (React) para entrada de OTP de 6 dígitos en flows de MFA. Con `add-core-auth-step-up` ya contractado, es probable que algunos tenants de Auth0 demanden OTP code entry como segundo factor — y cualquier app del financial-core que adopte ese flow va a necesitar el mismo primitivo. Sin un componente canónico, cada migración va a importar una librería distinta o reinventar el pattern de N inputs separados con autofocus advance.

Esta change cierra el gap. Define `<OtpInput>` como el primitivo canónico: N-digit input con autofocus advance, paste support, masked display opcional, integración con vee-validate. Es companion natural del `add-core-auth-step-up` aunque también sirve casos no-MFA (ej: ingresar un código de verificación enviado por email, un PIN de transacción).

## What Changes

- **`core-forms`** — dos requirements añadidas:
  - **ADDED** "OtpInput component MUST render N independent slots with autofocus advance and paste support" — define el componente: N-digit configurable (default `6`), cada dígito un slot independiente con focus management automático, backspace retrocede al slot previo, paste de un código completo lo distribuye, modo `numeric` (default) o `alphanumeric`, masked display opcional (`mask: boolean`, oculta los dígitos como puntos), integración con vee-validate vía `<FormControl>`, ARIA labels per slot.
  - **ADDED** "Manifest dialog `otp` field type MUST render as OtpInput with the declared length" — añade `otp` al manifest engine: zod `z.string().length(N).regex(/^\d+$/)` para numérico (o `[A-Z0-9]+` para alphanumeric).

## Capabilities

### Affected Capabilities

- `core-forms` — dos requirements añadidas.

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-auth-step-up` — el flow típico de step-up con OTP usa `<OtpInput>` dentro del modal de verificación. La spec NO exige el surface modal — `<OtpInput>` funciona en cualquier contexto.
- Compone con `core-theming` — los slots heredan tokens de input; el masked display usa el token `--t-3` para los dots.

## Notes

- El spec NO contracta **regenerar / re-enviar el código** desde el componente. Eso es flow del consumer (button "Reenviar código" sibling al OtpInput).
- El spec NO contracta **timer countdown** ("expira en 02:30"). El consumer renderiza el countdown al lado si lo necesita.
- El spec NO contracta **biometric / passkey input** — eso es Auth0 SDK territorio (`add-core-auth-step-up` lo absorbe transparentemente).
- El spec NO contracta **alphanumeric con case sensitivity** — el modo `alphanumeric` por defecto es uppercase-normalized (los dígitos se convierten a uppercase al teclear). Si una app necesita case-sensitive, abre como extension.
