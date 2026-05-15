# Tasks — clean-spec-drift-renames-and-audit-manifest-key

## 1. Spec deltas

- [ ] `specs/core-modulo-genericos/spec.md` — RENAMED Requirements (3 pairs) via the `## RENAMED Requirements` block.

## 2. TS type

- [ ] `src/types/manifest.ts` — `AuditEntryBase` gains `manifest_key: ManifestKey` (mandatory). The four subtypes inherit via intersection.

## 3. Engine cleanup

- [ ] `src/lib/manifest/applyAction.ts` — remove `{ ...entry, manifest_key: manifestKey } as unknown as AuditEntryBatch` cast (line ~106); inline `manifest_key: manifestKey` into the literal.
- [ ] `src/lib/manifest/applyAction.ts` — remove same cast on the single-action path (line ~118).
- [ ] `src/lib/manifest/applyCTA.ts` — remove the `as unknown as AuditEntryCTA` cast (line ~90).
- [ ] `src/lib/manifest/applyComposite.ts` — remove the `as unknown as AuditEntryComposite` cast (line ~114).

## 4. Caller fix

- [ ] `src/components/inbox/InboxCreateDialog.vue` — import `INBOX_MANIFEST_KEY` (re-add); add `manifest_key: INBOX_MANIFEST_KEY` to the audit entry built in `submit()`.

## 5. Tests

- [ ] `src/components/inbox/InboxCreateDialog.spec.ts` — extend the audit-emit assertion to read `manifest_key: 'framework.template.inbox'` (or equivalent).

## 6. Validation gates

- [ ] `openspec validate clean-spec-drift-renames-and-audit-manifest-key --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 7. Archive + commit

- [ ] `openspec archive clean-spec-drift-renames-and-audit-manifest-key`
- [ ] Final commit: `refactor(specs+types): rename three stale Requirement headers in core-modulo-genericos and add mandatory manifest_key to AuditEntryBase`
