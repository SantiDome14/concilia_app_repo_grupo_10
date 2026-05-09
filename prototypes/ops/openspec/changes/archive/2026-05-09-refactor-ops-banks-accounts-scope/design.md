## Context

Ardua's backoffice is a multi-app product. The four current/upcoming apps own distinct concerns: `lex` (legal + compliance + canonical client register), `trd` (mesa de trading), `ops` (operaciones) and the upcoming `fin` (finanzas + contabilidad). The apps share registers — a piece of data lives in exactly one app and is consumed by the others through APIs. The most common shared registers today are:

- **Cliente register** — owned by `lex`. Consumed by `ops` (account creation), `trd` (cotizaciones, bps).
- **Bancos / Cuentas register** — owned by `ops`. Will be consumed by `fin` (accounting mapping).

When `ops-banks-accounts` was first proposed, FIN did not exist yet as an app. The pragmatic move was to capture the accounting code preparatorily inside OPS so operators could start populating it and an eventual FIN backend could pick the data up. That decision was explicit (Decision 4 of `add-ops-banks-accounts`'s `design.md`) and documented via a persistent "preparatorio" notice.

That tradeoff has now expired. FIN is going to be its own app with its own surfaces. The right home for the accounting concerns is FIN — keeping them under OPS:

1. Splits responsibility for one user-flow ("set the accounting code on a cuenta") across two apps and confuses operators about who to ask.
2. Forces OPS to maintain a `contable` field that has no operational meaning inside OPS itself (Movimientos / Cotizaciones / PSP do not read it).
3. Blocks FIN from being able to design its own surface around the same data without first un-doing OPS-side scaffolding.

This change deliberately **shrinks** the OPS module and **completes** the deferred Edit-Account flow that was tagged `V2` at creation. Both halves ship together because the Actions menu becomes empty after the accounting item leaves — keeping a menu with a single V2-disabled placeholder is worse UX than just shipping the Edit flow now.

## Goals / Non-Goals

**Goals:**

- Eliminate every accounting-flavoured surface from `ops-banks-accounts` (KPI cards, column, filter, notice, menu item, modal, API endpoint, types, schemas, tests).
- Activate the `Editar datos` Actions menu item with a working Edit-Account modal so the per-row menu is not a single-disabled-button placeholder after the accounting item leaves.
- Keep the OPS data shape stable for the upcoming FIN consumer: `Sociedad → Estructura → Cuenta` is unchanged, only the optional `Cuenta.contable` field drops.
- Make the spec change reviewable in one pass: clearly REMOVED Requirements (with reasons + migration), clearly ADDED Requirements, MODIFIED only where contracts truly need a body change.

**Non-Goals:**

- Standing up the `fin` app or its accounting-mapping surface — that is a separate proposal in a future repo or app namespace.
- Migrating existing operator-entered `contable` rows into FIN's eventual storage. This is a one-time operational task owned by whoever stands up FIN; it is outside this code change.
- Adding a "Crear Sociedad" or "Eliminar cuenta" CTA — both still V2. The Edit modal's `status` field already supports deactivation, which is the safer alternative to a hard delete in a financial register.
- Wiring Movimientos / PSP / TRD to consume the catalog as their dropdown source — also separate follow-up changes.
- Restructuring the `Sociedad` register into a separate capability — `ops-banks-accounts` still owns it for now (open question carried over from the original `add-ops-banks-accounts` design).

## Decisions

### Decision 1: REMOVE + ADD instead of MODIFY for requirements whose titles encode the count

**Choice:** the Requirements whose titles literally state a count (`exactly 4 KPI cards`, `5 select filters`, `9 columns`, `Configurar cuenta contable (active) and Editar datos (V2-disabled)`) are REMOVED and replaced with new ADDED Requirements whose titles match the post-change shape. The Configure-Accounting-modal and preparatory-notice Requirements are pure REMOVED (no replacement).

**Why:** OpenSpec's MODIFIED operation matches the existing requirement by title. Changing the title (e.g., `4` → `2`) inside a MODIFIED block silently fails to find the original. The validator would either reject the delta or apply it incorrectly. The cleanest, least-error-prone path is REMOVE-with-Reason + ADD a new Requirement whose title accurately describes the post-change behaviour.

**Alternatives considered:**

- *Keep the original titles ("4 KPI cards", etc.) and MODIFY only the body.* Rejected — leaves the spec with stale, lying titles. Anyone scanning the spec headlines without reading the body would assume the page still has 4 KPI cards.
- *Use RENAMED Requirements to change the title, then MODIFY to change the body.* Rejected — RENAMED is documented as "Name changes only", so chaining a rename + modify is undocumented behaviour. Direct REMOVE + ADD is clearer to reviewers and to OpenSpec itself.

### Decision 2: Sociedad and Estructura are read-only inside the Edit-Account modal

**Choice:** the new Edit-Account modal lets the operator edit `tipoCuenta`, `moneda`, `nro`, `padreCuentaId`, and `status`. It explicitly **does not** allow changing `sociedadId` or `estructuraId`.

**Why:** in a financial register, changing the Sociedad or Estructura of an existing cuenta is semantically a different cuenta — the audit trail of past Movimientos / Cotizaciones / PSP transactions tied to that cuenta would silently rewrite their Sociedad/Estructura. The safer flow is "deactivate + create new". Edit is for fixing typos in the cuenta's number, correcting the operational tipo, or wiring a parent CBU after the fact — not for re-keying who owns the cuenta or where it lives.

**Alternatives considered:**

- *Allow changing Sociedad and Estructura via Edit.* Rejected — invites silent audit-trail rewrites, against financial-register hygiene.
- *Block Edit entirely and force "deactivate + recreate" for every change.* Rejected — too rigid for the common case of fixing a typo on `nro`. The current choice is the correct middle ground.

### Decision 3: `status` toggle inside Edit replaces a separate "Eliminar cuenta" flow

**Choice:** the Edit-Account modal exposes `status: 'Activa' | 'Inactiva'` as a `<Select>`. Setting it to `Inactiva` is the canonical way to retire a cuenta from operational use. There is no separate `Eliminar cuenta` action in v1.

**Why:** financial registers should not hard-delete records — historical Movimientos must keep their FK reference even after a cuenta is retired. Soft-delete via `status` covers the common operator need ("we closed account 10.045 last month, please retire it") without losing audit history.

**Alternatives considered:**

- *Add a separate "Eliminar cuenta" destructive action.* Rejected — a hard delete that preserves history is essentially a soft delete with a different label; renaming the affordance does not justify a second flow.
- *Leave status uneditable in v1 and ship a dedicated "Retirar cuenta" CTA later.* Rejected — punts the deactivation use case unnecessarily; the Edit modal is already the right surface.

### Decision 4: Edit-Account API is `PATCH /api/banks-accounts/:id` (full-cuenta patch, not granular)

**Choice:** the new endpoint accepts the entire editable payload (`tipoCuenta`, `moneda`, `nro`, `padreCuentaId`, `status`) in one PATCH. The client always sends all five fields; the backend is free to no-op fields that did not change.

**Why:** keeps the client + server contract simple. Only one endpoint, one zod schema, one mutation hook. Granular per-field PATCH endpoints (`PATCH /api/banks-accounts/:id/status`, `PATCH /api/banks-accounts/:id/nro`, etc.) would multiply the surface for marginal gain — the form already validates the whole payload before submission.

**Alternatives considered:**

- *Granular per-field PATCH endpoints.* Rejected — over-engineering for a 5-field form.
- *PUT replaces the whole record.* Rejected — semantically a PUT on a partial body would imply Sociedad/Estructura/contable can be set, which is the opposite of what we want. PATCH with a strict zod-validated body is more correct.

### Decision 5: Capability gating uses `banks-accounts:edit-account` (not `banks-accounts:write`)

**Choice:** the Edit-Account action is gated by `banks-accounts:edit-account || OPS_ADMIN`. We keep distinct capabilities for `create-structure`, `create-account`, and `edit-account` rather than collapsing them into a generic `write` capability.

**Why:** the three actions have different blast radiuses (creating a new Estructura affects future cuentas; creating a Cuenta affects one row; editing affects one existing row). Distinct gates let the eventual `ops-roles` capability surface assign them granularly. Collapsing now would lock in a coarse permission grain that's harder to refine later.

**Alternatives considered:**

- *Single `banks-accounts:write` capability for all three actions.* Rejected — coarser than the current convention, harder to refine later.

### Decision 6: Sociedad / Estructura badges, Tipo / Moneda chips, and the `Cuenta padre` em-dash all stay

**Choice:** the visual contract for the surviving 8 columns is unchanged from `add-ops-banks-accounts`. Only the `Cuenta contable` column (column 9) drops; everything else keeps its tone, font, and chip behaviour.

**Why:** stripping accounting concerns shouldn't reshuffle the rest of the table. Operators who learned the catalog's visual language under v1 should see the same language minus the contable column.

## Risks / Trade-offs

- **Existing operator-entered `contable` data will not be visible after this change.** Mitigation: the OPS API stops returning `contable`, but the backend storage may persist for FIN to pick up. If the data is critical to the operator's day-to-day, surfacing it temporarily under FIN (when FIN lands) is the only cure. Worst-case data is preserved on the backend even if not rendered.
- **The `Editar datos` flow is brand-new and not battle-tested.** Mitigation: the Edit modal is small (5 fields), zod-validated, and follows the same form pattern as Create. Component test covers preload + save dispatch.
- **Breaking spec change for any future tooling that listened to `ops-banks-accounts.contable`.** Mitigation: this is the first refactor of the spec; no consumers exist yet.
- **Possible backend mismatch.** If a FIN backend was already wired against `PATCH /api/banks-accounts/:id/accounting`, removing that endpoint will break it. Mitigation: this change ships with a coordinated backend release that ports the endpoint to FIN's namespace, or temporarily keeps the OPS-side endpoint as a deprecated 410-Gone shim. The exact backend coordination is a deployment concern, not in scope for this frontend change.

## Open Questions

- **Should the Sociedad register move out of `ops-banks-accounts` into its own capability?** Currently `Sociedad` is implicitly owned by this module via the `GET /banks-accounts/sociedades` endpoint. Cross-app consumers (FIN, future TRD) will need it. Whether it stays here or moves to a `core-shared-sociedades` capability is open. For this change, leave it in place — promotion is a separate proposal.
- **Where does the operator-entered `contable` data physically live during the transition?** OPS will stop reading and writing the field. Backend can either keep the column for FIN to pick up, or migrate the data into a FIN-namespaced table. This is a backend coordination question, not a frontend one.
- **Should `Editar datos` allow editing `Cuenta padre` to point at a cuenta in a different Sociedad?** Currently the field's options are filtered to the same Sociedad as the cuenta being edited. Default: keep the same-Sociedad filter for consistency with Create. Confirm before implementation.
