> Jira REQ: — (no ticket; template-level migration from `prototypes/_core-template/` v1.15)
> Module: core-template (foundation)

# Add core-modulo-genericos — contract for the four cross-cutting standard modules

## Why

Without this capability, every Ardua core app (FIN, OPS, TRD, LEX, CLP, COM) reinvents the four cross-cutting modules (Dashboard, Inbox, Alertas, Reportes) from scratch — and they reliably diverge in subtle, audit-killing ways. One app calls the unit of management in its bandeja "item", another calls it "Solicitud", a third calls it "ticket"; an alert in OPS opens a workflow drawer with timeline + comments while the same conceptual alert in CLP fires a one-click toast; the LEX Reportes module emits inter-area dependency events as a custom `XDEP` topic while FIN expects a `REPORT_DEPENDENCY` payload with a different shape; the Dashboard in TRD acquires domain-specific filters and sub-tabs that turn the consolidated home into a fifth domain module. The prototype `prototypes/_core-template/` v1.15 standardized all four modules in HTML — it codified Solicitud as the mandatory term, the Activos/Histórico segmentation, the four Alertas profiles (A/B/C/D), the Catálogo/Histórico segmentation in Reportes, the cross-app `REPORT_DEPENDENCY` event shape, and the explicit "what NOT to put here" rules per module. This change lifts that standard out of HTML capacidad-comments and into a typed, tested, enforceable OpenSpec contract that every Vue 3 + TS clone of the template MUST satisfy. Apps still tailor data, profiles, and types — but the shape, vocabulary, segmentation, lifecycle, and cross-app coordination are identical across the core.

## What Changes

- Create the `core-modulo-genericos` capability. New spec at `openspec/specs/core-modulo-genericos/spec.md` with 10 requirements covering: the four-module mandate, Solicitud terminology + shape, Inbox state machine, Alertas profiles A/B/C/D, Alertas terminal-state justification, Reportes Catálogo/Histórico segmentation, REPORT_DEPENDENCY cross-app events, Dashboard as consolidated home, the placement-decision heuristic + "what NOT to put here", and shared TS types in `src/types/genericos.ts`.
- Define the TS-strict surface. Public types named in the spec live in `src/types/genericos.ts`: `Solicitud`, `SolicitudState`, `INBOX_STATES`, `INBOX_TRANSITIONS`, `Alerta`, `AlertProfile`, `Report`, `ReportRun`, `ReportDependency`, `TimelineEvent`, `Comment`. App-specific shapes extend these via TS interface extension or generics; redefining the base shape is forbidden.
- Wire the four pages — `src/pages/Dashboard.vue`, `src/pages/Inbox.vue`, `src/pages/Alertas.vue`, `src/pages/Reportes.vue` — and place them at the top of the sidebar's generics block (above any domain `<SidebarBlock>`), per `core-layout` and `core-navigation`.
- Integrate with sibling capabilities — read-only references; no edits to existing specs in this change:
  - `core-layout` — the four pages MUST occupy the sidebar's generics block (the four entries that live above any `<SidebarBlock>`); Dashboard uses a card-grid layout (NOT the L1/L2/L3 page pattern); Inbox/Alertas/Reportes use L1/L2/L3 with the `<Segmenter>` in the L1 actions slot per `core-layout`.
  - `core-navigation` — the four routes (`/dashboard`, `/inbox`, `/alertas`, `/reportes`) MUST be registered as part of the template's seed routes; apps MAY NOT remove them.
  - `core-data-tables` — Inbox + Alertas use Activos/Histórico segmentation; Reportes uses Catálogo/Histórico. All three modules expose Lista / Tarjetas / Tablero views per `core-data-tables`. Inbox + Alertas (profile B) declare `INBOX_STATES` / `ALR_STATES` and matching transitions per the `core-data-tables` state-machine contract.
  - `core-modals` — the Inbox / Alertas detail surface is the side `<Drawer>` (`meta.detail = 'drawer'`); transitions to terminal states use `mode: 'modal'` with the shared `<ClosureModal>` from `core-modals`.
  - `core-actions-manifest` — the Solicitud lifecycle (Inbox state machine, terminal-state ClosureModal) and the alert-resolution lifecycle (Alertas terminal-state ClosureModal) are governed by the manifest engine per `core-actions-manifest`. The manifest registers state-transition actions; the engine drives the dialog and the audit log.
  - `core-error-handling` — Alertas profile-A alerts surface as banners or toasts per the existing `core-error-handling` contract. REPORT_DEPENDENCY events that land in Alertas use the standard alert-banner severity colors.
- Cross-app coordination: REPORT_DEPENDENCY events have a normative shape (`{ report_id, blocking_app, blocking_module, blocking_state }`) and are consumed by destination-app Alertas as `Alerta` entries with `type: 'report_dependency'` and `profile: 'A'`. Implementation tasks are aspirational; the contract is the deliverable.
- Capacity comments are NOT carried over. The HTML prototype's `// CAPACIDAD: ...` comment markers are replaced by per-feature module config flags + capability-gated routes (`meta.capabilities`) per `core-auth` / `core-navigation`. Apps disable a capability by omitting its module-config flag, not by deleting commented blocks.

## Capabilities

### Affected Capabilities

None modified by this change. `core-layout`, `core-navigation`, `core-data-tables`, `core-modals`, `core-actions-manifest`, `core-error-handling`, and `core-auth` are *referenced* in the new spec but their existing requirements are not edited.

### New Capabilities

- `core-modulo-genericos` (Tier 1; cross-app contract) — 10 requirements, ≥2 scenarios each.

### Non-capability artifacts

- TypeScript types under `src/types/genericos.ts` (named in spec).
- Page implementations at `src/pages/Dashboard.vue`, `src/pages/Inbox.vue`, `src/pages/Alertas.vue`, `src/pages/Reportes.vue`.
- Module-config flags per app at `src/modules/<app>/config.ts` for opt-in / opt-out of optional capabilities (replaces the HTML prototype's `// CAPACIDAD` comments).

These are implementation locations referenced by the spec; the spec itself remains the source of truth.
