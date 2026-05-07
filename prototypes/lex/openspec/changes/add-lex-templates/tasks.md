# Tasks — add-lex-templates

This change creates the `lex-templates` capability — the typed registry of the eight Lex onboarding templates. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-templates/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes — they describe the work that materializes the contract. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-templates` change. The contract IS the deliverable; the code IS the consequence. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-templates/spec.md` — ADDED Requirements: 4 requirements, 11 scenarios. Cover: typed registry as single source, short label drives table cells/badges, filters built from the registry only, Detalles tab renders the full label.
- [ ] Run `openspec validate add-lex-templates --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types (aspirational — may follow in a separate change)

### 2.1 Registry module

- [ ] `src/lex/templates/registry.ts` — exports the canonical surface:
  - `LexTemplateId` TS union with the eight identifiers (verbatim from legacy `providerTemplates.js`)
  - `LexTemplate` interface (`id`, `label`, `shortLabel`, `origin`, `modality`, `colorToken`)
  - `LEX_TEMPLATES: Record<LexTemplateId, LexTemplate>` — eight entries
  - `LEX_TEMPLATE_IDS: readonly LexTemplateId[]` — declaration order (Ardua KYC → KYC AL → KYB → Local KYC → KYC AL → KYB → Ardua KYC v2 → Local KYB v2)
- [ ] Type guard `isLexTemplateId(x): x is LexTemplateId` for narrowing arbitrary strings from API responses.
- [ ] Document in a one-line file banner that this file is the only place where template UUIDs and labels appear in source.

### 2.2 Style tokens

- [ ] `src/styles/tokens.css` — declare the eight `--badge-template-*` CSS custom properties referencing the colour palette from `core-theming`.
- [ ] Verify each token resolves to a valid colour at runtime (Vitest snapshot or smoke test).

## 3. Components / pages (aspirational)

### 3.1 Badge renderer

- [ ] `src/lex/templates/TemplateBadge.vue` — receives `templateId: LexTemplateId | string`, looks up `LEX_TEMPLATES`, renders the `shortLabel` with the registered colour token. Falls back to neutral badge + literal id on unknown values, plus `devWarn` once per session.
- [ ] Storybook story (or Vitest mount snapshot) covering: each of the eight templates, the unknown-id fallback, the disabled state.

### 3.2 Filter Select source

- [ ] `src/lex/templates/useTemplateFilter.ts` — composable returning `{ options, value, setValue }` where `options` iterates `LEX_TEMPLATE_IDS`. Shared by `lex-clientes` and `lex-altas`.

## 4. Tests (aspirational)

- [ ] `src/lex/templates/registry.spec.ts` — exercise every Scenario:
  - `LEX_TEMPLATES['ardua-kyc']` returns the full record matching the design table.
  - Inlined UUID in a Vue file fails an ESLint custom rule (or PR-review snapshot).
  - `paint('unknown-template')` is rejected by TS at build time.
  - `TemplateBadge` renders short label + colour for known id.
  - `TemplateBadge` falls back + emits `devWarn` once per session for unknown id.
  - Filter Select option list has length 8 and value strings match `LEX_TEMPLATE_IDS`.
  - Selecting `Ardua KYB` updates the URL to `?template_id=ardua-kyb`.
  - Clearing the filter removes `template_id` from the URL.
  - Detalles tab `?tab=detalles` renders the full label `Ardua KYC v2` for `ardua-kyc-extra`.
  - Unknown template id on Detalles renders the raw id with no badge colour.
- [ ] Coverage on `registry.ts` and `TemplateBadge.vue` ≥ 90%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-templates --strict` passes.
- [ ] `openspec validate --all --strict` passes (existing core baseline + Lex capabilities + the new `lex-templates` baseline).
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-templates` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-templates`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-templates/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-templates/`.
- [ ] Final commit with conventional message: `specs: add lex-templates — Lex onboarding template registry`.
