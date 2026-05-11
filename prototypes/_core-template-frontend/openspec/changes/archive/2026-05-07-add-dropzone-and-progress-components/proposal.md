- Jira REQ: —
- Module: core-template (foundation)
- Tier: 1 — companion del `add-core-file-upload` (sin esto el contrato del lifecycle no tiene UI canónica)

# Add Dropzone & FileUploadProgress as canonical UI primitives for file fields

## Why

El change `add-core-file-upload` aterriza el contrato del lifecycle de upload (request → upload con progress → confirm, retry policy diferenciada, batch import polling, composable `useFileUpload()`). Ese contrato necesita dos primitivos visuales canónicos para que cualquier app del financial-core los consuma sin reinventarlos:

1. **`<Dropzone>`** — un drop zone para drag & drop multifile que se integra con `vee-validate` + `zod`, valida tipo MIME / tamaño / cantidad client-side, y surfaces los estados visuales esperados (idle / hover / dragging / rejected / focused / disabled). Hoy LEX tiene `Dropzone.vue` legacy con su lógica embebida; TRD usa drop areas custom dentro de `QuoteForm`; OPS no tiene drop zone nativo y reutiliza un `<input type="file">` plano. Tres soluciones distintas para el mismo patrón.

2. **`<FileUploadProgress>`** — la visualización per-file del state machine del composable: una fila por file con filename + size + progress bar + state badge + botón retry/cancel según corresponda. Hoy LEX la implementa local en `MultiFileUploadModal.vue`; TRD la simula sin estados claros; OPS no la tiene. Como toda la información viene del state machine canónico de `useFileUpload`, este componente es un display puro — la única lógica es mapear estados a affordances visuales.

El paradigma del template exige una sola identidad visual y arquitectónica para el financial-core: cualquier app que necesite subir archivos consume `<Dropzone>` y `<FileUploadProgress>` y se beneficia automáticamente del lifecycle contractado en `core-file-upload`. Esta change incorpora esos primitivos a `core-forms` (donde ya viven los demás field types) y formaliza el mapeo `file` / `multifile` → `<Dropzone>` para que el manifest engine los reconozca.

## What Changes

- **`core-forms`** — un requirement modificado y dos requirements añadidos:
  - **MODIFIED** "Manifest dialog fields MUST map each declared type to its Vue equivalent and integrate with vee-validate" — extiende la whitelist de field types de 7 a **9** valores (`+file`, `+multifile`); ambos renderizan `<Dropzone>`. La whitelist queda: `lookup`, `text`, `textarea`, `select`, `date`, `number`, `boolean`, `file`, `multifile`. El resto de la requirement (validación vee-validate, `<FormControl>`, zod tokens) queda intacta.
  - **ADDED** "Dropzone component MUST consume useFileUpload and expose drag-drop affordances with client-side validation" — define el componente `<Dropzone>`: drag/drop area con estados visuales canónicos (idle / hover / dragging / rejected / focused / disabled), click fallback al file picker nativo, validación client-side (`accept` MIME list / `maxSize` bytes / `maxFiles` count), invocación a `useFileUpload(options).start(rawFiles)` al drop o select, ARIA labels y keyboard fallback (Enter / Space sobre el área enfocada abren el picker).
  - **ADDED** "FileUploadProgress component MUST render the per-file state machine of the upload composable" — define el componente `<FileUploadProgress>`: lista per-file con filename, formatted size, progress bar (sólo durante `uploading`), state badge (idle / requesting / uploading / completed / error / cancelled), botones retry (cuando `error`) y cancel (cuando `requesting | uploading`), slot para acciones custom per-row, `EmptyState` cuando `files.length === 0`.

## Capabilities

### Affected Capabilities

- `core-forms` — un requirement modificado (whitelist de field types extendida a 9), dos requirements añadidos (Dropzone y FileUploadProgress).

### New Capabilities

None. Esta change extiende `core-forms`.

### Cross-capability dependencies

- Compone con `core-file-upload` (change `add-core-file-upload`): `<Dropzone>` invoca `useFileUpload(options).start(rawFiles)` y `<FileUploadProgress>` se enlaza a `useFileUpload(options).files`. Ambos changes pueden archivarse en cualquier orden — pero **hasta que ambos estén archivados los apps no deben consumir el patrón**. La spec del Dropzone hace referencia explícita a `useFileUpload` por nombre.
- Compone con `core-theming` — los estados visuales del Dropzone (idle / hover / dragging / rejected) usan tokens del design system (`--bg-2`, `--border`, `--ring`, `--danger`); ningún color hardcoded.
- Compone con `core-modals` — el patrón típico de uso es un Create modal que contiene el Dropzone + FileUploadProgress, pero la spec NO restringe el surface (los componentes funcionan en cualquier contexto donde un `useFileUpload()` esté activo).

## Notes

- Single componente `<Dropzone>` cubre tanto `file` (single) como `multifile` (multiple) con la prop `multiple`. NO hay un `<FilePicker>` separado para single — la lógica es la misma con `maxFiles: 1`.
- El componente NO contractualiza preview (thumbnail de imagen, ícono de PDF) — eso es app-specific. El componente expone un slot `#preview="{ file }"` para que la app inserte su renderer si lo necesita.
- El componente NO contractualiza folder upload (drag de carpeta entera) — eso es scope de un futuro change si LEX lo necesita en su gestión de documentos.
- La spec NO contractualiza el comportamiento de **resumable upload** ni de **upload pausable** — alineado con la decisión del companion `add-core-file-upload` (out of scope para v1).
