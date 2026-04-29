# COM — Gestión Unificada del Pipeline Comercial

> Módulo: Comercial (COM)
> Tipo: Aplicación interna · Core Ardua
> Jira: REQ-18
> Prioridad: Alta
> Status: In Review — prototipo validado, pendiente Ready for Dev
> Last updated: 2026-04-09

---

## Contexto

El área de Sales & Partnerships gestiona su pipeline comercial en Trello (board Pipeline Comercial) y el proceso de onboarding en un board separado (Onboarding). Ambos están desconectados entre sí y del sistema operativo de Ardua. Parte de la funcionalidad comercial existe embebida en LEX sin separación clara de dominios.

Esto genera tres problemas concretos:

- Duplicación de registros entre Leads y Altas sin trazabilidad automática
- Falta de visibilidad consolidada del estado de un cliente a lo largo de su ciclo de vida
- Ausencia de métricas comerciales centralizadas

---

## Objetivo

Construir COM como aplicación independiente dentro del Core de Ardua, extrayendo la funcionalidad comercial actualmente embebida en LEX. COM unifica la gestión del pipeline comercial, el registro de cuentas, los referenciadores y los eventos, reemplazando progresivamente el uso de Trello y consolidando la visión comercial del negocio.

---

## Principios de diseño

- **COM no crea cuentas.** Las cuentas son clientes registrados vía onboarding en LEX. COM gestiona la capa comercial encima de ese registro.
- **Referenciadores son Cuentas.** No existe un objeto "Referenciador" separado. El tipo se asigna desde el módulo Cuentas. El módulo Referenciadores es una vista filtrada.
- **Separación clara de capas.** COM edita la capa comercial (NickName, tipoComercial, estado, asignaciones). LEX es la fuente de verdad del registro del cliente (nombre legal, tax, dockets, datos de compliance).
- **Terminología consistente.** El módulo se llama "Referenciadores". Los subtipos son Referenciador y Agregador. El campo que vincula un cliente con su referenciador se llama `accountOwner`.
- **Multi-select refleja la realidad comercial.** Un lead puede tener interés en múltiples productos y clasificarse con múltiples tipos de cliente simultáneamente.
- **El Home es por rol, no por persona.** El filtro adapta las opciones según el rol activo.

---

## Ciclo de vida del cliente en COM

```
Lead (prospecto) → Alta (en proceso de onboarding en LEX) → Cliente (onboarding aprobado)
```

Los estados Alta y Cliente se gestionan desde COM. Los sub-estados internos del proceso de Alta residen en LEX y no se exponen en COM V1.

---

## Modelo de roles

| Rol | Descripción |
|---|---|
| Head of Sales | Visibilidad total del equipo. Puede filtrar por cualquier comercial o ver todos. Accede a cards exclusivos de performance. |
| Comercial | Puede ver datos globales (todos) o solo su pipeline personal. El card Leads en riesgo siempre muestra solo sus propios datos. |

---

## Alcance funcional — V1

### 1. Home

Panel de métricas con comportamiento diferenciado por rol.

**Controles globales:**
- Selector de período: Esta semana / Este mes
- Filtro de agente (único para todo el Home)
  - Head of Sales: Todos los comerciales o cada uno individualmente
  - Comercial: Global (todos) o Mi pipeline (solo sus datos)

**Cards para ambos roles (responden al filtro de agente):**

| Card | Comportamiento |
|---|---|
| Leads generados | Leads creados en el período seleccionado |
| Pipeline activo | Leads en estados no terminales (excluye Ganado y Vencido) |
| Cuentas nuevas | Cuentas que pasaron a estado Cliente en el período |
| Tasa de conversión | Ganados / total leads del scope (%) |
| Leads en riesgo | Split Frío / Vencido. El Comercial siempre ve solo los suyos, independientemente del filtro global |
| Altas en proceso | Cuentas en estado Alta del scope seleccionado |
| Pipeline por estado | Distribución con barra proporcional por volumen |
| Leads recientes | Últimos 5 leads ordenados por fecha de creación |

**Cards siempre globales (no filtran por agente):**

| Card | Comportamiento |
|---|---|
| Próximos eventos | Eventos del equipo en los próximos 30 días. Click navega al módulo Eventos. |

**Cards exclusivos del Head of Sales (siempre globales):**

| Card | Descripción |
|---|---|
| Performance del equipo | Tabla por comercial: leads totales, activos, ganados, tasa de conversión. Colores semánticos en tasa: verde ≥40%, ámbar ≥20%, rojo <20%. |
| Distribución pipeline activo | Barras comparativas de leads activos por comercial. |

---

### 2. Referenciadores

**Modelo conceptual:** Los Referenciadores y Agregadores son Cuentas del sistema. No son un objeto separado. Este módulo es una vista filtrada de Cuentas donde `tipoComercial = Referenciador | Agregador`. No existe flujo de "Alta de Referenciador" independiente.

**Diferencia operativa entre subtipos:**

| Tipo | Relación con cliente final |
|---|---|
| Referenciador | Ardua onboarda al referenciador y sus clientes. Ardua interactúa directamente con el cliente final. |
| Agregador | Ardua onboarda al agregador y sus clientes. Ardua nunca interactúa directamente con el cliente final. |

**Comportamiento del módulo:**
- Tabla con búsqueda. Columna "Clientes" muestra conteo en tiempo real de cuentas donde `accountOwner = esta cuenta`.
- Click en fila abre modal con dos tabs:
  - **Datos:** información comercial (tipoComercial, estado, accountManager, fechas) + bloque read-only de LEX (nombre LEX, tipo, tax, template, dockets).
  - **Referenciados (N):** tabla de cuentas donde `accountOwner = id de este referenciador`. Columnas: NickName / Nombre LEX, Tipo Comercial, Estado, Account Manager. Cada fila tiene botón `×` para desasignar (limpia el `accountOwner` de esa cuenta). Click en la fila navega al detalle de esa cuenta.
- Sin botón "Nuevo Referenciador". Banner informativo explica que el tipo se asigna desde Cuentas.
- Paginación: 10 registros por página.

---

### 3. Cuentas

Vista unificada del ciclo de vida del cliente. Las cuentas se originan en LEX vía onboarding; COM no las crea.

**Campos editables desde COM:**

| Campo | Descripción |
|---|---|
| NickName | Nombre comercial interno del equipo |
| tipoComercial | Cliente Final / Referenciador / Agregador |
| Estado | Alta / Cliente |
| AccountOwner | Referenciador asignado (referencia a otra Cuenta) |
| AccountManager | Comercial interno asignado |
| Lead de origen | Vinculación manual con lead del pipeline |

**Auto-populación al vincular un Lead:**
- `NickName` ← `lead.nombre`
- `tipoComercial` ← primer valor de `lead.tiposCliente`

**Campos read-only (fuente: LEX) — comunes a COMPANY y PARTICULAR:**
- Nombre en LEX, Tipo (COMPANY / PARTICULAR), Tax Number / ID
- Template de onboarding
- Tipo Cliente LEX (GROUPER / DIRECT)
- Email, Email Comercial (opcional), Teléfono (opcional)
- Dirección
- Fecha de Vencimiento (opcional)
- Dockets: Ardua (`AS-`), Circuit Pay (`CIR-`), Haz Pagos (`HAZ-`)

**Campos read-only específicos COMPANY:**
- Actividad Principal, Tipo de Empresa, Representante Legal

**Campos read-only específicos PARTICULAR:**
- Fecha de Nacimiento, Condición IVA, Profesión, Actividad

**Estados del ciclo de vida:**
- **Alta:** agrupa todos los sub-estados del proceso de onboarding bajo el estado visible "En Proceso de Alta"
- **Cliente:** estado final una vez aprobado por Compliance

Filtros: por estado (Todos / Alta / Cliente) y búsqueda por nombre, docket, tax number. Paginación: 10 registros por página.

---

### 4. Leads

Reemplaza el board Pipeline Comercial de Trello.

**Estados del pipeline:**

```
En conversaciones → Avanzado → Esperando respuesta → Pendiente de Ardua
→ Propuesta enviada → Frío → Vencido → Ganado
```

El estado **Ganado** se asigna únicamente cuando el cliente inicia el proceso de onboarding en LEX.

**Campos (todos editables desde el modal de detalle):**

| Campo | Tipo | Notas |
|---|---|---|
| nombre | Texto | Nombre del lead o empresa |
| email | Email | Dato de prospección, independiente del email en LEX |
| phone | Teléfono | Dato de prospección, independiente del teléfono en LEX |
| productos | Multi-select | RFQ/OTC · Cross Border Payments · Pago de Importaciones · CVU Collect · Prime Broker |
| tiposCliente | Multi-select | Cliente Final · Referenciador · Agregador. Valor inicial: Cliente Final |
| origen | Select | Referenciador · Directo · Evento · Inbound |
| referenciador | Select | Referencia a cuenta de tipo Referenciador o Agregador |
| eventoOrigen | Select | Evento al que se vincula el lead |
| comercial | Select | Comercial responsable |
| estado | Select | Ver estados arriba |
| notas | Texto largo | Contexto, necesidad, próximos pasos |

**Campos excluidos del diseño final:** empresa, monto estimado.

**Vistas:** Tabla y Kanban. Sin drag & drop en V1. Los leads pueden crearse desde el detalle de un Evento con `eventoOrigen` pre-seleccionado; al guardar, el sistema vuelve al evento en el tab Leads.

---

### 5. Eventos

Registro de eventos propios y de terceros.

**Campos:**

| Campo | Tipo |
|---|---|
| nombre | Texto |
| tipo | Propio / Tercero |
| fecha | Fecha |
| lugar | Texto |
| asistentes estimados | Número |
| url | URL (clickeable) |
| descripción | Texto largo |
| próxima acción (equipo COM) | Texto largo |

**Vistas:** Tabla (con paginación) y Cards. Filtro por mes.

**Modal de detalle — 3 tabs:**

| Tab | Contenido |
|---|---|
| Detalles | Info completa + URL clickeable + bloque "Próxima acción COM" |
| Leads (N) | Leads vinculados al evento. Botón "Nuevo lead" con evento pre-seleccionado. Botón `×` para desasignar. |
| Gastos | Registro por categoría (Marketing · Logística · Catering · Tecnología · Viáticos · Espacio/Venue · Otros) con total acumulado en USD. |

Paginación en vista tabla: 10 registros por página.

---

## Fuera de alcance — V1

- Drag & drop para cambio de estado en kanban de Leads
- Sub-estados visibles del proceso de Alta en Cuentas
- Vista de escala temporal en Eventos (semana / mes / trimestre)
- Acciones comerciales sobre clientes onboardeados (cross-sell, eventos, etc.)
- Funcionalidades avanzadas de Referenciadores: resumen de operaciones, cálculo de comisiones, acuerdos de fees
- Tags en Eventos
- Integración automática COM ↔ LEX (la vinculación Lead ↔ Cuenta es manual en V1)

---

## Criterios de aceptación

1. COM existe como aplicación independiente, accesible desde el menú principal, sin dependencia funcional de LEX.
2. El módulo Home distingue dos roles de usuario: Head of Sales y Comercial. El rol activo determina las opciones disponibles en el filtro de agente y los cards visibles.
3. El Head of Sales puede filtrar el Home por cualquier comercial individualmente o ver todos. El Comercial puede ver datos globales (todos) o solo su propio pipeline.
4. El card Leads en riesgo muestra, para el rol Comercial, únicamente los leads de su propio pipeline, independientemente del filtro global seleccionado.
5. Los cards Performance del equipo y Distribución pipeline activo son exclusivos del rol Head of Sales y siempre muestran datos globales del equipo completo.
6. El card Próximos eventos siempre muestra datos globales del equipo (independientemente del filtro de agente) y permite navegar directamente al módulo Eventos.
7. El módulo Referenciadores muestra únicamente las cuentas con tipoComercial = Referenciador o Agregador, con un tab Referenciados que lista todas las cuentas donde esa entidad es AccountOwner.
8. El módulo Cuentas muestra en el bloque read-only de LEX los campos de contacto (email, teléfono, dirección) y los datos específicos por tipo de cliente (empresa: actividad, tipo, representante legal; particular: nacimiento, condición IVA, profesión, actividad).
9. Al vincular una cuenta con un lead, el NickName y el tipoComercial de la cuenta se auto-populan desde los campos correspondientes del lead.
10. El módulo Leads permite seleccionar uno o más productos de interés y uno o más tipos de cliente mediante selectores multi-tag.
11. El módulo Leads captura email y teléfono de contacto del lead como campos propios de COM (no empresa, no monto estimado).
12. Un lead puede crearse desde el detalle de un Evento con el campo eventoOrigen pre-seleccionado; al guardar, el sistema vuelve al evento en el tab Leads.
13. El módulo Eventos registra gastos por categoría por evento y los muestra con total acumulado en el tab Gastos del modal de detalle.
14. Los módulos Cuentas, Referenciadores y Eventos (vista tabla) implementan paginación de 10 registros por página.

---

## Flags y decisiones pendientes

### FLAG-01 — Objeto Referenciadores / Agrupadores compartido con CLP
El modelo de Referenciadores en COM y el modelo de Agrupadores en CLP referencian la misma entidad del sistema. COM llama a la entidad "Referenciadores" para gestionar la relación comercial; CLP llama "Agrupadores" para gestionar el acceso operativo.

**Decisión requerida antes del diseño técnico:** Definir si esta entidad existe en un catálogo compartido o si cada módulo mantiene su propia copia. No construir dos módulos separados que apunten a registros distintos.

### FLAG-02 — Integración COM ↔ LEX
La vinculación entre Cuentas (COM) y el registro de Alta (LEX) es manual en V1. En V2 definir si el flujo de onboarding de LEX notifica a COM cuando una Alta es aprobada.

### FLAG-03 — Sub-estados de Alta
Los sub-estados del proceso de onboarding existen en LEX pero no se exponen en COM V1. En V2 evaluar si COM debe mostrar granularidad del proceso de onboarding.

---

## Roadmap de versiones

**V1 (este spec):**
Home con roles, Leads (tabla + kanban), Cuentas (ciclo de vida), Referenciadores (vista filtrada), Eventos (con gastos).

**V2:**
Drag & drop en kanban, métricas avanzadas, acciones comerciales sobre clientes y referenciadores, integración COM ↔ LEX para notificación de Altas aprobadas, sub-estados de Alta visibles.

**V3:**
Módulo de Eventos con funcionalidades avanzadas (registro de asistentes individuales, seguimiento post-evento, ROI de evento).

---

## Artefactos relacionados

| Artefacto | Ruta / Referencia |
|---|---|
| Prototipo funcional | `/Users/yasmani/Products/claude/prototypes/com/com_prototype.html` |
| Living Discovery Document | `/Users/yasmani/Products/claude/discovery/com-session-context.md` |
| Requirement Jira | REQ-18 · In Review |
