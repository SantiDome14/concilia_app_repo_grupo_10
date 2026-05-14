---
name: Automatización de envío de invoices a Pagos (FIN · Tesorería)
features: [FIN]
status: Concluida
owner: Santino Domeniconi
created_at: 2026-05-14
updated_at: 2026-05-14
---

# Automatización de envío de invoices a Pagos (FIN · Tesorería)

## Objetivo

Entender cómo funciona hoy el flujo de envío de invoices entre Tesorería y Operaciones, qué decisiones de comportamiento y trazabilidad tiene la automatización vía n8n, y qué prerrequisitos deben cumplirse antes de activarla. Producir un requerimiento estructurado listo para desarrollo (REQ-64).

## Contexto

Requerimiento iniciado por Gonzalo Melli (Treasury Analyst · Finance & Accounting) el 2026-05-05 vía el canal #req-product-finance-accounting. El proceso manual consiste en que el analista adjunta y envía manualmente el invoice al canal de Pagos en Slack cada vez que Tesorería necesita que Operaciones ejecute un pago a proveedor. El proceso es repetitivo, propenso a olvidos y no deja trazabilidad centralizada.

Las tres bases de Notion involucradas (Transferencias Ardua, Transferencias Maldens, Transferencias Astra Ventures) ya contaban con las columnas Invoice y "Enviar a Slack" creadas al momento de capturar el requerimiento.

## Investigación

### Preguntas abiertas al momento del enriquecimiento

Cuatro puntos quedaron sin resolver en el requerimiento original capturado por Miles y fueron challengeados directamente en el hilo de Slack:

1. ¿El canal de Pagos en Slack es único para las tres entidades o cada una tiene el suyo?
2. ¿Qué pasa si el checkbox se tilda más de una vez?
3. ¿El campo de trazabilidad en Notion es una columna existente o hay que crear una nueva?
4. ¿Quién es el receptor en el canal y qué formato debe tener el mensaje?

### Respuestas de Gonzalo Melli (2026-05-14)

**Canal único para las tres entidades.** El canal de Pagos en Slack es compartido. Cada mensaje debe incluir el identificador de la sociedad en el encabezado ([ARDUA], [MALDENS], [ASTRA VENTURES]) para que Operaciones identifique la entidad sin abrir el archivo.

**El reenvío múltiple es intencional.** Cada tilde del checkbox genera un nuevo envío. El mecanismo se usa para hacer seguimiento de invoices que llevan tiempo sin ser procesadas. El riesgo de duplicado por error del analista es un riesgo operativo conocido y aceptado.

**Columna nueva de trazabilidad.** Las bases ya tienen "Enviar a Slack" (checkbox), pero eso no es suficiente como trazabilidad. Se requiere crear una columna nueva llamada "Último envío a Slack" (tipo fecha/hora) en las tres bases. Se actualiza con cada disparo; si hay múltiples envíos, conserva el timestamp del más reciente.

**Formato del mensaje confirmado.** Sin mención a nadie en particular. Contenido mínimo requerido: identificador de sociedad, nombre del proveedor (Razón Social), CBU / número de cuenta bancaria, monto (cuando disponible), descripción del servicio (campo Observaciones, cuando disponible), archivo adjunto.

### Decisiones adicionales tomadas durante el enriquecimiento

**Comportamiento ante datos críticos ausentes.** Si el proveedor o el CBU no están completados en la fila, la automatización dispara de todas formas pero incluye una advertencia visible en el mensaje indicando qué campo falta. Esto permite a Operaciones identificar el gap sin intermediación de Tesorería.

**Notificación de fallo al analista.** Si el envío falla, la automatización notifica al analista que disparó el checkbox indicando el motivo. El reintento queda a cargo del analista. El reintento automático está fuera de alcance en v1.

## Conclusiones

Todas las preguntas fueron respondidas. El requerimiento fue enriquecido en modo Detallado y actualizado en Jira como REQ-64.

**Prerrequisito identificado:** la columna "Último envío a Slack" debe existir en las tres bases de Notion antes de que Tech active la automatización. Responsabilidad de Finanzas.

**Propagación a features:** cuando REQ-64 pase a desarrollo y se consolide, actualizar `features/fin/` con el estado del módulo de Tesorería y el flujo de comunicación con Operaciones. Al momento de crear este discovery, `features/fin/` no existe — su creación es una deuda abierta del área de Producto.
