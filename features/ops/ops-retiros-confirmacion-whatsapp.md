# ops-confirmacion-retiros

> Última actualización: 2026-06-10
> REQ: PWI-61 — DEPRECATED

---

## Propósito

Capa de confirmación explícita de solicitudes de retiro vía WhatsApp Business API. Intercepta la intención de retiro del cliente en el grupo de WhatsApp, envía un utility template de confirmación al número personal del cliente y notifica a Operations en Slack con el resultado — aprobado, rechazado o vencido sin respuesta.

---

## Estado actual

Deprecado. PWI-61 fue deprecado el 2026-06-10. La investigación sobre el mecanismo de confirmación queda preservada en `discoveries/ops-withdraw-confirmation-discovery.md` para referencia futura.

---

## Prerequisitos bloqueantes

- **Canal de Slack para retiros** — no existe. Crear y confirmar nombre con Manu / Santiago (Operations) antes del go-live.
- **Mapeo grupo → número personal del cliente** — no existe. Debe construirse como prerequisito técnico antes del desarrollo del flujo principal.

---

## Flujo

> ⚠️ El paso 2 está bajo revisión. La detección automática vía NLP fue descartada por Mati Sragowicz. Ver sección Revisión del alcance para las alternativas en evaluación.

1. Cliente envía mensaje de retiro en el grupo de WhatsApp
2. **[EN REVISIÓN]** Sistema detecta la intención — mecanismo de trigger pendiente de definir
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

## Revisión del alcance

Mati Sragowicz confirmó que la detección automática de intención de retiro en lenguaje libre vía NLP no es implementable. El trigger del flujo está sin resolver. Los pasos 3, 4 y 5 permanecen válidos. Dos alternativas en evaluación:

**Opción A — Trigger manual por Operations (viable, sin dependencia de grupos)**
Operations recibe el pedido en el grupo de WhatsApp como hoy. En lugar de ejecutar directamente, va al panel en la app de OPS, carga el número de teléfono del cliente y los datos del retiro. El sistema llama a la WhatsApp Business Cloud API y el cliente recibe el utility template directamente desde el número oficial de Ardua en una conversación 1:1 — los grupos no intervienen en ningún punto del flujo técnico.
- Preserva la capa de confirmación al 100% / no depende de los grupos ni del webhook de entrada / Operations suma un paso / complejidad: baja-media
- Único requisito técnico: Ardua debe tener activa la Cloud API de Meta (número verificado + token de acceso)

**Opción B — Comando estructurado del cliente (descartada)**
Dependia de que el webhook pueda leer mensajes del grupo. La WhatsApp Business Cloud API no soporta grupos — opción descartada.

**Hallazgo técnico — WhatsApp Business API y grupos**
La Cloud API de Meta no soporta grupos. El webhook recibe eventos de conversaciones 1:1 únicamente. Los grupos de Ardua (uno por cliente) probablemente corren sobre WhatsApp Business App, que es un producto distinto. El trigger del flujo debe ser siempre iniciado desde el panel de OPS, no desde los grupos.

**Única pregunta abierta con Mati:** confirmar si Ardua tiene activa la Cloud API de Meta (número de negocio verificado + token de acceso). Si está activo, la Opción A no tiene bloqueantes técnicos adicionales.

**Próximo paso:** confirmar con Mati el estado de la Cloud API y avanzar con la Opción A como camino definitivo.

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
