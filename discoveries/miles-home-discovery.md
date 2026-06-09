---
name: Home de Miles — contenido ramificado por perfil y fuente de identidad
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-05
updated_at: 2026-06-09
propagates_to:
  - workflows/miles-slack-event-router.json
  - workflows/miles-jira-work-items-handler.json
  - workflows/miles-conversation-handler.json
  - workflows/miles-requirement-approval-handler.json
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

> **Estado al 2026-06-09:** se formalizó la **arquitectura de información de 4
> niveles** transversal a todas las vistas (ver H8). El ruteo pasó de 5 a **7
> perfiles**: se separaron los 3 perfiles técnicos (`tecnico` dev común /
> `tech_lead` / `it_lead`) y se agregó el perfil `externo` (corrige un bug de
> ruteo donde los External caían en la vista de PM por el fallback). Capacity del
> equipo (Nivel 2) se construyó como carousel de cards con CTA a Jira por persona
> (cierra parte de H5). Se reordenaron y renombraron las secciones de Work Items
> según la jerarquía de niveles. Validado en vivo, salvo lo señalado como pendiente.

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

### H2 — El contenido se ramifica en perfiles, con precedencia Role/Área > Group > Capability — VALIDADA (evolucionó a 7 perfiles, 2026-06-09)
La hipótesis original de "3 perfiles como capas aditivas" evolucionó primero a **5
perfiles** y luego (2026-06-09) a **7 perfiles**. El `Group` por sí solo no
alcanza: dos personas con `Group = Manager` pueden ser un PM o un Technical Lead,
y un `Group = Head` puede ser un líder de área de negocio o el Head of Product.

**Cambios 2026-06-09 (que llevaron de 5 a 7 perfiles):**
1. **Separación de los 3 perfiles técnicos.** Antes el Technical Lead era un flag
   `is_tech_lead` dentro del perfil `tecnico`. Ahora son **tres perfiles distintos**
   con builder y salida de Switch propios: `tecnico` (dev común), `tech_lead`
   (Technical Lead) e `it_lead` (Head/CTO de Tecnología). Identificación del TL:
   `Business Area = Technology` + `Role` que matchea `/technical lead/i`. Se mantiene
   `is_tech_lead` en el output por compatibilidad (true solo para `tech_lead`).
2. **Nuevo perfil `externo`.** `Group = External` no estaba capturado por ninguna
   regla y caía en el fallback `producto` — los externos veían la vista de PM (bug
   detectado con Juan Saladino, `Group:['External']`, `Role:'Legal Advisor'`,
   Slack `U0B3HPF0KGW`). Se agregó una regla `External` **al tope del árbol**
   (precede a todo: un externo es externo aunque tenga un Business Area asignada).

**Árbol de decisión final del `Resolve Profile` (v4, orden de precedencia):**

0. **`Group` External** → `externo` (precede a TODO). Vista mínima: solo Prioridades
   globales (Nivel 4).
1. **Head/C-Level + Area Technology** → `it_lead` (Santiago, Mati).
2. **Head/C-Level + Area Product** → `producto` (Head of Product opera como PM).
3. **Head / C-Level (otras áreas)** → `lider`.
4. **Area Technology + Role "Technical Lead"** → `tech_lead`.
5. **Area Technology (resto)** → `tecnico` (dev común).
6. **Area Product** → `producto`.
7. **Group Analyst** → `stakeholder`.
8. **Group Manager / Specialist** → `stakeholder`.
9. **Fallback** → `producto`.

Los 7 perfiles y su contenido (alineados a la arquitectura de 4 niveles — ver H8):

**`externo`** (Group External) — vista de Invitado
- Solo **Prioridades globales** (Nivel 4), todas las áreas, modo lectura.
- Sin CTA de nuevo requerimiento, sin secciones de Work Items.

**`stakeholder`** (Analyst / Manager / Specialist no técnico) — filtra por Business Area
- Secciones de Work Items (Nivel 3) en este orden: Bloqueados · Análisis funcional ·
  Análisis técnico · En desarrollo (denominaciones nuevas — ver H8).
- Prioridades globales (Nivel 4). CTA "Nuevo requerimiento".

**`lider`** (Head / C-Level de área de negocio) — filtra por Business Area
- En espera de tu aprobación (Nivel 1, card operativa — ver H7) → arriba de todo.
- Mismas secciones de Work Items que el stakeholder (Nivel 3) + Prioridades (Nivel 4).

**`producto`** (PM; o Head of Product) — filtra por su Jira ID, sobre PWIs
- En curso · Por enriquecer · Disponibles · Bloqueados (Nivel 3) + Prioridades (Nivel 4).

**`tecnico`** (dev común: Technology sin Role Technical Lead) — filtra por su Jira ID, sobre EWIs
- Pipeline personal de desarrollo (Nivel 3): Bloqueados · En curso · Míos·Sin empezar ·
  Sin asignar·Listos para tomar. SIN Capacity, SIN pseudo-tabs. + Prioridades (Nivel 4).
- CTA: "Informar bloqueante". Botón "Tomar" en los disponibles (self-assign).

**`tech_lead`** (Technology + Role "Technical Lead") — vista de liderazgo técnico
- **Capacity del equipo** (Nivel 2, carousel — ver H8/H5).
- **Work Items** (Nivel 3) con pseudo-tabs Refinamiento ⇄ Desarrollo, partición por
  TIPO (ver H8): Refinamiento = Épicas; Desarrollo = no-Épicas (Stories). Filtro del TL:
  asignado a mí + sin asignar. Botón "Asignar".
- Prioridades globales (Nivel 4).

**`it_lead`** (Head/CTO de Tecnología: Santiago, Mati) — vista global de IT
- **Capacity del equipo** (Nivel 2, carousel).
- **SIN Nivel 3** (decisión 2026-06-09): por definición no tienen EWIs asignados;
  mostrarles secciones de reparto era ruido. Su vista es Capacity + Prioridades.
- Prioridades globales (Nivel 4).

### H8 — Arquitectura de información de 4 niveles, transversal a todas las vistas — VALIDADA (2026-06-09)
Independientemente del perfil, toda vista del Home se organiza segun una **jerarquia
fija de 4 niveles**, ordenados de mayor a menor urgencia de accion. No todos los
perfiles tienen todos los niveles, pero el ORDEN entre los niveles que sí tienen es
siempre el mismo. Esta norma reemplaza el ordenamiento ad-hoc por vista que había antes.

**Nivel 1 · Acción Inmediata** — lo que requiere acción de la persona YA para
desbloquear algo. Va arriba de todo.
- Hoy: "En espera de tu aprobación" (solo `lider`, ver H7).
- Próximamente: "En espera de tu acción" (cualquiera de quien se necesite algo para
  destrabar un REQ o Tarea).

**Nivel 2 · Gestión de la Capacidad** — solo `tech_lead` e `it_lead`.
- Sección "Capacity del equipo": una card por persona de Tecnología (excluyendo
  liderazgo — Head/C-Level no son ejecutores), con conteos en curso / bloqueados /
  sin empezar / refinamiento y la carga total. Indicador de carga por emoji en el
  subtitle (⚪/🟢/🟠/🔴). **CTA "Ver en Jira"** por card: link al board EWI (174)
  filtrado por esa persona, `?assignee=<jiraId>` (el `:` del jiraId URL-encoded a
  `%3A` vía `encodeURIComponent`). Si la persona no tiene jiraId, card sin botón.
  Render: carousel de cards (ver H5). El roster sale de Notion Stakeholders filtrado
  por `Business Area = Technology`, excluyendo `Group` Head/C-Level.

**Nivel 3 · Gestión de Work Items** — el contenido cambia por perfil:
- **Stakeholder** (no técnico): estado de los PWIs de su área. Secciones (en este
  orden, con denominaciones nuevas): **Bloqueados · Algo nos impide avanzar** →
  **En análisis y validación funcional · Producto** → **En análisis y validación
  técnica · Tecnología** → **En proceso de desarrollo**. Bloqueados va primero (es
  lo que requiere acción para destrabar).
- **Lider**: mismas secciones que el stakeholder (debajo del Nivel 1).
- **Producto**: PWIs asignados a él + los sin asignar.
- **`tech_lead`**: 2 subsecciones (pseudo-tabs Refinamiento ⇄ Desarrollo). La
  partición es por **TIPO** del work item, NO por estado (validado con datos reales
  de Jira, 2026-06-09): **Refinamiento = Épicas** (cualquier estado activo:
  TO/IN REFINEMENT, BLOCKED); **Desarrollo = todo lo que NO es Épica** (Stories;
  desde READY FOR DEV en adelante). Esto corrige el bug de filtrar por estado: había
  3 Épicas BLOCKED que caían mal en Desarrollo. Las **subtareas NO se muestran como
  cards** (`ewiRows` las excluye con `!isSubtask`); solo alimentan el conteo
  "tareas completadas" del card padre vía `byParent`. Filtro del TL en ambas
  subsecciones: **asignado a mí + sin asignar** (cola personal + lo tomable), NO
  todo el equipo. (Capacity —Nivel 2— sí usa todo el equipo: son dos recortes
  distintos de la misma data.)
- **IT Heads** (`it_lead`, Head + CTO): **SIN Nivel 3** (decisión 2026-06-09). Por
  definición no tienen EWIs asignados (si los tuvieran, sería raro). Antes se les
  mostraban secciones con datos que no les correspondían (Santiago, Mati). Se les
  sacó la sección entera: su vista es Capacity (Nivel 2) + Prioridades (Nivel 4).

**Nivel 4 · Prioridades globales** — todos los perfiles lo ven (ver H6).

**Denominaciones de secciones (Nivel 3, no técnicos).** Se actualizaron para llevar
un sufijo de contexto en el header (todo en el mismo header, no como subtítulo):
`Bloqueados · Algo nos impide avanzar`, `En análisis y validación funcional · Producto`,
`En análisis y validación técnica · Tecnología`, `En proceso de desarrollo`. El
`Bloqueados` del dev común también lleva `· Algo nos impide avanzar` por consistencia
transversal; las otras dos denominaciones son específicas del flujo de stakeholder.

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

**Resolución (2026-06-08):** el botón se resuelve como **botón URL de Block Kit**
apuntando a `https://claude.ai/ask-your-org`. Reemplaza el deep link `claude://`
con prompt precargado (H3 original). Al ser botón URL no pasa por el handler de
interactividad — se le quitaron `action_id` y `value`. Esto saca a H3 de la
dependencia D2 (ya no necesita Claude Desktop instalado): abre el espacio de la
org en Claude web, donde la persona arranca el alta con la skill `ardua-req-definition`.
Aplicado en los 3 builders que lo llevan (producto, stakeholder, lider). Los
perfiles técnicos NO tienen este botón (tienen "Informar bloqueante").

### H4 — Patrón visual: tablas por defecto, cards cuando lo amerite — VALIDADA
Se evaluó tabla (`data_table`) vs card (`card`) como patrón base.

**Resolución (2026-06-06):** **tablas por defecto, cards cuando lo amerite.**
Validado en vivo: el `data_table` renderiza perfecto en App Home **desktop** (con
filtro nativo + botón expandir). En **mobile** NO muestra filtro ni expandir
(limitación de plataforma de Slack — su diseño prioriza render compacto en
pantallas angostas). Como la mayoría abre el Home desde desktop, las tablas son la
elección correcta. Las cards quedan para bloques que son "una entidad con acción"
más que "una lista".

### H7 — La card "En espera de tu aprobación" se resuelve con el Tracker de Notion + el hilo de Slack (sin Jira), y un resumen LLM del problema — VALIDADA
El perfil `lider` debía mostrar "requerimientos en espera de tu aprobación". La
decisión de proceso que estaba abierta (¿estado en PWI? ¿campo? ¿tracker?) se
resolvió: **se modela con el REQ Approval Tracker de Notion, NO con un estado de
Jira**. El ciclo de aprobación de un REQ vive enteramente en Slack (hilo) + Notion
(lock del tracker); Jira recién entra cuando el REQ es aprobado y se crea el ticket.
Por eso la card no toca Jira.

**Fuente de los datos de la card (2026-06-07):**
- **REQ Approval Tracker** (db `20437e6c-297a-4afe-923a-29b5d01ad26c`). Un row por
  REQ en espera (lock). Campos usados: `Thread ID` (title), `Channel ID`, `Requester
  ID`, `Locked At` (created_time), `Status` (Pending/Approved/Rejected), `Approver ID`
  y el campo NUEVO `Eligible Approver IDs` (ver abajo).
- **Hilo de Slack** del REQ (vía `conversations.replies`): de ahí sale el texto del
  problema para mostrar en la card, y la re-validación de si el hilo ya fue resuelto.

**Resolución approver ↔ card — campo nuevo `Eligible Approver IDs`.**
Problema descubierto: `Approver ID` nace VACÍO en un lock Pending — solo se llena
cuando alguien efectivamente resuelve la aprobación. Entonces no servía para filtrar
"qué le toca aprobar a esta persona". Solución: se agregó al Tracker el campo
**`Eligible Approver IDs`** (RICH_TEXT, CSV de Slack user IDs), poblado AL CREAR el
lock con todos los aprobadores candidatos del área (los que `Check Approval Gate` ya
resolvía en el conversation-handler). La card filtra
`Status = Pending AND Eligible Approver IDs contains <user_id>`. `Approver ID` queda
reservado para quién resolvió (auditoría), no para elegibilidad.

**Resumen del problema con LLM (Groq).** El texto del problema se muestra como un
resumen de 1-2 líneas en español rioplatense, generado con Groq
(`llama-3.3-70b-versatile`, endpoint OpenAI-compatible, credencial predefinida tipo
Groq). Cascada de fallback: resumen Groq → texto del problema extraído del hilo
(parser de la sección `:mag: _Problema_`) → "abrí el hilo".

**Re-validación contra Slack:** antes de mostrar, se relee el hilo y se descarta si
ya está resuelto (marcas "🎉 Requerimiento creado" / "tu requerimiento fue rechazado
por") — evita mostrar como pendiente algo ya cerrado.

**Forma:** cards apiladas (NO carousel — H5 sigue abierta para otras secciones).
El subtitle lleva `:loudspeaker:` + la mención del solicitante + la antigüedad de la
espera. Botón "Ir a conversación" (estilo neutro, sin primary) que abre el panel del
hilo vía permalink con `?thread_ts=<ts>&cid=<channel>`. (No se muestra avatar del
solicitante — ver el aprendizaje de Block Kit sobre `slack_icon`/`hero_image`.)

### H5 — Algunas secciones se verían mejor como carousel de cards — PARCIALMENTE VALIDADA (2026-06-09)
Hipótesis nueva (2026-06-06): secciones como "Disponibles" o "En curso" podrían
mostrarse como un **carousel de cards** en vez de tabla, para un look más rico y
navegable. El bloque `carousel` existe en Slack (lanzado abril 2026, junto con
card/alert) y renderiza en App Home.

**Resolución parcial (2026-06-09):** el carousel de cards se ADOPTÓ y renderiza
bien en App Home desktop — todas las secciones de Work Items (Bloqueados, En curso,
etc.) y la sección **Capacity del equipo** usan `carousel` con cap de 10 cards.
Funciona. Queda pendiente validar el comportamiento en **mobile** (misma precaución
que el data_table en H4) antes de cerrar la hipótesis del todo.

**Aprendizaje crítico — `slack_icon.name` es un enum CERRADO (refuerza H7-icon).**
Al intentar diferenciar las cards de Capacity por nivel de carga con íconos distintos
(`white_check_mark`, `hourglass`, `warning`), Slack **rechazó el `views.publish`
ENTERO** con `must be a valid enum value [/view/blocks/N/elements/M/slack_icon/name]`.
Un solo `name` inválido tumba todo el publish y el Home no se actualiza (síntoma:
"el botón nuevo no aparece" — en realidad NADA se actualiza). **`rocket` es el único
name validado.** Decisión: las 4 cards de carga usan `rocket`; la señal de carga va
en el **emoji del subtitle** (⚪ sin carga · 🟢 con margen · 🟠 ok · 🔴 alta), no en el
ícono del card. Si en el futuro se quieren íconos diferenciados: usar `image_url` (no
`name`) o probar nombres del enum de a uno con `rocket` como fallback.

### H6 — "Prioridades globales" = dos tablas (What's next / What's going on), particionadas por el tipo del EWI espejo — VALIDADA
La sección "Prioridades globales" estaba inconsistente entre perfiles: los
builders PWI (producto/stakeholder/lider) mostraban una tabla de PWIs filtrada
por `issueType = Requirement`; los builders EWI (tecnico/it_lead) mostraban una
tabla DISTINTA, partiendo del EWI y buscando su PWI, con ranking propio del board
de EWI. Misma sección, dos significados, dos rankings. Rompía la premisa de
transparentar de forma UNIFICADA el trabajo de Producto + Tecnología ante
stakeholders no técnicos.

**Resolución (2026-06-07):** una sola definición de la sección, idéntica para los
cinco perfiles, construida SIEMPRE desde el PWI (es la unidad que el stakeholder
—técnico o no— conoce: su requerimiento). La sección se compone de DOS tablas que
responden dos preguntas de naturaleza distinta:

- **What's next?** — cola de priorización. PWIs Requirement que aún no entraron al
  ciclo de desarrollo. El orden por LexoRank del PWI es el protagonista (qué sigue
  y en qué orden).
- **What's going on?** — seguimiento de lo que ya está en construcción. El orden de
  cola deja de mandar; importa la fase (y a futuro, el % de completitud).

**Regla de partición — por el TIPO del EWI espejo, no por el estado del PWI.**
El estado del PWI NO distingue refinamiento de desarrollo (se verificó en vivo:
PWI-72/71/67/64 y PWI-63 están todos en `SENT TO DEV`, pero los primeros tienen
espejo `Epic` —siguen en refinamiento— y PWI-63 tiene espejo `Story` —ya en dev).
El tipo del EWI espejo sí lo distingue, porque al pasar a `READY FOR DEV` la Épica
se convierte en Story (ver `jira.md`). Por eso:

```
Para cada PWI Requirement activo (status NOT IN (Done, DEPRECATED)):
  espejo = issuelinks.find(l =>
       l.type.name === 'Problem/Incident'   // name interno real del link type
    && l.type.outward === 'causes'          // visto desde el PWI
    && l.outwardIssue
    && l.outwardIssue.key.startsWith('EWI-')        // descarta AM-* legacy
    && ['Epic','Story'].includes(l.outwardIssue.fields.issuetype.name)
  )
  sin espejo válido   -> What's next      (aún no cruzó a Tecnología)
  espejo tipo Epic    -> What's next      (cruzó, en refinamiento)
  espejo tipo Story   -> What's going on  (en desarrollo real)
```

Los BLOCKED no se usan para particionar: caen naturalmente del lado que les
corresponde según el tipo de su espejo (bloqueado antes de dev → next; bloqueado
ya en dev → going on). Esto resuelve que `BLOCKED` sea alcanzable desde casi
cualquier estado y por sí solo no diga de qué lado de la línea está.

**Diferencia entre perfiles:** solo la trazabilidad técnica. No técnicos
(stakeholder/lider/producto): columnas `PWI · Requerimiento · Estado · Prioridad ·
Área`. Técnicos (tecnico/it_lead): las mismas filas y el mismo orden, + columna del
EWI espejo (key). Una fuente, un ranking, un significado.

**Cardinalidad confirmada:** 1 Requirement ↔ 1 EWI espejo (verificado sobre 16
PWIs; ninguno tiene más de un `Problem/Incident` saliente). No hace falta regla de
desempate.

**Implicancia de implementación:** toda la sección se resuelve con UNA query a PWI
trayendo `issuelinks` — el `outwardIssue` ya incluye `fields.issuetype` y
`fields.status` del espejo, así que la partición no requiere segundo salto a EWI.
Esto invierte la lógica de los builders técnicos (hoy parten del EWI): pasan a
partir del PWI igual que el resto.

**Ajustes de render (2026-06-07, validados en App Home en vivo):**
- La sección lleva un header `:round_pushpin: Prioridades globales` + un context
  kicker ("Cola de Producto y Tecnología · priorización y seguimiento"). El `header`
  block tiene tamaño fijo y NO supera al `caption` del data_table; la jerarquía de
  sección se fija por emoji + kicker, no por tamaño (validado en Block Kit Builder).
- Los títulos de cada tabla (con su contador) viven en el `caption` del data_table,
  no en sub-headers — el caption es obligatorio, así que un header propio por tabla
  duplica. Queda: un header de sección único + dos captions (`What's next? (N)` /
  `What's going on? (N)`).
- What's next: columna `Rank` al inicio = entero consecutivo 1,2,3… según orden
  LexoRank del PWI (posición de prioridad legible, no el string LexoRank). El Rank
  va SOLO en What's next (es la prioridad; en going on el orden ya no manda).
- What's going on: la columna `Estado` muestra el estado del EWI espejo (lo más
  cercano a la realidad de construcción), no el del PWI.
- Ambas tablas llevan `Área`; los perfiles técnicos suman la columna `EWI` (key).
- La sección la ven los 5 perfiles, incluido el dev común (técnico no-TL). El
  `Build JQL` del perfil `tecnico` trae PWI Requirement siempre (query combinada
  `project IN (PWI, EWI)`), no solo si es TL.
- Footer del Home: desglose `${next} en cola · ${going} en curso` en vez del conteo
  total de PWI activos (que incluía tipos no mostrados y generaba ruido). Los conteos
  se exponen desde `buildPrioridadesGlobales` vía `opts.counts`.

## Hallazgos técnicos de la sesión (2026-06-09)

### Pseudo-tabs en App Home (Refinamiento ⇄ Desarrollo) — no hay tabs nativos
El App Home no soporta tabs nativos dentro de la superficie Home. Se simulan con dos
botones (`home_tab_refinamiento` / `home_tab_desarrollo`) que disparan `block_actions`
→ el actions-router postea un evento sintético `app_home_opened` con un campo `tab` →
el router reconstruye el Home con esa pestaña activa. El campo `tab` es **efímero**
(sin persistencia): viaja en el evento sintético y se propaga `Classify Event` →
`Build JQL` → builder. Default: `refinamiento`. El botón-tab inactivo usa
`style: undefined` (al serializar el JSON desaparece la key; Slack lo acepta). Los
headers de fase `▸ REFINAMIENTO`/`▸ DESARROLLO` se eliminaron por redundantes con los
botones. Solo `tech_lead` tiene pseudo-tabs (el `it_lead` ya no tiene Nivel 3).

### Bug de ruteo de External — el fallback `producto` capturaba a los externos
Síntoma: Juan Saladino (`Group:['External']`) entraba por la vista de Product Manager.
Causa: `Resolve Profile` no tenía regla para `External`, y el fallback final es
`producto`. Cualquier Group no contemplado caía en la vista de PM. Resolución: regla
`if (group.includes('External')) → 'externo'` al TOPE del árbol (antes que todo).
Lección general: un fallback a un perfil con privilegios (PM ve todo) es peligroso;
los Groups del enum de Notion (incluido External) deben tener todos una regla explícita
antes del fallback. Verificación de identidad siempre contra el registro real de Notion
(`notion-fetch` de la página del stakeholder) antes de codear la regla.

### Trabajar SIEMPRE sobre el estado vivo de n8n, no sobre el repo
Reincidencia del patrón ya conocido: el repo en disco puede estar desfasado de
producción. En esta sesión, los builders no-técnicos del repo tenían versiones VIEJAS
(con el botón deprecado "Pedir informe" / `request_report` y `action_id:'new_requirement'`).
Un ensamblaje que partió del repo reintrodujo esas versiones viejas (el "bug del botón
Pedir informe"). Corrección: traer los builders de la versión VIVA vía
`get_workflow_details`, no del repo, y aplicar mutaciones quirúrgicas sobre esa base.
Verificar siempre el estado vivo con `get_workflow_details` + `execute_workflow` con
payload real antes de asumir qué hay en producción.

### El usuario importa los JSON manualmente — "no veo el cambio" suele ser "no importé aún"
Varias veces en la sesión el síntoma "no aparece el botón / el cambio" se debió a que
el JSON entregado todavía no había sido importado a n8n (el archivo vive en el workspace
de Claude; el vivo sigue con la versión anterior hasta el import manual). Antes de
diagnosticar un bug de código, confirmar que el workflow vivo efectivamente tiene los
cambios (vía `get_workflow_details`). En un caso el CTA de Capacity SÍ estaba en el
vivo y generaba el botón en la salida del `execute_workflow` — el no-render real era el
bug de los íconos inválidos (ver H5), no la ausencia del CTA.

## Hallazgos técnicos de la sesión (2026-06-08)

### Default tab del App Home — la feature "Agents & AI Apps" fuerza la apertura en Chat (2026-06-08)
Miles abría por defecto en la pestaña **Chat** en vez de **Home**, sin forma
aparente de controlarlo desde `views.publish` ni desde la config de tabs. Causa
raíz: la app tenía activada la feature **Agents & AI Apps** de Slack, que reemplaza
el Messages tab por las pestañas **Chat / History** y fuerza la superficie
conversacional como default — comportamiento de plataforma, NO configurable por la
app ni por views. La pista decisiva fue el set de tabs "Home · Chat · History ·
About" + el badge AGENT + "Sending messages to this app has been turned off".
**Resolución:** se desactivó la feature Agent/Assist → Miles vuelve a app clásica
y abre en Home. Los recordatorios siguen funcionando vía `chat.postMessage` (no
dependían de la superficie de agente). El flujo de captura de REQ tampoco se afecta:
corre por menciones firmadas en canales, no por eventos de agente.

### Estados de Jira normalizados a MAYÚSCULAS + comparación case-insensitive en builders (2026-06-08)
Síntoma: la sección "En curso" del perfil técnico mostraba 0 pese a que el dev
tenía 6 EWIs `IN PROGRESS`. Causa raíz: el `status.name` real de Jira venía con
capitalización de palabra (`'In Progress'`), pero los builders comparaban contra
`'IN PROGRESS'` de forma case-sensitive. El JQL es case-insensitive (la query SÍ
traía los issues), pero el filtro JS del builder los descartaba. NO era un problema
de Jira ID (se verificó idéntico al accountId del board).
**Resolución doble:** (1) Yasmani normalizó TODOS los `status.name` de Jira a
MAYÚSCULAS manualmente; (2) se redefinió `inStatus()` como case-insensitive
(`(r.status||'').toUpperCase()` contra el array `.map(upper)`) y se envolvieron
todas las comparaciones `r.status === 'X'` en `.toUpperCase()`, en los 5 builders.
Esto inmuniza contra futuras inconsistencias de capitalización. Nota: el
`statusCategory.key` sigue en minúscula (`done`/`indeterminate`/`new`) — esas
comparaciones NO se tocan, son estables.

### Las secciones de desarrollo muestran solo el EWI padre, no las subtareas (2026-06-08)
EWI-60 (Story) tiene 5 subtareas (EWI-81..85), todas `IN PROGRESS` y asignadas al
mismo dev. La query traía la Story + las 5 subtareas, y "En curso" renderizaba 6
cards (la Story y cada subtarea suelta). **Resolución:** se agregó
`isSubtask: !!(f.issuetype && f.issuetype.subtask)` al `row()`, y `ewiRows`
(las cards operativas de dev en los builders técnicos) filtra `!r.isSubtask`. Ahora
EWI-60 aparece como 1 sola card. La barra de progreso de "What's going on" NO se
afecta (viene de la query aparte `search_children`).

### Un card block NO tiene footer; el `(done/total)` en el subtitle NO renderiza → va al final del body (2026-06-08)
Se quiso mostrar un indicador `(done/total)` de subtareas en las cards de EWI con
hijos (solo builders técnicos — Producto/Stakeholder/Lider tienen cards de PWI, que
no tienen subtareas directas). Primer intento: appendear `(0/5)` al `subtitle` de la
card. **El JSON se generaba correctamente** — verificado ejecutando el router en
runtime: el subtitle salía `🟠 Medium · 📍 Operations · ⏱ hace 7 días · (0/5)` y el
`byParent` llegaba poblado con la key del EWI. **Pero el App Home NO renderiza esa
porción del subtitle** — el dato está en el payload pero no se ve. Diagnóstico:
recorrido completo del flujo de datos (handler `search_children` correcto, nodo HTTP
`Jira — Search Children` pide `parent,status,issuetype,summary`, `Resolve Children
Keys` ampliado para incluir los EWI Story de las cards de dev) — todo sano; el corte
era de **render**, no de datos.
**Confirmado de la doc oficial de Slack:** el bloque `card` tiene el set de campos
`slack_icon / title / subtitle / body / hero_image / actions` (al menos uno de
hero_image/title/actions/body requerido). **NO existe un campo `footer`.** Lo más
cercano a "esquina inferior izquierda" es el final del `body` (texto libre que el
Home SÍ renderiza completo, arriba de los `actions`).
**Resolución:** el indicador se appendea al final del `body` como
`` _`2/5` Tareas completadas_ `` (italic, con la fracción en código/backticks). El
truncado a 200 chars del body se aplica ANTES de appendear, para que el contador
nunca se pierda por el clip. Aplicado en los 2 builders técnicos (Tecnico, IT Lead).
Regla general derivada: **el subtitle de un card es poco confiable para datos
secundarios en App Home; usar el body para lo que tiene que verse sí o sí.**

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

### Lectura de Slack desde Code node — `this.helpers` NO es confiable (2026-06-07)
Leer el hilo de Slack (`conversations.replies`) con
`this.helpers.httpRequestWithAuthentication.call(this, 'slackApi', ...)` DENTRO de un
Code node devolvía vacío de forma intermitente/silenciosa. Síntoma concreto: el campo
`fullText` llegaba vacío al nodo de Groq, que entonces respondía "No hay información
para resumir". El parser y Groq estaban bien; la LECTURA era la que fallaba.
**Regla:** las llamadas HTTP autenticadas (Slack, etc.) van en un **nodo HTTP visible**,
no embebidas en Code. Beneficio doble: confiabilidad + debugeo (se ve input/output del
nodo en la ejecución). Aplica a cualquier llamada externa.

### Slack Block Kit — avatares en un card block: `slack_icon` exige `name`, `hero_image` es banner (2026-06-07)
El campo `slack_icon` de un card block (el ícono junto al título) acepta SOLO un
`name` de un conjunto cerrado de íconos. `rocket` es válido; `hourglass_flowing_sand`
y `bell` NO fueron aceptados. **Un solo bloque con un `slack_icon` inválido hace que
Slack rechace el `views.publish` ENTERO** (`ok:false`, error tipo
`/view/blocks/N/slack_icon/name`), no solo ese bloque — el Home queda sin actualizar.
Verificado en vivo al intentar pasarle una imagen: Slack devuelve
`missing required field: name [json-pointer:/view/blocks/N/slack_icon]`. **El
`slack_icon` NO acepta `image_url` — requiere `name`.** (Corrige una nota previa que
asumía que aceptaba un ImageElement con URL.)

Para mostrar una imagen DENTRO de un card, el campo es **`hero_image`**
(`{ type:'image', image_url, alt_text }`; la doc lista `hero_image/title/actions/body`
como el set de campos, al menos uno requerido). PERO `hero_image` renderiza como una
imagen destacada grande tipo **banner**, no como un avatar pequeño — no sirve para
"foto de la persona al lado del título". Un avatar mini iría en un `context` block,
pero eso es un bloque aparte, fuera de la card.

**Decisión (2026-06-07):** para la card de aprobación se vuelve al emoji `:loudspeaker:`
en el subtitle (sin foto). El avatar real queda para el próximo desafío (cards de
capacidad de equipos de Tecnología), y NO se resolverá llamando a `users.list` en cada
render: se cacheará el directorio de usuarios en una **Data Table de n8n refrescada
~2×/día** por un workflow programado, y las cards la consultarán localmente. Se
descartó y revirtió el experimento de un nodo `Fetch Users` (`users.list`) por card.

### Arquitectura de la card de aprobación — Split → Fetch → Parse → Groq → Assemble (2026-06-07)
La rama `lider` del router resuelve la card con nodos visibles, todos con la llamada
externa FUERA de Code (consecuencia del aprendizaje de `this.helpers`):
`Query Approval Locks` (Notion; locks Pending filtrados por `Eligible Approver IDs`
contains el user) → `Split Locks` (Code: desagrega a N items, sin llamadas externas,
arrastra `byParent`) → `Fetch Thread` (HTTP visible: `conversations.replies`, 1×item,
neverError) → `Parse Thread` (Code: extrae `problemaParser` + `fullText` del hilo,
detecta `_skip` si ya está resuelto) → `Summarize Problem (Groq)` (HTTP visible,
`llama-3.3-70b-versatile`, neverError) → `Assemble Approval Cards` (Code: cascada de
fallback, reensambla `approval_cards[]` + reinyecta `byParent`) → `Build Home — Lider`.
Los datos de la card se leen por REFERENCIA item-paired (`$('Parse Thread').all()[i]`),
no se confía en que el nodo HTTP arrastre los campos de entrada hacia adelante.

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

### Jira — issuelinks PWI↔EWI: name real del link type y forma del payload (2026-06-07)
- **El `name` interno del link type NO es "causes".** Es **`Problem/Incident`**
  (link type nativo de Jira reutilizado). `causes` / `is caused by` son los LABELS
  (`outward` / `inward`), no el name. Verificado uniforme sobre 16 PWIs con espejo.
  Implicancia: filtrar por labels (`inward`/`outward`) está bien; pero cualquier
  lógica que asuma `type.name === 'causes'` falla. En JQL, `issueLinkType = "causes"`
  funciona porque Jira acepta los labels — pero el name no es ese.
- **El `outwardIssue` del PWI trae `fields.issuetype`, `fields.status` y
  `fields.priority` del EWI espejo** embebidos. Permite particionar (Epic vs Story)
  y conocer el estado del espejo SIN segunda query a EWI.
- **Ruido real en links — la validación del par es necesaria.** PWI-34 tiene, además
  del `causes → EWI-26`, links `Relates → PWI-33` y `Blocks → PWI-47` (hacia otros
  PWI). Sin validar `name === 'Problem/Incident'` + target `EWI-*` + tipo Epic/Story,
  se contarían mal. Como todavía no hay restricción a nivel Jira sobre qué link types
  se pueden usar, la validación del par es obligatoria en todo análisis de relación
  PWI↔EWI.
- **Espejos legacy `AM-*`.** PWI-40 apunta a `AM-932 (Story)` — board deprecado
  (era REQ/AM/MAIN). El filtro `key.startsWith('EWI-')` los descarta correctamente.
- **Estado del PWI no sincroniza 1:1 con el avance del EWI en todos los saltos:**
  varios PWI en `SENT TO DEV` tienen su EWI aún en `TO REFINEMENT`. Razón adicional
  para particionar por tipo de espejo, no por estado del PWI.

### Estados del PWI Requirement antes del ciclo de desarrollo (2026-06-07)
Confirmado con Head of Product: el board PWI para work items tipo Requirement usa
`TO DO · IN ANALYSIS · BLOCKED` antes de `SENT TO DEV`. `IN PROGRESS` en PWI es solo
para work items que NO son Requirement (Automatización, Investigación, etc.).
`BLOCKED` es alcanzable desde casi cualquier estado no terminal (todos menos `Done`
y `DEPRECATED`).

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
`operation: search`) → `Switch — Profile` (7 salidas) → `Build Home — [perfil]`
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

- **D1 — Reporte de prioridades global. — RESUELTA (2026-06-07, ver H6).** Ya no es
  "Próximamente". La sección "Prioridades globales" se define como dos tablas
  (What's next / What's going on) construidas desde el PWI, idénticas para los cinco
  perfiles salvo la columna de trazabilidad EWI en los técnicos. No depende de un
  reporte externo: se resuelve con la query de PWI que el App Home ya hace.
- **D2 — Estandarización de Claude Desktop (Ardua 4x).** Condiciona H3 (CTA con
  prompt pre-cargado).
- **D3 — Infra de interactividad de Miles.** Los botones del Home
  (`new_requirement`, `request_report`, `report_blocker`, los `static_select` de
  tomar/recomendar) requieren Interactivity activada (Request URL → n8n) y los
  handlers correspondientes. Misma infra que `challenges-interactivos-discovery.md`.
  Hoy los botones están en el Block Kit pero sin handler.

## Decisión de proceso abierta

- ~~**Estado de "espera de aprobación" en PWI.**~~ → RESUELTA (2026-06-07, ver H7).
  No se modela con un estado de Jira sino con el **REQ Approval Tracker de Notion**
  (lock por REQ Pending) + el hilo de Slack. La card del perfil `lider` ya es
  operativa. El filtro de elegibilidad usa el campo nuevo `Eligible Approver IDs`.

## Definiciones resueltas en la sesión
1. ~~Criterio de "ticket disponible" para técnico~~ → `READY FOR DEV` + sin assignee.
2. ~~Qué estado representa "espera de aprobación"~~ → no se modela con estado de Jira;
   se resuelve con el REQ Approval Tracker de Notion + hilo de Slack (ver H7). Card
   operativa al 2026-06-07.
3. Copy exacto del prompt del CTA → pendiente (depende de D3 + D2).
4. Resolución de D2 con a4x → pendiente.
5. ~~Criterio y forma de "Prioridades globales"~~ → dos tablas (What's next / What's
   going on), partición por tipo del EWI espejo, perspectiva única PWI (ver H6).

## Pendientes / próximos pasos
- ~~**Carousel de cards** (H5): experimentar con secciones en formato carousel.~~ →
  ADOPTADO (2026-06-09, ver H5). Pendiente solo validación en mobile.
- **Botones con handler** (D3): cablear la interactividad de los CTAs.
- ~~**Prioridades globales** (D1)~~ → RESUELTO (H6). Pendiente: aplicar el criterio
  en los 5 builders del router (próximo paso de esta sesión).
- ~~**Conteo de tareas + % de completitud en What's going on**~~ → IMPLEMENTADO
  (2026-06-07, validado en vivo). Columna `Avance` con barra de progreso textual
  (`▓▓▓░░░ 75% (3/4)`) en What's going on, los 5 perfiles. Arquitectura (separación
  de responsabilidades, §3.5):
    - **Handler** (`miles-jira-work-items-handler`, id `dknbrlcPzLuJz4Bb`): operación
      nueva `search_children`. Recibe `parentKeys: ['EWI-60', ...]`, hace
      `parent IN (...)` SIN filtro de estado (los child Done cuentan al numerador),
      agrupa por `parent.key` y devuelve `byParent` con el `statusCategory.key` de
      cada child. NO calcula completitud — solo trae los child crudos (el handler es
      dueño de Jira, no de la lógica de presentación). Tolerante a `parentKeys`
      vacío → devuelve `byParent: {}` sin llamar a Jira (`_childEmpty`).
    - **Router**: dos nodos nuevos entre `Query Jira (via handler)` y `Switch — Profile`:
      `Resolve Children Keys` (Code: resuelve los espejos Story de going-on, arma
      `parentKeys`) → `Fetch Children Progress` (HTTP: POST al handler `search_children`).
      Los builders leen los issues por REFERENCIA (`$('Query Jira (via handler)')`) y
      el `byParent` de `$json`. El CÁLCULO de completitud vive en el builder
      (`buildPrioridadesGlobales`), no en el handler.
    - **Regla de completitud**: si el espejo Story tiene child → `done/total` (mandan
      los child; done = `statusCategory.key === 'done'`). Si NO tiene child → la Story
      es la unidad: 100% si su statusCategory es done, 0% si no. El `(done/total)` solo
      se muestra cuando hay child.
    - **Dependencia de proceso** (Yasmani, 2026-06-07): se implementará una automatización
      Jira que impida mover una EWI a Done con child abiertos — elimina de raíz la
      inconsistencia "Story Done con child no-Done", reforzando que mandan los child.
  Es el primer caso del App Home que requiere el segundo salto a EWI.
- **Validar carousel + secciones en mobile** (2026-06-09): el carousel de cards y las
  secciones de Work Items están validados en App Home desktop; falta confirmar el
  render en mobile (misma precaución que el data_table en H4). Cierra H5 del todo.
- **CTA feedback UX para el botón Tomar/Asignar** (2026-06-09): revisar con perspectiva
  fresca el feedback del self-assign para usuarios ansiosos (estado intermedio
  "⏳ Tomando…" vía takingKey; el `views.publish` colapsa estados intermedios si las
  llamadas son <~1.3s, limitación de plataforma confirmada). Pendiente.
- **Secciones personales mezclan tipos de PWI** (hallazgo 2026-06-07): las secciones
  En curso / Por enriquecer / Disponibles de los perfiles producto/stakeholder/lider
  filtran `rows` por estado SIN filtrar por `issueType = Requirement`. Como la query
  de PWI trae todos los tipos activos (Requirement, Work Automation, Investigación,
  Activities…), esas secciones podrían mostrar tipos no-Requirement mezclados. Es
  decisión de producto (¿qué tipos ve cada perfil en sus secciones personales?), no
  bug de esta tarea. Resolver en sesión aparte.
- **Espejo del rank PWI→EWI en el board físico de Tecnología** (hipótesis abierta):
  que reordenar la prioridad de un PWI reordene su EWI espejo en los boards de EWI.
  No es sincronización literal del valor LexoRank (imposible entre boards distintos),
  sino del orden relativo dentro del subconjunto de EWIs con espejo. Es trabajo de
  automatización Jira → propaga a `jira-automations-discovery.md`, no al App Home.
  Para el App Home, el orden se deriva en runtime del rank del PWI (no depende del
  rank del EWI).
- ~~**Estado de aprobación** (decisión de proceso): definir y luego cablear el bloque
  del perfil líder.~~ → RESUELTO (H7). Card operativa con Tracker de Notion + hilo.
- **Activar config en Slack app**: event subscription `app_home_opened` + Home Tab
  (si no están ya activos).
- **Optimización futura — cachear el resumen del problema** en el Tracker (campo
  `Problem Summary`, calculado con Groq AL CREAR el lock) en vez de llamar a Groq en
  cada apertura del Home. Hoy cada apertura del Home de un líder hace una llamada a
  Groq por REQ pendiente; con el volumen actual (1-2) es imperceptible, pero conviene
  cachear si crece. No bloqueante.
- **Fixes aplicados (2026-06-07)** al resolver la card de aprobación: los nodos que
  resuelven aprobadores en el **conversation-handler** y el **approval-handler**
  usaban el collection ID viejo de Capabilities en vez del database ID — corregido
  (colección → database) en `Query Business Area`, `Query Capabilities`,
  `Query Area Stakeholders`, `Query Requester` (conversation-handler) y los 3 nodos
  equivalentes del approval-handler. Además `solicitanteId` → `requesterId` en
  `Notify user Rejected` del approval-handler. El `conversation-handler` ahora puebla
  `Eligible Approver IDs` al crear el lock. (El `miles-reminder-handler` NO tenía el
  bug: ya usaba los database IDs correctos — el problema estaba en los handlers de
  aprobación, no en el de recordatorios.)

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
- `workflows/miles-jira-work-items-handler.json` — gateway de Jira (id
  `dknbrlcPzLuJz4Bb`; ops: create/update/transition/delete/search/search_children).
- Doc Anthropic sobre deep links de Claude Desktop (esquema `claude://`), abril 2026.
- Doc Slack: data_table block, card block, build-richer-agent-experiences (2026).
- Doc Atlassian: migración a `/rest/api/3/search/jql` (CHANGE-2046).
