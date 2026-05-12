# Tasks — polish-inbox-concept-chip-and-sla-clock

## 1. Spec delta

- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: Inbox display layer MUST render Solicitud.concept as title-cased Badge chip and SLA as Badge chip with a clock icon (all four surfaces).

## 2. Code

- [ ] `src/pages/Inbox.vue` — import `Clock` from `lucide-vue-next` alongside `Search`. Add helper `humanizeConcept(c: string): string` (snake_case → Title Case).
- [ ] `src/pages/Inbox.vue` — list view: wrap concept text in `<Badge variant="neutral">` with `humanizeConcept(s.concept)`. Wrap SLA cell content in `<Badge>` with `<Clock>` icon (variant by SLA state — success / danger / neutral).
- [ ] `src/pages/Inbox.vue` — cards view: concept body row uses the chip pattern. Footer SLA uses the chip pattern.
- [ ] `src/pages/Inbox.vue` — kanban view: footer SLA uses the chip pattern. (Concept already surfaces via the type badge in the kanban card header.)
- [ ] `src/pages/Inbox.vue` — drawer info card "Concepto": cell content swaps text for the chip pattern.
- [ ] `src/pages/Inbox.vue` — drawer info card "SLA": cell content swaps text for the chip pattern with the clock icon.

## 3. Validation gates

- [ ] `openspec validate polish-inbox-concept-chip-and-sla-clock --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 4. Archive + commit

- [ ] `openspec archive polish-inbox-concept-chip-and-sla-clock`
- [ ] Commit: `feat(inbox): render concept as title-cased chip + SLA as chip with clock icon across list/cards/kanban/drawer`
