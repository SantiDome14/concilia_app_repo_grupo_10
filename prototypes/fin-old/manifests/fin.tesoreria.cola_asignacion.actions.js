/* ───────────────────────────────────────────────────────────────────
   Manifest · FIN.Tesorería · Cola de Asignación
   ───────────────────────────────────────────────────────────────────
   La Cola de Asignación es la sub-vista de Disponibilidades donde viven
   los retiros pendientes de identificación de cuenta de origen. Cada
   registro queda en la cola hasta que se le asigna una cuenta física
   compatible con la moneda del retiro; al confirmar, el registro sale
   de la cola y entra al ledger principal.

   Una sola acción contextual por registro: "Asignar Cuenta de Origen".
   El catálogo de cuentas se filtra por moneda (catalog_filter sobre
   `moneda` del registro).

   Reglas de JSON estricto: ver template/manifests/_schema.md §1.
   ─────────────────────────────────────────────────────────────────── */

window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};

window.ACTION_MANIFEST["fin.tesoreria.cola_asignacion"] = {
  "app": "fin",
  "module": "tesoreria",
  "record_type": "retiro_cola",
  "scope": "record",
  "schema_version": "1.0",

  "required_imputations": ["cuenta_id"],

  "actions": [
    {
      "id": "fin.tesoreria.cola_asignacion.imputacion.asignar_cuenta_origen",
      "dimension": "imputacion",
      "label": "Asignar Cuenta de Origen",
      "description": "Imputá el retiro a una cuenta física de la sociedad. Al confirmar, el retiro sale de la Cola y entra al ledger.",
      "icon": "credit-card",
      "target_field": "cuenta_id",
      "enable_when": { "field_is_null": "cuenta_id" },
      "disable_reason": "El retiro ya tiene cuenta asignada",
      "disable_tag": "Asignada",
      "capabilities": { "required_role_any_of": ["OPS_OFFICER","ADMIN_OPS","ADMIN_FIN","ADMIN"] },
      "dialog": {
        "title": "Asignar Cuenta de Origen",
        "description": "Elegí la cuenta física desde la cual se ejecutó el retiro. La lista se filtra por la moneda del retiro.",
        "fields": [
          { "id": "cuenta_id", "label": "Cuenta", "type": "lookup",
            "catalog": "ops.catalogo_cuentas", "required": true,
            "catalog_filter": { "field": "moneda", "from_record": "moneda" },
            "placeholder": "Buscar cuenta...",
            "hint": "Solo se listan cuentas con moneda compatible con el retiro." },
          { "id": "asignacion_note", "label": "Nota (opcional)",
            "type": "textarea", "required": false, "max_length": 280 }
        ],
        "confirm_label": "Confirmar asignación"
      },
      "on_confirm": {
        "update_fields": ["cuenta_id", "asignacion_note"],
        "audit": true,
        "toast": "Cuenta asignada · retiro movido al ledger"
      }
    }
  ]
};
