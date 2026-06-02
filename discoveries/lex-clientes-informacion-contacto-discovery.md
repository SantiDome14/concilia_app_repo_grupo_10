---
name: LEX — Información de Contacto del Legajo (Clientes) · Discovery Document
features: [LEX]
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-06-02
updated_at: 2026-06-02
propagates_to:
  - features/lex/lex-clientes-informacion-contacto.md
  - features/lex/README.md
---

# LEX — Información de Contacto del Legajo (Clientes) · Discovery Document

## Objetivo

Definir una funcionalidad y vista dentro del **Legajo de Cliente** de LEX que permita
gestionar **información de contacto adicional** del cliente — múltiples teléfonos y
múltiples emails — más allá del teléfono y email únicos con los que el cliente se registró
en el onboarding.

La pregunta de diseño que esta investigación resuelve: **¿dónde vive el contacto adicional,
con qué modelo de datos, y qué impacto tiene sobre los campos de contacto existentes y sobre
la trazabilidad de compliance?**

## Contexto

Hoy el detalle de cliente (`/clientes/:id`, tab **Detalles**) muestra el contacto del cliente
como **campos planos de un único valor** dentro de la card "Información del Cliente":
`client.email`, `client.commercial_email`, `client.phone_number`. Estos valores provienen del
flujo de onboarding (AIPrise) y representan la **identidad de registro** del cliente.

La necesidad operativa: Legal & Compliance precisa registrar **canales de contacto
adicionales** de un cliente (un teléfono de trabajo y uno personal, un email comercial además
del de registro, etc.) que el modelo de valor único no soporta. El export de Altas Legales
(`lex-clientes-export-altas-legales.md`) ya consume hoy un único `Mail` por cliente — síntoma
del modelo plano actual.

**Aclaración de scope fijada con HoP (2026-06-02):** el teléfono y email **de registro no se
tocan** en esta funcionalidad. Son la identidad del onboarding y permanecen como campos de
solo lectura. Lo que se agrega es una capa de **contacto adicional**, separada visualmente y
con su propio CRUD.

Esta es una funcionalidad acotada dentro del módulo **Clientes** (que está en producción y no
tiene discovery dedicado — su scope está cubierto en `lex-discovery.md` §4.2). Por eso este
discovery se nombra a nivel **funcionalidad** (`lex-clientes-[funcionalidad]-discovery.md`),
no a nivel módulo.

---

## Modelo de datos propuesto

Cada ítem de contacto (teléfono o email) tiene:

| Campo | Descripción |
|---|---|
| `value` | El valor en sí (número o dirección de email). |
| `label` | Etiqueta semántica. Teléfonos: Trabajo / Personal / Móvil / Otro. Emails: Trabajo / Personal / Comercial / Otro. |
| `primary` | Flag de contacto principal. **Uno solo por tipo** (un teléfono principal, un email principal). |

**Sin verificación en v1.** No existe hoy en LEX un flujo de verificación de contacto
(confirmación por OTP / link), y agregarlo sería inventar capacidad no pedida. Si más adelante
se necesita (preferencias de notificación, canales tipo WhatsApp/Telegram), se promueve a una
iteración o tab propia.

---

## Decisiones de diseño

### D-1 — Ubicación: sección dentro del tab Detalles (no tab nueva)

Se evaluaron dos opciones: (A) sección dentro del tab Detalles, debajo de "Información del
Cliente"; (B) tab nueva "Contacto" junto a Detalles / Documentos / Límites / Actividad.

**Elegida: A.** El contacto adicional es lectura/edición liviana; escanearlo junto a la info
del cliente es lo natural. No amerita una tab propia como sí ameritó Operatoria (REQ-53), que
trae data operativa pesada. Si la funcionalidad crece (verificación, preferencias de
notificación, más canales), se reevalúa promover a tab.

### D-2 — Separación visual registro vs. adicional

Los campos del onboarding (email/teléfono de registro) quedan en la card "Información del
Cliente" marcados con candado y la nota "de registro" — inmutables. El contacto adicional es
una **card/sección aparte** con su propio CRUD. Esto evita que Legal confunda la identidad del
onboarding con un canal agregado.

### D-3 — Migración de `commercial_email`

El campo plano `client.commercial_email` se **absorbe** en esta funcionalidad: en el alta del
legajo, si viene poblado, se siembra como un email con etiqueta "Comercial". El campo plano se
deja de mostrar en "Información del Cliente" y la fuente de verdad pasa a ser la lista de
contactos.

> Impacto en modelo de datos (Technology): backfill al desplegar — por cada legajo con
> `commercial_email` poblado, crear un email etiquetado "Comercial". El campo plano se deprecia.
> Esta decisión es de **qué** (Producto); el **cómo** del backfill es de Technology.

### D-4 — Validaciones

- Email: formato válido (RFC básico).
- Teléfono: formato normalizado, con código de país (E.164 como objetivo).
- No duplicar el mismo `value` dentro del mismo tipo.
- Exactamente un `primary` por tipo: marcar uno nuevo como principal desmarca el anterior.

Las validaciones se muestran inline en el modal de alta/edición, con el botón Guardar
deshabilitado mientras haya error.

### D-5 — Trazabilidad: eventos de sistema en el feed de Actividad (no tab nueva)

El tab **Actividad** (CaseActivity) ya combina comentarios libres + logs inmutables del sistema
(`CLIENT_APPROVED`, `CLIENT_MERGED`, `CLIENT_ASSIGNED`). Las operaciones de contacto se loguean
en ese mismo feed como una **nueva familia de eventos**:

- `CONTACT_ADDED` — "Agregó email (Comercial)"
- `CONTACT_UPDATED` — "Editó teléfono Principal (Trabajo)"
- `CONTACT_REMOVED` — "Eliminó email (Personal) · jperez.old@gmail.com"

Matices:

- **Qué se loguea:** tipo + etiqueta en alta/edición. En la **baja sí se preserva el valor crudo**,
  porque en auditoría saber *qué* canal se quitó tiene valor.
- **Precedente arquitectónico:** es el **primer caso** de un evento de sistema generado por la
  edición de un *sub-recurso* del legajo (hoy los logs son cambios de estado de alto nivel).
  Sienta patrón para futuras ediciones auditables (direcciones, dockets, etc.). Vale nombrarlo
  como decisión, no solo "loggear todo".
- **No tab nueva:** la trazabilidad vive en Actividad, que ya existe.

---

## Gates de validación (Design Framework §6)

| Gate | Estado | Nota |
|---|---|---|
| Legal / Compliance | ⏳ Pendiente | Validar con Juan Gonzalez: qué se audita, qué dato se preserva en la baja, si el contacto adicional tiene implicancias regulatorias (notificaciones a clientes, KYC). Es el gate **bloqueante** antes de cerrar el diseño — la funcionalidad toca trazabilidad de compliance. |
| Operativo | 🟡 Bajo | Funcionalidad de gestión interna, sin proceso operativo de fondos. |
| Contable | ✅ N/A | No hay evento económico. |

---

## Roles y permisos

Hereda el modelo de LEX (ver `lex-discovery.md` §6): edición gateada por `admin-lex` /
`commercial-lex`; `viewer-lex` solo lectura. Sin nuevos roles.

---

## Artefactos de soporte

| Artefacto | Ruta | Propósito |
|---|---|---|
| Wireframe HD interactivo | [`lex-clientes-informacion-contacto-wireframe.html`](./lex-clientes-informacion-contacto-wireframe.html) | HTML standalone que clona el design system de LEX (violeta `#1B1B64`, cards, bootstrap-icons). Tabs Detalles/Actividad funcionando, CRUD de contacto, modal con validaciones en vivo, flag Principal, `commercial_email` migrado, y feed de Actividad con eventos de trazabilidad. **No es el prototipo del producto** — es artefacto de validación de esta funcionalidad. |

---

## Preguntas abiertas

- **C-1 (Legal):** ¿el contacto adicional tiene implicancias regulatorias (uso para
  notificaciones formales, KYC)? ¿O es puramente operativo/comercial?
- **C-2 (Technology):** mecanismo del backfill de `commercial_email`; normalización canónica
  del teléfono.
- **C-3:** ¿conviene un tipo de contacto "Dirección" en la misma sección a futuro, o queda
  fuera? (Hoy `address` es un campo plano aparte.)

---

## Criterio de cierre

Este discovery concluye cuando:

1. El gate Legal/Compliance esté resuelto con Juan Gonzalez.
2. El feature spec (`features/lex/lex-clientes-informacion-contacto.md`) esté escrito y validado.
3. Se haya elevado el requerimiento formal a Jira (proyecto REQ) para handoff a Technology.

Mientras tanto permanece `En investigación`.
