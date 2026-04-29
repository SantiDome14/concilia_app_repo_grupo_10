# Marco Contable — Implicancias Contables por Entidad y por Flujo

Versión: 1.1 | Last updated: 2026-04-13
Parte del Marco Legal, Operativo y Contable de los Productos y Servicios de Ardua.

---

## Contexto

La viabilidad legal y operativa de un producto no garantiza su viabilidad contable. Cada hecho económico que genera un flujo de producto debe tener un tratamiento contable definido y compatible con las normas vigentes para cada entidad interviniente.

Si algún paso del flujo no puede ser registrado correctamente — por ausencia de un plan de cuentas adecuado, falta de asientos intercompany definidos, o tratamiento contable-fiscal no resuelto — el producto representa un riesgo de cumplimiento financiero antes de llegar a producción.

Este documento mapea la estructura contable del grupo y el estado actual del tratamiento contable por tipo de operación.

---

## 1. Estructura contable del grupo

### 1.1 Modelo contable

Cada entidad lleva contabilidad independiente. La operación se gestiona a nivel grupo pero se contabiliza individualmente por entidad. No existe consolidación contable a nivel grupo en la configuración actual.

### 1.2 Responsable contable

La contabilidad de todas las entidades está a cargo de estudios externos. No existe equipo contable interno.

### 1.3 Plan de cuentas

Cada entidad tiene su propio plan de cuentas. No existe un plan de cuentas unificado a nivel grupo, lo que implica que el tratamiento contable de una misma operación puede variar entre entidades.

### 1.4 Moneda funcional por entidad

| Entidad | Moneda funcional | Moneda de reporte |
|---|---|---|
| Haz Pagos | Peso argentino (ARS) | ARS |
| Circuit Pay | Peso argentino (ARS) | ARS |
| Ardua Solutions Corp | Dólar estadounidense (USD) | Dólar canadiense (CAD) |
| Astra Ventures | Pendiente de confirmación | Pendiente de confirmación |

### 1.5 Cierre contable y obligaciones fiscales

| Entidad | Cierre contable | Obligaciones fiscales principales |
|---|---|---|
| Haz Pagos | 31 de diciembre | IVA, IIBB, Ganancias |
| Circuit Pay | 31 de diciembre | IVA, IIBB, Ganancias |
| Ardua Solutions Corp | 31 de diciembre | Régimen fiscal canadiense |
| Astra Ventures | 31 de diciembre | Régimen fiscal de Polonia / VASP |

---

## 2. Implicancia contable para el diseño de productos

Ardua es una infraestructura operativa — y esa infraestructura solo funciona si cada hecho económico que genera puede ser registrado correctamente en cada entidad que interviene. Ver `propuesta-de-valor.md`.

Antes de considerar cualquier flujo de producto como viable para diseño o desarrollo, debe poder responderse afirmativamente la siguiente pregunta:

> ¿Cada hecho económico que genera este flujo tiene un tratamiento contable definido y compatible con las normas vigentes para cada entidad interviniente?

Si algún paso del flujo no puede ser registrado correctamente, el producto representa un riesgo de cumplimiento financiero que no puede ignorarse. Este análisis es previo al diseño, no posterior.

---

## 3. Pendientes — Marco Contable

El Marco Contable es el que presenta mayor cantidad de vacíos. A diferencia del Marco Legal (que está mayormente validado) y el Marco Operativo (que describe procesos existentes aunque informales), el Marco Contable requiere respuestas formales del estudio externo responsable de cada entidad.

Los pendientes se agrupan en cuatro categorías.

### 3.1 Normas contables aplicables

| # | Pendiente | Área responsable | Impacto |
|---|---|---|---|
| C-01 | Normas contables por entidad: No está documentado qué marco normativo aplica cada entidad. | Finanzas / Estudios externos | Sin saber el marco normativo, no se puede evaluar si el tratamiento contable propuesto es válido para cada entidad. |
| C-02 | Moneda funcional y de reporte de Astra Ventures: No está confirmado en qué moneda opera y reporta contablemente la entidad polaca. | Finanzas / Astra Ventures | Afecta el diseño de productos que involucren flujos con Astra Ventures. |

### 3.2 Registro contable por tipo de operación

| # | Pendiente | Área responsable | Impacto |
|---|---|---|---|
| C-03 | Depósito de pesos vía CVU de Haz Pagos: No está definido qué asiento contable genera la recepción de fondos ni en qué momento se reconoce. | Finanzas | Cualquier producto que use CVU como canal de ingreso de fondos no tiene tratamiento contable definido. |
| C-04 | Intermediación de Circuit Pay en compra de cripto: No está definido si la operación se registra como compraventa, como comisión o bajo otra figura. | Finanzas | Afecta directamente el modelo de revenue de cualquier producto cripto para clientes argentinos. |
| C-05 | Diferencia de tipo de cambio en Ardua Solutions Corp: No está definido cómo se registra la diferencia de cambio cuando liquida una operación internacional. | Finanzas | Afecta el P&L de todos los productos de pagos internacionales. |
| C-06 | Operaciones que atraviesan más de una entidad: No están definidos los asientos intercompany para operaciones que se inician en una entidad y liquidan en otra. | Finanzas | Sin asientos intercompany definidos, no hay consistencia contable entre entidades ni posibilidad de conciliación confiable. |
| C-07 | Comisiones y fees entre entidades del grupo: No están documentados los precios de transferencia entre entidades ni si existen contratos formales que los respalden. | Finanzas / Legal | Riesgo fiscal por ausencia de arm's length pricing en operaciones intercompany. |

### 3.3 Tratamiento contable de operaciones con criptoactivos

| # | Pendiente | Área responsable | Impacto |
|---|---|---|---|
| C-08 | Criterio de valuación de criptoactivos en balance: No está definido si se valúan a costo histórico, a valor de mercado u otro criterio. | Finanzas | Afecta la valuación del balance y el resultado de todas las entidades que operan cripto. |
| C-09 | Registro de diferencias de valuación de cripto: No está definido si las variaciones de precio se registran como resultado o como ajuste patrimonial. | Finanzas | Impacto directo en el P&L e impuestos de Circuit Pay, Ardua Solutions Corp y Astra Ventures. |
| C-10 | Registro de swap fiat/crypto: No está definido si un swap se registra como compraventa de activo, como intermediación o bajo otra figura. | Finanzas | Afecta el modelo contable e impositivo de cualquier producto que involucre conversión cripto/fiat. |
| C-11 | Tratamiento impositivo de cripto en Argentina: No está documentado el tratamiento impositivo específico aplicable a Circuit Pay y Haz Pagos. | Finanzas / Legal | El diseño de pricing de productos cripto puede generar una carga impositiva no prevista. |
| C-12 | Marco contable de Astra Ventures como VASP: No están documentadas las normas contables aplicables en Polonia para custodia y swap de cripto. | Finanzas / Astra Ventures | Cualquier producto que use Astra Ventures como entidad de custodia no tiene marco contable de referencia. |

### 3.4 Operaciones intercompany

| # | Pendiente | Área responsable | Impacto |
|---|---|---|---|
| C-13 | Tratamiento contable del acuerdo de recaudación Haz Pagos / Ardua Solutions Corp: No está definido si genera un pasivo/activo entre entidades ni cómo se registra en cada una. | Finanzas | Sin este registro definido, la conciliación intercompany no es posible. |
| C-14 | Tratamiento contable del giro al descubierto Circuit Pay / Ardua Solutions Corp: No está definido el tratamiento contable de este acuerdo ni cómo se registran los movimientos asociados. | Finanzas | Afecta la posición de deuda y el resultado financiero de Circuit Pay. |
| C-15 | Frecuencia y proceso de conciliación intercompany: No está documentado si las operaciones entre entidades se concilian periódicamente ni quién lo hace. | Finanzas | Sin conciliación intercompany periódica, las diferencias se acumulan y se vuelven difíciles de resolver. |
| C-16 | Precios de transferencia para servicios de compliance cedidos por Ardua Solutions Corp: No está documentado si los accesos a Worldcheck, Aiprise y Elliptic tienen un precio de transferencia definido. | Finanzas / Legal | Riesgo fiscal en Argentina y Canadá por operaciones intercompany sin precio de transferencia documentado. |

---

*Este documento es una referencia viva. Se actualiza cuando Finanzas define los tratamientos contables pendientes, cuando cambian las normas aplicables a alguna entidad, o cuando se incorporan nuevas entidades o tipos de operación al grupo.*
