# Migrate legacy applications to new core-template (LEX + OPS + TRD)

## Summary

This PR is the multi-month migration of the legacy applications onto the
new `core-template` framework. It lands the OpenSpec governance loop,
twelve `core-*` capabilities in the template, eight `ops-*` capabilities
in OPS, and a long tail of QoL refinements + governance patterns codified
in the migration playbook.

- **Scope:** 33 commits, 2,132 files changed (+284k / −291).
- **Branch:** `feat/migrate-legacy-application-to-new-core-template` → `main`.
- **Validation gates last run:** typecheck ✅ · lint ✅ · build ✅ · tests **713/714** ✅ (1 pre-existing unrelated failure on `validateManifest.spec.ts`) · OpenSpec **25/25** ✅.

## What landed (high level)

### Framework foundations (`prototypes/_core-template-frontend`)

- OpenSpec governance scaffolding (proposal / tasks / specs delta / archive).
- `core-auth` (step-up authentication), `core-multi-step-form` (Wizard primitive), `core-websocket-client`, `core-dynamic-forms`, `core-charts` (Unovis wrappers), `core-data-tables`, `core-modals`, `core-navigation`, `core-error-handling`, `core-forms`, `core-modulo-genericos`, `core-actions-manifest` + `core-actions-menu`.
- DatePicker rewritten on reka-ui Calendar primitives.
- Component playground (dev-only) for primitive smoke tests.
- Tier 2 + Tier 3 component cohorts.

### OPS application (`prototypes/ops`)

8 capabilities, all spec-archived:

| Capability                         | Highlights                                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ops-instructions`                 | Type-A page + 3 modals (Create / Edit / Detail) for routing-template management.                                                                                                                                                     |
| `ops-clients`                      | Master list + detail page (NOT a modal) with `<WhitelistAccountModal>` reused cross-capability.                                                                                                                                      |
| `ops-statements`                   | Statement-generation modal with 5 QoL refinements.                                                                                                                                                                                   |
| `ops-account-instructions`         | 3-step wizard with live letter preview + 5 QoL refinements.                                                                                                                                                                          |
| `ops-psp`                          | Type-A page with 3 internal tabs (Posición / Movimientos / Cuentas), open-set Banco Sponsor catalog (COINAG + BIND + Banco de Comercio active), strict Módulo B shape, per-partner health chip, tab-aware page-header right-actions. |
| `ops-movimientos`                  | Top-level page split out of the obsolete `ops-financial-dashboard`.                                                                                                                                                                  |
| `ops-cotizaciones`                 | Top-level page split out of the obsolete `ops-financial-dashboard`.                                                                                                                                                                  |
| `core-modulo-genericos` (consumed) | Dashboard / Inbox / Alertas / Reportes generics.                                                                                                                                                                                     |

### Operator-testing fixes shipped on top (final pass, 2026-05-08)

- Sidebar z-index lifted to `z-[600]` so navigation works while a modal is open (Pattern 13).
- Template-only modules (`ModuloA/B/C`, playground) removed from derived apps; stay in `_core-template-frontend` only (Pattern 12).
- `Financial Dashboard` retired as an architectural error; split into `ops-movimientos` + `ops-cotizaciones` as separate top-level modules (Pattern 14).
- PSP Posición tab adopts the strict Módulo B shape (KPI grid + filter row + tree expansible per partner → accounts).
- Sponsor catalog activates BIND + Banco de Comercio structurally; balances/accounts degrade to `$0.00` / `0` + neutral `Sin integración` chip until backend integration ships.
- User-facing rename `Sponsor` → `Partner` (internal types intentionally preserved).
- Movimientos partner filter promoted from pill cards to a Select alongside Tipo / Estado / Origen.
- Type / Status filters sourced from a closed catalog (`COLLECTOR_IN`, `COLLECTOR_OUT`, …, `COMPLETED`, `PENDING`, `FAILED`) — operator sees every option even on empty pages.
- Coinag health chip relocated from page header to the COINAG row's collapsible header in the Posición tree; labels generic (`Operativo` / `Degradado` / `Caído`).
- Page-header right-actions slot is tab-aware: Posición → `Crear Movimiento`; Movimientos → `<ViewToggle>` + `Crear Movimiento`; Cuentas → `<ViewToggle>` + `Crear Cuenta` (opens `<WhitelistAccountModal>`).
- Posición is the unconditional default tab on `/psp` (localStorage no longer overrides).
- Sidebar brand: avatar `O`, label `OPS`, tagline `Ardua Financial Core`.
- `useCapabilities` honours wildcard `'*'` so dev-fallback users see every CTA without enumerating fine-grained capability strings.
- `RouterView` keyed by `route.name` to force clean re-mount on route change (Pattern 16).
- **Real root cause** of the "main pane stuck" bug: `<SelectItem value="">` in `Instructions.vue` was throwing in setup and breaking the parent's unmount cycle (antipattern #19). Sentinel pattern (`__all__` + computed bridge) applied.
- Deprecated `baseUrl` removed from all `tsconfig.app.json` files (TS 6 deprecation, TS 7 removal).

### Migration playbook + governance

- 16 patterns + 19 antipatterns codified in `prototypes/_core-template-frontend/MIGRATION-PLAYBOOK.md`.
- OPS-specific decision history captured in `prototypes/ops/MIGRATION-NOTES.md`.
- Session handoff doc at `prototypes/ops/SESSION-HANDOFF.md` for cross-chat continuity.

### Sibling apps (`prototypes/lex`, `prototypes/trd`, `prototypes/clp`)

Re-synced from the updated `_core-template-frontend`. Empty of domain capabilities (none migrated yet); inherit the framework foundations + the operator-testing fixes (sidebar z-index, dev-fallback wildcard, RouterView keying, `baseUrl` cleanup, brand color tokens). Ready for their own migration changes when product opens them.

## Test plan

- [ ] Pull the branch locally + `npm install` from `prototypes/ops/`.
- [ ] Run validation gates from `prototypes/ops/`:
      `     npm run type-check
    npm test -- --run
    npm run lint
    npm run build
    npx openspec validate --all --strict
    `
- [ ] Boot the dev server (`npm run dev`) and exercise:
  - [ ] `/psp` opens on the **Posición** tab by default; tree shows COINAG + BIND + Banco de Comercio rows; per-partner health chip visible only inside the COINAG row (label reads `Operativo` without the partner-name prefix).
  - [ ] Page-header right-actions match the active tab: Posición → `Crear Movimiento`; Movimientos → `<ViewToggle>` + `Crear Movimiento`; Cuentas → `<ViewToggle>` + `Crear Cuenta` (clicking opens `<WhitelistAccountModal>`).
  - [ ] `/movimientos` partner filter is a Select alongside Tipo / Estado / Origen; filter dropdowns show the closed catalog regardless of which rows are loaded; `?sponsor=COINAG` URL param continues to work for legacy bookmarks.
  - [ ] Navigating between modules with a modal open: the modal closes AND the navigation completes (Pattern 13).
  - [ ] Navigating to and away from `/instructions` no longer leaves a zombie DOM (antipattern #19 fix verified).
  - [ ] Sidebar brand reads `OPS / Ardua Financial Core` with avatar `O`.
- [ ] Browser smoke-test on the four sibling derived apps (LEX / TRD / CLP) — should at minimum boot the AppShell + Dashboard / Inbox / Alertas / Reportes generics.

## Follow-ups (intentionally NOT in scope)

These are nominated in the archived spec changes and ready to be opened when product asks:

- `extend-ops-psp-create-movement` — wire `Crear Movimiento` to a real mutation surface.
- `extend-ops-psp-alternative-views` — implement `cards` / `kanban` view modes for Movimientos and Cuentas.
- `extend-ops-psp-bind-integration` + `extend-ops-psp-banco-de-comercio-integration` — backend wiring (the frontend slot is already in place).
- `extend-ops-psp-whitelist-from-drawer` — re-cable `<WhitelistAccountModal>` from the SWIFT transactions drawer.
- `chore-ops-psp-remove-deprecated-sponsor-balance-card` — delete the deprecated component once a release ships without consumers.
- `refactor-ops-psp-internal-rename-sponsor-to-partner` — purely cosmetic internal rename; low priority.
- `chore: remove fin-old manifest acid-test` — delete the `validateManifest.spec.ts` fixture that has been failing pre-existingly since `01cd08c` (the legacy `prototypes/fin-old/manifests/...` is gone).

## Reviewer notes

- This PR is the migration cumulative — each commit is independently reviewable but the unit of value is the whole branch. Recommended review path: skim `prototypes/_core-template-frontend/MIGRATION-PLAYBOOK.md` first (the patterns + antipatterns capture the reasoning behind every architectural decision), then `prototypes/ops/MIGRATION-NOTES.md` (OPS-specific decisions), then the spec changes under `prototypes/ops/openspec/changes/archive/2026-05-08-*/`.
- `prototypes/ops/SESSION-HANDOFF.md` is a transient working doc (not policy); safe to delete after merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
