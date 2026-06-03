---
name: LEX — Gestión documental de clientes en el detalle de cliente
features: [LEX]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-03
updated_at: 2026-06-03
propagates_to: []
---

# LEX — Gestión documental de clientes en el detalle de cliente

## Objetivo

Determinar si conviene y cómo implementar en LEX la carga, organización y consulta de documentación asociada a los clientes (y eventualmente a sus quotes), de forma que Legal & Compliance pueda reemplazar las carpetas locales en sus PCs por una superficie centralizada con trazabilidad.

## Contexto

El equipo de Legal & Compliance (Camila Cattaneo) gestiona la documentación de cada cliente en carpetas locales en sus PCs, organizadas por quote: por cada operación se guardan documentos como SWIFT, factura emitida por Finanzas, y otros comprobantes. Esta práctica fue observada directamente por Santi (2026-06-03).

Esta hipótesis emerge como evolución natural de la tab Operatoria (REQ-53) y de la sección Quotes (PWI-53): si Legal ya consulta los quotes de un cliente desde LEX, el paso siguiente es que desde ese mismo contexto pueda consultar y cargar la documentación asociada.

**El problema central:** la documentación hoy está dispersa, es local, no tiene trazabilidad y no es accesible por otro miembro del equipo en caso de ausencia.

---

## Hipótesis abiertas

### H-01 — ¿Qué documentos recibe Legal típicamente por cada quote?

Necesitamos mapear los tipos documentales frecuentes (SWIFT, factura de Finanzas, otros comprobantes) y los excepcionales (documentación adicional que llega en casos particulares). Sin este mapa no se puede diseñar la estructura de carga.

**Estado:** abierta. Requiere entrevista con Camila Cattaneo.

### H-02 — ¿Los documentos se asocian al quote o al cliente?

Hoy la organización es por quote (una carpeta por operación). ¿Tiene sentido mantener esa granularidad en el producto, o hay documentos que pertenecen al cliente sin estar atados a un quote específico (ej. documentación de onboarding, constancias regulatorias)?

**Estado:** abierta. Requiere validación con Camila.

### H-03 — ¿Cuál es la superficie correcta?

Tres opciones en evaluación:
- **(A)** Una nueva sección dentro de la tab Operatoria existente (junto a la sección Quotes)
- **(B)** Una tab nueva "Documentos" en el detalle del cliente
- **(C)** Una sección expandible dentro de cada fila de la tabla de Quotes (drawer o acordeón por operación)

**Estado:** abierta. Depende de H-02 y del volumen documental típico por cliente.

### H-04 — ¿Dónde se almacenan los archivos?

Decisión de infraestructura que Product debe validar con Tecnología antes de diseñar cualquier solución. Impacta en límites de tamaño, tipos de archivo soportados, tiempo de retención y acceso externo.

**Estado:** abierta. Requiere alineación con Mati (CTO).

### H-05 — ¿Es este un problema exclusivo de Legal o es transversal?

¿Otras áreas (Finanzas, Operaciones) también gestionan documentación de clientes de forma local? Si la respuesta es sí, la solución podría ser un módulo transversal en lugar de una feature específica de LEX.

**Estado:** abierta. Requiere sondeo con otras áreas.

---

## Decisiones tomadas

_Ninguna. Discovery en etapa de mapeo inicial._

---

## Prototipos

_Ninguno aún. Se crearán una vez resueltas H-01 y H-02._

---

## Dependencias

- **PWI-53 (Sección Quotes en tab Operatoria):** superficie de referencia. La gestión documental puede vivir como extensión de esa misma tab o como una nueva tab adyacente.
- **REQ-53 (Tab Operatoria):** estructura de navegación base del detalle de cliente en LEX.
- **Mati (CTO):** decisión de infraestructura de almacenamiento (H-04) bloqueante para el diseño.

---

## Relación con otras iniciativas

- **`lex-operatoria-rulo-quotes-discovery.md`** — discovery que origina esta hipótesis como evolución de la sección Quotes.
- **`lex-limites-discovery.md`** — módulo Límites, complementario al contexto del detalle de cliente donde viviría esta feature.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-06-03 | Creación del discovery a partir de observación directa con Camila Cattaneo (carpetas locales por quote). Cinco hipótesis abiertas identificadas. |
