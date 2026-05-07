> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-roles — Lex-specific RBAC contract on top of core-auth

## Why

The legacy `core-lex-frontend` reads roles from `user.USER_ROLES` directly inside components (`hasRole`, `hasCommercialLexRole`, `hasAdminLexRole` helpers in `src/lib/utils.js`), and every page that gates UI by role re-implements the check inline (`clientes.vue`, `altas.vue`, `client-details.vue`, document tabs). That pattern produces three concrete problems the migration MUST not carry over: (1) gating logic drifts between pages — what counts as "restricted" for `COMMERCIAL_LEX` in Actividad is decided by the page that renders Actividad, not by a single source of truth; (2) reviewers cannot tell whether a new component respects the matrix without reading every helper call site; (3) when Auth0 refreshes the token, role flags do not update reactively because they are derived ad-hoc from a snapshot. The new project locks the role identifiers, the gating matrix, and the access composable into a contract that every Lex page MUST consume — and that downstream specs (`lex-clientes`, `lex-altas`, `lex-cliente-detalle`, etc.) reference instead of reinventing.

`lex-roles` is the foundational Lex capability: 8 of the 12 sibling Lex specs in the migration depend on it. Adding it first removes the decision overhead from every other change.

## What Changes

- Create the `lex-roles` capability. New spec at `openspec/specs/lex-roles/spec.md` (materialised when this change is archived) with 6 requirements covering: (a) roles sourced exclusively from the Auth0 `USER_ROLES` claim; (b) the canonical three-role identifier set (`VIEWER_LEX`, `COMMERCIAL_LEX`, `ADMIN_LEX`); (c) the single composable contract for role checks; (d) `VIEWER_LEX` denied all mutating actions; (e) `COMMERCIAL_LEX` denied Actividad and Documentos tabs in the client detail page; (f) reactive role state that survives Auth0 silent refresh and clears on logout.
- Define the typed surface. `src/types/lexRoles.ts` exports the `LexRole` union and the runtime constant array. `src/composables/useLexRole.ts` exposes the reactive flags (`isViewer`, `isCommercial`, `isAdmin`) plus the predicate helpers (`hasRole`, `requiresAdmin`).
- Lock the permission matrix in `## Context` of the spec. The matrix is the single source of truth across `lex-clientes`, `lex-altas`, `lex-cliente-detalle`, `lex-blacklist`, `lex-usuarios`, `lex-relaciones`, `lex-documentos`, and `lex-notificaciones`. Downstream specs MAY add concrete gating Scenarios but MUST cite the matrix when they do.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-auth` — `lex-roles` builds on the Auth0 wiring and the `useAuth()` composable already specified in `core-auth`. Reading `user.USER_ROLES` directly outside `useLexRole()` is forbidden.
  - `core-error-handling` — the 403 toast that surfaces when the backend rejects a `VIEWER_LEX` mutation reuses the global handler defined in `core-error-handling`; `lex-roles` does not redefine it.
  - `core-modulo-genericos` — the inbox / alertas Drawer detail surface in Lex respects the role matrix; the surface itself is owned by `core-modulo-genericos`.

## Capabilities

### Affected Capabilities

None modified by this change. `core-auth`, `core-error-handling`, and `core-modulo-genericos` are *referenced* in the new spec but their existing requirements are not edited.

### New Capabilities

- `lex-roles` (Lex foundation; cross-page contract) — 6 requirements, 13 scenarios.

### Non-capability artifacts

- `src/types/lexRoles.ts` — `LexRole` union + runtime constant array (named in spec).
- `src/composables/useLexRole.ts` — reactive composable returning role flags and predicate helpers (named in spec).
- ESLint rule (or PR-review rule) banning direct reads of `user.USER_ROLES` outside `useLexRole.ts` — named in `tasks.md` as an aspirational follow-up.

These are implementation locations referenced by the spec; the spec itself remains the source of truth.
