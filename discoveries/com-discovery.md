---
name: COM — Living Discovery Document
features: []
status: Descartada
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-07
---

# COM — Living Discovery Document

> Module: Comercial (COM) — **DEPRECADO TOTALMENTE**
> Requirement: REQ-18 (histórico)

---

## Contexto del módulo

El área de Sales & Partnerships gestiona actualmente su pipeline comercial en Trello (board Pipeline Comercial) y el proceso de onboarding en un board separado (Onboarding). Ambos registros están desconectados entre sí y del resto del sistema operativo de Ardua. Parte de la funcionalidad de gestión comercial existe dentro de LEX, sin una separación clara de dominios.

Esto genera:
- Duplicación de registros entre Leads y Altas, sin trazabilidad automática
- Falta de visibilidad consolidada del estado de un cliente a lo largo de su ciclo de vida
- Ausencia de métricas comerciales centralizadas

---

## Objetivo del módulo

Construir COM como aplicación independiente dentro del Core de Ardua, extrayendo la funcionalidad comercial actualmente embebida en LEX. COM unifica la gestión del pipeline comercial, el registro de cuentas, los referenciadores y los eventos, reemplazando progresivamente el uso de Trello y consolidando la visión comercial del negocio.

**COM no crea cuentas.** Las cuentas son clientes registrados vía onboarding en LEX. COM gestiona la capa comercial encima de ese registro: asignaciones, vinculaciones, NickName y estado en el ciclo de vida.

---

## Módulos definidos — V1

### Home
Panel de métricas con dos roles diferenciados: **Head of Sales** y **Comercial**. El rol determina las opciones del filtro de agente y los cards visibles.

**Usuarios mock en el prototipo:**
- Mauro Pascuccio — Head of Sales
- Martín García — Comercial

**Controles globales del Home:**
- Selector de período: Esta semana / Este mes
- Filtro de agente (único para todo el Home — los cards que no admiten filtrado muestran datos globales con etiqueta indicativa)

**Opciones del filtro de agente por rol:**
- Head of Sales: Todos los comerciales + cada comercial individualmente
- Comercial: Global (todos) + Mi pipeline (solo sus propios datos)

**Catálogo de cards — ambos roles (responden al filtro):**

| Card | Comportamiento especial |
|---|---|
| Leads generados | Cuenta leads creados en el período seleccionado |
| Pipeline activo | Leads en estados no terminales (excluye Ganado y Vencido) |
| Cuentas nuevas | Leads que pasaron a estado Cliente en el período |
| Tasa de conversión | Ganado / total leads del scope seleccionado (%) |
| Leads en riesgo | Split Frío / Vencido. El Comercial **siempre** ve solo los suyos, independientemente del filtro global |
| Altas en proceso | Cuentas en estado Alta del scope seleccionado |
| Próximos eventos | **Siempre global** — eventos del equipo en los próximos 30 días. Click navega a Eventos |
| Pipeline por estado | Distribución del pipeline con barra proporcional por volumen |
| Leads recientes | Últimos 5 leads ordenados por fecha de creación |

**Cards exclusivos del Head of Sales (siempre globales):**

| Card | Descripción |
|---|---|
| Performance del equipo | Tabla por comercial: leads totales, activos, ganados, tasa de conversión. Tasa con colores semánticos (verde ≥40%, ámbar ≥20%, rojo <20%) |
| Distribución pipeline activo | Barras comparativas de leads activos por comercial |

---

### Referenciadores

**Modelo conceptual clave — decisión de diseño:**
Referenciadores y Agregadores son técnicamente Clientes del sistema. No son un objeto separado. El módulo Referenciadores es una **vista filtrada de CUENTAS** donde `tipoComercial = Referenciador | Agregador`. El tipo se asigna desde el módulo Cuentas.

No existe un flujo de "Alta de Referenciador" independiente. El flujo es: el cliente pasa por el proceso de Alta → Cliente en LEX → el comercial va a Cuentas, abre el detalle del cliente y cambia el campo `tipoComercial` a Referenciador o Agregador.

| Tipo | Onboarding | Interacción Ardua ↔ Cliente final | Quién opera |
|---|---|---|---|
| Cliente Final | Ardua onboarda al cliente | Directa | El cliente |
| Referenciador | Ardua onboarda al referenciador + sus clientes | Ardua interactúa directamente con el cliente final | El cliente final |
| Agregador | Ardua onboarda al agregador + sus clientes | Ardua **nunca** interactúa directamente con el cliente final | El Agregador |

**Terminología:**
- El módulo se llama "Referenciadores"
- Los subtipos son Referenciador y Agregador
- El campo en Cuentas que define quién es el referenciador de un cliente se llama `AccountOwner`

**Comportamiento del módulo:**
- Tabla con filtro de búsqueda y columna "Clientes" (conteo en tiempo real de cuentas donde `accountOwner = esta cuenta`)
- Click en una fila abre un modal con dos tabs:
  - **Datos**: información comercial (tipoComercial, estado, accountManager, fechas) + bloque read-only de LEX (nombreLex, tipo, tax, template, dockets)
  - **Referenciados (N)**: tabla de todas las CUENTAS donde `accountOwner = id de este referenciador`. Columnas: NickName/NombreLEX, Tipo Comercial, Estado, Account Manager. Cada fila tiene botón `×` para desasignar (limpia el `accountOwner` de esa cuenta). Click en la fila navega al detalle de esa cuenta.
- Sin botón "Nuevo Referenciador". Banner informativo explica que el tipo se asigna desde Cuentas.
- Paginación: 10 registros por página.

**Objeto compartido con CLP:**
El modelo de Referenciadores en COM y el modelo de Agrupadores en CLP referencian la misma entidad del sistema. Pendiente de resolución arquitectónica antes de que Tecnología diseñe COM.

---

### Cuentas
Vista unificada del ciclo de vida del cliente: Lead → Alta → Cliente.

**Regla de diseño clave:** Las cuentas se originan en LEX vía onboarding. COM no crea cuentas — solo gestiona la capa comercial encima del registro existente.

**Campos editables desde COM:**
- NickName (nombre comercial usado por el equipo)
- `tipoComercial` (Cliente Final / Referenciador / Agregador)
- Estado (Alta / Cliente)
- AccountOwner (Referenciador asignado)
- AccountManager (Comercial asignado)
- Vinculación manual con Lead de origen

**Auto-populación al vincular un Lead:**
- `nombre` (NickName) ← `lead.nombre`
- `tipoComercial` ← primer valor de `lead.tiposCliente`

**Campos read-only (provienen de LEX) — revisados contra `core-lex-frontend`:**

Campos comunes (COMPANY y PARTICULAR):
- Nombre en LEX, Tipo (COMPANY/PARTICULAR), Tax Number / ID
- Template de onboarding
- Tipo Cliente LEX (GROUPER / DIRECT)
- Email, Email Comercial (opcional), Teléfono (opcional)
- Dirección
- Fecha de Vencimiento (`due_date`, opcional)
- Dockets: Ardua (`AS-`), Circuit Pay (`CIR-`), Haz Pagos (`HAZ-`)

Campos específicos COMPANY:
- Actividad Principal, Tipo de Empresa, Representante Legal

Campos específicos PARTICULAR:
- Fecha de Nacimiento, Condición IVA, Profesión, Actividad

**Ciclo de vida:**
- Alta: agrupa todos los sub-estados del proceso de onboarding bajo el estado visible "En Proceso de Alta"
- Cliente: estado final una vez aprobado por Compliance

**Paginación:** 10 registros por página. Filtros resetean a página 1.

---

### Leads
Reemplaza el board Pipeline Comercial de Trello.

Estados: En conversaciones → Avanzado → Esperando respuesta → Pendiente de Ardua → Propuesta enviada → Frío → Vencido → Ganado

**Regla de negocio:** El estado Ganado se asigna únicamente cuando el cliente inicia el proceso de onboarding.

**Campos (todos editables desde el modal de detalle):**
- `nombre` — nombre del lead o empresa
- `email` — email de contacto
- `phone` — teléfono de contacto
- `productos` — array multi-select (RFQ/OTC, Cross Border Payments, Pago de Importaciones, CVU Collect, Prime Broker)
- `tiposCliente` — array multi-select (Cliente Final / Referenciador / Agregador)
- `origen` — Referenciador / Directo / Evento / Inbound
- `referenciador`, `eventoOrigen`, `comercial`, `estado`, `notas`

**Campos eliminados en diseño final:** `empresa`, `monto estimado`.

**Selectores multi-tag:** chips interactivos toggle. Estado inicial: productos vacío, tiposCliente = ['Cliente Final'].

**Vistas:** tabla y kanban (sin drag & drop en V1). Leads creables desde Eventos con `eventoOrigen` pre-seleccionado.

---

### Eventos
Registro de eventos propios y de terceros.

**Campos:** nombre, tipo (Propio / Tercero), fecha, lugar, asistentes estimados, URL, descripción, próxima acción (equipo COM).

**Vistas:** tabla (con paginación) y cards. Filtro por mes.

**Modal de detalle — 3 tabs:**
- **Detalles**: info + URL clickeable + bloque "Próxima acción COM"
- **Leads (N)**: leads vinculados al evento. Botón "Nuevo lead" con evento pre-seleccionado. Botón `×` para desasignar.
- **Gastos**: registro por categoría con total acumulado. Categorías: Marketing, Logística, Catering, Tecnología, Viáticos, Espacio/Venue, Otros.

**Paginación:** 10 registros por página en vista tabla.

---

## Fuera de alcance — V1

- Drag & drop en kanban de Leads
- Sub-estados visibles del proceso de Alta en Cuentas
- Vista de escala temporal en Eventos
- Acciones comerciales sobre clientes onboardeados
- Funcionalidades avanzadas de Referenciadores (comisiones, fees, resumen de operaciones)
- Integración automática COM ↔ LEX
- Tags en Eventos

---

## Roadmap de versiones

**V2:** Drag & drop en kanban, métricas avanzadas, acciones comerciales sobre clientes y referenciadores, integración COM ↔ LEX para notificación de Altas aprobadas.

**V3:** Módulo de Eventos con funcionalidades avanzadas (registro de asistentes, seguimiento post-evento, ROI de evento).

---

## Artefactos generados

| Artefacto | Ruta | Estado |
|---|---|---|
| Prototipo HTML | `../prototypes/com/com_prototype.html` | Validado — iteración activa |
| Requirement Jira | REQ-18 | In Review — actualizado, 14 criterios de aceptación |

---

## Flags abiertos

**1. Objeto Referenciadores / Agrupadores compartido con CLP**
Pendiente de resolución arquitectónica antes de que Tecnología diseñe COM. COM llama a la entidad "Referenciadores" para gestionar la relación comercial; CLP llama "Agrupadores" para gestionar el acceso operativo. Ambos apuntan al mismo registro. No construir dos módulos separados.

**2. Integración COM ↔ LEX**
La vinculación entre Cuentas (COM) y el registro de Alta (LEX) es manual en V1. En V2 definir si el flujo de onboarding de LEX notifica a COM cuando una Alta es aprobada.

**3. COM no está en el roadmap 2026**
COM es una herramienta interna de soporte a la operación comercial. Conversación pendiente sobre cómo estructurar el roadmap para reflejar que Ardua construye un Core financiero modular.

**4. Sub-estados de Alta**
Los sub-estados del proceso de onboarding existen en LEX pero no se exponen en COM V1. En V2 evaluar si COM debe mostrar granularidad del proceso de onboarding.

---

## Principios de diseño aplicados

- **COM no crea cuentas.** Las cuentas son clientes — se crean vía onboarding en LEX. COM es la capa de gestión comercial encima de ese registro.
- **Referenciadores son Cuentas.** No existe un objeto "Referenciador" separado. El tipo se asigna desde Cuentas. El módulo Referenciadores es una vista filtrada.
- **Separación clara de capas:** COM edita la capa comercial. LEX es la fuente de verdad del registro del cliente.
- **Terminología consistente:** Referenciadores (no Productores, no Agrupadores) en todo el módulo COM.
- **tiposCliente en Leads → tipoComercial en Cuentas:** la clasificación comercial del lead se transfiere a la cuenta al vincularlos.
- **Campos de contacto en Leads son COM-propios.** Email y teléfono del lead son datos de prospección. Los mismos campos en LEX (post-onboarding) son read-only y provienen del registro del cliente.
- **Multi-select refleja la realidad comercial.** Un lead puede tener interés en múltiples productos y clasificarse con múltiples tipos simultáneamente.
- **El Home es por rol, no por persona.** El filtro de agente adapta las opciones según el rol activo. Los cards que no pueden filtrar siempre muestran datos globales, con etiqueta indicativa.
