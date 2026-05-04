---
name: LEX — Módulo Alertas · Discovery Document
features: [LEX]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-24
---

# LEX — Módulo Alertas · Discovery Document

> Discovery hijo de `lex-discovery.md`. Documenta el scope funcional completo del **REQ-52 — Módulo de Alertas + Screening de Contrapartes como primer tipo de alerta** (estado SENT TO DEV desde 2026-04-24 AM; UX ajustada 2026-04-24 PM a dos pestañas Nuevas/Histórico con reorden de columnas). Aporta sobre el REQ-33 (patrón de referencia): state machine completa, asignación de responsable, comentarios; hereda del REQ-33 el formato visual de la pestaña Nuevas (card-list TRD-style).

---

## 1. Propósito del documento

Este documento es el **discovery hijo** de `lex-discovery.md` para el módulo Alertas de LEX. Sirve dos propósitos:

1. **Fuente de verdad funcional del REQ-NEW-A** — cuando el ticket se cree en Jira, su descripción apuntará a este archivo para el detalle completo, evitando reproducir en la descripción del ticket información que se edita mejor aquí.
2. **Documento vivo durante el discovery y el desarrollo** — capturará las decisiones que surjan en las conversaciones con Juan (Legal), Santiago (Tecnología) y Valen (dominio) antes y durante el handoff a Tecnología.

Este documento **no reemplaza** al padre — lo complementa. El padre cubre LEX a nivel índice; este hijo cubre el módulo Alertas en detalle.

---

## 2. Contexto y naturaleza del módulo

**Nombre del módulo:** Alertas
**Ruta:** `/alertas` (ítem top-level del sidebar de LEX)
**REQ que lo crea:** REQ-NEW-A (a abrirse en Jira el 2026-04-24)
**REQ relacionado:** REQ-47 (Blacklist) — prerequisito conceptual; el motor de cruce del REQ-NEW-A consume la Blacklist que REQ-47 consolida.
**Patrón de referencia:** REQ-33 (Prime Desk RFQ — Centro de Notificaciones de TRD) — ver comparación detallada en §10.

### 2.1 Qué problema resuelve

Legal no tiene forma de enterarse, de manera automática y gestionable, cuando un cliente del grupo opera con una contraparte cuyo CUIT está en la Blacklist de LEX. Hoy el Excel externo de CUITs restringidos no está conectado al sistema; la detección es manual y reactiva (se hace por pedido puntual o auditoría).

El módulo Alertas convierte esa detección en una capacidad sistemática:

- **Automática:** al registrarse un movimiento con `counterparty_tax_number` en la Blacklist, se genera una alerta sin intervención humana.
- **Gestionable:** las alertas no se descartan con un click — tienen ciclo de vida (estados), responsable, comentarios, y trazabilidad para auditoría.
- **Extensible:** la arquitectura soporta agregar otros tipos de alerta de compliance sin refactor (documentación vencida, límites al tope, relaciones societarias problemáticas, etc.).

### 2.2 Diferenciación respecto al REQ-33

El REQ-33 (TRD) resuelve un problema operacional con alertas **binarias**: la condición existe → aparece la alerta; la condición se normaliza → la alerta se marca como resuelta y desaparece. Es un toggle.

REQ-NEW-A (LEX) resuelve un problema de **compliance** que requiere workflow:
- Una alerta de "cliente operó con CUIT blacklisteado" **no se "auto-resuelve"** cuando pasa el tiempo. Alguien del equipo Legal tiene que **revisarla**, tomar acción offline (investigar al cliente, comunicarse con Ops, ajustar límites, iniciar desvinculación, etc.), y dejar registro de la acción.
- Varias personas del equipo Legal pueden estar trabajando alertas en paralelo. Sin **asignación explícita**, dos revisan la misma o ninguna revisa ciertas alertas.
- Para **auditoría regulatoria** (UIF, BCRA), hace falta preservar el rastro de quién revisó qué, cuándo, y qué decidió. **Comentarios + state machine** proveen ese rastro.

Estas tres capacidades (estados, asignación, comentarios) son el salto cualitativo respecto al REQ-33.

### 2.3 Restricciones de scope heredadas

- **Solo esquema Haz Pagos en v1.** El motor de cruce solo procesa movimientos de los 4 tipos con contraparte externa estructurada (DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT) del esquema Haz Pagos (COINAG, BIND, Banco de Comercio — agnóstico al sponsor). Ardua Solutions Corp, Astra Ventures y Circuit Pay pata cripto quedan fuera (ver `lex-discovery.md` G-08).
- **Alerta no-bloqueante en v1.** La generación de la alerta no bloquea la operación en OPS; solo la registra y notifica. El bloqueo es un REQ específico posterior si Legal lo decide (ver `lex-discovery.md` §8.3 fuera de scope).
- **Canal exclusivamente in-app en v1.** Sin email, push, SMS o integraciones externas. Si se pide, REQ propio.
- **En v1 solo el tab "Screening de Contrapartes".** Los demás tabs (documentación vencida, límites, etc.) son preparados visualmente pero deshabilitados.

---

## 3. Arquitectura funcional del módulo

### 3.1 Componentes

El REQ-NEW-A se implementa en dos componentes que colaboran:

**A. Motor de Cruce (backend, en OPS)** — responsable de detectar los matches contra la Blacklist y generar eventos de alerta consumibles por LEX. Detalle en §4.

**B. Módulo Alertas (frontend + backend, en LEX)** — responsable de la visualización, gestión, y persistencia de las alertas. Detalle en §5 a §9.

### 3.2 Flujo end-to-end (happy path)

```
[1] Cliente opera movimiento en Haz Pagos (ej: DEPOSIT de 500.000 ARS)
       ↓
[2] OPS registra el movimiento con counterparty_tax_number = "20123456789"
       ↓
[3] Motor de cruce (OPS) consulta Blacklist de LEX: ¿está "20123456789" en la lista?
       ↓ SI
[4] OPS emite evento de alerta con payload completo
       ↓
[5] LEX persiste la alerta con estado inicial `new` → aparece en la pestaña Nuevas
       ↓
[6] Badge del sidebar de LEX se incrementa en +1
       ↓
[7] Alguien de Legal abre /alertas → ve la alerta en la pestaña **Nuevas** (formato card-list TRD-style)
       ↓
[7b] Se auto-asigna → estado pasa a `in_review` → la alerta **baja de Nuevas a Histórico**
       ↓
[8] Agrega comentarios durante la revisión (libres) — timeline acumula
       ↓
[9] Legal toma acción offline (investiga, contacta Ops, etc.)
       ↓
[10] Legal cierra la alerta:
      → "Marcar como revisada" (con comentario obligatorio) → estado `resolved`
      O
      → "Descartar" (con comentario obligatorio, ej: falso positivo) → estado `dismissed`
       ↓
[11] Badge se decrementa en -1
       ↓
[12] La alerta queda archivada (consultable vía filtro de estado), con timeline completo para auditoría
```

### 3.3 Contrato de datos — entidad Alerta

Cada alerta persiste los siguientes campos (nombres tentativos; la implementación técnica puede adaptar):

**Identificación:**
- `id` — identificador único de la alerta
- `type` — tipo de alerta (en v1 solo `SCREENING_BLACKLIST_MATCH`)
- `created_at` — timestamp de generación por el motor

**Payload del match (heredado del evento de OPS):**
- `movement_id`, `movement_type`, `movement_amount`, `movement_currency`, `movement_timestamp`
- `sponsor` (COINAG / BIND / Banco de Comercio)
- `client_id`, `client_name`, `client_tax_number`
- `counterparty_name`, `counterparty_tax_number`
- `blacklist_reason` (heredado de la blacklist al momento del match)
- `blacklist_entry_id` (referencia al ítem de la blacklist que causó el match)

**Estado y workflow:**
- `status` — `new` | `in_review` | `resolved` | `dismissed` (ver §6)
- `assignee_id` — usuario del equipo Legal asignado, nullable
- `assigned_at` — timestamp de asignación
- `assigned_by` — usuario que hizo la asignación (puede ser el mismo que el asignado en caso de auto-asignación)

**Cierre:**
- `closed_at` — timestamp de cierre (nullable hasta que la alerta se resuelve/descarta)
- `closed_by` — usuario que cerró la alerta
- `closing_comment_id` — referencia al comentario obligatorio del cierre (ver §7)

**Relaciones:**
- `comments` — lista de comentarios asociados (ver §7)
- `state_transitions` — log inmutable de todas las transiciones de estado con timestamp y usuario

---

## 4. Motor de Cruce (en OPS)

### 4.1 Trigger

Al momento en que OPS **registra o refleja** un movimiento del esquema Haz Pagos cuyo `type` sea uno de los 4 con contraparte externa:
- `DEPOSIT`
- `WITHDRAWAL`
- `TRANSFER_IN`
- `TRANSFER_OUT`

Los demás tipos (COLLECTOR_IN/OUT, FEE, FX_DEPOSIT/WITHDRAWAL, INT_DEPOSIT/WITHDRAWAL) no disparan el cruce, porque por diseño no tienen contraparte externa identificable (ver `lex-discovery.md` §7.3).

### 4.2 Lógica

1. Al trigger, el motor consulta la Blacklist de LEX vía su endpoint existente (`GET /blacklist` o equivalente).
2. Si `movement.counterparty_tax_number` ∈ Blacklist → genera evento de alerta.
3. Si no hay match, el motor no hace nada (no deja rastro; es la operación normal).

### 4.3 Payload del evento

El evento debe incluir todos los campos listados en §3.3 ("Payload del match"), ya que LEX necesita la data completa para mostrar la tarjeta de alerta sin tener que hacer lookups inversos en OPS cada vez.

### 4.4 Idempotencia

Un mismo `movement_id` contra un mismo `counterparty_tax_number` no debe generar alertas duplicadas si el movimiento se re-procesa (ej: por retry, por reflejo desde el sponsor). El motor debe verificar si ya existe una alerta activa para esa combinación antes de emitir el evento.

### 4.5 Agnosticismo respecto al sponsor

La lógica del motor es **idéntica para cualquier sponsor bancario** del esquema Haz Pagos. Validado con Valen Vila (2026-04-23) — ver `lex-discovery.md` §7.3. COINAG, BIND y Banco de Comercio no requieren lógica diferenciada.

### 4.6 Mecanismo técnico (pendiente de decisión)

Opciones posibles para el canal OPS → LEX:
- **Webhook:** OPS llama a un endpoint de LEX cada vez que detecta un match.
- **Event bus:** OPS publica en un bus compartido; LEX suscribe.
- **DB compartida:** OPS escribe en una tabla accesible por LEX.
- **Pull desde LEX:** LEX consulta OPS cada N segundos buscando matches nuevos (menos preferido por latencia y carga innecesaria).

**Decisión pendiente:** Santiago Ahmed (Tecnología) — ver `lex-discovery.md` G-11. Desde producto, lo único que importa es que la alerta esté disponible en LEX en tiempo **casi-real** (latencia < algunos minutos es aceptable para compliance; no se requiere millisegundos).

---

## 5. Módulo Alertas en LEX — vista general

### 5.1 Entrada en el sidebar

- **Nuevo ítem top-level "Alertas"** en el sidebar principal de LEX.
- **Ruta:** `/alertas`.
- **Badge numérico** con la cantidad de alertas activas (`status in ['new', 'in_review']`). El badge desaparece cuando no hay activas.
- **Ícono** a definir con diseño — sugerencia: bell o warning triangle.

Decisión del HoP (2026-04-24): se descarta la sección "Sistema" intermedia del REQ-33. En LEX, Alertas sube al mismo nivel que Clientes, Altas, Blacklist y Usuarios. Razón: el peso del módulo en el flujo diario de Legal justifica el primer nivel.

### 5.2 Página principal

Al hacer clic en "Alertas" desde el sidebar, se carga una página completa en el área principal con la siguiente estructura:

```
Header
├── Título: "Alertas"
├── Subtítulo: "Gestión de alertas de compliance del sistema"
└── Acciones globales (si aplican — ver §5.4)

Pestañas principales (ajuste 2026-04-24 PM)
├── [Activa · default al entrar] "Nuevas" — muestra solo status = new
└── [Activable] "Histórico" — muestra status in {in_review, resolved, dismissed}

Pestaña "Nuevas" (formato heredado del prototipo TRD de notificaciones · REQ-33)
├── Card-list con énfasis en triaje rápido
├── Cada card muestra: fecha, tipo, cliente, contexto resumido, CTAs (Asignarme / Ver detalle)
├── Una alerta baja a Histórico apenas se auto-asigna o recibe un comentario
└── Estado vacío: "No hay alertas nuevas por revisar"

Pestaña "Histórico" (listado tabular con filtros)
├── Filtros
│   ├── Tipo de alerta (multi-select; v1 solo "Screening de Contrapartes")
│   ├── Estado (multi-select; default `in_review`; `new` NO aparece aquí porque vive en Nuevas)
│   ├── Responsable asignado: [Todos, Yo, Sin asignar, Usuario específico]
│   ├── Cliente: (autocomplete sobre clientes LEX)
│   ├── Rango de fechas: (created_at)
│   └── Buscar por CUIT de contraparte
├── Listado con columnas en orden (ajustado 2026-04-24 PM):
│   ├── **Fecha** de generación (primera)
│   ├── Tipo de alerta
│   ├── Cliente
│   ├── Columnas específicas del tipo (para screening: Contraparte + Movimiento)
│   ├── **Estado** (penúltima, con badge visual)
│   └── **Responsable asignado** (última)
├── Acciones por fila: "Ver detalle" → abre vista detalle (ver §5.3)
└── Paginación server-side · Estado vacío: "No hay alertas con los filtros aplicados"

(Tabs por tipo de alerta — extensibilidad futura)
La organización por tipo de alerta (pre-ajuste 2026-04-24 PM) queda descartada como pestaña de navegación; cuando se agreguen nuevos tipos (documentación vencida, límites al tope, reportes de REQ-54, etc.), se exponen como atributos del registro + filtros dentro de la pestaña Histórico (y dentro del card-list de Nuevas), sin afectar la navegación top-level del módulo.
```

### 5.3 Vista detalle de una alerta

Al hacer clic en "Ver detalle" de una alerta, se abre una vista (puede ser página completa tipo `/alertas/:id` o drawer/modal amplio — a decidir con diseño). Estructura:

```
Header de la alerta
├── Badge de estado (new/in_review/resolved/dismissed)
├── Título: ej. "Movimiento con contraparte en Blacklist"
├── Subtítulo: ej. "Cliente [X] operó con CUIT [Y]"
└── Acciones de transición de estado (según estado actual — ver §6)

Sección "Información del match"
├── Cliente: [nombre] ([CUIT]) [link → /clientes/:id en LEX]
├── Contraparte: [nombre] [CUIT blacklisteado]
├── Motivo blacklist: [texto del motivo al momento del match]
├── Movimiento: [tipo] [monto] [moneda] [timestamp]
├── Sponsor: [COINAG/BIND/Banco de Comercio]
└── Link al movimiento en OPS: [botón → /psp/home?movement_id=X]

Sección "Asignación"
├── Responsable asignado: [nombre del usuario o "Sin asignar"]
├── Acciones (según estado):
│   ├── "Asignarme" (si no está asignada o está asignada a otro)
│   ├── "Asignar a..." (dropdown con usuarios Legal disponibles)
│   └── "Desasignar" (vuelve a estado `new` si estaba `in_review` — ver §6)

Sección "Timeline" (comentarios + transiciones de estado intercalados, orden cronológico descendente)
├── Cada entrada muestra:
│   ├── Avatar/icono del usuario o del sistema
│   ├── Tipo de entrada: comentario | transición de estado | asignación
│   ├── Contenido: texto del comentario, o "Estado cambiado de X a Y", o "Asignada a [usuario]"
│   └── Timestamp
├── Input para agregar nuevo comentario (textarea + botón "Comentar")
└── El comentario obligatorio de cierre es parte del timeline, destacado visualmente
```

### 5.4 Acciones globales en el header

Opciones a evaluar (no todas necesariamente en v1):
- **"Asignarme todas las no asignadas"** — toma ownership en bulk de alertas `new`.
- **"Exportar resultados"** — exporta el listado filtrado a CSV para análisis offline.

V1 minimal recomendado: **solo el selector de filtros** como acción global; exportar queda para v2 si se pide.

### 5.5 Permisos y visibilidad

Basado en el modelo de roles actual de LEX (ver `lex-discovery.md` §6):

| Rol | Ver alertas | Asignarse | Asignar a otros | Comentar | Cerrar alerta |
|---|---|---|---|---|---|
| `ADMIN_LEX` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `COMMERCIAL_LEX` | ✅ (solo de clientes asignados) | ❌ | ❌ | ✅ (solo de clientes asignados) | ❌ |
| `VIEWER_LEX` | ✅ (solo de asignaciones propias) | ❌ | ❌ | ❌ | ❌ |
| Usuario con rol `COMPLIANCE` en `assigned_users[]` | ✅ | ✅ | ✅ | ✅ | ✅ |

**Supuesto explícito:** los usuarios con rol `COMPLIANCE` son los principales consumidores del módulo, y son quienes típicamente toman ownership de las alertas. Los `COMMERCIAL_LEX` pueden ver y comentar (para aportar contexto del cliente) pero no pueden cerrar alertas — esa acción es exclusiva del equipo Legal.

**Validación pendiente con Juan:** este modelo de permisos es una propuesta inicial basada en lo que se ve hoy en el código. Si Juan quiere ajustar (por ejemplo, que Comercial sí pueda cerrar alertas de sus clientes), se ajusta.

---

## 6. State machine

### 6.1 Estados

| Estado | Significado | Cuándo se entra | Visible en badge |
|---|---|---|---|
| **`new`** | Recién generada por el motor de cruce, nadie la tocó | Al momento de generarse la alerta | ✅ Sí |
| **`in_review`** | Alguien del equipo Legal tomó ownership y la está investigando | Al asignarse un responsable | ✅ Sí |
| **`resolved`** | Legal revisó la alerta, investigó el caso y tomó las acciones offline correspondientes. Cierre con comentario que resume el análisis y la acción. | Cierre explícito por el asignado | ❌ No (sale del badge) |
| **`dismissed`** | Cerrada por descarte (falso positivo, etc.). Cierre con comentario que justifica. | Cierre explícito por el asignado | ❌ No (sale del badge) |

**Ubicación en la UI (ajuste 2026-04-24 PM):**
- Estado `new` → pestaña **Nuevas** (formato card-list TRD-style).
- Estados `in_review`, `resolved`, `dismissed` → pestaña **Histórico** (listado tabular filtrable).
- La migración entre pestañas es automática en función del estado: al pasar una alerta de `new` a `in_review` (por asignación) baja a Histórico; si se desasigna vuelve a `new` y sube a Nuevas.

### 6.2 Transiciones permitidas

```
                  ┌──────────────┐
                  │     new      │
                  └──────┬───────┘
                         │ asignar responsable
                         ↓
                  ┌──────────────┐
          ┌───────┤  in_review   ├───────┐
          │       └──────┬───────┘       │
          │              │ desasignar    │
          │              ↓               │
          │       ┌──────────────┐       │
          │       │     new      │       │
          │       └──────────────┘       │
          │                              │
 marcar   │                              │  descartar
 revisada │                              │  (con comentario
 (con     │                              │   obligatorio)
 coment.  │                              │
 oblig.)  ↓                              ↓
   ┌──────────────┐              ┌──────────────┐
   │   resolved   │              │   dismissed  │
   └──────────────┘              └──────────────┘
        (cerrado)                    (cerrado)
```

**Transiciones permitidas:**

| Desde | Hacia | Trigger | Requisitos |
|---|---|---|---|
| `new` | `in_review` | Asignación explícita de un responsable | El asignado debe ser usuario con permiso |
| `in_review` | `new` | Desasignación del responsable | El desasignador puede ser el propio asignado o un ADMIN_LEX |
| `in_review` | `resolved` | Acción "Marcar como revisada" | Comentario obligatorio explicando la acción tomada |
| `in_review` | `dismissed` | Acción "Descartar" | Comentario obligatorio explicando por qué se descarta |
| `resolved` | — | No reversible | — |
| `dismissed` | — | No reversible | — |

**Transiciones explícitamente NO permitidas:**

- `new → resolved / dismissed` directo (hay que pasar por `in_review` para forzar la asignación y trazabilidad).
- `resolved → cualquier otro estado` (cerrado es cerrado; si aparece nueva información que invalida el cierre, se crea una alerta nueva manualmente o se comenta en la cerrada).
- `dismissed → cualquier otro estado` (ídem).

### 6.3 Implicancia para la idempotencia

Recordar la regla del motor de cruce (§4.4): un mismo `movement_id` vs. mismo `counterparty_tax_number` no genera alertas duplicadas **si ya existe una alerta activa**. La definición de "activa" es `status in ['new', 'in_review']`. Si la alerta anterior ya está cerrada (`resolved` o `dismissed`), y el mismo match vuelve a aparecer (por re-proceso), ¿debe generarse una alerta nueva?

**Propuesta:** sí, se genera una alerta nueva. Razones:
- Auditoría — queda claro que el match volvió a aparecer después de un cierre.
- Comportamiento predecible — no hay "zombies" donde un match viejo "resucita" y reabre una alerta cerrada.

**Pendiente de validación** con Santiago y Juan — G-12.1 (nuevo en este discovery).

### 6.4 ¿Qué pasa si el CUIT se saca de la Blacklist?

Escenario: Legal agregó un CUIT por error, o un CUIT deja de estar restringido. ¿Qué pasa con las alertas activas generadas por ese CUIT?

**Opciones:**

- **A · Las alertas se auto-descartan** — el sistema las cierra con estado `dismissed` y un comentario automático ("CUIT removido de la Blacklist el [fecha]").
- **B · Las alertas se mantienen** — el registro histórico se preserva; Legal decide qué hacer con cada una.
- **C · Se banderea visualmente** que el CUIT ya no está en la Blacklist, pero no se cambia el estado — Legal decide.

**Propuesta:** **C — bandereo visual**. Preserva la trazabilidad de auditoría (la alerta existió por una razón válida en su momento) pero le da contexto actualizado al revisor. Una alerta sobre un CUIT que ya no está en la Blacklist típicamente va a terminar en `dismissed` con un comentario, pero la decisión es humana.

**Pendiente de validación con Juan** — G-12.2.

---

## 7. Comentarios

### 7.1 Comportamiento

- **Libres durante el ciclo de vida** — cualquier usuario con permiso de comentario (ver §5.5) puede agregar comentarios en cualquier momento, independiente del estado de la alerta (incluso en alertas cerradas, para dejar anotaciones posteriores).
- **Timeline cronológico** — los comentarios se acumulan en el timeline de la alerta, intercalados con las transiciones de estado y los eventos de asignación, para dar una vista lineal del ciclo completo de gestión.
- **Comentario obligatorio al cerrar** — las transiciones `in_review → resolved` y `in_review → dismissed` exigen que el usuario deje un comentario explicando el cierre. Este comentario se crea en la misma operación atómica del cierre — no es posible cerrar sin comentario.
- **Comentarios no se editan ni se borran** — para auditoría, son inmutables. Si alguien se equivoca, agrega un comentario nuevo corrigiendo el anterior. (Es el mismo patrón del tab CaseActivity del cliente.)

### 7.2 Formato

- Texto plano, con soporte mínimo de saltos de línea.
- Longitud máxima sugerida: 2000 caracteres (mismo límite que CaseActivity).
- Sin imágenes, archivos adjuntos o rich text en v1.

### 7.3 Visibilidad

Todos los comentarios son visibles para todos los usuarios que tengan permiso de ver la alerta (según §5.5). No hay comentarios "privados" ni "ocultos".

---

## 8. Asignación de responsable

### 8.1 Comportamiento

- En v1, la asignación es **explícita y manual** (no hay auto-asignación por regla de negocio).
- Al crearse una alerta, el campo `assignee_id` es `null` — la alerta está en estado `new` y visible para todos con permiso de ver alertas.
- **"Asignarme"** — cualquier usuario con permiso toma ownership en un click; la alerta pasa a `in_review`.
- **"Asignar a..."** — un `ADMIN_LEX` (o usuario con permiso) puede asignar a otro usuario del equipo Legal desde un dropdown; la alerta pasa a `in_review` con `assignee_id = usuario_elegido` y `assigned_by = usuario_actual`.
- **Reasignación** — mientras la alerta está en `in_review`, se puede cambiar el responsable asignado (genera entrada en timeline).
- **Desasignación** — el asignado o un `ADMIN_LEX` puede desasignar; la alerta vuelve a `new`.

### 8.2 Casos de uso que motivan la asignación

- **Distribución del trabajo** — el equipo Legal tiene varias personas; sin asignación, dos revisan la misma alerta o ninguna revisa ciertas alertas.
- **Accountability** — saber quién está a cargo de qué para dar seguimiento en las reuniones semanales de Compliance.
- **Escalación** — si una alerta tiene implicaciones que superan al analista de primer nivel, un ADMIN_LEX puede reasignarla a un senior.

### 8.3 Auto-asignación como extensión futura (v2)

Potenciales reglas a evaluar post-v1 (no scope de REQ-NEW-A v1):
- Auto-asignar al `COMMERCIAL` del cliente (tomado de `assigned_users[]` del cliente).
- Round-robin entre usuarios con rol `COMPLIANCE`.
- Reglas por tipo de alerta (ej: screening de contrapartes → usuario X; documentación vencida → usuario Y).

---

## 9. Criterios de aceptación

### 9.1 Motor de cruce (OPS)

- Al registrarse en OPS un movimiento con `type` ∈ {DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT} del esquema Haz Pagos cuyo `counterparty_tax_number` esté en la Blacklist de LEX, se genera automáticamente un evento de alerta consumible por LEX.
- El evento incluye el payload completo definido en §4.3.
- La lógica funciona igual para movimientos con sponsor COINAG, BIND y Banco de Comercio (agnóstico al sponsor).
- Un mismo `movement_id` contra un mismo `counterparty_tax_number` no genera alertas duplicadas mientras la alerta previa esté activa (`new` o `in_review`).

### 9.2 Módulo Alertas en LEX — visibilidad y listado

- LEX muestra un ítem top-level "Alertas" en el sidebar, con badge numérico que refleja en tiempo real la cantidad de alertas activas (`new` + `in_review`).
- Al hacer clic, se carga la página principal con la pestaña **Nuevas** activa por default.
- El listado del Histórico muestra columnas en el orden definido (ajustado 2026-04-24 PM): **Fecha** (primera), Tipo, Cliente, columnas específicas del tipo, **Estado** (penúltima), **Responsable** (última), con paginación server-side.
- Los filtros del Histórico (tipo, estado, responsable, cliente, rango de fechas, CUIT de contraparte) funcionan correctamente y son combinables; el filtro de Estado no incluye `new` (vive en Nuevas).
- El estado vacío se muestra con copy diferenciado por pestaña (Nuevas: "No hay alertas nuevas por revisar"; Histórico: "No hay alertas con los filtros aplicados").

### 9.2.1 Pestañas y migración entre ellas (ajuste 2026-04-24 PM)

- La página principal expone dos pestañas: **Nuevas** (default al entrar) y **Histórico**.
- La pestaña Nuevas muestra exclusivamente alertas con `status = new`, con formato visual heredado del prototipo TRD de notificaciones (card-list, triaje rápido).
- La pestaña Histórico muestra alertas con `status ∈ {in_review, resolved, dismissed}`, con listado tabular filtrable.
- Una alerta recién generada aparece automáticamente en Nuevas.
- Al auto-asignarse (o agregar un comentario) una alerta de Nuevas, migra inmediatamente a Histórico con estado `in_review`.
- Si desde Histórico se desasigna una alerta que está en `in_review`, vuelve a `new` y sube a Nuevas.
- Los contadores de ambas pestañas se actualizan en tiempo real.

### 9.3 Módulo Alertas en LEX — vista detalle y gestión

- Al hacer clic en "Ver detalle" de una alerta, se abre la vista detalle con toda la información del match, la sección de asignación, y el timeline.
- El timeline muestra comentarios, transiciones de estado y eventos de asignación en orden cronológico descendente.
- Cualquier usuario con permiso puede agregar comentarios libres.
- Los comentarios son inmutables (no se editan ni se borran).

### 9.4 Módulo Alertas en LEX — state machine

- Las transiciones permitidas son las definidas en §6.2 y ninguna otra.
- Una alerta `new` sin asignar no permite "Marcar como revisada" ni "Descartar" (tiene que pasar por `in_review` primero).
- "Marcar como revisada" y "Descartar" exigen comentario obligatorio — el modal de confirmación incluye el campo de comentario que no puede estar vacío.
- Todas las transiciones generan una entrada en el timeline con timestamp y usuario.
- Las alertas cerradas (`resolved`, `dismissed`) no permiten ninguna transición adicional.

### 9.5 Módulo Alertas en LEX — asignación

- "Asignarme" funciona para cualquier usuario con permiso, moviendo la alerta a `in_review` con `assignee_id = usuario_actual`.
- "Asignar a..." muestra dropdown con los usuarios con permiso y permite seleccionar uno distinto al actual.
- Las reasignaciones generan entrada en el timeline.
- "Desasignar" revierte la alerta a `new` con `assignee_id = null`.

### 9.6 Extensibilidad

- El modelo de datos y de UI permite agregar nuevos tipos de alerta (nuevos tabs en la página principal) sin refactor estructural.
- La lógica de permisos, state machine, asignación y comentarios es transversal — aplica a cualquier tipo de alerta futura.

### 9.7 Permisos

- Los permisos se comportan según la tabla en §5.5.
- Un `VIEWER_LEX` solo ve alertas de sus asignaciones propias (mismo criterio de visibilidad que ya aplica a clientes).
- Un `COMMERCIAL_LEX` solo ve alertas de sus clientes asignados.

---

## 10. Relación con el REQ-33 — qué hereda y qué cambia

### 10.1 Qué hereda

- **Las alertas son una capacidad transversal, no acoplada a un flujo operacional.** En REQ-33 se saca del panel de lotes; en REQ-NEW-A se saca del módulo Blacklist.
- **Página completa en el área principal**, no panel ni drawer.
- **Tabs por tipo de alerta** como mecanismo de extensibilidad — en v1 solo uno activo, los demás deshabilitados.
- **Badge numérico en el sidebar** con las activas.
- **Estado vacío definido** cuando no hay alertas.
- **Arquitectura extensible desde v1** — agregar un nuevo tipo no requiere refactor.

### 10.2 Qué cambia (diferencial de REQ-NEW-A)

| Dimensión | REQ-33 (TRD) | REQ-NEW-A (LEX) |
|---|---|---|
| Posición en sidebar | Sección "Sistema" → "Notificaciones" | **Top-level directo — "Alertas"** |
| Vista principal | Tabs por tipo de alerta | **Dos pestañas Nuevas + Histórico** (ajuste 2026-04-24 PM) — dentro de cada, el tipo de alerta es atributo/filtro, no navegación por tipo. Nuevas hereda el card-list TRD-style; Histórico es listado tabular filtrable. |
| Ciclo de vida | Toggle binario (activa/resuelta) | **State machine** con 4 estados |
| Cierre | Click simple "Marcar como resuelta" | **Comentario obligatorio** al cerrar (resolved o dismissed) |
| Responsable | No hay | **Asignación explícita** a usuario del equipo Legal |
| Comentarios | No hay | **Comentarios libres + timeline** con transiciones intercaladas |
| Semántica del cierre | "Resuelta" (la condición operativa volvió a normalidad) | **"Revisada"** (Legal analizó y tomó acción) / **"Descartada"** (falso positivo) |
| Auditoría | No es un objetivo explícito | **Central** — comentarios inmutables, state_transitions log, responsables preservados |
| Dominio | Operativa — alertas auto-descartables cuando la condición pasa | Compliance — alertas humanas-gestionables con responsable y registro |
| Recurso afectado | Lote de liquidez (cross-módulo dentro de TRD) | Cliente + movimiento (**cross-app** LEX + OPS) |
| Canal | In-app exclusivamente | In-app exclusivamente (v1) |

### 10.3 Qué rescata REQ-52 del prototipo del REQ-33

El REQ-33 tiene adjunto un prototipo HTML (`trd_notifications_prototype.html`, 80KB) en Jira. Tras el ajuste del 2026-04-24 PM, la reutilización del prototipo TRD es **más directa de lo previsto originalmente**:

1. **Reutilizar integralmente para la pestaña Nuevas:** el formato visual card-list del `trd_notifications_prototype.html` se adopta como el formato canon de la pestaña Nuevas del módulo Alertas. Incluye shell de página (header + card-list), estilos, patrón del badge en sidebar, estado vacío, densidad visual para triaje rápido.
2. **Adaptar al listado tabular para la pestaña Histórico:** vista tabular filtrable con columnas Fecha / Tipo / Cliente / específicas del tipo / Estado / Responsable.
3. **Extender:** agregar la vista detalle de alerta con secciones de asignación, timeline y comentarios (no existen en REQ-33).
4. **Adaptar:** el modelo de datos para reflejar los estados (`new` / `in_review` / `resolved` / `dismissed` en vez de activo/resuelto) y la asignación de responsable.

El prototipo `lex_alertas_prototype.html` vive en `prototypes/lex/` y está en re-iteración vía Claude Code Agent Team para reflejar los ajustes del 2026-04-24 PM.

---

## 11. Hipótesis y preguntas abiertas

### HA-01 — ¿Permisos: COMMERCIAL_LEX puede cerrar alertas de sus clientes?

**Hipótesis actual (§5.5):** No — el cierre es exclusivo de ADMIN_LEX y usuarios con rol COMPLIANCE. Comercial solo ve y comenta.

**Por qué podría ser distinto:** si un comercial está más cerca del cliente que el analista de compliance (por ejemplo, en clientes grandes con relación diaria), puede tener contexto útil para cerrar la alerta. Pero la separación de roles de compliance recomienda que el cierre sea siempre de Legal.

**Cómo validar:** conversar con Juan. El default de la propuesta es conservador (Comercial no cierra); Juan puede relajarlo si lo considera adecuado.

### HA-02 — ¿Las alertas cerradas pueden reabrirse?

**Hipótesis actual (§6.2):** No — cerrado es cerrado. Si aparece nueva información, se deja un comentario en la alerta cerrada (los comentarios funcionan aunque esté cerrada).

**Por qué podría ser distinto:** si una alerta se cierra como `dismissed` y después aparece evidencia de que sí era un caso real, puede ser útil "reabrirla" a `in_review` en vez de crear una alerta nueva desde cero.

**Cómo validar:** conversar con Juan. El default es no-reapertura; se puede flexibilizar si hay un caso de uso frecuente.

### HA-03 — ¿Al remover un CUIT de la Blacklist, qué pasa con las alertas activas de ese CUIT?

**Hipótesis actual (§6.4):** Opción C — se banderean visualmente pero no cambian de estado. Legal decide.

**Por qué podría ser distinto:** si el volumen de alertas generadas por un CUIT mal cargado es grande, podría ser útil que el sistema las auto-descarte (Opción A).

**Cómo validar:** conversar con Juan. La Opción C es la más conservadora y preserva trazabilidad; si el volumen de falsos positivos lo justifica, migrar a A.

### HA-04 — ¿Cuál es el mecanismo técnico del evento OPS → LEX?

**Hipótesis actual (§4.6):** Por definir. Webhook es la opción más simple para v1; event bus es más escalable; DB compartida es más acoplada.

**Cómo validar:** conversar con Santiago. La decisión técnica no afecta el producto (siempre y cuando la latencia sea "casi-real"), pero define el esfuerzo de implementación.

### HA-05 — ¿El comentario obligatorio al cerrar tiene un mínimo de longitud?

**Hipótesis actual:** No — cualquier texto no vacío es aceptable.

**Por qué podría ser distinto:** si Legal quiere forzar una explicación mínimamente sustantiva, podría pedirse un mínimo (ej: 20 caracteres).

**Cómo validar:** conversar con Juan. Probablemente se resuelve en la iteración post-v1 viendo si aparecen comentarios "ok" / "." que no aporten al registro.

### HA-06 — ¿Notificación push in-app cuando a un usuario se le asigna una alerta?

**Hipótesis actual:** No se implementa en v1. El usuario ve las alertas asignadas con el filtro "Mis alertas".

**Por qué podría ser distinto:** para mejorar el time-to-response, podría haber un toast o notificación que avise al usuario cuando le asignan algo.

**Cómo validar:** esperar a que Legal use el módulo y ver si la asignación silenciosa genera fricción. v2 si hace falta.

---

## 12. Gaps específicos del módulo Alertas

| Gap | Por qué importa | Prioridad |
|---|---|---|
| **GA-01** Mecanismo técnico del evento OPS → LEX (webhook / event bus / DB / pull) | Define la implementación del motor de cruce | Alta · decisión de Santiago |
| **GA-02** Modelo de permisos granular del módulo Alertas — validar con Juan el default propuesto en §5.5 | Afecta la utilización del módulo por cada rol | Media |
| **GA-03** Comportamiento al remover un CUIT de la Blacklist con alertas activas (HA-03) | Afecta UX y auditoría | Media |
| **GA-04** Comportamiento de reapertura de alertas cerradas (HA-02) | Define el contrato del state machine | Media |
| **GA-05** Comportamiento ante re-generación del mismo match después de cierre (§6.3) | Define la idempotencia de largo plazo | Media |
| **GA-06** Notificaciones in-app de asignación (HA-06) | Mejora time-to-response | Baja · v2 |

---

## 13. Próximos pasos específicos de este módulo

- [ ] **Revisión del discovery con Juan** — validar §5.5 (permisos), §6.4 (remover CUIT), §7 (comentarios) y las hipótesis abiertas HA-01 a HA-03, HA-05.
- [ ] **Revisión del discovery con Santiago** — validar §4.6 (mecanismo técnico), discutir la entidad Alerta en §3.3.
- [ ] **Prototipo HTML** — armar `prototypes/lex/alertas.html` adaptando el prototipo del REQ-33.
- [ ] **Handoff a Tecnología** — cuando el REQ-NEW-A esté en `SENT TO DEV`, este discovery hijo es la fuente de verdad funcional.

---

## 14. Changelog

| Fecha | Cambio |
|---|---|
| 2026-04-24 | Creación del discovery hijo para el módulo Alertas, derivado de `lex-discovery.md` §8.3 a partir de la decisión del HoP de elevar "Alertas" a módulo top-level e incorporar state machine + asignación a responsable + comentarios. Estructura inicial: propósito, contexto, arquitectura funcional con flujo end-to-end, motor de cruce, módulo en LEX con sidebar/página/detalle/permisos, state machine con 4 estados y transiciones, comentarios, asignación, criterios de aceptación por capacidad, relación con REQ-33, hipótesis abiertas HA-01 a HA-06, gaps específicos GA-01 a GA-06. |
| 2026-04-24 (PM · tarde — ajuste de UX tras iteración de prototipos) | **Rediseño de la página principal a dos pestañas** (Nuevas + Histórico) en lugar de listado único filtrable. Pestaña Nuevas hereda el formato card-list del prototipo TRD de notificaciones (REQ-33) — triaje rápido sobre `status = new`. Pestaña Histórico es listado tabular con filtros para gestión completa del resto del ciclo (`in_review`, `resolved`, `dismissed`); orden de columnas ajustado: Fecha (primera), Tipo, Cliente, específicas del tipo, Estado (penúltima), Responsable (última). Migración automática entre pestañas al cambiar estado. Header actualizado a "Última actualización: 2026-04-24 PM" y referencia al REQ-52 (el identificador definitivo; la referencia original a REQ-NEW-A queda como historia). §3.2 flujo end-to-end actualizado con pasos 5-7 reflejando la ubicación por pestaña (paso 7b añadido: migración de Nuevas a Histórico). §5.2 página principal reescrita completa: estructura de dos pestañas con detalle del card-list de Nuevas y del listado tabular del Histórico (filtros, columnas, estados vacíos diferenciados). §6.1 con nota de ubicación en UI por estado. §9.2 reescrita y §9.2.1 añadida con criterios específicos de las dos pestañas y la migración automática. §10.2 tabla ampliada con fila "Vista principal" (dos pestañas). §10.3 reescrita: el prototipo TRD se reutiliza integralmente para Nuevas. REQ-52 (y su Story AM-1001) actualizados en Jira con la nueva UX. Prototipo `lex_alertas_prototype.html` en re-iteración vía Claude Code Agent Team para reflejar los ajustes (dos pestañas, reorden de columnas, referencia visual al `trd_notifications_prototype.html` para Nuevas). |
