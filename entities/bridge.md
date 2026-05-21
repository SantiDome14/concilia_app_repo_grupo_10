# Bridge

> Última actualización: 2026-05-21
> Tipo: Proveedor
> Jurisdicción(es): Estados Unidos
> Estado de la relación: Activa

## Qué es

Bridge es una plataforma de exchange y cuentas virtuales (Virtual Accounts) a través de la cual Ardua Solutions Corp ejecuta operaciones en nombre de sus clientes. Bridge no es visible al cliente final — el cliente opera a través del Client Portal de Ardua, y Bridge actúa como infraestructura de backend.

Habilita la creación de cuentas virtuales individuales con número de ruta único para recibir USD y EUR, y permite ejecutar transferencias internacionales, swaps, pagos al exterior y otras instrucciones financieras a través de una interfaz de gestión operada exclusivamente por el equipo de Ardua.

---

## Capacidades que nos habilita

- **Cuentas virtuales (Virtual Accounts)**: emisión de cuentas con número de ruta único por cliente para recibir USD y EUR desde el exterior (ACH y SEPA).
- **Ejecución de instrucciones financieras**: transferencias internacionales, pagos al exterior (China, artistas, importaciones), recepción de fondos desde plataformas como Deel.
- **Swap USD → Stablecoins**: ejecución del tramo final del pipeline del rulo — conversión de USD a USDT u otras stablecoins, luego de la venta de títulos en la ALyC.
- **Onboarding de clientes**: gestión de altas de clientes individuales (Individual) y empresas (Business), con flujo de compliance integrado (Terms of Service, carga de ID, validación de domicilio, origen de fondos para mayores de 60 años).
- **Feature access US / SEPA**: habilitación de transacciones ACH (US) y SEPA (EU) por cliente, activadas durante el proceso de alta.

---

## Integración operativa

- **Áreas que la usan**: Legal & Compliance (gestión de altas), Operaciones (ejecución de instrucciones), Trading Desk (rulo y operaciones de cambio).
- **Identificador de cliente**: cada cliente de Ardua en Bridge se registra con el email `compliance+[N]@arduasolutions.com`, donde N es el número de legajo AS del cliente en LEX. Este patrón es el identificador cruzado entre Bridge y LEX.
- **Estados de onboarding en Bridge**:
  - `Active` — cuenta operativa
  - `Need Actions` — pasos pendientes (TyC, datos personales, ID)
  - `Under Review` — pendiente de revisión por Bridge, típicamente por monto declarado alto; resuelto en 24–48hs con formulario adicional
- **Flujo de alta**: creación manual por analista de Compliance → aceptación de TyC → carga de datos básicos (nombre, domicilio, fecha de nacimiento, ID) → carga de documento de identidad (JPG obligatorio, no PDF) → activación de features US/SEPA.
- **Documentación requerida para el alta**: DNI frente y dorso (o pasaporte frente). Formato JPG exclusivamente — los PDFs deben convertirse (captura de pantalla) antes de la carga.
- **Integraciones técnicas**: [A completar — API de Bridge, webhooks, autenticación]

---

## Restricciones y condiciones

- **Operación exclusiva por equipo Ardua**: el cliente no accede directamente a Bridge. Todas las instrucciones las ejecuta el equipo de Ardua.
- **Sin US Persons**: restricción hard — ningún ciudadano o residente estadounidense puede ser onboardeado bajo ninguna circunstancia, en ningún producto.
- **Sin PEPs**: personas política o públicamente expuestas — directas o por parentesco — son rechazadas automáticamente. No se les crea cuenta en Bridge. Política actual en revisión hacia un modelo de admisión progresiva por niveles de exposición.
- **Documentos de identidad en JPG únicamente**: Bridge no acepta PDFs. Los documentos deben convertirse antes de la carga.
- **Under Review para montos altos**: cuentas con volumen declarado elevado pueden quedar en revisión 24–48hs antes de activarse.
- **[A completar]**: límites operativos por cuenta, costos de transferencia, SLAs de Bridge.

---

## Referencias

- **Integración con LEX**: el número de legajo AS es el nexo entre el perfil en LEX y el email en Bridge (`compliance+N@arduasolutions.com`).
- **Manual de Onboardings v1.0** (Facundo Arce, nov 2025) — sección "Onboarding en Bridge".
- **Manual de Onboarding de Clientes** (Legal & Compliance, mayo 2026) — §5 y §8.
- **Contactos clave**: [A completar — account manager de Bridge asignado a Ardua]
