// ════════════════════════════════════════════════════════════════════
// Inbox manifest — framework.template.inbox
// ────────────────────────────────────────────────────────────────────
// Declares the canonical Solicitud lifecycle actions:
//   - asignar_assignee — set/change the directed-to user (any non-terminal state)
//   - tomar             — set owner + transition to `en_proceso` (free)
//   - cerrar_solicitud  — terminal transition to `completed` (modal)
//   - rechazar          — terminal transition to `rejected` (modal)
//
// Plus the kanban axis for the state machine. Pages import this object
// and call `useManifestRegistryStore().register('framework.template.inbox', INBOX_MANIFEST)`.
//
// `assignee` (directed-to) and `owner` (currently working) are independent
// per `core-modulo-genericos` Requirement: "Solicitud assignee is distinct
// from owner; both are independently mutable".
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const INBOX_MANIFEST_KEY = 'framework.template.inbox' as const;

export const INBOX_MANIFEST: Manifest = {
  app: 'framework',
  module: 'template.inbox',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'inbox.asignar_assignee',
      dimension: 'governance',
      label: 'Asignar / Reasignar',
      description: 'Asigna o cambia el responsable directo de la Solicitud',
      icon: 'user',
      target_field: 'assignee',
      show_when: {
        record_type_in: [
          'aprobacion_pago',
          'revision_legajo',
          'baja_usuario',
          'cambio_limite',
        ],
      },
      enable_when: {
        any: [
          { field_equals: { field: 'state', value: 'pendiente' } },
          { field_equals: { field: 'state', value: 'en_proceso' } },
        ],
      },
      dialog: {
        title: 'Asignar responsable',
        description: 'Seleccioná el usuario al que va dirigida la Solicitud',
        fields: [
          {
            id: 'assignee',
            label: 'Responsable',
            type: 'select',
            required: true,
            options: [
              { value: 'u-1', label: 'Yasmani Rodríguez' },
              { value: 'u-2', label: 'María González' },
              { value: 'u-3', label: 'Juan Pérez' },
              { value: 'u-5', label: 'Lucía Fernández' },
            ],
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        update_fields: ['assignee'],
        set_fields: { updated_at: '$now' },
        audit: true,
        toast: 'Responsable asignado',
      },
    },
    {
      id: 'inbox.tomar',
      dimension: 'governance',
      label: 'Tomar',
      description: 'Toma la Solicitud — asigna owner y transiciona a en_proceso',
      icon: 'play',
      target_field: 'owner',
      show_when: {
        record_type_in: [
          'aprobacion_pago',
          'revision_legajo',
          'baja_usuario',
          'cambio_limite',
        ],
      },
      enable_when: {
        field_equals: { field: 'state', value: 'pendiente' },
      },
      dialog: {
        title: 'Tomar Solicitud',
        description: 'Te asignás como owner y la Solicitud pasa a en_proceso.',
        fields: [],
        confirm_label: 'Tomar',
      },
      on_confirm: {
        set_fields: {
          state: 'en_proceso',
          owner: '$current_user',
          updated_at: '$now',
        },
        audit: true,
        toast: 'Solicitud tomada',
      },
    },
    {
      id: 'inbox.cerrar_solicitud',
      dimension: 'cierre',
      label: 'Cerrar Solicitud',
      description: 'Marca la Solicitud como completada',
      icon: 'check',
      target_field: 'state',
      enable_when: {
        any: [
          { field_equals: { field: 'state', value: 'pendiente' } },
          { field_equals: { field: 'state', value: 'en_proceso' } },
        ],
      },
      dialog: {
        title: 'Cerrar Solicitud',
        description: 'Confirmá el cierre y dejá un comentario opcional',
        fields: [
          {
            id: 'closure_action',
            label: 'Acción de cierre',
            type: 'select',
            required: true,
            options: [
              { value: 'approved', label: 'Aprobada' },
              { value: 'forwarded', label: 'Derivada' },
              { value: 'archived', label: 'Archivada' },
            ],
          },
          {
            id: 'closure_comment',
            label: 'Comentario de cierre',
            type: 'textarea',
            placeholder: 'Detalle de la resolución…',
            max_length: 500,
          },
        ],
        confirm_label: 'Cerrar Solicitud',
      },
      on_confirm: {
        update_fields: ['closure_comment'],
        set_fields: { state: 'completed', updated_at: '$now' },
        audit: true,
        toast: 'Solicitud cerrada',
      },
    },
    {
      id: 'inbox.rechazar',
      dimension: 'cierre',
      label: 'Rechazar',
      description: 'Rechaza la Solicitud con motivo obligatorio',
      icon: 'x',
      danger: true,
      target_field: 'state',
      enable_when: {
        any: [
          { field_equals: { field: 'state', value: 'pendiente' } },
          { field_equals: { field: 'state', value: 'en_proceso' } },
        ],
      },
      dialog: {
        title: 'Rechazar Solicitud',
        description: 'Indicá el motivo del rechazo (≥10 caracteres)',
        fields: [
          {
            id: 'closure_comment',
            label: 'Motivo del rechazo',
            type: 'textarea',
            required: true,
            placeholder: 'Motivo (obligatorio, mínimo 10 caracteres)',
            max_length: 500,
          },
        ],
        confirm_label: 'Rechazar Solicitud',
      },
      on_confirm: {
        update_fields: ['closure_comment'],
        set_fields: { state: 'rejected', updated_at: '$now' },
        audit: true,
        toast: 'Solicitud rechazada',
      },
    },
  ],
  kanban_axes: [
    {
      axis_id: 'inbox.lifecycle',
      dimension: 'governance',
      drop_target_state: 'state',
      states: ['pendiente', 'en_proceso', 'completed', 'rejected'],
    },
  ],
};
