- Jira REQ: — (follow-up corrections to `polish-inbox-concept-chip-and-sla-clock` + `add-inbox-assignee-filter` archived earlier today)
- Module: core-template (foundation)

# Fix concept chip to render in UPPERCASE, align the "Responsable" column with the assignee filter, and update mock SLA timestamps to keep the in-SLA / vencida demo visible

## Why

Three small correctness gaps surfaced on the running app after the visual-polish round landed:

1. **Concept chips render in Title Case (`Aprobacion Pago`), not UPPERCASE.** The polish change interpreted "CAPITALIZE" as Title Case. The intended visual is full uppercase (`APROBACION PAGO`) — matching how the state and type badges read when the project's design tokens are in play.
2. **The "Responsable" list column shows `owner` (the *currently working* user — null when nobody has clicked "Tomar"), while the new assignee filter operates on `assignee` (the *directed-to* user).** Concrete bug: a user picks `Yasmani Rodríguez` in the assignee filter and `SOL-001` appears in the list — but the visible "Responsable" cell is `—`, because SOL-001's owner is null (Yasmani is the *assignee* but nobody has taken it yet). The mismatch makes the filter unintuitive. Fix: rename the list column "Responsable" → "Asignado a" and read `assignee` instead of `owner`. The cards body and kanban footer follow the same rename (both currently show "Owner" / `solicitudOwnerName`). The Drawer keeps both fields visible (Asignado a + Owner) so the audit-style distinction stays accessible.
3. **Mock SLAs are mostly vencida because the seeded `created_at` values are weeks old.** The demo dataset was useful for showing the danger state but it leaves the success state unexercised by default. Update the active mocks (SOL-001, SOL-002, SOL-003, SOL-006, TAR-007, TAR-008, TAR-009) so their `created_at` values fall within their respective `sla_hours` windows when viewed at the canonical "today" of the seed (2026-04-29 / -30) — the in-SLA chip variant now renders for at least some rows by default.

The first two are display-layer bugs in the just-landed polish; the third is mock-data hygiene so the demo exercises both SLA paths.

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **MODIFIED Requirement: Inbox display layer MUST render `Solicitud.concept` as a Badge chip in UPPERCASE and SLA as a Badge chip with a clock icon.** Renamed from "title-cased" → "UPPERCASE". Body + Scenarios rewritten so `'aprobacion_pago'` renders as `'APROBACION PAGO'` (underscores swapped for spaces; entire string uppercased).
- **ADDED Requirement: Inbox list and card views MUST display the assignee in the primary responsable cell, paired with the L3 assignee filter.** The list column SHALL be labeled "Asignado a" and read `findUser(s.assignee)?.name`. The cards body row labeled "Asignado a" follows the same pattern. The kanban card footer SHALL show the assignee name (or "Sin asignar" when null). The Drawer KEEPS the separate "Owner" card (the currently-working user, transient) and adds a parallel "Asignado a" card.

### Code

- `src/pages/Inbox.vue`:
  - `humanizeConcept(c)` rewritten — replaces underscores with spaces and uppercases the entire string (e.g. `'aprobacion_pago'` → `'APROBACION PAGO'`).
  - New helper `solicitudAssigneeName(s)` returning `findUser(s.assignee)?.name ?? ''`.
  - List column header "Responsable" → "Asignado a"; cell content `solicitudOwnerName(s)` → `solicitudAssigneeName(s)`.
  - Cards body "Owner" label → "Asignado a"; cell content swapped to `solicitudAssigneeName(s)`.
  - Kanban footer span swapped to `solicitudAssigneeName` / "Sin asignar" fallback.
  - Drawer info grid: ADD a new "Asignado a" card alongside the existing "Owner" card (both rendered).

### Mocks

- `src/mocks/genericos/inbox.ts` — update `created_at` values for the active solicitudes/tareas (SOL-001, SOL-002, SOL-003, SOL-006, TAR-007, TAR-008, TAR-009) so several of them fall comfortably inside their `sla_hours` windows when evaluated at runtime. Terminal records (SOL-004 completed, SOL-005 rejected) are unchanged — they don't render SLA chips.

### Tests

- No new tests in this round; the existing fixture-shape tests still pass since the field shape is unchanged. A follow-up MAY add UI snapshot / behavior tests for the chip uppercase rendering and the assignee-column read.

### Product source-of-truth

- No update — the visual-rendering specifics live in `core-modulo-genericos`; product spec is unaffected.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — 1 MODIFIED Requirement (concept-chip Requirement renamed + body rewritten for UPPERCASE) + 1 ADDED Requirement (assignee in the primary responsable cell). Capability count: 24 → 25.

### New Capabilities

None.
