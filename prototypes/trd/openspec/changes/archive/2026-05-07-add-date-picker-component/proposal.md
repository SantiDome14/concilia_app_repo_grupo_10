- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — usado por LEX, OPS, TRD; el manifest engine ya menciona `<DatePicker>` pero no lo contracta

# Add DatePicker component (single + range modes, locale-aware)

## Why

Tres apps del financial-core necesitan picker de fechas y cada una resolvió por su lado: LEX usa `@vuepic/vue-datepicker`, OPS construye date-range pickers custom dentro de modals, TRD usa `react-day-picker`. Tres librerías distintas, tres APIs distintas, tres comportamientos visuales distintos — anti-patrón directo del paradigma del template. Adicionalmente, la spec de `core-forms` menciona `<DatePicker>` en el manifest field type mapping (`date` → `<DatePicker>`) pero NO contracta el componente: ni cómo se ve, ni qué modos soporta, ni cómo se localiza.

Esta change cierra el gap. Contracta el componente `<DatePicker>` con dos modos canónicos (`single` y `range`), localización por defecto `es-AR` (override por prop), integración con vee-validate + zod, y agrega `daterange` como nuevo field type del manifest engine para casos donde un solo campo capture un rango (común en filtros y exports).

## What Changes

- **`core-forms`** — dos requirements añadidos:
  - **ADDED** "DatePicker component MUST support single and range modes with locale-aware rendering" — define el componente: dos modos (`single`, `range`), prop `locale` (default `es-AR`), `min`/`max` honored, accesibilidad keyboard, integración con vee-validate vía `<FormControl>`, no librerías externas pesadas (built on reka-ui Popover + native input enhancement).
  - **ADDED** "Manifest dialog `daterange` field type MUST render as DatePicker in range mode" — extiende el manifest engine: el tipo `daterange` se acepta como válido (en addition to the existing whitelist), renderiza `<DatePicker mode="range">`, zod schema `z.object({ start: z.coerce.date(), end: z.coerce.date() }).refine(start <= end)`.

## Capabilities

### Affected Capabilities

- `core-forms` — dos requirements añadidas. La whitelist base de field types queda como referencia mínima; este change añade `daterange` como tipo adicional aceptado.

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-theming` — color tokens, fonts, focus ring; no hardcoded colors.
- Compone con `core-modals` — el DatePicker dentro de un modal teleporta su popover a `body` con z-index ≥ 9999 (mismo patrón que `<Select>` ya contracta para evitar clipping del overlay del modal).

## Notes

- El spec NO adopta `@vuepic/vue-datepicker` ni ninguna librería pesada. La implementación de referencia es `reka-ui Popover` + native `<input type="date">` enhancement + `date-fns` para parse/format. Se evalúa `@internationalized/date` (CalendarDate) que ya está en OPS como dep transitiva — decisión final en design.md.
- El spec NO contracta multi-month picker ni preset shortcuts ("Últimos 7 días", "Este mes"). Si en el futuro un caso justifica presets, eso es una extensión.
- El spec NO contracta time picker (HH:MM:SS). El `<DatePicker>` cubre solo fechas. Si una app necesita time, eso es un componente separado en una capability futura.
