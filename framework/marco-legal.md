# Marco Legal — Infraestructura Regulatoria del Grupo Ardua

Versión: 1.1 | Last updated: 2026-04-13
Parte del Marco Legal, Operativo y Contable de los Productos y Servicios de Ardua.

---

## Contexto

Cada producto y servicio de Ardua atraviesa una o más entidades legales del grupo. Saber qué entidad actúa en cada paso de un flujo — quién puede recibir fondos, quién liquida, quién custodia, quién reporta — no es un detalle administrativo: es una restricción de diseño real.

Las entidades del grupo no son productos independientes. Son las habilitaciones institucionales que hacen posible la infraestructura operativa de Ardua — cada una aporta una capacidad regulatoria específica que, en conjunto, permite que el cliente opere sin tener que construir esa estructura por su cuenta. Ver `propuesta-de-valor.md`.

Un producto mal mapeado sobre la infraestructura legal existente puede resultar inoperable, no escalable o directamente no conforme con la regulación vigente. Este documento establece los límites reales dentro de los cuales se pueden diseñar, operar y escalar los productos.

---

## 1. Estructura del grupo

El grupo Ardua está compuesto por cuatro entidades legales operativas:

| Entidad | Tipo | Jurisdicción |
|---|---|---|
| Haz Pagos | PSP — Proveedor de Servicios de Pago | Argentina |
| Circuit Pay | PSAV — Proveedor de Servicios de Activos Virtuales | Argentina |
| Ardua Solutions Corp | MSB — Money Services Business | Canadá |
| Astra Ventures | VASP — Virtual Asset Service Provider | Polonia |

**Entidad principal:** Ardua Solutions Corp es la entidad de referencia del grupo. Es la única habilitada para operar internacionalmente y actúa como eje de las relaciones intercompany.

---

## 2. Licencias y capacidades por entidad

### 2.1 Capacidades habilitadas

| Entidad | Puede hacer | No puede hacer |
|---|---|---|
| Haz Pagos | Provisión de CVU, envío y recepción de fondos en pesos, recaudación | Solo opera con residentes o empresas registradas en Argentina |
| Circuit Pay | Intermediar compra/venta de cripto con pesos, transferencias entre criptoactivos | Custodiar fondos cripto de clientes, emitir wallets a clientes (*) |
| Ardua Solutions Corp | Cambio de divisas, operaciones con criptoactivos, pagos internacionales | No puede operar con US Persons ni jurisdicciones prohibidas por compliance |
| Astra Ventures | Provisión de wallets, custodia de cripto, intercambio cripto/fiat | No puede operar con US Persons ni jurisdicciones prohibidas por compliance |

(*) Circuit Pay podría custodiar activos digitales mediante modificación de su registro actual. No está habilitado en la configuración vigente.

### 2.2 Capacidad de custodia y swap fiat/crypto

- Ardua Solutions Corp y Astra Ventures pueden custodiar activos digitales y realizar swap fiat/crypto.
- Circuit Pay puede realizar swap pero no custodiar. La custodia requeriría modificar su registro ante CNV.

### 2.3 Capacidad de recepción directa de fondos de clientes

Todas las entidades pueden recibir fondos de clientes directamente: Haz Pagos, Circuit Pay, Ardua Solutions Corp y Astra Ventures.

---

## 3. Restricciones regulatorias por tipo de cliente

| Entidad | Clientes habilitados | Restricción |
|---|---|---|
| Haz Pagos | Personas y empresas con residencia en Argentina | No puede dar CVU a no residentes |
| Circuit Pay | Personas y empresas con residencia en Argentina (incluye empresas del exterior registradas en Argentina) | No puede operar con clientes no registrados en Argentina |
| Ardua Solutions Corp | Clientes internacionales en jurisdicciones permitidas | No puede operar con US Persons ni jurisdicciones prohibidas por compliance |
| Astra Ventures | Clientes internacionales en jurisdicciones permitidas | No puede operar con US Persons ni jurisdicciones prohibidas por compliance |

---

## 4. Relaciones entre entidades

### 4.1 Estructura formal

Las cuatro entidades son personas jurídicas independientes. No existe una relación de mandato o representación directa entre ellas, con la excepción detallada en la sección 4.2.

Haz Pagos y Circuit Pay tienen cuentas operativas dentro de Ardua Solutions Corp, lo que las convierte en clientes institucionales de la entidad canadiense.

### 4.2 Contratos intercompany vigentes

| Partes | Tipo de acuerdo | Alcance |
|---|---|---|
| Haz Pagos — Ardua Solutions Corp | Acuerdo de recaudación internacional | Permite a Ardua Solutions Corp recaudar pesos argentinos por cuenta y orden de Haz Pagos. Es la única figura vigente donde una entidad actúa formalmente por cuenta y orden de otra. |
| Circuit Pay — Ardua Solutions Corp | Acuerdo de giro al descubierto | Facilita el fondeo operativo de Circuit Pay a través de Ardua Solutions Corp. |
| Ardua Solutions Corp → Haz Pagos y Circuit Pay | Cesión de accesos de compliance | Ardua Solutions Corp cede acceso a Worldcheck y Aiprise a ambas entidades locales, y acceso a Elliptic exclusivamente a Circuit Pay, para tareas de compliance y onboarding. |

### 4.3 Clientes con relación contractual con más de una entidad

Los clientes que operan en Argentina y compran cripto tienen relación contractual simultánea con Haz Pagos y Circuit Pay, porque el flujo de compra de cripto utiliza el CVU de Haz Pagos como canal de ingreso de pesos.

---

## 5. Habilitación de nuevas capacidades

Cuando un producto nuevo requiere una capacidad que ninguna entidad del grupo posee actualmente, el proceso es el siguiente:

1. **Análisis legal:** Se evalúan las implicancias regulatorias y costos de obtener la nueva habilitación, con apoyo de un asesor externo especializado.
2. **Evaluación de viabilidad:** Se determina si es viable y conveniente aplicar a una nueva licencia.
3. **Mecanismo transitorio** (si la necesidad es urgente): Se puede operar bajo la licencia de una entidad ya habilitada mediante un acuerdo formal, mientras se gestiona la habilitación propia.

---

## 6. Reporting regulatorio por entidad

| Entidad | Obligaciones de reporte | Frecuencia |
|---|---|---|
| Haz Pagos | Requerimientos del BCRA (texto ordenado RI-PSP). Revisión externa independiente. | Mensual, trimestral y anual |
| Circuit Pay | Altas y bajas de clientes, operaciones ante UIF y CNV. Auditoría anual de sistemas UIF. Revisión externa independiente UIF. | Mensual y anual |
| Ardua Solutions Corp | Reporte de operaciones sospechosas. Auditoría del manual de procedimientos. | A pedido. Auditoría cada dos años. |
| Astra Ventures | Ver sección de pendientes — L-02 | — |

---

## 7. Implicancia legal para el diseño de productos

Antes de considerar cualquier flujo de producto como viable para diseño o desarrollo, debe poder responderse afirmativamente la siguiente pregunta:

> ¿Cada paso del flujo puede asignarse a una entidad del grupo con la licencia y capacidad regulatoria para ejecutarlo?

Si algún paso requiere una habilitación que ninguna entidad posee, el producto no es operable en su forma actual — independientemente de su viabilidad técnica o comercial. Este análisis es previo al diseño, no posterior.

---

## 8. Pendientes — Marco Legal

Los siguientes puntos requieren validación o completamiento para que este documento sea una referencia confiable y completa.

| # | Pendiente | Área responsable | Impacto si no se resuelve |
|---|---|---|---|
| L-01 | Firma de contratos por producto: La pregunta "¿quién firma con el cliente final?" tiene como respuesta actual "varía según el producto." Se necesita una tabla que mapee, producto por producto, qué entidad es la contraparte contractual del cliente. | Legal & Compliance | Sin este mapeo, no es posible garantizar que los contratos existentes estén firmados por la entidad correcta. |
| L-02 | Reporting regulatorio de Astra Ventures: No hay datos sobre las obligaciones de reporte de Astra Ventures ante su regulador en Polonia como VASP. | Legal & Compliance | Riesgo de incumplimiento regulatorio no visible desde el diseño de producto. |
| L-03 | Modificación de registro de Circuit Pay para custodia: Se mencionó como posibilidad pero no hay estado de avance ni decisión formal. Si algún producto requiere custodia vía Circuit Pay, este punto bloquea el diseño. | Legal & Compliance | Diseños que asuman esta capacidad como disponible pueden resultar inoperables. |
| L-04 | Definición de "jurisdicciones prohibidas" para Ardua Solutions Corp y Astra Ventures: No hay una lista de referencia consolidada disponible para el equipo de Producto. | Legal & Compliance | El equipo de Producto no puede evaluar la viabilidad legal de expansiones geográficas sin esta referencia. |

---

*Este documento es una referencia viva. Se actualiza cuando hay cambios regulatorios, nuevos contratos intercompany, modificaciones de licencias o incorporación de nuevas entidades al grupo.*
