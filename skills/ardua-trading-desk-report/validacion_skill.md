# Validación del SKILL

Test rápido contra cierres conocidos. **Si los números no coinciden, el SKILL tiene un bug — escalar antes de procesar cierres nuevos.**

---

## Caso principal · 12/05/2026 (Martes)

Datos en Notion (Cierres Diarios, fecha 12/05/2026). Este es el cierre más reciente y mejor documentado.

### KPIs esperados

| Concepto | Valor esperado |
|---|---|
| Revenue Total USD | 55.047 |
| Revenue Cli ARG | 55.440 |
| Revenue Prop Trading | 1.149 |
| Revenue FX Otros | 0 |
| Costo 3bps proveedores | −1.543 |
| Realizado cartera | 0 |
| Revenue mesa neto | 55.047 |
| Volumen Total | 4.841.049 |
| Volumen Cli ARG | 4.729.006 |
| Volumen FX | 0 |
| Volumen Prop | 112.043 |
| Trades | 42 (40 BUY / 2 SELL) |
| ROI | 1,137 % |
| M1 | −1.727 |
| M2 (al TC 1.474) | +22.880 |
| TC Cierre | 1.474 |
| TC FIFO | 1.475 |
| Side Expo | LONG_ARS |
| Flat ARS | 4.369.878 |
| Cartera PnL USD | −34.162 |

### Validaciones puntuales

1. **40 BUY / 2 SELL** → mesa quedó largamente comprada (LONG ARS, SHORT USD).
2. **TC FIFO ≈ TC Cierre (1,475 vs 1,474)** → poca diferencia, P&L si cierra ≈ 0.
3. **M2 positivo (+22.880)** → la mesa ganó vs un escenario donde todo se calzaba al TC cierre. El día se movió a favor.
4. **M1 ligeramente negativo (−1.727)** → la mesa perdió un poco vs el spread visible. El spread total de la mesa fue menor a lo que la pantalla habría aportado.
5. **Outliers de TC excluidos del cálculo de σ**: 1.495 y 1.490. Aparecen en el campo `Eventos` del cierre.

### Eventos esperados en el campo `Eventos`

> "Compra AAVE 104,1666 unidades @ USD 96 (USD 9.999,99) — ampliación posición. 3 ops del 11/05 ingresadas post-cierre (no impactan FIFO 11/05). Outliers TC 1.495 y 1.490 excluidos de σ."

---

## Caso secundario · 04/05/2026 (Lunes)

Cierre del lunes después de fin de semana. Volumen alto.

| Concepto | Valor esperado |
|---|---|
| Revenue Total USD | ≈ 88.420 |
| Volumen Total | ≈ 9.834.205 |
| ROI | ≈ 0,899 % |

(Validar contra el row exacto en Notion.)

---

## Caso de operatoria especial · 28/04/2026

Primer caso de op BTC del cliente con cobertura cripto. Si el SKILL no maneja bien esta lógica, va a:
- Computar el volumen al TC pantalla en vez de al TC cliente
- Sumar las ops Bitget al volumen (mal)
- Sumar las ops Bitget al FIFO (mal)
- No incluir el ajuste cripto en Revenue Cli ARG

**Validar:**
1. Volumen del día NO incluye ops Bitget
2. Volumen op BTC = ARS_cliente / TC_cliente_cotizado
3. Pool FIFO recibió la op BTC al TC cliente cotizado, no al TC pantalla
4. Revenue Cli ARG incluye el ajuste cripto (Net_USDT_exchange − Vol_pantalla)

---

## Caso de FX pasante · varios días con CONVERA/CIRCLE/VELAFI

Si aparece una op EUR/USDC o USDC/PEN:
1. Side NO se determina por el campo `Type` del CSV
2. Cliente = mesa SHORT moneda extranjera
3. Spread = `(tc_cliente − tc_proveedor) × qty_calzada`
4. NO entran al FIFO Mesa ARS
5. NO computan al volumen Cli ARG
6. Computan al volumen FX y Revenue FX Otros

---

## Tests sintéticos básicos

Si dudás de una fórmula puntual, correr estos cálculos mentales:

### Test 1: FIFO simple

- Arrastre: SHORT ARS −1.000.000 @ TC 1.470
- Op 1: BUY 10.000 USD a 1.480 (entrega ARS 14.800.000)
- Op 2: SELL 8.000 USD a 1.490 (recibe ARS 11.920.000)

**Cálculo:**
- Op 1 (SHORT_ARS, qty ARS 14.800.000 @ 1.480): matchea contra arrastre (−1.000.000 @ 1.470). Qty matched = 1.000.000 ARS. PnL = 1.000.000 × (1/1.480 − 1/1.470) ≈ −4,59 USD. Capa residual: SHORT_ARS 13.800.000 @ 1.480.
- Op 2 (LONG_ARS, qty 11.920.000 @ 1.490): matchea contra la capa de 1.480. Qty matched = 11.920.000. PnL = 11.920.000 × (1/1.490 − 1/1.480) ≈ −54,02 USD. Capa residual: SHORT_ARS 1.880.000 @ 1.480.

Revenue mesa ARS = −4,59 + −54,02 ≈ −58,61 USD.

Total flat al final del día: SHORT_ARS 1.880.000 ARS @ TC FIFO 1.480.

### Test 2: 3bps

- Op proveedor: 50.000 USD a 1.480 USD/ARS
- 3bps = 50.000 × 0,0003 = 15 USD

### Test 3: M1 (op aislada vs pantalla)

- Cliente BUY 10.000 USD a TC 1.480, pantalla del momento 1.475
- PnL escenario pantalla = 10.000 × (1.475 − 1.480) / 1.475 = −33,90 USD
- Si esta es la única op del día y Revenue Cli ARG real = +25 USD:
- M1 = 25 − (−33,90) = +58,90 USD

(La mesa ganó +58,90 vs el escenario donde el cliente se calzaba a la pantalla.)

---

## Checklist antes de declarar el SKILL "operativo"

- [ ] Procesa el cierre 12/05/2026 desde un CSV simulado y reproduce los KPIs ±USD 1
- [ ] Lee correctamente arrastre desde Estado Operativo
- [ ] Lee Cartera Vigente con URL Referencia y Método Valuación
- [ ] Le pide al operador los precios de cierre de los 4 activos vigentes en una sola tanda (junto a TC cierre + resto de inputs), en prosa con tabla, indicando moneda esperada por método
- [ ] Valida que recibió un precio numérico por cada activo activo antes de calcular; si falta alguno, re-pregunta y no infiere
- [ ] Calcula PnL no realizado correctamente para cripto_usd y bono_ars_tc
- [ ] Genera HTML con los 3 templates sin placeholders sin renderizar
- [ ] El JS del HTML recalcula M2 + expo + P&L al editar TC cierre
- [ ] El JS recalcula PnL cartera al editar cualquier precio
- [ ] html2canvas exporta el card como PNG limpio (sin barras)
- [ ] Escribe row en Cierres Diarios con todos los campos
- [ ] Actualiza Estado Operativo con nuevo arrastre
- [ ] Si último día hábil del mes, crea row en Cierres Mensuales
- [ ] No genera semanal el día que se genera mensual (si último día hábil = viernes)
- [ ] Devuelve resumen ejecutivo en chat siguiendo `chat_diario.md`

---

## Errores comunes que el SKILL puede cometer

1. **Tomar Currency como dictador de valuación** en vez de Metodo Valuacion. Falla con BTC (Currency=ARS) porque lo valúa con TC en vez de cripto_usd.
2. **Aplicar 3bps a USDT/ARS** (no aplica, solo USD/ARS).
3. **Computar BTC/ARS de cliente al TC pantalla** en vez de al TC cliente cotizado.
4. **Sumar ops Bitget al volumen** o al FIFO (no van a ninguno).
5. **Calcular σ incluyendo BTC/ARS** (siempre excluir).
6. **Olvidar el arrastre del día anterior** al armar el pool FIFO.
7. **Confundir Volumen Clientes con Volumen Cli ARG**: el KPI principal consolida TODO (Cli ARG + FX + Prop).
8. **No restar 3bps al Revenue mesa neto**.
9. **Calcular M1/M2 sobre Revenue Total** en vez de Revenue Cli ARG real.
10. **Generar HTML con tokens `[NOMBRE]` sin reemplazar**: el operador ve `[REVENUE_TOTAL]` literal en pantalla. Validar el HTML con regex antes de presentarlo (ver `templates/README.md`).

---

## Cómo correr una validación end-to-end

Sin tener el CSV original del 12/05 a mano (es input efímero), una validación más liviana:

1. Leer el row del 12/05 de Cierres Diarios en Notion
2. Comparar manualmente con esta tabla
3. Si todo coincide, el SKILL al menos LEE bien Notion
4. Si hay diferencias, hay bug en la lectura o en formato de campos

Para validación más profunda hace falta reprocesar un cierre con CSV. Pedirle al usuario el archivo del 12/05/2026 (si lo tiene guardado) y comparar el output del SKILL contra los valores arriba.
