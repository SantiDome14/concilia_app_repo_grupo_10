---
name: OPS — Confirmacion de Withdrawals
features: [OPS]
status: En investigacion
owner: Santino Domeniconi
created_at: 2026-05-06
updated_at: 2026-05-06
---

# OPS — Confirmacion de Withdrawals

## Objetivo
Determinar que mecanismo de segunda capa de verificacion debe implementarse para confirmar
la identidad del cliente antes de ejecutar un withdrawal, en el ecosistema actual de WhatsApp.

## Contexto
Las solicitudes de withdrawal se reciben hoy por un grupo de WhatsApp dedicado por cliente.
Cada grupo tiene un representante por area (Operations, Legal, Comercial, Trading Desk) y,
si el cliente lo amerita, el CEO. No hay multiples personas por area — un representante por area.
Operations verifica el saldo y ejecuta sin ninguna validacion adicional de identidad.

El riesgo identificado: si alguien externo toma control del numero del cliente en el grupo,
puede solicitar un retiro y Operations lo ejecutaria sin poder detectar la suplantacion.
No hubo incidentes, pero el riesgo es real y sin mitigacion hoy. La necesidad es preventiva
y fue declarada como critica por el area de Operations.

Este riesgo se alinea con el pendiente O-12 del marco operativo:
"Sin canal formal de ingreso de instrucciones de clientes, no hay trazabilidad ni posibilidad
de auditar quien instruyó que."

## Flujo actual (relevado con Head of Operations — 2026-05-06)

1. Cliente envia mensaje al grupo de WhatsApp pidiendo el retiro
2. Operations verifica que el cliente tenga saldo disponible
3. Operations ejecuta la transferencia a la cuenta destino

**Casos de withdrawal:**
- **Crypto** — la wallet de destino debe estar whitelistada. Si no lo esta, el cliente
  debe demostrar ownership enviando material confirmatorio antes de ejecutar.
- **Fiat (ARS o dolar cable)** — se transfiere al CBU del cliente. El nombre asociado
  al CBU actua como validacion implicita.

**Entidades ejecutoras:**
- Retiros en fiat → Haz Pagos
- Retiros en crypto → Ardua Solutions Corp o Astra Ventures

**Tipos de cliente:** personas fisicas, empresas e instituciones.

## Opciones evaluadas

### Opcion A — WhatsApp Business API: Utility Template + Quick Reply Buttons ⭐ Preferida
Cuando el cliente solicita el retiro en el grupo, el sistema le manda automaticamente
un mensaje desde el numero oficial de Ardua con dos botones:
- "Confirmo el retiro"
- "No autorice esta operacion"

Operations ejecuta solo tras recibir la confirmacion. Adicionalmente, una vez ejecutado
el retiro, el cliente recibe un segundo Utility Template notificandole que su retiro
fue procesado.

**Nombre tecnico:** Utility Templates con Quick Reply Buttons (WhatsApp Business Platform)
**Ventaja:** sin friccion para el cliente — solo un tap. Sin requisitos de volumen de Meta.
**Blocker a validar:** requiere WhatsApp Business API y numero de negocio verificado en Meta.
**Estado:** pendiente confirmacion con CTO (Matias).

### Opcion B — OTP propio por SMS o email
Ardua genera un codigo internamente y lo envia al cliente por un canal distinto al grupo
(SMS o email). El cliente responde con el codigo y Operations ejecuta.
**Cuando aplica:** si no se cuenta con WhatsApp Business API.

### Opcion C — Link de confirmacion con expiracion
El sistema envia al cliente un link unico y con expiracion (por email o SMS).
El cliente hace click para confirmar. Operations ve la confirmacion y ejecuta.
**Cuando aplica:** si no se cuenta con infraestructura de OTP.

## Preguntas abiertas

- [ ] ¿Tiene Ardua WhatsApp Business API y numero de negocio verificado en Meta?
      → Pendiente: reunion con CTO (Matias) — 2026-05-06
- [ ] ¿Hay algun proveedor de comunicaciones ya integrado en el stack (Twilio, SendGrid)?
      → Pendiente: reunion con CTO (Matias) — 2026-05-06
- [ ] ¿Que tan rapido podria estar algo en produccion?
      → Pendiente: reunion con CTO (Matias) — 2026-05-06

## Propagacion esperada
Cuando se concluya esta investigacion, los hallazgos deben propagarse a:
- `features/ops/README.md` — actualizar Comanda de Retiros (hoy: ❌ No existe formalmente)
- `features/ops/ops-comanda-retiros.md` — crear feature file con el mecanismo definido
