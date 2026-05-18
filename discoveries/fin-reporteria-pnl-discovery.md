---
name: Reporte de P&L (FIN · PnL Skill) — Session Context
features: [FIN]
status: Concluida
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-05-17
propagates_to:
  - skills/ardua-pnl-report/SKILL.md
---

# Reporte de P&L (FIN · PnL Skill) — Session Context

> **DISCOVERY CONCLUIDO** — 2026-04-23
> Propagado a `skills/ardua-pnl-report/SKILL.md` (ver `propagates_to:`).
> Renombrado y reclasificado el 2026-05-17 al adoptar la regla de granularidad de 7 categorías: este discovery es una **funcionalidad** dentro del módulo FIN.Reportería, por eso pasa de `pnl-discovery.md` (sin prefijo, ambiguo) a `fin-reporteria-pnl-discovery.md`. El `features:` original era `[CLP]` por error — corregido a `[FIN]` consistente con el body §1.
> Resumen de decisiones que sobrevivieron: Skill que transforma MASTER.xlsx en reporte HTML print-ready con 4 tipos (daily/weekly/monthly/custom), layout único basado en Report 9, y `cost=0` en V1 para mantener paridad con el flujo manual de Santi. Output HTML (el usuario hace Cmd+P → PDF en el navegador). Lógica validada numéricamente contra Report 9 (match exacto dentro del error de redondeo).

---

## 1. Denominación y naturaleza

**Nombre:** Reporte de P&L
**Prefijo:** [PNL]
**Módulo de FIN al que pertenece:** Finanzas (ver `fin-session-context.md` §3) — sub-módulo de reportería financiera. No es Contabilidad, no es Tesorería. Es la capa analítica que hoy hace Santiago Fernández manualmente en Excel y que se va a mover a Claude como Skill.

Este proyecto resuelve un único problema bien delimitado: **transformar MASTER.xlsx en un reporte HTML print-ready de P&L, parametrizable por período.** No es un dashboard. No es una app. Es un generador de reportes.

**Canal Slack:** —  (ver Gap PNL-05 en §9 · pendiente de crear `#def-product-pnl-report`)

---

## 2. Ownership y handoff

| Persona | Rol |
| --- | --- |
| **Yasmani** | HoP · Dueño del Skill y del spec |
| **Santiago Fernández** | Dueño actual del proceso manual · Fuente de verdad funcional durante la transición |
| **Belén Gallo** | HoF · Consumidora eventual del reporte (ver Gap PNL-01) |

**Handoff acordado:** este proyecto toma el trabajo que Santi estaba haciendo en su máquina (`/Users/sfernandez/Desktop/P&L - FINAL/HTML/`) y lo consolida como Skill dentro de Claude. Yasmani asume el ownership de producto. Santi sigue como validador funcional hasta que el output del Skill quede indistinguible del reporte manual que él venía generando.

---

## 3. Fuente única: MASTER.xlsx

### 3.1 Ubicación canónica

**Path:** `/Users/yasmani/banks/MASTER.xlsx`

Esta es la ubicación que el Skill asume por contrato. Si el archivo no está ahí, el Skill falla con un mensaje claro. No hay fallback a otra ruta.

Acompañan en la misma carpeta:
- `COSTS.xlsx` — no se usa en V1 (ver §7 · decisión D-01)
- `Bridge/` — extractos crudos por partner, no se leen desde el Skill (son insumo upstream de MASTER)

### 3.2 Estructura canónica

MASTER.xlsx contiene una hoja por combinación **Partner + Moneda**. Cada hoja sigue el mismo esquema:

| Columna | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `Date` | date \| int serial | Sí | Se acepta serial de Excel o string parseable |
| `Partner` | string | Sí | `BR USD`, `BR EUR`, `CV USD`, `FV USD`, `LRM USD` |
| `Item` | string | Sí | `Deposit`, `Withdrawal`, `FX` |
| `Description` | string | Sí | Texto libre (contraparte) |
| `Amount` | number | Sí | Monto en moneda de la hoja, siempre positivo |
| `Segment` | string | Sí | Agrupador comercial · ver §3.4 |
| `Client Name` | string | Sí | Cliente final |
| `Type` | string | Sí | `WIRE`, `SWIFT`, `ACH`, `SEPA`, `SPEI`, `FX`, `CARD PURCHASE TXS`, `USDC` |
| `Ardua Fee` | % \| decimal | Sí | `"0.20%"` o `0.002` — se normaliza |
| `Ardua Fixed Cost` | number | No | USD, por defecto 0 |
| `Onboarding` | number | No | USD, por defecto 0 |
| `Original Fee` | string | No | Texto libre informativo |
| `Notes` | string | No | Flags operacionales · ver §4.4 |
| `FX Rate` | number | No | Solo para hojas no-USD. Alternativa: patrón `"TC X.XXX"` en Notes |

### 3.3 Hojas al 17/04/2026

| Hoja | Filas no vacías | Estado |
| --- | --- | --- |
| `BRIDGE USD` | 1.342 | Activa |
| `CONVERA USD` | 379 | Activa |
| `FV USD` | 232 | Activa |
| `BRIDGE EUR` | 17 | Activa (multi-moneda) |
| `CONVERA EUR` · `CONVERA GBP` · `CONVERA CAD` · `CONVERA CLP` · `LORUM USD` | 0 | Placeholder |
| `CRYPTO` | 0 | Placeholder — se excluye por nombre de hoja |
| `Sheet1` | 40 | Legacy · scratch — se excluye por nombre de hoja |

**Parseo de moneda:** el token final del nombre de la hoja define la moneda (`BRIDGE USD` → USD, `BR EUR` → EUR). Hojas cuyo nombre contiene `CRYPTO` se saltean.

**Total operable al 17/04:** 1.970 filas. Después de excluir `CARD PURCHASE TXS` (ver §4.2): 1.901 filas.

### 3.4 Segmentos — observación de calidad

Los valores de Segment tienen inconsistencias de caja y espacios (`Gilli` / `GILLI`, `BOMBO` / `Bombo`, `NO SEGMENT` / `"NO SEGMENT "` con espacio final). El Skill normaliza con `UPPER + TRIM` silenciosamente, pero el MASTER sigue sucio. Esto es un sub-caso del problema mayor de Referenciadores/Agrupadores como objeto compartido (ver memoria del proyecto Ardua Core). Por fuera del alcance del Skill V1.

---

## 4. Lógica del P&L

Esta sección es el contrato funcional del Skill. Toda la lógica que sigue está decodificada del prototipo `v10-2.html` (función `pXL` para parsing y `gPDF` para agregación) y validada numéricamente contra Report 9 del 14/04/2026 (ver §6.4).

### 4.1 Cómputo por fila

```
tc_rate  = FX Rate column
           OR match /TC\s*([\d,\.]+)/ en Notes
           OR 1 (default USD)

volume   = 0               si Notes contiene "OFF VOL"
         = amount           caso contrario

revenue  = 0                                                    si Notes contiene "OFF REV"
         = amount × tc_rate × ardua_fee + ardua_fix + onboarding  si moneda ≠ USD
         = amount × ardua_fee + ardua_fix + onboarding            si moneda = USD

cost     = 0               (V1 · decisión D-01)
profit   = revenue - cost  (equivale a revenue en V1)
```

**Semántica de Onboarding:** el campo representa un cargo de onboarding por end-client, no por cliente/referenciador. En el dataset actual GFG aparece con onboarding cobrado 36 veces — cada vez corresponde a un nuevo cliente final dado de alta bajo ese agrupador (`ALEX LERMAN`, `LUCAS PAIANO`, `CECILIA RODRIGUEZ`, etc.). No es un duplicado: se suma tal como viene. Total al 17/04: 107 filas con `Onboarding > 0`.

**Unidad de los fijos en operaciones no-USD:** tanto `Ardua Fixed Cost` como `Onboarding` están siempre expresados en USD, incluso en hojas como BRIDGE EUR. Solo la fee variable se aplica sobre el monto convertido (`amount × tc_rate`). Los fijos se suman directamente sin conversión. Validado contra BR EUR = $1,287.90 all-time al centavo.

### 4.2 Exclusiones

**De todos los agregados sin excepción** (Total, Prev, 7D avg, 30D avg, All-time avg):

- Filas con `Type === "CARD PURCHASE TXS"` — gastos de tarjeta interna de Ardua. En el dataset actual son 69 filas, todas en `FV USD`, todas etiquetadas `ON VOL / OFF REV / OFF COST`. El tag OFF REV ya pone revenue=0, pero el filtro por tipo es defensa adicional para sacarlas del conteo de transfers y del volumen (porque están ON VOL).
- Filas sin fecha parseable.

> **Nota de fix vs v10-2:** en el prototipo original, la exclusión `type !== "CARD PURCHASE TXS"` se aplicaba solo al filtro del período seleccionado (`d = AD.filter(...)`) pero no al cómputo de all-time averages, que usaban `AD` directo. Eso inflaba la columna `ALL-TIME AVG TRANSFERS` en 69 filas (Report 9 mostraba 1591.0 cuando el valor consistente es 1522.0). El Skill aplica la exclusión uniformemente en todas las agregaciones. Ver Decisión D-07.

Se excluyen del breakdown por Segment (pero **se cuentan** en Revenue/Volume/Transfers):
- `NO SEGMENT`
- `INTERNAL TRANSFER`
- `ARDUA CNT`

### 4.3 Períodos

El tipo de reporte determina el rango de fechas:

| Tipo | Desde | Hasta |
| --- | --- | --- |
| `daily` | última fecha disponible en el dataset | idem |
| `weekly` | última fecha − 6 días | última fecha disponible |
| `monthly` | última fecha − 29 días | última fecha disponible |
| `custom` | parámetro `from` | parámetro `to` |

**Período previo** = mismo largo en días, inmediatamente anterior al período actual. Se usa para los deltas % de la sección Period Comparison.

**Referencias:** 7D avg y 30D avg se calculan siempre contra la última fecha disponible (no contra el período seleccionado). All-time avg se calcula sobre todo el dataset dividido por la cantidad de días distintos con operaciones en el período seleccionado.

### 4.4 Flags de Notes · convención

El campo `Notes` contiene flags operacionales en formato libre. Los patrones reconocidos son:

| Patrón | Significado | Efecto |
| --- | --- | --- |
| `OFF VOL` | No contar en volumen (ej. rebote) | volume = 0 |
| `ON VOL` | Cuenta en volumen | default, informativo |
| `OFF REV` | No generar revenue | revenue = 0 |
| `OFF COST` | No imputar costo | No aplica en V1 (cost=0) |
| `ON COST` | Cuenta como gasto interno Ardua | No aplica en V1 (cost=0) |
| `TC X.XXX` | Tipo de cambio a USD | tc_rate se extrae del patrón |

Ocurrencia actual en MASTER: 151/1.970 filas (~8%) tienen al menos un flag.

**Gap conocido (PNL-02):** esta convención vive en un campo de texto libre. Frágil a typos, invisible para quien no la conoce, no auditable. Fuera del alcance del Skill V1; se marca para V2.

### 4.5 Net Flow

```
net_flow = Σ volume(Deposits) − Σ volume(Withdrawals)
```

Se muestra en la Performance Summary con etiqueta `net inflow` si ≥ 0, `net outflow` si < 0.

---

## 5. Output · HTML print-ready

### 5.1 Formato

- HTML único, self-contained (CSS inline, sin JS runtime dependencies)
- Optimizado para impresión A4 portrait vía `@media print` y `@page`
- El usuario lo abre en el navegador y usa `Cmd+P` → "Save as PDF" para obtener el PDF final
- El Skill **no** genera PDF directamente — genera HTML. La conversión la hace el navegador del usuario. Esto replica exactamente el flujo actual de Santi.

### 5.2 Secciones (layout canónico — Report 9)

1. **Header**
   - Logo Ardua · nombre
   - Tipo de reporte (`DAILY / WEEKLY / MONTHLY / CUSTOM P&L REPORT`)
   - Fecha de generación (día de la semana, fecha larga)
   - `DATA AS OF: YYYY-MM-DD` (última fecha del dataset)

2. **KPI row — 3 tarjetas**
   - `REVENUE TODAY` · valor · `+X.XX% vs prev` o `ALL TIME` si no hay período previo
   - `VOLUME TODAY` · idem
   - `TRANSFERS` · cantidad · `PROFIT: $X` en subline

3. **Performance Summary — 4 tarjetas**
   - `AVG REV / TXN` + `ALL-TIME: $X` benchmark
   - `REV / VOL RATIO` + `ALL-TIME: X.XXX%` benchmark
   - `LARGEST TXN`
   - `NET FLOW` con color según signo (verde inflow / rojo outflow)

4. **Period Comparison — tabla**
   - Filas: `REVENUE`, `VOLUME`, `TRANSFERS`
   - Columnas: `TOTAL`, `PREV`, `Δ%`, `7D AVG`, `30D AVG`, `ALL-TIME AVG`

5. **Bank Breakdown + Rail & Society — 2 columnas**
   - Izquierda · Bank Breakdown: barras por partner ordenadas por revenue desc, con % del total
   - Derecha · Rail & Society: tipos de transferencia (WIRE, SWIFT, ACH, SEPA, etc.) con revenue, separador, y top 5 segmentos con revenue. Línea final: `"<TOP SEGMENT>: X.X% of revenue"`

6. **Currency Breakdown — tabla (condicional)**
   - Solo aparece si el dataset filtrado tiene más de una moneda
   - Columnas: `CCY`, `TXNS`, `REVENUE`, `VOLUME`, `% REV`

7. **Footer**
   - `ARDUA OPERATIONS · GENERATED <timestamp>`
   - `CONFIDENTIAL · INTERNAL USE ONLY · DO NOT DISTRIBUTE`

### 5.3 Formato de números

- Moneda USD con 2 decimales en tablas y KPIs grandes: `$264,649.26`
- Abreviación para montos ≥ $1K en tarjetas y barras: `$2.64M`, `$130.85M`, `$-364.57K`
- Porcentajes con 2 decimales y signo: `+0.20%`, `−44.40%`
- Rev/Vol ratio con 3 decimales: `0.185%`
- Miles separados por coma · decimales con punto (formato en-US)

### 5.4 Naming del archivo output

`Ardua_PnL_<TIPO>_<FECHA_HASTA>.html`

Ej: `Ardua_PnL_DAILY_2026-04-14.html`, `Ardua_PnL_WEEKLY_2026-04-14.html`, `Ardua_PnL_CUSTOM_2026-01-01_2026-03-31.html`

---

## 6. Estado del prototipo y validación

### 6.1 Qué existe

- `/Users/yasmani/Products/P&L/html/` — 19 iteraciones HTML (v1 → v10-2, más report v1-v4)
- `/Users/yasmani/Products/P&L/reports /Mockups/` — 9 PDFs exportados (Reports 1-9)
- `/Users/yasmani/Products/P&L/banks/` — copia de trabajo de MASTER.xlsx y COSTS.xlsx

### 6.2 Qué se rescata para el Skill

- **`v10-2.html`** es la referencia funcional canónica. La función `gPDF()` es el contrato del output, con el fix de consistencia de §4.2 aplicado.
- **Report 9** es el mockup visual canónico (layout y tipografías).

### 6.3 Qué se archiva

Todo el resto del contenido de `/Users/yasmani/Products/P&L/html/` es histórico. Para V1 no se va a tocar ni migrar. Una vez que el Skill esté validado, el flujo pasa íntegramente por Claude y esta carpeta queda como archivo histórico.

### 6.4 Validación numérica de la lógica decodificada

La lógica de §4 fue implementada en Python y corrida sobre el MASTER.xlsx actual (17/04/2026). Resultados vs Report 9 (daily para 2026-04-13):

| Métrica | Computed | Report 9 | Delta |
| --- | --- | --- | --- |
| Revenue | $4,872.37 | $4,872.38 | $0.01 (redondeo acumulado) |
| Volume | $2,635,431.44 | $2.64M | — |
| Transfers | 16 | 16 | 0 |
| Avg Rev/Txn | $304.52 | $304.52 | 0 |
| Rev/Vol Ratio | 0.185% | 0.185% | 0 |
| Largest Txn | $1,200,000.00 | $1.20M | — |
| Net Flow | $-364,568.56 | $-364.57K | — |
| Top Segment | DIRECT CLIENT 59.3% | DIRECT CLIENT 59.3% | 0 |

**Resultado:** match exacto dentro del error de redondeo esperable.

**Nota sobre Report 8 (all-time):** no se puede usar como referencia directa porque el MASTER.xlsx evolucionó después del 14/04 (se agregaron las 379 filas de Convera USD el 15/04). Report 8 fue generado sobre un snapshot anterior que no incluía CV USD. La paridad Report 8 no es un criterio válido — el Skill debe funcionar con cualquier estado de MASTER.xlsx.

---

## 7. Decisiones tomadas (sesión 17/04/2026)

| # | Decisión | Razón |
| --- | --- | --- |
| D-01 | **Cost = 0 en V1.** No se usa COSTS.xlsx. | Los fees reales de partners tienen lógica de tiers por volumen, onboarding que ya se cobra al cliente, fees intercompany. Ninguna de esas reglas está cerrada. Replicar el output actual (que ya muestra cost=0) mantiene paridad con Santi. Se marca para V2. |
| D-02 | **Layout único: Report 9.** | Es el diseño que Santi iteró hasta último momento. Mantener una sola plantilla evita divergencia en V1. Report 7 (layout denso alternativo) queda descartado. |
| D-03 | **Los 4 tipos de reporte en V1:** `daily`, `weekly`, `monthly`, `custom`. | La lógica adicional sobre Daily es trivial — solo cambia el rango de fechas. Se puede testear el mismo día. |
| D-04 | **Ubicación canónica de MASTER.xlsx:** `/Users/yasmani/banks/MASTER.xlsx`. | Pendiente crear esa carpeta. El Skill asume esta ruta por contrato. |
| D-05 | **Output: HTML, no PDF.** El usuario hace Cmd+P para obtener PDF. | Replica exactamente el flujo de Santi. Evita dependencias de libs de PDF (WeasyPrint, etc.) en el Skill. El HTML queda como artefacto inspeccionable. |
| D-06 | **Vehículo: Skill.** Eventualmente puede quedar envuelto en una Task para cadencia automática, pero no en V1. | La lógica todavía tiene gaps (flags de Notes en texto libre, cost no computado). Automatizar antes de estabilizar es prematuro. |
| D-07 | **Consistencia de exclusión de CARD PURCHASE TXS en todos los agregados.** Fix respecto de `v10-2.html`. | v10-2 aplica la exclusión solo al filtro del período (`d`) pero no al cómputo de all-time averages (`AD` directo), inflando `ALL-TIME AVG TRANSFERS` en 69 filas. El Skill aplica la exclusión uniformemente. Diferencia numérica contra Report 9: esa métrica pasa de 1591.0 a 1522.0. Impacto en otras métricas: nulo (las 69 filas tienen revenue = 0 y volume = 0 por tags OFF VOL/OFF REV). |
| D-08 | **Onboarding se suma tal como viene, por fila.** | Cada fila con `Onboarding > 0` representa un nuevo end-client cobrado, no un duplicado. El mismo Referenciador/Agrupador puede disparar múltiples cargos de onboarding (uno por cada cliente final que trae). Semántica confirmada contra el dataset. |

---

## 8. Principios validados contra el Framework

Antes de avanzar al spec, se valida que el Skill cumple los tres filtros del Design Framework (ver `project-instructions` §5):

**¿Es legalmente soportado?** No aplica directamente — el Skill es una herramienta de reportería interna, no un flujo de producto hacia clientes. No ejecuta operaciones, no mueve fondos, no firma con nadie. Lee un Excel y produce HTML.

**¿Es operable en la práctica?** Sí. Fuente única (MASTER.xlsx en ruta fija), input determinístico (tipo de reporte + fechas), output determinístico (HTML estructurado). Sin dependencias de terceros, sin conexión a sistemas externos.

**¿Es contablemente soportado?** No aplica — el reporte es analítico interno, no genera asientos ni afecta libros. Reporta números que salen de una fuente manual (MASTER), por lo tanto hereda su confiabilidad pero no agrega riesgo contable nuevo.

Conclusión: el Skill pasa el filtro. Los riesgos reales son de **calidad del dato upstream** (MASTER.xlsx es producido manualmente por Santi a partir de los extractos de Bridge/Convera/FV) y de **convención de flags** (Notes en texto libre), ambos fuera del alcance del Skill V1.

---

## 9. Gaps abiertos

| # | Gap | Owner | Prioridad |
| --- | --- | --- | --- |
| PNL-01 | Consumidor primario del reporte no confirmado. Hoy sirve a Yasmani y Santi para validación interna. ¿Termina yendo a Belén, Fede, board? | HoP + HoF | Media — define si hay que agregar secciones/contexto/summary ejecutivo en V2 |
| PNL-02 | Convención de flags `Notes` en texto libre — no auditable, fácil de tipear mal | HoP + Santi | Media — formalizar como columnas booleanas en MASTER o migrar a COM/OPS cuando el ledger interno exista |
| PNL-03 | Cost real no se computa — profit mostrado es revenue bruto, no neto | HoP + Belén | Alta para V2 — requiere definir reglas con Finanzas (volume tiers, onboarding no double-counting, fees intercompany) |
| PNL-04 | Calidad de dato en Segment (casing/espacios) — se normaliza silenciosamente pero persiste en MASTER | OPS / COM | Baja — resolver cuando Referenciadores/Agrupadores sea catálogo compartido |
| PNL-05 | Canal Slack del proyecto no creado (`#def-product-pnl-report`) | HoP | Baja — crear cuando entre Santi y eventualmente Belén al loop |
| PNL-06 | Proceso upstream (Santi transformando extractos raw de Bridge/Convera/FV a MASTER con las RULES de COSTS.xlsx) sigue manual — el Skill no lo resuelve | HoP | Alta para V2 — eventualmente automatizar el ETL de extractos a MASTER |
| PNL-07 | Onboarding como feature: en la Era 1 había sección "New Client Onboarding" en el PDF. Se descartó en Reports 8/9. ¿Reintroducir en V2? | HoP | Baja — confirmar con Santi / Belén |

---

## 10. Próximos pasos

| # | Acción | Owner |
| --- | --- | --- |
| 1 | **Spec del Skill** ✅ completado — `features/ardua-pnl-report.md` | HoP |
| 2 | Construcción del Skill en `/mnt/skills/user/ardua-pnl-report/SKILL.md` + scripts auxiliares | **HoP** |
| 3 | Validación con Santi: generar reportes del mismo período con el Skill y con su flujo manual, comparar output | HoP + Santi |
| 4 | Crear `/Users/yasmani/banks/` y mover MASTER.xlsx ahí | HoP |
| 5 | Archivar `/Users/yasmani/Products/P&L/html/` como referencia histórica (no borrar) | HoP |
