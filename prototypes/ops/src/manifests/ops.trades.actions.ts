// ════════════════════════════════════════════════════════════════════
// ops.trades — actions manifest
// ────────────────────────────────────────────────────────────────────
// Quotes are accepted by TRD's Mesa de Dinero BEFORE they reach OPS —
// what hits this page is effectively a settlement request, not a
// pending negotiation. So OPS does NOT toggle PENDING→ACCEPTED nor
// reject quotes; the lifecycle owned here is the two-leg settlement.
//
// Two per-row actions cover the OPS scope:
//
//   - confirmar_origen   — registers that the lado-origen leg landed
//                          (external deposit received OR internal
//                          debit from the client's Ardua account)
//
//   - confirmar_destino  — same, for the lado-destino leg
//                          (external transfer sent OR internal credit
//                          to the client's Ardua account)
//
// The two "confirmar" labels are intentionally generic ("lado origen
// / lado destino") because in many cases the funds already sit in
// the client's Ardua accounts — there is no external send/receive,
// just an internal accounting move. Operator review 2026-05-22.
//
// No explicit "Liquidar" action. OPS records the two operational legs
// via these two actions; the COMPLETED status transition is a DERIVED
// rule owned by OPS — once both `leg_*_confirmed` flags land on `true`
// and the quote was ACCEPTED, the backend auto-transitions `status` to
// COMPLETED (mirrored optimistically on the client cache to avoid a
// "leg=true, status=ACCEPTED" flash). Operator review 2026-05-22.
//
// No module_ctas: OPS does not originate quotes.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_TRADES_MANIFEST_KEY = 'ops.trades' as const;

export const OPS_TRADES_MANIFEST: Manifest = {
  app: 'ops',
  module: 'trades',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'trades.confirmar_origen',
      dimension: 'imputacion',
      label: 'Confirmar fondos lado origen',
      description:
        'Registra que la pierna del lado origen fue ejecutada (recepción externa o débito interno de la cuenta del cliente en Ardua).',
      icon: 'arrow-down-circle',
      target_field: 'leg_origen_confirmed',
      enable_when: {
        all: [
          { field_equals: { field: 'status', value: 'ACCEPTED' } },
          { field_equals: { field: 'leg_origen_confirmed', value: false } },
        ],
      },
      disable_reason: 'La cotización debe estar ACCEPTED y aún sin confirmar el lado origen',
      disable_tag: 'Estado',
      dialog: {
        title: 'Confirmar fondos lado origen',
        description: '{record.id} · {record.client_name}',
        info_banner: {
          variant: 'info',
          text: 'Se deja constancia operativa de que la pierna lado origen fue ejecutada. No requiere transferencia externa cuando los fondos ya están en Ardua.',
        },
        fields: [
          {
            id: 'origen_note',
            label: 'Referencia / observación (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
            placeholder: 'Número de transferencia, banco / cuenta, observaciones…',
          },
        ],
        confirm_label: 'Confirmar lado origen',
      },
      on_confirm: {
        update_fields: ['origen_note'],
        set_fields: { leg_origen_confirmed: true },
        audit: true,
        toast: 'Lado origen confirmado',
      },
    },
    {
      id: 'trades.confirmar_destino',
      dimension: 'imputacion',
      label: 'Confirmar fondos lado destino',
      description:
        'Registra que la pierna del lado destino fue ejecutada (envío externo o crédito interno a la cuenta del cliente en Ardua).',
      icon: 'arrow-up-circle',
      target_field: 'leg_destino_confirmed',
      enable_when: {
        all: [
          { field_equals: { field: 'status', value: 'ACCEPTED' } },
          { field_equals: { field: 'leg_destino_confirmed', value: false } },
        ],
      },
      disable_reason: 'La cotización debe estar ACCEPTED y aún sin confirmar el lado destino',
      disable_tag: 'Estado',
      dialog: {
        title: 'Confirmar fondos lado destino',
        description: '{record.id} · {record.client_name}',
        info_banner: {
          variant: 'info',
          text: 'Se deja constancia operativa de que la pierna lado destino fue ejecutada. No requiere transferencia externa cuando los fondos quedan en Ardua.',
        },
        fields: [
          {
            id: 'destino_note',
            label: 'Referencia / observación (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
            placeholder: 'Número de transferencia, banco / cuenta, observaciones…',
          },
        ],
        confirm_label: 'Confirmar lado destino',
      },
      on_confirm: {
        update_fields: ['destino_note'],
        set_fields: { leg_destino_confirmed: true },
        audit: true,
        toast: 'Lado destino confirmado',
      },
    },
  ],
};
