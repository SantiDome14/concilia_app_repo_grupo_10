# Tasks — add-lex-limites

This change creates the `lex-limites` capability — the Límites tab on `/clientes/:id` with REQ-44 (Otros clarification) and REQ-45 (Editar non-expired). It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-limites/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-limites` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-limites/spec.md` — ADDED Requirements: 6 requirements, 19 scenarios. Cover: entity segmentation gated by docket, limit card surface (state + consumption + origins), Crear Límite modal with 15-option catalog, REQ-44 Otros clarification conditional + tooltip, REQ-45 Editar non-Expirado restricted to amount + end_date, destructive Eliminar with consumption-history warning.
- [ ] Run `openspec validate add-lex-limites --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and pure derivation (aspirational)

### 2.1 Types

- [ ] `src/lex/limites/types.ts` — `Limit` (`id`, `client_id`, `entity: 'HAZ_PAGOS' | 'CIRCUIT_PAY'`, `amount`, `consumed`, `start_date`, `end_date`, `origins: LimitOrigin[]`, `clarification?`), `LimitState` (`'Pendiente' | 'Activo' | 'Expirado'`), `LimitOrigin` (the 15-option catalog union from `discoveries/lex-limites-discovery.md` §3.3).

### 2.2 Pure derivation

- [ ] `src/lex/limites/derive.ts` — `deriveLimitState({ start_date, end_date, now }: { start_date: string; end_date: string; now?: Date }): LimitState`. Pure function with extensive unit tests for boundary conditions.

### 2.3 API binding

- [ ] `src/lex/limites/api.ts` — `createLimit(payload)`, `updateLimit(id, payload)`, `deleteLimit(id)`. All routed through the shared axios from `core-api-layer`.

## 3. Components (aspirational)

- [ ] `src/lex/limites/LimitesTab.vue` — section orchestrator. Renders Haz section if `haz_docket`, Circuit section if `circuit_docket`; orders Activo first then by `end_date` desc.
- [ ] `src/lex/limites/LimitCard.vue` — state badge (`--badge-*`), date range, amount with thousand separators, consumption progress bar, available/overage tag, origin pills (with `title` tooltip when Otros has clarification).
- [ ] `src/lex/limites/CreateLimitModal.vue` — multi-select over 15-option catalog (shadcn-vue Select with multi mode), amount with formatting, dates with cross-validation, conditional Aclaración textarea with character counter.
- [ ] `src/lex/limites/EditLimitModal.vue` — pre-fills amount + end_date editable; start_date, origins, Aclaración read-only.
- [ ] Wire delete via `core-modals` destructive confirmation showing date range, amount, and the consumption-history warning.

## 4. Tests (aspirational)

- [ ] `src/lex/limites/derive.spec.ts` — exhaustive boundary tests:
  - `start_date` exactly now → Activo (or Pendiente per timezone tie-break).
  - `end_date` exactly now → Activo (or Expirado per tie-break).
  - All four combinations (before / during / after / inverted dates).
- [ ] `src/lex/limites/LimitesTab.spec.ts`:
  - Both sections render when both dockets present.
  - Only haz section renders when only `haz_docket` is set.
  - Activo first then `end_date` desc.
- [ ] `src/lex/limites/LimitCard.spec.ts`:
  - Activo card: badge, progress, available amount.
  - Overage card: 110% bar in danger colour + `Sobregiro` tag.
  - Origin pills render with literal labels.
  - Otros tooltip surfaces clarification on hover.
- [ ] `src/lex/limites/CreateLimitModal.spec.ts`:
  - Multi-select requires at least one origin.
  - end_date after start_date.
  - Amount formats with thousand separators.
  - Aclaración appears when Otros selected, required if Otros, hides on deselect.
- [ ] `src/lex/limites/EditLimitModal.spec.ts`:
  - Editar hidden on Expirado.
  - Pre-fills amount + end_date editable; others read-only.
  - end_date validation against start_date.
- [ ] Eliminar destructive flow: confirm body includes date range + amount + history warning.
- [ ] Coverage on `derive.ts` 100%; on the rest ≥ 90%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-limites --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-limites` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-limites`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-limites/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-limites/`.
- [ ] Final commit with conventional message: `specs: add lex-limites — Cliente per-entity operating limit assignment`.
