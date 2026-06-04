---
name: OPS — Whitelist CBU/CVU: identificación de banco y etiquetas
features: [OPS]
status: En investigación
owner: Santino Domeniconi
created_at: 2026-06-04
updated_at: 2026-06-04
propagates_to: []
---

# OPS — Whitelist CBU/CVU: identificación de banco y etiquetas

## Objetivo

Entender cómo enriquecer la gestión de la whitelist de cuentas habilitadas para
retiros con dos capacidades nuevas:

1. **Identificación automática de banco o fintech** a partir del prefijo CBU,
   usando la tabla de referencia oficial provista por Operations (fuente:
   Ministerio de Economía / BCRA).
2. **Sistema de etiquetas** que permita identificar y clasificar cada CBU/CVU
   whitelisteado, tanto en el alta como de forma diferida.

La investigación cubre también el caso especial de los CVUs (fintechs: Mercado
Pago, Ualá, Naranja X, etc.) que no pueden resolverse automáticamente, y el
impacto de estas mejoras en el flujo de la Comanda de Retiros.

## Contexto

La whitelist de cuentas es el prerequisito operativo para ejecutar un withdrawal:
la cuenta de destino debe estar whitelisteada para el cliente antes de que
Operaciones pueda ejecutar el pago. La funcionalidad existe en producción y es
exclusiva de admins (ver `discoveries/ops-discovery.md` §6.3 y §9.1).

El problema documentado en **PWI-46** (Manuel Lamensa, Operations) es que la
whitelist actual solo muestra el número de CBU/CVU, sin información del banco o
fintech asociado. Cuando un cliente tiene múltiples cuentas whitelisteadas en
distintos bancos y solicita retirar a una específica, el operador trabaja "a
ciegas" — no puede identificar la cuenta correcta solo con el número. Para CVUs
el problema es mayor: no existe base de datos pública que permita resolver la
entidad automáticamente.

La tabla de referencia CBU→banco fue provista por Operations (Manu Lamensa) como
insumo de implementación. Cubre los 3 primeros dígitos del CBU (identificador
unívoco de la entidad financiera) y los mapea al nombre oficial del banco.

**Estructura del CBU (22 dígitos):**
`[3 dígitos banco][4 dígitos sucursal][1 dígito verificador][13 dígitos cuenta][1 dígito verificador]`

Este gap de "proceso completo de whitelist" estaba abierto en
`discoveries/ops-discovery.md` §13 (prioridad Media). PWI-46 lo materializa
como requerimiento concreto con urgencia Alta.

## Tabla de referencia — prefijos CBU

Provista en `CBU_tabla_bancos-2.docx` vía hilo de Slack de PWI-46 (reply de
Manu Lamensa, 26/05/2026). Cubre 41 entidades financieras + CVU. Prefijos
representativos:

| Prefijo | Entidad | Tipo |
|---|---|---|
| 007 | Banco de Galicia y Buenos Aires S.A. | Banco |
| 011 | Banco de la Nación Argentina | Banco |
| 014 | Banco de la Provincia de Buenos Aires | Banco |
| 017 | BBVA Argentina S.A. | Banco |
| 072 | Banco Santander S.A. | Banco |
| 143 | Brubank | Fintech / Banco digital |
| 191 | Banco Credicoop Coop. Ltdo. | Banco |
| 285 | Banco Macro S.A. | Banco |
| 299 | Banco Comafi S.A. | Banco |
| 000 | CVU — Fintechs (Mercado Pago, Ualá, etc.) | CVU - Fintech |

**Nota CVU:** el prefijo `000` agrupa a todas las fintechs sin subdistinción por
entidad. No es posible resolver automáticamente si un CVU corresponde a Mercado
Pago, Ualá u otra fintech. La identificación de CVUs requiere etiquetado manual.

## Hipótesis abiertas

- **H1.** La resolución automática por prefijo CBU cubre la mayor parte del
  problema para clientes con cuentas en bancos tradicionales. Las etiquetas
  complementan los casos de CVU y permiten alias más descriptivos sobre
  cuentas ya resueltas.
- **H2.** Banco auto-resuelto y etiqueta personalizada son datos independientes
  y coexistentes: una cuenta puede tener "Banco Galicia" (auto) + "Galicia
  sueldo Juan" (etiqueta manual).
- **H3.** El enriquecimiento de la whitelist debe ser visible en la Comanda de
  Retiros al seleccionar la cuenta destino, no solo en la vista de gestión.
- **H4.** Para CVUs sin resolución automática, el sistema debería advertir y
  requerir una etiqueta antes de guardar la cuenta.
- **H5.** La gestión de etiquetas puede tener permisos más amplios que la
  whitelist: admins crean cuentas, ops officers pueden etiquetar.

## Preguntas abiertas

Challenges C1–C5 enviados a Operations en el hilo de PWI-46. Pendientes de
respuesta antes de cerrar el scope.

## Referencias

- PWI-46: https://arduasolutions.atlassian.net/browse/PWI-46
- Hilo Slack: https://arduasolutions.slack.com/archives/C0AK2PW5BGQ/p1779824763900199
- Tabla de referencia: `CBU_tabla_bancos-2.docx` (adjunto en hilo, reply de Manu 26/05/2026)
- Gap de origen: `discoveries/ops-discovery.md` §13 — "Proceso completo de whitelist"
- Features relacionados (whitelist fuera de scope en ambos):
  - `features/ops/ops-crear-withdrawal-sin-banco.md`
  - `features/ops/ops-retiros-confirmacion-whatsapp.md`
