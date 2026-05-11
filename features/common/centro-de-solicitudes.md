---
aplicacion: COMMON
status: Definida
owner: Yasmani Rodriguez
created_at: 2026-05-11
updated_at: 2026-05-11
req: REQ-71
discovery: core-modulos-transversales-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN]
---

# Centro de Solicitudes (Inbox)

## Propósito

Centro transversal del backoffice de Ardua donde aterriza **toda Solicitud o Tarea que requiere intervención humana del backoffice** — sin importar si la generó otra app del core, un sistema externo, el scheduler de Reportes, el propio scheduler del Inbox para series recurrentes, o un usuario manualmente desde una UI.

Reemplaza la dispersión actual (Slack, correo, hilos sueltos, planillas) por un repositorio formal con: estados canónicos, audit trail, asignación, motor de routing por capability, triggers automáticos, CTAs en Drawer, auto-archive, series recurrentes, y notificaciones multi-canal.

**Umbrella:** Centro de Solicitudes. La UI muestra **dos categorías** (Solicitudes / Tareas) diferenciadas por label/badge. **El motor es uno solo.** La diferencia entre `kind: 'solicitud'` y `kind: 'tarea'` es semántica y de presentación; la mecánica (estados, transiciones, `<ClosureModal>`, audit trail, triggers, routing) es idéntica.

---

## Convención: Solicitud vs Tarea

| Aspecto | Solicitud | Tarea |
|---|---|---|
| `kind` | `solicitud` | `tarea` |
| Origen típico | Otra app/usuario pide algo al `target_app` (ej: CLP solicita retiro a OPS) | El propio `target_app` debe hacer algo (ej: conciliar movimientos del día) |
| Quién la origina | Tercero (usuario externo, otra app, sistema) | El propio área dueña o un scheduler interno |
| Vocabulario `closeActions` | "Aprobada" / "Rechazada" / "Resuelta" / "Devuelta al solicitante" | "Hecha" / "No corresponde" / "Descartada" |
| Recurrencia | Atípica (suelen ser puntuales) | Frecuente (diaria, semanal, mensual) |
| Mecánica subyacente | Idéntica | Idéntica |

El `kind` deriva del `InboxTypeConfig` y se muestra como badge en el Drawer. Los filtros de la vista permiten ver Solicitudes / Tareas / Todas.

---

## Estado v1

### Adentro

| Capacidad | Detalle |
|---|---|
| Modelo canónico `Solicitud<TPayload>` | Definido en `src/types/genericos.ts`, no redefinible. Incluye `kind`, `assignee`, `recurring_definition_id` |
| Entidad `RecurringInboxItemDefinition` | Serie recurrente declarada con cadencia, `default_assignee`, `payload_template`, `series_state` |
| `InboxTypeConfig` | Registry por tipo con `kind` mandatorio, `creable_manualmente`, `manual_creation_capability`, `closeActions[]`, triggers, CTAs, push, auto-archive |
| Estados canónicos | `pendiente` · `en_proceso` · `completed` · `rejected` (terminales inmutables, mecánica invariante) |
| Asignación manual (`assignee`) | Editable en cualquier estado no terminal vía CTA "Asignar/Reasignar/Liberar" |
| Motor de routing por `target_role` | Reusa el capability provider de REQ-68 |
| API de ingesta y creación | Endpoint único consumible desde otras apps, sistemas externos, UI manual, scheduler |
| Creación manual desde otra app | Patrón de consumo del endpoint con identidad del usuario |
| Creación manual desde el módulo Inbox | CTA "Crear Solicitud/Tarea" filtrado por `creable_manualmente: true` |
| Creación automática (sistema/API) | Identidad de sistema, `source_app` declarado |
| Creación automática recurrente | Scheduler del Inbox dispara instancias según `RecurringInboxItemDefinition` |
| Drawer compartido | Header + body + Timeline + Comments + acciones; shared con Alertas (REQ-73) |
| `<ClosureModal>` con `closeActions` por tipo | Comentario obligatorio ≥ 10 chars |
| Triggers automáticos | `triggers_on_create[]` referencian acciones del manifest (REQ-68) con `payload_mapping` |
| CTAs en el Drawer | `available_actions[]` del manifest con `enable_when` |
| Auto-archive declarativo | Cierre algorítmico con `closed_by: 'system'` + `closure_action` declarado |
| Vistas | Lista + Kanban (con Ejes vía REQ-69) |
| Filtros L3 | `kind` · `type` · `state` · `target_role` · `assignee` · "Mías" · Período · dimensiones del dominio |
| Notificaciones | Badge sidebar (mandatorio) · Web Notifications API (opt-in) · Email opcional · Slack opcional |
| Persistencia interna | BBDD propia de Ardua; Solicitud + Timeline + Comments inmutables tras cierre |
| Flujo formal de alta de tipos y series | Solicitud estructurada → REQ hijo → implementación + registry |

### Afuera (diferido a v2)

- Workflow multi-paso (más allá de los 4 estados canónicos)
- Bulk operations
- Asignación a equipo (`assignee` grupal, además del individual)
- Vinculación automática entre Solicitudes (una Solicitud que coordina N en otras apps)
- UI gestionada de series recurrentes (pausar/archivar/modificar desde el frontend) — en v1 vía REQ
- Persistencia de filtros y vista por usuario
- Re-apertura de terminales (bloqueada por contrato)
- Canales adicionales: MS Teams, SMS, WhatsApp, push nativo móvil
- Asistente IA para definir nuevos tipos o series

---

## Modelo canónico

Definido una sola vez en `src/types/genericos.ts` del core. Las apps **no redefinen** — extienden vía generics.

```typescript
type InboxKind  = 'solicitud' | 'tarea';
type InboxState = 'pendiente' | 'en_proceso' | 'completed' | 'rejected';

interface Solicitud<TPayload = unknown> {
  id: string;
  type: string;                       // declarado en INBOX_TYPES del target_app
  kind: InboxKind;                    // derivado de InboxTypeConfig.kind
  source_app: string;
  source_module: string;
  target_app: string;
  target_role?: string;               // capability para routing
  assignee?: string | null;           // asignación manual, editable, opcional
  owner: string | null;               // auto-asignado en transición a en_proceso
  sla_hours: number;
  due_at?: number;
  state: InboxState;
  payload: TPayload;
  closure_action?: string;
  closure_comment?: string;
  closed_by?: string;                 // user_id o 'system'
  closed_at?: number;
  recurring_definition_id?: string;   // si es instancia recurrente
  triggered_actions?: TriggeredAction[];
  timeline: TimelineEvent[];          // canónico shared con Alertas
  comments: Comment[];                // canónico shared con Alertas
  created_at: number;
  updated_at: number;
}

interface TimelineEvent {
  kind: 'created' | 'taken' | 'released' | 'assigned' | 'state_change'
      | 'comment' | 'closed' | 'system' | 'action_invoked';
  at: number;
  by: string;                         // user_id o 'system'
  payload?: Record<string, unknown>;  // p.ej. { previous_assignee, new_assignee }
}

interface Comment {
  id: string;
  by: string;
  at: number;
  text: string;
}

interface TriggeredAction {
  action_ref: string;                 // referencia al manifest de REQ-68
  status: 'pending' | 'ok' | 'error';
  result_ref?: string;
  error_message?: string;
  at: number;
}

interface InboxTypeConfig {
  type: string;
  kind: InboxKind;                                // mandatorio
  label: string;
  target_app: string;
  target_role?: string;
  payload_schema: JSONSchema;
  sla_hours?: number;
  creable_manualmente?: boolean;                  // default false
  manual_creation_capability?: string;            // requerida para creación manual desde UI
  closeActions: CloseAction[];                    // al menos uno
  triggers_on_create?: TriggerSpec[];             // acciones del manifest + payload_mapping
  available_actions?: ActionSpec[];               // CTAs en el Drawer + enable_when
  push_notification?: {
    browser?: { enabled: boolean };
    email?: { enabled: boolean; recipients?: string[] };
    slack?: { enabled: boolean; channel: string; mention?: string };
  };
  auto_archive?: {
    condition_ref: string;                        // condición evaluable
    closure_action: string;
  };
  state_labels?: Partial<Record<InboxState, string>>;  // override visual, no de mecánica
}

interface CloseAction {
  id: string;
  label: string;
  terminal_state: 'completed' | 'rejected';
  requires_comment?: boolean;                     // default true (≥ 10 chars)
}

interface RecurringInboxItemDefinition {
  id: string;
  type: string;                                   // ref a InboxTypeConfig existente
  label: string;
  target_app: string;
  target_role?: string;
  default_assignee?: string | null;
  payload_template: Record<string, unknown>;
  cadence: {
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'custom';
    cron_expr?: string;                           // requerido si periodicity === 'custom'
    next_creation_date: number;
    sla_hours?: number;
    due_offset_hours?: number;
  };
  series_state: 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
}
```

---

## Estados — set canónico

| Columna Kanban | Estado interno | Significado | Terminal |
|---|---|---|---|
| **To Do** | `pendiente` | Recibida, sin tomar | No |
| **In Progress** | `en_proceso` | Tomada y siendo trabajada (`owner` definido) | No |
| **Done** | `completed` | Outcome positivo | Sí |
| **Rejected** | `rejected` | Outcome negativo | Sí |

**El mismo set canónico aplica a Solicitudes y a Tareas.** Lo que cambia entre `kind` es:

- El vocabulario de los `closeActions` (declarado por tipo).
- Opcionalmente los labels del estado vía `state_labels` (ej: una Tarea de conciliación puede mostrar "En curso" en lugar de "In Progress").

La mecánica (4 columnas, transiciones, `<ClosureModal>` mandatorio en transición a terminal, audit trail, triggers) **es invariante**. API y modelo de datos hablan en estados canónicos; la UI usa el label declarado.

Estados terminales son inmutables. Una Solicitud/Tarea cerrada no se reabre.

---

## Caminos de creación

| Camino | Quién lo invoca | Identidad | Source_app | Notas |
|---|---|---|---|---|
| **(a) Manual desde otra app del core** | Usuario en módulo de otra app (ej: CLP / Clientes) | Usuario autenticado | App de origen | Patrón de consumo del endpoint; el módulo tiene su propio formulario |
| **(b) Manual desde el propio módulo Inbox** | Usuario con `manual_creation_capability` | Usuario autenticado | Inbox del `target_app` | CTA "Crear Solicitud/Tarea" filtrado a tipos con `creable_manualmente: true` |
| **(c) Automática vía API** | Backend del core o sistema externo | Credencial de sistema | App o sistema invocador | Ej: scheduler de Reportes emite Tarea al `blocking_app` de una dependencia |
| **(d) Automática recurrente** | Scheduler del Inbox | `'system'` | `'system'` | Toma `RecurringInboxItemDefinition` con `series_state: 'active'` cuya `next_creation_date` venció |

En todos los casos: validación de `type` en el registry del `target_app`, derivación de `kind`, persistencia con `state: 'pendiente'`, ejecución de `triggers_on_create[]`, disparo de notificaciones (§ Notificaciones).

---

## Asignación, routing y notificaciones

### Asignación manual (`assignee`)

Registra a quién se le asignó explícitamente. Es **independiente del `owner`**:

- `assignee` = a quién está dirigida la Solicitud/Tarea (puede setearse al crear o después).
- `owner` = quién la está trabajando ahora (auto-asignado en transición a `en_proceso`).

Puede setearse al crear (endpoint o CTA manual) o posteriormente vía CTA **"Asignar / Reasignar / Liberar"** en el Drawer. Cualquier usuario con capability para gestionar el Inbox del `target_app` puede asignar/reasignar/desasignar en cualquier estado no terminal. Cada cambio registra `TimelineEvent { kind: 'assigned', by, payload: { previous_assignee, new_assignee } }`.

### Routing por `target_role`

Cuando se declara `target_role`, el motor notifica a usuarios con esa capability dentro del `target_app`. Sin `target_role`, se ofrece a cualquier usuario con capability genérica de Inbox del `target_app`. El motor consume el capability provider de REQ-68. **Compartido con REQ-73 (Alertas)**.

### Priorización de notificaciones

| Caso | Quién recibe el highlight |
|---|---|
| `assignee` definido | El usuario `assignee` (y solo él) |
| Sin `assignee`, con `target_role` | Todos los usuarios del `target_app` con la capability del `target_role` |
| Sin `assignee` ni `target_role` | Todos los usuarios del `target_app` con capability genérica de Inbox |

Cambiar `assignee` redirige la notificación al nuevo destinatario.

### Canales

- **Badge en sidebar** (mandatorio). Contador de no revisadas dirigidas al usuario actual (`assignee = user_actual` o, sin `assignee`, `target_role` me corresponde). Tiempo real. Click navega con filtro "Pendientes mías".
- **Notificación del navegador** (opt-in). Web Notifications API cuando una Solicitud/Tarea cae al Inbox del usuario con la app abierta en otra pestaña.
- **Email** (opcional por tipo, `push_notification.email.enabled: true`).
- **Slack** (opcional por tipo, `push_notification.slack.enabled: true`). El mensaje es **solo aviso** — gestión siempre in-app.
- **Otros canales (MS Teams, SMS, WhatsApp, push nativo móvil) — V2.**

---

## Acciones invocables: triggers automáticos + CTAs en el Drawer

Toda acción ejecutable por una Solicitud/Tarea se declara en `InboxTypeConfig`:

- **`triggers_on_create[]`** — acciones del manifest de REQ-68 invocadas automáticamente al crear, con `payload_mapping` desde el payload de la Solicitud al input de la acción. El status y `result_ref` quedan registrados en `triggered_actions[]` y se muestran en el panel correspondiente del Drawer.
- **`available_actions[]`** — CTAs visibles en el Drawer con `enable_when` (condición evaluable contra estado, payload, capabilities del usuario). Las transiciones de estado (`tomar`, `liberar`, `resolver`) son acciones del manifest también.

El motor de transitions valida que la transición pedida sea válida (4 estados canónicos), valida capability del invocador contra la acción, ejecuta el `closure_action` cuando aplica, y dispara `<ClosureModal>` con los `closeActions` del tipo cuando la transición es a terminal.

---

## Drawer + Timeline + Comments

Click abre el `<Drawer>` lateral del core con:

- **Header:** id, tipo, `kind` con badge "Solicitud"/"Tarea", estado, `owner`, `assignee` cuando aplica, SLA visual (ámbar 50–100%, rojo vencido), `due_at`.
- **Body:** campos del payload renderizados según `type`.
- **Acciones:** Tomar / Liberar / Resolver + CTA "Asignar/Reasignar/Liberar" + CTAs de `available_actions[]`.
- **Triggered actions:** panel con `status` y `result_ref` de cada acción del manifest disparada por `triggers_on_create[]`.
- **Timeline:** eventos cronológicos (`TimelineEvent[]`).
- **Comments:** cross-user, persisten como `Comment` y aparecen también en Timeline.

`<Drawer>`, Timeline y Comments **shared con Alertas** (REQ-73).

---

## Series recurrentes

Casos típicos: "Conciliar movimientos del día" diario para OPS; "Revisar Nostros del mes" mensual para FIN; "Backup off-site semanal" cada lunes. El patrón se modela como **serie recurrente** declarada (`RecurringInboxItemDefinition`) que genera **instancias** según una cadencia.

### Modelo: serie ↔ instancia

| Concepto | Qué es |
|---|---|
| **Serie** | Definición. Qué tipo, qué payload base, qué cadencia, qué target, qué `default_assignee`, qué estado |
| **Instancia** | Solicitud/Tarea individual generada por el scheduler. Lifecycle propio, `owner` propio, `closure_action` propio. Vinculada vía `recurring_definition_id` |

**Cada instancia es independiente.** La del día X que no se completó a tiempo no bloquea la del día X+1; coexisten en el Inbox hasta que cada una se cierre. Esto difiere del comportamiento naive de "una sola tarea repetida".

### Scheduler del Inbox

Job periódico (frecuencia a decisión de Tecnología) que:

1. Identifica `RecurringInboxItemDefinition` con `series_state: 'active'` cuya `next_creation_date` venció.
2. Invoca el endpoint (§ Caminos de creación) con `source_app: 'system'`, `type` y `payload_template` de la serie, `target_app`, `target_role`, `assignee: default_assignee`, `recurring_definition_id`, y los `sla_hours` / `due_offset_hours` declarados.
3. Actualiza `next_creation_date` según la cadencia.

Si la serie está `paused` o `archived`, salta sin generar.

### Flujo formal de alta de series

Análogo al de tipos. El área completa solicitud con: tipo referenciado (debe existir); label; target_app/target_role; `default_assignee` (puede ser `null`); payload template; cadencia (periodicity + cron_expr opcional); SLA / due_offset; estado inicial. Producto valida y abre REQ hijo; Tecnología registra la serie; el scheduler comienza a generar instancias.

### Pausa, archivado, modificación

- **Pausa (`paused`)** detiene la generación sin eliminar la serie.
- **Archivado (`archived`)** la termina.
- **Modificar cadencia o payload template** de una serie activa requiere REQ formal en v1.
- **UI para gestionar esto desde el frontend es V2.**

### Dependencias liberadas por completitud

El cierre exitoso de una instancia puede liberar dependencias declaradas externamente. **No está modelado dentro de la serie** — son los consumidores externos (Reportes, otras Tareas) los que declaran sus dependencias contra `recurring_definition_id` o contra el `type`.

**Ejemplo end-to-end:**

1. Existe la serie recurrente diaria `daily_reconciliation` (target OPS).
2. El reporte de UIF declara `ReportDependency` apuntando a "instancia de `daily_reconciliation` del día previo, `completed: true`".
3. Cuando esa instancia pasa a `completed`, Reportes lo detecta y marca `dependencies[].completed: true`.
4. Si Reportes ejecuta sin esa instancia completa: queda registrada en `ReportRun.dependencies_unmet[]` y se emite Alerta `reporte_dependencias_incompletas` al consumidor (ver `centro-de-reporteria.md`).

---

## Patrón por área (ejemplos típicos)

Indicativos — los tipos concretos se declaran por REQ por área.

| Área | Solicitudes típicas | Tareas típicas |
|---|---|---|
| **OPS** | Retiros, movimientos manuales, asignaciones, atención a casos cross-app | `daily_reconciliation`, revisión de pendings de Bandeja, conciliación PSP |
| **LEX** | KYC bajada manual, revisión de ROS, alta de cliente con documentación incompleta | Revisión periódica de blacklists, refresco anual de KYC, alertas regulatorias |
| **FIN** | Aprobación de pagos, alta de proveedor, registro de gasto extraordinario | `monthly_nostros_review`, cierre mensual, revisión de matching contable |
| **TRD** | Validación de cotizaciones fuera de banda, alta de proveedor de liquidez | Revisión de límites por cliente, monitoreo de spreads, cierre de mesa diario |
| **CLP** | (no es destino primario; CLP es source — sus Solicitudes aterrizan en OPS/LEX/FIN/TRD) | — |

---

## Naturaleza del servicio

| Capa | Implementación |
|---|---|
| Backend | Transversal en el core: endpoint, motor de routing y asignación, persistencia, audit trail, motor de triggers, scheduler de series recurrentes, auto-archive, notificación. Contrato único |
| UI | Por app: cada app con tipos declarados renderiza su módulo Inbox con sus `INBOX_TYPES`, listas, filtros, Drawer, formularios de creación manual |
| Modelado | Una Solicitud/Tarea = un `target_app`. Eventos que aterrizan en dos apps se modelan como dos Solicitudes vinculadas (V2 evalúa coordinación automática) |

---

## Integraciones

| Con | Cómo |
|---|---|
| **Alertas** (`centro-de-alertas.md`, REQ-73) | Comparten `TimelineEvent`, `Comment`, `<Drawer>`, motor de routing por `target_role` |
| **Acciones / Manifest Engine** (REQ-68) | Triggers automáticos y CTAs del Drawer son acciones del manifest; capability provider resuelve `user → capabilities`; transiciones de estado son acciones también |
| **Vistas** (REQ-69) | Lista, Kanban, Ejes, filtros L3, mecánica de Drawer compartida |
| **Centro de Reportería** (`centro-de-reporteria.md`, REQ-59) | Reportes con dependencias bloqueantes emiten Tareas `report_dependency_block` al Inbox del `blocking_app` con `auto_archive`; reportes consumen `recurring_definition_id` o `type` para sus `dependencies[]`; ejecuciones generan reportería del propio Inbox |
| **Auth0** | Identidad del invocador del endpoint |
| **Slack** | Servicio del grupo (Slack API + n8n/Miles) para push opcional por tipo |

---

## Apps consumidoras

| App | REQ por área | Tipos declarados | Estado |
|---|---|---|---|
| **OPS** | pendiente | Retiros, movimientos manuales, conciliación, asignaciones | — |
| **LEX** | pendiente | KYC, ROS, blacklist review, KYC refresh | — |
| **FIN** | pendiente | Aprobaciones, alta proveedor, nostros review, cierre mensual | — |
| **TRD** | pendiente | Validaciones de cotización, alta proveedor liquidez, monitoreo | — |
| **CLP** | a evaluar | (source típico, no target primario) | — |

Los REQs por área entregan: qué tipos declara cada app, qué payload por tipo, qué `closeActions[]`, qué triggers y CTAs, qué política de push, qué series recurrentes, y los formularios de creación manual cuando aplica.

---

## Reportes analíticos

El repositorio es base consultable. Reportes típicos vía REQ-59:

- Throughput por tipo y período (diferenciado por `kind`).
- Tiempo medio de cierre.
- % `completed` vs % `rejected`.
- % SLA cumplidos vs vencidos.
- % auto-archived vs cerradas manualmente.
- Carga por `target_role` / `assignee`.
- **Eficacia de series recurrentes**: % instancias completadas a tiempo, lag medio, gaps en la cadencia.
- Reportes regulatorios derivados.

---

## Decisiones clave

| # | Fecha | Decisión |
|---|---|---|
| 1 | 2026-05-11 | **Umbrella "Centro de Solicitudes"** con dos categorías (Solicitudes / Tareas) diferenciadas solo por label/`kind`. Motor único |
| 2 | 2026-05-11 | **Recurrencia como entidad separada** (`RecurringInboxItemDefinition`) con flujo formal de alta, no como atributo del tipo. Cada instancia es independiente |
| 3 | 2026-05-11 | **Asignación manual (`assignee`) opcional y editable** en cualquier estado no terminal. Independiente del `owner` (que es runtime, auto-asignado en `en_proceso`) |
| 4 | 2026-05-11 | **Cuatro caminos de creación** explícitos: manual desde otra app, manual desde el propio Inbox, automática vía API, automática recurrente. Endpoint único |
| 5 | 2026-05-11 | **Creación manual desde el propio Inbox** habilitada por tipo con `creable_manualmente: true` + `manual_creation_capability`. Permite que un área cree sus propias Tareas operativas sin pasar por otra app |
| 6 | 2026-05-11 | **Estados canónicos invariantes** (4 estados). Los labels visibles pueden override vía `state_labels` pero la mecánica nunca cambia |
| 7 | 2026-05-11 | **`REPORT_DEPENDENCY` ahora se modela como Tarea al Inbox** del `blocking_app` con `auto_archive` (no como Alerta). Resuelve el coupling Reportes ↔ Inbox sin pasar por Alertas |
| 8 | 2026-05-11 | **Reportes con `allows_auto_generation: false`** que están próximos a emitir generan **Tarea** al Inbox (`reporte_proximo_emision_manual`), no Alerta. Los con `true` generan Alerta al consumidor |

---

## Frentes abiertos

- **Construcción de v1** — entregable de Tecnología bajo AM-1017 (TO REFINEMENT)
- **REQs por área** para OPS, LEX, FIN, TRD — declaración de tipos, payloads, series recurrentes, formularios manuales. Surgen a demanda
- **Coordinación REQ-59 ↔ REQ-71** — el tipo `report_dependency_block` (Tarea con auto_archive) vive del lado de REQ-71 y se consume desde REQ-59
- **V2** — workflow multi-paso, bulk operations, asignación a equipo, vinculación automática, UI gestionada de series, asistente IA

---

## Referencias

- REQ entregable: REQ-71 · espejo en AM-1017
- Discovery relacionado: `discoveries/core-modulos-transversales-discovery.md`
- Features relacionadas:
  - Centro de Alertas (`centro-de-alertas.md`) — comparte `<Drawer>`, `TimelineEvent`, `Comment`, motor de routing
  - Centro de Reportería (`centro-de-reporteria.md`) — emite Tareas con auto_archive para `REPORT_DEPENDENCY`; consume `recurring_definition_id` para `ReportDependency`
  - Acciones / Manifest Engine (REQ-68) — provee acciones invocadas por triggers y CTAs
  - Vistas (REQ-69) — provee Lista, Kanban, Ejes, filtros L3, mecánica de Drawer
