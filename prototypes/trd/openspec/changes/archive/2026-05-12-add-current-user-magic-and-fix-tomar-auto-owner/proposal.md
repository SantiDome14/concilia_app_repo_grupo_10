- Jira REQ: — (bug fix surfaced after polish review)
- Module: core-template (foundation)

# Add `$current_user` magic to the manifest engine and fix the Inbox `tomar` / kanban transition to auto-assign owner

## Why

The `core-modulo-genericos` Requirement *"Solicitud assignee is distinct from owner; both are independently mutable in non-terminal states"* mandates that `owner` is **auto-assigned on transition to `en_proceso`** (via the "Tomar" action or the kanban drag from `pendiente` → `en_proceso`). A scenario in that Requirement spells it out:

> GIVEN a Solicitud with `assignee: 'u-2'` and `owner: null` in state `pendiente` · WHEN the user `'u-3'` clicks "Tomar" · THEN `owner: 'u-3'`, `state: 'en_proceso'`, `assignee` remains `'u-2'`; the Timeline records a `kind: 'taken'` event.

The implementation today violates that. Two paths both set `state` but leave `owner` unchanged:

1. The `inbox.tomar` manifest action declares `on_confirm.set_fields: { state: 'en_proceso', updated_at: '$now' }` — `owner` is missing. The manifest engine has no clean way to write the current user's id into the record because its `set_fields` substitution alphabet has only the `$now` magic string (per `core-actions-manifest` Requirement: *"on_confirm MUST execute update_fields, set_fields, recompute, audit, toast in canonical order"*).
2. The kanban free transition handler in `Inbox.vue` (`handleKanbanTransition`) writes `s.state = payload.toState` for `mode: 'free'` and emits a `kind: 'state_change'` Timeline event, but never sets `s.owner`. The `inbox.lifecycle` axis declares `{ from: 'pendiente', to: 'en_proceso', mode: 'free' }`, so this path bypasses the manifest engine entirely.

Both paths need the same fix: when transitioning to `en_proceso`, assign `owner` to the invoking user. The path-1 fix is a per-action declaration; the path-2 fix is page-local logic.

The cleanest engine extension is a second magic string `$current_user` (alongside the existing `$now`). Authors then write `on_confirm.set_fields: { state: 'en_proceso', owner: '$current_user', updated_at: '$now' }` and the engine substitutes the invoker's `user_id` at write time, exactly as `$now` is substituted today. The engine already receives `userId: string` as input to all three apply paths (`applyAction`, `applyComposite`, `applyCTA`) — substituting it is one line per path.

The engine extension is reusable beyond the Inbox (every action that wants to stamp "who did this" can write `'$current_user'` into a field). Adding the magic to the engine, plus the per-line edit on the `inbox.tomar` manifest, plus the page-local fix for the kanban free transition, closes the gap.

## What Changes

### Spec deltas (`core-actions-manifest`)

- **MODIFIED Requirement: on_confirm MUST execute update_fields, set_fields, recompute, audit, toast in canonical order.** Extend the body so the `set_fields` magic-string alphabet declares two values: `"$now"` (already documented, substituted with `Date.now()`) AND `"$current_user"` (NEW, substituted with the invoker's `user_id` per `applyAction.userId` / `applyComposite.userId` / `applyCTA.userId`). Add a new Scenario covering the new magic: *`$current_user` magic substitutes the invoker's user_id at write time*.

### Engine

- **`src/lib/manifest/applyAction.ts`** — at the two `set_fields` substitution sites (single and composite-per-record), extend the substitution rule from `raw === '$now' ? now : raw` to also handle `raw === '$current_user' ? userId : raw`.
- **`src/lib/manifest/applyComposite.ts`** — same change at the composite top-level `set_fields` substitution site.
- **`src/lib/manifest/applyCTA.ts`** — same change at the CTA `set_fields` substitution site.

### Engine tests

- **`src/lib/manifest/applyAction.spec.ts`** — add a case `substitutes "$current_user" in set_fields with the invoker's userId`. The existing `$now` test is the template.
- **`src/lib/manifest/applyComposite.spec.ts`** — analogous case for composite mode.
- **`src/lib/manifest/applyCTA.spec.ts`** — analogous case for CTA mode.

### Inbox wiring

- **`src/manifests/framework.template.inbox.actions.ts`** — `inbox.tomar` action's `on_confirm.set_fields` gains `owner: '$current_user'`. After this single-line edit the Drawer "Tomar" button auto-assigns the current user as owner on transition to `en_proceso`.
- **`src/pages/Inbox.vue`** — `handleKanbanTransition` for `mode: 'free'` to `en_proceso`: when `s.owner` is null, set `s.owner = CURRENT_USER.id` AND append a `kind: 'taken'` Timeline event (currently only `kind: 'state_change'`). The kanban path does not flow through the manifest engine so it gets fixed page-locally.

## Capabilities

### Affected Capabilities

- `core-actions-manifest` — one MODIFIED Requirement (on_confirm magic-string alphabet extended). No new Requirement.
- `core-modulo-genericos` — unchanged at spec level. The existing Requirement *"Solicitud assignee is distinct from owner"* already mandates the behavior; we're closing implementation drift.

### New Capabilities

None.
