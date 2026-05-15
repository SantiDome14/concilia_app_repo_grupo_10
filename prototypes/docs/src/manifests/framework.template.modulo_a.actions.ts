// ════════════════════════════════════════════════════════════════════
// Módulo A manifest — framework.template.modulo_a
// ────────────────────────────────────────────────────────────────────
// Demonstrative manifest for the canonical Type-A reference page
// (`src/pages/ModuloA.vue`). Mirrors the legacy prototype's
// `prototypes/_core-template-frontend/manifests/ejemplo.modulo-a.actions.js`
// with the five actions a registro_demo can carry, expressed in the
// Vue 3 + TS strict shape the engine uses today.
//
// Each action is fully declarative — predicates, capabilities,
// dialogs, on_confirm — so Module A's row actions menu and the
// dialogs that open from it depend ENTIRELY on this configuration.
// Authoring this manifest is the only thing apps need to do to
// extend or restrict Módulo A's actions.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const MODULO_A_MANIFEST_KEY = 'framework.template.modulo_a' as const;

export const MODULO_A_MANIFEST: Manifest = {
  app: 'framework',
  module: 'template.modulo_a',
  scope: 'module',
  schema_version: '1',
  actions: [
    // ─── 1 · Procesar (state transition: PENDING → ACTIVE) ────────
    {
      id: 'modulo_a.process',
      dimension: 'governance',
      label: 'Procesar',
      description: 'Avanza el registro de PENDING a ACTIVE',
      icon: 'play',
      enable_when: { field_equals: { field: 'status', value: 'PENDING' } },
      disable_reason: 'Solo disponible para registros PENDING',
      disable_tag: 'Estado',
      dialog: {
        title: 'Procesar {record.name}',
        description: '{record.id} · {record.category}',
        info_banner: {
          variant: 'info',
          text: 'El registro pasará a estado ACTIVE.',
        },
        fields: [],
        confirm_label: 'Procesar',
      },
      on_confirm: {
        set_fields: { status: 'ACTIVE' },
        audit: true,
        toast: 'Registro procesado',
      },
    },
    // ─── 2 · Confirmar (governance · no state change) ─────────────
    {
      id: 'modulo_a.confirm',
      dimension: 'governance',
      label: 'Confirmar',
      description: 'Marca el registro como confirmado',
      icon: 'check',
      enable_when: {
        field_in: { field: 'status', values: ['ACTIVE', 'PENDING'] },
      },
      disable_reason: 'Un registro INACTIVE no puede confirmarse',
      disable_tag: 'Estado',
      dialog: {
        title: 'Confirmar {record.name}',
        description: '{record.id} · {record.category}',
        fields: [
          {
            id: 'confirmation_note',
            label: 'Comentario de cierre (opcional)',
            type: 'textarea',
            required: false,
            max_length: 280,
          },
        ],
        confirm_label: 'Confirmar',
      },
      on_confirm: {
        audit: true,
        toast: 'Registro confirmado',
      },
    },
    // ─── 3 · Generar comprobante (documentacion) ──────────────────
    {
      id: 'modulo_a.generate',
      dimension: 'documentacion',
      label: 'Generar comprobante',
      description: 'Emite un comprobante interno asociado al registro',
      icon: 'document',
      enable_when: {
        field_in: { field: 'category', values: ['Tipo 1', 'Tipo 2'] },
      },
      disable_reason: 'No aplicable a registros de categoría Tipo 3',
      disable_tag: 'Categoría',
      dialog: {
        title: 'Generar comprobante',
        description: '{record.name}',
        info_banner: {
          variant: 'info',
          text: 'Se emite un comprobante interno con número correlativo.',
        },
        fields: [
          {
            id: 'comprobante_concepto',
            label: 'Concepto',
            type: 'textarea',
            required: true,
            max_length: 280,
            placeholder: 'Concepto del comprobante (visible al destinatario)…',
          },
        ],
        confirm_label: 'Generar',
      },
      on_confirm: {
        audit: true,
        toast: 'Comprobante generado',
      },
    },
    // ─── 4 · Asignar responsable (capability-gated demo) ──────────
    {
      id: 'modulo_a.assign',
      dimension: 'imputacion',
      label: 'Asignar responsable',
      description: 'Asigna un responsable interno para seguimiento',
      icon: 'user-plus',
      capabilities: {
        // Sentinel role nobody has — this gates the action OUT of the
        // demo to showcase the capability-based disable path.
        required_role_any_of: ['MODULO_A_ASSIGNER'],
      },
      disable_reason: 'Tu rol actual no permite asignar responsables',
      disable_tag: 'Permiso',
      dialog: {
        title: 'Asignar responsable',
        description: '{record.name}',
        fields: [
          {
            id: 'responsable',
            label: 'Responsable',
            type: 'text',
            required: true,
            placeholder: 'Nombre o usuario…',
          },
        ],
        confirm_label: 'Asignar',
      },
      on_confirm: {
        audit: true,
        toast: 'Responsable asignado',
      },
    },
    // ─── 5 · Anular registro (V2 placeholder, danger) ─────────────
    {
      id: 'modulo_a.cancel',
      dimension: 'governance',
      label: 'Anular registro',
      description: 'Anula el registro de forma irreversible (planificada para V2)',
      icon: 'x-circle',
      danger: true,
      // Sentinel that never resolves true → permanently disabled.
      enable_when: { field_equals: { field: '_never', value: true } },
      disable_reason: 'Funcionalidad planificada para la próxima versión',
      disable_tag: 'V2',
      dialog: {
        title: 'Anular {record.name}',
        description: '{record.id}',
        info_banner: {
          variant: 'warning',
          text: 'Esta acción anula el registro de forma irreversible.',
        },
        fields: [
          {
            id: 'anulacion_motivo',
            label: 'Motivo de anulación',
            type: 'textarea',
            required: true,
            max_length: 500,
          },
        ],
        confirm_label: 'Anular',
      },
      on_confirm: {
        audit: true,
        toast: 'Registro anulado',
      },
    },
  ],
};
