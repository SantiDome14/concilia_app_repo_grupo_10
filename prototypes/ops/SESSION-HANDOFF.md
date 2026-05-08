# Session handoff — 2026-05-08 (operator-testing pass on OPS)

> Ephemeral doc to bridge between chat sessions. Read this first when
> resuming work on this branch, then drop into `MIGRATION-NOTES.md` /
> `MIGRATION-PLAYBOOK.md` for the durable governance.

## Where we are

- **Branch:** `feat/migrate-legacy-application-to-new-core-template`
- **HEAD:** `a34a1b7` — pushed, in sync with `origin`
- **Working tree:** clean (only untracked is `.claude/` worktree metadata, ignore it)
- **Validation gates last run:** typecheck ✅, lint ✅, build ✅, 713/714 tests ✅ (the 1 failure is pre-existing on `validateManifest.spec.ts` — `prototypes/fin-old/manifests/...` no longer exists; tracked as antipattern #14 in the playbook)
- **OpenSpec:** 25/25 specs valid

## What landed in this session (10 commits, in chronological order)

| Commit | Subject |
|---|---|
| `0e85004` | sidebar z-index + template-only modules cleanup (z-[600] over Dialog/Sheet overlays + remove ModuloA/B/C + Playground from derived apps) |
| `bcbd3d3` | OPS migration learnings → cross-prototype playbook |
| `80a32e8` | PSP adopts strict Módulo B shape; OPS sidebar brand → "OPS / Ardua Financial Core / O" |
| `5ae90ec` | split `ops-financial-dashboard` into `ops-movimientos` + `ops-cotizaciones` (top-level modules, not Dashboard tabs) |
| `918d266` | PSP tab-aware header + multi-sponsor Posición + closed Movimientos catalog (BIND + Banco de Comercio activated) |
| `6d0c806` | `Crear Cuenta` wires the whitelist modal (rename of legacy `Habilitar cuenta`, not a placeholder toast) |
| `818a1b5` | PSP partner rename + Posición default + partner filter as Select (`Sponsor` → `Partner` in user-facing labels; pill cards → Select; health chip drops `Coinag` prefix; localStorage no longer overrides default tab) |
| `1193327` | dev-fallback wildcard `*` capability so test users see every CTA (`useCapabilities.can()` honours `'*'`; seed includes it across 5 prototypes + template) |
| `27761ca` | key the `RouterView` so route changes force a clean remount (defensive — `:key="route.name"` in `App.vue` across all 5 prototypes) |
| `a34a1b7` | **Real root cause** of the "main pane stuck" bug: `<SelectItem value="">` in `Instructions.vue` was throwing in setup and breaking the parent's unmount cycle, leaving zombie DOM. Sentinel pattern (`__all__` + computed bridge) applied. |

## Known follow-ups (nominated in archived specs)

These are intentionally NOT shipped here; each is a separate change when product asks.

- **`extend-ops-psp-create-movement`** — `Crear Movimiento` CTA today is a placeholder toast; the real mutation surface is owned by this follow-up.
- **`extend-ops-psp-alternative-views`** — `<ViewToggle>` (list/cards/kanban) renders structurally on Movimientos and Cuentas tabs but `cards` and `kanban` modes fall through to the list render in v1.
- **`extend-ops-psp-bind-integration`** + **`extend-ops-psp-banco-de-comercio-integration`** — backend wiring; the catalog flip + per-partner health chip slot + degradation to `Sin integración` are already in place, so these are pure backend work.
- **`extend-ops-psp-whitelist-from-drawer`** — re-cable the `<WhitelistAccountModal>` from a drawer-context (e.g. inside the SWIFT transactions drawer) since the page-header `Crear Cuenta` already owns the page-level invocation.
- **`chore-ops-psp-remove-deprecated-sponsor-balance-card`** — once a release ships without consumers, delete `<SponsorBalanceCard>`.
- **`refactor-ops-psp-internal-rename-sponsor-to-partner`** — purely cosmetic; rename `SponsorCode`, `BancoSponsor`, etc. internal types. Low priority — only worth doing once the API contract also flips.
- **Pre-existing `validateManifest.spec.ts` failure** — `prototypes/fin-old/manifests/...` removed; either restore the fixture or delete the acid-test (`chore: remove fin-old manifest acid-test`).

## Patterns + antipatterns codified this session

In `prototypes/_core-template/MIGRATION-PLAYBOOK.md`:

- **Pattern 12** — App derivation cleanup (template-only modules stay in `_core-template`).
- **Pattern 13** — Sidebar must be ABOVE Dialog/Sheet overlays (z-index 600+).
- **Pattern 14** — Don't replicate legacy architectural errors (4 diagnostic questions for "Dashboard" / "Hub" pages).
- **Pattern 16** — Key the RouterView so route changes force a clean remount (`:key="route.name"`).
- **Pattern 9 addendum** — dev-fallback wildcard `'*'` capability convention.
- **Antipattern #15** — sidebar z-index below modal overlay.
- **Antipattern #16** — derived app ships template-only modules.
- **Antipattern #17** — "big-dashboard" pattern (concentrating 2+ unrelated surfaces).
- **Antipattern #18** — PSP simple cards-row instead of strict Módulo B shape.
- **Antipattern #19** — `<SelectItem value="">` throws in reka-ui v2+ and breaks unmount → zombie DOM.

## How to resume

1. **Read this file first.**
2. Skim the commit list above (`git log --oneline -10` from the OPS prototype).
3. For deep context on architectural decisions, read `prototypes/_core-template/MIGRATION-PLAYBOOK.md` (Patterns 1–16, antipatterns 1–19).
4. For OPS-specific decision history, read `prototypes/ops/MIGRATION-NOTES.md`.
5. Run validation gates from `prototypes/ops/`:
   ```bash
   npm run type-check && npm test -- --run && npm run lint && npm run build
   npx openspec validate --all --strict
   ```
   Expected: all green except the pre-existing `validateManifest.spec.ts` failure (1 of 714 tests).
6. To browser-test: `npm run dev` from `prototypes/ops/`, then visit `/psp` (default tab Posición) and verify Instrucciones → Cotizaciones navigation no longer leaves a zombie DOM.

## Loose ends / observations

- Vite dev server occasionally needs a manual restart + `rm -rf node_modules/.vite` when changes to `App.vue` aren't picked up by HMR. Documented inline in Pattern 16.
- The user is testing from `192.168.5.39:5173` (LAN address, not localhost). No special handling needed; the app respects `host: 0.0.0.0` in `vite.config.ts` via env.
- `OPS_ADMIN` vs `ADMIN_OPS` naming drifted between gates and the dev seed; rather than reconcile names, the wildcard `'*'` resolves it.

## When in doubt

- Spec change cycle: write proposal + tasks + spec deltas → `openspec validate <change> --strict` → `openspec validate --all --strict` → implement → tests → `openspec archive <change>` → revalidate → commit + push.
- The user prefers Spanish for chat; commit messages and code stay in English.
- Don't re-derive patterns; if you find yourself solving a problem and you remember "this was an antipattern", grep the playbook first.
