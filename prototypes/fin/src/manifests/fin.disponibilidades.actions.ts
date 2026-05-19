// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Disponibilidades (module-scope CTA)
// ────────────────────────────────────────────────────────────────────
// Module-scoped manifest declared per REQ-50 (`add-fin-disponibilidades`).
// Hosts the contextual Main CTA "Cargar movimiento manual" rendered
// when the active sub-tab is `Posición` or `Movimientos`. The Bancos /
// Cuentas sub-tab declares its own CTA ("Crear nueva Cuenta") in its
// own manifest `fin.disponibilidades.bancos_cuentas.actions.ts`.
//
// Active-sub-tab dispatch happens at the page level (Disponibilidades.vue
// renders <ManifestModuleCTAs> bound to the active sub-tab's manifest
// key per Decision documented in design.md of `add-fin-disponibilidades`).
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const FIN_DISPONIBILIDADES_MANIFEST_KEY = 'fin.disponibilidades' as const;

export const FIN_DISPONIBILIDADES_MANIFEST: Manifest = {
  app: 'fin',
  module: 'disponibilidades',
  record_type: null,
  scope: 'module',
  schema_version: '1',

  actions: [],

  module_ctas: [
    {
      id: 'fin.disponibilidades.movimientos.cargar_manual',
      dimension: 'governance',
      label: 'Cargar movimiento manual',
      description:
        'Cargá un movimiento manual (gasto administrativo, fee, ajuste, etc.). Si tu rol requiere supervisión, el movimiento queda pendiente hasta que otro usuario lo confirme.',
      icon: 'plus',
      is_module_cta: true,
      creates_record_type: 'movimiento',
      capabilities: {
        required_role_any_of: [
          'fin.disponibilidades.movimientos.cargar_directo',
          'fin.disponibilidades.movimientos.cargar_con_supervision',
        ],
      },
      dialog: {
        title: 'Cargar movimiento manual',
        description:
          'El movimiento se persiste en el ledger. Si tu capability es `cargar_con_supervision`, queda en pendiente_de_supervision y no impacta saldos hasta que un supervisor distinto lo confirme.',
        fields: [
          {
            id: 'sociedad_id',
            label: 'Sociedad',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
            placeholder: 'Elegí sociedad...',
          },
          {
            id: 'cuenta_id',
            label: 'Cuenta',
            type: 'lookup',
            catalog: 'fin.bancos_cuentas',
            required: true,
            catalog_filter: { field: 'sociedad_id', from_form: 'sociedad_id' },
            placeholder: 'Elegí cuenta (filtrada por sociedad y moneda)...',
          },
          {
            id: 'tipo',
            label: 'Tipo de movimiento',
            type: 'select',
            required: true,
            options: [
              { value: 'DEPOSIT', label: 'DEPOSIT (depósito)' },
              { value: 'WITHDRAWAL', label: 'WITHDRAWAL (retiro)' },
              { value: 'FEE', label: 'FEE (comisión)' },
              { value: 'TAX', label: 'TAX (impuesto)' },
              { value: 'REBATE', label: 'REBATE (rebate de partner)' },
              { value: 'ADDITION', label: 'ADDITION (ajuste interno)' },
              { value: 'TRANSFER_OUT', label: 'TRANSFER_OUT' },
              { value: 'TRANSFER_IN', label: 'TRANSFER_IN' },
              { value: 'SWAP_OUT', label: 'SWAP_OUT' },
              { value: 'SWAP_IN', label: 'SWAP_IN' },
              { value: 'COLLECTOR_IN', label: 'COLLECTOR_IN' },
              { value: 'COLLECTOR_OUT', label: 'COLLECTOR_OUT' },
            ],
          },
          { id: 'fecha', label: 'Fecha del movimiento', type: 'date', required: true },
          {
            id: 'monto',
            label: 'Monto',
            type: 'number',
            required: true,
            min: 0,
            placeholder: '0.00',
          },
          {
            id: 'moneda',
            label: 'Moneda',
            type: 'select',
            required: true,
            options: [
              { value: 'ARS', label: 'ARS' },
              { value: 'USD', label: 'USD' },
              { value: 'USDT', label: 'USDT' },
              { value: 'USDC', label: 'USDC' },
              { value: 'EUR', label: 'EUR' },
              { value: 'CAD', label: 'CAD' },
            ],
          },
          {
            id: 'cliente_id',
            label: 'Cliente (opcional al crear)',
            type: 'lookup',
            catalog: 'clp.clientes',
            required: false,
            placeholder: 'Buscar cliente o AS00000...',
            hint: 'Si no aplica un cliente externo, usá la Cuenta de Cliente de Ardua (AS00000).',
          },
          {
            id: 'motivo',
            label: 'Motivo',
            type: 'textarea',
            required: true,
            max_length: 500,
            placeholder: 'Justificación de la carga manual (mínimo 10 caracteres)...',
          },
          {
            id: 'referencia',
            label: 'Referencia externa (opcional)',
            type: 'text',
            required: false,
            placeholder: 'Hash on-chain, número de comprobante, etc.',
          },
        ],
        confirm_label: 'Cargar movimiento',
      },
      on_confirm: {
        update_fields: [
          'sociedad_id',
          'cuenta_id',
          'tipo',
          'fecha',
          'monto',
          'moneda',
          'cliente_id',
          'motivo',
          'referencia',
        ],
        audit: true,
        toast: 'Movimiento cargado',
      },
    },
  ],
};
