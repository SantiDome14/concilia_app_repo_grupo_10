---
aplicacion: COMMON
status: Definida
owner: Yasmani Rodriguez
created_at: 2026-05-11
updated_at: 2026-05-13
req: REQ-59
discovery: core-modulos-transversales-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN]
---

# Centro de Reportería

## Propósito

Servicio transversal del core donde viven todos los reportes que cualquier app del grupo tenga que emitir — regulatorios, contables, operativos, internos. Cualquier app declara los reportes que expone en su Catálogo; un mismo reporte puede ser consumido por múltiples apps simultáneamente (`consumer_apps[]`). El control de acceso por capabilities garantiza que reportes sensibles (P&L del grupo, exposición agregada, datos de clientes) solo sean visibles a los roles autorizados.

**Separación fundamental:** la **definición** del reporte (qué es, qué normativa lo obliga, qué periodicidad, qué formato, quién puede verlo/ejecutarlo) es ownership del área funcional. La **ejecución técnica** (la función de generación) es ownership de Tecnología; se implementa una vez y queda invocable desde cualquier app consumidora.

El alta de un nuevo reporte no es operación de runtime — es flujo de requerimiento formal con formato estándar (V1). V2 explora capacidades self-service (IA Playground, builder visual, marketplace) sujetas a viabilidad técnica y de governance.

---

## Estado v1

### Adentro

| Capacidad | Detalle |
|---|---|
| Modelo canónico `Report` y `ReportRun` | Definidos en `src/types/genericos.ts`, no redefinibles localmente |
| Catálogo central | Reporte aparece en cada `consumer_app` declarada, filtrado por `permissions.view` |
| Sub-tab Ejecución | Lista de `ReportRun` filtradas por `permissions.view`; tabs alternables vía REQ-69 |
| Endpoint único de generación | Invocable desde cualquier backend del core o sistema autenticado |
| Control de acceso por capabilities | 4 niveles independientes: `view` · `execute` · `edit` · `delete` |
| Default seguro de permissions | Sin declaración explícita, reporte invisible para todos menos creador + `ADMIN_GROUP` |
| Scheduler de generaciones automáticas | CRON consulta catálogo, dispara generaciones según `next_emission_date`, emite eventos a Alertas |
| Persistencia de ejecuciones | `ReportRun` inmutables con metadata completa, archivos re-descargables hasta vencimiento de retención |
| Política de retención por reporte | Categorías: `regulatorio` / `contable` / `operativo` / `interno`; `legal_basis` mandatorio para regulatorios y contables |
| Asociaciones consumidor-tipo del reporte | Mecanismo unificado para todo trabajo humano vinculado a un reporte: tanto **dependencias bloqueantes** (otra app debe completar tipo X antes) como **generación manual próxima a emitir** (`allows_auto_generation: false`). Modelado via `ConsumerTypeAssociation` del Centro de Solicitudes (REQ-71) con `consumer_ref: <report_id>` |
| Bifurcación del CRON por `allows_auto_generation` | `true` → genera automáticamente cuando vence `next_emission_date`, verifica satisfacción de asociaciones, emite Alerta si hay incompletas; `false` → no genera, la generación humana llega vía Tarea del Inbox declarada por la asociación `generate_report_manually` |
| Reportes cross-app | Múltiples `consumer_apps[]` por reporte; ejecuciones únicas compartidas |
| Reportes headless | `consumer_apps[]` vacío — generados pero no expuestos en UI |
| Flujo formal V1 de alta | Solicitud estructurada → REQ hijo → función de generación + asociaciones declaradas → registry |

### Afuera (v2, sujeto a viabilidad)

- **IA Playground self-service** — usuario conversa con una IA conectada a base de prueba, arma queries, obtiene definición ejecutable + solicitud V1 autocompletada
- **Builder visual estilo n8n** — nodos (Fuente, Filtro, Constraint, Transformación, Formato, Condición) generando la misma salida
- **Marketplace de Reportes** — publicación directa para reportes internos/operativos sin pasar por Tecnología (regulatorios y contables siguen ruta formal)
- **Matriz de aprobaciones por categoría × sensibilidad** — declarable por tipo de reporte
- **Job de borrado físico de outputs vencidos** — V1 marca `retention_expired: true`; el borrado físico es REQ futuro
- **Workflow de aprobación para generación** — V1 no contempla aprobaciones previas a generar
- **Dashboards interactivos / BI** — otra discusión, no es Reportería
- **Envío automático a terceros** (email al regulador, subida a portal) — distribución externa es responsabilidad del usuario

> **Nota sobre V2.** No es commitment. La factibilidad se valida cuando V1 está en operación. Si V2 no resulta viable, V1 cubre todas las necesidades del catálogo.

---

## Modelo canónico

```typescript
interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  consumer_apps: ConsumerAppRef[];   // dónde aparece; vacío = headless
  ruling_entity?: string;            // UIF, BCRA, CNV, etc.
  regulation?: string;
  periodicity?: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'ad_hoc';
  next_emission_date?: number;
  alert_anticipation_days?: number;  // antelación para Alerta "próximo a emitir" — solo aplica si allows_auto_generation: true
  format: 'PDF' | 'XLSX' | 'CSV';
  generator_ref: string;             // referencia a la función de generación
  retention_policy: RetentionPolicy;
  params: Record<string, unknown>;
  allows_auto_generation: boolean;
  cron_enabled?: boolean;
  cron_active?: boolean;
  locked?: boolean;
  locked_reason?: string;
  permissions: ReportPermissions;    // 4 niveles independientes
  state: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

interface ReportPermissions {
  view: string[];      // capability IDs que filtran el catálogo
  execute: string[];   // capability IDs que ejecutan manualmente o programan
  edit: string[];      // capability IDs que modifican la definición
  delete: string[];    // capability IDs que archivan/dan de baja
}

interface RetentionPolicy {
  duration: string;                  // '10y' | '5y' | '2y' | '1y' | '6m' | ...
  category: 'regulatorio' | 'contable' | 'operativo' | 'interno';
  legal_basis?: string;              // mandatorio para regulatorio/contable
}

interface ConsumerAssociationSnapshot {
  association_id: string;            // ID de la ConsumerTypeAssociation
  concept: string;                   // tipo del Inbox que era dependencia
  satisfaction_mode: 'generate_new' | 'verify_existing';
  state_at_run: 'satisfied' | 'unsatisfied';
  instance_ref?: string;             // ID de la instancia (la generada en generate_new, o la verificada en verify_existing si existió)
  description?: string;
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
  dependencies_unmet?: ConsumerAssociationSnapshot[];  // poblado cuando se generó con asociaciones no satisfechas
}
```

`ConsumerAppRef` define **dónde aparece** el reporte; `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar. Dimensiones ortogonales.

**Las dependencias del reporte ya no viven embebidas en `Report`.** Cada dependencia o requisito humano se modela como una `ConsumerTypeAssociation` del Centro de Solicitudes (REQ-71), declarada con `consumer_ref: <report_id>` y `consumer_kind: 'report'`. Para obtener las dependencias de un reporte, el motor consulta el catálogo de asociaciones filtrando por `consumer_ref`. Ver § Asociaciones consumidor-tipo del reporte.

---

## Control de acceso

### Cuatro niveles independientes

| Nivel | Qué controla | Semántica |
|---|---|---|
| `view` | Filtra el catálogo y las ejecuciones | Sin la capability, el reporte **no existe** para ese usuario |
| `execute` | Ejecución manual + scheduling | Con `view` pero sin `execute`, el reporte es read-only |
| `edit` | Modificación de definición, metadata, CRON, `consumer_apps[]`, asociaciones | Sin esta capability "Editar metadata" no aparece |
| `delete` | Archivado / baja | Default solo `ADMIN_GROUP` |

Permite separación realista de responsabilidades:

- **Analista** → `view` + `execute`
- **Manager** → + `edit`
- **Admin** → + `delete`

### Default seguro

Si `permissions` no se declara explícitamente al dar de alta el reporte, el default es: solo el creador del REQ + usuarios con capability `manage_reports` (típicamente `ADMIN_GROUP`) tienen las 4 capacidades. Reporte invisible para todos los demás. Esto fuerza declaración explícita para reportes accesibles a roles amplios y previene exposición accidental.

### Resolución en runtime

El capability provider de REQ-68 resuelve `user_id → capabilities[]` vía la cadena Usuario → Grupos → Capabilities. Misma fuente de verdad en frontend y backend:

- **Render del Catálogo:** backend filtra `Report` cuyas `permissions.view` intersectan con capabilities del usuario
- **Click en "Generar":** endpoint valida `permissions.execute`; sin capability, 403
- **Click en "Editar metadata":** valida `permissions.edit`
- **Click en "Archivar":** valida `permissions.delete`
- **Render de Ejecución:** filtra `ReportRun` por `permissions.view` del reporte asociado

---

## Comportamiento

**Generación manual.** Click en "Generar" → endpoint valida `permissions.execute`, valida parámetros, consulta `ConsumerTypeAssociation`s del reporte (donde `consumer_ref: <report_id>` y `association_state: 'active'`), verifica satisfacción de cada una según su `satisfaction_mode` (ver § Asociaciones consumidor-tipo del reporte). Si todas satisfechas: invoca `generator_ref`, persiste `ReportRun`, retorna referencia descargable. Si alguna no satisfecha: **no genera**, devuelve `dependencies_pending` con la lista de asociaciones no satisfechas (la Tarea del Inbox correspondiente ya existe si la asociación es `generate_new`, o la verificación fallida queda registrada si es `verify_existing`).

**Generación automática (CRON) — bifurcación por `allows_auto_generation`.** Scheduler periódico consulta el catálogo, identifica reportes con `cron_active: true` cuya fecha venció o está dentro del umbral; bifurca según `allows_auto_generation`:

| `allows_auto_generation` | Satisfacción de asociaciones | Comportamiento |
|---|---|---|
| `true` | Todas satisfechas | Invoca `generator_ref` con identidad de sistema, persiste `ReportRun` con `trigger: { type: 'cron' }`, actualiza `next_emission_date` |
| `true` | Alguna no satisfecha | **Genera de todos modos** con los datos disponibles, persiste `ReportRun` con `dependencies_unmet[]` poblado (snapshot de las asociaciones no satisfechas al momento del run), emite Alerta `reporte_dependencias_incompletas` al consumidor |
| `false` | — | **No genera automáticamente.** La generación humana llega al Inbox vía la asociación `generate_report_manually` (ver § Asociaciones consumidor-tipo del reporte). Cuando el operador genere el reporte desde el Inbox, sigue el camino de generación manual descrito arriba |

No aplica check de `permissions.execute` en generación CRON (identidad de sistema).

**Persistencia y retención.** Cada `ReportRun` queda inmutable con metadata completa, incluyendo `dependencies_unmet[]` cuando aplique. Archivos re-descargables hasta vencimiento de `retention_policy.duration`, sujeto a `permissions.view`. Al vencer: `retention_expired: true`, `output_url` deja de servir (404), deja de aparecer en Ejecución; metadata preservada indefinidamente.

**Retenciones típicas de referencia:**

| Categoría | Duración típica |
|---|---|
| `regulatorio` | 5–10 años (UIF Arg ≥ 10 años, BCRA, CNV, FATCA) |
| `contable` | 10 años (asientos, balances, P&L) |
| `operativo` | 1–6 meses |
| `interno` | 1–3 meses |

---

## Asociaciones consumidor-tipo del reporte

Toda interacción humana que un reporte requiere — desde otras áreas (dependencias bloqueantes) o desde el propio responsable del reporte (generación manual) — se modela como **una o más `ConsumerTypeAssociation`** del Centro de Solicitudes (REQ-71). Este es el mecanismo unificado que reemplaza tanto el `REPORT_DEPENDENCY` anterior (reactivo con `auto_archive`) como las Tareas `reporte_proximo_emision_manual` (que antes se emitían reactivamente).

### Modelo unificado

Cada asociación se declara con:

- `consumer_ref: <report_id>` — el reporte que la requiere.
- `consumer_kind: 'report'`.
- `concept` — tipo del Inbox que es la dependencia (puede ser cualquier tipo del catálogo, incluyendo el tipo genérico `generate_report_manually` cuando aplica a reportes manuales).
- `target_app`, `target_role`, `default_assignee` — quién la trabaja.
- `lead_time_days` — antelación al `next_emission_date` del reporte.
- `satisfaction_mode` — `generate_new` o `verify_existing` (ver § Modos).
- `verify_window_days?` — requerido si `satisfaction_mode: 'verify_existing'`.
- `payload_template?` — precarga campos del payload del Inbox (aplica solo a `generate_new`).

El motor del Inbox (no el motor de Reportes) ejecuta el comportamiento de la asociación según su `satisfaction_mode`.

### Dos casos cubiertos por el mismo mecanismo

**Caso 1 — Dependencia bloqueante de otra app.** El reporte X requiere que el área Y haya completado el tipo `Z` antes de su `next_emission_date`. Se declara una asociación con `concept: Z`, `target_app: <app de Y>`, `target_role: <rol responsable>`, y `satisfaction_mode` según convenga (`verify_existing` si Y ya tiene una serie recurrente del concept; `generate_new` si requiere disparar una instancia específica para este reporte).

**Caso 2 — Generación manual del propio reporte** (`allows_auto_generation: false`). El reporte X requiere que un humano lo genere. Se declara una asociación con `concept: 'generate_report_manually'` (tipo genérico del catálogo del Inbox), `target_app: <app donde se genera>`, `target_role: <rol que genera>`, `satisfaction_mode: 'generate_new'`, `payload_template: { report_id: X, period: <período aplicable> }`. Cuando se cumple `next_emission_date - lead_time_days`, el scheduler del Inbox crea la Tarea en el área dueña con CTA "Generar reporte". Al ejecutarse la generación exitosamente, la Tarea se completa.

### Modos de satisfacción

| Modo | Semántica | Cuándo usar |
|---|---|---|
| `generate_new` (default) | El scheduler del Inbox crea una instancia anticipada del tipo cuando se cumple `lead_time_days`. El reporte la consume vía `consumer_association_id` cuando llega su `next_emission_date` | El concept no existe como serie recurrente del área dueña, o las cadencias son incompatibles. Aplica siempre al caso 2 (`generate_report_manually`) |
| `verify_existing` | El scheduler **no genera instancia**. Al `next_emission_date` del reporte (o en `lead_time_days` previos como early warning), verifica que exista al menos una instancia del concept en estado `Completed` dentro de `verify_window_days`. Si existe, la dependencia está satisfecha; si no, se considera no satisfecha | Caso 1 donde el área dueña ya tiene una serie recurrente del concept que cubre la cadencia del reporte. Ej: reporte UIF mensual depende de `daily_reconciliation` de OPS — `verify_existing` con `verify_window_days: 1` |

### Tipo genérico `generate_report_manually`

Es un tipo del catálogo del Inbox (declarado una sola vez, no por cada reporte) con la siguiente shape:

- `type: 'task'`, `execution_mode: 'human'`.
- `payload`: `{ report_id, period? }`.
- CTA principal: "Generar reporte" — invoca el endpoint de generación del reporte referenciado en el payload.
- Cierre automático: cuando el `ReportRun` asociado completa con `status: 'ok'`, la Tarea transita a `Completed` (vía trigger en el endpoint de Reportes que reporta éxito al Centro).

Esto evita declarar un tipo del Inbox por cada reporte manual. Un único tipo genérico atiende a todos.

### Convivencia con `dependencies_unmet[]`

El `ReportRun.dependencies_unmet[]` sigue siendo el mecanismo de auditoría: cuando un reporte se ejecuta (manual o auto) con asociaciones no satisfechas, el snapshot queda registrado en el run con `ConsumerAssociationSnapshot[]`. Esto permite:

- Auditoría regulatoria: reconstruir qué dependencias estaban incompletas al momento de emitir el reporte.
- Análisis operativo: identificar áreas con tasa alta de incumplimiento de dependencias.
- Alerta `reporte_dependencias_incompletas` al consumer cuando aplica (solo bajo `allows_auto_generation: true`).

---

## Eventos del scheduler a Alertas

El scheduler y el motor de generación emiten `ALERT_TYPE`s al Centro de Alertas para los eventos puramente informativos. Las Tareas humanas viven en el Inbox vía las asociaciones (sección anterior), no se duplican como alertas.

| Evento | `ALERT_TYPE` | Destino | Disparador |
|---|---|---|---|
| Próximo a emitir, `allows_auto_generation: true` | `reporte_proximo_emision_auto` | `consumer_apps[]` | `next_emission_date - alert_anticipation_days` |
| Vencido (`next_emission_date` pasó sin generación exitosa) | `reporte_vencido` | `consumer_apps[]` | Detección periódica del scheduler |
| Error en generación | `reporte_error_generacion` | `consumer_apps[]` | `ReportRun.status: 'error'` |
| Emitido automáticamente | `reporte_emitido_automaticamente` | `consumer_apps[]` | `ReportRun` con `trigger: { type: 'cron' }` y `status: 'ok'` |
| Generado con asociaciones no satisfechas | `reporte_dependencias_incompletas` | `consumer_apps[]` | `ReportRun.dependencies_unmet[]` poblado |

La lista no es exhaustiva. Cualquier evento sistémico relevante del dominio Reportes puede modelarse como nuevo `ALERT_TYPE` siguiendo el flujo formal (REQ-73 §11).

> **Cambio respecto a versión anterior:** Las filas "Próximo a emitir manual" y "Dependencia bloqueante detectada" — que antes emitían Tareas reactivas al Inbox — desaparecen de esta tabla. Ese trabajo humano ahora lo gestiona el Centro de Solicitudes vía las asociaciones declaradas en el alta del reporte, no como reacción del scheduler de Reportes.

---

## Naturaleza del servicio

| Capa | Implementación |
|---|---|
| Backend | Servicio transversal del core: endpoint único, scheduler, persistencia de ejecuciones, capability checks, canal de eventos a Alertas, declaración de `ConsumerTypeAssociation` durante el alta |
| UI | Por app consumidora: cada app declarada en `consumer_apps[]` renderiza Catálogo + Ejecución, filtrados por `permissions.view` |
| Reportes multi-app | Un `Report` con N entradas en `consumer_apps[]` aparece en N catálogos; las `ReportRun` son únicas y compartidas |
| Reportes headless | `consumer_apps[]` vacío — generados pero no expuestos en UI. Útil para schedulers externos, integraciones con reguladores, agentes IA |
| Invocación externa | Cualquier sistema autenticado (Auth0 o credencial de sistema) puede llamar al endpoint con su identidad |

---

## Integraciones

| Con | Cómo |
|---|---|
| **Acciones / Manifest Engine** (REQ-68) | (a) Las acciones del Catálogo son del manifest; (b) el capability provider resuelve `user → capabilities`; (c) el catálogo canónico de capabilities vive ahí y este servicio las referencia por ID |
| **Centro de Alertas** (`centro-de-alertas.md`, REQ-73) | Receptor de eventos informativos del scheduler y del motor de generación: `reporte_proximo_emision_auto`, `reporte_vencido`, `reporte_error_generacion`, `reporte_emitido_automaticamente`, `reporte_dependencias_incompletas` |
| **Centro de Solicitudes** (`centro-de-solicitudes.md`, REQ-71) | Provee la entidad `ConsumerTypeAssociation` que Reportería declara para representar dependencias bloqueantes y necesidades de generación manual. El motor del Inbox ejecuta el comportamiento de cada asociación (generación anticipada en `generate_new`, verificación en `verify_existing`) sin que el scheduler de Reportería tenga que coordinar Tareas reactivamente. Provee también el tipo genérico `generate_report_manually` que Reportería usa para modelar el caso 2 (reportes manuales próximos a emitir) |
| **Vistas** (REQ-69) | Contrato de tabs alternables (Catálogo / Ejecución) + mecánica de tabla y filtros |
| **Auth0** | Identidad del invocador; los claims alimentan al capability provider de REQ-68 |

---

## Apps consumidoras

| App | REQ por área | Tipo de reportes | Estado |
|---|---|---|---|
| **LEX** | REQ-54 | Regulatorios, compliance (UIF, BCRA, CNV, FATCA, ROS, KYC, blacklist) | En Sent to Dev — desbloqueado por REQ-59 |
| **OPS** | pendiente | Operativos (conciliación PSP/Coinag, Pool, asignaciones, Nostro, whitelist) | — |
| **TRD** | pendiente | Mesa (liquidez, spreads, RFQs, FX, P&L) | — |
| **FIN** | pendiente | Contables (balance, P&L consolidado, mayor, asientos, conciliación global, tesorería) | — |
| **CLP** | a evaluar | Cliente (estado de cuenta, movimientos, posición, fees, certificados) | A evaluar cuando avance beta CLP |

Los REQs por área entregan: qué reportes declara cada app, qué categorías, qué `ConsumerTypeAssociation`s declara cada reporte (con `concept`, `satisfaction_mode`, `lead_time_days`, etc.), qué `permissions` aplica por reporte (capabilities concretas), qué capacidades opcionales activa, y la función de generación concreta (`generator_ref`).

---

## Flujo formal de alta (V1)

Vinculante. Solicitudes incompletas se rechazan.

1. **Área solicitante completa una solicitud estructurada** con campos obligatorios:
   - Nombre, descripción, categoría funcional
   - Entidad rectora y norma/regulación (cuando aplique)
   - Periodicidad, formato (PDF/XLSX/CSV)
   - Lógica funcional del reporte (no implementación)
   - `consumer_apps[]`
   - `retention_policy` (duración + categoría + `legal_basis` cuando aplique)
   - `allows_auto_generation`
   - **`associations[]`** — lista de `ConsumerTypeAssociation`s a declarar al alta. Para cada una: `concept`, `target_app`, `target_role`, `default_assignee?`, `lead_time_days`, `satisfaction_mode`, `verify_window_days?` (si aplica), `payload_template?`. Si `allows_auto_generation: false`, debe incluirse al menos una asociación con `concept: 'generate_report_manually'`
   - **`permissions`** — declaración explícita de capability IDs para los 4 niveles, o default seguro

2. **Producto valida coherencia** y abre dos REQs hijos:
   - REQ hijo para Tecnología con el shape completo del `Report`
   - REQ hijo (o coordinación con REQ-71 owner) para registrar cada `ConsumerTypeAssociation` en el catálogo del Centro de Solicitudes
   
   Validaciones típicas:
   - Categoría regulatoria sin `legal_basis` es inconsistente
   - Periodicidad mensual con retención de 1 semana es inconsistente
   - Capability IDs deben existir en el catálogo canónico de REQ-68
   - Cada `concept` de las asociaciones debe existir en el catálogo del Inbox del `target_app`
   - `allows_auto_generation: false` sin asociación `generate_report_manually` es inconsistente

3. **Tecnología implementa la función de generación** y la registra (`generator_ref`). Tecnología registra también las asociaciones en el Centro de Solicitudes.

4. **Despliegue.** El reporte aparece en la UI de cada app declarada en `consumer_apps[]`, visible solo para usuarios con `permissions.view`. Las asociaciones quedan activas; el scheduler del Inbox comienza a generar/verificar según `lead_time_days`.

---

## Decisiones clave

| # | Fecha | Decisión |
|---|---|---|
| 1 | Pre-2026-05 | Reportes como **servicio transversal del core**, no módulo de un app específico. Cualquier app declara consumo vía `consumer_apps[]` |
| 2 | Pre-2026-05 | Separación tajante entre **definición funcional** (área) y **ejecución técnica** (Tecnología). El alta de un reporte no es operación de runtime |
| 3 | Pre-2026-05 | Control de acceso por **4 capabilities independientes** (view/execute/edit/delete) en lugar de roles fijos. Default seguro para prevenir exposición accidental |
| 4 | Pre-2026-05 | `consumer_apps[]` y `permissions` como **dimensiones ortogonales**: una define dónde aparece, otra quién accede dentro de cada app |
| 5 | Pre-2026-05 | `ReportRun` **inmutables** con metadata preservada indefinidamente; archivos sujetos a `retention_policy.duration` |
| 6 | Pre-2026-05 | **Categorías de retención** estandarizadas (`regulatorio` / `contable` / `operativo` / `interno`) con `legal_basis` mandatorio para las dos primeras |
| 7 | Pre-2026-05 | V2 (IA Playground + builder visual + Marketplace) marcada explícitamente como **sujeta a viabilidad, no commitment**. V1 debe ser autosuficiente |
| 8 | ~~2026-05-11~~ → **revisada 2026-05-12** | ~~`REPORT_DEPENDENCY` se modela como Tarea al Inbox del `blocking_app` con `auto_archive`~~. **Revisada:** las dependencias del reporte se modelan como `ConsumerTypeAssociation`s del Centro de Solicitudes (REQ-71) con `consumer_ref: <report_id>`. El comportamiento es **anticipado** (`generate_new` crea instancia con `lead_time_days` de antelación) o **verificativo** (`verify_existing` chequea instancias existentes), reemplazando el modelo reactivo con `auto_archive`. Ver § Asociaciones consumidor-tipo del reporte |
| 9 | 2026-05-11 | **Principio elevado:** la gestión y ejecución de reportes son fuente de alertas hacia el Centro de Alertas. Los eventos típicos enumerados en § "Eventos del scheduler a Alertas" no son exhaustivos — cualquier evento relevante del dominio Reportes puede modelarse como un nuevo `ALERT_TYPE` siguiendo el flujo formal (REQ-73 §11) |
| 10 | ~~2026-05-11~~ → **revisada 2026-05-12** | ~~Bifurcación por `allows_auto_generation`: `true` → Alerta `reporte_proximo_emision_auto`; `false` → Tarea reactiva `reporte_proximo_emision_manual` al Inbox~~. **Revisada:** la bifurcación se mantiene, pero el caso `false` ya no emite Tarea reactiva. La generación manual se modela proactivamente como `ConsumerTypeAssociation` con `concept: 'generate_report_manually'` declarada al alta del reporte. El scheduler del Inbox genera la Tarea anticipadamente según `lead_time_days` |
| 11 | 2026-05-11 | **`ReportRun.dependencies_unmet[]`** — cuando un reporte con `allows_auto_generation: true` se genera con asociaciones no satisfechas, persiste snapshot vía `ConsumerAssociationSnapshot[]`. Emite Alerta `reporte_dependencias_incompletas` al consumidor |
| 12 | ~~2026-05-11~~ → **superseded 2026-05-12** | ~~`ReportDependency.recurring_definition_id?` para vincular con series recurrentes del Inbox~~. **Superseded:** el mecanismo de `verify_existing` en `ConsumerTypeAssociation` cumple el mismo propósito de forma más general. La asociación con `satisfaction_mode: 'verify_existing'` y `verify_window_days` se apoya en instancias existentes del concept (provengan de series recurrentes o de otros caminos) sin necesidad de referencia explícita a la definición de la serie |
| 13 | 2026-05-12 | **Alineamiento con principio "Wizard of Oz arquitectónico":** el invocador del endpoint de Reportes no decide la ruta de ejecución. El servicio decide internamente si la generación es completamente programática (CRON sin asociaciones no satisfechas) o si requiere intervención humana (esa intervención ya está pre-existente en el Inbox vía las asociaciones). Consistente con el modelo del Centro de Solicitudes (`centro-de-solicitudes.md` §"Principio arquitectónico: capacidades, no rutas") |
| 14 | 2026-05-12 | **Modelo unificado de trabajo humano vinculado a reportes:** todo trabajo humano que un reporte requiere — sea de otra área (dependencia bloqueante) o de su propia área (generación manual) — se modela bajo el mismo mecanismo: `ConsumerTypeAssociation` declarada al alta del reporte. Esto elimina la convivencia previa de dos mecanismos (Tarea reactiva con `auto_archive` para dependencias + Tarea reactiva sin auto_archive para próximo a emitir manual) y los unifica en un único patrón proactivo |
| 15 | 2026-05-12 | **Tipo genérico `generate_report_manually` en el catálogo del Inbox:** un único tipo del catálogo cubre todas las generaciones manuales de reportes, parametrizado por `payload: { report_id, period }`. Evita declarar un tipo del Inbox por cada reporte manual. El cierre de la Tarea se trigerea automáticamente cuando el `ReportRun` asociado completa con `status: 'ok'` |
| 16 | 2026-05-12 | **`Report.dependencies[]` eliminada del modelo;** las dependencias son entidades del Centro de Solicitudes, consultables vía `ConsumerTypeAssociation` filtrando por `consumer_ref: <report_id>`. `ConsumerAssociationSnapshot` reemplaza a `ReportDependencySnapshot` en `ReportRun.dependencies_unmet[]`. La declaración de asociaciones se hace en el flujo formal de alta del reporte vía la sección `associations[]` de la solicitud |
| 17 | 2026-05-13 | **REQ-54 (LEX) refactorizado al nuevo paradigma.** Alineación del consumidor LEX al modelo unificado: adopción del servicio transversal (no construcción de módulo específico de LEX), permissions de 4 niveles, `ConsumerTypeAssociation` como mecanismo de dependencias, lista canónica de 5 eventos sistémicos. Las dependencias concretas por reporte (ej: reporte UIF mensual ↔ `daily_reconciliation` de OPS con `verify_existing` + `verify_window_days: 1`) quedan para refinement con Legal + OPS |

---

## Frentes abiertos

- **Construcción de v1** — entregable de Tecnología bajo AM-1004 (TO REFINEMENT)
- **REQ-54 (LEX) — Adopción del Centro de Reportería para Legal & Compliance** — en SENT TO DEV, desbloqueado por REQ-59. **Refactor completado el 2026-05-13** — alineado al nuevo paradigma: adopción del servicio transversal, permissions de 4 niveles, `ConsumerTypeAssociation` con `satisfaction_mode`, lista canónica de 5 eventos sistémicos. Detalle por reporte (qué asociaciones declara cada uno) queda para refinement con Legal
- **REQs por área para OPS, FIN, TRD, CLP** — surgen a demanda; cada uno declara sus asociaciones al alta
- **Decisiones técnicas con Tecnología:** vinculación reporte↔función, arquitectura del scheduler, almacenamiento y retención por entidad, contrato del endpoint, alta atómica de Report + sus ConsumerTypeAssociations, viabilidad de V2

---

## Referencias

- REQ entregable: REQ-59 · espejo en AM-1004
- Discovery relacionado: `discoveries/core-modulos-transversales-discovery.md`
- Features relacionadas:
  - Centro de Alertas (`centro-de-alertas.md`) — receptor de los `ALERT_TYPE`s puramente informativos que emite este servicio (próximo-emisión-auto, vencido, error-generación, emitido-automáticamente, dependencias-incompletas). Las Tareas humanas ya **no** se canalizan vía Alertas
  - Centro de Solicitudes (`centro-de-solicitudes.md`) — provee la entidad `ConsumerTypeAssociation` y el tipo genérico `generate_report_manually`. Es el mecanismo único de coordinación de trabajo humano vinculado a reportes (dependencias bloqueantes + generaciones manuales)
- REQ consumidor: REQ-54 (LEX — Adopción del Centro de Reportería para Legal & Compliance) — alineado al modelo unificado en sesión 2026-05-13
