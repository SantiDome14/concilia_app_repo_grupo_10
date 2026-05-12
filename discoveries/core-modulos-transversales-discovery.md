---
name: Modulos transversales del financial-core — Adopcion por app
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-06
updated_at: 2026-05-12
---

# Modulos transversales del financial-core — Adopcion por app

> Scope: Coordinacion cross-app de los 6 modulos transversales que entrega el paradigma del `core-template-frontend`. NO es un modulo funcional; es la matriz que ata los REQs transversales con la adopcion en cada app del core (CLP, FIN, LEX, OPS, TRD).
>
> Related repo: `/Users/yasmani/Projects/core-template-frontend/`
> Related discovery: `core-template-frontend-discovery.md`

---

## Objetivo

- Tener una vista unica del set de modulos transversales que provee el core, los REQs que los entregan y las AM stories espejo que los implementan.
- Documentar el orden de rollout sugerido y las dependencias inter-REQ que Tech debe respetar para no construir contra contratos a medio cocinar.
- Capturar la matriz de adopcion por app (CLP × FIN × LEX × OPS × TRD vs los 6 modulos) con el estado actual de cada cruce, para identificar gaps y priorizar.
- Registrar gotchas detectados durante la sesion de cleanup que conviene preservar para sesiones futuras (sobre todo del PM).
- Ser el punto de partida cuando se quiera contestar: "¿quien ya consume qué del core, qué falta, en qué orden vamos?"

Este artefacto es interno del area de Producto. NO se referencia desde los REQs de Jira (que viven en mundo Tech) ni se considera input para construccion. Su valor es coordinacion y trazabilidad para el PM.

---

## Contexto

El paradigma del `core-template-frontend` define una arquitectura compartida para todas las apps del financial-core (CLP, FIN, LEX, OPS, TRD, COM en su momento). Dentro de ese paradigma, el core entrega **6 modulos transversales** que toda app consume:

**4 modulos genericos** — paginas concretas que aparecen en la sidebar de cada app:

- **DASHBOARD** — orientacion read-only. KPIs del dominio + counters de los 3 list-shaped (Inbox, Alertas, Reportes).
- **INBOX** — lista de Solicitudes con owner, lifecycle y outcome.
- **ALERTAS** — eventos detectados por el sistema con perfiles A/B/C/D.
- **REPORTES** — catalogo + ejecucion de reportes regulatorios, internos, operativos, contables.

**2 funcionalidades transversales** — infraestructura que esos modulos (y otros del dominio) consumen:

- **ACCIONES** (Manifest Engine) — declaracion de acciones por registro con capabilities, predicates, dialogs y audit trail.
- **VISTAS + Ejes** — Lista, Tarjetas, Tablero (Kanban) state-driven con drag-drop y `<ClosureModal>` shared.

Hasta abril 2026 cada app construia estas piezas localmente, sin contrato compartido. El paradigma del nuevo template formaliza que la infraestructura vive una sola vez en el core y las apps **consumen el estandar** declarando configuracion especifica del dominio.

Durante la sesion del 2026-05-06 se completo el cleanup de los 6 REQs transversales que entregan estos modulos y de sus 6 AM stories espejo. Las descriptions quedaron auto-contenidas para Tech (sin paths a `framework/`, `prototypes/`, `discoveries/` ni a specs OpenSpec) y referenciandose entre si por keys de Jira. Este discovery captura el estado consolidado al cierre de esa sesion y las decisiones pendientes que quedan por delante.

---

## Trazabilidad — REQs y AM stories

Cada modulo transversal se entrega con un par REQ ↔ AM. El REQ es el contrato canonico (ownership Producto); el AM es la development story espejo que Tech implementa. Si hay divergencia entre los textos, prevalece el REQ.

| Modulo | REQ canonico | AM mirror | Status REQ | Status AM |
|---|---|---|---|---|
| **ACCIONES** (Manifest Engine) | [REQ-68](https://arduasolutions.atlassian.net/browse/REQ-68) | [AM-1019](https://arduasolutions.atlassian.net/browse/AM-1019) | SENT TO DEV | TO REFINEMENT |
| **VISTAS + Ejes** | [REQ-69](https://arduasolutions.atlassian.net/browse/REQ-69) | [AM-1018](https://arduasolutions.atlassian.net/browse/AM-1018) | SENT TO DEV | TO REFINEMENT |
| **INBOX** | [REQ-71](https://arduasolutions.atlassian.net/browse/REQ-71) | [AM-1017](https://arduasolutions.atlassian.net/browse/AM-1017) | SENT TO DEV | TO REFINEMENT |
| **ALERTAS** | [REQ-73](https://arduasolutions.atlassian.net/browse/REQ-73) | [AM-1020](https://arduasolutions.atlassian.net/browse/AM-1020) | SENT TO DEV | TO REFINEMENT |
| **REPORTES** | [REQ-59](https://arduasolutions.atlassian.net/browse/REQ-59) | [AM-1004](https://arduasolutions.atlassian.net/browse/AM-1004) | SENT TO DEV | TO REFINEMENT |
| **DASHBOARD** | [REQ-74](https://arduasolutions.atlassian.net/browse/REQ-74) | [AM-1016](https://arduasolutions.atlassian.net/browse/AM-1016) | SENT TO DEV | TO REFINEMENT |

Iniciativa contenedora: [REQ-3 — Ardua Fintech: Financial Core as a Service](https://arduasolutions.atlassian.net/browse/REQ-3).

REQs por area que **consumen** este transversal y permanecen como casos de implementacion (no entregan infra, la usan):

- [REQ-54](https://arduasolutions.atlassian.net/browse/REQ-54) — LEX: Centro de Reporteria Regulatoria y Operativa → consume REQ-59 (Reportes).
- [REQ-52](https://arduasolutions.atlassian.net/browse/REQ-52) — LEX: Centro de Alertas → consume REQ-73 (Alertas), perfil B.
- [REQ-33](https://arduasolutions.atlassian.net/browse/REQ-33) — TRD: Modulo de Alertas → consume REQ-73, perfiles a definir.

REQ-52 y REQ-33 quedan vinculados a REQ-73 via `is caused by`. Mantienen la configuracion del dominio (qué `ALERT_TYPE` declara cada uno, con qué perfil, qué payload); ya no entregan la infraestructura.

---

## Matriz de adopcion — apps × modulos

Lectura de la matriz: cada celda indica si el modulo **aplica al app** (es decir, si el app deberia tenerlo segun el paradigma) y, cuando hay senial, el estado actual de implementacion en el prototipo de referencia o en el repo del app.

Convencion de simbolos:

- ✅ Adoptado / construido en el prototipo de referencia
- 🟡 Skeleton / parcial (existe pero no esta completo)
- 📋 Aplica, planeado, sin construir
- ➖ No aplica al dominio del app

| App | DASHBOARD | INBOX | ALERTAS | REPORTES | ACCIONES | VISTAS |
|---|---|---|---|---|---|---|
| **CLP** (Client Portal) | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 |
| **FIN** (Finanzas) | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| **LEX** (Legal & Compliance) | 📋 | 📋 | 📋 | 📋 (REQ-54) | 📋 | 📋 |
| **OPS** (Operaciones) | 📋 | 🟡 (prompt canonico v1) | 📋 | 📋 | 📋 | 📋 |
| **TRD** (Trading Desk) | 📋 | 📋 | 📋 (REQ-33) | 📋 | 📋 | 📋 |

Notas por app:

- **CLP** — el app con mayor exposicion al cliente externo. Earn esta blocked pendiente Legal (Yield via BitGo + DeFi Bridge + FCI con AdCap). El consumo de los 4 genericos esta planeado pero no priorizado v1.
- **FIN** — el prototipo de referencia mas maduro. Materializa el paradigma con Dashboard funcional, Inbox skeleton con 8 tipos de Solicitudes, perfiles A y B de Alertas, Reportes con sub-tabs Catalogo + Ejecucion. Es la implementacion de referencia que valida el paradigma y desde la cual se extrapolan los REQs transversales.
- **LEX** — primer consumidor "real" planeado para Reportes (REQ-54). Centro de Alertas (REQ-52) en perfil B con foco en compliance (KYC, blacklist, ROS).
- **OPS** — tiene prompt canonico v1 para Inbox listo para ejecutar (13 Solicitudes en 8 tipos). Movements, withdrawals, reconciliacion. El Inbox de OPS es el caso paradigmatico de cross-app routing (Solicitudes que llegan desde CLP, FIN, sistema).
- **TRD** — Alertas en perfil B + perfil C (limit breaches y spread anomalies son time-series con threshold). Dashboard probable consumidor del period selector.

La matriz es **dinamica** — se actualiza con cada sesion donde se toque un app del core.

---

## Orden de rollout sugerido

Dependencias tecnicas entre los 6 REQs definen un orden logico de implementacion. En la practica pueden ir en paralelo con stubs, pero el orden conceptual es:

```
1. REQ-68 ACCIONES (Manifest Engine)         ← base habilitante
       │
       ▼
2. REQ-69 VISTAS + Ejes                       ← consume Acciones
       │
       ▼
3. REQ-71 INBOX  +  REQ-73 ALERTAS            ← paralelos, ambos consumen Acciones + Vistas
       │                  │
       │                  ▼
       │            (REQ-73 emite eventos REPORT_DEPENDENCY)
       │                  │
       └──────────────────┴──→  4. REQ-59 REPORTES   ← consume Alertas perfil A
                                       │
                                       ▼
                          5. REQ-74 DASHBOARD          ← counters de Inbox + Alertas + Reportes
```

Justificacion:

- **Acciones primero** — sin manifest engine no hay capabilities, ni dialogs, ni audit trail. Todo lo demas depende de el.
- **Vistas segundo** — provee `<ClosureModal>` shared, drag-drop y el motor del Tablero. Inbox y Alertas (perfil B) no pueden cerrar sin esto.
- **Inbox y Alertas en paralelo** — comparten tipos canonicos (`TimelineEvent`, `Comment`) y el `<Drawer>` shared. Pueden coordinarse sin bloquearse.
- **Reportes despues de Alertas** — el mecanismo `REPORT_DEPENDENCY` (perfil A en Alertas) es el target del canal de eventos de Reportes.
- **Dashboard al final** — sus counters consultan los endpoints de los 3 list-shaped. Sin esos endpoints no hay Dashboard funcional.

Este orden NO es un waterfall obligatorio. Es la secuencia logica para que cada REQ encuentre sus dependencias resueltas. Para acelerar, Tech puede encarar varios en paralelo con interfaces stub que se reemplazan cuando el upstream cierra.

---

## Convenciones aprendidas durante el cleanup

Captura de gotchas y decisiones que valen la pena preservar para sesiones futuras del PM:

### Sobre el contenido de los REQs transversales

- **El REQ debe satisfacer la capacidad base, no enriquecerse con todo el detalle del spec OpenSpec del prototipo.** Ej: para Alertas, "habilita gestionar alertas de todas las areas con taxonomia de 4 perfiles" es la capacidad. NO incluir cada anti-pattern del spec, cada column constraint, cada ARIA rule. Eso vive en el spec OpenSpec del template; el REQ no lo replica.
- **Tech no tiene acceso a la knowledge base de Producto.** Las descriptions NO referencian `framework/...`, `prototypes/...`, `discoveries/...`, `features/...`, ni paths a `spec.md`, `.vue`, `.ts`. Si el REQ necesita una referencia, va a otro REQ o AM de Jira.
- **El bloque `## Referencias` al final de las descriptions previas era ruido para Tech.** Removido en el cleanup. Las referencias relevantes (a otros REQs/AMs) quedan inline en el body cuando aportan al alcance.
- **Mencionar prototipos de referencia inline ("FIN tiene un prototipo activo en `prototypes/fin/...`") rompe el contrato de auto-contenidad.** Reformular sin paths o remover. La mencion al prototipo vive en este discovery, no en el REQ.

### Sobre las AM stories espejo

- **Cada REQ transversal genera una AM story espejo via Jira automation** cuando entra a SENT TO DEV. La automation copia la description del REQ al momento del trigger.
- **Mantener AM y REQ alineadas es responsabilidad del PM cuando el REQ se reedita post-promocion.** Convencion adoptada: agregar al inicio de la AM una nota:
  > **Nota.** Esta development story es espejo de REQ-XX. Si hay divergencia entre este texto y REQ-XX, prevalece REQ-XX.
- **JQL util para listar las AM espejo de los transversales:**
  ```
  project = AM AND summary ~ "Infraestructura Transversal del Core"
  ```
  Devuelve las 6 stories espejo (AM-1004, AM-1016, AM-1017, AM-1018, AM-1019, AM-1020).

### Sobre el enrichment process

- **El enrichment puede generar comentarios "Addendum — Auditoria de cobertura contra OpenSpec"** que filtran KB refs hacia el REQ. Si se aplica enrichment a un REQ transversal, hay que limpiar el comment manualmente despues.
- **No existe API/MCP para borrar o editar comentarios de Jira via Atlassian MCP.** El borrado va manualmente desde la UI de Jira. Los `editJiraIssue` solo modifican fields, no comments.

### Sobre el naming

- **Convencion de title para los 6 transversales:** `[MODULO/FUNC] — Infraestructura Transversal del Core`. Aplica tanto al REQ como al AM espejo.
- **Convencion del Caracter en metadata:** `Permanente — habilita uno de los 4 modulos genericos del financial-core` (para los 4 genericos) o `Permanente — habilita un estandar consumido por todos los modulos del core` (para Acciones y Vistas).

---

## Decisiones pendientes

Trabajos abiertos que dependen de decisiones que aun no se cerraron:

### Matriz canonica de capabilities del core

REQ-68 (Acciones) declara como dependencia externa una "matriz canonica de capabilities" (set de roles transversales: `ANALISTA_CONTABLE`, `OPS_OFFICER`, `TREASURY`, `ADMIN_FIN`, etc.) que el capability provider expone al motor. Esa matriz no esta cerrada todavia. Al arranque del REQ se acuerda un set inicial; la decision definitiva queda pendiente entre Producto + Tecnologia.

### `target_role` conventions cross-app

INBOX (REQ-71) y ALERTAS (REQ-73) usan `target_role` para routing. Que roles canonicos expone cada app del core para ser target de Solicitudes/Alertas no esta documentado en un solo lugar. Cuando OPS, FIN, LEX, TRD, CLP cierren sus REQs por area, cada uno declara sus roles. Vale juntarlos en una pieza unica (probablemente en este discovery o en uno hermano) cuando se acumule masa critica.

### Migracion REQ-52 + REQ-33 → REQ-73

REQ-52 (LEX Alertas) y REQ-33 (TRD Alertas) ya estan vinculados a REQ-73 via `is caused by`. Pero el contenido de esos REQs todavia describe la implementacion como si entregaran infra propia. Pendiente: reescribir REQ-52 y REQ-33 para que **solo declaren la configuracion del dominio** (ALERT_TYPEs, perfiles, payloads, closeActions, severidades, reglas de deteccion) y consuman REQ-73 para todo lo estructural.

Esto se hace cuando se retome trabajo de LEX o TRD en una sesion futura. No urgente — el linkado via `is caused by` ya orienta a Tech para que sepa que la infra esta en REQ-73.

### Estado real de adopcion por app

La matriz de §"Matriz de adopcion" tiene buena cobertura conceptual pero la columna de status de implementacion es estimacion. Para precisarla hace falta:

1. Relevar el repo de cada app del core (`core-app-frontend` para CLP, `core-fin-frontend`, etc.) y ver qué de cada modulo transversal ya esta construido vs stub vs pendiente.
2. Cruzar con los REQs por area en Jira para ver qué hay declarado en backlog vs en progreso vs hecho.

Esto se hace progresivamente: cada vez que se toque un app en una sesion real, se actualiza la fila de la matriz con datos verificados.

### Ordenamiento real del rollout vs sugerido

El §"Orden de rollout sugerido" describe la secuencia conceptual ideal. Cuando Tech entre a refinement, puede priorizar distinto (ej: empezar por Reportes porque LEX-REQ-54 es el primer consumidor real). Vale revisar el orden con TPM cuando este onboarded.

### Notion / Cowork como workspace de la matriz

Una matriz cross-app tiende a verse mejor en una database de Notion que en una tabla markdown estatica. Si la matriz crece (mas apps, mas dimensiones, mas estados), eventualmente vale promocionarla a una database del workspace de Producto en Notion. Por ahora la version markdown es suficiente.

---

## Proximos pasos

1. Mantener este archivo como punto de entrada para coordinar el rollout de los 6 transversales. Actualizar `updated_at` cada vez que se toque.
2. Cuando un app concreto avance en adopcion (CLP, FIN, LEX, OPS, TRD), actualizar la celda correspondiente de la matriz.
3. Cuando se cierren las decisiones pendientes (matriz de capabilities, `target_role`, migracion de REQ-52 + REQ-33), agregar nota en este discovery + propagar a los REQs de Jira que correspondan.
4. Cuando aparezca un REQ por area que consuma uno de los transversales, vincularlo via `is caused by` al REQ transversal correspondiente y registrarlo aqui en §"Trazabilidad".

---

## Enriquecimiento de REQs transversales — Sesion 2026-05-10

Sesion de enriquecimiento sobre los REQs transversales que ya estaban en SENT TO DEV, agregando capas arquitectonicas sustantivas que no estaban en el cleanup original (2026-05-06). El estado SENT TO DEV no cambio — solo se actualizo el contenido de las descriptions.

### Iniciativa contenedora

Durante esta sesion se trabajo bajo la iniciativa [REQ-81 — Ardua Financial Core: Infraestructura Transversal del Core](https://arduasolutions.atlassian.net/browse/REQ-81), que agrupa los 6 REQs transversales en 2 capas: habilitante (REQ-68 Acciones, REQ-69 Vistas) + 4 modulos genericos (REQ-71 Inbox, REQ-73 Alertas, REQ-59 Reportes, REQ-74 Dashboard). Esto convive con [REQ-3 — Ardua Fintech: Financial Core as a Service](https://arduasolutions.atlassian.net/browse/REQ-3) como iniciativa estrategica de nivel superior.

### REQs enriquecidos en esta sesion

| REQ | Capa arquitectonica agregada |
|---|---|
| **REQ-73 ALERTAS** | Refactor `profile A/B/C/D` → `category triage/workflow/metric/cross_app_panel`. Slack como capacidad opcional V1 declarable por ALERT_TYPE (no commitment). Naturaleza del servicio: backend transversal + UI por app. Flujo de alta de ALERT_TYPEs (V1 formato estandar; V2 IA Playground evaluable). Reportes analiticos sobre alertas (funciones de generacion en REQ-59). REQ-52 y REQ-33 reformulados como pedidos pendientes desbloqueados por REQ-73 (vinculados via `is caused by`), ya no construcciones paralelas. |
| **REQ-71 INBOX** | Renombrado conceptual como **Centro de Solicitudes**. Triggers automaticos al crear (`triggers_on_create`) + CTAs en el Drawer (`available_actions`). Naturaleza dual: una Solicitud no es registro pasivo, es espacio de trabajo que puede triggerear acciones del manifest del modulo destino. Notificaciones in-app primarias (badge sidebar + Web Notifications API) + Slack/email opcional declarable por tipo. Ejemplos del patron completo con 6 tipos ilustrativos. Aclaracion explicita: hoy ningun tipo esta definido — las areas los daran de alta progresivamente. |
| **REQ-68 ACCIONES** | (1) Distincion `action_type: record_mutation` vs `function_invocation` como discriminador clave. (2) Modelo de Capabilities + Grupos + Panel admin como entregable de este REQ. (3) Audit trail + Stream de eventos mandatorio V1. (4) `activity_template` declarable por accion. (5) **Universalidad del menu** `⋯` en lista/card/Kanban. (6) **Agrupacion visual del menu en 2 niveles** (`ASIGNACION / IMPUTACION` vs `CONTEXTUALES`) con sub-grupos del nivel 2 solo en el primer bloque. (7) Iconografia (`✓` mutacion, `↗` invocacion). |
| **REQ-59 REPORTES** | `ReportPermissions` con 4 niveles independientes (`view`/`execute`/`edit`/`delete`). Default seguro (sin declaracion explicita = solo creador + ADMIN_GROUP). V2 (IA Playground + Builder visual + Marketplace) reformulado como **exploracion sujeta a viabilidad** (no commitment). Las capabilities referenciadas son las mismas del capability provider de REQ-68 — misma fuente de verdad. |
| **REQ-69 VISTAS** | Modelo conceptual unificado: una transicion drag-drop del Kanban **es literalmente una accion `record_mutation` del manifest** (REQ-68) invocada con `invocation_source: 'kanban_drag'`. Refactor de `KanbanTransition` para colapsar duplicacion con REQ-68: el eje declara `{from, to, action_id}` referenciando una accion del manifest; el `mode` se deriva (con `dialog` → modal abre `<ClosureModal>`; sin `dialog` → mutacion directa, util para cambios simples de campo booleano o enum). `<ClosureModal>` re-conceptualizado como wrapper tematico del `<ManifestDialog>` (REQ-68), no componente paralelo. Universalidad del menu `⋯` consagrada tambien en cards del Kanban — drag-drop y menu son rutas equivalentes que difieren solo en `invocation_source`. Cards no draggables por 2 razones articuladas: (a) estado en `terminal_values[]`, (b) ninguna transicion habilitada por el motor. Cap blando de 200 cards/columna en V1; virtualizacion completa V2. Empty state por columna con copy `Sin registros en este estado` (columna no se colapsa). |
| **REQ-74 DASHBOARD** | Modelo conceptual unificado: el Dashboard es la **lectura agregada** del estado del area, consumiendo cuatro fuentes — counters de los 3 list-shaped, stream del audit trail (REQ-68 §10), KPIs del dominio, y alertas categoria `cross_app_panel` (REQ-73 §9) como cards especializadas. Counter de Alertas adaptado al refactor de categorias (cuenta `triage` + `workflow` activas; excluye `metric` y `cross_app_panel`). Counter de Reportes filtrado por `permissions.view` del usuario (REQ-59 §5). `<KpiCard>` extendido con `requires_capability?` y `refresh_strategy?` para Dashboards con cards condicionales a rol. Activity feed alimentado por el stream del audit trail — real-time, filtrable por `invocation_source` y `record_type`, capability-aware. `<CrossAppPanelCard>` nueva — consume configuracion de un `ALERT_TYPE` categoria `cross_app_panel` como card del Dashboard (declaracion explicita, no automatica). Cards opcionales shared adicionales: `<SlaSummaryCard>` (consume `sla_hours` de Inbox), `<UpcomingReportsCard>` (consume catalogo de Reportes filtrado por permissions). Naturaleza del servicio: enteramente cliente, sin backend propio, NO consume manifest engine para mutaciones. Refresh real-time para counters y activity feed; KPI cards con `refresh_strategy` declarado. |

Estado final de los 4 REQs: SENT TO DEV (sin cambio de estado, solo enrichment del contenido).

### Decisiones arquitectonicas transversales

Decisiones tomadas en esta sesion que cruzan varios REQs y forman parte del paradigma del core post-enrichment:

#### Distincion `record_mutation` vs `function_invocation`

Discriminador critico introducido en REQ-68 que separa dos mecanicas:

| Tipo | Que hace | Ejemplos |
|---|---|---|
| `record_mutation` | Completa campos / cambia estado del registro fuente | Asignar Banco y Cuenta, Asignar Cliente, Marcar Conciliado, Marcar como Intercompany, Marcar como No facturable |
| `function_invocation` | Toma el registro fuente como contexto e invoca otra cosa (crear registro en otro modulo, disparar job, navegar, llamar endpoint) | Generar Factura, Crear Nota de Credito/Debito, Generar cotizacion desde cliente, Ver movimientos de cliente, Validar whitelist, Generar reporte sobre registro |

`function_invocation` declara `invokes` con `invocation_mode: 'modal_wizard' | 'navigate' | 'background_job' | 'sync_call'` + `parameter_mapping` (mismo mecanismo que `payload_mapping` de triggers de REQ-71).

Campos hibridos: `then_invoke` (mutar y despues invocar) y `on_success` (efecto en el registro fuente al retornar ok).

Esta distincion surgio en discusion en el medio del enrichment de REQ-68 — no estaba en el plan original. Yasmani la introdujo al notar que el modelo inicial solo cubria mutaciones con `dialog`+`on_confirm` y dejaba afuera el caso de "crear nota de credito desde un registro" o "generar cotizacion tomando este cliente como contexto".

#### Capabilities + Grupos + Panel admin

Modelo de governance de dos niveles introducido en REQ-68 como entregable parte del scope:

```
Capabilities atomicas → Grupos → Usuarios (via memberships)
```

Un usuario puede pertenecer a multiples grupos; sus capabilities efectivas son la **union** de capabilities de todos sus grupos. Capability provider backend resuelve `user_id → capabilities[]` via la cadena Usuario → Grupos → Capabilities.

Panel admin (CRUD Capabilities + Grupos + Memberships) restringido a capability `manage_capabilities`. Vistas: Capabilities, Grupos, Usuario.

Consumido por: REQ-68 (motor de acciones), REQ-59 (`ReportPermissions`), REQ-71 (Inbox `target_role`), REQ-73 (Alertas `target_role`), guards de ruta, APIs server-side. Misma fuente de verdad en frontend y backend.

#### Universalidad del menu `⋯`

A partir de REQ-68, todo registro de la plataforma en cualquier formato (lista, card, Kanban) tiene el menu `⋯` montado. Sin acciones habilitadas → `⋯` aparece deshabilitado con tooltip "Sin acciones disponibles en el estado actual", nunca desaparece. La presencia del `⋯` es invariante; lo que varia es que acciones aparecen habilitadas.

#### Agrupacion visual del menu en 2 niveles

`<ManifestActionsMenu>` renderiza las acciones agrupadas:

**Nivel 1 — bloques por `action_type`:**

| Bloque | Contiene | Sub-grupos |
|---|---|---|
| `ASIGNACION / IMPUTACION` | Acciones `record_mutation` (mutan el registro fuente) | Si admite sub-grupos del nivel 2 |
| `CONTEXTUALES` | Acciones `function_invocation` (toman el registro como contexto e invocan otra cosa) | No admite sub-grupos — siempre flat |

**Nivel 2 — sub-grupos funcionales del dominio**, solo dentro de `ASIGNACION / IMPUTACION`, declarables por manifest via `ActionConfig.group?: string`. Sub-grupos observados como referencia (no canonicos cross-modulos):

| Sub-grupo | Naturaleza | Ejemplos |
|---|---|---|
| `IMPUTACION` | Asignacion de referencias del registro a entidades del dominio | Asignar Banco y Cuenta, Asignar Cliente, Asignar Cuenta de Origen |
| `CONCILIACION` | Conciliacion contra fuentes externas | Marcar Conciliado, Marcar con Diferencias |
| `GOVERNANCE` | Atributos de governance interna | Marcar como Intercompany, Cerrar periodo contable |
| `DOCUMENTACION` | Estado documental del registro | Marcar como No facturable |
| `CIERRE` | Cierre del registro (terminales) | Marcar resuelta, Descartar (destructiva, label en rojo) |

**Iconografia:** `✓` (check) para `record_mutation` ("completar/marcar"); `↗` (flecha externa) para `function_invocation` ("salir del registro a invocar algo"). Override declarable via `ActionConfig.icon`. Acciones destructivas: label en rojo, manteniendo el icono del bloque.

**Header del menu:** `ACCIONES DEL REGISTRO` cuando se abre sobre un registro fuente (row action); `ACCIONES` cuando se abre desde header de pagina (`module_cta`, sin registro fuente).

La agrupacion visual surgio del analisis de capturas de UI que Yasmani aporto: el patron actual ya separa con sub-grupos (`IMPUTACION`, `CONCILIACION`, etc.) pero no diferencia visualmente entre mutaciones e invocaciones. La diferenciacion en 2 niveles formaliza esa distincion conceptual.

#### Audit trail + Stream de eventos

REQ-68 entrega doble exposicion del audit trail sobre la misma fuente:

- **Log persistente consultable** filtrable por `record_id`, `user_id`, `action_id`, `manifest_key`, `invocation_source`, rango de fechas. Para queries historicas (auditorias, compliance, reportes regulatorios).
- **Stream de eventos en tiempo real** con shape canonico (`ActionLogEntry`) consumible por sinks. Para reaccionar al instante a lo que pasa.

Consumidores del stream:

- **Internos:** REQ-74 (Dashboard) — seccion Activity feed con templates declarados por accion. Sistema de notificaciones de gobierno (V2).
- **Externos:** Mixpanel, Amplitude, PostHog, Hubspot, o cualquier servicio compatible con webhooks o pub/sub. Sumar un destino nuevo no requiere instrumentar nada en las apps.

El `activity_template` declarable por accion (`{user_name} genero un deposito para {record.cliente_nombre}`) se resuelve al ejecutar y persiste en `activity_text` del audit log. Consumido por el activity feed de REQ-74 y por reportes regulatorios.

#### `invocation_source` — categorias de invocacion

El motor de REQ-68 acepta 7 categorias de invocacion como metadata del audit trail:

| Fuente | Consumidor |
|---|---|
| `menu` | Menu `⋯` (row action) en todos los modulos |
| `cta` | CTA del header (module CTA) en todos los modulos |
| `kanban_drag` | Transicion drag-drop (REQ-69) |
| `inbox_drawer_cta` | CTA dentro del Drawer de Solicitud (REQ-71 §3.2) |
| `inbox_trigger` | Trigger automatico al crear Solicitud (REQ-71 §3.1) |
| `batch` | Operacion masiva |
| `api` | Invocacion server-side directa (REQ-59 scheduler, integraciones) |

El motor no distingue por fuente — ejecuta la misma logica. La fuente es solo metadata para audit + analiticas (patron "que % de cada accion se invoca por menu vs trigger automatico vs batch").

#### Refactor de Alertas: `profile` → `category`

En REQ-73 se renombraron los 4 perfiles A/B/C/D a 4 categorias con semantica explicita:

| Anterior | Nuevo | Naturaleza | UI canonica |
|---|---|---|---|
| Profile A | `triage` | Active triage list — resolver = un click | Lista tipo Inbox |
| Profile B | `workflow` | Master-detail con Drawer + Timeline + Comments | Tablero Kanban + ClosureModal con justificacion ≥10 chars |
| Profile C | `metric` | Time-series con threshold (auto-resolucion) | Chart-first, metrica con thresholds overlaid |
| Profile D | `cross_app_panel` | Cross-app KPI dashboard (read-only) | KPI cards por app de origen |

Las 4 son fijas — no se inventan nuevas. Tipo `AlertProfile` → `AlertCategory`; campo `Alerta.profile` → `Alerta.category`. Yasmani prefirio "categoria" sobre "perfil" porque suena mas natural.

#### Notificaciones in-app como foco; canales externos como opcionales

Tanto Alertas (REQ-73) como Inbox (REQ-71) consagran el mismo principio: el **Centro de Solicitudes / Centro de Alertas es el destino primario obligatorio**. Sobre eso, capacidades opcionales declarables por tipo:

- **Badge en sidebar** (mandatorio, real-time)
- **Web Notifications API** (opt-in del usuario)
- **Email** (capacidad opcional V1)
- **Slack** (capacidad opcional V1, complementario)
- **Otros canales** (Teams, SMS, WhatsApp, push nativo) → V2

Slack quedo como capacidad opcional V1 declarable por tipo despues de aclaracion de Yasmani: el foco es in-app, Slack es recomendacion para tipos donde el usuario suele estar en el canal, no es mandatorio. La gestion siempre ocurre en el Centro; el mensaje en Slack es solo aviso.

#### `ReportPermissions` con 4 niveles independientes

REQ-59 introduce `permissions: ReportPermissions` mandatorio en cada `Report`:

```typescript
interface ReportPermissions {
  view: string[];      // capability IDs que pueden ver el reporte en el catalogo
  execute: string[];   // capability IDs que pueden ejecutar manualmente o programar
  edit: string[];      // capability IDs que pueden modificar la definicion
  delete: string[];    // capability IDs que pueden archivar/eliminar el reporte
}
```

Niveles independientes — un usuario puede tener `view` sin `execute` (read-only), o `edit` sin `delete`. Permite separacion de responsabilidades realista (analista: view+execute; manager: +edit; admin: +delete).

**Default seguro:** si `permissions` no se declara explicitamente, solo creador del REQ + `ADMIN_GROUP` tienen las 4 capacidades. Reporte invisible para el resto. Fuerza declaracion explicita para reportes accesibles a roles amplios — previene exposicion accidental de reportes sensibles (P&L, exposicion agregada cross-entidad).

**`consumer_apps[]` vs `permissions` son ortogonales:** `consumer_apps` define donde aparece el reporte (que apps lo listan); `permissions` define que usuarios dentro de esas apps pueden ver/ejecutar/editar/eliminar.

#### V2 de Reportes como exploracion no-commitment

REQ-59 reformulo V2 (IA Playground + Builder visual + Marketplace) como **exploracion sujeta a viabilidad tecnica y de governance**, no commitment. V1 (flujo formal de alta por REQ + PR) es la via principal y suficiente. Si V2 no resulta viable, V1 cubre todas las necesidades del catalogo.

Razon del refactor: aclaracion de Yasmani — "los reportes autogestionados/creados es una recomendacion, es decir, si es posible hacerlo perfecto, caso contrario vamos por el camino del REQ".

### Modelo conceptual unificado

Una observacion sintetica que surgio durante la sesion:

> Una accion del manifest = unidad atomica de mutacion/invocacion del sistema. Trigger automatico de Inbox, CTA del Drawer, transicion Kanban, batch op, integracion externa: **todos pasan por el motor de REQ-68**. El `parameter_mapping` de las acciones es el mismo mecanismo que el `payload_mapping` de los triggers automaticos de REQ-71. Esto unifica conceptualmente la conexion entre modulos del core.

Una implicancia: un trigger de Inbox (REQ-71 §3.1) no es mas que **una accion de tipo `function_invocation` + `invocation_mode: 'background_job'` invocada por el sistema con `invocation_source: 'inbox_trigger'`**. Lo mismo para los CTAs del Drawer (REQ-71 §3.2): son acciones del manifest del modulo destino, invocadas desde el contexto de la Solicitud, con `invocation_source: 'inbox_drawer_cta'`.

Y una segunda implicancia con el enrichment de REQ-69: una transicion drag-drop del Tablero **es una accion `record_mutation` del manifest del modulo** invocada con `invocation_source: 'kanban_drag'`. El eje del Kanban declara `KanbanTransition[]` con `{from, to, action_id}` referenciando acciones del manifest — no duplica `mode`, `closeAction`, capabilities ni `on_confirm`. Esos viven en la accion del manifest, unica fuente de verdad. El `mode` se deriva del manifest: si la accion declara `dialog` → modal (abre `<ClosureModal>`, que es el `<ManifestDialog>` de REQ-68 con header/copy especificos para cierre); si no declara `dialog` → mutacion directa (ideal para cambios simples de campo booleano o enum sin campos que recoger). Drag-drop y menu `⋯` son dos rutas equivalentes de la misma accion.

Una tercera implicancia con el enrichment de REQ-74: el Dashboard es **lectura agregada** que consume el stream del audit trail como fuente del activity feed real-time — cada item es un `ActionLogEntry` formateado por el `activity_template` de la accion. El Dashboard NO invoca al motor para mutar; solo consume el stream y consulta el capability provider para filtrar. Esto cierra el modelo: el motor de REQ-68 emite eventos que viven en dos planos — audit log persistente consultable + stream en tiempo real — ambos consumibles uniformemente por consumidores internos (Dashboard activity feed, cards del Dashboard) y externos (Mixpanel, Amplitude, etc.). Una alerta categoria `cross_app_panel` (REQ-73 §9) tiene su destino natural como `<CrossAppPanelCard>` del Dashboard del app, no en el modulo Alertas.

### Pendientes

**No quedan REQs transversales pendientes de enrichment.** Los 6 REQs del set (REQ-59, REQ-68, REQ-69, REQ-71, REQ-73, REQ-74) estan **todos enriquecidos** al cierre del 2026-05-10. El set completo de infraestructura transversal del core (iniciativa REQ-81) esta en SENT TO DEV con la capa arquitectonica completa.

Trabajos abiertos heredados (no son enrichment de REQs transversales sino consecuencias arquitectonicas):

- Migracion REQ-52 (LEX Alertas) y REQ-33 (TRD Alertas) para que solo declaren la configuracion del dominio consumiendo REQ-73.
- Matriz canonica de capabilities (REQ-68 §6.1) — set inicial se acuerda al arranque de implementacion; cierre pendiente Producto + Tecnologia.
- `target_role` conventions cross-app — junta una vez que cada app cierre sus REQs por area.
- Relevamiento real del estado de adopcion por app (la matriz tiene estimaciones, faltan datos verificados del repo de cada app).
- REQs por area que declaran configuracion especifica consumiendo los transversales (qué tipos de Solicitudes maneja cada app, qué `ALERT_TYPE`s, qué KPIs del Dashboard, qué acciones del manifest, etc.).

### Convenciones y aprendizajes adicionales de la sesion

**Limites de Jira en escritura de descriptions:**

- `editJiraIssue` con descriptions largas choca con `CONTENT_LIMIT_EXCEEDED` cuando el contenido supera cierto threshold. Estrategia: compactacion preventiva con tablas densas, eliminacion de redundancias entre Alcance y Criterios, parrafos cortos.
- Paso con REQ-73 (la primera version no entro, hubo que compactar) y con REQ-59 (mismo problema). REQ-68 y REQ-71 entraron en primera pasada.
- `editJiraIssue` con `contentFormat: 'markdown'` funciona bien para escritura y debugging — devuelve la version final en markdown legible y consistente.

**Convencion de Yasmani al enriquecer un REQ:**

- Plan + bloques nuevos + cuestiones a validar antes de escribir, no escribir directo.
- Iteraciones de drafts validados via tabla de cambios resumida.
- Yasmani aprueba los puntos uno a uno; el sistema integra todo + escribe en una sola pasada.
- Si Yasmani aporta una distincion conceptual nueva en el medio del enrichment (ej: `record_mutation` vs `function_invocation` no estaba en el plan original — surgio en discusion durante REQ-68), el sistema la integra al modelo y reescribe el plan ajustado.

**Patron de analisis de capturas de UI:**

- Cuando Yasmani aporta capturas del producto actual, el sistema las analiza para identificar el patron visual existente (header, sub-grupos en mayusculas, items con check, tags al final) y propone la pieza nueva que falta encajando con el patron actual — no inventando un patron paralelo.
- Sub-grupos identificados a partir de las imagenes de esta sesion: `IMPUTACION`, `CONCILIACION`, `GOVERNANCE`, `DOCUMENTACION`, `CIERRE`. Tipicos pero no canonicos cross-modulos.

### Como retomar en otra sesion

1. **Leer este discovery** (es el punto de entrada actualizado al 2026-05-10). Especialmente §"Decisiones arquitectonicas transversales" y §"Modelo conceptual unificado".
2. **Leer la seccion §"Trazabilidad — REQs y AM stories"** mas arriba para los links a Jira.
3. **Estado actual a tener en cuenta antes de retomar:**
    - **Los 6 REQs transversales (REQ-59, REQ-68, REQ-69, REQ-71, REQ-73, REQ-74) estan todos enriquecidos.** Tienen toda la capa arquitectonica de la sesion 2026-05-10.
    - No quedan REQs transversales pendientes de enrichment.
4. **Convenciones del modelo nuevo para tener presentes:**
    - `record_mutation` vs `function_invocation` es el discriminador clave de toda accion del manifest.
    - Capabilities + Grupos + Panel admin viven en REQ-68; los demas REQs consumen.
    - Sub-grupos del nivel 2 (IMPUTACION, CONCILIACION, GOVERNANCE, DOCUMENTACION, CIERRE) son declarables solo en `record_mutation`. `function_invocation` siempre va flat en CONTEXTUALES.
    - Permissions de Reportes (REQ-59) referencian las mismas capabilities del capability provider de REQ-68 — misma fuente de verdad.
    - Stream de eventos del audit trail (REQ-68) es la base del activity feed de REQ-74 y de integraciones analiticas externas.
    - Universalidad del `⋯`: todo registro en lista/card/Kanban tiene menu de acciones; nunca desaparece.
    - Slack en Alertas/Inbox es capacidad opcional declarable por tipo, no mandatorio. Foco in-app.
    - V2 de REQ-59 es exploracion no-commitment; V1 (REQ + PR) es la via principal y suficiente.
    - Transiciones del Kanban (REQ-69) son acciones `record_mutation` del manifest referenciadas por `action_id` desde el eje; `<ClosureModal>` es el `<ManifestDialog>` con header/copy de cierre.
    - Dashboard (REQ-74) es lectura agregada — NO consume el manifest engine para mutar, solo consume el stream del audit trail y el capability provider. Counters filtrados por capabilities; KPI cards con `requires_capability` se ocultan cuando el usuario no tiene la capability. Alertas categoria `cross_app_panel` viven prioritariamente como cards del Dashboard.
5. **Trabajos abiertos heredados** — ver §"Pendientes" mas arriba (migracion REQ-52/REQ-33, matriz canonica de capabilities, `target_role` conventions cross-app, relevamiento de adopcion por app, REQs por area consumidores).

---

## Refinamiento del modelo conceptual — Sesion 2026-05-12

Sesion de refinamiento sobre el modelo del Centro de Solicitudes que NO modifica REQs en Jira (los REQs siguen en SENT TO DEV sin cambios), pero formaliza dos principios arquitectonicos que estaban implicitos en el paradigma y agrega claridad de scope. Estos principios aplican transversalmente al modelo del core y se reflejan en `centro-de-solicitudes.md`.

### Principio "Wizard of Oz arquitectonico": capacidades, no rutas

Un CTA externo (en CLP, Pago Directo, RFQ Gateway, etc.) **invoca una capacidad** del `target_app`, no una ruta de ejecucion especifica. La capacidad decide internamente:

- **Integracion directa** — resultado inmediato, no toca el Centro de Solicitudes
- **Crear Solicitud/Tarea en el Centro** — resultado eventual, el CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado" al usuario externo

Esto habilita el patron de Wizard of Oz arquitectonico: lanzar un producto con ejecucion 100% humana en el Centro desde dia uno y automatizar progresivamente sin tocar el CTA externo. La decision "Centro si / Centro no" es de implementacion en codigo (variable por monto, cliente, hora, tipo de operacion, etc.), no de discovery.

Ejemplo: el usuario del CLP clickea "Retirar". El CTA invoca la capacidad `ejecutar_retiro` de OPS. OPS decide internamente — segun parametros — si lo procesa via integracion directa o si crea una Solicitud al Centro de OPS. El usuario del CLP no se entera del path: ve "en proceso" y eventualmente "completado" o "rechazado".

### Scope explicito del Centro de Solicitudes

El Centro aterriza exclusivamente Solicitudes/Tareas **que requieren intervencion humana del backoffice**. Lo que NO vive en el Centro:

- **Jobs programaticos puros** — sincronizacion de registros, auditoria, depuracion, normalizacion, cron jobs internos. Son infraestructura tecnica que vive en codigo (Task Definitions del lado de Tecnologia, scheduler de Reportes).
- **CRON del scheduler de Reportes** — corre en su propia infraestructura; cuando interactua con humanos lo hace creando Tareas al Centro (`report_dependency_block`, `reporte_proximo_emision_manual`).

Interseccion: un job programatico puede declarar **fallback opt-in al Centro**. Cuando el job falla y el fallback esta habilitado, el sistema invoca el endpoint del Centro con `source_app: 'system'` y crea una Solicitud/Tarea para escalamiento humano. Si el fallback no esta habilitado, el fallo dispara alerta via Observabilidad sin tocar el Centro.

### Implicancia: no se incorpora `execution: manual | programmatic` al modelo del Inbox

Durante la sesion se exploro modelar `execution: manual | programmatic` como dimension de Solicitud/Tarea, distinguiendo wrappers de ejecucion de endpoints (programaticas) de ejecucion 100% humana (manuales). La decision final fue **no incorporar esa dimension** al modelo canonico — los jobs programaticos puros viven fuera del Centro. Las "Tareas" del Centro (`kind: tarea`) son todas de intervencion humana; la diferencia con las "Solicitudes" (`kind: solicitud`) es semantica/de presentacion, no de modo de ejecucion. El modelo canonico de `Solicitud<TPayload>` con 4 estados (`pendiente | en_proceso | completed | rejected`) permanece sin cambios.

---

## Referencias

- `core-template-frontend-discovery.md` — paradigma del template del cual derivan los 6 transversales.
- Iniciativa Jira: [REQ-3 — Ardua Fintech: Financial Core as a Service](https://arduasolutions.atlassian.net/browse/REQ-3) (estrategica).
- Iniciativa Jira: [REQ-81 — Ardua Financial Core: Infraestructura Transversal del Core](https://arduasolutions.atlassian.net/browse/REQ-81) (contenedora de los 6 REQs transversales).
