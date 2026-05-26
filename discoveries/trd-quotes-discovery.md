---
name: TRD — Módulo Quotes
features: [TRD]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-05-26
updated_at: 2026-05-26
propagates_to:
  - features/trd/trd-quotes.md
---

# TRD — Módulo Quotes

## Objetivo

Documentar el estado actual del módulo Quotes de TRD — sus capacidades en producción, el ciclo de vida del trade, y las extensiones en construcción — para sentar la base del feature file correspondiente.

## Contexto

Quotes es el módulo de TRD donde la Mesa de Trading registra las operaciones de compra/venta de FX con clientes de Ardua. Es uno de los bloques operacionales que tributan al cálculo de Exposición agregada.

El módulo está en producción. Sin embargo, al momento de abrir este discovery no hay acceso a TRD QA para verificar el estado real de las capacidades, por lo que el feature file (`features/trd/trd-quotes.md`) queda diferido hasta poder validar contra el sistema.

## Requerimientos activos

| REQ | Descripción | Estado |
|---|---|---|
| REQ-92 | Registro de TC del Agrupador en el Detalle del Trade — bloque "Contraparte" opcional con TC agrupador, selector de agrupador y cálculo automático de spread | SENT TO DEV |

## Pendientes para concluir

- Acceso a TRD QA para relevar el estado actual del módulo (campos del formulario, listado, filtros, ciclo de vida completo)
- Confirmar fuente del catálogo de agrupadores (LEX u otra) — queda a resolver por Desarrollo en refinement técnico de REQ-92
