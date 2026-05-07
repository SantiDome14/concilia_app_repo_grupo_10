- Jira REQ: —
- Module: core-template (foundation)
- Tier: 2 — usado por OPS (instruction attributes); candidato en LEX y TRD para metadata flexible

# Add DynamicKeyValueFields component (variable list of key-value pairs)

## Why

OPS `InstructionForm` tiene un patrón de "attributes" donde el usuario agrega/quita filas de pares clave-valor en runtime, con `index_order` para preservar el orden. Es un primitivo de **metadata flexible** que aparece en cualquier dominio donde el contrato del backend acepta `Record<string, unknown>` extensible: payment routing instructions (OPS), document metadata (LEX en futuro), quote metadata (TRD), trade attributes en general. Hoy OPS lo construye inline con lógica embebida; sin un primitivo canónico cada migración va a duplicar el patrón con bugs sutiles distintos (perdida de orden al reorderar, mal manejo de duplicate keys, validación inconsistente).

Esta change cierra el gap. Define `<DynamicKeyValueFields>` como el primitivo canónico: lista de filas `{ key, value, index }` con add/remove/reorder, validación per-fila, output canónico ordenado, y mapping a un nuevo manifest field type `key-value-array`.

## What Changes

- **`core-forms`** — dos requirements añadidas:
  - **ADDED** "DynamicKeyValueFields component MUST manage a reorderable list of key-value rows with per-row validation" — define el componente: lista vertical de filas, cada fila con input para `key`, input para `value`, drag handle, botón remove; botón "Agregar fila" al final; reorder via `vueuse/useDraggable`; validación per-fila (vee-validate scope nested); detección de duplicate keys (warning chip o validation error según configuración); output canónico `Array<{ key: string; value: string; index: number }>` con `index` reasignado en cada reorder; props `minRows`/`maxRows`; slots para custom field types per columna (key puede ser `<Select>` cuando el set de keys es fijo, value puede ser cualquier field type).
  - **ADDED** "Manifest dialog `key-value-array` field type MUST render as DynamicKeyValueFields with the declared key/value schemas" — añade `key-value-array` al manifest engine: schema para key (`text` con regex opcional o `select` con options) y para value (cualquiera de los field types soportados); zod array con per-element refinements.

## Capabilities

### Affected Capabilities

- `core-forms` — dos requirements añadidas.

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-theming` — drag handle, hover states, focus rings; no hardcoded colors.
- Compone con `core-actions-manifest` — `key-value-array` es un nuevo field type aceptado por el motor.

## Notes

- El spec NO contracta **autocomplete** sobre el input de key (sugerir keys ya usadas en el array). Es un nice-to-have; out of v1.
- El spec NO contracta **drag & drop entre arrays** (mover una fila de un componente a otro). Cada componente es independiente.
- El spec NO contracta **bulk paste** ("pegar 10 filas desde un CSV"). Out of v1; si OPS necesita en el futuro, abre como extension.
- El spec NO contracta **edit-in-place vs separate dialog** — la spec elige edit-in-place (todas las filas editables siempre); separate dialog para edit es UX más pesada y no aplica al caso de uso.
