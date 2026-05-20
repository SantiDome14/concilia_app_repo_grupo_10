---
name: LEX — Visibilidad de quotes del rulo en el detalle de cliente
features: [LEX]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-05-20
updated_at: 2026-05-20
propagates_to:
  - features/lex/README.md
---

# LEX — Visibilidad de quotes del rulo en el detalle de cliente

## Objetivo

Determinar cómo exponer en LEX el historial de quotes del rulo que ya existe en TRD, de forma que el equipo de Legal & Compliance pueda gestionar la reasignación de límites de clientes del rulo sin depender del Excel de Mesa DB ni de los chats de WhatsApp.

## Contexto

El área de Legal & Compliance (Camila Cattaneo) necesita acceder al historial de quotes generados por los clientes del rulo para decidir si corresponde reasignar el límite operativo de cada cliente. Hoy esa información se obtiene del Excel de Mesa DB, que está próximo a ser discontinuado. Sin él, la única fuente disponible sería leer manualmente los chats de WhatsApp, lo que no escala ni permite trazabilidad.

Confirmado con Santiago Ahmed (2026-05-20): los quotes del rulo ya están capturados en TRD. El problema no es de captura de datos sino de visibilidad: Legal no tiene acceso a esa información desde LEX, que es la aplicación donde trabaja y donde gestiona los límites del cliente.

El requerimiento fue iniciado por Camila vía Slack (REQ-82). Se publicaron 6 preguntas de clarificación en el hilo el 2026-05-15.

Se prepararon dos prototipos HTML para validar con Camila en persona:
- `Rulo_A_-_Totalizadores.html` — vista con métricas agregadas (operaciones, vol. fiat, vol. crypto, última operación) y breakdown por tipo de trade.
- `Rulo_B_-_Historial_de_quotes.html` — vista con tabla transaccional quote a quote con los campos requeridos por Legal.

**Validación presencial con Camila Cattaneo (Legal & Compliance) — 2026-05-20:**
- Ganó el prototipo B (tabla transaccional). La vista de totalizadores fue descartada.
- Se incorporaron tres ajustes al scope: (1) columna "Número de TC" adicional a "Tipo de TC"; (2) total de monto fiat como footer de tabla con selector de rango libre; (3) dockets de comitente como badges (AS en violeta, CIR en azul).
- Criterio de identificación de cliente del rulo resuelto por decisión de producto: la sección aparece para todo cliente que tenga al menos un límite configurado en LEX.

---

## Decisiones tomadas

### D-01 — El problema es de visibilidad, no de captura

Los quotes del rulo ya existen en TRD. No es necesario construir una capa de captura. La solución es un puente de visibilidad: exponer esos datos en LEX.

**Fuente:** confirmación de Santiago Ahmed (2026-05-20).

### D-02 — La solución sigue el patrón del REQ-53 (Tab Operatoria)

En lugar de darle a Legal acceso directo a TRD, los datos se traen al detalle del cliente en LEX — en el contexto donde Legal ya está operando. Mismo patrón que REQ-53 resolvió para datos de OPS/Haz Pagos.

**Fuente:** sesión de enriquecimiento REQ-82 (2026-05-20).

### D-03 — Los quotes del rulo viven en una sección "Rulo" dentro de la tab Operatoria

La tab Operatoria (REQ-53) es la superficie correcta para centralizar la operatoria del cliente en LEX. Los quotes del rulo son una sección adicional dentro de esa tab, con TRD como fuente de datos. El tab Límites queda exclusivamente para la gestión de topes operativos.

**Fuente:** sesión de enriquecimiento REQ-82 (2026-05-20).

### D-04 — CTA "Ver detalle completo en TRD" al pie de la sección

Mismo patrón que el CTA "Ver movimientos completos en OPS" del REQ-53. LEX muestra el dato contextual; TRD es la fuente de detalle completo.

### D-05 — Patrones de UX heredados del prototipo del REQ-53 (Yasmani Rodriguez)

Al revisar el prototipo `lex_operatoria_prototype.html` (REQ-53), se identificaron cuatro patrones funcionales que aplican igual a la sección Rulo:

- **Skeleton loader** — shimmer animado en la tabla mientras se cargan los datos.
- **Nota de contexto** — banner informativo sutil: _"Para ver los límites configurados de este cliente, consultá la tab Límites."_
- **Tooltip en columnas numéricas** — al hover sobre valores numéricos se muestra el detalle.
- **CTA al pie como botón funcional** — con feedback visual al hacer click.

**Fuente:** revisión del prototipo `lex_operatoria_prototype.html` (REQ-53 · Yasmani Rodriguez) · sesión 2026-05-20.

### D-06 — Prototipo B elegido como base. Vista de totalizadores descartada

En validación presencial con Camila (2026-05-20), la vista B (tabla transaccional quote a quote) fue elegida como base de la solución. La vista A (totalizadores) fue descartada para v1.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-07 — Tabla con 9 columnas provenientes de TRD

| Columna | Descripción |
|---|---|
| Fecha | Fecha del quote |
| Tipo de trade | Compra / Venta |
| Tipo de TC | MEP / CCL |
| Número de TC | Número del tipo de cambio aplicado por Mesa al cerrar la operación |
| Moneda fiat | Moneda fiat de la operación |
| Monto fiat | Monto en moneda fiat |
| Tipo de crypto | Tipo de criptomoneda |
| Monto crypto | Monto en criptomoneda |
| Comitente | Docket del cliente como badge (AS en violeta / CIR en azul) |

"Tipo de TC" y "Número de TC" son dos columnas separadas — ambas provenientes de TRD.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-08 — Footer de totales y selector de rango libre

Al pie de la tabla se muestra el total acumulado de Monto fiat para el período seleccionado. El filtro de período es un selector de rango libre (fecha desde / fecha hasta), no pills fijas — porque el período de análisis varía según el caso de reasignación.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-09 — Dockets de comitente como badges

La columna Comitente muestra el docket con el mismo estilo visual que el listado de clientes de LEX: AS en violeta, CIR en azul.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-10 — Criterio de identificación de cliente del rulo: presencia de límites en LEX

La sección "Rulo" aparece en la tab Operatoria únicamente para clientes que tienen al menos un límite configurado en LEX. No requiere flag externo ni consulta a TRD — la condición vive completamente en LEX.

**Fuente:** decisión de producto · Santino Domeniconi (2026-05-20).

---

## Hipótesis abiertas

_Ninguna. Todas las hipótesis fueron resueltas al 2026-05-20._

---

## Prototipos

| Archivo | Descripción | Estado |
|---|---|---|
| `Rulo_A_-_Totalizadores.html` | Vista con métricas agregadas y breakdown por tipo de trade | Descartada en validación con Camila (2026-05-20) |
| `Rulo_B_-_Historial_de_quotes.html` | Vista con tabla transaccional quote a quote (9 columnas) | Base de la solución — aprobada por Camila (2026-05-20) |

Ambos prototipos están en la rama `feat/lex-rulo-quotes-operatoria-rulo`.

---

## Dependencias

- **REQ-53 (Tab Operatoria):** la sección "Rulo" vive dentro de la tab Operatoria. REQ-53 está en `SENT TO DEV`. Si REQ-53 no está desplegado cuando este REQ avance, se evalúa si la sección puede lanzarse de forma independiente o debe esperar.
- **TRD:** fuente de todos los campos de la tabla. Pendiente mapear qué endpoint/servicio de TRD expone los quotes del rulo con los 9 campos requeridos.

---

## Relación con otras iniciativas

- **REQ-82** — ticket de Jira que origina este discovery.
- **REQ-53** — Tab Operatoria en detalle de cliente (patrón de referencia y superficie de destino). Prototipo de referencia: `lex_operatoria_prototype.html`.
- **lex-limites-discovery.md** — módulo Límites, donde Camila gestiona los topes que este REQ busca informar.
- **trd-discovery.md** — aplicación TRD, fuente de los quotes del rulo.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-05-20 | Creación del discovery a partir del enriquecimiento de REQ-82. Decisiones D-01 a D-04 cerradas. Hipótesis H-01 a H-03 abiertas. |
| 2026-05-20 | D-05 y D-06 agregadas con patrones UX del prototipo REQ-53. Prototipos A y B preparados para validación con Camila. |
| 2026-05-20 | Validación presencial con Camila completada. D-06 a D-09 cerradas. Prototipo B elegido. 9 columnas definidas. Footer y selector de rango libre confirmados. Dockets como badges confirmados. |
| 2026-05-20 | D-10 cerrada: criterio de identificación de cliente del rulo resuelto por decisión de producto (presencia de límites en LEX). Discovery concluido. Status → Concluida. |
