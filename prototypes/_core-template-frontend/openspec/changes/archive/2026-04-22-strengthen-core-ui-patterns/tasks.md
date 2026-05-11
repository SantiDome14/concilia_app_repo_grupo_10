# Tasks — strengthen-core-ui-patterns

This change has two parallel workstreams:
1. Three capability spec deltas (contract changes).
2. Two root-level project memory files (`CLAUDE.md` + `AGENTS.md`).

Both are artifact-only changes at the contract and convention level — no application code is modified by this change itself. Real implementation of the three new patterns (CTAs cap, confirm dialogs, alert banners) will happen in subsequent OpenSpec changes when individual apps begin migration.

## 1. Spec deltas

- [x] `specs/core-layout/spec.md` — ADDED Requirement: `Page header actions MUST be limited to a maximum of three primary CTAs`, 5 scenarios
- [x] `specs/core-modals/spec.md` — ADDED Requirement: `Confirmation dialogs MUST follow the destructive action pattern`, 8 scenarios
- [x] `specs/core-error-handling/spec.md` — ADDED Requirement: `Alert banners MUST surface persistent system-level messages`, 7 scenarios
- [ ] Run `openspec validate strengthen-core-ui-patterns --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the 10 baseline specs still validate

## 2. Root-level agent memory files

- [x] Write `CLAUDE.md` at repo root — project overview, tech stack, architecture, code conventions, component conventions, documentation structure, OpenSpec workflow summary, multi-agent sync rule, git policy, communication style
- [x] Write `AGENTS.md` at repo root — byte-identical mirror of `CLAUDE.md`
- [x] Add the multi-agent sync rule to both files: any change in one file MUST be mirrored in the other in the same commit
- [x] Cross-reference: in `CLAUDE.md` / `AGENTS.md`, point to `openspec/specs/` as the source of truth for contracts, and to `openspec/config.yaml` for the OPSX-injected context
- [x] Cross-reference: in `openspec/config.yaml` `context:`, add a pointer: `"Project conventions are documented in CLAUDE.md / AGENTS.md at the repo root"`

## 3. Documentation updates

- [x] Update `README.md` at repo root — add a "Project conventions" section that points to `CLAUDE.md` as the canonical source
- [x] Ensure the README's "Repository layout" section lists `CLAUDE.md` and `AGENTS.md` at the root

## 4. Validation gates

- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes
- [ ] `npm run spec:check` passes (10 + 3 deltas = 13 specs validated under `--strict`)
- [ ] `npm run build:qa` passes
- [ ] Manual verification: open the repo in a fresh Claude Code session and confirm `CLAUDE.md` is picked up as project memory (the agent references the Ardua conventions without being prompted)

## 5. Archive

- [ ] After all validation gates pass, run `openspec archive strengthen-core-ui-patterns`
- [ ] Confirm the CLI applies the 3 deltas into the baseline (`openspec/specs/core-layout/spec.md`, `openspec/specs/core-modals/spec.md`, `openspec/specs/core-error-handling/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-strengthen-core-ui-patterns/`
- [ ] Final commit with conventional message: `feat(specs): strengthen core UI patterns — header CTAs, confirm dialogs, alert banners`
