---
name: Modulos transversales del financial-core — Adopcion por app
features: []
status: En investigación
owner: Yasmani Rodriguez
created_at: 2026-05-06
updated_at: 2026-05-06
---

# Modulos transversales del financial-core — Adopcion por app

> Scope: Coordinacion cross-app de los 6 modulos transversales que entrega el paradigma del `core-template-frontend`. NO es un modulo funcional; es la matriz que ata los REQs transversales con la adopcion en cada app del core (CLP, FIN, LEX, OPS, TRD).
>
> Related repo: `/Users/yasmani/Projects/core-template-frontend/`
> Related discovery: `core-template-frontend-discovery.md`

---

## Objetivo

- Tener una vista unica del set de modulos transversales que provee el core, los REQs que los entregan y las AM stories espejo que los implementan.
- Documentar el orden de rollout sugerido y las dependencias inter-REQ que Tech debe respetar para no construir contra contratos a medio cocinar.
- Capturar la matriz de adopcion por app (CLP × FIN × LEX × OPS × TRD vs los 6 modulos) con el estado actual de cada cruce, para identificar gaps y priorizar.
- Registrar gotchas detectados durante la sesion de cleanup que conviene preservar para sesiones futuras (sobre todo del PM).
- Ser el punto de partida cuando se quiera contestar: "¿quien ya consume qué del core, qué falta, en qué orden vamos?"

Este artefacto es interno del area de Producto. NO se referencia desde los REQs de Jira (que viven en mundo Tech) ni se considera input para construccion. Su valor es coordinacion y trazabilidad para el PM.

---

## Contexto

El paradigma del `core-template-frontend` define una arquitectura compartida para todas las apps del financial-core (CLP, FIN, LEX, OPS, TRD, COM en su momento). Dentro de ese paradigma, el core entrega **6 modulos transversales** que toda app consume:

**4 modulos genericos** — paginas concretas que aparecen en la sidebar de cada app:

- **DASHBOARD** — orientacion read-only. KPIs del dominio + counters de los 3 list-shaped (Inbox, Alertas, Reportes).
- **INBOX** — lista de Solicitudes con owner, lifecycle y outcome.
- **ALERTAS** — eventos detectados por el sistema con perfiles A/B/C/D.
- **REPORTES** — catalogo + ejecucion de reportes regulatorios, internos, operativos, contables.

**2 funcionalidades transversales** — infraestructura que esos modulos (y otros del dominio) consumen:

- **ACCIONES** (Manifest Engine) — declaracion de acciones por registro con capabilities, predicates, dialogs y audit trail.
- **VISTAS + Ejes** — Lista, Tarjetas, Tablero (Kanban) state-driven con drag-drop y `<ClosureModal>` shared.

Hasta abril 2026 cada app construia estas piezas localmente, sin contrato compartido. El paradigma del nuevo template formaliza que la infraestructura vive una sola vez en el core y las apps **consumen el estandar** declarando configuracion especifica del dominio.

Durante la sesion del 2026-05-06 se completo el cleanup de los 6 REQs transversales que entregan estos modulos y de sus 6 AM stories espejo. Las descriptions quedaron auto-contenidas para Tech (sin paths a `framework/`, `prototypes/`, `discoveries/` ni a specs OpenSpec) y referenciandose entre si por keys de Jira. Este discovery captura el estado consolidado al cierre de esa sesion y las decisiones pendientes que quedan por delante.

---

## Trazabilidad — REQs y AM stories

Cada modulo transversal se entrega con un par REQ ↔ AM. El REQ es el contrato canonico (ownership Producto); el AM es la development story espejo que Tech implementa. Si hay divergencia entre los textos, prevalece el REQ.

| Modulo | REQ canonico | AM mirror | Status REQ | Status AM |
|---|---|---|---|---|
| **ACCIONES** (Manifest Engine) | [REQ-68](https://arduasolutions.atlassian.net/browse/REQ-68) | [AM-1019](https://arduasolutions.atlassian.net/browse/AM-1019) | SENT TO DEV | TO REFINEMENT |
| **VISTAS + Ejes** | [REQ-69](https://arduasolutions.atlassian.net/browse/REQ-69) | [AM-1018](https://arduasolutions.atlassian.net/browse/AM-1018) | SENT TO DEV | TO REFINEMENT |
| **INBOX** | [REQ-71](https://arduasolutions.atlassian.net/browse/REQ-71) | [AM-1017](https://arduasolutions.atlassian.net/browse/AM-1017) | SENT TO DEV | TO REFINEMENT |
| **ALERTAS** | [REQ-73](https://arduasolutions.atlassian.net/browse/REQ-73) | [AM-1020](https://arduasolutions.atlassian.net/browse/AM-1020) | SENT TO DEV | TO REFINEMENT |
| **REPORTES** | [REQ-59](https://arduasolutions.atlassian.net/browse/REQ-59) | [AM-1004](https://arduasolutions.atlassian.net/browse/AM-1004) | SENT TO DEV | TO REFINEMENT |
| **DASHBOARD** | [REQ-74](https://arduasolutions.atlassian.net/browse/REQ-74) | [AM-1016](https://arduasolutions.atlassian.net/browse/AM-1016) | SENT TO DEV | TO REFINEMENT |

Iniciativa contenedora: [REQ-3 — Ardua Fintech: Financial Core as a Service](https://arduasolutions.atlassian.net/browse/REQ-3).

REQs por area que **consumen** este transversal y permanecen como casos de implementacion (no entregan infra, la usan):

- [REQ-54](https://arduasolutions.atlassian.net/browse/REQ-54) — LEX: Centro de Reporteria Regulatoria y Operativa → consume REQ-59 (Reportes).
- [REQ-52](https://arduasolutions.atlassian.net/browse/REQ-52) — LEX: Centro de Alertas → consume REQ-73 (Alertas), perfil B.
- [REQ-33](https://arduasolutions.atlassian.net/browse/REQ-33) — TRD: Modulo de Alertas → consume REQ-73, perfiles a definir.

REQ-52 y REQ-33 quedan vinculados a REQ-73 via `is caused by`. Mantienen la configuracion del dominio (qué `ALERT_TYPE` declara cada uno, con qué perfil, qué payload); ya no entregan la infraestructura.

---

## Matriz de adopcion — apps × modulos

Lectura de la matriz: cada celda indica si el modulo **aplica al app** (es decir, si el app deberia tenerlo segun el paradigma) y, cuando hay senial, el estado actual de implementacion en el prototipo de referencia o en el repo del app.

Convencion de simbolos:

- ✅ Adoptado / construido en el prototipo de referencia
- 🟡 Skeleton / parcial (existe pero no esta completo)
- 📋 Aplica, planeado, sin construir
- ➖ No aplica al dominio del app

| App | DASHBOARD | INBOX | ALERTAS | REPORTES | ACCIONES | VISTAS |
|---|---|---|---|---|---|---|
| **CLP** (Client Portal) | 📋 | 📋 | 📋 | 📋 | 📋 | 📋 |
| **FIN** (Finanzas) | ✅ | 🟡 | 🟡 | 🟡 | ✅ | ✅ |
| **LEX** (Legal & Compliance) | 📋 | 📋 | 📋 | 📋 (REQ-54) | 📋 | 📋 |
| **OPS** (Operaciones) | 📋 | 🟡 (prompt canonico v1) | 📋 | 📋 | 📋 | 📋 |
| **TRD** (Trading Desk) | 📋 | 📋 | 📋 (REQ-33) | 📋 | 📋 | 📋 |

Notas por app:

- **CLP** — el app con mayor exposicion al cliente externo. Earn esta blocked pendiente Legal (Yield via BitGo + DeFi Bridge + FCI con AdCap). El consumo de los 4 genericos esta planeado pero no priorizado v1.
- **FIN** — el prototipo de referencia mas maduro. Materializa el paradigma con Dashboard funcional, Inbox skeleton con 8 tipos de Solicitudes, perfiles A y B de Alertas, Reportes con sub-tabs Catalogo + Ejecucion. Es la implementacion de referencia que valida el paradigma y desde la cual se extrapolan los REQs transversales.
- **LEX** — primer consumidor "real" planeado para Reportes (REQ-54). Centro de Alertas (REQ-52) en perfil B con foco en compliance (KYC, blacklist, ROS).
- **OPS** — tiene prompt canonico v1 para Inbox listo para ejecutar (13 Solicitudes en 8 tipos). Movements, withdrawals, reconciliacion. El Inbox de OPS es el caso paradigmatico de cross-app routing (Solicitudes que llegan desde CLP, FIN, sistema).
- **TRD** — Alertas en perfil B + perfil C (limit breaches y spread anomalies son time-series con threshold). Dashboard probable consumidor del period selector.

La matriz es **dinamica** — se actualiza con cada sesion donde se toque un app del core.

---

## Orden de rollout sugerido

Dependencias tecnicas entre los 6 REQs definen un orden logico de implementacion. En la practica pueden ir en paralelo con stubs, pero el orden conceptual es:

```
1. REQ-68 ACCIONES (Manifest Engine)         ← base habilitante
       │
       ▼
2. REQ-69 VISTAS + Ejes                       ← consume Acciones
       │
       ▼
3. REQ-71 INBOX  +  REQ-73 ALERTAS            ← paralelos, ambos consumen Acciones + Vistas
       │                  │
       │                  ▼
       │            (REQ-73 emite eventos REPORT_DEPENDENCY)
       │                  │
       └──────────────────┴──→  4. REQ-59 REPORTES   ← consume Alertas perfil A
                                       │
                                       ▼
                          5. REQ-74 DASHBOARD          ← counters de Inbox + Alertas + Reportes
```

Justificacion:

- **Acciones primero** — sin manifest engine no hay capabilities, ni dialogs, ni audit trail. Todo lo demas depende de el.
- **Vistas segundo** — provee `<ClosureModal>` shared, drag-drop y el motor del Tablero. Inbox y Alertas (perfil B) no pueden cerrar sin esto.
- **Inbox y Alertas en paralelo** — comparten tipos canonicos (`TimelineEvent`, `Comment`) y el `<Drawer>` shared. Pueden coordinarse sin bloquearse.
- **Reportes despues de Alertas** — el mecanismo `REPORT_DEPENDENCY` (perfil A en Alertas) es el target del canal de eventos de Reportes.
- **Dashboard al final** — sus counters consultan los endpoints de los 3 list-shaped. Sin esos endpoints no hay Dashboard funcional.

Este orden NO es un waterfall obligatorio. Es la secuencia logica para que cada REQ encuentre sus dependencias resueltas. Para acelerar, Tech puede encarar varios en paralelo con interfaces stub que se reemplazan cuando el upstream cierra.

---

## Convenciones aprendidas durante el cleanup

Captura de gotchas y decisiones que valen la pena preservar para sesiones futuras del PM:

### Sobre el contenido de los REQs transversales

- **El REQ debe satisfacer la capacidad base, no enriquecerse con todo el detalle del spec OpenSpec del prototipo.** Ej: para Alertas, "habilita gestionar alertas de todas las areas con taxonomia de 4 perfiles" es la capacidad. NO incluir cada anti-pattern del spec, cada column constraint, cada ARIA rule. Eso vive en el spec OpenSpec del template; el REQ no lo replica.
- **Tech no tiene acceso a la knowledge base de Producto.** Las descriptions NO referencian `framework/...`, `prototypes/...`, `discoveries/...`, `features/...`, ni paths a `spec.md`, `.vue`, `.ts`. Si el REQ necesita una referencia, va a otro REQ o AM de Jira.
- **El bloque `## Referencias` al final de las descriptions previas era ruido para Tech.** Removido en el cleanup. Las referencias relevantes (a otros REQs/AMs) quedan inline en el body cuando aportan al alcance.
- **Mencionar prototipos de referencia inline ("FIN tiene un prototipo activo en `prototypes/fin/...`") rompe el contrato de auto-contenidad.** Reformular sin paths o remover. La mencion al prototipo vive en este discovery, no en el REQ.

### Sobre las AM stories espejo

- **Cada REQ transversal genera una AM story espejo via Jira automation** cuando entra a SENT TO DEV. La automation copia la description del REQ al momento del trigger.
- **Mantener AM y REQ alineadas es responsabilidad del PM cuando el REQ se reedita post-promocion.** Convencion adoptada: agregar al inicio de la AM una nota:
  > **Nota.** Esta development story es espejo de REQ-XX. Si hay divergencia entre este texto y REQ-XX, prevalece REQ-XX.
- **JQL util para listar las AM espejo de los transversales:**
  ```
  project = AM AND summary ~ "Infraestructura Transversal del Core"
  ```
  Devuelve las 6 stories espejo (AM-1004, AM-1016, AM-1017, AM-1018, AM-1019, AM-1020).

### Sobre el enrichment process

- **El enrichment puede generar comentarios "Addendum — Auditoria de cobertura contra OpenSpec"** que filtran KB refs hacia el REQ. Si se aplica enrichment a un REQ transversal, hay que limpiar el comment manualmente despues.
- **No existe API/MCP para borrar o editar comentarios de Jira via Atlassian MCP.** El borrado va manualmente desde la UI de Jira. Los `editJiraIssue` solo modifican fields, no comments.

### Sobre el naming

- **Convencion de title para los 6 transversales:** `[MODULO/FUNC] — Infraestructura Transversal del Core`. Aplica tanto al REQ como al AM espejo.
- **Convencion del Caracter en metadata:** `Permanente — habilita uno de los 4 modulos genericos del financial-core` (para los 4 genericos) o `Permanente — habilita un estandar consumido por todos los modulos del core` (para Acciones y Vistas).

---

## Decisiones pendientes

Trabajos abiertos que dependen de decisiones que aun no se cerraron:

### Matriz canonica de capabilities del core

REQ-68 (Acciones) declara como dependencia externa una "matriz canonica de capabilities" (set de roles transversales: `ANALISTA_CONTABLE`, `OPS_OFFICER`, `TREASURY`, `ADMIN_FIN`, etc.) que el capability provider expone al motor. Esa matriz no esta cerrada todavia. Al arranque del REQ se acuerda un set inicial; la decision definitiva queda pendiente entre Producto + Tecnologia.

### `target_role` conventions cross-app

INBOX (REQ-71) y ALERTAS (REQ-73) usan `target_role` para routing. Que roles canonicos expone cada app del core para ser target de Solicitudes/Alertas no esta documentado en un solo lugar. Cuando OPS, FIN, LEX, TRD, CLP cierren sus REQs por area, cada uno declara sus roles. Vale juntarlos en una pieza unica (probablemente en este discovery o en uno hermano) cuando se acumule masa critica.

### Migracion REQ-52 + REQ-33 → REQ-73

REQ-52 (LEX Alertas) y REQ-33 (TRD Alertas) ya estan vinculados a REQ-73 via `is caused by`. Pero el contenido de esos REQs todavia describe la implementacion como si entregaran infra propia. Pendiente: reescribir REQ-52 y REQ-33 para que **solo declaren la configuracion del dominio** (ALERT_TYPEs, perfiles, payloads, closeActions, severidades, reglas de deteccion) y consuman REQ-73 para todo lo estructural.

Esto se hace cuando se retome trabajo de LEX o TRD en una sesion futura. No urgente — el linkado via `is caused by` ya orienta a Tech para que sepa que la infra esta en REQ-73.

### Estado real de adopcion por app

La matriz de §"Matriz de adopcion" tiene buena cobertura conceptual pero la columna de status de implementacion es estimacion. Para precisarla hace falta:

1. Relevar el repo de cada app del core (`core-app-frontend` para CLP, `core-fin-frontend`, etc.) y ver qué de cada modulo transversal ya esta construido vs stub vs pendiente.
2. Cruzar con los REQs por area en Jira para ver qué hay declarado en backlog vs en progreso vs hecho.

Esto se hace progresivamente: cada vez que se toque un app en una sesion real, se actualiza la fila de la matriz con datos verificados.

### Ordenamiento real del rollout vs sugerido

El §"Orden de rollout sugerido" describe la secuencia conceptual ideal. Cuando Tech entre a refinement, puede priorizar distinto (ej: empezar por Reportes porque LEX-REQ-54 es el primer consumidor real). Vale revisar el orden con TPM cuando este onboarded.

### Notion / Cowork como workspace de la matriz

Una matriz cross-app tiende a verse mejor en una database de Notion que en una tabla markdown estatica. Si la matriz crece (mas apps, mas dimensiones, mas estados), eventualmente vale promocionarla a una database del workspace de Producto en Notion. Por ahora la version markdown es suficiente.

---

## Proximos pasos

1. Mantener este archivo como punto de entrada para coordinar el rollout de los 6 transversales. Actualizar `updated_at` cada vez que se toque.
2. Cuando un app concreto avance en adopcion (CLP, FIN, LEX, OPS, TRD), actualizar la celda correspondiente de la matriz.
3. Cuando se cierren las decisiones pendientes (matriz de capabilities, `target_role`, migracion de REQ-52 + REQ-33), agregar nota en este discovery + propagar a los REQs de Jira que correspondan.
4. Cuando aparezca un REQ por area que consuma uno de los transversales, vincularlo via `is caused by` al REQ transversal correspondiente y registrarlo aqui en §"Trazabilidad".

---

## Referencias

- `core-template-frontend-discovery.md` — paradigma del template del cual derivan los 6 transversales.
- Iniciativa Jira: [REQ-3 — Ardua Fintech: Financial Core as a Service](https://arduasolutions.atlassian.net/browse/REQ-3).
