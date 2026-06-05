---
name: Challenges interactivos en Slack para el flujo de enrichment de REQs
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-26
updated_at: 2026-05-26
---

# Challenges interactivos en Slack

Discovery sobre cómo evolucionar el formato de challenges del skill `ardua-req-enrichment` desde texto plano en hilos de Slack hacia una experiencia interactiva con botones, modales y persistencia estructurada. No es un feature de producto — es tooling interno del proceso de Producto.

## Contexto y problema observado

El skill `ardua-req-enrichment` produce challenges para stakeholders no técnicos como texto formateado en Markdown publicado en el hilo de Slack del REQ. El stakeholder responde en prosa libre dentro del mismo hilo, y el PM parsea esa prosa manualmente para entrar al Paso 5 del flujo.

Tres problemas observados con el formato actual:

1. **Densidad alta.** El stakeholder recibe un muro de texto largo (típicamente 3-6 challenges, cada uno con contexto + pregunta + opciones). En mobile se vuelve casi imposible escanear. Ejemplo extremo capturado: REQ-82 con 6 preguntas seguidas.
2. **Respuestas no estructuradas.** El stakeholder responde en prosa, el PM tiene que parsear cuál opción eligió en cada Cn y cuál matizó. Tiempo de PM perdido en interpretación.
3. **Sin trazabilidad automática.** No hay registro estructurado de qué se preguntó vs. qué se respondió — solo el hilo de Slack como prosa, sin metadata.

REQs canónicos donde se vio el problema (capturas archivadas en la conversación de Claude del 26/05/2026):

- **REQ-44 (LEX)** — challenges con sub-opciones "v1 mínima / v1 completa"
- **REQ-60 (LEX)** — 4 challenges con opciones (i), (ii), (iii) en prosa
- **REQ-82** — 6 preguntas mayormente abiertas (este caso NO se beneficia de botones, ver hipótesis abajo)

## Hipótesis

Si los challenges con **opciones discretas** se presentan como **botones interactivos** (Slack Block Kit con `actions` blocks):

- El stakeholder responde con un toque (mobile-friendly)
- Las respuestas llegan estructuradas a un endpoint, no como prosa
- Queda registro automático con atribución (Slack `user_id`)
- El propio mensaje se "tilda" visualmente — el stakeholder ve qué le falta

Las preguntas **abiertas** (tipo "¿Cómo usás el Excel para decidir?") **no** se benefician de botones — siguen siendo prosa libre. El sistema tiene que soportar ambos formatos coexistiendo en el mismo challenge, sin forzar al stakeholder a un formato que no aplica.

## Lo que ya validamos

- **Capa 1 (formato "rich markdown" mejorado)** — testeado el 26/05/2026 con un mensaje real en `#req-product-notifications` ([permalink](https://arduasolutions.slack.com/archives/C0AS1BPV9QU/p1779805638469029)). Mejora visual respecto al formato actual (opciones A/B/C en grilla indentada, patrón de respuesta sugerido al final), pero no resuelve el problema estructural — las respuestas siguen siendo prosa. Vale como **fallback** si la Capa 3 cae, pero no como solución final.
- **Capa 3 (Block Kit con botones)** — validada conceptualmente con un mockup HTML interactivo en chat. La UX se siente clara, especialmente con la escape hatch "Responder en texto" para preguntas que requieren matización.

## Propuesta de implementación

Capa 3 aprovechando infra existente: **Miles + n8n + Notion**. No requiere construir Slack App nuevo.

### Componentes (arquitectura runtime)

```
Stakeholder clickea botón en Slack
      ↓
n8n: Miles webhook handler  (verifica firma, parsea action_id, rutea)
      ↓
┌─────────────────────┬──────────────────────┬─────────────────────┐
│ Slack: chat.update  │ Notion: estado       │ Jira: comment       │
│ Botón → ✓ marcado   │ Respuesta por Cn     │ Audit en el REQ     │
└─────────────────────┴──────────────────────┴─────────────────────┘
                              ↓
                Skill consume estado en Paso 5
                (lee Notion, no el hilo de Slack)
```

Notion es el single source of truth para respuestas estructuradas. Jira recibe un comment como audit. Slack `chat.update` es solo UX (tildar el botón visualmente).

### Plan en 6 fases (resumen)

| Fase | Owner | Esfuerzo aprox | Bloquea a |
|---|---|---|---|
| 0 — Decisiones de diseño | PM | 30 min de input | Todo |
| 1 — Habilitar interactividad en Miles | Técnico | ½ día | Fase 3 |
| 2 — Schema Notion DB | PM | ½ día | Fase 3 |
| 3 — Workflow n8n handler | Técnico | 1.5 días | Fase 4 |
| 4 — Adaptar skill `ardua-req-enrichment` | PM + Claude | 1 día | Fase 5 |
| 5 — Piloto con un REQ real | PM + equipo | ½ día | Fase 6 |
| 6 — Rollout + documentación | PM | ½ día | — |

Total estimado: ~4.5 días combinado, ejecutables en una semana calendario si Fase 1 y Fase 2 corren en paralelo.

El plan detallado de cada fase está en la conversación de Claude del 26/05/2026; al retomar, recrear con Claude usando este discovery como input.

## Decisiones de diseño pendientes (Fase 0)

Cinco preguntas a responder antes de arrancar la implementación. Cada una tiene un default sugerido que se puede aceptar como tal si no hay objeción:

1. **¿Single source of truth para respuestas?** → _Default: Notion DB. Jira recibe comment como audit, no como storage._
2. **¿Quién puede responder un challenge?** → _Default: autor original del REQ (`Solicitante:`) + cualquier miembro del hilo. n8n valida `user_id` contra esa lista; si no matchea, el botón devuelve error visible._
3. **¿Se puede cambiar de opinión después de clickear?** → _Default: sí, re-click sobrescribe. Notion guarda historial en columna append-only._
4. **Timeout sin respuesta.** → _Default: sin timeout automático. Recordatorio a las 48hs si quedan Cn sin responder; PM decide si insiste o cancela._
5. **¿"Responder en texto" siempre disponible, o solo cuando el skill lo marca?** → _Default: siempre disponible como escape hatch genérico. Reduce complejidad y respeta que algunos challenges no encajan en opciones discretas._

## Riesgos y unknowns

- **Slack 3-second timeout** — n8n debe responder 200 inmediato al webhook y procesar el resto async. Si tarda más, Slack reintenta y aparecen duplicados. No es opcional, es la primera regla de la implementación.
- **Mapping Slack user → identidad interna (Notion/Jira)** — verificar al arrancar Fase 0 si ya existe tabla de mapping en algún workflow de Miles. Si no, agendar Fase 0.5 corta para armarla. **Nota:** la base "Personas" de Notion propuesta en `miles-home-discovery.md` (H1) es exactamente este mapping. Se diseña una sola vez en aquel discovery y se consume desde acá — no duplicar.
- **Endpoint público expuesto** — el Request URL configurado en el Slack App es accesible desde internet. La verificación de firma HMAC-SHA256 con `signing_secret` de Slack es la única barrera. Skipearla por "facilidad de testing" abre el endpoint a falsificación.
- **Coexistencia con challenges abiertos** — el skill tiene que distinguir cuáles tienen opciones discretas (Block Kit) vs. cuáles son prosa libre (formato actual). Hoy esto es juicio del PM al construir cada Cn; en la implementación, probablemente sea instrucción explícita al skill en el Paso 4.
- **El MCP de Slack actual no soporta `blocks`** — para postear con Block Kit, el skill necesita llamar a un endpoint helper en n8n (`/miles-post-challenge`) que internamente usa Miles con la Slack API completa. Componente adicional a construir como parte de Fase 3.
- **Idempotencia** — un usuario puede clickear varias veces el mismo botón, o el handler puede recibir duplicados por retry de Slack. Los procesadores de n8n deben ser idempotentes (upsert en Notion, no insert).
- **Detección de tipo de pregunta** — preguntas abiertas no benefician de botones. Pero ¿quién decide cuál es cuál? Hoy el PM construye el challenge a mano y elige el formato; cuando esté automatizado vía skill, hay que definir reglas claras (¿se basa en una propiedad del challenge? ¿se le pregunta al modelo al construirlo?).

## Cómo termina este discovery

Cuando madure y se implemente, sus conclusiones se propagan **al skill `ardua-req-enrichment`** (no a `features/` de un producto, porque esto es tooling de proceso, no feature de producto). Concretamente, los entregables al cierre serían:

- Workflow nuevo en n8n: `[MILES] Interactivity Handler`
- Database nueva en Notion: `REQ Challenge Responses`
- Versión actualizada del skill `ardua-req-enrichment` con:
  - Template nuevo para "Challenge interactivo (Block Kit)"
  - Paso 4 reescrito para emitir JSON + llamar al endpoint helper de n8n
  - Paso 5 reescrito para consumir Notion en vez de leer el hilo de Slack
  - Fallback al formato actual si el endpoint de n8n no responde
- Para orquestar la implementación, conviene abrir un REQ propio (con su AM espejo en MAIN para la pieza técnica de n8n) que referencie este discovery.

## Próximos pasos cuando se retome

1. **Responder las 5 decisiones de Fase 0** (idealmente en una sesión de 30 minutos)
2. **Verificar el estado de Miles** — qué scopes ya tiene, si está soportada la interactividad, si hace falta reinstalar la app en el workspace
3. **Verificar mapping de usuarios** — ¿existe Slack `user_id` → identidad interna en algún workflow? Si no, planificar Fase 0.5
4. **Crear la database de Notion** según el schema propuesto en el plan (REQ Key, Challenge ID, Opciones, Respuesta Actual, Respondido Por, Timestamp, Status, etc.)
5. **Pasar el plan al técnico** que vaya a tocar n8n (Fase 1 + Fase 3)
6. **Coordinar un piloto** con un REQ real en `BACKLOG` que tenga challenges con opciones discretas (idealmente similar al patrón del REQ-60 que ya tiene historia conocida)

## Referencias

- **Conversación inicial de exploración:** chat de Claude del 26/05/2026 donde se discutió Capa 1 vs 2 vs 3, se construyó el mockup HTML, y se diseñó el plan de fases
- **Mockup HTML de referencia visual** del challenge interactivo ideal: archivado en la conversación
- **Mensaje de Capa 1 (rich markdown) enviado a producción** el 26/05/2026: [permalink en Slack](https://arduasolutions.slack.com/archives/C0AS1BPV9QU/p1779805638469029) — útil para comparar el "antes" del rich markdown vs el ideal de Block Kit con botones
- **Ejemplos de challenges en formato actual** (capturas archivadas en la conversación): REQ-44, REQ-60, REQ-82
- **Workflows de n8n relevantes:** `[MILES] Conversation Handler` (`mLDlTEhHTPPKXtKD`) es el actual handler de Miles — el nuevo `[MILES] Interactivity Handler` viviría al lado, mismo namespace
