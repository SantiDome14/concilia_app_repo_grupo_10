---
name: HubSpot — Relevamiento de plataforma e integraciones con el core
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-05
updated_at: 2026-05-05
---

# HubSpot — Relevamiento de plataforma e integraciones con el core

## Objetivo

Relevar **qué es HubSpot, qué puede hacer y qué APIs / mecanismos de integración expone**, con el fin de definir progresivamente qué eventos y datos del financial-core de Ardua (LEX, OPS, FIN, CLP, TRD) tiene sentido integrar con HubSpot, bajo qué patrones técnicos comunes, y bajo qué governance.

El discovery tiene dos dimensiones que conviven:

1. **Relevamiento de HubSpot como plataforma** — investigación abierta del producto: objetos nativos, capacidades de automatización, APIs disponibles, modelo de pricing y límites operativos. El relevamiento lo lideran Valentina de Loredo (Marketing Specialist) y Mauro Pascuccio (Head of Sales) desde Sales & Partnerships, con Producto como contraparte.
2. **Casos de uso que materializan ese relevamiento** — cada vez que aparece un caso concreto de "queremos que HubSpot reaccione a un evento del core" o "queremos que el core consuma datos de HubSpot", se diseña como un caso de uso del discovery, reutilizando la infraestructura técnica y los patrones que se vayan consolidando. **REQ-56 es el primero**; otros están anticipados pero no aterrizados.

El discovery es la fuente única donde estas dos dimensiones se cruzan: cualquier decisión de un caso de uso debe poder pensarse como **patrón aplicable a futuros casos**, no solo como solución del caso individual.

## Contexto

### Por qué este relevamiento ahora

HubSpot es la plataforma SaaS donde Sales & Partnerships gestiona el pipeline comercial y donde Marketing ejecuta las comunicaciones automatizadas con clientes y prospectos. **Es el único sistema desde el cual hoy Ardua envía comunicaciones automatizadas formales al cliente final** (ver `entities/hubspot.md`).

A medida que el core de Ardua madura — LEX consolidando el legajo del cliente, OPS gestionando movimientos, FIN cerrando facturación y cobros, CLP entregando capacidades operativas al cliente — aparecen múltiples puntos donde un evento del core "merece" comunicación al cliente o coordinación con Sales. Hoy esa coordinación es manual: Compliance manda emails, Sales actualiza HubSpot a mano, los datos viven en dos lados desconectados.

El relevamiento busca **anticipar el patrón de integración** antes de que cada área pelée su propia solución. Sin un patrón común, terminamos con cinco integraciones LEX↔HubSpot, OPS↔HubSpot, FIN↔HubSpot diseñadas independientemente, cada una con su propia idea de qué evento mandar, en qué formato, con qué identificador. La consistencia transversal del core — uno de los activos del framework de Producto — se erosiona.

### Por qué un discovery transversal y no scoped a una aplicación

La integración con HubSpot **no es una feature de ninguna aplicación del core en particular**. LEX será el primer emisor (caso piloto de REQ-56), pero el patrón que se decida acá va a aplicar cuando OPS, FIN, CLP o TRD necesiten emitir hacia HubSpot.

Por eso el discovery se documenta con `features: []`, siguiendo la convención de sistemas transversales de infraestructura (precedentes: `jira-automations-discovery.md`, `observabilidad-discovery.md`).

### Por qué importa para Producto

Cualquier evento del legajo (LEX) o de la operatoria (CLP, OPS, FIN, TRD) que requiera disparar una comunicación al cliente termina pasando por HubSpot tarde o temprano — porque HubSpot es donde están las identidades comerciales del cliente, los templates de email, las automatizaciones IF/THEN. Sin un patrón de integración bien definido, esa comunicación queda al borde del proceso: manual, frágil, dependiente de personas específicas.

Producto necesita liderar la definición del **contrato del canal** (qué es un "evento del core", qué shape tiene, cómo se transporta, cómo se identifica el cliente entre los dos lados) para que cuando aparezca el séptimo caso de uso, no haya que rediseñar la rueda.

---

## 1. Relevamiento de HubSpot como plataforma

### 1.1 Qué es HubSpot (resumen)

Plataforma SaaS de CRM, marketing automation y sales enablement. Detalle de capacidades, áreas internas que la usan, restricciones operativas y mecanismos técnicos disponibles vive en `entities/hubspot.md`. Este discovery referencia esa entity y profundiza solo en los aspectos que afectan decisiones de integración con el core.

### 1.2 Líderes del relevamiento

| Persona | Rol | Responsabilidad en el relevamiento |
|---|---|---|
| Valentina de Loredo | Marketing Specialist · Sales & Partnerships | Referente operativo de HubSpot. Conoce la configuración actual: workflows existentes, properties, templates, deals, contacts. Lidera la auditoría del estado de la cuenta. |
| Mauro Pascuccio | Head of Sales | Owner del área. Define qué procesos comerciales conviene automatizar y prioriza qué casos de uso valen la inversión de integración. |
| Yasmani Rodriguez | Head of Product | Owner del discovery. Asegura que las decisiones de integración sean consistentes con el framework del core, define el contrato técnico de los eventos, coordina con Tecnología para el handoff cuando los casos de uso aterrizan. |

### 1.3 Qué se está investigando

- **Objetos nativos del CRM**: Contacts, Companies, Deals, Tickets — y cómo se relacionan con la noción de "cliente" del core (LEX legajo, CLP cuenta, etc.).
- **Properties custom**: cuáles existen, cuáles habría que crear para soportar los casos de uso del horizonte (ej: `lex_client_id`, `account_manager`, `client_number`, `welcome_email_sent_at`, etc.).
- **Mecanismos de entrada de datos** (inbound desde el core hacia HubSpot):
  - Webhook Triggers nativos del módulo Automation (validados — ver §2 caso REQ-56).
  - HubSpot API genérica (Contacts API, Workflows API).
  - Integraciones nativas con apps de terceros del marketplace.
- **Mecanismos de salida** (outbound desde HubSpot hacia el core, si aparecen casos): webhooks salientes de HubSpot, polling de la API.
- **Capacidades de Workflow**: triggers, condiciones IF/THEN, branches, timers, re-enrollment, integración con Contact properties dinámicas.
- **Plan contratado y límites**: qué módulos están habilitados (Marketing Hub / Sales Hub / Service Hub), límites mensuales de contacts / emails / workflow executions, API rate limits. *(Pendiente — auditoría con Valentina.)*
- **Privacy & compliance**: implicancias de mover datos personales de KYC al sistema de un tercero. *(Pendiente — review con Legal & Compliance.)*

### 1.4 Patrones técnicos consolidados (extraídos del relevamiento + caso REQ-56)

A medida que el relevamiento avanza y los casos de uso aterrizan, los patrones que demuestren ser sólidos se consolidan acá. Esto es lo que cualquier futuro caso de uso debería reutilizar antes de inventar algo nuevo.

#### Patrón P-01 — Transporte vía Webhook Trigger nativo de HubSpot

**Aplicable a:** todo caso donde un sistema del core necesita disparar una automatización en HubSpot.

**Cómo funciona.** El sistema emisor del core hace un POST HTTP directo al endpoint de un Webhook Trigger nativo de HubSpot (endpoint base `https://api-na1.hubapi.com/automation/v4/webhook-triggers/{id}/{token}`). HubSpot recibe el JSON, hace upsert sobre el Contact correspondiente y dispara el Workflow asociado.

**Validación.** Probado con REQ-56 contra un Webhook Trigger de prueba. Funciona end-to-end, sin necesidad de pipeline intermedio (n8n descartado para este patrón).

**Reglas del patrón:**

- La URL del Webhook **NO es parte del contrato del evento** — es configuración de runtime gestionada por el centro de integración (ver patrón P-05). Debe poder rotar / cambiar / regenerar sin redeploy del emisor.
- Cada caso de uso típicamente tiene **su propio Webhook Trigger** en HubSpot, o un Trigger compartido con discriminación por el campo `event` del payload. La decisión depende del fan-out: si el mismo evento del core tiene que disparar varios Workflows distintos en HubSpot, conviene un Trigger por Workflow.
- El emisor debe ser **resiliente**: retry con backoff + log persistente / dead letter queue para revisión manual si los reintentos se agotan. La latencia entre el evento del core y la entrega a HubSpot puede ser de segundos a minutos — lo crítico es que **no se pierda**.
- El emisor debe ser **observable**: logging estructurado con identificador del cliente y nombre del evento, para que Producto y Sales puedan responder "¿este cliente generó su evento?" sin pedirle a Tecnología que mire logs crudos.

#### Patrón P-02 — Shape común de eventos del core hacia HubSpot

**Aplicable a:** todo evento que un sistema del core emita hacia HubSpot.

**Forma del payload:**

```json
{
  "event": "<aplicacion>.<dominio>.<accion>",
  "occurred_at": "ISO-8601 timestamp",
  "source": "<servicio emisor, ej: core-lex-backend>",

  "client": {
    "id": "<UUID estable del cliente del lado emisor>",
    "...": "campos del cliente relevantes para el caso"
  },

  "<bloque-específico>": {
    "...": "campos específicos del evento (activación, movimiento, factura, etc.)"
  }
}
```

**Reglas del patrón:**

- `event` sigue convención `<aplicacion>.<dominio>.<accion>` (ej: `lex.client.activated`, `ops.movement.executed`, `fin.invoice.issued`). Permite a HubSpot discriminar entre Workflows cuando un mismo Trigger recibe varios tipos. También es la **clave de lookup en el centro de integración (P-05)** que decide a qué URL se manda.
- `client.id` es siempre el UUID interno del sistema emisor que mejor identifica al cliente. En HubSpot se mappea a una Contact custom property (ej: `lex_client_id`), que es la **clave de upsert** estable. Más confiable que `email` o `tax_number` (mutables / colisionables).
- Campos del bloque `client` son los datos del cliente que aplican al caso. Cada caso de uso decide qué campos van — el core no manda todo el legajo en cada evento.
- Bloques específicos del evento (`activation` para REQ-56, hipotéticamente `movement` para OPS, `invoice` para FIN) capturan los datos del hecho concreto.

#### Patrón P-03 — Identificación del cliente entre el core y HubSpot

**Pendiente de cierre.** Cuando se cierre Q-A (ver §4), se consolida acá el patrón de cómo se mantiene la identidad del cliente entre los IDs del core (LEX `client_id`, CLP `account_id`, etc.) y el Contact de HubSpot.

#### Patrón P-04 — Governance del contrato y del centro de integración

**Owner del contrato del evento (shape, semántica, evolución):** Producto. Versionado en este discovery hasta que tenga sentido moverlo a un schema técnico compartido.

**Owner técnico del centro de integración (P-05):** Tecnología. Construye, mantiene, opera el centro como pieza de infraestructura. Decide la materialización técnica (tabla estática, servicio de routing, etc.) y la forma de extenderlo.

**Owner de las URLs de Webhook Trigger:** Sales & Partnerships. Sales puede regenerar / rotar / reemplazar endpoints sin coordinarlo con un deploy del core. Cuando rota una URL, lo comunica a Tecnología para actualizar la entrada en el centro — sin cambio de código en los emisores.

**Owner del backlog de qué eventos se enchufan al centro:** Producto, vía el flujo formal de requerimientos. Cuando un área del negocio (Sales, Compliance, OPS, lo que sea) quiere que un evento del core dispare algo en HubSpot, levanta un REQ por el flujo estándar. Producto lo enriquece, Tecnología lo materializa **agregando una entrada al centro** — no construyendo una integración nueva. Esto es la diferencia esencial entre el modelo pre-centro y el modelo post-centro.

**Cualquier cambio rompedor del contrato** (rename de campo, cambio de tipo, eliminación de campo) requiere coordinación entre el emisor y todos los consumidores activos de HubSpot antes del deploy.

#### Patrón P-05 — Centro de integración core ↔ destinos externos

**Aplicable a:** todo caso donde un sistema del core emite eventos hacia un destino externo (hoy HubSpot; mañana, potencialmente, Slack, Mailchimp, otros SaaS de comunicación).

**Estado.** Decisión cerrada en sesión con Mauro Pascuccio y Valentina de Loredo (2026-05-05): **el centro se construye como pieza dedicada en REQ-56, no como subproducto opcional**. La discusión sobre "tabla estática vs. servicio interno vs. bus de eventos" pasa de ser una pregunta de Producto ("¿lo hacemos?") a una pregunta técnica de Tecnología ("¿cómo lo hacemos?").

**Problema que resuelve.** Sin un centro central, cada emisor del core (LEX, OPS, FIN, CLP, TRD) hardcodea o gestiona individualmente la URL del Webhook al que envía cada evento. Cuando aparece el segundo, tercero, séptimo evento, el conocimiento de "qué evento va a dónde" queda disperso entre repos. Cuando una URL rota, hay que cazarla en N lugares. Cuando un nuevo destino aparece, hay que rediseñar caso por caso.

**Qué define el patrón.** Existe un **centro único de integración** que mappea cada `event` del core a su destino y URL correspondiente. Cualquier emisor del core consulta ese centro antes de emitir; no necesita conocer URLs específicas, solo el nombre del evento que está emitiendo.

**Propiedades que el centro debe cumplir** (el "qué", definido por Producto):

- **Indexado por `event`.** La consulta natural es "para `lex.client.activated`, ¿a dónde mando?".
- **Soporta múltiples destinos por evento.** Un mismo evento del core puede tener que llegar a más de un sistema externo en el futuro (ej: `lex.client.activated` que dispara email en HubSpot **y** anuncia en un canal de Slack interno).
- **Soporta entornos** (dev / staging / prod) para que la misma config sirva en todos los ambientes con URLs distintas.
- **Las URLs son rotables sin redeploy.** Cambiar la URL de un evento no debe requerir cambio de código en el emisor — es un cambio de configuración.
- **Incluye metadata mínima por entrada.** Al menos: nombre del evento, destino lógico (HubSpot / Slack / etc.), URL del endpoint, owner operativo (quién genera/rota la URL), estado (activo / pausado / deprecado).
- **Es auditable.** Quién agregó cada entrada, cuándo se modificó la URL, cuándo se pausó.
- **Puede pausarse selectivamente.** Si un destino está caído o se descubre un bug en un Workflow de HubSpot, debe poder pausarse la emisión de un evento puntual sin tocar código.
- **Es extensible.** Agregar un evento nuevo al centro debe ser una operación liviana — el costo marginal de cada evento adicional debe ser bajo. Esta es la propiedad que justifica construir el centro: si agregar el segundo evento sigue siendo tan caro como el primero, el centro no agrega valor.

**Cómo se materializa** (el "cómo", definido por Tecnología). El nivel de implementación queda a criterio del equipo técnico, pero las opciones razonables van desde menos a más sofisticación:

- **Tabla de configuración estática** (archivo YAML / JSON / env var estructurada) compartida entre emisores. Simple, transparente, requiere refresh de config para cambios.
- **Servicio de routing interno** que recibe del core en un único endpoint, mira el `event` del payload y reenvía al destino correspondiente según su tabla. Desacopla totalmente a los emisores del destino, habilita observabilidad centralizada, soporta cambios sin redeploy de emisores.
- **Bus de eventos** con suscripciones por destino. Más extensible, soporta replay y multi-consumidor, pero requiere infraestructura significativa.

Producto no impone cuál de estos caminos se elige — esa es decisión de Tecnología en función del volumen previsto, la madurez de la plataforma y el costo operativo de cada opción. Lo que Producto sí define son las **propiedades que el centro debe cumplir** sin importar la implementación.

**Path de evolución.** Es legítimo arrancar simple (tabla estática) y migrar hacia un servicio de routing cuando el volumen, el número de eventos o el número de destinos lo justifiquen. El centro como concepto es estable; su materialización puede evolucionar.

**Sin interface en v1.** El centro existe como pieza de infraestructura, no como producto con UI propia. Las operaciones sobre el centro (alta de entrada nueva, rotación de URL, pausa selectiva, consulta de la metadata) las ejecuta Tecnología directamente sobre la materialización elegida — editando un YAML, corriendo un comando, modificando un row en una tabla. La administración via interface gráfica queda explícitamente diferida hasta la futura aplicación / módulo de **Configuraciones** del core, donde múltiples sistemas transversales (centros de routing, feature flags, parámetros operativos, etc.) se administrarían desde un mismo lugar. Esto desbloquea v1 sin imponer un costo de UI prematura — y mantiene el centro estructuralmente preparado para ser consumido por una UI cuando aparezca.

**Cómo se enchufan eventos nuevos al centro.** La definición de qué eventos del core se enchufan al centro **sigue el flujo formal de requerimientos**, igual que cualquier otro trabajo de Producto:

1. Aparece un caso de uso del negocio ("queremos que un evento de OPS dispare un email en HubSpot").
2. Se levanta un REQ por el canal estándar.
3. Producto enriquece el REQ (define el shape del evento siguiendo P-02, define el caso de uso del lado HubSpot, etc.).
4. Tecnología materializa el caso **agregando una entrada al centro** (no construyendo una integración nueva ad-hoc) y, si corresponde, agregando la lógica del lado del emisor del core.
5. Sales / Marketing configuran el Webhook Trigger y el Workflow del lado HubSpot.

La diferencia respecto al modelo pre-centro es estructural: cada caso nuevo deja de ser un proyecto de integración para pasar a ser **una entrada de configuración + el feature spec del emisor**. El esfuerzo de cada caso baja sustancialmente, y la consistencia entre casos queda garantizada por el patrón.

**Implicancia para los emisores.** Una vez que el centro esté implementado, los emisores del core dejan de gestionar URLs individualmente — consultan el centro y emiten. Esto simplifica el feature spec de cada emisor y elimina duplicación de configuración entre repos.

---

## 2. Casos de uso

### 2.1 Caso activo — REQ-56 · Construcción del centro de integración (caso piloto: email de bienvenida LEX → HubSpot)

**Estado:** En enriquecimiento.

**Naturaleza del REQ.** REQ-56 fue reframeado en sesión con Mauro Pascuccio y Valentina de Loredo del 2026-05-05. Lo que originalmente era "el caso de uso del email de bienvenida" pasó a ser **la construcción del centro de integración core ↔ HubSpot** — la materialización del patrón P-05 — usando el email de bienvenida como **caso piloto que valida el funcionamiento end-to-end del centro**.

Esta reorientación tiene implicancias prácticas:

- El entregable principal del REQ es **el centro funcionando**, no el email funcionando. El email es la prueba de aceptación.
- Cuando aparezcan los próximos eventos (renovación de documentación, notificaciones de OPS, etc.), no se construye nada nuevo: se agrega una entrada al centro. Esto consolida el patrón antes de que aparezcan divergencias caso por caso.
- La discusión "centro como subproducto opcional" desaparece. La construcción del centro es scope explícito y obligatorio del REQ.

#### Resumen funcional

**Lado centro de integración (lo principal del REQ):**

`core-lex-backend` consulta el centro por nombre de evento y emite al destino que el centro le indica. El centro cumple las propiedades del patrón P-05 (indexado por evento, multi-entorno, URLs rotables, auditable, pausable selectivamente, extensible). La materialización técnica (tabla estática vs. servicio interno) la define Tecnología.

**Lado caso piloto (la prueba de aceptación):**

Cuando un legajo en LEX transiciona a `APPROVED`, `core-lex-backend` emite el evento `lex.client.activated` al centro, el centro lo rutea al Webhook Trigger de HubSpot, HubSpot upserta el Contact y dispara un Workflow con un IF/THEN sobre la property `account_manager`:

- **Si el Contact tiene Account Manager asignado** → envía el email de bienvenida.
- **Si no tiene** → no envía, espera. Cuando el AM se complete posteriormente, el Workflow re-evalúa y dispara.

#### Origen del caso

Capturado por Miles vía Slack el 2026-04-23 a partir de un pedido de Valentina de Loredo: el equipo de Sales necesita automatizar el envío del email de bienvenida que hoy recae manualmente sobre Compliance.

El 2026-04-27 mantuve una conversación 1:1 con Valentina por DM de Slack para refinar el scope. Esa conversación cerró las decisiones funcionales del email (ver más abajo).

El 2026-05-05 mantuve sesión de elicitación con Valentina + Mauro Pascuccio. Esa sesión cerró el reframe del REQ: **se construye el centro como pieza dedicada, no como caso aislado**.

#### Datos necesarios en el email del caso piloto (confirmados con Valentina)

1. Nombre
2. Apellido
3. Email
4. Idioma
5. Número de cliente
6. Account Manager

#### Decisiones del REQ

| # | Decisión | Origen | Notas |
|---|---|---|---|
| C56-D-01 | El email se envía cuando el Contact "está completo" en HubSpot, no apenas se activa el legajo en LEX | Sesión 2026-04-27 | Definición operativa: tiene `account_manager` asignado. |
| C56-D-02 | LEX siempre emite el evento, incluso con AM vacío. El filtro vive en HubSpot vía IF/THEN del Workflow | Sesión 2026-04-27 | LEX no necesita saber cuándo "el cliente está completo" — esa lógica vive donde es trivial expresarla. |
| C56-D-03 | Datos mandatorios del email v1: los 6 listados arriba | Sesión 2026-04-27 | Cualquier feature del email que dependa de un dato fuera de esa lista es scope de v2. |
| C56-D-04 | Aplica patrón P-01 (transporte vía Webhook Trigger nativo) | 2026-05-05 | Validado con endpoint de prueba. |
| C56-D-05 | Aplica patrón P-02 (shape común de eventos del core) con bloque específico `activation` | 2026-05-05 | Ver hipótesis de payload abajo. |
| C56-D-06 | La integración es **unidireccional LEX → HubSpot** en v1 | Sesión 2026-04-27 | No hay sincronización inversa (HubSpot → LEX) en este caso. |
| C56-D-07 | El REQ entrega **el centro de integración** (P-05). El email es el caso piloto que prueba el funcionamiento end-to-end | Sesión 2026-05-05 con Mauro y Valentina | Reframe estructural. El centro se construye como pieza dedicada, no como subproducto opcional de la implementación del caso. |
| C56-D-08 | Futuros eventos del core hacia HubSpot llegan por el flujo formal de requerimientos. Tecnología materializa cada caso nuevo agregando una entrada al centro, no construyendo una integración nueva | Sesión 2026-05-05 con Mauro y Valentina | Esta es la propiedad funcional clave que justifica construir el centro vs. arrancar con env var. |

#### Hipótesis de payload — `lex.client.activated`

Validada contra el Webhook Trigger de HubSpot el 2026-05-05. **El shape está confirmado**; los nombres de campo concretos siguen sujetos a cierre de Q-B (definición de "número de cliente").

```json
{
  "event": "lex.client.activated",
  "occurred_at": "2026-04-27T14:32:11Z",
  "source": "core-lex-backend",

  "client": {
    "id": "c1f4e2a8-9b73-4d10-8a2c-1e7f5d6b3c91",
    "type": "PARTICULAR",
    "subtype": "DIRECT",
    "name": "Juan Pérez",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan.perez@ejemplo.com",
    "commercial_email": "ventas@cliente.com",
    "phone": "+541112345678",
    "address": "Av. Corrientes 1234, CABA, Argentina",
    "tax_number": "20345678901",
    "id_number": "34567890",
    "language": "es-AR"
  },

  "account_manager": {
    "id": "u-3a2c1e7f-5d6b-3c91-c1f4-e2a89b734d10",
    "name": "Mauro Pascuccio",
    "email": "mpascuccio@arduasolutions.com",
    "assigned_at": "2026-04-25T10:00:00Z"
  },

  "account_owner": {
    "id": "u-3a2c1e7f-5d6b-3c91-c1f4-e2a89b734d10",
    "name": "Mauro Pascuccio",
    "email": "mpascuccio@arduasolutions.com",
    "assigned_at": "2026-04-25T10:00:00Z"
  },

  "activation": {
    "ardua": true,
    "circuit_pay": false,
    "haz_pagos": true,
    "ardua_docket": "AS-001234",
    "circuit_docket": null,
    "haz_docket": "HAZ-005678",
    "kyc_template": "Local - KYC",
    "activated_by": "compliance.user@ardua.com"
  }
}
```

##### Notas sobre el payload

- **`client.id`** — UUID interno de LEX. Sirve como clave de upsert en HubSpot (Contact custom property `lex_client_id`).
- **`client.language`** — clave para que HubSpot dispare el template en el idioma correcto.
- **`client.commercial_email`** — segundo email del cliente para comunicaciones comerciales, distinto del `email` principal. En LEX vive como campo del cliente, editado por usuarios con rol comercial desde el formulario. Puede ser `null` si el cliente no tiene email comercial cargado.
- **`account_manager`** — Account Manager del cliente. Derivado de `assigned_users[]` filtrando por `role === 'COMMERCIAL'` y tomando el más reciente por `created_at`. Es el "Comercial Asignado" surfaceado en la UI de LEX (popover de Asignar Usuario en la pantalla de Altas). Si no hay AM asignado al momento de emitir, todo el sub-objeto es `null`. LEX siempre emite el evento; el filtro IF/THEN del Workflow de HubSpot es el que evalúa la presencia del AM.
- **`account_owner`** — Account Owner del cliente. **Campo simulado en este payload — muestra el shape esperado** (ver Q-G). Hoy LEX no expone Account Owner como campo del modelo de cliente; es una funcionalidad futura. En v1 puede ser `null`, o poblarse provisoriamente con la misma data que `account_manager` mientras la feature se construye. Cuando LEX agregue Owner explícitamente al modelo, el campo se poblará con datos reales.
- **`activation.[entidad]`** — booleanos por entidad del grupo. Permiten a HubSpot segmentar por qué entidades opera el cliente (relevante para futuras campañas, no solo bienvenida).
- **`activation.[entidad]_docket`** — el "número de cliente" candidato (ver Q-B). Si se confirma que el número de cliente del email es el docket, el template puede priorizar `ardua_docket > haz_docket > circuit_docket`.
- **`activation.activated_by`** — auditoría. Útil para investigar incidentes sin cruzar con el log de LEX.
- **Shape concreto de `account_manager` y `account_owner`** — los campos `id`, `name`, `email`, `assigned_at` son la propuesta inicial para ambos objetos (mismo shape). El equipo backend confirma el shape final durante el handoff a Tecnología, en función del modelo de `assigned_users` y la tabla de usuarios en `core-lex-backend`.

### 2.2 Casos anticipados (en horizonte, no aterrizados)

Estos son casos de uso que han emergido en conversaciones sobre el relevamiento pero no tienen REQ creado todavía. Una vez que el centro esté construido (REQ-56), cada uno de estos se materializa **agregando una entrada al centro + el feature spec del emisor**, no construyendo una integración nueva.

| Caso | Emisor probable | Naturaleza del evento | Notas |
|---|---|---|---|
| Notificación de vencimiento de documentación | LEX | `lex.document.expiring_soon` | Cuando un cliente tiene documentación próxima a vencer, disparar email de recordatorio gestionado por Sales/Compliance vía HubSpot. Ya emerge naturalmente del modelo `due_date` de LEX. |
| Notificación de cliente desactivado | LEX | `lex.client.deactivated` | Excluir al cliente de campañas activas en HubSpot cuando se desactiva el legajo. |
| Update de datos del cliente post-activación | LEX | `lex.client.updated` | Cambios en email, dockets adicionales, AM si vive en LEX, etc. |
| Eventos de movimientos / operaciones | OPS | `ops.movement.executed` | Comunicación al cliente cuando se ejecuta un movimiento relevante (alta, retiro, transferencia internacional, etc.). |
| Eventos de facturación | FIN | `fin.invoice.issued` | Notificación cuando se emite una factura al cliente. Posible interacción con secuencias comerciales. |
| Eventos de cuenta operativa | CLP | `clp.account.activated` | Cuando un cliente activa una capacidad operativa nueva en CLP, comunicación de bienvenida específica de esa capacidad. |
| Eventos de operación ejecutada | TRD | `trd.quote.executed` | Confirmación de trade ejecutado al cliente, posible secuencia comercial post-trade. |
| Aplicación de Configuraciones (futuro) | n/a (consumidor del centro, no emisor) | n/a | Cuando se cree el módulo o aplicación de Configuraciones del core, una de sus primeras vistas será la administración del centro de integración: alta/edición/pausa de entradas, audit log, rotación de URLs vía formulario en lugar de operación manual sobre el archivo. Hasta entonces, la administración del centro la hace Tecnología directamente sobre la materialización elegida. |

Esta tabla es viva: se agregan casos cuando aparecen en conversación, se tachan o reescriben cuando se aterriza el caso real (el shape final puede diferir de la estimación). **No es un commitment de roadmap** — es un mapa de probabilidades para que el discovery anticipe consistencia.

---

## 3. Implicancias para los emisores del core

Los siguientes son requisitos que aplican a **cualquier sistema del core que vaya a emitir eventos hacia HubSpot**, no solo LEX. Cada emisor materializa estos requisitos en su propio feature spec cuando le toca:

- **Emitir el evento en el momento correcto del lifecycle del registro** que el caso de uso documente. La granularidad del trigger la define el caso de uso, no el emisor.
- **No gestionar URLs individualmente.** El emisor consulta el centro de integración (patrón P-05) por nombre de evento y emite a la URL que el centro le indica. No hay env vars de URLs por evento dispersas en cada emisor.
- **El emisor debe ser resiliente.** Retry con backoff + dead letter queue / log persistente. La latencia entre el evento y la entrega exitosa puede ser de segundos a minutos — lo crítico es que **no se pierda**.
- **El emisor debe ser observable.** Logging estructurado con `client.id` y `event` que permita búsqueda. Ideal: dashboard simple con tasa de éxito y eventos en cola/dead-letter.
- **El emisor debe respetar el patrón P-02** (shape común). Cualquier divergencia en el shape se discute y se incorpora al patrón en este discovery — no se introduce silenciosamente.

Cuando un caso de uso aterrice y vaya a Tecnología, estos requisitos se propagan al feature spec del módulo emisor (ej: `features/lex/lex-altas.md` para REQ-56, `features/ops/ops-movimientos.md` para un futuro caso OPS, etc.).

**Ninguna versión inicial del centro requiere UI.** Las operaciones manuales del lado de Tecnología (editar el YAML, modificar la entrada en la tabla) son suficientes hasta que aparezca el módulo de Configuraciones. La ausencia de UI no es deuda técnica — es un alcance v1 explícito.

---

## 4. Cuestiones abiertas

Las cuestiones se identifican con un código que indica si son **transversales al relevamiento** (Q-A, Q-B, ...) o **específicas de un caso de uso** (C56-Q-01 = Q-01 del caso REQ-56).

### Transversales — afectan el patrón general

#### Q-A — Identificación del cliente entre el core y HubSpot

¿Cada cliente del core (LEX) existe ya como Contact en HubSpot, o se crea recién cuando emite su primer evento? Si existe, ¿bajo qué criterio se identifica con el cliente del core (email? tax_number? un id externo?)?

**Por qué importa.** Define el patrón P-03 (identificación). Si el cliente ya existe en HubSpot antes del primer evento (ej: porque pasó por el funnel comercial como prospecto y avanzó a cliente), el evento de "alta" no crea sino que actualiza. Si no existe, crea. Cualquier caso de uso futuro hereda esta decisión.

**Acción.** Auditoría con Valentina del lifecycle del Contact en el funnel comercial: cuándo se crea, qué properties tiene cuando se crea, cómo se identifica con el cliente cuando este activa en LEX.

#### Q-B — ¿"Número de cliente" es el `id_number` o algo diferente?

Pregunta original de Valentina (sesión 2026-04-27). Aplica primero al caso piloto de REQ-56 pero condiciona qué campo del payload se usa como "número de cliente del cliente final" en cualquier caso de uso futuro que muestre ese dato al cliente.

**Hipótesis a validar.** Lo más probable es que el "número de cliente" que Sales tiene en mente sea **el docket de la entidad principal del cliente** (en general `ardua_docket` para cuentas internacionales, `haz_docket` o `circuit_docket` para cuentas locales). El `id_number` de LEX es la identificación fiscal/personal — dato de KYC — no es un identificador comercial natural.

**Acción.** Confirmar con Mauro y/o Valentina cuál es el campo que ellos consideran "número de cliente" en su operación actual.

#### Q-C — Plan contratado y límites operativos de HubSpot

¿Qué plan tiene Ardua, qué módulos están habilitados, qué límites aplican en términos de Workflows / Contacts / emails mensuales / Workflow Triggers / API rate limits?

**Por qué importa.** Cualquier caso de uso del horizonte que sume volumen (ej: notificaciones masivas de OPS) puede chocar con un límite de plan que no estamos viendo. Conviene saber el techo antes de comprometer roadmap.

**Acción.** Auditoría con Valentina / Mauro de la configuración de la cuenta.

#### Q-D — Privacy review

La integración mueve PII de KYC al sistema de un tercero (HubSpot). Antes del go-live de **cualquier** caso de uso, validar con Legal & Compliance:

- Qué set de campos es legítimo transportar.
- Si hay implicancias regulatorias adicionales para clientes que activan vía Astra Ventures (Polonia / GDPR) o Ardua Solutions Corp (Canadá / PIPEDA) frente a Haz Pagos / Circuit Pay (Argentina).
- Si HubSpot como procesador de datos cumple con los marcos aplicables para cada entidad.

**Acción.** Sesión con Legal & Compliance antes del go-live de REQ-56.

#### Q-E — Protocolo operativo de URLs en el centro de integración

El endpoint actual del Webhook Trigger es de prueba. Antes del go-live de cada caso de uso, Sales debe generar (o consolidar) el endpoint productivo correspondiente y entregarlo al equipo que mantiene el centro para crear/actualizar la entrada.

**Acción.** Definir protocolo simple para el ciclo de vida operativo de las entradas del centro:

- Quién pide la creación de una entrada nueva (Producto, vía REQ formal, cuando aterriza un caso de uso).
- Quién provee la URL (Sales — Valentina como referente).
- Quién aplica el cambio en el centro (Tecnología, dueño técnico del centro).
- Cómo se notifica una rotación de URL (propuesta: notificación por Slack al canal de Tecnología).

#### Q-F — Materialización del centro de integración *(cerrada parcialmente — 2026-05-05)*

**Cerrado.** El centro se construye en REQ-56. La discusión "lo hacemos o no lo hacemos" pasó de pregunta de Producto a decisión cerrada en sesión con Mauro y Valentina.

**Sigue abierto:** la materialización técnica concreta (tabla estática YAML/JSON, servicio de routing interno, bus de eventos) la define Tecnología. Producto recomienda arrancar simple y migrar a algo más sofisticado solo cuando volumen / casos lo justifiquen.

**Acción.** Conversación con Tecnología (Mauricio) para que defina la materialización técnica de v1 antes de arrancar la implementación del REQ.

#### Q-G — Account Manager y Account Owner como campos distintos del contrato *(decisión 2026-05-05)*

**Hallazgo.** Validado contra la UI de LEX (popover "Asignar Usuario" en la pantalla de Altas, captura compartida por Yasmani el 2026-05-05): hoy LEX expone "Comercial Asignado" como `assigned_users[role=COMMERCIAL]` (el más reciente por `created_at`). Operativamente, ese es el Account Manager. Account Owner como campo distinto es una feature futura del modelo de LEX; no existe hoy.

**Decisión.** El contrato del Hub incluye **dos campos top-level distintos**: `account_manager` y `account_owner`. Son conceptos diferentes con shape idéntico (`id`, `name`, `email`, `assigned_at`):

- `account_manager` se popula con datos reales en v1, derivado del comercial asignado en LEX.
- `account_owner` se incluye en el contrato de manera forward-looking. En v1 puede ser `null` o llenarse provisoriamente con la misma data que el AM (campo simulado) mientras se construye la feature en LEX. Cuando aterrice, se poblará con datos reales del modelo de Owner.

El Workflow de HubSpot filtra el envío del email por `account_manager` (el operacional, el que existe hoy). Owner queda disponible en HubSpot para usos estratégicos del lado Sales/CRM (atribución, escalation, reporting), no para gating del email de bienvenida.

### Específicas del caso piloto REQ-56

#### C56-Q-01 — Flujo de asignación del Account Manager

Sé que el AM se asigna manualmente por un comercial **después** del alta del cliente, pero no sé:

- Quién dispara la asignación: ¿el HoS (Mauro), el comercial que captó el lead, automáticamente vía pipeline de HubSpot, otro?
- Dónde queda registrada: ¿como property del Contact en HubSpot, en el Deal asociado, en algún otro sistema?
- **Si la asignación ocurre en HubSpot directamente**, LEX nunca se entera del AM y el filtro IF/THEN puede operar sin necesidad de un segundo evento `lex.client.updated` desde LEX. Esto simplifica mucho la integración.

**Por qué importa para REQ-56.** Si la respuesta es "vive solo en HubSpot", el alcance del caso piloto se reduce a un único evento (`lex.client.activated`) y el `lex.client.updated` queda fuera de scope.

**Acción.** Conversación con Mauro para mapear el flujo real de asignación del AM.

---

## 5. Próximos pasos

1. **Sesión con Mauro Pascuccio** para cerrar Q-B (definición de "número de cliente") y C56-Q-01 (flujo de asignación del AM). Pendiente de agenda — son las dos cuestiones más bloqueantes para que el caso piloto del centro funcione.
2. **Auditoría de HubSpot con Valentina** para cerrar Q-A (lifecycle del Contact e identificación con el core) y Q-C (plan contratado y límites). Esta auditoría también alimenta el inventario de properties existentes vs. a crear.
3. **Conversación con Tecnología (Mauricio)** sobre la materialización técnica del centro (Q-F restante) y el protocolo operativo de URLs (Q-E). Define cómo se construye el centro y cómo se opera una vez en producción.
4. **Privacy review con Legal & Compliance** (Q-D) antes del go-live de REQ-56.
5. **Actualización del REQ-56 en Jira** con el reframe (centro como entregable principal, email como caso piloto), nuevo título, decisiones C56-D-07 y C56-D-08 incorporadas.
6. Una vez cerradas Q-B y C56-Q-01, **separar el alcance del trabajo de REQ-56** entre:
   - Construcción del centro de integración (P-05) → núcleo del REQ, owner técnico Tecnología.
   - Cambio en LEX (emisión del evento, integración con el centro, retries, observabilidad) → parte del mismo REQ.
   - Configuración en HubSpot (Webhook Trigger, Workflow del email, template, properties, condición IF/THEN sobre AM) → trabajo del equipo de Valentina, posiblemente sin REQ formal.
7. **Continuar el relevamiento de capacidades de HubSpot** con Valentina y Mauro a medida que aparecen los casos del horizonte (ver §2.2). Cada vez que un caso aterriza, se materializa como entrada al centro + feature spec del emisor — siguiendo el flujo formal de requerimientos.

---

## Referencias

- **REQ-56** — `https://arduasolutions.atlassian.net/browse/REQ-56` (construcción del centro de integración + caso piloto).
- **Conversación 2026-04-27 con Valentina de Loredo** — DM Slack `D0B039J1YJC`, mensajes entre `1777295804.558559` y `1777298850.946779`. Sesión que cerró las decisiones funcionales del email de bienvenida.
- **Sesión de elicitación 2026-05-05 con Valentina y Mauro** — Reframe estructural: REQ-56 entrega el centro de integración con el email como caso piloto.
- **Hilo Slack del REQ-56** — `https://arduasolutions.slack.com/archives/C0AKNPCNNSU/p1776960674573259`.
- **`entities/hubspot.md`** — catalogación de HubSpot como herramienta del ecosistema operativo.
- **`features/lex/` (pendiente)** — propagación futura de los requisitos de emisión de eventos hacia el feature de Altas de LEX, cuando arranque el handoff a Tecnología de REQ-56.
- **`features/ops/`, `features/fin/`, `features/clp/`, `features/trd/` (pendiente)** — propagación futura de los requisitos de emisión cuando los casos del horizonte aterricen.
