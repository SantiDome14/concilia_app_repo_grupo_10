---
name: TRD — Controles de desvío de TC en Quotes y Proveedores de Liquidez
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-08
updated_at: 2026-06-08
propagates_to:
  - features/trd/trd-quotes.md
  - features/trd/trd-proveedores-de-liquidez.md
---

# TRD — Controles de desvío de TC en Quotes y Proveedores de Liquidez

## Objetivo

Definir y validar el diseño de interacción para los controles de desvío de TC incorporados en los módulos Quotes y Proveedores de Liquidez de TRD (PWI-74). El discovery documenta: qué datos expone cada módulo hoy, cómo se construye el control, el patrón de doble barrera diseñado, y las decisiones pendientes de validación con el Head of Trading.

## Contexto

PWI-74 nace de un riesgo operativo real: un TC mal cargado en Quotes o en Proveedores puede avanzar sin que nadie lo note y generar pérdidas directas o problemas de conciliación. Solicitado por Facundo Vasques (Head of Trading).

Ambos módulos tienen comportamientos distintos hoy:
- **Quotes:** el campo `FX PANTALLA MANUAL` ya existe en el formulario y se auto-popula desde el feed de Matriz (y Binance cuando está disponible). El RATE es el TC ingresado manualmente por el trader. El control de desvío compara RATE vs FX Pantalla.
- **Proveedores de Liquidez:** el campo `TC` es de carga libre sin ninguna referencia visible. No existe FX Pantalla en este módulo. Para incorporar el control, primero hay que agregar el FX Pantalla como dato de contexto.

### Confirmación de Facu (08/06/2026)

> "el TC es el mismo"

El TC comparado en Proveedores es equivalente al RATE de Quotes: precio de la moneda base en términos de la moneda quote para el par seleccionado. El umbral de ±3% aplica igual en ambos módulos.

---

## Hallazgos del codebase

### FX Pantalla Manual en Quotes (`core-trd-frontend`)

- El campo `fxPantalla` se obtiene vía endpoint `/fx-rate` al seleccionar el par y el cliente.
- El formulario muestra chips clickeables de providers (Binance, Matriz). Al hacer click en un chip, el valor del provider se copia al campo `fxPantalla`.
- El campo es editable: el trader puede sobreescribir el valor auto-populado.
- `fxPantalla` es requerido para habilitar el botón "Crear quote" (`isFormValid` incluye `!!fxPantalla`).
- Se envía al backend como `fx_pantalla`.

### Campo TC en Proveedores (`LiquidityForm.tsx`)

- `exchange_rate` — input numérico libre, sin referencia de mercado asociada.
- El contravalor se recalcula automáticamente: `origin_amount × exchange_rate = destination_amount` (y viceversa — cálculo bidireccional).
- No hay ninguna llamada al endpoint de precios en el formulario actual.

---

## Diseño de interacción — Patrón de doble barrera

El control implementa dos barreras de confirmación secuenciales. Ninguna bloquea la operación: el trader puede ignorar ambas si confirma explícitamente.

### Estado 1 — Sin desvío

El formulario se comporta de forma normal. El desvío entre TC y FX Pantalla es ≤ ±3%. Sin alertas. CTA verde normal ("Crear quote" / "Guardar operación").

### Estado 2 — TC fuera de rango (alerta inline)

Se activa cuando `|TC - FX_Pantalla| / FX_Pantalla > 0.03`.

**Cambios visuales:**
- El borde del bloque RATE / FX Pantalla (Quotes) o de la sección INSTRUMENTO (Proveedores) cambia a ámbar.
- Aparece una alerta ámbar inline inmediatamente debajo del bloque TC / FX Pantalla, con:
  - Título: "TC fuera del rango"
  - Descripción: TC ingresado, umbral superado, desvío real en porcentaje.
  - Tres pills: FX referencia · Rango aceptable ($FX × 0.97 – $FX × 1.03) · Desvío real.
- El CTA cambia de verde a ámbar y modifica su texto: "Crear quote con desvío →" / "Guardar con desvío".

El trader puede continuar normalmente. La alerta no es modal ni bloqueante.

### Estado 3 — Modal de confirmación

Se activa al hacer click en el CTA cuando hay desvío activo.

**Overlay oscuro** sobre el formulario. Modal centrado con:
- Ícono de alerta ámbar.
- Título: "Confirmar [Quote / operación] con un TC fuera del rango".
- Descripción breve.
- Tabla resumen con: Par / Tipo (BUY o SELL) / FX referencia / Rango aceptable / TC ingresado con desvío en ámbar / Cliente (Quotes) o Proveedor (Proveedores de Liquidez).
- Dos botones: "Cancelar" (regresa al Estado 2 sin perder datos) y "Confirmar" en ámbar.

---

## Diferencias de implementación entre módulos

### Quotes

- FX Pantalla ya existe → solo se agrega la lógica de control y las barreras visuales.
- La row de desvío compacta se muestra dentro del modal de "Crear Quote", entre los campos de monto y el bloque de flujo.
- El campo RATE del formulario muestra el TC directamente (el trader lo ingresa explícitamente).
- Sin cambios estructurales al formulario existente.

### Proveedores de Liquidez

- FX Pantalla no existe → se agrega como **row informativa compacta** dentro de la sección INSTRUMENTO, debajo del campo TC.
- La row muestra: label "FX ref" / valor / badge de desvío (verde u ámbar) / chips de Binance y Matriz a la derecha.
- Los chips funcionan igual que en Quotes: click copia el valor al campo de referencia.
- La lógica de desvío y las barreras visuales son idénticas a Quotes.

---

## Datos expuestos en la alerta inline (ambos módulos)

| Dato | Valor ejemplo |
|---|---|
| FX referencia | $1.040,00 |
| Rango aceptable | $1.008,80 – $1.071,20 |
| Desvío real | +10.6% |

---

## Decisiones pendientes de validación con Facu Vasques

| # | Pregunta | Impacto |
|---|---|---|
| D-1 | ¿El quote / operación aprobada con desvío queda marcada con un badge en el listado? | Si sí, Technology debe persistir un flag `deviation_approved: true` en el registro |
| D-2 | ¿El modal de confirmación requiere un campo de justificación libre antes de confirmar? | Si sí, el modal necesita un textarea y el campo debe persistirse |
| D-3 | ¿El CTA cambia de texto y color al detectar desvío, o mantiene su aspecto original? | Si no cambia, todo el peso de la segunda barrera recae exclusivamente en el modal |

---

## Artefacto de validación

Wireframe interactivo HTML con los tres estados de ambos módulos en paralelo:
`discoveries/wireframe_PWI-74.html`

Generado el 08/06/2026 para validación con Facundo Vasques.
