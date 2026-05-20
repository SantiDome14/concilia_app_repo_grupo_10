---
name: CLP — Actualización del mail de bienvenida al nuevo branding
features: [CLP]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-05-19
updated_at: 2026-05-19
propagates_to:
  - features/clp/README.md
  - features/clp/clp-mail-bienvenida.md
---

# CLP — Actualización del mail de bienvenida al nuevo branding

> Categoría: Product — functionality · Aplicación: CLP (Client Portal)
> Módulo: Comunicaciones / Mail transaccional
> Requirement: REQ-109 · Estado: SENT TO DEV · Modo de enriquecimiento: Express
> Solicitante: Camila Baiardi — Graphic Designer Lead · Diseño

---

## Objetivo

Determinar el alcance de la actualización del mail de bienvenida del Portal de Clientes (CLP)
para reemplazar el branding anterior de la empresa por la identidad visual vigente,
garantizando que el primer contacto formal del cliente con el portal refleje la imagen
corporativa actual.

---

## Contexto

El Portal de Clientes (CLP) envía un mail de bienvenida automático cuando se le otorga acceso
a un nuevo cliente. Ese mail utiliza el branding anterior de la empresa — identidad visual
desactualizada que genera una primera impresión inconsistente con el resto de la experiencia
de marca.

El problema fue identificado por Camila Baiardi (Graphic Designer Lead) y capturado por
Miles vía Slack. El nuevo diseño del mail ya estaba disponible al momento del requerimiento
— no había trabajo de diseño pendiente. El enriquecimiento se realizó en modo Express dado
que el scope es acotado, el insumo de diseño estaba listo y no había ambigüedad de negocio
a resolver.

Por qué importa: el mail de bienvenida es el primer punto de contacto formal del cliente
con el portal. Un mail con branding desactualizado genera confusión y daña la percepción
de consistencia de marca antes de cualquier otra interacción.

---

## Conclusión

Hipótesis validada. El cambio es un reemplazo de template visual sin alteración del
contenido funcional. Scope enviado a desarrollo (SENT TO DEV).

### Qué cambia

La capa visual del mail: estructura, colores, tipografía, logo. Se reemplaza por el nuevo
diseño entregado por el área de Diseño.

### Qué no cambia

El contenido funcional del mail (instrucciones de acceso, credenciales, links) y la lógica
y triggers de envío.

### Prerequisito de implementación

Diseño debe proveer al equipo de Desarrollo el archivo o link al nuevo diseño del mail
(HTML, Figma, o el formato acordado) antes de iniciar. Sin este insumo, el cambio no puede
ejecutarse.

### Validación

El mail nuevo debe visualizarse correctamente en al menos Gmail y Outlook.

### Fuera de scope (v1)

- Actualización de otros mails transaccionales del portal.
- Cambios en el contenido textual o funcional del mail.
- Cambios en la lógica o triggers de envío.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-05-19 | Creación del discovery. Documenta contexto, decisiones de diseño, scope del REQ-109 (SENT TO DEV, modo Express). Propagado a `features/clp/README.md` y `features/clp/clp-mail-bienvenida.md`. |
