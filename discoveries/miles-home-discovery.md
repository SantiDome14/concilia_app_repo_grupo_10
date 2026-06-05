---
name: Home de Miles — contenido ramificado por rol y fuente de identidad
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-05
updated_at: 2026-06-05
propagates_to: []
---

# Home de Miles — contenido ramificado por rol y fuente de identidad

## Objetivo
Definir qué contenido muestra el App Home de Miles según el perfil de la persona
(stakeholder no técnico, técnico, líder de área) y cuál es la fuente de verdad
de la identidad de cada persona (quién es, qué puesto, qué área) que dispara esa
ramificación.

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

## Hipótesis

### H1 — La identidad de la persona debe vivir en una tabla, no deducirse de Slack
Slack da pertenencia a canales, no rol. Saber que alguien está en
`req-product-finance` indica que toca Finance, pero no si es stakeholder, líder
o invitado. La distinción stakeholder / técnico / líder —el eje de ramificación
del Home— no vive de forma confiable en Slack.

Propuesta: una base **"Personas"** en Notion (teamspace de Producto) como fuente
de verdad, consumida por n8n. Campos mínimos: nombre, Slack user ID, email, área,
**rol** (select cerrado: stakeholder / técnico / líder de área), y opcionalmente
los canales `req-product-*` asociados. El `rol` es el campo crítico: dispara qué
versión del Home se publica.

Notion sobre n8n Data Table porque: editable por no técnicos (HR/PM cargan sin
tocar el editor de n8n), encaja con la filosofía del framework (Notion = capa
declarativa, n8n = ejecución), y maneja relaciones persona ↔ área ↔ canal.

> Breadcrumb: esta tabla de identidad también es dependencia de
> `challenges-interactivos-discovery.md` (mapping Slack user → identidad interna
> para validar quién responde un challenge). Se diseña una sola vez y la
> consumen ambos. Resolver acá, referenciar desde allá.

### H2 — El contenido del Home se modela como capas aditivas, no tres Homes estancos
El rol no siempre es excluyente: un líder de área también quiere ver lo de
stakeholder. El Home se piensa como capas que se suman, no como tres pantallas
separadas. El líder ve "capa stakeholder + bloque de liderazgo".

**Capa stakeholder no técnico (área X)**
- Requerimientos activos de su área, con estado (Jira filtrado por Business Area /
  customfield_10310).
- CTA "Nuevo requerimiento" → deep link a Claude (ver H3).
- CTA "Pedir informe" → de su área, de capacity de Producto, de capacity de
  Tecnología.
- Acceso a la tabla de prioridades global (ver Dependencia D1).

**Capa técnico**
- Tickets asignados, agrupados por estado: To Do / In Progress / Blocked
  (Jira por assignee).
- Tickets disponibles para tomar. *Pendiente de definición: criterio de
  "disponible" (¿sin asignar en su proyecto? ¿en estado Ready?).*
- CTA "Informar bloqueante" → input/modal que postea el blocker y comenta en el
  ticket.

**Capa líder de área (= stakeholder + esto)**
- Requerimientos a la espera de aprobación. *Pendiente: definir qué
  transición/estado representa "espera de aprobación".*
- Lista de prioridades global (ver D1).
- Vista agregada de los requerimientos de su área (no solo los propios).

### H3 — El CTA "Nuevo requerimiento" abre un chat nuevo de Claude con prompt predefinido
El flujo de alta de un requerimiento arranca en Claude (skill
`ardua-req-definition`), que estructura el requerimiento y lo deriva al canal
`req-product-*` mencionando a Miles para que cree el ticket. El Home solo acorta
el camino hacia ese inicio. El chat de Claude es efímero a propósito; lo que
persiste es lo que aterriza en el canal y en Jira, así que no hay pérdida de
trazabilidad.

**Hallazgo técnico (2026-06-05):** el parámetro `claude.ai/new?q=` para
pre-cargar un prompt en un chat nuevo **fue removido de Claude web** (a octubre
de 2025), por una vulnerabilidad de prompt injection vía HTML embebido en el
parámetro. No vuelve en web.

Donde sí funciona, vigente y documentado por Anthropic (abril 2026): el esquema
`claude://` de **Claude Desktop**:
```
claude://claude.ai/new?q=<mensaje-url-encoded>
```
Abre un chat nuevo con el prompt pre-cargado para revisar y enviar. Si la app no
está corriendo, el OS la lanza. El valor de `q` debe ir URL-encoded y se trunca a
~14.000 caracteres.

Implicancia: la viabilidad del CTA con prompt pre-cargado **depende de que la
persona tenga Claude Desktop instalado**. Para stakeholders no técnicos
(Finance, Legal, Sales) no es premisa segura por defecto. Pero si el rollout de
**Ardua 4x / Ardua Academy** estandariza la instalación de Claude Desktop, el
deep link pasa a ser plenamente viable. → Es una **dependencia de adopción**, no
un bloqueo técnico (ver D2).

El copy exacto del prompt debe usar una frase que active el skill
`ardua-req-definition` de forma confiable (sus triggers incluyen "quiero crear un
requerimiento"). Un texto muy libre puede no enganchar el skill.

## Dependencias

- **D1 — Reporte de prioridades global.** Los bloques de stakeholder y líder
  dependen de un reporte (aún no implementado) con todos los requerimientos
  activos de la compañía ordenados por prioridad, para que cada quien vea dónde
  está posicionado el suyo y haga los challenges correspondientes. Hoy no existe.
  O se prioriza como prerrequisito, o el Home muestra ese bloque como
  "próximamente".
- **D2 — Estandarización de Claude Desktop (Ardua 4x).** Condiciona H3. Si a4x
  estandariza Desktop, el CTA con prompt pre-cargado es viable; si no, el CTA
  abre web sin prompt y el copy del Home indica qué escribir.
- **D3 — Infra de interactividad de Miles.** Botones e inputs del Home requieren
  Interactivity activada (Request URL → n8n) y, para postear Block Kit, el
  endpoint helper en n8n. Es la misma infra que levanta
  `challenges-interactivos-discovery.md`. Coordinar para no duplicar.

## Definiciones pendientes (a resolver antes de construir)
1. Criterio de "ticket disponible" para la capa técnico.
2. Qué transición/estado representa "espera de aprobación" para la capa líder.
3. Copy exacto del prompt predefinido del CTA (debe activar `ardua-req-definition`).
4. Resolución de D2 con el equipo de a4x (¿Desktop estandarizado?).

## Cómo termina este discovery
Tooling de proceso, no feature de producto. Al concluir, sus conclusiones
propagan a (tentativo, se completa al cerrar):
- `skills/` o `workflows/` según dónde viva la lógica del Home (probablemente un
  workflow nuevo de Miles en n8n + posible actualización de skills relacionados).
- La base "Personas" de Notion como artefacto de identidad (referenciada también
  desde `challenges-interactivos-discovery.md`).
- Para orquestar la implementación conviene abrir un REQ propio con su AM espejo.

## Referencias
- `jira-automations-discovery.md` — handoff REQ→MAIN, fuente de los estados de Jira.
- `challenges-interactivos-discovery.md` — comparte la tabla de identidad y la
  infra de interactividad de Miles.
- `release-awareness-discovery.md` — patrón de banner/modal por usuario, referencia
  de UX reactiva.
- Doc Anthropic sobre deep links de Claude Desktop (esquema `claude://`), abril 2026.
