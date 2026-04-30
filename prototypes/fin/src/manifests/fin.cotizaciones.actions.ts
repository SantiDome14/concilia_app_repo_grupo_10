// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Cotizaciones (record `quote`)
// ────────────────────────────────────────────────────────────────────
// Quotes are originated by TRD; FIN owns the documentation lifecycle
// (`fin.facturaState`: pendiente → facturada / no-req) and the
// governance side (cancel before execution).
//
// Kanban: axis `fin.facturaState` declares dimension `documentacion`.
// Unlike the Movimientos kanban, drop-targets in Quotes open the
// specific action that produces that state (Generar Factura → facturada,
// Marcar No Facturable → no-req); the page's transition handler picks
// which action to open.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const FIN_COTIZACIONES_MANIFEST_KEY = 'fin.cotizaciones' as const;

export const FIN_COTIZACIONES_MANIFEST: Manifest = {
  app: 'fin',
  module: 'cotizaciones',
  record_type: 'quote',
  scope: 'record',
  schema_version: '1',

  kanban_axes: [
    {
      axis_id: 'fin.facturaState',
      dimension: 'documentacion',
      drop_target_state: 'facturada',
      states: ['pendiente', 'facturada', 'no-req'],
    },
  ],

  actions: [
    {
      id: 'fin.cotizaciones.documentacion.generar_factura',
      dimension: 'documentacion',
      label: 'Generar Factura',
      description: 'Emite la factura del quote ejecutado.',
      icon: 'document-add',
      target_field: 'fin.factura',
      show_when: { field_in: { field: 'status', values: ['executed', 'settled'] } },
      enable_when: {
        all: [
          { field_is_null: 'fin.factura' },
          { field_equals: { field: 'fin.facturaState', value: 'pendiente' } },
        ],
      },
      disable_reason:
        'El quote ya tiene factura emitida o está marcado como no facturable',
      disable_tag: 'Emitida',
      capabilities: {
        required_role_any_of: ['ANALISTA_CONTABLE', 'ADMIN_FIN', 'ADMIN'],
      },
      dialog: {
        title: 'Generar factura',
        description: 'Emití la factura asociada al quote ejecutado.',
        fields: [
          {
            id: 'fin.factura_concepto',
            label: 'Concepto',
            type: 'textarea',
            required: true,
            max_length: 280,
            placeholder: 'Concepto que figura en la factura...',
          },
        ],
        confirm_label: 'Emitir factura',
      },
      on_confirm: {
        update_fields: ['fin.factura_concepto'],
        set_fields: { 'fin.facturaState': 'facturada', 'fin.fact_at': '$now' },
        audit: true,
        toast: 'Factura emitida',
      },
    },

    {
      id: 'fin.cotizaciones.documentacion.marcar_no_facturable',
      dimension: 'documentacion',
      label: 'Marcar como No facturable',
      description: 'Marca el quote como no facturable con motivo.',
      icon: 'x-circle',
      target_field: 'fin.facturaState',
      show_when: { field_in: { field: 'status', values: ['executed', 'settled'] } },
      enable_when: {
        field_equals: { field: 'fin.facturaState', value: 'pendiente' },
      },
      disable_reason: 'El quote ya tiene un estado de facturación distinto de pendiente',
      disable_tag: 'Resuelto',
      capabilities: {
        required_role_any_of: ['ANALISTA_CONTABLE', 'ADMIN_FIN', 'ADMIN'],
      },
      dialog: {
        title: 'Marcar como no facturable',
        description:
          'Indicá el motivo por el cual este quote no se factura. La decisión queda registrada en el audit log.',
        fields: [
          {
            id: 'fin.no_factura_motivo',
            label: 'Motivo',
            type: 'textarea',
            required: true,
            max_length: 500,
            placeholder: 'Razón por la cual el quote no se factura...',
          },
        ],
        confirm_label: 'Marcar no facturable',
      },
      on_confirm: {
        update_fields: ['fin.no_factura_motivo'],
        set_fields: { 'fin.facturaState': 'no-req' },
        audit: true,
        toast: 'Quote marcado como no facturable',
      },
    },

    {
      id: 'fin.cotizaciones.governance.recotizar',
      dimension: 'governance',
      label: 'Re-cotizar',
      description: 'Genera una nueva oferta sobre el mismo pedido del cliente.',
      icon: 'refresh',
      target_field: 'fin.recotizado_at',
      show_when: { field_in: { field: 'status', values: ['pending', 'offered'] } },
      // The "_never" sentinel guarantees this action never enables in
      // v1; the manifest still ships it so the disabled chip appears
      // in the menu with the V2 tag.
      enable_when: { field_equals: { field: '_never', value: true } },
      disable_reason: 'Funcionalidad planificada para la próxima versión',
      disable_tag: 'V2',
      capabilities: {
        required_role_any_of: ['TRADER', 'ADMIN_TRD', 'ADMIN'],
      },
      dialog: {
        title: 'Re-cotizar',
        fields: [
          {
            id: 'fin.nuevo_spread',
            label: 'Nuevo spread (bps)',
            type: 'number',
            required: true,
            min: 0,
          },
        ],
      },
      on_confirm: {
        update_fields: ['fin.recotizado_at', 'fin.nuevo_spread'],
        audit: true,
        toast: 'Quote re-cotizado',
      },
    },

    {
      id: 'fin.cotizaciones.governance.anular_quote',
      dimension: 'governance',
      label: 'Anular Quote',
      description: 'Anula el quote antes de su ejecución.',
      icon: 'x',
      danger: true,
      target_field: 'fin.anulado_at',
      show_when: { field_in: { field: 'status', values: ['pending', 'offered'] } },
      enable_when: { field_is_null: 'fin.anulado_at' },
      disable_reason: 'El quote no puede anularse en su estado actual',
      disable_tag: 'Estado',
      capabilities: {
        required_role_any_of: ['TRADER', 'ADMIN_TRD', 'ADMIN'],
      },
      dialog: {
        title: 'Anular Quote',
        description: 'Esta acción anula el quote. No se puede deshacer.',
        fields: [
          {
            id: 'fin.anulacion_motivo',
            label: 'Motivo de anulación',
            type: 'textarea',
            required: true,
            max_length: 500,
          },
        ],
        confirm_label: 'Anular',
      },
      on_confirm: {
        update_fields: ['fin.anulacion_motivo'],
        set_fields: { status: 'cancelled', 'fin.anulado_at': '$now' },
        audit: true,
        toast: 'Quote anulado',
      },
    },
  ],
};
