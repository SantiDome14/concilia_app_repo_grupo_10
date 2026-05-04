---
name: Módulo de Ops — Session Context
features: [OPS]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-04-30
updated_at: 2026-04-27
---

# Módulo de Ops — Session Context

> Discovery ampliado — modelo operativo + módulo Bancos/Cuentas en producción del prototipo + alineación con Motor Contable de FIN + OPS-Inbox como primer canónico de Inbox del financial-core.

---

## 1. Definición del Producto

**Nombre:** Módulo de Ops
**Prefijo:** [OPS]

El Módulo de Ops es la **herramienta de backoffice central** de Ardua. Es la vista integral de todos los bancos, cuentas, fondos y movimientos que tienen lugar en el ecosistema producto de la operatoria diaria. Es la contracara del Client Portal: mientras el CLP es lo que el cliente ve y usa, Ops es lo que el equipo interno usa para configurar, operar y supervisar todo lo que el cliente experimenta.

**Objetivo principal:** Que Operaciones deje de usar Excel ("La Diaria") como herramienta de registro y gestión.

**Nota de nomenclatura:** Internamente, el término **"Banco"** no se refiere exclusivamente a bancos tradicionales — hace referencia a cualquier institución que habilita a Ardua la posibilidad de tener y gestionar cuentas (ej. Binance, Bitso, Coinag, Bridge, Convera, etc.).

### 1.1 Premisa fundacional

> **El objetivo esencial del core de Operaciones es que todo movimiento quede debidamente registrado, asignado e imputado.**

Esa premisa se descompone en dos garantías mínimas:

- **Registro:** todo movimiento que sucede en cualquier plataforma externa (Banco, Exchange, Custodio, AlyC, proveedor de liquidez, PSP) queda reflejado en el ledger interno del módulo.
- **Asignación e imputación:** cada movimiento queda correctamente atribuido a: cliente, estructura del grupo (Haz Pagos / Circuit Pay / Ardua Solutions Corp / Astra Ventures), banco/custodio/exchange, y — cuando aplique — cuenta contable (preparatorio para el Motor Contable de FIN).

Toda decisión de producto en OPS debe validarse contra tres preguntas (filtro mandatorio del Design Framework):

1. ¿Qué entidad del grupo soporta legalmente este flujo?
2. ¿Operaciones puede ejecutarlo en la práctica?
3. ¿Finanzas puede registrarlo correctamente?

---

## 2. Arquitectura: Dos Esquemas, Una Vista Global

El módulo opera en dos esquemas con lógicas distintas que comparten una vista global unificada.

### Vista Global

Ops ve absolutamente todo — todos los bancos, monedas y movimientos de ambos esquemas. Sin embargo, en cuanto a operación/transacción, cada esquema solo opera lo que le corresponde.

### Esquema PSP (ARS)

- **Entidad legal:** Haz Pagos
- **Moneda:** ARS únicamente
- **Integración:** Sí — Coinag vía webhooks + conciliación programática
- **Modelo de cuentas:** CBU (cuenta madre / parent de Ardua) + CVU (subcuentas por cliente / children)
- **Depósitos:** Automáticos vía CVU — el dinero llega directamente a la cuenta del cliente
- **Withdrawals:** Manuales — el cliente solicita a mesa de Ops, que ejecuta. Requiere cuenta destino whitelisteada (solo admins pueden gestionar whitelist)
- **Ledger:** Ardua lleva su propio ledger interno que se nutre de webhooks de Coinag. Conciliación = balance del ledger vs balance reportado por Coinag en cada recarga
- **Tipos de movimientos (nomenclatura Coinag):** Collector Out, Addition, Deduction
- **Nota:** PSP no ve ni opera nada que no sea ARS

### Esquema Ops (no-ARS)

- **Entidad legal:** TBD — pendiente confirmar (gap Alta, también flaggeado en REQ-42)
- **Monedas:** BTC, EURC, USDC, USDT
- **Integración:** No — todo se carga manualmente
- **Modelo de cuentas:** Predominantemente Cuentas Pool — ver §3
- **Depósitos:** Manuales — se registran primero en "La Diaria" y luego en el módulo
- **Withdrawals:** Manuales — gestionados por mesa de Ops
- **Flujo actual:** Operan en la plataforma (Binance, Bitso, etc.) → registran en La Diaria → cargan en el módulo
- **Nota:** Este esquema no opera ni ve nada que sea ARS (eso es exclusivo de PSP)

---

## 3. Cuentas Pool vs Subcuentas

La naturaleza de la cuenta en la plataforma externa determina el costo operativo de asignar un movimiento a un cliente. Hay dos modelos, y la elección de uno u otro no es siempre técnica — también es fiscal y legal.

### 3.1 Esquema Pool

- **Qué es:** una única cuenta de Ardua en la plataforma recibe fondos de múltiples clientes mezclados.
- **Identificación del cliente:** campo libre "Referencia" — opcional y sin formato estándar. En muchos casos llega vacío.
- **Consecuencia:** asignación manual costosa. El movimiento queda "pendiente de asignación" hasta que Ops lo resuelva.
- **Dónde predomina:** la mayoría del esquema no-ARS (Binance, Bitso, Bridge, Convera en ciertos flujos).

Cuando llega un movimiento a una cuenta Pool, el sistema sabe:
- ✅ Cuánto llegó
- ✅ Cuándo llegó
- ✅ A qué cuenta Pool de Ardua llegó
- ❌ De qué cliente es

Hasta que Ops no resuelve ese ❌ manualmente, el movimiento queda como **"pendiente de asignación a cliente"** y el cliente no ve nada en el CLP.

Esta es la forma concreta en que se materializa el problema del Excel ("La Diaria").

### 3.2 Esquema Subcuentas

- **Qué es:** cada cliente tiene una cuenta específica dentro de la plataforma (dirección/CBU/CVU/wallet propio).
- **Identificación del cliente:** trivial — la cuenta destino define el cliente.
- **Dónde aplica:** PSP de Coinag (CBU/CVU de Haz Pagos) y algunos flujos crypto donde la plataforma ofrece "PSP-as-a-Service" (wallets dedicadas por cliente).

### 3.3 Decisión operativa — Pool o Subcuentas

Aunque una plataforma ofrezca Subcuentas, **Ardua puede decidir no habilitarlas** por razones:
- **Operativas:** gestión de muchas subcuentas complejiza la conciliación global en la plataforma.
- **Fiscales/legales:** mantener un esquema Pool puede ser preferible para ciertos tratamientos.

Los criterios de esta decisión **no están documentados formalmente** y deberían estarlo (gap Media, §13).

---

## 4. Vocabulario del Dominio

| Término | Definición |
|---|---|
| **Banco** | Cualquier institución que habilita cuentas — no solo bancos tradicionales (incluye Binance, Bitso, Coinag, Bridge, Convera, etc.) |
| **Estructura** | Sinónimo de "Banco" en el módulo Bancos/Cuentas |
| **Cuenta Pool** | Cuenta de Ardua en una plataforma donde llegan fondos de múltiples clientes mezclados |
| **Subcuenta** | Cuenta específica de un cliente dentro de una plataforma de Ardua |
| **Bandeja** | Cola de trabajo para gestionar la *asignación de fondos* — dinero que ya existe en el sistema y necesita ser ubicado correctamente. Foco: asignación |
| **Comanda** | Cola de trabajo para gestionar *solicitudes que requieren aprobación* — alguien pidió algo y Ops decide qué hacer. Foco: aprobación |
| **Vostro** | Movimiento entre un cliente y Ardua (depósito, withdrawal, etc.) |
| **Nostro** | Movimiento entre cuentas propias de Ardua, incluso entre distintas plataformas |
| **La Diaria** | Plantilla Excel donde Ops registra manualmente todos los movimientos no-ARS antes de cargarlos en el módulo |
| **Pendiente de asignación** | Movimiento llegado a una cuenta Pool sin cliente identificado — requiere asignación manual por Ops |
| **Whitelist** | Lista de cuentas de destino habilitadas para un cliente — prerequisito para ejecutar un withdrawal |
| **Ledger interno** | Registro propio de Ardua de todos los movimientos — fuente de conciliación contra plataformas externas |

---

## 5. Taxonomía de Movimientos

### 5.1 Macro-categorías

Todo movimiento en Ops cae en una de tres macro-categorías:

- **Entrada** — fondos entran al ecosistema de Ardua
- **Salida** — fondos salen del ecosistema de Ardua
- **Internos** — fondos se mueven dentro del ecosistema (entre clientes, entre monedas, entre cuentas propias)

### 5.2 Tipos específicos — Esquema Ops (no-ARS)

| Tipo | Macro | Sale del ecosistema | Descripción | Nomenclatura externa típica |
|---|---|---|---|---|
| **Depósito** | Entrada | No | De afuera hacia Ardua | Deposit |
| **Withdrawal** | Salida | Sí | De Ardua hacia afuera | Withdrawal |
| **Transferencia** | Interno | No | Cliente A → Cliente B, misma moneda | Transfer In / Transfer Out |
| **SWAP** | Interno | No | Mismo cliente, moneda X → moneda Y | Swap In / Swap Out (par) |
| **Fee** | Interno | No | Cliente → Bolsa Ardua. Recargo aplicado. Tratamiento contable pendiente | Fee / ND (Nota de Débito) |
| **Rebate** | Interno | No | Bolsa Ardua → Cliente. Crédito al cliente | Rebate / NC (Nota de Crédito) |
| **Nostro** | Interno | Depende | Entre cuentas propias de Ardua (entre plataformas o intercompany) | Transfer/Withdrawal en origen + Deposit en destino. ⚠️ Hoy no se registran como Nostro unificado |

### 5.3 Tipos específicos — Esquema PSP (ARS)

| Tipo interno | Nomenclatura Coinag | Descripción |
|---|---|---|
| **Interno** | Addition / Deduction | Entre CVUs dentro del ecosistema Coinag |
| **Transferencia** | Collector Out | De un CVU hacia afuera del ecosistema |

### 5.4 Nota sobre la heterogeneidad de nomenclaturas

Cada plataforma externa usa su propia nomenclatura. **Todas terminan impactando el módulo Movimientos de OPS** — la capa de integración (hoy manual, futura API/webhooks) es responsable de mapear la nomenclatura externa a la taxonomía interna.

El mapeo completo por plataforma es un entregable pendiente (gap Media, §13).

---

## 6. El Sistema de Bandejas y Comandas

### 6.1 La distinción fundamental

**Bandejas** y **Comandas** son los dos patrones operativos que estructuran el trabajo de Ops. Son distintos en naturaleza y propósito:

| | Comanda | Bandeja |
|---|---|---|
| **¿Qué llega?** | Una solicitud de acción | Un movimiento de fondos |
| **¿Quién lo origina?** | Un actor que pide algo | Un evento financiero que ocurrió |
| **¿Qué hace Ops?** | Evalúa, aprueba o rechaza | Identifica, asigna, concilia |
| **¿El dinero ya movió?** | No — pendiente de aprobación | Sí — ya llegó, falta saber de quién es |
| **Foco** | Aprobación | Asignación |

### 6.2 Bandejas — gestión de fondos en tránsito

| Bandeja | Estado de entrada | Acción de Ops | Estado de salida |
|---|---|---|---|
| **Bandeja de Depósitos** | Fondos llegaron a pool, sin procesar | Verificar y encolar | Pendiente de asignación |
| **Bandeja de Pendientes** | Verificado, sin cliente asignado | Identificar y asignar cliente | → Bandeja de Clientes |
| **Bandeja de Clientes** | Conciliado y asignado al cliente | Ninguna — solo visibilidad | Estado final / reflejo en CLP |

### 6.3 Comandas — gestión de solicitudes pendientes de decisión

| Comanda | Estado de entrada | Acción de Ops | Estado de salida |
|---|---|---|---|
| **Comanda de Retiros** | Solicitud recibida, sin ejecutar | Validar whitelist → aprobar/rechazar → ejecutar | → Bandeja de Clientes |

---

## 7. Flujo de Ciclo de Vida de un Movimiento

### 7.1 Entrada (depósito no-ARS)

```
Fondos llegan a cuenta Pool
        ↓
[Bandeja de Depósitos]  —  sin procesar
        ↓  Ops verifica
[Bandeja de Pendientes]  —  sin cliente asignado
        ↓  Ops identifica y asigna cliente
[Bandeja de Clientes]  —  conciliado
        ↓
Reflejo en CLP
```

### 7.2 Salida (withdrawal)

```
Solicitud de retiro (CLP o mesa Ops)
        ↓
[Comanda de Retiros]  —  pendiente de aprobación
        ↓  Ops valida whitelist
        ↓  Ops aprueba y ejecuta vía plataforma
[Bandeja de Clientes]  —  withdrawal confirmado
        ↓
Reflejo en CLP
```

---

## 8. Estándar de Interfaz — Alineación con el Core

Todas las aplicaciones del core (OPS, TRD, FIN, CLP, COM, LEX) siguen una arquitectura base común. La definición detallada de este estándar es **transversal** y candidata a formalizarse en `framework/` como un documento de design system (pendiente — ver §13).

**Template base del core:** `../prototypes/_core-template/` — punto de partida para todos los prototipos del core.

### 8.1 Layout base

- **Header:** información de contexto (módulo activo, account, selector de idioma, theme, estado de proveedor). Pendiente de definición más práctica/sofisticada.
- **SideBar:** Bloques (agrupadores funcionales) → Módulos (ítems con icono + nombre). Expansible/contraible. Al pie, acceso a Account (Settings, Log out).
- **Main:** contenido del módulo activo. Largo y ancho fijos — la navegación interna se gestiona con scrolls de los componentes internos.

### 8.2 Estructura del Main en módulos con listado

| Línea | Contenido |
|---|---|
| **L1** | Nombre del módulo + descripción + CTAs principales (máx. 3) |
| **L2** | Cards contadoras/totalizadoras (KPIs) |
| **L3** | Tabla con (a) encabezado: buscador + filtros, (b) campos + columna de Acciones, (c) paginación |

Las **Acciones** sobre cada registro pueden trackearse como comportamientos de usuario y habilitar capabilities específicas (ej. en Movimientos: Asignar Banco y Cuenta, Crear Nota de Débito, Crear Nota de Crédito). En algunos casos el registro se freezea y solo permite acciones definidas.

### 8.3 Módulo Home

Toda aplicación del core tiene un módulo Home destinado al Dashboard — cards de métricas e indicadores, accesos rápidos y funcionalidades propias de un dashboard. En OPS actualmente es placeholder.

---

## 9. Estado Actual del Módulo

### 9.1 Frontend de producción

Repositorio: `/Users/yasmani/Projects/devs/core-ops-frontend`
Stack: Vue 3 + Vite + Auth0 + Tailwind

| Funcionalidad | Estado |
|---|---|
| Dashboard / Actividad (tabla de movimientos) | ⚠️ Existe — ingesta manual, sin conciliación automática |
| Importar SWIFT | ⚠️ Existe — proceso manual, frágil |
| Crear movimiento manual | ⚠️ Existe — sin auditoría |
| Clientes (listado) | ⚠️ Existe — parcial |
| Alta de clientes en app | ⚠️ Existe — sin integración KYC |
| Detalle de cliente + cuentas | ⚠️ Existe — parcial |
| Rutas de depósito (Routes) | ⚠️ Existe — flujo de aprobación presente |
| Route Templates | ✅ Existe — CRUD completo |
| PSP / Coinag — conciliación automática | ✅ El más maduro del módulo |
| Whitelist de cuentas | ⚠️ Existe — solo para admins |
| Bandejas (Depósitos / Pendientes / Clientes) | ❌ No existen como tal |
| Comanda de Retiros | ❌ No existe formalmente |
| Nostro | ❌ No se registra en absoluto |
| Bolsa de fees (estructura contable) | ❌ No existe |
| Auditoría de acciones | ❌ No existe |
| Cierre diario / snapshot de posición | ❌ No existe |
| Catálogo maestro de Bancos/Cuentas | ❌ Hoy hardcodeado — diseñado en prototipo |

### 9.2 Prototipo vigente

**Archivo:** `../prototypes/ops/ops-acciones-prototype.html`
Sirve como fuente de verdad visual/funcional para las iteraciones pendientes del frontend.

**Sidebar:**
- Home (placeholder)
- **Bloque Operaciones:** Movimientos, Quotes
- **Bloque Gestión:** Clientes (placeholder), Bancos/Cuentas, PSP (placeholder)

**Módulos funcionales en el prototipo:**

| Módulo | KPIs | Filtros | Paginación |
|---|---|---|---|
| Movimientos | Total / Entradas / Salidas / Internos / Sin asignar | Período, Tipo, Rail, Partner, Estructura/Cuenta | ✅ |
| Quotes | Total / Activos / Pending / Accepted / Completed (clickeables) | Período, Estado (multi), Operación, Plazo | ✅ |
| Bancos/Cuentas | Estructuras / Cuentas totales / Config. contable / Sin configurar | Sociedad, Tipo, Tipo de cuenta, Moneda, Config. contable | ✅ |

---

## 10. Módulo Bancos/Cuentas — Catálogo Maestro (nuevo, abril 2026)

### 10.1 Propósito

Centralizar el maestro de **Estructuras** (bancos, exchanges, custodios, AlyCs, proveedores) y **Cuentas** que se utilizan en los movimientos. Reemplaza los datos hardcodeados del módulo Movimientos.

### 10.2 Capa contable — preparatoria

Cada cuenta puede llevar configurada una **cuenta contable** asociada. Esta capa es **preparatoria**, no ejecutiva:

- Por ahora guarda el mapeo `cuenta bancaria → cuenta contable` a modo de catálogo.
- **Cuando FIN defina el plan de cuentas operativo del grupo**, este mapeo se validará contra ese plan y quedará vinculado al asiento tipo del **Motor Contable** (ver `fin-session-context.md`).
- Hasta entonces no hay generación de asientos desde OPS — solo persistencia del mapeo.

### 10.3 Modelo de datos (primer nivel)

- **Estructura:** Sociedad (Haz Pagos / Circuit Pay / Ardua Solutions Corp / Astra Ventures) + Banco/plataforma + Tipo de estructura.
- **Cuenta:** pertenece a una Estructura. Atributos: Tipo de cuenta, Moneda, Nro./Address, Cuenta padre (solo aplica a Subcuentas PSP sobre CBU), Estado, Cuenta contable.

El **catálogo completo de tipos de cuenta** está pendiente de validación con Operaciones y Finanzas (§13).

---

## 11. Roles del Sistema

| Rol | Acceso |
|---|---|
| `admin-ops` | Acceso total — incluyendo whitelist |
| `viewer-ops` | Solo lectura |
| `admin-psp` | Gestión PSP |
| `viewer-psp` | Solo lectura PSP |

---

## 12. Relación con otros módulos del core

| Módulo | Relación |
|---|---|
| **CLP (Client Portal)** | OPS es backstage; CLP es frontstage. Los movimientos Vostro asignados a un cliente se reflejan en su vista CLP |
| **FIN (Finanzas)** | FIN recibe los movimientos que OPS no puede asignar a cliente (Nostro financiero no operativo). Motor Contable de FIN consume mapeos de Bancos/Cuentas de OPS para generar asientos. Ver `fin-session-context.md` |
| **TRD (Mesa de Trading)** | TRD origina quotes (instrucciones de swap/cambio); OPS ejecuta el movimiento de fondos resultante. TRD no mueve fondos directamente |
| **CLP Earn / FCI** | Cualquier movimiento originado por suscripción a FCI aterriza en OPS |
| **COM (Comercial)** | Sin vínculo operativo directo con OPS (V1) |

---

## 13. Gaps Abiertos — Pendientes de Investigación

| Gap | Por qué importa | Prioridad | Estado |
|---|---|---|---|
| Entidad legal del esquema Ops no-ARS | Define regulación y contabilidad por movimiento | Alta | Abierto — también flaggeado en REQ-42 |
| Estructura real de La Diaria (Excel) | Define los campos reales que necesita el módulo | Alta | Abierto |
| Tipos y frecuencia de movimientos Nostro | Define urgencia de resolver ese gap | Alta | Abierto |
| Tratamiento contable del SWAP (spread FX) | ¿Va a la bolsa de fees o tiene cuenta propia? | Alta | Abierto |
| Tratamiento contable de la bolsa de fees | Deuda contable activa — Ardua no sabe cuánto ganó en fees | Alta | Abierto |
| Catálogo completo de tipos de cuenta | Necesario para cerrar el modelo de datos de Bancos/Cuentas | Alta | Abierto — a validar con Ops + FIN |
| Mapeo completo de nomenclaturas externas por plataforma | Base para la capa de integración | Media | Abierto |
| Criterios de decisión Pool vs Subcuentas | Hoy es informal; conviene documentar las razones | Media | Abierto |
| Proceso completo de whitelist | Define el flujo completo de la Comanda de Retiros | Media | Abierto |
| ¿Existen Comandas para otros tipos además de retiros? | Define si el patrón se extiende a otros flujos | Media | Abierto |
| APIs disponibles en Bridge y Convera | Define si la ingesta puede automatizarse o sigue siendo manual | Media | Abierto |
| Formalización del estándar de UI del core en `framework/` | Hoy el estándar vive implícito en prototipos; conviene un doc de design system | Media | Abierto |

---

## 14. Próximos Pasos

- [ ] Conseguir La Diaria (Excel actual) para mapear estructura real de datos
- [ ] Confirmar entidad legal del esquema Ops no-ARS (coordinado con Legal / Finance)
- [ ] Mapear tipos y frecuencia de movimientos Nostro
- [ ] Definir tratamiento contable de SWAP y bolsa de fees (coordinado con FIN)
- [ ] Completar el catálogo de tipos de cuenta con Ops + FIN
- [ ] Reunión con Operaciones para validar el modelo de Bandejas y Comandas
- [ ] Arrancar definición formal del modelo de datos del módulo (Bancos/Cuentas como primer entregable)
- [ ] Evaluar formalización del estándar de UI del core en un doc de `framework/`
- [ ] **Ejecutar `prototypes/ops/ops-inbox-PROMPT.md` v1 en Claude Code** y validar el output funcional
- [ ] **Sesión de elicitación con OPS officers** sobre el prototipo OPS-Inbox — especialmente para validar el flujo de Solicitudes desde CLP (withdrawals, swaps, RFQs)
- [ ] **Generar `ops-inbox-discovery.md`** con el feedback de la elicitación y promover OPS-Inbox a canónico oficial del financial-core (§16)
- [ ] **Tramitar REQ Inbox transversal** en Jira (ver framework v1.2 §13) usando OPS-Inbox como caso de implementación base

---

## 15. Changelog

| Fecha | Cambio |
|---|---|
| 2026-03-16 | Versión inicial — modelo conceptual completo, dos esquemas, Bandejas/Comandas, taxonomía base |
| 2026-04-21 | Integración del documento de Drive "Discovery del Módulo de Operaciones": premisa fundacional formalizada, sección Cuentas Pool vs Subcuentas, taxonomía ampliada con nomenclaturas externas (Coinag / exchanges), estándar de UI del core, módulo Bancos/Cuentas documentado (creado en abril), relación con otros módulos, gaps actualizados. Archivo duplicado `OPS_Session_Context.md` eliminado en la misma fecha |
| **2026-04-27** | **Nueva §16 OPS-Inbox como primer canónico de Inbox del financial-core. Prompt completo en disco (`prototypes/ops/ops-inbox-PROMPT.md` v1) con vista Kanban + Lista, drag & drop híbrido, drawer + timeline, modal de cierre con radio buttons por tipo, dataset de 13 Solicitudes en 8 tipos cubriendo el dominio OPS — especialmente solicitudes desde CLP (withdrawals, swaps, RFQs) ante la próxima habilitación del flujo en el Client Portal. Pendiente ejecutar el prompt y validar con OPS officers; cuando esté maduro, se promueve a canónico oficial. Próximos pasos actualizados (§14) con: ejecución del prompt, sesión de elicitación, generación de `ops-inbox-discovery.md`, tramitación del REQ Inbox transversal en Jira.** |

---

## 16. OPS-Inbox — primer canónico de Inbox del financial-core

### 16.1 Contexto

Inbox es uno de los 4 módulos genéricos del financial-core (ver `framework/financial-core-modules.md` §9). Hasta el 27/04/2026 no existía prototipo canónico ejecutado de este módulo — solo placeholder en el template clonable. **OPS será la primera app del core en implementarlo,** motivado por la próxima habilitación de un flujo en el Client Portal que permitirá a clientes finales tramitar withdrawals, swaps y RFQs como Solicitudes que llegan al Inbox de OPS.

Cuando OPS-Inbox se ejecute, valide y se considere maduro, **se promueve a canónico oficial del financial-core**: el placeholder del template clonable se reemplaza por un skeleton funcional derivado de OPS-Inbox, y los demás prototipos de apps del core se alinean (cumpliendo §9.4 del framework).

### 16.2 Artefacto en disco

| Artefacto | Path | Estado |
|---|---|---|
| Prompt del prototipo | `../prototypes/ops/ops-inbox-PROMPT.md` | v1 · 27/04/2026 · listo para ejecutar |
| Prototipo HTML | `../prototypes/ops/ops-inbox-prototype.html` | Pendiente — se genera al ejecutar el prompt |

### 16.3 Decisiones cerradas en el prompt v1

- **Nomenclatura:** lo que se gestiona en el módulo se llama **Solicitudes** (alineación con framework §9.0). Aplica a copy de UI, modelo de datos y conversaciones con stakeholders.
- **Estados canónicos de Inbox:** `pending` (To Do) / `in_progress` (In Progress) / `completed` (Done). `completed` es terminal (no se reabre).
- **Vistas:** toggle Tablero (Kanban, default) ↔ Lista, persistente en sesión.
- **Drag & drop híbrido entre columnas Kanban:** libre `pending → in_progress` con auto-asignación al usuario actual; modal de confirmación para `* → completed` con radio buttons de acción por tipo + comentario obligatorio ≥ 10 chars; libre `in_progress → pending` con desasignación; bloqueado `completed → *`.
- **Acciones inline en cards** que coexisten con el drag (CTAs son la forma rápida de la misma transición).
- **Drawer lateral con timeline** + sistema de asignación (Tomar / Asignar a... / Reasignar / Devolver a To Do).
- **Indicador SLA visual** en cards y filas (sin indicador / ámbar / rojo según proximidad).
- **Color brand:** `#EF4444` (rojo — paleta OPS del framework v1.1).
- **Sidebar minimalista** con los 4 genéricos del core al tope (Dashboard / Inbox / Alertas / Reportes), sin agruparlos bajo `<div class="sb-section">` (alineación con framework v1.2 §6).

### 16.4 Tipos de Solicitudes para OPS — dataset del prototipo

Distribución: 5 `pending` + 5 `in_progress` + 3 `completed` = 13 Solicitudes total.

| Código | Label | Color badge | Origen típico |
|---|---|---|---|
| `WITHDRAWAL_REQUEST` | Solicitud de withdrawal | rojo (`pbr`) | CLP |
| `SWAP_REQUEST` | Solicitud de swap | azul (`pa`) | CLP |
| `RFQ_REQUEST` | Solicitud de cotización (RFQ) | púrpura (`pa`) | CLP |
| `DEPOSIT_MATCHING` | Depósito a identificar | verde (`pbi`) | SYSTEM (webhook Coinag) |
| `IMPUTATION_REQUEST` | Pedido de imputación retroactiva | ámbar (`pc`) | FIN |
| `KYC_HOLD` | Cuenta retenida por KYC | rojo (`pbr`) | LEX |
| `REPORT_DEPENDENCY` | Dependencia de reporte centralizado | gris (`pbg`) | SYSTEM (auto, desde FIN.Reportes) |
| `MANUAL_TASK` | Tarea manual ad-hoc | gris (`pbg`) | Variable |

La cobertura del dataset incluye 3 tipos de origen distintos (otra app del core, otra app del mismo OPS, sistema), Solicitudes con acción inline y otras que requieren saltar a otro módulo, y un caso del loop completo Reportes→Alertas→Inbox (`REPORT_DEPENDENCY`).

### 16.5 Conexión con el flujo CLP → OPS-Inbox que se viene

El caso central de uso del prototipo OPS-Inbox es la **habilitación próxima de funcionalidad en CLP** que permitirá a clientes finales tramitar withdrawals, swaps y RFQs como Solicitudes desde el Client Portal. Esas Solicitudes:

1. Se crean en CLP por acción del cliente.
2. Se transmiten a la app de OPS vía evento (canal a definir en discovery).
3. Llegan al **Inbox de OPS** como Solicitudes de tipo `WITHDRAWAL_REQUEST`, `SWAP_REQUEST` o `RFQ_REQUEST`.
4. Un OPS officer las toma, valida (whitelist en el caso de withdrawals), aprueba/rechaza y ejecuta.
5. El cliente final ve el resultado en CLP.

El prototipo OPS-Inbox materializa este flujo end-to-end como herramienta de elicitación con OPS officers — antes de tramitar el REQ Inbox transversal en Jira y la implementación en producción.

### 16.6 Próximos pasos sobre OPS-Inbox

1. **Ejecutar el prompt v1 en Claude Code** y obtener el HTML.
2. **Auditar el output** contra el framework v1.2 §9 y los criterios de aceptación del prompt.
3. **Sesión de elicitación con OPS officers** — herramienta de validación del modelo conceptual antes de tramitar REQ formal.
4. **Generar `ops-inbox-discovery.md`** con el feedback recolectado (modelo de datos refinado, tipos de Solicitudes ajustados, capacidades a activar/desactivar).
5. **Tramitar REQ Inbox transversal en Jira** (ver framework §13). OPS-Inbox queda como caso de implementación base de la infra transversal.
6. **Promover OPS-Inbox a canónico oficial** del financial-core: actualizar el placeholder del template clonable (`prototypes/_core-template/_core-template.html`) reemplazándolo por un skeleton funcional derivado de OPS-Inbox, replicar capacidades en los demás prototipos de apps.
