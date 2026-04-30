/* ───────────────────────────────────────────────────────────────────
   Manifest · FIN.Cotizaciones (Quotes con lente Finanzas)
   ───────────────────────────────────────────────────────────────────
   Acciones de FIN sobre quotes ejecutadas por TRD. Cubre el lifecycle
   de facturación (eje fin.facturaState: pendiente → facturada / no-req)
   y el control de governance del quote (cancelar antes de ejecutar).

   En el Tablero, el eje `fin.facturaState` declara dimension `documentacion`.
   A diferencia de Movimientos (donde el drag-drop abre un dialog compuesto
   uniendo todas las acciones de la dimensión), en Quotes cada drop target
   abre la acción específica que produce ese estado — son acciones
   mutuamente excluyentes. El handler `onModalTransition` del módulo en
   el script (registerModule('q', {...})) resuelve cuál acción abrir según
   el targetState (facturada → Generar Factura · no-req → Marcar No Facturable).

   Reglas de JSON estricto: ver template/manifests/_schema.md §1.
   ─────────────────────────────────────────────────────────────────── */

window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};

window.ACTION_MANIFEST["fin.cotizaciones"] = {
  "app": "fin",
  "module": "cotizaciones",
  "record_type": "quote",
  "scope": "record",
  "schema_version": "1.0",

  "kanban_axes": [
    {
      "axis_id": "fin.facturaState",
      "dimension": "documentacion",
      "drop_target_state": "facturada",
      "states": ["pendiente", "facturada", "no-req"]
    }
  ],

  "actions": [
    {
      "id": "fin.cotizaciones.documentacion.generar_factura",
      "dimension": "documentacion",
      "label": "Generar Factura",
      "description": "Emite la factura del quote ejecutado.",
      "icon": "document-add",
      "target_field": "fin.factura",
      "show_when": { "field_in": { "field": "status", "values": ["executed", "settled"] } },
      "enable_when": {
        "all": [
          { "field_is_null": "fin.factura" },
          { "field_equals": { "field": "fin.facturaState", "value": "pendiente" } }
        ]
      },
      "disable_reason": "El quote ya tiene factura emitida o está marcado como no facturable",
      "disable_tag": "Emitida",
      "capabilities": { "required_role_any_of": ["ANALISTA_CONTABLE","ADMIN_FIN","ADMIN"] },
      "dialog": {
        "title": "Generar factura",
        "description": "Emití la factura asociada al quote ejecutado.",
        "fields": [
          { "id": "fin.factura_concepto", "label": "Concepto",
            "type": "textarea", "required": true, "max_length": 280,
            "placeholder": "Concepto que figura en la factura..." }
        ],
        "confirm_label": "Emitir factura"
      },
      "on_confirm": {
        "update_fields": ["fin.factura_concepto"],
        "set_fields": { "fin.facturaState": "facturada", "fin.fact_at": "$now" },
        "audit": true,
        "toast": "Factura emitida"
      }
    },

    {
      "id": "fin.cotizaciones.documentacion.marcar_no_facturable",
      "dimension": "documentacion",
      "label": "Marcar como No facturable",
      "description": "Marca el quote como no facturable con motivo.",
      "icon": "x-circle",
      "target_field": "fin.facturaState",
      "show_when": { "field_in": { "field": "status", "values": ["executed", "settled"] } },
      "enable_when": { "field_equals": { "field": "fin.facturaState", "value": "pendiente" } },
      "disable_reason": "El quote ya tiene un estado de facturación distinto de pendiente",
      "disable_tag": "Resuelto",
      "capabilities": { "required_role_any_of": ["ANALISTA_CONTABLE","ADMIN_FIN","ADMIN"] },
      "dialog": {
        "title": "Marcar como no facturable",
        "description": "Indicá el motivo por el cual este quote no se factura. La decisión queda registrada en el audit log.",
        "fields": [
          { "id": "fin.no_factura_motivo", "label": "Motivo",
            "type": "textarea", "required": true, "max_length": 500,
            "placeholder": "Razón por la cual el quote no se factura..." }
        ],
        "confirm_label": "Marcar no facturable"
      },
      "on_confirm": {
        "update_fields": ["fin.no_factura_motivo"],
        "set_fields": { "fin.facturaState": "no-req" },
        "audit": true,
        "toast": "Quote marcado como no facturable"
      }
    },

    {
      "id": "fin.cotizaciones.governance.recotizar",
      "dimension": "governance",
      "label": "Re-cotizar",
      "description": "Genera una nueva oferta sobre el mismo pedido del cliente.",
      "icon": "refresh",
      "target_field": "fin.recotizado_at",
      "show_when": { "field_in": { "field": "status", "values": ["pending", "offered"] } },
      "enable_when": { "field_equals": { "field": "_never", "value": true } },
      "disable_reason": "Funcionalidad planificada para la próxima versión",
      "disable_tag": "V2",
      "capabilities": { "required_role_any_of": ["TRADER","ADMIN_TRD","ADMIN"] },
      "dialog": {
        "title": "Re-cotizar",
        "fields": [
          { "id": "fin.nuevo_spread", "label": "Nuevo spread (bps)", "type": "number", "required": true, "min": 0 }
        ]
      },
      "on_confirm": {
        "update_fields": ["fin.recotizado_at", "fin.nuevo_spread"],
        "audit": true,
        "toast": "Quote re-cotizado"
      }
    },

    {
      "id": "fin.cotizaciones.governance.anular_quote",
      "dimension": "governance",
      "label": "Anular Quote",
      "description": "Anula el quote antes de su ejecución.",
      "icon": "x",
      "danger": true,
      "target_field": "fin.anulado_at",
      "show_when": { "field_in": { "field": "status", "values": ["pending", "offered"] } },
      "enable_when": { "field_is_null": "fin.anulado_at" },
      "disable_reason": "El quote no puede anularse en su estado actual",
      "disable_tag": "Estado",
      "capabilities": { "required_role_any_of": ["TRADER","ADMIN_TRD","ADMIN"] },
      "dialog": {
        "title": "Anular Quote",
        "description": "Esta acción anula el quote. No se puede deshacer.",
        "fields": [
          { "id": "fin.anulacion_motivo", "label": "Motivo de anulación",
            "type": "textarea", "required": true, "max_length": 500 }
        ],
        "confirm_label": "Anular"
      },
      "on_confirm": {
        "update_fields": ["fin.anulacion_motivo"],
        "set_fields": { "status": "cancelled", "fin.anulado_at": "$now" },
        "audit": true,
        "toast": "Quote anulado"
      }
    }
  ]
};
