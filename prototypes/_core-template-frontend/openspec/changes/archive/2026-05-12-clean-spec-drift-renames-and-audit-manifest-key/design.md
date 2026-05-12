# Design — clean-spec-drift-renames-and-audit-manifest-key

## Context

Two isolated cleanup items surfaced during the polish review of the parent change `align-genericos-with-product-spec-and-add-inbox-manual-cta`. They share the theme "the spec, the type, and the engine should agree on the same shape" and are small enough to ship together without scope creep.

## Decisions

### Decision 1 — Use OpenSpec's `## RENAMED Requirements` block to rename the three stale headers

The OpenSpec CLI keys MODIFIED blocks by Requirement title. The parent change had to keep titles verbatim while replacing the body, leaving three titles stale. The `## RENAMED Requirements` mechanism is the supported way to update titles after the fact — the body / scenarios stay put; only the H3 header line changes.

Syntax (from the parser implementation):

```markdown
## RENAMED Requirements

- FROM: `### Requirement: Old title`
- TO: `### Requirement: New title`
```

Three pairs in this change. The headers and the body content of the three Requirements have been preserved across the chain of changes; only the H3 lines flip to the post-rework wording.

### Decision 2 — Add `manifest_key: ManifestKey` to `AuditEntryBase`, not to each subtype

The four discriminated variants (`AuditEntrySingle`, `AuditEntryBatch`, `AuditEntryComposite`, `AuditEntryCTA`) all extend `AuditEntryBase` via intersection types. Adding `manifest_key` to the base puts it on every variant uniformly — exactly the spec's intent (every audit entry SHALL carry the manifest_key). Adding to each subtype individually would be four edits with the same intent.

Alternative: add `manifest_key` only to the variants that currently use the cast workaround (single + batch + composite + cta — i.e. all four). Functionally equivalent but more verbose. Adopted: add to base.

### Decision 3 — `manifest_key` is mandatory (not optional)

The spec body uses "SHALL" — the field is mandatory in every entry. TS-side it gets the same treatment. Callers that omit it (the only one today is `<InboxCreateDialog>.submit()`) become type errors and get fixed in this change. The strictness is the point — drift is caught at compile time.

### Decision 4 — No spec delta for `core-actions-manifest`

The spec body already mandates `manifest_key` in all four audit shapes (Requirement: *"Audit log MUST emit one of four discriminated entry shapes via `useAuditLog().append()`"*). No new contract is being added — the change brings the TS type in line. PR review reads the spec as authoritative; the type catching up is implementation hygiene.

### Decision 5 — Cast workarounds removed in this change, not later

The `as unknown as AuditEntrySingle` casts in the three engine files exist solely because the TS type was incomplete. Now that the type carries `manifest_key`, the casts have no purpose and would be misleading if left in place ("why are we casting through `unknown`?"). Removing them is the natural finishing move.

## Out of scope

- Any other audit-entry shape extensions (e.g. `invocation_source: 'menu' | 'kanban_drag' | 'cta'` — the broader audit envelope expansion is a separate change against `core-actions-manifest`).
- RENAMED-style cleanup elsewhere (e.g. if another capability has the same drift; none observed today).
- Switching the audit log persistence from in-memory to a backend endpoint (called out in the spec as a future change).

## Validation

- `openspec validate clean-spec-drift-renames-and-audit-manifest-key --strict` exits 0.
- `npm run type-check` exits 0 — the new mandatory `manifest_key` field is satisfied by every existing caller (the engine fix + the InboxCreateDialog fix).
- `npm run lint` · `test:run` · `spec:check` · `build:qa` exit 0.
- After archive, the canonical `core-modulo-genericos/spec.md` contains the three renamed headers; the bodies are byte-identical to before; the Requirement count stays at 22.
- Manual smoke: open a Solicitud and execute any action via the Drawer (e.g. "Tomar"); inspect `useAuditLog().entries` — the new entry carries `manifest_key: 'framework.template.inbox'`. Open the main CTA wizard and submit a new Solicitud; the audit entry from that path also carries the field.
