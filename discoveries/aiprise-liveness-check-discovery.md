---
name: AiPrise — Almacenamiento de video de liveness check en S3
features: []
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-02
updated_at: 2026-06-02
propagates_to: []
---

# AiPrise — Almacenamiento de video de liveness check en S3

## Objetivo

Determinar cómo extender el pipeline de almacenamiento de AiPrise para persistir los videos de liveness check en S3, al igual que hoy se hace con las imágenes de documento (DNI frente y dorso). Establecer el mecanismo de almacenamiento, el dato que se persiste (URL + token), y el plan de recuperación de registros históricos.

## Contexto

El proceso de onboarding de clientes de Ardua opera íntegramente a través de AiPrise: Ardua genera un link de sesión y se lo envía al cliente, el cliente sube su documentación y graba el video de liveness check directamente en la plataforma, y los datos recopilados llegan de vuelta a Ardua al finalizar la sesión.

Hoy se almacenan en S3 las imágenes de documento (DNI frente y dorso) generadas durante ese proceso. El video de liveness check —componente que confirma la presencia física del usuario durante la validación— no está siendo persistido. Este gap de evidencia es relevante para las obligaciones de compliance del grupo.

La necesidad fue relevada por la gerencia (Management) junto con Santi Ahmed. El requerimiento quedó formalizado como [PWI-67](https://arduasolutions.atlassian.net/browse/PWI-67).

## Hipótesis activa

El mecanismo de almacenamiento de imágenes en S3 puede extenderse para soportar video con cambios acotados, sin rediseño del pipeline existente. Por cada video se persiste una URL de acceso y un token.

## Rollout en tres fases

1. **Fase 1 — Mapeo histórico**: relevar qué videos de liveness check están disponibles en AiPrise para clientes ya onboardeados y definir el proceso de recuperación.
2. **Fase 2 — Mecanismo de almacenamiento**: desarrollar la capacidad de recibir y persistir videos en S3, retornando URL y token.
3. **Fase 3 — Integración activa**: incorporar el almacenamiento al flujo de onboarding en curso para que cada nueva sesión quede automáticamente persistida.

## Preguntas abiertas

- **Disparador**: ¿el almacenamiento del video se dispara automáticamente al completarse la sesión de AiPrise, o requiere una acción explícita?
- **Viabilidad histórica**: ¿AiPrise provee acceso a videos de sesiones pasadas? ¿Bajo qué condiciones y por cuánto tiempo?
- **Formato de video**: ¿qué formato entrega AiPrise para el video de liveness check?

## Referencias

- **REQ**: [PWI-67 — Integrar AiPrise — Almacenamiento de video de liveness check en S3](https://arduasolutions.atlassian.net/browse/PWI-67)
- **Entidad**: [`entities/aiprise.md`](../entities/aiprise.md)
