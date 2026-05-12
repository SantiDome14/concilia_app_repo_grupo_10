# Briefing para Claude Design — Refinamiento Tech del Set Transversal del Core

> **Propósito de este documento.** Briefing exhaustivo para que Claude Design genere las 5 presentaciones (1 paradigma + 4 técnicas) de las jornadas de refinamiento con el equipo de Tecnología sobre la iniciativa **REQ-81 — Ardua Financial Core: Infraestructura Transversal del Core**.
>
> **Cómo usar.** Iniciá una conversación nueva con Claude Design por cada sesión. Pasale este archivo completo + indicale qué sesión generar ("Generá el deck de la Sesión 1" / "Sesión 2", etc.). Claude Design tiene todo lo necesario para producir cada deck sin omitir conceptos.
>
> **Última actualización:** 2026-05-12 — refactor completo incorporando el principio "Wizard of Oz arquitectónico" (capacidades, no rutas), scope explícito del Centro, discriminador `type: 'solicitud' | 'tarea'`, asignación manual (`assignee`), series recurrentes (`RecurringInboxItemDefinition`), bifurcación por `allows_auto_generation` en Reportes, modelado de `REPORT_DEPENDENCY` como Tarea al Inbox (no como Alerta), `ReportRun.dependencies_unmet[]`, y `recurring_definition_id` en `ReportDependency`.

---

## Contexto general — común a las 5 sesiones

### Sobre Ardua Solutions

Ardua Solutions es un grupo fintech argentino-internacional con cuatro entidades reguladas (Haz Pagos PSP Argentina, Circuit Pay PSAV Argentina, Ardua Solutions Corp MSB Canadá, Astra Ventures VASP Polonia) que ofrece infraestructura de pagos cross-border, acceso a activos digitales y tooling operativo para clientes B2B (exchanges, brokers, ALyCs, traders, arbitradores). Esta iniciativa trata sobre la infraestructura compartida de las aplicaciones internas que el grupo usa para operar (el "financial-core").

### Sobre la iniciativa REQ-81

REQ-81 — "Ardua Financial Core: Infraestructura Transversal del Core" — entrega seis piezas que toda app del financial-core consume. Dos son **funcionalidades habilitantes** transversales (ACCIONES y VISTAS) y cuatro son **módulos genéricos** que aparecen en la sidebar de cada app del core (INBOX, ALERTAS, REPORTES, DASHBOARD).

Las apps del financial-core son: **CLP** (Client Portal), **FIN** (Finanzas), **LEX** (Legal & Compliance), **OPS** (Operaciones), **TRD** (Trading Desk). Eventualmente se suma **COM** (Commercial).

Los 6 REQs del set:

| REQ | Módulo | Naturaleza |
|---|---|---|
| **REQ-68** | ACCIONES (Manifest Engine) | Funcionalidad habilitante. Base sobre la que se construyen las demás piezas. |
| **REQ-69** | VISTAS + Ejes | Funcionalidad habilitante. Lista / Tarjetas / Tablero state-driven con drag-drop. |
| **REQ-71** | INBOX (Centro de Solicitudes) | Módulo genérico. Centro umbrella de Solicitudes + Tareas (`type`), con triggers automáticos + CTAs en Drawer + series recurrentes + asignación manual. |
| **REQ-73** | ALERTAS (Centro de Alertas) | Módulo genérico. Cuatro categorías: `triage`, `workflow`, `metric`, `cross_app_panel`. |
| **REQ-59** | REPORTES | Módulo genérico / servicio transversal. Catálogo + Ejecución con `ReportPermissions` y bifurcación por `allows_auto_generation`. |
| **REQ-74** | DASHBOARD | Módulo genérico. Lectura agregada del estado del área. |

### El cambio de paradigma

Hasta abril 2026 cada app del core construía las mismas piezas localmente sin contrato compartido — tablas hand-rolled, cards bespoke, kanbans sueltos, lógica de "qué puede hacer cada usuario" inline en cada vista, modales de cierre distintos. La iniciativa REQ-81 introduce un cambio estructural: la infraestructura vive **una sola vez en el core** (en el repo `core-template-frontend`) y las apps **consumen el estándar declarando configuración específica del dominio**. No reimplementan, declaran.

Esto cambia tres cosas a la vez:

1. **Cómo se desarrollan las apps** — sumar un módulo nuevo es declarar un manifest, no programar desde cero.
2. **Cómo se ven y funcionan las apps** — las 4 apps actuales y las nuevas se ven idénticas en lo transversal; varía solo el dominio.
3. **Cómo se piden nuevas funcionalidades** — las áreas no piden "construir un módulo de Alertas"; piden "dar de alta un `ALERT_TYPE` con esta configuración".

### Modelo conceptual unificado

> **Una acción del manifest es la unidad atómica de mutación o invocación del sistema.** Trigger automático de Inbox, CTA del Drawer, transición Kanban, batch op, integración externa: **todos pasan por el motor de REQ-68**. Drag-drop y click en el menú `⋯` son dos rutas equivalentes de la misma acción. El audit trail es la espina dorsal de toda la observabilidad del producto.
>
> **Capacidades, no rutas — Wizard of Oz arquitectónico.** Los CTAs externos invocan capacidades, no rutas de ejecución. La capacidad decide internamente cómo se ejecuta: integración directa (resultado inmediato) o creando trabajo en el Centro de Solicitudes (resultado eventual). El consumidor del endpoint no se entera del path. Esto habilita lanzar productos con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo.

### Audiencia de las sesiones

Equipo de Tecnología de Ardua: cuatro desarrolladores de los repos actuales (`core-app-frontend` CLP, `core-lex-frontend`, `core-ops-frontend`, `core-trd-frontend`) + Santiago Ahmed como TPM. Audiencia con conocimiento del producto, del stack actual de cada app (3 en Vue + JS, 1 en React + TS, ninguno con TypeScript estricto) y del dominio del negocio.

### Brand kit Ardua (obligatorio en todos los decks)

- **Colores:**
  - Dark navy `#11113A` — primario, fondo principal
  - Violet `#7326F1` — acentos, highlights
  - Lime `#CFF80A` — CTAs, énfasis crítico
  - Black `#000000`
- **Tipografías:** Poppins (titulares), Inter (cuerpo), Arial (fallback)
- **Diseño:** limpio, espaciado generoso, mínima decoración. Diagramas legibles, no técnicos densos. Slides tipo "presentación de Anthropic" — narrativos, no slides de manual de ingeniería. Evitar íconos genéricos decorativos.

### Tono general

Técnico pero narrativo. La iniciativa plantea un cambio de paradigma con impacto alto a nivel de negocio y áreas. El tono debe transmitir la magnitud del cambio sin caer en hype vacío. Español argentino, formal pero conversacional (vos form). Conciso. Tablas y diagramas donde aportan, prosa donde fluye mejor.

### Idioma

**Español argentino** (vos form, no tú). Términos técnicos en inglés cuando es convención (Kanban, drag-drop, audit trail, stream, manifest, dialog, capability, payload, etc.).

### Glosario común (referencia para las 5 sesiones)

| Término | Definición corta |
|---|---|
| **Financial-core** | Conjunto de apps internas del grupo Ardua que cubren cada área operativa (CLP, FIN, LEX, OPS, TRD, COM). |
| **core-template-frontend** | Repo template del cual derivan todas las apps del core. Stack único, OpenSpec como capa de contratos. |
| **REQ-81** | Iniciativa contenedora. Agrupa los 6 REQs transversales del core. |
| **Manifest** | Declaración de las acciones que un módulo expone sobre sus registros. Archivo TypeScript por módulo. |
| **Capability** | Permiso atómico que habilita ejecutar acciones, ver reportes, ser target de Solicitudes, etc. |
| **Grupo** | Agrupación administrable de capabilities + usuarios. Un usuario puede pertenecer a múltiples grupos. |
| **Action** | Operación que un usuario o sistema invoca sobre un registro. Dos tipos: `record_mutation` (muta el registro) o `function_invocation` (toma el registro como contexto e invoca otra cosa). |
| **invocation_source** | Metadata del audit trail que indica desde dónde se invocó una acción (`menu`, `cta`, `kanban_drag`, `inbox_drawer_cta`, `inbox_trigger`, `batch`, `api`). |
| **Capacidad (capability del dominio)** | A diferencia de la "capability" como permiso, una capacidad del dominio es una función pública de un `target_app` que otros módulos invocan (ej: `ejecutar_retiro` en OPS, `generar_reporte` en Reportes). La capacidad decide internamente si la ejecuta directo o si crea trabajo en el Centro. |
| **Wizard of Oz arquitectónico** | Patrón habilitado por "capacidades, no rutas": un producto puede lanzarse con ejecución 100% humana en el Centro de Solicitudes y automatizarse progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación en código, no de discovery. |
| **Centro de Solicitudes (Inbox)** | Módulo genérico (REQ-71). Umbrella que aterriza **toda Solicitud o Tarea** que requiere intervención humana del backoffice. UI muestra dos categorías (`type: 'solicitud' | 'tarea'`) bajo motor único. |
| **Solicitud** | `type: 'solicitud'`. Pedido de algo, típicamente con componente de decisión (vocabulario: aprobar/rechazar/procesar). Ej: solicitud de retiro, revisión KYC. |
| **Tarea** | `type: 'tarea'`. Pedido de ejecución de una o más acciones concretas, típicamente sin decisión (vocabulario: completar/cancelar). Ej: conciliar movimientos del día, revisar Nostros. |
| **`assignee`** | Asignación manual a un usuario específico, opcional, independiente del `owner`. Editable en cualquier estado no terminal vía CTA "Asignar/Reasignar/Liberar". |
| **`owner`** | Quién está trabajando ahora la Solicitud/Tarea. Auto-asignado en transición a `en_proceso`. Distinto de `assignee`. |
| **`source_app` / `target_app`** | App originadora vs app destino. Una Solicitud/Tarea tiene un único `target_app`. |
| **`target_role`** | Capability requerida para que un usuario sea destino de routing dentro del `target_app`. |
| **`RecurringInboxItemDefinition`** | Entidad separada del modelo del Inbox que declara series recurrentes con cadencia + payload template + `default_assignee`. Genera **instancias** independientes (`Solicitud<TPayload>` con `recurring_definition_id`) en cada ciclo. |
| **Scope explícito del Centro** | El Centro aterriza solo trabajo que requiere intervención humana del backoffice. Jobs programáticos puros (sync, audit, cron internos) viven en código como Task Definitions de Tecnología, fuera del Centro. Intersección: fallback opt-in al Centro al fallar. |
| **Alerta** | Evento detectado por el sistema (o ingreso manual) que requiere atención. Cuatro categorías: `triage`, `workflow`, `metric`, `cross_app_panel`. |
| **Report** | Definición de reporte en el catálogo del core. Tiene `permissions` con 4 niveles independientes. |
| **ReportRun** | Ejecución concreta de un reporte. Inmutable, descargable hasta vencimiento de retención. Puede tener `dependencies_unmet[]` cuando se generó con dependencias incompletas. |
| **`allows_auto_generation`** | Flag del `Report`. `true` = el sistema puede generar aunque tenga dependencias incompletas (persistiendo `dependencies_unmet[]` + emitiendo alerta al consumidor). `false` = no genera, emite Tarea al Inbox del `blocking_app`. |
| **`recurring_definition_id`** | En `ReportDependency`: referencia a una instancia específica de una serie recurrente del Inbox (REQ-71 §14). Permite vincular reportería regulatoria con tareas operativas recurrentes (ej: reporte UIF depende de `daily_reconciliation` del día previo). |
| **`<ClosureModal>`** | Componente shared del core que recoge justificación + campos al cerrar/transicionar un registro. Es un wrapper temático de `<ManifestDialog>`. |
| **`<Drawer>`** | Componente shared del core. Panel lateral con detalle del registro, timeline, comments, CTAs. |
| **Capability provider** | Servicio backend que resuelve `user_id → capabilities[]` vía la cadena Usuario → Grupos → Capabilities. |
| **Audit trail** | Log persistente + stream en tiempo real de toda acción ejecutada en el sistema. Misma fuente, dos planos. |
| **activity_template** | String templatizado declarado por cada acción del manifest (ej: `{user_name} generó un depósito para {record.cliente_nombre}`) que se resuelve al ejecutar. |

---

# Sesión 1 — El Paradigma

## Objetivo

Sentar la base conceptual. Que los devs salgan entendiendo (a) por qué cambia el modelo de desarrollo, (b) cómo se conectan los 6 transversales como sistema, (c) qué es el "modelo conceptual unificado" que cruza los REQs, (d) qué significa el principio "capacidades, no rutas", (e) cómo se trabaja a partir de ahora. **No** profundizar en cada REQ — eso va en las 4 sesiones siguientes.

## Duración

≈ 35 min de exposición + 15 min de Q&A. **Slides recomendados: 20.**

## Mensaje central

> La infraestructura del financial-core vive una sola vez en el core. Las apps consumen el estándar declarando configuración del dominio. Los CTAs externos invocan capacidades, no rutas — el módulo destino decide internamente si ejecuta directo o si crea trabajo en el Centro. Esto cambia simultáneamente cómo se desarrollan las apps, cómo se ven, cómo funcionan y cómo se piden nuevas funcionalidades.

## Conceptos clave que deben quedar

1. **El problema actual** — 4 apps con stacks divergentes (3 en Vue+JS, 1 en React+TS, ninguna con TS estricto), reimplementando lo mismo sin contrato compartido. Resultado: divergencia inevitable, no reuso, governance fragmentada.
2. **`core-template-frontend`** — el nuevo template oficial del grupo. Stack único (Vue 3 + TS strict + Vite + Tailwind 4 + shadcn-vue). OpenSpec como capa de contratos enforceables en CI.
3. **El insight central** — la infraestructura vive una sola vez; las apps declaran configuración. No reimplementan.
4. **Los 6 transversales como sistema** — 2 habilitantes (ACCIONES, VISTAS) + 4 módulos genéricos (INBOX, ALERTAS, REPORTES, DASHBOARD). Orden de rollout con dependencias claras.
5. **Modelo conceptual unificado — capa 1** — una acción del manifest es la unidad atómica de mutación/invocación; todo pasa por el motor de REQ-68.
6. **Modelo conceptual unificado — capa 2: capacidades, no rutas** — los CTAs externos invocan capacidades del módulo destino, no rutas de ejecución. La capacidad decide internamente si ejecuta directo o crea trabajo en el Centro. Esto habilita el patrón "Wizard of Oz arquitectónico".
7. **Una sola fuente de verdad** — Capabilities + Grupos viven una sola vez (REQ-68) y son consumidas por todos los demás REQs.
8. **Universalidad y consistencia** — menú `⋯` en todo registro, 3 vistas representan el mismo set, `<ClosureModal>` reutilizado en Inbox/Alertas/Kanban, drag-drop y menú son rutas equivalentes.
9. **Audit trail + Stream** — espina dorsal de la observabilidad. Log persistente para auditorías + stream en tiempo real para activity feed e integraciones analíticas.
10. **Cambio cultural en cómo se piden funcionalidades** — las áreas declaran configuración, no piden "construir un módulo".

## Slides sugeridos (estructura narrativa)

| # | Título | Contenido |
|---|---|---|
| 1 | **Portada** | Título: "Ardua Financial Core — Infraestructura Transversal del Core". Subtítulo: "Sesión 1 de 5 — El Paradigma". Iniciativa REQ-81. Yasmani Rodriguez · Head of Product. |
| 2 | **Agenda** | (1) Por qué este cambio, (2) Qué construimos hoy vs el problema, (3) El nuevo paradigma, (4) Los 6 transversales como sistema, (5) Modelo conceptual unificado, (6) Capacidades, no rutas — Wizard of Oz arquitectónico, (7) Cómo trabajamos a partir de ahora, (8) Las 4 sesiones que vienen, (9) Q&A. |
| 3 | **El problema — 4 apps, 4 implementaciones divergentes** | Hoy `core-app-frontend` (CLP), `core-lex-frontend`, `core-ops-frontend`, `core-trd-frontend` reimplementan localmente: tablas hand-rolled, cards bespoke por módulo, kanbans sueltos cuando existen, lógica de "qué puede hacer cada usuario" inline en cada vista, modales de cierre distintos. Resultado: divergencia inevitable, código no reusable, governance fragmentada. |
| 4 | **El costo real de esto** | Sumar un módulo nuevo a un app = reimplementar todo desde cero. Cambiar la matriz de permisos = tocar UI en N lugares. Audit trail = inexistente o ad-hoc. Reportería = manual y por área. No hay forma de responder "qué hizo Yasmani sobre el Cliente Acme entre marzo y abril". |
| 5 | **El cambio — `core-template-frontend` como base** | Un repo template del cual derivan todas las apps del core. Stack único: Vue 3 + TypeScript strict + Vite 7 + Tailwind 4 + shadcn-vue + Pinia + Vue Query + Auth0. OpenSpec como capa de contratos enforceables en CI. Skills declarativas para que devs implementen frontend sin fricción. Las 4 apps migran a este template; las apps nuevas (FIN, COM) parten de él. |
| 6 | **6 transversales que el template entrega** | Visual: dos columnas. Izquierda: 2 funcionalidades habilitantes (ACCIONES, VISTAS). Derecha: 4 módulos genéricos (INBOX, ALERTAS, REPORTES, DASHBOARD). Cada uno con su REQ key. |
| 7 | **El insight clave — "transversal" significa una vez** | El paradigma del template dice: la infraestructura vive una sola vez en el core; las apps consumen el estándar declarando configuración específica del dominio. Una app no reimplementa `<DataTable>`, no reescribe el motor de Acciones, no inventa su propio Drawer. Declara qué tipos de Solicitudes maneja, qué `ALERT_TYPE`s registra, qué KPI cards pueblan su Dashboard. |
| 8 | **Cómo se conectan los 6 transversales** | Diagrama de orden de rollout: REQ-68 ACCIONES (base habilitante) → REQ-69 VISTAS → REQ-71 INBOX + REQ-73 ALERTAS (en paralelo) → REQ-59 REPORTES → REQ-74 DASHBOARD. Justificación al pie: sin manifest engine no hay capabilities/dialogs/audit trail; Vistas provee `<ClosureModal>`; Inbox y Alertas comparten tipos canónicos; Reportes consume el endpoint de ingesta de Inbox para emitir Tareas de coordinación; Dashboard consume counters + stream de los 5 anteriores. |
| 9 | **Modelo conceptual unificado — capa 1: todo pasa por el motor** | "Una acción del manifest es la unidad atómica de mutación o invocación del sistema." Cuatro consecuencias concretas: (a) trigger automático de Inbox = acción `function_invocation` invocada por el sistema con `invocation_source: 'inbox_trigger'`. (b) Transición drag-drop del Kanban = acción `record_mutation` invocada por el usuario con `invocation_source: 'kanban_drag'`. (c) CTA en el Drawer de Solicitud = acción del manifest del módulo destino. (d) Activity feed del Dashboard = stream del audit trail filtrado. Todo pasa por el motor de REQ-68. |
| 10 | **Modelo conceptual unificado — capa 2: capacidades, no rutas** | Los CTAs externos (en CLP, Pago Directo, RFQ Gateway, etc.) invocan **capacidades** del `target_app`, no rutas de ejecución específicas. La capacidad decide internamente cómo se ejecuta: (a) **integración directa** → resultado inmediato, no toca el Centro; o (b) **crea Solicitud/Tarea en el Centro** → resultado eventual, el CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado". Esto habilita el patrón **"Wizard of Oz arquitectónico"**: un producto puede lanzarse con ejecución 100% humana en el Centro desde día uno y automatizarse progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación en código (variable por monto, cliente, hora, tipo de operación, etc.), no de discovery de producto. **Ejemplo:** el usuario del CLP clickea "Retirar"; el CTA invoca la capacidad `ejecutar_retiro` de OPS; OPS decide internamente si lo procesa vía integración directa o si crea una Solicitud al Centro de OPS; el usuario del CLP no se entera del path. |
| 11 | **Una sola fuente de verdad** | El catálogo de manifests es la única fuente de verdad de qué puede hacerse en la plataforma. Capabilities + Grupos viven una sola vez (REQ-68 §6) y son consumidas por todos los demás REQs: Reportes para `permissions`, Inbox para `target_role`, Alertas para routing, Dashboard para filtrado. Frontend y backend resuelven la misma data. |
| 12 | **Universalidad y consistencia** | El menú `⋯` aparece en todo registro de la plataforma en cualquier formato (lista, card, Kanban). Las 3 vistas (Lista/Tarjetas/Tablero) son representaciones del mismo record set filtrado — cambiar de vista no cambia el set, cambiar el eje del Kanban no cambia el set. El `<ClosureModal>` es el mismo componente reutilizado por Inbox, Alertas categoría `workflow` y transiciones de Kanban. Drag-drop y click en el menú son rutas equivalentes de la misma acción. |
| 13 | **Audit trail + Stream — la espina dorsal de la observabilidad** | El motor de Acciones emite eventos en dos planos sobre la misma fuente: **log persistente consultable** (para auditorías, compliance, reportes regulatorios, queries históricas filtrables por `record_id`, `user_id`, `action_id`, rango de fechas) + **stream en tiempo real** (para activity feed del Dashboard, sinks externos como Mixpanel/Amplitude/PostHog/Hubspot configurables sin instrumentar nada en las apps). Cada acción declara `activity_template` que se resuelve al ejecutar y persiste en `activity_text`. |
| 14 | **Impacto en cómo se desarrolla** | Para devs: sumar un módulo nuevo a un app = declarar un manifest + opcionalmente declarar tipos de Solicitudes/Alertas/Reportes/KPIs. No se toca el motor, no se reescribe el Drawer, no se reinventa el Kanban. Las skills del template (`ardua-add-module`, `ardua-add-row-actions`, `ardua-build-filterable-list`, etc.) automatizan el scaffolding. |
| 15 | **Antes / después — ejemplo concreto** | Ejemplo: agregar la acción "Marcar Conciliado" a un movimiento de OPS. **Antes:** tocar el componente de la lista de movimientos en OPS, agregar lógica de capability inline, programar el dialog, conectar al endpoint, manualmente sumar al log si existe. Cada app que tenga "Marcar Conciliado" repite el ejercicio. **Después:** alta de la acción en `manifests/ops.movimientos.actions.ts` con `id`, `label`, `capabilities`, `on_confirm`. La acción aparece automáticamente en el menú `⋯`, audit trail funciona out-of-the-box, activity feed la renderiza si declara `activity_template`. Tres pasos: alta del registro, eventual nuevo endpoint server-side, deploy. |
| 16 | **Impacto en cómo se piden funcionalidades** | Cambio cultural: las áreas no piden "construir un nuevo módulo de Alertas para mi área" — piden "dar de alta un `ALERT_TYPE` con esta configuración". Las áreas no piden "agregar una acción nueva al menú" — piden "registrar una acción del manifest con estas capabilities y este `dialog`". Las áreas no piden "construir una nueva ruta de ejecución" — piden "exponer una capacidad" + opcionalmente declarar un tipo de Solicitud/Tarea para los casos de Wizard of Oz. Flujo formal de alta para nuevas acciones, tipos de Solicitudes/Tareas, tipos de Alertas, reportes, series recurrentes. |
| 17 | **Impacto en cómo se ven y funcionan las apps** | Las 4 apps actuales + las nuevas se ven y funcionan **igual** en lo que es transversal (header, sidebar, vistas, menú de acciones, Drawer, ClosureModal, Dashboard). Lo que cambia entre apps es el dominio (qué KPIs muestra, qué tipos de registro gestiona, qué `ALERT_TYPE`s registra). El usuario que opera en LEX y OPS no aprende dos productos distintos — aprende uno con dos dominios. |
| 18 | **Las 4 sesiones que vienen** | Sesión 2: REQ-68 ACCIONES. Sesión 3: REQ-69 VISTAS + REQ-71 INBOX (Centro de Solicitudes con `type`, `concept`, `assignee`, series recurrentes). Sesión 4: REQ-73 ALERTAS + REQ-59 REPORTES (con bifurcación `allows_auto_generation` y `REPORT_DEPENDENCY` como Tarea al Inbox). Sesión 5: REQ-74 DASHBOARD + cierre. Recomendación de lectura previa de cada REQ en Jira la noche anterior. |
| 19 | **Lo que esperamos de ustedes** | Llegar con dudas reales — esta semana es para que los conceptos aterricen. Preguntas sobre implementación concreta, sobre integración con el stack actual, sobre puntos donde el paradigma no cierra. Las primeras semanas de implementación van a tener fricción; vale invertir el tiempo de refinamiento ahora. |
| 20 | **Q&A** | Slide simple con copy "Preguntas". |

## Speaker notes / puntos a enfatizar

- Slide 3-4: no apuntar al equipo actual. El problema no es la calidad del trabajo hecho — es la ausencia de un contrato compartido. Sin ese contrato, divergir era el camino natural.
- Slide 7: el concepto de "consumir el estándar declarando configuración" es el núcleo del cambio. Si los devs internalizan solo este punto, ya vale la sesión.
- Slide 9: el modelo conceptual unificado capa 1 es contraintuitivo al principio. Que una transición Kanban "sea" una acción del manifest es una abstracción potente pero requiere repetirla con ejemplos.
- Slide 10: el principio "capacidades, no rutas" es la idea más transformadora del paradigma a nivel producto. Tomarse tiempo de explicarlo bien con el ejemplo del CLP/retiro. La consecuencia operativa más concreta — lanzar un producto con ejecución 100% humana desde día uno y automatizar después sin tocar el frontend — vale destacarla porque cambia cómo se planifica.
- Slide 15: el antes/después es el slide que más ancla el cambio. Tomarse tiempo de explicarlo bien, idealmente caminar el código mental con ellos.
- Slide 16: el cambio cultural impacta también al PM y a las áreas, no solo a Tech. Vale mencionarlo para que los devs entiendan que no es una imposición del producto.
- Slide 19: dejar claro que las preguntas críticas son bienvenidas. Si algún REQ no cierra, mejor descubrirlo ahora.

---

# Sesión 2 — REQ-68 ACCIONES (Manifest Engine)

## Objetivo

Profundizar en el motor de Acciones — la base habilitante sobre la que se construyen los demás REQs. Que los devs salgan entendiendo (a) qué es un manifest y cómo se declara, (b) la distinción `record_mutation` vs `function_invocation`, (c) el modelo de Capabilities + Grupos + Panel admin, (d) audit trail + stream de eventos, (e) la agrupación visual del menú `⋯`, (f) cómo se da de alta una nueva acción.

## Duración

≈ 45 min de exposición + 15 min de Q&A. **Slides recomendados: 24.**

## Mensaje central

> Una acción del manifest es la unidad atómica de mutación o invocación del sistema. El catálogo de manifests es la única fuente de verdad de qué puede hacerse en la plataforma. Capabilities + Grupos viven una sola vez; el audit trail + stream son la espina dorsal de la observabilidad.

## Conceptos clave que deben quedar

1. **Modelo de la relación Acción × Registro × Capability** — una acción ejecuta sobre un registro de cierto tipo, requiere capabilities (heredadas vía Grupos), tiene tipo `record_mutation` o `function_invocation`, pertenece opcionalmente a un sub-grupo funcional, puede abrir un Dialog, ejecuta `on_confirm` o `invokes` según el tipo.
2. **`record_mutation` vs `function_invocation`** — discriminador clave. Mutación completa campos del registro fuente; invocación toma el registro como contexto e invoca otra cosa (crear documento en otro módulo, navegar, disparar job, llamar endpoint).
3. **Universalidad del menú `⋯`** — todo registro en cualquier formato (lista, card, Kanban) tiene el menú. Sin acciones habilitadas, aparece deshabilitado con tooltip.
4. **Agrupación visual en 2 niveles** — bloque `ASIGNACIÓN / IMPUTACIÓN` (mutaciones, admite sub-grupos del nivel 2 como `IMPUTACIÓN`, `CONCILIACIÓN`, `GOVERNANCE`, `DOCUMENTACIÓN`, `CIERRE`) + bloque `CONTEXTUALES` (invocaciones, siempre flat).
5. **Iconografía** — `✓` para `record_mutation`, `↗` para `function_invocation`. Override declarable.
6. **Capabilities + Grupos** — capabilities atómicas mantenidas por Producto. Grupos administrables con capabilities + memberships. Un usuario pertenece a múltiples grupos; sus capabilities efectivas son la unión.
7. **Capability provider** — servicio backend único que resuelve `user_id → capabilities[]`. Frontend y backend hablan la misma fuente.
8. **Panel admin** — entregable de este REQ. CRUD sobre Capabilities + Grupos + Memberships. Restringido a capability `manage_capabilities`.
9. **Audit trail + Stream** — log persistente consultable + stream en tiempo real. Mismo shape canónico (`ActionLogEntry`). `activity_template` declarable por acción.
10. **`invocation_source`** — 7 categorías (`menu`, `cta`, `kanban_drag`, `inbox_drawer_cta`, `inbox_trigger`, `batch`, `api`) que el motor registra como metadata. El motor no distingue por fuente.
11. **Flujo de alta de nuevas acciones (V1)** — solicitud estructurada del área → Producto valida → Tecnología implementa en `manifests/<app>.<module>.actions.ts` → deploy.
12. **Motor pure-TS** — sin Vue/DOM. Importable desde frontend y backend. Misma lógica en cliente y servidor.

## Detalles técnicos clave (para profundidad de slides)

### Shape del `ActionConfig`

```typescript
type ActionType = 'record_mutation' | 'function_invocation';
type InvocationMode = 'modal_wizard' | 'navigate' | 'background_job' | 'sync_call';

interface ActionConfig {
  id: string;                              // identificador único dentro de app.module[.recordType]
  label: string;                           // texto visible
  placement: 'row_action' | 'module_cta';  // dónde se renderiza
  action_type: ActionType;                 // discriminador de mecánica
  group?: string;                          // sub-grupo del nivel 2 (solo en record_mutation)
  capabilities: string[];                  // capabilities que la habilitan
  enable_when?: string;                    // predicate sobre el registro y contexto
  show_when?: string;                      // predicate de visibilidad (oculta sin deshabilitar)
  feature_flag?: string;                   // flag de habilitación
  activity_template?: string;              // template human-readable para activity feed
  icon?: string;                           // override del icono visual; default según action_type

  // Solo cuando action_type === 'record_mutation'
  dialog?: DialogConfig;                   // campos que completa el usuario
  on_confirm?: OnConfirmEffects;           // set_fields, recompute, audit, toast
  then_invoke?: InvokeConfig;              // OPCIONAL: tras la mutación, invocar otra funcionalidad

  // Solo cuando action_type === 'function_invocation'
  invokes?: InvokeConfig;                  // mandatorio en este tipo
  on_success?: OnConfirmEffects;           // OPCIONAL: efecto en el registro fuente al retornar ok
}

interface InvokeConfig {
  target_ref: string;                      // ID del módulo/función/endpoint a invocar
  invocation_mode: InvocationMode;
  parameter_mapping: Record<string, string>;
}
```

### Ejemplos del patrón

| Acción | placement | action_type | group | Mecánica |
|---|---|---|---|---|
| "Asignar Banco y Cuenta" (movimiento OPS) | `row_action` | `record_mutation` | `IMPUTACIÓN` | dialog + on_confirm |
| "Marcar Conciliado" (movimiento OPS) | `row_action` | `record_mutation` | `CONCILIACIÓN` | on_confirm directo |
| "Marcar como Intercompany" | `row_action` | `record_mutation` | `GOVERNANCE` | on_confirm con set_fields |
| "Descartar" (alerta, destructiva) | `row_action` | `record_mutation` | `CIERRE` | confirmación; render en rojo |
| "Generar Factura" (sobre movimiento) | `row_action` | `function_invocation` | — | abre wizard de facturación |
| "Ver movimientos de cliente" (CLP) | `row_action` | `function_invocation` | — | navega a `/movimientos` filtrado |
| "Validar whitelist" (cuenta destino) | `row_action` | `function_invocation` | — | llama endpoint, muestra resultado inline |
| "Iniciar nuevo proceso de pricing" (TRD) | `module_cta` | `function_invocation` | — | abre wizard sin contexto de registro |
| "Cerrar período contable" (FIN) | `module_cta` | `record_mutation` | `GOVERNANCE` | mutación masiva con confirmación |

### Mockup del menú agrupado

```
ACCIONES DEL REGISTRO

─────────────────────────────
ASIGNACIÓN / IMPUTACIÓN
─────────────────────────────
  IMPUTACIÓN
  ✓  Asignar Banco y Cuenta
  ✓  Asignar Cliente

  CONCILIACIÓN
  ✓  Marcar con Diferencias
  ✓  Marcar Conciliado

  GOVERNANCE
  ✓  Marcar como Intercompany

  DOCUMENTACIÓN
  ✓  Marcar como No facturable

─────────────────────────────
CONTEXTUALES
─────────────────────────────
  ↗  Generar Factura
  ↗  Crear Nota de Crédito
  ↗  Crear Nota de Débito
  ↗  Generar reporte sobre este registro
  ↗  Ver movimientos de este cliente
```

### Shape del `ActionLogEntry`

```typescript
interface ActionLogEntry {
  event_id: string;
  action_id: string;
  manifest_key: string;
  record_type: string;
  record_id: string;
  user_id: string;
  user_email: string;
  invocation_source: 'menu' | 'cta' | 'kanban_drag' | 'inbox_drawer_cta' | 'inbox_trigger' | 'batch' | 'api';
  params: Record<string, unknown>;
  outcome: 'success' | 'error';
  error_message?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  result_ref?: string;
  activity_text?: string;
  timestamp: number;
}
```

### Modelo de Capabilities + Grupos

```
Capabilities atómicas ("puede_ver_pnl", "puede_imputar_movimiento", ...)
            ↓ se asignan a
Grupos ("Equipo Finanzas", "Compliance Officers", "OPS Argentina", "Admins", ...)
            ↓ incluyen
Usuarios (Yasmani, Mauro, Belén, ...) — vía memberships
```

Capability efectiva del usuario = unión de capabilities de todos sus grupos.

### Performance targets

- Render del `<ManifestActionsMenu>` con 15 acciones (10 visibles, agrupadas): < 100 ms
- Evaluación batch del motor para 100 registros con manifest típico: < 200 ms
- Dispatch del audit log + stream al ejecutar una acción: < 50 ms
- Query del audit trail por `record_id` con 1000 entradas: < 200 ms
- Resolución de capabilities efectivas para un usuario (con 5 grupos): < 30 ms

## Slides sugeridos

| # | Título | Contenido |
|---|---|---|
| 1 | **Portada** | "REQ-68 ACCIONES — Manifest Engine". Sesión 2 de 5. |
| 2 | **Agenda** | (1) Qué problema resuelve, (2) Modelo de la relación Acción × Registro × Capability, (3) `record_mutation` vs `function_invocation`, (4) Capabilities + Grupos + Panel admin, (5) Universalidad del menú `⋯` + agrupación visual, (6) Audit trail + Stream, (7) Flujo de alta de nuevas acciones, (8) Performance + naturaleza del servicio, (9) Q&A. |
| 3 | **El problema actual** | Hoy la lógica de "qué puede hacer cada usuario" vive inline en el frontend de cada app — objetos `can`/`reason`/`tag` dentro de cada vista, helpers ad-hoc por módulo. Tres consecuencias: divergencia inevitable, imposibilidad de cambiar la matriz de capabilities sin tocar UI en N lugares, ausencia de audit trail unificado. |
| 4 | **El modelo de la relación** | Diagrama: Acción → puede ejecutarse sobre Registro de un cierto Tipo → requiere Capability (heredada vía Grupos) → es `record_mutation` o `function_invocation` → pertenece a `group` (sub-grupo, opcional) → puede abrir Dialog → ejecuta `on_confirm` (mutación) o `invokes` (invocación). |
| 5 | **El catálogo de manifests** | Cada módulo declara su catálogo en un archivo TypeScript (`manifests/<app>.<module>.actions.ts`) con `key`, `recordType`, `actions[]` (row-level), `module_ctas[]` (header), `kanban_axes[]` (cuando aplica). Los manifests se consumen al boot y forman el catálogo unificado. **Este catálogo es la única fuente de verdad de qué puede hacerse en la plataforma.** |
| 6 | **`ActionConfig` shape** | Mostrar el shape completo del `ActionConfig` con TypeScript. Highlights: `action_type` como discriminador, `placement` como locator (`row_action` vs `module_cta`), `capabilities[]`, `enable_when` como predicate. |
| 7 | **`record_mutation` vs `function_invocation`** | Tabla comparativa con ejemplos: mutación completa campos del registro fuente, invocación toma el registro como contexto. Híbridos: `then_invoke` (mutar y después invocar), `on_success` (efecto en registro fuente al retornar ok). |
| 8 | **Ejemplos del patrón completo** | Tabla densa con 8-10 ejemplos reales del dominio: Asignar Banco y Cuenta, Marcar Conciliado, Generar Factura, Validar whitelist, etc. Columnas: Acción, placement, action_type, group, Mecánica, invocation_mode (cuando aplica). |
| 9 | **Universalidad del menú `⋯`** | A partir de este REQ, todo registro de la plataforma en cualquier formato (lista, card, Kanban) tiene el menú `⋯` montado. La presencia es invariante. Lo que varía es qué acciones aparecen habilitadas — resultado de evaluar el manifest contra capabilities + estado del registro. Sin acciones habilitadas → `⋯` aparece deshabilitado con tooltip "Sin acciones disponibles en el estado actual". |
| 10 | **Agrupación visual del menú — 2 niveles** | Mockup del menú agrupado. Nivel 1: bloques por `action_type` (`ASIGNACIÓN / IMPUTACIÓN` para mutaciones, `CONTEXTUALES` para invocaciones). Nivel 2: sub-grupos funcionales (`IMPUTACIÓN`, `CONCILIACIÓN`, `GOVERNANCE`, `DOCUMENTACIÓN`, `CIERRE`) solo dentro de mutaciones. |
| 11 | **Iconografía visual** | `✓` (check) para `record_mutation` — captura el patrón de "completar/marcar". `↗` (flecha externa) para `function_invocation` — captura "salir del registro a invocar algo". Override declarable via `ActionConfig.icon`. Acciones destructivas: label en rojo, mismo icono del bloque. |
| 12 | **Capabilities atómicas** | Catálogo de capabilities canónicas mantenido por Producto: `id`, `label`, `description`, `domain` (opcional). Las acciones del manifest las referencian por `id`. Sumar una capability es PR + alta en el catálogo. |
| 13 | **Grupos** | Agrupación administrable de capabilities + usuarios. `id`, `name`, `description`, `capabilities[]`, `members[]`. Un usuario puede pertenecer a múltiples grupos; sus capabilities efectivas son la unión. |
| 14 | **Capability provider** | Servicio backend único alimentado por claims del JWT de Auth0 + datos de Grupos persistidos. Resuelve `user_id → capabilities[]` vía Usuario → Grupos → Capabilities. Consumido por el motor (este REQ), REQ-59 (permissions de reportes), REQ-71 (Inbox target_role + manual_creation_capability), REQ-73 (Alertas target_role), guards de ruta, APIs server-side. Misma fuente de verdad en frontend y backend. |
| 15 | **Panel admin de Grupos** | Entregable de este REQ. UI admin para CRUD sobre Capabilities y Grupos. Tres vistas: Capabilities (con su uso), Grupos (con capabilities + miembros), Usuario (qué grupos integra + qué capabilities efectivas tiene). Acceso restringido a capability `manage_capabilities`. |
| 16 | **Motor de evaluación pure-TS** | Sin Vue/DOM. Recibe `(record, user, manifest_key)` y devuelve las acciones habilitadas con motivo legible cuando una está deshabilitada. Importable desde frontend (qué mostrar) y backend (validar antes de ejecutar). Lógica idéntica cliente y servidor. |
| 17 | **Audit trail — log persistente** | Cada ejecución persiste `ActionLogEntry` con shape canónico. Mostrar el shape. Log consultable filtrable por `record_id`, `user_id`, `action_id`, `manifest_key`, `invocation_source`, rango de fechas. Base de governance, compliance, reportes regulatorios. |
| 18 | **Audit trail — stream en tiempo real** | El audit trail también emite eventos al stream con el mismo shape. Consumidores internos: REQ-74 (Dashboard activity feed con `activity_template` resuelto), sistema de notificaciones (V2). Consumidores externos: Mixpanel, Amplitude, PostHog, Hubspot, cualquier servicio compatible con webhooks o pub/sub. Sumar un destino no requiere instrumentar nada en las apps. |
| 19 | **`activity_template`** | String templatizado declarado por cada acción (`{user_name} generó un depósito para {record.cliente_nombre}`) que se resuelve al ejecutar y persiste en `activity_text` del `ActionLogEntry`. Consumido por activity feed del Dashboard y reportes regulatorios. |
| 20 | **`invocation_source`** | Las 7 categorías: `menu`, `cta`, `kanban_drag`, `inbox_drawer_cta`, `inbox_trigger`, `batch`, `api`. El motor no distingue por fuente — ejecuta la misma lógica. La fuente es metadata para audit + analíticas (patrón "qué % de cada acción se invoca por menú vs trigger automático vs batch"). |
| 21 | **Flujo de alta de nuevas acciones (V1)** | (1) Área solicita acción con campos definitorios. (2) Producto valida (¿duplica? ¿capabilities existen? ¿`enable_when` coherente? ¿`target_ref` referenciado existe? ¿`group` solo en `record_mutation`?). (3) Tecnología edita `manifests/<app>.<module>.actions.ts` + tests + PR. Si requiere endpoint nuevo, se construye en paralelo. (4) Deploy. La acción aparece automáticamente en el menú. |
| 22 | **V2 — extensiones futuras** | Edición runtime del catálogo (UI administrativa), versionado de manifests con migraciones automáticas, asistente IA para definir nuevas acciones a partir de descripciones funcionales, workflow de aprobación multi-paso. Quedan para V2. |
| 23 | **Performance targets + naturaleza del servicio** | Performance targets en tabla. Naturaleza: motor pure-TS + componentes Vue 3 (`<ManifestActionsMenu>`, `<ManifestModuleCTAs>`, `<ManifestDialog>`, `<ManifestField>`, `<ManifestBatchCTA>`, `<ManifestInvokeRunner>`) + audit trail backend + capability provider backend + stream de eventos. |
| 24 | **Q&A** | Slide simple "Preguntas". |

## Speaker notes / puntos a enfatizar

- Slide 5: el manifest es **TypeScript**, no JSON ni YAML. Esto importa porque permite tipado strict, autocompletado, validación al boot, refactor seguro.
- Slide 7: si los devs solo entienden la distinción `record_mutation` vs `function_invocation` ya valió la sesión. Es el discriminador que organiza toda la mecánica.
- Slide 9: enfatizar que la presencia del `⋯` es invariante. Esto contradice algunos patrones actuales donde el menú "desaparece" cuando no hay acciones — eso ya no aplica.
- Slide 10: si tienen tiempo, mostrar el mockup con un caso real del dominio (movimiento de OPS) para que aterrice.
- Slide 14: el capability provider es la pieza más cross-REQ. Si los devs entienden que es una sola fuente de verdad consumida por todos los REQs, entienden por qué los demás REQs son tan livianos en cuanto a permisos.
- Slide 17-18: el doble plano del audit trail es contraintuitivo. Insistir en que es la **misma fuente** — log persistente Y stream — no dos sistemas.
- Slide 21: el flujo de alta es el cambio cultural más importante. Una nueva acción es un cambio de declaración + PR, no un proyecto.

---

# Sesión 3 — REQ-69 VISTAS + REQ-71 INBOX

## Objetivo

Cubrir las dos piezas que se construyen directamente sobre el motor de Acciones. **REQ-69 VISTAS** introduce el contrato de visualización de registros (Lista / Tarjetas / Tablero) + el motor de Ejes + drag-drop como invocación al motor de Acciones. **REQ-71 INBOX** entrega el **Centro de Solicitudes** — el módulo umbrella que aterriza toda Solicitud o Tarea que requiere intervención humana del backoffice, con motor único + discriminador `type`, asignación manual (`assignee`), series recurrentes, y notificación multi-canal opcional.

Que los devs salgan entendiendo (a) cómo se declaran las 3 vistas en un módulo, (b) cómo funciona el Tablero state-driven con Ejes, (c) cómo una transición Kanban es una acción del manifest, (d) qué es el `<ClosureModal>` shared, (e) el principio "capacidades, no rutas" como fundación del Centro, (f) qué aterriza dentro del Centro y qué queda fuera (scope explícito), (g) Solicitud vs Tarea con `type`, (h) `assignee` independiente del `owner`, (i) los 4 caminos de creación, (j) cómo se declaran triggers automáticos y CTAs en el Drawer, (k) series recurrentes (`RecurringInboxItemDefinition`).

## Duración

≈ 75 min de exposición + 15 min de Q&A. **Slides recomendados: 32** (12 para REQ-69 + 19 para REQ-71 + 1 cierre).

## Mensaje central

> Las 3 vistas son representaciones del mismo record set filtrado. Una transición drag-drop del Kanban es literalmente una acción del manifest del módulo invocada con `invocation_source: 'kanban_drag'`. El `<ClosureModal>` es el `<ManifestDialog>` con header/copy específicos para transiciones de cierre. El Centro de Solicitudes aterriza **solo trabajo que requiere intervención humana**; los jobs programáticos puros viven fuera. Los CTAs externos invocan **capacidades** del `target_app`, no rutas — la capacidad decide internamente si crea Solicitud/Tarea en el Centro o si ejecuta directo. Una Solicitud/Tarea no es un registro pasivo: triggerea acciones del manifest al caer y expone CTAs invocables.

## Bloque 1 — REQ-69 VISTAS

### Conceptos clave que deben quedar

1. **Tres vistas declarables** — `views: ('list' | 'cards' | 'kanban')[]`. Las tres comparten record set y filtros. Cambiar de vista no cambia el set.
2. **Filtros como capa anterior a las vistas** — se aplican al record set del módulo. Las 3 vistas son representaciones del mismo set filtrado.
3. **Vista Tablero state-driven** — columnas dinámicas según el eje activo (campo enum del registro). Cantidad de columnas = cantidad de valores del eje.
4. **Ejes redefinibles por el usuario** — un módulo puede declarar múltiples ejes; el usuario elige cuál ver en runtime. Cambiar el eje no cambia el record set.
5. **Drag-drop como invocación al motor** — cada transición declara `{from, to, action_id}` referenciando una acción `record_mutation` del manifest. El `mode` se deriva: con `dialog` → modal abre `<ClosureModal>`; sin `dialog` → mutación directa.
6. **`<ClosureModal>` shared** — wrapper temático del `<ManifestDialog>` (REQ-68) con header y copy específicos para cierre. Misma mecánica de campos, validación, footer, persistencia. Reutilizable en Inbox, Alertas categoría `workflow` y cualquier transición con dialog.
7. **Universalidad del `⋯` también en cards del Kanban** — drag-drop y menú son rutas equivalentes; difieren solo en `invocation_source` (`kanban_drag` vs `menu`).
8. **Cards no draggables** — dos razones: (a) estado en `terminal_values[]` del eje, (b) motor reporta todas las transiciones disabled para el usuario.
9. **Cap blando de 200 cards por columna** — V1; virtualización completa es V2.
10. **Empty state por columna** — placeholder con copy "Sin registros en este estado"; columna no se colapsa.

### Detalles técnicos clave

```typescript
interface KanbanAxis {
  id: string;
  label: string;
  field: string;                          // campo enum del registro (dimensión del eje)
  values: string[];                       // valores válidos en el orden visual deseado
  column_labels: Record<string, string>;
  terminal_values?: string[];             // valores terminales (cards no draggables)
  order_by?: string;                      // ordenamiento intra-columna; default created_at desc
  transitions: KanbanTransition[];
}

interface KanbanTransition {
  from: string;
  to: string;
  action_id: string;                      // ID de una acción del manifest (REQ-68)
}
```

Ejemplo en el manifest de un módulo:

```typescript
{
  views: ['list', 'cards', 'kanban'],
  kanban_axes: [
    {
      id: 'documentacion',
      label: 'Estado de Documentación',
      field: 'estado_documentacion',
      values: ['pendiente_emision', 'emitida', 'enviada', 'cobrada'],
      column_labels: { pendiente_emision: 'Pendiente', emitida: 'Emitida', ... },
      terminal_values: ['cobrada'],
      order_by: '-fecha',
      transitions: [
        { from: 'pendiente_emision', to: 'emitida', action_id: 'fin.facturas.emitir' },
        { from: 'emitida', to: 'enviada', action_id: 'fin.facturas.marcar_enviada' },
        { from: 'enviada', to: 'cobrada', action_id: 'fin.facturas.marcar_cobrada' },
      ]
    }
  ]
}
```

### Slides sugeridos REQ-69 (12 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-69 — Vistas + Ejes** | Portada del bloque. |
| 2 | **El problema** | Cada app reimplementa Lista, Cards, Kanban sin contrato compartido. Tablas hand-rolled, cards bespoke, kanbans sueltos. Tres consecuencias: divergencia, no reuso, dificultad de mantener consistencia visual. |
| 3 | **Tres vistas declarables** | `views: ('list' | 'cards' | 'kanban')[]`. El módulo declara qué vistas soporta. `<ViewToggle>` se renderiza cuando hay más de una. Cambiar de vista no cambia el record set ni los filtros activos. |
| 4 | **Filtros como capa anterior** | Diagrama: Record set del módulo → Filtros (L3) + Search → Set filtrado → Lista / Tarjetas / Tablero como 3 representaciones del mismo set. |
| 5 | **Vista Lista + Vista Tarjetas** | Lista: tabla con paginación (vía `useTable` o `@tanstack/vue-query` — hand-rolled prohibido), sorting, search, filtros L3, selección múltiple. Tarjetas: grid responsive con `CardItem` declarado por el módulo. Ambas comparten filtros y record set. |
| 6 | **Vista Tablero state-driven** | Las columnas se generan dinámicamente del eje activo. Cantidad de columnas = cantidad de valores del eje. Cards ordenan por `order_by` (default `created_at` desc). |
| 7 | **`KanbanAxis` shape** | TypeScript del shape: `id`, `label`, `field`, `values`, `column_labels`, `terminal_values?`, `order_by?`, `transitions[]`. |
| 8 | **Ejes redefinibles** | Un módulo declara múltiples ejes; usuario elige cuál ver. `<AxisSelector>` en la actions area de L1, junto al `<ViewToggle>`. Cambiar el eje no cambia el record set ni los filtros. |
| 9 | **Drag-drop como invocación al motor** | `KanbanTransition` declara `{from, to, action_id}` referenciando una acción `record_mutation` del manifest. **El eje no duplica `mode`, `closeAction`, capabilities ni `on_confirm` — todo eso vive en la acción del manifest, única fuente de verdad.** Flujo: drop → busca transición → consulta motor → si disabled, toast con reason; si habilitada y declara dialog, abre `<ClosureModal>`; si habilitada sin dialog, ejecuta `on_confirm` directo + toast. |
| 10 | **`<ClosureModal>` shared** | Wrapper temático del `<ManifestDialog>` con header y copy específicos para cierre (ej: "Cerrar Solicitud", "Resolver alerta", "Emitir factura"). Misma mecánica de campos, validación, footer, persistencia. Backdrop NO cierra el modal — cierre intencional. Reutilizable en Inbox, Alertas categoría `workflow`, cualquier transición con dialog. |
| 11 | **Universalidad del `⋯` + Cards no draggables** | Las cards del Kanban renderizan `<ManifestActionsMenu>` igual que rows y cards. Drag-drop y menú son rutas equivalentes (difieren solo en `invocation_source`). Cards no draggables cuando (a) estado en `terminal_values[]` o (b) motor reporta todas las transiciones disabled. |
| 12 | **Cap blando + Empty states + Performance** | Cap blando 200 cards/columna en V1 (virtualización es V2). Empty state por columna: "Sin registros en este estado" (columna no se colapsa). Performance: render del Tablero con 500 cards / 5 columnas FMP < 1 s. Cambio de vista < 200 ms. |

## Bloque 2 — REQ-71 INBOX (Centro de Solicitudes)

### Conceptos clave que deben quedar

1. **"Centro de Solicitudes" como umbrella** — denominación universal vinculante para todas las apps. La UI muestra dos categorías diferenciadas (Solicitudes / Tareas) bajo motor único.
2. **Principio arquitectónico: capacidades, no rutas** — Un CTA externo invoca una **capacidad** del `target_app`, no una ruta de ejecución específica. La capacidad decide internamente si la ejecuta vía integración directa (no toca el Centro, resultado inmediato) o si crea una Solicitud/Tarea en el Centro (resultado eventual). El CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado" al usuario externo. **Habilita el Wizard of Oz arquitectónico:** lanzar un producto con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación en código, no de discovery.
3. **Scope explícito** — el Centro aterriza **solo Solicitudes/Tareas que requieren intervención humana del backoffice**. Jobs programáticos puros (sync, audit, normalización, cron internos) viven en código como Task Definitions de Tecnología, fuera del Centro. Intersección: un job programático puede declarar **fallback opt-in al Centro** al fallar.
4. **Solicitud vs Tarea — discriminador `type`** — Solicitud (`type: 'solicitud'`) = pedido de algo, típicamente con componente de decisión (vocabulario: aprobar/rechazar). Tarea (`type: 'tarea'`) = pedido de ejecución de acciones concretas (vocabulario: completar/cancelar). La mecánica subyacente es **idéntica** — solo cambia el vocabulario de los `closeActions` y opcionalmente los labels de los estados (`state_labels`).
5. **Inbox vs Alertas** — Inbox modela **pedidos** (humanos o de sistemas que hacen falta que alguien atienda). Alertas (REQ-73) modela **detecciones sistémicas** (condiciones del dominio detectadas algorítmicamente). Si el origen es un pedido → Inbox; si es detección algorítmica → Alertas. Comparten infraestructura.
6. **Una Solicitud no es un registro pasivo** — es un espacio de trabajo que puede triggerear acciones automáticas al caer al Inbox + habilitar CTAs invocables en el Drawer + cerrar con un `closeAction` justificado.
7. **Set canónico de 4 estados** — `pendiente`, `en_proceso`, `completed`, `rejected`. Dos terminales diferenciadas. Mecánica invariante. `state_labels` permite override **visual** de los labels, no de la mecánica.
8. **Asignación manual (`assignee`)** — opcional, editable en cualquier estado no terminal, **independiente del `owner`**. Setable al crear o posteriormente vía CTA "Asignar/Reasignar/Liberar". Routing prioriza `assignee` sobre `target_role` sobre app entero.
9. **Cuatro caminos de creación** — (a) manual desde otra app del core, (b) manual desde el propio módulo Inbox (cuando el tipo declara `creable_manualmente: true`), (c) automática vía API (con identidad del invocador; cubre escalamiento de jobs programáticos con `source_app: 'system'`), (d) automática recurrente (scheduler del Inbox sobre `RecurringInboxItemDefinition`).
10. **Triggers automáticos al crear (`triggers_on_create`)** — acciones del manifest del módulo destino con `invocation_source: 'inbox_trigger'`.
11. **CTAs en el Drawer (`available_actions`)** — acciones del manifest del módulo destino con `invocation_source: 'inbox_drawer_cta'`. Se renderizan filtradas por capability del usuario.
12. **`<ClosureModal>` con `closeActions` por tipo** — radio buttons con opciones válidas + comentario obligatorio ≥ 10 chars. El `closeAction` elegido determina el estado terminal.
13. **API de ingesta cross-app** — endpoint único. Cualquier backend del core o sistema externo emite Solicitudes/Tareas con su identidad. Patrón de consumo, no mecanismo aparte.
14. **Notificaciones in-app primarias** — badge en sidebar (mandatorio, real-time, prioriza `assignee` → `target_role` → app entero) + Web Notifications API (opt-in). Email y Slack opcionales declarables por tipo.
15. **Series recurrentes (`RecurringInboxItemDefinition`)** — entidad separada del modelo del Inbox que declara series con cadencia + payload template + `default_assignee` + `series_state`. El scheduler del Inbox genera **instancias** independientes (`Solicitud<TPayload>` con `recurring_definition_id`) en cada ciclo. Cada instancia tiene su lifecycle propio; instancias incompletas no bloquean siguientes.
16. **Hoy ningún tipo ni serie está definido** — este REQ entrega el Centro como infraestructura. Las áreas darán de alta sus tipos y series progresivamente vía flujo formal (V1).

### Detalles técnicos clave

```typescript
type InboxType  = 'solicitud' | 'tarea';
type InboxState = 'pendiente' | 'en_proceso' | 'completed' | 'rejected';

interface Solicitud<TPayload = unknown> {
  id: string;
  concept: string;                    // clasificador de negocio — clave en INBOX_TYPES del target_app
  type: InboxType;                    // discriminador Solicitud/Tarea, derivado de InboxTypeConfig.type
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
  recurring_definition_id?: string;   // si es instancia de una serie recurrente
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
  payload?: Record<string, unknown>;
}

interface InboxTypeConfig {
  concept: string;                                // clave de negocio (ej: 'aprobacion_pago')
  type: InboxType;                                // mandatorio — 'solicitud' o 'tarea'
  label: string;
  target_app: string;
  target_role?: string;
  payload_schema: JSONSchema;
  sla_hours?: number;
  creable_manualmente?: boolean;                  // default false
  manual_creation_capability?: string;            // requerida para creación manual desde UI Inbox
  closeActions: CloseAction[];                    // al menos uno
  triggers_on_create?: TriggerSpec[];             // acciones del manifest + payload_mapping
  available_actions?: ActionSpec[];               // CTAs en el Drawer + enable_when
  push_notification?: {
    browser?: { enabled: boolean };
    email?: { enabled: boolean; recipients?: string[] };
    slack?: { enabled: boolean; channel: string; mention?: string };
  };
  auto_archive?: {
    condition_ref: string;
    closure_action: string;
  };
  state_labels?: Partial<Record<InboxState, string>>;
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

### Ejemplos del patrón

| Concept | `type` | Origen → Destino | Wizard of Oz? | Trigger al crear | CTAs en Drawer | closeActions típicos |
|---|---|---|---|---|---|---|
| `withdrawal_request` | `solicitud` | CLP → OPS | Sí — OPS decide si lo ejecuta directo o crea Solicitud en el Centro | Crear Movimiento Withdrawal en `borrador` | Validar whitelist, Ejecutar retiro | Aprobado y procesado / Rechazado |
| `extract_request` | `solicitud` | CLP → OPS | Sí — OPS puede ejecutarlo directo si el reporte es trivial | Generar reporte (REQ-59) | Reenviar al cliente, Regenerar | Enviado / Cancelado |
| `kyc_review` | `solicitud` | CLP → LEX | Sí — LEX puede aprobar automáticamente si supera score | Crear ticket de revisión, vincular doc | Aprobar KYC, Solicitar documentación | Aprobado / Rechazado |
| `manual_load_approval` | `solicitud` | OPS → FIN | No — siempre humano | — | Validar carga, Generar asiento | Aprobado / Devuelto |
| `daily_reconciliation` | `tarea` | system (recurrente) → OPS | No — trabajo humano por definición | — | Confirmar conciliación, Reportar diferencias | Hecha / Con diferencias |
| `monthly_nostros_review` | `tarea` | system (recurrente) → FIN | No — trabajo humano por definición | — | Validar Nostros, Reportar matching | Revisada / Pendiente cierre |
| `report_dependency_block` | `tarea` | system (Reportes) → blocking_app | No — trabajo humano para destrabar dependencia | — | Auto-archive cuando dependencia se completa | dependency_completed (auto) |

**Importante:** estos son ilustrativos. Hoy ningún tipo ni serie está definido — las áreas los darán de alta progresivamente.

### Slides sugeridos REQ-71 (19 slides)

| # | Título | Contenido |
|---|---|---|
| 13 | **REQ-71 — Centro de Solicitudes** | Portada del bloque. |
| 14 | **El problema** | Hoy el trabajo operativo cae en Slack, mail, planillas, hilos sueltos. Sin owner formal, sin audit trail, sin closure justificado, sin posibilidad de invocar funcionalidad del sistema desde la conversación misma. Las áreas necesitan un estándar formal con audit trail nativo. |
| 15 | **"Centro de Solicitudes" — umbrella universal** | Denominación vinculante para todas las apps del core. UI muestra **dos categorías** (Solicitudes / Tareas) diferenciadas por `type` y label/badge. **El motor es uno solo** — la mecánica (estados, transiciones, audit trail, triggers, routing) es idéntica entre Solicitudes y Tareas. Lo que cambia es el vocabulario de los `closeActions` y opcionalmente los labels de los estados. |
| 16 | **Principio arquitectónico: capacidades, no rutas** | Un CTA externo (en CLP, Pago Directo, RFQ Gateway) invoca una **capacidad** del `target_app`, no una ruta de ejecución específica. La capacidad decide internamente cómo se ejecuta: integración directa (no toca el Centro, resultado inmediato) o crea Solicitud/Tarea en el Centro (resultado eventual; el CTA se suscribe al estado). **Wizard of Oz arquitectónico:** lanzar con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo. Ejemplo: usuario del CLP clickea "Retirar" → el CTA invoca `ejecutar_retiro` de OPS → OPS decide internamente si lo procesa vía integración directa o si crea Solicitud al Centro de OPS → el usuario del CLP no se entera del path. |
| 17 | **Scope explícito del Centro** | El Centro aterriza **solo Solicitudes/Tareas que requieren intervención humana del backoffice**. Lo que NO vive en el Centro: jobs programáticos puros (sync de registros, auditoría, depuración, normalización, cron jobs internos) — son infraestructura técnica que vive en código como Task Definitions de Tecnología. **Intersección:** un job programático puede declarar **fallback opt-in al Centro**; al fallar, si el fallback está habilitado, invoca el endpoint con `source_app: 'system'` y crea trabajo para escalamiento humano. Sin fallback declarado, el fallo dispara alerta vía Observabilidad sin tocar el Centro. |
| 18 | **Inbox vs Alertas — las dos patas de la comunicación operativa** | Inbox modela **pedidos** (humanos o de sistemas que hacen falta que alguien atienda). Alertas (REQ-73) modela **detecciones sistémicas** (condiciones del dominio detectadas algorítmicamente). Si el origen es un pedido (humano o automático) → Inbox. Si es una detección algorítmica del sistema sobre una condición del dominio → Alertas. Comparten infraestructura (`<Drawer>`, Timeline, Comments, motor de routing por `target_role`) pero modelos de datos y mecánicas distintas. |
| 19 | **Solicitud vs Tarea — discriminador `type`** | Tabla comparativa: Solicitud (`type: 'solicitud'`) = pedido de algo, típicamente con componente de decisión, vocabulario aprobar/rechazar/procesar (ej: solicitud de retiro, revisión KYC). Tarea (`type: 'tarea'`) = pedido de ejecución, típicamente sin decisión, vocabulario completar/cancelar (ej: conciliar movimientos del día, revisar Nostros del mes). **Mecánica idéntica.** Solo cambian `closeActions` por tipo y opcionalmente `state_labels`. Los filtros del Inbox permiten ver Solicitudes / Tareas / Todas. |
| 20 | **Una Solicitud/Tarea no es un registro pasivo** | Es un **espacio de trabajo**. Puede (a) triggerear acciones automáticas al caer al Inbox vía `triggers_on_create[]`, (b) habilitar CTAs invocables en el Drawer vía `available_actions[]`, (c) cerrar con un `closeAction` declarado por el tipo + comentario justificatorio. |
| 21 | **`Solicitud<TPayload>` shape** | TypeScript del shape canónico con `type`, `concept`, `assignee` (opcional, independiente del `owner`), `recurring_definition_id?` (cuando es instancia recurrente), `triggered_actions[]`, `timeline[]`, `comments[]`. |
| 22 | **Estados — set canónico de 4** | Tabla: `pendiente`, `en_proceso`, `completed`, `rejected`. Dos terminales diferenciadas (outcome positivo vs negativo). Estados terminales inmutables. Mecánica invariante. `state_labels` permite override visual de labels sin alterar mecánica (ej: una Tarea de conciliación puede mostrar "En curso" en lugar de "In Progress"). API y modelo de datos hablan en estados canónicos; UI usa label declarado. |
| 23 | **`InboxTypeConfig` shape** | TypeScript del shape: `concept`, `type` (mandatorio), `label`, `target_app`, `target_role?`, `payload_schema`, `sla_hours?`, `creable_manualmente?: boolean` (default false), `manual_creation_capability?`, `closeActions[]` con `terminal_state`, `triggers_on_create?`, `available_actions?`, `push_notification?` (browser/email/slack), `auto_archive?`, `state_labels?`. |
| 24 | **Asignación manual (`assignee`) — independiente del `owner`** | Tabla: `assignee` = a quién está dirigida (puede setearse al crear o después, opcional); `owner` = quién la está trabajando ahora (auto-asignado en `en_proceso`). Editable en cualquier estado no terminal vía CTA **"Asignar/Reasignar/Liberar"** (acción del manifest, REQ-68). Cualquier usuario con capability de gestión del Inbox del `target_app` puede asignar. Cada cambio registra `TimelineEvent { kind: 'assigned', by, payload: { previous_assignee, new_assignee } }`. **Priorización de notificaciones:** `assignee` definido → solo ese usuario recibe el highlight. Sin `assignee` con `target_role` → usuarios con la capability del `target_role`. Sin `assignee` ni `target_role` → usuarios con capability genérica de Inbox del `target_app`. |
| 25 | **Cuatro caminos de creación** | Tabla: (a) **Manual desde otra app del core** — módulo invoca el endpoint con identidad del usuario (ej: CLP genera withdrawal_request a OPS). (b) **Manual desde el propio módulo Inbox** — CTA "Crear Solicitud/Tarea" filtrado a tipos con `creable_manualmente: true`, requiere `manual_creation_capability`. (c) **Automática vía API** — backend del core o sistema externo invoca con su identidad; cubre escalamiento de jobs programáticos que declaran fallback opt-in al Centro (con `source_app: 'system'`). (d) **Automática recurrente** — scheduler del Inbox dispara instancias según `RecurringInboxItemDefinition` con `series_state: 'active'`. En todos los casos: validación de `type` en registry del `target_app`, derivación de `type`, persistencia con `state: 'pendiente'`, ejecución de `triggers_on_create[]`, disparo de notificaciones. |
| 26 | **Triggers automáticos al crear (`triggers_on_create[]`)** | Al persistirse la Solicitud/Tarea, el sistema dispara las acciones declaradas **antes de notificar**. Son acciones del manifest del módulo destino (REQ-68) con `invocation_source: 'inbox_trigger'` y `payload_mapping` desde el payload de la Solicitud al input de la acción. Status y `result_ref` quedan registrados en `triggered_actions[]` y se muestran en el panel correspondiente del Drawer. Ejemplo: `extract_request` triggerea generación del reporte vía REQ-59; `withdrawal_request` crea Movimiento Withdrawal en `borrador` pre-vinculado. Las Tareas pueden no tener triggers — la Tarea misma ES el trabajo. |
| 27 | **CTAs en el Drawer (`available_actions[]`)** | Al abrir el `<Drawer>`, se renderizan los CTAs declarados que el usuario actual tiene capability para invocar (motor evalúa `enable_when` vía REQ-68). Cada CTA es una acción del manifest del módulo destino con `invocation_source: 'inbox_drawer_cta'`. Ejemplos: "Validar whitelist", "Ejecutar retiro", "Generar asiento contable". Las transiciones de estado (`tomar`, `liberar`, `resolver`) también son acciones del manifest. |
| 28 | **Tabla de ejemplos del patrón completo** | Tabla con 6-7 tipos ilustrativos: `withdrawal_request` (solicitud, Wizard of Oz), `extract_request` (solicitud, Wizard of Oz), `kyc_review` (solicitud), `manual_load_approval` (solicitud), `daily_reconciliation` (tarea recurrente), `monthly_nostros_review` (tarea recurrente), `report_dependency_block` (tarea con auto_archive). Columnas: Concept, type, Origen → Destino, Wizard of Oz?, Trigger al crear, CTAs en Drawer, closeActions. **Aclarar:** ilustrativos. Hoy ningún tipo está definido — las áreas los darán de alta progresivamente. |
| 29 | **API de ingesta + motor de routing** | Endpoint único del core consumible desde el backend de cualquier app o sistema externo, **y desde la UI del propio Inbox** vía el CTA manual. Input: `{ concept, source_app, source_module, target_app, target_role?, assignee?, sla_hours?, due_at?, payload, recurring_definition_id? }` + identidad del invocador (Auth0 o credencial de sistema). Comportamiento: valida `concept` en registry de `INBOX_TYPES` del `target_app`, deriva `type` del registry, persiste con `state: 'pendiente'`, ejecuta `triggers_on_create[]`, dispara notificaciones. Motor de routing por `target_role` consumiendo capability provider de REQ-68. Compartido con REQ-73. |
| 30 | **Notificaciones in-app primarias** | El Centro es destino primario obligatorio. Sobre eso: **Badge en sidebar** (mandatorio, real-time). Contador de no revisadas dirigidas al usuario actual con priorización `assignee` → `target_role` → app entero. Click navega con filtro "Pendientes mías". **Notificación del navegador** (opt-in, Web Notifications API) cuando una Solicitud/Tarea cae al Inbox del usuario con la app abierta en otra pestaña. **Email** (opcional por tipo, `push_notification.email.enabled: true`). **Slack** (opcional por tipo, `push_notification.slack.enabled: true`). El mensaje en Slack es solo aviso — gestión siempre in-app. Otros canales (MS Teams, SMS, WhatsApp, push nativo móvil) → V2. |
| 31 | **Series recurrentes (`RecurringInboxItemDefinition`)** | Casos típicos: `daily_reconciliation` para OPS; `monthly_nostros_review` para FIN; `weekly_offsite_backup` cada lunes. Se modela como **serie recurrente** declarada (`RecurringInboxItemDefinition`) que genera **instancias** según una cadencia. **Modelo serie ↔ instancia:** la serie es la definición; las instancias son `Solicitud<TPayload>` individuales con `recurring_definition_id`, lifecycle propio, `owner` propio, `closure_action` propio. **Cada instancia es independiente** — la del día X que no se completó a tiempo no bloquea la del día X+1; coexisten en el Inbox. **Scheduler del Inbox:** job periódico que identifica definiciones `active` cuya `next_creation_date` venció, invoca el endpoint con `source_app: 'system'`, `recurring_definition_id`, `default_assignee` y demás campos declarados, actualiza `next_creation_date`. Estados de la serie: `active` / `paused` / `archived`. **Dependencias liberadas por completitud:** consumidores externos (Reportes, otras Tareas) pueden declarar dependencias contra `recurring_definition_id`; al completarse una instancia, se libera la dependencia. Ejemplo: reporte de UIF depende de `daily_reconciliation` del día previo. |

## Slide de cierre (común a ambos bloques)

| # | Título | Contenido |
|---|---|---|
| 32 | **Q&A — Vistas + Inbox** | Preguntas sobre ambos REQs juntos. Conexión entre los dos: Inbox declara `views: ['list', 'kanban']` (default Kanban), las transiciones del Kanban son acciones del manifest, el `<ClosureModal>` shared se reutiliza. |

## Speaker notes / puntos a enfatizar

- Slide 9 (drag-drop como invocación): este es el punto donde la integración entre REQ-69 y REQ-68 se vuelve concreta. Si lo aterrizan, entienden el modelo conceptual unificado capa 1 del paradigma.
- Slide 10 (`<ClosureModal>`): insistir en que es el mismo `<ManifestDialog>` con header distinto. No es un componente nuevo, es una variante temática.
- Slide 16 (capacidades, no rutas): este es el punto más transformador a nivel de cómo se conciben los productos. Tomarse tiempo. El ejemplo del CLP/retiro debe quedar muy claro. La consecuencia operativa más concreta — lanzar con ejecución 100% humana desde día uno — vale destacarla porque cambia la planificación de roadmap.
- Slide 17 (scope explícito): explicar que el Centro NO es para todo lo que un sistema pueda hacer automatizado. Solo lo que requiere intervención humana. Los jobs programáticos puros son Task Definitions de Tecnología.
- Slide 19 (Solicitud vs Tarea con `type`): la distinción es **semántica y de presentación**, no de mecánica. Si los devs entienden que es el mismo motor con un campo discriminador, no hay riesgo de que reimplementen mecanismos paralelos.
- Slide 20 (una Solicitud no es un registro pasivo): este es el insight central de REQ-71 conceptualmente. Antes lo era; ahora es un espacio de trabajo activo.
- Slide 24 (`assignee` vs `owner`): la diferencia es la pregunta más frecuente que va a aparecer. Aterrizarla con ejemplo: yo te asigno una Solicitud (`assignee = Mauro`) pero Mauro está de viaje, así que Belén la toma (`owner = Belén`). Ambos datos quedan registrados.
- Slide 25 (4 caminos de creación): aclarar que los 4 caminos pasan por el mismo endpoint — varían en identidad del invocador y origen, no en mecanismo.
- Slide 28 (tabla de ejemplos): aclarar varias veces que los tipos son ilustrativos. Hoy ningún tipo está definido. Es importante para que las áreas no asuman que ya tienen su Inbox configurado.
- Slide 31 (series recurrentes): el concepto serie ↔ instancia es contraintuitivo. Insistir en que **cada instancia es independiente** — no es "una tarea que se reprograma", son N tareas con la misma plantilla.

---

# Sesión 4 — REQ-73 ALERTAS + REQ-59 REPORTES

## Objetivo

Cubrir los dos módulos genéricos que cierran el set de gestión operativa. **REQ-73 ALERTAS** entrega el Centro de Alertas con 4 categorías (`triage`, `workflow`, `metric`, `cross_app_panel`) y mecanismo de notificación push opcional. **REQ-59 REPORTES** entrega el servicio transversal del core para reportes regulatorios/contables/operativos/internos con `ReportPermissions` de 4 niveles, bifurcación por `allows_auto_generation` ante dependencias incompletas, y coordinación inter-área a través de **Tareas al Inbox** (no Alertas) para el mecanismo `REPORT_DEPENDENCY`.

Que los devs salgan entendiendo (a) las 4 categorías de Alertas y qué UI canónica activa cada una, (b) capacidades opcionales declarables por `ALERT_TYPE`, (c) el modelo de `ReportPermissions`, (d) la bifurcación por `allows_auto_generation` en el endpoint de Reportes, (e) el mecanismo `REPORT_DEPENDENCY` como Tarea al Inbox del `blocking_app` (con `auto_archive`), (f) los eventos sistémicos de Reportes hacia Alertas, (g) el scheduler de CRON, (h) los flujos de alta para nuevos tipos.

## Duración

≈ 75 min de exposición + 15 min de Q&A. **Slides recomendados: 31** (14 para REQ-73 + 16 para REQ-59 + 1 cierre).

## Mensaje central

> Alertas tiene 4 categorías que activan exactamente una UI canónica cada una — los tipos las declaran al darse de alta. Reportes tiene control de acceso por capabilities en 4 niveles independientes + bifurcación de comportamiento ante dependencias incompletas según `allows_auto_generation`. Ambos consumen el capability provider de REQ-68. **El mecanismo `REPORT_DEPENDENCY` se modela como Tarea al Inbox del `blocking_app` con `auto_archive` (no como Alerta)** — es un pedido al área de que complete la dependencia para destrabar la generación, lo cual es naturalmente trabajo del Inbox. Reportes invoca su propia capacidad (no su ruta) y decide internamente si genera con datos parciales + Alerta al consumidor, o si bloquea + Tarea al `blocking_app`.

## Bloque 1 — REQ-73 ALERTAS

### Conceptos clave que deben quedar

1. **El gap que cubre** — gestión formal de alertas para el backoffice, con audit trail nativo, asignación formal a responsables, documentación del tratamiento, cierre justificado y base consultable para reportería. Reemplaza Slack (no apto para gestión formal) y Grafana (diseñado para devs, no para backoffice). No los reemplaza como canales — los complementa.
2. **Componente regulatorio** — varias entidades del grupo están en falta de cumplimiento normativo por no contar con un sistema formal de gestión de alertas con trazabilidad para UIF, BCRA, CNV, FATF.
3. **Slack como notificación push opcional** — capacidad declarable por `ALERT_TYPE`. La gestión ocurre siempre en el Centro; Slack es solo aviso con link directo.
4. **4 categorías canónicas (fijas)** — `triage`, `workflow`, `metric`, `cross_app_panel`. Cada `ALERT_TYPE` declara su categoría al darse de alta; la categoría determina automáticamente UI canónica + lifecycle + capacidades opcionales aplicables.
5. **Caso paradigmático de categoría `workflow`** — anomalías operacionales con postmortem. Una anomalía operativa (degradación de servicio, error de conciliación masivo, comportamiento inesperado de un proveedor) se trabaja con asignación + Drawer + Timeline + Comments + `<ClosureModal>` con justificación. La alerta cerrada queda como base de conocimiento.
6. **Capacidades opcionales por tipo** — severidad, asignación a usuario/área, Drawer + timeline, comentarios, `<ClosureModal>`, auto-cierre, filtros del histórico, KPIs en L2, Tablero (Kanban), chart-first surface, cross-app filters, push notifications.
7. **`REPORT_DEPENDENCY` ya NO vive en Alertas** — se modela como **Tarea al Inbox** del `blocking_app` con `auto_archive` (REQ-71 + REQ-59). Alertas sigue recibiendo de Reportes otros eventos sistémicos del propio reporte (`reporte_vencido`, `reporte_error_generacion`, `reporte_emitido_automaticamente`, `reporte_dependencias_incompletas`, `reporte_proximo_emision_auto`).
8. **REQ-52 + REQ-33 desbloqueados** — eran pedidos pendientes de Centro de Alertas para LEX y TRD, bloqueados por falta de infra. Con REQ-73 dejan de ser proyectos de infraestructura y pasan a ser configuración del estándar.
9. **API de ingesta cross-app** — endpoint del core consumible desde cualquier backend del core o sistema externo. Una alerta = un `target_app`.
10. **Flujo de alta de nuevos `ALERT_TYPE`s** — V1 manual con formato estándar; V2 evaluable (IA Playground).

### Detalles técnicos clave

```typescript
type AlertCategory = 'triage' | 'workflow' | 'metric' | 'cross_app_panel';

type AlertState =
  | 'new'
  | 'in_review'
  | 'resolved'
  | 'dismissed'
  | 'auto_resolved';

interface Alerta<TPayload = unknown> {
  id: string;
  type: string;
  category: AlertCategory;
  state: AlertState;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  source_app: string;
  source_module: string;
  payload: TPayload;
  assignee_id?: string;
  assigned_at?: number;
  assigned_team?: string;
  closed_at?: number;
  closed_by?: string;
  closure_comment?: string;
  closure_action?: string;
  auto_resolved_reason?: string;
  timeline: TimelineEvent[];
  comments: Comment[];
  created_at: number;
  last_event_at: number;
}
```

### Tabla de categorías

| Categoría | Naturaleza | UI canónica | Estados |
|---|---|---|---|
| `triage` | Active triage list. Resolver = un click. | Lista tipo Inbox sin owner/SLA | `new → resolved` (manual) o `auto_resolved` |
| `workflow` | Master-detail con Drawer + Timeline + Comments. Trámite formal. | Tablero Kanban + `<ClosureModal>` con justificación ≥10 chars | `new → in_review → resolved/dismissed` |
| `metric` | Time-series con threshold. Auto-resolución. | Chart-first con thresholds overlaid | `new → auto_resolved` |
| `cross_app_panel` | Cross-app KPI dashboard (read-only). | KPI cards por app de origen + cross-app filters | No se "resuelve" individualmente |

### Ejemplos de `ALERT_TYPE`s por categoría

| Categoría | Ejemplos | Por qué encaja |
|---|---|---|
| `triage` | `deposit_unidentified` (OPS), `reporte_vencido` (cualquier app), `low_balance` (FIN/OPS), `reporte_dependencias_incompletas` (consumidor de un reporte) | Avisos donde "atender" es un acto rápido, no un proceso. |
| `workflow` | `kyc_match` (LEX), `operational_anomaly`, `manual_load_review` (FIN) | Trámite formal con asignación, debate, justificación. |
| `metric` | `spread_anomaly` (TRD), `provider_latency_spike`, `error_rate_spike` | Métrica que cruzó un umbral; resolución algorítmica cuando vuelve. |
| `cross_app_panel` | `limit_utilization_dashboard` (TRD+FIN), `group_exposure_panel` (TRD+LEX+FIN), `alerts_meta_panel` | Panel agregado, no eventos individuales. |

### Slides sugeridos REQ-73 (14 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-73 — Centro de Alertas** | Portada del bloque. |
| 2 | **El problema** | Hoy las alertas llegan a Slack (sin trazabilidad estructurada, sin owner formal, sin audit trail) y a Grafana (diseñado para devs, no para backoffice). Las áreas no operan en Grafana; necesitan un sistema con su lenguaje, sus flujos, su modelo de tratamiento. |
| 3 | **Componente regulatorio** | Varias entidades del grupo están en falta de cumplimiento normativo por no contar con un sistema formal de gestión de alertas con trazabilidad, owner asignado, estados de progresión y cierre auditado. Slack y Grafana no satisfacen los requisitos de governance que cada entidad debe acreditar ante su regulador (UIF, BCRA, CNV, FATF). |
| 4 | **Slack como complemento opcional** | El Centro de Alertas es el destino primario obligatorio. Slack queda como notificación push opcional declarable por `ALERT_TYPE` — la app de Slack notifica al usuario por comodidad con link directo a la alerta. La gestión, trámite, asignación, cierre y audit ocurren siempre en el Centro. |
| 5 | **4 categorías canónicas (fijas)** | `triage`, `workflow`, `metric`, `cross_app_panel`. Cada `ALERT_TYPE` declara su categoría al darse de alta; la categoría determina UI canónica + lifecycle + capacidades opcionales. Las 4 son fijas — no se inventan nuevas. |
| 6 | **Tabla de categorías × UI canónica** | Tabla con las 4 categorías, naturaleza, UI canónica, estados aplicables. |
| 7 | **Ejemplos por categoría** | Tabla con ejemplos concretos: `kyc_match` (workflow), `spread_anomaly` (metric), `deposit_unidentified` (triage), `limit_utilization_dashboard` (cross_app_panel). |
| 8 | **Caso paradigmático — `workflow` con postmortem** | Una anomalía operativa (degradación de servicio, error de conciliación masivo, comportamiento inesperado de un proveedor) se registra como `category: 'workflow'` con severidad alta. Equipo asignado la trabaja en Timeline, debate hipótesis en Comments, al cerrar documenta postmortem en `<ClosureModal>` (qué pasó, qué causó, qué se hizo, qué medidas preventivas). La alerta cerrada queda en el repositorio como base de conocimiento. |
| 9 | **`Alerta` shape** | TypeScript del shape: `id`, `type`, `category`, `state`, `severity?`, `source_app`, `source_module`, `payload`, `assignee_id?`, `closure_*`, `auto_resolved_reason?`, `timeline[]`, `comments[]`. |
| 10 | **`AlertTypeConfig` + capacidades opcionales** | Shape del registry + tabla de capacidades opcionales por tipo (severidad, asignación a usuario, asignación a área, Drawer + timeline, comentarios, `<ClosureModal>`, auto-cierre, filtros, KPIs L2, Tablero, chart-first, cross-app filters, push notifications). |
| 11 | **Eventos sistémicos de Reportes hacia Alertas** | Reportes (REQ-59) emite varios `ALERT_TYPE`s al Centro de Alertas (sin invocar Tareas — eso queda para `REPORT_DEPENDENCY`, slide 12). Tabla: `reporte_proximo_emision_auto` (cuando `allows_auto_generation: true` y la fecha se acerca) → categoría `triage` informativa al consumidor. `reporte_vencido` (la fecha pasó sin generación exitosa) → `triage`. `reporte_emitido_automaticamente` (CRON ejecutó exitosamente) → `triage` informativa. `reporte_error_generacion` (falla en generación automática) → `triage` con severidad. `reporte_dependencias_incompletas` (generó con `dependencies_unmet[]` poblado) → `triage` al consumidor con `report_run_id` y snapshot de dependencias incompletas. La lista no es exhaustiva — cualquier evento sistémico relevante puede modelarse como nuevo `ALERT_TYPE`. |
| 12 | **`REPORT_DEPENDENCY` — NO vive en Alertas, vive en el Inbox** | **Cambio de modelado:** la coordinación inter-aplicación cuando un reporte tiene una dependencia bloqueante en otra app **se modela como Tarea al Centro de Solicitudes del `blocking_app` con `auto_archive`**, NO como Alerta. Razón: es un pedido al área del `blocking_app` de que complete trabajo concreto para destrabar la generación — eso es naturalmente Tarea (REQ-71), no Alerta. **Flujo end-to-end (vista desde Alertas):** Alertas NO interviene en el flujo de `REPORT_DEPENDENCY`. Sí interviene cuando el reporte genera de todos modos con `dependencies_unmet[]` (emite Alerta `reporte_dependencias_incompletas` al consumidor — slide 11). El detalle del mecanismo `REPORT_DEPENDENCY` se profundiza en el bloque de REQ-59. |
| 13 | **API de ingesta + Naturaleza del servicio** | Endpoint `POST /alertas` consumible desde cualquier backend autenticado. Backend transversal + UI por app. Una alerta = un `target_app` (categoría `cross_app_panel` agrega cross-app en orientación, no en gestión). |
| 14 | **Flujo de alta de nuevos `ALERT_TYPE`s (V1)** | Análogo a otros. Campos obligatorios: identificador (`type`), app target, categoría, payload, severidades, `closeActions` (cuando `workflow`), routing por `target_role`, capacidades opcionales, reglas de detección, política de push notification. Producto valida coherencia. Tecnología implementa la regla de detección + registra el tipo. Deploy. **REQ-52 + REQ-33 desbloqueados:** ya existen en Jira como pedidos pendientes de Centro de Alertas para LEX y TRD; con REQ-73 entregado, dejan de ser proyectos de infraestructura y pasan a ser configuración del estándar consumiendo este REQ. Vinculados via `is caused by`. |

## Bloque 2 — REQ-59 REPORTES

### Conceptos clave que deben quedar

1. **Reportes es un servicio transversal del core** — no un módulo de un app específico. Cualquier app del grupo lo consume declarando los reportes que expone en `consumer_apps[]`.
2. **Separación definición / ejecución** — la definición (qué reporte es, qué normativa, qué periodicidad, qué formato, qué `permissions`) es ownership del área. La ejecución técnica (`generator_ref`) es ownership de Tecnología; se implementa una vez y queda invocable desde cualquier app consumidora.
3. **`consumer_apps[]` vs `permissions` son ortogonales** — `consumer_apps[]` define **dónde aparece** (qué apps lo listan); `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar dentro de esas apps.
4. **`ReportPermissions` con 4 niveles independientes** — `view`, `execute`, `edit`, `delete`. Un usuario puede tener `view` sin `execute`, o `edit` sin `delete`. Separación de responsabilidades realista.
5. **Default seguro** — si `permissions` no se declara, solo creador + `ADMIN_GROUP` tienen las 4 capacidades. Reporte invisible para el resto.
6. **Capabilities referenciadas son las de REQ-68** — misma fuente de verdad. El capability provider resuelve `user_id → capabilities[]`.
7. **Principio "capacidades, no rutas" aplicado a Reportes** — el invocador del endpoint no decide la ruta de ejecución del reporte. El servicio decide internamente, según el estado del catálogo y las dependencias, qué camino tomar (4 rutas internas).
8. **Bifurcación por `allows_auto_generation` ante dependencias incompletas** — `true` = genera con datos parciales, persiste `ReportRun` con `dependencies_unmet[]`, emite Alerta al consumidor + Tarea al `blocking_app`. `false` = no genera, emite solo Tarea al `blocking_app` (`dependencies_pending` sin `ReportRun`).
9. **Endpoint único de generación** — invocable desde el backend de cualquier app o sistema autenticado.
10. **Scheduler de CRON** — job periódico que consulta el catálogo, identifica reportes auto-generables, verifica `dependencies[]`, invoca el endpoint con identidad de sistema, persiste `ReportRun`, emite eventos al Inbox (Tareas) y al Alertas (Alertas) correspondientes.
11. **Mecanismo `REPORT_DEPENDENCY` — Tarea al Inbox del `blocking_app` con `auto_archive`** — flujo end-to-end de coordinación inter-aplicación. Razón del modelado como Tarea (no Alerta): es un pedido de completar trabajo concreto, no una condición detectada.
12. **Persistencia de ejecuciones (`ReportRun`)** — inmutables, re-descargables hasta vencimiento de `retention_policy`. Pueden tener `dependencies_unmet[]` poblado cuando se generaron con dependencias incompletas. Al vencer: `retention_expired: true`, 404 controlado, metadata preservada.
13. **`recurring_definition_id` en `ReportDependency`** — cuando la dependencia es una instancia específica de una serie recurrente del Inbox (REQ-71 §14), se referencia por el ID de la definición. Permite vincular reportería regulatoria con tareas operativas recurrentes (ej: reporte UIF depende de `daily_reconciliation` del día previo).
14. **Reportes cross-app y headless** — `consumer_apps[]` puede tener múltiples apps; headless tiene `consumer_apps[]` vacío.
15. **V2 sujeta a viabilidad (no commitment)** — IA Playground + Builder visual + Marketplace. Exploración futura. V1 (flujo formal de alta) cubre todas las necesidades del catálogo.

### Detalles técnicos clave

```typescript
interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  consumer_apps: ConsumerAppRef[];   // dónde aparece; vacío = headless
  ruling_entity?: string;
  regulation?: string;
  periodicity?: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'ad_hoc';
  next_emission_date?: number;
  alert_anticipation_days?: number;
  format: 'PDF' | 'XLSX' | 'CSV';
  generator_ref: string;
  retention_policy: RetentionPolicy;
  params: Record<string, unknown>;
  allows_auto_generation: boolean;
  dependencies?: ReportDependency[];
  cron_enabled?: boolean;
  cron_active?: boolean;
  locked?: boolean;
  locked_reason?: string;
  permissions: ReportPermissions;
  state: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

interface RetentionPolicy {
  duration: string;                                   // '10y' | '5y' | '2y' | '1y' | '6m' | ...
  category: 'regulatorio' | 'contable' | 'operativo' | 'interno';
  legal_basis?: string;                               // mandatorio para regulatorio/contable
}

interface ReportDependency {
  blocking_app: string;
  blocking_module: string;
  blocking_state: string;
  sla_days_before?: number;
  completed: boolean;
  completed_at?: number;
  recurring_definition_id?: string;                   // cuando es instancia específica de serie recurrente del Inbox (REQ-71 §14.5)
}

interface ReportPermissions {
  view: string[];      // capability IDs que pueden ver el reporte en el catálogo
  execute: string[];   // capability IDs que pueden ejecutar manualmente o programar
  edit: string[];      // capability IDs que pueden modificar la definición
  delete: string[];    // capability IDs que pueden archivar/eliminar el reporte
}

interface ReportRun {
  id: string;
  report_id: string;
  requested_at: number;
  completed_at?: number;
  status: 'ok' | 'error' | 'pending';
  params: string;
  trigger: { type: 'cron' } | { type: 'manual'; user_id: string } | { type: 'system' };
  output_url?: string;
  error_message?: string;
  retention_expired?: boolean;
  dependencies_unmet?: ReportDependencySnapshot[];    // dependencias incompletas al momento de generar
}

interface ReportDependencySnapshot {
  blocking_app: string;
  blocking_module: string;
  blocking_state: string;
  recurring_definition_id?: string;
}
```

### Las 4 rutas internas del servicio (principio "capacidades, no rutas" aplicado)

| Caso | Condiciones | Ruta interna del servicio | Persistencia | Eventos |
|---|---|---|---|---|
| **Ejecución programática feliz** | CRON sin dependencias bloqueantes, `allows_auto_generation: true` | Invoca `generator_ref`, persiste `ReportRun` | `ReportRun` con `status: 'ok'`, sin `dependencies_unmet` | Alerta `reporte_emitido_automaticamente` |
| **Generación con datos parciales** | Dependencias incompletas, `allows_auto_generation: true` | Invoca `generator_ref` con datos disponibles | `ReportRun` con `dependencies_unmet[]` poblado | Alerta `reporte_dependencias_incompletas` al consumidor + Tarea `report_dependency_block` al `blocking_app` |
| **Bloqueo con escalamiento humano** | Dependencias incompletas, `allows_auto_generation: false` | NO genera | Sin `ReportRun` (`dependencies_pending`) | Tarea `report_dependency_block` al Inbox del `blocking_app` |
| **Ejecución manual próxima a emisión** | Próximo a emitir, `allows_auto_generation: false` | NO genera | — | Tarea `reporte_proximo_emision_manual` al Inbox del responsable |

### Slides sugeridos REQ-59 (16 slides)

| # | Título | Contenido |
|---|---|---|
| 15 | **REQ-59 — Reportes** | Portada del bloque. |
| 16 | **Reportes como servicio transversal del core** | No es un módulo de un app específico. Cualquier app del grupo lo consume declarando en `consumer_apps[]`. Reportes regulatorios, internos, operativos, contables. |
| 17 | **Separación definición / ejecución** | Definición (qué reporte, qué normativa, qué periodicidad, qué formato, qué `permissions`) = ownership del área. Ejecución técnica (`generator_ref`) = ownership de Tecnología; se implementa una vez y queda invocable. |
| 18 | **`Report` shape** | TypeScript del shape canónico completo: `consumer_apps`, `retention_policy` (con `category` + `legal_basis`), `dependencies` (con `recurring_definition_id?`), `allows_auto_generation`, `cron_enabled`/`cron_active`, `permissions` (4 niveles), `locked?`/`locked_reason?`. |
| 19 | **Sub-tab Catálogo + sub-tab Ejecución** | Cada app consumidora renderiza ambos sub-tabs (via REQ-69 tabs alternables). Catálogo: lista de reportes activos filtrada por `permissions.view`. Ejecución: `ReportRun` de los reportes con `permissions.view` del usuario, incluyendo badge `dependencies_unmet` cuando aplica y filtro "Con dependencias incompletas". La nomenclatura "Histórico" no aparece — es Ejecución. |
| 20 | **`ReportPermissions` — 4 niveles independientes** | Tabla: `view` (filtra catálogo y ejecuciones), `execute` (ejecución manual + scheduling), `edit` (modificación de definición), `delete` (archivado/baja). Un usuario puede tener `view` + `execute` sin `edit`. |
| 21 | **Default seguro** | Si `permissions` no se declara, solo creador + `ADMIN_GROUP` tienen las 4 capacidades. Fuerza declaración explícita; previene exposición accidental de reportes sensibles (P&L, exposición agregada cross-entidad). |
| 22 | **`consumer_apps[]` vs `permissions` — dimensiones ortogonales** | `consumer_apps[]` define **dónde aparece** (qué apps lo listan); `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar. Un reporte puede aparecer en LEX y FIN y ser visible solo para usuarios con `puede_ver_pnl`. |
| 23 | **Principio "capacidades, no rutas" aplicado a Reportes** | El invocador del endpoint no decide la ruta de ejecución. El servicio decide internamente, según el estado del catálogo y las dependencias del reporte, qué camino tomar. **4 rutas internas:** (a) ejecución programática feliz (CRON sin dependencias bloqueantes), (b) generación con datos parciales (allows_auto_generation: true con dependencias incompletas), (c) bloqueo con escalamiento humano (allows_auto_generation: false con dependencias incompletas), (d) ejecución manual próxima a emisión (allows_auto_generation: false). El consumidor del endpoint conoce el resultado (`ReportRun` persistido o `dependencies_pending`) y se suscribe a los eventos en Alertas o Inbox según corresponda. Patrón consistente con REQ-71. |
| 24 | **Las 4 rutas internas — tabla** | Mostrar la tabla completa de las 4 rutas con: Caso, Condiciones, Ruta interna del servicio, Persistencia, Eventos emitidos. Esta es la matriz operativa de comportamiento del endpoint y del scheduler. |
| 25 | **Endpoint de generación + bifurcación por `allows_auto_generation`** | Endpoint único invocable desde cualquier backend autenticado. Valida `permissions.execute` (excepto sistema/cron), valida parámetros, verifica `dependencies[]`. **Bifurcación ante dependencias incompletas:** si `allows_auto_generation: false` → no genera, emite Tarea al Inbox del `blocking_app`, devuelve `dependencies_pending` sin `ReportRun`. Si `allows_auto_generation: true` → genera con `dependencies_unmet[]` poblado, emite Alerta `reporte_dependencias_incompletas` al consumidor + adicionalmente emite la Tarea al `blocking_app` (no bloquea al reporte pero la dependencia sigue pendiente). |
| 26 | **Mecanismo `REPORT_DEPENDENCY` — Tarea al Inbox con `auto_archive`** | **El mecanismo de coordinación inter-aplicación se modela como Tarea al Centro de Solicitudes del `blocking_app`, NO como Alerta.** Razón: es un pedido de completar trabajo concreto para destrabar la generación — eso es naturalmente Tarea (REQ-71). **Flujo end-to-end:** (1) El endpoint o el scheduler detecta una `ReportDependency` con `completed: false` y emite Tarea hacia el Inbox del `blocking_app` invocando el endpoint de REQ-71 con `type: 'report_dependency_block'` y payload con datos del reporte/blocking_state/deadline. (2) Un usuario del área del `blocking_app` toma la Tarea, completa el trabajo pendiente que dispara el `blocking_state`. (3) La `blocking_app` notifica a Reportes; REQ-59 marca `dependencies[].completed: true`. (4) **Auto-cierre vía `auto_archive`**: el tipo `report_dependency_block` declara `condition_ref` que evalúa `dependencies[].completed: true`; cuando se cumple, la Tarea cierra automáticamente con `closed_by: 'system'`, `closure_action: 'dependency_completed'`. (5) Reportes pasa a "Listo para generar". |
| 27 | **`recurring_definition_id` en `ReportDependency`** | Cuando la dependencia es una **instancia específica de una serie recurrente** del Inbox (REQ-71 §14.5), `ReportDependency.recurring_definition_id` apunta a la `RecurringInboxItemDefinition`. El motor matchea contra la próxima instancia completada de esa serie. **Ejemplo end-to-end:** existe serie recurrente diaria `daily_reconciliation` en OPS. El reporte de UIF declara `ReportDependency` con `recurring_definition_id: 'ops.daily_reconciliation'`, apuntando a "instancia del día previo completada". Cuando esa instancia pasa a `completed`, Reportes lo detecta y marca `dependencies[].completed: true`. Permite vincular reportería regulatoria con tareas operativas recurrentes sin acoplamiento adicional. |
| 28 | **Scheduler de CRON** | Job periódico que consulta el catálogo, identifica reportes con `allows_auto_generation: true` y `cron_active: true` cuya `next_emission_date` venció. Para reportes sin dependencias pendientes invoca el endpoint con identidad de sistema, persiste `ReportRun` con `trigger: { type: 'cron' }`, actualiza `next_emission_date`. Para reportes con dependencias pendientes aplica la bifurcación de slide 25 (en CRON `allows_auto_generation` siempre es `true`, así que genera con `dependencies_unmet[]` + emite Alerta + Tarea). Para reportes próximos a emitir con `allows_auto_generation: false` emite Tarea `reporte_proximo_emision_manual` al Inbox del responsable. Frecuencia a decisión de Tecnología (sugerido: diario). Ejecuta con identidad de sistema; no aplica check de `permissions.execute`. |
| 29 | **Persistencia de ejecuciones (`ReportRun`)** | Inmutables. Re-descargables hasta vencimiento de `retention_policy`. Pueden tener `dependencies_unmet[]` poblado (snapshot de las dependencias incompletas al momento de generar). Categorías de retención: `regulatorio` (5-10y según norma — UIF Arg ≥10y, BCRA, CNV, FATCA), `contable` (10y — asientos, balances, P&L), `operativo` (1-6m), `interno` (1-3m). `legal_basis` mandatorio cuando categoría es `regulatorio` o `contable`. Al vencer: `retention_expired: true`, 404 controlado, metadata preservada. |
| 30 | **Reportes cross-app y headless** | Cross-app: `consumer_apps[]` con múltiples entradas. `permissions` aplican per-user dentro de cada app consumidora. Headless: `consumer_apps[]` vacío — generados pero no expuestos en UI. Útil para schedulers externos, integraciones con regulators, agentes IA. `permissions.execute` aplica al invocador (excepto invocaciones de sistema). |

## Slide de cierre (común a ambos bloques)

| # | Título | Contenido |
|---|---|---|
| 31 | **Q&A — Alertas + Reportes** | Conexión entre los dos: el mecanismo `REPORT_DEPENDENCY` ya **no los une directamente** — Reportes emite Tareas al Inbox (REQ-71), no Alertas. Sí los conecta el conjunto de eventos sistémicos del propio reporte (`reporte_proximo_emision_auto`, `reporte_vencido`, `reporte_emitido_automaticamente`, `reporte_error_generacion`, `reporte_dependencias_incompletas`) que Reportes emite a Alertas como `ALERT_TYPE`s categoría `triage`. Ambos consumen el capability provider de REQ-68. Reportes analíticos sobre Alertas viven en el catálogo de REQ-59. |

## Speaker notes / puntos a enfatizar

- Slide 5-6 (4 categorías fijas): si los devs entienden las 4 categorías y que cada una activa UI canónica, ya tienen el modelo. Insistir en que son fijas — no se inventan categorías nuevas.
- Slide 8 (caso paradigmático workflow con postmortem): este caso ancla la diferencia entre Alertas y Inbox. Una anomalía no es una "Solicitud" — es un evento del sistema que el área trabaja con postmortem documentado.
- Slide 11 (eventos de Reportes hacia Alertas): aclarar que estos son `ALERT_TYPE`s categoría `triage` (no `workflow`) — son avisos del sistema sobre estado de reportes, resolver/dismiss en un click.
- Slide 12 (REPORT_DEPENDENCY no vive en Alertas): este es uno de los cambios de modelado más importantes del último refinamiento. **Antes** estaba modelado como Alerta perfil A; **ahora** es Tarea al Inbox con `auto_archive`. Vale destacarlo porque cualquier doc previo que circule puede tener la versión vieja. Razón conceptual: es un pedido de completar trabajo, no una condición detectada.
- Slide 14: aclarar que REQ-52 y REQ-33 ya existen en Jira pero ahora son configuración del estándar, no construcción paralela. Los REQs van a ser reescritos cuando se retome trabajo de LEX/TRD.
- Slide 20-22: los 4 niveles independientes de `ReportPermissions` permiten separación realista (analista: view+execute; manager: +edit; admin: +delete). Mostrar concretamente con un ejemplo (P&L cross-entidad).
- Slide 23-24 (4 rutas internas): este es el slide más operativo de REQ-59. Si los devs entienden la matriz de las 4 rutas, entienden todo el comportamiento del endpoint y del scheduler. Tomarse tiempo de caminar cada fila.
- Slide 26 (REPORT_DEPENDENCY como Tarea con auto_archive): este es el flujo paradigmático de coordinación inter-aplicación. Caminar paso a paso. Insistir en que es el primer caso real de `auto_archive` declarado en el Inbox — el tipo `report_dependency_block` se da de alta en el registry de cada `blocking_app` que puede ser destino, con la condición que evalúa la dependencia.
- Slide 27 (recurring_definition_id): mostrar el ejemplo del reporte UIF + daily_reconciliation. Esta es la conexión más natural entre los dos REQs (59 y 71) — un reporte regulatorio puede declarar dependencias contra series recurrentes operativas del Inbox.
- Slide 28 (scheduler): el scheduler ejecuta con identidad de sistema y no aplica check de `permissions.execute`. Esto es por diseño — la ejecución automática es a nivel sistema, no a nivel usuario.

---

# Sesión 5 — REQ-74 DASHBOARD + Cierre

## Objetivo

Cerrar el set con el último módulo genérico. **REQ-74 DASHBOARD** entrega la lectura agregada del estado del área — counters de los 3 list-shaped, activity feed real-time alimentado por el stream del audit trail, KPIs del dominio, cards especializadas para `cross_app_panel`. Esta es la sesión que conecta todo lo visto en las 4 sesiones anteriores.

Que los devs salgan entendiendo (a) el Dashboard como lectura agregada (no produce data propia), (b) los 3 counters y cómo se filtran por capabilities, (c) `<KpiCard>` con `requires_capability` opcional, (d) el activity feed como consumidor del stream del audit trail, (e) `<CrossAppPanelCard>` como destino natural de alertas `cross_app_panel`, (f) cards opcionales shared (`<SlaSummaryCard>`, `<UpcomingReportsCard>`), (g) prohibiciones explícitas (qué NO va en Dashboard).

Cerrar las 5 sesiones con resumen del paradigma y próximos pasos.

## Duración

≈ 45 min de exposición + 15 min de Q&A. **Slides recomendados: 22** (17 para REQ-74 + 5 cierre del set).

## Mensaje central

> El Dashboard es la lectura agregada del estado del área. No produce data propia — consume counters de los 3 list-shaped (filtrados por capabilities), stream del audit trail para activity feed, KPIs del dominio, alertas categoría `cross_app_panel` como cards especializadas. Es read-only orientation; cualquier mutación ocurre en el módulo correspondiente.

## Conceptos clave que deben quedar

1. **El Dashboard es lectura agregada** — consume 4 fuentes: counters, stream del audit trail, KPIs del dominio, alertas `cross_app_panel`. No produce data propia.
2. **Layout: card-grid responsive, NO L1/L2/L3** — sin `<ViewToggle>`, sin `<Segmenter>`, sin Main CTA, sin filtros granulares, sin `<ClosureModal>`, sin `<Drawer>`.
3. **3 counters genéricos** — Inbox (cuenta `pendiente` + `en_proceso` agregando Solicitudes + Tareas, respeta `state_labels`, prioriza `assignee` → `target_role`), Alertas (cuenta solo `triage` + `workflow` activas, excluye `metric` y `cross_app_panel`), Reportes (filtrado por `permissions.view` del usuario).
4. **`<KpiCard>` con `requires_capability?` y `refresh_strategy?`** — KPI cards sensibles no se renderizan cuando el usuario no tiene la capability (no aparecen como deshabilitadas, no se renderizan).
5. **Activity feed alimentado por el stream del audit trail** — real-time, capability-aware, filtrable por `invocation_source` y `record_type`. Cada item es un `ActionLogEntry` con `activity_text` precomputado.
6. **`<CrossAppPanelCard>`** — consume configuración de un `ALERT_TYPE` categoría `cross_app_panel` como card del Dashboard. Declaración explícita en el Dashboard del app.
7. **Cards opcionales shared** — `<SlaSummaryCard>` (Solicitudes/Tareas con SLA crítico), `<UpcomingReportsCard>` (reportes próximos a vencer + vencidos, con `permissions.view`).
8. **Filtrado por capabilities en 3 lugares** — counter de Reportes, KPI cards con `requires_capability`, activity feed.
9. **Refresh real-time** — counters y activity feed real-time (mismo mecanismo del badge del sidebar y stream del audit trail). KPI cards con `refresh_strategy` declarado.
10. **Naturaleza del servicio** — enteramente cliente. NO consume manifest engine para mutaciones. `<RouterLink>` HTML estándar.
11. **Prohibiciones explícitas** — contract violations: no mutaciones, no filtros sobre listas, no sub-tabs, no `<ViewToggle>`, no `<ClosureModal>`, no `<Drawer>`, no más de 3 counters genéricos.

### Detalles técnicos clave

```typescript
interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    delta: string;
    period_label: string;
  };
  navigate_to?: string;
  loading?: boolean;
  format?: 'currency' | 'number' | 'percent' | 'string';
  requires_capability?: string[];  // capability IDs del capability provider de REQ-68
  refresh_strategy?: 'realtime' | 'on_navigate' | 'manual';  // default 'on_navigate'
}
```

Componentes shared del core:
- `<DashboardGrid>` — wrapper del card-grid responsive
- `<GenericCounterCard>` — counter clickable de un genérico
- `<KpiCard>` — KPI card del dominio
- `<CrossAppPanelCard>` — card que consume configuración de `ALERT_TYPE` categoría `cross_app_panel`
- `<SlaSummaryCard>` — card opcional de Solicitudes/Tareas con SLA crítico
- `<UpcomingReportsCard>` — card opcional de reportes próximos a vencer
- `<ActivityTimeline>` — timeline cross-modules suscrito al stream
- `<ActivityWidget>` — widget compacto por módulo
- `<EvolutionChart>` — chart 2/3-width con métrica subyacente
- `<PeriodSelector>` — selector top-right pinned

## Slides sugeridos REQ-74 (17 slides) + Cierre (5 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-74 — Dashboard** | Portada del bloque. Sesión 5 de 5. |
| 2 | **El Dashboard como lectura agregada** | Diagrama: 4 fuentes que el Dashboard consume — counters de los 3 list-shaped, stream del audit trail (REQ-68), KPIs del dominio, alertas categoría `cross_app_panel` (REQ-73). No produce data propia. Cualquier mutación ocurre en el módulo correspondiente. |
| 3 | **Layout — card-grid responsive, NO L1/L2/L3** | Card-grid responsive como layout primario. Page header con título + `<PeriodSelector>` opcional top-right. Sin Main CTA, sin `<Segmenter>`, sin `<ViewToggle>`. |
| 4 | **Los 3 counters genéricos — núcleo** | Tabla: Inbox (estados `pendiente` + `en_proceso` agregando Solicitudes + Tareas, terminales no cuentan, respeta `state_labels` y prioriza `assignee` → `target_role`), Alertas (categorías `triage` + `workflow` activas; `metric` y `cross_app_panel` excluidas), Reportes (`dependencies[]` con `completed: false` + `ReportRun` con `status: 'pending'`, filtrado por `permissions.view` del usuario). |
| 5 | **`<KpiCard>` con `requires_capability`** | TypeScript del shape de `KpiCardProps`. Highlight: `requires_capability?: string[]` y `refresh_strategy?`. Cuando declara `requires_capability` y el usuario no tiene la capability, la card NO se renderiza (no aparece deshabilitada). Permite Dashboards con cards condicionales a rol (P&L solo para Finanzas, exposición agregada solo para Tesorería). |
| 6 | **Activity feed alimentado por el stream del audit trail** | Cada item del feed es un `ActionLogEntry` (REQ-68) formateado vía `activity_template` declarado por la acción. Real-time vía suscripción al stream. `activity_text` precomputado. Filtrable por `invocation_source` (opt-in del app: mostrar solo acciones humanas ocultando `inbox_trigger`/`api`) y `record_type`. Capability-aware (items cuyo registro el usuario no puede ver se filtran). |
| 7 | **`<ActivityTimeline>` y `<ActivityWidget>`** | `<ActivityTimeline>` — timeline cross-modules con suscripción al stream filtrado por `record_type` del app. `<ActivityWidget>` — widget compacto por módulo (ej: "Últimas 5 alertas activas", "Últimas 5 Solicitudes/Tareas recibidas"). |
| 8 | **Evolution chart + Period selector** | `<EvolutionChart>` — card 2/3-width opcional con métrica subyacente, chart type, rango temporal. `<PeriodSelector>` — pinned top-right cuando aplica. NO es `<Segmenter>` — recomputa KPIs time-based y re-renderiza chart; no segmenta listas. Counters de los 3 list-shaped no dependen del period selector. |
| 9 | **`<CrossAppPanelCard>` — la conexión con Alertas** | Una alerta categoría `cross_app_panel` (REQ-73 §9) es naturalmente un panel KPI cross-app read-only. Cuando una app declara un `ALERT_TYPE` de esa categoría, la configuración es renderizable directamente como card del Dashboard del app vía `<CrossAppPanelCard>`. **Declaración explícita en el Dashboard del app** — la existencia del `ALERT_TYPE` no implica que aparezca automáticamente. Convivencia con módulo Alertas: vive prioritariamente en el Dashboard; módulo Alertas opcionalmente listable. |
| 10 | **`<SlaSummaryCard>` (opcional)** | Computa sobre Solicitudes/Tareas del Inbox con `sla_hours` declarado (REQ-71 §10). Muestra "N próximas a vencer" (50-100% consumido) y "N vencidas". Click navega al Inbox con filtro pre-aplicado. Respeta capabilities. |
| 11 | **`<UpcomingReportsCard>` (opcional)** | Computa sobre catálogo de Reportes con `permissions.view` aplicado. Muestra próximos a emitir (según `next_emission_date` + `alert_anticipation_days`) + vencidos. Click navega a Reportes con filtro pre-aplicado. |
| 12 | **Filtrado por capabilities — 3 lugares** | Tabla: Counter de Reportes (filtra por `permissions.view`), KPI cards con `requires_capability` (no se renderizan sin la capability), Activity feed (items cuyo registro el usuario no puede ver se filtran). Misma fuente de verdad que el resto del core. |
| 13 | **Refresh real-time** | Tabla: Counters real-time vía el mismo mecanismo del badge del sidebar (REQ-71 §11). Activity feed real-time vía suscripción al stream (REQ-68 §10). KPI cards según `refresh_strategy` declarado (`realtime`/`on_navigate`/`manual`). Evolution chart al cambiar `<PeriodSelector>` o refresh manual. `<CrossAppPanelCard>` hereda refresh del `ALERT_TYPE`. |
| 14 | **Naturaleza del servicio** | Componentes Vue 3 en `core-template-frontend`. Enteramente cliente — composables que orquestan queries a endpoints existentes. NO tiene backend propio. NO consume manifest engine para mutaciones. Los `<RouterLink>` son links HTML estándar, no acciones del manifest. |
| 15 | **Prohibiciones explícitas (contract violations)** | NO carga operaciones de dominio. NO mutaciones via manifest engine (no `<ManifestActionsMenu>`, no `<ManifestModuleCTAs>`, no `<ManifestDialog>`). NO filtros sobre listas. NO sub-tabs / `<Segmenter>`. NO `<ViewToggle>`. NO `<ClosureModal>`, `<Drawer>`. El period selector NO es Segmenter. NO más de 3 counters genéricos. |
| 16 | **Componentes shared del core (recap)** | Lista de los 10 componentes: `<DashboardGrid>`, `<GenericCounterCard>`, `<KpiCard>`, `<CrossAppPanelCard>`, `<SlaSummaryCard>`, `<UpcomingReportsCard>`, `<ActivityTimeline>`, `<ActivityWidget>`, `<EvolutionChart>`, `<PeriodSelector>`. |
| 17 | **Performance + Fuera de alcance V1** | Performance: render con 6 KPI cards + 3 counters + 1 activity timeline + 1 evolution chart FMP < 1.2 s; cambio de período < 500 ms; update real-time < 500 ms desde la emisión. Fuera V1: configuración del Dashboard por usuario, drag-drop para reorganizar, embedded widgets externos, persistencia del period selector por usuario. |

### Cierre de las 5 sesiones (5 slides)

| # | Título | Contenido |
|---|---|---|
| 18 | **Recap del paradigma** | Visual: los 6 transversales como sistema. Una sola fuente de verdad (capabilities + manifests). Modelo conceptual unificado en dos capas (todo pasa por el motor + capacidades, no rutas). Audit trail + stream como espina dorsal. Universalidad y consistencia. Scope explícito del Centro de Solicitudes. |
| 19 | **Lo que ya está listo** | Los 6 REQs están enriquecidos y en SENT TO DEV. Los principios arquitectónicos formalizados ("Wizard of Oz arquitectónico", scope explícito del Centro, `REPORT_DEPENDENCY` como Tarea al Inbox). El template `core-template-frontend` está scaffoldado con OpenSpec + skills. Las decisiones arquitectónicas están cerradas. |
| 20 | **Lo que queda por delante** | Migración de las 4 apps actuales al nuevo template. Implementación de los 6 transversales en orden de rollout (REQ-68 → REQ-69 → REQ-71 + REQ-73 → REQ-59 → REQ-74). Declaración progresiva de tipos por cada área (acciones del manifest, tipos de Solicitudes/Tareas, series recurrentes, `ALERT_TYPE`s, reportes, KPIs del Dashboard). |
| 21 | **Cómo trabajamos a partir de ahora** | Para Producto: foco en la declaración de configuración de cada área. Para Tecnología: implementación del template + transversales con OpenSpec como contrato. Refinamientos puntuales por REQ cuando surjan preguntas. Los REQs en Jira son la fuente única de verdad de los contratos. |
| 22 | **Q&A final + cierre** | Espacio para preguntas abiertas sobre todo el set. |

## Speaker notes / puntos a enfatizar

- Slide 2 (lectura agregada): si los devs entienden que el Dashboard no produce data propia, entienden por qué es enteramente cliente y por qué tiene tantas prohibiciones.
- Slide 4 (counters): aclarar por qué `metric` y `cross_app_panel` no entran al counter de Alertas. `metric` se auto-resuelve algorítmicamente; `cross_app_panel` es panel agregado, no "alertas individuales". El counter de Inbox **agrega Solicitudes + Tareas** — no las distingue (el usuario las distingue dentro del módulo Inbox vía filtro `type`).
- Slide 5 (`requires_capability`): insistir en que la card NO se renderiza, no aparece deshabilitada. Esto previene exposición de existencia de información sensible.
- Slide 6 (activity feed): mostrar concretamente cómo el `activity_template` declarado en una acción del manifest se resuelve en el item del feed. Conexión con REQ-68 en acción.
- Slide 9 (`<CrossAppPanelCard>`): esta es la conexión nueva que valió la pena articular en el enrichment. Es la cuarta categoría de Alertas viviendo prioritariamente en el Dashboard.
- Slide 15 (prohibiciones): las prohibiciones son contract violations, no recomendaciones. Las skills del template van a tener tests que las enforcement.
- Slide 18-22 (cierre): tomarse el tiempo de cerrar bien las 5 sesiones. Los devs salen de esta semana con la imagen completa del paradigma — vale dejar tiempo de Q&A abierto al final.

---

## Notas finales para Claude Design

### Cuando se invoque para una sesión específica

Cada sesión es **autocontenida** — el contexto general + la sección de la sesión correspondiente alcanzan para generar el deck. No es necesario consultar las demás secciones a menos que se quiera mantener consistencia visual entre decks.

### Consistencia visual entre las 5 sesiones

Mantener consistencia de paleta, tipografía, layout de slides repetidos (portada, agenda, Q&A) entre las 5 sesiones. Si el deck de la Sesión 1 ya quedó definido con un patrón visual, replicarlo en los siguientes 4. Esto refuerza el mensaje del paradigma como sistema coherente.

### Diagramas recomendados

- **Diagrama de orden de rollout** (Sesión 1, slide 8): los 6 REQs con flechas de dependencia. Usar navy + violet como acentos.
- **Diagrama del modelo conceptual unificado capa 1** (Sesión 1, slide 9): el motor de REQ-68 en el centro, las 4 fuentes de invocación apuntando hacia él (`inbox_trigger`, `kanban_drag`, `menu`, `inbox_drawer_cta`).
- **Diagrama del modelo conceptual unificado capa 2** (Sesión 1, slide 10): el CTA externo invocando la capacidad del `target_app`, con dos paths internos (integración directa | crea Solicitud/Tarea en el Centro), el usuario externo viendo solo el estado abstracto.
- **Diagrama de Capabilities + Grupos + Usuarios** (Sesión 2, slide 13): tres capas — Capabilities atómicas → Grupos → Usuarios (via memberships). Acceso al panel admin restringido a `manage_capabilities`.
- **Mockup del menú agrupado** (Sesión 2, slide 10): el menú con bloques `ASIGNACIÓN / IMPUTACIÓN` y `CONTEXTUALES`, sub-grupos del nivel 2 (IMPUTACIÓN, CONCILIACIÓN, GOVERNANCE, DOCUMENTACIÓN, CIERRE), iconos `✓` y `↗`.
- **Diagrama de 4 caminos de creación del Inbox** (Sesión 3, slide 25): los 4 caminos confluyendo al mismo endpoint, con identidad distinta del invocador.
- **Diagrama serie ↔ instancias del Inbox** (Sesión 3, slide 31): `RecurringInboxItemDefinition` como definición, scheduler generando N instancias `Solicitud<TPayload>` con `recurring_definition_id` cada una con lifecycle independiente.
- **Matriz de 4 rutas internas de Reportes** (Sesión 4, slide 24): tabla visual con las 4 rutas según `allows_auto_generation` y estado de dependencias, con eventos emitidos (Tarea al Inbox vs Alerta al consumidor).
- **Flujo de `REPORT_DEPENDENCY` como Tarea con `auto_archive`** (Sesión 4, slide 26): 5 pasos del flujo end-to-end (detección → Tarea al Inbox del `blocking_app` → usuario completa el trabajo → notificación a Reportes → auto-cierre de la Tarea → Reportes pasa a "Listo").
- **Diagrama de `recurring_definition_id` en dependencias** (Sesión 4, slide 27): reporte de UIF declarando dependencia contra `daily_reconciliation` (serie recurrente del Inbox de OPS); instancia del día previo se completa → dependencia se libera.
- **Layout de Dashboard** (Sesión 5, slide 3): mockup del card-grid responsive con los 3 counters + KPI cards + activity timeline + evolution chart + cross_app_panel card.

### Code blocks

Cuando se muestren TypeScript shapes (`ActionConfig`, `Solicitud`, `InboxTypeConfig`, `RecurringInboxItemDefinition`, `Alerta`, `Report`, `ReportPermissions`, `ReportRun`, `ReportDependency`, `KpiCardProps`, etc.), usar bloques de código con sintaxis highlighting. Mantener legibilidad — fuente monospace, fondo distinto al fondo del slide.

### Lenguaje de los slides

Español argentino, vos form. Términos técnicos en inglés cuando es convención. Conciso. Bullet points cortos. Las narrativas largas van en speaker notes, no en el slide visible.
