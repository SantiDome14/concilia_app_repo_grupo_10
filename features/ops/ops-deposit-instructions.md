# ops-deposit-instructions

> Última actualización: 2026-06-04
> Estado: En construcción (PWI-44 en análisis)
> Discovery: [`ops-deposit-instructions-discovery.md`](../../discoveries/ops-deposit-instructions-discovery.md)

---

## Propósito

El módulo de Deposit Instructions permite al área de Operations configurar y generar instrucciones de depósito bancario (Account Confirmation Letter) para los clientes de Ardua. Cada instrucción se compone de atributos parametrizables que admiten valores estáticos o variables que se resuelven dinámicamente al momento de la generación.

---

## Ubicación en la app

`ops.arduasolutions.com/settings/instructions`

---

## Sistema de variables

El editor de instrucciones soporta una sintaxis de variables del tipo `{variable}` en el campo `default_value` de cada atributo. Los valores se resuelven en el momento en que el operador genera una deposit instruction para un cliente específico — el template almacena la referencia, el valor real se inyecta al momento del uso.

### Variables disponibles en producción

| Variable | Resuelve como |
|---|---|
| `{docket}` | Código de docket del cliente |
| `{name}` | Nombre del cliente |
| `{tax_number}` | Tax ID del cliente |

### Variables pendientes de construcción (PWI-44)

Las siguientes dos variables fueron definidas en PWI-44 y están pendientes de implementación. Ambas leen datos del legajo del cliente en **LEX** — no requieren cambios en el modelo de datos de LEX ni en la UI del editor de OPS más allá de exponer las nuevas variables en el catálogo.

| Variable | Resuelve como | Fuente |
|---|---|---|
| `{account_number}` | `512` + dígitos numéricos del Docket AS del cliente | Campo Docket AS del legajo en LEX |
| `{client_address}` | Dirección del cliente sin etiquetas de campo | Campo `address` del legajo en LEX |

**Lógica de `{account_number}`:** lee el Docket AS desde LEX, elimina el prefijo `AS` y antepone `512`. Ejemplo: cliente con Docket `AS010009` → resuelve como `512010009`.

**Lógica de `{client_address}`:** parsea el campo de dirección de LEX, que sigue la convención `Street: [val], City: [val], State: [val], Zip: [val], Country: [val]`, y entrega los valores sin prefijos de campo, separados por coma y espacio. Ejemplo: `Street: 1680 Moldes, City: Buenos Aires, State: Ciudad Autónoma de Buenos Aires, Zip: C1426, Country: AR` → resuelve como `1680 Moldes, Buenos Aires, Ciudad Autónoma de Buenos Aires, C1426, AR`.

> La lógica de parsing de `{client_address}` y el manejo de direcciones con formato no convencional se define con Tecnología en refinement (P-03, P-04 del discovery).

---

## Dependencias

- **LEX:** ambas variables nuevas leen datos del legajo del cliente. La dependencia es exclusivamente de lectura — no se requieren cambios en LEX.
- El operador de OPS accede al legajo del cliente en LEX para verificar los datos antes de generar la instrucción. Esta es la práctica operativa que motiva la automatización.

---

## Fuera de alcance (v1)

- Generación, renderizado o envío del Account Confirmation Letter como PDF.
- Cambios en el modelo de datos de direcciones en LEX.
- Modificación de instrucciones ya configuradas en producción.

---

## Decisiones clave

- El sistema de variables ya existía en producción antes de PWI-44. Las dos variables nuevas son una extensión del catálogo, no una construcción desde cero.
- La fuente de datos para `{account_number}` es LEX (campo Docket AS), no OPS — confirmado el 04/06/2026.
- El nombre final de la variable de dirección es `{client_address}` (no `{address}`).

---

## PWI asociado

- **PWI-44** — Expandir OPS — Variables automáticas en Deposit Instructions · IN ANALYSIS
