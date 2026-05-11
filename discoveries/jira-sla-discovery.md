---
name: SLA de Work Items de Jira
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-10
updated_at: 2026-05-10
---

# SLA de Work Items de Jira

## Objetivo

Construir un sistema propio de SLA sobre los work items de Jira (proyecto REQ inicialmente)
que permita medir tiempo en estado, detectar breaches, y dar visibilidad operativa al equipo
de Producto sin depender de Jira Service Management. Definir los términos del SLA (eventos
de inicio, pausa, detención, calendario, targets), la arquitectura técnica, y la UX de
visibilidad.

## Contexto

No existe SLA propio para los tickets del proyecto REQ. La necesidad operativa es saber
cuánto tiempo un ticket lleva en cada estado — especialmente en `Blocked`, donde el equipo
necesita razones documentadas — y poder detectar tickets que se quedan estancados.

Jira Service Management trae SLAs nativos pero requiere licenciamiento y modelo de proyecto
distintos al actual (Jira Software, Kanban). La decisión es construir un motor propio sobre
los endpoints REST de Jira + automatizaciones nativas + n8n + Slack Canvas como capa de
visibilidad. Esto integra con el stack que ya está en producción para Miles y otros workflows
de Producto.

## Modelo conceptual del SLA

Un SLA es un reloj asociado a un ticket. Para cada SLA se decide:

- **Evento de inicio.** Cuándo arranca el reloj (creación, transición a un status específico, asignación de label).
- **Eventos de pausa.** Status donde el reloj se congela (`Blocked`, `Waiting for X`, `On Hold`). Crítico para no penalizar al equipo por bloqueos exógenos.
- **Evento de detención.** Cuándo se considera cumplido (resolución, transición a status terminal).
- **Calendario.** 24/7 o horario laboral. V1 usa 24/7 (sin calendario); horario laboral con feriados argentinos queda para V2.
- **Target.** Duración acumulada permitida (ej: 5 días, 48h).

El cálculo es un `fold` sobre el changelog: se recorren eventos en orden cronológico, se
mantiene un estado (`running` / `paused` / `stopped`), y se acumula tiempo solo cuando está
en `running`.

## Modelo de dos boards: REQ + AM espejo

El ciclo de vida real de un requerimiento atraviesa dos proyectos Jira:

- **REQ** (proyecto de Producto, Kanban) — fase de captura, refinamiento y validación.
  Workflow: `Backlog → In Analysis → Blocked → Sent to Dev → Done`.
- **MAIN** (proyecto de Tecnología, key `AM`) — fase de desarrollo. Cuando un REQ pasa a
  `Sent to Dev`, una automatización (ver `jira-automations-discovery.md`) crea un Story
  espejo en MAIN con link `is caused by` hacia el REQ origen y label `product-requirement`.

Para SLA, esto implica **dos relojes lógicos por requerimiento**, no uno:

| Reloj | Arranca | Detiene | Owner del SLA |
|---|---|---|---|
| **Reloj Producto** | Creación del REQ | Transición a `Sent to Dev` | Producto |
| **Reloj Tecnología** | Creación del AM espejo | Transición del AM a `Done` | Tecnología |

Tener los dos relojes separados (en vez de uno solo desde creación del REQ hasta delivery
final) es importante por dos razones:

1. **Accountability clara.** El tiempo que un ticket pasa en Backlog de Tecnología no es
   responsabilidad de Producto, y viceversa. SLAs cruzados generan tensión sin información
   útil.
2. **Targets distintos por fase.** Lo razonable para que un REQ se refine y pase a Dev
   no es lo mismo que para que un AM se desarrolle y deploye.

V1 arranca midiendo solo el reloj Producto (proyecto REQ). El reloj Tecnología (proyecto AM)
se incorpora en V2, cuando se consensúe el modelo con Santiago Ahmed.

### Implicancia para la JQL del Canvas

Para el Canvas de Producto, la JQL se mantiene scoped al proyecto REQ. Pero conviene
incluir un campo derivado "AM linkeado" para que el Canvas muestre el progreso del Story
espejo cuando el REQ ya pasó a `Sent to Dev`. Esto se obtiene con un HTTP Request adicional
por ticket que sigue el link `causes` y trae el status del AM correspondiente.

Esto convierte cada Canvas row de un REQ en `Sent to Dev` en algo así:

| Ticket | Estado REQ | AM linkeado | Estado AM | Días en flow |
|---|---|---|---|---|
| REQ-71 | Sent to Dev (4d) | AM-1017 | TO REFINEMENT | 4 |

## Hallazgos técnicos validados

### El endpoint de changelog funciona y trae todo

`GET /rest/api/3/issue/{key}?expand=changelog` devuelve el historial completo. Validado
sobre REQ-71 (14 entradas) y REQ-3 (24 entradas). Cada history incluye `created`, `author`,
y un array `items[]` con `field`, `fromString`, `toString` por cada cambio. Soporta status,
asignaciones, links, custom fields, descripción, comments.

Para tickets con >100 cambios habrá que migrar al endpoint dedicado paginado
`/rest/api/3/issue/{key}/changelog` (no probado desde el MCP, pero usable desde n8n con
auth Basic). En el proyecto REQ actual ningún ticket excede ese límite.

### Los comentarios sí están en el changelog (con caveat)

Aparecen como `field: "Comment"`. Curiosidad: el body queda en `fromString` (no en
`toString`). Para SLA básico alcanza, pero para metadata rica (autor del comentario separado
del autor del cambio, ediciones, restricciones de visibilidad) conviene usar el endpoint
dedicado `/rest/api/3/issue/{key}/comment`.

### Patrón de consultas separadas (decidido)

En vez de traer todo el changelog y filtrar, conviene:

1. **JQL** para descubrir tickets en estados de interés:
   `project = REQ AND status in ("Blocked", "In Analysis", "Sent to Dev")`.
2. **Por ticket**, tres llamadas paralelas:
   - `?expand=changelog&fields=status` → cuándo entró al estado actual del REQ.
   - `/comment?orderBy=-created&maxResults=1` → último comentario (la justificación).
   - `?fields=issuelinks` → resolver el AM espejo (filtrando por tipo `causes` + label
     `product-requirement` en el inward) y traer su status.

Esto reduce el payload comparado con traer changelogs completos de todos los tickets activos.

### Validación end-to-end sobre REQ-60

Único ticket en Blocked al momento de la conversación. El patrón completo funcionó:
- Tiempo bloqueado: 52h (desde 2026-05-08 17:19:59).
- Razón documentada: comentario explícito con C1 + C2 esperando respuesta de Juan Gonzalez.

### Desincronización comment ↔ transición

El comentario y la transición a Blocked llegaron con 48s de gap. El motor de SLA debe
tolerar ventana de ±N minutos (probar con ±10 min) al asociar la razón al evento.

### Comentarios vienen en ADF

Atlassian Document Format (JSON estructurado). Para renderizar en Slack:
- **Simple**: parsear y extraer solo nodos `text`.
- **Fiel**: pedir `?expand=renderedFields,renderedBody`, convertir HTML a mrkdwn.

V1 va con el camino simple.

## Decisiones de arquitectura

| Componente | Rol |
|---|---|
| **Jira Workflow (nativo)** | Forzar comentario obligatorio en la transición a `Blocked` vía screen del workflow. Imposible saltearlo desde UI. |
| **Jira Automation** | Salvaguarda contra transiciones vía API que bypasseen el screen. |
| **n8n (cron horario)** | Motor de cálculo. Cada hora 9-18, lunes a viernes (Argentina). Hace JQL + enriquecimiento por ticket + cálculo de tiempo. |
| **Slack Canvas** | Capa de visibilidad pull-on-demand. Reemplaza el contenido entero en cada update vía `canvases.edit`. |
| **Slack messages / Miles App Home** | Fuera del V1. Se reservan para casos críticos en V2. |

### Por qué Canvas en vez de notificaciones push

Para SLAs de días (no segundos), Canvas elimina la pregunta "¿en qué umbral notifico?",
sin fatiga de notificaciones, audiencia es el equipo entero, y cualquier breach queda
visible en la próxima actualización. Trade-off aceptado: si un breach ocurre fuera del
horario del cron, se levanta en la primera corrida del día siguiente.

### Estructura del Canvas

Una sola página dividida por estado, con la columna de razón solo para los bloqueados
(es lo que justifica leer el Canvas en lugar de filtrar la board nativa de Jira). Targets
por estado se mostrarían como emojis 🟢/🟡/🔴 para hacer la lectura glanceable.

## Pendiente para implementar V1

1. **Definir targets de tiempo por estado.** ¿Cuánto es "demasiado" en Blocked? ¿Y en
   In Analysis sin moverse? Sin targets el Canvas es solo descriptivo.
2. **Configurar regla nativa del workflow** que fuerce comentario obligatorio en la
   transición a Blocked (screen del workflow, sin Automation).
3. **Crear Canvas manualmente** en el canal a definir (#product-events o nuevo
   #product-board), pinearlo, guardar `canvas_id`.
4. **Armar workflow en n8n:**
   - Schedule trigger horario (9-18 L-V).
   - HTTP Request con JQL para listar tickets en estados de interés.
   - Loop con tres HTTP Requests paralelos (changelog + último comentario + AM linkeado) por ticket.
   - Cálculo de tiempo en estado + comparación contra target.
   - Composición del markdown completo del Canvas.
   - HTTP Request a `https://slack.com/api/canvases.edit` con bot token.
5. **Iterar con datos reales** una semana hasta calibrar los targets.
6. **Resolver el AM espejo en el Canvas.** Por cada REQ en `Sent to Dev` o posterior, hacer
   la query adicional para traer el estado del Story vinculado vía `causes` link, y
   mostrarlo en el Canvas. El modelo de SLA específico del reloj Tecnología queda para V2.

## Referencias

- Endpoint changelog (embedded): `GET /rest/api/3/issue/{key}?expand=changelog`.
- Endpoint changelog (dedicado, paginado): `GET /rest/api/3/issue/{key}/changelog`.
- Endpoint comentarios: `GET /rest/api/3/issue/{key}/comment?orderBy=-created&maxResults=1`.
- Endpoint links: `GET /rest/api/3/issue/{key}?fields=issuelinks`.
- Slack Canvas API: `POST https://slack.com/api/canvases.edit`.
- Discovery relacionado: `jira-automations-discovery.md` (operating context de las
  automations actuales; este SLA agregará nuevas reglas que se documentarán allí).
