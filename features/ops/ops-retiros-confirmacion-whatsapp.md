# ops-confirmacion-retiros

> Última actualización: 2026-05-08
> REQ: REQ-80

---

## Propósito

Capa de confirmación explícita de solicitudes de retiro vía WhatsApp Business API. Intercepta la intención de retiro del cliente en el grupo de WhatsApp, envía un utility template de confirmación al número personal del cliente y notifica a Operations en Slack con el resultado — aprobado, rechazado o vencido sin respuesta.

---

## Estado actual

En definición. REQ-80 enriquecido y pendiente de handoff a Tecnología. Dos prerequisitos bloqueantes antes de poder iniciar desarrollo.

---

## Prerequisitos bloqueantes

- **Canal de Slack para retiros** — no existe. Crear y confirmar nombre con Manu / Santiago (Operations) antes del go-live.
- **Mapeo grupo → número personal del cliente** — no existe. Debe construirse como prerequisito técnico antes del desarrollo del flujo principal.

---

## Flujo

1. Cliente envía mensaje de retiro en lenguaje libre en el grupo de WhatsApp
2. Miles detecta la intención via NLP
3. En paralelo:
   - Envía utility template `ardua_confirmacion_retiro` al número personal del cliente desde el número de WhatsApp Business de Ardua
   - Notifica al canal de Slack de retiros que se creó una nueva solicitud
4. Cliente aprueba o rechaza desde el template. La solicitud expira a los **30 minutos** (debatible con datos de operación real — se definió considerando perfil HNWI/institucional)
5. Sistema notifica a Operations con resultado diferenciado: aprobada / rechazada / vencida sin respuesta

---

## Utility template

**Nombre:** `ardua_confirmacion_retiro`

```
Solicitud de retiro — Ardua

Hola, {{nombre}}.

Recibimos una solicitud de retiro desde tu cuenta:

Fecha y hora: {{fecha_hora}}
Monto: {{monto}} {{activo}}
Destino: {{tipo_destino}} ***{{ultimos_digitos_destino}}

Si no reconocés esta operación, rechazala de inmediato.

[ Aprobar solicitud de retiro ]
[ No solicité este retiro ]
```

Documentación de referencia: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/utility-templates/utility-templates

---

## Fuera de alcance (v1)

- Ejecución del retiro por Operations
- Gestión de la whitelist de wallets y cuentas de destino
- Flujo de excepción para clientes sin acceso al mecanismo de confirmación
- Diferenciación por tipo de cliente
- Umbral de monto
- Integración con Comanda de Retiros (iteración futura)

---

## Decisiones clave

| Decisión | Alternativas descartadas | Motivo |
|----------|--------------------------|--------|
| Utility template vía WhatsApp Business API | Token físico TOTP (Token2 OTPC) | CTO descartó el token; Ardua ya tiene acceso y número verificado en WhatsApp Business |
| Detección por NLP en lenguaje libre | Keyword / comando estructurado | Reduce fricción para el cliente |
| Expiración: 30 minutos | 5 minutos | Perfil HNWI/institucional requiere ventana realista; 5 min generaría alta tasa de expiración |
| Template enviado 1:1 al número personal | Respuesta en el grupo | Privacidad: datos de la operación no quedan expuestos en el grupo |

---

## Referencias

- REQ-80: https://arduasolutions.atlassian.net/browse/REQ-80
