# ops-cuentas-operativas-del-cliente

> Última actualización: 2026-05-14
> Discovery origen: ops-discovery.md §17
> REQ relacionado: REQ-42 (modelo consumido)

---

## Contexto

Cada Cliente que opera con Ardua tiene un Docket de Ardua Solutions Corp (entidad ancla del grupo) y, asociadas a ese Docket, al menos una Cuenta Operativa del Cliente por moneda. Estas cuentas son construcciones contables internas — su denominación se conforma con dígitos del Docket + moneda + sufijo (ej. `005516EURC739`) — y reflejan el saldo atribuido al cliente, pero no representan una cuenta bancaria propia bajo el paraguas de Ardua: los fondos físicos viven en las estructuras de pooling de las entidades, análogamente a cómo opera el encaje bancario.

Un mismo Cliente jurídico (identificado por Tax ID) puede tener Dockets en varias entidades del grupo a nivel legal/fiscal (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures), pero la operatoria de imputación se realiza siempre contra el Docket de Ardua Solutions Corp. Los otros Dockets existen a nivel legal/fiscal pero no son operativos para imputación.

Este modelo emergió durante el refinamiento del REQ-42 (imputación bidireccional de movimientos en OPS), cuando se identificó que el modelo previo confundía "Cuenta Operativa del Cliente" con "sub-cuenta bancaria del cliente bajo nuestra estructura". Las sub-cuentas bancarias reales existen solo en casos específicos (PSP/CVU bajo CBU Pool en Coinag) y no son lo que se imputa del Lado Cliente.

---

## Objetivo

- Documentar el modelo conceptual de Docket y Cuenta Operativa del Cliente como referencia única en el framework.
- Aclarar la distinción entre Cuenta Operativa (construcción contable) y Subcuenta bancaria real (caso PSP/CVU).
- Establecer las reglas de cardinalidad, denominación, naturaleza y consumidores del modelo.
- Servir de fuente de verdad para features que consumen el modelo (imputación de movimientos OPS, presentación de saldos CLP, asientos contables FIN).

---

## Alcance funcional

### 1. Identificación del Cliente

Cliente jurídico se identifica por **Tax ID** único. Un mismo Cliente jurídico es un único registro en el catálogo de Clientes de Ardua, incluso si tiene Dockets en varias entidades.

### 2. Modelo de Dockets

Cada Cliente puede tener uno o más Dockets (legajos), uno por entidad del grupo donde opera. Los Dockets se gestionan desde LEX. Codificación visible:

- `AS[NNNNNN]` — Ardua Solutions Corp
- `HAZ[NNNNNN]` — Haz Pagos
- `CIR[NNNNNN]` — Circuit Pay
- `Astra` — Astra Ventures (formato TBD)

### 3. Docket de Ardua Solutions Corp como ancla operativa

De todos los Dockets de un Cliente, el Docket AS es el ancla operativa. Toda imputación de movimientos del Lado Cliente, todo saldo presentado en CLP y todo asiento del Motor Contable referencia al Docket AS, independientemente de la entidad del Lado Ardua del movimiento. Los Dockets de otras entidades existen a nivel legal/fiscal pero no son operativos para imputación.

### 4. Cuenta Operativa del Cliente

Cada Docket AS tiene asociadas una o más Cuentas Operativas, una por moneda en la que el Cliente opera.

**Denominación.** El identificador único de cada Cuenta Operativa se conforma con: `[6 dígitos del Docket AS][código moneda][3 dígitos sufijo]`. Ejemplos:

| Docket | Moneda | Cuenta Operativa |
|---|---|---|
| AS005516 | EUR | 005516EURC739 |
| AS005516 | USDT | 005516USDT959 |
| AS005516 | USDC | 005516USDC179 |
| AS005516 | BTC | 005516BTC101 |

**Naturaleza.** Las Cuentas Operativas son construcciones contables internas — no son cuentas bancarias en ninguna estructura externa. El saldo de una Cuenta Operativa refleja el dinero atribuido al Cliente, pero los fondos físicos no están custodiados en una ubicación específica del cliente: viven mezclados en las estructuras de pooling de Ardua (Wallet Pools en exchanges, CBU Pools en bancos, etc.). La analogía es el encaje bancario — un banco le muestra al cliente que tiene X en su cuenta, pero los fondos están operativamente desplegados en otras operaciones del banco.

**Estados.** Activa | Inactiva.

### 5. Cardinalidad

| Relación | Cardinalidad |
|---|---|
| Cliente jurídico (Tax ID) : Dockets | 1 : N |
| Cliente : Docket AS | 1 : 1 |
| Docket AS : Cuenta Operativa | 1 : N (mínimo una por moneda activa) |
| Cuenta Operativa : Moneda | 1 : 1 |

### 6. Consumidores del modelo

| Módulo | Para qué consume el modelo |
|---|---|
| OPS | Imputación del Lado Cliente en movimientos (ver REQ-42). El destino lógico de imputación es la Cuenta Operativa del Cliente en la moneda del movimiento. |
| CLP | Presentación de saldos al cliente. El cliente ve sus Cuentas Operativas en el detalle de su cuenta. |
| FIN | Asientos del Motor Contable. Cada movimiento imputado contra una Cuenta Operativa genera asientos referenciando al Docket AS. |
| LEX | Alta del Docket cuando se onboarda al cliente en una entidad del grupo. LEX no gestiona las Cuentas Operativas — solo los Dockets. |

### 7. Subcuenta bancaria real vs Cuenta Operativa

Estos dos conceptos pueden coexistir para un mismo Cliente sin contradicción:

- **Subcuenta bancaria real** (ej. CVU del cliente bajo CBU Pool en Coinag — caso PSP): cuenta bancaria con identificador propio en la plataforma externa. Documenta dónde está el dinero físicamente.
- **Cuenta Operativa del Cliente**: construcción contable interna de Ardua. Documenta a quién pertenece el dinero.

La Subcuenta bancaria forma parte del catálogo de Bancos/Cuentas (módulo OPS). La Cuenta Operativa NO forma parte de ese catálogo — vive en el modelo de Clientes.

---

## Fuera de alcance

- Gestión (alta/edición/baja) de Cuentas Operativas — funcionalidad necesaria pero todavía sin diseñar; drenará a feature aparte cuando se aborde.
- Reglas de auto-provisión (si se autogenera una Cuenta Operativa al operar una moneda nueva, o si requiere alta manual).
- Conciliación entre Subcuenta bancaria real y Cuenta Operativa cuando ambas existen para un mismo cliente y moneda.
- Plan de cuentas contable asociado a Cuenta Operativa — preparatorio hasta que FIN defina el plan de cuentas del Motor Contable.

---

## Criterios de aceptación

1. Cada Cliente jurídico en el catálogo de Clientes está identificado por un único Tax ID.
2. Cada Cliente tiene exactamente un Docket por entidad del grupo donde opera.
3. Cada Cliente operativo en Ardua tiene un Docket de Ardua Solutions Corp.
4. Cada Cuenta Operativa pertenece a exactamente un Docket AS y a exactamente una moneda.
5. La denominación de cada Cuenta Operativa cumple el patrón `[6 dígitos Docket AS][código moneda][3 dígitos sufijo]`.
6. La imputación del Lado Cliente en un movimiento OPS apunta a la Cuenta Operativa del Cliente en la moneda del movimiento, no a una cuenta bancaria.
7. El catálogo de Bancos/Cuentas del módulo OPS no contiene Cuentas Operativas del Cliente.
8. Un Cliente puede no tener Cuenta Operativa en una moneda específica (caso: nunca operó en esa moneda). El sistema debe contemplar este caso y manejarlo según corresponda al contexto del consumidor.

---

## Referencias

- Discovery origen: `discoveries/ops-discovery.md` §17
- REQ-42 / AM-972: imputación bidireccional de movimientos en OPS
- Entidades del grupo: `entities/ardua-solutions-corp.md`, `entities/haz-pagos.md`, `entities/circuit-pay.md`
