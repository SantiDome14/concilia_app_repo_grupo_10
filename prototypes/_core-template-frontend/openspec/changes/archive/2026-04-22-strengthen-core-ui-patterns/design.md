# Design — strengthen-core-ui-patterns

## Context

This design document captures the rationale behind the three new requirements proposed for `core-layout`, `core-modals`, and `core-error-handling`, plus the addition of `CLAUDE.md` / `AGENTS.md` to the repo root.

Each of the three capability changes answers a specific question that the current baseline leaves open. The design here explains **why the answer is what it is**, what alternatives we considered, and what tradeoffs we accepted.

---

## Decision 1 — Header CTAs: max 3, one primary, two ghost

### The question

The current `core-layout` requirement says: *"[L1] exposes a title, an optional subtitle, and an actions area aligned to the right."* That is descriptive, not prescriptive. Two implementers reading that sentence will write two different headers.

### The decision

A page header MAY expose up to **three** primary CTAs. Not more. The rightmost CTA MUST use the `primary` button variant; any additional CTAs MUST use the `ghost` variant. Each CTA MUST represent a top-level action on the module as a whole (e.g. "Nuevo registro", "Exportar", "Configurar columnas") — never a row-level action (those belong in the per-row actions menu, governed by `core-actions-menu`).

### Alternatives considered

- **Unlimited CTAs.** Rejected. Without a cap, headers grow unpredictably. Every app ends up with 5-7 CTAs and users can't find the main one.
- **Exactly one CTA.** Rejected. Too restrictive. Many modules genuinely need 2-3 top-level actions (the canonical trio is something like "Nuevo", "Importar", "Exportar").
- **Two CTAs.** Considered and almost chosen. Three felt like the right cap: it accommodates the canonical trio without inviting bloat.
- **Priority-based overflow into "..." menu.** Considered for the collapse behavior. Accepted as the mobile/narrow-viewport fallback.

### Why "one primary + two ghost" specifically

One primary button draws the eye to the single most important action ("crear"). Ghost variants for the rest keep the header visually calm while still offering reach. If we allowed two primary buttons, the visual hierarchy breaks and users don't know which action is "the" action. If we allowed three ghost buttons with no primary, the main action loses its emphasis.

This pattern is consistent with how Stripe, Linear, and Vercel render their page headers — a deliberate choice because those are the references closest to what Ardua operators expect from a modern internal tool.

### Failure modes the rule prevents

- A developer adds a fourth CTA → spec violation flagged by review.
- A developer puts a row-level action (e.g. "Aprobar seleccionados") in the header → spec violation, because header CTAs are module-level only. Row-level or bulk-selection actions have their own surface (actions menu or bulk-action bar, the latter not yet specified — deferred).
- Two primary buttons next to each other → spec violation, only the rightmost MAY be primary.

---

## Decision 2 — Confirmation dialogs: no backdrop dismissal, danger-accented, explicit label

### The question

The current `core-modals` baseline covers Create, Detail, and Edit modals thoroughly. But destructive flows (delete a record, cancel a pending order, void a transaction) are common in Ardua core apps and currently have no pattern. The baseline's only mention is one line: *"Confirmation modals (destructive) MAY use an even narrower width."*

### The decision

Confirmation dialogs SHALL follow a stricter pattern than Create/Edit modals:

- **Width:** narrow (`max-w-sm`, ~24rem). The dialog is intentionally small and high-focus.
- **Header:** title uses a danger-accented tone (icon + danger text color), making the destructive nature obvious at a glance.
- **Body:** describes *exactly what will happen* ("Esta operación eliminará el registro R-042 y no puede deshacerse") — not a generic "Are you sure?".
- **Footer:** `Cancelar` on the left (ghost), `{VerboEspecífico}` on the right (danger variant — e.g. "Eliminar", "Cancelar orden", "Anular"). The label MUST be the specific verb. Never generic "OK", "Sí", or "Confirmar".
- **Dismissal:** ESC closes (cancel-equivalent), **but clicking on the backdrop does NOT close**. This is the single place where we deviate from the generic modal dismissal rule in `core-modals`. Reason: destructive actions require an explicit choice (pick Cancelar or pick the destructive verb). Accidentally dismissing by clicking outside turns an "Are you sure?" into a coin flip on distraction.
- **Feedback:** after the action resolves (success or failure), a toast is emitted. On success, the toast uses the title + description contract (`core-error-handling`). On failure, the confirmation dialog stays open so the user can retry or cancel.

### Alternatives considered

- **Double-click confirmation on the row directly (no dialog).** Rejected. Great for power users but fails discoverability — new users don't know it's there. Finance staff who only touch the app once a week need the explicit dialog.
- **Require typing "DELETE" to confirm.** Considered for high-stakes actions. Rejected as mandatory — too much friction for routine cancellations. MAY be adopted per-module later via capability extension.
- **Backdrop click dismisses like other modals.** Rejected. See reasoning above — destructive actions need an explicit choice.

### Why success/error feedback via toast, not inline

Toasts are the cross-app convention for operation outcomes (already contracted in `core-error-handling`). Embedding success feedback inside the dialog would create a new pattern and leak UX specific to this dialog. Instead we rely on what's already specified: `toast.success('Registro eliminado', 'R-042 — Pago #128')`.

---

## Decision 3 — Alert banners: persistent, below Topbar, four variants

### The question

Toasts are good at one thing: ephemeral feedback for a single operation. They auto-dismiss. They're not where you communicate *persistent* system-level messages like "you're in read-only mode", "connection is degraded", "scheduled maintenance at 22:00", or "you have 3 unsaved changes". Those messages need to stay visible until the condition changes.

The current `core-error-handling` capability only covers toasts, empty states, loading states, and error boundaries. Persistent banners are a gap.

### The decision

An alert banner pattern SHALL be added:

- **Position:** between the Topbar and the Main content, full-width edge-to-edge. Stacks vertically when multiple banners are active (max 2 stacked; additional banners are collapsed into an expandable "+N más" control — deferred if needed).
- **Variants:** four, matching the semantic palette from `core-theming`:
  - `info` — blue tint, used for non-blocking informational messages (new feature available, scheduled maintenance announced).
  - `warning` — amber tint, used for attention-requiring states that don't block (connection degraded, approaching quota).
  - `danger` — red tint, used for blocking or critical states (system in read-only mode, auth token expiring soon).
  - `success` — green tint, used for persistent confirmation of a multi-step background operation completing (rare; most successes belong in toasts).
- **Structure:** leading icon (variant-specific), title (bold, short), optional description (one line, wrap if needed), optional action button on the right (primary variant colored by variant), dismiss `×` button on the far right (omitted if the banner is non-dismissible).
- **Dismissibility:** dismissible by default. Non-dismissible only for banners that represent an ongoing system state the user cannot resolve (e.g., "Read-only mode until 22:00"). When non-dismissible, the `×` button is not rendered.
- **Persistence:** banners persist across page navigations within the same session — they are app-level state, not route-level. Dismissing a dismissible banner records the dismissal (by banner ID) in memory for that session, so the banner does not re-appear after route changes.

### Alternatives considered

- **Use toasts with `duration: Infinity` for persistent messages.** Rejected. Toasts are bottom-right; banners need to be top-center and full-width so users can't miss them. Also, toasts stack in a small corner — two persistent toasts eat the feedback surface.
- **Put persistent messages in the Topbar itself.** Rejected. Topbar is crowded enough already with breadcrumb + account menu. Adding a rotating message area complicates the contract in `core-navigation`.
- **Per-module banner slots.** Rejected. Banners are app-level concerns (connection, permissions, maintenance) — scoping them to modules forces every module to re-implement the same banner logic.

### Why this is a separate capability concern, not in `core-layout`

`core-layout` defines the shell structure (Sidebar + Topbar + Main). Banners live **inside** the Main column (between Topbar and page content), so they could be argued as a layout concern. But they surface **errors and system states**, which makes them semantically a concern of `core-error-handling`. Capability boundaries are about semantics, not physical position. Putting banners in `core-error-handling` keeps the toast + empty + loading + banner + error-boundary story unified in one capability.

---

## Decision 4 — Adding `CLAUDE.md` + `AGENTS.md` to the root

### The question

The current setup has three layers of project context for agents:

1. **`openspec/specs/`** — formal contracts (what MUST be true). Validated by `openspec validate --strict`.
2. **`openspec/config.yaml` → `context:`** — project description and rules, injected into OPSX CLI calls at runtime.
3. **`.claude/skills/`** and **`.cursor/skills/`** — generated by `openspec init`, describe the OPSX workflows (how to run propose/apply/archive/explore).

What's missing: **a human-navigable, agent-auto-loaded "project manual"** that consolidates stack, conventions, and policies in one file at the root. The OpenSpec CLI does not generate this — it's a separate concern that the reference implementation in tradingsuit (an Ardua-sibling repo) solves by adding `CLAUDE.md` and `AGENTS.md` at the root.

### The decision

Add both files at the repo root, mirrored content, synchronized by an explicit rule. Each file contains:

- Project overview (one paragraph)
- Tech stack (table with layer → tool)
- Architecture principles (SPA, stateless routes, composition API, design tokens)
- Code conventions (naming, style, error handling, tests, forms)
- Component conventions (where to put pages, layouts, feedback, UI primitives)
- Documentation structure (how to find specs, changes, guides, config)
- OpenSpec workflow summary (how to use `/opsx:*` slash commands)
- Multi-agent rules sync rule (any change in one file MUST be applied to the other in the same commit)
- Git and commit policy (only the user commits; agents stop at ready-to-commit)
- Communication style for the agent

### Why two identical files

- `CLAUDE.md` is automatically loaded by Claude Code as project memory when a developer opens the repo.
- `AGENTS.md` is the convention picked up by Codex, Cursor (in some modes), and several other AI coding tools.
- By keeping them identical we get the same signal in every assistant without forking logic.
- The sync rule is enforced via a pre-commit check in a later change (deferred) — for now, the rule itself plus reviewer discipline is sufficient.

### Why not consolidate into `openspec/config.yaml → context:`

The `context:` field in `config.yaml` is the right place for **what the OPSX CLI injects into agent instructions** at runtime — concise, dense, machine-oriented. A human dev browsing the repo does not open `config.yaml` looking for conventions. They open the root `CLAUDE.md`. Both files serve different audiences and should coexist. They cross-reference each other.

### Alternative: writing conventions directly into the capability specs

Rejected. Specs are **contracts** (SHALL/MUST requirements with Gherkin scenarios validated by a CLI). Conventions like "prefer small focused functions" or "commit policy" are **norms**, not contracts. They don't fit the Requirement format and don't need to be validated as passing/failing. Keeping them in CLAUDE.md/AGENTS.md preserves the contract/norm separation.

---

## Open questions

1. **Dismissed banner state persistence across sessions.** Current decision: session-only. Some users might want "never show this banner again" persistence. Deferred until we have a concrete use case.
2. **Bulk-action bar pattern** (above tables, appears when rows are selected). Not covered by this change. It's a related but distinct pattern and will be a separate capability or requirement in a future change.
3. **Header CTAs with icon-only variants on narrow viewports.** The current decision is "collapse secondary CTAs into overflow menu". An alternative is "show icon-only versions inline". Deferred until we see real mobile/narrow-viewport UX data.
