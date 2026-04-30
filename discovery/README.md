# Discovery — Convención y criterio

> Última actualización: 2026-04-29

## Propósito

Esta carpeta contiene los **Living Discovery Documents** de Ardua: la fuente de verdad conceptual sobre cómo funciona (o debería funcionar) cada aplicación del core y cada módulo del negocio.

Un discovery document responde a la pregunta: **"¿qué sabemos hoy de X y cómo opera?"**. Captura modelo conceptual, arquitectura, decisiones cerradas, hipótesis bajo validación, preguntas abiertas, y blockers activos. Es un documento **vivo** — se actualiza con cada sesión de producto que aporte aprendizaje nuevo.

---

## Discovery-First Principle

> **Antes de trabajar en cualquier feature o iniciativa sobre una aplicación del core o módulo, el punto de partida obligado es leer el discovery correspondiente. Si no existe, lo primero es proponer crearlo antes de avanzar.**

Toda feature work genera nuevos hallazgos que deben volver al discovery para mantenerlo vivo. El discovery alimenta la feature, la feature actualiza el discovery, y el ciclo se repite hasta que el discovery madura y genera un feature spec estable.

---

## Estructura active / archived

Un discovery vive en uno de dos estados:

| Estado | Ubicación | Significado |
|---|---|---|
| **Active** | `discovery/active/` | Discovery activo — hipótesis bajo validación, preguntas abiertas, blockers sin resolver. |
| **Archived** | `discovery/archived/` | Discovery archivado — todas las hipótesis están resueltas (validadas, descartadas o definidas) y el feature spec derivado ya vive en `features/`. |

> **Nota sobre el nombre.** La definición firme de lo que se va a construir vive en `features/`, no en `archived/`. Lo que vive en `archived/` es el **registro histórico del proceso de validación** — qué hipótesis se probaron, cuáles se descartaron, qué decisiones sobrevivieron. Sirve para auditoría y aprendizaje.

### Trigger de archivo

Al final de cada iteración sobre un discovery en `active/`, el sistema debe evaluar si **todas las hipótesis, preguntas abiertas y decisiones pendientes están resueltas**. Cuando el documento está maduro, el sistema debe proponer:

1. **Generar o actualizar** el archivo `features/[aplicacion]-[feature].md` correspondiente, consolidando las definiciones cerradas.
2. **Mover** el discovery de `active/` a `archived/` y registrar en un header de cierre al inicio del archivo:
   - Fecha de archivo
   - Feature derivada (path al archivo en `features/`)
   - Resumen de 2-3 líneas con las decisiones clave que sobrevivieron

Si quedan hipótesis abiertas, el discovery permanece en `active/` y se proponen updates in-place, no archivo.

### Alineación de nombre con feature

Cuando un discovery se archiva y produce un feature spec, **el nombre del archivo de discovery debe coincidir con el nombre del feature** (más el sufijo `-discovery`). Esto garantiza trazabilidad entre el proceso de validación y la definición consolidada:

- `features/prime-desk-rfq-gateway.md` ↔ `discovery/archived/prime-desk-rfq-gateway-discovery.md`
- `features/com-pipeline-comercial.md` ↔ `discovery/archived/com-pipeline-comercial-discovery.md`

---

## Taxonomía — Aplicación del core vs Módulo

Ardua organiza su software en dos niveles jerárquicos:

### Aplicación del core (nivel top)

Aplicación con identidad propia, repositorio propio, y roles de usuario definidos dentro del ecosistema Ardua Core. Son seis:

- **TRD** — Trading Desk
- **OPS** — Operations
- **LEX** — Legal file management
- **CLP** — Client Portal
- **COM** — Comercial
- **FIN** — Finance

También entran en este nivel los **sistemas transversales** que no son una aplicación del core en sentido estricto pero ocupan un rol top-level:

- `core-template-frontend` — infraestructura frontend compartida
- `jira-automations` — automatizaciones Jira
- `observabilidad` — stack de monitoring
- Productos completos multi-aplicación (ej: `prime-desk-rfq`, `ardua-pnl-report`)

### Módulo (dentro de una aplicación del core)

Bloque funcional con modelo conceptual y arquitectura propios, que vive dentro de una aplicación del core. Ejemplos:

- **Proveedores de Liquidez** — módulo de TRD
- **Clientes** — módulo presente en TRD, LEX y otras aplicaciones
- **Earn** — módulo de CLP
- **Accounts** — módulo de CLP
- **Límites** — módulo de LEX

Un módulo no es una feature: es un componente estable que **acumula features** a lo largo del tiempo. Las features individuales viven en Jira como REQ-XX y se reflejan en el discovery del módulo como registro de estado (qué hay, qué está en curso, qué fue entregado).

---

## Convención de nombres

Formato base:

```
[aplicacion]-discovery.md                   ← discovery de una aplicación del core
[aplicacion]-[modulo]-discovery.md          ← discovery de un módulo dentro de una aplicación
```

Reglas:

- Todo en **kebab-case** (minúsculas, palabras separadas por guiones). Sin underscores, sin PascalCase.
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- Siempre termina en `-discovery.md`.
- El prefijo `[aplicacion]-` agrupa alfabéticamente la aplicación del core y sus módulos en el listado de la carpeta.

**Ejemplos:**

```
trd-discovery.md                            ← aplicación del core TRD
trd-proveedores-de-liquidez-discovery.md    ← módulo Proveedores dentro de TRD
clp-discovery.md                            ← aplicación del core Client Portal
ops-discovery.md                            ← aplicación del core OPS
lex-limites-discovery.md                    ← módulo Límites dentro de LEX
```

### Relación padre ↔ hijo

El discovery de una aplicación del core actúa como **índice**: menciona cada módulo, resume su propósito y estado, y enlaza al discovery específico cuando existe. Los discoveries de módulos son la **fuente de detalle**: modelo de datos, arquitectura interna, decisiones de implementación. El padre no duplica el detalle del hijo.

---

## Versionado

El versionado lo maneja **Git**. Los archivos de discovery no llevan sufijos `v[N]` para iteraciones normales — el historial vive en el log de commits.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: pivotes, cambios de dirección, scope significativamente redefinido. En ese caso se crea un archivo nuevo con el sufijo (ej: `trd-proveedores-de-liquidez-discovery-v2.md`) y el original se mantiene como referencia histórica del enfoque previo.

---

## Caso excepcional — Instancias paralelas

Cuando existen dos o más implementaciones independientes del mismo dominio (por ejemplo, una versión de producción y un MVP corriendo en paralelo, o una migración con versión vieja y nueva conviviendo temporalmente), cada una lleva un qualifier de instancia:

```
[dominio]-[instancia]-discovery.md
```

Regla: **si hay instancias paralelas, todas deben llevar qualifier. Ninguna queda como "default sin qualifier" compitiendo con otra que sí lo tiene.**

Este caso debe ser explícitamente temporal o justificado. Si surge, documentar en el archivo correspondiente por qué coexisten y cuál es el plan de consolidación.

---

## Creación de un archivo nuevo

Antes de crear uno nuevo:

1. Listar `discovery/active/` y `discovery/archived/` y verificar si ya existe uno para el mismo scope.
2. Si existe y cubre el mismo dominio → actualizar, no duplicar.
3. Si se trata de un módulo nuevo dentro de una aplicación del core existente → usar `[aplicacion]-[modulo]-discovery.md` y agregar referencia en el discovery de la aplicación padre.
4. Si se trata de una aplicación del core nueva o sistema transversal nuevo → usar `[aplicacion]-discovery.md`.

Si no existe un discovery para lo que se va a trabajar, **el primer paso de la sesión es proponer crearlo** (Discovery-First).

---

## Soft deletes

Los archivos obsoletos no se borran físicamente. Se prefijan con `.trash-` para ocultarlos en listados pero preservar el contenido por si se necesita auditarlo.

```
.trash-CLP_Session_Context.md                          ← versión previa reemplazada por clp-discovery.md
.trash-OPS_Session_Context.md                          ← versión previa reemplazada por ops-discovery.md
```

Una limpieza periódica puede borrarlos definitivamente cuando no haya riesgo de necesitar el histórico.

---

## Snapshots de handoff (caso excepcional)

Los discoveries son living documents — no capturan un momento puntual sino el estado actual del dominio. Cuando una sesión se interrumpe abruptamente (timeout del MCP, cambio de máquina, traslado al móvil) y se necesita preservar el estado intermedio del trabajo para retomarlo después, puede crearse un **snapshot de handoff** con naming distinto:

```
session-context-[tema]-YYYY-MM-DD.md
```

Propiedades:

- **Es temporal y efímero.** Captura un momento puntual de una sesión interrumpida.
- **No es un discovery.** Convive con el discovery del dominio; no lo reemplaza.
- **Se soft-deletea apenas se retoma** y se consolida en el discovery correspondiente.

---

## Inventario vivo

Lista generada el 2026-04-29. Regenerar manualmente cuando se agreguen, renombren, muevan o archiven archivos.

### Active (`discovery/active/`)

| Archivo | Nivel | Scope |
|---|---|---|
| `clp-discovery.md` | Aplicación del core | Client Portal |
| `com-discovery.md` | Aplicación del core | Comercial |
| `core-template-frontend-discovery.md` | Transversal | Template frontend de producción (Vue 3 + TS) |
| `fin-discovery.md` | Aplicación del core | FIN (Finance) — taxonomía v3 + Anexo de modelo conceptual de dimensiones del registro |
| `jira-automations-discovery.md` | Transversal | Automatizaciones Jira |
| `lex-discovery.md` | Aplicación del core | LEX (Legal) |
| `lex-alertas-discovery.md` | Módulo | LEX · Alertas (canónico Perfil B Workflow del financial-core) |
| `lex-limites-discovery.md` | Módulo | LEX · Límites |
| `observabilidad-discovery.md` | Transversal | Observabilidad |
| `ops-discovery.md` | Aplicación del core | OPS (Operations) — incluye OPS-Inbox como primer canónico de Inbox del financial-core |
| `trd-discovery.md` | Aplicación del core | TRD (Trading Desk) |

### Archived (`discovery/archived/`)

| Archivo | Feature derivada | Archivado |
|---|---|---|
| `pnl-discovery.md` | `features/ardua-pnl-report.md` | 2026-04-23 |
| `prime-desk-rfq-gateway-discovery.md` | `features/prime-desk-rfq-gateway.md` | 2026-04-23 |
| `trd-proveedores-de-liquidez-discovery.md` | (pendiente migración a `features/`) | — |
