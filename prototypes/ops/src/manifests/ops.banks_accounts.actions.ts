// ════════════════════════════════════════════════════════════════════
// ops.banks_accounts — actions manifest
// ────────────────────────────────────────────────────────────────────
// Mirrors `fin.disponibilidades.bancos_cuentas` minus the contable
// metadata (accounting fields are owned by FIN; OPS does not surface
// them). Operator review 2026-05-22 added two governance actions in
// place of `configurar_contable`:
//
//   - editar     — full-field PATCH (5 mutable fields)
//   - activar    — sets status='Activa'    (enabled when Inactiva)
//   - desactivar — sets status='Inactiva'  (enabled when Activa, danger)
//
// `module_ctas` parallel the FIN ones: primary "Nueva Cuenta",
// secondary "Nueva Estructura". The `cuenta_contable` field is
// intentionally absent from the Crear Cuenta dialog.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_BANKS_ACCOUNTS_MANIFEST_KEY = 'ops.banks_accounts' as const;

export const OPS_BANKS_ACCOUNTS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'banks_accounts',
  record_concept: 'cuenta_banco',
  scope: 'record',
  schema_version: '1',

  actions: [
    // ─── 1 · Editar (full-field PATCH) ───────────────────────────────
    {
      id: 'ops.banks_accounts.editar',
      dimension: 'governance',
      label: 'Editar datos',
      description: 'Edita los campos mutables de la cuenta (moneda, tipo, número, padre, estado).',
      icon: 'edit',
      dialog: {
        title: 'Editar cuenta',
        description: '{record.estructura} · {record.moneda} · {record.nro}',
        fields: [
          {
            id: 'tipoCuenta',
            label: 'Tipo de cuenta',
            type: 'select',
            required: true,
            options: [
              { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
              { value: 'CVU', label: 'CVU' },
              { value: 'Wallet Pool', label: 'Wallet Pool' },
              { value: 'Custodia', label: 'Custodia' },
              { value: 'Exchange Account', label: 'Exchange Account' },
              { value: 'Comitente', label: 'Comitente' },
            ],
          },
          {
            id: 'moneda',
            label: 'Moneda',
            type: 'select',
            required: true,
            options: [
              { value: 'ARS', label: 'ARS' },
              { value: 'USD', label: 'USD' },
              { value: 'USDC', label: 'USDC' },
              { value: 'USDT', label: 'USDT' },
              { value: 'BTC', label: 'BTC' },
            ],
          },
          {
            id: 'nro',
            label: 'Nro. de cuenta / address',
            type: 'text',
            required: true,
          },
          {
            id: 'status',
            label: 'Estado',
            type: 'select',
            required: true,
            options: [
              { value: 'Activa', label: 'Activa' },
              { value: 'Inactiva', label: 'Inactiva' },
            ],
          },
        ],
        confirm_label: 'Guardar cambios',
      },
      on_confirm: {
        update_fields: ['tipoCuenta', 'moneda', 'nro', 'status'],
        audit: true,
        toast: 'Cuenta actualizada',
      },
    },
    // ─── 2 · Activar ─────────────────────────────────────────────────
    {
      id: 'ops.banks_accounts.activar',
      dimension: 'governance',
      label: 'Activar cuenta',
      description: 'Reactiva una cuenta inactiva para volver a operar con ella.',
      icon: 'check',
      target_field: 'status',
      enable_when: { field_equals: { field: 'status', value: 'Inactiva' } },
      disable_reason: 'Solo aplica a cuentas inactivas',
      disable_tag: 'Estado',
      dialog: {
        title: 'Activar cuenta',
        description: '{record.estructura} · {record.moneda} · {record.nro}',
        info_banner: {
          variant: 'info',
          text: 'La cuenta volverá a estar disponible para nuevas operaciones.',
        },
        fields: [],
        confirm_label: 'Activar',
      },
      on_confirm: {
        set_fields: { status: 'Activa' },
        audit: true,
        toast: 'Cuenta activada',
      },
    },
    // ─── 3 · Desactivar (danger) ─────────────────────────────────────
    {
      id: 'ops.banks_accounts.desactivar',
      dimension: 'governance',
      label: 'Desactivar cuenta',
      description: 'Marca la cuenta como inactiva. No se borra del catálogo — los movimientos históricos siguen referenciándola.',
      icon: 'x',
      danger: true,
      target_field: 'status',
      enable_when: { field_equals: { field: 'status', value: 'Activa' } },
      disable_reason: 'Solo aplica a cuentas activas',
      disable_tag: 'Estado',
      dialog: {
        title: 'Desactivar cuenta',
        description: '{record.estructura} · {record.moneda} · {record.nro}',
        info_banner: {
          variant: 'warning',
          text: 'La cuenta deja de aceptar nuevas operaciones. Los movimientos históricos no se ven afectados.',
        },
        fields: [],
        confirm_label: 'Desactivar',
      },
      on_confirm: {
        set_fields: { status: 'Inactiva' },
        audit: true,
        toast: 'Cuenta desactivada',
      },
    },
  ],

  module_ctas: [
    // ─── Primary · Crear nueva Cuenta ───────────────────────────────
    {
      id: 'ops.banks_accounts.crear_cuenta',
      dimension: 'governance',
      label: 'Crear nueva Cuenta',
      description: 'Da de alta una nueva cuenta en el catálogo maestro.',
      icon: 'plus',
      is_module_cta: true,
      variant: 'primary',
      creates_record_concept: 'cuenta_banco',
      dialog: {
        title: 'Crear nueva Cuenta',
        description: 'Catálogo maestro de Sociedad → Estructura → Cuenta.',
        fields: [
          {
            id: 'sociedadId',
            label: 'Sociedad',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
            placeholder: 'Elegí sociedad...',
          },
          {
            id: 'estructuraId',
            label: 'Banco / Estructura',
            type: 'lookup',
            catalog: 'ops.estructuras_bancos',
            required: true,
            placeholder: 'Elegí Banco / Estructura...',
            hint: 'Si no encontrás la estructura, creala primero con la acción "Crear nuevo Banco/Estructura".',
          },
          {
            id: 'tipoCuenta',
            label: 'Tipo de cuenta',
            type: 'select',
            required: true,
            options: [
              { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
              { value: 'CVU', label: 'CVU' },
              { value: 'Wallet Pool', label: 'Wallet Pool' },
              { value: 'Custodia', label: 'Custodia' },
              { value: 'Exchange Account', label: 'Exchange Account' },
              { value: 'Comitente', label: 'Comitente' },
            ],
          },
          {
            id: 'moneda',
            label: 'Moneda',
            type: 'select',
            required: true,
            options: [
              { value: 'ARS', label: 'ARS' },
              { value: 'USD', label: 'USD' },
              { value: 'USDC', label: 'USDC' },
              { value: 'USDT', label: 'USDT' },
              { value: 'BTC', label: 'BTC' },
            ],
          },
          {
            id: 'nro',
            label: 'Nro. de cuenta / address',
            type: 'text',
            required: true,
            placeholder: 'Identificador único de la cuenta',
          },
        ],
        confirm_label: 'Crear cuenta',
      },
      on_confirm: {
        update_fields: ['sociedadId', 'estructuraId', 'tipoCuenta', 'moneda', 'nro'],
        audit: true,
        toast: 'Cuenta creada en el catálogo',
      },
    },
    // ─── Secondary · Crear nuevo Banco/Estructura ───────────────────
    {
      id: 'ops.banks_accounts.crear_estructura',
      dimension: 'governance',
      label: 'Crear nuevo Banco/Estructura',
      description: 'Da de alta un Banco / Exchange / ALyC / Custodio / PSP en el registro de Estructuras.',
      icon: 'building',
      is_module_cta: true,
      variant: 'secondary',
      creates_record_concept: 'estructura_banco',
      dialog: {
        title: 'Crear nuevo Banco/Estructura',
        description: 'Las Estructuras son globales — cualquier Sociedad puede abrir cuentas en una Estructura existente.',
        fields: [
          {
            id: 'name',
            label: 'Nombre',
            type: 'text',
            required: true,
            placeholder: 'Ej. Lemon Cash, Banco Itaú, BBVA...',
          },
          {
            id: 'tipo',
            label: 'Tipo de estructura',
            type: 'select',
            required: true,
            options: [
              { value: 'Banco', label: 'Banco' },
              { value: 'Banco digital', label: 'Banco digital' },
              { value: 'ALyC', label: 'ALyC' },
              { value: 'Exchange', label: 'Exchange' },
              { value: 'Custodio', label: 'Custodio' },
              { value: 'PSP', label: 'PSP' },
              { value: 'Proveedor', label: 'Proveedor' },
            ],
          },
        ],
        confirm_label: 'Crear estructura',
      },
      on_confirm: {
        update_fields: ['name', 'tipo'],
        audit: true,
        toast: 'Estructura creada',
      },
    },
  ],
};
