---
name: OPS — Whitelist CBU/CVU: resolucion de banco/fintech y sistema de etiquetas
system: OPS
status: Especificado
priority: Alta
owner: Santino Domeniconi
created_at: 2026-06-09
updated_at: 2026-06-09
pwiticket: PWI-46
discovery: discoveries/ops-whitelist-cbu-discovery.md
---

# OPS — Whitelist CBU/CVU: resolucion de banco/fintech y sistema de etiquetas

## Objetivo

- Que al whitelistear un CBU/CVU el sistema muestre y guarde el banco o fintech
  resuelto desde la respuesta de Coinag.
- Que cada cuenta whitelisted tenga un campo de etiqueta libre editable al
  momento del alta o de forma diferida.
- Que al ejecutar un retiro via Basic Transfer, el operador identifique la
  cuenta destino correcta viendo banco y etiqueta en cada superficie del flujo.

## Contexto

La whitelist de cuentas es el prerequisito operativo para ejecutar retiros:
cada cuenta de destino debe estar habilitada para el cliente antes de que
Operaciones ejecute el pago. La funcionalidad existe en produccion y es
exclusiva de admins.

Hoy el modal "Whitelistar Cuenta" valida el CBU/CVU a traves de Coinag y
muestra un bloque verde "CVU/CBU FOUND" con titular, cuenta, alias, CUIT y
estado. Coinag ya devuelve `bank_name` en esa respuesta; el frontend lo captura
en memoria pero lo descarta: no se renderiza ni se incluye en el POST que guarda
el alta. El operador confirma sin ver el banco, y el registro queda sin ese
dato.

El flujo de retiros existe como Basic Transfer en el modal Create Movement de
PSPHome. Al seleccionar un cliente, el sistema carga sus cuentas whitelisted en
Destination Account — mostrando solo CBU/CVU, nombre del titular y CUIT, sin
banco ni etiqueta. Con multiples cuentas en distintos bancos, el operador
selecciona a ciegas.

El gap es exclusivamente de producto en OPS: la integracion con Coinag esta
activa, el dato `bank_name` ya llega legible (confirmado en PSPHome.vue donde
se renderiza en otro flujo del mismo sistema), y el `bankId` ya existe en el
objeto `validatedAccountData` en memoria al momento del alta. No se requiere
nueva integracion ni base de datos de prefijos.

Ambos flujos verificados visualmente en `ops-qa.arduasolutions.com`
el 2026-06-09. Wireframe validado por Manu Lamensa (Operations) el 2026-06-09.

## Alcance funcional

1. **Mostrar banco en confirmacion del alta:** renderizar `bank_name` en el
   bloque "CVU/CBU FOUND" del modal de whitelisting, al final del bloque,
   separado por un divisor sutil.

2. **Guardar banco/fintech:** incluir el banco en el POST a
   `/clients/{clientId}/whitelist-account` y persistirlo en el registro de la
   whitelist.

3. **Campo etiqueta en el alta:** texto libre editable al momento de
   whitelistear. Requerida para CVU cuando Coinag no resuelva la fintech
   (banco "No resuelto"); opcional para CBU. El boton Confirmar queda
   deshabilitado si la etiqueta es requerida y esta vacia.

4. **Edicion diferida de etiqueta:** editar la etiqueta sobre cuentas ya
   whitelisted desde el detalle de cliente (tabla inline con columnas
   Banco/Fintech, Cuenta, Etiqueta, Acciones). Boton "+ Agregar" en filas sin
   etiqueta.
   _Pendiente de confirmacion de viabilidad con IT en refinement: si el
   endpoint no soporta actualizacion parcial, este alcance se difiere a v2._

5. **Banco y etiqueta en el flujo de retiro (Basic Transfer):** mostrar banco
   y etiqueta en todas las superficies del flujo Create Movement / Confirm
   Movement. La etiqueta mostrada es exactamente la ingresada en el alta
   (Alcance 3) — no es un badge del sistema.

   | Superficie | Elemento nuevo | Posicion |
   |---|---|---|
   | Destination Account (Create Movement) | Badge banco/fintech | Encima del numero de cuenta |
   | Destination Account (Create Movement) | Etiqueta libre | Debajo del CUIT |
   | Panel TO — Account Details (lateral) | Banco | Nueva linea debajo de Account |
   | TO ACCOUNT (EXTERNAL) (Confirm Movement) | Banco | Al final del bloque, tras Alias, divisor sutil |

## Fuera de alcance (v1)

- Base de datos de prefijos BCRA estatica.
- Integracion con BIND u otros proveedores.
- Vista de lista de clientes navegable.
- Vista dedicada de gestion de cuentas whitelisted por cliente.
- Visualizacion de banco/etiqueta en el detalle de cliente fuera del flujo de
  retiro.
- Whitelist de cuentas para esquemas no-PSP.
- Retroactividad / backfill de banco para cuentas ya whitelisted (ver OQ-1).
- Orden configurable o filtro en Destination Account (ver v2).
- Colores de marca por banco/fintech en los badges (ver v2).

## Criterios de aceptacion

1. Al ingresar un CBU en el modal de whitelisting, el sistema muestra el banco
   en el bloque "CBU FOUND" (linea al final, divisor sutil) antes de guardar
   el alta.
2. Al confirmar el alta, el banco se guarda en el registro de la whitelist.
3. Al ingresar un CVU donde Coinag no resuelva la fintech, el campo etiqueta
   es requerido y el boton Confirmar permanece deshabilitado hasta completarla.
4. Cada cuenta whitelisted tiene una etiqueta de texto libre editable en el
   alta o posteriormente desde el detalle de cliente (sujeto a Alcance 4).
5. En Destination Account (Create Movement), cada cuenta whitelisted muestra
   badge de banco encima del CBU/CVU y etiqueta debajo del CUIT. El panel TO
   muestra banco. En TO ACCOUNT (EXTERNAL) del Confirm Movement aparece una
   linea Banco al final del bloque.
6. El flujo de validacion existente de Coinag no se altera.

## Open questions — pendientes de refinement con IT

**OQ-1 — Cuentas existentes sin banco (impacta Alcance 5):** las cuentas
whitelisted antes del lanzamiento no tendran `bank_name` guardado. Opciones:
(a) badge neutro "Sin informacion" permanente, o (b) re-fetch de Coinag al
renderizar. El wireframe usa opcion (a) como fallback visual. Decision
pendiente con IT.

**OQ-2 — Orden de cuentas en Destination Account:** cuando el cliente tiene
multiples cuentas whitelisted, no se especifica el orden de presentacion
(fecha de alta, alfabetico por banco, por etiqueta). Pendiente definir en
refinement.

**OQ-3 — Formato de `bank_name` para CBUs y CVUs:** confirmar con Valen /
Mati Sragowicz si el campo llega como nombre legible ("Banco Galicia") o como
codigo. Si es codigo, requiere mapeo. Si Coinag resuelve el nombre de la
fintech para CVUs, la etiqueta obligatoria del Alcance 3 pasa a opcional.

**OQ-4 — Permisos de etiquetado diferido (Alcance 4):** confirmar si los
operadores (no admins) pueden editar etiquetas sobre cuentas ya whitelisted, o
si el etiquetado queda restringido al rol que hizo el alta.

## Trabajo futuro — v2

- **Colores de marca por banco/fintech en los badges:** cada institucion usa
  su color de marca (Galicia naranja, Santander rojo, Brubank violeta, Mercado
  Pago azul). El sistema infiere el color a partir de `bank_name` / `bank_id`
  sin input del operador. No requiere cambios en el modelo de datos.
- **Orden y filtro en Destination Account:** ordenar por banco o etiqueta,
  y/o filtrar inline con multiples cuentas whitelisted.
- **Backfill de banco para cuentas existentes:** re-validar cuentas ya
  whitelisted sin banco contra Coinag para completar el dato retroactivamente.

## Referencias

- PWI-46: https://arduasolutions.atlassian.net/browse/PWI-46
- Discovery: `discoveries/ops-whitelist-cbu-discovery.md`
- Hilo Slack: https://arduasolutions.slack.com/archives/C0AK2PW5BGQ/p1779824763900199
- Wireframe (validado Manu Lamensa, 2026-06-09): DM Producto Slack
- Repo referencia (read-only): `repositories/core-ops-frontend`
  - `src/views/Clients/ClientDetail.vue` — flujo de whitelisting
  - `src/views/psp/PSPHome.vue` — Basic Transfer, `bank_name` en cuentas externas
  - `src/views/psp/PSPAccounts.vue` — sistema de labels existente en PSP Cuentas
