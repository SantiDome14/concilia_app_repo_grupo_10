---
name: LEX — Visibilidad de quotes del rulo en el detalle de cliente
features: [LEX]
status: En investigación
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

El requerimiento fue iniciado por Camila vía Slack (REQ-82). Se publicaron 6 preguntas de clarificación en el hilo el 2026-05-15. Camila aún no respondió — las respuestas van a definir la forma de presentación del dato (tabla transaccional vs. totalizadores).

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

---

## Hipótesis abiertas

### H-01 — Tabla transaccional vs. totalizadores

**Hipótesis:** Camila puede necesitar ver los quotes individualmente (tabla transaccional con todos los campos) o un resumen agregado (totalizadores + tabla), o ambos. La forma de presentación impacta directamente el diseño de la sección.

**Cómo validar:** respuestas de Camila a las preguntas 1 a 5 del hilo de REQ-82, en particular cómo usa el Excel hoy para tomar la decisión de reasignación (pregunta 1).

**Estado:** pendiente — Camila no respondió aún (publicado 2026-05-15).

### H-02 — Criterio de identificación de "cliente del rulo"

**Hipótesis:** debe existir algún atributo o flag que distinga un cliente del rulo de uno que no lo es, para que la sección "Rulo" aparezca solo cuando corresponde. Puede ser un atributo en LEX, un flag en TRD, o una definición operativa de Mesa.

**Cómo validar:** consultar con Facundo Vásques (Head of Trading) o Santiago Ahmed.

**Estado:** pendiente.

### H-03 — Filtros temporales

**Hipótesis:** Camila puede necesitar filtrar el historial por período (similar al selector de ventana del REQ-53) o puede ser suficiente con ver el histórico completo.

**Cómo validar:** respuestas de Camila al hilo de REQ-82.

**Estado:** pendiente.

---

## Campos requeridos por Legal (por quote)

Según el requerimiento original de Camila:

- Fecha
- Tipo de trade
- Tipo de TC
- Moneda fiat y monto fiat
- Tipo de crypto y monto en crypto
- Número de comitente del cliente

---

## Dependencias

- **REQ-53 (Tab Operatoria):** la sección "Rulo" vive dentro de la tab Operatoria. REQ-53 está en `SENT TO DEV`. Si REQ-53 no está desplegado cuando este REQ avance, se evalúa si la sección puede lanzarse de forma independiente o debe esperar.
- **TRD:** fuente de datos. Pendiente mapear qué endpoint/servicio de TRD expone los quotes del rulo y con qué campos.

---

## Relación con otras iniciativas

- **REQ-82** — ticket de Jira que origina este discovery.
- **REQ-53** — Tab Operatoria en detalle de cliente (patrón de referencia y superficie de destino).
- **lex-limites-discovery.md** — módulo Límites, donde Camila gestiona los topes que este REQ busca informar.
- **trd-discovery.md** — aplicación TRD, fuente de los quotes del rulo.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-05-20 | Creación del discovery a partir del enriquecimiento de REQ-82. Decisiones D-01 a D-04 cerradas. Hipótesis H-01 a H-03 abiertas, pendientes de respuesta de Camila. |
