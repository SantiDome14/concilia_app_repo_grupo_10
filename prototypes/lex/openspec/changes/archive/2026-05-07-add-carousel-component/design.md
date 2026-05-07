# Design — add-carousel-component

## Context

This design covers the `<Carousel>` component contract and the dot indicator token formalization. The decisions below explain library choice, placement in `core-layout`, and the bounded feature scope.

---

## Decision 1 — `embla-carousel-vue` as the canonical backing library

### The question

Carousel libraries available in 2026:

- **Embla Carousel (`embla-carousel-vue`).** Lightweight (~5KB), framework-agnostic core with thin Vue wrapper, MIT, smooth scrolling.
- **Swiper (`swiper-vue`).** Feature-rich (~30KB+), many built-in features, MIT.
- **vue-slick-carousel.** Older, jQuery-derived, ~15KB.
- **Hand-rolled.** Minimum bundle but reinvents touch handling, momentum, snap behavior.

### The decision

**Embla Carousel.** Adopted as the canonical backing library; alternatives forbidden.

### Why Embla

- **Bundle size.** ~5KB; smaller than alternatives by a wide margin.
- **API stability.** Embla's API is minimal and stable across versions.
- **Vue port is first-class.** `embla-carousel-vue` is maintained alongside the React port; not a community fork.
- **Token-friendly.** Embla doesn't ship opinionated CSS; pairs cleanly with `core-theming` tokens.
- **TRD legacy.** TRD already uses `embla-carousel-react`; the Vue port preserves the team's familiarity.

### Failure modes the rule prevents

- A developer adopts Swiper for "more features" → bundle bloat + opinionated styling that fights tokens. Spec rejects.

---

## Decision 2 — Carousel lives in `core-layout`, not as its own capability

### The question

Should Carousel be its own capability (like `core-charts`), or extend `core-layout`?

### The decision

**Extends `core-layout`.** A single ADDED requirement; no new capability.

### Why

- **Scope.** The component contract is small (~7 scenarios). A new capability for one component is over-architected.
- **Conceptual fit.** `core-layout` already hosts `<ResizablePanel>` (per the parallel Tier 3 change). Both are "layout primitives that compose how content is arranged on screen". Carousel fits the same family.
- **Discoverability.** A developer looking at `core-layout` finds all layout primitives in one place.

### Alternatives considered

- **Open `core-display-primitives` capability.** Considered. Rejected as over-architected for the scope.
- **Open `core-carousel` capability.** Rejected as too narrow.

---

## Decision 3 — Dot indicators tokenized via `--brand` / `--b3`

### The question

What colors should the dot indicators use?

### The decision

**Active dot resolves to `var(--brand)`; inactive resolves to `var(--b3)`.** Hover on inactive may brighten to `var(--b4)`.

### Why brand for active

- **Active state is a brand moment.** A blue dot in TRD, a green dot in FIN — automatic brand inheritance per app, no per-app override.

### Why b3 for inactive

- **Subtle.** Inactive dots should not compete with content. `--b3` is the muted border token; perfect for a passive indicator.
- **Hover at b4.** A subtle brightening on hover signals interactivity without screaming for attention.

### Failure modes the rule prevents

- Hardcoded brand colors in the carousel breaking when an app overrides `--brand` → eliminated by token resolution.

---

## Decision 4 — Out of scope: infinite scroll, vertical, custom transitions, per-slide autoplay

### Why each is out

- **Infinite scroll (lazy load slides).** Out of v1; slides are declared up-front. If a future use case demands lazy slides, abre como extension with `lazy` prop.
- **Vertical orientation.** Vertical carousels are uncommon in backoffice; specifying them adds contractual surface for a niche need. If demand appears, adds as `:orientation` prop.
- **Custom transitions (fade, zoom, etc.).** Embla's default slide transition is sufficient. Per-app custom transitions would diverge visual identity.
- **Per-slide autoplay duration.** Adds complex schema (per-slide `duration`); the simpler "all slides same duration" is sufficient.

---

## Cross-capability composition

| Neighbor | Owns | This change owns |
|---|---|---|
| `core-layout` (host) | App shell, L1/L2/L3 page composition, `<ResizablePanel>` | `<Carousel>` primitive |
| `core-theming` | Tokens, palette, brand vars | Dot indicator color tokens |
| `core-modals` | Modal flows including Drawer | A Carousel can live inside a modal (e.g., onboarding tour) |

---

## Open questions

1. **Touch / swipe gestures.** Embla supports touch out of the box. The spec assumes touch works; if any caveat appears during implementation (e.g., touch in a Drawer fights the Drawer's swipe-to-close), document it then.
2. **Lazy-loading slide content.** When a slide's content is heavy (a chart, an image), eager-rendering all slides wastes resources. Out of v1; if real demand appears, adds as `:lazy` prop with `IntersectionObserver`-backed mounting.
3. **Aria-live announcements.** Some carousels announce "Slide 3 of 8" to screen readers when navigation happens. Embla doesn't ship this by default; the spec mandates `aria-current` but does not contract live region. If accessibility audit reveals demand, abre como extension.
4. **Multi-row carousel.** A grid of slides scrolling in two dimensions. Out of v1; uncommon and complex.
