# Design — add-current-user-magic-and-fix-tomar-auto-owner

## Context

The `core-modulo-genericos` Requirement *"Solicitud assignee is distinct from owner"* already spells out the desired behavior: when an operator clicks "Tomar" (or drags a Solicitud card from `pendiente` to `en_proceso` in the Tablero), the engine SHALL set `owner: <current_user_id>` AND transition the state. The implementation today only does the state half. Two distinct code paths need closing:

- The Drawer "Tomar" button invokes the `inbox.tomar` manifest action, which sets state via `on_confirm.set_fields` but cannot write the current user's id (the engine's set_fields alphabet has only the `$now` magic).
- The kanban free transition does not flow through the manifest engine at all — it's handled page-locally by `handleKanbanTransition` which only writes state.

The fix needs to address both paths without leaving the model partially-correct.

## Decisions

### Decision 1 — Extend the engine with a second magic string (`$current_user`), not a side-channel

Three alternatives were considered for the path-1 fix:

- **Engine extension `$current_user`.** Add a second canonical magic string to the `set_fields` substitution alphabet (alongside `$now`). The engine already receives `userId: string` as input on all three apply paths (`applyAction`, `applyComposite`, `applyCTA`) — substitution is one branch per path. Authors write `on_confirm.set_fields: { state: 'en_proceso', owner: '$current_user', updated_at: '$now' }`. **Adopted.**
- **Page-level afterMutation hook.** `useManifestModule().registerAfterMutation(callback)` exists but its callback is no-arg — it doesn't know which action ran or which record was mutated. To intercept `inbox.tomar` specifically, we'd need an action-specific event mechanism. That's a bigger engine change than just adding a magic string.
- **Hand-code the owner write in the page.** Skip the manifest action entirely; have the Drawer "Tomar" button call a page function that mutates the record directly. Throws away the entire manifest-engine value proposition (audit, dialog, capability gating); a clear anti-pattern.

The engine extension is reusable far beyond this fix: any manifest action that wants to stamp "who did this" into a record field uses the same magic. It mirrors `$now` exactly — same authoring shape, same engine surface, same audit log entries.

### Decision 2 — Page-local fix for the kanban free transition (no engine routing change)

The kanban free transition (`mode: 'free'`) intentionally bypasses the manifest engine — that's the entire point of `'free'` (no dialog, no engine apply, instant state write). Routing free transitions through the engine to get the `$current_user` substitution would change `core-data-tables` semantics and defeat the "free" optimization for the simple cases.

The fix is page-local: in `handleKanbanTransition` for `mode: 'free'` to `en_proceso`, when `s.owner` is null, set `s.owner = CURRENT_USER.id` AND append a `kind: 'taken'` Timeline event. This mirrors what the engine writes when the `inbox.tomar` action fires via the Drawer. Other apps that reuse the page pattern get the same fix as part of their Inbox.vue clone.

A spec Requirement *forcing* this fix in every consumer is overkill — the `core-modulo-genericos` Requirement on assignee/owner already mandates the outcome; how the consuming app wires it (engine `$current_user` or page-local) is implementation detail. PR review catches drift on the outcome, not the path.

### Decision 3 — Add `kind: 'taken'` Timeline event uniformly, not `'state_change'`

The current kanban free-transition handler appends a `kind: 'state_change'` event regardless of the from/to pair. The companion change `align-genericos-with-product-spec-and-add-inbox-manual-cta` extended the `TimelineEvent.kind` union with `'taken' | 'released' | 'assigned' | 'action_invoked'`. The `taken` kind is the semantically correct one for `pendiente → en_proceso` (the user is "taking" the Solicitud); a generic `state_change` is the fallback for transitions that don't fit one of the canonical kinds. The Drawer's `Timeline.vue` `dotClass` mapping already colors `taken` the same as `state_change` (`bg-brand`) so visual continuity is preserved.

### Decision 4 — No `core-modulo-genericos` spec change

The existing scenario *"Tomar assigns owner without affecting assignee"* already spells out the auto-assign behavior. Nothing new to add there — we're closing implementation drift. The only spec touch is `core-actions-manifest` to document the new `$current_user` magic; the inbox-side outcome is already specified.

## Out of scope

- Adding more magic strings (`$server_time`, `$request_id`, etc.). The two-string alphabet (`$now`, `$current_user`) covers the immediate need; growing the alphabet requires its own change with reuse evidence.
- Wiring the kanban free-transition path through the engine (intentionally separate per Decision 2).
- Engine support for typed magic-string contexts (e.g. `$user.email`). Magic strings stay literal substitutions.

## Validation

- `openspec validate add-current-user-magic-and-fix-tomar-auto-owner --strict` passes.
- `npm run type-check && npm run lint && npm run test:run && npm run spec:check && npm run build:qa` all exit 0.
- Engine tests (`applyAction.spec.ts`, `applyComposite.spec.ts`, `applyCTA.spec.ts`) verify the new magic substitutes the invoker's `userId`.
- Manual smoke: open the Inbox in dev, find a Solicitud in `pendiente` state (e.g. SOL-001, SOL-003, SOL-006, TAR-007, TAR-009), click "Tomar" in the Drawer — the record transitions to `en_proceso`, the Información grid's "Owner" cell shows the current user's name, and the Timeline shows a `kind: 'taken'` event by the current user. Then drag a different `pendiente` card on the Tablero to the In Progress column — same outcome (owner assigned + `kind: 'taken'` event).
