- Jira REQ: — (no ticket; template-level structural correction discovered while comparing Inbox/Alertas drawers against the legacy `prototypes/_core-template/_core-template.html`)
- Module: core-template (foundation)

# Reorganize the Drawer body so primary actions live inline at the top, not in the footer

## Why

The current `core-modals` baseline contracts the `<Drawer>` as a four-region surface — header, Timeline, Comments, **footer with available actions**. When the workflow-typed Inbox and Alertas drawers were rendered against this contract, the resulting UX diverged structurally from the prototype the design system was lifted from. In the prototype, the primary actions a user can take on a workflow record (e.g. "Atender", "Devolver a To Do", "Reasignar" for Solicitudes; "Asignarme", "Asignar a..." for Alertas) sit **inline at the top of the drawer body**, immediately under the header. The footer of the drawer hosts the comment composer, not the actions. The current Vue contract instead pushes those actions into the bottom footer, which (1) buries the primary CTAs below long Timeline + Comments sections so users have to scroll the drawer to act, and (2) collapses the drawer's vertical reading order into "metadata → log → take action," when the prototype's intent is "take action → understand context → log/discuss." The body is also not organized into named semantic sections (CONTEXTO, INFORMACIÓN, ASIGNACIÓN); the current spec only mandates the four region names. Without a contract update, every new app cloning the template will rebuild the wrong layout, because the wrong layout is what `core-modals` says.

## What Changes

- **`core-modals`** — modify the existing requirement `Workflow-typed records MUST open a Drawer side panel as the canonical detail surface` to reorganize the drawer body. The drawer SHALL now host its regions in the order: (1) header (unchanged); (2) **primary-actions** rendered inline at the top of the body, sourced from the same actions resolver as the row actions menu; (3) **summary information** organized into named semantic sections (e.g. INFORMACIÓN, CONTEXTO, DETALLES, ASIGNACIÓN); (4) Timeline; (5) Comments; (6) footer becomes optional and is reserved for legacy / non-workflow secondary actions only — workflow records SHALL NOT place primary actions in the footer.
- **`core-modals`** — modify the existing scenarios under that requirement to reflect the new region order (drawer-renders-header-Timeline-Comments-footer scenario is replaced by drawer-renders-header-primary-actions-summary-Timeline-Comments scenario; "Drawer footer actions resolve from the same source" scenario is replaced by "Drawer primary-actions resolve from the same source").
- **`core-modals`** — add a new scenario reinforcing that the comment composer (final element inside the Comments thread) is the bottom-most interactive element of the drawer body, not a footer button row.

## Capabilities

### Affected Capabilities

- `core-modals` — one existing requirement modified (Workflow-typed Drawer region order + actions placement); no new requirements added; no requirements removed.

### New Capabilities

None. This change corrects the contract of an existing capability so the Vue implementation can match the prototype it was migrated from.
