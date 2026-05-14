# Template · Resumen Diario en Chat

Estructura del resumen que el SKILL devuelve **en el chat** después de procesar el cierre diario. Complementa al HTML, no lo reemplaza.

---

## Estructura del mensaje

```markdown
## 📊 Cierre {{ dia_semana }} {{ fecha_dd_mm_yyyy }}

**KPIs principales**
- **Revenue Total: USD {{ revenue_total | num_arg }}** {{ variacion_revenue_emoji }} {{ variacion_revenue_pct }}% vs {{ dia_anterior_label }}
- **Volumen Clientes: USD {{ volumen_total | num_arg }}** {{ variacion_volumen_emoji }} {{ variacion_volumen_pct }}%
- **ROI: {{ roi_pct }}%** {{ variacion_roi_emoji }} {{ variacion_roi_pp }}pp
- **Exposición: USD {{ expo_usd | num_arg }}** ({{ side_expo }} @ TC FIFO {{ tc_fifo }})

**Desglose Revenue**
- Cli ARG: USD {{ revenue_cli_arg | num_arg }}
- Prop Trading: USD {{ revenue_prop | num_arg }}
- FX Otros{% if fx_detalle %} ({{ fx_detalle }}){% endif %}: USD {{ revenue_fx | num_arg }}
- Costo 3bps proveedores: −USD {{ costo_3bps_abs | num_arg }}
- **Revenue mesa neto: USD {{ revenue_neto | num_arg }}**
{% if realizado_cartera != 0 %}- Realizado cartera: USD {{ realizado_cartera_signo }}{{ realizado_cartera_abs | num_arg }}{% endif %}

**Performance**
- {{ trades }} trades clientes ({{ buy_count }} BUY / {{ sell_count }} SELL)
- σ: {{ sigma }} | Rango TC: {{ tc_min }} — {{ tc_max }}
- Top 2 proveedores: {{ prov_1_nombre }} (USD {{ prov_1_vol | num_arg }}) / {{ prov_2_nombre }} (USD {{ prov_2_vol | num_arg }})
{% if outliers_excluidos %}- ⚠️ Outliers excluidos de σ: {{ outliers_excluidos | join(", ") }}{% endif %}

**Exposición FX**
- Side: **{{ side_expo }}**
- Flat ARS: {{ flat_ars | num_arg }}
- TC FIFO: {{ tc_fifo }}
- TC cierre: {{ tc_cierre }}
- P&L si cierra: USD {{ pl_si_cierra_signo }}{{ pl_si_cierra_abs | num_arg }}

**M1 / M2**
- M1: USD {{ m1_signo }}{{ m1_abs | num_arg }} ({{ m1_interpretacion }})
- M2 al TC {{ tc_cierre }}: USD {{ m2_signo }}{{ m2_abs | num_arg }}

**Cartera al cierre**
| Activo | Precio | Valor USD | PnL |
|---|---|---|---|
{% for activo in cartera %}| {{ activo.ticker }} | {{ activo.precio_display }} | {{ activo.valor_usd | num_arg }} | {{ activo.pnl_signo }}{{ activo.pnl_usd_abs | num_arg }} ({{ activo.pnl_pct }}%) |
{% endfor %}| **Total** | | **USD {{ cartera_valor_total | num_arg }}** | **{{ cartera_pnl_signo }}USD {{ cartera_pnl_abs | num_arg }} ({{ cartera_pnl_pct }}%)** |

---

## 💾 Notion actualizado

✅ Row nuevo en **Cierres Diarios** ({{ fecha_dd_mm_yyyy }})
✅ **Estado Operativo** con nuevo arrastre
{% if movimientos_cartera %}✅ **Cartera Vigente** actualizada ({{ movimientos_cartera_resumen }}){% endif %}
{% if proveedor_nuevo %}✅ **Proveedores**: agregado {{ proveedor_nuevo }}{% endif %}
{% if entrada_changelog %}✅ **Changelog**: {{ entrada_changelog }}{% endif %}

**Arrastre para el próximo día hábil:** {{ side_expo }} ARS {{ flat_ars_abs | num_arg }} @ TC FIFO {{ tc_fifo }}

📄 HTML del reporte: `/mnt/user-data/outputs/reporte_mesa_{{ fecha_dd-mm-yyyy }}.html`
```

---

## Bloques opcionales

### Análisis op especial (solo si hubo BTC scalping, EUR pasante grande, etc.)

```markdown
**Análisis op especial · {{ tipo_op_especial }}**
- {{ descripcion_detalle }}
- Ganancia real: USD {{ ganancia_real }} ({{ ganancia_pct }}%)
- Descomposición: spread cliente ~ USD {{ spread_cliente }} | scalping ~ USD {{ scalping }}
```

**Importante:** este bloque va SOLO en el chat. NO en el HTML.

### ⚠️ Alertas

Cuando aplique alguna de estas condiciones, sumar bloque de alerta al final:

- Outliers extremos (>3σ) excluidos del cálculo de volatilidad
- Proveedor nuevo cargado
- Par nuevo nunca operado
- Expo > USD 100.000
- M1 < −USD 10.000
- Movimiento de cartera grande (> USD 50.000)

```markdown
**⚠️ Alertas**
- {{ alerta_1 }}
- {{ alerta_2 }}
```

### Acumulado del mes (entre día 15 y fin de mes)

```markdown
**Acumulado mes a la fecha**
- Revenue mes: USD {{ revenue_mes | num_arg }} ({{ dias_operados }} días)
- vs mes anterior misma fecha: {{ variacion_mes_emoji }} {{ variacion_mes_pct }}%
```

---

## Reglas de tono

- **Conciso**: cada bloque ocupa lo mínimo posible. Tabla si se puede.
- **Sin repetir HTML**: solo destacar lo importante o lo que NO está en el HTML (ops especiales, alertas).
- **Variaciones con flechas**: ▲ verde si sube, ▼ rojo si baja.
- **Confirmación de Notion explícita**: al final, listar qué databases se actualizaron.

---

## Convención de variables Jinja2

Ver `templates/README.md` para el detalle completo de variables que el SKILL debe inyectar. Filtros comunes:

- `| num_arg`: formato argentino (1.234.567,89). El SKILL implementa este filtro como helper.
- `_signo`: variables que contienen "+", "−" o "" según signo. Ej: `realizado_cartera_signo = "+"` si positivo, `"−"` si negativo.
- `_abs`: valor absoluto numérico (sin signo). Combinar con `_signo` para display.

Ejemplo: si `realizado_cartera = -2301`, entonces `realizado_cartera_signo = "−"` y `realizado_cartera_abs = 2301`.
