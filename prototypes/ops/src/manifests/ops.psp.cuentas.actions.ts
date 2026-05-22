// ════════════════════════════════════════════════════════════════════
// ops.psp.cuentas — actions manifest for the PSP Cuentas tab
// ────────────────────────────────────────────────────────────────────
// Per-row actions:
//   - ver_movimientos — navigates to the Movimientos tab with the
//                       Cliente filter pre-set to the row's owner.
//                       Dispatcher intercepts the `_action` marker
//                       and fires the cross-tab navigation.
//
// Module CTAs:
//   - crear_cuenta    — primary Main CTA on the Cuentas tab. Opens a
//                       dialog with Partner + CBU + Cliente + Moneda
//                       + Tipo cuenta + Nro de cuenta. The page-side
//                       creator wires it to POST /accounts.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_PSP_CUENTAS_MANIFEST_KEY = 'ops.psp.cuentas' as const;

export const OPS_PSP_CUENTAS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'psp.cuentas',
  scope: 'module',
  schema_version: '1',
  module_ctas: [
    {
      id: 'psp.cuentas.crear',
      dimension: 'governance',
      label: 'Crear Cuenta',
      description: 'Da de alta una nueva CVU bajo un CBU-padre del partner.',
      icon: 'plus',
      is_module_cta: true,
      variant: 'primary',
      creates_record_concept: 'psp_account',
      dialog: {
        title: 'Crear Cuenta',
        description: 'Las CVU se crean bajo un CBU-padre de un partner.',
        fields: [
          {
            id: 'sponsor',
            label: 'Partner',
            type: 'lookup',
            catalog: 'ops.psp.sponsors',
            required: true,
            placeholder: 'Elegí el partner…',
          },
          {
            id: 'parent_cbu_id',
            label: 'CBU padre',
            type: 'lookup',
            catalog: 'ops.psp.cbus',
            catalog_filter: { field: 'sponsor', from_form: 'sponsor' },
            required: true,
            placeholder: 'Elegí el CBU padre…',
            hint: 'Filtrado por partner — si cambiás el partner el listado se resetea.',
          },
          {
            id: 'owner',
            label: 'Cliente',
            type: 'text',
            required: true,
            placeholder: 'Razón social o nombre del cliente',
          },
          {
            id: 'account_number',
            label: 'Nro. de cuenta',
            type: 'text',
            required: true,
            placeholder: 'CVU del cliente (22 dígitos)',
          },
          {
            id: 'currency',
            label: 'Moneda',
            type: 'select',
            required: true,
            default: 'ARS',
            // PSP solo opera ARS por el momento — operator review
            // 2026-05-22. Otras monedas se sumarán cuando los partners
            // habiliten CVUs en USD / USDC / USDT.
            options: [{ value: 'ARS', label: 'ARS' }],
          },
          {
            id: 'alias',
            label: 'Alias (opcional)',
            type: 'text',
            required: false,
            placeholder: 'Ej: monti123',
          },
        ],
        confirm_label: 'Crear cuenta',
      },
      on_confirm: {
        update_fields: [
          'sponsor',
          'parent_cbu_id',
          'owner',
          'account_number',
          'currency',
          'alias',
        ],
        audit: true,
        toast: 'Cuenta creada',
      },
    },
  ],
  actions: [
    {
      id: 'psp.cuentas.ver_movimientos',
      dimension: 'governance',
      label: 'Ver movimientos',
      description:
        'Filtra el ledger de Movimientos por el cliente de esta cuenta.',
      icon: 'arrow-right',
      enable_when: { field_is_not_null: 'owner' },
      disable_reason: 'La cuenta no tiene cliente asignado',
      disable_tag: 'Imputación',
      dialog: {
        title: 'Ver movimientos del cliente',
        description: '{record.owner} · {record.account_number}',
        info_banner: {
          variant: 'info',
          text: 'Salto a la pestaña Movimientos con el filtro Cliente aplicado al owner de esta cuenta.',
        },
        fields: [],
        confirm_label: 'Ver movimientos',
      },
      on_confirm: {
        set_fields: { _action: 'ver_movimientos' },
        audit: true,
        toast: 'Mostrando movimientos del cliente',
      },
    },
  ],
};
