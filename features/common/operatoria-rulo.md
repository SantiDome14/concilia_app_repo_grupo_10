---
aplicacion: COMMON
status: Definida
owner: Santino Domeniconi
created_at: 2026-05-27
updated_at: 2026-05-27
discovery: operatoria-rulo-discovery.md
productos_afectados: [TRD, OPS, LEX, FIN, CLP]
---

# Operatoria del rulo — Pipeline ARS → Stablecoins

## Propósito

El rulo es el servicio central del grupo: convierte assets del cliente
(ARS o USD) en stablecoins (USDT o USDC) pasando por Haz Pagos (PSP),
una ALyC, y Circuit Pay (PSAV). Es el producto que articula toda la
operatoria del grupo y el origen de los límites de cliente que LEX
gestiona, los quotes que TRD registra, los movimientos que OPS procesa
y la posición que FIN.Tesorería refleja.

---

## Actores

| Actor | Tipo | Rol |
|---|---|---|
| **Cliente** | Usuario final | Origen de los assets; receptor de los USDT |
| **Haz Pagos** | PSP (BCRA) — entidad propia | Receptor en tránsito; intermediario por cuenta y orden de la ALyC |
| **ALyC** | Agente de L&C (CNV) — proveedor | Opera el FCI + compra/venta de títulos |
| **Circuit Pay** | PSAV (CNV) — entidad propia | Recibe títulos vía contrato PSP→PSAV; ejecuta swap USD→Stablecoins |

---

## Flujo canónico — Caso base (MEP · ARS → USDT)

**Paso 1 — Cliente envía assets**
El cliente transfiere ARS (o USD, ver V3) desde su cuenta bancaria
propia hacia su CVU en Haz Pagos. La transferencia es same-name:
origen y destino pertenecen al mismo titular. El tramo bancario es
operado íntegramente por el cliente — Ardua no tiene capacidad de
intervenir en esa parte del flujo.

**Paso 2 — Haz Pagos recibe los fondos**
Haz Pagos actúa como intermediario **por cuenta y orden** de la ALyC.
No registra los fondos como propios — los recibe en tránsito y los
transfiere a la ALyC sin asumir riesgo financiero.

**Paso 3 — Suscripción al FCI**
La ALyC suscribe los fondos a un Fondo Común de Inversión (FCI). Los
fondos ingresan al fondo dentro del ecosistema de la ALyC.

**Paso 4 — Parking 1 (1 día hábil)**
Los fondos permanecen en el FCI durante 1 día hábil. Este período está
impuesto por la normativa del mercado de capitales argentino; no es una
decisión operativa del grupo.

**Paso 5 — Rescate FCI + compra de títulos**
Al vencer el parking, la ALyC rescata los fondos y los utiliza para
comprar títulos denominados en USD vía el mercado de capitales argentino
(bonos soberanos o corporativos que cotizan en ARS y USD
simultáneamente). Este mecanismo genera el tipo de cambio implícito
MEP o CCL.

**Paso 6 — Títulos transferidos a Circuit Pay**
Los títulos son transferidos desde la ALyC a Circuit Pay en virtud del
**contrato de recaudación PSP → PSAV** (Haz Pagos → Circuit Pay). Este
contrato habilita la transferencia de valores desde el universo bursátil
al universo crypto.

**Paso 7 — Parking 2 (período adicional)**
Los títulos permanecen en custodia de Circuit Pay durante un período
adicional antes de poder liquidarse. Este segundo parking está impuesto
por el régimen CNV para PSAVs.

**Paso 8 — Venta de títulos → USD**
Vencido el segundo parking, la ALyC vende los títulos dentro de su
ecosistema y obtiene USD. Esta venta materializa el tipo de cambio
implícito (MEP en el caso base).

**Paso 9 — Swap USD → Stablecoins**
Circuit Pay ejecuta el swap USD → Stablecoins con los dólares obtenidos
de la venta de títulos.

**Paso 10 — Entrega al cliente**
El cliente recibe las stablecoins en su wallet crypto. El rulo está
completo.

---

## Variaciones

### V1 — Tipo de TC: MEP vs CCL

| Variante | Mercado de compra | Mercado de venta | Resultado |
|---|---|---|---|
| **MEP** (caso base) | Local (ARS) | Local (USD) | USD acreditados en cuenta bancaria argentina |
| **CCL** | Local (ARS) | Offshore (USD) | USD acreditados en cuenta del exterior |

El CCL involucra una cuenta en el exterior, lo que agrega un paso de
transferencia internacional y genera un tipo de cambio típicamente mayor
al MEP. En los quotes de TRD, el campo "Tipo de TC" distingue MEP de
CCL.

### V2 — Stablecoin destino: USDT vs USDC

| Variante | Stablecoin | Estado |
|---|---|---|
| **USDT** (caso base) | Tether | Operativa |
| **USDC** | USD Coin | Operativa |

La elección depende de la wallet destino del cliente y de la liquidez
disponible en Circuit Pay al momento de la operación.

### V3 — Asset de origen: ARS vs USD

El cliente puede iniciar el pipeline enviando ARS o USD desde su propio
banco hacia su CVU en Haz Pagos. En ambos casos la transferencia es
same-name y el tramo bancario es operado íntegramente por el cliente.

Cuando el asset de origen es USD, los pasos 3–5 (FCI + compra de
títulos) se omiten: el pipeline arranca directamente desde la posición
en USD. El tramo Circuit Pay (pasos 6–10) permanece igual.

---

## Detalles operativos

**Código A07 — identificación de la transferencia bancaria**
Las transferencias del Paso 1 usan el código de concepto **A07**
(transferencia entre cuentas del mismo titular). Este código identifica
la operatoria en el sistema bancario argentino y permite a compliance
validar la legitimidad de la transferencia.

**Documentación de compliance vía WhatsApp**
Antes de procesar la operación, Ardua solicita al cliente que envíe por
el grupo de WhatsApp la documentación requerida por compliance.

**SWIFT y factura de Circuit Pay**
Al cierre del swap (Paso 9), Circuit Pay genera dos artefactos:
- **SWIFT** — documentación del movimiento internacional de fondos.
- **Factura** — documento contable que consume Finance para la
  registración del tramo crypto.

---

## Restricciones operativas

| Restricción | Paso(s) | Origen |
|---|---|---|
| **Same-name obligatorio (A07)** | 1 | El cliente solo puede enviar assets desde su propia cuenta bancaria |
| **Tramo bancario no gestionable por Ardua** | 1 | El banco es operado por el cliente; Ardua no puede intervenir |
| **Documentación de compliance obligatoria** | Previo al procesamiento | Compliance requiere documentación antes de procesar la operación |
| **Parking 1 — 1 día hábil** | 4 | Normativa BCRA / mercado de capitales. No configurable |
| **Parking 2 — período adicional** | 7 | Normativa CNV para PSAVs |
| **Solo residentes en Argentina** | Todo | Haz Pagos y Circuit Pay no pueden operar con no-residentes |
| **Sin US Persons** | Todo | Restricción hard — ningún ciudadano o residente de EEUU |
| **Sin PEPs** | Todo | Personas expuestas rechazadas automáticamente (política en revisión) |
| **Circuit Pay no custodia activos** | 6–10 | Circuit Pay ejecuta el swap pero no custodia stablecoins para el cliente |
| **Límite transaccional con vencimiento** | Todo | Límite operativo en Haz Pagos y Circuit Pay con fecha de vencimiento (~1 año) |

---

## Marco regulatorio

| Entidad | Registro | Regulador | Habilitación en el rulo |
|---|---|---|---|
| **Haz Pagos** | PSP | BCRA | Recepción y tránsito de fondos por cuenta y orden de la ALyC |
| **ALyC** | Agente de L&C | CNV | Suscripción FCI + compra/venta de títulos en el mercado de capitales |
| **Circuit Pay** | PSAV | CNV | Swap USD → Stablecoins en virtud del contrato de recaudación PSP → PSAV |

El contrato que articula las dos entidades propias en el pipeline es el
**contrato de recaudación Haz Pagos → Circuit Pay (PSP → PSAV)**.

---

## Referencias

- Discovery: `discoveries/operatoria-rulo-discovery.md`
- Entidad PSP: `entities/haz-pagos.md`
- Entidad PSAV: `entities/circuit-pay.md`
- Quotes del rulo en LEX: `discoveries/lex-operatoria-rulo-quotes-discovery.md`
- Quotes del rulo en TRD: `discoveries/trd-quotes-discovery.md`
