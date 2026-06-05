---
name: LEX — Auditoría operativa de trades confirmados (TRD → LEX)
features: [LEX, TRD, CLP]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-05
updated_at: 2026-06-05
propagates_to: []
---

# LEX — Auditoría operativa de trades confirmados (TRD → LEX)

## Objetivo

Determinar qué información necesita el área Legal & Compliance para auditar operaciones de trading, cuándo debe recibirla y desde qué superficie, de forma que el proceso de auditoría operativa deje de depender de capturas manuales de WhatsApp o de coordinación informal entre áreas.

## Contexto

El 3 de junio de 2026, Facundo Vásques (Head of Trading) identificó un problema operativo: el área Legal & Compliance no sabe cuándo auditar ni qué auditar en relación a los trades de TRD. La comunicación de aceptación de trades por parte de los clientes ocurre actualmente por canales informales (grupos de WhatsApp), sin trazabilidad digital dentro del sistema.

La propuesta inicial de Facu fue capturar screenshots de los quotes que los clientes aceptan en el grupo de WhatsApp y compartirlos con Legal para que estén informados. El propio equipo de Trading frenó esta idea porque reconocen que debería automatizarse.

El 5 de junio de 2026, se mostró a Facu el wireframe del PWI-53 (sección Quotes en la tab Operatoria de LEX), que permite a Legal ver el historial de quotes del rulo registrados en TRD. Facu evaluó que la solución es útil pero **no alcanza** para el caso de uso de auditoría: PWI-53 expone los quotes pero no indica si el cliente aceptó o no el trade. Facu señaló que debe coordinarse con Juani (head de Legal) antes de avanzar en la definición, para alinear qué necesita exactamente el área Legal.

**Gap identificado:** el PWI-53 cierra el problema de visibilidad de historial de quotes para la gestión de límites (caso Camila Cattaneo). No cierra el problema de auditoría operativa, que requiere saber **qué trades fueron confirmados por el cliente** y **cuándo** debe intervenir Legal.

**Estado actual del proceso:** Legal no tiene un mecanismo estructurado para saber cuándo auditar una operación ni a qué información recurrir. La aceptación del cliente no queda registrada en TRD de forma verificable.

---

## Hipótesis abiertas

### H-01 — ¿TRD registra la aceptación del cliente como un estado del quote?

¿Existe hoy en el sistema TRD algún campo, estado o evento que marque que el cliente aceptó el trade? ¿O la confirmación ocurre únicamente por WhatsApp, sin pasar por el sistema?

**Estado:** abierta. Requiere relevamiento directo de TRD (acceso a QA o sesión con Facu + Desarrollo).

### H-02 — ¿Qué constituye "aceptacion" en el ciclo de vida de un trade?

¿La aceptación es una acción del operador en TRD una vez que el cliente confirma por WhatsApp? ¿Es una acción directa del cliente desde un canal digital? ¿Es implícita (el trade se ejecuta = fue aceptado)? El ciclo de vida completo del quote (ofertado → aceptado → ejecutado → liquidado) no está documentado.

**Estado:** abierta. Bloqueada por H-01. Requiere sesión con Facu para mapear el flujo real.

### H-03 — ¿Qué necesita Legal para auditar un trade?

¿Cuál es el proceso real de auditoría de Legal hoy? ¿Qué información consultan, qué verifican, qué documentan? ¿La necesidad es reactiva (auditar cada trade aceptado) o periódica (auditar lotes de operaciones por período)?

**Estado:** abierta. Bloqueada por la coordinación pendiente entre Facu y Juani. Requiere sesión con Juani o con el equipo de Legal & Compliance.

### H-04 — ¿El PWI-53 es complementario o insuficiente para el caso de auditoria?

¿Agregar el estado de aceptación como columna adicional en la tabla del PWI-53 cierra el gap? ¿O el caso de auditoría requiere una superficie distinta, con otra lógica de notificación o workflow?

**Estado:** abierta. Depende de H-02 y H-03. No puede decidirse antes de entender el proceso de Legal.

### H-05 — ¿Donde vive la confirmacion digital del cliente? → Cerrada

**Respuesta:** en CLP (Client Portal). El cliente firma la cotización desde el portal. TRD no es la superficie de confirmación. Esta es la dirección definida por Producto (Yasmani Rodriguez), con alcance futuro.

**Estado:** cerrada. Ver D-01.

### H-06 — ¿Cómo llega el evento de firma desde CLP a LEX?

Una vez que el cliente firma en CLP, ese evento necesita llegar a LEX para disparar el workflow de auditoría. ¿Cuál es el camino? ¿CLP → TRD → LEX? ¿CLP notifica directamente a LEX? ¿Existe un evento de sistema compartido entre aplicaciones del core?

**Estado:** abierta. Bloqueada por H-01 y H-02 (primero hay que entender el ciclo de vida actual del quote en TRD). También depende de cómo se construya la feature de firma en CLP.

---

## Decisiones tomadas

### D-01 — La aceptacion del cliente vive en CLP, no en TRD

El cliente firmará la cotización desde el Client Portal (CLP). TRD no es la superficie de confirmación — es la fuente del quote, pero la aceptación formal del cliente ocurre en CLP como una acción del usuario en el portal.

Esta capacidad es **futura**: CLP no tiene hoy una funcionalidad de firma de cotizaciones. El discovery debe considerarse bloqueado en su dimensión de solución hasta que esa feature de CLP esté en scope o en construcción.

**Fuente:** Yasmani Rodriguez (Head of Product) · 2026-06-05.

---

## Proximos pasos

1. **Esperar coordinación Facu–Juani** — Facu indicó que debe hablar con Juani antes de avanzar. H-03 no puede cerrarse sin input del área Legal.
2. **Sesión con Facu** — mapear el ciclo de vida real del quote en TRD: qué estados existen, qué registra el sistema hoy sobre la aceptación del cliente (H-01, H-02). Puede realizarse en paralelo con el punto anterior.
3. **Sesión con Juani / Legal** — entender el proceso de auditoría: qué se audita, cuándo, con qué frecuencia, qué información necesitan (H-03).
4. **Decisión de alcance** — con H-01 a H-03 respondidas, decidir si el gap se cierra extendiendo PWI-53 o si requiere una solución independiente (H-04, H-05).

---

## Restricciones conocidas

- Legal no puede actuar sobre TRD directamente — cualquier información que necesiten debe llegar desde LEX o desde un mecanismo de notificación propio.
- La coordinación entre TRD y Legal es una brecha organizacional además de técnica: no existe hoy un proceso formal de traspaso de información entre áreas.
- PWI-53 está en SENT TO DEV — cualquier extensión a su scope requiere evaluar el impacto en el ticket y en el trabajo ya comprometido con Desarrollo.

---

## Relacion con otras iniciativas

- **PWI-53** — sección Quotes en la tab Operatoria de LEX. Expone el historial de quotes pero no el estado de aceptación. Superficie candidata para extensión.
- **`trd-quotes-discovery.md`** — el ciclo de vida completo del quote (incluyendo el evento de aceptación) no está documentado todavía. Este discovery depende de que ese ciclo se clarifique.
- **`lex-operatoria-rulo-quotes-discovery.md`** — cerró el caso de visibilidad de historial para gestión de límites. El presente discovery cubre un caso de uso distinto: auditoría operativa por confirmación de trade.
- **`lex-operatoria-documentacion-discovery.md`** — gestión documental asociada a quotes. Puede ser complementaria a la solución de auditoría (Legal necesita documentos además de datos).
- **`clp-discovery.md`** — el Client Portal es la superficie donde vivirá la firma del cliente (D-01). La feature de firma de cotizaciones en CLP es una dependencia directa de este discovery.

---

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-06-05 | Apertura del discovery a partir de la preocupación de Facu (2026-06-03) y la validación del gap durante la revisión del wireframe PWI-53 (2026-06-05). Cinco hipótesis abiertas identificadas. |
| 2026-06-05 | D-01 incorporada: la confirmación del cliente vive en CLP (firma de cotización en el portal), no en TRD. H-05 cerrada. H-06 abierta (integración CLP→LEX). `features` actualizado a [LEX, TRD, CLP]. Fuente: Yasmani Rodriguez. |
