# ops-asignar-cliente-a-deposits

> Última actualización: 2026-05-14
> Discovery origen: ops-discovery.md §17
> REQ relacionado: REQ-42
> Modelo consumido: features/ops/ops-cuentas-operativas-del-cliente.md

---

## Contexto

En los DEPOSITS de OPS, el Lado Ardua es obligatorio al momento del registro (se conoce a qué cuenta de Ardua llegó el dinero), pero el Lado Cliente puede no estar identificado — especialmente en depósitos por CVU donde la atribución requiere conciliación posterior. Esto deja al DEPOSIT en estado `Pending` con el Lado Cliente vacío hasta que se complete.

Para destrabar esta brecha, cada fila de DEPOSIT y WITHDRAWAL expone un menú contextual con la acción **Asignar Cliente** (o **Editar Cliente** cuando ya está asignado). La acción abre un modal con dos campos secuenciales: búsqueda de Cliente y selección de Cuenta Operativa del Cliente en la moneda del movimiento.

Este feature consume el modelo conceptual definido en `features/ops/ops-cuentas-operativas-del-cliente.md`: la Cuenta Operativa es el destino lógico de imputación del Lado Cliente, no una cuenta bancaria, y la operatoria de imputación se realiza siempre contra el Docket de Ardua Solutions Corp del Cliente.

---

## Objetivo

- Habilitar al operador de OPS a completar o editar el Lado Cliente de un movimiento desde la tabla de Movimientos, sin abandonar el flujo de gestión.
- Asegurar que la imputación del Lado Cliente se haga siempre contra una Cuenta Operativa del Cliente en la moneda correcta, no contra el Cliente "en abstracto".
- Visibilizar al operador los casos donde el Cliente seleccionado no tiene Cuenta Operativa en la moneda del movimiento, sin permitir confirmar un Lado Cliente inválido.
- Eliminar la dependencia de planillas externas para resolver el Lado Cliente de movimientos legacy.

---

## Alcance funcional

### 1. Disparo desde el menú contextual de fila

Cada fila de DEPOSIT y WITHDRAWAL expone un botón de acciones contextuales (⋮) que abre un menú. La acción "Asignar Cliente" aparece con uno de dos labels según el estado actual:

- **"Asignar Cliente"** — cuando el Lado Cliente está vacío.
- **"Editar Cliente"** — cuando el Lado Cliente ya está asignado.

Para tipos de movimiento fuera del scope V1 del REQ-42, el menú ⋮ no expone esta acción.

### 2. Modal de asignación

Al disparar la acción, se abre un modal con dos campos secuenciales. Datos consumidos del catálogo de Clientes y de las Cuentas Operativas asociadas al Docket de Ardua Solutions Corp del Cliente seleccionado.

| Campo | Comportamiento |
|---|---|
| **Cliente** (obligatorio) | Componente de búsqueda tipo typeahead con input "Buscar por razón social o Tax ID...". A medida que se tipea, lista resultados filtrados del catálogo de Clientes. Cada resultado muestra razón social + Tax ID + Docket de Ardua. Solo Clientes activos. Empty state cuando no hay coincidencias. |
| **Cuenta Operativa del Cliente** (obligatorio) | Se habilita al seleccionar el Cliente. Lista únicamente las Cuentas Operativas activas del Docket AS del Cliente en la moneda del movimiento. Si hay una sola, autocompleta. Si hay varias, habilita dropdown. |

### 3. Alerta cuando el Cliente no tiene Cuenta Operativa en la moneda del movimiento

Al seleccionar un Cliente que no tiene Cuentas Operativas activas en la moneda de la transacción, el modal muestra una alerta informativa indicando esta condición y **bloquea la confirmación** hasta que se resuelva. Las opciones de resolución son:

- Cambiar el Cliente seleccionado por uno que sí tenga Cuenta Operativa en la moneda.
- Crear la Cuenta Operativa desde el módulo de Clientes (fuera del alcance de este modal — ver `Fuera de alcance`).

### 4. Confirmación

El modal solo puede confirmarse con ambos campos completos (Cliente + Cuenta Operativa). Al confirmar:

- El Lado Cliente del movimiento queda asignado con la combinación seleccionada.
- El estado funcional del movimiento se recalcula según las reglas vigentes.
- El modal se cierra.

### 5. Edición de un Lado Cliente ya asignado

Cuando el modal se abre con label "Editar Cliente":

- El campo Cliente aparece pre-poblado con la asignación actual (el typeahead muestra la selección activa).
- El campo Cuenta Operativa aparece pre-poblado con la asignación actual.
- Cambiar el Cliente limpia automáticamente la Cuenta Operativa (queda condicional al nuevo Cliente).
- Al confirmar, el Lado Cliente se sobrescribe con la nueva combinación.

---

## Fuera de alcance

- **Alta de Clientes desde el modal.** El modal solo consume el catálogo existente. La gestión del catálogo de Clientes vive en otro módulo.
- **Alta de Cuentas Operativas del Cliente desde el modal.** La gestión de Cuentas Operativas es un frente abierto y vivirá en feature aparte (ver §17.6 del discovery).
- **Búsqueda de Clientes por campos distintos a razón social o Tax ID** (ej. Docket, email, teléfono).
- **Selección de un Docket distinto al de Ardua Solutions Corp.** El modelo confirma que la operatoria de imputación se realiza siempre contra el Docket AS (ver §17.3 del discovery y `features/ops/ops-cuentas-operativas-del-cliente.md`).
- **Cuentas Operativas inactivas en el catálogo.** Las Cuentas Operativas en estado Inactiva no aparecen en el selector.
- **Validación automática contra reglas operativas más amplias** (ej. compatibilidad cliente-esquema, límites del cliente, etc.).

---

## Criterios de aceptación

1. La acción "Asignar Cliente" aparece en el menú contextual de cada DEPOSIT y WITHDRAWAL cuando el Lado Cliente está vacío.
2. La acción pasa a "Editar Cliente" cuando el Lado Cliente ya está asignado.
3. Para tipos de movimiento fuera del scope V1, la acción no aparece en el menú contextual.
4. El modal expone Cliente (obligatorio, búsqueda typeahead por razón social o Tax ID con empty state) y Cuenta Operativa del Cliente (obligatoria, condicional al Cliente).
5. El typeahead lista únicamente Clientes activos.
6. Cada resultado del typeahead muestra razón social + Tax ID + Docket de Ardua.
7. El selector de Cuenta Operativa se habilita solo después de seleccionar Cliente.
8. El selector de Cuenta Operativa lista únicamente las Cuentas Operativas activas del Docket de Ardua Solutions Corp del Cliente, en la moneda del movimiento.
9. Si el Cliente tiene una sola Cuenta Operativa en la moneda del movimiento, el selector autocompleta. Si tiene varias, habilita dropdown.
10. Si el Cliente no tiene Cuentas Operativas activas en la moneda del movimiento, el modal muestra una alerta informativa y bloquea la confirmación.
11. El modal solo puede confirmarse con ambos campos completos.
12. Al confirmar, el Lado Cliente del movimiento queda asignado con la combinación Cliente + Cuenta Operativa, y el estado se recalcula.
13. Al abrir el modal de "Editar Cliente", los campos se pre-poblan con la asignación actual.
14. Al cambiar el Cliente en modo edición, el campo Cuenta Operativa se limpia y queda condicional al nuevo Cliente.

---

## Referencias

- Discovery origen: `discoveries/ops-discovery.md` §17
- REQ-42 / AM-972: framework de acciones e imputación bidireccional
- Modelo consumido: `features/ops/ops-cuentas-operativas-del-cliente.md`
- Feature complementario: `features/ops/ops-crear-deposito-sin-cliente.md` (a crear)
