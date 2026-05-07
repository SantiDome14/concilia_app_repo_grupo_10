# Tasks — extend-core-modals-drawer-primary-actions

The Vue implementation already lands the new layout (`src/components/drawer/Drawer.vue`, `src/pages/Inbox.vue`, `src/pages/Alertas.vue`). This change is a contract correction so the spec catches up to the implementation. After archive, the drawer baseline reflects the prototype.

## 1. Spec deltas

- [ ] `specs/core-modals/spec.md` — MODIFIED Requirement: `Workflow-typed records MUST open a Drawer side panel as the canonical detail surface` — region order updated; primary-actions surface added; footer demoted to optional / non-workflow secondary
- [ ] `specs/core-modals/spec.md` — MODIFIED Scenario: `Drawer renders header, Timeline, Comments, and footer regions` → `Drawer renders header, primary-actions, summary information, Timeline, and Comments regions`
- [ ] `specs/core-modals/spec.md` — MODIFIED Scenario: `Drawer footer actions resolve from the same source as the row actions menu` → `Drawer primary-actions resolve from the same source as the row actions menu`
- [ ] `specs/core-modals/spec.md` — ADDED Scenario: `Comment composer is the bottom-most interactive element of the drawer body, not a footer row`

## 2. Validation gates

- [ ] Run `openspec validate extend-core-modals-drawer-primary-actions --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the modified requirement is applied
- [ ] Confirm `openspec/specs/core-modals/spec.md` requirement count is unchanged (modification, not addition or removal)
- [ ] Confirm the Vue implementation under `src/components/drawer/Drawer.vue` and the consuming pages (`Inbox.vue`, `Alertas.vue`) match the new spec — `npm run type-check` and `npm run test:run` still pass

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-modals-drawer-primary-actions`
- [ ] Confirm the CLI applies the modified requirement into the baseline (`openspec/specs/core-modals/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-modals-drawer-primary-actions/`
- [ ] Final commit with conventional message: `feat(specs): correct core-modals drawer to host primary actions inline at the top of the body`
