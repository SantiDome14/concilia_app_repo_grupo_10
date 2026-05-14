# Templates · Spec de Placeholders Jinja2

Variables que el SKILL debe inyectar en cada template. Si una variable no tiene valor, **no dejar el placeholder Jinja2 sin renderizar** — pasar string vacío, `0`, `"—"` o lo que corresponda.

---

## Renderizado: cómo se generan los HTML

```python
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader('/path/to/skill/templates'))
env.filters['num_arg'] = num_arg_filter
env.filters['num_arg_2dec'] = lambda v: num_arg_filter(v, decimals=2)
env.filters['num_arg_4dec'] = lambda v: num_arg_filter(v, decimals=4)

template = env.get_template('reporte_diario.html')
html = template.render(**contexto)

with open('/mnt/user-data/outputs/reporte_mesa_DD-MM-YYYY.html', 'w') as f:
    f.write(html)
```

---

## Filtros custom

### `| num_arg`
Formato argentino, 0 decimales por defecto.

```python
def num_arg_filter(value, decimals=0):
    """1234567.89 → '1.234.568' (decimals=0) o '1.234.567,89' (decimals=2)"""
    if value is None or value == '':
        return '—'
    try:
        num = float(value)
    except (ValueError, TypeError):
        return str(value)
    formatted = f"{num:,.{decimals}f}"
    # Swap argentino: . y , intercambiados
    return formatted.replace(',', 'X').replace('.', ',').replace('X', '.')
```

Ejemplos:
- `num_arg(1234567.89)` → `"1.234.568"`
- `num_arg(1234567.89, decimals=2)` → `"1.234.567,89"`
- `num_arg(0.5, decimals=4)` → `"0,5000"`
- `num_arg(None)` → `"—"`

### `| num_arg_2dec` y `| num_arg_4dec`
Atajos para 2 y 4 decimales respectivamente.

---

## Convenciones de naming

### `_signo`
Variables que contienen `"+"`, `"−"` (U+2212, no `"-"`) o `""` según el signo del valor.

```python
def signo_minus(value):
    """value > 0 → '+', value < 0 → '−', value == 0 → ''"""
    if value > 0: return '+'
    if value < 0: return '−'
    return ''
```

### `_abs`
Valor absoluto numérico (sin signo). Combinar con `_signo`.

### `_clase`
Una de `"green"`, `"red"`, `""` (vacío) según signo. La hoja de estilos pinta el texto.

```python
def clase_pnl(value):
    if value > 0: return 'green'
    if value < 0: return 'red'
    return ''
```

### `_arrow`
`"▲"` o `"▼"` según signo de variación (para los KPIs).

---

## TEMPLATE: `reporte_diario.html`

### Variables del header

| Variable | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `fecha_dd_mm_yyyy` | str | Fecha en formato DD-MM-YYYY (filename safe) | `"12-05-2026"` |
| `dia_label_largo` | str | Nombre completo del día | `"Martes"` |
| `fecha_dd_de_mes_de_yyyy` | str | Fecha legible | `"12 de mayo de 2026"` |

### KPIs principales

| Variable | Tipo | Descripción |
|---|---|---|
| `revenue_total` | float | Revenue total USD |
| `volumen_total` | float | Volumen total USD (Cli ARG + FX + Prop) |
| `roi_pct` | float | ROI en % (ej: `1.137`, no `0.01137`) |
| `expo_usd` | float | Exposición USD |
| `pl_si_cierra_signo` | str | `"+"` o `"−"` |
| `pl_si_cierra_abs` | float | P&L si cierra (valor absoluto) |
| `dia_anterior_label` | str | Etiqueta día anterior comparado | `"viernes"` o `"lunes"` |
| `variacion_revenue_pct` | float | `+/-` % vs día anterior |
| `variacion_revenue_arrow` | str | `"▲"` o `"▼"` |
| `variacion_revenue_clase` | str | `"green"` o `"red"` |
| `variacion_volumen_pct`, `_arrow`, `_clase` | — | Mismo patrón |
| `variacion_roi_pp`, `_arrow`, `_clase` | — | Variación en puntos porcentuales |

### Sección "Operaciones del día"

| Variable | Tipo |
|---|---|
| `volumen_cli_arg`, `volumen_fx`, `volumen_prop` | float |
| `revenue_cli_arg`, `revenue_fx`, `revenue_prop` | float |
| `costo_3bps_abs` | float (positivo) |
| `revenue_neto` | float |

### Sección "Realizado Cartera"

| Variable | Tipo |
|---|---|
| `realizado_cartera_signo` | str |
| `realizado_cartera_abs` | float |
| `realizado_cartera_clase` | str (`"green"` o `"red"`) |

### Sección "Performance"

| Variable | Tipo |
|---|---|
| `trades` | int (solo clientes) |
| `buy_count`, `sell_count` | int |
| `sigma` | float (formato `"X,XX"`) |
| `tc_min`, `tc_max` | float |
| `prov_1_nombre`, `prov_2_nombre` | str |
| `prov_1_vol`, `prov_2_vol` | float |

### Sección "Exposición FX"

| Variable | Tipo |
|---|---|
| `flat_ars` | float (con signo: + LONG, − SHORT) |
| `tc_fifo` | float |
| `tc_promedio_dia` | float |
| `factor_riesgo` | float (4 decimales típicamente) |
| `pl_si_cierra_signo`, `_abs`, `_clase` | (ver arriba) |
| `tc_cierre` | float (input editable) |
| `arrastre_flat` | float |
| `arrastre_tc_fifo` | float |
| `dia_anterior_corto` | str | "lun.", "vie.", etc. |
| `side_expo` | str | `"LONG_ARS"` o `"SHORT_ARS"` o `"FLAT"` |

### Sección "Métricas FIFO Ideal"

| Variable | Tipo |
|---|---|
| `m1_signo`, `m1_abs`, `m1_clase` | (signo / abs / clase) |
| `m1_card_clase` | str (`"green"` o `"red"`) — tinta del card entero |
| `suma_escenario_pantalla` | float — Σ pnl escenario @ TC pantalla |
| `m1_interpretacion_verbo` | str | `"ganó"` o `"perdió"` |
| `m1_interpretacion_direccion` | str | `"más"` o `"menos"` |
| `m2_signo`, `m2_abs`, `m2_clase`, `m2_card_clase` | (igual) |
| `suma_escenario_cierre` | float — Σ pnl escenario @ TC cierre |

### Sección "Cartera"

`cartera` es lista de dicts:

```python
cartera = [
    {
      "ticker": "BTC",
      "cantidad": 1.065424,
      "costo_usd": 95900.55,
      "precio_raw": 80766.50,         # input numérico
      "precio_display": "80.767",     # display formateado
      "moneda_precio": "USD",
      "metodo_valuacion": "cripto_usd",
      "valor_usd": 86050.32,
      "pnl_signo": "−",
      "pnl_usd_abs": 9850.23,
      "pnl_pct_signo": "−",
      "pnl_pct_abs": "10,3",          # con coma decimal
      "pnl_clase": "red"
    },
    ...
]
```

| Variable adicional | Tipo |
|---|---|
| `cartera_valor_total` | float |
| `cartera_costo` | float |
| `cartera_pnl_signo`, `_abs`, `_clase`, `_pct_signo`, `_pct_abs` | (igual patrón) |
| `mejor_activo_ticker` | str |
| `mejor_activo_pct_signo`, `_abs` | — |
| `peor_activo_ticker`, `peor_activo_pct_signo`, `_abs` | — |

### Variable JSON para el JS

```python
suma_escenario_per_op_json = json.dumps([
    {"qty": 5000, "tc_operado": 1.475, "type": "BUY"},
    {"qty": 12000, "tc_operado": 1.476, "type": "SELL"},
    ...
])
```

El JS recalcula M2 + expo + P&L al editar TC Cierre, y PnL no realizado al editar cualquier precio.

---

## TEMPLATE: `reporte_semanal.html`

### Variables del header

| Variable | Tipo |
|---|---|
| `rango_lun_vie` | str | `"5 al 9 de mayo"` |
| `rango_lun_vie_largo` | str | `"lunes 5 al viernes 9 de mayo"` |
| `rango_lun_vie_filename` | str | `"05-09-mayo-2026"` |
| `año` | int |
| `dias_operados` | int |

### KPIs semanales

| Variable | Tipo |
|---|---|
| `revenue_semanal`, `volumen_semanal` | float |
| `revenue_promedio_dia` | float |
| `volumen_promedio_dia_m` | str | `"1,6"` (en millones) |
| `roi_semanal` | float (en %, ej `0.85`) |
| `trades_total`, `buy_total`, `sell_total` | int |

### Detalle diario (`dias` lista de dicts)

```python
dias = [
    {
      "dia_label": "Lun 5",
      "revenue": 33458,
      "volumen": 4017900,
      "roi": "0,83",
      "m1_signo": "−", "m1_abs": 1727, "m1_clase": "red",
      "m2_signo": "+", "m2_abs": 22880, "m2_clase": "green",
      "tc_cierre": 1.475
    },
    ...
]
```

### Desglose Revenue + Performance + Eventos

| Variable | Tipo |
|---|---|
| `revenue_cli_arg`, `revenue_prop`, `revenue_fx`, `costo_3bps_abs`, `revenue_neto` | float |
| `volumen_cli_arg`, `volumen_fx`, `volumen_prop` | float |
| `mejor_dia_label`, `peor_dia_label`, `mejor_roi_dia_label`, `peor_roi_dia_label` | str |
| `mejor_dia_revenue`, `peor_dia_revenue` | float |
| `mejor_roi_pct`, `peor_roi_pct` | float |
| `m1_semanal_signo`, `_abs`, `_clase` | (patrón) |
| `m2_semanal_signo`, `_abs`, `_clase` | (patrón) |
| `dias_pos_m1`, `dias_pos_m2` | int |
| `trades_promedio` | float (1 decimal) |

`eventos` es lista de dicts:
```python
eventos = [
    {"dia_label": "Lun 5", "descripcion": "Outliers de TC excluidos del σ"},
    ...
]
```

### Comparativa con semanas previas (`semanas_previas`)

```python
semanas_previas = [
    {
      "rango": "28 abr al 2 may",
      "dias": 4,
      "revenue": 89234,
      "volumen_label": "8,2M",
      "roi": "1,08",
      "rev_dia": 22308
    },
    ...
]
```

---

## TEMPLATE: `reporte_mensual.html`

### Variables del header

| Variable | Tipo |
|---|---|
| `mes` | str | `"Mayo"` (capitalizado) |
| `año` | int |
| `dias_operados`, `trades_total` | int |

### KPIs del mes

| Variable | Tipo |
|---|---|
| `revenue_mes`, `volumen_mes`, `revenue_promedio_dia` | float |
| `roi_mes` | float (en %) |
| `mes_anterior_label` | str | `"Abr 2026"` |
| `variacion_revenue_pct`, `_arrow`, `_clase` | — |
| `variacion_volumen_pct`, `_arrow`, `_clase` | — |
| `variacion_roi_pp`, `_arrow`, `_clase` | — |
| `trades_promedio_dia` | float (1 decimal) |

### Desglose Revenue del mes

Mismas variables que diario/semanal: `revenue_cli_arg`, `revenue_prop`, `revenue_fx`, `costo_3bps_abs`, `revenue_neto`, `volumen_cli_arg`, `volumen_fx`, `volumen_prop`, `realizado_cartera_signo`, `realizado_cartera_abs`, `realizado_cartera_clase`, `total_mes`.

### Detalle semanal (`semanas` lista de dicts)

```python
semanas = [
    {
      "label": "S1 (28/04 - 02/05)",
      "dias": 4,
      "revenue": 89234,
      "volumen": 8204512,
      "roi": "1,08",
      "rev_dia": 22308,
      "m1_signo": "+", "m1_abs": 3245, "m1_clase": "green",
      "m2_signo": "−", "m2_abs": 1230, "m2_clase": "red"
    },
    ...
]
```

### Highlights

| Variable | Tipo |
|---|---|
| `mejor_dia_label`, `peor_dia_label`, `mejor_semana_label`, `max_vol_dia_label`, `mejor_roi_dia_label` | str |
| `mejor_dia_revenue`, `peor_dia_revenue`, `mejor_semana_revenue`, `max_vol_dia` | float |
| `mejor_roi_pct` | float |
| `dias_pos_m1`, `dias_pos_m2` | int |

### Eventos del mes

```python
eventos = [
    {"fecha_label": "05/05", "descripcion": "Nuevo activo cartera: S15Y6 (USD 48.630)"},
    ...
]
```

### Comparativa histórica (`meses_previos`)

```python
meses_previos = [
    {"label": "Mar 2026", "dias": 21, "revenue": 261503, "volumen": 48886174, "roi": "0,53", "rev_dia": 12453},
    ...
]
```

### Cartera al cierre (`cartera`)

```python
cartera = [
    {
      "ticker": "BTC",
      "cantidad": 1.065424,
      "costo_usd": 95900.55,
      "valor_usd": 86050.32,
      "pnl_signo": "−", "pnl_usd_abs": 9850.23,
      "pnl_pct_signo": "−", "pnl_pct_abs": "10,3",
      "pnl_clase": "red"
    },
    ...
]
```

| Variable adicional | Tipo |
|---|---|
| `cartera_valor`, `cartera_costo` | float |
| `cartera_pnl_signo`, `_abs`, `_pct_signo`, `_pct_abs` | (patrón) |

### Acumulado YTD (opcional, mostrar si `mostrar_ytd` = True)

| Variable | Tipo |
|---|---|
| `mostrar_ytd` | bool |
| `revenue_ytd`, `volumen_ytd`, `trades_ytd` | float / int |
| `roi_ytd` | float (en %) |
| `mejor_mes_label`, `peor_mes_label` | str |
| `mejor_mes_revenue`, `peor_mes_revenue` | float |
| `m1_ytd_signo`, `_abs`, `_clase` | (patrón) |
| `m2_ytd_signo`, `_abs`, `_clase` | (patrón) |

### Filename

| Variable | Tipo |
|---|---|
| `archivo_filename` | str | `"mayo-2026"` |

---

## Tips de implementación

1. **Generar todas las variables _signo / _abs / _clase juntas** en un helper único:

```python
def calc_display(value, decimals=0):
    return {
        'signo': '+' if value > 0 else ('−' if value < 0 else ''),
        'abs': abs(value),
        'clase': 'green' if value > 0 else ('red' if value < 0 else ''),
    }
```

2. **Variables que se usan en varios lugares del mismo template** (ej. `tc_cierre`): pasar UNA sola vez al contexto, no duplicar.

3. **No olvidar el JSON para el JS del diario**: `suma_escenario_per_op_json` es el único campo que se serializa como JSON dentro del HTML (`{{ ... | safe }}` no es necesario si ya es un string JSON válido).

4. **El template del diario tiene JavaScript de recálculo en vivo.** No hace falta pre-calcular variantes de M2 a múltiples TC cierres — el JS lo hace al editar el input.

5. **Si una sección no aplica para un día/mes específico** (ej. no hubo eventos, no hubo movimientos cartera), pasar lista vacía. El `{% for %}` no renderizará nada.

6. **Encoding UTF-8 estricto.** El símbolo `−` (U+2212) es distinto del guión `-`. La paleta usa el matemático.
