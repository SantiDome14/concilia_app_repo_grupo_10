> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-usuarios — Lex operators listing page

## Why

The `/usuarios` page in the legacy `core-lex-frontend` lists Lex *operators* (the humans authorised to use the app) — not Lex *clients*. The distinction is easy to miss given the route name: `usuarios.vue` shows email, name, and role badge for the team members signed into Lex, while client population lives at `/clientes`. The legacy implementation reads-only with two filters (name, role) and three role badge colours, but it duplicates pagination logic from `clientes.vue` and exposes a pagination quirk: the backend uses 1-indexed pages and uppercase sort field names (`NAME` not `name`), so `getUsers()` patches the request transformer ad-hoc. Additionally, the role label string is paraphrased per page (`ADMIN_LEX → "Admin Lex"` in some places, `"Administrador"` in others).

The new project locks this into a single capability: canonical column set, debounced name search, page-index translation isolated in the API layer, single `formatRole()` helper, and read-only access for all three Lex roles. This is the simplest of the Lex page specs and a good baseline for the more complex sibling specs to reference.

## What Changes

- Create the `lex-usuarios` capability. New spec at `openspec/specs/lex-usuarios/spec.md` (materialised via archive) with 5 requirements covering: (a) canonical column set Email + Nombre + Rol with no Acciones column; (b) name search debounced 300 ms with role filter applied immediately, both reflected in the URL; (c) pagination translation between frontend 0-index and backend 1-index isolated in `src/lex/users/api.ts`; (d) `formatRole()` as the single label transformer; (e) page reachable for all three Lex roles.
- Define the typed surface. `src/lex/users/api.ts` (translator), `src/lex/users/format.ts` (`formatRole`, role badge map), `src/lex/users/roleBadge.ts` (colour-token registry), and the page at `src/pages/Usuarios.vue` per the L1/L2/L3 pattern.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-data-tables` — the table follows the canonical record-list pattern: monospace leftmost ID column, no Acciones column when no per-row actions exist, page-size selector with the canonical sizes.
  - `core-forms` — the role Select is the shadcn-vue Select, not native `<select>`.
  - `core-api-layer` — pagination translation lives in the dedicated endpoints file; pages MUST NOT compose `?page=N` URLs directly.
  - `core-layout` — the page follows L1/L2 (when there are KPIs) /L3.
  - `lex-roles` — visibility-only gating; this page is reachable by every authenticated Lex role.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-usuarios` (Lex page; read-only operators listing) — 5 requirements, 15 scenarios.

### Non-capability artifacts

- `src/pages/Usuarios.vue` — page implementation.
- `src/lex/users/api.ts` — endpoint binding with page-index + sort translation.
- `src/lex/users/format.ts` — `formatRole()` and unit tests.
- `src/lex/users/roleBadge.ts` — role-to-colour-token registry.
