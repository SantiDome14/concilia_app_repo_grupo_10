# Haz Pagos

> Última actualización: 2026-05-21
> Tipo: Propia
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

Haz Pagos S.A. es la entidad argentina del grupo Ardua registrada como PSP (Proveedor de Servicios de Pago) ante el BCRA. Opera exclusivamente con residentes o entidades registradas en Argentina. Es la pata local del grupo que habilita la operatoria en pesos argentinos: recepción de fondos vía CVU, recaudación, transferencias locales, y actúa como intermediaria en el pipeline ARS → Stablecoins (rulo).

---

## Capacidades que nos habilita

- **CVU Collect para Plataformas**: recepción de pagos en pesos vía CVU a nombre de clientes institucionales, habilitando la integración de cobros locales para plataformas B2B.
- **Pipeline ARS → Stablecoins (rulo)**: actúa como intermediaria de recaudación por cuenta y orden de la ALyC. El cliente transfiere ARS a su CVU en Haz Pagos (operatoria same-name — entre cuentas del mismo titular). Haz Pagos no toca los fondos como propios — los transfiere a la ALyC para la suscripción al FCI. Sin riesgo financiero propio.
- **Same-name transfers**: todas las transferencias en el pipeline del rulo son entre cuentas del mismo titular — el cliente envía desde su cuenta bancaria a su CVU en Haz Pagos.
- **FCI (Fondos Comunes de Inversión)**: mediante acuerdo firmado con AdCap, permite ofrecer rendimientos en pesos a clientes del CLP vía la sección Earn (sub-feature desbloqueada).
- **Límite transaccional con vencimiento**: cada cliente recibe un límite transaccional calculado en base a su documentación patrimonial, con fecha de vencimiento (típicamente 1 año). Al vencer, el cliente queda bloqueado hasta renovación.
- **[A completar]**: capacidades adicionales de procesamiento de pagos locales (DEBIN, transferencias inmediatas, etc.)

---

## Integración operativa

- **Módulos internos que la usan**: OPS (recepción y ejecución de fondos, módulo PSP), FIN (registración contable y conciliación), CLP (productos Earn, cuentas locales).
- **Flujo de fondos en el rulo**: cliente → CVU en Haz Pagos (same-name) → ALyC (suscripción FCI) → rescate + compra de títulos → Circuit Pay (vía contrato PSP→PSAV) → venta de títulos → USD → swap → USDT.
- **Bancos sponsor del PSP**: COINAG, BIND, Banco de Comercio. Cada banco opera bajo el esquema CBU madre + CVUs por cliente.
- **Conciliación**: diaria desde Finanzas. [A completar — frecuencia exacta, criterio de matching con extractos bancarios]
- **Excel CLIENTES - PSP**: al dar de alta un cliente en Haz Pagos, se registra el número de comitente y datos básicos en el archivo Excel CLIENTES - PSP.
- **Excel MESA DB - CIRCUIT (pestaña Límites)**: el límite transaccional asignado a cada cliente se informa en este archivo para que el cliente pueda operar. Sin este paso, el cliente no puede operar en la PSP.
- **Integraciones técnicas**: [A completar — APIs, webhooks, flujos n8n específicos]

---

## Restricciones y condiciones

- **Solo residentes o entidades registradas en Argentina**: no puede dar CVU a no residentes.
- **Sin US Persons**: restricción hard — ningún ciudadano o residente estadounidense puede ser onboardeado.
- **Sin PEPs**: personas política o públicamente expuestas — directas o por parentesco — son rechazadas automáticamente. Política actual en revisión hacia un modelo de admisión progresiva por niveles de exposición.
- **Sujeto Obligado ante UIF**: debe solicitar documentación de origen de fondos a clientes. Límite transaccional obligatorio con fecha de vencimiento. Obligaciones de reporte mensual ante UIF y BCRA.
- **Límite transaccional con vencimiento**: todo límite tiene fecha de vencimiento (típicamente 1 año). Al vencer, el cliente queda bloqueado hasta renovación con nueva documentación.
- **[A completar]**: límites operativos (volumen máximo mensual, montos máximos por operación), costos bancarios, SLAs.

---

## Referencias

- **Acuerdo AdCap (FCI)**: habilita la sección Earn · FCI en el CLP.
- **Contrato de recaudación Haz Pagos → Ardua Solutions Corp**: permite a Ardua Solutions Corp recaudar pesos argentinos por cuenta y orden de Haz Pagos.
- **Contratos sponsor bancario**: Haz Pagos ↔ COINAG, Haz Pagos ↔ BIND, Haz Pagos ↔ Banco de Comercio. [A completar — referenciar]
- **Manual de Onboarding de Clientes** (Legal & Compliance, mayo 2026) — §7 Pipeline ARS → Stablecoins.
- **Contactos clave**: [A completar — legal, compliance, operaciones]
