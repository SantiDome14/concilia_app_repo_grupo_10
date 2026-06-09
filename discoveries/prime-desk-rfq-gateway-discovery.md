---
name: Prime Desk RFQ Gateway · Discovery Document
features: [TRD, CLP]
status: Concluida
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-06-09
---

# Prime Desk RFQ · Discovery Document

> **DISCOVERY CERRADO** — 2026-04-23
> Feature derivada: `features/prime-desk-rfq-gateway.md`
> Resumen de decisiones que sobrevivieron: Arquitectura de 4 capas (CLP → RFQ API → APE) con módulos conectables Quote (TRD) y Client (LEX). Modelo de lotes con contextos GPS/PPS y waterfall de liquidez. Roles MESA_TRADER/MESA_SUPERVISOR con permisos diferenciados validados con Facundo. Alertas separadas a REQ-33 como módulo transversal TRD. 5 requerimientos resultantes: REQ-8 (CLP), REQ-9 (TRD), REQ-30 (APE), REQ-31 (RFQ API) en Ready for Dev; REQ-33 (Notificaciones) en In Review.

---

> Última actualización: 13/04/2026 | Estado: REQ-8, REQ-9, REQ-30, REQ-31 en Ready for Dev — REQ-33 prototipo v1 completo y REQ alineado con prototipo, pendiente validación

---

## 1. Propósito del documento

Este documento consolida el entendimiento actual del sistema Prime Desk RFQ Gateway — su scope funcional por capa, modelo de datos de referencia, decisiones de diseño y estado de los requerimientos asociados. Es la base de continuidad para futuras sesiones de producto sobre este sistema.

---

## 2. Familia de requerimientos — Prime Desk RFQ

> **Nota de nomenclatura (2026-06-09):** la familia se creó originalmente en el proyecto REQ (deprecado). Los tickets vigentes viven en PWI. Mapeo: REQ-8→PWI-31, REQ-9→PWI-30, REQ-30→PWI-26, REQ-31→PWI-11, REQ-33→PWI-34. El resto de este documento conserva la nomenclatura REQ-N como registro histórico de la sesión de discovery.

| Ticket     | Nombre                                                 | Capa                       | Estado en Jira (2026-06-09)  |
| ---------- | ------------------------------------------------------ | -------------------------- | ---------------------------- |
| **PWI-31** | Prime Desk RFQ — Solicitud de Cotización (CLP)         | Web App / cliente          | Blocked                      |
| **PWI-30** | Prime Desk RFQ — Panel de Gestión Mesa (TRD)           | Panel operacional / Mesa   | In Development               |
| **PWI-26** | Prime Desk RFQ — Motor de Precio y Liquidez (APE)      | Motor de precio y liquidez | Ready for Dev                |
| **PWI-11** | Prime Desk RFQ — Orquestador de Cotizaciones (RFQ API) | Capa de orquestación       | Blocked                      |
| **PWI-34** | Prime Desk RFQ — Centro de Notificaciones (TRD)        | Módulo transversal TRD     | Blocked                      |
| **PWI-80** | Prime Desk RFQ — Cálculo de Exposición con Conversión Multi-Asset (APE) | Motor (APE) | In Analysis 🆕               |

**Dependencias:** CLP (PWI-31) y TRD Panel (PWI-30) dependen de RFQ API (PWI-11) y APE (PWI-26). Notificaciones (PWI-34) es independiente del flujo RFQ pero hereda los 4 tipos de alerta definidos en el panel TRD. PWI-80 depende de la infraestructura de price providers del APE (PWI-26) y aporta la 5ª alerta al Centro de Notificaciones (PWI-34).

**Pendiente sin ticket:** Admin BFF — capa de autorización entre TRD y APE. Pendiente de decisión sobre si crear REQ propio o foldearlo en REQ-30.

---

## 3. Criterio de avance por ticket

**REQ-8 — Ready for Dev.** Prototipo CLP v3. 12 ítems: flujo RFQ (1–9), sección Quotes (10), mantenimiento (11), sidebar (12).

**REQ-9 — Ready for Dev.** Prototipo TRD base (trd_rfq_prototype.html). 13 ítems: Lotes de Liquidez (1–10), Clientes/BPS/Grupos (11–13). Alertas separadas a REQ-33.

**REQ-30 y REQ-31 — Ready for Dev.** Sin gaps funcionales.

**REQ-33 — Prototipo v1 listo, alineado con REQ.** Pendiente validación para avanzar a Ready for Dev.

---

## 4. Arquitectura del sistema

```
CLIENTE / API CLIENT
        ↓
    RFQ API (REQ-31)
    └─ Llama al APE, aplica BPS, valida vs Market Reference, construye pre-quotes
            ↓
    APE (REQ-30)
    └─ Swap Price Scheme: lotes GPS/PPS, FUNDS_IN/OUT/RESERVE, waterfall
            ↓
    CONECTABLES
    ├─ Quote Module (TRD) — connectable nativo
    └─ Client Module (LEX) — BPS consultado por RFQ API

MESA → TRD (REQ-9 + REQ-33) → ADMIN BFF → APE
```

---

## 5. Decisiones arquitectónicas incorporadas

| Decisión                                                        | Impacto                                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| APE = Ardua **Price** Engine                                    | Motor de precio y liquidez, no procesador genérico.                             |
| CLP es la Web App del SRS                                       | Canal API directa es paralelo, fuera del scope de REQ-8.                        |
| Pre-quotes son datos de análisis, no entidades operacionales    | No tienen gestión operacional en TRD.                                           |
| La Quote es el compromiso firme                                 | Aceptar pre-quote → CREATE_QUOTE → FUNDS_RESERVE RESERVED→EXECUTED.             |
| "Operaciones Pendientes" eliminado del panel RFQ                | Lifecycle de Quotes gestionado desde módulo Quotes de TRD.                      |
| Alertas separadas a módulo independiente (REQ-33)               | Módulo completo en sidebar TRD, sección "Sistema". Página completa en el main.  |
| Sección "Quotes" (no "Transactions") en CLP                     | Historial unificado RFQ + OTC con estados PENDING/ACCEPTED/COMPLETED/CANCELLED. |
| Dashboard CLP diferido                                          | No es módulo funcional en esta etapa. Iniciativa separada futura.               |
| Roles MESA_SUPERVISOR / MESA_TRADER son propiedades del usuario | Footer del sidebar clickeable para ciclar entre usuarios demo.                  |
| GPS y PPS son contextos diferenciados                           | Formularios, visualización y lógica de pricing distintos.                       |
| external_reference en FUNDS_IN es texto libre                   | Sin adjuntos ni validación de formato en V1.                                    |

---

## 6. Modelo de lotes — Swap Price Scheme

| Contexto                     | Provider               | Precio                      |
| ---------------------------- | ---------------------- | --------------------------- |
| `GLOBAL_PRICE_SETUP` (GPS)   | ARDUA                  | Fijo, definido por la Mesa  |
| `PRICE_PROVIDER_SETUP` (PPS) | BINANCE / BITSO / BYMA | Feed externo en tiempo real |

**Waterfall:** GPS primero. PPS cubre el remanente.
**Snapshot:** `available + reserved + executed = fondeo_total`
**Lifecycle:** `SUSPENDED → (FUNDS_IN) → ACTIVE ↔ SUSPENDED → CLOSED`

---

## 7. Modelo de BPS y exposición por cliente

- Precedencia: CLIENT > GROUP > UNDEFINED
- BPS se aplica por price_line, no sobre el total
- `max_open_exposure`: límite configurado | `current_open_exposure`: en tiempo real desde TRD

### Conversión multi-asset para exposición (PWI-80)

- La exposición se calcula sumando las reservas activas del cliente, cada una convertida al asset de referencia. Ese total es lo que la RFQ API compara contra `max_open_exposure` para decidir el rechazo por `EXPOSURE_LIMIT_EXCEEDED`.
- Modo de conversión por asset: **fija** (valor manual, assets estables) o **feed** (en vivo, fiat volátil — ARS, BRL —, reutilizando los price providers del PPS).
- El modo feed admite una **tasa manual de respaldo** opcional; el motor la usa si el feed está stale o caído al calcular exposición.
- Asset operado **sin tasa configurada**: la operación procede (no se bloquea) pero el motor **genera una alerta** — se elimina el fallback silencioso a 1.0 del SRS, que para fiat volátil medía exposición con error severo.
- La alerta de asset sin tasa se incorpora como **5ª alerta** del Centro de Notificaciones (PWI-34), sobre su arquitectura extensible de tabs.
- **Sin UI en V1:** la configuración de tasas existe como insumo del sistema, consumible por el cálculo; la gestión visual por la Mesa se difiere a iteración futura.

---

## 8. Roles y permisos — Validado con Facundo Vasques

| Acción                  | MESA_TRADER | MESA_SUPERVISOR |
| ----------------------- | ----------- | --------------- |
| Ver lotes               | ✅          | ✅              |
| FUNDS_IN                | ✅          | ✅              |
| FUNDS_OUT < threshold   | ✅          | ✅              |
| FUNDS_OUT > threshold   | ❌          | ✅              |
| Suspender / Reactivar   | ✅          | ✅              |
| Crear / Cerrar lote     | ❌          | ✅              |
| Editar BPS / exposición | ✅          | ✅              |
| Crear / editar grupos   | ❌          | ✅              |

---

## 9. Estado actual de los requerimientos

### REQ-8 — CLP — Ready for Dev ✅

Scope 12 ítems. Ítems 1–9: flujo RFQ. Ítem 10: sección Quotes (RFQ + OTC, filtros, counter badge, modal pre_quote_id). Ítem 11: mantenimiento. Ítem 12: sidebar expandible. Dashboard diferido.

### REQ-9 — TRD Panel — Ready for Dev ✅

Scope 13 ítems. Ítems 1–10: Módulo RFQ Lotes. Ítems 11–13: Clientes BPS/grupos. Alertas → REQ-33.

### REQ-30 — APE — Ready for Dev ✅

### REQ-31 — RFQ API — Ready for Dev ✅

### REQ-33 — Centro de Notificaciones (TRD) — In Review

Prototipo v1 completo y alineado con el REQ. Scope final 8 ítems.

**Scope confirmado:**

- Ítem 1: Sección "Sistema" en sidebar con ítem "Notificaciones" + badge numérico
- Ítem 2: Página completa en el main (mismo patrón de navegación que resto de módulos TRD)
- Ítem 3: Tabs de agrupación por módulo — "RFQ Gateway" activo, "Quotes" y "Clientes" deshabilitados con etiqueta "Pronto"
- Ítem 4: Tarjetas de notificación con CTA primario (navega al recurso) + "Marcar como resuelta"
- Ítem 5: Botón "Resolver todas" en el header de página
- Ítem 6: Estado vacío cuando no hay notificaciones activas
- Ítem 7: 4 tipos de alerta RFQ Gateway (fondeo insuficiente, provider no disponible, alta utilización, alta tasa de rechazo)
- Ítem 8: Arquitectura extensible — nuevos tabs por módulo sin cambios estructurales

**Pendiente:** validación → Ready for Dev

---

## 10. Prototipos

### TRD base — `prototypes/trd/trd_rfq_prototype.html`

Prototipo base de TRD (REQ-9 v5). Todos los módulos funcionales: Quotes, RFQ Lotes, Clientes/Grupos. Usado como base para trd_notif_prototype_v1.html.

### TRD Notificaciones v1 — `prototypes/trd/trd_notif_prototype_v1.html`

**Fecha:** 13/04/2026 | **Base:** trd_rfq_prototype.html

| Elemento                  | Contenido                                                                                            | Estado |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| Sidebar sección "Sistema" | Ítem "Notificaciones" con badge rojo de conteo activas                                               | ✅     |
| Página completa           | Header (título + subtítulo + "Resolver todas") + tabs + tarjetas                                     | ✅     |
| Tabs                      | "RFQ Gateway" activo con badge de conteo; "Quotes" y "Clientes" deshabilitados con etiqueta "Pronto" | ✅     |
| Tarjeta de notificación   | Título + descripción + recurso (lotId · lotName) + CTA primario + "Marcar como resuelta"             | ✅     |
| CTAs                      | "Fondear lote" / "Ver lote" — navegan al módulo RFQ y abren el lote afectado                         | ✅     |
| Marcar como resuelta      | Elimina la tarjeta de la vista y actualiza el badge del sidebar en tiempo real                       | ✅     |
| Resolver todas            | Limpia todas las notificaciones activas del tab en un paso                                           | ✅     |
| Estado vacío              | Mensaje "Sin notificaciones activas. El sistema RFQ opera con normalidad."                           | ✅     |
| Módulos no impactados     | Quotes, RFQ, Clientes, Bots muestran placeholder "Sin cambios en este alcance"                       | ✅     |

### CLP v3 — `prototypes/clp/clp_rfq_prototype_v3.html`

13 escenas RFQ + sección Quotes (RFQ+OTC) + sidebar expandible.

---

## 11. Próximos pasos

| #   | Acción                                                         | Owner | Estado    |
| --- | -------------------------------------------------------------- | ----- | --------- |
| 1   | Validar prototipo REQ-33 y avanzar a Ready for Dev             | HoP   | Pendiente |
| 2   | Decidir si Admin BFF necesita REQ propio o se foldea en REQ-30 | HoP   | Pendiente |
| 3   | Gap CSV export tabla de lotes en REQ-9                         | HoP   | Pendiente |
| 4   | Dashboard CLP — definir como iniciativa separada               | HoP   | Backlog   |

---

## 12. Decisiones de diseño registradas

| Decisión                                      | Detalle                                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Naming compartido "Prime Desk RFQ —"          | Hace visible la relación entre los tickets en el board                                                                        |
| APE y RFQ API como REQs separados             | REQ-30 y REQ-31 con responsabilidades distintas                                                                               |
| Módulo Clientes folded en REQ-9               | No se crea ticket separado                                                                                                    |
| GPS y PPS son conceptos distintos             | Formularios diferenciados                                                                                                     |
| Waterfall GPS → PPS visible en la UI          | Leyenda de tabla                                                                                                              |
| Roles son propiedades del usuario autenticado | Footer del sidebar clickeable (demo)                                                                                          |
| Pre-quotes son datos de análisis              | No tienen gestión operacional en TRD                                                                                          |
| La Quote es el compromiso firme               | Aceptar pre-quote → CREATE_QUOTE → FUNDS_RESERVE RESERVED→EXECUTED                                                            |
| "Operaciones Pendientes" eliminado            | 10/04/2026                                                                                                                    |
| 4 alertas operativas validadas con Facundo    | 10/04/2026                                                                                                                    |
| Alertas separadas a REQ-33                    | Módulo completo en sidebar TRD, sección "Sistema". Página completa en el main, mismo patrón que resto de módulos. 13/04/2026. |
| Tabs de agrupación en Notificaciones          | Un tab por módulo origen. V1 solo RFQ Gateway activo. Extensible sin rediseño. 13/04/2026.                                    |
| CTA de notificación navega al recurso         | "Fondear lote" / "Ver lote" abren directamente el lote afectado en RFQ. 13/04/2026.                                           |
| Sección "Quotes" (no "Transactions") en CLP   | Historial unificado RFQ + OTC. 13/04/2026.                                                                                    |
| Dashboard CLP diferido                        | Iniciativa separada futura. 13/04/2026.                                                                                       |
| SRS no se propaga a `features/`               | El SRS contiene el *cómo* (contratos de API, modelo de datos, invariantes) — ownership de Tecnología. No se versiona en `features/` por decisión deliberada, no es un leak de propagación. 09/06/2026. |
| Config del motor sin UI en V1 (PWI-80)        | La capacidad es que la configuración de tasas exista como insumo consumible por el sistema; la gestión visual por la Mesa se difiere a iteración futura. 09/06/2026. |
| Exposición multi-asset: fija/feed/respaldo (PWI-80) | Disparador: la definición del cálculo de límite de exposición. Tasas fija (estables) o feed (fiat volátil, reusa PPS) + respaldo manual. Asset sin tasa → 5ª alerta del Centro de Notificaciones, sin fallback silencioso. 09/06/2026. |
