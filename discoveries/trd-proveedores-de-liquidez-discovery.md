---
name: TRD — Proveedores de Liquidez · Discovery Document
features: [TRD, CLP]
status: Concluida
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-10
---

# TRD — Proveedores de Liquidez · Discovery Document

> Last updated: 13/04/2026 | Estado: En producción — iteración activa

---

## 1. Propósito del documento

Documenta el módulo de Proveedores de Liquidez dentro de la aplicación TRD: su propósito, modelo operacional, estado actual de implementación, arquitectura frontend, API backend, modelo de datos, decisiones de diseño tomadas y requerimientos pendientes. Es la fuente de verdad para futuras sesiones de producto, enriquecimiento de requerimientos y handoff a Tecnología.

---

## 2. Naturaleza y propósito del módulo

**Nombre:** Proveedores de Liquidez (Blotter)
**Aplicación:** TRD — Mesa de Trading
**Ruta en app:** `/providers`
**Página:** `ProvidersPage` → renderiza `<Liquidity />`

Proveedores de Liquidez es el bloque operacional de TRD que digitaliza el registro de compras y ventas de liquidez que la Mesa de Trading ejecuta con brokers externos. Reemplaza la gestión previa en Google Sheets (una pestaña por proveedor).

**Relación con Exposición:** Las operaciones registradas aquí tributan al cálculo de Exposición de la Mesa. La Exposición es la posición neta calculada como Σ compras − Σ ventas desde todos los bloques operacionales (Quotes, Proveedores, Bots). El módulo de Home/Exposición Agregada aún no está construido — depende de que este bloque esté activo (dependencia cumplida).

---

## 3. Requerimiento fundacional

### REQ-1 — Módulo Proveedores de Liquidez

**Estado:** ✅ Done (cerrado 10/04/2026)
**Vinculado a:** AM-932 (Story — Done)
**Iniciativa padre:** REQ-3 — Core as a Service — Infraestructura Financiera
**Solicitante:** Facundo Vasques — Head of Trading
**Prototipo:** `trd_proveedores_prototype.html`

**Scope entregado en v1:**

1. Navegación: entrada "Proveedores" en sidebar entre Quotes y Bots
2. Cards de resumen: Operaciones, USDC total (→ implementado como USD total), Pendientes, Recibidos + card de volumen con Total/BUY/SELL en USD
3. Tabla de operaciones con filtros (Proveedor, Estado, Plazo, Período) y paginación server-side
4. Modal de detalle con log de actividad
5. Formulario de nueva operación con cálculo automático de contravalor
6. Ciclo de vida: PENDING → RECEIVED (confirmar recepción)
7. Control de acceso por roles (viewer-trd: solo lectura)

**Diferencias entre prototipo y producción:**

| Aspecto           | Prototipo                                                                  | Producción                                                                                               |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Cards de resumen  | 5 cards en fila: Operaciones, USDC total, ARS total, Pendientes, Recibidos | 2 cards compuestos: Card 1 (Operaciones + Pendientes/Recibidos), Card 2 (Total USD + BUY USD + SELL USD) |
| Moneda cards      | USDC y ARS por separado                                                    | Solo USD — sin ARS en cards                                                                              |
| Filtros           | Proveedor, Estado, Plazo                                                   | Proveedor, Estado, Plazo, Período (semanal/mensual/trimestral/anual)                                     |
| Tabla columnas    | Fecha, Proveedor, Tipo, ARS, TC, USDC, Plazo, Fecha liq., Status           | Fecha op., Proveedor, Tipo, Par, Monto (base), TC, Contravalor (quote), Plazo, Fecha liq., Estado        |
| Summary y filtros | Cards calculan sobre dataset completo; filtros solo aplican a tabla        | Cards y tabla se recalculan juntos — el backend devuelve summary filtrado                                |
| Par de monedas    | Hardcoded USD/ARS                                                          | Dinámico via CurrencyPairSelector (default USD/ARS)                                                      |
| Instrumento       | Campo de texto libre (CABLE/MEP)                                           | Reemplazado por Par de monedas del sistema                                                               |
| Empresa Ardua     | Circuit Pay, Haz Pagos, Ardua Solutions Corp                               | Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL                                                |
| Actividad         | No existe                                                                  | Log de actividad por operación (creación, cambio de estado)                                              |
| Paginación        | No existe (todos los registros)                                            | Server-side (page, page_size)                                                                            |

---

## 4. Arquitectura frontend

### 4.1 Estructura de componentes

```
src/components/Liquidity/
├── Liquidity.tsx           → Componente principal (orquestador)
├── LiquidityCards.tsx      → Cards de resumen (2 cards compuestos)
├── LiquidityFilters.tsx    → Barra de filtros (Período, Proveedor, Estado, Plazo)
├── LiquidityTable.tsx      → Tabla de operaciones con paginación
├── LiquidityDetailModal.tsx → Modal de detalle + log de actividad
├── LiquidityForm.tsx       → Formulario de nueva operación
├── LiquidityBadges.tsx     → Componentes de badges (Status, OperationType, Term)
└── useLiquidity.ts         → Hook principal (estado, fetch, filtros, CRUD)
```

**Directorio legacy vacío:** `src/components/LiquidityRequests/` — cascarón nunca construido, puede eliminarse.

### 4.2 Modelo de datos (TypeScript)

**LiquidityOperation:**

| Campo                 | Tipo                      | Descripción                 |
| --------------------- | ------------------------- | --------------------------- |
| `id`                  | `string`                  | Identificador único         |
| `provider_id`         | `string`                  | ID del proveedor            |
| `provider_name`       | `string`                  | Nombre del proveedor        |
| `operation_type`      | `'BUY' \| 'SELL'`         | Tipo de operación           |
| `pair_id`             | `string`                  | ID del par de monedas       |
| `base_currency_code`  | `string`                  | Moneda base (ej: USD)       |
| `quote_currency_code` | `string`                  | Moneda quote (ej: ARS)      |
| `origin_amount`       | `number`                  | Monto en moneda base        |
| `exchange_rate`       | `string`                  | Tipo de cambio              |
| `destination_amount`  | `number`                  | Contravalor en moneda quote |
| `term`                | `string`                  | Plazo (T0, T1, T2)          |
| `operation_date`      | `string`                  | Fecha de operación          |
| `settlement_date`     | `string`                  | Fecha de liquidación        |
| `notes`               | `string?`                 | Notas opcionales            |
| `status`              | `'PENDING' \| 'RECEIVED'` | Estado                      |
| `created_by`          | `string`                  | Email del creador           |
| `created_at`          | `string`                  | Fecha de creación           |
| `updated_at`          | `string`                  | Última actualización        |

**LiquiditySummary:**

| Campo              | Tipo     | Descripción                   |
| ------------------ | -------- | ----------------------------- |
| `total_operations` | `number` | Cantidad total de operaciones |
| `total_usd`        | `string` | Volumen total USD             |
| `usd_bought`       | `string` | Total USD comprado            |
| `usd_sold`         | `string` | Total USD vendido             |
| `pending_count`    | `number` | Operaciones pendientes        |
| `received_count`   | `number` | Operaciones recibidas         |

**LiquidityFilters:**

| Campo         | Tipo               | Descripción                                               |
| ------------- | ------------------ | --------------------------------------------------------- |
| `provider_id` | `string?`          | Filtro por proveedor                                      |
| `status`      | `string?`          | Filtro por estado (PENDING / RECEIVED)                    |
| `term`        | `string?`          | Filtro por plazo (T0 / T1 / T2)                           |
| `period`      | `LiquidityPeriod?` | Período temporal (semanal / mensual / trimestral / anual) |
| `page`        | `number?`          | Página actual                                             |
| `page_size`   | `number?`          | Items por página (default: 20)                            |

### 4.3 Cards de resumen — estructura actual

**Card 1 — Operaciones:**

```
┌──────────────┬──────────────────┐
│ Operaciones  │ Pendientes   [n] │
│     [N]      ├──────────────────┤
│              │ Recibidos    [n] │
└──────────────┴──────────────────┘
```

**Card 2 — Volumen (USD only):**

```
┌──────────────┬───────────────┬───────────────┐
│ Total        │ BUY           │ SELL          │
│ [N] USD      │ [N] USD       │ [N] USD       │
│              │ (border green)│ (border red)  │
└──────────────┴───────────────┴───────────────┘
```

**Gap actual:** Card 2 no muestra contravalor ARS → REQ-35.

### 4.4 RBAC

| Rol                 | Permisos                                   |
| ------------------- | ------------------------------------------ |
| `admin-trd`         | Lectura + Escritura + Confirmación         |
| `ops-trd`           | Lectura + Escritura + Confirmación         |
| `quote-creator-trd` | Lectura + Escritura + Confirmación         |
| `viewer-trd`        | Solo lectura (no puede crear ni confirmar) |

La lógica de permisos se evalúa en `Liquidity.tsx`: si el usuario tiene únicamente `viewer-trd` (sin `admin-trd`, `ops-trd`, ni `quote-creator-trd`), se oculta el botón "Nueva operación" y se deshabilita la confirmación en el modal.

---

## 5. API Backend

**Base URL:** `VITE_API_BASE_URL` (variable de entorno)

| Método  | Endpoint                               | Descripción                                                                         |
| ------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET`   | `/liquidity-operations`                | Lista operaciones con filtros y paginación. Retorna `{ data, pagination, summary }` |
| `POST`  | `/liquidity-operations`                | Crea nueva operación                                                                |
| `PATCH` | `/liquidity-operations/:id`            | Actualiza operación (usado para confirmar recepción: `{ status: 'RECEIVED' }`)      |
| `GET`   | `/liquidity-operations/:id/activities` | Retorna log de actividad de una operación                                           |
| `GET`   | `/providers`                           | Lista proveedores disponibles                                                       |

**Autenticación:** Bearer token via Auth0.

**Patrón de respuesta:** El backend puede retornar el payload en `response.body` (JSON stringificado) o directamente en el root del response. El frontend maneja ambos casos con `json.body ? JSON.parse(json.body) : json`.

**Comportamiento clave del summary:** El endpoint `GET /liquidity-operations` acepta filtros como query params y retorna un objeto `summary` calculado server-side que respeta esos filtros. Esto significa que los cards de resumen se recalculan automáticamente con cada cambio de filtro — no hay cálculo client-side.

**Cache de proveedores:** El hook `useLiquidity` cachea la lista de proveedores en `localStorage` con TTL de 24 horas para evitar llamadas repetidas.

---

## 6. Ciclo de vida de una operación

```
PENDING → RECEIVED
```

| Estado     | Descripción                                   | Acciones disponibles             |
| ---------- | --------------------------------------------- | -------------------------------- |
| `PENDING`  | Operación acordada, liquidación no confirmada | Confirmar recepción (→ RECEIVED) |
| `RECEIVED` | Liquidación confirmada — tributa a Exposición | Solo lectura                     |

**Restricciones v1:**

- No existe edición de operaciones ya registradas
- No existe cancelación de operaciones
- No existe reversión de RECEIVED → PENDING

---

## 7. Formulario de nueva operación

**Campos:**

| Campo               | Tipo                 | Comportamiento                                            |
| ------------------- | -------------------- | --------------------------------------------------------- |
| Tipo (BUY/SELL)     | Toggle visual        | Cambia labels de montos ("Recibes"/"Envías")              |
| Proveedor           | Select dinámico      | Lista desde `GET /providers`                              |
| Empresa Ardua       | Select estático      | Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL |
| Par de monedas      | CurrencyPairSelector | Default: USD/ARS. Dinámico desde CurrenciesContext        |
| TC                  | Input numérico       | Dispara recálculo de contravalor                          |
| Plazo               | Toggle T0/T1/T2      | Dispara cálculo automático de fecha liquidación           |
| Monto (base)        | Input numérico       | Recalcula contravalor: origin × TC = destination          |
| Contravalor (quote) | Input numérico       | Editable. Recalcula monto base: destination ÷ TC = origin |
| Fecha operación     | DatePicker           | Default: hoy                                              |
| Fecha liquidación   | DatePicker           | Auto-calculada según plazo (días hábiles), editable       |
| Nota                | Textarea             | Opcional                                                  |

**Cálculo automático de fecha liquidación:** T0 = misma fecha, T1 = +1 día hábil, T2 = +2 días hábiles. Sábados y domingos se excluyen. El campo es editable post-cálculo.

---

## 8. Requerimientos activos

### REQ-35 — Contravalor ARS en cards de resumen

**Estado:** In Review (enriquecido 13/04/2026)
**Prioridad:** Highest
**Tipo:** Improvement

**Scope:** Agregar una segunda línea en cada celda del Card 2 (Total, BUY, SELL) mostrando el total ARS correspondiente. Requiere extensión del objeto `LiquiditySummary` con tres campos ARS (`total_ars`, `ars_bought`, `ars_sold`) calculados server-side con la misma lógica de filtros que los campos USD existentes.

**Impacto en modelo de datos:**

```typescript
// LiquiditySummary — campos nuevos (REQ-35)
total_ars: string; // Total ARS todas las operaciones filtradas
ars_bought: string; // ARS correspondiente a operaciones BUY
ars_sold: string; // ARS correspondiente a operaciones SELL
```

**Archivo afectado principal:** `LiquidityCards.tsx` (presentación), `useLiquidity.ts` (tipo), `types/liquidity.ts` (interface).

---

## 9. Fuera de alcance (v1) — backlog documentado

Estos items fueron explícitamente excluidos del REQ-1 y permanecen pendientes:

| Item                                              | Origen              | Notas                                                    |
| ------------------------------------------------- | ------------------- | -------------------------------------------------------- |
| Gestión del catálogo de proveedores desde la UI   | REQ-1               | Lista predefinida en el sistema                          |
| Edición de operaciones ya registradas             | REQ-1               | —                                                        |
| Cancelación de operaciones                        | REQ-1               | —                                                        |
| Exposición calculada y visualizada en Home        | REQ-1 / TRD context | Dependencia de Proveedores cumplida. Requiere REQ propio |
| Exportación a CSV / Excel                         | REQ-1               | —                                                        |
| Vinculación de operaciones con Quotes de clientes | REQ-1               | —                                                        |
| Exposición neta en ARS (compras - ventas)         | REQ-35              | Corresponde al futuro módulo de Home/Exposición          |
| Soporte para pares distintos a USD/ARS en cards   | REQ-35              | El formulario ya soporta pares dinámicos; los cards no   |

---

## 10. Decisiones de diseño registradas

| Decisión                                          | Detalle                                                                                                                                                              | Origen         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Summary calculado server-side                     | El backend retorna `summary` como parte del response de `GET /liquidity-operations`, recalculado con cada request filtrado. No hay agregación client-side.           | Implementación |
| Cards compuestos en lugar de 5 cards individuales | Producción usa 2 cards compuestos (Operaciones + contadores, Volumen USD) en lugar de los 5 cards del prototipo. Mejor uso del espacio, agrupación lógica más clara. | Implementación |
| Providers cacheados en localStorage (24h TTL)     | La lista de proveedores cambia infrecuentemente. Cache client-side reduce llamadas redundantes.                                                                      | Implementación |
| Empresa Ardua como campo estático en frontend     | No viene de una API — es una constante hardcoded: Circuit Pay, Haz Pagos, Ardua Solutions Corp, Nerghis SRL. Potencial punto de refactor futuro.                     | Implementación |
| Par de monedas dinámico (no hardcoded)            | A diferencia del prototipo que usaba CABLE/MEP como instrumento, producción usa CurrencyPairSelector conectado a CurrenciesContext. El par por defecto es USD/ARS.   | Implementación |
| Cálculo bidireccional de montos                   | En el formulario, cambiar monto base recalcula contravalor, y cambiar contravalor recalcula monto base. Ambos campos son editables.                                  | Implementación |
| Fecha liquidación auto-calculada pero editable    | El plazo (T0/T1/T2) calcula automáticamente la fecha considerando días hábiles, pero el usuario puede sobreescribirla.                                               | Implementación |
| JSON en `response.body`                           | El backend puede retornar el payload en `body` (stringificado) o en root. El frontend maneja ambos patrones. Herencia de la arquitectura serverless.                 | Implementación |

---

## 11. Preguntas de diseño abiertas

| Pregunta                                                              | Prioridad | Contexto                                                                                                                                    |
| --------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Cuándo se inicia el REQ para Home + Exposición Agregada?             | Alta      | La dependencia de Proveedores está cumplida. Es el siguiente paso lógico en TRD.                                                            |
| ¿Los cards de volumen deberían soportar múltiples pares en el futuro? | Media     | El formulario ya soporta pares dinámicos; los cards solo agregan en USD. Si se opera en otros pares, los totales no reflejarán la realidad. |
| ¿Se necesita edición o cancelación de operaciones en v2?              | Media     | V1 es registro-only. La mesa podría necesitar corregir errores de carga.                                                                    |
| ¿Se necesita exportación a CSV para conciliación?                     | Baja      | Depende de si FIN/OPS necesitan consumir estos datos fuera de TRD.                                                                          |
| ¿El campo "Empresa Ardua" debería venir de una API?                   | Baja      | Hoy está hardcoded. Si cambia la estructura societaria, requiere deploy.                                                                    |

---

## 12. Stack técnico (heredado de TRD)

| Elemento     | Tecnología                                                                               |
| ------------ | ---------------------------------------------------------------------------------------- |
| Framework    | React + TypeScript                                                                       |
| Build        | Vite                                                                                     |
| UI           | shadcn/ui + Tailwind CSS                                                                 |
| Auth         | Auth0                                                                                    |
| Server state | React Query (TanStack) — no usado en el hook de Liquidity (usa useState + fetch directo) |
| Routing      | React Router                                                                             |
| Deploy       | Serverless Framework                                                                     |

**Repositorio:** `/Users/yasmani/Projects/core-trd-frontend`

---

## 13. Próximos pasos

| #   | Acción                                                                                  | Owner                 | Estado      |
| --- | --------------------------------------------------------------------------------------- | --------------------- | ----------- |
| 1   | Handoff REQ-35 (Contravalor ARS en cards) a Tecnología                                  | HoP                   | Pendiente   |
| 2   | Evaluar inicio de discovery para Home + Exposición Agregada                             | HoP + Facundo Vasques | No iniciado |
| 3   | Evaluar necesidad de edición/cancelación de operaciones (v2)                            | HoP + Facundo Vasques | No iniciado |
| 4   | Actualizar `trd-session-context.md` para reflejar que Proveedores ya está en producción | HoP                   | Pendiente   |
