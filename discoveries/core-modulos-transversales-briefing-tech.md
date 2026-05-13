# Briefing para Claude Design — Refinamiento Tech del Set Transversal del Core

> **Propósito.** Briefing exhaustivo para que Claude Design genere las 5 presentaciones (1 paradigma + 4 técnicas) de las jornadas de refinamiento con el equipo de Tecnología sobre la iniciativa **REQ-81 — Ardua Financial Core: Infraestructura Transversal del Core**.
>
> **Cómo usar.** Iniciá una conversación nueva con Claude Design por cada sesión. Pasale este archivo completo + indicale qué sesión generar ("Generá el deck de la Sesión 1" / "Sesión 2", etc.). Cada sección es autocontenida.
>
> **Naturaleza del documento.** Las presentaciones se exponen desde el lado funcional de producto. Las definiciones y detalles técnicos (shapes de datos concretos, componentes específicos, stack, performance budgets, decisiones de implementación) quedan del lado de Tecnología y se cierran en refinement. Este briefing describe el modelo conceptual, los discriminadores funcionales, los estados, las reglas de habilitación y los flujos — no la implementación. Donde el original tenía interfaces tipadas, este briefing usa prosa + tablas con campos nombrados.
>
> **Última actualización:** 2026-05-13 — refactor completo aplicando el cleanup transversal de la sesión: (a) entidad `ConsumerTypeAssociation` con `satisfaction_mode` (`generate_new` / `verify_existing`) unifica dependencias de Reportería + instancias scheduleadas del Inbox; (b) Alertas simplificadas — el tipo pertenece al catálogo del `target_app`, no al emisor; estados Nueva/Resuelta/Descartada; eliminación de las 4 categorías `triage/workflow/metric/cross_app_panel`; (c) Inbox como vista filtrada del Centro de Solicitudes con matriz `type × execution_mode`, 5 estados canónicos incluyendo `failed`, endpoint público invocable como primitiva común, evidencias en panel de detalle, tres fechas semánticas, dos vistas top-level (Mi bandeja + Mis enviadas); (d) Dashboard con 4 cards shared mandatorias (counters de los 3 list-shaped + feed de Actividades recientes) + indicador principal del área designable + card de gráfico de evolución con 3 tipos (barras, línea, circular) + eliminación de la card cross-app; (e) limpieza completa de filtración técnica del documento.

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
| **REQ-71** | INBOX (Centro de Solicitudes) | Módulo genérico. Centro umbrella que aterriza todo trabajo que requiere intervención humana del backoffice, con matriz `type × execution_mode`, asignación manual, series recurrentes y endpoint público invocable. |
| **REQ-73** | ALERTAS (Centro de Alertas) | Módulo genérico. El tipo pertenece al catálogo del `target_app`; estados Nueva / Resuelta / Descartada. |
| **REQ-59** | REPORTES | Módulo genérico / servicio transversal. Catálogo + Ejecución con permissions de 4 niveles y dependencias modeladas como `ConsumerTypeAssociation`. |
| **REQ-74** | DASHBOARD | Módulo genérico. Lectura agregada del estado del área con 4 cards shared mandatorias + KPI principal del área. |

### El cambio de paradigma

Hasta abril 2026 cada app del core construía las mismas piezas localmente sin contrato compartido — tablas hand-rolled, cards bespoke, kanbans sueltos, lógica de "qué puede hacer cada usuario" inline en cada vista, modales de cierre distintos. La iniciativa REQ-81 introduce un cambio estructural: la infraestructura vive **una sola vez en el core** y las apps **consumen el estándar declarando configuración específica del dominio**. No reimplementan, declaran.

Esto cambia tres cosas a la vez:

1. **Cómo se desarrollan las apps** — sumar un módulo nuevo es declarar un manifest, no programar desde cero.
2. **Cómo se ven y funcionan las apps** — las apps actuales y las nuevas se ven idénticas en lo transversal; varía solo el dominio.
3. **Cómo se piden nuevas funcionalidades** — las áreas no piden "construir un módulo de Alertas"; piden "dar de alta un tipo de alerta con esta configuración" en el catálogo del `target_app`.

### Modelo conceptual unificado

**Capa 1 — Todo pasa por el motor.** Una acción del manifest es la unidad atómica de mutación o invocación del sistema. Trigger automático del Inbox, CTA del panel de detalle, transición de Kanban, batch op, integración externa, retry de una ejecución programática que falló: todos pasan por el motor de REQ-68. Drag-drop y click en el menú son dos rutas equivalentes de la misma acción. El audit trail es la espina dorsal de toda la observabilidad del producto.

**Capa 2 — Capacidades, no rutas (Wizard of Oz arquitectónico).** Los CTAs externos invocan **capacidades** del `target_app`, no rutas de ejecución específicas. La capacidad decide internamente cómo se ejecuta: integración directa (resultado inmediato) o creando trabajo en el Centro de Solicitudes (resultado eventual). El consumidor del endpoint no se entera del path. Esto habilita lanzar productos con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo. Aplica también al servicio de Reportes: el invocador no decide la ruta de ejecución; el servicio decide internamente según `ConsumerTypeAssociation` y `satisfaction_mode`.

### Audiencia de las sesiones

Equipo de Tecnología de Ardua: desarrolladores de los repos actuales (`core-app-frontend` CLP, `core-lex-frontend`, `core-ops-frontend`, `core-trd-frontend`) + Santiago Ahmed como TPM. Audiencia con conocimiento del producto y del dominio del negocio. La definición técnica (shapes concretos, componentes, stack, performance budgets) se cierra con ellos en refinement — este briefing no la incluye.

### Brand kit Ardua (obligatorio en todos los decks)

- **Colores:**
  - Dark navy `#11113A` — primario, fondo principal
  - Violet `#7326F1` — acentos, highlights
  - Lime `#CFF80A` — CTAs, énfasis crítico
  - Black `#000000`
- **Tipografías:** Poppins (titulares), Inter (cuerpo), Arial (fallback)
- **Diseño:** limpio, espaciado generoso, mínima decoración. Diagramas legibles, no técnicos densos. Slides tipo "presentación de Anthropic" — narrativos, no slides de manual de ingeniería. Evitar íconos genéricos decorativos.

### Tono general

Funcional y narrativo. La iniciativa plantea un cambio de paradigma con impacto alto a nivel de negocio y áreas. El tono debe transmitir la magnitud del cambio sin caer en hype vacío. Español argentino, formal pero conversacional (vos form). Conciso. Tablas y diagramas donde aportan, prosa donde fluye mejor.

### Idioma

**Español argentino** (vos form, no tú). Términos del modelo (entidades, discriminadores, estados, fuentes) en inglés cuando es convención del modelo: `target_app`, `target_role`, `assignee`, `owner`, `state`, `type`, `execution_mode`, `satisfaction_mode`, `invocation_source`, `record_mutation`, `function_invocation`, etc. Prosa en español.

### Glosario común

| Término | Definición |
|---|---|
| **Financial-core** | Conjunto de apps internas del grupo Ardua que cubren cada área operativa (CLP, FIN, LEX, OPS, TRD, COM). |
| **REQ-81** | Iniciativa contenedora. Agrupa los 6 REQs transversales del core. |
| **Manifest** | Declaración de las acciones que un módulo expone sobre sus registros, las vistas que soporta y los ejes del Kanban cuando aplica. Cada módulo declara su manifest una vez; el motor del core lo consume al boot. |
| **Capability** | Permiso atómico que habilita ejecutar acciones, ver reportes, ser target de Solicitudes/Tareas, ser target de Alertas, ver KPIs sensibles. Catálogo mantenido por Producto. |
| **Grupo** | Agrupación administrable de capabilities + usuarios. Un usuario puede pertenecer a múltiples grupos; sus capabilities efectivas son la unión. |
| **Capability provider** | Servicio único del core que resuelve `user_id → capabilities[]` vía la cadena Usuario → Grupos → Capabilities. Consumido por todos los REQs del set. Misma fuente de verdad en frontend y backend. |
| **Acción** | Operación que un usuario o sistema invoca sobre un registro. Dos tipos: `record_mutation` (muta el registro fuente) o `function_invocation` (toma el registro como contexto e invoca otra cosa). |
| **`record_mutation`** | Tipo de acción que completa campos / cambia estado del registro fuente. Ejemplos: Asignar Banco y Cuenta, Marcar Conciliado, Cerrar período. Iconografía conceptual: ✓. |
| **`function_invocation`** | Tipo de acción que toma el registro fuente como contexto e invoca otra cosa: crear documento en otro módulo, navegar, disparar job, llamar capacidad. Ejemplos: Generar Factura, Validar whitelist, Ver movimientos de cliente. Iconografía conceptual: ↗. |
| **`invocation_source`** | Metadata del audit trail que indica desde dónde se invocó una acción. Siete valores: `menu`, `cta`, `kanban_drag`, `inbox_drawer_cta`, `inbox_trigger`, `batch`, `api`. El motor no distingue por fuente — ejecuta la misma lógica. |
| **Capacidad del dominio** | A diferencia de la capability como permiso, una capacidad del dominio es una función pública de un `target_app` que otros módulos invocan (ej: `ejecutar_retiro` en OPS, `generar_reporte` en Reportes). La capacidad decide internamente si la ejecuta directo o si crea trabajo en el Centro de Solicitudes. |
| **Wizard of Oz arquitectónico** | Patrón habilitado por "capacidades, no rutas": un producto puede lanzarse con ejecución 100% humana en el Centro de Solicitudes y automatizarse progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación, no de discovery. |
| **Centro de Solicitudes (Inbox)** | Módulo genérico (REQ-71). Umbrella que aterriza todo trabajo que requiere intervención humana del backoffice. UI muestra dos categorías (`type: 'request' \| 'task'`) bajo motor único. |
| **`type`** | Discriminador del registro del Centro: `'request'` (Solicitud) o `'task'` (Tarea). Determina el vocabulario de los closeActions y opcionalmente labels de estados. |
| **`execution_mode`** | Discriminador del modo de ejecución: `'human'` (interviene un operador) o `'programmatic'` (la ejecuta un endpoint). Ortogonal a `type` — la matriz de las cuatro combinaciones cubre los cuadrantes del modelo. |
| **Inbox como vista filtrada** | El Centro persiste **todas** las ejecuciones (humanas y programáticas) en base de datos para audit. El Inbox **solo renderiza** las que requieren acción humana en este momento. Regla canónica: `execution_mode === 'human' OR state === 'failed'`. |
| **5 estados canónicos del Centro** | `pendiente`, `en_proceso`, `completed`, `rejected`, `failed`. `failed` aplica solo a registros con `execution_mode: 'programmatic'` cuando el endpoint público devolvió error. Retry manual en V1. |
| **Solicitud** | `type: 'request'`. Pedido de algo, típicamente con componente de decisión (vocabulario: aprobar/rechazar/procesar). Ej: solicitud de retiro, revisión KYC. |
| **Tarea** | `type: 'task'`. Pedido de ejecución de una o más acciones concretas (vocabulario: completar/cancelar). Ej: conciliar movimientos del día, revisar Nostros. |
| **`assignee`** | Asignación manual a un usuario específico, opcional, independiente del `owner`. Editable en cualquier estado no terminal vía la acción "Asignar/Reasignar/Liberar" del manifest. |
| **`owner`** | Quién está trabajando ahora el registro. Auto-asignado en transición a `en_proceso`. Distinto de `assignee`. |
| **`source_app` / `target_app`** | App originadora vs app destino. Un registro del Centro tiene un único `target_app`. |
| **`target_role`** | Capability requerida para que un usuario sea destino de routing dentro del `target_app`. |
| **Endpoint público invocable** | Endpoint del core que ejecuta la lógica de un tipo programático del catálogo. Es la primitiva común que comparten cuatro escenarios: scheduler, acción del manifest, retry desde el panel de detalle del Inbox, retry desde una Alerta. Desde su perspectiva los cuatro son indistinguibles — mismo payload, mismo retorno. |
| **Evidencias** | Sección del panel de detalle / modal de cierre. Tres tipos canónicos: `manual_check` (confirmación humana), `attachment` (archivo adjunto), `system_log` (log del endpoint cuando `execution_mode: 'programmatic'`). Coexisten con `closeAction` + comentario — capturan **cómo se demostró el trabajo**. Inmutables tras cierre. |
| **Tres fechas semánticas** | `created_at` (persistencia técnica), `requested_at` (cuando se solicita formalmente — puede ser futura para generación anticipada por consumidor-tipo), `due_at` (deadline). |
| **Dos vistas top-level del Inbox** | "Mi bandeja" (lo que el usuario tiene que ejecutar: `assignee = user_actual` o `target_role` corresponde) y "Mis enviadas" (lo que el usuario creó hacia otros: `source_user = user_actual`). |
| **Series recurrentes** | Entidad `RecurringInboxItemDefinition` que declara series con cadencia + payload template + `default_assignee` + `series_state`. El scheduler genera **instancias** independientes en cada ciclo, cada una con lifecycle propio. |
| **Scope explícito del Centro** | El Centro aterriza solo trabajo que requiere intervención humana del backoffice. Jobs programáticos puros (sync, audit, normalización, cron internos) viven fuera. Intersección: un job programático puede declarar fallback opt-in al Centro al fallar. |
| **Alerta** | Evento detectado por el sistema (o ingreso manual) que requiere atención del área. El tipo (`ALERT_TYPE`) pertenece al catálogo del `target_app`, no al emisor. |
| **Estados canónicos de Alerta** | `Nueva` (recién detectada), `Resuelta` (atendida con outcome positivo), `Descartada` (atendida con outcome negativo o no aplica). La diferenciación entre presentaciones de UI vive a nivel del app que renderiza, no del tipo. |
| **Catálogo del `target_app`** | Conjunto de tipos (`ALERT_TYPE`, tipos del Inbox, reportes) declarados por la app destino. Cualquier código del sistema puede disparar la ingesta para un tipo del catálogo; la identidad del invocador queda como metadata del audit trail. |
| **Report** | Definición de reporte en el catálogo del core. Tiene `permissions` con 4 niveles independientes (`view`, `execute`, `edit`, `delete`). |
| **ReportRun** | Ejecución concreta de un reporte. Inmutable, descargable hasta vencimiento de retención. Puede tener `consumer_associations_unmet[]` cuando se generó con asociaciones consumidor-tipo no satisfechas. |
| **`ConsumerTypeAssociation`** | Entidad unificada del modelo que declara la relación entre un consumidor scheduleado (reporte, cierre periódico, vencimiento regulatorio) y un tipo del catálogo del Inbox. Cubre dependencias bloqueantes + generación anticipada + verificación de trabajo existente. Generalización de lo que antes era `ReportDependency`. |
| **`satisfaction_mode`** | Discriminador de cómo se satisface una `ConsumerTypeAssociation`. Dos valores: `'generate_new'` (el consumidor dispara la creación de una instancia nueva cuando llega `due_at - lead_time_days`) o `'verify_existing'` (el consumidor verifica si ya existe una instancia completada dentro de `verify_window_days`). |
| **`is_primary_indicator`** | Flag opcional en una KPI card del dominio que la designa como **indicador principal del área**. Habilita la card de gráfico de evolución del Dashboard. Una sola KPI card por app puede tener el flag. |
| **Audit trail** | Log persistente + stream en tiempo real de toda acción ejecutada en el sistema. Misma fuente, dos planos. |
| **`activity_template`** | String templatizado declarado por cada acción del manifest (ej: "{user_name} generó un depósito para {record.cliente_nombre}") que se resuelve al ejecutar y persiste como texto del evento del audit trail. Consumido por el feed de Actividades del Dashboard. |
| **Modal de cierre** | Surface compartido del core. Wrapper temático del modal de acción del manifest, con header y copy específicos para transiciones de cierre. Reutilizado en Inbox, transiciones de Kanban y cualquier acción que requiera justificación al cerrar. |
| **Panel de detalle** | Surface compartido del core. Panel lateral con detalle del registro, timeline, comments, CTAs invocables. Reutilizado en Inbox, Alertas y cualquier registro que requiera vista de detalle sin abandonar la lista. |

---

# Sesión 1 — El Paradigma

## Objetivo

Sentar la base conceptual. Que los devs salgan entendiendo (a) por qué cambia el modelo de desarrollo, (b) cómo se conectan los 6 transversales como sistema, (c) qué es el modelo conceptual unificado que cruza los REQs, (d) qué significa el principio "capacidades, no rutas", (e) cómo se trabaja a partir de ahora. **No** profundizar en cada REQ — eso va en las 4 sesiones siguientes.

## Duración

≈ 35 min de exposición + 15 min de Q&A. **Slides recomendados: 20.**

## Mensaje central

> La infraestructura del financial-core vive una sola vez en el core. Las apps consumen el estándar declarando configuración del dominio. Los CTAs externos invocan capacidades, no rutas — el módulo destino decide internamente si ejecuta directo o si crea trabajo en el Centro. Esto cambia simultáneamente cómo se desarrollan las apps, cómo se ven, cómo funcionan y cómo se piden nuevas funcionalidades.

## Conceptos clave que deben quedar

1. **El problema actual** — apps con stacks divergentes reimplementando lo mismo sin contrato compartido. Resultado: divergencia inevitable, no reuso, governance fragmentada.
2. **El template del core** — base oficial del grupo. Las apps consumen lo transversal y declaran solo el dominio.
3. **El insight central** — la infraestructura vive una sola vez; las apps declaran configuración. No reimplementan.
4. **Los 6 transversales como sistema** — 2 habilitantes (ACCIONES, VISTAS) + 4 módulos genéricos (INBOX, ALERTAS, REPORTES, DASHBOARD). Orden de rollout con dependencias claras.
5. **Modelo conceptual unificado — capa 1** — una acción del manifest es la unidad atómica de mutación / invocación; todo pasa por el motor de REQ-68.
6. **Modelo conceptual unificado — capa 2: capacidades, no rutas** — los CTAs externos invocan capacidades del módulo destino, no rutas de ejecución. La capacidad decide internamente si ejecuta directo o crea trabajo en el Centro. Aplica también al servicio de Reportes con `ConsumerTypeAssociation` + `satisfaction_mode`.
7. **Una sola fuente de verdad** — Capabilities + Grupos viven una sola vez (REQ-68) y son consumidas por todos los demás REQs.
8. **Universalidad y consistencia** — menú de acciones en todo registro, 3 vistas representan el mismo set filtrado, el modal de cierre reutilizado en Inbox y Kanban, drag-drop y menú son rutas equivalentes.
9. **Audit trail + stream** — espina dorsal de la observabilidad. Log persistente para auditorías + stream en tiempo real para feed de Actividades del Dashboard e integraciones analíticas externas.
10. **Cambio cultural en cómo se piden funcionalidades** — las áreas declaran configuración, no piden "construir un módulo".

## Slides sugeridos

| # | Título | Contenido |
|---|---|---|
| 1 | **Portada** | Título: "Ardua Financial Core — Infraestructura Transversal del Core". Subtítulo: "Sesión 1 de 5 — El Paradigma". Iniciativa REQ-81. Yasmani Rodriguez · Head of Product. |
| 2 | **Agenda** | (1) Por qué este cambio, (2) Qué construimos hoy vs el problema, (3) El nuevo paradigma, (4) Los 6 transversales como sistema, (5) Modelo conceptual unificado, (6) Capacidades, no rutas — Wizard of Oz arquitectónico, (7) Cómo trabajamos a partir de ahora, (8) Las 4 sesiones que vienen, (9) Q&A. |
| 3 | **El problema — apps con implementaciones divergentes** | Hoy cada app del core reimplementa localmente las mismas piezas: tablas hand-rolled, cards bespoke por módulo, kanbans sueltos cuando existen, lógica de "qué puede hacer cada usuario" inline en cada vista, modales de cierre distintos. Resultado: divergencia inevitable, código no reusable, governance fragmentada. |
| 4 | **El costo real de esto** | Sumar un módulo nuevo a un app = reimplementar todo desde cero. Cambiar la matriz de permisos = tocar UI en N lugares. Audit trail = inexistente o ad-hoc. Reportería = manual y por área. No hay forma de responder "qué hizo Yasmani sobre el Cliente Acme entre marzo y abril". |
| 5 | **El cambio — el template del core como base** | Un template del cual derivan todas las apps del core. Las apps actuales migran al template; las apps nuevas (FIN, COM) parten de él. La infraestructura transversal vive una sola vez en el template; cada app la consume declarando configuración específica del dominio. |
| 6 | **6 transversales que el template entrega** | Visual: dos columnas. Izquierda: 2 funcionalidades habilitantes (ACCIONES, VISTAS). Derecha: 4 módulos genéricos (INBOX, ALERTAS, REPORTES, DASHBOARD). Cada uno con su REQ key. |
| 7 | **El insight clave — "transversal" significa una vez** | El paradigma dice: la infraestructura vive una sola vez en el core; las apps consumen el estándar declarando configuración específica del dominio. Una app no reimplementa la lista de registros, no reescribe el motor de acciones, no inventa su propio panel de detalle. Declara qué tipos de Solicitudes/Tareas maneja, qué tipos de alerta registra en su catálogo, qué KPI cards pueblan su Dashboard. |
| 8 | **Cómo se conectan los 6 transversales** | Diagrama de orden de rollout: REQ-68 ACCIONES (base habilitante) → REQ-69 VISTAS → REQ-71 INBOX + REQ-73 ALERTAS (en paralelo) → REQ-59 REPORTES → REQ-74 DASHBOARD. Justificación al pie: sin motor de acciones no hay capabilities ni dialogs ni audit trail; Vistas provee el modal de cierre; Inbox y Alertas comparten timeline y comments y panel de detalle; Reportes consume el endpoint del Inbox para coordinar dependencias; Dashboard consume counters + stream de los cinco anteriores. |
| 9 | **Modelo conceptual unificado — capa 1: todo pasa por el motor** | "Una acción del manifest es la unidad atómica de mutación o invocación del sistema." Cuatro consecuencias concretas: (a) trigger automático del Inbox = acción `function_invocation` invocada por el sistema con `invocation_source: 'inbox_trigger'`. (b) Transición drag-drop del Kanban = acción `record_mutation` invocada por el usuario con `invocation_source: 'kanban_drag'`. (c) CTA en el panel de detalle de Solicitud = acción del manifest del módulo destino con `invocation_source: 'inbox_drawer_cta'`. (d) Retry de una ejecución programática fallida = re-invocación al endpoint público del tipo, registrado en el audit trail. Todo pasa por el motor de REQ-68. |
| 10 | **Modelo conceptual unificado — capa 2: capacidades, no rutas** | Los CTAs externos (en CLP, Pago Directo, RFQ Gateway, etc.) invocan **capacidades** del `target_app`, no rutas de ejecución específicas. La capacidad decide internamente cómo se ejecuta: (a) **integración directa** → resultado inmediato, no toca el Centro; o (b) **crea Solicitud/Tarea en el Centro** → resultado eventual, el CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado". Esto habilita el **Wizard of Oz arquitectónico**: un producto puede lanzarse con ejecución 100% humana en el Centro desde día uno y automatizarse progresivamente sin tocar el CTA externo ni la experiencia del usuario. La decisión "Centro sí / Centro no" es de implementación (variable por monto, cliente, hora, tipo de operación), no de discovery de producto. **Ejemplo:** el usuario del CLP clickea "Retirar"; el CTA invoca la capacidad `ejecutar_retiro` de OPS; OPS decide internamente si lo procesa vía integración directa o si crea una Solicitud al Centro; el usuario del CLP no se entera del path. El mismo principio se aplica al servicio de Reportes con `ConsumerTypeAssociation` + `satisfaction_mode`. |
| 11 | **Una sola fuente de verdad** | El catálogo de manifests es la única fuente de verdad de qué puede hacerse en la plataforma. Capabilities + Grupos viven una sola vez (REQ-68) y son consumidas por todos los demás REQs: Reportes para sus permissions de 4 niveles, Inbox para `target_role` y manual creation, Alertas para routing, Dashboard para filtrado de cards y feed. Frontend y backend resuelven la misma data. |
| 12 | **Universalidad y consistencia** | El menú de acciones aparece en todo registro de la plataforma en cualquier formato (lista, card, Kanban). Las 3 vistas (Lista / Tarjetas / Tablero) son representaciones del mismo record set filtrado — cambiar de vista no cambia el set, cambiar el eje del Kanban no cambia el set. El modal de cierre es el mismo surface compartido reutilizado por Inbox, transiciones de Kanban y cualquier acción que requiera justificación. Drag-drop y click en el menú son rutas equivalentes de la misma acción. |
| 13 | **Audit trail + Stream — la espina dorsal de la observabilidad** | El motor de Acciones emite eventos en dos planos sobre la misma fuente: **log persistente consultable** (para auditorías, compliance, reportes regulatorios, queries históricas filtrables por registro, usuario, acción, rango de fechas) + **stream en tiempo real** (para el feed de Actividades del Dashboard, sinks externos como Mixpanel, Amplitude, PostHog, Hubspot — configurables sin instrumentar nada en las apps). Cada acción declara `activity_template` que se resuelve al ejecutar y queda registrado en el evento del audit trail. |
| 14 | **Impacto en cómo se desarrolla** | Para devs: sumar un módulo nuevo a un app = declarar un manifest + opcionalmente declarar tipos de Solicitudes/Tareas/Alertas/Reportes/KPIs. No se toca el motor, no se reescribe el panel de detalle, no se reinventa el Kanban. El template provee skills declarativas para automatizar el scaffolding. |
| 15 | **Antes / después — ejemplo concreto** | Ejemplo: agregar la acción "Marcar Conciliado" a un movimiento de OPS. **Antes:** tocar el componente de la lista de movimientos en OPS, agregar lógica de capability inline, programar el dialog, conectar al endpoint, sumar al log si existe. Cada app que tenga "Marcar Conciliado" repite el ejercicio. **Después:** alta de la acción en el manifest del módulo con `id`, `label`, capabilities, efecto al confirmar. La acción aparece automáticamente en el menú de acciones, audit trail funciona out-of-the-box, el feed de Actividades del Dashboard la renderiza si declara `activity_template`. Tres pasos: alta de la declaración, eventual nuevo endpoint server-side, deploy. |
| 16 | **Impacto en cómo se piden funcionalidades** | Cambio cultural: las áreas no piden "construir un módulo nuevo de Alertas para mi área" — piden "dar de alta un tipo de alerta con esta configuración" en el catálogo del `target_app`. No piden "agregar una acción nueva al menú" — piden "registrar una acción del manifest con estas capabilities y este dialog". No piden "construir una nueva ruta de ejecución" — piden "exponer una capacidad" + opcionalmente declarar un tipo de Solicitud/Tarea para los casos de Wizard of Oz. Flujo formal de alta para nuevas acciones, tipos del Inbox, tipos de alerta, reportes y series recurrentes. |
| 17 | **Impacto en cómo se ven y funcionan las apps** | Las apps actuales + las nuevas se ven y funcionan **igual** en lo que es transversal (header, sidebar, vistas, menú de acciones, panel de detalle, modal de cierre, Dashboard). Lo que cambia entre apps es el dominio (qué KPIs muestra, qué tipos de registro gestiona, qué tipos de alerta declara en su catálogo). El usuario que opera en LEX y OPS no aprende dos productos distintos — aprende uno con dos dominios. |
| 18 | **Las 4 sesiones que vienen** | Sesión 2: REQ-68 ACCIONES — el motor del manifest, distinción mutación / invocación, audit trail. Sesión 3: REQ-69 VISTAS + REQ-71 INBOX — las 3 vistas, drag-drop como invocación, el Centro de Solicitudes con matriz `type × execution_mode` y endpoint público invocable. Sesión 4: REQ-73 ALERTAS + REQ-59 REPORTES — catálogo del `target_app`, dependencias unificadas con `ConsumerTypeAssociation` + `satisfaction_mode`. Sesión 5: REQ-74 DASHBOARD + cierre — 4 cards mandatorias, indicador principal del área, card de gráfico de evolución. Recomendación de lectura previa de cada REQ en Jira la noche anterior. |
| 19 | **Lo que esperamos de ustedes** | Llegar con dudas reales — esta semana es para que los conceptos aterricen. Preguntas sobre implementación concreta, sobre integración con el stack actual de cada app, sobre puntos donde el paradigma no cierra. Las primeras semanas de implementación van a tener fricción; vale invertir el tiempo de refinamiento ahora. |
| 20 | **Q&A** | Slide simple con copy "Preguntas". |

## Speaker notes / puntos a enfatizar

- Slide 3-4: no apuntar al equipo actual. El problema no es la calidad del trabajo hecho — es la ausencia de un contrato compartido. Sin ese contrato, divergir era el camino natural.
- Slide 7: el concepto de "consumir el estándar declarando configuración" es el núcleo del cambio. Si los devs internalizan solo este punto, ya vale la sesión.
- Slide 9: el modelo conceptual unificado capa 1 es contraintuitivo al principio. Que una transición de Kanban "sea" una acción del manifest es una abstracción potente pero requiere repetirla con ejemplos.
- Slide 10: el principio "capacidades, no rutas" es la idea más transformadora del paradigma a nivel producto. Tomarse tiempo de explicarlo bien con el ejemplo del CLP/retiro. La consecuencia operativa más concreta — lanzar un producto con ejecución 100% humana desde día uno y automatizar después sin tocar el frontend — vale destacarla porque cambia cómo se planifica.
- Slide 15: el antes/después es el slide que más ancla el cambio. Tomarse tiempo de explicarlo bien, idealmente caminar el ejercicio mental con ellos.
- Slide 16: el cambio cultural impacta también al PM y a las áreas, no solo a Tech. Vale mencionarlo para que los devs entiendan que no es una imposición del producto.
- Slide 19: dejar claro que las preguntas críticas son bienvenidas. Si algún REQ no cierra, mejor descubrirlo ahora.

---

# Sesión 2 — REQ-68 ACCIONES (Manifest Engine)

## Objetivo

Profundizar en el motor de Acciones — la base habilitante sobre la que se construyen los demás REQs. Que los devs salgan entendiendo (a) qué es un manifest y cómo se declara, (b) la distinción `record_mutation` vs `function_invocation`, (c) el modelo de Capabilities + Grupos + Panel admin, (d) audit trail + stream de eventos, (e) la agrupación visual del menú de acciones, (f) cómo se da de alta una nueva acción.

## Duración

≈ 45 min de exposición + 15 min de Q&A. **Slides recomendados: 24.**

## Mensaje central

> Una acción del manifest es la unidad atómica de mutación o invocación del sistema. El catálogo de manifests es la única fuente de verdad de qué puede hacerse en la plataforma. Capabilities + Grupos viven una sola vez; el audit trail + stream son la espina dorsal de la observabilidad.

## Conceptos clave que deben quedar

1. **El manifest como contrato del módulo** — cada módulo declara qué acciones expone sobre sus registros, qué vistas soporta y qué ejes del Kanban tiene cuando aplica. El catálogo unificado de manifests se consume al boot.
2. **Modelo de la relación Acción × Registro × Capability** — una acción ejecuta sobre un registro de cierto tipo, requiere capabilities (heredadas vía Grupos), tiene tipo `record_mutation` o `function_invocation`, pertenece opcionalmente a un sub-grupo funcional, puede abrir un dialog, ejecuta un efecto al confirmar (mutación) o invoca una capacidad (invocación).
3. **`record_mutation` vs `function_invocation`** — discriminador clave. Mutación completa campos del registro fuente; invocación toma el registro como contexto e invoca otra cosa.
4. **Universalidad del menú de acciones** — todo registro en cualquier formato (lista, card, Kanban) tiene el menú. Sin acciones habilitadas, aparece deshabilitado con tooltip explicativo. Nunca desaparece.
5. **Agrupación visual en 2 niveles** — bloque `ASIGNACIÓN / IMPUTACIÓN` (mutaciones, admite sub-grupos del nivel 2 como `IMPUTACIÓN`, `CONCILIACIÓN`, `GOVERNANCE`, `DOCUMENTACIÓN`, `CIERRE`) + bloque `CONTEXTUALES` (invocaciones, siempre flat).
6. **Iconografía conceptual** — ✓ para `record_mutation` ("completar/marcar"); ↗ para `function_invocation` ("salir del registro a invocar algo"). Override declarable por acción.
7. **Capabilities + Grupos** — capabilities atómicas mantenidas por Producto. Grupos administrables con capabilities + memberships. Un usuario pertenece a múltiples grupos; sus capabilities efectivas son la unión.
8. **Capability provider** — servicio único del core que resuelve `user_id → capabilities[]`. Frontend y backend hablan la misma fuente.
9. **Panel admin** — entregable de este REQ. Gestión de Capabilities + Grupos + Memberships. Restringido a capability `manage_capabilities`.
10. **Audit trail + Stream** — log persistente consultable + stream en tiempo real. Misma fuente, dos planos. `activity_template` declarable por acción y resuelto al ejecutar.
11. **`invocation_source`** — 7 categorías (`menu`, `cta`, `kanban_drag`, `inbox_drawer_cta`, `inbox_trigger`, `batch`, `api`) que el motor registra como metadata. El motor no distingue por fuente.
12. **Flujo de alta de nuevas acciones (V1)** — solicitud estructurada del área → Producto valida → Tecnología implementa el manifest → deploy.

## El menú agrupado en 2 niveles — concepto visual

El menú de acciones, cuando se abre sobre un registro, presenta las opciones organizadas en dos niveles. El nivel 1 separa por **tipo de acción** (`action_type`):

| Bloque | Contiene | Sub-grupos del nivel 2 |
|---|---|---|
| `ASIGNACIÓN / IMPUTACIÓN` | Acciones `record_mutation` que completan campos / cambian estado del registro fuente | Admite sub-grupos funcionales |
| `CONTEXTUALES` | Acciones `function_invocation` que toman el registro como contexto e invocan otra cosa | Siempre flat (sin sub-grupos) |

El nivel 2 aparece **solo dentro del bloque `ASIGNACIÓN / IMPUTACIÓN`** y agrupa las mutaciones por sub-categoría funcional declarable por el manifest:

| Sub-grupo | Naturaleza | Ejemplos típicos del dominio |
|---|---|---|
| `IMPUTACIÓN` | Asignación de referencias del registro a entidades del dominio | Asignar Banco y Cuenta, Asignar Cliente, Asignar Cuenta de Origen |
| `CONCILIACIÓN` | Conciliación contra fuentes externas | Marcar Conciliado, Marcar con Diferencias |
| `GOVERNANCE` | Atributos de governance interna | Marcar como Intercompany, Cerrar período contable |
| `DOCUMENTACIÓN` | Estado documental del registro | Marcar como No facturable |
| `CIERRE` | Cierre del registro (estados terminales) | Marcar resuelta, Descartar (destructiva, label en rojo) |

Estos sub-grupos son **ejemplos observados**, no canónicos cross-módulos. Cada módulo declara los suyos según su dominio. La iconografía conceptual marca cada acción: ✓ para mutaciones, ↗ para invocaciones. El header del menú es **"ACCIONES DEL REGISTRO"** cuando se abre sobre una fila (row action) y **"ACCIONES"** cuando se abre desde el header del módulo (module CTA, sin registro fuente).

## Ejemplos del modelo

| Acción | placement | action_type | group | Mecánica conceptual |
|---|---|---|---|---|
| Asignar Banco y Cuenta (movimiento OPS) | row_action | record_mutation | IMPUTACIÓN | dialog + efecto al confirmar |
| Marcar Conciliado (movimiento OPS) | row_action | record_mutation | CONCILIACIÓN | efecto al confirmar directo |
| Marcar como Intercompany | row_action | record_mutation | GOVERNANCE | efecto al confirmar con set de campos |
| Descartar (alerta, destructiva) | row_action | record_mutation | CIERRE | confirmación; label en rojo |
| Generar Factura (sobre movimiento) | row_action | function_invocation | — | abre wizard de facturación |
| Ver movimientos de cliente | row_action | function_invocation | — | navega con filtros pre-aplicados |
| Validar whitelist (cuenta destino) | row_action | function_invocation | — | invoca capacidad, muestra resultado inline |
| Iniciar nuevo proceso de pricing (TRD) | module_cta | function_invocation | — | abre wizard sin contexto de registro |
| Cerrar período contable (FIN) | module_cta | record_mutation | GOVERNANCE | mutación masiva con confirmación |

## Slides sugeridos

| # | Título | Contenido |
|---|---|---|
| 1 | **Portada** | "REQ-68 ACCIONES — Manifest Engine". Sesión 2 de 5. |
| 2 | **Agenda** | (1) Qué problema resuelve, (2) Modelo de la relación Acción × Registro × Capability, (3) `record_mutation` vs `function_invocation`, (4) Capabilities + Grupos + Panel admin, (5) Universalidad del menú + agrupación visual, (6) Audit trail + Stream, (7) Flujo de alta de nuevas acciones, (8) Naturaleza del servicio, (9) Q&A. |
| 3 | **El problema actual** | Hoy la lógica de "qué puede hacer cada usuario" vive inline en el frontend de cada app — helpers ad-hoc por módulo, condicionales por rol esparcidas en cada vista. Tres consecuencias: divergencia inevitable, imposibilidad de cambiar la matriz de capabilities sin tocar UI en N lugares, ausencia de audit trail unificado. |
| 4 | **El modelo de la relación** | Diagrama: Acción → puede ejecutarse sobre Registro de un cierto Tipo → requiere Capability (heredada vía Grupos) → es `record_mutation` o `function_invocation` → pertenece a sub-grupo (opcional) → puede abrir Dialog → ejecuta efecto al confirmar (mutación) o invoca capacidad (invocación). |
| 5 | **El catálogo de manifests** | Cada módulo declara su catálogo: clave del manifest, tipo de registro que gobierna, acciones de fila (row actions), CTAs del módulo, ejes del Kanban cuando aplica. Los manifests se consumen al boot y forman el catálogo unificado. **Este catálogo es la única fuente de verdad de qué puede hacerse en la plataforma.** |
| 6 | **Qué declara cada acción del manifest** | Identificador, label, placement (row_action vs module_cta), `action_type`, sub-grupo opcional, capabilities requeridas, predicate de habilitación (sobre el registro y contexto), predicate de visibilidad opcional, feature flag opcional, template de actividad, icono override opcional, dialog si recoge campos, efecto al confirmar (mutación) o capacidad a invocar (invocación). |
| 7 | **`record_mutation` vs `function_invocation`** | Tabla comparativa con ejemplos: mutación completa campos del registro fuente; invocación toma el registro como contexto e invoca otra cosa. Híbridos: mutar y después invocar; invocar con efecto en el registro fuente al retornar ok. |
| 8 | **Ejemplos del patrón completo** | Tabla densa con 8-10 ejemplos reales del dominio. Columnas: Acción, placement, action_type, group, Mecánica conceptual. |
| 9 | **Universalidad del menú de acciones** | A partir de este REQ, todo registro de la plataforma en cualquier formato (lista, card, Kanban) tiene el menú montado. La presencia es invariante. Lo que varía es qué acciones aparecen habilitadas — resultado de evaluar el manifest contra capabilities + estado del registro. Sin acciones habilitadas → menú deshabilitado con tooltip "Sin acciones disponibles en el estado actual". Nunca desaparece. |
| 10 | **Agrupación visual del menú — 2 niveles** | Mockup conceptual del menú agrupado. Nivel 1: bloques por `action_type` (`ASIGNACIÓN / IMPUTACIÓN` para mutaciones, `CONTEXTUALES` para invocaciones). Nivel 2: sub-grupos funcionales del dominio (`IMPUTACIÓN`, `CONCILIACIÓN`, `GOVERNANCE`, `DOCUMENTACIÓN`, `CIERRE`) solo dentro de mutaciones. Header: "ACCIONES DEL REGISTRO" (row action) o "ACCIONES" (module CTA). |
| 11 | **Iconografía conceptual** | ✓ (check) para `record_mutation` — captura el patrón de "completar/marcar". ↗ (flecha externa) para `function_invocation` — captura "salir del registro a invocar algo". Override declarable por acción. Acciones destructivas: label en rojo, mismo icono del bloque. |
| 12 | **Capabilities atómicas** | Catálogo mantenido por Producto: identificador, label, descripción, dominio opcional. Las acciones del manifest las referencian. Sumar una capability es alta en el catálogo + propagación al motor. |
| 13 | **Grupos** | Agrupación administrable de capabilities + usuarios. Nombre, descripción, capabilities asignadas, miembros. Un usuario puede pertenecer a múltiples grupos; sus capabilities efectivas son la unión. |
| 14 | **Capability provider** | Servicio único del core. Resuelve `user_id → capabilities[]` vía Usuario → Grupos → Capabilities. Consumido por el motor (este REQ), REQ-59 (permissions de reportes), REQ-71 (target_role + manual creation capability), REQ-73 (target_role de Alertas), REQ-74 (filtrado del Dashboard), guards de ruta y APIs server-side. Misma fuente de verdad en frontend y backend. |
| 15 | **Panel admin de Grupos** | Entregable de este REQ. Tres vistas: **Capabilities** (catálogo con su uso), **Grupos** (con sus capabilities + miembros), **Usuario** (qué grupos integra + qué capabilities efectivas tiene). Acceso restringido a capability `manage_capabilities`. Vista de Usuario útil para troubleshooting de permisos. |
| 16 | **Motor de evaluación** | El motor recibe el contexto (registro + usuario + clave del manifest) y devuelve las acciones habilitadas con motivo legible cuando una está deshabilitada. Misma lógica disponible en cliente (qué mostrar) y servidor (validar antes de ejecutar). |
| 17 | **Audit trail — log persistente** | Cada ejecución persiste un evento del audit trail con campos canónicos: identificador del evento, acción, registro, usuario, fuente de invocación, parámetros, outcome, error opcional, estados antes/después, referencia al resultado cuando aplica, texto de actividad resuelto, timestamp. Consultable filtrable por registro, usuario, acción, manifest, fuente, rango de fechas. Base de governance, compliance y reportes regulatorios. |
| 18 | **Audit trail — stream en tiempo real** | El audit trail también emite eventos al stream con el mismo shape canónico. Consumidores internos: REQ-74 (feed de Actividades del Dashboard con `activity_template` resuelto), sistema de notificaciones (V2). Consumidores externos: Mixpanel, Amplitude, PostHog, Hubspot, cualquier servicio compatible con webhooks o pub/sub. Sumar un destino no requiere instrumentar nada en las apps. |
| 19 | **`activity_template`** | String templatizado declarado por cada acción del manifest (ej: "{user_name} generó un depósito para {record.cliente_nombre}") que se resuelve al ejecutar y queda registrado como texto de actividad del evento. Consumido por el feed de Actividades del Dashboard y por reportes regulatorios. |
| 20 | **`invocation_source` — 7 categorías** | `menu` (menú de acciones row), `cta` (CTA del header del módulo), `kanban_drag` (transición drag-drop), `inbox_drawer_cta` (CTA en el panel de detalle de Solicitud), `inbox_trigger` (trigger automático al crear Solicitud), `batch` (operación masiva), `api` (invocación server-side directa). El motor no distingue por fuente — ejecuta la misma lógica. La fuente es metadata para audit + analíticas. |
| 21 | **Flujo de alta de nuevas acciones (V1)** | (1) Área solicita acción con campos definitorios. (2) Producto valida coherencia (¿duplica una existente? ¿las capabilities existen? ¿el predicate de habilitación tiene sentido? ¿la capacidad referenciada existe en el otro módulo? ¿el sub-grupo solo está en mutaciones?). (3) Tecnología implementa la declaración en el manifest del módulo + tests. Si requiere una nueva capacidad o endpoint, se construye en paralelo. (4) Deploy. La acción aparece automáticamente en el menú. |
| 22 | **V2 — extensiones futuras** | Edición runtime del catálogo de manifests, versionado con migraciones automáticas, asistente IA para definir nuevas acciones desde descripciones funcionales, workflow de aprobación multi-paso. Exploración futura — V1 cubre la operación. |
| 23 | **Naturaleza del servicio** | Motor del manifest + componentes shared del core (menú de acciones, CTAs del módulo, dialog de acción, campos del dialog, runner de invocación, surface batch) + audit trail backend + capability provider backend + stream de eventos. Misma lógica del motor en cliente y servidor. |
| 24 | **Q&A** | Slide simple "Preguntas". |

## Speaker notes / puntos a enfatizar

- Slide 5: el manifest es una **declaración** del módulo, no código procedural. El motor lo consume y orquesta el comportamiento. Esto importa porque permite tipado, validación al boot, refactor seguro.
- Slide 7: si los devs solo entienden la distinción `record_mutation` vs `function_invocation` ya valió la sesión. Es el discriminador que organiza toda la mecánica del menú y de los flujos.
- Slide 9: enfatizar que la presencia del menú es invariante. Esto contradice patrones actuales donde el menú "desaparece" cuando no hay acciones — eso ya no aplica.
- Slide 10: si tienen tiempo, mostrar el mockup conceptual con un caso real del dominio (movimiento de OPS) para que aterrice.
- Slide 14: el capability provider es la pieza más cross-REQ. Si los devs entienden que es una sola fuente de verdad consumida por todos los REQs, entienden por qué los demás REQs son tan livianos en cuanto a permisos.
- Slide 17-18: el doble plano del audit trail es contraintuitivo. Insistir en que es la **misma fuente** — log persistente Y stream — no dos sistemas.
- Slide 21: el flujo de alta es el cambio cultural más importante. Una nueva acción es un cambio de declaración + deploy, no un proyecto.

---

# Sesión 3 — REQ-69 VISTAS + REQ-71 INBOX

## Objetivo

Cubrir las dos piezas que se construyen directamente sobre el motor de Acciones. **REQ-69 VISTAS** introduce el contrato de visualización de registros (Lista / Tarjetas / Tablero) + el motor de Ejes + drag-drop como invocación al motor de Acciones. **REQ-71 INBOX** entrega el **Centro de Solicitudes** — el módulo umbrella que aterriza todo trabajo que requiere intervención humana del backoffice, con la matriz `type × execution_mode`, asignación manual, endpoint público invocable como primitiva común, evidencias en el panel de detalle, dos vistas top-level (Mi bandeja + Mis enviadas) y series recurrentes.

Que los devs salgan entendiendo (a) cómo se declaran las 3 vistas en un módulo, (b) cómo funciona el Tablero state-driven con Ejes, (c) cómo una transición de Kanban es una acción del manifest, (d) qué es el modal de cierre shared, (e) el principio "capacidades, no rutas" como fundación del Centro, (f) qué aterriza dentro del Centro y qué queda fuera (scope explícito), (g) la matriz `type × execution_mode`, (h) los 5 estados canónicos incluyendo `failed`, (i) `assignee` independiente del `owner`, (j) los 4 caminos de creación, (k) el endpoint público invocable como primitiva común, (l) cómo se declaran triggers automáticos y CTAs en el panel de detalle, (m) evidencias, fechas y vistas del usuario, (n) series recurrentes.

## Duración

≈ 75 min de exposición + 15 min de Q&A. **Slides recomendados: 32** (12 para REQ-69 + 19 para REQ-71 + 1 cierre).

## Mensaje central

> Las 3 vistas son representaciones del mismo record set filtrado. Una transición drag-drop del Kanban es literalmente una acción del manifest del módulo invocada con `invocation_source: 'kanban_drag'`. El modal de cierre es el surface de cierre compartido del core. El Centro de Solicitudes aterriza solo trabajo que requiere intervención humana; los jobs programáticos puros viven fuera. Los CTAs externos invocan capacidades del `target_app`, no rutas — la capacidad decide internamente si crea Solicitud/Tarea en el Centro o si ejecuta directo. La matriz `type × execution_mode` cubre los cuadrantes; el endpoint público invocable es la primitiva común de las ejecuciones programáticas. Una Solicitud/Tarea no es un registro pasivo: triggerea acciones del manifest al caer y expone CTAs invocables.

## Bloque 1 — REQ-69 VISTAS

### Conceptos clave que deben quedar

1. **Tres vistas declarables** — Lista, Tarjetas, Tablero. Las tres comparten record set y filtros. Cambiar de vista no cambia el set.
2. **Filtros como capa anterior a las vistas** — se aplican al record set del módulo. Las 3 vistas son representaciones del mismo set filtrado.
3. **Vista Tablero state-driven** — columnas dinámicas según el eje activo (campo enum del registro). Cantidad de columnas = cantidad de valores del eje.
4. **Ejes redefinibles por el usuario** — un módulo puede declarar múltiples ejes; el usuario elige cuál ver en runtime. Cambiar el eje no cambia el record set.
5. **Drag-drop como invocación al motor** — cada transición del Kanban declara `{from, to, action_id}` referenciando una acción `record_mutation` del manifest. La mecánica se deriva: si la acción declara dialog → modal de cierre con campos; sin dialog → mutación directa.
6. **Modal de cierre shared** — surface compartido del core. Wrapper temático del modal de acción del manifest con header y copy específicos para cierre. Misma mecánica de campos, validación y persistencia. Reutilizable en Inbox, transiciones de Kanban y cualquier acción de cierre con dialog.
7. **Universalidad del menú de acciones también en cards del Kanban** — drag-drop y menú son rutas equivalentes; difieren solo en `invocation_source` (`kanban_drag` vs `menu`).
8. **Cards no draggables** — dos razones: (a) estado en valores terminales del eje, (b) motor reporta todas las transiciones disabled para el usuario.
9. **Cap blando por columna** — V1; virtualización completa es V2.
10. **Empty state por columna** — placeholder con copy "Sin registros en este estado"; la columna no se colapsa.

### Slides sugeridos REQ-69 (12 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-69 — Vistas + Ejes** | Portada del bloque. |
| 2 | **El problema** | Cada app reimplementa Lista, Tarjetas, Kanban sin contrato compartido. Tres consecuencias: divergencia, no reuso, dificultad de mantener consistencia visual. |
| 3 | **Tres vistas declarables** | El módulo declara qué vistas soporta. El toggle de vistas se renderiza cuando hay más de una. Cambiar de vista no cambia el record set ni los filtros activos. |
| 4 | **Filtros como capa anterior** | Diagrama: Record set del módulo → Filtros + Search → Set filtrado → Lista / Tarjetas / Tablero como 3 representaciones del mismo set. |
| 5 | **Vista Lista + Vista Tarjetas** | Lista: tabla con paginación, sorting, search, filtros, selección múltiple. Tarjetas: grid responsive con plantilla declarada por el módulo. Ambas comparten filtros y record set. |
| 6 | **Vista Tablero state-driven** | Las columnas se generan dinámicamente del eje activo. Cantidad de columnas = cantidad de valores del eje. Cards ordenan por el campo declarado (default `created_at` desc). |
| 7 | **Qué declara un eje del Kanban** | Identificador, label, campo del registro (dimensión del eje), valores válidos en el orden visual deseado, labels por columna, valores terminales (cards no draggables), ordenamiento intra-columna, transiciones permitidas. |
| 8 | **Ejes redefinibles por el usuario** | Un módulo declara múltiples ejes; el usuario elige cuál ver. El selector de eje se renderiza en el header del módulo. Cambiar el eje no cambia el record set ni los filtros. |
| 9 | **Drag-drop como invocación al motor** | Cada transición declara `{from, to, action_id}` referenciando una acción `record_mutation` del manifest. **El eje no duplica capabilities, ni efectos, ni dialog — todo eso vive en la acción del manifest, única fuente de verdad.** Flujo: drop → busca transición → consulta motor → si disabled, toast con reason; si habilitada y declara dialog, abre el modal de cierre; si habilitada sin dialog, ejecuta efecto directo + toast. |
| 10 | **Modal de cierre shared** | Surface compartido del core. Wrapper temático del modal de acción del manifest con header y copy específicos para cierre (ej: "Cerrar Solicitud", "Resolver alerta", "Emitir factura"). Misma mecánica de campos, validación y persistencia. Backdrop NO cierra el modal — cierre intencional. Reutilizable en Inbox, transiciones de Kanban, cualquier acción de cierre. |
| 11 | **Universalidad del menú + Cards no draggables** | Las cards del Kanban renderizan el menú de acciones igual que rows y cards de la vista Tarjetas. Drag-drop y menú son rutas equivalentes (difieren solo en `invocation_source`). Cards no draggables cuando (a) estado en valores terminales del eje o (b) motor reporta todas las transiciones disabled. |
| 12 | **Cap blando + Empty states** | Cap blando por columna en V1 (virtualización completa es V2). Empty state por columna: "Sin registros en este estado" (columna no se colapsa). |

## Bloque 2 — REQ-71 INBOX (Centro de Solicitudes)

### Conceptos clave que deben quedar

1. **"Centro de Solicitudes" como umbrella** — denominación universal vinculante para todas las apps. La UI muestra dos categorías diferenciadas (Solicitudes / Tareas) bajo motor único.
2. **Principio arquitectónico: capacidades, no rutas** — un CTA externo invoca una capacidad del `target_app`, no una ruta de ejecución. La capacidad decide internamente si la ejecuta vía integración directa (no toca el Centro, resultado inmediato) o si crea trabajo en el Centro (resultado eventual). El CTA se suscribe al estado y muestra "en proceso" / "completado" / "rechazado" al consumidor. **Habilita el Wizard of Oz arquitectónico** — lanzar con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo.
3. **Scope explícito** — el Centro aterriza solo trabajo que requiere intervención humana del backoffice. Jobs programáticos puros (sync, audit, normalización, cron internos) viven en código como tareas de infraestructura de Tecnología, fuera del Centro. Intersección: un job programático puede declarar fallback opt-in al Centro al fallar.
4. **Matriz `type × execution_mode`** — `type: 'request' | 'task'` (origen humano vs programático del pedido) cruzado con `execution_mode: 'human' | 'programmatic'` (modo de ejecución). Cuatro cuadrantes:

   | `type` | `execution_mode` | Cuadrante | Visible en Inbox |
   |---|---|---|---|
   | `request` | `human` | Solicitud humana | Siempre |
   | `task` | `human` | Tarea humana | Siempre |
   | `request` | `programmatic` | Función invocada | Solo si `state === 'failed'` |
   | `task` | `programmatic` | Background job | Solo si `state === 'failed'` |

5. **Inbox como vista filtrada del Centro** — el Centro persiste **todas** las ejecuciones (humanas y programáticas) en base de datos para audit. El Inbox solo renderiza las que requieren acción humana en este momento. Regla canónica: `execution_mode === 'human' OR state === 'failed'`.
6. **5 estados canónicos** — `pendiente`, `en_proceso`, `completed`, `rejected`, `failed`. `failed` aplica solo a registros con `execution_mode: 'programmatic'` cuando el endpoint público devolvió error. Retry manual en V1 desde el panel de detalle o desde una Alerta asociada.
7. **Endpoint público invocable como primitiva común** — toda entrada del catálogo con `execution_mode: 'programmatic'` declara un endpoint público que ejecuta la lógica del tipo. Es la primitiva común de **cuatro escenarios de invocación**: scheduler (sistema), acción del manifest (operador desde otra vista), retry desde el panel de detalle del Inbox, retry desde una Alerta. Desde la perspectiva del endpoint, los cuatro son indistinguibles — mismo payload, mismo retorno (`status, result, error_reason`). Lo único que cambia es la identidad del invocador y la metadata del audit trail.
8. **Una Solicitud no es un registro pasivo** — es un espacio de trabajo que puede triggerear acciones automáticas al caer al Inbox + habilitar CTAs invocables en el panel de detalle + cerrar con un closeAction justificado.
9. **Solicitud vs Tarea — discriminador `type`** — Solicitud (`type: 'request'`) = pedido de algo, típicamente con componente de decisión (vocabulario: aprobar/rechazar). Tarea (`type: 'task'`) = pedido de ejecución de acciones concretas (vocabulario: completar/cancelar). La mecánica subyacente es **idéntica** — solo cambia el vocabulario de los closeActions y opcionalmente los labels de los estados.
10. **Inbox vs Alertas** — Inbox modela **pedidos** (humanos o de sistemas que necesitan que alguien atienda). Alertas modela **detecciones sistémicas** (condiciones del dominio detectadas algorítmicamente). Si el origen es un pedido → Inbox; si es detección algorítmica → Alertas. Comparten infraestructura (panel de detalle, timeline, comments, motor de routing por `target_role`).
11. **Asignación manual (`assignee`)** — opcional, editable en cualquier estado no terminal, **independiente del `owner`**. Setable al crear o posteriormente vía la acción del manifest "Asignar/Reasignar/Liberar". Routing prioriza `assignee` sobre `target_role` sobre app entero.
12. **Cuatro caminos de creación** — (a) manual desde otra app del core, (b) manual desde el propio módulo Inbox cuando el tipo declara `creable_manualmente: true`, (c) automática vía API (con identidad del invocador; cubre escalamiento de jobs programáticos con `source_app: 'system'`), (d) automática recurrente (scheduler del Inbox sobre series recurrentes).
13. **Triggers automáticos al crear** — acciones del manifest del módulo destino invocadas con `invocation_source: 'inbox_trigger'`.
14. **CTAs en el panel de detalle** — acciones del manifest del módulo destino invocadas con `invocation_source: 'inbox_drawer_cta'`. Renderizadas filtradas por capability del usuario.
15. **Modal de cierre con closeActions por tipo** — radio buttons con opciones válidas + comentario obligatorio (mínimo 10 caracteres). El closeAction elegido determina el estado terminal.
16. **Evidencias** — sección del panel de detalle / modal de cierre. Tres tipos canónicos: `manual_check` (confirmación humana de ejecución), `attachment` (archivo adjunto de soporte), `system_log` (log del endpoint cuando `execution_mode: 'programmatic'`, populado automáticamente). Coexisten con closeAction + comentario — capturan **cómo se demostró el trabajo**. Inmutables tras cierre.
17. **Tres fechas semánticas** — `created_at` (persistencia técnica), `requested_at` (cuando se solicita formalmente — puede ser futura para generación anticipada por consumidor-tipo), `due_at` (deadline).
18. **Dos vistas top-level del usuario** — "Mi bandeja" (lo que el usuario tiene que ejecutar: `assignee = user_actual` o `target_role` corresponde) y "Mis enviadas" (lo que el usuario creó hacia otros: `source_user = user_actual`).
19. **Notificaciones in-app primarias** — badge en sidebar (mandatorio, real-time, prioriza `assignee` → `target_role` → app entero) + notificación del navegador (opt-in). Email y Slack opcionales declarables por tipo. Otros canales en V2.
20. **Series recurrentes** — entidad `RecurringInboxItemDefinition` que declara series con cadencia + payload template + `default_assignee` + `series_state`. El scheduler del Inbox genera **instancias** independientes en cada ciclo, cada una con lifecycle propio. Instancias incompletas no bloquean siguientes.
21. **Naming híbrido** — prosa de documentación y UI en español ("Solicitud", "Tarea", "Mi bandeja", "Mis enviadas"); campos del modelo en inglés (`type`, `execution_mode`, `state`, `assignee`).
22. **Hoy ningún tipo ni serie está definido** — este REQ entrega el Centro como infraestructura. Las áreas darán de alta sus tipos y series progresivamente vía flujo formal (V1).

### Ejemplos del modelo

Ejemplos ilustrativos de tipos del catálogo del `target_app`. **Aclarar siempre:** hoy ningún tipo está definido — las áreas los darán de alta progresivamente.

| Concept | `type` | `execution_mode` | Origen → Destino | Wizard of Oz? | Trigger al crear | CTAs en el panel | closeActions típicos |
|---|---|---|---|---|---|---|---|
| `withdrawal_request` | `request` | `human` | CLP → OPS | Sí — OPS decide si lo ejecuta directo o crea Solicitud | Crear Movimiento Withdrawal en borrador | Validar whitelist, Ejecutar retiro | Aprobado y procesado / Rechazado |
| `extract_request` | `request` | `human` | CLP → OPS | Sí — OPS puede ejecutarlo directo si el reporte es trivial | Generar reporte | Reenviar al cliente, Regenerar | Enviado / Cancelado |
| `kyc_review` | `request` | `human` | CLP → LEX | Sí — LEX puede aprobar automáticamente si supera score | Crear ticket de revisión | Aprobar KYC, Solicitar documentación | Aprobado / Rechazado |
| `manual_load_approval` | `request` | `human` | OPS → FIN | No — siempre humano | — | Validar carga, Generar asiento | Aprobado / Devuelto |
| `daily_reconciliation` | `task` | `human` | sistema (recurrente) → OPS | No — trabajo humano por definición | — | Confirmar conciliación, Reportar diferencias | Hecha / Con diferencias |
| `monthly_nostros_review` | `task` | `human` | sistema (recurrente) → FIN | No — trabajo humano por definición | — | Validar Nostros, Reportar matching | Revisada / Pendiente cierre |
| `daily_balance_sync` | `task` | `programmatic` | sistema (recurrente) → OPS | No — invoca endpoint sync de saldos | — | Retry manual cuando falla | (auto-cierra al `completed`; visible solo si `failed`) |

### Slides sugeridos REQ-71 (19 slides)

| # | Título | Contenido |
|---|---|---|
| 13 | **REQ-71 — Centro de Solicitudes** | Portada del bloque. |
| 14 | **El problema** | Hoy el trabajo operativo cae en Slack, mail, planillas, hilos sueltos. Sin owner formal, sin audit trail, sin closure justificado, sin posibilidad de invocar funcionalidad del sistema desde la conversación misma. Las áreas necesitan un estándar formal con audit trail nativo. |
| 15 | **"Centro de Solicitudes" — umbrella universal** | Denominación vinculante para todas las apps del core. La UI muestra dos categorías (Solicitudes / Tareas) diferenciadas por `type` y label/badge. **El motor es uno solo** — la mecánica (estados, transiciones, audit trail, triggers, routing) es idéntica entre Solicitudes y Tareas. Lo que cambia es el vocabulario de los closeActions y opcionalmente los labels de los estados. |
| 16 | **Principio arquitectónico: capacidades, no rutas** | Un CTA externo (en CLP, Pago Directo, RFQ Gateway) invoca una **capacidad** del `target_app`, no una ruta de ejecución específica. La capacidad decide internamente: integración directa (no toca el Centro, resultado inmediato) o crea Solicitud/Tarea en el Centro (resultado eventual; el CTA se suscribe al estado). **Wizard of Oz arquitectónico:** lanzar con ejecución 100% humana desde día uno y automatizar progresivamente sin tocar el CTA externo. Ejemplo: usuario del CLP clickea "Retirar" → el CTA invoca `ejecutar_retiro` de OPS → OPS decide internamente si lo procesa vía integración directa o si crea Solicitud al Centro → el usuario del CLP no se entera del path. |
| 17 | **Scope explícito del Centro** | El Centro aterriza **solo trabajo que requiere intervención humana del backoffice**. Lo que NO vive en el Centro: jobs programáticos puros (sync de registros, auditoría, depuración, normalización, cron jobs internos) — son infraestructura técnica que vive en código como tareas de Tecnología. **Intersección:** un job programático puede declarar **fallback opt-in al Centro**; al fallar, si el fallback está habilitado, invoca el endpoint del Centro con `source_app: 'system'` y crea trabajo para escalamiento humano. Sin fallback, el fallo dispara alerta vía observabilidad sin tocar el Centro. |
| 18 | **Matriz `type × execution_mode`** | Diagrama de la matriz: `type: 'request' | 'task'` × `execution_mode: 'human' | 'programmatic'`. Cuatro cuadrantes con descripción de qué cae en cada uno (Solicitud humana, Tarea humana, Función invocada, Background job). Regla canónica del Inbox: solo se renderiza `execution_mode === 'human' OR state === 'failed'`. Todo persiste en base de datos para audit; el Inbox es vista filtrada. |
| 19 | **5 estados canónicos** | `pendiente`, `en_proceso`, `completed`, `rejected`, `failed`. Tabla con descripción de cada uno. `failed` aplica solo a `execution_mode: 'programmatic'` cuando el endpoint devolvió error — el registro se vuelve visible en el Inbox para retry manual. Estados terminales (`completed`, `rejected`, `failed` cuando el operador decide no reintentar) inmutables. |
| 20 | **Inbox vs Alertas — las dos patas de la comunicación operativa** | Inbox modela **pedidos** (humanos o de sistemas que necesitan que alguien atienda). Alertas modela **detecciones sistémicas** (condiciones del dominio detectadas algorítmicamente). Si el origen es un pedido → Inbox. Si es detección algorítmica del sistema → Alertas. Comparten infraestructura (panel de detalle, timeline, comments, motor de routing por `target_role`) pero modelos de datos y mecánicas distintas. |
| 21 | **Solicitud vs Tarea — discriminador `type`** | Tabla comparativa: Solicitud (`type: 'request'`) = pedido de algo, típicamente con componente de decisión, vocabulario aprobar/rechazar/procesar. Tarea (`type: 'task'`) = pedido de ejecución, típicamente sin decisión, vocabulario completar/cancelar. **Mecánica idéntica.** Solo cambian closeActions por tipo y opcionalmente labels de estados. Los filtros del Inbox permiten ver Solicitudes / Tareas / Todas. |
| 22 | **Una Solicitud/Tarea no es un registro pasivo** | Es un **espacio de trabajo**. Puede (a) triggerear acciones automáticas al caer al Inbox vía `triggers_on_create[]`, (b) habilitar CTAs invocables en el panel de detalle vía `available_actions[]`, (c) cerrar con un closeAction declarado por el tipo + comentario justificatorio. |
| 23 | **Endpoint público invocable como primitiva común** | Toda entrada del catálogo con `execution_mode: 'programmatic'` declara un endpoint público. Es la primitiva común que comparten **cuatro escenarios de invocación**: (a) scheduler (sistema con identidad `system`), (b) acción del manifest (operador desde una vista del módulo destino), (c) retry desde el panel de detalle del Inbox (operador del área), (d) retry desde una Alerta (operador del área). **Desde la perspectiva del endpoint, los cuatro son indistinguibles** — mismo payload, mismo retorno (status, result, error_reason). Lo único que cambia es la identidad del invocador y la metadata del audit trail. Consecuencia: **todo lo programáticamente ejecutable es invocable desde la UI**. Si un tipo falla, el operador siempre tiene un botón de Retry. |
| 24 | **Asignación manual (`assignee`) — independiente del `owner`** | Tabla: `assignee` = a quién está dirigida (puede setearse al crear o después, opcional); `owner` = quién la está trabajando ahora (auto-asignado en `en_proceso`). Editable en cualquier estado no terminal vía la acción del manifest **"Asignar/Reasignar/Liberar"**. Cualquier usuario con capability de gestión del Inbox del `target_app` puede asignar. Cada cambio registra evento del audit trail. **Priorización de notificaciones:** `assignee` definido → solo ese usuario recibe el highlight. Sin `assignee` con `target_role` → usuarios con la capability del `target_role`. Sin `assignee` ni `target_role` → usuarios con capability genérica de Inbox del `target_app`. |
| 25 | **Cuatro caminos de creación** | Tabla: (a) **Manual desde otra app del core** — módulo invoca el endpoint con identidad del usuario (ej: CLP genera `withdrawal_request` a OPS). (b) **Manual desde el propio módulo Inbox** — CTA "Crear Solicitud/Tarea" filtrado a tipos con `creable_manualmente: true`, requiere `manual_creation_capability`. (c) **Automática vía API** — backend del core o sistema externo invoca con su identidad; cubre escalamiento de jobs programáticos que declaran fallback opt-in al Centro (`source_app: 'system'`). (d) **Automática recurrente** — scheduler del Inbox dispara instancias según series recurrentes con `series_state: 'active'`. En todos los casos: validación del tipo en el catálogo del `target_app`, derivación de `type` y `execution_mode`, persistencia con `state: 'pendiente'`, ejecución de triggers al crear, disparo de notificaciones. |
| 26 | **Triggers automáticos al crear** | Al persistirse la Solicitud/Tarea, el sistema dispara las acciones declaradas **antes de notificar**. Son acciones del manifest del módulo destino con `invocation_source: 'inbox_trigger'` y mapeo desde el payload de la Solicitud al input de la acción. Status y referencia al resultado quedan registrados en `triggered_actions[]` y se muestran en el panel correspondiente del panel de detalle. Ejemplo: `extract_request` triggerea generación del reporte; `withdrawal_request` crea Movimiento Withdrawal en borrador pre-vinculado. Las Tareas pueden no tener triggers — la Tarea misma ES el trabajo. |
| 27 | **CTAs en el panel de detalle** | Al abrir el panel de detalle, se renderizan los CTAs declarados que el usuario actual tiene capability para invocar (motor evalúa predicates vía REQ-68). Cada CTA es una acción del manifest del módulo destino con `invocation_source: 'inbox_drawer_cta'`. Ejemplos: "Validar whitelist", "Ejecutar retiro", "Generar asiento contable". Las transiciones de estado (tomar, liberar, resolver) también son acciones del manifest. |
| 28 | **Evidencias en el panel de detalle / modal de cierre** | Sección del panel de detalle con tres tipos canónicos. `manual_check`: aplica a tipos con `execution_mode: 'human'` — confirmación humana de ejecución (`{ confirmed: true, confirmed_at }`). `attachment`: aplica a tipos con `execution_mode: 'human'` — archivos de soporte (`{ file_ref, file_name, mime_type, size_bytes }`). `system_log`: aplica a tipos con `execution_mode: 'programmatic'` — log del endpoint (`{ log_text, status, endpoint_response_ref }`), populado automáticamente. **Coexisten con closeAction + comentario** — capturan **cómo se demostró el trabajo**, no qué se decidió. Inmutables tras cierre. Base para audit interno y compliance regulatoria. |
| 29 | **Tres fechas semánticas + Dos vistas del usuario** | Tres fechas: `created_at` (persistencia técnica), `requested_at` (cuando se solicita formalmente — puede ser futura para generación anticipada por consumidor-tipo, ej: reporte UIF se ejecuta el día 15, asociación con lead 5 días → instancia creada el día 10 con `requested_at = día 10`, `due_at = día 15`), `due_at` (deadline). Dos vistas top-level: **Mi bandeja** (lo que el usuario tiene que ejecutar: `assignee = user_actual` o `target_role` corresponde) y **Mis enviadas** (lo que el usuario creó hacia otros: `source_user = user_actual`, para seguimiento sin recorrer el módulo destino). Las Tareas generadas por sistema (sin `source_user`) no aparecen en "Mis enviadas" de nadie — solo en "Mi bandeja" de los destinatarios. |
| 30 | **Notificaciones in-app primarias** | El Centro es destino primario obligatorio. Sobre eso: **Badge en sidebar** (mandatorio, real-time, prioriza `assignee` → `target_role` → app entero). **Notificación del navegador** (opt-in, cuando una Solicitud/Tarea cae al Inbox del usuario con la app abierta en otra pestaña). **Email** (opcional por tipo). **Slack** (opcional por tipo). El mensaje en Slack es solo aviso — gestión siempre in-app. Otros canales (MS Teams, SMS, WhatsApp, push nativo móvil) en V2. |
| 31 | **Series recurrentes** | Casos típicos: `daily_reconciliation` para OPS; `monthly_nostros_review` para FIN; `weekly_offsite_backup` cada lunes. Se modela como **serie recurrente** (`RecurringInboxItemDefinition`) que genera **instancias** según una cadencia. **Modelo serie ↔ instancia:** la serie es la definición; las instancias son registros independientes con `recurring_definition_id`, lifecycle propio, owner propio, closeAction propio. **Cada instancia es independiente** — la del día X que no se completó a tiempo no bloquea la del día X+1; coexisten en el Inbox. **Scheduler del Inbox:** job periódico que identifica definiciones activas cuya `next_creation_date` venció, invoca el endpoint con `source_app: 'system'`, `recurring_definition_id`, `default_assignee` y demás campos declarados, actualiza `next_creation_date`. Estados de la serie: `active` / `paused` / `archived`. |

## Slide de cierre (común a ambos bloques)

| # | Título | Contenido |
|---|---|---|
| 32 | **Q&A — Vistas + Inbox** | Preguntas sobre ambos REQs juntos. Conexión: Inbox declara las 3 vistas, las transiciones del Kanban son acciones del manifest, el modal de cierre shared se reutiliza. |

## Speaker notes / puntos a enfatizar

- Slide 9 (drag-drop como invocación): este es el punto donde la integración entre REQ-69 y REQ-68 se vuelve concreta. Si lo aterrizan, entienden el modelo conceptual unificado capa 1 del paradigma.
- Slide 10 (modal de cierre shared): insistir en que es el mismo surface temático, no un componente nuevo. Es una variante del modal de acción del manifest con header y copy específicos.
- Slide 16 (capacidades, no rutas): este es el punto más transformador a nivel de cómo se conciben los productos. Tomarse tiempo. El ejemplo del CLP/retiro debe quedar muy claro. La consecuencia operativa más concreta — lanzar con ejecución 100% humana desde día uno — vale destacarla porque cambia la planificación de roadmap.
- Slide 17 (scope explícito): explicar que el Centro NO es para todo lo que un sistema pueda hacer automatizado. Solo lo que requiere intervención humana. Los jobs programáticos puros viven en código como tareas de infraestructura de Tecnología.
- Slide 18 (matriz `type × execution_mode`): este es el modelo nuevo más importante de este REQ. Tomarse tiempo de explicar los cuatro cuadrantes con ejemplos concretos. La regla canónica de visibilidad del Inbox (`execution_mode === 'human' OR state === 'failed'`) cierra el modelo.
- Slide 19 (5 estados): aclarar que `failed` es un quinto estado nuevo. Aplica solo a programáticos. Los humanos no van a `failed` — su falla se modela como `rejected` (decisión del operador).
- Slide 21 (Solicitud vs Tarea con `type`): la distinción es **semántica y de presentación**, no de mecánica. Si los devs entienden que es el mismo motor con un campo discriminador, no hay riesgo de que reimplementen mecanismos paralelos.
- Slide 22 (una Solicitud no es un registro pasivo): este es el insight central de REQ-71 conceptualmente. Es un espacio de trabajo activo.
- Slide 23 (endpoint público invocable como primitiva común): este es uno de los conceptos más potentes del modelo. Insistir en que los cuatro escenarios son indistinguibles para el endpoint. Consecuencia: todo lo programático es retriable desde la UI por el operador.
- Slide 24 (`assignee` vs `owner`): la diferencia es la pregunta más frecuente. Aterrizarla con ejemplo: yo te asigno una Solicitud (`assignee = Mauro`) pero Mauro está de viaje, así que Belén la toma (`owner = Belén`). Ambos datos quedan registrados.
- Slide 28 (evidencias): aclarar que evidencias capturan **cómo se demostró el trabajo**, no qué se decidió. closeAction + comentario capturan la decisión; evidencias capturan la prueba.
- Slide 31 (series recurrentes): el concepto serie ↔ instancia es contraintuitivo. Insistir en que **cada instancia es independiente** — no es "una tarea que se reprograma", son N tareas con la misma plantilla.

---

# Sesión 4 — REQ-73 ALERTAS + REQ-59 REPORTES

## Objetivo

Cubrir los dos módulos genéricos que cierran el set de gestión operativa. **REQ-73 ALERTAS** entrega el Centro de Alertas con el principio "el tipo pertenece al catálogo del `target_app`" y estados simplificados (Nueva / Resuelta / Descartada). **REQ-59 REPORTES** entrega el servicio transversal del core para reportes regulatorios/contables/operativos/internos con permissions de 4 niveles, dependencias unificadas bajo `ConsumerTypeAssociation` con `satisfaction_mode`, y coordinación inter-área a través de Tareas al Inbox del `blocking_app`.

Que los devs salgan entendiendo (a) el catálogo del `target_app` como fuente del tipo de alerta, (b) los 3 estados canónicos, (c) capacidades opcionales declarables por tipo, (d) el modelo de permissions de Reportes en 4 niveles, (e) `ConsumerTypeAssociation` con `satisfaction_mode` como mecanismo unificado de dependencias, (f) el flujo de coordinación inter-aplicación, (g) los eventos sistémicos de Reportes hacia Alertas, (h) el scheduler de CRON, (i) los flujos de alta para nuevos tipos.

## Duración

≈ 75 min de exposición + 15 min de Q&A. **Slides recomendados: 30** (13 para REQ-73 + 16 para REQ-59 + 1 cierre).

## Mensaje central

> El tipo de alerta pertenece al catálogo del `target_app`, no al emisor — cualquier código del sistema dispara la ingesta para un tipo del catálogo; la identidad del invocador queda como metadata. Tres estados canónicos: Nueva, Resuelta, Descartada. La diferenciación entre presentaciones de UI vive a nivel del app que renderiza. Reportes tiene permissions de 4 niveles + dependencias unificadas bajo `ConsumerTypeAssociation` con `satisfaction_mode` (`generate_new` para crear instancias nuevas en el Inbox cuando se acerca el deadline; `verify_existing` para verificar trabajo ya realizado dentro de una ventana). Ambos consumen el capability provider de REQ-68.

## Bloque 1 — REQ-73 ALERTAS

### Conceptos clave que deben quedar

1. **El gap que cubre** — gestión formal de alertas para el backoffice, con audit trail nativo, asignación formal a responsables, documentación del tratamiento, cierre justificado y base consultable para reportería. Reemplaza Slack (no apto para gestión formal) y Grafana (diseñado para devs, no para backoffice). No los reemplaza como canales — los complementa.
2. **Componente regulatorio** — varias entidades del grupo están en falta de cumplimiento normativo por no contar con un sistema formal de gestión de alertas con trazabilidad para UIF, BCRA, CNV, FATF.
3. **El tipo pertenece al catálogo del `target_app`** — principio canónico. Cualquier código del sistema (integración directa, job programático, acción del manifest, ingreso manual) puede disparar la ingesta para un tipo del catálogo. La identidad del invocador (`source_app`, `source_module`) queda como **metadata del audit trail**, no como ownership del tipo. Refuerza el Wizard of Oz arquitectónico al nivel del catálogo de tipos.
4. **Tres estados canónicos** — `Nueva` (recién detectada), `Resuelta` (atendida con outcome positivo), `Descartada` (atendida con outcome negativo o no aplica). Sin sub-categorías del tipo. La diferenciación entre presentaciones de UI (triage rápido vs trámite formal con justificación) vive a nivel del **app que renderiza**, no del tipo.
5. **Capacidades opcionales por tipo** — severidad, asignación a usuario/área, panel de detalle + timeline + comments, modal de cierre con justificación, auto-cierre, filtros del histórico, KPIs sumarizados, vista Tablero (Kanban), push notifications.
6. **Slack como notificación push opcional** — capacidad declarable por tipo. La gestión ocurre siempre en el Centro; Slack es solo aviso con link directo.
7. **Eventos sistémicos de Reportes hacia Alertas** — Reportes emite tipos sistémicos al Centro de Alertas (`reporte_proximo_emision_auto`, `reporte_vencido`, `reporte_emitido_automaticamente`, `reporte_error_generacion`, `reporte_dependencias_incompletas`).
8. **REPORT_DEPENDENCY no vive en Alertas** — se modela como Tarea al Inbox del `blocking_app` con `auto_archive`. Razón conceptual: es un pedido de completar trabajo concreto, no una condición detectada. Detalle en bloque REQ-59.
9. **REQ-52 + REQ-33 desbloqueados** — eran pedidos pendientes de Centro de Alertas para LEX y TRD, bloqueados por falta de infra. Con REQ-73 dejan de ser proyectos de infraestructura y pasan a ser configuración del estándar.
10. **API de ingesta cross-app** — endpoint del core consumible desde cualquier backend del core o sistema externo. Una alerta = un `target_app`.
11. **Flujo de alta de nuevos tipos** — V1 manual con formato estándar; V2 evaluable (IA Playground).

### Slides sugeridos REQ-73 (13 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-73 — Centro de Alertas** | Portada del bloque. |
| 2 | **El problema** | Hoy las alertas llegan a Slack (sin trazabilidad estructurada, sin owner formal, sin audit trail) y a Grafana (diseñado para devs, no para backoffice). Las áreas no operan en Grafana; necesitan un sistema con su lenguaje, sus flujos, su modelo de tratamiento. |
| 3 | **Componente regulatorio** | Varias entidades del grupo están en falta de cumplimiento normativo por no contar con un sistema formal de gestión de alertas con trazabilidad, owner asignado, estados de progresión y cierre auditado. Slack y Grafana no satisfacen los requisitos de governance que cada entidad debe acreditar ante su regulador (UIF, BCRA, CNV, FATF). |
| 4 | **Principio canónico: el tipo pertenece al catálogo del `target_app`** | Diagrama: cualquier código del sistema (integración directa, job programático, acción del manifest, ingreso manual) puede disparar la ingesta para un tipo del catálogo del `target_app`. La identidad del invocador (`source_app`, `source_module`) queda como **metadata del audit trail**, no como ownership del tipo. Esto refuerza el Wizard of Oz arquitectónico al nivel del catálogo de tipos — un mismo tipo puede ser disparado por distintos paths sin que el catálogo cambie. |
| 5 | **Tres estados canónicos** | Tabla: `Nueva` (recién detectada, sin atención todavía), `Resuelta` (atendida con outcome positivo: condición real, trabajada y resuelta), `Descartada` (atendida con outcome negativo o no aplica: falso positivo, duplicada, condición desaparecida sin intervención). Sin sub-categorías del tipo. Cierre desde el panel de detalle con justificación. |
| 6 | **Diferenciación de UI vive a nivel del app** | El tipo declara mínimamente nombre, payload, severidad opcional, `target_app`, `target_role` opcional. El app que renderiza decide la **presentación** según el dominio: triage rápido (lista tipo Inbox sin owner, resolver en un click) o trámite formal (panel de detalle + Timeline + Comments + modal de cierre con justificación). Mismo tipo, mismo motor, distintas UIs según el contexto del app. |
| 7 | **Slack como complemento opcional** | El Centro de Alertas es el destino primario obligatorio. Slack queda como notificación push opcional declarable por tipo — la app de Slack notifica al usuario por comodidad con link directo a la alerta. La gestión, trámite, asignación, cierre y audit ocurren siempre en el Centro. |
| 8 | **Capacidades opcionales por tipo** | Tabla de capacidades declarables: severidad (critical/high/medium/low), asignación manual a usuario, asignación por defecto a `target_role`, panel de detalle con timeline y comments, modal de cierre con justificación ≥ 10 chars, auto-cierre por condición, filtros del histórico, KPIs sumarizados en el header del módulo, vista Tablero (Kanban), push notification (Slack/email). |
| 9 | **Caso paradigmático — anomalía operativa con postmortem** | Una anomalía operativa (degradación de servicio, error de conciliación masivo, comportamiento inesperado de un proveedor) se registra con severidad alta. Equipo asignado la trabaja en el panel de detalle, debate hipótesis en Comments, al cerrar documenta postmortem en el modal de cierre (qué pasó, qué causó, qué se hizo, qué medidas preventivas). La alerta cerrada queda en el repositorio como base de conocimiento. La presentación es decisión del app: para el equipo de SRE puede ser lista densa; para el equipo de Operations puede ser Tablero con columnas Nueva / En análisis / Resuelta. |
| 10 | **Ejemplos de tipos del catálogo (ilustrativos)** | Tabla con ejemplos del dominio: `kyc_match` (LEX), `spread_anomaly` (TRD), `deposit_unidentified` (OPS), `operational_anomaly` (transversal), `low_balance` (FIN/OPS). Aclarar que los tipos los da de alta cada área en el catálogo de su `target_app`. |
| 11 | **Eventos sistémicos de Reportes hacia Alertas** | Reportes (REQ-59) emite varios tipos al Centro de Alertas. Tabla: `reporte_proximo_emision_auto` (cuando se acerca la fecha de emisión automática) → informativa al consumidor. `reporte_vencido` (la fecha pasó sin generación exitosa). `reporte_emitido_automaticamente` (CRON ejecutó exitosamente) → informativa. `reporte_error_generacion` (falla en generación automática) → con severidad. `reporte_dependencias_incompletas` (generó con asociaciones consumidor-tipo no satisfechas) → al consumidor con referencia al run y snapshot de asociaciones incompletas. La lista no es exhaustiva — cualquier evento sistémico relevante puede modelarse como nuevo tipo en el catálogo. |
| 12 | **REPORT_DEPENDENCY NO vive en Alertas — vive en el Inbox** | **El mecanismo de coordinación inter-aplicación cuando un reporte tiene una dependencia bloqueante en otra app se modela como Tarea al Centro de Solicitudes del `blocking_app` con `auto_archive`**, NO como Alerta. Razón conceptual: es un pedido al área del `blocking_app` de que complete trabajo concreto para destrabar la generación — eso es naturalmente Tarea (REQ-71), no condición detectada (Alerta). El detalle del mecanismo `REPORT_DEPENDENCY` (modelado con `ConsumerTypeAssociation` + `satisfaction_mode`) se profundiza en el bloque de REQ-59. |
| 13 | **API de ingesta + Flujo de alta de tipos** | Endpoint del core consumible desde cualquier backend autenticado. Backend transversal + UI por app. Una alerta = un `target_app`. Flujo de alta de nuevo tipo: el área declara identificador, app target (catálogo destino), payload, severidades, capacidades opcionales, reglas de detección, política de push. Producto valida coherencia. Tecnología implementa la regla de detección + registra el tipo. Deploy. **REQ-52 + REQ-33 desbloqueados:** ya existen en Jira como pedidos pendientes de Centro de Alertas para LEX y TRD; con REQ-73 entregado, dejan de ser proyectos de infraestructura y pasan a ser configuración del estándar. Vinculados via `is caused by`. |

## Bloque 2 — REQ-59 REPORTES

### Conceptos clave que deben quedar

1. **Reportes es un servicio transversal del core** — no un módulo de un app específico. Cualquier app del grupo lo consume declarando los reportes que expone en `consumer_apps[]`.
2. **Separación definición / ejecución** — la definición (qué reporte es, qué normativa, qué periodicidad, qué formato, qué permissions) es ownership del área. La ejecución técnica es ownership de Tecnología; se implementa una vez y queda invocable desde cualquier app consumidora.
3. **`consumer_apps[]` vs `permissions` son ortogonales** — `consumer_apps[]` define **dónde aparece** (qué apps lo listan); `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar dentro de esas apps.
4. **Permissions con 4 niveles independientes** — `view`, `execute`, `edit`, `delete`. Un usuario puede tener `view` sin `execute`, o `edit` sin `delete`. Separación de responsabilidades realista.
5. **Default seguro** — si permissions no se declara, solo creador + grupo admin tienen las 4 capacidades. Reporte invisible para el resto.
6. **Capabilities referenciadas son las de REQ-68** — misma fuente de verdad. El capability provider resuelve `user_id → capabilities[]`.
7. **Principio "capacidades, no rutas" aplicado a Reportes** — el invocador del endpoint no decide la ruta de ejecución del reporte. El servicio decide internamente, según el estado del catálogo y las asociaciones consumidor-tipo, qué camino tomar.
8. **`ConsumerTypeAssociation` con `satisfaction_mode`** — entidad unificada que reemplaza la `ReportDependency` embebida y generaliza el mecanismo más allá de reportes. Cubre cierres periódicos, vencimientos regulatorios, y cualquier consumidor scheduleado que dependa de un tipo del catálogo del Inbox.
9. **Dos modos de satisfacción** — `'generate_new'` (el consumidor dispara la creación de una instancia nueva del tipo en el Inbox cuando llega `due_at - lead_time_days`); `'verify_existing'` (el consumidor verifica si existe una instancia completada del tipo dentro de una ventana `verify_window_days`; si no existe, la asociación se considera no satisfecha).
10. **`lead_time_days` vive en la asociación, no en el tipo** — el mismo tipo del Inbox puede ser dependencia de N consumidores con tiempos distintos (UIF 5 días, BCRA 3, CNV 7).
11. **Endpoint único de generación** — invocable desde el backend de cualquier app o sistema autenticado.
12. **Scheduler de CRON** — job periódico que consulta el catálogo, identifica reportes auto-generables, verifica asociaciones consumidor-tipo, invoca el endpoint con identidad de sistema, persiste el run, emite eventos al Inbox (Tareas) y a Alertas según corresponda.
13. **Mecanismo REPORT_DEPENDENCY — Tarea al Inbox del `blocking_app` con `auto_archive`** — el reporte declara `ConsumerTypeAssociation` con `satisfaction_mode: 'generate_new'`; el sistema genera una Tarea hacia el Inbox del `blocking_app` cuando se acerca el deadline; al completarse la Tarea, la asociación se satisface y el reporte puede generar.
14. **Persistencia de ejecuciones** — runs inmutables, re-descargables hasta vencimiento de retención. Pueden tener `consumer_associations_unmet[]` poblado cuando se generaron con asociaciones no satisfechas. Al vencer la retención: marcado como expirado, metadata preservada, archivo no accesible.
15. **Reportes cross-app y headless** — `consumer_apps[]` puede tener múltiples apps; headless tiene `consumer_apps[]` vacío.
16. **V2 sujeta a viabilidad (no commitment)** — IA Playground + Builder visual + Marketplace. Exploración futura. V1 (flujo formal de alta) cubre todas las necesidades del catálogo.

### `ConsumerTypeAssociation` — qué declara

Una asociación entre un consumidor scheduleado y un tipo del catálogo del Inbox declara:

| Campo | Qué representa |
|---|---|
| `consumer_ref` | Identificador del consumidor (ej: ID del reporte). |
| `consumer_kind` | Naturaleza del consumidor: `'report'`, `'period_close'`, `'expiration'`, `'other'`. |
| `concept` | Clasificador de negocio del tipo del Inbox que satisface la dependencia (ej: `daily_reconciliation`). |
| `target_app` | App donde vive el tipo (catálogo destino). |
| `target_role` | Capability para routing dentro del `target_app`. |
| `default_assignee` | Usuario sugerido como `assignee` opcional. |
| `lead_time_days` | Cuántos días antes del `due_at` del consumidor se dispara la asociación. |
| `payload_template` | Template del payload a generar (en `'generate_new'`). |
| `satisfaction_mode` | `'generate_new'` o `'verify_existing'`. |
| `verify_window_days` | Solo en `'verify_existing'` — ventana hacia atrás para verificar trabajo existente. |
| `association_state` | `'active'`, `'paused'`, `'archived'`. |

### Las rutas internas del servicio (principio "capacidades, no rutas" aplicado)

El invocador del endpoint no decide la ruta. El servicio decide internamente según el estado del catálogo, las asociaciones consumidor-tipo y la configuración del reporte:

| Caso | Condiciones | Ruta interna del servicio | Persistencia | Eventos |
|---|---|---|---|---|
| **Ejecución programática feliz** | CRON sin asociaciones no satisfechas | Invoca el generator, persiste el run | Run con status ok, sin `consumer_associations_unmet` | Alerta `reporte_emitido_automaticamente` |
| **Generación con datos parciales** | Asociaciones no satisfechas, reporte permite auto-emisión con incompletitud | Invoca el generator con datos disponibles | Run con `consumer_associations_unmet[]` poblado (snapshot) | Alerta `reporte_dependencias_incompletas` al consumidor + Tarea al `blocking_app` por cada asociación no satisfecha |
| **Bloqueo con escalamiento humano** | Asociaciones no satisfechas, reporte requiere completitud | NO genera | Sin run (`dependencies_pending`) | Tarea al Inbox del `blocking_app` por cada asociación no satisfecha (`satisfaction_mode: 'generate_new'` con `auto_archive`) |
| **Verificación de trabajo existente** | Asociación con `satisfaction_mode: 'verify_existing'` y `verify_window_days` | Verifica si existe instancia completada del tipo en la ventana; si sí, satisface; si no, escalamiento | Run condicional según resultado | Alerta o Tarea según política del reporte |
| **Ejecución manual próxima a emisión** | Próximo a emitir, reporte con generación manual | NO genera automáticamente | — | Tarea `reporte_proximo_emision_manual` al Inbox del responsable |

### Slides sugeridos REQ-59 (16 slides)

| # | Título | Contenido |
|---|---|---|
| 14 | **REQ-59 — Reportes** | Portada del bloque. |
| 15 | **Reportes como servicio transversal del core** | No es un módulo de un app específico. Cualquier app del grupo lo consume declarando en `consumer_apps[]`. Reportes regulatorios, internos, operativos, contables. |
| 16 | **Separación definición / ejecución** | Definición (qué reporte, qué normativa, qué periodicidad, qué formato, qué permissions) = ownership del área. Ejecución técnica = ownership de Tecnología; se implementa una vez y queda invocable. |
| 17 | **Qué declara un reporte** | Identificador, nombre, descripción, categoría, `consumer_apps[]` (dónde aparece), entidad regulatoria opcional, regulación de referencia opcional, periodicidad, próxima fecha de emisión, formato, generator (referencia a la implementación técnica), política de retención (duración + categoría + base legal opcional), parámetros, asociaciones consumidor-tipo (`ConsumerTypeAssociation[]`), flags de CRON (habilitado/activo), lock opcional con razón, permissions de 4 niveles, estado. |
| 18 | **Sub-tab Catálogo + sub-tab Ejecución** | Cada app consumidora renderiza ambos sub-tabs. Catálogo: lista de reportes activos filtrada por `permissions.view`. Ejecución: runs de los reportes con `permissions.view` del usuario, incluyendo badge de asociaciones no satisfechas cuando aplica y filtro "Con dependencias incompletas". La nomenclatura "Histórico" no aparece — es Ejecución. |
| 19 | **Permissions — 4 niveles independientes** | Tabla: `view` (filtra catálogo y ejecuciones), `execute` (ejecución manual + scheduling), `edit` (modificación de definición), `delete` (archivado/baja). Un usuario puede tener `view` + `execute` sin `edit`. Permite separación de responsabilidades realista. |
| 20 | **Default seguro + Capabilities referenciadas** | Default: si permissions no se declara, solo creador + grupo admin tienen las 4 capacidades. Fuerza declaración explícita; previene exposición accidental de reportes sensibles (P&L, exposición agregada cross-entidad). Las capabilities referenciadas son las del capability provider de REQ-68. |
| 21 | **`consumer_apps[]` vs `permissions` — dimensiones ortogonales** | `consumer_apps[]` define **dónde aparece** (qué apps lo listan); `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar. Un reporte puede aparecer en LEX y FIN y ser visible solo para usuarios con la capability `puede_ver_pnl`. |
| 22 | **Principio "capacidades, no rutas" aplicado a Reportes** | El invocador del endpoint no decide la ruta de ejecución. El servicio decide internamente, según el estado del catálogo y las asociaciones consumidor-tipo del reporte, qué camino tomar. El consumidor del endpoint conoce el resultado (run persistido o estado pendiente) y se suscribe a los eventos en Alertas o Inbox según corresponda. Patrón consistente con REQ-71. |
| 23 | **`ConsumerTypeAssociation` con `satisfaction_mode`** | Entidad unificada que reemplaza la dependencia embebida del modelo anterior y generaliza el mecanismo. Cubre dependencias de reportes pero también cierres periódicos (`consumer_kind: 'period_close'`), vencimientos regulatorios (`'expiration'`) y otros casos scheduleados (`'other'`). **Dos modos:** `'generate_new'` (el consumidor dispara la creación de una instancia nueva del tipo en el Inbox cuando llega `due_at - lead_time_days`) y `'verify_existing'` (el consumidor verifica si existe una instancia completada del tipo dentro de una ventana `verify_window_days`; si no existe, la asociación se considera no satisfecha). **`lead_time_days` vive en la asociación**, no en el tipo — el mismo tipo del Inbox puede ser dependencia de N consumidores con tiempos distintos. |
| 24 | **Las rutas internas — tabla** | Mostrar la tabla de las rutas internas del servicio según las combinaciones de estado del catálogo y asociaciones consumidor-tipo. Esta es la matriz operativa de comportamiento del endpoint y del scheduler. |
| 25 | **Endpoint de generación** | Endpoint único invocable desde cualquier backend autenticado. Valida `permissions.execute` (excepto sistema/cron), valida parámetros, verifica asociaciones consumidor-tipo, aplica la ruta interna según el caso. Devuelve run persistido o estado pendiente con detalle de asociaciones no satisfechas. |
| 26 | **Mecanismo REPORT_DEPENDENCY — Tarea al Inbox del `blocking_app`** | **El mecanismo de coordinación inter-aplicación se modela como Tarea al Centro de Solicitudes del `blocking_app`, NO como Alerta.** Razón conceptual: es un pedido de completar trabajo concreto, no una condición detectada. **Flujo end-to-end con `satisfaction_mode: 'generate_new'`:** (1) El scheduler detecta una asociación no satisfecha y emite Tarea hacia el Inbox del `blocking_app` invocando el endpoint del Centro con el tipo del catálogo correspondiente y payload con datos del reporte/deadline. (2) Un usuario del área del `blocking_app` toma la Tarea, completa el trabajo. (3) La Tarea cierra; la asociación queda satisfecha. (4) **Auto-cierre vía `auto_archive`**: el tipo declara la condición que evalúa la asociación; cuando se cumple, la Tarea cierra automáticamente con `closed_by: 'system'`, `closure_action: 'dependency_completed'`. (5) Reportes pasa a "Listo para generar". |
| 27 | **Flujo con `satisfaction_mode: 'verify_existing'`** | Ejemplo: reporte de UIF requiere conciliación diaria operativa del día previo. La asociación declara `concept: 'daily_reconciliation'`, `satisfaction_mode: 'verify_existing'`, `verify_window_days: 1`. Cuando llega el momento de generar, el servicio verifica si existe una instancia completada del tipo `daily_reconciliation` en OPS dentro del último día. Si sí → asociación satisfecha, reporte genera. Si no → asociación no satisfecha, aplica la ruta interna correspondiente (Tarea al `blocking_app` o generación con datos parciales según política del reporte). Permite vincular reportería regulatoria con tareas operativas recurrentes que ya existen sin acoplamiento adicional. |
| 28 | **Scheduler de CRON** | Job periódico que consulta el catálogo, identifica reportes auto-generables cuya `next_emission_date` venció. Para reportes sin asociaciones pendientes invoca el endpoint con identidad de sistema, persiste el run con trigger CRON, actualiza la próxima fecha. Para reportes con asociaciones pendientes aplica la bifurcación de las rutas internas. Para reportes próximos a emitir con generación manual emite Tarea `reporte_proximo_emision_manual` al Inbox del responsable. Frecuencia a decisión de Tecnología. Ejecuta con identidad de sistema; no aplica check de `permissions.execute`. |
| 29 | **Persistencia de ejecuciones (runs)** | Runs inmutables. Re-descargables hasta vencimiento de retención. Pueden tener `consumer_associations_unmet[]` poblado (snapshot al momento de generar). Categorías de retención: regulatorio (5-10 años según norma — UIF Arg ≥ 10y, BCRA, CNV, FATCA), contable (10 años — asientos, balances, P&L), operativo (1-6 meses), interno (1-3 meses). Base legal mandatoria para regulatorio/contable. Al vencer: marcado como expirado, archivo no accesible, metadata preservada para audit. |
| 30 | **Reportes cross-app y headless** | Cross-app: `consumer_apps[]` con múltiples entradas. Permissions aplican per-user dentro de cada app consumidora. Headless: `consumer_apps[]` vacío — generados pero no expuestos en UI. Útil para schedulers externos, integraciones con regulators, agentes IA. `permissions.execute` aplica al invocador (excepto invocaciones de sistema). |

## Slide de cierre (común a ambos bloques)

| # | Título | Contenido |
|---|---|---|
| 31 | **Q&A — Alertas + Reportes** | Conexión entre los dos: el mecanismo REPORT_DEPENDENCY **no los une directamente** — Reportes emite Tareas al Inbox, no Alertas. Sí los conecta el conjunto de eventos sistémicos del propio reporte (`reporte_proximo_emision_auto`, `reporte_vencido`, `reporte_emitido_automaticamente`, `reporte_error_generacion`, `reporte_dependencias_incompletas`) que Reportes emite a Alertas como tipos del catálogo. Ambos consumen el capability provider de REQ-68. |

## Speaker notes / puntos a enfatizar

- Slide 4 (principio del catálogo del `target_app`): este es el principio canónico más importante del refactor de Alertas. Insistir en que es **cualquier código del sistema** quien dispara la ingesta, y la identidad del invocador queda como metadata. Esto rompe la idea anterior de "el emisor es dueño del tipo".
- Slide 5-6 (3 estados + diferenciación de UI vive en el app): si los devs entienden que la mecánica es uniforme y la presentación es decisión del app, no hay riesgo de que reimplementen variantes paralelas del módulo Alertas por app.
- Slide 9 (caso paradigmático con postmortem): este caso ancla la diferencia entre Alertas y Inbox. Una anomalía no es una "Solicitud" — es un evento del sistema que el área trabaja con postmortem documentado.
- Slide 12 (REPORT_DEPENDENCY no vive en Alertas): este es uno de los cambios de modelado más importantes. **Antes** estaba modelado como Alerta con un perfil específico; **ahora** es Tarea al Inbox con `auto_archive`. Vale destacarlo porque cualquier doc previo que circule puede tener la versión vieja. Razón conceptual: es un pedido de completar trabajo, no una condición detectada.
- Slide 19-21: los 4 niveles independientes de permissions permiten separación realista (analista: view+execute; manager: +edit; admin: +delete). Mostrar concretamente con un ejemplo (P&L cross-entidad).
- Slide 22-24 (rutas internas): este es el slide más operativo de REQ-59. Si los devs entienden la matriz de rutas, entienden todo el comportamiento del endpoint y del scheduler. Tomarse tiempo de caminar cada fila.
- Slide 23 (`ConsumerTypeAssociation` con `satisfaction_mode`): este es el cambio de modelo más importante de este REQ. Antes había una dependencia embebida en el reporte; ahora hay una entidad transversal con dos modos de satisfacción. La generalización a `consumer_kind` (no solo reportes) permite el patrón para cierres periódicos y vencimientos regulatorios sin acoplamiento adicional.
- Slide 26 (REPORT_DEPENDENCY como Tarea con `auto_archive`): este es el flujo paradigmático de coordinación inter-aplicación. Caminar paso a paso. Insistir en que es el caso de uso real de `auto_archive` declarado en el Inbox.
- Slide 27 (`verify_existing` con el ejemplo UIF + daily_reconciliation): este es el caso más conceptualmente interesante del modo `verify_existing`. Permite que un reporte regulatorio se "enganche" a una tarea operativa que ya existe en otra área sin pedirle a la otra área que cree nada específico — solo que confirme que ya hizo el trabajo dentro de la ventana.
- Slide 28 (scheduler): el scheduler ejecuta con identidad de sistema y no aplica check de `permissions.execute`. Esto es por diseño — la ejecución automática es a nivel sistema, no a nivel usuario.

---

# Sesión 5 — REQ-74 DASHBOARD + Cierre

## Objetivo

Cerrar el set con el último módulo genérico. **REQ-74 DASHBOARD** entrega la lectura agregada del estado del área — 4 cards shared mandatorias (counters de los 3 list-shaped + feed de Actividades recientes), KPI cards del dominio con flag opcional `is_primary_indicator`, card de gráfico de evolución del indicador principal del área con 3 tipos de gráfico, cards opcionales adicionales y selector de período. Esta es la sesión que conecta todo lo visto en las 4 sesiones anteriores.

Que los devs salgan entendiendo (a) el Dashboard como lectura agregada (no produce data propia), (b) las 4 cards shared mandatorias y cómo se filtran por capabilities, (c) la designación del indicador principal del área en una KPI card del dominio, (d) la card de gráfico de evolución con 3 tipos de gráfico declarables, (e) el feed de Actividades recientes como consumidor del stream del audit trail, (f) cards opcionales shared adicionales, (g) prohibiciones explícitas (qué NO va en Dashboard), (h) que el detalle visual final de los componentes queda a refinement con Diseño + Tecnología.

Cerrar las 5 sesiones con resumen del paradigma y próximos pasos.

## Duración

≈ 45 min de exposición + 15 min de Q&A. **Slides recomendados: 22** (17 para REQ-74 + 5 cierre del set).

## Mensaje central

> El Dashboard es la lectura agregada del estado del área. No produce data propia — consume cuatro fuentes: counters de los 3 list-shaped (filtrados por capabilities), stream del audit trail para el feed de Actividades, KPIs del dominio declarados por el app, y capability provider para filtrado. Las 4 cards shared mandatorias son: counter de Alertas, counter de Solicitudes/Tareas, counter de Reportes, feed de Actividades recientes. Sobre eso, cada app declara sus KPI cards del dominio + opcionalmente designa una como indicador principal del área — eso habilita la card de gráfico de evolución con 3 tipos declarables (barras, línea, circular). El detalle visual final queda a refinement con Diseño.

## Conceptos clave que deben quedar

1. **El Dashboard es lectura agregada** — consume cuatro fuentes: repositorios de los 3 list-shaped, stream del audit trail (REQ-68), KPI cards del dominio del app, capability provider. No produce data propia.
2. **Layout: card-grid responsive** — sin toggle de vistas, sin segmenter, sin CTA principal, sin filtros granulares, sin modal de cierre, sin panel de detalle.
3. **4 cards shared mandatorias** — todo Dashboard de toda app entrega:
   - Counter de Alertas activas (estado `Nueva` del repositorio de Alertas)
   - Counter de Solicitudes/Tareas activas (estados `pendiente` + `en_proceso` del Inbox, filtrado por destinatario; aplica routing por rol cuando el app lo declara)
   - Counter de Reportes pendientes (próximos a emitir + vencidos + asociaciones consumidor-tipo no satisfechas, filtrado por `permissions.view`)
   - Feed de Actividades recientes (suscrito al stream del audit trail, real-time, `activity_template` resuelto, agrupado por día, filtrado por capabilities)
4. **KPI cards del dominio** — declaradas por cada app, con label, valor, formato, trend opcional, navigate target opcional, `requires_capability` opcional, `refresh_strategy` declarable.
5. **Indicador principal del área (`is_primary_indicator: true`)** — cada app puede designar **una** de sus KPI cards como indicador principal. Ejemplos: "Volumen procesado del mes" (TRD), "Movimientos imputados del período" (FIN), "KYCs aprobados del mes" (LEX/Compliance), "Operaciones del mes" (OPS). La existencia de un indicador principal habilita la card de gráfico de evolución.
6. **Card de gráfico de evolución del indicador principal** — card shared del core declarable por el app que renderiza la evolución temporal del KPI marcado como indicador principal. **3 tipos de gráfico declarables:**
   - Barras (comparación discreta entre períodos)
   - Línea (evolución continua)
   - Circular (composición)
   
   El detalle visual final (paleta, ejes, tooltips, leyendas, animaciones) queda a refinement con Diseño + Tecnología. El contrato a nivel REQ es: tipo de gráfico, métrica subyacente (la del indicador principal), granularidad temporal, rango temporal default.
7. **Filtrado por capabilities en el Dashboard** — counter de Reportes, KPI cards con `requires_capability`, card de gráfico de evolución (si el indicador principal declara capability), feed de Actividades recientes, card opcional de próximos reportes. Misma fuente de verdad: capability provider de REQ-68.
8. **Cards opcionales shared adicionales** — SLA crítico (computa sobre Solicitudes con `sla_hours`), próximos reportes (computa sobre catálogo con `permissions.view`), selector de período (aparece top-right cuando el app declara KPIs time-based o card de gráfico).
9. **Convención sugerida de composición vertical** — primera sección con counters + KPI principal (última card de la sección); segunda sección con card de gráfico de evolución + feed de Actividades recientes; secciones siguientes con KPI cards adicionales + cards opcionales. No normativa — el app define el orden concreto.
10. **Refresh real-time** — counters de las 3 cards mandatorias y feed de Actividades real-time vía el mecanismo de notificación del repositorio correspondiente y el stream del audit trail. KPI cards y card de gráfico con `refresh_strategy` declarado.
11. **Naturaleza del servicio** — enteramente cliente. NO consume el motor de Acciones para mutaciones. Click en card es navegación estándar al módulo destino con filtros pre-aplicados.
12. **Prohibiciones explícitas** — contract violations: sin acciones de mutación o invocación, sin filtros sobre listas, sin sub-tabs / segmenter, sin toggle de vistas, sin modal de cierre, sin panel de detalle, sin más de 3 counters de módulos genéricos.

## Slides sugeridos REQ-74 (17 slides) + Cierre (5 slides)

| # | Título | Contenido |
|---|---|---|
| 1 | **REQ-74 — Dashboard** | Portada del bloque. Sesión 5 de 5. |
| 2 | **El Dashboard como lectura agregada** | Diagrama: 4 fuentes que el Dashboard consume — repositorios de los 3 list-shaped, stream del audit trail (REQ-68), KPIs del dominio declarados por el app, capability provider para filtrado. No produce data propia. Cualquier mutación ocurre en el módulo correspondiente. |
| 3 | **Layout — card-grid responsive** | Card-grid responsive como layout primario. Page header con título + selector de período opcional top-right (cuando el app declara KPIs time-based o card de gráfico). Sin CTA principal, sin segmenter, sin toggle de vistas. |
| 4 | **Las 4 cards shared mandatorias** | Tabla con las 4 cards que todo Dashboard de toda app entrega siempre: (1) Counter de Alertas activas, (2) Counter de Solicitudes/Tareas activas, (3) Counter de Reportes pendientes, (4) Feed de Actividades recientes. Filtradas por capabilities. Reemplazan al patrón anterior que mezclaba counter de Alertas + KPI cards + card cross-app sin counter explícito para Solicitudes/Tareas ni feed unificado de actividades. |
| 5 | **Counter de Alertas activas** | Cuenta alertas en estado `Nueva` del repositorio de Alertas para el `target_app` del Dashboard. Click navega a Alertas con filtro pre-aplicado a "estado Nueva". Refresh real-time. Severidad como filtro visual opcional cuando el app lo prioriza ("3 nuevas, 1 crítica"). |
| 6 | **Counter de Solicitudes/Tareas activas** | Cuenta las Solicitudes y Tareas en estados `pendiente` + `en_proceso` del Inbox cuyo destinatario es el usuario actual (`assignee` o `target_role`). Suma ambos tipos. Estados terminales no entran. Click navega al Inbox con "Mi bandeja" activa. Refresh real-time. |
| 7 | **Counter de Reportes pendientes** | Suma reportes próximos a emitir + vencidos sin emitir + reportes con asociaciones consumidor-tipo no satisfechas, filtrado por `permissions.view` del usuario. Demostrable con dos usuarios de distinto rol viendo counters distintos. Click navega a Reportes con filtro pre-aplicado. |
| 8 | **Feed de Actividades recientes** | Card shared (típicamente de mayor ancho según el grid) suscrita al stream del audit trail (REQ-68). Cada item se renderiza usando el `activity_template` declarado por la acción que produjo el evento (ej: "Yasmani Rodriguez asignó banco a un movimiento"). Real-time. Filtrado por origen del registro (`record_type`) — el feed del Dashboard del app X muestra eventos cuyos registros pertenecen a módulos del app X. Filtrado opcional por `invocation_source` (mostrar solo acciones humanas, ocultando programáticas). Capability-aware (items cuyo registro el usuario no puede ver se filtran). Agrupación por día. |
| 9 | **KPI cards del dominio** | Declaradas por cada app vía REQs por área. El Dashboard provee el contrato shared de KPI card: label, valor, formato (currency / número / porcentaje / string), trend opcional (up/down/flat + delta + period label), navigate target opcional, `requires_capability` opcional, `refresh_strategy` declarable. KPI cards con `requires_capability` y sin la capability del usuario **no se renderizan** — no aparecen como deshabilitadas. |
| 10 | **Indicador principal del área (`is_primary_indicator: true`)** | Cada app puede designar **una** de sus KPI cards del dominio como indicador principal del área — la métrica más representativa del trabajo del área. Ejemplos: "Volumen procesado del mes" (TRD), "Movimientos imputados del período" (FIN), "KYCs aprobados del mes" (LEX/Compliance), "Operaciones del mes" (OPS). Suele ubicarse como última card de la primera sección del grid. **La existencia de un indicador principal habilita la card de gráfico de evolución (slide 11).** |
| 11 | **Card de gráfico de evolución del indicador principal** | Card shared del core declarable por el app cuando designa un indicador principal. Renderiza la evolución temporal del KPI marcado como indicador principal. **Propósito:** si la card del KPI principal muestra el valor actual ("Volumen procesado del mes: USD 4.2M"), la card de gráfico muestra **cómo viene evolucionando** ese mismo indicador. La mirada numérica + la mirada temporal funcionan como par. **3 tipos de gráfico declarables:** Barras (comparación discreta entre períodos), Línea (evolución continua), Circular (composición). El app declara el tipo. **El detalle visual final del componente (paleta, ejes, tooltips, leyendas, animaciones) queda a definir en refinement con Diseño + Tecnología.** El contrato a nivel REQ es: tipo de gráfico, métrica subyacente (la del indicador principal), granularidad temporal, rango temporal default. Si el indicador principal declara `requires_capability`, ni la KPI card ni la card de gráfico se renderizan sin la capability — ambas son condicionales a la misma capability. |
| 12 | **Convención sugerida de composición vertical** | Diagrama: composición del grid en 3 secciones (no normativa). **Primera sección:** counters consolidados + KPI principal del área (última card). **Segunda sección:** card de gráfico de evolución del indicador principal + feed de Actividades recientes. **Secciones siguientes:** KPI cards adicionales del dominio + cards opcionales shared. El app define el orden concreto. |
| 13 | **Selector de período (opcional)** | Cuando el app declara KPIs time-based o card de gráfico de evolución, puede activar un selector de período pinned top-right con opciones estándar: Hoy / Últimos 7 días / Últimos 30 días / Últimos 90 días / rango personalizado. **No es un segmenter** — no re-segmenta listas, no cambia sub-tabs. Recomputa KPIs time-based y re-renderiza el gráfico. **Los 4 counters shared no dependen del selector** — son siempre "activos ahora" / "actividad reciente". |
| 14 | **Cards opcionales shared adicionales** | Card de **SLA crítico** — computa sobre las Solicitudes/Tareas del Inbox con `sla_hours` declarado. Muestra cuántas están próximas a vencer (50-100% del SLA consumido) y cuántas están vencidas. Click navega al Inbox con filtro pre-aplicado. Respeta capabilities. Card de **próximos reportes** — computa sobre el catálogo de Reportes con `permissions.view` aplicado. Muestra los próximos a emitir + vencidos. Click navega a Reportes con filtro pre-aplicado. Opcionales — el app las declara cuando agregan valor. |
| 15 | **Filtrado por capabilities** | Tabla: counter de Reportes (filtra por `permissions.view`), KPI cards con `requires_capability` (no se renderizan sin la capability), card de gráfico de evolución (si el indicador principal declara capability), feed de Actividades recientes (items cuyo registro el usuario no puede ver se filtran), card opcional de próximos reportes. Misma fuente de verdad: capability provider de REQ-68. |
| 16 | **Refresh real-time + Naturaleza del servicio** | Counters de las 3 cards mandatorias y feed de Actividades real-time vía el mecanismo de notificación del repositorio correspondiente y el stream del audit trail. KPI cards y card de gráfico con `refresh_strategy` declarado (realtime / on_navigate / manual). Enteramente cliente — no tiene backend propio. NO consume el motor de Acciones para mutaciones (el stream del audit trail se **consume** como fuente de lectura del feed; el Dashboard nunca invoca acciones del manifest). Click en card es navegación estándar al módulo destino con filtros pre-aplicados, no invocación del motor. |
| 17 | **Prohibiciones explícitas (contract violations)** | Sin acciones de mutación o invocación (no menú de acciones, no CTAs del manifest, no modales de mutación). Sin filtros sobre listas (eso pertenece al módulo que owns la data). Sin sub-tabs ni segmenter. Sin toggle de vistas (Lista/Tarjetas/Tablero). Sin modal de cierre, sin panel de detalle. El selector de período NO es un segmenter. No más de 3 counters de módulos genéricos (los tres canónicos son el set). |

### Cierre de las 5 sesiones (5 slides)

| # | Título | Contenido |
|---|---|---|
| 18 | **Recap del paradigma** | Visual: los 6 transversales como sistema. Una sola fuente de verdad (capabilities + manifests). Modelo conceptual unificado en dos capas (todo pasa por el motor + capacidades, no rutas). Audit trail + stream como espina dorsal. Universalidad y consistencia. Scope explícito del Centro de Solicitudes con matriz `type × execution_mode`. Tipo de Alerta en el catálogo del `target_app`. `ConsumerTypeAssociation` con `satisfaction_mode` como mecanismo unificado. Dashboard con 4 cards mandatorias + indicador principal del área. |
| 19 | **Lo que ya está listo** | Los 6 REQs están enriquecidos, refactorizados y en SENT TO DEV. Los principios arquitectónicos formalizados (Wizard of Oz arquitectónico, scope explícito del Centro, REPORT_DEPENDENCY como Tarea al Inbox, `ConsumerTypeAssociation` unificado, catálogo del `target_app`, indicador principal del área). El template del core está scaffoldado. Las decisiones arquitectónicas están cerradas. |
| 20 | **Lo que queda por delante** | Migración de las apps actuales al nuevo template. Implementación de los 6 transversales en orden de rollout (REQ-68 → REQ-69 → REQ-71 + REQ-73 → REQ-59 → REQ-74). Declaración progresiva por cada área de: acciones del manifest, tipos de Solicitudes/Tareas, series recurrentes, tipos del catálogo de Alertas, reportes con asociaciones consumidor-tipo, KPIs del Dashboard + designación del indicador principal. |
| 21 | **Cómo trabajamos a partir de ahora** | Para Producto: foco en la declaración de configuración de cada área. Para Tecnología: implementación del template + transversales. Los REQs en Jira son la fuente única de verdad de los contratos. El detalle técnico (shapes concretos, componentes, performance budgets, stack) se cierra en refinement. |
| 22 | **Q&A final + cierre** | Espacio para preguntas abiertas sobre todo el set. |

## Speaker notes / puntos a enfatizar

- Slide 2 (lectura agregada): si los devs entienden que el Dashboard no produce data propia, entienden por qué es enteramente cliente y por qué tiene tantas prohibiciones.
- Slide 4 (4 cards mandatorias): este es el cambio más importante del Dashboard. Antes había 3 counters + cards heterogéneas; ahora hay 4 cards shared mandatorias incluyendo el feed de Actividades como entregable canónico. Insistir en que las cuatro son **mandatorias** — no opcionales.
- Slide 6 (counter de Solicitudes/Tareas): aclarar que el counter **agrega Solicitudes + Tareas** — no las distingue. El usuario las distingue dentro del módulo Inbox vía filtro de `type`.
- Slide 8 (feed de Actividades): mostrar concretamente cómo el `activity_template` declarado en una acción del manifest se resuelve en el item del feed. Conexión con REQ-68 en acción. Aclarar que la presencia del feed como mandatorio es lo que justifica la entrega del audit trail + stream como infraestructura crítica.
- Slide 9 (KPI cards con `requires_capability`): insistir en que la card NO se renderiza, no aparece deshabilitada. Esto previene exposición de existencia de información sensible.
- Slide 10-11 (indicador principal + card de gráfico de evolución): este es el cambio sustantivo del Dashboard de esta sesión. Tomarse tiempo. Explicar la lógica del par: KPI principal (numérico) + card de gráfico (temporal) cuentan la misma historia con dos miradas. Insistir en que el detalle visual final del componente de gráfico queda a refinement con Diseño — el REQ define el contrato funcional (3 tipos declarables) pero no el visual.
- Slide 12 (convención de composición vertical): aclarar que es **convención sugerida**, no normativa. El app define el orden.
- Slide 17 (prohibiciones): las prohibiciones son contract violations, no recomendaciones. Las skills del template del core van a tener tests que las enforcen.
- Slide 18-22 (cierre): tomarse el tiempo de cerrar bien las 5 sesiones. Los devs salen de esta semana con la imagen completa del paradigma — vale dejar tiempo de Q&A abierto al final.

---

## Notas finales para Claude Design

### Cuando se invoque para una sesión específica

Cada sesión es **autocontenida** — el contexto general + la sección de la sesión correspondiente alcanzan para generar el deck. No es necesario consultar las demás secciones a menos que se quiera mantener consistencia visual entre decks.

### Consistencia visual entre las 5 sesiones

Mantener consistencia de paleta, tipografía, layout de slides repetidos (portada, agenda, Q&A) entre las 5 sesiones. Si el deck de la Sesión 1 ya quedó definido con un patrón visual, replicarlo en los siguientes 4. Esto refuerza el mensaje del paradigma como sistema coherente.

### Naturaleza del documento

Las presentaciones se exponen desde el lado funcional de producto. No incluir shapes de datos tipados, nombres concretos de componentes del frontend, referencias al stack (framework, librerías), performance budgets en milisegundos, paths del repo ni nomenclatura interna de specs (OpenSpec, "L1/L2/L3"). Eso es del lado de Tecnología y se cierra en refinement. El briefing describe el modelo conceptual, los discriminadores funcionales, los estados, las reglas de habilitación y los flujos. Para representar discriminadores y entidades del modelo, usar **prosa + tablas funcionales** con campos nombrados, no interfaces tipadas.

### Diagramas recomendados

- **Diagrama de orden de rollout** (Sesión 1, slide 8): los 6 REQs con flechas de dependencia. Usar navy + violet como acentos.
- **Diagrama del modelo conceptual unificado capa 1** (Sesión 1, slide 9): el motor de REQ-68 en el centro, las fuentes de invocación apuntando hacia él (`inbox_trigger`, `kanban_drag`, `menu`, `inbox_drawer_cta`, retry).
- **Diagrama del modelo conceptual unificado capa 2** (Sesión 1, slide 10): el CTA externo invocando la capacidad del `target_app`, con dos paths internos (integración directa | crea Solicitud/Tarea en el Centro), el usuario externo viendo solo el estado abstracto.
- **Diagrama de Capabilities + Grupos + Usuarios** (Sesión 2, slide 13): tres capas — Capabilities atómicas → Grupos → Usuarios (vía memberships). Acceso al panel admin restringido a `manage_capabilities`.
- **Mockup conceptual del menú agrupado** (Sesión 2, slide 10): el menú con bloques `ASIGNACIÓN / IMPUTACIÓN` y `CONTEXTUALES`, sub-grupos del nivel 2 (IMPUTACIÓN, CONCILIACIÓN, GOVERNANCE, DOCUMENTACIÓN, CIERRE), iconos ✓ y ↗. Sin nombres de componentes — mockup visual del concepto.
- **Matriz `type × execution_mode`** (Sesión 3, slide 18): los cuatro cuadrantes con su visibilidad en el Inbox (siempre / solo si `failed`).
- **Diagrama del endpoint público invocable como primitiva común** (Sesión 3, slide 23): el endpoint en el centro con los cuatro escenarios de invocación apuntando (scheduler, acción del manifest, retry desde el panel del Inbox, retry desde una Alerta), todos con el mismo payload y mismo retorno.
- **Diagrama de 4 caminos de creación del Inbox** (Sesión 3, slide 25): los cuatro caminos confluyendo al mismo endpoint, con identidad distinta del invocador.
- **Diagrama serie ↔ instancias del Inbox** (Sesión 3, slide 31): la serie como definición, scheduler generando N instancias independientes con `recurring_definition_id`, cada una con lifecycle propio.
- **Diagrama del catálogo del `target_app`** (Sesión 4, slide 4): el catálogo en el centro con los distintos invocadores (integración directa, job programático, acción del manifest, ingreso manual) apuntando al mismo tipo, con la metadata `source_app` quedando en el audit trail.
- **Matriz de rutas internas de Reportes** (Sesión 4, slide 24): tabla visual con las rutas según `satisfaction_mode` y estado de las asociaciones, con eventos emitidos (Tarea al Inbox vs Alerta al consumidor).
- **Flujo de REPORT_DEPENDENCY como Tarea con `auto_archive` y `satisfaction_mode: 'generate_new'`** (Sesión 4, slide 26): 5 pasos del flujo end-to-end (detección de asociación no satisfecha → Tarea al Inbox del `blocking_app` → usuario completa el trabajo → asociación queda satisfecha → auto-cierre de la Tarea → Reportes pasa a "Listo").
- **Diagrama de `satisfaction_mode: 'verify_existing'`** (Sesión 4, slide 27): reporte de UIF declarando asociación con `verify_window_days: 1` contra el tipo `daily_reconciliation` de OPS; el servicio verifica si existe instancia completada en la ventana; si sí → asociación satisfecha sin crear nada nuevo.
- **Layout del Dashboard** (Sesión 5, slide 4 y slide 12): mockup conceptual del card-grid responsive con (a) primera sección con counters + KPI principal, (b) segunda sección con card de gráfico de evolución + feed de Actividades, (c) secciones siguientes con KPI cards adicionales + cards opcionales. Sin nombres de componentes — mockup visual del concepto.

### Lenguaje de los slides

Español argentino, vos form. Términos del modelo (entidades, discriminadores, estados, fuentes) en inglés cuando es convención. Conciso. Bullet points cortos. Las narrativas largas van en speaker notes, no en el slide visible.
