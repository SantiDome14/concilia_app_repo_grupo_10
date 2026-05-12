---
aplicacion: COMMON
status: Definida
owner: Yasmani Rodriguez
created_at: 2026-05-11
updated_at: 2026-05-12
req: REQ-71
discovery: core-modulos-transversales-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN]
---

# Centro de Solicitudes (Inbox)

## Propósito

El Centro de Solicitudes es la **vista filtrada del backoffice de Ardua que muestra todo lo que requiere intervención humana** — ya sea porque la solicitud, la ejecución, o ambas, necesitan a una persona. Reemplaza la dispersión actual (Slack, correo, hilos sueltos, planillas) por un repositorio formal con: estados canónicos, audit trail, asignación, motor de routing por capability, triggers automáticos, CTAs en el Drawer, evidencias, dependencias anticipadas, retry de ejecuciones programáticas fallidas, y notificaciones multi-canal.

**Inbox = vista filtrada, no contenedor universal.** El sistema persiste **todas** las ejecuciones (manuales y programáticas) en bbdd para audit y reporting. El Inbox solo renderiza las que requieren acción humana en este momento, regla expresada en una sola línea: `execution_mode === 'human' OR state === 'failed'`. Las ejecuciones programáticas exitosas existen como registros — auditables, consultables, reportables — pero no aparecen en la vista del Inbox.

**Umbrella:** Centro de Solicitudes. La UI muestra **dos categorías visibles** (Solicitudes / Tareas), diferenciadas por origen del request. **El motor es uno solo.** La mecánica (estados, transiciones, `<ClosureModal>`, audit trail, triggers, routing) es idéntica para ambas.

---

## Principio arquitectónico: capacidades, no rutas

Un CTA externo (en CLP, Pago Directo, RFQ Gateway, etc.) **invoca una capacidad** del `target_app`, no una ruta de ejecución específica. La capacidad decide internamente cómo se ejecuta:

| Decisión interna de la capacidad | Resultado para el CTA |
|---|---|
| Integración directa (sin intervención humana) | Resultado inmediato, no aparece en el Centro |
| Crear Solicitud/Tarea en el Centro | Resultado eventual; el CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado" al usuario externo |

Esto habilita el patrón **"Wizard of Oz arquitectónico"**: un producto puede lanzarse con ejecución 100% humana en el Centro desde día uno y automatizarse progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación en código (puede variar por monto, cliente, hora, tipo de operación, etc.), no de discovery de producto.

**Ejemplo end-to-end.** El usuario del CLP clickea "Retirar". El CTA invoca la capacidad `ejecutar_retiro` de OPS. OPS decide internamente — según monto, cliente, hora, etc. — si lo procesa vía integración directa o si crea una Solicitud al Centro de OPS para que un analista la ejecute. El usuario del CLP no se entera del path: ve "en proceso" y eventualmente "completado" o "rechazado".

### Scope explícito del Centro

El Centro **persiste** ejecuciones de cuatro naturalezas combinables (origen × modo de ejecución) y **muestra en el Inbox** solo las que requieren ojo humano. Lo que NO existe en el Centro:

- **Jobs programáticos puros del sistema** sin contraparte de producto — sincronización de registros, auditoría técnica, depuración, normalización, cron jobs internos. Son infraestructura técnica que vive en código (Task Definitions de Tecnología), fuera del Centro.

**Intersección entre los dos mundos:** un job programático puro puede declarar **fallback opt-in al Centro**. Cuando el job falla y el fallback está habilitado, el sistema invoca el endpoint del Centro con `source_app: 'system'` y crea una Solicitud/Tarea para escalamiento humano. Si el fallback no está habilitado, el fallo dispara alerta vía Observabilidad sin tocar el Centro.

---

## Convención: matriz origen × ejecución

Toda entrada del catálogo del Centro se clasifica por dos dimensiones ortogonales declaradas en el `InboxTypeConfig`:

- **`type`** — origen del request: `'request'` (humano) o `'task'` (programático).
- **`execution_mode`** — modo de ejecución: `'human'` o `'programmatic'`.

Las cuatro combinaciones generan los cuatro cuadrantes de la matriz:

| `type` | `execution_mode` | Cuadrante | Naturaleza | Visible en Inbox |
|---|---|---|---|---|
| `request` | `human` | **Solicitud** | Solicitada por una persona, ejecutada por una persona | Siempre |
| `task` | `human` | **Task** | Solicitada programáticamente (scheduler, sistema), ejecutada por una persona | Siempre |
| `request` | `programmatic` | **Función invocada** | Solicitada por una persona vía CTA/Acción, ejecutada por un endpoint | Solo si Failed |
| `task` | `programmatic` | **Background job** | Solicitada y ejecutada programáticamente | Solo si Failed |

**La regla de visibilidad del Inbox queda en una sola expresión:** `execution_mode === 'human' OR state === 'failed'`. Los dos cuadrantes inferiores existen en bbdd para audit y reporting; solo se renderizan en el Inbox cuando entran a `failed`, momento en el que pasan a requerir ojo humano (retry o decisión de descartar).

**Vocabulario por cuadrante:**

| Cuadrante | `closeActions` típicos | Cierre |
|---|---|---|
| Solicitud | "Aprobada" / "Rechazada" / "Resuelta" / "Devuelta al solicitante" | Manual + evidencia |
| Task | "Hecha" / "No corresponde" / "Descartada" | Manual + evidencia |
| Función invocada | Outcome derivado de la ejecución (`completed` / `failed`) | Automático |
| Background job | Outcome derivado de la ejecución (`completed` / `failed`) | Automático |

El badge en el Drawer y los filtros del Inbox usan el `type` para diferenciar "Solicitudes" de "Tareas" en lenguaje natural.

---

## Estado v1

### Adentro

| Capacidad | Detalle |
|---|---|
| Modelo canónico `Solicitud<TPayload>` | Definido en `src/types/genericos.ts`, no redefinible. Incluye `type`, `execution_mode`, `concept`, `assignee`, `source_user`, `requested_at`, `evidence[]`, `retry_count`, `consumer_association_id` |
| `InboxTypeConfig` | Registry por `concept` con `type` y `execution_mode` mandatorios, `endpoint_ref` (para programmatic), `closeActions[]` (para human), triggers, CTAs, push, auto-archive |
| Entidad `RecurringInboxItemDefinition` | Serie recurrente declarada con cadencia, `default_assignee`, `payload_template`, `series_state` |
| Entidad `ConsumerTypeAssociation` | Asociación consumidor-tipo predefinido con `lead_time_days` configurable y dos modos de satisfacción (`generate_new` / `verify_existing`). Habilita generación anticipada o verificación de instancias existentes |
| Estados canónicos | `pendiente` · `en_proceso` · `completed` · `rejected` · `failed` (cinco estados; terminales `completed` y `rejected` inmutables; `failed` con retry) |
| Endpoint público invocable | Primitiva común para tipos con `execution_mode: 'programmatic'`. Sirve a cuatro escenarios: scheduler, Acción/CTA del manifest, retry desde Drawer, retry desde Alerta |
| Asignación manual (`assignee`) | Editable en cualquier estado no terminal vía CTA "Asignar/Reasignar/Liberar" |
| Motor de routing por `target_role` | Reusa el capability provider de REQ-68 |
| API de ingesta y creación | Endpoint único consumible desde otras apps, sistemas externos, UI manual, scheduler, asociaciones consumidor-tipo |
| Cinco caminos de creación | Manual desde otra app · manual desde el propio Inbox · automática vía API · automática recurrente · **anticipada por consumidor con `lead_time`** |
| Drawer compartido | Header + body + Timeline + Comments + Evidencias + acciones; shared con Alertas (REQ-73) |
| `<ClosureModal>` con `closeActions` por tipo | Comentario obligatorio ≥ 10 chars (para tipos con `execution_mode: 'human'`) |
| Evidencias | Sección del Drawer/Dialog. Manuales: check + adjuntos. Programáticas: log de éxito/error registrado automáticamente |
| Triggers automáticos | `triggers_on_create[]` referencian acciones del manifest (REQ-68) con `payload_mapping` |
| CTAs en el Drawer | `available_actions[]` del manifest con `enable_when`. Incluye CTA "Retry" para `failed` |
| Auto-archive declarativo | Cierre algorítmico con `closed_by: 'system'` + `closure_action` declarado |
| Retry manual de ejecuciones programáticas fallidas | CTA "Retry" en el Drawer re-invoca el `endpoint_ref` |
| Dos vistas del usuario | **Mi bandeja** (pendientes para mí) · **Mis enviadas** (las que yo creé a otros, para seguimiento) |
| Vistas | Lista + Kanban (con Ejes vía REQ-69) |
| Filtros L3 | `type` · `concept` · `state` · `target_role` · `assignee` · "Mías" · "Enviadas por mí" · Período · dimensiones del dominio |
| Notificaciones | Badge sidebar (mandatorio) · Web Notifications API (opt-in) · Email opcional · Slack opcional |
| Persistencia interna | BBDD propia de Ardua; Solicitud + Timeline + Comments + Evidence inmutables tras cierre |
| Flujo formal de alta de tipos, series y asociaciones | Solicitud estructurada → REQ hijo → implementación + registry |

### Afuera (diferido a v2)

- Auto-retry con back-off para tipos programáticos fallidos
- Workflow multi-paso (más allá de los 5 estados canónicos)
- Bulk operations
- Asignación a equipo (`assignee` grupal, además del individual)
- Vinculación automática entre Solicitudes (una Solicitud que coordina N en otras apps)
- UI gestionada de series recurrentes y asociaciones consumidor-tipo (pausar/archivar/modificar desde el frontend) — en v1 vía REQ
- Persistencia de filtros y vista por usuario
- Re-apertura de terminales (bloqueada por contrato)
- Canales adicionales: MS Teams, SMS, WhatsApp, push nativo móvil
- Asistente IA para definir nuevos tipos, series o asociaciones

---

## Modelo canónico

Definido una sola vez en `src/types/genericos.ts` del core. Las apps **no redefinen** — extienden vía generics.

```typescript
type InboxType      = 'request' | 'task';
type InboxExecution = 'human' | 'programmatic';
type InboxState     = 'pendiente' | 'en_proceso' | 'completed' | 'rejected' | 'failed';
type EvidenceKind   = 'manual_check' | 'attachment' | 'system_log';

interface Solicitud<TPayload = unknown> {
  id: string;
  concept: string;                       // clasificador de negocio — clave en INBOX_TYPES del target_app
  type: InboxType;                       // origen del request — derivado del registry
  execution_mode: InboxExecution;        // modo de ejecución — derivado del registry
  source_app: string;
  source_module: string;
  source_user?: string;                  // quien generó el registro; alimenta la vista "Mis enviadas"
  target_app: string;
  target_role?: string;                  // capability para routing
  assignee?: string | null;              // asignación manual, editable, opcional
  owner: string | null;                  // auto-asignado en transición a en_proceso

  state: InboxState;
  payload: TPayload;

  // Fechas semánticas distintas
  requested_at: number;                  // cuándo se solicita formalmente; puede ser futura (caso de generación anticipada)
  due_at?: number;                       // deadline para ejecutar
  sla_hours?: number;
  created_at: number;                    // timestamp técnico de persistencia
  updated_at: number;

  // Cierre (para execution_mode='human') o registro de outcome (para 'programmatic')
  closure_action?: string;
  closure_comment?: string;
  closed_by?: string;                    // user_id o 'system'
  closed_at?: number;

  // Failed y retry — solo aplican a execution_mode='programmatic'
  failure_reason?: string;
  retry_count?: number;
  last_retry_at?: number;

  // Evidencias — coexisten con closeAction + comentario
  evidence: Evidence[];

  // Vínculos opcionales
  recurring_definition_id?: string;      // si fue generada por una serie recurrente
  consumer_association_id?: string;      // si fue generada anticipadamente por un consumidor

  // Otros
  triggered_actions?: TriggeredAction[];
  timeline: TimelineEvent[];             // canónico shared con Alertas
  comments: Comment[];                   // canónico shared con Alertas
}

interface Evidence {
  id: string;
  kind: EvidenceKind;                    // 'manual_check' | 'attachment' | 'system_log'
  by: string;                            // user_id o 'system'
  at: number;
  payload: Record<string, unknown>;      // según el kind: { confirmed: true } / { file_ref, file_name } / { log_text, status }
}

interface TimelineEvent {
  kind: 'created' | 'taken' | 'released' | 'assigned' | 'state_change'
      | 'comment' | 'closed' | 'system' | 'action_invoked'
      | 'evidence_added' | 'retried' | 'failed';
  at: number;
  by: string;                            // user_id o 'system'
  payload?: Record<string, unknown>;     // p.ej. { previous_assignee, new_assignee } o { retry_count, failure_reason }
}

interface Comment {
  id: string;
  by: string;
  at: number;
  text: string;
}

interface TriggeredAction {
  action_ref: string;                    // referencia al manifest de REQ-68
  status: 'pending' | 'ok' | 'error';
  result_ref?: string;
  error_message?: string;
  at: number;
}

interface InboxTypeConfig {
  concept: string;                                       // clave de negocio (ej: 'aprobacion_pago')
  type: InboxType;                                       // mandatorio — 'request' o 'task'
  execution_mode: InboxExecution;                        // mandatorio — 'human' o 'programmatic'
  label: string;
  target_app: string;
  target_role?: string;
  payload_schema: JSONSchema;
  sla_hours?: number;

  // Aplica a execution_mode='human'
  creable_manualmente?: boolean;                         // default false
  manual_creation_capability?: string;
  closeActions?: CloseAction[];                          // requerido si execution_mode='human'; al menos uno

  // Aplica a execution_mode='programmatic'
  endpoint_ref?: string;                                 // requerido si execution_mode='programmatic'

  // Comunes
  triggers_on_create?: TriggerSpec[];                    // acciones del manifest + payload_mapping
  available_actions?: ActionSpec[];                      // CTAs en el Drawer + enable_when
  push_notification?: {
    browser?: { enabled: boolean };
    email?: { enabled: boolean; recipients?: string[] };
    slack?: { enabled: boolean; channel: string; mention?: string };
  };
  auto_archive?: {
    condition_ref: string;
    closure_action: string;
  };
  state_labels?: Partial<Record<InboxState, string>>;    // override visual, no de mecánica
}

interface CloseAction {
  id: string;
  label: string;
  terminal_state: 'completed' | 'rejected';
  requires_comment?: boolean;                            // default true (≥ 10 chars)
}

interface RecurringInboxItemDefinition {
  id: string;
  concept: string;                                       // ref a InboxTypeConfig existente
  label: string;
  target_app: string;
  target_role?: string;
  default_assignee?: string | null;
  payload_template: Record<string, unknown>;
  cadence: {
    periodicity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'custom';
    cron_expr?: string;                                  // requerido si periodicity === 'custom'
    next_creation_date: number;
    sla_hours?: number;
    due_offset_hours?: number;
  };
  series_state: 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
}

interface ConsumerTypeAssociation {
  id: string;
  consumer_ref: string;                                  // ID del consumidor scheduleado (ej: 'reporte_uif_mensual')
  consumer_kind: 'report' | 'period_close' | 'expiration' | 'other';
  concept: string;                                       // tipo del Inbox que es dependency
  target_app: string;                                    // app donde se genera la instancia
  target_role?: string;
  default_assignee?: string | null;
  lead_time_days: number;                                // días antes del deadline del consumer
  satisfaction_mode: 'generate_new' | 'verify_existing'; // cómo se considera satisfecha la dependencia
  verify_window_days?: number;                           // requerido si satisfaction_mode === 'verify_existing'
  payload_template?: Record<string, unknown>;            // aplica solo a satisfaction_mode='generate_new'
  association_state: 'active' | 'paused' | 'archived';
  created_at: number;
  updated_at: number;
}
```

---

## Estados — set canónico

| Columna Kanban | Estado interno | Significado | Terminal | Quién lo dispara |
|---|---|---|---|---|
| **To Do** | `pendiente` | Recibida, sin tomar | No | Creación |
| **In Progress** | `en_proceso` | Tomada y siendo trabajada (`owner` definido) | No | `tomar` (manual) o invocación del endpoint (programático) |
| **Done** | `completed` | Outcome positivo | Sí | `resolver` con `closeAction` terminal_state='completed' (humano) o endpoint OK (programático) |
| **Rejected** | `rejected` | Outcome negativo (decisión humana) | Sí | `resolver` con `closeAction` terminal_state='rejected' (humano) |
| **Failed** | `failed` | Fallo técnico en ejecución programática; requiere retry o descartar | No (admite retry) | Endpoint con error |

**El mismo set canónico aplica a Solicitudes y a Tareas.** Lo que cambia entre cuadrantes es:

- **Disparador de las transiciones** según `execution_mode`:
  - `human`: las transiciones son acciones del manifest invocadas por el operador (`tomar`, `liberar`, `resolver`).
  - `programmatic`: el endpoint se invoca al crear; en éxito transita a `completed`, en fallo a `failed`.
- **Vocabulario de los `closeActions`** (para `human`, declarado por tipo).
- Opcionalmente los labels de estado vía `state_labels` (ej: "En curso" en lugar de "In Progress").

La mecánica (cinco estados, `<ClosureModal>` mandatorio en transición a terminal para tipos `human`, audit trail, triggers) **es invariante**. API y modelo de datos hablan en estados canónicos; la UI usa el label declarado.

**Inmutabilidad.** `completed` y `rejected` son inmutables. `failed` admite retry; cuando el retry es exitoso, el registro transita a `completed` (no se crea uno nuevo). Cuando el retry vuelve a fallar, permanece en `failed` con `retry_count` incrementado y `last_retry_at` actualizado.

---

## Caminos de creación

| Camino | Quién lo invoca | Identidad | `source_app` | Notas |
|---|---|---|---|---|
| **(a) Manual desde otra app del core** | Usuario en módulo de otra app (ej: CLP / Clientes) | Usuario autenticado | App de origen | Patrón de consumo del endpoint; el módulo tiene su propio formulario |
| **(b) Manual desde el propio módulo Inbox** | Usuario con `manual_creation_capability` | Usuario autenticado | Inbox del `target_app` | CTA "Crear Solicitud/Tarea" filtrado a tipos con `creable_manualmente: true` |
| **(c) Automática vía API** | Backend del core o sistema externo | Credencial de sistema | App o sistema invocador | Cubre fallback opt-in de jobs programáticos puros al fallar |
| **(d) Automática recurrente** | Scheduler del Inbox | `'system'` | `'system'` | Toma `RecurringInboxItemDefinition` con `series_state: 'active'` cuya `next_creation_date` venció |
| **(e) Anticipada por consumidor** | Scheduler del Inbox | `'system'` | `'system'` | Toma `ConsumerTypeAssociation` con `association_state: 'active'` y `satisfaction_mode: 'generate_new'`; calcula `consumer_deadline − lead_time_days` y genera la instancia cuando esa fecha llega. Vincula vía `consumer_association_id`. Las asociaciones con `satisfaction_mode: 'verify_existing'` no generan vía este camino — solo verifican al deadline del consumidor |

En todos los casos: validación de `concept` en el registry del `target_app`, derivación de `type` y `execution_mode` desde el `InboxTypeConfig`, persistencia con `state: 'pendiente'`, ejecución de `triggers_on_create[]`, disparo de notificaciones (§ Asignación, routing y notificaciones).

**Para tipos con `execution_mode: 'programmatic'`**, además, al crear se invoca el `endpoint_ref` (transición `pendiente → en_proceso` automática). El outcome del endpoint determina el estado final inmediato (`completed` o `failed`).

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

## Acciones invocables: triggers automáticos + CTAs en el Drawer + endpoint público

Toda acción ejecutable por una Solicitud/Tarea se declara en `InboxTypeConfig`:

- **`triggers_on_create[]`** — acciones del manifest de REQ-68 invocadas automáticamente al crear, con `payload_mapping` desde el payload de la Solicitud al input de la acción. El status y `result_ref` quedan registrados en `triggered_actions[]` y se muestran en el panel correspondiente del Drawer.
- **`available_actions[]`** — CTAs visibles en el Drawer con `enable_when` (condición evaluable contra estado, payload, capabilities del usuario). Las transiciones de estado (`tomar`, `liberar`, `resolver`) son acciones del manifest también. El CTA **"Retry"** está disponible solo en estado `failed` y re-invoca el `endpoint_ref` del tipo.
- **`endpoint_ref`** (mandatorio para `execution_mode: 'programmatic'`) — endpoint público invocable que ejecuta la lógica del tipo. Es la **primitiva común** de los cuatro escenarios de invocación: scheduler, Acción/CTA del manifest, retry desde Drawer, retry desde Alerta. El endpoint recibe el `payload` del registro y devuelve `{ status: 'ok' | 'error', result?, error_reason? }`.

El motor de transitions valida que la transición pedida sea válida (cinco estados canónicos), valida capability del invocador contra la acción, ejecuta el `closure_action` cuando aplica, y dispara `<ClosureModal>` con los `closeActions` del tipo cuando la transición es a terminal (solo para `execution_mode: 'human'`).

---

## Drawer + Timeline + Comments + Evidencias

Click abre el `<Drawer>` lateral del core con:

- **Header:** id, `concept`, `type` con badge "Solicitud"/"Tarea", `execution_mode` con badge "Manual"/"Programática", estado, `owner`, `assignee` cuando aplica, SLA visual (ámbar 50–100%, rojo vencido), `requested_at`, `due_at`.
- **Body:** campos del payload renderizados según `concept`.
- **Acciones:** Tomar / Liberar / Resolver (para `human`) + Retry (para `programmatic` en `failed`) + CTA "Asignar/Reasignar/Liberar" + CTAs de `available_actions[]`.
- **Triggered actions:** panel con `status` y `result_ref` de cada acción del manifest disparada por `triggers_on_create[]`.
- **Evidencias:** sección dedicada (§ Evidencias).
- **Timeline:** eventos cronológicos (`TimelineEvent[]`).
- **Comments:** cross-user, persisten como `Comment` y aparecen también en Timeline.

`<Drawer>`, Timeline y Comments **shared con Alertas** (REQ-73).

### Evidencias

Sección del Drawer/Dialog dedicada a registrar la evidencia del trabajo realizado. **Coexiste con `closeAction` + comentario** — no lo reemplaza. Mientras que el `closeAction` captura **qué se decidió** al cerrar y el comentario aporta justificación textual, la evidencia captura **cómo se demostró el trabajo**.

Tres tipos canónicos:

| `kind` | Cuándo aplica | Contenido del payload |
|---|---|---|
| `manual_check` | Tipo `execution_mode: 'human'` — confirmación de ejecución por parte del responsable | `{ confirmed: true, confirmed_at }` |
| `attachment` | Tipo `execution_mode: 'human'` — archivos de soporte (capturas, comprobantes, planillas) | `{ file_ref, file_name, mime_type, size_bytes }` |
| `system_log` | Tipo `execution_mode: 'programmatic'` — log del endpoint sobre la ejecución | `{ log_text, status: 'ok' \| 'error', endpoint_response_ref }` |

**Captura.** Para `human`: pueden agregarse durante `en_proceso` o al cerrar (junto con el `<ClosureModal>`). El `manual_check` es la evidencia mínima por defecto en cierre. Para `programmatic`: el `system_log` se popula automáticamente desde el endpoint al ejecutar; no requiere acción del operador. Cada agregado registra `TimelineEvent { kind: 'evidence_added' }`.

**Inmutabilidad.** Las evidencias persisten como parte del registro y son inmutables tras cierre. Base para audit interno, compliance regulatoria y auditorías externas.

---

## Series recurrentes

Casos típicos: "Conciliar movimientos del día" diario para OPS; "Revisar Nostros del mes" mensual para FIN; "Backup off-site semanal" cada lunes. El patrón se modela como **serie recurrente** declarada (`RecurringInboxItemDefinition`) que genera **instancias** según una cadencia.

### Modelo: serie ↔ instancia

| Concepto | Qué es |
|---|---|
| **Serie** | Definición. Qué `concept`, qué payload base, qué cadencia, qué target, qué `default_assignee`, qué estado |
| **Instancia** | Solicitud/Tarea individual generada por el scheduler. Lifecycle propio, `owner` propio, `closure_action` propio. Vinculada vía `recurring_definition_id` |

**Cada instancia es independiente.** La del día X que no se completó a tiempo no bloquea la del día X+1; coexisten en el Inbox hasta que cada una se cierre. Esto difiere del comportamiento naive de "una sola tarea repetida".

**Las series pueden generar instancias de cualquier `execution_mode`** — la mayoría serán `human` (conciliaciones, revisiones), pero también puede haber series programáticas (ej: "Generar reporte semanal del fondo X" como `task` + `programmatic`, donde la instancia nace, invoca el endpoint, y queda `completed` o `failed` sin intervención excepto en el caso de retry).

### Scheduler del Inbox (serie recurrente)

Job periódico (frecuencia a decisión de Tecnología) que:

1. Identifica `RecurringInboxItemDefinition` con `series_state: 'active'` cuya `next_creation_date` venció.
2. Invoca el endpoint del Centro (§ Caminos de creación, camino **d**) con `source_app: 'system'`, `concept` y `payload_template` de la serie, `target_app`, `target_role`, `assignee: default_assignee`, `recurring_definition_id`, y los `sla_hours` / `due_offset_hours` declarados.
3. Actualiza `next_creation_date` según la cadencia.

Si la serie está `paused` o `archived`, salta sin generar.

### Flujo formal de alta de series

Análogo al de tipos. El área completa solicitud con: `concept` referenciado (debe existir); label; target_app/target_role; `default_assignee` (puede ser `null`); payload template; cadencia (periodicity + cron_expr opcional); SLA / due_offset; estado inicial. Producto valida y abre REQ hijo; Tecnología registra la serie; el scheduler comienza a generar instancias.

### Pausa, archivado, modificación

- **Pausa (`paused`)** detiene la generación sin eliminar la serie.
- **Archivado (`archived`)** la termina.
- **Modificar cadencia o payload template** de una serie activa requiere REQ formal en v1.
- **UI para gestionar esto desde el frontend es V2.**

---

## Asociación consumidor-tipo predefinido

Mecanismo por el cual cualquier proceso scheduleado externo al Inbox — reportes regulatorios, cierres periódicos, vencimientos — puede **declarar una dependencia** sobre un tipo del catálogo del Inbox, indicando con cuánta antelación necesita que la instancia esté disponible para el área dueña.

### Patrón

Caso de uso paradigmático: el reporte UIF se ejecuta el día 15 de cada mes. Su correcta emisión requiere que el área de OPS haya completado previamente una conciliación operativa específica. En lugar de que el reporte intente ejecutar el día 15 y descubra que la dependencia no está, **declara la asociación con 5 días de antelación**. El sistema entonces:

1. Calcula la próxima fecha de ejecución del consumidor (día 15).
2. Resta el `lead_time_days` (5 días) → fecha de generación de la instancia (día 10).
3. Cuando llega el día 10, el scheduler invoca el endpoint del Centro con `source_app: 'system'` y crea la instancia del tipo `conciliacion_operativa_mensual` con `consumer_association_id` apuntando a la asociación.
4. La instancia aparece en el Inbox de OPS con `requested_at: día 10`, `due_at: día 15`. El área la trabaja en ese rango.
5. Cuando la instancia pasa a `completed`, el consumidor (el reporte UIF) detecta que la dependencia se cumplió y queda libre para ejecutar el día 15.
6. Si llega el día 15 y la instancia no está en `completed`, el consumidor registra `dependencies_unmet` y se emite la alerta correspondiente al área dueña del consumidor.

### Decisiones de diseño

- **El `lead_time_days` vive en la asociación, no en el tipo.** El mismo tipo del Inbox puede ser dependencia de N consumidores con tiempos distintos (ej: la conciliación operativa puede ser requerida con 5 días para UIF y con 3 días para BCRA). Cada asociación declara su propio lead time.
- **Generalización.** El mecanismo no es exclusivo de reportes (`consumer_kind: 'report'`). Cubre también cierres periódicos (`'period_close'`), vencimientos regulatorios (`'expiration'`) y cualquier otro caso scheduleado (`'other'`).
- **Convivencia con series recurrentes resuelta por el `satisfaction_mode`** (ver subsección siguiente). Cuando el mismo `concept` ya tiene una serie recurrente activa que cubre el patrón temporal de la dependencia, la asociación puede declararse con `satisfaction_mode: 'verify_existing'` para apoyarse en las instancias que la serie genera, en lugar de duplicarlas.

### Modos de satisfacción

La asociación declara cómo se considera satisfecha la dependencia vía `satisfaction_mode`:

| Modo | Comportamiento | Cuándo usar |
|---|---|---|
| `generate_new` (default) | El scheduler crea una instancia anticipada nueva cuando se cumple `lead_time_days` antes del deadline del consumidor. La instancia queda vinculada vía `consumer_association_id` y carga `payload_template` si está declarado | El concept no existe en una serie recurrente del área, o existe pero con cadencia incompatible. El consumidor necesita ese trabajo específicamente por su deadline |
| `verify_existing` | El scheduler **no genera instancia**. Al deadline del consumidor, verifica que exista al menos una instancia del `concept` en estado `Completed` dentro de la ventana `verify_window_days` previos al deadline. Si existe, la dependencia está satisfecha; si no, el consumidor registra dependencia insatisfecha y emite alerta | El concept ya tiene una serie recurrente activa del área dueña que cubre el patrón temporal. Evita generar trabajo redundante |

**Caso paradigmático de `verify_existing`:** el reporte UIF es mensual (deadline día 15). Depende de la conciliación operativa del día previo. OPS ya tiene una serie recurrente diaria `daily_reconciliation`. La asociación se declara con `satisfaction_mode: 'verify_existing'` y `verify_window_days: 1` — al día 15, verifica que la instancia del día 14 (o anteriores hasta 1 día atrás) esté `Completed`. OPS no recibe Tarea adicional; la conciliación que ya hace cubre la dependencia.

**Caso paradigmático de `generate_new`:** el reporte trimestral X requiere un análisis específico que solo se hace para ese reporte, no como parte de un proceso recurrente. La asociación se declara con `satisfaction_mode: 'generate_new'` y `lead_time_days: 5` — 5 días antes del deadline del reporte, se genera la Tarea anticipadamente para que el área dueña la trabaje.

**Implicancias del modo elegido:**

- `payload_template`, `default_assignee` y `target_role` aplican solo a `generate_new` (porque hay instancia nueva que asignar). En `verify_existing` se ignoran.
- `consumer_association_id` en la instancia (campo del registro `Solicitud<TPayload>`) se popula solo en `generate_new` — las instancias existentes verificadas no se modifican.
- Cambiar el modo de una asociación activa requiere REQ formal en V1.

### Flujo formal de alta de asociaciones

Análogo al de tipos y series. El área dueña del consumidor (o el área dueña del tipo, según convenga) completa solicitud con: `consumer_ref` (debe existir); `consumer_kind`; `concept` referenciado (debe existir); `target_app` y `target_role`; `default_assignee`; `lead_time_days`; `payload_template` opcional; estado inicial. Producto valida que el `concept` existe y que el `consumer_ref` es válido; abre REQ hijo; Tecnología registra la asociación.

### Pausa, archivado, modificación

- **Pausa (`paused`)** detiene la generación de futuras instancias sin afectar las ya generadas.
- **Archivado (`archived`)** termina la asociación.
- **Modificar `lead_time_days` o `payload_template`** de una asociación activa requiere REQ formal en v1.

---

## Vistas del usuario — Mi bandeja + Mis enviadas

El módulo Inbox de cada app expone **dos vistas top-level** orientadas al usuario:

### Mi bandeja

Lo que el usuario tiene que ejecutar. Filtro implícito: `assignee = user_actual` OR (sin `assignee` y `target_role` corresponde al usuario). Combinable con filtros L3 (estado, período, tipo, etc.).

Por defecto muestra los estados no terminales (`pendiente`, `en_proceso`, `failed`). Filtros adicionales permiten ver los terminales (`completed`, `rejected`) para histórico.

### Mis enviadas

Las Solicitudes que el usuario creó hacia otros, para hacer seguimiento del estado. Filtro implícito: `source_user = user_actual`. Combinable con filtros L3.

Útil para que el usuario que solicitó algo (ej: un retiro a OPS desde el CLP, una validación a LEX desde TRD) pueda ver en qué estado está la tramitación sin tener que recorrer el módulo destino.

### Notas

- Las dos vistas conviven en el mismo módulo Inbox. Toggle top-level entre ambas.
- Una Solicitud puede aparecer en "Mi bandeja" de un usuario y en "Mis enviadas" de otro al mismo tiempo (caso típico: usuario A creó la solicitud, usuario B la tiene asignada).
- Las Tareas (`type: 'task'`) generadas por sistema (`source_user` no aplica) no aparecen en "Mis enviadas" de nadie — solo en "Mi bandeja" de los destinatarios.

---

## Retry de ejecuciones programáticas

Cuando un tipo con `execution_mode: 'programmatic'` falla en su ejecución, el registro pasa al estado `failed` con `failure_reason` poblado y **se vuelve visible en el Inbox** según la regla de visibilidad del Inbox. La razón: un fallo declara una tarea pendiente — alguien tiene que decidir qué hacer.

### Comportamiento del retry

| Acción | Disparador | Efecto |
|---|---|---|
| **Retry desde el Drawer del Inbox** | CTA "Retry" del Drawer (solo disponible en estado `failed`) | Re-invoca el `endpoint_ref` del tipo con el mismo payload. `retry_count++`. `last_retry_at` se actualiza. Registra `TimelineEvent { kind: 'retried' }` |
| **Retry desde una Alerta** | CTA "Retry" de la Alerta asociada al fallo (cuando aplica — caso típico para tipos PP de background) | Idéntico al anterior |
| Outcome del retry: **éxito** | Endpoint devuelve `status: 'ok'` | Transita a `completed`. Cierre con `closed_by: 'system'`, `closure_action` derivado del endpoint si aplica |
| Outcome del retry: **fallo nuevo** | Endpoint devuelve `status: 'error'` | Permanece en `failed`. `failure_reason` se actualiza con la nueva razón. `retry_count++` |
| **Descartar manualmente** | Operador decide que no vale la pena reintentar | CTA "Descartar" en el Drawer transita a `rejected` con `closeAction` declarado por el tipo + comentario obligatorio |

### Política V1

- **Retry siempre manual.** No hay auto-retry con back-off en V1. Si un tipo necesita auto-retry, eso vive en código del endpoint o en infraestructura de cola de tareas — no en el Centro.
- **Sin límite máximo de retries.** Cuántas veces se reintenta es decisión del operador.
- **Sin escalamiento automático.** Si el área quiere que un fallo recurrente se escale, eso se modela como una Alerta separada (REQ-73) sobre el patrón observado.

### V2

Auto-retry con back-off declarable por tipo (intervalos exponenciales, N intentos máximos, fallback a manual). Escalamiento automático a Alerta tras X fallos. Asistente IA que sugiere descartar vs reintentar según patrón histórico.

---

## Patrón por área (ejemplos típicos)

Indicativos — los tipos concretos se declaran por REQ por área. Cada cuadrante de la matriz tiene casos de uso reales.

| Área | Solicitudes (HH) | Tasks (PH) | Funciones invocadas (HP, solo si Failed) | Background jobs (PP, solo si Failed) |
|---|---|---|---|---|
| **OPS** | Retiros, movimientos manuales, asignaciones, atención cross-app | `daily_reconciliation`, conciliación operativa mensual, revisión Bandeja | Ejecución programática de un retiro automático | Sincronización nightly con Coinag |
| **LEX** | KYC bajada manual, revisión ROS, alta cliente con doc incompleta | Revisión periódica blacklists, refresh KYC anual | Generación programática de reportes regulatorios | Barrido nocturno de vencimientos |
| **FIN** | Aprobación de pagos, alta proveedor, registro gasto extraordinario | Cierre mensual, revisión nostros, matching contable | Generación automática de asientos | Sincronización con extractos bancarios |
| **TRD** | Validación cotización fuera de banda, alta proveedor liquidez | Revisión límites por cliente, cierre mesa diario | Pricing automático batch | Polling de spreads de proveedores |
| **CLP** | (source típico, no target primario) | — | — | — |

---

## Naturaleza del servicio

| Capa | Implementación |
|---|---|
| Backend | Transversal en el core: endpoint, motor de routing y asignación, persistencia, audit trail, motor de triggers, scheduler de series recurrentes, scheduler de asociaciones consumidor-tipo, auto-archive, notificación. Contrato único |
| UI | Por app: cada app con tipos declarados renderiza su módulo Inbox con sus `INBOX_TYPES`, dos vistas (Mi bandeja + Mis enviadas), filtros, Drawer, formularios de creación manual |
| Modelado | Una Solicitud/Tarea = un `target_app`. Eventos que aterrizan en dos apps se modelan como dos Solicitudes vinculadas (V2 evalúa coordinación automática) |

---

## Integraciones

| Con | Cómo |
|---|---|
| **Alertas** (`centro-de-alertas.md`, REQ-73) | Comparten `TimelineEvent`, `Comment`, `<Drawer>`, motor de routing por `target_role`. Las Alertas pueden incluir CTA "Retry" que apunta al `endpoint_ref` de un tipo del Inbox cuando una ejecución programática falla |
| **Acciones / Manifest Engine** (REQ-68) | Triggers automáticos y CTAs del Drawer son acciones del manifest; capability provider resuelve `user → capabilities`; transiciones de estado son acciones también. El `endpoint_ref` de los tipos `programmatic` puede ser invocado desde una acción del manifest |
| **Vistas** (REQ-69) | Lista, Kanban, Ejes, filtros L3, mecánica de Drawer compartida |
| **Centro de Reportería** (`centro-de-reporteria.md`, REQ-59) | Los reportes declaran dependencias sobre tipos del Inbox vía `ConsumerTypeAssociation` con `consumer_kind: 'report'`. Reemplaza el modelo anterior basado en `auto_archive` reactivo |
| **Auth0** | Identidad del invocador del endpoint |
| **Slack** | Servicio del grupo (Slack API + n8n/Miles) para push opcional por tipo |

---

## Apps consumidoras

| App | REQ por área | Tipos declarados | Estado |
|---|---|---|---|
| **OPS** | pendiente | Retiros, movimientos manuales, conciliación, asignaciones, background jobs de sync | — |
| **LEX** | pendiente | KYC, ROS, blacklist review, KYC refresh, barridos | — |
| **FIN** | pendiente | Aprobaciones, alta proveedor, nostros review, cierre mensual, sync extractos | — |
| **TRD** | pendiente | Validaciones de cotización, alta proveedor liquidez, monitoreo, polling | — |
| **CLP** | a evaluar | (source típico, no target primario) | — |

Los REQs por área entregan: qué tipos declara cada app con su `execution_mode`, qué payload por tipo, qué `closeActions[]` (para `human`) o qué `endpoint_ref` (para `programmatic`), qué triggers y CTAs, qué política de push, qué series recurrentes, qué asociaciones consumidor-tipo, y los formularios de creación manual cuando aplica.

---

## Reportes analíticos

El repositorio es base consultable. Reportes típicos vía REQ-59:

- Throughput por `concept` y período, diferenciado por `type` y `execution_mode`.
- Tiempo medio de cierre (para `human`) y tiempo medio de ejecución (para `programmatic`).
- % `completed` vs % `rejected` vs % `failed`.
- % SLA cumplidos vs vencidos.
- % auto-archived vs cerradas manualmente.
- Carga por `target_role` / `assignee`.
- **Eficacia de series recurrentes**: % instancias completadas a tiempo, lag medio, gaps en la cadencia.
- **Eficacia de asociaciones consumidor-tipo**: % instancias generadas anticipadamente que se completaron antes del deadline del consumidor, lag medio entre disponibilidad y completitud.
- **Fiabilidad de ejecuciones programáticas**: tasa de éxito por `endpoint_ref`, % fallos resueltos por retry, % fallos descartados, distribución de `retry_count` antes de éxito.
- Reportes regulatorios derivados.

---

## Decisiones clave

| # | Fecha | Decisión |
|---|---|---|
| 1 | 2026-05-11 | **Umbrella "Centro de Solicitudes"** con dos categorías visibles (Solicitudes / Tareas). Motor único |
| 2 | 2026-05-11 | **Recurrencia como entidad separada** (`RecurringInboxItemDefinition`) con flujo formal de alta. Cada instancia es independiente |
| 3 | 2026-05-11 | **Asignación manual (`assignee`) opcional y editable** en cualquier estado no terminal. Independiente del `owner` (runtime) |
| 4 | 2026-05-11 | **Cinco caminos de creación** (extendido en sesión 2026-05-12 — antes eran cuatro): manual desde otra app, manual desde el propio Inbox, automática vía API, automática recurrente, anticipada por consumidor |
| 5 | 2026-05-11 | **Creación manual desde el propio Inbox** habilitada por tipo con `creable_manualmente: true` + `manual_creation_capability` |
| 6 | 2026-05-11 | **Estados canónicos invariantes** — extendidos en sesión 2026-05-12 de cuatro a cinco con el agregado de `failed` |
| 7 | 2026-05-12 | **REVISADA — La asociación reportes ↔ tipos predefinidos pasa de reactiva a anticipada.** Antes: se generaba una Tarea con `auto_archive` al momento de ejecutar el reporte. Ahora: se modela vía `ConsumerTypeAssociation` con `lead_time_days`, generando la instancia con anticipación al deadline del consumidor. Generalizada: aplica a cualquier consumidor scheduleado (reportes, cierres, vencimientos), no solo reportes |
| 8 | 2026-05-11 | **Reportes con `allows_auto_generation: false`** próximos a emitir generan Tarea al Inbox (`reporte_proximo_emision_manual`), no Alerta. Los con `true` generan Alerta al consumidor |
| 9 | 2026-05-12 | **Principio "Wizard of Oz arquitectónico":** los CTAs externos invocan capacidades, no rutas de ejecución. La capacidad decide internamente si ejecuta de forma directa o crea Solicitud/Tarea en el Centro. Permite lanzar productos con ejecución 100% humana y automatizar progresivamente. La decisión es de implementación en código, no de discovery |
| 10 | 2026-05-12 | **REVISADA — El modelo SÍ incorpora `execution_mode` como dimensión explícita del registro.** Antes se había decidido no incorporar `execution: manual \| programmatic` al modelo. La nueva decisión incorpora `execution_mode: 'human' \| 'programmatic'` como campo mandatorio del `InboxTypeConfig` (derivado al registro). El Inbox sigue mostrando solo lo que requiere intervención humana, pero ahora el modelo expresa explícitamente la dimensión |
| 11 | 2026-05-12 | **Cinco estados canónicos** — agregar `failed` al set existente. Aplica solo a tipos con `execution_mode: 'programmatic'`; los `human` no entran a `failed`. `failed` no es terminal en el mismo sentido que `completed`/`rejected`: admite retry |
| 12 | 2026-05-12 | **`type` y `execution_mode` como dimensiones ortogonales** del catálogo. Las cuatro combinaciones generan los cuadrantes Solicitud / Task / Función invocada / Background job |
| 13 | 2026-05-12 | **Inbox como vista filtrada, no contenedor universal.** El sistema persiste todas las ejecuciones en bbdd; el Inbox solo muestra las que cumplen `execution_mode === 'human' OR state === 'failed'` |
| 14 | 2026-05-12 | **Endpoint público invocable** (`endpoint_ref`) como primitiva común de los tipos con `execution_mode: 'programmatic'`. Sirve a cuatro escenarios: scheduler, Acción/CTA del manifest, retry desde Drawer, retry desde Alerta |
| 15 | 2026-05-12 | **Asociación consumidor-tipo predefinido** como entidad (`ConsumerTypeAssociation`) con `lead_time_days` en la asociación, no en el tipo. El mismo tipo puede ser dependencia de N consumidores con tiempos distintos |
| 16 | 2026-05-12 | **Evidencias como sección del Drawer/Dialog**, coexistente con `closeAction` + comentario. Tres tipos canónicos: `manual_check`, `attachment`, `system_log`. Inmutables tras cierre. Base para audit y compliance |
| 17 | 2026-05-12 | **Dos fechas semánticas distintas:** `requested_at` (cuándo se solicita formalmente; puede ser futura para generaciones anticipadas) y `due_at` (deadline para ejecutar). `created_at` se mantiene como timestamp técnico de persistencia |
| 18 | 2026-05-12 | **Dos vistas top-level del usuario:** Mi bandeja (lo que tengo que ejecutar) + Mis enviadas (las que yo creé a otros, para seguimiento). Toggle en el módulo Inbox |
| 19 | 2026-05-12 | **Naming:** prosa en español ("Solicitud" / "Tarea"), campos del modelo en inglés (`type: 'request' \| 'task'`, `execution_mode: 'human' \| 'programmatic'`, `concept` como clasificador de negocio). Resuelve la inconsistencia previa entre REQ y feature |
| 20 | 2026-05-12 | **Modos de satisfacción de la asociación consumidor-tipo:** `generate_new` (default — el scheduler crea una instancia anticipada cuando se cumple `lead_time_days`) y `verify_existing` (el scheduler verifica al deadline del consumidor que exista al menos una instancia del concept en estado `Completed` dentro de `verify_window_days`). Resuelve el caso de reportes regulatorios que se apoyan en series recurrentes operativas ya existentes — evita generar tareas redundantes |

---

## Frentes abiertos

- **Construcción de v1** — entregable de Tecnología bajo AM-1017 (TO REFINEMENT)
- **Refactor de REQ-71** post-cambios de esta sesión — pendiente para reflejar matriz, cinco estados, evidencias, dos vistas, endpoint público, asociaciones consumidor-tipo
- **REQs por área** para OPS, LEX, FIN, TRD — declaración de tipos (con `execution_mode`), payloads, `closeActions[]` o `endpoint_ref`, series recurrentes, asociaciones consumidor-tipo, formularios manuales. Surgen a demanda
- **Coordinación REQ-59 ↔ REQ-71** — cambio de modelo: las dependencias de reportes se modelan vía `ConsumerTypeAssociation` con `consumer_kind: 'report'` en lugar del `report_dependency_block` con `auto_archive` reactivo. Ajustar el feature de Reportería en consecuencia
- **V2** — auto-retry con back-off, workflow multi-paso, bulk operations, asignación a equipo, vinculación automática, UI gestionada de series y asociaciones, asistente IA

---

## Referencias

- REQ entregable: REQ-71 · espejo en AM-1017
- Discovery relacionado: `discoveries/core-modulos-transversales-discovery.md`
- Features relacionadas:
  - Centro de Alertas (`centro-de-alertas.md`) — comparte `<Drawer>`, `TimelineEvent`, `Comment`, motor de routing; aloja CTA "Retry" hacia el `endpoint_ref` del Inbox
  - Centro de Reportería (`centro-de-reporteria.md`) — consume tipos del Inbox vía `ConsumerTypeAssociation` con `lead_time_days`
  - Acciones / Manifest Engine (REQ-68) — provee acciones invocadas por triggers y CTAs; capability provider; puede invocar el `endpoint_ref` de tipos programáticos
  - Vistas (REQ-69) — provee Lista, Kanban, Ejes, filtros L3, mecánica de Drawer
