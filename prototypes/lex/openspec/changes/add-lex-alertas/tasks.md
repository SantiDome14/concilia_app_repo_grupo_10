# Tasks — add-lex-alertas

This change creates the `lex-alertas` capability — the Compliance Alertas module per REQ-52. It is a NEW capability with one delivered artifact: the spec at `openspec/specs/lex-alertas/spec.md` (materialised by `openspec archive`). Implementation tasks (sections 2–4) are aspirational checkboxes. Implementation MAY ship inside this same change folder, OR be split into a follow-up `implement-lex-alertas` change. Validation gates and archive (sections 5–6) are mandatory in either case.

## 1. Spec deltas (mandatory — this change blocks on these)

- [x] `specs/lex-alertas/spec.md` — ADDED Requirements: 10 requirements, 30 scenarios. Cover: top-level Sidebar entry with active-count badge, two-tab layout (Nuevas card-list / Histórico table), state machine canonical, atomic closure with mandatory comment, assignment flow with tab migration, detail view layout, Histórico filter set, role permissions matrix, immutable comments with 2000-char cap, type-extensible registry.
- [ ] Run `openspec validate add-lex-alertas --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline + the new capability validate together.

## 2. TypeScript types and registry (aspirational)

### 2.1 Types

- [ ] `src/lex/alertas/types.ts`:
  - `AlertType` union literal (`'SCREENING_BLACKLIST_MATCH' | ...`)
  - `AlertStatus` (`'new' | 'in_review' | 'resolved' | 'dismissed'`)
  - `Alert` (`id`, `type`, `status`, `client_id`, `payload`, `assignee_id?`, `state_transitions[]`, `comments[]`, `created_at`)
  - `AlertTimelineEvent` (`'comment' | 'assigned' | 'unassigned' | 'closing_comment' | 'state_transition'`)
  - `ScreeningBlacklistMatchPayload` (`counterparty_tax_number`, `motivo_blacklist`, `movement_id`, `monto`, `currency`, `sponsor`, `timestamp`)

### 2.2 Registry

- [ ] `src/lex/alertas/registry.ts`:
  - `AlertTypeRegistry` — `Record<AlertType, { label, icon, summaryRenderer, detailRenderer, columnExtras }>`
  - `registerAlertType(type, entry)` — public function (also used by tests)
  - v1 entry for `SCREENING_BLACKLIST_MATCH` with its `summaryRenderer` (card body) and `detailRenderer` (Información del match)
  - Generic fallback renderer for unknown types + `devWarn` per `core-error-handling`

### 2.3 API binding

- [ ] `src/lex/alertas/api.ts`:
  - `fetchAlerts(params)` calling `GET /alert?...`
  - `fetchActiveCount()` calling `GET /alert?status=new,in_review&count_only=true`
  - `fetchAlertById(id)` calling `GET /alert/:id`
  - `assignAlert(id, assignee_id|null)` calling `PATCH /alert/:id`
  - `closeAlert(id, status, closing_comment)` calling `PATCH /alert/:id` (atomic)
  - `addComment(id, body)` calling `POST /alert/:id/comment`

## 3. Pages and components (aspirational)

- [ ] `src/pages/Alertas.vue` — page composition with L1 segmenter (Nuevas / Histórico), L3 filters on Histórico, the card-list on Nuevas.
- [ ] `src/pages/AlertaDetalle.vue` — `/alertas/:id` detail view with the four sections (header + match + assignment + timeline).
- [ ] `src/lex/alertas/AlertCard.vue` — card-list item; uses `summaryRenderer` from the registry.
- [ ] `src/lex/alertas/HistoricoTable.vue` — uses `core-data-tables`. Columns: Fecha, Tipo, Cliente, Contraparte, Movimiento, Estado, Responsable.
- [ ] `src/lex/alertas/ClosureModal.vue` — closure modal with mandatory comment textarea; Confirm disabled until non-whitespace; submits status + closing_comment in one PATCH.
- [ ] `src/lex/alertas/AlertaTimeline.vue` — interleaved timeline with comment textarea at the top; optimistic prepend on submit; rollback + toast on failure.
- [ ] Sidebar: top-level `Alertas` entry with badge driven by `useAlertActiveCount()` (event-driven refresh, no polling).

## 4. Tests (aspirational)

- [ ] `src/pages/Alertas.spec.ts` — exercise every Scenario:
  - Sidebar badge shows active count; hides at zero; decrements after close.
  - Default tab is Nuevas; URL rewritten to `?tab=nuevas`.
  - Histórico table column order canonical.
  - Nuevas card shows the canonical CTAs.
  - State machine: Marcar como revisada hidden on `new`; closure requires comment; closed alerts cannot reopen.
  - Closure submits status + comment in one request.
  - COMMERCIAL_LEX cannot see closure CTAs.
  - Asignarme transitions `new → in_review` with timeline entry.
  - Migration between tabs follows status.
  - Desasignar reverts `in_review → new`.
- [ ] `src/pages/AlertaDetalle.spec.ts`:
  - Header status badge with canonical token.
  - Información del match links out to client and movement.
  - Timeline orders most-recent-first.
- [ ] `src/lex/alertas/HistoricoFilters.spec.ts`:
  - Default Estado is `in_review` only.
  - Estado does not expose `new`.
  - CUIT contraparte input debounced 300 ms.
- [ ] `src/lex/alertas/permissions.spec.ts`:
  - COMMERCIAL_LEX sees comment input but no assignment affordances.
  - VIEWER_LEX read-only.
  - Server filtering hides other clients' alerts from COMMERCIAL_LEX (mocked).
- [ ] `src/lex/alertas/registry.spec.ts`:
  - New type adds card renderer without page changes.
  - Tipo filter lists every registered type.
  - Unregistered type falls back to generic renderer + `devWarn` once per session.
- [ ] `src/lex/alertas/comments.spec.ts`:
  - 2000-char cap with counter.
  - Optimistic prepend; rollback on failure.
  - No edit affordance on existing comments.
- [ ] Coverage on `registry.ts` ≥ 95%; on `api.ts` ≥ 90%; on the page + detail ≥ 85%.

## 5. Validation gates (mandatory)

- [ ] `openspec validate add-lex-alertas --strict` passes.
- [ ] `openspec validate --all --strict` passes.
- [ ] If implementation tasks (2–4) are completed in this change: `npm run lint`, `npm run type-check`, `npm run test:run`, `npm run build:qa` all pass.
- [ ] If implementation is deferred: confirm a follow-up change `implement-lex-alertas` is opened with sections 2–4 as its scope.

## 6. Archive

- [ ] After all mandatory gates pass, run `openspec archive add-lex-alertas`.
- [ ] Confirm the CLI applies the ADDED Requirements into a new baseline `openspec/specs/lex-alertas/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-lex-alertas/`.
- [ ] Final commit with conventional message: `specs: add lex-alertas — Compliance alerts module`.
