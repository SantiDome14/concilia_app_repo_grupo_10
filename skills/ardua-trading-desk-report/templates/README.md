# Templates · Spec de Renderizado

Los tres reportes HTML (diario, semanal, mensual) son **plantillas estáticas con tokens `[NOMBRE]`**. La skill las llena con find-and-replace de strings — no se renderizan con Jinja2 ni con ningún engine de plantillas. El HTML resultante es un archivo standalone que el operador abre en el navegador y exporta a PNG con el botón embebido (`html2canvas`).

Antes había un pipeline Jinja2 con filtros custom. **Ya no.** Si ves `{{ algo }}` en un HTML, es un bug — los tokens son `[ALGO]`.

---

## Paradigma de renderizado

### 1. Cargar el HTML como string

```python
with open('/path/to/skill/templates/reporte_diario.html') as f:
    html = f.read()
```

### 2. Reemplazar tokens

Hay dos tipos de tokens:

- **Tokens fijos** en `SCREAMING_CASE`: `[REVENUE_TOTAL]`, `[TC_CIERRE]`, `[FLAT_ARS_NUM]`. Se reemplazan literalmente con el valor formateado.
- **Guías visuales** en minúscula o frases: `[día anterior]`, `[mes]`, `[año]`, `[DÍA]`, `[Lun DD]`. También se reemplazan, son texto descriptivo (ej. `[día anterior]` → `viernes 09/05`).

```python
html = html.replace('[REVENUE_TOTAL]', fmt_arg(revenue_total))
html = html.replace('[TC_CIERRE]', f'{tc_cierre:.2f}')
html = html.replace('[día anterior]', dia_label)
# ... etc
```

Algunos tokens aparecen **dos veces** en el HTML diario (en KPIs y en una sección de detalle). `str.replace` sin `count` los reemplaza todos: eso es lo que querés.

### 3. Bloques repetidos (filas de tabla, posiciones)

Los HTMLs traen una fila/posición de ejemplo como plantilla, con un comentario tipo `<!-- Repetir para cada activo -->` o `<!-- Una fila por cada día -->`. La skill tiene que:

1. Extraer el bloque ejemplo (entre marcadores)
2. Duplicarlo tantas veces como datos haya
3. Reemplazar los tokens dentro de cada copia
4. Pegar el bloque resultante donde estaba el ejemplo

Bloques repetibles por template:

| Template | Bloque | Marca |
|---|---|---|
| Diario | Posiciones de cartera | `<div class="pos-row">…</div>` (uno por activo de Cartera Vigente) |
| Semanal | Filas tabla "Detalle Diario" | `<tr>…</tr>` (una por día Lun–Vie) |
| Semanal | Eventos destacados | `<div class="evento-item">…</div>` |
| Semanal | Filas tabla "Comparativa" | `<tr>…</tr>` (2–3 semanas previas + actual) |
| Mensual | Filas tabla "Detalle Semanal" | `<tr>…</tr>` (una por semana del mes) |
| Mensual | Eventos destacados | `<div class="evento-item">…</div>` |
| Mensual | Filas tabla "Comparativa meses" | `<tr>…</tr>` (3–4 meses + actual) |
| Mensual | Filas tabla "Cartera al cierre" | `<tr>…</tr>` (una por activo) |

### 4. Diario: inyectar constantes JS

El reporte diario tiene un `<script>` con constantes que el JS embebido usa para recalcular en vivo cuando el operador toca el TC o un precio:

```js
const FLAT_ARS = [FLAT_ARS_NUM];
const TC_FIFO  = [TC_FIFO_NUM];
const SIDE     = '[LONG_ARS o SHORT_ARS]';
const REVENUE_REAL_M1 = [REV_CLI_ARG_NUM];

const CARTERA = [
  {name:'BTC',   qty: [QTY],   costUsd: [COSTO_USD], costUnitLocal: [COSTO_UNIT_LOCAL], currency: 'USD'},
  // ... una entrada por activo de Cartera Vigente
];

const OPS_CLIENTE_ARS = [
  {"t":"BUY","qty":[QTY],"tc":[TC],"pant":[FX_PANTALLA]},
  // ... una entrada por op cliente ARS del día
];
```

**Reglas para estas inyecciones**:

- Los `[..._NUM]` son **números crudos sin formatear** (`123456.78`, no `123.456,78`). El JS los parsea como `Number`.
- `FLAT_ARS`: positivo si LONG ARS, negativo si SHORT ARS. Es el flat firmado.
- `currency` en `CARTERA`: `'USD'` para activos con `Metodo Valuacion = cripto_usd` (qty × precio), `'ARS'` para `bono_ars_tc` u otros (qty × precio / TC_cierre).
- `costUnitLocal`: costo unitario promedio del activo en la moneda en que el operador ingresa el precio (la misma que `currency`).
- `OPS_CLIENTE_ARS`: **solo ops cliente ARS** del día (las que entran al FIFO Mesa ARS). NO incluir ops Bitget de cobertura, NO incluir prop, NO incluir FX.

### 5. Guardar a outputs

```python
filename = f'mesa-dinero-{dd:02d}-{mm:02d}-{yyyy}.html'                          # diario
filename = f'mesa-dinero-semanal-{ddlun:02d}-{ddvie:02d}-{mm:02d}-{yyyy}.html'  # semanal
filename = f'mesa-dinero-mensual-{mes_es}-{yyyy}.html'                           # mensual (mes_es: "abril", "mayo", ...)

with open(f'/mnt/user-data/outputs/{filename}', 'w') as f:
    f.write(html)
```

El nombre del PNG que descargará el operador desde el navegador queda hardcodeado en el `exportPNG()` del HTML — la skill debe reemplazar también esos placeholders ahí adentro.

---

## Formato de números (estilo argentino)

`1.234.567,89` — punto como separador de miles, coma como decimal. Helper:

```python
def fmt_arg(value, decimals=0):
    if value is None or value == '':
        return '—'
    try:
        num = float(value)
    except (ValueError, TypeError):
        return str(value)
    s = f"{num:,.{decimals}f}"
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')
```

Usar `decimals=0` por defecto. `decimals=2` para TC, precios de cartera, expo. `decimals=4` para factor riesgo.

**Importante**: el formateo argentino es para mostrar (los tokens `[REVENUE_TOTAL]`, `[VOL_TOTAL]`, etc.). Para los `[..._NUM]` del JS embebido — `[FLAT_ARS_NUM]`, `[TC_FIFO_NUM]`, `[REV_CLI_ARG_NUM]` y los `[QTY]`/`[COSTO_USD]`/`[TC]` adentro de `CARTERA` y `OPS_CLIENTE_ARS` — usar números crudos en formato JS (`123456.78`).

---

## Tokens por template

### Diario (`reporte_diario.html`)

**Header**: `[DD]`, `[MM]`, `[YYYY]`, `[DÍA]`, `[mes]`, `[año]`

**KPIs (sección 2)**: `[REVENUE_TOTAL]`, `[VOLUMEN_TOTAL]`, `[ROI]`, `[X]` (% variación), `[día hábil anterior]`, `[día anterior]`

**Operaciones del día (sección 3)**: `[VOL_CLI_ARG]`, `[VOL_FX]`, `[VOL_PROP]`, `[VOL_TOTAL]`, `[REV_CLI_ARG]`, `[REV_FX]`, `[REV_PROP]`, `[COSTO_3BPS]`, `[REVENUE_NETO]`

**Realizado cartera (sección 4)**: `[REALIZADO_CARTERA]`

**Performance (sección 5)**: `[N_TRADES]`, `[N_BUY]`, `[N_SELL]`, `[SIGMA]`, `[TC_MIN]`, `[TC_MAX]`, `[PROV_1]`, `[VOL_PROV_1]`, `[PROV_2]`, `[VOL_PROV_2]`

**Exposición FX (sección 6)**: `[FLAT_ARS]`, `[TC_FIFO]`, `[TC_PROM]`, `[TC_CIERRE]`, `[ARRASTRE_ARS]`, `[ARRASTRE_TC]`, `[LONG ARS / SHORT ARS]` (texto literal a reemplazar por uno de los dos)

**Métricas FIFO (sección 7)**: `[M1]`, `[M1_ABS]`, `[ESCENARIO_PANTALLA]` (M2 se recalcula en JS, no necesita token estático)

**Cartera (sección 8)** — por cada activo en la fila `pos-row` ejemplo:
- `[TICKER]` y `[ticker]` (este último en lowercase para los `id=` del input — ej. `btcPrice`, `ethPrice`)
- `[QTY]` (cantidad)
- `[PRECIO]` (precio actual)
- `[USD/ARS]` (texto literal: una u otra según `currency`)
- Y al final: `[COSTO_HISTORICO]`

**Footer**: `[DD/MM/YYYY]`

**Constantes JS**: ver sección 4 arriba.

**Filename PNG dentro del script `exportPNG()`**: reemplazar `[DD]`, `[MM]`, `[YYYY]` (aparece otra vez ahí).

---

### Semanal (`reporte_semanal.html`)

**Header**: `[Lun DD]`, `[Vie DD]`, `[mes]`, `[año]`, `[N]` (días operados)

**KPIs**: `[REVENUE_TOTAL_SEMANA]`, `[REV_DIA_PROMEDIO]`, `[VOL_TOTAL_SEMANA]`, `[VOL_DIA_PROMEDIO]`, `[ROI_SEMANA]`, `[N_TRADES_TOTAL]`, `[N_BUY]`, `[N_SELL]`

**Tabla Detalle Diario** (fila ejemplo) — duplicar por cada día Lun–Vie y luego una fila total:
- `Lun [DD/MM]` → reemplazar día y fecha
- `[REV]`, `[VOL]`, `[ROI]`, `[M1]`, `[M2]`, `[TC]` por día
- Fila TOTAL: `[REV_TOTAL]`, `[VOL_TOTAL]`, `[ROI_TOTAL]`, `[M1_ACUM]`, `[M2_ACUM]`

**Desglose Revenue Semanal**: `[REV_CLI_ARG_SEMANA]`, `[REV_PROP_SEMANA]`, `[REV_FX_SEMANA]`, `[COSTO_3BPS_SEMANA]`, `[REV_TOTAL_SEMANA]`, `[VOL_CLI_ARG_SEMANA]`, `[VOL_FX_SEMANA]`, `[VOL_PROP_SEMANA]`, `[VOL_TOTAL_SEMANA]`

**Performance Semanal**: `[DÍA]`, `[X]` (varios contextos: revenue, ROI, etc.), `[M1_ACUM]`, `[M2_ACUM]`, `[N]`

**Eventos destacados** — duplicar `evento-item` por cada evento: `[Día DD/MM]` + descripción

**Comparativa** (fila ejemplo) — duplicar por cada semana previa (2–3) más fila total con `[Semana actual]`

**Filename PNG dentro del script**: `[DDLun]`, `[DDVie]`, `[MM]`, `[YYYY]`

---

### Mensual (`reporte_mensual.html`)

**Header**: `[Mes]`, `[año]`, `[N]` (días operados)

**KPIs**: `[REVENUE_TOTAL_MES]`, `[REV_DIA_PROMEDIO]`, `[VOL_TOTAL_MES]`, `[VOL_DIA_PROMEDIO]`, `[ROI_MES]`, `[N_TRADES_TOTAL]`, `[N_BUY]`, `[N_SELL]`

**Tabla Detalle Semanal** — duplicar fila por cada semana del mes + fila total: `[REV_TOTAL]`, `[VOL_TOTAL]`, `[ROI]`, `[M1_ACUM]`, `[M2_ACUM]`

**Desglose Revenue Mensual**: `[REV_CLI_ARG_MES]`, `[REV_PROP_MES]`, `[REV_FX_MES]`, `[COSTO_3BPS_MES]`, `[REV_NETO_MES]`, `[TOTAL_MES]`, más los `[X]` de realizado cartera

**Performance del Mes**: `[DÍA DD/MM]`, `[X]`, `[N]`, `[M1_ACUM]`, `[M2_ACUM]`

**Eventos destacados** — duplicar `evento-item` por cada evento

**Comparativa meses** — duplicar fila por cada mes previo (3–4) más fila total `[Mes actual]`

**Cartera al cierre** — duplicar fila por activo: `[TICKER]`, `[QTY]`, `[COSTO_USD]`, `[USD/ARS]` (texto literal según moneda), `[PRECIO]`, `[VALOR_USD]`, más fila TOTAL con `[COSTO_TOTAL]`, `[VALOR_TOTAL]`

**Acumulado YTD (sección 9 opcional)**: incluir solo si el mes actual es marzo o posterior. `[año]`, `[Mes actual]`, `[X]` (varios contextos: revenue YTD, volumen YTD, ROI, mejor/peor mes, etc.)

**Filename PNG dentro del script**: `[mes]`, `[año]`

---

## Convenciones visuales

### Colores (paleta dark, fijos en el CSS)

| Color | Hex | Uso |
|---|---|---|
| Verde | `#10b981` | Revenue positivo, PnL positivo, totales en tablas |
| Rojo | `#ef4444` | Costos, M1 negativo, PnL negativo |
| Naranja | `#f59e0b` | Brand, exposición, warnings |
| Texto principal | `#e5e9f0` | Valores |
| Texto secundario | `#8a94a8` | Labels |

Para tokens que pueden ser positivos o negativos (M1, M2, PnL cartera), la **clase CSS** del `span` la elige la skill: `green` si suma, `red` si resta.

### Signos

- Revenue positivo: `+USD 1.234` (con `+` explícito)
- Negativo: `−USD 1.234` (usar `−` U+2212, no el guion `-`)
- Variaciones: `▲` (sube, verde) o `▼` (baja, rojo)
- Variación 0: omitir el triángulo, mostrar `=`

### Strings literales

- `[LONG ARS / SHORT ARS]` (con espacios y barra) → reemplazar por `LONG ARS` o `SHORT ARS` (uno solo)
- `[USD/ARS]` (sin espacios) → reemplazar por `USD` o `ARS` según moneda del activo
- `[+/-X]` → reemplazar por `+USD X` o `−USD X` (signo concreto)
- `[día anterior]`, `[día hábil anterior]` → label tipo `viernes 09/05` o `jueves 08/05`

---

## Validación rápida después de renderizar

Antes de mover a outputs, chequear que el HTML no contenga ningún token sin reemplazar:

```python
import re
tokens_pendientes = re.findall(r'\[[A-Z_][A-Z0-9_]*\]|\[día[^\]]*\]|\[Lun[^\]]*\]|\[Vie[^\]]*\]|\[mes\]|\[año\]|\[DÍA\]|\[DD/MM/YYYY\]', html)
if tokens_pendientes:
    raise ValueError(f"Tokens sin reemplazar: {set(tokens_pendientes)}")
```

Si la skill genera un HTML con tokens sin reemplazar, el operador va a ver `[REVENUE_TOTAL]` literal en pantalla. Mejor abortar y avisar antes.
