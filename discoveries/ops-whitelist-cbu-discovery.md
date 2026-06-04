---
name: OPS — Whitelist CBU/CVU: identificación de banco y etiquetas
features: [OPS]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-04
propagates_to: []
---

# OPS — Whitelist CBU/CVU: identificación de banco y etiquetas

## Objetivo

Entender cómo enriquecer la gestión de la whitelist de cuentas habilitadas para
retiros con dos capacidades nuevas:

1. **Identificación del banco o fintech** asociado a cada CBU/CVU whitelisteado,
   usando como insumos la tabla de referencia oficial provista por Operations
   (fuente: Ministerio de Economía / BCRA) y el identificador de banco que ya
   devuelve la API de Coinag al momento de validar el número.
2. **Sistema de etiquetas** que permita identificar y clasificar cada CBU/CVU
   whitelisteado, tanto en el alta como de forma diferida.

La investigación cubre el caso especial de los CVUs (fintechs: Mercado Pago,
Ualá, Naranja X, etc.) que no pueden resolverse automáticamente, y el impacto
de estas mejoras en el flujo de retiros cuando la Comanda de Retiros se
formalice en el sistema.

## Contexto

La whitelist de cuentas es el prerequisito operativo para ejecutar un
withdrawal: la cuenta de destino debe estar whitelisteada para el cliente antes
de que Operaciones ejecute el pago. La funcionalidad existe en producción y es
exclusiva de admins (ver `discoveries/ops-discovery.md` §6.3 y §9.1).

El problema documentado en **PWI-46** (Manuel Lamensa, Operations) es que la
whitelist actual solo muestra el número de CBU/CVU, sin información del banco o
fintech asociado. Cuando un cliente tiene múltiples cuentas whitelisteadas en
distintos bancos y solicita retirar a una específica, el operador trabaja "a
ciegas". Para CVUs el problema es mayor: no existe base de datos pública que
permita resolver la entidad automáticamente.

La tabla de referencia CBU→banco fue provista por Operations (Manu Lamensa)
como insumo de implementación. Cubre los 3 primeros dígitos del CBU
(identificador unívoco de la entidad financiera) y los mapea al nombre oficial
del banco.

**Estructura del CBU (22 dígitos):**
`[3 dígitos banco][4 dígitos sucursal][1 dígito verificador][13 dígitos cuenta][1 dígito verificador]`

Este gap de "proceso completo de whitelist" estaba abierto en
`discoveries/ops-discovery.md` §13 (prioridad Media). PWI-46 lo materializa
como requerimiento concreto con urgencia Alta.

## Tabla de referencia — prefijos CBU

Provista en `CBU_tabla_bancos-2.docx` vía hilo de Slack de PWI-46 (reply de
Manu Lamensa, 26/05/2026). Cubre 41 entidades financieras + CVU. Prefijos
representativos:

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

**Nota CVU:** el prefijo `000` agrupa a todas las fintechs sin subdistinción
por entidad. No es posible resolver automáticamente si un CVU corresponde a
Mercado Pago, Ualá u otra fintech. La identificación de CVUs requiere etiqueta
manual.

## Estado actual en producción (revisión del repositorio `core-ops-frontend`)

Revisión realizada el 2026-06-04 sobre el repositorio de Tecnología
(`repositories/core-ops-frontend`). Archivos de referencia:
`src/views/Clients/ClientDetail.vue` y `src/views/psp/PSPAccounts.vue`.

### Qué es la whitelist hoy

La whitelist de retiros vive en el detalle de cliente (`ClientDetail.vue`). El
botón "Whitelistar Cuenta" aparece solo si el cliente tiene al menos una
instrucción de Coinag — es decir, es una funcionalidad exclusiva del esquema
PSP (ARS / Coinag). No aplica al esquema Ops no-ARS.

Cuando el admin whitelistea una cuenta, el flujo es:

1. Ingresa el número de CBU o CVU.
2. El sistema llama a `/coinag/account/{número}` para validarlo.
3. Coinag devuelve: nombre del titular, CUIT, alias, tipo de cuenta, número
   normalizado, estado activo/inactivo, **y un identificador de banco
   (`bank_id`)**.
4. Se muestra al admin: tipo de cuenta, nombre del titular, número, alias,
   CUIT y estado.
5. Al confirmar, se envía a `/clients/{clientId}/whitelist-account` con:
   nombre del titular, CUIT, número de cuenta y moneda.

**Dato crítico:** `bank_id` ya está disponible en el paso 3 — se captura en
el código pero **no se muestra ni se guarda**. La tabla de prefijos CBU que
proveyó Manu puede ser el mapeo necesario para convertir ese `bank_id` en un
nombre legible como "Banco Galicia" o "BBVA". Está abierto confirmar si
`bank_id` de Coinag equivale al prefijo de 3 dígitos o es un identificador
diferente.

### Qué existe sobre etiquetas hoy

El sistema de etiquetas ya existe, pero para una entidad diferente. En la vista
PSP > Cuentas (`PSPAccounts.vue`), las cuentas CVU asignadas a clientes por
Coinag tienen una columna **Label** editable: campo de texto libre que el
operador puede modificar desde esa vista, guardándose via `/coinag/alias`. Hay
además un filtro por label en esa misma vista.

**Estas cuentas son distintas a las cuentas whitelisted de retiro.** Las
cuentas PSP/Coinag son las cuentas receptoras de depósitos que Ardua crea
para los clientes. Las cuentas whitelisted son las cuentas propias del cliente
en sus bancos, hacia donde Ardua envía los retiros.

La whitelist de retiros **no tiene etiquetas hoy**.

### Comanda de Retiros

No existe ninguna vista de Comanda de Retiros en el frontend actual. El flujo
de retiros hoy es externo al sistema (Slack, WhatsApp). La pregunta de si el
banco/etiqueta deben mostrarse al seleccionar la cuenta destino al procesar un
retiro es forward-looking — aplica cuando la Comanda de Retiros se construya
(ver `features/ops/ops-retiros-confirmacion-whatsapp.md` y el gap abierto en
`discoveries/ops-discovery.md` §6.3).

## Hipótesis — estado actualizado

| # | Hipótesis | Estado |
|---|---|---|
| H1 | La resolución del banco viene de `bank_id` retornado por Coinag al validar, no de parsear el prefijo en el frontend. La tabla CBU es el mapeo `bank_id → nombre legible`. | A confirmar — depende del formato de `bank_id` |
| H2 | Banco resuelto y etiqueta son datos independientes y coexistentes: una cuenta puede tener "Banco Galicia" (resuelto) + "Galicia sueldo Juan" (etiqueta manual). | Plausible — alineado con el patrón de label que ya existe en PSP Cuentas |
| H3 | La Comanda de Retiros aún no existe en el sistema; la mejora es relevante para cuando se construya. | Confirmada — no hay UI de retiros con selector de cuentas |
| H4 | Para CVUs sin banco identificable, el sistema debería advertir y requerir etiqueta manual antes de guardar. | A confirmar con Operations |
| H5 | Las etiquetas podrían tener permisos más amplios que la whitelist (admins crean cuentas; ops officers pueden etiquetar). | A confirmar con Operations |

## Preguntas abiertas para Operations (pendientes de challenge)

Las siguientes preguntas deben responderse antes de estructurar el
requerimiento. El challenge a Manu Lamensa aún no fue enviado.

1. **Alcance de banco vs etiqueta:** ¿espera ver el nombre del banco
   auto-resuelto, un alias libre que él pueda poner, o ambas cosas
   independientes?
2. **CVU:** cuando no se puede resolver el banco automáticamente, ¿la
   etiqueta manual es obligatoria o solo recomendada?
3. **Permisos:** ¿los operadores (no admins) pueden editar etiquetas sobre
   cuentas ya whitelisted?
4. **Visibilidad en retiros:** cuando exista una UI para procesar retiros,
   ¿qué información de la cuenta destino necesita ver el operador para
   elegir correctamente?
5. **Retroactividad:** ¿hay urgencia de mostrar el banco en cuentas ya
   whitelisted, o solo aplica a las altas nuevas?

## Referencias

- PWI-46: https://arduasolutions.atlassian.net/browse/PWI-46
- Hilo Slack: https://arduasolutions.slack.com/archives/C0AK2PW5BGQ/p1779824763900199
- Tabla de referencia: `CBU_tabla_bancos-2.docx` (adjunto en hilo, reply de Manu 26/05/2026)
- Gap de origen: `discoveries/ops-discovery.md` §13 — "Proceso completo de whitelist"
- Repo de referencia (read-only): `repositories/core-ops-frontend`
  - `src/views/Clients/ClientDetail.vue` — flujo de whitelisting
  - `src/views/psp/PSPAccounts.vue` — sistema de labels existente en PSP Cuentas
- Features relacionados (whitelist fuera de scope en ambos):
  - `features/ops/ops-crear-withdrawal-sin-banco.md`
  - `features/ops/ops-retiros-confirmacion-whatsapp.md`
