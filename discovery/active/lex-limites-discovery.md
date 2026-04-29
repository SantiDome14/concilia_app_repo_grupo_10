# LEX — Límites · Discovery Document

> Última actualización: 2026-04-23 | Estado: Opened — hipótesis sobre el catálogo de orígenes pendiente de validación; REQ-45 en curso como segunda iniciativa del módulo

---

## 1. Propósito del documento

Documenta el módulo de Límites dentro de la aplicación LEX: su propósito, modelo conceptual, arquitectura funcional actual según código, decisiones tomadas, requerimientos en curso, hipótesis bajo validación y consideraciones estructurales relevantes para el diseño de futuras iteraciones.

Es la fuente de verdad para sesiones de producto sobre el módulo Límites, enriquecimiento de requerimientos relacionados y handoff a Tecnología.

---

## 2. Naturaleza y propósito del módulo

**Nombre:** Límites
**Aplicación:** LEX — Legal file management
**Ubicación en app:** Tab "Límites" dentro del detalle de cliente (`client-details.vue` → `ClientTabs/Limits.vue`)

El módulo de Límites permite al equipo de Legal & Compliance asignar a cada cliente un tope de operatoria durante un período determinado, segmentado por entidad del grupo con la que el cliente opera. La asignación de un límite requiere documentar el origen de fondos que lo justifica, usando un catálogo de 15 opciones predefinidas.

Los límites son un instrumento de compliance: anclan la capacidad operativa del cliente a documentación probatoria de origen de fondos, habilitando trazabilidad ante auditorías regulatorias.

---

## 3. Modelo conceptual

### 3.1 Segmentación por entidad

Un cliente puede tener límites simultáneos en dos entidades:

- **Haz Pagos** (operatoria en ARS)
- **Circuit Pay** (operatoria cripto/fiat en ARS)

La visibilidad de cada bloque en la UI depende de si el cliente tiene docket abierto con esa entidad (props `hasHazDocket`, `hasCircuitDocket` del componente).

Cada límite está asociado a una única entidad. No existen límites cross-entidad ni agrupación a nivel cliente.

### 3.2 Atributos de un límite

- **Monto** — tope de operatoria en la moneda de la entidad.
- **Fecha de inicio** — fecha desde la cual el límite entra en vigor.
- **Fecha de fin** — fecha hasta la cual el límite es válido.
- **Origen del límite** — multi-select sobre un catálogo de 15 opciones (ver §3.3).

Atributos derivados (calculados en backend):

- **Consumed** — monto ya consumido por operaciones del cliente en el período.
- **Available** — monto disponible restante (`amount - consumed`).
- **Overage** — excedente si el consumo superó el monto asignado.

### 3.3 Catálogo actual de orígenes (15 opciones)

14 de las 15 son instrumentos probatorios de origen de fondos, autoexplicativos por catálogo:

1. Certificación Contable Legalizada
2. DDJJ BBPP
3. DDJJ De Regularización
4. DDJJ REIBP
5. Estados Contables (EECC)
6. Recibo de Sueldo
7. Facturas
8. Certificación Origen de Fondos
9. Aumento de Capital
10. DDJJ Ganancias
11. Umbral Mínimo
12. Acuerdo Mutuo
13. Venta Inmueble
14. Donación

La opción 15 es especial:

15. **Otros** — categoría abierta. Objeto del REQ-44 (ver §5).

El multi-select permite seleccionar una o más opciones simultáneamente. Es obligatorio seleccionar al menos una.

### 3.4 Estados de un límite

El estado es derivado de las fechas:

| Estado | Condición |
|---|---|
| **Pendiente** | `start_date` > fecha actual |
| **Activo** | `start_date` ≤ fecha actual ≤ `end_date` y no está exhausto |
| **Expirado** | `end_date` < fecha actual |

Un cliente puede tener múltiples límites por entidad. El "límite activo" mostrado en el resumen es el más próximo a expirar entre los vigentes y no exhaustos.

---

## 4. Arquitectura funcional actual (según código `core-lex-frontend`)

### 4.1 Operaciones expuestas

Servicios disponibles en `src/api/services/clientService.js`:

- `getLimits(clientId)` — listado de límites del cliente.
- `createLimit(payload)` — creación.
- `deleteLimit(limitId)` — eliminación.

**No existe operación de update.** Esta ausencia es una restricción dura cada vez que se discute modificar un límite existente: cualquier cambio sobre un registro vivo implica agregar endpoint de update en backend.

### 4.2 Visualización

- **Header por entidad:** consumo total y disponible en la card activa.
- **Card por límite** con:
  - Badge de entidad (Haz Pagos / Circuit Pay)
  - Estado (Activo / Pendiente / Expirado)
  - Barra de consumo con porcentaje
  - Pills con los orígenes seleccionados
  - Rango de fechas
  - Monto disponible o sobregiro
- **Orden:** límite activo primero, luego por `end_date` descendente.

### 4.3 Formulario de creación

Modal con:
- Multi-select "Origen del límite" (obligatorio, al menos una opción).
- Monto (formato con miles y decimales).
- Fecha de inicio y fecha de fin.

Al confirmar, se llama a `createLimit` y se recarga el listado.

---

## 5. Iniciativas en curso

### REQ-44 — Aclaración obligatoria al seleccionar "Otros" en origen del límite

| Campo | Valor |
|---|---|
| **Estado Jira** | In Analysis — scope cerrado, pendiente mover a Ready for Dev |
| **Tipo** | Improvement |
| **Prioridad** | Media |
| **Solicitante** | Camila Cattaneo — Legal Analyst · Legal & Compliance |
| **Link** | https://arduasolutions.atlassian.net/browse/REQ-44 |
| **Hilo de Slack** | https://arduasolutions.slack.com/archives/C0AJ67HK0ES/p1776700763316109 |

**Problema:** al seleccionar "Otros" en el multi-select de origen del límite, no hay campo para documentar qué justifica esa selección. La justificación queda fuera del sistema y se gestiona por canales alternativos, generando falta de trazabilidad y exposición frente a auditorías de compliance.

**Scope v1 cerrado con Camila (2026-04-23):**

1. Campo "Aclaración" condicional a tildar "Otros" (visible/oculto dinámicamente).
2. Obligatorio cuando "Otros" está seleccionado (validación en submit).
3. 500 caracteres máximo.
4. Visible en la card del límite mediante tooltip sobre la pill "Otros".
5. Aplica únicamente a límites nuevos — los existentes quedan como están.
6. Vinculado solo a "Otros", no al conjunto del multi-select.

### REQ-45 — Edición de límites existentes (monto y fecha de fin)

| Campo | Valor |
|---|---|
| **Estado Jira** | In Analysis — enriquecido (Express), pendiente mover a Sent to Dev |
| **Tipo** | Feature |
| **Prioridad** | Alta |
| **Solicitante** | Camila Cattaneo — Legal Analyst · Legal & Compliance |
| **Link** | https://arduasolutions.atlassian.net/browse/REQ-45 |
| **Hilo de Slack** | https://arduasolutions.slack.com/archives/C0AJ67HK0ES/p1776719289689439 |

**Problema:** no existe operación de edición sobre límites vivos en el módulo — cualquier corrección requiere borrar y recrear, perdiendo el consumo histórico asociado. Los clientes quedan operando con montos o fechas de vencimiento incorrectos cuando un límite se crea con un error.

**Scope v1:**

1. Acción "Editar" en la card de cada límite existente no expirado, con modal precargado.
2. Campos editables: monto y fecha de fin. El origen del límite, la aclaración "Otros" y la fecha de inicio quedan fuera.
3. Validaciones: monto > 0, fecha de fin posterior a fecha de inicio.
4. Registro de auditoría mínimo viable: usuario, timestamp y valores previos.
5. Los límites en estado Expirado no exponen la acción "Editar".

**Prerequisito técnico:** requiere que Tecnología construya el endpoint de update en backend antes de habilitar la UI (ver §8.1).

**Cuestiones pendientes registradas en el ticket** (sin profundizar por tratarse de Express): roles autorizados a editar, interpretación de "fechas de vencimiento" (solo end_date o también start_date), manejo de consumo que excede el nuevo monto, versionado histórico (una sola versión previa o histórico completo), superficie de consulta del log de auditoría, política para edición de límites expirados.

---

## 6. Decisiones cerradas

| ID | Decisión | Fecha | Fuente |
|---|---|---|---|
| D-01 | La aclaración del campo "Otros" aplica únicamente a esa opción, no al conjunto del multi-select. Los otros 14 orígenes son autoexplicativos por catálogo. | 2026-04-23 | Hilo REQ-44 |
| D-02 | La aclaración será obligatoria cuando "Otros" esté seleccionado — no se permite crear el límite sin completarla. | 2026-04-23 | Respuesta de Camila al C2 |
| D-03 | La aclaración se mostrará en la card del límite (tooltip sobre la pill "Otros"), no solo en el formulario de creación. | 2026-04-23 | Respuesta de Camila al C1 |
| D-04 | El campo de aclaración tendrá un límite de 500 caracteres. | 2026-04-23 | Respuesta de Camila al C4 |
| D-05 | La v1 del REQ-44 aplica únicamente a límites nuevos. La edición de aclaración en límites existentes queda fuera de scope y se trata como iteración posterior. | 2026-04-23 | Respuesta de Camila al C3 + evidencia desde código sobre ausencia de endpoint de update |

---

## 7. Hipótesis abiertas

### H-01 — El uso recurrente de "Otros" puede señalar un gap en el catálogo

**Hipótesis:** si "Otros" se usa de manera recurrente en la asignación de límites, el problema de fondo no es la falta de un campo de texto libre sino la falta de opciones formales en el catálogo de orígenes. El REQ-44 es una solución de trazabilidad sobre la opción abierta, pero no cierra el posible problema raíz.

**Cómo validarla:** medir frecuencia de uso de "Otros" vs las otras 14 opciones una vez REQ-44 esté en producción y las aclaraciones queden registradas. Analizar las aclaraciones para detectar casuísticas recurrentes que podrían formalizarse como nuevas opciones del catálogo.

**Bloqueantes para validar:** no hay observabilidad instrumentada sobre el módulo hoy. La validación requerirá extracción manual de datos inicialmente.

**Prioridad:** baja — no bloquea ninguna iniciativa en curso. Relevante cuando el REQ-44 esté en producción por 3+ meses y haya volumen suficiente de datos.

---

## 8. Riesgos y consideraciones estructurales

### 8.1 Ausencia de endpoint de update

El backend expone creación y eliminación pero no actualización. Cualquier iniciativa futura que requiera modificar un límite vivo (no solo la aclaración, sino cualquier atributo) está bloqueada por esta limitación. Vale la pena dimensionar este trabajo de infraestructura cuando aparezca el próximo requerimiento que lo demande.

**2026-04-23 — Ese requerimiento apareció.** REQ-45 impulsa la construcción del endpoint de update. Una vez resuelto, queda desbloqueada cualquier iteración futura que modifique atributos de límites vivos, incluyendo la v2 del REQ-44 sobre edición de la aclaración "Otros" en límites existentes.

### 8.2 Edición de campos de compliance — cuestiones activas en REQ-45

Estos tres puntos estaban listados como definiciones teóricas pendientes para una eventual v2 del REQ-44:

- **Quién puede editar.** ¿Cualquier usuario de Legal & Compliance o solo roles específicos?
- **Trazabilidad del cambio.** Editar silenciosamente un campo de compliance es un anti-patrón — debe quedar registro de quién, cuándo y qué había antes.
- **Versionado.** ¿Se conserva el valor previo al editar, o se sobrescribe?

**2026-04-23 — Pasan a ser cuestiones activas.** Con REQ-45 en curso (ver §5), estos tres puntos ya no son teóricos: están registrados como cuestiones pendientes del ticket y deben resolverse antes de una iteración mayor de la feature de edición. La conversación pertinente involucra a Legal & Compliance (Camila) y Tecnología.

### 8.3 Límites históricos sin aclaración

Los límites creados antes de la v1 del REQ-44 seguirán sin aclaración en el campo "Otros" y no hay un path para completarlos retroactivamente en la v1. Esto significa que la trazabilidad nueva aplica solo hacia adelante — el gap histórico de compliance persiste.

### 8.4 Compliance / UIF

La documentación de origen de fondos es requisito regulatorio ante UIF. La falta de trazabilidad sobre el uso de "Otros" expone al grupo en auditorías. El REQ-44 reduce ese riesgo hacia adelante pero no lo resuelve retroactivamente — ver §8.3.

---

## 9. Dependencias y relaciones

### Con otras aplicaciones del core

- **OPS:** las operaciones del cliente tributan al consumo de su límite vigente. El cálculo de `consumed` depende de cómo OPS reporte las operaciones ejecutadas. Esta relación no está documentada aún y sería necesaria si aparece un requerimiento sobre el cálculo de consumo.
- **TRD:** mismo patrón que OPS — operaciones de mesa pueden impactar consumo. Relación no documentada.

### Con el marco operativo y contable

- **Marco operativo (O-12):** el REQ-44 está alineado con el pendiente de formalizar canales de trazabilidad de instrucciones.
- **Marco legal:** los instrumentos del catálogo reflejan documentación probatoria exigida por la normativa argentina de PSP y PSAV. Cualquier modificación del catálogo debe validarse con Legal & Compliance contra la normativa vigente.

---

## 10. Changelog interno

- **2026-04-23** — Creación del discovery a partir del enriquecimiento de REQ-44. Se documenta el modelo conceptual, la arquitectura funcional actual según código, la primera iniciativa en curso (REQ-44), cinco decisiones cerradas con Camila y una hipótesis abierta sobre el catálogo de orígenes. Discovery en estado Opened porque H-01 queda pendiente de validación y el dominio del módulo no está completamente mapeado (faltan cálculo de consumo, relación con OPS/TRD, reglas de expiración automática, etc.).
- **2026-04-23** — Se suma REQ-45 como segunda iniciativa en curso del módulo (ver §5), enriquecida en modo Express. El REQ habilita la infraestructura de edición cuya ausencia estaba flagueada como riesgo estructural en §8.1 y desbloquea, como iteración posterior, la v2 del REQ-44 sobre límites existentes. Las definiciones listadas en §8.2 (roles, trazabilidad, versionado) pasan a ser cuestiones pendientes activas del nuevo REQ.
