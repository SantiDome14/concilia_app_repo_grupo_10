---
name: ardua-trading-desk-report
description: Procesa el cierre diario operativo de la Mesa de Dinero de Ardua Solutions. Activar cuando el usuario diga "cierre mesa de dinero", "procesar cierre diario", "reporte trading desk", "cierre del día", "resumen semanal mesa", "resumen mensual mesa de dinero", "cierre Ardua", o adjunte un CSV/Excel del TRD con ops del día (columnas tipo `fecha y hora`, `nombre`, `Type`, `par`, `fiat`, `tc`, `monto crypto`, `tipo`, `FX Pantalla`). El SKILL lee/escribe Notion como fuente única de verdad, pide al operador las cotizaciones de cierre de la cartera (no se buscan en la web), calcula FIFO/M1/M2/expo, genera el HTML del reporte usando templates fijos, y devuelve resumen ejecutivo en el chat. Cubre cierres diarios, semanales (viernes) y mensuales (último día hábil).
license: Proprietary – Ardua Solutions S.A.
---

# Mesa de Dinero · Cierre Operativo · SKILL

## Quién usa esto
El Trading Desk Lead y eventualmente otros operadores de la Mesa de Dinero. El output va al CEO y directorio vía Telegram.

## Principio de arquitectura (no negociable)

**Notion guarda estado agregado.** Totalizadores, posiciones vigentes, arrastre, catálogos. Es la fuente única de verdad operativa.

**El detalle de movimientos es input efímero** de cada ejecución. Se procesa, se reporta, se descarta. La trazabilidad del cómo se calculó queda en el HTML que la mesa exporta, no en Notion.

Antes de procesar cualquier dato: leer Notion. Después de procesar: escribir Notion. El project knowledge **no es fuente de verdad**.

## Mapa de archivos del SKILL

| Archivo | Cuándo leerlo |
|---|---|
| `reglas_calculo.md` | Siempre antes de procesar (FIFO, 3bps, M1/M2, BTC scalping, FX pasante) |
| `integracion_notion.md` | Antes de leer Notion (IDs hardcodeadas, schemas, qué consultar) |
| `cotizaciones.md` | Antes de pedir cotizaciones al user (qué precio pedir según Método Valuación y en qué moneda) |
| `templates/reporte_diario.html` | Para generar HTML del cierre diario |
| `templates/reporte_semanal.html` | Solo los viernes |
| `templates/reporte_mensual.html` | Solo último día hábil del mes |
| `templates/chat_*.md` | Estructura del resumen ejecutivo en el chat |
| `templates/README.md` | Spec de placeholders Jinja2 por template |
| `validacion_skill.md` | Test rápido contra cierres conocidos si dudás de las fórmulas |

## Flujo de alto nivel del cierre diario

```
1. LEER NOTION
   ├─ Estado Operativo (arrastre vigente)
   ├─ Cartera Vigente (4 activos + URL Referencia + Metodo Valuacion)
   ├─ Proveedores (lista + pares operados + Aplica 3bps)
   ├─ Cierres Diarios (último cierre para comparativa)
   └─ Changelog (si hay duda sobre criterio vigente)

2. PEDIR INPUTS AL USUARIO (todos en una sola tanda, en prosa con tabla clara)
   ├─ TC cierre USD/ARS del día
   ├─ Cotizaciones de cierre de cada activo activo de Cartera Vigente
   │  (en la moneda que define su Metodo Valuacion — ver cotizaciones.md)
   ├─ Movimientos de cartera del día (FCI, dividendos, intereses, compra/venta)
   ├─ Si CSV trae proveedor desconocido → preguntar par + 3bps
   ├─ Si CSV trae ops EUR/PEN → preguntar si es pasante
   └─ Si hay BTC/ARS de cliente → pedir TC cliente, TC pantalla, spreads, comisiones

3. VALIDAR INPUTS COMPLETOS
   └─ Confirmar que se recibió precio para cada activo activo de Cartera Vigente
      └─ Si falta alguno: re-preguntar antes de calcular

4. CALCULAR (ver reglas_calculo.md)
   ├─ FIFO Mesa ARS → Revenue total + Revenue Cli ARG + Revenue Prop
   ├─ Costo 3bps proveedores USD/ARS
   ├─ Revenue FX Otros (EUR/USDC, USDC/PEN, USDT/BRL)
   ├─ Volumen total (Cli ARG + FX + Prop)
   ├─ M1 (vs pantalla) y M2 (vs TC cierre)
   ├─ Performance (trades, σ, rango TC, top proveedores)
   ├─ Exposición FX (flat, TC FIFO, P&L si cierra)
   └─ PnL no realizado cartera (al precio vivo)

5. GENERAR HTML
   ├─ Cargar templates/reporte_diario.html
   ├─ Llenar placeholders Jinja2
   └─ Guardar en /mnt/user-data/outputs/reporte_mesa_DD-MM-YYYY.html

6. ESCRIBIR NOTION
   ├─ Crear row en Cierres Diarios (todos los KPIs + Eventos del día)
   ├─ Actualizar Estado Operativo (nuevo arrastre)
   ├─ Si movimientos cartera → actualizar Cartera Vigente + agregar entrada Changelog
   ├─ Si proveedor nuevo → crear row en Proveedores
   └─ Si es último día hábil del mes → crear row en Cierres Mensuales

7. DEVOLVER RESUMEN EJECUTIVO (ver templates/chat_diario.md)
   └─ KPIs principales + variación vs día hábil anterior + Notion confirmado
```

## Cuándo se generan reportes adicionales

| Día | Outputs |
|---|---|
| Lunes a jueves | Diario (HTML + chat) |
| Viernes | Diario + Semanal (2 HTMLs + 2 resúmenes en chat) |
| Último día hábil del mes (no viernes) | Diario + Mensual |
| Último día hábil del mes = viernes | Diario + Mensual (el mensual reemplaza al semanal ese día) |

Si el último día hábil del mes cae viernes, **generar mensual, no semanal**.

## Antes de procesar, SIEMPRE preguntar

Antes de calcular nada, pedir confirmación al usuario:

1. TC cierre USD/ARS del día (obligatorio, no se infiere)
2. **Cotización de cierre de cada activo activo de Cartera Vigente** (obligatorio, no se busca en la web — la URL Referencia en Notion es solo eso, una referencia para que el operador la consulte; el precio lo provee el operador en la moneda que define el `Metodo Valuacion`)
3. Movimientos de cartera del día (ventas, compras, FCI, intereses, dividendos)
4. Si CSV trae **proveedor desconocido** (no está en DB Proveedores): nombre, par operado, ¿aplica 3bps?
5. Si CSV trae ops **EUR/USDC, EURC/USDC, USDC/PEN, otros FX**: ¿es trade pasante?
6. Si hay **op BTC/ARS de cliente**: TC cliente cotizado, TC pantalla del momento, spreads (% TC y % cripto), comisiones del exchange (Bitget u otro)
7. Confirmar que el arrastre del CSV coincide con el **Estado Operativo** de Notion. Si no, escalar.

**Mejor preguntar 1 cosa más que procesar mal.**

## Reglas críticas que se olvidan seguido

Estas son las que sistemáticamente dieron problema en cierres pasados (ver Changelog en Notion para auditoría):

1. **M1/M2 comparan SOLO Revenue Cli ARG real** (FIFO clientes sin prop, sin 3bps, sin FX). NO usar Revenue Total ni Revenue mesa neto.

2. **3bps aplica por PAR operado, no por nombre de proveedor.** Solo `USD/ARS` lleva 3bps. Pares excluidos: USDT/ARS, USDC/ARS, EUR/USDC, USDC/PEN, BTC/USDT, USDT/BRL.

3. **Ops BTC/ARS del cliente entran al FIFO al TC cliente cotizado**, NO al TC pantalla. Volumen op = `ARS / TC_cliente`. Ops Bitget de cobertura NO entran al FIFO.

4. **σ y rango TC excluyen BTC/ARS y outliers > 3σ.** Solo ops cliente ARS.

5. **FX pasante: side independiente del Type del CSV.** Cliente = mesa SHORT moneda extranjera. Proveedor = mesa LONG.

6. **Cartera valuación: depende de `Metodo Valuacion` (no de `Currency`).** `cripto_usd` → qty × precio_USD. `bono_ars_tc` → qty × precio_ARS / TC_cierre.

7. **TC FIFO al cierre = promedio ponderado** de las capas residuales del pool. No un TC arbitrario.

8. **El KPI "Volumen Clientes" del reporte consolida** Cli ARG + FX Otros + Prop. ROI se calcula sobre este total.

9. **Cierres 21/04 al 24/04 son placeholders sin detalle.** No usarlos para validar fórmulas ni para promedios. Validar contra 27/04 en adelante.

## Output esperado de cada cierre

1. **HTML** en `/mnt/user-data/outputs/reporte_mesa_DD-MM-YYYY.html` (presentado con `present_files`)
2. **Resumen ejecutivo en chat** con KPIs, variaciones, alertas, y confirmación de Notion actualizado
3. Si hubo **operatoria especial** (BTC scalping, EUR pasante grande): análisis detallado SOLO en el chat (NO en HTML)
4. **Arrastre para el día siguiente** explícito

## Tono y estilo

- Profesional, conciso, técnico
- Sin disclaimers innecesarios (el footer del HTML ya tiene "No constituye asesoramiento financiero · Uso interno")
- En el chat NO repetir info que ya está visible en el HTML — destacar lo importante
- Si el user corrige un cálculo: recalcular sin re-explicar el modelo
- Tablas markdown para presentar resultados
- Formato números: `1.234.567,89` (estilo argentino)
- Variaciones: ▲ verde si sube, ▼ rojo si baja, siempre vs día hábil anterior

## Cuándo escalar al usuario (no procesar solo)

- Arrastre del CSV no coincide con Estado Operativo de Notion
- Proveedor desconocido sin info de par o 3bps
- Par nuevo nunca operado (USDC/PEN, BTC/USDT, etc.)
- Op cliente con qty/TC outlier extremo
- Operatoria cripto/cobertura sin info de TC pantalla, spreads o comisiones
- Cartera con movimiento pero sin detalle (qty, precio, fecha)
- M1 muy negativo (> USD 10.000 en valor absoluto) sin explicación clara
- Exposición que supera USD 100.000 al cierre
