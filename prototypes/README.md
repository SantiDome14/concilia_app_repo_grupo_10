# Prototypes — Convención y criterio

> Última actualización: 2026-04-29

## Propósito

Esta carpeta contiene **prototipos funcionales** que representan visualmente la funcionalidad definida en un discovery o feature spec. Son artefactos de **alineación y validación**, no entregables de diseño ni de desarrollo.

Un prototipo responde a la pregunta: **"¿esto es lo que acordamos?"**. Permite a stakeholders técnicos y no técnicos ver el flujo en funcionamiento antes de que Tecnología invierta en implementación real.

---

## Cuándo se crea un prototipo

- Cuando el scope justifica una validación visual antes de pasar a Ready for Dev.
- Cuando hay ambigüedad sobre cómo se comporta el flujo end-to-end y un diagrama estático no alcanza.
- Cuando hay múltiples stakeholders (legal, ops, finance, trading) que necesitan ver el mismo comportamiento para validarlo desde sus ángulos.

**No se crea un prototipo:**

- Como paso default en toda feature — solo cuando aporta más de lo que cuesta.
- Para reemplazar el discovery o el feature spec — lo ilustra, no lo sustituye.
- Como prep para el dev — los developers trabajan sobre el feature spec, no sobre el prototipo.

---

## Modalidades

Hay dos modalidades soportadas, según el scope justifique:

### 1. Single-file (`.html`)

Para validaciones rápidas. Un único archivo HTML autocontenido (HTML + JS + CSS embebidos). Ideal para flujos puntuales o demos breves.

### 2. Project folder

Para prototipos cuyo scope justifica un proyecto frontend real (con `package.json`, `src/`, build pipeline, etc.). Cada project folder debe incluir su propio `README.md` con: stack técnico, instrucciones de setup, hipótesis que valida.

---

## Estructura

Un folder por aplicación del core o por producto transversal:

```
prototypes/
├── _core-template/                  ← template base para nuevos prototipos project-folder
├── clp/
│   └── clp-rfq-prototype.html       ← single-file
├── trd/
│   ├── trd-rfq-prototype.html
│   ├── trd-notifications-prototype.html
│   └── trd-proveedores-prototype.html
├── ops/
│   ├── ops-acciones-prototype.html
│   └── ops-inbox-prototype.html
├── lex/
│   ├── lex-alertas-prototype.html
│   ├── lex-blacklist-prototype.html
│   ├── lex-operatoria-prototype.html
│   └── lex-reporteria-prototype.html
├── fin/
│   └── fin-prototype.html
└── [producto-transversal]/          ← ej: prime-desk-rfq/
    └── ...
```

Si un prototipo es transversal (atraviesa varias aplicaciones del core), vive en el folder de la aplicación dominante o en un folder nombrado por el producto.

---

## Convención de nombres

### Single-file

```
[aplicacion]-[name]-prototype.html
```

### Project folder

```
[aplicacion]-[name]-prototype/
```

Reglas:

- Todo en **kebab-case** (palabras separadas por guiones, nunca underscores).
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- Sufijo `-prototype` obligatorio para distinguirlos de otros assets.

**Ejemplos:**

```
clp-rfq-prototype.html                      ← single-file
trd-rfq-prototype.html                      ← single-file
fin-tesoreria-prototype/                    ← project folder
prime-desk-rfq-prototype/                   ← project folder transversal
```

---

## Versionado

El versionado lo maneja **Git**. Los prototipos no llevan sufijos `v[N]` para iteraciones normales — el historial vive en el log de commits.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: cuando una iteración cambia el enfoque del prototipo a un punto en que conviene preservar la versión previa como referencia (ej: el flujo cambió radicalmente y se quiere conservar la opción descartada para auditoría). En ese caso se crea un archivo/folder nuevo con el sufijo y el original se mantiene.

---

## Ciclo de vida

Un prototipo se mantiene vivo mientras su feature asociada esté en definición. Una vez que:

- La feature está en **Ready for Dev** en Jira
- Y el prototipo ya no se usa para validación activa

El prototipo queda como **artefacto histórico** (se preserva en el repo, no se borra). Si la feature se re-abre o pivota, se itera el prototipo en el mismo archivo (Git preserva el histórico) o se crea un fork con sufijo `v[N]` si el cambio es conceptualmente distinto.

---

## Archivos auxiliares

Algunos prototipos llevan archivos auxiliares (manifests de acciones, schemas, briefings de generación). Estos viven dentro de la carpeta del prototipo correspondiente o en una subcarpeta dedicada (ej: `prototypes/[aplicacion]/manifests/`). No se mezclan con los archivos `.html` del prototipo en sí.
