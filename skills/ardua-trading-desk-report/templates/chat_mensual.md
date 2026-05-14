# Template · Resumen Mensual en Chat

Estructura del resumen mensual en chat. Se genera el último día hábil de cada mes después del cierre diario.

---

## Cuándo se genera

- Último día hábil del mes, después del cierre diario
- Si el último día hábil cae viernes, **reemplaza al semanal** (se genera mensual, no semanal)
- Si no es viernes, igual va el mensual (sin semanal porque ya pasó)

---

## Datos a leer de Notion

1. **Todos los cierres del mes en curso** (filtro por fecha entre 01/MM y último día hábil) en Cierres Diarios
2. **Los 3-4 meses previos** en Cierres Mensuales (para comparativa histórica)
3. **Cartera Vigente al cierre del mes**
4. **Eventos del mes** (campo Eventos de cada cierre + entradas del Changelog del mes)

---

## Estructura del mensaje

```markdown
## 📊 Resumen mensual · {{ mes }} {{ año }}

**Totales del mes ({{ dias_operados }} días operados)**
- Revenue: **USD {{ revenue_mes | num_arg }}** (USD {{ revenue_promedio_dia | num_arg }}/día promedio)
- Volumen: **USD {{ volumen_mes | num_arg }}** (USD {{ volumen_promedio_dia | num_arg }}/día promedio)
- ROI: **{{ roi_mes }}%**
- Trades: **{{ trades_total }}** ({{ buy_total }} BUY / {{ sell_total }} SELL)

**Desglose**
- Cli ARG: USD {{ revenue_cli_arg | num_arg }}
- Prop: USD {{ revenue_prop | num_arg }}
- FX Otros: USD {{ revenue_fx | num_arg }}
- Costo 3bps: −USD {{ costo_3bps_abs | num_arg }}
- Realizado cartera: USD {{ realizado_cartera_signo }}{{ realizado_cartera_abs | num_arg }}
- **Total del mes: USD {{ total_mes | num_arg }}**

**Por semana**
| Semana | Días | Revenue | ROI |
|---|---|---|---|
{% for s in semanas %}| {{ s.label }} | {{ s.dias }} | USD {{ s.revenue | num_arg }} | {{ s.roi }}% |
{% endfor %}

**Highlights**
- Mejor día: {{ mejor_dia_label }} · USD {{ mejor_dia_revenue | num_arg }}
- Peor día: {{ peor_dia_label }} · USD {{ peor_dia_revenue | num_arg }}
- Mejor semana: {{ mejor_semana_label }} · USD {{ mejor_semana_revenue | num_arg }}
- Día con mayor volumen: {{ max_vol_dia_label }} · USD {{ max_vol_dia | num_arg }}
- M1 acumulado mes: USD {{ m1_mes_signo }}{{ m1_mes_abs | num_arg }}
- M2 acumulado mes: USD {{ m2_mes_signo }}{{ m2_mes_abs | num_arg }}

**Eventos del mes**
{% for evento in eventos %}- {{ evento.descripcion }}
{% endfor %}

**Comparativa con meses previos**
| Mes | Revenue | Volumen | ROI |
|---|---|---|---|
{% for m in meses_previos %}| {{ m.label }} | USD {{ m.revenue | num_arg }} | USD {{ m.volumen | num_arg }} | {{ m.roi }}% |
{% endfor %}| **{{ mes }}** | **USD {{ revenue_mes | num_arg }}** | **USD {{ volumen_mes | num_arg }}** | **{{ roi_mes }}%** |

**Cartera al cierre del mes**
- Valor total: USD {{ cartera_valor | num_arg }}
- Costo histórico: USD {{ cartera_costo | num_arg }}
- PnL no realizado: USD {{ cartera_pnl_signo }}{{ cartera_pnl_abs | num_arg }} ({{ cartera_pnl_pct }}%)
- Mejor activo: {{ mejor_activo_ticker }} {{ mejor_activo_pct_signo }}{{ mejor_activo_pct_abs }}%
- Peor activo: {{ peor_activo_ticker }} {{ peor_activo_pct_signo }}{{ peor_activo_pct_abs }}%

{% if año_meses_count >= 3 %}
**Acumulado {{ año }} (Ene → {{ mes }})**
| Concepto | Valor |
|---|---|
| Revenue YTD | USD {{ revenue_ytd | num_arg }} |
| Volumen YTD | USD {{ volumen_ytd | num_arg }} |
| ROI promedio | {{ roi_ytd }}% |
| Mejor mes | {{ mejor_mes_label }} · USD {{ mejor_mes_revenue | num_arg }} |
| Peor mes | {{ peor_mes_label }} · USD {{ peor_mes_revenue | num_arg }} |
{% endif %}

---

📄 HTML mensual: `/mnt/user-data/outputs/mesa-dinero-mensual-{{ archivo_filename }}.html` (abrir en navegador → botón "📸 Exportar PNG")
```

---

## Notion: SÍ se crea row en Cierres Mensuales

A diferencia del semanal, el mensual SÍ crea un row consolidado en la DB `📅 Cierres Mensuales`. Esto:
- Da una vista rápida del mes sin tener que sumar cierres diarios
- Sirve para la comparativa histórica de los mensuales futuros
- Hace que YTD sea queryable directo

```
✅ Row nuevo en Cierres Mensuales: {{ mes }} {{ año }}
```

---

## ⚠️ Lo que NO mostrar en el mensual

- NO incluir arrastre/expo vigente (vive en Estado Operativo)
- NO incluir detalle diario op por op
- NO incluir cotizaciones cripto históricas día por día
- NO incluir cartera del cierre del mes con detalle op por op (eso ya está en el cierre del día)
