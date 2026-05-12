# Design — formalize-paradigm-principles-2026-05-12

## Context

The product side of the financial-core paradigm went through a refinement session on 2026-05-12 captured in:

- `features/common/centro-de-solicitudes.md` — § "Principio arquitectónico: capacidades, no rutas" + § "Scope explícito del Centro" + decisions 9 & 10 in the Decisiones clave table.
- `discoveries/core-modulos-transversales-discovery.md` — § "Refinamiento del modelo conceptual — Sesion 2026-05-12".
- `features/common/centro-de-reporteria.md` — decision 13 in the Decisiones clave table (alignment of Reportes with the Wizard of Oz principle).

The template was last touched on 2026-05-08, before this refinement landed. The two principles formalized in the session are **architecturally relevant** for any app cloned from the template — they shape how CTAs cross app boundaries and what does/doesn't belong in the Inbox — but they are NOT enforced anywhere in the template today. The aim of this change is to close that gap with the minimum amount of normative spec text, plus the matching annotations in the canonical types file and in the multi-agent project memory, so that future contributors (human or agent) cannot accidentally drift from the principles in PR review.

This change is **documentation-only**. No source code, no manifests, no tests, no canonical type shapes change. The `Solicitud<TPayload>` shape with four canonical states (`pendiente | en_proceso | completed | rejected`) is preserved unchanged — the 2026-05-12 session explicitly rejected adding an `execution: manual | programmatic` dimension to the model, and we honor that here.

## Decisions

### Decision 1 — Encode the two principles as Requirements, not as `## Context` notes

Both principles are normative in intent: a deviation (e.g. a CTA hard-wired to "create Solicitud", or a cron-job tracking view shoved into the Inbox) is a contract violation that PR review SHOULD reject. The OpenSpec convention is that only `### Requirement:` blocks with Scenarios are enforceable by `openspec validate --strict` and by reviewer discipline. Notes in `## Context` or `## Architecture` sections are non-normative.

Encoding the principles as Requirements (with explicit "reject on PR review" Scenarios for the predictable deviations) gives reviewers concrete language to point at when calling out a violation. The cost is two more Requirements in `core-modulo-genericos` (count grows from 9 to 11); the benefit is the principles become contractual, not advisory.

Alternative considered: encode both as a `## Architecture` paragraph in `core-modulo-genericos/spec.md`. Rejected — non-normative text does not trigger validation and does not produce a reject signal in PR review.

### Decision 2 — Annotate the canonical types file, but NOT inline on individual fields

The 2026-05-12 principles are **architectural** — they govern how external CTAs and programmatic jobs interact with the Centro. They do not change the shape of `Solicitud<TPayload>`, do not add fields, do not change defaults. Adding inline JSDoc on individual fields would be misleading (the principles do not constrain the fields themselves).

Instead, extend the file-level banner comment (already present at the top of `src/types/genericos.ts`) with a section that names both principles and points to the Requirement titles in `core-modulo-genericos/spec.md`. Readers landing in the types file get the architectural context without polluting per-field annotations.

### Decision 3 — Mirror the two paragraphs into CLAUDE.md and AGENTS.md, byte-identically

The Multi-Agent Rules Sync convention enforces byte-identity between `CLAUDE.md` and `AGENTS.md`. Both files have a `## Architecture` section with bulleted principles ("Composition API only.", "Design tokens drive every visual value.", etc.). Two more bullets — one per principle — fit the existing pattern and ensure that every AI assistant onboarded into the project receives the principles as project memory.

Alternative considered: link from the project memory to the spec instead of duplicating the text. Rejected — the project memory is read on every session of every agent; pointing them to a spec they may or may not load defeats the purpose. Two short bullets are cheap and load-bearing.

### Decision 4 — Do NOT touch the Solicitud type, the manifest, the Inbox page, or the mocks

This change is the docs/contract catch-up. The companion change (`align-genericos-with-product-spec-and-add-inbox-manual-cta`) will resolve all the deeper model gaps (`Solicitud<TPayload>` generic, `kind`, `assignee`, `target_app`, `InboxTypeConfig` registry, `AlertCategory`, `ReportPermissions`, `REPORT_DEPENDENCY` as Tarea, main CTA implementation). Splitting the work this way (a) lets the docs-only change land quickly and be reviewed in isolation, (b) lets the deeper refactor be reviewed against a baseline that already encodes the principles it has to honor.

### Decision 5 — Reportes spec gets no change in this docs-only round

The 2026-05-12 alignment also touches Reportes (decision 13 in `centro-de-reporteria.md`: Reportes also decides internally whether generation is programmatic or human, consistent with the Wizard of Oz principle). However, the spec change for Reportes is intertwined with the deeper rework (the 2026-05-11 decisions about `REPORT_DEPENDENCY` as Tarea, `ReportPermissions`, `allows_auto_generation`, `dependencies_unmet[]`) that lands in the companion change. Encoding the Reportes-side Wizard of Oz alignment ahead of the deeper rework would be premature — the Requirement would have to reference fields and types that don't yet exist on the template. Defer to the companion change.

## Out of scope

- All canonical type changes (D1–D6 in the Phase 1 report): `Solicitud<TPayload>`, `kind`, `assignee`, `target_app`, `target_role`, `InboxTypeConfig`, `AlertCategory`, `ReportPermissions`, `REPORT_DEPENDENCY` as Tarea. Land in the companion change.
- The main CTA "Crear Solicitud / Tarea" implementation. Lands in the companion change.
- Adoption by apps (CLP, FIN, LEX, OPS, TRD). Each app does its own follow-up when it next gets touched.

## Validation

- `openspec validate formalize-paradigm-principles-2026-05-12 --strict` passes.
- `openspec validate --all --strict` passes after the deltas are applied (no existing Requirement is modified or removed; the two ADDED Requirements stand on their own).
- `CLAUDE.md` and `AGENTS.md` are byte-identical after the edit (`diff CLAUDE.md AGENTS.md` returns no output).
- `src/types/genericos.ts` compiles and `npm run type-check` still exits 0 (the change is a comment-only edit; no type shape is altered).
