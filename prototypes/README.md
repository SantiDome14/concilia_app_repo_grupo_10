# Prototypes — Convención y criterio

> Última actualización: 2026-04-23

## Propósito

Esta carpeta contiene **prototipos funcionales** en HTML/JS que representan visualmente la funcionalidad definida en un discovery o feature spec. Son artefactos de **alineación y validación**, no entregables de diseño ni de desarrollo.

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

## Estructura

Un folder por aplicación del core o por producto transversal:

```
prototypes/
├── clp/
│   └── [nombre-prototipo].html
├── trd/
│   └── [nombre-prototipo].html
├── ops/
├── lex/
├── com/
├── fin/
└── [producto-transversal]/     ← ej: prime-desk-rfq/
    └── [nombre-prototipo].html
```

Si un prototipo es transversal (atraviesa varias aplicaciones del core), vive en el folder de la aplicación dominante o en un folder nombrado por el producto.

---

## Convención de nombres

```
[aplicacion]_[feature]_prototype[_vN].html
```

Reglas:

- Todo en **snake_case** (por compatibilidad histórica con los archivos HTML existentes).
- El sufijo `_vN` indica versiones del mismo prototipo (v1, v2, v3...).
- Las iteraciones significativas generan nuevo archivo con incremento de versión.

**Ejemplos:**

```
clp_rfq_prototype_v3.html
trd_rfq_prototype.html
trd_notif_prototype_v1.html
```

---

## Ciclo de vida

Un prototipo se mantiene vivo mientras su feature asociada esté en definición. Una vez que:

- La feature está en **Ready for Dev** en Jira
- Y el prototipo ya no se usa para validación activa

El prototipo queda como **artefacto histórico** (se preserva, no se borra). Si la feature se re-abre o pivota, se crea un nuevo prototipo (`_v2`, `_v3`) sin sobrescribir el anterior.

---

## Inventario vivo

Lista generada el 2026-04-23. Regenerar manualmente al agregar o renombrar archivos.

Subfolders existentes: (por completar cuando se organice el contenido actual)
