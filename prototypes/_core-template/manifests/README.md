# Manifests · Sistema de Acciones declarativas

Carpeta donde viven los manifests del sistema de Acciones del core de Ardua.
Cada manifest declara qué acciones existen para una combinación `app.modulo.[tipo_de_registro]`, cuándo se muestran, cuándo se habilitan, quién puede ejecutarlas y qué dialog abren.

Marco conceptual: `framework/marco-dimensiones-registros.md` §9 · `framework/financial-core-modules.md` §11.

---

## Por qué existe

Antes, las acciones contextuales del menú `⋯` de cada registro vivían hardcodeadas en el JS de cada prototipo (objetos `can` / `reason` / `tag` dentro de `togActions`). Cada módulo nuevo reescribía la misma lógica con sabor propio — divergencia inevitable entre prototipos y entre prototipos y producción.

Con el sistema declarativo:

- Las acciones son datos, no código. Vive en archivos `.js` separados por módulo.
- El motor (en el JS del template) las evalúa contra el registro y el usuario actual y devuelve solo lo aplicable.
- El dialog se genera dinámicamente desde el manifest — campos, tipos, lookups, validaciones declarados.
- El estado de imputación del registro se calcula automáticamente comparando los campos requeridos contra los asignados.
- El drag-drop del Kanban dispara el mismo motor: compone un dialog uniendo los campos de todas las acciones de la dimensión del eje.

---

## Forma del archivo

Convención de naming:

| Scope | Naming | Top-level |
|---|---|---|
| Por tipo de registro | `[app].[modulo].[tipo].actions.js` | `actions: [...]` |
| A nivel módulo | `[app].[modulo].actions.js` | `module_ctas: [...]` (sin `record_type`) |

Estructura mínima:

```js
window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};
window.ACTION_MANIFEST["[app].[modulo]"] = {
  "app": "...",
  "module": "...",
  "record_type": "...",
  "actions": [ /* ... */ ]
};
```

**Regla de JSON estricto.** El contenido entre `=` y `;` es JSON puro. Comillas dobles, sin trailing commas, sin comentarios internos, sin funciones, sin referencias a variables. Garantiza migración trivial a `.json` puro cuando tecnología pase el sistema a backend.

Schema completo: ver [`_schema.md`](./_schema.md) (legible) y [`_schema.json`](./_schema.json) (programático).

---

## Cómo se carga

Cada manifest se carga via `<script>` antes del script principal del prototipo:

```html
<script src="manifests/ejemplo.modulo-a.actions.js"></script>
<script src="manifests/[siguiente-manifest].actions.js"></script>
<!-- ... -->
<script>/* script principal del prototipo */</script>
```

No se usa `fetch()` — los archivos `.js` se cargan sincrónicamente por el browser y registran su entrada en `window.ACTION_MANIFEST`. Esto funciona con `file://` sin servidor local.

---

## Cuándo crear un manifest nuevo

- Cuando se agrega un módulo nuevo al prototipo.
- Cuando un módulo existente suma un tipo de registro nuevo (manifest separado por tipo).
- Cuando se identifican CTAs del header que no estaban modeladas y deben pasar por el sistema (manifest a nivel módulo con `module_ctas`).

---

## Validación

Al cargar (en `MANIFEST_DEV_MODE`), el motor corre `validateManifest()` contra el schema y loguea warnings en consola. La validación está implementada en JS plano (sin dependencias externas) y cubre:

- Presencia de campos top-level requeridos.
- Tipos válidos de `dimension` y `dialog.fields[].type`.
- Estructura básica de predicados (`show_when`, `enable_when`).
- Forma de `on_confirm`, `prerequisites`, `capabilities`, `batch`.

---

## Migración a `.json` puro

Cuando tecnología pase a servir manifests via API o leerlos como `.json`, la conversión es trivial:

```bash
sed -n '/^window\.ACTION_MANIFEST/,/^};/p' fin.operaciones.movimientos.actions.js \
  | sed 's/^window\.ACTION_MANIFEST\[".*"\] = //' \
  | sed 's/^};$/}/' \
  > fin.operaciones.movimientos.actions.json

# Validación:
node -e "JSON.parse(require('fs').readFileSync('fin.operaciones.movimientos.actions.json','utf-8'))"
```

Si la validación falla, el manifest violó la regla de JSON estricto — corregir y reintentar. Este check está documentado en el README del template (`prototypes/_core-template/README.md`) como obligatorio antes de subir un manifest.

---

## Catálogo de manifests del template

| Archivo | Scope | Descripción |
|---|---|---|
| [`ejemplo.modulo-a.actions.js`](./ejemplo.modulo-a.actions.js) | `record` | Manifest demo del Módulo Específico A. Cubre todas las capacidades del schema (lookup, select, textarea, prerequisites, batch, kanban_axes). Cuando un nuevo módulo entra al template, se duplica este manifest como punto de partida. |
