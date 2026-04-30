// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Tesorería · Cola de Asignación (record `retiro_cola`)
// ────────────────────────────────────────────────────────────────────
// Single contextual action per row: "Asignar Cuenta de Origen". The
// account catalog is filtered by the row's `moneda` so only matching
// accounts are listed. Confirming moves the row out of the queue and
// into the ledger.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY =
  'fin.tesoreria.cola_asignacion' as const;

export const FIN_TESORERIA_COLA_ASIGNACION_MANIFEST: Manifest = {
  app: 'fin',
  module: 'tesoreria',
  record_type: 'retiro_cola',
  scope: 'record',
  schema_version: '1',

  required_imputations: ['cuenta_id'],

  actions: [
    {
      id: 'fin.tesoreria.cola_asignacion.imputacion.asignar_cuenta_origen',
      dimension: 'imputacion',
      label: 'Asignar Cuenta de Origen',
      description:
        'Imputá el retiro a una cuenta física de la sociedad. Al confirmar, el retiro sale de la Cola y entra al ledger.',
      icon: 'credit-card',
      target_field: 'cuenta_id',
      enable_when: { field_is_null: 'cuenta_id' },
      disable_reason: 'El retiro ya tiene cuenta asignada',
      disable_tag: 'Asignada',
      capabilities: {
        required_role_any_of: ['OPS_OFFICER', 'ADMIN_OPS', 'ADMIN_FIN', 'ADMIN'],
      },
      dialog: {
        title: 'Asignar Cuenta de Origen',
        description:
          'Elegí la cuenta física desde la cual se ejecutó el retiro. La lista se filtra por la moneda del retiro.',
        fields: [
          {
            id: 'cuenta_id',
            label: 'Cuenta',
            type: 'lookup',
            catalog: 'ops.catalogo_cuentas',
            required: true,
            catalog_filter: { field: 'moneda', from_record: 'moneda' },
            placeholder: 'Buscar cuenta...',
            hint: 'Solo se listan cuentas con moneda compatible con el retiro.',
          },
          {
            id: 'asignacion_note',
            label: 'Nota (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Confirmar asignación',
      },
      on_confirm: {
        update_fields: ['cuenta_id', 'asignacion_note'],
        audit: true,
        toast: 'Cuenta asignada · retiro movido al ledger',
      },
    },
  ],
};
