// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Disponibilidades · Movimientos (record `movimiento`)
// ────────────────────────────────────────────────────────────────────
// Per `align-fin-disponibilidades-to-omnibus-model`, the predicates of
// this manifest pivot from `origen` (OPS / TRD / Manual) to the
// categoría (A-F) of the closed matriz. Categoría is derived from
// `tipo` via `categoriaOf` in `@/lib/movimientos/categoria`; since the
// engine's predicate alphabet does not include a derived-value check,
// the predicates here enumerate the tipos that belong to each
// categoría through `record_type_in`.
//
// Action gating (per the spec MODIFIED Requirement):
//
//   - Asignar / Editar Banco y Cuenta — applies to all categorías. Enabled
//     only when categoría ∈ {C, D, E} (FIN-imputable). For categoría A, B,
//     F the action shows but is disabled with disable_tag "Solo OPS"
//     because the Lado Ardua is imputed by OPS at the time of the event.
//
//   - Asignar / Editar Cliente — shown only for categoría ∈ {A, B, F},
//     the only categorías where the Lado Cliente is applicable. For C, D,
//     E the contrapartida es una cuenta contable formal (Ingresos /
//     Egresos / Patrimonio operativo / Intercompany / Puente FX), not a
//     cliente — the action is not surfaced.
//
// Each predicate is constructed as a fresh JSON-strict subtree (no
// shared references → no circular flag in the validator).
//
// Supervisión removed in V1 — el área valida los flujos primero y la
// supervisión podrá reintroducirse via capabilities en un cambio futuro.
// ════════════════════════════════════════════════════════════════════

import type { Manifest, Predicate } from '@/types/manifest';

export const FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY =
  'fin.disponibilidades.movimientos' as const;

const DISABLE_REASON_NOT_FIN_IMPUTABLE = 'Lado Ardua imputado por OPS';

// Tipos that belong to categorías C, D, E — the only tipos for which
// FIN imputa el Lado Ardua. Used by the Asignar/Editar Banco y Cuenta
// enable_when. Factory returns a fresh array on every call so the
// manifest stays JSON-strict serialisable.
function tiposFinImputables(): string[] {
  return [
    // C
    'COMISION_BANCARIA',
    'INTERES_BANCARIO',
    'PAGO_PROVEEDOR',
    'PAGO_SALARIOS',
    'MOV_ENTRE_CUENTAS_PROPIAS',
    'APORTE_CAPITAL',
    // D
    'PRESTAMO_INTERCOMPANY',
    'SWEEPING_CROSS_SOCIEDAD',
    // E
    'SPREAD',
    'AJUSTE_MANUAL',
  ];
}

// Tipos that belong to categorías A, B — the only tipos for which the
// Lado Cliente is applicable. Used by the Asignar/Editar Cliente
// show_when.
function tiposWithLadoCliente(): string[] {
  return [
    // A
    'DEPOSIT',
    'WITHDRAWAL',
    // B
    'FEE',
    'REBATE',
    'SWAP_OUT',
    'SWAP_IN',
    'AJUSTE_CREDITO',
    'AJUSTE_DEBITO',
  ];
}

// Enable predicate for Asignar Banco y Cuenta — fin.cuenta_id missing
// AND tipo es FIN-imputable (categoría C, D, E).
function enableImputarArduaAsignar(): Predicate {
  return {
    all: [
      { field_is_null: 'fin.cuenta_id' },
      { record_type_in: tiposFinImputables() },
    ],
  };
}

// Enable predicate for Editar Banco y Cuenta — fin.cuenta_id present
// AND tipo es FIN-imputable.
function enableImputarArduaEditar(): Predicate {
  return {
    all: [
      { field_is_not_null: 'fin.cuenta_id' },
      { record_type_in: tiposFinImputables() },
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
      axis_id: 'tipo',
      dimension: 'governance',
      states: [
        'DEPOSIT',
        'WITHDRAWAL',
        'FEE',
        'REBATE',
        'SWAP_OUT',
        'SWAP_IN',
        'SPREAD',
        'AJUSTE_CREDITO',
        'AJUSTE_DEBITO',
        'MOV_ENTRE_CUENTAS_PROPIAS',
        'PRESTAMO_INTERCOMPANY',
        'SWEEPING_CROSS_SOCIEDAD',
        'COMISION_BANCARIA',
        'INTERES_BANCARIO',
        'PAGO_PROVEEDOR',
        'PAGO_SALARIOS',
        'APORTE_CAPITAL',
        'AJUSTE_MANUAL',
      ],
    },
    {
      axis_id: 'sociedad',
      dimension: 'governance',
      states: ['hp', 'cp', 'asc', 'av'],
    },
    {
      axis_id: 'categoria',
      dimension: 'governance',
      states: ['A', 'B', 'C', 'D', 'E'],
    },
  ],

  actions: [
    // ─── 1 · Asignar Banco y Cuenta (Lado Ardua) ────────────────────
    {
      id: 'fin.disponibilidades.movimientos.imputar_ardua.asignar',
      dimension: 'imputacion',
      label: 'Asignar Banco y Cuenta',
      description:
        'Asigná la Sociedad / Cuenta del Lado Ardua. Aplica a movimientos de categoría C/D/E (FIN imputa). Para categoría A/B/F (Depósitos, Retiros, Fees, etc.) la imputación corre por cuenta de OPS.',
      icon: 'credit-card',
      target_field: 'fin.cuenta_id',
      enable_when: enableImputarArduaAsignar(),
      disable_reason: DISABLE_REASON_NOT_FIN_IMPUTABLE,
      disable_tag: 'Solo OPS',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_ardua'],
      },
      dialog: {
        title: 'Asignar Banco y Cuenta',
        description: 'Origen de fondos — Sociedad / Cuenta del movimiento.',
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
      enable_when: enableImputarArduaEditar(),
      disable_reason: DISABLE_REASON_NOT_FIN_IMPUTABLE,
      disable_tag: 'Solo OPS',
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
        'Asigná el Cliente + Cuenta Operativa del Cliente. Aplica solo a categorías A, B, F (movimientos con o esperando cliente externo).',
      icon: 'user-plus',
      target_field: 'fin.cliente_id',
      show_when: { record_type_in: tiposWithLadoCliente() },
      enable_when: { field_is_null: 'fin.cliente_id' },
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.imputar_cliente'],
      },
      dialog: {
        title: 'Asignar Cliente',
        description:
          'Buscá el cliente por razón social, CUIT o nombre del titular.',
        fields: [
          {
            id: 'fin.cliente_id',
            label: 'Cliente',
            type: 'lookup',
            catalog: 'clp.clientes',
            required: true,
            placeholder: 'Buscar por razón social o CUIT...',
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
      show_when: { record_type_in: tiposWithLadoCliente() },
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
  ],
};
