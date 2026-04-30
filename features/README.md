# Features — Convención y criterio

> Última actualización: 2026-04-30

## Propósito

Esta carpeta es la **fuente de verdad del estado actual** de cada producto del financial-core de Ardua. Cuando un PM (o cualquier otra persona en la compañía) quiere entender qué es un producto hoy, qué hace, qué módulos tiene y en qué estado está — la respuesta vive acá.

`features/` responde a la pregunta: **"¿qué tenemos construido y definido hoy?"**.

---

## Lugar en la triada

```
Investigar → Definir → Prototipar
discovery/    features/   prototypes/
```

`features/` es el **eje** del bucle. Las hipótesis de `discovery/` propagan sus conclusiones acá; los prototipos en `prototypes/` reflejan lo que está acá.

### Cardinalidad

- **Discovery → Features: N-N.** Un feature puede recibir aportes de varios discoveries. Un discovery puede impactar varios features. Ver `discovery/README.md`.
- **Features → Prototypes: 1-1 a nivel producto.** `features/clp/` ↔ `prototypes/clp/`. Cada producto tiene un prototipo único; los features individuales se reflejan como vistas/módulos dentro del mismo prototipo.

---

## Estructura

Una **carpeta por cada producto del financial-core**, más una carpeta especial `common/` para features transversales:

```
features/
├── clp/
│   ├── README.md                              ← estado global del producto
│   ├── clp-rfq.md                             ← feature individual
│   ├── clp-earn.md                            ← feature individual
│   └── ...
├── trd/
│   ├── README.md
│   ├── trd-proveedores-de-liquidez.md
│   └── ...
├── lex/
│   ├── README.md
│   ├── lex-alertas.md
│   ├── lex-limites.md
│   └── ...
├── ops/
│   └── README.md
├── fin/
│   └── README.md
└── common/                                    ← features transversales (cross-product)
    ├── README.md
    ├── [capacidad].md                         ← sin prefijo de aplicación
    └── ...
```

### `features/common/` — features transversales

`features/common/` agrupa **features transversales** — capacidades que cruzan dos o más productos del financial-core con la misma semántica (notificaciones unificadas, alertas, inbox transversal, sistema de acciones, etc.). Ver `features/common/README.md` para el detalle.

**Importante:** los archivos dentro de `features/common/` **no llevan prefijo de aplicación** (la carpeta ya define el contexto). En cambio, los archivos dentro de carpetas de productos específicos sí lo llevan (`clp-rfq.md`, no `rfq.md`).

### El archivo `README.md` de cada producto

Es el **archivo global**: describe el producto end-to-end. Lo primero que un PM lee al entrar a la carpeta. Cubre:

- **Propósito** — qué problema resuelve, para quién.
- **Módulos** — qué módulos componen el producto y en qué estado está cada uno.
- **Estado actual** — qué está construido, qué está en construcción, qué está pendiente.
- **Decisiones clave** — las decisiones de diseño que sobrevivieron y por qué.
- **Frentes abiertos** — qué se está investigando o validando hoy (con referencia a los discoveries correspondientes).
- **Stakeholders** — quiénes son los referentes funcionales del producto.

GitHub renderiza este `README.md` automáticamente al entrar a la carpeta del producto, así que es la primera puerta de entrada.

### Los archivos individuales `[aplicacion]-[modulo-o-feature].md`

Cada uno consolida la **especificación** de una feature o un módulo específico. Cubre:

- **Contexto** — el problema que resuelve y el contexto operativo.
- **Objetivo** — el objetivo funcional, en bullets.
- **Alcance funcional (numerado)** — lista de capacidades que constituyen la feature.
- **Fuera de alcance** — qué queda explícitamente fuera.
- **Criterios de aceptación** — cómo se valida que la feature funciona.

**No incluye:** modelos de datos, endpoints, contratos de API, decisiones arquitectónicas, flujos de implementación. Esos elementos viven en el PRD técnico bajo ownership de Tecnología.

---

## Convención de nombres

```
features/[aplicacion]/                                  ← carpeta por producto
features/[aplicacion]/README.md                         ← archivo global
features/[aplicacion]/[aplicacion]-[modulo-o-feature].md ← feature individual

features/common/                                        ← carpeta de features transversales
features/common/README.md                               ← archivo global de transversales
features/common/[capacidad].md                          ← feature transversal (sin prefijo)
```

Reglas:

- Todo en **kebab-case**.
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- Las features individuales dentro de carpetas de producto **mantienen el prefijo de aplicación** (`clp-rfq.md`, no `rfq.md`). Cuando un PM mencione el feature en Slack, en un commit, o en una conversación, el nombre completo es inequívoco sin necesidad de contexto.
- Las features dentro de `features/common/` **no llevan prefijo de aplicación** — la carpeta ya define el contexto.

**Ejemplos:**

```
features/clp/README.md
features/clp/clp-rfq.md
features/clp/clp-earn.md
features/trd/README.md
features/trd/trd-proveedores-de-liquidez.md
features/lex/lex-alertas.md
features/lex/lex-limites.md
features/common/notificaciones.md
features/common/alertas.md
```

---

## Productos del financial-core

Hoy las carpetas activas en `features/` corresponden a:

- `features/clp/` — Client Portal
- `features/trd/` — Trading Desk
- `features/lex/` — Legal file management
- `features/ops/` — Operations
- `features/fin/` — Finance
- `features/common/` — Features transversales (cross-product)

**No tienen carpeta en `features/`:**

- Sistemas transversales de **infraestructura** que viven solo como discovery (`core-template-frontend`, `jira-automations`, `observabilidad`). Éstos NO se confunden con `features/common/` — la diferencia está en §"`features/common/`".
- Productos que fueron deprecados o absorbidos por otros (p. ej. COM, deprecado).

---

## Versionado

El versionado lo maneja **Git**. Los feature files no llevan sufijos `v[N]` para iteraciones normales — el historial vive en el log de commits.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: pivotes, cambios de dirección, scope significativamente redefinido. En ese caso se crea un archivo nuevo con el sufijo y el original se mantiene como referencia histórica.

---

## Cuándo se actualiza

| Evento | Acción |
|---|---|
| Una hipótesis del discovery se valida y aplica al producto | Actualizar el feature file correspondiente o el `README.md` global |
| Se agrega un módulo o capacidad al producto | Actualizar `README.md` del producto + crear `[aplicacion]-[modulo].md` |
| Cambia el estado de una feature (en construcción → released) | Actualizar `README.md` del producto |
| Cambia una decisión de diseño previamente consolidada | Actualizar el feature file correspondiente y registrar la decisión en el header |

Toda actualización debe mantener consistencia con el prototipo correspondiente en `prototypes/[aplicacion]/`. Si la actualización afecta la representación visual del producto, proponer iterar el prototipo.

---

## Creación de una carpeta nueva

Una carpeta nueva en `features/` solo se crea cuando se incorpora **un producto nuevo al financial-core**. No se crean carpetas para sistemas transversales de infraestructura ni para módulos individuales (los módulos viven como archivos dentro de la carpeta del producto que los contiene).

Antes de crear:

1. Confirmar con el Head of Product que el alcance amerita una carpeta de producto.
2. Crear la carpeta y un `README.md` inicial (puede arrancar con un esqueleto mínimo y poblarse en sesiones siguientes).
3. Crear la carpeta correspondiente en `prototypes/[aplicacion]/` para mantener la simetría 1-1 (no aplica para `features/common/`, que no tiene prototipo único).
