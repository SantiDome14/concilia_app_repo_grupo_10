---
name: TRD — Módulo Clientes · Visibilidad de saldos y límites
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-03
updated_at: 2026-06-03
propagates_to:
  - features/trd/trd-clientes.md
---

# TRD — Módulo Clientes · Visibilidad de saldos y límites

## Objetivo

Entender el estado actual del módulo Clientes de TRD, identificar los gaps de información que afectan la planificación de operaciones, y definir qué datos deben estar disponibles en el módulo sin necesidad de iniciar un quote.

## Contexto

El módulo Clientes de TRD existe en producción pero está documentado de forma mínima. Al abrir este discovery, el módulo muestra únicamente tres campos por cliente: **Nombre**, **N° de legajo** y **Está activo**. No hay feature file correspondiente en `features/trd/`.

La hipótesis central de este discovery es: *los operadores necesitan acceder a datos de contexto del cliente (saldos y límites) antes de decidir qué operación realizar, pero ese acceso hoy requiere iniciar el flujo de un quote — lo que introduce fricción operativa innecesaria.*

El requerimiento **PWI-64**, solicitado por Facundo Vasques (Head of Trading), es el punto de entrada de este discovery.

---

## Estado actual del módulo

### Campos visibles en el listado de Clientes

| Campo | Descripción |
|---|---|
| Nombre | Nombre completo del cliente |
| N° de legajo | Identificador interno del cliente |
| Está activo | Estado del cliente (activo / inactivo) |

Fuente: captura del entorno de producción compartida por Facundo Vasques (junio 2026).

### Flujo actual para ver datos financieros de un cliente

Para acceder al saldo y límite de un cliente, los operadores deben:

1. Tocar **Crear Quote**
2. Escribir el nombre del cliente en el buscador
3. Volver a clickear en el nombre del cliente en el dropdown
4. Recién en ese momento el sistema expone los datos

**Total: 4 pasos para acceder a información de contexto que debería estar disponible sin iniciar una operación.**

### Datos que expone el formulario de quote hoy

Dentro del formulario de creación de quote, el sistema expone dos tipos de datos del cliente:

| Dato | Dónde aparece | Qué representa |
|---|---|---|
| `Haz Pagos $X / Circuit $X` | Junto al nombre del cliente, al seleccionarlo | **Límites operativos por entidad** — el límite que tiene el cliente para operar con cada entidad del grupo |
| `balance` (al lado de cada campo de monto) | Junto al campo "Monto a comprar" y "Monto a entregar" | **Saldo por moneda del par seleccionado** — el dinero que el cliente tiene disponible en esa moneda |

Confirmado por Facundo Vasques vía DM (03-06-2026):
> *"eso representa los limites"* (sobre las cifras de Haz Pagos / Circuit)
> *"el monto a comprar es el saldo que tienen — aparece ahí cuando vas a cargar el quote"*

---

## Hipótesis validadas en el proceso de refinamiento (PWI-64)

| # | Hipótesis | Respuesta | Fuente |
|---|---|---|---|
| H1 | Los operadores necesitan ver saldo por moneda **y** límite por entidad | Confirmado — ambos datos | Facu (DM, 03-06-2026) |
| H2 | Si un cliente no tiene saldo en una moneda, se prefiere mostrar $0 en lugar de ocultar el campo | Confirmado — mostrar $0 | Facu (DM, 03-06-2026) |
| H3 | Hay otros datos del cliente que faltan en el módulo Clientes además de saldos y límites | No — saldos y límites son el único gap identificado | Facu (DM, 03-06-2026) |
| H4 | Podría tener valor iniciar un quote directamente desde el módulo de Clientes | No — la separación es intencional. Clientes es informativo; Quotes es para crear operaciones | Facu (DM, 03-06-2026) |

---

## Requerimientos vinculados

| REQ | Descripción | Estado |
|---|---|---|
| PWI-64 | Visibilidad de saldos y límites por cliente en el módulo Clientes de TRD | IN ANALYSIS |

---

## Pendientes para concluir

- Validar el wireframe con Facu antes de cerrar el scope visual (a preparar por Producto)
- Crear el feature file `features/trd/trd-clientes.md` una vez que el wireframe esté validado y el REQ avance a SENT TO DEV
- Confirmar si el campo por entidad (Haz Pagos / Circuit) está expresado en ARS u otra unidad — no fue respondido explícitamente en el proceso de refinamiento
