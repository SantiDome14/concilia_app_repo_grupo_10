- Jira REQ: —
- Module: core-template (foundation)
- Tier: 3 — actualmente solo TRD; el último a implementar

# Add Carousel component (multi-item slide gallery)

## Why

TRD legacy usa `embla-carousel-react`. Aunque la demanda inmediata es solo TRD, el paradigma del template exige que cualquier UI primitive del financial-core viva en el template canónico — cuando aparezca el siguiente caso (galerías de assets, carrusel de KPIs, walkthrough onboarding), la app no debe reinventar el patrón.

Esta change cierra el hueco. Define `<Carousel>` como el primitivo canónico construido sobre `embla-carousel-vue` (port oficial Vue de Embla, paridad de API con la versión React que TRD ya conoce). Es bajo riesgo y alta coherencia: una vez que existe, ningún otro carousel se introduce.

## What Changes

- **`core-theming`** — un requirement añadido:
  - **ADDED** "Carousel dot indicators MUST resolve through `--brand` and `--b3` tokens" — formaliza los colores del estado activo (resolved a `--brand`) e inactivo (resolved a `--b3`) de los dot indicators; hardcoded colors prohibidos.
- **`core-forms`** — sin cambios. El Carousel es un primitivo de display, no un input form.
- **New requirement bajo `core-layout`** (alternativa: capability dedicada — pero el componente es liviano y no justifica una capability propia):
  - **ADDED** "Carousel component MUST provide multi-item slide navigation with dots, arrows, and keyboard support" — define el componente: multi-item slides configurables (1, 2, 3, N por viewport), dot indicators toggleables, arrow buttons toggleables, keyboard navigation (← →) cuando focused, autoplay opcional con pausa on hover, loop opcional, slot `slide` repeatable, ARIA (`region`, `tablist`, `tab`, `aria-current` en dot activo).

## Capabilities

### Affected Capabilities

- `core-layout` — un requirement añadida (Carousel primitive). Está en `core-layout` porque conceptualmente es un layout pattern de "secuencia de cards visibles uno-a-la-vez", paralelo a `<ResizablePanel>` que también vive en `core-layout`.
- `core-theming` — un requirement añadida (dot indicator tokens).

### New Capabilities

None.

### Cross-capability dependencies

- Compone con `core-theming` — colores de dots, focus ring de arrows; no hardcoded.
- Compone con `core-modals` — un Carousel puede vivir dentro de un modal (caso onboarding tour).

## Notes

- El spec NO contracta **infinite scroll horizontal** (cargar slides on demand). Out of v1; los slides se declaran upfront.
- El spec NO contracta **vertical orientation** del carousel (slides apilados verticalmente). Out of v1; vertical es uncommon en backoffice y agrega contractual surface sin demanda real.
- El spec NO contracta **transition effects** customizables (fade, slide, zoom, etc.). Embla provee transitions vanilla; las extensions visual son out of v1.
- El spec NO contracta **autoplay con duración configurable per-slide** (slide 1 dura 5s, slide 2 dura 10s). Si autoplay activo, todos los slides duran lo mismo.
