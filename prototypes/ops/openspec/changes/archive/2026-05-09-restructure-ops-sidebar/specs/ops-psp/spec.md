## MODIFIED Requirements

### Requirement: The PSP module CTA + tab access MUST be gated by capability

The sidebar entry `PSP` SHALL be visible only to users with `psp:read` capability or `OPS_ADMIN`. The page itself respects the same gate — direct navigation to `/psp` for users without the capability shows the canonical 403 surface. CTAs WITHIN the page have their own gates: the page-header main CTAs are tab-aware per the `tab-aware right-actions` requirement — `Crear Movimiento` requires `psp:create-movement || OPS_ADMIN`, `Crear Cuenta` requires `psp:whitelist || OPS_ADMIN` (in the PSP domain, "crear cuenta" IS the whitelist flow — the CTA is the page-header relocation of the previous body-level `Habilitar cuenta`, same surface, same gate). Future CTAs (Edit Label, SWIFT Import) will declare their own capability strings when those follow-ups land. For v1 inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates.

#### Scenario: ADMIN role sees the sidebar entry and the page

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the sidebar renders and the user navigates to `/psp`
- **THEN** the `PSP` entry is visible under the `Custodia` block; the page renders fully

#### Scenario: VIEWER role does NOT see the sidebar entry but can still deep-link with read capability

- **GIVEN** an authenticated user whose roles include `psp:read` only
- **WHEN** the sidebar renders
- **THEN** the `PSP` entry is visible under the `Custodia` block (read capability suffices for the entry); navigating to `/psp` renders all 3 tabs in read-only mode; the `Crear Movimiento` and `Crear Cuenta` CTAs are hidden in their respective tabs (gated by `psp:create-movement` / `psp:whitelist`); the `<ViewToggle>` remains visible in Movimientos and Cuentas

#### Scenario: User with no PSP capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/psp`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the `PSP` entry to begin with

### Requirement: The /psp page MUST be a Type-A page with 3 internal tabs (Posición / Movimientos / Cuentas) and URL-reflected active tab

The page SHALL be implemented at `src/pages/Psp.vue` and registered at `/psp` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'PSP'`, and `meta.block = 'Custodia'`. The composition SHALL follow the Type-A pattern from `core-module-types` with sub-module tabs (Módulo B shape per `MIGRATION-NOTES.md` Decision PSP-1): page header (title + tab-aware right-actions per the `tab-aware right-actions` Requirement), reconciliation banner area, tab indicator, active tab body. The active tab SHALL be reflected in the URL via `?tab=posicion|movimientos|cuentas` so back-navigation restores the tab. **The initial tab MUST default to `posicion` whenever no `?tab=` query parameter is set, regardless of any persisted state.** The page MAY still write `localStorage:ops:psp:lastTab` on tab switches for analytics or future re-introduction of saved state, but SHALL NOT read it as a default-tab source on mount.

#### Scenario: Authenticated navigation to /psp opens the Posición tab

- **GIVEN** an authenticated `OPS_ADMIN` user with no prior PSP visit history
- **WHEN** the user navigates to `/psp`
- **THEN** the page renders with the AppShell, the tab indicator shows `Posición · Movimientos · Cuentas`, the active tab is `Posición`, the URL becomes `/psp?tab=posicion`

#### Scenario: Returning visit ignores any persisted tab and defaults to Posición

- **GIVEN** an authenticated user whose `localStorage:ops:psp:lastTab` is `'movimientos'` (set by a previous visit)
- **WHEN** the user navigates to `/psp` (no query param)
- **THEN** the active tab on mount is `Posición` (NOT `Movimientos`); the URL becomes `/psp?tab=posicion`; the persisted `lastTab` is overwritten or ignored

#### Scenario: Switching tabs updates the URL query

- **GIVEN** the page mounted on `Posición`
- **WHEN** the user clicks the `Cuentas` tab
- **THEN** the URL becomes `/psp?tab=cuentas`, the body re-renders the Cuentas tab content

#### Scenario: A direct ?tab=movimientos URL still wins over the default

- **GIVEN** an authenticated user navigates directly to `/psp?tab=movimientos`
- **WHEN** the page mounts
- **THEN** the active tab is `Movimientos` (the explicit query param overrides the default); the URL stays `/psp?tab=movimientos`
