## ADDED Requirements

### Requirement: Inbox manifest MUST surface concept-filtered actions as Drawer / row CTAs alongside the generic state actions

The Inbox's manifest (`framework.template.inbox` in the template; per-app manifests for cloned apps) SHALL declare actions that go beyond the four canonical state-machine actions (`inbox.asignar_assignee`, `inbox.tomar`, `inbox.cerrar_solicitud`, `inbox.rechazar`). These extra actions are how Solicitudes/Tareas **invoke other functionality** — navigating to another module, opening a pre-filled form, escalating to a different area, calling an external API, etc. Per the `core-modulo-genericos` Requirement on `InboxTypeConfig`, the registry's `available_actions[]` entries are the declarative pointer; the actions themselves live in the manifest and are filtered to the matching concept via `show_when: { record_concept_in: [...] }`.

The manifest engine's existing surface — `<ManifestActionsMenu>` for row actions and the page's primary-actions slot for the Drawer — automatically renders these actions on Solicitudes whose `concept` matches a declared `record_concept_in` list. No additional rendering path is required. The action's `dialog` describes what will happen (info banner) and the user confirms; `on_confirm.toast` provides the user-facing success signal. Real apps replace the toast with the actual side-effect (router navigation, opening a different module's create form, calling an API endpoint, …) by wiring `on_confirm` or by registering an `afterMutation` hook.

The template SHALL ship at least three example actions to demonstrate the pattern across both `kind: 'solicitud'` and `kind: 'tarea'` types: a navigation-style action ("Ver cliente"), a form-open style action ("Generar factura"), and an escalation-style action ("Escalar a compliance"). These examples render as Drawer CTAs only on the matching concept; opening the Drawer of a different concept SHALL show only the state-machine actions plus any matching examples.

#### Scenario: Concept-filtered action appears in the Drawer only for the matching concept

- **GIVEN** an inbox manifest with `inbox.ver_cliente` declared with `show_when: { record_concept_in: ['aprobacion_pago'] }` AND two Solicitudes — one with `concept: 'aprobacion_pago'`, one with `concept: 'baja_usuario'`
- **WHEN** the user opens the Drawer on the `aprobacion_pago` Solicitud
- **THEN** the Drawer header surfaces a primary-action button labeled `"Ver cliente"` alongside the state actions (Tomar / Cerrar / Rechazar)
- **AND** when the user opens the Drawer on the `baja_usuario` Tarea, the `"Ver cliente"` button is absent (the `show_when` predicate hides it)

#### Scenario: Concept-filtered action surfaces a toast on confirm (template demo)

- **GIVEN** the user clicks `"Ver cliente"` in the Drawer of an `aprobacion_pago` Solicitud
- **WHEN** the dialog renders with its info banner ("Esto abriría /clientes/<id>") and the user clicks confirm
- **THEN** a `vue-sonner` toast appears with the action's `on_confirm.toast` message (e.g. `"Navegación a cliente …"`); the audit log appends a `kind: 'single'` entry referencing `action_id: 'inbox.ver_cliente'`; no actual navigation happens in the template (real apps replace the toast with a router push or external call)

#### Scenario: Concept-filtered actions ALSO appear in the per-row menu, not only in the Drawer

- **GIVEN** an `aprobacion_pago` Solicitud rendered in the list view; the `<ManifestActionsMenu>` portal mounted in the row's actions cell
- **WHEN** the user clicks the `⋯` menu on that row
- **THEN** the menu includes the same concept-filtered actions (Ver cliente, Generar factura) alongside the state actions; selecting one fires the same dialog + `on_confirm.toast` path as from the Drawer

#### Scenario: Removing the show_when predicate is a contract violation

- **GIVEN** a PR proposes removing the `show_when: { record_concept_in: [...] }` predicate from a concept-filtered action, making it visible on every Solicitud regardless of concept
- **WHEN** PR review checks the change against this Requirement
- **THEN** the change is REJECTED unless the action is genuinely generic (e.g. the state actions Tomar / Cerrar / Rechazar) — concept-filtered actions exist precisely because they invoke business functionality that only makes sense for the matching concept; un-filtering them dilutes the Drawer surface
