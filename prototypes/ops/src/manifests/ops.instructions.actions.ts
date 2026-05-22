// ════════════════════════════════════════════════════════════════════
// ops.instructions — actions manifest
// ────────────────────────────────────────────────────────────────────
// Templates de routing de pago. Cada instrucción es un registro
// editable con N atributos key-value (interpolables al renderizar la
// carta).
//
// Module CTAs:
//   - instructions.crear      — primary "Crear instrucción"
//
// Per-row actions:
//   - instructions.editar     — governance, mismos campos que crear
//   - instructions.eliminar   — governance · danger, requiere confirmar
//
// Two-phase orchestration (`createInstructionWithAttributes` /
// `updateInstructionWithAttributes`) is wired in the page-side
// creator/dispatcher — the manifest engine just collects the form
// values; the page handles the phase A → phase B sequence.
//
// The `currency_id` field uses a lookup against the `ops.currencies`
// catalog (registered in `plugins/catalogs.ts`) — pages keep the
// `['ops', 'currencies']` cache warm so the dropdown options match
// the IDs stored on the record.
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';

export const OPS_INSTRUCTIONS_MANIFEST_KEY = 'ops.instructions' as const;

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'INACTIVE', label: 'Inactivo' },
];

export const OPS_INSTRUCTIONS_MANIFEST: Manifest = {
  app: 'ops',
  module: 'instructions',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'instructions.editar',
      dimension: 'governance',
      label: 'Editar',
      description: 'Edita los campos de la instrucción y sus atributos.',
      icon: 'edit',
      dialog: {
        title: 'Editar instrucción',
        description: '{record.name}',
        fields: [
          {
            id: 'name',
            label: 'Nombre',
            type: 'text',
            required: true,
            placeholder: 'Nombre de la instrucción',
          },
          {
            id: 'provider',
            label: 'Proveedor',
            type: 'text',
            required: false,
            placeholder: 'Banco, exchange, custodio…',
          },
          {
            id: 'currency_id',
            label: 'Moneda',
            type: 'lookup',
            catalog: 'ops.currencies',
            required: true,
            placeholder: 'Elegí la moneda…',
          },
          {
            id: 'description',
            label: 'Descripción',
            type: 'textarea',
            required: false,
            max_length: 280,
            placeholder: 'Detalle opcional del template',
          },
          {
            id: 'status',
            label: 'Estado',
            type: 'select',
            required: true,
            options: STATUS_OPTIONS,
          },
          {
            id: 'attributes',
            label: 'Atributos',
            type: 'key-value-array',
            required: false,
            key_type: 'text',
            value_type: 'text',
            min_rows: 0,
            hint: 'Cada atributo se puede interpolar en la carta como {{key}}.',
          },
        ],
        confirm_label: 'Guardar cambios',
      },
      on_confirm: {
        update_fields: [
          'name',
          'provider',
          'currency_id',
          'description',
          'status',
          'attributes',
        ],
        audit: true,
        toast: 'Instrucción actualizada',
      },
    },
    {
      id: 'instructions.eliminar',
      dimension: 'governance',
      label: 'Eliminar',
      description: 'Borra la instrucción de forma irreversible.',
      icon: 'trash',
      danger: true,
      dialog: {
        title: 'Eliminar instrucción',
        description: '{record.name}',
        info_banner: {
          variant: 'warning',
          text: 'La operación es irreversible. Si la instrucción está siendo usada por una Account Instruction activa, la asignación quedará huérfana.',
        },
        fields: [],
        confirm_label: 'Eliminar',
      },
      on_confirm: {
        set_fields: { _action: 'eliminar' },
        audit: true,
        toast: 'Instrucción eliminada',
      },
    },
  ],
  module_ctas: [
    {
      id: 'instructions.crear',
      dimension: 'governance',
      label: 'Crear instrucción',
      description: 'Da de alta una nueva instrucción con sus atributos.',
      icon: 'plus',
      is_module_cta: true,
      variant: 'primary',
      creates_record_concept: 'instruction',
      dialog: {
        title: 'Crear instrucción',
        description: 'Template de routing de pago. Los atributos se interpolan al renderizar la carta.',
        fields: [
          {
            id: 'name',
            label: 'Nombre',
            type: 'text',
            required: true,
            placeholder: 'Ej: SWIFT estándar USD',
          },
          {
            id: 'provider',
            label: 'Proveedor',
            type: 'text',
            required: false,
            placeholder: 'Banco, exchange, custodio…',
          },
          {
            id: 'currency_id',
            label: 'Moneda',
            type: 'lookup',
            catalog: 'ops.currencies',
            required: true,
            placeholder: 'Elegí la moneda…',
          },
          {
            id: 'description',
            label: 'Descripción',
            type: 'textarea',
            required: false,
            max_length: 280,
            placeholder: 'Detalle opcional del template',
          },
          {
            id: 'status',
            label: 'Estado',
            type: 'select',
            required: true,
            default: 'DRAFT',
            options: STATUS_OPTIONS,
          },
          {
            id: 'attributes',
            label: 'Atributos',
            type: 'key-value-array',
            required: false,
            key_type: 'text',
            value_type: 'text',
            min_rows: 0,
            hint: 'Cada atributo se puede interpolar en la carta como {{key}}.',
          },
        ],
        confirm_label: 'Crear instrucción',
      },
      on_confirm: {
        update_fields: [
          'name',
          'provider',
          'currency_id',
          'description',
          'status',
          'attributes',
        ],
        audit: true,
        toast: 'Instrucción creada',
      },
    },
  ],
};
