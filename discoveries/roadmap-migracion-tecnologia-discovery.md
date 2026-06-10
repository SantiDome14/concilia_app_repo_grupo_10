---
name: Migración del Roadmap de Tecnología — Levantamiento y traducción al modelo de Producto
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-09
updated_at: 2026-06-09
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

## Inventario crudo del roadmap IT 2026

Transcripción estructurada del roadmap de Notion, con cada ítem mapeado a su app del core según la tabla de arriba. **El estado de cada ítem está pendiente de relevar** (la fuente no lo trae explícito) — se completará la columna `Estado` durante el relevamiento ítem por ítem.

### Q1

| Ítem (roadmap IT) | Etiqueta original | App core | Estado |
|---|---|---|---|
| Instrucciones de depósito | OPS/APP | OPS | _por relevar_ |
| Integración TRD–OPS | OPS/APP | OPS | _por relevar_ |
| PSP lista | OPS/APP | OPS (PSP) | _por relevar_ |
| Movimientos internos automáticos (hazpagos a circuit) | OPS/APP | OPS | _por relevar_ |
| Límites transaccionales operativos | LEX | LEX | _por relevar_ |
| Integración TRD–OPS | TRD | TRD | _por relevar_ |
| Snapshot de mercado por operación (FX pantalla en ARS) | TRD | TRD | _por relevar_ |
| Documentación automática (letter of client, conf letter, crypto exch receipt) | OPS/APP | OPS | _por relevar_ |
| Matriz de riesgo | LEX | LEX | _por relevar_ |
| Proveedores de liquidez | TRD | TRD | _por relevar_ |
| Remuneración de saldos ARS | OPS/APP | OPS | _por relevar_ |

**Fuera de scope Q1 (declarado en el roadmap):** Migración de región · TRD: currencies dinámicas (seleccionar de a pares) · SFTP para teso · LEX todo en nube, totalizador, gestión de archivos mejorada · SWIFT · Statements · Vulnerabilidades.

### Q2

**Pendientes arrastrados de Q1:**

| Ítem | Etiqueta original | App core | Estado |
|---|---|---|---|
| Matriz de riesgo | LEX | LEX | _por relevar_ |
| Proveedores de liquidez | TRD | TRD | _por relevar_ |
| Remuneración de saldos ARS | OPS | OPS | _por relevar_ |

**Nuevos Q2:**

| Ítem | Etiqueta original | App core | Estado |
|---|---|---|---|
| Agrupadores | OPS, LEX | OPS / LEX | _por relevar_ |
| RFP / RFQ API | OPS | OPS | _por relevar_ |
| Integración Banco de Comercio | PSP | OPS (PSP) | _por relevar_ |
| Integración BIND (en nueva PSP) | PSP | OPS (PSP) | _por relevar_ |
| Blacklist | LEX, PSP | LEX / OPS | _por relevar_ |
| RFQ en front portal (USDC-ARS y USDT-ARS) | APP | OPS | _por relevar_ |
| Debitar el 0.6% de impuestos | OPS | OPS | _por relevar_ |
| Bancos | TES/OPS | CTF / OPS | _por relevar_ |
| Gestión de cuentas nostro (movimientos y rebalanceo de saldos) | TES/OPS | CTF / OPS | _por relevar_ |
| Bridge virtual accounts | OPS | OPS | _por relevar_ |
| Bridge onboarding | LEX | LEX | _por relevar_ |
| Monitoreo transaccional ingresos/egresos (Worldcheck / OFAC; ELLIPTIC) | OPS, LEX | OPS / LEX | _por relevar_ |
| Posición de mesa unificada | TRD | TRD | _por relevar_ |
| Integración COELSA: Central de fraude | LEX | LEX | _por relevar_ |
| Integración Convera | OPS | OPS | _por relevar_ |
| Integración Bitgo | OPS | OPS | _por relevar_ |
| Reportes regulatorios automáticos (UIF / ARCA) | LEX | LEX | _por relevar_ |
| Earnings | APP | OPS | _por relevar_ |
| Motor de precios (APE) versión básica | TRD | TRD | _por relevar_ |
| Comandas (bandeja pre-asignación ingresos Bridge/Convera; bandeja ejecución de retiros) | OPS | OPS | _por relevar_ |
| Sección de trades | APP | OPS | _por relevar_ |
| Payment details (sección de comprobantes) | APP | OPS | _por relevar_ |
| Transfer out ARS autogestionado (límites por monto/tiempo) | OPS/APP | OPS | _por relevar_ |
| Dashboard de agrupadores (low) | APP | OPS | _por relevar_ |
| Fees por cliente (low) | OPS/APP | OPS | _por relevar_ |

### Q3 + Q4

| Ítem | Etiqueta original | App core | Estado |
|---|---|---|---|
| Integración con NetSuite (Q3) | OPS/APP | OPS / CTF | _por relevar_ |
| Lógica de swaps automática (Deduction / Addition) | OPS/APP | OPS | _por relevar_ |
| Control de costos por contraparte | OPS/APP | OPS | _por relevar_ |
| Infraestructura API básica (CVU collect, carga de pagos) | OPS/APP | OPS | _por relevar_ |
| Segmentación por clusters | LEX | LEX | _por relevar_ |
| API de onboarding | LEX | LEX | _por relevar_ |
| Revalidación periódica (AIPrise) | LEX | LEX | _por relevar_ |
| Motor de precios ARS (base / inicial) | TRD | TRD | _por relevar_ |
| RFQ API | TRD | TRD | _por relevar_ |
| Bots con stock dinámico | TRD | TRD | _por relevar_ |
| Integraciones: Zenus, FV Bank | MISC | transversal | _por relevar_ |
| Bandeja de asignación de depósitos | OPS/APP | OPS | _por relevar_ |
| Remuneración de saldos crypto | OPS/APP | OPS | _por relevar_ |
| Retiros cripto autogestión con bandeja | OPS/APP | OPS | _por relevar_ |
| Pago de servicios | OPS/APP | OPS | _por relevar_ |
| Earnings | OPS/APP | OPS | _por relevar_ |
| Status / Health del sistema | OPS/APP | OPS | _por relevar_ |
| Autogestión de documentación y datos | OPS/APP | OPS | _por relevar_ |
| QR interoperable | OPS/APP | OPS | _por relevar_ |
| Wallets por cliente | OPS/APP | OPS | _por relevar_ |
| Automatización de contratos (DocuSign) | LEX | LEX | _por relevar_ |
| Actualización automática de T&C | LEX | LEX | _por relevar_ |
| Onboardings automáticos en partners | LEX | LEX | _por relevar_ |
| Comando y monitoreo avanzado de bots | TRD | TRD | _por relevar_ |
| Power BI + Integración y HubSpot | MISC | transversal | _por relevar_ |

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

1. **Relevamiento de estado ítem por ítem** — cruzar cada fila del inventario contra `features/`, `discoveries/` y Jira (PWI/EWI), y donde no haya evidencia, validar con Tecnología. Completar la columna `Estado`.
2. **Clasificación por artefacto** — para cada ítem no-hecho, asignar el artefacto de Producto destino (iniciativa / discovery / requerimiento) según el criterio del punto 2 de hipótesis.
3. **Resolver la migración FIN → CTF** con el HoP como paso bloqueante para los ítems de Tesorería.
4. **Generar las iniciativas y discoveries** derivados, propagando este discovery hacia ellos.

---

## Referencias

- Fuente origen: [Roadmap IT 2026 (Notion)](https://app.notion.com/p/Roadmap-IT-2026-33ae8880def680599ed6f34f9522f08a)
- Discoveries relacionados ya existentes: `trd-proveedores-de-liquidez-discovery.md`, `ops-deposit-instructions-discovery.md`, `prime-desk-rfq-gateway-discovery.md`, `hubspot-integration-discovery.md`, `aiprise-liveness-check-discovery.md`, `trd-quotes-discovery.md`.
