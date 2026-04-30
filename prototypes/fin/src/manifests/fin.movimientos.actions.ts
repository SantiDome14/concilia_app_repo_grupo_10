// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Movimientos (record `movimiento`)
// ────────────────────────────────────────────────────────────────────
// Pilot manifest for the FIN imputation flow over OPS-sourced
// movements. Each MovimientoTipo declares the target_fields required
// to reach imputation state IMP via `required_by_type`. The engine
// `computeImputation` writes `fin.imput` (PEND / PARC / IMP) after
// every confirm.
//
// Kanban: axis `fin.imput` declares dimension `imputacion`. Drop-target
// `IMP` triggers the page's composite-dialog flow that bundles all
// pending imputation actions for the dropped record.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const FIN_MOVIMIENTOS_MANIFEST_KEY = 'fin.movimientos' as const;

const RECORD_TYPES_ALL = [
  'DEPOSIT',
  'WITHDRAWAL',
  'COLLECTOR_IN',
  'COLLECTOR_OUT',
  'SWAP_OUT',
  'SWAP_IN',
  'FEE',
  'TAX',
  'REBATE',
  'ADDITION',
  'TRANSFER_OUT',
  'TRANSFER_IN',
] as const;

const RECORD_TYPES_CLIENTE = [
  'DEPOSIT',
  'WITHDRAWAL',
  'COLLECTOR_IN',
  'COLLECTOR_OUT',
  'SWAP_OUT',
  'SWAP_IN',
] as const;

export const FIN_MOVIMIENTOS_MANIFEST: Manifest = {
  app: 'fin',
  module: 'movimientos',
  record_type: 'movimiento',
  scope: 'record',
  schema_version: '1',

  required_imputations: ['fin.sociedad_id', 'fin.cuenta_id'],

  required_by_type: {
    DEPOSIT: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    WITHDRAWAL: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    COLLECTOR_IN: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    COLLECTOR_OUT: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    SWAP_OUT: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    SWAP_IN: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    FEE: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.proveedor_id'],
    TAX: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.banco_id'],
    REBATE: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.partner_id'],
    ADDITION: ['fin.sociedad_id', 'fin.cuenta_id'],
    TRANSFER_OUT: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cuenta_destino_id'],
    TRANSFER_IN: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cuenta_origen_id'],
  },

  kanban_axes: [
    {
      axis_id: 'fin.imput',
      dimension: 'imputacion',
      drop_target_state: 'IMP',
      states: ['PEND', 'PARC', 'IMP'],
    },
    {
      axis_id: 'fin.conc',
      dimension: 'conciliacion',
      drop_target_state: 'CONC',
      states: ['PEND', 'DIFF', 'CONC'],
    },
  ],

  actions: [
    // ─── 1 · Asignar Banco y Cuenta (3-field cascade) ────────────────
    // Mirrors `prototypes/ops/ops-acciones-prototype.html`: a single
    // action with three cascading lookups — Sociedad → Estructura →
    // Cuenta — that captures the funding source in one shot. The
    // `_estructura` field is a transient form-only key (compound
    // `sociedad_id:ESTRUCTURA`) used to filter the cuenta dropdown; it
    // is NOT listed in `update_fields` so it never lands on the record.
    {
      id: 'fin.movimientos.imputacion.asignar_banco_cuenta',
      dimension: 'imputacion',
      label: 'Asignar Banco y Cuenta',
      description:
        'Imputá el movimiento a una sociedad, una estructura/banco y una cuenta física en un solo paso.',
      icon: 'credit-card',
      target_field: 'fin.cuenta_id',
      show_when: { record_type_in: [...RECORD_TYPES_ALL] },
      enable_when: { field_is_null: 'fin.cuenta_id' },
      disable_reason: 'El movimiento ya tiene cuenta asignada',
      disable_tag: 'Asignada',
      capabilities: {
        required_role_any_of: [
          'OPS_OFFICER',
          'ADMIN_OPS',
          'ADMIN_FIN',
          'ANALISTA_CONTABLE',
          'ADMIN',
        ],
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
            id: '_estructura',
            label: 'Estructura / Banco',
            type: 'lookup',
            catalog: 'fin.estructuras',
            required: true,
            catalog_filter: { field: 'sociedad_id', from_form: 'fin.sociedad_id' },
            placeholder: 'Seleccionar estructura / banco...',
            hint: 'Exchange, banco, ALyC u otro custodio de la sociedad',
          },
          {
            id: 'fin.cuenta_id',
            label: 'Cuenta',
            type: 'lookup',
            catalog: 'ops.catalogo_cuentas',
            required: true,
            catalog_filter: { field: 'estructura_compound', from_form: '_estructura' },
            placeholder: 'Seleccionar cuenta...',
            hint: 'Moneda y número de cuenta',
          },
        ],
        confirm_label: 'Confirmar asignación',
      },
      on_confirm: {
        update_fields: ['fin.sociedad_id', 'fin.cuenta_id'],
        recompute: ['imputacion'],
        audit: true,
        toast: 'Sociedad / Estructura / Cuenta asignadas',
      },
    },

    // ─── 3 · Asignar Cliente (target: fin.cliente_id) ────────────────
    {
      id: 'fin.movimientos.imputacion.asignar_cliente',
      dimension: 'imputacion',
      label: 'Asignar Cliente',
      description: 'Identificá al cliente de origen del movimiento.',
      icon: 'user-plus',
      target_field: 'fin.cliente_id',
      show_when: { record_type_in: [...RECORD_TYPES_CLIENTE] },
      enable_when: { field_is_null: 'fin.cliente_id' },
      disable_reason: 'El movimiento ya tiene cliente asignado',
      disable_tag: 'Asignado',
      capabilities: {
        required_role_any_of: [
          'OPS_OFFICER',
          'ADMIN_OPS',
          'ADMIN_FIN',
          'ANALISTA_CONTABLE',
          'ADMIN',
        ],
      },
      dialog: {
        title: 'Asignar Cliente al movimiento',
        description: 'Identificá el cliente de origen del depósito o destino del retiro.',
        fields: [
          {
            id: 'fin.cliente_id',
            label: 'Cliente',
            type: 'lookup',
            catalog: 'clp.clientes',
            required: true,
            placeholder: 'Buscar cliente por nombre, CUIT o email...',
            hint: 'Sugerencia (backend): cliente con CUIT que matchea el origen del depósito',
          },
          {
            id: 'fin.cliente_imputation_note',
            label: 'Nota de imputación (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['fin.cliente_id', 'fin.cliente_imputation_note'],
        recompute: ['imputacion'],
        audit: true,
        toast: 'Cliente asignado',
      },
      batch: {
        batchable: true,
        homogeneity_check: [
          'all_records_pass_show_when',
          'all_records_have_field_null:fin.cliente_id',
        ],
        min_records: 2,
        max_records: 100,
        promote_to_main_cta: true,
        main_cta_label_template: 'Asignar Cliente a {N} movimientos',
      },
    },

    // ─── 4 · Asignar Proveedor (target: fin.proveedor_id) ────────────
    {
      id: 'fin.movimientos.imputacion.asignar_proveedor',
      dimension: 'imputacion',
      label: 'Asignar Proveedor',
      description: 'Identificá al proveedor que cobró la comisión.',
      icon: 'briefcase',
      target_field: 'fin.proveedor_id',
      show_when: { record_type_in: ['FEE'] },
      enable_when: { field_is_null: 'fin.proveedor_id' },
      disable_reason: 'El movimiento ya tiene proveedor asignado',
      disable_tag: 'Asignado',
      capabilities: {
        required_role_any_of: ['ADMIN_FIN', 'ANALISTA_CONTABLE', 'ADMIN'],
      },
      dialog: {
        title: 'Asignar Proveedor',
        description: 'Elegí el proveedor que cobró la comisión.',
        fields: [
          {
            id: 'fin.proveedor_id',
            label: 'Proveedor',
            type: 'lookup',
            catalog: 'fin.proveedores',
            required: true,
            placeholder: 'Buscar proveedor...',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['fin.proveedor_id'],
        recompute: ['imputacion'],
        audit: true,
        toast: 'Proveedor asignado',
      },
    },

    // ─── 5 · Asignar Partner (target: fin.partner_id) ────────────────
    {
      id: 'fin.movimientos.imputacion.asignar_partner',
      dimension: 'imputacion',
      label: 'Asignar Partner',
      description: 'Identificá al partner involucrado en el rebate.',
      icon: 'handshake',
      target_field: 'fin.partner_id',
      show_when: { record_type_in: ['REBATE'] },
      enable_when: { field_is_null: 'fin.partner_id' },
      disable_reason: 'El movimiento ya tiene partner asignado',
      disable_tag: 'Asignado',
      capabilities: {
        required_role_any_of: ['ADMIN_FIN', 'ANALISTA_CONTABLE', 'ADMIN'],
      },
      dialog: {
        title: 'Asignar Partner',
        description: 'Elegí el partner contraparte del rebate.',
        fields: [
          {
            id: 'fin.partner_id',
            label: 'Partner',
            type: 'lookup',
            catalog: 'fin.partners',
            required: true,
            placeholder: 'Buscar partner...',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['fin.partner_id'],
        recompute: ['imputacion'],
        audit: true,
        toast: 'Partner asignado',
      },
    },

    // ─── 6 · Asignar Banco / Exchange (target: fin.banco_id) ─────────
    {
      id: 'fin.movimientos.imputacion.asignar_banco_exchange',
      dimension: 'imputacion',
      label: 'Asignar Banco / Exchange',
      description: 'Identificá al banco o exchange que retuvo el impuesto.',
      icon: 'bank',
      target_field: 'fin.banco_id',
      show_when: { record_type_in: ['TAX'] },
      enable_when: { field_is_null: 'fin.banco_id' },
      disable_reason: 'El movimiento ya tiene banco/exchange asignado',
      disable_tag: 'Asignado',
      capabilities: {
        required_role_any_of: ['ADMIN_FIN', 'ANALISTA_CONTABLE', 'ADMIN'],
      },
      dialog: {
        title: 'Asignar Banco / Exchange',
        description: 'Elegí el banco o exchange contraparte del impuesto retenido.',
        fields: [
          {
            id: 'fin.banco_id',
            label: 'Banco / Exchange',
            type: 'lookup',
            catalog: 'framework.bancos_exchanges',
            required: true,
            placeholder: 'Buscar banco o exchange...',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['fin.banco_id'],
        recompute: ['imputacion'],
        audit: true,
        toast: 'Banco/Exchange asignado',
      },
    },

    // ─── 7 · Imputar a Cuenta Contable (V2 — disabled) ────────────────
    {
      id: 'fin.movimientos.imputacion.imputar_cuenta_contable',
      dimension: 'imputacion',
      label: 'Imputar a Cuenta Contable',
      description: 'Asigna la cuenta contable del plan de cuentas.',
      icon: 'book',
      danger: false,
      target_field: 'fin.cuenta_contable_id',
      show_when: { record_type_in: [...RECORD_TYPES_ALL] },
      enable_when: { field_equals: { field: '_never', value: true } },
      disable_reason: 'Funcionalidad bloqueada · requiere FIN.Contabilidad',
      disable_tag: 'Bloqueado · requiere FIN.Contabilidad',
      capabilities: {
        required_role_any_of: ['ADMIN_FIN', 'ANALISTA_CONTABLE', 'ADMIN'],
      },
      dialog: {
        title: 'Imputar a Cuenta Contable',
        fields: [
          {
            id: 'fin.cuenta_contable_id',
            label: 'Cuenta contable',
            type: 'text',
            required: true,
          },
        ],
      },
      on_confirm: {
        update_fields: ['fin.cuenta_contable_id'],
        audit: true,
        toast: 'Imputación contable registrada',
      },
    },

    // ─── 8 · Marcar como Intercompany ─────────────────────────────────
    {
      id: 'fin.movimientos.governance.marcar_intercompany',
      dimension: 'governance',
      label: 'Marcar como Intercompany',
      description: 'Genera un movimiento espejo en la sociedad contraparte.',
      icon: 'swap',
      target_field: 'fin.intercompany',
      show_when: { record_type_in: ['TRANSFER_OUT', 'TRANSFER_IN'] },
      enable_when: { field_is_null: 'fin.intercompany' },
      disable_reason: 'Ya está marcado como intercompany',
      disable_tag: 'Marcado',
      prerequisites: [{ field: 'fin.sociedad_id', message: 'Asigná Estructura primero' }],
      capabilities: {
        required_role_any_of: ['ADMIN_FIN', 'ADMIN'],
      },
      dialog: {
        title: 'Marcar como Intercompany',
        description:
          'Esta acción genera un movimiento espejo en la sociedad contraparte y los liga como intercompany. Audit log explícito.',
        fields: [
          {
            id: 'fin.intercompany_counterparty_sociedad_id',
            label: 'Sociedad contraparte',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
            placeholder: 'Buscar sociedad contraparte...',
          },
          {
            id: 'fin.intercompany_note',
            label: 'Nota (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Marcar y generar espejo',
      },
      on_confirm: {
        update_fields: [
          'fin.intercompany_counterparty_sociedad_id',
          'fin.intercompany_note',
        ],
        set_fields: { 'fin.intercompany': true, 'fin.intercompany_at': '$now' },
        audit: true,
        toast: 'Intercompany marcado · movimiento espejo generado',
      },
    },

    // ─── 9 · Marcar con Diferencias ──────────────────────────────────
    {
      id: 'fin.movimientos.conciliacion.marcar_diferencia',
      dimension: 'conciliacion',
      label: 'Marcar con Diferencias',
      description:
        'Marca el movimiento como diferente del extracto bancario; queda pendiente de investigación.',
      icon: 'alert-triangle',
      target_field: 'fin.conc',
      show_when: { record_type_in: [...RECORD_TYPES_ALL] },
      enable_when: {
        any: [
          { field_is_null: 'fin.conc' },
          { field_equals: { field: 'fin.conc', value: 'PEND' } },
        ],
      },
      disable_reason: 'El movimiento ya fue conciliado o ya está marcado con diferencias',
      disable_tag: 'Estado',
      capabilities: {
        required_role_any_of: [
          'OPS_OFFICER',
          'FINANCE',
          'ADMIN_FIN',
          'ANALISTA_CONTABLE',
          'ADMIN',
        ],
      },
      dialog: {
        title: 'Marcar movimiento con Diferencias',
        description:
          'Indicá la diferencia detectada respecto al extracto bancario. La acción registra la decisión en el audit log.',
        fields: [
          {
            id: 'fin.conc_note',
            label: 'Nota de diferencia',
            type: 'textarea',
            required: true,
            max_length: 500,
            placeholder: 'Describí la discrepancia detectada...',
          },
        ],
        confirm_label: 'Marcar diferencia',
      },
      on_confirm: {
        update_fields: ['fin.conc_note'],
        set_fields: { 'fin.conc': 'DIFF', 'fin.conc_at': '$now' },
        audit: true,
        toast: 'Movimiento marcado con diferencias',
      },
    },

    // ─── 10 · Marcar Conciliado ──────────────────────────────────────
    {
      id: 'fin.movimientos.conciliacion.marcar_conciliado',
      dimension: 'conciliacion',
      label: 'Marcar Conciliado',
      description: 'Marca el movimiento como conciliado contra el extracto bancario.',
      icon: 'check-circle',
      target_field: 'fin.conc',
      show_when: { record_type_in: [...RECORD_TYPES_ALL] },
      enable_when: {
        any: [
          { field_is_null: 'fin.conc' },
          { field_equals: { field: 'fin.conc', value: 'PEND' } },
          { field_equals: { field: 'fin.conc', value: 'DIFF' } },
        ],
      },
      disable_reason: 'El movimiento ya está conciliado',
      disable_tag: 'Conciliado',
      capabilities: {
        required_role_any_of: [
          'OPS_OFFICER',
          'FINANCE',
          'ADMIN_FIN',
          'ANALISTA_CONTABLE',
          'ADMIN',
        ],
      },
      dialog: {
        title: 'Marcar movimiento como Conciliado',
        description:
          'Confirmá que el movimiento corresponde al asiento del extracto bancario. La acción registra la decisión en el audit log.',
        fields: [
          {
            id: 'fin.conc_note',
            label: 'Nota de conciliación (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Marcar conciliado',
      },
      on_confirm: {
        update_fields: ['fin.conc_note'],
        set_fields: { 'fin.conc': 'CONC', 'fin.conc_at': '$now' },
        audit: true,
        toast: 'Movimiento conciliado',
      },
    },
  ],
};
