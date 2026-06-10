---
name: TRD — Control de desvio de TC en Quotes y Proveedores de Liquidez
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-05
updated_at: 2026-06-10
propagates_to:
  - features/trd/trd-quotes.md
  - features/trd/trd-proveedores-de-liquidez.md
---

# TRD — Controles de TC en carga de trades

## Objetivo

Documentar la infraestructura de datos de mercado disponible en TRD y validar el scope técnico-funcional del control de sanidad del TC para los módulos Quotes y Proveedores de Liquidez, como base para el enriquecimiento de PWI-74.

## Contexto

**Requerimiento asociado:** PWI-74 — Al cargar trades en Quotes y Proveedores de Liquidez, no existe un control que compare el TC ingresado contra el precio de mercado.

### Terminologia clave

- **Rate (Quotes):** el precio al que Ardua le vende o compra al cliente. Es el campo que el trader carga en el formulario de creacion de quotes.
- **TC (Proveedores de Liquidez):** el precio de mercado al que Ardua se hace de liquidez — lo que Ardua le paga al proveedor. Es el campo que el trader carga en el formulario de Proveedores de Liquidez.
- **FX Pantalla:** precio de referencia de mercado obtenido en tiempo real desde los proveedores (Binance, Matriz). No es un precio operativo — es la referencia contra la cual se valida el Rate en Quotes y el TC en Proveedores.

El ticket solicita:
- En Quotes: agregar la alerta de desvío (el FX Pantalla ya existe en el módulo)
- En Proveedores: incorporar el FX Pantalla automático + agregar la misma alerta
- Para pares cripto/ARS (BTC/ARS, ETH/ARS, etc.): calcular el precio de referencia como cross: BTC/ARS = BTC/USDT × USD/ARS
- Si el desvío supera el 3% en cualquier dirección: mostrar una alerta que requiera confirmación explícita del trader para proceder

El discovery se abre para entender cómo TRD recibe datos de mercado hoy, antes de definir el alcance funcional final del PWI.

---

## Hallazgos del código — inspección de `core-trd-frontend`

### 1. WebSocket — canal de notificación, no de streaming de precios

`src/hooks/useWebSocket.ts` establece una conexión a `VITE_WS_URL?auth0_id=...&module=trd`.

El WebSocket **no transporta precios de mercado**. Emite únicamente un mensaje de refresh:

```
{ message: 'refresh' }  // o simplemente la string 'refresh'
```

Al recibirlo, el hook dispara el evento DOM `ws-refresh` en `window`. `HistoryQuotes.tsx` escucha ese evento y llama `refetch()`, que re-ejecuta `quotesApi.getQuotes()` vía REST. El mecanismo completo es:

```
Backend → WebSocket → evento ws-refresh → re-fetch REST de quotes
```

El WebSocket es un trigger de polling, no un canal de datos en tiempo real. La reconexión es automática con backoff exponencial (1 s → 2 s → 4 s... máx 30 s).

### 2. Endpoint de precios de mercado — REST on-demand

El único mecanismo actual para obtener precios de mercado es:

```
GET /fx-rate?pair_id={id}
```

Response:

```
MarketPricesResponse {
  pair_id: string
  base_currency_code: string
  quote_currency_code: string
  providers: ProviderPrice[]
}

ProviderPrice {
  provider: string      // nombre del proveedor
  symbol: string | null
  price: string | null  // precio disponible, o null si no hay
  available: boolean
  error?: string        // razón si !available
}
```

La llamada se hace **on-demand** al seleccionar un par en el formulario de Quotes. No hay polling periódico ni streaming.

### 3. Proveedor "matriz" — fuente principal de auto-fill

El único proveedor nombrado explícitamente en el código frontend es **"matriz"**. Su comportamiento:

| Par | Comportamiento |
|---|---|
| USDC/ARS | Auto-popula el campo FX Pantalla con el precio de "matriz" si está disponible |
| USDT/ARS | Ídem |
| Cualquier otro par | Retorna error — "matriz" no tiene precio para ese par |

Los mensajes de error mapeados en el frontend para el proveedor "matriz":

| Error del backend | Texto mostrado |
|---|---|
| `'no crypto in pair'` | Sin cripto |
| `'matriz only supports USDARS'` | Solo USDARS |
| `'upstream error'` | No disponible |
| `'price unavailable'` | Sin precio |

Pueden existir otros proveedores en el array `providers` — sus nombres y cobertura de pares vienen del backend. **No están documentados en el frontend.**

### 4. Estado actual en Quotes — FX Pantalla requerido, sin control de desvío

En `QuoteForm.tsx`:

- El FX Pantalla se carga on-demand desde `/fx-rate` al seleccionar par + cliente
- El campo tiene un control manual editable ("Fx pantalla manual")
- El valor es **requerido** para crear el quote: `isFormValid` incluye `!!fxPantalla`
- Si el feed falla → toast de advertencia, campo vacío, form bloqueado hasta entrada manual o selección de proveedor disponible
- El FX Pantalla se envía al backend en `fx_pantalla` y `fx_pantallas` (mapa proveedor → precio)

**No existe ninguna comparación entre `exchangeRate` y `fxPantalla` en el frontend.** La alerta de desvío del 3% no está implementada.

### 5. Estado actual en Proveedores de Liquidez — sin FX Pantalla

En `LiquidityForm.tsx`:

- El TC (`exchange_rate`) es un campo numérico de carga libre sin referencia alguna
- No hay ninguna llamada a `/fx-rate`
- No hay integración con el WebSocket
- No hay validación de desvío

### 6. Pares cripto/ARS — sin precio directo disponible

El proveedor "matriz" retorna error `'no crypto in pair'` para pares como BTC/ARS o ETH/ARS, confirmando que no hay precio directo para esos pares en la fuente actual. La fórmula de cross especificada en PWI-74 (BTC/ARS = BTC/USDT × USD/ARS) es el mecanismo correcto para derivar el precio de referencia.

---

## Decisiones de diseño resueltas

### C3 — Comportamiento cuando el FX de referencia no está disponible

**Decisión (Facundo Vasques, 2026-06-05):** si al momento de cargar el trade el sistema no puede obtener el precio de referencia (feed caido, par sin cobertura, o par exotico sin cross disponible), el sistema **informa al usuario** que no hay valores con que comparar y permite continuar sin la validacion. **La carga nunca se bloquea por ausencia de referencia.**

Esta decision aplica tanto a Quotes como a Proveedores de Liquidez.

### C4 — Trigger del control de desvio

**Decision (2026-06-09):** el control se dispara **on blur**, es decir, cuando el trader abandona el campo TC (al pasar al campo siguiente o hacer click fuera). No se dispara durante la escritura ni al hacer submit. Esta decision evita alertas prematuras mientras el trader tipea y concentra el control en el momento en que el valor esta completo.

### C5 — Umbral del 3% para pares cripto/ARS

**Decision (Facundo Vasques, 2026-06-08):** el umbral del 3% aplica de forma uniforme a todos los pares en v1, incluyendo cripto/ARS. La mayor volatilidad intradiaria de cripto es conocida y aceptada. Si el control se dispara con frecuencia en esos pares, se revisara el umbral en una iteracion futura.

### C6 — Refresh automatico del FX Pantalla y barra de progreso

**Decision (2026-06-09):** el precio de referencia se refresca automaticamente cada 5 segundos en ambos modulos (Quotes y Proveedores) mientras el formulario esta abierto. Se muestra mediante chips de proveedor con una barra de progreso unica que indica el tiempo restante hasta el proximo refresh. El timestamp fue descartado — la barra de progreso cubre la necesidad de visibilidad sobre la frescura del dato sin requerir una marca de tiempo estatica. La frecuencia de 5 segundos es fija en v1.

### C7 — Objetivo del control: errores de tipeo, no proteccion de margen

**Decision (Facundo Vasques, 2026-06-08):** el control apunta a prevenir **errores de tipeo** (cero de mas, inversion del par, decimal corrido), no a proteger el margen de la operacion. Por eso el umbral es simetrico en ambas direcciones y no distingue entre BUY y SELL. La proteccion de margen es un problema distinto que requiere cruzar TC de Quotes con TC de Proveedores, lo cual esta fuera de alcance.

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

## Preguntas abiertas

| # | Pregunta | Por que importa | Estado |
|---|---|---|---|
| P-01 | Que proveedores (ademas de "matriz") devuelve el endpoint `/fx-rate` y que pares cubre cada uno? | Define si hay cobertura nativa para pares como USD/ARS, BTC/USDT, ETH/USDT, o si el cross-rate necesita componentes de pares adicionales | Abierta — confirmar en refinement con Tecnologia |
| P-02 | El endpoint `/fx-rate` soporta BTC/USDT y USD/ARS como pares independientes? | Necesario para computar el cross BTC/ARS = BTC/USDT x USD/ARS | **Abierta con evidencia actualizada.** Verificacion en QA indicaba "No disponible" para BTC/ARS — confirmado como problema de ambiente QA, no de cobertura real. Binance tiene BTC/ARS disponible en produccion. Scope de v1 confirmado. Confirmar en refinement si el endpoint devuelve el par directo o requiere implementar el cross BTC/USDT x USD/ARS. |
| P-03 | El control de desvio se computa en el frontend o en el backend? | Determina donde vive la logica de comparacion | **Cerrada.** Inspeccion de `QuoteForm.tsx` confirma que la comparacion es local en el frontend: `exchangeRate` vs `fxPantalla` (state). No hay flag de alerta en la respuesta del backend. |
| P-04 | El FX Pantalla se refresca mientras el formulario esta abierto, o es un fetch puntual que puede volverse stale? | Si el trader deja el formulario abierto varios minutos, el precio de referencia puede ser viejo. Impacta la confiabilidad del control. | **Cerrada (2026-06-09):** se adopta polling de 5 segundos con barra de progreso unica. El precio se refresca automaticamente en ambos modulos mientras el formulario esta abierto. El control de desvio evalua on blur contra el precio disponible en ese momento — sin re-evaluacion automatica cuando el precio se refresca (ver C6). |

P-01, P-02 y P-04 se cierran en refinement tecnico con Tecnologia.

---

## Relación con otros discoveries y requerimientos activos

- **`trd-quotes-discovery.md`** — discovery del módulo Quotes (En investigación). El ciclo de vida del quote y el estado del formulario de creación deben documentarse allí; este discovery aporta el contexto de infraestructura de precios que Quotes ya usa.
- **`trd-proveedores-de-liquidez-discovery.md`** — discovery concluido del módulo Proveedores. El feature file `features/trd/trd-proveedores-de-liquidez.md` refleja el estado actual; la extensión con FX Pantalla y control de TC se propagará al mismo archivo al concluir este discovery.
- **PWI-74** — requerimiento origen. El enriquecimiento del PWI puede avanzar sobre la base de los hallazgos actuales; las P-01 a P-03 se cierran en refinement técnico con Tecnología.
