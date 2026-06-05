---
name: ardua-weekly-report
description: Genera el reporte semanal de Producto de Ardua y prepara la task list de Notion para la semana siguiente. Activar SIEMPRE ante frases como "hacer el reporte semanal", "reporte de la semana", "armar el weekly", "cerrar la semana", "mandar el reporte", "weekly report", o cualquier variación que indique cierre semanal del PM. El proceso tiene dos fases: (1) recolección de datos (Jira + Notion + Slack), síntesis del reporte con agrupamiento por Área e impacto narrativo, revisión por el PM y envío a #product; (2) creación de la nueva task list en Notion con las tareas pendientes. Nunca enviar el reporte sin revisión explícita del PM.
---

# Ardua Weekly Report

Genera el reporte semanal de Santi Domeniconi (Technical PM, Ardua Solutions) y prepara el arranque de la semana siguiente. El proceso es determinista: recolectar → sintetizar → revisar → enviar → crear próxima semana.

---

## Audiencia y tono

- **Canal destino:** `#product` (`C0A7E419292`) — Federico Fernandez (CEO) y Yasmani Rodriguez (HOP).
- **Tono:** informativo, formal, directo. El CEO lee esto — sin detalles técnicos innecesarios.
- **Formato:** Slack markdown. Emojis solo para encabezados de sección.
- **Firma fija:** `_Sent using_ <@U0AHZHTQE22|Claude>`

---

## Proceso en dos fases

```
Fase 1: Recolección → Síntesis con agrupamiento → Revisión → Envío
Fase 2: Nueva task list en Notion con tareas pendientes
```

Presentar la Fase 2 solo después de que el PM confirme el envío.

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

**Query 1 — Cerrado esta semana:**
```jql
(assignee = currentUser() OR reporter = currentUser())
AND status changed to "SENT TO DEV" during (startOfWeek(), now())
ORDER BY updated DESC
```

**Query 2 — En curso:**
```jql
(assignee = currentUser() OR reporter = currentUser())
AND status in ("IN ANALYSIS", "READY FOR DEV")
AND updated >= startOfWeek()
ORDER BY status ASC, updated DESC
```

**Query 3 — Bloqueados:**
```jql
(assignee = currentUser() OR reporter = currentUser())
AND status = "BLOCKED"
ORDER BY updated DESC
```

**Query 4 — Nuevas iniciativas:**
```jql
reporter = currentUser()
AND created >= startOfWeek()
AND status not in ("SENT TO DEV", "Done", "Deprecated")
ORDER BY created DESC
```

Campos: `summary`, `status`, `priority`, `customfield_10310` (Business Area), `customfield_10306` (Blocked cause), `created`, `updated`.

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

> `_status` es campo legacy (solo semana 01/06-05/06) — ignorar siempre.

#### C) Slack — reporte anterior y contexto semanal

Buscar en `#product` el último "Resumen semanal" de Santi (`from:<@U0B1MM6MF0U> in:#product`). Extraer "En curso" y "Bloqueos" del reporte anterior para detectar avances.

**Canales a escanear:**

| Canal | ID | Prioridad |
|---|---|---|
| `#req-product-trading-desk` | `C0AJMRFP0TD` | Alta |
| `#req-product-legal-compliance` | `C0AJ67HK0ES` | Alta |
| `#req-product-operations` | `C0AK2PW5BGQ` | Media |
| `#req-product-finance-accounting` | `C0AJ2599DA6` | Media |
| `#req-product-sales-partnerships` | `C0AKNPCNNSU` | Media |
| `#pagos` | `C09T2RWMTK9` | Media |
| `#req-product-notifications` | `C0AS1BPV9QU` | Baja |

---

### Paso 1.3 — Síntesis con agrupamiento e impacto

#### Principio central

El reporte no es una lista de tareas. Es una narrativa de impacto: **qué hice → qué logré → qué sigue**. El CEO y el HOP deben entender el valor generado, no el detalle de cada ticket.

#### A — Deduplicación

Cruzar Jira y Notion por campo `REQ`. Si coinciden, usar los datos más ricos de los dos.

#### B — Agrupamiento por Área

Agrupar por `Área` (Notion) o Business Area (Jira). Nombres exactos: `Trading Desk`, `Legal & Compliance`, `Operations`, `Finance & Accounting`, `Sales & Partnerships`, `Management`, `Miles/N8N`, `Framework`, `Ops de Producto`. Solo incluir grupos con contenido real.

#### C — Clustering temático

Dentro de cada grupo, identificar clusters por tema:
- Keywords `workflow`, `Miles`, `n8n`, `automatiz*` → cluster "Automatizaciones"
- Keywords `tablero`, `Jira`, `epic*`, `configuraci*` → cluster "Framework de trabajo"
- Keywords `onboarding`, `Centaurus`, `API`, `partner*` → cluster "Partnership"
- Mismo REQ o misma épica → mismo cluster

1 solo ítem = bullet individual, sin clustering.

#### D — Narrativa de impacto

Para clusters (2+ ítems):
```
[Área]
• [Nombre del cluster]: [qué se hizo — 1-2 oraciones].
  _Logro: [métrica, capacidad habilitada, problema eliminado]._
```

Para ítems individuales:
```
• REQ-XXX — [Nombre] → [acción] [↗ avanzó / ↗ desbloqueado si aplica]
```

Si el campo `Impacto` de Notion está completado, usarlo directamente como línea de logro.

**Ejemplo:**

❌ Lista de tareas:
```
Miles/N8N
• REQ Approval Locks → actualizado
• Auto-asignación → configurada
```

✅ Narrativa de impacto:
```
Miles/N8N
• Sistema de gestión de REQs: gate de aprobación de heads con auto-asignación y SLA automático implementados.
  _Logro: trazabilidad completa desde captura hasta aprobación sin intervención manual._
```

#### E — Indicadores de progreso

Comparar con el reporte anterior:
- Estaba en **Bloqueos** y avanzó → `↗ desbloqueado`
- Estaba en **En curso** sin movimiento y esta semana tuvo actividad → `↗ avanzó`

---

### Paso 1.4 — Template del mensaje

```
:clipboard: _Resumen semanal — Producto_ | Semana del [DD] al [DD] de [mes]

:bar_chart: _[N] REQ(s) a SENT TO DEV | [highlight ejecutivo]_

:sparkles: _Nuevas iniciativas_

[Área]
• [Nombre] → [primer paso concreto]

:white_check_mark: _Cerrado esta semana_

[Área]
• [Narrativa de cluster o bullet individual]
  _Logro: [impacto]._

:arrows_counterclockwise: _En curso_

[Área]
• REQ-XXX — [Nombre] ([STATUS]) → [situación] [↗ si aplica]

:rotating_light: _Bloqueos_
• REQ-XXX → [razón concisa]

_Sent using_ <@U0AHZHTQE22|Claude>
```

> Secciones vacías se omiten. `:bar_chart:` siempre incluye throughput + 1 highlight del cluster de mayor impacto.

---

### Paso 1.5 — Revisión y envío

1. Presentar borrador completo. **Nunca enviar sin confirmación explícita.**
2. Aplicar ajustes.
3. `slack_send_message_draft` en `#product` (`C0A7E419292`). Mostrar el draft.
4. Confirmar antes de `slack_send_message`.

---

## Fase 2 — Nueva task list en Notion

Ejecutar después del envío confirmado.

### Paso 2.1 — Tareas pendientes

Tasks con `Estado` = `"NO INICIADA"`, `"EN CURSO"` o `"EN OTRA CANCHA"`.

### Paso 2.2 — Fecha próxima semana

Próximo lunes al próximo viernes. Formato: `Tasks DD/MM - DD/MM`.

### Paso 2.3 — Crear página

```json
notion-create-pages: { "pages": [{ "properties": { "title": "Tasks DD/MM - DD/MM" }, "icon": "icons/checklist_green" }] }
```

### Paso 2.4 — Crear base de datos

`notion-create-database` con parent = page_id recién creada:

```sql
CREATE TABLE (
  "Task name" TITLE,
  "Estado" SELECT('NO INICIADA':gray, 'EN CURSO':blue, 'EN OTRA CANCHA':yellow, 'RESUELTA':green),
  "Área" SELECT('Trading Desk':blue, 'Legal & Compliance':purple, 'Operations':orange, 'Finance & Accounting':green, 'Sales & Partnerships':brown, 'Management':yellow, 'Miles/N8N':pink, 'Framework':gray, 'Ops de Producto':red),
  "Impacto" RICH_TEXT,
  "REQ" RICH_TEXT,
  "Due date" DATE,
  "Assignee" PEOPLE
)
```

### Paso 2.5 — Poblar tareas pendientes

Copiar por cada tarea: `Task name`, `Estado`, `Área`, `REQ`. No copiar `Impacto` ni `Due date`.

### Paso 2.6 — Crear vistas

Con `notion-create-view`, database_id = ID de la nueva DB, data_source_id = ID del collection:

| Vista | Tipo | Configuración |
|---|---|---|
| Kanban | board | `GROUP BY "Estado"; SORT BY "Área" ASC; SHOW "Task name", "Área", "REQ", "Impacto", "Due date", "Assignee"` |
| Activas | list | `FILTER "Estado" != "RESUELTA"; SORT BY "Estado" ASC; SORT BY "Área" ASC; SHOW "Task name", "Estado", "Área", "REQ", "Impacto", "Due date"` |
| EN CURSO | list | `FILTER "Estado" = "EN CURSO"; SORT BY "Área" ASC; SHOW "Task name", "Área", "REQ", "Impacto"` |
| EN OTRA CANCHA | list | `FILTER "Estado" = "EN OTRA CANCHA"; SORT BY "Área" ASC; SHOW "Task name", "Área", "REQ", "Impacto"` |
| NO INICIADA | list | `FILTER "Estado" = "NO INICIADA"; SORT BY "Área" ASC; SHOW "Task name", "Área", "REQ", "Due date"` |
| RESUELTA | list | `FILTER "Estado" = "RESUELTA"; SHOW "Task name", "Área", "REQ", "Impacto"` |
| Calendario | calendar | `CALENDAR BY "Due date"; SHOW "Task name", "Estado", "Área"` |

### Paso 2.7 — Confirmar

Compartir link de la nueva página y cantidad de tareas traspasadas.

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
| Formato título Notion | `Tasks DD/MM - DD/MM` |

**MCPs requeridos:** Atlassian (Jira), Notion, Slack.
