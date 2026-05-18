# Discoveries — Manual de uso

> Este archivo es el **manual** de la carpeta `discoveries/`. Para el catálogo navegable de los discoveries existentes, ver [`INDEX.md`](./INDEX.md).
>
> Última actualización: 2026-05-17

## Propósito

`discoveries/` es la **fuente principal del pilar Thinking Partner** del framework (§4.1 de `framework/project-instructions.md`). Cada archivo captura una **hipótesis** o un área acotada de investigación, junto con los hallazgos que se acumulan mientras se la valida.

Un discovery responde a la pregunta: **"¿qué hipótesis estamos investigando, y qué aprendimos?"**.

Las hipótesis pueden tocar cualquier dimensión relevante para Producto: aplicaciones, módulos, funcionalidades, arquitectura cross-core, infraestructura, procesos, metodología, herramientas. No están limitadas a features de producto.

Un discovery **no** es un snapshot del estado actual de un producto — eso vive en `features/`.

---

## Lugar en el framework

```
Investigar → Definir → Prototipar
discoveries/  features/   prototypes/
```

La triada `discoveries → features → prototypes` describe el **subset producto-scoped** del bucle de producción. Cuando una hipótesis sobre un producto madura, sus conclusiones se **propagan al feature correspondiente** en `features/[aplicacion]/`, y eventualmente se reflejan en `prototypes/[aplicacion]/`.

Pero `discoveries/` cubre más que productos. Una hipótesis sobre arquitectura, infraestructura o proceso también vive acá, y propaga a `framework/`, `entities/`, `workflows/`, `skills/` o queda auto-contenida en el propio discovery — sin pasar por la triada.

### Cardinalidad

- **Discovery → cualquier destino: N-N.** Una hipótesis puede impactar uno o varios destinos. Un mismo archivo destino puede recibir aportes de uno o varios discoveries a lo largo de su vida.

---

## Estructura de la carpeta

La carpeta es **plana**. Todo discovery vive directamente bajo `discoveries/`, sin subcarpetas. No existe distinción `active/archived` — el estado de cada discovery se captura en su frontmatter (ver "Ciclo de vida" más abajo).

La navegación humana y de agentes se hace a través de [`INDEX.md`](./INDEX.md), no del filesystem. Ese índice se mantiene a mano por el agente que opera dentro del framework, dentro del flujo de sesión (ver `framework/project-instructions.md` §11.5).

```
discoveries/
├── README.md             ← este archivo (manual de uso)
├── INDEX.md              ← catálogo navegable por categoría y estado
└── *-discovery.md        ← cada archivo = una hipótesis
```

---

## Categorías de discovery

El framework reconoce **siete categorías** según la naturaleza de lo que se investiga (definidas en `framework/project-instructions.md` §5.4):

| Categoría | Patrón de naming | Ejemplo | `features:` |
|---|---|---|---|
| Producto — aplicación (umbrella) | `[aplicacion]-discovery.md` | `clp-discovery.md` | `[CLP]` |
| Producto — módulo | `[aplicacion]-[modulo]-discovery.md` | `lex-alertas-discovery.md` | `[LEX]` |
| Producto — funcionalidad | `[aplicacion]-[modulo]-[funcionalidad]-discovery.md` | `fin-reporteria-pnl-discovery.md` | `[FIN]` |
| Producto — feature transversal | `[feature]-discovery.md` | `centro-de-alertas-discovery.md` | `[COMMON]` |
| Arquitectura cross-core | `core-[topic]-discovery.md` | `core-modulos-transversales-discovery.md` | `[CORE]` |
| Infraestructura interna | `[topic]-discovery.md` | `observabilidad-discovery.md` | `[]` |
| Proceso / herramienta / metodología | `[topic]-discovery.md` | `jira-sla-discovery.md` | `[]` |

**Reglas de coexistencia:**

- `[aplicacion]-discovery.md` (umbrella) y `[aplicacion]-[modulo]-discovery.md` (módulo) **pueden coexistir**. El umbrella es la investigación product-wide; los módulo-específicos son bifurcaciones focalizadas.
- Cuando un discovery acumula varias hipótesis sobre el mismo scope, **no se renombra** — las hipótesis adicionales son iteraciones en el mismo archivo. Si una hipótesis del umbrella merece archivo propio, se crea uno más profundo y se deja un breadcrumb en el original.
- **Un archivo, una identidad de scope.** No existe `lex-alertas-criticas-discovery.md` y `lex-alertas-no-criticas-discovery.md` separados — eso es bifurcación a nivel hipótesis, y va dentro del body del archivo de módulo.

---

## Estructura del archivo

Todo discovery sigue una estructura estandarizada que separa **metadatos** (header) y **contenido** (body). Esto permite que cualquier PM o herramienta pueda procesar el estado, alcance y destino de un discovery sin leer todo el documento.

### Header obligatorio — YAML frontmatter

El archivo arranca con un bloque YAML delimitado por `---`:

```yaml
---
name: Alertas LEX — modelo Perfil B Workflow
features: [LEX]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-15
updated_at: 2026-04-30
propagates_to: []
---
```

#### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Título descriptivo de la investigación. Se repite como `# Heading` al inicio del body. |
| `features` | array | Filtro semántico rápido. Cuatro formas válidas: `[APP1]` o `[APP1, APP2]` para hipótesis sobre productos del financial-core; `[COMMON]` para features transversales; `[CORE]` para arquitectura cross-core; `[]` para infraestructura o proceso/tooling. Ver "Sintaxis de `features`" más abajo. |
| `status` | enum | `En investigación`, `Concluida`, `Descartada`. |
| `owner` | string | Nombre completo del PM responsable. |
| `created_at` | date | `YYYY-MM-DD`. |
| `updated_at` | date | `YYYY-MM-DD`. Se actualiza con cada iteración significativa. |
| `propagates_to` | array | Paths relativos al root del repo donde se propagaron (o se van a propagar) las conclusiones del discovery. Se completa al concluir. Puede omitirse o ser `[]` mientras está `En investigación`, o cuando es `Descartada` sin propagación. |

#### Sintaxis de `features`

| Caso | Sintaxis | Ejemplo |
|---|---|---|
| Hipótesis sobre uno o varios productos del financial-core | `[APP1]`, `[APP1, APP2]` | `[CLP]`, `[LEX, FIN]` |
| Hipótesis sobre una **feature transversal** (vive en `features/common/`) | `[COMMON]` | `[COMMON]` para el sistema unificado de notificaciones |
| Hipótesis sobre **arquitectura cross-core** | `[CORE]` | `[CORE]` para `core-modulos-transversales-discovery.md` |
| Hipótesis sobre **infraestructura interna** o **proceso/tooling** | `[]` | `[]` para `jira-automations-discovery.md`, `observabilidad-discovery.md`, `jira-sla-discovery.md` |

El token `COMMON` es **solo para features transversales** que viven en `features/common/`. `[CORE]` es **solo para arquitectura cross-core**. Para infraestructura o tooling se usa array vacío `[]`.

#### Sintaxis de `propagates_to`

Lista de paths relativos al root del repo, uno por destino. Ejemplo de un discovery concluido con propagación múltiple:

```yaml
propagates_to:
  - features/fin/fin-reporteria-pnl.md
  - skills/ardua-pnl-report/SKILL.md
  - framework/financial-core-modules.md
```

### Body — mínimo obligatorio

Después del frontmatter, el body arranca con el `# Heading` que repite el `name`, y a continuación dos secciones obligatorias:

```markdown
# [Mismo valor que `name` del frontmatter]

## Objetivo
Qué se busca aprender, validar o decidir con esta investigación.

## Contexto
Origen del problema, antecedentes relevantes, por qué esta hipótesis emerge ahora.
```

El resto del body queda a libre criterio de la interacción. Secciones típicas según el caso: hipótesis específicas, hallazgos, opciones evaluadas, decisiones, blockers, referencias a otros discoveries o destinos, anexos.

Lo crítico: que en algún punto del ciclo de vida del discovery, el `Objetivo` y el `Contexto` queden documentados. Sin eso, el discovery no es navegable para nadie más que su autor.

### Template completo

```markdown
---
name: [Título descriptivo]
features: [APP1, APP2]
status: En investigación
owner: [Nombre completo del PM]
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
propagates_to: []
---

# [Mismo valor que `name`]

## Objetivo
[Qué se busca aprender, validar o decidir.]

## Contexto
[Origen del problema, antecedentes, por qué emerge ahora.]

[A partir de acá, secciones libres según la naturaleza de la investigación.]
```

---

## Cuándo se crea un discovery

Cuando hay una hipótesis o un problema sin resolver que requiere investigación antes de poder afectar al producto, al framework, a una entidad, a un proceso o a una herramienta. Ejemplos:

- *"El módulo de Earn de CLP debería operar con AdCap como contraparte de FCI"* → `clp-earn-discovery.md`.
- *"Nuestro sistema de alertas LEX debe tener tres perfiles de comportamiento"* → `lex-alertas-discovery.md`.
- *"Las automatizaciones de Jira deberían disparar comentarios automáticos al cambiar de estado"* → `jira-automations-discovery.md`.
- *"Hay que estandarizar criterios y funcionalidades transversales en todo el Ardua Financial Core"* → `core-modulos-transversales-discovery.md`.

**No se crea un discovery para:**

- Capturar el estado actual de un producto → eso va a `features/[aplicacion]/README.md`.
- Especificar un feature ya validado → eso va a `features/[aplicacion]/[aplicacion]-[modulo-o-feature].md`.
- Documentar un constraint ya consolidado del grupo (legal, operativo, contable) → eso va a `framework/`.

---

## Ciclo de vida

Un discovery atraviesa tres estados, declarados en el campo `status` del frontmatter:

| Estado | Significado |
|---|---|
| **En investigación** | La hipótesis está siendo activamente validada. Se itera con cada nuevo hallazgo. `propagates_to:` puede estar vacío o ser indicativo. |
| **Concluida** | La hipótesis fue validada o suficientemente definida. Los hallazgos relevantes ya fueron propagados a los destinos declarados en `propagates_to:`. |
| **Descartada** | La hipótesis fue rechazada. El archivo se mantiene como registro de **por qué** se descartó. `propagates_to:` puede quedar vacío. |

### Regla crítica de propagación

> **Cuando una hipótesis se concluye, sus hallazgos relevantes se propagan al destino correspondiente.**
>
> El destino depende de la naturaleza de la conclusión: `features/`, `framework/`, `entities/`, `workflows/`, `skills/`, o una combinación. Se declara explícitamente en el campo `propagates_to:`.
>
> Un aprendizaje validado que no se propaga a su destino declarado es una fuga. El sistema debe siempre proponer la propagación al cerrar un discovery.

Si un discovery propaga a múltiples destinos, la propagación debe actualizar **cada uno** de los archivos afectados.

---

## Versionado

El versionado lo maneja **Git**. Los archivos de discovery no llevan sufijos `v[N]` para iteraciones normales.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: pivotes, cambios de dirección, scope significativamente redefinido. En ese caso se crea un archivo nuevo con el sufijo y el original se mantiene como referencia histórica del enfoque previo.

---

## Creación de un archivo nuevo

Antes de crear uno nuevo:

1. Consultar [`INDEX.md`](./INDEX.md) y/o listar `discoveries/` para verificar si ya existe un discovery sobre el mismo dominio o hipótesis.
2. Si existe → actualizar el archivo existente, no duplicar.
3. Si no existe → crear con el patrón de naming correspondiente a la categoría (ver "Categorías de discovery") y declarar el estado inicial en el header (`En investigación`).
4. Actualizar [`INDEX.md`](./INDEX.md) con la nueva entrada.

Si la sesión introduce una hipótesis y no hay discovery, **el primer paso es proponer crearlo**.

---

## Mantenimiento de `INDEX.md`

[`INDEX.md`](./INDEX.md) es un catálogo navegable de todos los discoveries, agrupado por categoría y con estado, owner y fecha de última actualización. Se mantiene **a mano** por el agente operando dentro del framework, dentro del flujo de cierre de sesión (`framework/project-instructions.md` §11.5).

Eventos que disparan actualización del índice:

- Se crea un discovery nuevo.
- Se renombra un discovery existente.
- Un discovery cambia de `status` (de `En investigación` a `Concluida` o `Descartada`).
- Se actualiza `updated_at` de un discovery (la entrada en el índice debe reflejarlo).

No hay script automatizado. El índice es un compromiso de mantenimiento manual.

---

## Migración de discoveries históricos

Algunos discoveries actuales (heredados del modelo previo) son **agregados por aplicación** que mezclan estado actual + hipótesis activas (p. ej. `clp-discovery.md`, `ops-discovery.md`, `trd-discovery.md`, `lex-discovery.md`, `fin-discovery.md`).

Bajo el modelo actual, esos archivos se separan progresivamente cuando cada producto se toca en una sesión real:

1. El **estado actual** del producto se migra a `features/[aplicacion]/README.md` y a los feature files individuales.
2. Las **hipótesis activas** quedan en `discoveries/` como discoveries scoped a su categoría correspondiente (módulo, funcionalidad, etc.).
3. El archivo agregado original puede archivarse o mantenerse como referencia histórica según el caso.

No se hace una migración en bloque — se separa cuando hay una sesión real que lo justifique.

---

## Soft deletes

Los archivos obsoletos no se borran físicamente. Se prefijan con `.trash-` para ocultarlos en listados pero preservar el contenido por si se necesita auditarlo.

```
.trash-CLP_Session_Context.md                          ← versión previa reemplazada
.trash-OPS_Session_Context.md                          ← versión previa reemplazada
```

Una limpieza periódica puede borrarlos definitivamente cuando no haya riesgo de necesitar el histórico.
