---
name: Aplicación de Finanzas (FIN) — Session Context
features: [FIN]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-27
---

# Aplicación de Finanzas (FIN) — Session Context

> Versión interna del discovery: v0.3.1 — prototipo FIN v4 auditado en disco; perfiles de Alertas cerrados; FIN-10 resuelto; taxonomía v3 con Contabilidad como bloque.

---

## Changelog

**v0.3.1 (27/04/2026)** — Patch derivado de la auditoría del prototipo FIN regenerado con prompt v4. Incorpora aprendizajes y deuda detectada:

- **Decisión estructural — Contabilidad pasa a ser un bloque, no un módulo.** §3 (taxonomía) reescrita como **v3**: 4 módulos (Tesorería, Operatoria, Compras, Reportes) agrupados en 3 bloques del sidebar (Operaciones, Finanzas, Contabilidad). Bajo el bloque "Contabilidad" del sidebar viven módulos contables (Plan de Cuentas, Asientos, Mayor, Cierres, etc.) que se definirán cuando se aborde el discovery formal del Motor Contable. §6 ("FIN.Contabilidad") se conserva como referencia conceptual del Motor Contable, pero queda claro que ese motor se materializa como múltiples módulos dentro del bloque, no como un módulo único.
- **§9.0 (renombrada en framework) — "Solicitudes" es denominación universal del Inbox de todo el core**, no nomenclatura local de FIN. Reflejado en §14.3 y §15 (deuda).
- **Nueva §15 — Brecha entre prompt v4 y prototipo materializado:** tabla explícita con los 6 gaps detectados en la auditoría (perfiles A/B/C en Alertas no diferenciados, estado `auto_resolved` ausente, nomenclatura "Solicitudes" en copy de UI parcial, taxonomía con Contabilidad como módulo en lugar de bloque — cerrado vía esta v0.3.1, capacidad `dependencies` de Reportes ausente, 7 de 8 tipos de Solicitudes con códigos divergentes). Cada gap está categorizado (deuda · resuelto · a aceptar) con criterio de cierre.
- **§12 (referencias) · framework actualizado a v1.2.1.**
- **§13 (próximos pasos) ajustados** con foco en cerrar la deuda detectada en próximas iteraciones del prompt.
- **Posición del prototipo:** marcado como **fuente de verdad para próximas sesiones de challenge del módulo de Finanzas** según instrucción del HoP. Las divergencias contra prompt v4 quedan documentadas como deuda visible — no se revierte el framework.

**v0.3 (27/04/2026)** — Cambios derivados de la sesión de definición de prototipos del financial-core:

- **§3 (Taxonomía):** renombrado módulo `FIN.Reportería` → `FIN.Reportes` (alineación con convención de módulos genéricos del financial-core, donde el módulo se llama "Reportes").
- **§5.2 (Inbox de FIN):** ahora se trata como módulo activo en el prototipo, no placeholder. Lo que se gestiona en Inbox se llama **Solicitudes** (nomenclatura normalizada del producto Ardua — ver framework §9.0).
- **§9 (Reportes):** renombrada de "Reportería" a "Reportes". Agregadas referencias a criterios §8.2 del framework (qué reportes van al módulo) y al modelo de dependencias inter-área §8.5.
- **§10 (Gaps) · FIN-10 — Infraestructura de alertas:** **cerrado.** Decisión: FIN es caso D · Hybrid del modelo núcleo + capacidades del framework v1.1. Perfiles por tipo: B (Workflow) para `RECONCILIATION` + `IMPUTATION_SLA`, A (Notification-only) para `APPROVAL_OVERDUE` + `BALANCE_ANOMALY`, C (Auto-system) para `REPORT_OVERDUE`. Hereda del template B (replicado de LEX) y desactiva capacidades por tipo. Ver framework v1.2 §3 y §7 para el modelo formal.
- **Nueva §14 (Estado del prototipo):** sección nueva con el estado actual del prototipo FIN, decisiones materializadas y próximos pasos específicos.
- **§13 (Próximos pasos):** sacado #5 (decisión sobre infraestructura de alertas) por estar resuelto. Agregados pasos vinculados a la ejecución del prompt v4 y al inventario de REQs transversales.

**v0.2.1 (24/04/2026)** — Agregado §5.7 (modelo funcional de FIN.Tesorería) a partir de la documentación del dev en Notion. Ajuste menor en §5.6 (Registro de caja fuera de v1.0).

**v0.2 (24/04/2026)** — Cambios respecto a v0.1 (26/03/2026):

- **Terminología alineada:** FIN es una aplicación del financial-core (mismo nivel que OPS, LEX, TRD, CLP, COM), no un "módulo". Dentro de FIN existen sub-módulos.
- **Taxonomía de módulos redefinida** (§3): 5 módulos — Contabilidad / Tesorería / Operatoria / Compras / Reportería. El sub-módulo "Finanzas" original se disuelve.
- **Nuevo módulo FIN.Operatoria** (§7): vistas de TRD.Quotes y OPS.Movimientos con lente y acciones de Finanzas. Cubre el pedido original del dev antes de derivar en TES.
- **Nuevo módulo FIN.Reportería** (§9): catálogo de reportes con procesamiento pesado. Patrón REQ-54 LEX adoptado. Primer caso concreto: REQ-57 (INFO OPERACIONES / ARCA-UIF).
- **TES absorbido como FIN.Tesorería** (§5): el sistema construido por Tecnología es el primer feature del módulo, no una aplicación aparte.
- **Principio "FIN no ve Vostro" reescrito** (§4.2): la separación OPS / FIN es sobre qué gestiona cada uno, no qué ve.
- **Catálogo de cuentas físicas documentado como dominio de OPS** (§4.2): vive en OPS vía REQ-42, FIN lo consume read-only. El "Módulo de Bancos" de la v0.1 se elimina como feature independiente.
- **Flujo OPS → FIN aclarado** (§4.3): Paso 1 banco, Paso 2 OPS registra movimiento, Paso 3 FIN imputa contablemente desde Operatoria, Paso 4 asiento en Contabilidad.
- **Rol confirmado:** Juan Cruz Lotz Guastavino — Backoffice / Treasury · Finance.
- **Gaps nuevos** (§10): moneda vs. canal; catálogo OPS incompleto; naming TES en doc técnica; infraestructura de alertas en FIN; conciliación OPS vs. FIN; facturación / AFIP.
- **Referencias externas consolidadas** (§12): REQ-42, REQ-54, REQ-57.

---

## 1. Denominación y Naturaleza de la Aplicación

**Nombre:** Finanzas
**Prefijo:** FIN
**Nivel:** Aplicación del financial-core (mismo nivel que OPS, LEX, TRD, CLP, COM)

FIN es la aplicación donde el área de Finanzas y Contabilidad de Ardua gestiona la información financiera y contable del grupo. Es la contracara de OPS desde la perspectiva financiera:

- OPS gestiona la ejecución operativa de los movimientos de clientes (Vostro).
- FIN gestiona la información contable y financiera del grupo, incluyendo el registro de fondos, la imputación contable, la emisión de reportes formales y la gestión de compras.

**Referencia de discovery original:** Marco Financiero y Contable de los Productos y Servicios de Ardua (v0.6)
**Canal Slack:** `#req-product-finance-accounting` (C0AJ2599DA6)

---

## 2. Equipo del Área

| Persona                       | Rol                                                               |
| ----------------------------- | ----------------------------------------------------------------- |
| **Belén Gallo**               | Head of Finance                                                   |
| **Juan Cruz Lotz Guastavino** | Backoffice / Treasury · Finance                                   |
| **Mauro González**            | Integrante — rol específico a confirmar ⚠️                        |
| **Bárbara Luppino**           | Integrante — rol específico a confirmar ⚠️                        |
| **Santiago Fernández**        | Reporte de Revenue (diario / semanal / mensual) — en construcción |
| **Estudio externo**           | Responsable contable formal de todas las entidades                |

**Visión del área:** Internalizar el proceso contable end-to-end. Dejar al estudio externo solo certificaciones, auditorías, consolidación normativa y cierres regulatorios.

---

## 3. Taxonomía de la Aplicación FIN (v3)

**Cambio respecto a v2:** "Contabilidad" pasa de módulo a **bloque del sidebar**. Bajo ese bloque viven múltiples módulos contables (Plan de Cuentas, Asientos, Mayor, Cierres, Estados Financieros, etc.) que se definirán cuando se aborde el discovery formal del Motor Contable. La sección §6 de este documento se conserva como **referencia conceptual** del Motor Contable, no como definición del módulo único.

### 3.1 Módulos específicos del dominio FIN

| Módulo | Bloque del sidebar | Scope | Estado v1.0 |
|---|---|---|---|
| **FIN.Movimientos** | Operaciones | Vista de OPS.Movimientos con lente Finanzas (imputación contable, conciliación contable, cuenta corriente). Sub-módulo canónico de FIN.Operatoria — ver §7. | Por definir |
| **FIN.Quotes** | Operaciones | Vista de TRD.Quotes con lente Finanzas (revenue, generación de facturas, comisiones). Sub-módulo canónico de FIN.Operatoria — ver §7. | Por definir |
| **FIN.Tesorería** | Finanzas | Gestión de fondos: movimientos, depósitos, pagos, flujos de caja. Ledger event-sourced + posición en tiempo real. Absorbe el sistema construido por Tecnología (TES). | En construcción |
| **FIN.Compras** | Finanzas | Órdenes de compra y facturas de compra. | Contabilium |
| **(Módulos contables futuros)** | Contabilidad | Plan de Cuentas, Asientos manuales / automáticos, Mayor de cuentas, Cierres de período, Estados Financieros. Cuando se aborde el discovery del Motor Contable, se definen como módulos individuales bajo este bloque. | Pendiente de discovery |

### 3.2 Módulos genéricos del financial-core en FIN

Además de los módulos específicos del dominio listados arriba, FIN incluye los 4 módulos genéricos del financial-core (Dashboard, Inbox, Alertas, Reportes), ubicados al tope del sidebar sin agruparlos bajo bloque según framework §6.

| Módulo genérico | Estado v1.0 | Referencia |
|---|---|---|
| **Dashboard** | Activo (prototipo) | Framework §10 |
| **Inbox** | Activo (prototipo · skeleton funcional) | Framework §9 |
| **Alertas** | Activo (prototipo) · Perfil D Hybrid | Framework §7 |
| **Reportes** | Activo (prototipo) — incluye lo que era "FIN.Reportería" en v2 | Framework §8 |

**Nota sobre Reportes:** lo que en v2 se llamaba "FIN.Reportería" se materializa como el módulo genérico "Reportes" del financial-core, con catalogación por categorías (Contables / Regulatorios / Financieros / Operativos). Ver §9 de este documento para el detalle del catálogo + criterios de qué va al módulo y qué vive como exportación simple en cada módulo del dominio.

### 3.3 Disolución del sub-módulo "Finanzas" original

El sub-módulo "Finanzas" de v0.1 se disuelve: el P&L Skill existente (`features/ardua-pnl-report.md`) se incorpora al catálogo de Reportes como reporte interno (categoría Financieros). La capa "analítica exploratoria / dashboards en vivo" no tiene contenido vivo hoy; si aparece necesidad, se reabre la discusión.

### 3.4 Cambio respecto a la taxonomía v2

| v2 (24/04/2026) | v3 (27/04/2026) | Razón |
|---|---|---|
| 5 módulos: Contabilidad / Tesorería / Operatoria / Compras / Reportería | 4 módulos del dominio + 4 genéricos del core | Reportes pasa a genérico del core; Contabilidad pasa de módulo a bloque |
| FIN.Contabilidad como módulo único | Bloque "Contabilidad" con N módulos contables (a definir) | El alcance del Motor Contable es demasiado amplio para encajar en un módulo único del sidebar; cada área contable funcional merece su propio módulo |
| FIN.Operatoria como módulo único | FIN.Movimientos + FIN.Quotes como módulos independientes bajo el bloque Operaciones | Movimientos y Quotes son fuentes de datos distintas (OPS y TRD) con flujos operativos distintos; conviene exponerlos como módulos separados aunque la lógica de "vista con lente Finanzas" sea común |

---

## 4. Principios de Arquitectura del Sistema

### 4.1 Vista de aplicación ≠ acceso de CORE

El CORE de Ardua opera sobre una base de datos compartida con todos los movimientos. Que FIN exponga o no un tipo de registro en su interfaz es una decisión de scope del módulo — no significa que no exista en el sistema.

### 4.2 OPS vs. FIN — separación de responsabilidades (reescrita)

La separación **no es sobre qué ve cada aplicación — es sobre qué gestiona cada una**. Tanto OPS como FIN consumen registros de la misma base, con lentes y acciones distintas.

|                                      | OPS                                                                                              | FIN                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Qué gestiona**                     | Ejecución operativa de movimientos de clientes y conciliación operativa contra extracto bancario | Registro contable-financiero de los movimientos del grupo, reportería formal, gestión de fondos, compras |
| **Catálogo de cuentas físicas**      | Fuente de verdad (REQ-42: módulo Bancos/Cuentas dentro de OPS)                                   | Consumidor read-only (replicado a `core-tes-accounts-cache` en FIN.Tesorería)                            |
| **Movimientos de clientes (Vostro)** | Gestiona y asigna cuenta/cliente                                                                 | Ve vía FIN.Operatoria (para imputación contable) y FIN.Tesorería (posición de fondos)                    |
| **Nostro operativo**                 | Reposicionamiento entre custodios                                                                | Visible para conciliación global                                                                         |
| **Nostro no operativo**              | No                                                                                               | Gestiona desde FIN.Tesorería y FIN.Compras                                                               |
| **Conciliación**                     | Ledger interno vs. extracto (operativa)                                                          | Libro contable vs. movimientos (contable, global)                                                        |

### 4.3 Flujo de un movimiento — OPS → FIN

```
Paso 1 — Banco / Estructura: se produce el movimiento físico
        ↓
Paso 2 — OPS: registra el movimiento, asigna cuenta/cliente (si aplica)
        ↓
Paso 3 — FIN.Operatoria: Finanzas imputa contablemente el movimiento
                         (asigna cuentas contables según plan de cuentas)
        ↓
Paso 4 — FIN.Contabilidad: el asiento queda registrado en el Motor Contable
```

Paralelamente, **FIN.Tesorería** consume el mismo movimiento (vía eventos SNS de OPS) para mantener la posición de fondos en tiempo real y habilitar la conciliación global por cuenta bancaria.

---

## 5. FIN.Tesorería — Ledger de movimientos y gestión de fondos

### 5.1 Qué es

FIN.Tesorería es el módulo de gestión de fondos del grupo. Registra en tiempo real todos los movimientos físicos que entran y salen de cada cuenta de Ardua (banco, exchange, custodio), mantiene la posición actualizada por sociedad / cuenta / moneda, y habilita la carga manual de movimientos que no vienen del core (ajustes, ingresos/egresos fuera del sistema).

El sistema técnico que hoy implementa este módulo es **TES** (ver 5.4). En lo sucesivo, "FIN.Tesorería" refiere al módulo de producto y "TES" al sistema técnico que lo implementa. La documentación de Tecnología debe alinearse a este naming (ver gap FIN-08).

### 5.2 Qué resuelve

Hoy la tesorería se gestiona en Excel con varios problemas concretos (ver `marco-operativo.md` §4 y §5):

- Balances actualizados a mano, con desfases entre el libro y la realidad bancaria.
- Sin distinción entre dinero disponible y dinero comprometido.
- Sin trazabilidad: si un número cambia, nadie sabe quién ni cuándo.
- No escala con nuevas sociedades, entidades o monedas.
- La conciliación operativa y la contable son el mismo proceso (single point of control).

FIN.Tesorería reemplaza ese flujo con un registro contable automatizado event-sourced, auditable, de doble partida, con posición en tiempo real. Habilita por primera vez la **conciliación global por cuenta bancaria** (saldos del ledger vs. saldo real del banco), que hasta ahora no era posible.

### 5.3 Qué NO es

FIN.Tesorería **no es** el Motor Contable. Tiene doble partida a nivel de cuentas físicas + cuentas sintéticas de pasivo-cliente, pero:

- No tiene plan de cuentas contable (usa identificadores físicos: CBU, wallet, pool).
- No tiene catálogo de asientos tipo por evento económico.
- No produce estados financieros (P&L contable, Balance General, Mayor de cuentas contable).
- No modela contrapartidas de resultado (revenue, gastos) ni patrimonio.

Es la capa **de registro físico de movimientos**, upstream del Motor Contable. FIN.Contabilidad se apoya sobre FIN.Tesorería como fuente de movimientos, agregando encima el plan de cuentas contable y los asientos tipo.

### 5.4 Arquitectura técnica (TES)

| Capa                  | Tecnología                                                       |
| --------------------- | ---------------------------------------------------------------- |
| Backend               | Go + AWS Lambda                                                  |
| Frontend              | Vue 3 + Vite + shadcn + Auth0 (stack core)                       |
| Almacenamiento ledger | S3 + Parquet (append-only, inmutable, S3 Object Lock GOVERNANCE) |
| Motor de consulta     | DuckDB bundled en Lambda                                         |
| Cache de saldos       | DynamoDB                                                         |
| Mensajería            | SQS FIFO + SNS                                                   |
| IaC                   | Serverless Framework v4                                          |

**Componentes clave:**

- Cuatro Lambdas: `ingest` (SQS FIFO, batch=10), `post-movement` (HTTP POST), `get-balances` (HTTP GET, DynamoDB), `get-movements` (HTTP GET, DuckDB sobre S3).
- Tres tablas DynamoDB: `core-tes-balance-cache`, `core-tes-accounts-cache` (poblado desde OPS), `core-tes-idempotency`.
- SNS topic `core-ops-sns-movements` consumido vía SQS FIFO, `MessageGroupId` = cuenta debitada (elimina race conditions sin locks).

**POC validado:** 38k transacciones, saldos cuadran.

### 5.5 Relación con OPS y TRD

| Flujo                         | Desde                  | Hacia                           | Mecanismo                               |
| ----------------------------- | ---------------------- | ------------------------------- | --------------------------------------- |
| Eventos de movimientos        | OPS                    | FIN.Tesorería                   | SNS → SQS FIFO → Lambda ingest          |
| Catálogo de cuentas físicas   | OPS (REQ-42)           | FIN.Tesorería (cache read-only) | Replicación a `core-tes-accounts-cache` |
| Eventos de quotes confirmadas | TRD                    | FIN.Tesorería                   | Pendiente (roadmap)                     |
| Carga manual                  | Frontend FIN.Tesorería | FIN.Tesorería                   | HTTP POST con doble aprobación          |

### 5.6 Scope v1.0

**Dentro de v1.0:**

- Posición de fondos por sociedad / banco / cuenta / moneda en tiempo real.
- Historial auditable de movimientos con trazabilidad completa.
- Ingesta automática desde OPS vía SNS.
- Carga manual con doble aprobación.
- Cola de asignación para retiros sin cuenta de Ardua definida.
- Consumo read-only del catálogo de cuentas físicas (REQ-42).

**Fuera de v1.0:**

- **Registro de caja** (momento exacto en que el dinero entra/sale físicamente, separado del momento lógico del movimiento). Roadmap del dev, prioridad Media.
- Ingesta automática desde TRD.
- Plan de cuentas contable (corresponde a FIN.Contabilidad).
- Asientos con contrapartidas de resultado (ingresos, gastos).
- Estados financieros (P&L, Balance General, Mayor de cuentas contable).
- Intercompany, diferencias de cambio, valuación de criptoactivos.
- Integración con NetSuite.
- Multi-currency mark-to-market.
- Conciliación automática contra extractos.
- Reportes regulatorios (corresponden a FIN.Reportes).

### 5.7 Modelo funcional

Cómo FIN.Tesorería organiza y opera los fondos, desde el lado del negocio.

#### 5.7.1 Jerarquía de cuentas

```
Sociedad
  └── Estructura (banco | exchange | custodio | ALyC | partner)
        └── Cuenta (por entidad y moneda)
              └── Movimiento
```

Esta jerarquía define cómo se agrupan las cuentas de Ardua y es la base de los filtros de la vista de posición.

#### 5.7.2 Modelo fiat vs. cripto

Las cuentas fiat y cripto tienen modelos distintos porque la realidad subyacente lo es:

| Aspecto              | Fiat (ARS)                                                                   | Cripto (USDC, USDT, BTC, etc.)                                                                    |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Cuenta física        | CBU único (ej. Coinag)                                                       | Wallet Pool compartida (ej. ABA BitGo)                                                            |
| Cuentas por cliente  | N CVUs bajo el mismo CBU; cada CVU tiene saldo individual                    | No hay cuentas individuales en la entidad; FIN.Tesorería lleva el saldo por cliente internamente |
| Relación             | Un CVU solo puede estar asociado a un CBU                                    | Un cliente puede estar asociado a múltiples pools                                                 |

#### 5.7.3 Dos niveles de visibilidad

El cliente opera a través de la app de Ardua — una única interfaz. No ve en qué sociedad ni banco están sus fondos. Por detrás, los fondos viven en cuentas reales de distintas sociedades y entidades que solo Finanzas y Operaciones ven. FIN.Tesorería es la vista interna de esa realidad distribuida.

#### 5.7.4 Fuentes de movimientos

FIN.Tesorería recibe movimientos de tres fuentes:

1. **OPS (automático)** — cuando una operación se liquida, OPS publica el evento y el movimiento queda registrado sin intervención humana.
2. **TRD (automático, roadmap)** — cuando se confirma un quote, TRD publica el evento y el movimiento queda registrado como posición comprometida.
3. **Manual** — el equipo de Tesorería carga movimientos que no vienen del core (ajustes, ingresos/egresos fuera del sistema, correcciones).

#### 5.7.5 Tipos de movimientos soportados

| Tipo                        | Efecto en saldo                                          |
| --------------------------- | -------------------------------------------------------- |
| DEPOSIT / COLLECTOR_IN      | Ingreso de fondos a una cuenta                           |
| WITHDRAWAL / COLLECTOR_OUT  | Egreso de fondos de una cuenta                           |
| FEE                         | Comisión cobrada                                         |
| TAX                         | Impuesto retenido                                        |
| REBATE                      | Devolución / reintegro                                   |
| ADDITION                    | Ajuste positivo manual                                   |
| SWAP_OUT / SWAP_IN          | Conversión entre monedas (dos asientos emparejados)      |
| TRANSFER_OUT / TRANSFER_IN  | Transferencia entre cuentas internas (dos emparejados)   |

Estos son los tipos que el módulo reconoce y procesa. Cualquier hecho económico que no calce en un tipo existente requiere definirlo antes de poder registrarse.

#### 5.7.6 Vistas del módulo

Dos vistas principales expuestas por FIN.Tesorería:

- **Posición actual** — saldos por cuenta agrupados por sociedad, con débito acumulado, crédito acumulado, posición neta, moneda y contraparte. Filtrable por sociedad.
- **Movimientos** — historial paginado por rango de fechas con trazabilidad completa; también es el punto de carga de movimientos manuales.

#### 5.7.7 Carga manual con doble aprobación

Los movimientos manuales no se registran directamente. Requieren dos usuarios distintos:

1. Usuario 1 carga el movimiento → queda en estado PENDING.
2. Usuario 2 revisa y aprueba → se registra y actualiza los saldos.

Aplica a ajustes, ingresos/egresos manuales y cualquier carga que no venga del core. Es un control interno clave para evitar errores o fraudes en movimientos sin trazabilidad upstream.

La carga pendiente de aprobación genera una **Solicitud** de tipo `MANUAL_LOAD_APPROVAL` que llega al **Inbox de FIN** (ver §14.3 para el detalle del módulo Inbox y la nomenclatura "Solicitudes").

#### 5.7.8 Reglas de negocio del ledger

- **Inmutabilidad:** ningún movimiento se borra ni se modifica. Si hay un error, se corrige con un asiento compensatorio (nota de crédito o débito). Garantiza trazabilidad total para auditoría y regulación.
- **Doble entrada física:** cada movimiento afecta dos cuentas simultáneamente — la cuenta física donde está el dinero (pool, CBU, wallet) y la cuenta sintética que representa la obligación con el cliente. Si no cuadra, el movimiento se rechaza.
- **Sin duplicados:** cada operación tiene clave de idempotencia. Reintentos de la misma operación se detectan y no se duplican.
- **Cola de asignación (retiros):** cuando un retiro se genera sin cuenta de Ardua definida (decisión que depende de disponibilidad y liquidez), el movimiento queda en una cola. Un operador asigna la cuenta en un paso separado. Hasta que no se asigne, no afecta la posición.

#### 5.7.9 Ejemplo: swap USDC → ARS

Un cliente convierte 100 USDC y recibe 150.000 ARS. Genera 4 movimientos en el ledger:

| # | Cuenta                   | Tipo           | Efecto                     |
| - | ------------------------ | -------------- | -------------------------- |
| 1 | Cliente X — USDC         | SWAP_OUT       | Cliente pierde 100 USDC    |
| 2 | Circuit Pay — USDC       | ADDITION       | Ardua recibe los 100 USDC  |
| 3 | CVU Haz Pagos — ARS      | COLLECTOR_OUT  | Ardua debita 150.000 ARS   |
| 4 | Cliente X — ARS          | SWAP_IN        | Cliente recibe 150.000 ARS |

Los 4 movimientos se procesan juntos (atómicamente) cuando OPS publica el evento de la operación. Si alguno falla, ninguno queda registrado.

---

## 6. FIN.Contabilidad — Motor Contable

### 6.1 Qué es

FIN.Contabilidad es el módulo de contabilidad propiamente dicha del grupo. Es un sistema contable en toda su extensión funcional — no es un ERP, pero cubre la capa contable completa. Lo único que queda fuera son las obligaciones fiscales jurisdiccionales.

### 6.2 Scope del módulo

| Incluye                                       | No incluye                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Plan de cuentas (por entidad o consolidado)   | Liquidación de IVA, IIBB, Ganancias                                            |
| Catálogo de asientos tipo por evento del CORE | Declaraciones juradas ante AFIP / BCRA / UIF                                   |
| Asientos manuales                             | Formatos regulatorios por jurisdicción (viven en FIN.Reportes o en NetSuite)   |
| Mayor de cuentas contable                     |                                                                                |
| Balance de saldos                             |                                                                                |
| Cierres de período (mensual y anual)          |                                                                                |
| Multimoneda                                   |                                                                                |
| Estado de Resultados / P&L contable           |                                                                                |
| Balance General (activo, pasivo, patrimonio)  |                                                                                |

### 6.3 Relación con FIN.Tesorería

FIN.Tesorería opera con cuentas físicas (CBU, wallet, pool). FIN.Contabilidad opera con cuentas contables estructuradas (Activo / Pasivo / Patrimonio / Ingresos / Gastos). No son redundantes — son capas distintas sobre el mismo hecho económico.

El flujo es: FIN.Tesorería registra el movimiento físico → FIN.Operatoria imputa contablemente ese movimiento (asigna cuentas contables) → FIN.Contabilidad genera el asiento formal en el Motor Contable.

### 6.4 Relación con NetSuite

|                            | FIN.Contabilidad                   | NetSuite                                  |
| -------------------------- | ---------------------------------- | ----------------------------------------- |
| Naturaleza                 | Módulo de gestión contable interno | ERP (contabilidad + fiscal + operaciones) |
| Plan de cuentas            | ✅                                 | ✅                                        |
| Asientos tipo              | ✅                                 | ✅                                        |
| Cierres de período         | ✅                                 | ✅                                        |
| Multimoneda                | ✅                                 | ✅                                        |
| Estado de Resultados       | ✅                                 | ✅                                        |
| Balance General            | ✅                                 | ✅                                        |
| Obligaciones fiscales      | ❌                                 | ✅                                        |
| Declaraciones regulatorias | ❌                                 | ✅                                        |
| Relación                   | Fuente / insumo                    | Destino / capa fiscal y regulatoria       |

Cuando NetSuite esté implementado, FIN.Contabilidad exporta asientos estructurados para su procesamiento normativo. No se reemplaza — se complementa.

### 6.5 Preguntas de diseño abiertas (críticas antes de especificar)

- ¿Cuántos planes de cuentas — uno por entidad o uno consolidado del grupo?
- ¿Catálogo completo de eventos del CORE que deben generar asientos?
- ¿Los asientos generados desde FIN.Operatoria se confirman automáticamente o requieren aprobación?
- ¿Tratamiento multimoneda — moneda original, moneda funcional de la entidad, o ambas?
- ¿Las entradas manuales requieren flujo de aprobación?
- ¿Los reportes contables se generan en tiempo real o por período cerrado?
- ¿FIN.Contabilidad exporta directamente a NetSuite o hay capa de transformación?

---

## 7. FIN.Operatoria — Vistas de Quotes y Movimientos con lente Finanzas

### 7.1 Qué es

FIN.Operatoria es el workspace donde Finanzas opera sobre los registros crudos del core con lente y acciones propias del área. Los registros viven en TRD (Quotes) y OPS (Movimientos); FIN.Operatoria los expone con filtros, columnas y acciones específicas para Finanzas.

Este módulo cubre el pedido original del dev ("Quotes y Movimientos filtrados y mostrados para interés contable / financiero") que inicialmente iba a construirse como "v1 de Tesorería" y derivó en TES. Al separar claramente Tesorería (fondos) de Operatoria (registros con lente Finanzas), cada módulo queda con un scope limpio.

### 7.2 Sub-secciones y acciones

**Quotes (registros de TRD con lente Finanzas):**

- Generar Facturas (dispara proceso de facturación — ver 7.3 sobre AFIP).
- Reportes de Comisión y Revenue (cards totalizadores, filtros por cliente / período / tipo de operación).
- Vistas con campos relevantes para Finanzas: revenue generado, spread, fees por contraparte.

**Movimientos (registros de OPS con lente Finanzas):**

- Imputación contable de los movimientos (asignación de cuentas contables del plan de cuentas — cliente, banco, resultado).
- Cuenta Corriente de Clientes (ingresos / egresos por cliente, saldo acumulado).
- Conciliación contra estructuras Bancarias / Partners (capa contable; distinta de la conciliación operativa de OPS).
- Cuentas de Sociedades (vista agregada por entidad legal).

### 7.3 Relaciones con otros módulos

- FIN.Operatoria consume read de TRD (Quotes) y OPS (Movimientos).
- La imputación que Finanzas hace desde FIN.Operatoria sobre un movimiento es la acción que dispara la generación de un asiento en FIN.Contabilidad (Motor Contable).
- Los cards totalizadores de Revenue y Comisión son vistas analíticas. Si requieren procesamiento pesado o emisión formal con estructura, migran a FIN.Reportes.
- La facturación involucra obligaciones fiscales (AFIP). Requiere validación del filtro contable/legal del framework antes de incluirse en v1.0.

### 7.4 Observación sobre conciliación

Existen dos capas de conciliación distintas que no deben pisarse:

|              | OPS                                                     | FIN.Operatoria                                                     |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Qué concilia | Ledger interno de OPS vs. extracto bancario             | Registros contables vs. estructuras bancarias / partners           |
| Para qué     | Validar que el saldo operativo coincide con la realidad | Validar que los asientos contables reflejan los movimientos reales |
| Quién opera  | Operaciones                                             | Finanzas                                                           |

Ver `marco-operativo.md` §4.2: hoy la conciliación operativa y la contable son el mismo proceso (único punto de control). FIN.Operatoria + FIN.Contabilidad + FIN.Tesorería permiten por primera vez separarlas formalmente.

### 7.5 Scope v1.0 (tentativo)

**Dentro de v1.0:**

- Vista de Movimientos de OPS con filtros y columnas de Finanzas.
- Vista de Quotes de TRD con filtros y columnas de Finanzas.
- Imputación contable provisional (hasta que el plan de cuentas exista formalmente en FIN.Contabilidad, la imputación queda en estado "clasificación provisional" — consistente con el enfoque de REQ-42).
- Cuenta Corriente de Clientes (vista consolidada).
- Cards totalizadores básicos (Revenue, Comisión).

**Fuera de v1.0:**

- Generación de facturas (depende de validación contable/legal — AFIP; ver gap FIN-11).
- Conciliación contable automatizada contra partners / bancos.
- Vinculación formal con plan de cuentas (depende de FIN.Contabilidad).

---

## 8. FIN.Compras

### 8.1 Qué es

Módulo de gestión de órdenes de compra y facturas de compra. Es el canal por el cual FIN gestiona todos los pagos no operativos del grupo: proveedores, servicios contratados, pagos intercompany, pagos de impuestos y RRHH.

### 8.2 Estado actual

Actualmente vive en **Contabilium**. La migración a FIN.Compras no es prioridad v1.0 — Contabilium sigue operativo mientras se consolida el resto de la aplicación.

### 8.3 Relaciones

- FIN.Compras genera instrucciones de pago que ejecuta FIN.Tesorería.
- Las facturas de compra generan asientos contables en FIN.Contabilidad.

---

## 9. FIN.Reportes — Centro de Reportería

Módulo genérico del financial-core (ver `framework/financial-core-modules.md` §8). El nombre del módulo en producto es **"Reportes"** — alineado con la convención transversal del core.

### 9.0 Qué reportes van a este módulo (criterio del framework §8.2)

No todo reporte va al módulo centralizado. Cada módulo del dominio puede tener exportaciones simples (CSV de su tabla actual, descargas de detalle, etc.) que viven dentro de su módulo y NO van a Reportes.

A Reportes van solo los que cumplen al menos uno de:

1. **Información consolidada** que cruza múltiples módulos o múltiples apps del core.
2. **Procesamiento complejo** que justifica ejecución asincrónica.
3. **Coordinación inter-área** — la generación requiere que múltiples áreas completen tareas previas en sus respectivas apps/módulos antes de poder ejecutarse.

### 9.1 Principio rector (patrón REQ-54 LEX)

La separación entre **definición** del reporte (ownership del área) y **generación** del reporte (ownership de Tecnología) es el principio central del módulo:

- **La definición** es ownership de Finanzas: se da de alta un registro en el catálogo que representa un tipo de reporte, con metadata y configuración completas (categoría, entidad rectora, periodicidad, normativa, formato, política de retención, parámetros). Finanzas puede editar, archivar o dar de baja registros sin intervención de Producto ni Tecnología.
- **La generación** es ownership de Tecnología: para cada registro del catálogo, Tecnología implementa una función de generación (query, enriquecimiento, template de formato) que se invoca desde el módulo — on-demand vía CTA o programada vía CRON.

Esta separación permite que el catálogo crezca incrementalmente — nuevos reportes se suman como alta + función de generación, sin refactor del módulo.

### 9.2 Componentes (adoptados del REQ-54)

- **Catálogo de reportes** organizado por categoría, con CRUD completo de definiciones (alta, edición, archivado, búsqueda, filtros).
- **Generación manual** (CTA "Generar" por registro, modal de parámetros, invocación sincrónica).
- **Generación automática** (CRON que consulta el catálogo, dispara los reportes vencidos o próximos con soporte automático, actualiza próxima fecha de emisión).
- **Alertas** sobre fechas de emisión (próximo, vencido, generado automáticamente) — implementadas como tipos del módulo Alertas (ver §14.4 — perfil C `REPORT_OVERDUE` Auto-system).
- **Histórico inmutable** de generaciones con metadata completa (reporte, fecha, trigger, parámetros, archivo, estado).
- **Extensibilidad sin refactor**: sumar un reporte nuevo = alta + función de generación vinculada.
- **Permisos por rol**.

### 9.3 Categorías propuestas

| Categoría        | Descripción                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Regulatorios** | Reportes a entes de control (ARCA, UIF, BCRA, CNV). Generalmente con normativa asociada y periodicidad fija.                |
| **Contables**    | Mayor de cuentas, Balance de saldos, Libro Diario, Balance General, Estado de Resultados. Generados desde FIN.Contabilidad. |
| **Financieros**  | P&L, Reporte de Revenue, Posición consolidada, Análisis de márgenes. Orientados a gestión interna (directorio, HoF).        |
| **Operativos**   | Conciliación global por banco, Movimientos sin asiento, Posición Nostro no operativo.                                       |

### 9.4 Candidatos iniciales al catálogo

| Reporte                                    | Categoría    | Entidad rectora    | Periodicidad                            | Estado                                           |
| ------------------------------------------ | ------------ | ------------------ | --------------------------------------- | ------------------------------------------------ |
| **INFO OPERACIONES / Listado facturación** | Regulatorios | ARCA + UIF         | Diaria al cierre (mín. semanal)         | REQ-57 — Alta urgencia                           |
| Reporte de P&L                             | Financieros  | Directorio interno | On-demand (daily/weekly/monthly/custom) | Skill existente (`features/ardua-pnl-report.md`) |
| Reporte de Revenue                         | Financieros  | Directorio interno | Diario / semanal / mensual              | En construcción (Santiago F.)                    |
| Régimen Informativo PSP BCRA               | Regulatorios | BCRA               | A confirmar                             | A identificar con Belén                          |
| Reportes CNV Circuit Pay                   | Regulatorios | CNV                | Según régimen                           | A identificar con Belén                          |
| Reportes UIF                               | Regulatorios | UIF                | A confirmar                             | A identificar con Belén                          |

### 9.5 Decisiones cerradas

- **Infraestructura de alertas (FIN-10 cerrado):** Alertas en FIN se construye como caso D · Hybrid del framework v1.1. Hereda del template B (perfil Workflow canónico LEX) y desactiva capacidades por tipo. Ver §14.4 para detalles.
- **Patrón compartido vs. instancia propia:** decisión alineada con el framework §3 — cada app implementa los módulos genéricos heredando del patrón canónico, declarando capacidades y perfiles. La infraestructura subyacente se construirá como REQ transversal (ver framework §13: REQ Alertas transversal pendiente, REQ Inbox transversal pendiente).

### 9.6 Dependencias inter-área (capacidad opcional activada)

Para reportes consolidados que requieren cierres previos en otras apps (ej: Estado de Resultados Mensual requiere conciliación operativa cerrada en OPS), FIN.Reportes activa la capacidad **dependencias inter-área** del framework §8.5: cada registro del catálogo declara sus dependencias (`{app, module, task, owner_role, sla_days_before}`) y el motor de Reportes emite alertas tipo `REPORT_DEPENDENCY` (perfil C · Auto-system) hacia las apps responsables según la integración descripta en framework §8.6.

---

## 10. Gaps críticos abiertos

| #          | Gap                                                                                                                                                             | Prioridad | Owner                   | Estado                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| FIN-01     | Tratamiento contable de operaciones (swaps, fees, spread FX, staking, FCI, intercompany) — no documentado                                                       | Alta      | Belén + Estudio externo | Abierto                                                                                                                             |
| FIN-02     | Plan de cuentas contable interno — no existe                                                                                                                    | Alta      | Belén + Estudio externo | Abierto                                                                                                                             |
| FIN-03     | Catálogo de asientos tipo por evento del CORE — no existe                                                                                                       | Alta      | Belén + Tech            | Abierto                                                                                                                             |
| FIN-04     | Valuación de criptoactivos — sin criterio formal                                                                                                                | Alta      | Belén + Estudio externo | Abierto                                                                                                                             |
| FIN-05     | Conciliación global — se resuelve con FIN.Tesorería + FIN.Contabilidad, pero requiere plan de cuentas                                                           | Alta      | HoP + Belén             | En curso                                                                                                                            |
| FIN-06     | Modelado moneda vs. canal — USD cable / MEP / CV7M / bvi no son monedas distintas; REQ-42 hoy los modela como monedas. Retrabajo probable si no se ajusta       | Alta      | HoP + Belén             | Abierto                                                                                                                             |
| FIN-07     | Catálogo OPS incompleto — faltan Ardua Solutions Corp + Astra Ventures; PERC sin documentar en `entities/`                                                      | Alta      | Belén + HoP             | Abierto                                                                                                                             |
| FIN-08     | Naming TES en doc técnica — el dev documenta TES como aplicación standalone; debe alinearse a "FIN.Tesorería"                                                   | Media     | HoP + Tech              | Abierto                                                                                                                             |
| FIN-09     | Ownership del catálogo de cuentas en el día a día — REQ-42 ubica el módulo en OPS pero no define CRUD ni flujo de alta/baja                                     | Media     | HoP                     | Abierto                                                                                                                             |
| **FIN-10** | **Infraestructura de alertas en FIN** — dependencia del patrón REQ-54; decisión arquitectónica pendiente                                                        | Media     | HoP                     | **✅ Cerrado (27/04/2026)** — caso D Hybrid del framework v1.1; perfiles por tipo declarados (ver §14.4)                            |
| FIN-11     | Facturación (FIN.Operatoria) — depende de validación legal / fiscal (AFIP); no puede entrar a v1 sin ese filtro                                                 | Media     | HoP + Belén + Legal     | Abierto                                                                                                                             |
| FIN-12     | Separación formal conciliación OPS vs. FIN — hoy es un único proceso; FIN.Operatoria + FIN.Tesorería habilitan separarlas, pero requiere decisión operativa     | Media     | HoP + COO + Belén       | Abierto                                                                                                                             |
| FIN-13     | Roles del equipo (Mauro González, Bárbara Luppino) — sin definir                                                                                                | Media     | HoP                     | Abierto                                                                                                                             |
| FIN-14     | Entidad legal y norma contable de Astra Ventures — TBD                                                                                                          | Media     | Legal + Estudio externo | Abierto                                                                                                                             |
| FIN-15     | Roadmap NetSuite — sin fecha ni alcance definido                                                                                                                | Media     | HoP + Belén             | Abierto                                                                                                                             |

---

## 11. Infraestructura de entidades y normas contables

| Entidad              | Norma                 | Moneda funcional  | Cierre |
| -------------------- | --------------------- | ----------------- | ------ |
| Haz Pagos            | RT FACPCE             | ARS               | 31/12  |
| Circuit Pay          | RT FACPCE             | ARS               | 31/12  |
| Ardua Solutions Corp | GAAP canadiense       | USD (reporta CAD) | 31/12  |
| Astra Ventures       | Normas polacas / NIIF | ⚠️ TBD            | 31/12  |

Ver `framework/marco-contable.md` para el detalle de pendientes por entidad.

---

## 12. Referencias externas

- **REQ-42** — OPS: Framework de Acciones y Asignación de Banco y Cuenta en Movimientos. Provee el catálogo de cuentas físicas y la asignación sociedad+banco+cuenta a movimientos OUT. Fuente del `core-tes-accounts-cache` que consume FIN.Tesorería.
- **REQ-54** — LEX: Centro de Reportería Regulatoria y Operativa. Patrón de Reportes adoptado por FIN.
- **REQ-57** — FIN: Automatización del archivo INFO OPERACIONES (ARCA/UIF). Primer caso concreto del catálogo de FIN.Reportes. ⚠️ Validar si hay duplicación con REQ-58 (Miles creó ambos tickets en el mismo mensaje).
- **REQ-59** — Reportería — Infraestructura Transversal del Core. Requiere update para alinear con framework v1.2 (criterios §8.2, dependencias §8.5, integración con Alertas §8.6).
- **REQ-52, REQ-33** — LEX y TRD: Módulos de Alertas. A migrar bajo REQ Alertas transversal pendiente (ver framework §13).
- **Notion TES** — Tesorería / Negocio / Técnico. Documentación del sistema técnico construido por Tecnología. Pendiente alinear naming a FIN.Tesorería (gap FIN-08).
- **CUENTAS_ESTRUCTURAS.xlsx** — carga inicial del catálogo de cuentas. 69 cuentas de Circuit Pay + Haz Pagos. Faltan ASC + Astra; columnas incompletas vs. REQ-42 (gap FIN-07).
- **Feature spec P&L:** `features/ardua-pnl-report.md`.
- **Marco contable** (framework): pendientes C-01 a C-16. Bloquean parcialmente el scope completo de FIN.Contabilidad.
- **Framework de módulos genéricos del financial-core:** `/Users/yasmani/Products/agents/framework/financial-core-modules.md` (v1.2). Define los 4 módulos transversales (Dashboard, Inbox, Alertas, Reportes), el modelo núcleo + capacidades, y la infraestructura transversal de Acciones.

---

## 13. Próximos pasos

| #   | Acción                                                                                                                            | Owner       |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Feature specs por módulo v1.0** (FIN.Tesorería / FIN.Operatoria / FIN.Reportes)                                                 | HoP         |
| 2   | Alinear naming TES → FIN.Tesorería con el dev; actualizar doc Notion (FIN-08)                                                     | HoP + Tech  |
| 3   | Resolver modelado moneda vs. canal antes de que REQ-42 consolide (FIN-06)                                                         | HoP + Belén |
| 4   | Excel del catálogo de cuentas: alinear con las 9 columnas de REQ-42, agregar ASC + Astra, documentar PERC en `entities/` (FIN-07) | HoP + Belén |
| 5   | **Cerrar la deuda detectada en §15 del prototipo FIN** mediante una próxima iteración del prompt (v5) cuando corresponda                     | HoP         |
| 6   | **Sesión de validación del prototipo FIN con Belén + Juan Cruz** (especialmente módulos Inbox, Alertas, Reportes)                 | HoP         |
| 7   | Validar duplicación REQ-57 / REQ-58 y consolidar en uno                                                                           | HoP         |
| 8   | Inventario inicial de reportes concretos para el catálogo de FIN.Reportes                                                         | HoP + Belén |
| 9   | Confirmar roles de Mauro y Bárbara (FIN-13)                                                                                       | HoP         |
| 10  | Levantar las 7 preguntas de diseño de FIN.Contabilidad (§6.5) como discovery formal cuando se aborde ese módulo                   | HoP + Belén |
| 11  | **Tramitar los 5 REQs transversales del financial-core en Jira** (ver framework v1.2 §13): update REQ-59 + AM-1004, REQ Inbox transversal, REQ Alertas transversal (unifica REQ-52 + REQ-33), REQ Acciones transversal, REQ Dashboard transversal | HoP + Tech  |

---

## 14. Estado del prototipo y decisiones materializadas

Esta sección consolida el estado del prototipo FIN al 27/04/2026 — las decisiones que ya están cerradas y materializadas en el prompt v4 y en el HTML, para acelerar challenge en próximas sesiones sin tener que reconstruir el contexto.

### 14.1 Artefactos en disco

| Artefacto | Path | Estado |
|---|---|---|
| Prompt del prototipo | `/Users/yasmani/Products/agents/prototypes/fin/PROMPT.md` | v4 · alineado con framework v1.2 |
| Prototipo HTML | `/Users/yasmani/Products/agents/prototypes/fin/fin-prototype.html` | Generado con prompt v3 — requiere regeneración con v4 para reflejar las decisiones cerradas |

### 14.2 Convenciones del sidebar (alineadas con framework §6)

Los 4 módulos genéricos del financial-core (Dashboard, Inbox, Alertas, Reportes) van **al tope del sidebar de FIN, sin agruparlos bajo `<div class="sb-section">`**. Los bloques del dominio (`OPERACIONES`, `FINANZAS`, `CONTABILIDAD`) se reservan para los módulos específicos del dominio.

```
[Brand: F · FIN · Ardua]
· Dashboard
· Inbox      [8]
· Alertas    [11]
· Reportes

OPERACIONES
· Movimientos     [47]
· Quotes          [23]

FINANZAS
· Tesorería        [8]
· Compras         [Soon]

CONTABILIDAD
· Contabilidad    [Soon]
```

### 14.3 Inbox — Solicitudes del dominio Finanzas

FIN.Inbox como skeleton funcional con 8 **Solicitudes** (nomenclatura del framework §9.0 — lo que se gestiona en Inbox no son "items" ni "tareas") en 8 tipos:

| Código | Label | Origen |
|---|---|---|
| `MANUAL_LOAD_APPROVAL` | Aprobación de carga manual | FIN.Tesorería (segundo aprobador) |
| `FEE_LOAD_APPROVAL` | Aprobación de carga manual de FEE | FIN.Tesorería |
| `WITHDRAWAL_FROM_CLP` | Solicitud de retiro del cliente | CLP (futuro) |
| `SUPPLIER_PAYMENT` | Solicitud de pago a proveedor | FIN.Compras (futuro) |
| `ADHOC_REPORT_REQUEST` | Pedido de generación de reporte ad-hoc | Directorio / solicitud informal |
| `RETROACTIVE_IMPUTATION` | Pedido de imputación retroactiva | OPS |
| `MANUAL_JOURNAL_APPROVAL` | Asiento manual pendiente de aprobación | FIN.Contabilidad (futuro) |
| `REPORT_DEPENDENCY` | Dependencia de reporte centralizado | SYSTEM (auto-generado por FIN.Reportes) |

**Capacidades activadas:** vista Tablero (Kanban) + Lista con toggle, drag & drop híbrido (libre `pending → in_progress` con auto-asignación, modal de confirmación para `* → completed`), drawer + timeline, modal de cierre con radio buttons por tipo + comentario obligatorio ≥ 10 chars, sistema de asignación, indicador SLA visual.

**Estados canónicos de Inbox:** `pending` (To Do) / `in_progress` (In Progress) / `completed` (Done). `completed` es terminal.

### 14.4 Alertas — perfil D Hybrid (FIN-10 cerrado)

El módulo arranca del template B (Workflow completo, herencia de LEX) y desactiva capacidades por tipo según el perfil declarado:

| Código | Tipo | Perfil | Comportamiento en UI |
|---|---|---|---|
| `RECONCILIATION` | Conciliación con diferencias | **B · Workflow** | Flujo completo: drawer + asignación + timeline + comentarios + modal de cierre con justificación ≥ 10 chars |
| `IMPUTATION_SLA` | Imputación pendiente vence SLA | **B · Workflow** | Flujo completo |
| `APPROVAL_OVERDUE` | Aprobación pendiente vence SLA | **A · Notification-only** | Drawer compacto read-only · botón único "Marcar como atendida" · sin asignación · sin timeline humano · sin justificación obligatoria. Estados: `new` / `resolved` |
| `BALANCE_ANOMALY` | Anomalía de saldo o valuación | **A · Notification-only** | Idem `APPROVAL_OVERDUE` |
| `REPORT_OVERDUE` | Reporte vencido / próximo a vencer | **C · Auto-system** | Auto-generado y auto-cerrado por sistema. Estado terminal: `auto_resolved`. El usuario lo ve como histórico, no actúa sobre él |

**Estados a soportar visualmente:** `new`, `in_review`, `resolved`, `dismissed` (los 4 ya implementados en LEX) **+ `auto_resolved`** (nuevo, exclusivo de tipos C).

**Dataset del prototipo:** 25 alertas distribuidas en estados (7 nuevas / 4 en revisión / 9 revisadas / 5 descartadas), distribución por tipo aproximada: 5 RECONCILIATION + 5 IMPUTATION_SLA + 4 APPROVAL_OVERDUE + 5 REPORT_OVERDUE + 6 BALANCE_ANOMALY.

### 14.5 Reportes — todas las capacidades activas

FIN.Reportes implementa **todas las capacidades opcionales** del framework §8.4: edición de metadata, CRON activable por usuario, dependencias inter-área, validación previa, modal de detalle, filtros del histórico, reportes bloqueados visibles.

**Catálogo del prototipo:** 15 reportes en 4 categorías (Contables / Regulatorios / Financieros / Operativos). Los 4 Contables aparecen visibles pero `.locked` (bloqueados hasta que FIN.Contabilidad exista).

**Integración con Alertas vía `REPORT_DEPENDENCY`** (framework §8.6) implementada como mock en el prototipo — la lógica real es responsabilidad del backend transversal (REQ Reportes en Jira).

### 14.6 Dashboard

FIN.Dashboard implementa todas las capacidades opcionales del framework §10.2: 4 KPIs accionables, lista de alertas activas embebidas, próximos vencimientos de Reportes, actividad reciente.

### 14.7 Próximos pasos sobre el prototipo

1. **Regenerar el prototipo con prompt v4** — el HTML actual es de v3 y está desactualizado respecto a las decisiones cerradas (especialmente Inbox como skeleton funcional, perfiles por tipo en Alertas, genéricos al tope del sidebar).
2. **Sesión de validación con Belén + Juan Cruz** — challenge sobre los 4 módulos genéricos + Tesorería + Operatoria. Output esperado: feedback que se incorpora a este discovery + ajustes al prompt v5 si aparecen.
3. **Tramitar los 5 REQs transversales en Jira** (ver framework §13) para que las convenciones tengan respaldo de spec y construcción.

---

## Anexo · Modelo conceptual de dimensiones del registro

El modelo conceptual que organiza los módulos del bloque Tesorería + Contabilidad bajo la matriz **Reportes × Acciones** se desarrolló como discovery transversal y se consolidó en `framework/marco-dimensiones-registros.md` (v1.1, iteración del 28/04/2026).

El marco aplica a las tres apps operativas-transaccionales del financial-core (FIN, OPS, TRD) y produce directamente el manifest de Acciones de cada módulo. La aplicación específica al dominio FIN se refleja en §3 (taxonomía v3), §5 (FIN.Tesorería), §6 (FIN.Contabilidad) y §7 (FIN.Operatoria) de este documento.

Referencia histórica: este anexo reemplaza al archivo `discovery/opened/modulo-tesoreria-diseño-conceptual.md` (eliminado el 29/04/2026), cuyo contenido vivo ya migró a `framework/marco-dimensiones-registros.md`.
