---
name: ardua-weekly-report
description: "Genera el reporte semanal de Producto de Ardua. Activar SIEMPRE ante frases como hacer el reporte semanal, reporte de la semana, armar el weekly, cerrar la semana, mandar el reporte, weekly report, o cualquier variacion que indique cierre semanal del PM. Recolecta datos de Jira, Notion, Slack e historial de Claude, sintetiza el reporte con agrupamiento por Area e impacto narrativo, y lo envia a #product previa revision del PM. Nunca enviar el reporte sin revision explicita del PM."
---

# Ardua Weekly Report

Genera el reporte semanal de Santi Domeniconi (Technical PM, Ardua Solutions). El proceso es determinista: recolectar → sintetizar → revisar → enviar.

---

## Audiencia y tono

- **Canal destino:** `#product` (`C0A7E419292`) — Federico Fernandez (CEO) y Yasmani Rodriguez (HOP).
- **Tono:** informativo, formal, directo. El CEO lee esto — sin detalles técnicos innecesarios.
- **Formato:** Slack markdown. Emojis solo para encabezados de sección.
- **Firma fija:** `_Sent using_ <@U0AHZHTQE22|Claude>`

---

## Fase 1 — Reporte semanal

### Paso 1.1 — Solicitar inputs

1. **URL de la task list de Notion de esta semana.** Cambia cada semana; siempre pedirla.
2. **¿Hay algo clave que agregar o excluir?** (opcional).

No continuar hasta tener el URL de Notion.

---

### Paso 1.2 — Recolección de datos

#### A) Jira — estados reales del proyecto PWI

Cloud ID: `53eec1f8-a156-4af9-bc3a-d6142b50e0cc`

**Estados reales del tablero PWI (usar exactamente estos nombres en JQL):**

| Estado Jira | Significado | Mapeo al reporte |
|---|---|---|
| `TO DO` | Recién creado, sin análisis | Nuevas iniciativas |
| `IN ANALYSIS` | En análisis activo | En curso |
| `READY FOR DEV` | Definido, esperando pasarlo a dev | En curso |
| `BLOCKED` | Bloqueado (causa externa) | Bloqueos |
| `SENT TO DEV` | Cerrado desde Producto, épica en EWI | Cerrado |
| `Done` | Completado | — (no incluir) |
| `Deprecated` | Descartado | — (no incluir) |

**Query principal — toda la actividad de la semana (PWI):**
```jql
project = PWI AND (assignee = currentUser() OR reporter = currentUser())
AND updated >= -7d
ORDER BY updated DESC
```
`maxResults: 50`, campos: `summary`, `status`, `priority`, `customfield_10310` (Business Area), `customfield_10306` (Blocked cause), `created`, `updated`.

> ⚠️ `status changed to "SENT TO DEV" during (startOfWeek(), now())` puede devolver items en estado `Done` de semanas anteriores — usar esta query amplia y clasificar manualmente.

**Clasificar resultados manualmente:**

| Criterio | Sección |
|---|---|
| `status = "SENT TO DEV"` + `updated >= lunes de esta semana` | ✅ Cerrado |
| `status = "IN ANALYSIS"` | 🔄 En curso (**solo este estado**) |
| `status = "READY FOR DEV"` | **Excluir** — ticket definido, sin acción de producto activa |
| `status = "BLOCKED"` | 🚨 Bloqueos |
| `status = "TO DO"` + `created >= lunes de esta semana` | ✨ Nuevas iniciativas |

**EWI tickets:** Si hay actividad product-driven en el tablero de Technology (ej. actualización de esquema a pedido de un stakeholder), incluir con prefijo `EWI-XX`. Query adicional:
```jql
project = EWI AND (assignee = currentUser() OR reporter = currentUser())
AND updated >= -7d ORDER BY updated DESC
```

#### B) Notion — task list de la semana

1. `notion-fetch` sobre el URL provisto.
2. Identificar el `data-source-url` de la DB inline (`collection://[UUID]`).
3. Consultar todos los registros via view mode (Kanban o Activas).
4. Schema vigente: `Task name` (título), `Estado` (NO INICIADA · EN CURSO · EN OTRA CANCHA · RESUELTA), `Área` (Trading Desk · Legal & Compliance · Operations · Finance & Accounting · Sales & Partnerships · Management · Miles/N8N · Framework · Ops de Producto), `Impacto` (texto libre), `REQ` (referencia a ticket).

**Mapeo Estado → sección del reporte:**

| Estado Notion | Sección |
|---|---|
| `RESUELTA` | ✅ Cerrado |
| `EN CURSO` | 🔄 En curso |
| `EN OTRA CANCHA` | 🔄 En curso (con indicador) o 🚨 Bloqueos |
| `NO INICIADA` | Solo si es nueva iniciativa de esta semana |

#### C) Slack — reporte anterior y contexto semanal

Usar `slack_search_public_and_private` con query `"Resumen semanal" from:<@U0B1MM6MF0U> in:#product`. Leer el mensaje más reciente via `slack_read_thread` si tiene hilo. Extraer "En curso" y "Bloqueos" del reporte anterior para detectar avances.

**Canales a escanear** (usar `slack_read_channel` con `limit=20` para Alta prioridad; `limit=10` para el resto):

| Canal | ID | Prioridad |
|---|---|---|
| `#req-product-trading-desk` | `C0AJMRFP0TD` | Alta |
| `#req-product-legal-compliance` | `C0AJ67HK0ES` | Alta |
| `#req-product-operations` | `C0AK2PW5BGQ` | Media |
| `#req-product-finance-accounting` | `C0AJ2599DA6` | Media |
| `#req-product-sales-partnerships` | `C0AKNPCNNSU` | Media |
| `#pagos` | `C09T2RWMTK9` | Media |
| `#req-product-notifications` | `C0AS1BPV9QU` | Baja |

#### D) Atlassian Rovo — Enriquecimiento semántico

Ejecutar después de la recolección de Jira y Notion. Rovo Search hace búsqueda semántica cross-source (Jira + Confluence) y aporta contexto cualitativo que los campos estructurados no capturan.

Usar `Atlassian Rovo:search` con las siguientes reglas:

**Cuándo y qué buscar:**

| Condición | Query Rovo | Propósito |
|---|---|---|
| Hay 1+ ítems en estado `BLOCKED` | `"[summary del ticket bloqueado]"` | Encontrar decisiones o Confluence pages que expliquen la causa o el camino a desbloqueo |
| El reporte anterior tenía bloqueos que esta semana no aparecen | `"[summary del ticket desbloqueado]"` | Confirmar contexto del desbloqueo para el indicador `↗ desbloqueado` |

**Instrucciones operativas:**
- Máximo **2 búsquedas Rovo por sesión** — priorizar bloqueados.
- Si Rovo no devuelve resultados útiles, continuar sin bloquear la síntesis.
- Los resultados de Rovo son contexto de enriquecimiento, no reemplazan los datos estructurados.

#### E) Historial de conversaciones Claude — trabajo no capturado en Jira ni Notion

Mucho trabajo de producto queda en sesiones de Claude sin generar ticket ni tarea en Notion: discoveries mejorados, wireframes construidos, reqs emitidos, decisiones de diseño documentadas. Capturarlo evita que el reporte subestime la semana.

```json
recent_chats: { "n": 10, "sort_order": "desc" }
```

Revisar títulos y resúmenes de la semana. Incluir en el reporte si:
- Se creó o mejoró un discovery
- Se construyó un wireframe para validación con stakeholder
- Se emitió un REQ vía req-definition
- Se documentó una decisión o se actualizó un feature file

Agrupar en `🗂️ Otras tareas`. **No duplicar lo que ya cubrió Jira o Notion.**

#### E) Historial de conversaciones Claude — trabajo no capturado en Jira ni Notion

Mucho trabajo de producto queda en sesiones de Claude sin generar ticket ni tarea en Notion: discoveries mejorados, wireframes construidos, reqs emitidos, decisiones de diseño documentadas. Capturarlo evita que el reporte subestime la semana.

```json
recent_chats: { "n": 10, "sort_order": "desc" }
```

Revisar títulos y resúmenes de la semana. Incluir en el reporte si:
- Se creó o mejoró un discovery
- Se construyó un wireframe para validación con stakeholder
- Se emitió un REQ vía req-definition
- Se documentó una decisión o se actualizó un feature file

Agrupar bajo el área correspondiente o bajo `Operaciones de Producto` / `Framework`. **No duplicar lo que ya cubrió Jira o Notion.**

---

### Paso 1.3 — Síntesis

#### Principio central

El reporte tiene **dos categorías**, en orden fijo de importancia:

1. **REQs a IT** — los PWIs que pasaron a SENT TO DEV esta semana. Este es el KPI del área. Va primero, detallado, uno por uno.
2. **Otras tareas** — todo lo demás (en curso, framework, Miles, wireframes, discoveries, bloqueos si son pocos). Va comprimido. Máximo 5 bullets, agrupando lo relacionado.

Longitud objetivo del mensaje completo: **≤ 12 líneas de contenido**. Si el borrador supera eso, comprimir Otras tareas antes de tocar REQs a IT.

#### A — Deduplicación

Cruzar Jira, Notion y Claude history por campo `REQ` / ticket key. Datos más ricos ganan: contexto Claude > descripción Jira > nombre de tarea Notion. Cada ítem aparece una sola vez.

#### B — Sección REQs a IT

Un bullet por cada PWI (o EWI product-driven) que pasó a SENT TO DEV esta semana. Agrupados por área.

El header de la sección siempre lleva un calificativo narrativo que contextualiza la semana más allá del número de REQs:

```
📦 _[N] REQ(s) a IT | [frase corta que describe el carácter de la semana]
```

Ejemplos de calificativos:
- `semana de pipeline — 2 iniciativas abiertas, 2 wireframes activos`
- `semana de volumen — 5 REQs cerrados en LEX + TRD + OPS`
- `semana de bloqueos — 0 REQs cerrados, 3 pendientes de decisión gerencial`
- `semana de discovery — REFACTOR CLP iniciado, panel-cliente avanzado`

El calificativo se construye mirando el conjunto de la semana: throughput, iniciativas nuevas, trabajo de discovery, wireframes activos. No inventar — reflejar lo que realmente pasó.

El bullet **no describe qué se hizo** — describe **qué habilita, qué problema elimina, qué capacidad crea**:

Para clusters (2+ ítems):
```
[Área]
• PWI-XX — [nombre] → [qué habilita o resuelve en el negocio]
```

Ejemplos:
```
Legal & Compliance
• PWI-53 — Historial de quotes en LEX → operadores de límites ven los quotes de TRD sin salir del legajo del cliente.
• PWI-72 — Historial de intentos AiPrise → Legal opera siempre sobre el último estado real del cliente, no sobre un intento rechazado.

Operations
• PWI-44 — Variables en Deposit Instructions → elimina carga manual de SWIFT (~10–30 instrucciones/semana).
```

Si 0 REQs pasaron a IT esta semana, la sección dice `_0 REQs a IT — [razón o contexto breve]_` y el peso del mensaje pasa a Otras tareas.

#### C — Sección Otras tareas

Todo lo que no es SENT TO DEV: trabajo en curso, framework, Miles/N8N, wireframes, discoveries, trabajo interno, nuevas iniciativas, bloqueos menores.

**Reglas de compresión:**
- Items relacionados del mismo tema van en **un solo bullet**: `[Tema]: item1, item2 y item3`
- Sin sub-headers de área
- Máximo 5 bullets en total
- Cada bullet responde: ¿qué avanzó o qué se creó?
- Bloqueos activos van aquí si son 1 o 2; si son 3+, armar sección `🚨` separada al final

> **Ítem sin categoría clara:** Si no es posible inferir el grupo con confianza, preguntar antes de clasificar: _"No tengo claro dónde va '[nombre]' — ¿en Otras tareas como [opción A] o [opción B]?"_. No asumir ni inventar.

Ejemplo de compresión:
```
❌ Sin comprimir (4 bullets):
• Miles — REQ Approval Locks → workflow actualizado
• Miles — Auto-asignación → TRD y LEX a Santi, resto a Yas
• Miles — Recordatorio CTA → implementado en aprobación
• Framework — Skills de Claude → actualizadas

✅ Comprimido (2 bullets):
• Miles / N8N: gate de aprobación con auto-asignación y recordatorio de SLA implementados.
• Operaciones de Producto: skills de Claude actualizadas.
```

#### D — Indicadores de progreso

Comparar con el reporte anterior (Paso 1.2 C):
- Bloqueado la semana pasada y esta semana avanzó → agregar `↗ desbloqueado` al bullet correspondiente.

Rovo (paso 1.2 D) puede confirmar el contexto del desbloqueo cuando el campo `Blocked cause` de Jira no es suficientemente descriptivo.

---

### Paso 1.4 — Template del mensaje

> Los emojis son Unicode — renderizan tanto en Claude (preview del borrador) como en Slack (mensaje enviado).

```
📋 _Resumen semanal — Producto_ | Semana del [DD] al [DD] de [mes]

📦 _[N] REQ(s) a IT | [frase corta que describe el carácter de la semana]_

[Área]
• PWI-XX — [nombre] → [qué habilita o resuelve en el negocio]

[Área]
• PWI-XX — [nombre] → [ídem]

🗂️ _Otras tareas_
• [Tema / agrupación]: [qué avanzó o se creó — varios ítems en una línea si son del mismo tema]
• [Ítem individual si no tiene agrupación natural]

🚨 _Bloqueos_
• [TICKET(S)] → [razón concisa]. [Quién desbloquea]

_Sent using_ <@U0AHZHTQE22|Claude>
```

> Sección `🚨 Bloqueos` solo aparece si hay 3 o más bloqueos activos — si hay 1 o 2, van como último(s) bullet(s) de `🗂️ Otras tareas`. Longitud objetivo: ≤ 12 líneas de contenido.

**Casos especiales:**

| Situación | Comportamiento |
|---|---|
| 0 REQs a IT | Sección `📦` dice `_0 REQs a IT esta semana — [razón breve]_`. El peso del mensaje pasa a Otras tareas. |
| No hay Otras tareas relevantes | Omitir sección `🗂️` completa |
| 1–2 bloqueos | Incluir como último(s) bullet(s) de `🗂️`, no como sección separada |
| 3+ bloqueos | Armar sección `🚨` separada |
| Notion no devuelve datos pero Jira sí | Usar solo Jira; no dejar sección vacía |

---

### Paso 1.5 — Revisión y envío

1. Presentar borrador completo. **Nunca enviar sin confirmación explícita.**
2. Aplicar ajustes.
3. `slack_send_message_draft` en `#product` (`C0A7E419292`). Mostrar el draft.
4. Confirmar antes de `slack_send_message`.

---

## Referencias técnicas

| Recurso | Valor |
|---|---|
| Jira Cloud ID | `53eec1f8-a156-4af9-bc3a-d6142b50e0cc` |
| Canal `#product` | `C0A7E419292` |
| Santi Slack ID | `U0B1MM6MF0U` |
| Claude bot ID | `U0AHZHTQE22` |
| Estados Jira activos | `TO DO` · `IN ANALYSIS` · `READY FOR DEV` · `BLOCKED` · `SENT TO DEV` |
| Opciones Estado Notion | `NO INICIADA` · `EN CURSO` · `EN OTRA CANCHA` · `RESUELTA` |
| Áreas (= Jira) | `Trading Desk` · `Legal & Compliance` · `Operations` · `Finance & Accounting` · `Sales & Partnerships` · `Management` |
| Áreas internas | `Miles/N8N` · `Framework` · `Ops de Producto` |

**MCPs requeridos:** Atlassian Rovo (Jira JQL + Rovo Search semántico), Notion, Slack.
