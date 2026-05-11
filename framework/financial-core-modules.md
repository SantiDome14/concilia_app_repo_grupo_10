# Módulos Genéricos del Financial-Core

> **Versión:** 1.3 · **Última actualización:** 06/05/2026
> **Estado:** Convención formal · vinculante para todos los prototipos del core
> **Owner:** Head of Product

Parte del Framework Operativo de Producto de Ardua. Define los módulos transversales que aparecen en todas las aplicaciones del financial-core, su arquitectura común, y las reglas de implementación.

> **Cambio estructural en v1.3 — fuente de verdad:** los prototipos `prototypes/_core-template-frontend/` y `prototypes/fin/` se consolidaron como fuente de verdad del paradigma. Las divergencias entre el framework conceptual y los specs OpenSpec del prototipo se reconciliaron a favor de los prototipos. La taxonomía de perfiles de Alertas, el set de estados de Inbox, los sub-tabs de Reportes y los Module Types (A vs B) se re-baselizan acá. Detalle completo en el Changelog.

> **Decisión de portfolio (06/05/2026):** se descontinúa el desarrollo de **COM** (Comercial) como app del financial-core. La función comercial se cubre vía integración con **HubSpot**. Toda referencia residual a COM en este documento queda eliminada.

---

## 1. Contexto

El financial-core de Ardua se compone de aplicaciones que cubren cada vertical funcional del negocio:

| Aplicación | Foco                                                        | Color brand             |
| ---------- | ----------------------------------------------------------- | ----------------------- |
| **OPS**    | Operaciones — ejecución de movimientos de clientes          | Rojo (`0 84% 60%`)      |
| **TRD**    | Trading — mesa, lotes de liquidez, RFQ Gateway              | Azul (`217 91% 60%`)    |
| **LEX**    | Legal & Compliance — KYC, blacklist, ROS                    | Teal (`172 66% 50%`)    |
| **CLP**    | Client Portal — interfaz del cliente                        | Púrpura (`258 90% 74%`) |
| **FIN**    | Finanzas y Contabilidad — Tesorería, Contabilidad, Reportes | Verde (`142 71% 45%`)   |

La función comercial (CRM, pipeline, leads, referenciadores) se cubre vía integración con HubSpot — no se construye como app del core.

Cada aplicación tiene módulos específicos de su dominio (`Tesorería` en FIN, `Blacklist` en LEX, `RFQ` en TRD, etc.). Pero existen **patrones funcionales** que se repiten en todas — en lugar de implementarlos de forma aislada en cada app, se centralizan como **módulos genéricos del financial-core**.

---

## 2. Los 4 módulos genéricos + 2 funcionalidades transversales

Hay seis piezas de infraestructura transversal que componen el paradigma de las apps del core:

**Módulos genéricos (4)** — secciones del sidebar presentes en toda app:

| Módulo        | Propósito                                                                                                                                                                           | Type                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **Dashboard** | Vista consolidada del estado del área que cubre la aplicación. Card-grid con KPIs, counters de los 3 list-shaped genéricos, activity widgets, evolution chart placeholder.          | Especial (no L1/L2/L3)   |
| **Inbox**     | Bandeja de Solicitudes — registros con owner y lifecycle que requieren decisión humana. Recibe Solicitudes originadas en otras apps del core, en usuarios internos o en el sistema. | A                        |
| **Alertas**   | Eventos detectados por el sistema que requieren atención humana o auto-resolución. La UI concreta depende del perfil declarado por cada tipo (A/B/C/D).                             | A o B según el perfil    |
| **Reportes**  | Catálogo de reportes consolidados + ejecuciones (runs). Doble ownership: definición (área) vs generación (Tecnología). Soporta CRON, generación manual, dependencias inter-área.    | B (Catálogo + Ejecución) |

**Funcionalidades transversales (2)** — capacidades que atraviesan a los módulos:

| Funcionalidad                  | Propósito                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vistas + Ejes**              | Tres vistas declarables por módulo (Lista / Tarjetas / Tablero). El Tablero es state-driven (N columnas = N estados) con drag-drop que abre el `<ClosureModal>` en transiciones a estado terminal. Los **Ejes** son el campo que determina las columnas del Tablero (estado, prioridad, tipo, etc.) y son redefinibles por el usuario. |
| **Acciones (manifest engine)** | Catálogo declarativo `Acción × Registro × Capability` con motor de evaluación. El menú `⋯` de cada registro y los CTAs de header se renderizan a partir de manifests por módulo, no de código inline.                                                                                                                                  |

Estos seis ítems comparten **nombre, posición funcional, modelo de datos base, vocabulario del producto e interfaz visual del núcleo**. Lo que cambia entre aplicaciones es **el dataset, los tipos específicos del dominio y las capacidades opcionales que cada app activa** (ver §3).

**Modelo de provisión:** el contrato transversal (engine, tipos canónicos, componentes compartidos, APIs) lo entrega Tecnología vía los REQs transversales del §13. Cada app del core configura ese estándar con sus propios `ALERT_TYPE`, `Solicitud.type`, registros de catálogo de reportes, manifests de acciones y cards de Dashboard — vía REQs por área que se construyen sobre el transversal.

---

## 3. Modelo de núcleo + capacidades opcionales

Cada módulo genérico se compone de dos capas:

**Núcleo:** lo que define al módulo. Es obligatorio en cualquier implementación. Si una app implementa Alertas pero no tiene listado activo de alertas, no es Alertas — es otra cosa.

**Capacidades opcionales:** funcionalidades que cada app activa según su realidad operativa. Una alerta de compliance que termina en un ROS necesita workflow auditable con asignación, timeline y cierre justificado; una alerta de "el saldo bajó del piso operativo" puede ser solo un aviso que se marca como atendido. Forzar el mismo flujo en ambos casos es overkill en un lado e insuficiente en el otro.

Este modelo da **flexibilidad sin sacrificar consistencia**: el nombre, la posición en el sidebar, el modelo de datos base, los componentes UI del núcleo y el vocabulario del producto se mantienen idénticos en todas las apps; lo que varía es qué capacidades opcionales activa cada implementación.

### 3.1 Cómo se declara

Para Inbox, Reportes y Dashboard, las capacidades se activan **a nivel del módulo de la app** (FIN.Reportes activa "dependencias inter-área"; LEX.Reportes no la necesita).

Para Alertas, las capacidades se activan **a nivel de tipo de alerta**. Una misma app puede tener tipos con perfiles distintos — por ejemplo, en FIN coexisten alertas de tipo workflow (perfil B), alertas de notificación-only (perfil A) y alertas time-series con chart (perfil C). **Una app no es de un perfil; sus tipos lo son.**

### 3.2 Perfiles de Alertas (taxonomía canónica)

> **Cambio en v1.3:** la taxonomía A/B/C/D se reconcilió con el spec `core-modulo-genericos` del prototipo. La definición previa de C como "Auto-system" y D como "Hybrid" queda **deprecada**. Hybrid se reformula como composición: una app que coexiste con tipos de perfiles distintos no tiene perfil propio — **declara cada `ALERT_TYPE` con su perfil correspondiente**. Esto es ortogonal a la app.

| Perfil | Nombre                  | UI canónica                                                                                                                                                                                    | Caso de uso típico                                                                                                                      |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **A**  | Active triage list      | Listado tipo Inbox sin owner / SLA. Acción "marcar como atendida" en un click. Sin Drawer ni Tablero por default.                                                                              | Avisos sin proceso. `REPORT_DEPENDENCY` y similares: el sistema crea, el área cierra (o cierra solo cuando la dependencia se resuelve). |
| **B**  | Workflow                | Master-detail: Drawer + Timeline + Comentarios. Tablero disponible. Transiciones a estado terminal van por `<ClosureModal>` con justificación obligatoria ≥ 10 chars.                          | Casos que requieren análisis humano y registro auditable. ROS, KYC, blacklist matches, alertas de compliance.                           |
| **C**  | Time-series con chart   | Surface chart-first. La alerta se deriva de una métrica que cruza un umbral. Resolución automática cuando la métrica vuelve dentro del rango. La lista aparece como panel secundario compacto. | Anomalías de saldo, deviation de spreads, métricas de salud operativa.                                                                  |
| **D**  | Cross-app KPI dashboard | Dashboard consolidado con KPIs por app de origen y filtros cross-app. No es lista accionable — es orientación read-only.                                                                       | Utilización diaria de límites cross-app (CLP/OPS/FIN), volúmenes consolidados de operación.                                             |

**Mezclar perfiles en un mismo `ALERT_TYPE` es violación de contrato.** Cada tipo declara exactamente uno.

### 3.3 Implicación para el implementador

Cuando una app prototipa o implementa un módulo genérico, su discovery debe declarar:

1. **Qué capacidades opcionales activa** (con justificación si declina alguna del perfil canónico).
2. **Qué perfil cubre cada tipo de alerta** (en el caso de Alertas).
3. **Qué estados aplican** dado el perfil declarado (Inbox tiene un set propio, distinto al de Alertas — ver §7.5 y §9.2).

El template clonable implementa el perfil más completo (Workflow para Alertas, Reportes con todas las capacidades). Al clonar, cada app desactiva o simplifica las capacidades que no necesita — es más fácil quitar que agregar.

---

## 4. Por qué son genéricos

Tres motivos para centralizar estos patrones:

**1. Coherencia transversal.** Un usuario que opera en múltiples aplicaciones (un HoP, un compliance officer, un treasurer) encuentra siempre la misma estructura: el Inbox de OPS funciona como el Inbox de FIN, las Alertas de LEX se gestionan igual que las de FIN. Reduce carga cognitiva y acelera el onboarding.

**2. Eficiencia de desarrollo.** Tecnología construye una vez la infraestructura subyacente (manifest engine de Acciones, motor de Vistas + Ejes, motor de routing de Solicitudes, motor de evaluación de dependencias de Reportes, motor de auto-cierre de Alertas) y las aplicaciones la consumen como servicio. Sumar un nuevo tipo de alerta o un nuevo reporte es alta + función de generación, sin refactor del módulo.

**3. Consistencia funcional del producto.** Decisiones de diseño que ya se validaron en una aplicación (ej: el flujo de asignación → revisión → cierre con comentario obligatorio en LEX Alertas) se heredan automáticamente en las demás. Esto evita re-discutir los mismos problemas en cada aplicación nueva.

---

## 5. Module Types — Type A vs Type B

> **Sección nueva en v1.3.** Formaliza el contrato `core-module-types` del prototipo. Los módulos del financial-core caen en uno de dos types según el job principal del usuario en la página.

### 5.1 Type A — Direct record management

**Job:** browse, filter, act on a single record set.

**Layout:** L1/L2/L3 sobre un único record set.

- **L1** — título + actions area (un `<ViewToggle>` opcional para Lista/Tarjetas/Tablero + Main CTA).
- **L2** — KPI strip computado sobre los registros visibles.
- **L3** — section header (search + granular filters) + data surface.

**Reglas:**

- Una sola data model lógica por página. Componer dos record sets no relacionados es violación.
- No hay `<Segmenter>` para segmentation sobre el record set — los filtros granulares de L3 son el único mecanismo de narrowing. Los sub-tabs `Nuevas + Histórico` o `Activos + Histórico` que existían en versiones previas del framework **están deprecados**.
- El detail surface por registro es un modal centrado o el side `<Drawer>`, según el `meta.detail` del record type. Workflow-driven (Solicitudes, Alertas perfil B) usan Drawer.

**Ejemplos en el core:** Inbox, Alertas (perfiles A y B), Movimientos (OPS / FIN), Cotizaciones (TRD / FIN), Tesorería › Cola de Asignación.

### 5.2 Type B — Summary-first con record-feeding sub-tabs

**Job:** ver primero el estado / disponibilidad / situación; recién después drill into los registros que produjeron esos valores.

**Layout:**

- **Page header** — título + Main CTA persistente sobre el módulo como un todo. El CTA permanece en la fila del título sin importar qué sub-tab esté activo.
- **`<Segmenter>`** debajo del page header con dos o más **functional sub-tabs**: el primero es el summary sub-tab; los demás son record-feeding sub-tabs — cada uno con su propia data model y lifecycle.
- **Summary sub-tab** — combina KPI cards (computadas cross data models) con uno o más non-list renderings (tree expandible, chart con overlays, widget cards). NO es una L1/L2/L3 record table — su job es resumir, no listar.
- **Record-feeding sub-tabs** — cada uno típicamente Type-A-shaped: KPIs sobre sus registros, search + filters, data surface, paginación.

**Reglas:**

- Los sub-tabs son data models independientes con lifecycles independientes. NO son segmentation sobre un único record set.
- Un sub-tab option PUEDE mostrar un count chip (ej: longitud de una cola pendiente) cuando el conteo es operativamente significativo.
- Mezclar Type A y Type B en una sola página (un L1/L2/L3 con un summary banner pinned arriba) es violación de contrato — split en dos páginas.

**Ejemplos en el core:** Reportes (Catálogo + Ejecución), Tesorería (Disponibilidad + sub-tabs por data model).

### 5.3 Heurística de decisión

Aplicar en este orden, primer match gana:

1. ¿La tarea principal del usuario es browse, filter, act sobre un único record set? → **Type A**.
2. ¿El usuario primero ve el estado / disponibilidad / situación resumida y solo después drill into los registros que produjeron esos valores? → **Type B**.

Mezclar ambos patrones en una misma página es contract violation. Cuando un dominio necesita ambas funciones, split en dos páginas.

---

## 6. Vistas + Ejes (funcionalidad transversal)

> **Sección nueva en v1.3.** Formaliza el contrato de las tres vistas y los ejes del Tablero, hoy distribuido entre los specs `core-data-tables`, `core-modals` y `core-modulo-genericos` del prototipo.

### 6.1 Las tres vistas

Todo módulo Type A con vistas múltiples declara un array `views` con uno o más de los siguientes valores:

| Vista        | Cuándo activarla                                                                                                                                  | Nota                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Lista**    | Default. Adecuada para volumen alto y consulta densa de información. Tabla con columnas configurables, paginación, filtros.                       | Siempre disponible cuando el módulo expone registros.        |
| **Tarjetas** | Cuando los registros tienen información visual densa que se aprecia mejor en card (resúmenes, indicadores múltiples, fotos / iconos del dominio). | Cards grid responsive.                                       |
| **Tablero**  | Cuando hay un campo de tipo estado o flujo operativo y vale ver los registros agrupados por ese campo.                                            | Kanban state-driven — N columnas = N valores del eje activo. |

**Comportamiento:**

- Si el módulo declara solo una vista, `<ViewToggle>` no se renderiza.
- Cambiar de vista NO cambia el record set — solo cambia la representación visual del mismo set filtrado.
- Click en row (cualquier vista) abre el detail surface declarado por `meta.detail` (modal o Drawer).

**Declarar `'kanban'` sin un state machine es rechazado en dev-time.** El Tablero requiere un eje válido que defina las columnas.

### 6.2 Ejes — Tablero state-driven

El Tablero del paradigma es state-driven: las columnas se generan dinámicamente a partir del **eje activo**, que es el campo del registro que determina las columnas.

**Concepto clave:** un módulo puede declarar **múltiples ejes posibles**, y el usuario elige cuál ver. Cada eje es un campo del registro de tipo enum (estado, prioridad, tipo, sociedad, etc.). El usuario cambia de eje y el Tablero se re-renderiza con un set de columnas distinto sobre los mismos registros.

**Ejemplo — Cotizaciones (FIN):**

```
ejes: [
  { id: 'documentacion', label: 'Estado de Documentación',
    values: ['pendiente_emision', 'emitida', 'enviada', 'cobrada'] },
  { id: 'tipo_operacion', label: 'Tipo de Operación',
    values: ['SWAP', 'TRANSFER', 'COMPRA', 'VENTA'] }
]
```

El usuario por default ve el Tablero por estado de documentación; cambia el eje a "tipo de operación" y ve los mismos registros agrupados por tipo.

**Reglas:**

- El primer eje declarado es el eje default.
- El selector de eje vive en la actions area de L1, junto al `<ViewToggle>`.
- Cambiar el eje no cambia el record set ni los filtros activos.

### 6.3 Drag-drop con `<ClosureModal>`

Las transiciones entre columnas del Tablero declaran un **mode** que determina si abren un modal o son inmediatas:

| Mode    | Comportamiento                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| `free`  | Drag libre. La transición se aplica inmediatamente. Se loggea un `TimelineEvent { kind: 'state_change' }`. |
| `modal` | Drag abre el `<ClosureModal>`. La transición no se aplica hasta que el usuario completa el modal.          |

**Cuándo usar `modal`:** transiciones a estado terminal (Inbox `* → completed`, Inbox `* → rejected`, Alertas `* → resolved`, Alertas `* → dismissed`) — cualquier transición que requiera registro auditable.

**`<ClosureModal>` es shared** — el mismo componente se reusa en Inbox, Alertas y cualquier otro módulo que declare transiciones modal-mode. La justificación tiene mínimo 10 chars; en Inbox suma además radio buttons con las `closeActions` del tipo (ver §9.5).

**Cuándo usar `free`:** transiciones intermedias (`pending → in_progress`) o reversibles (`in_progress → pending`).

**Estado terminal es inmutable** — una vez en estado terminal, las cards no son draggables.

### 6.4 Coexistencia con acciones inline

Las acciones inline del menú `⋯` y los CTAs de header coexisten con el drag-drop — son la forma "rápida" de ejecutar la misma transición. La lógica de habilitación (capabilities + reglas intrínsecas del registro) la evalúa el manifest engine de Acciones (§11), no el Tablero.

---

## 7. Patrón arquitectónico — Alertas

**Prototipo canónico:** `prototypes/lex/lex_alertas_prototype.html` (perfil B · Workflow completo). Spec OpenSpec: `prototypes/_core-template-frontend/openspec/specs/core-modulo-genericos/spec.md`.

### 7.1 Núcleo (siempre presente)

Sin estos componentes, no hay módulo Alertas:

- **Listado activo de alertas** — vista principal del módulo.
- **Modelo de datos mínimo** — `id`, `type`, `profile`, `state`, `created_at`, `last_event_at`.
- **Discriminador `profile: 'A' | 'B' | 'C' | 'D'`** — declarado por cada `ALERT_TYPE` en config; activa exactamente una UI canónica.
- **Acción de resolución** — toda alerta tiene un fin de vida. El cómo se resuelve depende del perfil.
- **Tipos definidos por la app** — el dominio determina qué se alerta.

Nota — no hay sub-tabs de segmentation. El filtro Estado en L3 expone los estados simultáneamente. Default: todos visibles.

### 7.2 Capacidades opcionales

Cada `ALERT_TYPE` activa las que necesite según su perfil:

| Capacidad                                                                              | Cuándo activarla                                                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Severidad** (`critical`/`high`/`medium`/`low`)                                       | Cuando hay priorización entre alertas                                                                 |
| **Asignación a usuario** (`Asignarme`/`Asignar a...`/`Reasignar`/`Desasignar`)         | Cuando hay un dueño humano del trabajo (típico perfil B)                                              |
| **Asignación a área** (sin persona específica)                                         | Cuando es responsabilidad colectiva sin ownership individual                                          |
| **Drawer lateral con timeline**                                                        | Cuando la resolución es un proceso, no un acto (típico perfil B)                                      |
| **Comentarios en timeline**                                                            | Cuando hay colaboración entre personas en una alerta                                                  |
| **`<ClosureModal>` con justificación** (≥ 10 chars)                                    | Cuando se requiere registro auditable de la decisión (mandatorio en perfil B)                         |
| **Auto-cierre por sistema**                                                            | Cuando la condición de cierre es detectable algorítmicamente (perfil A con auto-resolution, perfil C) |
| **Filtros del histórico** (Tipo / Severidad / Responsable / Período / Sociedad / etc.) | Cuando el volumen lo justifica                                                                        |
| **KPIs en L2**                                                                         | Cuando importa visibilizar el throughput del equipo                                                   |
| **Tablero (Kanban)**                                                                   | Cuando hay flujo y vale verlo state-driven (típico perfil B)                                          |
| **Chart-first surface con thresholds overlaid**                                        | Mandatorio en perfil C                                                                                |
| **Cross-app filters**                                                                  | Mandatorio en perfil D                                                                                |

### 7.3 UI canónica por perfil

| Perfil                      | UI                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Active triage**       | Lista tipo Inbox sin owner / SLA. Resolver = un click. Sin Drawer ni Tablero por default. Toast confirmation per `core-error-handling`.                           |
| **B — Workflow**            | Drawer con Timeline + Comments al click. Tablero disponible. Transiciones `* → resolved` y `* → dismissed` van por `<ClosureModal>` con justificación ≥ 10 chars. |
| **C — Time-series**         | Página chart-first con la métrica subyacente y thresholds overlaid. Lista compacta como panel secundario. Resolución automática cuando la métrica vuelve.         |
| **D — Cross-app dashboard** | KPI cards por app de origen + cross-app filters. No hay per-row triage UI — read-only orientation.                                                                |

### 7.4 Modelo de datos

**Campos del núcleo:**

```typescript
interface Alerta {
  id: string;
  type: string;
  profile: "A" | "B" | "C" | "D";
  state: AlertState; // depende del perfil
  created_at: number;
  last_event_at: number;
  // ...campos del dominio
}
```

**Campos por capacidad activada:**

| Campo                                       | Capacidad asociada                 |
| ------------------------------------------- | ---------------------------------- |
| `severity`                                  | Severidad                          |
| `assignee_id`, `assigned_at`                | Asignación a usuario               |
| `assigned_team`                             | Asignación a área                  |
| `closed_at`, `closed_by`, `closure_comment` | `<ClosureModal>` con justificación |
| `timeline: TimelineEvent[]`                 | Drawer con timeline / Comentarios  |
| `auto_resolved_reason`                      | Auto-cierre                        |

### 7.5 Estados — set canónico

| Estado          | Significado                            | Perfiles que lo usan       |
| --------------- | -------------------------------------- | -------------------------- |
| `new`           | Alerta sin atender                     | Todos                      |
| `in_review`     | Tomada por un usuario, en proceso      | B                          |
| `resolved`      | Cerrada con acción                     | A, B                       |
| `dismissed`     | Descartada / falso positivo            | B                          |
| `auto_resolved` | Cerrada automáticamente por el sistema | A (con auto-resolution), C |

Una vez cerrada (`resolved` / `dismissed` / `auto_resolved`), la alerta es inmutable.

### 7.6 Componentes UI según capacidades

| Componente UI                                           | Requiere capacidad                             |
| ------------------------------------------------------- | ---------------------------------------------- |
| Listado activo (cards o tabla)                          | Núcleo                                         |
| `<Drawer>` lateral                                      | Drawer con timeline (perfil B)                 |
| Sección Timeline en Drawer                              | Drawer con timeline                            |
| Footer con textarea de comentarios                      | Comentarios en timeline                        |
| `<ClosureModal>` con validación                         | Cierre con justificación (perfil B mandatorio) |
| KPIs L2 (4 cards)                                       | KPIs                                           |
| Filtros portal en L3                                    | Filtros del histórico                          |
| Sistema de asignación (botones contextuales + dropdown) | Asignación                                     |
| Chart-first surface                                     | Perfil C                                       |
| Cross-app KPI cards                                     | Perfil D                                       |

---

## 8. Patrón arquitectónico — Reportes

**Prototipo canónico:** `prototypes/lex/lex_reporteria_prototype.html`. Spec OpenSpec: `prototypes/_core-template-frontend/openspec/specs/core-modulo-genericos/spec.md` (sección Reportes).

> **Cambio en v1.3:** los sub-tabs del módulo Reportes pasan de `Catálogo + Histórico` a **Catálogo + Ejecución** y se implementan vía Type B Tabs (Segmenter debajo del header, no en L1). El cambio de naming refleja que el segundo sub-tab no es un histórico pasivo — lista entidades activas (`ReportRun`) con su propio shape, columnas, filtros y acciones.

### 8.1 Principio rector — separación definición / generación

**La definición** del reporte es ownership del área de negocio (Legal, Finanzas, Operaciones, etc.). El registro en el catálogo contiene metadata completa: nombre, descripción, categoría, entidad rectora, normativa, periodicidad, formato, política de retención, parámetros, dependencias.

**La generación** es ownership de Tecnología: para cada registro del catálogo, Tecnología implementa una función de generación (query, enriquecimiento, template) invocable on-demand vía CTA o programada vía CRON.

Sumar un reporte nuevo = alta del registro + función de generación, sin refactor del módulo.

### 8.2 ¿Qué reportes van al módulo Reportes?

No todo reporte va al módulo centralizado. Cada módulo de cada app puede tener funcionalidades simples de exportación (botón "Exportar CSV" sobre una tabla, descarga de un detalle, etc.). Esos reportes simples viven dentro de su módulo y NO van a Reportes.

**Al módulo Reportes van solo los que cumplen al menos uno de:**

1. **Información consolidada** que cruza múltiples módulos o múltiples apps del core (Estado de Resultados consolidado, Conciliación Global por Banco).
2. **Procesamiento complejo** que justifica ejecución asincrónica — el usuario que solicita la generación no debe esperar bloqueado en pantalla.
3. **Coordinación inter-área** — la generación requiere que múltiples áreas completen tareas previas en sus respectivas apps/módulos antes de poder ejecutarse.

| Tipo de reporte                     | Vive en                       | Ejemplo                                                   |
| ----------------------------------- | ----------------------------- | --------------------------------------------------------- |
| Exportación CSV de listado actual   | Módulo específico             | Tabla de Movimientos → "Exportar CSV"                     |
| Resumen rápido de KPIs              | Módulo específico (Dashboard) | KPIs en tiempo real                                       |
| Reporte regulatorio formal          | Módulo Reportes               | Régimen Informativo PSP BCRA                              |
| Estado de Resultados consolidado    | Módulo Reportes               | P&L mensual del grupo                                     |
| Reporte con coordinación inter-área | Módulo Reportes               | Conciliación Global (Finanzas + Operaciones + Compliance) |

**El módulo Reportes es un mecanismo de gestión de información consolidada, no un repositorio de exportaciones.**

### 8.3 Núcleo (siempre presente)

El módulo es Type B con dos sub-tabs canónicos:

- **Catálogo** — lista entidades `Report` (templates / definiciones).
- **Ejecución** — lista entidades `ReportRun` (generaciones realizadas).

Núcleo:

- **Catálogo de reportes** con metadata mínima por registro (nombre, descripción, categoría, periodicidad, formato).
- **Endpoint de generación** invocable desde CTA del Catálogo.
- **Persistencia del histórico de runs** con metadata (trigger, requested_at, completed_at, status, params, output_url).
- **Acción de descarga** sobre el archivo generado.

**Reglas de Type B Tabs:**

- El `<Segmenter>` con las dos opciones va debajo del page header, no en L1.
- Default sub-tab: `catalogo`.
- Cada sub-tab tiene **shape, columnas, filtros y acciones independientes** — no se comparten. La nomenclatura "Histórico" no aparece en ningún lado.

### 8.4 Capacidades opcionales

| Capacidad                                                    | Cuándo activarla                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| **Edición de metadata por usuario** (modal)                  | Cuando el área puede ajustar definición sin pasar por Producto |
| **CRON activable por usuario**                               | Cuando hay reportes programables y el área los gestiona        |
| **Dependencias inter-área** (ver §8.5)                       | Cuando algún reporte requiere coordinación con otras apps      |
| **Validación previa antes de generar**                       | Cuando hay parámetros complejos o pre-condiciones              |
| **Modal de detalle por reporte**                             | Cuando importa la trazabilidad histórica por reporte           |
| **Filtros de Ejecución** (Trigger / Estado / Período)        | Cuando el volumen lo justifica                                 |
| **Filtros de Catálogo** (Categoría / Periodicidad / Formato) | Cuando el catálogo crece                                       |
| **Reportes bloqueados visibles** (`.locked`)                 | Cuando importa visibilizar el roadmap                          |

### 8.5 Dependencias inter-área para la generación

Un reporte centralizado puede declarar **dependencies** — tareas que deben ejecutarse en otras apps/módulos antes de poder generarse.

**Modelo extendido del registro de catálogo:**

```typescript
interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  periodicity?: string;
  format?: string;
  params?: Record<string, unknown>;
  dependencies?: ReportDependency[];
  cron_enabled?: boolean;
  cron_active?: boolean;
  locked?: boolean;
  locked_reason?: string;
}

interface ReportDependency {
  blocking_app: string; // 'OPS' / 'FIN' / 'LEX' / ...
  blocking_module: string; // 'movements' / 'tesoreria' / ...
  blocking_state: string; // 'reconciled' / 'closed' / ...
  sla_days_before?: number; // anticipación al vencimiento del reporte
  completed: boolean;
}
```

**Estado del reporte considerando dependencias:**

- `Listo para generar` → todas las dependencias `completed: true` → CTA Generar habilitado.
- `Pendiente · 2/3 dependencias` → CTA Generar deshabilitado, tag visible con detalle.
- `Bloqueado` → alguna dependencia con vencimiento crítico no cumplida → alerta visual roja.

### 8.6 Integración con el módulo Alertas — `REPORT_DEPENDENCY`

Reportes y Alertas se integran como mecanismo de coordinación inter-aplicación.

**Flujo:** cuando el usuario clickea Generar y hay dependencias `completed: false`, el motor emite un evento `REPORT_DEPENDENCY` a la app indicada por `blocking_app`. La app destino consume el evento en su módulo Alertas y crea una `Alerta` con `type: 'report_dependency'` y `profile: 'A'`. Cuando la source completa la dependencia, la Alerta auto-cierra como `auto_resolved`.

**Cambio importante en v1.3:** en versiones previas se documentó el `REPORT_DEPENDENCY` como perfil C (Auto-system). En el contrato actual del prototipo, el perfil correcto es **A** — la lista del área responsable es triage activo (un click para revisar, navegación al módulo bloqueador), pero el cierre puede ser auto cuando la source completa la dependencia.

**Modelo del evento:**

```typescript
interface ReportDependencyEvent {
  report_id: string;
  blocking_app: string;
  blocking_module: string;
  blocking_state: string;
  sla_days_before?: number;
  emitted_at: number;
}
```

**Modelo de la Alerta consumiendo el evento:**

```typescript
{
  type: 'report_dependency',
  profile: 'A',
  state: 'new' | 'auto_resolved',
  payload: {
    report_id: 'rpt-monthly-tax',
    blocking_module: 'movements',
    blocking_state: 'reconciled',
    // ...
  }
}
```

**Loop completo de los 4 módulos genéricos:**

Reportes detecta el bloqueo → Alertas notifica al área responsable → Inbox la recibe (cuando aplica) → el área completa la tarea en su módulo específico → Alertas se cierra automáticamente como `auto_resolved` con `closure_comment: 'auto-closed by source-app completion'` → Reportes pasa a "Listo para generar" → Dashboard del solicitante refleja el cambio.

Este es el motivo por el que los 4 módulos genéricos **deben coexistir en cada app del financial-core**: ninguno funciona aislado, son piezas de un mismo mecanismo de coordinación.

### 8.7 `ReportRun` — modelo del sub-tab Ejecución

```typescript
interface ReportRun {
  id: string;
  report_id: string;
  requested_at: number;
  completed_at?: number;
  status: "ok" | "error" | "pending";
  params: string;
  trigger:
    | { type: "cron" }
    | { type: "manual"; user_id: string }
    | { type: "system" };
  output_url?: string;
  error_message?: string;
}
```

Acciones canónicas: `Descargar` (cuando `output_url` está presente), `Reintentar` (cuando `status === 'error'`).

### 8.8 Componentes UI según capacidades

| Componente UI                                | Requiere capacidad           |
| -------------------------------------------- | ---------------------------- |
| Catálogo (cards agrupados por categoría)     | Núcleo                       |
| Ejecución (tabla con runs)                   | Núcleo                       |
| Modal Editar metadata                        | Edición de metadata          |
| Modal Configurar CRON                        | CRON activable               |
| Modal Generar con parámetros                 | Núcleo                       |
| Modal Detalle del reporte                    | Modal de detalle             |
| Indicador de dependencias pendientes en card | Dependencias inter-área      |
| Filtros portal en cada sub-tab               | Filtros                      |
| Cards `.locked` con tag de bloqueo           | Reportes bloqueados visibles |

### 8.9 Categorías

Cada aplicación define sus categorías. Recomendación: 3-5 categorías que capturen la naturaleza del consumo (Regulatorio / Interno / Operativo / Contable / Financiero).

### 8.10 Reportes bloqueados

Reportes que dependen de un módulo o feature aún no implementado se muestran en el catálogo con clase `.locked`: opacidad reducida, sin botón Generar, con tag visible explicando el bloqueo (ej: `Bloqueado · requiere FIN.Contabilidad`). Da visibilidad temprana del scope futuro sin venderlos como disponibles.

---

## 9. Patrón arquitectónico — Inbox

**Prototipos:** Inbox de FIN (`prototypes/fin/src/pages/Inbox.vue`) ya implementado como skeleton funcional. OPS-Inbox como prompt canónico v1 en `prototypes/ops/ops-inbox-PROMPT.md`. Spec OpenSpec: `prototypes/_core-template-frontend/openspec/specs/core-modulo-genericos/spec.md` (sección Inbox).

### 9.1 Nomenclatura — "Solicitudes" (denominación universal)

**"Solicitudes" es la denominación universal y normalizada de todos los registros que se gestionan en el módulo Inbox del financial-core**, independientemente de la app (OPS, FIN, LEX, TRD, CLP) y del tipo específico.

Una Solicitud puede originarse en distintas fuentes (otra app del core, un usuario interno, el sistema), tener distintos tipos (withdrawal, aprobación de carga manual, matching de depósito, RFQ, dependencia de reporte, etc.) y distintas acciones de cierre — pero el **vocabulario para nombrar la entidad es siempre el mismo**: Solicitud (singular) / Solicitudes (plural).

Aplica a:

- Documentación funcional (discoveries, feature specs, este framework).
- **Copy de UI** (labels, placeholders, mensajes vacíos, breadcrumbs internos, tooltips, contadores). Ej: "Tenés 8 Solicitudes pendientes en Inbox" — NO "8 items pendientes", NO "8 tareas", NO "8 pendientes".
- Modelos de datos (entidad principal: `Solicitud`).
- Conversaciones con stakeholders.
- Specs Jira y comunicación con Tecnología.

**Identifier canónico de TypeScript:** `Solicitud` (importado desde `src/types/genericos.ts`). Las apps **no redefinen** la interfaz — extienden vía `interface OpsX extends Solicitud { ... }` o vía generics `Solicitud<T>` cuando el shape varía por tipo. Esta es regla de contrato del spec `core-modulo-genericos`, no convención.

### 9.2 Modelo de datos canónico

```typescript
interface Solicitud {
  id: string;
  type: string; // 'withdrawal' | 'matching_deposit' | 'manual_load_approval' | ...
  source_app: string; // 'CLP' | 'OPS' | 'FIN' | ...
  source_module: string; // 'withdrawals' | 'movements' | ...
  owner: string | null; // user_id o null
  sla_hours: number | null;
  state: SolicitudState; // ver §9.3
  timeline: TimelineEvent[];
  comments: Comment[];
  closure_comment?: string;
  // ...campos del dominio (vía extensión o payload genérico)
}

type SolicitudState = "pendiente" | "en_proceso" | "completed" | "rejected";
```

### 9.3 Estados — set canónico de Inbox

> **Cambio en v1.3:** Inbox pasa de 3 a 4 estados. La versión previa (`pending` / `in_progress` / `completed`) no incluía un estado terminal de rechazo, lo que forzaba a cierres bajo `completed` con `closeAction: 'rejected'`. El contrato actual del spec separa los dos estados terminales — `completed` y `rejected` — para reflejar el outcome de la decisión en el estado mismo.

| Columna Kanban  | Estado interno | Significado                                                       | Terminal |
| --------------- | -------------- | ----------------------------------------------------------------- | -------- |
| **To Do**       | `pendiente`    | Solicitud recibida, sin tomar                                     | No       |
| **In Progress** | `en_proceso`   | Tomada por alguien y siendo trabajada                             | No       |
| **Done**        | `completed`    | Atendida con outcome positivo (aprobada / procesada / confirmada) | Sí       |
| **Rejected**    | `rejected`     | Atendida con outcome negativo (rechazada / cancelada)             | Sí       |

Estados terminales (`completed` / `rejected`) son inmutables. Una Solicitud cerrada no se reabre.

**Override del vocabulario:** una app puede declarar su propio set de estados (ej: `received` / `reviewing` / `approved` / `denied`) siempre que al menos un estado esté marcado `terminal: true`. La regla del `<ClosureModal>` para transiciones a terminal aplica independientemente del vocabulario.

### 9.4 Capacidades opcionales

| Capacidad                                                                      | Cuándo activarla                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Acciones inline** (Aprobar / Rechazar / Tomar)                               | Cuando la decisión se toma desde el Inbox sin saltar a otro módulo |
| **Routing a un rol específico** (`target_role`)                                | Cuando hay roles definidos en la app                               |
| **Asignación a usuario** (Tomar / Asignar a... / Reasignar / Devolver a To Do) | Cuando hay un dueño humano del trabajo                             |
| **Drawer lateral con timeline**                                                | Cuando atender una Solicitud es un proceso, no un acto             |
| **Comentarios en timeline**                                                    | Cuando hay colaboración entre personas en una misma Solicitud      |
| **`<ClosureModal>` con justificación + closeActions**                          | Mandatorio en transiciones a estado terminal                       |
| **SLA visual**                                                                 | Cuando las Solicitudes vencen y vale señalarlo                     |
| **Vista Kanban**                                                               | Cuando importa la visión de flujo (default recomendado)            |
| **Vista Lista**                                                                | Cuando importa el manejo de volumen alto                           |
| **Vista Tarjetas**                                                             | Cuando los datos se entienden mejor en card                        |
| **Drag & drop con `<ClosureModal>` en transiciones a terminal**                | Solo cuando hay vista Kanban                                       |
| **Auto-archive**                                                               | Cuando las Solicitudes cierran solas al cumplirse una condición    |
| **Agrupación por tipo / origen**                                               | Cuando el volumen lo justifica                                     |
| **Notificación push externa** (email / Slack)                                  | Cuando se requiere alcance fuera de la app                         |

### 9.5 Drag & drop con `<ClosureModal>` (vista Kanban)

> **Patch en v1.3:** la mecánica de drag-drop se generaliza vía el contrato de Vistas + Ejes (§6.3) y se reusa el `<ClosureModal>` shared. Se mantienen las reglas de transición específicas de Inbox.

**Reglas de transición** entre columnas:

| Transición                        | Mode      | Comportamiento                                                                                |
| --------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `pendiente → en_proceso`          | `free`    | Drag libre con auto-asignación al usuario actual + `TimelineEvent { kind: 'state_change' }`   |
| `en_proceso → completed`          | `modal`   | Abre `<ClosureModal>` con radio buttons de `closeActions` + comentario obligatorio ≥ 10 chars |
| `en_proceso → rejected`           | `modal`   | Idem, con `closeActions` filtrados a opciones de rechazo                                      |
| `pendiente → completed` (directo) | `modal`   | Permitido. Auto-asigna al usuario actual + abre `<ClosureModal>`                              |
| `pendiente → rejected` (directo)  | `modal`   | Idem                                                                                          |
| `en_proceso → pendiente`          | `free`    | Drag libre con desasignación + toast                                                          |
| `completed → *` / `rejected → *`  | bloqueado | Las cards en estados terminales no son draggables                                             |
| Drop en la misma columna          | no-op     | —                                                                                             |

Las acciones inline (CTAs en cada card) coexisten con el drag — son la forma "rápida" de la misma transición. Implementación nativa con HTML5 Drag and Drop API.

### 9.6 `<ClosureModal>` — radio buttons por tipo

A diferencia de Alertas (donde el cierre es "Marcar como revisada / Descartar" + justificación), en Inbox las **acciones de cierre dependen del tipo de la Solicitud**. El modal renderiza radio buttons con las opciones válidas para ese tipo, más un comentario obligatorio.

Ejemplos:

| Tipo de Solicitud                      | `closeActions`                                      |
| -------------------------------------- | --------------------------------------------------- |
| Solicitud de withdrawal                | Aprobar y procesar / Rechazar                       |
| Aprobación de carga manual             | Aprobar / Rechazar                                  |
| Solicitud de matching de depósito      | Confirmar matching / Asignar manualmente / Rechazar |
| RFQ del cliente                        | Tomar (= ejecutar) / Reasignar a otro trader        |
| Pedido de imputación retroactiva       | Confirmar imputación / Rechazar                     |
| Notificación de dependencia inter-área | Confirmar tarea completada                          |

Cada tipo declara su set en config (`INBOX_TYPES[type].closeActions`). El comentario es obligatorio para todas las opciones — provee auditoría de la decisión.

### 9.7 Tipos de Solicitudes previstos (transversal)

A medida que las apps maduran, los tipos típicos son:

- Solicitudes de cliente desde CLP (withdrawal, swap, RFQ).
- Aprobaciones de doble firma originadas en otro módulo (carga manual, asiento manual).
- Pedidos humanos inter-área (imputación retroactiva, generación ad-hoc de reporte).
- Notificaciones del sistema con acción (depósito a identificar, dependencia de reporte centralizado).
- Tareas planificadas con SLA.

Los tipos concretos los define cada app en su discovery / REQ por área.

---

## 10. Patrón arquitectónico — Dashboard

> **Cambio mayor en v1.3:** Dashboard NO es L1/L2/L3. Es un card-grid responsive cuyo job es orientación, no operación. Esta convención se cierra acá y se materializa como skeleton del template clonable. Los REQs por área declaran qué cards específicas pueblan el grid de su Dashboard.

**Spec OpenSpec:** `prototypes/_core-template-frontend/openspec/specs/core-modulo-genericos/spec.md` (sección Dashboard).

### 10.1 Núcleo (siempre presente)

- **Card-grid responsive** — CSS-grid o flex auto-fit con cards como elemento primario. NO L1/L2/L3.
- **Counters de los 3 list-shaped genéricos**:
  - Inbox · N Solicitudes activas
  - Alertas · N críticas
  - Reportes · N pendientes (unfulfilled dependencies / pending runs)
  - Cada card es clickable y navega al módulo.
- **KPIs de los módulos de dominio activos** — cada KPI clickable, navega al módulo relevante.
- **Una o más activity surfaces** — cualquiera de:
  - Single timeline "Actividad reciente" cross-modules.
  - Per-module activity widgets ("Alertas activas", "Próximos vencimientos").
  - Combinación.

### 10.2 Capacidades opcionales

| Capacidad                                                       | Cuándo activarla                                                                                            |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Period selector** (Últimos 7 / 30 / 90 días) pinned top-right | Cuando hay KPIs time-based que vale recomputar por rango                                                    |
| **Evolution chart placeholder card** (2/3-width)                | Cuando la app tiene una métrica clave de evolución que mostrar; cada app la rellena con su chart específico |
| **Activity widget "Alertas activas"**                           | Cuando importa visibilizar urgencias sin entrar al módulo Alertas                                           |
| **Activity widget "Próximos vencimientos"**                     | Cuando hay calendario de obligaciones (típicamente reportes)                                                |

### 10.3 Reglas (prohibiciones explícitas)

El Dashboard es read-only orientation. Estas convenciones son contract violations:

- **NO carga operaciones de dominio.** Si una funcionalidad requiere una acción sobre un registro, va en el módulo del dominio, no en Dashboard.
- **NO filtros sobre listas.** Un filterable list pertenece al módulo que owns la data.
- **NO sub-tabs / Segmenter / multi-segment navigation.** Eso es Type B.
- **El period selector NO es Segmenter.** No re-segmenta listas — solo recomputa KPIs time-based del mismo Dashboard.

### 10.4 Implementación

Un Dashboard mínimo es: counters de los 3 genéricos + KPIs de módulos de dominio activos. Uno completo agrega period selector + evolution chart + activity widgets. La decisión depende de la madurez de la app y del valor real de cada componente para sus usuarios.

---

## 11. Mecanismo transversal — Acciones (manifest engine)

**Naturaleza:** infraestructura transversal de UI y permisos que atraviesa **todos los módulos del dominio** del financial-core (Movimientos, Quotes, Tesorería, Bancos/Cuentas, Lotes RFQ, Inbox, Alertas, Catálogo de Reportes, etc.).

> **Patch en v1.3:** la sección renombra el mecanismo a "manifest engine" para alinear con el spec OpenSpec `core-actions-manifest` y los manifests por módulo (`src/manifests/<app>.<module>.actions.ts`) ya implementados en el prototipo de FIN.

### 11.1 Qué resuelve

En cada listado del core, los registros tienen un menú de **Acciones** (botón `⋯`) con **operaciones funcionales del dominio** (Generar Factura, Asignar Banco y Cuenta, Aceptar Quote, Imputar contablemente, Crear Nota de Débito, etc.). Estas acciones tienen tres atributos que determinan si están habilitadas y para quién:

- **Capabilities del usuario** — el rol o permiso del usuario logueado (ej: `ANALISTA_CONTABLE`, `OPS_OFFICER`, `TREASURY`, `ADMIN_FIN`).
- **Características intrínsecas del registro** — estado, categoría, tipo, fecha (ej: una factura ya emitida no se puede regenerar; un movimiento ya conciliado no se puede des-conciliar).
- **Habilitación por feature** — algunas acciones aún no están construidas y se muestran como `Bloqueado · V2` con tag visible.

Sin un manifest engine compartido, esta lógica vive inline en cada vista — cada app la reescribe sin contrato compartido. Eso genera divergencia inevitable entre módulos y entre prototipos y producción.

### 11.2 Modelo conceptual

La relación a formalizar es:

```
Acción ─── puede ejecutarse sobre ───→ Registro (de un cierto Tipo)
   │
   ├── requiere ───→ Capability (uno o más Roles)
   │
   ├── puede abrir ───→ Dialog (campos, info banners, confirm/cancel)
   │
   └── ejecuta ───→ on_confirm (set_fields, recompute, audit, toast)
```

**Ejemplo concreto:**

| Acción                 | Tipo de Registro                              | Capabilities habilitantes        | Reglas adicionales                                         |
| ---------------------- | --------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| Generar Factura        | Cotización (TRD.Quotes / FIN.Operatoria)      | `ANALISTA_CONTABLE`, `ADMIN_FIN` | Solo si quote en estado `EXECUTED` y sin factura previa    |
| Asignar Banco y Cuenta | Movimiento (OPS.Movimientos)                  | `OPS_OFFICER`, `ADMIN_OPS`       | Solo si tipo OUT y estado `PENDING_ASSIGNMENT`             |
| Aprobar carga manual   | Carga manual (FIN.Tesorería)                  | `ADMIN_FIN`                      | Solo si distinto del usuario que cargó (regla doble firma) |
| Conciliar              | Movimiento (OPS.Movimientos / FIN.Operatoria) | `OPS_OFFICER`, `FINANCE`         | Solo si estado `PENDING_RECONCILIATION`                    |

### 11.3 Componentes que la infraestructura debe proveer

1. **Manifests declarativos por módulo** — un archivo TypeScript por módulo (`src/manifests/<app>.<module>[.<recordType>].actions.ts`) que declara `actions[]`, `module_ctas[]`, `kanban_axes[]` y predicates (`enable_when`, `show_when`).
2. **Motor de evaluación** — pure-TS, sin Vue / DOM. Dado un registro y un usuario, evalúa qué acciones están habilitadas y devuelve el motivo cuando no lo están.
3. **Componentes UI** — `<ManifestActionsMenu>`, `<ManifestDialog>`, `<ManifestField>`, `<ManifestModuleCTAs>`, `<ManifestBatchCTA>` consumen el motor y renderizan solo lo habilitado.
4. **Capability provider** — el motor consulta `useCapabilities()` para evaluar `capabilities` de cada acción.
5. **Audit trail** — toda ejecución de una acción queda registrada con usuario, registro, timestamp, parámetros, outcome.

### 11.4 Por qué es transversal y no por módulo

Las Acciones tocan registros de varios módulos pero la lógica es la misma en todos: "¿este usuario, sobre este registro en este estado, puede ejecutar esta operación?". Centralizarlo:

- **Evita divergencia entre módulos** — todos consultan el mismo motor.
- **Permite cambios de governance sin tocar UI** — agregar una capability nueva o cambiar una regla impacta a todos los módulos al mismo tiempo.
- **Habilita reportes de governance** — quién hizo qué sobre qué (compliance, auditoría interna).
- **Es base del sistema de roles del core** — capabilities no son arbitrarias; pertenecen a un set definido por la matriz de roles transversales.

### 11.5 Estado de implementación

**Engine ya implementado en el prototipo de FIN** — `prototypes/fin/src/lib/manifest/` (pure-TS, sin Vue) + `prototypes/fin/src/components/manifest/` (UI) + 7 manifests (`fin.alertas`, `fin.cotizaciones`, `fin.inbox`, `fin.movimientos`, `fin.reportes`, `fin.tesoreria`, `fin.tesoreria.cola_asignacion`). El spec OpenSpec `core-actions-manifest` existe y está activo.

Lo que falta para production: el REQ transversal correspondiente (§13) que tramite la construcción de la infraestructura backend (catálogo persistido, motor server-side, audit trail, API consumible) sobre la que el frontend ya tiene el manifest engine cliente.

---

## 12. Implementación por aplicación

### 12.1 Estado actual

| App     | Dashboard                              | Inbox                                       | Alertas (perfiles activos)                               | Reportes                                    |
| ------- | -------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| **LEX** | Placeholder                            | —                                           | ✅ Canónico (REQ-52) · Perfil B                          | ✅ Canónico (REQ-54)                        |
| **FIN** | Activo (prototipo migrado al template) | Activo (skeleton funcional con 8 tipos)     | Activo · Perfiles A + B coexistiendo                     | Activo (Catálogo + Ejecución implementados) |
| **OPS** | —                                      | Prompt canónico v1 (en disco, sin ejecutar) | —                                                        | —                                           |
| **TRD** | —                                      | —                                           | REQ-33 separado, a unificar bajo REQ Alertas transversal | —                                           |
| **CLP** | —                                      | —                                           | —                                                        | —                                           |

### 12.2 Roadmap

A medida que cada aplicación entre en fase de prototipo / spec / implementación, debe replicar la arquitectura de los prototipos canónicos para los módulos genéricos correspondientes — declarando explícitamente qué capacidades activa y qué perfil(es) cubren sus tipos. Si una aplicación necesita una variación que no entra en el patrón actual, se discute primero como evolución del estándar (que se actualiza acá) antes de implementar la divergencia.

---

## 13. Trabajo transversal en horizonte — REQs en tramitación

Las convenciones de este framework requieren materializarse como **infraestructura transversal del core** vía REQs en Jira. El paradigma se compone de **6 REQs transversales** que entregan el estándar habilitante; cada app del core declara su configuración específica vía REQs por área que se construyen sobre los transversales.

### 13.1 Inventario de REQs transversales

| #   | REQ transversal                                                     | Naturaleza                      | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Construir ACCIONES — Manifest Engine para Acciones por Registro** | Nuevo                           | Catálogo declarativo `Acción × Registro × Capability`, motor de evaluación (pure-TS), predicates `enable_when` / `show_when`, dialogs declarativos, capability gating, audit trail server-side, API consumible. Atraviesa todos los módulos del dominio y los 3 list-shaped genéricos.                                                                                                                                                                            |
| 2   | **Construir VISTAS — Lista, Tarjetas y Tablero con Ejes**           | Nuevo                           | `<ViewToggle>`, contrato `views: ('list' \| 'cards' \| 'kanban')[]`, Tablero state-driven (N columnas = N estados / valores del eje activo), `kanban_axes[]` redefinibles por usuario, drag-drop con `<ClosureModal>` en transiciones a estado terminal, integración con manifest engine de Acciones.                                                                                                                                                             |
| 3   | **Construir INBOX — Infraestructura Transversal del Core**          | Nuevo                           | Tipo canónico `Solicitud`, set de estados `pendiente` / `en_proceso` / `completed` / `rejected`, transitions con mode `free` / `modal`, `<ClosureModal>` con `closeActions` por tipo, API de ingesta de Solicitudes desde otras apps, motor de routing por `target_role`, Drawer + Timeline + Comments.                                                                                                                                                           |
| 4   | **Construir ALERTAS — Infraestructura Transversal del Core**        | Nuevo (unifica REQ-52 + REQ-33) | Tipo canónico `Alerta` con discriminador `profile: 'A' \| 'B' \| 'C' \| 'D'`, UI canónica por perfil, `<ClosureModal>` con justificación obligatoria en perfil B, mecanismo `REPORT_DEPENDENCY` con auto-cierre cuando la source completa la dependencia, integración con Inbox y Reportes. **REQ-52 (LEX) y REQ-33 (TRD) se mantienen como casos de implementación de los `ALERT_TYPE` específicos de cada área, vinculados al transversal vía `is caused by`.** |
| 5   | **Construir REPORTES — Infraestructura Transversal del Core**       | Update de **REQ-59**            | Re-baseline contra el contrato actual: split Catálogo / Ejecución vía Type B Tabs (deprecada la nomenclatura "Histórico"), tipos canónicos `Report` y `ReportRun`, `dependencies[]`, emisor de `REPORT_DEPENDENCY` events, locked reports. AM-1004 (development story) queda alineada.                                                                                                                                                                            |
| 6   | **Construir DASHBOARD — Infraestructura Transversal del Core**      | Nuevo                           | Card-grid responsive (no L1/L2/L3), counters consolidados de los 3 list-shaped genéricos, evolution chart placeholder card, activity widgets (Alertas activas / Próximos vencimientos), period selector opcional top-right, prohibiciones explícitas (no operaciones de dominio, no filtros, no sub-tabs).                                                                                                                                                        |

### 13.2 Modelo de provisión — REQ transversal vs REQ por área

Los REQs transversales entregan el **estándar habilitante**:

- Engines (manifest, vistas, alertas, etc.).
- Tipos canónicos en `src/types/genericos.ts`.
- Componentes shared (`<ClosureModal>`, `<Drawer>`, `<ManifestActionsMenu>`, etc.).
- APIs e integraciones cross-app.

Los REQs por área entregan la **configuración específica del estándar**:

- Tipos de Solicitudes y Alertas con sus closeActions / perfiles.
- Reportes específicos del catálogo del área.
- KPIs y cards específicas del Dashboard del área.
- Manifests de Acciones por módulo.

REQ-52 (LEX Alertas) y REQ-33 (TRD Alertas) pasan a ser ejemplos de REQ por área que se construyen sobre el REQ Alertas transversal. Mantienen su contenido específico del dominio; bajo el nuevo modelo no entregan la infraestructura — la consumen.

### 13.3 Iniciativa parent

Estos 6 REQs transversales probablemente deban agruparse bajo una iniciativa Jira común. Decisión a tomar al momento de crearlos en Jira (no resuelta acá — el HoP la cierra cuando los acomoda manualmente).

### 13.4 Orden sugerido de tramitación

Por dependencia técnica:

1. **Construir ACCIONES** — base de los CTAs y row-actions de los 3 list-shaped genéricos.
2. **Construir VISTAS** — el Tablero y el `<ClosureModal>` se reusan en Inbox y Alertas.
3. **Construir INBOX** — convención madura, prototipo FIN ya implementado.
4. **Construir ALERTAS** — perfiles A/B/C/D ya cocinados en el spec.
5. **Construir REPORTES** (update REQ-59) — alineación con `REPORT_DEPENDENCY` perfil A.
6. **Construir DASHBOARD** — el más liviano; puede ir al final o en paralelo.

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

- **Template base UI del core:** `prototypes/_core-template-frontend/` (Vue 3 + TS + Vite + OpenSpec)
- **Prototipo FIN (canónico de migración al template):** `prototypes/fin/`
- **Prototipo legacy de Alertas (LEX, perfil B):** `prototypes/lex/lex_alertas_prototype.html`
- **Prototipo legacy de Reportes (LEX):** `prototypes/lex/lex_reporteria_prototype.html`
- **Prompt canónico de Inbox (OPS, en disco):** `prototypes/ops/ops-inbox-PROMPT.md` (v1)

### 15.2 Specs OpenSpec relevantes

(Vinculantes para el contrato técnico — viven en `prototypes/_core-template-frontend/openspec/specs/` y mirror en `prototypes/fin/openspec/specs/`.)

- `core-modulo-genericos` — los 4 módulos genéricos
- `core-module-types` — Type A vs Type B
- `core-actions-manifest` — manifest engine de Acciones
- `core-data-tables` — tabla, filtros, state machines, vistas
- `core-modals` — Create / Detail / Edit / Confirm / `<ClosureModal>`
- `core-layout`, `core-navigation`, `core-theming`, `core-forms`, `core-auth`, `core-api-layer`, `core-error-handling`, `core-actions-menu`

### 15.3 Discoveries relacionados

- **Discovery transversal del template:** `discoveries/core-template-frontend-discovery.md`
- **Discovery FIN:** `discoveries/fin-discovery.md`
- **Discovery OPS:** `discoveries/ops-discovery.md`
- **Discovery LEX-Alertas:** `discoveries/lex-alertas-discovery.md`

### 15.4 REQs activos

- **REQ-3** — Ardua Fintech (iniciativa parent candidata).
- **REQ-52** — LEX: Centro de Alertas. Bajo el nuevo modelo, REQ por área que se construye sobre el REQ Alertas transversal. Mantiene contenido del dominio LEX.
- **REQ-54** — LEX: Centro de Reportería Regulatoria y Operativa.
- **REQ-33** — TRD: Módulo de Alertas. Bajo el nuevo modelo, REQ por área que se construye sobre el REQ Alertas transversal. Mantiene contenido del dominio TRD.
- **REQ-59** — Reportería — Infraestructura Transversal del Core. Requiere update (§13.1).
- **AM-1004** — development story de REQ-59. Requiere update también.

---

## Changelog

| Versión | Fecha          | Cambios                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 27/04/2026     | Versión inicial. Define los 4 módulos genéricos del financial-core: Dashboard, Inbox, Alertas, Reportes. Establece prototipos canónicos en LEX. Documenta convención de ubicación contextual en sidebar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1.1     | 27/04/2026     | Modelo "núcleo + capacidades opcionales" para los genéricos. Perfiles A/B/C/D para Alertas — perfil declarado por tipo. Reescritura de §7 (Alertas) y §8 (Reportes). Nuevas §9 (Inbox) y §10 (Dashboard).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 1.2     | 27/04/2026     | §6 reescrita (sidebar — los 4 genéricos al tope sin bloque). §9 Inbox enriquecida (nomenclatura "Solicitudes", drag-drop híbrido, modal de cierre por tipo). Nueva §11 mecanismo de Acciones. Nueva §13 inventario de REQs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1.2.1   | 27/04/2026     | Patch sobre §9.0 reforzando "Solicitudes" como denominación universal vinculante.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 1.2.2   | 04/05/2026     | Sweep de referencias residuales tras rename `discovery/` → `discoveries/`. Actualización de paths en §15.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **1.3** | **06/05/2026** | **Cambios mayores derivados de la consolidación del paradigma materializado en `prototypes/_core-template-frontend/` y `prototypes/fin/`. Los prototipos pasan a ser fuente de verdad y el framework conceptual se reconcilia con sus specs OpenSpec. (a) **COM descontinuado** — la app Comercial sale del portfolio, la función se cubre vía integración con HubSpot. Eliminada de §1, §6, §12.1 y de toda referencia residual. (b) **§2 reescrita** — el paradigma se compone de 4 módulos genéricos + 2 funcionalidades transversales (Vistas + Ejes; Acciones). Modelo de provisión explícito: REQ transversal entrega el estándar, REQ por área entrega la configuración específica. (c) **§3.2 reescrita** — taxonomía A/B/C/D reconciliada con `core-modulo-genericos`. Perfil C ahora es Time-series con chart, no Auto-system. Perfil D ahora es Cross-app KPI dashboard, no Hybrid. Hybrid se reformula como composición de tipos con perfiles distintos en una misma app. (d) **§5 nueva** — Module Types A vs B formalizados (heredado del spec `core-module-types`). (e) **§6 nueva** — Vistas + Ejes formalizados como funcionalidad transversal: tres vistas declarables, Tablero state-driven, drag-drop con `<ClosureModal>` shared. (f) **§7 reescrita** — Alertas alineadas con la nueva taxonomía. Sub-tabs `Nuevas + Histórico` deprecados; el filtro Estado en L3 expone los estados simultáneamente. UI canónica por perfil documentada. (g) **§8 actualizada** — Reportes con sub-tabs Catálogo + **Ejecución** (deprecada "Histórico") implementados vía Type B Tabs. Tipos canónicos `Report` y `ReportRun`. `REPORT_DEPENDENCY` cambia de perfil C a perfil A. (h) **§9 actualizada** — Inbox pasa de 3 a 4 estados (`pendiente` / `en_proceso` / `completed` / `rejected`). `Solicitud` reforzado como identifier canónico de TS, no solo nomenclatura de UI. Drag-drop generalizado vía §6.3. (i) **§10 reescrita** — Dashboard NO es L1/L2/L3, es card-grid responsive. Counters de los 3 list-shaped genéricos como núcleo. Period selector y evolution chart placeholder como capacidades. Prohibiciones explícitas (no filtros, no sub-tabs, no operaciones de dominio). (j) **§11 patch** — renombrada a "manifest engine"; estado de implementación actualizado al engine ya implementado en `prototypes/fin/`. (k) **§13 reescrita** — inventario de **6 REQs transversales** (incorpora REQ Acciones ya existente en §13.1 de v1.2 y agrega REQ Vistas + Ejes como sexto, separado por su naturaleza distinta del manifest engine). Nueva §13.2 explicita el modelo de provisión REQ transversal vs REQ por área. REQ-52 (LEX) y REQ-33 (TRD) reformulados como casos de implementación que consumen el REQ Alertas transversal vía `is caused by`. (l) **§15 actualizada** — refs a paths del prototipo migrado (Vue 3 + TS + Vite). Ya no referencia el `_core-template-frontend.html` legacy ni el `prototypes/fin/PROMPT.md`.** |
