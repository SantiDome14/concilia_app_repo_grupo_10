# Prototypes — Convención y criterio

> Última actualización: 2026-05-04

## Propósito

Esta carpeta contiene la **representación visual y navegable** de cada producto del financial-core de Ardua. Los prototipos son artefactos de **alineación y validación** con stakeholders antes de que Tecnología invierta en construcción.

Un prototipo responde a la pregunta: **"¿esto es lo que acordamos?"**.

---

## Lugar en la triada

```
Investigar → Definir → Prototipar
discoveries/    features/   prototypes/
```

Los prototipos son la **expresión visual** de lo definido en `features/`. Existen para validar que la definición funciona end-to-end y que es comprensible para los stakeholders no técnicos.

### Cardinalidad

- **Features → Prototypes: 1-1 a nivel producto.** Cada `features/[aplicacion]/` tiene una contraparte `prototypes/[aplicacion]/`. Cuando se trabaja en una capacidad puntual del producto, el resto del prototipo está siempre a un click de distancia para dar contexto.

- **Una capacidad puntual ≠ un prototipo independiente.** Las features individuales (p. ej. `clp-rfq.md`, `clp-earn.md`) se reflejan como **vistas o módulos dentro del mismo prototipo del producto** (`prototypes/clp/`).

---

## Estructura

Una **carpeta por cada producto del financial-core**, en formato de proyecto frontend:

```
prototypes/
├── clp/
│   ├── README.md                ← stack, setup, alcance del prototipo
│   ├── package.json
│   ├── src/
│   ├── public/
│   └── ...
├── trd/
│   └── ...
├── lex/
│   └── ...
├── ops/
│   └── ...
└── fin/
    └── ...
```

Cada carpeta es un **proyecto frontend autocontenido**: tiene su `package.json`, `src/`, build pipeline, dependencias declaradas. Cualquier PM (o stakeholder) puede clonar el repo, ejecutar `npm install && npm run dev` dentro del prototipo, y ver el producto funcionando.

### El `README.md` del prototipo

Cada `prototypes/[aplicacion]/README.md` documenta:

- **Stack técnico** — framework, librerías clave, versiones.
- **Setup** — comandos para instalar y correr localmente.
- **Alcance del prototipo** — qué del producto está representado, qué quedó fuera del prototipo, qué hipótesis valida.
- **Vinculación con `features/`** — referencias a los archivos de `features/[aplicacion]/` que el prototipo refleja.

---

## Cuándo se itera un prototipo

- Cuando se agrega o cambia una feature en `features/[aplicacion]/`.
- Cuando una validación con stakeholders revela que el flujo no se entiende como se acordó.
- Cuando una hipótesis de `discoveries/` se concluye y modifica visualmente el producto.

**No se itera un prototipo:**

- Para reemplazar la definición de una feature. La definición vive en `features/`; el prototipo la refleja.
- Como entregable de diseño o de desarrollo. El prototipo es de **alineación**; el diseño y el desarrollo lo asume Tecnología sobre el feature spec.

---

## Convención de nombres

```
prototypes/[aplicacion]/         ← carpeta del producto, en formato proyecto frontend
```

Reglas:

- Todo en **kebab-case**.
- **ASCII only** — sin acentos, sin `ñ`, sin caracteres especiales. Set permitido: `[a-z0-9-]`.
- Los archivos internos del proyecto frontend siguen las convenciones del stack elegido (no necesariamente kebab-case — p. ej. en proyectos Vue o React, los componentes pueden ir en PascalCase).

**Ejemplos:**

```
prototypes/clp/                  ← prototipo del Client Portal
prototypes/trd/                  ← prototipo del Trading Desk
prototypes/lex/                  ← prototipo de LEX
prototypes/ops/                  ← prototipo de OPS
prototypes/fin/                  ← prototipo de FIN
```

---

## Productos sin prototipo

**No tienen carpeta en `prototypes/`:**

- **Sistemas transversales** que viven solo como discovery (`core-template-frontend`, `jira-automations`, `observabilidad`).
- **Productos deprecados** o absorbidos por otros.

La regla es: si tiene carpeta en `features/`, tiene carpeta en `prototypes/`. Si no tiene en `features/`, no tiene en `prototypes/`.

---

## Versionado

El versionado lo maneja **Git**. Los prototipos no llevan sufijos `v[N]` para iteraciones normales — el historial de iteración vive en el log de commits.

El sufijo `v[N]` se reserva **solo para forks conceptuales reales**: cuando una iteración cambia el enfoque del prototipo a un punto en que conviene preservar la versión previa como referencia (p. ej. dos enfoques visuales del mismo producto que conviven mientras se decide cuál se queda). En ese caso se crea una carpeta nueva con el sufijo y la original se mantiene.

---

## Build, deploy y compartibilidad

Cada prototipo es un proyecto frontend independiente. Algunas pautas operativas:

- **Dependencias compartidas.** Si varios prototipos comparten infraestructura frontend (p. ej. el `core-template-frontend`), las dependencias se gestionan a nivel de cada prototipo individual. No hay un workspace común.
- **`.gitignore` propio.** Cada prototipo respeta el `.gitignore` raíz del repo (`node_modules/`, `dist/`, etc.) — no es necesario uno por prototipo salvo que tenga reglas adicionales.
- **Compartir con stakeholders.** Si se necesita compartir un prototipo con stakeholders no técnicos, considerar deploy a Vercel/Netlify/GitHub Pages. Documentar la URL pública en el `README.md` del prototipo.

---

## Creación de una carpeta nueva

Una carpeta nueva en `prototypes/` se crea cuando se incorpora un producto nuevo al financial-core (mismo trigger que `features/`). El proceso típico es:

1. La carpeta correspondiente en `features/[aplicacion]/` ya existe (o se crea simultáneamente).
2. Crear `prototypes/[aplicacion]/` y bootstrappear el proyecto frontend (Vue/React/etc., según convenga).
3. Crear el `README.md` del prototipo con stack, setup y alcance inicial.
4. Iterar a medida que `features/[aplicacion]/` se va poblando.

Mantener la simetría 1-1 entre `features/` y `prototypes/` es no-negociable.
