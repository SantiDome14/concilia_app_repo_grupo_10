---
name: Client Portal (CLP) — Session Context
features: [CLP]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-10
---

# Client Portal (CLP) — Session Context

---

## 1. Denominación y Naturaleza del Producto

**Nombre:** Client Portal
**Prefijo:** [CLP]

El Client Portal es la **capa de experiencia transversal** de Ardua. No es un producto aislado — es la interfaz web donde el cliente ve y gestiona todo lo que Ardua hace por él, independientemente del producto que originó cada operación.

El Dashboard que existe hoy en la app es **una vista dentro del portal**, no el portal en sí.

**Lo que NO es:**

- No es una Wallet (frame retail/consumer — no aplica al contexto institucional)
- No es un Dashboard (el dashboard es solo la vista de entrada)

---

## 2. Estructura del Producto (v4 · Final)

```
Client Portal
├── 1. Dashboard
│   ├── Vista Personal (default — todos los usuarios)
│   └── Vista Agrupador (toggle — solo Agrupadores/Referenciadores) ← TBD
├── 2. Accounts
│   ├── Listado de cuentas por currency (una cuenta por currency)
│   ├── Detalle de cuenta (datos bancarios — Dedicada o Global Compartida)
│   ├── Flujo de Deposit (transversal — también desde Dashboard)
│   └── Sub-accounts (condicional — solo Agrupadores)
├── 3. Transactions
│   ├── Buscador (por counterparty; extensión a referencia/ID: pendiente Tecnología)
│   ├── Historial completo (agnóstico al producto origen)
│   ├── Filtros (currency tabs, tipo, fecha, estado, sub-cuenta)
│   ├── Modal de detalle por transacción
│   ├── Transferencias — v1: solo ARS (condicional por moneda)
│   ├── Filtro por sub-cuenta (condicional — Agrupadores)
│   └── Operación delegada (condicional — sub-cuentas en modo Dependiente)
├── 4. Earn
│   ├── Yield (staking / rendimiento sobre cripto y stablecoins) ← BLOQUEADO — pendiente decisión Directorio
│   └── FCI (suscripción a FCI de terceros — actualmente AdCap / Haz Pagos) ← DESBLOQUEADO — acuerdo firmado
├── 5. Reports
│   ├── Flujo de solicitud de extracto (PDF multi-currency, asincrónico)
│   └── Historial de solicitudes (con estado por solicitud)
├── 6. RFQ ← NUEVO (antes "Cotizar") — prototipado en v3
│   └── Flujo completo de pre-cotización USDT/ARS via RFQ Gateway (REQ-8)
├── 7. Quotes ← NUEVO — prototipado en v3
│   └── Historial de cotizaciones confirmadas (RFQ + OTC) con filtros y modal de detalle
└── 8. Settings
    ├── Perfil y datos (read-only — cambios vía soporte)
    ├── Seguridad (contraseña, 2FA, sesiones activas)
    ├── Notificaciones y preferencias (toggle por categoría, canal email)
    └── Usuarios y permisos (v1: un usuario / rol Admin — estructura lista para v2)
```

---

## 3. Patrones Transversales

### Patrón 1 — Solicitud-Ejecución

Modelo asincrónico: usuario solicita → Ardua procesa → notifica por email.

| Funcionalidad                         | Comportamiento                                                 |
| ------------------------------------- | -------------------------------------------------------------- |
| Extracto (Reports)                    | Siempre asincrónico                                            |
| Transferencias (Transactions)         | Fallback si integración no disponible                          |
| Yield (Earn)                          | A definir según implementación (pendiente decisión Directorio) |
| FCI (Earn)                            | Fallback si API AdCap no disponible                            |
| Cambio modo sub-cuenta                | Siempre vía soporte                                            |
| Cambios de datos de perfil (Settings) | Siempre vía soporte                                            |

### Patrón 2 — Habilitación condicional por moneda

No todas las currencies tienen todas las funcionalidades habilitadas. La UI debe reflejar qué está disponible por moneda — no mostrar opciones deshabilitadas.

Aplica a: Transferencias (v1: solo ARS), Yield, FCI.

### Patrón 3 — Habilitación condicional por perfil

Ciertas secciones/funcionalidades no existen en la UI para quien no aplica (no están deshabilitadas — directamente no se muestran).

| Funcionalidad                        | Perfil requerido                           |
| ------------------------------------ | ------------------------------------------ |
| Sub-accounts (Accounts)              | Agrupador / Referenciador                  |
| Filtro por sub-cuenta (Transactions) | Agrupador / Referenciador                  |
| Operación delegada (Transactions)    | Agrupador + sub-cuenta en modo Dependiente |
| Vista Agrupador (Dashboard)          | Agrupador / Referenciador                  |

---

## 4. Modelo de Agrupador / Referenciador

El Agrupador es un perfil de usuario con sub-cuentas bajo su dominio. Usa el mismo portal con funcionalidades adicionales habilitadas condicionalmente.

### Modos de sub-cuenta

| Modo            | Quién gestiona transacciones            | Configurable por                                    |
| --------------- | --------------------------------------- | --------------------------------------------------- |
| **Autónomo**    | El usuario de la sub-cuenta             | Ardua internamente                                  |
| **Dependiente** | El Agrupador en nombre de la sub-cuenta | Ardua internamente (Agrupador solicita vía soporte) |

### Capacidades del Agrupador

- Alta, baja y modificación de sub-cuentas (desde Accounts → Sub-accounts)
- Atributos gestionables por el Agrupador: Nombre/razón social, Email de contacto, Monedas habilitadas, Límites operativos, Estado (activa/inactiva)
- Atributo read-only: Modo (Autónomo/Dependiente) — solo Ardua lo define internamente
- Visibilidad de transacciones del grupo (filtro por sub-cuenta en Transactions)
- Ejecución de transacciones en nombre de sub-cuentas en modo Dependiente
- Vista Agrupador en Dashboard (toggle manual, contenido TBD)

---

## 5. Dashboard — Definición en Profundidad

### Vista Personal (default)

| Componente               | Detalle                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Saldos**               | Solo currencies habilitadas para el cliente                                                                                                                                                                  |
| **Quick Actions (CTAs)** | Depositar, Transferir (condicional: solo si tiene ARS activo en v1), Earn, Solicitar Extracto                                                                                                                |
| **Pending**              | Cotizaciones aceptadas sin liquidar (RFQ Gateway) + Transferencias en proceso (STATUS del modelo Transactions) + Earn en curso + Solicitudes en proceso. ⚠️ Co-dependiente con construcción del campo STATUS |
| **Recent Activity**      | Últimas 10 transacciones. Columnas: Fecha, Tipo (badge), Monto, Contraparte. Link a Transactions para historial completo                                                                                     |
| **Alerts (widget fijo)** | Transaccionales (disparadas por STATUS de Transactions + RFQ Gateway) + De sistema (mantenimiento, integraciones). ⚠️ Dos modelos de datos distintos — unificar solo en capa de presentación                 |

### Vista Agrupador (toggle)

- Activación: manual mediante toggle (similar a vista Lite/Pro en trading)
- Visible solo para Agrupadores con sub-cuentas asignadas
- Contenido: **TBD** — pendiente de definición con stakeholders
- 📌 Comentario dejado en Notion para retomar

---

## 6. Accounts — Definición en Profundidad

### Modelo de cuenta

**Una cuenta por currency** — cuentas separadas, cada una con su propio balance.

### Dos variantes de cuenta

| Variante                     | Descripción                                           | Presentación en UI                                             |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| **Cuenta Dedicada**          | El cliente tiene CBU/CVU/wallet/IBAN propios en Ardua | Muestra datos directamente — son exclusivos del cliente        |
| **Cuenta Global Compartida** | Ardua opera con cuenta institucional compartida       | Datos de Ardua + código de referencia generado por transacción |

⚠️ **Pendiente Operaciones**: qué determina Dedicada vs. Global (currency, jurisdicción, caso a caso)
⚠️ **Pendiente Tecnología**: datos bancarios estáticos vs. dinámicos por currency

### Datos bancarios por currency (Cuenta Dedicada)

| Currency            | Datos                           |
| ------------------- | ------------------------------- |
| ARS                 | CBU + CVU + Alias CBU           |
| USDC / USDT         | Wallet address + red (network)  |
| BTC                 | Wallet address + red            |
| EURC                | IBAN + BIC/SWIFT                |
| USD (ACH)           | Routing Number + Account Number |
| USD (Internacional) | SWIFT/BIC + datos bancarios     |

### Flujo de Deposit

Pantalla de instrucciones (no ejecución en el sistema). Accesible desde Dashboard y Accounts. Sin paso de confirmación ni resultado — el depósito se registra cuando Ardua procesa la acreditación entrante.

### Sub-accounts (solo Agrupadores)

Atributos gestionables desde el portal: Nombre/razón social, Email de contacto, Monedas habilitadas, Límites operativos (por confirmar: ¿por transacción / diarios / mensuales?), Estado.
No editable desde portal: Modo.
Alta: requiere validación de campos mínimos con Compliance.

---

## 7. Transactions — Definición en Profundidad

### Modelo de datos — dos dimensiones

| Dimensión        | Valores                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| **Tipo**         | Deposit, Withdrawal, Swap In, Swap Out, Transfer In, Transfer Out, Fee, Rebate |
| **Canal (RAIL)** | Ver mapeo completo abajo                                                       |

### Mapeo RAIL → Label cliente

| RAIL            | Label                                  | Estado        |
| --------------- | -------------------------------------- | ------------- |
| SPE             | Transferencia ARS                      | ✅ Confirmado |
| SPEI            | Transferencia MXN                      | ✅ Confirmado |
| PIX             | Transferencia BRL                      | ✅ Confirmado |
| ACH             | Transferencia USD (ACH)                | ✅ Confirmado |
| FEDWIRE         | Transferencia USD (Wire)               | ✅ Confirmado |
| SEPA            | Transferencia EUR                      | ✅ Confirmado |
| Faster Payments | Transferencia GBP                      | ✅ Confirmado |
| FX              | Cambio de divisas                      | ✅ Confirmado |
| VCURRENCY USDC  | Operación USDC                         | ✅ Confirmado |
| VCURRENCY USDT  | Operación USDT                         | ✅ Confirmado |
| INTERNAL        | Transferencia interna                  | ✅ Confirmado |
| WIRE            | Pendiente — ¿alias de SWIFT?           | ⏳ Tecnología |
| VCURRENCY       | Pendiente — ¿valor legacy?             | ⏳ Tecnología |
| ARDUA           | Pendiente — ¿movimiento interno Ardua? | ⏳ Tecnología |

Consulta enviada a Tecnología el 06/03/2026 vía #3dt-product-technology-delivery.

### Componentes

- **Buscador**: por counterparty. Extensión a referencia/ID pendiente de confirmar con Tecnología.
- **Filtros**: Currency (tabs), Tipo (multiselect), Tiempo (presets + custom), Estado (nuevo — pendiente construcción), Sub-cuenta (condicional Agrupadores).
- **Tabla**: Fecha, Canal (label legible), Tipo (badge), Monto (+/-), Contraparte, Estado. Cronológico inverso. Click → modal de detalle.
- **Modal**: ID transacción, timestamp, tipo, canal, monto, estado, contraparte, concepto/referencia (pendiente Tecnología), sub-cuenta si aplica. Acción: copiar ID.
- **Transferencias v1** (solo ARS): Origen → Destino (CBU/CVU o alias) → Confirmación → Resultado. Real-time si disponible, fallback a Solicitud-Ejecución.
- **Operación delegada** (Agrupadores + sub-cuenta Dependiente): mismo flujo con selector de sub-cuenta al inicio.

---

## 8. Reports — Definición en Profundidad

| Parámetro           | Decisión                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| Formato             | PDF (extracto visual tipo estado de cuenta bancario)                               |
| Alcance             | Multi-currency — todas las currencies del cliente en un solo archivo               |
| Canal de entrega    | Email del usuario logueado (no configurable desde el portal — cambios vía soporte) |
| Modelo de ejecución | Siempre asincrónico — Solicitud-Ejecución                                          |

### Flujo de solicitud

Período (presets + custom) → Confirmación (muestra email de destino) → Resultado (solicitud registrada en historial con estado Pendiente).

### Historial de solicitudes

Tabla con: Fecha de solicitud, Período cubierto, Estado (Pendiente/Procesando/Enviado/Error), Email de destino.

⚠️ **Pendiente Operaciones/Tecnología**: tiempo estimado de procesamiento (impacta copy del flujo)
⚠️ **Pendiente Tecnología**: campos exactos disponibles en el PDF (deben ser consistentes con modelo Transactions)

---

## 9. Settings — Definición en Profundidad

### Modelo v1: un único usuario por cuenta / un único rol (Administrador)

### Sub-secciones

| Sub-sección             | Contenido clave                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Perfil y datos**      | Read-only. Campos: Nombre/razón social, Email (= email de notificaciones y extractos), Teléfono, País/Jurisdicción, Tipo de cliente. Cambios vía soporte. |
| **Seguridad**           | Cambio de contraseña (directo desde portal), 2FA (activar/desactivar, app o SMS), Sesiones activas (⚠️ pendiente confirmar con Tecnología)                |
| **Notificaciones**      | Toggle on/off por categoría (Transaccionales, Earn, Reports, Sistema). Canal único: email. Granularidad por categoría en v1.                              |
| **Usuarios y permisos** | Read-only en v1. Muestra: Email del usuario, Rol = Administrador, Estado = Activo. Estructura preparada para multi-usuario en v2.                         |

---

## 10. Bloque Earn — Estado post-respuesta de Legales (12/03/2026)

### Decisiones de naming (cerradas)

| Nombre anterior | Nombre actual | Motivo                                                                                                                                                                                                                       |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lending         | **Yield**     | "Lending" implicaba que Ardua toma prestados los fondos — modelo jurídicamente inviable. Yield refleja correctamente el outcome sin implicar custodia o préstamo.                                                            |
| Subscriptions   | **FCI**       | "Subscriptions" se solapa con flujos de Yield en el mercado (ej. Binance). FCI es el término de mercado reconocido en Argentina para el único caso de uso habilitado en v1. Revisión pendiente si el portal escala a inglés. |

### Yield (antes: Lending)

**Estado actual:** Bloqueado — el Directorio debe tomar decisiones sobre el modelo a implementar (8 decisiones identificadas en informe Legales, marzo 2026). No se puede especificar el flujo UX hasta que haya un modelo operativo definido.

### FCI (antes: Subscriptions)

**Estado: ✅ DESBLOQUEADO** — acuerdo Haz Pagos ↔ AdCap firmado.

**Scope confirmado:**
- Solo disponible para clientes de **Haz Pagos** (entidad: PSP Argentina)
- Moneda: **ARS** (pesos en CVU)
- Proveedor: **AdCap Asset Management** (integración vía API Broker)

---

## 11. RFQ Gateway — Módulo CLP (REQ-8)

> Prototipado en `clp_rfq_prototype_v3.html` (10/04/2026)

### Nomenclatura en navegación

| Módulo en nav | Nombre definido |
| ------------- | --------------- |
| RFQ           | Flujo de solicitud de pre-cotización (antes "Cotizar") |
| Quotes        | Historial de cotizaciones confirmadas (antes "Mis Cotizaciones") |

### Módulo RFQ — flujo completo prototipado

Escenas cubiertas: Formulario → Cargando → Pre-cotización (full coverage) → Cobertura parcial → Confirmada → Rechazada → Vencida → Sin liquidez → Límite exposición → Precio fuera rango → REQUOTE → Rate limit → Mantenimiento.

La barra de escenas (selector de estado) solo aparece en la vista RFQ — se oculta en el resto del portal.

### Módulo Quotes — diseño definitivo

**Estructura:**
- 3 KPI cards: Activas · Liquidadas · Total
- Tabla con filtros inline en el header de la card (patrón TRD): Estado + Origen
- Filtros de Origen: **RFQ** / **OTC** (no Manual — el canal desde el portal es siempre RFQ; las operaciones gestionadas por la Mesa son OTC)
- Columnas: ID · Estado · Par · Op. · Monto · TC · Calculado · Fecha · Origen

**Click en fila → modal de detalle (read-only):**
- Muestra todos los campos de la operación
- Para origen RFQ: caja violeta "Origen RFQ Gateway" con `pre_quote_id` y canal
- Para origen OTC: caja azul "Origen OTC" indicando que fue coordinada por la Mesa

**Decisión de naming aplicada (10/04/2026):**
- `source: 'RFQ'` → badge violeta "RFQ"
- `source: 'OTC'` → badge azul "OTC" (antes `source: 'MANUAL'`)

---

## 12. Estado Actual del Producto

| Funcionalidad                                      | Estado                                                    |
| -------------------------------------------------- | --------------------------------------------------------- |
| Saldos multi-currency (USDC, ARS, BTC, EURC, USDT) | ✅ Existe                                                 |
| Actividad reciente con filtros básicos             | ✅ Existe                                                 |
| Vista Admin con impersonación de cliente           | ✅ Existe                                                 |
| Deposit                                            | ⚠️ Estado funcional a confirmar con Tecnología            |
| Transfer                                           | ❌ Botón existe, funcionalidad no desarrollada            |
| Transactions (completo)                            | ❌ No existe                                              |
| Accounts (completo)                                | ❌ No existe                                              |
| Earn — FCI (AdCap / Haz Pagos)                     | ⚠️ Desbloqueado — pendiente definición de flujo UX        |
| Earn — Yield (Staking / DeFi / Omnibus)            | ❌ Bloqueado — pendiente decisión Directorio sobre modelo |
| Reports / Extracto                                 | ❌ No existe                                              |
| Settings                                           | ❌ No existe                                              |
| Sub-accounts                                       | ❌ No existe                                              |
| **RFQ (ex-Cotizar)**                               | ✅ Prototipo v3 completo — REQ-8 pendiente sincronización |
| **Quotes (ex-Mis Cotizaciones)**                   | ✅ Prototipo v3 completo — scope a confirmar en REQ-8     |

---

## 13. Pendientes y Próximos Pasos

### 🔴 PENDIENTE CRÍTICO — Sincronización prototipos con Jira (10/04/2026)

Los prototipos avanzaron significativamente en esta sesión pero los issues de Jira no fueron actualizados. **Requiere acción antes de avanzar a Ready for Dev.**

| Tarea | Issue Jira | Acción requerida |
| ----- | ---------- | ---------------- |
| Actualizar scope REQ-8 con módulo Quotes | REQ-8 | Agregar ítems funcionales: tabla Quotes con filtros (Estado/Origen), modal de detalle read-only, columna ID, origen RFQ vs OTC |
| Confirmar si Quotes es scope de REQ-8 o requiere nuevo ticket | REQ-8 | Decisión de producto: ¿se foldea en REQ-8 o se abre REQ-XX? |
| Verificar alineación REQ-8 ítems 1–9 vs prototipo v3 | REQ-8 | Revisar si los nombres de módulos (RFQ / Quotes) y el comportamiento prototipado difieren del texto del requerimiento |
| Verificar alineación REQ-31 (pre-quotes) vs prototipo v3 | REQ-31 | Confirmar que el `pre_quote_id` en el modal Quotes del CLP está alineado con el modelo de datos definido en REQ-31 |
| Issues en main — revisar si alguno debe reflejar cambios de esta sesión | REQ-8, REQ-31 | Revisar descripciones y criterios de aceptación contra el estado actual del prototipo |

> **Nota:** Los prototipos son la fuente de verdad visual para esta iteración. El criterio para la sincronización es: *el requerimiento debe describir lo que el prototipo muestra, no lo que se pensó originalmente.*

### Definición pendiente (producto)

- [ ] Vista Agrupador del Dashboard — contenido y componentes ← única sección sin definir
- [ ] **Earn — FCI** — desbloqueado, listo para definir flujo UX (ver pendientes en Sección 10)
- [ ] **Earn — Yield** — bloqueado hasta decisión del Directorio sobre modelo operativo
- [ ] Dashboard — widget Pending (Quotes activas visibles desde el home) — prototipo pendiente
- [ ] Transactions completo — REQ pendiente de crear

### Validaciones pendientes con otros equipos

| Pendiente                                                    | Equipo                   | Canal                            | Fecha envío    | Criticidad               |
| ------------------------------------------------------------ | ------------------------ | -------------------------------- | -------------- | ------------------------ |
| ~~Naturaleza jurídica de Lending~~                           | ~~Legales~~              | —                                | ~~05/03/2026~~ | ✅ Respondido 12/03/2026 |
| ~~Rol de Ardua como intermediario en Subscriptions~~         | ~~Legales~~              | —                                | ~~05/03/2026~~ | ✅ Respondido 12/03/2026 |
| Decisión Directorio: modelo Yield (Staking / DeFi / Omnibus) | Directorio / Legal       | —                                | Pendiente      | Alta — bloquea Yield     |
| Lógica técnica habilitación FCI por entidad (Haz Pagos)      | Tecnología               | Pendiente de enviar              | —              | Alta — bloquea FCI       |
| Monto mínimo suscripción FCI AdCap                           | AdCap / Operaciones      | Pendiente de enviar              | —              | Alta                     |
| Flujo de redención FCI — plazo de acreditación               | AdCap / Operaciones      | Pendiente de enviar              | —              | Alta                     |
| Detalles de reportes FCI (campos, formato)                   | AdCap / Operaciones      | Pendiente de enviar              | —              | Media                    |
| Mapeo RAIL: WIRE, VCURRENCY, ARDUA                           | Tecnología               | #3dt-product-technology-delivery | 06/03/2026     | Alta                     |
| Campo referencia/concepto en modelo de datos                 | Tecnología               | #3dt-product-technology-delivery | 06/03/2026     | Alta                     |
| Estado funcional de Deposit y Transfer                       | Tecnología               | Pendiente de enviar              | —              | Alta                     |
| Datos bancarios estáticos vs. dinámicos por currency         | Tecnología               | Pendiente de enviar              | —              | Alta                     |
| Sesiones activas en Settings — disponibilidad                | Tecnología               | Pendiente de enviar              | —              | Media                    |
| Tiempo de procesamiento de extracto (Reports)                | Operaciones / Tecnología | Pendiente de enviar              | —              | Alta                     |
| Campos exactos del PDF (Reports)                             | Tecnología               | Pendiente de enviar              | —              | Alta                     |
| Qué determina cuenta Dedicada vs. Global compartida          | Operaciones              | Pendiente de enviar              | —              | Alta                     |
| Horario de procesamiento SPE (Transactions)                  | Tecnología / Operaciones | Pendiente de enviar              | —              | Alta                     |
| Monto mínimo de transferencia ARS                            | Operaciones              | Pendiente de enviar              | —              | Media                    |
| Límites operativos de sub-cuenta — periodicidad              | Operaciones              | Pendiente de enviar              | —              | Media                    |
| Campos requeridos para alta de sub-cuenta                    | Compliance               | Pendiente de enviar              | —              | Media                    |

---

## 14. Prototipos

| Archivo | Descripción | Estado |
| ------- | ----------- | ------ |
| `clp_rfq_prototype.html` | v2 — Flujo RFQ base (13 escenas) | Superado por v3 |
| `clp_rfq_prototype_v3.html` | v3 — RFQ completo + módulo Quotes | ✅ Activo — pendiente sync Jira |

**Ubicación:** `../prototypes/clp/`

---

## 15. Links de Referencia

- [Client Portal — Página raíz en Notion](https://www.notion.so/31ae8880def6802e9959d8cd52a5667d)
- [CLP Product Specs en Notion](https://www.notion.so/31ae8880def680ab945cd0a9fdc69502)
- [Consulta enviada a Legales en Slack](https://arduasolutions.slack.com/archives/C0AJ67HK0ES/p1772732902543799)
- [SRS Prime Desk — RFQ Gateway](referencia interna)
- [CVU Collect for Platforms — Product Specs](https://www.notion.so/317e8880def680f99bd8fb746eb0cb47)
- **REQ-8** — CLP RFQ Gateway (client-facing) — Jira: `REQ-8`
- **REQ-31** — Pre-quotes lifecycle — Jira: `REQ-31`
