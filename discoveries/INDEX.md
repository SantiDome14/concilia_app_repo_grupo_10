# Discoveries — Index

> Catálogo navegable de los discoveries existentes. Para entender la convención de naming, los estados y el ciclo de vida, ver [`README.md`](./README.md).
>
> Última actualización: **2026-05-19** · **21 discoveries** + **2 artefactos de soporte**

---

## Producto — aplicación (umbrella)

Hipótesis product-wide sobre una aplicación del financial-core. Pueden coexistir con discoveries más profundos (módulo, funcionalidad) que se bifurcaron desde acá.

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`ops-discovery.md`](./ops-discovery.md) | Módulo de Ops — Session Context | En investigación | Yasmani Rodriguez | 2026-05-14 |
| [`clp-discovery.md`](./clp-discovery.md) | Client Portal (CLP) — Session Context | En investigación | Yasmani Rodriguez | 2026-04-10 |
| [`fin-discovery.md`](./fin-discovery.md) | Aplicación de Finanzas (FIN) — Session Context | En investigación | Yasmani Rodriguez | 2026-04-27 |
| [`lex-discovery.md`](./lex-discovery.md) | LEX — Legal File Management · Discovery Document | En investigación | Yasmani Rodriguez | 2026-04-24 |
| [`trd-discovery.md`](./trd-discovery.md) | Aplicación TRD — Discovery Document | Concluida | Yasmani Rodriguez | 2026-04-10 |
| [`com-discovery.md`](./com-discovery.md) | COM — Living Discovery Document | Descartada | Yasmani Rodriguez | 2026-04-07 |

> _Nota_: `com-discovery` quedó como `Descartada` cuando se decidió reemplazar COM por la integración HubSpot + Apollo. El archivo queda como registro del por qué.

---

## Producto — módulo

Hipótesis focalizadas en un módulo específico dentro de una aplicación.

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`fin-tesoreria-disponibilidades-discovery.md`](./fin-tesoreria-disponibilidades-discovery.md) | FIN · Tesorería · Disponibilidades — modelo conceptual del módulo | En investigación | Yasmani Salbidrez | 2026-05-19 |
| [`lex-alertas-discovery.md`](./lex-alertas-discovery.md) | LEX — Módulo Alertas · Discovery Document | En investigación | Yasmani Rodriguez | 2026-04-24 |
| [`lex-limites-discovery.md`](./lex-limites-discovery.md) | LEX — Límites · Discovery Document | En investigación | Yasmani Rodriguez | 2026-04-23 |
| [`trd-proveedores-de-liquidez-discovery.md`](./trd-proveedores-de-liquidez-discovery.md) | TRD — Proveedores de Liquidez · Discovery Document | Concluida | Yasmani Rodriguez | 2026-04-10 |

---

## Producto — funcionalidad

Hipótesis sobre una funcionalidad específica dentro de un módulo.

| Archivo | Nombre | Estado | Owner | Última act. | Propaga a |
|---|---|---|---|---|---|
| [`fin-reporteria-pnl-discovery.md`](./fin-reporteria-pnl-discovery.md) | Reporte de P&L (FIN · PnL Skill) — Session Context | Concluida | Yasmani Rodriguez | 2026-05-17 | `skills/ardua-pnl-report/SKILL.md` |

---

## Producto — feature transversal

Hipótesis sobre capacidades que aparecen en varios productos con la misma semántica. Su conclusión propaga típicamente a `features/common/`.

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`ardua-api-documentation-discovery.md`](./ardua-api-documentation-discovery.md) | Ardua API Documentation — Portal público de documentación de las APIs | En investigación | Yasmani Rodriguez | 2026-05-15 |
| [`release-awareness-discovery.md`](./release-awareness-discovery.md) | Release Awareness — banner y modal de nuevas funcionalidades | Concluida | Santino Domeniconi | 2026-05-08 |
| [`ventanas-de-mantenimiento-discovery.md`](./ventanas-de-mantenimiento-discovery.md) | Ventanas de Mantenimiento — Comunicación proactiva al usuario | Concluida | Santino Domeniconi | 2026-05-08 |

---

## Arquitectura cross-core

Hipótesis sobre cómo se relacionan las aplicaciones del core entre sí, qué se estandariza, qué patrones se consolidan.

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`core-modulos-transversales-discovery.md`](./core-modulos-transversales-discovery.md) | Módulos transversales del financial-core — Adopción por app | En investigación | Yasmani Rodriguez | 2026-05-13 |
| [`core-template-frontend-discovery.md`](./core-template-frontend-discovery.md) | core-template-frontend — Session Context | En investigación | Yasmani Rodriguez | 2026-04-22 |

---

## Infraestructura interna

Hipótesis sobre sistemas técnicos transversales (observabilidad, gateways, integraciones con terceros).

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`hubspot-integration-discovery.md`](./hubspot-integration-discovery.md) | HubSpot — Relevamiento de plataforma e integraciones con el core | En investigación | Yasmani Rodriguez | 2026-05-05 |
| [`observabilidad-discovery.md`](./observabilidad-discovery.md) | Observabilidad — Living Discovery Document | En investigación | Yasmani Rodriguez | 2026-04-17 |
| [`prime-desk-rfq-gateway-discovery.md`](./prime-desk-rfq-gateway-discovery.md) | Prime Desk RFQ Gateway · Discovery Document | Concluida | Yasmani Rodriguez | 2026-04-10 |

---

## Proceso / herramienta / metodología

Hipótesis sobre cómo trabajamos: automatizaciones de gestión, SLAs, herramientas internas, convenciones de proceso.

| Archivo | Nombre | Estado | Owner | Última act. |
|---|---|---|---|---|
| [`jira-automations-discovery.md`](./jira-automations-discovery.md) | Jira Automations — Session Context | En investigación | Yasmani Rodriguez | 2026-05-11 |
| [`jira-sla-discovery.md`](./jira-sla-discovery.md) | SLA de Work Items de Jira | En investigación | Yasmani Rodriguez | 2026-05-10 |

---

## Artefactos de soporte

Archivos que viven en `discoveries/` pero **no son discoveries** — son insumos o salidas auxiliares de un discovery (briefings, transcripts, drafts intermedios, artefactos de validación). Se nombran con un sufijo distinto a `-discovery.md` para hacerlo evidente.

| Archivo | Propósito | Discovery asociado |
|---|---|---|
| [`fin-tesoreria-disponibilidades.html`](./fin-tesoreria-disponibilidades.html) | Simulador interactivo del modelo conceptual de Disponibilidades — 16 eventos T0→T15 con tres perspectivas sincronizadas, asientos contables adscriptos a sociedad, collapsibles por sociedad en la lente de Tesorería, y 8vo grupo contable Patrimonio operativo con saldo de apertura. HTML standalone para validación con stakeholders. **No es el prototipo del módulo** | [`fin-tesoreria-disponibilidades-discovery.md`](./fin-tesoreria-disponibilidades-discovery.md) |
| [`core-modulos-transversales-briefing-tech.md`](./core-modulos-transversales-briefing-tech.md) | Briefing técnico para Claude Design — Refinamiento del set transversal del core | [`core-modulos-transversales-discovery.md`](./core-modulos-transversales-discovery.md) |

---

## Notas de mantenimiento

- El índice se actualiza **a mano** dentro del flujo de sesión cada vez que se crea, renombra, concluye o actualiza un discovery (ver `framework/project-instructions.md` §11.5).
- Las tablas están ordenadas por `updated_at` descendente dentro de cada categoría.
- Estados posibles: `En investigación` · `Concluida` · `Descartada`.
- Cuando un discovery tiene `status: Concluida` y `propagates_to:` no vacío, la columna "Propaga a" se agrega en la tabla correspondiente.

### Casos pendientes de revisión

Marcados acá para que un humano (HoP) los confirme o ajuste en una sesión futura:

- **`core-template-frontend-discovery.md`** está categorizado como **Arquitectura cross-core** por su prefijo `core-`, pero su contenido podría caber mejor en **Infraestructura interna** (es tooling de scaffolding para frontends, no una decisión arquitectural cross-app). Decidir y mover si corresponde.
- **`prime-desk-rfq-gateway-discovery.md`** tiene `features: [TRD, CLP]` (lo trata como producto), pero su naming no sigue el patrón `[aplicacion]-...` (parece infraestructura). Está acá en **Infraestructura interna** por consistencia con el naming, pero podría ser un caso de feature transversal mal nombrado.
- **`release-awareness-discovery.md`** tiene `features: [TRD, OPS, LEX, CLP, FIN]` (enumera las 5 apps) en lugar del token `[COMMON]` que abrevia exactamente eso. Normalizar a `[COMMON]` para consistencia.
- **`fin-tesoreria-disponibilidades-discovery.md`** tiene owner registrado como `Yasmani Salbidrez` mientras el resto de los discoveries usan `Yasmani Rodriguez`. Confirmar cuál apellido es el canónico y normalizar el resto si corresponde.
