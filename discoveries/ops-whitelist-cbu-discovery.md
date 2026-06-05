---
name: OPS — Whitelist CBU/CVU: identificación de banco y etiquetas
features: [OPS]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-05
propagates_to: []
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
cuando la Comanda de Retiros se formalice en el sistema.

## Contexto

La whitelist de cuentas es el prerequisito operativo para ejecutar un
withdrawal: la cuenta de destino debe estar whitelisteada para el cliente antes
de que Operaciones ejecute el pago. La funcionalidad existe en producción y es
exclusiva de admins (ver `discoveries/ops-discovery.md` §6.3 y §9.1).

El problema documentado en **PWI-46** (Manuel Lamensa, Operations) es que la
whitelist actual solo muestra el número de CBU/CVU, sin información del banco o
fintech asociado. Cuando un cliente tiene múltiples cuentas whitelisted en
distintos bancos y solicita retirar a una específica, el operador trabaja "a
ciegas". Para CVUs el problema es más agudo: no hay ningún indicador de la
entidad receptora.

**Hallazgo central (2026-06-05):** El dato ya llega desde Coinag. La API de
Coinag devuelve `bank_id` al validar cualquier CBU o CVU. OPS captura el campo
pero no lo muestra ni lo guarda. **El gap es exclusivamente de producto en OPS
— no requiere nueva integración ni base de datos de prefijos.**

Este hallazgo fue validado en revisión conjunta con IT: Mati Ghisalberti
(CTO), Valentin Vila (dev), Santi Ahmed (PM IT), 2026-06-05.

## Estado actual en producción (revisión del repositorio `core-ops-frontend`)

Revisión realizada el 2026-06-04 y actualizada el 2026-06-05. Archivos de
referencia: `src/views/Clients/ClientDetail.vue` y
`src/views/psp/PSPAccounts.vue`.

### Qué es la whitelist hoy

La whitelist de retiros vive en el detalle de cliente (`ClientDetail.vue`). El
botón "Whitelistar Cuenta" aparece solo si el cliente tiene al menos una
instrucción de Coinag — funcionalidad exclusiva del esquema PSP (ARS / Coinag).

Flujo actual al whitelistear una cuenta:

1. El admin ingresa el número de CBU o CVU.
2. OPS llama a `/coinag/account/{número}` para validar.
3. Coinag responde con: nombre del titular, CUIT, alias, tipo de cuenta,
   número normalizado, estado activo/inactivo, y **`bank_id`**.
4. OPS muestra: tipo de cuenta, nombre del titular, número, alias, CUIT,
   estado. **`bank_id` no se renderiza.**
5. Al confirmar, OPS hace POST a `/clients/{clientId}/whitelist-account` con:
   nombre, CUIT, número de cuenta, moneda. **`bank_id` no se incluye.**

### El dato ya existe: `bank_id` capturado y descartado

En `ClientDetail.vue`, el código mapea explícitamente:

```javascript
validatedAccountData.value = {
  accountType: result.account_type,
  account:     result.account,
  alias:       result.alias,
  ownerCuit:   result.cuit,
  ownerName:   result.holder,
  bankId:      result.bank_id,   // ← SE CAPTURA
  active:      result.active
};
```

Y el POST que guarda la whitelist descarta `bankId`:

```javascript
await post(`/clients/${clientId}/whitelist-account`, {
  name:           validatedAccountData.value.ownerName,
  tax_number:     validatedAccountData.value.ownerCuit,
  account_number: validatedAccountData.value.account,
  currency_id:    selectedCurrency?.id,
  // bankId:       ← NO SE ENVÍA
});
```

El campo tampoco aparece en el template del modal de confirmación. El gap es de
producto: OPS recibe el dato, lo ignora, y lo pierde.

### Qué existe sobre etiquetas hoy

El sistema de etiquetas ya existe, pero para una entidad diferente. En la vista
PSP > Cuentas (`PSPAccounts.vue`), las cuentas CVU asignadas a clientes tienen
una columna **Label** editable via POST a `/coinag/alias`. Estas son cuentas
receptoras de **depósitos** — distintas a las cuentas whitelisted de **retiro**.

La whitelist de retiros **no tiene etiquetas hoy**.

### BIND como referencia de capacidad

BIND (Banco Industrial S.A.) es el segundo proveedor bancario activo en OPS,
confirmado por el filtro `provider_name: BIND` en `PSPAccounts.vue`. BIND
expone un endpoint público documentado que resuelve cuentas externas de
cualquier banco o fintech:

`GET /walletentidad-cuenta/v1/api/v1.201/CuentaCVUByCbuCvuOrAlias`

Su response incluye `bancoNombre` (banco sponsor) y `entidad` (entidad dueña
del CBU/CVU). Para CVUs, `entidad` potencialmente devuelve el nombre de la
fintech (Mercado Pago, Ualá, etc.).

Sin embargo, **la integración activa para el flujo de whitelist es Coinag, no
BIND**. El endpoint de BIND sirve como referencia para entender el techo de
lo que es posible resolver vía API, y como punto de comparación para evaluar
el formato de `bank_id` que devuelve Coinag.

Refs: https://psp.bind.com.ar/developers/apis/consultar-cbu-cvu-por-cbu-cvu-o-alias

### Comanda de Retiros

No existe ninguna vista de Comanda de Retiros en el frontend actual. El flujo
de retiros hoy es externo al sistema (Slack, WhatsApp). La visualización de
banco/etiqueta al seleccionar la cuenta destino al procesar un retiro es
forward-looking — aplica cuando la Comanda de Retiros se construya.

## Tabla de referencia — prefijos CBU

Provista por el área de Operations (Manu Lamensa) como insumo original. A la
luz del hallazgo de que Coinag ya resuelve el dato vía API, **esta tabla es
innecesaria como solución de implementación**. Se mantiene en el discovery
como referencia histórica y como fallback conceptual en caso de que `bank_id`
de Coinag requiera mapeo.

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

## Hipótesis — estado actualizado

| # | Hipótesis | Estado |
|---|---|---|
| H1 | Coinag ya devuelve `bank_id` al validar cualquier CBU/CVU. OPS captura el campo pero lo descarta. El gap es exclusivamente de producto: mostrar y guardar el dato que ya llega. No se necesita BD de prefijos ni nueva integración. | **Confirmada** — 2026-06-05 |
| H2 | Banco resuelto y etiqueta son datos independientes y coexistentes: una cuenta puede tener "Banco Galicia" (resuelto desde Coinag) + "Galicia sueldo" (etiqueta manual libre). | **Plausible** — alineado con patrón de label en PSP Cuentas |
| H3 | La Comanda de Retiros no existe en el sistema; la mejora es relevante para cuando se construya. | **Confirmada** |
| H4 | Para CVUs, Coinag podría devolver el nombre de la fintech específica en `bank_id` (o en otro campo), eliminando o reduciendo la necesidad de etiqueta obligatoria. | **Pendiente** — depende del formato real de `bank_id` para CVUs. A verificar por Operations en la PSP vieja (ver P2). |
| H5 | Las etiquetas podrían tener permisos más amplios que el alta de whitelist: admins crean cuentas, pero ops officers podrían etiquetar. | **A confirmar** con Operations |

## Preguntas abiertas

Las siguientes preguntas bloquean la definición final del scope o deben
responderse antes de que IT implemente.

**P1 — Formato de `bank_id` para CBUs [bloqueante]:**
¿El campo `bank_id` que devuelve Coinag al validar un CBU llega como nombre
legible ("Banco Galicia") o como código numérico? Si es código, ¿qué formato
usa (prefijo de 3 dígitos BCRA, ID interno de Coinag, u otro)?
→ Verificar en la PSP vieja con un CBU de banco conocido (ej. Galicia, Macro).

**P2 — Formato de `bank_id` para CVUs [bloqueante para H4]:**
Al validar un CVU, ¿qué devuelve Coinag en `bank_id`? ¿Resuelve el nombre de
la fintech ("Mercado Pago", "Ualá") o devuelve un valor genérico / vacío? Si
resuelve, las etiquetas para CVUs pasan a ser complementarias, no obligatorias.
→ Verificar en la PSP vieja con un CVU de Mercado Pago y uno de Ualá. Comparar
resultados entre fintechs distintas.

**P3 — Permisos de etiquetado:**
¿Los operadores (no admins) deben poder editar etiquetas sobre cuentas ya
whitelisted? ¿O el etiquetado queda restringido al rol que hizo el alta?

**P4 — Retroactividad:**
¿Hay urgencia de mostrar banco en cuentas ya whitelisted (backfill), o la
mejora aplica solo a las altas nuevas?

## Referencias

- PWI-46: https://arduasolutions.atlassian.net/browse/PWI-46
- Hilo Slack: https://arduasolutions.slack.com/archives/C0AK2PW5BGQ/p1779824763900199
- Tabla de referencia CBU: `CBU_tabla_bancos-2.docx` (adjunto en hilo, reply de Manu Lamensa, 26/05/2026)
- Gap de origen: `discoveries/ops-discovery.md` §13 — "Proceso completo de whitelist"
- Repo de referencia (read-only): `repositories/core-ops-frontend`
  - `src/views/Clients/ClientDetail.vue` — flujo de whitelisting y `bank_id` capturado
  - `src/views/psp/PSPAccounts.vue` — sistema de labels existente en PSP Cuentas
- BIND API (referencia de capacidad): https://psp.bind.com.ar/developers/apis/consultar-cbu-cvu-por-cbu-cvu-o-alias
- Revisión IT (2026-06-05): Mati Ghisalberti, Valentin Vila, Santi Ahmed — confirman integración Coinag activa y que el dato debería llegar
- Features relacionados:
  - `features/ops/ops-crear-withdrawal-sin-banco.md`
  - `features/ops/ops-retiros-confirmacion-whatsapp.md`
