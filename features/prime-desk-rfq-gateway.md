# PRIME DESK \- RFQ GATEWAY

## SOFTWARE REQUIREMENTS SPECIFICATION

## (SRS)

**Versión:** 1.0  
**Fecha:** 04 de Febrero de 2026  
**Estado:** En Revisión

---

# CONTROL DE VERSIONES

| Versión | Fecha      | Autor           | Cambios                                                   |
| :------ | :--------- | :-------------- | :-------------------------------------------------------- |
| 1.0     | 2026-01-15 | Product Manager | Borrador inicial.                                         |
| 2.0     | 2026-01-30 | Product Manager | Refactorización del modelo de inmutabilidad.              |
| 3.0     | 2026-02-11 | Product Manager | Refactoring de arquitectura para soporte multi-operación. |
| 4.0     | 2026-02-15 | Product Manager | Versión completa para revisión técnica.                   |

---

# TABLA DE CONTENIDO

1. [Introducción](#1.-introducción)
2. [Visión General del Sistema](#2.-visión-general-del-sistema)
3. [Actores del Sistema](#3.-actores-del-sistema)
4. [Requerimientos Funcionales](#4.-requerimientos-funcionales)
5. [Modelo de Datos](#5.-modelo-de-datos)
6. [Especificación de Servicios](#6.-especificación-de-servicios)
7. [Interfaces de Usuario](#7.-interfaces-de-usuario)
8. [Reglas de Negocio](#8.-reglas-de-negocio)
9. [Casos de Uso](#9.-casos-de-uso)
10. [Invariantes del Sistema](#10.-invariantes-del-sistema)
11. [Integraciones](#11.-integraciones)
12. [Consideraciones Operativas](#12.-consideraciones-operativas)
13. [Glosario](#13.-glosario)

## ---

# 1\. INTRODUCCIÓN {#1.-introducción}

## 1.1 Propósito del Documento

Este documento especifica los requerimientos funcionales del sistema **Prime Desk \- RFQ Gateway**, un motor de cotización bajo esquema **RFQ (Request for Quotation)** que soporta múltiples tipos de operaciones.

**Operaciones soportadas:**

- v1.0 (actual): SWAP \- Intercambio de divisas digitales y fiduciarias.
- v2.0 (próximo): PAYMENT \- Pagos internacionales a beneficiarios.

### **Payment (v2.0) – Extension Point**

En la versión actual (v1.0), el sistema soporta exclusivamente operaciones de tipo **SWAP**.

El tipo de operación **PAYMENT** y los endpoints asociados (/v1/ape/payment/\*) se incluyen únicamente como **reserva de contrato para futuras iteraciones**, permitiendo incorporar nuevos modelos de pricing y gestión de capacidad sin introducir breaking changes en las APIs.

En v1.0:

- Los endpoints de PAYMENT retornan 501 NOT_IMPLEMENTED.
- No existen flujos operativos, invariantes, ni modelo de datos aplicables a PAYMENT.
- Las reglas de exposición y reservas aplican exclusivamente a operaciones SWAP.

La definición funcional completa del módulo PAYMENT será especificada en la versión v2.0 del presente documento.

**Esquema Operativo:**

- **Cotización**: 24/7 \- Los clientes pueden solicitar y aceptar cotizaciones en cualquier horario.
- **Liquidación**: Manual en horario hábil \- Ambas partes ejecutan las transferencias físicas (blockchain/bancarias) durante horario operativo.

El sistema gestiona el ciclo completo de cotización y reserva de liquidez, registrando operaciones aceptadas como "ejecutadas" a nivel contable. La liquidación física de los activos ocurre posteriormente de forma manual.

## 1.2 Alcance del Sistema

Prime Desk \- RFQ Gateway es un motor de cotización RFQ que se integra con los módulos de Quotes (TRD) y Clients (LEX).

**Tipos de Operaciones:**

- SWAP (v1.0 \- Actual): Intercambio de divisas digitales (USDC, USDT) y fiduciarias (ARS, USD).
  - Modelo operativo:
    - Pricing basado en lotes de liquidez con allocations.
    - BPS aplicado por cliente/grupo.
    - Reservas temporales con TTL.
    - Liquidación física manual bilateral.
- PAYMENT (v2.0 \- Próximamente): Pagos internacionales a beneficiarios en otras jurisdicciones.
  - Modelo operativo: TBD (será definido en especificación de v2.0).

Para operaciones de Swap (v1.0), el sistema provee:

**Para Clientes:**

- Solicitud de cotizaciones (RFQ \- Request for Quote).
- Aceptación o rechazo de cotizaciones.
- Acceso vía Web App o API.
- Consulta de operaciones confirmadas pendientes de liquidación.

**Para Mesa de Trading:**

- Registro de entrada y salida de capital en lotes de liquidez.
- Configuración de pricing y spreads (BPS) y límites de exposición por cliente/grupo.
- Suspensión/activación de lotes.
- Consulta de operaciones confirmadas pendientes de liquidación física.

**Fuera de alcance:**

- Ejecución de transferencias blockchain/bancarias.
- Gestión de wallets y custodia.
- Reporting financiero avanzado.
- KYC/AML (proceso semi-automatizado manejado por Compliance).
- Gestión de liquidaciones (proceso operativo manual).
- Reconciliación contable automática (v2.0 \- futura iteración).

**Tipos de divisas soportadas:**

El sistema maneja operaciones de swap entre dos categorías de divisas:

1. **Divisas Digitales** (Base Asset típico):
   - Stablecoins: USDC, USDT, etc.
   - Implementadas en blockchain (Ethereum, Polygon, etc.).
   - Transferencias on-chain.

2. **Divisas Fiduciarias** (Quote Asset típico):
   - ARS (Peso Argentino).
   - USD (Dólar Estadounidense).
   - Transferencias bancarias tradicionales.

**Pares soportados típicos:**

- USDC/ARS, USDT/ARS (digital → fiat).
- USD/ARS (fiat → fiat).

**Nota:** El sistema NO maneja:

- Criptomonedas volátiles (BTC, ETH, etc.).
- NFTs o tokens de utilidad.
- Commodities o acciones.
- Otros activos digitales no monetarios.

## 1.3 Principios de Diseño

1. Separación de Responsabilidades: El Cliente nunca ve lógica interna de pricing, allocations, ni configuración de lotes.
2. Inmutabilidad del Ledger: Las transacciones transitan entre estados operativos hasta alcanzar un estado terminal contable. Una vez alcanzado el estado terminal, la transacción se vuelve completamente inmutable.  
   **Estados terminales por tipo:**

- **FUNDS_IN / FUNDS_OUT:** SETTLED (operación finalizada y registrada)
- **FUNDS_RESERVE:** REVERTED (reserva liberada) o EXECUTED (reserva comprometida)  
  **Garantías de inmutabilidad:**
- Toda transacción en estado terminal es inmutable: ningún campo puede modificarse.
- El campo became_immutable_at registra el momento exacto en que la transacción alcanzó estado terminal.
- Toda transacción mantiene un historial completo de cambios de estado en tabla de auditoría (state_logs).
- Correcciones: Sólo mediante nuevas transacciones compensatorias, nunca por modificación o eliminación de registros existentes.

3. Atomicidad: Las reservas de fondos (FUNDS_RESERVE) y sus resoluciones (EXECUTED/REVERTED) son operaciones atómicas que garantizan consistencia del stock disponible.
4. Trazabilidad: Toda operación es auditable end-to-end. Cada cambio de estado de una transacción queda registrado con timestamp, usuario responsable y razón del cambio.
5. Expiración Automática: Las reservas de fondos (FUNDS_RESERVE) no confirmadas expiran automáticamente sin intervención manual, liberando la capacidad reservada.
6. Precio Racional: Los **precios** se expresan como fracción racional (numerador/denominador enteros) para cálculos exactos sin redondeo. Los **montos** se expresan en NUMERIC(20,10) para soportar flexibilidad decimal mientras se mantiene precisión de 10 dígitos.

## 1.4 Audiencia del Documento

- Equipo de Desarrollo.
- Mesa de Trading.
- Equipo de Producto.
- Compliance y Auditoría.

## ---

# 2\. VISIÓN GENERAL DEL SISTEMA {#2.-visión-general-del-sistema}

## 2.1 Contexto

Ardua provee servicios **OTC** para operaciones con divisas digitales y fiduciarias. **Prime Desk \- RFQ Gateway** es una plataforma que permite a los clientes de estos servicios OTC cotizar y ejecutar operaciones bajo el esquema **RFQ (Request for Quotation)**.

- Versión actual (v1.0): Soporta operaciones de tipo **SWAP** (intercambio de divisas digitales y fiduciarias).
- Roadmap (v2.0): Se incorporará soporte para **PAYMENT** (pagos internacionales a beneficiarios).

**Tipos de clientes objetivo:**

1. **B2B**: Empresas que operan directamente con Ardua, ejemplos: otras fintechs, exchanges, mesas OTC, fondos de inversión.
2. **B2B2C**: Empresas que ofrecen servicios de Ardua a sus usuarios finales, ejemplos: Exchanges que usan Ardua para proveer liquidez a sus clientes retail, wallets que integran swap.

**Casos de uso principales:**

1. **Clientes B2B/B2B2C**: Acceden vía Web App o API para solicitar cotizaciones, comparar precios y confirmar operaciones de forma inmediata (24/7).
2. **Mesa de Trading (Ardua)**:
   - Gestiona liquidez y pricing a través del Admin Panel.
   - Registra entradas y salidas de fondos en lotes de liquidez.
   - Gestiona liquidaciones físicas (transferencias blockchain/bancarias) en horario hábil.
   - Utiliza los precios del sistema como referencia para operaciones OTC tradicionales (negociación directa vía chat/llamada).

**Modelo operativo:** El sistema opera bajo esquema **RFQ** donde:

- La **cotización y aceptación** ocurren en tiempo real, 24/7
- La **liquidación física** (transferencias reales) se ejecuta manualmente por ambas partes (Cliente/Mesa) en horario hábil.

## 2.2 Arquitectura de Alto Nivel

┌─────────────────────────────────────┐

│ SWAP GATEWAY SYSTEM │

└─────────────────────────────────────┘

**Para el Cliente:**

CLIENTE  
 ↓  
WEB APP / API CLIENT  
 ↓  
RFQ API

    ├─ Valida precio de referencia vs market
    ├─ Consulta BPS aplicable
    ├─ Construye pre-quotes
    └─ Gestiona tokens y TTL
    ↓

ARDUA PRICE ENGINE (APE)  
├─ Swap Module (v1.0) ✓ Alcanzado  
│ ├─ Gestión de lotes de liquidez  
│ ├─ Transacciones: FUNDS_IN/FUNDS_OUT/FUNDS_RESERVE  
│ └─ Pricing vía providers externos (Binance, BYMA, Bitso)  
└─ Payment Module (v2.0) ⏱ Proximamente  
 ├─ Gestión de órdenes de pago  
 ├─ Cálculo de FX rates \+ fees  
 └─ Transacciones específicas de payment  
 ↓  
CONECTABLES  
 ├─ Quote Module(TRX)  
 └─ Client Module(LEX)

**Para la Mesa de Trading:**

MESA  
 ↓  
ADMIN PANEL  
 ↓  
ADMIN BFF (Backend for Frontend)  
 ↓  
APE

## 2.3 Componentes Principales

| Componente            | Propósito                                                                                                                                     |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| Web App               | Interfaz de cliente para swaps en el portal app.arduasolutions.com                                                                            |
| API Client            | Integración programática, no desarrollada por Ardua (cualquier cliente HTTP: Postman, cURL, SDKs propios)                                     |
| RFQ API               | Orquestador de cotizaciones: enruta requests por tipo de operación, valida pricing, construye pre-quotes, consulta **Market Reference**.      |
| APE \- Swap Module    | Gestión de lotes de liquidez para operaciones SWAP (FUNDS_IN/FUNDS_OUT/FUNDS_RESERVE) y pricing vía providers externos (BYMA, Binance, Bitso) |
| APE \- Payment Module | Gestión de órdenes de pago (v2.0 \- No implementado)                                                                                          |
| Admin Panel           | Interfaz de gestión para Mesa de Trading                                                                                                      |
| Admin BFF             | BFF de interfaz de administración                                                                                                             |
| Quote Module          | Persistencia de Quotes (TRD)                                                                                                                  |
| Client Module         | Gestión de Clientes (LEX)                                                                                                                     |

**Nota sobre integración con proveedores de precios:**

- **TradingView** (Market Reference): Consultado directamente por RFQ API para validación de precios.
- **Binance/BYMA/Bitso** (Price Providers): Consultados por APE Price Provider Adapter para pricing operativo de lotes.

**Uso adicional del sistema:**

La Mesa de Trading de Ardua también utiliza los precios generados por este sistema como **referencia** para operaciones OTC tradicionales.

---

# 3\. ACTORES DEL SISTEMA {#3.-actores-del-sistema}

## 3.1 Cliente

**Descripción:** Cliente B2B y/o B2B2C de los servicios OTC de Ardua que utiliza la plataforma para solicitar cotizaciones y ejecutar operaciones de swap de divisas digitales (stablecoins) y divisas fiduciarias de forma automatizada.

**Responsabilidades:**

- Solicitar cotizaciones por tipo de operación:
  - SWAP(v1.0)
  - PAYMENT(v2.0 \- no disponible)
- Aceptar o rechazar pre-quotes dentro del TTL.
- Consultar estado de operaciones.

**Restricciones:**

- No puede ver lógica interna de pricing.
- No puede registrar entradas o salidas de fondos en lotes.
- No puede configurar pricing.
- Opera dentro de rate limits establecidos.

**Canales de acceso:**

- Web App (app.arduasolutions.com).
- API (api.arduasolutions.com).

---

## 3.2 Trader

**Descripción:** Operador de la Mesa de Trading que gestiona liquidez operativa.

**Responsabilidades:**

- Registrar entradas de fondos (FUNDS_IN) con capital en lotes.
- Registrar salidas de fondos (FUNDS_OUT) de lotes dentro de límites.
- Suspender lotes temporalmente.
- Configurar BPS y límites de clientes/grupos.
- Monitorear utilización de lotes.

**Restricciones:**

- Solo puede registrar salidas (FUNDS_OUT) hasta el monto available del lote.
- Salidas (FUNDS_OUT) por encima de threshold requieren aprobación de supervisor.
- No puede cerrar lotes (solo supervisor).
- No puede crear lotes nuevos (solo supervisor).

**Canal de acceso:**

- Admin Panel (admin.arduasolutions.com).

---

## 3.3 Supervisor

**Descripción:** Supervisor de mesa con permisos elevados.

**Responsabilidades:**

- Todas las de Mesa Trader.
- Aprobar retiros grandes (\> threshold).
- Crear y cerrar lotes.
- Configurar límites de exposición.

**Canal de acceso:**

- Admin Panel (admin.arduasolutions.com).

---

## 3.4 Sistema (Automático)

**Descripción:** Procesos automatizados del sistema.

**Responsabilidades:**

- Reservar stock (FUNDS_RESERVE con estado RESERVED) al emitir pre-quote.
- Ejecutar reservas (FUNDS_RESERVE → estado EXECUTED) al crear quote.
- Liberar reservas (FUNDS_RESERVE → estado REVERTED) al rechazar/expirar.
- Expirar reservas automáticamente por TTL.
- Generar alertas operativas.

---

# 4\. REQUERIMIENTOS FUNCIONALES {#4.-requerimientos-funcionales}

## 4.1 Módulo: Cotización (RFQ)

**Nota sobre Tipos de Operación**

El RFQ API soporta múltiples tipos de operaciones a través de endpoints específicos:

- **SWAP**: POST /v1/rfq/swap (implementado en v1.0)
- **PAYMENT**: POST /v1/rfq/payment (planificado para v2.0)

Las operaciones de aceptación y rechazo son comunes a todos los tipos:

- POST /v1/rfq/pre_quotes/{id}/accept
- POST /v1/rfq/pre_quotes/{id}/reject

### RF-001: Solicitar Cotización SWAP

**Descripción:** Cliente solicita una cotización para una operación de tipo swap.

**Endpoint:** POST /v1/rfq/swap

**Actor:** Cliente.

**Precondiciones:**

- Cliente autenticado.
- Par de divisas soportado por el sistema.
- Monto solicitado dentro de límites.

**Entradas:**

- pair: Par de divisas (ej: "USDC/ARS", "USDT/ARS").
- side: Dirección de la operación ("BUY" | "SELL").
- requested_quote_asset_amount: Monto solicitado en quote_asset.
- client_id: ID del Cliente.
- idempotency_key: (opcional) Clave de idempotencia.

**Proceso:**

1. RFQ API valida request (schema, autenticación, rate limit).
2. RFQ API consulta configuración del cliente en Client Module.
   - Obtiene applicable_bps y max_open_exposure
3. RFQ API consulta APE → POST /v1/ape/swap/reference-price  
   **Request:**  
   json  
   {  
    "base_asset": "USDC",  
    "quote_asset": "ARS",  
    "side": "BUY",  
    "requested_quote_asset_amount": 40000000,  
    "client_id": "cli_001"  
   }  
   **APE proceso interno:**

- Filtra lotes donde base_asset \+ quote_asset \+ side coinciden.
- Aplica reglas de elegibilidad (RN-007)
  - Reglas temporales: blackout_windows, exclude_dates, include_dates, holiday_calendar, weekly_windows.
  - Threshold de disponibilidad: snapshot.available \>= min_lot_available_threshold\[base_asset\] (usa min_lot_available_threshold\[default\] si asset no configurado).
- Para cada lote elegible: consulta snapshots.available para obtener disponibilidad real.
- Calcula cobertura: available \* lots.price (cuánto quote_asset puede cubrir).
- Distribuye requested_quote_asset_amount entre lotes elegibles (estrategia waterfall).
- Construye allocations con precios BASE y montos cubiertos por cada lote.  
  **Response (ilustrativo):**
- allocations: array con distribución por lote (puede estar vacío si ningún lote elegible).
- covered_quote_asset_amount: suma de montos cubiertos.
- pending_quote_asset_amount: requested \- covered.
- Cada allocation incluye price BASE (costo de referencia del lote).

4. RFQ API aplica BPS por allocation y calcula precio final.
5. RFQ API valida precio agregado vs Market Reference (TradingView).
   - Threshold típico: ±2% de tolerancia(configurable).
6. RFQ API calcula exposición actual del cliente:
   - Query: SUM de reservas activas (tipo=FUNDS_RESERVE, status=RESERVED) del cliente.
7. RFQ API evalúa cobertura de allocations:
   - Si covered_quote_asset_amount \= 0:
     - Retornar Error 400 NO_LIQUIDITY_AVAILABLE
     - No crear pre-quote, no ejecutar FUNDS_RESERVEs, fin del flujo
   - Si covered_quote_asset_amount \> 0:
     - Continuar con paso 8 (cobertura parcial o total es válida).
8. RFQ API consulta exposición actual del cliente:
   - Obtener current_open_exposure desde response de GET /v1/ape/clients/{client_id}/exposure (expresado en exposure_currency configurada)
   - Calcular nuevo_monto_equivalent desde allocations:  
     Para cada allocation:
     - Obtener base_asset del lote
     - Obtener exchange_rate desde configuración APE. Si no hay exchange_rate configurada para el base_asset, usar 1.0 como default.
     - amount_equivalent \= covered_base_asset_amount \* exchange_rate

     nuevo_monto_equivalent \= SUM(amount_equivalent)

9. RFQ API valida límite de exposición abierta:
   - Si max_open_exposure está definido:
     - current_open_exposure \+ nuevo_monto \<= max_open_exposure.
     - Si falla → Error EXPOSURE_LIMIT_EXCEEDED.
   - Si max_open_exposure es NULL: continuar sin restricción.
10. RFQ API solicita a APE ejecutar las FUNDS_RESERVEs de capacidad con TTL(RFQ API → APE: POST /v1/ape/swap/reserve).
11. APE ejecuta reserva en lotes:
    - Crea transacciones tipo FUNDS_RESERVE con estado RESERVED.
    - Incluye client_id en cada transacción.
    - Actualiza snapshots: available \-= amount, reserved \+= amount.
    - Si APE retorna SUCCESS → continuar con paso 12\.
    - Si APE retorna ERROR → Error FUNDS_COULD_NOT_BE_BLOCKED (conflicto de concurrencia en snapshot.version).

    **Request:**

    sql

    _\-- Inicio de transacción_

    BEGIN;

    _\-- Crear reserva de fondos_

    INSERT INTO transactions (

    lot_id, type, amount, status, reference_type, reference_id, client_id, expires_at

    ) VALUES (

    'lot_001', 'FUNDS_RESERVE', 5000, 'RESERVED', 'PREQUOTE', 'pq_abc123', 'cli_001' CURRENT_TIMESTAMP \+ INTERVAL '30' SECOND

    );

    _\-- Actualizar snapshot del lote_

    UPDATE snapshots

    SET available \= available \- 5000, reserved \= reserved \+ 5000, version \= version \+ 1

    WHERE lot_id \= 'lot_001' AND version \= expected_version;

    _\-- Verificar que se actualizó (control de concurrencia)_

    _\-- Si rows_affected \= 0 → VERSION_CONFLICT_

    COMMIT;

12. RFQ API persiste pre-quote en base de datos con operation_type \= 'swap'.
13. RFQ API genera token firmado (JWT con TTL configurado en pre_quote_ttl_seconds).
14. RFQ API retorna pre-quote resumida al cliente.

**Salidas:**

- Pre-quote summary (sin allocations).
- Token firmado con TTL.
- Precio agregado final.
- Coverage info: Porcentaje de cobertura y estado (total/parcial).

**Postcondiciones:**

- Pre-quote persistida con status ISSUED.
- Stock reservado (transacciones tipo FUNDS_RESERVE con estado RESERVED) en lotes.
- Token válido por TTL configurado.

**Errores:**

- VALIDATION_ERROR: Request mal formado
- INVALID_REFERENCE_PRICE: Precio fuera de tolerancia vs mercado
- RATE_LIMIT_EXCEEDED: Cliente excedió rate limit
- NO_LIQUIDITY_AVAILABLE: Sin liquidez disponible para cubrir ninguna porción del monto solicitado (covered \= 0).
- FUNDS_COULD_NOT_BE_BLOCKED: Error al reservar capacidad en lotes (conflicto de concurrencia en snapshots.version).
- UNSUPPORTED_PAIR: Par no soportado.
- EXPOSURE_LIMIT_EXCEEDED: Cliente alcanzó límite de capital reservado.

**Reglas de negocio aplicables:**

- RN-001, RN-005, RN-006, RN-007

---

### RF-002: Aceptar Pre-Quote

**Descripción:** Cliente acepta una pre-quote, creando una quote definitiva. La operación queda **confirmada** en el sistema. La liquidación física (transferencias blockchain/bancarias) se ejecuta posteriormente de forma manual por ambas partes en horario hábil.

**Endpoint:** POST /v1/rfq/pre_quotes/{pre_quote_id}/accept

**Nota:** Este endpoint es común para todos los tipos de operación. El sistema determina el tipo basándose en el operation_type de la pre-quote.

**Actor:** Cliente

**Precondiciones:**

- Pre-quote válida (status ISSUED).
- TTL no expirado (con margen de gracia de 5s).
- Token válido.

**Entradas:**

- pre_quote_id: Identificador de pre-quote.
- pre_quote_token: Token firmado recibido.
- idempotency_key: (opcional) Clave de idempotencia.

**Proceso:**

1. RFQ API valida token (firma, TTL, client binding, anti-replay).
2. RFQ API valida TTL restante \>= 5 segundos.
3. RFQ API obtiene detalle completo de pre-quote de la base de datos.
4. RFQ API envía CREATE_QUOTE a Quote Module(TRD).
5. Quote Module retorna quote_id.
6. RFQ API actualiza pre_quote con quote_id retornado:  
   sql  
   UPDATE pre_quotes  
   SET quote_id \= 'q_7781', status \= 'ACCEPTED', updated_at \= CURRENT_TIMESTAMP  
   WHERE pre_quote_id \= 'pq_abc123';
7. Quote Module retorna 201 Created con quote_id.
8. RFQ API notifica a Allocation vía webhook(RFQ API → APE: POST /v1/ape/swap/execute).
9. APE ejecuta EXECUTE de FUNDS_RESERVEs
   - Actualiza transacciones tipo FUNDS_RESERVE de estado RESERVED a EXECUTED.
   - Marca transacciones como inmutables (is_immutable \= TRUE, became_immutable_at \= NOW()).

   **Ejemplo SQL genérico (ilustrativo):**

   sql

   BEGIN;

   _\-- Transición de estado: RESERVED → EXECUTED_

   UPDATE transactions

   SET

   status \= 'EXECUTED',

   is_immutable \= TRUE,

   became_immutable_at \= CURRENT_TIMESTAMP

   WHERE id IN (reserve_tx_ids) AND type \= 'FUNDS_RESERVE' AND status \= 'RESERVED';

   _\-- Actualizar snapshots: reserved → executed_

   UPDATE snapshots

   SET reserved \= reserved \- total_amount, executed \= executed \+ total_amount, version \= version \+ 1

   WHERE lot_id IN (affected_lot_ids);

   COMMIT;

10. Allocation actualiza snapshots (reserved → executed).
11. RFQ API retorna confirmación al cliente.

**Salidas:**

- quote_id: Identificador de quote creada.
- status: "CONFIRMED_PENDING_SETTLEMENT".
- settlement_note: "Liquidación física se ejecutará en horario hábil".

**Postcondiciones:**

- Quote persistida en Quote Module con status CONFIRMED.
- Stock definitivamente asignado (transacciones FUNDS_RESERVE en estado EXECUTED, inmutables).
- Pre-quote marcada como ACCEPTED.
- Operación confirmada pero pendiente de liquidación física (transferencias se ejecutan manualmente por ambas partes en horario hábil)

**Errores:**

- INVALID_PREQUOTE_TOKEN: Token inválido o manipulado.
- PREQUOTE_EXPIRED: TTL expirado.
- PREQUOTE_EXPIRING_SOON: TTL \< 5s (grace period).
- TOKEN_CUSTOMER_MISMATCH: Token no pertenece al cliente.
- REPLAY_DETECTED: Token ya usado.
- REQUOTE_REQUIRED: Error en ejecución, requiere nueva cotización.

**Reglas de negocio aplicables:**

- RN-002, RN-003, RN-008

**Nota sobre liquidación:** El sistema registra la operación como "ejecutada". Ambas partes (Cliente/Mesa) ejecutan las transferencias físicas (blockchain/bancarias) de forma manual en horario hábil. Los clientes podrán consultar el status de liquidación a través de la Web App.

---

### RF-003: Rechazar Pre-Quote

**Descripción:** Cliente rechaza explícitamente una pre-quote.

**Endpoint:** POST /v1/rfq/pre_quotes/{pre_quote_id}/reject

**Nota:** Este endpoint es común para todos los tipos de operación.

**Actor:** Cliente

**Precondiciones:**

- Pre-quote válida.

**Entradas:**

- pre_quote_id: Identificador de pre-quote.
- pre_quote_token: Token firmado.

**Proceso:**

1. RFQ API valida token (firma, client binding).
2. RFQ API notifica a APE vía webhook(RFQ API → APE: POST /v1/ape/swap/revert).
3. Allocation ejecuta transición de estado de reservas:
   - Actualiza transacciones tipo FUNDS_RESERVE de estado RESERVED a REVERTED.
   - Marca transacciones como inmutables.

   **Ejemplo SQL genérico (ilustrativo):**

   sql

   BEGIN;

   _\-- Transición de estado: RESERVED → REVERTED_

   UPDATE transactions

   SET

   status \= 'REVERTED',

   is_immutable \= TRUE,

   became_immutable_at \= CURRENT_TIMESTAMP,

   reason \= :reason_param

   WHERE id IN (reserve_tx_ids) AND type \= 'FUNDS_RESERVE' AND status \= 'RESERVED';

   _\-- Actualizar snapshots: reserved → available_

   UPDATE snapshots SET reserved \= reserved \- total_amount, available \= available \+ total_amount, version \= version \+ 1

   WHERE lot_id IN (affected_lot_ids);

   COMMIT;

4. Snapshots actualizados (reserved → available).
5. Pre-quote marcada como REJECTED.

**Salidas:**

- pre_quote_id: Confirmación.
- status: "REJECTED".

**Postcondiciones:**

- Stock liberado (transacciones FUNDS_RESERVE en estado REVERTED, inmutables).
- Capacidad disponible nuevamente.
- Pre-quote marcada como REJECTED.

**Errores:**

- INVALID_PREQUOTE_TOKEN: Token inválido.
- PREQUOTE_EXPIRED: Ya expiró (no requiere acción).

**Reglas de negocio aplicables:**

- RN-004

---

### RF-004: Solicitar Cotización de Payment (Placeholder)

**Descripción:** Cliente solicita cotización para pago internacional (cross-border payment).

**Endpoint:** POST /v1/rfq/payment

**Status:** NOT_IMPLEMENTED (Planificado para v2.0)

**Actor:** Cliente

**Response:**

json

{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Cross-border payment quotations will be available in v2.0",  
 "details": {  
 "operation_type": "payment",  
 "status": "planned",  
 "expected_version": "v2.0"  
 }  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

**Nota:** El diseño completo del request/response se definirá en la especificación de v2.0 una vez que se determine el modelo de pricing para payments.

---

## 4.2 Módulo: Gestión de Liquidez (Mesa de Trading)

**Nota:** Los lotes de liquidez son específicos del modelo de operaciones de tipo swap. Las operaciones de tipo payment (v2.0) utilizarán un modelo diferente (TBD).

### RF-100: Registrar Entrada de Fondos (FUNDS_IN)

**Descripción:** Mesa agrega capital a un lote para incrementar disponibilidad.

**Actor:** Trader, Supervisor.

**Precondiciones:**

- Lote existe y status \!= CLOSED.
- Usuario tiene rol MESA_TRADER o MESA_SUPERVISOR.
- Fondos transferidos a wallet/cuenta de Ardua.

**Entradas:**

- lot_id: Identificador del lote.
- amount: Monto a fondear (en base_asset del lote).
- external_reference: Hash de transacción blockchain/bancaria.
- reason: Motivo del fondeo (opcional).

**Proceso:**

1. Admin BFF valida permisos del usuario.
2. Admin BFF delega a APE \- Swap Module.
3. Allocation valida
   - amount \> 0.
   - fondeo_total \+ amount \<= max_capacity.
   - external_reference IS NOT NULL.
4. Si validaciones pasan:
   - Allocation BEGIN TRANSACTION.
   - Allocation INSERT transaction (tipo=FUNDS_IN, status=SETTLED, operator_id, external_reference).
   - Transacción nace directamente como SETTLED e inmutable.
   - Allocation UPDATE snapshot (available \+= amount, version \+= 1).
   - Allocation registra applied_version en transaction.
   - Allocation COMMIT.

   **Ejemplo SQL genérico (ilustrativo):**

   sql

   BEGIN;

   _\-- Registrar entrada de fondos (nace inmutable)_

   INSERT INTO transactions ( lot_id, type, amount, status, operator_id, external_reference, reason, is_immutable, became_immutable_at

   ) VALUES ( 'lot_001', 'FUNDS_IN', 100000, 'SETTLED', 'trader_john', '0xabc123...', 'Initial funding', TRUE, CURRENT_TIMESTAMP );

   _\-- Actualizar disponibilidad del lote_

   UPDATE snapshots

   SET available \= available \+ 100000, version \= version \+ 1

   WHERE lot_id \= 'lot_001';

   COMMIT;

5. Si alguna validación falla:
   - Error retornado sin crear transacción.
   - (Opcional) Registrar en transaction_validation_failures para auditoría.
6. Admin BFF retorna confirmación.

**Salidas:**

- transaction_id: Identificador de transacción FUNDS_IN.
- new_available: Nuevo saldo disponible.

**Postcondiciones:**

- Transacción FUNDS_IN creada con status SETTLED (inmutable desde creación).
- snapshots.available incrementado.
- Lote puede asignar más allocations.

**Errores:**

- EXCEED_MAX_CAPACITY: Fondeo excedería capacidad máxima.
- INVALID_AMOUNT: Monto \<= 0\.
- LOT_CLOSED: No se puede fondear lote cerrado.
- INSUFFICIENT_PERMISSIONS: Usuario sin permisos.
- MISSING_EXTERNAL_REFERENCE: Referencia externa requerida.

**Reglas de negocio aplicables:**

- RN-101, RN-104

**Nota importante:**

FUNDS_IN no pasa por estado intermedio. Las validaciones se ejecutan antes del INSERT, y si pasan, la transacción nace directamente como SETTLED e inmutable. Esto refleja que la operación física ya ocurrió y solo se está registrando contablemente.

---

### RF-101: Registrar Salida de Fondos (FUNDS_OUT)

**Descripción:** Mesa extrae capital de un lote.

**Actor:** Mesa Trader (hasta threshold), Mesa Supervisor (sin límite).

**Precondiciones:**

- Lote existe.
- Usuario tiene rol MESA_TRADER o MESA_SUPERVISOR.
- amount \<= snapshots.available.

**Entradas:**

- lot_id: Identificador del lote.
- amount: Monto a retirar (en base_asset del lote).
- reason: Motivo del retiro (REQUERIDO, mínimo 10 caracteres).
- approved_by: Usuario supervisor aprobador (si amount \> threshold).

**Proceso:**

1. Admin BFF valida permisos.
2. Admin BFF delega a APE \- Swap Module.
3. Allocation valida:
   - amount \> 0.
   - amount \<= snapshots.available.
   - reason IS NOT NULL AND LENGTH(reason) \>= 10.
4. Si amount \> retire_approval_threshold:
   - Allocation valida approved_by IS NOT NULL.
   - Allocation valida approved_by tiene rol MESA_SUPERVISOR.
5. Si validaciones pasan:
   - Allocation BEGIN TRANSACTION.
   - Allocation INSERT transaction (tipo=FUNDS_OUT, status=SETTLED, operator_id, reason, approved_by).
   - Transacción nace directamente como SETTLED e inmutable.
   - Allocation UPDATE snapshot (available \-= amount, version \+= 1).
   - Allocation registra applied_version en transaction.
   - Allocation COMMIT.

   **Ejemplo SQL genérico (ilustrativo):**

   sql

   BEGIN;

   _\-- Registrar salida de fondos (nace inmutable)_

   INSERT INTO transactions ( lot_id, type, amount, status, operator_id, reason, approved_by, is_immutable, became_immutable_at )

   VALUES ( 'lot_001', 'FUNDS_OUT', 50000, 'SETTLED', 'trader_john', 'End-of-day rebalancing', 'supervisor_alice', TRUE, CURRENT_TIMESTAMP );

   _\-- Actualizar disponibilidad del lote_

   UPDATE snapshots SET available \= available \- 50000, version \= version \+ 1

   WHERE lot_id \= 'lot_001';

   COMMIT;

6. Si alguna validación falla:
   - Error retornado sin crear transacción.
7. Admin BFF retorna confirmación.

**Salidas:**

- transaction_id: Identificador de transacción FUNDS_OUT.
- new_available: Nuevo saldo disponible.

**Postcondiciones:**

- Transacción FUNDS_OUT creada con status SETTLED (inmutable desde creación).
- snapshots.available decrementado.
- Mesa debe ejecutar transferencia real de fondos posteriormente.

**Errores:**

- INSUFFICIENT_AVAILABLE: amount \> available.
- APPROVAL_REQUIRED: amount \> threshold sin aprobación.
- INVALID_REASON: Reason vacío o muy corto.
- INVALID_APPROVER: approved_by no es supervisor.

**Reglas de negocio aplicables:**

- RN-100, RN-105

**Nota importante:**

FUNDS_OUT no pasa por estado intermedio. Las validaciones se ejecutan antes del INSERT, y si pasan, la transacción nace directamente como SETTLED e inmutable.

---

### RF-102: Suspender Lote

**Descripción:** Mesa desactiva temporalmente un lote.

**Actor:** Mesa Trader, Mesa Supervisor.

**Precondiciones:**

- Lote existe y status \= ACTIVE.

**Entradas:**

- lot_id: Identificador del lote.
- reason: Motivo de suspensión.

**Proceso:**

1. Admin BFF valida permisos.
2. Admin BFF delega a APE \- Swap Module.
3. Allocation UPDATE lot SET status \= SUSPENDED.
4. Allocation registra auditoría.

**Salidas:**

- Confirmación de suspensión.

**Postcondiciones:**

- Lote no acepta nuevas reservas (FUNDS_RESERVE).
- Reservas existentes se respetan hasta expiración.

**Uso típico:**

- End-of-day.
- Mantenimiento programado.
- Rebalanceo de liquidez.

**Reglas de negocio aplicables:**

- RN-103

---

### RF-103: Cerrar Lote

**Descripción:** Mesa desactiva permanentemente un lote.

**Actor:** Mesa Supervisor.

**Precondiciones:**

- Lote existe y status \= SUSPENDED.
- snapshot.reserved \= 0 (no hay FUNDS_RESERVEs activos).

**Entradas:**

- lot_id: Identificador del lote.
- reason: Motivo de cierre.

**Proceso:**

1. Admin BFF valida rol MESA_SUPERVISOR.
2. Admin BFF delega a APE \- Swap Module.
3. Allocation valida reserved \= 0\.
4. Allocation UPDATE lot SET status \= CLOSED.
5. Allocation marca lote como no elegible.

**Salidas:**

- Confirmación de cierre.

**Postcondiciones:**

- Lote no acepta allocations.
- Lote no puede reactivarse sin intervención manual.

**Errores:**

- ACTIVE_RESERVES_EXIST: Hay reservas activas (tipo FUNDS_RESERVE, status RESERVED).
- INVALID_STATUS_TRANSITION: Lote no está SUSPENDED.

**Reglas de negocio aplicables:**

- RN-103

---

### RF-105: Configurar BPS de Cliente

**Descripción:** Mesa configura el spread (BPS) aplicable a un cliente.

**Actor:** Mesa Trader, Mesa Supervisor.

**Precondiciones:**

- Cliente existe en Client Module(LEX).

**Entradas:**

- client_id: Identificador del cliente.
- applicable_bps: BPS a aplicar (nullable para usar grupo).
- group_id: Grupo al que pertenece (nullable).

**Proceso:**

1. Admin BFF valida permisos.
2. Admin BFF llama a Client Module (PATCH /clients/{id}/pricing).
3. Client Module actualiza configuración.
4. Client Module retorna confirmación.

**Salidas:**

- Confirmación de actualización.

**Postcondiciones:**

- Cliente usa nuevo BPS en futuras cotizaciones.
- Pre-quotes existentes no se afectan.

**Nota:** Esta funcionalidad es un proxy a Client Module existente.

---

### RF-106: Crear/Editar Grupo de Clientes

**Descripción:** Mesa gestiona grupos para aplicar BPS común.

**Actor:** Mesa Supervisor.

**Entradas:**

- name: Nombre del grupo.
- applicable_bps: BPS del grupo.

**Proceso:**

1. Admin BFF valida rol MESA_SUPERVISOR.
2. Admin BFF llama a Client Module (POST /groups).
3. Client Module crea/actualiza grupo.

**Salidas:**

- group_id: Identificador del grupo.

**Postcondiciones:**

- Grupo disponible para asignar a clientes.

**Nota:** Esta funcionalidad es un proxy a Client Module existente.

---

## 4.3 Módulo: Expiración Automática (Sistema)

**Nota:** Este módulo gestiona la expiración de reservas de tipo FUNDS_RESERVE, específicas del Swap Module. Payment Module (v2.0) tendrá su propio mecanismo de expiración/cancelación (TBD).

### RF-200: Expirar Reservas por TTL

**Descripción:** Sistema libera automáticamente reservas expiradas.

**Actor:** Sistema (job automático).

**Precondiciones:**

- Existen reservas (tipo FUNDS_RESERVE, status RESERVED) con expires_at \< NOW().

**Proceso:**

1. Job periódico (cada 5-10 segundos) consulta:  
   sql  
   SELECT id, lot_id, amount  
   FROM transactions  
   WHERE type \= 'FUNDS_RESERVE' AND status \= 'RESERVED' AND expires_at \< CURRENT_TIMESTAMP;
2. Para cada reserva expirada:  
   sql  
   BEGIN;

   _\-- Transición: RESERVED → REVERTED_  
   UPDATE transactions  
   SET  
   status \= 'REVERTED',  
    is_immutable \= TRUE,  
    became_immutable_at \= CURRENT_TIMESTAMP  
    reason \= 'EXPIRED'  
   WHERE id \= expired_reserve_id AND type \= 'FUNDS_RESERVE' AND status \= 'RESERVED';

   _\-- Liberar capacidad_  
   UPDATE snapshots  
   SET reserved \= reserved \- amount, available \= available \+ amount, version \= version \+ 1  
   WHERE lot_id \= affected_lot_id;

   COMMIT;

3. UPDATE pre_quote SET status \= EXPIRED

**Postcondiciones:**

- Stock liberado automáticamente
- Pre-quote marcada como EXPIRED
- Sin intervención manual

**Reglas de negocio aplicables:**

- RN-012, RN-013

---

# 5\. MODELO DE DATOS {#5.-modelo-de-datos}

## 5.1 Arquitectura de Bases de Datos

El sistema utiliza dos bases de datos:

1. **rfq_gateway_db** (RFQ API)
   - Schema: quotations \- pre_quotes y price_lines
   - Ownership: RFQ API Service
2. **ape_gateway_db** (APE)
   - Schema: allocations \- lots, transactions, state_logs, snapshots (Swap Module \- v1.0)
   - Schema: payments \- orders, fees, transactions (Payment Module \- v2.0, TBD)
   - Ownership: APE Service

**Nota:** Ambas bases de datos pueden estar en el mismo servidor de base de datos pero son lógicamente independientes para permitir escalabilidad y separación de responsabilidades.

**Separación por módulo:** Cada módulo de APE (Swap, Payment) tiene su propio schema para mantener aislamiento lógico y facilitar escalabilidad independiente.

## 5.2 Schema: rfq_gateway_db/quotations

**Pertenece a:** RFQ API Service

**Propósito:** Almacenar pre-quotes construidas por RFQ API y sus price_lines asociadas.

–---------------------------------------------------------------------

**Tabla: pre_quotes**

**Propósito:** Registro operativo de todas las pre-quotes emitidas.

| Campo          | Tipo        | Restricción   | Descripción                                                 |
| :------------- | :---------- | :------------ | :---------------------------------------------------------- |
| pre_quote_id   | UUID        | PK            | Identificador único                                         |
| quote_id       | UUID        | UNIQUE, NULL  | ID de quote definitiva (se actualiza al aceptar pre\-quote) |
| client_id      | TEXT        | NOT NULL      | Cliente que solicitó                                        |
| operation_type | TEXT        | NOT NULL      | Tipo de operación: "swap", "payment"                        |
| status         | TEXT        | NOT NULL      | "ISSUED", "ACCEPTED", "REJECTED", "EXPIRED"                 |
| ttl_seconds    | INT         | NOT NULL      | Tiempo de vida en segundos                                  |
| expires_at     | TIMESTAMPTZ | NOT NULL      | Momento de expiración                                       |
| token_hash     | TEXT        | NULL          | Hash SHA256 del token (anti-replay)                         |
| operation_data | JSONB       | NOT NULL      | Datos específicos de la operación según operation_type      |
| created_at     | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación                                           |
| updated_at     | TIMESTAMPTZ | DEFAULT NOW() | Fecha de actualización                                      |

**Constraints:**

- CHECK (operation_type IN ('swap', 'payment'))
- CHECK (operation_data \!= '{}'::jsonb)

**Estructura de operation_data por Tipo:**

- **Para operation_type \= 'swap':**  
  json  
  {  
   "pair": "USDC/ARS",  
   "side": "BUY",  
   "base_asset": "USDC",  
   "quote_asset": "ARS",  
   "requested_quote_asset_amount": 40000000,  
   "covered_quote_asset_amount": 40000000,  
   "pending_quote_asset_amount": 0,  
   "base_asset_amount": 26254,  
   "reference_price": {  
   "num_quote_asset_u": 40000000000000,  
   "den_base_asset_u": 26254000000  
   },  
   "price_display": 1523.45  
  }

  **Campos:**

- pair: Par de divisas (ej: "USDC/ARS").
- side: Dirección ("BUY" o "SELL").
- base_asset: Divisa base del par.
- quote_asset: Divisa cotizada del par.
- requested_quote_asset_amount: Monto solicitado en quote_asset.
- covered_quote_asset_amount: Monto cubierto por allocations.
- pending_quote_asset_amount: Monto no cubierto.
- base_asset_amount: Monto total en base_asset.
- reference_price: Precio racional (numerador/denominador).
- price_display: Precio decimal para display.

  **Constraint implícito (validado en aplicación):**

  requested_quote_asset_amount \= covered_quote_asset_amount \+ pending_quote_asset_amount

- **Para operation_type \= 'payment' (v2.0 \- estructura tentativa):**  
  json  
  {  
   "beneficiary_amount": 10000,  
   "beneficiary_currency": "USD",  
   "origin_currency": "ARS",  
   "destination_country": "US",  
   "total_client_pays": 15157912.5,  
   "breakdown": {  
   "fx_amount": 15075000,  
   "fx_rate": 1507.5,  
   "service_fee": 7537.5,  
   "cross_border_fee": 75375  
   }  
  }  
  **Nota**: La estructura para payment será definida en v2.0.  
  **Validación**: La estructura de \`operation_data\` se valida a nivel de aplicación (RFQ API) según el \`operation_type\`.

**Índices:**

- idx_pre_quotes_operation_type sobre (operation_type)
- idx_pre_quotes_client sobre (client_id)
- idx_pre_quotes_status sobre (status)
- idx_pre_quotes_expires sobre (expires_at) WHERE status \= 'ISSUED'
- idx_pre_quotes_quote_id sobre (quote_id) WHERE quote_id IS NOT NULL
- idx_pre_quotes_swap_pair sobre (operation_data-\>\>'pair') WHERE operation_type \= 'swap'

–---------------------------------------------------------------------

**Tabla: price_lines**

**Propósito:** Detalle de price_lines por pre-quote (interno, no expuesto a cliente).

**Nota:** Esta tabla es específica del modelo de swap. Las operaciones de tipo payment no utilizan el concepto de allocations de lotes.

| Campo                      | Tipo           | Restricción     | Descripción                                   |
| :------------------------- | :------------- | :-------------- | :-------------------------------------------- |
| price_line_id              | UUID           | PK              | Identificador único                           |
| pre_quote_id               | UUID           | FK, NOT NULL    | Referencia a pre_quotes                       |
| lot_id                     | TEXT           | NOT NULL        | Lote asignado                                 |
| context                    | TEXT           | NOT NULL, CHECK | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP" |
| provider                   | TEXT           | NOT NULL        | ARDUA, BINANCE, BYMA, BITSO                   |
| base_asset                 | TEXT           | NOT NULL        | Divisa base (ej: USDC)                        |
| quote_asset                | TEXT           | NOT NULL        | Divisa cotizada (ej: ARS)                     |
| side                       | TEXT           | NOT NULL, CHECK | "BUY" o "SELL"                                |
| price                      | NUMERIC(20,10) | NOT NULL        | Precio base del lote                          |
| applicable_bps             | INT            | NOT NULL        | BPS aplicado a esta allocation                |
| final_price                | NUMERIC(20,10) | NOT NULL        | Precio con BPS aplicado                       |
| covered_quote_asset_amount | NUMERIC(20,10) | NOT NULL        | Monto quote asignado                          |
| covered_base_asset_amount  | NUMERIC(20,10) | NOT NULL        | Monto base asignado (moneda operativa)        |
| reserve_tx_id              | UUID           | NULL            | Referencia a transaction FUNDS_RESERVE        |
| provider_price_details     | JSONB          | NULL            | Detalle de cálculo del provider               |
| created_at                 | TIMESTAMPTZ    | DEFAULT NOW()   | Fecha de creación                             |

**Índices:**

- idx_price_lines_pre_quote sobre (pre_quote_id)
- idx_price_lines_lot sobre (lot_id)

---

## 5.3 Schema: ape_gateway_db/allocations

**Pertenece a:** APE Service \- Swap Module

**Propósito:** Gestión de lotes de liquidez, transacciones y snapshots de stock para operaciones de tipo swap.

**Nota:** Este schema es específico del Swap Module. El Payment Module (v2.0) tendrá su propio schema (ape_gateway_db/payments \- TBD) con tablas como orders, fees, transactions, etc.

–---------------------------------------------------------------------

**Tabla: lots**

**Propósito:** Configuración de lotes de pricing.

| Campo       | Tipo           | Restricción            | Descripción                                                  |
| :---------- | :------------- | :--------------------- | :----------------------------------------------------------- |
| id          | TEXT           | PK                     | Identificador del lote                                       |
| context     | TEXT           | NOT NULL, CHECK        | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP"                |
| provider    | TEXT           | NOT NULL               | ARDUA, BINANCE, BYMA, BITSO                                  |
| side        | TEXT           | NOT NULL, CHECK        | "BUY" o "SELL"                                               |
| base_asset  | TEXT           | NOT NULL               | Divisa base (divisa operativa del lote, ej: USDC, USDT, USD) |
| quote_asset | TEXT           | NOT NULL               | Divisa cotizada (ej: ARS)                                    |
| price       | NUMERIC(20,10) | NULL                   | Precio base (si aplica)                                      |
| status      | TEXT           | NOT NULL, CHECK        | "ACTIVE", "SUSPENDED", "CLOSED"                              |
| metadata    | JSONB          | NOT NULL, DEFAULT '{}' | Configuración (activation, pricing, limits)                  |
| created_at  | TIMESTAMPTZ    | DEFAULT NOW()          | Fecha de creación                                            |
| updated_at  | TIMESTAMPTZ    | DEFAULT NOW()          | Fecha de actualización                                       |

**Estructura de metadata:**

json

{  
 "limits": {  
 "max_capacity": 1000000,  
 "max_single_allocation": 50000,  
 "daily_volume_limit": 5000000,  
 "retire_approval_threshold": 100000  
 },  
 "activation": {  
 "timezone": "America/Argentina/Buenos_Aires",  
 "holiday_calendar": "AR",  
 "weekly_windows": \[  
 {"days": \["MON","TUE","WED","THU","FRI"\], "start": "10:00", "end": "18:00"}  
 \],  
 "exclude_dates": \["2026-02-12"\],  
 "include_dates": \[\],  
 "blackout_windows": \[  
 {"start": "2026-03-01T00:00:00-03:00", "end": "2026-03-01T06:00:00-03:00", "reason": "Maintenance"}  
 \]  
 },  
 "pricing": {  
 "model": "COMPOSITE",  
 "inputs": {  
 "time_cost": {"type": "BPS", "value": 12},  
 "bank_cost": {"type": "BPS", "value": 20}  
 },  
 "feeds": \[  
 {"name": "USDT_ARS", "symbol": "USDTARS", "source": "orderbook", "field": "best_ask", "max_staleness_ms": 1200}  
 \],  
 "formula": {"type": "MULTIPLY", "legs": \["USDT_ARS", "USDC_USDT"\]}  
 }

}

**Índices:**

- idx_lots_status sobre (status)
- idx_lots_pair sobre (base_asset, quote_asset, side)
- idx_lots_provider sobre (provider)

–---------------------------------------------------------------------

**Tabla: transactions**

**Propósito:** Ledger inmutable de movimientos de stock.

| Campo               | Tipo           | Restricción                    | Descripción                                                                                                                                                                   |
| :------------------ | :------------- | :----------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                  | UUID           | PK                             | Identificador único                                                                                                                                                           |
| lot_id              | TEXT           | FK, NOT NULL                   | Identificador del lote (clave primaria y foránea)                                                                                                                             |
| client_id           | TEXT           | NULL                           | ID del cliente (requerido para FUNDS_RESERVE, NULL para FUNDS_IN/FUNDS_OUT)                                                                                                   |
| type                | TEXT           | NOT NULL, CHECK                | "FUNDS_IN", "FUNDS_OUT", "FUNDS_RESERVE"                                                                                                                                      |
| amount              | NUMERIC(20,10) | NOT NULL, CHECK (amount \> 0\) | Monto en base_asset del lote                                                                                                                                                  |
| status              | TEXT           | NOT NULL, CHECK                | "SETTLED", "RESERVED", "REVERTED", "EXECUTED"                                                                                                                                 |
| reference_type      | TEXT           | NULL                           | "PREQUOTE", "MANUAL"                                                                                                                                                          |
| reference_id        | TEXT           | NULL                           | ID de la entidad referenciada                                                                                                                                                 |
| expires_at          | TIMESTAMPTZ    | NULL                           | Solo para FUNDS_RESERVE: momento de expiración                                                                                                                                |
| applied_version     | BIGINT         | NULL                           | Versión del snapshot DESPUÉS de aplicar esta transacción.                                                                                                                     |
| operator_id         | TEXT           | NULL                           | Usuario de Mesa (solo FUNDS_IN/FUNDS_OUT)                                                                                                                                     |
| reason              | TEXT           | NULL                           | Motivo de la transacción: REQUERIDO para FUNDS_OUT (razón del retiro), OPCIONAL para FUNDS_RESERVE (motivo del revert: CLIENT_REJECTED, EXPIRED, TIMEOUT), NULL para FUNDS_IN |
| external_reference  | TEXT           | NULL                           | Hash de tx blockchain/bancaria (para FUNDS_IN)                                                                                                                                |
| approved_by         | TEXT           | NULL                           | Supervisor aprobador (para FUNDS_OUT \> threshold)                                                                                                                            |
| is_immutable        | BOOLEAN        | DEFAULT FALSE                  | Indica si la transacción es inmutable                                                                                                                                         |
| became_immutable_at | TIMESTAMPTZ    | NULL                           | Momento en que alcanzó estado terminal                                                                                                                                        |
| created_at          | TIMESTAMPTZ    | DEFAULT NOW()                  | Fecha de creación                                                                                                                                                             |
| updated_at          | TIMESTAMPTZ    | NULL                           | Fecha de actualización                                                                                                                                                        |

**Constraints por tipo y estado:**

| Tipo          | Estados Válidos              | Estados Terminales (Inmutables) |
| :------------ | :--------------------------- | :------------------------------ |
| FUNDS_IN      | SETTLED                      | SETTLED                         |
| FUNDS_OUT     | SETTLED                      | SETTLED                         |
| FUNDS_RESERVE | RESERVED, REVERTED, EXECUTED | REVERTED, EXECUTED              |

### **Constraint CHECK:**

sql

CHECK (  
 (type IN ('FUNDS_IN', 'FUNDS_OUT') AND status \= 'SETTLED')

OR

(type \= 'FUNDS_RESERVE' AND status IN ('RESERVED', 'REVERTED', 'EXECUTED'))  
)

AND

CHECK (  
 reference_type IS NULL  
 OR reference_type IN ('PREQUOTE', 'MANUAL')  
)

AND

CHECK (  
 (type \= 'FUNDS_RESERVE' AND client_id IS NOT NULL)  
 OR  
 (type IN ('FUNDS_IN', 'FUNDS_OUT') AND client_id IS NULL)  
)

AND

CHECK (amount \> 0\)

AND

CHECK (  
 (is_immutable \= TRUE AND became_immutable_at IS NOT NULL)  
 OR  
 (is_immutable \= FALSE AND became_immutable_at IS NULL)  
)

**Tabla particionada por fecha** (particiones mensuales).

**Índices:**

- idx_transactions_lot sobre (lot_id)
- idx_transactions_type_status sobre (type, status)
- idx_transactions_reference sobre (reference_type, reference_id)
- idx_transactions_expires sobre (expires_at) WHERE type \= 'FUNDS_RESERVE' AND status \= 'RESERVED'
- idx_transactions_operator sobre (operator_id) WHERE type IN ('FUNDS_IN', 'FUNDS_OUT')
- idx_transactions_immutable sobre (id) WHERE is_immutable \= TRUE
- idx_transactions_client_exposure sobre (client_id, type, status, amount) WHERE type \= 'FUNDS_RESERVE' AND status \= 'RESERVED'

**Tabla: state_logs**

**Propósito:** Auditoría inmutable de cambios de estado de transacciones.

| Campo          | Tipo        | Restricción   | Descripción                                                   |
| :------------- | :---------- | :------------ | :------------------------------------------------------------ |
| id             | UUID        | PK            | Identificador único                                           |
| transaction_id | UUID        | FK, NOT NULL  | Referencia a transactions                                     |
| from_status    | TEXT        | NULL          | Estado anterior (NULL si es INSERT)                           |
| to_status      | TEXT        | NOT NULL      | Estado nuevo                                                  |
| changed_at     | TIMESTAMPTZ | DEFAULT NOW() | Momento del cambio                                            |
| changed_by     | TEXT        | NULL          | Usuario o SYSTEM                                              |
| reason         | TEXT        | NULL          | Motivo del cambio                                             |
| immutable      | BOOLEAN     | NOT NULL      | Si el nuevo estado es terminal                                |
| triggered_by   | TEXT        | NULL          | Componente que ejecutó (RFQ_API, EXPIRATION_JOB, ADMIN_PANEL) |
| created_at     | TIMESTAMPTZ | DEFAULT NOW() | Fecha de creación del log                                     |

**Nota importante:**

Esta tabla es **append-only** (solo INSERT, nunca UPDATE ni DELETE). Registra cada cambio de estado de transacciones tipo \`FUNDS_RESERVE\` (de \`RESERVED\` a \`EXECUTED\` o \`REVERTED\`). Las transacciones \`FUNDS_IN\` y \`FUNDS_OUT\` nacen como \`SETTLED\` y no cambian de estado, por lo que NUNCA generan entradas en esta tabla.

**Índices:**

- idx_state_log_transaction sobre (transaction_id, changed_at DESC)
- idx_state_log_immutable sobre (transaction_id) WHERE immutable \= TRUE
- idx_state_log_component sobre (triggered_by) WHERE triggered_by IS NOT NULL

–---------------------------------------------------------------------

**Tabla: snapshots**

**Propósito:** Estado materializado del stock de cada lote.

| Campo      | Tipo           | Restricción             | Descripción                                                                                                                                                                       |
| :--------- | :------------- | :---------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| lot_id     | TEXT           | PK, REFERENCES lots(id) | Identificador del lote (clave primaria y foránea)                                                                                                                                 |
| available  | NUMERIC(20,10) | NOT NULL, \>= 0         | Capacidad disponible                                                                                                                                                              |
| reserved   | NUMERIC(20,10) | NOT NULL, \>= 0         | Capacidad reservada                                                                                                                                                               |
| executed   | NUMERIC(20,10) | NOT NULL, \>= 0         | Capacidad ejecutada                                                                                                                                                               |
| version    | BIGINT         | NOT NULL                | Versión del snapshot para control de concurrencia optimista. Se incrementa en 1 con cada transacción aplicada. Usado en cláusula WHERE durante UPDATE para prevenir lost updates. |
| updated_at | TIMESTAMPTZ    | DEFAULT NOW()           | Fecha de actualización                                                                                                                                                            |

**Invariante:**

- available \+ reserved \+ executed \= fondeo_total

**Nota:** fondeo_total se calcula como:

SUM(transactions WHERE type='FUNDS_IN' AND status='SETTLED') \-  
SUM(transactions WHERE type='FUNDS_OUT' AND status='SETTLED')

---

## 5.4 Relaciones entre Entidades

**Nota:** Las entidades están distribuidas en dos bases de datos. Las relaciones marcadas con (⚡) son referencias lógicas entre bases de datos, no foreign keys físicas.

**En rfq_gateway_db (RFQ API):**

pre_quotes (1) ──────── (N) price_lines

**En ape_gateway_db (APE):**

lots (1) ──────── (1) snapshots  
 │  
 └── (1:N) transactions  
 │  
 └── (1:N) state_logs

**Relaciones Cross-Database (lógicas):**

price_lines (N) ──(⚡)── (1) lots (vía lot_id, referencia lógica)

price_lines (N) ──(⚡)── (1) transactions (vía reserve_tx_id, referencia lógica)

**Importante:**

- Las referencias entre price_lines (rfq_gateway_db) y lots/transactions (ape_gateway_db) son lógicas.
- No existen foreign keys físicas entre bases de datos.
- La integridad referencial se valida a nivel de aplicación (RFQ API).

---

# 6\. ESPECIFICACIÓN DE SERVICIOS {#6.-especificación-de-servicios}

## 6.1 Servicio: RFQ API

**Nombre:** rfq-api

**Responsabilidades:**

- **Enrutamiento por tipo de operación:**
  - Recibir requests de clientes por tipo de operación:
    - SWAP: POST /v1/rfq/swap (v1.0)
    - PAYMENT: POST /v1/rfq/payment (v2.0 \- retorna 501\)
  - Operaciones comunes:
    - ACCEPT: POST /v1/rfq/pre_quotes/{id}/accept
    - REJECT: POST /v1/rfq/pre_quotes/{id}/reject
- **Para operaciones de tipo swap (v1.0):**
  - Consultar APE Swap Module para pricing: POST /v1/ape/swap/reference-price
  - Consultar Client Module para obtener BPS (específico de swap) y max_open_exposure
  - Aplicar BPS por allocation y calcular precio final
  - Validar precio agregado vs Market Reference
  - Validar límite de exposición del cliente
  - Solicitar reserva de capacidad a APE:
    - POST /v1/ape/swap/reserve
  - Ejecutar webhooks a APE para transiciones de estado de reservas:
    - POST /v1/ape/swap/execute
    - POST /v1/ape/swap/revert
- **Para operaciones de tipo payment (v2.0 \- TBD):**
  - Consultar APE Payment Module para pricing: POST /v1/ape/payment/reference-price:
  - Aplicar fees y calcular total (sin BPS).
  - Validar límite de exposición del cliente.
  - Solicitar reservas (si aplica):
    - POST /v1/ape/payment/reserve
  - Construir y persistir pre-quotes con operation_type.
  - Ejecutar webhooks a APE para transiciones de estado de reservas:
    - POST /v1/ape/payment/execute
    - POST /v1/ape/payment/revert

**Responsabilidades comunes::**

- Construir y persistir pre-quotes con operation_type.
- Validar integridad de tokens (firma, TTL, client binding, anti-replay).
- Crear quotes en Quote Module.

**Exposición:** Pública (a través de API Gateway).

**Dependencias:**

- APE Service (llamadas internas).
- Client Module (HTTP, configuración de clientes).
- Quote Module (HTTP, persistencia de quotes).
- TradingView API (HTTP, market reference).
- Base de datos **rfq_gateway_db**, schema **quotations**
- Redis (anti-replay de jti, caché de idempotencia)

**Configuración:**

RFQ/config/rfq_config.yaml

pre_quote_ttl_seconds: 30 _\# Tiempo de vida de pre-quotes_ grace_period_seconds: 6 _\# TTL mínimo requerido para ACCEPT_ market_reference_threshold_pct: 2.0 _\# % Desviación máxima vs TradingView_ idempotency_cache_ttl_hours: 24 _\# Retención de idempotency keys_ jti_cache_ttl_seconds: 60 _\# Retención de JTI para anti-replay_

Invariante de timing:

grace_period_seconds \>= (expiration_job_interval_seconds \+ 1\)

**Nota importante sobre race conditions:**

Esta fórmula establece el mínimo requerido, pero no garantiza completamente la prevención de race conditions. Para garantía completa, el job de expiración DEBE usar \`FOR UPDATE SKIP LOCKED\` al seleccionar reservas para revertir. Ver RN-008 y RN-012 para detalles de implementación.

### 6.1.1 Endpoints

| Método | Path                           | Descripción                             |
| :----- | :----------------------------- | :-------------------------------------- |
| POST   | /v1/rfq/swap                   | Solicitar cotización de swap            |
| POST   | /v1/rfq/payment                | Solicitar cotización de payment         |
| POST   | /v1/rfq/pre_quotes/{id}/accept | Aceptar pre-quote                       |
| POST   | /v1/rfq/pre_quotes/{id}/reject | Rechazar pre-quote                      |
| GET    | /v1/rfq/config                 | Configuración completa del servicio RFQ |
| GET    | /v1/rfq/health                 | Health check                            |
| GET    | /v1/rfq/metrics                | Métricas Prometheus                     |

---

### 6.1.1.1 POST /v1/rfq/swap

**Descripción:** Cliente solicita una cotización para una operación de swap.

**Consumidor:** Cliente (Web App o API Client).

**Request:**

json

{  
 "pair": "USDC/ARS",  
 "side": "BUY",  
 "requested_quote_asset_amount": 40000000,  
 "idempotency_key": "req_20260129_001"  
}

**Request Schema:**

| Campo                        | Tipo    | Requerido | Descripción                                   |
| :--------------------------- | :------ | :-------- | :-------------------------------------------- |
| pair                         | string  | Sí        | Par de divisas (ej: "USDC/ARS", "USDT/ARS")   |
| side                         | string  | Sí        | "BUY" o "SELL"                                |
| requested_quote_asset_amount | numeric | Sí        | Monto solicitado en quote_asset               |
| idempotency_key              | string  | No        | Clave de idempotencia (opcional, recomendado) |

**Proceso interno:**

1. RFQ API valida request (schema, autenticación, rate limit).
2. RFQ API consulta configuración del cliente en Client Module.
   - Obtiene applicable_bps y max_open_exposure.
3. RFQ API consulta APE → POST /v1/ape/reference-price.
4. APE retorna price_lines con precios BASE.
5. RFQ API aplica BPS por price_lines y calcula precio final.
6. RFQ API valida precio agregado vs Market Reference (TradingView).
   - Threshold típico: ±2% de tolerancia(configurable).
7. RFQ API calcula exposición actual del cliente:
   - Query: SUM(transactions.amount) WHERE client_id \= :client_id AND type \= 'FUNDS_RESERVE' AND status \= 'RESERVED' AND expires_at \> CURRENT_TIMESTAMP
   - Alternativamente: Llamar al endpoint GET /v1/ape/clients/{client_id}/exposure que ejecuta este query
8. RFQ API valida límite de exposición abierta:
   - Si max_open_exposure está definido:
     - current_open_exposure \+ nuevo_monto \<= max_open_exposure.
     - Si falla → Error EXPOSURE_LIMIT_EXCEEDED.
   - Si max_open_exposure es NULL: continuar sin restricción
9. RFQ API solicita a APE ejecutar reserva de capacidad con TTL.
10. APE ejecuta reserva en lotes, actualiza snapshots:
    - Si APE retorna SUCCESS → continuar con paso 11\.
    - Si APE retorna ERROR → Error FUNDS_COULD_NOT_BE_BLOCKED.
11. RFQ API persiste pre-quote en base de datos.
12. RFQ API genera token firmado (JWT con TTL 30s).
13. RFQ API retorna pre-quote resumida al cliente.

**Response:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "operation_type": "swap",  
 "client_id": "cli_001",  
 "pair": "USDC/ARS",  
 "side": "BUY",  
 "summary": {  
 "requested_quote_asset_amount": 40000000,  
 "covered_quote_asset_amount": 40000000,  
 "pending_quote_asset_amount": 0,  
 "coverage_percentage": 100.0,  
 "base_asset_amount": 26274.51,  
 "reference_price": {  
 "num_quote_asset_u": 40000000000000,  
 "den_base_asset_u": 26274510000  
 },  
 "price_display": 1522.038  
 },  
 "ttl_seconds": 30,  
 "expires_at": "2026-01-29T15:00:45-03:00",  
 "pre_quote_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  
}

**Response Schema:**

| Campo                                | Tipo    | Descripción                           |
| :----------------------------------- | :------ | :------------------------------------ |
| pre_quote_id                         | string  | Identificador único de pre-quote      |
| operation_type                       | string  | Tipo de operación ("swap", "payment") |
| client_id                            | string  | Identificador del cliente             |
| pair                                 | string  | Par de divisas                        |
| side                                 | string  | "BUY" o "SELL"                        |
| summary                              | object  | Resumen de la cotización              |
| summary.requested_quote_asset_amount | numeric | Monto solicitado                      |
| summary.covered_quote_asset_amount   | numeric | Porcentaje de cobertura (0-100)       |
| summary.coverage_percentage          | numeric | Monto no cubierto                     |
| summary.pending_quote_asset_amount   | numeric | Monto no cubierto                     |
| summary.base_asset_amount            | numeric | Monto en base_asset                   |
| summary.reference_price              | object  | Precio racional                       |
| summary.price_display                | numeric | Precio decimal (display)              |
| ttl_seconds                          | integer | Tiempo de vida en segundos            |
| expires_at                           | string  | Timestamp de expiración (ISO 8601\)   |
| pre_quote_token                      | string  | Token firmado JWT                     |

**Códigos de respuesta:**

- **200 OK:** Pre-quote creada (puede ser total o parcial):
  - Cobertura total: covered \= requested, pending \= 0, coverage_percentage \= 100
  - Cobertura parcial: covered \< requested, pending \> 0, coverage_percentage \< 100
  - Ambos casos son válidos y el cliente puede aceptar el pre-quote
- **400 Bad Request:** Request malformado o validación fallida
- **429 Too Many Requests:** Rate limit excedido

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "NO_LIQUIDITY_AVAILABLE",  
 "message": "No liquidity available to cover any portion of the requested amount",  
 "details": {  
 "requested_quote_asset_amount": 100000000,  
 "covered_quote_asset_amount": 0,  
 "eligible_lots_count": 0,  
 "total_lots_evaluated": 5,  
 "ineligibility_summary": {  
 "BELOW_MIN_AVAILABLE_THRESHOLD": 3,  
 "OUTSIDE_WEEKLY_WINDOWS": 1,  
 "SUSPENDED": 1  
 }  
 }  
}  
**Nota sobre ineligibility_summary:**  
Contadores de lotes descartados durante la evaluación. Keys posibles según orden de validación (RN-007): INACTIVE_STATUS, IN_BLACKOUT_WINDOW, EXCLUDED_DATE, HOLIDAY, OUTSIDE_WEEKLY_WINDOWS, BELOW_MIN_AVAILABLE_THRESHOLD. Un lote solo incrementa el contador de la primera validación que falle.

–---------------------------------------------------------------------

json

{  
 "error": "EXPOSURE_LIMIT_EXCEEDED",  
 "message": "Current open exposure exceeds limit",  
 "details": {  
"current_exposure": 45000.00,  
"exposure_currency": "USDC",  
"requested_amount_equivalent": 26274.00,  
"max_exposure": 50000.00,  
"available_capacity": 5000.00,  
"suggested_max_amount": 7500000,  
"suggested_max_amount_currency": "ARS"  
 }  
}  
**Nota sobre suggested_max_amount:**  
Este campo se calcula como available_capacity (en base_asset) multiplicado por el reference_price obtenido de APE durante el request actual. Representa el monto aproximado en quote_asset que el cliente puede solicitar. El valor es orientativo ya que el precio puede fluctuar entre requests.

–---------------------------------------------------------------------

**Otros errores posibles:**

- VALIDATION_ERROR: Request malformado.
- INVALID_REFERENCE_PRICE: Precio fuera de tolerancia vs mercado.
- RATE_LIMIT_EXCEEDED: Cliente excedió rate limit.
- UNSUPPORTED_PAIR: Par no soportado.
- NO_LIQUIDITY_AVAILABLE: Sin liquidez disponible para cubrir ninguna porción del monto solicitado.

**Reglas de negocio aplicables:** RN-001, RN-005, RN-006, RN-007, RN-106

**Nota importante:**

El endpoint POST /v1/ape/reference-price tiene el siguiente comportamiento:

**Escenario 1: Operación exitosa con allocations**

- HTTP 200 OK
- Response contiene allocations array con 1+ elementos
- covered_quote_asset_amount \> 0

**Escenario 2: Operación exitosa SIN allocations (ningún lote elegible)**

- HTTP 200 OK
- Response contiene allocations array vacío \[\]
- covered_quote_asset_amount \= 0
- RFQ API interpreta esto y retorna NO_LIQUIDITY_AVAILABLE al cliente

**Escenario 3: Error técnico en APE**

- HTTP 500 o 503 (según el tipo de error técnico)
- Response contiene error code y mensaje
- RFQ API retorna error apropiado al cliente

**Criterio de distinción:**

APE retorna 200 OK siempre que pueda ejecutar la lógica de evaluación de lotes, independientemente del resultado. Solo retorna error (5xx) si hay una falla técnica que impide ejecutar la evaluación (ej: base de datos no disponible, timeout, etc.).

La decisión de mostrar NO_LIQUIDITY_AVAILABLE al cliente es responsabilidad del RFQ API, no del APE.

---

### 6.1.1.2 POST /v1/rfq/payment

**Descripción:** Cliente solicita cotización para pago internacional (payment).

**Status:** NOT_IMPLEMENTED (Planificado para v2.0)

**Consumidor:** Cliente (Web App o API Client)

**Request:**

json

{  
 "beneficiary_amount": 10000,  
 "beneficiary_currency": "USD...",  
 "origin_currency": "ARS",  
 "destination_country": "US"  
}

**Response:**

json

{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Payment quotations will be available in v2.0",  
 "details": {  
 "operation_type": "payment",  
 "status": "planned"  
 }  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

**Nota:** El diseño completo del request/response se definirá en la especificación de v2.0 cuando se determine el modelo de pricing de payments.

---

### 6.1.1.3 POST /v1/rfq/pre_quotes/{pre_quote_id}/accept

**Descripción:** Cliente acepta una pre-quote, creando una quote definitiva. La operación queda confirmada contablemente en el sistema.

**Nota:** Este endpoint es común para todos los tipos de operación. El sistema determina el tipo basándose en el operation_type de la pre-quote y ejecuta el flujo correspondiente.

**Consumidor:** Cliente (Web App o API Client)

**Path Parameters:**

| Parámetro    | Tipo   | Descripción                |
| :----------- | :----- | :------------------------- |
| pre_quote_id | string | Identificador de pre-quote |

**Request:**

json

{  
 "pre_quote_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  
 "idempotency_key": "accept_20260129_001"  
}

**Request Schema:**

| Campo           | Tipo   | Requerido | Descripción            |
| :-------------- | :----- | :-------- | :--------------------- |
| pre_quote_token | string | Sí        | Token firmado recibido |
| idempotency_key | string | No        | Clave de idempotencia  |

**Proceso interno:**

1. RFQ API valida token (firma, TTL, client binding, anti-replay).
2. RFQ API valida TTL restante \>= 5 segundos.
3. RFQ API obtiene detalle completo de pre-quote de base de datos.
4. RFQ API envía CREATE_QUOTE a Quote Module.
5. Quote Module retorna **201 Created** con quote_id.
6. RFQ API notifica a APE vía webhook.
7. APE ejecuta transición de reservas: RESERVED → EXECUTED.
8. APE actualiza snapshots (reserved → executed).
9. RFQ API retorna confirmación al cliente.

**Response:**

json

{  
 "quote_id": "q_7781",  
 "pre_quote_id": "pq_abc123",  
 "operation_type": "swap",  
 "status": "CONFIRMED_PENDING_SETTLEMENT",  
 "message": "Swap confirmed successfully",  
 "settlement_note": "Physical settlement will be processed during business hours",  
 "created_at": "2026-01-29T15:00:25-03:00"  
}

**Response Schema:**

| Campo           | Tipo   | Descripción                       |
| :-------------- | :----- | :-------------------------------- |
| quote_id        | string | Identificador de quote creada     |
| pre_quote_id    | string | Referencia a pre-quote original   |
| operation_type  | string | “swap”, ”payment”                 |
| status          | string | "CONFIRMED_PENDING_SETTLEMENT"    |
| message         | string | Mensaje de confirmación           |
| settlement_note | string | Nota sobre liquidación física     |
| created_at      | string | Timestamp de creación (ISO 8601\) |

**Códigos de respuesta:**

- **200 OK:** Quote aceptada exitosamente
- **400 Bad Request:** Token inválido o TTL expirado
- **409 Conflict:** Pre-quote ya procesada (idempotencia)
- **500 Internal Server Error:** Error interno

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "INVALID_PREQUOTE_TOKEN",  
 "message": "Token is invalid or has been manipulated"  
}

–---------------------------------------------------------------------

json

{  
 "error": "PREQUOTE_EXPIRED",  
 "message": "Pre-quote has expired, please request a new quote"  
}

–---------------------------------------------------------------------

json

{  
 "error": "PREQUOTE_EXPIRING_SOON",  
 "message": "Pre-quote expires in less than 5 seconds, please request a new quote",  
 "details": {  
 "ttl_remaining_seconds": 3  
 }  
}

–---------------------------------------------------------------------

**Otros errores posibles:**

- TOKEN_CUSTOMER_MISMATCH: Token no pertenece al cliente
- REPLAY_DETECTED: Token ya usado
- REQUOTE_REQUIRED: Error en ejecución, requiere nueva cotización

**Reglas de negocio aplicables:** RN-002, RN-003, RN-008

**Nota sobre liquidación:**

El sistema registra la operación como "ejecutada". Ambas partes ejecutan las transferencias físicas (blockchain/bancarias) de forma manual en horario hábil.

---

### 6.1.1.4 POST /v1/rfq/pre_quotes/{pre_quote_id}/reject

**Descripción:** Cliente rechaza explícitamente una pre-quote.

**Nota:** Este endpoint es común para todos los tipos de operación.

**Consumidor:** Cliente (Web App o API Client)

**Path Parameters:**

| Parámetro    | Tipo   | Descripción                |
| :----------- | :----- | :------------------------- |
| pre_quote_id | string | Identificador de pre-quote |

**Request:**

json

{  
 "pre_quote_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  
}

**Request Schema:**

| Campo           | Tipo   | Requerido | Descripción   |
| :-------------- | :----- | :-------- | :------------ |
| pre_quote_token | string | Sí        | Token firmado |

**Proceso interno:**

1. RFQ API valida token (firma, client binding)
2. RFQ API notifica a APE vía webhook
3. APE ejecuta transición de reservas: RESERVED → REVERTED.
4. APE actualiza snapshots (reserved → available)
5. RFQ API actualiza pre-quote status a REJECTED

**Response:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "status": "REJECTED",  
 "message": "Pre-quote rejected successfully"  
}

**Response Schema:**

| Campo        | Tipo   | Descripción                |
| :----------- | :----- | :------------------------- |
| pre_quote_id | string | Identificador de pre-quote |
| status       | string | "REJECTED"                 |
| message      | string | Mensaje de confirmación    |

**Códigos de respuesta:**

- **200 OK:** Pre-quote rechazada exitosamente
- **400 Bad Request:** Token inválido
- **404 Not Found:** Pre-quote no encontrada

**Errores:**

json

{  
 "error": "INVALID_PREQUOTE_TOKEN",  
 "message": "Token is invalid"  
}

json

{  
 "error": "PREQUOTE_EXPIRED",  
 "message": "Pre-quote has already expired"  
}

**Reglas de negocio aplicables:** RN-004

---

### 6.1.1.5 GET /v1/rfq/config

**Descripción:** Retorna la configuración completa del servicio RFQ, incluyendo thresholds de cobertura, TTL de pre-quotes, límites de rate limiting y pares soportados.

**Consumidor:** Cliente (Web App, Mobile App, API Client)

**Autenticación:** No requerida (endpoint público)

**Rate limit:** Excluido de rate limiting

**Headers recomendados:**

- Cache-Control: public, max-age=300

**Response:**

**Response: 200 OK**

json

{  
 "pre_quote": {  
 "ttl_seconds": 30,  
 "grace_period_seconds": 5  
 },  
 "rate_limits": {  
 "ask_for_prices": {  
 "requests_per_second": 10,  
 "burst": 20  
 },  
 "accept_pre_quote": {  
 "requests_per_second": 5,  
 "burst": 10  
 },  
 "reject_pre_quote": {  
 "requests_per_second": 5,  
 "burst": 10  
 }  
 },  
 "market_reference": {  
 "threshold_percentage": 2.0,  
 "provider": "tradingview"  
 },  
 "supported_pairs": \[  
 {  
 "interface_pair": "USDC/ARS",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": \["BUY", "SELL"\],  
 "min_quote_amount": 10000,  
 "max_quote_amount": 100000000  
 },  
 {  
 "interface_pair": "USDT/ARS",  
 "base_asset": "USDT",  
 "quote_asset": "ARS",  
 "side": \["BUY", "SELL"\],  
 "min_quote_amount": 10000,  
 "max_quote_amount": 100000000  
 }  
 \],  
 "idempotency": {  
 "cache_ttl_hours": 24  
 },  
 "timing_invariants": {  
 "grace_period_constraint": "grace_period_seconds \>= (expiration_job_interval_seconds \+ 1)"  
 }  
}

**Response Schema:**

| Campo                                 | Tipo    | Descripción                             |
| :------------------------------------ | :------ | :-------------------------------------- |
| pre_quote.ttl_seconds                 | integer | Tiempo de vida de pre-quotes            |
| pre_quote.grace_period_seconds        | integer | TTL mínimo requerido para ACCEPT        |
| rate_limits                           | object  | Límites de requests por endpoint        |
| market_reference.threshold_percentage | numeric | Desviación máxima vs precio de mercado  |
| supported_pairs                       | array   | Lista de pares soportados con límites   |
| idempotency.cache_ttl_hours           | integer | Tiempo de retención de idempotency keys |

**Códigos de respuesta:**

- **200 OK:** Configuración retornada exitosamente
- **503 Service Unavailable:** Servicio no disponible

**Notas:**

- El cliente DEBE cachear esta respuesta (5 minutos recomendado)
- Los valores pueden cambiar sin previo aviso
- El min_threshold es un **valor de referencia** para el cliente, NO una validación de backend
- El cliente decide la lógica de UX basándose en estos valores

---

### 6.1.1.6 GET /v1/rfq/health

**Descripción:** Health check endpoint para monitoreo de disponibilidad del servicio.

**Consumidor:** Load balancers, sistemas de monitoreo, orquestadores (Kubernetes)

**Autenticación:** No requerida

**Request:** Sin parámetros

**Response:**

json

{  
 "status": "healthy",  
 "timestamp": "2026-01-29T15:00:00-03:00",  
 "version": "1.0.0",  
 "service": "rfq-api",  
 "dependencies": {  
 "ape_service": {  
 "status": "healthy",  
 "latency_ms": 12  
 },  
 "client_module": {  
 "status": "healthy",  
 "latency_ms": 8  
 },  
 "quote_module": {  
 "status": "healthy",  
 "latency_ms": 15  
 },  
 "tradingview_api": {  
 "status": "healthy",  
 "latency_ms": 45  
 },  
 "database": {  
 "status": "healthy",  
 "connection_pool_active": 5,  
 "connection_pool_idle": 15  
 },  
 "redis": {  
 "status": "healthy",  
 "latency_ms": 2  
 }  
 }  
}

**Response Schema:**

| Campo                                        | Tipo    | Descripción                   |
| :------------------------------------------- | :------ | :---------------------------- |
| status                                       | string  | "healthy" o "unhealthy"       |
| timestamp                                    | string  | Timestamp actual (ISO 8601\)  |
| version                                      | string  | Versión del servicio          |
| service                                      | string  | Nombre del servicio           |
| dependencies                                 | object  | Estado de dependencias        |
| dependencies.{service}.status                | string  | "healthy" o "unhealthy"       |
| dependencies.{service}.latency_ms            | integer | Latencia de health check (ms) |
| dependencies.database.connection_pool_active | integer | Conexiones activas            |
| dependencies.database.connection_pool_idle   | integer | Conexiones idle               |

**Códigos de respuesta:**

- **200 OK:** Servicio saludable
- **503 Service Unavailable:** Servicio no saludable (alguna dependencia crítica está caída)

**Response cuando unhealthy:**

json

{  
 "status": "unhealthy",  
 "timestamp": "2026-01-29T15:00:00-03:00",  
 "version": "1.0.0",  
 "service": "rfq-api",  
 "dependencies": {  
 "ape_service": {  
 "status": "unhealthy",  
 "error": "Connection timeout after 5000ms"  
 },  
 "client_module": {  
 "status": "healthy",  
 "latency_ms": 8  
 },  
 "quote_module": {  
 "status": "healthy",  
 "latency_ms": 15  
 },  
 "tradingview_api": {  
 "status": "degraded",  
 "latency_ms": 2500,  
 "warning": "High latency detected"  
 },  
 "database": {  
 "status": "healthy",  
 "connection_pool_active": 5,  
 "connection_pool_idle": 15  
 },  
 "redis": {  
 "status": "healthy",  
 "latency_ms": 2  
 }  
 }  
}

**Uso:**

- **Load Balancers:** Verifican cada 10 segundos, si retorna 503 → sacan el nodo del pool
- **Kubernetes:** Liveness probe (si falla 3 veces consecutivas → restart pod)
- **Monitoring:** Alertas si status \= "unhealthy" por más de 60 segundos

---

### 6.1.1.7 GET /v1/rfq/metrics

**Descripción:** Endpoint de métricas en formato Prometheus para recolección por sistema de monitoreo.

**Consumidor:** Prometheus (scraping cada 15 segundos)

**Exposición:** Interna (solo accesible por red interna o Prometheus scraper)

**Autenticación:** No requerida (seguridad por red)

**Request:** Sin parámetros

**Response:** Texto plano en formato Prometheus

**Formato de respuesta:**

\# HELP prequotes_created_total Total pre-quotes created  
\# TYPE prequotes_created_total counter

- prequotes_created_total{client_id="cli_001",pair="USDC/ARS",side="BUY"} 1523
- prequotes_created_total{client_id="cli_002",pair="USDT/ARS",side="SELL"} 892

\# HELP prequotes_accepted_total Total pre-quotes accepted  
\# TYPE prequotes_accepted_total counter

- prequotes_accepted_total{client_id="cli_001",pair="USDC/ARS"} 1245
- prequotes_accepted_total{client_id="cli_002",pair="USDT/ARS"} 743

\# HELP prequotes_rejected_total Total pre-quotes rejected  
\# TYPE prequotes_rejected_total counter

- prequotes_rejected_total{client_id="cli_001",pair="USDC/ARS"} 178
- prequotes_rejected_total{client_id="cli_002",pair="USDT/ARS"} 89

\# HELP prequotes_expired_total Total pre-quotes expired  
\# TYPE prequotes_expired_total counter

- prequotes_expired_total{client_id="cli_001",pair="USDC/ARS"} 100
- prequotes_expired_total{client_id="cli_002",pair="USDT/ARS"} 60

\# HELP prequote_acceptance_rate Pre-quote acceptance rate percentage  
\# TYPE prequote_acceptance_rate gauge

- prequote_acceptance_rate{client_id="cli_001",pair="USDC/ARS"} 81.75
- prequote_acceptance_rate{client_id="cli_002",pair="USDT/ARS"} 83.26

\# HELP prequote_ttl_remaining_seconds TTL remaining for active pre-quotes  
\# TYPE prequote_ttl_remaining_seconds gauge

- prequote_ttl_remaining_seconds{pre_quote_id="pq_abc123"} 23
- prequote_ttl_remaining_seconds{pre_quote_id="pq_def456"} 17

\# HELP http_requests_total Total HTTP requests  
\# TYPE http_requests_total counter

- http_requests_total{method="POST",path="/v1/rfq/ask_for_prices",status="200"} 1523
- http_requests_total{method="POST",path="/v1/rfq/accept_pre_quote",status="200"} 1245
- http_requests_total{method="POST",path="/v1/rfq/reject_pre_quote",status="200"} 178
- http_requests_total{method="POST",path="/v1/rfq/ask_for_prices",status="400"} 45
- http_requests_total{method="POST",path="/v1/rfq/ask_for_prices",status="503"} 12

\# HELP http_request_duration_seconds HTTP request latency  
\# TYPE http_request_duration_seconds histogram

- http_request_duration_seconds_bucket{method="POST",path="/v1/rfq/ask_for_prices",le="0.1"} 1450
- http_request_duration_seconds_bucket{method="POST",path="/v1/rfq/ask_for_prices",le="0.5"} 1520
- http_request_duration_seconds_bucket{method="POST",path="/v1/rfq/ask_for_prices",le="1.0"} 1523
- http_request_duration_seconds_bucket{method="POST",path="/v1/rfq/ask_for_prices",le="+Inf"} 1523
- http_request_duration_seconds_sum{method="POST",path="/v1/rfq/ask_for_prices"} 182.5
- http_request_duration_seconds_count{method="POST",path="/v1/rfq/ask_for_prices"} 1523

\# HELP http_requests_in_flight Current HTTP requests in flight  
\# TYPE http_requests_in_flight gauge

- http_requests_in_flight{method="POST",path="/v1/rfq/ask_for_prices"} 3
- http_requests_in_flight{method="POST",path="/v1/rfq/accept_pre_quote"} 1

\# HELP ape_client_latency_seconds APE Service client latency  
\# TYPE ape_client_latency_seconds histogram

- ape_client_latency_seconds_bucket{endpoint="/v1/ape/reference-price",le="0.05"} 1200
- ape_client_latency_seconds_bucket{endpoint="/v1/ape/reference-price",le="0.1"} 1450
- ape_client_latency_seconds_bucket{endpoint="/v1/ape/reference-price",le="0.5"} 1520
- ape_client_latency_seconds_sum{endpoint="/v1/ape/reference-price"} 145.3
- ape_client_latency_seconds_count{endpoint="/v1/ape/reference-price"} 1523

\# HELP ape_client_errors_total APE Service client errors  
\# TYPE ape_client_errors_total counter

- ape_client_errors_total{endpoint="/v1/ape/reference-price",error_type="timeout"} 5
- ape_client_errors_total{endpoint="/v1/ape/reference-price",error_type="connection_error"} 2

\# HELP client_module_latency_seconds Client Module latency  
\# TYPE client_module_latency_seconds histogram

- client_module_latency_seconds_bucket{endpoint="/api/clients/{id}/pricing",le="0.05"} 1400
- client_module_latency_seconds_bucket{endpoint="/api/clients/{id}/pricing",le="0.1"} 1500
- client_module_latency_seconds_sum{endpoint="/api/clients/{id}/pricing"} 98.7
- client_module_latency_seconds_count{endpoint="/api/clients/{id}/pricing"} 1523

\# HELP tradingview_latency_seconds TradingView API latency  
\# TYPE tradingview_latency_seconds histogram

- tradingview_latency_seconds_bucket{le="0.1"} 1200
- tradingview_latency_seconds_bucket{le="0.5"} 1500
- tradingview_latency_seconds_bucket{le="1.0"} 1520
- tradingview_latency_seconds_sum 456.8
- tradingview_latency_seconds_count 1523

\# HELP database_connection_pool_active Active database connections  
\# TYPE database_connection_pool_active gauge

- database_connection_pool_active 5

\# HELP database_connection_pool_idle Idle database connections  
\# TYPE database_connection_pool_idle gauge

- database_connection_pool_idle 15

\# HELP redis_operations_total Total Redis operations  
\# TYPE redis_operations_total counter

- redis_operations_total{operation="get",status="hit"} 45234
- redis_operations_total{operation="get",status="miss"} 1234
- redis_operations_total{operation="set",status="success"} 1523

**Tipos de métricas expuestas:**

**1\. Business Metrics:**

- prequotes_created_total \- Counter
- prequotes_accepted_total \- Counter
- prequotes_rejected_total \- Counter
- prequotes_expired_total \- Counter
- prequote_acceptance_rate \- Gauge (%)
- prequote_ttl_remaining_seconds \- Gauge

**2\. API Metrics:**

- http_requests_total \- Counter
- http_request_duration_seconds \- Histogram
- http_requests_in_flight \- Gauge

**3\. Dependencies Metrics:**

- ape_client_latency_seconds \- Histogram
- ape_client_errors_total \- Counter
- client_module_latency_seconds \- Histogram
- tradingview_latency_seconds \- Histogram

**4\. Infrastructure Metrics:**

- database_connection_pool_active \- Gauge
- database_connection_pool_idle \- Gauge
- redis_operations_total \- Counter

**Códigos de respuesta:**

- **200 OK:** Métricas retornadas exitosamente (siempre retorna 200, incluso si el servicio está degradado)

**Configuración de Prometheus:**

yaml

scrape_configs:  
 \- job_name: 'rfq-api'  
 scrape_interval: 15s  
 scrape_timeout: 10s  
 static_configs:  
 \- targets: \['rfq-api:8080'\]  
 metrics_path: '/v1/rfq/metrics'

**Visualización en Grafana:**

Estas métricas se visualizan en dashboards de Grafana conectado a Prometheus como datasource. Ver sección 12.3 para detalles sobre dashboards específicos.

---

## 6.2 Servicio: APE (Ardua Price Engine)

**Nombre:** ape-service

**Responsabilidades:**

- **Swap Module(v1.0):**
  - Proveer precio de referencia desde lotes y price providers externos.
  - Gestionar disponibilidad de lotes (lots, snapshots, transactions).
  - Registrar entradas y salidas de fondos (FUNDS_IN/FUNDS_OUT).
  - Ejecutar reservas de capacidad (FUNDS_RESERVE).
  - Transicionar estados de reservas (RESERVED → EXECUTED/REVERTED).
  - Consultar Price Providers externos (Binance, BYMA, Bitso).
- **Payment Module(v2.0):**
  - Proveer pricing de payments (FX rates \+ fees).
  - Gestionar órdenes de pago (payment orders).
  - Modelo de reservas/confirmación propio.
  - Registro de fees y costos asociados.
  - Transacciones específicas de payment (tipos TBD).
- **Responsabilidades comunes:**
  - Calcular exposición del cliente (suma de reservas de swap \+ payment)
  - Historial unificado de transacciones (GET /v1/ape/transactions)
  - Proveer métricas y configuración del sistema

**Exposición:** Interna (no expuesta a internet)

**Dependencias:**

- Base de datos **ape_gateway_db**, schema **allocations**
- Caché de precios de providers
- Binance API (HTTP, price provider)
- BYMA API (HTTP, price provider)
- Bitso API (HTTP, price provider)

**Configuración:**

APE/config/ape_config.yaml

expiration_job_interval_seconds: 5 _\# Frecuencia del job de expiración_ expiration_job_batch_size: 100 _\# MAX de reservas procesadas por ejecución_  
price_provider_cache_ttl_seconds: 5 _\# TTL de caché de precios externos_ price_provider_timeout_ms: 1000 _\# Timeout para consultas a providers_ circuit_breaker_failure_threshold: 3 _\# Failures antes de abrir circuit_ circuit_breaker_cooldown_seconds: 60 _\# Tiempo antes de retry tras fallo_  
_\# Configuración de cálculo de exposición_  
exposure:  
reference_asset: "USDC" _\# Asset de referencia para límites de exposición_  
exchange_rates:  
_\# Tasas de conversión a USDC (asset de referencia)_  
_\# Para stablecoins, las tasas son prácticamente 1:1_  
usdc: 1.0  
usdt: 1.0  
usd: 1.0  
_\# Thresholds de disponibilidad mínima por asset_  
min_lot_available_threshold:  
default: 1000  
usdc: 1000  
usdt: 1000  
usd: 1000  
ars: 1000

**Job de Expiración:**

- Ejecuta cada expiration_job_interval_seconds
- Query: Reservas (tipo FUNDS_RESERVE, status RESERVED) con expires_at \< NOW()
- Procesa máximo expiration_job_batch_size registros

---

### 6.2.1 Endpoints

| Método | Path                                 | Descripción                                                    | Consumidor |
| :----- | :----------------------------------- | :------------------------------------------------------------- | :--------- |
| POST   | /v1/ape/swap/reference-price         | Obtener precio de referencia y allocaciones disponibles        | RFQ API    |
| POST   | /v1/ape/swap/reserve                 | Reservar capacidad (FUNDS_RESERVE)                             | RFQ API    |
| POST   | /v1/ape/swap/execute                 | Ejecutar reservas (RESERVED → EXECUTED)                        | RFQ API    |
| POST   | /v1/ape/swap/revert                  | Revertir reservas (RESERVED → REVERTED)                        | RFQ API    |
| POST   | /v1/ape/payment/reference-price      | Obtener precio de referencia y allocaciones disponibles        | RFQ API    |
| POST   | /v1/ape/payment/reserve              | Reservar capacidad (FUNDS_RESERVE)                             | RFQ API    |
| POST   | /v1/ape/payment/execute              | Ejecutar reservas (RESERVED → EXECUTED)                        | RFQ API    |
| POST   | /v1/ape/payment/revert               | Revertir reservas (RESERVED → REVERTED)                        | RFQ API    |
| GET    | /v1/ape/clients/{client_id}/exposure | Obtener exposición actual del cliente                          | RFQ API    |
| POST   | /v1/ape/lots                         | Crear lotes                                                    | Admin BFF  |
| GET    | /v1/ape/lots                         | Listar lotes                                                   | Admin BFF  |
| GET    | /v1/ape/lots/{id}                    | Detalle de lote                                                | Admin BFF  |
| POST   | /v1/ape/lots/{id}/fund               | Registrar entrada de fondos (FUNDS_IN)                         | Admin BFF  |
| POST   | /v1/ape/lots/{id}/retire             | Registrar salida de fondos (FUNDS_OUT)                         | Admin BFF  |
| PATCH  | /v1/ape/lots/{id}/status             | Cambiar status de lote                                         | Admin BFF  |
| GET    | /v1/ape/transactions                 | Listar transacciones. (v1.0: solo swap, v2.0: swap \+ payment) | Admin BFF  |
| GET    | /v1/ape/config                       | Configuraciones del APE                                        | Admin BFF  |
| GET    | /v1/ape/health                       | Health check                                                   | Monitoring |
| GET    | /v1/ape/metrics                      | Métricas Prometheus                                            | Monitoring |

**Nota sobre endpoints:**

- Los endpoints de **lotes** (lots) son específicos del Swap Module.
- El endpoint de **transacciones** (GET /v1/ape/transactions) es común: en v1.0 retorna solo transacciones de swap, en v2.0 retornará transacciones de swap \+ payment.
- En v1.0 los endpoints /payment/\* se incluyen como placeholders para preservar compatibilidad del contrato y habilitar una futura iteración. En esta versión, Payment no tiene modelo de pricing ni de gestión de capacidad definido; por lo tanto, estos endpoints retornan NOT_IMPLEMENTED y su request/response definitivo se especificará cuando se incorpore el modelo de definición/gestión de precios para Payment.

---

### 6.2.1.1 POST /v1/ape/swap/reference-price

**Descripción:** Calcula precio de referencia y allocations para operación de swap.

**Consumidor:** RFQ API

**Request:**

json

{  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "requested_quote_asset_amount": 40000000  
}

**Request Schema:**

| Campo                        | Tipo    | Requerido | Descripción                     |
| :--------------------------- | :------ | :-------- | :------------------------------ |
| base_asset                   | string  | Sí        | Divisa base del par             |
| quote_asset                  | string  | Sí        | Divisa cotizada del par         |
| side                         | string  | Sí        | "BUY" o "SELL"                  |
| requested_quote_asset_amount | numeric | Sí        | Monto solicitado en quote_asset |

**Proceso interno APE:**

1. Filtra lotes donde base_asset \+ quote_asset \+ side coinciden
2. Aplica reglas de elegibilidad (RN-007):
   - Status \= ACTIVE
   - Fuera de blackout_windows
   - No en exclude_dates (o en include_dates override)
   - Holiday calendar permite operación
   - Dentro de weekly_windows: snapshot.available \>= min_lot_available_threshold\[base_asset\] (usa min_lot_available_threshold\[default\] si no configurado)
3. Para cada lote elegible: consulta snapshots.available para obtener disponibilidad real
4. Calcula cobertura: available \* lots.price (cuánto quote_asset puede cubrir)
5. Distribuye requested_quote_asset_amount entre lotes con disponibilidad
6. Construye allocations con precios BASE y montos cubiertos por cada lote

**Response:**

json

{  
 "pair": "USDC/ARS",  
 "side": "BUY",  
 "requested_quote_asset_amount": 40000000,  
 "covered_quote_asset_amount": 40000000,  
 "pending_quote_asset_amount": 0,  
 "reference_price": {  
 "num_quote_asset_u": 40000000000000,  
 "den_base_asset_u": 26254000000  
 },  
 "price_display": 1523.45,  
 "allocations": \[  
 {  
 "allocation_id": "alc_001",  
 "lot_id": "lot_gps_ardua_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1490.00,  
 "covered_quote_asset_amount": 7450000,  
 "covered_base_asset_amount": 5000.00,  
 "provider_price_details": null  
 },  
 {  
 "allocation_id": "alc_002",  
 "lot_id": "lot_pps_binance_02",  
 "context": "PRICE_PROVIDER_SETUP",  
 "provider": "BINANCE",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1532.00,  
 "covered_quote_asset_amount": 32550000,  
 "covered_base_asset_amount": 21254.00,  
 "provider_price_details": {  
 "feed": "USDT_ARS",  
 "source_price": 1530.00,  
 "spread_bps": 13  
 }  
 }  
 \]  
}

**Response Schema:**

| Campo                                      | Tipo    | Descripción                                   |
| :----------------------------------------- | :------ | :-------------------------------------------- |
| pair                                       | string  | Par de divisas                                |
| side                                       | string  | "BUY" o "SELL"                                |
| requested_quote_asset_amount               | numeric | Monto solicitado                              |
| covered_quote_asset_amount                 | numeric | Monto cubierto                                |
| pending_quote_asset_amount                 | numeric | Monto no cubierto                             |
| reference_price                            | object  | Precio racional agregado                      |
| reference_price.num_quote_asset_u          | bigint  | Numerador (unidades de quote_asset)           |
| reference_price.den_base_asset_u           | bigint  | Denominador (unidades de base_asset)          |
| price_display                              | numeric | Precio decimal (solo display)                 |
| allocations                                | array   | Distribución de liquidez por lote             |
| allocations\[\].allocation_id              | string  | ID único generado por APE                     |
| allocations\[\].lot_id                     | string  | Identificador del lote asignado               |
| allocations\[\].context                    | string  | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP" |
| allocations\[\].provider                   | string  | ARDUA, BINANCE, BYMA, BITSO                   |
| allocations\[\].base_asset                 | string  | Divisa base                                   |
| allocations\[\].quote_asset                | string  | Divisa cotizada                               |
| allocations\[\].side                       | string  | "BUY" o "SELL"                                |
| allocations\[\].price                      | numeric | Precio BASE del lote (sin markup)             |
| allocations\[\].covered_quote_asset_amount | numeric | Monto cubierto en quote_asset                 |
| allocations\[\].covered_base_asset_amount  | numeric | Monto cubierto en base_asset                  |
| allocations\[\].provider_price_details     | object  | Detalles de pricing (si aplica)               |

**Códigos de respuesta:**

- **200 OK:** Allocations construidas exitosamente
- **400 Bad Request:** Parámetros inválidos
- **404 Not Found:** No hay lotes elegibles para el par solicitado
- **503 Service Unavailable:** Insufficient liquidity (pending \> 50%)

**Nota sobre disponibilidad:**

La disponibilidad de cada lote se consulta en allocation.snapshots.available. El monto máximo que un lote puede cubrir se calcula como: snapshot.available \* lot.price. APE distribuye el monto solicitado entre lotes según disponibilidad y orden de precedencia.

**Reglas de negocio aplicables:** RN-007

---

### 6.2.1.2 POST /v1/ape/swap/reserve

**Descripción:** Reserva capacidad (FUNDS_RESERVE) en lotes para operación de swap.

**Consumidor:** RFQ API

**Request:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "client_id": "cli_001",  
 "allocations": \[  
 {  
 "allocation_id": "alc_001",  
 "lot_id": "lot_gps_ardua_01",  
 "amount": 5000.00  
 },  
 {  
 "allocation_id": "alc_002",  
 "lot_id": "lot_pps_binance_02",  
 "amount": 21254.00  
 }  
 \],  
 "ttl_seconds": 30  
}

**Request Schema:**

| Campo                         | Tipo    | Requerido | Descripción                                            |
| :---------------------------- | :------ | :-------- | :----------------------------------------------------- |
| pre_quote_id                  | string  | Sí        | Identificador de pre-quote                             |
| client_id                     | string  | Si        | Identificador del cliente (para cálculo de exposición) |
| allocations                   | array   | Sí        | Lista de allocations a reservar                        |
| allocations\[\].allocation_id | string  | Sí        | ID de allocation                                       |
| allocations\[\].lot_id        | string  | Sí        | ID del lote                                            |
| allocations\[\].amount        | numeric | Sí        | Monto a reservar (base_asset)                          |
| ttl_seconds                   | integer | Sí        | Tiempo de vida de la reserva                           |

**Proceso interno:**

1. BEGIN TRANSACTION
2. Para cada allocation:
   - SELECT snapshot FOR UPDATE NOWAIT WHERE lot_id \= allocation.lot_id
   - Validar snapshot.version (optimistic reserving)
   - Validar snapshot.available \>= amount
   - INSERT transaction (tipo=FUNDS_RESERVE, status=RESERVED, reference_type='PREQUOTE', reference_id=pre_quote_id, client_id=client_id, expires_at=NOW() \+ ttl_seconds)
   - UPDATE snapshot SET available \= available \- amount, reserved \= reserved \+ amount, version \= version \+ 1
   - Registrar applied_version en transactions
3. COMMIT
4. Retornar confirmación con reserve_tx_ids  
   **Ejemplo SQL genérico (ilustrativo):**  
   sql  
   BEGIN;

   _\-- Para cada allocation_  
   FOR each allocation IN allocations LOOP

   _\-- Bloquear snapshot para lectura consistente_

   SELECT \* FROM snapshots

   WHERE lot_id \= allocation.lot_id FOR UPDATE NOWAIT;

   _\-- Validar disponibilidad_

   IF snapshot.available \< allocation.amount THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE'; END IF;

   _\-- Crear reserva_

   INSERT INTO transactions ( lot_id, type, amount, status, reference_type, reference_id, client_id, expires_at

   ) VALUES (

   allocation.lot_id, 'FUNDS_RESERVE', allocation.amount, 'RESERVED', 'PREQUOTE', pre_quote_id, client_id, CURRENT_TIMESTAMP \+ ttl_seconds \* INTERVAL '1' SECOND ) RETURNING id INTO reserve_tx_id;

   _\-- Actualizar snapshot_

   UPDATE snapshots

   SET available \= available \- allocation.amount, reserved \= reserved \+ allocation.amount, version \= version \+ 1

   WHERE lot_id \= allocation.lot_id;

   END LOOP;

   COMMIT;

**Response:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "reserves": \[  
 {  
 "allocation_id": "alc_001",  
 "lot_id": "lot_gps_ardua_01",  
 "reserve_tx_id": "tx_reserve_001",  
 "amount": 5000.00,  
 "expires_at": "2026-01-29T15:00:45-03:00",  
 "snapshot_version": 1524  
 },  
 {  
 "allocation_id": "alc_002",  
 "lot_id": "lot_pps_binance_02",  
 "reserve_tx_id": "tx_reserve_002",  
 "amount": 21254.00,  
 "expires_at": "2026-01-29T15:00:45-03:00",  
 "snapshot_version": 892  
 }  
 \],  
 "status": "SUCCESS"  
}

**Response Schema:**

| Campo                         | Tipo    | Descripción                                    |
| :---------------------------- | :------ | :--------------------------------------------- |
| pre_quote_id                  | string  | Identificador de pre-quote                     |
| reserves                      | array   | Lista de reserves creados                      |
| reserves\[\].allocation_id    | string  | ID de allocation                               |
| reserves\[\].lot_id           | string  | ID del lote                                    |
| reserves\[\].reserve_tx_id    | string  | ID de transacción FUNDS_RESERVE                |
| reserves\[\].amount           | numeric | Monto reservado                                |
| reserves\[\].expires_at       | string  | Timestamp de expiración (ISO 8601\)            |
| reserves\[\].snapshot_version | integer | Versión del snapshot después del FUNDS_RESERVE |
| status                        | string  | "SUCCESS"                                      |

**Códigos de respuesta:**

- **200 OK:** FUNDS_RESERVEs ejecutados exitosamente
- **400 Bad Request:** Request mal formado
- **409 Conflict:** Insufficient available capacity or version conflict
- **500 Internal Server Error:** Error transaccional

**Errores:**

json

{  
 "error": "INSUFFICIENT_AVAILABLE",  
 "message": "Lot has insufficient available capacity",  
 "details": {  
 "lot_id": "lot_gps_ardua_01",  
 "requested": 10000.00,  
 "available": 5000.00  
 }  
}

json

{  
 "error": "VERSION_CONFLICT",  
 "message": "Snapshot was modified by concurrent operation",  
 "details": {  
 "lot_id": "lot_gps_ardua_01",  
 "expected_version": 1523,  
 "current_version": 1524  
 }  
}

**Reglas de negocio aplicables:** RN-014 (Optimistic reserving)

---

### 6.2.1.3 POST /v1/ape/swap/execute

**Descripción:** Ejecuta reservas de swap (transición RESERVED → EXECUTED).

**Consumidor:** RFQ API

**Request:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "quote_id": "q_7781"  
}

**Request Schema:**

| Campo        | Tipo   | Requerido | Descripción                                   |
| :----------- | :----- | :-------- | :-------------------------------------------- |
| pre_quote_id | string | Sí        | Identificador de pre-quote original           |
| quote_id     | string | Sí        | Identificador de quote creada(para auditoría) |

**Proceso interno:**

1.  BEGIN TRANSACTION
2.  Buscar transacciones de reserva asociadas:
    - SELECT transactions WHERE type \= 'FUNDS_RESERVE' AND reference_type \= 'PREQUOTE' AND reference_id \= pre_quote_id AND status \= 'RESERVED'
3.  Para cada transacción encontrada:
    - SELECT transactions WHERE id \= reserve_tx_id FOR UPDATE
    - Validar type \= 'FUNDS_RESERVE' AND status \= 'RESERVED'
    - Obtener lot_id y amount de la transacción
    - UPDATE transactions SET status \= 'EXECUTED', is_immutable \= TRUE, became_immutable_at \= NOW()
    - SELECT snapshots WHERE lot_id \= reserve.lot_id FOR UPDATE NOWAIT
    - Validar snapshots.reserved \>= amount
    - UPDATE snapshots SET reserved \= reserved \- amount, executed \= executed \+ amount, version \= version \+ 1
    - Registrar applied_version en transactions
4.  COMMIT
5.  Si algún EXECUTE falla → ROLLBACK completo (RN-003: All-or-Nothing)  
     **Ejemplo SQL genérico (ilustrativo):**  
     sql  
     BEGIN;

    _\-- Buscar todas las reservas asociadas a la pre-quote_  
     SELECT \* FROM transactions  
     WHERE type \= 'FUNDS_RESERVE'

    AND reference_type \= 'PREQUOTE'  
     AND reference_id \= pre_quote_id  
     AND status \= 'RESERVED'

    FOR UPDATE;

    _\-- Para cada reserva encontrada_  
     FOR each reserve_tx IN found_reserves LOOP

    _\-- Validar estado_  
     IF reserve_tx.type \!= 'FUNDS_RESERVE' OR reserve_tx.status \!= 'RESERVED'  
     THEN RAISE EXCEPTION 'INVALID_RESERVE_STATUS';  
     END IF;

    _\-- Transicionar a EXECUTED_  
     UPDATE transactions  
     SET status \= 'EXECUTED',

                      is\_immutable \= TRUE,
                      became\_immutable\_at \= CURRENT\_TIMESTAMP

    WHERE id \= reserve_tx.id;  
    _\-- Actualizar snapshot: reserved → executed_  
    UPDATE snapshots  
    SET reserved \= reserved \- reserve_tx.amount,  
     executed \= executed \+ reserve_tx.amount,  
     version \= version \+ 1  
    WHERE lot_id \= reserve_tx.lot_id;

END LOOP;

COMMIT;

**Response:**

json

{  
 "quote_id": "q_7781",  
 "pre_quote_id": "pq_abc123",  
 "executions": \[  
 {  
 "reserve_tx_id": "tx_reserve_001",  
 "lot_id": "lot_gps_ardua_01",  
 "amount": 5000.00,  
 "snapshot_version": 1525  
 },  
 {  
 "reserve_tx_id": "tx_reserve_002",  
 "lot_id": "lot_pps_binance_02",  
 "amount": 21254.00,  
 "snapshot_version": 893  
 }  
 \]  
}

**Response Schema:**

| Campo                           | Tipo    | Descripción                              |
| :------------------------------ | :------ | :--------------------------------------- |
| quote_id                        | string  | Identificador de quote                   |
| pre_quote_id                    | string  | Identificador de pre-quote               |
| executions                      | array   | Lista de ejecuciones                     |
| executions\[\].reserve_tx_id    | string  | ID de transacción FUNDS_RESERVE          |
| executions\[\].lot_id           | string  | ID del lote                              |
| executions\[\].amount           | numeric | Monto ejecutado                          |
| executions\[\].snapshot_version | integer | Versión del snapshot después del EXECUTE |

**Códigos de respuesta:**

- **200 OK:** Ejecución exitosa
- **400 Bad Request:** Reserva inválida o ya ejecutada
- **409 Conflict:** FUNDS_RESERVE no encontrado o status \!= RESERVED
- **500 Internal Server Error:** Error transaccional

**Errores:**

json

{  
 "error": "INVALID_FUNDS_RESERVE_STATUS",  
 "message": "Reserve transaction is not in RESERVED status",  
 "details": {  
 "reserve_tx_id": "tx_reserve_001",  
 "current_status": "REVERTED"  
 }  
}

json

{  
 "error": "EXECUTION_FAILED",  
 "message": "Failed to execute all reserves (rolled back)",  
 "details": {  
 "total_reserves": 2,  
 "failed_at": "tx_reserve_002",  
 "reason": "Insufficient reserved balance"  
 }  
}

**Reglas de negocio aplicables:** RN-003 (All-or-Nothing execution), RN-014 (Optimistic reserving)

---

### 6.2.1.4 POST /v1/ape/swap/revert

**Descripción:** Revierte reservas de swap (transición RESERVED → REVERTED).

**Consumidor:** RFQ API

**Request:**

json

{  
 "pre_quote_id": "pq_abc123",  
 "reason": "CLIENT_REJECTED"  
}

**Request Schema:**

| Campo        | Tipo   | Requerido | Descripción                                                |
| :----------- | :----- | :-------- | :--------------------------------------------------------- |
| pre_quote_id | string | Sí        | Identificador de pre-quote                                 |
| reason       | string | Sí        | Motivo del revert: "CLIENT_REJECTED", "EXPIRED", "TIMEOUT" |

**Proceso interno:**

1. BEGIN TRANSACTION
2. Buscar transacciones de reserva asociadas:
   - SELECT transactions WHERE type \= 'FUNDS_RESERVE' AND reference_type \= 'PREQUOTE' AND reference_id \= pre_quote_id AND status \= 'RESERVED'
3. Para cada transacción encontrada:
   - SELECT transactions WHERE id \= reserve_tx_id FOR UPDATE
   - Validar type \= 'FUNDS_RESERVE' AND status \= 'RESERVED'
   - Obtener lot_id y amount de la transacción
   - UPDATE transactions SET status \= 'REVERTED', is_immutable \= TRUE, became_immutable_at \= NOW(), reason \= reason
   - SELECT snapshots WHERE lot_id \= reserve.lot_id FOR UPDATE NOWAIT
   - Validar snapshots.reserved \>= amount
   - UPDATE snapshots SET reserved \= reserved \- amount, available \= available \+ amount, version \= version \+ 1
   - Registrar applied_version en transactions
4. COMMIT
5. Si algún EXECUTE falla → ROLLBACK completo (RN-003: All-or-Nothing)  
   **Ejemplo SQL genérico (ilustrativo):**  
   sql  
   BEGIN;

   _\-- Buscar todas las reservas asociadas a la pre-quote_  
   SELECT \* FROM transactions  
   WHERE type \= 'FUNDS_RESERVE'

   AND reference_type \= 'PREQUOTE'  
   AND reference_id \= pre_quote_id  
   AND status \= 'RESERVED'

   FOR UPDATE;

   _\-- Para cada reserva encontrada_  
   FOR each reserve_tx IN found_reserves LOOP

   _\-- Validar estado_  
   IF reserve_tx.type \!= 'FUNDS_RESERVE' OR reserve_tx.status \!= 'RESERVED'  
   THEN RAISE EXCEPTION 'INVALID_RESERVE_STATUS';  
   END IF;

   _\-- Transicionar a REVERTED_  
   UPDATE transactions  
   SET status \= 'REVERTED',  
    is_immutable \= TRUE,  
    became_immutable_at \= CURRENT_TIMESTAMP,  
    reason \= :reason_param  
   WHERE id \= reserve_tx.id;  
   _\-- Actualizar snapshot: reserved → available (liberar capacidad)_  
   UPDATE snapshots  
   SET reserved \= reserved \- reserve_tx.amount,  
    available \= available \+ reserve_tx.amount,  
    version \= version \+ 1  
   WHERE lot_id \= reserve_tx.lot_id;

   END LOOP;

   COMMIT;

**Response:**

json  
{  
 "pre_quote_id": "pq_abc123",  
 "reverts": \[  
 {  
 "reserve_tx_id": "tx_reserve_001",  
 "lot_id": "lot_gps_ardua_01",  
 "amount": 5000.00,  
 "snapshot_version": 1526  
 },  
 {  
 "reserve_tx_id": "tx_reserve_002",  
 "lot_id": "lot_pps_binance_02",  
 "amount": 21254.00,  
 "snapshot_version": 894  
 }  
 \]  
}

**Response Schema:**

| Campo                        | Tipo    | Descripción                              |
| :--------------------------- | :------ | :--------------------------------------- |
| pre_quote_id                 | string  | Identificador de pre-quote               |
| reverts                      | array   | Lista de reversiones                     |
| reverts\[\].reserve_tx_id    | string  | ID de transacción FUNDS_RESERVE original |
| reverts\[\].lot_id           | string  | ID del lote                              |
| reverts\[\].amount           | numeric | Monto revertido                          |
| reverts\[\].snapshot_version | integer | Versión del snapshot después del REVERT  |

**Códigos de respuesta:**

- **200 OK:** Reversión exitosa
- **400 Bad Request:** Lock inválido o ya revertido
- **409 Conflict:** FUNDS_RESERVE no encontrado o status \!= RESERVED
- **500 Internal Server Error:** Error transaccional

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "INVALID_FUNDS_RESERVE_STATUS",  
 "message": "Reserve transaction is not in RESERVED status",  
 "details": {  
 "reserve_tx_id": "tx_reserve_001",  
 "current_status": "EXECUTED"  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "ALREADY_REVERTED",  
 "message": "Reserve has already been reverted",  
 "details": {  
 "reserve_tx_id": "tx_reserve_001",  
 "current_status": "REVERTED",  
 "became_immutable_at": "2026-02-12T14:55:00-03:00"  
 }  
}  
–---------------------------------------------------------------------

**Reglas de negocio aplicables:** RN-004 (Idempotent expiration), RN-013 (All reserves expire to REVERT), RN-014 (Optimistic reserving)

---

### 6.2.1.5 POST /v1/ape/payment/reference-price

**Status:** NOT_IMPLEMENTED (v2.0).

**Descripción:** Calcula precio para pago internacional (Payment Module).

**Consumidor:** RFQ API

**Response (v1.0):**

json  
{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Payment pricing will be available soon",  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

---

### 6.2.1.6 POST /v1/ape/payment/reserve

**Status:** NOT_IMPLEMENTED (v2.0).

**Descripción:** Reserva recursos para pago internacional (Payment Module).

**Consumidor:** RFQ API

**Response (v1.0):**

json  
{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Payment reservations will be available soon",  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

---

### 6.2.1.7 POST /v1/ape/payment/execute

**Status:** NOT_IMPLEMENTED (v2.0).

**Descripción:** Ejecuta/confirma un pago internacional (Payment Module).

**Consumidor:** RFQ API

**Response (v1.0):**

json  
{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Payment execution will be available soon",  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

---

### 6.2.1.8 POST /v1/ape/payment/revert

**Status:** NOT_IMPLEMENTED (v2.0).

**Descripción:** Revierte/cancela un pago internacional (Payment Module).

**Consumidor:** RFQ API

**Response (v1.0):**

json  
{  
 "error": "NOT_IMPLEMENTED",  
 "message": "Payment reversion will be available soon",  
}

**Códigos de respuesta:**

- **501 Not Implemented:** Funcionalidad no disponible.

---

### 6.2.1.9 GET /v1/ape/clients/{client_id}/exposure

**Descripción:** Obtiene la exposición actual del cliente (capital total en reservas activas).

**Nota importante:** APE solo conoce las reservas del cliente. El límite max_open_exposure está en Client Module, por lo tanto el cálculo del porcentaje de exposición (exposure_percentage) lo realiza el **RFQ API** consultando ambos servicios.

**Responsabilidad de APE:**

- Sumar reservas activas de todos los tipos de operación.
- En v1.0: Solo suma reservas de swap (FUNDS_RESERVE con status=RESERVED).
- En v2.0: Sumará reservas de swap \+ reservas de payment.

**Consumidor:** RFQ API

**Path Parameters:**

| Parámetro | Tipo   | Descripción               |
| :-------- | :----- | :------------------------ |
| client_id | string | Identificador del cliente |

**Proceso interno:**

1. Obtener configuración de exposición:
   - Cargar exposure.reference_asset desde configuración APE
   - Cargar exposure.exchange_rates desde configuración APE
2. Query para calcular exposición actual:  
   sql  
   SELECT  
    client_id,  
    base_asset,  
    SUM(amount) AS total_amount  
   FROM transactions t  
   JOIN lots l ON l.lot_id \= t.lot_id  
   WHERE t.client_id \= {client_id}  
    AND t.type \= 'FUNDS_RESERVE'  
    AND t.status \= 'RESERVED'  
    AND t.expires_at \> CURRENT_TIMESTAMP  
   GROUP BY t.client_id, l.base_asset;
3. Convertir cada grupo a moneda de exposición:

   Para cada fila retornada:
   - Obtener exchange_rate del base_asset a reference_asset desde configuración
   - Calcular: amount_equivalent \= total_amount \* exchange_rate
   - Acumular en current_open_exposure

4. Query para obtener detalle de reservas:  
   sql  
   SELECT  
    t.id AS reserve_tx_id,  
    t.reference_id AS pre_quote_id,  
    t.amount,  
    t.base_asset,  
    t.lot_id,  
    t.expires_at  
    EXTRACT(EPOCH FROM (t.expires_at \- CURRENT_TIMESTAMP))::INTEGER AS ttl_remaining_seconds  
   FROM transactions t  
   JOIN lots l ON l.lot_id \= t.lot_id  
   WHERE t.client_id \= {client_id}  
    AND t.type \= 'FUNDS_RESERVE'  
    AND t.status \= 'RESERVED'  
    AND t.expires_at \> CURRENT_TIMESTAMP  
   ORDER BY t.expires_at ASC  
   LIMIT 10;
5. Para cada reserva encontrada, calcular monto equivalente:
   - Obtener exchange_rate del base_asset a reference_asset desde configuración
   - Calcular: amount_equivalent \= amount \* exchange_rate
   - Agregar al objeto de respuesta

**Nota sobre conversiones:**

Las conversiones a la moneda de exposición se realizan usando las tasas configuradas en exposure.exchange_rates del APE Service. Si no existe tasa configurada para un base_asset, se usa 1.0 como valor por defecto.

**Response (v1.0):**

json

{  
 "client_id": "cli_001",  
 "current_open_exposure": 45000.00,  
 "exposure_currency": "USDC",  
 "active_reserves_count": 3,  
 "pending_reserves": \[  
 {  
 "reserve_tx_id": "tx_reserve_001",  
 "pre_quote_id": "pq_abc123",  
 "amount": 15000.00,  
 "base_asset": "USDC",  
 "amount_equivalent": 15000.00,  
 "lot_id": "lot_gps_ardua_01",  
 "expires_at": "2026-01-29T15:00:45-03:00",  
 "ttl_remaining_seconds": 18  
 },  
 {  
 "reserve_tx_id": "tx_reserve_005",  
 "pre_quote_id": "pq_xyz789",  
 "amount": 20000.00,  
 "base_asset": "USDT",  
 "amount_equivalent": 20000.00,  
 "lot_id": "lot_pps_binance_02",  
 "expires_at": "2026-01-29T15:01:12-03:00",  
 "ttl_remaining_seconds": 45  
 },  
 {  
 "reserve_tx_id": "tx_reserve_009",  
 "pre_quote_id": "pq_def456",  
 "amount": 10000.00,  
 "base_asset": "USD",  
 "amount_equivalet": 10000.00,  
 "lot_id": "lot_gps_ardua_01",  
 "expires_at": "2026-01-29T15:01:30-03:00",  
 "ttl_remaining_seconds": 63  
 }  
 \],  
 "calculated_at": "2026-01-29T15:00:27-03:00"  
}

**Response Schema:**

| Campo                                      | Tipo    | Descripción                                                                                 |
| :----------------------------------------- | :------ | :------------------------------------------------------------------------------------------ |
| client_id                                  | string  | Identificador del cliente                                                                   |
| current_open_exposure                      | numeric | Capital total en reservas activas expresado en exposure_currency.                           |
| exposure_currency                          | string  | Moneda de referencia para cálculo de exposición (configurada en APE/config/ape_config.yaml) |
| active_reserves_count                      | integer | Cantidad de reservas activas                                                                |
| pending_reserves                           | array   | Detalle de reservas activas (máximo 10 más próximas a expirar)                              |
| pending_reserves\[\].reserve_tx_id         | string  | ID de transacción FUNDS_RESERVE                                                             |
| pending_reserves\[\].pre_quote_id          | string  | ID de pre-quote asociada                                                                    |
| pending_reserves\[\].amount                | numeric | Monto reservado                                                                             |
| pending_reserves\[\].base_asset            | string  | Asset de la reserva (USDC, USDT, USD, etc)                                                  |
| pending_reserves\[\].amount_equivalent     | numeric | Monto convertido a exposure_currency                                                        |
| pending_reserves\[\].lot_id                | string  | Lote donde está la reserva                                                                  |
| pending_reserves\[\].expires_at            | string  | Timestamp de expiración (ISO 8601\)                                                         |
| pending_reserves\[\].ttl_remaining_seconds | integer | Segundos hasta expiración                                                                   |
| calculated_at                              | string  | Timestamp del cálculo (ISO 8601\)                                                           |

**Nota:** El RFQ API combina esta información con \`max_open_exposure\` del Client Module para validar límites antes de emitir pre-quotes.

**Códigos de respuesta:**

- **200 OK:** Exposición calculada exitosamente
- **404 Not Found:** Cliente no tiene reservas activas (retorna exposure \= 0\)
- **500 Internal Server Error:** Error de base de datos

**Response cuando no hay reservas:**

json

{  
 "client_id": "cli_001",  
 "current_open_exposure": 0,  
 "exposure_currency": "USDC",  
 "active_reserves_count": 0,  
 "pending_reserves": \[\],  
 "calculated_at": "2026-01-29T15:00:27-03:00"  
}

**Timeout:** 500ms (query optimizado con índice)

**Caché:** 2 segundos en Redis (key: client:exposure:{client_id})

**Nota de performance:**

Este endpoint está altamente optimizado. El índice idx_transactions_client_exposure permite que el query se ejecute en \<10ms incluso con millones de transacciones.

**Reglas de negocio aplicables:** RN-106 (Límite de exposición abierta por cliente)

---

### 6.2.1.10 POST /v1/ape/lots

**Descripción:** Crea un nuevo lote de liquidez.

**Consumidor:** Admin BFF

**Request:**

json  
{  
 "lot_id": "lot_custom_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1500.00,  
 "metadata": {  
 "limits": {  
 "max_capacity": 500000,  
 "max_single_allocation": 50000,  
 "daily_volume_limit": 2000000,  
 "retire_approval_threshold": 100000  
 },  
 "activation": {  
 "timezone": "America/Argentina/Buenos_Aires",  
 "holiday_calendar": "AR",  
 "weekly_windows": \[  
 {  
 "days": \["MON", "TUE", "WED", "THU", "FRI"\],  
 "start": "10:00",  
 "end": "18:00"  
 }  
 \],  
 "exclude_dates": \[\],  
 "include_dates": \[\],  
 "blackout_windows": \[\]  
 },  
 "pricing": {  
 "model": "COMPOSITE",  
 "inputs": {},  
 "feeds": \[\],  
 "formula": {}  
 }  
 }  
}

**Request Schema:**

| Campo       | Tipo    | Requerido   | Descripción                                                                   |
| :---------- | :------ | :---------- | :---------------------------------------------------------------------------- |
| lot_id      | string  | Sí          | Identificador único del lote                                                  |
| context     | string  | Sí          | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP"                                 |
| provider    | string  | Sí          | Proveedor (ARDUA, BINANCE, BYMA, BITSO)                                       |
| base_asset  | string  | Sí          | Divisa base (USDC, USDT, USD)                                                 |
| quote_asset | string  | Sí          | Divisa cotizada (ARS, BRL, etc)                                               |
| side        | string  | Sí          | "BUY" o "SELL"                                                                |
| price       | numeric | Condicional | Requerido si context=GLOBAL_PRICE_SETUP. NULL si context=PRICE_PROVIDER_SETUP |
| metadata    | object  | Sí          | Configuración del lote (limits, activation, pricing)                          |

**Proceso interno:**

1. Validar unicidad de lot_id
2. Validar combinación (base_asset, quote_asset, side, provider)
3. Si context=GLOBAL_PRICE_SETUP → Validar price IS NOT NULL
4. Si context=PRICE_PROVIDER_SETUP → Validar metadata.pricing está presente
5. BEGIN TRANSACTION
6. INSERT INTO lots (lot_id, context, provider, base_asset, quote_asset, side, price, status, metadata)
7. INSERT INTO snapshots (lot_id, available=0, reserved=0, executed=0, version=1)
8. COMMIT
9. Registrar auditoría

**Response:**

json  
{  
 "lot_id": "lot_custom_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1500.00,  
 "status": "SUSPENDED",  
 "snapshot": {  
 "available": 0,  
 "reserved": 0,  
 "executed": 0,  
 "version": 1  
 },  
 "created_at": "2026-01-29T15:00:00-03:00"  
}

**Response Schema:**

| Campo       | Tipo    | Descripción                                        |
| :---------- | :------ | :------------------------------------------------- |
| lot_id      | string  | Identificador del lote creado                      |
| context     | string  | Tipo de lote                                       |
| provider    | string  | Proveedor                                          |
| base_asset  | string  | Divisa base                                        |
| quote_asset | string  | Divisa cotizada                                    |
| side        | string  | Dirección                                          |
| price       | numeric | Precio base (null si PRICE_PROVIDER_SETUP)         |
| status      | string  | "SUSPENDED" (requiere fondeo inicial para activar) |
| snapshot    | object  | Estado inicial del lote                            |
| created_at  | string  | Timestamp de creación (ISO 8601\)                  |

**Códigos de respuesta:**

- **201 Created:** Lote creado exitosamente
- **400 Bad Request:** Validación fallida
- **409 Conflict:** lot_id ya existe o combinación (asset, side, provider) duplicada
- **500 Internal Server Error:** Error transaccional

**Errores:**

–---------------------------------------------------------------------

json  
{  
 "error": "LOT_ALREADY_EXISTS",  
 "message": "A lot with this ID already exists",  
 "details": {  
 "lot_id": "lot_custom_01"  
 }  
}  
–---------------------------------------------------------------------

json  
{  
 "error": "DUPLICATE_LOT_COMBINATION",  
 "message": "A lot with this asset/side/provider combination already exists",  
 "details": {  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "provider": "ARDUA",  
 "existing_lot_id": "lot_gps_ardua_01"  
 }  
}  
–---------------------------------------------------------------------

json  
{  
 "error": "PRICE_REQUIRED",  
 "message": "Price is required for GLOBAL_PRICE_SETUP context",  
 "details": {  
 "context": "GLOBAL_PRICE_SETUP",  
 "price_provided": null  
 }  
}  
–---------------------------------------------------------------------

json  
{  
 "error": "PRICING_CONFIG_REQUIRED",  
 "message": "Pricing configuration is required for PRICE_PROVIDER_SETUP context",  
 "details": {  
 "context": "PRICE_PROVIDER_SETUP",  
 "metadata.pricing": null  
 }

}

**Reglas de negocio aplicables:** RN-101 (Lote nace SUSPENDED, requiere fondeo para activar)

**Nota importante:**

Los lotes nuevos nacen con status SUSPENDED y snapshot en ceros. Requieren al menos una transacción FUNDS_IN exitosa antes de poder cambiar a ACTIVE (ver RF-100).

---

### 6.2.1.11 GET /v1/ape/lots

**Descripción:** Lista todos los lotes con filtros opcionales.

**Consumidor:** Admin BFF

**Query Parameters:**

| Parámetro   | Tipo    | Requerido | Descripción                                                   |
| :---------- | :------ | :-------- | :------------------------------------------------------------ |
| status      | string  | No        | Filtro por status (ACTIVE, SUSPENDED, CLOSED)                 |
| provider    | string  | No        | Filtro por provider (ARDUA, BINANCE, BYMA, BITSO)             |
| base_asset  | string  | No        | Filtro por base_asset                                         |
| quote_asset | string  | No        | Filtro por quote_asset                                        |
| context     | string  | No        | Filtro por context (GLOBAL_PRICE_SETUP, PRICE_PROVIDER_SETUP) |
| page        | integer | No        | Número de página (default: 1\)                                |
| per_page    | integer | No        | Items por página (default: 50, max: 100\)                     |

**Response:**

json

{  
 "lots": \[  
 {  
 "lot_id": "lot_gps_ardua_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1490.00,  
 "status": "ACTIVE",  
 "snapshot": {  
 "available": 50000.00,  
 "reserved": 10000.00,  
 "executed": 40000.00,  
 "utilization_rate": 50.0,  
 "version": 1524  
 },  
 "metadata": {  
 "limits": {  
 "max_capacity": 1000000,  
 "max_single_allocation": 50000,  
 "daily_volume_limit": 5000000,  
 "retire_approval_threshold": 100000  
 }  
 },  
 "created_at": "2026-01-15T10:00:00-03:00",  
 "updated_at": "2026-01-29T14:00:00-03:00"  
 },  
 {  
 "lot_id": "lot_pps_binance_02",  
 "context": "PRICE_PROVIDER_SETUP",  
 "provider": "BINANCE",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": null,  
 "status": "ACTIVE",  
 "snapshot": {  
 "available": 75000.00,  
 "reserved": 15000.00,  
 "executed": 10000.00,  
 "utilization_rate": 25.0,  
 "version": 892  
 },  
 "metadata": {  
 "limits": {  
 "max_capacity": 500000,  
 "max_single_allocation": 100000,  
 "daily_volume_limit": 3000000,  
 "retire_approval_threshold": 50000  
 },  
 "pricing": {  
 "model": "COMPOSITE",  
 "feeds": \[  
 {  
 "name": "USDT_ARS",  
 "symbol": "USDTARS",  
 "source": "orderbook",  
 "field": "best_ask"  
 }  
 \]  
 }  
 },  
 "created_at": "2026-01-20T11:00:00-03:00",  
 "updated_at": "2026-01-29T14:30:00-03:00"  
 }  
 \],  
 "pagination": {  
 "page": 1,  
 "per_page": 50,  
 "total_items": 12,  
 "total_pages": 1  
 }  
}

**Response Schema:**

| Campo                              | Tipo    | Descripción                                     |
| :--------------------------------- | :------ | :---------------------------------------------- |
| lots                               | array   | Lista de lotes                                  |
| lots\[\].lot_id                    | string  | Identificador del lote                          |
| lots\[\].context                   | string  | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP"   |
| lots\[\].provider                  | string  | Proveedor (ARDUA, BINANCE, etc)                 |
| lots\[\].base_asset                | string  | Divisa base                                     |
| lots\[\].quote_asset               | string  | Divisa cotizada                                 |
| lots\[\].side                      | string  | "BUY" o "SELL"                                  |
| lots\[\].price                     | numeric | Precio base (null para PRICE_PROVIDER_SETUP)    |
| lots\[\].status                    | string  | "ACTIVE", "SUSPENDED", "CLOSED"                 |
| lots\[\].snapshot                  | object  | Estado actual del lote                          |
| lots\[\].snapshot.available        | numeric | Capacidad disponible                            |
| lots\[\].snapshot.reserved         | numeric | Capacidad reservada (FUNDS_RESERVE en RESERVED) |
| lots\[\].snapshot.executed         | numeric | Capacidad ejecutada (FUNDS_RESERVE en EXECUTED) |
| lots\[\].snapshot.utilization_rate | numeric | Porcentaje de utilización                       |
| lots\[\].snapshot.version          | integer | Versión del snapshot                            |
| lots\[\].metadata                  | object  | Configuración del lote                          |
| lots\[\].created_at                | string  | Timestamp de creación                           |
| lots\[\].updated_at                | string  | Timestamp de actualización                      |
| pagination                         | object  | Información de paginación                       |

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **400 Bad Request:** Parámetros de query inválidos

---

### 6.2.1.12 GET /v1/ape/lots/{id}

**Descripción:** Detalle completo de un lote específico.

**Consumidor:** Admin BFF

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Response:**

json

{  
 "lot_id": "lot_gps_ardua_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1490.00,  
 "status": "ACTIVE",  
 "metadata": {  
 "limits": {  
 "max_capacity": 1000000,  
 "max_single_allocation": 50000,  
 "daily_volume_limit": 5000000,  
 "retire_approval_threshold": 100000  
 },  
 "activation": {  
 "timezone": "America/Argentina/Buenos_Aires",  
 "holiday_calendar": "AR",  
 "weekly_windows": \[  
 {  
 "days": \["MON", "TUE", "WED", "THU", "FRI"\],  
 "start": "10:00",  
 "end": "18:00"  
 }  
 \],  
 "exclude_dates": \["2026-02-12"\],  
 "include_dates": \[\],  
 "blackout_windows": \[  
 {  
 "start": "2026-03-01T00:00:00-03:00",  
 "end": "2026-03-01T06:00:00-03:00",  
 "reason": "Maintenance"  
 }  
 \]  
 }  
 },  
 "snapshot": {  
 "available": 50000.00,  
 "reserved": 10000.00,  
 "executed": 40000.00,  
 "version": 1524,  
 "updated_at": "2026-01-29T14:00:00-03:00"  
 },  
 "calculated_metrics": {  
 "fondeo_total": 100000.00,  
 "utilization_rate": 50.0,  
 "daily_volume_today": 150000.00,  
 "daily_volume_usage_pct": 3.0  
 },  
 "created_at": "2026-01-15T10:00:00-03:00",  
 "updated_at": "2026-01-29T14:00:00-03:00"  
}

**Response Schema:**

| Campo                                     | Tipo    | Descripción                            |
| :---------------------------------------- | :------ | :------------------------------------- |
| lot_id                                    | string  | Identificador del lote                 |
| context                                   | string  | Tipo de lote                           |
| provider                                  | string  | Proveedor                              |
| base_asset                                | string  | Divisa base                            |
| quote_asset                               | string  | Divisa cotizada                        |
| side                                      | string  | Dirección                              |
| price                                     | numeric | Precio base                            |
| status                                    | string  | Status actual                          |
| metadata                                  | object  | Configuración completa                 |
| snapshot                                  | object  | Estado actual del stock                |
| calculated_metrics                        | object  | Métricas calculadas                    |
| calculated_metrics.fondeo_total           | numeric | Total fondeado (FUNDS_IN \- FUNDS_OUT) |
| calculated_metrics.utilization_rate       | numeric | % de capacidad comprometida            |
| calculated_metrics.daily_volume_today     | numeric | Volumen operado hoy                    |
| calculated_metrics.daily_volume_usage_pct | numeric | % del límite diario usado              |
| created_at                                | string  | Timestamp de creación                  |
| updated_at                                | string  | Timestamp de actualización             |

**Códigos de respuesta:**

- **200 OK:** Detalle retornado exitosamente
- **404 Not Found:** Lote no encontrado

---

### 6.2.1.13 POST /v1/ape/lots/{id}/fund

**Descripción:** Registra entrada de fondos en un lote (transacción FUNDS_IN).

**Consumidor:** Admin BFF

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "amount": 100000.00,  
 "external_reference": "0x1234abcd...",  
 "reason": "Initial funding for trading day",  
 "operator_id": "trader_john"  
}

**Request Schema:**

| Campo              | Tipo    | Requerido | Descripción                                 |
| :----------------- | :------ | :-------- | :------------------------------------------ |
| amount             | numeric | Sí        | Monto a fondear (en base_asset)             |
| external_reference | string  | Sí        | Hash de tx blockchain o referencia bancaria |
| reason             | string  | No        | Motivo del fondeo                           |
| operator_id        | string  | Sí        | Usuario que ejecuta el fondeo               |

**Proceso interno:**

1. Validar amount \> 0
2. Calcular fondeo_total actual (SUM de FUNDS_IN \- SUM de FUNDS_OUT)
3. Validar fondeo_total \+ amount \<= metadata.limits.max_capacity
4. BEGIN TRANSACTION
5. INSERT transaction (tipo=FUNDS_IN, status=SETTLED, is_immutable=TRUE, became_immutable_at=NOW(), operator_id, external_reference, reason)
6. SELECT snapshot WHERE lot_id \= id FOR UPDATE NOWAIT
7. UPDATE snapshot SET available \= available \+ amount, version \= version \+ 1
8. Registrar applied_version en transaction
9. COMMIT

**Response:**

json

{  
 "transaction_id": "tx_add_001",  
 "lot_id": "lot_gps_ardua_01",  
 "type": "FUNDS_IN",  
 "amount": 100000.00,  
 "new_available": 150000.00,  
 "new_fondeo_total": 200000.00,  
 "snapshot_version": 1525,  
 "operator_id": "trader_john",  
 "cerated_at": "2026-01-29T15:00:00-03:00"  
}

**Response Schema:**

| Campo            | Tipo    | Descripción                          |
| :--------------- | :------ | :----------------------------------- |
| transaction_id   | string  | ID de transacción creada             |
| lot_id           | string  | ID del lote                          |
| type             | string  | "FUNDS_IN"                           |
| amount           | numeric | Monto fondeado                       |
| new_available    | numeric | Nuevo balance disponible             |
| new_fondeo_total | numeric | Nuevo total fondeado                 |
| snapshot_version | integer | Versión del snapshot después del ADD |
| operator_id      | string  | Usuario que ejecutó                  |
| created_at       | string  | Timestamp de creacion                |

**Códigos de respuesta:**

- **200 OK:** Fondeo exitoso
- **400 Bad Request:** Validación fallida (amount \<= 0, external_reference vacío)
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** Excede max_capacity

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "EXCEED_MAX_CAPACITY",  
 "message": "Funding would exceed lot's maximum capacity",  
 "details": {  
 "lot_id": "lot_gps_ardua_01",  
 "current_fondeo": 900000.00,  
 "requested_amount": 200000.00,  
 "max_capacity": 1000000.00,  
 "max_you_can_add": 100000.00  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "INVALID_AMOUNT",  
 "message": "Amount must be greater than zero",  
 "details": {  
 "provided_amount": \-1000.00  
 }  
}  
–---------------------------------------------------------------------

**Reglas de negocio aplicables:** RN-101 (Fondeo inicial obligatorio), RN-104 (Límite de exposición), RN-014 (Optimistic reserving)

---

### 6.2.1.14 POST /v1/ape/lots/{id}/retire

**Descripción:** Registra salida de fondos de un lote (transacción FUNDS_OUT).

**Consumidor:** Admin BFF

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "amount": 50000.00,  
 "reason": "End-of-day rebalancing \- excess capacity",  
 "operator_id": "trader_john",  
 "approved_by": "supervisor_alice"  
}

**Request Schema:**

| Campo       | Tipo    | Requerido   | Descripción                                      |
| :---------- | :------ | :---------- | :----------------------------------------------- |
| amount      | numeric | Sí          | Monto a retirar (en base_asset)                  |
| reason      | string  | Sí          | Motivo del retiro (min 10 caracteres)            |
| operator_id | string  | Sí          | Usuario que ejecuta el retiro                    |
| approved_by | string  | Condicional | Requerido si amount \> retire_approval_threshold |

**Proceso interno:**

1. Validar amount \> 0
2. SELECT snapshot WHERE lot_id \= id
3. Validar amount \<= snapshot.available
4. Validar reason IS NOT NULL AND length(reason) \>= 10
5. Obtener retire_approval_threshold de metadata.limits
6. Si amount \> retire_approval_threshold:
   - Validar approved_by IS NOT NULL
   - Validar approved_by tiene rol MESA_SUPERVISOR (verificar con Admin BFF)
7. BEGIN TRANSACTION
8. INSERT transaction (tipo=FUNDS_OUT, status=SETTLED, is_immutable=TRUE, became_immutable_at=NOW(), operator_id, reason, approved_by)
9. SELECT snapshot WHERE lot_id \= id FOR UPDATE NOWAIT
10. UPDATE snapshot SET available \= available \- amount, version \= version \+ 1
11. Registrar applied_version en transaction
12. COMMIT

**Response:**

json

{  
 "transaction_id": "tx_ret_001",  
 "lot_id": "lot_gps_ardua_01",  
 "type": "FUNDS_OUT",  
 "amount": 50000.00,  
 "new_available": 100000.00,  
 "new_fondeo_total": 150000.00,  
 "snapshot_version": 1526,  
 "operator_id": "trader_john",  
 "requires_approval": true,  
 "approved_by": "supervisor_alice",  
 "is_immutable": true,  
 "created_at": "2026-01-29T15:00:00-03:00"  
}

**Response Schema:**

| Campo             | Tipo    | Descripción                             |
| :---------------- | :------ | :-------------------------------------- |
| transaction_id    | string  | ID de transacción creada                |
| lot_id            | string  | ID del lote                             |
| type              | string  | "FUNDS_OUT"                             |
| amount            | numeric | Monto retirado                          |
| new_available     | numeric | Nuevo balance disponible                |
| new_fondeo_total  | numeric | Nuevo total fondeado                    |
| snapshot_version  | integer | Versión del snapshot después del RETIRE |
| operator_id       | string  | Usuario que ejecutó                     |
| requires_approval | boolean | Si requirió aprobación de supervisor    |
| approved_by       | string  | Supervisor que aprobó (si aplica)       |
| is_immutable      | boolean | true (inmutable desde creación)         |
| created_at        | string  | Timestamp de creacion                   |

**Códigos de respuesta:**

- **200 OK:** Retiro exitoso
- **400 Bad Request:** Validación fallida
- **403 Forbidden:** Aprobación de supervisor requerida
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** Insufficient available

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "INSUFFICIENT_AVAILABLE",  
 "message": "Lot has insufficient available balance for retirement",  
 "details": {  
 "lot_id": "lot_gps_ardua_01",  
 "requested_amount": 60000.00,  
 "available": 50000.00,  
 "reserved": 10000.00,  
 "max_you_can_retire": 50000.00  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "APPROVAL_REQUIRED",  
 "message": "Amount exceeds threshold, supervisor approval required",  
 "details": {  
 "requested_amount": 150000.00,  
 "retire_approval_threshold": 100000.00,  
 "approved_by_provided": false  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "INVALID_REASON",  
 "message": "Reason must be at least 10 characters",  
 "details": {  
 "provided_reason": "rebalance",  
 "min_length": 10  
 }  
}  
–---------------------------------------------------------------------

**Reglas de negocio aplicables:** RN-100 (Restricción de retiro), RN-105 (Aprobación de retiros grandes), RN-014 (Optimistic reserving)

---

### 6.2.1.15 PATCH /v1/ape/lots/{id}/status

**Descripción:** Cambia el status de un lote (ACTIVE ↔ SUSPENDED ↔ CLOSED).

**Consumidor:** Admin BFF

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "status": "SUSPENDED",  
 "reason": "End-of-day maintenance",  
 "operator_id": "trader_john"  
}

**Request Schema:**

| Campo       | Tipo   | Requerido | Descripción                                    |
| :---------- | :----- | :-------- | :--------------------------------------------- |
| status      | string | Sí        | Nuevo status ("ACTIVE", "SUSPENDED", "CLOSED") |
| reason      | string | Sí        | Motivo del cambio                              |
| operator_id | string | Sí        | Usuario que ejecuta el cambio                  |

**Proceso interno:**

1. SELECT lot WHERE lot_id \= id
2. Validar transición de status permitida:
   - ACTIVE → SUSPENDED ✓
   - SUSPENDED → ACTIVE ✓
   - SUSPENDED → CLOSED ✓ (solo si snapshot.reserved \= 0\)
   - CLOSED → cualquier ✗ (no se puede reabrir)
3. Si nuevo status \= CLOSED:
   - SELECT snapshot WHERE lot_id \= id
   - Validar snapshot.reserved \= 0
4. UPDATE lot SET status \= nuevo_status, updated_at \= NOW()
5. Registrar en audit log

**Response:**

json

{  
 "lot_id": "lot_gps_ardua_01",  
 "old_status": "ACTIVE",  
 "new_status": "SUSPENDED",  
 "reason": "End-of-day maintenance",  
 "operator_id": "trader_john",  
 "updated_at": "2026-01-29T18:00:00-03:00"  
}

**Response Schema:**

| Campo       | Tipo   | Descripción                |
| :---------- | :----- | :------------------------- |
| lot_id      | string | ID del lote                |
| old_status  | string | Status anterior            |
| new_status  | string | Nuevo status               |
| reason      | string | Motivo del cambio          |
| operator_id | string | Usuario que ejecutó        |
| updated_at  | string | Timestamp de actualización |

**Códigos de respuesta:**

- **200 OK:** Status cambiado exitosamente
- **400 Bad Request:** Transición no permitida
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** No se puede cerrar lote con FUNDS_RESERVEs activos

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "INVALID_STATUS_TRANSITION",  
 "message": "Cannot transition from CLOSED to any other status",  
 "details": {  
 "current_status": "CLOSED",  
 "requested_status": "ACTIVE"  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "ACTIVE_FUNDS_RESERVES_EXIST",  
 "message": "Cannot close lot with active reserves",  
 "details": {  
 "lot_id": "lot_gps_ardua_01",  
 "reserved_balance": 10000.00,  
 "active_reserves_count": 5  
 }  
}  
–---------------------------------------------------------------------

**Reglas de negocio aplicables:** RN-103 (Cierre con FUNDS_RESERVEs activos)

---

### 6.2.1.16 GET /v1/ape/transactions

**Descripción:** Lista transacciones con filtros opcionales.

**Nota:** Este endpoint es común a ambos módulos (Swap y Payment).

- **En v1.0:** Solo retorna transacciones del Swap Module (FUNDS_IN, FUNDS_OUT, FUNDS_RESERVE)
- **En v2.0:** Retornará transacciones de Swap Module \+ Payment Module

**Consumidor:** Admin BFF

**Query Parameters:**

| Parámetro      | Tipo    | Requerido | Descripción                                               |
| :------------- | :------ | :-------- | :-------------------------------------------------------- |
| lot_id         | string  | No        | Filtro por lote                                           |
| type           | string  | No        | Filtro por tipo (FUNDS_IN, FUNDS_OUT, FUNDS_RESERVE)      |
| status         | string  | No        | Filtro por status (SETTLED, RESERVED, REVERTED, EXECUTED) |
| from_date      | string  | No        | Fecha desde (ISO 8601\)                                   |
| to_date        | string  | No        | Fecha hasta (ISO 8601\)                                   |
| operator_id    | string  | No        | Filtro por operador (solo para ADD/RETIRE)                |
| reference_type | string  | No        | Filtro por tipo de referencia (PREQUOTE, MANUAL)          |
| reference_id   | string  | No        | Filtro por ID de referencia                               |
| page           | integer | No        | Número de página (default: 1\)                            |
| per_page       | integer | No        | Items por página (default: 100, max: 200\)                |

**Response:**

json  
{  
 "transactions": \[  
 {  
 "id": "tx_fundin_001",  
 "lot_id": "lot_gps_ardua_01",  
 "type": "FUNDS_IN",  
 "amount": 100000.00,  
 "status": "SETTLED",  
 "reference_type": "MANUAL",  
 "reference_id": null,  
 "expires_at": null,  
 "applied_version": 1525,  
 "operator_id": "trader_john",  
 "reason": "Initial funding for trading day",  
 "external_reference": "0x1234abcd...",  
 "approved_by": null,  
 "is_immutable": true,  
 "became_immutable_at": "2026-01-29T10:00:01-03:00",  
 "created_at": "2026-01-29T10:00:00-03:00"  
 },  
 {  
 "id": "tx_reserve_001",  
 "lot_id": "lot_gps_ardua_01",  
 "type": "FUNDS_RESERVE",  
 "amount": 5000.00,  
 "status": "EXECUTED",  
 "reference_type": "PREQUOTE",  
 "reference_id": "pq_abc123",  
 "expires_at": "2026-01-29T15:00:45-03:00",  
 "applied_version": 1526,  
 "operator_id": null,  
 "reason": null,  
 "external_reference": null,  
 "approved_by": null,  
 "is_immutable": true,  
 "became_immutable_at": "2026-01-29T15:00:25-03:00",  
 "created_at": "2026-01-29T15:00:15-03:00"  
 }  
 \],  
 "pagination": {  
 "page": 1,  
 "per_page": 100,  
 "total_items": 1523,  
 "total_pages": 16  
 }  
}

**Códigos de respuesta:**

**Response Schema:**

| Campo                               | Tipo    | Descripción                                   |
| :---------------------------------- | :------ | :-------------------------------------------- |
| transactions                        | array   | Lista de transacciones                        |
| transactions\[\].id                 | string  | ID de transacción                             |
| transactions\[\].lot_id             | string  | ID del lote                                   |
| transactions\[\].type               | string  | Tipo de transacción                           |
| transactions\[\].amount             | numeric | Monto                                         |
| transactions\[\].status             | string  | Status                                        |
| transactions\[\].reference_type     | string  | Tipo de referencia                            |
| transactions\[\].reference_id       | string  | ID de referencia                              |
| transactions\[\].expires_at         | string  | Timestamp de expiración (solo FUNDS_RESERVE)  |
| transactions\[\].applied_version    | integer | Versión del snapshot después de aplicar       |
| transactions\[\].operator_id        | string  | Usuario operador (FUNDS_IN/FUNDS_OUT)         |
| transactions\[\].reason             | string  | Motivo (FUNDS_IN/FUNDS_OUT)                   |
| transactions\[\].external_reference | string  | Referencia externa (FUNDS_IN)                 |
| transactions\[\].approved_by        | string  | Aprobador (FUNDS_OUT)                         |
| is_immutable                        | boolean | Transaccion inmutable                         |
| became_immutable_at                 |         | Timestamp de cuando se convirtió en inmutable |
| transactions\[\].created_at         | string  | Timestamp de creación                         |
| pagination                          | object  | Información de paginación                     |

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **400 Bad Request:** Parámetros de query inválidos

---

### 6.2.1.17 GET /v1/ape/config

**Descripción:** Retorna la configuración completa del servicio APE, incluyendo estrategias de selección de lotes, configuración de pricing, jobs automáticos y price providers.

**Consumidor:** RFQ API, Admin Panel

**Autenticación:** Requerida (Bearer token interno)

**Rate limit:** Excluido de rate limiting

**Headers requeridos:**

- Authorization: Bearer \<internal_service_token\>

**Response: 200 OK**

json  
{  
 "lots": {  
 "selection": {  
 "ordering": "precedence_asc",  
 "max_lots_per_allocation": 10  
 },  
 "eligibility": {  
 "respect_blackout_windows": true,  
 "respect_exclude_dates": true,  
 "respect_holiday_calendar": true,  
 "respect_weekly_windows": true,  
 "min_available_threshold": {  
 "USDC": 1000, "USDT": 1000, "USD": 5000, "ARS": 1500000, "default": 1000 }  
 }  
 },  
 "pricing": {  
 "reference_price": {  
 "provider": "tradingview",  
 "tolerance_percentage": 2.0,  
 "cache_ttl_seconds": 60,  
 "timeout_ms": 1000  
 },  
 "bps_application": "per_allocation",  
 "precedence": \["CLIENT", "GROUP", "GENERAL"\]  
 },  
 "allocations": {  
 "distribution_strategy": "waterfall",  
 "allow_partial_coverage": true,  
 "min_allocation_amount": 1000  
 },  
 "reserves": {  
 "reserve_ttl_seconds": 30,  
 "reserve_extension_seconds": 30,  
 "max_reserve_retries": 3  
 },  
 "jobs": {  
 "expiration": {  
 "interval_seconds": 5,  
 "batch_size": 100,  
 "enabled": true  
 },  
 "snapshot_cleanup": {  
 "interval_seconds": 300,  
 "retention_days": 90,  
 "enabled": true  
 }  
 },  
 "price_providers": {  
 "binance": {  
 "enabled": true,  
 "timeout_ms": 1000,  
 "cache_ttl_seconds": 5,  
 "circuit_breaker": {  
 "failure_threshold": 3,  
 "cooldown_seconds": 60  
 }  
 },  
 "byma": {  
 "enabled": true,  
 "timeout_ms": 1000,  
 "cache_ttl_seconds": 5,  
 "operating_hours": {  
 "timezone": "America/Argentina/Buenos_Aires",  
 "days": \["MON", "TUE", "WED", "THU", "FRI"\],  
 "start": "11:00",  
 "end": "17:00"  
 },  
 "circuit_breaker": {  
 "failure_threshold": 3,  
 "cooldown_seconds": 60  
 }  
 },  
 "bitso": {  
 "enabled": true,  
 "timeout_ms": 1000,  
 "cache_ttl_seconds": 5,  
 "circuit_breaker": {  
 "failure_threshold": 3,  
 "cooldown_seconds": 60  
 }  
 }  
 }

}

**Response Schema:**

| Campo                                            | Tipo    | Descripción                                                          |
| :----------------------------------------------- | :------ | :------------------------------------------------------------------- |
| lots.selection.ordering                          | string  | Orden de selección: "precedence_asc"                                 |
| lots.selection.max_lots_per_allocation           | integer | Máximo de lotes por allocation                                       |
| lots.eligibility                                 | object  | Reglas de elegibilidad temporal                                      |
| lots.eligibility.min_available_threshold         | object  | Threshold de disponibilidad mínima por asset                         |
| lots.eligibility.min_available_threshold.{ASSET} | numeric | Mínimo disponible para que lote sea elegible (en unidades del asset) |
| lots.eligibility.min_available_threshold.default | numeric | Fallback para assets no configurados explícitamente                  |
| pricing.reference_price.provider                 | string  | Proveedor de precio de referencia                                    |
| pricing.reference_price.tolerance_percentage     | numeric | % tolerancia vs mercado                                              |
| pricing.bps_application                          | string  | Aplicación de BPS: "per_allocation"                                  |
| pricing.precedence                               | array   | Orden: CLIENT → GROUP → GENERAL                                      |
| allocations.distribution_strategy                | string  | Estrategia: "waterfall"                                              |
| allocations.allow_partial_coverage               | boolean | Permite coberturas parciales                                         |
| reserves.reserve_ttl_seconds                     | integer | TTL de reserves                                                      |
| jobs.expiration                                  | object  | Config del job de expiración                                         |
| jobs.snapshot_cleanup                            | object  | Config de limpieza de snapshots                                      |
| price_providers                                  | object  | Configuración por provider                                           |

**Códigos de respuesta:**

- **200 OK:** Configuración retornada exitosamente
- **401 Unauthorized:** Token inválido
- **503 Service Unavailable:** Servicio no disponible

**Notas:**

- Solo accesible con token interno (RFQ API y Admin Panel)
- NO exponer públicamente \- contiene información sensible
- Los valores son configurables vía variables de entorno y config/ape_config.yaml
- Invariante: grace_period_seconds \>= (expiration.interval_seconds \+ 1\)

---

### 6.2.1.18 GET /v1/ape/health

**Descripción:** Health check endpoint para monitoreo de disponibilidad del servicio APE.

**Consumidor:** Load balancers, sistemas de monitoreo, orquestadores (Kubernetes)

**Autenticación:** No requerida (expuesto para health checks)

**Response: 200 OK**

json

{  
 "status": "healthy",  
 "timestamp": "2026-01-29T15:00:00-03:00",  
 "version": "1.0.0",  
 "service": "ape-gateway",  
 "dependencies": {  
 "database": {  
 "status": "healthy",  
 "latency_ms": 5,  
 "connection_pool_active": 8,  
 "connection_pool_idle": 12  
 },  
 "redis": {  
 "status": "healthy",  
 "latency_ms": 2  
 },  
 "price_providers": {  
 "binance": {  
 "status": "healthy",  
 "latency_ms": 120  
 },  
 "byma": {  
 "status": "healthy",  
 "latency_ms": 85  
 },  
 "bitso": {  
 "status": "healthy",  
 "latency_ms": 95  
 }  
 }  
 }  
}

**Response Schema:**

| Campo                                           | Tipo    | Descripción                                  |
| :---------------------------------------------- | :------ | :------------------------------------------- |
| status                                          | string  | Estado del servicio: "healthy" o "unhealthy" |
| timestamp                                       | string  | Timestamp de la respuesta (ISO 8601\)        |
| version                                         | string  | Versión del servicio APE                     |
| service                                         | string  | Nombre del servicio: "ape-gateway"           |
| dependencies                                    | object  | Estado de dependencias externas              |
| dependencies.database                           | object  | Estado de conexión a base de datos           |
| dependencies.database.status                    | string  | "healthy" o "unhealthy"                      |
| dependencies.database.latency_ms                | integer | Latencia en milisegundos                     |
| dependencies.database.connection_pool_active    | integer | Conexiones activas                           |
| dependencies.database.connection_pool_idle      | integer | Conexiones idle                              |
| dependencies.redis                              | object  | Estado de conexión a Redis                   |
| dependencies.redis.status                       | string  | "healthy" o "unhealthy"                      |
| dependencies.redis.latency_ms                   | integer | Latencia en milisegundos                     |
| dependencies.price_providers                    | object  | Estado de price providers externos           |
| dependencies.price_providers.binance            | object  | Estado de Binance API                        |
| dependencies.price_providers.binance.status     | string  | "healthy" o "unhealthy"                      |
| dependencies.price_providers.binance.latency_ms | integer | Latencia en milisegundos                     |
| dependencies.price_providers.byma               | object  | Estado de BYMA API                           |
| dependencies.price_providers.byma.status        | string  | healthy" o "unhealthy"                       |
| dependencies.price_providers.byma.latency_ms    | integer | Latencia en milisegundos                     |
| dependencies.price_providers.bitso              | object  | Estado de Bitso API                          |
| dependencies.price_providers.bitso.status       | string  | "healthy" o "unhealthy"                      |
| dependencies.price_providers.bitso.latency_ms   | integer | Latencia en milisegundos                     |

**Códigos de respuesta:**

- **200 OK:** Configuración retornada exitosamente
- **503 Service Unavailable:** Servicio no disponible

**Notas:**

- Solo para uso interno y debugging
- No exponer públicamente
- Contiene información sensible sobre estrategia de pricing

---

### 6.2.1.19 GET /v1/ape/metrics

**Descripción:** Métricas Prometheus para monitoreo.

**Exposición:** Interna (solo accesible por Prometheus scraper)

**Formato de respuesta:** Texto plano en formato Prometheus

**Ejemplo de métricas expuestas:**

\# HELP lot_available_balance Available balance in lot  
\# TYPE lot_available_balance gauge

- lot_available_balance{lot_id="lot_gps_ardua_01",provider="ARDUA",asset="USDC"} 50000.00

\# HELP lot_reserved_balance reserved balance in lot  
\# TYPE lot_reserved_balance gauge

- lot_reserved_balance{lot_id="lot_gps_ardua_01",provider="ARDUA",asset="USDC"} 10000.00

\# HELP lot_executed_balance Executed balance in lot  
\# TYPE lot_executed_balance gauge

- lot_executed_balance{lot_id="lot_gps_ardua_01",provider="ARDUA",asset="USDC"} 40000.00

\# HELP lot_utilization_rate Utilization rate of lot  
\# TYPE lot_utilization_rate gauge

- lot_utilization_rate{lot_id="lot_gps_ardua_01"} 50.0

\# HELP funding_operations_total Total funding operations  
\# TYPE funding_operations_total counter

- funding_operations_total{type="FUNDS_IN",lot_id="lot_gps_ardua_01",operator="trader_john"} 15
- funding_operations_total{type="FUNDS_OUT",lot_id="lot_gps_ardua_01",operator="trader_john"} 5

\# HELP price_provider_latency_seconds Price provider API latency  
\# TYPE price_provider_latency_seconds histogram

- price_provider_latency_seconds_bucket{provider="BINANCE",le="0.1"} 450
- price_provider_latency_seconds_bucket{provider="BINANCE",le="0.5"} 520
- price_provider_latency_seconds_sum{provider="BINANCE"} 82.5
- price_provider_latency_seconds_count{provider="BINANCE"} 523

\# HELP expiration_job_reserves_processed Total reserves processed by expiration job  
\# TYPE expiration_job_reserves_processed counter

- expiration_job_reserves_processed{component="ape"} 2341

**Consumidor:** Prometheus (scraping cada 15 segundos)

**Configuración de Prometheus:**

yaml

scrape_configs:  
 \- job_name: 'ape-service'  
 scrape_interval: 15s  
 static_configs:  
 \- targets: \['ape-service:8080'\]  
 metrics_path: '/v1/ape/metrics'

**Visualización:** Grafana (conectado a Prometheus como datasource)

---

## 6.3 Servicio: Admin BFF

**Nombre:** admin-api

**Responsabilidades:**

- Exponer endpoints de gestión para Mesa de Trading
- Validar permisos de rol (MESA_TRADER, MESA_SUPERVISOR)
- Delegar operaciones a APE Service
- Integrar con Client Module para configuración de BPS y grupos
- Aplicar lógica de autorización por threshold

**Exposición:** Privada (solo accesible desde Admin Panel, red interna o VPN)

**Dependencias:**

- APE Service (llamadas internas directas)
- Client Module (HTTP, para gestión de BPS)
- Auth Service (validación de JWT con roles)

**Autenticación y Autorización:**

- **Autenticación:** JWT Bearer Token en header Authorization: Bearer {token}
- **Roles soportados:**
  - MESA_TRADER: Acceso básico (view, fund, retire \< threshold, suspend)
  - MESA_SUPERVISOR: Acceso completo (create, close, retire sin límite, configuración)
- **Validación:** Cada endpoint valida roles requeridos antes de delegar a servicios internos

---

### 6.3.1 Endpoints

| Método | Path                           | Descripción                | Roles Requeridos                               |
| :----- | :----------------------------- | :------------------------- | :--------------------------------------------- |
| GET    | /v1/admin/lots                 | Listar lotes               | MESA_TRADER, MESA_SUPERVISOR                   |
| GET    | /v1/admin/lots/{id}            | Detalle de lote            | MESA_TRADER, MESA_SUPERVISOR                   |
| POST   | /v1/admin/lots                 | Crear lote                 | MESA_SUPERVISOR                                |
| PATCH  | /v1/admin/lots/{id}/status     | Cambiar status             | MESA_SUPERVISOR (CLOSE), MESA_TRADER (SUSPEND) |
| POST   | /v1/admin/lots/{id}/fund       | Fondear lote (ADD)         | MESA_TRADER, MESA_SUPERVISOR                   |
| POST   | /v1/admin/lots/{id}/retire     | Retirar fondos (RETIRE)    | MESA_TRADER (\< threshold), MESA_SUPERVISOR    |
| GET    | /v1/admin/transactions         | Historial de transacciones | MESA_TRADER, MESA_SUPERVISOR                   |
| GET    | /v1/admin/clients/{id}/pricing | Ver BPS del cliente        | MESA_TRADER, MESA_SUPERVISOR                   |
| PATCH  | /v1/admin/clients/{id}/pricing | Configurar BPS del cliente | MESA_TRADER, MESA_SUPERVISOR                   |
| GET    | /v1/admin/groups               | Listar grupos de clientes  | MESA_TRADER, MESA_SUPERVISOR                   |
| POST   | /v1/admin/groups               | Crear grupo                | MESA_SUPERVISOR                                |
| PATCH  | /v1/admin/groups/{id}          | Editar grupo               | MESA_SUPERVISOR                                |
| GET    | /v1/admin/health               | Health check               | \-                                             |
| GET    | /v1/admin/metrics              | Métricas Prometheus        | \-                                             |

---

### 6.3.1.1 GET /v1/admin/lots

**Descripción:** Lista todos los lotes con filtros opcionales (Proxy request a APE → GET /v1/ape/lots).

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Query Parameters:**

| Parámetro   | Tipo    | Requerido | Descripción                                                   |
| :---------- | :------ | :-------- | :------------------------------------------------------------ |
| status      | string  | No        | Filtro por status (ACTIVE, SUSPENDED, CLOSED)                 |
| provider    | string  | No        | Filtro por provider (ARDUA, BINANCE, BYMA, BITSO)             |
| base_asset  | string  | No        | Filtro por base_asset                                         |
| quote_asset | string  | No        | Filtro por quote_asset                                        |
| context     | string  | No        | Filtro por context (GLOBAL_PRICE_SETUP, PRICE_PROVIDER_SETUP) |
| page        | integer | No        | Número de página (default: 1\)                                |
| per_page    | integer | No        | Items por página (default: 50, max: 100\)                     |

**Proceso interno:**

1. Validar JWT y extraer roles
2. Verificar rol MESA_TRADER o MESA_SUPERVISOR
3. Proxy request a APE → GET /v1/ape/lots con mismos parámetros
4. Retornar response de APE sin modificaciones

**Response:**

Mismo formato que APE GET /v1/ape/lots (ver sección 6.2.5)

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **400 Bad Request:** Parámetros de query inválidos
- **401 Unauthorized:** JWT inválido o ausente
- **403 Forbidden:** Usuario sin rol requerido

**Errores específicos de autorización:**

–---------------------------------------------------------------------

json

{  
 "error": "INSUFFICIENT_PERMISSIONS",  
 "message": "User does not have required role",  
 "details": {  
 "required_roles": \["MESA_TRADER", "MESA_SUPERVISOR"\],  
 "user_roles": \["VIEWER"\]  
 }  
}

---

### 6.3.1.2 GET /v1/admin/lots/{id}

**Descripción:** Detalle completo de un lote específico (proxy a APE).

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Proceso interno:**

1. Validar JWT y roles
2. Proxy request a APE → GET /v1/ape/lots/{id}
3. Retornar response de APE

**Response:**

Mismo formato que APE GET /v1/ape/lots/{id} (ver sección 6.2.6)

**Códigos de respuesta:**

- **200 OK:** Detalle retornado exitosamente
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos
- **404 Not Found:** Lote no encontrado

---

### 6.3.1.3 POST /v1/admin/lots

**Descripción:** Crear un nuevo lote.

**Roles requeridos:** MESA_SUPERVISOR

**Request:**

json

{  
 "lot_id": "lot_custom_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1500.00,  
 "metadata": {  
 "limits": {  
 "max_capacity": 500000,  
 "max_single_allocation": 50000,  
 "daily_volume_limit": 2000000,  
 "retire_approval_threshold": 100000  
 },  
 "activation": {  
 "timezone": "America/Argentina/Buenos_Aires",  
 "holiday_calendar": "AR",  
 "weekly_windows": \[  
 {  
 "days": \["MON", "TUE", "WED", "THU", "FRI"\],  
 "start": "10:00",  
 "end": "18:00"  
 }  
 \],  
 "exclude_dates": \[\],  
 "include_dates": \[\],  
 "blackout_windows": \[\]  
 }  
 }  
}

**Request Schema:**

| Campo       | Tipo    | Requerido   | Descripción                                   |
| :---------- | :------ | :---------- | :-------------------------------------------- |
| lot_id      | string  | Sí          | Identificador único del lote                  |
| context     | string  | Sí          | "GLOBAL_PRICE_SETUP" o "PRICE_PROVIDER_SETUP" |
| provider    | string  | Sí          | Proveedor (ARDUA, BINANCE, BYMA, BITSO)       |
| base_asset  | string  | Sí          | Divisa base                                   |
| quote_asset | string  | Sí          | Divisa cotizada                               |
| side        | string  | Sí          | "BUY" o "SELL"                                |
| price       | numeric | Condicional | Requerido si context=GLOBAL_PRICE_SETUP       |
| metadata    | object  | Sí          | Configuración del lote                        |

**Proceso interno:**

1. Validar JWT y verificar rol MESA_SUPERVISOR
2. Validar schema del request
3. Si context=GLOBAL_PRICE_SETUP → Validar price IS NOT NULL
4. Si context=PRICE_PROVIDER_SETUP → Validar metadata.pricing está presente
5. Crear lote en APE → POST /v1/ape/lots (endpoint no documentado antes, asumir existe)
6. Retornar response

**Response:**

json

{  
 "lot_id": "lot_custom_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "side": "BUY",  
 "price": 1500.00,  
 "status": "ACTIVE",  
 "created_at": "2026-01-29T15:00:00-03:00"  
}

**Códigos de respuesta:**

- **201 Created:** Lote creado exitosamente
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Usuario no es MESA_SUPERVISOR
- **409 Conflict:** lot_id ya existe

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "LOT_ALREADY_EXISTS",  
 "message": "A lot with this ID already exists",  
 "details": {  
 "lot_id": "lot_custom_01"  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "PRICE_REQUIRED",  
 "message": "Price is required for GLOBAL_PRICE_SETUP context",  
 "details": {  
 "context": "GLOBAL_PRICE_SETUP",  
 "price_provided": null  
 }  
}

---

### 6.3.1.4 PATCH /v1/admin/lots/{id}/status

**Descripción:** Cambiar status de un lote (ACTIVE ↔ SUSPENDED ↔ CLOSED).

**Roles requeridos:**

- MESA_TRADER: Puede SUSPEND
- MESA_SUPERVISOR: Puede SUSPEND y CLOSE

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "status": "SUSPENDED",  
 "reason": "End-of-day maintenance"  
}

**Request Schema:**

| Campo  | Tipo   | Requerido | Descripción                                    |
| :----- | :----- | :-------- | :--------------------------------------------- |
| status | string | Sí        | Nuevo status ("ACTIVE", "SUSPENDED", "CLOSED") |
| reason | string | Sí        | Motivo del cambio                              |

**Proceso interno:**

1. Validar JWT y extraer roles y user_id
2. Validar autorización según nuevo status:
   - Si status \= "CLOSED":
     - Requerir rol MESA_SUPERVISOR
     - Si usuario no tiene rol → Error 403
   - Si status \= "SUSPENDED" o "ACTIVE":
     - Permitir MESA_TRADER o MESA_SUPERVISOR
3. Agregar operator_id al request desde JWT
4. Proxy request a APE → PATCH /v1/ape/lots/{id}/status
5. Retornar response de APE

**Response:**

Mismo formato que APE PATCH /v1/ape/lots/{id}/status (ver sección 6.2.9)

**Códigos de respuesta:**

- **200 OK:** Status cambiado exitosamente
- **400 Bad Request:** Transición no permitida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos para CLOSE
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** No se puede cerrar lote con FUNDS_RESERVEs activos

**Errores adicionales:**

–---------------------------------------------------------------------

json

{  
 "error": "INSUFFICIENT_PERMISSIONS",  
 "message": "Only MESA_SUPERVISOR can close lots",  
 "details": {  
 "user_role": "MESA_TRADER",  
 "required_role": "MESA_SUPERVISOR",  
 "requested_status": "CLOSED"  
 }  
}

---

### 6.3.1.5 POST /v1/admin/lots/{id}/fund

**Descripción:** Fondear un lote con capital (transacción ADD).

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "amount": 100000.00,  
 "external_reference": "0x1234abcd...",  
 "reason": "Initial funding for trading day"  
}

**Request Schema:**

| Campo              | Tipo    | Requerido | Descripción                                 |
| :----------------- | :------ | :-------- | :------------------------------------------ |
| amount             | numeric | Sí        | Monto a fondear (en base_asset)             |
| external_reference | string  | Sí        | Hash de tx blockchain o referencia bancaria |
| reason             | string  | No        | Motivo del fondeo                           |

**Proceso interno:**

1. Validar JWT y extraer user_id
2. Verificar rol MESA_TRADER o MESA_SUPERVISOR
3. Agregar operator_id al request (user_id desde JWT)
4. Proxy request a APE → POST /v1/ape/lots/{id}/fund
5. Retornar response de APE

**Response:**

Mismo formato que APE POST /v1/ape/lots/{id}/fund (ver sección 6.2.7)

**Códigos de respuesta:**

- **200 OK:** Fondeo exitoso
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** Excede max_capacity

---

### 6.3.1.6 POST /v1/admin/lots/{id}/retire

**Descripción:** Retirar fondos de un lote (transacción RETIRE).

**Roles requeridos:**

- MESA_TRADER: Puede retirar si amount \< retire_approval_threshold
- MESA_SUPERVISOR: Puede retirar cualquier monto

**Path Parameters:**

| Parámetro | Tipo   | Descripción            |
| :-------- | :----- | :--------------------- |
| id        | string | Identificador del lote |

**Request:**

json

{  
 "amount": 50000.00,  
 "reason": "End-of-day rebalancing \- excess capacity"  
}

**Request Schema:**

| Campo  | Tipo    | Requerido | Descripción                           |
| :----- | :------ | :-------- | :------------------------------------ |
| amount | numeric | Sí        | Monto a retirar (en base_asset)       |
| reason | string  | Sí        | Motivo del retiro (min 10 caracteres) |

**Proceso interno:**

1. Validar JWT y extraer user_id y roles
2. Obtener lot metadata desde APE para verificar retire_approval_threshold
3. Si amount \> retire_approval_threshold:
   - Verificar usuario tiene rol MESA_SUPERVISOR
   - Si no tiene rol → Error 403
   - Agregar approved_by \= user_id al request
4. Agregar operator_id \= user_id al request
5. Proxy request a APE → POST /v1/ape/lots/{id}/retire
6. Retornar response de APE

**Response:**

Mismo formato que APE POST /v1/ape/lots/{id}/retire (ver sección 6.2.8)

**Códigos de respuesta:**

- **200 OK:** Retiro exitoso
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Monto excede threshold y usuario no es SUPERVISOR
- **404 Not Found:** Lote no encontrado
- **409 Conflict:** Insufficient available

**Errores adicionales:**

–---------------------------------------------------------------------

json

{  
 "error": "SUPERVISOR_APPROVAL_REQUIRED",  
 "message": "Amount exceeds threshold, only MESA_SUPERVISOR can approve",  
 "details": {  
 "requested_amount": 150000.00,  
 "retire_approval_threshold": 100000.00,  
 "user_role": "MESA_TRADER",  
 "required_role": "MESA_SUPERVISOR"  
 }  
}

---

### 6.3.1.7 GET /v1/admin/transactions

**Descripción:** Historial de transacciones con filtros (proxy a APE).

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Query Parameters:**

Mismo que APE GET /v1/ape/transactions (ver sección 6.2.10)

**Proceso interno:**

1. Validar JWT y roles
2. Proxy request a APE → GET /v1/ape/transactions
3. Retornar response de APE

**Response:**

Mismo formato que APE GET /v1/ape/transactions (ver sección 6.2.10)

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **400 Bad Request:** Parámetros inválidos
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos

---

### 6.3.1.8 GET /v1/admin/clients/{id}/pricing

**Descripción:** Obtener configuración de BPS y exposición de un cliente.

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción               |
| :-------- | :----- | :------------------------ |
| id        | string | Identificador del cliente |

**Proceso interno:**

1. Validar JWT y roles
2. Consultar Client Module → GET /api/clients/{id}/pricing
3. Retornar response del Client Module

**Response:**

json

{  
 "client_id": "cli_001",  
 "client_name": "Exchange ABC",  
 "group_id": "grp_premium",  
 "group_name": "Premium Clients",  
 "bps_override": 12,  
 "applicable_bps": 12,  
 "bps_source": "CLIENT",  
 "max_open_exposure_override": 100000.00,  
 "effective_max_open_exposure": 100000.00,  
 "exposure_source": "CLIENT",  
 "updated_at": "2026-01-29T10:00:00-03:00"  
}

**Response Schema:**

| Campo                       | Tipo    | Descripción                                     |
| :-------------------------- | :------ | :---------------------------------------------- |
| client_id                   | string  | Identificador del cliente                       |
| client_name                 | string  | Nombre del cliente                              |
| group_id                    | string  | ID del grupo asignado (null si no tiene)        |
| group_name                  | string  | Nombre del grupo (null si no tiene)             |
| bps_override                | numeric | BPS override del cliente (null si usa grupo)    |
| applicable_bps              | numeric | BPS efectivo aplicado                           |
| bps_source                  | string  | Fuente del BPS: "CLIENT", "GROUP", "DEFAULT"    |
| max_open_exposure_override  | numeric | Límite override del cliente (null si usa grupo) |
| effective_max_open_exposure | numeric | Límite efectivo aplicado (null si sin límite)   |
| exposure_source             | string  | Fuente del límite: "CLIENT", "GROUP", "NONE"    |
| updated_at                  | string  | Última actualización                            |

**Códigos de respuesta:**

- **200 OK:** Configuración retornada exitosamente
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos
- **404 Not Found:** Cliente no encontrado

---

### 6.3.1.9 PATCH /v1/admin/clients/{id}/pricing

**Descripción:** Configurar BPS y límite de exposición de un cliente.

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción               |
| :-------- | :----- | :------------------------ |
| id        | string | Identificador del cliente |

**Request:**

json

{  
 "group_id": "grp_premium",  
 "bps_override": 15,  
 "max_open_exposure_override": 150000.00  
}

**Request Schema:**

| Campo                      | Tipo    | Requerido | Descripción                                                     |
| :------------------------- | :------ | :-------- | :-------------------------------------------------------------- |
| group_id                   | string  | No        | ID del grupo (null para desasignar)                             |
| bps_override               | numeric | No        | BPS personalizado (null para usar grupo, \>= 0\)                |
| max_open_exposure_override | numeric | No        | Límite personalizado (null para usar grupo o sin límite, \> 0\) |

**Proceso interno:**

1. Validar JWT y roles
2. Validar bps_override \>= 0 si no es null
3. Validar max_open_exposure_override \> 0 si no es null
4. Agregar updated_by \= user_id desde JWT
5. Actualizar en Client Module → PATCH /api/clients/{id}/pricing
6. Retornar response del Client Module

**Response:**

json

{  
 "client_id": "cli_001",  
 "group_id": "grp_premium",  
 "bps_override": 15,  
 "applicable_bps": 15,  
 "bps_source": "CLIENT",  
 "max_open_exposure_override": 150000.00,  
 "effective_max_open_exposure": 150000.00,  
 "exposure_source": "CLIENT",  
 "updated_at": "2026-01-29T15:30:00-03:00",  
 "updated_by": "trader_john"  
}

**Códigos de respuesta:**

- **200 OK:** Configuración actualizada exitosamente
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos
- **404 Not Found:** Cliente no encontrado

**Errores:**

json

{  
 "error": "INVALID_BPS",  
 "message": "BPS override must be greater than or equal to zero",  
 "details": {  
 "provided_bps": \-5  
 }  
}

json

{  
 "error": "INVALID_EXPOSURE_LIMIT",  
 "message": "Max open exposure must be greater than zero",  
 "details": {  
 "provided_limit": \-1000  
 }  
}

---

### 6.3.1.10 GET /v1/admin/groups

**Descripción:** Listar grupos de clientes con su configuración.

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Query Parameters:**

| Parámetro | Tipo    | Requerido | Descripción                               |
| :-------- | :------ | :-------- | :---------------------------------------- |
| page      | integer | No        | Número de página (default: 1\)            |
| per_page  | integer | No        | Items por página (default: 50, max: 100\) |

**Proceso interno:**

1. Validar JWT y roles
2. Consultar Client Module → GET /api/groups
3. Retornar response del Client Module

**Response:**

json

{  
 "groups": \[  
 {  
 "group_id": "grp_premium",  
 "group_name": "Premium Clients",  
 "applicable_bps": 10,  
 "max_open_exposure": 200000.00,  
 "member_count": 5,  
 "created_at": "2026-01-10T09:00:00-03:00",  
 "updated_at": "2026-01-25T14:00:00-03:00"  
 },  
 {  
 "group_id": "grp_standard",  
 "group_name": "Standard Clients",  
 "applicable_bps": 20,  
 "max_open_exposure": 50000.00,  
 "member_count": 12,  
 "created_at": "2026-01-10T09:00:00-03:00",  
 "updated_at": "2026-01-20T11:00:00-03:00"  
 }  
 \],  
 "pagination": {  
 "page": 1,  
 "per_page": 50,  
 "total_items": 2,  
 "total_pages": 1  
 }  
}

**Response Schema:**

| Campo                        | Tipo    | Descripción                               |
| :--------------------------- | :------ | :---------------------------------------- |
| groups                       | array   | Lista de grupos                           |
| groups\[\].group_id          | string  | Identificador del grupo                   |
| groups\[\].group_name        | string  | Nombre del grupo                          |
| groups\[\].applicable_bps    | numeric | BPS del grupo                             |
| groups\[\].max_open_exposure | numeric | Límite de exposición (null si sin límite) |
| groups\[\].member_count      | integer | Cantidad de clientes asignados            |
| groups\[\].created_at        | string  | Timestamp de creación                     |
| groups\[\].updated_at        | string  | Timestamp de actualización                |
| pagination                   | object  | Información de paginación                 |

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos

---

### 6.3.1.11 POST /v1/admin/groups

**Descripción:** Crear un nuevo grupo de clientes.

**Roles requeridos:** MESA_SUPERVISOR

**Request:**

json

{  
 "group_id": "grp_vip",  
 "group_name": "VIP Clients",  
 "applicable_bps": 8,  
 "max_open_exposure": 500000.00  
}

**Request Schema:**

| Campo             | Tipo    | Requerido | Descripción                                      |
| :---------------- | :------ | :-------- | :----------------------------------------------- |
| group_id          | string  | Sí        | Identificador único del grupo                    |
| group_name        | string  | Sí        | Nombre descriptivo del grupo                     |
| applicable_bps    | numeric | Sí        | BPS del grupo (\>= 0\)                           |
| max_open_exposure | numeric | No        | Límite de exposición (null \= sin límite, \> 0\) |

**Proceso interno:**

1. Validar JWT y verificar rol MESA_SUPERVISOR
2. Validar applicable_bps \>= 0
3. Validar max_open_exposure \> 0 si no es null
4. Agregar created_by \= user_id desde JWT
5. Crear grupo en Client Module → POST /api/groups
6. Retornar response del Client Module

**Response:**

json

{  
 "group_id": "grp_vip",  
 "group_name": "VIP Clients",  
 "applicable_bps": 8,  
 "max_open_exposure": 500000.00,  
 "member_count": 0,  
 "created_at": "2026-01-29T15:30:00-03:00",  
 "created_by": "supervisor_alice"  
}

**Códigos de respuesta:**

- **201 Created:** Grupo creado exitosamente
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Usuario no es MESA_SUPERVISOR
- **409 Conflict:** group_id ya existe

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "GROUP_ALREADY_EXISTS",  
 "message": "A group with this ID already exists",  
 "details": {  
 "group_id": "grp_vip"  
 }  
}  
–---------------------------------------------------------------------

json

{  
 "error": "INVALID_BPS",  
 "message": "Applicable BPS must be greater than or equal to zero",  
 "details": {  
 "provided_bps": \-3  
 }  
}

---

### 6.3.1.12 PATCH /v1/admin/groups/{id}

**Descripción:** Editar configuración de un grupo existente.

**Roles requeridos:** MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción             |
| :-------- | :----- | :---------------------- |
| id        | string | Identificador del grupo |

**Request:**

json

{  
 "group_name": "VIP Platinum Clients",  
 "applicable_bps": 5,  
 "max_open_exposure": 1000000.00  
}

**Request Schema:**

| Campo             | Tipo    | Requerido | Descripción                              |
| :---------------- | :------ | :-------- | :--------------------------------------- |
| group_name        | string  | No        | Nuevo nombre del grupo                   |
| applicable_bps    | numeric | No        | Nuevo BPS (\>= 0\)                       |
| max_open_exposure | numeric | No        | Nuevo límite (null \= sin límite, \> 0\) |

**Proceso interno:**

1. Validar JWT y verificar rol MESA_SUPERVISOR
2. Validar applicable_bps \>= 0 si está presente
3. Validar max_open_exposure \> 0 si está presente y no es null
4. Agregar updated_by \= user_id desde JWT
5. Actualizar grupo en Client Module → PATCH /api/groups/{id}
6. Retornar response del Client Module

**Response:**

json

{  
 "group_id": "grp_vip",  
 "group_name": "VIP Platinum Clients",  
 "applicable_bps": 5,  
 "max_open_exposure": 1000000.00,  
 "member_count": 3,  
 "updated_at": "2026-01-29T16:00:00-03:00",  
 "updated_by": "supervisor_alice"  
}

**Códigos de respuesta:**

- **200 OK:** Grupo actualizado exitosamente
- **400 Bad Request:** Validación fallida
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Usuario no es MESA_SUPERVISOR
- **404 Not Found:** Grupo no encontrado

---

### 6.3.1.13 DELETE /v1/admin/groups/{id}

**Descripción:** Eliminar un grupo (solo si no tiene miembros asignados).

**Roles requeridos:** MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción             |
| :-------- | :----- | :---------------------- |
| id        | string | Identificador del grupo |

**Proceso interno:**

1. Validar JWT y verificar rol MESA_SUPERVISOR
2. Consultar member_count del grupo en Client Module
3. Si member_count \> 0 → Error 409 (no se puede eliminar)
4. Eliminar grupo en Client Module → DELETE /api/groups/{id}
5. Retornar confirmación

**Response:**

json

{  
 "group_id": "grp_vip",  
 "message": "Group deleted successfully",  
 "deleted_at": "2026-01-29T16:00:00-03:00",  
 "deleted_by": "supervisor_alice"  
}

**Códigos de respuesta:**

- **200 OK:** Grupo eliminado exitosamente
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Usuario no es MESA_SUPERVISOR
- **404 Not Found:** Grupo no encontrado
- **409 Conflict:** Grupo tiene miembros asignados

**Errores:**

–---------------------------------------------------------------------

json

{  
 "error": "GROUP_HAS_MEMBERS",  
 "message": "Cannot delete group with assigned members",  
 "details": {  
 "group_id": "grp_premium",  
 "member_count": 5,  
 "action_required": "Reassign or remove all members before deleting group"  
 }  
}

---

### 6.3.1.14 GET /v1/admin/groups/{id}/members

**Descripción:** Listar clientes asignados a un grupo.

**Roles requeridos:** MESA_TRADER, MESA_SUPERVISOR

**Path Parameters:**

| Parámetro | Tipo   | Descripción             |
| :-------- | :----- | :---------------------- |
| id        | string | Identificador del grupo |

**Query Parameters:**

| Parámetro | Tipo    | Requerido | Descripción                               |
| :-------- | :------ | :-------- | :---------------------------------------- |
| page      | integer | No        | Número de página (default: 1\)            |
| per_page  | integer | No        | Items por página (default: 50, max: 100\) |

**Proceso interno:**

1. Validar JWT y roles
2. Consultar Client Module → GET /api/groups/{id}/members
3. Retornar response del Client Module

**Response:**

json

{  
 "group_id": "grp_premium",  
 "group_name": "Premium Clients",  
 "members": \[  
 {  
 "client_id": "cli_001",  
 "client_name": "Exchange ABC",  
 "bps_override": null,  
 "applicable_bps": 10,  
 "bps_source": "GROUP",  
 "max_open_exposure_override": null,  
 "effective_max_open_exposure": 200000.00,  
 "exposure_source": "GROUP"  
 },  
 {  
 "client_id": "cli_005",  
 "client_name": "Trading Corp",  
 "bps_override": 8,  
 "applicable_bps": 8,  
 "bps_source": "CLIENT",  
 "max_open_exposure_override": 300000.00,  
 "effective_max_open_exposure": 300000.00,  
 "exposure_source": "CLIENT"  
 }  
 \],  
 "pagination": {  
 "page": 1,  
 "per_page": 50,  
 "total_items": 5,  
 "total_pages": 1  
 }  
}

**Códigos de respuesta:**

- **200 OK:** Lista retornada exitosamente
- **401 Unauthorized:** JWT inválido
- **403 Forbidden:** Sin permisos
- **404 Not Found:** Grupo no encontrado

---

### 6.3.1.15 GET /v1/admin/health

**Descripción:** Health check endpoint para monitoreo de disponibilidad del servicio Admin BFF.

**Consumidor:** Load balancers, sistemas de monitoreo, orquestadores (Kubernetes)

**Autenticación:** No requerida (expuesto para health checks)

**Request:** Sin parámetros

**Response:**

json

{  
 "status": "healthy",  
 "timestamp": "2026-01-29T15:00:00-03:00",  
 "service": "admin-api",  
 "version": "1.0.0",  
 "dependencies": {  
 "ape_service": {  
 "status": "healthy",  
 "latency_ms": 8  
},  
 "client_module": {  
 "status": "healthy",  
 "latency_ms": 12  
},  
 "auth_service": {  
 "status": "healthy",  
 "latency_ms": 10  
},  
 }  
}

**Response Schema:**

| Campo                                 | Tipo    | Descripción                                  |
| :------------------------------------ | :------ | :------------------------------------------- |
| status                                | string  | Estado del servicio: "healthy" o "unhealthy" |
| timestamp                             | string  | Timestamp de la respuesta (ISO 8601\)        |
| version                               | string  | Versión del servicio Admin BFF               |
| service                               | string  | Nombre del servicio: "admin-api"             |
| dependencies                          | object  | Estado de dependencias externas              |
| dependencies.ape_service              | object  | Estado de conexión a APE Service             |
| dependencies.ape_service.status       | string  | "healthy" o "unhealthy"                      |
| dependencies.ape_service.latency_ms   | integer | Latencia en milisegundos                     |
| dependencies.client_module            | integer | Estado de conexión a Client Module           |
| dependencies.client_module.status     | string  | "healthy" o "unhealthy"                      |
| dependencies.client_module.latency_ms | integer | Latencia en milisegundos                     |
| dependencies.auth_service             | object  | Estado de conexión a Auth Service            |
| dependencies.auth_service.status      | string  | "healthy" o "unhealthy"                      |
| dependencies.auth_service.latency_ms  | integer | Latencia en milisegundos                     |

**Códigos de respuesta:**

- **200 OK:** Servicio saludable
- **503 Service Unavailable:** Alguna dependencia no saludable

**Notas:**

- Este endpoint NO requiere autenticación para permitir health checks desde load balancers.
- El endpoint debe responder en menos de 100ms para considerarse healthy.
- Admin BFF actúa como proxy, por lo que la salud del servicio depende críticamente de sus dependencias.

---

### 6.3.1.16 GET /v1/admin/metrics

**Descripción:** Métricas Prometheus para monitoreo.

**Exposición:** Interna (solo accesible por Prometheus scraper)

**Roles requeridos:** Ninguno (acceso directo desde sistema de monitoreo)

**Formato de respuesta:** Texto plano en formato Prometheus

**Ejemplo de métricas expuestas:**

\# HELP admin_api_requests_total Total HTTP requests  
\# TYPE admin_api_requests_total counter

- admin_api_requests_total{method="GET",path="/v1/admin/lots",status="200"} 1523
- admin_api_requests_total{method="POST",path="/v1/admin/lots/{id}/fund",status="200"} 342

\# HELP admin_api_request_duration_seconds HTTP request latency  
\# TYPE admin_api_request_duration_seconds histogram

- admin_api_request_duration_seconds_bucket{method="GET",path="/v1/admin/lots",le="0.1"} 1450
- admin_api_request_duration_seconds_bucket{method="GET",path="/v1/admin/lots",le="0.5"} 1520
- admin_api_request_duration_seconds_sum{method="GET",path="/v1/admin/lots"} 182.5
- admin_api_request_duration_seconds_count{method="GET",path="/v1/admin/lots"} 1523

\# HELP admin_api_auth_failures_total Total authentication failures  
\# TYPE admin_api_auth_failures_total counter

- admin_api_auth_failures_total{reason="invalid_token"} 23
- admin_api_auth_failures_total{reason="insufficient_permissions"} 12

\# HELP admin_api_authorization_checks_total Total authorization checks by endpoint  
\# TYPE admin_api_authorization_checks_total counter

- admin_api_authorization_checks_total{endpoint="/v1/admin/lots/{id}/retire",role="MESA_TRADER",result="allowed"} 45
- admin_api_authorization_checks_total{endpoint="/v1/admin/lots/{id}/retire",role="MESA_TRADER",result="denied"} 8

**Consumidor:** Prometheus (scraping cada 15 segundos)

**Configuración de Prometheus:**

yaml

scrape_configs:  
 \- job_name: 'admin-api'  
 scrape_interval: 15s  
 static_configs:  
 \- targets: \['admin-api:8080'\]  
 metrics_path: '/v1/admin/metrics'

**Visualización:** Grafana (conectado a Prometheus como datasource)

---

# 7\. INTERFACES DE USUARIO {#7.-interfaces-de-usuario}

## 7.1 Web App (Cliente)

**Nombre:** web-ui-client

**Nota sobre alcance:** Las pantallas documentadas en esta sección corresponden a operaciones de tipo **swap** (v1.0). Las interfaces para operaciones de tipo **payment** serán definidas en v2.0.

### 7.1.1 Información General

**Responsabilidades:**

- Interfaz de swap para clientes B2B/B2B2C
- Solicitud de cotizaciones (RFQ)
- Aceptación/rechazo de pre-quotes
- Consulta de historial de operaciones

**Exposición:** Pública (app.arduasolutions.com)

**Dependencias:**

- RFQ API (HTTP vía Next.js API Routes como BFF)
- Auth Service (sesión de usuario)

**Stack tecnológico sugerido:**

- Framework: Next.js 14+ (App Router)
- UI: React \+ Tailwind CSS
- Estado: React Query para server state
- Autenticación: NextAuth.js

**Páginas principales:**

- /swap \- Interfaz principal de swap
- /quotes/history \- Historial de cotizaciones
- /quotes/\[id\] \- Detalle de cotización individual

---

### 7.1.2 Pantalla: Swap Interface

**Ruta:** /swap

**Propósito:** Permitir al cliente solicitar y ejecutar swaps en tiempo real.

**Elementos de la interfaz:**

**1\. Selector de Operación**

- **Selector de par:** Dropdown con pares disponibles
  - USDC/ARS
  - USDT/ARS
  - USD/ARS
  - Otros pares configurados
- **Selector de dirección:** Toggle o tabs
  - BUY (comprar base_asset con quote_asset)
  - SELL (vender base_asset por quote_asset)
- **Input de monto:** Campo numérico
  - Label: "You pay" o "You receive" (según dirección)
  - Unidad: quote_asset (ej: ARS)
  - Validación en tiempo real (mínimos/máximos)
  - Formato: separador de miles

**2\. Área de Cotización**

**Estado inicial (sin cotización):**

- Botón \[Get Quote\] \- Primario, centrado
- Texto explicativo: "Request a quote to see the exchange rate"

**Estado loading:**

- Spinner con mensaje: "Getting best price..."
- Tiempo estimado: \~500ms

**Estado con cotización activa:**

- **Precio final:** Display grande y destacado
  - Formato: "1 USDC \= 1,522.038 ARS"
  - Subtext: "Includes fees"
- **Countdown timer:** Visual prominente
  - Formato: "Quote expires in 00:28"
  - Color: verde → amarillo (\< 15s) → rojo (\< 5s)
  - Animación de progreso circular
- **Acciones:**
  - Botón \[Accept Quote\] \- Primario, verde
  - Botón \[Reject\] \- Secundario
  - Botón \[Get New Quote\] \- Terciario, pequeño

**Estado de confirmación (post-accept):**

- ✅ Mensaje de éxito
- Quote ID generado
- Detalles de la operación
- Status: "Confirmed \- Pending Settlement"
- Nota: "Physical settlement will be processed during business hours"
- Botón \[View Details\] → navega a /quotes/{id}
- Botón \[New Swap\] → resetea formulario

**Estado de error:**

- ⚠️ Mensaje de error específico
  - NO_LIQUIDITY_AVAILABLE
  - RATE_LIMIT_EXCEEDED
  - EXPOSURE_LIMIT_EXCEEDED
  - etc.
- Botón \[Try Again\]

**3\. Historial Reciente (Sidebar o sección inferior)**

- **Título:** "Recent Quotes"
- **Lista:** Últimas 5 cotizaciones del cliente
- **Card por cotización:**
  - Timestamp
  - Par y dirección
  - Monto
  - Status badge:
    - 🟢 ACCEPTED (verde)
    - 🔴 REJECTED (gris)
    - ⏱️ EXPIRED (amarillo)
  - Link: "View details"

**Flujo de usuario:**

1. Usuario selecciona par (ej: USDC/ARS)
2. Usuario selecciona dirección (BUY)
3. Usuario ingresa monto (40,000,000 ARS)
4. Sistema valida monto en tiempo real
5. Usuario clic en \[Get Quote\]
6. Sistema muestra loading (\~500ms)
7. Sistema muestra cotización con timer (30s)
8. Opciones del usuario:
   - **A) Acepta:** Clic en \[Accept Quote\]
     - Sistema muestra confirmación
     - Navega a detalle o permite nueva operación
   - **B) Rechaza:** Clic en \[Reject\]
     - Sistema libera reserva
     - Permite nueva cotización
   - **C) Refresca:** Clic en \[Get New Quote\]
     - Sistema rechaza cotización actual
     - Solicita nueva cotización
   - **D) Expira:** Timer llega a 0
     - Sistema muestra mensaje: "Quote expired, please request new quote"
     - Botón \[Get New Quote\] habilitado

**Validaciones en cliente:**

- Monto mínimo por par (configurable)
- Monto máximo por par (configurable)
- Formato numérico válido
- Cliente no puede aceptar si TTL \< 5s (UI deshabilita botón)

**Estados de loading:**

- **Getting quote:** Spinner en botón \[Get Quote\]
- **Accepting quote:** Spinner en botón \[Accept\] \+ deshabilitar otros botones
- **Rejecting quote:** Sin loading (acción instantánea)

---

### 7.1.3 Pantalla: Historial de Cotizaciones

**Ruta:** /quotes/history

**Propósito:** Permitir al cliente consultar todas sus cotizaciones históricas.

**Elementos de la interfaz:**

**1\. Filtros**

- **Por status:** All, Accepted, Rejected, Expired
- **Por par:** Dropdown multi-select
- **Por fecha:** Date range picker
- **Search:** Por quote_id o pre_quote_id

**2\. Tabla de cotizaciones**

**Columnas:**

- Date & Time
- Quote ID (linkeable)
- Pair
- Side (badge: BUY/SELL)
- Amount (quote_asset)
- Price
- Status (badge con color)
- Actions (menú: View Details, Re-quote)

**Paginación:** 20 items por página

**Sorting:** Por fecha (descendente default)

**3\. Acciones por fila**

- **View Details:** Navega a /quotes/{id}
- **Re-quote:** Pre-llena formulario de swap con mismos parámetros

---

### 7.1.4 Pantalla: Detalle de Cotización

**Ruta:** /quotes/\[id\]

**Propósito:** Mostrar información completa de una cotización específica.

**Secciones:**

**1\. Header**

- Quote ID
- Status badge (grande, destacado)
- Timestamp de creación

**2\. Operation Details**

- Pair
- Side
- Requested amount
- Covered amount
- Pending amount (si aplica)
- Reference price
- Final price
- BPS applied

**3\. Settlement Status**

- Status: "Pending Settlement" / "Settled"
- Nota explicativa sobre liquidación física manual
- Timeline estimado (si aplica)

**4\. Acciones**

- Botón \[Download Receipt\] (PDF)
- Botón \[Contact Support\] (si hay issue)

---

## 7.2 Admin Panel (Mesa de Trading)

### 7.2.1 Pantalla: Dashboard de Liquidez(Swap)

**Ruta:** /dashboard

**Propósito:** Vista general del estado de fondeo y utilización de todos los lotes.

**Nota:** Este dashboard gestiona lotes de liquidez del Swap Module. En v2.0 se agregará un dashboard separado para Payment Module.

**Elementos de la interfaz:**

**1\. KPIs Globales (Cards superiores)**

- **Total Liquidity:** Suma de available \+ reserved \+ executed de todos los lotes activos
- **Total Available:** Suma de available
- **Total Reserved:** Suma de reserved
- **Avg Utilization:** Promedio de utilization_rate de lotes activos
- **Active Lots:** Count de lotes con status ACTIVE

**2\. Filtros y búsqueda**

- **Status:** Dropdown multi-select
  - All
  - Active
  - Suspended
  - Closed
- **Provider:** Dropdown multi-select
  - All
  - ARDUA
  - BINANCE
  - BYMA
  - BITSO
- **Asset pair:** Dropdown (base/quote)
- **Search:** Input text para buscar por lot_id

**3\. Tabla de Lotes**

**Columnas:**

- **Lot ID:** Texto con ícono de provider
- **Provider:** Badge
- **Assets:** Display "BASE/QUOTE" (ej: "USDC/ARS")
- **Status:** Badge con color
  - 🟢 ACTIVE (verde)
  - 🟡 SUSPENDED (amarillo)
  - ⚫ CLOSED (gris)
- **Capacity:** Barra de progreso visual stacked
  - Segmento verde: Available
  - Segmento amarillo: Reserved
  - Segmento gris: Executed
  - Tooltip al hover con valores numéricos
- **Utilization %:** Número \+ badge de alerta
  - \< 70%: 🟢 Normal (verde)
  - 70-85%: 🟡 Medium (amarillo)
  - 85-95%: 🟠 High (naranja)
  - 95%: 🔴 Critical (rojo)
- **Alerts:** Íconos con tooltips
  - ⚠️ Underfunded (available \< 10% capacity)
  - 🔥 High utilization (\> 80%)
  - ⏸️ Suspended recently
- **Actions:** Dropdown menu (⋮)
  - View Details
  - Fund Lot
  - Retire Funds
  - Suspend (si ACTIVE)
  - Resume (si SUSPENDED)
  - Close (solo MESA_SUPERVISOR, si SUSPENDED)

**Sorting:** Por cualquier columna

**Paginación:** 50 items por página

**4\. Quick Actions (botones superiores)**

- \[+ Create Lot\] \- Solo MESA_SUPERVISOR
- \[Refresh\] \- Actualiza datos
- \[Export CSV\] \- Exporta tabla completa

**5\. Alertas operativas (sidebar o sección)**

- Lista de lotes que requieren atención
- Filtrable por tipo de alerta
- Clickeable → navega a detalle de lote

---

### 7.2.2 Pantalla: Detalle de Lote(Swap)

**Ruta:** /lots/\[id\]

**Propósito:** Gestión operativa completa de un lote individual.

**Nota:** Esta pantalla gestiona lotes del Swap Module.

**Elementos de la interfaz:**

**1\. Header con información general**

- **Lot ID:** Texto grande
- **Provider:** Badge
- **Assets:** "USDC/ARS"
- **Status:** Badge grande con acciones
  - Si ACTIVE: Botón \[Suspend\]
  - Si SUSPENDED: Botones \[Resume\] y \[Close\] (Close solo MESA_SUPERVISOR)
- **Price:** Display del precio base (si aplica, para GLOBAL_PRICE_SETUP)
- **Last updated:** Timestamp

**2\. Balance & Capacity (Card destacada)**

**Visual principal: Barra stacked horizontal**

- Segmentos coloreados (available/reserved/executed)
- Labels con valores numéricos
- Porcentajes

**Métricas:**

- **Total Capacity:** {max_capacity} USDC
- **Available:** {available} USDC ({%} of capacity)
- **Reserved:** {reserved} USDC ({%} of capacity)
- **Executed:** {executed} USDC ({%} of capacity)
- **Utilization Rate:** {(reserved \+ executed) / max_capacity \* 100}%
- **Daily Volume (today):** {sum} USDC / {daily_volume_limit} USDC

**Alertas visuales:**

- Si available \< 10% capacity: ⚠️ "Underfunded \- Consider adding liquidity"
- Si utilization \> 85%: 🔥 "High utilization \- Monitor closely"
- Si daily_volume \> 90% limit: ⚠️ "Approaching daily volume limit"

**3\. Funding Actions (Card con tabs)**

**Tab 1: Fund Lot**

**Form con campos:**

- **Amount (USDC):** Input numérico
  - Validación: \> 0
  - Validación: total \+ amount \<= max_capacity
  - Helper text: "Max you can add: {max_capacity \- fondeo_total} USDC"
- **External Reference:** Input texto
  - Placeholder: "Blockchain tx hash or bank reference"
  - Required
- **Reason:** Textarea (opcional)
  - Placeholder: "Reason for funding (optional)"
- Botón \[Confirm Funding\] \- Primario

**Tab 2: Retire Funds**

**Form con campos:**

- **Max retirable:** Display destacado
  - "{available} USDC available for retirement"
- **Amount (USDC):** Input numérico
  - Validación: \> 0
  - Validación: \<= available
  - Si amount \> retire_approval_threshold:
    - Show warning: "⚠️ Amount exceeds threshold. Supervisor approval required."
    - Show field: **Approved by** (dropdown de supervisores)
- **Reason:** Textarea (REQUIRED)
  - Placeholder: "Reason for retirement (required)"
  - Validación: min 10 caracteres
- Botón \[Confirm Retirement\]
  - Si \< threshold: Habilitado para MESA_TRADER
  - Si \>= threshold: Habilitado solo si approved_by está seleccionado

**4\. Configuration (Card colapsable)**

Muestra metadata del lote en formato legible:

- **Limits:**
  - Max capacity
  - Max single allocation
  - Daily volume limit
  - Retire approval threshold
- **Activation rules:**
  - Timezone
  - Holiday calendar
  - Weekly windows
  - Exclude dates
  - Include dates (overrides)
  - Blackout windows
- **Pricing (si PRICE_PROVIDER_SETUP):**
  - Model
  - Inputs
  - Feeds
  - Formula

Botón \[Edit Configuration\] \- Solo MESA_SUPERVISOR

**5\. Transaction History (Card con tabla)**

**Filtros:**

- **Type:** All, FUNDS_IN, FUNDS_OUT, FUNDS_RESERVE
- **Date range:** Date picker
- **Operator:** Dropdown (para ADD/RETIRE)

**Tabla:**

Columnas:

- **Timestamp**
- **Type:** Badge con color
- **Amount:** Numérico formateado
- **Status:** Badge
- **Reference:** Muestra pre_quote_id o quote_id
- **Operator:** Usuario (solo para FUNDS_IN/FUNDS_OUT)
- **Reason:** Texto (solo para FUNDS_OUT)
- **External Ref:** Link (solo para FUNDS_IN)

**Paginación:** 100 items por página

**Acciones:**

- Botón \[Export CSV\] \- Exporta tabla filtrada

**6\. Real-time metrics (Card opcional, v2)**

- Chart de utilization en tiempo real (últimas 24h)
- Chart de volume por hora
- Predictive: "At current pace, lot will be exhausted in X hours"

---

### 7.2.3 Pantalla: Configuración de Clientes

**Ruta:** /clients

**Propósito:** Configurar BPS y límites de exposición por cliente o grupo.

**Nota sobre BPS:** El campo BPS (Basis Points) es específico de operaciones swap. En v2.0, cuando se agregue payment, esta pantalla se actualizará para separar configuraciones específicas por tipo de operación.

**Nota sobre Max Open Exposure:** Este campo es común a todos los tipos de operación y representa el límite total de capital que puede estar reservado (swap \+ payment).

**Elementos de la interfaz:**

**1\. Tabs principales**

- **Clients:** Lista de clientes individuales
- **Groups:** Gestión de grupos

–---------------------------------------------------------------------

**Tab 1: Clients**

**Filtros:**

- **Group:** Dropdown para filtrar por grupo
- **BPS Source:** All, CLIENT (override), GROUP, UNDEFINED
- **Search:** Por client_id o nombre

**Tabla de clientes:**

**Columnas:**

- **Client ID**
- **Name:** Nombre del cliente
- **Group:** Badge (o "Unassigned")
- **BPS Override:** Número (o "—" si usa grupo)
- **Effective BPS:** Número con badge indicando source
  - 🔵 CLIENT (override)
  - 🟢 GROUP
  - ⚪ UNDEFINED
- **Max Open Exposure:** Número (o "—" si usa grupo/sin límite)
- **Exposure Source:** Badge (CLIENT/GROUP/NONE)
- **Actions:** Dropdown
  - Edit Pricing
  - View History

**Action: Edit Pricing (Modal o sidebar)**

**Form:**

- **Group:** Dropdown
  - Options: lista de grupos \+ "Unassigned"
  - On change: recalcula "Effective BPS" preview
- **BPS Override:** Input numérico (nullable)
  - Helper: "Leave empty to use group BPS"
  - Validación: \>= 0
- **Max Open Exposure Override:** Input numérico (nullable)
  - Helper: "Leave empty to use group limit or no limit"
  - Validación: \> 0 o NULL
- **Preview:**
  - Display: "Effective BPS: {calculated}"
  - Display: "Effective Max Exposure: {calculated} (Source: {source})"
- Botón \[Save\]
- Botón \[Cancel\]

–---------------------------------------------------------------------

**Tab 2: Groups**

**Header:**

- Botón \[+ Create Group\] \- Solo MESA_SUPERVISOR

**Lista de grupos (Cards o tabla):**

**Por cada grupo:**

- **Group Name**
- **Applicable BPS:** Número grande
- **Max Open Exposure:** Número (o "No limit")
- **Members:** Count de clientes asignados
- **Actions:**
  - \[Edit\] \- Solo MESA_SUPERVISOR
  - \[Delete\] \- Solo MESA_SUPERVISOR (solo si no tiene miembros)
  - \[View Members\] \- Lista de clientes

**Action: Create/Edit Group (Modal)**

**Form:**

- **Group Name:** Input texto
  - Required
  - Unique
- **Applicable BPS:** Input numérico
  - Required
  - Validación: \>= 0
- **Max Open Exposure:** Input numérico (nullable)
  - Helper: "Leave empty for no limit"
  - Validación: \> 0 o NULL
- Botón \[Save\]
- Botón \[Cancel\]

---

# 8\. REGLAS DE NEGOCIO {#8.-reglas-de-negocio}

**Clasificación por alcance:**

- **Comunes:** Se aplican a todos los tipos de operación (swap y payment).
- **Específicas de Swap:** Solo aplican a operaciones de tipo swap.
- **Específicas de Payment:** Solo aplican a operaciones de tipo payment (v2.0)

## RN-001: Restricción de exposición del cliente

**Enunciado:** El cliente nunca ve allocations, lotes, providers ni lógica interna de pricing.

**Aplicable a:** RF-001 (ASK_FOR_PRICES)

**Justificación:** Proteger propiedad intelectual y evitar arbitraje.

**Alcance:** Común (aplica a swap y payment)

–---------------------------------------------------------------------

## RN-002: Precio inmutable post-emisión

**Enunciado:** El precio de una pre-quote no se recalcula después de emitida.

**Aplicable a:** RF-002 (ACCEPT_PRE_QUOTE)

**Implicación:** Si falla ejecución → REQUOTE_REQUIRED, no se ajusta precio.

–---------------------------------------------------------------------

## RN-003: All-or-Nothing execution

**Enunciado:** Si alguna transición de reserva falla durante la aceptación, se revierten TODAS las transiciones de esa quote.

**Aplicable a:** RF-002 (ACCEPT_PRE_QUOTE)

**Implicación:** Cliente recibe monto completo o ninguno.

**Detalles técnicos:**

- Durante ACCEPT, todas las transacciones tipo FUNDS_RESERVE deben transicionar de RESERVED a EXECUTED atómicamente.
- Si alguna transición falla (por conflicto de versión, estado inválido, etc.), se ejecuta ROLLBACK completo.
- Ninguna reserva queda en estado intermedio.

–---------------------------------------------------------------------

## RN-004: Expiración idempotente

**Enunciado:** Si una pre-quote expira, la reversión automática no duplica si ya fue revertida manualmente.

**Aplicable a:** RF-003 (REJECT_PRE_QUOTE), RF-200 (Expiración)

**Implicación:** Sistema tolera eventos duplicados.

**Detalles técnicos:**

- Job de expiración valida status \= 'RESERVED' antes de transicionar a REVERTED.
- Si cliente ya rechazó (status ya es REVERTED), el job ignora esa transacción.
- Garantiza que cada reserva termina exactamente una vez: o en EXECUTED o en REVERTED.

–---------------------------------------------------------------------

## RN-005: BPS por price_line

**Enunciado:** Los BPS se aplican individualmente a cada price_line, no globalmente sobre el total.

**Aplicable a:** RF-001 (ASK_FOR_PRICES)

**Implicación:** Precio final es agregación de proce_lines ya ajustadas.

**Ejemplo:**

Price Line 1: 5000 USDC a 1490 ARS/USDC \+ 12 BPS \= 1491.788 ARS/USDC  
Price Line 2: 21254 USDC a 1532 ARS/USDC \+ 12 BPS \= 1533.838 ARS/USDC  
Precio agregado: Weighted average de allocations con BPS aplicado

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-006: Validación de reference price

**Enunciado:** El precio agregado debe estar dentro de un threshold de tolerancia vs market reference (TradingView).

**Aplicable a:** RF-001 (ASK_FOR_PRICES)

**Configuración sugerida:** Threshold \= 2% (ajustable por par)

**Detalles:**

- RFQ API consulta TradingView para precio de mercado neutral.
- Calcula desviación: |precio_agregado \- market_reference| / market_reference \* 100.
- Si desviación \> threshold → Error INVALID_REFERENCE_PRICE.

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-007: Elegibilidad temporal y disponibilidad de lotes

**Enunciado:** Un lote es elegible solo si cumple todas las reglas de activación temporal y disponibilidad mínima configurada (blackout_windows, exclude_dates, etc.).

**Orden de precedencia:**

1. ❌ status \!= ACTIVE → lote inelegible
2. ❌ blackout_windows → veto absoluto
3. ❌ exclude_dates → bloqueo por fecha
4. ✅ include_dates → override (fuerza activación)
5. ❌ holiday_calendar → respeta feriados
6. ❌ weekly_windows → horario operativo
7. ❌ snapshot.available \< min_lot_available_threshold\[base_asset\] → disponibilidad insuficiente

**Lógica de threshold:**

El threshold se obtiene de la configuración APE:

- min_lot_available_threshold\[asset\] donde asset es el base_asset del lote en lowercase
- Si no existe configuración específica, usa min_lot_available_threshold\[default\]
- Si snapshot.available \< threshold → lote inelegible

**Ejemplo:**

Lote: base_asset \= USDC, snapshot.available \= 800  
Config: min_lot_available_threshold\[usdc\] \= 1000  
Resultado: Lote INELEGIBLE (800 \< 1000\)

**Aplicable a:** RF-001 (ASK_FOR_PRICES)

**Justificación:** Evitar asignar lotes con disponibilidad residual que generen mala experiencia al cliente (cotizaciones con cobertura insignificante).

**Configuración de thresholds:**

Los thresholds se configuran en el archivo de configuración del APE Module.

**Ubicación del archivo:** /config/ape_config.yaml en el servicio APE.

**Valores recomendados:**

- Para stablecoins (USDC, USDT, USD): 1000 unidades
- Para monedas fiduciarias de alta inflación (ARS): 500000 unidades
- Default: 1000 unidades

**Nota:**

Los assets se matchean en lowercase. Si no existe threshold específico para un asset, se usa el valor de 'default'.

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-008: Ventana de gracia en aceptación

**Enunciado:** RFQ API rechaza ACCEPT si TTL restante \< grace_period_seconds, incluso con token válido.

**Configuración sugerida**: grace_period_seconds \= 5 (configurable en RFQ API)

**Aplicable a:** RF-002 (ACCEPT_PRE_QUOTE)

**Justificación:** Prevenir race conditions con expiración automática.

**Garantía de timing:** El job de expiración (APE) corre cada expiration_job_interval_seconds. Se cumple:

grace_period_seconds \>= (expiration_job_interval_seconds \+ 1\)

**Mecanismo de prevención de race conditions:**

Además de la validación de grace period, el job de expiración DEBE usar locks pesimistas con \`FOR UPDATE SKIP LOCKED\` para prevenir conflictos:

sql

SELECT \* FROM transactions  
WHERE type \= 'FUNDS_RESERVE'  
 AND status \= 'RESERVED'  
 AND expires_at \< NOW() FOR UPDATE SKIP LOCKED  
LIMIT batch_size;

Si el RFQ API tiene un lock activo (durante ACCEPT), el job automáticamente salta esa reserva. Esto garantiza que no hay conflicto entre aceptación manual y expiración automática. Adicionalmente, el UPDATE del job valida el estado antes de transicionar:

sql

UPDATE transactions  
SET status \= 'REVERTED',  
is_immutable \= TRUE,  
became_immutable_at \= NOW(),  
reason \= 'EXPIRED'  
WHERE id \= reserve_tx.id  
AND status \= 'RESERVED' \-- Doble validación  
AND expires_at \< NOW(); \-- Confirma expiración

–---------------------------------------------------------------------

## RN-100: Restricción de retiro

**Enunciado:** Mesa solo puede registrar salida de fondos (FUNDS_OUT) hasta el monto snapshot.available. No puede retirar fondos reservados (reserved) o ejecutados sin esperar su liberación.

**Aplicable a:** RF-101 (Registrar Salida de Fondos)

**Implicación:** Si un lote tiene reserved \> 0 (reservas activas tipo FUNDS_RESERVE en estado RESERVED), Mesa debe esperar expiración/ejecución antes de poder retirar ese capital.

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-101: Fondeo inicial obligatorio

**Enunciado:** Un lote no puede ser ACTIVE sin al menos una transacción FUNDS_IN exitosa.

**Aplicable a:** RF-100 (Registrar Entrada de Fondos)

**Implicación:** Lotes nuevos requieren fondeo antes de operar.

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-103: Cierre con FUNDS_RESERVEs activos

**Enunciado:** Un lote no puede cambiar a CLOSED si existen reservas activas (tipo FUNDS_RESERVE, status RESERVED). Debe esperar expiración o forzar reversión.

**Aplicable a:** RF-103 (CLOSE)

**Implicación:** Mesa debe suspender lote y esperar limpieza antes de cerrar.

**Proceso recomendado:**

1. SUSPEND el lote (deja de aceptar nuevas reservas)
2. Esperar a que todas las reservas activas expiren o se ejecuten
3. Validar snapshot.reserved \= 0
4. CLOSE el lote

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-104: Límite de exposición

**Enunciado:** reserved \+ executed no puede exceder max_capacity del lote.

**Aplicable a:** RF-100 (Registrar Entrada de Fondos), RF-001 (construcción de allocations)

**Implicación:** Fondeo excesivo se rechaza.

**Validación:**

fondeo_total \= SUM(FUNDS_IN) \- SUM(FUNDS_OUT)  
fondeo_total \+ nuevo_monto \<= max_capacity

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-105: Aprobación de retiros grandes

**Enunciado:** Registro de salida de fondos (FUNDS_OUT) con monto mayor a retire_approval_threshold requiere campo approved_by con usuario de rol MESA_SUPERVISOR.

**Aplicable a:** RF-101 (Registrar Salida de Fondos)

**Configuración típica:** threshold \= 100,000 USDC

**Validaciones:**

- Si amount \> threshold → approved_by IS NOT NULL
- Validar que approved_by tiene rol MESA_SUPERVISOR

**Alcance:** Específico de Swap.

–---------------------------------------------------------------------

## RN-106: Límite de exposición abierta por cliente

**Enunciado:** El capital total en reservas activas (tipo FUNDS_RESERVE, status RESERVED) de un cliente no puede exceder su max_open_exposure.

**Aplicable a:** RF-001 (ASK_FOR_PRICES)

**Cálculo de exposición actual:**

El cálculo se realiza directamente en la base de datos APE consultando la tabla transactions, ya que cada reserva incluye el client_id del cliente que la originó.

RFQ API consulta el endpoint GET /v1/ape/clients/{client_id}/exposure para obtener el current_open_exposure antes de validar si puede crear una nueva reserva.

sql

current_open_exposure \= SUM(transactions.amount  
 WHERE client_id \= 'cli_001'  
 AND type\='FUNDS_RESERVE'  
 AND status\='reserved'  
 AND expires_at \> CURRENT_TIMESTAMP  
)

**Validación antes de emitir pre-quote:**

current_open_exposure \+ nuevo_reserve_amount \<= max_open_exposure

**Precedencia de max_open_exposure:**

1. client.max_open_exposure (si está definido, override explícito)
2. group.max_open_exposure (si cliente pertenece a grupo y no tiene override)
3. NULL (sin límite definido): permitir operación sin restricción

**Error si se excede:** EXPOSURE_LIMIT_EXCEEDED

**Implicación:** Si un cliente alcanza su límite, debe esperar a que sus pre-quotes expiren (reversión automática: RESERVED → REVERTED) o sean aceptadas/rechazadas (RESERVED → EXECUTED/REVERTED) antes de solicitar nuevas cotizaciones.

**Nota:** Este límite NO es transaccional (no aplica a operaciones ya ejecutadas), solo a capital "en tránsito" en pre-quotes activas.

–---------------------------------------------------------------------

## RN-012: Expiración automática de FUNDS_RESERVEs

**Enunciado:** APE ejecuta job periódico para expirar FUNDS_RESERVEs automáticamente.

**Configuración sugerida:**

- expiration_job_interval_seconds: 5
- expiration_job_batch_size: 100

**Aplicable a:** RF-200 (Expiración automática)

**Proceso**:

1. Job ejecuta cada expiration_job_interval_seconds
2. Query con lock pesimista  
   sql

   SELECT \* FROM transactions  
   WHERE type \= 'FUNDS_RESERVE'

   AND status \= 'RESERVED'  
   AND expires_at \< NOW()

   FOR UPDATE SKIP LOCKED  
   LIMIT batch_size;

3. Para cada reserva encontrada: Transicionar RESERVED → REVERTED \+ UPDATE snapshot \+ UPDATE pre_quote
4. El lock \`SKIP LOCKED\` previene conflictos con ACCEPTs concurrentes

**Implicación:** Una reserva puede permanecer "expirada" hasta expiration_job_interval_seconds antes de ser revertida, pero la validación de grace_period en ACCEPT lo previene.

**Alcance:** Específico de Swap (v1.0). Payment tendrá su propio mecanismo (v2.0).

–---------------------------------------------------------------------

## RN-013: Toda expiración revierte stock

**Enunciado:** No existen reservas "colgadas". Toda reserva (tipo FUNDS_RESERVE) expira transitando a estado REVERTED.

**Aplicable a:** RF-200 (Expiración automática)

**Garantía:** El sistema garantiza que cada reserva termina exactamente en uno de dos estados terminales:

- EXECUTED (cliente aceptó)
- REVERTED (cliente rechazó o expiró)

–---------------------------------------------------------------------

## RN-014: Actualización optimista de snapshots

**Enunciado:** Toda modificación de un snapshot debe validar la versión esperada y registrar la versión aplicada en la transacción.

**Mecanismo:**

1. Leer snapshot.version actual con FOR UPDATE NOWAIT
2. Validar invariantes de negocio (available, reserved, executed)
3. Intentar UPDATE con condición WHERE version \= expected_version
4. Si rows_affected \= 0 → conflicto de versión
5. Reintentar hasta max_retries (típicamente 3\)
6. Si éxito → registrar transactions.applied_version \= new_version

**Aplicable a:** RF-100 (Registrar Entrada de Fondos), RF-101 (Registrar Salida de Fondos), operaciones de reserva de APE

**Política de retry:**

- Max retries: 3
- Backoff: exponencial (10ms, 20ms, 40ms)
- Solo retry en conflictos de versión
- Errores de validación de negocio no se retrian

**Errores:**

- VERSION_CONFLICT: Falló después de max_retries

---

# 9\. CASOS DE USO {#9.-casos-de-uso}

**Nota:** Todos los casos de uso documentados en esta sección corresponden a operaciones de tipo **swap** (v1.0). Los casos de uso para operaciones de tipo **payment** serán documentados en v2.0.

## UC-001: Cliente solicita y acepta swap exitosamente

**Actor:** Cliente (Retail/API)

**Flujo principal:**

1. Cliente accede al Workspace
2. Cliente selecciona par: USDC/ARS, side: BUY, amount: 40,000,000 ARS
3. Cliente clic en \[Get Quote\]
4. Sistema construye pre-quote:
   - Consulta lotes elegibles
   - Construye 2 price?lines (ARDUA: 5,000 USDC, BINANCE: 21,274 USDC)
   - Aplica BPS del cliente (12 bps)
   - Valida precio vs TradingView
   - Ejecuta reservas (tipo FUNDS_RESERVE, status RESERVED) en ambos lotes.
   - Genera token con TTL 30s
5. Sistema muestra pre-quote:
   - Precio: 1,522.038 ARS/USDC
   - Amount: 26,274.51 USDC
   - Timer: 30s countdown
6. Cliente revisa y clic en \[Accept\] (20s restantes)
7. Sistema valida token (firma, TTL, binding, anti-replay)
8. Sistema crea quote en Quote Module
9. Quote Module retorna quote_id: q_7781
10. Sistema ejecuta transición de reservas en ambos lotes (RESERVED → EXECUTED, marcar como inmutables)
11. Sistema confirma al cliente:
    - "Swap confirmed successfully, Quote ID: q_7781"
    - "Status: Pending Settlement"
    - "Physical settlement will be processed by Trading Desk during business hours"
12. Cliente recibe email con detalles de la operación confirmada
13. **Al día siguiente (T+1):** Ambas partes ejecutan transferencias físicas durante horario hábil.
14. El Cliente recibe notificación de liquidación completada (vía msg, email/webhook futuro) o puede ver el estado de la transacción en la plataforma(app.arduasolutions.com).

**Postcondiciones:**

- Quote persistida con status CONFIRMED
- Stock ejecutado contablemente en lotes (transacciones tipo FUNDS_RESERVE en estado EXECUTED, inmutables)
- Operación confirmada y pendiente de liquidación física
- Cliente debe esperar horario hábil para recibir/enviar activos reales
-

–---------------------------------------------------------------------

## UC-002: Pre-quote expira sin acción del cliente

**Actor:** Cliente, Sistema

**Flujo principal:**

1. Cliente solicita cotización (igual pasos 1-5 de UC-001)
2. Timer llega a 0s sin acción del cliente
3. Job automático del sistema detecta reservas expiradas (tipo FUNDS_RESERVE, status RESERVED, expires_at \< NOW())
4. Sistema ejecuta REVERT automático:
   - Transiciona reservas: RESERVED → REVERTED
   - Actualiza snapshots (reserved → available)
   - Marca pre-quote como EXPIRED
5. Web App muestra mensaje: "Quote expired, please request a new quote"
6. Cliente puede solicitar nueva cotización

**Postcondiciones:**

- Stock liberado automáticamente
- Pre-quote marcada EXPIRED
- Sin intervención manual

–---------------------------------------------------------------------

## UC-003: Mesa fondea lote al inicio del día

**Actor:** Mesa Trader

**Flujo principal:**

1. Trader transfiere 100,000 USDC a wallet de Ardua (blockchain)
2. Trader espera confirmación de tx (12 confirmaciones)
3. Trader accede a Admin Panel
4. Trader navega a Dashboard → selecciona lote: lot_gps_ardua_usdc_ars_01
5. Trader clic en \[View Details\]
6. En sección "Funding Actions", trader clic en \[Fund Lot\]
7. Trader ingresa:
   - Amount: 100,000
   - External Reference: 0x1234abcd... (hash de tx)
   - Reason: "Initial funding for trading day"
8. Trader clic en \[Confirm Funding\]
9. Sistema valida:
   - amount \> 0 ✓
   - fondeo_total \+ 100,000 \<= max_capacity ✓
10. Sistema ejecuta ADD:
    - INSERT transaction (tipo=FUNDS_IN, status=SETTLED, is_immutable=TRUE, operator_id=trader_john)
    - UPDATE snapshot (available \+= 100,000, version \+= 1)
11. Sistema confirma: "Lot funded successfully. New available: 100,000 USDC"
12. Dashboard muestra lote con capacidad actualizada

**Postcondiciones:**

- Lote tiene 100,000 USDC disponibles
- Puede usarse en allocations
- Transacción auditada en ledger

–---------------------------------------------------------------------

## UC-004: Mesa retira exceso de fondeo al final del día

**Actor:** Mesa Trader

**Precondiciones:**

- Lote tiene available: 80,000 USDC
- Lote tiene reserved: 0 USDC (todos los FUNDS_RESERVES expiraron)
- Utilization: 20% (bajo uso)

**Flujo principal:**

1. Trader revisa Dashboard (18:00)
2. Trader identifica lote con baja utilización
3. Trader decide retirar 60% del available (48,000 USDC)
4. Trader accede a detalle de lote
5. Trader clic en \[Retire Funds\]
6. Sistema muestra: "Max retirable: 80,000 USDC"
7. Trader ingresa:
   - Amount: 48,000
   - Reason: "End-of-day rebalancing \- excess capacity"
8. Trader clic en \[Confirm Retirement\]
9. Sistema valida:
   - amount \> 0 ✓
   - 48,000 \<= 80,000 ✓
   - reason IS NOT NULL ✓
   - 48,000 \< threshold (no requiere aprobación) ✓
10. Sistema ejecuta reguistro:
    - INSERT transaction (tipo=FUNDS_OUT, status=SETTLED, is_immutable=TRUE, operator_id=trader_john)
    - UPDATE snapshot (available \-= 48,000, version \+= 1)
11. Sistema confirma: "Retirement successful. New available: 32,000 USDC"
12. Trader ejecuta transferencia manual de 48,000 USDC desde wallet

**Postcondiciones:**

- Lote tiene 32,000 USDC disponibles
- Fondos disponibles para otras operaciones
- Transacción auditada

–---------------------------------------------------------------------

## UC-005: Cliente solicita cotización con cobertura parcial

**Actor:** Cliente

**Flujo principal:**

1. Cliente solicita cotización:
   1. Pair: USDC/ARS
   2. Side: BUY
   3. Amount: 100,000,000 ARS (monto alto)
2. RFQ API consulta APE para allocations
3. APE evalúa lotes:
   1. Filtra por USDC/ARS/BUY
   2. Aplica elegibilidad (RN-007):
      1. Lote ARDUA: available 5,000 USDC → cumple threshold (1,000) → ELEGIBLE
      2. Lote BINANCE: available 10,000 USDC → cumple threshold (1,000) → ELEGIBLE
      3. Lote BYMA: available 800 USDC → NO cumple threshold (1,000) → INELEGIBLE
   3. Calcula cobertura:
      1. Lote ARDUA: 5,000 USDC \* 1,490 \= 7,450,000 ARS
      2. Lote BINANCE: 10,000 USDC \* 1,532 \= 15,300,000 ARS
   4. Total cubierto: 22,750,000 ARS (22.75%)
   5. Pending: 77,250,000 ARS (77.25%)
4. APE retorna 200 OK:
   1. allocations: \[ARDUA, BINANCE\]
   2. covered_quote_asset_amount: 22,750,000
   3. pending_quote_asset_amount: 77,250,000
5. RFQ API evalúa: covered \> 0 → pre-quote VÁLIDA (cobertura parcial)
6. RFQ API crea pre-quote y ejecuta reservas (tipo FUNDS_RESERVE, status RESERVED)
7. Sistema retorna pre-quote al cliente:
   1. covered: 22,750,000 ARS
   2. pending: 77,250,000 ARS
   3. coverage_percentage: 22.75%
8. Web App muestra: "Partial coverage: 22.75% of requested amount available. You can accept this quote or request a smaller amount for better coverage."
9. Cliente decide:
   1. Opción A: Acepta cobertura parcial → recibe \~14,950 USDC
   2. Opción B: Rechaza y solicita nuevo quote con 22,000,000 ARS para cobertura completa

**Postcondiciones:**

- Pre-quote creada exitosamente (200 OK)
- Cobertura parcial es válida y aceptable
- Cliente informado del porcentaje de cobertura
- Cliente puede aceptar o ajustar monto

–---------------------------------------------------------------------

## UC-006: Cliente solicita cotización sin liquidez disponible

**Actor:** Cliente

**Precondiciones:**

- Todos los lotes tienen available \< min_lot_available_threshold configurado
- O todos los lotes están fuera de horario operativo

**Flujo principal:**

1. Cliente solicita cotización:
   - Pair: USDC/ARS
   - Side: BUY
   - Amount: 50,000,000 ARS
2. RFQ API consulta APE para allocations
3. APE evalúa lotes:
   - Filtra por USDC/ARS/BUY → encuentra 5 lotes
   - Aplica elegibilidad (RN-007):
     - Lote A: available 800 USDC \< threshold 1,000 → INELEGIBLE
     - Lote B: available 500 USDC \< threshold 1,000 → INELEGIBLE
     - Lote C: available 300 USDC \< threshold 1,000 → INELEGIBLE
     - Lote D: status SUSPENDED → INELEGIBLE
     - Lote E: fuera de weekly_windows → INELEGIBLE
   - Lotes elegibles: 0
   - covered_quote_asset_amount: 0
4. APE retorna 200 OK:
   - allocations: \[\]
   - covered_quote_asset_amount: 0
   - pending_quote_asset_amount: 50,000,000
5. RFQ API evalúa: covered \= 0 → Error 400 NO_LIQUIDITY_AVAILABLE
6. Sistema retorna error al cliente:  
   json  
   {  
    "error": "NO_LIQUIDITY_AVAILABLE",  
    "message": "No liquidity available to cover any portion of the requested amount",  
    "details": {  
    "requested_quote_asset_amount": 50000000,  
    "covered_quote_asset_amount": 0,  
    "eligible_lots_count": 0,  
    "total_lots_evaluated": 5,  
    "ineligibility_summary": {  
    "BELOW_MIN_AVAILABLE_THRESHOLD": 3,  
    "SUSPENDED": 1,  
    "OUTSIDE_WEEKLY_WINDOWS": 1  
    }  
    }  
   }
7. Web App muestra: "No liquidity available at this time. Please try a smaller amount or check back during business hours."  
   **Flujo alternativo (Alerta a Mesa):**
8. Si se reciben \>10 requests con NO_LIQUIDITY_AVAILABLE en 5 minutos
9. Sistema dispara ALERT\-004
10. Mesa revisa:
    - Fondear lotes para superar threshold
    - Ajustar threshold si es demasiado alto
    - Activar lotes suspendidos

Postcondiciones:

- Pre-quote NO creada
- Sin FUNDS_RESERVEs ejecutados
- Cliente informado de falta de liquidez
- Mesa alertada si el problema es recurrente

–---------------------------------------------------------------------

## UC-007: Cliente alcanza límite de exposición abierta

**Actor:** Cliente

**Precondiciones:**

- Cliente tiene max_open_exposure \= 50,000 USDC configurado
- Cliente ya tiene pre-quotes activas con reservas por 45,000 USDC (tipo FUNDS_RESERVE, status RESERVED)

**Flujo principal:**

1. Cliente solicita nueva cotización:
   - Pair: USDC/ARS
   - Side: BUY
   - Amount: 10,000,000 ARS (equivalente a \~6,500 USDC)
2. RFQ API consulta configuración del cliente:
   - max_open_exposure: 50,000 USDC
   - exposure_source: "CLIENT"
3. RFQ API calcula exposición actual:  
   sql  
    SELECT SUM(amount) FROM transactions  
    WHERE type\='FUNDS_RESERVE' AND status\='RESERVED'  
    AND reference_id IN (  
    SELECT pre_quote_id FROM pre_quotes  
    WHERE client_id\='cli_001' AND status\='ISSUED'  
    )

- Resultado: current_open_exposure \= 45,000 USDC

4. RFQ API consulta APE y calcula nueva cotización:
   - Nuevo monto a FUNDS_RESERVE: 6,500 USDC
5. RFQ API valida límite de exposición:
   - 45,000 \+ 6,500 \= 51,500 USDC
   - 51,500 \> 50,000 → LÍMITE EXCEDIDO
6. Sistema retorna error:  
   json  
    {  
    "error": "EXPOSURE_LIMIT_EXCEEDED",  
    "message": "Current open exposure exceeds limit",  
    "details": {

   "current_exposure": 45000.00,  
   "exposure_currency": "USDC",  
   "requested_amount_equivalent": 26274.00,  
   "max_exposure": 50000.00,  
   "available_capacity": 5000.00,  
   "suggested_max_amount": 7500000, "suggested_max_amount_currency": "ARS"

   }  
    }

7. Web App muestra: "You have reached your maximum open exposure limit. Please wait for pending quotes to expire or be executed."

**Flujo alternativo (cliente espera expiración):**

8. Cliente espera 30 segundos
9. Pre-quote más antigua expira → Reversión automática: transiciones RESERVED → REVERTED (libera 15,000 USDC)
10. Cliente reintenta solicitud
11. Sistema valida: 30,000 \+ 6,500 \= 36,500 \< 50,000 ✓
12. Cotización emitida exitosamente

**Postcondiciones:**

- Cliente informado del límite
- Pre-quote NO creada
- Sin FUNDS_RESERVEs ejecutados

---

# 10\. INVARIANTES DEL SISTEMA {#10.-invariantes-del-sistema}

**Clasificación por alcance:**

- **Invariantes comunes (todos los tipos de operación):** \- \[Ninguno actualmente \- todos son específicos de swap\]
- **Invariantes específicos del Swap Module:** \- INV-001 a INV-007 (todos los actuales)
- **Invariantes específicos del Payment Module:** \- \[Serán definidos en v2.0\]

## 10.1 Invariantes de Exposición al Cliente

### INV-001: El cliente nunca ve price_lines

**Verificación:** Response de ASK_FOR_PRICES no contiene campo price_lines

**Garantía:** El campo price_lines es interno de RFQ API. El cliente solo recibe:

- Precio agregado final
- Monto cubierto/pendiente
- Coverage percentage

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### INV-002: El cliente no participa en ejecución

**Verificación:** Cliente solo envía ACCEPT, no controla transición de estados de reservas

**Garantía:** La transición RESERVED → EXECUTED es ejecutada por APE tras recibir webhook de RFQ API, no por acción directa del cliente.

**Alcance:** Swap Module.

---

## 10.2 Invariantes de Pre-Quotes

### INV-003: Toda pre-quote emitida se persiste

**Verificación:** Existe row en quotations.pre_quotes por cada pre-quote

**Query de validación:**

sql  
_\-- Toda pre-quote retornada al cliente debe existir en DB_  
SELECT COUNT(\*) FROM pre_quotes  
WHERE pre_quote_id \= 'pq_abc123'  
_\-- Debe retornar 1_

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### INV-004: Toda pre-quote válida tiene reservas

**Verificación:** Si pre_quote.status \= ISSUED → existe(n) reserva(s) (tipo FUNDS_RESERVE, status RESERVED o terminal) en allocation.transactions

**Query de validación:**

sql  
_\-- Toda pre-quote ISSUED debe tener al menos una reserva_  
SELECT pq.pre_quote_id  
FROM pre_quotes pq  
WHERE pq.status \= 'ISSUED'  
 AND NOT EXISTS (  
 SELECT 1 FROM allocations a  
 WHERE a.pre_quote_id \= pq.pre_quote_id  
 AND a.reserve_tx_id IS NOT NULL  
 )  
_\-- Debe retornar 0 rows_

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### INV-005: Una pre-quote es inmutable

**Verificación:** Campos de monto/precio no cambian después de \`created_at\`

**Garantía:**

- requested_quote_asset_amount\`
- covered_quote_asset_amount
- pending_quote_asset_amount
- base_asset_amount
- reference_price_num_quote_asset_u
- reference_price_den_base_asset_u

Estos campos NO tienen UPDATE en el código de aplicación después de INSERT.

**Alcance:** Swap Module.

---

## 10.3 Invariantes de Pricing

### INV-006: La fuente de verdad del precio es racional

**Verificación:** reference_price_num_quote_asset_u / reference_price_den_base_asset_u es canónico

**Garantía:** price_display es derivado del precio racional, no al revés.

**Cálculo:** price_display \= reference_price_num_quote_asset_u / reference_price_den_base_asset_u

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### INV-007: BPS se aplican por price_lines

**Verificación:** Cada row en quotations.price_lines tiene applicable_bps y final_price

**Query de validación:**

sql

_\-- Toda allocation debe tener BPS aplicado_  
SELECT COUNT(\*) FROM allocations  
WHERE applicable_bps IS NULL OR final_price IS NULL  
_\-- Debe retornar 0_

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### INV-008: El precio no se recalcula al aceptar

**Verificación:** ACCEPT usa pre_quote persistida, no recalcula

**Garantía:** Durante ACCEPT_PRE_QUOTE:

1. Se consulta pre-quote de DB
2. Se envía a Quote Module
3. NO se consulta APE nuevamente
4. NO se recalcula BPS

---

## 10.4 Invariantes de Stock y Ledger

### INV-009: La moneda del lote es lots.base_asset

**Verificación:** transactions.amount y snapshots.{available,reserved,executed} en misma unidad que lots.base_asset

**Garantía:** Todas las operaciones en un lote (FUNDS_IN, FUNDS_OUT, FUNDS_RESERVE) usan la misma unidad monetaria: el base_asset del lote.

**Ejemplo:**

- Lote: base_asset \= USDC
- Todas las transacciones: amount en USDC
- Snapshot: available, reserved, executed en USDC

–---------------------------------------------------------------------

### INV-010: El ledger es inmutable en estados terminales

**Verificación:** No existe UPDATE en allocation.transactions donde is_immutable \= TRUE

**Garantía:**

- Transacciones tipo FUNDS_IN y FUNDS_OUT nacen con status \= SETTLED y is_immutable \= TRUE
- Transacciones tipo FUNDS_RESERVE se marcan como is_immutable \= TRUE al alcanzar estado terminal (REVERTED o EXECUTED)
- Triggers de base de datos previenen cualquier UPDATE en transacciones donde is_immutable \= TRUE

**Query de validación:**

sql  
_\-- Verificar que transacciones terminales están marcadas como inmutables_  
SELECT COUNT(\*) FROM transactions  
WHERE (  
 (type IN ('FUNDS_IN', 'FUNDS_OUT') AND status \= 'SETTLED')  
 OR  
 (type \= 'FUNDS_RESERVE' AND status IN ('REVERTED', 'EXECUTED'))  
)  
AND is_immutable \= FALSE  
_\-- Debe retornar 0_

–---------------------------------------------------------------------

### INV-011: Una reserva termina exactamente una vez

**Verificación:** Para cada reserva encontrada (tipo FUNDS_RESERVE) → existe (EXECUTED ⊕ REVERTED) pero no ambos

**Garantía:** Cada reserva puede estar en uno de tres estados:

- RESERVED: activa, puede transitar
- EXECUTED: terminal, inmutable
- REVERTED: terminal, inmutable

Una rese rva NO puede estar simultáneamente en EXECUTED y REVERTED.

**Query de validación:**

sql  
_\-- Verificar que no existen reservas en múltiples estados terminales_  
SELECT COUNT(\*) FROM transactions  
WHERE type \= 'FUNDS_RESERVE'  
 AND status NOT IN ('RESERVED', 'REVERTED', 'EXECUTED')  
_\-- Debe retornar 0_

---

## 10.5 Invariantes de Fondeo

### INV-100: Fondeo total

**Verificación:**

sql  
fondeo_total \=  
 SUM(transactions WHERE type\='FUNDS_IN' AND status\='SETTLED') \-  
 SUM(transactions WHERE type\='FUNDS_OUT' AND status\='SETTLED')

**Garantía:** El fondeo total de un lote es la diferencia entre todas las entradas y salidas de fondos confirmadas.

–---------------------------------------------------------------------

### INV-101: Balance de snapshot

**Verificación:**

snapshot.available \+ snapshot.reserved \+ snapshot.executed \= fondeo_total

**Garantía:** La suma de los tres componentes del snapshot debe ser igual al fondeo total calculado.

**Query de validación:**

sql  
_\-- Para cada lote, verificar invariante de balance_  
SELECT  
 lot_id,  
 available \+ reserved \+ executed AS snapshot_sum,  
 (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= s.lot_id AND type \= 'FUNDS_IN' AND status \= 'SETTLED'  
 ) \- (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= s.lot_id AND type \= 'FUNDS_OUT' AND status \= 'SETTLED'  
 ) AS fondeo_total  
FROM snapshots s  
WHERE available \+ reserved \+ executed \!= (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= s.lot_id AND type \= 'FUNDS_IN' AND status \= 'SETTLED'  
) \- (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= s.lot_id AND type \= 'FUNDS_OUT' AND status \= 'SETTLED'  
)  
_\-- Debe retornar 0 rows_

–---------------------------------------------------------------------

### INV-102: Restricción de registro de salida

**Verificación:** Para toda transacción FUNDS_OUT: amount \<= snapshot.available al momento de INSERT

**Garantía:** La validación ocurre ANTES del INSERT. Si falla, la transacción no se crea.

–---------------------------------------------------------------------

### INV-103: Capacidad máxima

**Verificación:** Para toda transacción FUNDS_IN: fondeo_total \+ amount \<= lot.metadata.limits.max_capacity

**Garantía:** La validación ocurre ANTES del INSERT. Si falla, la transacción no se crea.

–---------------------------------------------------------------------

### INV-104: Lote activo requiere fondeo

**Verificación:** Si lot.status \= ACTIVE → fondeo_total \> 0

**Query de validación:**

sql  
_\-- Verificar que lotes ACTIVE tienen fondeo_  
SELECT l.id, l.status  
FROM lots l  
WHERE l.status \= 'ACTIVE'  
 AND (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= l.id AND type \= 'FUNDS_IN' AND status \= 'SETTLED'  
 ) \- (  
 SELECT COALESCE(SUM(amount), 0) FROM transactions  
 WHERE lot_id \= l.id AND type \= 'FUNDS_OUT' AND status \= 'SETTLED'  
 ) \<= 0  
_\-- Debe retornar 0 rows_

---

## 10.6 Invariantes de Expiración

### INV-012: RFQ API no maneja expiraciones

**Verificación:** No existe cron/scheduler en RFQ API para expirar reservas

**Garantía:** La expiración de reservas es responsabilidad exclusiva de APE Service mediante job automático.

–---------------------------------------------------------------------

### INV-013: Toda expiración revierte stock

**Verificación:** No existe reserva (tipo FUNDS_RESERVE, status RESERVED) con expires_at \< NOW() por más de expiration_job_interval_seconds \+ 5s

**Garantía:** El job de expiración corre cada 5 segundos, procesando reservas expiradas y transitándolas a REVERTED.

**Query de validación:**

sql  
_\-- Verificar que no hay reservas expiradas sin procesar (tolerancia de 10s)_  
SELECT COUNT(\*) FROM transactions  
WHERE type \= 'FUNDS_RESERVE'  
 AND status \= 'RESERVED'  
 AND expires_at \< CURRENT_TIMESTAMP \- INTERVAL '10' SECOND  
_\-- Debe retornar 0 (o muy pocos durante ventanas de ejecución del job)_

---

## 10.7 Invariantes de Trazabilidad

### INV-018: Todo es correlacionable

**Verificación:** Existe chain: rfq_id → pre_quote_id → quote_id → reserve_tx_id

**Garantía:** Toda operación puede rastrearse desde el request inicial hasta la transacción final:

1. Cliente hace request (rfq_id implícito)
2. Se crea pre-quote (pre_quote_id)
3. Se crean allocations con referencias a reservas (reserve_tx_id)
4. Cliente acepta → se crea quote (quote_id)
5. Reservas transicionan a EXECUTED

**Query de ejemplo:**

sql  
_\-- Trazar operación completa desde FUNDS_RESERVE hasta Quote_  
SELECT  
 t.id AS reserve_tx_id,  
 t.type,  
 t.status AS reserve_status,  
 t.reference_type,  
 t.reference_id AS pre_quote_id,  
 t.client_id, pq.status AS prequote_status,  
 pq.quote_id,  
 pq.client_id AS pq_client_id  
FROM allocations.transactions t  
JOIN quotations.pre_quotes pq ON pq.pre_quote_id \= t.reference_id  
WHERE t.type \= 'FUNDS_RESERVE'  
AND t.id \= 'tx_reserve_001';

**Nota:** Este query es cross-database pero solo para fines de auditoría/análisis post-facto, no para cálculos operativos en tiempo real.

–---------------------------------------------------------------------

### INV-019: El sistema es auditable end-to-end

**Verificación:** Desde ASK_FOR_PRICES hasta transición de estados, todos los pasos están registrados con timestamps

**Garantía:** Tablas de auditoría:

- pre_quotes: created_at, updated_at
- allocations: created_at
- transactions: created_at, became_immutable_at
- state_logs: changed_at (para transiciones de reservas)

---

# 11\. INTEGRACIONES {#11.-integraciones}

## 11.1 Integración: Quote Module (TRD)

**Propósito:** Persistencia de quotes definitivas.

**Tipo:** HTTP REST

**Endpoint consumido:**

- POST /quotes

**Contrato (Request):**

json

{  
 "client_id": "cli_001",  
 "pre_quote_id": "pq_123",  
 "operation_type": "swap",  
 "pair": "USDC/ARS",  
 "side": "BUY",  
 "base_asset": "USDC",  
 "quote_asset": "ARS",  
 "summary": {  
 "requested_quote_asset_amount": 40000000,  
 "covered_quote_asset_amount": 40000000,  
 "pending_quote_asset_amount": 0,  
 "base_asset_amount": 26274.51,  
 "reference_price": {  
 "num_quote_asset_u": 40000000000000,  
 "den_base_asset_u": 26274510000  
 },  
 "price": 1522.038  
 },  
 "price_lines": \[  
 {  
 "price_line_id": "alc_001",  
 "lot_id": "lot_gps_ardua_01",  
 "context": "GLOBAL_PRICE_SETUP",  
 "provider": "ARDUA",  
 "covered_base_asset_amount": 5000,  
 "covered_quote_asset_amount": 7450000,  
 "reserve_tx_id": "tx_reserve_001",  
 "price": 1490,  
 "final_price": 1491.788  
 }  
 \]  
}

**Contrato (Response):**

json

{  
 "quote_id": "q_7781",  
 "status": "CREATED",  
 "created_at": "2026-01-29T15:00:15-03:00"  
}

**Códigos de respuesta esperados:**

- **201 Created:** Quote creada exitosamente
- **400 Bad Request:** Validación de datos fallida
- **409 Conflict:** Quote duplicada (por pre_quote_id)
- **500 Internal Server Error:** Error interno

**Timeout:** 2 segundos

**Retry policy:** 3 reintentos con backoff exponencial

**Idempotencia:** Sí (por pre_quote_id)

**Equipo responsable:** Quote Module Team

---

## 11.2 Integración: Client Module (LEX, requiere ajustes)

**Propósito:** Gestión de clientes y configuración de BPS.

**Nota sobre BPS:** El campo \`applicable_bps\` es específico de operaciones swap. En v2.0, cuando se implemente payment, Client Module deberá manejar configuraciones separadas por tipo de operación, aunque max_open_exposure seguirá siendo común.

**Tipo:** HTTP REST

**Cambios requeridos:**

**A) Nuevo endpoint: GET client configuration**

**Endpoint:** GET /clients/{client_id}/configuration

**Response esperado:**

json

{  
 "client_id": "cli_001",  
 "group_id": "grp_01",  
 "applicable_bps": 12,  
 "bps_source": "CLIENT",  
 "max_open_exposure": 100000.00,  
 "exposure_source": "CLIENT"  
}

**Campos:**

- applicable_bps: BPS efectivo (puede venir de cliente o grupo)
- bps_source: "CLIENT" | "GROUP" | "UNDEFINED"
- max_open_exposure: Límite de capital en órdenes abiertas/RESERVED (puede venir de cliente o grupo)
- exposure_source: "CLIENT" | "GROUP" | "UNDEFINED"

**Regla de precedencia para BPS:**

1. client.applicable_bps (override explícito)
2. group.applicable_bps
3. null (undefined, no frena flujo pero dispara observabilidad)

**Regla de precedencia para max_open_exposure:**

1. client.max_open_exposure (override explícito)
2. group.max_open_exposure
3. null (sin límite)

**B) Endpoint para configurar BPS: PATCH /clients/{id}/pricing**

**Request:**

json

{  
 "applicable_bps": 12,  
 "group_id": "grp_01"  
}

**Response:**

json

{  
 "client_id": "cli_001",  
 "applicable_bps": 12,  
 "group_id": "grp_01",  
 "effective_bps": 12,  
 "source": "CLIENT"  
}

**C) Gestión de grupos**

**Endpoints:**

- GET /groups \- Listar grupos
- POST /groups \- Crear grupo
- PATCH /groups/{id} \- Editar grupo

**Modelo de Grupo:**

json

{  
 "group_id": "grp_01",  
 "name": "Premium Clients",  
 "applicable_bps": 20  
}

**D) Cambios en base de datos de Client Module**

**Tabla: clients (agregar columnas)**

- group_id (UUID, nullable, FK a groups)
- applicable_bps (INT, nullable, override)
- max_open_exposure (NUMERIC(20,10), nullable, override \- límite de capital en órdenes abiertas)

**Nueva tabla: groups**

- id (UUID, PK)
- name (TEXT, NOT NULL)
- applicable_bps (INT, NOT NULL)
- max_open_exposure (NUMERIC(20,10), nullable, límite default para miembros del grupo)
- created_at (TIMESTAMP)

**Definiciones:**

- max_open_exposure: Capital máximo que puede estar en reservas activas (tipo FUNDS_RESERVE, status RESERVED). Representa el monto total en pre-quotes activas (ISSUED) que aún no han sido aceptadas ni ejecutadas.
- Se expresa en unidades de base_asset (ej: USDC)

**Invariantes:**

- Un cliente puede pertenecer a un solo grupo.

**Precedencia de max_open_exposure:**

1. client.max_open_exposure (si está definido, override explícito)
2. group.max_open_exposure (si cliente pertenece a grupo y no tiene override)
3. NULL (sin límite)

**Equipo responsable:** Client Module Team

---

## 11.3 Integración: Market Reference

**Propósito:** Validación de precio vs mercado neutral.

**Tipo:** HTTP REST (externo)

**Endpoint:** Consultar precio de referencia de un par

**Uso:** APE consulta precio de mercado para validar que el precio agregado de allocations no se desvía excesivamente.

**Timeout:** 1 segundo.

**Retry policy:** 2 reintentos.

**Fallback:** Si falla, registrar warning pero continuar (no bloquear cotización).

**Caché:** 5 segundos en Redis.

**Alcance:** Esta integración es específica de operaciones swap. Payment no requiere validación vs Market Reference ya que usa FX rates \+ fees fijos.

---

## 11.4 Integración: Binance API (Price Provider)

**Propósito:** Obtener precios operativos para lotes PRICE_PROVIDER_SETUP.

**Tipo:** HTTP REST (externo)

**Endpoints consultados:**

- Orderbook (para best_ask, best_bid)
- Ticker (para last)

**Timeout:** 1 segundo

**Retry policy:** 2 reintentos con circuit breaker

**Circuit breaker:**

- Threshold: 3 failures consecutivos
- Cooldown: 60 segundos

**Caché:** 5 segundos en Redis

**Fallback:** Si falla, excluir lote de allocations

---

## 11.5 Integración: BYMA API (Price Provider)

Similar a Binance, con configuraciones específicas de BYMA.

**Horario operativo:** Lunes a Viernes, 11:00 \- 17:00 (AR time)

---

## 11.6 Integración: Bitso API (Price Provider)

Similar a Binance y BYMA.

---

# 12\. CONSIDERACIONES OPERATIVAS {#12.-consideraciones-operativas}

## 12.1 Rate Limiting

**Propósito:** Proteger el sistema de sobrecarga y abuso.

**Configuración por endpoint:**

| Endpoint         | Límite por Cliente | Burst |
| :--------------- | :----------------- | :---- |
| ASK_FOR_PRICES   | 10 req/s           | 20    |
| ACCEPT_PRE_QUOTE | 5 req/s            | 10    |
| REJECT_PRE_QUOTE | 5 req/s            | 10    |

**Implementación:** Token bucket con Redis

**Respuesta al exceder límite:**

json

{  
 "error": "RATE_LIMIT_EXCEEDED",  
 "retry_after": 1  
}

HTTP 429 Too Many Requests

---

## 12.2 Idempotencia

**Propósito:** Permitir reintentos seguros ante fallas de red.

**Mecanismos:**

1. **idempotency_key (cliente):**
   - Cliente envía en request (opcional)
   - RFQ API cachea resultado por 24h
   - Reintentos con mismo key retornan resultado cacheado
2. **jti (token):**
   - Claim en token para anti-replay
   - Cacheado en Redis por 60s
   - Previene ataques de replay de tokens robados

**Coexistencia:** idempotency_key permite reintentos legítimos, jti previene ataques.

---

## 12.3 Observabilidad

### 12.3.1 Stack de Observabilidad

- **Exportación de métricas:** Formato Prometheus (endpoints /metrics)
- **Recolección y almacenamiento:** Prometheus (scraping cada 15s)
- **Visualización:** Grafana (dashboards interactivos)
- **Alerting:** Prometheus Alertmanager \+ Grafana Alerts

### 12.3.2 Métricas a instrumentar

**1\. Pre-Quote Metrics:**

- prequotes_created_total{client_id, pair, side} (counter)
- prequotes_accepted_total{client_id, pair} (counter)
- prequotes_rejected_total{client_id, pair} (counter)
- prequotes_expired_total{client_id, pair} (counter)
- prequote_acceptance_rate{client_id, pair} (gauge, 0-100%)
- prequote_ttl_remaining_seconds{pre_quote_id} (gauge)

**2\. Allocation Metrics:**

- lot_available_balance{lot_id, provider, asset} (gauge)
- lot_reserved_balance{lot_id, provider, asset} (gauge)
- lot_executed_balance{lot_id, provider, asset} (gauge)
- lot_utilization_rate{lot_id} (gauge, 0-100%)
- lot_available_balance{lot_id, provider, asset} (gauge)
- lot_reserved_balance{lot_id, provider, asset} (gauge)
- lot_executed_balance{lot_id, provider, asset} (gauge)
- lot_utilization_rate{lot_id} (gauge, 0-100%)
- lot_eligibility_evaluations_total{lot_id, result=eligible|ineligible, reason} (counter)
- lot_ineligible_by_threshold_total{lot_id, asset} (counter)

**3\. Funding Metrics:**

- funding_operations_total{type=ADD|RETIRE, lot_id, operator} (counter)
- funding_amount_total{type, lot_id, asset} (counter)

**4\. Price Provider Metrics:**

- price_provider_latency_seconds{provider} (histogram)
- price_provider_errors_total{provider, error_type} (counter)
- circuit_breaker_state{provider} (gauge: 0=CLOSED, 1=OPEN, 2=HALF_OPEN)

**5\. Configuration Metrics:**

- rfq_ttl_config_seconds{component=rfq_api} (gauge)
- grace_period_config_seconds{component=rfq_api} (gauge)
- expiration_job_interval_seconds{component=ape} (gauge)
- expiration_job_last_run_timestamp{component=ape} (gauge)
- expiration_job_reserves_processed{component=ape} (counter)

**6\. API Metrics:**

- http_requests_total{method, path, status} (counter)
- http_request_duration_seconds{method, path} (histogram)
- http_requests_in_flight{method, path} (gauge)

### 12.3.3 Dashboards de Grafana sugeridos:

**Dashboard 1: Operations Overview**

- KPIs globales (total liquidity, avg utilization, active lots)
- Pre-quotes por hora (created/accepted/rejected/expired)
- Top 5 clientes por volumen
- Conversion rate trends

**Dashboard 2: Liquidity Management**

- Capacity por lote (stacked bar: available/reserved/executed)
- Utilization heatmap por lote
- Funding operations timeline
- Alerts activas

**Dashboard 3: Price Providers Health**

- Circuit breaker states
- Latency percentiles (p50, p95, p99)
- Error rates por provider
- Cache hit ratio

**Dashboard 4: Client Analytics**

- Volumen por cliente
- Acceptance rate por cliente
- Exposición actual vs límite
- Rejected quotes por motivo

**Dashboard 5: System Health**

- API request rates (RPS)
- API latencies (p50, p95, p99)
- Database connection pool usage
- Redis cache performance

---

## 12.4 Alertas Operativas

### ALERT-001: Fondeo Insuficiente

- Trigger: \>10 requests con NO_LIQUIDITY_AVAILABLE en 5 min, o lotes con available \< 20% de max_capacity
- Destinatarios: Mesa traders
- Acción: Fondear lote

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### ALERT-002: Price Provider Down

- Trigger: Circuit breaker OPEN por \>5 minutos
- Destinatarios: Tech team, Mesa
- Acción: Revisar provider o excluir lote

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### ALERT-003: Alta Utilización de Lote

- Trigger: Utilization \> 90% por \>10 minutos
- Destinatarios: Mesa traders
- Acción: Considerar fondeo adicional

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### ALERT-004: Alta tasa de rechazo por falta de liquidez

- Trigger: \>10 errores NO_LIQUIDITY_AVAILABLE en 5 minutos, o \>30% de lotes evaluados inelegibles por BELOW_MIN_AVAILABLE_THRESHOLD durante 15 minutos
- Destinatarios: Mesa traders
- Acción:
  - Revisar disponibilidad actual de lotes:
    - Dashboard → vista de utilization por lote
    - Identificar lotes con available \< threshold
  - Opciones de resolución:
    - Fondear lotes existentes (RF\-100 ADD)
    - Ajustar threshold en config APE (\`min_lot_available_threshold\[asset\]\`) si es demasiado alto para la demanda actual ○ Crear lotes adicionales con diferentes thresholds para segmentar retail vs wholesale
  - Análisis recomendado:
    - Patrón de demanda: ¿Requests promedio vs threshold configurado?
    - Utilization: ¿Lotes con alta utilization necesitan más fondeo?
    - Temporalidad: ¿Problema recurrente en ciertos horarios?

**Ejemplo de diagnóstico:**

Métricas últimas 24h:

- Requests promedio: 15,000 USDC
- Threshold configurado: 5,000 USDC
- Lotes con available \< 5,000: 4 de 8 (50% inelegibles)
- Utilization promedio: 85% (alto)

Recomendación: Fondear 2-3 lotes para aumentar available \> 5,000 USDC

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### ALERT-005: Reservas Expiradas sin Procesar

- **Trigger:** \>50 reservas (tipo FUNDS_RESERVE, status RESERVED) con expires_at \< NOW() \- 15s
- **Destinatarios:** Tech team
- **Acción:**
  - Verificar que job de expiración está corriendo
  - Revisar logs de APE Service
  - Posible issue: job bloqueado o DB overload

**Alcance:** Swap Module.

–---------------------------------------------------------------------

### ALERT-006: Alto Volumen de Reversiones

- **Trigger:** \>40% de reservas terminan en REVERTED en última hora
- **Destinatarios:** Product team, Mesa
- **Acción:**
  - Analizar motivos:
    - CLIENT_REJECTED: problema de UX o pricing?
    - EXPIRED: TTL muy corto?
    - TIMEOUT: problemas de latencia?
  - Considerar ajustes en TTL o pricing

**Alcance:** Swap Module.

---

## 12.5 Backup y Recuperación

**Backup de base de datos:**

- Frecuencia: Diaria (full), cada 6h (incremental)
- Retención: 30 días

**Backup de Redis (caché):**

- No crítico (datos efímeros)
- Snapshot diario para debug

**Disaster Recovery:**

- RTO (Recovery Time Objective): 4 horas
- RPO (Recovery Point Objective): 6 horas

---

## 12.6 Mantenimiento Programado

**Ventanas de mantenimiento:**

- Sábados 02:00 \- 06:00 AM (AR time)
- Notificación a clientes: 48h anticipación

**Durante mantenimiento:**

- Web App muestra mensaje: "System under maintenance"
- API retorna 503 Service Unavailable

---

# 13\. GLOSARIO {#13.-glosario}

**Operation Type:** Tipo de operación soportada por el sistema. Valores posibles:

- SWAP: Intercambio de divisas digitales y fiduciarias (v1.0)
- PAYMENT: Pagos internacionales a beneficiarios (v2.0)

El operation_type determina el flujo de pricing, reservas y liquidación.

En v2.0, PAYMENT existe a nivel de tipificación (operation_type) para habilitar evolución del producto; sin embargo, el modelo de pricing/capacidad de Payment está fuera de alcance y se definirá en una iteración posterior. Por eso los endpoints Payment retornan NOT_IMPLEMENTED.

**Allocation:** Asignación de una porción de liquidez de un lote específico a una pre-quote. Contiene información del lote, precio, BPS aplicado y montos. Concepto específico del Swap Module. Payment no utiliza allocations.

**APE (Ardua Price Engine):** Motor de disponibilidad y pricing del sistema. Provee precio de referencia y gestiona stock a través del Swap Module (v1.0) y Payment Module (v2.0).

**Base Asset:** Divisa base de un par de swap (ej: USDC en USDC/ARS). Es la divisa operativa de los lotes. Puede ser una divisa digital (stablecoin como USDC, USDT, DAI) o fiduciaria (USD, EUR).

**BPS (Basis Points):** Puntos base. 1 BPS \= 0.01%. Spread aplicado al precio base para obtener precio final. Específico de operaciones swap. Payment utiliza fees fijas en lugar de BPS.

**Circuit Breaker:** Patrón de diseño que previene cascading failures desactivando temporalmente llamadas a servicios externos que están fallando.

**Conectables:** Servicios existentes en producción que Prime Desk \- RFQ Gateway consume (Quote Module, Client Module).

**FUNDS_IN:** Tipo de transacción que registra una entrada de fondos en un lote. Nace directamente con status SETTLED e inmutable. Representa una operación física ya completada (transferencia blockchain/bancaria ya confirmada). Tipos de transacción específicos del Swap Module.

**FUNDS_OUT:** Tipo de transacción que registra una salida de fondos de un lote. Nace directamente con status SETTLED e inmutable. Representa una operación física ya completada. Tipos de transacción específicos del Swap Module.

**FUNDS_RESERVE:** Tipo de transacción que reserva capacidad temporalmente con TTL. Puede estar en estado RESERVED (activa, mutable), EXECUTED (terminal, inmutable \- cliente aceptó), o REVERTED (terminal, inmutable \- cliente rechazó o expiró). Campo reference_type siempre es "PREQUOTE" cuando se crea. Campo reference_id contiene el pre_quote_id correspondiente. Campo client_id contiene el identificador del cliente que originó la reserva, usado para calcular exposición abierta. La correlación con la quote definitiva se hace a través de pre_quotes.quote_id, que se actualiza cuando el cliente acepta la pre\-quote. Tipos de transacción específicos del Swap Module.

**EXECUTED:** Estado terminal de una reserva (tipo FUNDS_RESERVE) cuando el cliente acepta la pre-quote. La transacción se marca como inmutable. Representa que el capital quedó definitivamente asignado a nivel contable.

**Fondeo:** Proceso de agregar capital a un lote mediante transacciones tipo FUNDS_IN.

**Liquidación Física:** Proceso manual ejecutado por la Mesa de Trading en horario hábil donde se realizan las transferencias reales (blockchain/bancarias) de las operaciones confirmadas contablemente (estado EXECUTED). Típicamente se ejecuta en batch al inicio del día siguiente (T+1). Este proceso está fuera del alcance del sistema Prime Desk \- RFQ Gateway.

**Lote (Lot):** Unidad de liquidez con configuración de pricing. Puede ser manual (GLOBAL_PRICE_SETUP) o automatizado (PRICE_PROVIDER_SETUP). Concepto específico del Swap Module. Payment tendrá su propio modelo de gestión de capacidad (TBD en v2.0).

**Market Reference:** Fuente neutral de precio de mercado (ej: TradingView) usada para validar precios agregados. Específico de operaciones swap.

**Max Open Exposure:** Límite de capital máximo que un cliente puede tener en reservas activas de TODOS los tipos de operación, expresado en la moneda de exposición configurada en APE/config/ape_config.yaml \-\> exposure.reference_asset. En v1.0: SUM(FUNDS_RESERVE WHERE status=RESERVED) del cliente y en v2.0: SUM(reservas swap \+ reservas payment) del cliente. Común a todos los tipos de operación.

**Mesa:** Trading desk de Ardua. Equipo responsable de fondear lotes y configurar pricing.

**Payment Module:** Módulo del APE responsable de gestionar órdenes de pago (v2.0).

**Pre-Quote:** Cotización preliminar con TTL. Válida por 30 segundos. Cliente puede aceptar/rechazar. Contiene un campo operation_type que determina el tipo de operación (swap, payment, etc.) y su flujo asociado.

**Price Provider:** Fuente de pricing operativo (Binance, BYMA, Bitso) para lotes automatizados. Específico del Swap Module para lotes automatizados.

**Quote:** Cotización definitiva y ejecutada. Persiste en Quote Module.

**Quote Asset:** Divisa cotizada de un par de swap (ej: ARS en USDC/ARS). Es la divisa en la que el cliente expresa el monto de su solicitud. Puede ser una divisa fiduciaria (ARS, BRL, MXN) o digital (stablecoin).

**Reference Price:** Precio expresado como fracción (numerador/denominador) para precisión matemática exacta.

**RESERVED:** Estado activo de una reserva (tipo FUNDS_RESERVE). La transacción es mutable y puede transitar a EXECUTED (si cliente acepta) o REVERTED (si cliente rechaza o expira).

**REVERTED:** Estado terminal de una reserva (tipo FUNDS_RESERVE) cuando el cliente rechaza la pre-quote o expira el TTL. La transacción se marca como inmutable. El capital reservado se libera (reserved → available).

**RFQ (Request for Quote):** Esquema operativo donde el cliente solicita cotización al proveedor de liquidez. En Prime Desk \- RFQ Gateway:

- Cotización: 24/7 \- Cliente puede solicitar y aceptar quotes en cualquier horario
- Ejecución contable: Inmediata \- El sistema registra la operación con estado EXECUTED
- Liquidación física: Manual en horario hábil \- Mesa ejecuta transferencias reales en batch (T+1)

**SETTLED:** Estado de transacciones tipo FUNDS_IN y FUNDS_OUT. Indica que la operación física ya fue completada y el registro contable es definitivo e inmutable. Estas transacciones nacen directamente en este estado.

**Snapshot:** Estado materializado del stock de un lote (available, reserved, executed).

**Swap Module:** Módulo del APE responsable de gestionar lotes de liquidez para operaciones de swap.

**TTL (Time To Live):** Tiempo de vida de una pre-quote (típicamente 30 segundos).

**Utilization Rate:** Porcentaje de capacidad comprometida: (reserved \+ executed) / max_capacity.

**Precisión Numérica:** El sistema utiliza dos estrategias de precisión:

- Precios: Fracción racional (BIGINT numerador/denominador) para cálculos matemáticos exactos
- Montos: NUMERIC(20,10) para soportar hasta 10 decimales en cantidades de activos

**Grace Period:** Tiempo mínimo de TTL restante requerido para que un cliente pueda aceptar una pre-quote. Configurado en grace_period_seconds (típicamente 5s). Previene race conditions con el job de expiración automática.

**Expiration Job:** Proceso automático de APE que se ejecuta periódicamente para revertir reservas expiradas. Transiciona RESERVED → REVERTED. Configurable en expiration_job_interval_seconds.

**Inmutabilidad:** Propiedad de transacciones en estado terminal que no pueden ser modificadas. Garantizada a nivel de base de datos mediante:

- Flag is_immutable \= TRUE
- Timestamp became_immutable_at
- Triggers que previenen UPDATE en transacciones inmutables
- Tabla de auditoría state_logs (append-only)

**Transaction State Log:** Tabla append-only que registra cada cambio de estado de transacciones. Proporciona audit trail completo de transiciones de reservas (RESERVED → EXECUTED/REVERTED).

---

# APÉNDICE A: REFERENCIAS

**Documentos relacionados:**

- Prime Desk \- RFQ Gateway | Diagramas
- Product Roadmap 2026

**APIs externas:**

- TradingView API Documentation
- Binance API Documentation
- Bitso API Documentation
- BYMA API Documentation

**Estándares aplicados:**

- ISO 8601 (timestamps)
- OpenAPI 3.0 (especificación de APIs)
- Semantic Versioning (versionado de servicios)

---

#

# APÉNDICE B: APROBACIONES

| Rol             | Nombre | Firma | Fecha |
| :-------------- | :----- | :---- | :---- |
| Product Manager |        |       |       |
| Tech Lead       |        |       |       |
| Mesa Lead       |        |       |       |

---

# FIN DEL DOCUMENTO

Este documento SRS constituye la especificación funcional completa del sistema Prime Desk \- RFQ Gateway. Cualquier cambio posterior debe ser versionado y aprobado por los stakeholders correspondientes.
