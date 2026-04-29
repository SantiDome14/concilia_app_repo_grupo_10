# Marco de Dimensiones de los Registros del Financial-Core

Versión: 1.1 | Last updated: 2026-04-28
Parte del Framework de Producto del Área de Producto de Ardua.

---

## Contexto

Las aplicaciones operativas-transaccionales del financial-core de Ardua — **OPS, TRD y FIN** — gestionan registros del negocio: movimientos de clientes, cotizaciones, lotes de liquidez, cuentas físicas, facturas, asientos contables, instrumentos financieros. Cada registro tiene un ciclo de vida que va más allá de "existir": se imputa, se concilia, se documenta, se cierra. Sin un método compartido para definir cómo se gestiona ese ciclo de vida, cada nuevo módulo se diseña contra criterios ad-hoc — capturando bien algunas dimensiones y olvidando otras.

Este marco descompone la práctica de gestión de registros del financial-core en sus dimensiones constitutivas y las convierte en un **checklist obligatorio del discovery por módulo**. La salida del discovery es una respuesta explícita a cada pregunta — incluso cuando la respuesta es "No aplica", porque ese No también es información de diseño.

> El marco no es una matriz de implementación. No exige que cada módulo cubra todas las dimensiones — exige que se decida explícitamente cuáles cubre y cuáles no.

**Apps en alcance:** OPS, TRD, FIN. Las apps LEX, CLP y COM tienen naturaleza distinta (compliance, customer-facing, comercial — no son apps de gestión transaccional de registros del negocio) y no aplican este marco.

---

## 1. Naturaleza y alcance

### 1.1 Qué es

Un cuestionario estructurado de 13 preguntas que todo módulo de OPS, TRD o FIN debe responder al cerrar su discovery, antes de pasar a feature spec.

### 1.2 Qué no es

- Una lista de features obligatorias.
- Una taxonomía de tipos de registro.
- Un patrón arquitectónico — ese plano vive en `financial-core-modules.md`.

### 1.3 Cuándo se usa

- Al abrir el discovery de un módulo nuevo de OPS, TRD o FIN.
- Al revisar el discovery de un módulo existente que está siendo extendido.
- Al evaluar si un pedido (de cliente interno, área hermana o stakeholder) constituye un módulo nuevo o pertenece a uno existente.

### 1.4 Cómo se aplica

Para cada módulo en discovery:

1. Se responde explícitamente cada una de las 13 preguntas.
2. Cada respuesta Sí o Parcial se vuelve un requisito funcional candidato y, en muchos casos, una **Acción** del menú del registro (ver §9).
3. Cada respuesta No queda registrada como decisión, no como olvido.
4. La superposición de Sí entre módulos revela infraestructura compartida que vale construir transversalmente.

---

## 2. Estructura del marco

El marco se descompone en dos planos:

| Plano | Pregunta de fondo | Cantidad |
|---|---|---|
| **Operativo** | ¿Qué se hace con los registros del módulo? | 8 preguntas |
| **Análisis** | ¿Qué dimensiones del análisis del negocio aplican al módulo? | 5 preguntas |

---

## 3. Plano operativo

### 3.1 Registros

> ¿Qué registros gestiona el módulo?

Identificar las entidades de datos primarias del módulo. Un módulo bien definido tiene un conjunto cerrado de registros que son su responsabilidad. Si el módulo gestiona registros que también pertenecen a otro módulo, eso es señal de scope mal definido.

Ejemplos:
- OPS — Movimientos → Movimientos de clientes (DEPOSIT / WITHDRAWAL); cuentas físicas asignadas.
- TRD — Quotes → Cotizaciones del cliente; tickets de operación.
- FIN — Disponibilidades → Cuentas físicas (banco / exchange / custodio); saldos de cliente en pools.
- FIN — Cobros → Facturas emitidas; comisiones cobrables; notas de crédito / débito.

### 3.2 Transacciones / movimientos

> ¿Qué transacciones / movimientos afectan a esos registros?

Catálogo de eventos que alteran el estado de los registros. Cada evento debe ser reconocible y nombrable. Un evento que no calce en el catálogo requiere definirse antes de que el módulo pueda procesarlo.

Ejemplos:
- OPS — Movimientos → recepción de fondos · ejecución de pago · asignación de cuenta · matching contra cliente.
- TRD — Quotes → solicitud · cotización · aceptación · ejecución · liquidación.
- FIN — Disponibilidades → DEPOSIT · WITHDRAWAL · FEE · TAX · REBATE · ADDITION · SWAP_OUT/IN · TRANSFER_OUT/IN · COLLECTOR_IN/OUT.
- FIN — Inversiones → constitución · devengamiento de interés · valuación · vencimiento.

### 3.3 Imputación

> ¿Los registros / transacciones del módulo requieren imputación a Estructura y/o Entidad?

La imputación es la asignación analítica del registro a dos vectores:

- **Estructura** — quién dentro del grupo es la contraparte interna. Tiene dos niveles:
  - Sociedad: Haz Pagos / Circuit Pay / Ardua Solutions Corp / Astra Ventures.
  - Sub-estructura (cuando aplica): Departamento dentro de la sociedad (ej: Trading Desk dentro de Haz Pagos).
- **Entidad** — quién fuera del grupo es la contraparte externa. Tipos: Cliente / Proveedor / Partner / Banco / Otro.

La imputación puede ser obligatoria, opcional o no aplicable según el módulo. Un Cobro necesita Entidad por definición; una transferencia entre cuentas internas no necesita Entidad pero sí Estructura. Una operación de TRD necesita ambos (qué sociedad ejecuta, qué cliente es contraparte).

### 3.4 Registro contable

> ¿Los registros / transacciones del módulo implican un asiento contable?

Como criterio general, generan asiento las transacciones que mueven recursos o actualizan el estado de un recurso (valuaciones, devengamientos, reclasificaciones). El criterio fino se decide en el discovery del módulo.

Esta pregunta queda parcialmente respondida hasta que se cierren los pendientes del marco contable (C-01 a C-16) — particularmente el plan de cuentas y el catálogo de asientos tipo. Hasta entonces, la respuesta declara intención, no implementación.

### 3.5 Conciliación

> ¿Los registros / transacciones del módulo se concilian? Contra qué / quién?

Conciliar es contrastar lo registrado contra una fuente externa. La pregunta tiene dos sub-decisiones:

- **¿Hay fuente externa?** — algunos módulos no tienen contraparte natural a conciliar (ej: cargas analíticas internas).
- **¿Cuál es esa fuente y con qué frecuencia está disponible?** — determina si la conciliación es continua, periódica o irregular.

Ejemplos de fuentes externas:
- OPS — Movimientos → extracto bancario para conciliación operativa.
- TRD — Quotes → confirmación de ejecución del proveedor de liquidez.
- FIN — Disponibilidades → extracto bancario · API on-chain · confirmación de exchange.
- FIN — Cobros → matching contra depósitos del ledger de Disponibilidades.
- FIN — Inversiones → cartera del broker / banco / sociedad de bolsa.

### 3.6 Governance — Aprobación

> ¿Los registros / transacciones del módulo requieren un flujo de aprobación más allá del registro contable?

Dimensión propia, no se subsume en Imputación ni en Registro contable. Hay módulos donde un registro nace en estado pendiente y necesita validación humana antes de impactar — por separación de funciones, por monto, por sensibilidad.

Ejemplos:
- OPS — Withdrawals → aprobación de retiros por encima de cierto umbral (doble firma).
- TRD — Quotes → aprobación de quotes que excedan el límite del trader.
- FIN — Disponibilidades → carga manual con doble aprobación (cargador ≠ aprobador).
- FIN — Cobros → emisión de notas de crédito que cancelan facturas previas.
- FIN — Pagos → aprobación de pagos masivos por encima de cierto umbral.
- FIN — Contabilidad → asientos manuales con flujo de aprobación.

### 3.7 Documentación y Notificación

> ¿Los registros / transacciones del módulo requieren generar un output formal hacia un actor externo — facturar, notificar, enviar, firmar, comunicar?

Dimensión propia que captura los efectos del registro hacia afuera del sistema. Distinta de Conciliación (que es entrada de información) y de Registro contable (que es efecto interno). Tiene sus propios estados (no emitido / emitido / firmado / acusado de recibo), responsables, SLAs y riesgos: una factura no emitida a tiempo es un riesgo fiscal, una instrucción de pago no enviada genera fricción operativa, un acuerdo no firmado no es exigible.

Tipos típicos:
- **Facturación** — emisión de comprobantes con efecto fiscal (factura A/B/C, nota de crédito, nota de débito).
- **Notificación** — comunicación formal a una contraparte (cliente, proveedor, partner) sobre un evento del registro.
- **Envío de instrucciones** — comunicación a un actor que debe ejecutar algo (instrucción de pago a banco, orden de transferencia).
- **Firmas** — adhesión legal de una contraparte a un documento (contrato, acuerdo de pago, pagaré).
- **Comprobantes internos** — recibos / certificados que materializan un acto sin necesariamente ser fiscales.

Ejemplos por app/módulo:
- OPS — Movimientos → comprobante de operación al cliente; notificación de retiro ejecutado; hash on-chain como evidencia.
- TRD — Quotes → confirmación de trade aceptado; ticket de operación; comprobante de liquidación.
- TRD — Lotes de liquidez → documentación del fix; liquidación al proveedor de liquidez.
- FIN — Cobros → emisión de factura (acto fiscal); envío al cliente; emisión de notas de crédito.
- FIN — Pagos → instrucción de pago al banco; notificación al proveedor; comprobante de retención.
- FIN — Deudas → notificación de vencimiento al acreedor; firma de acuerdo de pago.
- FIN — Inversiones → certificado de plazo fijo; comprobante de rescate.
- FIN — Disponibilidades → notificación al cliente cuando un retiro fue ejecutado.
- FIN — Monedas → no aplica (es configuración).

### 3.8 Cierre

> ¿Los registros / transacciones del módulo están sujetos a algún flujo de cierre?

El cierre es un **estado terminal del registro** que cambia cómo participa de los análisis posteriores: el registro cerrado no se modifica, no se toma como referencia para ciertos análisis, su impacto ya está consolidado en saldos al inicio o fin del próximo período.

Existen al menos dos tipos de cierre relevantes:

- **Cierre operativo del módulo** — corte propio del módulo: cierre de cuenta corriente al cierre del mes en Cobros, cierre de caja al final del día en Caja Chica, valuación de inversiones al cierre, cierre de sesión de trading.
- **Cierre contable del período** — incorporación al período cerrado del Libro Diario. Vive en el bloque Contabilidad de FIN pero condiciona a todos los módulos del financial-core que generan asientos.

Un módulo puede tener uno, ambos o ninguno. Cada uno requiere su propio diseño: actor responsable, momento del cierre, qué se permite y qué no después del cierre.

---

## 4. Plano de análisis

Cinco dimensiones de análisis que las áreas usuarias consumen sobre los registros. Cada módulo declara cuáles de las cinco aplican.

### 4.1 Posición

> ¿Hay gestión de Posición?

Aplica si existe un saldo o estado consolidado del módulo en cualquier momento. Responde "¿cuánto tengo hoy?" o "¿en qué estado está esto hoy?".

### 4.2 Operatoria

> ¿Hay gestión de Operatoria?

Aplica si existe flujo histórico de IN / OUT / AJUSTE sobre los registros. Responde "¿qué pasó?".

### 4.3 Disponibilidad

> ¿Hay gestión de Disponibilidad?

Aplica si existe distinción operativa entre lo total y lo disponible — lo no comprometido, lo no pignorado, lo no reservado. Responde "¿cuánto puedo usar hoy?".

### 4.4 Exposición

> ¿Hay gestión de Exposición?

Aplica si el registro cambia su valor o su perfil de riesgo cuando cambia una variable externa. Las variables externas relevantes en el contexto de Ardua son al menos: tipo de cambio, tasa de interés, calificación o solvencia de contraparte. Responde "¿qué tengo expuesto a un riesgo financiero?".

La exposición no se reduce a TC. En Inversiones, la exposición relevante es contraparte y plazo. En Deudas, tasa. En Monedas, TC. En cuentas a cobrar largas, todas las anteriores. En TRD, las posiciones abiertas tienen exposición al mercado.

### 4.5 Vencimientos

> ¿Hay gestión de Vencimientos?

Aplica si algo debe suceder o hacerse antes de una fecha cierta. Responde "¿qué tengo programado y cuándo?".

---

## 5. Aplicación al discovery

### 5.1 Salida esperada del discovery

Para cada módulo en discovery, el equipo cierra con una matriz de respuestas explícitas, una entrada por pregunta:

| #   | Pregunta                       | Respuesta esperada |
| --- | ------------------------------ | --- |
| 3.1 | Registros                      | Lista de entidades primarias |
| 3.2 | Transacciones                  | Catálogo de eventos |
| 3.3 | Imputación                     | Estructura: [Sí / No / Opcional] · Entidad: [Sí / No / Opcional] |
| 3.4 | Registro contable              | [Sí / No / Pendiente] |
| 3.5 | Conciliación                   | [Sí / No] · contra: [...] · frecuencia: [...] |
| 3.6 | Governance                     | [No / Lista de flujos de aprobación] |
| 3.7 | Documentación y Notificación   | [No / Lista de documentos y notificaciones] |
| 3.8 | Cierre                         | [No / Operativo / Contable / Ambos] · detalle |
| 4.1 | Posición                       | [Sí / No / Parcial] |
| 4.2 | Operatoria                     | [Sí / No / Parcial] |
| 4.3 | Disponibilidad                 | [Sí / No / Parcial] |
| 4.4 | Exposición                     | [Sí / No / Parcial] · variables relevantes |
| 4.5 | Vencimientos                   | [Sí / No / Parcial] |

### 5.2 Lectura cruzada — infraestructura transversal

Una vez completados los 13 cuestionarios para todos los módulos críticos del financial-core, la **superposición de respuestas Sí entre módulos revela infraestructura compartida** que vale construir transversalmente, en línea con la arquitectura de los módulos genéricos del financial-core (`financial-core-modules.md`).

Ejemplos esperables:

- Si Cobros, Pagos y Deudas responden Sí a Vencimientos → motor de vencimientos como servicio compartido (con alertas cercanas al SLA).
- Si Inversiones, Monedas y Disponibilidades multimoneda responden Sí a Exposición → motor de valuación + servicio de TC compartido.
- Si OPS-Movimientos, FIN-Disponibilidades, FIN-Cobros y FIN-Pagos responden Sí a Conciliación → motor de matching reutilizable.
- Si OPS-Movimientos, TRD-Quotes, FIN-Cobros y FIN-Pagos responden Sí a Documentación y Notificación → motor de generación de comprobantes + servicio de envío reutilizable.

Esto se decide cuando se tienen las 13 respuestas de al menos los módulos críticos, no antes.

---

## 6. Ejemplos aplicados

### 6.1 FIN — Disponibilidades (caso completo)

Disponibilidades es el módulo de mayor madurez del financial-core al momento de redactar este marco. Su cuestionario completo:

**Plano operativo**

| #   | Pregunta                       | Respuesta |
| --- | ------------------------------ | --------- |
| 3.1 | Registros                      | Cuentas físicas (banco / exchange / custodio); saldos de cliente en pools |
| 3.2 | Transacciones                  | DEPOSIT · WITHDRAWAL · FEE · TAX · REBATE · ADDITION · SWAP_OUT/IN · TRANSFER_OUT/IN · COLLECTOR_IN/OUT |
| 3.3 | Imputación                     | Estructura: Sí siempre (Sociedad → Estructura → Cuenta es jerarquía nativa). Entidad: Sí cuando aplica (cliente que deposita; proveedor que cobra FEE) |
| 3.4 | Registro contable              | Pendiente — aspirado, bloqueado por C-02 (plan de cuentas) y C-03..C-07 (registro por tipo) |
| 3.5 | Conciliación                   | Sí · contra extracto bancario (diaria), API on-chain, confirmación de exchange |
| 3.6 | Governance                     | Carga manual con doble aprobación (cargador ≠ aprobador) |
| 3.7 | Documentación y Notificación   | Parcial — notificación al cliente cuando un retiro fue ejecutado (canal: app / email). Sin facturación ni firmas. |
| 3.8 | Cierre                         | Operativo: Sí (cierre diario / mensual del ledger). Contable: pendiente del bloque Contabilidad |

**Plano de análisis**

| #   | Pregunta       | Respuesta |
| --- | -------------- | --------- |
| 4.1 | Posición       | Sí — sub-tab activo en el módulo |
| 4.2 | Operatoria     | Sí — sub-tab Movimientos en el módulo |
| 4.3 | Disponibilidad | Sí — KPI Liquidez disponible vs. Comprometido |
| 4.4 | Exposición     | Parcial — la posición es multimoneda con exposición a TC, pero no hay vista propia de exposición |
| 4.5 | Vencimientos   | Parcial — los retiros en Cola de Asignación tienen un componente de timing pero no de vencimiento formal |

### 6.2 OPS — Movimientos (mini-caso)

| # | Pregunta | Respuesta |
| --- | --- | --- |
| 3.1 | Registros | Movimientos de clientes (Vostro); cuentas físicas asignadas |
| 3.3 | Imputación | Estructura: Sí (sociedad / cuenta) · Entidad: Sí (cliente — matching obligatorio) |
| 3.5 | Conciliación | Sí · contra extracto bancario (operativa) |
| 3.7 | Documentación y Notificación | Sí · comprobante de operación al cliente; notificación de retiro ejecutado; hash on-chain como evidencia |
| 3.8 | Cierre | Operativo: Sí (cierre diario de la posición operativa) |
| 4.1 / 4.2 | Posición / Operatoria | Sí en ambas |

### 6.3 TRD — Quotes (mini-caso)

| # | Pregunta | Respuesta |
| --- | --- | --- |
| 3.1 | Registros | Cotizaciones del cliente; tickets de operación |
| 3.3 | Imputación | Estructura: Sí (qué sociedad ejecuta) · Entidad: Sí (cliente) |
| 3.5 | Conciliación | Sí · contra confirmación de ejecución del proveedor de liquidez |
| 3.6 | Governance | Sí · aprobación de quotes que excedan el límite del trader |
| 3.7 | Documentación y Notificación | Sí · confirmación de trade aceptado; ticket de operación; comprobante de liquidación |
| 4.4 | Exposición | Sí · posiciones abiertas tienen exposición al mercado hasta liquidarse |
| 4.5 | Vencimientos | Parcial · solo aplica a instrumentos a plazo |

---

## 7. Relación con el resto del framework

Este marco no opera en el vacío. Cada respuesta del cuestionario se cruza con el resto del framework:

| Pregunta | Frameworks que validan / habilitan |
| --- | --- |
| 3.3 Imputación — Estructura | `marco-legal.md` — qué entidad puede ejecutar qué tipo de transacción |
| 3.4 Registro contable | `marco-contable.md` — plan de cuentas, asientos por evento, intercompany |
| 3.5 Conciliación | `marco-operativo.md` — frecuencia, responsable, separación operativa-contable |
| 3.6 Governance | `principios-valores.md` — separación de responsabilidades; "lo que no está escrito no existe" |
| 3.7 Documentación y Notificación | `marco-legal.md` — factura como acto fiscal con efectos legales · `marco-operativo.md` — canales de envío, SLAs, gestión de excepciones |
| 3.8 Cierre | `marco-contable.md` — normas contables aplicables por entidad |
| 4.x Análisis | `financial-core-modules.md` — módulos genéricos: Reportes para entregables formales |

Si una respuesta del cuestionario contradice el marco legal, contable u operativo, el módulo no es viable en su forma actual y debe revisarse antes de avanzar.

---

## 8. Pendientes y zonas a evolucionar

| # | Pendiente | Cuándo se aborda |
|---|---|---|
| F-01 | Caja Chica como módulo, sub-módulo de Disponibilidades, o fuera de scope | Cuando se aborde formalmente el discovery de Caja Chica |
| F-02 | Intercompany como módulo separado o sub-tipo dentro de Cobros / Pagos | Cuando se aborde formalmente el discovery de Cobros y Pagos |
| F-03 | Si las dimensiones Flujo proyectado y Rentabilidad / Resultado deben incorporarse formalmente o quedan cubiertas por reportes existentes (P&L, Revenue) | Cuando madure la práctica de cash flow forecasting interna |
| F-04 | Si Valuación y Devengamiento deben incorporarse como acciones formales del plano operativo | Cuando se aborde el discovery del primer módulo donde aplica (Inversiones, Deudas o Monedas) |
| F-05 | Firma electrónica como sub-tipo de Documentación y Notificación o como dimensión propia | Cuando se aborde el primer módulo que requiera firmas formales (Deudas, contratos de cliente) |

---

## 9. Relación con el mecanismo de Acciones

Cada respuesta Sí del cuestionario se vuelve una **candidata a Acción** del menú `⋯` del registro (mecanismo transversal de Acciones — `financial-core-modules.md` §11). El catálogo de Acciones del módulo se deriva directamente del cuestionario aplicado, no se inventa por separado.

**Mapeo cuestionario → Acciones:**

| Pregunta | Acciones derivadas |
|---|---|
| 3.3 Imputación | "Imputar a Cliente" · "Imputar a Proveedor" · "Imputar a Partner" · "Imputar a Cuenta Contable" · "Asignar Estructura" |
| 3.4 Registro contable | "Generar asiento" (cuando es manual) · automatizada (cuando viene de evento del CORE) |
| 3.5 Conciliación | "Marcar Conciliado" · "Asignar Conciliación Manual" · "Conciliar contra extracto" |
| 3.6 Governance | "Aprobar" · "Rechazar" · "Solicitar revisión" |
| 3.7 Documentación y Notificación | "Generar Factura" · "Generar Nota de Crédito / Débito" · "Enviar Notificación" · "Solicitar Firma" · "Reenviar Comprobante" · "Enviar Instrucción de Pago" |
| 3.8 Cierre | "Cerrar Período" · "Cerrar Cuenta Corriente" · "Cerrar Sesión" (rol limitado) |

Cada acción derivada hereda su capability del mecanismo de Acciones (REQ Acciones transversal pendiente — `financial-core-modules.md` §13). Esto significa que el cuestionario de este marco produce directamente el manifest de Acciones del módulo cuando ese REQ se construya.

**Implicación de diseño:** un módulo cuyo discovery responda Sí a las 8 preguntas operativas tendrá un menú de Acciones rico y poblado. Un módulo que responda Sí solo a 2-3 tendrá un menú minimalista. La complejidad del menú es proporcional a la riqueza del lifecycle del registro — y queda derivada, no decidida arbitrariamente.

---

## Changelog

| Versión | Fecha       | Cambios |
| ------- | ----------- | ------- |
| 1.0     | 2026-04-28  | Versión inicial bajo el nombre `marco-dimensiones-finanzas.md`. Formaliza el modelo conceptual de Tesorería como checklist de discovery aplicable a los módulos del bloque Tesorería + Contabilidad de FIN. 12 preguntas en dos planos: operativo (7) y análisis (5). |
| 1.1     | 2026-04-28  | Cambios mayores derivados de iteración: (a) **Generalización de alcance** — el marco se extiende de FIN únicamente a las apps operativas-transaccionales del financial-core (OPS, TRD, FIN). LEX, CLP y COM quedan fuera por su naturaleza distinta. Archivo renombrado a `marco-dimensiones-registros.md`. (b) **Nueva dimensión 3.7 Documentación y Notificación** — captura los outputs formales del registro hacia actores externos (facturar, notificar, enviar, firmar, comunicar). Cierre pasa a 3.8. Total: 13 preguntas (operativo 8 + análisis 5). (c) **Nueva §9 Relación con el mecanismo de Acciones** — articula explícitamente cómo el cuestionario produce directamente el manifest de Acciones del menú `⋯` del registro, alineado con `financial-core-modules.md` §11. (d) **Nuevos ejemplos aplicados** — además del caso completo de Disponibilidades, mini-casos de OPS-Movimientos y TRD-Quotes. (e) **Nuevo F-05** sobre firma electrónica como sub-tipo. |

---

*Este documento es una referencia viva. Se actualiza cuando se identifica una nueva dimensión que la práctica del financial-core consume y el marco no captura, o cuando una pregunta existente se demuestra ambigua en aplicación real.*
