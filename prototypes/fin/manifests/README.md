# Manifests · FIN prototype

Archivos del sistema de Acciones declarativas via Manifest aplicados al prototipo FIN.

> Schema y subsistema: ver `prototypes/_core-template/manifests/README.md` y `_schema.md`.

| Archivo | Scope | Cobertura |
|---|---|---|
| [`fin.operaciones.movimientos.actions.js`](./fin.operaciones.movimientos.actions.js) | record (`movimiento`) | Caso piloto principal · 9 acciones (Asignar Estructura/Banco-Cuenta/Cliente/Proveedor/Partner/Banco-Exchange + Marcar Conciliado + Imputar a Cuenta Contable disabled + Marcar como Intercompany). Eje Kanban `fin.imput` con dimension `imputacion`. |
| [`fin.cotizaciones.actions.js`](./fin.cotizaciones.actions.js) | record (`quote`) | 4 acciones (Generar Factura, Marcar como No facturable, Re-cotizar disabled, Anular Quote). Eje Kanban `fin.facturaState` con dimension `documentacion`. |
| [`fin.tesoreria.cola_asignacion.actions.js`](./fin.tesoreria.cola_asignacion.actions.js) | record (`retiro_cola`) | 1 acción (Asignar Cuenta de Origen). |
| [`fin.tesoreria.actions.js`](./fin.tesoreria.actions.js) | module | 1 module CTA (Cargar movimiento manual). Manifest a nivel módulo, sin acciones contextuales sobre registros. |

Convenciones del archivo (regla de JSON estricto, naming, validación) se heredan del template.
