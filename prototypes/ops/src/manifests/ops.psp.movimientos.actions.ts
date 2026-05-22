// ════════════════════════════════════════════════════════════════════
// ops.psp.movimientos — actions manifest for the PSP Movimientos tab
// ────────────────────────────────────────────────────────────────────
// One module_cta today:
//
//   - psp.movimientos.crear — opens a dialog with the 4 fields needed
//     to record a partner-anchored movement:
//       · Cliente (lookup → ops.psp.clientes; resolves the source CVU)
//       · Tipo    (closed catalog of MovementType codes)
//       · Monto   (number; sign carries semantics: negative = debit)
//       · Contraparte (text, optional)
//
// The page-side creator hooks `createMovement` (POST /movements) and
// derives `partner` / `sponsor` / `currency` from the chosen CVU's
// owner — the operator never picks the sponsor manually.
//
// No per-row actions yet.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_PSP_MOVIMIENTOS_MANIFEST_KEY = 'ops.psp.movimientos' as const;

export const OPS_PSP_MOVIMIENTOS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'psp.movimientos',
  scope: 'module',
  schema_version: '1',
  module_ctas: [
    {
      id: 'psp.movimientos.crear',
      dimension: 'governance',
      label: 'Crear Movimiento',
      description:
        'Registra un nuevo movimiento partner-anclado a un CVU del cliente.',
      icon: 'plus',
      is_module_cta: true,
      variant: 'primary',
      creates_record_concept: 'psp_movement',
      dialog: {
        title: 'Crear Movimiento',
        description: 'El partner y la moneda se derivan del CVU del cliente seleccionado.',
        fields: [
          {
            id: 'client',
            label: 'Cliente',
            type: 'lookup',
            catalog: 'ops.psp.clientes',
            required: true,
            placeholder: 'Buscar cliente por nombre…',
            hint: 'El sponsor / partner y la moneda se infieren del CVU del cliente.',
          },
          {
            id: 'type',
            label: 'Tipo de movimiento',
            type: 'select',
            required: true,
            options: [
              { value: 'DEPOSIT', label: 'DEPOSIT' },
              { value: 'WITHDRAWAL', label: 'WITHDRAWAL' },
              { value: 'INT_DEPOSIT', label: 'INT DEPOSIT' },
              { value: 'IN_WITHDRAWAL', label: 'IN WITHDRAWAL' },
              { value: 'FX_DEPOSIT', label: 'FX DEPOSIT' },
              { value: 'FX_WITHDRAWAL', label: 'FX WITHDRAWAL' },
              { value: 'COLLECTOR_IN', label: 'COLLECTOR IN' },
              { value: 'COLLECTOR_OUT', label: 'COLLECTOR OUT' },
              { value: 'FEE', label: 'FEE' },
            ],
          },
          {
            id: 'amount',
            label: 'Monto',
            type: 'number',
            required: true,
            placeholder: '0.00',
            hint: 'Negativo para débitos (WITHDRAWAL / FEE / ...). Positivo para créditos.',
          },
          {
            id: 'counterparty',
            label: 'Contraparte (opcional)',
            type: 'text',
            required: false,
            placeholder: 'Razón social o nombre de la contraparte',
          },
        ],
        confirm_label: 'Crear',
      },
      on_confirm: {
        update_fields: ['client', 'type', 'amount', 'counterparty'],
        audit: true,
        toast: 'Movimiento creado',
      },
    },
  ],
};
