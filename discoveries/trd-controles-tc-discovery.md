---
name: TRD — Controles de desvío de TC en Quotes y Proveedores de Liquidez
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-08
updated_at: 2026-06-10
validated_with: Facundo Vasques (Head of Trading) — 08/06/2026
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

## Decisiones de diseño — validadas con Facu Vasques (08/06/2026)

| # | Pregunta | Decisión |
|---|---|---|
| D-1 | ¿El quote / operación aprobada con desvío queda marcada con un badge en el listado? | **No.** Sin badge ni marcador en el listado. La operación se registra igual que cualquier otra. |
| D-2 | ¿El modal de confirmación requiere un campo de justificación libre antes de confirmar? | **No.** Solo confirmación explícita via CTA. Sin campo de texto libre. |
| D-3 | ¿El CTA cambia de texto y color al detectar desvío, o mantiene su aspecto original? | **Sí, cambia.** El botón pasa a ámbar con texto diferenciado al activarse el desvío. |

### C8 — Layout del campo TC en Proveedores

**Decision (wireframe v2, 2026-06-10 — pendiente validacion Facu):** en Proveedores de Liquidez el campo TC ocupa una fila propia de ancho completo dentro de la seccion INSTRUMENTO, por debajo del grid Par+Plazo. No comparte fila con ningun otro campo. Este layout le da al TC el mismo peso visual que el campo Rate en Quotes y deja espacio suficiente para el bloque FX Pantalla que se incorpora debajo.

### C9 — Estructura interna del bloque FX Pantalla

**Decision (wireframe v2, 2026-06-10 — pendiente validacion Facu):** el bloque FX Pantalla tiene cuatro filas internas con reglas de visibilidad propias:

- **Info row** (siempre visible cuando el bloque esta activo): label `FX PANTALLA` + precio en JetBrains Mono + badge del par seleccionado (ej. `USDC/ARS`, `USD/ARS`) + badge de desvio (`ok` verde o `warn` ambar). El badge del par contextualiza el precio sin requerir que el trader lea el selector de par por separado.
- **Range row** (visible solo en estados amber — desvio activo): muestra el rango aceptable en formato `Rango aceptable: $X – $Y`. No aparece en estado 1 (sin desvio).
- **Chips row** (siempre visible cuando el bloque esta activo): un chip por proveedor disponible (Binance, Matriz) con nombre + precio + icono de copia (`ti-copy`). El chip activo (`.on`) representa el precio actualmente seleccionado como referencia. Click en un chip mueve el `.on` a ese chip y emite un flash visual de confirmacion. En estado normal el chip activo es azul; en estado amber el chip activo es ambar.
- **Bottom row** (siempre visible cuando el bloque esta activo): barra de progreso y contador numerico (ej. `5s`) sincronizados entre si. La barra se vacia linealmente de derecha a izquierda en 5 segundos y se resetea sola. El contador desciende de 5 a 1 y vuelve a 5.

El bloque completo adopta borde y fondo ambar en estados 2 y 3 (desvio activo). En estado 4 (sin referencia), el bloque es reemplazado en su totalidad por el aviso de sin referencia (ver C11).

### C10 — Campo computado recibe tratamiento ambar al detectar desvio

**Decision (wireframe v2, 2026-06-10 — pendiente validacion Facu):** cuando el TC esta fuera del rango aceptable (estados 2 y 3), el campo computado — Monto a entregar en Quotes, Contravalor en Proveedores — muestra borde ambar y texto ambar ademas del valor calculado. Refuerza la señal de desvio sobre el monto resultante de la operacion y hace visible que el importe a liquidar fue calculado sobre un TC fuera del rango.

### C11 — Wording exacto por modulo

**Decision (wireframe v2, 2026-06-10 — pendiente validacion Facu):** los textos de alerta, modal y CTA son especificos por modulo para mantener coherencia con la terminologia del formulario:

| Elemento | Quotes | Proveedores |
|---|---|---|
| Alerta inline — cuerpo | "Rate [X] supera el rango aceptable de ±3% en [Y]%" | "TC [X] supera el rango aceptable de ±3% en [Y]%" |
| CTA normal | "Crear quote →" (sin icono) | "Guardar operacion" (con icono `ti-check`) |
| CTA desviado | "Crear quote con desvio →" (con icono `ti-alert-triangle`) | "Guardar con desvio" (con icono `ti-alert-triangle`) |
| Modal — titulo | "Confirmar Quote con TC fuera del rango" | "Confirmar operacion con TC fuera del rango" |
| Modal — descripcion | "Revisa los datos antes de confirmar. El Rate supera el rango aceptable de mercado." | "Revisa los datos antes de confirmar. El TC registra un desvio significativo respecto al precio de referencia." |
| Modal — ultima fila tabla | "Cliente" | "Proveedor" |
| Modal — boton confirmar | "Confirmar quote" | "Confirmar operacion" |
| Estado 4 — aviso | "Sin referencia disponible para este par" con icono `ti-alert-triangle` | idem |

En estado 4, el bloque FX Pantalla es reemplazado por una fila ambar con el aviso. El campo Rate/TC y el CTA permanecen en estado normal (sin borde ambar, CTA verde).

### C12 — FX Pantalla como campo editable en ambos modulos

**Decision (Facundo Vasques, 2026-06-10):** el valor del FX Pantalla es siempre editable por el trader, independientemente de si el endpoint `/fx-rate` devuelve un precio para el par seleccionado:

- **Cuando la API devuelve precios:** el campo se pre-pobla con el precio del proveedor activo (chip `.on`). Los chips funcionan como referencias — hacer click en un chip copia ese precio al campo editable. El trader puede sobreescribir el valor libremente.
- **Cuando la API no devuelve precio (estado 4):** el campo aparece vacio y editable. El trader puede ingresar manualmente un precio de referencia. Si ingresa un valor y abandona el campo (on blur), el control de desvio se activa normalmente contra ese valor manual.

La validacion del desvio corre siempre contra el valor que esta en el campo FX Pantalla en ese momento — ya sea auto-poblado por la API o ingresado manualmente por el trader.

**Impacto sobre el estado 4 (revision del wireframe pendiente):** el estado 4 no desactiva el control de desvio — lo deja en manos del trader. El aviso "Sin referencia disponible para este par" informa que el sistema no pudo obtener el precio automaticamente, pero el campo FX Pantalla permanece visible y editable (vacio). Si el trader lo deja vacio y abandona el campo TC, el control no se dispara — no hay referencia contra la que comparar. Si el trader ingresa un valor manual en FX Pantalla y luego ingresa un TC que desvie, el control se activa con normalidad. El wireframe actual (estado 4) oculta el bloque FX completo — requiere revision para mostrar el campo editable vacio en lugar del bloque con precios.

---

## Artefacto de validación

Wireframe interactivo HTML con los tres estados de ambos módulos en paralelo:
`discoveries/wireframe_PWI-74.html`

Generado el 08/06/2026 para validación con Facundo Vasques.
