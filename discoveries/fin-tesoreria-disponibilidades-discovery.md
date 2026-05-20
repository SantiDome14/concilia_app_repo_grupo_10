---
name: FIN · Tesorería · Disponibilidades — modelo conceptual del módulo
features: [FIN]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-19
updated_at: 2026-05-20
propagates_to:
  - features/fin/fin-tesoreria-disponibilidades.md
---

# FIN · Tesorería · Disponibilidades — modelo conceptual del módulo

## Objetivo

Definir el modelo conceptual del módulo Disponibilidades dentro del bloque Tesorería de la aplicación FIN, de forma que permita responder a Tesorería y Finanzas las tres preguntas operativas fundamentales:

1. **¿Dónde está el dinero físicamente?** Saldos reales por sociedad, banco, cuenta y moneda, conciliables contra los extractos de cada custodio.
2. **¿Cuánto debe Ardua a clientes en cada moneda?** Total de obligaciones agregado por sociedad y por consolidado del grupo, sin pretender mapearlo a cuentas físicas específicas.
3. **¿Cuánto puede operar Ardua sin tocar fondos de clientes?** Capacidad operativa derivada como residual de la ecuación maestra.

El módulo debe permitir trabajar este modelo sin depender de un Motor Contable formal en su V1, pero dejando la puerta abierta para que V2 lo monte encima sin retrabajos.

## Contexto

La gestión de fondos en Ardua opera hoy con tres planos que se mezclan y se procesan de manera fragmentaria, principalmente en Excel ("La Diaria") y en sistemas auxiliares como Contabilium para Tesorería y Compras. La complejidad nace de un hecho estructural: Ardua no tiene cuentas bancarias 1:1 con sus clientes — opera con cuentas Pool donde los fondos de múltiples clientes se mezclan con fondos propios, y la individualización del saldo de cada cliente vive en un ledger interno.

Esta arquitectura es estándar en custodios de fondos de terceros (EMIs, PSPCPs, exchanges, brokers, neobancos) y se conoce como **omnibus accounting**. Sin embargo, hasta ahora no estaba formalizada como modelo de sistema en Ardua, lo que genera tres problemas operativos:

- **Fricción operativa**: cada vez que aparece un movimiento atípico (un fee, un SWAP, un pendiente de asignar, un movimiento entre cuentas propias, un préstamo intercompany, un aporte de capital), no hay una convención clara sobre quién lo registra, cómo se registra, ni qué impacto tiene en cada ledger.
- **Riesgo de inconsistencia**: la falta de una ecuación de cierre formal entre lo físico y lo contable abre la puerta a que un cliente vea un saldo que no se corresponde con la posición real.
- **Imposibilidad de escalar**: hoy resolver una pregunta de gestión simple ("¿tenemos USDC suficiente para cubrir todos los retiros pendientes?") requiere combinar manualmente información de varios Excels.

El módulo Disponibilidades es la pieza que centraliza la **lente física y la lente económica** sobre los fondos del grupo, y se integra con OPS (que registra los movimientos con cliente) y con el futuro Motor Contable (que registrará los asientos formales).

## Principio fundamental

> **Ardua opera con tres ledgers paralelos —contable, físico, económico— que son matemáticamente consistentes en el agregado por sociedad y por moneda, pero no en el detalle por evento ni por cliente. La ilusión de que "el saldo del cliente está en algún lado físicamente" es una simplificación útil para el cliente pero falsa internamente. El sistema interno debe asumir el desacople como principio y proveer las herramientas para que los tres ledgers se mantengan consistentes en el agregado.**

Este principio tiene cinco consecuencias directas sobre el diseño del módulo:

1. **El saldo del cliente y la disponibilidad física están desacoplados.** El saldo del cliente es un pasivo en el ledger; los fondos físicos que lo respaldan pueden estar en cualquier cuenta o instrumento operable dentro de la sociedad correspondiente, según decisión discrecional de Operaciones.

2. **La pregunta "¿de qué cliente es la plata que está en esta cuenta?" está mal formulada.** El sistema no debe intentar responderla, ni siquiera como vista derivada. Las preguntas correctas son: ¿cuánto hay físicamente? ¿cuánto debe Ardua en cada moneda? ¿cuánta capacidad operativa propia tiene Ardua en cada moneda?

3. **La capacidad de pago se calcula a nivel moneda agregada, no a nivel cuenta.** La métrica operativa que decide si Ardua puede honrar un retiro suma los saldos físicos en banda 1 a través de todas las cuentas en esa moneda dentro de la sociedad correspondiente.

4. **La consistencia del sistema se verifica por la ecuación maestra** (sección siguiente), no por matchear evento a evento ni cliente a cuenta física.

5. **La sociedad es la unidad mínima de adscripción del dinero.** Cada cuenta física pertenece a una sociedad; cada asiento contable pertenece a una sociedad; las obligaciones con clientes son una cuenta contable agregada por sociedad y por moneda. La ecuación maestra cuadra a nivel sociedad-moneda y a nivel consolidado-moneda — nunca a nivel cuenta-cliente, porque esa pregunta es inválida.

### Por qué el desglose Propio vs Cliente por cuenta NO es una vista válida

Una intuición frecuente es pensar que cada cuenta física debería poder descomponerse en "porción propia de Ardua" + "porción del cliente X" + "porción del cliente Y". Esta intuición es **falsa por diseño** del modelo omnibus, no una limitación a resolver:

- **No hay segregación física**: en una cuenta pool (COINAG CVU, BITGO Pool), el dinero es fungible. No existen "los pesos de tecno-sa" — existen pesos, y existe una obligación contable que dice cuánto le debemos a tecno-sa.
- **La asignación sería arbitraria**: cualquier regla (FIFO, prorrateo por obligación, por orden de depósito) produciría números coherentes internamente pero **sin correspondencia con ningún hecho económico**. Sería contabilidad imaginaria.
- **Reintroduce la ilusión que el modelo rechaza**: mostrar "Cliente: 600M / Propio: 245M" en una cuenta sugiere al usuario que esos 600M están "ahí" para esos clientes específicos. No lo están. Están ahí para honrar el agregado de obligaciones del grupo en esa moneda.
- **Auditabilidad**: ningún custodio externo, contador, ni regulador validaría una asignación cliente-cuenta que no surge de un hecho económico verificable.

El módulo expresa correctamente esta separación: muestra **saldo físico por cuenta** (un solo número, sin desglose) y **obligaciones por cliente y por moneda** (en otra superficie, agregado por sociedad). La conciliación entre las dos vistas se hace en el agregado, no en el detalle.

## Las tres perspectivas del sistema

Cada evento real impacta de forma distinta a tres áreas. El módulo Disponibilidades debe servir simultáneamente a estas tres lecturas, sin confundirlas.

| Perspectiva | Eje primario | Responsabilidad | Cadencia |
|---|---|---|---|
| **Operaciones** | Cliente × Moneda | Imputar al cliente, mantener su saldo (= el pasivo de Ardua hacia él) | Real-time / continua |
| **Tesorería** | Sociedad × Banco/Estructura × Cuenta × Moneda | Conocer el saldo real físico, conciliar contra extractos, calcular disponibilidad | Diaria típica |
| **Contabilidad** | Sociedad × Cuenta contable (activo, pasivo, técnica, ingreso, egreso) | Registrar la ecuación contable de cada evento como partida doble dentro del libro de cada sociedad | Continua o por lote |

El dato fuente es el mismo evento físico-económico en el mundo. Lo que cambia es la **proyección**: Operaciones lo proyecta sobre el cliente, Tesorería sobre la cuenta física, Contabilidad sobre el plan de cuentas de cada sociedad afectada.

### Quién registra qué

| Tipo de movimiento | ¿Toca al cliente? | Origen del registro |
|---|---|---|
| Depósito de cliente | Sí | **Operaciones** |
| Retiro de cliente | Sí | **Operaciones** |
| Fee a cliente | Sí (cliente) / No (banco) | **Operaciones** |
| SWAP de cliente | Sí | **Operaciones** |
| Pendiente de asignar | Eventualmente sí | **Operaciones** (a cuenta técnica) |
| Asignación de pendiente | Sí | **Operaciones** |
| Ajuste de Crédito (corrección a favor del cliente) | Sí | **Operaciones** |
| Ajuste de Débito (corrección a favor de Ardua) | Sí | **Operaciones** |
| Movimiento entre cuentas propias (misma sociedad) | No | **Tesorería** |
| Préstamo intercompany (entre sociedades del grupo) | No | **Tesorería** |
| Sweeping cross-sociedad (entre sociedades del grupo) | No | **Tesorería** (modelado como intercompany) |
| Comisión bancaria de plataforma | No | **Tesorería** |
| Interés bancario recibido | No | **Tesorería** |
| Pago a proveedor | No | **Tesorería** (Finanzas) |
| Pago de salarios | No | **Tesorería** (Finanzas) |
| **Aporte de capital propio** | **No** | **Tesorería (Finanzas)** |
| Fondeo / barrido dentro de una sociedad | No | **Tesorería** |
| Ajuste manual (válvula de escape) | Depende | Operaciones o Tesorería según naturaleza |

**Tesorería ve todo aunque no registre todo.** Su ledger consolidado es la suma de lo que registra Operaciones más lo que registra ella misma. Esa visión completa es la única superficie desde la que se puede conciliar contra el extracto bancario.

## La ecuación maestra

La condición de consistencia del sistema, válida en todo momento `T` para toda moneda `M` y para cada sociedad o el consolidado del grupo:

```
Σ saldos físicos en M en todas las cuentas de Ardua
=
Σ obligaciones con clientes en M
+ Σ pendientes de asignación en M
+ Σ capacidad operativa propia en M
```

Donde **Capacidad operativa = Físico − Obligaciones − Pendientes**, calculada por moneda. Es la métrica residual que responde la pregunta #3 del Objetivo del módulo: cuánto puede operar Ardua sin tocar fondos de clientes.

Esta ecuación es el contrato único que asegura que el sistema es internamente consistente. Si cuadra en cada moneda al cierre de cada operación, el sistema es válido — **independientemente de en qué cuenta esté cada peso, dólar o stablecoin**. Cualquier desvío material es un **break** que requiere workflow de investigación.

### Equivalencia con la ecuación contable formal

La ecuación maestra del módulo (Físico = Obligaciones + Pendientes + CapOp) y la ecuación contable formal (Activo = Pasivo + Patrimonio) son **equivalentes** cuando se reconoce que la Capacidad Operativa es la magnitud monetaria que en la contabilidad formal se llama **Patrimonio operativo**. El módulo trabaja con CapOp porque es más operativa (se calcula como residual y responde directamente la pregunta de capacidad de pago); el panel de Contabilidad refleja la misma magnitud como un saldo positivo en el grupo de cuentas Patrimonio operativo. Ambas representaciones cuadran simultáneamente desde T0, porque al cargar el sistema con saldos iniciales se carga también el saldo inicial de Patrimonio operativo = CapOp inicial calculada.

### Capacidad Operativa y Resultado del período no son equivalentes a nivel sociedad

A nivel **consolidado del grupo**, la variación de Capacidad Operativa entre dos puntos en el tiempo es igual a la variación de Resultado del período (Ingresos − Egresos) más los aportes de capital propio, porque las cuentas técnicas (Puente FX, Intercompany) se cancelan entre sí.

A nivel **sociedad individual**, esa equivalencia se rompe. La diferencia se explica por movimientos en cuentas técnicas no resultativas y por aportes de capital:

```
ΔCapacidad Operativa (sociedad) =
    ΔIngresos − ΔEgresos
  + ΔAportes de capital
  + ΔCta Intercompany neta (sociedad)
  + ΔPuente FX residual (sociedad)
```

Cuando Circuit Pay presta 100K USDC a Ardua Solutions Corp, CP pierde Capacidad Operativa sin haber tenido ningún Egreso (registra una cuenta a cobrar intercompany), y ASC gana Capacidad Operativa sin haber tenido ningún Ingreso (registra una cuenta a pagar intercompany). Cuando Ardua aporta capital propio a ASC, la Capacidad Operativa de ASC sube sin que haya habido Ingresos — la contrapartida es Patrimonio operativo. Los aportes de capital son la única fuente exógena de cambio de CapOp consolidada además del Resultado.

## Modelo de movimientos · doble entrada con extensión operativa

Cada movimiento del sistema es un **asiento contable de doble entrada adscripto a una sociedad** con una posible extensión sobre el plano físico:

- **Plano contable** (siempre presente): Db = Cr sobre cuentas contables, dentro del libro de una sociedad específica.
- **Plano físico** (opcional según tipo): aparece cuando una o ambas entradas del asiento son sobre cuentas de Disponibilidades, y representa el movimiento real de fondos en el banco o custodio.

Esto resuelve el problema de modelo de datos que tenía la implementación previa, donde Banco y Cliente se trataban como dos campos obligatorios del mismo nivel. En el modelo correcto:

| Plano | Pregunta que contesta | Cuándo aplica |
|---|---|---|
| Físico (Banco/Cuenta) | ¿De qué cuenta entró o salió la plata? | Cuando hubo flujo de fondos |
| Contable (Cliente / Resultado / Pendiente / Intercompany / Puente FX / Patrimonio) | ¿Sobre qué etiqueta contable impacta dentro del libro de qué sociedad? | Siempre |

El **cliente** no es un campo independiente del movimiento — es una propiedad embebida en la cuenta contable de Obligaciones (`Obligaciones con clientes — Cliente Y USDC` ya lleva al cliente embebido). La **sociedad** es un atributo top-level del asiento contable que lo adscribe a un libro específico.

### Cada asiento pertenece a una sola sociedad

Cuando un evento operativo afecta a dos sociedades (préstamo intercompany, sweeping cross-sociedad), no se genera un único asiento "con dos líneas espejo". Se generan **dos asientos formalmente independientes**, uno en el libro contable de cada sociedad afectada, relacionados únicamente por la referencia al mismo evento operativo. Esto permite:

- Filtrar el libro contable por sociedad sin combinaciones complejas.
- Que cada sociedad cumpla con sus obligaciones regulatorias y contables de forma independiente.
- Auditar por separado los libros de cada entidad legal, como corresponde a sociedades con balance propio.

## Matriz de tipos de movimiento

Esta matriz es el **contrato cerrado del sistema** entre Operaciones, Tesorería y Contabilidad. Cualquier evento real debe encajar en una fila — si no encaja, falta tipificar el evento. La columna "Asientos" indica cuántos asientos contables se generan y en qué sociedades.

| Tipo | Banco origen | Banco destino | Cliente | Plano físico | Asientos | Plano contable |
|---|---|---|---|---|---|---|
| Depósito | — | Sí | Sí | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Oblig cliente |
| Retiro | Sí | — | Sí | Egreso | 1 (soc. cuenta) | Db Oblig cliente · Cr Disp |
| Fee | — | — | Sí | — | 1 (soc. del saldo) | Db Oblig cliente · Cr Ingresos fees |
| Rebate | — | — | Sí | — | 1 (soc. del saldo) | Db Gastos rebates · Cr Oblig cliente |
| SWAP_OUT (cliente) | — | — | Sí | — | 1 (soc. ejecutora) | Db Oblig cliente M1 · Cr Cuenta puente FX |
| SWAP_IN (cliente) | — | — | Sí | — | 1 (soc. ejecutora) | Db Cuenta puente FX · Cr Oblig cliente M2 |
| SPREAD (SWAP) | — | — | — | — | 1 (soc. ejecutora) | Db Cuenta puente FX · Cr Ingresos por spread |
| Solicitud de retiro (PENDING) | — | — | Sí | — | 0 | — (solo reserva, sin asiento) |
| Pendiente de asignar | — | Sí | NO IDENT. | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Pendientes asignación |
| Asignación de pendiente | — | — | Sí | — | 1 (soc. cuenta original) | Db Pendientes asignación · Cr Oblig cliente |
| Ajuste de Crédito | — | — | Sí | — | 1 (soc. del saldo) | Db Ingresos o Egresos · Cr Oblig cliente |
| Ajuste de Débito | — | — | Sí | — | 1 (soc. del saldo) | Db Oblig cliente · Cr Ingresos o Egresos |
| Movimiento entre cuentas propias (misma sociedad) | Sí | Sí | — | Reubicación | 1 (soc. única) | Db Disp destino · Cr Disp origen |
| **Préstamo intercompany** | Sí | Sí | — | Reubicación entre sociedades | **2 (uno por sociedad)** | En sociedad origen: Db Cta a cobrar IC · Cr Disp. En sociedad destino: Db Disp · Cr Cta a pagar IC |
| **Sweeping cross-sociedad** | Sí | Sí | — | Reubicación entre sociedades | **2 (uno por sociedad)** | Mismo tratamiento que préstamo intercompany |
| Comisión bancaria | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos bancarios · Cr Disp |
| Interés bancario | — | Sí | — | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Ingresos financieros |
| Pago a proveedor | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos [categoría] · Cr Disp |
| Pago de salarios | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos sueldos · Cr Disp |
| **Aporte de capital propio** | **—** | **Sí** | **—** | **Ingreso** | **1 (soc. cuenta)** | **Db Disp · Cr Patrimonio operativo (Aportes de Ardua)** |
| Ajuste manual | Depende | Depende | Depende | Depende | Configurable | Configurable con justificación obligatoria |

### Movimiento entre cuentas propias vs préstamo intercompany

Aunque operativamente parezcan similares (mover plata de una cuenta a otra), son **conceptualmente distintos**:

- **Movimiento entre cuentas propias** ocurre dentro de **una sola sociedad** (REVOLUT → KRAKEN dentro de Astra Ventures, por ejemplo). Genera **un solo asiento** en el libro de esa sociedad. No hay impacto en otros balances.
- **Préstamo intercompany** y **sweeping cross-sociedad** ocurren entre **sociedades distintas** del grupo (Circuit Pay → Ardua Solutions Corp). Aunque la decisión la tome "Ardua" como grupo, las sociedades son entidades legales separadas con balance propio. Generan **dos asientos**, uno por sociedad, que reflejan la cuenta a cobrar / a pagar intercompany respectivamente.

La distinción no es de tamaño ni de intencionalidad — es estructural. Toda transferencia entre cuentas de sociedades distintas, aunque sea operativa-de-tesorería sin involucrar clientes, sigue siendo intercompany y se modela como tal.

### Aporte de capital propio vs préstamo intercompany

Ambos son fuentes de fondeo de Ardua a una de sus sociedades, pero son **conceptualmente distintos**:

- **Préstamo intercompany** ocurre **entre dos sociedades del grupo**: el fondeo viene de otra sociedad ya constituida, y la sociedad receptora tiene que devolverlo (es un pasivo intercompany). Es plata que ya existía dentro del consolidado del grupo — se reubica, no se crea.
- **Aporte de capital propio** ocurre cuando **entra dinero al grupo desde afuera** (socios, capital social, aportes irrevocables). No hay sociedad origen dentro del grupo; el fondeo viene de los accionistas o de fuentes externas. Es plata que no existía en el consolidado del grupo y que ahora forma parte de él.

A nivel consolidado, los préstamos intercompany se cancelan (la Cta a cobrar de una sociedad neteea con la Cta a pagar de la otra) y no cambian la Capacidad Operativa del grupo. **Los aportes de capital propio sí cambian la Capacidad Operativa del consolidado** — son la única vía exógena de aumentarla además del Resultado del período.

### Ajustes de Crédito y Débito (corrección de errores)

Los Ajustes de Crédito y Débito son la **válvula de corrección canónica** del sistema. Operaciones nunca edita ni elimina un movimiento previo (principio de inmutabilidad, anclaje #14). Cuando se detecta un error en un movimiento previo, se registra un movimiento compensatorio del tipo correspondiente:

- **Ajuste de Crédito** (a favor del cliente): cuando descubrimos que cobramos un fee de más, le aplicamos un cargo incorrecto, o le debemos algo al cliente por una corrección. La obligación con el cliente sube; los ingresos bajan (corrección de un ingreso registrado mal) o los egresos suben (reconocimiento de un gasto que no se había registrado).
- **Ajuste de Débito** (a favor de Ardua): cuando descubrimos que olvidamos cobrar un fee, le aplicamos un crédito incorrecto, o nos debe algo el cliente por una corrección. La obligación con el cliente baja; los ingresos suben (reconocimiento de un ingreso que no se había registrado) o los egresos bajan (corrección de un egreso registrado mal).

Ambos tipos pueden tocar cuentas de Ingresos o Egresos según la naturaleza del error que corrigen. La trazabilidad se mantiene porque el movimiento de ajuste referencia al movimiento original que corrige. El asiento de ajuste se registra en la **misma sociedad** que el movimiento original que está corrigiendo.

## Simulación de referencia

El modelo se validó con una simulación canónica de 16 eventos (T0 a T15) sobre un setup de cuatro sociedades (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures), ocho cuentas activas en tres monedas (ARS, USDC, EURC) y seis clientes con obligaciones multimoneda.

Los saldos iniciales en T0 simulan la **carga inicial del sistema** (la realidad operativa de Ardua en el momento de su puesta en marcha). Esto incluye saldos iniciales en las tres cuentas con saldo de apertura: Disponibilidades, Obligaciones con clientes y **Patrimonio operativo** (= Capacidad Operativa inicial calculada). La ecuación maestra y el balance contable cuadran simultáneamente desde T0.

Los saldos iniciales fueron dimensionados para que la **Capacidad Operativa sea positiva en las tres monedas en T0** (entre 6% y 8% del físico), reflejando una situación operativa realista para una fintech con omnibus accounting.

| T | Evento | Plano físico | Asientos | Registra |
|---|---|---|---|---|
| T0 | Estado inicial con saldos de apertura (4 sociedades · 8 cuentas · 6 clientes) | — | — | — |
| T1 | Depósito 18.500.000 ARS a CBU COINAG | ✓ | 1 (HP) | Operaciones |
| T2 | Fee 12.500 ARS a cli-tecno-sa | — | 1 (HP) | Operaciones |
| T3 | SWAP 100.000 USDC → 91.500 EURC + spread 500 | — | 3 (CP) | Operaciones |
| T4 | Solicitud retiro 9.200.000 ARS (PENDING) | — | 0 | Operaciones |
| T5 | Ejecución del retiro desde COINAG CBU | ✓ | 1 (HP) | Operaciones |
| T6 | Pendiente: llegan 250.000 USDC a BITGO Pool | ✓ | 1 (CP) | Operaciones |
| T7 | Asignación: 250.000 USDC son de cli-flynet-llc | — | 1 (CP) | Operaciones |
| T8 | Movimiento 200.000 EURC entre REVOLUT y KRAKEN (AV) | ✓ | 1 (AV) | Tesorería |
| T9 | Sweeping cross-sociedad: 500.000 USDC de CP a ASC | ✓ | 2 (CP + ASC) | Tesorería |
| T10 | Préstamo intercompany: CP presta 100.000 USDC a ASC | ✓ | 2 (CP + ASC) | Tesorería |
| T11 | Ajuste de Crédito: devolución 2.500 ARS a cli-tecno-sa | — | 1 (HP) | Operaciones |
| T12 | Ajuste de Débito: cobro 800 EURC a cli-flynet-llc | — | 1 (AV) | Operaciones |
| T13 | Pago a proveedor: 4.500.000 ARS desde BRUBANK (HP) | ✓ | 1 (HP) | Tesorería (Finanzas) |
| T14 | Pago de salarios: 85.000 USDC desde COINBASE (ASC) | ✓ | 1 (ASC) | Tesorería (Finanzas) |
| **T15** | **Aporte de capital propio: Ardua inyecta 500.000 USDC a COINBASE (ASC)** | **✓** | **1 (ASC)** | **Tesorería (Finanzas)** |

**Resultado clave de la simulación:** la ecuación maestra y el balance contable formal cuadran en las tres monedas en cada uno de los dieciséis estados, tanto a nivel consolidado como a nivel sociedad. La simulación valida:

- **Anclaje #36**: a nivel grupo consolidado, Capacidad Operativa y Resultado del período se mueven de la misma manera (salvo aportes de capital); a nivel sociedad individual, divergen por el saldo de las cuentas técnicas (Intercompany, Puente FX) y por aportes recibidos.
- **Anclaje #37**: cada asiento contable está adscripto a una sola sociedad — los eventos cross-sociedad (T9, T10) generan dos asientos independientes, no un asiento espejo.
- **Anclaje #38**: ni siquiera lógicamente se intenta atribuir fondos físicos a clientes individuales — la única adscripción válida es a sociedad.
- **Inmutabilidad operativa**: los ajustes (T11, T12) corrigen errores sin tocar los movimientos originales (T2). El libro contable refleja la corrección como asientos nuevos, no como ediciones.
- **Aporte de capital exógeno**: T15 muestra cómo entra dinero al grupo desde afuera (socios, capital social) sin generar obligaciones con clientes, aumentando la Capacidad Operativa consolidada por el monto del aporte.

La simulación se materializó en un **artefacto de validación del modelo conceptual** (`fin-tesoreria-disponibilidades.html`) que muestra para cada evento las tres perspectivas y la posición consolidada en tiempo real, con deltas explícitos por columna y fila afectadas, y colapsibles por sociedad en la lente de Tesorería. Este artefacto **no es el prototipo del módulo** — el prototipo formal vive en `prototypes/fin/` como proyecto frontend independiente. El artefacto sirve únicamente como soporte visual para validar el comportamiento del modelo con los stakeholders y queda como referencia conceptual congelada del discovery.

## Anclajes del modelo

Estos son los 38 anclajes acumulados durante la discovery, ordenados por dimensión.

### Principios fundamentales

1. Tres flujos / tres ejes / un evento único — Operaciones (cliente-céntrica), Tesorería (cuenta-céntrica), Contabilidad (cuenta contable-céntrica por sociedad).
2. Disponibilidad = saldo físico − pasivos, no es segregación física entre cuentas.
3. El ledger contable y el ledger físico son sistemas independientes que se cruzan sólo en la conciliación agregada por sociedad-moneda.
4. Saldo del cliente y disponibilidad física están desacoplados — el saldo es un pasivo, los fondos están donde Operaciones decide dentro de la sociedad correspondiente.
5. Capacidad de pago es un cálculo global por moneda, no por cuenta ni por cliente.

### Modelo operativo

6. Triple imputación por movimiento — Banco / Cliente / Contrapartida contable; la tercera es la que cierra la partida.
7. Templates contables por tipo de movimiento como contrato entre Operaciones y Contabilidad.
8. Toda transacción física exige imputación inmediata en el ledger (al menos a cuenta técnica).
9. Suspense accounts para pendientes de asignación, con SLA explícito.
10. Solicitud de retiro como evento de dos fases (PENDING reserva capacidad, EXECUTED la consume).

### Modelo de datos

11. Tipo de movimiento descompuesto en dos dimensiones — naturaleza contable × naturaleza física.
12. Matriz de tipos como contrato cerrado del sistema.
13. Cliente no es un campo del movimiento sino una propiedad embebida en la cuenta contable de Obligaciones.
14. Movimientos inmutables; los errores se corrigen con compensación (Ajuste de Crédito o Ajuste de Débito), no con edición.

### Modelo de control

15. Ecuación maestra de consistencia por sociedad-moneda y por consolidado-moneda como contrato único.
16. Conciliación agregada por moneda y sociedad como unidad primaria, no por cuenta ni por cliente.
17. Breaks con workflow propio — se documentan, se asignan, no se ocultan.
18. Sweeping del patrimonio operable de Ardua a cuentas operativas cuando supera umbral en pools mixtas (dentro de una misma sociedad).

### Modelo de movimientos

19. Tesorería dueña del ledger consolidado por cuenta — recibe asientos de Operaciones (cuando hay cliente) y registra directamente lo que Operaciones no toca.
20. Movimientos entre cuentas propias capeados por capacidad operativa disponible — un movimiento no puede empujar la capacidad operativa de la cuenta origen por debajo de cero.
21. Pendientes de asignar son pasivos a efectos de capacidad de pago — se tratan conservadoramente como deuda hasta su resolución.
22. El SWAP es contablemente tres eventos atómicos (SWAP_OUT, SWAP_IN, SPREAD) y físicamente cero — necesita mecanismo de cruce multimoneda en los asientos (cuenta puente o referencia de TC).
23. Las cuentas de resultado (Ingresos / Gastos) son indicadores analíticos, no son origen de fondos — no se "gasta contra Fees", se gasta desde una cuenta de Disponibilidades registrando la naturaleza del egreso.
24. El patrimonio operable de Ardua es plenamente operable dentro de la restricción de la ecuación maestra.
25. Las cuentas de Disponibilidades son las únicas con realidad física — todas las demás cuentas contables (Ingresos, Gastos, Obligaciones, Pendientes, Puente FX, Intercompany, Patrimonio operativo) son etiquetas analíticas sobre el mismo dinero.
26. El fee es un movimiento operativo en Operaciones (registrado como cualquier otro evento) que no tiene plano físico — distinguir "movimiento" (cualquier evento registrado) de "flujo de fondos" (movimiento con plano físico).

### Módulo Disponibilidades

27. Dos lentes que cohabitan — física (conciliación, fuente de verdad sobre lo real) y económica (capacidad de pago, base de decisión operativa).
28. Cuatro vistas mínimas — Posición por cuenta · Posición consolidada por moneda · Movimientos del ledger · Conciliación.
29. Posición principal con cuatro columnas por moneda — Físico, Obligaciones, Pendientes, Capacidad Operativa (residual).
30. Capacidad Operativa como métrica nativa del módulo, derivada como residual de la ecuación maestra. Responde la pregunta del Objetivo: "¿cuánto puede operar Ardua sin tocar fondos de clientes?". Es equivalente al saldo del grupo contable Patrimonio operativo — las dos representaciones cuadran simultáneamente en todo momento.
31. Sociedad como eje primario de navegación, no solo filtro — cada Sociedad tiene su propia ecuación maestra por moneda además del consolidado del grupo.

### Contabilidad

35. La lente contable trabaja sobre **8 grupos de cuentas**: Disponibilidades (Activo), Obligaciones con clientes (Pasivo), Pendientes de asignación (Pasivo), Puente FX (Técnica multimoneda), Intercompany (Técnica entre sociedades), **Patrimonio operativo (Pasivo / Patrimonio, captura aportes y residual operativo de Ardua)**, Ingresos, Egresos. Estos 8 grupos son la unidad mínima visible en el panel de Contabilidad del módulo; el Motor Contable de V2 podrá refinarlos en cuentas individuales con jerarquía completa, incluyendo el desglose del Patrimonio operativo en Capital social, Reservas, Aportes irrevocables y Resultados Acumulados.

36. **Capacidad Operativa y Resultado del período son equivalentes solo en el consolidado del grupo, modulo aportes de capital.** A nivel sociedad individual, su diferencia se explica por movimientos en cuentas técnicas no resultativas (Intercompany, Puente FX residual) y por aportes recibidos. Esta distinción justifica modelar las cuentas técnicas como cuentas contables formales y no como métricas derivadas. La fórmula completa es: ΔCapacidad Operativa (sociedad) = ΔIngresos − ΔEgresos + ΔAportes de capital + ΔIntercompany neto + ΔPuente FX residual. En el consolidado, Intercompany y Puente FX se cancelan; los aportes de capital son la única fuente exógena de cambio del consolidado además del Resultado.

37. **Cada asiento contable está adscripto a una sola sociedad.** Cuando un evento operativo afecta a dos sociedades (préstamo intercompany, sweeping cross-sociedad), se generan dos asientos formalmente independientes, uno en el libro contable de cada sociedad, relacionados únicamente por la referencia al mismo evento operativo. Esto permite filtrar el libro contable por sociedad sin combinaciones complejas, permite que cada sociedad cumpla con sus obligaciones regulatorias y contables de forma independiente, y refleja correctamente que las sociedades son entidades legales separadas con balance propio. La adscripción del asiento a sociedad se determina así: (a) si el movimiento tiene plano físico, la sociedad es la de la cuenta de Disponibilidades involucrada; (b) si no tiene plano físico (SWAPs, fees, ajustes), la sociedad es la que ejecuta operativamente el movimiento (decisión #13).

38. **Los fondos físicos NO se asocian a clientes individualmente, ni siquiera lógicamente.** Buscar "qué fondos físicos respaldan a tal cliente" o "qué porción de esta cuenta es propia vs cliente" son preguntas mal formuladas que reintroducen la ilusión de respaldo individual que el modelo omnibus rechaza por diseño. La única adscripción válida es: (a) fondos físicos pertenecen a una cuenta y la cuenta a una sociedad (anclaje #37), (b) obligaciones con clientes son una cuenta contable agregada por sociedad y moneda, (c) la ecuación maestra cuadra a nivel sociedad-moneda y consolidado-moneda, no a nivel cuenta-cliente. Cualquier intento de desglosar el saldo físico de una cuenta en "porción propia" + "porción cliente X" + "porción cliente Y" generaría números coherentes internamente pero sin correspondencia con ningún hecho económico — sería contabilidad imaginaria, no auditable. El módulo expresa correctamente esta separación: saldo físico por cuenta es un solo número, obligaciones por cliente se muestran en otra superficie agregada por sociedad, y la conciliación entre ambas se hace en el agregado.

### Scope V1 vs V2

32. V1 entrega Posición consolidada sin Motor Contable — el modelo se sostiene porque cada movimiento lleva embebida su clasificación contable a través del tipo, y cada asiento lleva embebida su sociedad.
33. Tres piezas obligatorias en V1 para que el modelo no quede coja sin Motor Contable — tipo "Ajuste manual" con justificación, vista de Libro de Movimientos como reporte cronológico filtrable por sociedad y por moneda, inmutabilidad con corrección vía Ajuste de Crédito o Débito.
34. V2 = Motor Contable se monta encima sin retrabajo — lee los movimientos existentes incluyendo los aportes registrados en V1 en la cuenta técnica Patrimonio operativo, y los traduce a asientos formales con plan de cuentas patrimonial completo (Capital social, Reservas, Aportes irrevocables, Resultados Acumulados), preservando la adscripción a sociedad. Los movimientos no se recargan, se traducen. V1 trabaja con Patrimonio operativo como una sola cuenta técnica agregada con saldo de apertura cargado en T0 igual a la Capacidad Operativa inicial; V2 descompone ese saldo en los subtipos formales según la realidad histórica de cada sociedad.

## Scope V1 vs V2

### V1 — entregable sin Motor Contable

| Funcionalidad | Estado |
|---|---|
| Catálogo de cuentas (Sociedad × Banco × Cuenta × Moneda) | Obligatorio |
| Tipificación completa de movimientos según matriz (incluye Ajustes, Préstamo Intercompany, Sweeping cross-sociedad, Aporte de capital propio) | Obligatorio |
| Asientos contables adscriptos a sociedad (cada asiento pertenece a una sola sociedad) | Obligatorio |
| Registro de movimientos por Operaciones | Obligatorio |
| Registro de movimientos por Tesorería | Obligatorio |
| Carga de saldos de apertura para Disponibilidades, Obligaciones y Patrimonio operativo | Obligatorio |
| Posición por cuenta agrupada por sociedad (collapsible) | Obligatorio |
| Posición consolidada por moneda con Capacidad Operativa derivada | Obligatorio |
| Obligaciones por cliente × moneda (sin atribución a cuenta física) | Obligatorio |
| Saldos por grupo de cuenta contable (8 grupos), filtrable por sociedad | Obligatorio |
| Cta Intercompany como cuenta técnica con saldos por par de sociedades | Obligatorio |
| Cta Patrimonio operativo como cuenta técnica agregada (sin desglose por subtipos) | Obligatorio |
| Libro de Movimientos (vista cronológica filtrable por sociedad y moneda) | Obligatorio |
| Tipo "Ajuste manual" con justificación textual obligatoria | Obligatorio |
| Inmutabilidad con corrección vía Ajustes de Crédito/Débito | Obligatorio |
| Conciliación contra extracto bancario | Obligatorio |
| Ecuación maestra cuadrando por sociedad además de por consolidado | Obligatorio |
| Balance contable formal cuadrado por sociedad (Activo = Pasivo + Patrimonio) | Obligatorio |
| Alertas (capacidad operativa negativa por sociedad, pendiente > SLA, delta > tolerancia, Intercompany no liquidado > SLA) | Opcional |

### V2 — encima de V1 cuando llegue Motor Contable

| Funcionalidad | Estado |
|---|---|
| Plan de cuentas contable formal con jerarquía completa por sociedad | Diferido a V2 |
| Patrimonio Ardua con desglose formal (Capital social, Reservas, Aportes irrevocables, Resultados Acumulados, Resultado del Ejercicio) por sociedad | Diferido a V2 |
| Libro Diario con asientos formales por sociedad | Diferido a V2 |
| Mayor (mayorización de cuentas) por sociedad | Diferido a V2 |
| P&L formal por período con cierre, por sociedad y consolidado | Diferido a V2 |
| Cierre de ejercicio (transferencia Resultado del período → Resultados Acumulados) | Diferido a V2 |
| Asientos manuales para casos no estándar | Diferido a V2 |
| Multi-currency mark-to-market | Diferido a V2 |

V2 no recarga movimientos — los lee del catálogo existente de V1 y los traduce a asientos formales según los templates contables ya definidos en la matriz de tipos, preservando la adscripción a sociedad que ya viene definida desde V1. El **saldo agregado de Patrimonio operativo** que en V1 vive como una sola cuenta técnica se descompone en V2 en los subtipos patrimoniales formales (Capital social, Reservas, Aportes irrevocables, Resultados Acumulados) según la realidad histórica de cada sociedad.

## Hipótesis abiertas

| ID | Hipótesis | Pendiente de validación con |
|---|---|---|
| H-01 | La matriz de tipos cubre todos los eventos operativos reales sin necesidad de ajuste manual frecuente | Belén Gallo · Juan Cruz Lotz |
| H-02 | El tratamiento contable propuesto para el SWAP (tres asientos con cuenta puente FX en la sociedad ejecutora) es válido bajo el marco contable de cada entidad del grupo | Contador externo |
| H-03 | El SLA para pendientes de asignación (días antes de escalamiento) puede definirse uniformemente o requiere segmentación por moneda / sociedad | Belén Gallo · Juan Cruz Lotz |
| H-04 | El concepto "Tesorería ve todo aunque no registre todo" se sostiene operativamente — Tesorería puede operar con un ledger consolidado que mezcla orígenes de registro | Belén Gallo |
| H-05 | El cliente como atributo embebido en la cuenta contable de Obligaciones es modelable sin explosión combinatoria del plan de cuentas por sociedad | Tecnología |
| H-06 | La ecuación maestra debe cuadrar por sociedad además de por moneda (cada entidad del grupo cuadra por separado, y el consolidado del grupo es la suma) | Belén Gallo · contador externo |
| H-07 | El "Ajuste manual" como válvula de escape en V1 cubre los casos no estándar sin necesidad de extender la matriz de tipos | Belén Gallo · Operaciones |
| ~~H-08~~ | ~~El préstamo intercompany como tipo formal (con asientos cruzados y cuenta técnica Intercompany) cubre los casos reales de movimientos entre sociedades del grupo, o requiere subtipos (préstamo, compra/venta intercompany, aporte de capital)~~ **Cerrada por prototipo (2026-05-20):** V1 usa un tipo único `PRESTAMO_INTERCOMPANY` que materializa el evento como 2 records (uno por sociedad) con `evento_id` compartido. No fueron necesarios subtipos en V1. La diferenciación con compra/venta intercompany se deja a un cambio futuro si la operación real la requiere. | Belén Gallo · contador externo |
| H-09 | El campo CUENTA en movimientos sin flujo físico (fees, SWAPs, asignaciones, ajustes) debe estar explícitamente vacío en el modelo de datos, no derivado | Tecnología |
| ~~H-10~~ | ~~El TAX como tipo de movimiento (observado en el prototipo) requiere modelarse formalmente — naturaleza, registrador y flujo TRD → Tesorería~~ **Cerrada por prototipo (2026-05-20):** TAX no sobrevive como tipo independiente. Los impuestos retenidos / pagos a fisco se modelan como `PAGO_PROVEEDOR` con proveedor = AFIP (o equivalente). TRD no aplica al ledger de Disponibilidades — `origen` es binario `OPS \| FIN`. | Facundo Vasques · Belén Gallo |
| H-11 | Los Ajustes de Crédito y Débito como tipos formales cubren todos los casos de corrección sin necesidad de soportar edición o eliminación de movimientos previos | Belén Gallo · Operaciones · contador externo |
| H-12 | La cuenta Intercompany se modela por par de sociedades × moneda (`Cta a cobrar/pagar — Sociedad X moneda Y`), o requiere granularidad adicional (por préstamo individual, por fecha de vencimiento) | Belén Gallo · contador externo · Tecnología |
| H-13 | El módulo Disponibilidades V1 trabaja con Patrimonio operativo como **una sola cuenta técnica agregada** (sin desglose en subtipos) y con saldo de apertura cargado en T0 igual a la Capacidad Operativa inicial calculada. El balance contable cuadra desde T0. El desglose patrimonial formal (Capital social, Reservas, Aportes irrevocables, Resultados Acumulados) y el cierre de ejercicio se introducen solo cuando llegue el Motor Contable V2 | Belén Gallo · contador externo |
| H-14 | Para movimientos sin cuenta física (SWAPs, fees, ajustes), la sociedad del asiento se determina por la sociedad ejecutora del movimiento (típicamente Circuit Pay para SWAPs ejecutados por Trading Desk), no por la sociedad donde el cliente "tiene" más saldo. Validar si esta convención no genera distorsiones en los balances individuales | Belén Gallo · contador externo |
| ~~H-15~~ | ~~El sweeping cross-sociedad se modela como mini-intercompany (2 asientos) en lugar de como movimiento entre cuentas propias (1 asiento), para preservar la independencia contable de cada sociedad. Validar si Tesorería opera mentalmente con esta distinción o si la trata como una sola operación a nivel grupo~~ **Cerrada por prototipo (2026-05-20):** adoptado el modelo de 2 records (uno por sociedad) con `evento_id` compartido — mismo tratamiento que `PRESTAMO_INTERCOMPANY`. La distinción de naturaleza queda en el tipo (`SWEEPING_CROSS_SOCIEDAD` vs `PRESTAMO_INTERCOMPANY`), no en la estructura del asiento. Validar con Tesorería que esta lectura es operativa. | Belén Gallo · Juan Cruz Lotz |
| **H-16** | **El aporte de capital propio se modela como Db Disp · Cr Patrimonio operativo (cuenta técnica agregada sin subtipos en V1). Validar con contador externo si esta cuenta debe tener subtipos desde V1 (Capital social, Reservas, Aportes irrevocables) o si V2 los introduce y V1 solo registra el agregado** | **Belén Gallo · contador externo** |
| **H-17** | **El enum cerrado de 15 rails canónicos (`WIRE / VCURRENCY USDT / VCURRENCY USDC / VCURRENCY / SWIFT / SPEI / SPE / SEPA / PIX / INTERNAL / FX / FEDWIRE / Faster Payments / ARDUA / ACH`) cubre todos los flujos reales en producción. Validar con Operaciones que no falta ningún rail material — si aparece uno nuevo, su incorporación requiere un cambio formal del modelo** | **Belén Gallo · Operaciones** |
| **H-18** | **La supervisión de cargas manuales (dual control creador ≠ supervisor) fue diferida fuera de V1 para que el área valide los flujos primero con carga directa. Validar con Tesorería + Compliance la urgencia de la reintroducción — si es regulatoriamente exigible debe entrar en V1.1; si es buena práctica operativa puede esperar a V2. Decidir las capabilities involucradas (`cargar_con_supervision`, `supervisar_carga`) y los tipos que la requieren** | **Belén Gallo · Compliance · Tesorería** |

## Decisiones pendientes

| # | Decisión | Owner | Bloqueo |
|---|---|---|---|
| 1 | Política de respaldo (backing policy) — qué porcentaje de obligaciones por moneda debe estar en banda 1 de liquidez | Belén Gallo · CEO | Regulatorio por entidad |
| 2 | SLA de pendientes de asignación y workflow de escalamiento | Belén Gallo · Operaciones | — |
| 3 | Tolerancias de break por moneda y por sociedad en la conciliación diaria | Belén Gallo · contador externo | — |
| 4 | Umbral de sweeping por cuenta-moneda dentro de una sociedad (cuándo barrer capacidad operativa a cuenta operativa) | Belén Gallo · Operaciones | — |
| 5 | Tratamiento contable del SWAP multimoneda (cuenta puente FX vs revalúo a TC de mercado vs otro) | Contador externo | — |
| 6 | Reglas de inmutabilidad y workflow de Ajustes (quién puede cargar, qué requiere aprobación, referencia obligatoria al movimiento original) | Tecnología · Belén Gallo | — |
| 7 | Modelo de datos del campo "Cliente" como propiedad de la cuenta contable, replicado por sociedad o único agregado | Tecnología | — |
| 8 | Roles y permisos sobre "Ajuste manual" — quién puede cargarlo, qué requiere aprobación | Operaciones · Tesorería | — |
| 9 | Frecuencia de conciliación por tipo de cuenta (pool diario, operativa semanal, baja rotación mensual) | Belén Gallo · Operaciones | — |
| 10 | Formato del Libro de Movimientos exportable para auditoría, con filtros por sociedad obligatorios | Belén Gallo · contador externo | — |
| 11 | Modelo de la cuenta Intercompany — granularidad (por par de sociedades × moneda vs por préstamo individual), mecanismo de liquidación, SLA de cancelación | Belén Gallo · contador externo · Tecnología | — |
| 12 | Subtipos de movimiento intercompany — préstamo vs compra/venta vs aporte de capital, y cuáles soportar en V1 vs diferir a V2 | Belén Gallo · contador externo | — |
| 13 | Regla para determinar la sociedad de los asientos de movimientos sin cuenta física (SWAPs, fees, ajustes). Hipótesis actual: sociedad ejecutora del movimiento. Alternativa: sociedad donde el cliente tiene mayor saldo en la moneda involucrada | Belén Gallo · contador externo | — |
| **14** | **Subtipos del Patrimonio operativo en V1 — ¿una sola cuenta agregada (`Aportes de Ardua`) o desglose desde V1 entre Capital social / Aportes irrevocables / Reservas? La hipótesis actual es agregada en V1, desglose en V2** | **Belén Gallo · contador externo** | **—** |
| **15** | **Quién carga el saldo de apertura inicial de Patrimonio operativo por sociedad y moneda (Finanzas / contador / Tecnología) y bajo qué workflow de aprobación. Es un evento único en la puesta en marcha del módulo** | **Belén Gallo · contador externo · Tecnología** | **—** |

## Próximos pasos

1. Validar el modelo conceptual con Belén Gallo en sesión dedicada, usando el artefacto de validación `fin-tesoreria-disponibilidades.html` como soporte visual. Cubre los 16 eventos T0→T15 con todos los tipos (depósitos, retiros, fees, SWAPs, pendientes, ajustes, intercompany, sweeping cross-sociedad, pagos de Finanzas, aporte de capital propio). Punto especial de validación: la decisión de **no desglosar Propio vs Cliente por cuenta** y por qué esta decisión es un correlato directo del modelo omnibus, no una limitación pendiente.
2. Validar el tratamiento contable de los tipos críticos (SWAP, fees, pendientes, intercompany, sweeping cross-sociedad, ajustes, aporte de capital) con el contador externo. Puntos especiales: (a) la decisión de generar 2 asientos por sociedad en intercompany se sostiene bajo el marco contable de cada entidad; (b) la sociedad de imputación para movimientos sin cuenta física (H-14, decisión #13); (c) si el Patrimonio operativo en V1 puede ser una cuenta técnica única sin subtipos (H-16, decisión #14); (d) cómo se carga formalmente el saldo de apertura de Patrimonio operativo (decisión #15).
3. Cerrar las 16 hipótesis abiertas, propagando las conclusiones a `features/fin/fin-tesoreria-disponibilidades.md` cuando estén validadas.
4. Resolver las 15 decisiones pendientes y reflejarlas en la matriz de tipos definitiva.
5. Coordinar con Tecnología (Santiago Ahmed) la traducción del modelo a entidades y endpoints, manteniendo la separación entre lo que define Producto (qué y por qué) y cómo se implementa. Puntos especiales: (a) modelado de la cuenta Intercompany (decisión #11); (b) campo `sociedad` como atributo top-level del asiento contable (anclaje #37); (c) modelado del Patrimonio operativo como cuenta técnica agregada por sociedad y moneda; (d) workflow de carga de saldos de apertura.
6. Iterar sobre el prototipo formal del módulo en `prototypes/fin/`, alineándolo con la matriz de tipos y con las cuatro vistas mínimas definidas. El artefacto de validación queda como referencia conceptual congelada del discovery, no se itera junto con el prototipo.

## Referencias

- Artefacto de validación del modelo conceptual: [`fin-tesoreria-disponibilidades.html`](./fin-tesoreria-disponibilidades.html) — 16 eventos T0→T15 con tres perspectivas sincronizadas, posición en tiempo real, collapsibles por sociedad en Tesorería, y asientos contables etiquetados por sociedad. HTML standalone, sin dependencias externas. **No es el prototipo del módulo** — su rol es soportar la validación del modelo con stakeholders y queda como referencia conceptual congelada del discovery.
- Prototipo formal del módulo: vive en `prototypes/fin/` como proyecto frontend independiente, en 1:1 con `features/fin/`.
- Discovery previo de OPS: [`ops-discovery.md`](./ops-discovery.md) — modelo operativo de movimientos, cuentas Pool, Bandejas y Comandas.
- Discovery previo de FIN: [`fin-discovery.md`](./fin-discovery.md) — taxonomía v3 de FIN, distinción Tesorería OPS vs Tesorería FIN.
- Framework legal-operativo-contable: `framework/` (constraints transversales).
- Catálogo del prototipo del módulo Disponibilidades: capturas del 19-mayo-2026 (Posición, Bancos/Cuentas, Movimientos).
