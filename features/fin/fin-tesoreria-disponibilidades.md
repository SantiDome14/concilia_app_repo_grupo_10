# FIN — Tesorería — Disponibilidades

> Bloque: Tesorería
> Estado: IN ANALYSIS (REQ-50) · Modelo conceptual cerrado · Prototipo iterado
> Última actualización: 2026-05-20 (post-iteración de prototipo en `prototypes/fin/`)

---

## Qué es este módulo

Disponibilidades es el módulo de FIN que responde a la pregunta operativa
**"¿dónde está el dinero?"** en términos de **Sociedad → Banco → Cuenta**.

Es el surface principal del bloque Tesorería: resume la posición financiera del grupo sobre la base de la **ecuación maestra**, expone el **ledger global de movimientos** que la sustenta, y permite operar sobre el **catálogo de Bancos / Cuentas** con lente de Finanzas.

Reemplaza la planilla manual actual (saldos sin trazabilidad, sin distinción operativa/contable) con un registro auditable, posición en tiempo real y mecanismos formales de imputación. La supervisión de cargas manuales fue diferida a un cambio futuro (vía capabilities) — V1 carga directa.

---

## Principio fundamental — Modelo omnibus accounting

Ardua opera con **tres ledgers paralelos** (contable, físico, económico) matemáticamente consistentes en el agregado por sociedad y por moneda, pero **no en el detalle por evento ni por cliente**. La ilusión de que "el saldo del cliente está físicamente en una cuenta específica" es una simplificación útil para el cliente externo pero **falsa internamente**.

Consecuencias estructurales:

1. **El saldo del cliente y la disponibilidad física están desacoplados.** El saldo del cliente es un pasivo en el ledger; los fondos físicos viven en cuentas pool dentro de la sociedad correspondiente, según decisión discrecional de Operaciones.
2. **La pregunta "¿de qué cliente es la plata que está en esta cuenta?" está mal formulada** y el módulo no la responde. Las preguntas correctas son: ¿cuánto hay físicamente? ¿cuánto debe Ardua en cada moneda? ¿cuánta capacidad operativa propia tiene Ardua?
3. **La capacidad de pago se calcula a nivel moneda agregada**, no a nivel cuenta ni cliente.
4. **La consistencia del sistema se verifica por la ecuación maestra**, no por matchear evento a evento ni cliente a cuenta física.
5. **La sociedad es la unidad mínima de adscripción del dinero.** Cada cuenta física, cada asiento contable y cada obligación con cliente está adscripta a una sociedad. La ecuación maestra cuadra a nivel sociedad-moneda y consolidado-moneda — nunca a nivel cuenta-cliente.

---

## Ecuación maestra

La condición de consistencia del sistema, válida en todo momento, para toda moneda M y para cada sociedad o el consolidado del grupo:

```
Σ Bancos (físico)  =  Σ Obligaciones  +  Σ Pendientes  +  Σ Capacidad Operativa
```

Donde **Capacidad Operativa = Bancos − Obligaciones − Pendientes**, calculada por moneda como residual.

Es la métrica que responde "¿cuánto puede operar Ardua sin tocar fondos de clientes?". Cualquier desvío material entre el lado izquierdo y el derecho es un **break** que requiere workflow de investigación.

| Dimensión | Definición | Origen del dato |
|---|---|---|
| **Bancos** | Saldo físico real en todas las cuentas activas del grupo | Catálogo de Bancos / Cuentas (REQ-42) |
| **Obligaciones** | Total adeudado por Ardua a clientes | Cuenta contable "Obligaciones con clientes" del ledger — construida principalmente por imputaciones de OPS |
| **Pendientes** | Fondos ingresados físicamente sin identificar cliente al momento del registro | Cuenta técnica "Pendientes de asignación" — incrementada por `DEPOSIT`s con `cliente_id == null`, decrementada cuando OPS asigna el cliente vía la acción `Asignar Cliente` (movimiento queda imputado a Obligaciones del cliente) |
| **Capacidad Operativa** | Capacidad propia del grupo para operar sin tocar fondos de clientes | Residual: `Bancos − Obligaciones − Pendientes` |

---

## Modelo de movimientos

Cada movimiento del sistema es un **asiento contable de doble entrada adscripto a una sociedad**, con una posible extensión sobre el plano físico:

* **Plano contable** (siempre presente): Db = Cr sobre cuentas contables, dentro del libro de una sociedad específica.
* **Plano físico** (opcional según tipo): aparece cuando una o ambas entradas del asiento son sobre cuentas de Disponibilidades, y representa el movimiento real de fondos en el banco o custodio.

Dos reglas estructurales del modelo:

1. **El cliente no es un campo del movimiento — es una propiedad embebida en la cuenta contable de Obligaciones** (`Obligaciones — Cliente Y USDC` ya lleva al cliente embebido). Para tipos sin cliente, la contrapartida es una cuenta contable formal (Ingresos, Egresos, Patrimonio operativo, Intercompany, Puente FX), no un cliente sintético.
2. **Cada asiento pertenece a una sola sociedad.** Cuando un evento operativo afecta a dos sociedades (Préstamo intercompany, Sweeping cross-sociedad), se generan dos asientos formalmente independientes — uno en el libro de cada sociedad — relacionados únicamente por la referencia al mismo evento operativo.

---

## Tipología de movimientos por presencia de Lado Cliente

Cada movimiento se clasifica según dos dimensiones ortogonales: **presencia de cliente** × **presencia de flujo físico**. Esta tipología gobierna campos de carga, predicados de acciones y valores del estado de imputación en la UI.

| Categoría | Tipos representativos | Cliente | Físico | Contrapartida cuando no hay cliente |
|---|---|---|---|---|
| **A. Con cliente + físico** | Depósito, Retiro | Sí | Sí | — |
| **B. Con cliente, sin físico** | Fee, Rebate, SWAP cliente, Ajuste Cr/Db | Sí | No | — |
| **C. Sin cliente + físico (interno)** | Comisión bancaria, Interés bancario, Pago a proveedor, Pago de salarios, Mov. entre cuentas propias, Aporte de capital | No | Sí | Ingresos / Egresos / Patrimonio operativo |
| **D. Sin cliente + físico (cross-sociedad)** | Préstamo intercompany, Sweeping cross-sociedad | No | Sí (en ambas sociedades) | Intercompany (2 asientos espejo, uno por sociedad) |
| **E. Sin cliente, sin físico** | SPREAD del SWAP, Ajuste manual sin cliente | No | No | Puente FX, Ingresos por spread, otras técnicas |

Para las categorías C, D y E el Lado Cliente **no aplica** — no es "vacío" ni "sin asignar" ni "imputado a un sintético". La contrapartida económica es una cuenta contable formal del ledger.

Una **categoría F (Cliente NO IDENTIFICADO)** fue considerada para depósitos pendientes de asignar al cliente, pero finalmente se modela como un `DEPOSIT` (categoría A) con `cliente_id == null` — el discriminador es la presencia del cliente en el campo, no un tipo separado. El KPI "Pendientes" de la ecuación maestra se computa a partir de esos records, independiente del tipo.

---

## Matriz de tipos de movimiento

Contrato cerrado del sistema entre Operaciones, Tesorería y Contabilidad — **18 tipos**. Cualquier evento real debe encajar en una fila; si no encaja, falta tipificar el evento. Los eventos "pendientes" (depósito sin cliente, solicitud de retiro pre-ejecución, asignación de pendiente) NO son tipos separados — se modelan como estados de los tipos existentes (`DEPOSIT` con `cliente_id == null`, etc.) y se resuelven mediante las acciones de imputación del manifest.

| Tipo | Banco origen | Banco destino | Cliente | Plano físico | Asientos | Plano contable | Registra |
|---|---|---|---|---|---|---|---|
| Depósito | — | Sí | Sí (o `null` si pendiente) | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Oblig cliente (o Pendientes asignación si cliente null) | OPS |
| Retiro | Sí | — | Sí | Egreso | 1 (soc. cuenta) | Db Oblig cliente · Cr Disp | OPS |
| Fee | — | — | Sí | — | 1 (soc. del saldo) | Db Oblig cliente · Cr Ingresos fees | OPS |
| Rebate | — | — | Sí | — | 1 (soc. del saldo) | Db Gastos rebates · Cr Oblig cliente | OPS |
| SWAP_OUT (cliente) | — | — | Sí | — | 1 (soc. ejecutora) | Db Oblig cliente M1 · Cr Puente FX | OPS |
| SWAP_IN (cliente) | — | — | Sí | — | 1 (soc. ejecutora) | Db Puente FX · Cr Oblig cliente M2 | OPS |
| SPREAD (SWAP) | — | — | — | — | 1 (soc. ejecutora) | Db Puente FX · Cr Ingresos por spread | OPS |
| Ajuste de Crédito | — | — | Sí | — | 1 (soc. del saldo) | Db Ingresos/Egresos · Cr Oblig cliente | OPS |
| Ajuste de Débito | — | — | Sí | — | 1 (soc. del saldo) | Db Oblig cliente · Cr Ingresos/Egresos | OPS |
| Mov. entre cuentas propias (misma sociedad) | Sí | Sí | — | Reubicación | 1 (soc. única) | Db Disp destino · Cr Disp origen | FIN |
| **Préstamo intercompany** | Sí | Sí | — | Reubicación entre sociedades | **2 (uno por sociedad)** | En origen: Db Cta a cobrar IC · Cr Disp. En destino: Db Disp · Cr Cta a pagar IC | FIN |
| **Sweeping cross-sociedad** | Sí | Sí | — | Reubicación entre sociedades | **2 (uno por sociedad)** | Mismo tratamiento que Préstamo intercompany | FIN |
| Comisión bancaria | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos bancarios · Cr Disp | FIN |
| Interés bancario | — | Sí | — | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Ingresos financieros | FIN |
| Pago a proveedor | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos [categoría] · Cr Disp | FIN |
| Pago de salarios | Sí | — | — | Egreso | 1 (soc. cuenta) | Db Gastos sueldos · Cr Disp | FIN |
| **Aporte de capital propio** | — | Sí | — | Ingreso | 1 (soc. cuenta) | Db Disp · Cr Patrimonio operativo | FIN |
| Ajuste manual | Depende | Depende | Depende | Depende | Configurable | Configurable con justificación obligatoria | FIN |

### Origen del registro

Cada movimiento carga un `origen` cerrado: `'OPS'` (vostros + ajustes que entran al ledger desde core-ops-backend) o `'FIN'` (nostros, no-operativos, intercompany, ajustes manuales). El antiguo `'Manual'` colapsa en `'FIN'`; `'TRD'` no aplica al ledger de Disponibilidades.

### Rails canónicos

Cada movimiento carga un `rail` (en el namespace `ops.*`) tomado del conjunto cerrado de **15 rails canónicos**, fuera del cual cualquier valor es rechazado:

```
WIRE · VCURRENCY USDT · VCURRENCY USDC · VCURRENCY · SWIFT ·
SPEI · SPE · SEPA · PIX · INTERNAL · FX · FEDWIRE ·
Faster Payments · ARDUA · ACH
```

Sumar un rail nuevo requiere un cambio formal — no es un campo abierto.

---

## Estructura del módulo (V1)

Tres sub-tabs en orden fijo:

| Sub-tab | Naturaleza |
|---|---|
| **Posición** | 4 KPI cards (Bancos / Obligaciones / Pendientes / Capacidad Operativa) por moneda + desglose Sociedad → Cuenta |
| **Bancos / Cuentas** | Catálogo (definido en REQ-42) con lente Finanzas — configuración contable preparatoria |
| **Movimientos** | Ledger global con vistas Lista / Tarjetas / Tablero (REQ-69), ejes redefinibles, acciones |

Detalle completo de UI, criterios de aceptación, capabilities, dialogs y predicados: **REQ-50**.

### Carga manual (V1 — sin supervisión)

La carga manual cubre los 9 tipos registrados por FIN en la matriz: Comisión / Interés bancario · Pago a proveedor · Pago de salarios · Mov. entre cuentas propias · Aporte de capital · Préstamo intercompany · Sweeping cross-sociedad · Ajuste manual. **V1 carga directa**: el movimiento impacta los saldos en el momento de la carga.

La supervisión (dual control: ningún movimiento manual impacta saldos hasta que un segundo usuario lo confirme) fue **deferida a un cambio futuro vía capabilities**. El área primero valida los flujos con la carga directa; cuando se introduzca la supervisión se hará via la capability `cargar_con_supervision` (que coexistirá con `cargar_directo`) y el role asignado al creador determinará cuál se invoca.

---

## Plan de cuentas del módulo — 8 grupos contables

El módulo trabaja sobre 8 grupos de cuentas contables (no plan de cuentas formal — éste se introduce con el Motor Contable en V2):

| Grupo | Naturaleza |
|---|---|
| Disponibilidades | Activo · única cuenta con realidad física |
| Obligaciones con clientes | Pasivo |
| Pendientes de asignación | Pasivo · cuenta técnica |
| Puente FX | Técnica multimoneda |
| Intercompany | Técnica entre sociedades del grupo |
| **Patrimonio operativo** | Pasivo / Patrimonio · captura aportes propios y residual operativo de Ardua |
| Ingresos | Resultado |
| Egresos | Resultado |

En V1, **Patrimonio operativo** es una sola cuenta técnica agregada con saldo de apertura en T0 igual a la Capacidad Operativa inicial calculada (`Bancos inicial − Obligaciones inicial − Pendientes inicial`). El desglose patrimonial formal (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados) se introduce en V2 cuando llegue el Motor Contable.

---

## Reglas de inmutabilidad y corrección

Los movimientos del ledger son **inmutables**. Los errores no se corrigen editando o eliminando el movimiento original — se corrigen registrando un movimiento compensatorio del tipo correspondiente:

* **Ajuste de Crédito** — corrección a favor del cliente (devolución de fee cobrado de más, reconocimiento de un cargo incorrecto, etc.).
* **Ajuste de Débito** — corrección a favor de Ardua (fee no cobrado, crédito incorrecto, etc.).
* **Ajuste manual** — válvula de escape para casos no contemplados, con justificación textual obligatoria.

Los Ajustes son cargas manuales con justificación obligatoria. No se generan automáticamente al detectar inconsistencias.

---

## Diferencia con OPS.Movimientos

OPS y FIN operan sobre el **mismo ledger** — son lentes distintas sobre el mismo dato.

| Surface | Imputa |
|---|---|
| OPS.Movimientos | Movimientos **vostro** (originados por clientes — categorías A y B) |
| FIN.Disponibilidades.Movimientos | Movimientos **nostro y manuales no operativos** (categorías C, D y E) |

La separación se materializa vía manifest engine: cada app declara su propio set de acciones (terna `(app, módulo, registro)`). El registro físico es el mismo en ambos lados; las acciones disponibles dependen de la app desde donde se accede.

---

## Restricciones (fuera de scope v1)

* **Generación de asientos contables formales** — depende de FIN.Contabilidad. Los asientos en V1 se modelan a nivel grupo contable, no por cuenta individual.
* **Desglose patrimonial formal del Patrimonio operativo** (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados) — se introduce en V2 con el Motor Contable.
* **Compensación automática de errores** — los Ajustes son cargas manuales con justificación obligatoria, no automáticas.
* **Conciliación contable automática** contra extracto bancario / API on-chain / exchange — backend, no expuesta en V1.
* **Conciliación operativa** — sigue en OPS, no se duplica en FIN.
* **Vista de Disponibilidad propiamente dicha** (Disponible vs Comprometido) — requiere modelo de comprometidos aún no definido.
* **Vista de Exposición** · **Vista de Vencimientos** — fuera de scope.
* **Caja Chica** · **Inversiones** — sub-módulos futuros del bloque Tesorería.
* **Monedas y tipos de cambio** — gestión del catálogo y tasas. V1 no aplica conversiones cross-moneda: cada KPI y saldo se presenta en su moneda nativa.
* **Cierre operativo del día / cierre contable de período** — depende de FIN.Contabilidad.
* **Integración del módulo Inbox** — no disponible en V1.
* **Supervisión de cargas manuales** — diferida a un cambio futuro vía capabilities (`cargar_con_supervision` + `supervisar_carga`). V1 carga directa.

---

## Hipótesis abiertas

El modelo conceptual está cerrado pero quedan hipótesis sobre detalles operativos y de implementación pendientes de validar con Belén Gallo, Operaciones, Tecnología y contador externo. Ver el detalle completo (16 hipótesis abiertas, 15 decisiones pendientes) en:

[`discoveries/fin-tesoreria-disponibilidades-discovery.md`](../../discoveries/fin-tesoreria-disponibilidades-discovery.md) — secciones "Hipótesis abiertas" y "Decisiones pendientes".

Las hipótesis cubren temas como: políticas de respaldo, SLA de pendientes, tolerancias de break, tratamiento contable formal del SWAP, modelo de cuenta Intercompany, subtipos de Patrimonio operativo en V1, y reglas para movimientos sin cuenta física.

---

## Artefactos de referencia

| Artefacto | Referencia |
|---|---|
| Ticket Jira (V1 — UI completa) | [REQ-50](https://arduasolutions.atlassian.net/browse/REQ-50) |
| Catálogo de Bancos/Cuentas + Modelo de imputación | [REQ-42](https://arduasolutions.atlassian.net/browse/REQ-42) |
| Manifest Engine (acciones por app) | [REQ-68](https://arduasolutions.atlassian.net/browse/REQ-68) |
| Vistas compartidas (Lista/Tarjetas/Tablero) | [REQ-69](https://arduasolutions.atlassian.net/browse/REQ-69) |
| Discovery (modelo conceptual + 38 anclajes + hipótesis abiertas) | [`discoveries/fin-tesoreria-disponibilidades-discovery.md`](../../discoveries/fin-tesoreria-disponibilidades-discovery.md) |
| Simulador del modelo conceptual (16 eventos T0→T15) | [`discoveries/fin-tesoreria-disponibilidades.html`](../../discoveries/fin-tesoreria-disponibilidades.html) |
| Marco operativo | [`framework/marco-operativo.md`](../../framework/marco-operativo.md) §4-§5 |
