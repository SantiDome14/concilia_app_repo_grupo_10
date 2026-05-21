# Circuit Pay

> Última actualización: 2026-05-21
> Tipo: Propia
> Jurisdicción(es): Argentina
> Estado de la relación: Activa

## Qué es

Circuit Pay S.A. es la entidad argentina del grupo Ardua registrada como PSAV (Proveedor de Servicios de Activos Virtuales) ante la CNV. Su rol específico dentro del grupo es gestionar el tramo crypto del pipeline del rulo: recibe los títulos transferidos desde la ALyC en virtud del contrato de recaudación PSP → PSAV (Haz Pagos → Circuit Pay), y ejecuta el swap USD → Stablecoins (USDT), entregando los activos digitales a la wallet del cliente.

Opera exclusivamente con residentes o entidades registradas en Argentina.

---

## Capacidades que nos habilita

- **Swap USD → Stablecoins**: ejecución del tramo final del pipeline del rulo. Recibe USD desde la ALyC (post-venta de títulos) y ejecuta la conversión a USDT u otras stablecoins.
- **Custodia transitoria de stablecoins**: las stablecoins quedan disponibles en la wallet de Circuit Pay antes de ser transferidas a la wallet del cliente.
- **Intermediación PSP → PSAV**: recibe títulos transferidos desde la ALyC en virtud del contrato de recaudación Haz Pagos → Circuit Pay.
- **Acuerdo de giro al descubierto con Ardua Solutions Corp**: facilita el fondeo operativo de Circuit Pay a través de la entidad canadiense.
- **Acceso a Elliptic (vía Ardua Solutions Corp)**: cesión de acceso exclusivo para tareas de compliance sobre activos virtuales.

---

## Integración operativa

- **Módulos internos que la usan**: OPS (módulo PSP — tramo crypto), FIN (conciliación del tramo crypto), CLP (reflejo de posiciones crypto al cliente).
- **Flujo de fondos en el rulo**: ALyC vende títulos → USD → Circuit Pay → swap USD → USDT → wallet del cliente.
- **Excel CLIENTES - PSAV**: al dar de alta un cliente en Circuit Pay, se registra el número de comitente y datos básicos en el archivo Excel CLIENTES - PSAV.
- **Excel MESA DB - CIRCUIT (pestaña Límites)**: el límite transaccional asignado a cada cliente se informa en este archivo. Sin este paso, el cliente no puede operar en la PSAV.
- **Conciliación**: [A completar — frecuencia, criterio de matching, responsable]
- **Integraciones técnicas**: [A completar — APIs, webhooks, flujos n8n específicos]

---

## Restricciones y condiciones

- **Solo residentes o entidades registradas en Argentina**: misma restricción que Haz Pagos. No puede operar con clientes no registrados en Argentina.
- **Sin US Persons**: restricción hard — ningún ciudadano o residente estadounidense puede ser onboardeado bajo ninguna circunstancia.
- **Sin PEPs**: personas política o públicamente expuestas — directas o por parentesco — son rechazadas automáticamente en Circuit Pay y en las otras dos sociedades. Política actual en revisión hacia un modelo de admisión progresiva por niveles de exposición.
- **No puede custodiar activos digitales de clientes en la configuración vigente**: la custodia requeriría modificar su registro ante CNV (ver `marco-legal.md` §2.2). Actualmente Circuit Pay puede realizar swap pero no custodiar.
- **Sujeto Obligado ante UIF y CNV**: altas y bajas de clientes deben reportarse mensualmente. Auditoría anual de sistemas UIF. Revisión externa independiente UIF.
- **Límite transaccional con vencimiento**: todo límite tiene fecha de vencimiento (típicamente 1 año). Al vencer, el cliente queda bloqueado hasta renovación.
- **[A completar]**: límites operativos, costos, SLAs contractuales.

---

## Referencias

- **Contrato de recaudación Haz Pagos → Circuit Pay (PSP → PSAV)**: habilita la recepción de títulos desde la ALyC para el tramo crypto del rulo.
- **Acuerdo de giro al descubierto con Ardua Solutions Corp**: fondeo operativo intercompany.
- **Manual de Onboarding de Clientes** (Legal & Compliance, mayo 2026) — §7 Pipeline ARS → Stablecoins.
- **Contactos clave**: [A completar — legal, compliance, operaciones]
