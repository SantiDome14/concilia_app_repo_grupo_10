# Reporte de P&L — Skill

> Módulo: Finanzas (FIN) · Skill de reportería
> Tipo: Skill interno · Claude
> Jira: —
> Prioridad: Alta
> Status: Spec V1 · Validado numéricamente contra prototipo · Pendiente construcción
> Last updated: 2026-04-17

---

## Contexto

Santiago Fernández (Finanzas) genera manualmente un reporte de P&L a partir de `MASTER.xlsx`, un Excel que consolida todos los movimientos operativos de Ardua por Partner y moneda. El proceso actual vive en su máquina local (`/Users/sfernandez/Desktop/P&L - FINAL/`): abre un HTML, pega la data, presiona Cmd+P y guarda el PDF.

Este flujo tiene tres problemas:

- Depende de que Santi esté disponible y de que su máquina tenga el HTML y el MASTER actualizados
- La lógica del cómputo vive embebida en un HTML de 789kb sin documentación ni tests
- Los reportes no son reproducibles: misma fuente, persona distinta, puede dar resultados distintos

La transición lleva este proceso íntegramente a Claude como Skill. Santi sigue alimentando MASTER.xlsx (ETL upstream manual a partir de los extractos de Bridge, Convera y FV), pero la generación del reporte pasa a ser invocable desde cualquier conversación con Claude.

La discovery completa del proyecto está en `discovery/pnl-session-context.md`. Este spec es el contrato funcional del Skill.

---

## Objetivo

Proveer una forma determinística, invocable desde Claude, de transformar `MASTER.xlsx` en un reporte HTML print-ready de P&L para un período dado, con paridad numérica exacta contra la lógica del prototipo `v10-2.html` (referencia funcional) y paridad visual contra el Report 9 del 14/04/2026 (referencia de diseño).

---

## Principios de diseño

- **Single source of truth:** el Skill lee un y solo un archivo — `/Users/yasmani/banks/MASTER.xlsx`. No acepta otros paths, no busca en múltiples ubicaciones, no hace fallback. Si no está ahí, falla.
- **Output es HTML, no PDF.** El Skill genera HTML print-ready. El usuario hace Cmd+P → "Save as PDF" para obtener el PDF final. Esto replica el flujo de Santi y evita dependencias pesadas de libs de PDF.
- **Lógica congelada en V1.** Las fórmulas de revenue, volume, profit y manejo de flags de Notes están documentadas en `pnl-session-context.md` §4. El Skill las implementa tal cual. Cambios en la lógica son V2.
- **Consistencia interna sobre paridad visual.** Cuando la lógica decodificada del prototipo tiene una inconsistencia (bug), el Skill aplica la regla correcta — documentada — en vez de replicar el bug. Un caso concreto: exclusión de `CARD PURCHASE TXS` en todas las agregaciones (ver §3).
- **Fail loud, not silent.** Si falta una columna obligatoria, si el archivo no existe, si una fecha no parsea, el Skill responde con un mensaje claro. No asume valores por default, no salta filas sin avisar.
- **Cero UI propia.** El Skill no pide confirmaciones innecesarias ni muestra progreso ornamental. Input → output.

---

## Consumidor y uso esperado

**Consumidor primario V1:** uso interno — Yasmani (HoP), Santiago Fernández (Finanzas), Belén Gallo (HoF).

**Escalamiento futuro:** no está definido si el output eventual termina circulando a CEO / board. El formato y el footer ("CONFIDENTIAL · INTERNAL USE ONLY · DO NOT DISTRIBUTE") están preparados para ese escenario sin requerir cambios.

**Patrón de invocación:** el usuario escribe en cualquier conversación pedidos como:

- "Generá el reporte de P&L diario"
- "Necesito el P&L semanal"
- "Armá el P&L mensual"
- "Generá el P&L entre el 1 de enero y el 31 de marzo"

Claude reconoce el patrón, carga el Skill, y ejecuta.

---

## Alcance funcional — V1

### 1. Tipos de reporte soportados

| Tipo | Rango | Trigger típico |
| --- | --- | --- |
| **Daily** | Última fecha disponible en el dataset | "P&L de hoy", "reporte diario", "daily" |
| **Weekly** | Última fecha − 6 días hasta última fecha | "P&L semanal", "últimos 7 días", "weekly" |
| **Monthly** | Última fecha − 29 días hasta última fecha | "P&L mensual", "últimos 30 días", "monthly" |
| **Custom** | Rango arbitrario definido por el usuario | "P&L del 1 al 31 de enero", "custom" |

**Observación importante:** el Skill toma como referencia la **última fecha que aparece en MASTER.xlsx**, no la fecha del sistema. Si Santi dejó de cargar hace 3 días, "daily" reporta el día de la última carga, no el día actual. Esto se indica explícitamente en el header del reporte (campo `DATA AS OF: YYYY-MM-DD`).

### 2. Parámetros de entrada

| Parámetro | Requerido | Default | Formato |
| --- | --- | --- | --- |
| `report_type` | Sí | `daily` | uno de `daily` / `weekly` / `monthly` / `custom` |
| `from_date` | Solo si `custom` | — | `YYYY-MM-DD` |
| `to_date` | Solo si `custom` | — | `YYYY-MM-DD` |

Si el usuario pide custom sin fechas, el Skill se las pide explícitamente antes de ejecutar.

### 3. Lógica de cómputo

Todas las fórmulas de revenue, volume, cost, profit, net flow, exclusiones, normalización multi-moneda, flags de Notes y período previo están definidas en `pnl-session-context.md` §4.

**Reglas clave que el Skill debe cumplir sin excepción:**

- `cost = 0` en V1 (decisión D-01 del context)
- Segmentos con inconsistencias de caja/espacio se normalizan con `UPPER + TRIM` en memoria, sin modificar el archivo fuente
- Hojas que contienen `CRYPTO` en el nombre se saltean · hoja `Sheet1` también se saltea (legacy)
- **Filas con `Type === "CARD PURCHASE TXS"` se excluyen desde el parseo — no entran al dataset en memoria.** Esto garantiza consistencia de la exclusión en TODOS los agregados (total del período, período previo, 7D avg, 30D avg, all-time avg). Es un fix deliberado vs `v10-2.html`, donde el filtro solo se aplicaba al período seleccionado y no al cálculo de all-time averages. Ver Decisión D-07 del context.
- Segmentos `NO SEGMENT`, `INTERNAL TRANSFER`, `ARDUA CNT` se cuentan en Revenue/Volume/Transfers pero se excluyen del segment breakdown
- Onboarding se suma tal como viene en cada fila — cada aparición de `Onboarding > 0` representa un nuevo end-client cobrado, no un duplicado (ver D-08 del context)

### 4. Estructura del output HTML

Las 7 secciones del layout, sus cálculos y su formato de números están definidos en `pnl-session-context.md` §5. El Skill debe producir exactamente ese layout, sin variaciones.

### 5. Naming y ubicación del archivo output

**Path de salida:** `/Users/yasmani/banks/reports/`

**Nombre del archivo:**

| Tipo | Nombre |
| --- | --- |
| Daily | `Ardua_PnL_DAILY_<YYYY-MM-DD>.html` |
| Weekly | `Ardua_PnL_WEEKLY_<YYYY-MM-DD>.html` |
| Monthly | `Ardua_PnL_MONTHLY_<YYYY-MM-DD>.html` |
| Custom | `Ardua_PnL_CUSTOM_<FROM>_<TO>.html` |

La fecha en daily/weekly/monthly es la fecha `hasta` del rango. En custom, ambas fechas explícitas.

Si ya existe un archivo con el mismo nombre, se sobreescribe sin preguntar.

### 6. Respuesta de Claude al usuario

Luego de generar el archivo, Claude responde con:

1. Confirmación de ejecución (1 línea): tipo, rango, cantidad de transacciones procesadas
2. Path del archivo generado
3. Resumen numérico de 4 métricas: Revenue, Volume, Transfers, Top Segment
4. Recordatorio de Cmd+P para exportar a PDF

Ejemplo de respuesta esperada:

> P&L Daily generado · 14/04/2026 · 16 transacciones procesadas
> Archivo: `/Users/yasmani/banks/reports/Ardua_PnL_DAILY_2026-04-14.html`
> Revenue: $4,872.38 · Volume: $2.64M · Transfers: 16 · Top Segment: DIRECT CLIENT (59.3%)
> Abrí el archivo en el navegador y usá Cmd+P → "Save as PDF" para exportar.

---

## Fuera de alcance V1

| # | Item | Destino |
| --- | --- | --- |
| OOS-01 | Cómputo de costo real de partners desde `COSTS.xlsx` | V2 (gap PNL-03 del context) |
| OOS-02 | Sección "New Client Onboarding" en el PDF | V2 (gap PNL-07) · se descartó en Reports 8/9, queda afuera por default |
| OOS-03 | Generación directa de PDF (el Skill solo produce HTML) | No planificado · depende de que el flujo Cmd+P deje de ser viable |
| OOS-04 | Corrección/normalización persistente de segmentos en MASTER | V2 · se resuelve cuando Referenciadores/Agrupadores sea catálogo compartido |
| OOS-05 | Layout alternativo tipo Report 7 (denso, con columna COST visible) | No planificado |
| OOS-06 | Cadencia automática (Task programada) | Post-V1 · requiere que la lógica esté estable y validada |
| OOS-07 | Soporte para múltiples archivos MASTER (histórico/snapshots) | No planificado |
| OOS-08 | Export a Google Sheets / Slack / email | V2 según demanda |

---

## Errores contemplados

El Skill debe manejar explícitamente los siguientes casos:

| Caso | Mensaje esperado |
| --- | --- |
| `MASTER.xlsx` no existe en la ruta canónica | "No encuentro MASTER.xlsx en `/Users/yasmani/banks/`. Verificá que el archivo esté en esa ubicación." |
| `MASTER.xlsx` existe pero no tiene hojas procesables | "MASTER.xlsx no contiene hojas con datos. Revisá que al menos una hoja de Partner tenga filas." |
| Falta alguna columna obligatoria (Date, Partner, Item, Amount, Segment) | "La hoja `<nombre>` no tiene la columna `<columna>`. Columnas obligatorias: Date, Partner, Item, Amount, Segment." |
| Tipo de reporte custom sin fechas | Claude pide las fechas antes de ejecutar |
| Fecha del usuario en formato no reconocido | "No pude interpretar la fecha `<input>`. Usá formato YYYY-MM-DD o decímelo en lenguaje natural (ej. 14 de abril)." |
| `from_date` > `to_date` | "La fecha desde (`<from>`) es posterior a la fecha hasta (`<to>`). Invertí el orden." |
| Rango custom sin movimientos | El reporte se genera igual, con valores en 0 y una advertencia visible en el header: "NO HAY MOVIMIENTOS EN EL PERÍODO SELECCIONADO" |
| Moneda no-USD sin `FX Rate` ni patrón `TC X.XXX` en Notes | El Skill usa tc_rate = 1, suma la fila al cálculo, y reporta al final cuántas filas quedaron sin normalización. No falla el reporte por esto. |

---

## Criterios de aceptación

Para considerar V1 cerrada, el Skill debe cumplir los siguientes tests:

### CA-01 · Paridad numérica con Report 9 (daily)

Ejecutar el Skill en modo `daily` con el MASTER.xlsx vigente al 17/04/2026, filtrado al día 2026-04-13, debe producir los mismos valores que Report 9 (tolerancia de $0.01 por redondeo acumulado):

- Revenue: $4,872.38
- Volume: $2.64M ($2,635,431.44)
- Transfers: 16
- Avg Rev/Txn: $304.52
- Rev/Vol Ratio: 0.185%
- Largest Txn: $1.20M
- Net Flow: $-364.57K
- Top Segment: DIRECT CLIENT (59.3%)
- Bank Breakdown: BR USD 100%

Esta validación ya fue corrida en Python durante el discovery y está documentada en `pnl-session-context.md` §6.4.

### CA-02 · Consistencia interna de agregaciones

El Skill debe cumplir las siguientes identidades numéricas sobre cualquier MASTER.xlsx válido:

- `Revenue total del período` = Σ revenue de todas las filas filtradas
- `Revenue total del período` = Σ revenue por partner = Σ revenue por moneda = Σ revenue por segmento (incluyendo los excluidos del breakdown)
- `Transfers total` = suma de transfers por partner = cantidad de filas en el dataset filtrado
- `ALL-TIME AVG TRANSFERS` = `total_rows_en_dataset / días_distintos_en_período` — NO incluye CARD PURCHASE TXS (fix vs v10-2, ver D-07 del context)
- Para el dataset actual, `ALL-TIME AVG TRANSFERS` en un reporte daily debe dar 1522.0, no 1591.0 como muestra Report 9

### CA-03 · Paridad visual con Report 9

El HTML generado, impreso a PDF desde Safari con "A4 portrait", debe ser visualmente indistinguible de Report 9. Se valida por comparación directa de PDFs.

### CA-04 · Los 4 tipos de reporte funcionan

Ejecutar daily, weekly, monthly y custom sobre el mismo MASTER produce 4 archivos distintos, con rangos de fecha correctos en el header y cálculos consistentes entre sí (ej. el revenue del daily debe estar contenido dentro del weekly).

### CA-05 · Manejo correcto de flags `Notes`

Filas con `OFF VOL` no suman al Volume. Filas con `OFF REV` no suman al Revenue. Filas no-USD con `TC X.XXX` en Notes usan ese tipo de cambio para normalizar a USD. Para BR EUR con la data del 17/04 el revenue all-time debe dar $1,287.90.

### CA-06 · Errores claros

Cada caso de error listado en la sección anterior produce el mensaje exacto documentado.

### CA-07 · Santi-approved

Santiago Fernández compara el output del Skill contra el reporte que él generaría para el mismo período, y confirma equivalencia funcional.

---

## Validación contra Design Framework

- **Legalmente soportado:** N/A · el Skill no ejecuta operaciones ni mueve fondos
- **Operable en la práctica:** Sí · input determinístico, output determinístico, sin dependencias externas de runtime
- **Contablemente soportado:** N/A · el reporte es analítico interno, no genera asientos

Riesgos residuales documentados en `pnl-session-context.md` §9 (gaps PNL-02 a PNL-07).
