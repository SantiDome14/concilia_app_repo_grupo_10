---
name: Jira Automations — Session Context
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-22
---

# Jira Automations — Session Context

## Purpose

Registro vivo de las automatizaciones Jira que soportan el flujo Producto ↔ Tecnología, sus comportamientos conocidos y los aprendizajes operativos acumulados. Documento de referencia para el HoP y para futuros TPM / Growth PM.

---

## Architectural overview

Dos proyectos Jira interactúan en el handoff Producto → Tecnología:

- **REQ** (Kanban, cloud `53eec1f8-a156-4af9-bc3a-d6142b50e0cc`): captura y refinamiento de requerimientos de Producto. Workflow: Backlog → In Review → Blocked → Ready for Dev → Done.
- **MAIN** (key `AM`): board de Tecnología. Los Stories espejo viven acá para planificación e implementación.

Handoff: cuando un Requirement en REQ pasa a `Ready for Dev`, una automatización crea un Story en MAIN con link `is caused by` / `causes` y label `product-requirement`.

---

## Active automations

### 1. REQ → MAIN handoff (proyecto REQ)

- **Trigger:** transición de Requirement a `Ready for Dev`.
- **Acción:** crea Story en MAIN con label `product-requirement` y link `is caused by` hacia el REQ origen.
- **Owner:** Producto (HoP).

### 2. [Product Manager App] Scheduled Sweep: Backlog → TO REFINEMENT (proyecto MAIN)

- **Trigger:** `Scheduled`, cada 5 minutos.
- **JQL:** `project = AM AND status = "Backlog" AND labels = "product-requirement"`.
- **Loop:** `Run a JQL search and execute actions for each work item in the query` activado.
- **Flag:** `Only include work items that have changed since the last time this rule executed` **destildado** (ver Learning 3).
- **Acción:** transiciona cada ticket resultante a `TO REFINEMENT`.
- **Owner:** Producto.
- **Modificado:** 2026-04-22 — migrado desde `On Create Transition` a `Scheduled Sweep` (ver Learning 1).

---

## Learnings

### Learning 1 — Race condition entre automatizaciones encadenadas (2026-04-22)

**Contexto.** La regla en MAIN estaba configurada con trigger `Work item created` y condición `Labels contains any of: product-requirement`. En 30 días registró 11 ejecuciones, las 11 con `NO ACTIONS PERFORMED`, pese a que los tickets efectivamente llevaban el label al ser abiertos.

**Causa raíz.** La automatización REQ → MAIN crea el ticket primero y aplica el label después (operaciones secuenciales dentro de la misma automatización upstream). El trigger `Work item created` dispara en el momento exacto de creación — antes de que el label exista. La regla evaluaba la condición contra un ticket sin labels y descartaba silenciosamente.

**Síntomas observables.**
- Audit log con `NO ACTIONS PERFORMED` en tickets que visiblemente cumplen la condición al abrirlos.
- Tickets transicionados manualmente por el HoP o quedando en Backlog indefinidamente.

**Solución adoptada.** Migración a trigger `Scheduled` con JQL. La regla ya no depende del evento de creación — barre periódicamente el Backlog buscando tickets que cumplan todas las condiciones.

**Principio derivado.** Para reglas que reaccionan al output de otra automatización, preferir `Scheduled + JQL` sobre triggers basados en eventos (`Work item created`, `Work item updated`). Razones:

1. Desacoplado: no asume orden interno de operaciones del upstream.
2. Idempotente: la JQL filtra por estado actual, no hay riesgo de re-procesamiento.
3. Auto-recuperable: tickets huérfanos se capturan en la próxima corrida.
4. Trade-off aceptable: latencia de hasta N minutos entre evento y acción.

### Learning 2 — Usar `key` de proyecto, no `name`, en JQL

En la JQL se usa `project = AM` (key) en vez de `project = MAIN` (name). Ambos funcionan hoy, pero el name es renombrable desde Space Settings y puede romper la regla silenciosamente. **Convención: siempre key**.

### Learning 3 — El flag "Only include work items that have changed since the last time this rule executed" debe quedar destildado

Activarlo filtra por `updated >= lastRunTime` y rompe la idempotencia. Tickets huérfanos (fallas transitorias, reglas deshabilitadas temporalmente, labels aplicados manualmente a tickets viejos) no se recuperan nunca. Con el flag destildado, la JQL sirve como red de seguridad permanente y la JQL misma (`status = Backlog`) previene re-procesamiento.

---

## Testing protocol

Para validar la regla end-to-end después de cambios en cualquier extremo del handoff:

1. Crear requerimiento dummy en REQ (ej. `TEST — Automation validation REQ→MAIN`).
2. Transicionar el REQ a `Ready for Dev`.
3. Verificar que aparece ticket espejo en MAIN con label `product-requirement` y status `Backlog`.
4. Esperar hasta 5 minutos.
5. Verificar transición automática del ticket AM a `TO REFINEMENT`.
6. Borrar ambos tickets (REQ y AM).

---

## Pending / open

- Aplicar el mismo patrón (scheduled sweep con JQL) si aparecen nuevas automatizaciones en MAIN que dependan del handoff desde REQ.
- Revisar periódicamente el audit log de la regla de sweep para detectar tickets huérfanos acumulándose (señal temprana de ruptura del upstream).
- Documentar el patrón en un framework de automatizaciones si el catálogo crece más allá de 3-4 reglas activas.
