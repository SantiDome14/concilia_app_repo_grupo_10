---
aplicacion: COMMON
status: Definida
owner: Santino Domeniconi
created_at: 2026-05-05
updated_at: 2026-05-08
req: REQ-66
discovery: release-awareness-discovery.md
productos_afectados: [TRD, OPS, LEX, CLP, FIN]
---

# Release Awareness — Notificación de nueva versión disponible

## Propósito

Comunicar a los usuarios logueados del financial-core cuando IT despliega una nueva versión en producción, guiándolos a completar el re-login necesario para que las nuevas funcionalidades operen correctamente. Elimina la confusión causada por sesiones desactualizadas, reduce los falsos reportes de bugs y acelera la adopción de nuevas funcionalidades.

---

## Componentes

### 1. Banner naranja (top bar)

Aparece en todas las apps del financial-core donde aplica el release, en la primera navegación post-deploy. Permanece visible hasta que el usuario complete el re-login exitoso. No puede cerrarse.

IT activa el banner manualmente via flag o variable de entorno, sin necesidad de un nuevo deploy. El wording es hardcoded en el código en v1.

**Copy — una funcionalidad:**
> "[App] tiene una novedad: [nombre funcionalidad]. Actualizá tu sesión para activarla."
> CTA: **Ver novedad**

**Copy — múltiples funcionalidades:**
> "[App] tiene [N] novedades disponibles. Actualizá tu sesión para activarlas."
> CTA: **Ver novedades**

Click en el CTA → logout inmediato, sin confirmación previa.

### 2. Modal post-login — Novedades del release

Aparece automáticamente al completar el login exitoso, si el usuario no vio las novedades del release actual para esa app.

- Título: `"Novedades de [App]"`
- Si hay más de una funcionalidad: carrusel navegable con título + descripción corta por slide
- Botón de cierre: **Entendido**
- Se muestra una única vez por usuario, por release, por app — una vez cerrado, no vuelve a aparecer
- El wording es hardcoded en el código en v1; la coordinación con Producto para el wording queda para v2

---

## Flujo del usuario

1. IT activa el flag post-deploy → banner naranja aparece en el top bar en todas las apps afectadas
2. Usuario navega → ve el banner, no puede cerrarlo
3. Click en el CTA → logout inmediato, sin confirmación previa
4. Login exitoso → modal con novedades de la app desde donde se inició el ciclo
5. Click en "Entendido" → banner y modal no vuelven a aparecer para ese usuario en ese release en esa app

---

## Decisiones clave

| # | Decisión | Valor |
|---|---|---|
| 1 | Canal | Banner in-app (top bar) + modal post-login |
| 2 | Color del banner | Naranja — exclusivo de Release Awareness (amarillo/rojo reservados para Ventanas de Mantenimiento) |
| 3 | Persistencia del banner | No puede cerrarse — solo desaparece tras re-login exitoso |
| 4 | Activación | IT activa manualmente via flag o variable de entorno, sin nuevo deploy |
| 5 | Wording v1 | Hardcoded en el código — cualquier cambio de texto requiere deploy |
| 6 | Alcance del modal | Por app — muestra solo novedades de la app desde donde se hizo logout |
| 7 | Carrusel | Activado cuando hay más de una funcionalidad en el release |
| 8 | Estado persistido | Por usuario / por release / por app |
| 9 | Logout | Inmediato al hacer click en CTA — sin confirmación adicional |
| 10 | Mecanismo de detección de versión | Out of scope v1 — definido e implementado por IT (WebSocket, polling, flag, u otro) |

---

## Casos borde

- Si el usuario no hace click en el banner → el banner sigue visible en todas las sesiones hasta completar el re-login
- Si el release aplica a múltiples apps → cada app muestra su propio banner; el usuario debe completar el ciclo por cada app
- Si el usuario hace logout por su cuenta (sin el banner) y vuelve a loguearse → ve el modal igual, porque el release sigue pendiente para ese usuario
- El estado "re-login completado" se persiste por usuario, por release, por app

---

## Fuera de alcance (v1)

- Panel de administración para configurar releases sin deploy — evolución v2, servicio transversal reutilizable por todas las apps
- Notificaciones push o email sobre nuevas versiones
- Detección automática de versión desde el build
- Versionado semántico visible para el usuario final
- Historial de releases accesible desde la app
- Diferenciación del contenido del modal por rol de usuario
- Coordinación con Producto para el wording del modal (v2)

---

## Criterios de aceptación

- Cuando IT activa el flag post-deploy, el banner naranja aparece en el top bar en todas las apps del financial-core para todos los usuarios logueados con versión desactualizada.
- El banner permanece visible mientras el usuario tenga una sesión activa con una versión desactualizada. No puede cerrarse sin hacer logout.
- Al hacer click en el CTA del banner, el sistema ejecuta el logout inmediatamente y redirige al usuario al login.
- Al completar el login exitoso, si el usuario no vio las novedades del release actual para esa app, el sistema muestra el modal de novedades.
- El modal se muestra una única vez por usuario, por release, por app. Una vez cerrado, no vuelve a aparecer.
- Si el usuario ya está en la versión más reciente al loguearse, el modal no se muestra.

---

## Referencias

- Discovery: `discoveries/release-awareness-discovery.md`
- REQ: REQ-66
- Feature relacionada: Ventanas de Mantenimiento (`ventanas-de-mantenimiento.md`) — el naranja de este banner no puede usarse en ventanas de mantenimiento
