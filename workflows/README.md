# workflows/

Catálogo de los workflows activos de n8n que automatizan los procesos operativos de Miles y el seguimiento de SLA de tickets en Ardua.

> Última actualización: 2026-05-22

---

## Fuente de verdad

**n8n es la fuente de verdad de la implementación.** Este directorio no replica el JSON completo de cada workflow — lo documenta: nombre, ID, propósito, trigger, nodos, y metadata clave (bases de datos Notion referenciadas, canales Slack, lógica de negocio embebida).

Para inspeccionar, editar o ejecutar un workflow, hacerlo directamente en n8n (`n8n.arduasolutions.com`). Los archivos de este directorio sirven como referencia rápida para PMs y para que el agente pueda operar con contexto sin necesidad de consultar n8n en cada sesión.

---

## Convenciones

- **Un archivo por workflow.** Nombre del archivo = nombre del workflow en n8n, en kebab-case con extensión `.json`.
- **Formato:** JSON con campos curados — no es un export raw de n8n. Incluye `id`, `name`, `active`, `versionId`, `createdAt`, `updatedAt`, `trigger`, `description`, `nodes` y campos de negocio relevantes (DBs Notion, canales Slack, lógica de asignación, etc.).
- **Sincronización:** cuando un workflow cambia significativamente en n8n (nueva lógica, nodos agregados, cambio de DB Notion, cambio de canal Slack), actualizar el archivo correspondiente en esta sesión y actualizar `updatedAt` y `versionId`.
- **Cambios menores** (ajustes de expresiones, fixes de bugs sin impacto en el flujo lógico) no requieren actualización del archivo — se registran en el historial de versiones de n8n.
- **Workflow nuevo:** crear el archivo en esta carpeta con el mismo nombre que en n8n antes de cerrar la sesión en que fue creado.
- **Workflow desactivado o eliminado:** marcar `"active": false` en el archivo. No eliminar el archivo — queda como registro histórico.

---

## Sistemas

Los workflows se organizan en dos sistemas:

### `miles-` — Agente Slack Miles

Workflows que implementan el agente conversacional Miles: intake de requerimientos vía Slack, flujo de aprobación, notificaciones Jira → Slack, y actualización de Canvases por área.

| Workflow | Descripción breve |
|---|---|
| `miles-slack-event-router` | Entry point de todos los eventos Slack. Filtra y enruta al handler correcto. |
| `miles-conversation-handler` | Handler principal del flujo conversacional de creación de REQs. |
| `miles-approval-handler` | Procesa los callbacks de los botones de aprobación/rechazo en Slack. |
| `miles-reminder-handler` | Cron que envía recordatorios de aprobaciones pendientes a las 24 hs hábiles. |
| `miles-canvas-area-refresh` | Actualiza el Canvas de Slack de cada área con el estado actual de sus REQs. |
| `miles-jira-event-router` | Recibe eventos de Jira Automation y enruta notificaciones a Slack. |

### `jira-sla-` — SLA de tickets

Workflows que registran y calculan el tiempo que los tickets pasan en cada estado, escribiendo en bases de datos Notion para seguimiento de SLA.

| Workflow | Proyecto Jira | Descripción breve |
|---|---|---|
| `jira-sla-products-ticket-created` | REQ | Crea una fila en Notion cuando se abre un ticket REQ. |
| `jira-sla-products-status-changed` | REQ | Actualiza días en estado y registra el cambio en el changelog cuando un REQ cambia de status. |
| `jira-sla-main-ticket-created` | AM | Crea una fila en Notion cuando se abre un ticket AM. |
| `jira-sla-main-status-changed` | AM | Actualiza días en estado y registra el cambio en el changelog cuando un AM cambia de status. |

---

## Bases de datos Notion referenciadas

| DB | ID | Usada por |
|---|---|---|
| SLA Tickets PRODUCTS | `9d4e0a6f-514a-4e90-968b-89241f53ad86` | `jira-sla-products-*` |
| SLA Changelog PRODUCTS | `1de23a75-d1ba-4a10-908c-126e456da721` | `jira-sla-products-status-changed` |
| SLA Tickets MAIN | `29f85f16-cf46-43a3-af3e-ac6c20bf56e1` | `jira-sla-main-*` |
| SLA Changelog MAIN | `d2f2eb78-2011-4da2-9b4f-d7a6ae8e1f84` | `jira-sla-main-status-changed` |
| Approval Config | `f698c2da-7e41-4379-89a6-aeaf93e7c814` | `miles-conversation-handler`, `miles-approval-handler` |
| Approval Lock | `20437e6c-297a-4afe-923a-29b5d01ad26c` | `miles-approval-handler`, `miles-reminder-handler` |

---

## Canales Slack referenciados

| Canal | ID | Área / Propósito |
|---|---|---|
| #req-finance-accounting | `C0AJ2599DA6` | Finance & Accounting |
| #req-legal-compliance | `C0AJ67HK0ES` | Legal & Compliance |
| #req-operations | `C0AK2PW5BGQ` | Operations |
| #req-sales-partnerships | `C0AKNPCNNSU` | Sales & Partnerships |
| #req-trading-desk | `C0AJMRFP0TD` | Trading Desk |
| #req-management | `C0ARDGP8134` | Management |
| #4dt-product-technology-delivery | `C0ADKPUS83B` | Liderazgo — notificaciones SENT TO DEV |
| #req-product-notifications | `C0AS1BPV9QU` | Notificaciones internas de Producto |
