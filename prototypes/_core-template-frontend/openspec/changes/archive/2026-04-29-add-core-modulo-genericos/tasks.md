# Tasks — add-core-modulo-genericos

This change creates the `core-modulo-genericos` capability — the contract for the four cross-cutting standard modules (Dashboard, Inbox, Alertas, Reportes) every Ardua core app MUST ship. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/core-modulo-genericos/spec.md`. Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-core-modulo-genericos` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/core-modulo-genericos/spec.md` — ADDED Requirements: 10 requirements, ≥2 scenarios each. Cover: four-module mandate, Solicitud terminology + shape, Inbox state machine, Alertas profiles A/B/C/D, Alertas terminal-state justification, Reportes Catálogo/Histórico, REPORT_DEPENDENCY events, Dashboard as consolidated home, decision heuristic + "what NOT to put here", shared TS types.
- [ ] Run `openspec validate add-core-modulo-genericos --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types (aspirational — may follow in a separate change)

### 2.1 Shared types

- [ ] `src/types/genericos.ts` — exports the canonical interfaces:
  - `Solicitud`, `SolicitudState`, `TimelineEvent`, `Comment`
  - `Alerta`, `AlertProfile` (`'A' | 'B' | 'C' | 'D'`)
  - `Report`, `ReportRun`, `ReportDependency`
  - The default `INBOX_STATES` literal-array vocabulary (`'pendiente' | 'en_proceso' | 'completed' | 'rejected'`) and a default `INBOX_TRANSITIONS` declaration matching the `core-data-tables` state-machine contract.

- [ ] Export type guards: `isSolicitud(x): x is Solicitud`, `isAlerta(x): x is Alerta`, `isReport(x): x is Report`, `isReportRun(x): x is ReportRun`. Used by the validator + tests; not user-facing.

### 2.2 App-extension contract

- [ ] Document the interface-extension pattern in `src/types/README.md` (NOT a new file — append to existing if present): apps extend `Solicitud` / `Alerta` / `Report` via `interface OpsX extends Solicitud { ... }`; redefining the base interface in app code is forbidden. Optional ESLint rule: `no-redefine-genericos`.

### 2.3 Module config flags

- [ ] `src/modules/<app>/config.ts` — typed config interfaces per generic module: `INBOX_CONFIG`, `ALERTS_CONFIG`, `REPORTS_CONFIG`, `DASHBOARD_CONFIG`. These replace the HTML prototype's `// CAPACIDAD` comments; flipping a flag disables a capability without deleting code.

## 3. Page implementations (aspirational)

### 3.1 Dashboard

- [ ] `src/pages/Dashboard.vue` — responsive card-grid layout (NOT L1/L2/L3). Cards include: KPIs from active domain modules; counters for the three list-shaped generics (Inbox unread, Alertas critical, Reportes pending); "Actividad reciente" timeline; app-specific consolidated views per `DASHBOARD_CONFIG`. Cards are clickable and navigate to the relevant module. NO filters, NO sub-tabs, NO domain-specific actions on this page.

### 3.2 Inbox

- [ ] `src/pages/Inbox.vue` — L1/L2/L3 layout. L1 page header with `<Segmenter>` (Activos / Histórico) in the actions slot. L2 KPI strip (per `INBOX_CONFIG`, including SLA-vencidos KPI when SLA tracking is enabled). L3 section + data surface with `<ViewToggle>` for Lista / Tarjetas / Tablero (Kanban). Detail surface is the side `<Drawer>` (`meta.detail = 'drawer'`) with Timeline + Comments. State-machine transitions to terminal states (`completed`, `rejected`) open `<ClosureModal>` from `core-modals`. Empty state when no Solicitudes match the segment.

### 3.3 Alertas

- [ ] `src/pages/Alertas.vue` — L1/L2/L3 layout. L1 page header with `<Segmenter>` (Nuevas / Histórico) in the actions slot. L2 KPI strip per `ALERTS_CONFIG`. L3 section + data surface with `<ViewToggle>` (Lista / Tarjetas / Tablero) for profile B; profile A renders Lista only; profile C renders a chart-first surface; profile D renders a cross-app KPI dashboard. Profile-B detail surface is the side `<Drawer>` with Timeline + Comments. Terminal-state transitions (`* → resolved`, `* → dismissed`) MUST open `<ClosureModal>` with a required justification ≥10 chars.

### 3.4 Reportes

- [ ] `src/pages/Reportes.vue` — L1/L2/L3 layout. L1 page header with `<Segmenter>` (Catálogo / Histórico) in the actions slot. L2 KPI strip per `REPORTS_CONFIG`. L3 section + data surface — Catálogo renders a category-grouped list of `Report` templates; Histórico renders a paginated table of `ReportRun` rows. Catálogo actions: Generar (dependency-checked), Editar metadata, Configurar CRON. Histórico actions: Descargar (when `output_url` present), Reintentar (when `status === 'error'`).

## 4. Cross-app coordination (aspirational)

### 4.1 REPORT_DEPENDENCY emission

- [ ] `src/composables/useReportDependencies.ts` — when the user clicks "Generar" on a Catálogo Report, evaluate `report.dependencies[]`. If any entry has `completed: false`, BLOCK the action, display the prerequisite reason in the action menu, and emit a `REPORT_DEPENDENCY` event of normative shape `{ report_id, blocking_app, blocking_module, blocking_state, sla_days_before?, emitted_at }` to the destination app's event bus.

### 4.2 REPORT_DEPENDENCY consumption

- [ ] `src/composables/useAlertasIngestion.ts` — destination app subscribes to incoming `REPORT_DEPENDENCY` events and creates an `Alerta` entry with `type: 'report_dependency'`, `profile: 'A'`. When the source app marks the dependency `completed: true`, the corresponding Alerta auto-closes with `closure_comment: 'auto-closed by source-app completion'` and moves to Histórico.

## 5. Sidebar wiring (aspirational)

- [ ] `src/components/layout/Sidebar.vue` (or the generics-block subcomponent per `core-layout`) — renders the four generic modules in this exact order at the top of the sidebar, NOT inside any `<SidebarBlock>`:
  1. Dashboard
  2. Inbox (with unread-count badge per `INBOX_CONFIG`)
  3. Alertas (with critical-count badge per `ALERTS_CONFIG`)
  4. Reportes (with pending-runs / unfulfilled-dependencies badge per `REPORTS_CONFIG`)
- [ ] Verify that domain `<SidebarBlock>` groups appear AFTER the four generics; the validator (or a Vitest snapshot) MUST catch a sidebar that nests a generic module inside a block.

## 6. Validation gates (mandatory)

- [ ] `openspec validate add-core-modulo-genericos --strict` passes.
- [ ] `openspec validate --all --strict` passes (existing 11 capabilities + new `core-modulo-genericos` = 12 capabilities total).
- [ ] If implementation tasks (2–5) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-core-modulo-genericos` is opened with sections 2–5 as its scope.

## 7. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-core-modulo-genericos`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/core-modulo-genericos/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-modulo-genericos/`.
- [ ] Final commit (when implementation is included or after the follow-up implementation merges) with conventional message: `specs: add core-modulo-genericos — contract for the four cross-cutting standard modules`.
