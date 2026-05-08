# Design — add-ops-instructions

## Context

This design captures the rationale behind unifying the legacy three-route
`/settings/instructions/*` split into a single `Type-A` page (`/instructions`)
with three modal flows (Create / Edit / Detail), and the trade-offs of the
client-orchestrated two-phase save. The capability is the **first OPS domain
change** to land after the template was extended with the 13 new capabilities;
its scope is intentionally small enough to validate the end-to-end migration
flow (proposal → spec → implementation → archive) before tackling heavier
modules (`ops-financial-dashboard`, `ops-psp-home`, `ops-clients`).

---

## Decision 1 — Unify three routes into one page + three modals

### The question

The legacy ships `/settings/instructions`, `/settings/instructions/:id`, and
`/settings/instructions/:id/view` as separate pages, mirroring how the original
backoffice was structured around forms-as-pages. The migration could:

- **(A)** Keep the three routes, refactoring each onto template primitives (`<Input>`, `<Select>`, etc.) without changing the navigation model.
- **(B)** Unify into one page with three modals, per the `core-modals` paradigm of the new template.

### The decision

**Option B.** One page, three modals.

### Why

- **Paradigm consistency.** Every other Type-A module in the financial-core uses the master-list-with-modals shape — keeping Instructions on the legacy three-route model would make it the odd one out.
- **Less surface to maintain.** Three pages duplicate the loading state, the layout, the filter bar; one page renders them once.
- **Better UX for the master/detail loop.** Users browsing the list, opening details, then jumping back to the list don't lose their filter state — the URL `?detail=<id>` opens the modal over the list, and closing returns the URL to the bare `/instructions` with filters intact.
- **Follows LEX migration precedent.** `lex-clientes` unified `/altas` + `/clientes`. Same intuition applied here.

### Alternatives considered

- **Option A (refactor only).** Rejected for the reasons above. Refactoring without consolidating leaves three pages each only slightly diverging.
- **Hybrid: list page + Detail modal, but Edit as a full route.** Considered. Rejected because the edit form is short (4 fields) and fits comfortably in a modal — the full-route Edit was a legacy artifact, not a UX requirement.

### Failure modes the rule prevents

- A developer ports `InstructionForm.vue` 1:1 as a route at `/instructions/:id` → spec violation; the canonical Edit surface is the modal. The legacy URL is absorbed via redirect.
- A developer treats `/instructions/:id/view` as a separate detail surface → spec violation; the Detail modal is the only read-only surface, and the legacy URL redirects to `/instructions?detail=<id>`.

---

## Decision 2 — `key-value-array` field type for the `Atributos` editor

### The question

The `attributes[]` array on an instruction is a list of `{ key, value, index_order }` rows that the user adds/removes/reorders. The legacy `InstructionForm.vue` rolls its own dynamic-rows logic. The new template ships the `key-value-array` field type backed by `<DynamicKeyValueFields>`. The question is whether to use the new primitive or to roll a domain-specific component.

### The decision

**Use the canonical `key-value-array` field type from `core-forms`.**

### Why

- **The template just landed this primitive specifically for the OPS use case.** The migration backlog (`add-dynamic-key-value-fields-component`) listed OPS InstructionForm as the canonical motivation. Using anything else here would mean the template's own validation case is "skipped".
- **Saves ~150 LOC.** The legacy form rolls its own row management; the primitive handles add/remove/re-index with `duplicate-key-policy: 'reject'` out-of-the-box.
- **Consistent visual.** Future OPS / TRD / FIN modules with similar editors (e.g. metadata on a quote) get the same look without re-rolling.

### Alternatives considered

- **Roll a domain-specific `InstructionAttributesEditor`** with a richer UX (e.g. autocomplete on key from previously-used keys, drag-and-drop reorder). Rejected for v1; if OPS needs autocomplete-on-key, it lands as a follow-up extension on the primitive (benefiting every consumer), not as a one-off component.
- **Use `useDynamicForm` (runtime schema).** Considered briefly. Rejected because the schema for an instruction is known at build time — instructions always have name + currency + description + attributes; the backend doesn't declare the form fields dynamically. `useDynamicForm` is for cases where the field set comes from an API response (e.g. TRD alert templates).

### Failure modes the rule prevents

- A developer pads InstructionForm.vue 1:1 from the legacy → forfeits the primitive's testing + accessibility. Spec rejects.
- A developer uses `useDynamicForm` because "it could be runtime later" → over-engineers. Spec mandates build-time schema for this case.

---

## Decision 3 — Client-orchestrated two-phase save with persistent retry banner

### The question

The legacy backend exposes the save as two endpoints:

- `POST /instruction` — creates the instruction record (name, currency_id, description).
- `POST /instruction-attribute/save-all` — saves the attribute array as a separate batch keyed by `instruction_id`.

The migration could:

- **(A)** Negotiate a backend change that accepts both as one transactional call.
- **(B)** Orchestrate the two calls client-side, treating the form as one logical save.

### The decision

**Option B (client orchestration).** The form fires phase A first; on success, fires phase B; on failure of phase B, surfaces a persistent banner that re-fires only phase B with the captured `instruction_id`.

### Why

- **Backend negotiation is out of scope for this migration.** The backend team has its own roadmap; coordinating a transactional API change adds latency the OPS migration can't absorb in this pilot.
- **The client-side orchestration is short.** `apiClient.post('/instruction', ...)` followed by `apiClient.post('/instruction-attribute/save-all', { instruction_id, attributes })` — ~20 LOC + the retry-banner state machine. Worth less than waiting on the backend.
- **The failure mode is bounded.** The only weird state is "instruction created, attributes failed" — recoverable via the retry banner. The reverse ("attributes created without instruction") is impossible because phase B requires the instruction id from phase A.

### Trade-off

If the user reloads the page while the retry banner is showing, the in-memory `instruction_id` is lost and the instruction stays in the database with no attributes. The banner copy SHOULD warn the user not to navigate away; longer term, the backend transactional endpoint resolves this entirely.

### Alternatives considered

- **Option A (negotiate transactional API).** Deferred to follow-up; if/when the backend lands `POST /instruction` accepting an embedded `attributes` array, the spec extends with a `MODIFIED Requirement` collapsing the two phases into one.
- **Optimistic phase B in parallel with phase A.** Rejected — phase B requires the `instruction_id` returned by phase A; can't parallelise.
- **Phase A only (drop attributes in v1).** Rejected — attributes are central to the entity; an instruction without attributes is incomplete in the OPS domain.

### Failure modes the rule prevents

- A developer fires phase A and B in parallel ignoring the dependency → 100 % failure rate. Spec mandates sequential.
- A developer fires phase B without phase A's id captured in component state → no retry possible. Spec mandates capture.
- A developer auto-retries phase B silently on failure → the user thinks the save succeeded when it hasn't. Spec mandates the persistent banner so the user is in the loop.

---

## Decision 4 — Role gating declared inline in the manifest, not via `ops-roles`

### The question

The `core-actions-menu` and `core-actions-manifest` capabilities support
capability gating per row action. The role matrix for OPS (`OPS_ADMIN`,
`OPS_OFFICER`, `OPS_VIEWER`, etc.) is not yet consolidated as a separate
`ops-roles` capability. Should this change wait for `ops-roles` or declare
its role gating inline?

### The decision

**Declare role gating inline in the manifest for v1.** When `ops-roles`
lands, replace the inline `["OPS_ADMIN"]` arrays with the canonical
capability strings (`instructions:create`, `instructions:edit`,
`instructions:delete`).

### Why

- **`ops-roles` is its own coordination problem.** It needs to consolidate roles across every OPS module; if this pilot waits, the migration stalls.
- **The replacement is mechanical.** When `ops-roles` lands, a follow-up `extend-ops-instructions-roles-integration` change replaces the inline arrays with capability strings — no test break, no UX change.
- **Roles map cleanly to current Auth0 metadata.** Until `ops-roles` lands, the inline declarations match what the legacy already enforces.

### Failure modes the rule prevents

- The migration deadlocks on `ops-roles` not yet existing → eliminated by inline declaration.
- Roles drift from `ops-roles` once it lands → caught by the follow-up integration change.

---

## Decision 5 — Pagination via `@tanstack/vue-query` server-side, not client-side

### The question

The legacy `InstructionsList` rolls its own pagination math (`limit`, `offset`,
`totalCount`, `hasNext`, `visiblePages`). The template has two contracted
pagination flavours (`useTable` for client-side, `@tanstack/vue-query` for
server-side per `core-data-tables`). The question is which to use.

### The decision

**Server-side via `@tanstack/vue-query`.**

### Why

- **The dataset can grow.** Instructions are not naturally bounded — the backend will accumulate hundreds over time. Client-side pagination would force loading the entire set on each page mount.
- **Filters are server-side already.** The backend accepts `?name` and `?currency_id` query params. Pairing client-side pagination with server-side filtering is awkward (the page numbers change as filters change).
- **`@tanstack/vue-query` already drives the cache invalidation on Eliminar.** Using the same library across query + mutation is consistent.

### Alternatives considered

- **Client-side via `useTable`.** Rejected for the dataset-growth reason.
- **Hand-rolled pagination as in legacy.** Rejected — that's the anti-pattern the migration eliminates.

---

## Cross-capability composition

| Capability | What it owns | What `ops-instructions` owns |
|---|---|---|
| `core-layout` | AppShell, page header, L1/L2/L3 layout | Page header with title + Crear CTA |
| `core-module-types` | Type-A / Type-B / Type-C definitions | Type-A composition (master list) |
| `core-data-tables` | Table primitive, debounced filters, server-side pagination | Column set, filter wiring, row-click semantics |
| `core-modals` | Create / Edit / Detail / Confirmation flows | Per-row actions trigger Edit/Detail/Eliminar modals |
| `core-actions-menu` | Per-row Actions popover with stop-propagation | The cell housing the popover |
| `core-actions-manifest` | Manifest engine, dialog field types | `ops.instructions` manifest declaration |
| `core-forms` | Field types (`text`, `textarea`, `select`, `lookup`, `key-value-array`), vee-validate + zod | Field declarations + schema |
| `core-api-layer` | `apiClient` axios + `ApiError` | Endpoint wrappers + retry behavior |
| `core-error-handling` | Skeleton, EmptyState, alert banners, toasts | Surface rendering for the page's loading / empty / error states |
| `core-navigation` | Route registration | Route + sidebar entry under `Configuración` block + legacy redirects |

---

## Open questions

1. **Backend transactional API for `POST /instruction` with embedded attributes.** Out of scope for this pilot; ideally lands later via a `MODIFIED Requirement` here.
2. **Autocomplete-on-key for the attributes editor.** If a single user tends to use the same set of keys repeatedly, a future extension on `core-forms` `key-value-array` could expose suggestions. Out of v1.
3. **Bulk delete of multiple instructions.** Deferred until `core-data-tables` contracts the bulk-action bar (template's roadmap).
4. **Audit log surfacing for Eliminar.** When a manager wants to know "who deleted this instruction and when", the row's audit trail is needed. Currently the legacy doesn't surface this; we'd add it as a follow-up that uses the canonical `<Drawer>` from `core-modals`.
5. **Instructions created from `/clients/:id/instructions/create` (legacy)** — this is a different surface that creates an instruction in the context of a specific client. It's owned by the future `ops-clients` capability, not this one. Both will share the underlying API but the surface is different (modal inside ClientDetail vs standalone CRUD).
