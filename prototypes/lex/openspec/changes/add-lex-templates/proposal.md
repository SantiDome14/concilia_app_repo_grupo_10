> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-templates — Lex onboarding template registry

## Why

The legacy `core-lex-frontend` ships eight KYC/KYB onboarding templates as a hand-rolled `src/constants/providerTemplates.js` constant: UUIDs, colour values, and short labels declared inline and consumed by `clientes.vue`, `altas.vue`, and the `client-details.vue` Onboarding section. The constant is referenced by name in some places and by literal UUID in others, label strings are paraphrased per page, and the colour mapping mixes hex literals with semantic names. The result is that adding a new template requires touching every page; renaming a label diverges the badge from the filter; and reviewers cannot tell at a glance which UUIDs are valid.

The new project locks the registry into a single typed module that every page consumes for filters, badges, and inline labels. The migration MUST copy the canonical UUIDs verbatim — divergence from the production values is a bug, not a stylistic choice. Adding a ninth template becomes a one-file change that propagates everywhere automatically.

## What Changes

- Create the `lex-templates` capability. New spec at `openspec/specs/lex-templates/spec.md` (materialised via archive) with 4 requirements covering: (a) the typed registry as the single source for the eight onboarding templates; (b) short labels and registered colour tokens drive every cell and badge; (c) the Plantilla filter on `/clientes` and `/altas` is backed by the registry only; (d) the Cliente Detalle Onboarding section renders the full label.
- Define the typed surface. `src/lex/templates/registry.ts` exports `LexTemplateId`, `LEX_TEMPLATES`, and `LEX_TEMPLATE_IDS`. The colour tokens live in `src/styles/tokens.css` (or equivalent) under `--badge-template-*`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-data-tables` — Plantilla filter is the canonical filter pattern from `core-data-tables`, sourced from this registry.
  - `core-forms` — the filter Select uses the shadcn-vue Select, never native `<select>`.
  - `core-error-handling` — unknown template ids fall back to a neutral badge and emit a one-time `devWarn` per session, per the `core-error-handling` contract.
  - `core-theming` — colour tokens are CSS custom properties, never inline hex.
  - `lex-clientes`, `lex-altas`, `lex-cliente-detalle` — consumers of the registry; they reference this capability for the canonical lookup and rendering rules.

## Capabilities

### Affected Capabilities

None modified by this change. `core-data-tables`, `core-forms`, `core-error-handling`, `core-theming`, and the three Lex page capabilities are *referenced* in the new spec but their existing requirements are not edited.

### New Capabilities

- `lex-templates` (Lex foundation; cross-page registry contract) — 4 requirements, 11 scenarios.

### Non-capability artifacts

- `src/lex/templates/registry.ts` — typed registry exporting `LexTemplateId`, `LEX_TEMPLATES`, `LEX_TEMPLATE_IDS`.
- `src/styles/tokens.css` (or equivalent) — `--badge-template-*` CSS custom properties mapped to the colour palette.
- ESLint rule (or PR-review rule) banning literal UUIDs and inline tailwind colour classes for templates outside `registry.ts` — named in `tasks.md` as an aspirational follow-up.

These are implementation locations referenced by the spec; the spec itself remains the source of truth.
