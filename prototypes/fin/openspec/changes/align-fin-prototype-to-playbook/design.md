# Design — align-fin-prototype-to-playbook

## Context

`prototypes/fin/` was scaffolded in late April 2026 from `_core-template-frontend`. Its archived migration change `2026-04-30-migrate-fin-prototype` rebuilt the legacy `prototypes/fin-old/fin-prototype.html` monolith into the Vue 3 + TS + Vite + manifest-engine shape. Eight days later, on 2026-05-08, the OPS migration completed and surfaced two operator-reported bugs whose fixes were canonised in `MIGRATION-PLAYBOOK.md` as Patterns #13 (sidebar z-index ladder) and #16 (`<RouterView>` keyed by route name). `prototypes/fin/` predates that canonisation and therefore reproduces both bugs.

The next product initiative on fin is REQ-50 (`FIN — Tesorería — Disponibilidades`). Applying REQ-50 over the current fin scaffold ships the documented bugs to the operator. This change closes that gap before REQ-50 lands.

The proposal also captures three smaller drifts that have accumulated since the fin scaffold:

- `MIGRATION-NOTES.md` is missing from fin. The playbook nominates the per-prototype legacy inventory as required (a cross-prototype layer in `MIGRATION-PLAYBOOK.md` does not replace per-prototype inventories).
- `CLAUDE.md` and `AGENTS.md` of fin declare a 3-layer Documentation Hierarchy (Contracts / Project Memory / Skills). The template's 4-layer canon (Contracts / Project Memory / Migration Playbook / Skills) is missing the explicit Migration Playbook layer in fin.
- `prototypes/fin/openspec/specs/` is a manual replica of the template's specs (`prototypes/_core-template-frontend/openspec/specs/`). The template is the canon; fin's replica must follow.

Baseline evidence: audit run 2026-05-18 against `main` shows the 5 quality gates green in fin today (lint, type-check, test:run with 328/328, spec:check 13/13, build:qa). Pattern #19 (`<SelectItem value="">`) is met (no occurrences in fin source). Pattern #12 (template-only modules cleanup) is met (no `Módulo A/B/C` pages, no `/playground/*` routes).

## Goals / Non-Goals

**Goals:**

- Promote Patterns #13 and #16 from `MIGRATION-PLAYBOOK.md` to enforceable Requirements on `core-navigation` and `core-layout` respectively, in the template (canon) and replicated in fin.
- Apply the two code fixes in fin so the existing playbook patterns hold at the spec level after the promotion.
- Create `prototypes/fin/MIGRATION-NOTES.md` populated with the legacy inventory and decisions of the archived `migrate-fin-prototype` change plus the new fixes from this change.
- Sync the Documentation Hierarchy in fin's `CLAUDE.md` + `AGENTS.md` to the 4-layer template canon, keeping the two files byte-identical.
- Keep the 5 quality gates green in fin and `openspec validate --all --strict` green in the template after the changes.

**Non-Goals:**

- Replicating the new Requirements into `prototypes/ops/`, `prototypes/lex/`, `prototypes/trd/`, `prototypes/clp/`. Each follow-up is its own change against its own Jira REQ (`align-<app>-prototype-to-playbook`).
- Promoting any other playbook Pattern (#14, #17, #18, #19) to spec contract. They stay in the playbook (see Decision 4).
- Adding `src/components/inbox/` to fin to match the template's folder list. The audit confirmed fin's Inbox implementation reuses the template's generic components adequately. Documented in MIGRATION-NOTES.md as deliberate omission.
- Refactoring the rest of fin (Tesorería sub-tabs, Movimientos top-level, manifests). All of that is `add-fin-disponibilidades` (REQ-50), which sits on top of this change.
- Symlinking or vendoring template specs into fin. Replication stays manual per Decision 3.

## Decisions

### Decision 1 — Touch template + fin in a single proposal (scope amplio)

**Question:** Promotion of Patterns #13 and #16 to spec contracts modifies `prototypes/_core-template-frontend/openspec/specs/`. Should that live in this proposal, or be a prior standalone change against the template?

**Decision:** keep both prototypes in this single proposal. The OpenSpec change folder lives in `prototypes/fin/openspec/changes/align-fin-prototype-to-playbook/` because the motivation is FIN-driven (unblock REQ-50); the proposal.md `What Changes` section lists the template files explicitly so reviewers see the cross-prototype scope.

**Why:**

- The work is causally a single change: the fin code fixes are only meaningful once the patterns are spec contracts (otherwise the playbook entry remains the only authority and the spec deltas don't add enforcement).
- Splitting into two proposals (template-first, then fin) doubles the artifact overhead and creates an awkward intermediate state where template specs require behavior that fin doesn't yet implement.

**Alternatives considered:**

- Two proposals (template-first, then fin) — rejected. Adds overhead without changing the outcome; the template specs would be enforced on every prototype on the next `npm run spec:check` regardless.
- Three proposals (one per prototype, in cascade) — rejected. Same overhead penalty multiplied.
- Defer template promotion to a later cross-prototype change and patch fin via Decision-N override in `design.md` — rejected. That keeps the playbook as authority indefinitely; the user explicitly chose "scope amplio" in the audit dialog.

**Failure modes the rule prevents:**

- Spec drift between template (canon) and fin replica accumulating silently until a future migration trips over it.
- Operator-reported navigation bugs reappearing in REQ-50 because the fixes were deferred to a "later" change that never materialises.

**Trade-off:** the change folder lives in fin but touches the template. Reviewers must read the proposal.md `What Changes` to see the cross-prototype scope; `git log` on the template won't show this change in its own openspec/changes/.

### Decision 2 — OPS / LEX / TRD / CLP NOT in this proposal

**Question:** the same spec promotion benefits every prototype. Why not replicate into all five in one shot?

**Decision:** out of scope here. Each receiving prototype has its own `align-<app>-prototype-to-playbook` follow-up change against its own track.

**Why:**

- Each prototype is owned by its own REQ track (OPS by the OPS migration suite, LEX by the LEX migration suite, etc.). Bundling them here would expand blast radius beyond FIN's REQ-50 dependency chain.
- OPS already implements both patterns at the code level (the playbook canonised them from OPS's bugs). Adding the Requirements to OPS's `openspec/specs/` is paperwork, not behavior change — it can wait for the next OPS proposal.
- LEX, TRD, CLP have not started their migrations. Promoting Requirements in their specs without running the 5 quality gates against them risks specs that don't match the legacy code's state.

**Alternatives considered:**

- Replicate into all five prototypes in this proposal — rejected. Blast-radius creep; harder review; ties FIN's release to four other prototype's CI states.
- Replicate into OPS only (because it already implements the patterns) — rejected. Asymmetric scope; better to handle in OPS's next change naturally.

**Failure modes the rule prevents:**

- A single proposal failing CI in one of five prototypes blocks merge for all five.
- Reviewer fatigue from a 5-prototype delta diff.

### Decision 3 — Replicate fin specs from template manually (don't symlink, don't vendor)

**Question:** `prototypes/fin/openspec/specs/` is a copy of `prototypes/_core-template-frontend/openspec/specs/` content-wise but lives as its own files in fin. How should fin pick up the new template Requirements?

**Decision:** manual replica. The same Requirement + Scenarios markdown blocks are added to both `prototypes/_core-template-frontend/openspec/specs/<capability>/spec.md` and `prototypes/fin/openspec/specs/<capability>/spec.md`. A final `tasks.md` checkbox runs `diff` between the two files for the touched capabilities to confirm no drift.

**Why:**

- `openspec validate` runs per-prototype against the `openspec/specs/` files within that prototype's working tree. A symlink (or absolute path reference) would work on POSIX but make `openspec` operations fragile across Windows / CI / forks and obscure provenance in `git log`.
- Spec content is short (~80 lines per Requirement + Scenarios). The maintenance cost of two manual files is low; the architectural clarity ("each prototype's specs are self-contained") is high.
- Future prototypes will replicate manually too; the convention is already in place across OPS/LEX/TRD/CLP.

**Alternatives considered:**

- Symlink fin's `core-navigation/spec.md` to the template's — rejected. CLI fragility + obscures intent.
- A pre-merge `sync-specs.sh` script that overwrites fin's specs from the template — rejected. Pulls every spec, not just the changed ones; risks clobbering fin-specific Requirements (if any are added later).
- Move all specs to a shared package — out of scope and would require infrastructure not in the playbook.

**Failure modes the rule prevents:**

- Hidden coupling that fails CI on Windows / hosted runners.
- Fin spec evolving independently from template canon without anyone noticing.

### Decision 4 — Keep playbook Patterns #14, #17, #18, #19 in the playbook (not promoted to spec)

**Question:** since #13 and #16 are being promoted, should the rest of the playbook follow?

**Decision:** no. Patterns #14 (don't replicate legacy architectural errors), #17 (big-dashboard antipattern), #18 (PSP Módulo B strict shape), #19 (`<SelectItem value="">` antipattern) stay in `MIGRATION-PLAYBOOK.md`.

**Why:**

- **#14, #17:** these are migration-strategy diagnostics ("when scoping a migration, ask these 3 questions"). They guide proposal authors during exploration, not behavior at runtime. A spec Requirement of the form "the proposal SHALL ask N diagnostic questions" is awkward and unenforceable in CI.
- **#18:** the rule is "strict Módulo B shape per the playbook", but the Módulo B shape is itself defined in `core-module-types` and `_core-template-frontend/src/pages/ModuloB.vue`. Promoting Pattern #18 to spec would duplicate that definition.
- **#19:** the SelectItem antipattern is a reka-ui v2 quirk. Promoting it to `core-data-tables` Requirement would force every prototype's filter dropdowns to refactor in lockstep within one PR; the playbook entry achieves the same defensive effect at lower coordination cost (audit catches it during PR review).

**Alternatives considered:**

- Promote all playbook patterns in a single mega-change — rejected. Blast radius; review fatigue; each pattern has a different right home (some are runtime, some are process).
- Defer #13 and #16 too — rejected. Both are runtime bugs caught by operator and exactly the kind of pattern that benefits from `openspec validate` enforcement.

**Failure modes the rule prevents:**

- Bloating spec contracts with non-runtime rules dilutes the meaning of the contract.
- Promoting #19 forces a synchronised filter-dropdown refactor across all prototypes within one PR window.

## Risks / Trade-offs

- **[Risk]** `<RouterView>` keying changes the remount behavior. Tests that mount the App shell and assert "module X is still rendered after navigation" may fail. **Mitigation:** run `npm run test:run` after the App.vue change; expect zero regressions because no current test asserts no-remount-on-route-change; the playbook documents this as desired behavior.
- **[Risk]** The z-index change to `z-[600]` puts the sidebar above ANY `<Sheet>` overlay, including future drawers used as workflow detail surfaces (e.g. Inbox). **Mitigation:** the playbook explicitly notes this trade-off ("the modal's parent component unmounts on route change so the modal goes with it cleanly") and the operator's escape mechanism wins over the modal's focus trap.
- **[Risk]** The cross-prototype scope makes the diff harder to review (changes in two `prototypes/*/` folders). **Mitigation:** the proposal.md `What Changes` section explicitly names every file modified per prototype; reviewers can apply the diff in two passes.
- **[Risk]** Future template spec changes for `core-navigation`/`core-layout` must remember to replicate into fin. **Mitigation:** Decision 3 documents the manual replica convention; the final `tasks.md` checkbox runs `diff` between template and fin specs for these capabilities and fails apply if drift is detected.
- **[Risk]** `openspec validate --strict` in the template runs against the template's `openspec/specs/` after this proposal modifies them. If the template repo has its own CI gate (yes, per `prototypes/_core-template-frontend/.github/workflows/`), the workflow runs there too. **Mitigation:** quality gates explicitly include `openspec validate --all --strict` in the template directory as a task.

## Migration Plan

This is a non-data, non-API change. No rollback complexity.

1. Apply spec deltas in template canonical specs (`core-navigation/spec.md` ADDED Requirement, `core-layout/spec.md` ADDED Requirement). Run `openspec validate --all --strict` in template.
2. Replicate the Requirements into fin canonical specs at the same paths. Run `openspec validate --all --strict` in fin.
3. Apply the two code fixes in fin (`Sidebar.vue`, `App.vue`).
4. Create `MIGRATION-NOTES.md` and sync `CLAUDE.md`/`AGENTS.md` Documentation Hierarchy section.
5. Run the 5 quality gates in fin.
6. Hand off to user for commit and PR.

After merge:

7. Run `/opsx:archive align-fin-prototype-to-playbook` to apply spec deltas into canonical specs and move the change folder to `openspec/changes/archive/YYYY-MM-DD-align-fin-prototype-to-playbook/`.
8. Proceed to Propuesta 2 (`add-fin-disponibilidades`) on the now-aligned fin prototype.

**Rollback:** revert the commits. The spec promotion is reversible by removing the ADDED Requirement blocks; the code fixes are reversible by reverting the two files; the MIGRATION-NOTES.md and CLAUDE.md docs are pure additions.

## Open Questions

- **Q1**: should the new `core-layout` Requirement be named "RouterView remount discipline" (behavior-named) or "Top-level RouterView keying" (mechanism-named)? Behavior-named is more durable if Vue Router gets a different mechanism in a future major. Defaulting to behavior-named in `specs/core-layout/spec.md` unless reviewer pushes back.
- **Q2**: the `core-navigation` Requirement mentions the canonical z-index ladder (z-[600] nav, z-[601] toggle, < 500 modal overlay). Should the exact integer ladder be normative (locked by Requirement) or indicative (mentioned in the Scenario as an example)? Defaulting to **normative** — operators have already proven the ladder values matter (z-50 vs z-[500] is the actual bug). Reviewer can push back to indicative if they want flexibility for future overlay primitives.
- **Q3**: should `MIGRATION-NOTES.md` document the legacy `fin-old` inventory in full, or reference the archived `migrate-fin-prototype` change for that? The archived change has the inventory; the playbook says per-prototype inventories live in MIGRATION-NOTES. Defaulting to a **concise** MIGRATION-NOTES that links to the archive for full detail, plus the two new fixes from this change.

These default if no reviewer override.
