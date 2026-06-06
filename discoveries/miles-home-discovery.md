---
name: Home de Miles — contenido ramificado por perfil y fuente de identidad
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-05
updated_at: 2026-06-06
propagates_to:
  - workflows/miles-slack-event-router.json
  - workflows/miles-jira-work-items-handler.json
---

# Home de Miles — contenido ramificado por perfil y fuente de identidad

## Objetivo
Definir qué contenido muestra el App Home de Miles según el perfil de la persona
(stakeholder, técnico, líder de área, producto, technical lead) y cuál es la
fuente de verdad de la identidad de cada persona (quién es, qué puesto, qué área)
que dispara esa ramificación.

## Contexto
Miles es un Product Manager: su visión está siempre orientada al método de
producto. Hoy la app de Slack ya opera en modo reactivo — el Messages Tab está
activo pero el envío de texto libre está deshabilitado ("Sending messages to this
app has been turned off"). El usuario interactúa solo por lo que Miles le empuja
(CTAs, inputs, botones). El App Home es el siguiente paso: debe mostrar
información relevante y accionable según quién es la persona y en qué área trabaja.

La intención es que el Home no sea genérico: un stakeholder de Finance, un dev y
un líder de área deberían ver cosas distintas, alineadas a lo que cada uno
necesita del ciclo de vida de requerimientos que Miles acompaña.

> **Estado al 2026-06-06:** el sistema completo está CONSTRUIDO y validado de
> punta a punta — identidad desde Notion, ruteo por 5 perfiles, datos de Jira en
> vivo vía el handler centralizado. Renderiza correctamente en App Home desktop
> con datos reales. Quedan hipótesis abiertas (carousel) y pendientes de proceso
> (estado de aprobación, prioridades globales).

## Hipótesis

### H1 — La identidad de la persona vive en Notion, no se deduce de Slack — VALIDADA
Slack da pertenencia a canales, no rol. La distinción de perfil —el eje de
ramificación del Home— no vive de forma confiable en Slack.

**Resolución (2026-06-06):** la identidad NO requirió crear una base nueva. Ya
existe la infraestructura en el teamspace de Producto de Notion (página "Data
Bases"), con tres bases relacionadas que alcanzan para todo el ruteo:

- **Stakeholders** (db `376e8880-def6-805c-bd88-fc5b2c6765f0`). Campos usados:
  `Slack ID` (text), `Group` (multi_select cerrado: C-Level / Head / Manager /
  Specialist / Analyst / External), `Role` (text libre), `Jira ID` (text,
  accountId de Atlassian), `Business Area` (relation), `Capabilities` (relation),
  `Name`, `Email`, `Notion ID`, `Status`.
- **Capabilities** (db `836a99fd-c232-44b8-a2bf-17fb388f0d0c`). Campos: `Code`,
  `Name`, `Description`, `Stakeholders` (relation). 9 capabilities. La clave para
  el ruteo es `req.ticket.take` ("Tomar tickets disponibles · Perfil técnico").
- **Business Areas** (db `43a8018b-e397-44b6-87f6-59c6dadaba00`). Campos: `Name`
  (title), `Slack Channel ID` (text), `Stakeholders` (relation).

El campo crítico para el ruteo NO es un único "rol" sino la combinación
**Group + Capabilities + Role** (ver H2).

> Breadcrumb: estas bases de identidad también son dependencia de
> `challenges-interactivos-discovery.md` (mapping Slack user → identidad interna
> para validar quién responde un challenge). Se consumen desde ambos.

### H2 — El contenido se ramifica en 5 perfiles, con precedencia Role > Group > Capability — VALIDADA
La hipótesis original de "3 perfiles como capas aditivas" evolucionó a **5
perfiles resueltos por un árbol de precedencia**. El `Group` por sí solo no
alcanza: dos personas con `Group = Manager` pueden ser un PM o un Technical Lead,
y un `Group = Head` puede ser un líder de área de negocio o el Head of Product.

**Árbol de decisión final del `Resolve Profile` (orden de precedencia):**

1. **`Role` contiene "Product"** → perfil `producto` (precede a TODO). Cubre al
   Head of Product, que es `Group = Head` pero debe ver la vista de Producto, no
   la de líder de área de negocio.
2. **`Group` Head / C-Level** → `lider`
3. **`Group` Analyst** → `stakeholder`
4. **`Group` Manager / Specialist** → si tiene capability `req.ticket.take` →
   `tecnico`; si no → `producto`
5. **Fallback** (sin match en Stakeholders, o sin Group) → `producto`

**Flag adicional:** dentro del perfil `tecnico`, si `Role == "Technical Lead"` se
activa `is_tech_lead`, que suma una sección de Refinamiento al Home (ver más
abajo).

Los 5 perfiles y su contenido (todos en patrón tabla — ver H4):

**`stakeholder`** (Analyst) — filtra por Business Area
- Requerimientos activos de su área (PWIs, `status NOT IN (Done, DEPRECATED)`).
- CTAs: "Nuevo requerimiento", "Pedir informe".

**`lider`** (Head / C-Level de área de negocio) — filtra por Business Area
- En espera de aprobación → "Próximamente" (no existe el estado, ver D-proceso).
- Todos los requerimientos del área, con columna Owner (vista agregada).
- Prioridades globales → "Próximamente" (ver D1).

**`producto`** (PM; o cualquiera con Role "Product") — filtra por su Jira ID, sobre PWIs
- En curso → `IN ANALYSIS` + `IN PROGRESS`, asignados a la persona.
- Por enriquecer → `To Do`, asignados a la persona.
- Disponibles → `To Do` sin assignee (todas las áreas — el PM es transversal).
- Bloqueados → `BLOCKED`, asignados a la persona.
- Prioridades globales → "Próximamente" (Producto es quien las gestiona).

**`tecnico`** (Specialist/Manager + `req.ticket.take`) — filtra por su Jira ID, sobre EWIs
- En curso → `IN PROGRESS` + `CODE REVIEW`, asignados a la persona.
- Disponibles → `READY FOR DEV` sin asignar.
- Bloqueados → `BLOCKED`, asignados a la persona.
- CTA: "Informar bloqueante".

**`technical lead`** (perfil `tecnico` + `Role == "Technical Lead"`) — dos secciones sobre EWIs
- SECCIÓN REFINAMIENTO: Disponibles (`TO REFINEMENT` sin asignar) · Para hacer
  (`TO REFINEMENT` asignado) · En curso (`IN REFINEMENT`) · Bloqueados (`BLOCKED`).
- SECCIÓN DESARROLLO: idéntica al perfil `tecnico`.

### H3 — El CTA "Nuevo requerimiento" abre un chat nuevo de Claude — EN INVESTIGACIÓN
El flujo de alta arranca en Claude (skill `ardua-req-definition`), que estructura
el requerimiento y lo deriva al canal correspondiente mencionando a Miles. El Home
solo acorta el camino.

**Hallazgo técnico (2026-06-05):** el parámetro `claude.ai/new?q=` para pre-cargar
un prompt en Claude web **fue removido** (octubre 2025) por una vulnerabilidad de
prompt injection. No vuelve en web. Sí funciona el esquema `claude://` de Claude
Desktop: `claude://claude.ai/new?q=<mensaje-url-encoded>` (q se trunca a ~14k
chars). → Depende de que la persona tenga Claude Desktop instalado (dependencia de
adopción D2, no bloqueo técnico).

**Estado al 2026-06-06:** en la implementación actual el botón "Nuevo
requerimiento" está presente en los templates como `action_id: new_requirement`,
pero su comportamiento (deep link vs abrir web) queda pendiente de cablear con la
infra de interactividad (D3). Por ahora es un botón sin handler.

### H4 — Patrón visual: tablas por defecto, cards cuando lo amerite — VALIDADA
Se evaluó tabla (`data_table`) vs card (`card`) como patrón base.

**Resolución (2026-06-06):** **tablas por defecto, cards cuando lo amerite.**
Validado en vivo: el `data_table` renderiza perfecto en App Home **desktop** (con
filtro nativo + botón expandir). En **mobile** NO muestra filtro ni expandir
(limitación de plataforma de Slack — su diseño prioriza render compacto en
pantallas angostas). Como la mayoría abre el Home desde desktop, las tablas son la
elección correcta. Las cards quedan para bloques que son "una entidad con acción"
más que "una lista".

### H5 — Algunas secciones se verían mejor como carousel de cards — ABIERTA (próximo paso)
Hipótesis nueva (2026-06-06): secciones como "Disponibles" o "En curso" podrían
mostrarse como un **carousel de cards** en vez de tabla, para un look más rico y
navegable. El bloque `carousel` existe en Slack (lanzado abril 2026, junto con
card/alert) y renderiza en App Home. No construido aún — queda como próximo
experimento visual. Riesgo a validar: cómo se comporta el carousel en mobile
(misma precaución que el data_table en H4).

## Hallazgos técnicos de la sesión (2026-06-06)

### Block Kit — schema de bloques nuevos
- **`card`**: estructura PLANA. `title`/`subtitle`/`body`/`actions` van en la raíz
  del bloque, NO anidados bajo una key `"card": {}`. (El blog post de Slack mostraba
  la forma anidada, está desactualizado; el Builder y la referencia esperan plana.)
  Soportado en surface `home`.
- **`data_table`**: campos válidos = `type`, `caption` (REQUERIDO), `rows`. NO lleva
  `column_settings` (eso es del bloque viejo `table`). Rows = arrays de celdas
  `raw_text`/`raw_number`/`rich_text`. Mínimo 2 rows (header + 1), máximo 101, máximo
  20 columnas. Primera row = header. Sort automático.
- Bloques nuevos Slack 2026: card/alert/carousel (abril), data_table (20 mayo).
  Todos renderizan en App Home. Hasta 100 bloques por Home.

### Notion — IDs MCP vs REST (causó 3 correcciones)
**El MCP de Notion y la API REST usan identificadores DISTINTOS para la misma
tabla.** El MCP (`fetch`) devuelve el **collection ID** (el del tag
`<data-source url="collection://...">`). La API REST que usa n8n necesita el
**database ID** (el que devuelve `notion-search` tipo "database", o el de la URL
del navegador `notion.so/{id}?v=...`). Son distintos y la REST rechaza el
collection ID con "Could not find database with ID".

**Regla:** para queries n8n → Notion, usar SIEMPRE el database ID de la URL/search,
nunca el `collection://` del fetch. IDs correctos confirmados:
- Stakeholders: `376e8880-def6-805c-bd88-fc5b2c6765f0`
- Capabilities: `836a99fd-c232-44b8-a2bf-17fb388f0d0c`
- Business Areas: `43a8018b-e397-44b6-87f6-59c6dadaba00`

### Jira — endpoint de búsqueda nuevo
El viejo `/rest/api/3/search` **fue removido** de Jira Cloud (HTTP 410). Hay que
usar **`/rest/api/3/search/jql`**. Dos cambios del endpoint nuevo:
- El default de `fields` ahora es solo `id` — hay que pedir explícitamente los
  campos (`summary,status,assignee,customfield_10310`).
- Paginación por `nextPageToken` (no `startAt`). Para el App Home los volúmenes son
  chicos (< 100 issues por perfil), así que V1 no pagina; con `maxResults` alto
  alcanza. Reportes de comunidad indican que la paginación del endpoint nuevo es
  problemática — evitar depender de ella mientras se pueda.

### n8n — typeVersion del nodo Switch
El nodo `Switch` en **typeVersion 1** renderiza un número fijo de puertos de salida
y NO agrega un puerto nuevo solo porque se agregue una regla al array. Síntoma: una
salida nueva (la 5ª) queda visualmente desconectada aunque la conexión exista en el
JSON. **Solución:** usar **typeVersion 3.2**, que renderiza un puerto por cada regla
(estructura `rules.values` con `conditions` + `outputKey` por salida, y
`options.fallbackOutput` para el default). Aprendizaje: los Switch nuevos van directo
en 3.2.

### Estados reales verificados de Jira (2026-06-06)
- **PWI**: Backlog · To Do · IN ANALYSIS · IN PROGRESS · BLOCKED · SENT TO DEV ·
  READY FOR DEV · IN DEVELOPMENT · Done · DEPRECATED. (NO existe estado de "espera
  de aprobación".)
- **EWI**: TO REFINEMENT · IN REFINEMENT · READY FOR DEV · IN PROGRESS · CODE
  REVIEW · BLOCKED · Done · DEPRECATED. El proyecto EWI usa DOS tableros (Refinement
  board 172, Development board 174) que son dos ventanas filtradas del mismo
  continuo de estados, no dos proyectos.
- Business Area (`customfield_10310`): los `Name` de la base Business Areas de Notion
  **coinciden exactamente** con los valores del customfield en Jira (Finance &
  Accounting, Legal & Compliance, Operations, Sales & Partnerships, Trading Desk,
  Management). El `Name` es puente directo Notion → Jira, sin tabla de mapeo.
  (El handler además tiene el mapa nombre → ID de opción: 10128-10133.)

## Arquitectura implementada (2026-06-06)

### Principio: toda operación de Jira pasa por el jira-handler
**Decisión de arquitectura clave.** El `miles-slack-event-router` NO habla con
Jira directamente. Existe un gateway centralizado, `miles-jira-work-items-handler`
(webhook `POST /webhook/jira-work-items`), que es el único dueño de Jira. El router
le pide vía HTTP. Beneficio: si cambia el endpoint, la auth o un campo de Jira, se
toca en un solo lugar y todos los consumidores siguen andando. Replica el patrón de
separación de responsabilidades del framework (§3.5).

El handler ya tenía operaciones de escritura (`create`/`update`/`transition`/
`delete`). En esta sesión se le agregó la operación **`search`** (lectura por JQL),
que es lo que el App Home consume.

### Cadena del App Home (en miles-slack-event-router)
`app_home_opened` → `Get Home User Info` (Slack, nombre) → `Query Stakeholder by
Slack ID` (Notion) → `Query Capability — ticket.take` (Notion, resuelve pageId por
Code en runtime) → `Resolve Profile` (calcula perfil con precedencia Role>Group>
Capability) → `Resolve Area Name` (Notion, pageId área → Name) → `Build JQL` (arma
el JQL por perfil) → `Query Jira (via handler)` (POST al webhook del handler con
`operation: search`) → `Switch — Profile` (4 salidas) → `Build Home — [perfil]`
(reparte issues en secciones, arma Block Kit) → `Publish App Home` (views.publish).

Arquitectura de queries: **una query JQL amplia por perfil**, el reparto en
secciones se hace en el builder (JS), no con un nodo HTTP por sección. Más eficiente
y mantenible.

### Credenciales
- Notion: `notionApi` cred `Notion-API-Miles` (id `aldMlehkPJEZ6AqY`), header
  `Notion-Version: 2022-06-28`.
- Jira (en el handler): `httpBasicAuth` cred `Jira-API-Miles` (id
  `LXRpdRXQLv37KLaS`). El router NO tiene credencial de Jira (correcto).

## Dependencias

- **D1 — Reporte de prioridades global.** Los bloques de prioridades de `lider` y
  `producto` dependen de un reporte (aún no implementado) con todos los
  requerimientos activos priorizados. Hoy salen como "Próximamente".
- **D2 — Estandarización de Claude Desktop (Ardua 4x).** Condiciona H3 (CTA con
  prompt pre-cargado).
- **D3 — Infra de interactividad de Miles.** Los botones del Home
  (`new_requirement`, `request_report`, `report_blocker`, los `static_select` de
  tomar/recomendar) requieren Interactivity activada (Request URL → n8n) y los
  handlers correspondientes. Misma infra que `challenges-interactivos-discovery.md`.
  Hoy los botones están en el Block Kit pero sin handler.

## Decisión de proceso abierta

- **Estado de "espera de aprobación" en PWI.** El perfil `lider` quiere ver
  "requerimientos en espera de tu aprobación", pero el workflow de PWI NO tiene un
  estado que represente eso. Es una decisión de proceso (¿se agrega un estado? ¿se
  modela con un campo? ¿con el approval tracker de Notion?). Hasta resolverla, el
  bloque sale "Próximamente".

## Definiciones resueltas en la sesión
1. ~~Criterio de "ticket disponible" para técnico~~ → `READY FOR DEV` + sin assignee.
2. ~~Qué estado representa "espera de aprobación"~~ → no existe; queda como decisión
   de proceso abierta, bloque "Próximamente".
3. Copy exacto del prompt del CTA → pendiente (depende de D3 + D2).
4. Resolución de D2 con a4x → pendiente.

## Pendientes / próximos pasos
- **Carousel de cards** (H5): experimentar con secciones en formato carousel.
- **Botones con handler** (D3): cablear la interactividad de los CTAs.
- **Prioridades globales** (D1): construir el reporte que alimenta esos bloques.
- **Estado de aprobación** (decisión de proceso): definir y luego cablear el bloque
  del perfil líder.
- **Activar config en Slack app**: event subscription `app_home_opened` + Home Tab
  (si no están ya activos).
- **Bug colateral detectado**: el `miles-reminder-handler` usa el collection ID malo
  de Capabilities (`a2a071ba-...`) en `Query Capability Own` y `Query Own
  Stakeholders` — probablemente falla silenciosamente al resolver aprobadores.
  Revisar por separado si los recordatorios de aprobación no llegan.

## Cómo termina este discovery
Tooling de proceso, no feature de producto. Sus conclusiones propagan a
`workflows/` (los dos workflows de Miles: el router y el jira-handler). El discovery
permanece `En investigación` porque quedan hipótesis abiertas (H5 carousel) y
pendientes de proceso/interactividad. Las bases de identidad de Notion
(Stakeholders/Capabilities/Business Areas) son artefacto compartido, referenciado
también desde `challenges-interactivos-discovery.md`.

## Referencias
- `jira-automations-discovery.md` — handoff PWI↔EWI, fuente de los estados de Jira.
- `challenges-interactivos-discovery.md` — comparte las bases de identidad y la
  infra de interactividad de Miles.
- `release-awareness-discovery.md` — patrón de UX reactiva.
- `workflows/miles-slack-event-router.json` — router con la cadena del App Home.
- `workflows/miles-jira-work-items-handler.json` — gateway de Jira (incl. search).
- Doc Anthropic sobre deep links de Claude Desktop (esquema `claude://`), abril 2026.
- Doc Slack: data_table block, card block, build-richer-agent-experiences (2026).
- Doc Atlassian: migración a `/rest/api/3/search/jql` (CHANGE-2046).
