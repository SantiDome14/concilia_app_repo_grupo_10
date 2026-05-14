# Template · Resumen Semanal en Chat

Estructura del resumen semanal en chat. Se genera los viernes después del cierre diario.

---

## Cuándo se genera

- Todos los viernes, después de cerrar el día normal
- Si un viernes es feriado, el último día hábil de esa semana
- **Si el último día hábil del mes cae viernes, se genera el MENSUAL en vez del semanal** (no ambos)
- El semanal complementa al diario del viernes, no lo reemplaza

---

## Estructura del mensaje

```markdown
## 📊 Resumen semanal · {{ rango_lun_vie }} de {{ mes }}

**Totales ({{ dias_operados }} días operados)**
- Revenue: **USD {{ revenue_semanal | num_arg }}** (USD {{ revenue_promedio_dia | num_arg }}/día promedio)
- Volumen: **USD {{ volumen_semanal | num_arg }}** (USD {{ volumen_promedio_dia | num_arg }}/día promedio)
- ROI: **{{ roi_semanal }}%**
- Trades: **{{ trades_total }}** ({{ buy_total }} BUY / {{ sell_total }} SELL)

**Por día**
| Día | Revenue | ROI | M1 | M2 |
|---|---|---|---|---|
{% for d in dias %}| {{ d.dia_label }} | USD {{ d.revenue | num_arg }} | {{ d.roi }}% | {{ d.m1_signo }}{{ d.m1_abs | num_arg }} | {{ d.m2_signo }}{{ d.m2_abs | num_arg }} |
{% endfor %}| **Total** | **USD {{ revenue_semanal | num_arg }}** | **{{ roi_semanal }}%** | **{{ m1_semanal_signo }}{{ m1_semanal_abs | num_arg }}** | **{{ m2_semanal_signo }}{{ m2_semanal_abs | num_arg }}** |

**Desglose Revenue Semanal**
- Cli ARG: USD {{ revenue_cli_arg | num_arg }}
- Prop: USD {{ revenue_prop | num_arg }}
- FX Otros: USD {{ revenue_fx | num_arg }}
- Costo 3bps: −USD {{ costo_3bps_abs | num_arg }}

**Eventos destacados de la semana**
{% for evento in eventos %}- {{ evento.dia_label }} · {{ evento.descripcion }}
{% endfor %}

**Comparativa**
- vs semana previa: {{ variacion_revenue_emoji }} {{ variacion_revenue_pct }}% revenue, {{ variacion_roi_emoji }} {{ variacion_roi_pp }}pp ROI
- Mejor día: {{ mejor_dia_label }} (USD {{ mejor_dia_revenue | num_arg }})
- Peor día: {{ peor_dia_label }} (USD {{ peor_dia_revenue | num_arg }})

**M1 / M2 acumulados**
- M1 semanal: USD {{ m1_semanal_signo }}{{ m1_semanal_abs | num_arg }} (días positivos: {{ dias_pos_m1 }} de {{ dias_operados }})
- M2 semanal: USD {{ m2_semanal_signo }}{{ m2_semanal_abs | num_arg }} (días positivos: {{ dias_pos_m2 }} de {{ dias_operados }})

---

📄 HTML semanal: `/mnt/user-data/outputs/mesa-dinero-semanal-{{ archivo_filename }}.html` (abrir en navegador → botón "📸 Exportar PNG")
```

---

## Datos a leer de Notion

1. Los 5 cierres de la semana (filtro por fecha Lun-Vie) en Cierres Diarios
2. Las 2-3 semanas previas (para la comparativa) en Cierres Diarios

---

## ⚠️ Lo que NO mostrar en el semanal

- **NO** incluir "Cierre semanal · Posición vigente" (el arrastre vive en Notion, no en el reporte)
- **NO** incluir desglose de operatorias especiales detallado (eso va al chat del diario, no al semanal)
- **NO** incluir cartera al cierre (eso ya está en el reporte diario del viernes)

---

## ⚠️ No se crea row separado en Notion

El semanal NO crea row en Cierres Diarios ni en ninguna otra DB. La data semanal se reconstruye sumando los 5 cierres diarios. Solo se genera el HTML.
