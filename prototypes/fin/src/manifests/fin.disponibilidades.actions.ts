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
  record_concept: null,
  scope: 'module',
  schema_version: '1',

  actions: [],

  module_ctas: [
    {
      id: 'fin.disponibilidades.movimientos.cargar_manual',
      dimension: 'governance',
      label: 'Cargar movimiento manual',
      description:
        'Cargá un movimiento manual de los tipos registrados por FIN (comisiones, intereses, pagos, sweepings, intercompany, aportes, ajustes). Los tipos OPS-native (DEPOSIT/WITHDRAWAL/FEE/SWAP/etc) se cargan desde OPS, no acá.',
      icon: 'plus',
      is_module_cta: true,
      creates_record_concept: 'movimiento',
      capabilities: {
        required_role_any_of: ['fin.disponibilidades.movimientos.cargar_directo'],
      },
      dialog: {
        title: 'Cargar movimiento manual',
        description:
          'El movimiento se persiste en el ledger e impacta los saldos de la Posición. Para movimientos cross-sociedad (Préstamo intercompany / Sweeping), completá los campos Sociedad / Cuenta destino — el sistema genera dos asientos espejo con `evento_id` compartido.',
        fields: [
          {
            id: 'tipo',
            label: 'Tipo de movimiento',
            type: 'select',
            required: true,
            options: [
              { value: 'COMISION_BANCARIA', label: 'COMISION_BANCARIA — comisión bancaria' },
              { value: 'INTERES_BANCARIO', label: 'INTERES_BANCARIO — interés bancario acreditado' },
              { value: 'PAGO_PROVEEDOR', label: 'PAGO_PROVEEDOR — pago a proveedor / impuestos' },
              { value: 'PAGO_SALARIOS', label: 'PAGO_SALARIOS — pago de nómina' },
              { value: 'MOV_ENTRE_CUENTAS_PROPIAS', label: 'MOV_ENTRE_CUENTAS_PROPIAS — entre cuentas de la misma sociedad' },
              { value: 'APORTE_CAPITAL', label: 'APORTE_CAPITAL — aporte de capital propio' },
              { value: 'PRESTAMO_INTERCOMPANY', label: 'PRESTAMO_INTERCOMPANY — préstamo entre sociedades (genera 2 asientos)' },
              { value: 'SWEEPING_CROSS_SOCIEDAD', label: 'SWEEPING_CROSS_SOCIEDAD — sweeping entre sociedades (genera 2 asientos)' },
              { value: 'AJUSTE_MANUAL', label: 'AJUSTE_MANUAL — válvula de escape con justificación obligatoria' },
            ],
          },
          {
            id: 'sociedad_id',
            label: 'Sociedad (origen)',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: true,
            placeholder: 'Elegí sociedad...',
            hint: 'Para tipos cross-sociedad, esta es la sociedad origen de los fondos.',
          },
          {
            id: 'cuenta_id',
            label: 'Cuenta (origen)',
            type: 'lookup',
            catalog: 'fin.bancos_cuentas',
            required: true,
            catalog_filter: { field: 'sociedad_id', from_form: 'sociedad_id' },
            placeholder: 'Elegí cuenta (filtrada por sociedad y moneda)...',
          },
          {
            id: 'sociedad_destino_id',
            label: 'Sociedad destino',
            type: 'lookup',
            catalog: 'framework.sociedades',
            required: false,
            placeholder: 'Solo para Préstamo intercompany / Sweeping cross-sociedad',
            hint: 'Obligatorio si el tipo es PRESTAMO_INTERCOMPANY o SWEEPING_CROSS_SOCIEDAD. En esos casos se generan dos asientos espejo con `evento_id` compartido. Para MOV_ENTRE_CUENTAS_PROPIAS (misma sociedad) usá Cuenta destino abajo.',
          },
          {
            id: 'cuenta_destino_id',
            label: 'Cuenta destino',
            type: 'lookup',
            catalog: 'fin.bancos_cuentas',
            required: false,
            catalog_filter: { field: 'sociedad_id', from_form: 'sociedad_destino_id' },
            placeholder: 'Cuenta que recibe los fondos',
            hint: 'Obligatorio para PRESTAMO_INTERCOMPANY, SWEEPING_CROSS_SOCIEDAD y MOV_ENTRE_CUENTAS_PROPIAS.',
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
          'sociedad_destino_id',
          'cuenta_destino_id',
          'tipo',
          'fecha',
          'monto',
          'moneda',
          'motivo',
          'referencia',
        ],
        audit: true,
        toast: 'Movimiento cargado',
      },
    },
  ],
};
