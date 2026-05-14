# ops-crear-withdrawal-sin-banco

> Última actualización: 2026-05-14
> Discovery origen: ops-discovery.md §17
> REQ relacionado: REQ-42
> Feature siguiente: features/ops/ops-asignar-banco-y-cuenta-withdrawals.md

---

## Contexto

En los flujos de WITHDRAWAL de OPS, la situación es la inversa a los DEPOSITS: el Cliente que solicita la operación está siempre identificado (la solicitud nace de un cliente específico), pero la cuenta de Ardua desde la que se ejecuta el pago puede no estar definida al momento del registro. Operaciones decide la cuenta de origen según la posición de liquidez en el momento de ejecutar.

Hasta antes de este feature, el WITHDRAWAL no podía registrarse hasta tener definido el Lado Ardua, lo que dejaba solicitudes recibidas sin reflejo en el sistema mientras se evaluaba desde dónde ejecutarlas.

Este feature habilita el **registro temprano** de un WITHDRAWAL con el Lado Cliente completo (Cliente + Cuenta Operativa del Cliente identificados) y el Lado Ardua vacío. El WITHDRAWAL queda en estado `Pending` hasta que se complete el Lado Ardua, mecanismo que vive en `features/ops/ops-asignar-banco-y-cuenta-withdrawals.md`.

---

## Objetivo

- Permitir el registro de un WITHDRAWAL con Lado Cliente completo y Lado Ardua vacío.
- Asegurar que la solicitud del Cliente quede reflejada en el sistema desde el momento de la recepción, no desde la decisión de ejecución.
- Eliminar la dependencia de planillas externas para llevar el estado de solicitudes recibidas pendientes de asignación de liquidez.
- Mantener al movimiento en estado `Pending` y visible en la tabla con badge "Sin asignar" en la columna Banco/Cuenta, hasta que se asigne.

---

## Alcance funcional

### 1. Formulario de creación de WITHDRAWAL

El módulo de Movimientos expone un mecanismo para registrar un WITHDRAWAL manualmente desde la UI de OPS. El formulario captura:

| Campo | Obligatorio al registrar | Notas |
|---|---|---|
| Tipo de movimiento | Sí | `WITHDRAWAL` (fijo en este formulario). |
| Fecha y hora de la solicitud | Sí | Cuándo el Cliente pidió el retiro. |
| Monto | Sí | Valor numérico positivo. |
| Moneda | Sí | Moneda del movimiento. ARS solo bajo Haz Pagos; el resto en el esquema Ops no-ARS. |
| Cliente + Cuenta Operativa (Lado Cliente) | Sí | El Cliente se busca por razón social o Tax ID (typeahead); la Cuenta Operativa se filtra por la moneda del movimiento. Mismo comportamiento que el modal de `ops-asignar-cliente-a-deposits.md`. |
| Sociedad + Banco/Estructura + Cuenta (Lado Ardua) | No | Quedan vacíos. Visible como badge "Sin asignar" en la tabla. |
| Cuenta destino externa | No (V1) | Datos de la cuenta hacia la que se ejecutará el pago (whitelist del Cliente). Fuera del alcance de este feature — vive en la Comanda de Retiros (`ops-discovery.md` §6.3). |
| Observaciones | No | Texto libre. |

Al cargar el Cliente, si éste no tiene Cuenta Operativa activa en la moneda del movimiento, el formulario muestra una alerta informativa y bloquea la creación del WITHDRAWAL hasta que se resuelva — mismo comportamiento que el modal de Asignar Cliente.

### 2. Estado inicial al registrar

El WITHDRAWAL se crea en estado `Pending`. El estado se mantiene hasta que se complete el Lado Ardua (mediante `ops-asignar-banco-y-cuenta-withdrawals.md`) o hasta que el flujo funcional avance por otros eventos definidos por el motor de estados (fuera del alcance de este feature).

### 3. Visibilidad en la tabla de Movimientos

El WITHDRAWAL recién creado aparece en la tabla de Movimientos con:

- Lado Cliente completo en la columna **Cliente** (razón social + Cuenta Operativa).
- Badge **"Sin asignar"** en ámbar en la columna **Banco/Cuenta**.
- Badge **Pending** en la columna **Estado**.

### 4. Acción posterior

Desde la fila del WITHDRAWAL en estado `Pending` con Lado Ardua vacío, el menú contextual habilita la acción "Asignar Banco y Cuenta" (ver `ops-asignar-banco-y-cuenta-withdrawals.md`).

---

## Fuera de alcance

- **Validación de whitelist de cuenta destino externa.** Pertenece al flujo de la Comanda de Retiros (ver `ops-discovery.md` §6.3). Este feature solo captura la solicitud — la validación/aprobación es trabajo aparte.
- **Aprobación operativa del WITHDRAWAL.** Idem: pertenece a la Comanda de Retiros, no a este feature.
- **Reglas de auto-asignación del Lado Ardua** en función de posición de liquidez. La asignación es siempre manual en V1. La auto-imputación es V2.
- **Reversión / anulación del WITHDRAWAL registrado.** Fuera del alcance V1.
- **Permisos por rol.** Detalles de RBAC son responsabilidad del sistema de roles del módulo.

---

## Criterios de aceptación

1. Un WITHDRAWAL puede registrarse con Lado Cliente completo (Cliente + Cuenta Operativa del Cliente) y Lado Ardua vacío.
2. Ningún WITHDRAWAL puede registrarse sin Lado Cliente completo.
3. La Cuenta Operativa del Lado Cliente debe estar activa y debe ser de la moneda del movimiento.
4. Si el Cliente seleccionado no tiene Cuenta Operativa activa en la moneda del movimiento, el formulario muestra una alerta informativa y bloquea la creación.
5. El WITHDRAWAL recién creado queda en estado `Pending`.
6. En la tabla de Movimientos, el WITHDRAWAL muestra el Lado Cliente en la columna "Cliente" (razón social + Cuenta Operativa), badge "Sin asignar" en ámbar en la columna "Banco/Cuenta", y badge "Pending" en la columna "Estado".
7. El menú contextual de la fila del WITHDRAWAL con Lado Ardua vacío expone la acción "Asignar Banco y Cuenta" (ver `ops-asignar-banco-y-cuenta-withdrawals.md`).

---

## Referencias

- Discovery origen: `discoveries/ops-discovery.md` §17
- REQ-42 / AM-972: framework de acciones e imputación bidireccional
- Feature complementario (paso siguiente): `features/ops/ops-asignar-banco-y-cuenta-withdrawals.md`
- Modelo del Lado Cliente: `features/ops/ops-cuentas-operativas-del-cliente.md`
- Catálogo del Lado Ardua: `features/ops/ops-modulo-bancos-y-cuentas.md` (a crear)
- Flujo de aprobación y whitelist: `discoveries/ops-discovery.md` §6.3 (Comanda de Retiros)
