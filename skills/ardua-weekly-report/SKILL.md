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
| `Done` | Completado | — (no incluir en reporte) |
| `Deprecated` | Descartado | — (no incluir) |

**Query 1 — Cerrado esta semana (a SENT TO DEV):**
```jql
(assignee = currentUser() OR reporter = currentUser())
AND status changed to "SENT TO DEV" during (startOfWeek(), now())
ORDER BY updated DESC
```

**Query 2 — En curso (activos):**
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

**Query 4 — Nuevas iniciativas (creadas esta semana):**
```jql
reporter = currentUser()
AND created >= startOfWeek()
AND status not in ("SENT TO DEV", "Done", "Deprecated")
ORDER BY created DESC
```

Campos a traer: `summary`, `status`, `priority`, `customfield_10310` (Business Area), `customfield_10306` (Blocked cause), `created`, `updated`.

#### B) Notion — task list de la semana

1. `notion-fetch` sobre el URL provisto.
2. Identificar el `data-source-url` de la DB inline (`collection://[UUID]`).
3. Consultar todos los registros via view mode (Kanban o Activas).
4. El schema vigente tiene: `Task name` (título), `Estado` (No iniciada · En curso · En otra cancha · Resuelta), `Área` (Trading Desk · Legal & Compliance · Operations · Finance & Accounting · Sales & Partnerships · Management · Miles/N8N · Framework · Ops de Producto), `Impacto` (texto libre), `REQ` (referencia a ticket).

**Mapeo de Estado a sección del reporte:**

| Estado Notion | Sección del reporte |
|---|---|
| `Resuelta` | ✅ Cerrado |
| `En curso` | 🔄 En curso |
| `En otra cancha` | 🔄 En curso (con indicador) o 🚨 Bloqueos |
| `No iniciada` | No se incluye directamente salvo que sea nueva iniciativa de esta semana |

**Nota:** el campo `_status` es legacy (solo en semana 01/06-05/06) — ignorarlo. Usar siempre `Estado`.

#### C) Slack — reporte anterior y contexto semanal

**Reporte anterior:** buscar en `#product` el último "Resumen semanal" de Santi (`from:<@U0B1MM6MF0U> in:#product`). Extraer qué estaba en "En curso" y "Bloqueos" para detectar avances esta semana.

**Canales a escanear (actividad de esta semana):**

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

El reporte no es una lista de tareas completadas. Es una narrativa de impacto: **qué hice → qué logré → qué sigue**. El CEO y el HOP leen esto para entender el valor generado en la semana, no para ver el detalle de cada ticket.

#### Paso A — Deduplicación

Cruzar Jira y Notion por campo `REQ`. Si una tarea de Notion y un ticket de Jira referencian el mismo REQ, son el mismo ítem — usar los datos más ricos de los dos.

#### Paso B — Agrupamiento por Área

Agrupar todos los ítems resueltos/activos por su `Área` (Notion) o Business Area (Jira). Nombres de área exactos (alineados con Jira): `Trading Desk`, `Legal & Compliance`, `Operations`, `Finance & Accounting`, `Sales & Partnerships`, `Management`, `Miles/N8N`, `Framework`, `Ops de Producto`.

Solo incluir en el reporte los grupos que tienen contenido real esta semana.

#### Paso C — Clustering temático dentro de cada Área

Dentro de cada grupo, identificar clusters de ítems relacionados por tema. Señales para agrupar:

- Mismo REQ o REQs del mismo discovery/iniciativa
- Keywords compartidos: `workflow`, `Miles`, `n8n`, `automatiz*` → cluster "Automatizaciones"; `tablero`, `Jira`, `epic*`, `configuraci*` → cluster "Mejoras al framework de trabajo"; `onboarding`, `Centaurus`, `API`, `partner*` → cluster "Partnership"
- Items que forman parte de una misma épica o secuencia de trabajo

Si hay 1 solo ítem en el grupo, no aplica clustering — va como bullet individual.

#### Paso D — Narrativa de impacto por cluster

Para cada cluster (2+ ítems relacionados), sintetizar así:

```
[Área]
• [Nombre del cluster]: [qué se hizo — 1-2 oraciones, activo, sin listar cada sub-tarea].
  _Logro: [qué se consiguió — métrica, capacidad habilitada, problema eliminado]._
```

Para ítems individuales (sin cluster):

```
• REQ-XXX — [Nombre] → [acción realizada] [↗ avanzó / ↗ desbloqueado si aplica]
```

**Ejemplo de síntesis correcta:**

❌ Mal (lista de tareas):
```
Miles/N8N
• REQ Approval Locks → workflow actualizado
• Auto-asignación de REQs → configurada
• Recordatorio heads → implementado
```

✅ Bien (narrativa de impacto):
```
Miles/N8N
• Sistema de gestión de REQs: se implementó el gate de aprobación de heads con auto-asignación por área y recordatorio automático de SLA.
  _Logro: los REQs tienen trazabilidad completa desde captura hasta aprobación, sin intervención manual._
```

Si el campo `Impacto` de Notion está completado para una tarea resuelta, usar ese texto directamente como línea de logro.

#### Paso E — Indicadores de progreso vs semana anterior

Para ítems en "En curso" o "Bloqueos", comparar con el reporte anterior:

- Estaba en **Bloqueos** la semana pasada y ahora avanzó → agregar `↗ desbloqueado`
- Estaba en **En curso** sin movimiento y esta semana tuvo actividad real → agregar `↗ avanzó`
- Sin cambio → sin indicador

---

### Paso 1.4 — Template del mensaje

```
:clipboard: _Resumen semanal — Producto_ | Semana del [DD] al [DD] de [mes]

:bar_chart: _[N] REQ(s) a SENT TO DEV | [1-2 highlights ejecutivos]_

:sparkles: _Nuevas iniciativas_

[Área]
• [Nombre] → [estado inicial / primer paso concreto]

:white_check_mark: _Cerrado esta semana_

[Área]
• [Narrativa de cluster o bullet individual con REQ-XXX]
  _Logro: [impacto]._

:arrows_counterclockwise: _En curso_

[Área]
• REQ-XXX — [Nombre] ([STATUS]) → [situación] [↗ indicador si aplica]

:rotating_light: _Bloqueos_
• REQ-XXX → [razón concisa] (blocked cause si disponible en Jira)

_Sent using_ <@U0AHZHTQE22|Claude>
```

> Secciones vacías se omiten. El subtitle `:bar_chart:` siempre incluye throughput + 1 highlight del cluster de mayor impacto.

---

### Paso 1.5 — Revisión y envío

1. Presentar el borrador completo. **Nunca enviar sin confirmación explícita.**
2. Aplicar ajustes.
3. Usar `slack_send_message_draft` en `#product` (`C0A7E419292`). Mostrar el draft.
4. Confirmar antes de `slack_send_message`.

---

## Fase 2 — Nueva task list en Notion

Ejecutar después del envío confirmado.

### Paso 2.1 — Identificar tareas pendientes

Tasks con `Estado` = `"No iniciada"`, `"En curso"` o `"En otra cancha"` (todo lo que no sea `"Resuelta"`).

### Paso 2.2 — Calcular fecha próxima semana

Próximo lunes al próximo viernes. Formato: `Tasks DD/MM - DD/MM`.

### Paso 2.3 — Crear nueva página

```json
notion-create-pages: { "pages": [{ "properties": { "title": "Tasks DD/MM - DD/MM" }, "icon": "icons/checklist_green" }] }
```

### Paso 2.4 — Crear la base de datos

Con `notion-create-database`, parent = page_id recién creada:

```sql
CREATE TABLE (
  "Task name" TITLE,
  "Estado" SELECT('No iniciada':gray, 'En curso':blue, 'En otra cancha':yellow, 'Resuelta':green),
  "Área" SELECT('Trading Desk':blue, 'Legal & Compliance':purple, 'Operations':orange, 'Finance & Accounting':green, 'Sales & Partnerships':brown, 'Management':yellow, 'Miles/N8N':pink, 'Framework':gray, 'Ops de Producto':red),
  "Impacto" RICH_TEXT,
  "REQ" RICH_TEXT,
  "Due date" DATE,
  "Assignee" PEOPLE
)
```

### Paso 2.5 — Poblar con tareas pendientes

Para cada tarea con Estado != "Resuelta":
- Copiar: `Task name`, `Estado`, `Área`, `REQ`
- No copiar: `Impacto` (se llena fresco), `Due date` (se limpia)

### Paso 2.6 — Crear vistas

Después de crear la DB, crear estas vistas con `notion-create-view`:
- **Kanban** (board): `GROUP BY "Estado"; SORT BY "Área" ASC; SHOW "Task name", "Área", "REQ", "Impacto", "Due date", "Assignee"`
- **Activas** (list): `FILTER "Estado" != "Resuelta"; SORT BY "Estado" ASC; SORT BY "Área" ASC`
- **En curso** (list): `FILTER "Estado" = "En curso"`
- **En otra cancha** (list): `FILTER "Estado" = "En otra cancha"`
- **No iniciada** (list): `FILTER "Estado" = "No iniciada"`
- **Resuelta** (list): `FILTER "Estado" = "Resuelta"`
- **Calendario** (calendar): `CALENDAR BY "Due date"`

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
| Estados JQL activos | `TO DO`, `IN ANALYSIS`, `READY FOR DEV`, `BLOCKED`, `SENT TO DEV` |
| Áreas Notion (= Jira) | Trading Desk · Legal & Compliance · Operations · Finance & Accounting · Sales & Partnerships · Management |
| Áreas internas | Miles/N8N · Framework · Ops de Producto |
| Formato título Notion | `Tasks DD/MM - DD/MM` (ej. `Tasks 08/06 - 12/06`) |

**MCPs requeridos:** Atlassian (Jira), Notion, Slack.
