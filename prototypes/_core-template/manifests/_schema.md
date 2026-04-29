# Schema del Manifest de Acciones

> Contraparte legible de [`_schema.json`](./_schema.json).
> Define la forma de los manifests declarativos del sistema de Acciones del core de Ardua.
> Referencias: `framework/marco-dimensiones-registros.md` §9 · `framework/financial-core-modules.md` §11.

---

## 1. Forma del archivo

Cada manifest es un archivo `.js` que registra una entrada en `window.ACTION_MANIFEST`. **El contenido es JSON estricto**. El archivo `.js` solo existe para que el browser pueda cargarlo via `<script src="...">` sin necesidad de servidor local.

```js
// Archivo: manifests/[app].[modulo].[tipo].actions.js
window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};
window.ACTION_MANIFEST["framework.template.modulo_a"] = { /* JSON estricto */ };
```

**Reglas no negociables del contenido entre `=` y `;`:**

- Comillas dobles en todas las claves y strings.
- Sin trailing commas.
- Sin comentarios dentro del objeto.
- Sin referencias a variables JS (todo literal).
- Sin funciones, sin expresiones, sin template literals, sin `undefined`.

Validación rápida: la regex `sed -n '/^window\.ACTION_MANIFEST/,/^};/p' x.js | sed 's/^window\.ACTION_MANIFEST\[".*"\] = //' | sed 's/^};$/}/'` debe devolver JSON parseable por `JSON.parse`.

---

## 2. Top-level

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `app` | string | sí | App del core (`fin`, `ops`, `trd`, `lex`, `clp`, `com`, `framework`). |
| `module` | string | sí | Módulo dentro de la app. |
| `record_type` | string \| null | no | Tipo de registro al que aplica. `null` cuando es manifest a nivel módulo. |
| `scope` | enum `record` / `module` | no | Default `record` si hay `record_type`, `module` si es null. |
| `schema_version` | string | no | Default `"1.0"`. |
| `required_imputations` | array<string> | no | Default global de campos requeridos para `imputado`. |
| `required_by_type` | object | no | Map `record_type → required_fields[]`. Sobrescribe el default. |
| `kanban_axes` | array | no | Mapa de ejes Kanban a dimensiones del manifest (ver §6). |
| `actions` | array | no | Acciones contextuales sobre el registro. |
| `module_ctas` | array | no | CTAs del header del módulo (Crear, Cargar, Exportar). |

---

## 3. Acción contextual (`actions[i]`)

Cada acción describe una operación que el usuario puede disparar sobre un registro existente desde el menú `⋯`, desde el dialog compuesto del Kanban, o como CTA promovido en batch.

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id` | string | sí | Identificador global. Convención `[app].[modulo].[tipo].[dimension].[verbo_subject]`. |
| `dimension` | enum | sí | Una de `imputacion`, `registro_contable`, `conciliacion`, `governance`, `documentacion`, `cierre`. |
| `label` | string | sí | Texto del ítem en el menú. |
| `description` | string | no | Subtítulo / tooltip largo. |
| `icon` | string | no | Identificador del icono (resuelto por el motor). |
| `danger` | boolean | no | Marca el item como peligroso (color rojo). |
| `target_field` | string \| null | no | Campo del registro que la acción asigna. `null` si no muta un campo (ej. exportar). |
| `show_when` | predicado | no | Si está, el ítem solo aparece cuando evalúa true. |
| `enable_when` | predicado | no | Si está, el ítem aparece pero deshabilitado cuando evalúa false. |
| `disable_reason` | string | no | Tooltip en estado disabled. |
| `disable_tag` | string | no | Tag visible al lado del label cuando está disabled (ej. `V2`, `Estado`, `Permiso`). |
| `prerequisites` | array | no | Campos que deben tener valor antes de ejecutar (ej. `sociedad_id` antes de `cuenta_id`). |
| `capabilities` | object | no | Roles que habilitan la acción. |
| `dialog` | object | no | Forma del dialog que se renderiza al hacer click (§4). |
| `on_confirm` | object | no | Qué hace el motor al confirmar (§5). |
| `batch` | object | no | Configuración de ejecución en lote (§7). |

### 3.1 Predicados (`show_when` / `enable_when`)

| Forma JSON | Significado |
|---|---|
| `{"record_type_in": ["A","B"]}` | El campo `tipo` del registro está en la lista. |
| `{"record_type_not_in": ["A","B"]}` | El campo `tipo` NO está en la lista. |
| `{"field_is_null": "X"}` | El campo X es `null` o `undefined`. |
| `{"field_is_not_null": "X"}` | El campo X tiene valor. |
| `{"field_equals": {"field":"X","value":"Y"}}` | X tiene el valor Y. |
| `{"field_in": {"field":"X","values":["A","B"]}}` | X está en la lista. |
| `{"all": [pred1, pred2]}` | AND de varios predicados. |
| `{"any": [pred1, pred2]}` | OR de varios predicados. |

### 3.2 Prerequisites

```json
"prerequisites": [
  { "field": "sociedad_id", "message": "Asigná Estructura primero" }
]
```

Si `field` es null al momento de evaluar, la acción aparece deshabilitada con `message` como tooltip. Permite hacer cumplir orden de imputación sin escribir código.

### 3.3 Capabilities

```json
"capabilities": { "required_role_any_of": ["OPS_OFFICER", "ADMIN_FIN"] }
```

El motor compara contra el rol del usuario actual (`window.CURRENT_USER.role` en el prototipo, sistema de auth en producción). Si no matchea, la acción aparece con `disable_tag: "Permiso"` y tooltip explicativo.

---

## 4. Dialog

```json
"dialog": {
  "title": "Asignar Cliente al movimiento",
  "description": "Identificá el cliente de origen del depósito.",
  "fields": [
    { "id": "cliente_id", "label": "Cliente", "type": "lookup", "catalog": "clp.clientes", "required": true,
      "placeholder": "Buscar cliente...", "hint": "Sugerencia backend (autosuggest)" }
  ],
  "confirm_label": "Asignar",
  "cancel_label":  "Cancelar"
}
```

Tipos de field: `lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`.

- **`lookup`** — usa `catalog` (id resuelto por `resolveCatalog`). Soporta `catalog_filter` para filtrar dinámicamente desde un campo del registro (ej. cuentas por sociedad).
- **`select`** — usa `options[]` con `{value, label}`.
- **`textarea`** — soporta `max_length`.
- **`number`** — soporta `min` / `max`.

---

## 5. on_confirm

```json
"on_confirm": {
  "update_fields": ["cliente_id", "imputation_note", "imputed_by", "imputed_at"],
  "recompute": ["imputacion"],
  "audit": true,
  "toast": "Cliente asignado correctamente"
}
```

- `update_fields` — qué campos del registro escribe el motor con los valores del form.
- `recompute` — qué estados calculados refresca después del update (típicamente `imputacion`).
- `audit` — emite evento al audit log.
- `toast` — mensaje del toast post-confirm.

---

## 6. Kanban axes

```json
"kanban_axes": [
  {
    "axis_id": "imputacion",
    "dimension": "imputacion",
    "drop_target_state": "imputado",
    "states": ["pendiente", "en_proceso", "imputado"]
  }
]
```

Cuando el usuario drag-drop una card entre columnas del eje declarado:

1. El motor identifica las acciones del manifest cuya `dimension` matchea.
2. Filtra las que tienen `enable_when` true sobre el registro (típicamente `field_is_null` sobre el `target_field`).
3. Compone un dialog único uniendo los `dialog.fields[]` (sin duplicados).
4. Respeta `prerequisites`: campos cuyo prerequisito no se cumple aparecen disabled hasta que se complete su antecesor.
5. Al confirmar, ejecuta el `on_confirm` de cada acción aplicable; recomputa `imputacion`; aterriza la card en la columna que corresponda al estado calculado (no al destino del drag).

Cards en `drop_target_state` (`imputado`) no son draggables. Drag inverso (`imputado → en_proceso → pendiente`) está bloqueado por consistencia con la decisión §2 del prompt v3 (no Re-imputar v1); el dialog del drag inverso entre `en_proceso` y `pendiente` permite editar valores ya asignados.

---

## 7. Batch

```json
"batch": {
  "batchable": true,
  "homogeneity_check": [
    "all_records_pass_show_when",
    "all_records_have_field_null:cliente_id"
  ],
  "min_records": 2,
  "max_records": 100,
  "promote_to_main_cta": true,
  "main_cta_label_template": "Imputar Cliente a {N} movimientos"
}
```

Cuando `promote_to_main_cta: true` y el resultado filtrado actual cumple `homogeneity_check` con `min_records ≤ N ≤ max_records`, el subsistema promueve un botón al `.ph-actions` del header con label dinámico. Click ejecuta la acción sobre todos los registros del lote en una sola transacción + un solo audit log con `batch: true`.

---

## 8. Module CTAs

Para CTAs del header que no están atados a un registro específico (Crear, Cargar manual, Exportar):

```json
"module_ctas": [
  {
    "id": "framework.template.modulo_a.governance.crear_registro",
    "label": "Crear Registro",
    "dimension": "governance",
    "is_module_cta": true,
    "creates_record_type": "registro_demo",
    "capabilities": { "required_role_any_of": ["ADMIN", "OPS_OFFICER"] },
    "dialog": { /* ... */ },
    "on_confirm": { /* ... */ }
  }
]
```

El subsistema renderiza estos como botones del `.ph-actions` (no como ítems del menú `⋯`). Mantienen el mismo motor de capabilities y dialog.

---

## 9. Validación

`validateManifest(manifest, schema)` corre al cargar (cuando `window.MANIFEST_DEV_MODE === true`). Loguea warnings en consola para violaciones del schema sin romper la UI. La implementación es JS plano sin dependencias — cubre los chequeos esenciales del schema declarado en `_schema.json`.
