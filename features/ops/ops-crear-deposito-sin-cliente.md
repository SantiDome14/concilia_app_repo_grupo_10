# ops-crear-deposito-sin-cliente

> Última actualización: 2026-05-14
> Discovery origen: ops-discovery.md §17
> REQ relacionado: REQ-42
> Feature siguiente: features/ops/ops-asignar-cliente-a-deposits.md

---

## Contexto

En muchos flujos de depósito de OPS, especialmente en depósitos por CVU (esquema PSP/ARS) y en depósitos a Cuentas Pool en exchanges/custodios (esquema Ops/no-ARS), el dinero llega a una cuenta de Ardua antes de que se pueda identificar al Cliente que lo envió. La atribución requiere conciliación posterior por parte de Operaciones, que puede tardar horas o días.

Hasta antes de este feature, la única opción era posponer el registro del movimiento hasta tener al Cliente identificado, lo que dejaba fondos físicamente recibidos sin reflejo en el ledger interno y obligaba a usar planillas externas ("La Diaria") para llevar el control en el ínterin.

Este feature habilita el **registro temprano** de un DEPOSIT con el Lado Ardua completo (se sabe a qué cuenta de Ardua llegó el dinero) y el Lado Cliente vacío. El DEPOSIT queda en estado `Pending` hasta que se complete la imputación del Lado Cliente, mecanismo que vive en `features/ops/ops-asignar-cliente-a-deposits.md`.

---

## Objetivo

- Permitir el registro de un DEPOSIT con Lado Ardua completo y Lado Cliente vacío.
- Asegurar que el dinero recibido quede reflejado en el ledger interno desde el momento de la recepción, no desde la conciliación.
- Eliminar la dependencia de planillas externas ("La Diaria") para llevar el estado interino entre recepción y atribución.
- Mantener al movimiento en estado `Pending` y visible en la tabla con badge "Sin asignar" en la columna Cliente, hasta que se asigne.

---

## Alcance funcional

### 1. Formulario de creación de DEPOSIT

El módulo de Movimientos expone un mecanismo para registrar un DEPOSIT manualmente desde la UI de OPS. El formulario captura:

| Campo | Obligatorio al registrar | Notas |
|---|---|---|
| Tipo de movimiento | Sí | `DEPOSIT` (fijo en este formulario). |
| Fecha y hora del movimiento | Sí | Cuándo ocurrió el ingreso de fondos. |
| Monto | Sí | Valor numérico positivo. |
| Moneda | Sí | Moneda del movimiento. ARS solo bajo Haz Pagos; el resto en el esquema Ops no-ARS. |
| Sociedad + Banco/Estructura + Cuenta (Lado Ardua) | Sí | Cascada en el formulario, datos del catálogo Bancos/Cuentas. La Cuenta debe ser compatible con la moneda del movimiento. |
| Cliente + Cuenta Operativa (Lado Cliente) | No | Quedan vacíos. Visible como badge "Sin asignar" en la tabla. |
| Referencia externa / observaciones | No | Texto libre, útil cuando llega información parcial del cliente (ej. campo Referencia de un CVU). |

### 2. Estado inicial al registrar

El DEPOSIT se crea en estado `Pending`. El estado se mantiene hasta que se complete la imputación del Lado Cliente (mediante `ops-asignar-cliente-a-deposits.md`) o hasta que el flujo funcional avance por otros eventos definidos por el motor de estados (fuera del alcance de este feature).

### 3. Visibilidad en la tabla de Movimientos

El DEPOSIT recién creado aparece en la tabla de Movimientos con:

- Lado Ardua completo en la columna **Banco/Cuenta**.
- Badge **"Sin asignar"** en ámbar en la columna **Cliente**.
- Badge **Pending** en la columna **Estado**.

### 4. Acción posterior

Desde la fila del DEPOSIT en estado `Pending` con Lado Cliente vacío, el menú contextual habilita la acción "Asignar Cliente" (ver `ops-asignar-cliente-a-deposits.md`).

---

## Fuera de alcance

- **Ingesta automática de DEPOSITS** desde webhooks o integraciones (Coinag, exchanges, etc.). Este feature cubre solo el registro manual desde la UI. La ingesta automática es un feature aparte.
- **Validación de duplicados** contra movimientos ya registrados por otra vía.
- **Reglas de auto-imputación del Lado Cliente** desde campos parciales (ej. parseo de la Referencia de un CVU para inferir al Cliente). La asignación es siempre manual en V1. La auto-imputación es V2.
- **Permisos por rol** (qué roles pueden registrar DEPOSITS). Detalles de RBAC son responsabilidad del sistema de roles del módulo.
- **Reversión / anulación del DEPOSIT registrado.** Fuera del alcance V1.

---

## Criterios de aceptación

1. Un DEPOSIT puede registrarse con Lado Ardua completo (Sociedad + Banco/Estructura + Cuenta) y Lado Cliente vacío.
2. Ningún DEPOSIT puede registrarse sin Lado Ardua completo.
3. El DEPOSIT recién creado queda en estado `Pending`.
4. En la tabla de Movimientos, el DEPOSIT muestra el Lado Ardua en la columna "Banco/Cuenta", badge "Sin asignar" en ámbar en la columna "Cliente", y badge "Pending" en la columna "Estado".
5. La Cuenta del Lado Ardua seleccionada en el formulario debe ser compatible con la moneda del movimiento.
6. El menú contextual de la fila del DEPOSIT con Lado Cliente vacío expone la acción "Asignar Cliente" (ver `ops-asignar-cliente-a-deposits.md`).

---

## Referencias

- Discovery origen: `discoveries/ops-discovery.md` §17
- REQ-42 / AM-972: framework de acciones e imputación bidireccional
- Feature complementario (paso siguiente): `features/ops/ops-asignar-cliente-a-deposits.md`
- Modelo del Lado Cliente: `features/ops/ops-cuentas-operativas-del-cliente.md`
- Catálogo del Lado Ardua: `features/ops/ops-modulo-bancos-y-cuentas.md` (a crear)
