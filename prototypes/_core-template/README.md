# Core Template · Ardua Design System

> Versión: 1.15 | Última actualización: 28/04/2026
> Parte del estándar de UI del core — referenciado en los session contexts de cada módulo.
> **Uso obligatorio** para prototipos de módulos del core. Ver `prototypes/README.md` para la convención completa.

---

## Propósito

Este template es el **punto de partida único** para todos los prototipos del core de Ardua (OPS, TRD, FIN, CLP, COM, LEX). Captura el estándar de arquitectura de interfaz validado en producción del prototipo OPS y lo expone como una base clonable, minimalista y anotada.

**Objetivo:** que ningún prototipo nuevo arranque desde cero, y que el sistema de diseño evolucione en un solo lugar.

---

## Arquitectura del template

### Tres niveles de control sobre los registros

Los módulos del core operan sobre datasets con **tres niveles ortogonales de
control**. Cada nivel opera dentro del anterior; la jerarquía es de **alcance**,
no de prioridad. Este es el marco conceptual que da sentido al resto de la
arquitectura — entender dónde vive cada control en el L1/L2/L3 y por qué.

```
┌─ SEGMENTACIÓN ──────────────────────────────────────┐
│  Define qué subconjunto del universo del módulo     │
│  estás mirando. Cambia KPIs, filtros disponibles,   │
│  columnas y acciones. Mutuamente excluyente.        │
│  Ej: Activos / Histórico · Catálogo / Histórico     │
│                                                     │
│  ┌─ VISTA ───────────────────────────────────────┐  │
│  │  Cómo lo mirás. No cambia datos.              │  │
│  │  Lista / Tarjetas / Tablero                   │  │
│  │                                               │  │
│  │  ┌─ FILTROS ─────────────────────────────┐    │  │
│  │  │ Restringen por valores de atributos.  │    │  │
│  │  │ Multi-valor, ortogonales.             │    │  │
│  │  │ Estado granular · Responsable · etc.  │    │  │
│  │  │ Período (filtro con privilegios UI)   │    │  │
│  │  └───────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### Segmentación

Define qué subconjunto del **universo del módulo** estás mirando. Es
**mutuamente excluyente**: el usuario está en un segmento por vez. Cambia la
naturaleza de los datos, no solo qué subset ves.

Cuando cambia el segmento, cambian:
- Los **KPIs** (no solo sus valores: las métricas mismas son distintas).
- Los **filtros disponibles** (algunos solo aplican en ciertos segmentos).
- Las **columnas de la grilla**.
- Las **acciones disponibles** sobre cada registro.

Ejemplos canónicos del core:
- `Activos / Histórico` (Inbox, Alertas en perfiles B/D).
- `Catálogo / Histórico` (Reportes — definiciones vs generaciones, entidades
  conceptualmente distintas).
- `Nuevas / Histórico` (Alertas).

**Ubicación UI:** en `.ph-actions` del L1, como sub-tabs (`.qtabs` + `.qtab`).
Ver §"Segmentación en el header — implementación con sub-tabs" más abajo para
el contrato de implementación.

#### Vista

Cómo se representa visualmente el dataset segmentado. **No cambia los datos**.

Tres vistas posibles:
- **Lista** — tabla con paginación. Default para módulos L1/L2/L3.
- **Tarjetas** — registros con identidad visual propia (clientes, proveedores,
  leads, reportes del catálogo).
- **Tablero** — solo para módulos con máquina de estados. **Renderiza una
  columna por cada estado declarado** — el número de columnas es N, igual al
  número de estados de la máquina del módulo. No asume 3 columnas; un módulo
  con 5 estados tendrá 5 columnas, uno con 7 tendrá 7.

Cada módulo declara qué vistas soporta. Si solo soporta una, el toggle no se
renderiza. Ver §"Vistas del módulo (Lista / Tarjetas / Tablero)" más abajo para
el contrato de declaración.

**Ubicación UI:** en `.ph-actions` del L1, como toggle de íconos, después del
segmentador y antes del Main CTA.

#### Filtros granulares

**Restringen** el dataset segmentado por valores específicos de atributos.
Multi-valor, ortogonales entre sí, opcionales (el default es "sin filtro
aplicado"). **No cambian la naturaleza del dataset** — solo restringen qué
registros del segmento se muestran.

Ejemplos: Estado granular (pending/in_progress dentro del segmento Activos),
Responsable, Tipo, Categoría, Sociedad, Severidad.

**Ubicación UI:** en L3 (header de la sección de registros), como dropdowns
portal (`.fsel` con `.dd`).

##### El caso del filtro de período

El filtro de período (día/semana/mes/trimestre/año) es **un filtro con
privilegios de UI**, no una categoría conceptual aparte. Filtra por el atributo
de fecha del registro como cualquier otro filtro, pero tiene cuatro propiedades
especiales que justifican un trato distinto en la UI:

1. **Mandatorio** — siempre tiene un valor seleccionado, no existe "todos los
   períodos".
2. **Default explícito** (típicamente "semana" o "mes" según el módulo).
3. **Single-value** — nunca multi-select.
4. **Afecta la agregación de los KPIs** además de filtrar la grilla — cuando el
   módulo tiene KPIs agregados, el período define la ventana de agregación.

Justificación: como nunca tiene sentido ver "todos los registros de toda la
historia", se trata como una **lente temporal siempre activa**. Esto justifica
que en algunos módulos viva en posición prominente (al inicio de la fila de
filtros), pero **no que sea una categoría conceptual aparte**.

Implementación cuando aplica:
- Sin opción "Todos" en el dropdown.
- Siempre con default visible.
- Posición fija al inicio de la fila de filtros.
- Cuando el módulo tiene KPIs agregados, el período define la ventana de
  agregación.

Referencia de implementación viva: `core-trd-frontend/src/components/Liquidity/LiquidityFilters.tsx`
— el `LiquidityFilters` type incluye `period` junto a los demás filtros, pero
`setPeriod` está separado de `updateFilters` en el hook (señal de que
conceptualmente fue tratado distinto).

#### Consecuencias de diseño

- **L1 (page header):** Segmentador (sub-tabs) · Toggle de Vista · Main CTA.
  **Sin filtros granulares.**
- **L2 (KPIs):** computados sobre el segmento + filtros activos. Cuando el
  módulo tiene filtro de período, el período define la ventana de agregación.
- **L3 (header de la sección de registros):** búsqueda + filtros granulares
  (incluido período cuando aplica).
- **Cuerpo del módulo:** la vista activa renderizando el dataset segmentado y
  filtrado.

**Anti-patrones a evitar:**

- Mezclar segmentación con filtros (ej: poner Activos/Histórico como un filtro
  de Estado en un dropdown del L3 — son conceptualmente cosas distintas).
- Poner filtros granulares en L1 (ensucia el header con controles que
  pertenecen a L3).
- Tratar de aplicar todos los filtros en todos los segmentos (algunos solo
  tienen sentido en uno — ej. SLA solo aplica a Activos, no a Histórico).
- Tratar el filtro de período como una categoría conceptual aparte de los
  filtros granulares — es un filtro más, con privilegios de UI por las cuatro
  propiedades arriba.

### Layout base

```
┌──────────┬──────────────────────────────────────────┐
│          │  Topbar (breadcrumb)                     │
│ SIDEBAR  ├──────────────────────────────────────────┤
│          │                                          │
│  Brand   │            MAIN                          │
│  Home    │                                          │
│  Bloque1 │   ┌────────────────────────────────┐    │
│   · Mod  │   │ L1 · Page Header               │    │
│   · Mod  │   │    título · sub · CTAs         │    │
│  Bloque2 │   ├────────────────────────────────┤    │
│   · Mod  │   │ L2 · KPI Cards (3-5)           │    │
│          │   ├────────────────────────────────┤    │
│  Account │   │ L3 · Section Header (buscador │    │
│          │   │      + filtros) + Tabla +      │    │
│          │   │      Paginación                │    │
│          │   └────────────────────────────────┘    │
└──────────┴──────────────────────────────────────────┘
```

### Reglas invariantes

- **SideBar:** Brand → [4 genéricos del core] → [Bloques del dominio → Módulos] → `sb-sp` → Account. Siempre en ese orden.
- **Genéricos del core:** Dashboard, Inbox, Alertas, Reportes — al tope, al mismo nivel, **sin** `<div class="sb-section">` que los agrupe.
- **Account:** siempre al pie (después del espaciador `sb-sp`).
- **Main con listado:** obligatoriamente L1/L2/L3. No omitir líneas.
- **CTAs en L1:** máximo 3. Más satura y diluye la jerarquía.
- **KPIs en L2:** 3-5 cards. Más de 5 cansa visualmente.
- **Body fijo:** el scroll vive en el contenido interno del Main, no en el `<body>`.

### Breadcrumb del topbar — convención

**El breadcrumb NUNCA incluye el nombre de la aplicación.** El usuario ya
sabe dónde está parado por el sidebar y el brand; repetirlo en cada vista
es ruido visual. La estructura es:

```
[bloque] / módulo / [sub-tab o sección]
```

- **Genéricos sin bloque:**
  - `Dashboard` (sin separadores, una sola etiqueta).
  - `Inbox`
  - `Alertas / Nuevas` · `Alertas / Histórico`
  - `Reportes / Catálogo` · `Reportes / Histórico`

- **Específicos en bloque del dominio:**
  - `Compliance / Alertas / Nuevas` (si la app re-ubicara Alertas adentro de un bloque — no es el caso del template, pero sirve de regla general).
  - `Bloque ejemplo / Módulo Esp. A`
  - `Operaciones / Movimientos / Tab Pendientes`

El template implementa esto con un único `<div class="bc" id="bc"></div>`
en la topbar y un helper `renderBC(segments)` en el JS:

```js
renderBC(['Dashboard']);                          // Genérico simple
renderBC(['Alertas', 'Nuevas']);                  // Genérico con sub-tab
renderBC(['Bloque ejemplo', 'Módulo Esp. A']);    // Específico en bloque
```

`renderBC` se llama desde `nav(mod)` y desde los handlers de sub-tab
(`setAlrSubtab` / `setRepSubtab`). El nombre del bloque se calcula
automáticamente con `sidebarBlockOf(niEl)` leyendo el
`<div class="sb-section">` previo al `.ni` activo del sidebar — al clonar
para una app nueva no hay que tocar la lógica del breadcrumb, solo
mantener la estructura del sidebar.

**No hardcodear** el nombre de la app en el breadcrumb. Si una vista
profundiza más allá del módulo (drawer, modal, sub-sección), pasarlo
como segmento adicional al `renderBC`.

### Dropdowns en formularios — componente custom, no `<select>` nativo

Los formularios y modales **nunca usan `<select>` nativo**. En su lugar
usan `.fsel-block` (variante full-width del `.fsel`) con un portal `.dd`
inyectado en `document.body`.

**Por qué:** el `<select>` nativo del navegador/OS ignora los estilos
del prototipo (dark mode, fuentes, paddings, hover) y rompe la
consistencia visual del producto. El usuario alterna entre componentes
custom (filtros de tabla, menú de Acciones) y selects nativos sin razón
funcional, lo que se siente como una herramienta inacabada.

**Estructura HTML:**

```html
<div class="fg">
  <label class="fl">Categoría *</label>
  <button class="fsel fsel-block" id="btn-mi-id" onclick="openFormDD(event,'mi-id')"></button>
</div>
```

El contenido del botón (label + chevron + dot opcional) lo pinta
`updateFormDDLabel(id)` — el HTML inicial del button puede ir vacío.

**Estructura JS:**

```js
const FORM_DD      = { 'mi-id': '' };                  // estado actual
const FORM_DD_OPTS = {
  'mi-id': { label:'Mi label', placeholder:'Seleccionar...', items:[
    {v:'A', l:'Opción A', dot:'var(--green)'},         // dot opcional
    {v:'B', l:'Opción B'},
  ]},
};
```

Funciones del subsistema (vienen ya en el template):
`openFormDD(e, id)` · `closeFormDD()` · `selectFormDD(id, val, e)` ·
`updateFormDDLabel(id)`. `closeAllPortals()` ya invoca a
`closeFormDD()` para que un click fuera cierre el dropdown.

**Reglas:**
- Si el dropdown depende de otro (ej. Cuenta depende de Sociedad),
  resetear el dependiente al cambiar el padre y poblar sus `items`
  dinámicamente. Ver patrón `cm-soc → cm-cuenta` en FIN.
- Si los `items` se cargan de un dataset al abrir el modal (ej.
  `CATEGORIES` en Editar Reporte), poblar `FORM_DD_OPTS[id].items` en
  la función `openXModal()` antes de llamar a `updateFormDDLabel(id)`.
- Z-index del portal: `9999` (sobrepasa el modal `.ov` que tiene
  `z-index: 500`).
- En modales con varios dropdowns, llamar `closeFormDD()` en
  `closeXModal()` para limpiar al cerrar.

**Aplicado en el template a:** modales **Crear Registro**
(`create-categoria`, `create-estado`) y **Editar Reporte**
(`rep-ed-cat`, `rep-ed-period`). En FIN además: modal **Cargar
movimiento manual** (4 dropdowns con dependencia Sociedad→Cuenta) y
modal **Asignar cuenta de origen** (1 dropdown con items filtrados por
moneda).

### Acciones por fila → dropdown contextual, no drawer

Patrón estándar para tablas de registros con columna `Acciones`:

- **Click en la fila** (en cualquier `<td>` que no sea el de Acciones)
  → abre el detalle (drawer lateral o modal de detalle).
- **Click en el botón de 3 puntos** (`.kc-menu-btn` en `<td class="tc">`
  de la última columna) → abre **dropdown contextual** con las acciones
  disponibles para ese registro.
- El `<td class="tc">` lleva `onclick="event.stopPropagation()"` para
  que el click en el botón **no** dispare también el click de la fila.

**Anti-patrón:** que el botón de Acciones repita el comportamiento del
click en la fila (abrir el drawer). Eso desperdicia el espacio del
dropdown y le quita al usuario el acceso rápido a las acciones del
dominio. Si lo único que el menú tendría que ofrecer es "Ver detalle",
quitar la columna entera y dejar solo el click en la fila.

**Acciones contextuales según estado:**

Las acciones disponibles **dependen del estado del registro**. Una
acción no aplicable se muestra con `.di.dis` + `<span class="dtag">
Estado</span>` + tooltip (`title=`) con el motivo. Ejemplo (Alertas):

| Estado del registro | Acciones disponibles |
|---|---|
| `new` (sin asignar) | Asignarme · Marcar resuelta · Descartar · Ver detalle |
| `in_review` (asignada) | Reasignar · Marcar resuelta · Descartar · Ver detalle |
| `resolved` / `dismissed` (cerradas) | Reabrir · Ver detalle |

**Implementación JS — dos sistemas conviviendo:**

- **Módulo A (canónico, v1.15+)** → usa el **sistema de Acciones
  declarativas via Manifest** (ver §"Sistema de Acciones declarativas
  via Manifest" más abajo). Las acciones se declaran en `manifests/`
  como datos; el subsistema (`MFmenu`, `resolveActions`,
  `MFopenDialog`) las renderiza, evalúa y ejecuta. Esta es la
  forma canónica para nuevos módulos del template.
- **Inbox y Alertas (legacy)** → conservan el sistema in-line
  (`actionsPortal`, `actionsIdx`, `closeActions`, `togActionsAlr`,
  `doActionAlr`). Migración pendiente cuando se aborde el REQ Alertas
  / Inbox transversal del framework.

**No mezclar ambos en un módulo nuevo.** Si estás clonando el template
para un prototipo nuevo, partí del Módulo A (manifest) y replicá la
forma declarativa. El sistema legacy queda solo para los genéricos
no-migrados todavía.

```html
<!-- 1. Cargar el manifest del módulo antes del script principal -->
<script src="manifests/[app].[modulo].[tipo].actions.js"></script>
```

```js
// 2. En el render de la fila / card / kanban-card, llamar al subsistema:
'<button class="abtn" onclick="MFmenu(event,\'[app].[modulo].[tipo]\',\''+r.id+'\')">…</button>'

// 3. Registrar el resolver del módulo en initApp:
MF_RECORD_RESOLVERS['mimodulo'] = (id) => MIS_DATOS.find(r => r.id === id);
MF_AFTER_MUTATION['[app].[modulo].[tipo]'] = renderTablaDelModulo;
```

**Aplicado en el template a:** Módulo Específico A — manifest
`manifests/ejemplo.modulo-a.actions.js` con 5 acciones (Asignar
Responsable, Aprobar / Rechazar, Generar comprobante, Confirmar,
Anular) + 1 module CTA (Crear Registro). Inbox y Alertas: legacy in-line
hasta su REQ transversal.

### Main CTA del módulo — siempre con color principal

El **CTA principal de cada módulo** (`Crear`, `Cargar`, `Exportar`,
`Generar`, etc.) **siempre va con `class="btn btn-p"`** (fondo color
brand). Nunca con `class="btn"` solo (botón outline transparente).

**Por qué:** el Main CTA es la acción primaria del módulo. Visualmente
debe destacarse del resto de los controles del header (sub-tabs, toggle
de vistas, botones secundarios). Un CTA outline en `.ph-actions` se
confunde con los demás botones y diluye la jerarquía.

**Reglas:**
- **Un solo Main CTA por módulo** — la regla por default es que cada
  módulo expone una sola acción primaria en `.ph-actions`, con `btn-p`.
  (Ej: `Crear Registro` en Módulo A, `Exportar a CSV` en Inbox/Alertas,
  `Cargar movimiento manual` en Tesorería). Si surge la necesidad de un
  segundo CTA secundario en el header, revisar primero si esa acción no
  pertenece al menú contextual de la fila/registro o al footer del modal
  correspondiente — el header se ensucia rápido y diluye la jerarquía.
- Si el módulo **excepcionalmente tiene varios CTAs en el header**, solo
  uno es Main → `btn-p`; los demás van con `btn` outline. Documentar el
  motivo en un comentario `// DECISION:` en el código del módulo.
- Los CTAs **contextuales** (visibles solo en cierto sub-tab, ej.
  `Descargar todo (ZIP)` solo en histórico de Reportes) siguen la misma
  regla: si son la acción principal del contexto, `btn-p`.
- **Excepciones**: `btn-g` (verde) para acciones de confirmación
  destructiva-pero-positiva (ej. "Aprobar y procesar"); `btn-r` para
  acciones destructivas (ej. "Rechazar"). Estos también son colored, no
  outline.

### Segmentación en el header — implementación con sub-tabs

Esta sección es la **implementación concreta del nivel Segmentación** del
framework de tres niveles (ver §"Tres niveles de control sobre los registros"
más arriba). Los `.qtabs` que viven en `.ph-actions` no son "filtros que
casualmente están en sub-tabs": son el **segmentador del módulo**, y se
renderizan con el componente sub-tabs porque visualmente comunica bien la
mutua exclusión.

Los **sub-tabs que segmentan el universo del módulo** (Activos/Histórico,
Nuevas/Histórico, Catálogo/Histórico, etc.) viven **siempre en
`.ph-actions` del L1 Page Header**, en la misma línea que el título del
módulo, las vistas (toggle Lista/Tarjetas/Tablero si aplica) y el CTA principal.
Nunca debajo de los KPIs ni como banda separada en el cuerpo del módulo.

**Alcance del patrón** — aplica solo a sub-tabs que **segmentan el universo
del módulo** (mismo modelo de datos, distinto subconjunto del universo:
activos vs histórico, catálogo vs generaciones, etc.). **No aplica** a qtabs
que dividen el módulo en **secciones funcionales** distintas (modelos de datos
diferentes, vistas con su propio CTA y KPIs propios). Caso típico: Tesorería
de FIN tiene 4 qtabs (Posición / Movimientos / Carga Manual / Cola de
Asignación) que son secciones funcionales del módulo — esos qtabs viven
debajo del `.ph` para que el Main CTA del módulo (ej. "Cargar movimiento
manual") quede siempre en la línea del título.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Inbox                  [Activos · Histórico] [Lista│Tarjetas│Tablero] [+ CTA]│
│ Bandeja de entrada — solicitudes…                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPIs cards…                                                                  │
│ Tabla / Cards-grid / Kanban — según vista activa                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Por qué:** los sub-tabs son el **segmentador del módulo** (qué subconjunto
del universo estás mirando) y conviven funcionalmente con el toggle de vista
y el CTA principal. Tenerlos en una banda separada debajo de los KPIs duplica
niveles de jerarquía y empuja el contenido hacia abajo. El header concentra
todos los controles de "qué estoy mirando y qué puedo hacer".

**Orden dentro de `.ph-actions`** (de izquierda a derecha):
1. **Sub-tabs / Segmentador** (`.qtabs` con sus `.qtab` y `.qtab-count`) — el
   segmentador primero (define el subconjunto del universo).
2. **Toggle de vistas** (`.view-toggle` con hasta 3 botones:
   Lista / Tarjetas / Tablero) si el módulo declara más de una vista.
3. **CTA principal** (`Exportar a CSV`, `Crear`, etc.) — la acción al
   final.

**Reglas:**
- Los `qpanel`s siguen viviendo en el cuerpo del módulo (después de los
  KPIs); solo el `.qtabs` se muda al header.
- En módulos con varias vistas, los sub-tabs solo aplican en la(s)
  vista(s) que los usan (típicamente Lista y Tarjetas). En Tablero, los
  sub-tabs deben ocultarse vía JS, salvo que el módulo justifique
  mostrarlos.
- La regla CSS `.ph-actions .qtabs{margin-bottom:0}` ya está en el
  template — los `qtabs` mantienen su `margin-bottom:18px` solo cuando
  viven sueltos en el body (caso legacy / módulos custom).
- El breadcrumb sigue integrando el sub-tab como antes:
  `[bloque] / módulo / [sub-tab]`. Ese contrato no cambia.

**Aplicado en el template a:** Inbox (Activos/Histórico), Alertas
(Nuevas/Histórico), Reportes (Catálogo/Histórico). Cualquier módulo
custom que clone debe replicarlo.

### Vistas del módulo (Lista / Tarjetas / Tablero)

Cada módulo del template puede ofrecer hasta **tres vistas** del mismo
dataset, declaradas como un sistema **state-driven** por módulo. El
toggle vive en `.ph-actions` (después de los sub-tabs y antes del Main
CTA, mismo orden v1.10/v1.11) y se renderiza dinámicamente según las
vistas que el módulo declara.

**Las tres vistas:**

- **Lista** — vista por defecto en módulos L1/L2/L3. Tabla con
  paginación. Soporta volumen alto y consulta histórica.
- **Tarjetas** — registros con identidad visual propia (entidades:
  clientes, proveedores, leads, reportes del catálogo). Mismo dataset y
  filtros que Lista, distinto layout. Cada card tiene tres zonas
  obligatorias: **header** (id + título principal + botón 3 puntos),
  **body** (4–6 campos clave) y **footer** (badges de estado/tipo +
  meta). El template provee `.cards-grid` (grid responsive) y
  `.card-item` (card contenedora); el contenido lo decide cada módulo
  en `render<Mod>Card(r)`.
- **Tablero** — solo para módulos cuyos registros tengan máquina de
  estados. Renderiza una columna por cada estado declarado, con drag &
  drop según las reglas declaradas.

**Declaración por módulo:**

```js
// Inbox y Módulo A: las tres vistas (ambos tienen máquina de estados)
const INB_VIEWS  = ['list', 'cards', 'kanban'];
const MODA_VIEWS = ['list', 'cards', 'kanban'];

// Si un módulo no tiene state machine, declarar ['list', 'cards'] (sin Tablero).
// Si solo declara ['list'], el toggle NO se renderiza.
```

Si un módulo incluye `kanban` en `MOD_VIEWS` debe declarar también
`MOD_STATES` (estados con `column_label`, `order`, `terminal`) y
`MOD_TRANSITIONS` (reglas de drag & drop por par origen→destino):

```js
const INB_STATES = {
  pending:     { label:'Pendiente',  column_label:'To Do',       order:1, terminal:false },
  in_progress: { label:'En curso',   column_label:'In Progress', order:2, terminal:false },
  completed:   { label:'Completado', column_label:'Done',        order:3, terminal:true  }
};

const INB_TRANSITIONS = {
  'pending->in_progress':   { mode:'free',  sideEffect:'auto_assign' },
  'pending->completed':     { mode:'modal', sideEffect:'auto_assign' },
  'in_progress->completed': { mode:'modal' },
  'in_progress->pending':   { mode:'free',  sideEffect:'unassign'    }
};
```

**Modos de transición:**

- **`free`** — drag libre con feedback visual y opcional `sideEffect`
  (función nombrada que el módulo registra en `MOD_SIDE_EFFECTS`).
- **`modal`** — el drop dispara el modal de cierre / confirmación del
  módulo. El estado solo cambia si el modal se confirma.
- **`blocked`** — la columna destino rechaza el drop con feedback de
  error. Si una transición no está declarada, se bloquea por default.
  Estados con `terminal:true` quedan implícitamente bloqueados como
  origen y como destino (salvo `mode:'modal'`).

**Card del Tablero vs card de Tarjetas:** las dos comparten la misma
render function `render<Mod>Card(r, mode)`. El parámetro `mode` (`'cards'`
o `'kanban'`) permite que el módulo decida diferencias menores (ej. el
Tablero omite el footer porque la columna ya indica el estado). Si las
diferencias son mayores, las maneja la propia función — el template no
fuerza un layout único.

**API que provee el template (genérica):**

| Función | Qué hace |
|---|---|
| `registerModule(mod, cfg)` | Registra el módulo en `MOD_REG`. `cfg` declara `views`, `states?`, `transitions?`, `sideEffects?`, `stateField?` (nombre del campo de estado en el registro — default `'state'`), `kanbanSort?` (orden custom dentro de cada columna del Tablero), hooks (`onView`, `onModalTransition`, `afterTransition`, `getItems`, `getItem`, `renderCard`). |
| `renderViewToggle(mod, slotId)` | Renderiza los botones del toggle según `MOD_REG[mod].views`. Si solo hay una vista, oculta el slot. |
| `setView(mod, view)` | Activa la vista, marca el botón `.on` y dispara el hook `onView` del módulo. |
| `renderKanban(mod)` | Construye las columnas del Tablero leyendo `MOD_REG[mod].states` y populando con `getItems()` + `renderCard()`. Llama a `bindKanbanDnD(mod)` al terminar. |
| `bindKanbanDnD(mod)` | Cablea drag & drop sobre el board `#kb-<mod>` con event delegation. Lee `MOD_REG[mod].transitions` para validar drops. |
| `handleKanbanTransition(mod, item, target)` | Despachador genérico. Ejecuta `sideEffect`, dispara modal, mueve estado o bloquea según `MOD_TRANSITIONS`. |
| `renderCardsGrid(mod, gridId, items, emptyMsg)` | Renderiza un array de items como cards en un `.cards-grid`. |
| `applyListCardsMode(containerId, view)` | Toggle interno entre tabla y grid de cards dentro de un contenedor `.view-list-cards`. |
| `setKanbanAxis(mod, axisKey)` | Cambia programáticamente el eje activo del Tablero (sin pasar por el dialog). |
| `openKanbanAxisDialog(mod)` / `closeKanbanAxisDialog()` / `confirmKanbanAxis(mod, key)` | Subsistema del dialog de selección de eje (multi-axis). |

#### Tablero multi-axis (kanban con eje configurable)

Algunos módulos del core gestionan registros que tienen **más de una máquina
de estados relevante simultáneamente**. Caso canónico: en FIN, un movimiento
operativo tiene tres estados conviviendo —el `status` del rail (origen OPS,
read-only), la `imputación contable` (FIN, drag&drop libre) y la
`conciliación bancaria` (FIN, drag&drop libre). Forzar al usuario a elegir
una sola "vista Tablero" hardcodeada perdería la otra dimensión.

El template soporta esto declarando **ejes** en lugar de un único `MOD_STATES`:

```js
registerModule('mov', {
  views: ['list', 'cards', 'kanban'],
  axes: {
    'fin.imput': {
      label: 'Imputación contable (FIN)',
      description: 'Flujo de imputación · drag&drop libre',
      stateField: 'fin.imput',                  // dot-path soportado
      states: MOV_STATES_IMPUT,
      transitions: MOV_TRANSITIONS_IMPUT
    },
    'fin.conc': {
      label: 'Conciliación bancaria (FIN)',
      stateField: 'fin.conc',
      states: MOV_STATES_CONC,
      transitions: MOV_TRANSITIONS_CONC
    },
    'status': {
      label: 'Estado operativo (OPS)',
      description: 'Estado del rail · read-only desde FIN',
      stateField: 'status',
      states: MOV_STATES_STATUS,
      transitions: {},
      readOnly: true                            // los ejes read-only bloquean todo drag
    }
  },
  defaultAxis: 'fin.imput',
  axisDialogTitle: '¿Cómo querés organizar el Tablero?',
  axisDialogSub: 'Cada eje refleja una máquina de estados distinta.',
  // hooks (afterTransition, onModalTransition, onBlocked) reciben axisKey adicional
  // para discriminar comportamiento por eje.
  ...
});
```

**Comportamiento:**

- Cuando el módulo declara **>1 eje**, al activar la vista Tablero por primera vez
  en la sesión el template abre un **dialog** con la lista de ejes (cada uno
  muestra `label`, `description` y un chip `read-only` cuando aplica).
- La elección persiste durante la sesión (`cfg.currentAxis`). El header del
  Tablero muestra un chip *"Organizando por: <eje>"* con un botón "Cambiar
  eje" que vuelve a abrir el dialog.
- Ejes con `readOnly: true` reflejan estados de origen (otra app del core como
  fuente de verdad). Las columnas se renderizan pero el drag está bloqueado y
  los `transitions` se ignoran.
- `stateField` admite **dot-paths** (`'fin.imput'`, `'ops.status'`) — los
  helpers `_resolveField` / `_setField` resuelven anidamiento.
- `kanbanEmpty` puede declararse plano (eje único) o anidado por `axisKey` con
  un mapa por estado para mensajes específicos por eje.
- Las hooks reciben un parámetro adicional `axisKey`:
  `afterTransition(item, target, tr, fromState, axisKey)` — útil para que un
  módulo discrimine, por ejemplo, qué `toast` mostrar según en qué eje se
  hizo la transición.

**Compatibilidad hacia atrás:** un módulo que declara `states` + `transitions`
directos (la forma legacy: Inbox, Alertas, Módulo A) se promueve internamente
a un eje único con key `'default'`. Sigue funcionando sin tocar nada — el
dialog no aparece porque hay un solo eje.

**Cuándo usar multi-axis:**

- Cuando el dataset tiene **dos o más máquinas de estado conceptualmente
  ortogonales** y todas son útiles para gestionar el flujo de trabajo.
- Cuando uno de los estados viene de **otra app del core como origen**
  (`status` OPS, `status` TRD) y FIN agrega su propia gestión por encima:
  declarar el de origen como `readOnly: true` para que el usuario lo pueda
  visualizar agrupado pero no modificar.

**Cuándo NO usar multi-axis:** la mayoría de los módulos tienen una única
máquina de estados clara (Inbox, Alertas, un workflow simple). Forzar
multi-axis cuando hay un solo flujo agrega ruido (el dialog) sin valor.

**Anti-patrón:** declarar `'kanban'` en `MOD_VIEWS` sin declarar
`MOD_STATES`. El template loguea un warning en consola y omite la vista
del toggle.

**Anti-patrón:** declarar **dos ejes con el mismo `stateField`** — son la misma
máquina disfrazada. Si dos lecturas del mismo campo son útiles
conceptualmente (ej. agrupada vs. desagregada), refactorizá el modelo de
estados, no dupliques el eje.

**Reglas:**
- `'list'` debería estar siempre en módulos L1/L2/L3 (default).
- `'cards'` se incluye cuando el módulo gana valor visual mostrando
  cada registro con identidad propia.
- `'kanban'` se incluye solo si hay máquina de estados.
- Sub-tabs Activos/Histórico, búsqueda, filtros y paginación aplican a
  Lista y Tarjetas; en Tablero los sub-tabs se ocultan vía la lógica
  del módulo (regla v1.9).
- En Tarjetas, la cantidad de cards por "página" es la misma que el
  límite seleccionado para Lista — la paginación es compartida.

**Aplicado en el template a:** Inbox (las 3 vistas, Tablero state-driven
declarando `INB_STATES` / `INB_TRANSITIONS`), Alertas (las 3 vistas,
máquina canónica `new → in_review → resolved/dismissed` declarada en
`ALR_STATES` / `ALR_TRANSITIONS`; ambos terminales requieren modal de
cierre con justificación) y Módulo Específico A (las 3 vistas, máquina
de estados `PENDIENTE → ACTIVO → INACTIVO` declarada en `MODA_STATES`
con `INACTIVO` como `terminal:true`; transiciones libres entre estados
no terminales). El sistema de **multi-axis** está soportado por el
template pero ningún módulo del template lo usa todavía — la
implementación de referencia viva está en `prototypes/fin/fin-prototype.html`
(módulos Operaciones con 3 ejes y Cotizaciones con 2 ejes).

**Diferenciación visual por severidad** (cuando el módulo expone una
señal de prioridad/criticidad, ej. `severity` en Alertas): el template
provee clases `.sev-critical` / `.sev-high` / `.sev-medium` / `.sev-low`
que aplican una **banda lateral coloreada** a los elementos:

- `.card-item.sev-*` y `.kanban-card.sev-*` → borde izquierdo de 3px
  (rojo / ámbar / azul / gris).
- `tr.sev-* > td:first-child` → mismo accent vía `box-shadow inset 3px`
  en la primera celda de la fila.

La intención es que la criticidad sea legible de un vistazo, antes que el
usuario lea el badge. Adicionalmente, cada módulo puede declarar
`kanbanSort(a, b)` en su registro para imponer un orden propio dentro de
cada columna del Tablero — Alertas la usa para ordenar **critical antes
que high antes que medium antes que low** y, a igual severidad, el
evento más reciente arriba.

---

## Módulos genéricos del financial-core

Cuatro módulos del template son **genéricos** — aparecen en todas las
aplicaciones del core (OPS, TRD, LEX, CLP, COM, FIN) con la misma
arquitectura y vocabulario, pero cada app activa solo las capacidades
opcionales que necesita. Ver `framework/financial-core-modules.md` (§3
del framework) para el modelo de "núcleo + capacidades opcionales".

### Estado en el template

| Módulo | Perfil implementado | Prototipo canónico |
|---|---|---|
| **Dashboard** | Completo (KPIs + alertas embebidas + vencimientos + actividad) | (sin canónico aún · §10 del framework) |
| **Inbox** | **Skeleton funcional canónico** · vista Lista (default) + Tarjetas + Tablero Kanban con drag&drop · drawer con timeline · modal de cierre con `closeActions` por tipo · Tablero state-driven (declaración via `INB_STATES` / `INB_TRANSITIONS`) | `prototypes/ops/ops-inbox-prototype.html` |
| **Alertas** | **Perfil B · Workflow completo** · vista Lista (default) + Tarjetas + Tablero Kanban con drag&drop · diferenciación por severidad (banda lateral) · drawer con timeline · modal de cierre con justificación · Tablero state-driven declarando `ALR_STATES` / `ALR_TRANSITIONS` (ambos terminales — `resolved` y `dismissed` — requieren modal con justificación; `kanbanSort` ordena por severidad) | `prototypes/lex/lex_alertas_prototype.html` |
| **Reportes** | Todas las capacidades (núcleo + opcionales + dependencias inter-área) | `prototypes/lex/lex_reporteria_prototype.html` |

El template implementa **el perfil más completo** de cada módulo. La
premisa: es más fácil quitar que agregar al clonar. Cada app desactiva
las capacidades que no necesita siguiendo los comentarios `// CAPACIDAD`
del JS.

### Qué vive en cada módulo genérico

Vocabulario operativo para entender qué tipo de contenido puebla cada
módulo y dónde ponerlo. Útil al clonar el template — la decisión de en
qué módulo va una funcionalidad nueva no es estética, es funcional.

| Módulo | Qué tipo de contenido lo puebla | Qué NO va acá |
|---|---|---|
| **Dashboard** | Vista consolidada del estado del área. KPIs accionables, alertas activas embebidas, próximos vencimientos, actividad reciente. Es el Home — orienta al usuario al entrar. | Acción (todas las acciones se delegan a su módulo correspondiente). |
| **Inbox** | **Solicitudes** del equipo: cosas que requieren una decisión o acción humana, originadas en otra app del core, por el sistema (webhooks, motores) o por un usuario interno. Cada **solicitud** tiene un dueño esperado, un ciclo de vida (To Do → In Progress → Done) y una decisión que hay que tomar. La unidad de gestión del módulo es la **Solicitud** — usar ese término al describir el contenido del Inbox, no "item" genérico. | Eventos detectados por el sistema (esos son alertas). Exportaciones simples (esas viven dentro de cada módulo). Notificaciones meramente informativas. |
| **Alertas** | **Eventos detectados automáticamente por el sistema** que requieren atención humana. Anomalías, vencimientos, conciliaciones con diferencias, validaciones fallidas. El sistema los genera; un humano los analiza y cierra. | Solicitudes humanas (esas son inbox). Tareas planificadas. |
| **Reportes** | **Información consolidada** con procesamiento complejo (asincrónico) o coordinación inter-área. Output formal del cierre, regulatorios, P&L, conciliaciones globales. | Exportaciones simples (CSV de la tabla actual de un módulo) — esas viven dentro del módulo correspondiente. |

#### Ejemplos transversales por módulo

Los ejemplos de abajo son ilustrativos del patrón, no exhaustivos —
cada app define los suyos según el dominio.

**Inbox · ejemplos del tipo de solicitudes que llegan:**

- **Solicitudes desde otra app del core** — ej: en OPS, un withdrawal solicitado por un cliente desde CLP; en FIN, una aprobación de carga manual cargada por Tesorería.
- **Solicitudes humanas inter-área** — ej: en OPS, un pedido de imputación retroactiva desde FIN; en FIN, un pedido de generación ad-hoc de reporte por parte de Dirección.
- **Notificaciones del sistema con acción** — ej: en OPS, un depósito recién detectado que necesita matching con cliente; en FIN, una dependencia inter-área pendiente que afecta un reporte centralizado.
- **Aprobaciones de doble firma** — ej: en FIN, una carga manual que requiere segundo aprobador; en OPS, un asiento manual pendiente.
- **Tareas con SLA** — items con vencimiento que el equipo tiene que atender antes de una fecha límite.

**Alertas · ejemplos del tipo de eventos que se detectan:**

- **Anomalías de saldo o de comportamiento** — ej: saldo bajo umbral, variación anormal, tipo de cambio fuera de rango.
- **SLA vencidos** — imputación pendiente más allá del SLA, aprobación pendiente más allá del SLA.
- **Conciliaciones con diferencias** — diferencia detectada entre ledger y extracto bancario / on-chain.
- **Validaciones de compliance** — match en blacklist, screening de contrapartes, KYC vencido.
- **Reportes vencidos o próximos a vencer** — el catálogo emite alertas cuando se acerca el SLA de un reporte.

**Reportes · ejemplos del tipo de outputs centralizados:**

- **Regulatorios** — Régimen Informativo PSP BCRA, INFO OPERACIONES ARCA-UIF, Reporte CNV.
- **Contables consolidados** — Estado de Resultados (P&L), Balance General, Mayor de Cuentas multimoneda.
- **Operativos consolidados** — Conciliación Global por Banco, Posición Consolidada del grupo.
- **Análisis con coordinación inter-área** — reportes que requieren cierres previos en OPS, FIN, LEX antes de poder generarse.

**Dashboard · ejemplos de bloques que componen la vista:**

- **KPIs accionables** — al click, navegan al módulo de detalle (Alertas, Inbox, Reportes, módulos del dominio).
- **Lista compacta de alertas activas** — top 4-5 alertas embebidas, sin entrar al módulo Alertas.
- **Próximos vencimientos** — top reportes/obligaciones que vencen en los próximos 7-30 días.
- **Actividad reciente** — timeline cronológico cruzando eventos de Alertas + Reportes + módulos del dominio.

#### Cómo decidir si una funcionalidad va a un genérico o a un módulo del dominio

Una pregunta rápida ayuda: **¿el patrón funcional ya existe en otra app del core?**

- Si es una bandeja de entrada de solicitudes con dueño y ciclo de vida → **Inbox**.
- Si es un evento detectado por el sistema con flujo de revisión humana → **Alertas**.
- Si es información consolidada con procesamiento asincrónico o inter-área → **Reportes**.
- Si nada de lo anterior aplica → es funcionalidad propia del dominio, va a un módulo específico.

### Antes de clonar — declarar el perfil

En el discovery de tu app, antes de tocar el código del template, declarar:

1. **Qué perfil cubren los tipos de alerta de tu app.**
   - Perfil A · Notification-only — avisos sin proceso.
   - Perfil B · Workflow — análisis humano + auditoría.
   - Perfil C · Auto-system — generadas y cerradas por el sistema.
   - Perfil D · Hybrid — coexistencia de los anteriores.

   Recordar: el perfil se declara **por tipo de alerta**, no por aplicación.
   Una misma app puede tener tipos con distintos perfiles.

2. **Qué capacidades de Reportes activa tu app** (de §8.4 del framework).
   El default del template es activarlas todas. Si tu app no necesita
   alguna, removerla.

3. **Qué capacidades de Dashboard activa tu app** (de §10.2 del framework).

### Ubicación en el sidebar

Los 4 genéricos van **al tope del sidebar, al mismo nivel y sin
agruparlos bajo ningún `<div class="sb-section">`**. Esto vale tanto
para el template como para los prototipos de apps concretas que lo
clonan.

```
[Brand]
· Dashboard
· Inbox
· Alertas      [N]
· Reportes
BLOQUE DEL DOMINIO 1
· Módulo específico …
BLOQUE DEL DOMINIO 2
· Módulo específico …
[Account]
```

Los `<div class="sb-section">` se reservan para agrupar **los módulos
específicos del dominio** (ej: "Compliance" en LEX, "Operaciones" /
"Contabilidad" en FIN). Los 4 genéricos nunca van adentro de un bloque.

### Cómo personalizar cada genérico al clonar

#### Dashboard
1. Reemplazar los 4 KPIs por los del dominio.
2. Reemplazar las cards de Fila 1 y Fila 2 por las relevantes.
3. Reemplazar la lista de actividad reciente con eventos del dominio.
4. Si no necesitás alguna capacidad opcional (alertas embebidas, próximos
   vencimientos, charts), removerla siguiendo los comentarios `// CAPACIDAD`.

#### Inbox
1. Definir `INB_TYPES` del dominio (5-8 tipos típicamente). Cada tipo declara
   `label`, `badge` y `closeActions[]` (acciones disponibles al cerrar la
   solicitud — ej: Aprobar, Rechazar, Reasignar). El skeleton del template
   trae los 8 tipos del prototipo canónico OPS como demo
   (`WITHDRAWAL_REQUEST`, `SWAP_REQUEST`, `RFQ_REQUEST`, `DEPOSIT_MATCHING`,
   `IMPUTATION_REQUEST`, `KYC_HOLD`, `REPORT_DEPENDENCY`, `MANUAL_TASK`) —
   reemplazarlos por los del dominio.
2. Reemplazar dataset `INB_ITEMS` con ~10-15 solicitudes reales o dummy
   fieles al dominio. Cada solicitud tiene `id`, `type`, `state`,
   `source_app`, `source_module`, `title`, `client?`, `amount?`, `context`,
   `detail`, `reference?`, `assignee_id?`, `sla_hours?`, `timeline[]`.
3. Decidir qué **vistas** muestra el módulo. El módulo declara su set de
   vistas en `INB_VIEWS`. Default del template:
   `['list', 'cards', 'kanban']`. Si la app no necesita alguna, removerla
   del array — el toggle se ajusta automáticamente y se oculta si solo
   queda una vista. Comentarios `// CAPACIDAD: Vista Tarjetas` y
   `// CAPACIDAD: Vista Tablero (Kanban con drag&drop)` indican qué
   bloque del JS se puede remover si la capacidad no se usa. Si se
   remueve `'kanban'` también pueden removerse `INB_STATES` /
   `INB_TRANSITIONS` / `INB_SIDE_EFFECTS` (sin estados no hay Tablero).
4. La columna **Monto** vive solo en el **detalle** de la solicitud (drawer)
   y en las cards del Kanban está oculta — la vista Lista no la muestra
   para no saturar. Si la app requiere ver el monto en la grilla, agregar
   `<th>Monto</th>` en el `thead` y un `<td>` en `renderInbActRow` /
   `renderInbHistRow`. Mantener la decisión consistente entre Activos y
   Histórico.
5. Ajustar filtros si hace falta: el default es Tipo / Origen / Estado /
   Responsable (Activos) y Tipo / Origen / Responsable / Período (Histórico).
6. Si la app no maneja vencimientos, remover capacidad SLA siguiendo el
   comentario `// CAPACIDAD: SLA tracking` del JS y eliminar la columna SLA
   y la KPI de SLA vencidos.
7. Si los items se auto-asignan o son globales, remover capacidad de
   asignación humana siguiendo `// CAPACIDAD: Asignación humana`.

**Mantener intacto el núcleo:** estados (`pending`/`in_progress`/
`completed`), transiciones, drawer con timeline, modal de cierre con
justificación. La unidad de gestión es la **Solicitud** — usar ese término
en labels, mensajes y empty states (no "item" genérico).

#### Alertas
1. Definir `ALERT_TYPES` del dominio (5-7 tipos típicamente). Para cada
   tipo, declarar `profile: 'A' | 'B' | 'C'`.
2. Reemplazar dataset `ALERTS` con ~20-25 registros reales.
3. Adaptar columnas de la tabla del Histórico (LEX usa Cliente/CUIT;
   FIN usa Sociedad/Cuenta; cada app define las suyas).
4. Adaptar los campos visibles en las cards de Nuevas.
5. Adaptar los filtros del histórico — mantener los comunes (Estado,
   Severidad, Responsable, Período) y agregar los del dominio.
6. **Si tu app tiene tipos con perfiles distintos a B**, remover las
   capacidades correspondientes siguiendo los comentarios `// CAPACIDAD`
   del JS:
   - Perfil A → remover asignación, drawer con timeline, comentarios,
     modal de cierre con justificación.
   - Perfil C → remover asignación humana, comentarios, modal de cierre
     manual; agregar lógica de auto-cierre.
   - Perfil D → mantener todas las capacidades pero condicionarlas por
     tipo (cada tipo declara qué capacidades usa).

**Mantener intacto el núcleo:** listado activo, modelo de datos base,
acción de marcar como atendida, sub-tab Nuevas.

#### Reportes
1. Definir `CATEGORIES` del dominio (3-5 categorías).
2. Reemplazar `CATALOG` con los reportes reales (~10-15). Solo van al
   catálogo los reportes que cumplen los criterios de §8.2 del framework.
3. Reemplazar `HISTORY` con generaciones dummy (~20-25).
4. Renombrar funciones de generación (`fn_app_*` con el prefijo de la
   app).
5. Si algún reporte tiene **dependencias inter-área**, completar el
   campo `dependencies` siguiendo el patrón documentado en §8.5 del
   framework.
6. Si no necesitás alguna capacidad opcional (edición de metadata, CRON
   activable, dependencias, reportes bloqueados visibles), removerla
   siguiendo los comentarios `// CAPACIDAD` del JS.

**Mantener intacto el núcleo:** catálogo, sub-tabs Catálogo/Histórico,
endpoint de generación, persistencia del histórico, descarga.

---

## Sistema de Acciones declarativas via Manifest

> **Versión introducida:** v1.15 (28/04/2026).
> **Aplicado en:** Módulo Específico A (canónico). Inbox y Alertas
> conservan su sistema in-line legacy hasta su REQ transversal.
> **Marco:** `framework/marco-dimensiones-registros.md` §9 ·
> `framework/financial-core-modules.md` §11.

Esta sección documenta de forma autosuficiente cómo declarar y consumir
acciones declarativas en cualquier prototipo clonado del template. Un
nuevo dev debería poder agregar acciones a su módulo con esta sección
sola, sin leer otros archivos.

### Filosofía

Antes, cada módulo escribía sus acciones in-line (objeto `can` /
`reason` / `tag` dentro de `togActions()`). Cada prototipo nuevo
reescribía la misma lógica con sabor propio — divergencia inevitable.

Con el sistema declarativo, **las acciones son datos, no código**:

- Viven en archivos `.js` separados en `manifests/[app].[modulo].[tipo].actions.js`.
- El contenido es **JSON estricto** envuelto en una asignación a
  `window.ACTION_MANIFEST['key']`. Comillas dobles, sin trailing
  commas, sin comentarios internos, sin funciones, sin variables.
- El motor del template (`// ═══ ACTION MANIFEST SYSTEM ═══` en el
  script) las evalúa contra el registro y el usuario actual y devuelve
  solo lo aplicable.
- El dialog se genera dinámicamente: campos, tipos, lookups,
  validaciones declarados.
- El estado calculado `imputacion` (`pendiente` / `en_proceso` /
  `imputado`) se deriva comparando los `required_imputations` del
  manifest contra los campos asignados del registro.
- El drag-drop entre columnas del Tablero (eje declarado en
  `kanban_axes`) abre el **dialog compuesto** del eje: une los
  `dialog.fields[]` de todas las acciones aplicables; el confirm decide
  la columna destino según el estado calculado.

### Estructura del manifest

```js
// manifests/[app].[modulo].[tipo].actions.js
window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};
window.ACTION_MANIFEST["[app].[modulo].[tipo]"] = {
  "app": "...",
  "module": "...",
  "record_type": "...",            // null para manifests a nivel módulo
  "scope": "record",               // o "module"
  "schema_version": "1.0",
  "required_imputations": [...],   // campos que deben estar asignados para llegar a "imputado"
  "required_by_type": {...},       // override por record_type
  "kanban_axes": [...],            // mapa eje Kanban → dimension del manifest
  "actions": [...],                // operaciones contextuales sobre un registro
  "module_ctas": [...]             // CTAs del header del módulo (Crear, Cargar, Exportar)
};
```

Schema completo en `manifests/_schema.md` (legible) y `manifests/_schema.json`
(JSON Schema draft-07, validable programáticamente). Manifest demo
funcional: `manifests/ejemplo.modulo-a.actions.js`.

### Regla de JSON estricto — innegociable

El contenido entre `=` y `;` debe ser JSON puro:

- Comillas dobles en todas las claves y strings.
- Sin trailing commas.
- Sin comentarios dentro del objeto JSON.
- Sin referencias a variables (todo literal).
- Sin funciones, sin expresiones, sin template literals.
- Sin `undefined` (usar `null` o omitir).

Comentarios JS solo permitidos **fuera** del objeto, como header del
archivo. Esta regla garantiza migración trivial a `.json` puro cuando
tecnología pase el sistema a backend.

**Validar antes de subir:**

```bash
sed -n '/^window\.ACTION_MANIFEST/,/^};/p' manifests/[archivo].js \
  | sed 's/^window\.ACTION_MANIFEST\[".*"\] = //' \
  | sed 's/^};$/}/' > /tmp/m.json
node -e "JSON.parse(require('fs').readFileSync('/tmp/m.json','utf-8'))"
```

Si `JSON.parse` falla, el manifest violó la regla. **Corregir antes
de hacer commit.**

### Cargar un manifest

Antes del `<script>` principal del prototipo:

```html
<script src="manifests/[app].[modulo].[tipo].actions.js"></script>
<script>/* script principal */</script>
```

Sin `fetch()`. El browser carga el `.js` sincrónicamente y el archivo
registra su entrada en `window.ACTION_MANIFEST`. Esto funciona con
`file://` sin servidor local.

### Cómo declarar una acción

```json
{
  "id": "[app].[modulo].[tipo].[dimension].[verbo_subject]",
  "dimension": "imputacion",
  "label": "Asignar Cliente",
  "target_field": "cliente_id",
  "show_when":   { "record_type_in": ["DEPOSIT","WITHDRAWAL"] },
  "enable_when": { "field_is_null": "cliente_id" },
  "disable_reason": "El registro ya tiene cliente asignado",
  "disable_tag": "Asignado",
  "prerequisites": [
    { "field": "sociedad_id", "message": "Asigná Estructura primero" }
  ],
  "capabilities": { "required_role_any_of": ["OPS_OFFICER","ADMIN"] },
  "dialog": {
    "title": "Asignar Cliente",
    "fields": [
      { "id": "cliente_id", "label": "Cliente", "type": "lookup",
        "catalog": "clp.clientes", "required": true }
    ]
  },
  "on_confirm": {
    "update_fields": ["cliente_id"],
    "recompute": ["imputacion"],
    "audit": true,
    "toast": "Cliente asignado"
  },
  "batch": {
    "batchable": true,
    "promote_to_main_cta": true,
    "main_cta_label_template": "Imputar Cliente a {N} registros"
  }
}
```

**Predicados soportados** (en `show_when` / `enable_when`):
`record_type_in`, `record_type_not_in`, `field_is_null`,
`field_is_not_null`, `field_equals`, `field_in`, `all` (AND), `any` (OR).

**Tipos de campo soportados** (en `dialog.fields[].type`):
`lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`.

**Dimensiones válidas:** `imputacion`, `registro_contable`,
`conciliacion`, `governance`, `documentacion`, `cierre`. Coinciden con
las del marco de dimensiones de los registros del financial-core.

### Drag-drop del Kanban → dialog compuesto

Cuando el módulo declara `kanban_axes` y registra el eje en MOD_REG:

```json
"kanban_axes": [
  { "axis_id": "imputacion", "dimension": "imputacion",
    "drop_target_state": "imputado",
    "states": ["pendiente","en_proceso","imputado"] }
]
```

El motor responde a un drag-drop entre columnas:

1. Identifica las acciones del manifest cuya `dimension` matchea el eje.
2. Filtra las que tienen `enable_when` true sobre el registro
   (típicamente `field_is_null` sobre el `target_field`).
3. **Compone un dialog único** uniendo los `dialog.fields[]` (sin
   duplicar el mismo `id`).
4. Respeta `prerequisites`: campos cuyo prereq no se cumple aparecen
   disabled hasta que se llene su antecesor (re-evaluación reactiva).
5. Al confirmar, ejecuta el `on_confirm` de cada acción aplicable;
   recomputa `imputacion`; aterriza la card en la columna que
   corresponda al estado calculado (no al destino del drag).

**Cards en `drop_target_state` (terminal) no son draggables** — consistente
con la decisión §2 del prompt v3 ("no Re-imputar v1"). Drag inverso
(`en_proceso → pendiente`) abre el mismo dialog compuesto y permite
borrar valores ya asignados.

**Audit del composite:** un solo evento con `composite_action: true` y
`child_action_ids: [...]` para reflejar la intención del usuario, no
la mecánica interna.

### Patrón filtros + main CTA dinámico (batch)

Cuando una acción declara:

```json
"batch": {
  "batchable": true,
  "min_records": 2,
  "max_records": 100,
  "promote_to_main_cta": true,
  "main_cta_label_template": "Asignar Responsable a {N} registros",
  "homogeneity_check": [
    "all_records_pass_show_when",
    "all_records_have_field_null:responsable_id"
  ]
}
```

Y `MFrenderBatchCTA(manifestKey, slotId, filteredRecords)` se invoca
desde el render de la tabla, el motor:

1. Evalúa el resultado filtrado actual contra `show_when` +
   `enable_when` + `homogeneity_check` + `capabilities`.
2. Si N está dentro del rango [min, max] y todos los registros pasan,
   **promueve un botón** al `.ph-actions` del header con label dinámico.
3. Click en el CTA promovido abre el mismo dialog que la acción
   individual, pero al confirmar aplica el `on_confirm` a todos los
   registros del lote en una sola transacción + un solo audit log
   con `batch: true`.

### Cómo wire el módulo al subsistema

En `initApp()`, después de `MFinit()` y antes de `renderTable()` del
módulo:

```js
// 1. Resolver de records (id → record):
MF_RECORD_RESOLVERS['mimodulo'] = (id) => DATOS.find(r => r.id === id);

// 2. Hook después de mutaciones (re-render):
MF_AFTER_MUTATION['[app].[modulo].[tipo]'] = () => {
  DATOS.forEach(r => MFrecomputeRecord(r, '[app].[modulo].[tipo]'));
  renderTabla();
  if (MOD_REG.mimodulo.currentView === 'kanban') renderKanban('mimodulo');
};

// 3. Creator para module_ctas que generan registros nuevos (opcional):
MF_CREATORS['[app].[modulo].[tipo]'] = (cta, formValues) => {
  const newRec = { id: nextId(), _record_type: cta.creates_record_type, ...formValues };
  DATOS.unshift(newRec);
  return newRec;
};

// 4. Render dinámico de los module CTAs en el header:
MFrenderModuleCTAs('[app].[modulo].[tipo]', 'slot-id-en-ph-actions');

// 5. En el módulo registrado en MOD_REG, hook del Tablero:
onModalTransition: (item, targetState, tr, fromState, axisKey) => {
  if (axisKey === 'imputacion'){
    MFopenComposite('[app].[modulo].[tipo]', item.id, 'imputacion');
  }
}
```

En el render de la fila / card / kanban-card, el menú `⋯` se cablea así:

```js
'<button class="abtn" onclick="MFmenu(event,\'[app].[modulo].[tipo]\',\''+r.id+'\')">…</button>'
```

En el render de la tabla, después del render de filas, invocar
`MFrenderBatchCTA('[app].[modulo].[tipo]','slot-batch', filteredRecords)`.

### Validación contra schema (modo dev)

`validateManifest()` corre al cargar (`window.MANIFEST_DEV_MODE = true`
por default). Loguea warnings en consola sin romper la UI:

- Campos top-level requeridos.
- Tipos válidos de `dimension` y `dialog.fields[].type`.
- Estructura mínima de cada action / module_cta.

Para silenciar en producción: `window.MANIFEST_DEV_MODE = false` antes
de cargar los manifests. La validación es JS plano, sin dependencias
externas (regla §7.6 del prompt: "sin frameworks").

### Ítems que NO van al manifest

- **"Ver detalle"** — el click en la fila ya abre el detalle. No es
  acción, es navegación. Removido del Módulo A en v1.15.
- **"Editar"** libre de campos del registro — rompe la coherencia del
  estado calculado de imputación. Si un campo debe ser editable, se
  declara como acción específica (con dimension `governance` típicamente)
  con sus capabilities, audit y dialog. Removido del Módulo A en v1.15.
- **Filtros, búsqueda, paginación, sub-tabs, toggle de vistas** — son
  controles de visualización. Excluidos por definición.

### Migración a `.json` puro (cuando tecnología migre a backend)

```bash
sed -n '/^window\.ACTION_MANIFEST/,/^};/p' fin.operaciones.movimientos.actions.js \
  | sed 's/^window\.ACTION_MANIFEST\[".*"\] = //' \
  | sed 's/^};$/}/' \
  > fin.operaciones.movimientos.actions.json
```

Validación obligatoria: `node -e "JSON.parse(require('fs').readFileSync('archivo.json','utf-8'))"`.

---

## Cómo clonar para un módulo nuevo

1. **Copiar el archivo:**
   ```bash
   cp _core-template/_core-template.html [modulo]/[modulo]-prototype-v1.html
   ```

2. **Personalizar el brand** (1 variable CSS):
   - En `:root`, cambiar `--brand` y `--brand-bg` por el color de la app.
   - Sugerencia de paleta por app:

     | App | Color | HEX | Razón |
     |---|---|---|---|
     | OPS | Rojo | `#EF4444` | Operación / urgencia |
     | TRD | Azul | `#3B82F6` | Mercados / precisión |
     | FIN | Verde | `#22C55E` | Finanzas / estabilidad |
     | CLP | Púrpura | `#A78BFA` | Cliente / experiencia |
     | COM | Ámbar | `#F59E0B` | Comercial / energía |
     | LEX | Teal | `#2DD4BF` | Legal / claridad |

3. **Actualizar el branding de Sidebar y Topbar:**
   - `<span class="sb-brand-name">APP · Ardua</span>` → `TRD · Ardua` (etc.)
   - `<span class="sb-brand-sub">Tagline del módulo</span>` → texto propio
   - En el topbar, `<span class="bc-dim">APP · Ardua</span>` → mismo que sb-brand-name

4. **Renombrar bloques y módulos en el sidebar:**
   - Cambiar los `<div class="sb-section">Bloque 1</div>` por los bloques reales.
   - Cambiar cada `<a class="ni" data-mod="..." onclick="nav('...')">` por los módulos reales.
   - Asegurar que `data-mod="X"` coincida con `id="page-X"` del Main.

5. **Adaptar el módulo de ejemplo al módulo real:**
   - Copiar el bloque completo de `<div class="page" id="page-ejemplo-lista">` para cada listado del módulo.
   - Cambiar `id="page-..."` al nombre del módulo.
   - Actualizar L1 (título, subtítulo, CTAs).
   - Actualizar L2 (KPIs propios del módulo).
   - Actualizar L3 (columnas de la tabla, filtros disponibles, texto de búsqueda).

6. **Reemplazar `DATA` por datos reales** (o dummy fieles al dominio):
   - En el `<script>`, cambiar la constante `DATA` por datos representativos.
   - Adaptar `renderRow(r)` al shape del registro (columnas, tipos, badges).
   - Adaptar `getFiltered()` a los filtros que definiste en L3.
   - Adaptar los KPIs que se calculan dentro de `renderTable()`.

7. **Módulos placeholder:** mantener el patrón `.prox` para módulos aún no diseñados. Cambiar ícono, título y sub al nombre del módulo.

8. **Definir las vistas del módulo:** declarar `<MOD>_VIEWS` (array de
   vistas soportadas). Si el módulo soporta Tablero, declarar también
   `<MOD>_STATES` (estados con `column_label`, `order`, `terminal`) y
   `<MOD>_TRANSITIONS` (reglas de drag & drop por par origen→destino con
   modo `'free'` / `'modal'` / `'blocked'` y `sideEffect` opcional).
   Implementar `render<Mod>Card(r, mode)` si se incluye `'cards'` o
   `'kanban'` en las vistas. Registrar el módulo con
   `registerModule('<mod>', { views, states?, transitions?, getItems,
   getItem, renderCard, onView, onModalTransition?, afterTransition? })`
   y renderizar el toggle con `renderViewToggle('<mod>', '<slot-id>')`.
   Ver §"Vistas del módulo" en "Arquitectura del template".

---

## Qué está ya resuelto (no reinventar)

- **Navegación entre módulos** · función `nav(mod)` genérica
- **Paginación completa** · `setLimit`, `goToPage`, `renderTable` — incluye ellipsis para listas largas
- **Sidebar colapsable** · botón circular flotante en el borde derecho del sidebar (chevron) que alterna entre estado expandido (200px, iconos + labels) y colapsado (60px, solo iconos). El `.main` ajusta su `margin-left` automáticamente y el account menu se reposiciona al costado del sidebar cuando está colapsado. Cada item de navegación tiene el atributo `title` para mostrar tooltip nativo cuando está colapsado. Función: `toggleSidebar()`. Clases: `.sb.collapsed` (sidebar) + `body.sb-collapsed` (para reposicionamiento del main y el acct-menu).
- **Click en fila abre el Detalle** · cada `<tr>` es clicable y abre el modal de detalle (read-only). El `<td>` de Acciones lleva `onclick="event.stopPropagation()"` para que el click en el botón de 3 puntos no dispare también la apertura del detalle. "Ver detalle" **ya no es una acción** — es el comportamiento por defecto del registro.
- **Filtros por dropdown portal** · botones `.fsel` que al click abren un dropdown renderizado fuera del flujo normal (portal en `document.body`), lo que permite que escape de contenedores con `overflow:hidden`. Se auto-posiciona según el espacio disponible (ancla a la derecha si el botón está cerca del borde derecho). Funciones: `openFDD` / `selectFDD` / `closeFDD`. Config declarativa en `FDD_OPTS`. Soporta items con dot de color (estados) y opción "Todos" para limpiar el filtro.
- **Menú de Acciones funcionales** · el botón `.abtn` (3 puntos verticales) abre un dropdown con **operaciones funcionales del dominio** (no CRUD genérico). El template usa como ejemplo: Procesar, Confirmar, Generar comprobante, Asignar responsable, Anular. En cada módulo del core se reemplazan con las acciones reales del negocio:
  - **OPS** → Asignar Banco y Cuenta, Crear Nota de Débito / Crédito, Generar comprobante
  - **TRD** → Aceptar Quote, Cancelar Quote, Liquidar, Re-cotizar
  - **LEX** → Validar KYC, Subir documento, Rechazar, Solicitar info
  - **COM** → Convertir Lead, Asignar Referenciador, Cerrar oportunidad
  
  La **habilitación de cada acción** depende de DOS reglas independientes:
  1. **Capabilities del usuario** (rol / permisos) → dtag `"Permiso"`
  2. **Características intrínsecas del registro** (estado, categoría, tipo) → dtag `"Estado"`, `"Categoría"`, `"Tipo"`
  
  Para funcionalidad planificada a futuro → dtag `"V2"`. Cuando una acción está deshabilitada, el atributo `title` del botón muestra el motivo completo como tooltip nativo. Función: `togActions(event, idx)` — la lógica de evaluación vive en el objeto `can` / `reason` / `tag` dentro de la función. Dispatcher genérico: `doAction(action, idx)`.
- **Modal de Creación** · abre desde el CTA principal del page header (`Crear Registro`). Incluye form groups para cada campo editable, bar `.info` explicativa y auto-genera el ID al guardar (secuencial `R-XXX`) + fecha de creación. Funciones: `openCreateModal` / `closeCreateModal` / `confirmCreate`.
- **Modal de Detalle (read-only)** · abre al hacer click en cualquier fila de la tabla. Muestra todos los campos del registro en un grid de `.detail-item` (2 columnas, con opción `.full` para ocupar el ancho completo), sin inputs editables. Footer con "Cerrar" + "Editar" (transición al modal de edición manteniendo el contexto del registro). Funciones: `openDetailModal` / `closeDetailModal` / `editFromDetail`.
- **Modal de Edición** · overlay + modal con header (`.mh`), body (`.mb`, con `.mref` de contexto + `.info` bar + `.fg` form groups) y footer (`.mf` con `.bca` cancelar + `.bco` confirmar). Abre desde el modal de Detalle (botón "Editar"). Cierra con X, click en overlay o ESC.
- **Toast de confirmación** · notificación efímera bottom-right con icón de check, título y mensaje. Auto-desaparece en 4.5s. Función: `toast(titulo, mensaje)`.
- **Estilos de tabla** · th/td, badges (`.badge-*`, `.pbadge`), columna de Acciones obligatoria al final de cada listado.
- **Account menu** · dropdown en el botón de cuenta (Sidebar) con Settings / Get Help / Logout. Abre hacia arriba, cierra con click fuera o ESC. Chevron rota al abrir. La función `acctAction(action)` es un placeholder — cada app conecta las acciones reales (navegación a Settings, Auth0 logout, etc.)
- **Skeletons (loading states)** · clase base `.sk` con animación shimmer + helpers (`.sk-card`, `.sk-btn`, `.sk-chart`, `.sk-circle`, `.sk-row`). El template incluye dos skeletons de patrones específicos de la app (no genéricos):
  - **Módulo Específico A** — patrón **Listado L1/L2/L3** funcional (page header con CTAs, KPIs, tabla con filtros, paginación, modales de creación/edición/detalle, menú de Acciones)
  - **Módulo Específico B** — patrón **Master-Detail** (lista de ítems a la izquierda, panel de detalle a la derecha — visual skeleton)
- **Dashboard skeleton** · KPIs cards + cards de contenido + actividad
  reciente. Genérico del core. Implementa el perfil completo;
  capacidades opcionales removibles al clonar.
- **Inbox skeleton** · Skeleton funcional canónico promovido desde
  `prototypes/ops/ops-inbox-prototype.html`. Tres vistas declaradas en
  `INB_VIEWS = ['list','cards','kanban']`: **Lista** (default, tabla
  con paginación), **Tarjetas** (grid responsive, mismo dataset y
  filtros que Lista) y **Tablero** (Kanban state-driven con drag & drop
  entre To Do / In Progress / Done declarados en `INB_STATES` y
  `INB_TRANSITIONS`). Drawer lateral con timeline, modal de cierre con
  `closeActions` por tipo. Sub-tabs Activos / Histórico aplican a
  Lista y Tarjetas; en Tablero se ocultan automáticamente. Comentarios
  `// CAPACIDAD` indican cómo desactivar vista Tablero / Tarjetas,
  Histórico, SLA tracking, asignación humana, comentarios y modal de
  cierre. Canónico: OPS.
- **Framework de tres niveles de control sobre los registros**
  (Segmentación · Vista · Filtros) · documentado al inicio de "Arquitectura
  del template". Da el marco conceptual para entender dónde vive cada control
  en el L1/L2/L3 y por qué: la Segmentación define el subconjunto del
  universo del módulo (mutuamente excluyente); la Vista define cómo se
  representa (no cambia datos); los Filtros restringen por valores de
  atributos (multi-valor, ortogonales). El filtro de período se documenta
  como filtro con privilegios de UI (mandatorio + default + single-value +
  afecta agregación de KPIs), no como categoría aparte.
- **Vistas del módulo (Lista / Tarjetas / Tablero)** · sistema
  declarativo. El módulo declara `<MOD>_VIEWS` y opcionalmente
  `<MOD>_STATES` + `<MOD>_TRANSITIONS`. Toggle, render del Tablero,
  render de la grilla de Tarjetas y drag & drop son genéricos del
  template (`renderViewToggle` / `setView` / `renderKanban` /
  `bindKanbanDnD` / `renderCardsGrid`). Cada módulo implementa su
  `renderRow` y `render<Mod>Card`. Si solo declara `['list']` el toggle
  no se renderiza. Aplicado a Inbox y Módulo A (los dos con las 3 vistas).
- **Tablero genérico (state-driven)** · cualquier módulo con máquina de
  estados declarada puede tener Tablero. Reglas de transición
  declarativas (`free` / `modal` / `blocked`) con `sideEffect` opcional
  por nombre. Las columnas se ordenan por `order`; estados
  `terminal:true` no son draggables (origen ni destino salvo
  `mode:'modal'`). El despachador genérico (`handleKanbanTransition`)
  ejecuta el sideEffect, dispara el modal del módulo o bloquea según
  corresponda. La card de Tarjetas y la card del Tablero comparten
  `render<Mod>Card(r, mode)` por consistencia visual. Aplicado a Inbox
  (`pending` / `in_progress` / `completed` con `pending↔in_progress`
  libres y `*→completed` con modal) y Módulo A (`PENDIENTE` / `ACTIVO`
  / `INACTIVO` con todas las transiciones desde estados no terminales
  como libres).
- **Tablero multi-axis (kanban con eje configurable)** · cuando el
  módulo declara `MOD_AXES` con más de un eje (cada uno con su propio
  `stateField`, `states`, `transitions` y opcional `readOnly`), el
  template abre un dialog al activar el Tablero por primera vez en la
  sesión y deja que el usuario elija sobre qué máquina de estados
  organizar las columnas. La elección persiste durante la sesión; el
  header del Tablero muestra un chip "Organizando por: <eje>" con un
  botón "Cambiar eje". `stateField` admite dot-paths (`'fin.imput'`,
  `'ops.status'`). Ejes `readOnly: true` (típicamente estados que vienen
  de otra app del core como origen) renderizan columnas pero bloquean
  el drag&drop. Compatibilidad hacia atrás: módulos con `states +
  transitions` directos (forma legacy) siguen funcionando — se
  promueven internamente a un eje único. Implementación de referencia:
  `prototypes/fin/fin-prototype.html` (Operaciones con 3 ejes:
  `status` OPS read-only + `fin.imput` + `fin.conc`; Cotizaciones con
  2 ejes: `status` TRD read-only + `fin.facturaState`).
- **Alertas skeleton** · Perfil B · Workflow completo. Estructura
  funcional con sub-tabs Nuevas/Histórico, drawer lateral, timeline,
  modal de cierre con justificación, sistema de asignación. Dataset
  minimal placeholder. Comentarios `// CAPACIDAD` indican cómo
  desactivar capacidades para perfiles A/C/D. Canónico: LEX.
- **Reportes skeleton** · Todas las capacidades activas. Estructura
  funcional con sub-tabs Catálogo/Histórico, 4 modales (Editar metadata
  / Configurar CRON / Generar / Detalle), separación
  definición/generación, dependencias inter-área (§8.5), emisión de
  REPORT_DEPENDENCY (§8.6). Dataset minimal placeholder. Canónico: LEX.
- **Tema dark** · todas las variables CSS en `:root`
- **Placeholder `Próximamente`** · patrón `.prox` (útil cuando un módulo todavía ni siquiera tiene un skeleton definido)
- **Scrollbars sutiles** · via `::-webkit-scrollbar`

---

## Qué NO está en el template (agregar según necesidad del módulo)

- **Modal / Overlay** — tomar del prototipo OPS (clases `.ov`, `.modal`, `.mh`, `.mb`, `.mf`). Se omite acá por no saturar el template base.
- **Toast de confirmación** — tomar del prototipo OPS (clases `.twr`, `.toast`). Se omite por la misma razón.
- **Dropdown de filtro portal (multi-select con checkboxes)** — tomar del prototipo OPS (clases `.di-cb`, `.di-chk`, `.qs-btn`). Útil cuando un filtro tiene múltiples opciones seleccionables.
- **Sub-tabs dentro de un módulo** — tomar del prototipo OPS (clases `.qtabs`, `.qtab`, `.qpanel`). Útil cuando un módulo tiene vistas internas (ej. TRD · RFQ con sub-tabs Lotes / Alertas).
- **Filtro temporal tipo pill** — clases `.tfilter`, `.tpill` del prototipo OPS.
- **KPI cards clickeables (drill-down)** — agregar `.kpi-btn` y `.kpi-active` como en el módulo Quotes del prototipo OPS.
- **Notice / info bar** — ver `.info` en modales del prototipo OPS (fondo azul tenue, útil para advertencias contextuales).

Todos estos componentes viven en **`/prototypes/ops/ops-acciones-prototype.html`** como referencia canónica.

---

## Convenciones de naming

### Archivos

```
prototypes/
├── _core-template/                      # base reutilizable (este directorio)
│   ├── _core-template.html
│   └── README.md
├── ops/
│   ├── ops-acciones-prototype.html      # canónico del módulo
│   └── ops-[feature]-v2.html            # iteraciones específicas
├── trd/
├── fin/
└── ...
```

### HTML / IDs

- `id="page-[modulo]"` — contenedor de cada módulo
- `data-mod="[modulo]"` — atributo de cada `.ni` del sidebar, debe matchear el `page-[modulo]`
- `id="kpi-..."` — KPIs del módulo
- `id="tbl-body"` / `id="tbl-search"` / `id="pag-info"` / `id="pag-pbs"` / `id="pag-limit"` — IDs de la tabla y paginación. Si hay más de un listado en el módulo, usar prefijos (ej. `id="mov-tbl-body"`, `id="q-tbl-body"`).

### CSS

- Variables globales en `:root`. **Nunca** hard-codear colores dentro de la regla.
- Clases cortas y semánticas: `.ph` (page header), `.kpi`, `.sec-head`, `.tw` (table wrap), `.pag`, `.pb2` (page button).
- Badges con prefijo `.badge-[color]` o `.pbadge` + clase corta (`.pa` púrpura, `.pc` ámbar, etc.)

---

## Evolución del template

Este template debe evolucionar cuando:

- Se identifica un patrón nuevo que aparece en 2+ módulos (se sube al template).
- Un patrón existente cambia y el cambio es beneficioso transversalmente.
- La paleta de brand del core se actualiza.

**No debe evolucionar cuando:** un módulo tiene una necesidad única. Esa necesidad vive en el módulo, no en el template.

Cuando se formalice el Design System del core en `framework/design-system.md`, este template quedará como la **implementación de referencia** de ese documento.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-04-28 | v1.15 — **Sistema de Acciones declarativas via Manifest**. (1) Nueva carpeta `manifests/` en el template con `_schema.json` (JSON Schema draft-07), `_schema.md` (contraparte legible), `README.md` del subsistema y `ejemplo.modulo-a.actions.js` (manifest demo del Módulo Específico A). (2) Nueva sección autosuficiente "Sistema de Acciones declarativas via Manifest" en este README (ver §correspondiente) con la documentación completa: filosofía, schema, regla de JSON estricto, cómo cargar, cómo declarar acciones, drag-drop del Kanban → dialog compuesto, patrón filtros + main CTA dinámico (batch), wiring de un módulo, validación contra schema (modo dev), migración a `.json` puro. (3) Nuevo subsistema en el JS del template (`// ═══ ACTION MANIFEST SYSTEM ═══`): funciones `MFinit`, `MFmenu`, `MFopenDialog`, `MFopenComposite`, `MFopenModuleCTA`, `MFopenBatch`, `MFcloseDialog`, `MFconfirmDialog`, `MFrenderModuleCTAs`, `MFrenderBatchCTA`, `MFcomputeImputation`, `resolveActions`, `resolveCatalog`, `evalPredicate`, `evalCapabilities`, `validateManifest`. Audit log estructurado en `window.MF_AUDIT_LOG` + `console.log('[AUDIT]', …)`. (4) **Módulo Específico A migrado al sistema declarativo**: las 5 acciones del menú ⋯ + el CTA "Crear Registro" del header son ahora declarativas (`manifests/ejemplo.modulo-a.actions.js`); las funciones legacy `togActions`/`doAction`/`openModal`/`openCreateModal`/`confirmCreate`/`editFromDetail` removidas. Tabla del Módulo A suma columna **"Imputación"** con badge calculado (`pendiente` / `en_proceso` / `imputado`); modal de Detalle muestra el estado y los campos faltantes y **ya no tiene botón "Editar"**. Tablero del Módulo A suma eje **"imputacion"** además del eje legacy "estado"; default = imputacion. **Drag-drop entre columnas del eje imputación abre el dialog compuesto**: une los `dialog.fields[]` de las acciones aplicables (campos no asignados todavía); al confirmar ejecuta sus `on_confirm` en una sola transacción + un solo audit con `composite_action: true` y `child_action_ids[…]`; la card aterriza en la columna que decide el estado calculado, no el destino del drag. Cards en `imputado` no son draggables (consistente con §2 del prompt: "no Re-imputar v1"). Drag inverso permite editar valores ya asignados (operación de edit, no Re-imputar). (5) Patrón **filtros + main CTA dinámico** wired al Módulo A: cuando el resultado filtrado es homogéneo y N>1, el subsistema promueve un botón al `.ph-actions` con label dinámico ("Asignar Responsable a {N} registros"); click abre el mismo dialog de la acción individual; confirm aplica a todos en una transacción + un audit con `batch: true`. (6) **Manifest a nivel módulo** (`record_type: null`, `scope: "module"`, `module_ctas[]`) introducido para CTAs del header que no están atados a un registro específico (ej. "Crear Registro" del Módulo A). El subsistema reconoce el scope y renderiza las CTAs como `.btn.btn-p` en lugar de items del menú ⋯. (7) **Inbox y Alertas conservan su sistema legacy in-line** hasta su REQ transversal — los dos sistemas conviven sin tocarse (`closeActions` / `actionsPortal` siguen operando para Alertas; `MFcloseMenu` / `MF._menuPortal` para el Módulo A). El Módulo Específico B no tiene acciones — sin cambios. (8) **Eliminado del template (deuda de v1.14):** los modales `<div class="ov" id="ov">` (Editar) y `<div class="ov" id="ov-create">` (Crear Registro hardcoded); el ítem "Ver detalle" del menú ⋯ del Módulo A; el botón "Editar" del modal de Detalle. Reemplazados por el modal genérico `<div class="ov" id="ov-mf">` cuyo body se llena dinámicamente desde el manifest. (9) Validación contra schema corre en modo dev al cargar (`window.MANIFEST_DEV_MODE = true`) — JS plano, sin dependencias. Smoke test del path de migración a `.json` puro documentado y verificado. **Referencias:** `framework/marco-dimensiones-registros.md` v1.1 §9 · `framework/financial-core-modules.md` v1.2.1 §11. |
| 2026-04-28 | v1.14 — **Tablero multi-axis (kanban con eje configurable)**. El sistema genérico de Vistas se extiende para soportar registros que tienen más de una máquina de estados conceptualmente ortogonal (caso canónico: en FIN, un movimiento operativo tiene `status` OPS read-only + `fin.imput` editable + `fin.conc` editable simultáneamente). El módulo declara `MOD_AXES = { axisKey: { label, description?, stateField, states, transitions, sideEffects?, readOnly? } }` en lugar de un único `MOD_STATES`. Cuando hay >1 eje, al activar la vista Tablero por primera vez en la sesión el template abre un **dialog de selección** con la lista de ejes; cada uno muestra label, descripción y un chip "read-only" cuando aplica. La elección persiste durante la sesión (`cfg.currentAxis`); el header del Tablero muestra un chip "Organizando por: <eje>" con un botón "Cambiar eje" que reabre el dialog. Ejes con `readOnly: true` (estados que vienen de otra app del core como origen — ej. status OPS/TRD) renderizan columnas pero bloquean el drag&drop. `stateField` admite **dot-paths** (`'fin.imput'`, `'ops.status'`); helpers `_resolveField` / `_setField` resuelven anidamiento. Las hooks (`afterTransition`, `onModalTransition`, `onBlocked`) reciben un `axisKey` adicional para discriminar comportamiento por eje. **Compatibilidad hacia atrás:** módulos con `states + transitions` directos (Inbox, Alertas, Módulo A) se promueven internamente a un eje único `'default'` — siguen funcionando sin tocar nada y el dialog no aparece. Nueva CSS: `.axis-option` (botones del dialog), `.kb-axis-header` (chip + botón "Cambiar eje" en el header del Tablero), `.kanban-board-cols` (grid de columnas; `.kanban-board` ahora es block contenedor del header + cols). Nuevo HTML: dialog `#ov-kanban-axis` compartido entre módulos. API genérica nueva: `setKanbanAxis`, `openKanbanAxisDialog`, `closeKanbanAxisDialog`, `confirmKanbanAxis`. Anti-patrón documentado: declarar dos ejes con el mismo `stateField` (es la misma máquina disfrazada). Implementación de referencia viva: `prototypes/fin/fin-prototype.html` (Operaciones con 3 ejes, Cotizaciones con 2 ejes). En el template, ningún módulo usa multi-axis todavía — la capacidad está disponible para clones cuando aplique. |
| 2026-04-28 | v1.13 — **Framework de tres niveles de control sobre los registros** (Segmentación · Vista · Filtros) + **Vista Tarjetas** + **Tablero genérico state-driven**. (1) Marco conceptual: nueva sección al inicio de "Arquitectura del template" que formaliza la jerarquía. **Segmentación** define el subconjunto del universo del módulo (mutuamente excluyente, cambia KPIs / filtros disponibles / columnas / acciones); **Vista** define cómo se representa visualmente el dataset segmentado (no cambia datos); **Filtros granulares** restringen el dataset por valores de atributos (multi-valor, ortogonales). Los tres son ortogonales entre sí; la jerarquía es de alcance, no de prioridad. Diagrama ASCII anidado mostrando Segmentación → Vista → Filtros. Documentado el caso del **filtro de período** como filtro con privilegios de UI (mandatorio + default + single-value + afecta agregación de KPIs), no como categoría aparte — referencia viva: `core-trd-frontend/src/components/Liquidity/LiquidityFilters.tsx`. La sección anteriormente "Sub-tabs en el header — patrón estándar" (v1.10) se renombra a **"Segmentación en el header — implementación con sub-tabs"** y se ancla explícitamente al framework: los `.qtabs` no son filtros que casualmente están en sub-tabs, son el segmentador del módulo. Anti-patrones documentados: mezclar segmentación con filtros, poner filtros granulares en L1, aplicar todos los filtros en todos los segmentos, tratar el período como categoría conceptual aparte. (2) Implementación: el toggle de Vistas se vuelve declarativo por módulo (`<MOD>_VIEWS`); cada módulo declara qué vistas soporta y el toggle se renderiza en consecuencia (oculto si solo hay una vista). El Tablero deja de estar hardcodeado a Inbox: cualquier módulo cuyos registros tengan máquina de estados puede declararla via `<MOD>_STATES` (con `column_label`, `order`, `terminal`) y `<MOD>_TRANSITIONS` (con modos `free` / `modal` / `blocked` y `sideEffect` opcional). El Tablero **no asume número fijo de columnas** — renderiza N columnas, una por cada estado declarado. Render del Tablero, columnas, grilla de Tarjetas y drag & drop son genéricos del template (`renderViewToggle` / `setView` / `renderKanban` / `bindKanbanDnD` / `renderCardsGrid` / `handleKanbanTransition`); el módulo solo declara estados y transiciones y registra hooks via `registerModule`. La card de Tarjetas y la card del Tablero comparten render function (`render<Mod>Card(r, mode)`) por consistencia visual. Aplicado a Inbox (las 3 vistas, migrado al patrón genérico manteniendo el comportamiento del v1.9: drag libre `pending↔in_progress`, modal en `*→completed`, `completed` no draggable) y a Módulo Específico A (las 3 vistas con la máquina de estados `PENDIENTE` / `ACTIVO` / `INACTIVO`; `INACTIVO` es terminal — todas las transiciones desde estados no terminales son libres, sin modal). Resto de módulos sin cambios — la adopción la decide cada discovery. Nueva sección "Vistas del módulo (Lista / Tarjetas / Tablero)" en "Arquitectura del template". Anti-patrón documentado: declarar `kanban` sin `MOD_STATES` (el template loguea warning y omite la vista). Nueva CSS: `.cards-grid` (grid responsive `auto-fill, minmax(290px, 1fr)`), `.card-item` (header + body + footer estándar) y toggle interno `.view-list-cards.cards-mode` para alternar tabla ↔ grid sin duplicar markup. |
| 2026-04-21 | Versión inicial del template. Extraído del prototipo OPS (`ops-acciones-prototype.html`) después de validar el patrón L1/L2/L3 en los módulos Movimientos, Quotes y Bancos/Cuentas |
| 2026-04-21 | v1.1 — Account menu agregado al sidebar (Settings · Get Help · Logout). Patrón transversal: todos los prototipos del core lo heredan automáticamente |
| 2026-04-21 | v1.2 — Skeletons definidos para Home (Dashboard), Módulo A (Listado L1/L2/L3) y Módulo B (Master-Detail). El template ahora cubre los 3 patrones estructurales más comunes del core |
| 2026-04-21 | v1.3 — Filtros portal (reemplazan los `<select>` nativos), menú de Acciones por fila (botón 3-puntos + dropdown portal con Editar/Duplicar/Exportar/Eliminar), modal de edición completo y sistema de toast. Paridad de patrones interactivos con el prototipo OPS |
| 2026-04-21 | v1.4 — Columna ID visible en la tabla de registros (mono-font). Modal de Creación cableado al CTA principal (auto-generación de ID secuencial + fecha). Modal de Detalle read-only con grid de campos, accesible desde "Ver detalle" en Acciones, con botón de transición a Editar |
| 2026-04-21 | v1.5 — Sidebar colapsable (60px solo iconos / 200px iconos+labels) con botón flotante en el borde. Click en fila abre el Detalle (antes era una acción del menú). Menú de Acciones rediseniado como **operaciones funcionales del dominio** (Procesar / Confirmar / Generar comprobante / Asignar responsable / Anular), con habilitación por **capabilities del usuario** + **características intrínsecas del registro**. Motivos de deshabilitación visibles con `.dtag` + tooltip nativo |
| 2026-04-27 | v1.6 — Incorporación de los 4 módulos genéricos del financial-core como skeletons funcionales del template, alineados con el modelo "núcleo + capacidades opcionales" del framework v1.1. Dashboard renombrado desde Home, Inbox como placeholder, Alertas implementa el perfil B · Workflow completo, Reportes implementa todas las capacidades incluyendo dependencias inter-área y emisión de REPORT_DEPENDENCY. Comentarios `// CAPACIDAD` en el JS indican cómo desactivar capacidades opcionales al clonar para apps con otros perfiles. Nueva sección "Módulos genéricos del financial-core" con guía de declaración de perfil + personalización al clonar. Convención de ubicación: los 4 genéricos van al tope del sidebar, al mismo nivel y sin agruparlos bajo ningún `<div class="sb-section">` (los bloques se reservan para los módulos específicos del dominio). Referencia a `framework/financial-core-modules.md` v1.1 como fuente de verdad. |
| 2026-04-27 | v1.7 — Nueva sección "Qué vive en cada módulo genérico" con vocabulario operativo: tabla de qué tipo de contenido puebla cada módulo, ejemplos transversales (Inbox / Alertas / Reportes / Dashboard) y heurística rápida para decidir si una funcionalidad va a un genérico o a un módulo del dominio. Sin cambios al HTML del template — solo documentación. |
| 2026-04-27 | v1.12 — **Patrón "Dropdowns en formularios — componente custom"** y **"Acciones por fila → dropdown contextual, no drawer"** (dos secciones nuevas en "Arquitectura del template"). Los formularios y modales nunca usan `<select>` nativo: en su lugar `.fsel-block` (variante full-width del `.fsel`) con portal `.dd` (z-index 9999 para sobrepasar el modal). Subsistema JS: `FORM_DD` (estado), `FORM_DD_OPTS` (configuración con label/placeholder/items con dot opcional), `openFormDD` / `selectFormDD` / `closeFormDD` / `updateFormDDLabel`. `closeAllPortals()` extendido. Aplicado en el template a los modales **Crear Registro** (categoria, estado) y **Editar Reporte** (categoría, periodicidad). Patrón de Acciones por fila estandarizado: click en la fila abre el detalle; botón de 3 puntos abre dropdown contextual con acciones según estado del registro (acciones no aplicables como `.di.dis` + `dtag` + tooltip). Aplicado a Alertas (asignar/reasignar/resolver/descartar/reabrir/ver detalle). Anti-patrón: que el botón de Acciones repita el comportamiento del click en la fila. Nueva CSS `.fsel-block` (full-width, padding amplio, ellipsis para labels largos, placeholder en `var(--t4)`). |
| 2026-04-27 | v1.11 — **Patrón "Main CTA con color principal"** (nueva sección en "Arquitectura del template"): el CTA principal de cada módulo siempre con `class="btn btn-p"` (fondo brand), nunca con `btn` outline. Aplicado al template: Inbox y Alertas pasan de `btn` a `btn-p` en "Exportar a CSV". **Refinamiento del patrón v1.10**: el patrón "Sub-tabs en el header" aplica solo a sub-tabs que filtran registros del mismo dominio (Activos/Histórico, Nuevas/Histórico, Catálogo/Histórico). NO aplica a qtabs que dividen el módulo en secciones funcionales con CTA y KPIs propios — esos viven debajo del `.ph` para preservar la regla "Main CTA siempre en la línea del título". Caso documentado: Tesorería de FIN (Posición/Movimientos/Carga/Cola). |
| 2026-04-27 | v1.10 — **Patrón estándar "Sub-tabs en el header"** (nueva sección en "Arquitectura del template"). Los `.qtabs` que filtran registros del módulo (Activos/Histórico, Nuevas/Histórico, Catálogo/Histórico) ahora viven en `.ph-actions` del L1 Page Header, en la misma línea que el título, las vistas (Lista/Tablero) y el CTA principal — no debajo de los KPIs. Aplicado a los 3 módulos del template que usan sub-tabs: **Inbox** (Activos/Histórico, ocultos cuando la vista activa es Tablero), **Alertas** (Nuevas/Histórico) y **Reportes** (Catálogo/Histórico). Reportes ahora tiene un único `.ph` global (con título "Reportes") en lugar de un `.ph` interno por cada `qpanel`. Agregada regla CSS `.ph-actions .qtabs{margin-bottom:0}` para que los qtabs no dejen espacio extra cuando están en el header. Removido del catálogo de Reportes el `.info` con la nota sobre §8.2 — la decisión vive en el framework, no como ruido visual recurrente. |
| 2026-04-27 | v1.9 — **Inbox promovido de placeholder a skeleton funcional canónico** (§9.4 del framework: la primera app que lo implementa lo promueve al template). Portado desde `prototypes/ops/ops-inbox-prototype.html`. Trae las dos vistas: **Lista** (default) con KPIs + sub-tabs Activos/Histórico (patrón qpanel idéntico a Reportes) + filtros + tabla; y **Tablero** (Kanban con drag & drop entre To Do / In Progress / Done). Drawer lateral con timeline + comentarios y modal de cierre con `closeActions` declarados por tipo. Dataset demo con los 8 tipos OPS (`WITHDRAWAL_REQUEST`, `SWAP_REQUEST`, `RFQ_REQUEST`, `DEPOSIT_MATCHING`, `IMPUTATION_REQUEST`, `KYC_HOLD`, `REPORT_DEPENDENCY`, `MANUAL_TASK`) y 13 solicitudes dummy — al clonar para otra app, reemplazar `INB_TYPES` e `INB_ITEMS` por los del dominio. Comentarios `// CAPACIDAD` para desactivar vista Tablero, Histórico, SLA tracking, asignación humana, comentarios y modal de cierre. **Terminología normalizada: la unidad de gestión del Inbox es la "Solicitud"** (no "item" genérico) — aplicado a empty states, README y guía de personalización. **Vista Lista no muestra Monto** (la columna se eliminó del thead y de las render rows + de las kanban cards) — el monto vive solo en el detalle del drawer (sub-header + detail-grid). Fixes de layout: agregado `min-width:0` al `.main` (era flex item con `min-width:auto` por default, lo que causaba overflow horizontal del viewport con contenido ancho del Inbox), y `overflow-x:auto` en las dos `.tw` del Inbox como cinturón de seguridad ante futuros tipos con labels más largos. Tamaño del template: ~5269 líneas (antes ~3537). |
