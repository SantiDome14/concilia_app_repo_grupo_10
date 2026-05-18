// ════════════════════════════════════════════════════════════════════
// Manifest · FIN.Disponibilidades · Bancos / Cuentas (record `cuenta_banco`)
// ────────────────────────────────────────────────────────────────────
// FIN lens over the REQ-42 §8 Bancos / Cuentas catalogue. Per REQ-50
// §4, this manifest declares:
//   - `module_ctas[]` — "Crear nueva Cuenta" (capability `bancos_cuentas.crear`).
//   - `actions[]` — "Configurar cuenta contable" (capability
//     `bancos_cuentas.configurar_contable`). Free-form metadata in v1;
//     selector-based once Belén Gallo defines the categories.
//
// Per Decision 2 of design.md, this manifest is independent from any
// future `ops.bancos_cuentas.actions.ts`. No shared package.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY =
  'fin.disponibilidades.bancos_cuentas' as const;

export const FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST: Manifest = {
  app: 'fin',
  module: 'disponibilidades',
  record_type: 'cuenta_banco',
  scope: 'record',
  schema_version: '1',

  actions: [
    {
      id: 'fin.disponibilidades.bancos_cuentas.configurar_contable',
      dimension: 'governance',
      label: 'Configurar cuenta contable',
      description:
        'Asigná una etiqueta o metadata contable preparatoria. Será validada contra el plan de cuentas operativo cuando éste exista.',
      icon: 'book',
      target_field: 'cuenta_contable',
      enable_when: { field_is_null: 'cuenta_contable' },
      disable_reason: 'Ya tiene configuración contable',
      disable_tag: 'Configurada',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.bancos_cuentas.configurar_contable'],
      },
      dialog: {
        title: 'Configurar cuenta contable',
        description:
          'Asigná la etiqueta o metadata contable que vincula esta cuenta al plan de cuentas. En v1.0 es campo libre; cuando exista el plan de cuentas operativo, será validado automáticamente.',
        fields: [
          {
            id: 'cuenta_contable',
            label: 'Etiqueta o metadata contable',
            type: 'text',
            required: true,
            placeholder: 'Ej. Banco Local · ARS · Cta. Corriente Esc. 1',
            hint: 'Texto libre en v1.0. Se validará contra el plan de cuentas operativo cuando exista.',
          },
        ],
        confirm_label: 'Guardar configuración',
      },
      on_confirm: {
        update_fields: ['cuenta_contable'],
        audit: true,
        toast: 'Configuración contable guardada',
      },
    },
  ],

  module_ctas: [
    {
      id: 'fin.disponibilidades.bancos_cuentas.crear',
      dimension: 'governance',
      label: 'Crear nueva Cuenta',
      description:
        'Da de alta una nueva cuenta en el catálogo compartido de Bancos / Cuentas.',
      icon: 'plus',
      is_module_cta: true,
      creates_record_type: 'cuenta_banco',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.bancos_cuentas.crear'],
      },
      dialog: {
        title: 'Crear nueva Cuenta',
        description:
          'El catálogo es compartido con OPS. Esta acción crea la entrada en la fuente de verdad común; la lente Finanzas suma sólo la metadata contable preparatoria (opcional al crear).',
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
            id: 'banco',
            label: 'Banco / Estructura',
            type: 'text',
            required: true,
            placeholder: 'Ej. COINAG, BIND, BITGO...',
          },
          {
            id: 'tipo_estructura',
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
          {
            id: 'tipo_cuenta',
            label: 'Tipo de cuenta',
            type: 'select',
            required: true,
            options: [
              { value: 'Wallet Pool', label: 'Wallet Pool' },
              { value: 'CBU', label: 'CBU' },
              { value: 'CVU', label: 'CVU' },
              { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
              { value: 'Exchange Account', label: 'Exchange Account' },
              { value: 'Custodia', label: 'Custodia' },
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
              { value: 'USDT', label: 'USDT' },
              { value: 'USDC', label: 'USDC' },
              { value: 'EUR', label: 'EUR' },
              { value: 'CAD', label: 'CAD' },
              { value: 'BTC', label: 'BTC' },
            ],
          },
          {
            id: 'numero',
            label: 'Nro. de cuenta / address',
            type: 'text',
            required: true,
            placeholder: 'Identificador único de la cuenta',
          },
          {
            id: 'cuenta_contable',
            label: 'Cuenta contable (opcional)',
            type: 'text',
            required: false,
            placeholder: 'Podés configurarla después con la acción "Configurar cuenta contable"',
          },
        ],
        confirm_label: 'Crear cuenta',
      },
      on_confirm: {
        update_fields: [
          'sociedad_id',
          'banco',
          'tipo_estructura',
          'tipo_cuenta',
          'moneda',
          'numero',
          'cuenta_contable',
        ],
        audit: true,
        toast: 'Cuenta creada en el catálogo',
      },
    },
  ],
};
