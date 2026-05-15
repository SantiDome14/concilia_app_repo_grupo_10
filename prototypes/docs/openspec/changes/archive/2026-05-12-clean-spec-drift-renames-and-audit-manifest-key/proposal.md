- Jira REQ: — (cleanup follow-up to `align-genericos-with-product-spec-and-add-inbox-manual-cta` archived earlier on 2026-05-12)
- Module: core-template (foundation)

# Rename three stale Requirement headers in `core-modulo-genericos` and bring the `AuditEntryBase` TS type in line with the `core-actions-manifest` audit shape

## Why

Two pieces of pre-existing drift between the canonical spec and the implementation, both surfaced during the polish review:

1. **Stale Requirement headers in `core-modulo-genericos`.** The parent change `align-genericos-with-product-spec-and-add-inbox-manual-cta` had to preserve three Requirement headers verbatim because the OpenSpec CLI uses the header as the lookup key for MODIFIED blocks (the body / Scenarios were rewritten in the same change, but the title couldn't be edited in-place). The result is that the canonical baseline today carries Requirement titles that no longer match their own bodies:

   - Title: *"Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`"* — body describes `Solicitud<TPayload>` with the canonical generic.
   - Title: *"Alertas houses system-detected events with profile A/B/C/D semantics"* — body describes `category: 'triage' | 'workflow' | 'metric' | 'cross_app_panel'` (the 2026-05-10 rename).
   - Title: *"Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`"* — body describes the Inbox-Tarea-with-auto_archive routing (the 2026-05-11 decision).

   PR review reads the headers first; the mismatch confuses any reviewer touching these capabilities. The OpenSpec `## RENAMED Requirements` mechanism is the supported way to update headers without re-replacing bodies.

2. **`AuditEntryBase` TS type does not include `manifest_key`.** The `core-actions-manifest` Requirement *"Audit log MUST emit one of four discriminated entry shapes via `useAuditLog().append()`"* spells out, in its body, that every entry shape carries `manifest_key`. The TS type in `src/types/manifest.ts` declares `AuditEntryBase` with `timestamp`, `user_id`, `action_id`, `changes` — no `manifest_key`. The engine compensates by writing the field via `{ ...entry, manifest_key: manifestKey } as unknown as AuditEntrySingle` (ugly cast, three sites) and the `<InboxCreateDialog>` callsite omits `manifest_key` entirely (incorrect against the spec). Adding the field to `AuditEntryBase` is one line; it eliminates the casts and forces every caller to provide the value.

Both pieces are isolated, low-risk, and ride together because they're both "tidy up the inconsistencies between spec, types, and the engine".

## What Changes

### Spec deltas (`core-modulo-genericos`)

- **RENAMED Requirements** — three header updates (bodies + scenarios remain unchanged):
  - FROM `Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud` → TO `Inbox houses Solicitudes; the canonical TS identifier MUST be Solicitud<TPayload>`
  - FROM `Alertas houses system-detected events with profile A/B/C/D semantics` → TO `Alertas houses system-detected events with category triage/workflow/metric/cross_app_panel semantics`
  - FROM `Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as profile: 'A'` → TO `Reports MAY emit REPORT_DEPENDENCY events; destination Inbox MUST consume them as Tarea report_dependency_block with declarative auto_archive`

### TS type (`src/types/manifest.ts`)

- `AuditEntryBase` gains a mandatory `manifest_key: ManifestKey` field. All four discriminated variants (`AuditEntrySingle`, `AuditEntryBatch`, `AuditEntryComposite`, `AuditEntryCTA`) inherit it automatically.

### Engine cleanup (3 callsites)

- `src/lib/manifest/applyAction.ts` — remove `{ ...entry, manifest_key: manifestKey } as unknown as AuditEntryBatch` / `as AuditEntrySingle` casts at the two audit-emit sites. Move `manifest_key: manifestKey` into the entry literal.
- `src/lib/manifest/applyCTA.ts` — same cleanup at the one audit-emit site.
- `src/lib/manifest/applyComposite.ts` — same cleanup at the one audit-emit site.

### Caller fix (`src/components/inbox/InboxCreateDialog.vue`)

- The audit entry built by `<InboxCreateDialog>.submit()` gains `manifest_key: INBOX_MANIFEST_KEY`. The import of `INBOX_MANIFEST_KEY` (removed earlier as a workaround) returns.

### Tests

- `applyAction.spec.ts` — the audit-emit case already asserts the entry shape including `manifest_key` (per existing scenario quoted in spec body). Verify the assertion no longer needs a cast workaround. No new tests in this change.
- `InboxCreateDialog.spec.ts` — the audit-emit assertion now expects `manifest_key: 'framework.template.inbox'` in the entry; update the case.

## Capabilities

### Affected Capabilities

- `core-modulo-genericos` — three RENAMED Requirements. Bodies and Scenarios unchanged; only the titles are updated. Capability count is unchanged (22 → 22).
- `core-actions-manifest` — no spec delta. The spec body already mandates `manifest_key` in every audit entry; this change brings the TS type in line and removes the cast workaround.

### New Capabilities

None.
