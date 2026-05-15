## MODIFIED Requirements

### Requirement: on_confirm MUST execute update_fields, set_fields, recompute, audit, toast in canonical order

The `on_confirm` block SHALL declare any subset of: `update_fields: string[]` (dot-paths to write from `formValues`), `set_fields: Record<string, unknown>` (literal writes; the canonical magic-string alphabet is two values — `"$now"` MUST be replaced by `Date.now()` at write time AND `"$current_user"` MUST be replaced by the invoker's `user_id` at write time, sourced from the `userId: string` input on `applyAction` / `applyComposite` / `applyCTA`), `recompute: string[]` (tokens resolved through the recompute registry; v1 supports only `"imputacion"`, unknown tokens emit `devWarn` and are skipped), `audit: boolean` (default `true`; when `false` no audit entry is appended), `toast: string` (toast title; subtitle is generated per mode). The execution order on confirm MUST be: validate required fields → write `update_fields` (only declared fields persist; non-declared form values are discarded) → write `set_fields` → run recompute → emit audit (if `audit !== false`) → fire toast → run `afterMutation` hook → close dialog. The toast subtitle SHALL be: single → `"<record.id> — <record.nombre || record.label || ''>"`; batch → `"<N> registros actualizados"` (or `"<N> de <M>"` on partial success per Decision 12); composite → `"<record.id> → <stateLabel>"`; cta with `creates_record_type` → the new record's id.

#### Scenario: update_fields writes only declared fields

- **GIVEN** an action with `dialog.fields: [{id: "cliente_id"}, {id: "imputation_note"}]` and `on_confirm.update_fields: ["cliente_id"]`; user fills both fields
- **WHEN** the confirm runs
- **THEN** the record's `cliente_id` is updated from `formValues.cliente_id`; `imputation_note` is DISCARDED (not declared in `update_fields`)

#### Scenario: $now magic substitutes Date.now() at write time

- **GIVEN** `on_confirm.set_fields: { "fin.intercompany": true, "fin.intercompany_at": "$now" }`
- **WHEN** the confirm runs at time T
- **THEN** `record.fin.intercompany === true` AND `record.fin.intercompany_at === T` (a numeric timestamp), not the string `"$now"`

#### Scenario: $current_user magic substitutes the invoker's user_id at write time

- **GIVEN** `on_confirm.set_fields: { "state": "en_proceso", "owner": "$current_user", "updated_at": "$now" }` AND the apply path is invoked with `userId: 'u-3'`
- **WHEN** the confirm runs at time T
- **THEN** `record.state === 'en_proceso'` AND `record.owner === 'u-3'` (not the string `"$current_user"`) AND `record.updated_at === T` — both magic strings substitute independently and atomically in the same `set_fields` block

#### Scenario: audit:false suppresses the audit emit

- **GIVEN** an action with `on_confirm.audit: false`
- **WHEN** the confirm runs and succeeds
- **THEN** all other steps execute (write fields, recompute, toast) but `useAuditLog().append()` is NOT called for this confirm; the audit log length is unchanged

#### Scenario: Unknown recompute token emits devWarn

- **GIVEN** `on_confirm.recompute: ["imputacion", "conciliacion"]`; only `imputacion` is registered
- **WHEN** the confirm runs in dev mode
- **THEN** `imputacion` runs successfully; `conciliacion` is skipped; `devWarn('MANIFEST', 'unknown recompute token: conciliacion')` is emitted; in strict mode the apply path throws
