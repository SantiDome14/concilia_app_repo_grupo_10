# Formularios — Convenciones Transversales del Core

> Última actualización: 2026-05-26
> Estado: Activo
> Aplica a: TRD, OPS, LEX, CLP, FIN

---

## Propósito

Este archivo establece las convenciones de comportamiento y visualización que aplican a todos los formularios de carga de datos en las aplicaciones del financial-core. Su objetivo es garantizar consistencia en la experiencia del operador y reducir el riesgo de errores en la operación diaria.

---

## Convenciones activas

### Separador de miles en campos numéricos

**Aplica a:** todos los campos numéricos editables en formularios de carga operativa (montos, tipos de cambio, contravalores, cantidades, límites, y cualquier campo donde el operador ingrese un número de magnitud potencialmente grande).

**Comportamiento:**
- El separador de miles (",") se aplica automáticamente en tiempo real mientras el operador ingresa el valor, actualizándose con cada dígito.
- El valor numérico subyacente que el sistema registra y envía al backend no se altera por el formato visual.
- El separador aplica también a campos con valores de pocos dígitos enteros (ej: tipo de cambio) por consistencia, aunque el impacto visual sea menor.

**Motivación:** las áreas operativas trabajan con montos de gran magnitud de forma diaria. Un monto como 12.121.212 USD leído sin separadores ("12121212") obliga al operador a contar dígitos, enlentece la carga y expone al equipo a errores con consecuencias económicas.

**Origen:** REQ-112 — Expandir TRD · Separador de miles en campos numéricos de carga operativa.

**Estado de implementación por aplicación:**

| Aplicación | Módulo | Estado |
|---|---|---|
| TRD | Proveedores de Liquidez — alta de operación | REQ-112 (BACKLOG) |
| TRD | Quotes — carga de trades | REQ-112 (BACKLOG) |
| OPS | — | Pendiente de relevar |
| LEX | — | Pendiente de relevar |
| CLP | — | Pendiente de relevar |
| FIN | — | Pendiente de relevar |

> A medida que se releven los formularios de otras aplicaciones, actualizar esta tabla con el estado correspondiente.

---

## Convenciones pendientes de definir

Las siguientes convenciones están identificadas como necesarias pero aún no tienen definición formal. Se documentan acá para no perder el tracking.

| Convención | Contexto | Prioridad |
|---|---|---|
| Formato del separador decimal | ¿Punto o coma? ¿Consistente en todos los formularios del core? | A definir |
| Validación con cálculo automático | Comportamiento cuando el resultado de un cálculo automático produce decimales inesperados | A definir |
| Campos requeridos vs opcionales | Convención visual uniforme (asterisco, label, color) | A definir |
| Mensajes de error de validación | Tono, posición y timing (on blur vs on submit) | A definir |
