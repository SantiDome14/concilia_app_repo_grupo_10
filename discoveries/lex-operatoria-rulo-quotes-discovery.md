---
name: LEX — Visibilidad de quotes del rulo en el detalle de cliente
features: [LEX]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-05-20
updated_at: 2026-06-03
propagates_to:
  - features/lex/README.md
  - features/lex/lex-operatoria-quotes.md
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

**Iteración post-validación — 2026-05-21:**
- Camila confirmó que necesita dos modos de filtro: rango libre para consultas operativas y rango por meses para informes a entidades reguladoras (ej. bancos).
- La moneda fiat puede ser ARS o USD — no exclusivamente ARS como se asumía en v1.
- Se incorporaron dos funcionalidades de selección de filas: total de Monto fiat y promedio de TC, con chips independientes anclados al footer.
- El título de la sección cambia de "Rulo" a "Quotes".
- El wireframe fue actualizado por Design para reflejar todos los cambios. Wireframe vigente: `LEX_-_Operatoria_Rulo.html` (versión actualizada en `prototypes/lex/wireframes/`).

---

## Decisiones tomadas

### D-01 — El problema es de visibilidad, no de captura

Los quotes del rulo ya existen en TRD. No es necesario construir una capa de captura. La solución es un puente de visibilidad: exponer esos datos en LEX.

**Fuente:** confirmación de Santiago Ahmed (2026-05-20).

### D-02 — La solución sigue el patrón del REQ-53 (Tab Operatoria)

En lugar de darle a Legal acceso directo a TRD, los datos se traen al detalle del cliente en LEX — en el contexto donde Legal ya está operando. Mismo patrón que REQ-53 resolvió para datos de OPS/Haz Pagos.

**Fuente:** sesión de enriquecimiento REQ-82 (2026-05-20).

### D-03 — Los quotes del rulo viven en una sección "Quotes" dentro de la tab Operatoria

La tab Operatoria (REQ-53) es la superficie correcta para centralizar la operatoria del cliente en LEX. Los quotes del rulo son una sección adicional dentro de esa tab, con TRD como fuente de datos. El tab Límites queda exclusivamente para la gestión de topes operativos.

Nombre de la sección: "Quotes" (renombrado desde "Rulo" en iteración 2026-05-21).
Descripción de la sección: _"Quotes del rulo registradas en TRD para este cliente, agrupadas según fecha de trade."_

**Fuente:** sesión de enriquecimiento REQ-82 (2026-05-20 y 2026-05-21).

### D-04 — CTA "Ver detalle completo en TRD" al pie de la sección

Mismo patrón que el CTA "Ver movimientos completos en OPS" del REQ-53. LEX muestra el dato contextual; TRD es la fuente de detalle completo.

### D-05 — Patrones de UX heredados del prototipo del REQ-53 (Yasmani Rodriguez)

Al revisar el prototipo `lex_operatoria_prototype.html` (REQ-53), se identificaron cuatro patrones funcionales que aplican igual a la sección Quotes:

- **Skeleton loader** — shimmer animado en la tabla mientras se cargan los datos. Las barras de loading reflejan el ancho y tipo de cada celda (pill, número, docket, checkbox).
- **Nota de contexto** — banner informativo sutil: _"Para ver los límites configurados de este cliente, consultá la tab Límites."_
- **Tooltip en columnas numéricas** — al hover sobre valores numéricos se muestra el detalle.
- **CTA al pie como botón funcional** — con feedback visual al hacer click.

**Fuente:** revisión del prototipo `lex_operatoria_prototype.html` (REQ-53 · Yasmani Rodriguez) · sesión 2026-05-20.

### D-06 — Prototipo B elegido como base. Vista de totalizadores descartada

En validación presencial con Camila (2026-05-20), la vista B (tabla transaccional quote a quote) fue elegida como base de la solución. La vista A (totalizadores) fue descartada para v1.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-07 — Tabla con 6 columnas de datos y 2 columnas de selección intercaladas

| # | Columna | Tipo | Descripción |
|---|---|---|---|
| 1 | Fecha | Dato | Fecha y hora del quote |
| 2 | Tipo de trade | Dato | BUY / SELL |
| 3 | Valor del TC | Dato | Valor numérico del tipo de cambio aplicado por Mesa al cerrar la operación |
| 4 | Promediar TC | Selección | Checkbox por fila — sin master checkbox en el header |
| 5 | Monto fiat | Dato | Monto con moneda como prefijo inline (ej. `ARS 42.518.400,00`, `USD 12.500,00`). Formato `###.###.###,##` |
| 6 | Total Fiat | Selección | Checkbox por fila — con master checkbox en el header |
| 7 | Monto crypto | Dato | Monto con tipo de crypto como prefijo inline (ej. `USDC 36.420,00`). Moneda en gris, monto alineado a la derecha. Formato `###.###.###,##` |
| 8 | Comitente | Dato | Docket del cliente como badge (AS en violeta / CIR en azul) |

**Nota:** la columna "Tipo de TC" (MEP / CCL) fue eliminada en iteración 2026-06-03. Ardua opera un único tipo de TC — la distinción MEP/CCL no es aplicable. Confirmación: Santiago Ahmed (2026-06-03).

La columna `Promediar TC` está ubicada inmediatamente a la derecha de `Valor del TC`. La columna `Total Fiat` está ubicada inmediatamente a la derecha de `Monto fiat`.

**Cambio respecto a v1 (2026-05-21):** la moneda fiat puede ser ARS o USD — el rulo no opera exclusivamente en ARS como se asumía. La columna Monto fiat muestra la moneda como prefijo inline.

**Fuente:** validación presencial (2026-05-20) + iteración con Camila (2026-05-21).

### D-08 — Dos modos de filtro que coexisten con exclusión mutua

**Fila 1 — Filtro por período (meses):** dos dropdowns `Mes desde` y `Mes hasta` para filtrar por rango de meses completos. Uso principal: confección de informes a entidades reguladoras (ej. bancos). Si Mes hasta es anterior a Mes desde, los valores se intercambian automáticamente.

**Fila 2 — Filtro por fecha exacta:** date picker libre `Desde` / `Hasta` para consultas operativas con rango arbitrario.

**Exclusión mutua:** activar un filtro limpia el otro. Botón `Limpiar filtros` (estilo ghost) aparece solo cuando hay algún filtro activo y resetea ambos.

**Cambio respecto a v1 (2026-05-21):** v1 tenía solo el filtro por fecha exacta. El filtro por meses se incorpora a pedido de Camila para casos de informes regulatorios.

**Fuente:** iteración con Camila Cattaneo (2026-05-21).

### D-09 — Dockets de comitente como badges

La columna Comitente muestra el docket con el mismo estilo visual que el listado de clientes de LEX: AS en violeta, CIR en azul.

**Fuente:** validación presencial con Camila Cattaneo (2026-05-20).

### D-10 — Criterio de identificación de cliente del rulo: presencia de límites en LEX

La sección "Quotes" aparece en la tab Operatoria únicamente para clientes que tienen al menos un límite configurado en LEX. No requiere flag externo ni consulta a TRD — la condición vive completamente en LEX.

**Fuente:** decisión de producto · Santino Domeniconi (2026-05-20).

### D-11 — Cálculos por selección de filas: Total Fiat y Promedio de TC

Dos cálculos independientes activados por selección de filas mediante columnas de checkbox dedicadas. Cada columna tiene su propia selección — son completamente independientes entre sí. La fila seleccionada se resalta con un tinte teal sutil.

**Total de Monto fiat (`Total Fiat`):** suma del Monto fiat de las filas seleccionadas. Chip en footer: `Total Monto fiat (N filas): ARS 248.440.400,00 ✕`. Master checkbox en el header para seleccionar/deseleccionar todas las filas visibles — soporta estado indeterminado.

**Promedio de TC (`Promediar TC`):** promedio aritmético del Valor del TC de las filas seleccionadas. Chip en footer: `TC promedio (N filas): 1.245,32 ✕`. Sin master checkbox — selección fila por fila.

**Advertencia por días distintos:** si las filas seleccionadas en `Promediar TC` pertenecen a distintas fechas, el chip muestra inline `⚠ Días distintos` en color ámbar. No bloquea el cálculo — es informativo.

**Anclaje de chips:** los chips están anclados al pie de su columna de selección correspondiente — TC promedio debajo de `Promediar TC`, Total Monto fiat debajo de `Total Fiat`. Si se solapan visualmente, TC promedio queda encima (z-index mayor). El footer no tiene header de totales — muestra únicamente los chips activos.

**Fuente:** iteración con Camila Cattaneo (2026-05-21).

---

## Hipótesis abiertas

- **Gestión documental:** Legal gestiona la documentación de cada cliente (SWIFT, facturas, comprobantes) en carpetas locales organizadas por quote. La hipótesis de llevar esa gestión al detalle de cliente en LEX está capturada en [`lex-operatoria-documentacion-discovery.md`](./lex-operatoria-documentacion-discovery.md) (estado: En investigación).

---

## Prototipos

| Archivo | Descripción | Estado |
|---|---|---|
| `Rulo_A_-_Totalizadores.html` | Vista con métricas agregadas y breakdown por tipo de trade | Descartada en validación con Camila (2026-05-20) |
| `Rulo_B_-_Historial_de_quotes.html` | Vista con tabla transaccional quote a quote (base de la solución) | Aprobada por Camila (2026-05-20) |
| `LEX_-_Operatoria_Rulo.html` | Wireframe vigente — incorpora todos los cambios de la iteración 2026-05-21. Disponible en `prototypes/lex/wireframes/` | Pendiente actualización por Design |

---

## Dependencias

- **REQ-53 (Tab Operatoria):** la sección "Quotes" vive dentro de la tab Operatoria. REQ-53 está en `SENT TO DEV`. Si REQ-53 no está desplegado cuando este REQ avance, se evalúa si la sección puede lanzarse de forma independiente o debe esperar.
- **TRD:** fuente de todos los campos de la tabla. Pendiente mapear qué endpoint/servicio de TRD expone los quotes del rulo con los 7 campos requeridos.

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
| 2026-05-20 | Creación del discovery a partir del enriquecimiento de REQ-82. Decisiones D-01 a D-04 cerradas. |
| 2026-05-20 | D-05 y D-06 agregadas con patrones UX del prototipo REQ-53. Prototipos A y B preparados para validación con Camila. |
| 2026-05-20 | Validación presencial con Camila completada. D-06 a D-09 cerradas. Prototipo B elegido. 7 columnas definidas. Footer y selector de rango libre confirmados. Dockets como badges confirmados. |
| 2026-05-20 | D-10 cerrada: criterio de identificación de cliente del rulo resuelto por decisión de producto (presencia de límites en LEX). Discovery concluido. Status → Concluida. |
| 2026-05-20 | Columna renombrada de "Número de TC" a "Valor del TC". Wireframe final `LEX_-_Operatoria_Rulo.html` generado y aprobado. Disponible en `prototypes/lex/wireframes/`. |
| 2026-05-20 | Tabla reducida a 7 columnas: "Moneda fiat" eliminada (rulo opera solo en ARS → renombrada a "Monto fiat (ARS)"). "Tipo de crypto" eliminada e integrada como prefijo inline en "Monto crypto". |
| 2026-05-21 | Iteración con Camila: moneda fiat puede ser ARS o USD (no solo ARS). Dos modos de filtro incorporados (por meses y por fecha exacta con exclusión mutua). D-11 cerrada: cálculos por selección de filas (Total Fiat y Promedio de TC con chips independientes en footer). Sección renombrada de "Rulo" a "Quotes". REQ-82 actualizado en Jira. |
| 2026-06-03 | Hipótesis de gestión documental identificada a partir de observación directa con Camila (carpetas locales por quote). Capturada en `lex-operatoria-documentacion-discovery.md`. |
| 2026-06-03 | Columna "Tipo de TC" eliminada de D-07 y del feature file: Ardua opera un único tipo de TC, la distinción MEP/CCL no aplica. Confirmación: Santiago Ahmed (2026-06-03). Tickets PWI-53 y EWI-125 actualizados. |