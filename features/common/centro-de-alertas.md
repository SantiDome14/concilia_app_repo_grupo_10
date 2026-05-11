---
aplicacion: COMMON
status: Definida
owner: Yasmani Rodriguez
created_at: 2026-05-11
updated_at: 2026-05-11
req: REQ-73
discovery: core-modulos-transversales-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN]
---

# Centro de Alertas

## Propósito

Sistema formal de gestión de alertas del backoffice de Ardua. Las alertas se generan automáticamente desde código que detecta condiciones del dominio (en cualquier app del core o sistema externo), llegan al Centro de la app responsable, y un humano del backoffice las tramita con audit trail: comentar, marcar como resuelta, descartar.

Cubre el gap entre **Slack** (canal de mensajería sin trazabilidad estructurada) y **Grafana** (observabilidad técnica para developers). Ninguno de los dos sirve para gestión formal del backoffice ni acredita governance regulatoria — el Centro asume ese rol.

**Capacidad nueva del v1:** Ardua tiene un repositorio interno auditable de alertas y comentarios en su propia base de datos, consultable vía API. Es el primer registro estructurado del grupo sobre estos eventos.

---

## Estado v1

### Adentro

| Capacidad | Detalle |
|---|---|
| Modelo canónico `Alerta<TPayload>` | Definido en `src/types/genericos.ts`, no redefinible localmente |
| Estados | `new` · `resolved` · `dismissed` (terminales inmutables) |
| Severidad obligatoria | `critical` / `high` / `medium` / `low`; única dimensión de clasificación |
| Vistas | Lista · Cards · Kanban (con Ejes vía REQ-69) |
| Drawer compartido | Header + body + Timeline + Comments + acciones; shared con Inbox (REQ-71) |
| ClosureModal | `closeActions` por tipo + comentario obligatorio ≥ 10 chars |
| Persistencia interna | BBDD propia de Ardua; alerta + Timeline + Comments inmutables tras cierre |
| API de ingesta | `POST /alertas` con validación de `type` + `severity` contra registry |
| API de consulta | Filtros + paginación; habilita dashboards cross-app construidos sobre el repo |
| Push notification a Slack | Opcional por `ALERT_TYPE` (canal, mention, on/off) |
| Routing por `target_role` | Cuando aplica; reusa el motor de Inbox |
| Flujo formal de alta de nuevos tipos | Solicitud estructurada → REQ hijo → implementación + registry |

### Afuera (diferido a v2)

- Asignación formal a usuario o área (`assignee`)
- Estado intermedio `in_review`
- Auto-cierre algorítmico
- Mecanismo `REPORT_DEPENDENCY` con auto-cierre (coordinación inter-app con Reportes)
- Chart-first surface con thresholds overlaid (para alertas time-series)
- Bulk operations, re-apertura, canales push adicionales (email, Teams, SMS, WhatsApp)
- Asistente IA para definir nuevos `ALERT_TYPE`s

---

## Modelo canónico

```typescript
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
type AlertState    = 'new' | 'resolved' | 'dismissed';

interface Alerta<TPayload = unknown> {
  id: string;
  type: string;                    // declarado en el registry de la app target
  severity: AlertSeverity;
  state: AlertState;
  source_app: string;
  source_module: string;
  target_app: string;              // app donde se gestiona
  target_role?: string;            // rol responsable cuando aplica routing
  payload: TPayload;
  closure_action?: string;
  closure_comment?: string;
  closed_by?: string;
  closed_at?: number;
  timeline: TimelineEvent[];       // canónico shared con Inbox
  comments: Comment[];             // canónico shared con Inbox
  created_at: number;
  last_event_at: number;
}
```

Cada app declara sus `ALERT_TYPE`s en un registry (`AlertTypeConfig`) con: payload del dominio, severidades válidas, `closeActions[]`, política de push a Slack. Mezclar `closeActions` con `terminal_state` inconsistentes es contract violation validable al boot.

---

## Comportamiento

**Generación.** Cualquier backend del core o sistema externo emite un evento a `POST /alertas`. La ingesta valida que `type` exista en el registry del `target_app` y que `severity` esté declarada por el tipo. Persiste con `state: 'new'`. Si el tipo declara `push_notification.slack.enabled`, publica mensaje en el canal configurado con link a la alerta.

**Tramitación.** El usuario del `target_role` (o cualquier usuario del `target_app` si no hay routing) ve la alerta en el módulo Alertas de su app. Abre el Drawer, lee el payload, comenta si aplica, y cierra con `<ClosureModal>` eligiendo un `closeAction` declarado por el tipo + comentario obligatorio ≥ 10 chars. El estado terminal alcanzado (`resolved` o `dismissed`) lo determina el `closeAction`.

**Persistencia y consulta.** La alerta + Timeline + Comments quedan persistidos como registro inmutable consultable vía API. Habilita reportería (vía REQ-59) y dashboards cross-app.

---

## Naturaleza del servicio

| Capa | Implementación |
|---|---|
| Backend | Transversal en el core: endpoint de ingesta, API de consulta, persistencia, audit trail, routing, push a Slack |
| UI | Por app: cada app target renderiza su módulo Alertas con sus `ALERT_TYPE`s declarados |
| Modelado | Una alerta = un `target_app`. Eventos que aterrizan en dos apps se modelan como dos alertas |
| Dashboards cross-app | Se construyen sobre la API de consulta — no son un módulo Alertas adicional |

---

## Integraciones

| Con | Cómo |
|---|---|
| **Inbox** (`inbox.md`, REQ-71) | Comparten `TimelineEvent`, `Comment`, `<Drawer>`, motor de routing por `target_role` |
| **Acciones / Manifest Engine** (REQ-68) | Las transiciones de alertas son acciones del manifest del módulo |
| **Vistas** (REQ-69) | Provee Lista, Cards, Kanban + Ejes, y `<ClosureModal>` shared |
| **Centro de Reportería** (`centro-de-reporteria.md`, REQ-59) | Consumidor del repositorio de alertas para reportería analítica y regulatoria |
| **Auth0** | Identidad del invocador del endpoint de ingesta |
| **Slack** | Servicio del grupo (Slack API + n8n/Miles) para push opcional por `ALERT_TYPE` |

---

## Apps consumidoras

| App | REQ de configuración | Tipos declarados |
|---|---|---|
| **LEX** | REQ-52 | `kyc_match` · `blacklist_match` · `ros_review` (compliance) |
| **TRD** | REQ-33 | `limit_breach` · `spread_anomaly` (mesa) |
| **OPS** | — pendiente | — |
| **FIN** | — pendiente | — |
| **CLP** | — pendiente | — |

Ambos REQs configuradores (REQ-52 y REQ-33) están desbloqueados al 100% por v1 — son configuración, no infraestructura.

---

## Decisiones clave

| # | Fecha | Decisión |
|---|---|---|
| 1 | 2026-05-11 | Recorte a v1: se descartan las 4 categorías originales (`triage` / `workflow` / `metric` / `cross_app_panel`). Modelo plano con severidad como única dimensión de clasificación |
| 2 | 2026-05-11 | Dashboard cross-app no es categoría del modelo — se construye sobre la API de consulta |
| 3 | 2026-05-11 | `REPORT_DEPENDENCY` con auto-cierre se difiere a v2 (depende de auto-cierre, que no entra en v1) |
| 4 | 2026-05-11 | Vistas v1 = Lista + Cards + Kanban. Kanban habilita Ejes (REQ-69) para reagrupar por dimensión del dominio (ej: severidad) |
| 5 | 2026-05-11 | Persistencia interna explícita como objetivo y capacidad nueva — diferenciación frente a Slack (efímero) y Grafana (técnico) |

---

## Frentes abiertos

- **Construcción de v1** — entregable de Tecnología bajo AM-1020 (TO REFINEMENT)
- **REQ-52 (LEX) y REQ-33 (TRD)** — configuración de tipos del dominio, en SENT TO DEV
- **Cobertura por app restante** — OPS, FIN, CLP no tienen REQs de Alertas todavía; surgen a demanda
- **V2** — re-evaluar cuando aparezca demanda concreta de auto-cierre, asignación formal, o chart-first surface

---

## Referencias

- REQ entregable: REQ-73 · espejo en AM-1020
- Discovery relacionado: `discoveries/core-modulos-transversales-discovery.md`
- Feature relacionada: Centro de Reportería (`centro-de-reporteria.md`) — consume el repositorio de alertas para reportería analítica
