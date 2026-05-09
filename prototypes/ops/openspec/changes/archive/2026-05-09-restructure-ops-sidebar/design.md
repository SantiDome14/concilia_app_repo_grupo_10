## Context

The OPS sidebar today exposes two blocks — `Operaciones` (Clientes / Movimientos / Cotizaciones / PSP) and `Configuración` (Instrucciones). The `Operaciones` block is overloaded: it conflates three distinct domain concerns:

1. **Day-to-day operational surfaces** that an operator works against constantly (Movimientos, Cotizaciones).
2. **Custody surfaces** where Ardua's funds physically live with a third-party PSP (PSP).
3. **Master-data catalogs** that define the entities other surfaces consume (Clientes, plus the upcoming `Bancos / Cuentas`).

The thin `Configuración` block, in turn, holds a single catalog-shaped module (Instrucciones) under a label that suggests system / app settings rather than business reference data. This makes the imminent `Bancos / Cuentas` module — a pure catalog with accounting metadata — impossible to place coherently: it does not fit in `Operaciones` (not an operational surface), and forcing it into `Configuración` would compound the misnomer.

The current sidebar wiring lives in two coupled places:

- `prototypes/ops/src/components/layout/Sidebar.vue` — declares a `blocks` array (`label`, `items: { to, name, label, icon }[]`) consumed at render time.
- `prototypes/ops/src/router/routes.ts` — each route declares `meta.block` matching one of the sidebar block labels. The Topbar breadcrumb concatenates `meta.block / meta.breadcrumb`.

Three OPS specs (`ops-clients`, `ops-psp`, `ops-instructions`) name their parent block literally inside Scenarios, so the change is contractual, not just visual.

## Goals / Non-Goals

**Goals:**

- Express the OPS domain as three semantically distinct blocks: `Operaciones`, `Custodia`, `Catálogos`.
- Place existing modules under the block that matches their nature, with **no URL changes** so external links and bookmarks survive.
- Leave a clean slot for the upcoming `Bancos / Cuentas` module (under `Catálogos`) without requiring a second sidebar reshuffle.
- Keep the change reviewable on its own and mergeable independently of the new module.

**Non-Goals:**

- Adding the `Bancos / Cuentas` module — that is its own change (`add-ops-banks-accounts`).
- Changing the per-block icon convention or introducing per-block icons (today blocks have no icon, only a section label; we keep it that way).
- Touching the sidebar order of the cross-cutting generics (Dashboard / Inbox / Alertas / Reportes) — those are governed by `core-modulo-genericos` and stay flat at the top, untouched.
- Adding capability gating on the new `Custodia` block (PSP already gates itself; the block is a visual container, not a guard surface).
- Touching `core-navigation` or `core-layout` — block names are app-level decisions, not core contracts.

## Decisions

### Decision 1: Rename `Configuración` → `Catálogos` in place (do not delete + create)

**Choice:** rewrite the existing block label from `Configuración` to `Catálogos`. Move `Instrucciones` along with the rename (it already lives there).

**Why:** the block is functionally the same set — a catalog-shaped surface that holds master-data modules. A delete + create would be larger churn (more spec deltas, more diff in `Sidebar.vue`) for the same end state. Renaming preserves git blame and makes the diff trivially reviewable.

**Alternatives considered:**

- *Delete `Configuración`, create `Catálogos` from scratch.* Rejected — produces a noisier diff and gains nothing.
- *Keep `Configuración` and add a parallel `Catálogos`.* Rejected — leaves `Configuración` with the single `Instrucciones` entry, perpetuating the misnomer; defeats the purpose of the change.

### Decision 2: Block order — `Operaciones` → `Custodia` → `Catálogos`

**Choice:** the three blocks render in this exact order, top to bottom, after the cross-cutting generics.

**Why:** mirrors the operator's mental flow — first the surfaces they work against daily (`Operaciones`), then where the funds live (`Custodia`), then the reference data they configure occasionally (`Catálogos`). Catalogs are deliberately last because operators visit them less frequently than operational surfaces.

**Alternatives considered:**

- *`Catálogos` first.* Rejected — surfaces master data ahead of daily-use surfaces, which inverts perceived priority.
- *Alphabetical.* Rejected — orderings driven by label spelling have no semantic value and would re-shuffle whenever a label is renamed.

### Decision 3: `meta.block` value matches the visible label exactly

**Choice:** keep the current convention where `meta.block` is the literal block label string used in the sidebar (e.g. `'Catálogos'`, `'Custodia'`). Do not introduce a separate machine key.

**Why:** the current `Sidebar.vue` and breadcrumb logic already consume the label directly. Introducing a separate key (e.g. `meta.blockKey: 'catalogs'` mapped via i18n) is out of scope for this change and would couple to a future i18n decision that is not on the table. When `vue-i18n` is enabled per app, the label translation is a follow-up concern, not a blocker for this restructure.

**Alternatives considered:**

- *`meta.block` as a key + a label dictionary.* Rejected for now — premature decoupling, no consumer needs it yet.

### Decision 4: Spell `Catálogos` with the accent (strict Spanish orthography)

**Choice:** the user-facing label is `Catálogos`, with the accent on the first `a`.

**Why:** user-facing Spanish strings in this project follow strict Spanish orthography — preserve accents and `ñ`. The existing sidebar already has `Configuración` accented; `Catálogos` is consistent with that convention. ASCII-friendly variants are not used.

**Alternatives considered:**

- *`Catalogos` (no accent).* Rejected — drops the accent for no gain; inconsistent with the rest of the UI.

### Decision 5: No URL redirects, no route renames

**Choice:** all five affected routes (`/clients`, `/psp`, `/instructions`, `/movimientos`, `/cotizaciones`) keep their paths exactly as-is.

**Why:** URLs are not derived from the block label. They are owned by the per-module specs (`ops-*`) and follow English module names regardless of the visual block they sit under. Changing them would break bookmarks and external links for zero gain.

## Risks / Trade-offs

- **Breadcrumbs change for affected routes** → confirmed expected behavior. The breadcrumb is derived from `meta.block / meta.breadcrumb`, so e.g. `Operaciones / Clientes` becomes `Catálogos / Clientes` on next deploy. Mitigation: flag in the release note so operators are not surprised.
- **Test fixtures that hardcode the old block names** → any unit/e2e test that does `expect(...).toContain('Operaciones')` for Clientes/PSP/Instrucciones will break. Mitigation: tasks.md walks the affected test files; CI catches anything missed.
- **Documentation drift** → screenshots in operator-facing docs (if any exist outside this repo) showing the old sidebar layout will be stale. Mitigation: out of scope for this code change; flag in the release note.

## Open Questions

- **Do operator-facing docs need a screenshot refresh?** Out of scope for this code change; flag in the release note for whoever owns docs.
