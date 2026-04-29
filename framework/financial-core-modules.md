# Módulos Genéricos del Financial-Core

> **Versión:** 1.2.1 · **Última actualización:** 27/04/2026
> **Estado:** Convención formal · vinculante para todos los prototipos del core
> **Owner:** Head of Product

Parte del Framework Operativo de Producto de Ardua. Define los módulos transversales que aparecen en todas las aplicaciones del financial-core, su arquitectura común, y las reglas de implementación.

---

## 1. Contexto

El financial-core de Ardua se compone de aplicaciones que cubren cada vertical funcional del negocio:

| Aplicación | Foco | Color brand |
|---|---|---|
| **OPS** | Operaciones — ejecución de movimientos de clientes | Rojo (`#EF4444`) |
| **TRD** | Trading — mesa, lotes de liquidez, RFQ Gateway | Azul (`#3B82F6`) |
| **LEX** | Legal & Compliance — KYC, blacklist, ROS | Teal (`#2DD4BF`) |
| **CLP** | Client Portal — interfaz del cliente | Púrpura (`#A78BFA`) |
| **COM** | Comercial — pipeline, leads, referenciadores | Ámbar (`#F59E0B`) |
| **FIN** | Finanzas y Contabilidad — Tesorería, Contabilidad, Reportes | Verde (`#22C55E`) |

Cada aplicación tiene módulos específicos de su dominio (`Tesorería` en FIN, `Blacklist` en LEX, `RFQ` en TRD, etc.). Pero existen **patrones funcionales** que se repiten en todas — en lugar de implementarlos de forma aislada en cada app, se centralizan como **módulos genéricos del financial-core**.

---

## 2. Los 4 módulos genéricos

| Módulo | Propósito | Estado canónico |
|---|---|---|
| **Dashboard** | Vista consolidada de la salud del área que cubre la aplicación, con KPIs, alertas activas, próximos vencimientos, actividad reciente. | A definir por aplicación |
| **Inbox** | Bandeja de entrada unificada de la aplicación. Recibe solicitudes y tareas que requieren acción del usuario, originadas en otras aplicaciones del core o por usuarios internos. | Pendiente de prototipo canónico |
| **Alertas** | Gestión de alertas del sistema. El flujo concreto depende del perfil declarado por cada tipo de alerta (notificación simple, workflow auditable, automático). | Canónico: `prototypes/lex/lex_alertas_prototype.html` (perfil B · Workflow) |
| **Reportes** | Catálogo de reportes con metadata configurable + histórico de generaciones. Patrón de doble ownership: definición (área) vs generación (Tecnología). Soporta CRON, ejecución manual y dependencias inter-área. | Canónico: `prototypes/lex/lex_reporteria_prototype.html` |

Estos módulos comparten **nombre, posición funcional, modelo de datos base, vocabulario del producto e interfaz visual del núcleo**. Lo que cambia entre aplicaciones es **el dataset, los tipos específicos del dominio y las capacidades opcionales que cada app activa** (ver §3).

---

## 3. Modelo de núcleo + capacidades opcionales

Cada módulo genérico se compone de dos capas:

**Núcleo:** lo que define al módulo. Es obligatorio en cualquier implementación. Si una app implementa Alertas pero no tiene listado activo de alertas, no es Alertas — es otra cosa.

**Capacidades opcionales:** funcionalidades que cada app activa según su realidad operativa. Una alerta de compliance que termina en un ROS necesita workflow auditable con asignación, timeline y cierre justificado; una alerta de "el saldo bajó del piso operativo" puede ser solo un aviso que se marca como atendido. Forzar el mismo flujo en ambos casos es overkill en un lado e insuficiente en el otro.

Este modelo da **flexibilidad sin sacrificar consistencia**: el nombre, la posición en el sidebar, el modelo de datos base, los componentes UI del núcleo y el vocabulario del producto se mantienen idénticos en todas las apps; lo que varía es qué capacidades opcionales activa cada implementación.

### 3.1 Cómo se declara

Para Inbox, Reportes y Dashboard, las capacidades se activan **a nivel del módulo de la app** (FIN.Reportes activa "dependencias inter-área"; LEX.Reportes no la necesita).

Para Alertas, las capacidades se activan **a nivel de tipo de alerta**. Una misma app puede tener tipos con distintos perfiles. Por ejemplo, en FIN:

- `RECONCILIATION` requiere análisis humano y justificación → perfil con asignación + timeline + cierre con comentario.
- `BALANCE_ANOMALY` es un aviso sin proceso → perfil sin asignación, solo marcar como atendida.
- `REPORT_DEPENDENCY` es generada y cerrada por el sistema → perfil sin intervención humana.

Esto es importante: **una app no es de un perfil; sus tipos lo son**.

### 3.2 Perfiles típicos como referencia

La mayoría de las implementaciones caen en uno de estos perfiles. No es una taxonomía cerrada — una app puede combinar capacidades libremente — pero estos perfiles dan vocabulario compartido para hablar de implementaciones.

| Perfil | Capacidades activas | Caso de uso típico |
|---|---|---|
| **A · Notification-only** | Listado activo + acción "marcar como atendida" | Avisos sin proceso. Severidad opcional. Sin asignación, sin timeline, sin justificación. Estados: `new` / `resolved`. |
| **B · Workflow** | Todas las capacidades del perfil canónico LEX | Casos que requieren análisis humano y registro auditable. Asignación, drawer con timeline, comentarios, modal de cierre con justificación ≥ 10 chars. Estados: `new` / `in_review` / `resolved` / `dismissed`. |
| **C · Auto-system** | Generación y cierre automáticos | Sin intervención humana en el ciclo de vida. Sistema crea, sistema cierra. Estados: `new` / `auto_resolved`. |
| **D · Hybrid** | Coexistencia de perfiles A/B/C | Una app cuyo módulo Alertas tiene tipos con distintos perfiles. Ejemplo: FIN. |

### 3.3 Implicación para el implementador

Cuando una app prototipa o implementa un módulo genérico, su discovery debe declarar:

1. **Qué capacidades opcionales activa** (con justificación si declina alguna del perfil canónico).
2. **Qué perfil(es) cubren sus tipos** (en el caso de Alertas).
3. **Qué estados aplican** dado el perfil declarado.

El template clonable implementa el perfil más completo (Workflow para Alertas, Reportes con todas las capacidades). Al clonar, cada app desactiva o simplifica las capacidades que no necesita — es más fácil quitar que agregar.

---

## 4. Por qué son genéricos

Tres motivos para centralizar estos patrones:

**1. Coherencia transversal.** Un usuario que opera en múltiples aplicaciones (un HoP, un compliance officer, un treasurer) encuentra siempre la misma estructura: el Inbox de OPS funciona como el Inbox de FIN, las Alertas de LEX se gestionan igual que las de FIN. Reduce carga cognitiva y acelera el onboarding.

**2. Eficiencia de desarrollo.** Tecnología construye una vez la infraestructura subyacente (motor de reglas de alertas, sistema de cron de reportes, ruteo de inbox, persistencia de timeline) y las aplicaciones la consumen como servicio. Sumar un nuevo tipo de alerta o un nuevo reporte es alta + función de generación, sin refactor del módulo.

**3. Consistencia funcional del producto.** Decisiones de diseño que ya se validaron en una aplicación (ej: el flujo de asignación → revisión → cierre con comentario obligatorio en LEX Alertas) se heredan automáticamente en las demás. Esto evita re-discutir los mismos problemas en cada aplicación nueva.

---

## 5. Qué cambia entre aplicaciones

Lo que se mantiene constante (común a todas las apps) y lo que cambia (específico de cada app):

| Dimensión | Constante | Cambia por aplicación |
|---|---|---|
| Nombre del módulo | ✅ Siempre `Dashboard`, `Inbox`, `Alertas`, `Reportes` | — |
| Arquitectura visual del núcleo | ✅ Sub-tabs, KPIs, drawer, modales, timeline | — |
| Modelo de datos base | ✅ ID, estado, asignación, timeline, fechas | Campos específicos del dominio |
| Set canónico de estados (Alertas) | ✅ Definido en §7.5 | Cada perfil usa solo los relevantes |
| Sub-tabs del núcleo | ✅ `Nuevas` + `Histórico` (Alertas) · `Catálogo` + `Histórico` (Reportes) | — |
| Tipos / Categorías | — | Cada app define los suyos |
| Dataset (registros concretos) | — | Cada app pobla con sus datos |
| Filtros del histórico | Algunos comunes (Estado, Responsable, Período) | Otros específicos del dominio |
| Acciones por registro | Las del flujo (Asignarme, Marcar como, Comentar) | Acciones del dominio si las hay |
| Ubicación en sidebar | — | Cada app la decide según contexto |
| Capacidades activadas | — | Cada app declara qué capacidades opcionales habilita por módulo (y por tipo en el caso de Alertas) |

---

## 6. Ubicación en el sidebar

**Convención cerrada:** los 4 módulos genéricos van **al tope del sidebar, al mismo nivel y sin agruparlos bajo ningún `<div class="sb-section">`**. Esto vale para **todas las apps del core** (OPS, TRD, LEX, CLP, COM, FIN), sin excepciones.

Los `<div class="sb-section">` se reservan exclusivamente para los módulos del dominio específico de cada app (ej: "Operaciones" / "Contabilidad" en FIN, "Compliance" en LEX, "Operaciones" / "Gestión" en OPS).

**Estructura canónica:**

```
[Brand]
· Dashboard
· Inbox      [N]
· Alertas    [N]
· Reportes

BLOQUE DEL DOMINIO 1
· Módulo específico …
· Módulo específico …

BLOQUE DEL DOMINIO 2
· Módulo específico …

[spacer]
[Account]
```

**Por qué esta convención:**

1. **Reconocibilidad transversal.** Un usuario que opera en múltiples apps encuentra los 4 genéricos siempre en la misma posición física. No tiene que buscarlos contextualmente en cada app.
2. **Separación visual clara entre lo transversal y lo del dominio.** El bloque del dominio es "lo que esta app hace que las otras no hacen"; los genéricos del tope son "lo que toda app del core tiene".
3. **Coherencia con el breadcrumb.** Los genéricos al tope, sin bloque, generan breadcrumbs simples (`Inbox / Tablero`, `Alertas / Nuevas`) sin segmento de bloque previo. Los módulos del dominio generan breadcrumbs con bloque (`Operaciones / Movimientos`).

**Implicación para el helper de breadcrumb:** el componente `renderBC(segments)` del template usa `sidebarBlockOf(niEl)` que detecta automáticamente si el `.ni` activo está al tope o adentro de un bloque. **No hardcodear** el segmento de bloque en cada vista — calcularlo desde el DOM.

---

## 7. Patrón arquitectónico — Alertas

**Prototipo canónico:** `prototypes/lex/lex_alertas_prototype.html` (implementa el perfil B · Workflow completo).

### 7.1 Núcleo (siempre presente)

Sin estos componentes, no hay módulo Alertas:

- **Listado activo de alertas** — vista principal del módulo.
- **Modelo de datos mínimo** — `id`, `type`, `state`, `created_at`, `last_event_at`.
- **Acción de marcar como atendida** — toda alerta tiene un fin de vida. El cómo se marca depende del perfil (ver §7.3).
- **Tipos definidos por la app** — el dominio determina qué se alerta.
- **Sub-tab Nuevas activas** — alertas que aún requieren atención.

### 7.2 Capacidades opcionales

Cada app activa las que necesite:

| Capacidad | Cuándo activarla |
|---|---|
| **Severidad** (`critical`/`high`/`medium`/`low`) | Cuando hay priorización entre alertas |
| **Sub-tab Histórico** | Cuando importa la auditoría retrospectiva |
| **Asignación a usuario** (`Asignarme`/`Asignar a...`/`Reasignar`/`Desasignar`) | Cuando hay un dueño humano del trabajo |
| **Asignación a área** (sin persona específica) | Cuando es responsabilidad colectiva sin ownership individual |
| **Drawer lateral con timeline** | Cuando la resolución es un proceso, no un acto |
| **Comentarios en timeline** | Cuando hay colaboración entre personas en una alerta |
| **Modal de cierre con justificación** (≥ 10 chars) | Cuando se requiere registro auditable de la decisión |
| **Auto-cierre por sistema** | Cuando la condición de cierre es detectable algorítmicamente |
| **Filtros del histórico** (Tipo / Severidad / Responsable / Período / Sociedad / etc.) | Cuando el volumen lo justifica |
| **KPIs en L2** (Nuevas / En revisión / Revisadas mes / Descartadas mes) | Cuando importa visibilizar el throughput del equipo |

### 7.3 Perfiles típicos

Ver §3.2 para el vocabulario compartido. Aplicado a Alertas:

- **Perfil A · Notification-only** — solo núcleo + severidad opcional. Estados: `new` / `resolved`. Cierre = "marcar como atendida" sin justificación.
- **Perfil B · Workflow** — núcleo + todas las capacidades del canónico LEX. Estados: `new` / `in_review` / `resolved` / `dismissed`. Cierre con justificación obligatoria.
- **Perfil C · Auto-system** — núcleo + auto-cierre. Estados: `new` / `auto_resolved`. Sin intervención humana.
- **Perfil D · Hybrid** — el módulo coexiste con tipos de distintos perfiles.

### 7.4 Modelo de datos

**Campos del núcleo (siempre presentes):**

```
{
  id: string,
  type: string,
  state: enum (depende del perfil del tipo),
  created_at: timestamp,
  last_event_at: timestamp,
  // ...campos del dominio
}
```

**Campos por capacidad activada:**

| Campo | Capacidad asociada |
|---|---|
| `severity` | Severidad |
| `assignee_id`, `assigned_at` | Asignación a usuario |
| `assigned_team` | Asignación a área |
| `closed_at`, `closed_by`, `close_comment` | Modal de cierre con justificación |
| `timeline: [...]` | Drawer con timeline / Comentarios |
| `auto_resolved_reason` | Auto-cierre |

### 7.5 Estados — set canónico

El framework define un set único de estados. Cada perfil usa solo los relevantes:

| Estado | Significado | Perfiles que lo usan |
|---|---|---|
| `new` | Alerta sin atender | Todos |
| `in_review` | Tomada por un usuario, en proceso | B (Workflow) |
| `resolved` | Cerrada con acción | A, B |
| `dismissed` | Descartada / falso positivo | B |
| `auto_resolved` | Cerrada automáticamente por el sistema | C |

Una vez cerrada (`resolved` / `dismissed` / `auto_resolved`), la alerta es inmutable.

### 7.6 Componentes UI según capacidades

| Componente UI | Requiere capacidad |
|---|---|
| Listado activo (cards o tabla) | Núcleo |
| Sub-tab Nuevas + Histórico | Histórico |
| Drawer lateral | Drawer con timeline |
| Sección Timeline en drawer | Drawer con timeline |
| Footer con textarea de comentarios | Comentarios en timeline |
| Modal de cierre con validación | Cierre con justificación |
| KPIs L2 (4 cards) | KPIs |
| Filtros portal | Filtros del histórico |
| Sistema de asignación (botones contextuales + dropdown) | Asignación |

---

## 8. Patrón arquitectónico — Reportes

**Prototipo canónico:** `prototypes/lex/lex_reporteria_prototype.html` (implementa el perfil completo con todas las capacidades activas).

### 8.1 Principio rector — separación definición / generación

**La definición** del reporte es ownership del área de negocio (Legal, Finanzas, Operaciones, etc.). El registro en el catálogo contiene metadata completa: nombre, descripción, categoría, entidad rectora, normativa, periodicidad, formato, política de retención, parámetros.

**La generación** es ownership de Tecnología: para cada registro del catálogo, Tecnología implementa una función de generación (query, enriquecimiento, template) invocable on-demand vía CTA o programada vía CRON.

Sumar un reporte nuevo = alta del registro + función de generación, sin refactor del módulo.

### 8.2 ¿Qué reportes van al módulo Reportes?

No todo reporte va al módulo centralizado. Cada módulo de cada app puede tener funcionalidades simples de exportación (botón "Exportar CSV" sobre una tabla, descarga de un detalle, etc.). Esos reportes simples viven dentro de su módulo y NO van a Reportes.

**Al módulo Reportes van solo los que cumplen al menos uno de:**

1. **Información consolidada** que cruza múltiples módulos o múltiples apps del core (Estado de Resultados consolidado, Conciliación Global por Banco).
2. **Procesamiento complejo** que justifica ejecución asincrónica — el usuario que solicita la generación no debe esperar bloqueado en pantalla.
3. **Coordinación inter-área** — la generación requiere que múltiples áreas completen tareas previas en sus respectivas apps/módulos antes de poder ejecutarse.

| Tipo de reporte | Vive en | Ejemplo |
|---|---|---|
| Exportación CSV de listado actual | Módulo específico | Tabla de Movimientos → "Exportar CSV" |
| Resumen rápido de KPIs | Módulo específico (Dashboard) | KPIs en tiempo real |
| Reporte regulatorio formal | Módulo Reportes | Régimen Informativo PSP BCRA |
| Estado de Resultados consolidado | Módulo Reportes | P&L mensual del grupo |
| Reporte con coordinación inter-área | Módulo Reportes | Conciliación Global (Finanzas + Operaciones + Compliance) |

**El módulo Reportes es un mecanismo de gestión de información consolidada, no un repositorio de exportaciones.**

### 8.3 Núcleo (siempre presente)

- **Catálogo de reportes** con metadata mínima por registro (nombre, descripción, categoría, periodicidad, formato).
- **Sub-tabs** Catálogo + Histórico.
- **Endpoint de generación** invocable desde CTA del módulo.
- **Persistencia del histórico** de generaciones con metadata.
- **Acción de descarga** sobre el archivo generado.

### 8.4 Capacidades opcionales

| Capacidad | Cuándo activarla |
|---|---|
| **Edición de metadata por usuario** (modal) | Cuando el área puede ajustar definición sin pasar por Producto |
| **CRON activable por usuario** | Cuando hay reportes programables y el área los gestiona |
| **Dependencias inter-área** (ver §8.5) | Cuando algún reporte requiere coordinación con otras apps |
| **Validación previa antes de generar** | Cuando hay parámetros complejos o pre-condiciones |
| **Modal de detalle por reporte** | Cuando importa la trazabilidad histórica por reporte |
| **Filtros del histórico** | Cuando el volumen lo justifica |
| **Reportes bloqueados visibles** (`.locked`) | Cuando importa visibilizar el roadmap |

### 8.5 Dependencias inter-área para la generación

Un reporte centralizado puede declarar **dependencias** — tareas que deben ejecutarse en otras apps/módulos antes de poder generarse.

**Modelo extendido del registro de catálogo:**

```javascript
{
  id: 'rpt_001',
  name: 'Estado de Resultados Mensual',
  category: 'Financieros',
  periodicity: 'Mensual',
  // ...metadata base
  dependencies: [
    {
      app: 'OPS',
      module: 'Movimientos',
      task: 'Conciliación operativa del mes cerrada',
      owner_role: 'OPS_OFFICER',
      sla_days_before: 2  // 2 días antes del vencimiento del reporte
    },
    {
      app: 'FIN',
      module: 'Tesorería',
      task: 'Carga manual de FEEs bancarios procesada',
      owner_role: 'TREASURY',
      sla_days_before: 3
    }
  ]
}
```

**Estado del reporte considerando dependencias:**

- `Listo para generar` → todas las dependencias completadas → CTA Generar habilitado.
- `Pendiente · 2/3 dependencias` → CTA Generar deshabilitado, tag visible con detalle.
- `Bloqueado` → alguna dependencia con vencimiento crítico no cumplida → alerta visual roja.

### 8.6 Integración con el módulo Alertas — REPORT_DEPENDENCY

Reportes y Alertas se integran como mecanismo de coordinación inter-aplicación.

**Flujo:** cuando un reporte tiene una dependencia pendiente y se acerca su SLA, el motor de Reportes genera automáticamente una alerta de tipo `REPORT_DEPENDENCY` dirigida al área responsable. La alerta llega al **Inbox y al módulo Alertas de la app correspondiente**.

**Ejemplo:**

- Reporte: "Estado de Resultados Mensual" (FIN.Reportes)
- Vence: 05/05.
- Dependencia: "Conciliación operativa del mes cerrada" — owner: OPS_OFFICER (OPS), SLA 2 días antes (= 03/05).
- 02/05: motor detecta que la conciliación no está cerrada. Genera `REPORT_DEPENDENCY` para OPS.
- Alerta llega a OPS.Inbox y OPS.Alertas, se asigna a un OPS_OFFICER.
- El OPS_OFFICER cierra la conciliación en OPS.Movimientos.
- Sistema detecta dependencia cumplida → cierra automáticamente la alerta como `auto_resolved` con comentario auto-generado: "Dependencia completada: Conciliación operativa cerrada el 02/05/2026".
- Reporte vuelve a `Listo para generar`.

**Este tipo de alerta usa el perfil C (Auto-system)** — sin asignación humana, sin cierre manual.

**Modelo:**

```javascript
{
  type: 'REPORT_DEPENDENCY',
  state: 'new' | 'auto_resolved',
  severity: <derivada de proximidad al SLA>,
  context: 'Reporte "<nombre>" requiere completar tarea en <app/módulo>',
  detail: '<descripción de la tarea pendiente>',
  related_report_id: 'rpt_001',
  related_dependency_index: 0,
  owner_role: '<rol del área responsable>',
  // resto idéntico al modelo base de alertas
}
```

**Loop completo de los 4 módulos genéricos:**

Reportes detecta el bloqueo → Alertas notifica al área responsable → Inbox la recibe → el área completa la tarea en su módulo específico → Alertas se cierra automáticamente → Reportes pasa a "Listo para generar" → Dashboard del solicitante refleja el cambio.

Este es el motivo por el que los 4 módulos genéricos **deben coexistir en cada app del financial-core**: ninguno funciona aislado, son piezas de un mismo mecanismo de coordinación.

### 8.7 Componentes UI según capacidades

| Componente UI | Requiere capacidad |
|---|---|
| Catálogo (cards agrupados) + Histórico (tabla) | Núcleo |
| Modal Editar metadata | Edición de metadata |
| Modal Configurar CRON | CRON activable |
| Modal Generar con parámetros | Núcleo |
| Modal Detalle del reporte | Modal de detalle |
| Indicador de dependencias pendientes en card | Dependencias inter-área |
| Filtros portal | Filtros del histórico |
| Cards `.locked` con tag de bloqueo | Reportes bloqueados visibles |

### 8.8 Categorías

Cada aplicación define sus categorías. Recomendación: 3-5 categorías que capturen la naturaleza del consumo (Regulatorio / Interno / Operativo / Contable / Financiero).

### 8.9 Reportes bloqueados

Reportes que dependen de un módulo o feature aún no implementado se muestran en el catálogo con clase `.locked`: opacidad reducida, sin botón Generar, con tag visible explicando el bloqueo (ej: `Bloqueado · requiere FIN.Contabilidad`). Da visibilidad temprana del scope futuro sin venderlos como disponibles.

---

## 9. Patrón arquitectónico — Inbox

**Prototipo canónico:** *(en construcción — primer canónico será OPS-Inbox; ver §9.5).*

### 9.0 Nomenclatura — "Solicitudes" (denominación universal del módulo)

**"Solicitudes" es la denominación universal y normalizada de todos los registros que se gestionan en el módulo Inbox del financial-core**, independientemente de la app (OPS, FIN, LEX, TRD, CLP, COM) y del tipo específico de la Solicitud. No es nomenclatura local de FIN ni de OPS — es **convención global del core**.

Una Solicitud puede originarse en distintas fuentes (otra app del core, un usuario interno, el sistema), tener distintos tipos (withdrawal, aprobación de carga manual, matching de depósito, RFQ, dependencia de reporte, etc.) y distintas acciones de cierre — pero el **vocabulario para nombrar la entidad es siempre el mismo**: Solicitud (singular) / Solicitudes (plural).

Debe aplicarse de forma consistente en:

- Documentación funcional (discoveries, feature specs, este framework).
- **Copy de UI** (labels, placeholders, mensajes vacíos, breadcrumbs internos, tooltips, contadores). Ej: "Tenés 8 Solicitudes pendientes en Inbox" — NO "8 items pendientes", NO "8 tareas", NO "8 pendientes".
- Modelos de datos (entidad principal: `Solicitud` / `request` según convención técnica del repo).
- Conversaciones con stakeholders.
- Specs Jira y comunicación con Tecnología.

El término en código puede ser `request` (inglés, alineado con convenciones técnicas habituales) o `solicitud` (español, alineado con la lengua del producto). Ambos son aceptables internamente, pero el **vocabulario visible al usuario final es siempre "Solicitud"**.

**Esta nomenclatura es vinculante para todas las implementaciones del módulo Inbox en cualquier app del core.** Cuando un prototipo o implementación use otra denominación (ej: "items", "tareas", "requests" en español), se considera deuda de copy a corregir.

### 9.1 Núcleo (siempre presente)

- **Lista de Solicitudes pendientes** que requieren atención del usuario o de un rol del área.
- **Modelo de datos mínimo** — `id`, `type`, `state`, `source_app`, `source_module`, `created_at`.
- **Acción de cerrar la Solicitud** (lleva el estado a `completed` / equivalente).

### 9.2 Estados — set canónico de Inbox

A diferencia de Alertas (que tiene 5 estados), Inbox usa un set propio de 3 estados que mapean a las columnas Kanban:

| Columna Kanban | Estado interno | Significado |
|---|---|---|
| **To Do** | `pending` | Solicitud recibida, sin tomar |
| **In Progress** | `in_progress` | Tomada por alguien y siendo trabajada |
| **Done** | `completed` | Atendida — la acción que requería se ejecutó |

Estado terminal: `completed` es inmutable. Una Solicitud completada no se puede reabrir.

### 9.3 Capacidades opcionales

| Capacidad | Cuándo activarla |
|---|---|
| **Acciones inline** (Aprobar / Rechazar / Tomar) | Cuando la decisión se toma desde el Inbox sin saltar a otro módulo |
| **Routing a un rol específico** (`target_role`) | Cuando hay roles definidos en la app |
| **Asignación a usuario** (Tomar / Asignar a... / Reasignar / Devolver a To Do) | Cuando hay un dueño humano del trabajo |
| **Drawer lateral con timeline** | Cuando atender una Solicitud es un proceso, no un acto |
| **Comentarios en timeline** | Cuando hay colaboración entre personas en una misma Solicitud |
| **Modal de cierre con justificación** | Cuando se requiere registro auditable de la decisión de cierre |
| **SLA visual** | Cuando las Solicitudes vencen y vale señalarlo (sin indicador / ámbar / rojo) |
| **Vista Kanban** (`pending` / `in_progress` / `completed`) | Cuando importa la visión de flujo (default recomendado) |
| **Vista Lista** (sub-tabs Activos / Histórico, KPIs, filtros, paginación) | Cuando importa el manejo de volumen alto y consulta histórica |
| **Drag & drop híbrido entre columnas Kanban** | Solo cuando hay vista Kanban (ver §9.4) |
| **Auto-archive** | Cuando las Solicitudes cierran solas al cumplirse una condición |
| **Agrupación por tipo / origen** | Cuando el volumen lo justifica |
| **Notificación push externa** (email / Slack) | Cuando se requiere alcance fuera de la app |

### 9.4 Drag & drop híbrido (cuando hay vista Kanban)

**Reglas de transición** entre columnas:

| Transición | Comportamiento |
|---|---|
| `pending → in_progress` | **Drag libre** con auto-asignación al usuario actual + evento en timeline |
| `in_progress → completed` | **Drag abre modal de confirmación.** Requiere elegir acción de cierre (radio buttons que varían por tipo) + comentario obligatorio ≥ 10 chars |
| `pending → completed` (directo) | Permitido pero abre modal. Auto-asigna primero al usuario actual |
| `in_progress → pending` | **Drag libre** con desasignación + toast |
| `completed → *` | **Bloqueado.** Las cards en Done no son draggables |
| Drop en la misma columna | **No-op** |

Las acciones inline (CTAs en cada card) coexisten con el drag — son la forma "rápida" de la misma transición. Implementación nativa con HTML5 Drag and Drop API, sin librerías externas.

### 9.5 Modal de cierre — radio buttons por tipo

A diferencia de Alertas (donde el cierre es "Marcar como revisada / Descartar" + justificación), en Inbox las **acciones de cierre dependen del tipo de la Solicitud**. El modal renderiza radio buttons con las opciones válidas para ese tipo, más un comentario obligatorio.

Ejemplos:

| Tipo de Solicitud | Acciones de cierre disponibles |
|---|---|
| Solicitud de withdrawal | Aprobar y procesar / Rechazar |
| Aprobación de carga manual | Aprobar / Rechazar |
| Solicitud de matching de depósito | Confirmar matching / Asignar manualmente / Rechazar |
| RFQ del cliente | Tomar (= ejecutar) / Reasignar a otro trader |
| Pedido de imputación retroactiva | Confirmar imputación / Rechazar |
| Notificación de dependencia inter-área | Confirmar tarea completada |

Cada tipo declara su set en el modelo de datos (`COMPLETION_ACTIONS_BY_TYPE`). El comentario es obligatorio para todas las opciones — provee auditoría de la decisión.

### 9.6 Tipos de Solicitudes previstos (transversal)

A medida que las apps maduran, los tipos típicos son:

- Solicitudes de cliente desde CLP (withdrawal, swap, RFQ).
- Aprobaciones de doble firma originadas en otro módulo (carga manual, asiento manual).
- Pedidos humanos inter-área (imputación retroactiva, generación ad-hoc de reporte).
- Notificaciones del sistema con acción (depósito a identificar, dependencia de reporte centralizado).
- Tareas planificadas con SLA.

Los tipos concretos los define cada app en su discovery.

### 9.7 Estado de implementación

Inbox aún no tiene prototipo canónico ejecutado. Estado actual:

- **OPS-Inbox** será el primer canónico del financial-core. Prompt completo en disco: `prototypes/ops/ops-inbox-PROMPT.md` v1 (27/04/2026), con vista Kanban + Lista, drag & drop híbrido, drawer + timeline, modal de cierre con radio buttons por tipo, dataset de 13 Solicitudes en 8 tipos cubriendo el dominio OPS (especialmente solicitudes desde CLP).
- **FIN-Inbox** está incluido en el prototipo de FIN (`prototypes/fin/PROMPT.md` v4) como skeleton funcional con 8 Solicitudes en 8 tipos del dominio Finanzas.
- **Template clonable** (`prototypes/_core-template/_core-template.html`) tiene un placeholder enriquecido con 5 categorías de ejemplos transversales (ver `inbox-placeholder-enrichment-PROMPT.md`) — sirve para elicitación previa, no es funcional.

Cuando OPS-Inbox se ejecute, valide y se considere maduro, se promueve a canónico oficial: el placeholder del template se reemplaza por un skeleton funcional completo derivado de la implementación OPS, y los demás prototipos de apps se alinean.

---

## 10. Patrón arquitectónico — Dashboard

**Naturaleza:** convención de UI más que infraestructura técnica. No requiere REQ formal — se documenta acá y se materializa como skeleton del template clonable.

### 10.1 Núcleo (siempre presente)

- **Vista consolidada del estado del área** que cubre la aplicación.
- Al menos un bloque de KPIs (mínimo 3-4 indicadores).

### 10.2 Capacidades opcionales

| Capacidad | Cuándo activarla |
|---|---|
| **Cards de KPIs clickables** (cada uno navega al módulo relevante) | Cuando hay módulos de detalle a los que se quiere dar acceso rápido |
| **Lista de alertas activas embebidas** | Cuando importa visibilizar urgencias sin entrar al módulo Alertas |
| **Próximos vencimientos** (de Reportes u otros) | Cuando hay calendario de obligaciones |
| **Actividad reciente** (timeline cronológico) | Cuando importa la trazabilidad del día a día |
| **Charts** (líneas / barras / donas) | Cuando la información es comparativa o de evolución |
| **Filtros de período** | Cuando los datos son time-series |

### 10.3 Implementación

Un Dashboard mínimo es solo los KPIs. Uno completo agrega todas las capacidades. La decisión depende de la madurez de la app y del valor real de cada componente para sus usuarios.

---

## 11. Mecanismo transversal — Acciones (Acción · Registro · Capability)

**Naturaleza:** infraestructura transversal de UI y permisos que no es un módulo del sidebar pero atraviesa **todos los módulos del dominio** del financial-core (Movimientos, Quotes, Tesorería, Bancos/Cuentas, Lotes RFQ, etc.). Hoy vive disperso en cada prototipo; pendiente formalizar como spec y servicio compartido del core.

### 11.1 Qué resuelve

En cada listado del core, los registros tienen un menú de **Acciones** (botón `⋯`) con **operaciones funcionales del dominio** (Generar Factura, Asignar Banco y Cuenta, Aceptar Quote, Imputar contablemente, Crear Nota de Débito, etc.). Estas acciones tienen tres atributos que determinan si están habilitadas y para quién:

- **Capabilities del usuario** — el rol o permiso del usuario logueado (ej: `ANALISTA_CONTABLE`, `OPS_OFFICER`, `TREASURY`, `ADMIN_FIN`).
- **Características intrínsecas del registro** — estado, categoría, tipo, fecha (ej: una factura ya emitida no se puede regenerar; un movimiento ya conciliado no se puede des-conciliar).
- **Habilitación por feature** — algunas acciones aún no están construidas y se muestran como `Bloqueado · V2` con tag visible.

Hoy esta lógica vive **inline en el JS de cada prototipo** (objeto `can` / `reason` / `tag` dentro de `togActions()`), lo cual significa que cada app la reescribe sin contrato compartido. Esto genera divergencia inevitable entre prototipos y entre prototipos y producción.

### 11.2 Modelo conceptual de la infraestructura transversal

La relación a formalizar es:

```
Acción ─── puede ejecutarse sobre ───→ Registro (de un cierto Tipo)
   │
   └── requiere ───→ Capability (uno o más Roles)
```

**Ejemplo concreto:**

| Acción | Tipo de Registro | Capabilities habilitantes | Reglas adicionales |
|---|---|---|---|
| Generar Factura | Cotización (TRD.Quotes / FIN.Operatoria) | `ANALISTA_CONTABLE`, `ADMIN_FIN` | Solo si quote en estado `EXECUTED` y sin factura previa |
| Asignar Banco y Cuenta | Movimiento (OPS.Movimientos) | `OPS_OFFICER`, `ADMIN_OPS` | Solo si tipo OUT y estado `PENDING_ASSIGNMENT` |
| Aprobar carga manual | Carga manual (FIN.Tesorería) | `ADMIN_FIN` | Solo si distinto del usuario que cargó (regla doble firma) |
| Conciliar | Movimiento (OPS.Movimientos / FIN.Operatoria) | `OPS_OFFICER`, `FINANCE` | Solo si estado `PENDING_RECONCILIATION` |

### 11.3 Componentes que la infraestructura debe proveer

1. **Catálogo declarativo de Acciones** — registro central de todas las Acciones del core, su tipo de Registro objetivo, y las Capabilities habilitantes.
2. **Motor de evaluación** — dado un registro y un usuario, evalúa qué Acciones están habilitadas (combinación de capability + reglas intrínsecas) y, cuando no lo están, devuelve el motivo legible.
3. **API consumible desde frontend** — el menú de Acciones del template UI consulta este motor y renderiza solo lo habilitado, con tooltips de motivo cuando algo está deshabilitado.
4. **Audit trail** — toda ejecución de una Acción queda registrada con usuario, registro, timestamp, parámetros — base de la trazabilidad transversal.

### 11.4 Por qué es transversal y no por módulo

Las Acciones tocan registros de varios módulos pero la lógica es la misma en todos: "¿este usuario, sobre este registro en este estado, puede ejecutar esta operación?". Centralizarlo:

- **Evita divergencia entre módulos** — todos consultan el mismo motor.
- **Permite cambios de governance sin tocar UI** — agregar una capability nueva o cambiar una regla impacta a todos los módulos al mismo tiempo.
- **Habilita reportes de governance** — quién hizo qué sobre qué (compliance, auditoría interna).
- **Es base del sistema de roles del core** — capabilities no son arbitrarias; pertenecen a un set definido por la matriz de roles transversales.

### 11.5 Estado de implementación

Infraestructura **no construida**. Hoy cada prototipo tiene su propia versión inline. Pendiente abrir REQ específico (ver §13).

**Lo que sí existe hoy** como referencia parcial: el patrón de UI del menú de Acciones está documentado en el README del template (`prototypes/_core-template/README.md` — sección "Menú de Acciones funcionales"), con clases `.abtn`, `.dtag`, función `togActions(event, idx)`, y la convención de tooltip nativo con motivo. Cuando el REQ se construya, ese patrón UI queda intacto y solo cambia su backend de evaluación (de `if` inline a llamada al motor centralizado).

---

## 12. Implementación por aplicación

### 12.1 Estado actual

| App | Dashboard | Inbox | Alertas (perfil) | Reportes |
|---|---|---|---|---|
| **LEX** | Placeholder | — | ✅ Canónico (REQ-52) · Perfil B | ✅ Canónico (REQ-54) |
| **FIN** | Activo (prototipo) | Activo (prototipo · skeleton funcional) | Activo (prototipo) · Perfil D Hybrid | Activo (prototipo) |
| **OPS** | — | Prompt canónico v1 (en disco, sin ejecutar) — futuro canónico | — | — |
| **TRD** | — | — | (REQ-33 separado, a unificar bajo REQ Alertas transversal) | — |
| **CLP** | — | — | — | — |
| **COM** | — | — | — | — |

### 12.2 Roadmap

A medida que cada aplicación entre en fase de prototipo / spec / implementación, debe replicar la arquitectura de los prototipos canónicos para los módulos genéricos correspondientes — declarando explícitamente qué capacidades activa y qué perfil(es) cubren sus tipos. Si una aplicación necesita una variación que no entra en el patrón actual, se discute primero como evolución del estándar (que se actualiza acá) antes de implementar la divergencia.

---

## 13. Trabajo transversal en horizonte — REQs pendientes

Las convenciones de este framework requieren materializarse como **infraestructura transversal del core** vía REQs en Jira. Hoy las convenciones existen y están validadas en prototipos; falta la spec formal y la construcción.

### 13.1 Inventario de REQs a tramitar

| # | REQ | Naturaleza | Scope |
|---|---|---|---|
| 1 | **REQ-59 — Reportes (existente, requiere update)** | Update | Adaptar el spec existente a las convenciones cerradas en esta sesión: criterios §8.2 (qué reportes van al módulo), modelo de dependencias inter-área §8.5, integración con Alertas vía `REPORT_DEPENDENCY` §8.6, reconocimiento explícito como uno de los 4 módulos genéricos del core. AM-1004 (development story) también queda alineada. |
| 2 | **REQ Dashboard transversal (nuevo)** | Nuevo | Infraestructura transversal del módulo Dashboard. Convención de UI (skeleton del template + capacidades opcionales del §10.2) + componentes compartidos. Dado que es más convención que infra técnica, podría tramitarse como REQ ligero. |
| 3 | **REQ Inbox transversal (nuevo)** | Nuevo | Infraestructura transversal del módulo Inbox. Cubre: nomenclatura "Solicitudes", modelo de datos canónico, set de estados (`pending` / `in_progress` / `completed`), API de ingesta de Solicitudes desde otras apps del core, motor de routing por `target_role`, capacidades de §9.3 incluyendo vista Kanban + Lista con drag & drop híbrido §9.4, modal de cierre por tipo §9.5. |
| 4 | **REQ Alertas transversal (nuevo, unifica REQ-52 LEX + REQ-33 TRD)** | Nuevo | Infraestructura transversal del módulo Alertas. Cubre el modelo núcleo + capacidades + perfiles A/B/C/D (§3 y §7). Reemplaza la fragmentación actual donde LEX y TRD tienen specs separados. Migra REQ-52 (LEX, Perfil B canónico) y REQ-33 (TRD) a este REQ unificado, manteniendo ambos como casos de implementación de la infraestructura transversal. |
| 5 | **REQ Acciones transversal (nuevo)** | Nuevo | Mecanismo transversal de Acciones (§11). Catálogo declarativo `Acción - Registro - Capability`, motor de evaluación, API consumible desde frontend, audit trail. Atraviesa todos los módulos del dominio (Movimientos, Quotes, Tesorería, etc.) — no es de un módulo en particular. |

### 13.2 Iniciativa parent

Estos 5 REQs probablemente deban agruparse bajo una iniciativa Jira común — candidata: nueva iniciativa **"Financial Core Generics"** o suma a **REQ-3** (Ardua Fintech) según prefiera el HoP al tramitarlos. Decisión a tomar al momento de crearlos en Jira.

### 13.3 Orden sugerido de tramitación

1. **REQ-59 update + AM-1004 update** primero — ya está en Sent to Dev, hay momentum, y consolidar las convenciones del framework en un REQ vivo da base concreta a los demás.
2. **REQ Inbox transversal** — la convención está madura (Kanban + Lista, transición híbrida, modal de cierre por tipo) y OPS-Inbox como primer canónico está en disco.
3. **REQ Alertas transversal** — exige decisión de arquitectura (unificación REQ-52 + REQ-33), pero el modelo conceptual (perfiles, capacidades) está cerrado.
4. **REQ Acciones transversal** — la conceptualización está en este framework (§11), falta el discovery de implementación y los detalles de scope v1.
5. **REQ Dashboard transversal** — el más ligero porque es más convención que infra. Se puede dejar para el final.

---

## 14. Reglas de divergencia

Si un caso de uso parece requerir alejarse del patrón:

1. **Documentarlo** primero en este archivo como propuesta de evolución del estándar.
2. **Validar** con el HoP si la divergencia es local (justificada por una particularidad del dominio) o si debería incorporarse al patrón general.
3. **Si es divergencia local:** documentarla en el discovery de la aplicación, con justificación técnica/funcional explícita.
4. **Si es evolución del patrón:** actualizar este archivo y los prototipos canónicos antes de implementar.

**Nunca** divergir silenciosamente. La consistencia transversal del financial-core es un activo de producto que cuesta caro recuperar si se pierde.

---

## 15. Referencias

### 15.1 Prototipos canónicos y de referencia

- **Prototipo canónico de Alertas:** `/Users/yasmani/Products/agents/prototypes/lex/lex_alertas_prototype.html`
- **Prototipo canónico de Reportes:** `/Users/yasmani/Products/agents/prototypes/lex/lex_reporteria_prototype.html`
- **Prompt canónico de Inbox (en disco, pendiente ejecución):** `/Users/yasmani/Products/agents/prototypes/ops/ops-inbox-PROMPT.md` (v1)
- **Prototipo FIN (incluye los 4 genéricos):** `/Users/yasmani/Products/agents/prototypes/fin/fin-prototype.html` + prompt v4 en `prototypes/fin/PROMPT.md`
- **Template base UI del core:** `/Users/yasmani/Products/agents/prototypes/_core-template/_core-template.html` (v1.7+)

### 15.2 Discoveries relacionados

- **Discovery FIN:** `/Users/yasmani/Products/agents/discovery/opened/fin-discovery.md`
- **Discovery OPS:** `/Users/yasmani/Products/agents/discovery/opened/ops-discovery.md`
- **Discovery LEX-Alertas:** `/Users/yasmani/Products/agents/discovery/opened/lex-alertas-discovery.md`

### 15.3 REQs activos

- **REQ-52** — LEX: Centro de Alertas (Perfil B · Workflow). A migrar bajo REQ Alertas transversal (§13.1).
- **REQ-54** — LEX: Centro de Reportería Regulatoria y Operativa.
- **REQ-33** — TRD: Módulo de Alertas. A migrar bajo REQ Alertas transversal (§13.1).
- **REQ-59** — Reportería — Infraestructura Transversal del Core. Requiere update (§13.1).
- **AM-1004** — development story de REQ-59. Requiere update también.

---

## Changelog

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | 27/04/2026 | Versión inicial. Define los 4 módulos genéricos del financial-core: Dashboard, Inbox, Alertas, Reportes. Establece prototipos canónicos en LEX. Documenta convención de ubicación contextual en sidebar (no bloque "General"). |
| 1.1 | 27/04/2026 | Reescritura mayor para incorporar el modelo "núcleo + capacidades opcionales": cada genérico se define como un kernel obligatorio + capacidades que cada app activa según necesidad. Nueva §3 con el modelo y los 4 perfiles típicos (A·Notification-only / B·Workflow / C·Auto-system / D·Hybrid) — el perfil se declara por tipo de alerta, no por aplicación. Reescritura de §7 (Alertas) y §8 (Reportes) bajo esta lente. Nuevas §9 (Inbox) y §10 (Dashboard) con núcleo + capacidades. Incorporación en §8 de los conceptos pendientes: criterios para distinguir reportes simples de centralizados (§8.2), modelo de dependencias inter-área (§8.5), integración Reportes↔Alertas vía tipo `REPORT_DEPENDENCY` con perfil Auto-system (§8.6). Tabla de §11 ampliada con columna de perfil declarado. Nuevas referencias a REQ-59 y REQ-33. |
| **1.2** | **27/04/2026** | **Cambios mayores derivados de la sesión de definición de prototipos del financial-core: (a) §6 reescrita — los 4 genéricos van al tope del sidebar al mismo nivel sin agruparlos bajo `<div class="sb-section">`; los bloques se reservan para módulos del dominio. Convención cerrada para todas las apps del core sin excepción. (b) §9 (Inbox) reescrita y enriquecida: nueva §9.0 con la nomenclatura normalizada "Solicitudes" (lo que se gestiona en el módulo no son "items" ni "tareas"), nueva §9.2 con set canónico de estados específico de Inbox (`pending` / `in_progress` / `completed`, distinto al de Alertas), nueva §9.4 con drag & drop híbrido entre columnas Kanban, nueva §9.5 con modal de cierre por radio buttons que varían por tipo. (c) §9.7 actualizada con estado real de implementación: OPS-Inbox será el primer canónico (prompt v1 en disco), FIN-Inbox como skeleton funcional en su prototipo, template con placeholder enriquecido. (d) Nueva §11 "Mecanismo transversal — Acciones (Acción · Registro · Capability)": documenta el patrón de menú de Acciones con habilitación por capability del usuario + reglas intrínsecas del registro, hoy disperso en cada prototipo, pendiente formalizar como infra transversal. (e) Nueva §13 "Trabajo transversal en horizonte — REQs pendientes" con inventario de los 5 REQs que materializan estas convenciones: update REQ-59 + Reportes ya tramitado, REQ Dashboard transversal nuevo, REQ Inbox transversal nuevo, REQ Alertas transversal nuevo (unifica REQ-52 LEX + REQ-33 TRD), REQ Acciones transversal nuevo. (f) Tabla §12.1 actualizada con FIN.Inbox activo, OPS.Inbox con prompt canónico en disco. (g) §15 referencias actualizadas (renumerada). Renumeración de secciones afectadas: la §11 anterior pasa a §12, la §12 anterior pasa a §14, la §13 anterior pasa a §15.** |
| **1.2.1** | **27/04/2026** | **Patch derivado de la auditoría del prototipo FIN regenerado con prompt v4: (a) §9.0 reescrita para reforzar que "Solicitudes" es denominación universal y vinculante para todas las apps del core (no nomenclatura local de FIN/OPS), aplicable a UI, modelos de datos, specs Jira y conversaciones con stakeholders sin excepción.** |
