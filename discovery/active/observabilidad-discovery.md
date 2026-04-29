# Observabilidad — Living Discovery Document

> Dominio: Observabilidad, Eventos, Alertas y Trazabilidad (transversal)
> Iniciativa: REQ-38 — Ardua Analytics
> Requerimiento fundacional: REQ-32
> Status: REQ-32 In Review — enriquecido, listo para hand-off a Tecnología
> Last updated: 2026-04-17

---

## Contexto del dominio

Ardua opera bajo cuatro entidades reguladas (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures) en Argentina, Canadá y Polonia. Cada una tiene obligaciones regulatorias propias de monitoreo, alertas y reporte. Hoy, la detección de comportamientos atípicos, la generación de alertas y su tratamiento se resuelven manualmente, sin sistema de registro ni trazabilidad.

Esto expone al grupo a tres riesgos concretos y simultáneos:

1. **Regulatorio:** los reguladores (BCRA, CNV, UIF, FINTRAC, autoridad VASP en Polonia) exigen capacidad demostrable de monitoreo. La ausencia de esa capacidad es por sí misma un incumplimiento.
2. **Operativo y de fraude:** sin observabilidad en tiempo real, anomalías, fraude y desvíos pasan desapercibidos.
3. **Ceguera de gestión:** sin datos operativos trazables, no hay decisiones basadas en evidencia ni control del negocio.

El principio rector del dominio, tomado de REQ-38, es: *un negocio financiero que no puede observarse ni medirse no puede controlarse.*

---

## Relación con REQ-38 (iniciativa paraguas)

REQ-38 — Ardua Analytics cubre tres dominios complementarios. Este context file se enfoca en el primero y en los puentes con los otros dos:

| Dominio de REQ-38 | Cubierto por | Estado |
|---|---|---|
| **Observabilidad operativa y alertas de negocio** | REQ-32 (requerimiento fundacional) | Enriquecido — In Review |
| **Control interno / compliance regulatorio** | REQ-32 habilita + casos de uso futuros | Los 10 criterios de Juan son el primer caso de uso piloto |
| **Inteligencia de negocio (BI / dashboards)** | Requerimiento separado — aún sin abrir | Pendiente solicitante concreto |

---

## Decisión de reencuadre — REQ-32

**Fecha:** 2026-04-17
**Contexto:** el pedido original de Juan Gonzalez (Legal) fue un "sistema de alertas AML/Compliance". Tras validación con Legal y Tecnología, se concluyó que construir un sistema dedicado solo a alertas AML era un anti-patrón: cada nuevo caso de uso (fraude, anomalía operativa, seguridad) requeriría rediseño.

**Decisión:** REQ-32 pasa de ser *"Sistema de Alertas AML"* a ser *"Plataforma fundacional de Eventos, Alertas y Trazabilidad"*. Los 10 criterios de Juan se incorporan como **casos de uso piloto y criterios de aceptación**, no como el alcance del sistema.

**Implicancia:** construir primero la plataforma permite que cualquier criterio nuevo (AML, fraude, operativo) se implemente como configuración — no como desarrollo.

---

## Alcance funcional de REQ-32 (8 capacidades)

1. **Ingesta de eventos** desde LEX, OPS, TRD, CLP y apps de cliente
2. **Motor de reglas configurable** con umbrales por perfil de riesgo y ventanas temporales
3. **Generación y registro de alertas** con trazabilidad completa
4. **Ciclo de vida de la alerta** (Nueva → Asignada → En investigación → Resuelta / Descartada / Escalada)
5. **Notificación multicanal** (Slack primario + email/otros configurables)
6. **Auditoría y reporting regulatorio** exportable por entidad del grupo
7. **Dashboards de gestión** segmentados por rol
8. **Retroalimentación y calibración** de umbrales basada en histórico

---

## Casos de uso piloto — 10 criterios aportados por Legal

Estos criterios no son el alcance de REQ-32, sino **referencias para Tecnología** sobre qué debe soportar la plataforma.

**Fase 1 — Crítico (validación de capacidades core):**
1. Transferencia a terceros no habituales — umbrales 25% / 20% / 15% sobre perfil transaccional anual según riesgo bajo / medio / alto
2. Superación del límite operativo — umbrales 15% / 10% / 5% según riesgo

**Fase 2 — Normal (validación de configurabilidad):**
3. Ingreso desde IP desconocida
4. Exceso de transferencias fuera del perfil transaccional
5. Aumento del volumen de envíos
6. Múltiples intentos de ingreso fallidos
7. Fraccionamiento / structuring
8. Operaciones en horarios atípicos
9. Concentración de transferencias a un mismo destinatario
10. Operaciones sin relación con actividad declarada

---

## Fuera de alcance (V1)

- Implementación concreta de los 10 criterios (se incorporan como casos de uso piloto post-plataforma)
- Integraciones con proveedores externos de compliance (Worldcheck, Aiprise, Elliptic)
- ML para detección de patrones no supervisados
- **Observabilidad técnica pura de infraestructura** (logs de aplicación, APM, uptime de servicios) — queda como dominio separado bajo REQ-38

---

## Requirements futuros sugeridos bajo REQ-38

No abrir hasta que haya solicitante concreto. Se listan para trazabilidad estratégica:

| Requirement potencial | Solicitante natural | Cuándo abrir |
|---|---|---|
| Detección de fraude operativo — casos de uso dedicados | Operaciones | Cuando Operaciones levante pedido formal |
| Observabilidad técnica de sistemas (logs, APM, uptime, SLAs) | Tecnología | Cuando Santiago (TPM) priorice |
| Dashboards de gestión / BI ejecutivo | Head of Product + Head of Sales | Post-plataforma fundacional operativa |

---

## Artefactos generados

| Artefacto | Ruta / Link | Estado |
|---|---|---|
| Requirement Jira | [REQ-32](https://arduasolutions.atlassian.net/browse/REQ-32) | In Review — enriquecido, 16 criterios de aceptación |
| Iniciativa paraguas | [REQ-38](https://arduasolutions.atlassian.net/browse/REQ-38) | To Do |
| Hilo de Slack | [Canal Legal & Compliance](https://arduasolutions.slack.com/archives/C0AJ67HK0ES/p1775834508819079) | Cierre publicado |

---

## Flags abiertos

**1. Hand-off a Tecnología pendiente**
Santiago (TPM) será notificado por Yasmani cuando corresponda. Tecnología decidirá arquitectura, stack y estrategia build vs. buy (tools tipo ComplyAdvantage, Unit21, Feedzai, etc.).

**2. Decisiones de implementación heredadas del hilo de Slack**
Los 5 challenges originales (multi-entidad en V1, criterios documentados, LEX como sistema de record vs. Slack, ciclo de vida completo en V1, retroalimentación a riesgo del cliente) **no son bloqueantes para el hand-off**. Se resuelven como decisiones técnicas y de scope de implementación durante el PRD técnico, no en el requerimiento funcional.

**3. Context file de LEX pendiente**
Sigue sin existir. Se crea cuando haya trabajo específico sobre LEX (no transversal).

**4. Relación con Marco Operativo**
Varios pendientes del marco operativo (O-09 herramientas de seguimiento, O-10 protocolo de excepciones, sección 5.3 trazabilidad de instrucciones) se resuelven parcialmente al construir esta plataforma. Documentar esa cobertura al cierre de V1.

---

## Principios de diseño aplicados

- **Plataforma primero, casos de uso después.** Los criterios concretos son configuración, no desarrollo.
- **Separación de responsabilidades.** Producto define qué y para qué; Tecnología define cómo (arquitectura, tools, build vs. buy).
- **Trazabilidad por entidad del grupo.** Cada alerta lleva la entidad regulada asociada. No hay alertas "genéricas" sin entidad.
- **Configurabilidad sin desarrollo.** Una nueva regla no requiere ticket de desarrollo — solo definición de regla.
- **Slack como notificación, LEX/plataforma como sistema de record.** Slack es canal operativo, no fuente de verdad.
- **Regulatorio + fraude + gestión en una misma plataforma.** Un solo sistema, múltiples consumidores (Legal, Operaciones, Producto, Tecnología).
