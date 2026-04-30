/* ───────────────────────────────────────────────────────────────────
   Manifest · FIN.Tesorería (nivel módulo)
   ───────────────────────────────────────────────────────────────────
   Manifest a nivel módulo (record_type: null, scope: "module"). Solo
   declara module_ctas — los CTAs del header que no están atados a un
   registro específico.

   Hoy: "Cargar movimiento manual" → da de alta una solicitud de carga
   manual que se enruta al Inbox (workflow de doble aprobación: cargador
   ≠ aprobador).

   Reglas de JSON estricto: ver template/manifests/_schema.md §1.
   ─────────────────────────────────────────────────────────────────── */

window.ACTION_MANIFEST = window.ACTION_MANIFEST || {};

window.ACTION_MANIFEST["fin.tesoreria"] = {
  "app": "fin",
  "module": "tesoreria",
  "record_type": null,
  "scope": "module",
  "schema_version": "1.0",

  "actions": [],

  "module_ctas": [
    {
      "id": "fin.tesoreria.governance.cargar_movimiento_manual",
      "dimension": "governance",
      "label": "Cargar movimiento manual",
      "description": "Da de alta un movimiento manual que entra a workflow de aprobación.",
      "icon": "plus",
      "is_module_cta": true,
      "creates_record_type": "carga_manual_solicitud",
      "capabilities": { "required_role_any_of": ["OPS_OFFICER","ADMIN_OPS","ADMIN_FIN","ADMIN"] },
      "dialog": {
        "title": "Cargar movimiento manual",
        "description": "La solicitud entra al Inbox para aprobación de un usuario distinto al que la cargó (regla de doble firma).",
        "fields": [
          { "id": "sociedad_id", "label": "Sociedad", "type": "lookup",
            "catalog": "framework.sociedades", "required": true, "placeholder": "Elegí sociedad..." },
          { "id": "cuenta_id", "label": "Cuenta", "type": "lookup",
            "catalog": "ops.catalogo_cuentas", "required": true,
            "catalog_filter": { "field": "sociedad_id", "from_form": "sociedad_id" },
            "placeholder": "Elegí cuenta..." },
          { "id": "tipo", "label": "Tipo de movimiento", "type": "select", "required": true,
            "options": [
              { "value": "DEPOSIT",      "label": "DEPOSIT (depósito de cliente)" },
              { "value": "WITHDRAWAL",   "label": "WITHDRAWAL (retiro de cliente)" },
              { "value": "FEE",          "label": "FEE (comisión bancaria)" },
              { "value": "TAX",          "label": "TAX (impuesto retenido)" },
              { "value": "REBATE",       "label": "REBATE (rebate de partner)" },
              { "value": "ADDITION",     "label": "ADDITION (ajuste interno)" },
              { "value": "TRANSFER_OUT", "label": "TRANSFER_OUT (transferencia salida)" },
              { "value": "TRANSFER_IN",  "label": "TRANSFER_IN (transferencia entrada)" }
            ] },
          { "id": "fecha", "label": "Fecha del movimiento", "type": "date", "required": true },
          { "id": "monto", "label": "Monto", "type": "number", "required": true, "min": 0,
            "placeholder": "0.00" },
          { "id": "moneda", "label": "Moneda", "type": "select", "required": true,
            "options": [
              { "value": "ARS",  "label": "ARS" },
              { "value": "USD",  "label": "USD" },
              { "value": "USDT", "label": "USDT" },
              { "value": "USDC", "label": "USDC" }
            ] },
          { "id": "contraparte", "label": "Contraparte (cliente / proveedor / partner / banco)",
            "type": "text", "required": false, "placeholder": "Nombre de la contraparte..." },
          { "id": "motivo", "label": "Motivo", "type": "textarea", "required": true, "max_length": 500,
            "placeholder": "Justificación de la carga manual..." },
          { "id": "referencia", "label": "Referencia externa (opcional)",
            "type": "text", "required": false, "max_length": 80,
            "placeholder": "Hash on-chain, número de comprobante, etc." }
        ],
        "confirm_label": "Enviar para aprobación"
      },
      "on_confirm": {
        "update_fields": ["sociedad_id","cuenta_id","tipo","fecha","monto","moneda","contraparte","motivo","referencia"],
        "audit": true,
        "toast": "Carga enviada al Inbox para aprobación"
      }
    }
  ]
};
