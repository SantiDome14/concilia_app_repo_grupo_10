> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-blacklist — Lex CUIT blacklist registry page

## Why

The legacy `core-lex-frontend` exposes Blacklist as a **sub-route** at `/usuarios/blacklist`, reachable only by direct URL — there is no Sidebar entry. The page itself is a basic CRUD: list CUITs, add one at a time, bulk import via CSV, delete with confirmation. Two structural problems block reuse: (1) Blacklist is not navigationally a sub-section of Usuarios; nesting it there is a hold-over from the original prototype where every settings-like page lived under Usuarios. (2) The bulk import flow validates rows server-side only, so users discover format errors after the upload completes — not while still looking at the file. Per `discoveries/lex-discovery.md` §8.2 (REQ-47), the new project elevates Blacklist to a top-level Sidebar entry at `/blacklist` and previews per-row validation before submission.

The new spec also locks the destructive-delete pattern to `core-modals`, the bulk-import flow to a normative request shape (`POST /blacklist/bulk { entries }` returning `{ created, skipped, errors }`), and the immutability of CUIT post-create.

## What Changes

- Create the `lex-blacklist` capability. New spec at `openspec/specs/lex-blacklist/spec.md` (materialised via archive) with 5 requirements covering: (a) Sidebar elevation to top level + redirect from the legacy `/usuarios/blacklist`; (b) canonical column set (CUIT, Motivo, Fecha de carga, Cargado por, Acciones) and L3 filter bar (CUIT debounced 300 ms, date range); (c) Add-CUIT flow with format validation (11 digits) and post-create immutability; (d) bulk import with browser-side per-row validation preview before submission; (e) destructive delete confirmation following `core-modals`.
- Define the typed surface. `src/lex/blacklist/api.ts` (endpoints), `src/lex/blacklist/parse.ts` (CSV/XLSX parser with row validation), `src/pages/Blacklist.vue` (the page), `src/lex/blacklist/AddCuitModal.vue`, `src/lex/blacklist/BulkBlacklistModal.vue`, `src/lex/blacklist/EditMotivoModal.vue`.
- Integrate with sibling capabilities — referenced, not edited:
  - `core-data-tables` — table primitive, monospace ID column (CUIT), L3 filter row.
  - `core-modals` — destructive confirmation pattern for delete; create + edit + bulk modal containers.
  - `core-forms` — vee-validate + zod for CUIT format, motivo length; shadcn-vue Select for any selects.
  - `core-navigation` — top-level Sidebar entry, breadcrumb, redirect from `/usuarios/blacklist`.
  - `core-error-handling` — 409 duplicate handling, server error toasts, retry semantics.
  - `lex-roles` — `Agregar CUIT`, `Importar masivo`, and `Eliminar` actions hidden for non-`ADMIN_LEX` (or non-`ADMIN_LEX`/`COMMERCIAL_LEX` per row in the matrix).

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-blacklist` (Lex page; CUIT registry) — 5 requirements, 16 scenarios.

### Non-capability artifacts

- `src/pages/Blacklist.vue` — page implementation.
- `src/lex/blacklist/api.ts` — endpoints + types.
- `src/lex/blacklist/parse.ts` — CSV/XLSX row parser and validator.
- `src/lex/blacklist/AddCuitModal.vue`, `BulkBlacklistModal.vue`, `EditMotivoModal.vue` — modal containers per `core-modals`.
