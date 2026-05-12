- Jira REQ: — (template-level paradigm formalization; product source-of-truth is `features/common/centro-de-solicitudes.md` decisions 9–10 and `discoveries/core-modulos-transversales-discovery.md` § Refinamiento del modelo conceptual — Sesion 2026-05-12)
- Module: core-template (foundation)

# Formalize the "Wizard of Oz" architectural principle and the explicit scope of the Centro de Solicitudes

## Why

The 2026-05-12 product session formalized two architectural principles of the financial-core paradigm that were implicit in the previous specs:

1. **Wizard of Oz architectural principle — capabilities, not routes.** An external CTA (CLP, Pago Directo, RFQ Gateway, etc.) invokes a *capability* declared by the destination app (e.g. `ejecutar_retiro` of OPS); the capability decides internally — at runtime, based on configuration that may vary by amount, client, hour, operation type — whether to satisfy the invocation via direct integration (immediate result, no Centro entry) or by creating a Solicitud/Tarea in the Centro (eventual result, CTA subscribes to state). The CTA does NOT pin a specific execution path. This habilita launching a product with 100 % human execution on day one and automating progressively without ever touching the CTA-side code.
2. **Centro de Solicitudes scope is exclusive to human-intervention work.** The Inbox / Centro houses only Solicitudes/Tareas requiring backoffice human action. Pure programmatic jobs (sync, audit, normalization, depuración, cron jobs) live in code as Task Definitions, scheduler infrastructure, or equivalent — they do NOT appear in the Centro. A programmatic job MAY declare opt-in fallback to the Centro: upon failure, the system invokes the Centro endpoint with `source_app: 'system'` to escalate as a Solicitud/Tarea for human follow-up. Without that fallback, failures route to Observability alerts only.

A third decision tied to these principles is the explicit **rejection of an `execution: manual | programmatic` dimension on the Solicitud model** — pure programmatic jobs live outside the Centro entirely, so the discriminator would be meaningless inside the model. The canonical `Solicitud<TPayload>` shape with four canonical states (`pendiente | en_proceso | completed | rejected`) is preserved unchanged.

The template currently codifies neither principle. The `core-modulo-genericos` spec frames the four standard modules but does not address:

- The capability/route decoupling that allows a Solicitud to be silently swapped for a direct integration (or vice versa) without touching the calling CTA.
- The explicit exclusion of programmatic infrastructure from the Inbox.

Without normative spec text on both, the template risks two predictable drifts: (a) downstream apps wiring CTAs directly to "create Solicitud" endpoints, foreclosing the direct-integration path; (b) downstream apps shoveling cron-job state into the Inbox, polluting the human work surface. PR review has no contract to point at. This change closes that gap by adding two Requirements to `core-modulo-genericos` plus matching annotations in the canonical types file and in the multi-agent project memory.

The work is documentation-only — no source code, no manifests, no tests change. The canonical `Solicitud<TPayload>` model and the four canonical states remain identical.

## What Changes

- **`core-modulo-genericos`** — add a new Requirement *External CTAs MUST invoke a capability of the target app, not a specific execution route ("Wizard of Oz" principle)*. The capability SHALL decide at runtime whether the invocation is satisfied via direct integration (no Centro entry) or by creating a Solicitud/Tarea (Centro entry); the CTA SHALL subscribe to the eventual state without coupling to which path was taken.
- **`core-modulo-genericos`** — add a new Requirement *Centro de Solicitudes scope is exclusive to human-intervention work; pure programmatic jobs live outside*. Programmatic jobs MUST NOT be modeled as Solicitudes/Tareas; they live in code as Task Definitions. A job MAY declare an opt-in fallback to the Centro for human escalation on failure. The Solicitud model MUST NOT grow an `execution: manual | programmatic` discriminator.
- **`src/types/genericos.ts`** — extend the existing banner comment with a section that references both principles (with pointers to the Requirement titles, not to external files — the template's docs are self-contained).
- **`CLAUDE.md` + `AGENTS.md`** — add two bullets to the `## Architecture` section, byte-identical between the two files per the Multi-Agent Rules Sync convention.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — two ADDED Requirements (Wizard of Oz principle + Centro scope exclusivity). No existing Requirement modified or removed.

### New Capabilities

None. This change extends an existing capability.
