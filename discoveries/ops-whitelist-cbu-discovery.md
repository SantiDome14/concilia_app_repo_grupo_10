---
name: OPS — Whitelist CBU/CVU: identificación de banco y etiquetas
features: [OPS]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-09
propagates_to:
  - features/ops/ops-whitelist-cbu-cvu.md
---

# OPS — Whitelist CBU/CVU: identificación de banco y etiquetas

## Objetivo

Entender cómo enriquecer la gestión de la whitelist de cuentas habilitadas para
retiros con dos capacidades nuevas:

1. **Identificación del banco o fintech** asociado a cada CBU/CVU whitelisteado.
2. **Sistema de etiquetas** que permita identificar y clasificar cada CBU/CVU
   whitelisteado, tanto en el alta como de forma diferida.

La investigación cubre el caso especial de los CVUs (fintechs: Mercado Pago,
Ualá, Naranja X, etc.) y el impacto de estas mejoras en el flujo de retiros
(Basic Transfer en Create Movement).

## Contexto

La whitelist de cuentas es el prerequisito operativo para ejecutar un
withdrawal: la cuenta de destino debe estar whitelisteada para el cliente antes
de que Operaciones ejecute el pago. La funcionalidad existe en producción y es
exclusiva de admins (ver `discoveries/ops-discovery.md` §6.3 y §9.1).

El problema documentado en **PWI-46** (Manuel Lamensa, Operations) es que la
whitelist actual solo muestra el número de CBU/CVU, sin información del banco o
fintech asociado. Cuando un cliente tiene múltiples cuentas whitelisted en
distintos bancos y solicita retirar a una específica, el operador trabaja
"a ciegas". Para CVUs el problema es más agudo: no hay ningún indicador de la
entidad receptora.

**Hallazgo central (2026-06-05):** El dato ya llega desde Coinag. La API de
Coinag devuelve información bancaria al validar cualquier CBU o CVU. OPS
captura el campo pero no lo muestra ni lo guarda. **El gap es exclusivamente
de producto en OPS — no requiere nueva integración ni base de datos de
prefijos.**

Este hallazgo fue validado en revisión conjunta con IT: Mati Ghisalberti
(CTO), Valentin Vila (dev), Santi Ahmed (PM IT), 2026-06-05.

**Actualización de scope (2026-06-08 — reunión con Manu Lamensa):** El dolor
principal de Operations no es solo el alta del whitelist sino la selección de
cuenta destino al ejecutar un retiro. El flujo de retiros ya existe en el
sistema como **Basic Transfer** en el modal Create Movement de PSPHome. Al
seleccionar el cliente de origen, el sistema muestra sus cuentas whitelisted
como destinos posibles — pero sin banco ni etiqueta. Ese es el momento crítico
donde Manu trabaja a ciegas.

---

## User journey confirmado en QA — 2026-06-09

Ambos flujos fueron verificados visualmente en `ops-qa.arduasolutions.com`
por Santino Domeniconi el 2026-06-09. Las capturas de referencia están
disponibles en el DM de Producto en Slack (mismo hilo que el wireframe).

### Flujo A — Alta de cuenta en whitelist

**Entry point:** detalle de cliente
(`/clients/{uuid}`) → botón "Whitelistar Cuenta".

| Paso | Qué ve el operador | Estado actual / gap |
|---|---|---|
| 1 | Modal se abre: campo **Currency** (dropdown, ARS por defecto) + campo **CVU/CBU** (placeholder: "Ingrese 22 dígitos") + botón **Validar** | Sin cambios con PWI-46 |
| 2a | Error: `"No se puede habilitar una cuenta interna o inexistente"` — caja roja debajo del input | Coinag rechaza si el CBU/CVU no existe o es cuenta propia |
| 2b | Éxito: bloque verde **"CVU FOUND" / "CBU FOUND"** con: titular (negrita), número de cuenta, alias, CUIT, estado (Activa/Inactiva) | `bank_id` llega pero **no se renderiza** — gap de PWI-46 |
| 3 | Botón **Confirmar** (verde) activo | POST no incluye `bank_id` ni etiqueta — gap de PWI-46 |

**Con PWI-46:** en el paso 2b, el bloque "CVU/CBU FOUND" agrega una línea
**Banco** al final (separada por divisor sutil). Debajo del bloque aparece
el campo **Etiqueta** (opcional para CBU, requerida para CVU sin fintech
resuelta). El Confirmar queda deshabilitado si la etiqueta es requerida y
está vacía.

---

### Flujo B — Ejecución de retiro (Basic Transfer)

**Entry point:** PSPHome (`/psp/home`) → **Create Movement**.

| Paso | Qué ve el operador | Estado actual / gap |
|---|---|---|
| 1 | Modal **Create Movement**: dropdown Movement Type (Basic Transfer) | Sin cambios con PWI-46 |
| 2 | Campo **From**: búsqueda de cliente (autocomplete por nombre) | Sin cambios |
| 3 | Sección **Select Account**: cuentas CVU propias del cliente con badge COINAG + balance + alias. El operador elige desde cuál se debita. | Sin cambios — estas son cuentas internas, no whitelisted |
| 4 | Sección **Destination Account**: cuentas whitelisted del cliente. Hoy muestra solo CBU/CVU + nombre titular + CUIT. Sin banco, sin etiqueta. Panel derecho "Account Details" muestra TO con los mismos datos. | **Gap principal** — con múltiples cuentas whitelisted la selección es a ciegas |
| 5 | Campo **Amount** + botón MAX (autofill con saldo disponible) | Sin cambios |
| 6 | Clic en **Create Movement** → modal **Confirm Movement** (paso de revisión final antes de ejecutar). Muestra dos bloques: **FROM ACCOUNT** (rojo): Client, Tax Number, Account, Current Balance, New Balance. **TO ACCOUNT (EXTERNAL)** (azul): Holder, CUIT, Account, Account Type (CBU/CVU), Alias. + Transfer Amount grande. Botones Cancel / Confirm Transfer simétricos full-width. | TO ACCOUNT (EXTERNAL) no muestra banco — gap de PWI-46 |
| 7 | Clic en **Confirm Transfer** (azul) — ejecuta la transferencia | Sin cambios |

**Panel Account Details (lateral derecho):** se actualiza dinámicamente
al seleccionar cliente y cuenta. Muestra sección **FROM** (rojo) y sección
**TO** (verde). Hoy TO no incluye banco.

**Con PWI-46 — dónde y cuándo aparece cada elemento nuevo:**

| Elemento nuevo | Paso | Superficie | Posición |
|---|---|---|---|
| Badge banco/fintech | 4 | Destination Account (Create Movement) | Encima del número de cuenta |
| Etiqueta libre | 4 | Destination Account (Create Movement) | Debajo del CUIT. Es la misma ingresada al whitelistear (Alcance 3) |
| Badge banco/fintech | 4 | Panel TO (Account Details lateral) | Nueva línea debajo de Account (CBU) |
| Banco | 6 | TO ACCOUNT (EXTERNAL) (Confirm Movement) | Nueva línea al final del bloque, tras Alias, separada por divisor |

---

## Estado actual en producción (revisión del repositorio `core-ops-frontend`)

Revisión realizada el 2026-06-04, actualizada el 2026-06-08. Archivos de
referencia: `src/views/Clients/ClientDetail.vue`,
`src/views/psp/PSPHome.vue`, `src/views/psp/PSPAccounts.vue`.

### Superficie 1 — Alta del whitelist (ClientDetail.vue)

El botón "Whitelistar Cuenta" aparece en el detalle de cliente solo si el
cliente tiene al menos una instrucción de Coinag. Flujo actual:

1. El admin ingresa el número de CBU o CVU.
2. OPS llama a `/coinag/account/{número}` para validar.
3. Coinag responde con: nombre del titular, CUIT, alias, tipo de cuenta,
   número normalizado, estado activo/inactivo, `bank_id` y posiblemente
   `bank_name` (ver H6).
4. OPS muestra un bloque verde con etiqueta **"CVU FOUND" / "CBU FOUND"**,
   seguido de: nombre del titular (destacado), número de cuenta, alias, CUIT
   y estado (activo/inactivo). **El banco no se renderiza.**
5. Al confirmar, OPS hace POST a `/clients/{clientId}/whitelist-account` con:
   nombre, CUIT, número de cuenta, moneda. **El banco no se incluye.**

**Confirmación visual (2026-06-09 — QA):** la estructura del bloque
post-Validar fue verificada en `ops-qa.arduasolutions.com`. Los campos
renderizados son exactamente: etiqueta de tipo (`CVU FOUND`), nombre del
titular, número de cuenta, alias, CUIT y estado. El campo `bankId` existe
en `validatedAccountData` en memoria pero no aparece en el bloque.

Error observable: `"No se puede habilitar una cuenta interna o inexistente"`
— Coinag rechaza el CBU/CVU cuando no existe o pertenece a una cuenta
interna de Coinag.

**Decisión de diseño — línea Banco (2026-06-09):** el banco se agrega como
última línea del bloque "CVU/CBU FOUND", separada del resto con un divisor
sutil. Formato: `Banco  [badge de institución]  Nombre legible`. Para CVUs
sin fintech resuelta: `Banco  [No resuelto]  Sin información` → dispara
etiqueta requerida.

El código mapea `result.bank_id` → `bankId` pero lo descarta completamente:

```javascript
validatedAccountData.value = {
  accountType: result.account_type,
  account:     result.account,
  alias:       result.alias,
  ownerCuit:   result.cuit,
  ownerName:   result.holder,
  bankId:      result.bank_id,   // SE CAPTURA pero no se muestra ni se envía
  active:      result.active
};
```

### Superficie 2 — Selección de cuenta destino en retiros (PSPHome.vue)

El flujo de retiros existe como **Basic Transfer** en el modal Create Movement.
Al seleccionar un cliente de origen, el sistema llama a
`/clients/{clientId}/whitelisted-accounts` y muestra las cuentas habilitadas
como destinos posibles. El template actual renderiza solo:

```html
<span>{{ recipient.account_number }}</span>  <!-- número de cuenta -->
<span>{{ recipient.name }}</span>             <!-- nombre del titular -->
<span>{{ recipient.tax_number }}</span>       <!-- CUIT -->
```

No hay banco, no hay etiqueta. Este es el punto de dolor principal que
describió Manu en la reunión del 2026-06-08.

### Hallazgo crítico — bank_name en PSPHome (2026-06-08)

En `PSPHome.vue`, cuando el campo "To" recibe un CBU/CVU externo (cuenta que
no pertenece a ningún cliente de Ardua), el sistema llama al mismo endpoint de
Coinag y almacena la respuesta cruda en `externalAccountDetails`. El template
ya renderiza:

```html
<div v-if="externalAccountDetails.bank_name">
  <span>Entity</span>
  <span>{{ externalAccountDetails.bank_name }}</span>
</div>
```

Esto confirma que la respuesta de Coinag incluye un campo `bank_name` — no
solo `bank_id`. El campo que `ClientDetail.vue` captura como `bank_id` podría
ser el campo incorrecto, o ambos campos coexisten en la respuesta. **El campo
correcto a usar para mostrar el nombre del banco es `bank_name`.**

Sin embargo, este flujo específico no acepta cuentas externas reales en la
práctica operativa actual, por lo que no fue posible verificar visualmente qué
valor devuelve `bank_name` para CBUs y CVUs de fintechs.

### Qué existe sobre etiquetas hoy

El sistema de etiquetas ya existe para las cuentas de depósito (CVUs de
clientes en `PSPAccounts.vue`), editable via POST a `/coinag/alias`. La
whitelist de retiros **no tiene etiquetas hoy**.

### Vista de clientes y gestión de whitelist

No existe una vista de lista de clientes navegable (`/clients` no tiene ruta
definida en `src/router/index.js`). El acceso a un cliente requiere conocer su
ID de antemano o buscarlo desde el Create Movement. No existe tampoco una vista
de gestión de cuentas whitelisted por cliente. Ambas son necesidades
identificadas por Manu pero **fuera del scope del PWI-46** — documentadas como
trabajo futuro (ver §Fuera de scope).

### Comanda de Retiros

**Corrección de hallazgo anterior:** La Comanda de Retiros ya existe
parcialmente en el sistema como **Basic Transfer** en el modal Create Movement
de PSPHome. No es una vista dedicada pero el flujo de selección de cliente,
cuenta whitelisted y monto ya está implementado. H3 queda descartada.

---

## Hipótesis — estado actualizado

| # | Hipótesis | Estado |
|---|---|---|
| H1 | Coinag ya devuelve información bancaria al validar cualquier CBU/CVU. OPS captura el campo pero lo descarta. El gap es exclusivamente de producto. | **Confirmada** — 2026-06-05 |
| H2 | Banco resuelto y etiqueta son datos independientes y coexistentes: una cuenta puede tener "Banco Galicia" (resuelto desde Coinag) + "Galicia sueldo" (etiqueta manual libre). | **Plausible** — alineado con patrón de label en PSP Cuentas |
| H3 | La Comanda de Retiros no existe en el sistema. | **Descartada** — el flujo de retiros existe como Basic Transfer en Create Movement de PSPHome. |
| H4 | Para CVUs, Coinag podría devolver el nombre de la fintech específica, eliminando o reduciendo la necesidad de etiqueta obligatoria. | **Pendiente** — no fue posible verificar qué devuelve `bank_name` para CVUs. |
| H5 | Las etiquetas podrían tener permisos más amplios que el alta: admins crean cuentas, pero ops officers podrían etiquetar. | **A confirmar** con Manu. |
| H6 | El campo correcto a mapear desde Coinag es `bank_name` (nombre legible), no `bank_id`. ClientDetail.vue captura el campo incorrecto o incompleto. | **Confirmada (2026-06-09)** — PSPHome.vue renderiza `externalAccountDetails.bank_name` directamente desde la respuesta cruda. ClientDetail.vue captura `result.bank_id` → `bankId` en vez de `bank_name`. El campo a usar en el fix es `bank_name`. Requiere verificar el valor exacto (P1/P2) pero la existencia del campo está validada por código. |

---

## Preguntas abiertas

**P1 — Formato de `bank_name` para CBUs [bloqueante]:**
¿El campo `bank_name` que devuelve Coinag al validar un CBU llega como nombre
legible ("Banco Galicia") o como código? ¿Coexiste con `bank_id` en la
respuesta?
→ Verificar inspeccionando la respuesta cruda de `/coinag/account/{CBU}` con
Valen o Mati Sragowicz.

**P2 — Formato de `bank_name` para CVUs [bloqueante para H4]:**
Al validar un CVU de Mercado Pago o Ualá, ¿qué devuelve Coinag en `bank_name`?
¿Resuelve el nombre de la fintech o devuelve algo genérico / vacío?
→ Si resuelve, la etiqueta de CVU pasa a ser complementaria, no obligatoria.

**P3 — Permisos de etiquetado:**
¿Los operadores (no admins) deben poder editar etiquetas sobre cuentas ya
whitelisted, o el etiquetado queda restringido al rol que hizo el alta?
→ A confirmar con Manu.

**P4 — Retroactividad:**
¿Hay urgencia de mostrar banco en cuentas ya whitelisted (backfill), o la
mejora aplica solo a las altas nuevas?
→ A confirmar con Manu.

---

## Scope del PWI-46 (foco confirmado al 2026-06-08)

### Dentro del scope

1. **Alta del whitelist** — mostrar `bank_name` en el modal de confirmación al
   whitelistear un CBU/CVU, y guardarlo en el registro.
2. **Etiqueta en el alta** — campo de texto libre editable al momento de
   whitelistear y de forma diferida.
3. **Selección de cuenta destino en Basic Transfer** — mostrar banco y etiqueta
   en la lista de cuentas whitelisted al ejecutar un retiro.

### Fuera del scope — trabajo futuro

- Vista de lista de clientes navegable (decisión pendiente con Yasmani y Manu).
- Vista dedicada de gestión de cuentas whitelisted por cliente (ídem).
- Visualización de banco/etiqueta en el detalle de cliente fuera del flujo de
  retiro (fase siguiente, una vez validado el approach con Manu).

---

## Open questions — a resolver antes o durante refinement

**OQ-1 — Cuentas existentes sin banco (impacta Alcance 5):** las cuentas whitelisted antes
del lanzamiento no tendrán `bank_name` guardado. Cuando aparezcan en Destination Account,
las opciones son: (a) badge neutro "Sin información" permanente, o (b) re-fetch de Coinag
al renderizar para completar el dato. La opción (b) es más rica pero implica carga técnica
adicional. Pendiente con IT en refinement. El wireframe usa opción (a) como fallback visual.

**OQ-2 — Orden de cuentas en Destination Account:** no se especifica el orden de
presentación cuando el cliente tiene múltiples cuentas whitelisted. Opciones: por fecha
de alta (más reciente primero), alfabético por banco, por etiqueta. Pendiente con IT en refinement.

---

## Trabajo futuro — v2

* **Colores de marca por banco/fintech en los badges:** cada institución usa su color
  característico (Galicia → Naranja, Santander → rojo, Brubank → violeta, Mercado Pago → azul). El sistema infiere el color automáticamente a partir de`bank_name` / `bank_id` — sin input del operador. No requiere cambios en el modelo de datos.
  Mejora la identificación visual instantánea con múltiples cuentas.

* **Orden y filtro en Destination Account:** permitir ordenar por banco o etiqueta,
  y/o filtrar inline cuando el cliente tiene muchas cuentas whitelisted.

* **Backfill de banco para cuentas existentes:** re-validar cuentas ya whitelisted
  sin banco contra Coinag para completar el dato retroactivamente.

---

## Tabla de referencia — prefijos CBU

Provista por Operations (Manu Lamensa) como insumo original. A la luz del
hallazgo de que Coinag ya resuelve el dato vía `bank_name`, **esta tabla es
innecesaria como solución de implementación**. Se mantiene como referencia
histórica y como fallback en caso de que `bank_name` requiera mapeo para CBUs.

| Prefijo | Entidad | Tipo |
|---|---|---|
| 007 | Banco de Galicia y Buenos Aires S.A. | Banco |
| 011 | Banco de la Nación Argentina | Banco |
| 014 | Banco de la Provincia de Buenos Aires | Banco |
| 017 | BBVA Argentina S.A. | Banco |
| 072 | Banco Santander S.A. | Banco |
| 143 | Brubank | Fintech / Banco digital |
| 191 | Banco Credicoop Coop. Ltdo. | Banco |
| 285 | Banco Macro S.A. | Banco |
| 299 | Banco Comafi S.A. | Banco |
| 000 | CVU — Fintechs (Mercado Pago, Ualá, etc.) | CVU - Fintech |

---

## Wireframe — contenido completo (2026-06-09)

Wireframe generado el 2026-06-09 y **validado por Manu Lamensa (Operations)** en su totalidad.
Disponible en Slack — DM Producto (mismo hilo). Construido sobre las capturas reales de QA.

### Sección 1 — Alcances 1 · 2 · 3: Modal "Whitelistar Cuenta"

Tres columnas comparativas a partir del modal real de OPS:

| Columna | Qué muestra |
|---|---|
| Estado actual | Modal tal como existe hoy: CVU/CBU FOUND sin Banco, sin campo Etiqueta |
| CBU — banco resuelto | CVU/CBU FOUND + línea Banco al final (divisor sutil) + campo **Etiqueta (opcional)** debajo del bloque |
| CVU — fintech no resuelta | CVU/CBU FOUND + línea Banco: "No resuelto" + campo **Etiqueta (requerida)** con error + Confirmar deshabilitado |

### Sección 2 — Alcance 4: Edición diferida (detalle de cliente)

Tabla de cuentas whitelisted con columnas: Banco/Fintech · Cuenta (CBU/CVU) · Etiqueta · Acciones.
Una fila en modo edición inline muestra el input + botones guardar/cancelar.
Fila sin etiqueta muestra botón "+ Agregar".

*⚠️ Decisión pendiente con IT en refinement — ver Dependencias.*

### Sección 3 — Alcance 5: Basic Transfer (Paso 1 — Create Movement)

Dos columnas antes/después del modal Create Movement en PSP frame real:

| Columna | Destination Account | Panel TO |
|---|---|---|
| Antes | CBU + Holder + CUIT. Sin banco, sin etiqueta. | Name, CUIT, Account (CBU). Sin banco. |
| Después | Badge banco encima del CBU + Etiqueta debajo del CUIT + `← etiqueta del alta` | Name, CUIT, Account (CBU) + Banco. |

**La etiqueta mostrada en Destination Account es exactamente la ingresada por el operador
al momento del alta (campo Etiqueta de Alcance 3).** No es un badge del sistema.

### Sección 3 — Alcance 5: Basic Transfer (Paso 2 — Confirm Movement)

Dos columnas antes/después del modal Confirm Movement (estructura real confirmada en QA):

| Bloque | Campos | Antes | Después |
|---|---|---|---|
| FROM ACCOUNT (rojo) | Client, Tax Number, Account, Current Balance, New Balance | Sin cambio | Sin cambio |
| TO ACCOUNT (EXTERNAL) (azul) | Holder, CUIT, Account, Account Type (CBU/CVU), Alias | Sin banco | + línea **Banco** al final (tras Alias, divisor sutil) |
| Transfer Amount | Monto grande en azul | Sin cambio | Sin cambio |

---

## Referencias

- PWI-46: https://arduasolutions.atlassian.net/browse/PWI-46
- Hilo Slack: https://arduasolutions.slack.com/archives/C0AK2PW5BGQ/p1779824763900199
- Tabla de referencia CBU: `CBU_tabla_bancos-2.docx` (adjunto en hilo, Manu Lamensa, 26/05/2026)
- Gap de origen: `discoveries/ops-discovery.md` §13 — "Proceso completo de whitelist"
- Reunión con Manu Lamensa: 2026-06-08 — confirmación de scope y dolor principal
- Revisión visual modal QA: 2026-06-09 — `ops-qa.arduasolutions.com/clients/{id}`
- Wireframe completo (5 alcances): DM Producto Slack, 2026-06-09 — modal Whitelistar Cuenta ×3 estados, edición diferida, Basic Transfer antes/después
- Repo de referencia (read-only): `repositories/core-ops-frontend`
  - `src/views/Clients/ClientDetail.vue` — flujo de whitelisting
  - `src/views/psp/PSPHome.vue` — Basic Transfer, lista de whitelisted y `bank_name` en cuentas externas
  - `src/views/psp/PSPAccounts.vue` — sistema de labels existente en PSP Cuentas
  - `src/router/index.js` — confirmación de ausencia de vista `/clients`
- BIND API (referencia de capacidad): https://psp.bind.com.ar/developers/apis/consultar-cbu-cvu-por-cbu-cvu-o-alias
- Revisión IT (2026-06-05): Mati Ghisalberti, Valentin Vila, Santi Ahmed
