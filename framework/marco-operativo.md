# Marco Operativo — Flujos y Movimiento de Dinero

Versión: 1.1 | Last updated: 2026-04-13
Parte del Marco Legal, Operativo y Contable de los Productos y Servicios de Ardua.

---

## Contexto

La viabilidad legal de un producto no garantiza su viabilidad operativa. Un flujo puede estar perfectamente habilitado por la infraestructura regulatoria del grupo y aun así ser inoperable si no existen procesos definidos para la recepción de fondos, la ejecución, la confirmación y la gestión de excepciones.

Este documento mapea cómo opera Ardua en la práctica: quién hace qué, cuándo, con qué herramientas y bajo qué criterios. Es la base para identificar qué puede escalar y qué depende hoy de decisiones informales o personas específicas.

---

## 1. Recepción y validación de fondos

### 1.1 Confirmación de recepción

La confirmación de recepción de fondos es manual en la mayoría de los casos. El único flujo automatizado es el ingreso y egreso de pesos argentinos, exclusivamente para clientes que tienen acceso a la APP.

El equipo de Operaciones es el responsable de validar que los fondos efectivamente llegaron antes de habilitar cualquier operación. La verificación se realiza directamente en el banco desde el que se va a procesar el pago.

### 1.2 Discrepancias entre monto esperado y monto recibido

Cuando existe una discrepancia entre el monto instruido y el monto recibido, Operaciones se comunica con el cliente para entender el motivo. En operaciones con cables internacionales, la causa más frecuente son los costos de bancos intermediarios que deducen su comisión en tránsito.

### 1.3 Tiempos de corte

Existen tiempos de corte que afectan el costo de la operación para el cliente:

- **Operaciones de mesa (FX):** Si los fondos llegan fuera del horario operativo, se cobra una tasa por diferir la operación al siguiente día hábil.
- **Fondos en pesos:** Si los fondos llegan en un horario en el que no es posible suscribir, se cobra un costo adicional.

Los horarios de corte exactos no están documentados en este archivo. Ver sección de pendientes — O-01.

---

## 2. Ejecución de operaciones y movimiento entre entidades

### 2.1 Coordinación Operaciones — Mesa de Trading

El flujo de coordinación entre Operaciones y la Mesa de Trading para operaciones de cambio es el siguiente:

1. Operaciones informa a la Mesa el ingreso de fondos del cliente.
2. La Mesa cierra el tipo de cambio (FX) o el movimiento correspondiente.
3. La Mesa informa a Operaciones mediante un excel el monto a liquidar.
4. Operaciones ejecuta el pago.

### 2.2 Instrucción de pago al exterior

Operaciones valida que se haya recibido la contraparte antes de ejecutar la operación solicitada por el cliente. La instrucción de pago no se emite sin confirmación de recepción de fondos.

### 2.3 Movimiento de dinero entre entidades del grupo

El movimiento de dinero entre entidades del grupo cuando una recibe y otra liquida se resuelve informalmente. No existe un proceso de instrucción formal documentado entre entidades.

Este punto es un riesgo operativo y de trazabilidad. Ver sección de pendientes — O-03.

---

## 3. Operaciones con criptoactivos

### 3.1 Wallets operativas

Al momento de la documentación, no existe separación entre wallets operativas y wallets de custodia de clientes. Se están brindando wallets únicas a los clientes. Este es un punto de mejora identificado con implicancias tanto operativas como regulatorias.

Los flujos detallados de compra de cripto vía Circuit Pay, coordinación fiat/crypto con Astra Ventures y Ardua Solutions Corp, y gestión de transacciones en cadena están pendientes de documentación. Ver sección de pendientes — O-04 a O-08.

---

## 4. Conciliación operativa

### 4.1 Frecuencia y responsable

La conciliación de saldos se realiza diariamente desde Finanzas, que registra y concilia los movimientos internamente.

### 4.2 Relación entre conciliación operativa y contable

Hoy la conciliación operativa y la contable son el mismo proceso. No existe separación formal entre ambas funciones. Finanzas cumple ambos roles simultáneamente.

Esta situación implica un único punto de control sin verificación cruzada. Es un riesgo que escala con el volumen de operaciones.

### 4.3 Escalamiento de diferencias

Las diferencias detectadas en la conciliación se resuelven caso a caso. No existe un proceso formal de escalamiento ni un registro de incidentes de conciliación.

---

## 5. Coordinación entre áreas

### 5.1 Operaciones → Finanzas

Operaciones informa a Finanzas los movimientos del día a mitad del día. El reporte se realiza mediante un excel por banco. No existe reporte de cierre de día automatizado.

### 5.2 Instrucciones de clientes

Operaciones recibe instrucciones directamente de los clientes. En algunos casos las instrucciones llegan a través de otra área (Sales, Mesa de Trading), pero no existe un protocolo formal que defina por qué canal deben ingresar.

### 5.3 Sistema de trazabilidad

No existe sistema de ticketing ni trazabilidad de instrucciones operativas. Toda la gestión se realiza por Slack, email y WhatsApp. Esto implica que no hay registro estructurado, búsqueda histórica, ni posibilidad de auditoría sistemática de las instrucciones recibidas y ejecutadas.

---

## 6. Implicancia operativa para el diseño de productos

Ardua es una infraestructura operativa — su valor para el cliente depende directamente de que esa infraestructura funcione con consistencia y sin depender de personas específicas o decisiones ad-hoc. Ver `propuesta-de-valor.md`.

Antes de considerar cualquier flujo de producto como viable para diseño o desarrollo, debe poder responderse afirmativamente la siguiente pregunta:

> ¿Existen procesos definidos para la recepción de fondos, ejecución, confirmación y gestión de excepciones de este flujo?

Si alguno de estos pasos depende de decisiones ad-hoc, de una sola persona o de canales informales, el producto no es escalable aunque sea legalmente válido. Un producto bien diseñado no puede construirse sobre una base operativa que falla cuando la persona clave no está disponible.

---

## 7. Pendientes — Marco Operativo

Los siguientes puntos requieren relevamiento, validación o definición formal. Hasta que no estén resueltos, el diseño de productos que los involucren debe asumir riesgo operativo explícito.

| # | Pendiente | Área responsable | Impacto si no se resuelve |
|---|---|---|---|
| O-01 | Horarios de corte documentados | Operaciones | Sin esta referencia, el diseño de productos no puede definir SLAs ni gestionar expectativas de clientes con precisión. |
| O-02 | Flujo cross-border paso a paso | Operaciones | Cualquier producto de pagos internacionales no tiene un flujo operativo de referencia sobre el cual diseñar. |
| O-03 | Formalización del movimiento intercompany | Operaciones / Legal | Riesgo de trazabilidad, compliance y contable. A mayor volumen, mayor exposición. |
| O-04 | Flujo de compra de cripto vía Circuit Pay | Operaciones | Sin este flujo documentado no se puede diseñar ningún producto que involucre compra de cripto para clientes argentinos. |
| O-05 | Coordinación fiat/crypto entre entidades | Operaciones | Cualquier producto cripto cross-entidad no tiene un flujo operativo de referencia. |
| O-06 | Confirmación de liquidación on-chain | Operaciones / Tecnología | Riesgo de dar por liquidadas operaciones que aún pueden revertirse. |
| O-07 | Protocolo de gestión de transacciones fallidas en cadena | Operaciones | Cualquier fallo en cadena se resuelve ad-hoc, con riesgo de pérdida o error. |
| O-08 | Separación wallets operativas / custodia de clientes | Operaciones / Legal | Riesgo regulatorio (custodia) y operativo (mezcla de fondos). |
| O-09 | Herramientas de seguimiento de posiciones en tiempo real | Operaciones | Sin visibilidad del stack actual no se puede diseñar observabilidad ni integraciones. |
| O-10 | Protocolo de gestión de excepciones operativas | Operaciones | A mayor volumen, los errores sin protocolo generan retrabajo, pérdidas y riesgo reputacional. |
| O-11 | Separación formal de conciliación operativa y contable | Operaciones / Finanzas | Sin separación, no hay verificación cruzada. Un error pasa tanto el filtro operativo como el contable sin ser detectado. |
| O-12 | Canal formal de ingreso de instrucciones de clientes | Operaciones / Sales / Mesa | Sin canal formal, no hay trazabilidad ni posibilidad de auditar quién instruyó qué. |

---

*Este documento es una referencia viva. Se actualiza cuando los procesos operativos se formalizan, se incorporan nuevas herramientas o cambia la estructura del equipo de Operaciones.*
