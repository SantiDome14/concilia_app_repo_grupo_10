---
name: ardua-req-enrichment
description: "Enriquece un requerimiento existente en Jira (proyecto PWI) tomando como base el hilo de Slack vinculado al ticket y la base de conocimiento del proyecto (framework, entities, discoveries, features). Soporta tres modos: Detallado (con challenge al stakeholder), Express (formateo directo, sin challenge) y Refactorización (revisión post-promoción que actualiza también el EWI espejo del tablero TECHNOLOGY). Produce un requerimiento estructurado en formato PWI-1. Activar cuando el usuario diga \"enriquecer un requerimiento\", \"quiero enriquecer el PWI-XX\", \"mejorar un ticket\", \"refactorizar el PWI-XX\" o similar. Si el usuario indica el modo (\"express\", \"detallado\" o \"refactorización\") en el prompt inicial, usarlo directamente; si no, preguntarlo. Si no se proporciona el key del PWI, solicitarlo antes de continuar."
---

# Skill: Enriquecimiento de Requerimientos

## Propósito

Convertir un requerimiento capturado (típicamente por Miles vía Slack) en un requerimiento estructurado en formato PWI-1, listo para desarrollo. El enriquecimiento opera en tres modos según la profundidad de análisis necesaria, la urgencia de tramitación y si el PWI ya pasó al ciclo de desarrollo.

**Principio central:** el hilo de Slack del requerimiento es su contexto base. Todo lo que ocurra durante el enriquecimiento (preguntas, challenges, hallazgos) debe quedar registrado en ese hilo. Fuera del hilo, técnicamente estamos fuera del requerimiento.

**Cuando no existe hilo de Slack:** la base de conocimientos del proyecto (framework, entities, discoveries, features) actúa como fuente de contexto primaria. Los challenges se presentan directamente al usuario en el chat.

---

## Foco funcional, no técnico

Los requerimientos enriquecidos se dirigen a dos audiencias: **stakeholders no técnicos** del negocio (Legal & Compliance, Trading, Operaciones, Comercial, etc.) y el **área de Desarrollo**. La definición técnica es ownership exclusivo de Desarrollo — el área de Producto define **qué** se construye y **por qué**; nunca el **cómo** se implementa.

**Regla operativa:**

- ✅ _"El sistema permite editar el monto y la fecha de fin de un límite existente sin eliminarlo y volverlo a crear."_ — describe la capacidad funcional.
- ❌ _"El frontend invoca `PATCH /limit/{id}` para actualizar el registro en la tabla `limits`."_ — describe la implementación.
- ✅ _"Modal de cierre shared: wrapper temático del modal de acción, con header y copy específicos para transiciones de cierre."_ — describe el concepto producto.
- ❌ _"`<ClosureModal>` shared del core, construido sobre `<ManifestDialog>`."_ — referencia componentes literales del frontend.

**Esto aplica a TODO lo que produce el skill:**

- La descripción enriquecida del PWI.
- Los challenges al stakeholder en Slack (Paso 4 modo Detallado).
- Los comentarios y notas que el skill publique.
- La sección de "Cuestiones pendientes" en modo Express.

**Qué evitar explícitamente:**

- Nombres de endpoints, métodos HTTP, contratos de API.
- Modelos de datos, estructuras de tablas, nombres de campos a nivel base de datos.
- Frameworks, librerías, stacks técnicos.
- Decisiones de arquitectura (cómo se sincronizan dos sistemas, qué patrón de diseño usar, dónde correr una tarea).
- **Nombres literales de componentes del frontend** en angle brackets (`<ManifestActionsMenu>`, `<ClosureModal>`, `<KpiCard>`, etc.). En el PWI hablamos de "menú de acciones", "modal de cierre", "KPI card" como conceptos producto, no como handles del código.
- **TypeScript inline** (interfaces, type aliases, código de cualquier tipo). Los discriminadores y estructuras van como tablas funcionales o prosa con campos nombrados, sin `interface { ... }`.
- **Performance budgets con números concretos** en milisegundos o cantidades exactas (FMP < 1s, evaluación < 5ms, cap blando = 200 cards). Los SLAs de performance se acuerdan en refinement con Tecnología, no en el PWI. El PWI puede decir "performance preserva fluidez para el volumen esperado" sin números.
- **Referencias a especificaciones internas, OpenSpec o nomenclatura interna del template** ("core-modals", "L1/L2/L3", "Type A/Type B"). Eso vive en documentación de Tecnología.

**Excepción acotada:** si una **dependencia arquitectónica conocida** afecta el scope (por ejemplo: "esta capacidad depende de que primero se incorpore el módulo X"), referenciarla a nivel funcional sin entrar en cómo se implementa.

Cuando el knowledge base o el hilo de Slack contengan información técnica, el rol del skill es **traducirla a lenguaje funcional**, no replicarla. Si el stakeholder usa terminología técnica en el hilo, capturar la intención funcional debajo y challengear ambigüedades en términos del comportamiento esperado, no de la implementación.

---

## Modos de enriquecimiento

### Detallado (default)

Análisis profundo del requerimiento contra la base de conocimiento y el hilo de Slack. Incluye un challenge explícito al stakeholder con preguntas concretas que deben responderse antes de estructurar el requerimiento. Es el modo correcto cuando:

- Hay ambigüedad de scope que impediría escribir criterios de aceptación claros
- Existen contradicciones entre el ticket y el knowledge base
- Hay dependencias arquitectónicas o prerequisitos sin resolver
- El stakeholder no validó decisiones clave con Producto o Tecnología

### Express

Formateo directo del requerimiento para tramitarlo inmediatamente a Sent to Dev, sin challenge al stakeholder. Es el modo correcto cuando:

- El stakeholder y el Dev ya conversaron sobre la solución
- Es un bug o ajuste puntual que no requiere análisis
- Hay urgencia operativa que prioriza el movimiento del ticket

**Preservación de trazabilidad en Express:** si durante el formateo emergen ambigüedades o preguntas obvias, se registran en una sección dedicada del requerimiento (`## 🔍 Cuestiones pendientes de revisión`) y se replican en el hilo de Slack al cierre. No se profundizan, pero quedan documentadas por si el scope crece o aparecen bugs.

### Refactorización (post-promoción)

Aplica sobre PWIs que **ya están en `SENT TO DEV`** (o estados posteriores) y necesitan ser revisados, limpiados o realineados después de pasar al ciclo de desarrollo. Casos típicos:

- Limpiar filtración técnica que se coló en una iteración previa (componentes literales del frontend, TypeScript inline, performance budgets, nomenclatura interna).
- Alinear el PWI post-refactor de modelo del producto (cambia el modelo, los PWIs ya promovidos quedan desalineados).
- Consolidar decisiones tomadas con stakeholders después de la promoción.

A diferencia de Detallado y Express, este modo:

- **Preserva el status `SENT TO DEV`.** No transiciona el ticket en ningún caso.
- **Propaga TODOS los cambios al EWI espejo** del tablero TECHNOLOGY. La automation que crea el EWI solo se dispara una vez (al primer pase a `SENT TO DEV`); cualquier cambio posterior al PWI no se propaga automáticamente. El skill actualiza EWI manualmente — descripción y summary — para mantener consistencia PWI ↔ EWI.
- **Alinea el summary del EWI con el summary del PWI** (mismo string exacto).
- **No usa Slack para challenge ni cierre.** Los PWIs en `SENT TO DEV` ya pasaron por enrichment original; las decisiones del refactor se validan con el PM directamente en el chat antes de ejecutar.
- **Sigue las mismas reglas de "Foco funcional, no técnico"** y el template PWI-1 completo (Resumen, Contexto, Objetivo, Alcance, Fuera de alcance, Criterios, Dependencias, Solicitante).

Refactorización es operativamente delicado — afecta dos tickets en simultáneo. Validar con el PM owner del PWI el alcance del refactor antes de aplicar.

### Selección del modo

**Si el usuario indica el modo en el prompt inicial** (ej: _"enriquecé express el PWI-44"_, _"hacé un enriquecimiento detallado del PWI-23"_, _"refactorizá el PWI-71"_) → usar directamente ese modo.

**Si el modo no queda claro** → al inicio del flujo, usar `ask_user_input`:

```
ask_user_input(
  question: "¿Qué tipo de enriquecimiento querés hacer?",
  options: [
    "Detallado — análisis profundo con challenge al stakeholder",
    "Express — formateo directo para mover el ticket a Sent to Dev",
    "Refactorización — revisar un PWI ya en SENT TO DEV (también actualiza el EWI espejo)"
  ]
)
```

**Validación de pre-condición — modo Refactorización:** si el modo elegido es Refactorización, verificar que el status del PWI sea `SENT TO DEV`, `READY FOR DEV`, `IN DEVELOPMENT` o `DONE`. Si está en un estado anterior, informar al usuario y proponer Detallado/Express. Si está en `DONE`, validar con el PM si el refactor todavía tiene sentido o si conviene crear un PWI nuevo.

---

## Ciclo de vida del work item (tablero PWI ↔ tablero EWI)

> **Fuente canónica:** el modelo completo de proyectos, boards, tipos de work item y ciclo de vida vive en `framework/jira.md`. Esta sección resume solo lo que el enriquecimiento necesita saber. Ante cualquier divergencia, prevalece `framework/jira.md`.

Un work item del área de Producto vive en el proyecto **PRODUCT (PWI)**. Cuando se trata de un Requirement (el flujo tradicional) y el PM lo mueve a `SENT TO DEV`, una automatización crea un **espejo en el proyecto TECHNOLOGY (EWI)**. Entender este flujo es clave para no confundir lo que el skill puede tocar y lo que no.

### Sobre qué opera el enriquecimiento

El enriquecimiento **no está atado al issue type**. Puede aplicarse a un Requirement, a un Work Automation, a una Activity o a cualquier otro work item de PWI. Lo que cambia según el tipo es si existe (o no) un espejo en EWI a sincronizar:

- **Requirement** — al pasar a `SENT TO DEV` genera espejo en EWI. El modo Refactorización sincroniza ese espejo (ver Paso 8).
- **Work Automation, Activities y otros** — ejecutados por Producto, **no generan espejo en EWI**. El enriquecimiento opera solo sobre el work item de PWI; el sub-flujo de sincronización del espejo no corre.

Regla operativa: el sub-flujo que toca el espejo en EWI **solo se ejecuta cuando el espejo existe** (se detecta por el vínculo `causes` / `is caused by`). Si no hay espejo, el enriquecimiento termina en PWI.

### Estados del tablero PRODUCT y su ownership

| Estado           | Ownership          | Significado                                                                                              |
| ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `TO DO`          | Producto           | Work item capturado (ej: por Miles), sin enriquecer todavía                                              |
| `IN ANALYSIS`    | Producto           | Enriquecimiento en proceso (challenges abiertos, validaciones con stakeholder)                           |
| `IN PROGRESS`    | Producto           | Para tasks internas del área de Producto que ejecuta Producto y no van a Tecnología                      |
| `BLOCKED`        | Producto           | Bloqueado por dependencia externa al área                                                                |
| `DEPRECATED`     | Producto           | Work item descartado o absorbido por otro                                                                |
| `SENT TO DEV`    | Espejado desde EWI | (Solo Requirements) Se disparó la automation y el espejo en EWI fue creado                               |
| `READY FOR DEV`  | Espejado desde EWI | Refleja el estado del espejo en EWI                                                                       |
| `IN DEVELOPMENT` | Espejado desde EWI | Refleja el estado del espejo en EWI                                                                       |
| `DONE`           | Espejado desde EWI | Refleja el estado del espejo en EWI                                                                       |

Los cuatro estados de la mitad inferior **no son ownership de Producto** — reflejan literalmente cómo se mueve el espejo en el tablero de Tecnología.

### El momento clave: pasar a `SENT TO DEV` (solo Requirements)

Cuando el PM transiciona un Requirement a `SENT TO DEV` (manualmente, no lo hace el skill), se dispara una **automation que crea una Épica espejo en EWI**, vinculada al Requirement con relación `causes` y heredando la descripción enriquecida. La Épica arranca en `TO REFINEMENT`, en el **board de Refinement** de EWI.

EWI tiene dos boards (ver `framework/jira.md`): Refinement (solo Épicas, para el refinamiento técnico) y Development (Stories/Tasks/Subtasks, para la ejecución). Cuando el refinamiento se completa y la Épica pasa a `READY FOR DEV`, una automatización **cambia su issue type de Épica a Story** (y el de sus hijos de Task a Subtask): el work item desaparece del board de Refinement y aparece en el de Development. El mismo EWI-XX persiste — solo cambia de tipo — y el Requirement en PWI sigue asociado a él sin importar su nuevo tipo.

Para el enriquecimiento esto importa en un solo punto: **al buscar el espejo, hacerlo por el vínculo `causes` / `is caused by`, nunca asumiendo que es una Épica** — puede ya haberse transformado en Story.

### Implicancia directa para el enriquecimiento

La descripción enriquecida que produce este skill **es la base sobre la que Desarrollo va a trabajar** (cuando hay espejo) — no es solo documentación de Producto. Esto refuerza tres reglas:

1. **El enriquecimiento debe estar completo antes de transicionar a `SENT TO DEV`.** Después, cualquier ajuste implica intervenir tanto el work item de PWI como el espejo en EWI, lo cual es operativamente caro.
2. **El contenido debe ser funcionalmente claro** para que Desarrollo pueda traducirlo a definición técnica sin ambigüedad (ver sección "Foco funcional, no técnico").
3. **El skill nunca transiciona el ticket.** La transición a `SENT TO DEV` la hace el PM manualmente después de revisar el enriquecimiento — porque dispara la creación del espejo en EWI, que es un evento operativo significativo.

---

## Base de conocimientos del proyecto

Las fuentes de conocimiento viven en el repositorio `products`, que cada integrante del área de Producto clona en su máquina. La ruta concreta varía por usuario y sistema operativo (macOS, Windows, Linux); se resuelve dinámicamente en el Paso 0c y se referencia en este skill como `<KB_ROOT>`. Antes de cargar cada carpeta, listar su contenido con `Filesystem:list_directory` — no asumir qué archivos existen.

**Requisito de entorno:** este skill depende del Filesystem MCP para leer el repositorio clonado, por lo que solo opera en Claude Desktop.

### El happy path: la triada `discoveries/` → `features/` → `prototypes/`

El framework se organiza alrededor de un flujo conceptual:

> **Investigar → Definir → Prototipar**
> `discoveries/` → `features/` → `prototypes/`

- `discoveries/` captura **hipótesis bajo investigación**. Cuando una hipótesis madura, sus conclusiones se **propagan** al feature file correspondiente. Es el registro del _proceso de validación_, no del estado actual.
- `features/` es la **fuente de verdad del estado actual de cada producto** — qué hace hoy, qué módulos tiene, qué decisiones lo sostienen. Una carpeta por aplicación del core (`clp`, `trd`, `lex`, `ops`, `fin`), más `features/common/` para capacidades transversales (cross-product, sin prefijo de aplicación).
- `prototypes/` contiene **un proyecto frontend autocontenido por producto** — la representación visual y navegable del ideal de producto, usada como herramienta de alineación con stakeholders. No refleja producción; refleja lo acordado.

**Cardinalidades importantes:**

- **Discovery ↔ Features: N-N.** Una hipótesis puede impactar varios features; un feature puede recibir aportes de varios discoveries a lo largo de su vida.
- **Features ↔ Prototypes: 1-1 a nivel producto.** `features/clp/` ↔ `prototypes/clp/`. Las features individuales (`clp-rfq.md`, `clp-earn.md`) se reflejan como **vistas o módulos dentro del mismo prototipo** del producto, no como prototipos separados.

Esto importa para el enriquecimiento porque cada requerimiento se ancla en algún punto de la triada y obliga a leer el conjunto correcto de archivos: el estado actual (`features/`), las investigaciones abiertas que lo afectan (`discoveries/`), y la referencia visual (`prototypes/`).

### 1. `framework/` — constraints foundational

`<KB_ROOT>/framework/`

Leer **todos** los archivos presentes. Definen el marco legal, operativo, contable, la misión, visión, valores y el roadmap del proyecto. Son constraints de diseño — toda decisión del requerimiento debe validarse contra ellos. La referencia canónica del framework es `project-instructions.md`.

### 2. `entities/` — catálogo del ecosistema operativo

`<KB_ROOT>/entities/`

Consultar **cuando el requerimiento menciona una entidad** (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures, Binance, Bitso, Bridge, Convera, Brubank, etc.). Leer el archivo `[nombre-entidad].md` correspondiente — describe qué capacidades operativas habilita esa entidad.

Si el requerimiento menciona una entidad y no existe el archivo → flaguearlo al cierre y proponer crearlo.

### 3. `features/` — fuente de verdad del estado del producto

`<KB_ROOT>/features/`

Carpeta por producto del financial-core (`clp`, `trd`, `lex`, `ops`, `fin`) más `features/common/` para features transversales.

**Estructura interna de cada `features/[aplicacion]/`:**

- `README.md` — estado global del producto: propósito, módulos, estado actual de cada módulo, decisiones clave, frentes abiertos (con referencia a discoveries), stakeholders. Es la primera puerta de entrada al producto y siempre se lee primero.
- `[aplicacion]-[modulo-o-feature].md` — especificación consolidada de una feature o módulo específico: contexto, objetivo, alcance funcional, fuera de alcance, criterios de aceptación. **No incluye** modelos de datos, endpoints ni decisiones arquitectónicas (eso vive en el PRD técnico, ownership de Tecnología).

**`features/common/`:** features que cruzan dos o más productos con la misma semántica (notificaciones unificadas, alertas, inbox transversal, sistema de acciones). Los archivos acá **no llevan prefijo de aplicación** (la carpeta ya define el contexto).

**Para el enriquecimiento, leer en este orden:**

1. `features/[aplicacion]/README.md` — entender el estado global del producto.
2. Los `[aplicacion]-[modulo-o-feature].md` que el requerimiento toca directamente.
3. Si el requerimiento involucra una capacidad transversal (notificaciones, alertas, etc.) → revisar `features/common/[capacidad].md`.

### 4. `discoveries/` — investigación de hipótesis

`<KB_ROOT>/discoveries/`

Carpeta **plana**: todos los discoveries viven directamente bajo `discoveries/`, sin subcarpetas. El estado y alcance de cada discovery se declaran en el **YAML frontmatter** del archivo:

```yaml
---
name: [Título descriptivo]
features: [LEX] # productos afectados; [COMMON] para transversales; [] para infraestructura
status: En investigación # En investigación | Concluida | Descartada
owner: [Nombre del PM]
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
---
```

**Para el enriquecimiento:**

- Filtrar los discoveries por el campo `features:` del frontmatter para encontrar los que afectan la aplicación del requerimiento (`[CLP]`, `[LEX, FIN]`, `[COMMON]`, etc.).
- Priorizar los `status: En investigación` — capturan hipótesis abiertas y blockers activos que pueden impactar el scope del PWI.
- Leer los `Concluida` o `Descartada` solo si el requerimiento referencia una decisión consolidada y se necesita entender cómo se llegó a ella.

**Naming convention:**

- `[aplicacion]-[topic]-discovery.md` — scoped a un producto/módulo (`clp-earn-discovery.md`, `trd-proveedores-de-liquidez-discovery.md`).
- `[topic]-discovery.md` — transversal o de infraestructura (`jira-automations-discovery.md`, `observabilidad-discovery.md`).

**Regla crítica de propagación:** cuando una hipótesis se concluye, sus hallazgos relevantes se propagan al feature file correspondiente en `features/`. Un aprendizaje validado que no actualiza `features/` es una fuga.

**Discovery-First Principle:** si el requerimiento implica trabajo de investigación o validación de hipótesis y no existe ningún discovery relacionado, proponer crearlo **antes de avanzar** con el enriquecimiento, no al cierre:

> _"No encontré discovery relacionado con [aplicación/módulo o tema]. Como el requerimiento implica hipótesis a validar, tiene sentido abrir el discovery antes de enriquecer el PWI. ¿Arrancamos con un discovery básico y después retomamos?"_

Este principio **no aplica** a requerimientos que son ajustes puntuales, bugs o cambios sobre features ya consolidadas — solo cuando hay genuino trabajo de investigación pendiente.

### 5. `prototypes/` — representación visual del producto

`<KB_ROOT>/prototypes/`

Carpeta con **un proyecto frontend autocontenido por producto** (`prototypes/clp/`, `prototypes/trd/`, etc.) más un template genérico (`_core-template-frontend/`) que sirve de base para nuevos prototipos. Cada proyecto tiene su `package.json`, `src/`, dependencias declaradas y se puede levantar localmente con `npm install && npm run dev`.

**Punto clave para el enriquecimiento:** las features individuales **no son prototipos separados** — son vistas o módulos dentro del mismo proyecto del producto. La feature `clp-rfq.md` se refleja como una vista o ruta dentro de `prototypes/clp/`, no como una carpeta o archivo aparte.

**Cómo usar `prototypes/` en el enriquecimiento:**

- Leer `<KB_ROOT>/prototypes/[aplicacion]/README.md` cuando existe — documenta el stack, el alcance actual del prototipo, qué hipótesis valida y qué referencias hay a `features/[aplicacion]/`.
- Identificar si la feature del requerimiento ya tiene representación visual en el prototipo. Si la tiene, referenciarla en el campo `Prototipo` del PWI-1 (ver "Formato de referencia").
- Si la feature **no** está representada y el requerimiento la consolida, anotarlo como acción posterior — la iteración del prototipo se hace por separado, no es parte del enriquecimiento.

El prototipo refleja **el ideal acordado**, no producción. Se itera junto con `features/[aplicacion]/`: cuando una feature se agrega/cambia en features, se itera el prototipo.

### 6. Notion — Teamspace de Productos (complementario)

Usar `Notion:notion-search` con términos clave del requerimiento. Teamspace ID: `317e8880-def6-8062-b0e0-000b5da91cd6`. Complementa el knowledge base local cuando la información allí no alcanza.

---

## Formato de referencia: PWI-1

El requerimiento enriquecido sigue la estructura de PWI-1, el estándar establecido:

```
**Requerimiento:** [Nombre]
**Aplicación:** [TRD / OPS / LEX / CLP / FIN]
**Módulo:** [Módulo dentro de la aplicación, si aplica — ej: "Proveedores de Liquidez", "Límites", "Earn"]
**Tipo:** Feature / Bug / Improvement / Spike
**Prioridad:** Alta / Media / Baja
**Carácter:** Permanente / Temporal / Experimental

---

## Resumen
[2-3 párrafos densos. Qué es el PWI, qué cambia, propiedades estructurales clave del modelo si las hay, y qué entrega concretamente. Permite que un lector entienda el PWI sin leerlo completo.]

---

## Contexto
[Situación actual, por qué existe el problema, impacto operativo. Incluir dependencias
funcionales clave y prerequisitos sin resolver si son relevantes para el diseño.]

---

## Objetivo
- [Bullet 1 — resultado esperado, no descripción de la solución]
- [Bullet 2]
- [Bullet N]

---

## Alcance funcional

### 1. [Sección — típicamente el modelo conceptual si el PWI introduce uno]
[Descripción funcional — nivel "el sistema hace X cuando el usuario hace Y". Sin datos
técnicos, sin endpoints, sin modelos de datos, sin TypeScript.]

### N. [Sección]
[Descripción funcional]

---

## Fuera de alcance (v1)
- [Item 1]
- [Item N]

---

## Criterios de aceptación
- [Criterio observable y verificable, sin ambigüedad]
- [Criterio N]

---

## Dependencias
- [PWI-XX o sistema externo — qué provee, por qué este PWI lo necesita o, si aplica, qué consume este PWI desde aquí]
- [PWI-XX o sistema externo — ...]

---

[SECCIÓN CONDICIONAL — solo en modo Express, solo si hay cuestiones sin profundizar:]

## 🔍 Cuestiones pendientes de revisión

Estas quedaron identificadas durante el enriquecimiento pero no se profundizaron por tratarse de un enriquecimiento Express. Se recomienda revisarlas si el scope crece, si aparecen bugs, o antes de iteraciones mayores sobre esta feature.

- [Cuestión 1 — qué está pendiente y por qué importa]
- [Cuestión N]

---

**Solicitante:** [Nombre — Rol]
**Prototipo:** [referencia dentro de prototypes/[aplicacion]/ — ruta interna como /proveedores-de-liquidez, URL desplegada, o nombre del componente/vista] ← solo si la feature ya está representada en prototypes/[aplicacion]/
```

**Variant B — PWI transversal del core**

Para PWIs que entregan infraestructura transversal del core (consumida por todas las aplicaciones, no asociada a una sola), reemplazar el bloque `Aplicación` + `Módulo` de la metadata por una sola línea:

`**Sistema:** CORE (transversal)`

El resto de la metadata queda igual (Tipo, Prioridad, Carácter). Todo el body (Resumen, Contexto, ... , Solicitante) se construye exactamente igual que en Variant A.

---

**Reglas sobre los campos de metadata:**

- **Aplicación (Variant A):** siempre indicar la aplicación del core (TRD, OPS, LEX, CLP, FIN). Para productos transversales con nombre propio (Prime Desk RFQ, Ardua PnL Report, etc.), usar el nombre del producto en vez de una aplicación del core.
- **Módulo (Variant A):** opcional, solo cuando el requerimiento afecta un módulo específico dentro de una aplicación. Si el PWI es transversal a toda la aplicación, omitir el campo.
- **Sistema (Variant B):** valor canónico `CORE (transversal)` para infraestructura transversal del core. No se usa esta variante para PWIs por aplicación.
- **Modo de enriquecimiento:** campo **opcional**, no incluido en el template por default. Se omite en PWIs grandes y consolidados producidos en modo Detallado o Refactorización (su presencia en la descripción final no aporta valor al lector). Incluirlo solo en PWIs producidos en modo Express, como trazabilidad de proceso — especialmente cuando hay sección de "Cuestiones pendientes".

**Reglas sobre las secciones nuevas del body:**

- **Resumen:** primero después de la metadata. 2-3 párrafos densos. Cuenta qué es el PWI, qué cambia, las propiedades estructurales clave si las hay, y qué entrega concretamente. Permite que un lector entienda el PWI sin leerlo completo.
- **Dependencias:** lista de PWIs o sistemas externos que este PWI necesita o que dependen de él. Una línea por dependencia, con prosa que aclara la dirección (qué provee / qué consume). Si el PWI es transversal habilitante, los consumidores se mencionan en esta misma lista identificándolos como tales.

---

## Convenciones de naming

**El summary del PWI y el campo `Requerimiento:` de la descripción son idénticos.** Coincidencia exacta. Hay automation de Jira planeada para enforce esta regla en el futuro; mientras tanto, el skill garantiza la coincidencia al actualizar Jira.

**Patrón del summary según tipo de PWI:**

| Variante                    | Patrón                                            | Ejemplo                                                 |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| PWI por aplicación          | `[Verbo] [APP] — [Capacidad]`                     | "Expandir TRD — Gestión de Exposición FX"               |
| PWI transversal por dominio | `[Verbo] [DOMINIO] — [Capacidad]`                 | "Integrar KYC — Verificación Automatizada de Identidad" |
| PWI transversal del core    | `[MÓDULO] — Infraestructura Transversal del Core` | "INBOX — Infraestructura Transversal del Core"          |

**Verbos canónicos:**

- **Construir** — primera versión de algo nuevo.
- **Expandir** — agregar capacidad sobre una app existente.
- **Automatizar** — eliminar trabajo manual sobre un proceso existente.
- **Integrar** — incorporar una capacidad o sistema externo al ecosistema.
- **Migrar** — mover un proceso/sistema a un nuevo soporte (de planilla a sistema, de un proveedor a otro, etc.).

---

## Patrones de construcción del PWI

Cuatro patrones recurrentes en PWIs producto-grade. Aplicarlos cuando corresponda — no son obligatorios en todos los PWIs, pero cuando aplican, comunican mejor.

### Modelo conceptual al inicio del Alcance funcional

Cuando el PWI introduce o consolida un modelo del dominio (entidades, discriminadores, relaciones), dedicar la **§1 del Alcance funcional** a explicarlo en prosa + tablas funcionales, sin código. Esto permite que el resto del Alcance se lea sobre una base entendida.

**Cómo se ve en la práctica:**

- Cuando el modelo tiene un **discriminador central** (un tipo que parte el comportamiento en dos o más ramas), explicarlo como tabla con columnas "Tipo | Qué hace | Ejemplos típicos", sin TypeScript ni `interface`. El lector entiende la distinción antes de entrar al detalle de cada rama.
- Cuando una mecánica del producto es en realidad **una instancia de otra ya definida** (ej: una interacción de UI que por debajo es la misma operación que una acción del catálogo), documentarla como propiedad estructural en prosa — "X es literalmente una Y" — sin bajar al contrato de código. Comunica la economía del modelo sin acoplar el PWI a la implementación.

### Tablas funcionales sobre TypeScript

Para enumerar estados, fuentes de invocación, tipos, categorías, capacidades — usar **tablas con columnas que describen el concepto**, no campos del modelo de datos. Una tabla bien hecha reemplaza una `interface` y comunica mejor a stakeholders no técnicos.

Regla práctica: si tu instinto es escribir `interface X { ... }`, parar y convertirlo en tabla funcional. Las columnas describen significado, no nombres de campos.

### Iconografía conceptual permitida

El PWI puede declarar iconografía a nivel concepto cuando sirve para comunicar comportamiento:

- ✓ para "completar/marcar"
- ↗ para "invocar otra cosa"
- Otros íconos cuando aporten claridad funcional

Lo que **no** va en el PWI: atar la iconografía a un componente del frontend ni declarar la librería de íconos (ej: "usamos lucide-react vX"). El visual fino se cierra en refinement con Diseño.

### Detalle visual diferido a refinement

Cuando el PWI define el contrato funcional de un componente pero el detalle visual fino (paleta, ejes, tooltips, animaciones, layout) requiere Diseño + Tecnología, **incluir nota explícita en la sección correspondiente**:

> _El detalle visual final del componente queda a definir en refinement con Diseño + Tecnología. El contrato a nivel PWI es [...]._

Esto evita hand-rolling un mockup detallado en el PWI. El PWI define **qué hace el componente y qué tipos soporta**; el visual lo cierra Diseño en refinement.

Aplica especialmente a: componentes de chart, surfaces nuevas, layouts complejos, microinteracciones.

---

## Flujo completo

### Paso 0 — Verificaciones iniciales

#### 0a. Key del requerimiento

Si el usuario no proporcionó el key del PWI → preguntar:

> _"¿Cuál es el key del requerimiento que querés enriquecer? (ej: PWI-44)"_

No continuar hasta tener el key.

#### 0b. Modo de enriquecimiento

Si el usuario indicó el modo explícitamente en el prompt inicial → usar directamente.

Si el modo no está claro → usar `ask_user_input` (ver sección "Selección del modo" arriba). Esperar la respuesta del usuario antes de continuar.

#### 0c. Resolver `KB_ROOT` (silencioso)

Resolver dinámicamente la ubicación del repositorio `products` en la máquina del usuario. **No comentar este paso en el chat** — se ejecuta por debajo y `KB_ROOT` se utiliza internamente en todos los pasos siguientes.

El nombre de carpeta `products` es genérico y puede colisionar con otras carpetas, por lo que la resolución **no se basa en el nombre** sino en la **estructura interna del repo**. Un directorio es `KB_ROOT` si contiene simultáneamente las subcarpetas `framework/`, `discoveries/` y `features/` (firma estructural del repo del framework).

1. Llamar a `Filesystem:list_allowed_directories`.
2. Para cada ruta devuelta, listar su contenido con `Filesystem:list_directory` y verificar si contiene las tres subcarpetas firma (`framework/`, `discoveries/`, `features/`). La primera ruta que las contenga es `KB_ROOT`.
3. Si ninguna allowed directory las contiene directamente, listar las subcarpetas de cada allowed directory y repetir la verificación un nivel más abajo (el repo puede estar clonado dentro de una carpeta contenedora).
4. Si aún no aparece, recién entonces preguntar al usuario:
   > _"No encuentro el repo `products` (la carpeta con `framework/`, `discoveries/` y `features/`) entre los directorios accesibles. ¿Podés pasarme la ruta donde lo tenés clonado, o agregarlo a las allowed directories del Filesystem MCP?"_

**Notas:**

- La verificación por estructura es robusta entre sistemas operativos (macOS, Windows, Linux) y no depende de que la carpeta conserve el nombre `products` — funciona aunque el usuario la haya clonado con otro nombre.
- Si el Filesystem MCP no está disponible (ej: claude.ai web/mobile), informar al usuario que el skill requiere Claude Desktop y detener el flujo.

A partir de este punto, todas las referencias a `<KB_ROOT>/` en el skill se interpretan como la ruta resuelta.

---

### Paso 1 — Leer el ticket en Jira

Usar `Atlassian:getJiraIssue` con:

- `cloudId`: `53eec1f8-a156-4af9-bc3a-d6142b50e0cc`
- `issueIdOrKey`: el key proporcionado
- `responseContentFormat`: `markdown`

Extraer:

- `summary` — título del ticket
- `description` — contenido actual
- `status` — estado actual en el workflow
- Custom fields disponibles (área, prioridad, business area, source)

**Buscar en la descripción el link al hilo de Slack.** Formato típico:
`https://arduasolutions.slack.com/archives/[CHANNEL_ID]/p[TIMESTAMP]`

→ Si se encuentra el link: continuar al **Paso 2A** (con hilo).
→ Si NO se encuentra el link: continuar al **Paso 2B** (sin hilo).

---

### Paso 2A — Con hilo: leer el hilo de Slack completo

Convertir el timestamp del link a `message_ts`:

- Tomar los dígitos después de la `p`: `p1775672338243669`
- Insertar punto antes de los últimos 6 dígitos: `1775672338.243669`

Usar `Slack:slack_read_thread` con:

- `channel_id`: extraído del link
- `message_ts`: timestamp formateado
- `response_format`: `detailed`

Capturar **todos los mensajes del hilo**: mensaje original (captura de Miles), respuestas del solicitante, archivos adjuntos mencionados, decisiones o correcciones posteriores.

Continuar al **Paso 3**.

---

### Paso 2B — Sin hilo: activar base de conocimientos como fuente primaria

Si el ticket no tiene link al hilo, informar al usuario:

> _"Este requerimiento no tiene hilo de Slack vinculado. Voy a usar la base de conocimientos del proyecto como fuente de contexto primaria."_

Los challenges (en modo Detallado) se presentarán directamente en el chat, no en Slack. Al cierre, recomendar al usuario vincular un hilo para futuras iteraciones.

Continuar al **Paso 3**.

---

### Paso 3 — Cargar conocimiento del proyecto

Independientemente del modo o de si hay hilo, cargar la base de conocimiento correspondiente al requerimiento.

**Secuencia de lectura:**

1. Listar `<KB_ROOT>/framework/` y leer **todos** los archivos (especial atención a `project-instructions.md`, que es la referencia canónica del framework).

2. **Identificar entidades mencionadas** en el summary, description o hilo del requerimiento. Para cada entidad, leer el archivo correspondiente en `<KB_ROOT>/entities/[nombre-entidad].md`. Si una entidad es mencionada y no existe archivo → registrarlo para flaguear al cierre.

3. **Identificar la aplicación del core del requerimiento** (TRD, OPS, LEX, CLP, FIN, capacidad transversal en `common/`, o producto transversal de infraestructura). Si no es evidente del ticket, inferirla de los triggers/keywords en el hilo.

4. **Cargar el estado actual del producto** desde `features/`:
   - Leer `<KB_ROOT>/features/[aplicacion]/README.md` — estado global del producto, módulos, decisiones, frentes abiertos.
   - Identificar y leer los `[aplicacion]-[modulo-o-feature].md` que el requerimiento toca directamente.
   - Si el requerimiento involucra una capacidad transversal (notificaciones, alertas, inbox, etc.) → leer también los archivos relevantes de `<KB_ROOT>/features/common/`.

5. **Cargar el contexto de investigación** desde `discoveries/`:
   - Listar `<KB_ROOT>/discoveries/` y filtrar por el campo `features:` del frontmatter para encontrar los que afectan la aplicación del requerimiento.
   - Leer los `status: En investigación` relevantes — capturan hipótesis abiertas y blockers activos.
   - Leer los `Concluida` / `Descartada` solo si el requerimiento referencia una decisión consolidada y se necesita entender cómo se llegó a ella.
   - **Si el requerimiento implica trabajo de investigación o validación de hipótesis y no existe ningún discovery relacionado → aplicar Discovery-First Principle** (ver sección "Base de conocimientos" arriba): proponer crear el discovery antes de avanzar. **No aplicar** este principio a bugs, ajustes puntuales o cambios sobre features ya consolidadas.

6. **Consultar la representación visual** en `prototypes/`:
   - Si existe `<KB_ROOT>/prototypes/[aplicacion]/README.md`, leerlo para entender el alcance actual del prototipo y qué vistas/módulos refleja.
   - Identificar si la feature del requerimiento ya está representada visualmente. Si lo está, capturar la referencia (ruta interna o URL desplegada) para el campo `Prototipo` del PWI-1.

7. Complementar con `Notion:notion-search` si los pasos anteriores no alcanzaron.

---

### Paso 4 — Construir challenge (solo Detallado) / Extraer contexto (Express)

#### Modo Detallado — construir challenge basado en evidencia

El challenge es **objetivo y basado en evidencia**. No se challengea por challengear. Nunca asumir nada que no esté documentado.

**Un challenge válido es:**

- Contradicción entre lo que dice el hilo/ticket y lo que dice un context file
- Elemento de scope definido en el context que está ausente en el ticket
- Terminología incorrecta u obsoleta según las decisiones documentadas
- Dependencia arquitectónica conocida que el requerimiento no menciona
- Prerequisito sin resolver que bloquea el avance (ej: flags abiertos en el discovery)
- Ambigüedad en el scope que impediría escribir criterios de aceptación claros
- Archivos adjuntos en el hilo no incorporados al contenido del ticket

**Un challenge inválido es:**

- Suposición no documentada ("probablemente también necesitan X")
- Opinión de diseño sin respaldo en el knowledge base
- Pregunta retórica sin propósito funcional
- **Pregunta técnica que invade ownership de Desarrollo** (ej: "¿qué endpoint usamos?", "¿esto se hace en backend o frontend?", "¿con qué framework?"). El stakeholder es no técnico; el challenge se construye siempre en términos funcionales (qué debe pasar, no cómo se implementa). Ver sección "Foco funcional, no técnico".

**Publicación del challenge — requiere aprobación explícita del PM:**

El challenge **nunca se publica directamente** en el hilo de Slack. El usuario de este skill (PM) es responsable del tono, el alcance y el momento del envío hacia el stakeholder, por lo que cualquier mensaje que vaya al hilo tiene que pasar antes por su revisión. El skill propone; el PM autoriza.

Flujo de publicación:

1. **Construir** el challenge usando el formato definido en "Formato de mensajes a Slack — Template Challenge".
2. **Presentar al PM en el chat**, mostrando:
   - El challenge completo, exactamente como se publicaría (mismo formato, mismas secciones)
   - El destino propuesto (hilo de Slack del PWI, identificado por `thread_ts` y `channel_id`) si existe; o "no hay hilo asociado" en su defecto
   - La pregunta explícita: _"¿Lo publico así, querés ajustar algo, o lo manejamos solo en chat?"_
3. **Esperar respuesta del PM.** Tres caminos válidos:
   - **Aprobado** → continuar al paso 4
   - **Ajustes** → aplicar los cambios pedidos (reformular preguntas, sumar/quitar puntos, cambiar tono, recortar) y volver al paso 2 con la versión revisada. Iterar hasta que el PM apruebe
   - **Cancelar publicación** → no enviar nada al hilo. El intercambio se resuelve en el chat con el PM y se entra al Paso 5 con sus respuestas como input
4. **Publicar solo tras aprobación explícita:**
   - **Con hilo** → usar `Slack:slack_send_message` con el `thread_ts` del hilo original
   - **Sin hilo** → la "publicación" siempre fue el chat con el PM; no hay envío externo

Si el challenge requiere investigación adicional → ejecutar la investigación primero, presentar al PM en el chat los hallazgos + las preguntas resultantes, y recién ahí entrar al flujo de aprobación.

**Por qué esta regla existe:** el hilo del PWI es comunicación oficial del área de Producto hacia el stakeholder. Una pregunta mal formulada, publicada antes de tiempo, o sin contexto del PM, puede confundir al stakeholder, forzar respuestas apresuradas, o desalinear lo que el PM ya tenía planeado conversar offline. La revisión previa es barata y protege la relación con el área.

#### Modo Express — extraer contexto y identificar cuestiones pendientes

En Express **no se construye challenge** al stakeholder. El objetivo es formatear el requerimiento con el contexto disponible y moverlo.

Durante la lectura del hilo + knowledge base, identificar internamente cualquier ambigüedad o pregunta que en un modo Detallado habría sido un challenge. Clasificar:

- **Resoluble con el contexto disponible** → aplicar directamente al estructurar el requerimiento
- **No resoluble sin respuesta del stakeholder** → anotar para la sección `## 🔍 Cuestiones pendientes de revisión` del requerimiento

Si no emergen cuestiones sin resolver → omitir completamente la sección en el requerimiento final.

---

### Paso 5 — Resolver challenges (solo Detallado)

Esperar la respuesta del stakeholder en el hilo (o en el chat si no hay hilo).

Cuando la respuesta llega, clasificar:

**Tipo A — Requiere confirmación del usuario:**

- Ambigüedades de scope no documentadas
- Decisiones de diseño abiertas
- Flags sin resolver que afectan el requerimiento

→ Esperar respuesta antes de continuar al Paso 6.

**Tipo B — Informativos (ya documentados):**

- Correcciones de terminología respaldadas por el context file
- Scope omitido pero ya definido en el context
- Dependencias arquitectónicas conocidas

→ Aplicar las correcciones, continuar al Paso 6, dejar registro en el hilo/chat.

En modo Express este paso no aplica — saltar directamente al Paso 6.

---

### Paso 6 — Generar el requerimiento enriquecido

Producir el requerimiento completo siguiendo la estructura PWI-1 (ver sección "Formato de referencia").

**Principio que atraviesa todo Paso 6:** el contenido es **funcional**, no técnico. Describir qué hace el sistema y por qué, nunca cómo se implementa (ver sección "Foco funcional, no técnico"). El skill **traduce** lo que aparezca técnico en el hilo o en el knowledge base; no lo replica.

**Reglas de contenido:**

- **Metadata:** usar Variant A (Aplicación + Módulo opcional) para PWIs por aplicación o producto transversal con nombre propio. Usar Variant B (`Sistema: CORE (transversal)`) para PWIs de infraestructura transversal del core. Ver "Convenciones de naming" para el patrón del summary correspondiente.

- **Resumen:** 2-3 párrafos densos al inicio del body, después de la metadata. Cuenta qué es el PWI, qué cambia, las propiedades estructurales clave si las hay, y qué entrega concretamente. Si el PWI introduce un modelo conceptual, anticipar las entidades clave acá — el detalle va en §1 del Alcance funcional (ver "Patrones de construcción del PWI").

- **Contexto:** Situación actual, problema e impacto operativo. Si hay dependencias o prerequisitos sin resolver que afectan el scope, referenciarlos a nivel funcional ("la capacidad depende de que primero se incorpore X"), no técnico.

- **Objetivo:** Bullets que responden _"¿para qué se construye esto?"_. Cada bullet es un resultado esperado. No describe el qué sino el para qué.

- **Alcance funcional:** Secciones numeradas con título claro y descripción funcional. **Sin terminología técnica** — sin nombres de endpoints, sin métodos HTTP, sin modelos de datos, sin estructuras de tablas, sin frameworks ni librerías, sin componentes literales del frontend, sin TypeScript inline, sin performance budgets numéricos. Nivel: _"el sistema hace X cuando el usuario hace Y"_. Si el PWI introduce un modelo del dominio, la §1 se dedica a explicarlo en prosa + tablas funcionales (ver "Patrones de construcción del PWI").

- **Fuera de alcance (v1):** Lo que está explícitamente fuera. Incluir elementos que podrían generar confusión. Separar V1 de roadmap futuro si hay versiones definidas.

- **Criterios de aceptación:** Condiciones observables y verificables, expresadas en términos de comportamiento del sistema desde la perspectiva del usuario o del stakeholder. Sin ambigüedad. Formato: _"El sistema [hace X] cuando [condición]"_ o _"[Elemento] muestra/permite/impide [comportamiento]"_. Nunca formular un criterio en términos de implementación (ej: ❌ _"el endpoint responde 200"_; ✅ _"la operación se confirma al usuario"_).

- **Dependencias:** lista de PWIs o sistemas externos que este PWI necesita o que dependen de él. Una línea por dependencia con prosa que aclara la dirección (qué provee este PWI a quién, o qué consume desde dónde). Si el PWI es transversal habilitante, los consumidores se listan acá identificándolos como tales.

- **Cuestiones pendientes de revisión (solo Express, condicional):** incluir la sección `## 🔍 Cuestiones pendientes de revisión` si durante el Paso 4 emergieron cuestiones sin resolver. Si no hay, omitir la sección completa.

- **Modo de enriquecimiento (campo opcional):** no incluir en el template por default. Agregar solo en PWIs Express como trazabilidad de proceso, especialmente si hay sección de "Cuestiones pendientes". En PWIs Detallados o Refactorización grandes y consolidados, omitir — no aporta valor al lector final.

- **Solicitante:** Inferido del hilo de Slack (quién envió a Miles) o del ticket si no hay hilo.

- **Prototipo:** Solo incluir si la feature del requerimiento ya está representada visualmente en `<KB_ROOT>/prototypes/[aplicacion]/`. La referencia puede ser una ruta interna del proyecto frontend (ej: `/proveedores-de-liquidez`), una URL desplegada (Vercel/Netlify/GitHub Pages si el prototipo está deployado), o el nombre del componente/vista relevante. Recordar que cada producto tiene **un solo prototipo** que agrupa todas sus features — los features individuales son vistas o módulos dentro del mismo proyecto. Si la feature no está representada todavía, omitir el campo y registrar la iteración del prototipo como acción posterior (fuera del scope del enriquecimiento).

---

### Paso 7 — Presentar al usuario y confirmar

Mostrar el requerimiento enriquecido al usuario en el chat **antes** de actualizar Jira.

**Modo Detallado:**

> _"Acá está el requerimiento enriquecido para [KEY]. Revisá el scope y los criterios de aceptación — si confirmás, lo actualizo en Jira y publico el cierre en el hilo de Slack."_ (o _"te confirmo el cierre acá"_ si no hay hilo)

**Modo Express:**

> _"Acá está el requerimiento enriquecido en modo Express para [KEY]. [Si hay cuestiones pendientes:] Registré [N] cuestión(es) pendientes de revisión que aparecieron durante el proceso. Si confirmás, lo actualizo en Jira y queda listo para que lo muevas a Sent to Dev."_

Esperar confirmación explícita.

---

### Paso 8 — Actualizar Jira y cerrar

**Actualizar el PWI en Jira:**
Usar `Atlassian:editJiraIssue` con `contentFormat: adf`. La descripción debe ser un objeto ADF válido (`type: doc`, `version: 1`, content array). No usar `contentFormat: markdown` para descriptions — no persiste de forma confiable.

Si el modo es Refactorización y el summary del PWI cambia, actualizar también el campo `summary` en la misma llamada para mantener consistencia con el campo `Requerimiento:` de la descripción.

**Sub-flujo solo en modo Refactorización — actualizar el EWI espejo:**

La automation que crea el EWI espejo solo se dispara una vez (al primer pase a `SENT TO DEV`). Cualquier cambio posterior al PWI no se propaga automáticamente, por lo que el skill actualiza EWI manualmente:

1. **Encontrar el EWI espejo.** Leer los `issuelinks` del PWI vía `Atlassian:getJiraIssue` con `fields=["issuelinks"]`. Filtrar el link cuyo `type.outward == "causes"` y tomar `outwardIssue.key`. Ese es el EWI espejo (proyecto TECHNOLOGY, mismo `cloudId`: `53eec1f8-a156-4af9-bc3a-d6142b50e0cc`). **No asumir el issue type del espejo:** según su avance puede ser todavía una Épica (board de Refinement) o ya haberse transformado en Story (board de Development) — ver `framework/jira.md`. Si no existe ningún link `causes` (ej: el work item es una Activity sin espejo), no hay nada que sincronizar: el refactor termina en PWI.
2. **Construir la descripción del EWI.** Usar el mismo cuerpo enriquecido que se acaba de guardar en la descripción del PWI — idéntico, sin modificaciones adicionales. La consistencia entre PWI y EWI se garantiza porque ambos comparten el mismo contenido.
3. **Actualizar el EWI** vía `Atlassian:editJiraIssue` sobre el key del EWI:
   - `description` con el cuerpo construido (formato ADF).
   - `summary` igualado al summary del PWI (mismo string exacto).
4. **No transicionar el EWI.** El skill no toca el status del EWI bajo ninguna circunstancia. Si Desarrollo ya movió el EWI a un estado posterior (IN REFINEMENT, EN CURSO, etc.), el refactor solo actualiza descripción y summary; el progreso de desarrollo no se pierde.

**IMPORTANTE — no transicionar el PWI.** El skill solo actualiza la descripción del PWI. La transición a `SENT TO DEV` (u otro estado) la hace el PM manualmente desde Jira, **porque ese pase dispara la automation que crea el ticket espejo en el tablero EWI** (proyecto de Tecnología) con relación `causes` y heredando la descripción enriquecida. Ver sección "Ciclo de vida del work item (tablero PWI ↔ tablero EWI)" para el detalle del flujo. En modo Refactorización el PWI ya está en `SENT TO DEV` o posterior — nunca se transiciona en ningún caso.

**Cierre en Slack/chat:**

- **Detallado con hilo** → publicar cierre detallado en el hilo (ver formato)
- **Detallado sin hilo** → confirmar en chat + recomendar vincular hilo para futuras iteraciones
- **Express con hilo** → publicar cierre Express en el hilo (incluyendo sección de cuestiones pendientes si existen)
- **Express sin hilo** → confirmar en chat + recomendar vincular hilo
- **Refactorización** → **silencio total en Slack**. Confirmar al PM en el chat con un mensaje corto: _"Refactor aplicado. PWI-XX actualizado en Jira y EWI-XXXX espejo sincronizado (descripción + summary alineados, sin transicionar)."_

**Flaguear al cierre** (en cualquier modo):

- Si una entidad fue mencionada y no existía archivo en `entities/` → proponer crearlo
- Si no existía discovery para la aplicación/módulo (y se continuó igual con permiso del usuario) → proponer crearlo antes de futuras iteraciones

---

## Formato de mensajes a Slack

Todos los mensajes a Slack siguen un formato limpio y escaneable, optimizado para la lectura del stakeholder desde mobile o desktop. Principios:

- **Separación visual**: líneas `━━━` delimitan bloques
- **Jerarquía**: contexto verificado arriba, challenges/acciones en el medio, notas al final
- **CTAs destacadas**: cada pregunta accionable marcada con `▸` y en negrita
- **Distinción**: 🔍 para challenges, 📌 para notas informativas, ✅ para cierre completo, ⚡ para cierre Express
- **Sin firma de autoría**: no agregar `Sent using @Claude`, `_Sent using @Claude_`, `— enviado por Claude`, ni ninguna variante de atribución al final del mensaje. El conector de Slack ya inserta su propia firma automáticamente cuando el mensaje sale vía MCP — duplicarla en el body genera dos firmas seguidas en el hilo, una en cursiva y otra plana, que ensucian la lectura. Cualquier instinto de "cerrar con atribución" se ignora: el cuerpo del mensaje termina con su última línea funcional (un CTA, un cierre, un emoji) y nada después.

### Template — Challenge de enriquecimiento (modo Detallado)

```
🔍  *Challenge de enriquecimiento — [KEY]*

Revisé el requerimiento contra [fuente principal: context file / roadmap / código / Notion].
Antes de estructurarlo, necesito confirmar [N] punto(s) de scope.

*Contexto ya verificado*
•  [Hallazgo confirmado 1]
•  [Hallazgo confirmado 2]

━━━━━━━━━━━━━━━━━━━━━━━━

*C1 · [Título corto del challenge]*
[Contexto del challenge en 2-3 líneas. Explicar por qué es un challenge.]

▸  *[Pregunta o acción requerida]*
    [Opciones o aclaración adicional si corresponde]

━━━━━━━━━━━━━━━━━━━━━━━━

*C2 · [Título]*
[Contexto]

▸  *[Pregunta]*

━━━━━━━━━━━━━━━━━━━━━━━━

📌  *Nota informativa — no requiere confirmación*
[Información relevante que no necesita respuesta del stakeholder]

━━━━━━━━━━━━━━━━━━━━━━━━

Cuando confirmes C1–CN, estructuro el requerimiento en formato PWI-1 y actualizo Jira.
```

**Reglas de uso:**

- Máximo 2-3 líneas de contexto por challenge
- Si un challenge tiene sub-opciones (ej: "v1 mínima" vs "v1 completa"), listarlas debajo del `▸`
- Omitir el bloque `📌 Nota informativa` si no hay información sin confirmar
- Omitir `Contexto ya verificado` si no hay hallazgos previos relevantes

### Template — Cierre de enriquecimiento Detallado

```
✅  *Requerimiento enriquecido — [KEY]*

El requerimiento fue estructurado y actualizado en Jira.

━━━━━━━━━━━━━━━━━━━━━━━━

*Resumen del alcance confirmado*
•  [Punto clave 1]
•  [Punto clave 2]
•  [Punto clave N]

━━━━━━━━━━━━━━━━━━━━━━━━

⏭️  *Próximo paso sugerido:* Prototipo funcional
Si querés avanzar con el prototipo, decime y lo arrancamos desde este requerimiento.
```

### Template — Cierre de enriquecimiento Express

```
⚡  *Requerimiento enriquecido (Express) — [KEY]*

El requerimiento fue estructurado y actualizado en Jira, listo para que lo muevas a Sent to Dev.

━━━━━━━━━━━━━━━━━━━━━━━━

*Resumen del alcance*
•  [Punto clave 1]
•  [Punto clave 2]

[Solo si hay cuestiones pendientes:]
━━━━━━━━━━━━━━━━━━━━━━━━

🔍  *Cuestiones pendientes de revisión*
Quedaron documentadas en el ticket para revisión posterior:
•  [Cuestión 1]
•  [Cuestión 2]

━━━━━━━━━━━━━━━━━━━━━━━━

📋  Podés ver el detalle completo en Jira.
```

---

## Consideraciones sobre discoveries durante el enriquecimiento

El enriquecimiento **no genera discoveries por default**. Los discoveries capturan el proceso de investigación de hipótesis — no son artefactos que nacen y mueren en una sesión. El estado consolidado del producto vive en `features/`, no en `discoveries/`.

**Dos escenarios posibles durante el enriquecimiento:**

| Escenario                                                                                                                                                | Qué hacer                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La información específica del PWI emerge durante el proceso                                                                                              | Va al ticket de Jira — es lo que ya hace el enriquecimiento                                                                                                       |
| Información que **trasciende el PWI** emerge (decisión arquitectónica, blocker que afecta otras features del producto, hipótesis nueva sobre el dominio) | Proponer **actualizar un discovery existente** que cubra el dominio (filtrando por `features:` del frontmatter). Si no existe, proponer crearlo (Discovery-First) |

**No se crean discoveries para cerrarlos en la misma sesión.** Si un discovery se crea durante el enriquecimiento, permanece `En investigación` y evoluciona en sesiones futuras. Cuando madura, sus conclusiones se **propagan a los feature files correspondientes** en `features/[aplicacion]/` (regla crítica del framework: un aprendizaje validado que no actualiza `features/` es una fuga).

---

## Lo que este skill NO hace

- **No usa terminología técnica** (endpoints, métodos HTTP, modelos de datos, frameworks, librerías, stacks, decisiones arquitectónicas) en ningún output: ni en la descripción enriquecida, ni en challenges, ni en comentarios. La definición técnica es ownership de Desarrollo.
- **No usa componentes del frontend, interfaces TypeScript, performance budgets numéricos ni referencias a especificaciones internas** (OpenSpec, nomenclatura del template, L1/L2/L3, Type A/Type B) en ningún output. Esos elementos viven en documentación de Tecnología.
- **No define el detalle visual fino** (paleta, ejes, tooltips, animaciones, layout exacto) — queda diferido a refinement con Diseño + Tecnología. Ver "Patrones de construcción del PWI — Detalle visual diferido a refinement".
- **No define cómo se implementa una capacidad** — solo qué hace el sistema y por qué. Ver sección "Foco funcional, no técnico".
- No toma decisiones de scope sin respaldo en el knowledge base
- **No transiciona el ticket en Jira** — ni el PWI ni el EWI espejo, en ningún modo. La transición del PWI a `SENT TO DEV` la hace el PM manualmente y dispara la creación del ticket espejo en el tablero EWI. El status del EWI lo gestiona Desarrollo.
- **No toca el EWI espejo en modos Detallado ni Express** — el skill opera exclusivamente sobre el work item del proyecto PRODUCT en esos modos. En modo Refactorización sí actualiza descripción y summary del EWI espejo para mantener consistencia con el PWI (el status del EWI nunca se toca).
- No omite la carga del knowledge base (con o sin hilo, en cualquier modo)
- No actualiza Jira sin confirmación explícita del usuario
- **No publica challenges en el hilo de Slack sin aprobación explícita del PM** — el challenge siempre se presenta primero en el chat para revisión, ajustes o cancelación
- **No agrega firmas de autoría en los mensajes a Slack** — el conector ya pone la suya automáticamente; cualquier `Sent using @Claude` o variante adicional al final del body genera firma duplicada en el hilo
- No asume nada que no esté documentado
- No crea discoveries que nacen y mueren en la misma sesión
- En modo Express, no construye challenge al stakeholder — solo registra cuestiones pendientes si emergen
- En modo Refactorización, no usa Slack — las decisiones del refactor se validan con el PM en el chat antes de ejecutar

---

## Diagrama del flujo

```
[Key del PWI + modo (Detallado / Express)]
      ↓
[Resolver KB_ROOT vía Filesystem:list_allowed_directories — silencioso]
      ↓
[Leer ticket en Jira — extraer summary, description, status, link a Slack]
      ↓
[¿Tiene hilo de Slack?]
   SÍ → Leer hilo completo (Paso 2A)
   NO → Usar knowledge base como fuente primaria (Paso 2B)
      ↓
[Cargar knowledge base — triada: estado, investigación, visual]
   • framework/ (todos los archivos)
   • entities/ (por cada entidad mencionada)
   • features/[aplicacion]/README.md + feature files relevantes (+ common/ si aplica)
   • discoveries/ (filtrar por features: en frontmatter; priorizar "En investigación")
   • prototypes/[aplicacion]/README.md (si existe — para referencia visual)
   • Notion (complementario)
      ↓
[¿El PWI implica investigación de hipótesis sin discovery existente?]
   SÍ → Proponer crear discovery antes de avanzar (Discovery-First)
   NO → Continuar
      ↓
[Modo?]
   DETALLADO:
      → Construir challenge basado en evidencia
      → Presentar challenge al PM en el chat para revisión
      → PM aprueba / pide ajustes / cancela publicación
         · Ajustes → iterar y volver a presentar
         · Cancelar → resolver en chat, sin envío externo
      → (si aprueba) Publicar challenge en el hilo
      → Esperar respuesta del stakeholder
      → Resolver Tipo A / aplicar Tipo B
   EXPRESS:
      → Extraer contexto del hilo + knowledge base
      → Identificar cuestiones pendientes (si emergen)
      → No construir challenge
   REFACTORIZACIÓN:
      → Validar pre-condición (PWI en SENT TO DEV o posterior)
      → Validar alcance del refactor con el PM en el chat
      → Sin Slack en ningún momento
      ↓
[Generar requerimiento enriquecido — formato PWI-1]
   • Metadata: Variant A (Aplicación/Módulo) o Variant B (Sistema: CORE)
   • Resumen, Dependencias (secciones estándar)
   • Sección "Cuestiones pendientes" solo si Express + cuestiones
      ↓
[Presentar al usuario]
      ↓
[Confirmar → Actualizar Jira (ADF, SIN transicionar)]
   REFACTORIZACIÓN además:
      → Buscar EWI espejo vía issuelinks (outward "causes")
      → Actualizar EWI description (idéntica al PWI) + summary
      ↓
[Publicar cierre]
   DETALLADO con hilo  → ✅ cierre detallado en hilo
   DETALLADO sin hilo  → confirmar en chat + recomendar vincular hilo
   EXPRESS con hilo    → ⚡ cierre Express en hilo (con cuestiones si hay)
   EXPRESS sin hilo    → confirmar en chat + recomendar vincular hilo
   REFACTORIZACIÓN     → silencio en Slack; confirmar al PM en chat
      ↓
[Flaguear pendientes]
   • Entidades sin archivo en entities/
   • Discoveries faltantes
      ↓
[Handoff al Product Manager] (solo Detallado/Express)
   El PM revisa el enriquecimiento y, cuando confirma, transiciona
   el PWI a SENT TO DEV → automation crea ticket espejo en EWI con
   relación `causes` y descripción heredada. Skill ya terminó.
   (En Refactorización no hay handoff externo: PWI y EWI ya quedaron
    sincronizados; no hay transición de estado pendiente.)
```
