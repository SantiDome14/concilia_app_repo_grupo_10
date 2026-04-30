# Discovery — Convención y criterio

> Última actualización: 2026-04-30

## Propósito

Esta carpeta contiene las **investigaciones de hipótesis** del área de Producto: cada archivo captura una hipótesis (o un área acotada de investigación) y los hallazgos que se acumulan mientras se la valida.

Un discovery responde a la pregunta: **"¿qué hipótesis estamos validando, y qué aprendimos?"**. **No** es un snapshot del estado actual de un producto — eso vive en `features/`.

---

## Lugar en la triada

```
Investigar → Definir → Prototipar
discovery/    features/   prototypes/
```

Las tres carpetas forman el **bucle de producción** del framework. Cada hipótesis nace en `discovery/`. Cuando madura, sus conclusiones se **propagan** al feature correspondiente en `features/[aplicacion]/`. El estado consolidado del producto vive en `features/`; el rastro del proceso de validación vive en `discovery/`.

### Cardinalidad

- **Discovery → Features: N-N.** Una hipótesis puede impactar uno o más features. Un feature puede recibir aportes de uno o más discoveries a lo largo de su vida.

> Ejemplo: una investigación sobre cómo se autentican operadores externos en Ardua puede impactar simultáneamente a `features/clp/clp-accounts.md` y a `features/lex/lex-limites.md`. Cada feature se actualiza con la parte que le aplica; el discovery queda como registro único de la investigación.

---

## Estructura

La carpeta es **plana**. Todo discovery vive directamente bajo `discovery/`, sin subcarpetas. No existe distinción `active/archived` — el estado de cada discovery se captura en su header (ver §"Estructura del archivo").

---

## Estructura del archivo

Todo discovery sigue una estructura estandarizada que separa **metadatos** (header) y **contenido** (body). Esto permite que cualquier PM o herramienta externa pueda procesar el estado y alcance de un discovery sin leer todo el documento.

### Header obligatorio — YAML frontmatter

El archivo arranca con un bloque YAML delimitado por `---` que captura los metadatos del discovery:

```yaml
---
name: Alertas LEX — modelo Perfil B Workflow
features: [LEX]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-15
updated_at: 2026-04-30
---
```

#### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Título descriptivo de la investigación. Se repite como `# Heading` al inicio del body para visualización en GitHub. |
| `features` | array | Lista de productos del financial-core afectados, en mayúsculas (`[LEX]`, `[CLP, FIN]`). Para hipótesis sobre **features transversales** (cross-product) usar `[COMMON]`. Para discoveries de **sistemas transversales de infraestructura** (`core-template-frontend`, `jira-automations`, `observabilidad`) usar array vacío `[]`. Ver §"Sintaxis de `features`" para la distinción. |
| `status` | enum | Estado del discovery. Valores aceptados: `En investigación`, `Concluida`, `Descartada`. Ver §"Ciclo de vida" para el significado de cada uno. |
| `owner` | string | Nombre completo del PM responsable de la investigación. |
| `created_at` | date | Fecha de creación del archivo en formato `YYYY-MM-DD`. |
| `updated_at` | date | Fecha de la última actualización significativa, en formato `YYYY-MM-DD`. Se actualiza con cada iteración. |

El `features` array referencia productos a nivel de aplicación (carpeta en `features/`), no a nivel de feature file específico. Si un discovery aporta a `features/lex/lex-alertas.md`, el array igual lleva `[LEX]`. La referencia al feature file específico va en el body cuando se sepa.

#### Sintaxis de `features`

La convención distingue tres casos:

| Caso | Sintaxis | Ejemplo |
|---|---|---|
| Hipótesis sobre uno o varios productos del financial-core | `[APP1]`, `[APP1, APP2]` | `[CLP]`, `[LEX, FIN]` |
| Hipótesis sobre una **feature transversal** (cross-product, vive en `features/common/`) | `[COMMON]` | `[COMMON]` para una hipótesis sobre el sistema unificado de notificaciones |
| Hipótesis sobre un **sistema transversal de infraestructura** (no es feature, no tiene carpeta en `features/`) | `[]` (array vacío) | `[]` para `jira-automations-discovery.md`, `observabilidad-discovery.md` |

El token `COMMON` es **solo para features transversales** que viven en `features/common/`. No se usa para infraestructura interna; ésa lleva array vacío.

### Body — mínimo obligatorio

Después del frontmatter, el body arranca con el `# Heading` que repite el `name` del header (para visualización), y a continuación dos secciones obligatorias:

```markdown
# [Mismo valor que `name` del frontmatter]

## Objetivo
Qué se busca aprender, validar o decidir con esta investigación.

## Contexto
Origen del problema, antecedentes relevantes, por qué esta hipótesis emerge ahora.
```

El resto del body queda a **libre criterio de la interacción** (sesión con el sistema). Secciones típicas que pueden aparecer según el caso: hipótesis específicas, hallazgos, opciones evaluadas, decisiones, blockers, referencias a otros discoveries o features, anexos.

**Lo crítico:** que en algún punto del ciclo de vida del discovery, el `Objetivo` y el `Contexto` queden documentados — ya sea desde el primer guardado o aterrizados en iteraciones siguientes. Sin eso, el discovery no es navegable para nadie más que su autor.

### Template completo

```markdown
---
name: [Título descriptivo]
features: [APP1, APP2]
status: En investigación
owner: [Nombre completo del PM]
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
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

Cuando hay una **hipótesis** que requiere investigación antes de poder afectar el estado de un producto. Por ejemplo:

- *"El módulo de Earn de CLP debería operar con AdCap como contraparte de FCI"* → genera `clp-earn-discovery.md`.
- *"Nuestro sistema de alertas LEX debe tener tres perfiles de comportamiento"* → genera `lex-alertas-discovery.md`.
- *"Las automatizaciones de Jira deberían disparar comentarios automáticos al cambiar de estado"* → genera `jira-automations-discovery.md` (transversal, no scoped a un producto).

**No se crea un discovery para:**

- Capturar el estado actual de un producto. Eso va a `features/[aplicacion]/README.md`.
- Especificar un feature ya validado. Eso va a `features/[aplicacion]/[aplicacion]-[modulo-o-feature].md`.
- Documentar una decisión operacional o un proceso. Eso vive en otros sistemas (Notion, framework, etc.).

---

## Ciclo de vida

Un discovery atraviesa tres estados:

| Estado | Significado |
|---|---|
| **En investigación** | La hipótesis está siendo activamente validada. Se itera con cada nuevo hallazgo. |
| **Concluida — propagada a features/[...]** | La hipótesis fue validada o suficientemente definida. Los hallazgos relevantes ya fueron propagados al/los feature(s) correspondiente(s). |
| **Descartada** | La hipótesis fue rechazada. El archivo se mantiene como registro de **por qué** se descartó. |

El estado se declara en el campo `status` del frontmatter del archivo (ver §"Estructura del archivo").

### Regla crítica de propagación

> **Cuando una hipótesis se concluye, sus hallazgos relevantes se propagan al feature file correspondiente en `features/`.**
>
> Un aprendizaje validado que no actualiza `features/` es una fuga. El sistema debe siempre proponer la propagación al cerrar un discovery.

Si un discovery impacta varios features, la propagación debe actualizar **cada uno** de los features afectados.

---

## Convención de nombres

```
[aplicacion]-[topic]-discovery.md        ← scoped a una aplicación o módulo
[topic]-discovery.md                     ← transversal (no scoped)
```

Reglas:

- Todo en **kebab-case**.
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- Siempre termina en `-discovery.md`.
- Cuando aplica, el prefijo `[aplicacion]-` agrupa el discovery con su aplicación de impacto principal en el listado de la carpeta.

**Ejemplos:**

```
clp-earn-discovery.md                    ← hipótesis sobre Earn dentro de CLP
trd-proveedores-de-liquidez-discovery.md ← hipótesis sobre Proveedores de TRD
lex-alertas-discovery.md                 ← hipótesis sobre el módulo de Alertas de LEX
jira-automations-discovery.md            ← transversal, no scoped a un producto
observabilidad-discovery.md              ← transversal
```

---

## Versionado

El versionado lo maneja **Git**. Los archivos de discovery no llevan sufijos `v[N]` para iteraciones normales.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: pivotes, cambios de dirección, scope significativamente redefinido. En ese caso se crea un archivo nuevo con el sufijo y el original se mantiene como referencia histórica del enfoque previo.

---

## Caso especial — Sistemas transversales

Algunos discoveries describen **sistemas transversales** que no son productos del financial-core (p. ej. `core-template-frontend`, `jira-automations`, `observabilidad`). Estos discoveries:

- Existen como cualquier otro archivo en `discovery/`.
- **No tienen carpeta correspondiente en `features/` ni en `prototypes/`.**
- Sus definiciones, cuando se consolidan, viven dentro del propio discovery o se referencian desde `framework/`.

---

## Migración de discoveries históricos

Algunos discoveries actuales (heredados del modelo previo) son **agregados por aplicación** que mezclan estado actual + hipótesis activas (p. ej. `clp-discovery.md`, `ops-discovery.md`, `trd-discovery.md`, `lex-discovery.md`, `fin-discovery.md`).

Bajo el nuevo modelo, esos archivos se separan progresivamente cuando cada producto se toque en una sesión real:

1. El **estado actual** del producto se migra a `features/[aplicacion]/README.md` y a los feature files individuales.
2. Las **hipótesis activas** quedan en `discovery/` como discoveries scoped (`[aplicacion]-[topic]-discovery.md`).
3. El archivo agregado original puede archivarse o mantenerse como referencia histórica según el caso.

No se hace una migración en bloque — se separa cuando hay una sesión real que lo justifique.

---

## Creación de un archivo nuevo

Antes de crear uno nuevo:

1. Listar `discovery/` y verificar si ya existe un discovery sobre el mismo dominio o hipótesis.
2. Si existe → actualizar el archivo existente, no duplicar.
3. Si no existe → crear con el patrón de naming correspondiente y declarar el estado inicial en el header (`En investigación`).

Si la sesión introduce una hipótesis y no hay discovery, **el primer paso es proponer crearlo**.

---

## Soft deletes

Los archivos obsoletos no se borran físicamente. Se prefijan con `.trash-` para ocultarlos en listados pero preservar el contenido por si se necesita auditarlo.

```
.trash-CLP_Session_Context.md                          ← versión previa reemplazada
.trash-OPS_Session_Context.md                          ← versión previa reemplazada
```

Una limpieza periódica puede borrarlos definitivamente cuando no haya riesgo de necesitar el histórico.
