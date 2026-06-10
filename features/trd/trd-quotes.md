# TRD — Quotes

> Última actualización: 2026-06-10
> Estado: En producción — extensión en desarrollo
> Discovery de referencia: `discoveries/trd-quotes-discovery.md` · `discoveries/trd-controles-tc-discovery.md`

---

## Propósito

Quotes es el módulo de TRD donde la Mesa de Trading registra las operaciones de compra y venta de FX con clientes de Ardua. El trader ingresa el Rate — el precio al que Ardua le vende o compra al cliente — y el sistema calcula el monto resultante a entregar.

> **Nota:** este feature file fue creado a partir de la inspección de código realizada en `trd-controles-tc-discovery.md`. El relevamiento completo del módulo (ciclo de vida del quote, estados, filtros del listado, campos exactos del formulario) queda pendiente de verificación contra TRD QA — ver `trd-quotes-discovery.md`.

---

## Terminología clave

- **Rate:** el precio al que Ardua le vende o compra al cliente. Campo central del formulario de creación de quotes.
- **FX Pantalla:** precio de referencia de mercado obtenido en tiempo real desde los proveedores (Binance, Matriz). No es el precio operativo — es la referencia contra la cual se valida el Rate ingresado.
- **Monto a entregar:** campo calculado automáticamente a partir del Rate y el monto de la operación.

---

## Formulario de nueva operación

Relevado desde `QuoteForm.tsx`. Bloque clave:

**FX Pantalla:**
- Se obtiene automáticamente desde `GET /fx-rate?pair_id={id}` al seleccionar el par y el cliente.
- El campo es editable. El trader puede sobreescribir el valor directamente.
- Chips de proveedor (Binance, Matriz): muestran los precios disponibles. Click en un chip copia ese precio al campo FX Pantalla.
- **Requerido para validar el formulario:** `isFormValid` incluye `!!fxPantalla`. Si el feed falla, aparece un toast de advertencia y el formulario queda bloqueado hasta que el trader ingrese un valor manual o seleccione un proveedor disponible.
- El FX Pantalla se envía al backend como `fx_pantalla` (valor del campo) y `fx_pantallas` (mapa proveedor → precio).

**Rate:**
- Campo de carga manual por el trader. El precio al que Ardua opera con el cliente.
- Dispara el cálculo del Monto a entregar.

---

## Capacidades en producción

> Por completar cuando se obtenga acceso a TRD QA para relevar el estado real del listado, filtros, estados y ciclo de vida completo del quote. Ver `trd-quotes-discovery.md`.

---

## Control de desvío de Rate (PWI-74 — IN ANALYSIS)

Extensión incorporada por PWI-74. Agrega sobre el formulario existente el control de desvío y el refresh automático del FX Pantalla.

### Comportamiento

Al abandonar el campo Rate (on blur), el sistema compara el valor ingresado contra el FX Pantalla disponible en ese momento. Si el desvío supera el 3% en cualquier dirección, el sistema muestra una alerta que requiere confirmación explícita del trader para proceder. La operación no se bloquea si el trader confirma.

Si el campo FX Pantalla está vacío o el feed no está disponible para el par seleccionado, el sistema informa al usuario y permite continuar sin el control.

### Refresh automático del FX Pantalla

El precio de referencia se refresca automáticamente cada 5 segundos mientras el formulario esté abierto. Cada chip muestra su propia barra de progreso con el tiempo restante hasta el próximo refresh. La frecuencia es fija en v1.

El control de desvío evalúa on blur contra el valor que esté en el campo FX Pantalla en ese momento — no se re-evalúa cuando el precio se refresca automáticamente.

### Estados del formulario

| Estado | Descripción | Cambios visuales |
|---|---|---|
| 1 — Sin desvío | Rate dentro del rango ±3% | Sin alerta. CTA verde normal ("Crear quote"). |
| 2 — Rate desviado | Desvío supera el ±3% | Alerta ámbar inline. Borde ámbar en Rate, bloque FX y Monto a entregar. CTA ámbar ("Crear quote con desvío" + `ti-alert-triangle`). |
| 3 — Confirmación | Trader clickeó CTA con desvío activo | Modal con overlay oscuro y tabla resumen (Par, Tipo, FX referencia, Rango aceptable, Rate con desvío en ámbar, Cliente). |
| 4 — Sin referencia | FX Pantalla vacío (feed no disponible) | Aviso ámbar dentro del bloque FX Pantalla. Campo visible y editable (vacío). Rate y CTA en estado normal. |

### Wording

| Elemento | Texto |
|---|---|
| Alerta inline | "Rate [X] supera el rango aceptable de ±3% en [Y]%" |
| CTA con desvío | "Crear quote con desvío" + icono `ti-alert-triangle` |
| Modal — título | "Confirmar Quote con Rate fuera del rango" |
| Modal — descripción | "Revisá los datos antes de confirmar. El Rate supera el rango aceptable de mercado." |
| Modal — botón confirmar | "Confirmar quote" |
| Estado 4 — aviso | "Sin referencia disponible para este par. Podés ingresar un valor de referencia manualmente." |

### Decisiones de diseño validadas (Facundo Vasques)

| Decisión | Resolución | Fecha |
|---|---|---|
| El quote aprobado con desvío queda marcado con badge? | No. Se registra sin marca adicional. | 08/06/2026 |
| El modal requiere campo de justificación? | No. Solo confirmación explícita via CTA. | 08/06/2026 |
| Cuándo se dispara el control? | On blur. Al abandonar el campo Rate. No durante la escritura ni al hacer submit. | 08/06/2026 |
| El precio se re-evalúa cuando se refresca automáticamente? | No. Solo on blur. | 09/06/2026 |
| El campo FX Pantalla es editable? | Sí. Auto-poblado, sobreescribible, chips como atajos. | 10/06/2026 |
| El rango aceptable se muestra siempre en el bloque FX? | No. Solo en estados 2 y 3 (desvío activo). | 10/06/2026 |

**Wireframe de referencia:** `discoveries/wireframe_PWI-74.html`

---

## Requerimientos activos

| REQ | Descripción | Estado |
|---|---|---|
| PWI-74 | Control de desvío de TC en Quotes y Proveedores de Liquidez | IN ANALYSIS |
| REQ-92 | Registro de TC del Agrupador en el detalle del trade — bloque "Contraparte" con TC agrupador, selector y spread automático | SENT TO DEV |

---

## Fuera de alcance (v1 — PWI-74)

- Configuración del umbral de desvío desde la interfaz (3% fijo en v1)
- Configuración de la frecuencia de refresh del FX Pantalla (5 segundos fijo en v1)
- Registro histórico de controles activados o ignorados por el trader
- Control sobre quotes ya registrados (aplica solo en el momento de la carga)
- Badge o marcador en el listado de quotes aprobados con desvío
- Campo de justificación en el modal de confirmación
- Extensión del control a otros módulos de TRD (Bots, RFQ)
