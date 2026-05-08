---
aplicacion: COMMON
status: Definida
owner: Santino Domeniconi
created_at: 2026-05-05
updated_at: 2026-05-08
req: REQ-67
discovery: ventanas-de-mantenimiento-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN, COM]
---

# Ventanas de Mantenimiento — Comunicación proactiva in-app

## Propósito

Comunicar a los usuarios del financial-core la existencia de ventanas de mantenimiento planificadas — antes de que ocurran y durante su ejecución — de manera granular por componente, sin generar ansiedad operativa ni pérdida de confianza por falta de información.

---

## Estados del banner

### Banner amarillo — aviso previo

Se activa antes del inicio de la ventana. Producto recomienda un mínimo de 48 horas de anticipación; IT define el mecanismo y los tiempos reales.

Aparece únicamente en la vista del componente afectado. Si el mantenimiento afecta toda la web, aparece en todas las aplicaciones del financial-core.

Copy por defecto:
> "El [nombre del componente] estará en mantenimiento el [fecha] de [hora inicio] a [hora fin]. Durante ese periodo [podrás / no podrás] operar con normalidad. Disculpa las molestias."

### Banner rojo — mantenimiento activo

Se activa al inicio de la ventana. Reemplaza al banner amarillo. Permanece hasta que IT lo levante según los criterios de operación óptima definidos por componente.

Copy por defecto:
> "El [nombre del componente] se encuentra en mantenimiento en este momento. Estamos trabajando para restablecer el servicio. Disculpa las molestias."

### Estado minimizado

Cuando el usuario minimiza el banner, se reduce al 50% mostrando únicamente:
> "Mantenimiento en curso · Ver detalle"

Un click expande el banner a su estado completo.

---

## Decisiones clave

| # | Decisión | Valor |
|---|---|---|
| 1 | Alcance | Solo ventanas planificadas informadas por IT |
| 2 | Canal | Banner in-app (web) únicamente |
| 3 | Granularidad | Por componente — el banner aparece solo en la vista afectada |
| 4 | Audiencia | Todos los usuarios ven el mismo mensaje (sin segmentación por rol en v1) |
| 5 | Persistencia | No se puede cerrar. Minimizable al 50% (recomendación Producto, IT decide) |
| 6 | Operabilidad | Producto define caso a caso si el usuario puede seguir operando |
| 7 | Múltiples mantenimientos | Un banner por componente, solo en su propia vista |
| 8 | Colores | Amarillo = aviso previo · Rojo = activo · Naranja reservado para Release Awareness (REQ-66) |
| 9 | Wording configurable | Out of scope v1 — evolución v2 (REQ-66) |
| 10 | Base técnica | Patrón `ardua-add-alert-banner` del `core-template-frontend` |

---

## Fuera de alcance (v1)

- Caídas no planificadas o mantenimientos de emergencia
- Notificaciones por email, push u otros canales externos
- Segmentación de mensajes por rol de usuario
- Portal de wording configurable sin deploy (v2)

---

## Criterios de aceptación

- Cuando IT activa el banner amarillo para un componente específico, el banner aparece únicamente en la vista de ese componente con el copy del template por defecto, sin afectar ninguna otra vista del financial-core.
- Cuando comienza la ventana de mantenimiento, el banner amarillo es reemplazado automáticamente por el banner rojo.
- El banner rojo permanece visible hasta que IT lo levante — el usuario no puede cerrarlo.
- Si dos componentes están en mantenimiento simultáneamente, cada vista afectada muestra su propio banner sin propagación cruzada entre vistas.
- El naranja no se usa en ningún estado de este banner — está reservado para Release Awareness (REQ-66).

---

## Referencias

- Discovery: `discoveries/ventanas-de-mantenimiento-discovery.md`
- REQ: REQ-67
- Discovery técnico base: `discoveries/core-template-frontend-discovery.md`
- Feature relacionada: Release Awareness (REQ-66)
