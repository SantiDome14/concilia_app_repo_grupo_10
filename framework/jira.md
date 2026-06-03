---
updated_at: 2026-06-03
---

# Modelo de gestión en Jira — PRODUCT y TECHNOLOGY

Este documento es la fuente canónica de cómo el área de Producto y el área de Tecnología gestionan el trabajo en Jira. Describe los proyectos, los boards, los tipos de work item y el ciclo de vida que conecta ambos mundos. Cualquier artefacto o skill que opere sobre Jira (captura de requerimientos, enriquecimiento, reportería, SLA) debe alinearse con este modelo.

---

## Proyectos

La estructura gestiona dos proyectos de Jira, ambos en el mismo site (`cloudId: 53eec1f8-a156-4af9-bc3a-d6142b50e0cc`):

| Proyecto | Key | Área | Rol |
|---|---|---|---|
| PRODUCT | PWI (Product Work Items) | Producto | Donde nace y se gestiona todo el trabajo del área de Producto |
| TECHNOLOGY | EWI (Engineering Work Items) | Tecnología | Donde se refina técnicamente y se ejecuta la implementación |

---

## PRODUCT (PWI)

Tiene **un solo board**: `PWI · Requirement`. Ahí se gestiona todo el trabajo del área, dividido en tipos de work item:

- **Requirement** — el flujo tradicional. Una necesidad funcional generada por un área de negocio (el qué y el por qué). Cuando pasa a `SENT TO DEV`, dispara la creación de una Épica espejo en TECHNOLOGY (ver "Ciclo de vida").
- **Work Automation** — trabajo de automatización gestionado por Producto.
- **Activities** — la bolsa. Tareas que ejecuta Producto y **no van a Tecnología** (no generan espejo en EWI). Las Activities son provisionales: a medida que surgen tareas recurrentes, se promueven a un Work Item propio. Si aparece la necesidad de usar Activities de forma repetida, es señal de que hay que definir un nuevo tipo de Work Item.

Punto clave: **no todo lo que vive en PRODUCT genera un espejo en TECHNOLOGY.** Solo el flujo que pasa a `SENT TO DEV` lo hace. Las Activities y otras tareas que ejecuta Producto se resuelven dentro de PWI.

---

## TECHNOLOGY (EWI)

Tiene **dos boards** sobre el mismo proyecto, diferenciados por workflow y por los tipos de work item que soportan:

### Board de Refinement

Solo soporta **Épicas** — específicamente las que se generan automáticamente cuando PRODUCT mueve un Requirement a `SENT TO DEV`. Su objetivo es el refinamiento técnico del requerimiento: ajustes, definición de tareas hijas, etc.

Workflow: `TO REFINEMENT → IN REFINEMENT → READY FOR DEV → BLOCKED → DEPRECATED`.

### Board de Development

Soporta **Stories, Tasks, Subtasks** y demás work items de ejecución.

Workflow: `READY FOR DEV → IN PROGRESS → BLOCKED → CODE REVIEW → DONE → DEPRECATED`.

---

## Ciclo de vida — del Requirement al Development

1. Un área genera un **Requirement** en PRODUCT (típicamente capturado por Miles desde Slack).
2. El Requirement se enriquece y, cuando está listo, el PM lo mueve a `SENT TO DEV` (manualmente — ninguna automatización ni skill transiciona esto).
3. Ese pase dispara una automatización que crea una **Épica espejo en TECHNOLOGY**, vinculada al Requirement con relación `causes` / `is caused by` y heredando la descripción enriquecida. La Épica arranca en `TO REFINEMENT`, en el board de Refinement.
4. Tecnología refina la Épica: la ajusta, le define tareas hijas, etc. Mientras tanto, los estados sincronizados del Requirement en PRODUCT (`SENT TO DEV`, `READY FOR DEV`, `IN DEVELOPMENT`, `DONE`) reflejan el progreso del espejo.
5. Cuando el refinamiento se completa, la Épica pasa a `READY FOR DEV`. Ahí ocurre la transformación: una automatización **cambia el issue type de la Épica a Story** (y el de sus hijos de Task a Subtask). Como consecuencia, el work item **desaparece del board de Refinement** (que solo soporta Épicas) y **aparece en el board de Development** (que soporta Stories/Tasks). Los filtros de cada board hacen el resto.
6. El mismo Work Item EWI-XX persiste a lo largo de toda su vida — solo cambia de tipo. El Requirement en PRODUCT sigue asociado al mismo EWI sin importar su nuevo tipo; la transformación no lo afecta.

---

## Implicancias para los artefactos del área

- **El espejo es un Requirement → Épica → Story**, no un tipo fijo. Cualquier lógica que busque el espejo debe hacerlo por el vínculo `causes` / `is caused by`, nunca asumiendo un issue type.
- **No todo work item de PRODUCT tiene espejo.** Activities y tareas internas de Producto viven solo en PWI.
- **El enriquecimiento no está atado al issue type.** Puede aplicarse a Requirements, Work Automation, Activities o cualquier work item que surja. El sub-flujo que sincroniza el espejo en EWI solo corre cuando ese espejo existe.
- **La relación `causes` / `is caused by` está reservada** exclusivamente al vínculo Requirement (PWI) ↔ espejo (EWI). No usarla para otros fines.
- **PRODUCT define el qué y el por qué; TECHNOLOGY define el cómo.** Los requerimientos del área de Producto no incluyen modelos de datos, contratos de API ni decisiones de arquitectura (ver §3.5 de `project-instructions.md`).
