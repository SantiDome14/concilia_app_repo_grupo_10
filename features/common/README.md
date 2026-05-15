# COMMON — Features transversales

> Última actualización: 2026-05-15
> Estado: En definición progresiva

---

## Propósito

Esta carpeta agrupa **features transversales** del financial-core: capacidades que cruzan más de una aplicación (CLP, TRD, LEX, OPS, FIN) y deben definirse de manera unificada en lugar de duplicarse en cada producto. Ejemplos: notificaciones, alertas, inboxes, sistema de acciones, reporting compartido, dashboards.

COMMON no es una aplicación. Es la convención que evita duplicar la definición de capacidades cross-product cuando una misma feature aparece en varios productos del financial-core con la misma semántica.

---

## Diferencia con sistemas transversales de infraestructura

| Tipo | Ejemplo | Vive en |
|---|---|---|
| **Feature transversal** (capacidad cross-product) | Sistema unificado de notificaciones, Inbox transversal, Alertas | `features/common/` |
| **Sistema transversal de infraestructura** (no es feature) | `core-template-frontend`, `jira-automations`, `observabilidad` | Solo `discoveries/` (sin features ni prototipo) |

La regla operativa: si la capacidad se expone al usuario final en múltiples productos del financial-core, vive en `features/common/`. Si es infraestructura técnica o tooling interno, vive solo en `discoveries/`.

---

## Módulos / capacidades transversales

> Por completar. Listar las features transversales con su estado actual.

| Capacidad | Estado | Feature file | Productos afectados |
|---|---|---|---|
| Ventanas de Mantenimiento | Definida | `ventanas-de-mantenimiento.md` | TRD, OPS, LEX, CLP, FIN, COM |
| Release Awareness | Definida | `release-awareness.md` | TRD, OPS, LEX, CLP, FIN |
| Centro de Alertas | Definida | `centro-de-alertas.md` | TRD, OPS, LEX, CLP, FIN |
| Centro de Reportería | Definida | `centro-de-reporteria.md` | TRD, OPS, LEX, CLP, FIN |
| Centro de Solicitudes | Definida | `centro-de-solicitudes.md` | TRD, OPS, LEX, CLP, FIN |
| Ardua API Documentation | En definición | `ardua-api-documentation.md` | — (audiencia externa: developers B2B) |

> **Nota sobre `ardua-api-documentation`:** es la primera feature de `common/` cuya audiencia es **externa al financial-core** (clientes B2B integradores, no usuarios del backoffice). Se ubica en `common/` como simplificación pragmática mientras el framework no tenga una categoría dedicada a productos públicos. A futuro podría justificarse abrir un `features/external/` o similar; ver §Frentes abiertos.

---

## Convención de nombres dentro de `features/common/`

```
features/common/[capacidad].md
```

Reglas:

- Todo en **kebab-case** y ASCII only.
- **Sin prefijo de aplicación** — la carpeta `common/` ya define el contexto. La feature sí indica las aplicaciones afectadas en su body o frontmatter.
- El nombre describe la capacidad transversal (`notificaciones.md`, `alertas.md`, `inbox.md`), no a qué producto se aplica.

**Ejemplos esperados:**

```
features/common/notificaciones.md         ← sistema unificado de notificaciones
features/common/alertas.md                ← motor de alertas con perfiles A/B/C/D
features/common/centro-de-solicitudes.md   ← centro transversal de Solicitudes/Tareas (Inbox)
features/common/acciones.md               ← mecanismo Acción · Registro · Capability
```

---

## Relación con prototipo

A diferencia de las carpetas de productos del financial-core, **COMMON no tiene un prototipo único**: cada feature transversal se refleja dentro del prototipo de **cada producto** que la implementa. Por ejemplo, el sistema de Alertas se ve dentro de `prototypes/lex/`, `prototypes/ops/`, `prototypes/trd/`, etc.

Si una feature transversal lo amerita, puede crearse un prototipo de referencia en `prototypes/common/[capacidad]/` que muestre el comportamiento aislado, pero no es obligatorio.

**Excepción `ardua-api-documentation`:** al ser un producto público independiente y no una capacidad cross-product del backoffice, tiene prototipo propio en `prototypes/docs/`. Es la única feature de `common/` con prototipo dedicado en v1.

---

## Cuándo se crea un archivo en `features/common/`

Cuando una capacidad cumple las dos condiciones siguientes:

1. Se expone al usuario final.
2. Aparece en **dos o más productos** del financial-core con la misma semántica.

Si una capacidad solo vive en un producto, va en la carpeta de ese producto (`features/[aplicacion]/[aplicacion]-[capacidad].md`), no en `features/common/`. Si más adelante se replica a otros productos, se promueve a `features/common/`.

---

## Frentes abiertos

> Por completar. Hipótesis transversales bajo investigación, con referencia al discovery correspondiente.

- **Categoría dedicada a productos públicos externos.** `ardua-api-documentation` es el primer caso de feature pública (audiencia: clientes B2B integradores) ubicada en `common/`. Si surgen más productos externos (ej. un developer portal con dashboard, un public status page), justifica evaluar abrir un `features/external/` o `features/public/`. Decisión gated a Head of Product (modificación del framework).
