/* ───────────────────────────────────────────────────────────────────
   Manifest demo · Módulo Específico A del template del core
   ───────────────────────────────────────────────────────────────────
   Cubre todas las capacidades del schema (_schema.json):
     · lookup       (Asignar Responsable, framework.entidades_demo)
     · select       (Aprobar registro, opciones del manifest)
     · textarea     (Generar Comprobante, max_length)
     · prerequisites (Confirmar requiere Aprobación)
     · batch        (Asignar Responsable, promote_to_main_cta)
     · kanban_axes  (eje "imputacion" → dimension imputacion)
     · disabled v1  (Anular registro)
     · module_ctas  (Crear Registro)

   Reglas no negociables del contenido entre `=` y `;`:
     · Comillas dobles en todas las claves y strings
     · Sin trailing commas
     · Sin comentarios dentro del objeto JSON
     · Sin referencias a variables JS (todo literal)
     · Sin funciones, sin expresiones, sin template literals
     · Sin `undefined` (usar null o omitir)

   Validación rápida: la regex documentada en _schema.md §1 debe extraer
   un .json puro parseable por JSON.parse(). Smoke-test en el README
   del template antes de subir cambios.
   ─────────────────────────────────────────────────────────────────── */

window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};

window.ACTION_MANIFEST["framework.template.modulo_a"] = {
  "app": "framework",
  "module": "template",
  "record_type": "registro_demo",
  "scope": "record",
  "schema_version": "1.0",

  "required_imputations": ["responsable_id", "estado_aprobacion", "comprobante_id"],

  "required_by_type": {
    "registro_demo": ["responsable_id", "estado_aprobacion", "comprobante_id"]
  },

  "kanban_axes": [
    {
      "axis_id": "imputacion",
      "dimension": "imputacion",
      "drop_target_state": "imputado",
      "states": ["pendiente", "en_proceso", "imputado"]
    }
  ],

  "actions": [
    {
      "id": "framework.template.modulo_a.imputacion.asignar_responsable",
      "dimension": "imputacion",
      "label": "Asignar Responsable",
      "description": "Asigna un responsable interno al registro para su seguimiento.",
      "icon": "user-plus",
      "target_field": "responsable_id",
      "show_when": { "record_type_in": ["registro_demo"] },
      "enable_when": { "field_is_null": "responsable_id" },
      "disable_reason": "El registro ya tiene responsable asignado",
      "disable_tag": "Asignado",
      "capabilities": {
        "required_role_any_of": ["ADMIN", "OPS_OFFICER", "ANALISTA"]
      },
      "dialog": {
        "title": "Asignar Responsable",
        "description": "Identificá al responsable interno que se hará cargo del registro.",
        "fields": [
          {
            "id": "responsable_id",
            "label": "Responsable",
            "type": "lookup",
            "catalog": "framework.entidades_demo",
            "required": true,
            "placeholder": "Buscar responsable por nombre o ID...",
            "hint": "Sugerencia: el responsable habitual de la categoría se autosugiere desde backend"
          },
          {
            "id": "imputation_note",
            "label": "Nota de imputación (opcional)",
            "type": "textarea",
            "required": false,
            "max_length": 280,
            "placeholder": "Contexto adicional para la asignación..."
          }
        ],
        "confirm_label": "Asignar",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["responsable_id", "imputation_note"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Responsable asignado correctamente"
      },
      "batch": {
        "batchable": true,
        "homogeneity_check": [
          "all_records_pass_show_when",
          "all_records_have_field_null:responsable_id"
        ],
        "min_records": 2,
        "max_records": 100,
        "promote_to_main_cta": true,
        "main_cta_label_template": "Asignar Responsable a {N} registros"
      }
    },

    {
      "id": "framework.template.modulo_a.governance.aprobar",
      "dimension": "governance",
      "label": "Aprobar / Rechazar",
      "description": "Aprueba el registro o lo rechaza con justificación.",
      "icon": "check-circle",
      "target_field": "estado_aprobacion",
      "show_when": { "record_type_in": ["registro_demo"] },
      "enable_when": { "field_is_null": "estado_aprobacion" },
      "disable_reason": "El registro ya tiene una decisión registrada",
      "disable_tag": "Decidido",
      "capabilities": {
        "required_role_any_of": ["ADMIN", "APROBADOR"]
      },
      "dialog": {
        "title": "Aprobar / Rechazar registro",
        "description": "Decidí el destino del registro y dejá constancia del motivo.",
        "fields": [
          {
            "id": "estado_aprobacion",
            "label": "Decisión",
            "type": "select",
            "required": true,
            "options": [
              { "value": "Aprobado", "label": "Aprobado" },
              { "value": "Rechazado", "label": "Rechazado" },
              { "value": "En revisión", "label": "En revisión" }
            ]
          },
          {
            "id": "approval_note",
            "label": "Justificación (mínimo 10 caracteres)",
            "type": "textarea",
            "required": true,
            "max_length": 500,
            "placeholder": "Razón de la decisión..."
          }
        ],
        "confirm_label": "Registrar decisión",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["estado_aprobacion", "approval_note"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Decisión registrada"
      }
    },

    {
      "id": "framework.template.modulo_a.documentacion.generar_comprobante",
      "dimension": "documentacion",
      "label": "Generar comprobante",
      "description": "Emite un comprobante interno con número correlativo.",
      "icon": "document",
      "target_field": "comprobante_id",
      "show_when": { "record_type_in": ["registro_demo"] },
      "enable_when": { "field_is_null": "comprobante_id" },
      "disable_reason": "El registro ya tiene comprobante emitido",
      "disable_tag": "Emitido",
      "capabilities": {
        "required_role_any_of": ["ADMIN", "OPS_OFFICER"]
      },
      "dialog": {
        "title": "Generar comprobante",
        "description": "Emití el comprobante interno asociado al registro.",
        "fields": [
          {
            "id": "comprobante_concepto",
            "label": "Concepto",
            "type": "textarea",
            "required": true,
            "max_length": 280,
            "placeholder": "Concepto del comprobante (visible al destinatario)..."
          }
        ],
        "confirm_label": "Generar",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["comprobante_id", "comprobante_concepto"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Comprobante generado"
      }
    },

    {
      "id": "framework.template.modulo_a.governance.confirmar",
      "dimension": "governance",
      "label": "Confirmar registro",
      "description": "Cierra el registro como confirmado. Requiere aprobación previa.",
      "icon": "check",
      "target_field": "confirmado_at",
      "show_when": { "record_type_in": ["registro_demo"] },
      "enable_when": { "field_is_null": "confirmado_at" },
      "disable_reason": "El registro ya está confirmado",
      "disable_tag": "Confirmado",
      "prerequisites": [
        {
          "field": "estado_aprobacion",
          "value": "Aprobado",
          "message": "Aprobá el registro antes de confirmar"
        }
      ],
      "capabilities": {
        "required_role_any_of": ["ADMIN", "APROBADOR"]
      },
      "dialog": {
        "title": "Confirmar registro",
        "description": "Esta acción cierra el registro. No se puede deshacer en v1.",
        "fields": [
          {
            "id": "confirmation_note",
            "label": "Comentario de cierre (opcional)",
            "type": "textarea",
            "required": false,
            "max_length": 280
          }
        ],
        "confirm_label": "Confirmar",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["confirmado_at", "confirmation_note"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Registro confirmado"
      }
    },

    {
      "id": "framework.template.modulo_a.governance.anular",
      "dimension": "governance",
      "label": "Anular registro",
      "description": "Anula el registro de forma irreversible. Funcionalidad planificada para V2.",
      "icon": "x-circle",
      "danger": true,
      "target_field": "anulado_at",
      "show_when": { "record_type_in": ["registro_demo"] },
      "enable_when": { "field_equals": { "field": "_never", "value": true } },
      "disable_reason": "Funcionalidad planificada para la próxima versión",
      "disable_tag": "V2",
      "capabilities": {
        "required_role_any_of": ["ADMIN"]
      },
      "dialog": {
        "title": "Anular registro",
        "description": "Esta acción anula el registro de forma irreversible.",
        "fields": [
          {
            "id": "anulacion_motivo",
            "label": "Motivo de anulación",
            "type": "textarea",
            "required": true,
            "max_length": 500
          }
        ],
        "confirm_label": "Anular",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["anulado_at", "anulacion_motivo"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Registro anulado"
      }
    }
  ],

  "module_ctas": [
    {
      "id": "framework.template.modulo_a.governance.crear_registro",
      "dimension": "governance",
      "label": "Crear Registro",
      "description": "Da de alta un nuevo registro en el módulo.",
      "icon": "plus",
      "is_module_cta": true,
      "creates_record_type": "registro_demo",
      "capabilities": {
        "required_role_any_of": ["ADMIN", "OPS_OFFICER"]
      },
      "dialog": {
        "title": "Crear nuevo registro",
        "description": "Cargá los datos básicos del registro. Las imputaciones (responsable, aprobación, comprobante) se asignan después desde el menú de acciones.",
        "fields": [
          {
            "id": "nombre",
            "label": "Nombre",
            "type": "text",
            "required": true,
            "placeholder": "Nombre del registro..."
          },
          {
            "id": "categoria",
            "label": "Categoría",
            "type": "select",
            "required": true,
            "default": "Tipo 1",
            "options": [
              { "value": "Tipo 1", "label": "Tipo 1" },
              { "value": "Tipo 2", "label": "Tipo 2" },
              { "value": "Tipo 3", "label": "Tipo 3" }
            ]
          },
          {
            "id": "valor",
            "label": "Valor",
            "type": "number",
            "required": true,
            "min": 0,
            "default": 0
          },
          {
            "id": "estado",
            "label": "Estado inicial",
            "type": "select",
            "required": true,
            "default": "PENDIENTE",
            "options": [
              { "value": "PENDIENTE", "label": "Pendiente" },
              { "value": "ACTIVO",    "label": "Activo" },
              { "value": "INACTIVO",  "label": "Inactivo" }
            ]
          }
        ],
        "confirm_label": "Crear",
        "cancel_label": "Cancelar"
      },
      "on_confirm": {
        "update_fields": ["nombre", "categoria", "valor", "estado"],
        "recompute": ["imputacion"],
        "audit": true,
        "toast": "Registro creado"
      }
    }
  ]
};
