---
name: LEX — Legal File Management · Discovery Document
features: [LEX]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-06-05
---

# LEX — Legal File Management · Discovery Document

> Discovery a nivel aplicación LEX con los 4 REQs atómicos **enviados a desarrollo** (REQ-47, REQ-52, REQ-53, REQ-54) + **REQ-59 (Reportería — Infraestructura Transversal del Core)** recién creado como prerequisito de REQ-54. Los 4 **prototipos HTML generados** en `prototypes/lex/` pasan a una segunda iteración vía Claude Code Agent Team para reflejar los ajustes del 2026-04-24 PM (UX de Alertas en dos pestañas Nuevas/Histórico · Reportería sin alta en runtime · cambios transversales de header y breadcrumb en el template del core). El módulo **Alertas** tiene discovery hijo propio (`lex-alertas-discovery.md`). La funcionalidad **Export Altas Legales** del módulo Clientes tiene discovery hijo propio (`lex-clientes-export-altas-legales-discovery.md`). Permanece en investigación porque siguen abiertos gaps post-v1 (G-08 a G-14) que van a alimentar iteraciones futuras.

---

## 1. Propósito del documento

Documenta la aplicación del core **LEX** a nivel índice: su propósito en el ecosistema Ardua, los módulos que la componen, el modelo conceptual del dominio, la arquitectura funcional actual según el código del frontend, y las iniciativas en curso.

Sigue la convención padre ↔ hijo del repositorio: este documento es el **índice** de la aplicación. Los discoveries de módulos específicos (`lex-limites-discovery.md`, `lex-alertas-discovery.md`, futuros) son la fuente de detalle. El padre no duplica el detalle del hijo — enlaza y resume.

Es la fuente de verdad para sesiones de producto sobre LEX a nivel aplicación, handoff a Tecnología, y punto de partida obligado para cualquier requerimiento que toque el dominio legal/compliance de Ardua.

---

## 2. Naturaleza y propósito de la aplicación

**Nombre:** LEX
**Tipo:** Aplicación del core (frontend operativo interno)
**Repositorio:** `/Users/yasmani/Projects/core-lex-frontend` · Backend: `core-lex-backend`
**Stack:** Vue 3 + Vite · Auth0 · shadcn-ui (reka-ui) · vee-validate/zod
**Audiencia:** equipos internos de **Legal & Compliance** y **Comercial** de Ardua

LEX es la **herramienta de gestión del legajo del cliente**: onboarding KYC/KYB, documentación, relaciones societarias, límites operativos, registros de auditoría y listas restringidas. Es donde el grupo Ardua gobierna quiénes son sus clientes, qué pueden hacer y bajo qué evidencia legal.

En el modelo del grupo, LEX es la aplicación que responde a las siguientes preguntas:

- **¿Quién es este cliente?** — identidad verificada (KYC/KYB vía AIPrise), tipo (PARTICULAR / COMPANY / BENEFICIARY), dockets por entidad del grupo.
- **¿Con qué entidades del grupo opera?** — Ardua Solutions Corp (`ardua_docket`), Circuit Pay (`circuit_docket`), Haz Pagos (`haz_docket`).
- **¿Qué puede hacer?** — límites de operatoria asignados por entidad, con documentación probatoria de origen de fondos (módulo Límites).
- **¿Con quién está relacionado?** — beneficiarios, cotitulares, agrupadores, sociedades vinculadas.
- **¿Qué evidencia documental respalda su operatoria?** — documentos cargados en S3 vía presigned URLs.
- **¿Qué pasó en el legajo?** — comentarios, logs del sistema, cambios de estado.
- **¿Hay riesgos de compliance asociados?** — blacklist de CUITs restringidos, advertencias de similitud con otros clientes, vencimientos de documentación, alertas de screening contra contrapartes inhabilitadas.

LEX no ejecuta operaciones financieras — OPS, TRD y CLP lo hacen. LEX es la **capa de verdad legal** sobre la que se validan esas operaciones.

---

## 3. Modelo conceptual del dominio

### 3.1 Entidad central — Cliente

Un **Cliente** es la unidad central del dominio. Tiene tipos mutuamente excluyentes:

| Tipo | Descripción | Campos distintivos |
|---|---|---|
| `PARTICULAR` | Persona física que opera por sí misma | `id_number`, `physical.birth_date`, `physical.profession`, `physical.activity`, `physical.vat_condition` |
| `COMPANY` | Persona jurídica | `company.company_type` (LLC, CORPORATION, COOPERATIVE, PARTNERSHIP, SOLE_PROP, TRUST, OTHER), `company.legal_representative`, `company.activity`, `company.description` |
| `BENEFICIARY` | Persona física que existe en el sistema solo como beneficiario de una empresa | Mismos campos que PARTICULAR pero no opera por sí mismo |

**Subtipo funcional (campo `client_types[]`):**

- `GROUPER` — Agregador: agrupa múltiples clientes bajo su control (típicamente un Broker o ALyC que opera para su cartera).
- `DIRECT` — Directo: opera por su cuenta, no agrupa a otros.

Un cliente puede combinar tipo + subtipo: por ejemplo, un COMPANY GROUPER es una empresa que agrupa sub-clientes bajo su paraguas.

### 3.2 Estados del cliente

El atributo `status` define en qué momento del ciclo de vida está el legajo:

| Estado | Significado | Visibilidad |
|---|---|---|
| `PENDING_REVIEW` | Onboarding en curso o terminado, pendiente de aprobación por Legal | Bandeja **Altas** |
| `APPROVED` | Legajo aprobado, cliente activo en el sistema | Módulo **Clientes** (Activo) |
| `DEACTIVATED` | Cliente desactivado por Legal | Módulo **Clientes** (Inactivo) |
| `REJECTED` | Onboarding rechazado | Bandeja **Altas** |

### 3.3 Dockets — identificación por entidad del grupo

Un cliente puede tener **hasta tres dockets** simultáneos, uno por cada entidad del grupo argentina/internacional con la que opera:

- `ardua_docket` — prefijo **AS** (Ardua Solutions Corp, Canadá)
- `circuit_docket` — prefijo **CIR** (Circuit Pay, Argentina · PSAV)
- `haz_docket` — prefijo **HAZ** (Haz Pagos, Argentina · PSP)

La combinación de dockets indica **en qué frentes regulatorios vive el cliente**. Un cliente con los tres dockets opera ARS (Haz Pagos), cripto/fiat argentino (Circuit Pay) e internacional (Ardua Solutions Corp). La ausencia de docket implica que el cliente no opera contra esa entidad.

### 3.4 Onboarding KYC/KYB — vía AIPrise

Todo cliente se procesa a través de un `onboarding` con provider **AIPRISE** (integración externa — ver §7). Cada onboarding tiene:

- **Template**: 8 templates definidos (en `providerTemplates.js`) — se combinan dos dimensiones:
  - **Origen**: *Ardua* (operación internacional) o *Local* (operación argentina).
  - **Modalidad**: *KYC* (particulares), *KYB* (companies), *KYC Analista Legales* (variante con revisión manual reforzada).
- **Status**: `STARTED` → `PENDING_REVIEW` → `FINISHED` (aprobado) | `CANCELLED` (rechazado).
- **Identifier**: ID de AIPrise que permite acceder a su dashboard externo para revisar documentación cruda.
- **Cardinalidad actual — bug documentado en PWI-72:** el sistema almacena un único registro de onboarding por cliente. Cuando el cliente completa más de un intento —porque el primero fue rechazado y debió rehacer el proceso— solo el primer registro queda persistido. La sección de onboarding en el tab Details muestra entonces el intento original (potencialmente rechazado) en lugar del aprobado. PWI-72 expande la tabla para mostrar todos los intentos en orden cronológico descendente y restringe la acción de acceso al registro externo al intento con estado Aprobado.

### 3.5 Relaciones entre clientes

Los clientes se conectan entre sí mediante `relationships[]`:

| Tipo | Dirección | Ejemplo |
|---|---|---|
| `BENEFICIARY` | COMPANY ← PARTICULAR | Un beneficiario final (UBO) de una empresa. Incluye `ownership_percent` y `beneficiary_due_date`. |
| `CO_OWNER` | PARTICULAR ↔ PARTICULAR | Cotitular de una cuenta/legajo particular. |
| `GROUPER` | GROUPER → DIRECT | Agrupador que contiene al cliente directo. |

El modelo soporta merge y replace: cuando Legal detecta que un beneficiario ya existe como cliente independiente, puede reemplazarlo (`mergeBeneficiary`), consolidando relaciones. Dos clientes pueden fusionarse (`mergeClients`) cuando son la misma entidad duplicada.

### 3.6 Documentación

Cada cliente tiene un árbol de documentos con:

- **Upload vía presigned URL a S3** (patrón moderno, reemplaza el legacy `uploadToS3`).
- **Estructura jerárquica**: carpetas (`parent_id`) y archivos.
- **Metadata**: descripción, campo libre "other", status (uploading/success/failed).
- **Operaciones**: upload, download, update, delete, bulk operations.

### 3.7 Actividad — comentarios y logs

El tab CaseActivity unifica dos fuentes cronológicas:

- **Comments**: texto libre dejado por un usuario sobre el legajo (max 2000 caracteres).
- **Logs del sistema**: eventos inmutables — `CLIENT_APPROVED`, `CLIENT_MERGED`, `CLIENT_ASSIGNED`.

El feed combinado es la **historia clínica del legajo** desde la perspectiva de compliance.

### 3.8 Vencimientos de documentación (`due_date`)

Cada cliente (y cada relación BENEFICIARY/CO_OWNER) puede tener un `due_date` que representa el vencimiento de la documentación probatoria. El sistema clasifica el estado en niveles escalonados:

| Nivel | Rango | Color |
|---|---|---|
| `expired` | < 0 días | Rojo intenso |
| `critical` | ≤ 7 días | Rojo |
| `warning` | ≤ 14 días | Naranja |
| `early_warning` | ≤ 31 días | Ámbar |
| `ok` | > 31 días | Gris |

Las notificaciones in-app (bell) alertan sobre vencimientos próximos y clientes asignados.

---

## 4. Arquitectura funcional actual (según código `core-lex-frontend`)

### 4.1 Navegación top-level

El sidebar actual expone **tres módulos**:

- `/clientes` — Clientes (con tabs Clientes + Cuentas/CVUs)
- `/altas` — Altas (cola de PENDING_REVIEW)
- `/usuarios` — Usuarios del sistema LEX

Existe una cuarta ruta `/usuarios/blacklist` que vive **fuera del sidebar** — accesible solo por URL directa. Esta ubicación es un indicador de que el módulo no fue elevado al nivel que su importancia de compliance justifica (ver §10 y H-01).

**Estado objetivo tras los 4 REQs de §8:** el sidebar sumará **tres nuevos módulos top-level**:
- `/blacklist` — Blacklist (REQ-47 re-scopeado)
- `/alertas` — Alertas (REQ-52)
- `/reportes` — Centro de Reportería (REQ-54)

### 4.2 Módulo Clientes — tab Clientes

Listado principal con filtro `status in (APPROVED, DEACTIVATED)`. Columnas: Dockets (triple: ardua/circuit/haz), Nombre, Tax Number/ID, Estado, Template de onboarding, Tipo Cliente (Agregador/Directo), Usuario Asignado.

Filtros disponibles: nombre, tax_number, docket específico por partner (Ardua/Circuit Pay/Haz Pagos), template de onboarding, client_type (Grouper/Direct), is_active, type (Company/Particular).

Paginación server-side, orden default por `ardua_docket DESC`.

### 4.3 Módulo Clientes — tab Cuentas

Listado de **CVUs** (Clave Virtual Uniforme — cuentas bancarias virtuales de Haz Pagos). Columnas: número de cuenta, cliente, fecha de creación, sponsor.

Filtros: rango de fechas, sponsor (BIND / COINAG), nombre de cliente.

**Export a XLSX** disponible.

Este tab es el **primer puente desde LEX hacia el mundo operativo de Haz Pagos** — muestra las cuentas que existen en producción para los clientes aprobados.

Nota terminológica importante: **CBU/CVU ≠ CUIT**. El `account_address` de una cuenta es el CBU/CVU (identificador de la cuenta bancaria/virtual); el `client_tax_number` es el CUIT (identidad fiscal del titular). Son entidades distintas del modelo — una cuenta tiene un CBU/CVU y pertenece a un CUIT.

### 4.4 Módulo Altas

Cola de `status = PENDING_REVIEW`. Representa la **bandeja de onboarding** — clientes que completaron (o abandonaron) el flujo AIPrise y esperan revisión de Legal.

Por cada alta se ve: fecha de creación, nombre, tax number, estado Ardua (interno), estado AIPrise, template usado, tipo, acciones (asignar usuario, eliminar).

Permite:
- **Aprobar / Rechazar / Marcar pendiente** el onboarding (vía `updateAIPriseStatus`).
- **Crear empresa manual** (bypass del onboarding AIPrise — crítico para casos donde KYB no aplica o no está disponible).
- **Eliminar** alta rechazada.
- **Asignar** alta a un usuario específico (compliance o commercial).

### 4.5 Módulo Usuarios

Listado de usuarios del sistema LEX (no clientes). Columnas: email, nombre, rol.

**Este módulo es de gestión interna de accesos al sistema**, no de clientes. No debería confundirse con "Clientes Particulares".

### 4.6 Módulo Blacklist — /usuarios/blacklist (actual)

Lista negra de CUITs con:

- **CRUD**: crear (CUIT + motivo), editar (solo motivo, el CUIT es inmutable), eliminar.
- **Validación**: CUIT exactamente 11 dígitos numéricos.
- **Carga masiva** (bulk) vía `BulkBlacklistModal` — endpoint `POST /blacklist/bulk`.

Columnas: CUIT, motivo, fecha de carga.

**Lo que el módulo hace hoy:** permite mantener un registro de CUITs restringidos en el sistema.

**Lo que el módulo NO hace hoy:**
- No cruza la blacklist contra movimientos de clientes (en OPS, CVUs, cable internacional, etc.).
- No genera alertas.
- No es accesible desde el sidebar — solo por URL directa.
- No tiene vista de "clientes que alguna vez operaron con este CUIT".

Este es el punto de entrada del **REQ-47 re-scopeado** (ver §8.2). El cruce y las alertas viven en REQ-52 (§8.3).

### 4.7 Detalle de Cliente — `/clientes/:id`

Vista de legajo completo. Cuatro tabs:

| Tab | Contenido |
|---|---|
| **Details** | Info del cliente · Dockets · Onboarding (AIPrise): URL de la sesión + tabla de intentos (Proveedor / Tipo / Estado / Identificador / Operaciones) · Relaciones (beneficiarios, cotitulares, agrupadores, sociedades) · Preguntas del formulario de onboarding · Totalizador COINAG · Advertencias de similitud · Desactivación |
| **Documents** | Árbol de documentos con carpetas, upload/download/edit/delete |
| **Limits** | Módulo de Límites — ver `lex-limites-discovery.md`. En producción hoy muestra Consumo total, Disponible, progress bars por límite activo agrupadas por entidad del grupo (Haz Pagos, Circuit Pay), con badge de estado (ACTIVO), origen del límite (ej: Recibo de Sueldo) y rango de validez. |
| **CaseActivity** | Feed cronológico de comentarios + logs del sistema |

**Sección Onboarding en el tab Details (estado actual en producción):** expone dos elementos:
- **URL de la sesión**: campo con enlace directo al dashboard de AiPrise para consultar la documentación cruda del intento almacenado.
- **Tabla de intentos de onboarding**: columnas Proveedor, Tipo, Estado, Identificador y Operaciones. Hoy limitada a una única fila por cliente — ver nota de cardinalidad en §3.4 y PWI-72.

**Estado objetivo post PWI-72:** la tabla mostrará todos los intentos registrados en orden cronológico descendente. La acción de acceso al registro externo (menú de Operaciones) estará habilitada únicamente en la fila del intento con estado Aprobado. Cuando no existe intento aprobado, el historial se muestra completo pero sin la acción disponible.

**Totalizador COINAG**: un popover en el detalle permite consultar `/totalizer/{taxId}` → retorna `cantidadTotalCVU` y `cantidadTotalCBU`. Es el **único cruce hoy entre el tax_id del cliente y el mundo operativo** vía agregado de conteo. No muestra movimientos ni contrapartes — solo conteo agregado. Patrón base que la nueva tab "Operatoria" del REQ-53 (§8.4) va a expandir con más métricas operativas (transacciones, volumen, breakdowns).

**Confirmar Legajo**: acción "Partner Select" que permite asociar el legajo aprobado a uno o varios partners (Ardua / Circuit Pay / Haz Pagos) — este paso es el que asigna dockets definitivos.

### 4.8 Similarity warnings

Al crear o recibir un cliente en PENDING_REVIEW, el sistema calcula advertencias de similitud (`metadata.similarity_warnings[]`) con otros clientes existentes. Cada warning tiene `client_id`, `name`, `similarity` (0-1). Similaridad ≥ 0.9 es rojo, ≥ 0.7 ámbar, otros amarillo.

Se surface en dos lugares:
- En la vista de detalle del cliente (si está en PENDING_REVIEW).
- En cada beneficiario relacionado — permite reemplazar el beneficiario recién creado por un cliente existente vía merge.

Es un mecanismo preventivo contra duplicación de legajos en compliance.

---

## 5. Módulos — inventario e índice

Convención: cada módulo con discovery propio tiene enlace. Los que aún no tienen discovery se listan con su estado.

| Módulo | Ubicación | Discovery | Prototipo | Estado |
|---|---|---|---|---|
| **Clientes** | `/clientes` (tab Clientes) | — | — | Producción · Sin discovery dedicado (cubierto en §4.2 de este doc) |
| **Cuentas (CVUs)** | `/clientes?tab=cuentas` | — | — | Producción · Sin discovery dedicado (cubierto en §4.3) |
| **Altas** | `/altas` | — | — | Producción · Sin discovery dedicado (cubierto en §4.4) |
| **Usuarios** | `/usuarios` | — | — | Producción · Sin discovery dedicado — bajo scope, no crítico |
| **Blacklist** | `/blacklist` (a crear como top-level; hoy en `/usuarios/blacklist`) | ❌ no aplica | ✅ [`lex_blacklist_prototype.html`](../../prototypes/lex/lex_blacklist_prototype.html) | Scope del **REQ-47** re-scopeado (§8.2) · **SENT TO DEV 2026-04-24** |
| **Alertas** | `/alertas` (a crear como top-level) | ✅ [`lex-alertas-discovery.md`](./lex-alertas-discovery.md) | ✅ [`lex_alertas_prototype.html`](../../prototypes/lex/lex_alertas_prototype.html) | Scope del **REQ-52** (§8.3) · **SENT TO DEV 2026-04-24** · _UX ajustada 2026-04-24 PM a dos pestañas Nuevas/Histórico_ |
| **Centro de Reportería** | `/reportes` (a crear como top-level) | ❌ no aplica | ✅ [`lex_reporteria_prototype.html`](../../prototypes/lex/lex_reporteria_prototype.html) | Scope del **REQ-54** (§8.5) · **SENT TO DEV 2026-04-24** · _Scope reducido 2026-04-24 PM: sin alta en runtime; consumidor de REQ-59_ |
| **Límites** | Tab dentro de detalle cliente | ✅ [`lex-limites-discovery.md`](./lex-limites-discovery.md) | — | Producción · REQ-44 y REQ-45 en curso |
| **Documents** | Tab dentro de detalle cliente | — | — | Producción · Sin discovery dedicado |
| **CaseActivity** | Tab dentro de detalle cliente | — | — | Producción · Sin discovery dedicado |
| **Operatoria** (totalizadores per-cliente) | Tab nueva a crear en detalle cliente | ❌ no aplica | ✅ [`lex_operatoria_prototype.html`](../../prototypes/lex/lex_operatoria_prototype.html) | Scope del **REQ-53** (§8.4) · **SENT TO DEV 2026-04-24** |
| **Relaciones** (Beneficiarios, Cotitulares, Agrupadores, Sociedades) | Sección dentro del tab Details | — | — | Producción · Sin discovery dedicado — parte del modelo Cliente |

**Criterio para decidir si un módulo merece discovery propio:** lo merece cuando acumula iniciativas en el tiempo, tiene decisiones de diseño propias, o interactúa con otras aplicaciones del core. Módulos puramente CRUD sobre entidades simples (Usuarios, Blacklist, Centro de Reportería, tab Operatoria) no lo necesitan — el scope está cubierto por el REQ y el prototipo. Módulos con workflow multi-persona y cruce de dominios (Alertas) claramente sí.

---

## 6. Roles y permisos

El sistema LEX distingue roles via Auth0 custom claim `USER_ROLES`. Detectados en el código:

| Rol | Alias en código | Alcance observado |
|---|---|---|
| **ADMIN_LEX** | `admin-lex`, `admin_lex` | Acceso total · Puede editar clientes aprobados · Ve usuarios asignados de tipo COMPLIANCE |
| **COMMERCIAL_LEX** | `commercial-lex`, `commercial_lex` | Ve banner "Comercial Asignado" · Puede editar clientes asignados · Ve todos los usuarios asignados · Asigna comerciales a clientes |
| **VIEWER_LEX** | `viewer-lex`, `viewer_lex` | Solo lectura · Solo ve asignaciones propias |
| **COMPLIANCE** | role en `assigned_users[]` (no es un rol Auth0 top-level; es un atributo del usuario asignado) | Usuarios que trabajan en la aprobación del legajo |
| **COMMERCIAL** | role en `assigned_users[]` | Comerciales asignados a un cliente |

**Este modelo de roles no está documentado formalmente** — emerge del código. Debería consolidarse si aparece un requerimiento de permisos. La asignación de alertas en REQ-52 se apoya sobre este mismo modelo de usuarios (ver `lex-alertas-discovery.md`).

---

## 7. Integraciones

### 7.1 Con otras aplicaciones del core

| Aplicación | Dirección | Estado |
|---|---|---|
| **OPS** | LEX expone `getCVUs` y `getClientTotalizer` que consumen datos del esquema de Haz Pagos vía COINAG. El frontend OPS (`core-ops-frontend`) además expone vista de movimientos del esquema Haz Pagos con CUIT de contraparte estructurado (`counterparty_tax_number`) para los tipos relevantes — ver §7.3. **REQ-52** formaliza el cruce inverso: OPS consulta la blacklist de LEX al registrar movimientos y emite eventos de alerta que LEX consume. | 🟡 Parcial — lectura desde LEX existe, escritura de cruces en OPS pendiente (scope REQ-52) |
| **CLP** | Un cliente APPROVED en LEX con docket habilitado se refleja como cuenta activa en CLP. Este flujo no está documentado — ver gap G-01. | 🟡 Inferido, no documentado |
| **TRD** | Los clientes que operan en mesa tienen límites consumidos por quotes. Relación explícita en `lex-limites-discovery.md` §9. | 🟡 Mencionada en discovery hijo, sin mapeo operativo |
| **FIN** | Sin relación operativa directa detectada en el frontend. | 🔴 Sin evidencia |
| **COM** | El rol `commercial-lex` asigna comerciales a clientes LEX — es el punto de contacto COM ↔ LEX. | 🟢 Integración por rol de usuario · Formalización en `com-discovery.md` |

### 7.2 Con entidades externas

| Entidad / Proveedor | Rol | Integración |
|---|---|---|
| **Auth0** | Autenticación · Provider de `USER_ROLES` | SDK `@auth0/auth0-vue` · Protección de rutas via `requiresAuth` |
| **AIPrise** | KYC/KYB automatizado | Onboardings con provider `AIPRISE`, 8 templates, dashboard externo para revisar documentación cruda. Ardua Solutions Corp cede accesos a Haz Pagos y Circuit Pay (ver `framework/marco-legal.md` §4.2). |
| **COINAG** | Sponsor bancario del esquema Haz Pagos · Provee CVUs | Endpoint `/totalizer/{taxId}` + listado `/cvus?sponsor=COINAG`. Ver `entities/coinag.md`. |
| **BIND** | Sponsor bancario alternativo del esquema Haz Pagos | Listado `/cvus?sponsor=BIND`. Ver `entities/bind.md`. No visible aún en interfaces PSP actuales; pendiente de incorporación. |
| **Banco de Comercio** | Sponsor bancario adicional del esquema Haz Pagos | No visible aún en interfaces PSP actuales; pendiente de incorporación. |
| **AWS S3** | Almacenamiento de documentos | Presigned URLs con expiración. Archivos vinculados al client_id. |

**No integrado actualmente** con herramientas externas de compliance que existen en el stack del grupo: **Worldcheck**, **Aiprise** (más allá del onboarding), **Elliptic**. Son accesos cedidos por Ardua Solutions Corp según `framework/marco-legal.md` §4.2, pero su consumo desde LEX no está mapeado — gap G-02.

### 7.3 Modelo del movimiento en OPS — análisis de `core-ops-frontend` validado con Valen Vila

Aunque este documento es el discovery de LEX, el REQ-52 cruza a OPS. Para evitar que `ops-discovery.md` tenga que leerse en cada sesión sobre screening, este documento consolida el análisis del frontend de OPS en lo estrictamente relevante al cruce con blacklist.

**Aclaración terminológica — "PSP" en el contexto de OPS:**

En el repositorio `core-ops-frontend`, la sección bautizada como "PSP" (`/psp/home`, `/psp/accounts`) se refiere **exclusivamente al esquema operativo de Haz Pagos** — la entidad del grupo que cumple el rol regulatorio de PSP (Proveedor de Servicios de Pago) en Argentina. No incluye Circuit Pay (PSAV), ni Ardua Solutions Corp (MSB), ni Astra Ventures (VASP), aunque Circuit Pay también opere bajo una licencia de servicios financieros argentina.

Por lo tanto, cuando este documento dice "movimientos PSP", se debe leer como "movimientos del esquema de Haz Pagos". Es una ambigüedad histórica del naming del código que vale tener presente.

#### Taxonomía de tipos de movimiento en el esquema Haz Pagos

Validado con Valen Vila (2026-04-23). El backend maneja los siguientes tipos de movimiento, algunos con contraparte externa y otros puramente internos de la plataforma:

| Tipo backend | Display en frontend | ¿Tiene contraparte externa? | Rol funcional |
|---|---|---|---|
| `DEPOSIT` | Deposit | ✅ Sí | Ingreso de pesos desde una cuenta externa (con ordenante identificable) |
| `WITHDRAWAL` | Withdrawal | ✅ Sí | Egreso de pesos hacia una cuenta externa (con beneficiario identificable) |
| `TRANSFER_IN` | Transfer In | ✅ Sí | Transferencia recibida entre clientes Ardua (ambas puntas estructuradas) |
| `TRANSFER_OUT` | Transfer Out | ✅ Sí | Transferencia enviada entre clientes Ardua (ambas puntas estructuradas) |
| `COLLECTOR_IN` | Addition / Collector In | ❌ No — interno | Movimiento técnico entre cuentas propias de la plataforma |
| `COLLECTOR_OUT` | Deduction / Collector Out | ❌ No — interno | Movimiento técnico entre cuentas propias de la plataforma |
| `FEE` | Fee | ❌ No — interno | Cargo por comisiones/costos de operatoria |
| `FX_DEPOSIT` | Swap In | ❌ No — interno | Ingreso resultante de una operación de swap/exchange dentro del grupo |
| `FX_WITHDRAWAL` | Swap Out | ❌ No — interno | Egreso resultante de una operación de swap/exchange dentro del grupo |
| `INT_DEPOSIT` | (según contexto) | ❌ No — interno | Ingreso por ajuste interno entre cuentas de la plataforma |
| `INT_WITHDRAWAL` | (según contexto) | ❌ No — interno | Egreso por ajuste interno entre cuentas de la plataforma |

**Solo los 4 tipos marcados con ✅ son candidatos a screening contra blacklist.** El resto son movimientos propios de la operatoria de la plataforma (internos, técnicos, fees, swaps entre cuentas propias) — por diseño no tienen contraparte externa identificable, y el cruce contra blacklist no aplica.

**Validación de Valen (2026-04-23):** confirmó que en **producción, los 4 tipos relevantes (DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT) ya llegan con `counterparty_tax_number` poblado en todos los casos**. No es una hipótesis ni una lectura optimista del frontend: es el comportamiento actual del sistema según el dominio.

#### Agnosticismo respecto al sponsor bancario

La lógica de captura y estructura del movimiento es **idéntica para cualquier sponsor bancario** del esquema Haz Pagos (COINAG hoy en producción, BIND y Banco de Comercio a incorporarse). Esto implica que **el diseño del motor de cruce no se multiplica por sponsor** — es un único motor que opera sobre los movimientos agregados del esquema Haz Pagos, independientemente de la institución bancaria subyacente.

Consecuencia para el REQ-52: la incorporación futura de BIND y Banco de Comercio no requiere trabajo adicional en el motor de cruce.

#### Cobertura del screening por entidad del grupo

| Entidad del grupo | Rol regulatorio | Canal operativo | Tipos con contraparte estructurada hoy | Cruce factible hoy |
|---|---|---|---|---|
| **Haz Pagos** | PSP (Argentina) | `/psp/home` — cualquier sponsor | DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT | ✅ Sí |
| **Circuit Pay** | PSAV (Argentina) | Dashboard principal (cripto) + pata ARS vía CVU de Haz Pagos | Solo la pata ARS (cae bajo Haz Pagos) | 🟡 Parcial |
| **Ardua Solutions Corp** | MSB (Canadá) | Dashboard principal (cross-border) | Ninguno — `counterparty` es texto libre | ❌ No |
| **Astra Ventures** | VASP (Polonia) | Dashboard principal (cripto EU) | Ninguno — `counterparty` es texto libre | ❌ No |

**Nota sobre Circuit Pay ARS ↔ Haz Pagos CVU:** Según `framework/marco-legal.md` §4.3, los clientes argentinos que compran cripto en Circuit Pay tienen relación contractual simultánea con Haz Pagos, porque el flujo de ingreso de pesos usa el CVU de Haz Pagos. Esto implica que el movimiento de ARS de ese flujo se registra en el esquema de Haz Pagos y por lo tanto sí tiene `counterparty_tax_number` estructurado. La parte cripto (cripto ↔ cripto, wallet externa) no.

**Implicación:** esta matriz define el scope posible del REQ-52. Ver §8.3 y H-06.

---

## 8. Iniciativas en curso

### 8.1 Descomposición del pedido original en 4 REQs atómicos

El REQ-47 original pedía un "Screening de Contrapartes" en un único ticket. Tras conversación con HoP + Valen Vila (2026-04-23), quedó claro que ese pedido cubre **4 capacidades funcionales distintas** que conviene descomponer en REQs atómicos. Cada uno tiene objetivo, owner técnico y criterios de aceptación propios — los 4 juntos cubren la necesidad completa que Juan planteó.

**Tickets en Jira (2026-04-24) — los 4 en desarrollo:**

| # | Key | Título | App(s) | Prioridad | Estado | Prototipo |
|---|---|---|---|---|---|---|
| 1 | [**REQ-47**](https://arduasolutions.atlassian.net/browse/REQ-47) | LEX — Gestión de Blacklist de CUITs | LEX | **Highest** (P0) | SENT TO DEV | [lex_blacklist_prototype.html](../../prototypes/lex/lex_blacklist_prototype.html) |
| 2 | [**REQ-52**](https://arduasolutions.atlassian.net/browse/REQ-52) | LEX — Módulo de Alertas + Screening de Contrapartes como primer tipo de alerta | OPS + LEX | **High** (P1) | SENT TO DEV | [lex_alertas_prototype.html](../../prototypes/lex/lex_alertas_prototype.html) |
| 3 | [**REQ-53**](https://arduasolutions.atlassian.net/browse/REQ-53) | LEX — Tab "Operatoria" en Detalle de Cliente con Totalizadores | LEX | **High** (P1) | SENT TO DEV | [lex_operatoria_prototype.html](../../prototypes/lex/lex_operatoria_prototype.html) |
| 4 | [**REQ-54**](https://arduasolutions.atlassian.net/browse/REQ-54) | LEX — Centro de Reportería Regulatoria y Operativa | LEX | **Medium** (P2) | SENT TO DEV | [lex_reporteria_prototype.html](../../prototypes/lex/lex_reporteria_prototype.html) |

**Links entre REQs en Jira:**
- REQ-47 `blocks` REQ-52
- REQ-52 `relates to` REQ-33 (patrón arquitectónico)
- REQ-53 `relates to` REQ-52 + `relates to` REQ-47
- REQ-52 `blocks` REQ-54 (alertas de fechas consumen el módulo Alertas)
- REQ-54 `relates to` REQ-47 (origen común del pedido)

**Decisiones clave acordadas con HoP (2026-04-24):**
- Módulo del REQ-47: **Blacklist** (ruta `/blacklist`).
- Módulo del REQ-52: **Alertas** (ruta `/alertas`, a nivel top-level — se descartó colgarlo de una sección "Sistema" intermedia como en REQ-33, porque en LEX el peso de Alertas justifica estar al mismo nivel que Clientes / Altas / Blacklist).
- El módulo Alertas tiene **dos pestañas** (Nuevas + Histórico; ajuste 2026-04-24 PM); dentro de cada pestaña el tipo de alerta es un atributo/filtro, no una pestaña de navegación por tipo.
- En la pestaña **Nuevas** (solo `status = new`) se hereda el formato visual del prototipo TRD de notificaciones (REQ-33) — card-list con énfasis en triaje rápido. Al auto-asignarse o comentar, la alerta pasa a `in_review` y migra a Histórico.
- En la pestaña **Histórico** (resto de estados) hay listado tabular filtrable; orden de columnas: Fecha (primera), Tipo, Cliente, específicas del tipo, Estado (penúltima), Responsable (última).
- Acción en tarjetas de alerta: **"Marcar como revisada"** (más honesta al dominio legal que "resuelta").
- Las alertas tienen **state machine + asignación a responsable + comentarios** — esto eleva REQ-52 en complejidad respecto al REQ-33 y motivó la creación del discovery hijo (`lex-alertas-discovery.md`).
- REQ-54 pasa de "framework shell" a **Centro de Reportería** con ambición propia: CRUD de definiciones de reportes (Legal), generación manual (CTA) + automática (CRON), alertas sobre fechas de emisión, histórico con metadata y re-descarga.
- REQ-53 **NO duplica** la funcionalidad del tab Limits existente. La sección "Uso vs. Límites" originalmente propuesta quedó descartada porque esa visualización ya existe hoy en producción (tab Limits con Consumo total, Disponible, progress bars por límite activo agrupadas por entidad). La tab Operatoria se enfoca exclusivamente en las métricas operativas no cubiertas: transacciones, volumen, actividad, breakdowns por tipo de movimiento y por entidad del grupo.

**Relación con el REQ-47 original:** el REQ-47 existente se **actualizó in-place** (título, descripción y scope) para limitarlo a la gestión de la Blacklist. Los otros 3 REQs se crearon nuevos. El nuevo REQ-47 hereda la prioridad Highest del original — es el prerequisito de todos los demás.

El detalle de cada REQ está en §8.2 a §8.5. La sección §8.6 consolida dependencias y orden de ejecución. La §8.7 documenta el patrón de referencia del REQ-33.

---

### 8.2 REQ-47 (re-scope) — LEX — Gestión de Blacklist de CUITs

**Objetivo:** consolidar en LEX un módulo dedicado de gestión de Blacklist de CUITs, accesible desde la navegación principal, con las operaciones de alta/baja/edición/carga masiva que Legal necesita para mantener la lista actualizada. Este REQ **no cubre** el cruce con movimientos ni las alertas (eso vive en REQ-52) — solo cubre el mantenimiento de la lista como fuente de verdad.

**Solicitante original:** Juan Gonzalez — Legal
**Ticket:** https://arduasolutions.atlassian.net/browse/REQ-47
**Estado actual:** `SENT TO DEV` (2026-04-24)
**Prototipo:** [lex_blacklist_prototype.html](../../prototypes/lex/lex_blacklist_prototype.html)
**Hilo Slack:** https://arduasolutions.slack.com/archives/C0AJ67HK0ES/p1776791169800289

#### Contexto

El módulo Blacklist ya existe técnicamente en `/usuarios/blacklist` con CRUD + bulk upload funcionando (ver §4.6). El problema no es funcional sino de **descubribilidad y jerarquía**: está enterrado bajo `/usuarios` como si fuera un sub-módulo de gestión de usuarios del sistema, cuando en realidad es una herramienta de compliance de primer orden que Legal usa como fuente de CUITs restringidos.

La validación con el HoP y con Valen Vila (especialista de dominio LEX/PSP) confirmó que el módulo debe elevarse a nivel top-level del sidebar.

#### Scope funcional

1. **Nueva entrada "Blacklist" en el sidebar principal de LEX** como ítem top-level, accesible en ruta raíz `/blacklist`. La ruta actual `/usuarios/blacklist` se mantiene como redirect para no romper bookmarks existentes.
2. **Ícono y ubicación** en el sidebar coherente con el peso del módulo. Sugerencia: ícono tipo "shield" o "ban" que transmita la naturaleza de control restrictivo.
3. **Vista principal idéntica a la existente en funcionalidad** — listado con columnas CUIT / Motivo / Fecha de carga, con filtros (al menos por CUIT y rango de fechas), paginación server-side.
4. **Operaciones preservadas sin cambios:**
   - Alta individual (CUIT + motivo, CUIT inmutable una vez creado).
   - Edición (solo motivo).
   - Baja.
   - Carga masiva vía modal (endpoint `POST /blacklist/bulk`).
5. **Validaciones:** CUIT exactamente 11 dígitos numéricos (ya existente).
6. **Información visible al consultar un item:** CUIT, motivo, fecha de carga, usuario que lo cargó (si el backend lo tiene hoy, exponerlo).

#### Fuera de scope

- **Cruce de la blacklist con movimientos** — scope del REQ-52.
- **Alertas sobre matches** — scope del REQ-52.
- **Vista de "clientes que alguna vez operaron con este CUIT"** — puede considerarse para v2 del módulo Blacklist.
- **Integración con listados externos (UIF / AFIP / sanciones internacionales)** — candidato a REQ futuro, ver G-06.
- **Historial de cambios / auditoría** — no está en v1; si Legal lo pide, REQ propio.

#### Criterios de aceptación

- La Blacklist aparece como ítem top-level en el sidebar de LEX, con el nombre "Blacklist" y un ícono descriptivo.
- Al hacer clic, se carga la vista de listado en el área principal — sin pop-ups ni modales como único punto de entrada.
- Legal puede dar de alta un CUIT + motivo desde un formulario dedicado y verlo reflejado en el listado sin refrescar la página.
- Legal puede editar el motivo de un CUIT existente. El CUIT en sí no es editable.
- Legal puede dar de baja un CUIT con confirmación previa ("¿Está seguro?").
- Legal puede cargar múltiples CUITs de una vez vía carga masiva (CSV o archivo estándar), con feedback sobre cuántos se cargaron exitosamente y cuántos fallaron y por qué.
- El filtro por CUIT y rango de fechas funciona correctamente.
- La ruta `/usuarios/blacklist` redirige a `/blacklist`.

#### Dependencias

- **Ninguna técnica** — es refactor de UI + elevación de navegación.
- **No bloquea** al equipo OPS.
- **Bloqueante para:** REQ-52 (el motor de cruce necesita consumir la blacklist como servicio — la API ya existe, la dependencia es más simbólica/ordenamiento).

---

### 8.3 REQ-52 — LEX — Módulo de Alertas + Screening de Contrapartes como primer tipo de alerta

**Objetivo:** entregar (a) un módulo de Alertas genérico y extensible en LEX, apto para recibir múltiples tipos de notificaciones de compliance con workflow de gestión (estados, asignación, comentarios, auditoría), y (b) el primer tipo de alerta que lo estrena: el screening de contrapartes contra la Blacklist sobre movimientos del esquema Haz Pagos.

**Solicitante de origen:** el pedido original es de Juan Gonzalez — Legal (REQ-47). El REQ-52 concentra el corazón de lo que Juan pidió.
**Ticket:** https://arduasolutions.atlassian.net/browse/REQ-52
**Estado actual:** `SENT TO DEV` (2026-04-24)
**Prototipo:** [lex_alertas_prototype.html](../../prototypes/lex/lex_alertas_prototype.html)
**Prioridad:** High (P1) — es el REQ de mayor valor de negocio entre los 4.
**Discovery hijo:** [`lex-alertas-discovery.md`](./lex-alertas-discovery.md) — contiene el detalle completo del módulo Alertas: state machine, asignación, comentarios, criterios de aceptación por capacidad, casos de uso, y preguntas abiertas.

#### Resumen funcional

El módulo Alertas de LEX es una capacidad transversal para gestionar todo tipo de notificaciones de compliance. En v1 arranca con el primer tipo (screening de contrapartes), pero está diseñado para recibir tipos adicionales (documentación vencida, límites al tope, relaciones societarias problemáticas, reportes pendientes de emisión — este último consumido por REQ-54, etc.) sin refactor estructural. Nuevos tipos se suman como REQs hijos.

Como primer tipo de alerta, el screening:

- LEX tiene una lista de CUITs restringidos (Blacklist). OPS registra movimientos del esquema Haz Pagos donde los 4 tipos relevantes (DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT) traen `counterparty_tax_number` estructurado (validado con Valen).
- Al detectarse un match entre `counterparty_tax_number` del movimiento y la Blacklist, se genera una alerta con payload completo.
- La alerta se muestra en el listado único del módulo Alertas junto con los demás tipos (identificada por su tipo como atributo).

**Lo que hace distinto a REQ-52 respecto al patrón del REQ-33:** el dominio de compliance requiere que las alertas sean **gestionables** — no solo visualizables. Una alerta no se "resuelve y se va" en un click; tiene un ciclo de vida con estados (`new` → `in_review` → `resolved` / `dismissed`), puede **asignarse a un responsable** dentro del equipo Legal, y admite **comentarios** (libres durante el análisis + obligatorio al cerrar, para trazabilidad de auditoría). Esto eleva la complejidad respecto al REQ-33 y justifica un discovery hijo dedicado.

#### Capacidades resumidas

**Parte A — Motor de cruce (en OPS):**

1. Al momento de registrar / reflejar un movimiento del esquema Haz Pagos cuyo `type` sea uno de los 4 relevantes, consultar la Blacklist de LEX.
2. Si el `counterparty_tax_number` del movimiento coincide con algún CUIT de la Blacklist, generar un evento de alerta con el payload completo (movement, client, counterparty, amount, sponsor, blacklist_reason).
3. El evento se persiste en un store de alertas accesible por LEX (mecanismo técnico a definir por Santiago — ver G-11).
4. **Idempotencia:** un mismo movimiento contra un mismo CUIT no genera alertas duplicadas.
5. **Alcance técnico:** solo esquema Haz Pagos — alcance A definido en §7.3. Ardua Solutions Corp, Astra Ventures y Circuit Pay pata cripto **no** están cubiertos (ver G-08).

**Parte B — Módulo Alertas (en LEX):**

Ver `lex-alertas-discovery.md` para el detalle completo. Resumen:

1. **Nuevo ítem top-level "Alertas"** en el sidebar de LEX (ruta `/alertas`), con badge numérico de alertas activas (`new` + `in_review`).
2. **Página principal con dos pestañas** (ajuste 2026-04-24 PM):
   - **Pestaña Nuevas**: formato tipo cards estilo REQ-33, muestra únicamente alertas con `status = new`. Triaje rápido.
   - **Pestaña Histórico**: listado tabular con filtros para gestión completa, muestra alertas con `status ∈ {in_review, resolved, dismissed}`. Columnas en orden: **Fecha** (primera), Tipo, Cliente, columnas específicas del tipo, **Estado** (penúltima), **Responsable** (última).
   - Una alerta arranca en Nuevas y migra automáticamente a Histórico al primer evento de interacción (asignación o comentario). No vuelve a Nuevas aunque se desasigne.
3. **Vista detalle de alerta** con toda la metadata, sección de **asignación de responsable**, timeline de **comentarios**, y **acciones de transición de estado** (asignarme / asignar a X / marcar como revisada / descartar).
4. **State machine** con 4 estados (`new` / `in_review` / `resolved` / `dismissed`) y transiciones explícitas. Los cierres (`resolved`, `dismissed`) exigen comentario obligatorio. `in_review → new` no existe.
5. **Comentarios libres** en cualquier momento del ciclo de vida, acumulándose en un timeline (similar al tab CaseActivity del cliente).
6. **Arquitectura extensible** — el modelo de datos soporta agregar nuevos tipos de alerta sin refactor estructural. Sumar un nuevo tipo es definir el tipo + sus campos específicos + la lógica de generación, reutilizando pestañas, state machine, asignación, comentarios, permisos y timeline.

#### Fuera de scope

- **Bloqueo de la operación al detectar match** — en v1 la alerta es **no bloqueante** (solo notifica).
- **Notificaciones push / email / otro canal** — el canal es exclusivamente in-app en v1.
- **Tipos de alerta distintos al screening de contrapartes** — la infraestructura queda preparada; cada tipo adicional es un REQ propio que suma un nuevo tipo al catálogo (por ejemplo, REQ-54 suma los tipos relacionados con reportes).
- **Cobertura de operatoria fuera del esquema Haz Pagos** — G-08.
- **Integración con listados externos de CUITs** — G-06.
- **Auto-asignación por regla de negocio** — v1 la asignación es explícita (manual); auto-asignación es v2.

#### Dependencias

- **REQ-47** (Blacklist como módulo top-level) — conceptualmente precede.
- **Input de Santiago** sobre el mecanismo técnico del evento OPS→LEX (G-11).
- **Decisión de Juan** sobre el comportamiento bloqueante vs. no-bloqueante (C3) — asumido no-bloqueante por default.

**Todo el detalle funcional, criterios de aceptación, casos de uso y preguntas abiertas está en `lex-alertas-discovery.md`.**

---

### 8.4 REQ-53 — LEX — Tab "Operatoria" en Detalle de Cliente con Totalizadores

**Objetivo:** incorporar al detalle de cliente en LEX una nueva superficie dedicada a la **información operativa agregada del cliente** — cantidad de transacciones, volumen total, breakdowns por tipo de movimiento, etc. — con cards totalizadores que permitan a Legal entender rápido el perfil operativo sin salir de LEX.

**Solicitante:** Juan Gonzalez — Legal (parte de la reformulación del REQ-47 original, específicamente la "información específica del cliente" que originalmente se pedía como "acceso a la PSP").
**Ticket:** https://arduasolutions.atlassian.net/browse/REQ-53
**Estado actual:** `SENT TO DEV` (2026-04-24)
**Prototipo:** [lex_operatoria_prototype.html](../../prototypes/lex/lex_operatoria_prototype.html)
**Prioridad:** High (P1) — puede ejecutarse en paralelo con REQ-52.

#### Contexto

En la conversación con Juan sobre "acceso a la PSP", se desdobló el pedido en dos grupos (información global vs. información del cliente). La parte de información del cliente se resuelve sin darle acceso a la PSP en sí — la información se trae a LEX y se presenta de forma agregada en el contexto donde Legal ya está trabajando (el detalle del cliente).

El patrón base ya existe en LEX: un popover de totalizador en el tab Details que hoy devuelve `cantidadTotalCVU` y `cantidadTotalCBU` agregados sobre la operatoria del cliente en la PSP (Haz Pagos, agnóstico al sponsor bancario). Es conceptualmente lo que queremos, pero evolucionado a una superficie más rica.

**Nota sobre el tab Límites existente (confirmado en producción 2026-04-24):** el detalle de cliente ya cuenta con un tab Limits propio que cubre hoy la visualización de consumo vs. los límites configurados del cliente — Consumo total, Disponible, progress bars por límite activo agrupadas por entidad del grupo (Haz Pagos, Circuit Pay), badges de estado "ACTIVO", origen del límite (ej: Recibo de Sueldo) y rango de validez del límite. Por lo tanto, la tab Operatoria del REQ-53 **no duplica** esa funcionalidad — la sección "Uso vs. Límites" originalmente propuesta quedó descartada del scope. La tab Operatoria se enfoca exclusivamente en las métricas operativas agregadas que hoy NO están cubiertas en ningún tab.

**Decisión de ubicación:** entre 4 opciones evaluadas (nueva tab / expandir Limits / sección en Details / expandir popover existente), se eligió **nueva tab "Operatoria"** junto a Details / Documents / Limits / CaseActivity. Razones: escala mejor (permite agregar breakdowns, filtros temporales, visualizaciones sin saturar), complementa el tab Limits (dato derivado distinto), deja espacio futuro para integrar otras vistas.

#### Scope funcional (ajustado 2026-04-24)

1. **Nueva tab "Operatoria"** en el detalle de cliente, junto a Details / Documents / Limits / CaseActivity.
2. **Header de la tab** con:
   - Selector de ventana temporal (ej: Últimos 30 días / 90 días / Año en curso / Total histórico).
   - Selector de entidad del grupo (opcional, solo si el cliente tiene múltiples dockets): Todas / Haz Pagos / Circuit Pay / Ardua Solutions Corp.
3. **Sección "Overview" — cards horizontales** con métricas de alto nivel:
   - Card: **Cantidad de Transacciones** (en la ventana seleccionada)
   - Card: **Volumen Total** (monto agregado, en ARS o USD según aplique)
   - Card: **Última Actividad** (fecha del último movimiento)
   - Card: **Matches con Blacklist** (contador — consume los eventos generados por REQ-52; puede ser opcional si REQ-52 no está desplegado aún)
4. **Sección "Por Tipo de Movimiento"** — breakdown de los 4 tipos con contraparte (DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT):
   - Cantidad + volumen por tipo.
   - Visualización simple (tabla o mini-chart horizontal).
5. **Sección "Por Entidad del Grupo"** (solo visible si el cliente tiene múltiples dockets):
   - Breakdown por Haz Pagos / Circuit Pay / Ardua Solutions Corp.
   - Cantidad + volumen.
6. **Footer** con CTA **"Ver movimientos completos en OPS"** que redirige a `/psp/home?client_id=X` (no se replica la tabla de movimientos en LEX).
7. **Loading states** apropiados para cada sección.

#### Fuera de scope

- **Tabla detallada de movimientos individuales** — OPS es donde se opera el detalle transaccional.
- **Información de consumo vs. límites configurados del cliente** — ya cubierta por el tab Limits existente. Esta tab complementa esa vista, no la reemplaza.
- **Exportación a XLSX/PDF** desde esta tab — candidato a v2.
- **Gráficos complejos** — v1 se queda en cards + breakdowns tabulares simples.
- **Campos específicos, umbrales y ventanas temporales definitivas** — el scope define el **framework visual**; los campos concretos los define Legal (C7 · G-10).

#### Criterios de aceptación

- El detalle de cliente muestra una quinta tab "Operatoria".
- Al hacer clic, la tab carga con la ventana temporal default (ej: últimos 30 días).
- La sección Overview muestra las cards con los valores correctos según el cliente.
- Los breakdowns por tipo y por entidad muestran datos consistentes con los de OPS.
- El CTA "Ver movimientos completos" navega correctamente a OPS filtrado por el cliente.
- Los selectores de ventana temporal y entidad recalculan los valores correctamente.
- La tab es accesible para roles `admin-lex`, `commercial-lex` y `viewer-lex`.

#### Pendientes / preguntas abiertas

- **Input de Legal requerido (C7 → G-10):**
  - ¿Qué totalizadores específicos son los más útiles?
  - ¿Qué ventanas temporales son relevantes?
  - ¿Qué breakdowns adicionales, si alguno?

#### Dependencias

- **Ninguna fuerte con otros REQs**. Puede ejecutarse en paralelo con REQ-52.
- **Dependencia ligera con REQ-52**: la card "Matches con Blacklist" del Overview requiere que el store de alertas de REQ-52 exista. Mitigable: la card es opcional.
- **Input de Legal** (C7) para afinar los campos concretos.

---

### 8.5 REQ-54 — LEX — Centro de Reportería Regulatoria y Operativa

**Objetivo:** entregar en LEX un módulo completo donde Legal pueda: (a) definir registros de reportes con metadata y configuración completas (normativa, entidad rectora, periodicidad, anticipación, política de retención), (b) disparar la generación de un reporte on-demand desde un CTA, (c) contar con un mecanismo programado (CRON) que genere automáticamente los reportes cuya fecha de emisión esté próxima o vencida, (d) recibir alertas sobre fechas de emisión próximas vía el módulo Alertas (REQ-52), (e) consultar y re-descargar el histórico de reportes generados.

**Solicitante:** Juan Gonzalez — Legal (parte de la reformulación del pedido original de "acceso a la PSP", específicamente la "información global", ampliado tras el discovery para contemplar la visión completa de Legal).
**Ticket:** https://arduasolutions.atlassian.net/browse/REQ-54
**Estado actual:** `SENT TO DEV` (2026-04-24) · _Scope ajustado 2026-04-24 PM_
**Prototipo:** [lex_reporteria_prototype.html](../../prototypes/lex/lex_reporteria_prototype.html) · _en iteración vía Agent Team para reflejar el ajuste_
**Prioridad:** Medium (P2) — puede desarrollarse después de REQ-47, REQ-52 y REQ-53.
**Prerequisito técnico:** **REQ-59 (Reportería — Infraestructura Transversal del Core)** — bloqueante.

#### Contexto

El framing original del REQ era "shell extensible para disparar reportes". Al profundizar con Legal, quedó claro que la necesidad es más ambiciosa: Legal necesita una herramienta donde pueda **consultar el catálogo de reportes** que el área emite (regulatorios, internos, operativos), **disparar la generación on-demand**, **configurar la ejecución automática vía CRON**, **editar un subset acotado de metadata** de cada reporte, **recibir alertas** sobre fechas de emisión, y **acceder al histórico** para consulta y re-descarga.

**Ajuste de scope (2026-04-24 PM):** el discovery del prototipo mostró que la capa que provee el catálogo, el endpoint de generación, el scheduler y el histórico no es de LEX — es una infraestructura transversal que cualquier módulo del core (OPS, TRD, FIN, además de LEX) va a consumir en el tiempo. Se separó esa capa a **REQ-59 (Reportería — Infraestructura Transversal del Core)**, que pasa a ser el prerequisito técnico de REQ-54. REQ-54 queda entonces como **la UI consumidora en LEX** con dos sub-tabs (Catálogo / Histórico) y sin CTA de "Nuevo Reporte": el alta de un reporte al catálogo se tramita como requerimiento formal a Producto.

La separación de ownership queda definida así:

- **REQ-59 provee** (infraestructura técnica transversal): catálogo central, endpoint de generación, scheduler de CRONs, persistencia del histórico, canal de eventos hacia el módulo de Alertas, mecanismo de vinculación reporte ↔ función de generación.
- **REQ-54 provee** (UI consumidora en LEX): vista del catálogo para Legal, CTA de generación manual, formulario de parámetros, configuración de CRON en los reportes que la admiten, edición acotada de metadata (5 campos: descripción, categoría, entidad rectora, normativa, periodicidad), vista del histórico con re-descarga, recepción de alertas del módulo Alertas (REQ-52).
- **El alta, baja o archivado de registros del catálogo** no es operación de runtime — se opera por requerimiento formal: Legal eleva el pedido a Producto, Producto releva la definición, Tecnología implementa la función de generación sobre REQ-59 y la vincula al nuevo reporte. Desplegado el cambio, el reporte aparece automáticamente en el catálogo de LEX.

#### Capacidades resumidas (ajustadas)

1. **Módulo Reportes** (ruta `/reportes`) en el sidebar de LEX, con dos sub-tabs: **Catálogo** e **Histórico**.
2. **Sub-tab Catálogo** — vista del catálogo de reportes consumido desde REQ-59, organizado por categoría (regulatorios / internos / operativos). Cada reporte se presenta como card con: nombre, descripción, categoría, entidad rectora, normativa, periodicidad, próxima fecha con color codificado según proximidad, flag de "automática activada", y CTAs por reporte: **Generar**, **Configurar CRON** (cuando aplica), **Editar metadata** (acotada). Filtros: categoría, entidad rectora, periodicidad, estado, búsqueda por nombre.
3. **Generación manual** (CTA "Generar") — abre formulario con parámetros requeridos por la función de generación, invoca el endpoint de REQ-59, ofrece descarga inmediata del archivo.
4. **Edición acotada de metadata** — 5 campos editables por reporte: descripción, categoría, entidad rectora, normativa aplicable, periodicidad. Todo lo demás (nombre, formato, función de generación, parámetros requeridos, política de retención, flag de automática, módulo consumidor) es solo lectura — si hay que cambiarlo, requerimiento formal.
5. **Configuración de CRON** — para reportes con flag "admite automática = sí", permite activar/desactivar ejecución automática, ajustar próxima fecha de emisión y anticipación para alertas. El scheduler de REQ-59 ejecuta; este módulo solo expone la configuración.
6. **Sub-tab Histórico** — listado cronológico de generaciones emitidas desde LEX (manuales y automáticas), consumiendo el histórico centralizado de REQ-59. Filtros: reporte, categoría, rango de fechas, trigger, estado. KPIs de manuales vs. automáticas del mes. Re-descarga respetando política de retención.
7. **Alertas sobre fechas de emisión** — cuatro tipos de alerta que se suman al módulo Alertas (REQ-52), emitidos por REQ-59: "reporte próximo a emitir", "reporte vencido", "reporte emitido automáticamente", "error en generación automática". Heredan state machine, asignación y comentarios del módulo Alertas.

#### Fuera de scope

- **Alta / baja / archivado de reportes desde la UI** — se tramita por requerimiento formal a Producto. El módulo no expone CTA "Nuevo Reporte".
- **Edición de campos técnicos del catálogo** (nombre, formato, función de generación, parámetros requeridos, política de retención, flag de automática) — por requerimiento formal.
- **Infraestructura backend** (catálogo central, endpoint, scheduler, histórico, canal de eventos) — vive en REQ-59.
- **Las funciones de generación concretas para cada reporte** — cada función es trabajo técnico asociado a un REQ propio del área solicitante.
- **Dashboards interactivos / BI** — otra discusión.
- **Envío automático a terceros** (email al regulador, subir a un portal) — v1 los reportes se generan y quedan disponibles para descarga; la distribución externa es responsabilidad del usuario.
- **Workflow de aprobación del reporte antes de emitir** — en v1 no hay aprobación.
- **Alertas por canales externos** (email, SMS) — viven exclusivamente in-app vía REQ-52.
- **Edición de reportes ya generados** — los archivos del histórico son inmutables.

#### Dependencias

- **REQ-59** (Reportería — Infraestructura Transversal del Core) — **prerequisito técnico**. Este REQ consume catálogo, endpoint, scheduler, histórico y canal de eventos provistos por REQ-59.
- **REQ-52** (Módulo de Alertas) — las alertas sobre fechas de emisión y generaciones automáticas son tipos de alerta que se suman al módulo Alertas.
- **Input de Legal**: inventario inicial de reportes concretos que van a vivir en el catálogo (se tramitan como REQs hijos con Producto + Tecnología para que, al desplegarse el módulo, el catálogo ya tenga contenido real).
- **Decisión técnica con Tecnología** (sobre REQ-59): mecanismo de vinculación entre registro y función de generación, arquitectura del CRON, almacenamiento de archivos generados y políticas de retención, tratamiento de errores.

---

### 8.6 Dependencias y secuencia de ejecución

| # | REQ | Prioridad | Depende de | Puede ir en paralelo con |
|---|---|---|---|---|
| 1 | **REQ-47** · Blacklist | P0 (Highest) | — | Todos |
| 2 | **REQ-52** · Módulo Alertas + Screening | P1 (High) | REQ-47 (conceptualmente) | REQ-53, REQ-59 |
| 3 | **REQ-53** · Tab Operatoria | P1 (High) | — (input de Legal para C7) | REQ-47, REQ-52, REQ-59 |
| 4 | **REQ-59** · Reportería · Infraestructura Transversal del Core | P1 (High) | — | REQ-52, REQ-53 |
| 5 | **REQ-54** · Centro de Reportería (UI LEX) | P2 (Medium) | **REQ-59 (prerequisito técnico)** + REQ-52 (alertas de fechas) + input de Legal para C6 | — |

**Orden sugerido de ejecución:**

1. **Sprint 1:** REQ-47 (Blacklist al sidebar) + arranque de REQ-59 (infraestructura transversal de Reportería). Cambio chico, visible, desbloqueante en el frente LEX. Mientras tanto, Legal arma input para C6 (reportes) y C7 (totalizadores).
2. **Sprint 2:** REQ-52 (Módulo Alertas + Screening) + REQ-53 (Operatoria) en paralelo — distintos equipos / ramas. Continuación de REQ-59.
3. **Sprint 3:** REQ-54 (UI Centro de Reportería en LEX), una vez REQ-59 desplegado (para consumir catálogo, endpoint, scheduler y histórico) y REQ-52 desplegado (para consumir las alertas de fechas), y Legal haya levantado el inventario de reportes concretos (C6).

---

### 8.7 Patrón de referencia — Centro de Notificaciones del RFQ (REQ-33)

El **REQ-33** (Prime Desk RFQ — Centro de Notificaciones, ya en `SENT TO DEV`) definió en TRD el patrón arquitectónico de un módulo de alertas. El REQ-52 **toma de ese patrón lo que aplica** y **lo diferencia donde el dominio lo exige**:

**Qué hereda REQ-52 del REQ-33:**
- Las alertas son una capacidad transversal, no acoplada a un flujo operacional.
- Página completa, no panel ni drawer.
- Badge numérico en el sidebar.
- Estado vacío definido cuando no hay alertas activas.
- Arquitectura extensible desde v1.
- **Formato visual del prototipo TRD de notificaciones** (ajuste 2026-04-24 PM) — la pestaña Nuevas de REQ-52 adopta directamente el card-list TRD-style para triaje rápido.

**Qué cambia REQ-52 respecto al REQ-33:**

| Dimensión | REQ-33 (TRD) | REQ-52 (LEX) |
|---|---|---|
| Posición en sidebar | Sección "Sistema" → "Notificaciones" | Top-level directo — **"Alertas"** (el peso en LEX justifica la jerarquía más alta) |
| Vista principal | Tabs por tipo de alerta | **Dos pestañas Nuevas + Histórico** (ajuste 2026-04-24 PM) — dentro de cada pestaña el tipo es atributo (columna + filtro), no navegación por tipo. Nuevas hereda el formato card-list del prototipo TRD; Histórico es listado tabular filtrable. |
| Ciclo de vida | Toggle binario: activa / resuelta | **State machine** con 4 estados (`new` / `in_review` / `resolved` / `dismissed`) |
| Responsable | No hay asignación | **Asignación explícita** a usuario del equipo Legal |
| Comentarios | No hay | **Comentarios libres** + obligatorio al cerrar, con timeline |
| Semántica de cierre | "Marcar como resuelta" | **"Marcar como revisada"** (+ "Descartar" para falsos positivos) |
| Dominio | Operativa de TRD (estado de lotes de liquidez) | Compliance (screening de contrapartes blacklisteadas + futuros) |
| Recurso afectado | Lote de liquidez | Cliente + movimiento (cross-app LEX + OPS) |

**Conclusión:** el REQ-33 es el **seed conceptual** (la idea de "módulo de alertas en el sidebar"), pero el REQ-52 es **sustancialmente más robusto** por la exigencia del dominio compliance (auditoría, trazabilidad, workflow multi-persona). Por eso el REQ-52 tiene discovery hijo propio (`lex-alertas-discovery.md`) y el REQ-33 no lo tuvo.

---

### 8.8 PWI-72 — Expandir LEX — Historial de intentos de onboarding AiPrise

**Objetivo:** corregir el comportamiento de la sección de onboarding en el tab Details del perfil del cliente: en lugar de mostrar un único registro (el primero persistido), mostrar todos los intentos registrados con su estado real, habilitando la acción de acceso al registro externo únicamente en el intento Aprobado.

**Ticket:** https://arduasolutions.atlassian.net/browse/PWI-72
**Estado actual:** `TO DO` (enriquecido, pendiente de mover a SENT TO DEV)
**Prioridad:** Baja
**Tipo:** Bug

Ver §3.4 (cardinalidad del modelo) y §4.7 (sección Onboarding en el tab Details) para el contexto.

---

### Iniciativas del módulo Límites (contexto · no parte de los 4 REQs de §8)

Dos REQ activos — detalle completo en `lex-limites-discovery.md` §5:

- **REQ-44** — Aclaración obligatoria al seleccionar "Otros" en origen del límite.
- **REQ-45** — Edición de límites existentes (monto y fecha de fin).

---

## 9. Hipótesis abiertas

### H-01 — La Blacklist es un módulo de compliance critical que debe elevarse del cajón "Usuarios"

**Estado 2026-04-23:** ✅ **VALIDADA** por el HoP y confirmada por Valen Vila. Se materializa en el **REQ-47 re-scopeado** (§8.2) como módulo top-level `/blacklist`.

### H-02 — El "dashboard anterior" mencionado por Juan no es un dashboard de LEX

**Estado:** Abierta. Preguntar a Juan directamente. No bloquea los 4 REQs de §8 — su valor es de aprendizaje.

**Prioridad:** Baja.

### H-03 — El puente LEX↔Haz Pagos para screening existe con data estructurada poblada

**Estado 2026-04-23:** ✅ **VALIDADA COMPLETAMENTE** — validación con Valen Vila. REQ-52 arranca con el puente técnico resuelto.

### H-04 — Hay clientes huérfanos entre PENDING_REVIEW y APPROVED

**Relación con los REQs:** el REQ-52 deja la arquitectura preparada para soportar alertas de este tipo como tipo futuro en el módulo Alertas.

**Prioridad:** baja.

### H-05 — El modelo de roles está subdocumentado y subutilizado

**Relación con los REQs:** los 4 REQs de §8 heredan el modelo de roles existente. La asignación de alertas en REQ-52 se apoya sobre este mismo modelo (ver `lex-alertas-discovery.md` §5).

**Prioridad:** baja.

### H-06 — La asimetría del modelo por entidad del grupo define el scope máximo del REQ-52 v1

**Estado 2026-04-23:** ✅ **VALIDADA** para el scope acordado. REQ-52 se limita explícitamente al esquema Haz Pagos.

---

## 10. Riesgos y consideraciones estructurales

### 10.1 Ausencia histórica de discovery a nivel aplicación

**Mitigación:** este documento es el ancla. Toda iniciativa sobre LEX arranca leyéndolo, y se actualiza en cada iteración.

### 10.2 Blacklist fuera del sidebar — módulo "fantasma"

**Estado 2026-04-24:** riesgo **en mitigación activa** — REQ-47 en `SENT TO DEV`. Se cerrará cuando el módulo esté desplegado en producción.

### 10.3 Integración LEX ↔ OPS/TRD no formalizada

El REQ-52 (en desarrollo) materializa la primera integración formal LEX ↔ OPS (flujo de eventos de alerta).

### 10.4 Modelo de onboarding dependiente de AIPrise

Sin cambios.

### 10.5 Crear Empresa manual — bypass sin trazabilidad de rationale

Sin cambios.

### 10.6 Merge de clientes — irreversibilidad y auditoría

Sin cambios.

### 10.7 Gap operativo — cliente activo que entra a blacklist

**Problema:** si un cliente ya aprobado y operando entra a la blacklist, debería dispararse un flujo de desactivación operativa. Fuera de scope de los 4 REQs de §8.

**Tratamiento propuesto:** REQ propio post-v1 cuando haya aprendizaje operativo.

### 10.8 Operación cross-app requiere coordinación de deploys

REQ-52 involucra cambios en OPS (motor de cruce) y LEX (módulo Alertas). El despliegue debe coordinarse; probablemente con feature flags.

---

## 11. Gaps abiertos — pendientes de investigación

| Gap | Por qué importa | Prioridad | Estado |
|---|---|---|---|
| **G-01** Flujo APPROVED en LEX → habilitación en CLP | Sin este mapeo, no se sabe qué significa operativamente aprobar un cliente | Media | Abierto |
| **G-02** Consumo de Worldcheck / Aiprise runtime / Elliptic desde LEX | Activos del grupo cedidos pero no consumidos | Alta | Abierto |
| **G-03** Modelo de roles y permisos documentado | Vive implícito en el código | Baja | Abierto — ver H-05 |
| **G-04** API de movimientos por tax_id en el esquema Haz Pagos | Viabilidad técnica del motor de cruce | Alta | ✅ **Cerrado 2026-04-23** — validado por Valen Vila. |
| **G-05** Mapeo de relaciones entre tablas backend | Frontend revela el modelo parcialmente | Baja | Abierto |
| **G-06** Integración con UIF / AFIP / sanciones externas | Blacklist 100% manual | Media-Alta | Abierto · candidato a REQ futuro |
| **G-07** Trazabilidad del bypass "Crear Empresa manual" | Si se audita, no hay rationale | Media | Abierto |
| **G-08** Enriquecimiento del modelo de movimiento fuera del esquema Haz Pagos | Bloquea extensión del screening a otras entidades | Media-Alta | Abierto · candidato a REQ propio post-v1 |
| **G-09** Inventario de reportes globales de la PSP que Legal necesita | Sin inventario, REQ-54 queda como módulo vacío al desplegarse | Media | Abierto · input de Legal (C6) |
| **G-10** Definición de campos/ventanas para totalizadores per-cliente | Sin definición, REQ-53 queda como framework sin contenido | Media | Abierto · input de Legal (C7) |
| **G-11** Mecanismo técnico del evento de alerta OPS → LEX | Define la implementación técnica del REQ-52 | Alta | Abierto · decisión de Santiago (ya notificado) |
| **G-12** Semántica y permanencia de las alertas cerradas | Cubierto en `lex-alertas-discovery.md` §6 | Media | ✅ **Resuelto 2026-04-24** — state machine completa define que cerradas se preservan con comentario obligatorio, consultables vía filtro. |
| **G-13** Unificación de sistema integral de alertas transversal al core | Hoy coexisten implementaciones separadas en TRD (REQ-33) y LEX (REQ-52) con las mismas primitivas (badge, card-list, extensibilidad) pero sin plataforma compartida. REQ-59 emite eventos de alerta (fechas de reportería) que LEX y TRD consumen independientemente. Unificación evitaría divergencia futura. | Media | Abierto · candidato a REQ futuro |

---

## 12. Próximos pasos

### Durante el desarrollo (in-flight)

- [ ] **Seguimiento de los 4 REQs en Tecnología** — REQ-47, REQ-52, REQ-53, REQ-54 en `SENT TO DEV`. Santiago resuelve G-11 (mecanismo técnico OPS → LEX) durante refinement.
- [ ] **Input de Legal pendiente (C6 y C7)** — para que REQ-54 y REQ-53 no lleguen a producción con el catálogo / los totalizadores vacíos.
- [ ] **Iterar los prototipos si Tecnología encuentra gaps** durante refinement — los 4 HTMLs viven en `prototypes/lex/` y son actualizables sin abrir nuevos REQs mientras no cambie el scope funcional.

### Post-v1 de los 4 REQs (evaluar cuando los REQs estén desplegados)

- [ ] Evaluar apertura de REQ para alcance C (G-08) — extender screening a Circuit Pay cripto, Ardua Solutions Corp, Astra Ventures.
- [ ] Evaluar apertura de REQ para flujo de desactivación automática al entrar a blacklist (§10.7).
- [ ] Evaluar integración con listas externas (G-06).
- [ ] Evaluar si los módulos Blacklist, Centro de Reportería y tab Operatoria acumulan suficientes iteraciones como para merecer discovery dedicado (por ahora el scope está cubierto por el REQ + prototipo).

### Input adicional pendiente

- [ ] Valen Vila mencionó que daría más detalle sobre LEX/PSP — iterar el discovery cuando llegue.
- [ ] Resolver H-02 con Juan en la próxima conversación.

### Criterio de cierre del discovery

Este documento pasa de `opened/` a `closed/` cuando se cumplan las dos condiciones:

1. **Los 4 REQs de §8 estén desplegados en producción** (REQ-47, REQ-52, REQ-53, REQ-54).
2. **No haya iniciativas activas** a nivel aplicación LEX que justifiquen mantener abierto el índice padre (los módulos con discovery hijo propio siguen su propio ciclo).

Mientras tanto, el discovery permanece en `opened/` como fuente viva de contexto y trazabilidad.

---

## 13. Changelog

| Fecha | Cambio |
|---|---|
| 2026-04-23 (AM) | Creación del discovery a nivel aplicación LEX. Modelo conceptual, arquitectura funcional, inventario de módulos, integraciones, roles, hipótesis, riesgos, gaps. |
| 2026-04-23 (PM) | Ampliación con análisis de `core-ops-frontend`. §7.3 con modelo del movimiento. §8 con reformulación del REQ-47 en tres implicancias. H-01 validada. H-03 parcialmente validada. H-06 abierta. §10.7 gap operativo. G-04 parcialmente cerrado. G-08 abierto. |
| 2026-04-23 (PM · precisión terminológica) | Aclaración: "PSP" en `core-ops-frontend` = esquema operativo de Haz Pagos específicamente. §7.3 matriz por entidad del grupo. |
| 2026-04-23 (Noche · validación con Valen Vila) | Valen Vila reescribe §7.3 con taxonomía completa de tipos de movimiento. Solo 4 tipos con contraparte externa (DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT). `counterparty_tax_number` poblado en producción, agnóstico al sponsor. Valen avala módulo de blacklist en LEX. H-03 cerrada. G-04 cerrado. Costo técnico de alcance A restaurado a Bajo. §4.3 nota CBU/CVU ≠ CUIT. §7.2 agrega Banco de Comercio. |
| 2026-04-23 (Noche · desdoblamiento) | Tercera implicancia desdoblada: §8.3.a Información global PSP → reportes; §8.3.b Información del cliente → tab Operatoria. Challenges C6 y C7. Gaps G-09 y G-10. |
| 2026-04-23 (Noche · descomposición en 4 REQs atómicos) | Cambio estructural. §8 reescrita con los 4 REQs propuestos + secuencia por sprint + patrón REQ-33 documentado. §10.8 coordinación cross-app. G-11 y G-12 abiertos. |
| 2026-04-24 (AM · decisiones finales + derivación de discovery hijo) | Decisiones del HoP para arrancar la apertura de tickets: nombres finales Blacklist y Alertas como módulos top-level del sidebar; "Alertas" sube al top-level (se descarta la sección "Sistema" intermedia del REQ-33); acción en tarjetas: "Marcar como revisada"; las alertas tienen state machine + asignación + comentarios. Se **deriva `lex-alertas-discovery.md` como discovery hijo**. §8.3 queda como resumen con link al hijo. §4.1, §5, §8.7 actualizados. G-12 marcado como resuelto. |
| 2026-04-24 (AM · apertura de tickets en Jira + ajuste de scope de REQ-53) | **Apertura completa de los 4 REQs en Jira:** REQ-47 (re-scopeado a Blacklist), REQ-52 (Módulo Alertas + Screening), REQ-53 (Tab Operatoria), REQ-54 (Centro de Reportería). Todos con Priority, Business Area, Source, Parent y links cruzados armados. Decisiones incorporadas durante la apertura: REQ-52 con listado único filtrable en lugar de tabs por tipo; REQ-54 pasa de "framework shell" a Centro de Reportería completo con CRUD de definiciones + CRON + histórico. Ajuste de scope de REQ-53: se descarta la sección "Uso vs. Límites" al confirmar que el tab Limits existente ya la cubre en producción. §4.1, §4.7, §5, §8.6, §12 actualizados. Nomenclatura REQ-NEW-A/B/C reemplazada por IDs reales REQ-52/53/54 en todo el documento. |
| 2026-04-24 (PM · cierre de ciclo de sesión) | **Los 4 REQs pasan a `SENT TO DEV`** tras validación cruzada con Juan Gonzalez (Legal notificado) y Santiago Ahmed (Tecnología notificado). **Los 4 prototipos HTML generados** en paralelo vía Agent Team de Claude Code, guardados en `prototypes/lex/`: `lex_blacklist_prototype.html`, `lex_alertas_prototype.html`, `lex_operatoria_prototype.html`, `lex_reporteria_prototype.html`. Todos clonan el core-template y respetan el Design System del core (brand LEX Teal #2DD4BF). Usuarios mock consistentes entre los 4 (Yasmani / María Silvestre / Juan Gonzalez / Camila Cattaneo / Valen Vila). CUITs blacklisteados consistentes entre Blacklist y Alertas. §5 actualizada con columna "Prototipo" (link por módulo). §8 actualizada: cada REQ muestra estado `SENT TO DEV` + link al prototipo. §10.2 pasa de "pendiente ejecución" a "mitigación activa". §12 reordenada: la sección "Post-apertura de tickets" se elimina (ejecutada); queda "Durante el desarrollo (in-flight)", "Post-v1 de los 4 REQs", "Input adicional pendiente" y nuevo "Criterio de cierre del discovery". Header del documento refleja cierre de ciclo de sesión. |
| 2026-06-05 | §3.4 — nota de cardinalidad del modelo de onboarding y referencia a PWI-72. §4.7 — descripción detallada de la sección Onboarding en el tab Details (URL de la sesión + tabla de intentos) y estado objetivo post PWI-72. §8.8 — PWI-72 agregado a iniciativas. |
| 2026-04-24 (PM · tarde — ajuste de scope + apertura de REQ-59 transversal) | **Ajuste de UX en REQ-52:** la página principal del módulo Alertas pasa a tener dos pestañas — Nuevas (formato card-list TRD-style para `status = new`, triaje rápido) + Histórico (listado tabular con state machine completa para `in_review`, `resolved`, `dismissed`). Reorden de columnas del Histórico: Fecha (primera), Tipo, Cliente, específicas del tipo, Estado (penúltima), Responsable (última). **Ajuste de scope en REQ-54:** el módulo Centro de Reportería deja de ser dueño del catálogo en runtime — alta / baja / archivado de reportes se tramita por requerimiento formal a Producto; la UI en LEX solo expone Generar (manual) + Configurar CRON + Editar 5 campos acotados de metadata (descripción, categoría, entidad rectora, normativa, periodicidad); campos técnicos son solo lectura. **Creación de REQ-59 (Reportería — Infraestructura Transversal del Core)** como prerequisito técnico de REQ-54 y futuras reporterías de OPS, TRD, FIN. REQ-59 con Priority High, bloquea REQ-54, parent REQ-3. AM-1001 (REQ-52) y AM-1003 (REQ-54) actualizadas en Jira para reflejar los ajustes. §8.1 actualizado (bullet de "listado único filtrable" reemplazado por dos pestañas). §8.6 dependencias actualizada con REQ-59 como fila nueva y prerequisito de REQ-54. §8.7 patrón REQ-33 actualizado (REQ-52 ahora hereda el formato visual card-list para Nuevas). G-13 abierto (unificación de sistema integral de alertas transversal al core). Prototipos `lex_alertas_prototype.html` y `lex_reporteria_prototype.html` en re-iteración vía Claude Code Agent Team para reflejar los ajustes (breadcrumb Módulo/Vista, header sin CTAs Cuenta/Notificaciones, Cuenta al pie del sidebar, Reportería sin CTA "Nuevo Reporte", Alertas con dos pestañas y reorden de columnas). |
