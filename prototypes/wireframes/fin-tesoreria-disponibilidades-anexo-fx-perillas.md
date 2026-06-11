# Anexo de trabajo — Simulador-Comparador de Disponibilidades (FX / perillas)

> **Naturaleza de este documento.** Esto NO es un discovery. Es un **anexo de trabajo** producido en sesión, cuyo único propósito es servir de referencia a Claude Code para construir el prototipo `fin-tesoreria-disponibilidades-simulador.html`. Extiende el discovery `discoveries/fin-tesoreria-disponibilidades-discovery.md` (status: En investigación) introduciendo una dimensión que ese discovery no cubre: el **físico en moneda no custodiada** y el enfoque de **comparación de fórmulas vía perillas**.
>
> **Pendiente de reconciliación.** Este anexo entra en tensión con dos decisiones del discovery vigente. La reconciliación se hará en la próxima iteración del discovery, no acá:
> - **Anclaje #2 / #30 (Capacidad Operativa como residual `Físico − Obligaciones − Pendientes`).** Este anexo la trata como **una fórmula seleccionable más** (perilla P-DISP1), no como la única verdad. El sistema, en la posición elegida por Producto, NO calcula el veredicto: muestra los componentes y el humano de Tesorería decide.
> - **Ecuación maestra monomoneda.** El discovery vigente cuadra físico contra obligaciones dentro de la misma moneda (universo ARS/USDC/EURC, todo de custodia). Este anexo introduce **BRL exótico** que entra físicamente pero no se custodia, lo que exige una capa de tratamiento del físico no custodiado (perilla P-FX1) que el discovery todavía no tiene.
>
> Lo que el discovery vigente YA resolvió y este anexo NO contradice: el modelo omnibus (anclaje #38), la separación de mecanismos FBO/custodia vs cuenta espejo intercompany (anclajes #37/#38), y el descarte de los "legajos recíprocos". Este anexo asume todo eso como base.

---

## Objetivo del prototipo

Construir un **simulador-comparador**, no una pantalla de disponibilidad. La tesis es que el patrimonio y la disponibilidad de Ardua **no son datos observables sino resultados de una fórmula**, y la fórmula depende de decisiones aún no cerradas (legales, contables, de management). El prototipo debe permitir **mover perillas** (configurar la fórmula) y ver cómo cambia solo la parte derivada sobre los mismos eventos fijos.

## Separación dado / derivado (columna vertebral)

| Plano | Qué es | ¿Cambia con las perillas? |
|---|---|---|
| **Lo dado** | El físico en bancos (Capa 0) y lo que se le debe a cada cliente (obligaciones de custodia, Capa 1) | **No.** Son hechos. Constantes en todos los escenarios. |
| **Lo derivado** | Cuánto es patrimonio de Ardua, cuánto de cada sociedad, cuánta disponibilidad hay, cómo consolida el grupo | **Sí.** Se recalcula según la fórmula (perillas) activa. |

El contraste visual entre estos dos planos es el corazón del prototipo: al mover una perilla, lo dado permanece idéntico y solo lo derivado se mueve.

## Modelo de capas

- **Capa 0 — Físico.** Saldos reales por `Sociedad → Estructura → Cuenta → Moneda`. Conciliable contra el mundo. Es lo dado.
- **Capa 1 — Propiedad.** A quién pertenece cada peso: obligación con cliente / obligación intercompany / patrimonio propio / pendiente de asignar. Las obligaciones de cliente son dadas; el patrimonio propio es derivado.
- **Capa 2 — Disponibilidad.** "Cuánto puedo usar". Derivado.

**Regla maestra:** la suma de la Capa 1 debe igualar la Capa 0 por moneda, **después** de resolver la conversión FX. El prototipo muestra esta ecuación y la mantiene cuadrada; si una combinación de perillas la descuadra, lo muestra explícitamente (es información, no un bug).

## Monedas

- **Custodia** (Ardua holdea): USDC, EURC, ARS.
- **Exótica** (entra físicamente, NO se custodia): BRL. Cuando entra BRL, al cliente se le acredita una moneda de custodia; el BRL queda como físico real en el banco.

## La regla unificadora R1

> **Toda obligación tiene una moneda de denominación. El resultado de cualquier conversión entre la moneda física y la moneda de denominación pertenece a quien tiene la obligación denominada a su favor.**

Unifica tres fenómenos que parecían distintos:
- **Depósito exótico** (cliente manda BRL, recibe USDC): la obligación con el cliente está denominada en USDC. El spread entre el valor del BRL y el USDC reconocido es de Ardua → fees.
- **Recaudación intercompany**: la obligación está denominada en ARS o USD según contrato → el resultado FX es de quien tenga la denominación.
- **Depósito en moneda de custodia o paridad asumida**: la obligación está denominada en la misma moneda recibida → no hay resultado FX.

Corolario de simetría: **beneficio y pérdida de una conversión van siempre al mismo titular.** No se puede asignar la ganancia a uno y la pérdida a otro.

## La frontera firme vs pendiente (concepto central, aporte de Producto)

- **Disponibilidad firme.** Físico en moneda de custodia, aplicable directo a obligaciones de esa misma moneda. Conciliable, sin riesgo de valuación. Es el dato operativo de Tesorería.
- **Físico pendiente de aplicación.** Valor real en moneda no custodiada (BRL), que se vuelve disponibilidad firme recién al convertirse. Se muestra en su moneda real + valuación de referencia **multi-columna** (≈X USDC / ≈Y EURC / ≈Z ARS), etiquetado como ESTIMACIÓN, separado de la disponibilidad firme. Representa la posición FX abierta.

Consecuencia (C1): **no existe un número único de disponibilidad total del grupo.** La disponibilidad es nativa por moneda; cualquier consolidado a moneda única es estimación de management, no dato operativo.

---

## Las 7 perillas (núcleo interactivo)

Cada perilla es un control siempre visible. Cambiarla recalcula la parte derivada en vivo. Marcar visualmente cuáles están "inclinadas por Producto" y cuáles "abiertas" (pendientes de validación legal/contable/management).

### P-FX1 · Tratamiento del físico exótico (BRL)
- **(a) Limbo** — el BRL no cuenta como disponibilidad hasta convertirse; se muestra aparte, no suma.
- **(b) Valuado a referencia** — el BRL se valúa multi-columna como "físico pendiente de aplicación", etiquetado estimación. **[inclinada por Producto: b]**
- Enciende en: E3. Exige: una moneda fuera del set de custodia + bloque visual "físico pendiente" + fuente de TC de referencia.
- Valida: Belén (contable) + Facundo (TC).

### P-FX2 · Destino del resultado de conversión (spread FX)
- **(a) Del titular de la moneda de denominación** (regla R1 pura).
- **(b) Pass-through** (Ardua queda neutra).
- **[inclinada por Producto: a, para depósitos de cliente]**
- Enciende en: E3, E4. Exige: que el evento de conversión tenga destino de spread configurable, no clavado a "Ingresos de Ardua".
- Valida: Belén.

### P-IC1 · Moneda de denominación de la recaudación intercompany
- **(a) Moneda física recaudada** (ej. ARS) → riesgo y resultado FX del recaudador.
- **(b) Moneda de custodia objetivo** (ej. USDC) → riesgo y resultado FX del mandante.
- **[abierta — depende del contrato de recaudación]**
- Enciende en: E4. Exige: atributo `moneda_denominacion` en el legajo/evento de recaudación que dirige el resultado del FX.
- Valida: Juan (contrato) + Belén (denominación contable).
- Nota: beneficio y pérdida van juntos al mismo titular (simetría).

### P-IC2 · Tipado del legajo de recaudación
- **(a) Sub-tipo de custodia** (con atributo `origen`) → 2 tipos totales: custodia + cuenta corriente.
- **(b) Tipo propio separado.**
- **[abierta]**
- Enciende en: E4, E6. Exige: que el legajo tenga `tipo` + `origen` como campos distintos.
- Valida: Juan + Belén.
- Nota: el modelo no se rompe en ninguna posición — es etiqueta vs tipo, sin cambio de signos ni reglas de neteo.

### P-CON1 · Unidad de consolidación (selector siempre visible)
- **(a) Por sociedad** — intercompany VISIBLE como activo/pasivo de cada sociedad. Modo operativo de Tesorería.
- **(b) Grupo consolidado** — intercompany ELIMINADO; solo terceros reales + físico real. Modo management.
- **(c) Sub-grupo / jurisdicción** — intermedio (puede quedar deshabilitado / "próximamente" en V1).
- Enciende en: E5, E6 (y transversal). Exige: selector visible en todo momento; la eliminación se apoya en P-IC2; el consolidado multimoneda hereda el TC de P-FX1(b).
- Valida: Belén + Federico (interés en modo c).
- **Regla: ninguna pantalla muestra un número sin declarar su unidad de consolidación.**

### P-DISP1 · Cómo se responde "cuánto puedo usar"
- **(a) Resta impuesta** — el sistema calcula Físico − Obligaciones − Pendientes y lo llama "capacidad operativa" (lo que clava el discovery vigente, anclaje #30).
- **(b) Solo componentes** — muestra físico, obligaciones y compromisos lado a lado SIN veredicto; el humano decide. **[inclinada por Producto: b]**
- Enciende en: E9 (y transversal). Exige: poder apagar/encender el cálculo del veredicto.
- Valida: decisión de Producto ya tomada (b); se mantiene como perilla para contrastar con (a) en la mesa.

### Dependencias entre perillas (podan el espacio de combinaciones)
- **P-CON1(b)** requiere **P-IC2** definido (necesita saber qué eliminar) y, si hay físico exótico, **P-FX1(b)** (necesita TC para consolidar multimoneda).
- **P-IC1 y P-FX2** son la misma decisión de fondo (de quién es el resultado FX) vista desde dos ángulos; deben quedar coherentes entre sí.

---

## Los 13 eventos fijos (línea de tiempo encadenada T0→T12, estado acumulado)

Estos son lo dado. No cambian al mover perillas. Lo que cambia es cómo cada fórmula los interpreta. El orden importa (estado acumulado).

| # | Evento | Qué pasa | Perillas que activa |
|---|---|---|---|
| **E0** | Estado inicial | 4 sociedades, cuentas físicas con saldo, ~6 clientes con obligaciones multimoneda, y titular Ardua (ID AS000000) con sus 4 sub-legajos de propósito | — |
| **E1** | Depósito en moneda de custodia | Cliente deposita USDC, se acredita USDC 1:1 | Control (ninguna debe alterarlo) |
| **E2** | Depósito USD fiat, paridad asumida | Cliente deposita USD fiat, se acredita USDC 1:1; el físico guarda USD (distinto de USDC); casillero micro-spread on-ramp (normalmente 0) | Dimensión 2 |
| **E3** | Depósito en moneda exótica (BRL) con Quote | Cliente deposita BRL, se acredita USDC al TC de la Quote; spread según P-FX2; el BRL queda físico | **P-FX1, P-FX2** |
| **E4** | Recaudación intercompany con conversión y beneficio | Haz Pagos recauda ARS a cuenta y orden de Circuit Pay, acumula, hace FX a USD, transfiere a CP la obligación; beneficio según P-IC1 | **P-IC1, P-IC2, P-FX2** |
| **E5** | Cuenta corriente intercompany sin interés | HP transfiere USDC propios a CP, sin interés ni plazo (saldo bidireccional neteable) | **P-CON1** |
| **E6** | Sociedad como cliente de otra | Astra Ventures opera como cliente de Haz Pagos (deposita, se le acredita custodia) | **P-IC2, P-CON1** |
| **E7** | Pendiente de asignar → asignación | Entra físico sin cliente identificado (cuenta técnica), luego se identifica y reclasifica a obligación | — |
| **E8** | Movimiento entre cuentas propias, misma sociedad | Reubicación física dentro de una sociedad, sin cliente; solo cambia composición del físico | — |
| **E9** | Retiro programado → ejecución | Solicitud con fecha (compromiso, sin físico aún) y luego ejecución (sale plata real) | Capa 2 (compromisos con fecha) |
| **E10** | Egresos de patrimonio propio | Pago a proveedor y pago de sueldos, imputados a sub-legajos de Ardua (gastos, ardua-pay) | Sub-legajos de Ardua |
| **E11** | Fee cobrado a cliente | Aterriza en el sub-legajo "fees" de Ardua; conecta el resultado FX de E3/E4 con su destino | Sub-legajos de Ardua |
| **E12** | Aporte de capital propio | Entran fondos propios desde afuera del grupo; sube físico y patrimonio sin generar obligación con clientes | — |

## Sociedades

- **Haz Pagos (HP)** — Argentina, opera ARS.
- **Circuit Pay (CP)** — Argentina, opera USDC.
- **Ardua Solutions Corp (ASC)** — Canadá, opera USDC.
- **Astra Ventures (AV)** — Polonia, opera EURC.
- **Titular "Ardua" (ID AS000000)** — NO es cliente externo; es el grupo como titular, con **sub-legajos de propósito** (clasificadores de uso del patrimonio propio, NO cuentas físicas): `operativa gastos`, `operativa ardua pay`, `fees`, `loans`. El sub-legajo `loans` es activo a cobrar; los otros son bolsillos de patrimonio.

## Estructura de UI esperada

1. **Panel de perillas** siempre visible (lateral o superior colapsable): las 7 perillas con sus posiciones; marcar "inclinada por Producto" vs "abierta".
2. **Selector de unidad de consolidación** (P-CON1) destacado: toda cifra declara bajo qué unidad se muestra.
3. **Control de línea de tiempo**: navegar E0→E12 (anterior / siguiente / reset), indicador de paso y barra de progreso. Estado acumulado.
4. **Tarjeta de evento actual**: qué pasa, qué capas toca, qué perillas activa.
5. **Tres perspectivas sincronizadas** (tabs): Operaciones (obligaciones por cliente/titular), Tesorería (físico por sociedad→cuenta + físico pendiente separado), Contabilidad (asientos de partida doble, 1 por sociedad, intercompany desdoblado en 2).
6. **Posición por capas**: Capa 0 (físico, dado), Capa 1 (propiedad, parte dada parte derivada), Capa 2 (disponibilidad, derivada). Distinguir con color/etiqueta qué es dado y qué derivado.
7. **Bloque "físico pendiente de aplicación"**: el BRL en su moneda real + valuación multi-columna (si P-FX1=b), separado de la disponibilidad firme y etiquetado ESTIMACIÓN.
8. Cuando **P-DISP1=b**: NO mostrar número de "capacidad operativa"; mostrar los componentes (físico / obligaciones / compromisos) lado a lado sin veredicto.

## Requisitos técnicos

- HTML+CSS+JS puro, todo en un archivo, sin CDNs ni librerías.
- Estado en memoria (NO localStorage / sessionStorage).
- Cambiar perillas o navegar eventos recalcula y re-renderiza en vivo.
- Números con `tabular-nums`, formato legible (K/M/B), deltas con signo y color.
- Responsive, dark mode vía `prefers-color-scheme`.
- Montos realistas pero claramente ficticios. La regla maestra (Capa1 = Capa0 post-FX) debe cuadrar; si una combinación de perillas la descuadra, mostrarlo explícitamente.
- Comentar en el código qué es DADO y qué DERIVADO, y qué perilla afecta cada cálculo.

## Lo que NO debe hacer

- NO clavar la fórmula de disponibilidad como única verdad (error del prototipo anterior).
- NO mostrar el spread FX siempre como "ingreso de Ardua" sin respetar P-FX2 / P-IC1.
- NO mezclar lo dado con lo derivado sin distinguirlos visualmente.
- NO incluir modelos de datos, contratos de API ni decisiones de implementación técnica — es prototipo conceptual de Producto.

## Referencia visual

`fin-tesoreria-disponibilidades.html` (misma carpeta): iteración anterior. Tomar SOLO paleta, layout de tres perspectivas y motor de eventos como referencia visual; NO como verdad conceptual — este prototipo parte de un modelo distinto (físico multimoneda + comparación de fórmulas).
