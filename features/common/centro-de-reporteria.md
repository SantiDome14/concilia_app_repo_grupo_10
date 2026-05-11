---
aplicacion: COMMON
status: Definida
owner: Yasmani Rodriguez
created_at: 2026-05-11
updated_at: 2026-05-11
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
| Mecanismo `REPORT_DEPENDENCY` | Coordinación con Alertas cuando un reporte tiene dependencias bloqueantes en otra app — cierre manual en v1 |
| Reportes cross-app | Múltiples `consumer_apps[]` por reporte; ejecuciones únicas compartidas |
| Reportes headless | `consumer_apps[]` vacío — generados pero no expuestos en UI |
| Flujo formal V1 de alta | Solicitud estructurada → REQ hijo → función de generación → registry |

### Afuera (v2, sujeto a viabilidad)

- **IA Playground self-service** — usuario conversa con una IA conectada a base de prueba, arma queries, obtiene definición ejecutable + solicitud V1 autocompletada
- **Builder visual estilo n8n** — nodos (Fuente, Filtro, Constraint, Transformación, Formato, Condición) generando la misma salida
- **Marketplace de Reportes** — publicación directa para reportes internos/operativos sin pasar por Tecnología (regulatorios y contables siguen ruta formal)
- **Matriz de aprobaciones por categoría × sensibilidad** — declarable por tipo de reporte
- **Auto-cierre algorítmico del mecanismo `REPORT_DEPENDENCY`** — alineado con Centro de Alertas v1 (que difiere auto-cierre a v2). En v1, el cierre de las alertas de dependencia es manual
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
  alert_anticipation_days?: number;
  format: 'PDF' | 'XLSX' | 'CSV';
  generator_ref: string;             // referencia a la función de generación
  retention_policy: RetentionPolicy;
  params: Record<string, unknown>;
  allows_auto_generation: boolean;
  dependencies?: ReportDependency[];
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
}
```

`ConsumerAppRef` define **dónde aparece** el reporte; `permissions` define **qué usuarios** pueden ver/ejecutar/editar/eliminar. Dimensiones ortogonales.

---

## Control de acceso

### Cuatro niveles independientes

| Nivel | Qué controla | Semántica |
|---|---|---|
| `view` | Filtra el catálogo y las ejecuciones | Sin la capability, el reporte **no existe** para ese usuario |
| `execute` | Ejecución manual + scheduling | Con `view` pero sin `execute`, el reporte es read-only |
| `edit` | Modificación de definición, metadata, CRON, `consumer_apps[]`, `dependencies[]` | Sin esta capability "Editar metadata" no aparece |
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

**Generación manual.** Click en "Generar" → endpoint valida `permissions.execute`, valida parámetros, verifica `dependencies[]`, invoca `generator_ref`, persiste `ReportRun`, retorna referencia descargable. Si hay dependencias pendientes, no genera: emite `REPORT_DEPENDENCY` y devuelve `dependencies_pending`.

**Generación automática (CRON).** Scheduler periódico consulta el catálogo, identifica reportes con `allows_auto_generation: true` y `cron_active: true` cuya fecha venció o está dentro del umbral; verifica dependencias; invoca el endpoint con parámetros default e identidad de sistema; persiste `ReportRun` con `trigger: { type: 'cron' }`; actualiza `next_emission_date`. No aplica check de `permissions.execute` (identidad de sistema).

**Persistencia y retención.** Cada `ReportRun` queda inmutable con metadata completa. Archivos re-descargables hasta vencimiento de `retention_policy.duration`, sujeto a `permissions.view`. Al vencer: `retention_expired: true`, `output_url` deja de servir (404), deja de aparecer en Ejecución; metadata preservada indefinidamente.

**Retenciones típicas de referencia:**

| Categoría | Duración típica |
|---|---|
| `regulatorio` | 5–10 años (UIF Arg ≥ 10 años, BCRA, CNV, FATCA) |
| `contable` | 10 años (asientos, balances, P&L) |
| `operativo` | 1–6 meses |
| `interno` | 1–3 meses |

---

## Naturaleza del servicio

| Capa | Implementación |
|---|---|
| Backend | Servicio transversal del core: endpoint único, scheduler, persistencia de ejecuciones, capability checks, canal de eventos a Alertas |
| UI | Por app consumidora: cada app declarada en `consumer_apps[]` renderiza Catálogo + Ejecución, filtrados por `permissions.view` |
| Reportes multi-app | Un `Report` con N entradas en `consumer_apps[]` aparece en N catálogos; las `ReportRun` son únicas y compartidas |
| Reportes headless | `consumer_apps[]` vacío — generados pero no expuestos en UI. Útil para schedulers externos, integraciones con reguladores, agentes IA |
| Invocación externa | Cualquier sistema autenticado (Auth0 o credencial de sistema) puede llamar al endpoint con su identidad |

---

## Integraciones

| Con | Cómo |
|---|---|
| **Acciones / Manifest Engine** (REQ-68) | (a) Las acciones del Catálogo son del manifest; (b) el capability provider resuelve `user → capabilities`; (c) el catálogo canónico de capabilities vive ahí y este servicio las referencia por ID |
| **Centro de Alertas** (`centro-de-alertas.md`, REQ-73) | Consumidor del repositorio para reportería analítica; receptor de eventos del scheduler (próximo a emitir, vencido, error en generación, `REPORT_DEPENDENCY`) |
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

Los REQs por área entregan: qué reportes declara cada app, qué categorías, qué `dependencies[]`, qué `permissions` aplica por reporte (capabilities concretas), qué capacidades opcionales activa, y la función de generación concreta (`generator_ref`).

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
   - `dependencies[]`
   - **`permissions`** — declaración explícita de capability IDs para los 4 niveles, o default seguro

2. **Producto valida coherencia** y abre un REQ hijo con el shape completo del `Report`:
   - Categoría regulatoria sin `legal_basis` es inconsistente
   - Periodicidad mensual con retención de 1 semana es inconsistente
   - Capability IDs deben existir en el catálogo canónico de REQ-68

3. **Tecnología implementa la función de generación** y la registra (`generator_ref`).

4. **Despliegue.** El reporte aparece en la UI de cada app declarada en `consumer_apps[]`, visible solo para usuarios con `permissions.view`.

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
| 8 | 2026-05-11 | **Alineación con Centro de Alertas v1.** Se difiere a v2 el auto-cierre algorítmico del mecanismo `REPORT_DEPENDENCY` (consistente con REQ-73 v1, que difiere auto-cierre y `auto_resolved`). En v1, el cierre de las alertas de dependencia es manual; la marca `dependencies[].completed: true` en Reportes es independiente del cierre de la alerta |
| 9 | 2026-05-11 | **Principio elevado:** la gestión y ejecución de reportes son fuente de alertas hacia el Centro de Alertas. Los eventos típicos enumerados en §9 de REQ-59 (próximo a emitir, vencido, error, dependencia) no son exhaustivos — cualquier evento relevante del dominio Reportes puede modelarse como un nuevo `ALERT_TYPE` siguiendo el flujo formal de REQ-73 §11 |

---

## Frentes abiertos

- **Construcción de v1** — entregable de Tecnología bajo AM-1004 (TO REFINEMENT)
- **REQ-54 (LEX) — Centro de Reportería Regulatoria y Operativa** — en SENT TO DEV, desbloqueado por REQ-59
- **REQs por área para OPS, FIN, TRD, CLP** — surgen a demanda
- **Decisiones técnicas con Tecnología:** vinculación reporte↔función, arquitectura del scheduler, almacenamiento y retención por entidad, contrato del endpoint, viabilidad de V2

---

## Referencias

- REQ entregable: REQ-59 · espejo en AM-1004
- Discovery relacionado: `discoveries/core-modulos-transversales-discovery.md`
- Feature relacionada: Centro de Alertas (`centro-de-alertas.md`) — receptor de los `ALERT_TYPE`s que emite este servicio (`report_dependency`, próximo a emitir, vencido, errores)
- REQ consumidor: REQ-54 (LEX — Centro de Reportería Regulatoria y Operativa)
