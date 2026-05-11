# Strengthen core UI patterns — CTAs, confirmations, alert banners

> Jira REQ: — (no Jira ticket; this is a template-level gap closure driven by the Head of Product review of the initial scaffold)
> Module: core-template (foundation)

## Why

The initial scaffold of `core-template-frontend` established 10 capabilities that cover the backbone of every Ardua core app (layout, navigation, data tables, actions menu, modals, theming, forms, API, auth, error handling). During the Head-of-Product review of the baseline, three gaps surfaced that are important enough to contractualize before any Ardua core app starts implementing features on top of the template:

1. **Header CTAs are under-specified.** The current `core-layout` spec says the L1 page header "exposes a title, an optional subtitle, and an actions area aligned to the right." That is not enough. It does not define how many CTAs are allowed, what they represent, what variants they use, or in what order. Without a rule, two developers (or two AI agents) implementing two different modules will produce two different-looking headers — defeating the consistency goal that motivated the template in the first place.
2. **Confirmation dialogs are not specified.** Destructive actions (delete, cancel, void) are common in every financial module, but the current `core-modals` spec only mentions confirmation modals in passing ("MAY use an even narrower width"). No requirement defines the copy pattern, the button pair, the color treatment, the dismissal behavior, or the explicit-confirmation affordance that destructive actions require. This is a critical gap: without a contract, agents will either skip confirmation entirely or design ad-hoc variants.
3. **Alert banners are absent.** Toasts (ephemeral, auto-dismiss) are well-specified in `core-error-handling`. But there is no pattern for **persistent, in-page alerts** — the kind used for "connection lost", "unsaved changes", "read-only mode", "system maintenance scheduled". Without this pattern, agents will either misuse toasts for persistent messages (wrong UX) or reinvent an ad-hoc banner per module.

Closing these three gaps in the same change keeps the effort focused and lets reviewers evaluate them as one coherent improvement to the shell-level contracts.

## What Changes

- **`core-layout`** — add a new requirement `Page header actions MUST be limited to a maximum of three primary CTAs` that specifies: maximum count (3), variant rules (1 primary + 2 ghost), ordering (primary on the right), semantics (each CTA MUST map to a top-level action of the module, never to a row-level action), and collapse behavior (when 3 would overflow on narrow viewports, secondary CTAs collapse into an overflow menu).
- **`core-modals`** — add a new requirement `Confirmation dialogs MUST follow the destructive action pattern` that specifies: narrow width, danger-accented header, explicit action label (never a generic "OK"), ghost Cancelar on the left and danger-variant Confirmar on the right, **disabled backdrop-click dismissal** (ESC still works, but clicking outside does NOT close — destructive actions require an explicit choice), and mandatory success/error toast after the action resolves.
- **`core-error-handling`** — add a new requirement `Alert banners MUST surface persistent system-level messages` that specifies: where they render (below the Topbar, above the Main content, full-width), the four variants (info, warning, danger, success), dismissibility rules (dismissible by default; non-dismissible for ongoing system states like "read-only mode"), the title + description + optional action contract, and the distinction between this pattern and toasts.
- **Add `CLAUDE.md` and `AGENTS.md` to the repo root.** These are the human-navigable and agent-consumable "project memory" files that Claude Code and other AI coding assistants read automatically on every session. They consolidate: project overview, tech stack, architecture principles, code conventions (naming, style, testing, commit policy), documentation structure, and communication style. They are kept in sync with each other by the same rule that tradingsuit uses in its reference implementation — any rule change in one file MUST be mirrored in the other in the same commit.

## Capabilities

### Affected Capabilities

- `core-layout` — one new requirement added (header CTAs contract)
- `core-modals` — one new requirement added (confirmation dialog pattern)
- `core-error-handling` — one new requirement added (alert banners pattern)

### New Capabilities

None. This change strengthens existing capabilities rather than introducing new ones.

### Non-capability artifacts

- `CLAUDE.md` at repo root — project-level agent instructions (Claude Code project memory)
- `AGENTS.md` at repo root — mirror of `CLAUDE.md` for other AI agents (Codex, Cursor, etc.)

These are not OpenSpec specs (they govern conventions, not requirements), so they do not produce delta spec files. They are committed as part of this change but live outside `openspec/`.

## Notes

- This is the first OpenSpec change in this repository that exercises the full `openspec new change → fill artifacts → openspec validate → openspec archive` flow. If any friction surfaces during the process, it will inform whether we fork the default `spec-driven` schema to an Ardua-specific variant in a future change.
- After this change is archived, the baseline will cover 13 requirements across the three affected capabilities (from the current 20 to 23 — assuming each of the 3 new requirements carries 2-3 scenarios).
