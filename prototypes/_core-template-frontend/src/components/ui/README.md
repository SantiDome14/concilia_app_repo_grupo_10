# UI Primitives

Los componentes de esta carpeta son **primitives del design system**. Siguen la filosofía shadcn-vue: el código del componente vive en este repo, no en `node_modules/`, así que son **editables directamente**.

## Agregar más primitives con la CLI

```bash
npx shadcn-vue@latest add dialog dropdown-menu select table toast tabs
```

Los componentes se copian a `src/components/ui/<nombre>/`.

## Primitives recomendados por tipo de feature

| Feature | Primitives a agregar |
|---|---|
| Listado con modales | `dialog`, `dropdown-menu`, `select`, `table`, `toast` |
| Formulario complejo | `form`, `select`, `checkbox`, `radio-group`, `label` |
| Navegación con tabs | `tabs`, `separator` |
| Confirmaciones destructivas | `alert-dialog`, `toast` |

## Reglas de modificación

Los primitives consumen design tokens de `src/styles/globals.css`. **Nunca hardcodear colores**. Si necesitás un color nuevo, agregarlo como token primero.

Los primitives son mandatorios — no crear botones/inputs/badges ad-hoc en features. Si necesitás una variante nueva, extender el `cva` del primitive correspondiente.
