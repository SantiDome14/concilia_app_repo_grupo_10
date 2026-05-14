# ops-asignar-banco-y-cuenta-withdrawals

> Última actualización: 2026-05-14
> Discovery origen: ops-discovery.md §17
> REQ relacionado: REQ-42

---

## Contexto

En los WITHDRAWALS de OPS, el Lado Cliente es obligatorio al momento del registro (se conoce qué cliente solicita la operación), pero el Lado Ardua puede no estar definido — la cuenta desde la que se ejecuta el pago depende de la posición de liquidez en el momento de la ejecución. Esto deja al WITHDRAWAL en estado `Pending` con el Lado Ardua vacío hasta que se complete.

Para destrabar esta brecha, cada fila de DEPOSIT y WITHDRAWAL expone un menú contextual con la acción **Asignar Banco y Cuenta** (o **Editar Banco y Cuenta** cuando ya está asignado). La acción abre un modal con un formulario en cascada que consume el catálogo Bancos/Cuentas de OPS, para que el operador complete el Lado Ardua de forma rápida y consistente.

Este feature es complementario de `ops-crear-withdrawal-sin-banco.md` (registro inicial del WITHDRAWAL sin Lado Ardua) — uno habilita la creación incompleta, el otro habilita la completitud diferida.

---

## Objetivo

- Habilitar al operador de OPS a completar o editar el Lado Ardua de un movimiento desde la tabla de Movimientos, sin abandonar el flujo de gestión.
- Garantizar que solo pueda seleccionar combinaciones válidas (Sociedad + Banco/Estructura + Cuenta compatibles entre sí y con la moneda del movimiento).
- Mantener la trazabilidad de cuándo se asignó y por quién (responsabilidad del sistema, captura mediante metadata estándar).
- Eliminar la dependencia de planillas externas para resolver el Lado Ardua de movimientos legacy.

---

## Alcance funcional

### 1. Disparo desde el menú contextual de fila

Cada fila de DEPOSIT y WITHDRAWAL expone un botón de acciones contextuales (⋮) que abre un menú. La acción "Asignar Banco y Cuenta" aparece en este menú con uno de dos labels según el estado actual del movimiento:

- **"Asignar Banco y Cuenta"** — cuando el Lado Ardua está vacío.
- **"Editar Banco y Cuenta"** — cuando el Lado Ardua ya está asignado.

Para tipos de movimiento fuera del scope V1 del REQ-42, el menú ⋮ no expone esta acción.

### 2. Modal de asignación

Al disparar la acción, se abre un modal con un formulario en cascada. Datos consumidos del catálogo Bancos/Cuentas (sección Cuentas de Ardua). Todos los campos son input text con dropdown de búsqueda/selección.

| Campo | Comportamiento |
|---|---|
| **Sociedad** | Lista las entidades del grupo: Haz Pagos SA, Circuit Pay SA, Ardua Solutions Corp, Astra Ventures. |
| **Banco/Estructura** | Se habilita al seleccionar Sociedad. Lista las estructuras (bancos, exchanges, custodios, ALyCs, proveedores) registradas bajo la Sociedad seleccionada. |
| **Cuenta** | Se habilita al seleccionar Banco/Estructura. Lista las Cuentas registradas bajo esa estructura, filtradas por compatibilidad de moneda con el movimiento. Cada opción muestra tipo de cuenta + moneda + número/address. |

### 3. Filtrado en cascada

Cada selector se filtra dinámicamente:

- **Banco/Estructura** se filtra por la Sociedad seleccionada.
- **Cuenta** se filtra por el Banco/Estructura seleccionado **y** por compatibilidad de moneda con el movimiento.

Cambiar un selector superior limpia los selectores inferiores (cascada estricta).

### 4. Confirmación

El modal solo puede confirmarse con los tres campos completos. Al confirmar:

- El Lado Ardua del movimiento queda asignado con la combinación seleccionada.
- El estado funcional del movimiento se recalcula según las reglas vigentes.
- El modal se cierra.

### 5. Edición de un Lado Ardua ya asignado

Cuando el modal se abre con label "Editar Banco y Cuenta":

- Los selectores aparecen pre-poblados con la asignación actual.
- La cascada se respeta: cambiar Sociedad limpia Banco/Estructura y Cuenta; cambiar Banco/Estructura limpia Cuenta.
- Al confirmar, el Lado Ardua se sobrescribe con la nueva combinación.

---

## Fuera de alcance

- **Alta de Sociedades, Bancos/Estructuras o Cuentas desde el modal.** El modal solo consume el catálogo existente. La gestión del catálogo vive en el módulo Bancos/Cuentas (`features/ops/ops-modulo-bancos-y-cuentas.md`).
- **Validación automática de compatibilidad de moneda contra la operativa del esquema.** El filtrado por moneda se hace contra la moneda del movimiento, no contra reglas operativas más amplias.
- **Auto-asignación por reglas de negocio.** El operador siempre selecciona manualmente. La auto-imputación en tiempo real es V2.
- **Cuentas inactivas en el catálogo.** Las cuentas en estado Inactiva no aparecen en el dropdown de Cuenta, incluso si la Sociedad y el Banco/Estructura están activos.

---

## Criterios de aceptación

1. La acción "Asignar Banco y Cuenta" aparece en el menú contextual de cada DEPOSIT y WITHDRAWAL cuando el Lado Ardua está vacío.
2. La acción pasa a "Editar Banco y Cuenta" cuando el Lado Ardua ya está asignado.
3. Para tipos de movimiento fuera del scope V1, la acción no aparece en el menú contextual.
4. El modal expone selectores en cascada Sociedad → Banco/Estructura → Cuenta.
5. Cada selector se filtra dinámicamente por la selección del selector superior.
6. El selector de Cuenta solo lista cuentas con moneda compatible con la del movimiento.
7. El selector de Cuenta solo lista cuentas en estado Activa.
8. Cambiar un selector superior limpia automáticamente los selectores inferiores.
9. El modal solo puede confirmarse con los tres campos completos.
10. Al confirmar, el Lado Ardua del movimiento queda asignado con la combinación seleccionada y el estado se recalcula.
11. Al abrir el modal de "Editar Banco y Cuenta", los selectores se pre-poblan con la asignación actual.

---

## Referencias

- Discovery origen: `discoveries/ops-discovery.md` §17
- REQ-42 / AM-972: framework de acciones e imputación bidireccional
- Catálogo consumido: `features/ops/ops-modulo-bancos-y-cuentas.md` (a crear)
- Feature complementario: `features/ops/ops-crear-withdrawal-sin-banco.md` (a crear)
