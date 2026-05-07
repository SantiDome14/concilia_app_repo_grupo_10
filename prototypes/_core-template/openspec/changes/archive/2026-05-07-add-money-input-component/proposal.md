- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — usado por OPS, TRD, FIN

# Add MoneyInput component (currency-aware numeric input)

## Why

Tres frentes del financial-core capturan montos monetarios y cada uno construyó su propia versión: OPS tiene `MoneyInput.vue` custom (live formatting `1.234,56` en `es-AR`, símbolo de moneda, decimales por moneda), TRD lo embebe inline en `QuoteForm` y `LiquidityForm`, FIN lo va a necesitar en su Dashboard de KPIs y en cualquier acción que ajuste un balance. Sin un primitivo canónico, cada migración va a heredar formato distinto, validación distinta, accesibilidad distinta.

El template hoy tiene `<Input type="number">` (per `core-forms` `number` field type) pero eso no cubre los requerimientos financieros: locale-aware thousand/decimal separators, símbolo de moneda como prefix/suffix, decimales por moneda (2 para fiat, 8 para crypto), restricción de signo, validación contra montos mínimos / múltiplos de tick size. Esta change cierra el gap.

## What Changes

- **`core-forms`** — dos requirements añadidas:
  - **ADDED** "MoneyInput component MUST format value live with locale-aware separators and emit raw numeric value" — define el componente: live formatting con thousand/decimal separators según `locale` (default `es-AR` con punto como thousand y coma como decimal), símbolo de moneda como prefix/suffix configurable, decimales por moneda configurable (default 2), `allowNegative` boolean (default `false`), output canónico es `number` (no string formateado), integración con vee-validate + zod refinement, accesibilidad (`inputmode="decimal"`, ARIA describedby).
  - **ADDED** "Manifest dialog `money` field type MUST render as MoneyInput with currency-aware decimals" — añade `money` al manifest engine: zod `z.coerce.number()` con `.refine()` per moneda (positivo cuando `allowNegative: false`, multiplo de tick size cuando declarado, min/max).

## Capabilities

### Affected Capabilities

- `core-forms` — dos requirements añadidas.

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-theming` — alineación monoespacial opcional (clase `font-mono` para columnas tabulares); los símbolos de moneda y los separadores no son colores hardcoded.
- Compone con `core-actions-manifest` — `money` se acepta como field type adicional en el motor.

## Notes

- El spec NO contracta **conversión entre monedas** (FX) — el componente captura un monto en una moneda. La conversión es responsabilidad del consumer (TRD usa el `core-api-layer` para fetch FX rates y compone con MoneyInput).
- El spec NO contracta **percent input** (capturar `0.05` para 5%). Es un caso afín pero las reglas son distintas (scaling, símbolo `%`); abre como capability futura si aparece la demanda.
- El spec NO contracta el **selector de moneda** (dropdown que elige la moneda activa). Eso es parte del form que usa MoneyInput; típicamente un `<Select>` adyacente. La spec recomienda el patrón en design.md pero no lo exige.
- El spec NO contracta **sci notation** (`1e6` para un millón) — la entrada es decimal humano.
