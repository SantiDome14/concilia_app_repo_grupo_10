// ════════════════════════════════════════════════════════════════════
// ops.movimientos — actions manifest
// ────────────────────────────────────────────────────────────────────
// Four per-row actions (operator review 2026-05-22):
//
//   - asignar_banco_cuenta   — imputación · sets `destination` when null
//   - asignar_cliente        — imputación · sets `client` when null
//   - crear_ajuste_debito    — conciliación · creates new AJUSTE_DEBITO
//   - crear_ajuste_credito   — conciliación · creates new AJUSTE_CREDITO
//
// The two "Crear Ajuste *" actions live under `conciliacion` because
// they exist to keep the client's balance correct without ever mutating
// a prior movement: the source row stays immutable, the ajuste is a
// brand-new compensating movement that nets in or out of the same
// client. The source movement is referenced only via metadata.
//
// They ride on the manifest engine for the dialog flow + on_confirm
// marker (`_create_adjustment`); the page-side dispatcher reads the
// marker and re-routes the patch into `createMovement` (POST) instead
// of `updateMovement` (PATCH). The marker stays out of the persisted
// shape.
//
// Kanban surfaces a single drag-droppable axis (`imputacion_banco_cuenta`)
// in this iteration. Drag from `sin_asignar` → `asignado` opens the
// matching manifest dialog via `mode: 'modal'`. Lado-Cliente axis and
// status axis are deferred to a follow-up tanda.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_MOVIMIENTOS_MANIFEST_KEY = 'ops.movimientos' as const;

export const OPS_MOVIMIENTOS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'movimientos',
  scope: 'module',
  schema_version: '1',
  actions: [
    // ─── 1 · Asignar Banco y Cuenta (Lado Ardua) ────────────────────
    {
      id: 'movimientos.asignar_banco_cuenta',
      dimension: 'imputacion',
      label: 'Asignar Banco y Cuenta',
      description: 'Imputa el Banco / Cuenta del Lado Ardua para este movimiento.',
      icon: 'credit-card',
      target_field: 'destination',
      enable_when: { field_is_null: 'destination' },
      disable_reason: 'El movimiento ya tiene un banco / cuenta asignado',
      disable_tag: 'Imputación',
      dialog: {
        title: 'Asignar Banco y Cuenta',
        description: '{record.id} · {record.client}',
        fields: [
          {
            id: 'destination',
            label: 'Banco / Cuenta',
            type: 'text',
            required: true,
            placeholder: 'Ej: COINAG · ARS · 10.049',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['destination'],
        audit: true,
        toast: 'Banco y Cuenta asignados',
      },
    },
    // ─── 2 · Asignar Cliente (Lado Cliente) ─────────────────────────
    {
      id: 'movimientos.asignar_cliente',
      dimension: 'imputacion',
      label: 'Asignar Cliente',
      description: 'Imputa el cliente externo asociado al movimiento.',
      icon: 'user-plus',
      target_field: 'client',
      enable_when: { field_is_null: 'client' },
      disable_reason: 'El movimiento ya tiene un cliente asignado',
      disable_tag: 'Imputación',
      dialog: {
        title: 'Asignar Cliente',
        description: '{record.id}',
        fields: [
          {
            id: 'client',
            label: 'Cliente',
            type: 'text',
            required: true,
            placeholder: 'Razón social, nombre o CUIT del cliente',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['client'],
        audit: true,
        toast: 'Cliente asignado',
      },
    },
    // ─── 3 · Crear Ajuste de Débito ─────────────────────────────────
    {
      id: 'movimientos.crear_ajuste_debito',
      dimension: 'conciliacion',
      label: 'Crear Ajuste de Débito',
      description:
        'Genera un movimiento nuevo (AJUSTE_DEBITO) que resta saldo al cliente. El movimiento original queda inmutable; este ajuste lo compensa.',
      icon: 'minus-circle',
      dialog: {
        title: 'Crear Ajuste de Débito',
        description: 'Compensa el saldo del cliente · referencia: {record.id}',
        info_banner: {
          variant: 'info',
          text: 'Se genera un movimiento independiente de tipo AJUSTE_DEBITO que resta saldo al cliente. El movimiento original ({record.id}) queda inmutable.',
        },
        fields: [
          {
            id: 'ajuste_monto',
            label: 'Monto del ajuste',
            type: 'number',
            required: true,
            placeholder: '0.00',
          },
          {
            id: 'ajuste_concepto',
            label: 'Concepto / motivo',
            type: 'textarea',
            required: true,
            max_length: 280,
            placeholder: 'Detalle del ajuste contable…',
          },
        ],
        confirm_label: 'Crear ajuste',
      },
      on_confirm: {
        update_fields: ['ajuste_monto', 'ajuste_concepto'],
        set_fields: { _create_adjustment: 'DEBIT' },
        audit: true,
        toast: 'Ajuste de Débito creado',
      },
    },
    // ─── 4 · Crear Ajuste de Crédito ────────────────────────────────
    {
      id: 'movimientos.crear_ajuste_credito',
      dimension: 'conciliacion',
      label: 'Crear Ajuste de Crédito',
      description:
        'Genera un movimiento nuevo (AJUSTE_CREDITO) que suma saldo al cliente. El movimiento original queda inmutable; este ajuste lo compensa.',
      icon: 'plus-circle',
      dialog: {
        title: 'Crear Ajuste de Crédito',
        description: 'Compensa el saldo del cliente · referencia: {record.id}',
        info_banner: {
          variant: 'info',
          text: 'Se genera un movimiento independiente de tipo AJUSTE_CREDITO que suma saldo al cliente. El movimiento original ({record.id}) queda inmutable.',
        },
        fields: [
          {
            id: 'ajuste_monto',
            label: 'Monto del ajuste',
            type: 'number',
            required: true,
            placeholder: '0.00',
          },
          {
            id: 'ajuste_concepto',
            label: 'Concepto / motivo',
            type: 'textarea',
            required: true,
            max_length: 280,
            placeholder: 'Detalle del ajuste contable…',
          },
        ],
        confirm_label: 'Crear ajuste',
      },
      on_confirm: {
        update_fields: ['ajuste_monto', 'ajuste_concepto'],
        set_fields: { _create_adjustment: 'CREDIT' },
        audit: true,
        toast: 'Ajuste de Crédito creado',
      },
    },
  ],
  kanban_axes: [
    {
      axis_id: 'imputacion_banco_cuenta',
      dimension: 'imputacion',
      drop_target_state: 'asignado',
      states: ['sin_asignar', 'asignado'],
    },
  ],
};
