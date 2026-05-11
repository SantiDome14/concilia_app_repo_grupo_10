- Jira REQ: —
- Module: core-template (foundation)
- Tier: 3 — actualmente solo TRD; nice-to-have transversal

# Add ResizablePanel component (split-pane layout con persistencia)

## Why

TRD legacy usa `react-resizable-panels` para split-pane layouts (probable: editor + preview, list + detail con drag handle entre ambos). Es un patrón de power-user que aparece en cualquier app del financial-core donde la review de un registro coexiste con su lista (compliance officer en LEX revisando un cliente con la lista de clientes a la izquierda; ops officer en OPS reconciliando un movement con el detail al lado de la cola).

Aunque la demanda inmediata es solo TRD, mantener un primitivo canónico evita que en cualquier futuro pitch de UI cada app importe una librería distinta — una vez que aparezca el segundo consumer, ya tendremos el primitivo establecido. Costo de implementación es bajo (~80 LOC con `vueuse/useDraggable`) y el contrato es estable.

## What Changes

- **`core-layout`** — un requirement añadido:
  - **ADDED** "ResizablePanel component MUST provide horizontal and vertical split-pane layouts with persisted dimensions" — define el componente `<ResizablePanel>`: orientation `horizontal` (split vertical splitter, paneles izquierda/derecha) o `vertical` (split horizontal splitter, paneles arriba/abajo); `min`/`max` por panel en `%` o `px`; drag handle visible con hover state; persistencia opcional en `localStorage` con `storageKey` configurable; slots `panel-1` y `panel-2`; nesting permitido; keyboard support (←/→ o ↑/↓ mueven el splitter cuando focused).

## Capabilities

### Affected Capabilities

- `core-layout` — un requirement añadida (ResizablePanel primitive). NO afecta el AppShell estándar Sidebar+Topbar+Main; ResizablePanel es un primitivo que vive DENTRO del Main, no lo reemplaza.

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-theming` — drag handle, hover states, focus rings; no hardcoded colors.
- Compone con `core-modals` — un ResizablePanel puede vivir dentro de un Drawer (caso TRD: Drawer con quote detail, split entre activity timeline y attachments).

## Notes

- El spec NO contracta **3+ paneles** (split en tres regiones). Si aparece el caso real, abre como extension; por ahora ResizablePanels se anidan (un panel-1 contiene otro `<ResizablePanel>`).
- El spec NO contracta **collapse** (un panel se cierra del todo a 0%). Si aparece el caso, abre como prop `:collapsible="true"` en una extension futura.
- El spec NO contracta **swap orientation runtime** (cambiar de horizontal a vertical mediante prop reactiva). El orientation se establece al mount.
- El spec NO contracta **drag con momentum / inertia**. El drag termina cuando el usuario suelta el mouse.
