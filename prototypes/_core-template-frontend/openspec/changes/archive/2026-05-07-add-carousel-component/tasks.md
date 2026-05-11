# Tasks — add-carousel-component

This change is a **contract-only** extension: one ADDED requirement to `core-layout` (Carousel component) plus one ADDED requirement to `core-theming` (dot indicator tokens).

## 1. Spec deltas

- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `Carousel component MUST provide multi-item slide navigation with dots, arrows, and keyboard support` (≥7 scenarios)
- [ ] `specs/core-theming/spec.md` — ADDED Requirement: `Carousel dot indicators MUST resolve through --brand and --b3 tokens` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-carousel-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for `embla-carousel-vue` vs. alternatives (vue-slick, swiper, hand-rolled)
- [ ] Verify `design.md` documents why Carousel lives in `core-layout` (not as a standalone capability)
- [ ] Verify `design.md` documents the explicit non-features (no infinite scroll, no vertical orientation, no custom transitions, no per-slide autoplay duration)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-carousel-component`
- [ ] Final commit: `specs: add Carousel component to core-layout with embla-carousel-vue backing`
