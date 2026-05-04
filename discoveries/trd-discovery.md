---
name: Aplicación TRD — Discovery Document
features: [TRD]
status: Concluida
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-10
---

# Aplicación TRD — Discovery Document

> Última actualización: 22/04/2026 | Estado: En producción — iteración activa

---

## 1. Propósito del documento

Este documento consolida el entendimiento actual de la aplicación TRD — su propósito, modelo operacional, estado actual, bloques funcionales y mejoras propuestas. Es la base de conocimiento para futuras sesiones de producto, discovery y desarrollo.

**Documentos complementarios:**

- Para el detalle del módulo **Proveedores de Liquidez** (modelo de datos, API, componentes, decisiones de implementación), ver `trd-proveedores-de-liquidez-discovery.md`.
- Para el detalle del sistema **Prime Desk RFQ** (REQ-8, REQ-9, REQ-30, REQ-31, REQ-33 y arquitectura APE / RFQ API), ver `rfq-prime-desk-discovery.md`.

---

## 2. Naturaleza y propósito de la aplicación

**Nombre:** Aplicación de Mesa de Trading
**Prefijo:** [TRD]

TRD es el **panel de control operacional de la Mesa de Trading** de Ardua. Su función central es que la mesa pueda registrar todas sus operaciones, visualizar su posición neta (Exposición) en tiempo real y tomar decisiones sobre si calzarse o no.

**Distinción clave con OPS:**
La Mesa no mueve fondos entre plataformas — ejecuta **intercambios (swaps) dentro de cada plataforma**. Los movimientos entre cuentas (fondeo, rebalanceo) son responsabilidad de OPS. El scope de TRD es estrictamente la operación de trading.

**Estado actual de la gestión operacional:**
La Mesa opera con una combinación de TRD (Quotes, Proveedores de Liquidez, Bots) y herramientas informales (WhatsApp para coordinación). La operación con proveedores de liquidez fue digitalizada en TRD a partir de abril 2026, reemplazando la gestión previa en Google Sheets.

---

## 3. Concepto central: Exposición

La **Exposición** es la métrica central de la aplicación. Representa la posición neta de la Mesa en un momento dado, calculada a partir de todas las operaciones registradas en los bloques operacionales.

**Fórmula:**

```
Exposición = Σ compras − Σ ventas  (en todos los bloques)
```

**Ejemplo (Facundo Vasques — Head of Trading):**

```
Quotes:      compró 10, vendió 30  →  neto: −20
Proveedores: compró 10, vendió 10  →  neto:   0
──────────────────────────────────────────────
Exposición total:                      −20
```

Un resultado de −20 significa que la mesa está vendida en 20 — necesita salir a comprar para calzarse. El **cero es el equilibrio ideal (calzado)**, pero es una decisión de la mesa, no una obligación del sistema.

**La Exposición no es un módulo con registro propio.** Es una vista calculada que emerge del conjunto de bloques operacionales. Su representación en la UI será uno o varios cards dentro del **Home** de la aplicación.

**Dependencia cumplida:** Proveedores de Liquidez está en producción desde abril 2026. El bloque de datos necesario para calcular Exposición real ya existe.

---

## 4. Arquitectura de la aplicación

```
TRD — Mesa de Trading
│
├── HOME                    → Cards de Exposición agregada (por construir)
│                             Calculada en tiempo real desde todos los bloques
│
├── QUOTES                  → Operaciones con clientes              ✅ Funcional
├── PROVEEDORES             → Compras/ventas de liquidez a brokers  ✅ Funcional (abr 2026)
├── BOTS                    → Estrategias automatizadas             ✅ Funcional
├── RFQ                     → Gateway de cotización para clientes   🚧 En implementación
│
├── CLIENTES                → Módulo de soporte transversal         ✅ Existe
└── ALERTAS                 → Módulo de soporte transversal         ✅ Existe
```

---

## 5. Bloques operacionales

### 5.1 Quotes

Operaciones de compra/venta de FX que la Mesa ejecuta con clientes de Ardua.

**Tributa a Exposición:** ✅ Sí
**Estado:** ✅ Funcional en TRD

**Capacidades actuales:**

- Tabs: Quotes Activos / Historial de Trades
- Tipos de operación: BUY / SELL
- Soporte para operaciones CCC (cross-currency conversion)
- Lifecycle: `PENDING → ACCEPTED → PAID → COMPLETED → CANCELLED`

---

### 5.2 Proveedores de Liquidez

Operaciones de compra/venta de liquidez que la Mesa ejecuta con brokers externos.

**Tributa a Exposición:** ✅ Sí
**Estado:** ✅ Funcional en TRD (en producción desde abril 2026)
**Ruta:** `/providers`
**Requerimiento fundacional:** REQ-1 — Módulo Proveedores de Liquidez (Done, cerrado 10/04/2026)
**Detalle completo:** `trd-proveedores-de-liquidez-discovery.md`

**Capacidades en producción:**

- Cards de resumen: Card 1 (Operaciones + Pendientes/Recibidos), Card 2 (Total/BUY/SELL en USD)
- Tabla de operaciones con filtros server-side (Proveedor, Estado, Plazo, Período) y paginación
- Modal de detalle con log de actividad por operación
- Formulario de nueva operación con pares de moneda dinámicos y cálculo bidireccional de montos
- Ciclo de vida: PENDING → RECEIVED (confirmar recepción)
- RBAC: viewer-trd (solo lectura), admin-trd / ops-trd / quote-creator-trd (lectura + escritura)

**Requerimiento activo:** REQ-35 — Contravalor ARS en cards de resumen (In Review, enriquecido 13/04/2026). Agrega una segunda línea ARS en los cards de volumen Total/BUY/SELL.

---

### 5.3 Bots

Estrategias de trading automatizadas que operan sobre plataformas.

**Tributa a Exposición:** ✅ Sí
**Estado:** ✅ Funcional en TRD

**Capacidades actuales:**

- Ver bots activos en ejecución
- Ver estrategias disponibles para lanzar
- Lanzar bot con configuración de parámetros por estrategia
- Detener bot activo
- Infraestructura: AWS ECS (Task ARNs)

---

### 5.4 RFQ (Prime Desk — RFQ Gateway)

Canal de cotización bajo esquema RFQ (Request for Quote) para clientes externos. El sistema Prime Desk RFQ es un producto completo que atraviesa TRD y CLP; dentro de TRD se manifiesta como el **Panel de Gestión para la Mesa**.

**Tributa a Exposición:** ❌ No directamente — el resultado del proceso es una Quote aceptada que persiste en el módulo Quotes. La exposición queda capturada allí.

**Estado:** 🚧 En implementación — 4 de 5 REQs en Ready for Dev.

**Detalle completo:** `rfq-prime-desk-discovery.md` (scope por capa, arquitectura APE / RFQ API, modelo de lotes, BPS y roles).

**Scope dentro de TRD (REQ-9 · Ready for Dev):**

- Gestión de lotes de liquidez (GPS / PPS, FUNDS_IN / FUNDS_OUT, waterfall)
- Configuración de BPS y límites de exposición por cliente / grupo
- Suspensión / activación de lotes
- Módulo Clientes del RFQ resuelto nativamente en TRD (no depende de LEX)

**Módulo transversal TRD — Centro de Notificaciones (REQ-33 · In Review):**

Sección "Sistema" en el sidebar con página dedicada. V1 cubre alertas del RFQ Gateway (fondeo insuficiente, provider no disponible, alta utilización, alta tasa de rechazo). Arquitectura extensible para incorporar alertas de otros módulos sin rediseño.

**Ítem pendiente sin ticket:** Admin BFF — capa de autorización entre TRD y APE. Decisión pendiente: REQ propio o foldearlo en REQ-30.

---

## 6. Home — Exposición Agregada (por construir)

El **Home** será la pantalla principal de TRD. Mostrará la posición neta de la Mesa en tiempo real mediante uno o varios cards de Exposición, calculados dinámicamente desde todos los bloques operacionales.

**Estado actual del Dashboard:**
Existe una ruta `/dashboard` con cards de métricas hardcodeadas (sin conexión a datos reales). Es el candidato natural a convertirse en el Home con Exposición real.

**Dependencia cumplida:** Proveedores de Liquidez está en producción desde abril 2026. El prerrequisito principal para construir Exposición real ya se satisfizo.

---

## 7. Stack técnico

| Elemento     | Tecnología               |
| ------------ | ------------------------ |
| Framework    | React + TypeScript       |
| Build        | Vite                     |
| UI           | shadcn/ui + Tailwind CSS |
| Auth         | Auth0                    |
| Server state | React Query (TanStack)   |
| Routing      | React Router             |
| Deploy       | Serverless Framework     |

**Repositorio:** `/Users/yasmani/Projects/core-trd-frontend`

**Estructura de rutas actuales:**

| Ruta         | Página      | Estado                              |
| ------------ | ----------- | ----------------------------------- |
| `/`          | Quotes      | ✅ Funcional                        |
| `/dashboard` | Dashboard   | ⚠️ Placeholder — datos hardcodeados |
| `/providers` | Proveedores | ✅ Funcional (abr 2026)             |
| `/clients`   | Clientes    | ✅ Existe                           |
| `/alerts`    | Alertas     | ✅ Existe                           |
| `/bots`      | Bots        | ✅ Funcional                        |

---

## 8. Iniciativas activas

### Expandir TRD — Gestión de Proveedores de Liquidez

**Objetivo:** Digitalizar el registro operacional de compras/ventas de liquidez a brokers, reemplazando la planilla de Google Sheets.
**Requerimientos:** REQ-1 (Done), REQ-35 (In Review — Contravalor ARS en cards)
**Estado:** ✅ En producción — iteración activa

---

### Expandir TRD — Home y Exposición Agregada

**Objetivo:** Construir el Home con cards de Exposición calculadas en tiempo real desde todos los bloques.
**Dependencia:** ✅ Proveedores de Liquidez construido y activo (cumplida).
**Requerimientos:** Pendiente de creación.
**Estado:** No iniciado — dependencia cumplida, puede iniciarse

---

### Expandir TRD — RFQ Gateway (Prime Desk RFQ)

**Objetivo:** Incorporar el RFQ Gateway como módulo nativo en TRD, habilitando a la Mesa gestionar lotes de liquidez, BPS y operaciones pendientes desde el mismo panel.
**Discovery:** `rfq-prime-desk-discovery.md`
**Requerimientos:**

- REQ-8 · CLP (Solicitud de Cotización) — Ready for Dev
- REQ-9 · TRD (Panel de Gestión Mesa) — Ready for Dev
- REQ-30 · APE (Motor de Precio y Liquidez) — Ready for Dev
- REQ-31 · RFQ API (Orquestador de Cotizaciones) — Ready for Dev
- REQ-33 · TRD (Centro de Notificaciones) — In Review, prototipo v1 completo

**Estado:** 🚧 En implementación — pendiente validación de REQ-33 y decisión sobre Admin BFF (sin REQ asignado aún).

---

## 9. Decisiones de diseño registradas

| Decisión                                      | Detalle                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| La Mesa no mueve fondos entre plataformas     | Solo ejecuta intercambios dentro de cada plataforma. Movimientos entre cuentas son scope de OPS.          |
| RFQ no tributa directo a Exposición           | El resultado del proceso es una Quote. La exposición queda capturada en el bloque Quotes.                 |
| Exposición es vista calculada, no módulo      | No tiene registro propio. Se calcula dinámicamente desde los bloques.                                     |
| Home es el contenedor de Exposición           | Cards de Exposición en el futuro Home. Granularidad (por moneda, plataforma, total): TBD.                 |
| Clients Module de RFQ puede integrarse en TRD | TRD ya tiene módulo de Clientes. La integración del Client Module del RFQ no requiere depender de LEX.    |
| Prototipo RFQ no es implementación definitiva | El prototipo existente sirvió para exploración. El módulo nativo en TRD parte de cero desde el discovery. |
| Summary de Proveedores es server-side         | El backend recalcula el objeto summary con cada request filtrado. No hay agregación client-side.          |
| Proveedores usa pares de moneda dinámicos     | A diferencia del prototipo (CABLE/MEP), producción usa CurrencyPairSelector con default USD/ARS.          |

---

## 10. Preguntas de diseño abiertas

| Pregunta                                                                                             | Prioridad |
| ---------------------------------------------------------------------------------------------------- | --------- |
| ¿Granularidad de los cards de Exposición en Home? (por moneda, por plataforma, total)                | Alta      |
| ¿Cómo contribuyen los Bots a la Exposición — reportan posiciones propias o se infieren desde trades? | Alta      |
| ¿La Exposición se calcula por moneda, por plataforma, o ambas?                                       | Alta      |
| ¿El Home reemplaza el Dashboard actual o es una ruta nueva?                                          | Media     |
| ¿Los cards de volumen de Proveedores deberían soportar múltiples pares en el futuro?                 | Media     |
| ¿Se necesita edición o cancelación de operaciones de Proveedores en v2?                              | Media     |

---

## 11. Próximos pasos

| #   | Acción                                                                          | Owner                 | Estado      |
| --- | ------------------------------------------------------------------------------- | --------------------- | ----------- |
| 1   | Handoff REQ-35 (Contravalor ARS en cards) a Tecnología                          | HoP                   | Pendiente   |
| 2   | Evaluar inicio de discovery para Home + Exposición Agregada                     | HoP + Facundo Vasques | No iniciado |
| 3   | Resolver granularidad y modelo de cálculo de Exposición para el Home            | HoP + Facundo Vasques | No iniciado |
| 4   | Evaluar necesidad de edición/cancelación de operaciones de Proveedores (v2)     | HoP + Facundo Vasques | No iniciado |
| 5   | Validar REQ-33 (Centro de Notificaciones) para avanzar a Ready for Dev          | HoP + Facundo Vasques | Pendiente   |
| 6   | Decidir si Admin BFF (auth TRD ↔ APE) requiere REQ propio o se foldea en REQ-30 | HoP                   | Pendiente   |
