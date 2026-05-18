// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Disponibilidades · Movimientos (record `movimiento`)
// ────────────────────────────────────────────────────────────────────
// Per REQ-50 §5.7, this manifest declares ONLY the six contextual
// actions of the Movimientos sub-tab:
//   - Asignar / Editar Banco y Cuenta (capability `imputar_ardua`)
//   - Asignar / Editar Cliente (capability `imputar_cliente`)
//   - Confirmar / Rechazar carga manual (capability `supervisar_carga`)
//
// The 4 dropped actions of the legacy `fin.movimientos.actions.ts`
// (Proveedor / Partner / Banco-Exchange / Imputar-Contable / Marcar
// Intercompany / Marcar Diferencias / Marcar Conciliado) are NOT in
// REQ-50's scope and are not migrated here (Decision 4 of design.md).
//
// Notes on engine constraints:
//   - `Dimension` is restricted to 6 canonical values; we use
//     `imputacion` for the imputation axes and `governance` for the
//     supervision axis + tipo / sociedad axes (closest fit).
//   - The `created_by !== current_user` predicate of REQ-50 §5.7 is
//     enforced at the page level. The manifest's `enable_when` checks
//     the gating conditions the engine can evaluate today
//     (requires_supervision + supervised_by); the page applies the
//     creator filter via a small `useAuth`-aware wrapper.
//   - Each `show_when` call invokes `nostroOrManualPredicate()` so the
//     manifest stays JSON-strict serialisable (no shared subtrees).
// ════════════════════════════════════════════════════════════════════

import type { Manifest, Predicate } from '@/types/manifest';

export const FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY =
  'fin.disponibilidades.movimientos' as const;

const VOSTRO_DISABLED_REASON = 'Imputado desde OPS';

// Movements that FIN imputa from Disponibilidades: nostros (origen
// Manual or TRD) and the non-vostro OPS types (FEE, TAX, REBATE,
// ADDITION, TRANSFER_*, SWAP_*). Vostros (OPS · DEPOSIT/WITHDRAWAL/
// COLLECTOR_*) are imputed from OPS — the action shows but stays
// disabled with `disable_reason: 'Imputado desde OPS'`.
//
// Factory function returns a fresh tree on every call so the manifest
// stays JSON-strict serialisable (no shared subtrees → no circular
// reference flag in the validator).
function nostroOrManualPredicate(): Predicate {
  return {
    any: [
      { field_equals: { field: 'origen', value: 'Manual' } },
      { field_equals: { field: 'origen', value: 'TRD' } },
      {
        all: [
          { field_equals: { field: 'origen', value: 'OPS' } },
          {
            record_type_in: [
              'FEE',
              'TAX',
              'REBATE',
              'ADDITION',
              'TRANSFER_OUT',
              'TRANSFER_IN',
              'SWAP_OUT',
              'SWAP_IN',
            ],
          },
        ],
      },
    ],
  };
}

export const FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST: Manifest = {
  app: 'fin',
  module: 'disponibilidades',
  record_type: 'movimiento',
  scope: 'record',
  schema_version: '1',

  required_imputations: ['fin.sociedad_id', 'fin.cuenta_id'],

  kanban_axes: [
    {
      axis_id: 'estado_operativo',
      dimension: 'imputacion',
      drop_target_state: 'COMPLETED',
      states: ['PENDING', 'PROCESSING', 'COMPLETED'],
    },
    {
      axis_id: 'estado_imputacion_ardua',
      dimension: 'imputacion',
      drop_target_state: 'asignado',
      states: ['sin_asignar', 'asignado'],
    },
    {
      axis_id: 'estado_imputacion_cliente',
      dimension: 'imputacion',
      drop_target_state: 'asignado',
      states: ['sin_asignar', 'asignado'],
    },
    {
      axis_id: 'estado_de_supervision',
      dimension: 'governance',
      drop_target_state: 'confirmado',
      states: ['pendiente_de_supervision', 'confirmado', 'rechazado'],
    },
    {
      axis_id: 'tipo',
      dimension: 'governance',
      states: [
        'DEPOSIT',
        'WITHDRAWAL',
        'COLLECTOR_IN',
        'COLLECTOR_OUT',
        'SWAP_IN',
        'SWAP_OUT',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'FEE',
        'TAX',
        'REBATE',
        'ADDITION',
      ],
    },
    {
      axis_id: 'sociedad',
      dimension: 'governance',
      states: ['hp', 'cp', 'asc', 'av'],
    },
  ],

  actions: [
    // ─── 1 · Asignar Banco y Cuenta (Lado Ardua) ────────────────────
    {
      id: 'fin.disponibilidades.movimientos.imputar_ardua.asignar',
      dimension: 'imputacion',
      label: 'Asignar Banco y Cuenta',
      description:
        'Asigná la Sociedad / Estructura / Cuenta del Lado Ardua. Aplica a movimientos nostro y manuales no operativos.',
      icon: 'credit-card',
      target_field: 'fin.cuenta_id',
      show_when: nostroOrManualPredicate(),
      enable_when: { field_is_null: 'fin.cuenta_id' },
      disable_reason: VOSTRO_DISABLED_REASON,
      disable_tag: 'Solo OPS',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_ardua'],
      },
      dialog: {
        title: 'Asignar Banco y Cuenta',
        description: 'Origen de fondos — Sociedad / Estructura / Cuenta del movimiento.',
        fields: [
          {
            id: 'fin.sociedad_id',
            label: 'Sociedad',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
            placeholder: 'Seleccionar sociedad...',
          },
          {
            id: 'fin.cuenta_id',
            label: 'Cuenta',
            type: 'lookup',
            catalog: 'fin.bancos_cuentas',
            required: true,
            catalog_filter: { field: 'sociedad_id', from_form: 'fin.sociedad_id' },
            placeholder: 'Seleccionar cuenta...',
            hint: 'Filtrada por sociedad y moneda compatible',
          },
        ],
        confirm_label: 'Confirmar asignación',
      },
      on_confirm: {
        update_fields: ['fin.sociedad_id', 'fin.cuenta_id'],
        audit: true,
        toast: 'Banco y Cuenta asignados',
      },
    },
    // ─── 2 · Editar Banco y Cuenta (Lado Ardua) ─────────────────────
    {
      id: 'fin.disponibilidades.movimientos.imputar_ardua.editar',
      dimension: 'imputacion',
      label: 'Editar Banco y Cuenta',
      description: 'Editá la imputación actual del Lado Ardua.',
      icon: 'edit',
      target_field: 'fin.cuenta_id',
      show_when: nostroOrManualPredicate(),
      enable_when: { field_is_not_null: 'fin.cuenta_id' },
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_ardua'],
      },
      dialog: {
        title: 'Editar Banco y Cuenta',
        description: 'Re-asigná el Lado Ardua del movimiento.',
        fields: [
          {
            id: 'fin.sociedad_id',
            label: 'Sociedad',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
          },
          {
            id: 'fin.cuenta_id',
            label: 'Cuenta',
            type: 'lookup',
            catalog: 'fin.bancos_cuentas',
            required: true,
            catalog_filter: { field: 'sociedad_id', from_form: 'fin.sociedad_id' },
          },
        ],
        confirm_label: 'Confirmar cambio',
      },
      on_confirm: {
        update_fields: ['fin.sociedad_id', 'fin.cuenta_id'],
        audit: true,
        toast: 'Lado Ardua actualizado',
      },
    },
    // ─── 3 · Asignar Cliente (Lado Cliente) ─────────────────────────
    {
      id: 'fin.disponibilidades.movimientos.imputar_cliente.asignar',
      dimension: 'imputacion',
      label: 'Asignar Cliente',
      description:
        'Asigná el Cliente + Cuenta Operativa del Cliente. Para nostros / manuales no operativos podés usar la Cuenta de Cliente de Ardua (AS00000).',
      icon: 'user-plus',
      target_field: 'fin.cliente_id',
      show_when: nostroOrManualPredicate(),
      enable_when: { field_is_null: 'fin.cliente_id' },
      disable_reason: VOSTRO_DISABLED_REASON,
      disable_tag: 'Solo OPS',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_cliente'],
      },
      dialog: {
        title: 'Asignar Cliente',
        description:
          'Cliente externo o Cuenta de Cliente de Ardua (AS00000) cuando no aplica un externo.',
        fields: [
          {
            id: 'fin.cliente_id',
            label: 'Cliente',
            type: 'lookup',
            catalog: 'clp.clientes',
            required: true,
            placeholder: 'Buscar por razón social, Tax ID o AS00000...',
            hint: 'Para movimientos sin cliente externo, usá AS00000 (Cuenta de Cliente de Ardua)',
          },
          {
            id: 'fin.cuenta_operativa_cliente_id',
            label: 'Cuenta Operativa del Cliente',
            type: 'lookup',
            catalog: 'fin.cuentas_operativas_cliente',
            required: true,
            catalog_filter: { field: 'cliente_id', from_form: 'fin.cliente_id' },
            placeholder: 'Filtrada por cliente y moneda',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['fin.cliente_id', 'fin.cuenta_operativa_cliente_id'],
        audit: true,
        toast: 'Cliente asignado',
      },
    },
    // ─── 4 · Editar Cliente (Lado Cliente) ──────────────────────────
    {
      id: 'fin.disponibilidades.movimientos.imputar_cliente.editar',
      dimension: 'imputacion',
      label: 'Editar Cliente',
      description: 'Editá la imputación actual del Lado Cliente.',
      icon: 'edit',
      target_field: 'fin.cliente_id',
      show_when: nostroOrManualPredicate(),
      enable_when: { field_is_not_null: 'fin.cliente_id' },
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_cliente'],
      },
      dialog: {
        title: 'Editar Cliente',
        fields: [
          {
            id: 'fin.cliente_id',
            label: 'Cliente',
            type: 'lookup',
            catalog: 'clp.clientes',
            required: true,
          },
          {
            id: 'fin.cuenta_operativa_cliente_id',
            label: 'Cuenta Operativa del Cliente',
            type: 'lookup',
            catalog: 'fin.cuentas_operativas_cliente',
            required: true,
            catalog_filter: { field: 'cliente_id', from_form: 'fin.cliente_id' },
          },
        ],
        confirm_label: 'Confirmar cambio',
      },
      on_confirm: {
        update_fields: ['fin.cliente_id', 'fin.cuenta_operativa_cliente_id'],
        audit: true,
        toast: 'Cliente actualizado',
      },
    },
    // ─── 5 · Confirmar carga manual (governance) ────────────────────
    // The `created_by !== current_user` predicate of REQ-50 §5.7 is
    // enforced at the page level (the actions menu hides this entry
    // when the current user is the creator). The engine cannot express
    // `field !== current_user` natively today.
    {
      id: 'fin.disponibilidades.movimientos.supervisar.confirmar',
      dimension: 'governance',
      label: 'Confirmar carga manual',
      description:
        'Confirmá el movimiento manual. Una vez confirmado impacta los saldos de la Posición. Requiere que seas distinto del usuario que cargó el movimiento (verificado a nivel page).',
      icon: 'check-circle',
      target_field: 'estado_de_supervision',
      enable_when: {
        all: [
          { field_equals: { field: 'requires_supervision', value: true } },
          { field_is_null: 'supervised_by' },
        ],
      },
      disable_reason: 'Ya confirmado o no requiere supervisión',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.supervisar_carga'],
      },
      dialog: {
        title: 'Confirmar carga manual',
        description:
          'Al confirmar, el movimiento entra al ledger y se computa en los saldos de la Posición.',
        fields: [
          {
            id: 'nota_confirmacion',
            label: 'Nota (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Confirmar',
      },
      on_confirm: {
        update_fields: ['nota_confirmacion'],
        set_fields: {
          supervised_by: '$current_user',
          supervised_at: '$now',
          estado_de_supervision: 'confirmado',
        },
        audit: true,
        toast: 'Carga manual confirmada · saldos actualizados',
      },
    },
    // ─── 6 · Rechazar carga manual (governance) ─────────────────────
    {
      id: 'fin.disponibilidades.movimientos.supervisar.rechazar',
      dimension: 'governance',
      label: 'Rechazar carga manual',
      description:
        'Rechazá el movimiento manual con justificación obligatoria (≥ 10 caracteres). El rechazo NUNCA impacta saldos.',
      icon: 'x-circle',
      danger: true,
      target_field: 'estado_de_supervision',
      enable_when: {
        all: [
          { field_equals: { field: 'requires_supervision', value: true } },
          { field_is_null: 'supervised_by' },
        ],
      },
      disable_reason: 'Ya confirmado o no requiere supervisión',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.supervisar_carga'],
      },
      dialog: {
        title: 'Rechazar carga manual',
        description:
          'El rechazo es irreversible y queda registrado en el audit log. El movimiento permanece visible pero no impacta saldos. Justificación obligatoria (≥ 10 caracteres).',
        fields: [
          {
            id: 'motivo_rechazo',
            label: 'Justificación',
            type: 'textarea',
            required: true,
            max_length: 500,
            placeholder: 'Justificación obligatoria (mínimo 10 caracteres)...',
          },
        ],
        confirm_label: 'Rechazar carga',
      },
      on_confirm: {
        update_fields: ['motivo_rechazo'],
        set_fields: {
          supervised_by: '$current_user',
          supervised_at: '$now',
          estado_de_supervision: 'rechazado',
        },
        audit: true,
        toast: 'Carga manual rechazada',
      },
    },
  ],
};
