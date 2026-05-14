# Cotizaciones de Cierre · Mesa de Dinero

Cómo obtener el precio de cierre de cada activo de Cartera Vigente para valuar al final del día.

---

## Principio

**Las cotizaciones las provee el operador, no se buscan en la web.**

Las fuentes públicas que históricamente se consultaron (IOL, Binance API, agregadores) son inestables: bloquean IPs / bots, devuelven datos stale, cambian el DOM sin aviso, o exigen sesión logueada para el precio que la mesa realmente usa al cierre. Pedirle el precio al operador es **mucho más confiable** y además respeta el principio de "mejor preguntar 1 cosa más que procesar mal" del SKILL.

El campo **`URL Referencia`** que vive en la DB Cartera Vigente de Notion es exactamente eso — una referencia para que el operador la abra y lea el precio. **El SKILL no la consume.** Se mantiene en la DB por si en el futuro aparece una fuente automática confiable y se quiere reactivar el fetch.

---

## Lo único que el SKILL necesita saber sobre cada activo

| Campo en Cartera Vigente | Para qué lo usa el SKILL |
|---|---|
| `Ticker` | Identificar el activo en el prompt al operador y en el HTML |
| `Cantidad` | Multiplicar por el precio ingresado |
| `Costo USD` | Calcular PnL no realizado |
| `Metodo Valuacion` | Saber **en qué moneda** pedir el precio y **cómo valuar** |
| `Activa` | Filtrar activos vigentes (solo `true`) |
| `URL Referencia` | **No la lee.** Solo se la muestra al operador como atajo opcional. |

---

## Moneda esperada por método de valuación

Esto es **lo crítico** al pedirle el precio al operador — la mitad de los errores históricos vinieron de pedir un precio en la moneda equivocada.

| Método | Moneda del precio | Fórmula de valuación |
|---|---|---|
| `cripto_usd` | USD | `valor_USD = qty × precio_USD` |
| `bono_ars_tc` | ARS (por VN) | `valor_USD = qty × precio_ARS / TC_cierre` |
| `cedear_ars_tc` | ARS | `valor_USD = qty × precio_ARS / TC_cierre` |
| `accion_usd` | USD | `valor_USD = qty × precio_USD` |
| `fci_usd` | USD (valor cuotaparte) | `valor_USD = qty × valor_cuotaparte_USD` |
| `manual` | USD directo | `valor_USD = lo que el operador ingrese` |

**Importante:** `bono_ars_tc` se pide en **ARS por valor nominal** (no en USD ni en porcentaje de paridad). Es el precio que figura en la pantalla del bono en IOL/Rava/Bolsar.

---

## Cómo pedir las cotizaciones al operador

Las cotizaciones se piden **en la misma tanda que el resto de inputs del paso 2 del flujo** (TC cierre, movimientos de cartera, info de proveedor desconocido, etc.). Una sola pregunta consolidada, una sola respuesta del operador.

**La tool `ask_user_input_v0` no sirve para esto** — solo admite opciones predefinidas, no acepta valores numéricos libres. Se pide en **prosa con tabla**.

### Formato sugerido

```
Necesito los siguientes inputs para procesar el cierre del DD/MM/YYYY:

**TC cierre USD/ARS del día:** ?

**Cotizaciones de cierre de la cartera:**

| # | Ticker | Método        | Moneda esperada      | URL Referencia        | Precio |
|---|--------|---------------|----------------------|-----------------------|--------|
| 1 | BTC    | cripto_usd    | USD                  | binance.com/...       | ?      |
| 2 | ETH    | cripto_usd    | USD                  | binance.com/...       | ?      |
| 3 | AAVE   | cripto_usd    | USD                  | binance.com/...       | ?      |
| 4 | S15Y6  | bono_ars_tc   | ARS por VN           | iol.invertironline... | ?      |

**Movimientos de cartera del día:** ninguno / detallar...

(... resto de inputs según contexto del cierre ...)
```

**Notas sobre el formato:**

- Mostrar la URL Referencia (truncada si es muy larga) — es el atajo que el operador usa para abrir la fuente y copiar el precio.
- Aceptar formato argentino (`1.234,56`) **y** formato internacional (`1234.56`) en la respuesta. Parsear ambos.
- Si el operador ya ingresó el precio en un mensaje anterior, no re-preguntar; tomarlo de ahí.

### Validación post-respuesta

Antes de calcular cualquier cosa, verificar que se recibió:

- Un precio numérico **por cada activo activo** de Cartera Vigente
- El precio está en un orden de magnitud razonable (heurísticas):
  - Cripto mayor (BTC): USD 10.000 – 200.000
  - Cripto altcoin (ETH, AAVE): USD 50 – 10.000
  - Bono LECAP / LELIQ: ARS 1.000 – 200.000 por VN
  - Si algo cae muy fuera → re-confirmar con el operador antes de seguir

Si **falta** algún precio o el operador escribe "no sé" / "no lo tengo": **escalar**, no inventar ni usar el precio del cierre anterior sin permiso explícito. Esto está alineado con la sección "Cuándo escalar al usuario" de SKILL.md.

---

## Inputs editables en el HTML

Esto **no cambia** respecto al flujo anterior: todos los precios que el operador ingresó se inyectan como `<input type="number">` editables en el HTML del reporte. Permite:

- Corregir un precio si el operador se equivocó al tipearlo
- Ver cómo cambia el PnL no realizado al variar el precio
- Refrescar precios manualmente si la cotización cambió entre la generación del HTML y el envío del reporte

El JS del template recalcula el PnL no realizado en vivo al editar cualquier precio. El TC Cierre también es input editable y refresca todos los cálculos dependientes (M2, expo USD, P&L si cierra, valuación de bonos ARS).

---

## Activos vigentes (snapshot 13/05/2026)

Para referencia rápida. **La fuente de verdad es Notion (Cartera Vigente).**

| Ticker | Método      | Moneda esperada | URL Referencia                                                                 |
|--------|-------------|-----------------|--------------------------------------------------------------------------------|
| BTC    | cripto_usd  | USD             | `https://www.binance.com/en/trade/BTC_USDT`                                    |
| ETH    | cripto_usd  | USD             | `https://www.binance.com/en/trade/ETH_USDT`                                    |
| AAVE   | cripto_usd  | USD             | `https://www.binance.com/en/trade/AAVE_USDT`                                   |
| S15Y6  | bono_ars_tc | ARS por VN      | `https://iol.invertironline.com/titulo/cotizacion/BCBA/S15Y6/`                 |

Estas URLs son las que se le muestran al operador en el prompt. Si en algún momento se incorpora una fuente automática confiable (API privada con login, terminal Bloomberg, etc.), se reactivará el fetch sin tocar el resto del SKILL.

---

## Cuando incorpores un activo nuevo

Pedirle al operador al momento de la compra:

1. Ticker
2. Tipo Activo (Cripto / Bono / CEDEAR / FCI / Acción)
3. Cantidad
4. Costo USD total
5. Costo Unit Local + moneda (USD / ARS)
6. **URL Referencia** pública (donde el operador irá a leer el precio cada día — IOL, Binance UI, Yahoo Finance, lo que sea)
7. **Método de valuación** (de la lista soportada — define moneda del precio y fórmula)
8. Fecha de ingreso

Crear el row en Cartera Vigente con `Activa = true` y agregar entrada al Changelog.
