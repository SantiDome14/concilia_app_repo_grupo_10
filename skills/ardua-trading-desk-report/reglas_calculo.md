# Reglas de Cálculo · Mesa de Dinero

Todas las fórmulas que el SKILL aplica al procesar un cierre. Consultar antes de calcular cualquier KPI.

---

## 1. Clasificación de operaciones

Por cada fila del CSV/Excel del TRD:

| Si... | Clase |
|---|---|
| `tipo == 'Cliente'` | **cliente** |
| `nombre in ('BINANCE', 'BITSO')` | **prop** (independiente del tipo) |
| `tipo == 'Proveedor'` y `nombre not in ('BINANCE', 'BITSO')` | **proveedor** |

---

## 2. FIFO Mesa ARS — Revenue principal

Todas las ops con par terminado en `/ARS` entran a un **único pool FIFO sobre cantidades ARS** (no USD ni cripto):

- Pares incluidos: `USDT/ARS`, `USDC/ARS`, `USD/ARS`, `BTC/ARS`
- El **arrastre del día anterior** (de Estado Operativo en Notion) entra como posición inicial
- **TODAS las ops /ARS entran al MISMO pool**, sin importar la clase: clientes, prop (BINANCE/BITSO) y proveedores. Los proveedores son la contraparte natural de los BUYs de cliente — sin ellos en el pool, las ops cliente no se matchean y el Flat queda en miles de millones. El "Costo 3bps" sobre proveedores USD/ARS es un costo **adicional** al PnL del pool, no un reemplazo.
- Las ops cliente BTC/ARS entran al pool al **TC cliente cotizado** (no al TC pantalla — ver sección 7)

### Convención de side por op

| Type | Side |
|---|---|
| BUY | `SHORT_ARS` (mesa entrega ARS) |
| SELL | `LONG_ARS` (mesa recibe ARS) |

### Cómo funciona el matching FIFO

Cada vez que entra una op nueva, se matchea contra capas de side opuesto del pool, en orden de llegada (FIFO sobre cantidades ARS). Lo que queda sin matchear forma capa nueva.

### PnL por op matcheada (en USD)

```
PnL_USD = ars_matched × (1 / tc_compra − 1 / tc_venta)
```

Donde `tc_compra` es el TC de la capa SHORT_ARS (mesa entregó ARS y compró USD), y `tc_venta` es el TC de la capa LONG_ARS (mesa recibió ARS y vendió USD). El matcheo siempre es un SHORT_ARS contra un LONG_ARS.

**Validación de signo:** cuando `tc_venta > tc_compra` (mesa vendió USD más caro de lo que lo compró), el PnL debe dar **positivo**. Con la fórmula correcta `(1/tc_compra − 1/tc_venta)`: si `tc_venta > tc_compra` ⇒ `1/tc_venta < 1/tc_compra` ⇒ PnL positivo ✓.

### Separación Cli ARG vs Prop

El SKILL corre el FIFO **dos veces** (en ambas corre el pool completo de capas, lo único que cambia es qué ops nuevas se incluyen):

1. Con **todas las ops /ARS (clientes + prop + proveedores) + arrastre** → **Revenue Mesa ARS total**
2. Con **ops /ARS excluyendo prop (clientes + proveedores) + arrastre** → **Revenue Cli ARG**
3. **Revenue Prop Trading** = (1) − (2)

En ambas corridas, los proveedores forman parte del pool. El arrastre y el TC FIFO al cierre se toman del **Run 1** (el pool completo), no del Run 2.

---

## 3. Costo proveedores (3bps)

```
Costo_3bps = Σ (volumen_USD de ops proveedor con par USD/ARS) × 0.0003
```

**Reglas estrictas:**
- Aplica SOLO sobre ops de **proveedores** (`tipo == 'Proveedor'`)
- Aplica SOLO si el **par == 'USD/ARS'**
- Pares excluidos: `USDT/ARS`, `USDC/ARS`, `EUR/USDC`, `EURC/USDC`, `USDC/PEN`, `BTC/USDT`, `USDT/BRL`
- La regla es por **PAR operado**, no por nombre del proveedor

**Validar contra DB Proveedores en Notion:** cada row tiene `Aplica 3bps` (checkbox) y `Pares operados` (multi-select). Usar esto como referencia, pero el filtro final es por el `par` de cada op individual.

---

## 4. Volumen operado (en USD)

| Par | Fórmula |
|---|---|
| `USDT/ARS`, `USDC/ARS`, `USD/ARS` | `monto crypto` directo |
| `BTC/ARS` (cliente) | `fiat / TC_cliente_cotizado` (NO el TC pantalla) |
| `EUR/USDC`, `EURC/USDC` | `monto crypto × tc` |
| `USDC/PEN` | `monto crypto` (qty USDC directa) |
| `USDT/BRL` | `monto crypto` (qty USDT directa) |
| `BTC/USDT` (cobertura Bitget) | **NO computa al volumen del día** |

### KPI "Volumen Clientes" del reporte

Consolida **TODO**: Cli ARG + FX Otros + Prop Trading. El ROI se calcula sobre este total:

```
ROI = Revenue Total / Volumen Total
```

---

## 5. Operaciones FX (EUR/USDC, EURC/USDC, USDC/PEN)

### Convención de side (INDEPENDIENTE del campo `Type` del CSV)

- **Cliente** → mesa SHORT moneda extranjera (entrega EUR/PEN al cliente, cobra USDC)
- **Proveedor** (CIRCLE, CONVERA, VELAFI, etc.) → mesa LONG moneda extranjera (compra al proveedor)

### Spread (revenue del trade pasante)

```
Spread = (tc_cliente − tc_proveedor) × qty_calzada
```

Si cliente BUY EUR + proveedor SELL EUR, la fórmula se invierte: `(tc_proveedor − tc_cliente) × qty`.

### Detección de trade pasante

Si hay 2 legs (cliente + proveedor) con misma `qty` y casi mismo timing, es trade pasante. La mesa solo se queda con el spread, no abre posición.

**El SKILL siempre debe preguntar al usuario** si las ops FX son pasantes cuando aparezcan. No asumir.

### Nerghis SRL (caso especial)

Si el cliente es Nerghis, "siempre cuenta como ganancia". El usuario debe indicar **explícitamente** cuándo aplica. EUR/USDC ≠ Nerghis automático.

---

## 6. Operaciones BTC del cliente con cobertura/scalping

**Modelo conceptual:** la mesa cotiza al cliente un único precio `pantalla_BTC_ARS` que incluye spreads (sobre TC USD/ARS y sobre precio BTC USD). Después hedgea por separado:
- **Leg ARS** → con proveedores USD/ARS (entra al FIFO Mesa ARS al TC cliente cotizado)
- **Leg cripto** → en exchange (Bitget, etc.) con scalping si corresponde

### Inputs que pedir al usuario

1. **TC USD/ARS cotizado al cliente** (ej: 1.460)
2. **TC USD/ARS pantalla del momento** (ej: 1.478) — si no lo provee, calcularlo desde los datos
3. **Spreads marcados al cliente** (ej: 1% TC + 1% BTC)
4. **Comisiones del exchange** (ej: 181,48 USDT en Bitget)

### Cómo entra al cierre

**FIFO Mesa ARS:** la op cliente BTC/ARS entra al pool con:
- `qty fiat = ARS de la op` (ej: 200M)
- `tc = TC cliente cotizado` (ej: 1.460)
- side = `SHORT_ARS` si cliente SELL (mesa entrega ARS)

**Volumen del día:** se computa al TC cliente cotizado:

```
Vol_op_BTC = ARS / TC_cliente
```

**Ajuste leg cripto** (se SUMA al Revenue Cli ARG):

```
Ajuste_cripto = Net_USDT_neto_exchange − (ARS / TC_cliente)
```

Donde `Net_USDT_neto_exchange` es lo recibido en USDT en el exchange después de comisiones.

**Las ops del exchange (BITGET BUY/SELL) NO entran al FIFO Mesa ARS y NO cuentan como proveedor.**

### Ganancia REAL de la operatoria (análisis interno, NO al HTML)

```
Vol_al_pantalla = ARS / TC_pantalla
Ganancia_real_total = Net_USDT_exchange − Vol_al_pantalla
% sobre vol = Ganancia / Vol_al_pantalla
```

**Descomposición opcional:**
- Spread cliente (combinado TC + cripto) ≈ Vol × spread%
- Scalping puro = Ganancia total − Escenario base sin scalping
- Escenario base = hedgear todo en 1 op al precio del momento

**Importante:** la ganancia REAL se mide al TC pantalla (no al TC cliente), porque ese es el TC al que la mesa "realmente" puede convertir esos ARS en USD.

---

## 7. Exposición y TC FIFO al cierre

Al cerrar el día, el pool FIFO tiene una o más capas residuales (lo que no se matcheó).

- **Flat neto ARS** = qty residual total. Positivo si LONG_ARS, negativo si SHORT_ARS.
- **TC FIFO** = promedio ponderado por qty de los TC de las capas residuales:

```
TC_FIFO = Σ(qty_capa × tc_capa) / Σ(qty_capa)
```

- **Exposición USD** = `|flat_ARS| / TC_FIFO`
- **Factor riesgo** = `|flat_ARS| / TC_cierre²` (cuánto P&L cambia por cada 1 ARS de variación del TC cierre)
- **P&L si cerrás al TC cierre** = `flat_ARS × (1/TC_cierre − 1/TC_FIFO)`

**TC cierre lo carga el usuario manualmente** (input editable en el HTML).

---

## 8. Performance / volatilidad

- **Trades** del día: cuenta SOLO **ops cliente** (no proveedores ni prop)
- **σ (volatilidad TC)** y **rango TC**:
  - SOLO ops cliente ARS
  - **Excluir BTC/ARS** (precios muy distintos al resto, distorsionan)
  - **Excluir outliers > 3σ** del promedio del día
  - Si se excluyó algún outlier: registrar en el campo `Eventos` de Cierres Diarios

- **Top 2 proveedores**: ranking por volumen USD operado del día

---

## 9. Métricas FIFO Ideal (M1 y M2)

Sobre ops cliente Mesa ARS, **cada op AISLADA** (sin FIFO, sin proveedores, sin prop):

```
PnL escenario por op (USD):
  BUY:  qty × (tc_escenario − tc_operado) / tc_escenario
  SELL: qty × (tc_operado − tc_escenario) / tc_operado
```

Donde `qty` es el volumen USD de la op.

### M1 (vs pantalla — FIJO)

```
M1 = Revenue Cli ARG real − Σ pnl_escenario(tc_escenario = pantalla de cada op)
```

Mide cuánto la mesa ganó/perdió **más allá del spread visible**. M1 positivo = la mesa hizo mejor que la pantalla. M1 negativo = la pantalla habría rendido más.

### M2 (vs TC cierre — DINÁMICO)

```
M2 = Revenue Cli ARG real − Σ pnl_escenario(tc_escenario = TC cierre del día)
```

Mide cuánto la mesa ganó/perdió comparado con un escenario donde todas las ops se cerraran exactamente al TC del cierre del día.

En el HTML, M2 es **dinámico**: el JS lo recalcula al cambiar el TC Cierre del input editable. M1 es fijo (el TC pantalla viene del CSV de cada op).

### Para op BTC del cliente

Se incluye en M1/M2 con:
- `qty USD eq = ARS / TC_cliente`
- `tc_operado = TC_cliente`
- `pantalla = TC_pantalla`

### Acumulado semanal/mensual

Suma simple del M1 y M2 de cada día. **No se recalcula M2 a un TC único** — cada día usa su propio TC cierre.

---

## 10. Cartera de Inversión (PnL no realizado)

### Para cada activo activo en Cartera Vigente

Leer de Notion: `Ticker`, `Cantidad`, `Costo USD` (total), `Costo Unit Local`, `Metodo Valuacion`, `URL Referencia` (referencia visual para el operador, no se consume).

El precio de cierre **lo provee el operador** en el paso 2 del flujo (ver `cotizaciones.md`), no se busca en la web ni se infiere del cierre anterior.

### Fórmulas según Metodo Valuacion

| Método | Cálculo |
|---|---|
| `cripto_usd` | `valor_USD = qty × precio_USD` |
| `bono_ars_tc` | `valor_USD = qty × precio_ARS / TC_cierre` |
| `cedear_ars_tc` | `valor_USD = qty × precio_ARS / TC_cierre` |
| `accion_usd` | `valor_USD = qty × precio_USD` |
| `fci_usd` | `valor_USD = qty × valor_cuotaparte_USD` |
| `manual` | Pedir al usuario el valor USD directo |

### PnL no realizado por activo

```
PnL_USD = valor_USD − Costo_USD
PnL_% = PnL_USD / Costo_USD
```

### Realizado de cartera del día

UNA SOLA LÍNEA en el reporte: **"Revenue cartera de inversión: ±USD X"**. Incluye:
- Ventas/compras de activos (P&L realizado)
- FCI (rendimiento)
- Intereses
- Dividendos

Se SUMA al revenue mesa neto para el "Total del día" del KPI principal.

---

## 11. Convenciones generales

- Todos los KPIs finales en USD
- Formato números (display): `1.234.567,89` (estilo argentino)
- Variaciones: ▲ verde si sube, ▼ rojo si baja, vs día hábil anterior
- Fin de semana no se opera; el lunes compara con el viernes
- Cierres `21/04` a `24/04/2026` son placeholders — no usar para validar fórmulas

---

## 12. Reglas de redondeo y precisión

- Cálculos internos: precisión completa de float (Python default)
- Display en HTML/chat: 0 decimales para USD, 2 decimales para ROI%, 2 decimales para σ y TC
- TC cierre: hasta 2 decimales (input del user)
- PnL %: 2 decimales

---

## 13. Orden de cálculo recomendado

Para no enredarse, calcular en este orden:

1. Clasificar ops (cliente / prop / proveedor / cobertura)
2. Identificar pares y armar volumen USD por op
3. Procesar ops FX → spread del día
4. Procesar ops cobertura BTC del cliente → ajuste cripto + datos para FIFO
5. Armar pool FIFO con todas las /ARS + arrastre → Revenue total
6. Re-correr FIFO sin prop → Revenue Cli ARG
7. Revenue Prop = Total − Cli ARG
8. Sumar spread FX y ajuste cripto al Revenue Cli ARG
9. Costo 3bps sobre proveedores USD/ARS
10. Revenue mesa neto = Cli ARG + Prop + FX − 3bps
11. Total del día = Revenue mesa neto + Realizado Cartera
12. Volumen Total = Cli ARG + FX + Prop
13. ROI = Revenue Total / Volumen Total
14. M1 y M2 (sobre ops cliente ARS)
15. Expo, TC FIFO, P&L si cierra (sobre capas residuales)
16. Performance (trades, σ, rango, top prov)
17. Cartera (precios de cierre provistos por el operador + PnL no realizado)
18. Variaciones vs día hábil anterior
