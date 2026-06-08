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

Ejecutar **después** de los 4 queries JQL y la lectura de Notion. Rovo Search hace búsqueda semántica cross-source (Jira + Confluence) y aporta contexto cualitativo que los campos estructurados no capturan.

Usar `Atlassian Rovo:search` con las siguientes reglas:

**Cuándo y qué buscar:**

| Condición | Query Rovo | Propósito |
|---|---|---|
| Hay 1+ ítems en estado `BLOCKED` | `"[summary del ticket bloqueado]"` | Encontrar decisiones, discusiones o Confluence pages vinculadas al bloqueo que expliquen la causa o el camino a desbloqueo |
| Hay clusters de 3+ ítems en el mismo Área | `"[nombre del área] [semana actual]"` | Enriquecer la narrativa de impacto del cluster con contexto de decisiones o avances registrados en Confluence |
| Hay nuevas iniciativas sin campo `Impacto` en Notion | `"[summary del ticket nuevo]"` | Verificar si existe trabajo previo, discovery o Confluence relacionado que aporte contexto para la sección Nuevas iniciativas |
| El reporte anterior tenía bloqueos que esta semana no aparecen | `"[summary del ticket desbloqueado]"` | Confirmar contexto del desbloqueo para usar el indicador `↗ desbloqueado` con fundamento |

**Instrucciones operativas:**
- Máximo **4 búsquedas Rovo por sesión** — priorizar bloqueados y clusters de mayor impacto.
- Si Rovo devuelve resultados de Confluence relevantes, incorporar el contexto como texto en la narrativa de impacto del cluster o en la línea `_Logro:_`. No incluir links internos de Confluence en el mensaje de Slack.
- Si Rovo no devuelve resultados útiles para una query, continuar sin bloquear la síntesis.
- Los resultados de Rovo son contexto de enriquecimiento, no reemplazan los datos estructurados de Jira y Notion.

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

El reporte no es una lista de tareas — es una narrativa de impacto breve. El CEO y el HOP deben entender qué se hizo, con qué resultado, y qué sigue.

#### A — Deduplicación

Cruzar Jira, Notion y Claude history por campo `REQ` / ticket key. Si el mismo ítem aparece en múltiples fuentes, usar los datos más ricos (contexto Claude > descripción Jira > nombre de tarea Notion). Cada ítem aparece una sola vez en el reporte.

#### B — Agrupamiento por Área

Agrupar por `Área`. Nombres exactos: `Legal & Compliance`, `Operations`, `Trading Desk`, `Finance & Accounting`, `Sales & Partnerships`, `Management`, `Miles / N8N`, `JIRA`, `Framework`, `Operaciones de Producto`. Solo incluir grupos con contenido real.

> **Ítem sin área clara:** Si un ítem no tiene campo `Área` en Notion ni Business Area en Jira, y el nombre/contexto no permite inferir el grupo con confianza, **preguntar al PM antes de agrupar**. Presentar el ítem ambiguo y las opciones candidatas: _"No tengo claro en qué área va '[nombre]' — ¿lo pongo bajo [opción A] o [opción B]?"_. No asumir ni inventar categoría.

#### C — Formato de cada bullet

Usar el patrón que refleja los reportes reales:

```
[TICKET] — [descripción corta] → [acción tomada]. [Contexto o impacto en la misma línea.]
```

Ejemplos reales:
```
PWI-53 — LEX · Historial de quotes desde el detalle de cliente → enriquecido (Detallado) y enviado a Dev. Expone quotes de TRD en LEX para gestión de límites. Wireframe validado con Cami.

PWI-44 — OPS · Variables automáticas en Deposit Instructions → enviado a Dev. {account_number} y {client_address} eliminan carga manual en instrucciones SWIFT (~10–30/semana).
```

**Sin líneas `_Logro:_` separadas. Sin clustering temático con headers. El contexto va inline en el mismo bullet.**

Si el campo `Impacto` de Notion está completado, incorporarlo como contexto inline al final del bullet.

#### D — Indicadores de progreso

Comparar con el reporte anterior (Paso 1.2 C):
- Estaba en **Bloqueos** y avanzó → agregar `↗ desbloqueado` al bullet
- Estaba en **En curso** y esta semana tuvo movimiento → agregar `↗ avanzó`

---

### Paso 1.4 — Template del mensaje

> Los emojis son Unicode — renderizan tanto en Claude (preview del borrador) como en Slack (mensaje enviado).

```
📋 _Resumen semanal — Producto_ | Semana del [DD] al [DD] de [mes]

📊 _[N] REQs a SENT TO DEV | [highlight ejecutivo — logro más importante de la semana]_

✨ _Nuevas iniciativas_

[Área]
• [TICKET] — [descripción] → [primer paso concreto]

✅ _Cerrado esta semana_

[Área]
• [TICKET] — [descripción] → [acción]. [Contexto o impacto inline.]

🔄 _En curso_

[Área]
• [TICKET] — [descripción] ([STATUS]) → [situación actual]. [Próximo paso o bloqueante nombrado] [↗ si aplica]

🚨 _Bloqueos_
• [TICKET(S)] → [descripción del bloqueo]. [Quién debe desbloquearlo]

_Sent using_ <@U0AHZHTQE22|Claude>
```

> Secciones vacías se omiten completamente (encabezado incluido). `📊` siempre incluye throughput + 1 highlight del ítem de mayor impacto de la semana.

**Casos especiales de sección vacía:**

| Situación | Comportamiento |
|---|---|
| 0 REQs pasaron a SENT TO DEV | `📊` dice `_0 REQs cerrados esta semana \| [highlight de mayor avance en curso]_` |
| No hay ítems en curso | Omitir sección `🔄` completa |
| No hay bloqueos | Omitir sección `🚨` completa |
| No hay nuevas iniciativas | Omitir sección `✨` completa |
| Notion no devuelve tareas RESUELTA pero Jira sí tiene SENT TO DEV | Usar solo datos de Jira para esa sección; no dejar la sección vacía |

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
