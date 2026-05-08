# Design — add-lex-cuentas-cvu

## Context

Una **CVU** (Clave Virtual Uniforme) es la dirección bancaria virtual asignada a un Cliente Lex aprobado para recibir y enviar fondos. La CVU vive en el banco patrocinante — actualmente **BIND** o **COINAG** — y existe como entidad propia, distinta del Cliente: un mismo Cliente puede tener varias CVUs (una por sponsor), y la CVU tiene atributos (CBU, status, fecha de creación) que no pertenecen al legajo del Cliente.

El legacy `clientes.vue` mezcla ambas listas en una sola página de 1,419 líneas: dos sub-tabs (`Clientes` y `Cuentas`) que comparten container pero no comparten datos, queries, filtros, ni columnas. El frontend page mantiene state separado por sub-tab pero re-renderiza desde cero cuando el usuario alterna — perdiendo el cache de cada sub-tab. Esta spec separa la surface en una capability propia (`lex-cuentas-cvu`) y locks (a) que el switch de sub-tab no remontea la página, (b) los filtros canónicos, (c) el contrato de export XLSX.

```mermaid
flowchart LR
    Page[/clientes/] --> Tabs[Sub-tab segmenter]
    Tabs --> ClientesTab[Clientes tab\nsee lex-clientes]
    Tabs --> CuentasTab[Cuentas tab]
    CuentasTab --> Filters[Date range · Sponsor · Cliente]
    CuentasTab --> Table[CVUTable · @tanstack/vue-query]
    CuentasTab --> Export[Exportar XLSX CTA]
    Filters --> Query[useQuery key=['lex','cvu',params]]
    Query --> API[GET /cvu]
    Export --> XLSX[xlsx 0.18.5 · synchronous in main thread]
```

CBU/CVU es la dirección de la cuenta; CUIT es del Cliente. Esta distinción terminológica está pinneada en `discoveries/lex-discovery.md` §4.3.

---

## Decision 1 — Sub-tab via `?tab=cuentas`, no page remount on switch

### The question

¿El sub-tab Cuentas remontea la página al activarse, o coexiste el state de Clientes con el state de Cuentas?

### The decision

**No remount.** Switch de sub-tab actualiza la URL (`?tab=clientes` ↔ `?tab=cuentas`) y conmuta qué sub-tree se renderiza, pero el page-level container queda montado. Cada sub-tab tiene su propio `useQuery` con su propio query key — los caches se preservan independientes.

### Rationale

- **Velocidad de toggle.** Volver de Cuentas a Clientes con la misma data ya cargada es instantáneo.
- **Independencia de state.** Filtros de Clientes no se pisan con filtros de Cuentas.
- **Menos work al server.** Re-fetching de la lista entera al alternar es desperdicio.

### Tradeoff accepted

Mounted-but-hidden sub-tabs siguen subscritos a sus reactives — overhead pequeño pero presente. Aceptado, es ínfimo comparado con un re-fetch.

---

## Decision 2 — Row click opens summary popover, not direct navigation to /clientes/:id

### The question

Cuando un usuario clickea una fila de CVU, ¿abre el legajo del Cliente directo, abre un detalle de la CVU, o muestra un popover-summary?

### The decision

**Popover-summary.** Click en fila abre un popover lateral con: header `nombre del Cliente`, body con CUIT + dockets, footer con CTA `Ver legajo` que linkea a `/clientes/:id`. La fila no navega.

### Rationale

- **Context-stable.** El usuario que está triando CVUs por sponsor no quiere perder la lista al click.
- **Decision deliberate.** Si quiere ir al legajo, "Ver legajo" lo lleva — el extra-click es deliberado.
- **Multiple CVUs por Cliente.** Si una fila navegara, comparar dos CVUs del mismo Cliente requeriría volver atrás. Con popover, abrir/cerrar es zero-cost.

### Tradeoff accepted

Un usuario que sí quiere navegar tiene que hacer 2 clicks (fila → "Ver legajo"). Aceptado — la lista es la herramienta primaria, el legajo es secundario.

---

## Decision 3 — Default date range is the last 30 days; Rango de fechas is leftmost

### The question

¿Cuál es el rango por default? ¿Hoy? ¿Última semana? ¿Sin filtro?

### The decision

**Default: hoy menos 30 días → hoy.** El picker se renderiza ya con esa selección al abrir la pestaña sin params explícitos. Per `core-data-tables` Requirement sobre period filter, Rango de fechas es la izquierda absoluta del L3 row.

### Rationale

- **30 días es el sweet spot.** Lo suficientemente reciente para ver CVUs activas, lo suficientemente amplio para detectar outliers semanales.
- **Sin filtro = listing entero** sería costoso para el server y poco útil para la UI.

### Tradeoff accepted

Un usuario que necesite ver CVUs del año pasado tiene que cambiar el rango explícitamente. Aceptado — es un caso minoritario.

---

## Decision 4 — Exportar XLSX cubre el resultado filtrado completo (no sólo la página visible)

### The question

¿El export XLSX incluye sólo las 25 filas visibles, o las 240 filas que matchean los filtros actuales? ¿Las 12,000 que matchean si quitan el filtro?

### The decision

**Cubre el filtered result set completo.** El export NO es "la página visible"; el export es "todo lo que matchea los filtros". El filename refleja el rango: `lex-cuentas-${from}_${to}.xlsx` con format `dd-MM-yyyy`. El sheet contiene las columnas de la tabla en mismo orden + una columna oculta `cvu_id` para traceability. Para resultsets de >10k filas, un toast warning notifica al usuario que la app puede frizar unos segundos (parsing en main thread).

### Rationale

- **Mental model claro.** "Lo que veo en la tabla, exportado." Si hay 240 rows que matchean, el archivo tiene 240.
- **`cvu_id` oculta** — necesaria para que un sheet exportado pueda referenciar back al sistema (e.g. para audits) sin contaminar la vista.
- **Warning honesto.** Frizar 5-10 segundos al exportar 12k filas es preferible a moverlo a Web Worker (más complejidad para un caso poco frecuente).

### Tradeoff accepted

Para >50k filas, parsing puede tardar más de 30s. Aceptado para v1 — se mueve a Web Worker en un change futuro si el negocio lo requiere.

---

## Decision 5 — Exportar gated a ADMIN_LEX; tab visible a los tres roles

### The question

¿Quién ve la tab Cuentas? ¿Quién puede exportar?

### The decision

Per la matriz en `lex-roles`:

- **Tab visible**: VIEWER_LEX, COMMERCIAL_LEX, ADMIN_LEX (todos).
- **Exportar XLSX**: ADMIN_LEX only.
- Filtrado server-side de qué CVUs cada rol ve (`assigned_users`, `visible_clients`) es responsabilidad del backend.

### Rationale

- **Read es safe.** CVUs de Clientes que el usuario está autorizado a ver no exponen información sensible incremental.
- **Export es sensible.** Un dump XLSX de CVUs es regulatorio (puede contener data de varios Clientes); ADMIN-only es la regla habitual.

### Tradeoff accepted

Un COMMERCIAL_LEX que necesite un XLSX para su workflow tiene que pedirle a un ADMIN_LEX. Aceptado — paridad con la regla de exportación en otras pages.

---

## Out of scope

- **Detail view de una CVU individual** — el popover-summary alcanza; un detail page dedicado sería futuro.
- **Aggregations / sumas** — no hay KPIs en L2 para Cuentas en v1.
- **Export por sponsor separado** — el export aplica a un único set filtrado; si querés por sponsor, filtras por sponsor primero.
- **Reglas de matching CVU ↔ Cliente** — vive en backend.
