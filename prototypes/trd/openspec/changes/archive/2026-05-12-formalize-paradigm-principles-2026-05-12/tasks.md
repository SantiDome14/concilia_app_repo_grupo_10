# Tasks — formalize-paradigm-principles-2026-05-12

Docs-only change. No source code, no manifest, no mock, no test changes. The canonical `Solicitud<TPayload>` shape and the four canonical states are preserved.

## 1. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `External CTAs MUST invoke a capability of the target app, not a specific execution route ("Wizard of Oz" principle)`, with 3 scenarios (direct integration path / Centro de Solicitudes path / runtime-config switch between paths)
- [ ] `specs/core-modulo-genericos/spec.md` — ADDED Requirement: `Centro de Solicitudes scope is exclusive to human-intervention work; pure programmatic jobs live outside`, with 4 scenarios (programmatic job runs without Inbox entry / programmatic job with opt-in fallback creates Solicitud on failure / proposed "data sync tracking view" rejected in PR review / proposed `execution: 'programmatic'` model field rejected in PR review)

## 2. Code annotations

- [ ] `src/types/genericos.ts` — extend the existing file-level banner comment with a new section titled "Architectural principles formalized 2026-05-12" naming the two principles and pointing to the matching Requirement titles in `core-modulo-genericos/spec.md`. No type shape, no field, no default changes.

## 3. Agent rules sync

- [ ] `CLAUDE.md` — add two bullets to the `## Architecture` section: one for the Wizard of Oz principle (CTAs invoke capabilities, not routes), one for the Centro scope exclusivity (programmatic jobs out, opt-in fallback in).
- [ ] `AGENTS.md` — apply the byte-identical edit so `diff CLAUDE.md AGENTS.md` returns no output. The Multi-Agent Rules Sync section mandates this.

## 4. Validation gates

- [ ] `openspec validate formalize-paradigm-principles-2026-05-12 --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after the deltas are applied — no existing Requirement is modified or removed
- [ ] `diff CLAUDE.md AGENTS.md` returns no output (the two files remain byte-identical)
- [ ] `npm run type-check` exits 0 — the comment-only edit in `src/types/genericos.ts` does not introduce a type error
- [ ] `npm run lint` exits 0
- [ ] `npm run test:run` exits 0 — no test depends on the new comment text; existing tests are unaffected

## 5. Archive

- [ ] After all validation gates pass, run `openspec archive formalize-paradigm-principles-2026-05-12`
- [ ] Confirm the CLI applies the deltas into `openspec/specs/core-modulo-genericos/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-formalize-paradigm-principles-2026-05-12/`
- [ ] Final commit with conventional message: `docs(inbox): formalize Wizard of Oz architectural principle and Centro scope exclusivity in core-modulo-genericos`
