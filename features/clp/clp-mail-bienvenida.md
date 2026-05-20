# CLP — Mail de bienvenida

> Módulo: Comunicaciones / Mail transaccional
> Estado: SENT TO DEV (REQ-109)
> Última actualización: 2026-05-19

---

## Qué hace esta funcionalidad

El Portal de Clientes (CLP) envía un mail de bienvenida automático cuando se otorga acceso
a un nuevo cliente. Este mail es el primer punto de contacto formal del cliente con el portal.

---

## Estado actual (v1 — branding actualizado)

El template del mail fue reemplazado por la versión con el nuevo branding de la empresa.
El contenido funcional (instrucciones de acceso, credenciales, links) no se modificó.

---

## Trigger de envío

El mail se dispara automáticamente al otorgar acceso a un cliente al portal. La lógica y
los triggers de envío no forman parte del scope de REQ-109 y no se modificaron.

---

## Contenido del mail

| Elemento | Descripción |
|---|---|
| Capa visual | Nuevo branding: estructura, colores, tipografía, logo actualizados |
| Contenido funcional | Sin cambios: instrucciones de acceso, credenciales, links |

---

## Reglas de negocio

- El mail se dispara una vez al otorgar acceso al cliente — no es recurrente.
- El nuevo template debe visualizarse correctamente en Gmail y Outlook como mínimo.

---

## Prerequisito de implementación

El área de Diseño debe proveer al equipo de Desarrollo el archivo del nuevo diseño del
mail (HTML, Figma, o el formato acordado) antes de iniciar la implementación.

---

## Restricciones (fuera de scope v1)

- Cambios en el contenido textual o funcional del mail.
- Actualización de otros mails transaccionales del portal.
- Cambios en la lógica o triggers de envío.

---

## Artefactos de referencia

| Artefacto | Referencia |
|---|---|
| Ticket Jira | [REQ-109](https://arduasolutions.atlassian.net/browse/REQ-109) |
| Hilo Slack | [Ver hilo](https://arduasolutions.slack.com/archives/C0AKNPCNNSU/p1779205110934769) |
| Discovery | `discoveries/portal-clientes-mail-bienvenida-discovery.md` |
