## ADDED Requirements

### Requirement: ModuleCTA MUST support an optional `variant` field for visual hierarchy

The `ModuleCTA` interface SHALL declare an optional `variant?: 'primary' | 'secondary'` field. When unspecified, the variant defaults to `'primary'`. `<ManifestModuleCTAs>` SHALL forward the variant to the underlying `<Button>` component via the `variant` prop. The cap-of-3 visible CTAs rule continues to apply regardless of variant.

`variant: 'primary'` SHALL render the canonical brand-colored primary button (the default styling that already applies to module CTAs today). `variant: 'secondary'` SHALL render with the secondary `<Button>` appearance — visually subordinated to a primary on the same page header. Manifest authors MAY mix primary and secondary CTAs within the same `module_ctas[]` array.

The variant SHALL NOT affect:
- The CTA's ordering in the inline / overflow split (cap-of-3 still applies positionally).
- The capability gate (`evalCapabilities()` still filters before rendering).
- The dialog rendering path (`<ManifestDialog>` in `mode: 'cta'`).
- The creator dispatch flow when `creates_record_type` is set.

The variant SHALL be persisted in the audit log entry as `cta.variant` so downstream telemetry can attribute operator preference between primary and secondary actions.

#### Scenario: Default variant is primary

- **GIVEN** a `module_cta` declares `{ id: '...', label: 'Crear X' }` without a `variant` field
- **WHEN** `<ManifestModuleCTAs>` renders the CTA
- **THEN** the `<Button>` is mounted with `variant="primary"` (the canonical brand-colored button)

#### Scenario: Explicit secondary variant renders the secondary button styling

- **GIVEN** a `module_cta` declares `{ id: 'crear_banco', label: 'Crear nuevo Banco/Estructura', variant: 'secondary', ... }`
- **WHEN** `<ManifestModuleCTAs>` renders the CTA
- **THEN** the `<Button>` is mounted with `variant="secondary"` and renders with the secondary appearance (less prominent than a sibling primary)

#### Scenario: Primary and secondary CTAs coexist in the same header

- **GIVEN** a manifest declares two `module_ctas[]`: one with `variant: 'primary'` (Crear nueva Cuenta) and one with `variant: 'secondary'` (Crear nuevo Banco/Estructura)
- **WHEN** the page header renders the CTAs
- **THEN** the primary button uses the brand-colored appearance
- **AND** the secondary button uses the secondary appearance
- **AND** both render inline (no overflow) as long as the total CTA count is ≤ `maxVisible` (default 3)

#### Scenario: Variant is included in the cta-kind audit entry

- **GIVEN** an operator confirms a CTA with `variant: 'secondary'` and a registered creator
- **WHEN** the apply path runs successfully
- **THEN** `useAuditLog().append({ kind: 'cta', action_id, manifest_key, record_id, created_record_type, is_module_cta: true, cta_variant: 'secondary', ... })` is called once
