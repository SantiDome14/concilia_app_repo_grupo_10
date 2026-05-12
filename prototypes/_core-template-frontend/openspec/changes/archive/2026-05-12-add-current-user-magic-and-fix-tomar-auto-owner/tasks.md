# Tasks — add-current-user-magic-and-fix-tomar-auto-owner

## 1. Spec delta

- [ ] `specs/core-actions-manifest/spec.md` — MODIFIED Requirement `on_confirm MUST execute update_fields, set_fields, recompute, audit, toast in canonical order`. Extend the body to document the second magic-string value `$current_user` (substituted with the invoker's `user_id`). Add a Scenario covering it.

## 2. Engine

- [ ] `src/lib/manifest/applyAction.ts` — line ~65 (single set_fields): substitute `$current_user` → `userId` alongside the existing `$now` → `now`. Same at line ~150 (composite per-record path).
- [ ] `src/lib/manifest/applyComposite.ts` — line ~73: same substitution.
- [ ] `src/lib/manifest/applyCTA.ts` — line ~63: same substitution.

## 3. Engine tests

- [ ] `src/lib/manifest/applyAction.spec.ts` — new case `substitutes "$current_user" in set_fields with the invoker's userId`.
- [ ] `src/lib/manifest/applyComposite.spec.ts` — analogous.
- [ ] `src/lib/manifest/applyCTA.spec.ts` — analogous.

## 4. Inbox wiring

- [ ] `src/manifests/framework.template.inbox.actions.ts` — `inbox.tomar.on_confirm.set_fields` gains `owner: '$current_user'`.
- [ ] `src/pages/Inbox.vue` — `handleKanbanTransition`: when `mode === 'free'` AND `payload.toState === 'en_proceso'` AND `s.owner === null`, set `s.owner = CURRENT_USER.id` AND append a `TimelineEvent { kind: 'taken', label: 'Tomada — en proceso', actor_id: CURRENT_USER.id, actor_name: CURRENT_USER.name }` to `s.timeline`. The existing `state_change` event is dropped on this specific transition (replaced by `taken`); for other free transitions the `state_change` event is kept.

## 5. Validation gates

- [ ] `openspec validate add-current-user-magic-and-fix-tomar-auto-owner --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 after archive
- [ ] `npm run lint` · `type-check` · `test:run` · `spec:check` · `build:qa` exit 0

## 6. Archive + commit

- [ ] `openspec archive add-current-user-magic-and-fix-tomar-auto-owner`
- [ ] Final commit: `fix(inbox): auto-assign owner on transition to en_proceso via $current_user magic + page-local kanban fix`
