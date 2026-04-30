// ════════════════════════════════════════════════════════════════════
// Alertas manifest — framework.template.alertas
// ────────────────────────────────────────────────────────────────────
// Declares the canonical Alerta lifecycle actions for profiles A and B:
//   - marcar_resolved   — terminal transition to `resolved` (modal,
//                         requires justification ≥10 chars)
//   - marcar_dismissed  — terminal transition to `dismissed` (modal,
//                         requires justification ≥10 chars)
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const ALERTAS_MANIFEST_KEY = 'framework.template.alertas' as const;

export const ALERTAS_MANIFEST: Manifest = {
  app: 'framework',
  module: 'template.alertas',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'alertas.marcar_resolved',
      dimension: 'cierre',
      label: 'Marcar resuelta',
      description: 'Cierra la alerta como resuelta — requiere justificación',
      icon: 'check',
      target_field: 'state',
      enable_when: {
        any: [
          { field_equals: { field: 'state', value: 'new' } },
          { field_equals: { field: 'state', value: 'in_review' } },
        ],
      },
      dialog: {
        title: 'Marcar como resuelta',
        description: 'Justificá la resolución (≥10 caracteres)',
        fields: [
          {
            id: 'closure_comment',
            label: 'Justificación',
            type: 'textarea',
            required: true,
            placeholder: 'Detalle de la resolución (mínimo 10 caracteres)',
            max_length: 500,
          },
        ],
        confirm_label: 'Resolver',
      },
      on_confirm: {
        update_fields: ['closure_comment'],
        set_fields: { state: 'resolved', resolved_at: '$now' },
        audit: true,
        toast: 'Alerta resuelta',
      },
    },
    {
      id: 'alertas.marcar_dismissed',
      dimension: 'cierre',
      label: 'Descartar',
      description: 'Descarta la alerta como falso positivo — requiere justificación',
      icon: 'x',
      danger: true,
      target_field: 'state',
      enable_when: {
        any: [
          { field_equals: { field: 'state', value: 'new' } },
          { field_equals: { field: 'state', value: 'in_review' } },
        ],
      },
      dialog: {
        title: 'Descartar alerta',
        description: 'Justificá el descarte (≥10 caracteres)',
        fields: [
          {
            id: 'closure_comment',
            label: 'Justificación',
            type: 'textarea',
            required: true,
            placeholder: 'Por qué se descarta esta alerta (mínimo 10 caracteres)',
            max_length: 500,
          },
        ],
        confirm_label: 'Descartar',
      },
      on_confirm: {
        update_fields: ['closure_comment'],
        set_fields: { state: 'dismissed', dismissed_at: '$now' },
        audit: true,
        toast: 'Alerta descartada',
      },
    },
  ],
  kanban_axes: [
    {
      axis_id: 'alertas.lifecycle',
      dimension: 'governance',
      drop_target_state: 'state',
      states: ['new', 'in_review', 'resolved', 'dismissed'],
    },
  ],
};
