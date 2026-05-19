---
name: FIN · Tesorería · Disponibilidades — modelo conceptual del módulo
features: [FIN]
status: En investigación
owner: Yasmani Salbidrez
created_at: 2026-05-19
updated_at: 2026-05-19
propagates_to: []
---

# FIN · Tesorería · Disponibilidades — modelo conceptual del módulo

## Objetivo

Definir el modelo conceptual del módulo Disponibilidades dentro del bloque Tesorería de la aplicación FIN, de forma que permita responder a Tesorería y Finanzas las tres preguntas operativas fundamentales:

1. **¿Dónde está el dinero físicamente?** Saldos reales por sociedad, banco, cuenta y moneda, conciliables contra los extractos de cada custodio.
2. **¿De quién es ese dinero?** Descomposición de cada saldo entre obligaciones con clientes, pendientes de asignación y patrimonio de Ardua.
3. **¿Cuánto puede operar Ardua sin tocar fondos de clientes?** Capacidad operativa derivada del patrimonio propio por moneda.

El módulo debe permitir trabajar este modelo sin depender de un Motor Contable formal en su V1, pero dejando la puerta abierta para que V2 lo monte encima sin retrabajos.

## Contexto

La gestión de fondos en Ardua opera hoy con tres planos que se mezclan y se procesan de manera fragmentaria, principalmente en Excel ("La Diaria") y en sistemas auxiliares como Contabilium para Tesorería y Compras. La complejidad nace de un hecho estructural: Ardua no tiene cuentas bancarias 1:1 con sus clientes — opera con cuentas Pool donde los fondos de múltiples clientes se mezclan con fondos propios, y la individualización del saldo de cada cliente vive en un ledger interno.

Esta arquitectura es estándar en custodios de fondos de terceros (EMIs, PSPCPs, exchanges, brokers, neobancos) y se conoce como **omnibus accounting**. Sin embargo, hasta ahora no estaba formalizada como modelo de sistema en Ardua, lo que genera tres problemas operativos:

- **Fricción operativa**: cada vez que aparece un movimiento atípico (un fee, un SWAP, un pendiente de asignar, un movimiento entre cuentas propias), no hay una convención clara sobre quién lo registra, cómo se registra, ni qué impacto tiene en cada ledger.
- **Riesgo de inconsistencia**: la falta de una ecuación de cierre formal entre lo físico y lo contable abre la puerta a que un cliente vea un saldo que no se corresponde con la posición real.
- **Imposibilidad de escalar**: hoy resolver una pregunta de gestión simple ("¿tenemos USDC suficiente para cubrir todos los retiros pendientes?") requiere combinar manualmente información de varios Excels.

El módulo Disponibilidades es la pieza que centraliza la **lente física y la lente económica** sobre los fondos del grupo, y se integra con OPS (que registra los movimientos con cliente) y con el futuro Motor Contable (que registrará los asientos formales).

## Principio fundamental

> **Ardua opera con tres ledgers paralelos —contable, físico, económico— que son matemáticamente consistentes en el agregado por moneda pero no en el detalle por evento. La ilusión de que "el saldo del cliente está en algún lado físicamente" es una simplificación útil para el cliente pero falsa internamente. El sistema interno debe asumir el desacople como principio y proveer las herramientas para que los tres ledgers se mantengan consistentes en el agregado.**

Este principio tiene cuatro consecuencias directas sobre el diseño del módulo:

1. **El saldo del cliente y la disponibilidad física están desacoplados.** El saldo del cliente es un pasivo en el ledger; los fondos físicos que lo respaldan pueden estar en cualquier cuenta o instrumento operable según decisión discrecional de Operaciones.
2. **La pregunta "¿de qué cliente es la plata que está en Binance?" está mal formulada.** El sistema no debe intentar responderla. Las preguntas correctas son: ¿cuánto hay físicamente? ¿cuánto debe Ardua en cada moneda? ¿cuánto patrimonio propio tiene Ardua en cada moneda?
3. **La capacidad de pago se calcula a nivel moneda agregada, no a nivel cuenta.** La métrica operativa que decide si Ardua puede honrar un retiro suma los saldos físicos en banda 1 a través de todas las cuentas en esa moneda.
4. **La consistencia del sistema se verifica por la ecuación maestra** (sección siguiente), no por matchear evento a evento.

## Las tres perspectivas del sistema

Cada evento real impacta de forma distinta a tres áreas. El módulo Disponibilidades debe servir simultáneamente a estas tres lecturas, sin confundirlas.

| Perspectiva | Eje primario | Responsabilidad | Cadencia |
|---|---|---|---|
| **Operaciones** | Cliente × Moneda | Imputar al cliente, mantener su saldo (= el pasivo de Ardua hacia él) | Real-time / continua |
| **Tesorería** | Sociedad × Banco/Estructura × Cuenta × Moneda | Conocer el saldo real físico, conciliar contra extractos, calcular disponibilidad | Diaria típica |
| **Contabilidad** | Cuenta contable (activo, pasivo, patrimonio, resultado) | Registrar la ecuación contable de cada evento como partida doble | Continua o por lote |

El dato fuente es el mismo evento físico-económico en el mundo. Lo que cambia es la **proyección**: Operaciones lo proyecta sobre el cliente, Tesorería sobre la cuenta física, Contabilidad sobre el plan de cuentas.

### Quién registra qué

| Tipo de movimiento | ¿Toca al cliente? | Origen del registro |
|---|---|---|
| Depósito de cliente | Sí | **Operaciones** |
| Retiro de cliente | Sí | **Operaciones** |
| Fee a cliente | Sí (cliente) / No (banco) | **Operaciones** |
| SWAP de cliente | Sí | **Operaciones** |
| Pendiente de asignar | Eventualmente sí | **Operaciones** (a cuenta técnica) |
| Asignación de pendiente | Sí | **Operaciones** |
| Movimiento entre cuentas propias | No | **Tesorería** |
| Comisión bancaria de plataforma | No | **Tesorería** |
| Interés bancario recibido | No | **Tesorería** |
| Pago a proveedor | No | **Tesorería** |
| Fondeo / barrido (sweeping) | No | **Tesorería** |
| Ajuste manual (válvula de escape) | Depende | Operaciones o Tesorería según naturaleza |

**Tesorería ve todo aunque no registre todo.** Su ledger consolidado es la suma de lo que registra Operaciones más lo que registra ella misma. Esa visión completa es la única superficie desde la que se puede conciliar contra el extracto bancario.

## La ecuación maestra

La condición de consistencia del sistema, válida en todo momento `T` para toda moneda `M`:

```
Σ saldos físicos en M en todas las cuentas de Ardua
=
Σ obligaciones con clientes en M
+ Σ pendientes de asignación en M
+ Σ patrimonio Ardua acumulado en M
```

Esta ecuación es el contrato único que asegura que el sistema es internamente consistente. Si cuadra en cada moneda al cierre de cada operación, el sistema es válido — **independientemente de en qué cuenta esté cada peso, dólar o stablecoin**. Cualquier desvío material es un **break** que requiere workflow de investigación.

## Modelo de movimientos · doble entrada con extensión operativa

Cada movimiento del sistema es un **asiento contable de doble entrada** con una posible extensión sobre el plano físico:

- **Plano contable** (siempre presente): Db = Cr sobre cuentas contables.
- **Plano físico** (opcional según tipo): aparece cuando una o ambas entradas del asiento son sobre cuentas de Disponibilidades, y representa el movimiento real de fondos en el banco o custodio.

Esto resuelve el problema de modelo de datos que tenía la implementación previa, donde Banco y Cliente se trataban como dos campos obligatorios del mismo nivel. En el modelo correcto:

| Plano | Pregunta que contesta | Cuándo aplica |
|---|---|---|
| Físico (Banco/Cuenta) | ¿De qué cuenta entró o salió la plata? | Cuando hubo flujo de fondos |
| Contable (Cliente / Resultado / Pendiente) | ¿Sobre qué etiqueta contable impacta? | Siempre |

El **cliente** no es un campo independiente del movimiento — es una propiedad embebida en la cuenta contable de Obligaciones (`Obligaciones con clientes — Cliente Y USDC` ya lleva al cliente embebido).

## Matriz de tipos de movimiento

Esta matriz es el **contrato cerrado del sistema** entre Operaciones, Tesorería y Contabilidad. Cualquier evento real debe encajar en una fila — si no encaja, falta tipificar el evento.

| Tipo | Banco origen | Banco destino | Cliente | Plano físico | Plano contable |
|---|---|---|---|---|---|
| Depósito | — | Sí | Sí | Ingreso | Db Disp · Cr Oblig cliente |
| Retiro | Sí | — | Sí | Egreso | Db Oblig cliente · Cr Disp |
| Fee | — | — | Sí | — | Db Oblig cliente · Cr Ingresos fees |
| Rebate | — | — | Sí | — | Db Gastos rebates · Cr Oblig cliente |
| SWAP_OUT (cliente) | — | — | Sí | — | Db Oblig cliente M1 · Cr Cuenta puente FX |
| SWAP_IN (cliente) | — | — | Sí | — | Db Cuenta puente FX · Cr Oblig cliente M2 |
| SPREAD (SWAP) | — | — | — | — | Db Cuenta puente FX · Cr Ingresos por spread |
| Solicitud de retiro (PENDING) | — | — | Sí | — | — (solo reserva, sin asiento) |
| Pendiente de asignar | — | Sí | NO IDENT. | Ingreso | Db Disp · Cr Pendientes asignación |
| Asignación de pendiente | — | — | Sí | — | Db Pendientes asignación · Cr Oblig cliente |
| Movimiento entre cuentas propias | Sí | Sí | — | Reubicación | Db Disp destino · Cr Disp origen |
| Sweeping | Sí | Sí | — | Reubicación | Db Disp destino · Cr Disp origen |
| Comisión bancaria | Sí | — | — | Egreso | Db Gastos bancarios · Cr Disp |
| Interés bancario | — | Sí | — | Ingreso | Db Disp · Cr Ingresos financieros |
| Pago a proveedor | Sí | — | — | Egreso | Db Gastos [categoría] · Cr Disp |
| Ajuste manual | Depende | Depende | Depende | Depende | Configurable con justificación obligatoria |

## Simulación de referencia

El modelo se validó con una simulación canónica de 10 eventos (T0 a T9) sobre un setup de cuatro sociedades (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures), ocho cuentas activas en tres monedas (ARS, USDC, EURC) y tres clientes con obligaciones multimoneda.

| T | Evento | Plano físico | Plano contable | Registra |
|---|---|---|---|---|
| T0 | Estado inicial | — | — | — |
| T1 | Depósito 18.500.000 ARS a CBU COINAG | ✓ | ✓ | Operaciones |
| T2 | Fee 12.500 ARS a cli-tecno-sa | — | ✓ | Operaciones |
| T3 | SWAP 100.000 USDC → 91.500 EURC + spread 500 | — | ✓ ✓ ✓ | Operaciones |
| T4 | Solicitud retiro 9.200.000 ARS (PENDING) | — | — | Operaciones |
| T5 | Ejecución del retiro desde COINAG CBU | ✓ | ✓ | Operaciones |
| T6 | Pendiente: llegan 250.000 USDC a BITGO Pool | ✓ | ✓ | Operaciones |
| T7 | Asignación: 250.000 USDC son de cli-flynet-llc | — | ✓ | Operaciones |
| T8 | Movimiento 200.000 EURC entre REVOLUT y KRAKEN | ✓ | ✓ | Tesorería |
| T9 | Sweeping 500.000 USDC de BITGO a COINBASE | ✓ | ✓ | Tesorería |

**Resultado clave de la simulación:** la ecuación maestra cuadra en las tres monedas en cada uno de los diez estados. El ledger contable se mueve más rápido que el físico (10 eventos generan 12 asientos contables pero solo 6 movimientos físicos distintos), confirmando el desacople estructural entre ambas dimensiones.

La simulación se materializó en un **artefacto de validación del modelo conceptual** (`fin-tesoreria-disponibilidades-validation-artifact.html`) que muestra para cada evento las tres perspectivas y la posición consolidada en tiempo real, con deltas explícitos por columna y fila afectadas. Este artefacto **no es el prototipo del módulo** — el prototipo formal vive en `prototypes/fin/` como proyecto frontend independiente. El artefacto sirve únicamente como soporte visual para validar el comportamiento del modelo con los stakeholders y queda como referencia conceptual congelada del discovery.

## Anclajes del modelo

Estos son los 34 anclajes acumulados durante la discovery, ordenados por dimensión.

### Principios fundamentales

1. Tres flujos / tres ejes / un evento único — Operaciones (cliente-céntrica), Tesorería (cuenta-céntrica), Contabilidad (cuenta contable-céntrica).
2. Disponibilidad = saldo físico − pasivos, no es segregación física entre cuentas.
3. El ledger contable y el ledger físico son sistemas independientes que se cruzan sólo en la conciliación agregada por moneda.
4. Saldo del cliente y disponibilidad física están desacoplados — el saldo es un pasivo, los fondos están donde Operaciones decide.
5. Capacidad de pago es un cálculo global por moneda, no por cuenta.

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
14. Movimientos inmutables; los errores se corrigen con compensación, no con edición.

### Modelo de control

15. Ecuación maestra de consistencia por moneda como contrato único.
16. Conciliación agregada por moneda como unidad primaria, no por cuenta.
17. Breaks con workflow propio — se documentan, se asignan, no se ocultan.
18. Sweeping del patrimonio Ardua a cuentas operativas cuando supera umbral en pools mixtas.

### Modelo de movimientos

19. Tesorería dueño del ledger consolidado por cuenta — recibe asientos de Operaciones (cuando hay cliente) y registra directamente lo que Operaciones no toca.
20. Movimientos entre cuentas propias capeados por patrimonio Ardua disponible — un movimiento no puede empujar el patrimonio de la cuenta origen por debajo de cero.
21. Pendientes de asignar son pasivos a efectos de capacidad de pago — se tratan conservadoramente como deuda hasta su resolución.
22. El SWAP es contablemente tres eventos atómicos (SWAP_OUT, SWAP_IN, SPREAD) y físicamente cero — necesita mecanismo de cruce multimoneda en los asientos (cuenta puente o referencia de TC).
23. Las cuentas de resultado (Ingresos / Gastos) son indicadores analíticos, no son origen de fondos — no se "gasta contra Fees", se gasta desde una cuenta de Disponibilidades registrando la naturaleza del egreso.
24. El patrimonio Ardua es plenamente operable dentro de la restricción de la ecuación maestra.
25. Las cuentas de Disponibilidades son las únicas con realidad física — todas las demás cuentas contables (Ingresos, Gastos, Obligaciones, Pendientes, Patrimonio) son etiquetas analíticas sobre el mismo dinero.
26. El fee es un movimiento operativo en Operaciones (registrado como cualquier otro evento) que no tiene plano físico — distinguir "movimiento" (cualquier evento registrado) de "flujo de fondos" (movimiento con plano físico).

### Módulo Disponibilidades

27. Dos lentes que cohabitan — física (conciliación, fuente de verdad sobre lo real) y económica (capacidad de pago, base de decisión operativa).
28. Cuatro vistas mínimas — Posición por cuenta · Posición consolidada por moneda · Movimientos del ledger · Conciliación.
29. Posición principal con cuatro columnas por moneda — Físico, Obligaciones, Pendientes, Patrimonio Ardua.
30. Drill-down opcional del Patrimonio Ardua por origen (aportes, resultados acumulados, resultado del período en curso).
31. Sociedad como eje primario de navegación, no solo filtro — cada Sociedad tiene su propia ecuación maestra por moneda además del consolidado del grupo.

### Scope V1 vs V2

32. V1 entrega Posición consolidada sin Motor Contable — el modelo se sostiene porque cada movimiento lleva embebida su clasificación contable a través del tipo.
33. Tres piezas obligatorias en V1 para que el modelo no quede coja sin Motor Contable — tipo "Ajuste manual" con justificación, vista de Libro de Movimientos como reporte cronológico filtrable, inmutabilidad con corrección vía compensación.
34. V2 = Motor Contable se monta encima sin retrabajo — lee los movimientos existentes, genera asientos formales, plan de cuentas, libro diario y P&L. Los movimientos no se recargan, se traducen.

## Scope V1 vs V2

### V1 — entregable sin Motor Contable

| Funcionalidad | Estado |
|---|---|
| Catálogo de cuentas (Sociedad × Banco × Cuenta × Moneda) | Obligatorio |
| Tipificación completa de movimientos según matriz | Obligatorio |
| Registro de movimientos por Operaciones | Obligatorio |
| Registro de movimientos por Tesorería | Obligatorio |
| Posición por cuenta agrupada por sociedad | Obligatorio |
| Posición consolidada por moneda | Obligatorio |
| Obligaciones por cliente × moneda | Obligatorio |
| Libro de Movimientos (vista cronológica filtrable) | Obligatorio |
| Tipo "Ajuste manual" con justificación textual obligatoria | Obligatorio |
| Inmutabilidad con corrección vía compensación | Obligatorio |
| Conciliación contra extracto bancario | Obligatorio |
| Drill-down Patrimonio Ardua por origen | Opcional |
| Alertas (patrimonio negativo, pendiente > SLA, delta > tolerancia) | Opcional |

### V2 — encima de V1 cuando llegue Motor Contable

| Funcionalidad | Estado |
|---|---|
| Plan de cuentas contable formal con jerarquía | Diferido a V2 |
| Libro Diario con asientos formales | Diferido a V2 |
| Mayor (mayorización de cuentas) | Diferido a V2 |
| P&L formal por período con cierre | Diferido a V2 |
| Balance contable formal por sociedad | Diferido a V2 |
| Asientos manuales para casos no estándar | Diferido a V2 |
| Multi-currency mark-to-market | Diferido a V2 |

V2 no recarga movimientos — los lee del catálogo existente de V1 y los traduce a asientos formales según los templates contables ya definidos en la matriz de tipos.

## Hipótesis abiertas

| ID | Hipótesis | Pendiente de validación con |
|---|---|---|
| H-01 | La matriz de tipos cubre todos los eventos operativos reales sin necesidad de ajuste manual frecuente | Belén Gallo · Juan Cruz Lotz |
| H-02 | El tratamiento contable propuesto para el SWAP (tres asientos con cuenta puente FX) es válido bajo el marco contable de cada entidad del grupo | Contador externo |
| H-03 | El SLA para pendientes de asignación (días antes de escalamiento) puede definirse uniformemente o requiere segmentación por moneda / sociedad | Belén Gallo · Juan Cruz Lotz |
| H-04 | El concepto "Tesorería ve todo aunque no registre todo" se sostiene operativamente — Tesorería puede operar con un ledger consolidado que mezcla orígenes de registro | Belén Gallo |
| H-05 | El cliente como atributo embebido en la cuenta contable de Obligaciones es modelable sin explosión combinatoria del plan de cuentas | Tecnología |
| H-06 | La ecuación maestra debe cuadrar por sociedad además de por moneda (cada entidad del grupo cuadra por separado, y el consolidado del grupo es la suma) | Belén Gallo · contador externo |
| H-07 | El "Ajuste manual" como válvula de escape en V1 cubre los casos no estándar sin necesidad de extender la matriz de tipos | Belén Gallo · Operaciones |
| H-08 | Los movimientos intercompany (entre cuentas de distintas sociedades del grupo) tienen tratamiento contable específico que excede "movimiento entre cuentas propias" | Belén Gallo · contador externo |
| H-09 | El campo CUENTA en movimientos sin flujo físico (fees, SWAPs, asignaciones) debe estar explícitamente vacío en el modelo de datos, no derivado | Tecnología |
| H-10 | El TAX como tipo de movimiento (observado en el prototipo) requiere modelarse formalmente — naturaleza, registrador y flujo TRD → Tesorería | Facundo Vasques · Belén Gallo |

## Decisiones pendientes

| # | Decisión | Owner | Bloqueo |
|---|---|---|---|
| 1 | Política de respaldo (backing policy) — qué porcentaje de obligaciones por moneda debe estar en banda 1 de liquidez | Belén Gallo · CEO | Regulatorio por entidad |
| 2 | SLA de pendientes de asignación y workflow de escalamiento | Belén Gallo · Operaciones | — |
| 3 | Tolerancias de break por moneda en la conciliación diaria | Belén Gallo · contador externo | — |
| 4 | Umbral de sweeping por cuenta-moneda (cuándo barrer patrimonio Ardua a cuenta operativa) | Belén Gallo · Operaciones | — |
| 5 | Tratamiento contable del SWAP multimoneda (cuenta puente FX vs revalúo a TC de mercado vs otro) | Contador externo | — |
| 6 | Reglas de inmutabilidad y workflow de compensación | Tecnología · Belén Gallo | — |
| 7 | Modelo de datos del campo "Cliente" como propiedad de la cuenta contable | Tecnología | — |
| 8 | Roles y permisos sobre "Ajuste manual" — quién puede cargarlo, qué requiere aprobación | Operaciones · Tesorería | — |
| 9 | Frecuencia de conciliación por tipo de cuenta (pool diario, operativa semanal, baja rotación mensual) | Belén Gallo · Operaciones | — |
| 10 | Formato del Libro de Movimientos exportable para auditoría | Belén Gallo · contador externo | — |

## Próximos pasos

1. Validar el modelo conceptual con Belén Gallo en sesión dedicada, usando el artefacto de validación `fin-tesoreria-disponibilidades-validation-artifact.html` como soporte visual.
2. Validar el tratamiento contable de los tipos críticos (SWAP, fees, pendientes, intercompany) con el contador externo.
3. Cerrar las 10 hipótesis abiertas, propagando las conclusiones a `features/fin/fin-tesoreria-disponibilidades.md` cuando estén validadas.
4. Resolver las 10 decisiones pendientes y reflejarlas en la matriz de tipos definitiva.
5. Coordinar con Tecnología (Santiago Ahmed) la traducción del modelo a entidades y endpoints, manteniendo la separación entre lo que define Producto (qué y por qué) y cómo se implementa.
6. Iterar sobre el prototipo formal del módulo en `prototypes/fin/`, alineándolo con la matriz de tipos y con las cuatro vistas mínimas definidas. El artefacto de validación queda como referencia conceptual congelada del discovery, no se itera junto con el prototipo.

## Referencias

- Artefacto de validación del modelo conceptual: [`fin-tesoreria-disponibilidades-validation-artifact.html`](./fin-tesoreria-disponibilidades-validation-artifact.html) — 10 eventos T0→T9 con tres perspectivas sincronizadas y posición en tiempo real. HTML standalone, sin dependencias externas. **No es el prototipo del módulo** — su rol es soportar la validación del modelo con stakeholders y queda como referencia conceptual congelada del discovery.
- Prototipo formal del módulo: vive en `prototypes/fin/` como proyecto frontend independiente, en 1:1 con `features/fin/`.
- Discovery previo de OPS: [`ops-discovery.md`](./ops-discovery.md) — modelo operativo de movimientos, cuentas Pool, Bandejas y Comandas.
- Discovery previo de FIN: [`fin-discovery.md`](./fin-discovery.md) — taxonomía v3 de FIN, distinción Tesorería OPS vs Tesorería FIN.
- Framework legal-operativo-contable: `framework/` (constraints transversales).
- Catálogo del prototipo del módulo Disponibilidades: capturas del 19-mayo-2026 (Posición, Bancos/Cuentas, Movimientos).
