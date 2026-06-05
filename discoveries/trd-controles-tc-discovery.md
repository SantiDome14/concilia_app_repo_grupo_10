---
name: TRD — Controles de TC en carga de trades
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-05
updated_at: 2026-06-05
propagates_to:
  - features/trd/trd-quotes.md
  - features/trd/trd-proveedores-de-liquidez.md
---

# TRD — Controles de TC en carga de trades

## Objetivo

Documentar la infraestructura de datos de mercado disponible en TRD y validar el scope técnico-funcional del control de sanidad del TC para los módulos Quotes y Proveedores de Liquidez, como base para el enriquecimiento de PWI-74.

## Contexto

**Requerimiento asociado:** PWI-74 — Al cargar trades en Quotes y Proveedores de Liquidez, no existe un control que compare el TC ingresado contra el precio de mercado.

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

**Decisión (Facundo Vasques, 2026-06-05):** si al momento de cargar el trade el sistema no puede obtener el precio de referencia (feed caído, par sin cobertura, o par exótico sin cross disponible), el sistema **informa al usuario** que no hay valores con qué comparar y permite continuar sin la validación. **La carga nunca se bloquea por ausencia de referencia.**

Esta decisión aplica tanto a Quotes como a Proveedores de Liquidez.

---

## Preguntas abiertas

| # | Pregunta | Por qué importa |
|---|---|---|
| P-01 | ¿Qué proveedores (además de "matriz") devuelve el endpoint `/fx-rate` y qué pares cubre cada uno? | Define si hay cobertura nativa para pares como USD/ARS, BTC/USDT, ETH/USDT, o si el cross-rate necesita componentes de pares adicionales |
| P-02 | ¿El endpoint `/fx-rate` soporta BTC/USDT y USD/ARS como pares independientes? | Necesario para computar el cross BTC/ARS = BTC/USDT × USD/ARS |
| P-03 | ¿El control de desvío se computa en el frontend (comparación local previa al submit) o en el backend (respuesta del endpoint con flag de alerta)? | Determina si el enriquecimiento del PWI debe describir la lógica de comparación como capacidad del sistema visible al usuario, o si hay una dependencia de backend a documentar |

P-01 y P-02 requieren acceso al backend o coordinación con el área de Tecnología. P-03 es una decisión de diseño producto-tecnología que puede resolverse en refinement.

---

## Relación con otros discoveries y requerimientos activos

- **`trd-quotes-discovery.md`** — discovery del módulo Quotes (En investigación). El ciclo de vida del quote y el estado del formulario de creación deben documentarse allí; este discovery aporta el contexto de infraestructura de precios que Quotes ya usa.
- **`trd-proveedores-de-liquidez-discovery.md`** — discovery concluido del módulo Proveedores. El feature file `features/trd/trd-proveedores-de-liquidez.md` refleja el estado actual; la extensión con FX Pantalla y control de TC se propagará al mismo archivo al concluir este discovery.
- **PWI-74** — requerimiento origen. El enriquecimiento del PWI puede avanzar sobre la base de los hallazgos actuales; las P-01 a P-03 se cierran en refinement técnico con Tecnología.
