## ADDED Requirements

### Requirement: Carousel component MUST provide multi-item slide navigation with dots, arrows, and keyboard support

The `<Carousel>` component SHALL be the single canonical multi-item slide-gallery primitive in the financial-core. It SHALL accept props `itemsPerView: number` (default `1`; the number of slides visible simultaneously in the viewport), `showDots: boolean` (default `true`), `showArrows: boolean` (default `true`), `loop: boolean` (default `false`; when `true`, advancing past the last slide returns to the first), `autoplay: boolean` (default `false`), `autoplayInterval?: number` (default `5000`ms; ignored when `autoplay: false`). The component SHALL render slides via a repeatable slot `<template #slide="{ slide, index }">` driven by a `slides: T[]` prop. The implementation SHALL be built on `embla-carousel-vue` (the official Vue port of Embla); no other carousel library is permitted. The component SHALL render dot indicators below the slides (when `showDots: true`) and arrow navigation buttons on the left and right edges (when `showArrows: true`); both are toggleable independently. When the carousel area is focused, `←` and `→` SHALL navigate to the previous and next slide respectively. When `autoplay: true`, hovering the carousel SHALL pause the autoplay timer; mouse-leave resumes it. The component SHALL expose ARIA semantics: root with `role="region"`, the slide list with `role="tablist"`, each slide with `role="tab"`, and the active slide with `aria-current="true"`. Hardcoded colors are forbidden — dot indicator colors resolve through `core-theming` tokens.

#### Scenario: Carousel renders slides via the repeatable slot

- **GIVEN** a `<Carousel :slides="kpis" :itemsPerView="3">` with a `<template #slide="{ slide }">` rendering each KPI as a card
- **WHEN** the component renders
- **THEN** the first three slides are visible in the viewport; the slot template is invoked once per slide; the rest of the slides are off-viewport and accessible via navigation

#### Scenario: Dots and arrows are independently toggleable

- **GIVEN** a `<Carousel :showDots="true" :showArrows="false">`
- **WHEN** the component renders
- **THEN** the dot indicators render below the slides; the arrow buttons do NOT render — keyboard and dot-click are the only navigation paths

#### Scenario: Loop returns to the first slide after the last

- **GIVEN** a `<Carousel :loop="true" :slides="[s1, s2, s3]">` and the user is on `s3`
- **WHEN** the user clicks the next arrow (or presses `→`)
- **THEN** the carousel advances to `s1`; without `loop: true`, the next arrow would be disabled at `s3`

#### Scenario: Autoplay pauses on hover, resumes on mouse-leave

- **GIVEN** a `<Carousel :autoplay="true" :autoplayInterval="5000">` and the user hovers over the carousel area
- **WHEN** the hover begins
- **THEN** the autoplay timer pauses; on mouse-leave the timer resumes from where it paused (not from zero)

#### Scenario: Keyboard navigation when carousel is focused

- **GIVEN** the user has tabbed to the carousel and the focus ring is visible (resolved via `--ring` token)
- **WHEN** the user presses `→`
- **THEN** the carousel advances to the next slide; pressing `←` returns to the previous slide; the focus stays on the carousel root

#### Scenario: ARIA semantics expose the carousel structure

- **GIVEN** a `<Carousel>` rendered with three slides, currently displaying slide 2
- **WHEN** the DOM is inspected
- **THEN** the root has `role="region"`, the slide container has `role="tablist"`, each slide has `role="tab"`, and slide 2's element has `aria-current="true"` while slides 1 and 3 do not

#### Scenario: Adopting a competing carousel library is forbidden

- **GIVEN** a developer attempts to use `vue-slick-carousel`, `swiper-vue`, or a hand-rolled carousel
- **WHEN** the change is reviewed
- **THEN** the review MUST reject the implementation — the canonical library is `embla-carousel-vue`; the wrapper is the `<Carousel>` contracted here
