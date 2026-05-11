// ════════════════════════════════════════════════════════════════════
// View components — framework-agnostic primitives composed by pages.
// ────────────────────────────────────────────────────────────────────
//   <Segmenter>   — L1 segmentation pills (sub-tabs in page header).
//   <ViewToggle>  — Lista / Tarjetas / Tablero icon-only switcher.
//   <CardsGrid>   — responsive auto-fill grid container.
//   <CardItem>    — three-zone card (header / body / footer).
// ════════════════════════════════════════════════════════════════════

export { default as Segmenter } from './Segmenter.vue';
export { default as ViewToggle } from './ViewToggle.vue';
export { default as CardsGrid } from './CardsGrid.vue';
export { default as CardItem } from './CardItem.vue';

export type { ViewMode } from './ViewToggle.vue';
export type { Severity } from './CardItem.vue';
