---
name: CLP — Modulo de Retiros (Self-service desde el portal)
features: [CLP, OPS]
status: En investigacion
owner: Santino Domeniconi
created_at: 2026-06-10
updated_at: 2026-06-10
propagates_to:
  - features/clp/clp-retiros.md
  - features/clp/README.md
  - features/ops/README.md
---

# CLP — Modulo de Retiros (Self-service desde el portal)

## Objetivo

Definir el modulo de Retiros del Client Portal: el mecanismo mediante el cual el cliente
instruye un retiro directamente desde CLP, reemplazando los grupos de WhatsApp como canal
de instruccion. Operations recibe la solicitud en el panel de OPS y ejecuta.

Este modulo reemplaza el enfoque documentado en PWI-61 (deprecado el 2026-06-10).

## Contexto

Hoy el proceso de retiros opera sobre grupos de WhatsApp: un grupo por cliente donde
Operations recibe el pedido, verifica saldo y ejecuta. No hay validacion de identidad,
no hay trazabilidad formal y no hay canal auditado de instrucciones.

El riesgo fue identificado y declarado critico por Operations: si alguien externo toma
control del numero del cliente en el grupo, puede instruir un retiro sin que Operations
pueda detectarlo. Este riesgo se alinea con el pendiente O-12 del marco operativo:
"Sin canal formal de ingreso de instrucciones de clientes, no hay trazabilidad
ni posibilidad de auditar quien instruyó que."

La exploracion inicial (PWI-61, `discoveries/ops-withdraw-confirmation-discovery.md`)
evaluo mecanismos de confirmacion sobre WhatsApp — utility templates, NLP, comandos
estructurados. El resultado fue negativo: la WhatsApp Business Cloud API no soporta
grupos (solo conversaciones 1:1), el NLP en lenguaje libre no es implementable
(confirmado por Mati Sragowicz), y la Opcion B (comando estructurado) cayo por la
misma limitacion de grupos. PWI-61 fue deprecado el 2026-06-10.

El pivot definido: **CLP como canal formal y unico de instruccion de retiros**.
El cliente ingresa la solicitud desde su portal autenticado. Operations la recibe
en OPS y ejecuta. Los grupos de WhatsApp quedan fuera del flujo de instruccion.

## Por que CLP es la solucion correcta

- **Identidad verificada**: el cliente opera en una sesion autenticada — no hay
  riesgo de suplantacion por toma de cuenta de WhatsApp.
- **Trazabilidad completa**: cada solicitud queda registrada con timestamp, usuario,
  IP de sesion, activo, monto y destino.
- **Canal propio**: Ardua controla el canal — no hay dependencia de WhatsApp Business
  ni de Meta.
- **Coherencia de producto**: CLP ya es la interfaz de saldos y transacciones del
  cliente. Retiros es una accion natural dentro del mismo contexto.
- **Eliminacion del riesgo O-12**: formaliza el canal de instrucciones de cliente
  con trazabilidad y audit trail completo.

## Modelo de operacion (hipotesis de flujo)

### Lado cliente — CLP

1. Cliente ingresa al portal y navega al modulo de Retiros (nuevo en la nav de CLP).
2. Selecciona el activo y monto a retirar.
3. Selecciona la cuenta destino desde su whitelist de cuentas aprobadas.
   - Fiat (ARS, USD): CBU / CVU / cuenta bancaria whitelistada.
   - Crypto (USDC, USDT, BTC): wallet whitelistada.
4. Revisa el resumen y confirma la solicitud.
5. CLP registra la solicitud con estado `Pendiente`.
6. Cliente recibe confirmacion en pantalla + notificacion por email.
7. El estado de la solicitud es visible en CLP (historial de retiros).

### Lado Operations — OPS

1. Al crearse una solicitud, OPS recibe una notificacion en el canal de Slack
   de retiros (canal a definir con Manu / Operations).
2. Operations ve la solicitud en el panel de OPS: cliente, activo, monto, destino,
   timestamp, estado.
3. Operations verifica saldo disponible y ejecuta el retiro.
4. Operations marca la solicitud como `Ejecutada` en OPS.
5. El cliente recibe notificacion por email del cambio de estado.
6. El estado en CLP se actualiza a `Ejecutado`.

### Entidades ejecutoras

- Retiros en fiat (ARS, USD cable) → Haz Pagos
- Retiros en crypto (USDC, USDT, BTC) → Ardua Solutions Corp o Astra Ventures

(Mantiene el modelo ya documentado en `discoveries/ops-withdraw-confirmation-discovery.md`.)

## Estados de una solicitud de retiro

| Estado | Descripcion |
|---|---|
| `Pendiente` | Solicitud creada por el cliente, aun no procesada por Operations |
| `En proceso` | Operations tomo la solicitud y esta ejecutando |
| `Ejecutado` | Retiro ejecutado exitosamente |
| `Rechazado` | Operations rechazo la solicitud (motivo: fondos insuficientes, cuenta no valida u otro) |
| `Cancelado` | El cliente cancelo la solicitud antes de que Operations la procese |

La visibilidad del estado en CLP aplica el mismo Patron 1 (Solicitud-Ejecucion) ya
documentado en `discoveries/clp-discovery.md`: modelo asincronico donde el cliente
solicita, Ardua procesa y notifica.

## Preguntas abiertas

### Gestion de whitelist desde CLP

- [x] **RESUELTO** — La whitelist la administra Ardua / Operations exclusivamente.
      El modelo de PWI-46 define que Operations gestiona las cuentas whitelistadas
      desde OPS. Para crypto, el cliente debe demostrar ownership ante Operations
      antes de que la wallet se apruebe (ya documentado en
      `discoveries/ops-withdraw-confirmation-discovery.md`). El formulario de retiro
      en CLP muestra un selector de cuentas ya aprobadas — sin alta ni baja desde
      el portal. No hay superficie de auto-gestion en CLP.

### Cancelacion por el cliente

- [x] **RESUELTO** — Cancelable unicamente en estado `Pendiente`, antes de que
      Operations tome la solicitud. Una vez que el estado cambia a `En proceso`,
      la cancelacion no es operativamente posible. El boton de cancelar se oculta
      (o se deshabilita con tooltip explicativo) a partir de `En proceso`.

### Rechazo por Operations

- [x] **RESUELTO** — El cliente ve el motivo del rechazo. Operations tiene un campo
      de texto libre obligatorio al rechazar. El motivo es parte del registro
      auditado de la solicitud — es coherente con el objetivo de trazabilidad
      formal que motiva este modulo (O-12 del marco operativo).

### Historial de retiros

- [x] **RESUELTO** — Son dos objetos de datos distintos, no duplicados:
      - **Withdrawal Request** (ciclo de instruccion): vive en el modulo Retiros
        de CLP. Tiene estados propios del ciclo de aprobacion (Pendiente / En proceso
        / Ejecutado / Rechazado / Cancelado).
      - **Withdrawal Transaction** (movimiento ejecutado): una vez que Operations
        ejecuta, el movimiento aparece en Transactions como tipo `Withdrawal`
        (ya contemplado en el modelo de datos de `discoveries/clp-discovery.md` §7).
      El cliente ve en Retiros el estado de su instruccion. Ve en Transactions
      el movimiento consumado en el libro de operaciones. No hay duplicacion.

### Notificaciones al cliente

- [x] **RESUELTO** — Tres eventos disparan email al cliente, siguiendo el
      Patron 1 (Solicitud-Ejecucion) de `discoveries/clp-discovery.md`:
      creacion de la solicitud, cambio a `Ejecutado`, cambio a `Rechazado`.
      `Cancelado` no dispara notificacion — el cliente fue quien lo inicio.

### Clientes sin CLP

- [ ] **ABIERTO** — No tenemos datos del universo de clientes sin CLP.
      Hipotesis de diseño: WhatsApp sigue como canal valido durante un periodo
      de transicion para clientes sin acceso; CLP se convierte en canal obligatorio
      para todos los clientes nuevos a partir del go-live de este modulo;
      Operations define el timeline de migracion de clientes existentes.
      → Confirmar volumen y timeline con Manu (Operations) y Mauro (Sales).

### Canal Slack para Operations

- [ ] **ABIERTO** — El canal de Slack para notificaciones de retiros no existe.
      Prerequisito bloqueante heredado del PWI-61. Requiere nombre y configuracion.
      → Confirmar con Manu / Santiago (Operations) antes del go-live.

### Limites y validaciones en CLP

- [ ] **ABIERTO** — No documentados en ningun framework ni feature file.
      → Validar con Operations (limites operativos por monto y frecuencia)
      y con Legal (limites regulatorios por entidad ejecutora:
      Haz Pagos para fiat, Ardua Solutions Corp / Astra Ventures para crypto).

### Crypto: fee de red

- [ ] **ABIERTO** — El modelo de crypto esta sin documentar (O-04 a O-08
      del marco operativo). No es posible resolver desde el repo.
      → Validar con Operations y Facu (Trading Desk).

## Dependencias identificadas

| Dependencia | Estado | Referencia |
|---|---|---|
| Whitelist de CBU/CVU | En construccion | PWI-46 |
| Whitelist de wallets | No documentada formalmente | — |
| Canal Slack para retiros | No existe | Prerequisito bloqueante del PWI-61 sin resolver |
| Notificaciones por email | Patron existente en CLP | `discoveries/clp-discovery.md` Patron 1 |
| Modulo Transactions (modelo de datos) | En definicion | `discoveries/clp-discovery.md` §7 |

## Stakeholders a validar

| Pregunta | Stakeholder | Urgencia |
|---|---|---|
| ~~Gestion de whitelist desde CLP~~ | ~~Manu, Juani / Lara~~ | ~~Alta~~ Resuelto |
| Canal Slack de retiros | Manu / Santiago (Operations) | Alta — prerequisito para notificaciones |
| ~~Cancelacion por el cliente~~ | ~~Manu (Operations)~~ | ~~Media~~ Resuelto |
| Clientes sin CLP (transicion y timeline) | Manu (Operations), Mauro (Sales) | Alta — impacta go-live |
| ~~Rechazo con motivo visible~~ | ~~Manu (Operations)~~ | ~~Media~~ Resuelto |
| Fee de red en crypto | Manu (Operations), Facu (Trading) | Media |
| ~~Historial en Retiros vs. Transactions~~ | ~~Decision interna de producto~~ | ~~Media~~ Resuelto |
| Limites operativos y regulatorios por monto | Manu (Operations), Juani / Lara (Legal) | Media |

## Relacion con discoveries existentes

- `discoveries/ops-withdraw-confirmation-discovery.md` — investigacion previa (WhatsApp).
  Preservada como referencia historica. El PWI-61 que resulto de ese discovery fue
  deprecado el 2026-06-10. El presente discovery es el sucesor directo.
- `discoveries/clp-discovery.md` — contexto del portal: Patron 1 (Solicitud-Ejecucion),
  modelo de Transactions, arquitectura de notificaciones.
- PWI-46 (features/ops/ops-cuentas-operativas-del-cliente.md) — whitelist de cuentas.
  Dependencia directa para la seleccion de destino en el formulario de retiro.
