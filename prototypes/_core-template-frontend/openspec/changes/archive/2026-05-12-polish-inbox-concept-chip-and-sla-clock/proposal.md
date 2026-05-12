- Jira REQ: — (queued UI polish from hands-on review)
- Module: core-template (foundation)

# Polish Inbox display: render `concept` in a chip with title-case text, render SLA in a chip with a clock icon

## Why

Hands-on review during the rename session surfaced two visual polish gaps in the Inbox:

> "visualmente mostrá los conceptos en CAPITALIZE y metelos en algún tipo de chip (como el estado y el tipo). El SLA dejalo como está pero también metelo en algún chip, si le podés agregar un ícono de algún reloj o algo estaría genial"

Two specific UX issues:

1. **`Solicitud.concept` is displayed as raw snake_case** (`aprobacion_pago`, `revision_legajo`). Raw snake_case reads poorly to humans scanning a list. Other classifying fields — `state` and `type` — render as Badge chips with title-cased labels (`"Pendiente"`, `"Solicitud"`). Concept should follow the same pattern: title-case the text (`aprobacion_pago` → `Aprobacion Pago`) and wrap in a `<Badge>` chip. The badge variant SHALL be `neutral` (concept doesn't carry a semantic color the way state does; it's a classifier, not a status).
2. **SLA text is bare** (`"24h"` or `"Vencida"`). Wrapping in a chip with a clock icon gives the metric a recognizable visual anchor and aligns with how the other in-row metadata renders.

These are visual-only changes — the underlying data and filtering logic are unchanged. Both ride together because they touch the same row/card/drawer render functions.

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **ADDED Requirement: Inbox display layer MUST render `Solicitud.concept` as a title-cased Badge chip and SLA as a Badge chip with a clock icon.** The Requirement contracts the visual pattern across the four view surfaces (list, cards, kanban card, drawer).

### Code

- `src/pages/Inbox.vue`:
  - New helper `humanizeConcept(c: string): string` — replaces underscores with spaces and title-cases each word (e.g. `'aprobacion_pago'` → `'Aprobacion Pago'`). The conversion is deterministic and locale-agnostic.
  - List view: the `<td>` showing `{{ s.concept }}` wraps it in `<Badge variant="neutral">{{ humanizeConcept(s.concept) }}</Badge>`. The column header stays "Concepto".
  - List view: the `<td>` showing the SLA text wraps the text in a `<Badge variant="...">` with a `<Clock>` icon (from `lucide-vue-next`). Variant: `success` when in SLA, `danger` when vencida, `neutral` when `sla_hours === null` (text remains `'—'`).
  - Cards view: the "Concepto" body row swaps the plain text for the chip pattern. The footer SLA span wraps in the chip pattern.
  - Kanban view: the footer SLA span wraps in the chip pattern. (The kanban card body does not show concept explicitly — that's the existing behavior; concept appears via the type badge already in the kanban card header.)
  - Drawer info card "Concepto": the cell content swaps text for the chip pattern.
  - Drawer info card "SLA": the cell content swaps text for the chip pattern with the clock icon.

### Tests

- No new tests in this round — visual-only changes; no behavioral change. A follow-up round can snapshot or assert the chip-and-icon presence if desired.

### Product source-of-truth

- No update needed. The product spec already describes the L3 / Drawer rendering; the visual polish is template-level UI polish that doesn't change the data contract.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 1 ADDED Requirement (the visual render pattern for concept + SLA chips). Capability count: 23 → 24.

### New Capabilities

None.
