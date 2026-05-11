# Tasks — remove-segmentation-pattern

The Vue implementation already lands the new behavior (`Inbox.vue` and `Alertas.vue` no longer mount a `<Segmenter>`; `Reportes.vue` moved its tabs below the header and renamed Histórico → Ejecución; tests updated). This change is the contract catch-up.

## 1. Spec deltas

- [ ] `specs/core-layout/spec.md` — REMOVED Requirement: `L1 segmentation MUST be expressed via a `<Segmenter>` component in the page header actions area`
- [ ] `specs/core-layout/spec.md` — MODIFIED Requirement: `Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)` → renamed and reframed as `Pages MUST place controls per the two-level framework (Vista / Filtros)`
- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement: `Inbox houses Solicitudes; the canonical TS identifier MUST be `Solicitud`` — drop segmentation clause + scenario
- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement: `Reportes MUST split Catálogo / Histórico via segmentation; each segment has its own shape, filters, and columns` → renamed to `Reportes MUST split Catálogo / Ejecución via the Type B Tabs pattern; each tab has its own shape, filters, and columns`
- [ ] `specs/core-modulo-genericos/spec.md` — MODIFIED Requirement: `Reports MAY emit REPORT_DEPENDENCY events; destination Alertas MUST consume them as `profile: 'A'`` — drop "moves the Alerta from Nuevas to Histórico" wording

## 2. Validation gates

- [ ] Run `openspec validate remove-segmentation-pattern --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the deltas are applied
- [ ] Confirm the Vue implementation matches the new spec — `npm run type-check` and `npm run test:run` still pass

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive remove-segmentation-pattern`
- [ ] Confirm the CLI applies the deltas into the baseline and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-remove-segmentation-pattern/`
- [ ] Final commit with conventional message: `feat(specs): remove segmentation primitive — Inbox/Alertas use only L3 Estado filter; Reportes uses Type B Tabs (Catálogo / Ejecución)`
