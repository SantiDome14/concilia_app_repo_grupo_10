---
name: Release Awareness — banner y modal de nuevas funcionalidades
features: [TRD, OPS, LEX, CLP, FIN]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-05-05
updated_at: 2026-05-05
---

# Release Awareness — banner y modal de nuevas funcionalidades

## Objetivo
Definir el mecanismo por el cual los usuarios logueados del financial core son informados cuando IT despliega una nueva versión en producción, y son guiados a completar el re-login necesario para que las nuevas funcionalidades funcionen correctamente.

## Contexto
Cuando IT despliega una nueva versión en producción, los usuarios logueados no reciben ninguna señal de que algo cambió. Para que las nuevas funcionalidades funcionen, el usuario debe hacer logout y volver a loguearse — algo que hoy no se comunica. El resultado es confusión, falsos reportes de bugs y adopción lenta de funcionalidades nuevas. Este problema afecta a todas las apps actuales del financial core (TRD, OPS, LEX, CLP, FIN).

## Solución definida — V1

### Componentes

**Banner naranja (top bar)**
- Aparece al navegar por primera vez post-deploy en todas las apps donde aplica el release
- No tiene botón de cierre — permanece visible hasta que el usuario complete el re-login exitoso
- IT lo activa manualmente mediante un flag o variable de entorno, sin necesidad de un nuevo deploy
- El wording es hardcoded en el código; cualquier cambio de texto requiere un deploy de IT

**Textos del banner**
- Una funcionalidad: `"[App] tiene una novedad: [nombre funcionalidad]. Actualizá tu sesión para activarla."` → CTA: **Ver novedad**
- Múltiples funcionalidades: `"[App] tiene [N] novedades disponibles. Actualizá tu sesión para activarlas."` → CTA: **Ver novedades**

**Modal post-login**
- Aparece automáticamente tras el login exitoso
- Título: `"Novedades de [App]"`
- Si hay más de una funcionalidad, presenta un carrusel navegable — título + descripción corta por slide
- Botón de cierre: **Entendido**
- El wording es hardcoded en el código

### Flujo del usuario

1. IT activa el flag post-deploy → banner naranja aparece en el top bar
2. Usuario navega → ve el banner, no puede cerrarlo
3. Click en el CTA → logout inmediato, sin confirmación previa
4. Login exitoso → modal con novedades de la app desde donde se hizo logout
5. Click en "Entendido" → banner y modal no vuelven a aparecer para ese usuario en ese release en esa app

### Casos borde

- Si el usuario no hace click en el banner → el banner sigue visible en todas las sesiones hasta completar el re-login
- Si el release aplica a múltiples apps → cada app muestra su propio banner; el usuario debe completar el ciclo por cada app
- Si el usuario hace logout por su cuenta (sin el banner) y vuelve a loguearse → ve el modal igual, porque el release sigue pendiente para ese usuario
- El estado "re-login completado" se persiste por usuario, por release, por app

## Alcance V1

**Incluido:**
- Banner naranja en el top bar (hardcoded, activado por IT via flag o variable de entorno)
- Modal post-login con carrusel de novedades (hardcoded)
- Persistencia del estado por usuario / release / app

**Excluido — queda para V2:**
- Panel de administración para configurar releases sin deploy — se plantea como servicio transversal reutilizable por todas las apps del financial core
- Notificaciones push o email sobre nuevas versiones
- Detección automática de versión desde el build
- Versionado semántico visible para el usuario final
- Historial de releases accesible desde la app

## Punto abierto

El mecanismo exacto de activación del banner (flag, variable de entorno, feature toggle, u otro) está pendiente de alineación con IT antes de que el requerimiento entre a ejecución.

## Requerimiento derivado

Requerimiento formal documentado y derivado al canal `#req-product-management` el 2026-05-05. Miles tramita la creación del ticket en Jira.
