---
name: Migración del Roadmap de Tecnología — Levantamiento y traducción al modelo de Producto
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-09
updated_at: 2026-06-10
propagates_to: []
---

# Migración del Roadmap de Tecnología — Levantamiento y traducción al modelo de Producto

## Objetivo

Levantar el contenido del **Roadmap IT 2026** que manejaba Tecnología, determinar **qué está hecho y qué no**, y en función de eso traducir cada ítem al modelo de Producto: iniciativas (PWI), discoveries y/o requerimientos según corresponda.

Concretamente, esta investigación debe producir:

1. Un **inventario completo** de los ítems del roadmap IT, mapeados a la taxonomía del core de Producto.
2. Un **relevamiento de estado** ítem por ítem: hecho / parcial / no iniciado.
3. Un **criterio de traducción** de cada ítem al artefacto de Producto que corresponda (iniciativa PWI vs. discovery vs. requerimiento), evitando duplicar lo que ya vive en `features/`.
4. La **identificación de gaps de taxonomía** entre las etiquetas del roadmap IT y las apps del core.

## Contexto

Recientemente se logró la **unificación conceptual del Roadmap de Producto y Tecnología**. A partir de ahora la **responsabilidad del roadmap es de Producto**.

El roadmap previo —el que manejaba Tecnología— vive en Notion:
[Roadmap IT 2026](https://app.notion.com/p/Roadmap-IT-2026-33ae8880def680599ed6f34f9522f08a)

Ese documento es un roadmap high-level organizado por trimestre (Q1, Q2, Q3+Q4) con ítems etiquetados por área (`OPS`, `APP`, `OPS/APP`, `LEX`, `TRD`, `TES`, `TES/OPS`, `PSP`, `MISC`). **No** trae un campo explícito de estado (hecho/no hecho) por ítem — el estado debe relevarse contra la realidad: lo que ya está shippeado y documentado en `features/`, los discoveries existentes, y validación directa con Tecnología donde haga falta.

Este discovery es el **insumo de trabajo** del proceso de migración. No es producto-scoped (no investiga una hipótesis sobre una app concreta), sino que investiga **cómo migramos y reconstruimos un instrumento de gestión** — por eso vive como discovery de proceso/metodología con `features: []`.

---

## Mapeo de taxonomía: etiquetas del roadmap IT → apps del core

El roadmap IT usa etiquetas que **no mapean 1:1** con la taxonomía del core de Producto (TRD, OPS, LEX, CLP, CTF). Cruce confirmado en esta sesión:

| Etiqueta en roadmap IT | App del core | Nota |
|---|---|---|
| `OPS`, `APP`, `OPS/APP` | **OPS** | `APP` se trata como OPS (es la app operativa) |
| `PSP` | **OPS** | Módulo interno de OPS |
| `LEX` | **LEX** | — |
| `TRD` | **TRD** | — |
| `TES`, `TES/OPS` | **CTF** | Tesorería migra a CTF (Contabilidad, Finanzas y Tesorería) |
| `MISC` | transversal / integraciones | Caso por caso (puede ser entidad, workflow, integración cross-core) |

### Dependencia flaggeada: rename FIN → CTF

**CTF (Contabilidad, Finanzas y Tesorería) reemplaza a FIN.** La app de Finanzas pasa a llamarse CTF y absorbe Tesorería.

Esto es un **cambio de taxonomía del core** que excede el alcance de este discovery y queda gated por el HoP. Impacto pendiente de ejecutar como migración aparte:

- `framework/` — actualizar la taxonomía del core (FIN → CTF) donde esté declarada.
- `features/fin/` → `features/ctf/` — renombrar carpeta y feature files.
- Discoveries con prefijo `fin-*` (`fin-discovery.md`, `fin-reporteria-pnl-discovery.md`, `fin-tesoreria-disponibilidades-discovery.md`, `fin-automatizacion-invoices-discovery.md`) — revisar naming y `features:`.

> En este discovery se usa **CTF** como nombre canónico de la app. La base de conocimiento todavía tiene los archivos `fin-*` sin renombrar — esa migración no se ejecuta acá.

### Gap abierto del mapeo

- **`MISC`** no es una app: agrupa integraciones (Zenus, FV Bank, Power BI, HubSpot) que deben resolverse individualmente como entidad, workflow o integración transversal durante el relevamiento.

---

## Inventario del roadmap IT 2026 — relevamiento contra PWI

Transcripción estructurada del roadmap de Notion, con cada ítem mapeado a su app del core y **cruzado contra el universo de PWI** (76 issues relevados el 2026-06-10 vía JQL `project = PWI ORDER BY key ASC`).

Leyenda de estado:
- **Hecho** — PWI en `DONE`.
- **En dev** — PWI en `SENT TO DEV`, `READY FOR DEV`, `IN DEVELOPMENT`, `IN ANALYSIS`.
- **Bloqueado** — PWI en `BLOCKED`.
- **Parcial** — existe PWI que cubre una parte del ítem, pero no su alcance completo.
- **Sin PWI** — no se encontró ticket; candidato a trabajo nuevo (o ejecutado fuera de Producto — validar con Tecnología).

> Nota: el cruce se hizo por *summary* de los PWI. Un "Parcial" o "Sin PWI" no afirma que la capacidad no exista en el producto real — afirma que **no hay un PWI que la trackee con ese alcance**. Los casos marcados *validar* requieren confirmación con Tecnología / Facundo.

### Q1 — prácticamente cerrado

| Ítem (roadmap IT) | App core | PWI | Estado |
|---|---|---|---|
| Instrucciones de depósito | OPS | PWI-44 | En dev (READY FOR DEV) |
| Integración TRD–OPS | OPS / TRD | — | Sin PWI explícito · validar |
| PSP lista | OPS (PSP) | PWI-12 | En dev (IN DEVELOPMENT) |
| Movimientos internos automáticos (hazpagos→circuit) | OPS | — | Sin PWI · validar |
| Límites transaccionales operativos | LEX | PWI-20, PWI-41 | En dev |
| Snapshot de mercado / FX pantalla ARS | TRD | — | **Sin PWI · validar con Facundo** |
| Documentación automática (letters, receipts) | OPS | PWI-38 | Hecho (parcial) |
| Matriz de riesgo | LEX | — | Sin PWI · validar |
| Proveedores de liquidez | TRD | PWI-29, PWI-36, PWI-40 | Hecho / En dev |
| Remuneración de saldos ARS | OPS | — | Sin PWI (reaparece en Q3/Q4) |

**Veredicto Q1:** el grueso está hecho o en dev. Quedan 3 ítems sin rastro claro (integración TRD–OPS, movimientos internos automáticos, matriz de riesgo, snapshot FX) — probablemente ejecutados fuera de Producto o nunca iniciados. Requieren confirmación de Tecnología/Facundo, no trabajo de Producto inmediato.

**Fuera de scope Q1 (declarado en el roadmap):** Migración de región · TRD: currencies dinámicas (seleccionar de a pares) · SFTP para teso · LEX todo en nube, totalizador, gestión de archivos mejorada · SWIFT · Statements · Vulnerabilidades.

### Q2 — mayormente tracked; pendientes reales acotados

| Ítem (roadmap IT) | App core | PWI | Estado |
|---|---|---|---|
| Agrupadores | OPS / LEX | PWI-27 | En dev (READY FOR DEV) |
| RFP / RFQ API | OPS | PWI-11, PWI-26 | Bloqueado / En dev |
| Integración Banco de Comercio | OPS (PSP) | — | **Sin PWI** |
| Integración BIND | OPS (PSP) | PWI-12 | En dev (IN DEVELOPMENT) |
| Blacklist | LEX | PWI-17 | En dev |
| RFQ en front portal (USDC/USDT-ARS) | OPS / CLP | PWI-31 | Bloqueado |
| Debitar 0.6% de impuestos | OPS | — | **Sin PWI** |
| Bancos | CTF / OPS | — | Sin PWI · bloqueado por FIN→CTF |
| Gestión cuentas nostro / rebalanceo | CTF / OPS | — | **Sin PWI** · bloqueado por FIN→CTF |
| Bridge virtual accounts | OPS | — | Sin PWI explícito · validar |
| Bridge onboarding | LEX | — | Sin PWI explícito · validar |
| Monitoreo transaccional (Worldcheck/OFAC/Elliptic) | OPS / LEX | PWI-33 | Parcial (solo screening de contrapartes) |
| Posición de mesa unificada | TRD | PWI-30 | Parcial (Panel de Gestión Mesa) |
| Integración COELSA: central de fraude | LEX | — | **Sin PWI** |
| Integración Convera | OPS | — | **Sin PWI** (solo bandejas en PWI-15) |
| Integración Bitgo | OPS | — | **Sin PWI** |
| Reportes regulatorios (UIF/ARCA) | LEX | PWI-22, PWI-32 | En dev |
| Earnings | OPS | PWI-24 | TO DO (Earn FCI / AdCap) |
| Motor de precios (APE) básico | TRD | PWI-26, PWI-80 | En dev |
| Comandas (bandejas) | OPS | PWI-15 | Parcial (framework de acciones) |
| Sección de trades | OPS | PWI-19 | Parcial (export de operaciones) |
| Payment details (comprobantes) | OPS | PWI-38 | Hecho |
| Transfer out ARS autogestionado | OPS | PWI-59 | Parcial / Bloqueado (controles de ejecución) |
| Dashboard de agrupadores (low) | OPS | — | Sin PWI |
| Fees por cliente (low) | OPS | — | Sin PWI |

**Veredicto Q2:** más fragmentado de lo esperado. No son 3 pendientes — son ~10 sin ticket más varios "parciales" (un PWI cubre parte del ítem del roadmap pero no su alcance completo). Los pendientes más limpios y accionables: **Debitar 0.6% impuestos**, **Convera**, **Bitgo**, **COELSA**, **Banco de Comercio**, **Dashboard de agrupadores**, **Fees por cliente**.

### Q3 + Q4 — terreno virgen (foco principal de la migración)

| Ítem (roadmap IT) | App core | PWI | Estado |
|---|---|---|---|
| Integración NetSuite | OPS / CTF | — | Sin PWI · bloqueado por FIN→CTF |
| Lógica de swaps automática (Deduction/Addition) | OPS | — | **Sin PWI** |
| Control de costos por contraparte | OPS | — | **Sin PWI** |
| Infraestructura API básica (CVU collect, carga de pagos) | OPS | — | **Sin PWI** |
| Segmentación por clusters | LEX | — | **Sin PWI** |
| API de onboarding | LEX | PWI-69, PWI-70 | Parcial / Bloqueado (Centaurus) |
| Revalidación periódica (AiPrise) | LEX | PWI-67 | Parcial / En dev |
| Motor de precios ARS (base) | TRD | PWI-26 | En dev (relacionado) |
| RFQ API | TRD | PWI-11 | Bloqueado |
| Bots con stock dinámico | TRD | — | **Sin PWI** |
| Integraciones Zenus, FV Bank | transversal (MISC) | — | **Sin PWI** |
| Bandeja de asignación de depósitos | OPS | PWI-15 | Parcial |
| Remuneración de saldos crypto | OPS | — | **Sin PWI** |
| Retiros cripto autogestión con bandeja | OPS | PWI-59 | Parcial / Bloqueado |
| Pago de servicios | OPS | — | **Sin PWI** |
| Earnings | OPS | PWI-24 | Parcial (TO DO) |
| Status / Health del sistema | OPS | PWI-60 | Parcial (Observabilidad) |
| Autogestión de documentación y datos | OPS | — | **Sin PWI** |
| QR interoperable | OPS | — | **Sin PWI** |
| Wallets por cliente | OPS | — | **Sin PWI** |
| Automatización de contratos (DocuSign) | LEX | — | **Sin PWI** |
| Actualización automática de T&C | LEX | — | **Sin PWI** |
| Onboardings automáticos en partners | LEX | — | **Sin PWI** |
| Comando y monitoreo avanzado de bots | TRD | — | **Sin PWI** |
| Power BI + HubSpot | transversal (MISC) | PWI-54 | Parcial (solo HubSpot Integration Hub) |

**Veredicto Q3/Q4:** ~18 ítems sin ningún tracking. Este es el roadmap real a construir y el foco de la migración hacia adelante.

### Síntesis del relevamiento

- **Q1:** cerrado salvo 3-4 ítems sin rastro que requieren validación con Tecnología (no trabajo de Producto inmediato).
- **Q2:** mayormente en dev; pendientes acotados (~7 sin PWI claro, ~5 parciales).
- **Q3/Q4:** terreno virgen (~18 sin PWI). **Foco principal.**
- **Lección estructural:** un ítem del roadmap ≠ un requerimiento. Varias capacidades grandes (motor de precios, infra API, wallets por cliente, RFQ API) se descompondrán en múltiples PWI. La agrupación natural es por **iniciativa/tema**, no por trimestre (los Q del roadmap IT perdieron sentido al pasar a Producto).

### Nueva taxonomía de iniciativas — orientada a funcionalidad

> **Decisión del HoP (2026-06-10):** las iniciativas actuales del tablero PWI (Epics PWI-1 a PWI-5, etc.) **no se toman como base**. Estaban orientadas a *idea* (Ardua Analytics, Ardua Growth, Ardua 4x...). El nuevo roadmap exige iniciativas orientadas a **funcionalidad**. Los Epics existentes se **refactorizan** para adecuarse a esta nueva taxonomía — ese refactor es trabajo aparte (ver Próximos pasos).

Set de iniciativas definido por el HoP para alojar los ítems pendientes del roadmap (Q2 residual + Q3/Q4):

| # | Iniciativa | Ítems del roadmap que absorbe (tentativo) | Notas / dudas |
|---|---|---|---|
| 1 | **RFQ Gateway** | RFP/RFQ API · RFQ portal (USDC/USDT-ARS) · Motor de precios APE · Motor de precios ARS · RFQ API | Absorbe la familia Prime Desk RFQ ya existente (PWI-11, 26, 30, 31, 34, 80) |
| 2 | **Infraestructura Transversal** | Alertas · Dashboard · Acciones · Vistas · Inbox · Reportes · Observabilidad / Status-Health · Infra API básica (CVU collect) | El set transversal del core (PWI-47–52, 60) |
| 3 | **Integraciones** | HubSpot · Bridge (virtual accounts + onboarding) · Bitgo · Convera · COELSA · NetSuite | ¿Zenus / FV Bank también acá? ¿AiPrise (revalidación)? — _por aclarar_ |
| 4 | **PSP** | Integración BIND · Banco de Comercio · Impuesto a los Débitos y Créditos (ex "0.6% impuestos") | ¿Bancos va acá o a CTF? — _por aclarar_ |
| 5 | **CTF** | Disponibilidades · Movimientos Nostro | Bloqueado por migración FIN→CTF. ¿Remuneración de saldos / Bancos? — _por aclarar_ |
| 6 | **CLP (Web App)** | Home · Trades (Quotes) · Transactions (Fondos) · Deposits/Withdrawals · Earnings | Refactor CLP (ex PWI-77) |
| 7 | **Mobile App** | _(sin ítems directos del roadmap IT)_ | Iniciativa nueva — alcance a definir |
| 8 | **Posición Unificada de la Mesa** | Posición de mesa unificada (PWI-30 parcial) | ¿Bots (stock dinámico, comando avanzado) van acá o a RFQ Gateway? — _por aclarar_ |
| 9 | **Dashboard del Agrupador** | Dashboard de agrupadores · Registro de TC del agrupador (PWI-13) | Agrupadores (PWI-27) ¿acá o transversal? — _por aclarar_ |
| 10 | **Reportes Regulatorios (UIF/ARCA)** | Reportes regulatorios automáticos (PWI-22, 32) | **Gated por los módulos transversales** (depende de Infraestructura Transversal) |
| 11 | **Monitoreo Transaccional** | Worldcheck/OFAC/Elliptic · Screening de contrapartes (PWI-33) | ¿Blacklist (PWI-17) va acá o a LEX? — _por aclarar_ |

### Ítems del roadmap sin iniciativa asignada todavía — parking de temas a definir

> Anotados acá para no perderlos de vista. El HoP los ubica **ítem por ítem** en sesiones siguientes. No se asume destino.

- **OPS sueltos:** Lógica de swaps automática · Control de costos por contraparte · QR interoperable · Wallets por cliente · Pago de servicios · Autogestión de documentación y datos · Remuneración de saldos (ARS/crypto) · Retiros cripto autogestión con bandeja · Bandeja de asignación de depósitos · Fees por cliente · Transfer out ARS autogestionado · Comandas.
- **LEX sueltos:** Segmentación por clusters · API de onboarding · Automatización de contratos (DocuSign) · Actualización automática de T&C · Onboardings automáticos en partners · Revalidación periódica AiPrise.
- **Otros:** Zenus / FV Bank · Power BI · Bots (stock dinámico, comando avanzado) · Bancos.

> **Pendiente de definición del HoP:** la lista de 11 iniciativas no cubre el grueso de los ítems OPS y LEX de Q3/Q4. Falta decidir si se declaran iniciativas **OPS** y **LEX** propias, o si esos ítems se reparten entre las 11 existentes (p. ej. varios OPS a Infraestructura Transversal). El HoP lo aclara ítem por ítem en sesiones siguientes.

---

## Hipótesis y preguntas abiertas

1. **¿Cuánto del roadmap IT ya está shippeado y vive en `features/`?** Varios ítems Q1/Q2 tienen discoveries concluidos o feature files (p. ej. `trd-proveedores-de-liquidez`, `ops-deposit-instructions`, `prime-desk-rfq-gateway` para RFQ). El relevamiento debe cruzar cada ítem contra `features/` y `discoveries/` antes de generar trabajo nuevo, para no duplicar.

2. **Criterio de traducción a artefacto de Producto.** Para cada ítem no-hecho hay que decidir:
   - **¿Ya validado y claro?** → requerimiento directo (PWI) o feature spec.
   - **¿Ambiguo / sin problema validado?** → discovery primero (regla discovery-first del framework).
   - **¿Capacidad grande multi-requerimiento?** → iniciativa PWI que agrupa.

3. **Ítems con doble etiqueta (`OPS`+`LEX`, `TES/OPS`).** Agrupadores, Blacklist, Monitoreo transaccional, Bancos, Nostro: definir qué app es dueña y cuál es colaboradora. Probable que se partan en requerimientos por app.

4. **`MISC` / integraciones.** Zenus, FV Bank, Power BI, HubSpot: resolver caso por caso si son entidad (`entities/`), workflow, o integración transversal. HubSpot ya tiene `hubspot-integration-discovery.md` en curso.

5. **Resolución de la dependencia FIN → CTF** antes de generar cualquier feature/discovery sobre Tesorería, para no crear archivos en una taxonomía que está por cambiar.

---

## Próximos pasos

1. **Aclarar la asignación de ítems huérfanos** — el HoP ubica ítem por ítem los OPS/LEX sueltos y decide si se declaran iniciativas OPS y LEX propias.
2. **Refactor de los Epics PWI existentes** — adecuar los Epics actuales (PWI-1 a PWI-5, etc., orientados a idea) a la nueva taxonomía de iniciativas orientada a funcionalidad. Trabajo de Jira aparte.
3. **Resolver la migración FIN → CTF** con el HoP como paso bloqueante para los ítems de la iniciativa CTF (Disponibilidades, Nostro).
4. **Clasificación por artefacto** — para cada ítem no-hecho ya asignado a una iniciativa, decidir el artefacto destino (discovery / requerimiento) según el criterio discovery-first.
5. **Generar las iniciativas y discoveries** derivados, propagando este discovery hacia ellos.

---

## Referencias

- Fuente origen: [Roadmap IT 2026 (Notion)](https://app.notion.com/p/Roadmap-IT-2026-33ae8880def680599ed6f34f9522f08a)
- Discoveries relacionados ya existentes: `trd-proveedores-de-liquidez-discovery.md`, `ops-deposit-instructions-discovery.md`, `prime-desk-rfq-gateway-discovery.md`, `hubspot-integration-discovery.md`, `aiprise-liveness-check-discovery.md`, `trd-quotes-discovery.md`.
