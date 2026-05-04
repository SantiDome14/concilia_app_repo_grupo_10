---
name: ardua-req-enrichment
description: >
  Enriquece un requerimiento existente en Jira (proyecto REQ) tomando como base el hilo de Slack
  vinculado al ticket y la base de conocimiento del proyecto (framework, entities, discoveries,
  features). Soporta dos modos: Detallado (análisis profundo con challenge al stakeholder) y
  Express (formateo directo para mover el ticket a Sent to Dev sin análisis profundo, con
  registro de cuestiones pendientes si aplican). Produce un requerimiento estructurado en el
  formato REQ-1, listo para ser actualizado en Jira. Activar cuando el usuario diga "enriquecer
  un requerimiento", "quiero enriquecer el REQ-XX", "mejorar un ticket" o similar. Si el usuario
  indica explícitamente el modo ("express" o "detallado") en el prompt inicial, usar ese modo
  directamente. Si el modo no queda claro, preguntarlo al principio. Si el usuario no proporciona
  el key del requerimiento, solicitarlo antes de continuar.
---

# Skill: Enriquecimiento de Requerimientos

## Propósito

Convertir un requerimiento capturado (típicamente por Miles vía Slack) en un requerimiento estructurado en formato REQ-1, listo para desarrollo. El enriquecimiento opera en dos modos según la profundidad de análisis necesaria y la urgencia de tramitación.

**Principio central:** el hilo de Slack del requerimiento es su contexto base. Todo lo que ocurra durante el enriquecimiento (preguntas, challenges, hallazgos) debe quedar registrado en ese hilo. Fuera del hilo, técnicamente estamos fuera del requerimiento.

**Cuando no existe hilo de Slack:** la base de conocimientos del proyecto (framework, entities, discoveries, features) actúa como fuente de contexto primaria. Los challenges se presentan directamente al usuario en el chat.

---

## Modos de enriquecimiento

### Detallado (default)
Análisis profundo del requerimiento contra la base de conocimiento y el hilo de Slack. Incluye un challenge explícito al stakeholder con preguntas concretas que deben responderse antes de estructurar el requerimiento. Es el modo correcto cuando:
- Hay ambigüedad de scope que impediría escribir criterios de aceptación claros
- Existen contradicciones entre el ticket y el knowledge base
- Hay dependencias arquitectónicas o prerequisitos sin resolver
- El stakeholder no validó decisiones clave con Producto o Tecnología

### Express
Formateo directo del requerimiento para tramitarlo inmediatamente a Sent to Dev, sin challenge al stakeholder. Es el modo correcto cuando:
- El stakeholder y el Dev ya conversaron sobre la solución
- Es un bug o ajuste puntual que no requiere análisis
- Hay urgencia operativa que prioriza el movimiento del ticket

**Preservación de trazabilidad en Express:** si durante el formateo emergen ambigüedades o preguntas obvias, se registran en una sección dedicada del requerimiento (`## 🔍 Cuestiones pendientes de revisión`) y se replican en el hilo de Slack al cierre. No se profundizan, pero quedan documentadas por si el scope crece o aparecen bugs.

### Selección del modo

**Si el usuario indica el modo en el prompt inicial** (ej: *"enriquecé express el REQ-44"*, *"hacé un enriquecimiento detallado del REQ-23"*) → usar directamente ese modo.

**Si el modo no queda claro** → al inicio del flujo, usar `ask_user_input`:

```
ask_user_input(
  question: "¿Qué tipo de enriquecimiento querés hacer?",
  options: [
    "Detallado — análisis profundo con challenge al stakeholder",
    "Express — formateo directo para mover el ticket a Sent to Dev"
  ]
)
```

---

## Base de conocimientos del proyecto

Las fuentes de conocimiento, en orden de lectura, viven todas bajo `/Users/yasmani/atlas-ai-product-management-framework/`. Antes de cargar cada carpeta, listar su contenido con `Filesystem:list_directory` — no asumir qué archivos existen.

### 1. `framework/` — constraints foundational
`/Users/yasmani/atlas-ai-product-management-framework/framework/`

Leer **todos** los archivos presentes. Definen el marco legal, operativo, contable, la misión, visión, valores y el roadmap del proyecto. Son constraints de diseño — toda decisión del requerimiento debe validarse contra ellos.

### 2. `entities/` — catálogo del ecosistema operativo
`/Users/yasmani/atlas-ai-product-management-framework/entities/`

Consultar **cuando el requerimiento menciona una entidad** (Haz Pagos, Circuit Pay, Ardua Solutions Corp, Astra Ventures, Binance, Bitso, Bridge, Convera, Brubank, etc.). Leer el archivo `[nombre-entidad].md` correspondiente — describe qué capacidades operativas habilita esa entidad.

Si el requerimiento menciona una entidad y no existe el archivo → flaguearlo al cierre y proponer crearlo.

### 3. `discoveries/` — Living Discovery Documents (estado: En investigación)
`/Users/yasmani/atlas-ai-product-management-framework/discoveries/`

La carpeta es **flat**: no hay subcarpetas `opened/` ni `closed/`. El estado de cada discovery se declara en el campo `status` del YAML frontmatter (`En investigación`, `Concluida`, `Descartada`).

Identificar y leer el discovery relevante al requerimiento (filtrar mentalmente por `status: En investigación` para el contexto activo):
- Aplicación del core: `[aplicacion]-discovery.md` (ej: `trd-discovery.md`, `clp-discovery.md`)
- Módulo específico dentro de una aplicación: `[aplicacion]-[modulo]-discovery.md` (ej: `trd-proveedores-de-liquidez-discovery.md`, `lex-limites-discovery.md`)

Los discoveries capturan hipótesis bajo validación, preguntas abiertas, decisiones cerradas y blockers activos. Son la fuente de verdad del estado actual del dominio.

**Si no existe discovery para la aplicación/módulo del requerimiento — Discovery-First Principle:** proponer crearlo **antes de avanzar** con el enriquecimiento, no al cierre. Informar al usuario:

> *"No encontré discovery para [aplicación/módulo]. Como es la fuente de contexto del dominio, tiene sentido crearlo antes de enriquecer el REQ. ¿Arrancamos con un discovery básico y después retomamos el enriquecimiento?"*

### 4. `discoveries/` — discoveries históricos (estado: Concluida / Descartada)
La misma carpeta `discoveries/`. Consultar los archivos cuyo `status` sea `Concluida` o `Descartada` solo si el requerimiento referencia explícitamente una feature ya consolidada y se necesita entender cómo se llegó a la definición actual.

### 5. `features/` — specs consolidadas
`/Users/yasmani/atlas-ai-product-management-framework/features/`

Leer los feature specs relevantes para la aplicación o feature del requerimiento.

### 6. Notion — Teamspace de Productos (complementario)
Usar `Notion:notion-search` con términos clave del requerimiento. Teamspace ID: `317e8880-def6-8062-b0e0-000b5da91cd6`. Complementa el knowledge base local cuando la información allí no alcanza.

---

## Formato de referencia: REQ-1

El requerimiento enriquecido sigue la estructura de REQ-1, el estándar establecido:

```
**Requerimiento:** [Nombre]
**Aplicación:** [TRD / OPS / LEX / CLP / COM / FIN]
**Módulo:** [Módulo dentro de la aplicación, si aplica — ej: "Proveedores de Liquidez", "Límites", "Earn"]
**Tipo:** Feature / Bug / Improvement / Spike
**Prioridad:** Alta / Media / Baja
**Carácter:** Permanente / Temporal / Experimental
**Modo de enriquecimiento:** Detallado / Express

---

## Contexto
[Situación actual, por qué existe el problema, impacto operativo. Incluir dependencias
arquitectónicas clave y prerequisitos sin resolver si son relevantes para el diseño.]

---

## Objetivo
- [Bullet 1 — resultado esperado, no descripción de la solución]
- [Bullet 2]
- [Bullet N]

---

## Alcance funcional

### 1. [Sección]
[Descripción funcional — nivel "el sistema hace X cuando el usuario hace Y". Sin datos
técnicos, sin endpoints, sin modelos de datos.]

### N. [Sección]
[Descripción funcional]

---

## Fuera de alcance (v1)
- [Item 1]
- [Item N]

---

## Criterios de aceptación
- [Criterio observable y verificable, sin ambigüedad]
- [Criterio N]

---

[SECCIÓN CONDICIONAL — solo en modo Express, solo si hay cuestiones sin profundizar:]

## 🔍 Cuestiones pendientes de revisión

Estas quedaron identificadas durante el enriquecimiento pero no se profundizaron por tratarse de un enriquecimiento Express. Se recomienda revisarlas si el scope crece, si aparecen bugs, o antes de iteraciones mayores sobre esta feature.

- [Cuestión 1 — qué está pendiente y por qué importa]
- [Cuestión N]

---

**Solicitante:** [Nombre — Rol]
**Prototipo:** [nombre-del-archivo.html] ← solo si ya existe en prototypes/[aplicacion]/
```

**Reglas sobre el campo Aplicación:**
- Siempre indicar la aplicación del core (TRD, OPS, LEX, CLP, COM, FIN)
- Para productos transversales (Prime Desk RFQ, Ardua PnL Report, etc.), usar el nombre del producto en vez de una aplicación del core

**Reglas sobre el campo Módulo:**
- Opcional, solo cuando el requerimiento afecta un módulo específico dentro de una aplicación
- Si el requerimiento es transversal a toda la aplicación, omitir el campo

---

## Flujo completo

### Paso 0 — Verificaciones iniciales

#### 0a. Key del requerimiento

Si el usuario no proporcionó el key del REQ → preguntar:

> *"¿Cuál es el key del requerimiento que querés enriquecer? (ej: REQ-44)"*

No continuar hasta tener el key.

#### 0b. Modo de enriquecimiento

Si el usuario indicó el modo explícitamente en el prompt inicial → usar directamente.

Si el modo no está claro → usar `ask_user_input` (ver sección "Selección del modo" arriba). Esperar la respuesta del usuario antes de continuar.

---

### Paso 1 — Leer el ticket en Jira

Usar `Atlassian:getJiraIssue` con:
- `cloudId`: `53eec1f8-a156-4af9-bc3a-d6142b50e0cc`
- `issueIdOrKey`: el key proporcionado
- `responseContentFormat`: `markdown`

Extraer:
- `summary` — título del ticket
- `description` — contenido actual
- `status` — estado actual en el workflow
- Custom fields disponibles (área, prioridad, business area, source)

**Buscar en la descripción el link al hilo de Slack.** Formato típico:
`https://arduasolutions.slack.com/archives/[CHANNEL_ID]/p[TIMESTAMP]`

→ Si se encuentra el link: continuar al **Paso 2A** (con hilo).
→ Si NO se encuentra el link: continuar al **Paso 2B** (sin hilo).

---

### Paso 2A — Con hilo: leer el hilo de Slack completo

Convertir el timestamp del link a `message_ts`:
- Tomar los dígitos después de la `p`: `p1775672338243669`
- Insertar punto antes de los últimos 6 dígitos: `1775672338.243669`

Usar `Slack:slack_read_thread` con:
- `channel_id`: extraído del link
- `message_ts`: timestamp formateado
- `response_format`: `detailed`

Capturar **todos los mensajes del hilo**: mensaje original (captura de Miles), respuestas del solicitante, archivos adjuntos mencionados, decisiones o correcciones posteriores.

Continuar al **Paso 3**.

---

### Paso 2B — Sin hilo: activar base de conocimientos como fuente primaria

Si el ticket no tiene link al hilo, informar al usuario:

> *"Este requerimiento no tiene hilo de Slack vinculado. Voy a usar la base de conocimientos del proyecto como fuente de contexto primaria."*

Los challenges (en modo Detallado) se presentarán directamente en el chat, no en Slack. Al cierre, recomendar al usuario vincular un hilo para futuras iteraciones.

Continuar al **Paso 3**.

---

### Paso 3 — Cargar conocimiento del proyecto

Independientemente del modo o de si hay hilo, cargar la base de conocimiento correspondiente al requerimiento.

**Secuencia de lectura:**

1. Listar `/Users/yasmani/atlas-ai-product-management-framework/framework/` y leer **todos** los archivos.

2. **Identificar entidades mencionadas** en el summary, description o hilo del requerimiento. Para cada entidad, leer el archivo correspondiente en `/Users/yasmani/atlas-ai-product-management-framework/entities/[nombre-entidad].md`. Si una entidad es mencionada y no existe archivo → registrarlo para flaguear al cierre.

3. **Identificar la aplicación del core del requerimiento** (TRD, OPS, LEX, CLP, COM, FIN o producto transversal). Si no es evidente del ticket, inferirla de los triggers/keywords en el hilo.

4. Listar `/Users/yasmani/atlas-ai-product-management-framework/discoveries/` y leer:
   - El discovery de la aplicación (`[aplicacion]-discovery.md`)
   - Si aplica, el discovery del módulo específico (`[aplicacion]-[modulo]-discovery.md`)
   - **Si no existe ninguno para la aplicación/módulo → aplicar Discovery-First Principle** (ver sección "Base de conocimientos" arriba): proponer crear el discovery antes de avanzar.

5. Listar `/Users/yasmani/atlas-ai-product-management-framework/features/` y leer los feature specs relevantes.

6. Complementar con `Notion:notion-search` si los pasos anteriores no alcanzaron.

---

### Paso 4 — Construir challenge (solo Detallado) / Extraer contexto (Express)

#### Modo Detallado — construir challenge basado en evidencia

El challenge es **objetivo y basado en evidencia**. No se challengea por challengear. Nunca asumir nada que no esté documentado.

**Un challenge válido es:**
- Contradicción entre lo que dice el hilo/ticket y lo que dice un context file
- Elemento de scope definido en el context que está ausente en el ticket
- Terminología incorrecta u obsoleta según las decisiones documentadas
- Dependencia arquitectónica conocida que el requerimiento no menciona
- Prerequisito sin resolver que bloquea el avance (ej: flags abiertos en el discovery)
- Ambigüedad en el scope que impediría escribir criterios de aceptación claros
- Archivos adjuntos en el hilo no incorporados al contenido del ticket

**Un challenge inválido es:**
- Suposición no documentada ("probablemente también necesitan X")
- Opinión de diseño sin respaldo en el knowledge base
- Pregunta retórica sin propósito funcional

**Publicación del challenge:**
- **Con hilo de Slack** → publicar en el hilo usando `Slack:slack_send_message` con `thread_ts` del hilo original. Usar el formato limpio definido en la sección "Formato de mensajes a Slack".
- **Sin hilo** → presentar en el chat con el mismo formato.

Si el challenge requiere investigación adicional → ejecutar la investigación primero, publicar hallazgos en el hilo/chat, y luego formular las preguntas.

#### Modo Express — extraer contexto y identificar cuestiones pendientes

En Express **no se construye challenge** al stakeholder. El objetivo es formatear el requerimiento con el contexto disponible y moverlo.

Durante la lectura del hilo + knowledge base, identificar internamente cualquier ambigüedad o pregunta que en un modo Detallado habría sido un challenge. Clasificar:

- **Resoluble con el contexto disponible** → aplicar directamente al estructurar el requerimiento
- **No resoluble sin respuesta del stakeholder** → anotar para la sección `## 🔍 Cuestiones pendientes de revisión` del requerimiento

Si no emergen cuestiones sin resolver → omitir completamente la sección en el requerimiento final.

---

### Paso 5 — Resolver challenges (solo Detallado)

Esperar la respuesta del stakeholder en el hilo (o en el chat si no hay hilo).

Cuando la respuesta llega, clasificar:

**Tipo A — Requiere confirmación del usuario:**
- Ambigüedades de scope no documentadas
- Decisiones de diseño abiertas
- Flags sin resolver que afectan el requerimiento

→ Esperar respuesta antes de continuar al Paso 6.

**Tipo B — Informativos (ya documentados):**
- Correcciones de terminología respaldadas por el context file
- Scope omitido pero ya definido en el context
- Dependencias arquitectónicas conocidas

→ Aplicar las correcciones, continuar al Paso 6, dejar registro en el hilo/chat.

En modo Express este paso no aplica — saltar directamente al Paso 6.

---

### Paso 6 — Generar el requerimiento enriquecido

Producir el requerimiento completo siguiendo la estructura REQ-1 (ver sección "Formato de referencia").

**Reglas de contenido:**

- **Aplicación y Módulo:** usar la taxonomía consolidada (aplicaciones del core: TRD / OPS / LEX / CLP / COM / FIN, o producto transversal). Módulo opcional.

- **Contexto:** Situación actual, problema e impacto operativo. Incluir dependencias arquitectónicas clave y prerequisitos sin resolver.

- **Objetivo:** Bullets que responden *"¿para qué se construye esto?"*. Cada bullet es un resultado esperado. No describe el qué sino el para qué.

- **Alcance funcional:** Secciones numeradas con título claro y descripción funcional. Sin datos técnicos, sin endpoints, sin modelos de datos. Nivel: *"el sistema hace X cuando el usuario hace Y"*.

- **Fuera de alcance (v1):** Lo que está explícitamente fuera. Incluir elementos que podrían generar confusión. Separar V1 de roadmap futuro si hay versiones definidas.

- **Criterios de aceptación:** Condiciones observables y verificables. Sin ambigüedad. Formato: *"El sistema [hace X] cuando [condición]"* o *"[Elemento] muestra/permite/impide [comportamiento]"*.

- **Modo de enriquecimiento:** declarar explícitamente Detallado o Express.

- **Cuestiones pendientes de revisión (solo Express, condicional):** incluir la sección `## 🔍 Cuestiones pendientes de revisión` si durante el Paso 4 emergieron cuestiones sin resolver. Si no hay, omitir la sección completa.

- **Solicitante:** Inferido del hilo de Slack (quién envió a Miles) o del ticket si no hay hilo.

- **Prototipo:** Solo incluir si ya existe en `/Users/yasmani/atlas-ai-product-management-framework/prototypes/[aplicacion]/`. Si no existe, omitir el campo.

---

### Paso 7 — Presentar al usuario y confirmar

Mostrar el requerimiento enriquecido al usuario en el chat **antes** de actualizar Jira.

**Modo Detallado:**
> *"Acá está el requerimiento enriquecido para [KEY]. Revisá el scope y los criterios de aceptación — si confirmás, lo actualizo en Jira y publico el cierre en el hilo de Slack."* (o *"te confirmo el cierre acá"* si no hay hilo)

**Modo Express:**
> *"Acá está el requerimiento enriquecido en modo Express para [KEY]. [Si hay cuestiones pendientes:] Registré [N] cuestión(es) pendientes de revisión que aparecieron durante el proceso. Si confirmás, lo actualizo en Jira y queda listo para que lo muevas a Sent to Dev."*

Esperar confirmación explícita.

---

### Paso 8 — Actualizar Jira y cerrar

**Actualizar Jira:**
Usar `Atlassian:editJiraIssue` con `contentFormat: adf`. La descripción debe ser un objeto ADF válido (`type: doc`, `version: 1`, content array). No usar `contentFormat: markdown` para descriptions — no persiste de forma confiable.

**IMPORTANTE — no transicionar el ticket.** El skill solo actualiza la descripción. La transición a "Sent to Dev" (u otro estado) la hace el HoP manualmente desde Jira.

**Cierre en Slack/chat:**

- **Detallado con hilo** → publicar cierre detallado en el hilo (ver formato)
- **Detallado sin hilo** → confirmar en chat + recomendar vincular hilo para futuras iteraciones
- **Express con hilo** → publicar cierre Express en el hilo (incluyendo sección de cuestiones pendientes si existen)
- **Express sin hilo** → confirmar en chat + recomendar vincular hilo

**Flaguear al cierre** (en cualquier modo):
- Si una entidad fue mencionada y no existía archivo en `entities/` → proponer crearlo
- Si no existía discovery para la aplicación/módulo (y se continuó igual con permiso del usuario) → proponer crearlo antes de futuras iteraciones

---

## Formato de mensajes a Slack

Todos los mensajes a Slack siguen un formato limpio y escaneable, optimizado para la lectura del stakeholder desde mobile o desktop. Principios:

- **Separación visual**: líneas `━━━` delimitan bloques
- **Jerarquía**: contexto verificado arriba, challenges/acciones en el medio, notas al final
- **CTAs destacadas**: cada pregunta accionable marcada con `▸` y en negrita
- **Distinción**: 🔍 para challenges, 📌 para notas informativas, ✅ para cierre completo, ⚡ para cierre Express

### Template — Challenge de enriquecimiento (modo Detallado)

```
🔍  *Challenge de enriquecimiento — [KEY]*

Revisé el requerimiento contra [fuente principal: context file / roadmap / código / Notion].
Antes de estructurarlo, necesito confirmar [N] punto(s) de scope.

*Contexto ya verificado*
•  [Hallazgo confirmado 1]
•  [Hallazgo confirmado 2]

━━━━━━━━━━━━━━━━━━━━━━━━

*C1 · [Título corto del challenge]*
[Contexto del challenge en 2-3 líneas. Explicar por qué es un challenge.]

▸  *[Pregunta o acción requerida]*
    [Opciones o aclaración adicional si corresponde]

━━━━━━━━━━━━━━━━━━━━━━━━

*C2 · [Título]*
[Contexto]

▸  *[Pregunta]*

━━━━━━━━━━━━━━━━━━━━━━━━

📌  *Nota informativa — no requiere confirmación*
[Información relevante que no necesita respuesta del stakeholder]

━━━━━━━━━━━━━━━━━━━━━━━━

Cuando confirmes C1–CN, estructuro el requerimiento en formato REQ-1 y actualizo Jira.
```

**Reglas de uso:**
- Máximo 2-3 líneas de contexto por challenge
- Si un challenge tiene sub-opciones (ej: "v1 mínima" vs "v1 completa"), listarlas debajo del `▸`
- Omitir el bloque `📌 Nota informativa` si no hay información sin confirmar
- Omitir `Contexto ya verificado` si no hay hallazgos previos relevantes

### Template — Cierre de enriquecimiento Detallado

```
✅  *Requerimiento enriquecido — [KEY]*

El requerimiento fue estructurado y actualizado en Jira.

━━━━━━━━━━━━━━━━━━━━━━━━

*Resumen del alcance confirmado*
•  [Punto clave 1]
•  [Punto clave 2]
•  [Punto clave N]

━━━━━━━━━━━━━━━━━━━━━━━━

⏭️  *Próximo paso sugerido:* Prototipo funcional
Si querés avanzar con el prototipo, decime y lo arrancamos desde este requerimiento.
```

### Template — Cierre de enriquecimiento Express

```
⚡  *Requerimiento enriquecido (Express) — [KEY]*

El requerimiento fue estructurado y actualizado en Jira, listo para que lo muevas a Sent to Dev.

━━━━━━━━━━━━━━━━━━━━━━━━

*Resumen del alcance*
•  [Punto clave 1]
•  [Punto clave 2]

[Solo si hay cuestiones pendientes:]
━━━━━━━━━━━━━━━━━━━━━━━━

🔍  *Cuestiones pendientes de revisión*
Quedaron documentadas en el ticket para revisión posterior:
•  [Cuestión 1]
•  [Cuestión 2]

━━━━━━━━━━━━━━━━━━━━━━━━

📋  Podés ver el detalle completo en Jira.
```

---

## Consideraciones sobre discoveries durante el enriquecimiento

El enriquecimiento **no genera discoveries por default**. Los discoveries son documentos vivos que capturan el estado del dominio — no artefactos que nacen y mueren en una sesión.

**Dos escenarios posibles durante el enriquecimiento:**

| Escenario | Qué hacer |
|---|---|
| La información específica del REQ emerge durante el proceso | Va al ticket de Jira — es lo que ya hace el enriquecimiento |
| Información que **trasciende el REQ** emerge (decisión arquitectónica, blocker que afecta otras features del módulo, hipótesis nueva sobre el dominio) | Proponer **actualizar un discovery existente**. Si no existe, proponer crearlo (Discovery-First) |

**No se crean discoveries para cerrarlos en la misma sesión.** Si un discovery se crea durante el enriquecimiento, permanece abierto y evoluciona en sesiones futuras, cerrándose naturalmente cuando todas sus hipótesis estén resueltas y derive en una feature spec.

---

## Lo que este skill NO hace

- No define arquitectura técnica, endpoints ni modelos de datos
- No toma decisiones de scope sin respaldo en el knowledge base
- **No transiciona el ticket en Jira** — la transición a Sent to Dev la hace el HoP manualmente
- No omite la carga del knowledge base (con o sin hilo, en modo Detallado o Express)
- No actualiza Jira sin confirmación explícita del usuario
- No asume nada que no esté documentado
- No crea discoveries que nacen y mueren en la misma sesión
- En modo Express, no construye challenge al stakeholder — solo registra cuestiones pendientes si emergen

---

## Diagrama del flujo

```
[Key del REQ + modo (Detallado / Express)]
      ↓
[Leer ticket en Jira — extraer summary, description, status, link a Slack]
      ↓
[¿Tiene hilo de Slack?]
   SÍ → Leer hilo completo (Paso 2A)
   NO → Usar knowledge base como fuente primaria (Paso 2B)
      ↓
[Cargar knowledge base]
   • framework/ (todos los archivos)
   • entities/ (por cada entidad mencionada)
   • discoveries/ (aplicación + módulo)
   • features/ (relevantes)
   • Notion (complementario)
      ↓
[¿Existe discovery para la aplicación/módulo?]
   NO → Proponer crearlo antes de avanzar (Discovery-First)
   SÍ → Continuar
      ↓
[Modo?]
   DETALLADO:
      → Construir challenge basado en evidencia
      → Publicar challenge en hilo (o chat)
      → Esperar respuesta del stakeholder
      → Resolver Tipo A / aplicar Tipo B
   EXPRESS:
      → Extraer contexto del hilo + knowledge base
      → Identificar cuestiones pendientes (si emergen)
      → No construir challenge
      ↓
[Generar requerimiento enriquecido — formato REQ-1]
   • Aplicación + Módulo
   • Modo de enriquecimiento declarado
   • Sección "Cuestiones pendientes" solo si Express + cuestiones
      ↓
[Presentar al usuario]
      ↓
[Confirmar → Actualizar Jira (ADF, SIN transicionar)]
      ↓
[Publicar cierre]
   DETALLADO con hilo → ✅ cierre detallado en hilo
   DETALLADO sin hilo → confirmar en chat + recomendar vincular hilo
   EXPRESS con hilo → ⚡ cierre Express en hilo (con cuestiones si hay)
   EXPRESS sin hilo → confirmar en chat + recomendar vincular hilo
      ↓
[Flaguear pendientes]
   • Entidades sin archivo en entities/
   • Discoveries faltantes
```
