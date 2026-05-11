# Design — add-core-modulo-genericos

## Context

Every Ardua core app — present (FIN, OPS, TRD, LEX, CLP, COM) and future — ships the same four cross-cutting modules: a **Dashboard** as the consolidated home, an **Inbox** for human-actionable Solicitudes with a lifecycle, an **Alertas** module for system-detected events that need triage, and a **Reportes** module for consolidated async outputs and inter-area coordination. The semantics are universal; the data is per-domain.

The HTML prototype `prototypes/_core-template-frontend/_core-template-frontend.html` v1.15 implements all four modules in their fullest profile (Dashboard is full, Inbox is the canonical OPS skeleton, Alertas is profile B + workflow, Reportes is all-capabilities including inter-area dependencies). Its README §"Módulos genéricos del financial-core" (lines 675–884) documents the conceptual contract: what each module is for, what NOT to put there, the alert profiles A/B/C/D, the placement-decision heuristic, the cloning instructions per module, and the rule that the four modules sit at the top of the sidebar without a `<div class="sb-section">` wrapper.

The contract is normative across the core. Without it, six apps reinvent four modules each — twenty-four reinventions, all subtly diverging. The cost shows up as: alerts of the same conceptual type behaving differently per app; Solicitudes called "items" in one app and "tickets" in another; cross-area report dependencies emitted with three different event shapes; Dashboards drifting into domain-specific filters; "Ver detalle" hardcoded in Inbox in some apps and routed through the manifest engine in others.

This design lifts the prototype's HTML-level patterns into a typed, tested OpenSpec capability. The HTML capacidad-comments (`// CAPACIDAD: ...`) become per-feature module config flags. The `INB_TYPES` / `ALERT_TYPES` / `CATEGORIES` JS objects become typed declarations of `Solicitud` / `Alerta` / `Report` shapes. The cross-app `REPORT_DEPENDENCY` event becomes a normatively-shaped TS type. The Activos/Histórico, Catálogo/Histórico, and Nuevas/Histórico segmentations become a single `<Segmenter>` contract honored across the three list-shaped generic modules.

This design captures the non-obvious decisions and their tradeoffs.

---

## Decision 1 — Inbox houses Solicitudes (mandatory term); detail surface is the Drawer

### The question

The prototype README is emphatic: "la unidad de gestión del Inbox es la **Solicitud** — usar ese término al describir el contenido del Inbox, no 'item' genérico" (line 706, 843). Why elevate this from a documentation note to a contract Requirement?

### The decision

`Solicitud` is the canonical TS identifier for the unit of management of every Inbox across every Ardua core app. The shape is fixed: `id`, `type`, `source_app`, `source_module`, `owner`, `sla_hours`, `state`, `timeline`, `comments` (plus optional domain fields like `client`, `amount`, `context`, `detail`, `reference`). Inbox MUST segment via `<Segmenter>` into Activos / Histórico. The detail surface is the side `<Drawer>` (`meta.detail = 'drawer'`), NOT a centered modal.

App-specific extensions extend `Solicitud` via TS interface extension or generics:

```ts
// in src/modules/ops/types.ts
import type { Solicitud } from '@/types/genericos';
export interface OpsWithdrawalRequest extends Solicitud {
  type: 'WITHDRAWAL_REQUEST';
  client: string;
  amount: number;
  // ... domain-specific fields
}
```

Redefining the base shape (`interface Solicitud { ... }` in app code) is forbidden. The validator enforces that `Solicitud` is imported only from `@/types/genericos`.

### Rationale

- **One word per concept across the core.** When a backend dev writes "el equipo de OPS recibió una nueva Solicitud" in a ticket, every other team knows what surface they mean.
- **Lifecycle, owner, SLA are universal.** Every Inbox surfaces all three; therefore every `Solicitud` carries them as base fields.
- **Drawer is the right detail surface.** A list of work items needs fast, side-by-side detail review without losing the list context. Centered modals interrupt the triage flow; drawers preserve it.

### Tradeoff accepted

Apps that want to call the unit something other than "Solicitud" in user-facing copy MAY do so per module config (e.g. UI string overrides), but the TS identifier MUST remain `Solicitud`. The documentation rule sticks: in PR review, an app that introduces a generic `Item` or `Ticket` interface in its Inbox is rejected.

---

## Decision 2 — Alertas profiles A/B/C/D differentiate the four canonical patterns; one profile per ALERT_TYPE

### The question

Different apps have very different alert needs. CLP wants pure notification banners ("KYC vencido"). LEX wants a workflow-driven triage list ("Diferencia detectada — assign a compliance officer"). FIN wants a time-series chart of saldo anomalies. TRD wants a cross-app KPI dashboard ("daily limit utilization across CLP, OPS, FIN"). Forcing one UI pattern across all four would either over-build for CLP or under-build for TRD.

### The decision

Four canonical profiles, declared per `ALERT_TYPE` in app config:

- **Profile A — Active triage list (default).** Inbox-style list without owner/SLA. New alerts appear; the user marks each as resolved or dismissed. The simplest profile. CLP and most "notification-only" types.
- **Profile B — Workflow.** Master-detail with sub-categorization, drawer with timeline + comments, terminal-state ClosureModal with justification. The fullest profile. LEX uses this; the prototype HTML implements it as the canonical reference.
- **Profile C — Time-series with charts.** A chart-first surface where alerts are derived from a metric crossing a threshold; resolution is automatic when the metric returns. FIN saldo / variance use this.
- **Profile D — Cross-app KPI dashboard.** A consolidated dashboard of cross-app metrics (different data per source app). TRD daily limits use this.

The TS type carries the discriminator: `interface Alerta { profile: 'A' | 'B' | 'C' | 'D'; ... }`. App config registers each `ALERT_TYPE` with one profile. The page renders the appropriate UI per profile. Apps activate ONE profile per ALERT_TYPE — mixing profiles within a single ALERT_TYPE is forbidden (a type is conceptually one of the four).

### Rationale

The four profiles cover every alert pattern observed across the existing apps. Anything outside this set is either a domain-specific module (not an alert) or a re-categorization (the developer should pick the closest profile). Forcing a discriminator into the type guarantees that UIs branch on the same axis, not on app-specific ad-hoc fields.

### Tradeoff accepted

Adding a fifth profile requires a new OpenSpec change — apps cannot invent profile E privately. This is the price of cross-app consistency.

---

## Decision 3 — Alertas terminal states (`resolved` and `dismissed`) require justification via the ClosureModal

### The question

When an alert moves to a terminal state, should the user click once and forget, or be required to type a justification?

### The decision

Both terminal transitions — `* → resolved` and `* → dismissed` — require justification. They MUST use `mode: 'modal'` per the `core-data-tables` state-machine contract, opening the shared `<ClosureModal>` from `core-modals`. The justification is persisted on the alert's `closure_comment` field (required, non-empty, ≥10 chars) and surfaced in the Drawer's Timeline as a `kind: 'closed'` event.

This applies to profile B (workflow) by default. Profile A (notification-only) MAY skip justification when the app's module config sets `requireClosureComment: false` for that ALERT_TYPE; profiles C and D rarely transition through the user UI (they auto-close or are dashboards), so the rule is effectively profile-B-mandatory.

### Rationale

A resolved or dismissed alert is an audit artifact. Without a justification, the audit log says "user X marked alert Y as resolved at T" — which tells a future auditor nothing about *why*. The 10-char minimum is the prototype's heuristic for "more than a click, less than a paragraph"; we ratify it.

### Tradeoff accepted

One extra modal click per terminal transition. This is intentional — terminal states ARE the audit boundary; making them frictionless defeats the purpose.

---

## Decision 4 — Reportes splits Catálogo / Histórico via segmentation

### The question

Reportes mixes two conceptually distinct entities: report templates (definitions — "this is what a Régimen Informativo looks like") and report runs (generations — "Régimen Informativo, March 2026, completed at 02:00, output 1.2MB PDF"). Should they share one table?

### The decision

No. Reportes uses `<Segmenter>` to split Catálogo (templates) from Histórico (runs) at L1. Each segment has its own filters, columns, and actions:

- **Catálogo** — `Report` shape: `id`, `category`, `name`, `description`, `periodicity`, `format`, `params`, optional `dependencies?`, optional `cron_enabled` / `cron_active`. Default filters: Categoría, Periodicidad. Actions: Generar, Editar metadata, Configurar CRON.
- **Histórico** — `ReportRun` shape: `id`, `report_id`, `requested_at`, `completed_at?`, `status` (`'ok' | 'error' | 'pending'`), `params`, `trigger` (`{ type: 'cron' } | { type: 'manual', user_id }`), `output_url?`, `error_message?`. Default filters: Trigger (Manual / CRON / Sistema), Estado (OK / Error / Pendiente), Período.

The two segments do NOT share columns, filters, or actions. The existing `core-data-tables` Segmenter pattern handles all the rendering plumbing.

### Rationale

A single table conflating templates and runs misses the point of both surfaces. Templates are stable definitions to be read, edited, and triggered; runs are immutable audit records to be inspected and downloaded. Their lifecycles are unrelated. The prototype HTML already separates them; the contract ratifies it.

### Tradeoff accepted

Apps that want a "recent runs of this report" table inline in Catálogo MAY implement it as a Drawer drill-down, NOT as a third segment. The two-segment rule stays.

---

## Decision 5 — REPORT_DEPENDENCY events: normative shape; consumed by destination Alertas as `profile: 'A'`

### The question

When a report's `dependencies` list includes an unfulfilled prior close in another app (e.g. "OPS conciliación" not yet closed for the period blocking the FIN consolidated P&L), how do we coordinate the cross-app signal?

### The decision

The Reportes module emits a `REPORT_DEPENDENCY` event of normative shape:

```ts
interface ReportDependency {
  report_id: string;        // the report blocked
  blocking_app: string;     // the app that owes the close (e.g. 'OPS')
  blocking_module: string;  // the module within that app (e.g. 'Movimientos')
  blocking_state: string;   // human-readable: 'Conciliación operativa cerrada'
  sla_days_before?: number; // how many days before the report SLA the dep must close
  emitted_at: number;       // numeric timestamp
}
```

The destination app's Alertas module consumes this as an `Alerta` with `type: 'report_dependency'` and `profile: 'A'` (active triage). When the dependency closes (the source app marks it `completed: true`), the Alerta auto-closes and becomes a `Histórico` entry with `closure_comment: 'auto-closed by source-app completion'`.

The emission point is the report's "Generar" action: when the user clicks Generar, the engine MUST evaluate the report's `dependencies[]`; if any entry has `completed: false`, the action is BLOCKED, a `REPORT_DEPENDENCY` event is emitted to the blocking app, and the Generar button surfaces the prerequisite reason ("Falta cierre en OPS · Movimientos · Conciliación operativa cerrada").

### Rationale

Cross-app coordination needs a typed contract or it devolves into custom payloads per integration. Anchoring the event shape to a TS interface and the consumption surface to Alertas profile A means every app that integrates is wired the same way. The auto-close on source-app completion closes the loop without a manual user action.

### Tradeoff accepted

Apps cannot invent a custom dependency event shape. If an app needs richer payloads (e.g. structured "this many records still pending"), they MAY add fields via TS interface extension — the base shape remains required. The audit-trail consequence: every cross-app dependency follows the same UI surface (Alertas) regardless of origin.

---

## Decision 6 — Dashboard is a responsive card grid; NOT L1/L2/L3; NOT a domain module surface

### The question

Should Dashboard reuse the L1/L2/L3 page pattern (page header + KPI cards + section + data surface) like every other Ardua page?

### The decision

No. Dashboard is its own pattern: a responsive card grid (typically a 2 / 3 / 4-column auto-fit grid). The cards are the content; there is no L2 KPI strip and no L3 section + data surface. The cards include:

- KPIs aggregated from active domain modules (clickable; click navigates to the relevant module).
- Counters for the three list-shaped generics: Inbox (unread Solicitudes), Alertas (critical alerts), Reportes (pending runs / unfulfilled dependencies).
- A consolidated "Actividad reciente" card (cross-module timeline).
- App-specific consolidated views (next vencimientos, embedded top-N alerts, etc.).

Dashboard MUST NOT carry domain-specific actions, filters, or sub-tabs. Filters and actions belong in the domain modules; Dashboard is read-only-with-deep-links. A Dashboard that drifts into having its own sub-tab / filter chip / batch CTA is a PR-review reject.

### Rationale

A consolidated home that becomes interactive starts duplicating domain-module surfaces. The simplest defense is to ban the constructs that enable the drift: no filters, no sub-tabs, no domain-specific actions. Card click → navigate to the domain module that owns the data. The Dashboard's whole job is orientation, not operation.

### Tradeoff accepted

Apps that want "quick actions" on the Dashboard MAY add a single global CTA (e.g. "Configurar mi dashboard") that opens a settings modal — that is configuration, not domain operation. Anything beyond that is rejected.

---

## Decision 7 — Decision heuristic for new content placement

### The question

When a developer is building a new feature and is unsure whether it belongs in Inbox, Alertas, Reportes, or a domain module, what's the deterministic decision tree?

### The decision

Apply this heuristic in this exact order; the first match wins:

1. **Is it a request with an owner and a lifecycle (To Do → In Progress → Done) requiring a human decision?** → Inbox.
2. **Is it a system-detected event needing human attention (or auto-resolution by the system)?** → Alertas.
3. **Is it consolidated information with async processing or inter-area coordination?** → Reportes.
4. **None of the above?** → it's domain-specific; goes in a domain module.

PR reviewers MUST require the author to justify the placement against this heuristic. Misplacement (e.g. putting a request-with-lifecycle in Alertas, or putting a domain-specific list in Inbox) is a PR-review reject.

### Rationale

Without the heuristic, every developer applies their own intuition; over a few months four apps drift four different directions. The heuristic is short enough to memorize, deterministic enough to apply, and it falls back to the right answer (domain module) when nothing fits.

### Tradeoff accepted

Edge cases exist. A "system-detected event that creates a request" sounds like both Alertas and Inbox. The heuristic resolves it: if a human has to decide and own it, it's a Solicitud (Inbox); if the system processes it and a human just reviews, it's an Alerta. The heuristic forces the author to pick one.

---

## Decision 8 — "What NOT to put here" rules are normative

### The question

The prototype README documents what each generic module is FOR. Should the negation — what each module is NOT for — also be normative?

### The decision

Yes. Each generic module has explicit prohibitions, written into the spec as Scenarios:

- **Inbox is NOT for** system-detected events (those are Alertas), simple per-module exports (those live in the domain module's table), or merely-informational notifications (those are toasts).
- **Alertas is NOT for** human-originated Solicitudes (those are Inbox), planned tasks (those are domain or Inbox), or static catalog browsing (that's Reportes Catálogo or a domain module).
- **Reportes is NOT for** actionable items (those are Inbox), simple CSV exports of a domain table (those are domain-module actions), or live dashboards (that's Dashboard or a domain module).
- **Dashboard is NOT for** domain operations (those go in domain modules), filterable lists (those are domain or generics), or sub-tabs / multi-segment navigation (that's a domain module).

These prohibitions are enforced at PR review against the spec scenarios, not at runtime. The validator does not statically check them; the human reviewer does.

### Rationale

A positive definition without a negation invites scope creep. "Inbox is for Solicitudes" is fine; "Inbox is for Solicitudes and NOT for system-detected events" is enforceable. Each prohibition gets a Scenario in the spec so it's grep-able by reviewers.

### Tradeoff accepted

PR reviewers must know the rules. The seed onboarding doc MUST surface them. The cost is one paragraph per module in the contributor guide; the win is preventing six different apps from drifting in six different directions.

---

## Decision 9 — Shared TS types live in `src/types/genericos.ts`; app extensions via interface extension or generics

### The question

Where do the canonical `Solicitud`, `Alerta`, `Report`, `ReportRun` shapes live? How do apps add domain-specific fields without forking the shape?

### The decision

`src/types/genericos.ts` exports the base interfaces:

```ts
export type SolicitudState = 'pendiente' | 'en_proceso' | 'completed' | 'rejected' | string;
export type AlertProfile = 'A' | 'B' | 'C' | 'D';

export interface TimelineEvent { kind: string; at: number; user_id?: string; payload?: Record<string, unknown>; }
export interface Comment { id: string; author_id: string; at: number; body: string; }

export interface Solicitud {
  id: string;
  type: string;             // app-specific; matches a key in the app's INBOX_TYPES
  source_app: string;       // 'OPS' | 'FIN' | 'CLP' | ...
  source_module: string;
  owner: string | null;     // user id; null = unassigned
  sla_hours: number | null; // null when SLA-tracking is disabled per module config
  state: SolicitudState;
  timeline: TimelineEvent[];
  comments: Comment[];
  closure_comment?: string;
}

export interface Alerta {
  id: string;
  type: string;
  profile: AlertProfile;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  source_app: string;
  source_module: string;
  owner?: string | null;     // profile B+ only
  state: 'new' | 'in_progress' | 'resolved' | 'dismissed' | string;
  timeline: TimelineEvent[];
  comments?: Comment[];      // profile B+ only
  closure_comment?: string;
}

export interface ReportDependency {
  report_id: string;
  blocking_app: string;
  blocking_module: string;
  blocking_state: string;
  sla_days_before?: number;
  emitted_at: number;
}

export interface Report {
  id: string;
  category: string;
  name: string;
  description: string;
  periodicity?: string;
  format?: 'PDF' | 'XLSX' | 'CSV' | string;
  params?: string[];
  dependencies?: Array<{ app: string; module: string; task: string; sla_days_before?: number; completed: boolean }>;
  cron_enabled?: boolean;
  cron_active?: boolean;
  locked?: boolean;
  locked_reason?: string;
}

export interface ReportRun {
  id: string;
  report_id: string;
  requested_at: number;
  completed_at?: number;
  status: 'ok' | 'error' | 'pending';
  params: string;
  trigger: { type: 'cron' } | { type: 'manual'; user_id: string } | { type: 'system' };
  output_url?: string;
  error_message?: string;
}
```

Apps extend via interface extension when they add fixed fields (`interface OpsWithdrawalRequest extends Solicitud { client: string; amount: number; ... }`) or via generics when the field shape varies by type (`Solicitud<T extends Record<string, unknown> = {}>` with `payload: T`).

### Rationale

One source of truth for the four shapes. App extensions stay in app folders. Re-defining the base interface in app code is forbidden — the validator (and ESLint with a custom rule, optional) catches violations. TS's structural typing means a domain-extended `Solicitud` is still consumable by the generic Inbox engine.

### Tradeoff accepted

Adding a base field requires a contract change (this OpenSpec capability is amended). This is the right friction — base fields affect every app. App-specific fields are zero-friction.

---

## Decision 10 — Capacity comments are NOT carried over; module config flags + capability-gated routes replace them

### The question

The HTML prototype uses `// CAPACIDAD: SLA tracking`, `// CAPACIDAD: Asignación humana`, `// CAPACIDAD: Drawer lateral con timeline`, etc. as comment-marked blocks an app deletes when it doesn't need a capability. What's the Vue/TS equivalent?

### The decision

Two mechanisms, depending on what the capacity gates:

- **Per-module config flags.** Each app's `src/modules/<app>/config.ts` exports a typed config object whose flags drive optional UI. Example for Inbox:

  ```ts
  export const INBOX_CONFIG = {
    enableSLATracking: true,
    enableHumanAssignment: true,
    enableTimelineDrawer: true,
    enableComments: true,
    enableClosureModal: true,
    enableKanbanView: true,
    enableCardsView: true,
  } as const;
  ```

  The Inbox page reads `INBOX_CONFIG.enableSLATracking` and conditionally renders the SLA column / KPI / filter. Disabling a capability means flipping the flag, NOT deleting code.

- **Capability-gated routes.** When a capability gates an entire surface (e.g. an app that doesn't have an Inbox at all because it has no Solicitudes today), the route MAY declare `meta.capabilities: ['inbox']` per `core-navigation`; the route guard returns 404 or redirects when the capability is absent.

Crucially: an app that "has no Solicitudes today" still ships the Inbox route + page, which renders `<EmptyState>` with the canonical empty message ("No hay Solicitudes en este momento"). The four routes are mandatory; the data shape is mandatory; the data itself can be empty.

### Rationale

Comment-driven feature flags are unenforceable in TS. Module config flags are typed, lintable, testable, and don't require deleting code. Capability-gated routes are the right granularity for "this app doesn't have this surface yet" without breaking the contract that all four routes exist.

### Tradeoff accepted

Apps cannot fully remove a generic module. The Inbox is always there, even when empty. The tradeoff is intentional: the moment one app omits Inbox entirely, the contract starts to crack. Forcing the empty surface forces the surface to remain wired.

---

## Tradeoffs

### Rigidity vs cross-app consistency

The contract is rigid — Solicitud is mandatory, terminal-state justification is mandatory, dependency event shape is fixed, the four modules cannot be removed. Apps that want creative latitude on these four surfaces don't get it. This is the price of cross-app consistency. Six apps speaking the same vocabulary is more valuable than each app having its own dialect.

### Reuse vs domain-tailoring

The shared types push for reuse; domain extension via interface extension preserves tailoring. The risk is "extension" turning into "deviation" — an app's `OpsAlerta extends Alerta` that overrides the `state` union to its own incompatible enum. The validator MUST check that extension preserves the base unions (and not just the field names). Where the validator can't enforce, PR review must.

### Empty surfaces vs lean shipping

Forcing every app to ship Inbox/Alertas/Reportes routes — even empty ones — adds 4 pages and 4 routes that may never be used. The cost is small (a page that renders `<EmptyState>` is ~30 lines of Vue). The win is large: when an app eventually needs Inbox, the surface is already wired and the data shape is already canonical.

### Profile-A simplicity vs profile-B richness

Apps with a profile-A-heavy alert mix get a "lighter" Alertas surface (no drawer, no timeline, no closure modal). The risk is that the app's developers hand-roll the simpler surface and drift from the canonical UI. The mitigation: profile-A is a configuration, not a different page — the same `Alertas.vue` page reads the profile and renders the appropriate UI per type. There is one codebase; profile is data.

---

## Open questions (deferred to follow-up changes)

- **Audit hooks across the four modules.** Today, audit emission is owned by `core-actions-manifest` for actions. Inbox state transitions, alert closures, and report runs all emit audit entries through that engine. A cross-cutting `core-audit-log` capability that unifies the audit trail is out of scope; this capability assumes the manifest engine handles it.
- **i18n of the canonical labels.** "Solicitud", "Activos", "Histórico", "Catálogo", "Nuevas" are Spanish per the template's audience. A future change MAY introduce i18n for English / Portuguese clones. The TS identifiers stay English; the user-facing strings are translatable.
- **Multi-tenant Solicitudes.** When an Inbox aggregates Solicitudes across multiple tenants (a holding-group case), the `source_app` field doesn't carry tenant scope. A future extension MAY add `tenant_id?: string` to the base shape.
- **Cross-app navigation from Alertas / Inbox.** When a Solicitud in OPS Inbox references a record in CLP, clicking it should navigate cross-app. The current contract doesn't specify the URL convention. Deferred to a navigation-cross-app change.

---

## Summary

| Decision | Resolves |
|---|---|
| 1 | Solicitud as canonical Inbox unit; Drawer detail surface |
| 2 | Four Alertas profiles A/B/C/D; one per ALERT_TYPE |
| 3 | Alertas terminal states require justification (ClosureModal) |
| 4 | Reportes Catálogo / Histórico segmentation |
| 5 | REPORT_DEPENDENCY normative shape; consumed by Alertas profile A |
| 6 | Dashboard is a card grid; not L1/L2/L3; no domain ops |
| 7 | Decision heuristic for new content placement |
| 8 | "What NOT to put here" rules are normative |
| 9 | Shared types in `src/types/genericos.ts`; extension via interface extension / generics |
| 10 | No capacity comments; module config flags + capability-gated routes replace them |
