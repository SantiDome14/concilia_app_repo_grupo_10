# LEX — Información de Contacto del Legajo

> Módulo: Clientes
> Estado: En definición (discovery activo · sin REQ aún)
> Última actualización: 2026-06-02

---

## Qué hace esta funcionalidad

Permite a Legal & Compliance gestionar **información de contacto adicional** de un cliente
dentro de su legajo — múltiples teléfonos y múltiples emails, cada uno con etiqueta y un flag
de principal — más allá del teléfono y email únicos de registro del onboarding.

El contacto de registro (`email`, `phone_number` del onboarding) **no se modifica** desde acá:
es la identidad del cliente y permanece de solo lectura.

---

## Acceso

| Punto | Ubicación | Comportamiento |
|---|---|---|
| Detalle de cliente | Sección "Información de Contacto" dentro del tab **Detalles**, debajo de "Información del Cliente" | CRUD de teléfonos y emails adicionales |

Roles habilitados para editar: `admin-lex`, `commercial-lex`. `viewer-lex`: solo lectura.

---

## Modelo de datos

Cada ítem de contacto (teléfono o email):

| Campo | Descripción |
|---|---|
| `value` | Número o dirección de email. |
| `label` | Teléfonos: Trabajo / Personal / Móvil / Otro. Emails: Trabajo / Personal / Comercial / Otro. |
| `primary` | Contacto principal. Exactamente uno por tipo. |

Sin verificación de contacto en v1.

---

## Flujo principal

```
Sección "Información de Contacto" (tab Detalles)
  → [Agregar teléfono] / [Agregar email] → Modal (valor + etiqueta + flag principal)
    → Validación inline → [Guardar] → ítem en la lista + evento en tab Actividad
  → [Editar] sobre un ítem → mismo modal precargado
  → [Eliminar] → confirmación → ítem fuera de la lista + evento en tab Actividad
```

---

## Reglas de negocio

- El email/teléfono de registro del onboarding no se edita desde esta sección (solo lectura, marcado "de registro").
- `commercial_email` se migra a esta funcionalidad como un email etiquetado "Comercial"; el campo plano se deprecia.
- Validación de email: formato válido (RFC básico).
- Validación de teléfono: formato normalizado con código de país (E.164 objetivo).
- No se permite duplicar el mismo valor dentro del mismo tipo.
- Un solo contacto principal por tipo: marcar uno nuevo desmarca el anterior.
- Alta / edición / baja de un contacto generan un evento de sistema en el tab Actividad.

---

## Trazabilidad

Las operaciones se registran en el feed del tab **Actividad** (CaseActivity) como una nueva
familia de eventos de sistema:

| Evento | Texto en el feed | Dato registrado |
|---|---|---|
| `CONTACT_ADDED` | "Agregó email (Comercial)" | tipo + etiqueta |
| `CONTACT_UPDATED` | "Editó teléfono Principal (Trabajo)" | tipo + etiqueta |
| `CONTACT_REMOVED` | "Eliminó email (Personal) · jperez.old@gmail.com" | tipo + etiqueta + **valor crudo** |

En la baja se preserva el valor crudo por su valor de auditoría.

---

## Restricciones (fuera de scope v1)

- Verificación de contacto (OTP / confirmación por link).
- Preferencias de notificación por canal.
- Canales adicionales (WhatsApp, Telegram).
- Gestión de dirección postal dentro de esta sección (sigue siendo el campo `address` aparte).
- Promoción a tab dedicada (se reevalúa si la funcionalidad crece).

---

## Artefactos de referencia

| Artefacto | Ruta / Referencia |
|---|---|
| Wireframe HD interactivo | `discoveries/lex-clientes-informacion-contacto-wireframe.html` |
| Discovery | `discoveries/lex-clientes-informacion-contacto-discovery.md` |
| Ticket Jira | _Pendiente — a crear cuando cierre el gate Legal_ |

---

## Pendientes antes de handoff

- Gate Legal/Compliance con Juan Gonzalez (bloqueante).
- Definición técnica con Technology: backfill de `commercial_email`, normalización del teléfono, nueva familia de eventos `CONTACT_*`.
- Creación del REQ formal en Jira.
