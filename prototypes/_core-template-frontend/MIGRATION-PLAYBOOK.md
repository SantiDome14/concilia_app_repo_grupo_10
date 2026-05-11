---
status: active reference — read before starting any prototype migration
created_at: 2026-05-08
source: lessons learned from the OPS migration (6 capabilities, 249 tests, ~19k legacy LOC → ~6.8k new LOC)
applies_to: prototypes/lex, prototypes/trd, prototypes/clp, future Ardua core apps
---

# Migration Playbook

> **Read me first** when migrating an Ardua core app from a legacy frontend
> into the `_core-template-frontend`-derived shape. This is the playbook of patterns
> validated end-to-end by the OPS migration; applying it on LEX, TRD, CLP,
> and future apps avoids re-discovering the same lessons.
>
> **What this is.** A pattern library + a PR review checklist. Read it as
> you scope a change; revisit it when you're tempted to deviate.
>
> **What this is NOT.** A spec — capabilities live in
> `openspec/specs/`. A substitute for the per-prototype `MIGRATION-NOTES.md`
> — those are the legacy inventory for the specific app being migrated.

---

## Table of contents

1. [When to apply this playbook](#when-to-apply-this-playbook)
2. [The decision framework](#the-decision-framework)
3. [Architectural patterns (validated by OPS)](#architectural-patterns-validated-by-ops)
4. [Quality-of-life refinements canon](#quality-of-life-refinements-canon)
5. [Antipatterns to avoid](#antipatterns-to-avoid)
6. [PR review checklist](#pr-review-checklist)
7. [Reference: OPS archived changes](#reference-ops-archived-changes)

---

## When to apply this playbook

**Always**, at the start of:

- A new `add-<app>-<module>` change scoping a domain capability.
- A new `extend-<app>-<module>-<feature>` follow-up.
- A `migrate-<legacy-page>` change that ports a legacy view.

The playbook is the **first read** before writing the proposal. The
proposal's `Why` section refers back to specific patterns here when their
choice is non-obvious.

---

## The decision framework

Every migration change makes the same five decisions, in this order:

1. **What's the canonical shape?** (Type-A master list · Type-B detail · Type-A with sub-module tabs / Módulo B · Modal-only feature)
2. **What's the route surface?** (Page · Modal · Drawer · combination)
3. **What's IN scope for v1?** (Read-only first; mutations to follow-ups)
4. **Which capabilities does it compose?** (`core-*` primitives + sibling `<app>-*` capabilities)
5. **Which 5 (or fewer) quality-of-life refinements does v1 land?**

If any decision drifts from a documented pattern, the `design.md` MUST
explain why with a `Failure modes the rule prevents` paragraph. **Drift
without justification is rejected at PR review.**

---

## Architectural patterns (validated by OPS)

### Pattern 1 — Type-A unification (collapse legacy multi-route splits)

**The smell:** legacy ships 2–4 routes for what is conceptually one page (master list + detail-as-route + edit-as-route, or shell + child routes for tabs).

**The rule:** unify into a single Type-A page per `core-module-types`. Sub-views become tabs (when they have parallel data shapes), modals (when they're flash-creation flows), or drawers (for record drill-downs). The legacy URLs SHALL redirect to the unified shape; bookmarks must keep working.

**Examples:**

- `ops-instructions` collapsed `/settings/instructions/*` (3 routes → 1 page + 3 modals).
- `ops-psp` collapsed `/psp/home + /psp/accounts` (2 routes → 1 page + 3 tabs).
- `ops-clients` collapsed `/users + /clients/:id` (path renamed, master + detail kept as separate routes because the detail is dense Type-B).

**Failure mode the rule prevents:** porting the legacy multi-route split 1:1, perpetuating the artificial boundary the legacy didn't have a primitive to remove.

### Pattern 2 — Módulo B shape (treasury-style modules)

**When to apply:** the page covers a domain with multiple cohesive sub-views over the same operational data (balances + ledger + accounts; positions + flows + queue). Examples: PSP integration partners, treasury dashboards, financial dashboards.

**The shape:** Type-A page with **3 internal sub-module tabs** (NOT segmentation — these are sub-modules within ONE page). The reference implementation is `_core-template-frontend/src/pages/ModuloB.vue`. Adopt the same chrome (tab indicator above the body; per-tab data fetched lazily; URL-reflected active tab).

**Examples:**

- `ops-psp` → tabs `Disponibilidad / Movimientos / Cuentas` over the **Banco Sponsor** abstraction.
- `ops-financial-dashboard` → 2-tab variant `Activity / Quotes` (no third tab needed, but same Type-A-with-tabs shape).

**Open-set vocabulary:** when the legacy hardcodes a single integration partner (`COINAG`), Pattern 4 mandates the catalog be open-set from day one.

### Pattern 3 — Read-only first migration policy

**When to apply:** a legacy page or module > ~3 000 LOC where the bulk of the LOC is creation/mutation modals (Create Movement, multi-step wizards, file imports).

**The rule:** v1 of the capability migrates **only the read side + Whitelist-style integrations already shipped in sibling capabilities**. Every other modal (Create Movement, Pay Quote, Import SWIFT, Edit Label, CSV Export, etc.) defers to a focused `extend-<capability>-<feature>` change.

**Why it works:**

- The architectural shape lands first (tabs, filters, table column sets, drill-down drawer, capability gating). The shape is what the rest of the migration depends on; getting it right is more valuable than 1:1-migrating every modal.
- Each deferred modal gets its own design pass that fits the new primitives (probably `core-multi-step-form`, `core-file-upload`, etc.) instead of being a 1:1 port of legacy branching code.
- LOC reduction averages **60–70 %** in v1 (legacy → new). The deferred modals add LOC back over time but with proper structure.

**Examples:** `ops-psp` (9k legacy LOC → 1.4k new); `ops-financial-dashboard` (6.6k → 1.4k).

**OUT-of-scope discipline:** every deferred mutation MUST be enumerated in the proposal's `### Removed from scope` list with a **named follow-up change** (`extend-ops-psp-create-movement`, etc.). No "TBD"; no "we'll see"; the deferral is a commitment.

### Pattern 4 — Open-set abstractions from day one

**The smell:** the legacy hardcodes a single instance of what is conceptually an open set (`'COINAG'`, `'BBVA'`, `'es-AR'`, the only currently-active sponsor, the only locale, etc.).

**The rule:** the spec NEVER hardcodes the single instance. The code sources the catalog from a single config file (e.g. `src/ops/psp/sponsor-catalog.ts`) so adding a new entry later is a **one-file change** — the rest of the codebase loops over `activeEntries()`.

**Concrete shape:**

```ts
// src/ops/psp/sponsor-catalog.ts
export const SPONSOR_CATALOG: ReadonlyArray<BancoSponsor> = [
  { code: 'COINAG', label: 'COINAG', active: true,  ... },
  { code: 'BIND',   label: 'BIND',   active: false, ... }, // roadmap
  ...
];
export function activeSponsors(): BancoSponsor[] { ... }
export function getSponsorByCode(code: string): BancoSponsor | null { ... }
```

**Failure modes the rule prevents:**

- Hardcoded `if (sponsor === 'COINAG')` scattered across the codebase. When the second integration partner lands, every reference becomes a refactor.
- Single-banner alert slot that doesn't accept an array. When two sponsors report a mismatch simultaneously, the second banner overwrites the first.

**Examples:** PSP-1 `Banco Sponsor` catalog (Coinag + BIND + Banco de Comercio).

### Pattern 5 — Drawer vs Modal vs Page (drill-down decision)

| Need                                                          | Surface                                               | Rationale                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Read-mostly detail of a single record (long table + metadata) | **Drawer (right-side `<Sheet>`)**                     | Keeps the parent list mounted; navigation between records is one click           |
| Centred form / confirmation / single-record creation          | **Modal (`<Dialog>`)**                                | Focus-trap; forms are usually short                                              |
| Workflow-typed record (Inbox message, Alerta workflow)        | **Canonical `<Drawer>` from `core-modulo-genericos`** | Has the workflow chrome (status badge, primary-actions slot, timeline, comments) |
| Bookmarkable / cross-tab / back-nav target                    | **Full route**                                        | URLs are the share unit                                                          |
| Side-by-side preview + form                                   | **Modal with `xl`/`2xl` width**                       | Justified width override; documented in design.md                                |

**Examples:**

- `ops-psp` Cuentas drill-down → SWIFT transactions in **right-side `<Sheet>`** (NOT modal — the SWIFT table is wide).
- `ops-account-instructions` wizard → modal with `xl` width to fit the live letter preview side-by-side (Decision 4).
- `ops-clients` detail → full route `/clients/:id` (NOT modal — the page is dense Type-B with multiple sections).

**Failure mode the rule prevents:** defaulting everything to modals because they're "easier" — drill-downs in a centred 720 px modal force horizontal scroll on dense data.

### Pattern 6 — Cross-capability composition (NOT duplication)

**The smell:** two capabilities need the same modal/component (e.g. `<WhitelistAccountModal>` from `ops-clients` is also needed by `ops-psp`'s Habilitar cuenta CTA).

**The rule:** the component lives in **ONE canonical home** (the capability that owns its primary use case); other capabilities **import from that path**. NO copy-paste.

When the consumer needs additional behaviour (e.g. `ops-psp` needs the modal to also work without a pre-bound `clientId`), extend the component's API (added prop, added emit, optional step prefix). The extension is **non-breaking** for the existing consumer; the spec contract on the original capability is **NOT modified** — only the component's API surface grows.

**Examples:**

- `<WhitelistAccountModal>` lives in `ops-clients`; `ops-psp` imports it and added a `'pick-client'` step prefix when `clientId === null` (Decision 5 of `add-ops-psp`).
- `<MovementDetailsModal>` lives in `ops-financial-dashboard`; the future `extend-ops-psp-movement-details-modal` imports it (Decision 2 of `add-ops-financial-dashboard`).

**Failure modes the rule prevents:**

- Two implementations drift over time; bug fixed in one, not the other.
- Test coverage doubles; two tests assert the same behaviour.

### Pattern 7 — Discriminated result types (vs throwing)

**The smell:** API wrappers throw `ApiError`; the calling component does `try / catch` + `if (e instanceof ApiError && e.status === 409 && ...)` chains.

**The rule:** API wrappers that have multiple error categories return a **discriminated union**. The component pattern-matches on `result.status` instead of inspecting `ApiError`.

**Concrete shape:**

```ts
export type WhitelistResult =
  | { status: 'ok' }
  | { status: 'already_whitelisted' }
  | { status: 'exist_internal_route' }
  | { status: 'failed'; message: string };

const result = await whitelistAccount(clientId, body);
switch (result.status) {
  case 'ok':
    /* close modal + invalidate cache */ break;
  case 'already_whitelisted':
    /* inline error */ break;
  case 'exist_internal_route':
    /* inline error */ break;
  case 'failed':
    /* generic toast */ break;
}
```

**Categories that should always be discriminators:**

- `'aborted'` — `AbortController` cancellation (vs error).
- `'cvu_already_exists'` / `'validation_error'` / domain-specific 409s.
- `'business-error'` — backend `success: false` with message (legacy envelope).

**Examples:** `WhitelistResult`, `AccountInstructionResult`, `StatementResult`, `SaveResult` (instructions two-phase save).

**Failure mode the rule prevents:** throwing inside the component's `try`, then forgetting one error case + the user sees a stale "loading" state forever.

### Pattern 8 — Pure helpers extracted to standalone files

**The smell:** date math, string interpolation, classification logic baked into a `.vue` component method.

**The rule:** extract to `src/<app>/<module>/<helper-name>.ts`. Pure functions, no Vue imports, no side effects. Vitest covers the helper in isolation.

**Common helper categories:**

- **Date math** — `quick-filters.ts` (8 chips → `{from, to}` ranges) for `ops-statements`.
- **Variable interpolation** — `interpolation.ts` (`{docket}` / `{name}` / `{tax_number}` substitution + SWIFT-rule overlay) for `ops-account-instructions`.
- **Classification** — `portal-status.ts` (`metadata.status` → tone + label) for `ops-clients`.
- **Open-set catalogs** — `sponsor-catalog.ts` for `ops-psp`.
- **Persistence** — `range-storage.ts` (statements) / `draft-storage.ts` (account-instructions) — localStorage round-trip with defensive parsing.

**Test convention:** the helper has its own `<helper>.spec.ts` with ≥6 tests covering: happy path · edge dates · null inputs · malformed inputs · round-trip.

**Failure mode the rule prevents:** off-by-one in date math (e.g. "Mes anterior" on March 1 returning Feb 30) silently breaks because no test catches it.

### Pattern 9 — Capability gating inline with `OPS_ADMIN` fallback

**Until `add-<app>-roles` lands**, every capability gate uses the canonical shape:

```ts
const canDoX = computed(() => can('app:domain:action') || can('OPS_ADMIN'));
```

The `OPS_ADMIN` fallback (or `LEX_ADMIN` / `TRD_ADMIN` per app) makes the inline gate work in "first-run" mode where the role matrix isn't consolidated yet. When `<app>-roles` consolidates, a follow-up change replaces every fallback with the canonical capability string.

**Examples:** `clients:invite || OPS_ADMIN`, `psp:read || OPS_ADMIN`, etc.

**Failure mode the rule prevents:** shipping a capability that's `disabled` for everyone because the canonical capability string isn't declared yet.

**Dev fallback (no Auth0 tenant configured):** `useCapabilities` honours a wildcard capability `'*'` — any user holding `'*'` passes every gate. The dev-fallback seed in `src/plugins/auth0.ts` includes `'*'` so the operator sees every CTA without anyone having to remember to update the seed when a new fine-grained capability lands. In production, `'*'` is never granted — the IdP claim drives the user's capabilities.

```ts
// useCapabilities.ts
const WILDCARD = '*';
function can(capability: string): boolean {
  if (store.capabilities.includes(WILDCARD)) return true;
  return store.capabilities.includes(capability);
}
```

```ts
// plugins/auth0.ts (dev fallback)
const DEV_FALLBACK_CAPABILITIES = [
  '*', // dev-only wildcard — see useCapabilities
  // ...legacy named roles kept for fixtures that inspect them
];
```

**Failure mode the rule prevents:** the operator can't see a CTA that was just landed because the dev seed doesn't yet include the new fine-grained capability string (and `OPS_ADMIN` / `LEX_ADMIN` / etc. drift from the seed's `ADMIN_OPS` / `ADMIN_LEX`).

### Pattern 10 — Component emits, parent mutates (vue/no-mutating-props)

**The smell:** child component mutates `props.formState.foo = bar` and the linter rejects with `vue/no-mutating-props`.

**The rule:** child emits `update:<key>` events; parent (the page or modal) holds a reactive `formState` and applies the mutation. The shared state is owned by ONE component.

**Concrete shape:**

```vue
<!-- Step component -->
<script setup>
const emit = defineEmits<{ 'update:account-id': [value: string | null] }>();
function pick(id) { emit('update:account-id', id); }
</script>

<!-- Modal (parent) -->
<AccountStep
  :form-state="formState"
  @update:account-id="(v) => (formState.selectedAccountId = v)"
/>
```

**Failure mode the rule prevents:** lint failures + state drift when the same prop is mutated from multiple step components without coordination.

### Pattern 11 — Wizard primitive vs hand-rolled state machine

**Use `core-multi-step-form`'s `useWizard()` + `<Wizard>`** when:

- The flow has 3+ steps with progressive validation.
- The state machine is otherwise straightforward (back button + next button + submit).

**Use a hand-rolled state machine** when you need:

- A **cancel-during-submit** swap on the submit button (the canonical Wizard footer doesn't support it).
- **Per-client localStorage draft persistence** (the canonical Wizard's `sessionStorage` persistence is keyed by `wizardId`, not per-record).

**Example of hand-rolled override:** `ops-account-instructions::CreateAccountInstructionModal.vue` uses `useWizard`-style step gating but hand-rolls the footer + persistence (per Decision 3 of `add-ops-account-instructions`). The deviation is documented; the Wizard primitive is reused for everything else.

### Pattern 12 — App derivation cleanup (template-only modules stay in `_core-template-frontend`)

**The smell:** apps derived from `_core-template-frontend` (LEX, OPS, TRD, CLP, future apps) ship the template's example modules (`Módulo A`, `Módulo B`, `Módulo C`) and the component playground (`/playground/forms`, `/playground/charts`, `/playground/layout`) in their sidebar — confusing operators with surfaces that are not part of the app.

**The rule:** template-only example surfaces live **only in `_core-template-frontend`**. When a derived app re-syncs with the template (overlay strategy) it MUST clean them up:

- Delete `src/pages/ModuloA.vue`, `ModuloB.vue`, `ModuloC.vue`.
- Delete the entire `src/pages/playground/` directory.
- Remove the `MODULO_A/B/C` and `PLAYGROUND_*` entries from `src/config/routes.ts` (`ROUTE_PATHS` + `ROUTE_NAMES`).
- Remove the route definitions for those paths from `src/router/routes.ts`.
- Empty the domain `blocks: NavBlock[]` array in `src/components/layout/Sidebar.vue` (or populate it only with the app's domain modules) and remove the `devBlocks` constant + its template loop.
- Remove the `MODULO_A_MANIFEST` import + `registry.register(MODULO_A_MANIFEST_KEY, MODULO_A_MANIFEST)` line from `src/plugins/manifests.ts`. Keep the manifest file `src/manifests/framework.template.modulo_a.actions.ts` only if a test fixture references it (currently `validateManifest.spec.ts`); otherwise delete it too.

What stays in every derived app:

- The four cross-cutting standard modules (`Dashboard`, `Inbox`, `Alertas`, `Reportes`) per `core-modulo-genericos`. Their data is mocked until the app's domain takes over the surfaces.
- The empty domain `blocks: NavBlock[] = []` array — populated as each migration scopes a new `<app>-<module>` capability and adds its sidebar entry.

**Concrete OPS state after cleanup (reference for LEX/TRD/CLP):**

```ts
// Sidebar.vue
const blocks: NavBlock[] = [
  {
    label: 'Operaciones',
    items: [
      { to: ROUTE_PATHS.CLIENTS, name: ROUTE_NAMES.CLIENTS, label: 'Clientes', icon: Users },
      { to: ROUTE_PATHS.PSP, name: ROUTE_NAMES.PSP, label: 'PSP', icon: Banknote },
      {
        to: ROUTE_PATHS.FINANCIAL_DASHBOARD,
        name: ROUTE_NAMES.FINANCIAL_DASHBOARD,
        label: 'Financial Dashboard',
        icon: LineChart,
      },
    ],
  },
  {
    label: 'Configuración',
    items: [
      {
        to: ROUTE_PATHS.INSTRUCTIONS,
        name: ROUTE_NAMES.INSTRUCTIONS,
        label: 'Instrucciones',
        icon: ClipboardList,
      },
    ],
  },
];
// devBlocks removed; the template loop iterates `blocks` only.
```

**Failure modes the rule prevents:**

- Operator clicks `Módulo A` in their PSP app and sees a placeholder page that has nothing to do with PSP.
- Bundle size inflates with showcase pages (Charts playground alone is ~452 KB).
- Re-sync from the template overwrites a clean app sidebar with the template's examples — the cleanup must run on every re-sync.

### Pattern 13 — Sidebar must be ABOVE Dialog/Sheet overlays (z-index 600+)

**The smell:** with a modal open, clicking a sidebar entry doesn't navigate — the modal closes (or the click is consumed by the overlay) but the user stays on the current page. Reported as "no puedo navegar".

**The rule:** the Sidebar's `<nav>` element MUST stack ABOVE the Dialog/Sheet overlay so navigation stays accessible while a modal is open. The canonical z-index ladder:

| Element                              | Class     | Why                                                            |
| ------------------------------------ | --------- | -------------------------------------------------------------- |
| Topbar / Sidebar `<nav>`             | `z-[600]` | Above modal overlay so navigation always wins                  |
| Sidebar collapse toggle              | `z-[601]` | Above the sidebar's own bg                                     |
| `<DialogContent>` / `<SheetContent>` | `z-[501]` | Above the overlay; below the sidebar                           |
| `<DialogOverlay>` / `<SheetOverlay>` | `z-[500]` | Blocks the page body but NOT the sidebar                       |
| Sidebar account menu (`<div>`)       | `z-[200]` | Below modal — when a modal opens, the dropdown can't shadow it |

**Why navigation must win:** the sidebar is the operator's escape mechanism. If a modal hangs open due to a backend issue or misclick, the operator MUST be able to navigate away without learning a hidden gesture. The trade-off — that clicking the sidebar with a modal open closes the modal AND navigates — is acceptable: the modal's parent component unmounts on route change, so the modal goes with it cleanly.

**Implementation note:** the cleanup is a 2-line edit in `src/components/layout/Sidebar.vue`:

```vue
<!-- BEFORE: z-50 (BELOW modal overlay z-[500]) -->
<nav class="fixed left-0 top-0 bottom-0 z-50 ...">
  <button class="... z-[51] ..." aria-label="Toggle sidebar">

<!-- AFTER: z-[600] / z-[601] (ABOVE modal overlay) -->
<nav class="fixed left-0 top-0 bottom-0 z-[600] ...">
  <button class="... z-[601] ..." aria-label="Toggle sidebar">
```

The dropdown account menu intentionally STAYS at `z-[200]` (below modals) — opening the account menu while a modal is open is an edge case where it's correct that the modal wins.

**Failure modes the rule prevents:**

- Operator can't navigate while a modal is open (reported real bug, OPS 2026-05-08).
- Clicking the sidebar with a modal open feels random: sometimes the click closes the modal, sometimes nothing happens.

### Pattern 14 — Don't replicate legacy architectural errors

**The smell:** the legacy concentrates two or more unrelated surfaces under one roof — a Dashboard that mixes Movements + Quotes, a Settings page that bundles unrelated configuration domains, a single route that hosts what should be three. The 1:1 migration carries the concentration forward.

**The rule:** when scoping a migration change, name **what each surface is for** and **who its primary audience is**. If two surfaces would have different audiences / different update cadences / different navigation entry points from the operator's daily flow, they are **independent modules** — not tabs of one dashboard. Migrate them as separate top-level capabilities; redirect the legacy URL to the most-used of the new modules.

**Diagnostic questions** to apply to any "Dashboard" or "Hub" page in the legacy:

1. _Who looks at this?_ If "Movements" is for ops generalists and "Quotes" is for the trading desk, that's two audiences.
2. _How often does it change?_ If "Movements" updates per-second-ish and "Quotes" updates per-minute, that's two cadences.
3. _What's the natural URL?_ If you'd give a teammate `/movimientos` to share an activity link rather than `/dashboard?tab=activity`, the natural URL is the per-module path.
4. _Was the concentration a UX choice or a workaround?_ If the legacy didn't have a sub-module-tabs primitive, the concentration was probably a workaround.

If 3+ of those answers say "split", split.

**Example:** OPS migration's `add-ops-financial-dashboard` initially ported the legacy's `FinancialDashboard.vue` 1:1 (Activity + Quotes tabs). An operator surfaced that the concentration was confusing. The follow-up `refactor-ops-dashboard-into-movimientos-cotizaciones` split it into `ops-movimientos` and `ops-cotizaciones` as two top-level modules. The legacy `/dashboard` URL redirects to `/movimientos` (most-used legacy entry).

**Failure modes the rule prevents:**

- Operator can't find Movements because they searched the sidebar for "Mov..." but the entry says "Financial Dashboard".
- Bundle size: every visit to `/financial-dashboard` loads the Quotes table machinery even when the operator only ever looks at Activity.
- Capability gating: `dashboard:read` was a coarse capability gating both surfaces; splitting allows the trading desk role to see Cotizaciones without also being granted access to Movimientos (and vice versa).

### Pattern 15 — Modal width override is justified, not casual

**Default:** `sm:max-w-lg` (~720 px) per `core-modals` for centred dialogs.

**Override allowed when:**

- The modal hosts a side-by-side preview (form + live preview) — use `xl` (~960 px) or `2xl`.
- The modal is a wizard with multiple panes that don't fit `lg`.

**Override NOT allowed for:**

- Aesthetic preference ("looks better wider").
- 1:1 legacy parity ("the legacy was wider").

**The override SHALL be documented in `design.md`** with a `Decision N — Modal width is X, NOT the canonical lg` block stating why.

**Example:** `ops-account-instructions` Decision 4 — `xl` width because the live letter preview is A4-aspect and needs ~400 px next to a 400 px input column.

### Pattern 16 — Key the RouterView so route changes force a clean remount

**The smell:** after navigating from `/foo` to `/bar`, the URL, sidebar highlight, and breadcrumb all update — but the main pane keeps rendering the previous module's content. Reported as "el main sigue mostrando X" or "no me cambia el contenido aunque la URL cambió".

**Root cause:** Vue Router does not, by default, re-mount the routed component when transitioning between two routes that share the same outlet. If the outgoing component had any of the following, the side effects can leak past unmount and visually persist over the new route:

- A teleported portal (`<Dialog>`, `<Sheet>`, `<Popover>`) whose parent gets unmounted "in the wrong order".
- A pending async fetch whose `.then` mutates a ref after the component has technically unmounted.
- A `watch` on `route.query` (or any reactive that survives the navigation) that runs once more on the way out and calls `router.replace`.
- An HMR-stale instance from the dev server.

**The rule:** the top-level `<RouterView>` in `App.vue` SHALL render its slot through a keyed `<component :is="Component" :key="..." />`. The key is `route.name` (NOT `route.fullPath`), so the component re-mounts when the route changes but NOT when only `route.query` changes (which is the canonical channel for filters / pagination / tabs).

```vue
<!-- App.vue -->
<script setup>
import { RouterView, useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <AppShell>
    <RouterView v-slot="{ Component }">
      <component :is="Component" :key="String(route.name ?? route.path)" />
    </RouterView>
  </AppShell>
</template>
```

**Why `route.name` and not `route.fullPath`:**

- `route.fullPath` includes the query string. Keying on it would force a full remount whenever a filter / pagination / tab query param changes — destroying local state and triggering re-fetches the page deliberately scoped to query changes.
- `route.name` is stable per route record. It changes if and only if the matched route record changes (i.e. the user navigated to a different module). Exactly the trigger we want for the remount.

**Failure modes the rule prevents:**

- Module X stays rendered after navigating to module Y (reported real bug, OPS 2026-05-08).
- HMR-stale routed components survive a hot reload and show outdated UI until a hard refresh.
- A modal that was mid-close-animation when the user clicked the sidebar leaves its content teleported to the body of the next route.

**Where this pattern lives:** `App.vue` of every prototype + `_core-template-frontend`. It is a single, top-level fix; pages don't need to know about it.

---

## Quality-of-life refinements canon

Migrations are not 1:1 ports. Each change SHOULD land **3–5 quality-of-life
refinements** that the legacy didn't have. These are pure-frontend, low-cost,
operator-asked. Decision 7 (or whichever number it ends up) of design.md
documents them as a table with frontend cost + operator value.

The **canonical refinements** validated across OPS (cherry-pick what fits
the surface):

| #     | Refinement                                                                                                                                                                                                            | Where it shines                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **A** | **Smart single-X default** — when the choosable list has exactly one item, auto-select it; flow advances by one step                                                                                                  | Account selector with one non-ARS account; Template selector when only one matches the rail                         |
| **B** | **localStorage persistence** — last-chosen tab / last-chosen range / draft of the wizard / selected period                                                                                                            | Statements modal range; Account-instructions wizard draft; PSP last-active tab; Financial-dashboard last sub-toggle |
| **C** | **Pre-submit preview card** — a `Resumen` card consolidates all selections before the primary CTA enables                                                                                                             | Statements; Account-instructions wizard; PSP whitelist confirm                                                      |
| **D** | **Cancel during submit (`AbortController`)** — the primary CTA transforms into `Cancelar` while the request is in flight; aborts the request and preserves selections                                                 | Statements; Account-instructions; PSP whitelist; any submit with backend > 1s                                       |
| **E** | **URL sync of state + deep-links** — every meaningful UI selection (active tab, sub-toggle, filters, drilled-down record id) is reflected in the URL; bookmarks share specific views; back-button navigation restores | Every change since `ops-clients`                                                                                    |
| **F** | **Re-open success toast** — the success toast keeps a `Volver a abrir` button for 10 s after a tab opens; recovers from accidentally-closed tabs                                                                      | Statements (download URL); receipts                                                                                 |
| **G** | **Inline field-level validation mapping** — backend `errors[]` maps to inline messages on the corresponding form inputs (NOT a toast list)                                                                            | Account-instructions; any wizard with backend validation                                                            |
| **H** | **Stackable + dismissible alert area** — multi-instance alerts (one per sponsor with mismatch) collapse to a per-session pill                                                                                         | PSP reconciliation banner                                                                                           |

**Don't ship 8 refinements at once.** Pick the 3–5 highest-leverage for the
surface; defer the rest. Refinements explicitly OUT of scope SHALL be listed
in `design.md`'s OUT block, NOT in code with a `// TODO`.

---

## Antipatterns to avoid

These are the mistakes that were caught (or almost made) during OPS. If a
review surfaces one of these, send the change back.

1. **❌ Forfeiting primitives** — re-implementing `core-data-tables`, `core-modals`, `core-multi-step-form` instead of using them. **✅** Always reach for the primitive first; deviations need a `Decision N` block.

2. **❌ Component duplication cross-capability** — copying `<WhitelistAccountModal>` into `ops-psp` because "we need a slightly different version". **✅** Extend the component's API (added prop / emit / optional step), document the extension in the consuming capability's design.md.

3. **❌ Hardcoded single-instance catalog** (`if (sponsor === 'COINAG')`). **✅** Open-set catalog from day one (Pattern 4).

4. **❌ Mutating props from child components** (`vue/no-mutating-props`). **✅** Emit + parent mutates (Pattern 10).

5. **❌ Throwing `ApiError` for domain-specific errors** (forces `try/catch + instanceof + status check` everywhere). **✅** Discriminated result type (Pattern 7).

6. **❌ Inline domain logic in `.vue` templates** (date math, interpolation, classification). **✅** Pure helper file + Vitest coverage (Pattern 8).

7. **❌ "Big bang" full migration with every modal** for 6k+ LOC pages. **✅** Read-only first; defer modals with named follow-ups (Pattern 3).

8. **❌ Promote a sub-toggle to a top-level tab** when the data shape is identical. **✅** URL param + canonical sub-toggle (Decision 4 of `add-ops-financial-dashboard`).

9. **❌ Drawer for creation flows / Modal for record drill-down** — pattern mismatch. **✅** Drawer for read-mostly drill-down; Modal for centred forms / confirmations (Pattern 5).

10. **❌ Step-up MFA "for consistency"** — applying MFA to every mutation. **✅** Step-up only when the operation crosses a trust boundary (e.g. SignUp creates portal credentials). Statement generation, instruction creation, movement details — NO step-up (operational data the operator already has authority over).

11. **❌ Test stubs that ignore Teleport** — `<Dialog>` content is teleported by reka-ui; jsdom doesn't project the portal. **✅** Stub `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` with inline-rendering setup objects in the test (see `MovementDetailsModal.spec.ts` for the canonical stub shape).

12. **❌ Lint rule traps** — `import()` type annotations break `@typescript-eslint/consistent-type-imports`; `import type * as foo from '@/lib/foo'` is the workaround. Generic `<script setup generic>` rejecting named `interface Props` — inline the type in `defineProps<{...}>()`. These traps are documented in CLAUDE.md / AGENTS.md "Code Conventions".

13. **❌ `package.json` resolution from worktree path** — when the bash shell `cwd` is the worktree path (`prototypes/.claude/worktrees/.../`), `npm` doesn't find `package.json`. **✅** Run `npm` from `prototypes/<app>/` explicitly with `cd` or `npm --prefix=...`.

14. **❌ Pre-existing failing test ignored silently** — `validateManifest.spec.ts` failed since `01cd08c` (fin-old removed); easy to ignore as "not mine". **✅** Ignore is fine but flag it explicitly in commit message + as a follow-up (`chore: remove fin-old manifest acid-test` or similar).

15. **❌ Sidebar z-index below modal overlay** — leaves the navigation behind the `<Dialog>`/`<Sheet>` overlay (z-[500]) so clicking sidebar entries while a modal is open does NOT navigate. Reported as a real bug by an operator running the OPS prototype 2026-05-08. **✅** Sidebar `<nav>` SHALL be `z-[600]`, toggle button `z-[601]` (Pattern 13).

16. **❌ Derived app ships template-only example modules** — `Módulo A`, `Módulo B`, `Módulo C`, and the component playground (`/playground/forms`, `/playground/charts`, `/playground/layout`) appear in the sidebar of LEX/OPS/TRD/CLP. Operators see surfaces unrelated to their domain. **✅** Cleanup as part of the first migration of each derived app (Pattern 12).

17. **❌ "Big-dashboard" pattern** — concentrate Movements + Quotes (or any 2+ unrelated surfaces) into a single Dashboard route because "the legacy did it that way". Reported by an operator after `add-ops-financial-dashboard` shipped 2026-05-08; corrected by `refactor-ops-dashboard-into-movimientos-cotizaciones`. **✅** When the legacy concentration was a workaround for a missing primitive (no sub-module-tabs at the time), the migration's job is to split — NOT to perpetuate the workaround. Apply the diagnostic questions from Pattern 14: who looks at this · update cadence · natural URL · UX choice or workaround.

18. **❌ PSP "Disponibilidad" simple cards-row instead of strict Módulo B shape** — initial `add-ops-psp` migration shipped a 3-column row of `<SponsorBalanceCard>` for the first tab. Operator surfaced that the canonical Módulo B has a much richer shape (KPI grid + filter row + tree expansible per sponsor → accounts). Corrected by `extend-ops-psp-posicion-shape`: tab renamed `Posición`, body adopts the strict Módulo B shape per `MIGRATION-NOTES.md` Decision PSP-1. **✅** When `MIGRATION-NOTES.md` declares "module X adopts the Módulo B shape", that means the **strict** Módulo B shape (KPI grid + filter row + tree). A simplified cards-row deviation is a spec violation, NOT a UX shortcut.

19. **❌ `<SelectItem value="">` — "All / no filter" sentinel as the empty string** — reka-ui v2+ throws in setup with `A <SelectItem /> must have a value prop that is not an empty string`. The throw is silent in the dev console most of the time, but it FATALLY breaks the parent component's unmount cycle (`Cannot read properties of null (reading 'type')` in `unmountComponent`). When the operator navigates AWAY from the page, the broken unmount leaves a zombie DOM tree visible OVER the new route — looks indistinguishable from a "main pane stuck on previous module" bug, but the root cause is upstream. Reported as a real bug by an operator running OPS Instructions 2026-05-08. **✅** Use a sentinel string (`'__all__'` is the canon) for the "no filter" option AND a `computed<string>` v-model bridge that translates the sentinel back to `''` for the underlying filter ref:

    ```ts
    const ALL = '__all__';
    const filterModel = computed<string>({
      get: () => filterRef.value || ALL,
      set: (v) => {
        filterRef.value = v === ALL ? '' : v;
      },
    });
    ```

    ```vue
    <Select v-model="filterModel">
      <SelectContent>
        <SelectItem :value="ALL">Todos</SelectItem>
        <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    ```

    The pattern is already documented inline in `Reportes.vue`. Apply it to every `<Select>` whose underlying filter ref is allowed to be empty. (When the underlying ref is a closed enum without "all", the sentinel is unnecessary — every `SelectItem` has a non-empty `value`.) Cross-link: this is the _real_ root cause of the navigation-persistence symptom that Pattern 16 also defends against.

---

## PR review checklist

Use this when reviewing or self-reviewing a migration change.

### Spec hygiene

- [ ] Capability declares `## ADDED Requirements` (NOT `## Requirements`) — required for new capabilities inside changes.
- [ ] Each Requirement has at least 3 `#### Scenario:` blocks (≥3 for behavioural Requirements; 2 for purely structural ones).
- [ ] Each Requirement contains `MUST` or `SHALL` (lowercase variants are rejected by `openspec validate --strict`).
- [ ] Requirements are numbered logically (read top-to-bottom = read the user flow).
- [ ] No requirement says "should consider" / "may eventually" — be concrete or defer to a follow-up.

### Design.md hygiene

- [ ] Every non-obvious decision has a `Decision N` block with: question · decision · why · alternatives considered · failure modes the rule prevents · trade-off (optional).
- [ ] The OUT-of-scope list is concrete: every deferred feature has a **named follow-up change** (`extend-<capability>-<feature>`).
- [ ] Cross-capability composition table lists every sibling capability the change touches, with what each owns.
- [ ] Open questions section is non-empty (no migration is pristine; document the deferred decisions).

### Proposal.md hygiene

- [ ] `### Affected Capabilities` is empty when the change does NOT modify sibling specs (composition is NOT modification).
- [ ] `### New Capabilities` declares the spec stats: `N requirements, ~M scenarios`.
- [ ] `### Removed from scope` is concrete with named follow-ups (matches design.md OUT).

### Implementation hygiene

- [ ] Pure helpers extracted to `<module>/<helper>.ts` with Vitest coverage.
- [ ] API wrappers return discriminated result types (NOT throw) for domain-specific error categories.
- [ ] Component emits + parent mutates pattern (no `vue/no-mutating-props` violations).
- [ ] Cross-capability components are imported (NOT copied) from their canonical home.
- [ ] Open-set catalogs (sponsor / locale / currency / etc.) live in a single `<catalog>.ts` file; no hardcoded single-instance branches.
- [ ] Modal width override (anything beyond `sm:max-w-lg`) is documented in design.md.
- [ ] Step-up MFA gating ONLY on operations that cross a trust boundary.

### Tests hygiene

- [ ] Pure helpers: ≥6 tests covering happy path · edge cases · null inputs · malformed inputs · round-trip.
- [ ] API wrappers: tests for happy path · each discriminated error · transport failure · `AbortController` (when applicable).
- [ ] Component tests stub Dialog/Sheet primitives that use Teleport (jsdom doesn't project portals).
- [ ] `localStorage` / `sessionStorage` tests `beforeEach(() => storage.clear())`.

### Validation gates

Before commit, run:

```bash
cd prototypes/<app>/
npm run type-check     # vue-tsc --build
npm run lint           # eslint . --fix
npm run test:run       # vitest run
npx openspec validate <change-id> --strict
npx openspec validate --all --strict
npm run build:qa
```

All must pass. Pre-existing failures (e.g. `validateManifest.spec.ts`) are
documented in the commit message but do NOT block the commit if unrelated.

### Commit message hygiene

- [ ] Conventional shape: `feat(<app>): implement <capability> capability (N tests + Y refinements)`.
- [ ] Body lists the 3–5 quality-of-life refinements with letter codes (7a/7b/7c/7d/7e or A/B/C/...).
- [ ] OUT-of-scope features named explicitly with their follow-up change names.
- [ ] Validation gates summary line: `type-check + lint + test:run (X/Y new + A/B overall) + spec:check (N/M) + build:qa`.

---

## Reference: OPS archived changes

The OPS migration is the canonical worked example. Each archive folder is a
complete worked-out instance of the patterns above. **When in doubt, read
the archived `design.md` of the closest analogue.**

Located at `prototypes/ops/openspec/changes/archive/`:

| Date       | Change                         | Key patterns instantiated                                                                                                                                                       | Tests added |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2026-05-08 | `add-ops-instructions`         | Type-A unification (3 routes → 1 page + 3 modals); two-phase save with retry banner; key-value-array primitive                                                                  | 22          |
| 2026-05-08 | `add-ops-clients`              | Type-A master + Type-B detail (NOT modal); single helper `derivePortalStatus`; one-Dialog-2-step-state-machine; cross-capability `<WhitelistAccountModal>` reuse                | 31          |
| 2026-05-08 | `add-ops-statements`           | Modal-only feature; pre-submit preview card; cancel during submit; localStorage persistence; reuse `<ClientFilters mode="picker">`                                              | 39          |
| 2026-05-08 | `add-ops-account-instructions` | Wizard with `<Wizard>` primitive override; pure interpolation helpers; live A4 preview side-by-side; localStorage draft persistence per client; inline field-level validation   | 67          |
| 2026-05-08 | `add-ops-psp`                  | Módulo B shape; Banco Sponsor open-set abstraction; stackable reconciliation banner; sponsor cards click-to-filter cross-tab; auto-refresh 60 s; Drawer drill-down for accounts | 53          |
| 2026-05-08 | `add-ops-financial-dashboard`  | Type-A with 2 tabs; sub-toggle as URL param (NOT third tab); `MovementDetailsModal` as canonical home for cross-capability reuse; legacy `/dashboard` redirect (NOT `/`)        | 37          |

**Total OPS migration:** 6 capabilities · 249 tests · ~19 000 legacy LOC → ~6 800 new LOC (64 % reduction) · 26 follow-up changes nominated.

Each archive contains:

- `proposal.md` — Why + What Changes + Capabilities + Removed from scope.
- `design.md` — Architectural decisions + cross-capability composition + open questions.
- `tasks.md` — Spec deltas + validation gates + follow-up changes.
- `specs/<capability>/spec.md` — The frozen ADDED Requirements with scenarios.

---

## Document maintenance

This file is updated when a migration completes and surfaces a **new** pattern
worth canonising (or when an antipattern recurs across changes). When you
update it:

- Add the pattern with a worked example (legacy smell → rule → example).
- Mention which migration's archived `design.md` is the reference.
- Update the "validated by" header at the top.

The file is **not** updated for one-off tactical decisions; those live in
the per-change `design.md`.
